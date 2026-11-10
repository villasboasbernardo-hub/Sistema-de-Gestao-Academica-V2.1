/**
 * Os filtros de `/atividades` — **folha de cliente** (spec 014, PR 2, `FR-063`; Bloco 18, spec 033, `FR-006.2`).
 *
 * ⚠️ **TODOS VÃO PARA A URL, por `useParametro`** (deep-link de graça). O contrato de `/atividades` declara os nove, e
 *    parâmetro fora do contrato não compila.
 * ⚠️ **AS ESCOLHAS VÃO PELO `FiltroAvancado`**, o componente canônico (gotcha 12), e o botão de limpar é o único do
 *    sistema. O padrão de todos é vazio, então comparar com `""` é correto aqui.
 * ⚠️ **A SITUAÇÃO NÃO É DESTA ABA** (é das abas Palestras e APOINST): ela não entra no número nem no *Limpar*.
 * ⚠️ **O TIPO DEIXOU DE SER TEXTO LIVRE** (Bloco 18): é escolha do catálogo, pelo rótulo, com o VALOR na URL.
 */
"use client";

import { BotaoLimparFiltros } from "@/components/ciaara/botao-limpar-filtros";
import { FiltroAvancado, type EstadoDeFiltro } from "@/components/ciaara/filtro-avancado";
import { filtrosForaDoPadrao } from "@/lib/navegacao/filtros-fora-do-padrao";
import { useParametro } from "@/lib/navegacao/usar-parametro";

import {
  camposDosFiltrosDeAtividades,
  type OpcoesDosFiltrosDeAtividades,
} from "./campos-dos-filtros";

const ROTA = "/atividades" as const;

export function FiltrosDeAtividades({
  turmas,
  cursos,
  tipos,
  disciplinas,
}: Required<Pick<OpcoesDosFiltrosDeAtividades, "turmas" | "cursos">> &
  Pick<OpcoesDosFiltrosDeAtividades, "tipos" | "disciplinas">) {
  const [turma, definirTurma] = useParametro(ROTA, "turma");
  const [curso, definirCurso] = useParametro(ROTA, "curso");
  const [categoria, definirCategoria] = useParametro(ROTA, "categoria");
  const [tipo, definirTipo] = useParametro(ROTA, "tipo");
  const [disciplina, definirDisciplina] = useParametro(ROTA, "disciplina");
  const [vinculo, definirVinculo] = useParametro(ROTA, "vinculo");
  const [responsavel, definirResponsavel] = useParametro(ROTA, "responsavel");
  const [de, definirDe] = useParametro(ROTA, "de");
  const [ate, definirAte] = useParametro(ROTA, "ate");

  const campos = camposDosFiltrosDeAtividades({ turmas, cursos, tipos, disciplinas });
  const um = (v: string) => (v === "" ? [] : [v]);
  const estado: EstadoDeFiltro = {
    turma: um(turma),
    curso: um(curso),
    categoria: um(categoria),
    tipo: um(tipo),
    disciplina: um(disciplina),
    vinculo: um(vinculo),
    responsavel: um(responsavel),
    de: um(de),
    ate: um(ate),
  };

  const aoMudar = (proximo: EstadoDeFiltro) => {
    const escolha = (chave: string) => proximo[chave]?.[0] ?? "";
    if (escolha("turma") !== turma) void definirTurma(escolha("turma") || null);
    if (escolha("curso") !== curso) void definirCurso(escolha("curso") || null);
    if (escolha("categoria") !== categoria) void definirCategoria(escolha("categoria") || null);
    if (escolha("tipo") !== tipo) void definirTipo(escolha("tipo") || null);
    if (escolha("disciplina") !== disciplina) void definirDisciplina(escolha("disciplina") || null);
    if (escolha("vinculo") !== vinculo) void definirVinculo(escolha("vinculo") || null);
    if (escolha("responsavel") !== responsavel) void definirResponsavel(escolha("responsavel"));
    if (escolha("de") !== de) void definirDe(escolha("de") || null);
    if (escolha("ate") !== ate) void definirAte(escolha("ate") || null);
  };

  // ⚠️ A régua é o padrão do contrato (spec 016, item 1.4): o número do botão e o "Limpar filtros".
  const ativos = filtrosForaDoPadrao(ROTA, {
    turma,
    curso,
    categoria,
    tipo,
    disciplina,
    vinculo,
    responsavel,
    de,
    ate,
  });

  const limpar = () => {
    void definirTurma(null);
    void definirCurso(null);
    void definirCategoria(null);
    void definirTipo(null);
    void definirDisciplina(null);
    void definirVinculo(null);
    void definirResponsavel("");
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
