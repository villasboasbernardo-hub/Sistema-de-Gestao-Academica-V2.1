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
import { lerExtrasDaImpressao, lerSemanaDoDsa } from "@/app/(app)/turmas/[turma]/dsa/leitura";
import { montarDocumentoDoDsa } from "@/app/print/dsa/documento";
import { datasDaSemanaIso } from "@/lib/dominio/carga-semanal";
import { rubricaResolvida } from "@/lib/dominio/dsa/assinatura-editada";
import { montarPlanilhaComGeometria } from "@/lib/dominio/dsa/planilha-de-contingencia";
import { escreverXlsx } from "@/lib/planilha/ooxml";
import { calcularCaches, celulasComErro } from "@/lib/planilha/pasta";

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
