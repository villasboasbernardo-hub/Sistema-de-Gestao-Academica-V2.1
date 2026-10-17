# Roteiro único de conferência — spec 014 em Production, logado, SÓ LEITURA

> Para Bernardo Villas Boas, em **https://sistema-de-gestao-academica-v2-1.vercel.app**, com a conta dele (Admin).
> Substitui, para a conferência final, os roteiros dos PRs 5, 5.1 e 6 (T198, T221, T235), que lançavam e excluíam:
> **este não grava nada**.
>
> **Versão de 16/10/2026 (noite)**, depois do **#63** (`2bc77a9`: as correções da lista de erros e a D-11) e da rodada
> no remoto (`antes-depois/rodada-da-lista-16-10-no-remoto.md`). **De onde vêm os números:** os do card, da aba, do
> Início e do DSA foram lidos **na tela**, num build de produção local sobre a cópia do remoto igual a ele
> (`scripts/provas/dados_das_turmas.sql`: as 29 turmas iguais, total `655b2fd1`), e estão em `lista-16-10/tela-16-10-noite.txt` e `tela-16-10-noite-inicio-e-dsa.txt`, na pasta da rodada
> (fora do git); os de CH e de tetos, no remoto, só por leitura (`vw_carga_horaria_turma`, `vw_conformidade_tetos`:
> `lista-16-10/depois-remoto.txt` e `fechamento-014-noite-remoto.txt`). Medidos em 16/10/2026. *(A versão da tarde
> tinha o total `3dc367f9`.)* ⚠️ **Os marcados ⏱ dependem da data**: a prova aplicada conta no «N» no dia dela, e a vista vence 7 dias
> depois da última sessão. ⚠️ CAHO, C-Ap-FR e C-Ap-HN **lançam no sistema desde 13/10/2026**: um lançamento novo nelas
> muda o número, e isso não é defeito — anote o que viu.
>
> **O passo 0 (o card) foi conferido por você em Production em 16/10/2026** e abre a aba à vista. **Este roteiro não
> tem pendência**: os passos ficam como referência dos números de hoje, e o passo 7 mostra, na tela, as correções da
> lista de 16/10/2026 (noite).

## ⛔ O que NÃO clicar (grava no banco)

Como Admin você vê os botões de quem edita. **Não clique em:** *Definir tempo*, *Confirmar sugestão*, *Nomear*,
*Juntar como sessão de outra prova*, *Gravar*, *Lançar*, *Excluir*, *Mover*, *Parar dia*, *Desfazer*, *Editar turma*,
nem em **célula da grade do DSA** (abre o formulário de lançamento). Abrir abas, `<details>` (as disciplinas), trocar de
semana e **Imprimir** não gravam.

## 0. O card de Avaliações leva à aba — ✅ conferido por você em Production, 16/10/2026

Menu **Turmas** → **CAHO 2026** → role até a faixa dos cards → clique no card **Avaliações**.

- A página **desce até as abas**, com **Avaliações** selecionada e as disciplinas à vista (antes, ela subia para o topo
  e as abas ficavam fora da tela).
- A URL termina em `?aba=avaliacoes#abas-da-turma`.
- **Voltar** do navegador volta à Ficha.
- O mesmo vale por **Início** → *Vistas de prova* → um alerta, e por **Cursos** → um curso → aba **Avaliações** →
  *«abrir na ficha da turma»*.

## 1. O alerta de vistas no Início — ⏱

Menu **Início** → região de alertas → **Vistas de prova**: **"5 vistas atrasadas"**, sem "vencendo" *(eram 8 à tarde)*.

As 5, todas com os cursos (`para-os-cursos-16-10.md`): C-Ap-FR I PM 1 (09/09) · C-Exp-Ag-Mag I **PM 2** (31/03) ·
C-Exp-Obs-ME II PE 1 (25/09) · CAHO IX PM 1 (13/03) e VI PM 3 (02/07). **Saíram** a C-Espc-FR PPREVACER-005 PM 1 (13/05,
a vista de 27/05 dividida — V2) e as duas da C-Espc-HN (V3 e V4, pela aba de datas da planilha). Vista obrigatória para
PM, PO e PE. Clicar numa delas leva à aba **Avaliações** da turma.

## 2. O card «N de M» das turmas sincronizadas — ⏱

Menu **Turmas** → cada turma → card **Avaliações**:

| Turma | Card | Vistas | OD | Disciplina sem previsto |
|---|---|---|---:|---:|
| CAHO 2026 | **43 aplicadas de 52** (83 %) | 36 de 44 | 2 | 1 |
| C-Ap-HN 2026 | **29 de 39** (74 %) | 25 de 37 | 1 | 1 |
| C-Ap-FR 2026 | **17 de 26** (65 %) | 10 de 24 | 1 | 1 |
| C-Espc-HN 2026 | **28 de 32** (88 %) | **25** de 30 | 1 | 1 |
| C-Espc-FR 2026 | **25 de 33** (76 %) | **21** de 31 | 1 | 1 |
| C-Esp-ME 2026 | **19 de 19** (100 %) | 19 de 19 | — | — |
| C-Exp-MetocOf 2026 | **3 de 4** (75 %) | 3 de 4 | 1 | 1 |
| C-Exp-Obs-ME 2026 | **4 de 4** (100 %) | 3 de 3 | — | — |
| C-Exp-BATI T1 2026 | **2 de 2** (100 %) | 2 de 2 | — | — |
| C-Exp-Ag-Mag 2026 | **2 de 3** (67 %) | 1 de 3 | — | — |

*(À tarde: CAHO 44 de 52, C-Espc-HN vistas 23 de 30, C-Espc-FR vistas 20 de 31. A CAHO perdeu 1 porque a prova de
27/07 da XVII virou sessão da TI 1 — CAHO-06; as vistas subiram com a V2, a V3 e a V4.)*

A prova em N sessões conta **1** (RN-AV-12); a prova sem item do currículo conta no N — ela não some da conta.

## 3. A CAHO IV, a CAHO XIX e a TFM da C-Ap-FR — a A4.7 e a junção

Na aba **Avaliações** (passo 0), abra a disciplina (clique no título):

- **CAHO 2026 → IV — TOPOGRAFIA**: *"CH 148 = 98 aula + 50 avaliação"*, *"3 de 3 avaliações aplicadas"*; a **PP 1, 40
  TA, Concluída 22/06/2026, em 15 sessões** — as 14 de 22/06 a 07/07 e a de 19/08, juntada hoje por decisão sua; a PM 1
  (17/06) e a PM 2 (16/07). *"restam 0 TA; faltam 0 avaliações"*.
- **CAHO 2026 → XIX — TFM**: *"CH 70 = 65 aula + 5 avaliação"*, *"1 de 3 avaliações aplicadas"*; a **PP 2 Concluída
  17/09/2026** (a `PP2` da planilha); a PP 1 Pendente e a PP 3 Pendente, 22/10/2026.
- **C-Ap-FR 2026 → X — TFM**: *"CH 40 = 36 aula + 4 avaliação"*, *"3 de 3"*; **PP 1 (28/07), PP 2 (03/09) e PP 3
  (03/09)** — a AV1, a AV2 e a AV3 da planilha, nessa ordem.

✅ **A sugestão vazia saiu** (PEND-014-11, decisão de 16/10/2026): as 13 do remoto foram inativadas pela D-11, e a
sincronização não cria mais sugestão sem valor — você não deve ver *«arbitrado — sugestão da planilha, a confirmar»*
nesses itens.

## 4. C-Ap-HN 2026 — UE 7 – Física no DSA

**C-Ap-HN 2026** → **Abrir o DSA** → no campo da semana pela data, **05/10/2026** (ou qualquer semana depois de maio) →
painel **Situação por disciplina** → abrir **I – MATEMÁTICA E FÍSICA** → a linha da **UE 7 – Física**:

> **conteúdo 18 de 18 · prova 2 de 2 · vista 1 de 1** — **Concluída**, sem "resta" (18 + 2 + 1 = 21).

Medido no remoto: a UE 7 com 21 previstos e 18 de conteúdo executados; a PM 4 da UE 7 com 2 + vista 1; a disciplina com
CH 126 = a soma das UEs. Opcional: **Imprimir** (só abre o papel; não grava).

## 5. A CHT das turmas sincronizadas

⚠️ **A CHT não aparece como um número só em tela nenhuma.** Na ficha de cada turma ela é a soma de **CH executada**
(seção Andamento: aula + avaliação + vista) com os cards **AEC**, **TAD** e **TR**; o **Apoio Individualizado** aparece
na linha abaixo dos cards e **fica fora** da CHT (D-AA-12). A D-11 e a rodada de 16/10 (noite) mudaram a CH **em duas turmas, como a decisão previa**: a rodada (R4) deu
à C-Espc-FR os 24 TA da visita a Macaé (AEC); a **D-11** deu à C-Ap-HN 1 TA de vista (a sessão de 27/08 da D1) — a
rodada teve **zero** mudança na C-Ap-HN.

| Turma | CH executada | AEC | TAD | TR | **CHT** | Apoio Individualizado |
|---|---:|---:|---:|---:|---:|---:|
| CAHO 2026 | 1367 | 57 | 11 | 88 | **1523** | 7 |
| C-Ap-HN 2026 | **1009** | 41 | 54 | 58 | **1162** | 1 |
| C-Ap-FR 2026 | 868 | 12 | 65 | 0 | **945** | 3 |
| C-Espc-HN 2026 | 1160 | 83 | 31 | 27 | **1301** | 12 |
| C-Espc-FR 2026 | 1075 | **132** | 15 | 1 | **1223** | 31 |
| C-Esp-ME 2026 | 586 | 17 | 0 | 0 | **603** | 14 |
| C-Exp-MetocOf 2026 | 153 | 5 | 0 | 0 | **158** | 2 |
| C-Exp-Obs-ME 2026 | 114 | 5 | 0 | 0 | **119** | 1 |
| C-Exp-BATI T1 2026 | 42 | 1 | 0 | 0 | **43** | 2 |
| C-Exp-Ag-Mag 2026 | 131 | 1 | 0 | 0 | **132** | 1 |

Acima do máximo (alerta, nunca bloqueio): **C-Ap-FR no TAD (65 de 58,2)**; C-Espc-FR (**132** de 80) e C-Espc-HN (83 de 80)
no AEC — como o **Início** mostra (`tela-16-10-noite-inicio-e-dsa.txt`; máximos de `vw_conformidade_tetos`,
`fechamento-014-noite-remoto.txt`). Fonte: `vw_carga_horaria_turma` e `vw_conformidade_tetos` no remoto, 16/10/2026.

## 6. Disciplinas — as avaliações do currículo

Menu **Disciplinas** → curso **C-Espc-FR** → disciplina **TFMFR-004** → painel **Avaliações do currículo**: a **PP 1** e
a **PP 2**, que a A4.7 carregou hoje, com instrumento, número, UE e TA. **Não** clique em *Acrescentar* nem *Inativar*.

## 7. As correções da lista de 16/10/2026 (noite), na tela

Na aba **Avaliações** de cada turma (abra a disciplina pelo título):

- **CAHO 2026 → I**: *«2 de 2 avaliações aplicadas»* — **TG 1** (22/01) e **TG 2** (12/02, a prova de chave «PM»,
  CAHO-01).
- **CAHO 2026 → XVII**: *«2 de 2»* — **PM 1** (24/07) e **TI 1, Concluída 14/07/2026, em 2 sessões** (a prova de 27/07
  juntada, CAHO-06).
- **C-Ap-HN 2026 → VII**: **PM 1, Concluída 20/08/2026** (D1); **→ XVII**: **PP 3, Concluída 03/09/2026** (D2). Na XVII o
  rodapé diz *«restam −2 TA; faltam 0 avaliações → sobram −2 TA para aula — estouro»*: o executado passa 2 TA da CH de
  40. A D2 só ligou a prova ao item, sem mudar TA.
- **C-Ap-FR 2026 → VII**: **PM 1** (19/05) e **PM 2** (30/06), ligadas pela «Alternativa».
- **C-Espc-HN 2026 → HN-1102-0710**: **PM 1**, **TG 1** (a TI de 12/03, C-Espc-HN-01) e **PO 1**, *«3 de 3»*;
  **→ HN-1111-0508 (Marés)**: **PM 1** e **PP 1 em 2 sessões**.
- **C-Espc-FR 2026 → PPREVACER-005**: **PM 1** (13/05) e **PP 1** (25/05), as duas concluídas — cada uma com 1 TA da vista
  de 27/05 (V2).

E no DSA (R1): **C-Ap-FR 2026** → **Abrir o DSA** → semana pela data **25/08/2026** → terça: a aula de 3 TA da
disciplina I é **«INSTALAÇÕES ELÉTRICAS. DISPOSITIVOS DE PROTEÇÃO»** (a UE 2; antes, a UE 1).

## Conferência de Bernardo

| Passo | Viu o esperado? | Observação |
|---|---|---|
| 0 — o card leva à aba | ✅ 16/10/2026 | conferido em Production |
| 1 a 7 | — | referência dos números de 16/10/2026 (noite); sem pendência |
