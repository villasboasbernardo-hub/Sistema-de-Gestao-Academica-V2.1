/**
 * Carregamento do segmento de administração (`FR-020`, `FR-045`).
 *
 * ⚠️ **SEM `<main>` AQUI.** A casca já desenha o dela, e um segundo enquanto o segmento carrega
 * produz dois marcos iguais no documento ao mesmo tempo. Na fatia (b) isso custou dois diagnósticos:
 * casos passavam a reprovar com *"strict mode violation: locator('main') resolved to 2 elements"*, a
 * primeira leitura foi lentidão, e alargar o prazo **piorou** — de dois instáveis para seis.
 * Ambiguidade não se resolve com mais tempo.
 *
 * ⚠️ **A SILHUETA TEM O FORMATO DO CONTEÚDO**, e não um giro genérico: quem espera precisa saber que
 * está chegando uma tela, e qual. É o mesmo critério do esqueleto de tabela da fatia (b).
 */
export default function CarregandoNaAdministracao() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">Carregando a tela…</span>
      <div className="bg-superficie-2 rounded-ciaara h-7 w-64" />
      <div className="bg-superficie-2 rounded-ciaara h-4 w-full max-w-md" />
      <div className="border-borda rounded-ciaara flex flex-col gap-2 border p-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-superficie-2 h-6 w-full rounded" />
        ))}
      </div>
    </div>
  );
}
