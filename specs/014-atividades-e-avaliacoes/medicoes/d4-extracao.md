# D-4 — extração das avaliações dos 24 currículos (T126)

_Medido em 14/10/2026._ Este relatório é **da extração**, não da revisão: a coluna `conferido` está
vazia ou com `conferir: <motivo>`, e quem fecha cada linha contra o PDF é a T127.

**Artefatos (regra 9.2):**

- **Origem:** os 24 PDFs em `…\Documentos\SIS11\Curriculos\` (fora do git), lidos com PyMuPDF.
- **Extrator:** `scripts/etl/extrair_avaliacoes_curriculo.py`, subcomando `avaliacoes` (parte 2).
- **Saída:** `scripts/etl/dados/avaliacoes_curriculo.csv`, 284 linhas de item mais o cabeçalho.
- **Prova:** `scripts/etl/provar_extracao_de_avaliacoes.py`, que saiu **0 (APROVADA)**. Com um
  defeito plantado (a UE computada nunca é lida), ela reprova no caso HN-2101 UE 7.
- **Nenhum banco foi lido nem tocado.** As comparações abaixo são entre números do próprio PDF.

## 1. Itens por curso

Medido sobre o `avaliacoes_curriculo.csv`. "Σ aplic." e "Σ vista" somam só os números que o PDF
dá; o item sem número entra com zero.

| Curso | Disciplinas com item | Itens | `conferir` | Σ aplic. | Σ vista | Itens sem TA de aplicação |
| --- | --: | --: | --: | --: | --: | --: |
| CAHO | 21 | 54 | 16 | 149 | 43 | 9 |
| C-ApA-AuxNav-PR-SP | 7 | 9 | 8 | 8 | 1 | 1 |
| C-ApA-PCN-PR-EAD | 7 | 7 | 1 | 12 | 0 | 1 |
| C-Ap-FR | 13 | 27 | 2 | 68 | 24 | 3 |
| C-Ap-HN | 18 | 40 | 2 | 107 | 37 | 3 |
| C-Esp-ALH | 9 | 13 | 13 | 26 | 0 | 1 |
| C-Esp-ME | 12 | 19 | 0 | 51 | 19 | 0 |
| C-Esp-OpAP | 4 | 4 | 3 | 8 | 4 | 0 |
| C-Exp-Ag-Mag | 2 | 3 | 0 | 6 | 3 | 0 |
| C-Exp-BATI | 1 | 2 | 0 | 6 | 2 | 0 |
| C-Exp-MetocOf | 5 | 5 | 0 | 10 | 4 | 1 |
| C-Exp-Obs-ME | 2 | 4 | 0 | 0 | 0 | 4 |
| EST-QF-PROC-MF-EAD | 1 | 1 | 1 | 0 | 0 | 1 |
| EST-QF-NAVFLU-EAD | 1 | 1 | 1 | 2 | 0 | 0 |
| EST-QF-APOC | 1 | 1 | 1 | 0 | 0 | 1 |
| C-ApA-OcOp-PR-SP | 10 | 14 | 14 | 28 | 0 | 1 |
| C-Exp-Metoc-OF-SP | 4 | 4 | 3 | 7 | 0 | 1 |
| C-ApA-PrevMe-PR-EAD | 7 | 9 | 6 | 14 | 0 | 2 |
| C-Espc-FR | 17 | 34 | 7 | 101 | 31 | 2 |
| C-Espc-HN | 14 | 33 | 7 | 111 | 30 | 2 |
| **Total (20 cursos)** | **156** | **284** | **85** | | | |

**Sem item, de propósito (4 cursos):**

- **Aprovação por frequência:** EST-QF-MAREFLU (1 disciplina) e EST-QF-PGRS100 (2). A seção diz
  *"Será aprovado na disciplina o aluno que não infringir os requisitos de frequência"*.
- **Avaliação do estágio inteiro, por conceito, sem seção por disciplina:** EST-QF-APHID (relatório
  individual, conceito S/I) e EST-QF-EM2040PHS (observação de desempenho, conceito S/I). As 5 e as 3
  disciplinas não têm seção de avaliação própria. Pôr o item numa delas seria inventar a disciplina.

## 2. Linhas `conferir`: 85 de 284

Contagem por motivo no CSV. Uma linha pode ter mais de um motivo, e aqui conta só o primeiro.

| Motivo | Linhas | Onde |
| --- | --: | --- |
| Instrumento **PT** (prova eletrônica) fora da lista da §3.2 | 21 | C-ApA (AuxNav, OcOp, PrevMe), C-Exp-Metoc-OF-SP, EST-QF-NAVFLU-EAD |
| A sinopse geral dá 1 TA de vista por prova, e a disciplina não repete | 13 | C-Esp-ALH (todas) |
| Instrumento ambíguo, **"TI ou TG"** | 11 | CAHO I, III, VII, IX, X, XVI; C-Espc-HN INGLÊS |
| Mais de um item na mesma frase, com o tempo do conjunto | 10 | as provas de corrida e natação do TFM: CAHO XIX, C-Ap-FR X, C-Ap-HN XVII, C-Espc-FR e C-Espc-HN (os 3 trabalhos da CAHO X também têm este motivo, mas o primeiro deles é o "TI ou TG") |
| Vista numa alínea separada, comum a várias provas | 7 | C-ApA-AuxNav I e IV; C-ApA-OcOp V, VI, VII e IX |
| Código no plano diferente do código no sumário | 7 | C-Espc-FR (PREVACFR × PPREVACER, EQUIFR × EQUFR), C-Espc-HN (PRIMEIROS SOCORROS `HN-1113-0508` × `SN-1103-0506`; HIDROGRAFIA APLICADA `HN-1104-0730` × `HN-1114-0730`) |
| Entrega de trabalho ou projeto no AVA, sem TA | 4 | as disciplinas finais dos C-ApA |
| CH DA AVALIAÇÃO não fecha com a soma dos itens (TFM) | 2 | C-Espc-FR e C-Espc-HN: CH da avaliação 6, e a soma lida é só 2 (as duas PP de corrida e natação dividem 4 TA) |
| O currículo "aloca tempo de vista" sem dar o número | 2 | CAHO XX (projeto de pesquisa e monografia) |
| Outros, um de cada | 8 | CAHO VII PM (aplicação na UE 11 e vista na UE 9; o seminário da mesma disciplina, em 3 UEs, está na linha do "TI ou TG"); CAHO IV PP (40 TA "para a aplicação e dos comentários"); OPAP I e II (a mesma PE nas duas, computada na UE 1 da disciplina I); OPAP III (1 TA de elaboração + 1 de apresentação); PROC-MF-EAD (relatório); PrevMe V (texto sem item); **EST-QF-APOC (PDF digitalizado)** |

## 3. Casos especiais

- **HN-2101 e MATFIS, já pelo código unificado.** O PDF do C-Ap-HN trata HN-2101-0621 como **uma**
  disciplina (126 h, 4 PM), e o da CAHO trata MATFIS como **uma** (2 PM). O CSV usa o código do
  currículo, que é o unificado. Quem desfaz o desdobramento no banco é a D-6.
- **C-Espc pela "CH DA AVALIAÇÃO".** A célula da tabela pode cair **no meio** do texto da avaliação,
  na quebra de página (C-Espc-HN OCEANOGRAFIA, p. 71–72). O leitor registra o número e segue lendo.
  Fecham com a soma dos itens **16 de 17** (C-Espc-FR) e **13 de 14** (C-Espc-HN). A diferença nos dois
  é o TFM.
- **EST-QF-APOC:** o PDF não tem camada de texto. Sai **uma** linha (a disciplina I), sem número, com
  `conferir: PDF digitalizado`. A transcrição por dois leitores (P-4) é da T127.
- **Códigos limpos:** o PDF do C-Ap-HN escreve `HN-2102- 0150`, `HN-2111- 1212` e `HN- 2116-0407`, com
  espaço. O CSV usa a forma sem espaço (`HN-2102-0150`). ⚠️ O `pareamento_ue.csv` guarda a forma **com**
  espaço. O casamento com ele precisa normalizar.
- **C-Exp-MetocOf** não tem `CÓDIGO:`. O código no CSV é a `SIGLA` do PDF (`METOC-I` a `METOC-V`).

## 4. Σ (aplicação + vista) × CH da disciplina (FR-031.2)

A CH é a do cabeçalho de cada disciplina no próprio PDF (`CARGA HORÁRIA: N`, ou `CARGA HORÁRIA (TA)`
nos C-Espc). Das **155** disciplinas com item e CH lida (o APOC fica fora, porque não tem texto),
**155 têm Σ ≤ CH** e **nenhuma excede**. Os números sem valor entram com zero, então o resultado só
vale para o que o PDF informa. Os itens marcados *"2 itens declarados juntos"* ficaram sem número
nesta extração.

## 5. Divergências com a M-7 da spec (§15), para a T127

A M-7 avisa que veio de um leitor heurístico, e diz que a contagem oficial é esta. Mesmo assim, as
diferenças vão para a revisão:

- **C-Espc-FR:** a M-7 diz que `PREVACFR-008` e `MFMFR-003` não têm CH de avaliação. Esta extração lê
  as duas, com 7 e 8, e as duas fecham com os itens. A M-7 conta 15 disciplinas, 91 TA de aplicação e
  25 de vista. Aqui são 17, 101 e 31.
- **C-Espc-HN:** a M-7 dá a `HN-1114-0730` como *"quantidade sem tempo"*. O plano da disciplina (código
  `HN-1104-0730`, que diverge do sumário) traz uma OD com 17 TA mais 1 TA, e CH da avaliação 18. A M-7
  soma 86 e 26. Aqui são 111 e 30.
- **C-Esp-ALH:** a M-7 conta 12 avaliações. Aqui são **13**: I 1, II 3, III 1, IV 1, V 1, VI 1, VII 1,
  VIII 2 e IX 2. Ela também diz *"0 vistas"*, mas a sinopse geral (p. 4, alínea g) destina 1 TA de
  vista por prova.
- **C-Esp-OpAP:** a M-7 conta 5. Aqui são 4 linhas, e a PE da OPAP I e a da OPAP II são a **mesma
  prova**, o que daria 3 avaliações distintas.
- **C-Exp-MetocOf:** a M-7 conta 4 PM. Aqui são 4 PM mais a OD da V, que a M-7 cita na coluna do
  arbitrado.
