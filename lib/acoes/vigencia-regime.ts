"use server";

/**
 * Server Actions de vigência de regime (`FR-019`, `FR-019.4`, `FR-021.1`, `FR-021.4`, `FR-042`).
 *
 * ⚠️ **AS DUAS VÃO PELA RPC, E ISSO NÃO É PREFERÊNCIA DE ESTILO** (`FR-021.1`, `FR-021.3`). Corrigir
 * é **cancelar a anterior e gravar a sucessora numa transação só** — ou as duas escritas acontecem,
 * ou nenhuma —, e duas chamadas a partir da aplicação **não são uma transação**. A trava da linha,
 * que impede corrida entre conferir e trocar, também é de lá.
 *
 * ⚠️ **A RECUSA CHEGA NO RESULTADO DA RPC, E ALGUMAS SÓ NO `COMMIT`** (`FR-019.5`, `FR-042`). O
 * gatilho adiado que exige vigência `padrao` ativa dispara no fim da transação: o `error` pode vir de
 * um comando que já parecia ter passado. Por isso nenhuma das duas afirma sucesso sem olhar `error`.
 *
 * ⚠️ **NENHUMA USA `service_role`.** Quem decide é a policy `horarios.criar` e os gatilhos; esta
 * camada recusa cedo, com Zod, e **traduz** o que o banco recusou (Princípio XI).
 *
 * ⚠️ **`registrar` NÃO É `corrigir`, e a diferença é o passado.** Registrar abre uma vigência **a
 * partir de uma data**, deixando a anterior de pé e válida até a véspera; corrigir **desfaz** a
 * anterior, e só é possível onde ela não alcançou lançamento nenhum.
 */
import { revalidatePath } from "next/cache";

import { traduzirRecusa, type ErroDoBanco } from "@/lib/acoes/traducao-de-recusas";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { esquemaDeVigencia } from "@/lib/validacao/vigencia-regime";

export type ResultadoDeVigencia =
  { readonly ok: true; readonly codigo: string } | { readonly ok: false; readonly erro: string };

const falha = (erro: string): ResultadoDeVigencia => ({ ok: false, erro });

function primeiraMensagem(issues: readonly { message: string }[]): string {
  return issues[0]?.message ?? "Dados inválidos.";
}

function revalidar(sigla: string): void {
  revalidatePath(`/cursos/${sigla}`);
  revalidatePath(`/cursos/${sigla}/editar`);
}

/**
 * O corpo `jsonb` que as duas RPCs recebem.
 *
 * ⚠️ **O QUE O ZOD DEIXOU COMO AUSENTE VAI COMO `null`, e não some do objeto.** A RPC lê o `jsonb`
 * por chave; chave ausente e chave nula são a mesma coisa para ela, mas escrever `null` deixa no
 * rastro do PR o que foi **decidido como vazio** em vez de simplesmente não enviado.
 */
function corpoDaVigencia(dados: ReturnType<typeof esquemaDeVigencia.parse>) {
  return {
    tipo_regime: dados.tipo_regime,
    vigente_de: dados.vigente_de,
    regime_tempos: dados.regime_tempos,
    ta_duracao_min: dados.ta_duracao_min,
    intervalo_manha_min: dados.intervalo_manha_min,
    intervalo_tarde_min: dados.intervalo_tarde_min,
    hora_inicio_manha: dados.hora_inicio_manha ?? null,
    hora_inicio_tarde: dados.hora_inicio_tarde ?? null,
    limite_diario_ead_horas: dados.limite_diario_ead_horas ?? null,
    fundamento_curricular: dados.fundamento_curricular ?? null,
    motivo: dados.motivo ?? null,
  };
}

/** Registra vigência nova a partir de uma data (`FR-019`). A anterior fica, encerrada na véspera. */
export async function registrarVigencia(
  cursoId: string,
  sigla: string,
  entrada: unknown,
): Promise<ResultadoDeVigencia> {
  const conferido = esquemaDeVigencia.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const supabase = await criarClienteDeServidor();
  const { data, error } = await supabase.rpc("registrar_vigencia_regime", {
    p_curso_id: cursoId,
    p_vigencia: corpoDaVigencia(conferido.data),
  });

  if (error) return falha(traduzirRecusa(error as ErroDoBanco, { sigla }));

  /*
   * ⚠️ SEM LINHA DE VOLTA É RECUSA, E NÃO SUCESSO SILENCIOSO — a mesma leitura que a edição de curso
   *    faz do `UPDATE` barrado pelo `USING` da policy.
   */
  const linha = Array.isArray(data) ? data[0] : data;
  if (!linha) {
    return falha("A vigência não foi registrada. Confira se o seu perfil registra horário.");
  }

  revalidar(sigla);
  return { ok: true, codigo: (linha as { codigo: string }).codigo };
}

/**
 * Corrige a vigência: cancela a atual e grava a sucessora, **na mesma transação** (`FR-021.1`).
 *
 * ⚠️ **HAVENDO LANÇAMENTO, A RECUSA VEM COM O QUE IMPEDE** (`FR-021.4`) — tipo, data, turma e quantos
 * —, traduzida, **nunca** o erro cru. A tela já não deveria ter oferecido a ação, e esta é a segunda
 * defesa: entre abrir o formulário e salvar, um lançamento pode ter entrado.
 */
export async function corrigirVigencia(
  vigenciaId: string,
  sigla: string,
  entrada: unknown,
): Promise<ResultadoDeVigencia> {
  const conferido = esquemaDeVigencia.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const supabase = await criarClienteDeServidor();
  const { data, error } = await supabase.rpc("corrigir_vigencia_regime", {
    p_vigencia_id: vigenciaId,
    p_sucessora: corpoDaVigencia(conferido.data),
  });

  if (error) return falha(traduzirRecusa(error as ErroDoBanco, { sigla }));

  const linha = Array.isArray(data) ? data[0] : data;
  if (!linha) {
    return falha("A vigência não foi corrigida. Confira se o seu perfil registra horário.");
  }

  revalidar(sigla);
  return { ok: true, codigo: (linha as { codigo: string }).codigo };
}
