# Phase 0 Research: Módulo de Disciplinas — Cascata e Edição por Turma

## 1. Fonte do seletor de Turma — reaproveitar `AppState.ctx.turmas`, sem chamada nova

**Decisão**: `popularTurmasDisciplinas_(idCurso)` filtra `AppState.ctx.turmas` (já carregado no
boot, ``app/layout.tsx` + `lib/supabase/server.ts`:73-86`, cada turma já com `idTurma`, `idCurso`, `nome`, `status`, `dataInicio`,
`dataTermino`) por `idCurso` — nenhuma chamada a Server Action nova para popular o seletor.

**Rationale**: A janela da turma (`dataInicio`/`dataTermino`) é exatamente o que a validação
client-side (FR-006/007) precisa, e já está em memória — evita uma segunda fonte de verdade
(`crudListar('turmas')` traria os mesmos dados de novo, com nomes de campo diferentes,
gerando risco de divergência). Mesmo padrão já usado por `app/(app)/cursos/[curso]/page.tsx`
(`(AppState.ctx.turmas || []).filter(t => t.idCurso === idCurso)`).

**Alternatives considered**: `gs('crudListar', 'turmas')` — rejeitado, redundante com dado
já carregado, e usaria nomes de campo brutos (`ID_Turma`/`Data_Inicio`) diferentes da forma já
normalizada de `AppState.ctx.turmas`, criando 2 convenções para o mesmo dado na mesma tela.

## 2. Localização da seção nova — aditiva, abaixo da edição de grade existente

**Decisão**: A cascata Curso→Turma + tabela + painel de edição é uma seção nova, renderizada
**abaixo** do bloco `row mb-4` já existente (edição de grade), dentro do mesmo `<div>` de topo já
gated por `#discCursoSelecao` — visível assim que um curso é selecionado (o seletor de Turma
aparece), mas a tabela/painel só depois da turma escolhida (FR-001/FR-002).

**Rationale**: Decisão direta de `/speckit-clarify` (Clarifications 2026-08-20, FR-002.1) — a
edição de grade fica intocada, a seção nova é aditiva.

**Alternatives considered**: Abas alternáveis (grade vs. turma) — era a Opção C do `/speckit-
clarify`, não escolhida; substituir a tela inteira — Opção B, rejeitada explicitamente.

## 3. Busca de instrutor — replicar o padrão da spec 019, direção nova

**Decisão**: `filtrarInstrutoresEdicaoDisciplina_()` — mesmo padrão de UX de
`filtrarPainelDisciplinasInstrutor_` (`app/(app)/instrutores/page.tsx`, spec 019: filtra por `data-busca-*`
em tempo real, sem chamada de rede), aplicado aos checkboxes de instrutor→disciplina que a spec
029 introduziu (`checkboxesInstrutor_`, `app/(app)/cursos/[curso]/page.tsx`) — que hoje não têm busca.

**Rationale**: Reaproveitar o *padrão* já validado (não há função para importar entre 2 arquivos
`.html` diferentes no Next.js — cada a importação de componentes é independente) evita reinventar a UX de busca
com um comportamento diferente do resto do projeto.

**Alternatives considered**: Componente de multi-select de terceiros (ex. Select2/Choices.js) —
rejeitado, introduziria dependência nova (Princípio III, RNF-PLAT-01..04); checkbox sem busca
(como `app/(app)/cursos/[curso]/page.tsx` hoje) — rejeitado, o próprio pedido original pede busca explicitamente e
cursos maiores podem ter dezenas de instrutores habilitados.

## 4. Validação client-side como espelho funcional de `intervaloContidoEm_`

**Decisão**: `intervaloContidoEmClient_(inicioA, fimA, inicioB, fimB)` — mesma lógica exata de
`intervaloContidoEm_` (`lib/acoes/liq.ts`, spec 029: contenção total, degrada para `true`/permite quando
qualquer janela está incompleta), reimplementada em JavaScript puro no frontend. Chamada antes de
`gs('atualizarTurmaDisciplina', ...)` — bloqueia com `alert()` citando os limites reais da turma
sem nenhuma chamada de rede se a validação falhar (FR-006).

**Rationale**: Não existe forma de compartilhar código entre `.ts` (backend) e `.html` (frontend)
neste projeto (Next.js não tem módulo importável entre os dois runtimes) — replicar a mesma
lógica pura (poucas linhas, sem estado) é o único caminho, mesma situação já enfrentada por
`calcularAntiguidadeDeclarada_` (existe em cópia client-side e server-side, `lib/acoes/instrutores.ts`/
`app/(app)/instrutores/page.tsx`, com o servidor sempre como fonte de verdade final).

**Alternatives considered**: Só validar no servidor, sem cópia client-side — rejeitado
explicitamente pelo pedido original ("VALIDAÇÃO CLIENT-SIDE (Crucial)"); chamar o backend a cada
mudança de data só para validar (sem salvar) — rejeitado, adicionaria round-trips desnecessários
quando a mesma lógica cabe em poucas linhas de JS puro.
