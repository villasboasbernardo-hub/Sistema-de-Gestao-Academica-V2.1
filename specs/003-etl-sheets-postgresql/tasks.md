# Tasks: Épico 2 — ETL Sheets → PostgreSQL com reconciliação verificável

**Input**: Design documents from `specs/003-etl-sheets-postgresql/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) ·
[data-model.md](./data-model.md) · [contracts/](./contracts/) · [quickstart.md](./quickstart.md)

**Revisão**: `/speckit-clarify` de 08/09/2026 acrescentou 6 tarefas (T018.1, T018.2, T021.1, T026.1, T061.1) — ver *Clarifications* na spec.

**Testes**: **obrigatórios**, e são o produto tanto quanto o código. Um ETL sem reconciliação é um ETL
em que ninguém pode confiar — e este épico existe justamente para produzir a confiança, não só o dado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivo diferente, sem dependência pendente)
- **[Story]**: US1…US5, conforme `spec.md`
- Todo caminho é relativo à raiz do repositório

## Ordem das fases — por que a fase 2 bloqueia tudo

As cinco histórias são P1/P1/P1/P2/P2, mas **dependência manda mais que prioridade**. Duas migrations
bloqueiam a fatia inteira: sem P-6 o `turma_disciplina` não recebe o dado da LIQ, e sem a
anulabilidade da UE **os 17 cursos sem fonte não têm como entrar**. Carga antes disso falha por
`NOT NULL`, e falha tarde — depois de 16 tabelas já promovidas dentro da transação.

| Fase | Conteúdo | Precisa de rede? |
| --- | --- | --- |
| 1 | Setup do pacote e das fontes | Não |
| **2** | **As duas migrations + a staging** | Não |
| 3 · US1 | A carga por um comando, com a recuperação da UE | **Sim** — etapa 1 lê o Sheets |
| 4 · US2 | Reconciliação | Não |
| 5 · US3 | Rastro e `migracao_log` | Não |
| 6 · US4 | Ensaio e sondagem prévia | Sim |
| 7 · US5 | Reversão | Não |
| 8 | Polimento e dívida documental | Não |

**Regra dura:** nada da fase 3 começa antes de `pnpm db:reset` aplicar as duas migrations novas
**e** a suíte pgTAP do Épico 1 continuar verde. Migration que quebra invariante existente não é
migration aditiva — é regressão.

---

## Phase 1: Setup

**Purpose**: o esqueleto do pacote e a leitura confiável das fontes

- [ ] T001 Criar a estrutura de `scripts/etl/` conforme plan.md §Project Structure: `__init__.py`, `_comum.py`, `ordem.py`, `tabelas/`, `dados/{bruto,normalizado}/`
- [ ] T002 [P] Acrescentar `scripts/etl/dados/` ao `.gitignore` — os artefatos brutos contêm dado real da MB e o repositório é público (contrato pipeline P-8)
- [ ] T003 [P] Declarar as dependências Python em `scripts/etl/requirements.txt`: `openpyxl` 3.1.5 (fixado), cliente PostgreSQL, cliente da API do Sheets
- [ ] T004 Escrever `scripts/etl/ordem.py` com as 25 tabelas na ordem do documento 30 §4 — **é a única definição da ordem no repositório** (FR-016). Nenhum módulo de tabela conhece a ordem
- [ ] T005 [P] Silenciar os avisos de `pivotCacheDefinition` do `openpyxl` em `scripts/etl/_comum.py` — são tabelas dinâmicas órfãs nos 7 `.xlsx`, inofensivas (research R-5). Silenciar, não investigar
- [ ] T006 Escrever `scripts/etl/_comum.py` com a função de promoção `staging → public`: `INSERT … SELECT … LEFT JOIN` por `codigo`, precedido de verificação de órfãos que **aborta antes de gravar** (documento 30 §2.6)

---

## Phase 2: Foundational — BLOQUEIA TUDO

**Purpose**: destravar o schema. Sem esta fase, a primeira carga falha por `NOT NULL`

**⚠️ CRÍTICO**: nenhuma história começa antes desta fase fechar

- [ ] T007 Criar a migration de **P-6** em `supabase/migrations/<ts>_p6_turma_disciplina_instrutor.sql`: `instrutor_id uuid references instrutores(id) on delete restrict` e `ch_prevista_por_instrutor`, **ambas anuláveis**, com comentário citando o achado LIQ-1 — é a LIQ do Épico 11 que lê dali (research R-4)
- [ ] T008 Criar a migration da **R-1** em `supabase/migrations/<ts>_ue_anulavel_no_historico.sql`: remover `not null` de `registros_aula.unidade_ensino_id` e acrescentar `check (unidade_ensino_id is not null or origem_migracao_v1 is not null)`, com comentário explicando que a decisão UE-1 **continua obrigatória para todo dado novo** (data-model §1.2)
- [ ] T009 Escrever o plano de reversão das duas migrations no corpo do PR — campo obrigatório do template (documento 24 §6.3)
- [ ] T010 Provar que as migrations são aditivas de verdade: `pnpm db:reset` e a suíte pgTAP do Épico 1 (**80 asserções**) continua verde. Migration que quebra invariante existente é regressão, não adição
- [ ] T011 Acrescentar a asserção pgTAP do `CHECK` da R-1 em `supabase/tests/091_ue_anulavel.sql`: inserir registro **sem** UE e **sem** `origem_migracao_v1` **falha**; com `origem_migracao_v1` **passa**. É o teste que prova que o grão de UE ainda vale para dado novo
- [ ] T012 Rodar `pnpm db:tipos` e commitar `lib/tipos/database.ts` — o CI reprova se o contrato divergir (FR-010 do Épico 0)
- [ ] T013 Criar o schema `staging` e as 25 tabelas espelho, **tudo `text`**, em `supabase/migrations/<ts>_staging_etl.sql` (data-model §2)
- [ ] T014 [P] Criar em `staging` as três tabelas do cruzamento: `ue_v1_lancamentos`, `ue_v1_disciplinas` e `ue_cruzamento`, com as colunas de proveniência `arquivo · aba · linha` (data-model §2)

---

## Phase 3: US1 — A carga roda por um comando e diz se pode confiar nela (P1)

**Goal**: um comando, uma transação, um veredito. Nunca "carregou 18 de 25".

**Independent Test**: rodar contra base vazia e ler o relatório. Entrega valor sozinho, mesmo sem corte.

### Extração (etapas 1 e 1-B)

- [ ] T015 [US1] Escrever `scripts/etl/extrair_sheets.py` — etapa 1: as 23 abas da v2.0 pela API, para `dados/bruto/<aba>.csv`, **tudo texto**, sem conversão
- [ ] T016 [US1] Fazer a extração produzir **cópia datada e imutável** da origem, para que a carga seja reproduzível sem a planilha ao vivo (FR-008)
- [ ] T017 [P] [US1] Escrever `scripts/etl/extrair_ue_v1.py` — etapa 1-B: lê `PREENCHIMENTO` (cabeçalho na linha 3, dado da 4) e `BD DISCIPLINAS` (cabeçalho na 2, dado da 3) dos **7 arquivos autorizados**, para `dados/bruto/ue_v1/<curso>.csv` (research R-5)
- [ ] T018 [US1] Codificar em `extrair_ue_v1.py` a lista **fechada** de fontes do contrato `cruzamento-ue.md`: os 7 arquivos, **sem** o `C-AP-HN 2026.xlsx` (vale a `Cópia … Sabado`) e **com** a `CAHO_2026.xlsx`. Arquivo fora da lista **não é lido** — nem se aparecer no diretório
- [ ] T018.1 [US1] Descartar em `extrair_ue_v1.py` as **linhas de cabeçalho repetidas** dentro da faixa de dados — `COD` aparece como valor 36 vezes só no `C-AP-FR` — e **contar** os descartes no relatório (FR-025.11)
- [ ] T018.2 [US1] Normalizar o número de UE com sufixo alfabético em `extrair_ue_v1.py`: `1P` → `1`, com o sufixo preservado como proveniência. `numero_ue` é `smallint`; `1P` é o **2º valor mais comum** da coluna (FR-025.9)
- [ ] T019 [US1] Gravar `arquivo`, `aba` e `linha` em toda linha extraída da v1.0 — é o que cumpre o FR-025.6 e o invariante X-2. **UE sem proveniência é UE inventada**

### Normalização e cruzamento (etapas 2 e 2-B)

- [ ] T020 [US1] Escrever a normalização (etapa 2): `bruto/*.csv` → `normalizado/<tabela>.csv`, com as colunas do destino e sufixo `_codigo` onde guarda um `ID_*` a resolver
- [ ] T021 [US1] Implementar a conversão de data com **fuso explícito** e cobrir **datas de fronteira** com teste — é o defeito clássico, invisível na contagem (FR-019)
- [ ] T021.1 [US1] Implementar a falha nomeada para **coluna obrigatória sem valor na origem** (os cinco `NOT NULL` de `instrutores`, D-08): aborta dizendo qual instrutor e qual coluna. **Valor nunca é fabricado** (FR-018.1)
- [ ] T022 [US1] Implementar a rejeição de **valor fora de domínio fechado**: interrompe nomeando tabela, coluna e valor. **Nunca** vira padrão silencioso (FR-017)
- [ ] T023 [US1] Escrever `scripts/etl/cruzar_ue.py` — etapa 2-B, passo 1: `curso_sigla` da planilha → curso da v2.0
- [ ] T024 [US1] Implementar o **passo 2** do cruzamento em `cruzar_ue.py`: `curso + data` → **turma**, pela janela de datas da turma. Data que cai na janela de **duas** turmas do mesmo curso → veredito `ambiguo`, **não casa** (contrato cruzamento-ue §A chave)
- [ ] T025 [US1] Implementar o **passo 3**: `turma + data + disciplina` → registro de aula na staging, resolvendo o código da disciplina entre os dois espaços de nomes (data-model §3.1)
- [ ] T026 [US1] Implementar o desempate de muitos-para-um: UEs concordantes → `casado`; **UEs diferentes → `ambiguo`, UE nula, reportado**. Proibido usar frequência, proximidade ou "a primeira" (contrato X-1)
- [ ] T026.1 [US1] Implementar o veredito **`nao_aplicavel`** para os seis códigos que não são disciplina — `AD`·`FE`·`PL`·`TR`·`TE`·`LP`, **270 linhas só no `C-AP-FR`** —, mantendo-os **fora** do cruzamento e **distintos de `sem_fonte`** no relatório (FR-025.10)
- [ ] T027 [US1] Marcar os registros dos **17 cursos sem planilha** como `fora_de_cobertura`, com UE nula — **esperado, não é divergência** (contrato X-4)
- [ ] T028 [US1] Escrever `tests/etl/test_cruzamento.py` com casos sintéticos para os quatro vereditos, incluindo **o caso de duas turmas na mesma data** — é o que a autorização original não previa

### Carga e promoção (etapas 3 e 4)

- [ ] T029 [US1] Implementar a etapa 3: `truncate` + `COPY` de `normalizado/*.csv` para `staging.*`, **tudo `text`**, sem conversão (contrato pipeline P-2)
- [ ] T030 [US1] Implementar a etapa 4 em `executar.py`: promoção na ordem de `ordem.py`, **numa transação única** — ou as 25 tabelas entram, ou nenhuma (FR-005)
- [ ] T031 [US1] Garantir que `config_listas` é a **tabela nº 1**: quatro gatilhos validam contra ela, e carregá-la depois faz os 1.566 registros de aula falharem com "valor fora do domínio", sem a mensagem dizer que o problema é a ordem (contrato pipeline P-5)
- [ ] T032 [US1] Tratar a **armadilha A** do documento 30 §3.1: `app.set_auditoria()` descarta os carimbos em silêncio quando não há sessão autenticada
- [ ] T033 [US1] Tratar a **armadilha B** do documento 30 §3.2: o gatilho anti-escalonamento bloqueia a própria carga de `usuarios`
- [ ] T034 [P] [US1] Escrever os módulos de tabela 1 a 8 em `scripts/etl/tabelas/`: `config_listas`, `config_parametros`, `perfil_permissao`, `cursos`, `configuracoes_horario`, `horarios_tempos_aula`, `curso_regime_historico`, `turmas`
- [ ] T035 [P] [US1] Escrever os módulos 9 a 12: `instrutores` (⚠️ os cinco `NOT NULL` da pendência D-08 podem falhar — §6.4), `disciplinas`, `turma_disciplina` (**210 linhas**), `instrutor_disciplina`
- [ ] T036 [P] [US1] Escrever os módulos 13 a 16: `usuarios` (⚠️ `USR-04` é linha-fantasma), `usuario_curso`, `responsaveis_curso`, `avaliacoes_planejadas`
- [ ] T037 [US1] Escrever o módulo de `registros_aula` (**1.566 linhas**) — consome `staging.ue_cruzamento` para preencher `unidade_ensino_id`, e deixa nulo onde o veredito não for `casado`
- [ ] T038 [P] [US1] Escrever os módulos 18 a 24: `avaliacoes`, `arquivo_avaliacoes_v1`, `atividades_nao_letivas` (**664**), `feriados`, `janelas_curso`, `reservas_proens`, `planejamento_anual` (nasce **vazia**)
- [ ] T039 [US1] Tratar a regra de não sobreposição de vigência em `curso_regime_historico`, que **pode recusar dado legítimo** vindo da planilha (documento 30 §6.5)
- [ ] T040 [US1] Escrever `scripts/etl/executar.py` como **ponto de entrada único**, com `--ambiente`, `--primeira-carga` e `--somente-reconciliar`. Não existe rodar uma tabela isolada (contrato pipeline P-7)
- [ ] T041 [US1] Provar a atomicidade: injetar defeito numa tabela do meio da ordem e confirmar **zero linha gravada** em qualquer tabela, com mensagem nomeando tabela e linha (quickstart V-2)
- [ ] T042 [US1] Provar a idempotência: duas execuções do zero produzem contagens e checksums idênticos **nas tabelas de negócio**, com o checksum **excluindo `id` e o quarteto de auditoria** e com `migracao_log` **fora da comparação** — os cinco variam por construção (FR-006, FR-006.1, quickstart V-5)

---

## Phase 4: US2 — A reconciliação pega o erro que a contagem não pega (P1)

**Goal**: detectar linha que trocou de dono, não só linha que sumiu.

**Independent Test**: mover uma FK de propósito e confirmar que a reconciliação acusa com a contagem total intacta.

- [ ] T043 [US2] Implementar **R-01** em `scripts/etl/reconciliar.py`: contagem por tabela contra o documento 05 §10. **Uma linha de diferença bloqueia** (FR-009)
- [ ] T044 [US2] Implementar **R-02**, o somatório de **TA por turma**, origem × destino, incluindo aula, aplicação de avaliação, vista de prova e atividade não letiva. Aceite: **0 nas 29 turmas, sem tolerância** (FR-010)
- [ ] T045 [P] [US2] Implementar **R-03**: zero FK órfã em toda a base (FR-011)
- [ ] T046 [P] [US2] Implementar **R-04** como **relação estrutural**, não como literal: as três identidades fecham sobre a linha de base vigente. Os números de 02/08 são a foto inicial (FR-012, redação corrigida)
- [ ] T047 [P] [US2] Implementar **R-05**: `codigo` não nulo e único, procedência preenchida, em 100% das linhas (FR-002)
- [ ] T048 [P] [US2] Implementar **R-07**: `turma_disciplina` com **89** períodos herdados e **121** em branco, exatamente como na origem (FR-013)
- [ ] T049 [US2] Implementar o relatório em `dados/relatorio_divergencia.md` com **veredito explícito** e **cada divergência nomeada** — "2 divergências" não serve; serve "tabela X, linha Y, esperado Z, obtido W" (FR-014, contrato C-2)
- [ ] T050 [US2] Separar no relatório o que **bloqueia** (R-01 a R-08) do que **informa** (U-01, U-02) e do que é **esperado** (U-03, os 17 cursos sem fonte de UE) — contrato reconciliacao C-5
- [ ] T051 [US2] Escrever as invariantes em `supabase/tests/090_reconciliacao_etl.sql` (pgTAP), uma asserção **nomeada** por verificação bloqueante
- [ ] T052 [US2] **Provar que a R-02 prova algo**: mover um registro de aula de turma à mão e confirmar que a reconciliação **acusa**, com a contagem total inalterada. Se passar, a verificação não vale nada (quickstart V-3, SC-008)

---

## Phase 5: US3 — O histórico chega intacto e rastreável (P1)

**Goal**: uma linha qualquer pode ser rastreada até a origem usando só o que está no banco.

**Independent Test**: escolher uma linha ao acaso e reconstruir sua procedência sem abrir a planilha.

- [ ] T053 [US3] Preencher `codigo` com o `ID_*` da v2.0 **verbatim** e `origem_migracao_v1` em toda linha migrada (FR-002)
- [ ] T054 [US3] Transportar `migracao_log` **íntegro** — as 717+ linhas históricas sem nenhuma reescrita — e **continuar** a numeração, nunca reiniciar (FR-004)
- [ ] T055 [US3] Gravar `migracao_log` **em bloco, no fim** da transação: escrever durante a carga faz um `ROLLBACK` levar o log junto (contrato pipeline P-6)
- [ ] T056 [US3] Registrar em `migracao_log` a **família 2**: por UE recuperada, de qual arquivo, aba e linha da v1.0 ela veio (FR-025.6)
- [ ] T057 [US3] Registrar a **família 3**: por registro **não** casado, com o veredito. **A ausência é o que alguém vai querer explicar depois** (contrato X-3)
- [ ] T058 [US3] Provar que `migracao_log` recusa `UPDATE` e `DELETE` **de todo perfil, inclusive o administrativo** — o gatilho já existe desde o Épico 1; aqui se prova que a carga não o contorna (SC-006, quickstart V-6)
- [ ] T059 [US3] Provar o rastro de ponta a ponta: escolher uma linha ao acaso e reconstruir sua origem **usando apenas o banco** (SC-005)

---

## Phase 6: US4 — Ensaiar o corte sem arriscar a base viva (P2)

**Goal**: ensaiar com dado real, saber quanto demora, sem tocar a planilha em produção.

**Independent Test**: rodar o ensaio completo e medir o tempo, sem nenhuma escrita na origem.

- [ ] T060 [US4] Garantir que **nenhuma etapa escreve na origem** — leitura apenas, em todo o pipeline (FR-021)
- [ ] T061 [US4] Implementar a **sondagem prévia** do documento 30 §7.6, executável contra a planilha real **antes** do corte, antecipando as divergências conhecidas (FR-020)
- [ ] T061.1 [US4] Fazer a sondagem **refazer a linha de base** da contagem contra a planilha ao vivo **e recalcular as três identidades** sobre ela, registrar o **delta contra o documento 05 §10** e submetê-lo a aprovação **antes** de virar critério. Sem isso o FR-009 reprova por construção (FR-009.1, FR-012)
- [ ] T062 [US4] Reconferir o inventário na sondagem: o de 02/08/2026 **já não corresponde** à planilha ao vivo — ela ganhou `Turma_Disciplina` em 20/08 e o log passou de `LOG-001060` (pendência **P-8**)
- [ ] T063 [US4] Instrumentar `executar.py` para registrar o **tempo de cada etapa**, e rodar o ensaio completo medindo o total (FR-021, quickstart V-7)
- [ ] T064 [US4] Executar `quickstart.md` V-4 e conferir a distribuição dos quatro vereditos do cruzamento, com os `ambiguo` e `sem_fonte` **nomeados** no relatório

---

## Phase 7: US5 — Caminho de volta escrito antes de precisar dele (P2)

**Goal**: saber, antes do corte, até quando dá para voltar e o que acontece com o que foi escrito.

**Independent Test**: executar a reversão num ambiente de ensaio e confirmar que a planilha volta a ser a fonte de verdade sem perda.

- [ ] T065 [US5] Escrever o procedimento de reversão em `docs/fase-3/`, com **prazo-limite declarado** e destino explícito para o que foi escrito no sistema novo depois do corte (FR-022, documento 30 §9)
- [ ] T066 [US5] **Ensaiar** a reversão: rollback que ninguém executou é rollback que não existe
- [ ] T067 [US5] Registrar **quem opera o corte** e quem detém a chave administrativa do destino (FR-023, pendência **P-10**)

---

## Phase 8: Polish & Cross-Cutting

- [ ] T068 Executar `quickstart.md` V-8 e provar a contenção: zero tela nova, zero regra de negócio nova, **nenhuma planilha da v1.0 versionada** (FR-024, SC-009)
- [ ] T069 [P] Corrigir a pendência **P-7** no `docs/fase-3/30-Plano-de-Migracao-ETL.md` §13: ela consta como bloqueante e **já está resolvida** desde o Épico 1 (research R-3)
- [ ] T070 [P] Corrigir o **V-9** do `specs/001-fundacao-repositorio-ci/quickstart.md`, que reprova por construção desde 07/09 — confere `vercel env ls production` esperando vazio, e a `service_role` está lá por decisão
- [ ] T071 [P] Reescrever `specs/001-fundacao-repositorio-ci/contracts/variaveis-ambiente.md`, que contradiz o documento 10 sobre os escopos da `service_role` — o documento 10 prevalece, por decisão de 07/09
- [ ] T072 [P] Acrescentar ao `docs/fase-3/31-Mapa-De-Para-Sheets-PostgreSQL.md` a segunda fonte: o de-para das abas `PREENCHIMENTO` e `BD DISCIPLINAS`, que hoje o documento não conhece
- [ ] T073 Atualizar o *Estado atual* do `CLAUDE.md`: Épico 2 e o que o Épico 3 herda — inclusive `NEXT_PUBLIC_URL_APLICACAO`, deixada fora do Épico 0, e a Server Action de convite, primeiro consumidor real de `lib/supabase/admin.ts`
- [ ] T074 Rodar `pnpm verificar:tudo` e abrir o PR com o template inteiro preenchido, incluindo o plano de reversão das migrations

---

## Dependencies

```
Fase 1 (T001-T006)
   ↓
Fase 2 (T007-T014)  ← BLOQUEIA TUDO. Sem as migrations, a carga falha por NOT NULL
   ↓
Fase 3 · US1 (T015-T042)  ← a carga. É o MVP
   ↓
Fase 4 · US2 (T043-T052)  ← reconciliação: precisa de dado carregado
   ↓
Fase 5 · US3 (T053-T059)  ← rastro: pode andar em paralelo com a US2
   ↓
Fase 6 · US4 (T060-T064) e Fase 7 · US5 (T065-T067)  ← independentes entre si
   ↓
Fase 8 (T068-T074)
```

**Dentro da fase 3**, a cadeia obrigatória é: extração (T015-T019) → normalização (T020-T022) →
**cruzamento (T023-T028)** → staging (T029) → promoção (T030-T039). O cruzamento **não pode** vir
depois da promoção: `registros_aula` não tem `disciplina_id` e a UE precisa estar resolvida antes do
`INSERT` (research R-2, R-7).

## Parallel Execution Examples

**Fase 2** — T014 roda junto de T007/T008 (arquivos diferentes).

**Fase 3** — os módulos de tabela T034, T035, T036 e T038 são paralelos entre si: arquivo por tabela,
sem dependência de código. **T037 não é paralelo**: consome o resultado do cruzamento.

**Fase 4** — T045, T046, T047 e T048 são consultas independentes.

**Fase 8** — T069 a T072 são quatro documentos diferentes.

## Implementation Strategy

### MVP — a menor coisa que entrega valor sozinha

**Fases 1, 2 e 3.** Ao fim delas existe uma carga completa, atômica e idempotente, com a UE recuperada
onde há fonte. Ainda **não** existe a prova de que ela está certa — essa é a US2 — mas o transporte
está de pé e é reexecutável.

### Entrega incremental

1. **Fases 1-2** — schema destravado, invariantes do Épico 1 ainda verdes. Commit próprio.
2. **Fase 3** — a carga. Commit próprio, com o relatório de uma execução real anexado ao PR.
3. **Fase 4** — a reconciliação. **É aqui que o épico passa a valer**: antes dela, há dado; depois, há
   dado em que se pode confiar.
4. **Fases 5-7** — rastro, ensaio e reversão. Preparam o corte, que **não acontece nesta fatia**.
5. **Fase 8** — a dívida documental que este épico encontrou pelo caminho.

### O que esta fatia NÃO faz

**Não corta.** O corte depende de P-9 (data e janela), de P-10 (quem opera) e da decisão da
CIAARA-14.2 sobre hospedagem. Esta fatia entrega o ETL **provado contra o banco local**, que é o mesmo
ETL que rodará no corte.
