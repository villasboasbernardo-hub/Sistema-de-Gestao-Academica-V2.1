# Conferência dos currículos por agentes — Fase 0 do plano da fatia (b)

**Feita em 24/09/2026 (noite) e 25/09/2026 (madrugada)**, antes de desenhar a carga das UEs, como
Bernardo pediu. **Nada foi gravado no banco.** Todo número abaixo nomeia o artefato (regra 9.2), e toda
divergência traz a **página** do PDF.

## 1. Método

1. **Leitura independente** — **24 subagentes, um por currículo** (`SIS11/Curriculos/`, 24 PDFs,
   inclusive os dois por competências e o digitalizado), em paralelo, **sem consultar a saída do
   extrator, o CSV/JSON versionado nem o banco**. Cada um devolveu JSON estruturado: identificação
   (sigla, órgão, ano, Ofício ou capa), e por disciplina o nome, a CH e as UEs com número, tópico, CH e
   **página**. ⚠️ **Nota de método**: a ferramenta de leitura de PDF dos agentes não renderiza página
   nesta máquina (falta `pdftoppm`); os 23 PDFs com camada de texto foram lidos **pelo texto do próprio
   PDF, página a página, com PyMuPDF** — leitura independente do extrator, mas não "olhando a imagem".
   O `EST-QF-APOC` (sem texto) foi lido **pelas imagens** das 6 páginas rasterizadas (150–170 dpi).
   ⚠️ Seis leituras caíram por limite de sessão da API perto da meia-noite; **4 já tinham gravado o
   JSON** e **2** (`C-Ap-FR`, `C-Ap-HN`) foram **reexecutadas** em 25/09.
2. **Comparação** (`%TEMP%\conferir.py`, sessão de 25/09) de cada leitura com **(a)** o extrator
   **corrigido para a grafia `DEENSINO`** (`scripts/etl/extrair_unidades_ensino.py`, reexecutado: 135
   disciplinas, 582 UEs, invariante 135/135) e **(b)** o banco local, retrato do remoto
   (`remoto-20260924-153818.sql`, 175 disciplinas).
3. **Segunda verificação** — **4 subagentes** reabriram **só as páginas citadas** de cada divergência e
   deram veredito (*confirmado / refutado / incerto*), gravado em `scratchpad/vereditos/*.json`. O que
   os dois não confirmaram seria *incerta*.
4. Incluídos: a tabela de destino por UE da **N-3** e as exceções da **Q-05**.

## 2. Totais remedidos

| Medida | Leitura independente | Extrator corrigido | Banco |
|---|---|---|---|
| currículos | **24** (21 por UE + 1 digitalizado por UE + 2 por competências) | 21 com UE | 24 cursos |
| disciplinas | **167** = 136 em currículos por UE (135 + 1 do APOC) + 31 por competências (17 + 14) | **135** | 175 |
| UEs | **587** = 582 + **5** do APOC (transcritas de imagem) | **582** | 0 |
| invariante *soma das UE = CH* | fecha em **135 de 136** — a exceção é o APOC (80 × 79, **explicada pelo próprio PDF**, §4.1) | 135/135 | — |
| itens marcados *incerto* pelos leitores | **3**, todos no `C-Espc-HN`, todos sobre **código** de disciplina divergente dentro do PDF (§4.4) — nenhum sobre nome, CH ou UE | — | — |

**Leitura × extrator (disciplinas com UE): zero divergência de disciplina, de contagem de UE ou de
CH.** Sobraram **2** de grafia de tópico no `C-Ap-HN` — translineação com hífen que o extrator vira
espaço (*"PRÁTI CAS"*, p. 34; *"AEROFOTOGRA METRIA"*, p. 54) e os leitores reuniram. É achado do
**extrator**, corrigido no PR 2. A expectativa de Bernardo (*~582 UEs / 135 disciplinas com a
TOPOGRAFIA*) **confere**; com o APOC, a carga candidata é **587 UEs em 136 disciplinas**.

## 3. Curso a curso

*Conforme* = o banco tem as mesmas disciplinas, com a mesma CH (salvo grafia), e o currículo diz o
que o banco diz. Tudo o que não é conforme está explicado em §4 com página.

| Curso | Modelo | Disc. currículo / banco | UEs | Ofício / capa | Veredito |
|---|---|---|---|---|---|
| `CAHO` | UE | 21 / 22 | 132 | Of nº 10-6/2025 (Anexo A) | **divergência** — `MATFIS` desdobrada em `MAT` + `FIS` (§4.2) |
| `C-Ap-FR` | UE | 13 / 13 | 60 (TOPOGRAFIA: 10) | Of nº 10-6/2025 (Anexo C) | **divergência** — `III` 76 × 75 (§4.3) |
| `C-Ap-HN` | UE | 18 / 19 | 95 | Of nº 10-6/2025 (Anexo B) | **divergência** — `HN-2101` desdobrada em `I` + `I-I` (§4.2) |
| `C-ApA-AuxNav-PR-SP` | UE | 7 / 8 | 17 | Of nº 10-26/2022 | **nota** — ambientação 8 h = banco 8 (§4.5) |
| `C-ApA-OcOp-PR-SP` | UE | 10 / 11 | 26 | Of nº 10-16/2023 | **divergência** — ambientação 10 h × banco 8 (§4.5) |
| `C-ApA-PCN-PR-EAD` | UE | 7 / 8 | 18 | Of nº 10-31/2022 | **divergência** — ambientação 5 h × banco 8 (§4.5) |
| `C-ApA-PrevMe-PR-EAD` | UE | 7 / 8 | 25 | Of nº 10-27/2022 | **divergência** — ambientação 5 h × banco 8 (§4.5) |
| `C-Esp-ALH` | UE | 9 / 9 | 21 | Of nº 10-16/2020 | conforme |
| `C-Esp-ME` | UE | 12 / 12 | 62 | Of nº 10-22/2025 | conforme |
| `C-Esp-OpAP` | UE | 4 / 4 | 9 | Of nº 10-20/2025 | conforme |
| `C-Exp-Ag-Mag` | UE | 2 / 2 | 6 | Of nº 10-24/2025 | conforme |
| `C-Exp-BATI` | UE | 1 / 1 | 9 | Of nº 10-17/2025 | conforme |
| `C-Exp-MetocOf` | UE | 5 / 5 | 27 | capa: DEnsM/DHN, 2011 | **divergência** — `I` 48 × 30, `V` 40 × 50 (§4.3) |
| `C-Exp-Metoc-OF-SP` | UE | 4 / 6 | 24 | Of nº 10-16/2025 | **divergência** — ambientação (8 = 8) e a `IV` emprestada (§4.5, §4.6) |
| `C-Exp-Obs-ME` | UE | 2 / 2 | 9 | capa: DEnsM/DHN, 2011 | conforme |
| `EST-QF-APHID` | UE | 5 / 5 | 15 | capa: CIAARA, 2023 | conforme |
| `EST-QF-APOC` | UE (imagem) | 1 / 1 | **5** | capa: CIAARA, 2021 | conforme (79 = 79; UEs somam 80, §4.1) |
| `EST-QF-EM2040PHS` | UE | 3 / 3 | 6 | capa: CIAARA, 2024 | conforme |
| `EST-QF-MAREFLU` | UE | 1 / 1 | 4 | capa: CIAARA, 2026 | conforme |
| `EST-QF-NAVFLU-EAD` | UE | 1 / 1 | 7 | capa: CIAARA, 2026 | conforme |
| `EST-QF-PGRS100` | UE | 2 / 2 | 9 | capa: CIAARA, 2025 | conforme |
| `EST-QF-PROC-MF-EAD` | UE | 1 / 1 | 1 | capa: CIAARA, 2024 | conforme |
| `C-Espc-FR` | competências | 17 / 17 | 0 | Of nº 10-82/2024 (Anexo A) | **divergência** — 2 nomes/códigos do HN, TFM 47 × 48, códigos (§4.4) |
| `C-Espc-HN` | competências | 14 / 14 | 0 | Of nº 10-82/2024 (Anexo B) | **divergência** — NAV I/II 100/128 × 108/120 (§4.3) |

**13 conformes · 11 com divergência, todas confirmadas pela segunda verificação · 0 incertas.**

## 4. Divergências — confirmadas pela segunda verificação, com página

### 4.1 APOC — candidato à carga, transcrito de imagem (F1–F4)

| O que | Currículo (imagem, p.) | Banco | Veredito |
|---|---|---|---|
| disciplina | `I` AQUISIÇÃO E PROCESSAMENTO DE DADOS OCEANOGRÁFICOS, **79 HORAS** (p. 4 quadro, p. 5 sumário) | `I`, 79 | confirmado |
| UEs | 1 INTRODUÇÃO À OCEANOGRAFIA 9 · 2 AQUISIÇÃO DE DADOS NOS MEIOS DA MB 18 · 3 CORRENTOMETRIA 9 · 4 ANÁLISE DOS DADOS 20 (p. 5) · 5 ATIVIDADES PRÁTICAS 24 (p. 6) | — | confirmado, legibilidade **alta**, nenhum número ambíguo |
| soma 80 × CH 79 | *"CARGA HORÁRIA REAL 79 HORAS \| TEMPO RESERVA 1 HORA \| CARGA HORÁRIA TOTAL 80 HORAS"* (p. 4); *"56 horas teóricas (UE 1 a 4) e 24 práticas (UE 5)"* (p. 6) | — | confirmado — divergência **interna e explicada**; o PDF não diz de qual UE sai a hora de reserva |

**Encaminhamento (R-3)**: as 5 UEs entram como candidatas, marcadas *"transcrito de imagem"*;
`PEND-5b-3` fecha; a asserção de soma exclui nominalmente esta disciplina, e a tela avisa (Q-06).

### 4.2 Desdobramentos — a tabela de destino por UE da N-3 (A1, A2, I1, I2)

| Currículo | Página | Banco | Destino por UE | Veredito |
|---|---|---|---|---|
| `CAHO` · `XXI - MATFIS - NIVELAMENTO DE MATEMÁTICA E FÍSICA`, 56 h — **uma** disciplina | quadro p. 8; sumário p. 72–73 | `MAT` 28 + `FIS` 28 | UE 1 *EMPREGO DOS CONCEITOS DE MATEMÁTICA…* 28 → `20 - CAHO - MAT`; UE 2 *EMPREGO DOS CONHECIMENTOS DE FÍSICA…* 28 → `… - FIS` | **confirmado** (2 UEs, 28 + 28, 1 PM por UE) |
| `C-Ap-HN` · `HN-2101-0621 MATEMÁTICA E FÍSICA APLICADAS À HIDROGRAFIA`, 126 h — **uma** disciplina, um sumário, um guia de estudos | quadro p. 6; sumário p. 8–9 | `I` 105 + `I-I` 21 | UEs 1–6 (48 + 21 + 11 + 7 + 3 + 15 = 105) → `41 - C-Ap-HN - I`; UE 7 *FÍSICA* 21 → `… - I-I` | **confirmado**; a UE 7 tem SUEs só de física (7.1–7.5) e PM própria, mas *"código, CH, objetivo, diretriz e guia são únicos — nada no PDF a chama de disciplina"* |

**A tabela da N-3 está confirmada com página → aceita** (decisão condicional de Bernardo, 24/09/2026).
O desdobramento é **escolha do banco**, não do currículo; as duas linhas ficam (Q-05: sem fundir).

### 4.3 CH divergente entre banco e currículo — confirmadas (H1, B1, B2, D2, E1)

| Curso · disciplina | Banco (tempos) | Currículo | Página | Veredito |
|---|---|---|---|---|
| `C-Ap-FR` · `III` EQUIPAMENTOS DE AUXÍLIOS À NAVEGAÇÃO | 76 | **75** (UEs 20 + 22 + 33) | 6, 12 | confirmado — *"o 76 não tem respaldo"* |
| `C-Exp-MetocOf` · `I` METEOROLOGIA | 48 | **30** | 4, 5 | confirmado |
| `C-Exp-MetocOf` · `V` ESTÁGIO PRÁTICO | 40 | **50** (UEs 24 + 26) | 4, 15 | confirmado |
| `C-Espc-FR` · TREINAMENTO FÍSICO MILITAR (`TFMFR-004`) | 47 | **48** TA | 7, 21 | confirmado |
| `C-Espc-HN` · NAVEGAÇÃO I (`HN-1106-0423`) | 100 | **108** TA | 7, 32 | confirmado — *"não estão trocados em fonte nenhuma"*: soma 228 nos dois lados, é **redistribuição** |
| `C-Espc-HN` · NAVEGAÇÃO II (`HN-1107-1011`) | 128 | **120** TA | 7, 45 | confirmado |

⚠️ **`C-Exp-MetocOf`, achado C2**: os 48 / 19 / 37 / 40 do banco **batem com o currículo do
`C-Exp-Metoc-OF-SP` (2025)**, não com o do `C-EXP-METOC-OF` (2011, 30 / 19 / 37 / 18 / 50); e o **18**
da `IV` só existe no de 2011 — *"o banco não é cópia integral de nenhum dos dois"*. Fica a dúvida
**P-2** do lote.

### 4.4 Cursos por competências — o que nunca tinha sido comparado (D1–D5, E1–E3)

| Achado | Página | Veredito |
|---|---|---|
| **Nenhuma** `LISTA DE UNIDADES DE ENSINO` nas 127 páginas do FR nem nas 146 do HN — "UNIDADE" só como unidade de medida, "oportunidade" e a *Subunidade de Ensino (SUE)* dos anexos de palestra (AEC) | FR 7, 9, 16, 110–111 · HN 17, 34, 59–61, 74, 103, 127–128 | confirmado → `curriculo_modelo = 'competencias'` |
| `C-Espc-FR`: banco *FÍSICA APLICADA À HIDROGRAFIA* `HN-1104-0506` × currículo *FÍSICA APLICADA AOS AUXÍLIOS À NAVEGAÇÃO* `FAANFR-005`, 30 TA — o código do banco é o da física do **HN** | 2, 7, 15 | confirmado |
| `C-Espc-FR`: banco *PRIMEIROS SOCORROS* `SN-1103-0506` × currículo *PRIMEIROS SOCORROS EM FARÓIS* `PSFFR-014`, 40 TA — código do banco é o do **HN** | 8, 80 | confirmado |
| `C-Espc-FR`: dos 17 códigos do banco, **3** no PDF (índice e plano), **1** só no índice (`EQUFR-010`), **13 em nenhum** — o banco renumerou sufixos em sequência; o PDF os traz fora de ordem (001, 005, 002, 008, 006, 003, 007, 004, 010, 011, 010, 12, 011, 013, 014, 015) e diverge de si (`PPREVACER-008` × `PREVACFR-008`, `EQUFR-010` × `EQUIFR-010`, `FANAVFR-12` × `-012`) | 2, 26, 53, 67 | confirmado |
| `C-Espc-HN`: os 3 *incertos* dos leitores — *PRIMEIROS SOCORROS* `SN-1103-0506` (índice) × `HN-1113-0508` (plano, p. 94, com rodapé *"Of nº 10-12/2024 … B-94 de 128"*: página colada de versão anterior); *HIDROGRAFIA APLICADA* `HN-1114-0730` × `HN-1104-0730` (p. 98); *TOPOGRAFIA* com código **em branco** no plano (p. 73). O banco usa os do índice | 2, 73, 94, 98 | confirmado — divergência **interna** do PDF |
| Os 4 nomes abreviados do banco (`MAANFR-001` *AUX. À NAV.*, `MFMFR-007` *FERRA.*, `EQUFR-010` *EQUIP.*, `ESTANFR-012`) pareiam com o currículo por extenso — **grafia**, não divergência | 12, 39, 53, 63 | pareado |

**Nada disto é desta carga** (Q-13: não renomear; cursos sem UE). Vai para `PEND-5b-2` com página.

### 4.5 AMBIENTAÇÃO — fase no currículo, disciplina no banco (G1–G5)

Nos 5 cursos semipresenciais/EAD a AMBIENTAÇÃO **só aparece na composição da carga horária**
(sinopse e rodapé da aprovação), **nunca** no quadro *"DISCIPLINAS E CARGAS HORÁRIAS"* — as disciplinas
numeradas somam sempre a CH **sem** ela. O banco a modela como disciplina *AMBIENTAÇÃO VIRTUAL*,
`cod_disciplina = '-'`, **8 tempos nos cinco**:

| Curso | Currículo (h) | Páginas | Banco | Veredito |
|---|---|---|---|---|
| `C-ApA-AuxNav-PR-SP` | **8** | 3, 4, 6 | 8 | confirmado — bate |
| `C-ApA-PCN-PR-EAD` | **5** | 3, 5 | 8 | confirmado — **diverge** |
| `C-ApA-PrevMe-PR-EAD` | **5** | 3, 5 | 8 | confirmado — **diverge** |
| `C-ApA-OcOp-PR-SP` | **10** | 3, 4, 6 | 8 | confirmado — **diverge** |
| `C-Exp-Metoc-OF-SP` | **8** | 3, 4, 6 | 8 | confirmado — bate |

Para a carga: as 5 ficam `sem_unidades_ensino = true` (D-B3 por disciplina). A CH é dúvida **P-1**.

### 4.6 Disciplina emprestada — `C-Exp-Metoc-OF-SP` `IV`

O currículo SP tem 4 disciplinas (Metoc-I 48, II 19, III 37, IV ESTÁGIO PRÁTICO 40; C1 confirmado,
p. 3 e 6); o banco tem 6 — as 4, a AMBIENTAÇÃO e *`IV` EFEITOS ATMOSFÉRICOS SOBRE A PROPAGAÇÃO
ELETROMAGNÉTICA / C-Exp-METOC-OF*, 18 tempos, que é a `IV` do currículo **de 2011** (B3, p. 4).
Fica **sem UE** nesta carga (`PEND-5b-5`).

### 4.7 Confirmações que fecham achados do specify (H2, H3, A3, I3, I4)

- TOPOGRAFIA de `C-Ap-FR` (p. 23–24): cabeçalho verbatim *"LISTA DE UNIDADES DEENSINO"*, **10 UEs**
  (4, 4, 3, 10, 5, 16, 10, 14, 20, 14 = 100) — **confirmado**; o extrator corrigido já as lê.
- Os nomes que o banco perdeu ("FIM"): `C-Ap-FR` `XIII` *PRÁTICA DE FIM DE CURSO EM MANUTENÇÃO DE
  AUXÍLIOS À NAVEGAÇÃO* 160 h (p. 6); `CAHO` `XVIII` *LEVANTAMENTO **HIDROCEANOGRÁFICO** DE FIM DE
  CURSO* 200 h (p. 8); `C-Ap-HN` `XVIII` *LEVANTAMENTO **HIDROGRÁFICO** DE FIM DE CURSO* 160 h (p. 6) —
  **confirmados**; TFM = *TREINAMENTO FÍSICO MILITAR* nos três (40 / 70 / 40 h).
- `C-Ap-HN` `II` *INFORMÁTICA APLICADA À HIDROGRAFIA* 51 h (p. 6, 11) — confirmado (banco *INFO.*).

## 5. Divergências internas dos próprios PDFs — registradas, sem efeito na carga

`C-Ap-HN` XVIII `HN-2118-0450` (quadro p. 6) × `HN-2118-1016` (sumário p. 54); `C-Ap-HN` códigos com
espaço interno (`HN-2102- 0150`, `HN-2111- 1212`, `HN- 2116-0407`); `C-ApA-AuxNav-PR-SP` fase a
distância 220 h (p. 3) × 202 h (p. 6); `C-ApA-PCN-PR-EAD` rótulo *"FASE PRESENCIAL: 325"* num EAD
(p. 3) e disciplina VI/VII com nome diferente entre índice, quadro e sumário; `C-Exp-Metoc-OF-SP`
112 h (2.1 b) × 104 h (quadros); `EST-QF-PGRS100` aprovação 29/08/2025 (p. 4) × assinatura
25/08/2025 (p. 9); `EST-QF-PROC-MF-EAD` e `EST-QF-APHID` *"DE DE DADOS"* **está no PDF** (cabeçalho do
sumário), não é artefato da extração; `C-Esp-ALH` *RETROSPALHAMENTO* × *RETROESPALHAMENTO*; grafias
*"1 HORA"*, *"LISTAS DE UNIDADES"*, *"LISTA DE UNIDADE"* etc. Tudo está nos JSONs de leitura.

## 6. Incertas

**Nenhuma.** Todas as divergências leitura × banco foram reabertas e confirmadas; os 3 itens que os
leitores marcaram *incerto* eram divergências de código **dentro** do PDF do `C-Espc-HN`, confirmadas
como tais (§4.4).

## 7. Artefatos

- Leituras: `scratchpad/leituras/<arquivo>.json` (24) — não versionadas; o PR 2 versiona o que a carga
  usa (`pareamento_ue.csv`) e a conferência reexecutável (`conferir_unidades_ensino.py`).
- Vereditos: `scratchpad/vereditos/{caho-metoc,espc-fr-hn,apoc-ambientacao,ap-fr-hn}.json` (30 itens,
  **30 confirmados**, 0 refutados, 0 incertos).
- Comparação: `%TEMP%\conferir.py` → `conferencia.json` (29 divergências brutas, todas classificadas
  acima).
