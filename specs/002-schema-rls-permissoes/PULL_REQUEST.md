# db: Épico 1 — Schema PostgreSQL, RLS e matriz de permissões

**Fatia:** [`specs/002-schema-rls-permissoes`](./spec.md) · **Branch:** `db/002-schema-rls-permissoes`
**Tarefa T091.** Este arquivo é o corpo do PR, pronto para colar. **O PR ainda não foi aberto** — ver
*Por que ainda não foi aberto*, ao final.

---

## O que entra

O modelo conceitual do documento 05 vira schema executável. **27 entidades**, integridade
declarativa, domínios, vigência sem sobreposição, derivados sem segunda fonte de verdade, RLS em toda
tabela e autorização lida de uma matriz de dados.

A execução letiva nasce no **grão de Unidade de Ensino** (decisão UE-1, rota (b), 26/08/2026), com a
disciplina como agregado derivado.

### Estado do schema — medido no banco, não estimado

| Métrica | Valor |
|---|---|
| Tabelas | **27** |
| Tabelas sem RLS | **0** |
| Tabelas com `FORCE ROW LEVEL SECURITY` | **0** |
| Policies | **77** |
| Policies de `DELETE` | **0** |
| Policies de `UPDATE` sem `WITH CHECK` | **0** |
| Tabelas sem policy nenhuma | **0** |
| Linhas de `perfil_permissao` | **152** |
| Views | **10** |
| Tipos enumerados | **28** |
| Asserções pgTAP | **80** |
| Testes de RLS com sessão autenticada real | **19** |

`pnpm verificar:tudo` **sai 0**: typecheck, lint, formatação, unidade, build, `db:reset` do zero,
conferência de tipos, invariantes, RLS e Playwright.

---

## As seis migrations e seus planos de reversão

Cada uma aplica isoladamente sobre a anterior. O plano de reversão está no cabeçalho de cada arquivo.

### M1 — `fundacao_tipos_e_auditoria`
Schema `app`, quatro extensões, 28 tipos enumerados, cinco funções de fundação e o `GRANT` de
`extensions`.

```sql
drop schema app cascade;
drop type public.<cada domínio criado>;
-- As extensões ficam: são inofensivas e outras migrations podem depender delas.
```
Segura enquanto a base estiver vazia — o estado desta fatia.

### M2 — `cadastro_e_unidades_ensino`
12 entidades de cadastro, **incluindo `unidades_ensino`**.

```sql
drop table public.turma_disciplina_instrutor, public.responsaveis_curso,
           public.instrutor_disciplina, public.instrutores, public.turma_disciplina,
           public.unidades_ensino, public.disciplinas, public.turmas,
           public.curso_regime_historico, public.horarios_tempos_aula,
           public.configuracoes_horario, public.cursos;
```
Ordem inversa da criação. Segura enquanto não houver carga.

### M3 — `fatos_grao_unidade_ensino`
Os cinco fatos, com `registros_aula` no grão de UE.

```sql
drop table public.planejamento_anual, public.atividades_nao_letivas,
           public.avaliacoes, public.registros_aula, public.avaliacoes_planejadas;
```

### M4 — `configuracao_calendario_e_matriz`
Oito tabelas de configuração, calendário e rastro, mais a semente normativa.

```sql
alter table public.registros_aula        drop constraint <FKs postergadas para config_listas>;
alter table public.avaliacoes            drop constraint <idem>;
alter table public.atividades_nao_letivas drop constraint <idem>;
drop table public.arquivo_avaliacoes_v1, public.migracao_log, public.reservas_proens,
           public.janelas_curso, public.feriados, public.perfil_permissao,
           public.config_parametros, public.config_listas;
```

### M5 — `derivados_e_funcoes_de_dominio`
Funções de domínio, 10 views e os gatilhos de imutabilidade.

```sql
drop view public.<as 10 views>;
drop function app.<as funções criadas aqui>;
drop trigger trg_migracao_log_imutavel on public.migracao_log;
drop trigger trg_arquivo_avaliacoes_imutavel on public.arquivo_avaliacoes_v1;
```
**Totalmente reversível: não há dado.**

### M6 — `acesso_rls_e_permissoes`
`usuarios`, `usuario_curso`, funções de alcance, GRANTs, 77 policies e a semente da matriz.

```sql
-- 1. drop policy de todas as policies criadas aqui (consultar pg_policies)
-- 2. drop trigger trg_usuarios_impedir_autoescalonamento on public.usuarios;
-- 3. revoke dos GRANTs concedidos a authenticated
-- 4. delete from public.perfil_permissao;
-- 5. drop table public.usuario_curso, public.usuarios;
```
> **⚠️ A mais delicada.** Revertida esta migration, **toda tabela fica inacessível ao cliente** — RLS
> ligada sem policy nenhuma. É o padrão de falha seguro, mas a aplicação para.

---

## O que ficou provado, e não só afirmado

**`RN-MAT-01` (Risco: Alto) deixou de depender de disciplina de código.** Na v2.0 era uma chamada que
cada ponto de lançamento precisava lembrar de fazer — por isso a regra era de risco alto. Agora é uma
cadeia de chaves compostas: um lançamento cuja turma e cuja unidade pertençam a cursos diferentes
**não tem `curso_id` que satisfaça as duas chaves ao mesmo tempo**.

`055_mat01_curso_cruzado.sql` prova as duas cadeias — que são **diferentes**: `registros_aula` cruza
turma × unidade; `avaliacoes` cruza turma × disciplina — **com controle positivo**, porque uma cadeia
que recusasse tudo passaria nos negativos.

**O grão mudou de verdade:** `registros_aula` tem `unidade_ensino_id` e **não tem `disciplina_id`**.
E a promessa da rota (b) se cumpre: `vw_disciplinas_execucao` manteve a assinatura pública e devolve
13 onde as unidades somam 8 + 5. Quem consome não percebe a mudança.

**O 9º TA continua aceito** — teste positivo, que existe para impedir que alguém "conserte" o que não
está quebrado (`RN-DEG-02`).

**As 11 regras `RN-` de Risco Alto têm asserção nomeada pelo próprio identificador.**

---

## Quatro achados corrigidos

**1. `TRUNCATE` não passa pela RLS — e o privilégio estava concedido.** O Supabase concede `ALL` a
`authenticated` por padrão, e `docs/sql-referencia/05` nunca revogava `DELETE` nem `TRUNCATE`, em
**37 tabelas**. Para `DELETE` a RLS barrava, e a "proteção dupla" do FR-033 era só uma. Para
`TRUNCATE` era brecha real: **nenhuma policy é consultada num TRUNCATE**, e um usuário autenticado
poderia apagar `migracao_log` inteiro — a evidência auditável da migração — sem deixar rastro.
Revogados em M6. **É o achado mais sério, e vale rever se o mesmo padrão existe em outros projetos
Supabase da divisão.**

**2. `responsaveis_curso` não tinha `EXCLUDE` de vigência.** O documento 05 §7.5 especifica dois; o
referência implementa um. FR-018 ficaria sem garantia, e o defeito que ele previne é um DSA reimpresso
com duas rubricas do mesmo papel. Acrescentado em M2.

**3. Uma FK usava `CASCADE`** (`horarios_tempos_aula`), sem justificativa e contra a regra geral do
BRIEF §2. Trocada por `restrict` — nada é apagado neste sistema, então não muda comportamento
alcançável.

**4. O rodapé de `docs/sql-referencia/01` está extraviado**, antes da TABELA 11. Quem extrair "do
início até o rodapé" perde `turma_disciplina_instrutor` — a tabela de onde a LIQ lê.

### Divergência reportada, **não** corrigida

A semântica de `vigente_ate`: o documento 05 §7.5 escreve `daterange(…, '[)')` — fim **exclusivo**;
o referência implementa `vigente_ate + 1` — fim **inclusivo**. Vale um dia, na fronteira. Seguido o
referência, que foi validado contra banco real e corresponde ao que uma pessoa quer dizer ao
preencher "vigente até". Registrado como **A-15**.

---

## Lista de conferência (quickstart §10)

- [x] `pnpm db:reset` limpo, do zero, **sem etapa manual** (FR-055)
- [x] 27 tabelas · RLS em todas · **zero** policies de exclusão · **zero** RLS forçada
- [x] `registros_aula` no grão de UE, **sem `disciplina_id`**, com as duas chaves compostas
- [x] `pnpm test:invariantes` verde — cada regra tentada e **recusada** (80 asserções)
- [x] `pnpm test:rls` verde — **teste negativo por perfil**, com sessão de verdade (19 testes)
- [x] Teste **positivo** do 9º tempo de aula passando
- [x] Log de migração recusa alteração **inclusive com a credencial de maior privilégio**
- [x] `lib/tipos/database.ts` regenerado e commitado
- [x] **Plano de reversão escrito** para cada uma das seis migrations
- [x] Commits em `db(<identificador>): <resumo no imperativo>`

---

## Fora de escopo, e por quê

| Item | Onde |
|---|---|
| **Carga das 572 unidades de ensino** | **Épico 2.** Depende de `disciplinas`, que só o ETL traz. É o achado **A-13**: uma tarefa nova do Épico 2, a sequenciar logo após a carga de disciplinas |
| Carga do histórico e reconciliação | Épico 2 |
| Telas | Épico 3+ |
| `liq_emitida`, `papel_liq` | Épico 11 (LIQ-3, LIQ-4) |
| Subunidade de ensino como tabela | Sem requisito — Princípio X (FR-026) |
| `.github/workflows/ci.yml` | Épico 0 §6.7 |

---

## Por que este PR ainda não foi aberto

**O diretório de trabalho não é a raiz do repositório git.** `git rev-parse --show-toplevel` devolve
`SIS11`, não `Versao_2.1_NextJS`. O repositório `SIS11` rastreia, fora desta pasta:

- `Banco de dados CIAARA-11.xlsx` — **a base viva**;
- `ANX-OF-145-2025-CIAARA-PROGRAMA-DE-ENSINO-PROENS-2026.PDF`;
- `Código.gs`, `Código_v1.gs`, `Código_v2.txt`, `Index_v2.txt`, `index.html`, `index_v1.html`;
- `Matérias e Instrutores.xlsx`;
- e todo o histórico de commits da v1.0 e da v2.0.

**Não há remote configurado** (`git remote -v` vazio). Acrescentar o remote público e empurrar esta
branch publicaria **tudo isso**, junto com o histórico inteiro. A decisão de 26/08/2026 abriu o
repositório para a suíte documental da v2.1 — não para a base viva nem para o código da v1.0.

**O desbloqueio já está especificado, e é do Épico 0, não deste:** `FR-021` da spec `001`, com a
clarificação Q3 de 27/08/2026 — *"a cópia de trabalho **sai de dentro do `SIS11`** e passa a ser pasta
irmã, onde vira o repositório próprio. Os commits de 26/08 permanecem no `SIS11` como registro; nada é
apagado."*

Isso **move a cópia de trabalho no disco** e é decisão do Bernardo, não coisa a fazer de passagem no
meio de outra fatia.

### Quando o replantio acontecer

```bash
git remote add origin https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1.git
git push -u origin db/002-schema-rls-permissoes
gh pr create --base main --head db/002-schema-rls-permissoes \
  --title "db: Épico 1 — Schema PostgreSQL, RLS e matriz de permissões" \
  --body-file specs/002-schema-rls-permissoes/PULL_REQUEST.md
```

**Antes do primeiro PR**, aplicar a proteção da branch `main` (documento 10 §2.7) — que exige o
`ci.yml` de pé, porque os três contextos (`qualidade`, `banco`, `build`) precisam existir com esses
nomes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QJqo8HDpWt9VUFRNC7nvNC
