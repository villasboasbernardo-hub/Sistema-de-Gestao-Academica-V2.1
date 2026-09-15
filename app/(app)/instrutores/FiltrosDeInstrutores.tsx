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
 * ⚠️ VOLTAR AO PADRÃO É `null` PARA ESCOLHA, E TEXTO VAZIO PARA A BUSCA — a distinção medida na
 * fatia (c) do Épico 4 e documentada em `app/estilo/amostras.tsx`.
 */
"use client";

import {
  FiltroAvancado,
  type CampoDeFiltro,
  type EstadoDeFiltro,
} from "@/components/ciaara/filtro-avancado";
import { Button } from "@/components/ui/button";
import { ROTULO_DO_REGIME } from "@/lib/constantes/instrutor";
import { REGIMES_DOCENTES } from "@/lib/navegacao/contrato";
import { useParametro } from "@/lib/navegacao/usar-parametro";

import type { OpcoesDosFiltros } from "./opcoes";

const ROTA = "/instrutores";

/** As opções de um filtro de texto, com o valor da URL incluído mesmo que o cadastro não o tenha. */
function comEscolhido(valores: readonly string[], escolhido: string) {
  const lista =
    escolhido !== "" && !valores.includes(escolhido) ? [...valores, escolhido] : valores;
  return lista.map((v) => ({ valor: v, rotulo: v }));
}

export function FiltrosDeInstrutores({ opcoes }: { readonly opcoes: OpcoesDosFiltros }) {
  const [busca, definirBusca] = useParametro(ROTA, "busca");
  const [om, definirOm] = useParametro(ROTA, "om");
  const [categoria, definirCategoria] = useParametro(ROTA, "categoria");
  const [capacitacao, definirCapacitacao] = useParametro(ROTA, "capacitacao");
  const [regime, definirRegime] = useParametro(ROTA, "regime");
  const [escolaridade, definirEscolaridade] = useParametro(ROTA, "escolaridade");
  const [situacao, definirSituacao] = useParametro(ROTA, "situacao");

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
      opcoes: comEscolhido(opcoes.capacitacao, capacitacao),
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
    if (escolha("situacao") !== situacao) {
      void definirSituacao(escolha("situacao") as "ativo" | "inativo" | null);
    }
  };

  const algumAtivo =
    [busca, om, categoria, capacitacao, regime, escolaridade].some((v) => v !== "") ||
    situacao !== "ativo";

  const limpar = () => {
    void definirBusca("");
    void definirOm(null);
    void definirCategoria(null);
    void definirCapacitacao(null);
    void definirRegime(null);
    void definirEscolaridade(null);
    void definirSituacao(null);
  };

  return (
    <div className="flex flex-col gap-2" data-slot="filtros-de-instrutores">
      <FiltroAvancado campos={campos} estado={estado} aoMudar={aoMudar} />
      {algumAtivo ? (
        <div>
          <Button type="button" variant="ghost" size="sm" onClick={limpar}>
            Limpar filtros
          </Button>
        </div>
      ) : null}
    </div>
  );
}
