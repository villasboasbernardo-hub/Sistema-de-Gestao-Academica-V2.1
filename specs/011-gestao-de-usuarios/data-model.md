# Data model — spec 011, gestão de usuários

**Fase 1 do plano.** O que muda no banco, o que **não** muda, as invariantes e o plano de reversão
por migration. Medido em 29/09/2026.

⚠️ **`public.usuarios` NÃO ganha coluna nenhuma.** Ela já tem tudo o que esta fatia escreve:
`nome_exibicao` (nunca escrito por tela), `perfil`, `status` e o quarteto de auditoria.

---

## 1. O que entra

### 1.1 `public.auditoria_de_conta` — a trilha nova e mínima (D-2)

| Coluna | Tipo | Por quê |
|---|---|---|
| `id` | `uuid` PK `default gen_random_uuid()` | |
| `autor_id` | `uuid not null` | **quem** fez. Lido de `auth.uid()` **dentro** da função, nunca do cliente |
| `acao` | `text not null` + `CHECK` | **o quê**: `editar_perfil`, `editar_nome`, `redefinir_senha`, `desativar`, `reativar`, `excluir` |
| `conta_alvo_id` | `uuid not null` | **sobre qual conta**. ⚠️ **Não é FK** — a conta excluída deixa de existir e o rastro tem de sobreviver a ela |
| `conta_alvo_codigo` | `text not null` | o `codigo` legível no momento do fato, porque o `id` não diz nada a quem lê |
| `ocorrido_em` | `timestamptz not null default now()` | **quando** |

⚠️ **Quatro informações e nada além, por decisão (D-2).** Não há `valor_antes`, `valor_depois` nem
retrato: a pergunta que esta trilha responde é *"quem mexeu na conta de quem, e quando"*. O retrato
do que foi apagado, quando há exclusão, vai para `exclusoes_registradas` — são dois fatos diferentes
sobre o mesmo evento.

**Proteções, no molde de `exclusoes_registradas`, que já resiste inclusive à `service_role`:**

- RLS ligada; **uma** policy, de leitura: `app.pode('auditoria','ler')`.
- **Nenhuma** policy de escrita — quem grava é função `SECURITY DEFINER`.
- `revoke insert, update, delete, truncate … from authenticated, anon`.
- Dois gatilhos de **comando**, um contra `update`/`delete` e outro contra `truncate`, levantando
  `42501` com `hint = 'auditoria_imutavel'`.
- **Sem** quarteto de auditoria e **sem** `origem_migracao_v1` — desvio declarado, igual ao da tabela
  irmã: uma trilha não tem autor de edição porque não se edita.

### 1.2 O bucket `avatares`

Inserido em `storage.buckets` pela migration, com a garantia **estrutural** (R-3):

| Campo | Valor | Por quê |
|---|---|---|
| `id` / `name` | `avatares` | |
| `public` | **`false`** | foto de pessoa, repositório público (D-3) |
| `file_size_limit` | **2.097.152** | os 2 MB da `FR-012`, impostos **pelo motor** |
| `allowed_mime_types` | `{image/jpeg, image/png}` | os tipos da `FR-012`, idem |

**Policies em `storage.objects`, restritas ao bucket** — hoje a tabela tem RLS ligada e **zero**
policies, então nada entra nem sai por ali:

| Policy | Comando | Quem |
|---|---|---|
| `avatares_ler` | `select` | quem já pode ler aquele cadastro — dono da foto **ou** `app.pode('usuarios','ler')` |
| `avatares_escrever` | `insert` | **só o dono**: o caminho do arquivo começa com o `id` da própria conta |
| `avatares_trocar` | `update` | idem |
| `avatares_remover` | `delete` | idem |

⚠️ **O caminho do arquivo carrega o dono**, e é isso que torna a policy escrevível sem consulta:
`<auth_user_id>/<nome>`. A primeira pasta do caminho **é** a identidade, e a policy a compara com
`auth.uid()`.

### 1.3 A coluna do avatar

`public.usuarios` recebe **uma** coluna:

| Coluna | Tipo | Por quê |
|---|---|---|
| `avatar_caminho` | `text` | o caminho dentro do bucket, **não** uma URL. URL de bucket privado é temporária por natureza; guardar uma seria guardar algo que vence |

⚠️ **Isto contradiz o aviso do topo deste documento, e o aviso é que estava certo em espírito**:
`usuarios` não ganha coluna de **comportamento** — ganha **uma** de endereço de arquivo, que não
tinha onde mais morar.

### 1.4 O `CHECK` de `exclusoes_registradas` passa a aceitar `usuarios`

De `('instrutores','disciplinas','unidades_ensino')` para essas três **mais** `'usuarios'`.

⚠️ **É `drop constraint` e `add constraint`, e não há dado a migrar**: a tabela está **vazia** nos
dois bancos. O `CHECK` antigo é reposto na reversão.

---

## 2. O que NÃO muda — e a lista é a parte que importa

| Não muda | Por quê |
|---|---|
| a matriz `perfil_permissao` | **nenhuma linha nova** (D-6). Reativar usa `usuarios.desativar` |
| o enum `perfil_usuario` | os nove continuam os nove; a fatia só passa a **oferecê-los** |
| os três gatilhos de `usuarios` | autoescalonamento, último admin e auditoria ficam como estão |
| `app.eh_admin()`, `app.pode()`, `app.usuario_atual()` | nenhuma função de autorização nova |
| as policies de `usuarios` | as três atuais bastam: o próprio lê e edita a própria linha; o admin, todas |
| `auth.users`, `auth.sessions`, `auth.refresh_tokens` | **intocadas**. A revogação vem da plataforma (R-1), e a `service_role` nem tem privilégio ali |

---

## 3. Invariantes

| # | Invariante | Onde se prova |
|---|---|---|
| **I-1** | `auditoria_de_conta` tem RLS ligada, **uma** policy (de leitura) e **zero** privilégios de escrita para `authenticated` e `anon` | pgTAP |
| **I-2** | `update`, `delete` e `truncate` em `auditoria_de_conta` são recusados com `42501`, **inclusive** para a `service_role` | pgTAP |
| **I-3** | `acao` só aceita os **seis** valores declarados | pgTAP |
| **I-4** | o bucket `avatares` é **privado**, com limite de **2 MB** e **só** `image/jpeg` e `image/png` | pgTAP, lendo `storage.buckets` |
| **I-5** | `storage.objects` deixa de ter zero policies e passa a ter **exatamente quatro**, todas restritas ao bucket `avatares` | pgTAP |
| **I-6** | a matriz continua com **zero** ações `reativar` | a asserção **que já existe** em `103_permissoes.sql`, intacta |
| **I-7** | continua havendo **zero** policies de `DELETE` em `public`, e `authenticated` continua sem privilégio de `DELETE` | a asserção existente, com a tabela nova na conta |
| **I-8** | toda ação administrativa deixa **exatamente uma** linha na trilha | teste de sessão real |
| **I-9** | nenhum caminho deixa o sistema com **zero** admins ativos | teste de sessão real, com o caso que discrimina |

---

## 4. Plano de reversão, por migration

| Migration | Reversão | O que **não** volta |
|---|---|---|
| M1 · `auditoria_de_conta` | `drop table` **só se vazia** — com linha, ela é rastro de ação que aconteceu, e apagar rastro é o que a regra 4 impede | as linhas, se houver |
| M2 · bucket e policies | `drop policy` × 4 e `delete from storage.buckets where id = 'avatares'` **só se não houver objeto** | os arquivos já enviados |
| M3 · `usuarios.avatar_caminho` | ⚠️ **não** `drop column` — coluna com dado vira comentário `[APOSENTADA]`, pela convenção de banco. Enquanto vazia, o `drop` é seguro | — |
| M4 · `CHECK` de `exclusoes_registradas` | repor o `CHECK` de três tabelas | — |
| M5 · funções de conta (excluir, impedimentos, registrar na trilha) | `drop function` das RPCs e dos invólucros de `public` | as linhas já gravadas na trilha |

⚠️ **Toda uma delas vai ao remoto ANTES do merge do PR**, com backup por
`dado_do_remoto --somente-copia` e o arquivo datado citado — o mesmo rito dos PRs anteriores, e o
mesmo motivo: preview e Production são **o mesmo projeto** (AMBIENTE-1).
