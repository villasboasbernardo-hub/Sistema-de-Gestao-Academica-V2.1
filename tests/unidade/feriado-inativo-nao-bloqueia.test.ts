/**
 * Regra 4 · `RN-EVT-02` — **o feriado inativado não bloqueia dia nenhum**.
 *
 * > *"Exclusão é lógica (`status = 'inativo'`)."* — regra 4 do contrato do projeto
 *
 * ⚠️ **MEDIDO EM 06/10/2026, na carga das planilhas de controle:** seis dias estavam no calendário
 * global «por curso» (a licença de um curso lançada como feriado de todos). Inativados no banco
 * local, **continuaram bloqueando o dia na grade e no papel do DSA** — a leitura do calendário
 * pedia os feriados da semana sem olhar o `status`. A ficha da turma e o `/inicio` já filtravam; o
 * DSA e o Estudo Individual em um clique, não.
 *
 * ⚠️ **É VARREDURA, E NÃO UM CASO, porque o defeito é de quem escreve a próxima leitura:** exclusão
 * lógica só funciona se **toda** consulta a respeitar, e uma leitura nova de `feriados` sem o filtro
 * devolve o que foi excluído **sem erro nenhum** — a tela mostra um dia parado que ninguém consegue
 * desfazer. Ela lê **código sem comentário** (regra 9.1.1) e tem **controle positivo**: se não achar
 * as leituras que existem, está cega, e reprova.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZES = ["app", "lib"];

function arquivosDeCodigo(pasta: string): string[] {
  const achados: string[] = [];
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) achados.push(...arquivosDeCodigo(caminho));
    else if (/\.(ts|tsx)$/.test(nome) && !caminho.includes("tipos")) achados.push(caminho);
  }
  return achados;
}

/** Tira comentário de bloco e de linha — uso mencionado não é uso. */
function semComentario(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Cada leitura de `feriados`: do `.from("feriados")` até a próxima consulta. */
function leiturasDeFeriados(): { arquivo: string; consulta: string }[] {
  const leituras: { arquivo: string; consulta: string }[] = [];
  for (const raiz of RAIZES) {
    for (const arquivo of arquivosDeCodigo(raiz)) {
      const codigo = semComentario(readFileSync(arquivo, "utf-8"));
      let inicio = codigo.indexOf('.from("feriados")');
      while (inicio !== -1) {
        const resto = codigo.slice(inicio + 1);
        const fim = resto.search(/\.from\(|\n\s*\]\)|;\s*\n/);
        leituras.push({
          arquivo,
          consulta: fim === -1 ? resto.slice(0, 400) : resto.slice(0, fim),
        });
        inicio = codigo.indexOf('.from("feriados")', inicio + 1);
      }
    }
  }
  return leituras;
}

describe("regra 4 · toda leitura de `feriados` filtra o que está ativo", () => {
  const leituras = leiturasDeFeriados();

  it("controle positivo: a varredura enxerga as leituras que existem", () => {
    expect(leituras.length).toBeGreaterThanOrEqual(4);
    expect(leituras.some((l) => l.arquivo.replaceAll("\\", "/").includes("dsa/leitura.ts"))).toBe(
      true,
    );
  });

  it("⚠️ nenhuma leitura devolve feriado inativo", () => {
    const semFiltro = leituras
      .filter((l) => !/\.eq\(\s*"status"\s*,\s*"ativo"\s*\)/.test(l.consulta))
      .map((l) => l.arquivo.replaceAll("\\", "/"));
    expect(semFiltro, 'leitura de `feriados` sem `.eq("status", "ativo")`').toEqual([]);
  });
});
