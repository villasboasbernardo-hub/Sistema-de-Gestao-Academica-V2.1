/**
 * O arquivo de conferência da planilha de contingência — T050 da spec 015 (`SC-002` emendado,
 * `SC-007`, R-12, `DP-4`).
 *
 * Gera, de uma semente SINTÉTICA — a turma do DSA de teste, com 50 semanas e o volume da maior turma
 * medida (`research.md` §0: 676 lançamentos) —, o `.xlsx` e o `gabarito.json` em
 * `os.tmpdir()/ciaara-planilha-de-conferencia/`, pelo caminho real: banco local → leitura da rota →
 * montagem → escritor. É deste par que `scripts/provas/planilha_no_excel.ps1` e a conferência no
 * Google partem (T052, T053).
 *
 * ⚠️ **NENHUM DADO REAL** (dúvida 2 do analyze, opção c): nada aqui lê o remoto, e o arquivo sai
 * para a pasta temporária da máquina, nunca para o repositório.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  COLUNAS_DA_TURMA_DA_PLANILHA,
  lerDadosDaPlanilha,
  type TurmaDaPlanilha,
} from "@/app/(app)/turmas/[turma]/dsa/planilha/leitura";
import type { lerSemanaDoDsa } from "@/app/(app)/turmas/[turma]/dsa/leitura";
import { datasDaSemanaIso, semanaIsoDe } from "@/lib/dominio/carga-semanal";
import { montarPlanilhaComGeometria } from "@/lib/dominio/dsa/planilha-de-contingencia";
import { ABA } from "@/lib/dominio/dsa/planilha/layout";
import { letrasDaColuna, type Valor } from "@/lib/planilha/formula";
import { escreverXlsx } from "@/lib/planilha/ooxml";
import { avaliador, calcularCaches, celulasComErro, chaveDaCelula } from "@/lib/planilha/pasta";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "../e2e/conta-de-teste";
import { sessaoDe } from "../e2e/curso-de-teste";
import { limparDsa, semearDsa, type DsaSemeado } from "../e2e/dsa-de-teste";
import { precalcular } from "../unidade/dsa/planilha/leitura-da-pasta";

const PROCESSO = 96;
const HOJE = "2026-10-09";
const ANO = 2026;
/** O volume da maior turma medida (`research.md` §0). */
const LANCAMENTOS = 676;
/** O limite de corpo de resposta de uma função da Vercel — 4,5 MB (documentação da Vercel, *Functions limits*). */
const LIMITE_DA_VERCEL = 4.5 * 1024 * 1024;
export const PASTA_DE_CONFERENCIA = join(tmpdir(), "ciaara-planilha-de-conferencia");

type Cliente = Parameters<typeof lerSemanaDoDsa>[0];

const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

let EMAIL = "";
let semeado: DsaSemeado | undefined;
let sessao: SupabaseClient;

beforeAll(async () => {
  EMAIL = emailDeTeste("conferencia", PROCESSO);
  await criarConta(EMAIL, `USR-CNF-${PROCESSO}`);
  semeado = await semearDsa(PROCESSO, EMAIL);
  sessao = await sessaoDe(EMAIL);

  const { data: t } = await admin
    .from("turmas")
    .select("id")
    .eq("codigo", semeado.turmaComRelogio)
    .single();
  const turmaId = (t as { id: string }).id;
  const { data: molde, error } = await admin
    .from("registros_aula")
    .select("curso_id, unidade_ensino_id, instrutor_id, local, metodologia")
    .eq("turma_id", turmaId)
    .like("codigo", `DSA-E2D${PROCESSO}-A2`)
    .single();
  if (error || !molde) throw new Error(`molde: ${error?.message}`);

  /* 676 lançamentos em 50 semanas, segunda a sexta, em blocos de 1 a 3 TA — sem tocar a W15 da semente. */
  const lugares: { data: string; ta: number; tempos: number }[] = [];
  for (let s = 2; s <= 51 && lugares.length < LANCAMENTOS; s += 1) {
    if (s === 15) continue;
    for (const [dia, data] of datasDaSemanaIso(ANO, s).slice(0, 5).entries()) {
      for (const [ta, tempos] of [
        [1, 2],
        [3, 1],
        [4, 3],
      ] as const) {
        if (lugares.length >= LANCAMENTOS) break;
        if ((s + dia) % 5 === 0 && ta === 4) continue;
        lugares.push({ data, ta, tempos });
      }
    }
  }
  const linhas = lugares.map((l, i) => ({
    ...molde,
    codigo: `CNF-${PROCESSO}-${String(i).padStart(4, "0")}`,
    turma_id: turmaId,
    data: l.data,
    ta_inicial: l.ta,
    tempos_consumidos: l.tempos,
    conteudo_resumo: i % 7 === 0 ? `Aula sintética ${i}` : "Navegação costeira",
  }));
  for (let i = 0; i < linhas.length; i += 500) {
    const { error: e } = await admin
      .from("registros_aula")
      .upsert(linhas.slice(i, i + 500), { onConflict: "codigo" });
    if (e) throw new Error(`carga sintética: ${e.message}`);
  }
}, 240_000);

afterAll(async () => {
  await admin.from("registros_aula").delete().like("codigo", `CNF-${PROCESSO}-%`);
  await limparDsa(semeado);
  await apagarConta(EMAIL);
});

const normal = (v: Valor) =>
  v === null || v === "" ? null : typeof v === "object" ? `#${v.erro}` : v;

describe("T050 · o arquivo de conferência, pelo caminho real", () => {
  it("50 semanas, zero erro de fórmula (`SC-002` emendado), tempo e tamanho — e o gabarito", async () => {
    const { data } = await sessao
      .from("turmas")
      .select(COLUNAS_DA_TURMA_DA_PLANILHA)
      .eq("codigo", (semeado as DsaSemeado).turmaComRelogio)
      .single();
    const turma = data as unknown as TurmaDaPlanilha;

    const inicio = performance.now();
    const insumo = await lerDadosDaPlanilha(sessao as unknown as Cliente, turma, {
      hoje: HOJE,
      geradaEm: "2026-10-09T13:00:00.000Z",
      geradaPor: "Operador de Teste",
    });
    const lida = performance.now();
    const { pasta, impressao: g, entrada } = montarPlanilhaComGeometria(insumo);
    const arquivo = escreverXlsx(pasta);
    const fim = performance.now();

    expect(insumo.semanas).toHaveLength(50);
    const lancamentos = insumo.semanas.reduce(
      (n, s) =>
        n +
        s.dias.reduce((m, d) => m + d.linhas.filter((l) => !l.chave.startsWith("ei-")).length, 0),
      0,
    );
    expect(lancamentos).toBeGreaterThanOrEqual(LANCAMENTOS);

    const caches = calcularCaches(pasta);
    expect(celulasComErro(caches), "SC-002: zero erro de fórmula na semente sintética").toEqual([]);
    expect(fim - inicio, "a geração inteira em menos de 30 s").toBeLessThan(30_000);
    expect(arquivo.length, "abaixo do limite de corpo da Vercel").toBeLessThan(LIMITE_DA_VERCEL);

    /* O gabarito: o valor de cada fórmula, e a IMPRESSÃO em três semanas com aula. */
    const abas = pasta.abas.map((a) => ({
      nome: a.nome,
      celulas: [...a.celulas].flatMap(([linha, cs]) =>
        [...cs]
          .filter(([, c]) => c.formula !== undefined)
          .map(([coluna]) => [
            `${letrasDaColuna(coluna)}${linha}`,
            normal(caches.get(chaveDaCelula(a.nome, linha, coluna)) ?? null),
          ]),
      ),
    }));
    const conhecidos = precalcular(pasta);
    const corrente = semanaIsoDe(HOJE)?.numero ?? 41;
    const semanas = insumo.semanas.filter((s) => [15, 20, corrente].includes(s.semana.numero));
    const impressao = semanas.map((s) => {
      const { valorDe } = avaliador(
        pasta,
        new Map([[chaveDaCelula(ABA.impressao, g.linhaDoSeletor, g.colunaDoSeletor), s.rotulo]]),
        conhecidos,
      );
      const celulas: [string, Valor][] = [];
      const daAba = pasta.abas.find((a) => a.nome === ABA.impressao);
      for (const [linha, cs] of daAba?.celulas ?? []) {
        if (linha < 3 || linha > g.emitido) continue;
        for (const [coluna, c] of cs) {
          if (c.formula === undefined || coluna > g.ultimaColuna) continue;
          celulas.push([
            `${letrasDaColuna(coluna)}${linha}`,
            normal(valorDe(ABA.impressao, linha, coluna)),
          ]);
        }
      }
      return { rotulo: s.rotulo, celulas };
    });
    expect(impressao).toHaveLength(3);

    mkdirSync(PASTA_DE_CONFERENCIA, { recursive: true });
    writeFileSync(join(PASTA_DE_CONFERENCIA, "planilha.xlsx"), arquivo);
    const formulas = abas.reduce((n, a) => n + a.celulas.length, 0);
    writeFileSync(
      join(PASTA_DE_CONFERENCIA, "gabarito.json"),
      JSON.stringify(
        {
          seletor: `${letrasDaColuna(g.colunaDoSeletor)}${g.linhaDoSeletor}`,
          medido: {
            semanas: insumo.semanas.length,
            lancamentos,
            linhasDaEntrada: entrada.ultimaLinha,
            formulas,
            bytes: arquivo.length,
            leituraMs: Math.round(lida - inicio),
            montagemEEscritaMs: Math.round(fim - lida),
          },
          abas,
          impressao,
        },
        null,
        0,
      ),
    );
    process.stdout.write(
      `CONFERENCIA ${JSON.stringify({ semanas: insumo.semanas.length, lancamentos, formulas, bytes: arquivo.length, leituraMs: Math.round(lida - inicio), montagemEEscritaMs: Math.round(fim - lida), pasta: PASTA_DE_CONFERENCIA })}\n`,
    );
  }, 300_000);
});
