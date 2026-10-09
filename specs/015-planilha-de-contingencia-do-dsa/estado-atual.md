# Estado atual — as planilhas de controle do DSA, medidas

> **Primeiro artefato da spec 015** (pedido de Bernardo Villas Boas, 08/10/2026: *"Primeiro artefato:
> specs/<feature>/estado-atual.md, medindo as abas e fórmulas das planilhas reais de referência"*).
> Medido em **09/10/2026**.
>
> ⚠️ **NADA AQUI É REQUISITO: é estado do mundo.** O que vira requisito está na `spec.md`, com
> identificador. E nada aqui reabre o que a spec 013 já decidiu sobre o DSA do sistema.

---

## 0. A fonte, o método e o que NÃO foi copiado

**Artefato medido (regra 9.2):** as **7** planilhas `.xlsx` exportadas do Drive em **08/09/2026**, fora
do git (`.gitignore` linhas 59 e 60):

| Pasta | Arquivos |
|---|---|
| `Cursos Regulares/` | `CAHO_2026.xlsx`, `C-AP-FR 2026.xlsx`, `C-AP-HN 2026.xlsx`, `C-ESPC-HN 2026.xlsx`, `Cópia de C-AP-HN 2026 - Sabado.xlsx`, `ESPC-FR 2026.xlsx` |
| `Cursos Especiais-20260908T022148Z-1-001/Cursos Especiais/` | `C-ESP-ME 2026.xlsx` |

⚠️ **São 7, não as 15 do levantamento de 05/10/2026** (`specs/013-detalhe-semanal-de-aula/praticas-da-planilha.md`):
os expeditos de 5 semanas e o semipresencial não estão no disco. O que aquele levantamento mediu sobre
eles **não** foi remedido aqui.

**Método:** cada arquivo foi lido como pacote OOXML (ZIP), só com a biblioteca padrão do Python, por
três scripts de só leitura, fora do repositório: abas, dimensões, contagem de fórmulas, funções usadas,
**padrão** de cada fórmula (com as referências de célula trocadas por `REF` e os textos por `"…"`),
células mescladas, validações, formatação condicional, configuração de página e erros em cache.

⚠️ **NENHUM VALOR DE CÉLULA FOI COPIADO PARA CÁ.** A aba BD DISCIPLINAS traz **posto e nome de
instrutor real** a partir da linha 3, e o repositório é **público**. Deste documento constam só
**títulos de coluna**, códigos de disciplina, siglas e contagens.

---

## 1. As abas

| Aba | CAHO | C-Ap-FR | C-Ap-HN | C-Espc-HN | C-Ap-HN Sábado | C-Espc-FR | C-Esp-ME |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| PREENCHIMENTO | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ESPELHO | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| IMPRESSÃO | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| BD DISCIPLINAS | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| HORÁRIOS | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TECNICA DE ENSINO | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| CONTROLE | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| CRONOS | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| RESPONSÁVEIS | — | — | ✓ | ✓ | ✓ | — | — |
| DATAS AVALIAÇÕES | — | — | ✓ | ✓ *(nome: CONTROLE DATAS AVALIAÇ…)* | ✓ | — | — |
| CORREÇÕES CAC | ✓ | — | — | — | — | — | — |
| PROTOTIPO | ✓ | — | — | — | — | — | — |

**As 8 primeiras abas existem nas 7 planilhas**, o que confirma o `P-1` da spec 013 nesta amostra.
Nenhuma aba é oculta e **nenhuma é protegida**. Cada arquivo tem **um** nome definido,
`IntervaloNomeado1`, apontando para `'IMPRESSÃO'!$G$50:$J$52` ou `$J$53`.

### 1.1 O que cada aba pede e mostra (pelos títulos de coluna)

| Aba | Títulos de coluna medidos (`C-AP-HN 2026.xlsx`) |
|---|---|
| **PREENCHIMENTO** | cabeçalho `SIGLA DO CURSO:`, `Nº DE ALUNOS:`, `SEMANA <n>`, `QSA Nº`; colunas `DATA` · `TA` (1º a 9º) · `COD` · `N° U.E` · `TA` · `ESPELHO DO QSA IMPRESSO` |
| **BD DISCIPLINAS** | `CÓD` · `DISCIPLINA` · `Nº UE` · `CONCATENADO` (a chave COD+UE, ex. `I1`) · `UNIDADES DE ENSINO E TÓPICOS` · `CH` · `LOCAL` · `T/E` · `INSTRUTOR/PROFESSOR` · `CH CONCLUÍDA` · `CH RESTANTE` · `OK / PASSOU/ FALTA` |
| **HORÁRIOS** | `1º TEMPO` a `9º TEMPO`, cada um com `Quant. de TA` e `HORA` — a hora é uma **faixa até o fim do dia** (`07:50 as 16:20`, `07:50 as 15:30`…) |
| **CONTROLE** | `CÓD.` · `DISCIPLINA` · `CH. PREVISTA` · `CH. CUMPRIDA` · `% MATÉRIA` · `SITUAÇÃO` |
| **CRONOS** | `CÓD.` · `DISCIPLINAS` × `SEMANAS`, e à direita `CARGA HORÁRIA PREVISTA` · `CARGA HORÁRIA DISTRIBUÍDA` · `SITUAÇÃO` · `CARGA HORÁRIA RESTANTE` |

⚠️ **O documento ainda se chama "QSA" na entrada** (`QSA Nº`, `ESPELHO DO QSA IMPRESSO`) e "DSA" no
papel. É resíduo de nome antigo, não duas coisas.

### 1.2 O que se escolhe em lista

Três validações de lista em **PREENCHIMENTO**, todas com **valores literais** escritos na regra (não
apontam para uma faixa de BD DISCIPLINAS):

| Coluna | Valores medidos (`C-AP-HN 2026.xlsx`) |
|---|---|
| ALT (`A8`, `A68`, `A128`…) | `00` a `05` |
| COD (`D4:D48`, `D64:D108`…) | `I` a `XVIII` **e** as siglas `NT, PL, EC, TR, FR, LP, LA` |
| Nº U.E (`E4:E48`…) | `1, 1P, 2, 2P, 3…17`, `PM, PM1…PM4`, `TI, TI1, TI2`, `PG`, `PP, PP1…PP3`, `TG`, `VP, VP1…VP4`… |

⚠️ **A lista do COD é escrita à mão em cada planilha**: disciplina nova no catálogo não aparece na lista
até alguém editar a regra. É uma das formas do `D-6` (chave sem par).

---

## 2. Como o dado anda entre as abas

```
PREENCHIMENTO ──(cópia: PREENCHIMENTO!REF)──▶ ESPELHO ──(VLOOKUP na BD)──▶ IMPRESSÃO
      ▲                                          │                            │
      └──(3.328 refs 'IMPRESSÃO'!REF)────────────┼────────────────────────────┘
                                                 ├──▶ BD DISCIPLINAS (COUNTIF sobre o ESPELHO → CH concluída)
PREENCHIMENTO ──(COUNTIF)──▶ CONTROLE            └──▶ DATAS AVALIAÇÕES (MINIFS sobre o ESPELHO)
IMPRESSÃO ──(COUNTIF)──▶ TECNICA DE ENSINO
```

Os padrões que sustentam o desenho, contados em `C-AP-HN 2026.xlsx`:

| Aba | Padrão dominante | Vezes |
|---|---|--:|
| ESPELHO | `PREENCHIMENTO!REF` (cópia da entrada) | 3.330 |
| ESPELHO | `IF(AND(REF=REF, … 8 comparações),N,IF(AND(… 7),N,…))` — **detecta o tamanho do bloco** comparando a chave com as linhas vizinhas | 230 + 230 |
| IMPRESSÃO | `IF(REF="…","…",VLOOKUP(ESPELHO!REF,'BD DISCIPLINAS'!REF,N,N))` — o tópico, o local, a T/E e o instrutor pela chave | 4.756 |
| IMPRESSÃO | `IF(REF="…","…",VLOOKUP(REF,'HORÁRIOS'!REF,N,N))` — o horário do bloco | 1.544 |
| PREENCHIMENTO | `'IMPRESSÃO'!REF` — a entrada **lê o papel de volta** | 3.328 |
| BD DISCIPLINAS | `COUNTIF(ESPELHO!REF,REF)` — CH concluída **sobre a aba inteira** | 212 |
| CONTROLE | `COUNTIF(PREENCHIMENTO!REF,"…")` | 18 |
| TECNICA DE ENSINO | `COUNTIF('IMPRESSÃO'!REF,REF)` | 296 |

⚠️ **O `COUNTIF` sobre a aba inteira é o `D-5` em fórmula**: ele conta semana futura já planejada como
cumprida. ⚠️ **E o `VLOOKUP` pela chave concatenada é o `D-6`**: chave em dobro na BD faz o `VLOOKUP`
pegar a primeira, em silêncio.

---

## 3. Tamanho e forma

| Planilha | Fórmulas (todas as abas) | Fórmulas na IMPRESSÃO | Mescladas na IMPRESSÃO | Linhas da PREENCHIMENTO | Linhas da IMPRESSÃO | Tamanho do arquivo |
|---|--:|--:|--:|--:|--:|--:|
| CAHO | 35.346 | 16.856 | 2.822 | 2.759 | 3.124 | 1.083 KB |
| C-Ap-FR | 28.556 | 13.712 | 2.538 | 2.220 | 2.216 | 818 KB |
| C-Ap-HN | 32.771 | 13.251 | 2.579 | 2.220 | 2.737 | 873 KB |
| C-Espc-HN | 34.401 | 16.033 | 3.144 | 2.760 | 3.044 | 951 KB |
| C-Ap-HN Sábado | 34.097 | 13.939 | 2.676 | 2.230 | 2.836 | 900 KB |
| C-Espc-FR | 33.625 | 16.843 | 3.130 | 2.760 | 3.047 | 1.014 KB |
| C-Esp-ME | 19.702 | 7.693 | 1.424 | 1.260 | 1.260 | 554 KB |

- **A PREENCHIMENTO é um bloco fixo de 60 linhas por semana**: C-Esp-ME 21 semanas × 60 = 1.260;
  C-Ap-HN 37 × 60 = 2.220; CAHO e C-Espc 46 × 60 = 2.760. **A planilha cobre o ano inteiro da turma**,
  semana empilhada sobre semana.
- **A IMPRESSÃO empilha todas as semanas numa aba só, com ZERO quebras de página** nas 7. Imprimir
  uma semana é selecionar o trecho à mão — é por aí que entra o erro de imprimir a semana errada.
- A IMPRESSÃO é **paisagem** nas 7.

---

## 4. As fórmulas que só funcionam num dos dois programas

**Funções usadas, e em quantas das 7 planilhas** (`IF`, `SUM`, `COUNTIF`, `SUMIF`, `VLOOKUP`, `IFERROR`,
`NOW` e `AND` aparecem nas 7):

| Função | Planilhas | Onde | Existe no Excel? | Existe no Google Planilhas? |
|---|--:|---|:-:|:-:|
| `TO_DATE` | 7 | ESPELHO | **não** | sim |
| `__xludf.DUMMYFUNCTION` | 7 | ESPELHO | **não** — é o invólucro que o Google põe na **própria** função ao exportar | — |
| `DATEVALUE` | 6 | PREENCHIMENTO, ESPELHO | sim | sim |
| `CONCATENATE` / `CONCAT` | 6 / 5 | ESPELHO / BD DISCIPLINAS | sim | sim |
| `MINIFS` | 3 | DATAS AVALIAÇÕES | sim (2019+) | sim |
| `TODAY` | 3 | DATAS AVALIAÇÕES | sim | sim |

`DUMMYFUNCTION` e `TO_DATE` por planilha, ambos na ESPELHO: CAHO 139 · C-Ap-FR 139 · C-Ap-HN 1.059 ·
C-Espc-HN 1.251 · C-Ap-HN Sábado 1.149 · C-Espc-FR 139 · C-Esp-ME 139.

⚠️ **ISTO RESPONDE PELA METADE A `Q-4` DA SPEC:** as planilhas de hoje **só funcionam inteiras no
Google**. Aberto no Excel, o arquivo exportado mostra o **último valor calculado** dessas células e
não recalcula — a ESPELHO congela. Uma planilha que precise funcionar nos dois tem de usar só o
conjunto comum de funções.

---

## 5. Os defeitos, remedidos nesta amostra

| Defeito (spec 013) | O que foi medido aqui |
|---|---|
| **D-2** — erro visível | **2.367** fórmulas com `#REF!` no próprio texto, em **4 das 7**: C-Esp-ME 1.125 (todas na ESPELHO); C-Ap-FR, C-Ap-HN e a cópia do Sábado **414 cada** (405 na ESPELHO e 9 na TECNICA DE ENSINO). CAHO, C-Espc-HN e C-Espc-FR: **0**. E `#REF!` **em cache** na IMPRESSÃO: C-Espc-FR 11 · C-Ap-FR 9 · C-Espc-HN 7 · CAHO 1 · C-Esp-ME 1 · C-Ap-HN 0 · Sábado 0 |
| **D-3** — bloco que atravessa o almoço | a HORÁRIOS dá a hora como **faixa até o fim do dia** por quantidade de TA, e a IMPRESSÃO a busca por `VLOOKUP` — não há quebra no almoço no modelo |
| **D-5** — futuro contado como feito | `COUNTIF` sobre a aba inteira na BD DISCIPLINAS e na CONTROLE (§2) |
| **D-6** — chave sem par / em dobro | lista de COD escrita à mão (§1.2) e `VLOOKUP` pela chave concatenada (§2) |
| **D-7** — assinatura à mão | só 3 das 7 têm a aba RESPONSÁVEIS; nas outras 4 a assinatura não tem aba de origem |
| **D-1**, **D-4**, **D-8**, **D-9** | não remedidos aqui — valem as medições da spec 013 |

---

## 6. O que a v2.1 já tem, e que a planilha não pode reimplementar

A restrição da spec (*"sem segunda implementação de horário, grade ou situação"*) aponta para estas
peças, medidas no repositório em 09/10/2026:

| O que a planilha precisa | Quem já calcula | Onde |
|---|---|---|
| O relógio do regime vigente, tempo a tempo | `horario-do-bloco` | `lib/dominio/dsa/horario-do-bloco.ts` |
| A grade do papel no modelo v4 (dias × tempos, quebra no almoço) | `gradeDoPapel` | `lib/dominio/dsa/grade-do-papel.ts` |
| O documento impresso da semana (cabeçalho, linhas, rodapé, tabela de CH, técnicas) | `montarDocumentoDoDsa` | `app/print/dsa/documento.ts` |
| As assinaturas vigentes na data, com o posto por extenso | `assinaturas`, `posto-por-extenso` | `lib/dominio/dsa/assinaturas.ts`, `lib/dominio/posto-por-extenso.ts` |
| A situação por disciplina e por UE, a CH acumulada até a semana | `quadroDaDisciplina`, `quadroDaUnidade` | `lib/dominio/dsa/situacao.ts` |
| O número do DSA | `numeroDoDsa` | `lib/dominio/dsa/numero-do-dsa.ts` |
| Quem pode lançar; turma EAD sem DSA | `pode(…, "registros_aula", "criar")`; `ehEadPuro` | `app/(app)/turmas/[turma]/dsa/page.tsx`; `lib/dominio/dsa/ead-puro.ts` |
| A etapa presencial do semipresencial | `etapa-presencial` | `lib/dominio/dsa/etapa-presencial.ts` |

⚠️ **NÃO EXISTE ROUTE HANDLER NO REPOSITÓRIO** (nenhum `app/**/route.ts`, medido): a geração da
planilha seria o primeiro. ⚠️ **E a leitura do DSA é POR SEMANA** (`lerSemanaDoDsa`): uma planilha do
ano inteiro, montada por ela, faria uma leitura por semana — 21 a 46 por arquivo. É insumo da `Q-3`.

---

## 7. A medição da `Q-2` — a biblioteca

Medido em 09/10/2026, sem instalar nada:

| Alternativa | Versão | Licença | Tamanho desempacotado | Versão publicada em | Avisos de segurança (GitHub Advisory) |
|---|---|---|--:|---|---|
| `exceljs` | 4.4.0 | MIT | 21.314 KB | **19/10/2023** — quase três anos sem versão nova | 1 médio, corrigido na 1.6.0; **9 dependências** (`archiver`, `unzipper`, `jszip`, `tmp`, `uuid`, `dayjs`, `saxes`, `fast-csv`, `readable-stream`) |
| `xlsx` (SheetJS no npm) | 0.18.5 | Apache-2.0 | 7.323 KB | 24/03/2022 | **2 ALTOS sem correção no npm** — ReDoS (`< 0.20.2`) e poluição de protótipo (`< 0.19.3`); a correção só existe na distribuição própria do fornecedor, fora do npm |
| `write-excel-file` | 4.1.1 | MIT | 1.770 KB | 08/06/2026 | nenhum |
| **Nenhum pacote**: o OOXML escrito pelo próprio código | — | — | 0 | — | — |

⚠️ **A QUARTA LINHA É VIÁVEL, E HÁ PRECEDENTE NO REPOSITÓRIO:** `scripts/manutencao/md_para_docx.py`
já escreve OOXML (`.docx`) só com a biblioteca padrão. Para `.xlsx` o que falta é o contêiner ZIP — e o
Node desta máquina (**24.19.0**; `package.json` exige `>=22`) tem `zlib.deflateRawSync` **e**
`zlib.crc32`, medidos. O custo é escrever e testar o gerador; o ganho é **zero dependência**, que é o
padrão da plataforma (Princípio III.b não lista biblioteca de planilha).

---

## 8. O que esta medição NÃO cobriu

- As 8 planilhas do levantamento de 05/10/2026 que não estão no disco (expeditos e semipresencial).
- Os PDFs assinados — continuam medidos só pela spec 013 (§1.2 de `praticas-da-planilha.md`).
- O comportamento real ao **abrir** um `.xlsx` gerado no Excel, no Google Planilhas e no LibreOffice:
  só se mede com o arquivo gerado na mão, e isso é do plano.
- O banco remoto: não foi tocado (restrição da spec).
