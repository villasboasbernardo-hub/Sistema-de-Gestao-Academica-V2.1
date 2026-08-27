# Research: Limpeza de Colunas Mortas em disciplinas e Coerência de Datas por Turma

## 1. Remoção de múltiplas colunas na mesma migração — ordem de exclusão

**Decisão**: Localizar os índices das 3 colunas (`Instrutores_Selecionados`,
`Tecnica_Ensino_Sugerida`, `Local_Padrao`) uma única vez no início do script, e excluí-las em ordem
**decrescente de índice** (maior coluna primeiro).

**Rationale**: `openpyxl`'s `ws.delete_cols(idx)` desloca todas as colunas à direita 1 posição para
a esquerda imediatamente. Excluir em ordem crescente invalidaria os índices já calculados das
colunas seguintes (ex.: remover a coluna 5 primeiro faz a antiga coluna 8 virar coluna 7). Ordem
decrescente evita esse problema sem precisar recalcular índices a cada remoção — mesma técnica já
usada implicitamente em `remover_instrutor_completo_adicionar_estado.py`, que remove só 1 coluna e
recalcula (`col = indice_colunas(ws)`) antes de qualquer operação subsequente.

**Alternatives considered**: Recalcular o índice antes de cada remoção individual (`indice_colunas(ws)`
chamado 3 vezes) — funcionalmente equivalente, mas 3 varreduras da linha de cabeçalho em vez de 1;
rejeitado por simplicidade desnecessária quando ordenar por índice decrescente resolve com 1 só
varredura.

## 2. Onde resolver a preferência turma_disciplina > disciplinas

**Decisão**: Função pura nova, `resolverPeriodoEfetivo_(linhaTurmaDisciplina, disciplinaGrade)`, em
`lib/acoes/cronograma.ts` — usada pelas 2 funções que precisam da correção
(`getDisciplinasDaTurmaComRitmo`/`getCronogramaGlobalDisciplina`). Regra: se `linhaTurmaDisciplina`
existir E tiver **ambos** `Previsao_Inicio`/`Previsao_Termino` preenchidos, usa o par da turma;
senão usa o par de `disciplinaGrade` (semente) — nunca mistura 1 campo de cada fonte.

**Rationale**: Tratar o par como atômico (não misturar `Previsao_Inicio` da turma com
`Previsao_Termino` da grade) evita uma janela inconsistente que nenhuma das 2 fontes realmente
representa — mesmo espírito de `intervaloContidoEm_`/`atualizarTurmaDisciplina` (spec 029), que
sempre trata início+término como unidade. Colocar a função em `lib/acoes/cronograma.ts` (não `lib/acoes/liq.ts`) porque
as 2 funções que a consomem já vivem lá, e a "semente vs. real por turma" aqui é sobre **leitura**
de ritmo/cronograma, um domínio distinto da escrita/validação de período que `lib/acoes/liq.ts` já possui
(`atualizarTurmaDisciplina`).

**Alternatives considered**: Misturar campo a campo (usar `Previsao_Inicio` da turma se presente,
`Previsao_Termino` da grade se a turma não tiver) — rejeitado, cria uma janela artificial que nunca
existiu em nenhuma fonte real. Colocar a função em `lib/acoes/liq.ts` — rejeitado, os 2 consumidores reais
estão em `lib/acoes/cronograma.ts`, e `lib/acoes/liq.ts` já tem escopo próprio (LIQ + seleção/rateio de instrutor).

## 3. Por que só 2 das ~5 leituras de `disciplinas.Previsao_Inicio/Termino` são corrigidas

**Decisão**: Corrigir só `getDisciplinasDaTurmaComRitmo`/`getCronogramaGlobalDisciplina` — as 2
únicas funções que já recebem `idTurma` como parâmetro mas ainda ignoram `turma_disciplina`.
`lib/dominio/motor-preditivo.ts`, `lib/acoes/estatisticas.ts` (sem filtro de turma) e `lib/dominio/sugestao-dsa.ts` continuam lendo a
semente de `disciplinas` sem nenhuma mudança.

**Rationale**: A inconsistência real (achado da auditoria de premissa) é especificamente "função
recebe `idTurma`, mas não usa para resolver a data" — um bug de coerência genuíno. `lib/dominio/motor-preditivo.ts`
simula anos futuros sem `turma_disciplina` (não tem outra fonte possível); `lib/acoes/estatisticas.ts` sem
filtro de turma não tem "uma turma" para preferir; `lib/dominio/sugestao-dsa.ts` (achado da auditoria) tem o
mesmo padrão que os 2 corrigidos, mas seu uso da data é para sugestão de distribuição semanal, fora
do escopo desta spec (não citado no pedido original nem teve consumidor de UI reportando
inconsistência) — fica registrado aqui como candidato a uma spec futura, não incluído nesta por
Contenção de Escopo (constitution Princípio IX).

**Alternatives considered**: Corrigir também `lib/dominio/sugestao-dsa.ts` nesta mesma spec — rejeitado por
escopo (nenhuma evidência de bug reportado ali, ao contrário das 2 funções de `lib/acoes/cronograma.ts` que
alimentam diretamente as telas construídas nas specs 031/032 desta sessão).

## 4. Migração é só estrutural — sem transformação de dado

**Decisão**: A migração desta spec só remove colunas (nenhuma linha, nenhum valor é transformado ou
transportado) — diferente das migrações de specs anteriores (027/029/032) que semeavam dado novo a
partir de dado existente.

**Rationale**: As 3 colunas removidas não têm nenhum consumidor (Achados reais) — não há "dado
válido para resgatar" antes de apagar, ao contrário do que o pedido original presumia (`(b)
Transferir quaisquer datas válidas que estejam na tabela errada`). `Previsao_Inicio`/
`Previsao_Termino`/`ID_Instrutor` de `disciplinas` — que teriam dado real — permanecem
intocadas (fora de escopo, FR-006).
