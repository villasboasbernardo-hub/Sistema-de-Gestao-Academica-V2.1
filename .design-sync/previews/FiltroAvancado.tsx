import * as React from "react";
import {
  BotaoLimparFiltros,
  FiltroAvancado,
  type CampoDeFiltro,
  type EstadoDeFiltro,
} from "ciaara-11-ds";

/**
 * O filtro é genérico: não sabe de turma, instrutor nem disciplina. Cada célula usa os campos de
 * uma tela diferente — e com chaves diferentes, porque o componente monta `id="filtro-<chave>"`.
 */

/**
 * Clica, ao montar, no elemento que casa com `seletor` — o gesto que a pessoa faria com o mouse.
 * Com `soltarFoco`, devolve o foco ao documento depois de abrir: o painel põe o foco na primeira
 * opção (o caminho de quem usa teclado), e o anel dela se confundiria com a opção marcada.
 */
function ClicaAoMontar({
  seletor,
  soltarFoco = false,
  children,
}: {
  readonly seletor: string;
  readonly soltarFoco?: boolean;
  readonly children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    ref.current?.querySelector<HTMLElement>(seletor)?.click();
    if (!soltarFoco) return;
    const espera = window.setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    }, 50);
    return () => window.clearTimeout(espera);
  }, [seletor, soltarFoco]);
  return <div ref={ref}>{children}</div>;
}

const haFiltro = (estado: EstadoDeFiltro) =>
  Object.values(estado).some((valores) => valores.some((v) => v !== ""));

/** Tela de turmas — os quatro tipos de campo: texto, escolha, escolha múltipla e intervalo. */
const CAMPOS_DE_TURMAS: readonly CampoDeFiltro[] = [
  { chave: "busca", rotulo: "Buscar pelo código", tipo: "texto" },
  {
    chave: "curso",
    rotulo: "Curso",
    tipo: "escolha",
    opcoes: [
      { valor: "CAHO", rotulo: "CAHO — Aperfeiçoamento de Hidrografia para Oficiais", contagem: 1 },
      {
        valor: "C-Ap-HN",
        rotulo: "C-Ap-HN — Aperfeiçoamento de Hidrografia e Navegação",
        contagem: 2,
      },
      { valor: "C-Ap-FR", rotulo: "C-Ap-FR — Aperfeiçoamento de Faroleiro", contagem: 2 },
      {
        valor: "C-Espc-HN",
        rotulo: "C-Espc-HN — Especialização em Hidrografia e Navegação",
        contagem: 1,
      },
      { valor: "C-Esp-ME", rotulo: "C-Esp-ME — Especial de Meteorologia", contagem: 1 },
    ],
  },
  {
    chave: "situacao",
    rotulo: "Situação",
    tipo: "escolha-multipla",
    opcoes: [
      { valor: "planejada", rotulo: "Planejada", contagem: 5 },
      { valor: "ativa", rotulo: "Ativa", contagem: 12 },
      { valor: "concluida", rotulo: "Concluída", contagem: 10 },
      { valor: "cancelada", rotulo: "Cancelada", contagem: 1 },
    ],
  },
  { chave: "inicio", rotulo: "Início previsto", tipo: "intervalo" },
];

/** Vazio: nenhum filtro aplicado, nenhuma contagem ao lado do título — e sem "Limpar filtros". */
export function Padrao() {
  const [estado, definirEstado] = React.useState<EstadoDeFiltro>({});
  return (
    <div className="flex flex-col gap-2">
      <FiltroAvancado campos={CAMPOS_DE_TURMAS} estado={estado} aoMudar={definirEstado} />
      <BotaoLimparFiltros haFiltroAtivo={haFiltro(estado)} aoLimpar={() => definirEstado({})} />
    </div>
  );
}

/** Tela de instrutores — posto em antiguidade; a contagem de cada opção já considera os outros. */
const CAMPOS_DE_INSTRUTORES: readonly CampoDeFiltro[] = [
  { chave: "nome", rotulo: "Buscar por nome", tipo: "texto" },
  {
    chave: "regime",
    rotulo: "Regime de trabalho",
    tipo: "escolha",
    opcoes: [
      { valor: "20h", rotulo: "20h", contagem: 3 },
      { valor: "40h", rotulo: "40h", contagem: 20 },
      { valor: "dedicacao_exclusiva", rotulo: "Dedicação Exclusiva", contagem: 9 },
    ],
  },
  {
    chave: "posto",
    rotulo: "Posto/graduação",
    tipo: "escolha-multipla",
    opcoes: [
      { valor: "CMG", rotulo: "CMG", contagem: 1 },
      { valor: "CF", rotulo: "CF", contagem: 3 },
      { valor: "CC", rotulo: "CC", contagem: 8 },
      { valor: "CT", rotulo: "CT", contagem: 12 },
      { valor: "1ºTen", rotulo: "1ºTen", contagem: 10 },
      { valor: "SO", rotulo: "SO", contagem: 9 },
      { valor: "1ºSG", rotulo: "1ºSG", contagem: 14 },
      { valor: "3ºSG", rotulo: "3ºSG", contagem: 16 },
    ],
  },
  { chave: "docencia", rotulo: "Início da docência (ano)", tipo: "intervalo" },
];

/** Três campos escolhidos: o número aparece ao lado do título, e "Limpar filtros" passa a existir. */
export function ComFiltrosAtivos() {
  const [estado, definirEstado] = React.useState<EstadoDeFiltro>({
    regime: ["40h"],
    posto: ["CC", "CT"],
    docencia: ["2018", "2024"],
  });
  return (
    <div className="flex flex-col gap-2">
      <FiltroAvancado campos={CAMPOS_DE_INSTRUTORES} estado={estado} aoMudar={definirEstado} />
      <BotaoLimparFiltros haFiltroAtivo={haFiltro(estado)} aoLimpar={() => definirEstado({})} />
    </div>
  );
}

/**
 * Grade de disciplinas da turma — a escolha múltipla aberta, com a contagem de cada opção. Ela vem
 * por último para o painel descer abaixo da caixa, em vez de cobrir o campo da linha de baixo.
 */
const CAMPOS_DA_GRADE: readonly CampoDeFiltro[] = [
  { chave: "disciplina", rotulo: "Buscar disciplina", tipo: "texto" },
  {
    chave: "modo",
    rotulo: "Modo de atribuição",
    tipo: "escolha",
    opcoes: [
      { valor: "dividido", rotulo: "Dividido", contagem: 25 },
      { valor: "simultaneo", rotulo: "Simultâneo", contagem: 3 },
    ],
  },
  {
    chave: "andamento",
    rotulo: "Andamento",
    tipo: "escolha-multipla",
    opcoes: [
      { valor: "em-dia", rotulo: "Em dia", contagem: 14 },
      { valor: "em-atraso", rotulo: "Em atraso", contagem: 5 },
      { valor: "planejada", rotulo: "Planejada", contagem: 3 },
      { valor: "concluida", rotulo: "Concluída", contagem: 6 },
    ],
  },
];

export function EscolhaMultiplaAberta() {
  const [estado, definirEstado] = React.useState<EstadoDeFiltro>({ andamento: ["em-atraso"] });
  return (
    <ClicaAoMontar seletor='[data-slot="popover-trigger"]' soltarFoco>
      <FiltroAvancado
        campos={CAMPOS_DA_GRADE}
        estado={estado}
        aoMudar={definirEstado}
        titulo="Filtros da grade — C-Ap-HN 2026"
      />
      {/* espaço para o painel flutuante caber dentro da célula */}
      <div aria-hidden="true" className="h-40" />
    </ClicaAoMontar>
  );
}

/** Catálogo de cursos — recolhido, o painel some e a contagem de filtros ativos fica à vista. */
const CAMPOS_DO_CATALOGO: readonly CampoDeFiltro[] = [
  {
    chave: "classificacao",
    rotulo: "Classificação",
    tipo: "escolha",
    opcoes: [
      { valor: "regular", rotulo: "Curso Regular" },
      { valor: "expedito", rotulo: "Curso Expedito" },
      { valor: "especial", rotulo: "Curso Especial" },
      { valor: "aperfeicoamento_avancado", rotulo: "Curso de Aperfeiçoamento Avançado" },
      { valor: "estagio_qualificacao", rotulo: "Estágio de Qualificação" },
    ],
  },
  {
    chave: "modalidade",
    rotulo: "Modalidade",
    tipo: "escolha",
    opcoes: [
      { valor: "presencial", rotulo: "Presencial" },
      { valor: "ead", rotulo: "EAD" },
      { valor: "semipresencial", rotulo: "Semipresencial" },
    ],
  },
  {
    chave: "oferta",
    rotulo: "Situação",
    tipo: "escolha",
    opcoes: [
      { valor: "ativo", rotulo: "Em oferta" },
      { valor: "inativo", rotulo: "Fora de oferta" },
    ],
  },
];

export function RecolhidoComContagem() {
  const [estado, definirEstado] = React.useState<EstadoDeFiltro>({
    classificacao: ["aperfeicoamento_avancado"],
    modalidade: ["ead"],
    oferta: ["ativo"],
  });
  return (
    <ClicaAoMontar seletor='[data-slot="collapsible-trigger"]'>
      <div className="flex flex-col gap-2">
        <FiltroAvancado campos={CAMPOS_DO_CATALOGO} estado={estado} aoMudar={definirEstado} />
        <BotaoLimparFiltros haFiltroAtivo={haFiltro(estado)} aoLimpar={() => definirEstado({})} />
      </div>
    </ClicaAoMontar>
  );
}
