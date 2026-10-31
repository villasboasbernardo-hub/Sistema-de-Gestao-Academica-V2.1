/**
 * A planilha de contingência contra o banco local — `FR-004`, `FR-012`, `SC-002`, `SC-003`, `SC-009`
 * (I-P2, I-P5) da spec 015.
 *
 * ⚠️ **DADO SINTÉTICO SÓ** (dúvida 2 do analyze, opção c, 09/10/2026): a semente de teste do DSA, mais
 * aulas copiadas dela para outras semanas. Nenhum dado real é lido nem gerado aqui; as turmas reais
 * são da conferência de Bernardo no preview.
 *
 * ⚠️ **O PAPEL DE REFERÊNCIA É O DA TELA**: `lerSemanaDoDsa` + `lerExtrasDaImpressao` +
 * `montarDocumentoDoDsa`, semana a semana — o caminho da rota `/print/dsa`, e não o da planilha.
 * As leituras vão em SEQUÊNCIA: em paralelo, sob carga, o banco local degrada (medido na T008).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  COLUNAS_DA_TURMA_DA_PLANILHA,
  lerDadosDaPlanilha,
  type TurmaDaPlanilha,
} from "@/app/(app)/turmas/[turma]/dsa/planilha/leitura";
import { quadrosDaSemana } from "@/app/(app)/turmas/[turma]/dsa/consulta";
import { lerExtrasDaImpressao, lerSemanaDoDsa } from "@/app/(app)/turmas/[turma]/dsa/leitura";
import { montarDocumentoDoDsa } from "@/app/print/dsa/documento";
import { datasDaSemanaIso, semanaIsoDe } from "@/lib/dominio/carga-semanal";
import { situacaoDaDisciplina } from "@/lib/dominio/dsa/situacao";
import { PALAVRA_DA_SITUACAO } from "@/lib/dominio/dsa/planilha/controle";
import { COLUNAS_DEPOIS_DAS_SEMANAS } from "@/lib/dominio/dsa/planilha/cronos";
import {
  ABA,
  C,
  C_PRIMEIRA_LINHA,
  C_REFERENCIA,
  K,
  K_PRIMEIRA_LINHA,
} from "@/lib/dominio/dsa/planilha/layout";
import { emOrdemNaturalDoCodigo } from "@/lib/dominio/ordem-natural";
import { rubricaResolvida } from "@/lib/dominio/dsa/assinatura-editada";
import { montarPlanilhaComGeometria } from "@/lib/dominio/dsa/planilha-de-contingencia";
import { escreverXlsx } from "@/lib/planilha/ooxml";
import {
  avaliador,
  calcularCaches,
  celulasComErro,
  chaveDaCelula,
  serieDaData,
} from "@/lib/planilha/pasta";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "../e2e/conta-de-teste";
import { sessaoDe } from "../e2e/curso-de-teste";
import { limparDsa, semearDsa, type DsaSemeado } from "../e2e/dsa-de-teste";
import { divergenciasDoPapel } from "../unidade/dsa/planilha/comparar-com-o-papel";
import { lerImpressao, precalcular } from "../unidade/dsa/planilha/leitura-da-pasta";

const PROCESSO = 95;
const HOJE = "2026-10-09";
const GERADA_POR = "Operador de Teste";
const ANO = 2026;
/** As semanas para onde a prova copia aulas da semente — além da W15, que a semente já povoa. */
const SEMANAS_EXTRAS = [20, 25, 30] as const;
/** `PEND-016-5` e D-COR-3 (spec 017): a marca do TA fora do DSA desta prova, para a limpeza. */
const OBSERVACAO_FORA = `Prova da planilha ${PROCESSO} — fora do DSA`;

type Cliente = Parameters<typeof lerSemanaDoDsa>[0];

const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

let EMAIL = "";
let semeado: DsaSemeado | undefined;
let sessao: SupabaseClient;

const QUAIS = ["turmaComRelogio", "turmaComVigenciaNova", "turmaSemRelogio"] as const;

async function turmaDe(codigo: string): Promise<TurmaDaPlanilha> {
  const { data, error } = await sessao
    .from("turmas")
    .select(COLUNAS_DA_TURMA_DA_PLANILHA)
    .eq("codigo", codigo)
    .single();
  if (error || !data) throw new Error(`turma ${codigo}: ${error?.message}`);
  return data as unknown as TurmaDaPlanilha;
}

beforeAll(async () => {
  EMAIL = emailDeTeste("planilha", PROCESSO);
  await criarConta(EMAIL, `USR-PLA-${PROCESSO}`);
  semeado = await semearDsa(PROCESSO, EMAIL);
  sessao = await sessaoDe(EMAIL);

  /*
   * Mais semanas com lançamento em cada turma, copiados da própria semente (idempotente, por código):
   * aulas na turma que tem disciplina; TAD nas outras duas, que a semente povoa só com atividade.
   */
  for (const qual of QUAIS) {
    const codigo = semeado[qual];
    const { data: t } = await admin.from("turmas").select("id").eq("codigo", codigo).single();
    const turmaId = (t as { id: string }).id;
    const lugares = SEMANAS_EXTRAS.flatMap((s, i) =>
      [0, 2].map((dia, j) => ({
        sufixo: `${s}-${j}`,
        data: datasDaSemanaIso(ANO, s)[dia] as string,
        ta: 1 + i + j,
      })),
    );
    const { data: molde } = await admin
      .from("registros_aula")
      .select(
        "curso_id, unidade_ensino_id, disciplina_id, instrutor_id, local, conteudo_resumo, metodologia",
      )
      .eq("turma_id", turmaId)
      .eq("status", "ativo")
      .not("ta_inicial", "is", null)
      .order("codigo")
      .limit(1)
      .maybeSingle();
    const { error } =
      molde !== null
        ? await admin.from("registros_aula").upsert(
            lugares.map((l) => ({
              ...molde,
              codigo: `PLA-${PROCESSO}-${qual}-${l.sufixo}`,
              turma_id: turmaId,
              data: l.data,
              ta_inicial: l.ta,
              tempos_consumidos: 2,
            })),
            { onConflict: "codigo" },
          )
        : await admin.from("atividades_nao_letivas").upsert(
            lugares.map((l) => ({
              codigo: `PLA-${PROCESSO}-${qual}-${l.sufixo}`,
              categoria_normativa: "TAD",
              subtipo: "Administração",
              escopo: "turma",
              turma_id: turmaId,
              data: l.data,
              descricao: "Atividade da prova da planilha",
              ta_inicial: l.ta,
              tempos_consumidos: 2,
              local: "Sala de teste",
            })),
            { onConflict: "codigo" },
          );
    if (error) throw new Error(`lançamentos extras em ${codigo}: ${error.message}`);
  }

  /*
   * ⚠️ **O CASO QUE DISCRIMINA O RETRATO** (DoD 8): sem ele, o painel da semente não diz *Atrasada* nem
   * *Conflitou* em disciplina nenhuma (medido em 09/10/2026), e a coluna de retrato se compararia vazia
   * com vazia. A previsão de início de uma disciplina SEM lançamento no passado faz o painel dizer
   * *Atrasada* (`estaAtrasada`: não iniciou e a previsão já passou).
   */
  {
    const { data: t } = await admin
      .from("turmas")
      .select("id, curso_id")
      .eq("codigo", semeado.turmaComRelogio)
      .single();
    const turma = t as { id: string; curso_id: string };
    const { data: doCurso } = await admin
      .from("disciplinas")
      .select("id")
      .eq("curso_id", turma.curso_id)
      .eq("status", "ativo")
      .order("codigo");
    const { data: comAula } = await admin
      .from("vw_ocupacao_ta")
      .select("disciplina_id")
      .eq("turma_id", turma.id);
    const usadas = new Set(
      ((comAula ?? []) as { disciplina_id: string | null }[]).map((o) => o.disciplina_id),
    );
    const semAula = ((doCurso ?? []) as { id: string }[]).find((d) => !usadas.has(d.id));
    if (semAula === undefined)
      throw new Error("a semente não tem disciplina sem aula para atrasar");
    /* A previsão efetiva é `coalesce(turma_disciplina, disciplina)` — a desta vem da própria disciplina. */
    const { error: erroPrevisao } = await admin
      .from("disciplinas")
      .update({ previsao_inicio: "2026-03-02", previsao_termino: "2026-06-30" })
      .eq("id", semAula.id);
    if (erroPrevisao) throw new Error(`previsão da disciplina atrasada: ${erroPrevisao.message}`);
  }

  /*
   * ⚠️ **`PEND-016-5` E D-COR-3 (spec 017)**: 10 TA SEM POSIÇÃO dentro da pasta (uma aula histórica, sem
   * `ta_inicial`, na W16) e 5 TA FORA DO DSA na mesma disciplina. O painel, a CONTROLE, a CRONOS e o papel têm de
   * contar os 15 — e UMA vez só: o sem posição da pasta já está na faixa da semana, e não pode ir também para
   * `FORA_TEMPOS` (analyze, achado 3).
   */
  {
    const { data: t } = await admin
      .from("turmas")
      .select("id")
      .eq("codigo", semeado.turmaComRelogio)
      .single();
    const turmaId = (t as { id: string }).id;
    const { data: molde, error: erroMolde } = await admin
      .from("registros_aula")
      .select(
        "curso_id, unidade_ensino_id, disciplina_id, instrutor_id, local, conteudo_resumo, metodologia, unidades_ensino!registros_aula_unidade_ensino_id_fkey(disciplina_id)",
      )
      .eq("turma_id", turmaId)
      .eq("status", "ativo")
      .not("ta_inicial", "is", null)
      .order("codigo")
      .limit(1)
      .single();
    if (erroMolde) throw new Error(`molde do sem posição: ${erroMolde.message}`);
    const { unidades_ensino: ue, ...campos } = molde as unknown as {
      unidades_ensino: { disciplina_id: string } | null;
      disciplina_id: string | null;
    } & Record<string, unknown>;
    const disciplinaId = ue?.disciplina_id ?? campos.disciplina_id;
    const { error: erroSem } = await admin.from("registros_aula").upsert(
      {
        ...campos,
        codigo: `PLA-${PROCESSO}-sem-posicao`,
        turma_id: turmaId,
        data: datasDaSemanaIso(ANO, 16)[1] as string,
        ta_inicial: null,
        tempos_consumidos: 10,
      },
      { onConflict: "codigo" },
    );
    if (erroSem) throw new Error(`aula sem posição: ${erroSem.message}`);
    /* A semente do DSA não cria a linha da turma; sem ela não há onde registrar o TA fora do DSA. */
    const lerLinha = () =>
      admin
        .from("turma_disciplina")
        .select("id")
        .eq("turma_id", turmaId)
        .eq("disciplina_id", disciplinaId as string)
        .eq("status", "ativo")
        .maybeSingle();
    let { data: linha } = await lerLinha();
    if (linha === null) {
      const { error: erroLinha } = await admin
        .from("turma_disciplina")
        .insert({ turma_id: turmaId, disciplina_id: disciplinaId as string });
      if (erroLinha) throw new Error(`linha da turma: ${erroLinha.message}`);
      ({ data: linha } = await lerLinha());
    }
    await admin.from("ta_fora_do_dsa").delete().eq("observacao", OBSERVACAO_FORA);
    const { error: erroFora } = await admin.from("ta_fora_do_dsa").insert({
      turma_disciplina_id: (linha as { id: string }).id,
      turma_id: turmaId,
      disciplina_id: disciplinaId as string,
      data: datasDaSemanaIso(ANO, 16)[2] as string,
      tempos: 5,
      observacao: OBSERVACAO_FORA,
    });
    if (erroFora) throw new Error(`TA fora do DSA: ${erroFora.message}`);
  }

  /* Uma turma semipresencial com a etapa cadastrada, cobrindo as semanas com aula (`FR-014`). */
  const { error: erroEtapa } = await admin
    .from("turmas")
    .update({
      modalidade: "semipresencial",
      inicio_etapa_presencial: "2026-03-02",
      termino_etapa_presencial: "2026-08-28",
    })
    .eq("codigo", semeado.turmaComVigenciaNova);
  if (erroEtapa) throw new Error(`etapa presencial: ${erroEtapa.message}`);
}, 240_000);

afterAll(async () => {
  if (semeado) {
    await admin.from("ta_fora_do_dsa").delete().eq("observacao", OBSERVACAO_FORA);
    await admin.from("atividades_nao_letivas").delete().like("codigo", `PLA-${PROCESSO}-%`);
    await admin.from("registros_aula").delete().like("codigo", `PLA-${PROCESSO}-%`);
    await admin
      .from("turmas")
      .update({
        modalidade: "presencial",
        inicio_etapa_presencial: null,
        termino_etapa_presencial: null,
      })
      .eq("codigo", semeado.turmaComVigenciaNova);
  }
  await limparDsa(semeado);
  await apagarConta(EMAIL);
});

async function contagens(): Promise<Map<string, number>> {
  const { readFileSync } = await import("node:fs");
  const tipos = readFileSync("lib/tipos/database.ts", "utf8");
  const publico = tipos.slice(tipos.indexOf("  public: {"));
  const tabelas = publico.slice(publico.indexOf("    Tables: {"), publico.indexOf("    Views: {"));
  const nomes = [...tabelas.matchAll(/\n {6}(\w+): \{\n {8}Row:/g)].map((m) => m[1] as string);
  const resultado = new Map<string, number>();
  for (const nome of nomes) {
    const { count, error } = await admin.from(nome).select("*", { count: "exact", head: true });
    if (error) throw new Error(`contagem de ${nome}: ${error.message}`);
    resultado.set(nome, count ?? 0);
  }
  return resultado;
}

describe("`FR-004`, `SC-009` · baixar a planilha não escreve nada no banco", () => {
  it("a contagem de todas as tabelas de `public` é a mesma antes e depois", async () => {
    const antes = await contagens();
    expect(antes.size).toBeGreaterThan(20);
    const turma = await turmaDe((semeado as DsaSemeado).turmaComRelogio);
    const insumo = await lerDadosDaPlanilha(sessao as unknown as Cliente, turma, {
      hoje: HOJE,
      geradaEm: new Date().toISOString(),
      geradaPor: GERADA_POR,
    });
    const arquivo = escreverXlsx(montarPlanilhaComGeometria(insumo).pasta);
    expect(arquivo.length).toBeGreaterThan(1000);
    expect(Object.fromEntries(await contagens())).toEqual(Object.fromEntries(antes));
  }, 240_000);
});

describe.each(QUAIS)(
  "%s · a IMPRESSÃO de cada semana com lançamento é o papel do sistema (I-P5)",
  (qual) => {
    it("`SC-002` (emendado): zero erro de fórmula, e o conteúdo semana a semana", async () => {
      const turma = await turmaDe((semeado as DsaSemeado)[qual]);
      const insumo = await lerDadosDaPlanilha(sessao as unknown as Cliente, turma, {
        hoje: HOJE,
        geradaEm: "2026-10-09T13:00:00.000Z",
        geradaPor: GERADA_POR,
      });
      const { pasta, impressao: g } = montarPlanilhaComGeometria(insumo);
      expect(celulasComErro(calcularCaches(pasta))).toEqual([]);

      const comLancamento = insumo.semanas.filter((s) =>
        s.dias.some((d) => d.linhas.some((l) => !l.chave.startsWith("ei-"))),
      );
      expect(
        comLancamento.length,
        "a prova precisa de pelo menos 3 semanas com lançamento",
      ).toBeGreaterThanOrEqual(3);
      if (qual === "turmaComVigenciaNova") {
        expect(turma.modalidade).toBe("semipresencial");
        expect(insumo.semanas.length).toBeLessThan(50);
      }

      const conhecidos = precalcular(pasta);
      const extras = await lerExtrasDaImpressao(sessao as unknown as Cliente, {
        turmaId: turma.id,
        cursoId: turma.curso_id,
      });
      const divergencias: string[] = [];
      for (const s of comLancamento) {
        const escolha = { ano: s.semana.ano, numero: s.semana.numero };
        const lida = await lerSemanaDoDsa(sessao as unknown as Cliente, {
          turmaId: turma.id,
          cursoId: turma.curso_id,
          ...escolha,
          sabadoPedido: false,
          hoje: HOJE,
        });
        const documento = montarDocumentoDoDsa({
          codigoDaTurma: turma.codigo,
          turma,
          cursoId: turma.curso_id,
          escolha,
          lida,
          extras,
          hoje: HOJE,
          /*
           * Bloco 16 (ajuste B, D-20 da spec 031): o papel corta os tempos finais vazios; a planilha de contingência
           * mantém o regime inteiro — a comparação é com o papel de linhas do regime.
           */
          ...(lida.relogio ? { minimoDeTempos: lida.relogio.temposDoRegime } : {}),
        });
        const lidaDaPlanilha = lerImpressao(pasta, g, s.rotulo, conhecidos);
        for (const d of divergenciasDoPapel(lidaDaPlanilha, g, {
          ...documento,
          assinaturas: {
            esquerda: rubricaResolvida(documento.assinaturas.esquerda, GERADA_POR),
            direita: rubricaResolvida(documento.assinaturas.direita, GERADA_POR),
          },
        })) {
          divergencias.push(`${s.rotulo} · ${d}`);
        }
      }
      expect(divergencias).toEqual([]);
    }, 240_000);
  },
);

/*
 * ⚠️ **SÓ A TURMA COM RELÓGIO TEM DISCIPLINA NA SEMENTE** — as outras duas são de cursos sem currículo,
 * e a CONTROLE delas sai vazia (conferido abaixo, sem erro de fórmula). A prova da situação é nesta.
 */
describe.each(["turmaComRelogio"] as const)(
  "%s · a CONTROLE contra o painel de situação do sistema (`DP-1`, item 6)",
  (qual) => {
    it("a situação em três degraus é a de `situacaoDaDisciplina`, e o retrato é o do painel", async () => {
      const turma = await turmaDe((semeado as DsaSemeado)[qual]);
      const insumo = await lerDadosDaPlanilha(sessao as unknown as Cliente, turma, {
        hoje: HOJE,
        geradaEm: "2026-10-09T13:00:00.000Z",
        geradaPor: GERADA_POR,
      });
      const { pasta } = montarPlanilhaComGeometria(insumo);
      const corrente = semanaIsoDe(HOJE);
      const lida = await lerSemanaDoDsa(sessao as unknown as Cliente, {
        turmaId: turma.id,
        cursoId: turma.curso_id,
        ano: corrente?.ano ?? ANO,
        numero: corrente?.numero ?? 41,
        sabadoPedido: false,
        hoje: HOJE,
      });
      const extras = await lerExtrasDaImpressao(sessao as unknown as Cliente, {
        turmaId: turma.id,
        cursoId: turma.curso_id,
      });
      const ateODia = lida.dias[lida.dias.length - 1] ?? HOJE;
      const emConflito = new Set(
        [...lida.marcasDeConflito.entries()]
          .filter(([, m]) => m.conflito !== null)
          .map(([id]) => id),
      );
      const quadros = quadrosDaSemana({
        execucao: extras.execucao,
        ocupacao: lida.ocupacaoAcumulada,
        emConflito,
        ateODia,
        hoje: HOJE,
        /* Bloco 15 (`PEND-029-1`): a planilha recorta pela janela da carga, e o painel também. */
        periodoDaTurma: { inicio: turma.data_inicio, termino: turma.data_termino },
      });
      /* A referência da CONTROLE posta no MESMO corte do painel — o fim da semana corrente. */
      const { valorDe } = avaliador(
        pasta,
        new Map([
          [
            chaveDaCelula(ABA.controle, C_REFERENCIA.linha, C_REFERENCIA.coluna),
            serieDaData(ateODia),
          ],
        ]),
      );
      const ordem = emOrdemNaturalDoCodigo(insumo.disciplinas, (d) => d.codigo);
      expect(ordem.length).toBeGreaterThan(0);
      /*
       * ⚠️ **A BASE DA CHD É A RÉGUA** (`PEND-016-5`, C-26 da spec 017): o painel soma o que `vw_chd_por_fato` soma até
       *    o fim da semana — o lançamento sem posição e o TA fora do DSA inclusive —, e a CRONOS o ano inteiro.
       */
      const { data: base } = await admin
        .from("vw_chd_por_fato")
        .select("disciplina_id, data, tempos, origem, sem_posicao")
        .eq("turma_id", turma.id);
      const somaDaBase = (disciplinaId: string, ate: string | null) =>
        ((base ?? []) as { disciplina_id: string | null; data: string; tempos: number }[])
          .filter((b) => b.disciplina_id === disciplinaId && (ate === null || b.data <= ate))
          .reduce((n, b) => n + Number(b.tempos), 0);
      const semPosicaoNaBase = (
        (base ?? []) as { sem_posicao: boolean; origem: string; tempos: number }[]
      ).filter((b) => b.sem_posicao && Number(b.tempos) > 0);
      expect(
        semPosicaoNaBase.some((b) => b.origem === "fora_do_dsa") &&
          semPosicaoNaBase.some((b) => b.origem === "aula"),
        "a prova precisa do sem posição e do fora do DSA semeados",
      ).toBe(true);
      const distribuida =
        K.primeiraSemana + insumo.semanas.length + COLUNAS_DEPOIS_DAS_SEMANAS.distribuida;
      const { valorDe: valorDaPasta } = avaliador(pasta, new Map());
      /* O caso que discrimina: o painel tem de dizer *Atrasada* em pelo menos uma disciplina. */
      expect(quadros.some((q) => q.situacao === "atrasada")).toBe(true);
      const divergencias: string[] = [];
      ordem.forEach((d, i) => {
        const l = C_PRIMEIRA_LINHA + i;
        const q = quadros.find((x) => x.codigo === d.codigo);
        if (q === undefined) return void divergencias.push(`${d.codigo}: sem quadro no painel`);
        const lancada = valorDe(ABA.controle, l, C.lancada);
        if (lancada !== q.chAcumulada)
          divergencias.push(`${d.codigo}: lançada ${String(lancada)} × ${q.chAcumulada}`);
        const naBase = somaDaBase(d.id, ateODia);
        if (q.chAcumulada !== naBase)
          divergencias.push(`${d.codigo}: painel ${q.chAcumulada} × base da CHD ${naBase}`);
        const naCronos = valorDaPasta(ABA.cronos, K_PRIMEIRA_LINHA + i, distribuida);
        const anoInteiro = somaDaBase(d.id, null);
        if (naCronos !== anoInteiro)
          divergencias.push(
            `${d.codigo}: CRONOS distribuída ${String(naCronos)} × base ${anoInteiro}`,
          );
        const esperada =
          PALAVRA_DA_SITUACAO[
            situacaoDaDisciplina({
              temLancamento: q.chAcumulada > 0,
              temConflito: false,
              chPrevista: q.chPrevista,
              chAcumulada: q.chAcumulada,
              atrasada: false,
            })
          ];
        const situacao = valorDe(ABA.controle, l, C.situacao);
        if (situacao !== esperada)
          divergencias.push(`${d.codigo}: situação ${String(situacao)} × ${esperada}`);
        const retrato = valorDe(ABA.controle, l, C.retrato);
        const doPainel =
          q.situacao === "atrasada" || q.situacao === "conflitou"
            ? PALAVRA_DA_SITUACAO[q.situacao]
            : null;
        if (retrato !== doPainel)
          divergencias.push(`${d.codigo}: retrato ${String(retrato)} × ${String(doPainel)}`);
      });
      expect(divergencias).toEqual([]);
    }, 240_000);
  },
);

describe.each(["turmaComVigenciaNova", "turmaSemRelogio"] as const)(
  "%s · turma sem disciplina: a CONTROLE e a CRONOS saem vazias, sem erro",
  (qual) => {
    it("nenhuma linha de disciplina, e nenhuma fórmula com erro", async () => {
      const turma = await turmaDe((semeado as DsaSemeado)[qual]);
      const insumo = await lerDadosDaPlanilha(sessao as unknown as Cliente, turma, {
        hoje: HOJE,
        geradaEm: "2026-10-09T13:00:00.000Z",
        geradaPor: GERADA_POR,
      });
      expect(insumo.disciplinas).toEqual([]);
      const { pasta } = montarPlanilhaComGeometria(insumo);
      const controle = pasta.abas.find((a) => a.nome === ABA.controle);
      expect(controle?.celulas.has(C_PRIMEIRA_LINHA)).toBe(false);
      expect(celulasComErro(calcularCaches(pasta))).toEqual([]);
    }, 240_000);
  },
);
