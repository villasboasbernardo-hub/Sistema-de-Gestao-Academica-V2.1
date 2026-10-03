# Conferência do PR 2 — as quatro ações sobre conta

> **Para Bernardo Villas Boas.** Doze passos, **só com contas de teste criadas aqui**. Nenhum passo
> mexe nas cinco contas reais.
>
> ⚠️ **A MIGRATION DESTA RODADA JÁ ESTÁ NO REMOTO** (`20261003042704`, aplicada em 03/10/2026 com a
> sua autorização, depois do CI verde). Ela fecha um buraco que eu achei **plantando defeito
> deliberado**, não conferindo tela: a **conta desativada** continuava autenticando — desativar não
> toca a credencial —, `app.eh_admin()` devolvia nulo para ela, e o porteiro escrito `if not …`
> **não barrava**: medido, ela **gravou** linha na trilha imutável. **Nenhum dos 12 passos abaixo
> exercita isso**, e o que ela muda é invisível na tela; está aqui só para você saber que o preview
> que vai conferir já roda com ela.
>
> ⚠️ **Local e remoto estão idênticos**: **49 e 49** migrations, impressão digital `ed9de773…` com
> 1.595 objetos nos dois, `diff` vazio — reconferido depois da aplicação.
>
> ⚠️ **O E-MAIL SAIU DO SISTEMA.** Não há envio em lugar nenhum do repositório, a rota
> `/recuperar-senha` foi **removida** e o login agora diz *"Esqueceu a senha? Procure o administrador
> do sistema."*
>
> ⚠️ **O QUE ESTAVA QUEBRADO ERA A VISIBILIDADE DA FALHA.** Medido no remoto, só por leitura: a trilha
> não tem **nenhuma** linha `excluir` e `excluida_em` está **nulo nas cinco contas** — **nada foi
> excluído**. A ação falhou e a falha era texto de 11px **dentro da linha que não mudou**. Agora a
> resposta aparece **acima da tabela**: o passo 11 existe para você ver isso.

**Onde:** o endereço do ramo na Vercel sai no comentário do PR. Menu → **Administração**.

| #  | Passo                                                                                   | Resultado esperado                                                                                                                 |
| -- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1  | Olhar a lista                                                                            | Seis colunas: avatar, nome, e-mail, perfil, último acesso e **Ações**. Em cada linha: **Redefinir senha · Desativar · Excluir**        |
| 2  | Olhar a **sua própria** linha                                                             | Nenhum botão — *"sua conta — peça a outro Administrador"*                                                                            |
| 3  | **Cadastrar usuário** → nome «Teste Um», e-mail `teste-um@ciaara.teste` → salvar           | **Senha temporária** de 16 caracteres, sem `O`, `0`, `l`, `1` nem `I`. **Copie.** Dar F5 a perde                                      |
| 4  | Repetir para «Teste Dois», `teste-dois@ciaara.teste`                                      | Idem. Agora há duas contas de teste na lista                                                                                        |
| 5  | Sair; entrar como **Teste Um** com a temporária; tentar ir a **Início**                   | Cai em **Trocar a minha senha** e não sai de lá. Definir a nova → **Início abre**                                                     |
| 6  | Sair; tentar entrar como Teste Um com a **temporária** e depois com a **nova**             | A temporária é **recusada**; a nova entra                                                                                           |
| 7  | Voltar como Admin → na linha de **Teste Dois**, **Redefinir senha** → confirmar            | O diálogo avisa que **encerra as sessões abertas**. Aparece outra temporária, uma vez                                                |
| 8  | Na linha de **Teste Dois**, **Desativar** → confirmar                                      | O diálogo diz que ela **perde o acesso**, que **nada é apagado** e que **NÃO é exclusão**. A linha ganha **Desativada** e **fica**     |
| 9  | **Reativar** Teste Dois                                                                   | Volta a ativa, **sem** pedir confirmação — é desfazer                                                                              |
| 10 | Na linha de **Teste Um**, **Excluir** → ler o diálogo                                      | Começa com *"A exclusão é permanente."* e diz que ela **registrou histórico** (trocou a senha). O botão está **desabilitado**          |
| 11 | Digitar o e-mail `teste-um@ciaara.teste` no campo e confirmar                               | O botão libera. A conta **sai da lista**, e **acima da tabela** aparece o que aconteceu. Entrar com ela: **recusado**                  |
| 12 | **Cadastrar** de novo com `teste-um@ciaara.teste`; depois excluir **Teste Dois** do mesmo modo | O e-mail **é aceito** — ele ficou livre. Teste Dois nunca usou o sistema: o diálogo diz que o cadastro **sai inteiro**                |

---

## Duas coisas que valem olhar

**O campo de confirmação é o e-mail**, como as outras três exclusões permanentes pedem o código do
registro. A comparação é **exata**, sem tolerar espaço nem caixa: o ponto é obrigar a ler a linha certa
antes de apagar.

**A resposta de toda ação da lista aparece acima da tabela**, e falha vem em vermelho com borda. É o
conserto do defeito que você encontrou: a linha pode desaparecer sem levar a mensagem com ela.
