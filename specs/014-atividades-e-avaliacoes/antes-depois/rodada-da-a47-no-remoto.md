# A rodada da A4.7 no remoto — 16/10/2026 (tarde)

> A segunda decisão de Bernardo Villas Boas de 16/10/2026 (`aprovacoes-pendentes.md`, seção «16/10/2026 (tarde)»): os
> 87 itens da A4.7 (migration D-10, `20261016153232`) e a junção da PP de 19/08 da CAHO IV à PP 1, aplicados à
> exportação `2026-10-14T1916` — a mesma das rodadas de 14 e 16/10. Medido em 16/10/2026; cada número com o artefato
> ao lado (regra 9.2).

## O rito

| Passo | Medido |
|---|---|
| Código | `main` em `3165a59` (#61), deploy de Production `success`; a E-7 e a D-10 no remoto antes do merge (`plano-de-aplicacao-no-remoto.md`) |
| Backup imediatamente antes | **`remoto-20261016-141227.sql`** (o `dado_do_remoto` completo, que também restaurou a cópia no local) |
| Ensaio na cópia (local) | 1ª rodada **36** mudanças, 2ª **0** (`a47-ensaio-local-r1.log`, `-r2.log`, fora do git) |
| Ensaio no remoto (sem gravar) | **plano do remoto = plano do local nas 10 turmas** (impressões `2c8435b4…`, `2376e2ef…`, `75195397…`, `7babfe9c…`, `4101bff7…`, `dab8c537…`, `3fab0617…`, `afc6fa10…`, `6ea0728c…`, `9acae491…`); as mesmas 36 mudanças por turma |
| Rodada no remoto | **36** mudanças (CAHO 11 · C-Espc-HN 8 · C-Espc-FR 8 · C-Ap-FR 5 · C-Ap-HN 4 · as outras 5: 0), lidas de volta *"o banco é o plano, linha a linha"* nas 10 — em duas execuções, explicadas abaixo |
| Segunda rodada | **0** nas 10 (`a47-remoto-gravar-r2.log`) |
| Junção da CAHO IV | `scripts/manutencao/juntar_como_sessao.py --gravar`: a `DSAP-CAHO-2026-L1945-V` (19/08, 4 TA) virou a sessão **15** (`SAP-000001`) da PP 1 `DSAP-CAHO-2026-L1450-V`, que soma **40 TA**; a de 19/08 ficou `cancelada` com a marca; trilha com `juntada_em` e o retrato, `juntada_por` **nulo** (sem sessão) |
| Terceira rodada (depois da junção) | **0** nas 10, sem parada: a sincronização respeita a junção (`a47-remoto-gravar-r3.log`) |
| Catálogo (D-CUR-1) | igual antes e depois de cada execução: `avaliacoes_do_curriculo 6a2ed557…` (281), `disciplinas c1c8e134…` (175), `unidades da918009…` (587) |
| Local × remoto | a cópia (`remoto-20261016-145034.sql`) refez a rodada da CAHO (**11**) e a junção por conta própria; `scripts/provas/dados_das_turmas.sql`: **iguais nas 29 turmas**, total `3dc367f9` nos dois |

⚠️ **A CAHO foi gravada numa segunda execução, e a primeira PAROU nela por um erro meu de sequência — o porteiro funcionou.**
Para espelhar o estado final, fiz a junção e a 3ª rodada na cópia local **antes** de o remoto gravar. A sincronização
recalcula o plano no local na mesma execução e compara as impressões: com a junção no local, a CAHO deu *«[PARADO] plano do
local 8a7b96ee… × remoto 2c8435b4…: não é o mesmo plano»*, saída 6, e **nada foi gravado nela** (o plano do remoto era o do
ensaio). As outras 9 foram gravadas e lidas de volta, e a 2ª execução deu 0 nelas. Com uma cópia nova
(**`remoto-20261016-145034.sql`**, também backup), a CAHO sozinha: plano do remoto = plano do local (`2c8435b4…`), **11**
mudanças, lidas de volta, catálogo igual. A ordem certa, e a seguida daqui em diante: o remoto grava primeiro, a cópia
espelha depois.

## Antes e depois

*Antes* = o remoto antes desta rodada, já com a D-10 (cópia `remoto-20261016-141227.sql`); *depois* = o remoto depois
da rodada e da junção. Provas medidas por `scripts/provas/emenda_16_10_medidas.sql` (rodado no local e no remoto por
`scripts/provas/medir_no_remoto.py`), hoje = 16/10/2026. Os números da tela, lidos num build de produção local sobre a
cópia igual ao remoto, estão no roteiro de conferência.

| Grandeza | Antes | Depois |
|---|---:|---:|
| Itens de avaliação do currículo ativos | 194 | **281** (+ 87 da A4.7) |
| Provas ligadas a item do currículo | **118 de 170** | **140 de 169** (a de 19/08 da CAHO IV virou sessão) |
| Provas em N sessões (RN-AV-12) | 5 provas, 17 sessões 2..N | **5 provas, 18 sessões 2..N** (a CAHO IV ganhou a 15ª) |
| Prova sem item com instrumento gravado (A2) | 36 | **17** |
| Vistas atrasadas (o alerta da tela) | **8** (+0 vencendo) | **8** (+0) — as mesmas; a da C-Espc-FR PPREVACER-005 passou de «PE sem item» a **PM 1** |
| Itens a corrigir na lista por turma | **75** (+ 191 de informação) | **79** (+ 175 de informação) |
| Provas que não casam (`provas-sem-casar.md`) | 23 | **19** |

**As 36 mudanças são 23 provas e 13 sugestões** (CAHO 7 + 4 · C-Espc-FR 6 + 2 · C-Espc-HN 5 + 3 · C-Ap-FR 3 + 2 ·
C-Ap-HN 2 + 2). Das 23 provas, **22 ligaram a item da A4.7** e a outra é a AV3 da TFM da C-Ap-FR, que ficou com a PP 3
(o item antigo) quando a AV1 passou à PP 1. Medido na cópia igual ao remoto, prova a prova:

| Turma | Disciplina | Prova → item |
|---|---|---|
| CAHO 2026 | I · III · IX | TG 1 (uma em cada) |
| CAHO 2026 | IV | a de 14 sessões → **PP 1** |
| CAHO 2026 | VII | PM 1 e TG 1 |
| CAHO 2026 | XIX | `PP2` → **PP 2** |
| C-Ap-HN 2026 | XVII | `PP1` → PP 1, `PP2` → PP 2 |
| C-Ap-FR 2026 | X (TFM) | **AV1 → PP 1, AV2 → PP 2, AV3 → PP 3** (antes: AV1 na PP 3, pela P10) |
| C-Espc-FR 2026 | TFMFR-004 · MFMFR-007 · PPREVACER-005 | PP 1 e PP 2 · PP 1 e PM 1 · PM 1 e PP 1 |
| C-Espc-HN 2026 | HN-1103-0506 · SN-1103-0506 | PP 1, PP 2 e PP 3 · PP 1 e PM 1 |

⚠️ **Duas provas da C-Espc-FR descritas como «PROVA ESCRITA», com T/E «Prova Mista», ligaram à PM 1** (PPREVACER-005 e
MFMFR-007, que só têm PM 1 e PP 1 no currículo): a descrição nomeia a PE, que a disciplina não tem, e a T/E desempata
(P10, como publicada no #58). A vista continua obrigatória dos dois jeitos.

**A lista por turma, a corrigir (antes → depois):** CAHO 22 → **21** · C-Ap-FR 8 → **9** · C-Esp-ME 17 → **17** · C-Ap-HN
4 → **6** · C-Espc-FR 13 → **14** · C-Espc-HN 3 → **4** · Ag-Mag 4 → **4** · MetocOf 3 → **3** · Obs-ME 0 → **0** · BATI 1
→ **1**. **O que subiu é «tempo da prova diferente do currículo»**: a prova agora liga a um item com tempo, e a planilha
traz outro — TFM da C-Ap-FR (planilha 3 × currículo 2 na PP 1; 2 × 1 na PP 2), C-Ap-HN XVII (3 × 2 e 3 × 1), e assim
por diante. É a regra de antes (a prova que casa com TA diferente vai para a lista); os itens da TFM vieram da proposta da
A4.7, que dividiu o tempo do conjunto *"em partes iguais, o resto ao primeiro"*. Em
`planilhas-de-origem/rodadas/2026-10-14T1916/erros-por-turma/` (fora do git), regerada da rodada no remoto; as listas
de antes ficaram em `antes-da-a47-16-10/`.

**As 19 provas que não casam:** 17 `AV` cuja descrição e cuja T/E não nomeiam instrumento; a CAHO I `PM` (a A4.7 deu à
disciplina só a TG 1); e a C-Espc-HN HN-1102-0710 `TI` (a disciplina não tem TI). Saíram da lista as duas PP da CAHO IV
(a de 14 sessões ligou à PP 1; a de 19/08 virou sessão), a CAHO XIX `PP2` e duas TG/TI.

⚠️ **Achado, não corrigido — a sugestão VAZIA.** Onde o currículo é *mudo* sobre a vista de um item (a PP sem vista), a
sincronização cria a sugestão da planilha (FR-031.8, desde o PR 6) mesmo quando a planilha não traz vista: a linha nasce
com **os dois tempos nulos**, e a aba mostra *«arbitrado — sugestão da planilha, a confirmar»* sem nada a confirmar.
Medido no remoto: **13** sugestões ativas sobre os itens da A4.7, **11** vazias; e 2 vazias de antes (15/10). Na CAHO IV,
é a PP 1 que aparece assim. **Proposta:** a sincronização não cria sugestão sem valor, e as vazias saem por exclusão
lógica — decisão sua, porque tirá-las é escrita no remoto que este comando não pediu.
