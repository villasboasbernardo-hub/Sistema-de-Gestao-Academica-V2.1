# Contrato — Funções de backend (Hotfix: Polimento de UI/UX, Gráficos e Regra Global de Nomenclatura de Cursos)

## `lib/acoes/instrutores.ts`

### `reativarInstrutor(idInstrutor)` (NOVA)

- **Assinatura**: `function reativarInstrutor(idInstrutor)`.
- **Comportamento**: `return crudAtualizar('instrutores', idInstrutor, {Status: 'Ativo'});` —
  mesmo motor genérico já usado por `atualizarInstrutor` e `sincronizarDisciplinasInstrutor`. Grava
  exclusivamente a coluna `Status`; nenhum outro campo do instrutor é lido ou escrito.
- **Autorização**: herdada de `crudAtualizar` → `CRUD_CONFIG['instrutores'].escrita` (mesmo
  conjunto de perfis já autorizados a editar/desativar um instrutor, RF-INSTR-12) — nenhuma mudança
  de permissão introduzida.
- **Efeitos colaterais explicitamente ausentes**: não recalcula `Antiguidade_Declarada` (não depende
  de `Status`), não grava `Editado_Por`/`Timestamp_Edicao` além do que `crudAtualizar` já grava
  genericamente para qualquer campo alterado, não move nem apaga nenhuma linha (Princípio IV/C-05).
- **Regras**: FR-009; research.md §3.

Nenhuma outra função de backend é criada, removida ou tem assinatura alterada por esta spec — os
gráficos, o texto de disciplinas habilitadas e a regra de siglas de curso operam inteiramente sobre
dados já entregues ao cliente no boot (`AppState.ctx.cursos`, `listarInstrutores`), sem nenhuma nova
leitura de planilha.
