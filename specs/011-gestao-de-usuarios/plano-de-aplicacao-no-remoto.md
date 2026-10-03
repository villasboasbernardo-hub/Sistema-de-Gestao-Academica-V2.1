# Aplicação no remoto — spec 011, PR 1 (T012)

> **Uma migration só**: `20260929135747_avatar_e_bucket.sql` — a coluna `usuarios.avatar_caminho`,
> o balde privado `avatares` e **três** policies em `storage.objects`.
>
> ⚠️ **APLICAR NO REMOTO É APLICAR TAMBÉM NA PRODUCTION** (AMBIENTE-1): preview e Production
> compartilham o mesmo projeto Supabase até o dia da virada. A `main` que a Production roda passa a
> falar com o banco novo **antes** do merge — é por isso que a migration vai antes, e não depois.

## Autorização

**Bernardo Villas Boas, 29/09/2026**, nesta sessão, com estas palavras: *"Com o CI verde, feche a
T011 e siga para a T012 (aplicação no remoto, com backup antes, dry-run só com as migrations dela e
conferência depois)"*. O CI ficou verde nos três blocos sobre `35aa0ae`, o commit que traz o código e
a migration (run `36618521426`).

## O rito, na ordem em que foi executado

| # | Passo | Resultado medido |
|---|---|---|
| 1 | **Backup**, `python -m scripts.manutencao.dado_do_remoto --somente-copia` | `remoto-20260929-164954.sql`, **1794 KB**, em `%LOCALAPPDATA%\ciaara-11\copias-do-remoto\` — fora do git. ⚠️ **A cópia não traz o schema `auth`**: um remoto restaurado a partir dela teria os cadastros e nenhuma senha |
| 2 | **Dry-run**, `supabase db push --linked --dry-run` | *"Would push these migrations: • 20260929135747_avatar_e_bucket.sql"* — **uma só**, nenhum `seed`, nenhum `role` |
| 3 | **Aplicação**, `pnpm db:push` | `Applying migration 20260929135747_avatar_e_bucket.sql...` · `upToDate:false, dryRun:false` · saída **0** |
| 4 | **Retrato depois**, `--somente-copia` de novo | `remoto-20260929-165201.sql` — é ele que sustenta a conferência 3 abaixo |

## A conferência, só por leitura

### 1. As migrations, dos dois lados

**46 entradas, as 46 presentes nos dois bancos**, nenhuma só de um lado. A última é
`20260929135747`. Antes do passo 3, a mesma lista trazia essa única com o lado remoto **vazio** — que
é exatamente o que o dry-run mostrou.

### 2. O esquema, objeto a objeto

`scripts/provas/impressao_digital_do_esquema.sql` nos dois bancos:

| | Objetos | md5 do conjunto |
|---|---|---|
| Local | **1.565** | `9d66eb3d4fb9ccfec1a816ce251e9b5e` |
| Remoto | **1.565** | `9d66eb3d4fb9ccfec1a816ce251e9b5e` |

E a comparação **linha a linha** das 1.566 linhas de saída (1.565 objetos + o resumo): **diff
vazio**, zero linhas só de um lado.

⚠️ **A impressão digital cobre `public` e `app`, não `storage`** — `auth`, `storage` e o resto são
da plataforma e diferem por versão do CLI. O balde e as policies são conferidos à parte, abaixo.

### 3. Zero linhas de `usuarios` alteradas

O retrato de dados de **antes** do push (`remoto-20260929-164954.sql`) e o de **depois**
(`remoto-20260929-165201.sql`) diferem em **exatamente uma coisa**, além do par de linhas de
`\restrict`/`\unrestrict` que o `pg_dump` sorteia a cada execução:

```
< INSERT INTO "public"."usuarios" (… "editado_por", "editado_em") VALUES
> INSERT INTO "public"."usuarios" (… "editado_por", "editado_em", "avatar_caminho") VALUES
```

— a **coluna nova** aparece na lista, com `NULL` nas **cinco** linhas. Todo o resto é byte a byte
idêntico, e o arquivo inteiro (1,8 MB, 55 tabelas) não tem outra diferença.

> ⚠️ **E AQUI HOUVE UM SUSTO QUE VALE FICAR REGISTRADO, PORQUE O INSTRUMENTO ESTAVA ERRADO.**
> A primeira conferência foi por **md5 do conteúdo de `usuarios`**, tirado antes e depois — e ele
> **mudou**: `ca2bf680…` → `e88493d2…`. A leitura fácil era *"a migration mexeu em linha"*, e não
> mexeu. O que mudou foi a linha de `USR-ADMIN-001`, em **duas colunas de carimbo**: `ultimo_acesso`
> e `editado_em`, de `19:28` para `19:46` UTC. ⚠️ **A mudança é ANTERIOR ao push**, e o que prova a
> ordem é o backup: o retrato tirado **imediatamente antes** do `db push` já trazia o valor novo.
> Alguém — ou a própria Production — acessou a conta naquele intervalo, que é o uso normal do
> preview.
>
> ⚠️ **A LIÇÃO É SOBRE O INSTRUMENTO, NÃO SOBRE O DADO:** num sistema **vivo**, impressão digital
> que inclui carimbo de acesso não serve de "antes e depois" — ela muda sozinha, e muda justamente
> enquanto a operação acontece. O que serve é **comparar os dois retratos datados**, que é o que a
> conferência 3 faz, e é o que ficou como o modo de conferir daqui para frente.

### 4. O balde, a RLS e a ausência deliberada

| O quê | Medido no remoto |
|---|---|
| `storage.buckets` | **1** balde: `avatares`, `public = false`, `file_size_limit = 2097152`, `allowed_mime_types = {image/jpeg,image/png}` |
| `storage.objects` — linhas | **0** — o balde nasce vazio |
| `storage.objects` — policies | **3**: `avatares_ler` (SELECT), `avatares_escrever` (INSERT), `avatares_trocar` (UPDATE), todas para `authenticated` |
| Policies de `DELETE` no **catálogo inteiro** | **0** — a regra 4 continua inteira |
| `usuarios.avatar_caminho` | Existe, anulável, **5 de 5 contas com `NULL`** |

⚠️ **A quarta policy não existe, e a ausência é a decisão pendente `STORAGE-1`.** O rascunho tinha
`avatares_remover`; ela quebrou a asserção 13 de `supabase/tests/107_exclusao_com_rastro.sql`, que
codifica a regra 4 contando `polcmd = 'd'` em todo o catálogo. **A guarda não foi emendada** — a
policy é que saiu, e `removerFoto` passou a anular a coluna sem chamar `remove()`.

### 5. A Production, respondendo como antes

| Rota | Antes | Agora |
|---|---|---|
| `/` | 307 → login | **307** |
| `/login` | 200 | **200** |
| `/cursos`, `/instrutores`, `/disciplinas`, `/admin/usuarios` | 307 → login | **307** |

Nenhum erro novo. ⚠️ **A Production roda a `main`, que ainda não tem as telas deste PR** — o que já
está lá é a estrutura. Uma coluna anulável a mais não é vista por código que não a pede.

## Reversão, se for preciso

Está escrita no cabeçalho da própria migration e foi executada numa base descartável antes do PR:

```sql
drop policy if exists avatares_trocar   on storage.objects;
drop policy if exists avatares_escrever on storage.objects;
drop policy if exists avatares_ler      on storage.objects;
delete from storage.buckets where id = 'avatares';   -- só se não houver objeto
alter table public.usuarios drop column if exists avatar_caminho;
```

⚠️ **O `drop column` só é seguro enquanto a coluna estiver vazia** — hoje está, nas cinco contas.
Com foto cadastrada, a convenção de banco manda virá-la comentário `[APOSENTADA]` e deixá-la.
⚠️ **E os arquivos já enviados não voltam**: apagar o balde com objeto dentro perderia dado que
ninguém mandou apagar. Hoje o balde tem **zero** objetos.

---

# PR 2 — `20261002195248_auditoria_de_conta.sql` (T024)

**Autorização:** Bernardo Villas Boas, nesta sessão: *"Siga direto para o PR 2 … na mesma sequência:
implement → verificar:tudo → subir → CI verde → backup → dry-run → migration no remoto."* CI verde nos
três blocos sobre `3b65a61` (run `37062800080`).

| # | Passo | Resultado medido |
|---|---|---|
| 1 | **Backup**, `--somente-copia` | `remoto-20261002-175617.sql`, fora do git |
| 2 | **Dry-run** | *"Would push: • 20261002195248_auditoria_de_conta.sql"* — **uma só**, sem `seed` nem `role` |
| 3 | **Aplicação**, `pnpm db:push` | `Applying migration …` · saída **0** |
| 4 | **Retrato depois** | `remoto-20261002-175711.sql` — é ele que sustenta a conferência 2 |

## A conferência, só por leitura

**1. Migrations:** **47 entradas, as 47 nos dois bancos**, nenhuma só de um lado; a última é
`20261002195248`.

**2. Zero linhas pré-existentes alteradas.** O `diff` dos dois retratos de dados traz **uma coisa só**,
além do par de linhas de RESTRICT/UNRESTRICT que o `pg_dump` sorteia a cada execução: o **cabeçalho da
tabela nova**, `-- Data for Name: auditoria_de_conta`, **sem nenhuma linha de dado**. `usuarios` não tem
uma única diferença.

⚠️ **Esta é a lição do gotcha 13 aplicada:** a conferência é o `diff` dos **dois retratos datados**, e
não um md5 de conteúdo — que num banco vivo muda sozinho por carimbo de acesso, justamente enquanto a
operação acontece.

**3. Esquema, objeto a objeto:**

| | Objetos | md5 do conjunto |
|---|---|---|
| Local | **1.589** | `1e5e35cc74c63257b72b1e609fd50204` |
| Remoto | **1.589** | `1e5e35cc74c63257b72b1e609fd50204` |

Comparação **linha a linha** das 1.590 linhas de saída: **diff vazio**.

**4. A trilha nasce vazia e fechada:**

| O quê | Medido no remoto |
|---|---|
| Linhas em `auditoria_de_conta` | **0** — ela nasce vazia |
| Policies | **1**, e de `SELECT` |
| `INSERT`/`UPDATE`/`DELETE`/`TRUNCATE` para `authenticated`/`anon` | **0** |
| Gatilhos não internos | **2** — o de `update`/`delete` e o de `truncate` |
| Policies de `DELETE` no **catálogo inteiro** | **0** — a regra 4 continua inteira |
| Contas em `usuarios` | **5**, intactas |

**5. Production respondendo como antes:** `/login` **200**; `/`, `/perfil`, `/admin/usuarios`,
`/cursos` e `/disciplinas` **307** para o login. Nenhum erro novo.

## Reversão

No cabeçalho da migration. ⚠️ **`drop table` só se a tabela estiver VAZIA** — hoje está. Com linha
dentro, apagar a tabela seria apagar rastro de ação que aconteceu, que é o que a regra 4 impede; a
reversão então para na função e nos gatilhos, e a tabela fica.

---

# PR 2 (reconferência) — `20261003000205_exclusao_de_conta.sql`

**Autorização:** Bernardo Villas Boas, 03/10/2026: *"Se a anonimização exigir migration, faça com o
rito (backup, dry-run só com ela, conferência)."* CI verde nos três blocos sobre `d742644`
(run `37086988008`).

| # | Passo | Resultado medido |
|---|---|---|
| 1 | **Backup**, `--somente-copia` | `remoto-20261002-224755.sql`, fora do git |
| 2 | **Dry-run** | *"Would push: • 20261003000205_exclusao_de_conta.sql"* — **uma só**, sem `seed` nem `role` |
| 3 | **Aplicação**, `pnpm db:push` | `Applying migration …` · saída **0** |
| 4 | **Retrato depois** | `remoto-20261002-224823.sql` — é ele que sustenta a conferência 2 |

## A conferência, só por leitura

**1. Migrations:** **48 entradas, as 48 nos dois bancos**, nenhuma só de um lado.

**2. Zero valores pré-existentes alterados.** O `diff` dos dois retratos de dados traz **uma coisa
só**, além do par de linhas que o `pg_dump` sorteia: a coluna **`excluida_em`** entrando na lista do
`INSERT` de `usuarios`, com **`NULL` nas cinco linhas**. Nenhum outro valor mudou — nem o nome de
exibição, nem o caminho do avatar, nem a situação das duas contas que você desativou no preview.

⚠️ **E ISSO É A LIÇÃO DO GOTCHA 13 APLICADA:** a conferência é o `diff` dos **dois retratos datados**,
nunca um md5 de conteúdo — que num banco vivo muda sozinho por carimbo de acesso.

**3. Esquema, objeto a objeto:**

| | Objetos | md5 do conjunto |
|---|---|---|
| Local | **1.595** | `1a202cfc16af192f3e04ee64b682dda2` |
| Remoto | **1.595** | `1a202cfc16af192f3e04ee64b682dda2` |

Comparação **linha a linha** das 1.596 linhas: **diff vazio**.

**4. A exclusão está de pé, e a regra 4 continua inteira:**

| O quê | Medido no remoto |
|---|---|
| `usuarios.excluida_em` | existe, e está **nula** nas 5 contas |
| Contas excluídas | **0** — a coluna nasce sem uso |
| `excluir_conta` e `dependentes_da_conta` | as **2**, e as **2** são `SECURITY DEFINER` |
| Policies de `DELETE` no **catálogo inteiro** | **0** — a emenda autorizou a FUNÇÃO, não uma policy |
| Contas em `usuarios` | **5**, intactas |
| Linhas em `auditoria_de_conta` | **4** — as suas ações no preview, preservadas |

**5. Production respondendo como antes:** `/login` **200**; `/`, `/admin/usuarios` e `/perfil`
**307** para o login.

## Reversão

No cabeçalho da migration. ⚠️ **O `drop column` só é seguro enquanto nenhuma conta tiver sido
excluída** — hoje são zero. Com linha anonimizada, perder a coluna faria a conta voltar a aparecer na
lista como se estivesse viva, chamada *"Conta excluída"*, que é pior que o estado de antes.

---

# PR 2 (reconferência) — `20261003042704_porteiro_de_admin_nao_falha_aberto.sql`

## ✅ APLICADA NO REMOTO em 03/10/2026, com autorização de Bernardo Villas Boas na mesma sessão,
depois do CI verde em `133504c`.

Este bloco foi escrito **antes** da aplicação, de propósito: ele era o plano, e os números da
conferência entraram **depois**, nos marcadores — nunca por antecipação (regra 9.3).

## Por que ela existe, e como apareceu

⚠️ **Ela não saiu de conferência de tela nem de revisão: saiu de um defeito deliberado.** Ao deixar
inerte o porteiro de `public.excluir_conta` para ver o caso novo de RLS reprovar, a recusa chegou de
**outra** função — `public.registrar_acao_em_conta` —, e ler o porteiro dela mostrou a forma do
**gotcha 15** ainda viva: `if not app.eh_admin() then raise`.

⚠️ **O ator não é hipotético: é a conta que o Admin acabou de desativar.** Desativar **não toca a
credencial** — é de propósito, o cadastro fica —, então ela continua autenticando;
`app.perfil_atual()` filtra `status = 'ativo'` e a ignora; `app.eh_admin()` devolvia **NULL**; e
`if not NULL` **não entra no `if`**. **Medido no banco local, com sessão real:** a conta desativada
**gravou** uma linha na trilha, com `error: null`.

⚠️ **O custo é permanente:** a trilha é só de acréscimo e imutável **inclusive para a
`service_role`** — linha forjada ali não sai nunca, e a trilha é a primeira coisa que alguém lê ao
investigar uma conta.

⚠️ **A varredura do catálogo desmentiu o tamanho do problema:** dos **9** porteiros escritos
`if not app.<fn>()`, **8** chamam `app.pode()`, que devolve `false` **explícito** quando não há
perfil, e `app.impedir_autoescalonamento()` usa a forma **positiva**, que falha fechada. Era **uma**
função.

## O que ela muda, e o que não muda

| Muda | Não muda |
| --- | --- |
| `app.eh_admin()` devolve `coalesce(…, false)` — **nunca mais NULL** | As **6** policies que a chamam: em posição de porteiro booleano, NULL e `false` dão o **mesmo** veredito |
| O porteiro de `registrar_acao_em_conta` passa a `coalesce(…) is not true` | A assinatura, os privilégios e o corpo restante das duas funções |
| — | **Nenhuma linha de dado.** Ela não lê nem escreve `usuarios`, a trilha, nem qualquer tabela |

## O rito, na ordem em que foi executado

1. `python -m scripts.manutencao.dado_do_remoto --somente-copia` — e **o nome do arquivo datado
   entra aqui**: **`remoto-20261003-023406.sql`** (1.795 KB, fora do git, com dado pessoal).
2. `supabase db push --linked --dry-run` — a lista trouxe **só** esta migration, uma linha.
3. `supabase db push --linked` — saiu **0**, uma migration aplicada.
4. A conferência abaixo, **só por leitura**, feita na hora.

## A conferência, só por leitura

| O que | Esperado | Medido |
| --- | --- | --- |
| Migrations dos dois lados | **49 e 49**, nenhuma só de um | **49** no remoto ✅ |
| Impressão digital do esquema | **igual** nos dois bancos, `diff` vazio | **`ed9de773…`, 1.595 objetos, idêntica**, `diff` vazio nas 1.596 linhas ✅ |
| `app.eh_admin()` sem sessão | **`false`**, não NULL | **`false`** — era **NULL** antes do push ✅ |
| Funções com `if not app.eh_admin()` | **0** no catálogo | **0** — era **1** antes do push ✅ |
| Linhas em `auditoria_de_conta` | **as mesmas de antes** — a migration não grava | **4**, as mesmas ✅ |
| Contas em `usuarios` | **5**, intactas | **5 vivas de 5**, **0** excluídas ✅ |
| Production | respondendo como antes | `/login` **200**; `/`, `/admin/usuarios`, `/perfil` e `/instrutores` **307** ✅ |

⚠️ **E DUAS LINHAS QUE NÃO ESTAVAM NO PLANO, medidas porque a primeira versão desta migration
mexia em privilégio:** a ACL de `app.eh_admin()` no remoto ficou
`{=X/postgres,postgres=X,authenticated=X}` — **idêntica à da irmã `app.pode()`**, portanto **nada
mudou** ali; e as **6** policies que a chamam seguem as mesmas. **Zero** policies de `DELETE` no
catálogo inteiro, como sempre.

⚠️ **A IMPRESSÃO DIGITAL MUDOU DE VALOR, E ISSO ERA O ESPERADO:** ela era `1a202cfc…` antes e
`ed9de773…` depois, porque **o corpo de duas funções mudou** — é o que a migration faz. O que importa
é que mudou **do mesmo jeito nos dois bancos**: os dois medem `ed9de773…` com **1.595** objetos e
`diff` vazio. **Número de objetos igual antes e depois** confirma que nada foi criado nem perdido.

## Reversão

Recriar as duas funções como estavam em `20260830000111` e `20261002195248`, cujo texto está no
repositório. ⚠️ **Reverter reabre o buraco** — a reversão está escrita porque o DoD 6 a exige, não
porque deva ser usada.
