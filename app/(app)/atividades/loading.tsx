/** Carregamento de `/atividades` (`RN-DEG-01`). Sem `<main>`: a casca já desenha o dela. */
export default function CarregandoAtividades() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Carregando as atividades…</span>
      <div className="bg-superficie-2 rounded-ciaara h-8 w-40" />
      <div className="bg-superficie-2 rounded-ciaara h-24" />
      <div className="bg-superficie-2 rounded-ciaara h-64" />
    </div>
  );
}
