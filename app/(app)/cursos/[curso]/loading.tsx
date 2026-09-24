/**
 * Carregamento do segmento da página do curso (`RN-DEG-01`, `FR-045` da spec 008).
 *
 * ⚠️ **SEM `<main>` AQUI** — a casca já desenha o dela, e um segundo produz dois marcos iguais no
 * documento enquanto o segmento carrega.
 */
export default function CarregandoCurso() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Carregando a página do curso…</span>
      <div className="bg-superficie-2 rounded-ciaara h-8 w-72" />
      <div className="bg-superficie-2 rounded-ciaara h-5 w-full max-w-xl" />
      <div className="bg-superficie-2 rounded-ciaara h-10 w-56" />
      <div className="bg-superficie-2 rounded-ciaara h-40" />
    </div>
  );
}
