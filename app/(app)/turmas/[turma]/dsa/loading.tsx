/**
 * Carregamento da semana do DSA (`RN-DEG-01`).
 *
 * ⚠️ **SEM `<main>` AQUI** — a casca já desenha o dela, e um segundo produz dois marcos iguais no
 * documento enquanto o segmento carrega.
 *
 * ⚠️ O esqueleto tem a **forma da grade**, não um retângulo genérico: a semana é a tela mais larga
 * da aplicação, e um esqueleto estreito faria o conteúdo saltar de largura ao chegar.
 */
export default function CarregandoSemanaDoDsa() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">Carregando a semana…</span>
      <div className="h-8 w-96 rounded-ciaara bg-superficie-2" />
      <div className="h-8 w-full max-w-xl rounded-ciaara bg-superficie-2" />
      <div className="h-96 rounded-ciaara bg-superficie-2" />
    </div>
  );
}
