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
 * ⚠️ **A TROCA QUE TIRA O TIPO DA AEC É CONFERIDA ANTES** (achados da revisão do Bloco 18; `impedimentoDaTroca`):
 *    (a) AEC prevista ATIVA de currículo com o tipo — o «Novo currículo» a copia por INSERT e o porteiro do banco a
 *    recusaria, derrubando o currículo novo inteiro; ⚠️ o BANCO NÃO RECUSA esta troca por escrita direta (pendência,
 *    portão 9.4); (b) lançamento que segue o tipo com disciplina — a recategorização violaria
 *    `ativ_disciplina_so_aec_da_turma`, e o banco desfaria a troca com uma frase que não fala do tipo. A conferência lê
 *    pela sessão (a RLS recorta) e pula a turma arquivada, que a recategorização também pula. Leitura que falha
 *    RECUSA — nunca vira «não há impedimento» (gotcha 4).
 */
import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { traduzirRecusa, type ErroDoBanco } from "@/lib/acoes/traducao-de-recusas";
import { idsArquivados } from "@/lib/dominio/arquivamento-da-turma";
import {
  contagemDoTipo,
  contagemPorTipo,
  ehClassificacaoDoCatalogo,
  impedimentoDaTroca,
  proximaOrdem,
  tipoComOMesmoNome,
  type ClassificacaoDoCatalogo,
} from "@/lib/dominio/atividades/catalogo-de-tipos";
import { categoriaPeloTipo, type TipoDeAtividade } from "@/lib/dominio/categoria-pelo-tipo";
import { contagemNaPrimeira, lerTodasAsPaginas } from "@/lib/supabase/paginacao";
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

/**
 * A segunda guarda do impedimento (b): a conferência de antes pode não ver um lançamento (o recorte da RLS, ou um
 * lançado entre a conferência e a gravação), e aí quem recusa é o CHECK — com a frase do CATÁLOGO, não a do DSA.
 */
const FRASE_DA_DISCIPLINA_NA_TROCA =
  "Há lançamento deste tipo com disciplina que segue a classificação do tipo: só a AEC e o «TA da disciplina» levam " +
  "disciplina. No DSA, tire a disciplina dele ou troque o «Conta como» para TA da disciplina antes de mudar a " +
  "classificação. Nada foi alterado.";

/** A recusa do banco: a de permissão com a frase do catálogo; a de unicidade nomeando o tipo; o resto, traduzido. */
function recusa(error: ErroDoBanco, nome?: string): ResultadoDoTipo {
  if (error.code === "42501" && !error.hint) return falha(SEM_PERMISSAO);
  if (error.code === "23505" && nome) {
    return falha(
      `Já existe um tipo chamado «${nome}» no catálogo — se ele estiver desativado, reative-o.`,
    );
  }
  if (error.code === "23514" && error.message.includes("ativ_disciplina_so_aec_da_turma")) {
    return falha(FRASE_DA_DISCIPLINA_NA_TROCA);
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

const FRASE_DA_CONFERENCIA =
  "Não foi possível conferir agora o que impede a troca da classificação (AEC previstas e lançamentos do tipo). " +
  "Nada foi alterado. Recarregue a página e tente de novo.";

type LancamentoComDisciplina = {
  readonly id: string;
  readonly data: string | null;
  readonly turma_id: string | null;
  readonly rascunho_de: string | null;
  readonly turma: { readonly codigo: string | null } | null;
};

/**
 * Os impedimentos da troca da classificação padrão, lidos AGORA, pela sessão. `erro` quando uma das leituras falha — e
 * aí a ação recusa, em vez de seguir como se não houvesse impedimento (gotcha 4).
 */
async function conferirImpedimentos(
  supabase: Cliente,
  tipoId: string,
  atual: ClassificacaoDoCatalogo,
  nova: ClassificacaoDoCatalogo,
): Promise<{ readonly recusa: string | null; readonly erro: boolean }> {
  const lerPrevistas = atual === "AEC" && nova !== "AEC";
  const lerLancamentos = nova !== "AEC";
  if (!lerPrevistas && !lerLancamentos) return { recusa: null, erro: false };

  const vazio = { data: [] as unknown[], error: null };
  /*
   * Os que seguem o tipo e têm disciplina — o SALVO e o RASCUNHO, cada um na sua leitura e DE PROPÓSITO: o gatilho da
   * recategorização toca os dois, e um só basta para o CHECK desfazer a troca. Nada aqui soma lançamento (RP-8).
   */
  const lerComDisciplina = (salvo: boolean) =>
    lerTodasAsPaginas((f) =>
      supabase
        .from("atividades_nao_letivas")
        .select(
          "id, data, turma_id, rascunho_de, turma:turmas!atividades_nao_letivas_turma_id_fkey(codigo)",
          contagemNaPrimeira(f),
        )
        .eq("tipo_atividade_id", tipoId)
        .eq("status", "ativo")
        .eq("salvo", salvo)
        .is("conta_como", null)
        .not("disciplina_id", "is", null)
        .order("data", { ascending: false })
        .order("id")
        .range(f.de, f.ate),
    );
  const [previstasRes, salvosRes, rascunhosRes, arquivadasRes] = await Promise.all([
    lerPrevistas
      ? supabase
          .from("aec_previstas_curriculo")
          .select("id, curso:cursos!aec_previstas_curriculo_curso_id_fkey(codigo)")
          .eq("tipo_atividade_id", tipoId)
          .eq("status", "ativo")
      : Promise.resolve(vazio),
    lerLancamentos ? lerComDisciplina(true) : Promise.resolve(vazio),
    lerLancamentos ? lerComDisciplina(false) : Promise.resolve(vazio),
    lerLancamentos
      ? supabase.from("vw_turmas_arquivadas").select("turma_id")
      : Promise.resolve(vazio),
  ]);
  if (previstasRes.error || salvosRes.error || rascunhosRes.error || arquivadasRes.error) {
    return { recusa: null, erro: true };
  }

  const previstas = (previstasRes.data ?? []) as unknown as {
    readonly id: string;
    readonly curso: { readonly codigo: string | null } | null;
  }[];
  const arquivadas = idsArquivados(
    (arquivadasRes.data ?? []) as unknown as { turma_id: string | null }[],
  );
  /* A turma arquivada a recategorização pula (RT-8): ela não impede. O salvo primeiro, para o exemplo da frase. */
  const naoArquivados = [
    ...((salvosRes.data ?? []) as unknown as LancamentoComDisciplina[]),
    ...((rascunhosRes.data ?? []) as unknown as LancamentoComDisciplina[]),
  ].filter((l) => l.turma_id === null || !arquivadas.has(l.turma_id));
  const contagem = contagemDoTipo(
    contagemPorTipo(
      naoArquivados.map((l) => ({
        tipoId,
        contaComo: null,
        id: l.id,
        comDisciplina: true,
        rascunhoDe: l.rascunho_de,
      })),
    ),
    tipoId,
  );
  const exemplo = naoArquivados[0];
  return {
    recusa: impedimentoDaTroca(atual, nova, {
      previstasAtivas: previstas.length,
      cursosDasPrevistas: previstas.map((p) => p.curso?.codigo ?? ""),
      comDisciplina: contagem.comDisciplina,
      exemploComDisciplina: exemplo
        ? { turma: exemplo.turma?.codigo ?? null, data: exemplo.data }
        : null,
    }),
    erro: false,
  };
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

  const atual = linha.metadados?.categoria ?? null;
  const classificacaoMuda = atual !== classificacao;
  /* `tipoEditavel` garante a classificação de AEC, TAD ou TR — a conferência só roda quando ela muda. */
  if (classificacaoMuda && ehClassificacaoDoCatalogo(atual)) {
    const conferencia = await conferirImpedimentos(supabase, id, atual, classificacao);
    if (conferencia.erro) return falha(FRASE_DA_CONFERENCIA);
    if (conferencia.recusa) return falha(conferencia.recusa);
  }
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
