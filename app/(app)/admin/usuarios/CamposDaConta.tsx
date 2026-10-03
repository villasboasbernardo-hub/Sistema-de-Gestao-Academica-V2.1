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
import {
  dicaDoPerfil,
  escopoRestringe,
  exigeVinculoDeCurso,
} from "@/lib/dominio/exigencias-do-perfil";
import type { Perfil } from "@/lib/dominio/perfis";

import type { CursoParaVincular } from "./dados-da-conta";
import { SeletorDeEscopo, SeletorDePerfil } from "./SelecoesDaConta";

/** O escopo com que a conta nasce: `geral`, que é "todos os cursos" e não restringe nada. */
export const ESCOPO_PADRAO_DE_CADASTRO = "geral";

/**
 * ⚠️ **`vinculoDeDocente` SAIU DO ESTADO em 03/10/2026** *(decisão de Bernardo Villas Boas)*: *"O
 * vínculo de instrutor sai da tela (nenhuma policy o lê)."* A medição é a mesma que havia motivado
 * oferecê-lo — **nenhuma policy e nenhuma função de autorização leem `usuarios.instrutor_id`** —, e a
 * conclusão dele é a outra: campo que não concede nem restringe nada não pede espaço numa tela de
 * acesso. ⚠️ **A COLUNA DO BANCO NÃO FOI TOCADA**, e o vínculo existente de nenhuma conta foi
 * desfeito: a tela deixou de oferecê-lo, e `app.impedimentos_de_exclusao_do_instrutor` continua
 * usando-o para impedir que se apague um docente com conta ligada.
 */
export type EstadoDaConta = {
  readonly perfil: string;
  readonly escopo: string;
  readonly cursos: readonly string[];
};

export function CamposDaConta({
  estado,
  aoMudar,
  cursos,
}: {
  readonly estado: EstadoDaConta;
  readonly aoMudar: (proximo: EstadoDaConta) => void;
  readonly cursos: readonly CursoParaVincular[];
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
        ⚠️ **A LISTA DE CURSOS APARECE SÓ PARA O PERFIL QUE A EXIGE** *(decisão de Bernardo Villas
           Boas, 03/10/2026)*. A escrita anterior a mostrava sempre, com a exigência dita em texto —
           o argumento era que esconder faz a tela mudar de forma ao trocar o perfil. **Ele decidiu o
           contrário, e a razão é mais forte:** para oito dos nove perfis o vínculo **não muda nada**
           do que a pessoa vê (medido em `app.cursos_do_usuario()`), e um campo que não faz efeito é
           um campo que convida a preencher à toa.
        ⚠️ **O estado NÃO é limpo ao esconder, de propósito:** quem trocar de perfil sem querer e
           voltar encontra as marcações como as deixou. Limpar faria a troca acidental custar o
           trabalho de remarcar.
      */}
      {precisaDeCursos ? (
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
      ) : null}
    </>
  );
}
