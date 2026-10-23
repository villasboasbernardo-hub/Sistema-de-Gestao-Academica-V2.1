# Antes e depois — spec 023 (Bloco 8)

Cópia do remoto: **`remoto-20261022-220721.sql`** (22/10/2026), restaurada no banco local por
`python -m scripts.manutencao.dado_do_remoto` com as migrations da `main` `9d4c3b9` (sem a M1 e a M2).

## Medida 1 — `vw_dias_parados_turma` antes × depois da M2 (SC-005)

Instrumento: `md5` de todas as linhas da view, ordenadas por turma e tipo (`turma_id|tipo|dias|tempos`).

| | Linhas | md5 |
|---|---|---|
| antes (migrations da `main`) | 22 | `d14ba5b32bf8a022e76d77978a43e0b4` |
| depois (M1 + M2 aplicadas por cima, no mesmo banco) | 22 | `d14ba5b32bf8a022e76d77978a43e0b4` |

`reloptions` depois: `{security_invoker=true}`.

## Medida 2 — o feriado de 28/10/2026 (item 3)

**Achado:** na cópia, o feriado de 28/10 é o `FER-000024` (*"Dia do Servidor Público federal (ponto facultativo)"*,
do ETL, `Calendario_Feriados:FER-000024`), e ele **já está inativo**: `editado_em = 2026-10-22 12:30:07 UTC` e
`editado_por` **nulo** — inativado **sem sessão**, fora da tela (nenhuma ação do sistema grava sem sessão). Depois disso
já há lançamento no dia (`DSA-MVJIU9IV-A`, aula; `DSA-MVJI7JOB-V`, avaliação). O efeito abaixo compara o feriado
**ativo** (como estava) × **inativo** (como está).

### 2a. Contagem de paradas da ficha (`vw_dias_parados_turma`, tipo FR)

Medido ativando o `FER-000024` no banco local e voltando-o a inativo em seguida.

| Turma | Dias (ativo → inativo) | Tempos (ativo → inativo) |
|---|---|---|
| C-Ap-FR 2026 | 15 → 14 | 128 → 120 |
| C-Ap-HN 2026 | 15 → 14 | 128 → 120 |
| C-ApA-AuxNav-PR-SP T2 2026 | 1 → 0 | 8 → 0 |
| C-Espc-FR 2026 | 21 → 20 | 161 → 154 |
| C-Espc-HN 2026 | 21 → 20 | 161 → 154 |
| CAHO 2026 | 21 → 20 | 184 → 176 |

### 2b. Capacidade e saldo (`RN-EVT-02`), com `andamentoDaTurma` e hoje = 22/10/2026

Instrumento: `scripts/provas/medir_bloco_8.sql` (insumos em JSON) e `scripts/provas/medir_bloco_8/antes-depois.test.ts`
(a função real). Turmas ativas cujo intervalo contém 28/10/2026.

| Turma | Dias úteis (ativo → inativo) | Capacidade (TA) | Saldo (TA) | Em atraso |
|---|---|---|---|---|
| C-Ap-FR 2026 | 36 → 37 | 288 → 296 | −16 → −8 | sim → sim |
| C-Ap-HN 2026 | 36 → 37 | 288 → 296 | 25 → 33 | não → não |
| C-ApA-AuxNav-PR-SP T2 2026 | 5 → 6 | 40 → 48 | −228 → −220 | sim → sim |
| C-ApA-PCN-PR-EAD T2 2026 | 8 → 9 | 40 → 45 | −288 → −283 | sim → sim |
| C-ApA-PrevMe-PR-EAD T2 2026 | 15 → 16 | 75 → 80 | −293 → −288 | sim → sim |
| C-Espc-FR 2026 | 13 → 14 | 91 → 98 | −105 → −98 | sim → sim |
| C-Espc-HN 2026 | 13 → 14 | 91 → 98 | 28 → 35 | não → não |
| CAHO 2026 | 37 → 38 | 296 → 304 | 61 → 69 | não → não |

**Leitura:** inativar o 28/10 devolve **um dia útil** a cada uma das 8 turmas e soma ao saldo **o TA/dia** da turma
(8 no presencial, 7 no regime de 7 TA, 5 no EAD); **nenhuma** muda de veredito (*em atraso* continua igual). As turmas
EAD entram na capacidade (o limite diário EAD) e não na contagem de paradas (2a), porque essa conta só turma com DSA na
data — as duas regras já eram assim.

## Medida 3 — reversão (DoD 6)

Instrumento: `scripts/provas/impressao_digital_do_esquema.sql`, no banco local (`supabase db reset` com as migrations do
ramo), antes e depois de `specs/023-bloco-8-calendario/reversao.sql`.

| | Objetos | md5 |
|---|---|---|
| com a M1 e a M2 | 2.425 | `e5b55421da868262dd6d011736590e9d` |
| depois da reversão | 2.390 | `89a3f08eeab3459a284b715fb68076f1` — a mesma da `main` (spec 021, `CLAUDE.md`) |
