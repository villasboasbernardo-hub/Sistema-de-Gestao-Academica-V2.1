# Research: Motor de Atribuição de Instrutores Multidisciplinares e Rateio de Carga Horária Prevista

## 1. Gatilho "disciplina multidisciplinar" — `Modo_Atribuicao_Padrao` em vez de nome

**Decisão**: `disciplinaGrade.Modo_Atribuicao_Padrao === 'Simultaneo'` é o único gatilho — nunca
comparação de string no nome da disciplina.

**Rationale**: Já registrado em spec.md §Achados reais — `RN-MAT-05` (aprovada, nunca implementada)
já define exatamente essa distinção (`Dividido`/`Simultaneo`), semeada desde a migração para 3
disciplinas de encerramento reais (o pedido original citava só 2) e extensível a qualquer outra via
cadastro, sem mudança de código (constitution Princípio VII).

**Alternatives considered**: `nome.includes('LHFC') || nome.includes('Prática de Fim de Curso')`
(pedido original) — rejeitado: frágil (não cobre "Prática de Manutenção de Auxílios à Navegação"),
não administrável sem deploy, e reimplementaria em código uma regra que o cadastro já resolve.

## 2. Onde calcular `CH_Prevista_Por_Instrutor`

**Decisão**: Dentro de `atualizarTurmaDisciplina` (`lib/acoes/liq.ts`), sempre que `alteracoes['ID_Instrutor']`
estiver presente no payload — delega o cálculo a uma função pura nova,
`calcularChPrevistaPorInstrutor_(idsInstrutor, chTotalDisciplina, dividirCargaHoraria)`.

**Rationale**: `atualizarTurmaDisciplina` já é o único ponto de escrita de `ID_Instrutor` em `turma_disciplina`, chamado pelas duas telas (spec 029/030) — estender esse único ponto garante que o
cálculo nunca diverge entre as duas superfícies de UI (FR-004/FR-009), e evita duplicar a leitura de
`disciplinas.Carga_Horaria_Tempos` em cada tela. A função em si é pura (sem I/O), testável
isoladamente com `pnpm vitest run`, mesmo padrão de `intervaloContidoEm_`/`semestreParaIntervalo_`.

**Alternatives considered**: Calcular no cliente e enviar o resultado já pronto — rejeitado: exigiria
duplicar `Carga_Horaria_Tempos` em 2 arquivos `.html` (que não compartilham código entre si) e abriria
brecha para um cliente malicioso/desatualizado gravar um rateio inconsistente; o servidor é sempre a
fonte de verdade para dado persistido (mesmo espírito de `intervaloContidoEm_` ser sempre revalidado
no servidor mesmo com a cópia client-side de conveniência, spec 030).

## 3. Elegibilidade do instrutor: só filtro client-side, sem espelho server-side

**Decisão**: Esta spec implementa o filtro "quais instrutores aparecem" somente no cliente (as duas
telas, de forma simétrica) — `atualizarTurmaDisciplina` **não** valida se cada `ID_Instrutor`
recebido é de fato elegível (habilitado à disciplina, ou a qualquer disciplina do curso quando
`Simultaneo`).

**Rationale**: O pedido original descreve uma regra de **exibição** ("o sistema DEVE listar..."), não
uma regra de **bloqueio de gravação**. Diferente da validação de janela de período (spec 029/030,
onde o pedido original já pedia explicitamente bloqueio "crucial"), aqui não há pedido de bloqueio
server-side — adicioná-lo seria escopo não solicitado (constitution Princípio IX). Fica registrado
aqui como possível endurecimento futuro, não como lacuna desta spec.

**Alternatives considered**: Replicar a checagem de elegibilidade no servidor, rejeitando `ID_
Instrutor` fora da lista elegível — rejeitado por escopo (ver acima); pode ser proposto como spec
separada se um caso real de contorno for observado em produção.

## 4. Aritmética do rateio — divisão inteira, resto no último

**Decisão**: `base = Math.floor(chTotal / N)`; os primeiros `N-1` instrutores (na ordem em que
aparecem em `idsInstrutor`) recebem `base`; o último recebe `base + resto`, onde
`resto = chTotal - base*N`.

**Rationale**: `Carga_Horaria_Tempos` é sempre um inteiro de "tempos" (TA) em todo o projeto (nunca
fracionário — confirmado em `lib/acoes/cronograma.ts`/`lib/acoes/estatisticas.ts`, sempre `Number(...) || 0` sobre
valores inteiros). Uma divisão que preserva a soma exata (SC-003) exige que a diferença de
arredondamento vá para algum lugar determinístico — "o último da lista" é simples, auditável e
já é o mesmo tipo de regra de desempate determinístico usado em outros pontos do projeto (ex.
`dedupCursosPorId_`, "primeira linha vence").

**Alternatives considered**: Distribuir o resto entre os primeiros instrutores (1 TA a mais cada, até
o resto acabar) — rejeitado por complexidade desnecessária sem pedido explícito; "último absorve
tudo" é mais simples e igualmente correto para o critério de aceite (soma bate exatamente).

## 5. Formato de `turma_disciplina.CH_Prevista_Por_Instrutor`

**Decisão**: TEXTO, pares `"ID_Instrutor:valor"` separados por vírgula-espaço — ex.
`"INST-000012:50, INST-000034:50"`. Mesmo espírito de `ID_Instrutor` (lista simples, legível,
column header-driven, RN-CRUD-01), mas com pareamento explícito (não posicional) para nunca depender
da ordem coincidir entre as 2 colunas.

**Rationale**: Evita introduzir uma segunda aba/entidade (rejeitado por Princípio VI, mudança
cirúrgica — mesmo precedente de spec 029, que adicionou 1 coluna a `turma_disciplina` em vez de criar
uma tabela nova). Pareamento explícito (`ID:valor`) é mais robusto que 2 CSVs posicionais paralelos
(`ID_Instrutor`/`CH_Prevista_Por_Instrutor`), que quebrariam silenciosamente se alguma gravação futura
alterasse a ordem de um dos dois.

## 6. Exibição da CH Prevista

**Decisão**: Cada tela, ao renderizar os checkboxes de instrutor, mostra a CH Prevista atual (se
houver, de um salvamento anterior) ao lado do nome — parseando `linha.CH_Prevista_Por_Instrutor`
sempre que a linha é (re)carregada do servidor. Nenhuma pré-visualização ao vivo antes de salvar
(o valor exibido é sempre o último persistido).

**Rationale**: Satisfaz a verificabilidade do critério de aceite ("o sistema divide a carga horária
perfeitamente") sem exigir um segundo motor de cálculo no cliente (que duplicaria
`calcularChPrevistaPorInstrutor_` em 2 arquivos `.html`, achado já evitado na decisão §2). Ambas as
telas já recarregam a linha do servidor após salvar (`app/(app)/disciplinas/page.tsx`) ou permitem reabrir o
painel (`app/(app)/cursos/[curso]/page.tsx`), então o valor persistido está sempre a 1 ação de distância.
