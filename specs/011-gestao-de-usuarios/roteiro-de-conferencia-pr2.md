# Roteiro de conferência — PR 2 da spec 011: o Admin sobre outras contas

> **Para Bernardo Villas Boas.** Curto, e tudo em `/admin/usuarios` → menu **Administração**.
>
> ⚠️ **ESTE PR TEM MIGRATION, E ELA JÁ FOI APLICADA NO REMOTO** — `20261002195248_auditoria_de_conta.sql`,
> com backup datado antes e conferência só de leitura depois. Registro em
> `plano-de-aplicacao-no-remoto.md`.
>
> ⚠️ **O QUE VOCÊ VAI MEXER É DADO REAL, E DE PROPÓSITO.** O remoto tem **5 contas** e **uma**
> credencial — a sua. Então o percurso da senha temporária **precisa de uma segunda conta com
> credencial**: ou você aceita um convite num e-mail seu, ou faz o percurso só no LOCAL. Está marcado
> passo a passo qual é qual.
>
> ⚠️ **NUNCA REDEFINA A SENHA DA SUA PRÓPRIA CONTA.** A tela não oferece isso — e o passo **A.3**
> existe para você conferir que ela não oferece.

**Onde:** `https://sistema-de-gestao-academica-v2-1-git-feat-epic-...-ciaara-11.vercel.app` (o endereço
exato sai no comentário do PR 2). Para o LOCAL: `pnpm db:reset && pnpm dev:local`, porta **3000**.

---

# PARTE A — PREVIEW (dado real; só olhar e editar o que é seguro)

| #   | Passo                                                                                   | Resultado esperado                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A.1 | Menu → **Administração**. Olhar a lista                                                   | As **5 contas**, com Nome, E-mail, Perfil **em português**, Escopo, Situação, Instrutor vinculado, Último acesso e Ações                                   |
| A.2 | Na linha de outra conta, ver quais botões existem                                         | **Editar nome**, **Editar perfil**, **Desativar** e — só se ela tiver credencial — **Redefinir senha**. `USR-MUEF9CLK` **não** tem credencial: sem o botão |
| A.3 | **O caso que importa:** olhar a **sua própria** linha                                     | **Nenhum** botão de ação. No lugar, a frase *"Esta é a sua conta… peça a outro Administrador"*. ⚠️ É ausência, não botão cinza                            |
| A.4 | Em outra conta → **Editar nome** → trocar → **Gravar nome**                               | A lista passa a mostrar o nome novo **na hora**. ⚠️ Isto grava dado real, e é o certo: o preview é onde quem testa edita                                   |
| A.5 | Em outra conta → **Editar perfil**                                                        | A lista traz os **nove** perfis, **agrupados por divisão**, e diz qual é o de hoje                                                                        |
| A.6 | Trocar o perfil de `USR-03` para **Operador** e **Gravar perfil**                          | A coluna Perfil muda. ⚠️ Devolva para **Visualização** depois, se era o que você queria lá                                                                 |
| A.7 | Tentar **Desativar** a conta que é o **único outro Admin**                                 | **Recusado**, com *"ela é o último Administrador ativo… Promova outra conta a Administrador antes"* — a frase diz **o que fazer**                          |
| A.8 | Em qualquer conta → **Desativar** → depois **Reativar**                                    | A Situação vai a *inativo* e volta a *ativo*. ⚠️ Nada é apagado, e **reativar usa a mesma permissão de desativar**                                        |

---

# PARTE B — a senha temporária (LOCAL, ou preview com uma segunda conta sua)

⚠️ **Faça no LOCAL se não quiser mexer na credencial de ninguém.** No preview, a conta alvo precisa
ser uma de que você tenha o e-mail.

| #   | Passo                                                                       | Resultado esperado                                                                                                                               |
| --- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| B.1 | Na linha da conta alvo → **Redefinir senha**                                 | Aparece um bloco com **Senha temporária: XXXX**, 16 caracteres, **sem** `O`, `0`, `l`, `1` nem `I`, e a advertência de que ela aparece **uma vez** |
| B.2 | **Copiar a senha** e dar **F5** na página                                    | O bloco **não volta**. ⚠️ Ela não está em coluna, log nem endereço — quem perde, redefine de novo                                                  |
| B.3 | Sair, e entrar com a conta alvo usando a **senha temporária**                 | Entra e **cai direto em «Trocar a minha senha»**                                                                                                  |
| B.4 | **O caso que importa:** tentar ir a **Início**, **Cursos** e **Meu perfil**   | As três **devolvem** à tela de senha. ⚠️ Só *Sair* continua funcionando — trancar a saída deixaria a pessoa sem caminho                            |
| B.5 | Definir a senha nova (12+ caracteres, duas vezes iguais)                      | *"Senha trocada"*                                                                                                                                 |
| B.6 | Ir a **Início**                                                              | **Abre.** A obrigação saiu                                                                                                                        |
| B.7 | Sair e tentar entrar com a **temporária**                                     | **Recusada**                                                                                                                                      |
| B.8 | Entrar com a **nova**                                                        | Entra normalmente                                                                                                                                 |
| B.9 | Se você tinha a conta alvo aberta noutro navegador, voltar lá e navegar        | Ela foi **derrubada** — a redefinição encerra **todas** as sessões abertas (decisão D-4)                                                           |

---

## O que eu preciso que você confira com atenção

**A frase da senha temporária.** Ela diz, junto do código: *"Ela aparece uma vez. Copie agora e
entregue à pessoa — recarregar esta tela a perde, e as sessões abertas dela foram encerradas. No
próximo acesso, ela será levada à tela de senha nova e não sairá de lá antes de definir uma."* Se
alguma parte disso não é o que você quer que o Admin leia, é uma linha de código.

**A trilha de auditoria nasce vazia e é só de acréscimo.** Ela registra **quatro** coisas — quem,
o quê, sobre qual conta, quando — e nada mais (decisão D-2). Hoje **nenhuma tela a exibe**: a função
de leitura existe e está provada, mas a tela que a mostra não estava no escopo do PR 2. Se você quiser
vê-la na ficha da conta, é tarefa nova — diga e eu abro.

---

## Depois do seu "de acordo"

Abro o PR 2. O PR 3 (reativar e excluir conta) **não** começou.
