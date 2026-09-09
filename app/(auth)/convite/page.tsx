/**
 * Definição de senha no primeiro acesso (FR-009, FR-010, FR-025.2).
 *
 * ⚠️ A ROTA NÃO CARREGA O TOKEN NO CAMINHO, e a tarefa T019 dizia `[token]`. O motivo é da
 * plataforma: o link de convite chega com o token no **fragmento** da URL (`#access_token=…`),
 * que **não é enviado ao servidor** — nenhum Server Component consegue lê-lo. Quem o lê é o
 * cliente, que já o troca por sessão automaticamente. Uma rota `[token]` daria um parâmetro
 * sempre vazio e a falsa impressão de que o servidor valida algo.
 *
 * ⚠️ O ADMIN NUNCA CONHECE A SENHA. Ela é definida aqui, pelo convidado, e vai direto ao servidor
 * de autenticação — não passa por Server Action nem por tabela nossa.
 */
import { FormularioDeSenha } from "./FormularioDeSenha";

export default function Convite() {
  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-lg font-semibold">Definir senha</h1>
      <p className="mt-1 text-sm opacity-80">
        Você foi convidado para o sistema de gestão acadêmica da CIAARA-11. Escolha uma senha para
        concluir o primeiro acesso.
      </p>

      <FormularioDeSenha rotulo="Concluir primeiro acesso" />

      <p className="mt-6 text-xs opacity-70">
        Mínimo de 12 caracteres. Senhas presentes em vazamentos públicos conhecidos são recusadas —
        não é frescura: senha reutilizada é a ameaça A-7 do modelo de segurança.
      </p>
    </main>
  );
}
