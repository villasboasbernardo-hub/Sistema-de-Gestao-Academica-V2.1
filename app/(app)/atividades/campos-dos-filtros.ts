/**
 * Os campos dos filtros de atividades — do módulo e da aba Atividades da turma (Bloco 18, spec 033, `FR-006.2` e
 * `FR-007.1`).
 *
 * > *"Filtros (ícone, RT-4): turma, curso, classificação (AEC/TAD/TR/TA da disciplina), tipo (do catálogo), período
 * > (de/até), disciplina, vínculo (do currículo / avulsa), responsável (texto)."* — `FR-006.2` da spec 033
 *
 * ⚠️ **UM DESENHO SÓ, PARA AS DUAS TELAS**: a turma não oferece *Turma* nem *Curso* (ela já é a turma), e o resto é o
 *    mesmo — as duas folhas de cliente montam o `FiltroAvancado` daqui.
 * ⚠️ **O TIPO É ESCOLHA DO CATÁLOGO, PELO RÓTULO, COM O VALOR NA URL** (decisão 4: «Atividade Extraclasse» na tela,
 *    «Atividade Extracurricular» na chave). As opções vêm do servidor.
 * ⚠️ Sem marcador de cliente e sem dado: é só a forma dos campos.
 */
import type { CampoDeFiltro, OpcaoDeFiltro } from "@/components/ciaara/filtro-avancado";
import { rotuloDeComoConta, type ComoConta } from "@/lib/dominio/categoria-pelo-tipo";
import { ROTULO_DO_VINCULO, type Vinculo } from "@/lib/dominio/atividades/lista";
import {
  CLASSIFICACOES_DA_LISTA_DE_ATIVIDADES,
  VINCULOS_DE_ATIVIDADE,
} from "@/lib/navegacao/contrato";

export type OpcoesDosFiltrosDeAtividades = {
  /** Só no módulo: os códigos das turmas do ano, sem as arquivadas (RT-8). */
  readonly turmas?: readonly string[];
  /** Só no módulo: as siglas dos cursos do ano. */
  readonly cursos?: readonly string[];
  readonly tipos: readonly OpcaoDeFiltro[];
  readonly disciplinas: readonly OpcaoDeFiltro[];
};

export function camposDosFiltrosDeAtividades(
  opcoes: OpcoesDosFiltrosDeAtividades,
): CampoDeFiltro[] {
  const daTurma: CampoDeFiltro[] =
    opcoes.turmas === undefined
      ? []
      : [
          {
            chave: "turma",
            rotulo: "Turma",
            tipo: "escolha",
            opcoes: opcoes.turmas.map((t) => ({ valor: t, rotulo: t })),
          },
        ];
  const doCurso: CampoDeFiltro[] =
    opcoes.cursos === undefined
      ? []
      : [
          {
            chave: "curso",
            rotulo: "Curso",
            tipo: "escolha",
            opcoes: opcoes.cursos.map((c) => ({ valor: c, rotulo: c })),
          },
        ];
  return [
    ...daTurma,
    ...doCurso,
    {
      chave: "categoria",
      rotulo: "Classificação",
      tipo: "escolha",
      opcoes: CLASSIFICACOES_DA_LISTA_DE_ATIVIDADES.map((c) => ({
        valor: c,
        rotulo: rotuloDeComoConta(c as ComoConta),
      })),
    },
    { chave: "tipo", rotulo: "Tipo", tipo: "escolha", opcoes: opcoes.tipos },
    { chave: "disciplina", rotulo: "Disciplina", tipo: "escolha", opcoes: opcoes.disciplinas },
    {
      chave: "vinculo",
      rotulo: "Vínculo",
      tipo: "escolha",
      opcoes: VINCULOS_DE_ATIVIDADE.map((v) => ({
        valor: v,
        rotulo: ROTULO_DO_VINCULO[v as Vinculo],
      })),
    },
    { chave: "responsavel", rotulo: "Responsável/Palestrante", tipo: "texto" },
    /* Spec 016, FR-005.2: a data se escolhe no calendário; a URL continua em ISO (FR-005.3). */
    { chave: "de", rotulo: "De", tipo: "data" },
    { chave: "ate", rotulo: "Até", tipo: "data" },
  ];
}
