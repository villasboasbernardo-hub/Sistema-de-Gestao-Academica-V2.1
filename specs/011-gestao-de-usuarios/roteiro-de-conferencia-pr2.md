# Reconferência — PR 2 da spec 011: cadastro direto, lista limpa e páginas próprias

> **Para Bernardo Villas Boas.** Oito passos, tudo em **Administração**.
>
> ⚠️ **SEM MIGRATION NESTA RODADA.** Nada estrutural mudou — a trilha `auditoria_de_conta` já foi ao
> remoto em 02/10/2026. **Local e remoto seguem idênticos**, e isso foi reconferido.
>
> ⚠️ **NÃO HÁ MAIS E-MAIL EM NENHUM PASSO.** Nem SMTP, nem link que expira. Você cadastra, o sistema
> mostra a senha **uma vez**, e você a repassa em mãos.
>
> ⚠️ **O PASSO 4 CRIA CONTA DE VERDADE no preview.** Use um e-mail seu, ou faça os passos 4 a 6 no
> LOCAL (`pnpm db:reset && pnpm dev:local`, porta 3000 — nunca a 3100, onde a suíte vive). Os passos 1
> a 3, 7 e 8 são seguros no preview.

**Onde**, medido em 03/10/2026 e estável entre os pushes:

```
https://sistema-de-gestao-academica-v2-1-git-feat-epic-35e53b-ciaara-11.vercel.app
```

⚠️ Ele pede o login da **Vercel** antes do login da aplicação (proteção de deploy). Depois de entrar:
menu → **Administração**.

| #  | Passo                                                                                      | Resultado esperado                                                                                                                                                           |
| -- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1  | Olhar a lista                                                                               | **Cinco colunas**: avatar, nome, e-mail, perfil **em português**, último acesso. ⚠️ Vínculo de instrutor, situação e escopo **saíram** — moram na página da conta                 |
| 2  | Procurar por parte de um nome e de um e-mail; depois **Limpar filtros**                     | A lista filtra, o endereço ganha `?busca=…` (link compartilhável) e o botão desfaz. ⚠️ O botão só aparece quando há filtro                                                      |
| 3  | Procurar **Convidar** ou **Reenviar convite** em qualquer lugar                             | **Não existem.** No lugar, **Cadastrar usuário**. ⚠️ O endereço `/convite` responde **404**: a tela e o código foram removidos, não desligados                                  |
| 4  | **Cadastrar usuário** → nome, e-mail, perfil **Operador** → *Cadastrar*                     | Abre uma **página**, não um formulário na lista. Ao salvar aparece **Senha temporária: XXXX** — 16 caracteres, sem `O`, `0`, `l`, `1` nem `I`. **Copie agora**                    |
| 5  | Dar **F5** nessa tela                                                                       | A senha **não volta**. Ela não está em coluna, log nem endereço — quem perde usa *Redefinir senha* na página da conta                                                           |
| 6  | Sair, entrar com o e-mail novo e a **senha temporária**; tentar ir a **Início** e **Cursos** | Cai direto em **Trocar a minha senha**, e as duas rotas **devolvem** para lá. Definida a nova, **Início abre**. A temporária passa a ser **recusada**; a nova funciona            |
| 7  | Voltar como Admin e clicar no **nome** de outra conta na lista                              | Abre a **página da conta**. Ali estão nome, perfil, escopo, vínculos de curso, vínculo de docente, *Redefinir senha* e *Desativar* — tudo o que saiu da lista                    |
| 8  | Nessa página, **Desativar** → confirmar; voltar à lista; abrir de novo e **Reativar**       | O diálogo diz que a pessoa **perde o acesso** e que **nada é apagado**. Na lista, a conta ganha a etiqueta **Desativada**. Reativar **não** pede confirmação — é desfazer         |

---

## Dois pontos para olhar com atenção

**O perfil `Encarregado de Curso` passou a exigir curso vinculado.** Medido em
`app.cursos_do_usuario()`, não suposto: o alcance desse perfil vem **dos vínculos**, e sem nenhum a
pessoa entra e **não vê curso algum** — sem mensagem de erro, o que se lê como sistema vazio. Tente
cadastrar um sem marcar curso: a recusa diz exatamente isso. ⚠️ **`Operador` sem escopo é o
contrário** — ele vê **tudo** —, então ali não há nada a exigir, e tratar os dois igual recusaria uma
conta perfeitamente boa.

**A sua própria conta não tem ações na página dela**, e a razão está escrita no lugar dos botões. Para
o seu nome e foto, *Meu perfil*; para a sua senha, *Trocar a minha senha*.

---

## Depois do seu "de acordo"

Abro o PR 2. A exclusão permanente de conta (PR 3) **não** começou.
