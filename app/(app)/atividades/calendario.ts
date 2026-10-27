/**
 * A leitura da aba Calendário (spec 023, Bloco 8: FR-006 a FR-008) — o ano escolhido inteiro, em uma rodada.
 *
 * ⚠️ **AS INATIVAS VÊM JUNTO** (D-10): sem elas não haveria como reativar. **A EXCLUÍDA, NÃO** (D-COR-7, spec 027):
 *    excluir é tirar da lista, e a linha fica no banco, inativa, com quem e quando.
 * ⚠️ **AS PARADAS GLOBAIS DE PARTE DO DIA ENTRAM, SÓ AS ATIVAS** (D-9): o «Parar dia» daqui pode criá-las.
 * ⚠️ **O TIPO DA LINHA ANTIGA SAI DA SIGLA DO NOME** (`tipoDaLinha`, D-2) — sem migration de dado.
 * ⚠️ Nenhum `await` em laço: uma rodada de leituras independentes, e uma segunda só para a contagem de lançamentos nas
 *    datas das linhas (que depende da primeira).
 */
import { COLUNAS_DA_ABRANGENCIA, linhasComAbrangencia } from "@/lib/calendario/abrangencia";
import { idsArquivados } from "@/lib/dominio/arquivamento-da-turma";
import {
  diasBloqueadosComLancamento,
  rotuloDaAbrangencia,
  tipoDaLinha,
} from "@/lib/dominio/calendario";
import { emOrdemDeTurma } from "@/lib/dominio/ordem-de-cursos";
import type { criarClienteDeServidor } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof criarClienteDeServidor>>;

export type TipoDoCalendario = {
  readonly id: string;
  readonly sigla: string;
  readonly rotulo: string;
};

export type TurmaParaEscolher = { readonly id: string; readonly codigo: string };

export type LinhaDoCalendario = {
  /** `feriado` (a linha do calendário) ou `parada` (parada global de parte do dia). */
  readonly origem: "feriado" | "parada";
  readonly id: string;
  readonly codigo: string;
  readonly data: string;
  readonly nome: string;
  readonly tipoId: string | null;
  readonly tipoSigla: string | null;
  readonly tipoRotulo: string;
  readonly impacto: "dia_inteiro" | "parcial" | "informativo";
  /** Os ids das turmas escolhidas ativas (vazio = todas). */
  readonly turmas: readonly string[];
  readonly abrangencia: string;
  readonly situacao: "ativo" | "inativo";
  /** Na parada de parte do dia: os tempos. */
  readonly tempos: { readonly inicio: number; readonly fim: number } | null;
  /** Lançamentos já no dia nas turmas que a linha alcança (para a confirmação de reativar e a resposta). */
  readonly lancamentosNoDia: number;
};

export type DadosDoCalendario = {
  readonly linhas: readonly LinhaDoCalendario[];
  readonly tipos: readonly TipoDoCalendario[];
  readonly turmas: readonly TurmaParaEscolher[];
  readonly erro: string | null;
};

const IMPACTOS = new Set(["dia_inteiro", "parcial", "informativo"]);

export async function lerCalendario(supabase: Cliente, ano: number): Promise<DadosDoCalendario> {
  const de = `${ano}-01-01`;
  const ate = `${ano}-12-31`;
  const [feriadosRes, paradasRes, tiposRes, turmasRes, arquivadasRes] = await Promise.all([
    supabase
      .from("feriados")
      .select(
        `id, codigo, data, descricao, impacto, status, tipo_parada_id, tipo:config_listas(valor, rotulo_exibicao), ${COLUNAS_DA_ABRANGENCIA}`,
      )
      /* D-COR-7 (spec 027): a linha EXCLUÍDA some da lista — também das inativas, que a lista mostra (D-10). */
      .is("excluido_em", null)
      .gte("data", de)
      .lte("data", ate)
      .order("data")
      .order("codigo"),
    supabase
      .from("dias_parados")
      .select(
        "id, codigo, data, ta_inicial, tempos, motivo, tipo:config_listas(valor, rotulo_exibicao)",
      )
      .is("turma_id", null)
      .eq("status", "ativo")
      .gte("data", de)
      .lte("data", ate)
      .order("data"),
    supabase
      .from("config_listas")
      .select("id, valor, rotulo_exibicao, metadados, ordem")
      .eq("lista", "tipos_parada")
      .eq("ativo", true)
      .order("ordem"),
    supabase
      .from("turmas")
      .select("id, codigo, ano_letivo, curso:cursos(codigo, classificacao)")
      .eq("ano_letivo", ano),
    supabase.from("vw_turmas_arquivadas").select("turma_id"),
  ]);

  const todosOsTipos = (tiposRes.data ?? []) as {
    id: string;
    valor: string;
    rotulo_exibicao: string | null;
    metadados: { pode_global?: boolean } | null;
  }[];
  const siglas = todosOsTipos.map((t) => t.valor);
  /* D-14: o cadastro oferece só os tipos com alcance global (NT é só de turma). */
  const globais = todosOsTipos.filter((t) => t.metadados?.pode_global !== false);
  const rotuloDaSigla = new Map(todosOsTipos.map((t) => [t.valor, t.rotulo_exibicao ?? t.valor]));

  const arquivadas = idsArquivados((arquivadasRes.data ?? []) as { turma_id: string | null }[]);
  const turmasDoAno = emOrdemDeTurma(
    (
      (turmasRes.data ?? []) as unknown as {
        id: string;
        codigo: string;
        ano_letivo: number;
        curso: { codigo: string; classificacao: string | null } | null;
      }[]
    ).map((t) => ({
      id: t.id,
      codigo: t.codigo,
      cursoCodigo: t.curso?.codigo ?? "",
      cursoClassificacao: t.curso?.classificacao ?? null,
      ano: Number(t.ano_letivo),
    })),
  );
  const codigoDaTurma = new Map(turmasDoAno.map((t) => [t.id, t.codigo]));
  /* D-17: as turmas não arquivadas do ano. */
  const turmas = turmasDoAno
    .filter((t) => !arquivadas.has(t.id))
    .map((t) => ({ id: t.id, codigo: t.codigo }));

  const feriados = linhasComAbrangencia<{
    id: string;
    codigo: string;
    data: string;
    descricao: string;
    impacto: string;
    status: string;
    tipo_parada_id: string | null;
    tipo: { valor: string; rotulo_exibicao: string | null } | null;
  }>(feriadosRes.data);

  /* Os lançamentos nas datas das linhas de dia inteiro (para reativar e para o aviso). */
  const datas = [
    ...new Set(feriados.filter((f) => f.impacto === "dia_inteiro").map((f) => f.data)),
  ];
  const ocupacaoRes =
    datas.length === 0
      ? { data: [], error: null }
      : await supabase.from("vw_ocupacao_ta").select("data, turma_id").in("data", datas);
  const contagem = new Map(
    diasBloqueadosComLancamento(feriados, (ocupacaoRes.data ?? []) as never).map((d) => [
      d.codigo,
      d.lancamentos,
    ]),
  );

  const linhasDeFeriado: LinhaDoCalendario[] = feriados.map((f) => {
    const sigla = tipoDaLinha({ tipo: f.tipo?.valor ?? null, descricao: f.descricao }, siglas);
    return {
      origem: "feriado",
      id: f.id,
      codigo: f.codigo,
      data: f.data,
      nome: f.descricao,
      tipoId: f.tipo_parada_id,
      tipoSigla: sigla,
      tipoRotulo: sigla === null ? "não informado" : (rotuloDaSigla.get(sigla) ?? sigla),
      impacto: (IMPACTOS.has(f.impacto)
        ? f.impacto
        : "informativo") as LinhaDoCalendario["impacto"],
      turmas: f.turmas,
      abrangencia: rotuloDaAbrangencia(
        f.turmas.map((id) => codigoDaTurma.get(id) ?? "turma de outro ano"),
      ),
      situacao: f.status === "ativo" ? "ativo" : "inativo",
      tempos: null,
      lancamentosNoDia: contagem.get(f.codigo) ?? 0,
    };
  });

  const linhasDeParada: LinhaDoCalendario[] = (
    (paradasRes.data ?? []) as unknown as {
      id: string;
      codigo: string;
      data: string;
      ta_inicial: number | null;
      tempos: number | null;
      motivo: string;
      tipo: { valor: string; rotulo_exibicao: string | null } | null;
    }[]
  ).map((p) => ({
    origem: "parada",
    id: p.id,
    codigo: p.codigo,
    data: p.data,
    nome: p.motivo,
    tipoId: null,
    tipoSigla: p.tipo?.valor ?? null,
    tipoRotulo: p.tipo?.rotulo_exibicao ?? p.tipo?.valor ?? "não informado",
    impacto: "parcial",
    turmas: [],
    abrangencia: "Todas as turmas",
    situacao: "ativo",
    tempos:
      p.ta_inicial === null
        ? null
        : { inicio: p.ta_inicial, fim: p.ta_inicial + (p.tempos ?? 1) - 1 },
    lancamentosNoDia: 0,
  }));

  const erros = [feriadosRes, paradasRes, tiposRes, turmasRes].filter((r) => r.error);
  return {
    linhas: [...linhasDeFeriado, ...linhasDeParada].sort(
      (a, b) => a.data.localeCompare(b.data) || a.codigo.localeCompare(b.codigo),
    ),
    tipos: globais.map((t) => ({ id: t.id, sigla: t.valor, rotulo: t.rotulo_exibicao ?? t.valor })),
    turmas,
    erro: erros.length > 0 ? "Parte do calendário não pôde ser lida agora. Tente de novo." : null,
  };
}
