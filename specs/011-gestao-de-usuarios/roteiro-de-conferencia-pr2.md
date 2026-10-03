# Conferência do PR 2 — gestão de contas, de ponta a ponta

> **Para Bernardo Villas Boas.** Um roteiro só, cobrindo **cadastrar, redefinir senha, desativar,
> reativar e excluir**. Tudo em **Administração**.
>
> ⚠️ **ESTA RODADA TEM MIGRATION** — `20261003000205_exclusao_de_conta.sql` —, aplicada no remoto pelo
> rito: backup antes, dry-run só com ela, conferência só de leitura depois. O registro está em
> `plano-de-aplicacao-no-remoto.md`.
>
> ⚠️ **NÃO HÁ E-MAIL EM NENHUM PASSO.** Você cadastra, o sistema mostra a senha **uma vez**, e você a
> repassa em mãos. As opções de envio por e-mail estão levantadas no relatório, sem nada implementado.
>
> ⚠️ **OS PASSOS 4 A 9 CRIAM E APAGAM CONTA DE VERDADE.** No preview, use e-mails seus; ou faça-os no
> LOCAL (`pnpm db:reset && pnpm dev:local`, porta **3000** — nunca a 3100, onde a suíte vive).
> **Nunca** exclua a sua própria conta: o passo 3 existe para você ver que a tela não oferece isso.

**Onde:** o endereço do ramo na Vercel sai no comentário do PR.

## A lista

| #  | Passo                                                                | Resultado esperado                                                                                                                                       |
| -- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | Menu → **Administração**                                              | **Seis colunas**: avatar, nome, e-mail, perfil **em português**, último acesso e **Ações**. ⚠️ Vínculo de instrutor, situação e escopo continuam **fora**     |
| 2  | Olhar a coluna **Ações** de outra conta                               | **Redefinir senha · Desativar · Excluir**, visíveis direto. Clicar no **nome** abre a página da conta                                                       |
| 3  | Olhar a **sua própria** linha                                         | **Nenhum** botão. No lugar: *"sua conta — peça a outro Administrador"*                                                                                     |

## Cadastrar e o primeiro acesso

| #  | Passo                                                                | Resultado esperado                                                                                                                                       |
| -- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4  | **Cadastrar usuário** → nome, e-mail, perfil **Operador** → salvar    | Abre **página própria**. Ao salvar, **Senha temporária: XXXX** — 16 caracteres, sem `O`, `0`, `l`, `1` nem `I`. **Copie.** Dar F5 a perde                   |
| 5  | Trocar o perfil para **Encarregado de Curso** num cadastro novo       | A lista de **cursos vinculados** aparece — e **só** para esse perfil. Salvar sem marcar nenhum é **recusado**, com a razão                                 |
| 6  | Sair, entrar com o e-mail novo e a **temporária**; tentar **Início**   | Cai em **Trocar a minha senha** e não sai de lá. Definida a nova, **Início abre**; a temporária passa a ser **recusada**                                   |

## Desativar, reativar e excluir

| #  | Passo                                                                | Resultado esperado                                                                                                                                       |
| -- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7  | Numa conta, **Desativar** → ler o diálogo → confirmar                 | O diálogo diz que ela **perde o acesso**, que **nada é apagado** e que isto **NÃO é exclusão**. A linha ganha a etiqueta **Desativada** e fica na lista      |
| 8  | **Reativar** a mesma conta                                            | Volta a ativa, **sem pedir confirmação** — é desfazer                                                                                                     |
| 9  | Numa conta **recém-cadastrada que nunca usou o sistema**, **Excluir** | O diálogo começa com *"A exclusão é permanente."* e diz que ela **não registrou nada**, então o cadastro **sai inteiro** e o **e-mail fica livre**           |
| 10 | Confirmar, e tentar cadastrar **o mesmo e-mail** de novo              | A conta sai da lista, com aviso acima da tabela. O e-mail **é aceito** num cadastro novo                                                                   |
| 11 | Numa conta que **já trocou a senha** (ou gravou algo), **Excluir**    | O diálogo diz que ela **registrou histórico**, então o cadastro fica como **«Conta excluída»** e sai da lista — e o e-mail também fica livre                 |
| 12 | Depois de confirmar, tentar **entrar** com a senha dessa conta        | **Recusado.** A credencial foi apagada nos dois caminhos                                                                                                  |

---

## As três coisas que valem olhar com atenção

**Desativar e excluir são diferentes, e os diálogos dizem isso.** Desativar **bloqueia o acesso e
mantém cadastro e perfil**; excluir **não tem desfazer**. O diálogo de desativar diz, com estas
palavras, que *não é exclusão*.

**A exclusão tem dois desfechos, e o diálogo pergunta ao servidor antes de abrir.** Conta que nunca
registrou nada **sai inteira**. Conta que registrou **fica anonimizada** — nome *"Conta excluída"*,
e-mail trocado por um sentinela, foto removida, fora da lista — para que `criado_por` dos registros
antigos continue resolvendo num nome em vez de um identificador sem dono. ⚠️ **Nos dois casos o
e-mail volta a estar livre**, que é o que você pediu.

**O vínculo de instrutor saiu da tela.** Nenhuma policy e nenhuma função de autorização leem
`usuarios.instrutor_id` — medido. ⚠️ **A coluna do banco não foi tocada** e nenhum vínculo existente
foi desfeito: a tela deixou de oferecê-lo, e ele continua impedindo que se apague um docente com conta
ligada.

---

## Depois do seu "de acordo"

Abro o PR 2.
