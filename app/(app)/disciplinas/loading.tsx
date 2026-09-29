/**
 * Carregamento da grade de disciplinas (`RN-DEG-01`).
 *
 * ⚠️ **SEM `<main>` AQUI.** A casca já desenha o dela, e um segundo produz dois marcos iguais no
 * documento enquanto o segmento carrega — o defeito que a fatia (b) do Épico 4 pagou com dois
 * diagnósticos errados.
 *
 * ⚠️ **A SILHUETA TEM O FORMATO DA GRADE**: cascata, indicadores e uma tabela — e não um giro
 * genérico. Quem espera precisa saber que vem uma tabela larga, não cartões.
 */
export default function CarregandoDisciplinas() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Carregando a grade de disciplinas…</span>
      <div className="bg-superficie-2 rounded-ciaara h-7 w-44" />
      <div className="flex gap-3">
        <div className="bg-superficie-2 rounded-ciaara h-9 w-64" />
        <div className="bg-superficie-2 rounded-ciaara h-9 w-52" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="bg-superficie-2 rounded-ciaara h-20" />
        ))}
      </div>
      <div className="bg-superficie-2 rounded-ciaara h-64" />
    </div>
  );
}
