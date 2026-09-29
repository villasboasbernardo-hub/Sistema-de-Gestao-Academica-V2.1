/**
 * A cascata **curso → turma** da grade (`FR-002`).
 *
 * ⚠️ **ARQUIVO PRÓPRIO, e a separação não é estética.** A guarda do `SC-004` reprova qualquer arquivo
 * que **construa** uma escolha de turma fora de `components/ciaara/seletor-turma.tsx`, e a do
 * `SC-002` faz o mesmo para instrutor — ela reprova **qualquer `<select>` num arquivo que mencione
 * instrutor**. A grade menciona instrutor o tempo todo; a escolha de curso é um `<select>` simples.
 * Separar é o que deixa as duas coisas conviverem sem nenhuma exceção nas guardas.
 *
 * ⚠️ **A TURMA VEM DO COMPONENTE ÚNICO** — `SeletorTurma`. Ele já trata lista vazia com
 * `RN-DEG-01` e carrega o rótulo do `FR-034`; um segundo construtor devolveria o *"esquecer numa
 * tela nova"* que o ponto único elimina.
 *
 * ⚠️ **TROCAR DE CURSO LIMPA A TURMA.** A turma do curso anterior não existe aqui, e mantê-la
 * produziria um endereço incoerente que a página teria de descartar com aviso — melhor não produzi-lo.
 */
"use client";

import { SeletorTurma } from "@/components/ciaara/seletor-turma";
import { Label } from "@/components/ui/label";
import { useParametro } from "@/lib/navegacao/usar-parametro";

import type { CursoDaCascata, TurmaDaCascata } from "./consulta";

const ROTA = "/disciplinas";

export function CascataDeCursoETurma({
  cursos,
  turmas,
  cursoEscolhido,
  cursoNoEndereco,
  turmaNoEndereco,
}: {
  readonly cursos: readonly CursoDaCascata[];
  readonly turmas: readonly TurmaDaCascata[];
  readonly cursoEscolhido: CursoDaCascata | null;
  readonly cursoNoEndereco: string;
  readonly turmaNoEndereco: string;
}) {
  const [, definirCurso] = useParametro(ROTA, "curso");
  const [, definirTurma] = useParametro(ROTA, "turma");

  /*
   * ⚠️ O `SeletorTurma` trabalha com `id`, e a URL carrega o **código** (`FR-031.2`): o código é
   * legível, compartilhável e sobrevive a uma recarga; o `uuid` não diz nada a ninguém. A tradução
   * acontece aqui, nas duas direções.
   */
  const turmaEscolhidaId = turmas.find((t) => t.codigo === turmaNoEndereco)?.id ?? "";

  return (
    <div className="flex flex-wrap items-end gap-3" data-slot="cascata">
      <div className="flex flex-col gap-1">
        <Label htmlFor="curso">Curso</Label>
        <select
          id="curso"
          name="curso"
          value={cursoNoEndereco}
          onChange={(e) => {
            void definirTurma(null);
            void definirCurso(e.target.value === "" ? null : e.target.value);
          }}
          className="border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          <option value="">Escolha o curso…</option>
          {cursos.map((c) => (
            <option key={c.id} value={c.codigo}>
              {c.codigo} — {c.nomeCurso}
            </option>
          ))}
        </select>
      </div>

      {cursoEscolhido && turmas.length > 0 ? (
        <div className="flex flex-col gap-1">
          <Label htmlFor="turma">Turma</Label>
          <SeletorTurma
            id="turma"
            turmas={turmas.map((t) => ({ id: t.id, rotulo: t.codigo }))}
            valor={turmaEscolhidaId}
            aoMudar={(id) => {
              const codigo = turmas.find((t) => t.id === id)?.codigo ?? "";
              void definirTurma(codigo === "" ? null : codigo);
            }}
          />
          {/* veste: dica de que a turma é opcional, e do que se perde sem ela */}
          <span className="text-texto-tenue text-xs">
            Sem turma, a tela mostra o catálogo do curso.
          </span>
        </div>
      ) : null}
    </div>
  );
}
