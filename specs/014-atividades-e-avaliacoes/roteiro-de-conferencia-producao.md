# Roteiro único de conferência — spec 014 em Production, logado, SÓ LEITURA

> Para Bernardo Villas Boas, em **https://sistema-de-gestao-academica-v2-1.vercel.app**, com a conta dele (Admin).
> Substitui, para a conferência final, os roteiros dos PRs 5, 5.1 e 6 (T198, T221, T235), que lançavam e excluíam:
> **este não grava nada**.
>
> **Versão de 16/10/2026 (tarde), com os números de hoje**, depois do #60 (o card), do #61 (a A4.7 e a E-7) e da rodada
> no remoto (`antes-depois/rodada-da-a47-no-remoto.md`). **De onde vêm os números:** os do card e da aba foram lidos
> **na tela**, num build de produção local sobre a cópia do remoto igual a ele (`scripts/provas/dados_das_turmas.sql`:
> as 29 turmas iguais, total `3dc367f9`); os de CH, no remoto, só por leitura (`vw_carga_horaria_turma`). Medidos em
> 16/10/2026. ⚠️ **Os marcados ⏱ dependem da data**: a prova aplicada conta no «N» no dia dela, e a vista vence 7 dias
> depois da última sessão. ⚠️ CAHO, C-Ap-FR e C-Ap-HN **lançam no sistema desde 13/10/2026**: um lançamento novo nelas
> muda o número, e isso não é defeito — anote o que viu.
>
> **A versão anterior** (15/10/2026) foi conferida por você em 16/10/2026; o único defeito relatado foi o do card
> (*"clicar no card de Avaliações não abre nada"*), corrigido no #60. **A única pendência deste roteiro é a reconferência
> do card (passo 0).** Os demais passos ficam como referência dos números de hoje.

## ⛔ O que NÃO clicar (grava no banco)

Como Admin você vê os botões de quem edita. **Não clique em:** *Definir tempo*, *Confirmar sugestão*, *Nomear*,
*Juntar como sessão de outra prova*, *Gravar*, *Lançar*, *Excluir*, *Mover*, *Parar dia*, *Desfazer*, *Editar turma*,
nem em **célula da grade do DSA** (abre o formulário de lançamento). Abrir abas, `<details>` (as disciplinas), trocar de
semana e **Imprimir** não gravam.

## 0. O card de Avaliações leva à aba — o defeito de 16/10/2026 (PENDENTE)

Menu **Turmas** → **CAHO 2026** → role até a faixa dos cards → clique no card **Avaliações**.

- A página **desce até as abas**, com **Avaliações** selecionada e as disciplinas à vista (antes, ela subia para o topo
  e as abas ficavam fora da tela).
- A URL termina em `?aba=avaliacoes#abas-da-turma`.
- **Voltar** do navegador volta à Ficha.
- O mesmo vale por **Início** → *Vistas de prova* → um alerta, e por **Cursos** → um curso → aba **Avaliações** →
  *«abrir na ficha da turma»*.

## 1. O alerta de vistas no Início — ⏱

Menu **Início** → região de alertas → **Vistas de prova**: **"8 vistas atrasadas"**, sem "vencendo".

As 8: C-Ap-FR I PM 1 (09/09) · C-Espc-FR PPREVACER-005 PM 1 (13/05) · C-Espc-HN HN-1102-0710 PO 1 (12/03) e
HN-1111-0508 PM 1 (24/09) · C-Exp-Ag-Mag I PE (31/03) · C-Exp-Obs-ME II PE 1 (25/09) · CAHO IX PM 1 (13/03) e VI PM 3
(02/07). Vista obrigatória para PM, PO e PE (decisão de 16/10/2026). Clicar numa delas leva à aba **Avaliações** da turma.

## 2. O card «N de M» das turmas sincronizadas — ⏱

Menu **Turmas** → cada turma → card **Avaliações**:

| Turma | Card | Vistas | OD | Disciplina sem previsto |
|---|---|---|---:|---:|
| CAHO 2026 | **44 aplicadas de 52** (85 %) | 36 de 44 | 2 | 1 |
| C-Ap-HN 2026 | **29 de 39** (74 %) | 25 de 37 | 1 | 1 |
| C-Ap-FR 2026 | **17 de 26** (65 %) | 10 de 24 | 1 | 1 |
| C-Espc-HN 2026 | **28 de 32** (88 %) | 23 de 30 | 1 | 1 |
| C-Espc-FR 2026 | **25 de 33** (76 %) | 20 de 31 | 1 | 1 |
| C-Esp-ME 2026 | **19 de 19** (100 %) | 19 de 19 | — | — |
| C-Exp-MetocOf 2026 | **3 de 4** (75 %) | 3 de 4 | 1 | 1 |
| C-Exp-Obs-ME 2026 | **4 de 4** (100 %) | 3 de 3 | — | — |
| C-Exp-BATI T1 2026 | **2 de 2** (100 %) | 2 de 2 | — | — |
| C-Exp-Ag-Mag 2026 | **2 de 3** (67 %) | 1 de 3 | — | — |

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

⚠️ **Você vai ver *«arbitrado — sugestão da planilha, a confirmar»* em itens novos** (a PP 1 da CAHO IV, a PP 2 da XIX,
as três da TFM): é a sugestão **vazia** que a sincronização cria onde o currículo não traz vista — achado registrado em
`antes-depois/rodada-da-a47-no-remoto.md`, com proposta, para decisão sua. **Não clique em *Confirmar sugestão*.**

## 4. C-Ap-HN 2026 — UE 7 – Física no DSA

**C-Ap-HN 2026** → **Abrir o DSA** → no campo da semana pela data, **05/10/2026** (ou qualquer semana depois de maio) →
painel **Situação por disciplina** → abrir **I – MATEMÁTICA E FÍSICA** → a linha da **UE 7 – Física**:

> **conteúdo 18 de 18 · prova 2 de 2 · vista 1 de 1** — **Concluída**, sem "resta" (18 + 2 + 1 = 21).

Medido no remoto: a UE 7 com 21 previstos e 18 de conteúdo executados; a PM 4 da UE 7 com 2 + vista 1; a disciplina com
CH 126 = a soma das UEs. Opcional: **Imprimir** (só abre o papel; não grava).

## 5. A CHT das turmas sincronizadas

⚠️ **A CHT não aparece como um número só em tela nenhuma.** Na ficha de cada turma ela é a soma de **CH executada**
(seção Andamento: aula + avaliação + vista) com os cards **AEC**, **TAD** e **TR**; o **Apoio Individualizado** aparece
na linha abaixo dos cards e **fica fora** da CHT (D-AA-12). A rodada de hoje não mudou CH nenhuma: ela ligou provas a
itens, e a prova de 19/08 da CAHO IV passou a contar como sessão, com os mesmos 4 TA.

| Turma | CH executada | AEC | TAD | TR | **CHT** | Apoio Individualizado |
|---|---:|---:|---:|---:|---:|---:|
| CAHO 2026 | 1367 | 57 | 11 | 88 | **1523** | 7 |
| C-Ap-HN 2026 | 1008 | 41 | 54 | 58 | **1161** | 1 |
| C-Ap-FR 2026 | 868 | 12 | 65 | 0 | **945** | 3 |
| C-Espc-HN 2026 | 1160 | 83 | 31 | 27 | **1301** | 12 |
| C-Espc-FR 2026 | 1075 | 108 | 15 | 1 | **1199** | 31 |
| C-Esp-ME 2026 | 586 | 17 | 0 | 0 | **603** | 14 |
| C-Exp-MetocOf 2026 | 153 | 5 | 0 | 0 | **158** | 2 |
| C-Exp-Obs-ME 2026 | 114 | 5 | 0 | 0 | **119** | 1 |
| C-Exp-BATI T1 2026 | 42 | 1 | 0 | 0 | **43** | 2 |
| C-Exp-Ag-Mag 2026 | 131 | 1 | 0 | 0 | **132** | 1 |

Acima do máximo (alerta, nunca bloqueio): **C-Ap-FR no TAD (65 de 58,20)**; C-Espc-FR (108 de 80) e C-Espc-HN (83 de 80)
no AEC. Fonte: `vw_carga_horaria_turma` e `vw_conformidade_tetos` no remoto, 16/10/2026.

## 6. Disciplinas — as avaliações do currículo

Menu **Disciplinas** → curso **C-Espc-FR** → disciplina **TFMFR-004** → painel **Avaliações do currículo**: a **PP 1** e
a **PP 2**, que a A4.7 carregou hoje, com instrumento, número, UE e TA. **Não** clique em *Acrescentar* nem *Inativar*.

## Conferência de Bernardo

| Passo | Viu o esperado? | Observação |
|---|---|---|
| 0 — o card leva à aba | [pendente] | |
| 1 a 6 | — | referência dos números de hoje; a conferência da versão de 15/10 foi feita em 16/10/2026 |
