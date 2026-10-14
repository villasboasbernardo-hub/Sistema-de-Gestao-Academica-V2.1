# PEND-DSA-VISTA — antes/depois da correção (D-SYNC-2)

> ⛔ **Para aprovação (A6.1).** Ensaiado só no banco **local**, sobre a cópia `remoto-20261014-164730.sql`, em
> 14/10/2026. Nada foi aplicado no remoto. SQL: `pend-dsa-vista.sql` (uma transação, com a conferência no fim).

Turma `C-Exp-Obs-ME 2026`, prova de **07/10/2026**, 5º tempo, 3 TA, disciplina I.

| | `DSAP-C-EXP-OBS-ME-2026-L206-V` (a original, da planilha) | `DSA-MUYK0RFD-V` (a relançada na tela) |
|---|---|---|
| **Antes** | `cancelada` (pela tela, 07/10 20:13); sessão de vista 1 `VST-000001` (09/10, 6º tempo, 1 TA) **ativa**, mas fora da conta, porque a mãe está cancelada | `pendente`; **sem** vista; com fiscal de fora do cadastro |
| **Depois** | `pendente`, marcada `[REATIVADA — PEND-DSA-VISTA, D-SYNC-2]`; a sessão 1 volta a contar | `cancelada`, marcada `[CANCELADA — relançamento …]` (nada apagado) |

| Carga da turma (`vw_carga_horaria_turma`) | Antes | Depois |
|---|---:|---:|
| CHD executada | 113 | **114** |
| TA de avaliação | 11 | 11 |
| TA de vista | 3 | **4** |

A diferença é **exatamente** a vista que se perdeu ao relançar: 1 TA. A avaliação continua sendo uma só (troca a
relançada pela original), e o `de_tela` da turma cai a zero, condição para ela voltar à rodada do PR 6 (D-SYNC-1).

⚠️ **O fiscal de fora do cadastro** está na relançada e não na original. A rodada do PR 6 regrava a original pela
planilha, fiscal incluído pelo que ela diz; o nome não é copiado por script nem escrito aqui (repositório público).
