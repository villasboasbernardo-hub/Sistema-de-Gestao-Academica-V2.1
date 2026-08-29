---
title: "CIAARA-11 v2.1 — Mapa De-Para Coluna a Coluna (Google Sheets v2.0 → PostgreSQL v2.1)"
author: "Fase 3 do SDLC — Migração · Épico 2"
date: "26/08/2026"
version: "2.1"
origem: "Banco de dados CIAARA-11 v2.0 · ID 1rv9GClzgc5CxISpr504-oXX_EKyUQiumr-djRT0qrdE"
destino: "Supabase PostgreSQL 16 · migrations 00–05"
par: "30-Plano-de-Migracao-ETL.md"
---

# Mapa De-Para Coluna a Coluna — v2.0 → v2.1

## Nota de migração (v2.1)

Este é o **contrato de transporte** da migração de plataforma. O documento 30 diz *como* o ETL roda;
este diz *o que* cada célula da planilha vira no PostgreSQL. Toda linha de código do ETL tem de ser
justificável por uma linha deste mapa — e uma coluna de origem que não apareça aqui é uma coluna que
o ETL vai ignorar em silêncio, que é o defeito que este documento existe para tornar impossível.

**Como ler cada tabela:**

| Convenção | Significado |
|---|---|
| `Coluna origem (aba)` | Cabeçalho **exato** da planilha ao vivo, com a caixa e a pontuação que ela tem |
| `Coluna destino` | Coluna de `public.<tabela>`, `snake_case`, conforme migrations 00–05 |
| **`—` em destino** | Coluna **descartada**. A observação diz por quê. Nunca sem motivo escrito |
| **`—` em origem** | Coluna **nova**, sem origem. A observação diz o **valor inicial** |
| `GEN` | Coluna gerada (`GENERATED ALWAYS … STORED`) — o ETL **não escreve** |
| `view` / `fn` | Resolvido por view ou função — o ETL **não escreve** |
| ⚠️ | Risco que exige atenção ou decisão. Consolidado no §26 |

**Três convenções valem para as 24 tabelas e não se repetem em cada uma:**

1. **`origem_migracao_v1 text`** existe em toda tabela migrada (C-07, BRIEF §2). O ETL o preenche
   com `'<Aba_Origem>:<ID_Origem>'` — por exemplo `'Turmas_Ativas:TUR-000017'`. Quando a planilha já
   trazia a coluna `Origem_Migracao_v1` (rastro da migração v1.0→v2.0), o valor é **concatenado**,
   não substituído: `'Cad_Materias:MAT-0031 | Cad_Disciplinas:042 - C-Ap-FR - NAV-II'`. Perder o
   rastro da v1.0 na migração da v2.1 seria quebrar a trilha que o BRIEF §11 exige. Cada seção
   abaixo **repete a linha de `origem_migracao_v1`** com o valor exato dela, como pedido.
2. **Quarteto de auditoria** `criado_por` / `criado_em` / `editado_por` / `editado_em` (C-06).
   `Registrado_Por` e `Editado_Por` da planilha são **e-mails**; o destino é `uuid`. Resolução
   contra `usuarios.email`; o que não resolve vira `NULL` **com o e-mail bruto em
   `migracao_log.valor_antes`** (documento 30 §2.7b).
3. **`id uuid`** nunca vem da planilha. É `gen_random_uuid()`, e o `ID_*` textual vai para
   `codigo text unique not null` (BRIEF §2; documento 21 §9.1).

**Cobertura.** As 23 abas do inventário de 02/08/2026, **mais** `Turma_Disciplina` (criada na
planilha ao vivo em 20/08/2026, achado LIQ-1). ⚠️ A contagem "23 abas" é anterior a essa criação —
ver a pendência **P-8** do documento 30.

---

## 1. `Cad_Cursos` → `cursos`

**24 linhas.** Perde a titularidade dos parâmetros de regime, que passam a derivar de
`curso_regime_historico`.

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Curso` | `codigo` | `text` UQ | `btrim` | Chave de negócio. É o alvo de todo `JOIN` de FK |
| `Nome_Curso` | `nome_curso` | `text` NOT NULL | `btrim` | — |
| — | `nome_normalizado` | `text` GEN | `app.normalizar_texto(nome_curso)` | **[NOVO]** busca. ETL não escreve |
| `Classificacao` | `classificacao` | `escopo_curso` NOT NULL | minúsculo + `_` | ⚠️ `CHECK ≠ 'geral'`. Valor fora do domínio aborta (P-5) |
| `Modalidade` | `modalidade` | `modalidade_ensino` | `Presencial`→`presencial` etc. | ⚠️ Domínio observado, não declarado (P-4) |
| `Proposito` | `proposito` | `text` | `nullif(btrim(x),'')` | — |
| `Limite_Turmas_Ano` | `limite_turmas_ano` | `smallint` NOT NULL | `::int`, default `1` | `CHECK ≥ 1` |
| `Duracao_Semanas` | `duracao_semanas` | `numeric(6,2)` | vírgula decimal → ponto | `CHECK > 0` |
| `Duracao_Dias` | `duracao_dias` | `integer` | `::int` | `CHECK > 0` |
| `Prioridade_Alocacao` | `prioridade_alocacao` | `criterio_prioridade_alocacao` | mapeada; vazio → default | ⚠️ Domínio não declarado na v2.0 (P-2) |
| `Status` | `status` | `status_registro` NOT NULL | vazio → `ativo` **explícito** | Gera evento `corrigido` no log |
| `Regime_Padrao_Tempos` | — (view) | — | **descartada** | `FORMULA` de exibição → `vw_cursos_regime_vigente`. O dado vive em `curso_regime_historico` |
| `TA_Padrao` | — (view) | — | **descartada** | idem |
| `Intervalo_Padrao` | — (view) | — | **descartada** | idem |
| `Config_Horario_Padrao` | — (view) | — | **descartada** | idem. ⚠️ É a coluna das chaves órfãs `D`/`E`, resolvidas pela FK de `curso_regime_historico` |
| `Regime_Excecao` | — (view) | — | **descartada** | idem. Vira a linha `tipo_regime = 'excecao'` |
| `Config_Horario_Excecao` | — (view) | — | **descartada** | idem |
| `Limite_Diario_EAD` | — (view) | — | **descartada** | Vira `curso_regime_historico.limite_diario_ead_horas` |
| `Origem_Migracao_v1` | `origem_migracao_v1` | `text` | concatena com `'Cad_Cursos:<ID_Curso>'` | **C-07** |
| `Editado_Por` | `editado_por` | `uuid` | e-mail → `usuarios.id` | Não resolvido → `NULL` + log |
| `Timestamp_Edicao` | `editado_em` | `timestamptz` | `at time zone 'America/Sao_Paulo'` | — |
| — | `criado_por` / `criado_em` | `uuid` / `timestamptz` | gatilho `app.set_auditoria()` | `criado_em = now()` da carga |

---

## 2. `Cad_Cursos_Regime_Historico` → `curso_regime_historico`

**29 linhas.** Uma ou duas por curso (`Padrao` e, quando houver, `Excecao`).

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Regime` | `codigo` | `text` UQ | `btrim` (`REG-NNNNNN`) | — |
| `ID_Curso` | `curso_id` | `uuid` NOT NULL FK | `JOIN cursos ON codigo` | Órfão aborta a carga |
| `Tipo_Regime` | `tipo_regime` | `tipo_regime` NOT NULL | `Padrao`→`padrao`, `Excecao`→`excecao` | — |
| `ID_Config_Horario` | `configuracao_horario_id` | `uuid` FK | `JOIN configuracoes_horario ON codigo` | `NULL` nos 4 cursos EAD puros — legítimo |
| `Regime_Tempos` | `regime_tempos` | `smallint` NOT NULL | `::int` | `CHECK 1–12`. **Imutável por norma** (RF-HOR-02) |
| `TA_Duracao_Min` | `ta_duracao_min` | `smallint` NOT NULL | `::int` | `CHECK ∈ (45,50)`. ⚠️ Valor fora disso aborta |
| `Intervalo_Manha_Min` | `intervalo_manha_min` | `smallint` NOT NULL | `::int` | `CHECK 0–120` — barra a recorrência de `1900-03-15` |
| `Intervalo_Tarde_Min` | `intervalo_tarde_min` | `smallint` NOT NULL | `::int` | idem |
| `Hora_Inicio_Manha` | `hora_inicio_manha` | `time` NOT NULL | `::time` | — |
| `Hora_Inicio_Tarde` | `hora_inicio_tarde` | `time` NOT NULL | `::time` | `CHECK tarde > manhã` |
| `Limite_Diario_EAD_Horas` | `limite_diario_ead_horas` | `numeric(4,2)` | vírgula → ponto | `CHECK > 0` |
| `Vigente_A_Partir_De` | `vigente_de` | `date` NOT NULL | `DD/MM/YYYY` | **Coluna central da RN-2027-09** |
| `Vigente_Ate` | `vigente_ate` | `date` | vazio → `NULL` (= vigente) | ⚠️ Alimenta o `EXCLUDE` de sobreposição |
| `Fundamento_Curricular` | `fundamento_curricular` | `text` | `nullif` | RF-HOR-03 |
| `Motivo` | `motivo` | `text` | `nullif` | RF-HOR-09 |
| `Status` | `status` | `status_vigencia` NOT NULL | `Ativo`→`ativo`, `Cancelado`→`cancelado` | O `EXCLUDE` só vale `WHERE status='ativo'` |
| `Registrado_Por` / `Timestamp_Registro` | `criado_por` / `criado_em` | `uuid` / `timestamptz` | e-mail→uuid; fuso | ETL informa explicitamente (o gatilho só preenche se `NULL`) |
| `Editado_Por` / `Timestamp_Edicao` | `editado_por` / `editado_em` | `uuid` / `timestamptz` | idem | — |
| `Origem_Migracao_v1` | `origem_migracao_v1` | `text` | concatena `'Cad_Cursos_Regime_Historico:<ID_Regime>'` | Traz `'Cad_Cursos:{ID}:{Padrao\|Excecao}'` da v2.0 |

⚠️ **Risco nomeado:** `EXCLUDE USING gist (curso_id, tipo_regime, daterange(vigente_de, vigente_ate+1))`
`WHERE status='ativo'` recusa duas vigências ativas sobrepostas. Sondagem **S-03** (documento 30 §7.6)
antes do corte.

---

## 3. `Horarios_Tempos_Aula` → `configuracoes_horario` **+** `horarios_tempos_aula`

**~40 linhas → 5 cabeçalhos + ~40 linhas.** Uma aba de origem, duas tabelas de destino: sem o
cabeçalho não há alvo de FK para "a configuração" (documento 21 §3.2).

### 3a. Cabeçalho → `configuracoes_horario` (`SELECT DISTINCT` sobre a aba)

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Config` | `codigo` | `text` UQ | `DISTINCT` + `btrim` | `CFG-A1`, `CFG-A1-v2` — imutável e versionado |
| `Nome_Config` | `nome_config` | `text` NOT NULL | `DISTINCT` | Descritivo, **nunca chave** |
| `Status` | `status` | `status_config_horario` NOT NULL | `Ativo`→`ativo`, `Substituido`→`substituido` | — |
| — | `substituida_por_id` | `uuid` FK self | **`NULL` na carga** | **[NOVO]** ⚠️ `CHECK` exige não-nulo se `status='substituido'`. Se houver config `Substituido` na origem, o vínculo precisa ser resolvido em 2ª passada — decisão pendente até a sondagem |
| `Origem_Migracao_v1` | `origem_migracao_v1` | `text` | `'Horarios_Tempos_Aula:<ID_Config>'` | Guarda o rótulo original (`A (Normal)`, `C (Curto)`) |

### 3b. Linhas → `horarios_tempos_aula`

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Config` | `configuracao_id` | `uuid` NOT NULL FK | `JOIN configuracoes_horario ON codigo` | Único `ON DELETE CASCADE` do schema |
| `Tempo_Numero` | `tempo_numero` | `smallint` NOT NULL | `::int` | UQ(`configuracao_id`,`tempo_numero`); `CHECK 1–12` |
| `Periodo` | `periodo` | `periodo_dia` NOT NULL | `Manha`→`manha`, `Tarde`→`tarde` | Permite ao DSA desenhar a janela de almoço (RF-HOR-04) |
| `Tipo_Tempo` | `tipo_tempo` | `tipo_tempo` NOT NULL | `Normal`/`Excepcional` → minúsculo | `excepcional` = 9º TA. **Alerta, nunca bloqueio** |
| `Hora_Inicio` | `hora_inicio` | `time` NOT NULL | `::time` | — |
| `Hora_Fim` | `hora_fim` | `time` NOT NULL | `::time` | `CHECK fim > inicio` |
| `Intervalo_Apos_Min` | `intervalo_apos_min` | `smallint` | `::int`, vazio no último TA | `CHECK 0–120`. **É o CHECK que impede a volta de `1900-03-15`** |
| `Nome_Config` | — | — | **descartada aqui** | Vive no cabeçalho (3a). Repeti-la seria a segunda fonte de verdade que a normalização eliminou |
| `Status` | — | — | **descartada aqui** | idem — é atributo da configuração, não do TA |
| `Origem_Migracao_v1` | `origem_migracao_v1` | `text` | `'Horarios_Tempos_Aula:<ID_Config>#<Tempo_Numero>'` | — |

---

## 4. `Turmas_Ativas` → `turmas`

**29 linhas.**

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Turma` | `codigo` | `text` UQ | `btrim` | Era fórmula na v1.0; literal congelado desde a v2.0 (C-04) |
| `ID_Curso` | `curso_id` | `uuid` NOT NULL FK | `JOIN cursos ON codigo` | — |
| `Turma` | `turma` | `text` NOT NULL | `btrim` (`T1`, `T2`) | UQ(`curso_id`,`ano_letivo`,`turma`) |
| `Ano_Letivo` | `ano_letivo` | `smallint` NOT NULL | `::int` | `CHECK 2020–2099` |
| `Alunos` | `alunos` | `smallint` | `::int` | `CHECK ≥ 0` |
| `Modalidade` | `modalidade` | `modalidade_ensino` | minúsculo | ⚠️ P-4 |
| `Data_Inicio` | `data_inicio` | `date` | `DD/MM/YYYY` | — |
| `Data_Termino` | `data_termino` | `date` | `DD/MM/YYYY` | `CHECK término ≥ início` |
| `Sala_Alocada` | `sala_alocada` | `text` | `nullif` | — |
| `Status` | `status` | `status_turma` NOT NULL | `Planejada`/`Ativa`/`Concluida`/`Cancelada` → minúsculo | A única turma vazia já foi classificada na v2.0. `arquivada` **não** existe no ENUM, por decisão de 28/08/2026 (TURMA-1 fechada: é filtro de apresentação) |
| `Nome_Completo_Curso` | — (view) | — | **descartada** | `FORMULA` de exibição → `vw_turmas_rotulo`. Depende de outra tabela ⇒ view, não coluna gerada |
| `Origem_Migracao_v1` | `origem_migracao_v1` | `text` | `'Turmas_Ativas:<ID_Turma>'` | — |
| `Editado_Por` / `Timestamp_Edicao` | `editado_por` / `editado_em` | `uuid` / `timestamptz` | e-mail→uuid; fuso | — |

---

## 5. `Cad_Disciplinas` → `disciplinas`

**175 linhas · 18 colunas na planilha ao vivo** (a spec 033 removeu `Instrutores_Selecionados`, que
estava `#ERROR!`).

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Grade` | `codigo` | `text` UQ | `btrim` | ⚠️ **Não** segue `PREFIXO-NNNNNN`: é a composta `"{ID_Disciplina} - {ID_Curso} - {Cod_Disciplina}"` (spec 036). `text unique` aceita, mas a §26 registra o efeito colateral |
| `ID_Curso` | `curso_id` | `uuid` NOT NULL FK | `JOIN cursos ON codigo` | — |
| `ID_Disciplina` | `id_disciplina_legado` | `text` | `nullif` | Preservado por rastreabilidade; não é chave |
| `Cod_Disciplina` | `cod_disciplina` | `text` NOT NULL | `btrim` | UQ **parcial** (`curso_id`,`cod_disciplina`) `WHERE status='ativo'` |
| `Nome_Disciplina` | `nome_disciplina` | `text` NOT NULL | `btrim` | Nomenclatura P-14 — **"Disciplina"**, nunca "Matéria" |
| — | `nome_normalizado` | `text` GEN | `app.normalizar_texto(...)` | **[NOVO]** chave de casamento da RN-AVAL-01. ETL não escreve |
| `ID_Instrutor` | `instrutores_atribuidos` | `uuid[]` NOT NULL | CSV → `array_agg` resolvido (doc. 30 §2.7a) | ⚠️ Código que não resolve **some do array**. Verificação `V-ARR-01` é obrigatória |
| `ID_Instrutor` | `instrutores_atribuidos_legado_v1` | `text` | **cópia bruta, intacta** | C-07 — é o que torna a conversão reversível |
| `Carga_Horaria_Tempos` | `carga_horaria_tempos` | `integer` NOT NULL | `::int` | `CHECK > 0`. Nome único canônico (achado (f)) |
| `Ordem_Sugerida` | `ordem_sugerida` | `smallint` | `::int` | — |
| `Previsao_Inicio` | `previsao_inicio` | `date` | `DD/MM/YYYY` | **Padrão da grade** — a fonte de verdade por turma é `turma_disciplina` (LIQ-1) |
| `Previsao_Termino` | `previsao_termino` | `date` | `DD/MM/YYYY` | `CHECK término ≥ início` |
| `Semanas` | `semanas` | `integer` GEN | **não escrita** — conferida por `V-GEN-01` | `FORMULA` → coluna gerada (depende só da própria linha) |
| `CH_Semanal` | `ch_semanal` | `numeric(8,2)` GEN | idem | ⚠️ É a **média informativa** herdada da v1.0, **não** a distribuição semanal (RN-DIST-01/02) |
| `Modo_Atribuicao_Padrao` | `modo_atribuicao_padrao` | `modo_atribuicao` NOT NULL | `Dividido`/`Simultaneo` → minúsculo | `CHECK ≠ 'herdar'` — o padrão tem de ser concreto |
| — | `tecnica_ensino_sugerida` | `text` | **`NULL`** | ⚠️ **Coluna nova sem origem**: a spec 033 confirmou que ela **não existe** na planilha ao vivo. Nasce vazia (DISC-1, aprovado em 15/08) |
| — | `local_padrao` | `text` | **`NULL`** | idem |
| `Status` | `status` | `status_registro` NOT NULL | vazio → `ativo` | A duplicata `C-Esp-ALH`/`ALH-II` tem 1 `ativo` + 1 `inativo` — o índice UQ é **parcial** por isso |
| `Instrutores_Selecionados` | — | — | **descartada** | Já removida da planilha (spec 033). Era `FORMULA` derivada e estava `#ERROR!`. A exibição vira JOIN |
| `Origem_Migracao_v1` | `origem_migracao_v1` | `text` | concatena `'Cad_Disciplinas:<ID_Grade>'` | Traz o rastro `Cad_Materias:*` da v1.0 |
| `Editado_Por` / `Timestamp_Edicao` | `editado_por` / `editado_em` | `uuid` / `timestamptz` | e-mail→uuid; fuso | — |
| *(ver §26, R-2)* | `prioridade_alocacao_peso` | `smallint` | **pendente** | ⚠️ A prioridade por disciplina vive em `Config_Parametros` como `PRIORIDADE_DISCIPLINA_{ID_Grade}` e **viola** o `CHECK` de `chave`. Recomendação: promover a coluna aqui (P-7) |

---

## 6. `Turma_Disciplina` → `turma_disciplina` ⚠️

**210 linhas** (89 com período herdado, 121 em branco). Criada em 20/08/2026 pelo achado LIQ-1,
`_Migracao_Log` `LOG-000508`–`LOG-000717`. **É o alvo do Épico 11 (LIQ / OS de Instrutoria).**

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Turma_Disciplina` | `codigo` | `text` UQ | `btrim` (`TDI-NNNNNN`) | Prefixo corrigido na spec 036 (`CRUD_CONFIG` estava vazio) |
| `ID_Turma` | `turma_id` | `uuid` NOT NULL FK | `JOIN turmas ON codigo` | — |
| `ID_Grade` | `disciplina_id` | `uuid` NOT NULL FK | `JOIN disciplinas ON codigo` | UQ **parcial** do par `WHERE status='ativo'` |
| `Previsao_Inicio` | `previsao_inicio` | `date` | `DD/MM/YYYY` | **Fonte de verdade do período por turma** — tem precedência sobre a grade |
| `Previsao_Termino` | `previsao_termino` | `date` | `DD/MM/YYYY` | — |
| `Origem_Periodo` | `origem_periodo` | `origem_periodo` NOT NULL | `Herdado_Grade`/`Manual`/`Nao_Informado` → minúsculo; vazio → `nao_informado` | ⚠️ `CHECK` correlaciona com as datas: `nao_informado` **exige** ambas nulas |
| `Status` | `status` | `status_registro` NOT NULL | vazio → `ativo` | — |
| `ID_Curso` | — | — | **descartada** | Leitura humana da planilha; redundante com `disciplina_id → curso_id`. Resolvida por JOIN |
| `Cod_Disciplina` | — | — | **descartada** | idem. A spec 036 propagava a cópia; o JOIN torna a propagação desnecessária |
| `Nome_Disciplina` | — | — | **descartada** | idem |
| **`ID_Instrutor`** | ⚠️ **sem destino** | — | **lida para `staging`, não promovida** | 🛑 **Seleção EFETIVA do instrutor por turma**, fonte de verdade desde a spec 029. A spec 034 corrigiu um bug em produção exatamente porque a LIQ lia `Instrutor_Disciplina` (habilitação) em vez desta. **Sem coluna no destino ⇒ regressão do Épico 11** (P-6) |
| **`CH_Prevista_Por_Instrutor`** | ⚠️ **sem destino** | — | **lida para `staging`, não promovida** | 🛑 Rateio de CH entre instrutores (spec 032, coluna `Q`). O BRIEF §2.1 a cita ao justificar a tabela; o schema não a modelou (P-6) |
| `Registrado_Por` / `Timestamp_Registro` | `criado_por` / `criado_em` | `uuid` / `timestamptz` | e-mail→uuid; fuso | — |
| `Editado_Por` / `Timestamp_Edicao` | `editado_por` / `editado_em` | `uuid` / `timestamptz` | idem | — |
| `Origem_Migracao_v1` | `origem_migracao_v1` | `text` | `'Turma_Disciplina:<ID_Turma_Disciplina>'` | Traz `'Cad_Disciplinas:{ID_Grade}\|Turmas_Ativas:{ID_Turma}'` |

---

## 7. `Cad_Instrutor` → `instrutores`

**177 linhas.** `Status` vazio em 100% na auditoria; a v2.0 atribuiu `Ativo` a todas, com decisão
registrada. **[PRESERVADO]**

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Instrutor` | `codigo` | `text` UQ | `btrim` | ⚠️ **Inteiro sem prefixo** (RN-CRUD-03 b) — domínio diferente das demais chaves |
| `Posto_Graduacao` | `posto_graduacao` | `text` **NOT NULL** | `btrim` | ⚠️ **D-08.** Já normalizado na v2.0 (símbolo de grau; `SC`/`SCNS` com peso 13) |
| `Esp_Hab_Obs` | `esp_hab_obs` | `text` **NOT NULL** | `btrim` | ⚠️ D-08 — sondagem S-01 |
| `Nome_Completo` | `nome_completo` | `text` **NOT NULL** | `btrim` | ⚠️ D-08 |
| `Categoria` | `categoria` | `text` **NOT NULL** | `btrim` | ⚠️ D-08 |
| `OM` | `om` | `text` **NOT NULL** | `btrim` | ⚠️ D-08 |
| `Nome_Guerra` | `nome_guerra` | `text` | `nullif` | Nome da linha de assinatura do DSA |
| — | `nome_normalizado` | `text` GEN | `app.normalizar_texto(nome_completo)` | **[NOVO]** ETL não escreve |
| `NIP` | `nip` | `text` | `nullif` | **Texto**, não inteiro — pode ter zero à esquerda |
| `Data_Nascimento` | `data_nascimento` | `date` | `DD/MM/YYYY` | — |
| `Dep_Divisao` | `dep_divisao` | `text` | `nullif` | Era `Dep. / Divisão` na v1.0 — achado (g) |
| `Data_Assuncao_Setor` | `data_assuncao_setor` | `date` | `DD/MM/YYYY` | Insumo de `vw_instrutor_carga_anual` |
| `E-mail` | `email` | `text` | `lower(btrim(x))` | `CHECK` de formato; UQ parcial `lower(email)` `WHERE ativo` |
| `Regime de trabalho` | `regime_trabalho` | `regime_trabalho_docente` | `20h`/`40h`/`Dedicação Exclusiva` → `20h`/`40h`/`dedicacao_exclusiva` | ⚠️ Corrige o defeito histórico de usar o **número** do regime como teto (RNF-NORM-03) |
| `Nivel_Escolaridade` | `nivel_escolaridade` | `text` | `nullif` | — |
| `Formacao_Principal_Secundaria` | `formacao_principal_secundaria` | `text` | `nullif` | — |
| `Capacitacao_Didatica` | `capacitacao_didatica` | `text` | `nullif` | Vazio em 83,6% — **alerta, nunca bloqueio** (RNF-NORM-05) |
| `Data_Inicio_Docencia_MB` | `data_inicio_docencia_mb` | `date` | `DD/MM/YYYY` | Cabeçalho estava truncado na v1.0 (`" da Docência na MB"`) — já canônico na v2.0 |
| `Data_Inicio_Docencia_CIAARA` | `data_inicio_docencia_ciaara` | `date` | `DD/MM/YYYY` | `CHECK CIAARA ≥ MB` ⚠️ pode recusar dado inconsistente |
| `Ultima_Avaliacao_Desempenho` | `ultima_avaliacao_desempenho` | `text` | `nullif` | ⚠️ Havia script de remoção não executado na v2.0 — conferir se a coluna ainda existe |
| `Data_Avaliacao_Desempenho` | `data_avaliacao_desempenho` | `date` | `DD/MM/YYYY` | — |
| `Preferencia` | `preferencia` | `text` | `nullif` | Preferência de horário semanal |
| `Disciplinas_Ministradas` | `disciplinas_ministradas_legado_v1` | `text` | **cópia bruta** | ⚠️ **Legado.** Texto livre da v1.0. Não é fonte de atribuição — a fonte é `instrutor_disciplina` |
| `Antiguidade_Declarada` | `antiguidade_declarada` | `text` | **cópia bruta** | Achado (d): dado **vivo** (177/177 preenchidos), não morto. Critério de desempate da RN-ANT |
| — | `antiguidade_declarada_num` | `integer` GEN | dígitos extraídos por regex | **[NOVO]** leitura numérica para ordenação. ETL não escreve |
| `Status` | `status` | `status_registro` NOT NULL | **vazio → `ativo`** | Decisão da migração, não observação — evento no log |
| `Estado` | ⚠️ **sem destino** | — | **lida para `staging`** | ⚠️ Adicionada pela spec 025; a documentação só nomeia o script. Sem definição semântica ⇒ não modelada (P-3) |
| `Tempo no setor (Anos)` | — (view) | — | **descartada** | `FORMULA` → `vw_instrutor_carga_anual` |
| `Docente ≤ 2 disciplinas?` | — (view) | — | **descartada** | idem |
| `Carga horária ministrada no ano` | — (view) | — | **descartada** | RN-INST-04: carga é **sempre calculada, nunca digitada** |
| `Instrutor Completo` | — | — | **descartada** | Já removida pela spec 025 e **não recriada**: RN-INST-03 passa a ser garantida pelos cinco `NOT NULL` |
| `Origem_Migracao_v1` | `origem_migracao_v1` | `text` | `'Cad_Instrutor:<ID_Instrutor>'` | — |
| `Editado_Por` / `Timestamp_Edicao` | `editado_por` / `editado_em` | `uuid` / `timestamptz` | e-mail→uuid; fuso | — |

---

## 8. `Instrutor_Disciplina` → `instrutor_disciplina`

**798 linhas.** É a **habilitação/qualificação** — distinta da seleção efetiva por turma (§6).

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Vinculo` | `codigo` | `text` UQ | `btrim` (`VIN-NNNNNN`) | — |
| `ID_Instrutor` | `instrutor_id` | `uuid` NOT NULL FK | `JOIN instrutores ON codigo` | — |
| `ID_Grade` | `disciplina_id` | `uuid` NOT NULL FK | `JOIN disciplinas ON codigo` | UQ **parcial** do par `WHERE ativo` |
| `ID_Grade_Legado_v1` | — | — | **descartada** | Só existia para guardar o valor do vínculo órfão `VIN-000419`, já corrigido na v2.0. Se ainda tiver conteúdo, vai para `migracao_log.valor_antes` |
| `Modo_Atribuicao` | `modo_atribuicao` | `modo_atribuicao` NOT NULL | `Herdar`/`Dividido`/`Simultaneo` → minúsculo | `herdar` lê `disciplinas.modo_atribuicao_padrao` (RN-MAT-05); a view resolve **uma vez** |
| `Status` | `status` | `status_registro` NOT NULL | vazio → `ativo` | — |
| `Instrutor (Posto/Grad. e Nome)` | — (view) | — | **descartada** | `FORMULA` → `vw_instrutor_disciplina_rotulada`. Era desnormalização exigida pela falta de JOIN no Sheets |
| `Matéria` / `Disciplina` | — (view) | — | **descartada** | idem |
| `Curso` | — (view) | — | **descartada** | idem |
| — | *(`papel_liq`)* | — | **não criada** | **[DEFERIDO]** achado LIQ-3 (Titular/Reserva_1/Reserva_2, Anexo C da NORMHIDRO 30-23) — decisão de 20/08/2026 |
| `Origem_Migracao_v1` | `origem_migracao_v1` | `text` | `'Instrutor_Disciplina:<ID_Vinculo>'` | — |
| `Editado_Por` / `Timestamp_Edicao` | `editado_por` / `editado_em` | `uuid` / `timestamptz` | e-mail→uuid; fuso | — |

---

## 9. `Responsaveis_Curso` → `responsaveis_curso`

**2 linhas semente** (a v1.0 tinha 0 — todo DSA saía sem assinatura).

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Responsavel` | `codigo` | `text` UQ | `btrim` (`RSP-NNNNNN`) | — |
| `ID_Curso` | `curso_id` | `uuid` FK **nullable** | `case when x='GERAL' then null else JOIN end` | ⚠️ **D-04.** O literal `GERAL` vira `NULL` — no Sheets era valor mágico em coluna de FK; aqui `NULL` já significa "não se aplica a um curso" |
| `Ordem` | `ordem` | `smallint` NOT NULL | `::int` | `CHECK ≥ 1`. Posição no rodapé, esquerda→direita |
| `Papel_Assinatura` | `papel_assinatura` | `papel_assinatura` NOT NULL | PascalCase → minúsculo | `elaborador` + `encarregado_divisao` = par mínimo (RF-DSA-06) |
| `Preenchimento` | `preenchimento` | `modo_preenchimento_assinatura` NOT NULL | `Fixo`→`fixo`; `Dinamico_Usuario_Logado`→`dinamico_usuario_logado` | **É a coluna que automatiza a assinatura** |
| `Posto_Graduacao` | `posto_graduacao` | `text` | `nullif` | ⚠️ `CHECK`: obrigatório se `preenchimento='fixo'` |
| `Especialidade` | `especialidade` | `text` | `nullif` | `(T)`, `(AA)` — acompanha o posto na assinatura naval |
| `Nome_Guerra` | `nome_guerra` | `text` | `nullif` | ⚠️ idem `CHECK` de `fixo` |
| `Nome_Completo` | `nome_completo` | `text` | `nullif` | Para relatórios formais por extenso |
| `NIP` | `nip` | `text` | `nullif` | — |
| `Funcao_Descricao` | `funcao_descricao` | `text` NOT NULL | `btrim` | Linha impressa **abaixo** da rubrica |
| `ID_Instrutor_Link` | `instrutor_id` | `uuid` FK | `JOIN instrutores ON codigo` | Permite derivar posto e nome do cadastro |
| `Email_Usuario` | `email_usuario` | `text` | `lower(btrim(x))` | Chave de resolução do modo dinâmico |
| `Email_Usuario` | `usuario_id` | `uuid` | `JOIN usuarios ON lower(email)` | ⚠️ FK **lógica**, sem constraint física (documento 21 §3.3). `CHECK`: `dinamico` exige um dos dois |
| `Vigente_A_Partir_De` | `vigente_de` | `date` NOT NULL | `DD/MM/YYYY` | **Preserva o histórico de rendição de encarregados** (C-08) |
| `Vigente_Ate` | `vigente_ate` | `date` | vazio → `NULL` | `CHECK ≥ vigente_de` |
| `Exibir_No_DSA` | `exibir_no_dsa` | `boolean` NOT NULL | `TRUE`/`VERDADEIRO`/`SIM` → `true` | Permite cadastrar sem imprimir |
| `Status` | `status` | `status_registro` NOT NULL | vazio → `ativo` | — |
| — | `origem_migracao_v1` | `text` | `'Responsaveis_Curso:<ID_Responsavel>'` | **C-07** |
| `Editado_Por` / `Timestamp_Edicao` | `editado_por` / `editado_em` | `uuid` / `timestamptz` | e-mail→uuid; fuso | — |

---

## 10. `Registro_Aulas_E_Atividades` → `registros_aula`

**1.566 linhas** (1.552 Aula Teórica + 14 Aula Prática). As 186 de avaliação foram fundidas em
`Avaliacoes` na v2.0; a única `Evento/Cerimônia` foi para `Eventos_Extracurriculares`.

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Registro` | `codigo` | `text` UQ | `btrim` | — |
| `Data` | `data` | `date` NOT NULL | `DD/MM/YYYY` | ⚠️ `date` **não** converte fuso — `V-DAT-01` prova |
| `ID_Turma` | `turma_id` | `uuid` NOT NULL FK | `JOIN turmas ON codigo` | ⚠️ `R-02` (soma de TA por turma) é o que prova que não trocou |
| `ID_Grade` | `disciplina_id` | `uuid` NOT NULL FK | `JOIN disciplinas ON codigo` | — |
| `ID_Instrutor` | `instrutor_id` | `uuid` FK | `JOIN instrutores ON codigo` | ⚠️ `CHECK`: obrigatório se `categoria_normativa='aula'` (RN-INST-01) |
| `Categoria_Normativa` | `categoria_normativa` | `categoria_registro_aula` NOT NULL | `Aula`→`aula`; `Atividade_Extraclasse`→`atividade_extraclasse` | **[REVOGADO — v2.1]** o valor `Avaliação` não existe mais aqui |
| `Tipo_Atividade` | `tipo_atividade` | `text` | `btrim` | ⚠️ Gatilho valida contra `config_listas.tipos_atividade` ⇒ **`config_listas` carrega antes** |
| `Metodologia` | `metodologia` | `text` | `btrim` | ⚠️ idem, contra `config_listas.metodologias` |
| `Tempos_Consumidos` | `tempos_consumidos` | `smallint` NOT NULL | `::int` | `CHECK 1–12`. **É a grandeza da reconciliação R-02** |
| `TA_Inicial` | `ta_inicial` | `smallint` | `::int` | `CHECK 1–12` |
| — | `ta_final` | `smallint` GEN | `ta_inicial + tempos − 1` | **[NOVO]** ETL não escreve |
| `Conteudo_Resumo` | `conteudo_resumo` | `text` | `nullif` | — |
| `Local` | `local` | `text` | `nullif` | — |
| `Observacoes` | `observacoes` | `text` | `nullif` | — |
| `Status` | `status` | `status_registro` NOT NULL | vazio → `ativo` | C-05 — nada é apagado |
| `Registrado_Por` / `Timestamp_Registro` | `criado_por` / `criado_em` | `uuid` / `timestamptz` | e-mail→uuid; fuso | Autor histórico informado explicitamente |
| `Editado_Por` / `Timestamp_Edicao` | `editado_por` / `editado_em` | `uuid` / `timestamptz` | idem | — |
| `Origem_Migracao_v1` | `origem_migracao_v1` | `text` | concatena `'Registro_Aulas_E_Atividades:<ID_Registro>'` | — |

---

## 11. `Avaliacoes` → `avaliacoes`

**111 linhas + execuções órfãs.** Já é a fonte única de agendamento *e* execução desde a fusão da
Missão 3 (v2.0). Aqui é **transporte**, não fusão — a fusão já aconteceu.

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Avaliacao` | `codigo` | `text` UQ | `btrim` (`AVL-`/`AVA-`) | ⚠️ A v2.0 renumerou `AVL-M*` → `AVA-####`; conferir que não sobrou formato antigo |
| `ID_Turma` | `turma_id` | `uuid` NOT NULL FK | `JOIN turmas ON codigo` | — |
| `ID_Grade` | `disciplina_id` | `uuid` NOT NULL FK | `JOIN disciplinas ON codigo` | Validação cruzada curso↔turma↔disciplina (RN-MAT-01) |
| `Tipo_Avaliacao` | `tipo_avaliacao` | `text` | `btrim` | ⚠️ Gatilho valida contra `config_listas.tipos_avaliacao` |
| `Data_Avaliacao` | `data_avaliacao` | `date` NOT NULL | `DD/MM/YYYY` | Agendar **não** consome TA |
| `TA_Inicial` | `ta_inicial` | `smallint` | `::int` | ⚠️ `CHECK`: par coerente com `tempos_consumidos` — ou ambos nulos, ou ambos preenchidos |
| `Tempos_Consumidos` | `tempos_consumidos` | `smallint` | `::int` | **Compõe a CHD** (RN-EVT-03). `sem_execucao` recebeu `3` na v2.0 — valor **inferido** |
| — | `ta_final` | `smallint` GEN | — | **[NOVO]** |
| `Local` | `local` | `text` | `nullif` | — |
| `Data_Vista_Prova` | `data_vista_prova` | `date` | `DD/MM/YYYY` | `CHECK ≥ data_avaliacao`. 102 das 111 preenchidas |
| `TA_Inicial_Vista` | `ta_inicial_vista` | `smallint` | `::int` | ⚠️ `CHECK` de par coerente |
| `Tempos_Consumidos_Vista` | `tempos_consumidos_vista` | `smallint` | `::int` | **Também compõe a CHD** — R-02 soma os dois |
| — | `ta_final_vista` | `smallint` GEN | — | **[NOVO]** |
| `Local_Vista` | `local_vista` | `text` | `nullif` | — |
| `ID_Instrutor_Responsavel` | `instrutor_responsavel_id` | `uuid` **NOT NULL** FK | `JOIN instrutores ON codigo` | Aplicador — **exige** habilitação (RN-INST-01) |
| `ID_Fiscal` | `fiscal_id` | `uuid` FK | `JOIN instrutores ON codigo` | Fiscal — **não** exige habilitação (RF-AVAL-06) |
| `Nome_Fiscal_Externo` | `nome_fiscal_externo` | `text` | `nullif` | ⚠️ `CHECK` mutuamente exclusivo com `fiscal_id` |
| `Status` | `status` | `status_avaliacao` NOT NULL | `Planejada`→`pendente`; `Aplicada`→`em_andamento`; `Vista Realizada`→`concluida` | 88/16/7 na base auditada |
| `Status_Vista` | — (fn) | — | **descartada** | `FORMULA` → `app.fn_status_vista()` + `vw_avaliacoes_situacao`. **Depende de `CURRENT_DATE`** ⇒ não pode ser coluna gerada |
| `ID_Item_Planejado` | `item_planejado_id` | `uuid` FK | `JOIN avaliacoes_planejadas ON codigo` | Único `ON DELETE SET NULL` do schema |
| `Conteudo_Resumo` | `conteudo_resumo` | `text` | `nullif` | Migrado das execuções legadas |
| `Metodologia` | `metodologia` | `text` | `btrim` | ⚠️ Gatilho valida contra `config_listas.metodologias` |
| `Observacoes` | `observacoes` | `text` | `nullif` | — |
| `Origem_Execucao_v1` | `origem_execucao_v1` | `text` | cópia | `ID_Registro` da execução conciliada |
| `Conciliacao_Migracao` | `conciliacao_migracao` | `conciliacao_migracao` | PascalCase → minúsculo | **Rastro da qualidade da fusão.** Alimenta a conferência humana |
| `Registrado_Por` / `Timestamp_Registro` | `criado_por` / `criado_em` | `uuid` / `timestamptz` | e-mail→uuid; fuso | — |
| `Editado_Por` / `Timestamp_Edicao` | `editado_por` / `editado_em` | `uuid` / `timestamptz` | idem | — |
| `Origem_Migracao_v1` | `origem_migracao_v1` | `text` | concatena `'Avaliacoes:<ID_Avaliacao>'` | — |

---

## 12. `Avaliacoes_Planejadas` → `avaliacoes_planejadas`

**118 linhas.** Estrutura mantida.

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Item` | `codigo` | `text` UQ | `btrim` | — |
| `ID_Curso` | `curso_id` | `uuid` NOT NULL FK | `JOIN cursos ON codigo` | — |
| `Nome_Disciplina` | `nome_disciplina` | `text` NOT NULL | `btrim` | Era `Nome_Materia` — P-14 |
| — | `nome_normalizado` | `text` GEN | `app.normalizar_texto(...)` | **[NOVO]** ⚠️ **Não há FK para `disciplinas`, e é deliberado**: RN-AVAL-01 casa por **nome normalizado**. Criar a FK mudaria a regra de negócio |
| `Descricao_Instrumentos` | `descricao_instrumentos` | `text` | `nullif` | — |
| `Formula_MF` | `formula_mf` | `text` | cópia bruta | ⚠️ **Legado** — achado (k), "adiado com justificativa". Informativo: `RNF-NORM-06` diz que o sistema **não** calcula nota nem média final |
| `Carater` | `carater` | `text` | cópia bruta | ⚠️ idem |
| `Observacoes` | `observacoes` | `text` | `nullif` | — |
| `Status` | `status` | `status_registro` NOT NULL | vazio → `ativo` | — |
| `Origem_Migracao_v1` | `origem_migracao_v1` | `text` | `'Avaliacoes_Planejadas:<ID_Item>'` | — |
| `Editado_Por` / `Timestamp_Edicao` | `editado_por` / `editado_em` | `uuid` / `timestamptz` | e-mail→uuid; fuso | — |

---

## 13. `Eventos_Extracurriculares` → `atividades_nao_letivas`

**664 linhas** (663 + a cerimônia transferida de `Registro_Aulas_E_Atividades`).
**[MIGRAÇÃO v2.1] Renomeada:** o nome antigo descrevia **uma** das quatro categorias e batizava as
quatro. Distribuição: Estudo Individual 531 · AEC 62 · TAD 60 · TR 11.

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Evento` | `codigo` | `text` UQ | `btrim` (`EVT-`/`EXT-`) | ⚠️ A v2.0 renumerou `EVT-M*` → `EXT-####` |
| `Categoria_Normativa` | `categoria_normativa` | `categoria_normativa` **NOT NULL** | 1:1 — o ENUM preserva a caixa (`AEC`,`TAD`,`TR`,`Estudo_Individual`) | **Sem default.** Domínio estritamente fechado (RN-EVT-01) |
| `Subtipo` | `subtipo` | `text` | `nullif` | Lista **sugerida**, não restritiva — sem FK, deliberadamente |
| `Tipo_Legado_v1` | `tipo_legado_v1` | `text` | **cópia bruta, intacta** | ⚠️ **Legado (C-07).** É o que torna a recategorização auditável e reversível por `UPDATE` |
| `Escopo` | `escopo` | `escopo_atividade` NOT NULL | `Turma`→`turma`; `Global`→`global` | 100% `turma` nas linhas migradas |
| `ID_Turma` | `turma_id` | `uuid` FK | `JOIN turmas ON codigo` | ⚠️ `CHECK` correlato: `turma` exige preenchido, `global` exige `NULL` |
| `Data` | `data` | `date` NOT NULL | `DD/MM/YYYY` | — |
| `Descricao` | `descricao` | `text` NOT NULL | `btrim` | — |
| `Tempos_Consumidos` | `tempos_consumidos` | `smallint` NOT NULL | `::int` | `CHECK 1–12`. Entra na R-02 |
| `TA_Inicial` | `ta_inicial` | `smallint` | `::int` | Nasceu vazia na v2.0 (achado (c)). Degradação segura no DSA: faixa de rodapé (RN-DEG-01) |
| — | `ta_final` | `smallint` GEN | — | **[NOVO]** |
| `Local` | `local` | `text` | `nullif` | Coluna nova da v2.0, majoritariamente vazia |
| `Compoe_CHT` | `compoe_cht` | `boolean` GEN | **não escrita** — conferida por `V-GEN-02` | `FORMULA` → coluna gerada: `categoria_normativa <> 'Estudo_Individual'`. Mantém Estudo Individual **fora** de CHT = CHD+AEC+TAD+TR |
| `Observacoes` | `observacoes` | `text` | `nullif` | — |
| `Status` | `status` | `status_registro` NOT NULL | vazio → `ativo` | — |
| `Registrado_Por` / `Timestamp_Registro` | `criado_por` / `criado_em` | `uuid` / `timestamptz` | e-mail→uuid; fuso | — |
| `Editado_Por` / `Timestamp_Edicao` | `editado_por` / `editado_em` | `uuid` / `timestamptz` | idem | — |
| `Origem_Migracao_v1` | `origem_migracao_v1` | `text` | concatena `'Eventos_Extracurriculares:<ID_Evento>'` | — |

---

## 14. `Eventos_Globais` → `feriados` (fusão, parte 1 de 2)

**26 linhas** (24 Dia Inteiro, 2 informativo). Absorvida como caso particular de feriado.
⚠️ Os cabeçalhos exatos desta aba não constam do dicionário da v2.0 §5.10 — o ETL **lê o cabeçalho
real** e falha se não encontrar as colunas abaixo, em vez de assumir posição.

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Evento_Global` | `codigo` | `text` UQ | `btrim`, prefixado `'EGL-'` se colidir com `Calendario_Feriados` | ⚠️ Duas abas para uma tabela: colisão de `codigo` é possível e é **bloqueio**, não renomeação silenciosa |
| `Data` | `data` | `date` NOT NULL | `DD/MM/YYYY` | — |
| — | `ano` | `smallint` NOT NULL | **derivado**: `extract(year from data)` | `CHECK ano = extract(year from data)` valida a própria derivação |
| `Descricao` | `descricao` | `text` NOT NULL | `btrim` | — |
| `Tipo` / `Impacto` | `impacto` | `impacto_feriado` NOT NULL | `Dia Inteiro`→`dia_inteiro`; `Nenhum (informativo)`→`informativo`; `Parcial`→`parcial` | ⚠️ Valor fora do domínio aborta (§6.7 do doc. 30) |
| — | `abrangencia` | `text` | **`NULL`** | Coluna nova; não existe na origem |
| — | `origem_proens` | `text` | **`'Eventos_Globais (migração v2.1)'`** | Documenta a procedência do lote |
| — | `status` | `status_registro` NOT NULL | **`'ativo'`** | Valor inicial explícito |
| — | `origem_migracao_v1` | `text` | `'Eventos_Globais:<ID>'` | **C-07** |

---

## 15. `Calendario_Feriados` → `feriados` (fusão, parte 2 de 2)

Aposenta a constante `FERIADOS_2027` do `Código.gs` (achado (e), RNF-MAN-04).

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Feriado` | `codigo` | `text` UQ | `btrim` | ⚠️ Ver a colisão do §14 |
| `Ano` | `ano` | `smallint` NOT NULL | `::int` | `CHECK 2020–2099` **e** `CHECK ano = year(data)` — se a origem divergir, aborta |
| `Data` | `data` | `date` NOT NULL | `DD/MM/YYYY` | — |
| `Descricao` | `descricao` | `text` NOT NULL | `btrim` | — |
| `Impacto` | `impacto` | `impacto_feriado` NOT NULL | `Dia_Inteiro`/`Parcial`/`Informativo` → minúsculo | `dia_inteiro` zera o dia no motor preditivo |
| `Abrangencia` | `abrangencia` | `text` | `nullif` | — |
| `Origem_PROENS` | `origem_proens` | `text` | `nullif` | Vazio nas linhas herdadas de `Eventos_Globais` |
| `Status` | `status` | `status_registro` NOT NULL | vazio → `ativo` | — |
| `Origem_Migracao_v1` | `origem_migracao_v1` | `text` | `'Calendario_Feriados:<ID_Feriado>'` | — |

---

## 16. `Calendario_Janelas_Curso` → `janelas_curso`

Aposenta a constante `SEMENTES_2027`.

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Janela` | `codigo` | `text` UQ | `btrim` | — |
| `Ano` | `ano` | `smallint` NOT NULL | `::int` | `CHECK 2020–2099` |
| `ID_Curso` | `curso_id` | `uuid` NOT NULL FK | `JOIN cursos ON codigo` | UQ(`ano`,`curso_id`,`turma_prevista`) `WHERE ativo` |
| `Turma_Prevista` | `turma_prevista` | `text` | `nullif` | ⚠️ **Texto, sem FK, deliberadamente**: o PROENS publica a janela **antes** de a turma existir. Amarrá-la a `turmas` inverteria a ordem real dos fatos |
| `Data_Inicio_Prevista` | `data_inicio_prevista` | `date` | `DD/MM/YYYY` | — |
| `Data_Termino_Prevista` | `data_termino_prevista` | `date` | `DD/MM/YYYY` | `CHECK término ≥ início` |
| `Origem_PROENS` | `origem_proens` | `text` | `nullif` | — |
| `Status` | `status` | `status_registro` NOT NULL | vazio → `ativo` | — |
| — | `origem_migracao_v1` | `text` | `'Calendario_Janelas_Curso:<ID_Janela>'` | **C-07** |

---

## 17. `Calendario_Reservas` → `reservas_proens`

Aposenta `RESERVAS_PROENS`. É o "previsto" contra o qual `vw_conformidade_tetos` compara o executado.

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Reserva` | `codigo` | `text` UQ | `btrim` | — |
| `Ano` | `ano` | `smallint` NOT NULL | `::int` | `CHECK 2020–2099` |
| `ID_Curso` | `curso_id` | `uuid` NOT NULL FK | `JOIN cursos ON codigo` | UQ(`ano`,`curso_id`,`tipo_reserva`) `WHERE ativo` |
| `Tipo_Reserva` | `tipo_reserva` | `tipo_reserva` NOT NULL | `TAD`/`TR` — caixa preservada | Só dois valores. AEC **não** é reserva |
| `Tempos_Reservados` | `tempos_reservados` | `integer` NOT NULL | `::int` | `CHECK ≥ 0` |
| `Criterio` | `criterio` | `text` | `nullif` | — |
| `Origem_PROENS` | `origem_proens` | `text` | `nullif` | — |
| `Status` | `status` | `status_registro` NOT NULL | vazio → `ativo` | — |
| — | `origem_migracao_v1` | `text` | `'Calendario_Reservas:<ID_Reserva>'` | **C-07.** ⚠️ Esta aba estava vazia numa verificação de 14/08/2026 e foi populada por script — conferir que continua populada |

---

## 18. `Planejamento_Anual` → `planejamento_anual`

**0 linhas migradas — a tabela nasce vazia, e isso é correto.** A aba de origem é regenerada a cada
execução do motor; nada nela é histórico. O mapa existe para o momento em que o motor da v2.1 gravar
a `Versao = 1`.

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Planejamento` | `codigo` | `text` UQ | `PLAN-{Ano}-{NNNNNN}` | Gerado pelo motor, não pelo ETL |
| `Ano_Letivo` | `ano_letivo` | `smallint` NOT NULL | `::int` | `CHECK 2020–2099` |
| `Versao` | `versao` | `smallint` NOT NULL | `::int` | `CHECK ≥ 1`. Gerar de novo cria `N+1`; **nunca sobrescreve** (RN-2027-07 revertida) |
| `Status_Previa` | `status_previa` | `status_planejamento` NOT NULL | `Rascunho`/`Salvo`/`Arquivado` → minúsculo | ⚠️ Gatilho garante **1 `salvo` por ano** |
| `ID_Curso` | `curso_id` | `uuid` NOT NULL FK | `JOIN cursos` | — |
| `ID_Turma_Prevista` | `turma_prevista_id` | `uuid` FK | `JOIN turmas` | Vazio enquanto a turma não existir |
| `Rotulo_Turma_Prevista` | `rotulo_turma_prevista` | `text` | `nullif` | `T1`, `T2` provisórios |
| `Tipo_Linha` | `tipo_linha` | `tipo_linha_planejamento` NOT NULL | PascalCase → minúsculo | ⚠️ `CHECK` correlato: só `disciplina` admite `disciplina_id` |
| `ID_Grade` | `disciplina_id` | `uuid` FK | `JOIN disciplinas` | UQ **parcial** `WHERE tipo_linha='disciplina'` |
| `Semana_Ano` | `semana_ano` | `smallint` NOT NULL | `::int` | `CHECK 1–53` **e** bate com a data |
| `Data_Inicio_Semana` | `data_inicio_semana` | `date` NOT NULL | `DD/MM/YYYY` | ⚠️ `CHECK isodow = 1` — tem de ser segunda-feira |
| `Tempos_Alocados` | `tempos_alocados` | `smallint` NOT NULL | `::int` | Valor **corrente** (pode ter sido editado) |
| `Tempos_Alocados_Motor` | `tempos_alocados_motor` | `smallint` | `::int` | Valor **original**. Preserva o diff motor × humano |
| `Origem_Linha` | `origem_linha` | `origem_linha_planejamento` NOT NULL | minúsculo | ⚠️ **Gatilho automático** grava `motor_editado` quando os dois tempos divergem |
| `Descricao` / `Observacoes` | `descricao` / `observacoes` | `text` | `nullif` | `descricao` obrigatória na prática para `evento_manual` |
| `Gerado_Por` / `Timestamp_Geracao` | `gerado_por` / `gerado_em` | `uuid` / `timestamptz` | e-mail→uuid; fuso | — |
| `Salvo_Por` / `Timestamp_Salvamento` | `salvo_por` / `salvo_em` | `uuid` / `timestamptz` | idem | Carimbo da promoção `Rascunho`→`Salvo` |
| `Editado_Por` / `Timestamp_Edicao` | `editado_por` / `editado_em` | `uuid` / `timestamptz` | idem | — |
| — | `origem_migracao_v1` | `text` | **`NULL`** | Nada migrado ⇒ sem rastro de origem. É o valor honesto |

---

## 19. `Usuarios` → `usuarios`

**4 linhas → 3.** Pertence à migration de autenticação (documento 21 §3.3). ⚠️ **É a tabela da
armadilha B** do documento 30 §3.2.

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Usuario` | `codigo` | `text` UQ | `btrim` | ⚠️ `USR-04` é **linha-fantasma totalmente vazia** — descartada com evento `arquivado` no log |
| `Email` | `email` | `text` NOT NULL UQ | `lower(btrim(x))` | `CHECK`: tem de estar já minúsculo e sem espaço |
| `Nome` | `nome` | `text` NOT NULL | `btrim` | — |
| — | `nome_exibicao` | `text` | **`NULL`** | Coluna nova; a UI cai para `nome` |
| `Perfil` | `perfil` | `perfil_usuario` NOT NULL | `Admin`→`admin`; `Visualizacao`→`visualizacao`; demais conforme o ENUM de 9 valores | ⚠️ Substitui o `Funcao` de 3 valores da v1.0 |
| `Funcao` | — | — | **descartada** | Domínio de 3 valores superado por `Perfil`. Valor bruto vai para `migracao_log.valor_antes` |
| `Escopo_Curso` | `escopo_curso` | `escopo_curso` NOT NULL | minúsculo; vazio → `geral` | `CHECK`: `operador` exige escopo. Recorte do Operador na RLS |
| `ID_Instrutor_Link` | `instrutor_id` | `uuid` FK | `JOIN instrutores ON codigo` | Liga a conta ao cadastro docente |
| `Status` | `status` | `status_registro` NOT NULL | vazio → `ativo` | ⚠️ `inativo` faz `app.usuario_atual()` devolver `NULL` — **perda de acesso imediata** (teste T-11) |
| `Ultimo_Acesso` | `ultimo_acesso` | `timestamptz` | fuso | Auditoria de acesso |
| — | `auth_user_id` | `uuid` UQ → `auth.users` | **`NULL` na carga** | ⚠️ **Preenchido pelo Épico 3**, quando o Admin enviar o convite. `NULL` aqui significa "credencial ainda não criada" — e a RLS nega tudo nesse estado, corretamente (T-09) |
| — | `observacao` | `text` | **`NULL`** | — |
| — | `origem_migracao_v1` | `text` | `'Usuarios:<ID_Usuario>'` | **C-07** |
| `Editado_Por` / `Timestamp_Edicao` | `editado_por` / `editado_em` | `uuid` / `timestamptz` | e-mail→uuid; fuso | — |

---

## 20. `Usuario_Curso` → `usuario_curso`

N:N do Encarregado de Curso. Pode nascer vazia se nenhum estiver cadastrado.

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Vinculo` | `codigo` | `text` UQ | `btrim` | — |
| `ID_Usuario` | `usuario_id` | `uuid` NOT NULL FK | `JOIN usuarios ON codigo` | — |
| `ID_Curso` | `curso_id` | `uuid` NOT NULL FK | `JOIN cursos ON codigo` | UQ(`usuario_id`,`curso_id`) |
| `Status` | `status` | `status_registro` NOT NULL | vazio → `ativo` | Consultado por `app.cursos_do_usuario()` |
| — | `observacao` | `text` | **`NULL`** | — |
| — | `origem_migracao_v1` | `text` | `'Usuario_Curso:<ID_Vinculo>'` | **C-07** |

---

## 21. `Config_Listas` → `config_listas`

**13 linhas**, já em formato longo desde a v2.0. Listas semeadas: `metodologias`, `tipos_atividade`,
`tipos_avaliacao`, `escala_antiguidade`.

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `Lista` | `lista` | `text` NOT NULL | `lower` + `_` | ⚠️ `CHECK '^[a-z][a-z0-9_]*$'` — nome de lista com maiúscula ou acento **aborta**. Conferir na sondagem |
| `Valor` | `valor` | `text` NOT NULL | `btrim` | `CHECK` não vazio. UQ(`lista`,`valor`) |
| `Rotulo_Exibicao` | `rotulo_exibicao` | `text` NOT NULL | `btrim`; vazio → copia `valor` | Vazio aqui quebraria a UI sem quebrar a carga — copiar é a degradação segura |
| `Ordem` | `ordem` | `smallint` NOT NULL | `::int`, default `0` | ⚠️ Em `escala_antiguidade` **é o peso da RN-ANT-02** — não é ordenação cosmética. `SC`/`SCNS` = peso 13 |
| `Ativo` | `ativo` | `boolean` NOT NULL | `TRUE`/`VERDADEIRO`/`SIM` → `true` | Desativar sem apagar do histórico |
| `Observacao` | `observacao` | `text` | `nullif` | — |
| — | `origem_migracao_v1` | `text` | `'Config_Listas:<Lista>/<Valor>'` | **C-07** — a chave natural, já que a aba não tem `ID_*` |

**Nota de ordem:** esta é a **primeira** tabela a carregar (documento 30 §4). Quatro gatilhos de
`registros_aula` e `avaliacoes` validam valor contra ela; carregá-la depois faz 1.566+111 linhas
falharem com "valor fora do domínio", e a mensagem não diz que o problema é a ordem.

---

## 22. `Config_Parametros` → `config_parametros` ⚠️

Tira do código os tetos AEC 10% / TAD 5% / TR 10%, as faixas de CH docente e os limites de TA por dia
(RNF-NORM-08).

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `Chave` | `chave` | `text` NOT NULL | `btrim` | 🛑 **`CHECK '^[a-z][a-z0-9_.]*$'`.** As linhas `PRIORIDADE_DISCIPLINA_{ID_Grade}` violam-no em quatro pontos (maiúscula inicial, maiúsculas, espaços, hifens) — **a carga falha**. Ver §26, P-7 |
| `Valor` | `valor` | `text` NOT NULL | `btrim` | Sempre texto; `tipo` diz como interpretar |
| `Tipo` | `tipo` | `text` NOT NULL | `lower` | `CHECK ∈ (numero, percentual, inteiro, texto, booleano)` |
| `Unidade` | `unidade` | `text` | `nullif` | — |
| `Ano_Vigencia` | `ano_vigencia` | `smallint` | `::int`; vazio → `NULL` (perene) | UQ(`chave`, `coalesce(ano_vigencia,0)`) `WHERE ativo` |
| `Descricao` | `descricao` | `text` | `nullif` | — |
| `Fundamento_Normativo` | `fundamento_normativo` | `text` | `nullif` | RNF-NORM-07 — a norma que autoriza o valor |
| `Editavel_Por` | `editavel_por` | `perfil_usuario` | minúsculo | — |
| — | `status` | `status_registro` NOT NULL | **`'ativo'`** | Coluna nova; valor inicial explícito |
| — | `origem_migracao_v1` | `text` | `'Config_Parametros:<Chave>'` | **C-07** |
| — | *(seed normativo)* | — | **inserido pela migration `03`** | 13 chaves: `teto.aec_percentual_chr` (10), `teto.tad_percentual_chr` (5), `teto.tr_percentual_chr` (10), as seis `ch_docente.*`, `alocacao.teto_tfm_rigido` (6), `alocacao.limite_ta_dia_padrao` (8), `avaliacao.ta_padrao_bloco_prova` (3), `avaliacao.prazo_vista_dias` (7). **Não vêm da planilha** ⇒ diferença esperada na R-01 |

---

## 23. `_Meta_Colunas` → **aposentada**

**[ABSORVIDO PELA PLATAFORMA]** — este é o exemplo canônico do BRIEF §2.1, e vale escrevê-lo por
extenso porque é o que melhor explica a v2.1 inteira.

| Coluna origem (aba) | Coluna destino | Transformação | Observação / risco |
|---|---|---|---|
| `Aba` | — | **descartada** | Vira `information_schema.tables` |
| `Coluna_Canonica` | — | **descartada** | Vira `information_schema.columns` |
| `Alias_v1` | — | **descartada** | Não há mais alias: os cabeçalhos foram canonizados na v2.0 (C-01) |
| `Tipo` | — | **descartada** | Vira o **tipo real da coluna**, garantido pelo motor — não um contrato paralelo que alguém precisa manter |
| `Obrigatorio` | — | **descartada** | Vira `NOT NULL` |
| `Dominio` | — | **descartada** | Vira `ENUM` (domínio normativo fechado) ou FK para `config_listas` (domínio operacional) |
| `Ativo` | — | **descartada** | Coluna inexistente é ausência real, não uma linha marcada inativa |

**O ponto:** `_Meta_Colunas` existia porque o Sheets não tinha contrato de coluna nativo. No
PostgreSQL o catálogo cumpre esse papel **com garantia do motor**, e os tipos TypeScript gerados
por `supabase gen types typescript` levam o mesmo contrato ao frontend sem ninguém digitá-lo. Um
requisito não foi apagado — foi **absorvido**, e o substituto tem nome.

Nenhuma linha desta aba é transportada. O ETL registra em `migracao_log` **um** evento
`acao = 'arquivado'` para a aba inteira, com `regra_aplicada = 'C-02 absorvida pelo catálogo do
PostgreSQL (BRIEF §2.1)'`.

---

## 24. `_Migracao_Log` → `migracao_log` · **append-only**

⚠️ **A numeração é continuada, nunca reiniciada.** O log da v2.1 é continuação do da v2.0.

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Log` | `codigo` | `text` UQ | `btrim` (`LOG-NNNNNN`) | ⚠️ O ETL segue de `max(codigo)`. A planilha ao vivo já passou de `LOG-001060` (P-8) |
| `Timestamp` | `executado_em` | `timestamptz` NOT NULL | fuso | — |
| `Executado_Por` | `executado_por` | `uuid` | e-mail→uuid | Muitas linhas históricas são de script, não de pessoa ⇒ `NULL` legítimo |
| `Aba_Origem` | `origem_tabela` | `text` NOT NULL | `btrim` | **Renomeada** — "aba" não existe mais |
| `Chave_Origem` | `origem_chave` | `text` | `nullif` | — |
| `Aba_Destino` | `destino_tabela` | `text` | `nullif` | — |
| `Chave_Destino` | `destino_chave` | `text` | `nullif` | — |
| `Acao` | `acao` | `acao_migracao` NOT NULL | `Transportado`/`Transformado`/`Conciliado`/`Arquivado`/`Corrigido` → minúsculo | — |
| `Regra_Aplicada` | `regra_aplicada` | `text` | `nullif` | — |
| `Valor_Antes` / `Valor_Depois` | `valor_antes` / `valor_depois` | `text` | cópia bruta | Guarda o valor bruto, inclusive malformado |
| — | `observacao` | `text` | **`NULL`** | Coluna nova para eventos da v2.1 |
| — | *(sem `origem_migracao_v1`)* | — | — | ⚠️ **Exceção deliberada à convenção C-07**: o log **é** o rastro. Um rastro do rastro seria recursão sem informação |

**Regras de operação, sem exceção** (BRIEF §9): `UPDATE` e `DELETE` são recusados pelo gatilho
`trg_migracao_log_imutavel` (`FOR EACH STATEMENT`). `authenticated` teve `INSERT`/`UPDATE`
explicitamente revogados. Corrigir um registro histórico é **inserir um evento novo**.

---

## 25. `_Arquivo_Avaliacoes_v1` → `arquivo_avaliacoes_v1` · **append-only**

**186 linhas.** Quarentena consultável das execuções legadas fundidas na Missão 3 (RF-DADOS-05).

| Coluna origem (aba) | Coluna destino | Tipo destino | Transformação | Observação / risco |
|---|---|---|---|---|
| `ID_Registro` | `codigo` | `text` UQ | `btrim` | Código legado de `Registro_Aulas_E_Atividades` |
| `Data` | `data` | `date` | `DD/MM/YYYY` | — |
| `ID_Turma` | `turma_codigo_v1` | `text` | **cópia bruta** | ⚠️ **Deliberadamente não resolvido para FK.** Quarentena guarda o que foi, não o que é |
| `ID_Grade` | `disciplina_codigo_v1` | `text` | cópia bruta | idem |
| `ID_Instrutor` | `instrutor_codigo_v1` | `text` | cópia bruta | idem |
| `Tipo_Atividade` | `tipo_atividade_v1` | `text` | cópia bruta | Conterá `Avaliação` — valor que **não existe** mais no domínio ativo |
| `Metodologia` | `metodologia_v1` | `text` | cópia bruta | — |
| `Tempos_Consumidos` | `tempos_consumidos_v1` | `smallint` | `::int` | Fonte da conferência de TA antes × depois da fusão |
| `TA_Inicial` | `ta_inicial_v1` | `smallint` | `::int` | — |
| `Conteudo_Resumo` / `Local` / `Observacoes` | `conteudo_resumo_v1` / `local_v1` / `observacoes_v1` | `text` | cópia bruta | — |
| `Registrado_Por` | `registrado_por_v1` | `text` | **cópia bruta — e-mail, não uuid** | Quarentena não resolve identidade |
| `Timestamp_Registro` | `registrado_em_v1` | **`text`** | **cópia bruta** | ⚠️ **Texto de propósito**: guarda o carimbo bruto inclusive quando malformado. Converter destruiria a evidência que a quarentena existe para guardar |
| `ID_Avaliacao_Destino` | `avaliacao_destino_id` | `uuid` FK | `JOIN avaliacoes ON codigo` | ⚠️ Única FK resolvida aqui — é o elo que torna a fusão auditável |
| `ID_Avaliacao_Destino` | `avaliacao_destino_codigo_v1` | `text` | cópia bruta | Redundância deliberada: o código sobrevive mesmo se a avaliação for desativada |
| — | `arquivado_em` / `arquivado_por` | `timestamptz` / `uuid` | `now()` / `NULL` | Carimbo do arquivamento na v2.1 |
| — | `observacao_migracao` | `text` | `'Transportado de _Arquivo_Avaliacoes_v1 (v2.0) na migração de plataforma v2.1'` | Cumpre o papel de `origem_migracao_v1` nesta tabela |

---

## 26. Riscos consolidados deste mapa

| # | Risco | Onde | Situação |
|---|---|---|---|
| **P-6** | `Turma_Disciplina.ID_Instrutor` e `CH_Prevista_Por_Instrutor` **sem destino** | §6 | 🛑 **Bloqueia.** Sem elas o Épico 11 regride ao bug corrigido pela spec 034 |
| **P-7** | `Config_Parametros.PRIORIDADE_DISCIPLINA_{ID_Grade}` viola `config_param_chave_snake` | §22, §5 | 🛑 **Bloqueia.** A carga falha. Recomendação: promover `disciplinas.prioridade_alocacao_peso` |
| **P-8** | Inventário de abas e numeração do log são de 02/08/2026 | topo, §24 | Confirmar contra a planilha ao vivo antes do corte |
| P-3 | `Cad_Instrutor.Estado` (spec 025) sem semântica definida | §7 | Vai à staging e ao log; não é promovida |
| — | `configuracoes_horario.substituida_por_id` exige 2ª passada se houver config `Substituido` | §3a | Verificar na sondagem; provavelmente não há |
| — | Colisão de `codigo` entre `Eventos_Globais` e `Calendario_Feriados` numa só tabela | §14, §15 | Bloqueio se ocorrer — **nunca** renomear em silêncio |
| — | Cinco `NOT NULL` de `instrutores` recusando linha legada (D-08) | §7 | Sondagem S-01; correção **na planilha** |
| — | `ID_Grade` é string composta com espaços, não `PREFIXO-NNNNNN` | §5 | `text unique` aceita; é a causa raiz de P-7 |
| — | Elemento perdido no `uuid[]` de instrutores | §5 | Verificação `V-ARR-01` obrigatória |

---

## 27. Tabela-resumo — critério de aceite por aba

| # | Aba origem (v2.0) | Linhas esperadas | Tabela destino (v2.1) | Linhas esperadas | Critério de aceite |
|---|---|---|---|---|---|
| 1 | `Cad_Cursos` | 24 | `cursos` | 24 | Contagem exata; 24 `classificacao` no domínio; 7 colunas-fórmula ausentes e `vw_cursos_regime_vigente` devolvendo 24 |
| 2 | `Cad_Cursos_Regime_Historico` | 29 | `curso_regime_historico` | 29 | Contagem exata; **0** violação do `EXCLUDE`; `fn_regime_vigente()` devolve exatamente 1 linha por (curso, tipo, data) |
| 3 | `Horarios_Tempos_Aula` | ~40 | `configuracoes_horario` + `horarios_tempos_aula` | 5 + ~40 | 5 códigos distintos; soma de TA por config bate com a origem; **0** TA órfão |
| 4 | `Turmas_Ativas` | 29 | `turmas` | 29 | Contagem exata; **0** `status` nulo; UQ(curso,ano,turma) sem colisão |
| 5 | `Cad_Disciplinas` | 175 | `disciplinas` | 175 | Contagem exata; `V-ARR-01` = 0; `V-GEN-01` (semanas/ch_semanal) = 0; 1 par duplicado com 1 `ativo` + 1 `inativo` |
| 6 | `Turma_Disciplina` ⚠️ | **210** | `turma_disciplina` | **210** | 210 pares únicos; **89** `herdado_grade`; **121** `nao_informado`; **0** FK órfã. ⚠️ P-6 resolvido |
| 7 | `Cad_Instrutor` | 177 | `instrutores` | 177 | Contagem exata; **0** dos cinco `NOT NULL` violados; 177 `status='ativo'`; `antiguidade_declarada` preenchida em 177 |
| 8 | `Instrutor_Disciplina` | 798 | `instrutor_disciplina` | 798 | Contagem exata; **0** FK órfã; **0** par duplicado ativo |
| 9 | `Responsaveis_Curso` | 2 | `responsaveis_curso` | 2 | 2 linhas com `curso_id IS NULL`; 1 `elaborador` + 1 `encarregado_divisao`; rodapé do DSA sai preenchido |
| 10 | `Registro_Aulas_E_Atividades` | 1.566 | `registros_aula` | 1.566 | Contagem exata; **0** `tipo_atividade` fora de `config_listas`; **0** aula sem instrutor; R-02 fecha nas 29 turmas |
| 11 | `Avaliacoes` | 111 (+ órfãs) | `avaliacoes` | 111 (+ órfãs) | Contagem exata; distribuição 88/16/7 → `concluida`/`em_andamento`/`pendente`; **0** violação do `CHECK` de par TA |
| 12 | `Avaliacoes_Planejadas` | 118 | `avaliacoes_planejadas` | 118 | Contagem exata; `nome_normalizado` casando com `disciplinas.nome_normalizado` na mesma proporção da v2.0 |
| 13 | `Eventos_Extracurriculares` | 664 | `atividades_nao_letivas` | 664 | Contagem exata; **531** `Estudo_Individual` · **62** `AEC` · **60** `TAD` · **11** `TR`; `V-GEN-02` = 0 |
| 14 | `Eventos_Globais` | 26 | `feriados` (parte 1) | 26 | 24 `dia_inteiro` + 2 `informativo`; **0** colisão de `codigo` com a parte 2 |
| 15 | `Calendario_Feriados` | conforme PROENS | `feriados` (parte 2) | idem | `ano` = `year(data)` em 100%; total da tabela = parte 1 + parte 2 |
| 16 | `Calendario_Janelas_Curso` | conforme PROENS | `janelas_curso` | idem | Contagem exata; **0** FK órfã; **0** janela com término < início |
| 17 | `Calendario_Reservas` | conforme PROENS | `reservas_proens` | idem | Contagem exata; **≥ 1 linha** (a aba já esteve vazia por defeito); `vw_conformidade_tetos` retorna sem `NULL` |
| 18 | `Planejamento_Anual` | 0 | `planejamento_anual` | **0** | Tabela vazia é o resultado **correto**. Aceite: `count(*) = 0` e a 1ª execução do motor grava `versao = 1` |
| 19 | `Usuarios` | 4 | `usuarios` | **3** | 3 linhas; `USR-04` ausente **com evento `arquivado` no log**; **0** `auth_user_id` preenchido; `V-ESC-01`/`V-ESC-02` passam |
| 20 | `Usuario_Curso` | conforme cadastro | `usuario_curso` | idem | Contagem exata; **0** FK órfã |
| 21 | `Config_Listas` | 13 | `config_listas` | 13 | Contagem exata; 4 listas presentes; **0** `lista` fora do `CHECK` snake_case; `escala_antiguidade` com `SC`/`SCNS` peso 13 |
| 22 | `Config_Parametros` ⚠️ | origem + 13 seed | `config_parametros` | origem + 13 | **0** chave fora do `CHECK` (sondagem S-04 limpa); os 13 do seed presentes. ⚠️ P-7 resolvido |
| 23 | `_Meta_Colunas` | 0 transportadas | **aposentada** | — | **1** evento `arquivado` no log citando C-02/BRIEF §2.1; nenhuma tabela criada |
| 24 | `_Migracao_Log` | ≥ 503 (P-8) | `migracao_log` | origem + eventos da v2.1 | `max(codigo)` do destino > `max(codigo)` da origem; **0** linha da origem alterada; `UPDATE` recusado pelo gatilho |
| 25 | `_Arquivo_Avaliacoes_v1` | 186 | `arquivo_avaliacoes_v1` | 186 | Contagem exata; 186 com `avaliacao_destino_id` resolvido **ou** justificativa no log; `UPDATE` recusado |
| — | *(sem origem)* | — | `perfil_permissao` | ~180 | Semeada pela migration `05`; **≠ 0** — matriz vazia faz `app.pode()` negar tudo e o sistema sobe inútil |

**Critério global, e ele é literal:** o corte só acontece com **todas** as 25 linhas acima em
conformidade e o relatório de divergência do documento 30 §7.7 com veredito ✅. Não existe
divergência aceitável negociada nesta migração — as três exceções conhecidas (`usuarios` −1,
`config_parametros` + seed, `configuracoes_horario` = 5 cabeçalhos) já estão embutidas nas
verificações. Qualquer outra é achado.

---

*Documento 31 da v2.1. Par obrigatório: `30-Plano-de-Migracao-ETL.md`. Épico 2 do BRIEF §8 — roda
**antes** do Épico 3, porque sem dado migrado não há o que proteger.*
