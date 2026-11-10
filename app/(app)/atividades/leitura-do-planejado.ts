/**
 * Bloco 18 (spec 033) — a LEITURA do que é planejado e acompanhado: as AEC previstas do currículo de cada turma (RA-2,
 * RA-3, RA-5) e a APOINST planejada (RA-6), com os lançamentos SALVOS vinculados e as marcações à mão.
 *
 * ⚠️ **UM LEITOR SÓ, PARA TODA TELA**: a ficha da turma (abas Palestras e APOINST), o acompanhamento do DSA, as abas
 *    do módulo Atividades, as estatísticas e os avisos do sininho leem daqui — o veredito (cumprida, atrasada…) sai das
 *    funções puras de `lib/dominio/atividades/`, nunca de uma conta na tela.
 * ⚠️ **SÓ O SALVO CONTA** (RP-8): o rascunho vinculado não cumpre (`.eq("salvo", true)`).
 * ⚠️ **AVULSA É A PALESTRA SEM VÍNCULO NENHUM** (`apoinst_id` nulo também — achado da revisão do Bloco 18), e leva
 *    como conta (`categoria_normativa`, `conta_como`): só a que conta como AEC entra no limite de AEC.
 * ⚠️ **O VINCULADO A AEC PREVISTA FORA DO QUADRO NÃO SOME** (achado da revisão): a prevista DESATIVADA (ou de outro
 *    currículo) não entra no quadro da turma, e o lançamento salvo vinculado a ela vai para as avulsas com a marca
 *    (`vinculo`) — ele continua contando no limite e na lista de Atividades, e a aba não pode perdê-lo.
 * ⚠️ **«NÃO LI» NÃO É «NÃO HÁ»** (gotcha 4, RN-DEG-01): a falha de leitura volta em `erro`, e quem chama a mostra.
 * ⚠️ **SEM AWAIT EM LAÇO**: uma rodada de `Promise.all`, e o resto em memória.
 * ⚠️ **SEM `server-only`, E O CLIENTE PODE VIR DE QUEM CHAMA** (frente E do Bloco 18): a leitura dos Avisos
 *    (`app/(app)/avisos/leitura.ts`) chama este módulo com o cliente da sessão que ela recebeu, e é chamada por teste
 *    de invariante sem servidor (`tests/invariantes/leitura-dos-avisos.test.ts`) — como `regimes-das-semanas.ts` e
 *    `contagem-presencial.ts`. Sem o cliente, vale o do servidor, como antes. Nenhum dos dois é o administrativo.
 */
import {
  quadroDaApoinst,
  type ApoinstPlanejada,
  type LancamentoDaApoinst,
  type QuadroDaApoinst,
} from "@/lib/dominio/atividades/apoinst";
import { VALOR_DO_TIPO_PALESTRA, rotuloDoTipo } from "@/lib/dominio/atividades/grupos";
import type { MarcacaoDeAtividade } from "@/lib/dominio/atividades/marcacoes";
import {
  comoContaDaLinha,
  vinculoForaDoQuadro,
  type AvulsaNaTela,
} from "@/lib/dominio/atividades/palestras-e-apoinst-na-tela";
import {
  quadroDasPrevistas,
  type AecPrevista,
  type LancamentoVinculado,
  type QuadroDasPrevistas,
} from "@/lib/dominio/atividades/previstas";
import { externoComOm } from "@/lib/dominio/atividades/responsavel";
import { nomeEmTexto } from "@/lib/dominio/nome-instrutor";
import { contagemNaPrimeira, lerTodasAsPaginas } from "@/lib/supabase/paginacao";
import { criarClienteDeServidor } from "@/lib/supabase/server";

type Linha = Record<string, unknown>;

/** O cliente da SESSÃO — o do servidor, ou o que quem chama já tem (a leitura dos Avisos). */
type ClienteDaSessao = Awaited<ReturnType<typeof criarClienteDeServidor>>;

export type TurmaDoPlanejado = {
  readonly id: string;
  readonly codigo: string;
  /** O currículo DA TURMA (RC-4): é dele que vêm as AEC previstas. */
  readonly curriculoId: string | null;
};

/**
 * A palestra lançada SEM vínculo (fora do currículo, RA-3) — ou o lançamento vinculado a AEC prevista fora do quadro,
 * com a marca. Conta no limite de AEC quando conta como AEC (`comoConta`). O formato é o do módulo puro.
 */
export type PalestraAvulsa = AvulsaNaTela;

const FRASE_DA_FALHA =
  "Não foi possível ler as atividades previstas agora. Recarregue a página; se persistir, procure o suporte.";

const COLUNAS_DO_LANCAMENTO =
  "codigo, turma_id, data, tempos_consumidos, atividade_prevista_id, apoinst_id, instrutor_id, responsavel_externo, responsavel_externo_om, local, descricao, subtipo, categoria_normativa, conta_como";

/** Os nomes dos instrutores do cadastro que os lançamentos citam (por id). */
async function nomesDosInstrutores(
  supabase: ClienteDaSessao,
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

function responsavelDaLinha(l: Linha, nomes: ReadonlyMap<string, string>): string | null {
  const instrutor = l.instrutor_id as string | null;
  if (instrutor !== null) return nomes.get(instrutor) ?? null;
  return externoComOm(
    l.responsavel_externo as string | null,
    l.responsavel_externo_om as string | null,
  );
}

function marcacaoDaLinha(m: Linha): MarcacaoDeAtividade {
  return {
    turmaId: m.turma_id as string,
    atividadePrevistaId: (m.atividade_prevista_id as string | null) ?? null,
    apoinstId: (m.apoinst_id as string | null) ?? null,
    situacao: m.situacao === "cumprida" ? "cumprida" : "a_cumprir",
    dataRealizada: (m.data_realizada as string | null) ?? null,
    justificativa: m.justificativa as string,
    autor: (m.autor_nome as string | null) ?? null,
    em: m.criado_em as string,
  };
}

/**
 * As AEC previstas de cada turma (pelo currículo dela), com os lançamentos vinculados e as marcações — e as palestras
 * AVULSAS das mesmas turmas.
 */
export async function lerPalestrasDasTurmas(
  turmas: readonly TurmaDoPlanejado[],
  /** O cliente da sessão de quem chama (a leitura dos Avisos); ausente, o do servidor. */
  cliente?: ClienteDaSessao,
): Promise<{
  readonly quadros: ReadonlyMap<string, QuadroDasPrevistas>;
  readonly avulsas: readonly PalestraAvulsa[];
  readonly erro: string | null;
}> {
  const vazio = { quadros: new Map<string, QuadroDasPrevistas>(), avulsas: [], erro: null };
  if (turmas.length === 0) return vazio;
  const supabase = cliente ?? (await criarClienteDeServidor());
  const turmaIds = turmas.map((t) => t.id);
  const curriculos = [
    ...new Set(turmas.map((t) => t.curriculoId).filter((c): c is string => c !== null)),
  ];

  const [previstas, vinculados, avulsas, marcacoes] = await Promise.all([
    curriculos.length === 0
      ? Promise.resolve({ data: [] as Linha[], error: null })
      : supabase
          .from("aec_previstas_curriculo")
          /*
           * TODAS as situações: a ativa vai para o quadro; a desativada só serve para dizer por que o lançamento salvo
           * vinculado a ela saiu do quadro (ele vai para as avulsas, com a marca).
           */
          .select(
            "id, codigo, curriculo_id, nome, ta_previstos, obrigatoria, ordem, status, tipo:config_listas!aec_previstas_curriculo_tipo_atividade_id_fkey(valor, rotulo_exibicao), disciplina:disciplinas!aec_previstas_curriculo_disciplina_id_fkey(id, codigo, cod_disciplina, nome_disciplina)",
          )
          .in("curriculo_id", curriculos)
          .order("ordem"),
    lerTodasAsPaginas((f) =>
      supabase
        .from("atividades_nao_letivas")
        .select(COLUNAS_DO_LANCAMENTO, contagemNaPrimeira(f))
        .in("turma_id", turmaIds)
        .eq("status", "ativo")
        .eq("salvo", true)
        .not("atividade_prevista_id", "is", null)
        .order("data")
        .order("codigo")
        .range(f.de, f.ate),
    ),
    lerTodasAsPaginas((f) =>
      supabase
        .from("atividades_nao_letivas")
        .select(COLUNAS_DO_LANCAMENTO, contagemNaPrimeira(f))
        .in("turma_id", turmaIds)
        .eq("status", "ativo")
        .eq("salvo", true)
        .eq("subtipo", VALOR_DO_TIPO_PALESTRA)
        /* Avulsa é SEM VÍNCULO NENHUM: a palestra que cumpre uma APOINST não é «fora do currículo». */
        .is("atividade_prevista_id", null)
        .is("apoinst_id", null)
        .order("data")
        .order("codigo")
        .range(f.de, f.ate),
    ),
    supabase
      .from("marcacoes_de_atividade")
      .select(
        "turma_id, atividade_prevista_id, apoinst_id, situacao, data_realizada, justificativa, autor_nome, criado_em",
      )
      .in("turma_id", turmaIds)
      .eq("status", "ativo")
      .not("atividade_prevista_id", "is", null),
  ]);
  if (previstas.error || vinculados.error || avulsas.error || marcacoes.error) {
    return { ...vazio, erro: FRASE_DA_FALHA };
  }

  const linhasVinculadas = (vinculados.data ?? []) as Linha[];
  const linhasAvulsas = (avulsas.data ?? []) as Linha[];
  const nomes = await nomesDosInstrutores(
    supabase,
    [
      ...new Set(
        [...linhasVinculadas, ...linhasAvulsas].map((l) => l.instrutor_id as string | null),
      ),
    ].filter((i): i is string => i !== null),
  );

  const previstasPorCurriculo = new Map<string, AecPrevista[]>();
  const desativadas = new Set<string>();
  for (const p of (previstas.data ?? []) as Linha[]) {
    if (p.status !== "ativo") {
      desativadas.add(p.id as string);
      continue;
    }
    const tipo = p.tipo as { valor: string; rotulo_exibicao: string | null } | null;
    const disciplina = p.disciplina as {
      id: string;
      codigo: string;
      cod_disciplina: string | null;
      nome_disciplina: string;
    } | null;
    const lista = previstasPorCurriculo.get(p.curriculo_id as string) ?? [];
    lista.push({
      id: p.id as string,
      codigo: p.codigo as string,
      nome: p.nome as string,
      tipoValor: tipo?.valor ?? "",
      tipoRotulo: tipo ? rotuloDoTipo({ valor: tipo.valor, rotulo: tipo.rotulo_exibicao }) : "",
      taPrevistos: p.ta_previstos === null ? null : Number(p.ta_previstos),
      disciplina: disciplina
        ? {
            id: disciplina.id,
            codigo: disciplina.cod_disciplina ?? disciplina.codigo,
            nome: disciplina.nome_disciplina,
          }
        : null,
      obrigatoria: Boolean(p.obrigatoria),
      ordem: Number(p.ordem ?? 0),
    });
    previstasPorCurriculo.set(p.curriculo_id as string, lista);
  }

  const codigoDaTurma = new Map(turmas.map((t) => [t.id, t.codigo]));
  const paraAvulsa = (l: Linha, vinculo: AvulsaNaTela["vinculo"]): PalestraAvulsa => ({
    codigo: l.codigo as string,
    turmaId: l.turma_id as string,
    turmaCodigo: codigoDaTurma.get(l.turma_id as string) ?? "",
    data: l.data as string,
    ta: Number(l.tempos_consumidos ?? 0),
    responsavel: responsavelDaLinha(l, nomes),
    local: (l.local as string | null) ?? null,
    descricao: (l.descricao as string | null) ?? null,
    comoConta: comoContaDaLinha(
      l.categoria_normativa as string | null,
      l.conta_como as string | null,
    ),
    vinculo,
  });

  const todasAsMarcacoes = ((marcacoes.data ?? []) as Linha[]).map(marcacaoDaLinha);
  const quadros = new Map<string, QuadroDasPrevistas>();
  /* Os vinculados a AEC prevista fora do quadro da turma: vão para as avulsas, com a marca (não somem). */
  const foraDoQuadro: PalestraAvulsa[] = [];
  for (const t of turmas) {
    const previstasDaTurma =
      t.curriculoId === null ? [] : (previstasPorCurriculo.get(t.curriculoId) ?? []);
    const ativasDaTurma = new Set(previstasDaTurma.map((p) => p.id));
    const daTurma = linhasVinculadas.filter((l) => l.turma_id === t.id);
    for (const l of daTurma) {
      const fora = vinculoForaDoQuadro(
        l.atividade_prevista_id as string,
        ativasDaTurma,
        desativadas,
      );
      if (fora !== null) foraDoQuadro.push(paraAvulsa(l, fora));
    }
    const lancamentos: LancamentoVinculado[] = daTurma
      .filter((l) => ativasDaTurma.has(l.atividade_prevista_id as string))
      .map((l) => ({
        codigo: l.codigo as string,
        alvoId: l.atividade_prevista_id as string,
        data: l.data as string,
        ta: Number(l.tempos_consumidos ?? 0),
        responsavel: responsavelDaLinha(l, nomes),
        local: (l.local as string | null) ?? null,
      }));
    quadros.set(
      t.id,
      quadroDasPrevistas({
        previstas: previstasDaTurma,
        lancamentos,
        marcacoes: todasAsMarcacoes.filter((m) => m.turmaId === t.id),
      }),
    );
  }

  return {
    quadros,
    avulsas: [...linhasAvulsas.map((l) => paraAvulsa(l, "nenhum")), ...foraDoQuadro],
    erro: null,
  };
}

/** As APOINST planejadas das turmas (ativas e desativadas), com os lançamentos vinculados e as marcações. */
export async function lerApoinstDasTurmas(
  turmas: readonly TurmaDoPlanejado[],
  hoje: string,
  /** O cliente da sessão de quem chama (a leitura dos Avisos); ausente, o do servidor. */
  cliente?: ClienteDaSessao,
): Promise<{ readonly quadro: QuadroDaApoinst; readonly erro: string | null }> {
  const neutro: QuadroDaApoinst = {
    linhas: [],
    porSituacao: { planejada: 0, em_andamento: 0, concluida: 0, atrasada: 0 },
  };
  if (turmas.length === 0) return { quadro: neutro, erro: null };
  const supabase = cliente ?? (await criarClienteDeServidor());
  const turmaIds = turmas.map((t) => t.id);

  const [planejadas, lancamentos, marcacoes] = await Promise.all([
    supabase
      .from("apoinst_planejadas")
      .select(
        "id, codigo, turma_id, nome, inicio_previsto, fim_previsto, ta_previstos, status, instrutor_id, disciplina:disciplinas!apoinst_planejadas_disciplina_id_fkey(id, codigo, cod_disciplina, nome_disciplina)",
      )
      .in("turma_id", turmaIds)
      .order("inicio_previsto"),
    lerTodasAsPaginas((f) =>
      supabase
        .from("atividades_nao_letivas")
        .select("codigo, apoinst_id, data, tempos_consumidos", contagemNaPrimeira(f))
        .in("turma_id", turmaIds)
        .eq("status", "ativo")
        .eq("salvo", true)
        .not("apoinst_id", "is", null)
        .order("data")
        .order("codigo")
        .range(f.de, f.ate),
    ),
    supabase
      .from("marcacoes_de_atividade")
      .select(
        "turma_id, atividade_prevista_id, apoinst_id, situacao, data_realizada, justificativa, autor_nome, criado_em",
      )
      .in("turma_id", turmaIds)
      .eq("status", "ativo")
      .not("apoinst_id", "is", null),
  ]);
  if (planejadas.error || lancamentos.error || marcacoes.error) {
    return { quadro: neutro, erro: FRASE_DA_FALHA };
  }
  const linhas = (planejadas.data ?? []) as Linha[];
  const nomes = await nomesDosInstrutores(
    supabase,
    [...new Set(linhas.map((l) => l.instrutor_id as string))].filter(Boolean),
  );
  const codigoDaTurma = new Map(turmas.map((t) => [t.id, t.codigo]));
  const planejadasLidas: ApoinstPlanejada[] = linhas.map((a) => {
    const d = a.disciplina as {
      id: string;
      codigo: string;
      cod_disciplina: string | null;
      nome_disciplina: string;
    } | null;
    return {
      id: a.id as string,
      codigo: a.codigo as string,
      turmaId: a.turma_id as string,
      turmaCodigo: codigoDaTurma.get(a.turma_id as string) ?? "",
      nome: a.nome as string,
      disciplina: d
        ? { id: d.id, codigo: d.cod_disciplina ?? d.codigo, nome: d.nome_disciplina }
        : { id: "", codigo: "", nome: "" },
      instrutor: a.instrutor_id
        ? { id: a.instrutor_id as string, nome: nomes.get(a.instrutor_id as string) ?? "" }
        : null,
      inicioPrevisto: a.inicio_previsto as string,
      fimPrevisto: a.fim_previsto as string,
      taPrevistos: Number(a.ta_previstos),
      ativa: a.status === "ativo",
    };
  });
  const lancs: LancamentoDaApoinst[] = ((lancamentos.data ?? []) as Linha[]).map((l) => ({
    codigo: l.codigo as string,
    apoinstId: l.apoinst_id as string,
    data: l.data as string,
    ta: Number(l.tempos_consumidos ?? 0),
  }));
  return {
    quadro: quadroDaApoinst({
      planejadas: planejadasLidas,
      lancamentos: lancs,
      marcacoes: ((marcacoes.data ?? []) as Linha[]).map(marcacaoDaLinha),
      hoje,
    }),
    erro: null,
  };
}
