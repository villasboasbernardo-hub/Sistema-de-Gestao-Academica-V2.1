/**
 * Os filtros de `/atividades` — **folha de cliente** (spec 014, PR 2, `FR-063`).
 *
 * ⚠️ **TODOS VÃO PARA A URL, por `useParametro`** (deep-link de graça). O contrato de `/atividades`
 *    declara os cinco, e parâmetro fora do contrato não compila.
 * ⚠️ **AS ESCOLHAS VÃO PELO `FiltroAvancado`**, o componente canônico (gotcha 12), e o botão de limpar é
 *    o único do sistema. O padrão de todos é vazio, então comparar com `""` é correto aqui.
 */
"use client";

import { BotaoLimparFiltros } from "@/components/ciaara/botao-limpar-filtros";
import {
  FiltroAvancado,
  type CampoDeFiltro,
  type EstadoDeFiltro,
} from "@/components/ciaara/filtro-avancado";
import { CATEGORIAS_DE_ATIVIDADE } from "@/lib/navegacao/contrato";
import { filtrosForaDoPadrao } from "@/lib/navegacao/filtros-fora-do-padrao";
import { useParametro } from "@/lib/navegacao/usar-parametro";

import { ROTULO_DA_CATEGORIA } from "./consulta";

const ROTA = "/atividades" as const;

export function FiltrosDeAtividades({ turmas }: { readonly turmas: readonly string[] }) {
  const [turma, definirTurma] = useParametro(ROTA, "turma");
  const [categoria, definirCategoria] = useParametro(ROTA, "categoria");
  const [tipo, definirTipo] = useParametro(ROTA, "tipo");
  const [de, definirDe] = useParametro(ROTA, "de");
  const [ate, definirAte] = useParametro(ROTA, "ate");

  const campos: readonly CampoDeFiltro[] = [
    { chave: "tipo", rotulo: "Tipo", tipo: "texto" },
    {
      chave: "categoria",
      rotulo: "Categoria",
      tipo: "escolha",
      opcoes: CATEGORIAS_DE_ATIVIDADE.map((c) => ({
        valor: c,
        rotulo: ROTULO_DA_CATEGORIA[c] ?? c,
      })),
    },
    {
      chave: "turma",
      rotulo: "Turma",
      tipo: "escolha",
      opcoes: turmas.map((t) => ({ valor: t, rotulo: t })),
    },
    /* Spec 016, FR-005.2: a data se escolhe no calendário; a URL continua em ISO (FR-005.3). */
    { chave: "de", rotulo: "De", tipo: "data" },
    { chave: "ate", rotulo: "Até", tipo: "data" },
  ];

  const estado: EstadoDeFiltro = {
    tipo: tipo === "" ? [] : [tipo],
    categoria: categoria === "" ? [] : [categoria],
    turma: turma === "" ? [] : [turma],
    de: de === "" ? [] : [de],
    ate: ate === "" ? [] : [ate],
  };

  const aoMudar = (proximo: EstadoDeFiltro) => {
    const escolha = (chave: string) => proximo[chave]?.[0] ?? "";
    if (escolha("tipo") !== tipo) void definirTipo(escolha("tipo"));
    if (escolha("categoria") !== categoria) void definirCategoria(escolha("categoria") || null);
    if (escolha("turma") !== turma) void definirTurma(escolha("turma") || null);
    if (escolha("de") !== de) void definirDe(escolha("de") || null);
    if (escolha("ate") !== ate) void definirAte(escolha("ate") || null);
  };

  // ⚠️ A régua é o padrão do contrato (spec 016, item 1.4): o número do botão e o "Limpar filtros".
  const ativos = filtrosForaDoPadrao(ROTA, { tipo, categoria, turma, de, ate });

  const limpar = () => {
    void definirTipo("");
    void definirCategoria(null);
    void definirTurma(null);
    void definirDe(null);
    void definirAte(null);
  };

  return (
    <div className="flex flex-col gap-2" data-slot="filtros-de-atividades">
      <FiltroAvancado campos={campos} estado={estado} aoMudar={aoMudar} ativos={ativos} />
      <BotaoLimparFiltros haFiltroAtivo={ativos > 0} aoLimpar={limpar} />
    </div>
  );
}
