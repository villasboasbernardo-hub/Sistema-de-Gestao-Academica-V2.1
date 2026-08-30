/**
 * Rota inexistente (FR-019).
 *
 * Distingue "não existe" de "você não pode ver" — a confusão entre os dois é o defeito nº 4 dos
 * gotchas da plataforma (RLS que nega em silêncio). Aqui é, sempre, "não existe".
 */
import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Página não encontrada</h1>
      <p>Este endereço não existe no sistema. Não é falta de permissão — é rota inexistente.</p>
      <Link href="/">Voltar ao início</Link>
    </main>
  );
}
