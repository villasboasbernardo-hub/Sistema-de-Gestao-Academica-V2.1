"use client";

/**
 * Os campos que **cadastrar** e **editar** compartilham: perfil, escopo, vínculos de curso e a
 * associação ao instrutor.
 *
 * ⚠️ **ELE É UM SÓ PARA AS DUAS PÁGINAS, e isso evita o defeito mais provável desta fatia:** a tela de
 * cadastro e a de edição oferecendo listas de perfil diferentes, ou uma exigindo vínculo e a outra não.
 * Era exatamente o que já tinha acontecido entre o convite e a edição antes de 03/10/2026.
 *
 * ⚠️ **O SELETOR DE INSTRUTOR É O CANÔNICO**, `components/ciaara/seletor-instrutor.tsx` — ele
 * **reordena por antiguidade** a lista que recebe (`RN-ANT-01`, Risco Alto), e é por isso que a escala
 * de `config_listas` desce até aqui. Construir uma escolha de instrutor neste arquivo faria o `SC-002`
 * reprovar, com razão.
 *
 * ⚠️ **E OS DOIS `<select>` (perfil e escopo) MORAM EM `SelecoesDaConta.tsx`** pela mesma guarda: este
 * arquivo menciona instrutor no código, então um `<select` aqui seria violação. Ver a nota lá.
 *
 * ⚠️ **O VÍNCULO DE CURSO É CAIXA DE SELEÇÃO, não lista de escolha única** — a conta pode responder por
 * mais de um curso, e `usuario_curso` é tabela de ligação. Caixa de seleção também fica fora do alcance
 * da guarda, que mira construtores de *escolha*.
 */
import { SeletorInstrutor } from "@/components/ciaara/seletor-instrutor";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import {
  dicaDoPerfil,
  escopoRestringe,
  exigeVinculoDeCurso,
} from "@/lib/dominio/exigencias-do-perfil";
import type { InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";
import type { Perfil } from "@/lib/dominio/perfis";

import type { CursoParaVincular } from "./dados-da-conta";
import { SeletorDeEscopo, SeletorDePerfil } from "./SelecoesDaConta";

/** O escopo com que a conta nasce: `geral`, que é "todos os cursos" e não restringe nada. */
export const ESCOPO_PADRAO_DE_CADASTRO = "geral";

export type EstadoDaConta = {
  readonly perfil: string;
  readonly escopo: string;
  readonly cursos: readonly string[];
  readonly vinculoDeDocente: string;
};

export function CamposDaConta({
  estado,
  aoMudar,
  cursos,
  instrutores,
  escala,
}: {
  readonly estado: EstadoDaConta;
  readonly aoMudar: (proximo: EstadoDaConta) => void;
  readonly cursos: readonly CursoParaVincular[];
  readonly instrutores: readonly InstrutorParaExibir[];
  readonly escala: EscalaDeAntiguidade;
}) {
  const perfil = estado.perfil as Perfil;
  const precisaDeCursos = exigeVinculoDeCurso(perfil);

  function alternarCurso(id: string) {
    const ja = estado.cursos.includes(id);
    aoMudar({
      ...estado,
      cursos: ja ? estado.cursos.filter((c) => c !== id) : [...estado.cursos, id],
    });
  }

  return (
    <>
      <SeletorDePerfil
        valor={estado.perfil}
        aoMudar={(valor) => aoMudar({ ...estado, perfil: valor })}
        dica={dicaDoPerfil(perfil)}
      />

      <SeletorDeEscopo
        valor={estado.escopo}
        aoMudar={(valor) => aoMudar({ ...estado, escopo: valor })}
        restringe={escopoRestringe(perfil)}
      />

      {/*
        ⚠️ **A LISTA DE CURSOS APARECE SEMPRE, e não só para quem precisa dela.** Esconder o campo
           faria a tela mudar de forma ao trocar o perfil, e quem já tinha marcado cursos não veria o
           que aconteceu com a escolha. O que muda é a EXIGÊNCIA, dita em texto.
      */}
      <fieldset className="border-borda rounded-ciaara flex flex-col gap-1 border p-2">
        <legend className="text-texto-suave px-1 text-xs">
          Cursos vinculados{precisaDeCursos ? " (obrigatório para este perfil)" : " (opcional)"}
        </legend>
        {cursos.length === 0 ? (
          // veste: aviso de ausência de curso — texto de apoio
          <span className="text-texto-tenue text-xs">Nenhum curso ativo cadastrado.</span>
        ) : (
          <div className="flex max-h-40 flex-col gap-0.5 overflow-y-auto">
            {cursos.map((curso) => (
              <label key={curso.id} className="text-texto flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  name="cursos"
                  value={curso.id}
                  checked={estado.cursos.includes(curso.id)}
                  onChange={() => alternarCurso(curso.id)}
                />
                <span>
                  {curso.codigo} — {curso.nomeCurso}
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      {/*
        ⚠️ **O VÍNCULO DE DOCENTE É OPCIONAL PARA OS NOVE PERFIS, E ISSO FOI MEDIDO** (03/10/2026):
           nenhuma policy e nenhuma função de autorização lê `usuarios.instrutor_id`. Ele liga a conta
           à ficha de docente da mesma pessoa; não concede nem restringe nada.
      */}
      <div className="flex flex-col gap-1">
        <SeletorInstrutor
          instrutores={instrutores}
          escala={escala}
          valor={estado.vinculoDeDocente}
          aoMudar={(id) => aoMudar({ ...estado, vinculoDeDocente: id })}
          rotulo="Vínculo com a ficha de docente (opcional)"
        />
        {/* veste: explicação do que o vínculo faz e não faz — texto de apoio */}
        <span className="text-texto-tenue text-xs">
          Liga esta conta à ficha de docente da mesma pessoa. Não altera permissão nenhuma.
        </span>
        <input type="hidden" name="instrutorId" value={estado.vinculoDeDocente} />
      </div>
    </>
  );
}
