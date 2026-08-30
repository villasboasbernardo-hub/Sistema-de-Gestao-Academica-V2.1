# Tasks: Épico 1 — Schema PostgreSQL, RLS e matriz de permissões

**Input**: Documentos de projeto em `specs/002-schema-rls-permissoes/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) ·
[data-model.md](./data-model.md) · [contracts/](./contracts/)

**Testes**: **obrigatórios nesta fatia** — não por preferência, mas porque a Definition of Done do
projeto (BRIEF §7) exige pgTAP por regra `RN-` de risco alto e **teste negativo de RLS por perfil**.
*"Uma suíte de RLS só com caminho feliz é uma suíte que aprova uma RLS desligada."*

## Format: `[ID] [P?] [Story] Descrição`

- **[P]**: paralelizável — arquivo diferente, sem dependência pendente
- **[Story]**: a história que a tarefa serve (US1…US5)
- **`<ts>`**: carimbo de tempo **gerado pelo `supabase migration new`** — não é lacuna a preencher à
  mão. O nome real do arquivo sai do comando da primeira tarefa de cada bloco de migration.

---

## ⚠️ Leia antes de sequenciar: a ordem das camadas não é a ordem das prioridades

Num schema, a ordem é **dependência**, não valor de negócio. `perfil_permissao` (US4, prioridade P4)
tem de existir **antes** das policies que a consultam (US2, prioridade P2) — senão elas não aplicam.

| Ordem de execução | Migration | História que serve | Prioridade |
|---|---|---|---|
| 1 | **M1** fundação: tipos, funções, auditoria | US1 + US5 | — |
| 2 | **M2** cadastro + `unidades_ensino` | **US1** | **P1** |
| 3 | **M3** fatos no grão de UE | **US1** | **P1** |
| 4 | **M4** configuração, calendário, matriz | **US4** + US5 | P4 |
| 5 | **M5** derivados e funções de domínio | **US3** + US5 | P3 |
| 6 | **M6** acesso, RLS, policies | **US2** + US5 | P2 |

**Cada camada continua independentemente testável** — que é o que importa. O que não se pode é
entregar US2 sem US4, porque a autorização **é** a matriz.

**US5 (auditoria e imutabilidade) é transversal por natureza:** a função de carimbo nasce em M1, as
tabelas em M4, a ligação dos gatilhos em M5 e as revogações em M6. Suas tarefas ficam na migration
onde pertencem, com o rótulo `[US5]`; a Fase 8 só verifica o conjunto.

---

## Phase 1: Setup

**Purpose**: pôr o ambiente de pé e **confirmar que o arnês do Épico 0 realmente funciona** antes de
escrever DDL.

- [X] T001 Criar a branch de trabalho `db/002-schema-rls-permissoes` a partir da branch atual — nunca trabalhar na `main` (convenção do `CLAUDE.md`)
- [X] T002 Subir o Docker Desktop e executar `pnpm db:start`, confirmando que API, banco e Studio respondem nas portas de `supabase/config.toml` (54321, 54322, 54323)
- [X] T003 [P] Executar `pnpm verificar` e `pnpm test:invariantes` com o schema ainda vazio e registrar a saída — é a linha de base. O stub `supabase/tests/invariantes.test.sql` afirma que `public` tem **zero tabelas** e passa agora; ele **vai falhar** na primeira migration, e isso é esperado (ver T010)
- [X] T004 **Confirmar as construções que os scripts de referência usam contra o PostgreSQL 17 local**, num arquivo descartável: `create extension btree_gist`, uma constraint `EXCLUDE` com `daterange`, uma coluna `GENERATED … STORED`, um índice `UNIQUE … WHERE` parcial e `num_nonnulls()`. A referência foi validada contra **PG16**; esta tarefa fecha a lacuna antes de qualquer DDL definitivo (plan.md, *Pré-condições*) — usar um arquivo descartável em `supabase/tests/_sonda_pg17.sql`, removido ao fim da tarefa

**Checkpoint**: ambiente no ar, arnês verde, construções da referência confirmadas no PG17.

---

## Phase 2: Foundational (M1 — bloqueia todas as histórias)

**Purpose**: o alicerce de tipos e funções de que **todas** as tabelas dependem.

**⚠️ Nenhuma história começa antes desta fase.**

- [X] T005 Criar o arquivo da migration com `pnpm db:migration fundacao_tipos_e_auditoria` (gera `supabase/migrations/<ts>_fundacao_tipos_e_auditoria.sql`)
- [X] T006 [US1] Em `supabase/migrations/<ts>_fundacao_tipos_e_auditoria.sql`: criar o schema `extensions` e habilitar `pgcrypto`, `unaccent`, `btree_gist` e `pg_trgm` nele; criar o schema `app`
- [X] T007 [US1] **`grant usage on schema extensions to authenticated`**. Sem isto **todo cadastro de usuário real falha** enquanto migration, semente e ETL passam — é o defeito que o teste T-04 encontrou (FR-044, doc 22 §7.3) — arquivo: `supabase/migrations/<ts>_fundacao_tipos_e_auditoria.sql`
- [X] T008 [US1] Criar os ~28 tipos enumerados, revisando um a um contra `docs/sql-referencia/00_extensoes_e_tipos.sql`. **`status_turma` fica com exatamente quatro valores** — `planejada`, `ativa`, `concluida`, `cancelada`; "arquivada" **não entra** (FR-047, decisão TURMA-1 de 28/08/2026) — arquivo: `supabase/migrations/<ts>_fundacao_tipos_e_auditoria.sql`
- [X] T009 [US5] Criar `app.uid_atual()`, `app.jsonb_valor()`, `app.set_auditoria()`, `app.bloquear_reescrita()` e `app.normalizar_texto()`, todas com `search_path` fixo. **`set_auditoria()` tem de funcionar sem sessão autenticada** — usar o invólucro `app.jsonb_valor()`, sob pena de descartar os carimbos justamente no caminho do ETL (FR-054, doc 22 §8.1) — arquivo: `supabase/migrations/<ts>_fundacao_tipos_e_auditoria.sql`
- [X] T010 **Substituir** `supabase/tests/invariantes.test.sql` por `supabase/tests/010_estrutura.sql`, que passa a afirmar: os tipos e funções de M1 existem; o `GRANT` de `extensions` está concedido. A asserção antiga — "`public` tem zero tabelas" — deixa de valer e **precisa sair**, não ser contornada
- [X] T011 Escrever o plano de reversão de M1 no corpo do PR: `drop schema app cascade` e `drop type` de cada domínio, seguro enquanto a base estiver vazia (FR-056)
- [X] T012 Executar `pnpm db:reset`, depois `pnpm db:tipos`, e commitar `lib/tipos/database.ts` junto da migration (FR-060)

**Checkpoint**: fundação aplicada, `db:reset` limpo, invariantes de M1 verdes.

---

## Phase 3: User Story 1 — Reconstruir a base com as regras já impostas (P1) 🎯 MVP

**Goal**: as 27 entidades existem e a classe de defeito de dado que a v2.0 combatia por convenção
deixa de ser construível.

**Independent Test**: `pnpm db:reset` do zero; conferir o inventário; **tentar violar cada regra de
FR-008 a FR-018 e esperar a recusa**. Entrega valor sem nenhuma policy escrita: é a base que o
Épico 2 vai povoar.

### M2 — cadastro e unidades de ensino

- [X] T013 [US1] Criar `supabase/migrations/<ts>_cadastro_e_unidades_ensino.sql` com `pnpm db:migration cadastro_e_unidades_ensino`
- [X] T014 [US1] Criar `cursos`, `configuracoes_horario` e `horarios_tempos_aula`, revisando contra `docs/sql-referencia/01_tabelas_cadastro.sql`. **As sete colunas de regime da v2.0 não são recriadas** — viram VIEW em M5 (data-model.md §2) — arquivo: `supabase/migrations/<ts>_cadastro_e_unidades_ensino.sql`
- [X] T015 [US1] Criar `curso_regime_historico` com `vigente_de`/`vigente_ate` e a constraint `EXCLUDE` que impede dois regimes **do mesmo tipo** vigentes ao mesmo tempo, tratando término nulo como infinito e restrita a `status = 'ativo'` (FR-017, `RN-2027-09`) — arquivo: `supabase/migrations/<ts>_cadastro_e_unidades_ensino.sql`
- [X] T016 [US1] Criar `turmas` com `unique (curso_id, turma, ano_letivo)` **e** a chave auxiliar `unique (id, curso_id)`, que é componente da cadeia de RN-MAT-01 (FR-009, research §3) — arquivo: `supabase/migrations/<ts>_cadastro_e_unidades_ensino.sql`
- [X] T017 [US1] Criar `disciplinas` com `unique (curso_id, cod_disciplina)` e `unique (id, curso_id)`. **Não recriar** as colunas mortas removidas pela spec `033` da v2.0, e **não criar** campo de carga horária executada (FR-008, FR-015, FR-028) — arquivo: `supabase/migrations/<ts>_cadastro_e_unidades_ensino.sql`
- [X] T018 [US1] Criar **`unidades_ensino`** — a entidade nova da rota (b) — com `disciplina_id` obrigatório, `curso_id`, `numero_ue > 0`, `topico`, `ch_prevista_tempos`, `tecnica_ensino_sugerida`, `fundamento_normativo`, `unique (disciplina_id, numero_ue)`, `unique (id, curso_id)` e a FK composta `(disciplina_id, curso_id) → disciplinas(id, curso_id)`. **Atributos limitados aos cinco do documento 05 §9.1 mais os universais** (FR-021, FR-023) — arquivo: `supabase/migrations/<ts>_cadastro_e_unidades_ensino.sql`
- [X] T019 [US1] **Não criar** verificação de contiguidade de `numero_ue`: lacuna na numeração é dado normativo válido, e recusá-la rejeitaria currículo correto (FR-025). Registrar o motivo como comentário no ponto exato, para que ninguém "conserte" depois — arquivo: `supabase/migrations/<ts>_cadastro_e_unidades_ensino.sql`
- [X] T020 [US1] Criar `turma_disciplina` com `unique (turma_id, disciplina_id)`. **A coluna de período aceita nulo** — 121 das 210 linhas reais estão em branco, e exigir preenchimento inviabiliza a carga do Épico 2 (FR-011, LIQ-1) — arquivo: `supabase/migrations/<ts>_cadastro_e_unidades_ensino.sql`
- [X] T021 [US1] Criar `instrutores` com `status` obrigatório e **sem nenhum campo editável de carga horária** — a grandeza é view (FR-029, `RN-INST-04`) — arquivo: `supabase/migrations/<ts>_cadastro_e_unidades_ensino.sql`
- [X] T022 [US1] Criar `instrutor_disciplina` (`unique (instrutor_id, disciplina_id)`) e `turma_disciplina_instrutor`, mantendo as **três formas de atribuição em tabelas distintas**: habilitação, planejamento e atribuição real (FR-010, data-model.md §3) — arquivo: `supabase/migrations/<ts>_cadastro_e_unidades_ensino.sql`
- [X] T023 [US1] Criar `responsaveis_curso` com a constraint `EXCLUDE` que impede duas assinaturas do mesmo papel vigentes ao mesmo tempo (FR-018) — arquivo: `supabase/migrations/<ts>_cadastro_e_unidades_ensino.sql`
- [X] T024 [US1] Ligar `app.set_auditoria()` como gatilho em cada tabela desta migration e conferir que todas têm `id`, `codigo`, `origem_migracao_v1`, `status` e o quarteto de auditoria. **Conferir também que toda FK declara `ON DELETE` explícito, com `restrict` como padrão** — nada referenciado por outro registro pode ser removido (FR-002, FR-003, FR-004, FR-005, FR-006, **FR-007**) — arquivo: `supabase/migrations/<ts>_cadastro_e_unidades_ensino.sql`
- [X] T025 [US1] Habilitar RLS em todas as tabelas desta migration. **Sem policy elas ficam inacessíveis — é intencional** e as policies só chegam em M6 (FR-032) — arquivo: `supabase/migrations/<ts>_cadastro_e_unidades_ensino.sql`
- [X] T026 [US1] Escrever o plano de reversão de M2 no PR (FR-056)

### M3 — fatos no grão de Unidade de Ensino

- [X] T027 [US1] Criar `supabase/migrations/<ts>_fatos_grao_unidade_ensino.sql` com `pnpm db:migration fatos_grao_unidade_ensino`
- [X] T028 [US1] Criar `avaliacoes_planejadas` **sem FK para `disciplinas`** — o vínculo é por casamento de nome normalizado, e criar a FK **mudaria a regra de negócio** (`RN-AVAL-01`, data-model.md §4) — arquivo: `supabase/migrations/<ts>_fatos_grao_unidade_ensino.sql`
- [X] T029 [US1] Criar **`registros_aula` no grão de UE**: `unidade_ensino_id` **obrigatório**, `turma_id`, `curso_id`, e **sem `disciplina_id`**. É a divergência central em relação a `docs/sql-referencia/02_tabelas_fato.sql`, que está no grão antigo e **não deve ser copiado neste ponto** (FR-020, research §2) — arquivo: `supabase/migrations/<ts>_fatos_grao_unidade_ensino.sql`
- [X] T030 [US1] Em `registros_aula`, declarar as duas FKs compostas que tornam `RN-MAT-01` impossível de violar: `(turma_id, curso_id) → turmas(id, curso_id)` e `(unidade_ensino_id, curso_id) → unidades_ensino(id, curso_id)` (research §3) — arquivo: `supabase/migrations/<ts>_fatos_grao_unidade_ensino.sql`
- [X] T031 [US1] Manter em `registros_aula` o consumo de tempos, `ta_inicial` **anulável** (registros históricos sem posição não podem lançar exceção — `RN-DEG-01`) e o último tempo ocupado como coluna derivada imutável. O domínio de categoria tem **apenas duas** — aula e atividade extraclasse; **"Avaliação" não existe aqui** (`RN-AVAL-02`) — arquivo: `supabase/migrations/<ts>_fatos_grao_unidade_ensino.sql`
- [X] T032 [US1] Criar `avaliacoes` com fiscal interno e externo **mutuamente exclusivos** e `set null` no fiscal — fiscal **não** exige habilitação (`RN-INST-01` delimitada). **A cadeia de chaves compostas aqui é OUTRA, não a de T030**: a avaliação referencia **disciplina**, não unidade de ensino. Acrescentar `curso_id` a `avaliacoes` e declarar `(turma_id, curso_id) → turmas(id, curso_id)` e `(disciplina_id, curso_id) → disciplinas(id, curso_id)` (FR-015, **FR-061**, `RN-MAT-01`) — arquivo: `supabase/migrations/<ts>_fatos_grao_unidade_ensino.sql`
- [X] T033 [US1] Criar `atividades_nao_letivas` com a regra condicional turma × escopo — turma obrigatória **se e somente se** o escopo for de turma — e a coluna derivada "compõe CHT", falsa para estudo individual (FR-014, `RN-EVT-02`) — arquivo: `supabase/migrations/<ts>_fatos_grao_unidade_ensino.sql`
- [X] T034 [US1] Criar `planejamento_anual` com o **índice único parcial** que impede mais de um planejamento salvo por ano e a regra condicional de linha de disciplina (FR-012, FR-016) — arquivo: `supabase/migrations/<ts>_fatos_grao_unidade_ensino.sql`
- [X] T035 [US1] Ligar auditoria, habilitar RLS e escrever o plano de reversão de M3 (FR-024 análogo, FR-032, FR-056) — arquivo: `supabase/migrations/<ts>_fatos_grao_unidade_ensino.sql`

### Testes de US1

- [X] T036 [P] [US1] Escrever `supabase/tests/020_unicidade.sql`: para **cada** um de FR-008, FR-009, FR-010, FR-011, FR-012 e FR-013, uma asserção que **tenta violar e espera a falha**. Nomear as que têm regra de origem pelo identificador: **`RN-MAT-02`** (código de disciplina único no curso) e **`RN-INST-05`** (situação sempre explícita) (FR-057, FR-059)
- [X] T037 [P] [US1] Escrever `supabase/tests/030_condicionais.sql` cobrindo FR-014, FR-015 e FR-016 — cada regra condicional com o caso inválido recusado
- [X] T038 [P] [US1] Escrever `supabase/tests/040_vigencia.sql`, com asserções nomeadas **`RN-2027-09`**: dois regimes do mesmo tipo com períodos sobrepostos **falham**; duas assinaturas do mesmo papel também; incluir o caso de término nulo, que é onde a implementação ingênua deixa passar. **Acrescentar a asserção de FR-019**: com dois regimes sucessivos e um fato datado sob o primeiro, a resolução devolve o regime **vigente na data do fato**, não o atual — *nenhuma edição reinterpreta o passado* (FR-017, FR-018, **FR-019**)
- [X] T039 [P] [US1] Escrever `supabase/tests/050_grao_unidade_ensino.sql`: asserção **nomeada** provando que `registros_aula` tem `unidade_ensino_id` e **não tem `disciplina_id`**; que as duas FKs compostas existem; e que a numeração de UE **aceita lacuna** (FR-020, FR-021, FR-025)
- [X] T040 [P] [US1] Escrever em `supabase/tests/055_mat01_curso_cruzado.sql` a asserção **nomeada `RN-MAT-01`** exigida por FR-062: inserir um registro de aula cuja **turma e unidade de ensino pertençam a cursos diferentes** e **esperar a recusa**; repetir para `avaliacoes` com turma e disciplina de cursos diferentes. **Sem esta asserção, uma cadeia de chaves compostas com uma das duas FKs faltando passa em todos os outros testes** (FR-061, FR-062, `RN-MAT-01` — Risco: Alto)
- [X] T041 [US1] Ampliar `supabase/tests/010_estrutura.sql`: **27 tabelas**, **zero** sem RLS, **zero** policies de `DELETE`, **zero** tabelas com RLS forçada. Acrescentar as duas guardas negativas que faltavam: **toda FK tem `ON DELETE` explícito** (FR-007) e **não existe tabela de subunidade de ensino** (FR-026) — as demais proibições já têm guarda em T019, T051 e T073 (FR-001, **FR-007**, **FR-026**, FR-032, FR-033)
- [X] T042 [US1] `pnpm db:reset` do zero, `pnpm test:invariantes` verde, `pnpm db:tipos` regenerado e commitado

**Checkpoint**: **MVP entregue.** 27 entidades de pé, regras impostas pelo motor, grão de UE provado.

---

## Phase 4: User Story 4 — Parâmetro normativo como dado (P4)

**Goal**: tetos, faixas e listas administráveis viram dado com norma de origem — e **nenhum deles
vira bloqueio**.

**Independent Test**: consultar os parâmetros e conferir os tetos, as três faixas e o limite diário,
cada um com a norma citada; lançar um caso que excede teto e **confirmar que é aceito**.

> **Vem antes de US2 e US3 por dependência técnica**, não por prioridade: as policies (US2) consultam
> `perfil_permissao`, e as funções de domínio (US3) leem `config_parametros`.

- [X] T043 [US4] Criar `supabase/migrations/<ts>_configuracao_calendario_e_matriz.sql` com `pnpm db:migration configuracao_calendario_e_matriz`
- [X] T044 [US4] Criar `config_listas` e `config_parametros`, revisando contra `docs/sql-referencia/03_config_e_calendario.sql` — arquivo: `supabase/migrations/<ts>_configuracao_calendario_e_matriz.sql`
- [X] T045 [US4] Criar `perfil_permissao (perfil, recurso, acao, permitido)` com `unique (perfil, recurso, acao)`. **A ação chama-se `desativar`, nunca `excluir`** (FR-022 análogo, FR-035, contracts/matriz-de-permissao.md §4) — arquivo: `supabase/migrations/<ts>_configuracao_calendario_e_matriz.sql`
- [X] T046 [US4] Criar `feriados`, `janelas_curso` e `reservas_proens`, que aposentam as constantes `FERIADOS_2027`, `SEMENTES_2027` e `RESERVAS_PROENS` do `Código.gs` (`RF-DADOS-04`, `RNF-MAN-04`) — arquivo: `supabase/migrations/<ts>_configuracao_calendario_e_matriz.sql`
- [X] T047 [US5] Criar `migracao_log` e `arquivo_avaliacoes_v1` — as duas tabelas append-only. Os gatilhos e as revogações vêm em M5 e M6 (FR-051, FR-053) — arquivo: `supabase/migrations/<ts>_configuracao_calendario_e_matriz.sql`
- [X] T048 [US4] Acrescentar as FKs postergadas de `registros_aula`, `avaliacoes` e `atividades_nao_letivas` para `config_listas`, que só agora tem alvo — arquivo: `supabase/migrations/<ts>_configuracao_calendario_e_matriz.sql`
- [X] T049 [US4] **Semear na própria migration** os tetos AEC 10% / TAD 5% / TR 10%, as três faixas de carga horária docente (20h → 8–12h, 40h → 16–24h, DE → 16–30h) e o limite diário de tempos — **cada um com o fundamento normativo preenchido** (FR-048, `RNF-NORM-08`). Na migration e não em `seed.sql`, porque `seed.sql` **não chega à produção** (research §6) — arquivo: `supabase/migrations/<ts>_configuracao_calendario_e_matriz.sql`
- [X] T050 [US4] Semear `config_listas` com os domínios administráveis: metodologias, tipos de atividade, tipos de avaliação, subtipos de atividade não letiva, classificações de curso — arquivo: `supabase/migrations/<ts>_configuracao_calendario_e_matriz.sql`
- [X] T051 [US4] **Revisar toda a migration procurando `CHECK` que implemente teto normativo — e removê-lo.** Teto excedido, 9º tempo de aula e capacitação pendente são **alerta com justificativa**, nunca recusa (FR-049, `RN-DEG-02`). É o erro que a plataforma convida a cometer — arquivo: `supabase/migrations/<ts>_configuracao_calendario_e_matriz.sql`
- [X] T052 [US4] Ligar auditoria, habilitar RLS e escrever o plano de reversão de M4 (FR-056) — arquivo: `supabase/migrations/<ts>_configuracao_calendario_e_matriz.sql`
- [X] T053 [P] [US4] Escrever `supabase/tests/070_normativo.sql` com o **teste positivo**, nomeado **`RN-DEG-02`**: um lançamento de **9 tempos de aula é aceito**. Se falhar, alguém transformou teto em bloqueio (FR-050). Incluir a asserção de que todo parâmetro tem fundamento normativo preenchido e a de **`RN-2027-06`** — as faixas de CH docente estão cadastradas como **faixa**, nunca como o número do regime (FR-048)
- [X] T054 [US4] `pnpm db:reset`, `pnpm test:invariantes`, `pnpm db:tipos`

**Checkpoint**: parâmetro normativo é dado, com norma citada, e alerta — não bloqueia.

---

## Phase 5: User Story 3 — Derivados sem segunda fonte de verdade (P3)

**Goal**: cada grandeza calculada tem **uma** origem, e tentar gravá-la falha.

**Independent Test**: inserir unidades e execução contra elas; conferir que a carga executada da
disciplina bate com a soma das unidades; tentar gravar derivado e esperar a recusa; procurar campo
editável de carga executada e não encontrar nenhum.

- [X] T055 [US3] Criar `supabase/migrations/<ts>_derivados_e_funcoes_de_dominio.sql` com `pnpm db:migration derivados_e_funcoes_de_dominio`
- [X] T056 [US3] Criar as funções de domínio de `app`: parâmetro numérico, regime vigente, peso de posto, ordem de antiguidade e situação de vista — todas `stable`, `security definer`, com `search_path` fixo, revisando contra `docs/sql-referencia/04_views_e_funcoes.sql` — arquivo: `supabase/migrations/<ts>_derivados_e_funcoes_de_dominio.sql`
- [X] T057 [US3] Criar `app.usuario_atual()`, `app.perfil_atual()` e `app.pode(recurso, acao)`. **Manter o tratamento de tabela inexistente que devolve "ninguém"**: `usuarios` só nasce em M6, e como nenhuma policy concede acesso a "ninguém", o padrão de falha é **negar** — degradação segura, e é o que permite M5 aplicar isoladamente (research §5) — arquivo: `supabase/migrations/<ts>_derivados_e_funcoes_de_dominio.sql`
- [X] T058 [US3] Criar as views que substituem as colunas-fórmula da v2.0: regime vigente do curso, rótulo de turma, habilitação rotulada, ocupação de tempos, carga por turma, conformidade de tetos, carga anual do instrutor e situação de avaliações — arquivo: `supabase/migrations/<ts>_derivados_e_funcoes_de_dominio.sql`
- [X] T059 [US3] Criar **`vw_unidades_ensino_execucao`** — previsto do currículo × executado dos fatos × saldo, por unidade. É a view nova que o grão de UE torna possível (research §4) — arquivo: `supabase/migrations/<ts>_derivados_e_funcoes_de_dominio.sql`
- [X] T060 [US3] **Reescrever `vw_disciplinas_execucao`** para agregar a view anterior por disciplina × turma, mantendo avaliação e vista na soma (`RN-EVT-03`). **A assinatura pública não muda** — CHD, DSA, Cronograma e motor preditivo não percebem a mudança de grão, que é o que a rota (b) prometeu (FR-028, FR-030, contracts/superficie-de-dados.md §4) — arquivo: `supabase/migrations/<ts>_derivados_e_funcoes_de_dominio.sql`
- [X] T061 [US5] Ligar `app.bloquear_reescrita()` a `migracao_log` e `arquivo_avaliacoes_v1` (FR-051) — arquivo: `supabase/migrations/<ts>_derivados_e_funcoes_de_dominio.sql`
- [X] T062 [US3] Escrever o plano de reversão de M5 — totalmente reversível, não há dado (FR-056) — arquivo: `supabase/migrations/<ts>_derivados_e_funcoes_de_dominio.sql`
- [X] T063 [P] [US3] Escrever `supabase/tests/060_derivados.sql`, com asserções nomeadas **`RN-CRUD-02`** e **`RN-INST-04`**: `UPDATE` em coluna derivada **falha**; **não existe** campo gravável de carga executada em `disciplinas` nem em `instrutores`; a carga executada da disciplina bate com a soma das unidades num conjunto sintético (FR-027, FR-028, FR-029)
- [X] T064 [P] [US3] Acrescentar a `supabase/tests/050_grao_unidade_ensino.sql` a asserção de **FR-024**: para toda disciplina com unidades cadastradas, a soma das cargas horárias das unidades é igual à carga da disciplina. **Passa vacuamente em base vazia** e passa de verdade após a carga do Épico 2 — está escrita agora para que o dado já encontre o teste pronto
- [X] T065 [US3] `pnpm db:reset`, `pnpm test:invariantes`, `pnpm db:tipos`

**Checkpoint**: zero grandezas com duas fontes de verdade; a mudança de grão é invisível a quem consome.

---

## Phase 6: User Story 2 — Autorização no banco, trocável sem implantação (P2)

**Goal**: a fronteira é o dado, não a tela; e mudar quem pode o quê é alteração de uma linha.

**Independent Test**: sessão autenticada de verdade, perfil a perfil, em transação descartável. Para
cada perfil, provar o **negativo**. Depois alterar uma linha da matriz e observar o comportamento
mudar sem nenhuma alteração de código.

- [X] T066 [US2] Criar `supabase/migrations/<ts>_acesso_rls_e_permissoes.sql` com `pnpm db:migration acesso_rls_e_permissoes`
- [X] T067 [US2] Criar `usuarios` com `unique (auth_user_id)` **anulável** — é a janela entre o cadastro e o aceite do convite, em que o Admin revisa o perfil — e `usuario_curso` (FR-013) — arquivo: `supabase/migrations/<ts>_acesso_rls_e_permissoes.sql`
- [X] T068 [US2] Criar `app.eh_admin()`, `app.cursos_do_usuario()`, `app.alcanca_curso()`, `app.alcanca_turma()` e `app.alcanca_disciplina()`, todas `security definer` e `stable`. **`alcanca_turma(NULL)` devolve verdadeiro de propósito**: turma nula é escopo global (FR-040, doc 22 §5.4) — arquivo: `supabase/migrations/<ts>_acesso_rls_e_permissoes.sql`
- [X] T069 [US2] Conceder os privilégios de tabela a `authenticated`, **sem `DELETE`**, e **revogar tudo de `anon`** (FR-033, FR-045) — arquivo: `supabase/migrations/<ts>_acesso_rls_e_permissoes.sql`
- [X] T070 [US5] Revogar `INSERT`/`UPDATE` de `authenticated` em `migracao_log` e `arquivo_avaliacoes_v1` — a segunda camada da imutabilidade, além do gatilho de T061 (FR-039 análogo, FR-053) — arquivo: `supabase/migrations/<ts>_acesso_rls_e_permissoes.sql`
- [X] T071 [US2] Escrever as ~78 policies, **incluindo as de `unidades_ensino`**, que não existem no referência. **Nenhuma contém perfil literal** — toda policy pergunta `app.pode()` (FR-034) — arquivo: `supabase/migrations/<ts>_acesso_rls_e_permissoes.sql`
- [X] T072 [US2] Conferir, policy por policy, que **toda policy de `UPDATE` tem `WITH CHECK` além de `USING`**. Sem ela um Operador reatribui um registro a uma turma fora do escopo e **leva o dado junto**, sem violar nada — é o defeito T-03 (FR-036) — arquivo: `supabase/migrations/<ts>_acesso_rls_e_permissoes.sql`
- [X] T073 [US2] Conferir que **nenhuma policy de `DELETE` foi escrita** e que **nenhuma tabela recebeu `FORCE ROW LEVEL SECURITY`** — forçar reintroduz a recursão que `security definer` existe para quebrar (FR-033, doc 22 §5.3) — arquivo: `supabase/migrations/<ts>_acesso_rls_e_permissoes.sql`
- [X] T074 [US2] Escrever as policies das **três tabelas de fronteira** — `perfil_permissao`, `usuarios`, `usuario_curso` — presas a `app.eh_admin()`, e **não** à matriz: ela não pode ser a autoridade sobre quem a edita. A **leitura** de `perfil_permissao` fica aberta a qualquer sessão autenticada (FR-038, FR-039) — arquivo: `supabase/migrations/<ts>_acesso_rls_e_permissoes.sql`
- [X] T075 [US2] Criar o gatilho `app.impedir_autoescalonamento` em `usuarios`. **Policy não basta** — ela não enxerga o que mudou e aprovaria a escalada. O gatilho **libera explicitamente o contexto sem sessão autenticada**, sob pena de bloquear o ETL e a desativação de conta pelo painel (FR-037, doc 22 §6.3) — arquivo: `supabase/migrations/<ts>_acesso_rls_e_permissoes.sql`
- [X] T076 [US2] Semear as 152 linhas de `perfil_permissao`, **com as concessões `(a)` e `(b)` confirmadas**: a CIAARA-11 escreve nas tabelas de fato; CIAARA-11 e Admin administram calendário e parâmetros (FR-043, decisão de 28/08/2026). **Remover as marcas de revisão** `(a)`/`(b)` do arquivo — arquivo: `supabase/migrations/<ts>_acesso_rls_e_permissoes.sql`
- [X] T077 [US2] Escrever o plano de reversão de M6 — a mais delicada: `drop policy` em massa e `drop table` das duas (FR-056) — arquivo: `supabase/migrations/<ts>_acesso_rls_e_permissoes.sql`
- [X] T078 [US2] Portar os doze testes T-01 a T-12 de `docs/sql-referencia/05_rls_policies.sql` (Parte VI) para `tests/invariantes/rls/rls.test.ts`, **com cliente autenticado por perfil**, sob asserção nomeada **`RN-RBAC-02`**. Em pgTAP eles rodariam como dono do schema, onde a RLS não se aplica — e **aprovariam uma RLS desligada**. Cobre, por correspondência direta: T-01 → FR-031, T-04 → FR-045, T-05 → FR-037, T-07 → FR-033, T-09 → **FR-041**, T-10 → FR-040, T-11 → **FR-042**, T-12 → FR-031 (FR-058, research §7)
- [X] T079 [US2] Acrescentar a `rls.test.ts` o teste do **critério 7 do documento 06**: desligar uma linha da matriz e observar a policy mudar de comportamento **sem nenhuma alteração de código**
- [X] T080 [US2] `pnpm db:reset`, `pnpm test:invariantes`, **`pnpm test:rls`**, `pnpm db:tipos`

**Checkpoint**: autorização no banco, teste negativo por perfil verde, matriz trocável por dado.

---

## Phase 7: User Story 5 — Autoria automática e histórico imutável (P5)

**Goal**: verificar de ponta a ponta o que M1, M4, M5 e M6 construíram em pedaços.

**Independent Test**: gravar com sessão autenticada e conferir autor e momento; gravar **sem** sessão
e conferir que a linha entra íntegra; tentar alterar e apagar o log, como usuário comum **e** com a
credencial de maior privilégio.

- [X] T081 [P] [US5] Escrever `supabase/tests/080_imutabilidade.sql`: `UPDATE` e `DELETE` em `migracao_log` **falham**; o mesmo para `arquivo_avaliacoes_v1` (FR-051, FR-053)
- [X] T082 [US5] Acrescentar a asserção que **executa o `UPDATE` com a credencial de maior privilégio e espera a falha** — a que ignora todas as demais regras de acesso **não ignora este gatilho**. É o Princípio IV, e é a asserção mais importante do arquivo (FR-051) — arquivo: `supabase/tests/080_imutabilidade.sql`
- [X] T083 [P] [US5] Acrescentar a asserção de autoria: uma escrita com sessão autenticada preenche autor e momento; um autor **informado por quem escreve é sobrescrito**, não aceito (FR-006) — arquivo: `supabase/tests/080_imutabilidade.sql`
- [X] T084 [US5] Acrescentar a asserção do **caminho sem sessão** — o do ETL: a linha entra íntegra e **nenhum outro campo é descartado**. É o defeito que o invólucro de T009 existe para evitar, e ele só aparece neste caminho (FR-054) — arquivo: `supabase/tests/080_imutabilidade.sql`
- [X] T085 [US5] Executar `pnpm test:invariantes` e confirmar as quatro asserções verdes

**Checkpoint**: histórico imutável em três camadas, provado — inclusive contra a credencial de maior privilégio.

---

## Phase 8: Polish e fechamento

- [X] T086 Executar `pnpm verificar:tudo` — a sequência completa: verificação rápida, `db:reset`, conferência de tipos, invariantes e RLS
- [X] T087 [P] Percorrer [quickstart.md](./quickstart.md) do passo 1 ao 9 numa base recém-reconstruída e confirmar **cada valor esperado**: 27 tabelas, zero sem RLS, zero policies de `DELETE`, zero RLS forçada
- [X] T088 [P] Conferir a rastreabilidade: **toda regra `RN-` de risco alto** tocada por esta fatia tem asserção **nomeada pelo próprio identificador**. Stub explicitamente pendente é aceito; **cobertura fingida não** (FR-059) — varrer `supabase/tests/*.sql` e `tests/invariantes/rls/rls.test.ts`
- [X] T089 [P] Atualizar a seção *Estado atual e onde retomar* do `CLAUDE.md`: Épico 1 concluído, contagens reais de tabelas, policies e tipos medidas no banco
- [ ] T090 [P] Registrar em `docs/` os achados A-1 a A-5 e A-12 — as contagens divergentes entre documentos e o conflito do documento 24 §1 sobre onde vivem os testes. **São correções de documento, não de código**
- [ ] T091 Abrir o PR com o template inteiro preenchido, **os seis planos de reversão** e a lista de conferência de [quickstart.md](./quickstart.md) §10. Commits no padrão `db(<identificador>): <resumo no imperativo>`

---

## Dependências

```
Setup (T001–T004)
   └─> Foundational M1 (T005–T012)          ← bloqueia tudo
          └─> US1 · M2+M3 (T013–T042)  🎯 MVP
                 └─> US4 · M4 (T043–T054)   ← matriz e parâmetros: pré-requisito técnico
                        └─> US3 · M5 (T055–T065)
                               └─> US2 · M6 (T066–T080)
                                      └─> US5 verificação (T081–T085)
                                             └─> Polish (T086–T091)
```

**A cadeia é linear porque um schema é linear.** O que se paraleliza é a **escrita dos testes**, não a
ordem das migrations.

---

## Oportunidades de paralelismo

| Grupo | Tarefas | Por que podem ir juntas |
|---|---|---|
| Testes de US1 | T037, T038, T039, T040 | Arquivos distintos em `supabase/tests/`, todos sobre M2+M3 já aplicadas. **T040 é a asserção de `RN-MAT-01`** |
| Teste normativo | T053 | Arquivo próprio, independente dos demais |
| Testes de derivados | T063, T064 | T064 toca `050_*`, T063 cria `060_*` |
| Testes de imutabilidade | T081, T083 | Asserções independentes no mesmo arquivo — coordenar a escrita |
| Fechamento | T087, T088, T089, T090 | Verificação e documentação, sem sobreposição |

**T003 e T004** também são paralelos entre si: um roda o arnês, o outro sonda o PG17.

---

## Estratégia de entrega

**MVP = Fase 1 + Fase 2 + Fase 3** (T001–T042). Entrega as 27 entidades com as regras impostas pelo
motor e o grão de UE provado. **É o que desbloqueia o Épico 2** — o ETL precisa de estrutura, não de
policies.

**Incremento 2 = Fase 4** (T043–T054). Parâmetro normativo como dado. Pequeno e autocontido.

**Incremento 3 = Fases 5 e 6** (T055–T080). Derivados e autorização. **Não separe as duas em PRs
distintos sem necessidade**: as policies de M6 dependem de `app.pode()`, que nasce em M5, e um PR que
aplique M5 sem M6 deixa a base com RLS ligada e sem policy nenhuma — inacessível por construção.

**Fechamento = Fases 7 e 8** (T081–T091).

---

## Fora de escopo — não gerar tarefa

| Item | Onde |
|---|---|
| **Carga das 572 unidades de ensino** | **Épico 2** — depende de `disciplinas`. É o achado **A-13**: uma tarefa nova do Épico 2, a sequenciar logo após a carga de disciplinas |
| Carga do histórico e reconciliação | Épico 2 |
| Telas de administração | Épico 3 |
| `liq_emitida`, `papel_liq` | Épico 11 (LIQ-3, LIQ-4) |
| Subunidade de ensino como tabela | Sem requisito — Princípio X (FR-026) |
| Motor preditivo, distribuição semanal, detecção de conflito | `lib/dominio/` — **fronteira deliberada**: o SQL agrega fatos, não planeja |
| `.github/workflows/ci.yml` | Épico 0 §6.7 — portão de entrega, não desta fatia |

---

## Rastreabilidade de requisitos

### Requisitos funcionais → tarefas

| História | Requisitos | Tarefas |
|---|---|---|
| **US1** (P1) | FR-001 · 002 · 003 · 004 · 005 · 006 · **007** · 008 · 009 · 010 · 011 · 012 · 013 · 014 · 015 · 016 · 017 · 018 · **019** · 020 · 021 · 025 · **026** · **061** · **062** | T013–T042 |
| **US2** (P2) | FR-031 · 032 · 033 · 034 · 035 · 036 · 037 · 038 · 039 · 040 · **041** · **042** · 043 · 044 · 045 | T066–T080 |
| **US3** (P3) | FR-027 · 028 · 029 · 030 | T055–T065 |
| **US4** (P4) | **FR-046** · FR-047 · 048 · 049 · 050 | T043–T054 |
| **US5** (P5) | FR-006 · 051 · **052** · 053 · 054 | T009, T047, T061, T070, T081–T085 |
| Transversal | **FR-055** · FR-056 · 057 · 058 · 059 · 060 | T012, T026, T035, T042, T052, T062, T077, T086–T091 |
| **Parcial — carga no Épico 2** | FR-022, FR-023 | T018 e T064 entregam estrutura, constraint e teste; **o preenchimento é do Épico 2** |

Os identificadores em **negrito** eram as lacunas apontadas pela análise de 29/08/2026; foram fechadas
nesta revisão. **FR-052** ("corrigir é registrar evento novo") não recebe tarefa própria: ele é
**consequência estrutural de FR-051** — quando o registro não aceita alteração, registrar evento novo
é o único caminho que sobra. T081 e T082 provam o antecedente.

### Critérios de sucesso → tarefas

A análise de 29/08/2026 encontrou **zero** critérios rastreados — a tabela acima mapeava só requisitos.
Cada critério passa a ter a tarefa que o comprova.

| Critério | Tarefa que comprova |
|---|---|
| **SC-001** reconstruir do zero é um comando | T012, T042, T054, T065, T080, T086 |
| **SC-002** 100% das tabelas protegidas | T041 |
| **SC-003** zero exclusão física | T041, T073, T078 |
| **SC-004** as sete regras de unicidade, tentadas e recusadas | T037 |
| **SC-005** 100% das regras condicionais | T038 |
| **SC-006** trocar permissão sem implantação | T079 |
| **SC-007** teste negativo por perfil | T078 |
| **SC-008** zero grandezas com duas fontes de verdade | T063 |
| **SC-009** registro de migração inalterável | T081, T082 |
| **SC-010** parâmetros como dado, com norma de origem | T053 |
| **SC-011** usuário real consegue cadastrar | T007, T078 |
| **SC-012** 9º TA continua aceito | T053 |
| **SC-013** catálogo **pronto** para entrar | T018, T064 — ⚠️ **a entrada efetiva é do Épico 2** |
| **SC-014** soma das UE fecha com a disciplina | T064 |
