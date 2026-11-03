/**
 * A leitura da LISTA de atividades — do módulo (`/atividades`, aba Atividades) e da aba Atividades da turma (spec 014,
 * PR 2, `FR-063`; Bloco 18, spec 033, `FR-006.1` a `FR-006.4` e `FR-007.1`).
 *
 * ⚠️ **AS LINHAS DO RECORTE SÃO LIDAS INTEIRAS, EM PÁGINAS** (`lerTodasAsPaginas`, DP-5 da spec 015): a lista mostra até
 *    `LIMITE_DE_ATIVIDADES`, e as estatísticas contam TODAS — as mesmas linhas, recortadas pelos mesmos filtros
 *    (`filtrarAtividades`, de `lib/dominio/atividades/lista.ts`). Estatística sobre a lista truncada mentiria em silêncio.
 * ⚠️ **SÓ O SALVO CONTA** (RP-0/RP-8): o rascunho aparece só no DSA. A exceção declarada é a leitura das EXCLUSÕES
 *    pedidas como rascunho (`rascunho_exclui`), que só marca a linha salva como «desativação pendente» — não soma nada.
 * ⚠️ **O ESTUDO INDIVIDUAL SAI DA LISTA** (Bloco 17, item 6) — continua no DSA e na CH.
 * ⚠️ **DUAS FKs PARA `config_listas`** (o tipo e o tipo da parada): o embed do tipo nomeia a FK, senão o PostgREST recusa.
 * ⚠️ **O NOME DO INSTRUTOR VEM DE `vw_instrutores`, NUMA LEITURA SÓ, EM ANTIGUIDADE** — nunca por linha.
 * ⚠️ **«NÃO LI» NÃO É «NÃO HÁ»** (gotcha 4, RN-DEG-01): a falha volta em `erro`, e quem chama a mostra.
 */
import "server-only";

import {
  contaComoDoBanco,
  categoriaPeloTipo,
  type CategoriaDeAtividade,
} from "@/lib/dominio/categoria-pelo-tipo";
import { rotuloDoTipo } from "@/lib/dominio/atividades/grupos";
import {
  tetosDasTurmas,
  type LinhaDaConformidadeDaTurma,
  type PrevistoDaTurma,
  type TurmaDoLimite,
} from "@/lib/dominio/atividades/limites-das-turmas";
import type { AtividadeDaLista } from "@/lib/dominio/atividades/lista";
import { externoComOm } from "@/lib/dominio/atividades/responsavel";
import { nomeEmTexto } from "@/lib/dominio/nome-instrutor";
import type { TetosDaTurma } from "@/lib/dominio/tetos-da-turma";
import { CATEGORIA_FORA_DA_LISTA_DE_ATIVIDADES } from "@/lib/navegacao/contrato";
import { contagemNaPrimeira, lerTodasAsPaginas } from "@/lib/supabase/paginacao";
import type { criarClienteDeServidor } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof criarClienteDeServidor>>;
type Linha = Record<string, unknown>;

/** O teto da LISTA na tela — declarado, nunca silencioso: a frase aparece quando a lista bate nele. */
export const LIMITE_DE_ATIVIDADES = 500;

export const FRASE_DA_FALHA_DA_LISTA =
  "A leitura das atividades falhou. Tente de novo; se persistir, procure o suporte.";

const COLUNAS_DA_LISTA =
  "id, codigo, data, ta_inicial, tempos_consumidos, categoria_normativa, conta_como, subtipo, escopo, descricao, quantidade_alunos, turma_id, instrutor_id, responsavel_externo, responsavel_externo_om, local, disciplina_id, atividade_prevista_id, apoinst_id, tipo:config_listas!atividades_nao_letivas_tipo_atividade_id_fkey(valor, rotulo_exibicao), disciplina:disciplinas!atividades_nao_letivas_disciplina_id_fkey(codigo, cod_disciplina, nome_disciplina), prevista:aec_previstas_curriculo!atividades_nao_letivas_atividade_prevista_id_fkey(nome), apoinst:apoinst_planejadas!atividades_nao_letivas_apoinst_id_fkey(nome)";

/** A turma como a lista a conhece: o código e o curso (a sigla), para a coluna e os filtros. */
export type TurmaDaLista = {
  readonly id: string;
  readonly codigo: string;
  readonly cursoCodigo: string | null;
};

/** O recorte da leitura: as turmas do ano e as globais pela data (RT-6), ou uma turma só. */
export type RecorteDaLeitura =
  | { readonly tipo: "ano"; readonly predicado: string }
  | { readonly tipo: "turma"; readonly turmaId: string };

export type AtividadesLidas = {
  readonly linhas: readonly AtividadeDaLista[];
  /** Os ids das linhas salvas que já têm a exclusão pedida como rascunho da semana (contam ao *Salvar*). */
  readonly desativacaoPendente: ReadonlySet<string>;
  readonly erro: string | null;
};

type Embutido<T> = T | T[] | null | undefined;
const um = <T>(v: Embutido<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

/** Os nomes dos instrutores do cadastro que as linhas citam — uma leitura, em antiguidade (`RN-ANT-01`). */
async function nomesDosResponsaveis(
  supabase: Cliente,
  ids: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from("vw_instrutores")
    .select("id, posto_graduacao, esp_hab_obs, nome_completo, nome_guerra, ordem_antiguidade")
    .in("id", [...ids])
    .order("ordem_antiguidade");
  if (error) return new Map();
  return new Map(
    ((data ?? []) as Linha[]).map((i) => [
      i.id as string,
      nomeEmTexto({
        id: i.id as string,
        pg: (i.posto_graduacao as string | null) ?? "",
        especialidade: (i.esp_hab_obs as string | null) ?? null,
        nomeCompleto: (i.nome_completo as string | null) ?? "",
        nomeDeGuerra: (i.nome_guerra as string | null) ?? null,
      }),
    ]),
  );
}

function paraAtividade(
  b: Linha,
  turmas: ReadonlyMap<string, TurmaDaLista>,
  nomes: ReadonlyMap<string, string>,
): AtividadeDaLista {
  const tipo = um(b.tipo as Embutido<{ valor: string; rotulo_exibicao: string | null }>);
  const disciplina = um(
    b.disciplina as Embutido<{
      codigo: string;
      cod_disciplina: string | null;
      nome_disciplina: string;
    }>,
  );
  const prevista = um(b.prevista as Embutido<{ nome: string }>);
  const apoinst = um(b.apoinst as Embutido<{ nome: string }>);
  const turmaId = b.escopo === "global" ? null : ((b.turma_id as string | null) ?? null);
  const turma = turmaId === null ? null : (turmas.get(turmaId) ?? null);
  const instrutor = (b.instrutor_id as string | null) ?? null;
  const valor = tipo?.valor ?? (b.subtipo as string | null) ?? null;
  return {
    id: b.id as string,
    codigo: b.codigo as string,
    data: b.data as string,
    taInicial: (b.ta_inicial as number | null) ?? null,
    tempos: (b.tempos_consumidos as number | null) ?? null,
    categoria: b.categoria_normativa as CategoriaDeAtividade,
    contaComo: contaComoDoBanco(b.conta_como as string | null),
    tipoValor: valor,
    tipoRotulo: tipo ? rotuloDoTipo({ valor: tipo.valor, rotulo: tipo.rotulo_exibicao }) : null,
    turmaId,
    turmaCodigo: turma?.codigo ?? null,
    cursoCodigo: turma?.cursoCodigo ?? null,
    descricao: (b.descricao as string | null) ?? null,
    alunos: (b.quantidade_alunos as number | null) ?? null,
    responsavel:
      instrutor !== null
        ? (nomes.get(instrutor) ?? null)
        : externoComOm(
            b.responsavel_externo as string | null,
            b.responsavel_externo_om as string | null,
          ),
    local: (b.local as string | null) ?? null,
    disciplinaCodigo: disciplina?.codigo ?? null,
    disciplinaCod: disciplina?.cod_disciplina ?? null,
    disciplinaRotulo: disciplina
      ? `${disciplina.cod_disciplina ?? disciplina.codigo} — ${disciplina.nome_disciplina}`
      : null,
    atividadePrevistaId: (b.atividade_prevista_id as string | null) ?? null,
    apoinstId: (b.apoinst_id as string | null) ?? null,
    vinculoNome: prevista?.nome ?? apoinst?.nome ?? null,
  };
}

/**
 * As atividades SALVAS e ativas do recorte (sem o Estudo Individual), da mais recente para a mais antiga, com o
 * responsável resolvido — e as que já têm a desativação pedida como rascunho.
 */
export async function lerAtividades(
  supabase: Cliente,
  recorte: RecorteDaLeitura,
  turmas: ReadonlyMap<string, TurmaDaLista>,
): Promise<AtividadesLidas> {
  let pendentes = supabase
    .from("atividades_nao_letivas")
    .select("rascunho_de")
    .eq("salvo", false)
    .eq("rascunho_exclui", true);
  pendentes =
    recorte.tipo === "turma"
      ? pendentes.eq("turma_id", recorte.turmaId)
      : pendentes.or(recorte.predicado);

  const [lidas, pedidas] = await Promise.all([
    lerTodasAsPaginas((f) => {
      const base = supabase
        .from("atividades_nao_letivas")
        .select(COLUNAS_DA_LISTA, contagemNaPrimeira(f))
        .eq("status", "ativo")
        /* Spec 024 (RP-0/RP-8): o rascunho só aparece no DSA da turma; a lista é do salvo. */
        .eq("salvo", true)
        /* Bloco 17 (item 6): o Estudo Individual só some da lista — continua no DSA e na CH. */
        .neq("categoria_normativa", CATEGORIA_FORA_DA_LISTA_DE_ATIVIDADES);
      const recortada =
        recorte.tipo === "turma"
          ? base.eq("turma_id", recorte.turmaId)
          : base.or(recorte.predicado);
      /* Ordem TOTAL (o código é único): sem ela, duas páginas podem repetir ou pular uma linha. */
      return recortada
        .order("data", { ascending: false })
        .order("ta_inicial")
        .order("codigo")
        .range(f.de, f.ate);
    }),
    pendentes,
  ]);
  if (lidas.error)
    return { linhas: [], desativacaoPendente: new Set(), erro: FRASE_DA_FALHA_DA_LISTA };

  const brutas = (lidas.data ?? []) as Linha[];
  const nomes = await nomesDosResponsaveis(
    supabase,
    [...new Set(brutas.map((b) => b.instrutor_id as string | null))].filter(
      (i): i is string => i !== null,
    ),
  );
  return {
    linhas: brutas.map((b) => paraAtividade(b, turmas, nomes)),
    /* A marca é conveniência: sem ela a linha aparece igual, e o DSA continua dizendo a verdade. */
    desativacaoPendente: new Set(
      pedidas.error
        ? []
        : ((pedidas.data ?? []) as { rascunho_de: string | null }[])
            .map((p) => p.rascunho_de)
            .filter((id): id is string => id !== null),
    ),
    erro: null,
  };
}

/** Os tipos do catálogo que a lista mostra (as categorias da lista: sem o Estudo Individual), pelo rótulo. */
export async function lerTiposDaLista(
  supabase: Cliente,
): Promise<{ readonly valor: string; readonly rotulo: string }[]> {
  const { data, error } = await supabase
    .from("config_listas")
    .select("id, valor, rotulo_exibicao, ativo, metadados, ordem")
    .eq("lista", "tipos_atividade")
    .order("ordem")
    .order("valor");
  if (error) return [];
  return ((data ?? []) as Linha[])
    .filter((t) => {
      const c = categoriaPeloTipo({
        id: t.id as string,
        valor: t.valor as string,
        ativo: Boolean(t.ativo),
        metadados:
          (t.metadados as { categoria?: string | null; uso?: string | null } | null) ?? null,
      });
      return c !== null && c !== CATEGORIA_FORA_DA_LISTA_DE_ATIVIDADES;
    })
    .map((t) => {
      const rotulo = rotuloDoTipo({
        valor: t.valor as string,
        rotulo: t.rotulo_exibicao as string | null,
      });
      return { valor: t.valor as string, rotulo: t.ativo ? rotulo : `${rotulo} (desativado)` };
    });
}

/** Os tetos de AEC, TAD e TR de cada turma — o veredito é de `tetosDaTurma` (SC-003). */
export async function lerLimitesDasTurmas(
  supabase: Cliente,
  turmas: readonly TurmaDoLimite[],
): Promise<{
  readonly tetos: readonly {
    readonly turmaId: string;
    readonly turmaCodigo: string;
    readonly tetos: TetosDaTurma;
  }[];
  readonly erro: string | null;
}> {
  if (turmas.length === 0) return { tetos: [], erro: null };
  const ids = turmas.map((t) => t.id);
  const [conformidade, previstos] = await Promise.all([
    supabase
      .from("vw_conformidade_tetos")
      .select("turma_id, categoria, cumprido, limite_declarado, ch_curricular, percentual_norma")
      .in("turma_id", ids),
    supabase
      .from("previstos_proens_turma")
      .select("turma_id, categoria, tempos_previstos")
      .in("turma_id", ids)
      .eq("status", "ativo"),
  ]);
  if (conformidade.error || previstos.error) {
    return {
      tetos: [],
      erro: "Não foi possível ler os limites de AEC, TAD e TR agora. Recarregue a página; se persistir, procure o suporte.",
    };
  }
  return {
    tetos: tetosDasTurmas(
      turmas,
      (conformidade.data ?? []) as unknown as LinhaDaConformidadeDaTurma[],
      (previstos.data ?? []) as unknown as PrevistoDaTurma[],
    ),
    erro: null,
  };
}
