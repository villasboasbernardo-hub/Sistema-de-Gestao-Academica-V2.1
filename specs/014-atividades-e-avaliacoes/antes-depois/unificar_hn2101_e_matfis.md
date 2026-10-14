# Antes/depois — D-6, a unificação HN-2101 e MATFIS (Q-15, FR-031.5)

Medido em 14/10/2026 no banco **local**, restaurado por `python -m scripts.manutencao.dado_do_remoto` a partir da
cópia **`remoto-20261014-130529.sql`** — o remoto JÁ sincronizado pela rodada do PR 3. As seis migrations do PR 4
foram aplicadas à mão, na ordem do `db push` (E-4 → E-5 → D-5 → D-6 → D-4 → D-7), cada uma numa transação.
**Por turma, nas 28 turmas: aulas, avaliações, atividades, CHD, aplicação, vista e CHT iguais antes e depois
das seis** (0 turmas com diferença).

**Aprovação de Bernardo:** ✅ 14/10/2026 (A4.3)

## As disciplinas

| Disciplina | Antes: código · nome · CH · status · UEs (Σ) · aulas · avaliações · turmas · habilitações | Depois |
|---|---|---|
| `23 - C-Ap-HN - I` | I · MATEMÁTICA APLICADA À HIDROGRAFIA. · 105 · ativo · 6 (105) · 38 · 10 · 1 · 4 | I · MATEMÁTICA E FÍSICA APLICADAS À HIDROGRAFIA. · 126 · ativo · 7 (126) · 43 · 12 · 1 · 4 |
| `24 - C-Ap-HN - I-I` | I-I · FÍSICA APLICADA À HIDROGRAFIA. · 21 · ativo · 1 (21) · 5 · 2 · 1 · 1 | I-I · FÍSICA APLICADA À HIDROGRAFIA. · 21 · inativo · 0 (0) · 0 · 0 · 0 · 0 |
| `1 - CAHO - MAT` | MAT · NIVELAMENTO DE MATEMÁTICA. · 28 · ativo · 1 (28) · 0 · 3 · 1 · 1 | MATFIS · NIVELAMENTO DE MATEMÁTICA E FÍSICA. · 56 · ativo · 2 (56) · 0 · 6 · 1 · 1 |
| `2 - CAHO - FIS` | FIS · NIVELAMENTO DE FÍSICA. · 28 · ativo · 1 (28) · 0 · 3 · 1 · 0 | FIS · NIVELAMENTO DE FÍSICA. · 28 · inativo · 0 (0) · 0 · 0 · 0 · 0 |

`cod_disciplina` da C-Ap-HN fica **`I`** (é a chave da planilha e da grade; decisão D4.1); o nome e a CH passam aos
do currículo (`HN-2101-0621`, 126). A do CAHO vira **`MATFIS`** (56), como no currículo e na T152.

## Por turma — nenhum lançamento perdido

| Turma | antes: aulas · avaliações · atividades · CHD | depois |
|---|---|---|
| CAHO 2026 | 806 · 104 · 307 · 1355 | 806 · 104 · 307 · 1355 |
| C-Ap-HN 2026 | 548 · 56 · 107 · 953 | 548 · 56 · 107 · 953 |

## A `turma_disciplina` e as duas listas de instrutores (decisão D-2 do plan)

| Turma | Unificada (fica) | Extra (inativada) | Instrutores antes | Depois (união) |
|---|---|---|---|---|
| C-Ap-HN 2026 | `TDI-000023` (I), 06/04–19/06/2026 | `TDI-000024` (I-I), 06/04–19/06/2026 | I: 37, 89 · I-I: 173 | 37, 89, 173 (o 173 entra com `ch_prevista_tempos` nula = rateio igual) |
| CAHO 2026 | `TDI-000001` (MAT), 05/01–06/02/2026 | `TDI-000002` (FIS), 05/01–06/02/2026 | MAT: 89, 173 · FIS: 173 | 89, 173 (ninguém novo) |

O período da unificada é a união (menor início, maior término) e passa a `manual`. Os instrutores vão pelo **código**
(repositório público).

As linhas históricas ativas reapontadas **preservam `editado_em` nulo** (D-UNIF-1): os gatilhos de auditoria ficam
desligados só dentro da transação da D-6. O mapa `id antigo → id novo` e as contagens estão em `migracao_log`
(`MLOG-014-D6-…`), com o evento de referência por turma (antes = depois).

**Resposta de Bernardo:** ✅ aprovado, 14/10/2026
