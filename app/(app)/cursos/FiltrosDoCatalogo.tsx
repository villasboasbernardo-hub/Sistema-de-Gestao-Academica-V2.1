/**
 * Os filtros do catálogo — **folha de cliente** (`FR-004`, `FR-017.2`, `FR-041`).
 *
 * ⚠️ O ESTADO MORA NA URL, E ESTA FOLHA SÓ TRADUZ. Cada campo é um parâmetro do contrato de
 * `/cursos`, e o descritor decide histórico e aviso ao servidor. Nenhuma política está escrita aqui.
 *
 * ⚠️ QUEM FILTRA É A CONSULTA DO SERVIDOR, em E lógico (`montarConsultaDeCursos`). Com
 * `avisaServidor` ligado, mudar um filtro refaz a leitura — e os indicadores mudam junto com os
 * cartões, porque saem das mesmas linhas.
 *
 * ⚠️ **VOLTAR AO PADRÃO É `null`, E NÃO TEXTO VAZIO.** `null` apaga o parâmetro da URL; texto vazio o
 * escreve vazio. A distinção foi medida na fatia (c) do Épico 4 — com ela trocada, o percurso do
 * valor padrão passava sem provar nada.
 *
 * ⚠️ **SITUAÇÃO TEM PADRÃO `ativo`, E ELE SOME DA URL.** `/cursos` limpo já significa "em oferta";
 * ver o que saiu exige `?situacao=inativo`, que é link compartilhável (`FR-017.2`).
 */
"use client";

import {
  FiltroAvancado,
  type CampoDeFiltro,
  type EstadoDeFiltro,
} from "@/components/ciaara/filtro-avancado";
import { CLASSIFICACOES_DE_CURSO_NA_BARRA } from "@/lib/constantes/instrutor";
import { MODALIDADES } from "@/lib/navegacao/contrato";
import { useParametro } from "@/lib/navegacao/usar-parametro";

const ROTA = "/cursos";

/** Os rótulos de tela da modalidade — o valor do banco é `snake_case`, a tela não é. */
const ROTULO_DA_MODALIDADE: Readonly<Record<string, string>> = {
  presencial: "Presencial",
  ead: "EAD",
  semipresencial: "Semipresencial",
};

export function FiltrosDoCatalogo() {
  const [classificacao, definirClassificacao] = useParametro(ROTA, "classificacao");
  const [modalidade, definirModalidade] = useParametro(ROTA, "modalidade");
  const [situacao, definirSituacao] = useParametro(ROTA, "situacao");

  const campos: readonly CampoDeFiltro[] = [
    {
      chave: "classificacao",
      rotulo: "Classificação",
      tipo: "escolha",
      opcoes: CLASSIFICACOES_DE_CURSO_NA_BARRA.map((c) => ({ valor: c.valor, rotulo: c.rotulo })),
    },
    {
      chave: "modalidade",
      rotulo: "Modalidade",
      tipo: "escolha",
      opcoes: MODALIDADES.map((m) => ({ valor: m, rotulo: ROTULO_DA_MODALIDADE[m] ?? m })),
    },
    {
      chave: "situacao",
      rotulo: "Situação",
      tipo: "escolha",
      opcoes: [
        { valor: "ativo", rotulo: "Em oferta" },
        { valor: "inativo", rotulo: "Fora de oferta" },
      ],
    },
  ];

  const estado: EstadoDeFiltro = {
    classificacao: classificacao === "" ? [] : [String(classificacao)],
    modalidade: modalidade === "" ? [] : [String(modalidade)],
    situacao: [String(situacao)],
  };

  const aoMudar = (proximo: EstadoDeFiltro) => {
    const escolha = (chave: string) => proximo[chave]?.[0] ?? null;
    // ⚠️ Só escreve o que mudou: reescrever os três a cada clique faria dois avisos inúteis ao
    // servidor, e cada um é uma leitura do banco.
    if (escolha("classificacao") !== (classificacao || null)) {
      void definirClassificacao(escolha("classificacao"));
    }
    if (escolha("modalidade") !== (modalidade || null)) {
      void definirModalidade(escolha("modalidade"));
    }
    if (escolha("situacao") !== situacao) void definirSituacao(escolha("situacao"));
  };

  return <FiltroAvancado campos={campos} estado={estado} aoMudar={aoMudar} titulo="Filtros" />;
}
