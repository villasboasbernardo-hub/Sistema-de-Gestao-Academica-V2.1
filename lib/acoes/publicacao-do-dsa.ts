"use server";

/**
 * As ações da publicação do DSA — spec 024 (Bloco 9): Salvar, Descartar rascunho, Fazer alteração e Publicar (a
 * original e a alteração); e o *Salvar alteração* da spec 029 (Bloco 14). Regras:
 * `docs/correcoes/regras-da-publicacao-do-dsa.md` (RP-0 a RP-9).
 *
 * ⚠️ **QUEM DECIDE É O BANCO** (`salvar_semana_do_dsa`, `descartar_rascunho_do_dsa`, `iniciar_alteracao_do_dsa`,
 *    `publicar_semana_do_dsa`): a situação, a trava e a permissão (RP-5, quem lança o DSA da turma). Aqui se monta o
 *    retrato e se traduz a recusa.
 * ⚠️ **O RETRATO É O DOCUMENTO SALVO** (RP-8): a alteração SALVA primeiro e só então monta o papel — o quadro de CH lê
 *    só o salvo, e um retrato montado antes sairia sem o que a alteração acabou de salvar. A original exige a semana
 *    já salva, então o salvo é o papel.
 * ⚠️ Zod na primeira linha.
 */
import { revalidatePath } from "next/cache";

import { traduzirRecusa, type ErroDoBanco } from "@/lib/acoes/traducao-de-recusas";
import { datasDaSemanaIso } from "@/lib/dominio/carga-semanal";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { ROTA_DA_FICHA_DA_TURMA, ROTA_DO_DSA } from "@/lib/navegacao/endereco-de-turma";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import {
  esquemaDaPublicacao,
  esquemaDaSemanaDoDsa,
  esquemaDoRegimeDaSemana,
} from "@/lib/validacao/publicacao-do-dsa";

import { montarRetratoDaSemana } from "@/app/print/dsa/retrato";

export type RespostaDaPublicacao =
  { readonly ok: true; readonly mensagem: string } | { readonly ok: false; readonly erro: string };

const SEM_PERMISSAO = "O seu perfil não lança o DSA desta turma.";

function revalidar(): void {
  revalidatePath(ROTA_DO_DSA, "page");
  revalidatePath(ROTA_DA_FICHA_DA_TURMA, "page");
  revalidatePath("/inicio");
  revalidatePath("/turmas");
  revalidatePath("/avisos");
}

function recusa(erro: ErroDoBanco): RespostaDaPublicacao {
  return { ok: false, erro: erro.code === "42501" ? SEM_PERMISSAO : traduzirRecusa(erro) };
}

/** A semana ISO de segunda a sábado (`datasDaSemanaIso` tem seis datas) — o intervalo dos rascunhos da semana. */
function intervalo(ano: number, semana: number): { de: string; ate: string } {
  const dias = datasDaSemanaIso(ano, semana);
  return { de: dias[0] ?? "", ate: dias.at(-1) ?? "" };
}

/**
 * RD-3 (Bloco 11): ao salvar e ao publicar, o regime de tempos da semana fica GRAVADO com ela — a semana salva nunca
 * muda de regime. ⚠️ É uma segunda chamada, e a falha dela não desfaz o salvar (RN-DEG-01): a semana fica salva, e o
 * regime dela continua sendo resolvido pelas vigências, que já travam com o lançamento — a resposta diz que faltou.
 */
async function gravarRegimeDaSemana(
  supabase: Awaited<ReturnType<typeof criarClienteDeServidor>>,
  turmaId: string,
  ano: number,
  semana: number,
): Promise<string> {
  const { error } = await supabase.rpc("gravar_regime_da_semana_do_dsa", {
    p_turma: turmaId,
    p_ano: ano,
    p_semana: semana,
  });
  return error ? " O regime de tempos da semana não foi gravado junto; avise o suporte." : "";
}

/**
 * O corpo comum do *Salvar minuta* e do *Salvar alteração* (RP-0, RP-9): a RPC `salvar_semana_do_dsa` (aplica os
 * rascunhos da semana de uma vez e grava o evento `salvo`), o regime da semana (RD-3) e a revalidação. Devolve quantos
 * lançamentos foram registrados e o aviso do regime — a frase da resposta é de quem chama.
 * ⚠️ Sem Zod aqui: quem chama já conferiu a entrada na primeira linha.
 */
async function salvarOsRascunhosDaSemana(
  turmaId: string,
  ano: number,
  semana: number,
): Promise<
  | { readonly ok: true; readonly registrados: number; readonly doRegime: string }
  | { readonly ok: false; readonly resposta: RespostaDaPublicacao }
> {
  const supabase = await criarClienteDeServidor();
  const { de, ate } = intervalo(ano, semana);
  const { data, error } = await supabase.rpc("salvar_semana_do_dsa", {
    p_turma: turmaId,
    p_ano: ano,
    p_semana: semana,
    p_de: de,
    p_ate: ate,
  });
  if (error) return { ok: false, resposta: recusa(error as ErroDoBanco) };
  const doRegime = await gravarRegimeDaSemana(supabase, turmaId, ano, semana);
  revalidar();
  return { ok: true, registrados: Number(data ?? 0), doRegime };
}

const lancamentosRegistrados = (n: number) =>
  `${n} lançamento${n === 1 ? "" : "s"} registrado${n === 1 ? "" : "s"}`;

/** Salvar minuta (RP-0): aplica os rascunhos da semana de uma vez e registra o salvamento. */
export async function salvarSemanaDoDsa(entrada: unknown): Promise<RespostaDaPublicacao> {
  const conferido = esquemaDaSemanaDoDsa.safeParse(entrada);
  if (!conferido.success) return { ok: false, erro: "Dados inválidos." };
  const { turmaId, ano, semana } = conferido.data;
  const r = await salvarOsRascunhosDaSemana(turmaId, ano, semana);
  if (!r.ok) return r.resposta;
  const n = r.registrados;
  return {
    ok: true,
    mensagem:
      (n === 0
        ? "Semana salva (não havia rascunho)."
        : `Semana salva: ${lancamentosRegistrados(n)}.`) + r.doRegime,
  };
}

/**
 * Salvar alteração (RP-9, spec 029 `FR-003`): na semana em alteração, registra os rascunhos como o *Salvar minuta* — o
 * salvo passa a contar (CH, andamento, avisos, conflitos) —, e o papel oficial continua o da última versão publicada até
 * *Publicar alteração*.
 *
 * ⚠️ **A MESMA RPC DO SALVAR, SEM BANCO NOVO** (D-24): `salvar_semana_do_dsa` só recusa semana TRAVADA, e em alteração
 *    ela não está travada — o *Publicar alteração* já salvava assim antes de publicar. A trilha ganha o mesmo `salvo`, e
 *    é a posição dele depois de `alteracao_iniciada` que faz o selo *«Em alteração · salva»* (`situacaoDaSemana`).
 * ⚠️ **O BANCO NÃO DISTINGUE OS DOIS SALVAR**: chamada fora da alteração, esta ação faz o mesmo que o *Salvar minuta*
 *    (a mesma permissão, RP-5, e a mesma trava) — não abre poder novo; só a frase da resposta seria a da alteração.
 * ⚠️ **O REGIME DA SEMANA** (RD-3): a semana publicada antes do Bloco 11 pode não ter a linha de regime, e então este
 *    salvar a grava com o regime vigente agora — o mesmo que o *Publicar alteração* já fazia depois de publicar, só que
 *    mais cedo. Medido no remoto (spec 029, §3, item 3): 0 semanas publicadas sem regime gravado.
 * ⚠️ Sem rascunho, salva assim mesmo e diz *"não havia rascunho"* (D-23), como o *Salvar minuta*.
 */
export async function salvarAlteracaoDoDsa(entrada: unknown): Promise<RespostaDaPublicacao> {
  const conferido = esquemaDaSemanaDoDsa.safeParse(entrada);
  if (!conferido.success) return { ok: false, erro: "Dados inválidos." };
  const { turmaId, ano, semana } = conferido.data;
  const r = await salvarOsRascunhosDaSemana(turmaId, ano, semana);
  if (!r.ok) return r.resposta;
  const n = r.registrados;
  return {
    ok: true,
    mensagem:
      (n === 0
        ? "Alteração salva (não havia rascunho)."
        : `Alteração salva: ${lancamentosRegistrados(n)}. O papel publicado continua o mesmo até «Publicar alteração».`) +
      r.doRegime,
  };
}

/** Descartar rascunho (RP-0): desfaz o que não foi salvo — inativa, nunca apaga. */
export async function descartarRascunhoDoDsa(entrada: unknown): Promise<RespostaDaPublicacao> {
  const conferido = esquemaDaSemanaDoDsa.safeParse(entrada);
  if (!conferido.success) return { ok: false, erro: "Dados inválidos." };
  const { turmaId, ano, semana } = conferido.data;
  const supabase = await criarClienteDeServidor();
  const { de, ate } = intervalo(ano, semana);
  const { data, error } = await supabase.rpc("descartar_rascunho_do_dsa", {
    p_turma: turmaId,
    p_ano: ano,
    p_semana: semana,
    p_de: de,
    p_ate: ate,
  });
  if (error) return recusa(error as ErroDoBanco);
  revalidar();
  const n = Number(data ?? 0);
  return {
    ok: true,
    mensagem: `Rascunho descartado: ${n} mudança${n === 1 ? "" : "s"} desfeita${n === 1 ? "" : "s"}.`,
  };
}

/** Fazer alteração (RP-1): destrava a semana publicada. */
export async function fazerAlteracaoNoDsa(entrada: unknown): Promise<RespostaDaPublicacao> {
  const conferido = esquemaDaSemanaDoDsa.safeParse(entrada);
  if (!conferido.success) return { ok: false, erro: "Dados inválidos." };
  const { turmaId, ano, semana } = conferido.data;
  const supabase = await criarClienteDeServidor();
  const { error } = await supabase.rpc("iniciar_alteracao_do_dsa", {
    p_turma: turmaId,
    p_ano: ano,
    p_semana: semana,
  });
  if (error) return recusa(error as ErroDoBanco);
  revalidar();
  return { ok: true, mensagem: "Alteração iniciada: a semana está destravada." };
}

/**
 * Publicar (RP-1, RP-2): sem justificativa, a ORIGINAL (exige a semana salva); com ela, a ALTERAÇÃO — salva os
 * rascunhos, monta o retrato do salvo e publica a ALT N.
 */
export async function publicarSemanaDoDsa(entrada: unknown): Promise<RespostaDaPublicacao> {
  const conferido = esquemaDaPublicacao.safeParse(entrada);
  if (!conferido.success) {
    return { ok: false, erro: conferido.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { turmaId, ano, semana, justificativa } = conferido.data;
  const supabase = await criarClienteDeServidor();
  const { de, ate } = intervalo(ano, semana);
  const alteracao = justificativa !== undefined;

  if (alteracao) {
    const salvo = await supabase.rpc("salvar_semana_do_dsa", {
      p_turma: turmaId,
      p_ano: ano,
      p_semana: semana,
      p_de: de,
      p_ate: ate,
    });
    if (salvo.error) return recusa(salvo.error as ErroDoBanco);
  }

  const hoje = hojeNaCiaara();
  const retrato = await montarRetratoDaSemana(supabase, { turmaId, ano, numero: semana, hoje });
  if (retrato === null) return { ok: false, erro: SEM_PERMISSAO };

  const { data, error } = await supabase.rpc("publicar_semana_do_dsa", {
    p_turma: turmaId,
    p_ano: ano,
    p_semana: semana,
    p_de: de,
    p_ate: ate,
    p_retrato: JSON.parse(JSON.stringify(retrato)),
    ...(alteracao ? { p_justificativa: justificativa } : {}),
  });
  if (error) return recusa(error as ErroDoBanco);
  const doRegime = await gravarRegimeDaSemana(supabase, turmaId, ano, semana);
  revalidar();
  const numero = Number(data ?? 0);
  return {
    ok: true,
    mensagem:
      (numero === 0 ? "Semana publicada (original)." : `Alteração publicada: ALT ${numero}.`) +
      doRegime,
  };
}

/**
 * O regime de tempos da semana (RD-3, Bloco 11): *"Só esta semana"* ou *"Desta semana em diante"* — o segundo vira o
 * padrão da turma no DSA dali para a frente, e as semanas já salvas depois dela ficam com o regime que tinham.
 */
export async function definirRegimeDaSemana(entrada: unknown): Promise<RespostaDaPublicacao> {
  const conferido = esquemaDoRegimeDaSemana.safeParse(entrada);
  if (!conferido.success) {
    return { ok: false, erro: conferido.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { turmaId, ano, semana, regimeId, alcance } = conferido.data;
  const supabase = await criarClienteDeServidor();
  const parametros = { p_turma: turmaId, p_ano: ano, p_semana: semana, p_regime: regimeId };
  const { data, error } =
    alcance === "desde"
      ? await supabase.rpc("definir_regime_do_dsa_desde", parametros)
      : await supabase.rpc("definir_regime_do_dsa_so_nesta_semana", parametros);
  if (error) return recusa(error as ErroDoBanco);
  revalidar();
  if (alcance === "so_esta_semana") {
    return { ok: true, mensagem: "Regime de tempos trocado só nesta semana." };
  }
  const congeladas = Number(data ?? 0);
  return {
    ok: true,
    mensagem:
      "Regime de tempos trocado desta semana em diante." +
      (congeladas === 0
        ? ""
        : ` ${congeladas} semana${congeladas === 1 ? "" : "s"} já salva${congeladas === 1 ? "" : "s"} depois desta ` +
          `continua${congeladas === 1 ? "" : "m"} com o regime que tinha${congeladas === 1 ? "" : "m"}.`),
  };
}
