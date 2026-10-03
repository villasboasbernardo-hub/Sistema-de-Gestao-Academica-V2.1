# Implementation Plan: Gestão de usuários

**Branch**: `feat/EPICO-3-gestao-de-usuarios` · **Spec**: [spec.md](./spec.md) · **Data**: 29/09/2026

**Entrada**: as oito dúvidas decididas por **Bernardo Villas Boas em 29/09/2026**
([Clarifications](./spec.md)). Nenhuma trava o plano.

**Leia antes**: [`estado-atual.md`](./estado-atual.md) — o retrato medido do que já existe.

---

## ⚠️ Emenda de 03/10/2026 — as seis decisões D-USR, e o que elas mudaram neste plano

*(decisões de **Bernardo Villas Boas**, **03/10/2026**, nas duas reconferências do PR 2 —
**definitivas**)*

| # | Decisão |
|---|---|
| **D-USR-1** | **Convite por e-mail PERMANENTEMENTE removido; nenhum envio de e-mail** em parte alguma do sistema |
| **D-USR-2** | **Cadastro pelo Admin**, com **senha temporária mostrada uma vez** e **troca obrigatória no primeiro acesso** |
| **D-USR-3** | O Admin **exclui permanentemente qualquer conta** — menos a própria e o último Admin ativo —, **em qualquer estado**; o **e-mail fica liberado** para um novo cadastro |
| **D-USR-4** | **Confirmação simples, sem digitar nada** |
| **D-USR-5** | **Editar em página própria**: nome, perfil e acessos |
| **D-USR-6** | **Em cada linha**: Editar · Redefinir senha · Desativar/Reativar · Excluir |

⚠️ **ESTE PLANO FOI ESCRITO EM 29/09/2026, ANTES DELAS**, e por isso ele **não** descreve o caminho
de criação de conta que vale hoje. O que a **D-USR-1** e a **D-USR-2** substituíram vivia fora deste
arquivo — o convite por e-mail do Épico 3 —, e por isso **não há frase de convite a emendar aqui**;
o que há são **três pontos do corpo que caducaram**, marcados onde estão, **não apagados**:

1. a tela do **PR 2** (*"editar e redefinir na `/admin/usuarios`"*) → **página própria** (D-USR-5) e
   **as quatro ações em cada linha** (D-USR-6);
2. o diálogo do **PR 3** (*"exclusão com código digitado"*) → **confirmação simples** (D-USR-4);
3. a **fronteira entre o PR 2 e o PR 3**: medido no repositório em 03/10/2026, no ramo
   `feat/EPICO-3-admin-sobre-contas`, o que este plano reservava ao PR 3 já está **junto** — a
   migration `20261003000205_exclusao_de_conta.sql`, a ação `excluirConta` em
   `lib/acoes/usuarios.ts` e as quatro ações de `AcoesDaLinha.tsx` convivem com o PR 2.

⚠️ **O caminho de criação de conta que vale HOJE, medido no repositório em 03/10/2026:** não existem
`/convite` nem `/recuperar-senha`, e `inviteUserByEmail`, `resetPasswordForEmail` e qualquer envio de
e-mail **não existem** em lugar nenhum — com guarda que reprova se voltarem
(`tests/unidade/sem-convite-nem-envio-de-email.test.ts`). O caminho **único** é
`auth.admin.createUser()` dentro de `cadastrarUsuario`, em `lib/acoes/usuarios.ts`, pela tela
`app/(app)/admin/usuarios/novo/`.

---

## Technical Context

**Nada de novo na plataforma.** Next.js 16 + React 19 + Supabase, como está.

| Decisão | Valor | Medido em |
|---|---|---|
| Avatar e menu | do pacote `radix-ui` **já instalado**, copiados para `components/ui/` no padrão shadcn | R-2 |
| Senha gerada | `crypto.randomInt`, da biblioteca padrão | R-7 |
| Derrubar sessões | **nada a fazer** — redefinir a senha já revoga | **R-1** |
| Limite da foto | **no bucket** (`file_size_limit`, `allowed_mime_types`), além do código | **R-3** |
| A obrigação de trocar senha | `app_metadata`, lida na `renovarSessao` que **já** chama `auth.getUser()` | R-4 |
| Trilha de auditoria | tabela **nova**, quatro campos, no molde de `exclusoes_registradas` | R-5 |
| Reativar | `usuarios.desativar`, **sem tocar a matriz** | R-6 |

**Nenhum `NEEDS CLARIFICATION` restou.** As três perguntas que o plano tinha foram **medidas**, e duas
delas eliminaram trabalho que eu teria pedido.

---

## Constitution Check

| Princípio | Situação |
|---|---|
| **I** Fidelidade à Fase 1 | ✅ `RF-AUTH-08` (encerrar sessão) é requisito da spec 004 **nunca entregue**; esta fatia o entrega |
| **II** Preservação de regras | ✅ nenhuma regra do documento 04 é tocada |
| **III** Restrição de plataforma | ✅ **zero** dependência nova; Avatar e menu do pacote já instalado |
| **IV** Integridade do histórico | ✅ trilha append-only, imutável inclusive para a `service_role`; exclusão só pela exceção D-B1, com retrato |
| **V** Degradação segura | ✅ conta sem foto mostra iniciais; conta sem credencial não oferece redefinir |
| **VI** Mudança validada por invariante | ✅ 9 invariantes, e o caso que discrimina em cada teste novo |
| **VII** Configuração sobre constante | ⚠️ **o limite de 2 MB e os tipos são CONSTANTE**, e de propósito: eles são da `FR-012`, não parâmetro normativo. Ficam no bucket e no domínio, num lugar só |
| **VIII** Rastreabilidade | ✅ é o que a `FR-047` constrói |
| **IX** Contenção de escopo | ✅ gestão de acesso é da CIAARA-11 |
| **X** Paridade antes de novidade | ✅ **paridade**: a v2.0 tinha sair, trocar senha e administrar usuário |
| **XI** O banco é a fronteira | ✅ último admin, autoescalonamento e impedimentos decidem **no banco**; o domínio puro só evita oferecer o impossível |

**Nenhuma violação a justificar.**

---

## O plano, em três PRs

⚠️ **Três, e a ordem é a do risco**: o que destrava o teste vem primeiro, o que mexe em credencial
vem depois, o que apaga vem por último.

### PR 1 — Sair, o avatar e o próprio cadastro *(US1, US2, US3)*

O que destrava o teste da fatia (b). **Uma migration** (a coluna do avatar, o bucket e as policies).

1. `components/ui/avatar.tsx` e `dropdown-menu.tsx`, copiados e versionados.
2. `lib/dominio/iniciais-do-nome.ts` e `politica-de-senha.ts` — puros, com Vitest.
3. `lib/dominio/perfis.ts` — os **nove** em português, **agrupados por divisão** (D-1). Um módulo, e
   o teste que compara a lista com o enum gerado, para não envelhecer.
4. O menu do avatar no cabeçalho, ligando a `encerrarSessao()` **que já existe**.
5. `/perfil` e `/perfil/senha`, com os caminhos clicáveis.
6. M1 — `usuarios.avatar_caminho`, bucket `avatares` e **três** policies. ⚠️ **Eram quatro neste plano, e a quarta era de `DELETE`.** Ela foi removida na implementação, em 29/09/2026: a asserção 13 de `supabase/tests/107_exclusao_com_rastro.sql`, que codifica a **regra 4**, conta policies de `DELETE` em **todo** o catálogo, sem filtro de schema — e reprovou. A guarda **não** foi emendada; a policy é que saiu, e `removerFoto` passou a **anular a coluna** sem chamar `remove()`. Se `storage.objects` deve ou não ser exceção à regra 4 é a pendência **STORAGE-1**, de Bernardo.

**Merge quando**: `verificar:tudo` verde, M1 no remoto com backup, e a conferência de Bernardo.

### PR 2 — O Admin sobre outras contas *(US4, US5)*

**Uma migration** (a trilha e a função que grava nela).

1. `lib/dominio/ultimo-admin.ts` — puro, com o caso que discrimina.
2. M2 — `auditoria_de_conta`, os dois gatilhos de imutabilidade, e a função `SECURITY DEFINER` que
   grava.
3. `redefinirSenha` e `editarConta` em `lib/acoes/usuarios.ts` — **onde a chave já é permitida**.
4. A obrigação de trocar senha na `renovarSessao`.
5. A tela: editar e redefinir na `/admin/usuarios`, com o aviso de senha de uma vez só.
   ⚠️ **EMENDADO em 03/10/2026** *(decisão de Bernardo Villas Boas, **D-USR-5** e **D-USR-6**)*:
   editar passou a ter **página própria** — `/admin/usuarios/[id]`, com nome, perfil e acessos —, e a
   lista ficou com **quatro ações em cada linha**: Editar · Redefinir senha · Desativar/Reativar ·
   Excluir. ⚠️ *(Registro anterior, vencido: "editar e redefinir na `/admin/usuarios`".)* Nas palavras
   dele, na reconferência: *"Editar usuário abre PÁGINA própria. (…) Nada de diálogo sobre diálogo na
   lista."* **O aviso de senha de uma vez só não mudou** — ele continua na linha que pediu a
   redefinição.

**Merge quando**: o percurso do passo 3 do quickstart inteiro, M2 no remoto, e a conferência.

### PR 3 — Reativar e excluir *(US6)*

**Uma migration** (as funções de exclusão e o `CHECK` estendido).

1. `lib/dominio/impedimentos-de-conta.ts` — puro.
2. M3 — `app.impedimentos_de_exclusao_da_conta`, `app.excluir_conta`, os invólucros de `public`, e o
   `CHECK` de `exclusoes_registradas` aceitando `usuarios`.
3. `reativar` e `excluirConta` nas ações.
4. A tela: reativar, e o diálogo de exclusão com código digitado.
   ⚠️ **EMENDADO em 03/10/2026** *(decisão de Bernardo Villas Boas, **D-USR-4**)*: a confirmação da
   exclusão de conta é **simples, sem campo para digitar**. ⚠️ *(Registro anterior, vencido: "o
   diálogo de exclusão com código digitado".)* A analogia com as **três** exclusões permanentes do
   domínio acadêmico — instrutor, disciplina e UE, que pedem o código do registro — **foi recusada**:
   aqui o cartão **nomeia a conta e o e-mail dentro da própria pergunta**, e é a pergunta que a pessoa
   lê antes de clicar. ⚠️ **As outras três exclusões seguem com o código digitado**, e a divergência é
   escolhida, não descuido. Medido em 03/10/2026: `public.excluir_conta(p_conta_id uuid)` recebe **só
   o alvo**, e `esquemaDeExclusao` em `lib/validacao/usuarios.ts` tem **um** campo — o
   `codigo_nao_confere` com `22023` continua existindo, mas **para disciplina e UE**, na migration
   `20260925135044_exclusao_com_rastro.sql`.
5. A reversão executada e os defeitos deliberados.

**Merge quando**: `verificar:tudo` verde, M3 no remoto, e a conferência.

---

## Estrutura

```
lib/dominio/            iniciais-do-nome · politica-de-senha · perfis · ultimo-admin · impedimentos-de-conta
lib/acoes/              perfil.ts (novo) · usuarios.ts (estendido) · sessao.ts (já existe)
lib/supabase/           middleware.ts (a obrigação)
components/ui/          avatar.tsx · dropdown-menu.tsx
components/casca/       cabecalho-do-app.tsx (o menu)
app/(app)/perfil/       page.tsx · senha/page.tsx + folhas de cliente
app/(app)/admin/usuarios/  as ações novas
supabase/migrations/    M1 · M2 · M3
supabase/tests/         113_auditoria_de_conta.sql · 114_avatares_storage.sql
tests/invariantes/rls/  gestao-de-usuarios.test.ts
tests/e2e/              sair-e-perfil.spec.ts · redefinir-senha.spec.ts
```

---

## Índice da pesquisa

R-1 revogação de sessão · R-2 Avatar sem pacote novo · R-3 o limite no bucket · R-4 onde mora a
obrigação · R-5 a trilha nova · R-6 reativar sem tocar a matriz · R-7 a senha por `crypto` · R-8 a
recusa de exclusão · R-9 o que não se refaz · R-10 o domínio puro. Ver [research.md](./research.md).

---

## Complexity Tracking

**Vazio.** Nenhuma violação da constituição a justificar.

---

## Riscos, com o que fazer

| Risco | O que fazer |
|---|---|
| **A marca em `app_metadata` some num caminho não previsto** e a pessoa fica presa fora, ou solta dentro | o e2e do passo 3 percorre os **nove** passos, incluindo tentar três rotas; e a marca só é escrita e apagada em **dois** lugares, ambos no servidor |
| **`storage.objects` passa a ter policy pela primeira vez** | a invariante I-5 fixa em **exatamente quatro**, todas do bucket `avatares`; uma quinta acusa |
| **A varredura do quarto impedimento** (autoria em 21+ tabelas) fica cara ou envelhece | ela lê o **catálogo**, não uma lista à mão; e o defeito deliberado do PR 3 tira uma tabela do caminho para ver a recusa sumir |
| **Redefinir senha derruba a sessão de quem está no meio de um lançamento** | é o efeito pedido (D-4), e por isso `redefinir_senha` entra na lista de confirmação |
