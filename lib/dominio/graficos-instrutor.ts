/**
 * Os nove gráficos do cadastro de instrutores (`FR-026.2`, `FR-026.3` e `FR-026.4` da spec 006, com a
 * segunda emenda de 15/09/2026).
 *
 * > *"Passam a ser nove gráficos — três de barras (status de seleção, com habilitados e selecionados
 * > em duas cores; posto/graduação; OM) e seis de pizza (classificação, escolaridade, regime de
 * > trabalho, capacitação didática, círculo hierárquico e índice de capacitação geral)."*
 * > — `FR-026.2`, decisão de Bernardo Villas Boas, 15/09/2026
 *
 * > *"Toda lista, seletor (`<select>`) ou filtro de instrutores, em qualquer tela do sistema, deve
 * > ser ordenado por antiguidade crescente — sem exceção."* — documento 04, `RN-ANT-01`
 *
 * ⚠️ AS BARRAS DE POSTO/GRADUAÇÃO SEGUEM A ESCALA RECEBIDA, E A ORDEM ALFABÉTICA É PROIBIDA — a spec
 * 014 da v2.0 o escreve assim. A escala chega **por argumento**, de `config_listas` (`RN-ANT-02`,
 * Princípio VII); nenhum posto está escrito aqui.
 *
 * ⚠️ POSTO FORA DA ESCALA VAI PARA "Outros", NO FIM — nunca some (`FR-026.3`, Princípio V). A mesma regra
 * vale no círculo hierárquico: quem não está no mapa da spec 015 (SC, CB, MN) vai para "Outros".
 *
 * ⚠️ CAPACITAÇÃO: DUAS QUALIFICAÇÕES CONTAM NAS DUAS FATIAS, E O CAMPO VAZIO CONTA EM "Nenhuma"
 * (`FR-026.4` emendado em 15/09/2026). A soma das fatias não fecha com o total, e isso é correto; quem
 * fecha com o total é o índice de capacitação geral, com as duas fatias da spec 021 da v2.0.
 *
 * ⚠️ A ESCOLARIDADE CONTINUA EM BARRAS, e é pendência, não escolha: seis categorias no dado real contra
 * o limite de cinco da pizza no documento 23 §7 (`FR-026.2`, pendência de 15/09/2026).
 *
 * ⚠️ ESTA FUNÇÃO NÃO SABE DESENHAR. Ela devolve forma, categorias e contagens; cor, marcador e rótulo de
 * exibição são de quem desenha (`components/graficos/`). Por isso não importa componente.
 */
import { pesoAntiguidade, type EscalaDeAntiguidade } from "./antiguidade";
import { circuloDoPosto, ROTULO_DO_CIRCULO } from "./circulo-hierarquico";

export type InstrutorParaGraficos = {
  readonly id: string;
  readonly pg: string;
  readonly categoria: string;
  readonly om: string;
  readonly escolaridade: string | null;
  readonly regime: string | null;
  readonly capacitacaoDidatica: string | null;
};

export type Barra = { readonly nome: string; readonly valor: number };

export type ChaveDoGrafico =
  | "status-de-selecao"
  | "classificacao"
  | "posto-graduacao"
  | "om"
  | "escolaridade"
  | "regime"
  | "capacitacao"
  | "circulo"
  | "indice-capacitacao";

export type FormaDoGrafico = "barras" | "pizza";

export type GraficoDeInstrutores = {
  readonly chave: ChaveDoGrafico;
  readonly titulo: string;
  readonly forma: FormaDoGrafico;
  readonly barras: readonly Barra[];
};

/** O rótulo da faixa do que a escala, ou o mapa de círculos, não conhece. */
export const FAIXA_OUTROS = "Outros";

/** O rótulo de quem não tem o campo preenchido. */
export const NAO_INFORMADO = "Não informado";

/** A fatia de quem não tem capacitação didática no gráfico de capacitação (`FR-026.4` emendado). */
export const CAPACITACAO_NENHUMA = "Nenhuma";

/** As duas fatias do índice de capacitação geral, com o texto da spec 021 da v2.0. */
export const COM_CAPACITACAO = "Com Capacitação Didática";
export const SEM_CAPACITACAO = "Sem Capacitação Didática";

const vazio = (texto: string | null): boolean => texto === null || texto.trim() === "";

/** Conta por valor, do maior para o menor, com empate pelo nome e o "Não informado" no fim. */
function contarPorValor(valores: readonly (string | null)[]): Barra[] {
  const contagem = new Map<string, number>();
  let semValor = 0;
  for (const valor of valores) {
    if (vazio(valor)) {
      semValor += 1;
      continue;
    }
    const chave = (valor as string).trim();
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  const barras = [...contagem.entries()]
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, "pt-BR"));
  return semValor > 0 ? [...barras, { nome: NAO_INFORMADO, valor: semValor }] : barras;
}

/** As barras de posto/graduação, na ordem da escala; o desconhecido vai para "Outros", no fim. */
function barrasDePosto(
  instrutores: readonly InstrutorParaGraficos[],
  escala: EscalaDeAntiguidade,
): Barra[] {
  const conhecidos = new Map<string, { peso: number; valor: number }>();
  let outros = 0;
  for (const i of instrutores) {
    const peso = pesoAntiguidade(i.pg, escala);
    if (peso === null) {
      outros += 1;
      continue;
    }
    const chave = i.pg.trim();
    const atual = conhecidos.get(chave);
    conhecidos.set(chave, { peso, valor: (atual?.valor ?? 0) + 1 });
  }
  const barras = [...conhecidos.entries()]
    // ⚠️ Mesmo peso (SC e SCNS): o desempate é estável pelo nome do posto, só para não oscilar.
    .sort(([na, a], [nb, b]) => a.peso - b.peso || na.localeCompare(nb, "pt-BR"))
    .map(([nome, { valor }]) => ({ nome, valor }));
  return outros > 0 ? [...barras, { nome: FAIXA_OUTROS, valor: outros }] : barras;
}

/**
 * As qualificações de um campo de capacitação, sem repetição e sem vazio.
 *
 * ⚠️ EXPORTADA PORQUE O FILTRO DE CAPACITAÇÃO OFERECE AS MESMAS QUALIFICAÇÕES que o gráfico conta. Duas
 * leituras da vírgula, uma aqui e outra na tela, divergiriam no primeiro dado com espaço a mais.
 */
export function qualificacoesDe(capacitacao: string | null): readonly string[] {
  if (vazio(capacitacao)) return [];
  return [
    ...new Set(
      (capacitacao as string)
        .split(",")
        .map((q) => q.trim())
        .filter((q) => q !== ""),
    ),
  ];
}

/** Quem tem duas qualificações conta nas duas; campo vazio conta em "Nenhuma", no fim. */
function fatiasDeCapacitacao(instrutores: readonly InstrutorParaGraficos[]): Barra[] {
  const contagem = new Map<string, number>();
  let nenhuma = 0;
  for (const i of instrutores) {
    const qualificacoes = qualificacoesDe(i.capacitacaoDidatica);
    if (qualificacoes.length === 0) nenhuma += 1;
    for (const q of qualificacoes) contagem.set(q, (contagem.get(q) ?? 0) + 1);
  }
  const fatias = [...contagem.entries()]
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, "pt-BR"));
  return nenhuma > 0 ? [...fatias, { nome: CAPACITACAO_NENHUMA, valor: nenhuma }] : fatias;
}

/** Oficiais, Praças e, se houver, "Outros" — quem o mapa da spec 015 não põe em círculo nenhum. */
function fatiasDeCirculo(instrutores: readonly InstrutorParaGraficos[]): Barra[] {
  let oficiais = 0;
  let pracas = 0;
  let outros = 0;
  for (const i of instrutores) {
    const circulo = circuloDoPosto(i.pg);
    if (circulo === "oficiais") oficiais += 1;
    else if (circulo === "pracas") pracas += 1;
    else outros += 1;
  }
  return [
    { nome: ROTULO_DO_CIRCULO.oficiais, valor: oficiais },
    { nome: ROTULO_DO_CIRCULO.pracas, valor: pracas },
    { nome: FAIXA_OUTROS, valor: outros },
  ].filter((f) => f.valor > 0);
}

/**
 * Os nove gráficos, na ordem do `FR-026.2`, com os dois novos no fim.
 *
 * `habilitados` e `selecionados` são as contagens **já restritas ao recorte** — as mesmas da taxa de
 * seleção dos indicadores, para que cartão e gráfico nunca discordem.
 */
export function graficosDeInstrutores(
  instrutores: readonly InstrutorParaGraficos[],
  escala: EscalaDeAntiguidade,
  selecao: { readonly habilitados: number; readonly selecionados: number },
): readonly GraficoDeInstrutores[] {
  const comCapacitacao = instrutores.filter((i) => !vazio(i.capacitacaoDidatica)).length;

  return [
    {
      chave: "status-de-selecao",
      titulo: "Status de Seleção",
      forma: "barras",
      barras: [
        { nome: "Habilitados", valor: selecao.habilitados },
        { nome: "Selecionados", valor: selecao.selecionados },
      ],
    },
    {
      chave: "classificacao",
      titulo: "Classificação",
      forma: "pizza",
      barras: contarPorValor(instrutores.map((i) => i.categoria)),
    },
    {
      chave: "posto-graduacao",
      titulo: "Posto/graduação",
      forma: "barras",
      barras: barrasDePosto(instrutores, escala),
    },
    {
      chave: "om",
      titulo: "OM",
      forma: "barras",
      barras: contarPorValor(instrutores.map((i) => i.om)),
    },
    {
      chave: "escolaridade",
      titulo: "Escolaridade",
      forma: "barras",
      barras: contarPorValor(instrutores.map((i) => i.escolaridade)),
    },
    {
      chave: "regime",
      titulo: "Regime de trabalho",
      forma: "pizza",
      barras: contarPorValor(instrutores.map((i) => i.regime)),
    },
    {
      chave: "capacitacao",
      titulo: "Capacitação didática",
      forma: "pizza",
      barras: fatiasDeCapacitacao(instrutores),
    },
    {
      chave: "circulo",
      titulo: "Círculo hierárquico",
      forma: "pizza",
      barras: fatiasDeCirculo(instrutores),
    },
    {
      chave: "indice-capacitacao",
      titulo: "Índice de Capacitação Geral",
      forma: "pizza",
      barras: [
        { nome: COM_CAPACITACAO, valor: comCapacitacao },
        { nome: SEM_CAPACITACAO, valor: instrutores.length - comCapacitacao },
      ],
    },
  ];
}
