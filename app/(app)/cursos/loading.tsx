/**
 * Carregamento do segmento de cursos (`RN-DEG-01`, `FR-045` da spec 008).
 *
 * ⚠️ **SEM `<main>` AQUI.** A casca já desenha o dela, e um segundo produz dois marcos iguais no
 * documento enquanto o segmento carrega — o defeito que a fatia (b) do Épico 4 pagou com dois
 * diagnósticos errados.
 *
 * ⚠️ **A SILHUETA TEM O FORMATO DO CATÁLOGO**, e não um giro genérico: quem espera precisa saber que
 * está chegando uma grade de cartões, e não uma tabela.
 */
export default function CarregandoCursos() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Carregando o catálogo de cursos…</span>
      <div className="bg-superficie-2 rounded-ciaara h-7 w-40" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="bg-superficie-2 rounded-ciaara h-20" />
        <div className="bg-superficie-2 rounded-ciaara h-20" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="bg-superficie-2 rounded-ciaara h-28" />
        ))}
      </div>
    </div>
  );
}
