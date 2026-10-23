/**
 * A escolha das turmas de uma linha do calendário — marcações, não lista suspensa (spec 023, D-17).
 *
 * ⚠️ **POR MARCAÇÃO, E EM ARQUIVO PRÓPRIO** (gotcha 12): a escolha é de várias turmas, que o seletor canônico de UMA
 *    turma não faz; e marcação não é o "construtor de seletor de turma" que a guarda `SC-004` existe para impedir.
 * ⚠️ As turmas chegam prontas e na ordem única do sistema (spec 022): aqui não se ordena nada.
 */
"use client";

export function EscolhaDeTurmas({
  turmas,
  escolhidas,
  aoMudar,
}: {
  readonly turmas: readonly { readonly id: string; readonly codigo: string }[];
  readonly escolhidas: readonly string[];
  readonly aoMudar: (escolhidas: string[]) => void;
}) {
  if (turmas.length === 0) {
    return <p className="text-texto-suave text-xs">Não há turma não arquivada neste ano.</p>;
  }
  return (
    <fieldset
      className="border-borda rounded-ciaara grid max-h-48 gap-1 overflow-y-auto border p-2 sm:grid-cols-2"
      data-slot="escolha-de-turmas"
    >
      <legend className="text-texto-suave px-1 text-xs">Turmas escolhidas</legend>
      {turmas.map((t) => (
        <label key={t.id} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={escolhidas.includes(t.id)}
            onChange={(e) =>
              aoMudar(
                e.target.checked ? [...escolhidas, t.id] : escolhidas.filter((id) => id !== t.id),
              )
            }
            data-turma-escolhida={t.codigo}
          />
          {t.codigo}
        </label>
      ))}
    </fieldset>
  );
}
