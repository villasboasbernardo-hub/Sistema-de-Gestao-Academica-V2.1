/**
 * Recuperação de senha (FR-018, FR-019, FR-025.3).
 *
 * Duas telas em uma, e qual delas aparece depende de haver sessão de recuperação:
 *   • sem sessão  → pede o e-mail e dispara o link;
 *   • com sessão  → define a nova senha (é para onde o link traz a pessoa de volta).
 *
 * ⚠️ A RESPOSTA DO PEDIDO É SEMPRE A MESMA, exista ou não a conta. Se variasse, bastaria testar
 * endereços para levantar quem tem acesso ao sistema — e num sistema da Marinha isso é o quadro
 * de pessoal de uma divisão.
 */
import { FormularioDeRecuperacao } from "./FormularioDeRecuperacao";

export default function RecuperarSenha() {
  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-lg font-semibold">Recuperar acesso</h1>
      <FormularioDeRecuperacao />
      <a className="mt-6 inline-block text-sm underline" href="/login">
        Voltar ao login
      </a>
    </main>
  );
}
