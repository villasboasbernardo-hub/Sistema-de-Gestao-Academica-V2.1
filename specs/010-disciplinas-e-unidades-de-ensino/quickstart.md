# Quickstart — como se prova que a fatia (b) está pronta

**Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md). Cada passo diz **o comando**, **o que
se espera** e **qual requisito fecha**. Nada aqui escreve no remoto; os passos do remoto são de leitura,
salvo a aplicação de migration, que é decisão nominal de Bernardo com backup antes.

## Passo 0 — ponto de partida

```
git checkout feat/EPICO-5b-disciplinas-e-unidades-de-ensino && git log --oneline -1
pnpm db:start && python -m scripts.manutencao.dado_do_remoto      # retrato do remoto no local
```
Espera-se: cursos=24 · disciplinas=175 · turmas=28 · `unidades_ensino=0` (antes do PR 2).

## Passo 1 — PR 1: o banco (migrations em ordem, base vazia e base povoada)

```
pnpm db:reset:limpo && pnpm db:tipos:conferir      # aplica do zero; tipos batem com o schema
pnpm test:invariantes                                # pgTAP — I-1 a I-11 do data-model.md
python -m scripts.manutencao.dado_do_remoto          # de novo, agora COM as migrations novas
pnpm test:invariantes                                # I-3 (79/79 na junção) só faz sentido povoado
```
E a carga do ETL **continua passando por cima** das migrations novas (como o passo 1 da spec 009):
```
pnpm db:reset:limpo && python -m scripts.etl.executar     # saída 0, reconciliação APROVADA, 5.394 linhas
```
Espera-se: `codigo` de disciplina nova nasce `DIS-000001`; 3 linhas `simultaneo`; `exclusoes_registradas`
recusa `UPDATE/DELETE/TRUNCATE` como `service_role`; período manual fora da janela recusado; rateio
que não fecha recusado; **zero** policies/privilégio de `DELETE`. Fecha `FR-012`, `FR-020..024`,
`FR-030.1`, `FR-032.1`, `FR-040`, `FR-043`, `FR-050`, `FR-070`.

## Passo 2 — a negativa vem do banco, por perfil (sessão real)

```
pnpm test:rls -- disciplinas
```
Espera-se: **operador** (tem `disciplinas.editar`, não `criar`) → `42501` na RPC de exclusão — o caso
que discrimina; ajudante exclui a de amostra e o rastro aparece com `excluido_por` = ele; perfil fora
do alcance do curso → `42501`; operador edita período por turma (Q-10). Fecha `FR-021`, `FR-035`, DoD 4.

## Passo 3 — as regras puras e as varreduras

```
pnpm test:unidade
```
Espera-se verde em: `rateio-de-carga` (30/3 → 10/10/10; 10/3 → 4/3/3 ao mais antigo; 11/3 → 4/4/3;
simultâneo → integral; 1 instrutor → integral; todas `NULL` → divisão igual **com aviso**);
`sinalizacao-de-disciplina` (`NULL` nunca sinaliza; N vem de fora); `indicadores-da-grade` (Q-14);
`soma-das-unidades` (aviso, nunca lançamento); `confirmacao-de-gravacao` (N+7 tipos);
`traducao-de-recusas` (chaves lidas do SQL da migration); `sequencias-apos-restaurar` (**6**
sequências); `toda-tela-tem-caminho` (`/disciplinas` alcançável); regra de cor; fronteira de
`lib/dominio/`. Fecha `FR-041`, `FR-042`, `FR-051`, `FR-052`, `FR-062`, `FR-015`, `FR-005`.

## Passo 4 — sequências depois de restaurar (a prova que discrimina)

```
python -m scripts.manutencao.provar_sequencias_apos_copia
```
Espera-se: P1 reproduz o `23505` com as 7 sequências no início; P2 passa depois de `avancar_sequencias`;
P3 conta **7 no banco, 7 declaradas**. Fecha Q-11 (a `DIS-`, a `UE-` e a `TDU-` entraram na lista
única). ⚠️ **Eram 6 quando este passo foi escrito**: a **A-1** criou `turma_disciplina_unidade`, e com
ela a terceira sequência nova. Medido no `app` em 26/09/2026 — `curso_regime_historico`,
`disciplinas`, `instrutor_disciplina`, `instrutores`, `turma_disciplina`, `turma_disciplina_unidade`,
`unidades_ensino`. ⚠️ `turma_disciplina_instrutor` **não** entra: o código dela é **composto**
(`<TDI-NNNNNN>#<código do instrutor>`) e não sai de sequência.

## Passo 5 — PR 2: a carga das UEs

```
python scripts/etl/extrair_unidades_ensino.py "<SIS11/Curriculos>" "<saida>"   # 135 disc · 582 UE · 135/135
python -m scripts.etl.gerar_carga_de_unidades_ensino "<saida>" > supabase/migrations/<ts>_carga_unidades_ensino.sql
pnpm db:reset:limpo && python -m scripts.manutencao.dado_do_remoto && pnpm test:invariantes
python -m scripts.etl.conferir_unidades_ensino     # currículo × banco, reexecutável (FR-067)
```
Espera-se: `count(unidades_ensino)` = o número declarado na [conferência](./conferencia-dos-curriculos.md);
toda linha com `fundamento_normativo` e `origem_migracao_v1`; `050_grao_unidade_ensino.sql` deixa de
passar vacuamente; a conferência dá **0 diferença sem explicação** — cada diferença remanescente com a
decisão de Q-05 ao lado. A migration é idempotente: rodá-la duas vezes não duplica.

## Passo 6 — PR 3: o percurso na tela, por clique

```
pnpm dev:local          # porta 3000, para conferir com os olhos
pnpm test:e2e -- disciplinas    # porta 3100, build de produção
```
Percurso: `/inicio` → menu *Disciplinas* → `C-ApA-PCN-PR-EAD` → `T2 2026` → expande uma linha → painel
de período → salva → **`T1 2026` intacta** (critério 4) → painel de instrutores: só habilitados, em
antiguidade, atribuído-e-desativado continua marcado → rateio 4/3/3 → painel de UEs em `CAHO` (lista do
currículo, soma 45) → em `C-Espc-FR` **nenhuma** seção de UE → *Excluir* na de amostra (código digitado)
→ some, rastro gravado → *Excluir* numa com turma → *"desative em vez de excluir"*. Fecha SC-001..013.

## Passo 7 — o portão, e o remoto antes do merge (cada PR)

```
pnpm verificar:tudo                                   # tem de coincidir com o CI
python -m scripts.manutencao.dado_do_remoto --somente-copia   # backup datado — citar o arquivo no PR
supabase db push --linked                             # SÓ com autorização nominal, depois do CI verde
supabase db query --linked "select count(*) from supabase_migrations.schema_migrations"   # leitura
```
Espera-se: as migrations dos dois lados iguais; catálogo idêntico (impressão digital `md5` de `public`
e `app`, como a spec 009 §T106); Production respondendo (`/` → login, `/login` 200). A ordem dos PRs é
**banco → carga → telas** (aprovada em 24/09/2026), e cada um só nasce depois do anterior mesclado.
