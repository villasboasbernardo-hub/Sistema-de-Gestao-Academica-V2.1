/**
 * O vocabulário visual como dado — a lista fechada que as verificações percorrem.
 *
 * ⚠️ A AUDITORIA LÊ ESTA LISTA, NÃO O ARQUIVO DE ESTILO. Se lesse o estilo, um par novo entraria
 * sem ser auditado e ninguém saberia. A contrapartida é que os dois podem divergir — e é por isso
 * que `vocabulario.test.ts` prova que não divergem, nos dois sentidos.
 *
 * ⚠️ TOKEN NOVO ENTRA EM TRÊS LUGARES, ou em nenhum: `app/globals.css`, esta lista, e a amostra de
 * `app/estilo/page.tsx`. É o preço declarado pela regra 4 de `contracts/vocabulario-de-tokens.md`,
 * e é o que impede token nascido morto.
 *
 * Fonte: `specs/005-design-system-tokens-e-tema/contracts/vocabulario-de-tokens.md`.
 */

/** Os nove status do domínio. O nome é o do DOMÍNIO, nunca o da cor (`FR-003`). */
export const STATUS = [
  "planejado",
  "executado",
  "adiantado",
  "atrasado",
  "conflito",
  "conformidade",
  "nao-letivo",
  "reserva",
  "inativo",
] as const;

/** Papéis de superfície e texto. Todos existem nos dois temas — é a invariante I-1. */
export const PAPEIS_BASE = [
  "fundo",
  "superficie",
  "superficie-2",
  "texto",
  "texto-suave",
  "texto-tenue",
  "borda",
  "borda-forte",
  "marca",
  "marca-contraste",
  "marca-suave",
  "foco",
] as const;

/** Séries de gráfico. Consumidas a partir da fatia (b); declaradas aqui porque são papel. */
export const SERIES = Array.from({ length: 8 }, (_, i) => `serie-${i + 1}`);

/** Todo papel que `:root` e `.dark` MUST declarar. */
export const PAPEIS: readonly string[] = [
  ...PAPEIS_BASE,
  ...STATUS.flatMap((s) => [`${s}-fundo`, `${s}-tinta`, `${s}-borda`]),
  ...SERIES,
];

export type Par = {
  /** Identificador estável, para a falha nomear o par em vez de só reprovar. */
  readonly id: string;
  /** Token da frente. */
  readonly frente: string;
  /** Token do fundo. */
  readonly fundo: string;
  /** 4.5 para texto sobre fundo, 3 para limite de componente (`FR-011`). */
  readonly limite: 4.5 | 3;
  /** Para que serve, em uma linha. Aparece na vitrine ao lado do número. */
  readonly proposito: string;
};

/**
 * Os 26 pares auditados.
 *
 * ⚠️ ERAM "25" ATÉ 09/09/2026, e o número estava errado no próprio contrato que o afirmava: os
 * identificadores A-1..A-14, B-1..B-11 e C-1 sempre somaram 26. Descoberto ao transcrever a lista,
 * não ao revisá-la — que é o argumento a favor de transcrever.
 */
export const PARES: readonly Par[] = [
  {
    id: "A-1",
    frente: "texto",
    fundo: "superficie",
    limite: 4.5,
    proposito: "dado em cartão e tabela",
  },
  {
    id: "A-2",
    frente: "texto",
    fundo: "fundo",
    limite: 4.5,
    proposito: "texto direto sobre o corpo",
  },
  {
    id: "A-3",
    frente: "texto-suave",
    fundo: "superficie",
    limite: 4.5,
    proposito: "rótulo, unidade, legenda",
  },
  {
    id: "A-4",
    frente: "texto-tenue",
    fundo: "superficie",
    limite: 4.5,
    proposito: "dica e texto de espera — nunca dado",
  },
  {
    id: "A-5",
    frente: "marca-contraste",
    fundo: "marca",
    limite: 4.5,
    proposito: "texto sobre a marca",
  },
  ...STATUS.map((s, i) => ({
    id: `A-${6 + i}`,
    frente: `${s}-tinta`,
    fundo: `${s}-fundo`,
    limite: 4.5 as const,
    proposito: `texto do status ${s}`,
  })),
  { id: "B-1", frente: "borda", fundo: "superficie", limite: 3, proposito: "limite de componente" },
  {
    id: "B-2",
    frente: "borda-forte",
    fundo: "superficie",
    limite: 3,
    proposito: "limite de campo",
  },
  ...STATUS.map((s, i) => ({
    id: `B-${3 + i}`,
    frente: `${s}-borda`,
    fundo: `${s}-fundo`,
    limite: 3 as const,
    proposito: `limite do status ${s}`,
  })),
  { id: "C-1", frente: "foco", fundo: "fundo", limite: 3, proposito: "anel de foco (RNF-USA-06)" },
];

/**
 * O de-para entre as variáveis próprias dos componentes copiados e os tokens CIAARA.
 *
 * ⚠️ SEM ESTE CASAMENTO PASSAM A EXISTIR DOIS PONTOS ÚNICOS DE VERDADE — a negação do `RF-DS-01`
 * com a agravante de PARECER cumprido: todo componente fica bonito e nada acusa erro.
 *
 * ⚠️ `destructive` NÃO é `atrasado`. Vermelho é conflito, que exige ação; amarelo é aviso. Trocar
 * os dois não acusaria erro nenhum e faria um botão de desativar parecer aviso de atraso.
 *
 * Fonte: `contracts/reconciliacao-shadcn.md`.
 */
export const RECONCILIACAO: Readonly<Record<string, string>> = {
  background: "fundo",
  foreground: "texto",
  card: "superficie",
  "card-foreground": "texto",
  popover: "superficie",
  "popover-foreground": "texto",
  muted: "superficie-2",
  "muted-foreground": "texto-suave",
  primary: "marca",
  "primary-foreground": "marca-contraste",
  secondary: "superficie-2",
  "secondary-foreground": "texto",
  accent: "marca-suave",
  "accent-foreground": "texto",
  destructive: "conflito-tinta",
  border: "borda",
  input: "borda-forte",
  ring: "foco",
};
