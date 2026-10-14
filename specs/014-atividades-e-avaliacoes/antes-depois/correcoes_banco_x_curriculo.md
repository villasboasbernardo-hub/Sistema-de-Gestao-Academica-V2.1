# Antes/depois — D-5, as correções banco × currículo (§11-A)

Medido em 14/10/2026 no banco **local**, restaurado por `python -m scripts.manutencao.dado_do_remoto` a partir da
cópia **`remoto-20261014-130529.sql`** — o remoto JÁ sincronizado pela rodada do PR 3. As seis migrations do PR 4
foram aplicadas à mão, na ordem do `db push` (E-4 → E-5 → D-5 → D-6 → D-4 → D-7), cada uma numa transação.
**Por turma, nas 28 turmas: aulas, avaliações, atividades, CHD, aplicação, vista e CHT iguais antes e depois
das seis** (0 turmas com diferença).

**Aprovação de Bernardo:** ✅ 14/10/2026 (A4.2)

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

**Conferidos no PDF depois da aprovação (A4.2, 14/10/2026):**

- **B-12 — CONFIRMADA e INCLUÍDA.** O currículo do C-Exp-Metoc-OF-SP tem **quatro** disciplinas: I Meteorologia (p. 7),
  II Técnicas de Previsão do Tempo (p. 10), III Oceanografia (p. 12) e IV Estágio Prático (p. 15) — **índice, p. 2** de
  `of-10-16-2025-densm-ciaara-an-c-exp-metoc-sp-512.2.01.pdf`. A disciplina do banco
  `89 - C-Exp-Metoc-OF-SP - IV` *"EFEITOS ATMOSFÉRICOS SOBRE A PROPAGAÇÃO ELETROMAGNÉTICA / C-Exp-METOC-OF"* (18 TA)
  não existe nele: é **inativada**, com a linha da grade da turma, e **nenhum lançamento** aponta para ela (a migration
  confere e aborta se houver).
- **B-4 — NÃO confirmada, FICA FORA.** No PDF do EST-QF-APOC (digitalizado, lido da imagem), a disciplina I tem
  **79 horas** — *"3) DISCIPLINA E CARGA HORÁRIA … 79 HORAS"* (**p. 4**) e *"CÓDIGO: I · CARGA HORÁRIA: 79 HORAS"*
  (**p. 5**) —, que é o que o banco tem. Quem soma 80 são as UEs (9 + 18 + 9 + 20 + 24, **p. 5 e 6**); a hora a mais é
  o *"TEMPO RESERVA … 1 HORA"* do quadro de aprovação (**p. 4**). Não há correção de CH a fazer; a divergência é interna
  ao currículo, e a UE 5 (24 h) é que carrega a hora de TR.

**Resposta de Bernardo, por caso:** B-1 ✅ · B-2 ✅ · B-3 ✅ · B-5 ✅ · B-6 ✅ ·
B-7 ✅ · B-8 ✅ · B-12 ✅ (conferida no PDF) · B-4 fora (o PDF não confirma)
