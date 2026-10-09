/**
 * As cores da planilha de contingência — **o ÚNICO lugar de `lib/planilha/` com cor escrita**.
 *
 * > *"(a) — exceção nominal só para lib/planilha/cores.ts, ao lado da exceção do CSS de impressão;
 * > teste garantindo que as cores são as do app/print/dsa/documento.css e teste reprovando cor em
 * > qualquer outro arquivo de lib/planilha/."*
 * > — Bernardo Villas Boas, dúvida 1 do analyze da spec 015, 09/10/2026
 *
 * ⚠️ **POR QUE HÁ COR LITERAL AQUI:** o OOXML exige o valor (`FFRRGGBB`) dentro do arquivo — não há
 * token nem variável de CSS numa planilha. A fonte continua sendo UMA: as cores são as do papel do
 * DSA, `app/print/dsa/documento.css`, e `tests/unidade/planilha-cores.test.ts` reprova se divergirem.
 *
 * ⚠️ **O SEGUNDO TOM DE CADA TIPO NÃO É UMA SEGUNDA TABELA** — sai de `misturar`, por conta, a partir
 * das cores do papel. É ele que faz dois blocos vizinhos nunca terem o mesmo fundo (R-7).
 */

/** As cores do papel, com o nome da variável ou da regra de `documento.css` de onde vêm. */
export const CORES_DO_PAPEL = {
  /** `--dsa4-marinho` — a barra do cartão de aula. */
  marinho: "FF050F41",
  /** `--dsa4-verde` — a barra e a borda do cartão de avaliação. */
  verde: "FF009444",
  /** `--dsa4-amarelo` — a barra do cartão de atividade. */
  amarelo: "FFFAB932",
  /** `--dsa4-texto`. */
  texto: "FF1C2136",
  /** `--dsa4-suave`. */
  suave: "FF4A5170",
  /** `--dsa4-borda` — o traço das células. */
  borda: "FFC9CDDB",
  /** `--dsa4-regua-fundo` — o fundo da coluna dos tempos. */
  reguaFundo: "FFEEF0F5",
  /** `.dsa4-cartao` — o fundo do cartão de aula. */
  fundoDaAula: "FFFFFFFF",
  /** `.dsa4-cartao-avaliacao` — o fundo do cartão de avaliação. */
  fundoDaAvaliacao: "FFE6F4EC",
  /** `.dsa4-cartao-avaliacao .dsa4-cartao-titulo` — o título da avaliação. */
  tituloDaAvaliacao: "FF006B31",
  /** `.dsa4-cartao-estudo` — a borda e a barra do Estudo Individual. */
  estudo: "FF8F96B0",
} as const;

/** Mistura duas cores ARGB: `fracao` 0 devolve `a`, 1 devolve `b`. */
export function misturar(a: string, b: string, fracao: number): string {
  const canal = (cor: string, i: number) => parseInt(cor.slice(2 + i * 2, 4 + i * 2), 16);
  const hex = (n: number) => Math.round(n).toString(16).toUpperCase().padStart(2, "0");
  return `FF${[0, 1, 2].map((i) => hex(canal(a, i) + (canal(b, i) - canal(a, i)) * fracao)).join("")}`;
}

export type TipoDoCartao = "aula" | "avaliacao" | "estudo" | "atividade";

/** A barra do cartão v4, que na planilha é a faixa estreita colorida de cada dia. */
export const BARRA: Record<TipoDoCartao, string> = {
  aula: CORES_DO_PAPEL.marinho,
  avaliacao: CORES_DO_PAPEL.verde,
  estudo: CORES_DO_PAPEL.estudo,
  atividade: CORES_DO_PAPEL.amarelo,
};

/** O fundo do bloco, em dois tons que se alternam a cada bloco do dia (R-7). */
export const FUNDO: Record<TipoDoCartao, readonly [string, string]> = {
  aula: [
    CORES_DO_PAPEL.fundoDaAula,
    misturar(CORES_DO_PAPEL.fundoDaAula, CORES_DO_PAPEL.marinho, 0.08),
  ],
  avaliacao: [
    CORES_DO_PAPEL.fundoDaAvaliacao,
    misturar(CORES_DO_PAPEL.fundoDaAvaliacao, CORES_DO_PAPEL.verde, 0.18),
  ],
  estudo: [
    CORES_DO_PAPEL.fundoDaAula,
    misturar(CORES_DO_PAPEL.fundoDaAula, CORES_DO_PAPEL.estudo, 0.15),
  ],
  atividade: [
    CORES_DO_PAPEL.fundoDaAula,
    misturar(CORES_DO_PAPEL.fundoDaAula, CORES_DO_PAPEL.amarelo, 0.18),
  ],
};

/** A cor do título do cartão. */
export const TITULO: Record<TipoDoCartao, string> = {
  aula: CORES_DO_PAPEL.marinho,
  avaliacao: CORES_DO_PAPEL.tituloDaAvaliacao,
  estudo: CORES_DO_PAPEL.suave,
  atividade: CORES_DO_PAPEL.texto,
};

/** O traço das células e da moldura da grade. */
export const COR_DA_BORDA = CORES_DO_PAPEL.borda;
/** O fundo da régua dos tempos e dos cabeçalhos. */
export const COR_DA_REGUA = CORES_DO_PAPEL.reguaFundo;
/** O texto comum e o suave. */
export const COR_DO_TEXTO = CORES_DO_PAPEL.texto;
export const COR_SUAVE = CORES_DO_PAPEL.suave;
/** A faixa do cabeçalho do papel. */
export const COR_DO_CABECALHO = CORES_DO_PAPEL.marinho;
/** Branco, para o texto sobre a faixa marinho. */
export const COR_SOBRE_O_CABECALHO = CORES_DO_PAPEL.fundoDaAula;
