# Quickstart — Validação Manual: Cascata e Edição por Turma no Módulo de Disciplinas

Pré-requisitos: deploy publicado.

## Passo 1 — Cascata + edição de grade preservada (US1 + FR-002.1)

1. Abrir o Módulo de Disciplinas — confirmar que a tela de edição de grade (Carga Horária/Técnica
   de Ensino/Local Padrão) aparece exatamente como sempre, sem nenhuma mudança visual.
2. Escolher um curso com 2 turmas no mesmo ano (ex. `C-ApA-AuxNav-PR-SP`).
3. **Esperado**: a edição de grade continua funcionando normalmente (Passo 1.1 confirmado); um
   seletor de Turma novo aparece, contendo só T1/T2 daquele curso; a tabela por turma ainda não
   aparece.
4. Escolher a turma T1 — confirmar que a tabela mostra só as disciplinas de `turma_disciplina`
   daquela turma, com Início/Término/Instrutores Selecionados preenchidos.
5. Trocar para T2 — confirmar que a tabela muda para as disciplinas de T2 (podem ser as mesmas
   disciplinas do curso, mas com período/instrutor potencialmente diferentes — mesmo cenário
   validado na spec 029).

## Passo 2 — Edição com busca e bloqueio client-side (US2)

1. Clicar "Editar" numa disciplina da tabela — confirmar que o painel abre com as datas
   pré-preenchidas e os checkboxes dos instrutores habilitados, pré-marcados conforme a seleção
   atual.
2. Digitar na busca — confirmar que a lista de checkboxes filtra em tempo real.
3. Alterar a data de término para uma data **fora** da janela da turma, clicar Salvar.
4. **Esperado**: bloqueado imediatamente (sem esperar resposta de rede — pode confirmar observando
   que nenhuma requisição nova aparece nas ferramentas de desenvolvedor do navegador), alerta cita
   os limites reais da turma.
5. Corrigir para uma data dentro da janela, marcar/desmarcar 1 instrutor, salvar de novo.
6. **Esperado**: aceito, painel fecha, a linha da tabela reflete o novo período e o resumo de
   instrutores atualizado.

## Passo 3 — Casos vazios

1. Escolher um curso sem nenhuma turma — confirmar mensagem informativa no seletor de Turma, nunca
   erro.
2. Escolher uma turma sem nenhuma disciplina em `turma_disciplina` — tabela vazia com mensagem.
3. Editar uma disciplina sem nenhum instrutor habilitado — mensagem no lugar dos checkboxes.

## Passo 4 — Suíte automatizada

```
pnpm vitest run tests/unidade/*.test.ts
```

**Esperado**: 0 falhas (354 testes anteriores à spec 030 — nenhum caso novo, mudança é só de UI
sem harness de mock disponível, mesmo padrão de toda spec de frontend puro desta sessão).
