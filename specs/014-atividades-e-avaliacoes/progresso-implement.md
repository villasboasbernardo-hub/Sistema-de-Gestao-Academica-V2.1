# Progresso da implementação — spec 014

| PR | Ramo | PR GitHub | CI | Tarefas | Estado |
|---|---|---|---|---|---|
| Fase 0 | `docs/EPICO-8-9-estado-atual` | [#45](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/45) | verde | 2/2 | aberto, sem merge |
| PR 1 | `db/EPICO-9-banco-da-leva-1` | [#46](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/46) | verde (três blocos) | 29/32 | aberto, sem merge |
| PR 1.1 | `db/EPICO-9-previsto-proens-por-turma` | [#47](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/47) | verde (três blocos) | 12/16 | aberto, sem merge |
| PR 2 | `feat/EPICO-9-cards-de-tetos` | [pendente] | [pendente] | 24/26 | código pronto; e2e local 7/7 duas vezes |

**Tarefa atual:** PR 2 — abrir o PR (T074) e esperar o CI.
**Abertas:** PR 1 — T004, T028, T032 (remoto), T034 (conferência). PR 1.1 — T045, T048 (remoto), T050
(conferência). PR 2 — T074 (CI) e T076 (conferência).
**Próximos passos:** PR 2.1 (`feat/EPICO-9-dsa-tipo-global-e-dia-parado`, depende do PR 1).

**Capturas de tela (fora do git):** `C:\Users\VILLAS BOAS\AppData\Local\ciaara-11\capturas-014\`.

**Banco local:** a cópia do remoto dos antes/depois é `remoto-20261014-021627.sql`
(`C:\Users\VILLAS BOAS\AppData\Local\ciaara-11\copias-do-remoto\`). Para refazer o retrato com as
migrations do ramo: `python -m scripts.provas.antes_e_depois preparar <copia> 20261008223717 <migrations…>`.
