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
  // ⚠️ O PAR C-2 ENTROU EM 10/09/2026, com a fatia (b), e ele é a `FR-032.1`. O traço que
  // identifica um campo passou a ser `--texto-tenue` porque NENHUM dos catorze tokens de borda
  // alcança 3:1 — o melhor mede 2,23. Sem este par, a decisão viraria anotação, e anotação que
  // ninguém confere envelhece: foi exatamente o que aconteceu com as sete do documento 23 §1.3.
  //
  // ⚠️ ELE MEDE OS MESMOS DOIS TOKENS DO A-4 E NÃO É DUPLICATA. O A-4 audita `--texto-tenue` como
  // TEXTO, a 4,5:1; este o audita como BORDA INTERATIVA, a 3:1. São dois papéis do mesmo token, e
  // é o papel que escolhe o limite. Se um dia o papel de texto sair, este par continua valendo.
  {
    id: "C-2",
    frente: "texto-tenue",
    fundo: "superficie",
    limite: 3,
    proposito: "traço que identifica o campo — borda INTERATIVA (FR-032)",
  },
  // ⚠️ AS OITO SÉRIES ENTRARAM EM 10/09/2026, no saneamento normativo. Elas estavam declaradas no
  // ponto único, apareciam na vitrine e NÃO TINHAM PAR AUDITADO NENHUM — e o documento 23 §8.1
  // sempre exigiu 3:1 de ELEMENTO GRÁFICO. Não é requisito novo: é regra que a spec havia perdido.
  //
  // ⚠️ MEDIDAS CONTRA `--fundo`, e não contra `--superficie`, porque é o par MAIS APERTADO dos
  // dois e é onde o gráfico de fato se desenha. A `serie-3` no tema claro mede 3,03 — passa por
  // três centésimos, o que já diz que a rampa não tem folga aqui.
  ...SERIES.map((serie, i) => ({
    id: `D-${1 + i}`,
    frente: serie,
    fundo: "fundo",
    limite: 3 as const,
    proposito: `série ${i + 1} de gráfico — elemento gráfico`,
  })),
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
 * ⚠️ O GATILHO DISPAROU EM 10/09/2026, e a resposta não foi a que a fatia (a) esperava. O
 * "resolve em" dizia *"a fatia que construir o primeiro campo"*, e a fatia (b) o construiu. Medidos
 * os catorze tokens de borda da paleta, **nenhum** alcança 3:1 — o melhor é `--executado-borda`,
 * com 2,23 no noturno. Então o traço do campo passou a ser `--texto-tenue` (`FR-032`), auditado
 * como par **C-2**, e a cor não foi tocada, como Bernardo determinou em 09/09/2026.
 *
 * ⚠️ O QUE FICA PENDENTE MUDOU DE PERGUNTA, E POR ISSO A ENTRADA CONTINUA AQUI. A frase anterior —
 * *"chamar isto de decorativo seria mentira, `--borda-forte` é o traço que identifica um campo"* —
 * **deixou de ser verdade**: o campo não o usa mais. Hoje `--borda-forte` sobrevive só como
 * `--input` do de-para, num contorno de botão no tema noturno, que é uso estrutural. Classificá-lo
 * como isento seria a conclusão natural — e é decisão de Bernardo, não minha, porque foi decisão
 * dele que criou a categoria. Fica pendente com a pergunta certa em vez de resolvida por dedução.
 */
export const PENDENTES: readonly { id: string; par: string; medido: string; resolve: string }[] = [
  {
    id: "B-2",
    par: "borda-forte sobre superficie",
    medido: "1,62 no claro · 1,88 no noturno · limite 3:1",
    resolve:
      "Bernardo — o gatilho da fatia (a) disparou e o campo NÃO o usa mais (FR-032). Resta " +
      "classificar o uso restante, que é estrutural: isento como o B-1, ou auditado",
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

/**
 * O vocabulário de cor que os componentes copiados TRAZEM CONSIGO — a lista fechada contra a qual
 * a varredura de `components/ui/` roda.
 *
 * ⚠️ ELA EXISTE PARA QUE A INVARIANTE VALHA NA DIREÇÃO QUE PEGA DEFEITO. O `RECONCILIACAO` prova
 * que todo par declarado aponta para um papel do CIAARA; sozinho, ele não impede um primitivo novo
 * de usar uma variável que NINGUÉM declarou. Essa é a falha silenciosa de verdade: a variável não
 * resolve, a cor sai transparente ou preta, e nada acusa erro — a tela só fica um pouco errada.
 *
 * ⚠️ MEDIDO EM 10/09/2026, na fatia (b): os dez primitivos novos — campo, rótulo, silhueta, aviso,
 * seleção, painel flutuante, dica, diálogo, diálogo de confirmação e recolhível — trouxeram
 * **zero** variável além das 18 que a fatia (a) já reconciliara. A reconciliação não cresceu, e
 * isso é resultado de medição, não de sorte: o que cresceu foi a verificação.
 *
 * Fonte: o conjunto canônico de variáveis de cor do shadcn/ui, incluindo as famílias `chart-*` e
 * `sidebar-*`, que esta fatia NÃO usa e que por isso mesmo precisam estar na lista — variável não
 * usada hoje é a que entra amanhã sem ninguém notar.
 */
export const VOCABULARIO_SHADCN: readonly string[] = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
];

/**
 * Os tons de status, derivados de `STATUS` — **não redeclarados** (`FR-005`, `FR-025`).
 *
 * ⚠️ DERIVAR, E NÃO COPIAR, É O REQUISITO. Uma segunda lista de nove nomes passaria em todo teste
 * desta fatia e divergiria no dia em que um status décimo entrasse no ponto único: o emblema
 * continuaria compilando, sem o tom novo, e ninguém saberia. Derivado, o status novo QUEBRA A
 * COMPILAÇÃO de quem não o tratou — que é o comportamento desejado.
 */
export type Tom = (typeof STATUS)[number];
