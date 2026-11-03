/**
 * Os filtros da aba Atividades da turma — **folha de cliente** (Bloco 18, spec 033, `FR-007.1`, D-9).
 *
 * > *"Atividades tem os mesmos filtros e estatísticas do módulo, recortados pela turma"* — `FR-007.1` da spec 033
 *
 * ⚠️ **OS MESMOS CAMPOS DO MÓDULO, MENOS TURMA E CURSO** (`camposDosFiltrosDeAtividades`): a turma já é esta.
 * ⚠️ **NA URL DA FICHA** (`/turmas/[turma]`), que declara os sete; parâmetro fora do contrato não compila.
 */
"use client";

import { BotaoLimparFiltros } from "@/components/ciaara/botao-limpar-filtros";
import { FiltroAvancado, type EstadoDeFiltro } from "@/components/ciaara/filtro-avancado";
import { ROTA_DA_FICHA_DA_TURMA } from "@/lib/navegacao/endereco-de-turma";
import { filtrosForaDoPadrao } from "@/lib/navegacao/filtros-fora-do-padrao";
import { useParametro } from "@/lib/navegacao/usar-parametro";

import {
  camposDosFiltrosDeAtividades,
  type OpcoesDosFiltrosDeAtividades,
} from "../../atividades/campos-dos-filtros";

const ROTA = ROTA_DA_FICHA_DA_TURMA;

export function FiltrosDeAtividadesDaTurma({
  tipos,
  disciplinas,
}: Pick<OpcoesDosFiltrosDeAtividades, "tipos" | "disciplinas">) {
  const [categoria, definirCategoria] = useParametro(ROTA, "categoria");
  const [tipo, definirTipo] = useParametro(ROTA, "tipo");
  const [disciplina, definirDisciplina] = useParametro(ROTA, "disciplina");
  const [vinculo, definirVinculo] = useParametro(ROTA, "vinculo");
  const [responsavel, definirResponsavel] = useParametro(ROTA, "responsavel");
  const [de, definirDe] = useParametro(ROTA, "de");
  const [ate, definirAte] = useParametro(ROTA, "ate");

  const campos = camposDosFiltrosDeAtividades({ tipos, disciplinas });
  const um = (v: string) => (v === "" ? [] : [v]);
  const estado: EstadoDeFiltro = {
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
    if (escolha("categoria") !== categoria) void definirCategoria(escolha("categoria") || null);
    if (escolha("tipo") !== tipo) void definirTipo(escolha("tipo") || null);
    if (escolha("disciplina") !== disciplina) void definirDisciplina(escolha("disciplina") || null);
    if (escolha("vinculo") !== vinculo) void definirVinculo(escolha("vinculo") || null);
    if (escolha("responsavel") !== responsavel) void definirResponsavel(escolha("responsavel"));
    if (escolha("de") !== de) void definirDe(escolha("de") || null);
    if (escolha("ate") !== ate) void definirAte(escolha("ate") || null);
  };

  const ativos = filtrosForaDoPadrao(ROTA, {
    categoria,
    tipo,
    disciplina,
    vinculo,
    responsavel,
    de,
    ate,
  });

  const limpar = () => {
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
