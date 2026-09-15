/**
 * O painel de disciplinas marcáveis — **folha de cliente** (`FR-022` da spec 006; spec 019 da v2.0).
 *
 * > *"O sistema DEVE exibir, ao final do formulário de cadastro e do formulário de edição de
 * > instrutor, um painel de atribuição de disciplinas contendo um campo de busca e uma lista rolável
 * > de todas as disciplinas ativas do catálogo, cada uma como um item marcável (checkbox)."*
 * > — spec 019 da v2.0, `FR-001`
 *
 * ⚠️ O RÓTULO É "DISCIPLINA (SIGLA)", E A SIGLA É O `codigo` DO CURSO (spec 019, `FR-002`; spec 021:
 * *"`cursos.ID_Curso` já É a sigla"*). O nome do curso por extenso nunca aparece aqui.
 *
 * ⚠️ A BUSCA COMPARA NOME E SIGLA, SEM DIFERENCIAR MAIÚSCULA (spec 019, `FR-003`), e é estado efêmero:
 * o texto digitado antes de marcar não faz sentido num link.
 *
 * ⚠️ ESTE PAINEL NÃO GRAVA. Ele devolve o conjunto marcado ao formulário, que grava tudo depois da
 * confirmação do `FR-011` — o instrutor primeiro, e só então os vínculos (spec 019, `FR-007`).
 *
 * ⚠️ SÓ DISCIPLINA ATIVA É LISTADA (spec 019, `FR-013`). Vínculo ativo com disciplina descontinuada
 * não aparece nem é desfeito por aqui: a função do banco só inativa vínculo de disciplina ativa.
 */
"use client";

import { useState } from "react";

export type DisciplinaDoPainel = {
  readonly id: string;
  readonly nome: string;
  readonly sigla: string;
};

const CAMPO =
  "border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca w-full border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none";

export function PainelDeDisciplinas({
  disciplinas,
  marcadas,
  aoMudar,
}: {
  readonly disciplinas: readonly DisciplinaDoPainel[];
  readonly marcadas: ReadonlySet<string>;
  readonly aoMudar: (proximas: ReadonlySet<string>) => void;
}) {
  const [busca, setBusca] = useState("");
  const alvo = busca.trim().toLocaleLowerCase("pt-BR");
  const visiveis =
    alvo === ""
      ? disciplinas
      : disciplinas.filter(
          (d) =>
            d.nome.toLocaleLowerCase("pt-BR").includes(alvo) ||
            d.sigla.toLocaleLowerCase("pt-BR").includes(alvo),
        );

  const alternar = (id: string) => {
    const proximas = new Set(marcadas);
    if (proximas.has(id)) proximas.delete(id);
    else proximas.add(id);
    aoMudar(proximas);
  };

  return (
    <fieldset
      className="border-borda rounded-ciaara flex flex-col gap-3 border p-4"
      data-slot="painel-de-disciplinas"
    >
      <legend className="text-texto px-1 text-sm font-medium">Disciplinas habilitadas</legend>
      <div className="flex flex-col gap-1">
        <label htmlFor="busca-de-disciplina" className="text-texto text-sm">
          Buscar disciplina ou sigla do curso
        </label>
        <input
          id="busca-de-disciplina"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className={CAMPO}
        />
      </div>
      <p className="text-texto-suave text-xs" data-slot="contagem-de-marcadas">
        {marcadas.size} marcada(s)
      </p>
      {visiveis.length === 0 ? (
        <p className="text-texto-suave text-sm" role="status">
          Nenhuma disciplina corresponde a “{busca}”.
        </p>
      ) : (
        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {visiveis.map((d) => {
            const id = `disciplina-${d.id}`;
            return (
              <li key={d.id} className="flex items-center gap-2 text-sm">
                <input
                  id={id}
                  type="checkbox"
                  checked={marcadas.has(d.id)}
                  onChange={() => alternar(d.id)}
                  className="accent-marca size-4"
                />
                <label htmlFor={id} className="text-texto">
                  {d.nome} ({d.sigla})
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}
