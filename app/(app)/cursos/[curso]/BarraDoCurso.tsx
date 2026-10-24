/**
 * A barra de ações da página do curso — FR-006.1 da spec 016 (item 1.6 do plano de correções).
 *
 * > *"Editar, Desativar/Reativar e Nova turma numa barra só, no topo, do mesmo tamanho; Desativar
 * > mantém a cor de ação destrutiva."* — Q-10, Bernardo Villas Boas, 17/10/2026
 *
 * ⚠️ **ATÉ 17/10/2026 OS TRÊS ESTAVAM EM TRÊS LUGARES**: *Editar curso* no cabeçalho, *Desativar* num
 * bloco solto antes das abas e *Nova turma* dentro da aba Grade — quem abria o curso pela aba *Sobre o
 * Curso*, que passou a ser a padrão, não via *Nova turma* sem trocar de aba.
 *
 * ⚠️ **CADA BOTÃO SEGUE A PERMISSÃO DO DESTINO, e quem decide é a página** (servidor), que passa os
 * três booleanos. O banco recusa de qualquer forma; aqui só se esconde (`FR-017.8` da spec 009).
 *
 * ⚠️ **SEM AÇÃO PERMITIDA, SEM BARRA**: um grupo vazio anunciado ao leitor de tela seria ruído.
 *
 * ⚠️ **O *EXCLUIR* DO CURSO É SEMPRE DESABILITADO** (RT-2, spec 025, D-30): o curso tem o histórico do regime, que é
 *    permanente (regra 9.1), e currículo — não há curso sem registro. O ícone está lá, com a dica, para que a regra se
 *    leia na tela em vez de parecer esquecida; o caminho é *Desativar*.
 */

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { BarraDeAcoes } from "@/components/ciaara/barra-de-acoes";
import { EXCLUSAO_DO_CURSO } from "@/lib/dominio/exclusao-de-partes";
import { enderecoDaNovaTurma } from "@/lib/navegacao/endereco-de-turma";

import { AcoesDeSituacao } from "./AcoesDeSituacao";

export function BarraDoCurso({
  sigla,
  ativo,
  podeAbrirEdicao,
  podeMudarSituacao,
  podeCriarTurma,
  podeExcluir = false,
}: {
  readonly sigla: string;
  readonly ativo: boolean;
  /** `cursos.editar` **ou** `horarios.criar` — a mesma regra da página de edição. */
  readonly podeAbrirEdicao: boolean;
  /** `cursos.desativar`. */
  readonly podeMudarSituacao: boolean;
  /** `turmas.criar` — e só vale com o curso em oferta. */
  readonly podeCriarTurma: boolean;
  /** `cursos.criar` — quem veria o *Excluir*, sempre desabilitado (D-30). */
  readonly podeExcluir?: boolean;
}) {
  const novaTurma = podeCriarTurma && ativo;
  if (!podeAbrirEdicao && !podeMudarSituacao && !novaTurma && !podeExcluir) return null;

  return (
    <BarraDeAcoes rotulo="Ações do curso">
      {podeAbrirEdicao ? (
        <BotaoDeIcone
          acao="editar"
          rotulo="Editar curso"
          href={`/cursos/${encodeURIComponent(sigla)}/editar`}
          data-slot="ir-para-editar-curso"
        />
      ) : null}
      {podeMudarSituacao ? <AcoesDeSituacao sigla={sigla} ativo={ativo} /> : null}
      {podeExcluir ? (
        <BotaoDeIcone
          acao="excluir"
          rotulo={`Excluir o curso ${sigla}. ${EXCLUSAO_DO_CURSO.detalhe ?? ""}`.trim()}
          variante="destrutivo"
          indisponivel={EXCLUSAO_DO_CURSO.dica}
          data-slot="excluir-curso"
        />
      ) : null}
      {novaTurma ? (
        <BotaoDeIcone
          acao="novo"
          rotulo="Nova turma"
          variante="padrao"
          href={enderecoDaNovaTurma(sigla)}
          data-slot="nova-turma"
        />
      ) : null}
    </BarraDeAcoes>
  );
}
