/**
 * Ler a planilha de contingência avaliada pela árvore — o que um programa de planilha mostraria.
 *
 * ⚠️ **A IMPRESSÃO É AVALIADA COM O SELETOR POSTO EM CADA SEMANA**: as outras abas não dependem dele,
 * e por isso vão como valores conhecidos — recalculá-las a cada semana custaria o tempo da suíte.
 */
import { ABA } from "@/lib/dominio/dsa/planilha/layout";
import {
  conteudoDoDia,
  DIA,
  faixaDoDia,
  type GeometriaDaImpressao,
} from "@/lib/dominio/dsa/planilha/impressao";
import { avaliador, calcularCaches, chaveDaCelula, type Pasta } from "@/lib/planilha/pasta";
import type { Valor } from "@/lib/planilha/formula";

export type ImpressaoLida = {
  readonly valor: (linha: number, coluna: number) => Valor;
  readonly texto: (linha: number, coluna: number) => string;
  /** O texto da célula do TA `t` do dia `d`. */
  readonly celula: (d: number, t: number) => string;
  /** O código que a formatação condicional lê nessa célula. */
  readonly espelho: (d: number, t: number) => string;
  readonly regua: (t: number) => string;
  readonly separador: (t: number) => string;
  readonly cabecalhoDoDia: (d: number) => string;
  readonly slot: (d: number) => number;
};

export function precalcular(pasta: Pasta): Map<string, Valor> {
  const caches = calcularCaches(pasta);
  const conhecidos = new Map<string, Valor>();
  for (const [chave, valor] of caches) {
    if (!chave.startsWith(`${ABA.impressao}!`)) conhecidos.set(chave, valor);
  }
  return conhecidos;
}

export function lerImpressao(
  pasta: Pasta,
  g: GeometriaDaImpressao,
  rotulo: string,
  conhecidos: ReadonlyMap<string, Valor>,
): ImpressaoLida {
  const { valorDe } = avaliador(
    pasta,
    new Map([[chaveDaCelula(ABA.impressao, g.linhaDoSeletor, g.colunaDoSeletor), rotulo]]),
    conhecidos,
  );
  const valor = (linha: number, coluna: number) => valorDe(ABA.impressao, linha, coluna);
  const texto = (linha: number, coluna: number) => {
    const v = valor(linha, coluna);
    return v === null ? "" : typeof v === "object" ? `#ERRO ${v.erro}` : String(v);
  };
  return {
    valor,
    texto,
    celula: (d, t) => texto(g.linhaDoTa(t), conteudoDoDia(d)),
    espelho: (d, t) => texto(g.linhaDoTa(t), conteudoDoDia(d) + g.espelho),
    regua: (t) => texto(g.linhaDoTa(t), 1),
    separador: (t) => texto(g.linhaDoSeparador(t), 1),
    cabecalhoDoDia: (d) => texto(g.linhaDoCabecalhoDosDias, conteudoDoDia(d)),
    slot: (d) => Number(valor(DIA.slot, g.apoioDoDia(d))),
  };
}

export { faixaDoDia, conteudoDoDia };
