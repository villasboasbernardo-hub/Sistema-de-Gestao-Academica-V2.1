# Progresso da implementação — spec 014

| PR | Ramo | PR GitHub | CI | Tarefas | Estado |
|---|---|---|---|---|---|
| Fase 0 | `docs/EPICO-8-9-estado-atual` | [#45](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/45) | verde | 2/2 | ✅ **mesclado** em `154e89f` (14/10/2026) |
| PR 1 | `db/EPICO-9-banco-da-leva-1` | [#46](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/46) | verde (três blocos) | 29/32 | ✅ **no remoto** (backup `remoto-20261014-082019.sql`) e **mesclado** em `bc0b796` |
| PR 1.1 | `db/EPICO-9-previsto-proens-por-turma` | [#47](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/47) | verde (três blocos) | 14/16 | ✅ **no remoto** (backup `remoto-20261014-082202.sql`) e **mesclado** em `544d621` |
| PR 2 | `feat/EPICO-9-cards-de-tetos` | [#48](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/48) | verde (três blocos) | 25/26 | ✅ **mesclado** em `1f64cbc` |
| PR 2.1 | `feat/EPICO-9-dsa-tipo-global-e-dia-parado` | [#49](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/49) | verde (três blocos) | 27/28 | ✅ **mesclado** em `d4add3a` (14/10/2026), conferência aprovada |
| PR 3 | `feat/EPICO-9-carga-da-leva-1` | [#50](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/50) | verde (`68d492e`) | 18/19 | ✅ **rodada no remoto** em 14/10/2026 (backup `remoto-20261014-124318.sql`, dados iguais local × remoto) e **mesclado** em `91ed061`; deploy de Production `success` |
| PR 4 | `db/EPICO-8-banco-da-leva-2` | [#51](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/51) | verde (`24a7c69`, run `38605247216`) | 27/40 | ✅ **no remoto** em 14/10/2026 (backup `remoto-20261014-144657.sql`; 69 e 69; `129d83d4…`, 1.904 objetos, igual; dado idêntico ao ensaio) e **mesclado** em `4180de9` |
| PR 5 | `feat/EPICO-8-avaliacoes-nas-telas` | [#52](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/52) (rascunho, sobre a `main`) | [pendente] | 21/35 | abas da turma (`?aba=`), card → aba, ações do arbitrado, aba Avaliações do curso, alertas de vista no `/inicio` e na ficha; faltam o painel de `/disciplinas` (T183), as guardas T184–T186 e a ponta a ponta |

**Remoto (14/10/2026, depois do PR 4):** 69 e 69 migrations; impressão digital `129d83d4…`, 1.904 objetos,
igual no local e no remoto. Registro em `plano-de-aplicacao-no-remoto.md`.

**Tarefa atual:** PR 5 (#52) — painel de `/disciplinas`, guardas e ponta a ponta; depois PR 5.1 e PR 6.
**Abertas:** PR 1 — T004, T034 (conferência). PR 1.1 — T050 (conferência). PR 2 — T076 (conferência no
preview). PR 3 — T123 (conferência sobre o remoto sincronizado); portão A3.6 (classificação dos 43 textos de responsável).
**Próximos passos (retomada):** PR 4 — só a T163 (roteiro de conferência); PR 5 → PR 5.1 → PR 6.

**Capturas de tela (fora do git):** `C:\Users\VILLAS BOAS\AppData\Local\ciaara-11\capturas-014\`.

**Banco local:** o retrato do remoto mais recente é `remoto-20261014-122503.sql` (antes da rodada do PR 3 no
remoto, depois sincronizado igual a ele); o anterior era `remoto-20261014-085612.sql`
(`C:\Users\VILLAS BOAS\AppData\Local\ciaara-11\copias-do-remoto\`), restaurado por `dado_do_remoto`; a
rodada do PR 3 foi medida sobre ele. Os antes/depois do PR 1 e 1.1 usaram `remoto-20261014-021627.sql`.
Para as suítes de ponta a ponta, `pnpm db:reset:limpo` antes (a cópia do remoto quebra a semente do DSA).
