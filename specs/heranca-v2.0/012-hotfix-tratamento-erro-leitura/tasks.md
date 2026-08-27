# Tasks: Hotfix — Tratamento de Erro Ausente em Chamadas de Leitura ao Backend

**Input**: Design documents from `specs/012-hotfix-tratamento-erro-leitura/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/error-handling-contract.md`, `quickstart.md`

**Tests**: Nenhum teste automatizado é viável (plan.md, Technical Context) — as 15 correções são
sobre o comportamento de uma Promise rejeitada da Server Action, que depende de DOM/rede
real, fora do alcance de `pnpm vitest run`. Verificação manual via `quickstart.md`, incluindo a técnica
de forçar uma falha real via escopo de RBAC (research.md §3).

**Organization**: Uma fase por User Story de `spec.md` — US1 (11 pontos, `alert()`) e US2 (4
pontos, `mostrarAvisoNivel2`), ambas P1. Dentro de cada fase, uma tarefa por arquivo (não por
função) — mais próximo de como a edição realmente acontece (todas as funções de um mesmo arquivo
editadas juntas). `app/(app)/avaliacoes/page.tsx` tem uma tarefa em cada fase (funções diferentes,
`aoTrocarTurmaAvaliacao`/`carregarPainelavaliacoes` em US1, `popularFiscalVistaProva` em US2) — ver
nota em "Dependencies".

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: User Story de `spec.md` (US1/US2)
- Caminhos de arquivo exatos em cada descrição

---

## Phase 1: Setup

**Purpose**: Confirmar baseline antes de qualquer mudança (Princípio VI da constitution).

- [X] T001 Rodar `pnpm vitest run` e confirmar baseline **187 testes, 187 passam, 0
      falham** (mesmo estado registrado em
      `implantacao/historico/2026-08-16-epico-d-appstate-navegacao.md`) antes de tocar qualquer
      arquivo.

---

## Phase 2: Foundational

**Não aplicável a este hotfix.** As 15 correções são mecânicas e independentes entre si — nenhuma
compartilha pré-requisito além do estado atual do repositório (já validado em T001).

---

## Phase 3: User Story 1 - Falha numa leitura disparada por ação do usuário mostra um aviso claro (Priority: P1) 🎯 MVP

**Goal**: As 11 chamadas de leitura disparadas por clique/seleção do usuário (tabela em
`data-model.md`) ganham `.catch(e => alert(e && e.message ? e.message : e))` — mesmo padrão já
usado em toda chamada de escrita do projeto (FR-001).

**Independent Test**: `quickstart.md` Passos 1-2 — forçar uma falha real via escopo de RBAC e
confirmar que um `alert()` aparece em pelo menos 3 das 11 funções.

### Implementation for User Story 1

- [X] T002 [P] [US1] Em `app/(app)/avaliacoes/page.tsx`, adicionar
      `.catch(e => alert(e && e.message ? e.message : e))` ao fim da cadeia de `aoTrocarTurmaAvaliacao`
      (o `.catch` cobre o `Promise.all([...])` inteiro, propagação nativa de rejeição) e de
      `carregarPainelavaliacoes` (FR-001, contracts/error-handling-contract.md).
- [X] T003 [P] [US1] Em `app/(app)/cronograma/page.tsx`, adicionar
      `.catch(e => alert(e && e.message ? e.message : e))` ao fim da cadeia de
      `garantirNomesInstrutores_` (FR-001).
- [X] T004 [P] [US1] Em `app/(app)/cursos/[curso]/page.tsx`, adicionar
      `.catch(e => alert(e && e.message ? e.message : e))` ao fim da cadeia de
      `renderizarDetalheCurso` (2 chamadas a Server Action na função — `listarDisciplinas` e
      `calcularTetosDoCurso` — cada uma já tem seu próprio `.then()`; adicionar um `.catch` ao fim
      de cada uma das 2 cadeias, não um único `.catch` compartilhado, já que não são
      `Promise.all`), `aoTrocarTurmaCurso` (1 chamada, simples) e `aoTrocarTurmaEstudoIndividual`
      (1 chamada, simples) (FR-001).

      **`aoClicarCardDisciplina` (achado do `/speckit-analyze`, F1) — estrutura ANINHADA, não
      sequencial**: `gs('getCronogramaGlobalDisciplina', idGrade, idTurma).then(c => { ... `
      **dentro desse `.then()`**, sem `return`, `gs('getPainelavaliacoesCurso', curso).then(painel
      => {...}); });` (``app/(app)/cursos/[curso]/page.tsx`:224-252`). São 2 promises desconectadas — um único `.catch`
      no fim da cadeia externa **não captura** rejeição da chamada interna, porque ela nunca é
      encadeada/retornada. Precisa de **2 `.catch(e => alert(...))` separados**: um logo antes do
      `});` que fecha o `.then(c => {...})` externo (linha 252) e outro logo antes do `});` que
      fecha o `.then(painel => {...})` interno (linha 251) — nunca um só.
- [X] T005 [P] [US1] Em `app/(app)/disciplinas/page.tsx`, adicionar
      `.catch(e => alert(e && e.message ? e.message : e))` ao fim da cadeia de `carregarDisciplinas`
      e de `carregaravaliacoesPlanejadas` (FR-001).
- [X] T006 [P] [US1] Em `app/(app)/relatorio/page.tsx`, adicionar
      `.catch(e => alert(e && e.message ? e.message : e))` ao fim da cadeia de
      `carregarTotalizadoresCurso` (FR-001).
- [X] T006b [US1] **15º ponto, contagem corrigida durante `/speckit-implement`**:
      `carregarCursosVinculados` em `app/(app)/admin/usuarios/page.tsx` — disparada por ação do
      usuário (clique em "Editar" um usuário `Encarregado_Curso`), mesmo tratamento `alert()` de
      US1. Já estava corretamente listada em `spec.md` §"Contexto e achados" desde o
      `/speckit.specify` (15 linhas na tabela), mas foi derrubada por engano ao transcrever para
      `data-model.md` (que ficou com só 10) — e `tasks.md` foi gerado a partir do `data-model.md`
      errado, então nunca ganhou tarefa própria. Achado quando o script de auditoria, rodado de
      novo após T002-T006 para conferência, ainda apontou este ponto sem `.catch`. Contagem "14"
      corrigida para "15" em `spec.md`/`plan.md`/`data-model.md`/`tasks.md`/`contracts/`/
      `quickstart.md`.
- [ ] T007 [US1] Seguir `quickstart.md` Passos 1-2 no navegador (implantação via `o fluxo Git → Vercel` necessária
      antes) — forçar uma falha real via escopo de RBAC e confirmar `alert()` em pelo menos 3 das
      11 funções (`app/(app)/cursos/[curso]/page.tsx`/`app/(app)/avaliacoes/page.tsx` recomendados, mais fáceis de exercitar).

**Checkpoint**: as 11 chamadas de ação do usuário mostram erro visível — MVP deste hotfix entregue
e verificável isoladamente.

---

## Phase 4: User Story 2 - Falha numa leitura automática do carregamento da página não interrompe o usuário com um modal surpresa (Priority: P1)

**Goal**: As 4 chamadas de leitura disparadas automaticamente no boot ganham
`mostrarAvisoNivel2(containerId, mensagem)`, reaproveitando um container de aviso já existente em
cada tela — nunca `alert()`/`confirm()` (FR-002, data-model.md).

**Independent Test**: `quickstart.md` Passo 3 — recarregar a página e, se possível, forçar uma das
4 funções a falhar; confirmar banner não-bloqueante, nunca modal.

### Implementation for User Story 2

- [X] T008 [P] [US2] Em `app/(app)/avaliacoes/page.tsx`, adicionar
      `.catch(e => mostrarAvisoNivel2('avisoVistaProva', e && e.message ? e.message : e))` ao fim
      da cadeia de `popularFiscalVistaProva` (FR-002, data-model.md). **Cuidado de arquivo**: mesmo
      arquivo de T002 (funções diferentes — `popularFiscalVistaProva` aqui,
      `aoTrocarTurmaAvaliacao`/`carregarPainelavaliacoes` em T002) — fazer depois de T002 concluída
      para evitar duas edições concorrentes do mesmo arquivo.
- [X] T009 [US2] Em `app/(app)/instrutores/page.tsx`, adicionar
      `.catch(e => mostrarAvisoNivel2('avisoInstrutor', e && e.message ? e.message : e))` ao fim da
      cadeia de `carregarInstrutores` e
      `.catch(e => mostrarAvisoNivel2('avisoVinculo', e && e.message ? e.message : e))` ao fim da
      cadeia de `carregarDisciplinasParaVinculo` (FR-002, data-model.md).
- [X] T010 [P] [US2] Em `app/(app)/admin/usuarios/page.tsx`, adicionar
      `.catch(e => mostrarAvisoNivel2('avisoUsuario', e && e.message ? e.message : e))` ao fim da
      cadeia de `carregarusuarios` (FR-002, data-model.md — container reaproveitado do formulário,
      nenhum elemento novo).
- [ ] T011 [US2] Seguir `quickstart.md` Passo 3 no navegador — recarregar a página, confirmar que,
      se uma das 4 funções falhar, aparece um banner `mostrarAvisoNivel2` no container correto,
      nunca uma janela `alert()`/`confirm()` (SC-002).

**Checkpoint**: as 4 chamadas de boot mostram aviso não-bloqueante — as 15 correções deste hotfix
completas.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Fechar o ciclo — suíte completa, verificação de sucesso inalterado, `o SHA do commit`,
documentação.

- [X] T012 Rodar `pnpm vitest run` uma última vez — confirmar suíte completa em 0
      falhas (nenhum teste novo é esperado, mudança fora do alcance de `pnpm vitest run`).
- [ ] T013 Seguir `quickstart.md` Passo 4 no navegador — repetir o fluxo normal das 15 telas/ações
      sem forçar nenhuma falha, confirmar que o comportamento de sucesso é idêntico ao de antes
      (SC-003).
- [X] T014 [P] Incrementar `o SHA do commit` nos dois lugares de sempre: `lib/supabase/server.ts` e
      `const o SHA do commit_FRONTEND` em `app/layout.tsx` — sugestão
      `2026-08-16.HOTFIX012.1`.
- [X] T015 [P] Atualizar `docs/arquitetura/02-modularizacao.md` — linhas dos 7 arquivos tocados
      (`app/(app)/avaliacoes/page.tsx`, `app/(app)/cronograma/page.tsx`, `app/(app)/cursos/[curso]/page.tsx`, `app/(app)/disciplinas/page.tsx`,
      `app/(app)/instrutores/page.tsx`, `app/(app)/relatorio/page.tsx`, `app/(app)/admin/usuarios/page.tsx`) ganham uma frase citando
      este hotfix. **Não tocar** `docs/arquitetura/04-appstate.md`/`03-design-system.md`
      (instrução permanente desta sessão).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — roda primeiro.
- **Foundational (Phase 2)**: não aplicável.
- **US1 (Phase 3)**: depende só de Setup.
- **US2 (Phase 4)**: depende só de Setup — independente de US1, exceto o cuidado de arquivo
  pontual em T008 (mesmo arquivo de T002, ver nota na própria tarefa).
- **Polish (Phase 5)**: depende de US1 e US2 completas.

### Parallel Opportunities

- T002-T006 (US1, 5 arquivos) podem rodar em paralelo entre si — arquivos distintos.
- T009/T010 (US2) podem rodar em paralelo entre si e com T002-T006 — arquivos distintos de todos
  os outros. T008 é o único ponto de cuidado (mesmo arquivo de T002) — fazer depois de T002.
- T014/T015 (Polish) podem rodar em paralelo entre si.

---

## Parallel Example: US1 (5 arquivos independentes)

```bash
Task: "T002 [P] [US1] `app/(app)/avaliacoes/page.tsx` - aoTrocarTurmaAvaliacao/carregarPainelavaliacoes"
Task: "T003 [P] [US1] `app/(app)/cronograma/page.tsx` - garantirNomesInstrutores_"
Task: "T004 [P] [US1] `app/(app)/cursos/[curso]/page.tsx` - 4 funcoes"
Task: "T005 [P] [US1] `app/(app)/disciplinas/page.tsx` - 2 funcoes"
Task: "T006 [P] [US1] `app/(app)/relatorio/page.tsx` - carregarTotalizadoresCurso"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Phase 1 (Setup).
2. Completar Phase 3 (US1 — os 11 pontos de `alert()`, o padrão mais simples e já 100% estabelecido
   no projeto).
3. **PARAR E VALIDAR**: `quickstart.md` Passos 1-2 isoladamente.
4. US1 sozinha já é implantável — cobre a maioria dos 15 pontos (11 de 15) sem esperar por US2.

### Incremental Delivery

1. Setup → US1 (MVP).
2. US2 (os 4 pontos de boot, reaproveitando containers já existentes).
3. Polish → implantar tudo junto via `o fluxo Git → Vercel` (`o SHA do commit` único para as 15 correções, mesmo padrão
   de todo hotfix anterior desta sessão).

---

## Notes

- Nenhuma tarefa deste hotfix cria arquivo novo — as 15 correções entram inteiramente nos 7
  arquivos já existentes citados em `plan.md`.
- Commit por fase concluída (US1, US2, Polish) — 3 commits esperados na implementação.
