/**
 * `SC-009` — cada componente que a spec 006 nomeia existe e é exportado.
 *
 * ⚠️ ISTO É **PROXY, NÃO PROVA**, e a distinção precisa ficar escrita para não ser esquecida. A
 * prova de que os componentes nasceram genéricos é o **Épico 5 consumir os treze sem construir
 * nenhum**. Enquanto isso não acontece, "genérico" é uma intenção verificada só por quem a
 * escreveu. Este teste garante a metade barata: que o Épico 5 não vá esbarrar num nome que não
 * existe.
 *
 * ⚠️ A LISTA VEM DA TABELA DE DEPENDÊNCIAS DA SPEC 006, e é LIDA DELA — não copiada. Uma cópia
 * envelheceria no dia em que a spec 006 pedisse um componente a mais, e envelheceria em silêncio,
 * que é a forma que este projeto já viu acontecer com a pendência §11.2 do documento 23 e com as
 * sete anotações de contraste.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const SPEC_006 = resolve(process.cwd(), "specs/006-cadastro-de-instrutores/spec.md");

/** Onde cada componente do vocabulário mora. */
const ENDERECO: Readonly<Record<string, string>> = {
  AlertaConformidade: "components/ciaara/alerta-conformidade.tsx",
  BadgeStatus: "components/ciaara/badge-status.tsx",
  BadgeTeto: "components/ciaara/badge-teto.tsx",
  CampoObrigatorio: "components/ciaara/campo-obrigatorio.tsx",
  CardKpi: "components/ciaara/card-kpi.tsx",
  DialogoConfirmacao: "components/ciaara/dialogo-confirmacao.tsx",
  EstadoVazio: "components/ciaara/EstadoVazio.tsx",
  EsqueletoTabela: "components/ciaara/esqueleto-tabela.tsx",
  FiltroAvancado: "components/ciaara/filtro-avancado.tsx",
  GraficoBarras: "components/graficos/grafico-barras.tsx",
  GraficoLinha: "components/graficos/grafico-linha.tsx",
  GraficoPizza: "components/graficos/grafico-pizza.tsx",
  NomeInstrutor: "components/ciaara/nome-instrutor.tsx",
  SeletorInstrutor: "components/ciaara/seletor-instrutor.tsx",
  SeletorTurma: "components/ciaara/seletor-turma.tsx",
  TabelaDensa: "components/ciaara/tabela-densa.tsx",
};

/** Os nomes de componente que a spec 006 cita, lidos do arquivo. */
function nomeadosPelaSpec006(): string[] {
  const texto = readFileSync(SPEC_006, "utf8");
  return Object.keys(ENDERECO)
    .filter((nome) => new RegExp(`\\b${nome}\\b`).test(texto))
    .sort();
}

function exporta(arquivo: string, nome: string): boolean {
  const fonte = readFileSync(resolve(process.cwd(), arquivo), "utf8");
  return new RegExp(`export function ${nome}\\b|export \\{[^}]*\\b${nome}\\b`).test(fonte);
}

describe("`SC-009` · a spec 006 não vai esbarrar em componente inexistente", () => {
  it("a spec 006 nomeia componentes desta fatia — controle positivo", () => {
    // Sem este caso, uma spec renomeada ou um caminho errado fariam os casos abaixo passarem sobre
    // uma lista vazia, e a verificação pareceria cumprida por ausência.
    expect(
      nomeadosPelaSpec006().length,
      "a spec 006 não nomeia nenhum componente desta fatia: o caminho do arquivo mudou?",
    ).toBeGreaterThanOrEqual(5);
  });

  it.each(nomeadosPelaSpec006())("%s existe e é exportado", (nome) => {
    const arquivo = ENDERECO[nome] as string;
    expect(exporta(arquivo, nome), `${nome} não é exportado por ${arquivo}`).toBe(true);
  });
});

describe("o vocabulário inteiro está de pé, não só o que a 006 cita", () => {
  // ⚠️ A spec 006 nomeia cinco. O inventário do documento 23 §3.1 pede treze mais os três
  // gráficos, e os outros onze têm consumidor nos Épicos 6 a 13 — entregar só os cinco seria
  // entregar a fatia pela metade e descobrir isso épico a épico.
  it.each(Object.entries(ENDERECO))("%s é exportado por %s", (nome, arquivo) => {
    expect(exporta(arquivo, nome), `${nome} não é exportado por ${arquivo}`).toBe(true);
  });

  it("são dezesseis: os treze do inventário mais os três gráficos", () => {
    expect(Object.keys(ENDERECO)).toHaveLength(16);
  });
});
