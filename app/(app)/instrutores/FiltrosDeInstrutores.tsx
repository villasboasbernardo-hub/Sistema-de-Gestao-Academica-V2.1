/**
 * Os filtros da listagem de instrutores — **folha de cliente** (`FR-025`, `FR-028` da spec 006).
 *
 * ⚠️ O ESTADO MORA NA URL, E ESTA FOLHA SÓ TRADUZ. `FiltroAvancado` recebe e devolve estado por
 * propriedade; cada campo é um parâmetro do contrato de `/instrutores`, e o descritor decide
 * histórico, frequência e aviso ao servidor. Nenhuma política está escrita aqui.
 *
 * ⚠️ QUEM FILTRA É A CONSULTA DO SERVIDOR, em E lógico (`montarConsultaDeInstrutores`). Com
 * `avisaServidor` ligado, mudar um filtro refaz a leitura: o segundo filtro opera sobre o resultado
 * do primeiro porque os dois entram no mesmo `where`.
 *
 * ⚠️ NENHUM FILTRO POR IDENTIFICAÇÃO CIVIL. CPF, RG, telefone e endereço não são critério de busca
 * nesta tela, e a leitura deles é recortada por coluna (`FR-028` da spec 004).
 *
 * ⚠️ OS SEIS FILTROS DA EMENDA DE 15/09/2026 (`FR-025`, decisão de Bernardo Villas Boas): posto, em
 * antiguidade; círculo hierárquico; curso, pela sigla; classificação do curso, com os cinco nomes do
 * glossário; habilitado e selecionado, que são conjuntos independentes. E capacitação ganhou "Nenhuma",
 * que casa com o campo vazio.
 *
 * ⚠️ VOLTAR AO PADRÃO É `null` PARA ESCOLHA, E TEXTO VAZIO PARA A BUSCA — a distinção medida na
 * fatia (c) do Épico 4 e documentada em `app/estilo/amostras.tsx`.
 */
"use client";

import { BotaoLimparFiltros } from "@/components/ciaara/botao-limpar-filtros";
import {
  FiltroAvancado,
  type CampoDeFiltro,
  type EstadoDeFiltro,
} from "@/components/ciaara/filtro-avancado";
import { CLASSIFICACOES_DE_CURSO_NA_BARRA, ROTULO_DO_REGIME } from "@/lib/constantes/instrutor";
import { ROTULO_DO_CIRCULO } from "@/lib/dominio/circulo-hierarquico";
import { CIRCULOS_HIERARQUICOS, CLASSIFICACOES, REGIMES_DOCENTES } from "@/lib/navegacao/contrato";

import { CAPACITACAO_NENHUMA } from "./consulta";
import { useParametro } from "@/lib/navegacao/usar-parametro";

import type { OpcoesDosFiltros } from "./opcoes";

const SIM_NAO = [
  { valor: "sim", rotulo: "Sim" },
  { valor: "nao", rotulo: "Não" },
];

const ROTA = "/instrutores";

/** As opções de um filtro de texto, com o valor da URL incluído mesmo que o cadastro não o tenha. */
function comEscolhido(valores: readonly string[], escolhido: string) {
  const lista =
    escolhido !== "" && !valores.includes(escolhido) ? [...valores, escolhido] : valores;
  return lista.map((v) => ({ valor: v, rotulo: v }));
}

/**
 * A mesma garantia da função acima, para opções que já trazem rótulo próprio: o valor que veio da
 * URL continua escolhível mesmo que não esteja na lista — senão o link compartilhado se apaga
 * sozinho ao abrir, que é o defeito nº 4 da fatia (c) do Épico 4.
 */
function comEscolhidoRotulado(
  opcoes: readonly { readonly valor: string; readonly rotulo: string }[],
  escolhido: string,
) {
  return escolhido !== "" && !opcoes.some((o) => o.valor === escolhido)
    ? [...opcoes, { valor: escolhido, rotulo: escolhido }]
    : opcoes;
}

export function FiltrosDeInstrutores({ opcoes }: { readonly opcoes: OpcoesDosFiltros }) {
  const [busca, definirBusca] = useParametro(ROTA, "busca");
  const [om, definirOm] = useParametro(ROTA, "om");
  const [categoria, definirCategoria] = useParametro(ROTA, "categoria");
  const [capacitacao, definirCapacitacao] = useParametro(ROTA, "capacitacao");
  const [regime, definirRegime] = useParametro(ROTA, "regime");
  const [escolaridade, definirEscolaridade] = useParametro(ROTA, "escolaridade");
  const [situacao, definirSituacao] = useParametro(ROTA, "situacao");
  const [posto, definirPosto] = useParametro(ROTA, "posto");
  const [circulo, definirCirculo] = useParametro(ROTA, "circulo");
  const [curso, definirCurso] = useParametro(ROTA, "curso");
  const [classificacao, definirClassificacao] = useParametro(ROTA, "classificacao");
  const [habilitado, definirHabilitado] = useParametro(ROTA, "habilitado");
  const [selecionado, definirSelecionado] = useParametro(ROTA, "selecionado");

  const campos: readonly CampoDeFiltro[] = [
    { chave: "busca", rotulo: "Buscar por nome", tipo: "texto" },
    { chave: "om", rotulo: "OM", tipo: "escolha", opcoes: comEscolhido(opcoes.om, om) },
    {
      chave: "categoria",
      rotulo: "Categoria",
      tipo: "escolha",
      opcoes: comEscolhido(opcoes.categoria, categoria),
    },
    {
      chave: "capacitacao",
      rotulo: "Capacitação didática",
      tipo: "escolha",
      opcoes: [
        { valor: CAPACITACAO_NENHUMA, rotulo: "Nenhuma" },
        ...comEscolhido(opcoes.capacitacao, capacitacao === CAPACITACAO_NENHUMA ? "" : capacitacao),
      ],
    },
    {
      chave: "regime",
      rotulo: "Regime de trabalho",
      tipo: "escolha",
      opcoes: REGIMES_DOCENTES.map((r) => ({ valor: r, rotulo: ROTULO_DO_REGIME[r] })),
    },
    {
      chave: "escolaridade",
      rotulo: "Escolaridade",
      tipo: "escolha",
      opcoes: comEscolhido(opcoes.escolaridade, escolaridade),
    },
    {
      chave: "posto",
      rotulo: "Posto/graduação",
      tipo: "escolha",
      opcoes: comEscolhido(opcoes.posto, posto),
    },
    {
      chave: "circulo",
      rotulo: "Círculo hierárquico",
      tipo: "escolha",
      opcoes: CIRCULOS_HIERARQUICOS.map((c) => ({ valor: c, rotulo: ROTULO_DO_CIRCULO[c] })),
    },
    {
      chave: "curso",
      rotulo: "Curso",
      tipo: "escolha",
      opcoes: comEscolhidoRotulado(opcoes.curso, curso),
    },
    {
      chave: "classificacao",
      rotulo: "Classificação do curso",
      tipo: "escolha",
      opcoes: CLASSIFICACOES_DE_CURSO_NA_BARRA.map((c) => ({ valor: c.valor, rotulo: c.rotulo })),
    },
    { chave: "habilitado", rotulo: "Habilitado", tipo: "escolha", opcoes: SIM_NAO },
    { chave: "selecionado", rotulo: "Selecionado", tipo: "escolha", opcoes: SIM_NAO },
    {
      chave: "situacao",
      rotulo: "Situação",
      tipo: "escolha",
      opcoes: [
        { valor: "ativo", rotulo: "Ativos" },
        { valor: "inativo", rotulo: "Inativos" },
      ],
    },
  ];

  const estado: EstadoDeFiltro = {
    busca: busca === "" ? [] : [busca],
    om: om === "" ? [] : [om],
    categoria: categoria === "" ? [] : [categoria],
    capacitacao: capacitacao === "" ? [] : [capacitacao],
    regime: regime === "" ? [] : [regime],
    escolaridade: escolaridade === "" ? [] : [escolaridade],
    posto: posto === "" ? [] : [posto],
    circulo: circulo === "" ? [] : [circulo],
    curso: curso === "" ? [] : [curso],
    classificacao: classificacao === "" ? [] : [classificacao],
    habilitado: habilitado === "" ? [] : [habilitado],
    selecionado: selecionado === "" ? [] : [selecionado],
    situacao: [situacao],
  };

  const aoMudar = (proximo: EstadoDeFiltro) => {
    const escolha = (chave: string) => proximo[chave]?.[0] ?? null;
    // ⚠️ Só escreve o parâmetro que mudou: reescrever os sete a cada tecla da busca faria seis
    // escritas inúteis por letra, cada uma com o seu aviso ao servidor.
    if ((proximo.busca?.[0] ?? "") !== busca) void definirBusca(proximo.busca?.[0] ?? "");
    if (escolha("om") !== (om || null)) void definirOm(escolha("om"));
    if (escolha("categoria") !== (categoria || null)) void definirCategoria(escolha("categoria"));
    if (escolha("capacitacao") !== (capacitacao || null)) {
      void definirCapacitacao(escolha("capacitacao"));
    }
    if (escolha("regime") !== (regime || null)) {
      void definirRegime(escolha("regime") as (typeof REGIMES_DOCENTES)[number] | null);
    }
    if (escolha("escolaridade") !== (escolaridade || null)) {
      void definirEscolaridade(escolha("escolaridade"));
    }
    if (escolha("posto") !== (posto || null)) void definirPosto(escolha("posto"));
    if (escolha("circulo") !== (circulo || null)) {
      void definirCirculo(escolha("circulo") as (typeof CIRCULOS_HIERARQUICOS)[number] | null);
    }
    if (escolha("curso") !== (curso || null)) void definirCurso(escolha("curso"));
    if (escolha("classificacao") !== (classificacao || null)) {
      void definirClassificacao(escolha("classificacao") as (typeof CLASSIFICACOES)[number] | null);
    }
    if (escolha("habilitado") !== (habilitado || null)) {
      void definirHabilitado(escolha("habilitado") as "sim" | "nao" | null);
    }
    if (escolha("selecionado") !== (selecionado || null)) {
      void definirSelecionado(escolha("selecionado") as "sim" | "nao" | null);
    }
    if (escolha("situacao") !== situacao) {
      void definirSituacao(escolha("situacao") as "ativo" | "inativo" | null);
    }
  };

  const algumAtivo =
    [
      busca,
      om,
      categoria,
      capacitacao,
      regime,
      escolaridade,
      posto,
      circulo,
      curso,
      classificacao,
      habilitado,
      selecionado,
    ].some((v) => v !== "") || situacao !== "ativo";

  const limpar = () => {
    void definirBusca("");
    void definirOm(null);
    void definirCategoria(null);
    void definirCapacitacao(null);
    void definirRegime(null);
    void definirEscolaridade(null);
    void definirPosto(null);
    void definirCirculo(null);
    void definirCurso(null);
    void definirClassificacao(null);
    void definirHabilitado(null);
    void definirSelecionado(null);
    void definirSituacao(null);
  };

  return (
    <div className="flex flex-col gap-2" data-slot="filtros-de-instrutores">
      <FiltroAvancado campos={campos} estado={estado} aoMudar={aoMudar} />
      <BotaoLimparFiltros haFiltroAtivo={algumAtivo} aoLimpar={limpar} />
    </div>
  );
}
