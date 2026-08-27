---

description: "Task list template for feature implementation"
---

# Tasks: Épico H — Motor de Sugestão Automática do Detalhe Semanal de Aula

**Input**: Design documents from `specs/008-motor-sugestao-dsa/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/server-functions.md, quickstart.md

**Tests**: Esta spec tem uma exigência de teste explícita e objetiva (SC-002): o stub `test.todo` de
RN-CONF-01, já nomeado sob "Pendentes - Epico C/DSA" em `tests/unidade/pendentes.test.ts`, deve virar teste
real — cross-turma, mock do cliente Supabase (mesmo padrão de integração já usado no teste de
RN-2027-09 do Épico G). As demais funções puras novas (alocação da prévia, teto de TFM,
classificação da validação) ganham testes sintéticos, sem mock de planilha, mesmo padrão de
`lib/dominio/regras-normativas.ts`/`tests/unidade/regras_cronograma.test.ts`.

**Organization**: Tarefas agrupadas pelas 6 User Stories do spec.md, em ordem de prioridade (US1-US4
são P1; US5-US6 são P2). US1 é pré-requisito real de todas as demais (nenhuma delas existe sem a
grade); as demais são incrementos relativamente independentes entre si.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo com outras tarefas `[P]` da mesma fase (arquivos diferentes)
- **[Story]**: A qual User Story a tarefa pertence (US1..US6)
- Caminhos de arquivo exatos em cada descrição

## Path Conventions

Projeto único Next.js: `lib/acoes/*.ts` e `lib/dominio/*.ts`, `app/**/page.tsx` e `components/**/*.tsx`, `tests/unidade/*.test.ts`,
`docs/arquitetura/*.md`.

---

## Phase 1: Setup

- [X] T001 Rodar `pnpm vitest run` e registrar a contagem atual de pass/fail/todo como
      baseline (esperado: 139 tests, 138 pass, 0 fail, 1 todo — herdado do Épico A). **Confirmado:
      139 tests, 138 pass, 0 fail, 1 todo.**

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: as duas peças que várias User Stories precisam igualmente — construídas uma vez, nunca
duplicadas.

- [X] T002 [P] Em `lib/acoes/dsa.ts`: portar `lerCatalogoHorarios_`/`horarioDoBloco_` de
      `Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio):347/1245`, adaptando à leitura de `horarios_tempos_aula` **despivotada**
      via `lerAbaComoObjetos_` (não `getDataRange()`.select()`` manual) — agrupa por `ID_Config`,
      monta `{n, inicio, fim}` por `Tempo_Numero`. Resolve `ID_Config_Horario` do curso via
      `curso_regime_historico`/`getRegimeVigente` (Épico G), nunca lendo `cursos`
      diretamente (research.md achado 2). Curso sem `ID_Config_Horario` (EAD puro): retorna
      catálogo vazio, sem lançar exceção (RN-DEG-01).
- [X] T003 [P] Em `lib/acoes/dsa.ts`: `validarTetoSemanalTfm_(idGrade, data, tempos, exclude?)` —
      função pura que soma os tempos já lançados na semana de `data` para a disciplina (via
      `registros_aula`, `Categoria_Normativa='Aula'`), soma `tempos` do novo
      lançamento, e retorna `{ excede: boolean, totalComEste }` quando a disciplina é TFM (`ehTfm_`,
      já existe em `lib/acoes/cronograma.ts`) e o total ultrapassaria 6 — parâmetro `exclude` (ID_Registro)
      para revalidar uma movimentação (US6) sem contar o próprio registro sendo movido duas vezes
      (Clarifications 2026-08-15, RN-DIST-03).

**Checkpoint**: resolução de horário e validação de teto de TFM existem e estão isoladas — todas as
User Stories seguintes podem consumi-las sem duplicar nada.

---

## Phase 3: User Story 1 - Ver a semana inteira numa grade por Tempo de Aula (Priority: P1) 🎯 MVP

**Goal**: grade dia×TA completa de uma turma, com horário real, lançamento manual de Aula
funcionando, degradação seguras para EAD/histórico sem posição.

**Independent Test**: quickstart.md, passo 2 — abrir o DSA de uma turma com lançamentos reais,
confirmar posicionamento correto por TA/horário; testar curso EAD (degrada); lançar Aula manualmente
e ver aparecer na grade.

### Implementação da User Story 1

- [X] T004 [US1] Em `lib/acoes/dsa.ts`: expandir `getDsaSemanal(idTurma, semanaIso)` — portar o
      algoritmo de `getDsaSemanal` (V1.0, ``lib/` (monólito da v1.0, hoje dividido por domínio):1258`, research.md achado 1): monta `dias[]`
      (segunda a sexta) com `blocos[]` juntando `registros_aula` + `avaliacoes` +
      `atividades_nao_letivas` da turma, posicionados por `TA_Inicial`/horário (via T002).
      Lançamentos sem `TA_Inicial` vão para `semPosicao[]` do dia (RN-DEG-01), nunca quebram a
      grade. Preserva `totalizadores`/`avaliacoesAgendadasNaSemana` já existentes (Épicos E/I) —
      nenhum campo hoje consumido por `app/(app)/turmas/[turma]/dsa/page.tsx` é removido. **Não inclui ainda** a sinalização
      de conflito (`conflito`/`conflitoTipo` sempre `false`/`null` nesta tarefa — US2 adiciona essa
      camada por cima).
- [X] T005 [US1] Em `lib/acoes/dsa.ts`: `lancarAula(payload)` — portar `registrarAula` (V1.0,
      ``lib/` (monólito da v1.0, hoje dividido por domínio):828`, research.md achado 3): valida turma/matéria do curso, instrutor habilitado
      (`instrutorHabilitado_`, RN-INST-01), grava em `registros_aula` com
      `Categoria_Normativa='Aula'` via `crudCriar`. Antes de gravar, chama
      `validarTetoSemanalTfm_` (T003) — se `excede`, lança erro claro em vez de gravar (bloqueio
      rígido, Clarifications 2026-08-15); para as demais disciplinas, o total diário alto continua
      só aviso no retorno, nunca bloqueia (mesmo padrão soft da V1.0).
- [X] T006 [P] [US1] Em `app/(app)/turmas/[turma]/dsa/page.tsx`: renderizar a grade dia×TA (substitui/expande a
      view atual de só totalizadores) — tabela com `.grade-semanal` (componente do Épico A), coluna
      de horário real por TA, célula por bloco, faixa de rodapé para `semPosicao[]`. Modal/formulário
      de lançar Aula (disciplina, instrutor, TA inicial, tempos, metodologia, conteúdo) chamando
      `lancarAula`.
- [X] T007 [US1] Rodar `pnpm vitest run` e confirmar zero regressão; validar manualmente
      o passo 2 de `quickstart.md`.

**Checkpoint**: grade completa por TA funcionando, com lançamento manual de Aula — alicerce para
todas as demais User Stories.

---

## Phase 4: User Story 2 - Sinalizar conflito de instrutor/sala em qualquer turma do sistema (Priority: P1)

**Goal**: fechar RN-CONF-01 (Risco Alto) — conflito de instrutor cross-turma como alerta primário,
conflito de sala como alerta secundário.

**Independent Test**: quickstart.md, passo 3 — instrutor em TAs sobrepostos em duas turmas
diferentes, confirmar sinalização em ambas.

### Implementação da User Story 2

- [X] T008 [US2] Em `lib/acoes/dsa.ts`: `detectarConflitosDsa_(dataIso)` — portar `seOverlap_` +
      a lógica de comparação de `getDsaSemanal` (V1.0, ``lib/` (monólito da v1.0, hoje dividido por domínio):1339-1354`), **generalizando o
      escopo de "mesma turma" para "todas as turmas do sistema"** (correção obrigatória de
      RN-CONF-01, research.md achado 1): lê `registros_aula`+`avaliacoes`+
      `atividades_nao_letivas` de **todas** as turmas filtradas por `dataIso` — os três (não só
      os dois primeiros), porque T004 já junta as três fontes no mesmo `blocos[]` do dia, e o
      próprio `getDsaSemanal` da V1.0 (research.md achado 1) roda a comparação sobre **todos** os
      blocos do dia, extracurriculares incluídos (`/speckit-analyze` 2026-08-15, achado F1). Compara
      pares por sobreposição de TA e (mesmo instrutor OU mesma sala): para `registros_aula`
      usa `ID_Instrutor`; para `avaliacoes`, considera **tanto** `ID_Instrutor_Responsavel` quanto
      `ID_Fiscal` como pessoa ocupando o slot — um fiscal escalado em duas turmas no mesmo horário
      também é conflito de instrutor (`/speckit-analyze` 2026-08-15, achado F2); `atividades_nao_letivas`
      não tem campo de instrutor, então só entra na comparação de sala. Mesmo instrutor marca
      `conflito=true`/`conflitoTipo='Instrutor'` (alerta primário); mesma sala com instrutores
      diferentes (ou sem instrutor, caso de evento extracurricular) marca `conflitoTipo='Sala'`
      (alerta secundário). Cálculo em memória, nunca tabela de conflitos persistida.
- [X] T009 [US2] Em `lib/acoes/dsa.ts` (`getDsaSemanal`, T004): chamar `detectarConflitosDsa_` por
      dia da semana e aplicar os flags aos `blocos[]` retornados.
- [X] T010 [P] [US2] Em `app/(app)/turmas/[turma]/dsa/page.tsx`: sinalização visual de conflito — cor/ícone
      diferente para `conflitoTipo='Instrutor'` (alerta primário) vs `'Sala'` (alerta secundário).
- [X] T011 [US2] Criar `tests/unidade/regras_dsa.test.ts`: teste `RN-CONF-01` — cenário de integração com
      o cliente Supabase mockado (mesmo padrão do teste de RN-2027-09 no Épico G,
      `tests/unidade/regras_cronograma.test.ts`): mesmo instrutor em TAs sobrepostos em duas turmas
      diferentes no mesmo dia, confirma `conflito=true` em ambos os blocos mesmo consultando só uma
      das turmas; caso de sala repetida com instrutores diferentes confirma `conflitoTipo='Sala'`;
      caso sem sobreposição confirma nenhum conflito. Remove o `test.todo` de RN-CONF-01 de
      `tests/unidade/pendentes.test.ts`.
- [X] T012 [US2] Rodar `pnpm vitest run` e confirmar zero regressão; validar manualmente
      o passo 3 de `quickstart.md`.

**Checkpoint**: RN-CONF-01 (Risco Alto) testada e funcionando — maior risco isolado do épico
fechado.

---

## Phase 5: User Story 3 - Prévia semanal simples e determinística do DSA (Priority: P1)

**Goal**: o motor de sugestão propriamente dito — preenche espaços livres respeitando os limites
rígidos já existentes, nunca bloqueia lançamento manual divergente.

**Independent Test**: quickstart.md, passo 4 — gerar prévia de uma turma real, confirmar tetos
respeitados, aceitar um bloco, confirmar que lançamento manual divergente continua funcionando.

### Implementação da User Story 3

- [X] T013 [US3] Criar `lib/dominio/sugestao-dsa.ts`: `gerarSugestaoSemanal(idTurma, semanaIso)` —
      chama `getDsaSemanal` (T004/T009) para saber os espaços já ocupados; para cada dia útil,
      identifica TAs livres; ordena disciplinas candidatas por carga restante ÷ dias úteis restantes
      (RN-2027-05), reaproveitando `distribuicaoSemanalMateria_` (`lib/acoes/cronograma.ts`) para saber quanto
      falta de cada uma — **nunca recalculando isso de outra forma** (FR-006) — ajustado pelo peso
      manual (`lerPesosPrioridadeDisciplina_`, `lib/dominio/motor-preditivo.ts`, já existente do Épico G).
      Respeita: teto de TFM (6/semana, via `validarTetoSemanalTfm_`, T003), fim de curso sem teto,
      demais 25/semana recomendado (`limiteSemanalMateria_`, `lib/acoes/cronograma.ts`), máx. 4 disciplinas
      distintas/dia, máx. 4 tempos da mesma disciplina/dia. Nenhuma restrição de sequenciamento de
      técnica de ensino é avaliada (achado A-7, explicitamente fora).
- [X] T014 [US3] Em `lib/dominio/sugestao-dsa.ts`: escolha de instrutor para cada bloco sugerido —
      reaproveitar `escolherInstrutor_`/`faixaRegimeInstrutor_` (`lib/dominio/motor-preditivo.ts`, Épico G),
      adaptado à semana real (nunca duplicar a lógica de faixa de regime, FR-006).
- [X] T015 [US3] Em `lib/dominio/sugestao-dsa.ts`: `aceitarBlocoSugerido(bloco)` — chama `lancarAula`
      (T005) com os campos do bloco sugerido; nenhum caminho de escrita paralelo (FR-007).
- [X] T016 [P] [US3] Em `app/(app)/turmas/[turma]/dsa/page.tsx`: UI da prévia — botão "gerar prévia da semana",
      lista de blocos sugeridos sobre a grade (visualmente distintos de lançamentos reais), botão
      "aceitar" por bloco; lançamento manual continua disponível e não é bloqueado por nenhuma
      sugestão pendente.
- [X] T017 [US3] Em `tests/unidade/regras_dsa.test.ts`: testes sintéticos da alocação — teto de TFM nunca
      ultrapassado, disciplina de fim de curso sem teto, demais respeitando 25/semana recomendado
      (podendo ultrapassar só se a janela for curta), máx. 4 disciplinas/dia e 4 tempos da mesma
      disciplina/dia, priorização por carga restante ajustada por peso manual, desempate automático
      quando pesos iguais.
- [X] T018 [US3] Rodar `pnpm vitest run` e confirmar zero regressão; validar manualmente
      o passo 4 de `quickstart.md`.

**Checkpoint**: o problema original do Épico H (documento 06) está resolvido — prévia semanal
funcionando, nunca travando o lançamento manual.

---

## Phase 6: User Story 4 - Validar a sugestão simples contra uma semana real já lançada (Priority: P1)

**Goal**: gate obrigatório de RF-DSA-08.1(ii) — sem esta validação, a User Story 3 é considerada
incompleta.

**Independent Test**: quickstart.md, passo 5 — validar contra uma semana real concluída, confirmar
relatório de comparação; tentar validar semana vazia, confirmar recusa.

### Implementação da User Story 4

- [X] T019 [US4] Em `lib/dominio/sugestao-dsa.ts`: `validarSugestaoContraSemanaReal(idTurma,
      semanaIso)` — chama `gerarSugestaoSemanal` (T013) tratando todos os TAs da semana como livres
      (ignora lançamentos reais como entrada), compara bloco a bloco contra o que `getDsaSemanal`
      mostra como realmente lançado: `Coincidente` (mesma disciplina e instrutor), `Divergente`
      (motivo explícito), `Sem_Correspondencia`. Rejeita com erro claro quando a turma/semana não
      tem nenhum lançamento manual real (FR-010) — nunca compara contra lista vazia como 100%
      divergência. **Nenhuma taxa de aprovação/reprovação calculada** — decisão humana fora desta
      spec (FR-009).
- [X] T020 [P] [US4] Em `app/(app)/turmas/[turma]/dsa/page.tsx`: UI de validação (visível só para Admin/
      Divisão de Administração Acadêmica) — seletor de turma/semana já concluída, botão validar,
      tabela de comparação (coincidências/divergências/sem correspondência).
- [X] T021 [US4] Em `tests/unidade/regras_dsa.test.ts`: testes da classificação de comparação (coincidente/
      divergente/sem correspondência) e da recusa quando não há lançamento manual real.
- [X] T022 [US4] Rodar `pnpm vitest run` e confirmar zero regressão; validar manualmente
      o passo 5 de `quickstart.md` — usar uma turma/semana real já lançada (referência sugerida:
      CAHO, citada pelo próprio RF-DSA-08.1) como primeira validação de fato.

**Checkpoint**: RF-DSA-08.1 cumprido por completo (i + ii) — sofisticação futura do motor fica
condicionada ao resultado desta validação, fora desta spec.

---

## Phase 7: User Story 5 - Impressão do DSA em página única A4 paisagem (Priority: P2)

**Goal**: registro físico assinado semanalmente, mesmo padrão já usado duas vezes na V1.0.

**Independent Test**: quickstart.md, passo 6 — imprimir semana completa, confirmar uma página A4
paisagem com as duas assinaturas.

### Implementação da User Story 5

- [X] T023 [US5] Em `app/globals.css`: portar `.area-impressao`/`@media print` (V1.0,
      `index.html:106-111`, research.md achado 4) como componente do Design System — `@page { size:
      landscape; }`, oculta tudo exceto `.area-impressao`.
- [X] T024 [US5] Em `lib/acoes/dsa.ts`: `getImpressaoDsa(idTurma, semanaIso)` — reaproveita
      `getDsaSemanal` (T004/T009) e acrescenta `responsaveis[]` via `responsaveis_curso`, filtrado
      por `ID_Curso` e vigência (`Vigente_A_Partir_De`/`Vigente_Ate`) na data da semana
      (`01-schema.md` §4.6) — lista vazia quando não houver responsável vigente (RN-DEG-01).
- [X] T025 [P] [US5] Em `app/(app)/turmas/[turma]/dsa/page.tsx`: renderizar a área de impressão (cabeçalho:
      curso, número da semana, período, efetivo; corpo: grade completa; assinaturas — em branco
      quando `responsaveis[]` vazio) dentro de `.area-impressao`; botão "Imprimir"
      (`window.print()`, mesmo padrão de `app/(app)/cronograma/page.tsx`).
- [X] T026 [US5] Rodar `pnpm vitest run` e confirmar zero regressão; validar manualmente
      o passo 6 de `quickstart.md`.

**Checkpoint**: DSA imprimível em uma página A4 paisagem, com degradação segura de assinatura.

---

## Phase 8: User Story 6 - Excluir e reordenar lançamento diretamente na grade (Priority: P2)

**Goal**: fluxo de edição direto na grade — excluir sem função nova, mover por arrastar-e-soltar
(trabalho genuinamente novo, sem precedente no projeto).

**Independent Test**: quickstart.md, passo 7 — excluir bloco pela grade, arrastar bloco para outro
TA/dia, confirmar reavaliação de conflito e recusa de TFM quando aplicável.

### Implementação da User Story 6

- [X] T027 [US6] Em `app/(app)/turmas/[turma]/dsa/page.tsx`: botão excluir por bloco chamando `crudExcluir`
      diretamente (`lib/acoes/crud.ts`, já existente e genérico — nenhuma função nova no backend, research.md
      achado 6) — prefixo do `idRegistro` decide a aba (`registros_aula`/`avaliacoes`/
      `atividades_nao_letivas`), mesmo padrão de `excluirRegistroAula` (V1.0).
- [X] T028 [US6] Em `lib/acoes/dsa.ts`: `moverLancamentoDsa(idRegistro, novaData, novoTaInicial)`
      — **generalizado para qualquer bloco da grade, não só Aula** (`/speckit-analyze` 2026-08-15,
      achado F3): resolve a aba de origem pelo prefixo de `idRegistro`, mesmo padrão de despacho já
      usado pela exclusão (T027) — `registros_aula`/`avaliacoes`/
      `atividades_nao_letivas`. Só quando a aba resolvida for `registros_aula` e a
      disciplina for TFM, chama `validarTetoSemanalTfm_` (T003, com `exclude=idRegistro`) para a
      nova data/semana antes de mover — se `excede`, rejeita com erro claro; para as demais abas/
      disciplinas, move direto. Grava via `crudAtualizar(aba, idRegistro, {Data: novaData,
      TA_Inicial: novoTaInicial})` — mesma função genérica, campo de posição já existe nas três
      abas (`TA_Inicial`, já usado por FR-003).
- [X] T029 [P] [US6] Em `app/(app)/turmas/[turma]/dsa/page.tsx`: arrastar-e-soltar nativo (`draggable="true"`,
      `ondragstart`/`ondragover`/`ondrop`, sem biblioteca — constitution Princípio III) chamando
      `moverLancamentoDsa`; após sucesso, recarrega a grade (`getDsaSemanal`) para refletir a nova
      posição e reavaliar conflito (US2) automaticamente.
- [X] T030 [US6] Em `tests/unidade/regras_dsa.test.ts`: teste de `validarTetoSemanalTfm_` com `exclude` —
      mover um bloco de TFM dentro da mesma semana não deve contar o próprio bloco duas vezes; mover
      para uma semana que já está no teto deve ser rejeitado. Confirma também que mover um bloco de
      `avaliacoes`/`atividades_nao_letivas` (T028) nunca aciona a validação de TFM — só
      `registros_aula` com disciplina TFM entra nesse caminho.
- [X] T031 [US6] Rodar `pnpm vitest run` e confirmar zero regressão; validar manualmente
      o passo 7 de `quickstart.md`.

**Checkpoint**: todas as 6 User Stories completas e independentemente funcionais.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T032 [P] Bump de `o SHA do commit` para `'2026-08-15.H.1'` em `lib/supabase/server.ts` e
      `app/layout.tsx` — tarefa explícita desta vez (lacuna recorrente nos Épicos G/A,
      onde o bump só foi feito manualmente no momento do deploy, sem tarefa dedicada em `tasks.md`).
- [X] T033 Rodar `pnpm vitest run` (suíte completa) uma última vez e confirmar que o
      `test.todo` de RN-CONF-01 virou passe, sem nenhuma regressão nos demais (SC-002) — e que
      `tests/unidade/pendentes.test.ts` fica sem nenhum `test.todo` restante (era o último stub pendente do
      projeto). **Confirmado: baseline 139 testes/138 passam/1 todo → final 163 testes, 163 passam,
      0 falham, 0 todo — `tests/unidade/pendentes.test.ts` sem nenhum `test.todo` restante, primeira vez
      desde o início da sessão.**
- [X] T034 Rodar `quickstart.md` do passo 1 ao 8 em sequência, como checagem final combinada.
      **Passos 1 (stub → teste real) confirmado estaticamente pela suíte; os demais passos (grade
      no navegador, arrastar-e-soltar, impressão em página única, contraste/paridade visual) ficam
      para o teste de aceite ao vivo, mesmo protocolo de todos os épicos anteriores desta sessão —
      nenhum teste automatizado cobre renderização real de navegador.**
- [X] T035 Atualizar `docs/arquitetura/02-modularizacao.md`: marcar `lib/acoes/dsa.ts` (de "versão parcial"
      para completo) e `lib/dominio/sugestao-dsa.ts` (novo) como construídos, com a última alteração citando este
      épico (mesmo padrão dos Épicos B/G).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup. **Bloqueia todas as User Stories** — resolução de
  horário (T002) é usada por US1/US5; validação de teto de TFM (T003) é usada por US1/US3/US6.
- **User Story 1 (Phase 3)**: depende só do Foundational. **Pré-requisito real de todas as demais**
  — nenhuma outra User Story tem onde se apoiar sem a grade existir (`getDsaSemanal`, T004) e sem
  `lancarAula` (T005) existir como caminho de escrita único.
- **User Story 2 (Phase 4)**: depende de T004/T009 (grade da US1 já existir para receber os flags de
  conflito).
- **User Story 3 (Phase 5)**: depende de T004 (US1, para saber os espaços livres) e T005 (US1, para
  `aceitarBlocoSugerido` escrever pelo mesmo caminho). Não depende de US2 (conflito é sinalização,
  a sugestão não precisa dela para funcionar).
- **User Story 4 (Phase 6)**: depende de T013 (US3, `gerarSugestaoSemanal`) — é literalmente o
  segundo passo do mesmo fatiamento (RF-DSA-08.1). **Gate obrigatório**: por ser parte do mesmo
  requisito fatiado que a User Story 3 (RF-DSA-08.1(i)+(ii)), não deve ser adiada para depois de um
  eventual deploy do MVP — ao contrário de US5/US6 (P2, genuinamente adiáveis).
- **User Story 5 (Phase 7)**: depende de T004/T009 (grade completa) para ter o que imprimir.
- **User Story 6 (Phase 8)**: depende de T003 (validação de TFM) e T004/T009 (grade + conflito, para
  reavaliar após mover).
- **Polish (Phase 9)**: depende de todas as User Stories completas.

### Parallel Opportunities

- Foundational: T002 (`lerCatalogoHorarios_`) e T003 (`validarTetoSemanalTfm_`) em paralelo —
  funções independentes dentro do mesmo arquivo `lib/acoes/dsa.ts`, sem dependência entre si.
- US1: T006 (`app/(app)/turmas/[turma]/dsa/page.tsx`) pode começar em paralelo assim que T004/T005 definirem as assinaturas.
- US2: T010 (`app/(app)/turmas/[turma]/dsa/page.tsx`) em paralelo com T011 (testes), ambos depois de T008/T009.
- US3: T016 (`app/(app)/turmas/[turma]/dsa/page.tsx`) em paralelo com T017 (testes), ambos depois de T013-T015.
- US4: T020 (`app/(app)/turmas/[turma]/dsa/page.tsx`) em paralelo com T021 (testes), ambos depois de T019.
- US5: T025 (`app/(app)/turmas/[turma]/dsa/page.tsx`) depois de T023 (`app/globals.css`) e T024 (backend) — **risco de
  conflito de merge com T006/T010/T016/T020/T029**, todas editando `app/(app)/turmas/[turma]/dsa/page.tsx`: rodar em série
  se feito por uma única pessoa/agente, mesmo achado de risco já registrado no `/speckit-analyze`
  do Épico A para `app/layout.tsx`.
- US6: T029 (`app/(app)/turmas/[turma]/dsa/page.tsx`) depois de T027/T028 — mesmo risco de merge acima.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Setup + Foundational (T001-T003).
2. User Story 1 (T004-T007) — grade completa por TA + lançamento manual funcionando.
3. **PARAR E VALIDAR**: `quickstart.md` passo 2.
4. Deploy via `o fluxo Git → Vercel` se aprovado — já é valor real (fim da "versão parcial" do DSA), mas **sem**
   RN-CONF-01 testada ainda (US2) — diferente do Épico G, aqui não há gate equivalente ao achado H1
   bloqueando o MVP, porque US1 não depende de US2 para estar correta (conflito é sinalização
   adicional, não uma correção de cálculo já em uso por US1).

### Entrega Incremental

1. Setup + Foundational → base compartilhada pronta.
2. US1 (grade + lançamento manual, MVP) → validar → deploy/demo.
3. US2 (conflito cross-turma, RN-CONF-01 fechada) → validar → deploy/demo.
4. US3 (prévia simples) → validar → deploy/demo.
5. US4 (validação obrigatória contra semana real, RF-DSA-08.1 completo) → validar — recomendado
   rodar antes de anunciar a sugestão como "pronta para uso", mesmo que já implantada.
6. US5 (impressão) → validar → deploy/demo.
7. US6 (excluir/arrastar-soltar) → validar → deploy final.
8. Polish (o SHA do commit, checagem combinada, reconciliação do mapa de arquitetura).

---

## Notes

- `[P]` = arquivos diferentes ou funções independentes no mesmo arquivo, sem conflito de merge real.
- `[Story]` mapeia cada tarefa a uma User Story do spec.md para rastreabilidade.
- Nenhuma tabela/coluna nova no schema — todas as abas usadas já existem desde o Épico C
  (plan.md, "data-model.md omitido").
- Quatro portes diretos da V1.0 (research.md achados 1/3/4): `getDsaSemanal`, `registrarAula`,
  `.area-impressao`/`@media print`, exclusão via `crudExcluir`. Duas construções genuinamente novas:
  o motor de sugestão (US3/US4, sem precedente) e o arrastar-e-soltar (US6, sem precedente em
  nenhuma versão do projeto).
- Único bloqueio rígido novo desta spec: teto semanal de TFM (T003, Clarifications 2026-08-15) —
  todo outro teto normativo do sistema continua alerta-nunca-bloqueio (constitution, Princípio V).
- Rodar `pnpm vitest run` depois de cada fase concluída, não só nos checkpoints
  explicitamente listados.
- Commit por tarefa ou grupo lógico de tarefas da mesma User Story (constitution, Princípio VI);
  cada commit cita `RF-DSA-0x` (constitution, Princípio VIII).
