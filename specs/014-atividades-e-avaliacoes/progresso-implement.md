# Progresso da implementação — spec 014

| PR | Ramo | PR GitHub | CI | Tarefas | Estado |
|---|---|---|---|---|---|
| Fase 0 | `docs/EPICO-8-9-estado-atual` | [#45](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/45) | verde | 2/2 | aberto, sem merge |
| PR 1 | `db/EPICO-9-banco-da-leva-1` | [#46](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/46) | verde (três blocos) | 29/32 | aberto, sem merge |
| PR 1.1 | `db/EPICO-9-previsto-proens-por-turma` | [#47](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/47) | verde (três blocos) | 12/16 | aberto, sem merge |
| PR 2 | `feat/EPICO-9-cards-de-tetos` | [#48](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/48) | [ver o PR] | 24/26 | aberto, sem merge; e2e local 7/7 duas vezes |
| PR 2.1 | `feat/EPICO-9-dsa-tipo-global-e-dia-parado` | [pendente] | [pendente] | 11/28 | **PARCIAL**: parar dia, desfazer, avaliação viva, E-8 |

**Tarefa atual:** PR 2.1 — abrir o PR parcial e esperar o CI.
**Abertas:** PR 1 — T004, T028, T032 (remoto), T034 (conferência). PR 1.1 — T045, T048 (remoto), T050
(conferência). PR 2 — T074 (CI) e T076 (conferência).
**Próximos passos (retomada):** terminar o PR 2.1 no mesmo ramo — T082 (parede da cascata), T083 e T093
(rótulos de parada, TR bloqueante e Apoio na grade, no papel e nos conflitos), T086, T089, T090 (tipos
oferecidos), T091 (tipo e global no formulário), T094 (planilha), T095 (traduções), T096 a T098 e T100
(ponta a ponta de tipo, global e impressão), T102 e T104. Depois, PR 3.

**Capturas de tela (fora do git):** `C:\Users\VILLAS BOAS\AppData\Local\ciaara-11\capturas-014\`.

**Banco local:** a cópia do remoto dos antes/depois é `remoto-20261014-021627.sql`
(`C:\Users\VILLAS BOAS\AppData\Local\ciaara-11\copias-do-remoto\`). Para refazer o retrato com as
migrations do ramo: `python -m scripts.provas.antes_e_depois preparar <copia> 20261008223717 <migrations…>`.
