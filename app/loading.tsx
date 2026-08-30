/**
 * Estado de carregamento do segmento raiz (FR-019).
 *
 * Par obrigatório do `error.tsx`: sem ele, a navegação entre segmentos fica sem retorno visual e o
 * usuário clica de novo, achando que não funcionou.
 */
export default function Carregando() {
  return (
    <main style={{ padding: "2rem" }} aria-busy="true" aria-live="polite">
      <p>Carregando…</p>
    </main>
  );
}
