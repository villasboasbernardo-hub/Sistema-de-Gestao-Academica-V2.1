/**
 * O detalhe da linha expandida — **só leitura** (`FR-003`, `FR-060` a `FR-063`; spec 022, Bloco 7, D-1 e D-2).
 *
 * > *"Edição e cadastro SEMPRE em diálogo (formulário curto: UE, avaliação, regime) ou página própria (formulário
 * > longo: disciplina, curso) — nunca campos abertos na página."* — Bernardo Villas Boas, 22/10/2026
 *
 * ⚠️ **A EDIÇÃO SAIU DAQUI NO BLOCO 7**: o cadastro, a situação, a exclusão, as UEs e as avaliações do currículo se
 *    editam na **página própria da disciplina**, dentro de *Editar curso* (D-2). O detalhe mostra o que a disciplina
 *    tem, e — em *Editar curso*, para quem pode — o ícone *Editar* que leva até lá.
 *
 * ⚠️ **AS UNIDADES SÓ APARECEM EM DISCIPLINA QUE TEM UNIDADE** (`FR-061`, D-B3). Ter UE é dado; a
 * ausência não é pendência, e por isso a seção **não renderiza nem avisa**.
 */
import * as React from "react";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { disciplinaTemCurriculo } from "@/lib/dominio/modelo-do-curriculo";

import type { LinhaDaGradeDeDisciplinas } from "../consulta";
import { PainelDeAvaliacoesDoCurriculo } from "./PainelDeAvaliacoesDoCurriculo";
import { PainelDeUnidades } from "./PainelDeUnidades";

export function DetalheDaDisciplina({
  linha,
  enderecoDeEdicao,
}: {
  readonly linha: LinhaDaGradeDeDisciplinas;
  /** A página própria da disciplina — só em *Editar curso*, e só para quem pode editá-la. */
  readonly enderecoDeEdicao: string | null;
}) {
  return (
    <div className="flex flex-col gap-4" data-slot="detalhe-da-disciplina">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-texto text-sm font-semibold">{linha.nomeDisciplina}</h3>
          {/* veste: o código gerado pelo sistema, ao lado do nome */}
          <span className="text-texto-tenue font-mono text-xs">{linha.codigo}</span>
        </div>
        {enderecoDeEdicao ? (
          <BotaoDeIcone
            acao="editar"
            rotulo="Editar disciplina"
            href={enderecoDeEdicao}
            data-slot="editar-disciplina"
          />
        ) : null}
      </div>

      <p className="text-texto-suave text-sm" data-slot="so-por-turma">
        Período previsto e instrutores são <strong>por turma</strong>, e ficam na ficha da turma.
      </p>

      {disciplinaTemCurriculo({
        disciplinaId: linha.disciplinaId,
        unidadesAtivas: linha.unidades.filter((u) => u.ativa).length,
      }) ? (
        <PainelDeUnidades
          disciplinaId={linha.disciplinaId}
          unidades={linha.unidades}
          avisoDaSoma={linha.avisoDaSoma}
          podeEditar={false}
          podeDesativar={false}
        />
      ) : null}

      <PainelDeAvaliacoesDoCurriculo
        disciplinaId={linha.disciplinaId}
        itens={linha.avaliacoesDoCurriculo}
        podeEditar={false}
      />
    </div>
  );
}
