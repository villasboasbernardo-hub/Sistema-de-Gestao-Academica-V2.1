/**
 * A política de senha, e a FRASE que a explica (`FR-031`, `FR-032`).
 *
 * ⚠️ **ESTE MÓDULO NÃO É A GARANTIA, E NÃO DEVE SER CONFUNDIDO COM ELA.** O mínimo real é o do
 * servidor de autenticação (`minimum_password_length = 12` em `supabase/config.toml`), e ele já é
 * provado pelo caminho de verdade em `tests/invariantes/rls/politica-de-senha.test.ts`, com uma
 * chamada à interface de autenticação — não pelo formulário. Foi assim que o Épico 3 pegou o defeito
 * em que o mínimo existia **só no navegador**, alcançável por chamada direta.
 *
 * ⚠️ **Então para que ele existe?** Para a tela **dizer a regra antes de a pessoa errar**. Sem isto,
 * a recusa que chega é a da plataforma, em inglês e sem contexto: *"Password should be at least 12
 * characters"*. Explicar é trabalho de interface, e interface em português é requisito do projeto.
 *
 * ⚠️ **O NÚMERO ESTÁ EM DOIS LUGARES, e isso é dívida declarada**: aqui e no `config.toml`. O teste
 * de unidade fixa o valor, e `config-auth-aplicado.test.ts` prova que o arquivo é o que está no ar —
 * mas nada liga os dois automaticamente. Se o mínimo da plataforma mudar e este módulo não, a tela
 * passa a prometer menos do que o servidor exige, e a recusa volta a ser a estrangeira.
 *
 * Módulo **puro**: só texto entra, só veredito e texto saem.
 */

/**
 * O mínimo de caracteres. ⚠️ **Espelha `minimum_password_length` do `supabase/config.toml`**, medido
 * em 29/09/2026: **12**.
 */
export const MINIMO_DE_CARACTERES = 12;

/** O comprimento da senha que o sistema GERA — acima do mínimo de propósito (`FR-034`). */
export const COMPRIMENTO_DA_SENHA_GERADA = 16;

export type VeredictoDaSenha =
  { readonly aceita: true } | { readonly aceita: false; readonly motivo: string };

/** A regra, em uma frase, para a tela mostrar **antes** de a pessoa digitar. */
export function regraDaSenhaEmPortugues(): string {
  return `A senha precisa ter pelo menos ${MINIMO_DE_CARACTERES} caracteres.`;
}

/**
 * A senha é aceitável?
 *
 * ⚠️ **Não corta espaço nas pontas**, e isso é decisão: espaço é caractere válido numa senha, e
 * cortá-lo aqui faria a tela aceitar uma senha que o servidor recebe diferente.
 */
export function conferirSenha(senha: string | null | undefined): VeredictoDaSenha {
  if (!senha) {
    return { aceita: false, motivo: "Informe a senha." };
  }
  if (senha.length < MINIMO_DE_CARACTERES) {
    return { aceita: false, motivo: regraDaSenhaEmPortugues() };
  }
  return { aceita: true };
}

/**
 * As duas digitações coincidem?
 *
 * ⚠️ Confere **antes** da regra de tamanho de propósito: quem digitou duas senhas diferentes precisa
 * saber disso, não ouvir sobre comprimento.
 */
export function conferirConfirmacao(senha: string, confirmacao: string): VeredictoDaSenha {
  if (senha !== confirmacao) {
    return { aceita: false, motivo: "As duas senhas não coincidem." };
  }
  return conferirSenha(senha);
}
