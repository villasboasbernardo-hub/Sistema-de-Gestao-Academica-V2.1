# Progresso da implementação — spec 014

| PR | Ramo | PR GitHub | CI | Tarefas | Estado |
|---|---|---|---|---|---|
| Fase 0 | `docs/EPICO-8-9-estado-atual` | [#45](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/45) | verde | 2/2 | aberto, sem merge |
| PR 1 | `db/EPICO-9-banco-da-leva-1` | [#46](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/46) | verde (três blocos) | 29/32 | aberto, sem merge |
| PR 1.1 | `db/EPICO-9-previsto-proens-por-turma` | [pendente] | [pendente] | 11/16 | código pronto |

**Tarefa atual:** PR 1.1 — commit, push e abertura do PR (T047).
**Abertas por PR:** PR 1 — T004 (linha de base), T028 (`verificar:tudo` duas vezes; a ponta a ponta
ficou com o CI), T032 (remoto) e T034 (conferência de Bernardo). PR 1.1 — T045 (idem T028), T047
(abrir o PR), T048 (remoto), T049 (estado no CLAUDE.md, feita junto com o PR 1) e T050 (conferência).
**Próximos passos:** PR 2 (`feat/EPICO-9-cards-de-tetos`, empilhado sobre o PR 1.1).

**Banco local:** a cópia do remoto usada nos antes/depois é `remoto-20261014-021627.sql`
(`C:\Users\VILLAS BOAS\AppData\Local\ciaara-11\copias-do-remoto\`). Para refazer o retrato com as
migrations do ramo: `python -m scripts.provas.antes_e_depois preparar <copia> 20261008223717 <migrations…>`.
