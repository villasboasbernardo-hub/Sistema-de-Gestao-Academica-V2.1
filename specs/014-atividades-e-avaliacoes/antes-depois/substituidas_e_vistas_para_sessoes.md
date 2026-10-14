# Antes/depois — D-7, as substituídas, as vistas em sessão e o 2º instrutor

Medido em 14/10/2026 no banco **local**, restaurado por `python -m scripts.manutencao.dado_do_remoto` a partir da
cópia **`remoto-20261014-130529.sql`** — o remoto JÁ sincronizado pela rodada do PR 3. As seis migrations do PR 4
foram aplicadas à mão, na ordem do `db push` (E-4 → E-5 → D-5 → D-6 → D-4 → D-7), cada uma numa transação.
**Por turma, nas 28 turmas: aulas, avaliações, atividades, CHD, aplicação, vista e CHT iguais antes e depois
das seis** (0 turmas com diferença).

**Aprovação de Bernardo:** [pendente]

Três blocos, cada um com resposta própria (FR-041, FR-046, FR-047, FR-049).

## D-7 — as substituídas pela planilha

| | Antes | Depois |
|---|---|---|
| Avaliações com a marca «[SUBSTITUIDO PELA PLANILHA DE CONTROLE]» | 188, em `cancelada` | 188, em `substituida_pela_planilha` |
| Status anterior lido do parêntese | concluida 165, em_andamento 16, pendente 7 | o mesmo, em `status_anterior` |
| Vivas (`pendente`) | 192 | 192 |
| Canceladas SEM a marca (não tocadas, FR-049) | 4 | 4, as mesmas |
| Marcadas com TA sem tempos (`aval_ta_coerente`) | 1 | aceita pela catraca da substituída histórica |

As canceladas sem marca são `DSAP-C-EXP-OBS-ME-2026-L206-V`, `DSAP-C-AP-HN-2026-L1555-V`, `DSAP-C-AP-FR-2026-L1531-V`, `DSAP-C-ESPC-FR-2026-L2320-V`. A `L206-V` (PEND-DSA-VISTA) continua cancelada,
intocada; as outras três saíram da planilha («[SAIU DA PLANILHA DE CONTROLE]») e também ficam como estão.

**Resposta:** [pendente]

## D-7b — as vistas viram a sessão 1

| | Antes | Depois |
|---|---|---|
| Avaliações com vista na coluna única | 241 | 241 |
| Sessões 1 ativas | 0 | 241 |
| CHD, aplicação e vista por turma | — | **iguais** antes e depois (a E-5 lê as sessões; sem a D-7b, a vista sairia da CHD) |

⚠️ Anda junto da E-5: recusado, saem do `db push` a E-5 e a D-7.

**Resposta:** [pendente]

## D-8 — o 2º instrutor das aulas

| | Antes | Depois |
|---|---|---|
| Aulas com «Demais instrutores: …» em `observacoes` | 16 | 1 |
| Aulas com o vetor `outros_instrutores` (por código) | 0 | 15 |

As 15 casaram pelo nome de guerra com UM instrutor do cadastro. **Uma não casou**
(`DSAP-C-ESPC-HN-2026-L1582-A`): o texto fica em `observacoes`, sem vetor — a migration não inventa. O texto antigo
de cada uma está em `migracao_log` (`MLOG-014-D8-…`), para a volta.

**Resposta:** [pendente]
