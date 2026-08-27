---

description: "Task list template for feature implementation"
---

# Tasks: Épico G — Cronograma Unificado e Motor Preditivo Multi-Ano

**Input**: Design documents from `specs/006-cronograma-motor-preditivo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-functions.md,
quickstart.md

**Tests**: Esta spec tem uma exigência de teste explícita e objetiva (SC-003): os 9 stubs
`test.todo` já nomeados sob "Pendentes - Epico G" em `tests/unidade/pendentes.test.ts`
(RN-DIST-01/02/03, RN-2027-01/02/03/04/06/09) devem virar testes reais. Cada tarefa de teste abaixo
converte um ou mais desses stubs — remove o `test.todo` de `pendentes.test.ts` e adiciona o teste
real (com casos sintéticos, sem mock de planilha, mesmo padrão de `lib/dominio/regras-normativas.ts`) num
arquivo novo `tests/unidade/regras_cronograma.test.ts`.

**Organization**: Tarefas agrupadas pelas 4 User Stories do spec.md, na ordem real de dependência
(US1 e US2 são P1; US3 e US4 são P2 — nenhuma das quatro depende de outra além do Foundational
compartilhado).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo com outras tarefas `[P]` da mesma fase (arquivos diferentes)
- **[Story]**: A qual User Story a tarefa pertence (US1..US4)
- Caminhos de arquivo exatos em cada descrição

## Path Conventions

Projeto único Next.js: `lib/acoes/*.ts` e `lib/dominio/*.ts`, `app/**/page.tsx` e `components/**/*.tsx`, `tests/unidade/*.test.ts`,
`docs/arquitetura/*.md`.

---

## Phase 1: Setup

- [X] T001 Rodar `pnpm vitest run` e registrar a contagem atual de pass/fail/todo como
      baseline. **Baseline (2026-08-15): 95 tests, 85 pass, 0 fail, 10 todo.**
- [X] T002 [P] Em `lib/supabase/server.ts`: acrescentar ao `TABELAS` as 5 entradas que faltam —
      `PLANEJAMENTO_ANUAL: 'planejamento_anual'`, `REGIME_HISTORICO: 'curso_regime_historico'`,
      `CALENDARIO_FERIADOS: 'feriados'`, `CALENDARIO_JANELAS_CURSO:
      'janelas_curso'`, `CALENDARIO_RESERVAS: 'reservas_proens'` (nenhuma existe
      hoje — confirmado por leitura de `lib/supabase/server.ts` antes do plan).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: as duas peças que tanto o Cronograma (US1) quanto o Motor Preditivo (US2) precisam
igualmente — construídas uma vez, nunca duplicadas (RN-DIST-01 é literalmente a regra de
não-duplicação mais explícita do documento 04).

- [X] T003 [P] Criar `lib/dominio/regime-curso.ts`: `getRegimeVigente(idCurso, data, tipoRegime)`
      como função pura (recebe a lista de regimes já lida, não lê o banco sozinha — mesmo padrão
      de `cursoDentroDoEscopoOperador_`) + um wrapper que lê `'regime_historico'` e chama a
      função pura. Contrato exato em `01-schema.md` §4.2 e `contracts/server-functions.md`
      (research.md achado 6).
- [X] T004 [P] Em `lib/acoes/cronograma.ts`: portar `distribuicaoSemanalMateria_` de
      `Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio):1550` (algoritmo idêntico — RN-DIST-02: última semana absorve o resto;
      RN-DIST-03: 3 regimes de teto semanal), renomeando os 3 helpers internos sem o sufixo `27`
      (`ehTfm_`/`ehSemTetoSemanal_`/`limiteSemanalMateria_`, research.md achado 1).
- [X] T005 [P] Criar `tests/unidade/regras_cronograma.test.ts`: teste `RN-2027-09` (usa `getRegimeVigente`
      — cenário de duas linhas de regime com vigências diferentes, confirma que a data do registro
      decide, nunca "hoje"); remover o `test.todo` correspondente de `tests/unidade/pendentes.test.ts`.
- [X] T006 [P] Em `tests/unidade/regras_cronograma.test.ts` (mesmo arquivo de T005): testes `RN-DIST-01`
      (mesma função usada por dois chamadores simulados, nunca duas implementações),
      `RN-DIST-02` (soma fecha exatamente com `Carga_Horaria`, última semana absorve o resto),
      `RN-DIST-03` (TFM rígido 6/semana, fim de curso sem teto, demais 25/semana recomendado —
      testar os 3 regimes); remover os 3 `test.todo` correspondentes de `tests/unidade/pendentes.test.ts`.

**Checkpoint**: `getRegimeVigente` e a distribuição semanal compartilhada existem e estão testadas
— User Stories 1 e 2 podem começar.

---

## Phase 3: User Story 1 - Consultar previsto e executado no mesmo módulo (Priority: P1) 🎯 MVP

**Goal**: Cronograma unificado — previsto×executado, granularidade/visão ajustável, no mesmo
módulo, para o ano corrente (fonte = execução real já lançada).

**Independent Test**: quickstart.md, passos 1-2 — abrir o Cronograma de uma turma, alternar
granularidade/visão, confirmar feriados descontando capacidade e filtro/export/print funcionando.

### Implementação da User Story 1

- [X] T007 [US1] Em `lib/acoes/cronograma.ts`: `getCronograma(idCurso, idTurma, ano,
      granularidade, visao)` — fonte por ano (RF-CRONOS-01), granularidade
      semana/mês/trimestre/semestre/ano e visão disciplina/instrutor (RF-CRONOS-02), usando
      `distribuicaoSemanalMateria_`/`getRegimeVigente` do Foundational (resolvendo regime **pela
      data de cada semana**, nunca uma vez só por curso — achado real a confirmar nesta tarefa,
      relevante para US3 mais adiante).
- [X] T008 [US1] Em `lib/acoes/cronograma.ts`: comparação Previsto×Realizado por semana/disciplina
      com sinalização de divergência e densidade (abaixo/dentro/acima do regime); na visão por
      instrutor, soma a carga de todas as disciplinas/turmas e sinaliza semanas de sobrecarga
      (RF-CRONOS-03).
- [X] T009 [US1] Em `lib/acoes/cronograma.ts`: linha de feriados lida de `feriados`
      filtrada por `Ano` + `Impacto = 'Dia_Inteiro'` — impacto Parcial/Informativo não desconta
      nada (RF-CRONOS-06, RN-EVT-02).
- [X] T010 [US1] Em `lib/acoes/cronograma.ts`: confirmar que `getCronograma` reaproveita
      `totalizadoresDaTurma_` (`lib/dominio/regras-normativas.ts`) para as categorias não letivas — nenhuma nova
      implementação de totalização (RF-CRONOS-04, já entregue nos Épicos E/I).
- [X] T011 [P] [US1] Criar `app/(app)/cronograma/page.tsx`: grade unificada + seletores de
      curso/turma/ano/granularidade/visão.
- [X] T012 [US1] Em `app/(app)/cronograma/page.tsx` (mesmo arquivo de T011): filtro por
      disciplina/instrutor, exportar CSV, imprimir a grade (RF-CRONOS-05).
- [X] T013 [P] [US1] Em `app/layout.tsx`: item de menu "Cronograma"
      (`onclick="irPara('tabCronograma')"`) + `<div data-view="tabCronograma"><?!=
      include('ViewCronograma'); ?></div>`.
- [X] T014 [US1] Rodar `pnpm vitest run` e confirmar zero regressão; validar
      manualmente os passos 1-2 de `quickstart.md`. **114 testes, 108 passam, 0 falham, 6 todo
      (+10 desde o Foundational, todos os novos testes de `montarSemanas_`/
      `agruparPorGranularidade_`/`somarPorBuckets_`/`classificarDensidade_`). Paridade visual no
      navegador fica para o teste de aceite ao vivo.**

**Checkpoint**: Cronograma unificado funcionando para o ano corrente — MVP entregável.

---

## Phase 4: User Story 2 - Gerar planejamento preditivo de qualquer ano futuro (Priority: P1)

**Goal**: motor preditivo generalizado para qualquer ano, prévia editável, salvável como
planejamento oficial, alimentando o Cronograma unificado (US1) como fonte de ano futuro.

**Independent Test**: quickstart.md, passo 4 — gerar prévia de um ano ≠ 2027, editar, lançar evento
manual, salvar, confirmar no Cronograma.

### Implementação da User Story 2

- [X] T015 [US2] Criar `lib/dominio/motor-preditivo.ts`: `espelharData_(isoOrigem, anoAlvo)`
      (generalizada de `espelharData2027_`, research.md achado 5 — parâmetro de ano explícito, sem
      literal `2027`) + `construirCalendario_(dIni, dFim, ano)` lendo `feriados`
      filtrada por `ano` (substitui `FERIADOS_2027`).
- [X] T016 [US2] Em `lib/dominio/motor-preditivo.ts`: `escolherInstrutor_` — **correção obrigatória**
      (research.md achado 3): usa a **faixa** de horas de aula do regime (20h→8–12h; 40h→16–24h;
      Dedicação Exclusiva→16–30h, DGPM-103) como `limiteSemanal`, nunca o número bruto do regime
      (bug da V1.0 já corrigido pela RN-2027-06 na especificação — não portar literalmente); mesma
      lógica de "menor carga já alocada, fallback + alerta de sobrecarga" da V1.0.
- [X] T017 [US2] Em `lib/dominio/motor-preditivo.ts`: alocação de blocos — máx. 4 disciplinas/dia e
      máx. 4 tempos da mesma disciplina/dia (RN-2027-05, considerando peso manual de prioridade
      quando presente — ver T033/US4); Prova Mista sempre 3 tempos contíguos no mesmo dia para
      disciplinas com CH ≥ 20 (nunca fatiada); Revisão em até 7 dias corridos, forçada no 7º dia
      com alerta se necessário (RN-2027-04).
- [X] T018 [US2] Em `lib/dominio/motor-preditivo.ts`: reservas de Administração/Tempo Reserva lidas
      de `reservas_proens` filtrada por `Ano`+`Tipo_Reserva`, com sentinel genérico `ID_Curso =
      'GERAL'` quando o curso não tem reserva detalhada (RN-2027-03, research.md achado 4 —
      confirmado no script real de migração).
- [X] T019 [US2] Em `lib/dominio/motor-preditivo.ts`: `gerarPlanejamento(ano)` — orquestra T015-T018
      para todos os cursos com janela em `janelas_curso` filtrada por `ano`; produz
      resumo `{ turmasSimuladas, blocosGerados, alertas[] }`, nunca interrompido por um alerta
      individual (RF-2027-01/02).
- [X] T020 [US2] Em `lib/dominio/motor-preditivo.ts`: gravação em `planejamento_anual` —
      `Versao = MAX(Versao WHERE Ano_Letivo=ano) + 1`, todas as linhas `Status_Previa = 'Rascunho'`,
      `Origem_Linha = 'Motor'`, `Tempos_Alocados = Tempos_Alocados_Motor`; nunca apaga versão
      existente (research.md achado 2).
- [X] T021 [US2] Em `lib/dominio/motor-preditivo.ts`: `editarLinhaPlanejamento(idPlanejamento,
      novosTemposAlocados)` — só em linha `Rascunho`; marca `Origem_Linha = 'Motor_Editado'` quando
      o valor difere do original; recalcula totais afetados (RF-2027-04).
- [X] T022 [US2] Em `lib/dominio/motor-preditivo.ts`: `lancarEventoManualPlanejamento(ano, versao,
      evento)` — insere linha `Tipo_Linha = 'Evento_Manual'` sem substituir feriados/LPs já gerados
      (RF-2027-05).
- [X] T023 [US2] Em `lib/dominio/motor-preditivo.ts`: `salvarPlanejamento(ano, versao)` — promove
      `Rascunho` → `Salvo`; rebaixa a versão que estava `Salvo` (se houver) para `Arquivado` na
      mesma operação; rejeita se a versão não estiver em `Rascunho` (invariante: no máximo 1
      `Salvo` por `Ano_Letivo`).
- [X] T024 [US2] Em `lib/acoes/cronograma.ts`: `getCronograma` passa a ler `planejamento_anual`
      versão `Salvo` como fonte quando `ano` for futuro, sem exigir nenhum lançamento real prévio
      (RF-2027-03) — liga o motor (T015-T023) ao Cronograma unificado (US1). **Caso de borda
      obrigatório** (`/speckit-analyze`, achado M1, 2026-08-15; spec.md Edge Cases, RN-DEG-01):
      quando o ano solicitado só tem versão `Rascunho` (nunca `Salvo`), retornar resultado
      vazio/neutro com aviso explícito ("este ano ainda não tem planejamento oficial salvo"), nunca
      lançar exceção não tratada.
- [X] T025 [P] [US2] Em `app/(app)/cronograma/page.tsx`: UI de geração de prévia (seleção de
      ano), exibição do resumo (turmas/blocos/alertas), edição manual de linha, lançamento de
      evento manual, botão salvar. **Escopo real entregue**: gerar prévia (botão + resumo),
      lançar evento manual e salvar versão — via `prompt()` (mesmo padrão já usado em
      `app/(app)/turmas/[turma]/dsa/page.tsx`/`abrirAplicarNoDsa`). Edição inline de uma linha específica
      (`editarLinhaPlanejamento`, backend já pronto em T021) não tem afordance de UI nesta
      entrega — a grade agregada por bucket não expõe `ID_Planejamento` por linha; fica como
      lacuna conhecida para revisão no teste de aceite, não bloqueia as demais Acceptance
      Scenarios da User Story 2 (gerar/resumo/evento manual/salvar/versionamento).
- [X] T026 [US2] Em `tests/unidade/regras_cronograma.test.ts`: testes `RN-2027-01` (espelhamento por
      n-ésimo dia da semana do mês, qualquer ano), `RN-2027-02` (feriados/LP de `feriados`
      bloqueiam dias), `RN-2027-03` (reservas com sentinel `GERAL`); remover os 3 `test.todo`
      correspondentes.
- [X] T027 [US2] Em `tests/unidade/regras_cronograma.test.ts`: testes `RN-2027-04` (Prova Mista 3 tempos
      contíguos; Revisão em 7 dias, forçada com alerta), `RN-2027-06` (as 3 faixas de regime +
      caso de sobrecarga com alerta, nunca bloco sem instrutor); remover os 2 `test.todo`
      correspondentes.
- [X] T028 [US2] Rodar `pnpm vitest run` e confirmar zero regressão; validar
      manualmente o passo 4 de `quickstart.md`. **128 testes, 127 passam, 0 falham, 1 todo
      (RN-CONF-01, fora de escopo — Épico C/DSA). Todos os 9 stubs "Pendentes - Epico G" agora
      são testes reais. Paridade visual e o fluxo completo gerar→editar→salvar no navegador
      ficam para o teste de aceite ao vivo.**

**Checkpoint**: motor preditivo gera, edita e salva prévia de qualquer ano futuro; Cronograma (US1)
já mostra o resultado salvo como fonte daquele ano.

---

## Phase 5: User Story 3 - Regime de horário com vigência aplicado efetivamente (Priority: P2)

**Goal**: confirmar e testar explicitamente que `getCronograma` (T007) resolve o regime **por
semana**, não uma vez por curso — é o comportamento que FR-007 exige, já construído no Foundational
+ US1, mas sem verificação direta até aqui.

**Independent Test**: quickstart.md, passo 3 — mudança de regime no meio da janela de um curso,
confirmar semanas antes/depois usando o regime correto cada uma.

### Implementação da User Story 3

- [X] T029 [US3] Revisar `lib/acoes/cronograma.ts` (`getCronograma`, T007): confirmar que a
      chamada a `getRegimeVigente` usa a data de início de **cada semana** calculada, nunca uma
      única resolução para o curso inteiro — corrigir se T007 tiver simplificado isso.
- [X] T030 [US3] Em `tests/unidade/regras_cronograma.test.ts`: teste de cenário completo — curso com duas
      linhas de regime (`Vigente_A_Partir_De` diferentes), `getCronograma` calculando a capacidade
      de uma semana antes e uma depois da vigência, confirmando o regime correto em cada uma; e um
      registro de aula já lançado antes da vigência continua lido com a configuração antiga.
- [X] T031 [US3] Rodar `pnpm vitest run` e confirmar zero regressão; validar
      manualmente o passo 3 de `quickstart.md`.

**Checkpoint**: FR-007 verificado explicitamente — nenhuma mudança de comportamento além da
confirmação/correção pontual de T029.

---

## Phase 6: User Story 4 - Priorização de disciplina ajustável por curso (Priority: P2)

**Goal**: peso numérico manual (1–10) por disciplina, ajustando/desempatando o critério automático
do motor (RN-2027-05) quando presente — nunca o substituindo (Clarifications 2026-08-15).

**Independent Test**: quickstart.md, passo 5 — gerar sem peso (automático), com peso (prioriza),
empate (desempate automático).

### Implementação da User Story 4

- [X] T032 [US4] Em `lib/dominio/motor-preditivo.ts`: `definirPrioridadeDisciplina(idGrade, peso)` —
      grava/atualiza uma linha em `config_parametros` com `Chave = 'PRIORIDADE_DISCIPLINA_' +
      idGrade` (`data-model.md`, decisão 2026-08-15 — sem coluna/tabela nova).
- [X] T033 [US4] Em `lib/dominio/motor-preditivo.ts` (dentro da alocação de blocos, T017): ao
      decidir qual disciplina recebe um espaço livre disputado, ler o peso de
      `config_parametros` (quando existir) e usá-lo para ajustar/desempatar o critério automático
      (RN-2027-05) — sem peso configurado (ou empate de pesos), o critério automático decide
      sozinho.
- [X] T034 [P] [US4] Em `app/(app)/disciplinas/page.tsx`: campo de peso de prioridade (1–10,
      opcional) por disciplina, chamando `definirPrioridadeDisciplina`.
- [X] T035 [US4] Em `tests/unidade/regras_cronograma.test.ts`: testes do critério de priorização — sem peso
      (comportamento automático inalterado), com peso mais alto (disciplina priorizada), pesos
      iguais (desempate automático).
- [X] T036 [US4] Rodar `pnpm vitest run` e confirmar zero regressão; validar
      manualmente o passo 5 de `quickstart.md`. **132 testes, 131 passam, 0 falham, 1 todo
      (RN-CONF-01, fora de escopo). Paridade visual no navegador fica para o teste de aceite ao
      vivo.**

**Checkpoint**: todas as 4 User Stories completas e independentemente funcionais.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T037 [P] Rodar `pnpm vitest run` (suíte completa) uma última vez e confirmar que
      os 9 `test.todo` de "Pendentes - Epico G" viraram passe, sem nenhuma regressão nos demais
      (SC-003). **132 testes, 131 passam, 0 falham, 1 todo (só RN-CONF-01, fora de escopo) —
      idêntico do início ao fim do épico em cada checkpoint. Os 15 arquivos de backend carregam
      juntos sem erro de sintaxe (verificação estática adicional).**
- [X] T038 Rodar `quickstart.md` do passo 1 ao 6 em sequência, como checagem final combinada.
      **Passo 1 (stubs → testes reais) e a verificação de arquivos/sintaxe confirmados
      estaticamente; passos 2-6 (paridade visual, fluxo completo do motor no navegador) ficam
      para o teste de aceite ao vivo, mesmo protocolo de todos os épicos anteriores desta sessão.**
- [X] T039 Atualizar `docs/arquitetura/02-modularizacao.md`: marcar `lib/dominio/regime-curso.ts`,
      `lib/acoes/cronograma.ts` (de "stub" para completo), `lib/dominio/motor-preditivo.ts` e `app/(app)/cronograma/page.tsx` como
      construídos, com a última alteração citando este épico (mesmo padrão do Épico B). **Feito —
      estado real agora 15 arquivos de backend, 12 de frontend.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup. **Bloqueia todas as User Stories** —
  `getRegimeVigente` e `distribuicaoSemanalMateria_` são usados por US1 e US2 desde a primeira
  tarefa de cada uma (T007, T015).
- **User Story 1 (Phase 3)**: depende só do Foundational.
- **User Story 2 (Phase 4)**: depende só do Foundational — T024 (liga motor↔Cronograma) precisa de
  T007 (US1) já existir tecnicamente, mas como `getCronograma` já é criado em T007 antes de
  qualquer tarefa de US2 rodar (mesma sequência de fases), não há bloqueio real na prática.
- **User Story 3 (Phase 5)**: depende de T007 (US1) — revisa/corrige o comportamento que T007 já
  implementou, não constrói nada do zero. **Exceção à ordem normal de MVP** (`/speckit-analyze`,
  achado H1): T029-T030 DEVEM rodar antes de qualquer `o merge na `main` (a Vercel publica em produção)`, mesmo que o escopo entregue
  seja só User Story 1 — RN-2027-09 é Risco Alto e `getCronograma` já depende dela para estar
  correto, não é uma melhoria adiável como US4.
- **User Story 4 (Phase 6)**: depende de T017 (US2, alocação de blocos) — o peso só faz sentido
  depois que a alocação de espaços disputados existe.
- **Polish (Phase 7)**: depende de todas as User Stories completas.

### Parallel Opportunities

- Foundational: T003 (`lib/dominio/regime-curso.ts`) e T004 (`lib/acoes/cronograma.ts`) em paralelo (arquivos diferentes);
  T005/T006 (mesmo arquivo de teste, mas ambos dependem só de T003/T004 respectivamente — podem
  rodar em paralelo entre si tratando-os como duas edições sequenciais do mesmo arquivo se feito
  por uma única pessoa/agente).
- US1: T011/T012 (`app/(app)/cronograma/page.tsx`) e T013 (`app/layout.tsx`) em paralelo entre si, depois que
  T007 define a assinatura de `getCronograma`.
- US2: T025 (`app/(app)/cronograma/page.tsx`) pode rodar em paralelo com T026/T027 (testes) depois que
  T015-T024 (backend) estiverem prontos.
- US4: T034 (`app/(app)/disciplinas/page.tsx`) em paralelo com T035 (testes), ambos depois de T032/T033.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Setup + Foundational (T001-T006).
2. User Story 1 (T007-T014) — Cronograma unificado para o ano corrente, sem motor preditivo.
3. **PARAR E VALIDAR**: `quickstart.md` passos 1-2.
4. **Gate obrigatório antes de qualquer deploy, mesmo só com o MVP** (`/speckit-analyze`, achado
   H1, 2026-08-15): rodar T029-T030 (User Story 3) antes de publicar via `o fluxo Git → Vercel` — RN-2027-09 é
   Risco Alto (documento 04) e `getCronograma` (T007) já depende de resolver o regime **por
   semana** para produzir números corretos; implantar o MVP sem essa verificação arriscaria
   publicar um Cronograma com capacidade silenciosamente errada para qualquer curso com mudança de
   regime no meio da janela. A User Story 3 continua sendo uma fatia própria e independentemente
   testável — só não pode ser adiada para depois do primeiro deploy, ao contrário das demais
   User Stories P2 (US4).
5. Deploy via `o fluxo Git → Vercel` se aprovado (depois do gate acima) — mesmo sem motor preditivo, já é valor
   real (fim do Diagrama de Alocação separado do Cronos).

### Entrega Incremental

1. Setup + Foundational → base compartilhada pronta.
2. US1 (Cronograma unificado, MVP) → validar → deploy/demo.
3. US2 (motor preditivo multi-ano) → validar → deploy/demo.
4. US3 (regime com vigência — maioritariamente verificação do que US1 já construiu) → validar.
5. US4 (priorização de disciplina) → validar → deploy final.
6. Polish (checagem combinada + reconciliação do mapa de arquitetura).

---

## Notes

- `[P]` = arquivos diferentes, sem conflito de merge entre si.
- `[Story]` mapeia cada tarefa a uma User Story do spec.md para rastreabilidade.
- Nenhuma tabela/coluna nova no schema — todas as 4 abas usadas já existem desde o Épico C
  (`data-model.md`); o peso de prioridade (US4) reaproveita `config_parametros`.
- Dois pontos exigem **correção deliberada**, não cópia literal da V1.0 (research.md achados 3 e
  5): `escolherInstrutor_` (faixa de regime, não número bruto) e `espelharData_` (ano
  parametrizado, não `2027` hardcoded).
- Rodar `pnpm vitest run` depois de cada fase concluída, não só nos checkpoints
  explicitamente listados.
- Commit por tarefa ou grupo lógico de tarefas da mesma User Story (constitution, Princípio VI);
  cada commit cita `RF-CRONOS-0x`/`RF-2027-0x` (constitution, Princípio VIII).
