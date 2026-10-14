# Rodada da sincronização da leva 2 (PR 6) — ensaio no banco LOCAL

> Ensaio de **14/10/2026**, só no banco **local**: cópia `remoto-20261014-164730.sql` (o remoto depois do PR 4),
> mais a correção da `PEND-DSA-VISTA` ensaiada (`pend-dsa-vista.md`), e a exportação `2026-10-14T1149` — a mesma da
> rodada do PR 3. **Nada foi gravado no remoto.** A rodada no remoto (T233) espera a autorização (A6.2).

## O que a rodada faz

- **A prova da planilha aponta a avaliação do currículo** pelo instrumento e pelo número **escritos na descrição** da
  linha — *"PM4 – FÍSICA AV. DA APRENDIZAGEM (U.E. 7)"* é a PM 4 —, e, sem eles, pelo nome do instrumento na
  descrição ou no tipo, com o número de ordem dentro da disciplina. **Sem inferência:** o que não nomeia o
  instrumento não casa e vai para a lista (D6.1).
- **A vista é sessão** em `vistas_de_avaliacao`, com o código `…-S` da linha da planilha. A sessão 1 que o espelho da E-5
  criara (`VST-…`) sai, e a 2ª vista da mesma prova é a sessão 2. A chave `vista_extra_como_aec` ficou sem efeito.
- **A faixa *"U.E. 3 a 6"*** da descrição vai para `ues_abordadas`.
- **O 2º instrutor da prova** (*"A / B"*) vai para `outros_instrutores`.
- **Onde o currículo é mudo sobre o tempo**, o da planilha vira **sugestão** no ajuste da turma, e o arbitrado
  confirmado não é tocado.

## Rodadas

| Rodada | Mudanças | Observação |
|---|---|---|
| 1 | 310 em 10 turmas | sessões `…-S` no lugar das `VST-…`; itens ligados; Monitorias reclassificadas (abaixo) |
| 3 | 48 | desfez ligações erradas do recurso "único instrumento", que foi retirado (D6.1) |
| 5 | 67 | ligou pelo prefixo da descrição (*"PM4 –"*) |
| **6** | **0 nas 10 turmas** | a rodada é idempotente |

Catálogo (`retrato_do_catalogo`, que desde o PR 6 inclui as avaliações do currículo): **igual antes e depois** —
`avaliacoes_do_curriculo d98f14d5…` (194 itens), `disciplinas c1c8e134…` (175), UEs (587).
`provar_sincronizacao_no_banco` (C-Esp-ME 2026): **todas as provas passam**.

## Carga por turma, antes (remoto depois do PR 4) → depois (rodada 6)

| Turma | CHD | Avaliação | Vista | CHT |
|---|---|---|---|---|
| C-Ap-HN 2026 | 953 → 953 | 73 → 73 | 24 → 24 | 1107 → 1106 |
| C-Esp-ME 2026 | 586 → 586 | 49 → 49 | 19 → 19 | 617 → 603 |
| C-Espc-FR 2026 | 1075 → 1075 | 75 → 75 | 22 → 22 | 1212 → 1199 |
| C-Espc-HN 2026 | 1124 → 1126 | 76 → 76 | 23 → 25 | 1277 → 1267 |
| C-Exp-Ag-Mag 2026 | 131 → 131 | 4 → 4 | 1 → 1 | 133 → 132 |
| C-Exp-BATI T1 2026 | 42 → 42 | 6 → 6 | 2 → 2 | 45 → 43 |
| C-Exp-MetocOf 2026 | 153 → 153 | 8 → 8 | 3 → 3 | 160 → 158 |
| C-Exp-Obs-ME 2026 | 113 → 114 | 11 → 11 | 3 → 4 | 119 → 119 |
| CAHO 2026 | 1355 → 1356 | 144 → 144 | 35 → 36 | 1488 → 1489 |

C-Ap-FR 2026 não muda.

- **A vista sobe** onde havia 2ª sessão que era AEC (C-Espc-HN +2, CAHO +1) e na Obs-ME (+1, a vista recuperada pela
  `PEND-DSA-VISTA`). A AEC "VISTA DE PROVA (2ª sessão)" sai: as **2** ficam inativas.
- **⚠️ A CHT cai** em sete turmas, e a causa **não** é a leva 2. **17 linhas de MONITORIA** estavam no remoto como
  **TAD/Administração** desde a carga de 06/10, travadas pela pendência de responsável (A3.2 trava só a linha). Com as
  decisões da **A3.6**, aplicadas no PR 4, o responsável passa a ser aceito, e a linha recebe a classificação da
  **D-AA-12**: **Apoio Individualizado**, que fica fora da CHT e dos tetos. É o efeito pretendido das duas decisões
  aprovadas, e é dito aqui para não ser lido como perda (D6.2).

## A ligação ao item (rodada 6)

| | Quantas |
|---|---:|
| Avaliações da planilha, vivas | 188 |
| … com a avaliação do currículo | **75** |
| … com a faixa de UEs | 51 |
| Sugestões da planilha no ajuste da turma (currículo mudo) | 6 (4 da Obs-ME) |

**Na lista `erros-de-planilha.md` da rodada** (fora do git): TA de prova diferente do currículo **6**; prova a mais
que os itens **6** (ex.: o TFM da C-Ap-HN prevê só a PP 3, e a planilha tem a TAF e a PP2); prova que não casa com
nenhuma avaliação do currículo **86**, quase todas porque a descrição não nomeia o instrumento.
