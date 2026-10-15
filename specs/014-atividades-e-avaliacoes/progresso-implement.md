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
| PR 5 | `feat/EPICO-8-avaliacoes-nas-telas` | [#52](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/52) | verde (`1fa3a6b`) | 34/35 | ✅ **trilha do arbitrado no remoto** (backup `remoto-20261014-201119.sql`; 70 e 70; `19d845f0…`, 1.935 objetos, igual) e **mesclado** em `cd27abd`; deploy `success`; falta a conferência (T198) e a T189 |
| PR 5.1 | `feat/EPICO-8-dsa-itens-sessoes-e-papeis` | [#53](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/53) | verde (`b657d24`) | 21/23 | ✅ **mesclado** em `eacde13`; deploy `success`; falta a conferência (T221), a T208/T212/T213 em parte e a T218 |
| PR 6 | `feat/EPICO-8-carga-da-leva-2` | [#54](https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1/pull/54) | verde (`44cdf2d`) | 13/14 | ✅ **mesclado** em `1807007`; deploy `success`; **A6.1 e rodada no remoto** em 14/10/2026 (backup `remoto-20261014-205951.sql`; plano = local; 2ª rodada 0; dados iguais); falta a conferência (T235) |
| Fechamento (local) | `feat/EPICO-8-fechamento-da-spec-014` | [pendente: nº do PR em rascunho] | [pendente] | T189, T208, T212, T218 ✅; T213 com proposta | 🟨 **rascunho**, só local: a T189 e o resto do PR 5.1 (com um defeito de tela consertado), a conta das 187, a planilha e o gerador da A4.7, o roteiro único de Production, as listas por turma e a T236/T237 preparadas |

**Remoto (14/10/2026, depois do PR 5 e da rodada do PR 6):** 70 e 70 migrations; impressão digital `19d845f0…`,
1.935 objetos, igual no local e no remoto. Registro em `plano-de-aplicacao-no-remoto.md`.

**Tarefa atual (15/10/2026):** o fechamento da spec, só no local (ramo `feat/EPICO-8-fechamento-da-spec-014`, PR em
rascunho). **Esperam Bernardo:** (1) a conferência em Production pelo `roteiro-de-conferencia-producao.md` (só leitura);
(2) a A4.7, pela planilha `planilhas-de-origem/rodadas/2026-10-14T1916/a47-decisao.xlsx` (fora do git); (3) as propostas
de cancelamento da T213 (situação na planilha) e de três itens da T189 sem tela (`aprovacoes-pendentes.md`, 15/10/2026).
Com as duas primeiras, rodam a T236 (`fechamento.md`, preparado) e a T237 (`fechamento-claude-md.md`, preparado).

**Feito em 15/10/2026, só local:**
- **T189** — `tests/e2e/avaliacoes-da-turma.spec.ts`, 5 casos, verde duas vezes seguidas (12 de 12 com os outros dois
  arquivos de avaliação).
- **T208/T212/T218** — o 2º nome em aula e atividade, o fiscal de fora e o papel, no caso único de
  `dsa-avaliacao-item.spec.ts`. ⚠️ **Defeito achado e consertado**: na atividade sem instrutor do cadastro, os demais
  instrutores sumiam da grade e do papel (`consulta.ts` juntava os demais a um 1º nulo antes de cair no responsável de
  fora). Caso de unidade novo em `fato-da-ocupacao.test.ts`, que reprova antes do conserto.
- **A conta das 187** — `medicoes/conta-das-187.md`, por `scripts/provas/conta_das_provas_da_rodada.py`.
- **A4.7** — `scripts/etl/decisao_a47.py` (planilha de decisão e gerador da migration, sem aplicar).
- **Listas por turma** — `planilhas-de-origem/rodadas/2026-10-14T1916/erros-por-turma/` (fora do git), CAHO primeiro.
**Abertas:** PR 1 — T004, T034 (conferência). PR 1.1 — T050 (conferência). PR 2 — T076 (conferência no
preview). PR 3 — T123 (conferência sobre o remoto sincronizado); portão A3.6 (classificação dos 43 textos de responsável).
**Próximos passos (retomada):** esperar as palavras de Bernardo (acima); então, A4.7 (gerar a migration pela planilha
preenchida, mostrar o antes/depois, rito no remoto), T236 e T237.

**Capturas de tela (fora do git):** `C:\Users\VILLAS BOAS\AppData\Local\ciaara-11\capturas-014\`.

**Banco local:** o retrato do remoto mais recente é `remoto-20261014-122503.sql` (antes da rodada do PR 3 no
remoto, depois sincronizado igual a ele); o anterior era `remoto-20261014-085612.sql`
(`C:\Users\VILLAS BOAS\AppData\Local\ciaara-11\copias-do-remoto\`), restaurado por `dado_do_remoto`; a
rodada do PR 3 foi medida sobre ele. Os antes/depois do PR 1 e 1.1 usaram `remoto-20261014-021627.sql`.
Para as suítes de ponta a ponta, `pnpm db:reset:limpo` antes (a cópia do remoto quebra a semente do DSA).
