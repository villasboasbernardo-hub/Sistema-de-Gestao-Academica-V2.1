# Roteiro de conferência — PR 1 da spec 011: sair pelo avatar, a foto e o próprio cadastro

> **Para Bernardo Villas Boas.** Duas partes, e elas não se misturam:
> **LOCAL** é onde se pode gravar e apagar à vontade — a base é descartável por definição.
> **PREVIEW** é dado real. Aqui, diferente do PR 3 da fatia (b), **há coisas a gravar no preview de
> propósito**: a sua foto, o seu nome de exibição e a sua senha são **seus**, e o requisito só se
> confere gravando. O que continua proibido é mexer no cadastro de outra pessoa.
>
> ⚠️ **ESTE PR TEM MIGRATION, E ELA JÁ FOI APLICADA NO REMOTO** — `20260929135747_avatar_e_bucket.sql`,
> com backup datado antes e conferência só de leitura depois. O registro está em
> `plano-de-aplicacao-no-remoto.md`, nesta mesma pasta. Por isso o preview já tem a coluna, o balde e
> as três policies.
>
> ⚠️ **A SUA SENHA DO PREVIEW MUDA DE VERDADE no passo P.6.** Ela é a credencial que você usa todo
> dia. Anote a nova antes de trocar; não há "desfazer" e o e-mail de recuperação continua sendo o
> caminho de volta.

---

## Antes de começar (LOCAL)

```
pnpm db:reset            # base limpa pelas migrations, e recria a sua conta local
pnpm dev:local           # a tela na porta 3000
```

⚠️ **Confira na 3000**, nunca na 3100: a suíte de ponta a ponta derruba e sobe o servidor dela na
3100, e as duas portas existem exatamente para não disputarem (gotcha 7).

O `db:reset` imprime a conta no fim. Se quiser a base com **dado real** para olhar, o caminho é
`python -m scripts.manutencao.dado_do_remoto` — ele lê o remoto, guarda uma cópia datada e recria o
local. ⚠️ **Sem bandeira nenhuma ele recria o banco local**; para só guardar a cópia, é
`--somente-copia`.

Para o passo L.5 você precisa de **duas contas**. A segunda sai de `pnpm conta:local` ou de um
convite pela tela `/admin/usuarios`.

---

# PARTE 1 — LOCAL (pode gravar, pode apagar)

## A. Sair, e trocar de usuário

| #   | Passo                                                                   | Resultado esperado                                                                                                                          |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| L.1 | Entrar em `/login`. Olhar o **canto superior direito** do cabeçalho      | Há um botão redondo com as **suas iniciais** (ou a foto, se houver). O rótulo dele é *"Conta de &lt;seu nome&gt;"*                            |
| L.2 | Clicar no botão                                                          | Abre um menu com **duas** entradas: **Meu perfil** e **Sair**, e o seu **e-mail** por baixo do nome                                           |
| L.3 | Fechar com `Esc`, reabrir com `Enter`, e andar com `↓`                   | Abre com **Meu perfil** já focado; `↓` leva a **Sair**. ⚠️ Era o que faltava desde o Épico 3: `encerrarSessao()` existia **sem um consumidor** |
| L.4 | Clicar em **Sair**                                                       | Volta para `/login`. Tentar voltar pelo botão do navegador **não** reabre a aplicação — a sessão acabou no servidor, não só na tela            |
| L.5 | Entrar com a **segunda conta**, e abrir o menu do avatar                 | O menu mostra o nome e o e-mail **da segunda conta**. ⚠️ Nada da primeira sobra: trocar de usuário é sair e entrar, não "trocar de perfil"     |

## B. O próprio cadastro: nome, foto e o que não muda

| #    | Passo                                                                         | Resultado esperado                                                                                                                                |
| ---- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| L.6  | Menu do avatar → **Meu perfil**                                               | Abre `/perfil`, com o título **Meu perfil** e três blocos: **Foto**, **Nome** e **O que não muda aqui**                                             |
| L.7  | No bloco **O que não muda aqui**, ler                                         | Mostra o **e-mail** e o **perfil de acesso**, em português (*"Administrador"*, não `admin`), e diz que o e-mail **não é editável por ninguém**      |
| L.8  | Trocar o **nome de exibição** → **Gravar nome**                               | *"Nome atualizado."* — e o botão do cabeçalho passa a dizer **Conta de &lt;novo nome&gt;** na mesma hora, com as **iniciais novas**                 |
| L.9  | Tentar gravar o nome **vazio**                                                | **Recusado**, com a razão em português. Nada é gravado                                                                                              |
| L.10 | No bloco **Foto**, escolher um **JPG ou PNG** e clicar **Enviar foto**        | *"Foto atualizada."* e a foto aparece **no bloco e no cabeçalho**                                                                                   |
| L.11 | Enviar **outra** foto por cima                                                | Substitui. ⚠️ O arquivo vai sempre para o **mesmo caminho** (`<sua conta>/avatar`), então não há acúmulo — uma foto por conta, e só                 |
| L.12 | Clicar **Remover foto**                                                       | A mensagem diz que **voltou às iniciais**, e o cabeçalho volta a mostrá-las                                                                          |
| L.13 | **O caso que discrimina (tamanho):** escolher uma imagem de **3 MB**          | **Recusada**, com *"A foto passou de 2 MB."* — e a recusa aparece **antes de subir o arquivo**                                                       |
| L.14 | **O caso que discrimina (tipo):** renomear um `.gif` para `.png` e enviar     | **Recusada**, com *"A foto precisa ser JPG ou PNG, de até 2 MB."* ⚠️ Quem recusa aqui é o **motor**, não o formulário — ver a nota abaixo            |

> ⚠️ **Por que L.13 e L.14 são os casos que discriminam.** O limite de 2 MB e os dois tipos estão
> escritos **três vezes**: no `accept` do campo (conveniência do navegador), na ação do servidor
> (Zod) e — o que garante — **na definição do balde**, em `storage.buckets.file_size_limit` e
> `allowed_mime_types`. Um teste que só usasse o formulário daria o mesmo veredito com as duas
> primeiras apagadas. É o modo de falha do Épico 3, quando o mínimo de senha existia **só** no
> formulário e era alcançável por chamada direta.

## C. A própria senha

| #    | Passo                                                              | Resultado esperado                                                                                                     |
| ---- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| L.15 | Em `/perfil`, clicar **Trocar a minha senha**                       | Abre `/perfil/senha`, com o título **Trocar a minha senha**                                                             |
| L.16 | Digitar uma senha de **8 caracteres** e confirmar                    | **Recusada**, com a frase da **regra** — ela diz **12** —, e **não** com *"inválida"* nem com texto em inglês do Auth    |
| L.17 | Digitar duas senhas **diferentes** nos dois campos                   | **Recusado antes de qualquer envio**, dizendo que não **coincidem** — e sem falar em 12 caracteres, que não é o problema |
| L.18 | Digitar uma senha válida nos dois campos → **Trocar senha**          | *"Senha trocada"*                                                                                                       |
| L.19 | Sair pelo menu do avatar e entrar com a **senha nova**               | Entra                                                                                                                   |
| L.20 | Sair e tentar entrar com a **senha antiga**                          | **Recusado**                                                                                                            |

---

# PARTE 2 — PREVIEW (dado real; grava só o que é seu)

Abra `https://sistema-de-gestao-academica-v2-1.vercel.app` — é a Production, que serve o preview por
exceção registrada (`FR-016.1`), e ela roda a `main`. ⚠️ **Enquanto este PR não for mesclado, a
`main` ainda não tem as telas** — o que já está lá é a **migration**. Portanto:

- **P.0 a P.2** valem **agora**, contra o preview do PR (a URL que a Vercel publica para este ramo,
  no comentário do PR).
- **P.3 em diante** valem **no preview do ramo** também; repeti-los na Production depois do merge é
  a conferência de que o merge não mudou nada.

| #   | Passo                                                                          | Resultado esperado                                                                                                                                       |
| --- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P.0 | Entrar com a **sua** conta                                                      | Entra como sempre. ⚠️ O remoto tem **5 usuários** e **1 credencial** — a sua                                                                                 |
| P.1 | Abrir qualquer tela de cadastro (Cursos, Instrutores, Disciplinas) e **só olhar** | Tudo como antes da migration: **24 cursos · 28 turmas · 177 instrutores · 175 disciplinas · 587 UEs**. A coluna nova é **vazia** em todas as 5 contas        |
| P.2 | Olhar o cabeçalho                                                                | O botão do avatar mostra as **suas iniciais**. Ninguém tem foto ainda — o balde nasceu vazio                                                                 |
| P.3 | Menu do avatar → **Sair** → entrar de novo                                       | Sai e volta. ⚠️ **É o defeito que originou esta spec**: até aqui não havia como sair sem limpar o navegador                                                  |
| P.4 | **Meu perfil** → trocar o seu **nome de exibição** → **Gravar nome**              | *"Nome atualizado."* ⚠️ **Isto grava dado real, e é o certo**: o remoto é a fonte da verdade dos cadastros, e quem testa edita pelo preview                  |
| P.5 | Enviar a **sua** foto → conferir no cabeçalho → **Remover foto** → conferir       | A foto aparece e some, e as iniciais voltam. ⚠️ **O arquivo permanece no balde**, invisível — ver a pendência **STORAGE-1** no fim deste roteiro             |
| P.6 | **Trocar a sua senha** e entrar com ela                                           | Entra com a nova; a antiga é recusada. ⚠️ **Anote a nova antes**: é a credencial real da sua conta                                                           |
| P.7 | Tentar abrir a foto de outra pessoa por endereço direto                          | Não há endereço a tentar: o balde é **privado** e o endereço de leitura é **temporário**, de 30 minutos, assinado com a **sua** sessão — nunca `service_role` |

---

## O que eu preciso que você decida — a pendência STORAGE-1

**A `FR-014` pede que a pessoa possa remover a própria foto, e isso funciona**: a tela volta às
iniciais porque `usuarios.avatar_caminho` fica nulo. **O arquivo, porém, continua no balde.**

O caminho direto seria uma policy `for delete` em `storage.objects`, restrita ao dono — e foi o que a
migration tinha na primeira escrita. ⚠️ **Ela quebrou a asserção 13 de
`supabase/tests/107_exclusao_com_rastro.sql`**, que conta policies de `DELETE` em **todo** o catálogo
e codifica a **regra 4** do `CLAUDE.md`: *"Nenhuma tabela tem policy `FOR DELETE` [...] PR que
acrescenta `for delete` é rejeitado sem discussão."*

**Não emendei a guarda.** A regra 4 tem mecanismo de exceção — nominal, delimitada e registrada —, e
ele é seu, não de quem escreve a migration. As opções:

| Opção                                                    | O que muda                                                                                                                                | Custo                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **(a) Fica como está** *(recomendada)*                    | Nada. Remover foto anula a coluna; o arquivo fica, **limitado a um por conta** e invisível                                                  | Um arquivo órfão por conta que já teve foto. Hoje: **zero**                                       |
| **(b) Exceção nominal para `storage.objects`**            | Uma quarta policy, `avatares_remover`, só do dono; e a asserção 13 passa a dizer *"zero `DELETE` em `public`, e em `storage` só esta"*      | Abre a primeira brecha na regra 4 fora das três tabelas já excetuadas, e num schema da plataforma |
| **(c) Faxina periódica por script de manutenção**         | Um script versionado, rodado à mão, apaga arquivo sem `avatar_caminho` correspondente                                                       | Script novo, e ele usa `service_role` — quarto uso autorizado, que hoje são três                  |

**Recomendo a (a)** enquanto o lixo for um arquivo por conta e invisível. A (b) troca um problema de
espaço — que não existe nesta escala — por uma exceção numa regra que o projeto inteiro apoia.

---

## Depois do seu "de acordo"

Abro o PR 1 (T014). O critério de merge é: **T011 verde** (feito), **T012 aplicada e conferida**
(feito, registro em `plano-de-aplicacao-no-remoto.md`) e **este roteiro com o seu de acordo**.
