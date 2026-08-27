---

description: "Task list for Hotfix: Regras Estritas de Nomenclatura Militar e Formatação"
---

# Tasks: Hotfix — Regras Estritas de Nomenclatura Militar e Formatação

**Input**: Design documents from `/specs/018-hotfix-nomenclatura-militar/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/frontend-functions.md,
quickstart.md — todos completos.

**Tests**: Incluídos para o motor de formatação (Foundational, lógica pura testável pelo harness já
existente de `components/ciaara/`) — **migração, não extensão**: os 10 testes existentes (contagem exata
confirmada por grep, achado do `/speckit-analyze` F1) de `tests/unidade/design_system.test.ts` chamam a
assinatura antiga e precisam ser reescritos antes de
qualquer caso novo (research.md §4). US1/US2 (aplicação nos call sites de `app/(app)/turmas/[turma]/dsa/page.tsx`/
`app/(app)/instrutores/page.tsx`) não têm harness de teste automatizado disponível (views sem `document` no
sandbox, mesmo achado já documentado nas specs 016/017) — verificação manual via `quickstart.md`.

**Organization**: 3 User Stories, todas dependentes da Foundational (motor de formatação
reescrito); US3 é independente das outras 2 e pode rodar em paralelo com a Foundational.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Rodar `pnpm vitest run` e confirmar o baseline atual (262 testes, 262
      passam, 0 falham, herdado do fechamento da spec 017) antes de qualquer mudança. **Confirmado**.

---

## Phase 2: Foundational (motor de formatação — bloqueia US1 e US2)

**Purpose**: Reescrever `formatarNomeInstrutor_` com a nova assinatura posicional e as 4 regras de
círculo hierárquico + exceção de `CA` — usado por US1 (tabelas/grade/ficha) e US2 (dropdowns de
alocação). Nenhuma delas pode começar antes desta fase estar completa e testada.

### Tests for Foundational ⚠️

> **Migrar os 10 testes existentes PRIMEIRO (não são aditivos — quebram com a assinatura antiga
> chamando a nova função), depois adicionar os casos novos, confirmar que TUDO falha antes de
> implementar (research.md §1/§4/§5)**

- [X] T002 Em `tests/unidade/design_system.test.ts`: reescrever os 10 testes existentes do `describe`
      "RF-INSTR-15/RF-DS-05 - formatarNomeInstrutor_..." para a nova assinatura posicional
      (`formatarNomeInstrutor_(posto, esp, nomeCompleto, nomeGuerra, isHTML)`), preservando o
      comportamento que cada um documenta (negrito seletivo do nome de guerra, fallback para
      Nome_Guerra quando Nome_Completo ausente, graceful degradation com tudo vazio/undefined,
      escape de caractere especial de regex); acrescentar casos novos: (a) Oficial sem
      especialidade → `"[Posto] [Nome]"`; (b) Oficial com `Esp_Hab_Obs="CA"` → `"[Posto] [Nome]"`
      (sem `(CA)` — critério de aceite central, spec.md); (c) Oficial com outra especialidade →
      `"[Posto] ([Esp]) [Nome]"`; (d) Praça com especialidade, incluindo `"CA"` → `"[Posto]-[Esp]
      [Nome]"` (a exceção do Oficial nunca se aplica); (e) Praça sem especialidade →
      `"[Posto] [Nome]"`; (f) Civil (`SC`) ou posto desconhecido → `"[Posto] [Nome]"`,
      independente da especialidade, nunca lança exceção; (g) especialidade com artefato legado
      (`"-HN"`, `"(T)"`) não duplica o separador de círculo (research.md §5); (h) `isHTML=false`
      nunca produz nenhuma tag HTML no resultado, mesmo com nome de guerra presente. Depende de
      T001.
- [X] T003 Rodar `pnpm vitest run tests/design_system.test.ts` — confirmar que TODOS os casos de T002
      falham contra a implementação atual (assinatura antiga de objeto único). Depende de T002.
      **Confirmado**: 17 de 18 casos novos/migrados falham (o único que passa contra o código
      antigo testa entrada totalmente nula/ausente, que já degradava para `""` sob as duas
      assinaturas — comportamento correto sob ambas, não um falso positivo).

### Implementation for Foundational

- [X] T004 Em `components/ciaara/`: implementar `OFICIAIS_POSTO_`/`PRACAS_POSTO_` (novas,
      constantes) e `normalizarEspHabObsComum_` (nova, função pura — cópia mínima de
      `normalizarEspHabObs_`, spec 016); reescrever `formatarNomeInstrutor_` para a assinatura
      `(posto, esp, nomeCompleto, nomeGuerra, isHTML = false)`, aplicando as 4 regras de círculo +
      exceção de `CA` para Oficiais, com `esp` sempre normalizado antes de montar o
      parênteses/hífen (research.md §1/§5, contracts/frontend-functions.md). Depende de T003
      (testes devem existir e falhar antes).
- [X] T005 Rodar `pnpm vitest run` — confirmar que todos os casos de T002 passam e a
      suíte inteira continua em 0 falhas (nenhum outro teste depende da assinatura antiga —
      confirmado por grep antes desta fase). Depende de T004. **270 testes, 270 passam, 0 falham**
      (262 baseline + 8 líquidos novos: 18 casos de `formatarNomeInstrutor_` agora contra 10
      antes).

**Checkpoint**: Motor de formatação pronto e testado — US1 e US2 podem começar (em paralelo entre
si, já que tocam arquivos/call sites disjuntos).

---

## Phase 3: User Story 1 - Ver o posto/especialidade/nome formatado corretamente (Priority: P1)

**Goal**: Toda tabela, grade e ficha que exibe instrutor usa a nova formatação com negrito no nome
de guerra e a exceção de `CA` para Oficiais.

**Independent Test**: `quickstart.md` Passos 1 e 2 — abrir a Ficha de um instrutor com nome de
guerra, confirmar negrito; editar um instrutor Oficial com `Esp_Hab_Obs="CA"`, confirmar que a
sigla não aparece ao lado do posto em nenhuma tela de leitura.

### Implementation for User Story 1

- [X] T006 [US1] Em `app/(app)/turmas/[turma]/dsa/page.tsx`: atualizar a célula da grade do DSA (linha ~177)
      para `formatarNomeInstrutor_(bloco.instrutor.Posto_Graduacao, bloco.instrutor.Esp_Hab_Obs,
      bloco.instrutor.Nome_Completo, bloco.instrutor.Nome_Guerra, true)` (contracts/
      frontend-functions.md). Depende de T005.
- [X] T007 [US1] [P] Em `app/(app)/instrutores/page.tsx`: atualizar a coluna "Nome Completo" da
      listagem (linha ~418) e o cabeçalho da Ficha do Instrutor (linha ~1174) para
      `formatarNomeInstrutor_('', '', <Nome_Completo>, <Nome_Guerra>, true)` — posto/especialidade
      propositalmente vazios (já mostrados em coluna/linha própria nessas 2 telas, Assumptions de
      spec.md). Depende de T005.
- [X] T008 Rodar `pnpm vitest run` — confirmar 0 regressão (nenhum caso novo esperado
      para esta User Story — achado de `plan.md`: `app/(app)/turmas/[turma]/dsa/page.tsx`/`app/(app)/instrutores/page.tsx` não têm
      harness de teste automatizado). **270 testes, 270 passam, 0 falham**.

### Verificação manual (não automatizável — FR-002 a FR-011)

- [ ] T009 [US1] Seguir `quickstart.md` Passos 1 e 2 no navegador (implantação via `o fluxo Git → Vercel`
      necessária antes) — confirmar negrito no nome de guerra na Ficha/grade; confirmar que um
      Oficial com `Esp_Hab_Obs="CA"` nunca mostra `(CA)`, e que uma Praça com o mesmo valor sempre
      mostra `-CA`.

**Checkpoint**: User Story 1 completa e verificável independentemente.

---

## Phase 4: User Story 2 - Selecionar instrutor num dropdown sem tags HTML (Priority: P2)

**Goal**: Os 2 dropdowns de alocação (lançar Aula manual, vínculo de qualificação) usam a saída em
texto puro da função unificada, sem gambiarra de regex e sem tag HTML nenhuma.

**Independent Test**: `quickstart.md` Passo 3 — inspecionar o HTML gerado dos 2 dropdowns,
confirmar ausência de `<strong>` e presença da especialidade no texto de cada opção.

### Implementation for User Story 2

- [X] T010 [US2] [P] Em `app/(app)/turmas/[turma]/dsa/page.tsx`: atualizar o dropdown de instrutor habilitado
      ao lançar Aula manual (linha ~262) para `formatarNomeInstrutor_(i.Posto_Graduacao,
      i.Esp_Hab_Obs, i.Nome_Completo, i.Nome_Guerra, false)`, removendo o
      `.replace(/<[^>]+>/g, '')` (gambiarra, contracts/frontend-functions.md). Depende de T005.
- [X] T011 [US2] [P] Em `app/(app)/instrutores/page.tsx`: migrar o dropdown de vínculo de
      qualificação `vincInstrutor` (linhas ~285-290) da concatenação ad-hoc própria
      (`${Posto_Graduacao} ${Nome_Completo}`) para `formatarNomeInstrutor_(i.Posto_Graduacao,
      i.Esp_Hab_Obs, i.Nome_Completo || i.ID_Instrutor, i.Nome_Guerra, false)` — revisão
      deliberada de FR-014 da spec 014 (Assumptions de spec.md desta spec). Depende de T005.
- [X] T012 Rodar `pnpm vitest run` — confirmar 0 regressão (mesmo achado de T008 — sem
      harness automatizado para estas views). **270 testes, 270 passam, 0 falham**.

### Verificação manual (não automatizável — FR-012/013)

- [ ] T013 [US2] Seguir `quickstart.md` Passo 3 no navegador — confirmar ausência de tags HTML no
      código-fonte dos 2 dropdowns e presença da especialidade no texto das opções.

**Checkpoint**: User Stories 1 e 2 completas — a formatação nova está visível em toda tela de
leitura e em ambos os dropdowns de alocação.

---

## Phase 5: User Story 3 - Ver "SIGLA - Nome" no dropdown de Especialidade (Priority: P3)

**Goal**: O dropdown de Especialidade/Habilitação/Observação no formulário de cadastro/edição
mostra a sigla junto do nome por extenso.

**Independent Test**: `quickstart.md` Passo 4 — abrir o dropdown no formulário, confirmar o
formato "SIGLA - Nome"; salvar e confirmar que só a sigla é gravada.

### Implementation for User Story 3

- [X] T014 [US3] [P] Em `app/(app)/instrutores/page.tsx`, dentro de
      `renderizarCampoEdicaoInstrutor_` (tipo `dropdown-fechado-sigla`): trocar o texto de cada
      `<option>` de `${CATALOGO_ESP_HAB_OBS[sigla]}` para `${sigla} - ${CATALOGO_ESP_HAB_OBS[sigla]}`
      (research.md §3, contracts/frontend-functions.md) — `value="${sigla}"` inalterado. Sem
      dependência de Foundational (arquivo/lógica completamente disjunta do motor de formatação
      de nome).

### Verificação manual (não automatizável — FR-014/015)

- [ ] T015 [US3] Seguir `quickstart.md` Passo 4 no navegador — confirmar formato "SIGLA - Nome" em
      cada opção e que o valor salvo continua sendo só a sigla.

**Checkpoint**: As 3 User Stories completas e verificáveis independentemente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T016 [P] Atualizar `docs/arquitetura/02-modularizacao.md` e `o histórico de deploys da Vercel` —
      linhas de `components/ciaara/`, `app/(app)/turmas/[turma]/dsa/page.tsx` e `app/(app)/instrutores/page.tsx` ganham uma frase citando
      este hotfix (mesmo padrão de "última alteração" já usado para todo épico/hotfix anterior).
- [X] T017 [P] Incrementar `o SHA do commit` nos dois lugares de sempre: `lib/supabase/server.ts` e `const
      o SHA do commit_FRONTEND` em `app/layout.tsx` (documento 10 §8.2, RF-MOD-04). Novo valor:
      `2026-08-17.HOTFIX018.1`. `o histórico de deploys da Vercel` também atualizado.
- [X] T018 Rodar `pnpm vitest run` uma última vez — confirmar suíte completa em 0
      falhas, 0 regressão. **270 testes, 270 passam, 0 falham**.
- [ ] T019 Seguir `quickstart.md` do início ao fim no navegador (Passos 1-5), após implantação via
      `o fluxo Git → Vercel` — confirmar as 3 User Stories juntas.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — roda primeiro.
- **Foundational (Phase 2)**: depende de Setup — **bloqueia US1 e US2** (ambas consomem a função
  reescrita). **Não bloqueia US3** (arquivo/lógica completamente disjunta — o dropdown de
  `Esp_Hab_Obs` não usa `formatarNomeInstrutor_`).
- **US1 (Phase 3)** e **US2 (Phase 4)**: dependem de Foundational completa. Tocam arquivos/call
  sites disjuntos entre si (US1: célula do DSA + 2 call sites "só nome" de `app/(app)/instrutores/page.tsx`;
  US2: dropdown de lançar Aula + dropdown de vínculo) — podem ser feitas em paralelo uma da outra.
- **US3 (Phase 5)**: pode começar a qualquer momento (mesmo em paralelo com a Foundational) — zero
  dependência real de `formatarNomeInstrutor_`.
- **Polish (Phase 6)**: depende das 3 User Stories completas.

### Within Each Phase

- Foundational: T002 (migrar+estender testes) antes de T003 (confirmar falha) antes de T004
  (implementar) antes de T005 (confirmar sucesso) — TDD, mesmo padrão de toda spec desta sessão.
- US1: T006/T007 podem ser escritas em paralelo (arquivos diferentes); T008 depois das duas.
- US2: T010/T011 podem ser escritas em paralelo (arquivos diferentes); T012 depois das duas.

### Parallel Opportunities

- **T014 (US3)** pode rodar a qualquer momento, inclusive em paralelo com toda a Foundational —
  única tarefa de implementação desta spec sem dependência do motor de formatação.
- **T006+T007 (US1)** e **T010+T011 (US2)** podem rodar em paralelo entre si depois da
  Foundational — arquivos e call sites disjuntos (achado do `/speckit-analyze` F3: T006 estava
  ausente desta lista, apesar de "Within Each Phase" já dizer que T006/T007 podem ser escritas em
  paralelo entre si).
- **T016/T017 (Polish)** podem rodar em paralelo entre si.

---

## Parallel Example: Depois da Foundational

```bash
Task: "T006 [US1] Celula da grade do DSA em `app/(app)/turmas/[turma]/dsa/page.tsx`"
Task: "T007 [US1] Colunas 'so nome' em `app/(app)/instrutores/page.tsx`"
Task: "T010 [US2] Dropdown de lancar Aula em `app/(app)/turmas/[turma]/dsa/page.tsx`"
Task: "T011 [US2] Dropdown de vinculo em `app/(app)/instrutores/page.tsx`"
Task: "T014 [US3] Dropdown de Esp_Hab_Obs em `app/(app)/instrutores/page.tsx` (sem dependencia real)"
```

---

## Implementation Strategy

### MVP First

User Story 1 (P1) é o MVP — a regra de negócio de nomenclatura militar em si, incluindo o critério
de aceite central (exceção de `CA` para Oficiais). US2 (P2) fecha a consistência nos dropdowns de
alocação. US3 (P3) é uma melhoria de usabilidade isolada, sem relação técnica com as outras 2.

### Incremental Delivery

1. Setup + Foundational → motor de formatação pronto e testado.
2. US1 → verificação manual → (opcionalmente) deploy.
3. US2 → verificação manual → (opcionalmente) deploy.
4. US3 → verificação manual → deploy final com as 3 juntas.
5. Polish → suíte completa + `quickstart.md` fim a fim → deploy/commit.

---

## Notes

- [P] tasks = arquivos/call sites diferentes, sem dependência real.
- Nenhuma tarefa desta spec toca schema/dado persistido — zero migração.
- Commit após cada tarefa ou grupo lógico, seguindo o padrão já estabelecido nesta sessão.
