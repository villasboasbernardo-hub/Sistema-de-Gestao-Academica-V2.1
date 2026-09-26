# Plano de aplicação no remoto — PR 1 da fatia (b)

**Projeto**: `cqhpfuaweoyglhtrckcp` — o **mesmo** que serve Preview e Production até a virada
(exceção do `FR-016.1` da spec 001; decisão **AMBIENTE-1**, 21/09/2026). Aplicar migration aqui é
aplicá-la **também na Production**, que roda a `main`.

**Seis migrations**, na ordem do carimbo, que é a que a CLI usa:

| # | Arquivo | O que faz |
|---|---|---|
| M1 | `20260925135041_sequencias_dis_e_ue.sql` | sequências e `DEFAULT` de `disciplinas.codigo` e `unidades_ensino.codigo` |
| M2 | `20260925135044_exclusao_com_rastro.sql` | `exclusoes_registradas` + 8 funções de exclusão + gatilhos de imutabilidade |
| M3 | `20260925135048_aposentar_colunas_de_atribuicao.sql` | **prova de cobertura**, 3 comentários de aposentadoria, 3 disciplinas em `simultaneo` |
| M4 | `20260925135051_periodo_e_rpc_disciplina.sql` | gatilho da janela + RPCs `criar_disciplina` / `reativar_disciplina` |
| M5 | `20260925135054_rateio_por_instrutor.sql` | `turma_disciplina_unidade`, `CHECK` da parcela inteira, gatilho adiado da soma, RPC de atribuição, **view de CH prevista reescrita** |
| M6 | `20260925135058_curriculo_modelo_e_parametro.sql` | `cursos.curriculo_modelo`, `disciplinas.sem_unidades_ensino`, parâmetro dos 30 dias |

## ⛔ Passo zero, obrigatório — o backup

Antes de qualquer `db push`:

```
python -m scripts.manutencao.dado_do_remoto --somente-copia
```

O arquivo datado que ele imprime **é citado no PR**. O modo `--somente-copia` guarda a cópia e **não
toca no banco local** — sem ele, quem quisesse só o backup perderia a base local no `db reset`.

⚠️ **A cópia NÃO traz o schema `auth`** — credencial não é cadastro. Um remoto restaurado a partir
dela teria os cadastros e nenhuma senha; as contas se refazem por convite.

⚠️ **O backup não é rede de segurança automática**: restaurá-lo no remoto seria escrita no remoto, que
a regra de direção proíbe sem decisão expressa. O que ele garante é que o dado **existe** para ser
reposto quando a decisão vier.

## 1. Antes de aplicar — tudo só de leitura

```
supabase migration list --linked          # os dois lados, antes
supabase db push --linked --dry-run       # SÓ as 6 desta fatia devem aparecer
```

Se o `--dry-run` listar qualquer migration que não seja uma das seis, **parar**: significa que o
remoto está atrás em outra coisa, e aplicar junto misturaria duas decisões.

## 2. O que muda no remoto, e por que cada uma é segura lá

⚠️ **O remoto TEM dado de negócio** desde 22/09/2026 — 24 cursos, 28 turmas, 175 disciplinas, 177
instrutores. É a diferença mais importante em relação ao PR 1 da fatia (a), que aplicou contra um
banco vazio.

| Migration | Efeito sobre o dado existente |
|---|---|
| M1 | **nenhum**: só acrescenta `DEFAULT`. Os 175 códigos legados ficam como estão |
| M2 | **nenhum**: cria tabela vazia e funções |
| M3 | ⚠️ **aqui a prova finalmente prova**: o bloco `DO` roda contra as 210 linhas de `turma_disciplina` reais. Se algum `instrutor_id` não tiver par na junção, ele **migra**; se ainda sobrar, **aborta a migration inteira**. E marca as **3** disciplinas em `simultaneo` — que localmente é no-op, porque lá a migration roda antes da carga |
| M4 | **nenhum sobre o dado**: o gatilho da janela só age em gravação futura com `origem_periodo = 'manual'`, e hoje há **0** linhas `manual`. As 4 linhas fora da janela **não são tocadas** |
| M5 | **nenhum**: tabela nova vazia, `CHECK` sobre 96 linhas com `ch_prevista_tempos` **NULL** (passa), gatilho adiado que só age em gravação futura. ⚠️ **A view é recriada** — quem a lê (`lib/dominio/carga-semanal.ts`, a ficha do instrutor) passa a ver **inteiros** onde via fração |
| M6 | **nenhum**: duas colunas com `DEFAULT` e um parâmetro novo. **Nenhum curso é marcado** — quem marca é a carga do PR 2 |

## 3. A aplicação

```
pnpm db:push        # = supabase db push --linked
```

**Só depois do CI verde sobre o mesmo commit, e só com autorização nominal de Bernardo.**

## 4. Se uma falhar no meio

A CLI aplica uma a uma e para na primeira que falhar. **A que falhou não fica pela metade** — cada
arquivo roda em transação própria. O estado possível é "as N primeiras aplicadas". Nesse caso:

1. **Não** reexecutar cegamente. Ler a mensagem: a M3 aborta **de propósito** se achar atribuição sem
   par, e isso é informação, não defeito.
2. `supabase migration list --linked` para ver onde parou.
3. O plano de reversão de cada uma está **no cabeçalho do próprio arquivo**, e foi **executado numa
   base descartável** antes do PR (T010).

## 5. Conferência depois, só por leitura

```
supabase migration list --linked                       # os dois lados iguais
supabase db query --linked "select count(*) from ..."  # contagens
```

O que se confere:

- **as 43 migrations dos dois lados**, nenhuma só de um;
- **a impressão digital do catálogo** de `public` e `app` — mesmo `md5` no local e no remoto;
- `authenticated` **sem** `DELETE` e **zero** policies de `DELETE`, agora com as duas tabelas novas
  na conta;
- as **7 RPCs** de `public` respondendo e recusando `42501` sem sessão, **sem gravar nada**;
- as **3** disciplinas em `simultaneo` e o `migracao_log` com os 3 eventos;
- `turma_disciplina_instrutor` ainda com **96** linhas e `turma_disciplina` com **210** — a M3 não
  inventou nem perdeu nenhuma;
- a **Production respondendo** sem erro novo: `/` e telas protegidas levam ao login, `/login` 200.

## 6. O que acontece com a Production entre a aplicação e o merge

A `main` ainda **não** tem o código desta fatia, e isso é seguro porque **nenhuma tela lê** o que as
seis acrescentam: o menu continua com *Disciplinas* em `disponivel: false`, e as colunas novas têm
`DEFAULT`. A única mudança visível é a **view de CH prevista**, que a ficha do instrutor lê — e ela
passa a mostrar números **inteiros que somam a CH**, no lugar de frações que somavam 9,99. É
correção, não regressão, e está descrita no PR.

---

## ✅ APLICADO no remoto em 25/09/2026 — o que foi medido

**Backup, passo zero**: `remoto-20260925-120457.sql`, 1.611 KB, em
`%LOCALAPPDATA%\ciaara-11\copias-do-remoto\` — fora do git, com dado pessoal.

**Dry-run**: listou **exatamente as seis** desta fatia, nenhuma a mais.
**`pnpm db:push`**: saiu **0**, as seis na ordem do carimbo.

**Conferido só por leitura, na hora:**

| O quê | Resultado |
|---|---|
| migrations dos dois lados | **43 e 43**, nenhuma só de um |
| impressão digital do catálogo de `public` + `app` | **`0462404a6a08fdb13236d85a8f7d3533`, 865 itens** — **igual** no local e no remoto, sem uma linha de diferença |
| dado de negócio | **175** disciplinas · **210** `turma_disciplina` · **96** `turma_disciplina_instrutor` — **intactos**; a M3 não inventou nem perdeu nenhuma |
| tabelas novas | `turma_disciplina_unidade` **0** · `exclusoes_registradas` **0** — nascem vazias |
| **a prova que só no remoto prova** (`FR-032.1`) | **0** `instrutor_id` sem par ativo na junção, sobre as 210 linhas **reais**. Localmente essa asserção passa vazia; aqui ela mediu |
| as 3 disciplinas `simultaneo` (Q-02) | **3** marcadas e **3** eventos em `migracao_log` — aqui a migration **aplicou**, porque o dado já estava |
| parâmetro | `disciplinas.aviso_inicio_dias` = **30** |
| `DELETE` | **0** policies e **0** privilégios para `authenticated` — a exceção não abriu porta |
| RPCs de `public` | as **7** presentes |
| Production | `/` **307** → login · `/login` **200** · `/cursos` **307** · `/instrutores` **307** — sem erro novo |


---

## M7 — a sétima migration, e por que ela existe

`20260926005750_ch_prevista_com_security_invoker.sql`

**O defeito**: a PARTE F da M5 reescreveu `vw_instrutor_carga_prevista` com
`create or replace view … as`, sem o `with (security_invoker = true)` que a view tinha desde
15/09/2026. **`create or replace view` não preserva as `reloptions`** — ele preserva o objeto, o dono,
os privilégios e as dependências, e troca as opções pelas do comando. A view passou a rodar com os
direitos do **dono**, `postgres`, que tem `rolbypassrls = true`: **a RLS das tabelas de baixo deixou de
valer para quem lê**. E `vw_instrutor_carga_anual` lê dela, então o vazamento seguia para a ficha do
instrutor.

**Medido no banco local em 25/09/2026**, depois das seis:

| view | `reloptions` |
|---|---|
| `vw_instrutor_carga_prevista` | **(nenhuma)** — era `{security_invoker=true}` |
| `vw_instrutor_dados_pessoais` | **(nenhuma)** — **intencional**, é assim que o recorte de PII funciona (PII-1) |
| as outras 11 views de `public` | `{security_invoker=true}` |

**Quem pegou**: a prova de reversão da T010, comparando o `pg_dump` de antes das migrations com o de
depois. Nenhuma asserção da suíte media **opção** de view — media definição, coluna, privilégio e
policy. A M7 vem com as duas asserções que faltavam, em `supabase/tests/010_estrutura.sql`.

**Por que uma migration nova, e não uma correção na M5**: a M5 **já está aplicada no remoto**. Editar
migration aplicada é fazer os dois bancos divergirem em silêncio — a CLI não a reexecuta, e o arquivo
passaria a descrever um estado que o remoto não tem.

⚠️ **O remoto carrega o defeito desde 25/09/2026**, e por isso a M7 vai para lá **antes do merge**,
sob as mesmas condições da primeira aplicação: CI verde, backup com `dado_do_remoto --somente-copia`
citado aqui, `--dry-run` mostrando **só** ela, e conferência só por leitura depois.

### ✅ APLICADA no remoto em 26/09/2026 — o que foi medido

**Backup, passo zero**: `[pendente]`

| O quê | Resultado |
|---|---|
| dry-run | `[pendente]` |
| `pnpm db:push` | `[pendente]` |
| migrations dos dois lados | `[pendente]` |
| impressão digital do catálogo de `public` + `app` | `[pendente]` |
| `reloptions` de `vw_instrutor_carga_prevista` no remoto | `[pendente]` |
| a exceção nominal de PII, intacta | `[pendente]` |
| dado de negócio | `[pendente]` |
| Production | `[pendente]` |
