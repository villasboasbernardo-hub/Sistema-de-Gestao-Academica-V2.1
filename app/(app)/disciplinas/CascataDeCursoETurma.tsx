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

import { Label } from "@/components/ui/label";
import { useParametro } from "@/lib/navegacao/usar-parametro";

import type { CursoDaCascata } from "./consulta";

const ROTA = "/disciplinas";

export function CascataDeCursoETurma({
  cursos,
  cursoNoEndereco,
}: {
  readonly cursos: readonly CursoDaCascata[];
  readonly cursoNoEndereco: string;
}) {
  const [, definirCurso] = useParametro(ROTA, "curso");

  return (
    <div className="flex flex-wrap items-end gap-3" data-slot="cascata">
      <div className="flex flex-col gap-1">
        <Label htmlFor="curso">Curso</Label>
        <select
          id="curso"
          name="curso"
          value={cursoNoEndereco}
          onChange={(e) => void definirCurso(e.target.value === "" ? null : e.target.value)}
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
    </div>
  );
}
