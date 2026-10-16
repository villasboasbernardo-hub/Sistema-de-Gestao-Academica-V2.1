# A rodada da emenda de 15/10/2026 no remoto — 16/10/2026

> As regras RN-AV-10 a RN-AV-14 e RN-RESP-1 (15/10/2026) e as decisões de 16/10/2026 de Bernardo Villas Boas (opção A do
> desenho, P1, P4 com a ação de juntar, P5 com a PE, P6, P9, P10), aplicadas à exportação `2026-10-14T1916`, a mesma da
> rodada do PR 6. Medido em 16/10/2026; cada número com o artefato ao lado (regra 9.2).

## O rito

| Passo | Medido |
|---|---|
| Código | `main` em `21bba71` (#58), deploy de Production `success`; as migrations E-6 e D-9 no remoto antes do merge (`plano-de-aplicacao-no-remoto.md`) |
| Backup imediatamente antes | **`remoto-20261016-084037.sql`** (o `dado_do_remoto` completo, que também restaurou a cópia no local) |
| Ensaio na cópia (local) | gravado nas **10** turmas, lido de volta igual ao plano; **2ª rodada 0** |
| Ensaio no remoto (sem gravar) | **plano do remoto = plano do local nas 10 turmas** (impressões `0ffe16a7…`, `720816fd…`, `8d5bae79…`, `57ccd289…`, `87f3afae…`, `dab8c537…`, `3fab0617…`, `6ea0728c…`, `9acae491…`, `afc6fa10…`); mudanças por turma iguais às do ensaio |
| Rodada no remoto | **128** mudanças (CAHO 68 · C-Espc-FR 25 · C-Ap-FR 12 · C-Esp-ME 10 · C-Espc-HN 8 · C-Ap-HN 2 · Ag-Mag 2 · BATI 1 · MetocOf 0 · Obs-ME 0), lidas de volta: *"o banco é o plano, linha a linha"* nas 10 |
| Segunda rodada | **0** nas 10 |
| Catálogo (D-CUR-1) | igual antes e depois: `avaliacoes_do_curriculo d98f14d5…` (194), `disciplinas c1c8e134…` (175), `unidades da918009…` (587) |
| Local × remoto | `scripts/provas/dados_das_turmas.sql` (aulas, avaliações com item e instrumento, sessões de vista, sessões de aplicação, atividades, dias parados, ajustes; sem ids nem auditoria): **iguais nas 28 turmas**, total `cc69b52c` nos dois |
| Esquema | `7ed10b8c068852f8678a4a42a98603b1`, **1.994** objetos, igual nos dois; 72 e 72 migrations |

## Antes e depois

*Antes* = o remoto até 16/10/2026, com a rodada de 14/10 (cópia `remoto-20261016-065949.sql`, igual à de 08:08 salvo a chave
do `pg_dump`); *depois* = o remoto depois desta rodada. Provas medidas por `scripts/provas/emenda_16_10_medidas.sql`
(rodado no local e no remoto por `scripts/provas/medir_no_remoto.py`), hoje = 16/10/2026.

| Grandeza | Antes | Depois |
|---|---:|---:|
| Provas ligadas a item do currículo | **75 de 187** linhas | **118 de 170** provas — as 187 linhas viram 170 avaliações + **17 sessões** de aplicação |
| Provas em N sessões (RN-AV-12) | 0 (as 17 sessões eram avaliações separadas) | **5 provas, 17 sessões 2..N** (abaixo) |
| Prova sem item com instrumento gravado (A2) | — (a coluna não existia) | **36** |
| Vistas atrasadas (o alerta da tela) | **6** (+1 vencendo), regra de 14/10 | **8** (+0 vencendo), regra de 16/10 (abaixo) |
| Itens a corrigir na lista por turma | **326** | **75** (+ **191** de informação) — 15 deles são PROCV (8) e T/E da avaliação (7), de volta a «corrigir» pela P9 |
| Provas que não casam (`provas-sem-casar.md`) | 50 (o ensaio de 15/10) | **23** |

**As 5 provas em N sessões** (planos `plano-*.json` da rodada, fora do git):

| Turma | Disciplina | COD | Item | Sessões | De → até | TA |
|---|---|---|---|---:|---|---:|
| CAHO 2026 | IV | PP | — (A4.7, item 4) | 14 | 22/06 → 07/07 | 36 |
| CAHO 2026 | XI | PM2 | PM 2 | 2 | 27/08 → 31/08 | 3 |
| CAHO 2026 | III | T | — | 2 | 27/02 → 27/02 | 3 |
| C-Espc-HN 2026 | HN-1111-0508 | PP | PP 1 | 2 | 24/09 → 25/09 | 5 |
| C-Espc-FR 2026 | TFMFR-004 | AV1 | — | 2 | 23/03 → 26/03 | 4 |

**As 8 vistas atrasadas, depois:** C-Ap-FR I PM 1 (09/09) · C-Espc-FR PPREVACER-005 PE sem item (13/05) · C-Espc-HN
HN-1102-0710 PO 1 (12/03) e HN-1111-0508 PM 1 (24/09) · C-Exp-Ag-Mag I PE sem item (31/03) · C-Exp-Obs-ME II PE 1 (25/09) ·
CAHO IX PM 1 (13/03) e VI PM 3 (02/07). Das 6 de antes, ficaram as duas da C-Espc-HN; as quatro PP/TG (C-Ap-FR IX,
C-Ap-HN VII, C-Espc-FR FONFR-011 e PSFFR-014) saíram pela RN-AV-13; entraram as **três PE** (decisão de 16/10/2026: PE
exige vista — duas delas sem item, com o instrumento gravado), a C-Ap-FR I PM 1 (ligada agora pela P10) e as duas da
CAHO ligadas pelo COD.

**A lista por turma, a corrigir (antes → depois):** CAHO 118 → **22** · C-Ap-FR 55 → **8** · C-Esp-ME 50 → **17** ·
C-Ap-HN 46 → **4** · C-Espc-FR 23 → **13** · C-Espc-HN 9 → **3** · Ag-Mag 9 → **4** · MetocOf 8 → **3** · Obs-ME 5 →
**0** · BATI 3 → **1**. Em `planilhas-de-origem/rodadas/2026-10-14T1916/erros-por-turma/` (fora do git), um `.md` por
turma e `erros-por-turma.xlsx`, com «Prioridade» e «Resposta do operador»; as listas de 15/10 ficaram em
`antes-da-decisao-16-10/`.

**As 23 provas que não casam:** 17 com `AV` cuja descrição e cuja T/E não nomeiam instrumento; 2 PP de disciplina sem PP
no currículo (a da CAHO IV, em duas linhas — a prova de 14 sessões e a de 19/08, a 43 dias); 2 TG/TI e 1 TI de
disciplina sem esse instrumento; e a CAHO XIX `PP2` (o currículo só tem a PP 3). Com COD, descrição e itens lado a lado em
`provas-sem-casar.md` da rodada.

**A PP da CAHO IV está entre os 90 da A4.7:** é o **item 4** de `medicoes/d4-fora-recomendacoes.md` (CAHO IV
Topografia, PP 1, **40 TA**, p. 19, *"aplicação e comentários no mesmo tempo"*). Ela não casa porque o item não foi
carregado. As 14 sessões (36 TA) mais a prova de 19/08 (4 TA) somam exatamente os 40 TA do currículo: carregado o item,
e juntada a de 19/08 pela aba, a prova fecha com o currículo. A CAHO XIX `PP2` também é da A4.7: a disciplina só tem a
PP 3 carregada, e a PP 2 é o **item 14** (a PP 1, o 13 — *"2 itens declarados juntos, com o tempo para o conjunto"*).
