/**
 * Os sete gráficos do cadastro de instrutores (`FR-026.2`, `FR-026.3` e `FR-026.4` da spec 006).
 *
 * > *"MUST existir sete gráficos: habilitados × selecionados, classificação (coluna `categoria`),
 * > posto/graduação, OM, escolaridade, regime de trabalho e capacitação didática. As barras do
 * > gráfico de posto/graduação MUST seguir sempre a ordem de antiguidade; o gráfico não tem posição
 * > fixa na tela."* — `FR-026.2`
 *
 * > *"Toda lista, seletor (`<select>`) ou filtro de instrutores, em qualquer tela do sistema, deve
 * > ser ordenado por antiguidade crescente — sem exceção."* — documento 04, `RN-ANT-01`
 *
 * ⚠️ AS BARRAS DE POSTO/GRADUAÇÃO SEGUEM A ESCALA RECEBIDA, E A ORDEM ALFABÉTICA É PROIBIDA — a spec
 * 014 da v2.0 o escreve assim. A escala chega **por argumento**, de `config_listas` (`RN-ANT-02`,
 * Princípio VII); nenhum posto está escrito aqui.
 *
 * ⚠️ POSTO FORA DA ESCALA VAI PARA "Outros", NO FIM — nunca some (`FR-026.3`, Princípio V). E valor
 * vazio de escolaridade ou regime vira "Não informado", também no fim, pelo mesmo motivo: 142 dos
 * 177 instrutores da base viva não têm escolaridade, e omiti-los faria o gráfico parecer completo.
 *
 * ⚠️ DUAS CAPACITAÇÕES CONTAM NAS DUAS BARRAS; CAMPO VAZIO NÃO CONTA EM NENHUMA (`FR-026.4`). A soma
 * das barras não fecha com o total, e isso é correto. As qualificações vêm separadas por vírgula,
 * como a base da v2.0 as escreve (spec 014 da v2.0, *"split por vírgula"*).
 *
 * ⚠️ ESTA FUNÇÃO NÃO SABE DESENHAR. Ela devolve categorias e contagens; forma de marcador, cor e
 * rótulo de exibição são de quem desenha (`components/graficos/`). Por isso não importa componente.
 */
import { pesoAntiguidade, type EscalaDeAntiguidade } from "./antiguidade";

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
  | "habilitados-selecionados"
  | "classificacao"
  | "posto-graduacao"
  | "om"
  | "escolaridade"
  | "regime"
  | "capacitacao";

export type GraficoDeInstrutores = {
  readonly chave: ChaveDoGrafico;
  readonly titulo: string;
  readonly barras: readonly Barra[];
};

/** O rótulo da faixa de postos que a escala não conhece. */
export const FAIXA_OUTROS = "Outros";

/** O rótulo de quem não tem o campo preenchido. */
export const NAO_INFORMADO = "Não informado";

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

/** Quem tem duas qualificações conta nas duas; campo vazio não conta em nenhuma. */
function barrasDeCapacitacao(instrutores: readonly InstrutorParaGraficos[]): Barra[] {
  const contagem = new Map<string, number>();
  for (const i of instrutores) {
    for (const q of qualificacoesDe(i.capacitacaoDidatica)) {
      contagem.set(q, (contagem.get(q) ?? 0) + 1);
    }
  }
  return [...contagem.entries()]
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, "pt-BR"));
}

/**
 * Os sete gráficos, na ordem do `FR-026.2`.
 *
 * `habilitados` e `selecionados` são as contagens **já restritas ao recorte** — as mesmas da taxa de
 * seleção dos indicadores, para que cartão e gráfico nunca discordem.
 */
export function graficosDeInstrutores(
  instrutores: readonly InstrutorParaGraficos[],
  escala: EscalaDeAntiguidade,
  selecao: { readonly habilitados: number; readonly selecionados: number },
): readonly GraficoDeInstrutores[] {
  return [
    {
      chave: "habilitados-selecionados",
      titulo: "Habilitados × selecionados",
      barras: [
        { nome: "Habilitados", valor: selecao.habilitados },
        { nome: "Selecionados", valor: selecao.selecionados },
      ],
    },
    {
      chave: "classificacao",
      titulo: "Classificação",
      barras: contarPorValor(instrutores.map((i) => i.categoria)),
    },
    {
      chave: "posto-graduacao",
      titulo: "Posto/graduação",
      barras: barrasDePosto(instrutores, escala),
    },
    { chave: "om", titulo: "OM", barras: contarPorValor(instrutores.map((i) => i.om)) },
    {
      chave: "escolaridade",
      titulo: "Escolaridade",
      barras: contarPorValor(instrutores.map((i) => i.escolaridade)),
    },
    {
      chave: "regime",
      titulo: "Regime de trabalho",
      barras: contarPorValor(instrutores.map((i) => i.regime)),
    },
    {
      chave: "capacitacao",
      titulo: "Capacitação didática",
      barras: barrasDeCapacitacao(instrutores),
    },
  ];
}
