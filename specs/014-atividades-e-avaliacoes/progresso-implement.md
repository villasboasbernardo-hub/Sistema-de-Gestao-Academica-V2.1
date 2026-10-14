# Progresso da implementação — spec 014

| PR | Ramo | PR GitHub | CI | Tarefas | Estado |
|---|---|---|---|---|---|
| Fase 0 | `docs/EPICO-8-9-estado-atual` | [#45](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/45) | [pendente] | 2/2 | aberto, sem merge |
| PR 1 | `db/EPICO-9-banco-da-leva-1` | [pendente] | [pendente] | 28/32 | código pronto; falta abrir o PR e o CI |

**Tarefa atual:** PR 1 — commit, push e abertura do PR (T031).
**Abertas no PR 1:** T004 (linha de base com `verificar:tudo` da `main`), T028 (o `verificar:tudo`
duas vezes seguidas — o ponta a ponta fica com o CI), T031 (abrir o PR) e T032 (remoto, proibido na
noite).
**Próximos passos:** PR 1.1 (`db/EPICO-9-previsto-proens-por-turma`, empilhado sobre o PR 1).

**Banco local:** a cópia do remoto usada nos antes/depois é `remoto-20261014-021627.sql`
(`C:\Users\VILLAS BOAS\AppData\Local\ciaara-11\copias-do-remoto\`). Para recriá-la:
`python -m scripts.manutencao.dado_do_remoto` gera uma cópia NOVA; para reaproveitar a mesma, restaurar
o arquivo citado.
