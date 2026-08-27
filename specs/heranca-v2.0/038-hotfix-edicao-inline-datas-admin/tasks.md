---

description: "Task list for Hotfix: Remoção de Edição Inline, Auditoria de Persistência de Datas e Permissão de Admin"
---

# Tasks: Hotfix — Remoção de Edição Inline, Auditoria de Persistência de Datas e Permissão de Admin

**Input**: Design documents from `/specs/038-hotfix-edicao-inline-datas-admin/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/backend-functions.md,
quickstart.md

**Tests**: incluídos para toda função alterada com harness de mock já disponível
(`tests/unidade/regras_de_negocio_backend.test.ts` para `.ts`, `tests/unidade/regras_ui_dados.test.ts` para
funções puras de `.html`). `linhaVisao2_` é uma função pura de template string (nunca toca `document`
diretamente) — testável pelo mesmo harness já usado para `linhaVisao1_`/`resumoInstrutoresCompacto_`.

**Organization**: 3 User Stories, todas P1, totalmente independentes entre si — cada uma toca 1
único arquivo, sem sobreposição de função nem de dado. Nenhuma fase Foundational: não há
infraestrutura compartilhada nova entre as 3 histórias.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos ou funções distintas, sem dependência)
- **[Story]**: US1 (tabela somente leitura) · US2 (auditoria de datas) · US3 (permissão de Admin)

## Path Conventions

Backend: `lib/acoes/liq.ts` (US2), `lib/dominio/motor-preditivo.ts` (US3). Frontend:
`app/`app/(app)/disciplinas/page.tsx`` (US1, só `linhaVisao2_`). Testes:
`tests/unidade/regras_de_negocio_backend.test.ts`, `tests/unidade/regras_ui_dados.test.ts`.

---

## Phase 1: User Story 1 — Tabela principal somente leitura para Carga Horária/Prioridade (Priority: P1) 🎯 MVP

**Goal**: `linhaVisao2_` renderiza Carga Horária e Prioridade como texto simples, sem input nem
botão "Salvar" — edição só pelo painel "Editar". `linhaVisao1_` (catálogo puro) intocada.

**Independent Test**: `quickstart.md` Passo 1 — com Turma selecionada, conferir ausência de
`<input>`/"Salvar" nas 2 colunas; com Curso sem Turma, conferir que a edição inline continua.

### Implementação da User Story 1

- [X] T001 [US1] Em `app/(app)/disciplinas/page.tsx`, `linhaVisao2_`: remover o `<input>` de
  Carga Horária (`id="cht_${idGrade}"`) e o de Prioridade (`id="prio_${idGrade}"`), substituindo
  por texto simples (`${chTempos}` e `${pesosPrioridadeCarregados[idGrade] != null ?
  pesosPrioridadeCarregados[idGrade] : '—'}`, respectivamente — achado do `/speckit-plan`: o
  input de Prioridade nunca tinha `value`, sempre em branco mesmo com peso salvo, corrigido como
  efeito colateral da conversão); remover o botão "Salvar" da célula Ações, mantendo só "Editar".
  `linhaVisao1_` permanece intocada (FR-002)
- [X] T002 [US1] Adicionar casos em `tests/unidade/regras_ui_dados.test.ts` para `linhaVisao2_`: saída não
  contém `<input`/`id="cht_`/`id="prio_`/`>Salvar<` para nenhuma combinação de `editaPrioridade`;
  saída contém `>Editar<`; célula de Carga Horária mostra o valor numérico como texto; célula de
  Prioridade mostra o peso salvo (via `pesosPrioridadeCarregados` fake) ou `—` quando ausente
  (depends on T001)

**Checkpoint**: Edição inline removida das visões turma-aware, preservada no catálogo puro —
testável e entregável isoladamente.

---

## Phase 2: User Story 2 — Falha ao salvar datas vira erro visível (Priority: P1)

**Goal**: `atualizarTurmaDisciplina` relê a linha após gravar `Previsao_Inicio`/`Previsao_Termino`
e lança erro real se o valor relido não bater com o enviado, com `Logger.log` permanente no ponto
de gravação.

**Independent Test**: `quickstart.md` Passo 2 — editar datas, salvar, F5, confirmar persistência;
em caso de falha simulada, confirmar alerta visível (não mais silencioso).

### Implementação da User Story 2

- [X] T003 [US2] Em `lib/acoes/liq.ts`, `atualizarTurmaDisciplina`: `Logger.log` do payload
  (`alteracoes`) recebido antes de `crudAtualizar`; após `crudAtualizar`, quando `alteracoes`
  inclui `Previsao_Inicio` e/ou `Previsao_Termino`, relê a linha (`lerAbaComoObjetos_`) e compara
  cada chave presente contra o valor gravado (mesma representação `'yyyy-MM-dd'`); `Logger.log` do
  resultado da releitura; lança `Error` citando enviado e relido se qualquer uma não bater, antes
  de retornar (`contracts/backend-functions.md`, `data-model.md` §2)
- [X] T004 [US2] Adicionar casos em `tests/unidade/regras_de_negocio_backend.test.ts` para
  `atualizarTurmaDisciplina` estendida: mock com a linha já refletindo o valor que será enviado →
  sucesso, sem exceção; mock com a linha tendo valor diferente do que será enviado (mesma técnica
  de "gravação simulada que não pega" da prova de rollback de `cadastrarDisciplina`, spec 036) →
  `Error` lançado, mensagem cita os 2 valores; chamada só com `ID_Instrutor` (sem datas) → nenhuma
  leitura extra de `turma_disciplina` em comparação com o comportamento de antes desta spec (prova
  por contagem de leituras); chamada só com `Previsao_Inicio` (sem `Previsao_Termino`) → releitura
  checa só a chave presente (depends on T003)

**Checkpoint**: Falha de gravação de data agora sempre visível — testável e entregável
isoladamente.

---

## Phase 3: User Story 3 — Administrador consegue editar a Prioridade (Priority: P1)

**Goal**: `definirPrioridadeDisciplina` aceita o perfil `Admin`, mantendo os perfis já autorizados.

**Independent Test**: `quickstart.md` Passo 3 — logado como Admin, editar e salvar Prioridade sem
"Acesso negado"; repetir com os perfis já autorizados, confirmando não regressão.

### Implementação da User Story 3

- [X] T005 [US3] Em `lib/dominio/motor-preditivo.ts`, `definirPrioridadeDisciplina`: trocar
  `exigirFuncao(PERFIS_DIVISAO_ADMIN_ACADEMICA)` por
  `exigirFuncao(['Admin'].concat(PERFIS_DIVISAO_ADMIN_ACADEMICA))` — mesmo padrão já usado por
  `gerarPlanejamento`/`salvarPlanejamento`/`lancarEventoManualPlanejamento` no mesmo arquivo
  (`contracts/backend-functions.md`, `data-model.md` §3)
- [X] T006 [US3] Adicionar casos em `tests/unidade/regras_de_negocio_backend.test.ts` para
  `definirPrioridadeDisciplina`: usuário `Admin` → gravação aceita, sem `Error` de "Acesso negado";
  usuário `Encarregado_Divisao_Administracao_Academica`/`Ajudante_Divisao_Administracao_Academica`
  → continua aceito (não regressão); usuário `Operador` (ou outro perfil não autorizado) →
  continua rejeitado (não regressão) (depends on T005)

**Checkpoint**: Todas as 3 histórias entregues — critério de aceite completo do `spec.md`
verificável.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T007 [P] Atualizar `o histórico de deploys da Vercel` — novas entradas para `lib/acoes/liq.ts`/
  `lib/dominio/motor-preditivo.ts`/`app/(app)/disciplinas/page.tsx`
- [X] T008 Bump `o SHA do commit`/`o SHA do commit_FRONTEND` em `lib/supabase/server.ts` e `app/layout.tsx`
  (protocolo padrão, documento 10 §8)
- [X] T009 [P] Atualizar a tabela de status e a seção narrativa de `CLAUDE.md` para a spec 038
- [X] T010 Rodar `pnpm vitest run` completo, confirmar 0 falhas — 466/466, 0 falhas
- [X] T011 ``git push` (a Vercel publica a preview da branch)`/`o merge na `main` (a Vercel publica em produção)` (`o histórico de deploys da Vercel`) — ``git push` (a Vercel publica a preview da branch)`: 33 arquivos.
  `o merge na `main` (a Vercel publica em produção)`: `AKfycbztf09jVkJJEEewAf-nB2vbAQS57Yftam6729_Vh49oFumvnz2djQcwCHjVLB0m-vqt @60`.
- [ ] T012 Executar `quickstart.md` Passos 1 a 3 manualmente contra o deploy publicado

---

## Dependencies & Execution Order

### Phase Dependencies

- **US1 (Phase 1)**, **US2 (Phase 2)**, **US3 (Phase 3)**: sem dependência entre si nem de nenhuma
  fase Foundational — podem ser feitas em qualquer ordem, inclusive totalmente em paralelo
- **Polish (Phase 4)**: depende de US1+US2+US3 completas

### Parallel Opportunities

- T001 (US1, `app/(app)/disciplinas/page.tsx`), T003 (US2, `lib/acoes/liq.ts`) e T005 (US3, `lib/dominio/motor-preditivo.ts`) — 3
  arquivos diferentes, zero dependência entre si, podem ser feitas em paralelo por completo
- T007/T009 (Polish, arquivos de documentação distintos)
- Dentro de cada história, a tarefa de teste depende só da tarefa de implementação da mesma
  história (T002←T001, T004←T003, T006←T005) — nenhuma dependência cruzada entre histórias

---

## Parallel Example: As 3 histórias

```bash
Task: "Remover edicao inline de linhaVisao2_ em `app/(app)/disciplinas/page.tsx` (T001)"
Task: "Releitura de verificacao em atualizarTurmaDisciplina em `lib/acoes/liq.ts` (T003)"
Task: "Adicionar 'Admin' em definirPrioridadeDisciplina em `lib/dominio/motor-preditivo.ts` (T005)"
```

As 3 tarefas tocam arquivos diferentes, funções diferentes, sem nenhuma dependência — podem ser
implementadas na ordem que for mais conveniente, inclusive simultaneamente.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Phase 1 (US1) — tabela somente leitura já funcional
2. **PARAR e VALIDAR**: `quickstart.md` Passo 1
3. Deploy/demo se desejado

### Incremental Delivery

1. US1 (tabela somente leitura) → validar
2. US2 (auditoria de datas) → validar
3. US3 (permissão de Admin) → validar
4. Polish (commit, PR, preview da Vercel, quickstart completo)

Como as 3 histórias são independentes, a ordem acima é só uma sugestão — qualquer ordem (ou
paralelismo total) entrega o mesmo resultado final.

---

## Notes

- Nenhuma migração de schema, nenhuma coluna nova.
- `linhaVisao1_` (catálogo puro por Curso sem Turma) não é tocada por nenhuma tarefa — preserva a
  edição inline deliberadamente (FR-002, decisão da Verificação de Premissa do `spec.md`).
- Commit após cada história completa, seguindo o ritmo já estabelecido nesta sessão.
