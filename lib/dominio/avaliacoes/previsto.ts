/**
 * O previsto de avaliação de uma disciplina e a divisão **aula + avaliação = CH do currículo** (FR-031.10).
 *
 * > *"A CH de cada disciplina e de cada UE MUST ser estritamente idêntica à do currículo da DEnsM. (…) O tempo
 * > de prova e de vista está DENTRO da CH."* — D-CUR-1 (FR-031 da spec 014)
 *
 * > *"Avaliação cuja quantidade ou tempo o currículo não dá MUST ter o valor arbitrado pela Divisão. Enquanto
 * > não houver, a disciplina mostra «tempo de avaliação não definido»."* — D-CUR-2 (FR-031.4 da spec 014)
 *
 * Regras:
 * - avaliação = soma dos tempos previstos (aplicação + vista), do currículo **e** do arbitrado; aula = CH − avaliação;
 * - o ajuste **por turma** sobrepõe o tempo do item do curso, sem alterá-lo (FR-031.7);
 * - a sugestão da planilha conta, marcada *"a confirmar"* (FR-031.8); o arbitrado aparece com *"não consta do
 *   currículo — definido pela Divisão"* (FR-031.9);
 * - item sem UE fica **no nível da disciplina** e o painel avisa *"o currículo não diz de qual UE sai"* (FR-031.3);
 *   com a UE decidida pela Divisão, ele desce para a UE com a origem *"decisão CIAARA-11, dd/mm/aaaa"*;
 * - aula negativa (o arbitrado passou da CH) é **aviso**, nunca bloqueio (`RN-DEG-02`). A CH nunca muda aqui.
 *
 * ⚠️ TypeScript puro (Princípio II). A data chega em ISO e sai em `dd/mm/aaaa` pelo ponto único de formato
 * de data — aqui só se monta o texto da origem, com a mesma regra, sem `Date`.
 */

import type { NaturezaDaAvaliacao } from "./situacao";

export type OrigemDoTempo = "curriculo" | "arbitrado" | "sugestao_planilha";

export type AjusteDaTurma = {
  taAplicacao: number | null;
  taVista: number | null;
  origem: "arbitrado" | "sugestao_planilha";
  /** Sugestão da planilha ainda não confirmada: conta, marcada. */
  confirmado: boolean;
};

export type ItemDoCurriculo = {
  /** `<sigla> <numero>` — "PM 1", "TG 1" (FR-057). */
  rotulo: string;
  natureza: NaturezaDaAvaliacao;
  unidadeEnsinoId: string | null;
  origemUe?: "curriculo" | "decisao_ciaara" | null;
  /** ISO; só quando a UE foi nomeada pela Divisão. */
  ueDecididaEm?: string | null;
  taAplicacao: number | null;
  origemTaAplicacao: OrigemDoTempo | null;
  taVista: number | null;
  origemTaVista: OrigemDoTempo | null;
  ajusteDaTurma?: AjusteDaTurma | null;
};

export type UnidadeDoCurriculo = { id: string; rotulo: string; ch: number };

export type MarcaDoItem = "curriculo" | "nao_consta_do_curriculo" | "sugestao_a_confirmar";

export type ItemPrevisto = {
  rotulo: string;
  natureza: NaturezaDaAvaliacao;
  /** `null` = nível da disciplina. */
  unidadeEnsinoId: string | null;
  /** Texto da origem da UE: "currículo" ou "decisão CIAARA-11, dd/mm/aaaa". */
  origemDaUe: string | null;
  taAplicacao: number | null;
  taVista: number | null;
  /** Soma do que tem tempo; `null` quando nenhum dos dois tempos está definido. */
  tempo: number | null;
  semTempoDefinido: boolean;
  marca: MarcaDoItem;
};

export type PrevistoDaDisciplina = {
  ch: number;
  itens: ItemPrevisto[];
  taAvaliacao: number;
  taAula: number;
  porUnidade: { id: string; rotulo: string; ch: number; avaliacao: number; aula: number }[];
  /** Avaliação no nível da disciplina (sem UE), dentro da CH dela. */
  avaliacaoNaDisciplina: number;
  avisos: string[];
};

export const AVISO_SEM_TEMPO = "tempo de avaliação não definido";
export const AVISO_SEM_UE = "o currículo não diz de qual UE sai";
export const MARCA_ARBITRADO = "não consta do currículo — definido pela Divisão";
export const MARCA_SUGESTAO = "arbitrado — sugestão da planilha, a confirmar";

function dataParaLeitura(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function marcaDe(
  origens: (OrigemDoTempo | null)[],
  ajuste: AjusteDaTurma | null | undefined,
): MarcaDoItem {
  if (ajuste)
    return ajuste.origem === "sugestao_planilha" && !ajuste.confirmado
      ? "sugestao_a_confirmar"
      : "nao_consta_do_curriculo";
  if (origens.includes("sugestao_planilha")) return "sugestao_a_confirmar";
  if (origens.includes("arbitrado")) return "nao_consta_do_curriculo";
  return "curriculo";
}

export function previstoDaDisciplina(entrada: {
  ch: number;
  unidades: readonly UnidadeDoCurriculo[];
  itens: readonly ItemDoCurriculo[];
}): PrevistoDaDisciplina {
  const itens: ItemPrevisto[] = entrada.itens.map((item) => {
    const ajuste = item.ajusteDaTurma ?? null;
    const taAplicacao = ajuste?.taAplicacao ?? item.taAplicacao;
    const taVista = ajuste?.taVista ?? item.taVista;
    const semTempo = taAplicacao === null && taVista === null;
    return {
      rotulo: item.rotulo,
      natureza: item.natureza,
      unidadeEnsinoId: item.unidadeEnsinoId,
      origemDaUe:
        item.unidadeEnsinoId === null
          ? null
          : item.origemUe === "decisao_ciaara" && item.ueDecididaEm
            ? `decisão CIAARA-11, ${dataParaLeitura(item.ueDecididaEm)}`
            : "currículo",
      taAplicacao,
      taVista,
      tempo: semTempo ? null : (taAplicacao ?? 0) + (taVista ?? 0),
      // A OD não tem aplicação própria (Q-17): sem tempo, ela NÃO é "não definido".
      semTempoDefinido: semTempo && item.natureza !== "od",
      marca: marcaDe([item.origemTaAplicacao, item.origemTaVista], ajuste),
    };
  });

  const taAvaliacao = itens.reduce((s, i) => s + (i.tempo ?? 0), 0);
  const porUnidade = entrada.unidades.map((u) => {
    const avaliacao = itens
      .filter((i) => i.unidadeEnsinoId === u.id)
      .reduce((s, i) => s + (i.tempo ?? 0), 0);
    return { id: u.id, rotulo: u.rotulo, ch: u.ch, avaliacao, aula: u.ch - avaliacao };
  });
  const avaliacaoNaDisciplina = itens
    .filter((i) => i.unidadeEnsinoId === null)
    .reduce((s, i) => s + (i.tempo ?? 0), 0);

  const avisos: string[] = [];
  const semTempo = itens.filter((i) => i.semTempoDefinido).length;
  if (semTempo > 0)
    avisos.push(semTempo === 1 ? AVISO_SEM_TEMPO : `${AVISO_SEM_TEMPO} em ${semTempo} avaliações`);
  if (entrada.unidades.length > 0 && avaliacaoNaDisciplina > 0) avisos.push(AVISO_SEM_UE);
  const taAula = entrada.ch - taAvaliacao;
  if (taAula < 0)
    avisos.push(
      `a avaliação prevista (${taAvaliacao} TA) passa da CH da disciplina (${entrada.ch} TA)`,
    );

  return { ch: entrada.ch, itens, taAvaliacao, taAula, porUnidade, avaliacaoNaDisciplina, avisos };
}
