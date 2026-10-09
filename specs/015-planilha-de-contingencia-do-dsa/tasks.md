# Tasks: Planilha de contingência do DSA

**Feature**: `specs/015-planilha-de-contingencia-do-dsa` · **Branch**: `feat/EPICO-6-planilha-de-contingencia`

**Input**: [spec.md](./spec.md) (clarify de 09/10/2026, 8 respostas) · [plan.md](./plan.md) (aprovado em
09/10/2026, `DP-1` a `DP-5` respondidas) · [research.md](./research.md) (R-1 a R-14) ·
[data-model.md](./data-model.md) · [contracts/](./contracts/) · [quickstart.md](./quickstart.md) ·
[estado-atual.md](./estado-atual.md)

> **Agrupadas na ordem pedida por Bernardo:** **(a)** a refatoração da leitura do DSA com a paginação,
> em **commit próprio** → **(b)** o **PR 1** (PREENCHIMENTO, IMPRESSÃO com seletor de semana, BD
> DISCIPLINAS, HORÁRIOS e o botão de baixar) → **(c)** o **PR 2** (CONTROLE e CRONOS). **Cada grupo
> termina com a sua prova.**
>
> **Testes são pedidos**, e não opcionais: pelo DoD, pela `DP-1` (*"cada uma com teste comparando com a
> função do sistema"*) e pela `DP-5` (*"teste com mais de 1.000 linhas"*). Onde o teste vem antes do
> código, a tarefa diz que ele **tem de reprovar** primeiro.

## Formato: `[ID] [P?] [História?] Descrição`

- **[P]**: paralelizável — arquivo próprio, sem depender de tarefa incompleta.
- **[US1]…[US4]**: as histórias do `spec.md` §3 — **US1** baixar a planilha · **US2** fazer o DSA da
  semana na planilha · **US3** imprimir e publicar a semana · **US4** acompanhar a CH (CONTROLE e
  CRONOS). Preparação, fundação e provas não têm rótulo de história.
- Caminhos relativos à raiz do repositório.
- **Todo módulo novo de `lib/dominio/`** abre com o `RF-`/`RN-` de origem e a citação literal da regra
  (convenção da casa) — vale para cada `lib/dominio/dsa/planilha/*.ts` e para `planilha-de-contingencia.ts`.

## O que adotei sozinho, pela recomendação do plano

*(Bernardo: "não pergunte nada: se algo faltar, adote a recomendação do plan e anote".)*

1. **Paginação por contagem + uma rodada de `Promise.all`**, não por laço que pede a página seguinte —
   a guarda `FR-045` (`tests/unidade/fronteira-das-telas.test.ts:230`) reprova `await` em laço em
   `app/**`. O resultado é o que a `DP-5` pede: todas as páginas, até acabar, sem recusa.
2. **O tamanho da página é o que o servidor devolver na primeira**, e não um 1.000 fixo: se o remoto
   tiver `max_rows` menor que o local, uma página fixa de 1.000 pularia linhas sem erro.
3. **A RPC `conflitos_da_semana` também passa pelo leitor paginado** — ela devolve a ocupação das outras
   turmas, e a regra da `DP-5` é *toda* lista da leitura do DSA.
4. **O modelo da pasta fica dividido por aba** em `lib/dominio/dsa/planilha/` (o plano tinha um arquivo
   só), para que as abas andem em paralelo.
5. **A conferência sai de um invariante** que grava o `.xlsx` e o gabarito na pasta temporária do
   sistema, e **o Excel é dirigido por PowerShell (COM)** — Python precisaria de pacote.
6. **A condição do botão e da rota mora em `app/`, não em `lib/dominio/`**: `pode()` vive em
   `lib/autorizacao/`, e o domínio não importa nada de fora dele.
7. **As sugestões do catálogo saem de `preencherLancamento`** (R-9) — **e isso diverge da tela de
   hoje**, ver *Achados* no fim.
8. **A data de referência da CONTROLE é `TODAY()`** numa célula só (PR 2), o que a R-4 deixou para o
   PR 2 decidir: *"por padrão, hoje; editável"* (`FR-025`) só vale dias depois do download com ela.
9. **As medições vão para `medicoes.md`**, versionado ao lado da spec, sem número antes da medida
   (regra 9.3).
10. **O Excel 2007 desta máquina** (`DP-2`) é conferido por automação se `Excel.Application.12`
    estiver registrado; se não estiver, por Bernardo, à vista, e o registro diz qual dos dois.
11. **A fronteira de `lib/planilha/`** (só `node:zlib` e ela mesma) é provada por teste que lê o código
    sem comentário, em vez de uma regra nova de ESLint.

---

## Fase 1 — Preparação

**Meta**: o ponto de partida medido, para que as provas tenham contra o que comparar.

- [X] T001 Confirmar o ponto de partida — ramo `feat/EPICO-6-planilha-de-contingencia` em dia com a `main`, stack local de pé, base limpa por `pnpm db:reset:limpo` — e criar `specs/015-planilha-de-contingencia-do-dsa/medicoes.md` com a data **pelo relógio da máquina** (`date`) e as seções que as provas vão preencher, todas em `[pendente]`
- [X] T002 [P] Medir a impressão digital do esquema do banco local com `scripts/provas/impressao_digital_do_esquema.sql` e anotar md5 e número de objetos em `specs/015-planilha-de-contingencia-do-dsa/medicoes.md` — é a base da prova *"sem migration"* dos três grupos
- [X] T003 [P] Inventariar os testes que exercitam a leitura do DSA — `tests/unidade/dsa/*.test.ts`, `tests/unidade/consulta-*.test.ts` que importam de `app/(app)/turmas/[turma]/dsa/`, `tests/invariantes/rls/dsa.test.ts`, `tests/e2e/dsa-*.spec.ts`, `tests/e2e/dsa-de-teste.ts`, `tests/e2e/percurso-do-dsa.ts` — e anotar o `git hash-object` de cada um em `specs/015-planilha-de-contingencia-do-dsa/medicoes.md`: é contra esta lista que o grupo (a) prova que **nenhuma asserção mudou**
- [X] T004 Commitar a documentação da spec — `specs/015-planilha-de-contingencia-do-dsa/` inteira e `.specify/feature.json` — num commit `docs(EPICO-6): especificar a planilha de contingência do DSA`, **sem** os quatro `specs/013-detalhe-semanal-de-aula/comando-*.md` não versionados; assim o commit do grupo (a) fica só com a refatoração

---

## Grupo (a) — Fase 2: a leitura do período, em páginas até acabar (COMMIT PRÓPRIO)

**Meta**: a tela do DSA, o `/print/dsa` e — depois — a planilha leem pela **mesma** montagem (R-2), e
nenhuma lista da leitura do DSA para em 1.000 linhas (R-3, `DP-5`).
**Depende de**: Fase 1. **Bloqueia**: os grupos (b) e (c).
**A prova deste grupo é de leitura** — ainda não há planilha, e por isso não há conferência no Excel
nem no Google aqui: é a suíte do DSA intacta, a equivalência semana a semana, as mais de 1.000 linhas,
três defeitos deliberados e o CI.

- [ ] T005 [P] Escrever `tests/unidade/paginacao.test.ts` **antes** do leitor, com um construtor de consulta falso: 0, 1, 999, 1.000 e 1.001 linhas; 2.500 linhas em 3 páginas, com a 2ª e a 3ª pedidas **na mesma rodada** (contadas antes de qualquer resolução); servidor que corta em 500 com contagem de 1.200 — as 1.200 chegam, com as páginas seguintes no tamanho que o servidor devolveu; erro em qualquer página → a leitura **rejeita**, nunca devolve parte; ordem das linhas preservada. Tem de reprovar (o módulo não existe)
- [ ] T006 Implementar `lib/supabase/paginacao.ts` — `lerTodasAsPaginas`: primeira página com `count: "exact"`; as que faltam por `.range()` numa rodada só de `Promise.all`, no tamanho que o servidor devolveu na primeira; rejeita em qualquer `error`; cabeçalho citando a `DP-5` literalmente e a razão da guarda `FR-045`. `tests/unidade/paginacao.test.ts` verde
- [ ] T007 [P] Escrever `tests/invariantes/leitura-paginada.test.ts` (`DP-5`) no padrão de `tests/invariantes/rateio-da-view.test.ts` — semente pela chave local de serviço (`chaveLocal`), leitura com **sessão real** (`signInWithPassword`), semente **idempotente** (curso e turma reaproveitados, códigos gerados, nunca fixos — regra 9.1): uma turma sintética com **1.100** aulas de 1 TA em pares (data, TA) distintos ao longo de pelo menos **30 semanas, com até 8 TA por dia útil** (24 semanas × 5 dias × 9 TA dariam só 1.080 lugares), mais **um** lançamento numa semana que não tem nenhum outro, **inserido por último**. Lendo como a tela e o papel leem (`lerSemanaDoDsa` + `lerExtrasDaImpressao` + `montarDocumentoDoDsa`) a última semana, conferir contra a contagem direta no banco: (1) o nº do DSA (semanas ISO distintas com aula ou avaliação com `ta_inicial`, desde `data_inicio`); (2) cada `cumprida` do rodapé (soma de `tempos_consumidos` por disciplina até o fim da semana); (3) o acumulado por disciplina do painel. ⚠️ **Rodar AGORA, antes da T010: tem de REPROVAR** com a leitura de hoje — anotar em `medicoes.md` a asserção que caiu e os números (o caso que discrimina, DoD 8). Se não reprovar, a semente não alcança o teto: consertar a semente, nunca a expectativa
- [ ] T008 [P] Escrever `tests/invariantes/leitura-do-periodo.test.ts` (R-2) — semente idempotente com pelo menos 6 semanas de lançamentos de uma turma: vigência de regime trocando no meio, feriado de dia inteiro, aula num sábado, um lançamento sem posição e uma avaliação com vista; para **cada** semana `s` do período, `montarSemanaDoDsa(await lerPeriodoDoDsa(período inteiro), s)` igual, campo a campo, a `await lerSemanaDoDsa(s)`. Reprova até a T009 (as funções não existem)
- [ ] T009 Refatorar `app/(app)/turmas/[turma]/dsa/leitura.ts` em duas metades, sem regra nova (R-2): `lerPeriodoDoDsa(supabase, { turmaId, cursoId, de, ate, comConflitos })` — as **16** consultas da rodada de hoje (`leitura.ts:210`–`:337`) com a janela (`de..ate` nas da semana, `≤ ate` nas acumuladas); depois, em sequência como hoje, o catálogo de horários de **toda** vigência que toca a janela numa consulta `.in()`; e, com `comConflitos`, a RPC `conflitos_da_semana` da janela — e `montarSemanaDoDsa(dados, { ano, numero, sabadoPedido, hoje })`, com tudo o que hoje vem depois das consultas, recortando os dados do período para a semana (janela da semana; `≤ fim da semana` no acumulado). `lerSemanaDoDsa` mantém assinatura e resultado: `montarSemanaDoDsa(await lerPeriodoDoDsa(janela da semana, comConflitos: true), semana)`. `tests/invariantes/leitura-do-periodo.test.ts` verde
- [ ] T010 Passar **toda consulta de lista** de `lerPeriodoDoDsa` e de `lerExtrasDaImpressao` (`app/(app)/turmas/[turma]/dsa/leitura.ts`), inclusive a RPC `conflitos_da_semana`, por `lerTodasAsPaginas`, cada uma com **ordem total**: a ordem que ela já tinha vem primeiro (`ordem_antiguidade` segue a primeira em `vw_instrutores` — guarda `SC-002.1`; `cod_disciplina`, `ordem`, `numero_ue` e `data_avaliacao` idem), mais um desempate por chave única (`id`, `fato_id`, `unidade_ensino_id`); as consultas `.maybeSingle()` ficam como estão. `tests/invariantes/leitura-paginada.test.ts` passa a verde
- [ ] T011 **Prova do grupo (a) — a suíte do DSA sem mudar asserção:** `pnpm test:unidade`, `pnpm test:rls` e `pnpm test:e2e` nos arquivos do inventário da T003, todos verdes; e o `git hash-object` de cada arquivo do inventário **igual** ao anotado na T003. Registrar em `specs/015-planilha-de-contingencia-do-dsa/medicoes.md`
- [ ] T012 **Prova do grupo (a) — três defeitos deliberados**, cada um plantado à mão, rodado, desfeito em seguida e anotado em `specs/015-planilha-de-contingencia-do-dsa/medicoes.md` com o teste que o pegou: (1) inverter a ordem de dois fatos em `montarSemanaDoDsa` → reprovam a suíte do DSA **e** `leitura-do-periodo.test.ts`; (2) `lerTodasAsPaginas` devolvendo só a primeira página → reprovam `leitura-paginada.test.ts` e `paginacao.test.ts`; (3) o recorte acumulado de `montarSemanaDoDsa` em `≤ início da semana` no lugar de `≤ fim da semana` → reprova `leitura-do-periodo.test.ts`. Se um defeito passar verde, a prova está cega: consertar a prova
- [ ] T013 **Prova do grupo (a) — idempotência e fechamento:** `pnpm test:rls` **duas vezes seguidas**, verde nas duas (regra 9.1); `pnpm verificar` **0** e `pnpm verificar:tudo` **0** sobre base limpa; impressão digital do esquema igual à da T002 e `git diff main -- supabase/` vazio; **commit único** `refactor(RF-DSA-04): ler o período do DSA numa rodada, em páginas até acabar`, com o corpo dizendo que ele também corrige o teto de 1.000 (`DP-5`) e citando as provas T011 e T012; push do ramo e **CI verde nos três blocos** sobre esse commit (o CI roda em `push` — `.github/workflows/ci.yml`). Anotar o número do run em `specs/015-planilha-de-contingencia-do-dsa/medicoes.md`

**Checkpoint (a)**: a leitura do DSA é uma só, paginada, e a tela não mudou — provado.

---

## Grupo (b) — PR 1: PREENCHIMENTO, IMPRESSÃO com seletor, BD DISCIPLINAS, HORÁRIOS e o botão

### Fase 3 — Fundação do PR 1: o arquivo e a fórmula

**Meta**: escrever um `.xlsx` válido sem pacote (R-1) e fórmulas de um vocabulário fechado que se
escrevem e se avaliam (R-4). **Depende de**: grupo (a). **Bloqueia**: US1, US2 e US3.

- [ ] T014 [P] Escrever `tests/unidade/planilha-zip.test.ts` antes do código: o CRC-32 da tabela própria igual a `zlib.crc32` (quando ele existir) para entradas fixas, inclusive vazia e de 1 MB; um ZIP de duas entradas reaberto devolve os mesmos bytes; a compressão desfeita por `zlib.inflateRawSync`; a mesma entrada gera os mesmos bytes duas vezes. Tem de reprovar
- [ ] T015 Implementar `lib/planilha/zip.ts` — cabeçalhos locais, diretório central e registro final do ZIP, compressão por `zlib.deflateRawSync`, CRC-32 por tabela de 256 entradas (R-1), carimbo de data fixo nas entradas (o instante real vai em `docProps/core.xml`). `tests/unidade/planilha-zip.test.ts` verde
- [ ] T016 [P] Escrever o leitor de teste `tests/unidade/planilha/ler-xlsx.ts` — reabre um `.xlsx` gerado (descompacta com `zlib.inflateRawSync`), lê cadeias compartilhadas, células com fórmula e valor em cache, estilos, formatação condicional, validações, nomes definidos e configuração de página, e confere que cada parte é XML bem formado; é só de teste e lê o XML que o próprio escritor gera
- [ ] T017 Escrever `tests/unidade/planilha-ooxml.test.ts` antes do escritor, usando o leitor da T016: pasta de duas abas com estilos, cadeias compartilhadas, fórmula com cache, data como número de série com `dd/mm/yyyy` (dias desde 30/12/1899, R-13), nomes definidos, lista de validação com `showErrorMessage="0"`, formatação condicional de fundo e negrito, página A4 paisagem ajustada a 1 × 1, área de impressão, coluna oculta, painel congelado, `topLeftCell` e `fullCalcOnLoad="1"`; e as invariantes I-P1 (partes e `[Content_Types].xml`), I-P7 (zero `mergeCell`), I-P8 (zero proteção), a cadeia `_xlfn.` ausente, o escape de `&`, `<` e `"` e a remoção de caractere de controle; e que nada em `lib/planilha/` importa além de `node:zlib` e dela mesma, lido **sem comentário** (regra 9.1.1). Tem de reprovar
- [ ] T018 Implementar `lib/planilha/ooxml.ts` — pasta → partes OOXML: `workbook.xml` (abas, nomes definidos, `_xlnm.Print_Area`, `calcPr`), `styles.xml` com tabela de estilos sem repetição, `sharedStrings.xml`, uma `sheetN.xml` por aba, `docProps`, relações e tipos de conteúdo; empacota com `lib/planilha/zip.ts`. `tests/unidade/planilha-ooxml.test.ts` verde
- [ ] T019 [P] Escrever `tests/unidade/planilha-formula.test.ts` antes da árvore: cada nó escreve o texto OOXML esperado (nomes em inglês, vírgula, aba com acento entre aspas como `'IMPRESSÃO'!$B$2`, aspas dobradas no texto) e avalia o valor esperado — `IF` preguiçoso, `IFERROR` pegando o `#N/A` do `MATCH` sem par, `COUNTIFS` com critério `"<="&data`, comparação de texto sem distinguir maiúscula como o Excel, `INDEX`/`MATCH` exato, `CHAR(10)`, `DAY`/`MONTH`/`YEAR` sobre série, `RIGHT` para zero à esquerda; um `// @ts-expect-error` provando que `XLOOKUP` não se monta; chave com `*`, `?` ou `~` recusada na montagem. Tem de reprovar
- [ ] T020 Implementar `lib/planilha/formula.ts` — a árvore tipada da R-4 com `escrever()` e `avaliar(modelo)`, no vocabulário fechado da R-4 (Excel 2007 em diante, `DP-2`), com a semântica do Excel para vazio, coerção e propagação de erro; cabeçalho com a lista do vocabulário e por que `TEXT`, `INDIRECT`, `OFFSET` e `TODAY` ficam fora no PR 1. `tests/unidade/planilha-formula.test.ts` verde
- [ ] T021 [P] Escrever `tests/unidade/planilha-cores.test.ts` e implementar `lib/planilha/cores.ts` — a cor de cada tipo de cartão (aula, avaliação, estudo, atividade) lida de `app/print/dsa/documento.css` (as variáveis `--dsa4-*` resolvidas e os literais) e igual à do módulo (I-P13); o segundo tom de cada tipo, que alterna os blocos (R-7), sai de uma função declarada no módulo, nunca de uma segunda tabela. ✅ **Dúvida 1 do analyze, (a)** *(Bernardo, 09/10/2026)*: a **exceção nominal** à regra de cor de `eslint.config.mjs` vale **só** para `lib/planilha/cores.ts`, declarada ao lado da exceção do CSS de impressão; toda cor do arquivo sai dele; e um segundo caso do mesmo teste **reprova cor em qualquer outro arquivo de `lib/planilha/`**, com `#` ou sem (o OOXML grava `FFE6F4EC`, que a expressão da regra não pegaria), lido sem comentário
- [ ] T022 [P] Acrescentar `enderecoDaPlanilhaDeContingencia(codigo)` a `lib/navegacao/endereco-de-turma.ts`, reaproveitando a codificação de segmento de `enderecoDoDsa`, com caso em `tests/unidade/endereco-de-turma.test.ts` para um código com espaço (`C-ApA-PCN-PR-EAD T2 2026`) indo e voltando por `codigoDaTurmaNoSegmento`
- [ ] T023 Criar `lib/dominio/dsa/planilha/tipos.ts` com as entidades de `data-model.md` §2 — `PlanilhaDeContingencia`, `SemanaDaPlanilha`, `DiaDaPlanilha`, `LinhaDeTa`, `ItemDoCatalogo`, `RelogioDaPlanilha`, `CelulaDeValor` — e o tipo do insumo que o modelo recebe (os dados do período, os extras da impressão e os do catálogo, já lidos); cabeçalho com o `RF-`/`RN-` e a citação literal, como manda a casa
- [ ] T024 [P] Escrever `tests/unidade/dsa/planilha-semanas.test.ts` e implementar `lib/dominio/dsa/planilha/semanas.ts` — as semanas da pasta: da semana de `data_inicio` à de `data_termino` (`FR-030`); só as da etapa presencial quando ela está cadastrada, por `etapaDaSemana` (`FR-014`, `D-DSA-2`); turma sem período → da primeira à última semana com lançamento, mais a corrente, com aviso (*Edge Cases*); o rótulo único de cada semana; a semana inicial — a corrente, ou a primeira se a corrente estiver fora (`FR-022`); e `temSabado`, verdadeiro só se houver lançamento em sábado em alguma semana (`DP-3`). Semana ISO por `semanaIsoDe`, nunca recalculada (`RN-DIST-01`)

**Checkpoint**: o arquivo e a fórmula existem e se provam sozinhos.

### Fase 4 — US1: baixar a planilha da turma (P1) 🎯 parte do MVP

**Meta**: quem pode lançar baixa, do DSA ou da ficha, um `.xlsx` com o retrato da turma — cabeçalho,
catálogo, relógio, assinaturas e lançamentos — e o banco não muda.
**Teste independente**: numa turma com lançamentos, clicar no botão e reabrir o arquivo: o topo diz
quando, por quem e que é contingência; BD DISCIPLINAS, HORÁRIOS e as semanas lançadas estão lá;
nenhuma tabela mudou de contagem.

- [ ] T025 [P] [US1] Escrever `tests/unidade/dsa/planilha-horarios.test.ts` e implementar `lib/dominio/dsa/planilha/horarios.ts` — um bloco por relógio do período, saído de `relogioDaSemana` (`Relogio` do domínio, nunca recalculado): duas vigências, origem catálogo com o tempo excepcional, a chave `relógio|TA`, e **nenhuma** coluna *"quantidade de TA → fim do dia"* (`RN-CONF-02`); semana sem relógio → aviso (`FR-009`)
- [ ] T026 [P] [US1] Escrever `tests/unidade/dsa/planilha-catalogo.test.ts` antes do catálogo: os itens de cada disciplina ativa (UEs pelo número, `SEM UE` pela `D-DSA-1`, os tipos de avaliação, `VISTA`, `AEC` com disciplina) e as categorias sem disciplina (`AEC`, `TAD`, `TR` e `Estudo Individual` — o vocabulário do sistema, `FR-021`; `EI` só como sigla impressa na T/E); as sugestões de cada item **iguais** ao que `preencherLancamento` devolve (cascata do instrutor UE → disciplina → vazio, técnica da UE, local da turma, tópico); chaves únicas e sem curinga (I-P6); disciplinas na ordem natural (`emOrdemNaturalDoCodigo`); `LISTA_INSTRUTORES` só com os da turma, no formato do DSA (`nomeParaDsa`) e em antiguidade pela função única (`RN-ANT-01`, I-P9); `contaNoNumeroDoDsa` só em aula e avaliação (as duas consultas de `lerExtrasDaImpressao`); `disciplinaDaCh` em todo item que tem disciplina. Tem de reprovar
- [ ] T027 [US1] Implementar `lib/dominio/dsa/planilha/catalogo.ts` — a BD DISCIPLINAS e as faixas de `LISTA_COD`, `LISTA_ITEM`, `LISTA_INSTRUTORES`, `SIGLAS_AVALIACAO` e da CH prevista por disciplina, conforme `contracts/planilha.md` §4. `tests/unidade/dsa/planilha-catalogo.test.ts` verde
- [ ] T028 [P] [US1] Escrever `tests/unidade/dsa/planilha-preenchimento.test.ts` (o retrato) antes da aba: o topo do `FR-005` (gerada em, por quem, lançamentos até, *"é contingência"*, *"baixe de novo no início de cada semana"*, os avisos); o mesmo número de linhas em todo bloco de semana; o cabeçalho da semana (rótulo, nº do DSA com o cache de `numeroDoDsa`, alunos, ALT vazio, id do relógio, as duas assinaturas pela vigência na data da semana via `assinaturasDoDsa`, posto por extenso); 6 dias × TA da grade; o lançamento do sistema em `CelulaDeValor` **sugerida** quando igual ao catálogo e **escrita** quando difere (`data-model.md` §2.7), com o código do lançamento; a seção *sem posição*; o dia bloqueado com a descrição; datas como série. Tem de reprovar
- [ ] T029 [US1] Implementar o retrato em `lib/dominio/dsa/planilha/preenchimento.ts`, conforme `contracts/planilha.md` §2. `tests/unidade/dsa/planilha-preenchimento.test.ts` (o retrato) verde
- [ ] T030 [US1] Implementar `lib/dominio/dsa/planilha-de-contingencia.ts` — monta a pasta a partir do insumo: abas na ordem do contrato, aba ativa PREENCHIMENTO rolada até a semana inicial, topo congelado; chama `horarios.ts`, `catalogo.ts` e `preenchimento.ts`; devolve o modelo que `lib/planilha/ooxml.ts` escreve
- [ ] T031 [US1] Implementar `app/(app)/turmas/[turma]/dsa/planilha/leitura.ts` — `lerDadosDaPlanilha(supabase, turma)` numa rodada só de `Promise.all`: `lerPeriodoDoDsa` do período inteiro **sem** conflitos, `lerExtrasDaImpressao`, e o que o catálogo precisa e a leitura do DSA não traz (`turma_disciplina_instrutor` da turma, `unidades_ensino.tecnica_ensino_sugerida` do curso, os nomes dos instrutores da turma no formato do DSA, lidos de `vw_instrutores` com `.order("ordem_antiguidade")` — guarda `SC-002.1`), toda lista por `lerTodasAsPaginas`; nenhuma coluna de CPF, RG, telefone ou endereço é pedida (`FR-029`)
- [ ] T032 [P] [US1] Criar `app/(app)/turmas/[turma]/dsa/planilha/acesso.ts` — `podeBaixarPlanilhaDeContingencia(permissoes, modalidade)`: `pode(permissoes, "registros_aula", "criar")` e não `ehEadPuro(modalidade)` —, a **única** condição, chamada pela rota e pelos dois botões; com caso em `tests/unidade/dsa/planilha-acesso.test.ts` (sem permissão; EAD puro; semipresencial mantém)
- [ ] T033 [US1] Implementar `app/(app)/turmas/[turma]/dsa/planilha/route.ts` conforme `contracts/rota-de-download.md`: `runtime = "nodejs"`; `GET`; o código pelo segmento (segmento vazio → o mesmo **404**); sessão e permissão pela condição da T032 (sem ela, **404**); turma pelo cliente da sessão com `COLUNAS_DA_TURMA_DO_DSA` (sem linha, o **mesmo 404**); EAD puro → **303** para `enderecoDoDsa`; leitura (T031) → modelo (T030) → `ooxml.ts` → **200** com `Content-Type`, `Content-Disposition` com nome ASCII e UTF-8 (`DSA-contingencia-<código>-<AAAA-MM-DD>.xlsx`, data no fuso da CIAARA-11), `Cache-Control: no-store` e `nosniff`; qualquer falha → **303** para `enderecoDoDsa` com o aviso da T034, nunca corpo pela metade; com o caso de falha em `tests/unidade/dsa/planilha-rota.test.ts` — leitor substituído que rejeita → 303 com o aviso e nenhum corpo de arquivo (`contracts/rota-de-download.md` §*Como se prova*)
- [ ] T034 [US1] Declarar o parâmetro de aviso de falha da planilha em `lib/navegacao/contrato.ts` (na rota `/turmas/[turma]/dsa`), com caso em `tests/unidade/contrato-de-parametros.test.ts`, e mostrar a frase em `app/(app)/turmas/[turma]/dsa/page.tsx` com o componente de aviso que a tela já usa
- [ ] T035 [US1] Pôr o botão *Baixar planilha de contingência* em `app/(app)/turmas/[turma]/dsa/page.tsx` — link comum `<a href={enderecoDaPlanilhaDeContingencia(codigo)}>`, **sem** o atributo `download` (R-10), só quando a condição da T032 é verdadeira; a página continua Server Component
- [ ] T036 [US1] Pôr o mesmo botão na ficha, `app/(app)/turmas/[turma]/page.tsx`, ao lado do botão do DSA (perto da linha 292), pela mesma condição; turma EAD segue com o aviso de turma EAD e sem botão
- [ ] T037 [P] [US1] Estender `tests/unidade/toda-tela-tem-caminho.test.ts` a `route.ts` — toda rota de download tem o `href` em outro arquivo, pelo mesmo mecanismo que a guarda já usa para `/turmas/[turma]/dsa` —, com controle positivo: tirar o botão da T035 e o da T036 deixa a guarda vermelha
- [ ] T038 [P] [US1] Criar `tests/invariantes/planilha-igual-ao-papel.test.ts` com o caso **"nada escrito"** (`FR-004`, `SC-009`): contagem de todas as tabelas de `public` antes e depois de `lerDadosDaPlanilha` + modelo + escritor, iguais
- [ ] T039 [US1] Escrever `tests/e2e/planilha-de-contingencia.spec.ts`, reaproveitando a semente de `tests/e2e/dsa-de-teste.ts`, chegando **por clique** (`goto` só até o ponto de partida): do DSA e da ficha, o clique dispara o evento de download, o arquivo reabre pelo leitor da T016 com o topo do `FR-005` e o código de um lançamento conhecido, e a página não muda; turma EAD sem botão, e a rota levando ao aviso; um perfil que, na matriz `perfil_permissao` da base local, lê o DSA e **não** lança — escolhido pela consulta, nunca de memória — sem botão e com **404** na rota; Operador fora do alcance com **404** idêntico ao de turma inexistente

**Checkpoint US1**: o retrato baixa, só para quem pode, e o banco não muda.

### Fase 5 — US2: fazer o DSA da semana na planilha (P1)

**Meta**: com duas escolhas por TA — COD e ITEM —, tópico, local, técnica, instrutor e horário aparecem
sozinhos, o valor escrito prevalece, e chave sem par vira aviso, nunca erro.
**Teste independente**: numa semana vazia, escolher COD e ITEM em 3 TA seguidos — as quatro células
sugeridas e o horário se preenchem (pela árvore e, na prova, pelo Excel); sobrescrever o local
prevalece; mudar o catálogo não muda a linha escrita.

- [ ] T040 [P] [US2] Acrescentar a `tests/unidade/dsa/planilha-preenchimento.test.ts` os casos das fórmulas, antes delas: horário e período pela HORÁRIOS (`relógio|TA`); tópico, local, técnica e instrutor por `INDEX`/`MATCH` na chave, com `IFERROR` → vazio; a conferência da linha (chave inexistente → *"chave não existe no catálogo"*; vazia com COD e ITEM vazios) e a **área de conferência** do topo contando as linhas com chave sem par (`FR-018`); o **nº do DSA** do cabeçalho da semana por fórmula (semanas com aula ou avaliação até ela, pela coluna `contaNoNumeroDoDsa`), avaliado pela árvore e comparado com `numeroDoDsa` (`DP-1`); as listas por nome definido com `showErrorMessage="0"` (`FR-019`, R-11); I-P4 (toda fórmula avaliada dá o cache); I-P11 (mudar um item do catálogo no modelo muda as linhas sugeridas e nenhuma escrita — `SC-006`); dia bloqueado aceita entrada; sábado com linhas; `SEM UE` com tópico vazio para digitar; instrutor em texto livre aceito. Tem de reprovar
- [ ] T041 [US2] Implementar as fórmulas em `lib/dominio/dsa/planilha/preenchimento.ts` com a árvore de `lib/planilha/formula.ts` — inclusive o nº do DSA do cabeçalho e a área de conferência do topo —, e a linha de instrução do topo da aba (como lançar com COD e ITEM, como sobrescrever, como restaurar uma sugestão copiando a fórmula da linha de cima). `tests/unidade/dsa/planilha-preenchimento.test.ts` verde

**Checkpoint US2**: a entrada da planilha faz o que a operação faz hoje, sem os `D-4`, `D-6` e `D-2`.

### Fase 6 — US3: imprimir e publicar a semana (P1) 🎯 completa o MVP

**Meta**: escolher a semana no seletor e mandar imprimir dá **uma** página A4 paisagem, no modelo v4,
com o conteúdo do `/print/dsa`.
**Teste independente**: com o seletor numa semana já lançada, o conteúdo da IMPRESSÃO bate com
`montarDocumentoDoDsa` daquela semana (I-P5), e a página está ajustada a 1 × 1.

- [ ] T042 [P] [US3] Escrever `tests/unidade/dsa/planilha-impressao.test.ts` (seletor, cabeçalho e grade) antes da aba: `LISTA_SEMANAS` e a semana inicial; a posição da semana por `MATCH` e cada dado por `INDEX` com a altura fixa do bloco, sem `INDIRECT`; o cabeçalho de cada semana; as linhas de TA no maior número de TA dos relógios do período; a linha entre dois TA com o intervalo ou o **almoço** do relógio da semana escolhida; a coluna do sábado **só** com `temSabado`, e o sábado de turma sem a coluna indo para a lista abaixo da grade (`DP-3`); o dia bloqueado marcado com a descrição; o Estudo Individual no TA seguinte ao último lançado. Tem de reprovar
- [ ] T043 [P] [US3] Acrescentar a `tests/unidade/dsa/planilha-impressao.test.ts` as **quatro reexpressões da IMPRESSÃO** ratificadas na `DP-1` (a quinta do PR 1, o nº do DSA, mora na PREENCHIMENTO e é provada na T040), cada uma avaliada pela árvore e comparada com a função do sistema sobre semanas sintéticas (bloco atravessando o almoço, dois lançamentos seguidos com a mesma chave e códigos diferentes, blocos de 1, 2, 3 e 5 TA, semana sem aula, avaliação `PM`/`PO`/`PP`, Estudo Individual): início e fim de bloco contra os cartões de `gradeDoPapel` (coluna, faixas, partes); tipo do cartão contra o tipo de `gradeDoPapel`; lugar do Estudo Individual contra `slotDoEstudoIndividual`; CH cumprida contra `execucaoAteASemana` (I-P10). Tem de reprovar
- [ ] T044 [US3] Implementar em `lib/dominio/dsa/planilha/impressao.ts` o seletor, o cabeçalho, a grade v4 (dias em colunas com a faixa estreita do tipo, TA em linhas, as linhas de intervalo e almoço), as colunas de apoio **ocultas** na mesma aba (R-7) e as listas abaixo da grade (sem posição; sábado sem coluna), conforme `contracts/planilha.md` §3
- [ ] T045 [US3] Implementar em `lib/dominio/dsa/planilha/impressao.ts` o agrupamento do bloco — formatação condicional de fundo alternando os dois tons da cor do tipo a cada bloco do dia e título em negrito na cor do tipo, lendo só a própria aba (R-7), cores de `lib/planilha/cores.ts` — e a distribuição do cartão pelas células: título na 1ª, conteúdo na 2ª, pé na 3ª, junção das linhas no bloco de 1 e de 2 TA (R-8)
- [ ] T046 [US3] Implementar em `lib/dominio/dsa/planilha/impressao.ts` o rodapé (`FR-024`) — CH só das disciplinas da semana, com a cumprida até o fim da semana, e a legenda só das técnicas usadas, as duas compactadas por coluna de apoio numerada (`COUNTIF`) e `INDEX`/`MATCH`; a nota do Estudo Individual; alunos; ALT; as duas assinaturas; *"emitido pela planilha de contingência gerada em DD/MM/AAAA HH:MM"* — e a página: A4 (`paperSize="9"`), paisagem, 1 × 1, margens estreitas, área de impressão sem as colunas de apoio, e a instrução *"edite a assinatura no cabeçalho da semana, na PREENCHIMENTO"*. `tests/unidade/dsa/planilha-impressao.test.ts` verde
- [ ] T047 [US3] Acrescentar a IMPRESSÃO à montagem em `lib/dominio/dsa/planilha-de-contingencia.ts`, na ordem PREENCHIMENTO · IMPRESSÃO · BD DISCIPLINAS · HORÁRIOS, com o seletor aberto na semana inicial
- [ ] T048 [US3] Acrescentar a `tests/invariantes/planilha-igual-ao-papel.test.ts` a invariante **I-P5** (`FR-012`, `SC-003`): em **pelo menos 3 turmas semeadas** — uma presencial, uma semipresencial com etapa e uma com sábado —, para **cada** semana com lançamento (no mínimo 3 por turma), o seletor posto na semana e a IMPRESSÃO avaliada pela árvore dão o conteúdo de `montarDocumentoDoDsa` daquela semana (a partir de `lerSemanaDoDsa` + `lerExtrasDaImpressao`) — linhas, horários, CH do rodapé, técnicas, assinaturas, nº do DSA e alunos
- [ ] T049 [US3] Acrescentar a `tests/e2e/planilha-de-contingencia.spec.ts` que o arquivo baixado tem as quatro abas na ordem e a IMPRESSÃO com o seletor na semana corrente da turma semeada

**Checkpoint US3**: o MVP de contingência — baixar e imprimir — está de pé.

### Fase 7 — Prova do PR 1: os testes e os dois programas de verdade

**Meta**: a planilha recalcula no Excel e no Google como a árvore avaliou (`SC-007`), e o PR 1 vai
aberto, sem merge.

- [ ] T050 Escrever `tests/invariantes/planilha-de-conferencia.test.ts` — gera, de uma semente sintética com uma turma de **50 semanas** e volume da maior turma medida (676 lançamentos, `research.md` §0), o `.xlsx` e o `gabarito.json` (o valor que o domínio calculou para cada célula de fórmula, e três semanas para pôr no seletor) em `os.tmpdir()/ciaara-planilha-de-conferencia/`; confere no arquivo I-P1 a I-P4, I-P6 a I-P9, I-P12 e I-P13; e anota em `specs/015-planilha-de-contingencia-do-dsa/medicoes.md` o tempo de geração — que tem de ficar abaixo dos **30 s** do `SC-001` — e o tamanho do arquivo, comparado com o limite de corpo de resposta das funções da Vercel lido na documentação oficial (com a fonte anotada)
- [ ] T051 Escrever `scripts/provas/planilha_no_excel.ps1` — pelo Excel da máquina (COM, invisível, sem alertas): abre o arquivo da T050, `CalculateFull()`, compara cada célula do gabarito; varre toda aba atrás de valor de erro; põe o seletor em cada uma das três semanas do gabarito, recalcula e compara a IMPRESSÃO; preenche COD e ITEM num TA vazio de uma semana e confere que a IMPRESSÃO daquela semana mostra o bloco com tópico, local, T/E e instrutor do catálogo (`SC-007`); confere a página (A4, paisagem, 1 × 1) e que a impressão dá **1** página; fecha sem salvar; o código de saída é o veredito
- [ ] T052 Rodar `scripts/provas/planilha_no_excel.ps1` no Excel do Microsoft 365 desta máquina — verde; plantar à mão um intervalo deslocado em uma linha numa fórmula da IMPRESSÃO, gerar de novo e rodar — **vermelho**; desfazer. Abrir o mesmo arquivo no Excel 2007 desta máquina (`Office12\EXCEL.EXE`, `DP-2`): por automação se `Excel.Application.12` estiver registrado, senão à vista por Bernardo. Anotar versões e vereditos em `specs/015-planilha-de-contingencia-do-dsa/medicoes.md`
- [ ] T053 Conferir no Google Planilhas pelo conector do Google Drive (`DP-4`): criar uma pasta própria no Drive de Bernardo, enviar o `.xlsx` **sintético** da T050 convertido em planilha Google, ler de volta e comparar com o gabarito na semana do seletor, conferir que não há erro, e listar o que o conector não consegue ver (fundo e negrito do bloco, listas de escolha, ajuste de página) para a conferência à vista; **apagar a pasta no fim** (se o conector só mandar para a lixeira, dizer). Se o conector não converter o arquivo, a conferência do Google fica manual pelo roteiro da T054, e o registro diz isso. Anotar em `specs/015-planilha-de-contingencia-do-dsa/medicoes.md`
- [ ] T054 Escrever `specs/015-planilha-de-contingencia-do-dsa/roteiro-de-conferencia-pr1.md` — os passos de `quickstart.md` §6, mais o que só se confere à vista: a edição de uma linha da entrada mudando a impressão no Google (`SC-007`), a visualização de impressão em 1 página no Excel e no Google, a legibilidade dos blocos de 1, 2 e 3 TA, as cores, e o arquivo aberto no Excel 2007 sem reparo
- [ ] T055 Fechar o PR 1: `pnpm verificar` **0** e `pnpm verificar:tudo` **0** sobre base limpa; impressão digital do esquema igual à da T002 e `git diff main -- supabase/` vazio (sem migration); commits no padrão `feat(EPICO-6): …` (a planilha é novidade autorizada, sem `RF-` próprio); push e **CI verde nos três blocos**; abrir o PR 1 com o template inteiro, as respostas `DP-1` a `DP-5`, o caminho de reversão e os *Achados* deste arquivo. **Sem merge**: ele espera a conferência e a palavra de Bernardo

**Checkpoint (b)**: o PR 1 aberto e verde, com a prova nos dois programas registrada.

---

## Grupo (c) — PR 2: CONTROLE e CRONOS

### Fase 8 — US4: acompanhar a carga horária na planilha (P2)

**Meta**: por disciplina, CH prevista, lançada até a data de referência, restante e situação; por
disciplina × semana, os TA lançados.
**Depende de**: o PR 1 — as abas e a árvore de fórmulas. ⚠️ **Sem merge** (Bernardo, 09/10/2026): o PR 2 nasce **empilhado** num ramo próprio, `feat/EPICO-6-planilha-controle-e-cronos`, a partir do ramo do PR 1, e aponta para ele.
**Teste independente**: lançar TA de uma disciplina na PREENCHIMENTO — a CH lançada sobe e a restante
desce na CONTROLE e na CRONOS; um lançamento depois da data de referência não conta (`D-5`).

- [ ] T056 [US4] Acrescentar a `app/(app)/turmas/[turma]/dsa/planilha/leitura.ts`, na mesma rodada de `Promise.all`, a semana corrente pela leitura da tela (`lerSemanaDoDsa`, com conflitos), e tirar dela o retrato de cada disciplina pelo mesmo cálculo do painel de situação (`quadrosDaSemana` em `app/(app)/turmas/[turma]/dsa/consulta.ts`) — é dali que saem *Atrasada* e *Conflitou* (`FR-025`)
- [ ] T057 [US4] Acrescentar `TODAY` ao vocabulário de `lib/planilha/formula.ts`, com o "hoje" do avaliador vindo do contexto do modelo, e o caso em `tests/unidade/planilha-formula.test.ts` (*adotado*, item 8)
- [ ] T058 [P] [US4] Escrever `tests/unidade/dsa/planilha-controle.test.ts` antes da aba: CH prevista do catálogo; data de referência numa célula com `TODAY()`, editável; CH lançada por `COUNTIFS` sobre a PREENCHIMENTO (`disciplinaDaCh`, data ≤ referência) mais `SUMIFS` sobre *sem posição*; restante = prevista − lançada; situação por fórmula nos três degraus com as **palavras de `lib/dominio/dsa/situacao.ts`**, comparada com `situacaoDaDisciplina` sem conflito e sem atraso para cada disciplina, inclusive a prevista zero que dá *Concluída* (`DP-1`, item 6); e a coluna de retrato, rotulada com a data da geração, só com *Atrasada* ou *Conflitou*. Tem de reprovar
- [ ] T059 [US4] Implementar `lib/dominio/dsa/planilha/controle.ts`, conforme `contracts/planilha.md` §6. `tests/unidade/dsa/planilha-controle.test.ts` verde
- [ ] T060 [P] [US4] Escrever `tests/unidade/dsa/planilha-cronos.test.ts` antes da aba: disciplina × semana com os TA lançados em cada semana (`COUNTIFS` por `disciplinaDaCh` nas linhas da semana), CH prevista, distribuída e restante, comparados com a contagem da ocupação do período por semana (`semanaIsoDe`). Tem de reprovar
- [ ] T061 [US4] Implementar `lib/dominio/dsa/planilha/cronos.ts` e acrescentar CONTROLE e CRONOS à montagem em `lib/dominio/dsa/planilha-de-contingencia.ts`, na ordem PREENCHIMENTO · IMPRESSÃO · BD DISCIPLINAS · HORÁRIOS · CONTROLE · CRONOS. `tests/unidade/dsa/planilha-cronos.test.ts` verde
- [ ] T062 [US4] Acrescentar a `tests/invariantes/planilha-igual-ao-papel.test.ts` a sexta reexpressão (`DP-1`): na turma semeada, a situação avaliada na CONTROLE igual a `situacaoDaDisciplina` sem conflito e sem atraso, e a coluna de retrato igual ao painel onde ele diz *Atrasada* ou *Conflitou*
- [ ] T063 [US4] Acrescentar a `tests/e2e/planilha-de-contingencia.spec.ts` que o arquivo baixado tem as seis abas na ordem

**Checkpoint US4**: CONTROLE e CRONOS acompanham o que se lança offline.

### Fase 9 — Prova do PR 2: os testes e os dois programas de verdade

- [ ] T064 Estender `tests/invariantes/planilha-de-conferencia.test.ts` e o gabarito à CONTROLE e à CRONOS, com a data de referência posta numa data fixa antes de comparar (o gabarito não pode depender do dia em que roda)
- [ ] T065 Estender `scripts/provas/planilha_no_excel.ps1` e rodar no Excel desta máquina: preencher COD e ITEM num TA vazio pela automação, recalcular e conferir +1 na CH lançada e −1 na restante da CONTROLE e +1 na semana da CRONOS; um lançamento depois da data de referência não conta; um defeito deliberado no critério de data tem de reprovar, e é desfeito. Anotar em `specs/015-planilha-de-contingencia-do-dsa/medicoes.md`
- [ ] T066 Conferir o arquivo do PR 2 no Google Planilhas pelo conector, como na T053 — pasta própria, dado sintético, **apagada no fim** —, e anotar em `specs/015-planilha-de-contingencia-do-dsa/medicoes.md`
- [ ] T067 Escrever `specs/015-planilha-de-contingencia-do-dsa/roteiro-de-conferencia-pr2.md` — o teste independente da US4 feito à mão nos dois programas
- [ ] T068 Fechar o PR 2: `pnpm verificar` **0** e `pnpm verificar:tudo` **0** sobre base limpa; sem migration (impressão digital igual à da T002, `git diff main -- supabase/` vazio); push, **CI verde nos três blocos**, PR 2 aberto com o template inteiro. **Sem merge** sem a palavra de Bernardo

**Checkpoint (c)**: as seis abas da spec entregues.

---

## Fase final — Encerramento

- [ ] T069 Depois da palavra de Bernardo e do merge de cada PR: registrar em `CLAUDE.md` (seção *Estado atual*) a planilha de contingência — PRs, commits, runs do CI, as respostas `DP-1` a `DP-5` e os *Achados* —, marcar o `Status` de `specs/015-planilha-de-contingencia-do-dsa/spec.md`, e apagar o ramo mesclado, local e remoto, conferindo pela lista de PRs mesclados (`gh pr list --state merged`), nunca por `git merge-base --is-ancestor`; e lembrar a `PEND-DSA-SUGESTAO` como o próximo PR

---

## Dependências e ordem

```text
Fase 1 ──► Grupo (a): Fase 2 (commit próprio) ──► Fase 3 ──┬──► US1 (Fase 4) ──┬──► US2 (Fase 5) ──┐
                                                           │                   └──► US3 (Fase 6) ──┴──► Fase 7 (PR 1)
                                                           │
                                                           └── (ramo do PR 1, empilhado) ──► US4 (Fase 8) ──► Fase 9 (PR 2) ──► Final
```

- **O grupo (a) bloqueia tudo**: a planilha lê pelo `lerPeriodoDoDsa` paginado, e ele tem de estar
  provado e commitado sozinho antes de qualquer linha da planilha.
- **US2 e US3 dependem de US1** (a PREENCHIMENTO e o catálogo existem nela) e **são paralelas entre
  si** — cada uma escreve o seu módulo de aba; a montagem (`planilha-de-contingencia.ts`) recebe as duas
  em sequência.
- **US4 depende do PR 1**, e não só de US1: ela lê a árvore e as abas do PR 1 — e, sem merge, o PR 2 é
  **empilhado** sobre o ramo dele.
- **Dentro de cada história**: o teste antes do código, e ele reprova primeiro; depois o módulo puro,
  a leitura, a rota e a tela.

## Paralelismo

- **Fase 1**: T002 e T003.
- **Grupo (a)**: T005, T007 e T008 — três testes, três arquivos, escritos antes do código.
- **Fase 3**: T014, T016, T019, T021, T022 e T024 juntas; T017 depois da T016.
- **US1**: T025, T026, T028, T032, T037 e T038 juntas.
- **US2 × US3**: T040 junto com T042 e T043.
- **US4**: T058 e T060.

### Exemplo — o começo da US1

```text
T025 tests/unidade/dsa/planilha-horarios.test.ts + lib/dominio/dsa/planilha/horarios.ts
T026 tests/unidade/dsa/planilha-catalogo.test.ts
T028 tests/unidade/dsa/planilha-preenchimento.test.ts (o retrato)
T032 app/(app)/turmas/[turma]/dsa/planilha/acesso.ts + o seu teste
T037 tests/unidade/toda-tela-tem-caminho.test.ts
T038 tests/invariantes/planilha-igual-ao-papel.test.ts (nada escrito)
```

## Estratégia de entrega

- **MVP de contingência = US1 + US3**: baixar o retrato e imprimir a semana já resolvem o dia em que o
  sistema cair. A US2 (fórmulas da entrada) torna o lançamento offline confortável e entra no **mesmo**
  PR 1, como a `Q-5` decidiu.
- **Incremento**: grupo (a) commitado e verde → US1 → US2 e US3 → prova do PR 1 → PR 1 aberto → (merge
  com a palavra de Bernardo) → US4 → prova do PR 2 → PR 2 aberto.

## Achados desta geração — listados, não corrigidos (regra 1)

1. ⚠️ **O formulário do DSA NÃO usa `preencherLancamento`, e a função não tem consumidor nenhum**
   (medido por varredura de `app/`, `lib/` e `components/` em 09/10/2026). A tela sugere o instrutor só
   pela atribuição **por UE** (`atribuidoId`, de `turma_disciplina_unidade` — o degrau que o cabeçalho de
   `pre-preenchimento.ts` mede com **zero** linhas no remoto em 05/10/2026), **nunca** pelo segundo
   degrau, e a técnica sugerida chega **`null` escrita à mão** (`app/(app)/turmas/[turma]/dsa/leitura.ts:632`).
   O `FR-014` da spec 013 manda a cascata inteira. **Consequência para esta spec:** a planilha, que
   sugere por `preencherLancamento` (R-9), vai sugerir **mais** do que a tela. ✅ **Decisão de Bernardo
   Villas Boas (09/10/2026, no analyze): a tela do DSA NÃO muda nesta spec** — é a pendência
   **`PEND-DSA-SUGESTAO`** (*"o formulário do DSA passa a usar `preencherLancamento` para sugerir
   instrutor e técnica"*), para um PR pequeno logo depois do merge da 015, registrada no `CLAUDE.md`.
2. ⚠️ **O teto de 1.000 linhas também alcançava a RPC `conflitos_da_semana`** — ela devolve a ocupação
   das outras turmas, e entra na paginação do grupo (a) pela mesma regra da `DP-5`. O volume dela não
   foi medido: **[pendente — medir na T010]**.

## O que NÃO está aqui

A volta da planilha para o sistema (`Q-1`) · qualquer escrita no remoto · pacote novo · migration ·
o DSA de reposição · a correção do formulário do DSA do *Achado 1* — é a `PEND-DSA-SUGESTAO`, depois do
merge desta spec.
