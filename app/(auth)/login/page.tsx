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
      {/*
        ⚠️ **O E-MAIL SAIU DO SISTEMA em 03/10/2026** *(decisão de Bernardo Villas Boas)*, e com ele a
           recuperação de senha por link: ela depende de e-mail para existir. No lugar do link fica a
           frase que diz **o que fazer** — quem esqueceu a senha procura o Admin, que redefine pela
           tela de usuários e entrega a temporária em mãos.
        ⚠️ **NÃO É UM LINK DESABILITADO NEM UM BOTÃO QUE AVISA**: a rota `/recuperar-senha` deixou de
           existir, e oferecer um caminho que não leva a nada é pior que não oferecer.
      */}
      <p className="text-texto-suave mt-2 text-sm">
        Esqueceu a senha? Procure o administrador do sistema.
      </p>
    </main>
  );
}
