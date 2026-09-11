/**
 * Tela de login (FR-001, FR-025.1).
 *
 * ⚠️ FUNCIONAL E SÓBRIA, de propósito. O *design system* é o Épico 4 — nenhuma cor literal entra
 * aqui, e nenhum token existe ainda. Esta tela será revisitada; a dívida está registrada na
 * premissa 6 da spec para não ser descoberta lá como surpresa.
 *
 * ⚠️ VIVE EM `(auth)`, fora do grupo que exige sessão. Se ficasse sob o proxy que a exige, seria
 * preciso ter sessão para obter sessão — o laço não aparece no `tsc`, aparece no navegador.
 */
import { FormularioDeLogin } from "./FormularioDeLogin";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string }>;
}) {
  const { destino } = await searchParams;

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-lg font-semibold">CIAARA-11</h1>
      <p className="mt-1 text-texto-suave text-sm">
        Divisão de Administração Acadêmica — Gestão Acadêmica
      </p>

      <FormularioDeLogin destino={destino ?? "/"} />

      {/* veste: a dica de rodapé sobre o acesso por convite — texto fixo, nunca dado */}
      <p className="mt-6 text-texto-tenue text-xs">
        O acesso é <strong>somente por convite</strong> do Admin. Não há autocadastro.
      </p>
      <a className="mt-2 inline-block text-sm underline" href="/recuperar-senha">
        Esqueci minha senha
      </a>
    </main>
  );
}
