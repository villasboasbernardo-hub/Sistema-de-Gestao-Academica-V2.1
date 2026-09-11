/**
 * Os gráficos continuam legíveis quando a cor some (`FR-017`, `FR-018`, `SC-008`).
 *
 * ⚠️ A MEDIÇÃO QUE FORÇOU ESTES CASOS está reproduzida aqui embaixo, e ela é o motivo de o tipo
 * exigir forma: no tema claro a série 1 e a série 8 ficam a **0,0003** de luminância uma da outra;
 * no noturno, a 4 e a 7 a **0,0005**. Impressas em cinza, cada par vira a mesma tinta.
 *
 * ⚠️ A PALETA NÃO É TOCADA. Ela está mesclada na `main`, e a premissa da fatia é consumir sem
 * redesenhar. O que muda é a codificação: forma e rótulo, que resolvem também na tela para quem não
 * distingue cores — reespaçar luminância só resolveria no papel.
 */
import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  conferirTetoDeSeries,
  corDaSerie,
  MAXIMO_DE_SERIES,
  SIMBOLO_DA_FORMA,
  TOKENS_DE_SERIE,
  type FormaDeMarcador,
  type Serie,
} from "@/components/graficos/tipos";
import { claro, escuro } from "@/lib/design/ler-globals";
import { razao } from "@/lib/design/vocabulario";

const FORMAS = Object.keys(SIMBOLO_DA_FORMA) as FormaDeMarcador[];

const serie = (i: number): Serie => ({
  chave: `s${i}`,
  rotulo: `Série ${i}`,
  forma: FORMAS[i % FORMAS.length] as FormaDeMarcador,
  pontos: [{ nome: "a", valor: i }],
});

describe("`FR-017` · as oito séries, em ordem FIXA e vindas do ponto único", () => {
  it("a cor da n-ésima série é sempre o mesmo token", () => {
    // ⚠️ Reordenar a paleta conforme os dados faz o leitor reaprender a legenda a cada recarga — e
    // faz duas cópias impressas do mesmo relatório não conversarem.
    expect(corDaSerie(0)).toBe("var(--serie-1)");
    expect(corDaSerie(7)).toBe("var(--serie-8)");
  });

  it("a nona série reaproveita a primeira cor, em vez de inventar uma", () => {
    expect(corDaSerie(8)).toBe(corDaSerie(0));
  });

  it("nenhuma cor literal sai da função: o que sai é referência ao token", () => {
    const saidas = TOKENS_DE_SERIE.map((_, i) => corDaSerie(i));
    expect(saidas.every((s) => s.startsWith("var(--serie-"))).toBe(true);
    expect(saidas.some((s) => s.includes("#"))).toBe(false);
  });

  it("as oito séries existem nos DOIS temas do ponto único", () => {
    for (const token of TOKENS_DE_SERIE) {
      const nome = token.replace("--", "");
      expect(claro().has(nome), `${token} falta no tema claro`).toBe(true);
      expect(escuro().has(nome), `${token} falta no noturno`).toBe(true);
    }
  });
});

describe("`FR-018` · a cor NÃO pode ser o que distingue uma série — e a medição diz por quê", () => {
  /** Luminância relativa: o contraste de um token contra o branco puro aproxima-a. */
  function luminancia(valor: string): number {
    // ⚠️ Derivada da mesma função que a auditoria usa, para que as duas nunca divirjam.
    return 1.05 / razao(valor, "#ffffff") - 0.05;
  }

  it.each([
    { tema: "claro", papeis: claro(), a: "serie-1", b: "serie-8", limite: 0.001 },
    { tema: "noturno", papeis: escuro(), a: "serie-4", b: "serie-7", limite: 0.001 },
  ])(
    "no tema $tema, $a e $b ficam a menos de $limite de luminância — em cinza viram a mesma tinta",
    ({ papeis, a, b, limite }) => {
      const va = papeis.get(a);
      const vb = papeis.get(b);
      expect(va).toBeDefined();
      expect(vb).toBeDefined();
      const distancia = Math.abs(luminancia(va as string) - luminancia(vb as string));
      // ⚠️ ESTE CASO AFIRMA O PROBLEMA, e é de propósito. Ele documenta por que forma e rótulo são
      // obrigatórios. Se um dia a paleta for reespaçada, ele reprova — e reprovar aqui é o sinal
      // de que a decisão de 10/09/2026 pode ser reaberta, não de que algo quebrou.
      expect(distancia).toBeLessThan(limite);
    },
  );
});

describe("`FR-018` · forma e rótulo são obrigatórios, e distintos entre si", () => {
  it("há forma suficiente para o máximo de séries permitido", () => {
    // Seis formas para seis séries: cada série de um mesmo gráfico tem marcador próprio.
    expect(FORMAS.length).toBeGreaterThanOrEqual(MAXIMO_DE_SERIES);
  });

  it("as seis formas mapeiam para seis símbolos DIFERENTES da biblioteca", () => {
    const simbolos = Object.values(SIMBOLO_DA_FORMA);
    expect(new Set(simbolos).size).toBe(simbolos.length);
  });

  it("um gráfico no limite sai com seis marcadores distintos e seis rótulos distintos", () => {
    const series = Array.from({ length: MAXIMO_DE_SERIES }, (_, i) => serie(i));
    expect(new Set(series.map((s) => s.forma)).size).toBe(MAXIMO_DE_SERIES);
    expect(new Set(series.map((s) => s.rotulo)).size).toBe(MAXIMO_DE_SERIES);
  });
});

describe("`FR-017` · sete séries são RECUSADAS, não avisadas", () => {
  it("seis passam", () => {
    const series = Array.from({ length: 6 }, (_, i) => serie(i));
    expect(conferirTetoDeSeries(series)).toBeNull();
  });

  it("sete são recusadas, e a recusa aponta para onde ir", () => {
    // ⚠️ Um gráfico de oito séries já é uma tabela mal desenhada; deixá-lo passar com aviso é
    // deixá-lo passar. E barrar sem indicar caminho é como uma regra acaba contornada.
    const series = Array.from({ length: 7 }, (_, i) => serie(i));
    const recusa = conferirTetoDeSeries(series);
    expect(recusa?.recusado).toBe(true);
    expect(recusa?.motivo).toContain("tabela densa");
  });

  it("a recusa é valor de retorno, NÃO exceção", () => {
    // Derrubar a árvore inteira porque um gráfico recebeu séries demais viola a degradação segura:
    // o resto da tela continua correto e precisa continuar aparecendo (`RN-DEG-01`).
    const series = Array.from({ length: 12 }, (_, i) => serie(i));
    expect(() => conferirTetoDeSeries(series)).not.toThrow();
  });
});

describe("nenhum gráfico escolhe cor por conta própria (`FR-022`)", () => {
  const DIRETORIO = resolve(process.cwd(), "components/graficos");

  it("todo valor de cor nos três gráficos vem de um token", () => {
    const suspeitos: string[] = [];
    for (const arquivo of readdirSync(DIRETORIO).filter((f) => f.endsWith(".tsx"))) {
      const fonte = readFileSync(resolve(DIRETORIO, arquivo), "utf8");
      for (const achado of fonte.matchAll(/(fill|stroke)=\{?"([^"]+)"/g)) {
        const valor = achado[2] ?? "";
        if (!valor.startsWith("var(--")) suspeitos.push(`${arquivo}: ${achado[0]}`);
      }
    }
    expect(
      suspeitos,
      `cor de gráfico fora do ponto único: ${suspeitos.join("; ")}. ` +
        `Toda cor de série vem de corDaSerie(); toda cor de eixo e grade, de um papel do CIAARA.`,
    ).toEqual([]);
  });

  it("controle positivo: a varredura achou cor de verdade nos gráficos", () => {
    const arquivos = readdirSync(DIRETORIO).filter((f) => f.endsWith(".tsx"));
    const total = arquivos
      .map((f) => readFileSync(resolve(DIRETORIO, f), "utf8"))
      .join("")
      .match(/var\(--/g);
    expect(
      total?.length ?? 0,
      "a varredura não achou token nenhum: ela está quebrada",
    ).toBeGreaterThan(5);
  });
});
