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
 * Os pares, em três categorias — e a distinção entre elas é o que separa uma isenção honesta de um
 * limite afrouxado em silêncio.
 *
 * ⚠️ EMENDADO EM 09/09/2026 por decisão de Bernardo, depois da PRIMEIRA MEDIÇÃO. A versão anterior
 * cobrava 3:1 de toda borda e reprovou 22 asserções, medindo de 1,25 a 1,88. A causa era a regra,
 * não a paleta: a norma cobre o traço que IDENTIFICA um controle, não toda linha de grade. Uma
 * borda a 3:1 contra o próprio preenchimento seria um traço quase preto — numa tabela de 300
 * linhas isso piora a legibilidade em nome dela.
 *
 * ⚠️ NENHUMA COR FOI ALTERADA para esverdear a auditoria. A regra mudou; a paleta não.
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
  {
    id: "C-1",
    frente: "foco",
    fundo: "fundo",
    limite: 3,
    proposito: "anel de foco — borda INTERATIVA (RNF-USA-06)",
  },
];

/**
 * Isentos do limite de 3:1, com o motivo — e o motivo é obrigatório.
 *
 * ⚠️ ISENÇÃO SEM MOTIVO ESCRITO É A MESMA COISA QUE LIMITE AFROUXADO EM SILÊNCIO. A diferença
 * entre as duas está inteiramente aqui.
 */
export const ISENTOS: readonly { id: string; par: string; motivo: string }[] = [
  {
    id: "B-1",
    par: "borda sobre superficie",
    motivo:
      "divisória estrutural: é o traço universal da camada base, usado em linha de grade e " +
      "separador. Não identifica controle nem porta informação",
  },
  ...STATUS.map((s, i) => ({
    id: `B-${3 + i}`,
    par: `${s}-borda sobre ${s}-fundo`,
    motivo:
      "contorno decorativo de etiqueta: o significado do status vem do TEXTO, que o FR-014 exige " +
      "junto, e da tinta, auditada no par A correspondente. A borda reforça; não informa sozinha",
  })),
];

/**
 * Nem auditado nem isento — e a categoria existe de propósito.
 *
 * ⚠️ CHAMAR ISTO DE DECORATIVO SERIA MENTIRA. `--borda-forte` é exatamente o traço que identifica
 * um campo de formulário, e ele importa porque o preenchimento do campo quase não contrasta com a
 * página: `--superficie` sobre `--fundo` mede 1,20 no tema claro.
 *
 * Não é auditado porque NÃO HÁ CAMPO NESTA FATIA — formulário é das fatias (b) e (c) — e porque a
 * decisão de 09/09/2026 proíbe alterar a cor. Fica medido aqui para a fatia que construir o
 * primeiro campo encontrar em vez de redescobrir.
 */
export const PENDENTES: readonly { id: string; par: string; medido: string; resolve: string }[] = [
  {
    id: "B-2",
    par: "borda-forte sobre superficie",
    medido: "1,62 no claro · 1,88 no noturno · limite 3:1",
    resolve: "a fatia que construir o primeiro campo de formulário — (b) ou (c)",
  },
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

/**
 * Razão de contraste, conforme a WCAG 2.x.
 *
 * ⚠️ ELA VIVE AQUI, E NÃO NO TESTE, para que a VITRINE mostre exatamente o número que a auditoria
 * afere (`FR-021`). Dois cálculos separados divergiriam em silêncio, e a tela passaria a exibir
 * um contraste que ninguém verifica.
 */
/** Luminância relativa da sRGB, conforme a WCAG 2.x. */
function luminancia(hex: string): number {
  const n = hex.replace("#", "");
  const largo = n.length === 3 ? [...n].map((c) => c + c).join("") : n;
  const canais = [0, 2, 4].map((i) => parseInt(largo.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r as number) + 0.7152 * (g as number) + 0.0722 * (b as number);
}

/** Razão de contraste entre duas cores, de 1:1 a 21:1. */
export function razao(frente: string, fundo: string): number {
  const a = luminancia(frente);
  const b = luminancia(fundo);
  const [claro_, escuro_] = a > b ? [a, b] : [b, a];
  return ((claro_ as number) + 0.05) / ((escuro_ as number) + 0.05);
}
