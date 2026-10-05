/**
 * Carregamento do segmento de turmas (`RN-DEG-01`, `FR-045` da spec 008).
 *
 * ⚠️ **SEM `<main>` AQUI** — a casca já desenha o dela, e um segundo produz dois marcos iguais no
 * documento enquanto o segmento carrega.
 *
 * ⚠️ **ELE COBRE A LISTA E A FICHA**, porque é o `loading` do segmento pai: a ficha tem o seu, mais
 * específico, e o Next usa o mais próximo. Este existe para a lista, que antes não tinha segmento.
 */
export default function CarregandoTurmas() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Carregando as turmas…</span>
      <div className="bg-superficie-2 rounded-ciaara h-8 w-40" />
      <div className="bg-superficie-2 rounded-ciaara h-5 w-32" />
      <div className="bg-superficie-2 rounded-ciaara h-24" />
      <div className="bg-superficie-2 rounded-ciaara h-64" />
    </div>
  );
}
