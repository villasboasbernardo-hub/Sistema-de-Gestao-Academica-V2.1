# Quickstart: Módulo de Disciplinas — Cascata Limpa, Nomenclatura de Turma e Tabela Expansível

**Pré-requisitos**: deploy publicado (``git push` (a Vercel publica a preview da branch)`/`o merge na `main` (a Vercel publica em produção)`) com o `o SHA do commit` desta spec;
login com um perfil que tenha acesso ao Módulo de Disciplinas (ex. `Admin`).

## Passo 1 — Layout limpo e Visão 1 (só Curso)

1. Abrir o Módulo de Disciplinas.
2. Confirmar que não há divisão lateral — a tabela de Disciplinas ocupa a largura total, e não há
   nenhuma tabela de Avaliações Planejadas visível na tela (rolar até o final confirma que a seção
   existe no HTML mas está oculta).
3. Selecionar um curso com pelo menos 1 disciplina cadastrada (ex. `CAHO`).
4. Confirmar que a tabela mostra exatamente as colunas Código, Nome da Disciplina, Carga Horária,
   Prioridade (se o perfil puder editá-la) e Ações — nunca Técnica de Ensino Sugerida ou Local
   Padrão (data-model.md, contracts/frontend-functions.md).

**Esperado**: SC-001, SC-005.

## Passo 2 — Nomenclatura de turma e Visão 2 (Curso + Turma)

1. Com o curso `CAHO` selecionado (1 turma só em 2026), confirmar que o seletor de Turma mostra
   `"Turma 2026"` — nunca repetindo "CAHO" no label.
2. Trocar para um curso com 2 turmas no mesmo ano (ex. `C-ApA-AuxNav-PR-SP`) e confirmar que o
   seletor mostra `"Turma 01/2026"` e `"Turma 02/2026"`.
3. Selecionar uma das turmas e confirmar que a MESMA tabela (não uma tabela nova) ganha as colunas
   Data de Início, Data de Término, Instrutores Selecionados e CH Cumprida, mantendo Código/Nome/CH/
   Prioridade à esquerda.
4. Clicar em "Editar" numa linha da Visão 2 e confirmar que abre o mesmo painel de período/instrutor
   já validado na spec 030 (data + checkboxes de instrutor com busca), sem nenhuma mudança de
   comportamento.

**Esperado**: SC-002, SC-003, contracts/backend-functions.md (`app/layout.tsx` + `lib/supabase/server.ts`).

## Passo 3 — Estatísticas reativas

1. Com o painel de Estatísticas aberto (botão "Estatísticas"), selecionar um curso e anotar os
   valores dos cards.
2. Selecionar uma turma daquele curso e confirmar que os valores mudam (refletindo só a turma) —
   sem precisar fechar/reabrir o painel de Estatísticas.
3. Trocar para outro curso e confirmar que os valores mudam de novo automaticamente.

**Esperado**: SC-004, research.md §1/§2 (CH Cumprida e "Sem instrutor" corretos por escopo).

## Passo 4 — Regressão

1. `pnpm vitest run` — 0 falhas, incluindo os casos novos de
   `getEstatisticasDisciplinas(filtros)` (chamada sem argumento reproduz o resultado global de
   hoje) e de `rotuloTurma_`.
2. Confirmar que `atualizarDisciplina`/`definirPrioridadeDisciplina`/`atualizarTurmaDisciplina`
   continuam funcionando sem nenhuma mudança de mensagem de erro ou de validação (constitution
   Princípio II).

**Esperado**: SC-006.
