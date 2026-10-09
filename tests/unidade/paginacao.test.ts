/**
 * O leitor paginado — `DP-5` da spec 015.
 *
 * > *"a leitura busca em páginas de 1.000 até acabar, para o DSA e para a planilha. NÃO recusar
 * > acima de 1.000."*
 * > — Bernardo Villas Boas, 09/10/2026
 *
 * ⚠️ **O CASO QUE MAIS IMPORTA É O DO SERVIDOR QUE CORTA ABAIXO DE 1.000.** O teto do PostgREST é
 * `max_rows`, e o do remoto não precisa ser o do local: um leitor que pedisse páginas fixas de 1.000
 * pularia linhas sem erro nenhum. O tamanho da página é o que o servidor devolveu na primeira.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  TAMANHO_DA_PAGINA,
  contagemNaPrimeira,
  lerTodasAsPaginas,
  type FaixaDaPagina,
  type RespostaDaPagina,
} from "@/lib/supabase/paginacao";

type Pedido = FaixaDaPagina & { readonly resolver: () => void };

/**
 * Um banco de mentira com `total` linhas, que devolve no máximo `teto` por pedido. Cada pedido fica
 * PENDENTE até ser resolvido — é o que deixa medir se as páginas restantes saem na mesma rodada.
 */
function bancoFalso(total: number, teto = TAMANHO_DA_PAGINA, falharNaPagina?: number) {
  const linhas = Array.from({ length: total }, (_, i) => ({ n: i }));
  const pedidos: Pedido[] = [];
  const pedir = (faixa: FaixaDaPagina): Promise<RespostaDaPagina> =>
    new Promise((resolve) => {
      const indice = pedidos.length;
      const fim = Math.min(faixa.ate, faixa.de + teto - 1);
      const resposta: RespostaDaPagina =
        falharNaPagina === indice
          ? { data: null, error: { message: "falha simulada" }, count: null }
          : {
              data: linhas.slice(faixa.de, fim + 1),
              error: null,
              count: faixa.comContagem ? total : null,
            };
      pedidos.push({ ...faixa, resolver: () => resolve(resposta) });
      if (indice === 0) resolve(resposta);
    });
  const resolverTudo = () => pedidos.slice(1).forEach((p) => p.resolver());
  return { pedir, pedidos, resolverTudo };
}

async function ler(total: number, teto?: number, falharNaPagina?: number) {
  const banco = bancoFalso(total, teto, falharNaPagina);
  const promessa = lerTodasAsPaginas(banco.pedir);
  /* Dá às páginas restantes a chance de serem pedidas antes de qualquer uma responder. */
  await new Promise((r) => setTimeout(r, 0));
  const pedidosAntesDeResolver = banco.pedidos.length;
  banco.resolverTudo();
  return { lida: await promessa, banco, pedidosAntesDeResolver };
}

describe("`DP-5` · o leitor busca em páginas até acabar", () => {
  it.each([0, 1, 999, 1000])("%i linhas: uma página só", async (total) => {
    const { lida, banco } = await ler(total);
    expect(lida.error).toBeNull();
    expect(lida.data).toHaveLength(total);
    expect(banco.pedidos).toHaveLength(1);
  });

  it("1.001 linhas: a segunda página começa na linha 1.000", async () => {
    const { lida, banco } = await ler(1001);
    expect(lida.data).toHaveLength(1001);
    expect(banco.pedidos.map((p) => [p.de, p.ate])).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("2.500 linhas: três páginas, a 2ª e a 3ª pedidas na MESMA rodada", async () => {
    const { lida, banco, pedidosAntesDeResolver } = await ler(2500);
    expect(lida.data).toHaveLength(2500);
    expect(banco.pedidos).toHaveLength(3);
    /* As duas restantes já tinham sido pedidas quando nenhuma delas ainda tinha respondido. */
    expect(pedidosAntesDeResolver).toBe(3);
  });

  it("⚠️ servidor que corta em 500 com 1.200 linhas: as 1.200 chegam, nenhuma pulada", async () => {
    const { lida, banco } = await ler(1200, 500);
    expect(lida.data).toHaveLength(1200);
    expect((lida.data as { n: number }[]).map((l) => l.n)).toEqual(
      Array.from({ length: 1200 }, (_, i) => i),
    );
    /* A página seguinte tem o tamanho que o servidor devolveu, não o que se pediu. */
    expect(banco.pedidos.map((p) => p.de)).toEqual([0, 500, 1000]);
  });

  it("a contagem só é pedida na primeira página", async () => {
    const { banco } = await ler(2500);
    expect(banco.pedidos.map((p) => p.comContagem)).toEqual([true, false, false]);
  });

  it("as linhas chegam na ordem das páginas", async () => {
    const { lida } = await ler(2100);
    const ns = (lida.data as { n: number }[]).map((l) => l.n);
    expect(ns).toEqual([...ns].sort((a, b) => a - b));
  });

  /*
   * ⚠️ **ERRO DEVOLVE `data: null`, NUNCA PARTE DA LISTA** — e não lança: a leitura do DSA degrada
   * para vazio com aviso (`RN-DEG-01`), e uma exceção aqui derrubaria a tela que hoje degrada.
   * Parte da lista é o pior dos três resultados: parece completa.
   */
  it.each([0, 1, 2])("erro na página %i: `data` nulo e o erro, sem lançar", async (pagina) => {
    const { lida } = await ler(2500, undefined, pagina);
    expect(lida.data).toBeNull();
    expect(lida.error?.message).toBe("falha simulada");
  });

  it("sem contagem na resposta, devolve a primeira página como antes da paginação", async () => {
    const lida = await lerTodasAsPaginas(async () => ({
      data: [{ n: 1 }],
      error: null,
      count: null,
    }));
    expect(lida.data).toEqual([{ n: 1 }]);
  });

  it("`contagemNaPrimeira` pede `exact` só na primeira página", () => {
    expect(contagemNaPrimeira({ de: 0, ate: 999, comContagem: true })).toEqual({ count: "exact" });
    expect(contagemNaPrimeira({ de: 1000, ate: 1999, comContagem: false })).toBeUndefined();
  });

  it("⚠️ o tamanho da página é o `max_rows` do stack local", () => {
    const config = readFileSync(join(process.cwd(), "supabase", "config.toml"), "utf8");
    const maxRows = Number(/^max_rows\s*=\s*(\d+)/m.exec(config)?.[1]);
    expect(maxRows).toBe(TAMANHO_DA_PAGINA);
  });
});
