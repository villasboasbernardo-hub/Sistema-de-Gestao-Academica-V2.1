/**
 * Spec 029 (Bloco 14, item 5, `FR-005`) — **o leitor comum do regime das semanas** (`lerRegimesDasSemanas`), o insumo
 * do saldo pelo regime da semana nos quatro leitores do andamento (Início, Avisos, `/turmas` e a ficha da turma).
 *
 * ⚠️ **COM UM DUPLO DO CLIENTE, SEM BANCO**: o duplo anota cada consulta (tabela, colunas, filtros, ordem e faixa) e
 *    devolve as linhas que o caso manda. O que se prova aqui é o que o leitor **pede** e como ele **monta** o mapa; que
 *    o PostgREST aceita as colunas e o filtro `or(...)` foi conferido no banco local, e o percurso inteiro (relógio do
 *    DSA → ficha) é o caso FR-005 de `tests/e2e/bloco-11-dsa.spec.ts`.
 */
import { describe, expect, it } from "vitest";

import { lerRegimesDasSemanas } from "@/app/(app)/turmas/regimes-das-semanas";

type Chamada = { readonly metodo: string; readonly argumentos: readonly unknown[] };
type Resposta = { data: unknown[] | null; error: { message: string } | null };

/** Um duplo do cliente: cada `from` abre uma consulta encadeável que anota as chamadas e responde pela tabela. */
function duplo(respostas: Record<string, Resposta>) {
  const consultas: { tabela: string; chamadas: Chamada[] }[] = [];
  const cliente = {
    from(tabela: string) {
      const chamadas: Chamada[] = [];
      consultas.push({ tabela, chamadas });
      const resposta = respostas[tabela] ?? { data: [], error: null };
      const encadeavel: Record<string, unknown> = {
        then(resolver: (r: unknown) => unknown, rejeitar?: (e: unknown) => unknown) {
          const dados = resposta.data;
          return Promise.resolve({
            data: dados,
            error: resposta.error,
            count: dados === null ? null : dados.length,
          }).then(resolver, rejeitar);
        },
      };
      for (const metodo of ["select", "eq", "or", "order", "range"]) {
        encadeavel[metodo] = (...argumentos: unknown[]) => {
          chamadas.push({ metodo, argumentos });
          return encadeavel;
        };
      }
      return encadeavel;
    },
  };
  return { cliente: cliente as never, consultas };
}

const TURMA_A = "aaaaaaaa-0000-0000-0000-000000000001";
const TURMA_B = "bbbbbbbb-0000-0000-0000-000000000002";
const REGIME = "cccccccc-0000-0000-0000-000000000003";

describe("FR-005 · `lerRegimesDasSemanas` pede o que o saldo precisa", () => {
  it("as semanas guardadas da semana ISO de hoje em diante — com a virada do ano ISO no filtro", async () => {
    // 28/10/2026 é a quarta da semana ISO 44 de 2026.
    const { cliente, consultas } = duplo({});
    await lerRegimesDasSemanas(cliente, { hoje: "2026-10-28" });
    const registros = consultas.find((c) => c.tabela === "dsa_regime_da_semana");
    expect(registros?.chamadas).toContainEqual({
      metodo: "or",
      argumentos: ["ano.gt.2026,and(ano.eq.2026,semana.gte.44)"],
    });
    expect(registros?.chamadas).toContainEqual({ metodo: "eq", argumentos: ["status", "ativo"] });
    /* Todas as turmas que a sessão alcança: nenhum filtro de turma. */
    expect(
      registros?.chamadas.some((c) => c.metodo === "eq" && c.argumentos[0] === "turma_id"),
    ).toBe(false);

    /* 01/01/2027 é sexta da semana ISO 53 de 2026: o ano do filtro é o ISO, não o do calendário. */
    const virada = duplo({});
    await lerRegimesDasSemanas(virada.cliente, { hoje: "2027-01-01" });
    expect(
      virada.consultas.find((c) => c.tabela === "dsa_regime_da_semana")?.chamadas,
    ).toContainEqual({ metodo: "or", argumentos: ["ano.gt.2026,and(ano.eq.2026,semana.gte.53)"] });
  });

  it("o «desde» é lido INTEIRO — sem corte por data —, com o TA do regime embutido", async () => {
    const { cliente, consultas } = duplo({});
    await lerRegimesDasSemanas(cliente, { hoje: "2026-10-28" });
    const vigencias = consultas.find((c) => c.tabela === "turma_regime_vigencia");
    expect(vigencias?.chamadas.find((c) => c.metodo === "select")?.argumentos[0]).toContain(
      "regime:regimes_de_horario(regime_tempos)",
    );
    expect(vigencias?.chamadas.map((c) => c.metodo)).not.toContain("or");
    expect(vigencias?.chamadas.filter((c) => c.metodo === "eq").map((c) => c.argumentos)).toEqual([
      ["status", "ativo"],
    ]);
  });

  it("a ficha lê só a turma dela, nas duas tabelas", async () => {
    const { cliente, consultas } = duplo({});
    await lerRegimesDasSemanas(cliente, { hoje: "2026-10-28", turmaId: TURMA_A });
    for (const tabela of ["dsa_regime_da_semana", "turma_regime_vigencia"]) {
      expect(consultas.find((c) => c.tabela === tabela)?.chamadas).toContainEqual({
        metodo: "eq",
        argumentos: ["turma_id", TURMA_A],
      });
    }
  });
});

describe("FR-005 · o mapa por turma", () => {
  it("monta registros e vigências por turma; regime nulo = o do curso (tempos nulo)", async () => {
    const { cliente } = duplo({
      dsa_regime_da_semana: {
        data: [
          {
            turma_id: TURMA_A,
            ano: 2026,
            semana: 45,
            origem: "gravado",
            regime_de_horario_id: null,
            regime_tempos: null,
          },
          {
            turma_id: TURMA_A,
            ano: 2026,
            semana: 46,
            origem: "so_esta_semana",
            regime_de_horario_id: REGIME,
            regime_tempos: 9,
          },
        ],
        error: null,
      },
      turma_regime_vigencia: {
        data: [
          {
            turma_id: TURMA_A,
            vigente_de: "2026-03-02",
            regime_de_horario_id: REGIME,
            regime: { regime_tempos: 9 },
          },
          { turma_id: TURMA_B, vigente_de: "2026-11-02", regime_de_horario_id: null, regime: null },
        ],
        error: null,
      },
    });
    const mapa = await lerRegimesDasSemanas(cliente, { hoje: "2026-10-28" });
    expect(mapa.get(TURMA_A)).toEqual({
      registros: [
        { ano: 2026, semana: 45, origem: "gravado", tempos: null },
        { ano: 2026, semana: 46, origem: "so_esta_semana", tempos: 9 },
      ],
      vigencias: [{ vigenteDe: "2026-03-02", tempos: 9 }],
    });
    expect(mapa.get(TURMA_B)).toEqual({
      registros: [],
      vigencias: [{ vigenteDe: "2026-11-02", tempos: null }],
    });
    expect(mapa.size).toBe(2);
  });

  it("⚠️ o «desde» NOMEADO cujo regime a sessão não vê tira a turma do mapa — não vira «o do curso» (gotcha 4)", async () => {
    const { cliente } = duplo({
      turma_regime_vigencia: {
        data: [
          {
            turma_id: TURMA_A,
            vigente_de: "2026-11-02",
            regime_de_horario_id: REGIME,
            regime: null,
          },
          { turma_id: TURMA_B, vigente_de: "2026-11-02", regime_de_horario_id: null, regime: null },
        ],
        error: null,
      },
    });
    const mapa = await lerRegimesDasSemanas(cliente, { hoje: "2026-10-28" });
    expect(mapa.has(TURMA_A), "o regime invisível foi lido como o do curso").toBe(false);
    expect(mapa.has(TURMA_B)).toBe(true);
  });

  it("`RN-DEG-01` · a falha de uma das leituras degrada para «sem exceções» (mapa vazio), sem estourar", async () => {
    for (const tabela of ["dsa_regime_da_semana", "turma_regime_vigencia"]) {
      const { cliente } = duplo({
        dsa_regime_da_semana: {
          data: [
            {
              turma_id: TURMA_A,
              ano: 2026,
              semana: 46,
              origem: "so_esta_semana",
              regime_de_horario_id: REGIME,
              regime_tempos: 9,
            },
          ],
          error: null,
        },
        [tabela]: { data: null, error: { message: "permission denied" } },
      });
      const mapa = await lerRegimesDasSemanas(cliente, { hoje: "2026-10-28" });
      expect(mapa.size, `a falha em ${tabela} não degradou para o mapa vazio`).toBe(0);
    }
  });
});
