# Pesquisa — Planilha de contingência do DSA (spec 015)

**Data**: 09/10/2026 · **Entrada**: `spec.md` (clarify de 09/10/2026, 8 respostas) e `estado-atual.md`

> Cada decisão traz **o que foi escolhido**, **por quê** e **o que foi descartado**. Número sem
> artefato nomeado não entra (regra 9.2); o que ainda não foi medido aparece como `[pendente]`
> (regra 9.3).

## 0. Medições que sustentam esta página

| O quê | Valor | Contra qual artefato |
|---|---|---|
| Turmas com DSA (presencial + semipresencial) | **22** de 28 (17 + 5; 6 EAD) | retrato `remoto-20261008-212706.sql` (backup do remoto de 08/10/2026 21:27, fora do git) |
| Maior período de turma | **50** semanas (1 turma sem período cadastrado) | o mesmo retrato, `data_termino − data_inicio` |
| Maior volume de lançamentos de uma turma | **676** (aulas + avaliações + atividades ativas, `CAHO 2026`) | o mesmo retrato |
| Disciplinas ativas por curso / UEs ativas por curso | até **22** / até **132** | o mesmo retrato |
| Vigências de regime ativas por curso | até **2** | o mesmo retrato |
| Aulas ativas sem `ta_inicial` | **0** | o mesmo retrato |
| Teto de linhas por resposta da interface de dados | **1.000** | `supabase/config.toml:18` (`max_rows`) |
| Consultas da leitura de uma semana do DSA | **16** numa rodada, mais o catálogo de horários e a RPC de conflitos em sequência | `app/(app)/turmas/[turma]/dsa/leitura.ts:210` a `:337` (contadas sem comentário), `:353`, `:519` |
| Consultas dos extras da impressão | **4** numa rodada | `leitura.ts:770` |
| Node desta máquina / exigido | **24.19.0** / `>=22` | `node --version`; `package.json` (`engines`) |
| Excel nesta máquina | **Microsoft 365** 16.0.20430.20092 (x86) e um **Excel 2007** 12.0.4518.1014 | `Root\Office16\EXCEL.EXE`, chave `ClickToRun\Configuration`; `Office12\EXCEL.EXE` |
| Formatação condicional no Google Planilhas | só **negrito, itálico, tachado, cor do texto e cor de fundo** — sem borda | documentação do Google, `developers.google.com/workspace/sheets/api/samples/conditional-formatting`, consultada em 09/10/2026 — **a conferir no arquivo real (R-12)** |
| Guarda "toda tela tem caminho" | lê **só** `page.tsx` | `tests/unidade/toda-tela-tem-caminho.test.ts:67` |
| Route Handlers no repositório | **0** | `estado-atual.md` §6 |

⚠️ **A base local está LIMPA hoje (0 turmas)** — por isso os volumes acima vêm do retrato datado, e
não do banco local. Nenhum dado do remoto foi lido nesta etapa: o retrato é o arquivo que o rito de
backup de 08/10/2026 já tinha deixado em disco.

---

## R-1 — O `.xlsx` é montado pelo próprio sistema, sem pacote (`Q-2`)

- **Decisão:** um escritor de OOXML próprio, em `lib/planilha/`, que monta o pacote ZIP com
  `node:zlib` (`deflateRawSync` para comprimir) e um CRC-32 por tabela própria. Partes:
  `[Content_Types].xml`, `_rels/.rels`, `docProps/core.xml` e `app.xml`, `xl/workbook.xml` (abas,
  nomes definidos, área de impressão, `calcPr fullCalcOnLoad="1"`), `xl/styles.xml`,
  `xl/sharedStrings.xml` e uma `xl/worksheets/sheetN.xml` por aba.
- **Por quê:** é a resposta da `Q-2`; o repositório já escreve OOXML com a biblioteca padrão
  (`scripts/manutencao/md_para_docx.py`). O formato é texto, e cada parte se confere linha a linha
  num teste.
- **Por que o CRC-32 é próprio:** `zlib.crc32` existe nesta máquina (Node 24.19.0, conferido), mas o
  `engines` aceita a 22.0, e a documentação do Node o dá só a partir da 22.2.0. A tabela de 256
  entradas são dez linhas, e o teste a confere contra `zlib.crc32` onde ele existir.
- **Cadeias compartilhadas, não em linha:** tópico, local e instrutor se repetem milhares de vezes
  como valor em cache (R-5); a tabela de cadeias compartilhadas deixa o arquivo menor. Tamanho e tempo
  reais: **[pendente — medir no PR 1, na turma de 50 semanas]**.
- **Descartadas:** `exceljs` 4.4.0 (21 MB, 9 dependências, sem versão nova desde 19/10/2023); `xlsx`
  do npm (2 avisos ALTOS sem correção lá); `write-excel-file` 4.1.1 fica como **saída de emergência**,
  só com o aceite de Bernardo, se o PR 1 medir custo desproporcional (`estado-atual.md` §7).

## R-2 — O ano inteiro se lê numa rodada, e a montagem da semana é UMA só

- **Decisão:** a leitura do DSA se divide em duas metades:
  1. `lerPeriodoDoDsa(supabase, { turmaId, cursoId, de, ate })` — as mesmas consultas de hoje, com a
     janela do período inteiro, numa rodada de `Promise.all`;
  2. `montarSemanaDoDsa(dadosDoPeriodo, semana)` — **tudo o que hoje vem depois das consultas** em
     `lerSemanaDoDsa`: recorte da semana, vigência, relógio, fatos, `montarSemana`.

  `lerSemanaDoDsa` passa a ser `montar(await lerPeriodo(janela da semana), semana)` — a tela do DSA
  e o `/print/dsa` continuam chamando a mesma função, com o mesmo resultado. A planilha chama
  `lerPeriodoDoDsa` **uma vez** para o ano e `montarSemanaDoDsa` para cada semana.
- **Por quê:** a restrição de Bernardo — *"sem segunda implementação de horário, grade ou situação"*
  — vale também para o mapeamento linha → fato que vive em `leitura.ts`. Uma leitura do ano com
  mapeamento próprio seria a segunda implementação dele.
- **A prova:** um teste de invariante contra o banco local semeado compara, semana a semana,
  `montarSemanaDoDsa(lerPeriodoDoDsa(ano), s)` com `lerSemanaDoDsa(s)`; e a suíte inteira do DSA
  (unidade e ponta a ponta) tem de passar sem mudar uma asserção.
- **Descartadas:** (a) chamar `lerSemanaDoDsa` uma vez por semana — 50 semanas × 18 idas ao banco
  (16 numa rodada, mais o catálogo de horários e a RPC de conflitos) = **900 requisições por
  download**, antes dos extras da impressão, e `await` em laço é proibido em `app/**`; (b) uma leitura do ano
  com mapeamento próprio — a segunda implementação.
- ⚠️ **É A ÚNICA MUDANÇA EM CÓDIGO QUE A OPERAÇÃO USA TODO DIA**, e por isso vai em commit próprio,
  antes de qualquer linha da planilha (ver `plan.md` §Riscos).

## R-3 — Leitura sem truncamento silencioso: páginas de 1.000 até acabar (`DP-5`)

- **Decisão** *(Bernardo Villas Boas, 09/10/2026: "a leitura busca em páginas de 1.000 até acabar,
  para o DSA e para a planilha. NÃO recusar acima de 1.000")*: toda consulta de **lista** da leitura do
  DSA — a da tela, a do `/print/dsa` e a da planilha — passa por um leitor paginado único,
  `lib/supabase/paginacao.ts`:
  1. a primeira página vem com `count: "exact"`;
  2. as páginas que faltam, já sabido o total, vêm todas numa rodada só de `Promise.all`, por
     `.range()`;
  3. cada consulta paginada tem **ordem total** — a ordem que ela já tinha, mais um desempate por chave
     única —, senão duas páginas podem repetir ou pular linha.
- **Nenhuma recusa:** acima de 1.000 linhas a leitura simplesmente lê tudo. O `FR-006` (frase de erro,
  nunca arquivo pela metade) continua valendo para **falha** de leitura, não para volume.
- **Por que contagem + `Promise.all`, e não um laço que pede a próxima página:** a guarda `FR-045`
  (`tests/unidade/fronteira-das-telas.test.ts:230`) reprova `await` dentro de laço em `app/**`, e
  sabido o total as páginas são independentes. O resultado é o mesmo — todas as páginas, até acabar.
- **Por quê:** `max_rows = 1000` corta a resposta **sem erro**. Medido: a turma de maior volume tem
  **676** lançamentos no retrato de 08/10/2026 — abaixo do teto hoje, **perto dele no fim do ano**.
- ⚠️ **ACHADO, e ele não é desta spec:** as leituras acumuladas de hoje (`ocupacaoAcumulada`,
  `aulasPorUe`, as datas do número do DSA em `lerExtrasDaImpressao`) têm o **mesmo risco**, sem
  guarda — e é por isso que a `DP-5` manda corrigir **junto**, no commit da refatoração.
- **A prova:** um invariante semeia uma turma sintética com **mais de 1.000** lançamentos e confere
  que o nº do DSA e a CH acumulada da leitura **batem** com a contagem direta no banco. ⚠️ **Ele é
  escrito e rodado ANTES da paginação, e tem de reprovar** com a leitura de hoje — é o caso que
  discrimina (DoD 8); só depois a paginação o deixa verde.

## R-4 — Fórmula como árvore tipada: um vocabulário fechado que se escreve e se avalia

- **Decisão:** nenhuma fórmula é escrita como texto livre. O gerador monta árvores com um conjunto
  **fechado** de nós (`lib/planilha/formula.ts`): referência, intervalo, número, texto, lógico,
  operadores (`&`, `=`, `<>`, `<`, `<=`, `>`, `>=`, `+`, `-`, `*`, `/`) e as funções `IF`, `IFERROR`,
  `AND`, `OR`, `NOT`, `INDEX`, `MATCH` (só correspondência exata), `COUNTIF`, `COUNTIFS`, `SUMIFS`,
  `MAX`, `MIN`, `LEN`, `CHAR`, `DAY`, `MONTH`, `YEAR` e `RIGHT`. A árvore sabe **se escrever**
  (texto da fórmula, em inglês e com vírgula, como o OOXML exige) e **se avaliar** (em TypeScript,
  contra o modelo da planilha).
- **Por quê:** três ganhos de uma vez.
  1. O `FR-031` (só funções comuns ao Excel e ao Google) passa a valer **por construção**: não existe
     nó para `XLOOKUP`, `FILTER`, `IFS`, `TO_DATE` — escrevê-las não compila.
  2. Toda fórmula que reexpressa regra do domínio (R-6) se prova **contra a função do domínio**:
     o teste avalia a árvore sobre o dado gerado e compara com o que a função de `lib/dominio/`
     devolve. São duas contas independentes; a planilha que diverge do sistema reprova.
  3. Nenhum analisador de fórmula é preciso — o avaliador percorre a árvore, não o texto.
- **Fora do vocabulário, de propósito:**
  - `TEXT` — o código de formato muda com o idioma do Excel (`"aaaa"` no Excel em português, `"yyyy"`
    no Google), e a data sairia errada só numa das máquinas. Data se monta com `DAY`/`MONTH`/`YEAR`
    ou com o formato numérico da célula;
  - `INDIRECT` e `OFFSET` — recalculam a cada edição e escondem a referência;
  - `TODAY` e `NOW` — fora do PR 1; o PR 2 avalia o uso de `TODAY` na data de referência da CONTROLE;
  - qualquer função que o arquivo exija com o prefixo `_xlfn.` — uma guarda reprova a cadeia
    `_xlfn.` em qualquer parte gerada.
- **Descartadas:** fórmula como texto com uma lista de funções proibidas (cega para o que não está na
  lista); um avaliador de terceiros como dependência de teste (pacote novo, `Q-2`).
- ✅ **`DP-2` respondida — Excel 2007 em diante.** As funções listadas acima existem no Excel 2007 e
  no Google Planilhas; nenhuma delas exige o prefixo `_xlfn.`.

## R-5 — Toda fórmula leva o seu valor em cache, e o Excel recalcula ao abrir

- **Decisão:** cada célula de fórmula leva também o valor que o domínio calculou (`<v>`), e a pasta
  pede recálculo completo ao abrir (`fullCalcOnLoad="1"`).
- **Por quê:** arquivo baixado da internet costuma abrir no Excel em **Modo de Exibição Protegido**,
  que não recalcula, e pré-visualizações (Drive, celular) podem não calcular — **[a conferir na
  R-12]**. Sem o valor em cache, elas mostrariam célula vazia ou erro, e o `FR-023` diz *"como
  gerado"*. E é o valor em cache que o teste da R-4 compara com a avaliação da árvore.

## R-6 — O que a fórmula reexpressa, e contra o que cada uma se prova

Tudo o que **vem preenchido** sai das funções do domínio, no servidor. A fórmula existe só onde a
planilha tem de **acompanhar a edição offline** (`Q-6`, `Q-7`), e cada uma é uma **conta** sobre o que
está na própria planilha:

| A fórmula | Reexpressa | Provada contra |
|---|---|---|
| Início e fim de bloco: a chave muda, o período muda (almoço) ou o código do lançamento muda | o agrupamento de `gradeDoPapel` | `gradeDoPapel` (`grade-do-papel.ts:107`) |
| Tipo do cartão (aula, avaliação, estudo, atividade) | `tipoDoCartao`, com `SIGLAS_DE_AVALIACAO` lidas de uma faixa gerada, nunca escritas na fórmula | `gradeDoPapel` |
| Lugar do Estudo Individual: o TA seguinte ao último lançado no dia | `slotDoEstudoIndividual` | `slotDoEstudoIndividual` (`horario-do-bloco.ts:321`) |
| Nº do DSA: semanas com aula ou avaliação, do início da turma até a semana | `numeroDoDsa` | `numeroDoDsa` (`numero-do-dsa.ts:160`) |
| CH cumprida da disciplina até o fim da semana (rodapé) | `execucaoAteASemana` | `execucaoAteASemana` (`consulta.ts`) |
| *(PR 2)* Situação em três degraus | `situacaoDaDisciplina` sem conflito e sem atraso | `situacaoDaDisciplina` (`situacao.ts`) |

- **Quais tipos de item contam no número do DSA e na CH da disciplina** não é decidido pela fórmula:
  o catálogo traz, por item, duas colunas que o **gerador** preenche a partir da mesma origem que o
  sistema usa — hoje, o número conta aula e avaliação (as duas consultas de `lerExtrasDaImpressao`), e
  a CH soma todo fato da ocupação que tem `disciplina_id`. A fórmula só soma pela coluna.
- ✅ **RATIFICADA na `DP-1`** *(Bernardo Villas Boas, 09/10/2026)*: as seis contas em fórmula, **cada
  uma com teste comparando com a função do sistema**. Era uma interpretação da restrição *"sem segunda
  implementação de horário, grade ou situação"*, que ao pé da letra proibiria a primeira linha da
  tabela — e as respostas `Q-6` e `Q-7` só se cumprem com ela.

## R-7 — O bloco se agrupa por COR, sem borda condicional (`Q-6`, `FR-031`)

- **Decisão:** nenhuma borda depende de fórmula. O bloco é a sequência de células com o **mesmo
  fundo**, que alterna entre dois tons da cor do tipo a cada bloco do dia — dois blocos vizinhos nunca
  têm o mesmo fundo. A primeira célula traz o título em **negrito**, na cor do tipo (a barra do cartão
  v4). Bordas só **fixas**: a moldura da grade e a divisão entre os dias.
- **Por quê:** no Google Planilhas a formatação condicional controla só negrito, itálico, tachado,
  cor do texto e cor de fundo (documentação citada em §0). Uma borda condicional apareceria no Excel e
  sumiria no Google, e o `FR-031` exige que o agrupamento se perceba nos dois.
- **E as regras leem só a própria aba:** no Google, a formatação condicional não lê outra aba sem
  `INDIRECT`, e no Excel 2007 não lê de jeito nenhum (documentação dos dois fabricantes; **a conferir
  no PR 1** — o Excel 2007 desta máquina permite). Por isso a IMPRESSÃO traz **colunas de apoio
  ocultas**, ao lado da área de impressão, com o que as regras precisam (tipo, início de bloco,
  paridade).
- **Cores:** espelham `app/print/dsa/documento.css` num módulo só, e um teste compara os dois —
  divergir reprova. Não nasce uma segunda tabela de cores.

## R-8 — O cartão se distribui pelas células do bloco (`Q-6`, "legível")

- **Decisão:** o cartão v4 tem três linhas — título (código e nome da disciplina), conteúdo e pé
  (instrutor · N TA · local · T/E). Sem mescla, elas vão **uma por célula**, de cima para baixo: a 1ª
  célula do bloco leva o título, a 2ª o conteúdo, a 3ª o pé, e as demais ficam só com a cor. Bloco de
  2 TA junta conteúdo e pé na 2ª; bloco de 1 TA leva as três, com quebra de linha e fonte menor.
- **Por quê:** uma célula não transborda para a de baixo. Tudo na primeira célula seria cortado em
  bloco de 1 a 2 TA; repetir em toda célula poluiria o papel.
- A altura das linhas e o corpo de letra que cabem numa página A4 paisagem saem da medição no PR 1:
  **[pendente]**. A conferência de Bernardo julga a legibilidade no papel (`quickstart.md` §5).

## R-9 — O catálogo sugere pela função do domínio, `preencherLancamento`

- **Decisão:** cada item do catálogo é o resultado de `preencherLancamento` (`pre-preenchimento.ts`)
  para aquela disciplina e UE: instrutor pela cascata *UE da turma → disciplina da turma → vazio*,
  técnica de `unidades_ensino.tecnica_ensino_sugerida`, local de `turmas.sala_alocada` e tópico da UE.
  Quando a função devolve vazio, o catálogo fica **vazio** — nunca um valor plausível no lugar.
- **A lista de instrutores** da planilha traz só os da turma (atribuídos e presentes nos lançamentos),
  com o nome no formato do DSA (`nomeParaDsa`), em **antiguidade** pela função única (`RN-ANT-01`,
  Risco Alto) — nunca os 177 do cadastro (`FR-029`).
- ⚠️ **O FORMULÁRIO DO DSA NÃO USA ESTA FUNÇÃO HOJE** — o título antigo desta seção dizia *"a mesma
  função do formulário"*, e era falso. Medido em 09/10/2026 por varredura de `app/`, `lib/` e
  `components/`: `preencherLancamento` tem **zero** consumidores (a única ocorrência é a própria
  definição); a tela sugere o instrutor só pela atribuição **por UE** e recebe `tecnicaSugerida: null`
  do mapeamento das unidades em `leitura.ts`. **A planilha sugere mais do que a tela** até a pendência
  **`PEND-DSA-SUGESTAO`** *(decisão de Bernardo Villas Boas, 09/10/2026: a tela não muda nesta spec;
  PR pequeno logo depois do merge da 015)*.

## R-10 — A rota de download é o primeiro Route Handler do repositório

- **Decisão:** `GET /turmas/<código>/dsa/planilha`, em
  `app/(app)/turmas/[turma]/dsa/planilha/route.ts`, `runtime = "nodejs"`. Contrato em
  `contracts/rota-de-download.md`.
- **Por quê:** Server Action não entrega arquivo ao navegador com `Content-Disposition`, e página não
  responde binário. É uma **leitura** — o Princípio III põe as mutações em Server Action, e nada aqui
  muta.
- ⚠️ **O botão é link comum, SEM o atributo `download`:** com ele, uma resposta de erro seria salva
  como `.xlsx` contendo a página de erro; sem ele, o arquivo baixa e a página fica, e o erro navega até
  a frase.
- O endereço sai de `lib/navegacao/endereco-de-turma.ts` (gotcha 12) e o botão segue a permissão da
  rota (`registros_aula.criar`), nunca uma regra própria.

## R-11 — Validação de lista e nomes definidos

- **Decisão:** as listas de escolha (código, item, semana, instrutor) apontam para **nomes definidos**
  (`LISTA_COD`, `LISTA_ITEM`, `LISTA_SEMANAS`, `LISTA_INSTRUTORES`), com `showErrorMessage="0"` — o
  operador escreve fora da lista (`FR-019`).
- **Por quê:** o Excel 2007 não aceita referência a outra aba na fonte da lista, só nome definido
  (documentação da Microsoft; **a conferir no PR 1**). Com a `DP-2` respondida — *Excel 2007 em
  diante* —, ficam os nomes definidos.
- O comportamento real do Google com essas listas é **[pendente — conferência R-12]**.

## R-12 — A conferência nos dois programas de verdade (`SC-007`)

- **Decisão:** três camadas.
  1. **Na suíte:** a avaliação das árvores (R-4) contra o domínio, a estrutura do pacote (partes,
     XML válido, nenhuma cadeia `_xlfn.`, nenhum valor de erro em cache) e o arquivo reaberto pelo
     próprio leitor de teste.
  2. **No Excel desta máquina, por automação:** `scripts/provas/planilha_no_excel.ps1` abre a
     planilha pelo Excel (COM), recalcula tudo, e compara cada célula com o gabarito gerado com o
     arquivo; erro de fórmula em qualquer aba reprova.
  3. **No Google Planilhas:** pelo conector do Google Drive, com arquivo de **dado sintético** da base
     local — **autorizado na `DP-4`**: pasta própria do Drive, apagada no fim. Se o conector não
     converter o arquivo, a conferência do Google passa a ser manual, pelo roteiro, e isso é dito.
     ⚠️ **Não é a direção proibida da seção *A fonte da verdade* do `CLAUDE.md`** — ela trata do banco
     remoto do sistema; aqui vai um arquivo sintético para uma pasta do Drive, autorizado nominalmente
     na `DP-4`.
- **Descartada:** LibreOffice no CI — não é programa-alvo (`Q-4`), não está nesta máquina, e o local
  deixaria de coincidir com o CI (`SC-005`).

## R-13 — Datas e fuso

- **Decisão:** data vai para a célula como **número de série** do Excel (dias desde 30/12/1899), com o
  formato numérico `dd/mm/yyyy` — o OOXML guarda códigos de formato invariantes, e cada programa
  mostra a data no idioma dele. O "gerada em" usa o formatador de instante de `lib/formato/` (ponto
  único, fuso `America/Sao_Paulo`), e a semana ISO sai de `semanaIsoDe` (`RN-DIST-01`).

## R-14 — Coluna do sábado na IMPRESSÃO

✅ **Decidida na `DP-3`** *(Bernardo Villas Boas, 09/10/2026)*: a coluna do sábado entra **só** quando
a turma tem lançamento em sábado em alguma semana do ano; numa turma sem ela, o sábado lançado
offline aparece na **lista abaixo da grade** — nunca some (`RN-DEG-01`).
