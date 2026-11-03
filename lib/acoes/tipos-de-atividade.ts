"use server";

/**
 * Server Actions do catálogo de tipos de atividade — Administração → Tipos de atividade (Bloco 18, spec 033, RA-1,
 * FR-001.3).
 *
 * > *"Catálogo de tipos de atividade (lista do sistema, Admin edita) (…) Cada tipo tem classificação PADRÃO
 * > (AEC/TAD/TR), que o operador pode trocar no lançamento."* — Bernardo Villas Boas, 03/11/2026 (RA-1)
 *
 * ⚠️ **SÃO QUATRO AÇÕES, E NÃO CINCO: não há apagar** (regra 4; nenhuma exceção nominal cobre o catálogo). O tipo errado
 *    se DESATIVA — ele sai da escolha do lançamento, e os lançamentos que o usam continuam com ele.
 * ⚠️ **A CHAVE NÃO MUDA** (decisão 3 da conferência do passo 0): `valor` é o que o gatilho da categoria
 *    (`subtipo := valor`), a sincronização e o ETL casam. *Editar* manda o RÓTULO e a CLASSIFICAÇÃO, nada mais.
 * ⚠️ **TROCAR A CLASSIFICAÇÃO RECATEGORIZA, E QUEM FAZ É O BANCO**: o gatilho `app.recategorizar_pelo_tipo` (AFTER UPDATE
 *    OF metadados) passa à categoria nova os lançamentos ATIVOS do tipo que seguem a classificação dele, e pula os de
 *    «Conta como» escolhido. Por isso `metadados` só vai no `update` quando a classificação muda de verdade.
 * ⚠️ **QUEM PODE É A POLICY DE `config_listas`** (`parametros.criar`/`parametros.editar`, a mesma das salas — D-6 da
 *    spec 033). A ação não decide permissão: ela traduz a recusa.
 * ⚠️ **SÓ OS TIPOS DE AEC, TAD E TR SE EDITAM** (decisão 2): Estudo Individual e Apoio Individualizado são só leitura no
 *    catálogo — a ação recusa antes de gravar, para a recusa dizer o porquê.
 */
import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { traduzirRecusa, type ErroDoBanco } from "@/lib/acoes/traducao-de-recusas";
import {
  ehClassificacaoDoCatalogo,
  proximaOrdem,
  tipoComOMesmoNome,
} from "@/lib/dominio/atividades/catalogo-de-tipos";
import { categoriaPeloTipo, type TipoDeAtividade } from "@/lib/dominio/categoria-pelo-tipo";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import type { Json, TablesUpdate } from "@/lib/tipos/database";
import {
  esquemaDaEdicaoDoTipo,
  esquemaDaSituacaoDoTipo,
  esquemaDoTipoNovo,
} from "@/lib/validacao/tipo-de-atividade";

const LISTA = "tipos_atividade";

export type ResultadoDoTipo =
  { readonly ok: true; readonly id: string } | { readonly ok: false; readonly erro: string };

const falha = (erro: string): ResultadoDoTipo => ({ ok: false, erro });

function primeiraMensagem(issues: readonly { message: string }[]): string {
  return issues[0]?.message ?? "Dados inválidos.";
}

const SEM_PERMISSAO = "O seu perfil não edita o catálogo de tipos de atividade.";

/** A recusa do banco: a de permissão com a frase do catálogo; a de unicidade nomeando o tipo; o resto, traduzido. */
function recusa(error: ErroDoBanco, nome?: string): ResultadoDoTipo {
  if (error.code === "42501" && !error.hint) return falha(SEM_PERMISSAO);
  if (error.code === "23505" && nome) {
    return falha(
      `Já existe um tipo chamado «${nome}» no catálogo — se ele estiver desativado, reative-o.`,
    );
  }
  return falha(traduzirRecusa(error));
}

function revalidar(): void {
  revalidatePath("/admin/tipos-de-atividade");
  revalidatePath("/atividades");
  /* O formulário do DSA e a ficha da turma oferecem os tipos pelo rótulo. */
  revalidatePath("/turmas", "layout");
}

type Cliente = Awaited<ReturnType<typeof criarClienteDeServidor>>;

type LinhaLida = {
  readonly id: string;
  readonly valor: string;
  readonly rotulo_exibicao: string | null;
  readonly ativo: boolean;
  readonly ordem: number;
  readonly metadados: TipoDeAtividade["metadados"];
};

/** Todas as linhas do catálogo (inclusive as de aula e as desativadas): o nome repetido se confere contra todas. */
async function lerCatalogo(
  supabase: Cliente,
): Promise<{ readonly linhas: readonly LinhaLida[]; readonly erro: ErroDoBanco | null }> {
  const { data, error } = await supabase
    .from("config_listas")
    .select("id, valor, rotulo_exibicao, ativo, ordem, metadados")
    .eq("lista", LISTA)
    .order("ordem");
  if (error) return { linhas: [], erro: error as ErroDoBanco };
  return { linhas: (data ?? []) as unknown as LinhaLida[], erro: null };
}

const FRASE_DA_LEITURA =
  "Não foi possível ler o catálogo agora. Nada foi alterado. Recarregue a página.";
const FRASE_SO_LEITURA =
  "Este tipo é de Estudo Individual ou de Apoio Individualizado: a classificação dele fica fora da CHT e não se edita no catálogo.";

/** O tipo DE ATIVIDADE pelo id, editável no catálogo — ou a recusa que diz por que não. */
function tipoEditavel(
  linhas: readonly LinhaLida[],
  id: string,
): { readonly linha: LinhaLida } | { readonly erro: string } {
  const linha = linhas.find((l) => l.id === id);
  if (!linha) return { erro: "O tipo não existe mais no catálogo. Recarregue a página." };
  const categoria = categoriaPeloTipo({
    id,
    valor: linha.valor,
    ativo: linha.ativo,
    metadados: linha.metadados,
  });
  if (categoria === null)
    return {
      erro: "Este item da lista não é tipo de atividade: aula, avaliação e vista não se editam aqui.",
    };
  if (!ehClassificacaoDoCatalogo(categoria)) return { erro: FRASE_SO_LEITURA };
  return { linha };
}

/** *Novo tipo* — a chave e o rótulo são o nome; a classificação vai em `metadados.categoria`; a ordem, no fim. */
export async function acrescentarTipo(entrada: unknown): Promise<ResultadoDoTipo> {
  const conferido = esquemaDoTipoNovo.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const { rotulo, classificacao } = conferido.data;
  const supabase = await criarClienteDeServidor();
  const catalogo = await lerCatalogo(supabase);
  if (catalogo.erro) return falha(FRASE_DA_LEITURA);

  const repetido = tipoComOMesmoNome(
    rotulo,
    catalogo.linhas.map((l) => ({ valor: l.valor, rotulo: l.rotulo_exibicao, ativo: l.ativo })),
  );
  if (repetido) {
    return falha(
      repetido.ativo
        ? `Já existe o tipo «${repetido.rotulo ?? repetido.valor}» no catálogo.`
        : `Já existe o tipo «${repetido.rotulo ?? repetido.valor}», desativado: reative-o em vez de criar outro.`,
    );
  }

  /* Gotcha 4.1: o `id` sai daqui e a gravação vai sem `RETURNING`. */
  const id = randomUUID();
  const { error } = await supabase.from("config_listas").insert({
    id,
    lista: LISTA,
    valor: rotulo,
    rotulo_exibicao: rotulo,
    ordem: proximaOrdem(catalogo.linhas.map((l) => Number(l.ordem))),
    ativo: true,
    metadados: { categoria: classificacao },
  });
  if (error) return recusa(error as ErroDoBanco, rotulo);

  revalidar();
  return { ok: true, id };
}

/**
 * *Editar* — o rótulo e a classificação padrão. A chave (`valor`) fica.
 *
 * ⚠️ `metadados` é reescrito com as outras chaves de antes preservadas, e SÓ quando a classificação muda: é o `update of
 *    metadados` que dispara a recategorização, e mandá-lo sem mudança faria o banco trabalhar à toa.
 */
export async function editarTipo(entrada: unknown): Promise<ResultadoDoTipo> {
  const conferido = esquemaDaEdicaoDoTipo.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const { id, rotulo, classificacao } = conferido.data;
  const supabase = await criarClienteDeServidor();
  const catalogo = await lerCatalogo(supabase);
  if (catalogo.erro) return falha(FRASE_DA_LEITURA);

  const alvo = tipoEditavel(catalogo.linhas, id);
  if ("erro" in alvo) return falha(alvo.erro);
  const { linha } = alvo;

  const repetido = tipoComOMesmoNome(
    rotulo,
    catalogo.linhas
      .filter((l) => l.id !== id)
      .map((l) => ({ valor: l.valor, rotulo: l.rotulo_exibicao })),
  );
  if (repetido)
    return falha(
      `Já existe o tipo «${repetido.rotulo ?? repetido.valor}» no catálogo: escolha outro nome.`,
    );

  const classificacaoMuda = (linha.metadados?.categoria ?? null) !== classificacao;
  const mudancas: TablesUpdate<"config_listas"> = {
    rotulo_exibicao: rotulo,
    ...(classificacaoMuda
      ? { metadados: { ...(linha.metadados ?? {}), categoria: classificacao } as Json }
      : {}),
  };
  const { data, error } = await supabase
    .from("config_listas")
    .update(mudancas)
    .eq("id", id)
    .eq("lista", LISTA)
    .select("id");
  if (error) return recusa(error as ErroDoBanco, rotulo);
  /* A policy de UPDATE que não casa não dá erro: devolve zero linhas (gotcha 4). */
  if (!data || data.length === 0) return falha(SEM_PERMISSAO);

  revalidar();
  if (classificacaoMuda) {
    /* A recategorização muda a CH de AEC/TAD/TR das turmas: tudo o que a mostra é lido de novo. */
    revalidatePath("/", "layout");
  }
  return { ok: true, id };
}

/** Muda só `ativo` — o que *Desativar* e *Reativar* compartilham. */
async function mudarSituacao(entrada: unknown, ativo: boolean): Promise<ResultadoDoTipo> {
  const conferido = esquemaDaSituacaoDoTipo.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const { id } = conferido.data;
  const supabase = await criarClienteDeServidor();
  const catalogo = await lerCatalogo(supabase);
  if (catalogo.erro) return falha(FRASE_DA_LEITURA);
  const alvo = tipoEditavel(catalogo.linhas, id);
  if ("erro" in alvo) return falha(alvo.erro);

  const { data, error } = await supabase
    .from("config_listas")
    .update({ ativo })
    .eq("id", id)
    .eq("lista", LISTA)
    .select("id");
  if (error) return recusa(error as ErroDoBanco);
  if (!data || data.length === 0) return falha(SEM_PERMISSAO);

  revalidar();
  return { ok: true, id };
}

/**
 * *Desativar* — o tipo sai da escolha do lançamento do DSA (`tiposOferecidos` só oferece o ativo). Os lançamentos que o
 * usam ficam como estão: desativar não reescreve o passado.
 */
export async function desativarTipo(entrada: unknown): Promise<ResultadoDoTipo> {
  return mudarSituacao(entrada, false);
}

/** *Reativar* — o tipo volta à escolha do lançamento. */
export async function reativarTipo(entrada: unknown): Promise<ResultadoDoTipo> {
  return mudarSituacao(entrada, true);
}
