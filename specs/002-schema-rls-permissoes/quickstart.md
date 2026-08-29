# Quickstart — validar o schema do zero

**Fatia**: Épico 1 · **Data**: 2026-08-28
**Para quem**: quem for implementar, revisar o PR, ou conferir a fatia depois de pronta.

Guia de **validação**, não de implementação. O SQL vive em `supabase/migrations/`; os testes, em
`supabase/tests/` e `tests/invariantes/`.

---

## 0. Pré-requisitos

O arnês do Épico 0 **já está pronto** (conferido em 28/08/2026). O único item que costuma faltar é o
Docker.

```bash
docker info > /dev/null 2>&1 && echo "Docker OK" || echo "FALTA: subir o Docker Desktop"
supabase --version        # >= 2.116
test -f supabase/config.toml && echo "supabase init OK"
grep -q '"db:reset"' package.json && echo "scripts OK"
```

**O banco local é PostgreSQL 17.** Os scripts de referência foram validados contra PG16; o passo 1
é o que confirma que a sequência aplica no 17.

Branch de trabalho — **nunca `main`**:

```bash
git switch -c db/002-schema-rls-permissoes
```

---

## 1. O comando que prova tudo

```bash
pnpm db:start     # PostgreSQL + Auth + Studio em Docker. Primeiro comando do dia
pnpm db:reset     # derruba, reaplica TODAS as migrations do zero, roda seed.sql
```

**`db:reset` é o teste real da fatia** (FR-055). Ele tem de terminar **sem erro e sem nenhuma etapa
manual**. O banco local é descartável por definição — use sem medo.

Se `db:reset` falhar, o problema é ordem entre migrations. Aplique uma a uma para isolar:

```bash
supabase migration list
```

---

## 2. Conferir o inventário

```sql
-- 27 tabelas, nem mais nem menos (FR-001)
select count(*) from information_schema.tables
 where table_schema = 'public' and table_type = 'BASE TABLE';

-- ZERO tabelas sem RLS ligada (FR-032)
select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

-- ZERO políticas de exclusão em todo o schema (FR-033) — o número é zero, e é regra de negócio
select count(*) from pg_policies where schemaname = 'public' and cmd = 'DELETE';

-- ZERO tabelas com RLS forçada (restrição do plano; doc 22 §5.3) — forçar reintroduz a recursão
select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relforcerowsecurity;
```

**Esperado:** `27` · nenhuma linha · `0` · nenhuma linha.

---

## 3. Provar que o grão é a Unidade de Ensino

A verificação mais importante da fatia — é o risco nomeado no documento 06.

```sql
-- registros_aula aponta para unidade de ensino, e NÃO guarda disciplina (FR-020)
select column_name from information_schema.columns
 where table_name = 'registros_aula' and column_name in ('unidade_ensino_id','disciplina_id');
```

**Esperado:** apenas `unidade_ensino_id`. **Se `disciplina_id` aparecer, a fatia está errada** — é o
grão antigo voltando por hábito.

```sql
-- RN-MAT-01 é declarativa: turma e unidade de ensino do mesmo curso (research §3)
select conname from pg_constraint
 where conrelid = 'public.registros_aula'::regclass and contype = 'f';
```

**Esperado:** duas chaves compostas, uma para turma e outra para unidade de ensino, ambas incluindo o
curso.

---

## 4. Tentar violar cada regra — e esperar a recusa

**Testar só o caminho válido não prova nada.** Estas são as regras de FR-008 a FR-018; a suíte
completa está em `supabase/tests/`.

```bash
pnpm test:invariantes    # supabase test db — a suíte pgTAP inteira
```

Para conferir uma à mão, o padrão é sempre transação descartável:

```sql
begin;
  -- FR-008 — código de disciplina único no curso
  insert into disciplinas (curso_id, cod_disciplina, ...) values (<curso>, 'MAT', ...);
  insert into disciplinas (curso_id, cod_disciplina, ...) values (<mesmo curso>, 'MAT', ...);
  -- esperado: ERRO de unicidade
rollback;

begin;
  -- FR-017 — dois regimes do mesmo tipo, períodos sobrepostos, mesmo curso
  -- esperado: ERRO de sobreposição
rollback;

begin;
  -- FR-014 — atividade global COM turma
  -- esperado: ERRO da regra condicional
rollback;

begin;
  -- FR-027 — gravar grandeza derivada
  update registros_aula set ta_final = 99 where id = <qualquer>;
  -- esperado: ERRO — coluna não gravável
rollback;
```

**Se algum destes gravar sem erro, a regra correspondente não está implementada** — e o teste que a
cobre está mentindo.

---

## 5. O teste que precisa de sessão de verdade

```bash
pnpm test:rls     # T-01 a T-12 — teste NEGATIVO por perfil
```

**Por que ele não é pgTAP** (research §7): o pgTAP roda como dono do schema, e **sob privilégio de
dono a RLS não se aplica**. Um teste de RLS escrito assim **aprovaria uma RLS desligada**. Este roda
com cliente autenticado por perfil, com JWT real.

**Foi exatamente rodar com sessão real que encontrou o defeito do `GRANT` de `extensions`** — que
passa despercebido em migration, semente e ETL, e quebra **todo cadastro de usuário real**, em
produção, no primeiro uso.

Conferência mínima à mão:

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims to '{"sub":"<conta do operador expedito>"}';
  select count(*) from turmas;                 -- só cursos expeditos (T-01)
  insert into cursos (...) values (...);        -- esperado: NEGADO
rollback;
```

---

## 6. Provar que a autorização é dado, não código

O critério 7 do documento 06, e a razão de a matriz existir:

```sql
begin;
  update perfil_permissao set permitido = false
   where perfil = 'operador' and recurso = 'disciplinas' and acao = 'editar';

  set local role authenticated;
  set local request.jwt.claims to '{"sub":"<conta do operador>"}';
  update disciplinas set nome_disciplina = 'x' where id = <alcançada>;
  -- esperado: NEGADO — e nenhuma linha de código mudou
rollback;
```

---

## 7. Provar que o normativo alerta, mas não bloqueia

**O teste positivo, que existe para impedir que alguém "conserte" o que não está quebrado** (FR-050):

```sql
begin;
  -- 9 tempos de aula num dia — autorização normativa explícita em CAHO, C-Ap-HN e C-Ap-FR
  insert into registros_aula (..., tempos_consumidos) values (..., 9);
  -- esperado: ACEITO. Se falhar, alguém transformou teto normativo em regra bloqueante,
  -- e isso MUDA A REGRA DE NEGÓCIO (RN-DEG-02)
rollback;
```

Confirmar que os parâmetros são dado, com norma de origem (FR-048):

```sql
select chave, valor, fundamento_normativo from config_parametros order by chave;
```

**Esperado:** tetos AEC 10% / TAD 5% / TR 10%, as três faixas de carga horária docente
(20h → 8–12h, 40h → 16–24h, DE → 16–30h) e o limite diário — **cada um com a norma citada**.

---

## 8. Provar que o histórico não se reescreve

```sql
begin;
  insert into migracao_log (...) values (...);
  update migracao_log set descricao = 'alterado' where id = <a linha>;
  -- esperado: ERRO do gatilho
rollback;
```

E **com a credencial de maior privilégio** — a que ignora todas as demais regras de acesso. Ela
**não** ignora este gatilho (FR-051, Princípio IV). Rode o mesmo `update` com ela: **tem de falhar**.

---

## 9. Regenerar os tipos e fechar

```bash
pnpm db:tipos       # regenera lib/tipos/database.ts a partir do banco LOCAL
git diff --stat lib/tipos/database.ts
pnpm verificar      # typecheck · lint · format · unidade · build
```

**`db:tipos` é obrigatório depois de toda migration.** A verificação automática falha se o arquivo
commitado divergir do schema (FR-060).

---

## 10. Lista de conferência do PR

- [ ] `pnpm db:reset` limpo, do zero, **sem etapa manual** (FR-055)
- [ ] 27 tabelas · RLS em todas · **zero** políticas de exclusão · **zero** RLS forçada
- [ ] `registros_aula` no grão de UE, **sem `disciplina_id`**, com as duas chaves compostas
- [ ] `pnpm test:invariantes` verde — cada regra de FR-008 a FR-018 **tentada e recusada**
- [ ] `pnpm test:rls` verde — **teste negativo por perfil**, com sessão de verdade
- [ ] Teste **positivo** do 9º tempo de aula passando
- [ ] Log de migração recusa alteração **inclusive com a credencial de maior privilégio**
- [ ] `lib/tipos/database.ts` regenerado e commitado
- [ ] **Plano de reversão escrito** para cada migration (FR-056)
- [ ] Commits em `db(<identificador>): <resumo no imperativo>`
- [ ] Template de PR preenchido inteiro

---

## O que este quickstart **não** valida, e por quê

| Não validado aqui | Onde |
|---|---|
| Catálogo de 572 unidades de ensino **povoado** | **Épico 2** — depende de `disciplinas`, que a carga traz. A asserção já estará escrita e passa vacuamente em base vazia |
| Contagens por tabela contra os volumes reais | **Épico 2** — não há dado ainda |
| Percurso de tela | **Épico 4+** — esta fatia não tem tela, e Playwright não se aplica |
| Regras de cálculo — motor preditivo, distribuição, tetos | `lib/dominio/`, por Vitest. **Fronteira deliberada**: o SQL agrega, não planeja |
