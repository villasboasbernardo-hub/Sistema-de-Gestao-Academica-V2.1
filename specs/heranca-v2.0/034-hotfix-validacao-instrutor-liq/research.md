# Research: Hotfix — Validação da LIQ Passa a Reconhecer o Instrutor Realmente Selecionado por Turma

## 1. Critério de "instrutor atribuído": presença, não integridade referencial

**Decisão**: `FR-001`/`FR-003` verificam só `String(td['ID_Instrutor'] || '').trim().length > 0`
(há pelo menos 1 ID não vazio) — não validam se o(s) ID(s) correspondem a um `instrutores` real
nem se estão habilitados (`instrutor_disciplina`) para aquele `ID_Grade`.

**Rationale**: A habilitação já é garantida no momento da seleção pela própria UI do módulo de
disciplinas — os checkboxes de instrutor em `app/(app)/cursos/[curso]/page.tsx`/`app/(app)/disciplinas/page.tsx` (specs 029-032)
já são filtrados por `instrutor_disciplina`/`instrutoresElegiveis_`, então um `ID_Instrutor`
presente em `turma_disciplina` **normalmente** já passou por essa checagem no momento em que foi
selecionado. Reforçar a checagem de habilitação aqui, no momento de gerar a LIQ, duplicaria uma
validação que já acontece no ponto de escrita — e é exatamente essa duplicação (checar qualificação
num dado que já é sobre seleção) que causa o bug real confirmado (achado da investigação de
premissa).

**Alternatives considered**: Exigir que o `ID_Instrutor` selecionado TAMBÉM tenha um vínculo ativo
em `instrutor_disciplina` para aquele `ID_Grade` (validação dupla) — rejeitado: é exatamente o
comportamento atual que causa o bug (LHFC com `ID_Instrutor='40'`, sem vínculo para aquele grade
específico, continuaria bloqueado). Validar que o `ID_Instrutor` resolve a um `instrutores` real
— rejeitado por escopo: um ID órfão já degrada silenciosamente na Seção 2 (FR-005, RN-DEG-01);
adicionar uma segunda checagem de integridade referencial na validação de bloqueio não foi pedido
nem tem evidência de necessidade.

## 2. Onde a mudança acontece — 2 funções, mesmo arquivo, sem função nova

**Decisão**: Ajustar `validarLiq_` e `montarDadosSecao2Liq_` diretamente (contracts/
backend-functions.md) — sem extrair uma função auxiliar nova, já que a lógica ("ler `ID_Instrutor`
de uma linha de `turma_disciplina`, splitar por vírgula, filtrar vazios") é simples o bastante para
não justificar uma abstração nova nesta correção pontual (constitution Princípio VI).

**Rationale**: As duas funções já leem `turma_disciplina` para outros fins (janela de período,
`Nome_Disciplina`) — adicionar a leitura de `ID_Instrutor` na mesma iteração é aditivo e direto,
sem necessidade de uma terceira leitura de aba nem de uma função pura nova.

**Alternatives considered**: Extrair uma função pura `instrutoresSelecionadosDaLinha_(td)` —
avaliado, mas a lógica de parse (`split(',').map(trim).filter(Boolean)`) já é usada inline em pelo
menos 4 outros pontos do projeto (`resumoInstrutoresCompacto_`, `salvarPeriodoTurmaClick_`, etc.)
sem nenhuma abstração compartilhada entre arquivos `.ts` — não há precedente de extrair isso, e
`lib/acoes/liq.ts` só precisa dela nestes 2 lugares.

## 3. Impacto na leitura de `instrutor_disciplina`

**Decisão**: `validarLiq_` e `montarDadosSecao2Liq_` deixam de ler `'instrutor_disciplina'` por
completo. `montarDadosSecao1Liq_` continua lendo normalmente (Seção 1, roster geral de
qualificação, fora de escopo).

**Rationale**: Nenhuma das duas funções corrigidas precisa mais desse dado — era exatamente a fonte
errada sendo consultada (achado central desta spec). Remover a leitura é limpeza direta, não uma
mudança de escopo adicional.
