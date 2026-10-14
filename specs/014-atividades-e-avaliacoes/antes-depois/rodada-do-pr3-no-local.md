# Antes/depois — a rodada de sincronização do PR 3 (leva 1), medida no LOCAL

Medido em 14/10/2026 no banco **local** (`supabase_db_ciaara-11-v2-1`), restaurado por
`python -m scripts.manutencao.dado_do_remoto` a partir da cópia **`remoto-20261014-085612.sql`** — o remoto
já com as migrations do PR 1 e do PR 1.1. Rodada **`2026-10-06T1541`**, a mesma exportação que o remoto
recebeu na carga de 06/10/2026. Por isso a diferença medida aqui é **só** o efeito das regras da spec 014,
sem planilha nova no meio (decisão D3.1).

Comando, duas vezes seguidas:

```
python -m scripts.carga_dsa.sincronizar --rodada planilhas-de-origem/rodadas/2026-10-06T1541 \
  --destino local --autor USR-DEV-LOCAL --provisorio --medir-com-lancamento-da-tela --gravar \
  --turmas "CAHO 2026,C-Ap-HN 2026,C-Ap-FR 2026,C-Espc-HN 2026,C-Espc-FR 2026,C-Esp-ME 2026,C-Exp-MetocOf 2026,C-Exp-BATI T1 2026,C-Exp-Ag-Mag 2026"
```

`C-Exp-Obs-ME 2026` fica **fora** da rodada (D-SYNC-1, T120).

**Aprovação de Bernardo:** [pendente] — A3.5 em `aprovacoes-pendentes.md`.

## O resultado das duas rodadas

| Turma | 1ª rodada (mudanças) | 2ª rodada |
|---|---|---|
| CAHO 2026 | 14 | 0 |
| C-Ap-HN 2026 | 16 | 0 |
| C-Ap-FR 2026 | 9 | 0 |
| C-Espc-HN 2026 | 16 | 0 |
| C-Espc-FR 2026 | 28 | 0 |
| C-Esp-ME 2026 | 7 | 0 |
| C-Exp-MetocOf 2026 | 3 | 0 |
| C-Exp-BATI T1 2026 | 1 | 0 |
| C-Exp-Ag-Mag 2026 | 1 | 0 |

Catálogo (`disciplinas.carga_horaria_tempos` e `unidades_ensino.ch_prevista_tempos`), antes e depois das
duas rodadas: **`1a5b718d…` e `da918009…`, 175 disciplinas e 587 UEs — iguais** (SC-008, D-CUR-1).

## Quanto o TAD de cada turma cai (D-AA-12, Q-14) — `vw_carga_horaria_turma`, em TA

| Turma | AEC antes → depois | **TAD antes → depois** | TR | EI | Apoio Individualizado (novo) | Dias parados (à parte) |
|---|---|---|---|---|---|---|
| CAHO 2026 | 57 → 57 | **40 → 11** (−29) | 59 → 59 | 128 | 0 → 6 | 191 |
| C-Ap-HN 2026 | 41 → 41 | **85 → 54** (−31) | 57 → 56 | 0 | 0 → 1 | 143 |
| C-Ap-FR 2026 | 15 → 12 | **89 → 65** (−24) | 0 | 103 | 0 → 3 | 136 |
| C-Espc-HN 2026 | 86 → 84 | **63 → 31** (−32) | 27 | 9 | 0 → 12 | 169 |
| C-Espc-FR 2026 | 126 → 108 | **51 → 15** (−36) | 1 | 163 | 0 → 31 | 170 |
| C-Esp-ME 2026 | 17 → 17 | **29 → 0** (−29) | 0 | 96 | 0 → 14 | 15 |
| C-Exp-MetocOf 2026 | 5 → 5 | **9 → 0** (−9) | 0 | 0 | 0 → 2 | 7 |
| C-Exp-BATI T1 2026 | 1 → 1 | **2 → 0** (−2) | 0 | 0 | 0 → 2 | 0 |
| C-Exp-Ag-Mag 2026 | 1 → 1 | **1 → 0** (−1) | 0 | 11 | 0 → 1 | 0 |

A coluna "Dias parados" é a de `vw_carga_horaria_turma.ta_dias_parados`: os dias parados da turma **mais** o
feriado de dia inteiro do calendário em dia com DSA. Ela fica **fora** da CHT e dos tetos.

## O que mudou, por regra

- **Licença, feriado e rotina de domingo só desta turma → `dias_parados` (previstos):** 21 linhas TAD
  inativadas com a marca *"[RECLASSIFICADO PELA SPEC 014]"* e 21 dias parados criados (`DSAP-…-L<linha>-P`):
  LA 6, LP 8, NT 7 (as NT são todas "ROTINA DE DOMINGO" de 10 e 11/06). Nenhuma linha apagada.
- **Monitoria, Português para Estrangeiros, BDA e BDF → Apoio Individualizado:** a linha muda de categoria
  no lugar, com o tipo novo (D3.4). Vinham como TAD *Administração*, AEC *Orientação de TFM* ou *Atividade
  Extracurricular*, e TR *Tempo Reserva*.
- **APOINST → tipo *Apoio à Instrução*** (continua AEC).
- **Responsável que não casa com o cadastro:** 43 textos distintos, em 312 TA, viram pendência do lote
  (FR-016). No local, em modo provisório, a atividade entra com o texto como externo (D3.3); no remoto, eles
  **bloqueiam** até a decisão (A3.2). A lista, com os textos, está fora do git:
  `planilhas-de-origem/rodadas/2026-10-06T1541/pendencias-de-responsavel.md`.

## SC-001 remedida (TAD acima do máximo)

Sobre o resultado, por `vw_conformidade_tetos` (máximo = limite do currículo ou 5 % da CH curricular):

| Turma | TAD cumprido | Previsto do PROENS | Máximo | Acima do previsto | Acima do máximo |
|---|---|---|---|---|---|
| C-Ap-FR 2026 | 65 | 5 | 58,25 (5 % de 1.165) | sim | **sim** |
| C-Ap-HN 2026 | 54 | 5 | 62,85 (5 % de 1.257) | sim | não |
| C-Espc-FR 2026 | 15 | 0 | 62 (currículo) | sim | não |
| C-Espc-HN 2026 | 31 | 3 | 62 (currículo) | sim | não |
| CAHO 2026 | 11 | 6 | 83,4 (5 % de 1.668) | sim | não |

Acima do máximo de TAD, depois da rodada: **só C-Ap-FR 2026**. Antes eram C-Ap-FR, C-Ap-HN e
C-Exp-MetocOf (M-5). No remoto, a medida se refaz na rodada do T121, com exportação nova.

## A lista de erros de planilha (FR-036.1)

`planilhas-de-origem/rodadas/2026-10-06T1541/erros-de-planilha.md`, fora do git. Tem 198 linhas em 9 turmas:

- 146 de CH de UE da planilha diferente do currículo;
- 9 de CH de disciplina diferente do currículo;
- 6 de aula no mesmo dia que a planilha marca parado;
- o restante, das conferências que a carga já fazia.

Por turma: CAHO 54, C-Ap-FR 42, C-Ap-HN 41, C-Esp-ME 37, C-Exp-MetocOf 8, C-Espc-FR 6, C-Exp-Ag-Mag 6,
C-Espc-HN 2 e C-Exp-BATI 2.
