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
