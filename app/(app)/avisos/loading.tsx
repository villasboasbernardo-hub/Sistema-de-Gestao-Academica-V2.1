/**
 * Carregamento da página Avisos (`RN-DEG-01`; spec 022, Bloco 7).
 *
 * ⚠️ **SEM `<main>` AQUI** — a casca já desenha o dela.
 */
export default function CarregandoAvisos() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Carregando os avisos…</span>
      <div className="bg-superficie-2 rounded-ciaara h-8 w-40" />
      <div className="bg-superficie-2 rounded-ciaara h-5 w-32" />
      <div className="bg-superficie-2 rounded-ciaara h-24" />
      <div className="bg-superficie-2 rounded-ciaara h-64" />
    </div>
  );
}
