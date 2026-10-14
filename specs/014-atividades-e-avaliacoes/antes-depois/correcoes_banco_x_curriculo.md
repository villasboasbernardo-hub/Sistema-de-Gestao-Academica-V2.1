# Antes/depois — D-5, as correções banco × currículo (§11-A)

Medido em 14/10/2026 no banco **local**, restaurado por `python -m scripts.manutencao.dado_do_remoto` a partir da
cópia **`remoto-20261014-130529.sql`** — o remoto JÁ sincronizado pela rodada do PR 3. As seis migrations do PR 4
foram aplicadas à mão, na ordem do `db push` (E-4 → E-5 → D-5 → D-6 → D-4 → D-7), cada uma numa transação.
**Por turma, nas 28 turmas: aulas, avaliações, atividades, CHD, aplicação, vista e CHT iguais antes e depois
das seis** (0 turmas com diferença).

**Aprovação de Bernardo:** [pendente]

Uma resposta **por caso** (FR-031.1). Nenhum lançamento muda de disciplina: só CH, código, nome ou status.

| Caso | Curso | Disciplina (código no banco) | Antes: código · nome · CH · status | Depois | Aulas · avaliações · turmas que apontam (intactas) |
|---|---|---|---|---|---|
| B-1 | C-Ap-FR | `44 - C-Ap-FR - III` | III · EQUIPAMENTOS DE AUXÍLIOS À NAVEGAÇÃO. · 76 · ativo | III · EQUIPAMENTOS DE AUXÍLIOS À NAVEGAÇÃO. · 75 · ativo | 14 · 0 · 1 |
| B-5 | C-Esp-ALH | `96 - C-Esp-ALH - ALH-II` | ALH-II · PUBLICAÇÕES E NORMAS. · 32 · inativo | ALH-III · PUBLICAÇÕES E NORMAS. · 32 · ativo | 0 · 0 · 1 |
| B-7 | C-Espc-FR | `55 - C-Espc-FR - HN-1104-0506` | HN-1104-0506 · FÍSICA APLICADA À HIDROGRAFIA. · 30 · ativo | FAANFR-005 · FÍSICA APLICADA AOS AUXÍLIOS À NAVEGAÇÃO. · 30 · ativo | 12 · 3 · 1 |
| B-7 | C-Espc-FR | `66 - C-Espc-FR - SN-1103-0506` | SN-1103-0506 · PRIMEIROS SOCORROS. · 40 · ativo | PSFFR-014 · PRIMEIROS SOCORROS EM FARÓIS. · 40 · ativo | 15 · 5 · 1 |
| B-6 | C-Espc-FR | `70 - C-Espc-FR - TFMFR-004` | TFMFR-004 · TFM. · 47 · ativo | TFMFR-004 · TFM. · 48 · ativo | 21 · 6 · 1 |
| B-8 | C-Espc-HN | `59 - C-Espc-HN - HN-1106-0423` | HN-1106-0423 · NAVEGAÇÃO I. · 100 · ativo | HN-1106-0423 · NAVEGAÇÃO I. · 108 · ativo | 36 · 9 · 1 |
| B-8 | C-Espc-HN | `60 - C-Espc-HN - HN-1107-1011` | HN-1107-1011 · NAVEGAÇÃO II. · 128 · ativo | HN-1107-1011 · NAVEGAÇÃO II. · 120 · ativo | 35 · 3 · 1 |
| B-2 | C-Exp-MetocOf | `86 - C-Exp-MetocOf - I` | I · METEOROLOGIA. · 48 · ativo | I · METEOROLOGIA. · 30 · ativo | 9 · 1 · 1 |
| B-3 | C-Exp-MetocOf | `90 - C-Exp-MetocOf - V` | V · ESTÁGIO PRÁTICO . · 40 · ativo | V · ESTÁGIO PRÁTICO . · 50 · ativo | 20 · 0 · 1 |

**Fora desta migration, esperando decisão (T129):**

- **B-4** — `EST-QF-APOC I`, 79 no banco × 80 nas UEs do PDF (digitalizado; 1 h de TR "embutida"). Segue como a
  única divergência de CH do catálogo (pgTAP 112).
- **B-12** — `C-Exp-Metoc-OF-SP IV` (18 TA, *"EFEITOS ATMOSFÉRICOS…"*), que não existe no currículo do SP. Proposta:
  inativar (regra 4). Nenhum lançamento aponta para ela.

Conferido no PDF nesta medição: MetocOf I = 30 e V = 50 (`c-exp-metocof_0.pdf`, p. 5 e 15); NAV I = 108 e NAV II = 120
(C-Espc-HN, p. 32 e 45); FAANFR-005 (p. 15) e PSFFR-014 (p. 80) do C-Espc-FR; ALH-III (C-Esp-ALH, p. 5 e 9).

**Resposta de Bernardo, por caso:** B-1 [pendente] · B-2 [pendente] · B-3 [pendente] · B-5 [pendente] · B-6 [pendente] ·
B-7 [pendente] · B-8 [pendente] · B-4 [pendente] · B-12 [pendente]
