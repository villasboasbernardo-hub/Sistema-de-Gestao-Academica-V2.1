# Quickstart — Validação Manual: Instrutor por Turma + Janela

Pré-requisitos: migração `adicionar_instrutor_turma_disciplina.py` aplicada à banco de produção,
deploy publicado.

## Passo 1 — Seleção de instrutor por turma (US1)

1. Página do Curso, abrir um curso com 2 turmas no mesmo ano (ex. `C-ApA-AuxNav-PR-SP`, T1/T2 —
   mesmo caso real usado para validar a spec 027).
2. Abrir "Período das Disciplinas" da turma T1, marcar um instrutor habilitado para uma disciplina,
   salvar.
3. Abrir "Período das Disciplinas" da turma T2 (mesmo curso, mesma disciplina), marcar um instrutor
   **diferente**, salvar.
4. **Esperado**: reabrir os 2 painéis confirma que cada turma manteve sua própria seleção — nenhuma
   sobrescreveu a outra, e `disciplinas.ID_Instrutor` da grade permanece com o valor original.

## Passo 2 — Bloqueio de janela (US2)

1. Na mesma tela, tentar salvar `Previsao_Inicio` de uma disciplina com uma data **anterior** a
   `Data_Inicio` da turma.
2. **Esperado**: bloqueado, mensagem cita os limites reais da turma. Nada gravado (reabrir o
   painel confirma que o valor antigo permanece).
3. Corrigir para uma data dentro da janela, salvar de novo — **esperado**: aceito normalmente.

## Passo 3 — Casos vazios

1. Abrir uma disciplina sem nenhum instrutor habilitado (`instrutor_disciplina` vazio para aquele
   `ID_Grade`).
2. **Esperado**: mensagem informativa no lugar da lista de checkboxes, nunca erro.

## Passo 4 — Suíte automatizada

```
pnpm vitest run tests/unidade/*.test.ts
```

**Esperado**: 0 falhas (342 testes anteriores à spec 029 + os casos novos de
`intervaloContidoEm_`/`atualizarTurmaDisciplina`).
