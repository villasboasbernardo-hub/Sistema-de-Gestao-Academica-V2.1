/**
 * O detalhe da linha expandida — **onde os painéis desta fatia se juntam** (`FR-003`, `FR-030` a
 * `FR-063`).
 *
 * ⚠️ **O QUE DEPENDE DE TURMA SÓ APARECE COM TURMA ESCOLHIDA** (`FR-003`, `RN-DEG-01`). Período e
 * instrutores são da linha de `turma_disciplina`; no catálogo eles não existem, e mostrá-los vazios
 * afirmaria que não há — quando o certo é que **não se aplica**. A frase diz isso.
 *
 * ⚠️ **AS UNIDADES SÓ APARECEM EM DISCIPLINA QUE TEM UNIDADE** (`FR-061`, D-B3). Ter UE é dado; a
 * ausência não é pendência, e por isso a seção **não renderiza nem avisa**.
 *
 * ⚠️ **O BOTÃO SEGUE A PERMISSÃO DA AÇÃO, nunca uma regra própria** (*tela sem caminho clicável*).
 * Quem não pode criar não vê *Excluir*; quem não pode editar vê os painéis **em leitura**, com a
 * razão escrita — em vez de campos que o banco vai recusar.
 */
import * as React from "react";

import { Button } from "@/components/ui/button";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import { disciplinaTemCurriculo } from "@/lib/dominio/modelo-do-curriculo";

import type { LinhaDaGradeDeDisciplinas } from "../consulta";
import type { PermissoesDaGrade } from "../GradeDeDisciplinas";
import { DialogoDeExclusao } from "./DialogoDeExclusao";
import { FormularioDeDisciplina } from "./FormularioDeDisciplina";
import { PainelDeInstrutores } from "./PainelDeInstrutores";
import { PainelDePeriodo } from "./PainelDePeriodo";
import { PainelDeUnidades } from "./PainelDeUnidades";
import { SituacaoDaDisciplina } from "./SituacaoDaDisciplina";

export function DetalheDaDisciplina({
  linha,
  porTurma,
  permissoes,
  cursoId,
  escala,
}: {
  readonly linha: LinhaDaGradeDeDisciplinas;
  readonly porTurma: boolean;
  readonly permissoes: PermissoesDaGrade;
  readonly cursoId: string;
  /** A escala de antiguidade, de `config_listas` — o `SeletorInstrutor` a exige. */
  readonly escala: EscalaDeAntiguidade;
}) {
  const [editando, setEditando] = React.useState(false);

  return (
    <div className="flex flex-col gap-4" data-slot="detalhe-da-disciplina">
      {/* ── cadastro ──────────────────────────────────────────────────────────────────────── */}
      <section aria-labelledby={`cadastro-${linha.disciplinaId}`} className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id={`cadastro-${linha.disciplinaId}`} className="text-texto text-sm font-semibold">
            Cadastro
          </h3>
          {/* veste: o código gerado pelo sistema, ao lado do nome */}
          <span className="text-texto-tenue font-mono text-xs">{linha.codigo}</span>

          {permissoes.editar ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditando((a) => !a)}
              data-slot="alternar-edicao"
            >
              {editando ? "Fechar edição" : "Editar disciplina"}
            </Button>
          ) : null}

          {permissoes.desativar ? (
            <SituacaoDaDisciplina
              disciplinaId={linha.disciplinaId}
              nome={linha.nomeDisciplina}
              ativa={linha.ativa}
              turmasQueUsam={linha.turmaDisciplinaId === null ? 0 : 1}
            />
          ) : null}

          {/* ⚠️ Excluir segue a permissão de CRIAR (`FR-021`): quem pode trazer ao mundo pode tirar
              o que ainda não tem histórico. O Operador, que edita, **não** vê este botão. */}
          {permissoes.criar ? (
            <DialogoDeExclusao
              tipo="disciplina"
              nome={linha.nomeDisciplina}
              codigo={linha.codigo}
              identificador={linha.disciplinaId}
            />
          ) : null}
        </div>

        {editando ? (
          <FormularioDeDisciplina
            cursoId={cursoId}
            disciplina={{
              disciplinaId: linha.disciplinaId,
              codDisciplina: linha.codDisciplina,
              nomeDisciplina: linha.nomeDisciplina,
              cargaHorariaTempos: linha.cargaHorariaTempos,
              ordemSugerida: linha.ordemSugerida,
              modoAtribuicaoPadrao: linha.modoAtribuicaoPadrao,
            }}
            aoConcluir={() => setEditando(false)}
          />
        ) : null}
      </section>

      {/* ── o que é por turma ─────────────────────────────────────────────────────────────── */}
      {porTurma && linha.turmaDisciplinaId !== null ? (
        <>
          <PainelDePeriodo
            turmaDisciplinaId={linha.turmaDisciplinaId}
            previsaoInicio={linha.previsaoInicio}
            previsaoTermino={linha.previsaoTermino}
            podeEditar={permissoes.editar}
          />

          <PainelDeInstrutores
            turmaDisciplinaId={linha.turmaDisciplinaId}
            cargaHorariaTempos={linha.cargaHorariaTempos}
            modoDaDisciplina={linha.modoAtribuicaoPadrao}
            atribuidos={linha.instrutores}
            habilitados={linha.habilitados}
            unidades={linha.unidades}
            escala={escala}
            podeEditar={permissoes.editar}
          />
        </>
      ) : (
        <p className="text-texto-suave text-sm" data-slot="so-por-turma">
          Período previsto e instrutores são <strong>por turma</strong>. Escolha uma turma acima
          para editá-los.
        </p>
      )}

      {/* ── unidades de ensino ────────────────────────────────────────────────────────────── */}
      {disciplinaTemCurriculo({
        disciplinaId: linha.disciplinaId,
        unidadesAtivas: linha.unidades.filter((u) => u.ativa).length,
      }) ? (
        <PainelDeUnidades
          disciplinaId={linha.disciplinaId}
          unidades={linha.unidades}
          avisoDaSoma={linha.avisoDaSoma}
          podeEditar={permissoes.editar}
          podeDesativar={permissoes.desativar}
        />
      ) : permissoes.editar ? (
        /* ⚠️ Sem UE não há AVISO de pendência (`FR-061`) — há o caminho de criar a primeira, que é
           outra coisa: ele não afirma que falta, oferece o que fazer se a pessoa quiser. */
        <PainelDeUnidades
          disciplinaId={linha.disciplinaId}
          unidades={[]}
          avisoDaSoma={null}
          podeEditar={permissoes.editar}
          podeDesativar={permissoes.desativar}
        />
      ) : null}
    </div>
  );
}
