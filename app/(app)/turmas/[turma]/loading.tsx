/**
 * Carregamento do segmento da ficha da turma (`RN-DEG-01`, `FR-045` da spec 008).
 *
 * ⚠️ **SEM `<main>` AQUI** — a casca já desenha o dela, e um segundo produz dois marcos iguais no
 * documento enquanto o segmento carrega.
 */
export default function CarregandoTurma() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Carregando a ficha da turma…</span>
      <div className="bg-superficie-2 rounded-ciaara h-8 w-80" />
      <div className="bg-superficie-2 rounded-ciaara h-5 w-full max-w-md" />
      <div className="bg-superficie-2 rounded-ciaara h-16" />
      <div className="bg-superficie-2 rounded-ciaara h-56" />
    </div>
  );
}
