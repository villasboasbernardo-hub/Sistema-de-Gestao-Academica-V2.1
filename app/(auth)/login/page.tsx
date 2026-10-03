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

      {/*
        ⚠️ **ELA DIZIA «somente por convite» ATÉ 03/10/2026**, e o convite foi removido
           PERMANENTEMENTE do sistema (D-USR-1, decisão de Bernardo Villas Boas). Esta é a primeira
           tela do sistema: deixá-la anunciando um fluxo que não existe mais ensinaria a procurar um
           e-mail que nunca vai chegar.
        veste: a dica de rodapé sobre como se consegue acesso — texto fixo, nunca dado
      */}
      <p className="text-texto-tenue mt-6 text-xs">
        O acesso é <strong>somente por cadastro do Admin</strong>, que entrega a senha inicial em
        mãos. Não há autocadastro nem convite por e-mail.
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
