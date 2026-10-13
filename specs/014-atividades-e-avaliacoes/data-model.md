# Data model — spec 014, o que muda no banco, tabela a tabela

> **Fase 1 do `/speckit-plan`, 13/10/2026.** SQL de **rascunho**: a migration de verdade é escrita à
> mão na implementação, com cabeçalho, comentários e o rito (research R-15). Nomes em `snake_case`
> sem acento; vocabulário institucional intacto (AEC, TAD, TR, TA, DSA, PROENS). Toda tabela nova
> nasce com RLS, policies, índices, `app.set_auditoria()`, o quarteto de auditoria,
> `origem_migracao_v1` e o `revoke` de `delete`/`truncate` para `authenticated`.
>
> **Legenda:** **[E]** migration de estrutura · **[D]** migration de dado · **(PR n)** onde entra.

## 1. Quem é dado e quem é cálculo

| Grandeza | Dado ou cálculo? | Onde |
|---|---|---|
| CH de disciplina, UE | **dado**, do currículo, **imutável por sync** (D-CUR-1) | `disciplinas`, `unidades_ensino` (existentes) |
| Avaliação prevista (item, tempos, origem) | **dado** — currículo transcrito ou arbitrado | `avaliacoes_curriculo` (+ `_turma`) |
| aula + avaliação = CH | **cálculo** (FR-031.10) | `lib/dominio/avaliacoes/previsto.ts` |
| alerta de projeção | **cálculo** (FR-031.11) | `lib/dominio/avaliacoes/projecao.ts` |
| situação da avaliação e da OD | **cálculo** (FR-050/051) | `lib/dominio/avaliacoes/situacao.ts` ↔ `app.fn_status_vista` |
| "N aplicadas de M", "+ K OD", "vistas A de B" | **cálculo** (FR-056) | `lib/dominio/avaliacoes/contagem.ts` |
| cumprido de AEC/TAD/TR, dias parados | **cálculo** | `vw_carga_horaria_turma` (reescrita) + `lib/dominio/tetos-da-turma.ts` |
| previsto do PROENS | **dado**, por turma e ano | `previsto_proens_turma` |
| limite máximo | **dado** (currículo) **ou cálculo** (norma) | `limites_curriculo` + `limiteMaximo()` |
| categoria da atividade | **derivada do tipo** por gatilho, gravada por compatibilidade | `config_listas.metadados.categoria` → `atividades_nao_letivas.categoria_normativa` |
| dia parado | **dado** | `dias_parados`, `feriados`, `atividades_nao_letivas` (TR bloqueante) |

## 2. Leva 1 — Épico 9

### 2.1 `categoria_normativa` ganha o 5º valor **[E] (PR 1)**

```sql
alter type public.categoria_normativa add value 'Apoio_Individualizado';
-- uso do valor só a partir do PRÓXIMO arquivo (R-7)
```

### 2.2 `atividades_nao_letivas` **[E] (PR 1)**

```sql
-- R-2: a coluna gerada é recriada com a expressão nova (exceção nominal, dúvida D-1)
alter table public.atividades_nao_letivas drop column compoe_cht;
alter table public.atividades_nao_letivas add column compoe_cht boolean
  generated always as (categoria_normativa not in ('Estudo_Individual', 'Apoio_Individualizado')) stored;

alter table public.atividades_nao_letivas
  add column tipo_atividade_id   uuid references public.config_listas(id) on delete restrict,
  add column bloqueia_aula       boolean not null default false,          -- TR por licença não prevista (FR-025.1)
  add column tipo_parada         text,                                     -- valor de config_listas.tipos_parada
  add column quantidade_alunos   smallint check (quantidade_alunos > 0),   -- FR-020, só Apoio Individualizado
  add column outros_instrutores  text[] not null default '{}';             -- FR-046

-- catraca: linha nova exige tipo; a histórica sem tipo casável fica como está
alter table public.atividades_nao_letivas add constraint ativ_tipo_obrigatorio check (
  tipo_atividade_id is not null or origem_migracao_v1 is not null
);
-- a carga das planilhas (`DSAP-`) passa a mandar o tipo (contracts/sincronizacao.md); só o ETL da v2.0 é histórico
-- bloqueia_aula só em TR com tipo_parada; quantidade_alunos só em Apoio_Individualizado
alter table public.atividades_nao_letivas add constraint ativ_bloqueio_so_tr check (
  not bloqueia_aula or (categoria_normativa = 'TR' and tipo_parada is not null)
);
alter table public.atividades_nao_letivas add constraint ativ_alunos_so_apoio check (
  quantidade_alunos is null or categoria_normativa = 'Apoio_Individualizado'
);
-- gatilho app.categoria_pelo_tipo(): BEFORE INSERT OR UPDATE — lê metadados->>'categoria' do tipo,
-- grava categoria_normativa e subtipo; recusa tipo sem categoria (R-3)
```

⚠️ `ativ_estudo_individual_de_turma` (EI sempre de turma) ganha o Apoio Individualizado: **também
sempre de turma** (é de alunos específicos de uma turma).

### 2.3 `config_listas` — duas listas e um gatilho **[E] + [D] (PR 1)**

- Gatilho `app.validar_tipo_de_atividade()`: para `lista = 'tipos_atividade'`, `metadados ->>
  'categoria'` obrigatório e ∈ enum (padrão da migration das salas).
- Lista **`tipos_parada`** `[D]`: `FR` Feriado · `LA` Licença Administrativa · `LP` Licença de
  Pagamento · `NT` Treinamento (nome por extenso conforme as planilhas) · `RC` Recesso · `PF` Ponto
  facultativo; `metadados = { "pode_global": bool, "aceita_tr": bool }`.
- Reclassificação `[D]` dos tipos existentes (FR-021): *Recepção aos alunos* → `TAD`; *Apoio à
  Instrução* → `AEC`; *Monitoria*, *Português para Estrangeiros*, *BDA*, *BDF* →
  `Apoio_Individualizado` (criados se não existirem). Os tipos **sem** categoria hoje (`Aula`,
  `Avaliação`, `Vista de Prova`, `Licença de Pagamento`, `Aula Teórica`, `Aula Prática` — medido em
  `config_listas`) são de **aula/avaliação**, não de atividade: ficam com `ativo = false` **na lista
  de atividade** ou recebem `metadados.uso = 'aula'`, para a FR-010 não os oferecer. Decisão de
  implementação, anotada na migration.

### 2.4 `dias_parados` **[E] (PR 1)** — R-1

```sql
create table public.dias_parados (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique default app.proximo_codigo_dia_parado(),  -- DPA-NNNNNN
  turma_id            uuid references public.turmas(id) on delete restrict,          -- nulo = todas as turmas
  data                date not null,
  ta_inicial          smallint,                                                      -- nulo = dia inteiro
  tempos              smallint,                                                      -- nulo = dia inteiro
  tipo_parada         text not null,                                                 -- config_listas.tipos_parada
  motivo              text not null,
  prevista            boolean not null default true,
  status              public.status_registro not null default 'ativo',
  origem_migracao_v1  text,
  criado_por uuid, criado_em timestamptz not null default now(), editado_por uuid, editado_em timestamptz,
  constraint dpa_tempos_coerentes check ((ta_inicial is null) = (tempos is null)),
  constraint dpa_global_so_parte_do_dia check (turma_id is not null or ta_inicial is not null)
    -- global de dia inteiro é `feriados`, não esta tabela
);
-- policies: ler = atividades_nao_letivas.ler e alcance da turma (global: todos);
-- criar/editar de turma = atividades_nao_letivas.criar/editar + alcanca_turma;
-- criar/editar global = calendario.criar/editar (Q-8). Sem DELETE.
-- índice (data), (turma_id, data).
```

### 2.5 `limites_curriculo` **[E] (PR 1)** + transcrição **[D-1] (PR 1)** — R-11

```sql
create table public.limites_curriculo (
  id uuid primary key default gen_random_uuid(),
  curso_id        uuid not null references public.cursos(id) on delete restrict,
  categoria       public.categoria_normativa not null check (categoria in ('AEC','TAD','TR')),
  tempos          integer not null check (tempos >= 0),
  fonte_arquivo   text not null,
  fonte_pagina    smallint not null,
  status          public.status_registro not null default 'ativo',
  origem_migracao_v1 text, <auditoria>,
  constraint limite_unico unique (curso_id, categoria)
);
-- ler: todos autenticados com alcance do curso; criar/editar: cursos.editar. Sem DELETE.
```

**[D-1]** uma linha por par declarado nos quadros finais (M-8): 12 cursos × AEC e TR, mais TAD nos
dois C-Espc = **26 linhas**, mais os 4 EST-QF com TR = **30 linhas**, cada uma com arquivo e página.
Contagem oficial sai do CSV revisado (R-13).

### 2.6 `config_parametros` **[D] (PR 1 e PR 1.1)**

- `estudo_individual.referencia_com_estudo_obrigatorio_pct = 20` e
  `…_sem_estudo_obrigatorio_pct = 10` (FR-007) — ou reaproveitar `estudo_obrig_com_regime_pct` /
  `estudo_obrig_sem_regime_pct`, que **já existem** (medido). Decisão: **reaproveitar**, só
  conferindo `natureza = 'normativo'`. Nada a criar.
- `avaliacao.vence_em_breve_dias = 2` (A-5), natureza operacional.
- `proens.reserva_generica_tad = 2`, `proens.reserva_generica_tr = 0` (R-10, PR 1.1).

### 2.7 `vw_carga_horaria_turma` e `vw_conformidade_tetos` **[E] (PR 1 e PR 1.1)**

`vw_carga_horaria_turma` reescrita (com `security_invoker = true`, gotcha 10):
- `nao_letivas` passa a incluir as **globais** (`turma_id is null`) em cada turma que **tem DSA na
  data** (ativa, não EAD, e dentro da etapa presencial se semipresencial — FR-013, A-1);
- a categoria vem da junção com o tipo quando `tipo_atividade_id` não é nulo, senão da coluna;
- `ta_apoio_individualizado` fora da CHT; `ta_dias_parados` por junção com `dias_parados` + os
  `feriados dia_inteiro` em dia com DSA (FR-025.4), **fora** da CHT;
- `ta_vista_prova` passa a somar `vistas_de_avaliacao` (PR 4; até lá, as colunas antigas).

`vw_conformidade_tetos` reescrita (PR 1.1): `limite_maximo` e `origem_limite` por `limites_curriculo`
ou percentual; `previsto_proens` por `previsto_proens_turma`; `cumprido`; os dois alertas.

### 2.8 `previsto_proens_turma` + trilha **[E] + [D-3] (PR 1.1)** — R-10

```sql
create table public.previsto_proens_turma (
  id uuid primary key default gen_random_uuid(),
  turma_id        uuid not null references public.turmas(id) on delete restrict,
  categoria       public.categoria_normativa not null check (categoria in ('AEC','TAD','TR')),
  tempos_previstos integer not null check (tempos_previstos >= 0),
  origem_proens   text,
  status          public.status_registro not null default 'ativo',
  origem_migracao_v1 text, <auditoria>,
  constraint previsto_unico unique (turma_id, categoria)
);
create table public.previsto_proens_alteracoes (  -- só de acréscimo; UPDATE/DELETE/TRUNCATE recusados por gatilho, inclusive service_role
  id uuid primary key default gen_random_uuid(),
  previsto_id uuid not null references public.previsto_proens_turma(id),
  tempos_antes integer, tempos_depois integer not null,
  autor_id uuid, registrado_em timestamptz not null default now()
);
-- permissão: recurso 'previsto_proens', ação 'editar' → admin, encarregado_administracao_academica,
-- ajudante_administracao_academica = true; demais = false (caso que discrimina: o Ajudante)
-- policies: ler = alcanca_turma; criar/editar = app.pode('previsto_proens','editar') and alcanca_turma
```

**[D-3]** as 10 linhas de `reservas_proens` com curso → turma de 2026 do mesmo curso (1 por curso,
medido); `origem_proens` preservada; a genérica → `config_parametros`. `reservas_proens` fica,
comentada como aposentada, com policies de escrita **revogadas** (só leitura).

### 2.9 Permissões **[D] (PR 1)**

- `previsto_proens.editar` (acima).
- Nada muda em `calendario.*` (só Encarregado e Admin) nem em `atividades_globais.criar` (inclui o
  Ajudante): a parada global **não** usa `atividades_globais` — usa `calendario` (R-1).

## 3. Leva 2 — Épico 8

### 3.1 `status_avaliacao` ganha `substituida_pela_planilha` **[E] (PR 4)** — R-7

```sql
alter type public.status_avaliacao add value 'substituida_pela_planilha';
alter table public.avaliacoes add column status_anterior public.status_avaliacao;
```

### 3.2 `config_listas.instrumentos_avaliacao` **[D] (PR 4)** — R-4

`PE` Prova Escrita · `PM` Prova Mista · `PP` Prova Prática · `PO` Prova Oral · `PD` Prova Discursiva
· `TG` Trabalho em Grupo · `TI` Trabalho Individual · `EC` Estudo de caso · `PJ` Projeto · `MN`
Monografia · `OD` Observação de Desempenho; `metadados = { "natureza": "prova" | "trabalho" | "od" }`.

### 3.3 `avaliacoes_curriculo` + `avaliacoes_curriculo_turma` **[E] (PR 4)** — R-4

```sql
create table public.avaliacoes_curriculo (
  id uuid primary key default gen_random_uuid(),
  codigo              text not null unique default app.proximo_codigo_avaliacao_curriculo(),  -- AVC-NNNNNN
  disciplina_id       uuid not null references public.disciplinas(id) on delete restrict,
  curso_id            uuid not null references public.cursos(id) on delete restrict,
  ordem               smallint not null,
  instrumento_id      uuid not null references public.config_listas(id) on delete restrict,
  numero              smallint not null,                 -- "Prova 1", "Trabalho 2": numeração por natureza dentro da disciplina
  unidade_ensino_id   uuid references public.unidades_ensino(id) on delete restrict,  -- onde o currículo computa; nulo = disciplina (Q-11)
  ues_abordadas       text,                              -- "UE 1 a 4", informativo
  ta_aplicacao        smallint check (ta_aplicacao >= 0),
  origem_ta_aplicacao text check (origem_ta_aplicacao in ('curriculo','arbitrado','sugestao_planilha')),
  ta_vista            smallint check (ta_vista >= 0),
  origem_ta_vista     text check (origem_ta_vista in ('curriculo','arbitrado','sugestao_planilha')),
  origem_item         text not null check (origem_item in ('curriculo','arbitrado')),
  fonte_arquivo       text,
  fonte_pagina        smallint,
  status              public.status_registro not null default 'ativo',
  origem_migracao_v1 text, <auditoria>,
  constraint avc_disciplina_do_curso foreign key (disciplina_id, curso_id) references public.disciplinas(id, curso_id),
  constraint avc_ue_da_disciplina   foreign key (unidade_ensino_id, disciplina_id) references public.unidades_ensino(id, disciplina_id),
  constraint avc_fonte_se_curriculo check (origem_item <> 'curriculo' or (fonte_arquivo is not null and fonte_pagina is not null)),
  constraint avc_ta_com_origem check ((ta_aplicacao is null) = (origem_ta_aplicacao is null) and (ta_vista is null) = (origem_ta_vista is null)),
  constraint avc_numero_unico unique (disciplina_id, instrumento_id, numero)
);
create table public.avaliacoes_curriculo_turma (   -- ajuste por turma (FR-031.7) e sugestão da planilha (FR-031.8)
  id uuid primary key default gen_random_uuid(),
  avaliacao_curriculo_id uuid not null references public.avaliacoes_curriculo(id) on delete restrict,
  turma_id            uuid not null references public.turmas(id) on delete restrict,
  ta_aplicacao        smallint check (ta_aplicacao >= 0),
  ta_vista            smallint check (ta_vista >= 0),
  origem              text not null check (origem in ('arbitrado','sugestao_planilha')),
  confirmado_em       timestamptz,                       -- nulo enquanto for sugestão a confirmar
  status              public.status_registro not null default 'ativo',
  origem_migracao_v1 text, <auditoria>,
  constraint avct_unico unique (avaliacao_curriculo_id, turma_id)
);
-- ler: alcance do curso; criar/editar: disciplinas.editar (mesma permissão das UEs, FR-038);
-- o arbitrado por turma: avaliacoes.editar + alcanca_turma, só Encarregado e Admin pela matriz (FR-031.7)
-- unidades_ensino precisa de unique (id, disciplina_id) para a FK composta (como ue_curso_coerente)
```

A regra **aula + avaliação = CH** (FR-031.2) é asserção de pgTAP **sobre o catálogo** (soma dos
tempos do currículo por disciplina ≤ `carga_horaria_tempos`) e função pura; **não** é `CHECK`, porque
o arbitrado pode passar e o painel avisa (edge case).

### 3.4 `avaliacoes` **[E] (PR 4)**

```sql
alter table public.avaliacoes
  add column avaliacao_curriculo_id uuid references public.avaliacoes_curriculo(id) on delete restrict,  -- FR-039
  add column ues_abordadas text,                                                                         -- FR-033
  add column outros_instrutores text[] not null default '{}';                                            -- FR-046
-- FK composta (avaliacao_curriculo_id, disciplina_id) → avaliacoes_curriculo(id, disciplina_id): o item é da disciplina da avaliação
-- as colunas de vista única ficam, marcadas `-- [APOSENTADA — v2.1]` no comment (R-5)
-- item_planejado_id (avaliacoes_planejadas) fica só para o histórico (FR-039.1)
```

### 3.5 `vistas_de_avaliacao` **[E] + [D-7b] (PR 4)** — R-5

```sql
create table public.vistas_de_avaliacao (
  id uuid primary key default gen_random_uuid(),
  codigo                text not null unique default app.proximo_codigo_vista(),  -- VST-NNNNNN
  avaliacao_id          uuid not null references public.avaliacoes(id) on delete restrict,
  numero                smallint not null,
  data                  date not null,
  ta_inicial            smallint,
  tempos_consumidos     smallint check (tempos_consumidos > 0),
  ta_final              smallint generated always as (…) stored,
  local                 text,
  conduz_instrutor_id   uuid references public.instrutores(id) on delete restrict,
  conduz_nome_externo   text,
  status                public.status_registro not null default 'ativo',
  origem_migracao_v1 text, <auditoria>,
  constraint vst_numero_unico unique (avaliacao_id, numero),
  constraint vst_conduz_exclusivo check (conduz_instrutor_id is null or conduz_nome_externo is null)
);
-- gatilho app.vista_apos_aplicacao(): data >= avaliacoes.data_avaliacao da mãe (edge case; era a CHECK aval_vista_apos_aplicacao)
-- policies: as de avaliacoes, por alcance da turma da mãe
```

**[D-7b]** toda avaliação com `data_vista_prova` não nula ganha a sessão 1 (copiando os quatro
campos; `conduz_*` nulos, porque a origem não dizia quem conduzia). Contagem antes/depois: nº de
avaliações com vista = nº de sessões 1.

### 3.6 `registros_aula` **[E] (PR 4)**

```sql
alter table public.registros_aula add column outros_instrutores text[] not null default '{}';
```

### 3.7 `app.fn_status_vista` e a planilha de contingência **[E] (PR 4)**

Reescrita para ler `vistas_de_avaliacao` e, sem sessão, o par aposentado; mesmo veredito da função
TS (R-8). `lib/planilha/` lê a situação pela mesma função.

### 3.8 Migrations de **dado** da leva 2 — cada uma com antes/depois (PR 4)

| # | O quê | Antes/depois que Bernardo vê |
|---|---|---|
| **D-4** | Transcrição das avaliações dos 24 currículos (R-13): linhas em `avaliacoes_curriculo` | por curso e disciplina: itens, Σ TA aplicação, Σ TA vista, e a conferência **Σ ≤ CH** |
| **D-5** | Correções §11-A: B-1 (C-Ap-FR III 76→75), B-2/B-3 (MetocOf I 48→30, V 40→50), B-6 (C-Espc-FR TFM 47→48), B-7 (dois códigos/nomes), B-8 (NAV I/II 100/128→108/120), B-5 (ALH III reativada com código do currículo), B-4 e B-12 **conferidos no PDF** e só então decididos | por disciplina: código, nome, CH antes → depois; lançamentos que apontam para ela (contagem, intacta) |
| **D-6** | Unificação (Q-15, FR-031.5): C-Ap-HN I + I-I → **HN-2101** (126); CAHO MAT + FIS → **MATFIS** (56). UEs, `turma_disciplina`, `turma_disciplina_instrutor`, `turma_disciplina_unidade`, `registros_aula`, `avaliacoes`, `atividades_nao_letivas` (AEC com disciplina) movidas; a extra inativada com marca | por turma: contagem de aulas/avaliações/atividades e CH executada **iguais** antes e depois; `turma_disciplina` da unificada com período = união dos dois (dúvida D-2) |
| **D-7** | As 188 substituídas: `status = 'substituida_pela_planilha'`, `status_anterior` lido da marca; a `L206-V` **não** é tocada (FR-049) | 188 → 188; vivas continuam 188; canceladas sem marca: 1 |
| **D-7b** | Vistas → sessão 1 (3.5) | nº com vista = nº de sessões |
| **D-8** | 2º instrutor das 16 aulas: de `observacoes` para `outros_instrutores` (Q-10) | as 16 linhas, texto antes → vetor depois; `observacoes` sem o nome |

## 4. Identidade, unicidade e ciclo de vida

- Sequências novas em `app`: `proximo_codigo_dia_parado` (`DPA-`), `proximo_codigo_avaliacao_curriculo`
  (`AVC-`), `proximo_codigo_vista` (`VST-`), todas com `grant execute` a `authenticated` e
  `service_role` (gotcha 5.1) e registradas em `carregar.avancar_sequencias` (gotcha 9).
- Nada ganha policy de `DELETE`. Desfazer parada = `status = 'inativo'` (FR-028.1). Substituída é
  estado, não exclusão.
- Vigência: nenhuma tabela nova tem `vigente_de/ate`; o previsto do PROENS é por turma (que já tem
  ano), e o limite do currículo muda só quando o currículo muda (linha nova, antiga inativa).

## 5. O que as views e a planilha de contingência passam a ler

| Leitor | Hoje | Depois |
|---|---|---|
| `vw_carga_horaria_turma` | atividades de turma; vista nas colunas da mãe | + globais por turma com DSA; Apoio e dias parados em colunas próprias, fora da CHT; vista pelas sessões |
| `vw_conformidade_tetos` | percentual sobre CHR; reserva por curso | limite do currículo ou norma, com origem; previsto por turma; dois alertas |
| `app.fn_status_vista` | colunas da mãe, `status = 'concluida'` | sessões; situação calculada; OD |
| `vw_ocupacao_ta` / grade do DSA | aula, avaliação, atividade | + dias parados e TR bloqueante como **bloqueio**, não ocupação |
| planilha de contingência (`lib/planilha/`) | vista única | N sessões; situação pela função única; dias parados na CONTROLE |

## 6. Volumes (dimensionar, não otimizar)

24 cursos · ~175 disciplinas · 587 UEs · **≈ 200–260** itens de `avaliacoes_curriculo` (M-7) ·
30 limites · ≤ 28 turmas × 3 previstos · 188 avaliações vivas + 188 substituídas · ~135 sessões de
vista migradas · dias parados: dezenas por ano. Tudo cabe numa leitura por tela.
