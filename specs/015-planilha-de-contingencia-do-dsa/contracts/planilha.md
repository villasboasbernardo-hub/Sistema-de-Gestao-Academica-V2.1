# Contrato — a pasta de trabalho

**Spec**: `FR-005`, `FR-007` a `FR-026`, `FR-029` a `FR-031` · **Pesquisa**: R-4 a R-9, R-11, R-13

> ⚠️ **Isto é o desenho do PR 1** (`Q-5`): PREENCHIMENTO, IMPRESSÃO, BD DISCIPLINAS e HORÁRIOS. A
> CONTROLE e a CRONOS (§6) são do PR 2.

## 1. Regras gerais

| Regra | Valor |
|---|---|
| Abas, nesta ordem | PREENCHIMENTO · IMPRESSÃO · BD DISCIPLINAS · HORÁRIOS *(PR 2: CONTROLE · CRONOS)* |
| Aba ativa ao abrir | PREENCHIMENTO, rolada até a semana inicial (`topLeftCell`) |
| Mescla de células | **nenhuma**, em aba nenhuma (`Q-6`) |
| Proteção | **nenhuma**: nem de aba, nem de pasta, nem de célula (`FR-020`) |
| Colunas de apoio | **ocultas**, nunca protegidas, com o título *APOIO — não imprime* |
| Fonte | Arial — existe no Excel e no Google sem instalar nada |
| Fórmulas | só o vocabulário da R-4; texto em inglês com vírgula, como o OOXML exige; valor em cache em todas (R-5) |
| Datas | número de série com formato `dd/mm/yyyy` (R-13) |
| Recálculo | `fullCalcOnLoad="1"` |
| Instrução | a primeira linha de cada aba diz, em uma frase, o que se faz nela |

### Nomes definidos

| Nome | Aponta para |
|---|---|
| `LISTA_SEMANAS` | os rótulos das semanas, na ordem — fonte do seletor da IMPRESSÃO |
| `LISTA_COD` | os códigos distintos do catálogo, na ordem natural (algarismo romano pelo valor) e depois as categorias |
| `LISTA_ITEM` | os itens distintos do catálogo |
| `LISTA_INSTRUTORES` | os instrutores da turma, em antiguidade |
| `SIGLAS_AVALIACAO` | as siglas de `SIGLAS_DE_AVALIACAO` |
| `_xlnm.Print_Area` (IMPRESSÃO) | a área da semana impressa, sem as colunas de apoio |

## 2. PREENCHIMENTO — a entrada

**Topo, com o painel congelado** (`FR-005`): *PLANILHA DE CONTINGÊNCIA DO DSA — <turma>* · *gerada em
DD/MM/AAAA HH:MM por <nome>* · *lançamentos do sistema até DD/MM/AAAA HH:MM* · *É contingência: o
sistema continua sendo a fonte. O que for lançado aqui é relançado no sistema quando ele voltar.
Baixe de novo no início de cada semana.* · os avisos de degradação, quando houver · a **área de
conferência** (`FR-018`): quantas linhas da pasta têm chave sem par no catálogo, contadas sobre a
coluna *Conferência*, com a instrução de filtrar a coluna para achá-las.

**Um bloco por semana, com o MESMO número de linhas em todas** (é o que deixa a IMPRESSÃO achar a
semana por conta, sem `INDIRECT`):

1. **Cabeçalho da semana** — rótulo; nº do DSA (fórmula, R-6); nº de alunos; ALT; o id do relógio da
   semana; e as duas assinaturas (nome, posto por extenso, função) — tudo editável.
2. **Linhas de TA** — 6 dias (seg a sáb) × os TA da grade da pasta, com estas colunas:

   | Coluna | Conteúdo | Tipo |
   |---|---|---|
   | Data | a data | fixa |
   | Dia | `SEG`…`SÁB` | fixa |
   | TA | o número | fixa |
   | Horário | `HH:MM–HH:MM` pela HORÁRIOS | fórmula |
   | Período | manhã / tarde pela HORÁRIOS | fórmula, apoio |
   | **COD** | disciplina ou categoria | **entrada**, `LISTA_COD` |
   | **ITEM** | UE ou item | **entrada**, `LISTA_ITEM` |
   | Tópico / conteúdo | pela chave | célula de valor (sugerido ou escrito) |
   | Local | pela chave | célula de valor |
   | T/E | pela chave | célula de valor |
   | Instrutor | pela chave | célula de valor, `LISTA_INSTRUTORES` |
   | Código do lançamento | o `codigo` do sistema | fixo, vazio nas linhas novas |
   | Conferência | vazio, ou *"chave não existe no catálogo"* | fórmula (`FR-018`) |

3. **Sem posição** — os lançamentos da semana sem lugar na grade, com o motivo (`FR-013`).

Dia bloqueado: a linha do dia traz a descrição do feriado, e a entrada **não** é recusada.

## 3. IMPRESSÃO — o papel

- **Seletor** (`FR-022`): uma célula no topo, validada por `LISTA_SEMANAS`, que abre na semana
  inicial. A posição da semana é `MATCH(seletor, LISTA_SEMANAS, 0)`, e a linha de cada dado na
  PREENCHIMENTO é `início + (posição − 1) × altura do bloco + deslocamento` — `INDEX` com linha
  calculada, nunca `INDIRECT`.
- **Cabeçalho**, como o do `/print/dsa`: sigla do curso, código da turma, *DSA Nº*, *semana de X a Y*,
  nº de alunos e ALT, lidos do cabeçalho da semana.
- **Grade v4** (`RF-PDF-01`): dias em colunas — o sábado só na turma que tem sábado lançado no ano
  (`DP-3`) —, TA em linhas. Entre duas linhas de TA, uma linha
  estreita mostra o intervalo ou o **almoço** do relógio da semana escolhida. Cada dia tem duas
  colunas: uma faixa estreita, colorida pelo tipo do cartão, e a do conteúdo.
- **Bloco** (R-6, R-7, R-8): TA seguidos com a mesma chave, no mesmo período e com o mesmo código de
  lançamento são um bloco; o fundo alterna entre dois tons da cor do tipo a cada bloco do dia; o
  título vai em negrito na 1ª célula, o conteúdo na 2ª, o pé (instrutor · N TA · local · T/E) na 3ª.
- **Estudo Individual**: no TA seguinte ao último lançado no dia, como `slotDoEstudoIndividual`, com
  a nota de rodapé do sistema.
- **Abaixo da grade**: a lista do que não tem lugar nela, nunca omitida (`FR-013`).
- **Rodapé** (`FR-024`): CÓD · DISCIPLINA · CH PREVISTA · CH CUMPRIDA só das disciplinas da semana,
  com a cumprida até o fim da semana (R-6); a legenda só das técnicas usadas; a nota do Estudo
  Individual; as duas assinaturas; e, em letra pequena, *emitido pela planilha de contingência gerada
  em DD/MM/AAAA HH:MM*.
- **Listas compactadas sem função nova:** a CH do rodapé e a legenda são listas variáveis. Uma coluna
  de apoio numera os itens presentes (`COUNTIF`), e cada posição da lista é `INDEX`/`MATCH` pelo
  número — sem `FILTER` nem fórmula matricial.
- **Página** (`FR-022`, `SC-005`): A4 (`paperSize="9"`), paisagem, ajustada a 1 página de largura por
  1 de altura, margens estreitas, área de impressão sem as colunas de apoio.
- ⚠️ **A assinatura editada na IMPRESSÃO vale para TODAS as semanas**, porque a célula é uma só para o
  seletor inteiro — a instrução da aba manda editar no cabeçalho da semana, na PREENCHIMENTO.

## 4. BD DISCIPLINAS — o catálogo

Uma linha por `ItemDoCatalogo` (`data-model.md` §2.5): chave · COD · ITEM · tipo · disciplina ·
tópico · CH prevista · local · T/E · instrutor · conta no nº do DSA · disciplina da CH. Ordem: as
disciplinas na ordem natural, os itens de cada uma (UEs pelo número, depois *SEM UE*, avaliações,
*VISTA*, *AEC*) e, por fim, as categorias sem disciplina. Ao lado, as colunas de onde saem `LISTA_COD`,
`LISTA_ITEM`, `LISTA_INSTRUTORES`, `SIGLAS_AVALIACAO` e a CH prevista por disciplina.

## 5. HORÁRIOS — o relógio

Um bloco por relógio do período: id, vigência (de/até), origem (regime ou catálogo) e uma linha por
TA — nº, início, fim, período, excepcional — mais a chave `relógio|TA` que a PREENCHIMENTO busca.
**Não há** a coluna "quantidade de TA → horário até o fim do dia" das planilhas de hoje: é o modelo que
a `RN-CONF-02` proíbe portar (`praticas-da-planilha.md`).

## 6. PR 2 — CONTROLE e CRONOS

- **CONTROLE** (`FR-025`): por disciplina, CH prevista; CH lançada até a data de referência e CH
  restante, por soma; situação por fórmula nos três degraus que são conta, com as palavras de
  `situacao.ts`; e uma coluna própria, rotulada com a data da geração, com *Atrasada* ou *Conflitou*
  como **retrato** do sistema.
- **CRONOS** (`FR-026`): por disciplina × semana, os TA lançados, com CH prevista, distribuída e
  restante.

## 7. Invariantes — o que a suíte confere no arquivo gerado

| # | Invariante | Origem |
|---|---|---|
| I-P1 | Todas as partes do pacote presentes, XML bem formado, `[Content_Types]` cobrindo cada uma | R-1 |
| I-P2 | Nenhum valor de erro em cache (`#REF!`, `#N/A`, `#VALUE!`, `#DIV/0!`, `#NAME?`, `#NUM!`, `#NULL!`) | `FR-023` |
| I-P3 | Nenhuma cadeia `_xlfn.`; toda função dentro do vocabulário | `FR-031` |
| I-P4 | Toda fórmula, avaliada pela árvore, dá o valor em cache | R-4, R-5 |
| I-P5 | Em toda semana com lançamento, a IMPRESSÃO com o seletor naquela semana tem o conteúdo de `montarDocumentoDoDsa` — linhas, horários, CH do rodapé, técnicas e assinaturas | `FR-012`, `SC-003` |
| I-P6 | Chaves do catálogo únicas e sem curinga | `FR-008` |
| I-P7 | Zero `mergeCell` | `Q-6` |
| I-P8 | Zero `sheetProtection` e `workbookProtection` | `FR-020` |
| I-P9 | Instrutores da lista ⊆ instrutores da turma; nenhuma coluna de dado pessoal lida | `FR-029` |
| I-P10 | Cada reexpressão da R-6 dá o mesmo resultado que a função do domínio, sobre o dado gerado | R-6 |
| I-P11 | Mudar um item do catálogo muda as linhas **sugeridas** e **nenhuma** linha escrita | `SC-006` |
| I-P12 | Cada semana da `LISTA_SEMANAS` seleciona exatamente uma semana, e a página está ajustada a 1 × 1 | `SC-005` |
| I-P13 | As cores do arquivo são as de `app/print/dsa/documento.css` | R-7 |
