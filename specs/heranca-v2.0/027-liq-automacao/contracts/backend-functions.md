# Contrato — Funções de Backend (`lib/acoes/liq.ts`, novo)

## `trimestreParaIntervalo_(ano, trimestre)`

Pura. `trimestre` ∈ {1,2,3,4}.

**Retorno**: `{ inicio: Date, fim: Date }` — 1º trimestre 01/01–31/03, 2º 01/04–30/06,
3º 01/07–30/09, 4º 01/10–31/12, todos do `ano` informado.

## `intervalosSeInterceptam_(inicioA, fimA, inicioB, fimB)`

Pura. Retorna `boolean` — `inicioA <= fimB && inicioB <= fimA`.

## `validarLiq_(ano, trimestre)`

Lê `turmas`, `turma_disciplina`, `instrutor_disciplina`, `disciplinas` (cada aba uma
única vez). Não escreve nada.

**Retorno**: `{ podeGerar: boolean, problemas: string[] }`.

- `problemas` inclui, agrupadas por curso/turma, todas as disciplinas de `turma_disciplina` sem
  `Previsao_Inicio` ou sem `Previsao_Termino`, para toda turma não-cancelada cujo intervalo
  intercepta o trimestre (FR-004).
- `problemas` inclui, uma mensagem por disciplina, toda linha de `turma_disciplina` com período
  preenchido que intercepta o trimestre e não tem nenhum `instrutor_disciplina` com
  `Status === 'Ativo'` (FR-005).
- Roda as duas checagens por completo antes de retornar — nunca interrompe na primeira ocorrência
  (FR-006).

## `montarDadosSecao1Liq_()`

Lê `instrutores`, `instrutor_disciplina`, `disciplinas`. Não escreve nada.

**Retorno**: array de objetos, um por instrutor elegível (`Status === 'Ativo'` e ≥1 vínculo ativo em
`instrutor_disciplina`), ordenado diretamente pela coluna já persistida `Antiguidade_Declarada`
(`.sort((a,b) => a.Antiguidade_Declarada - b.Antiguidade_Declarada)`) — **não** via
`ordenarInstrutoresPorAntiguidade_` (frontend, inacessível ao backend) nem via
`ordenarPorAntiguidadePosto_` (assinatura incompatível, recebe pares agregados `{posto,
quantidade}`, não registros de instrutor; achado de `/speckit-analyze`). Cada objeto expõe as 8
colunas da Seção 1:
`pg`, `nome`, `omDivisao`, `assuncaoSetor`, `formacao`, `disciplinasHabilitadas` (string formatada
"NOME (CH)" por disciplina, separadas por `; `), `cargaHoraria` (via `listarInstrutoresComCargaHoraria()`),
`obs` (sempre `''`, FR-009).

## `montarDadosSecao2Liq_(ano, trimestre)`

Lê `turmas`, `turma_disciplina`, `disciplinas`, `instrutor_disciplina`, `instrutores`,
`cursos`. Não escreve nada. Assume que `validarLiq_` já confirmou `podeGerar === true` para o
mesmo `(ano, trimestre)` (não repete a validação).

**Retorno**: array de objetos, um por (turma elegível × linha de `turma_disciplina` cujo período
intercepta o trimestre), na ordem em que as turmas/disciplinas aparecem em `turmas`/`disciplinas`. Cada objeto expõe as 5 colunas da Seção 2: `curso` (nome + sufixo de turma lido de
`turmas.Turma`, ex.: `"C-ApA-AuxNav-PR-SP T2"`), `disciplina`, `periodo` (formatado
`DD/MM/AAAA a DD/MM/AAAA`), `instrutores` (nomes+postos separados por `; `, sem rótulo titular/
reserva — LIQ-3 fora de escopo), `observacoes` (OM de cada instrutor, mesma ordem de `instrutores`).

## `gerarLiq(ano, trimestre)`

Função pública exposta via Server Action.

1. Chama `validarLiq_(ano, trimestre)`; se `podeGerar === false`, lança `Error` com `problemas.
   join('\n')` — nenhuma leitura/escrita no Supabase Storage acontece antes disso (FR-006).
2. Chama `montarDadosSecao1Liq_()` e `montarDadosSecao2Liq_(ano, trimestre)`.
3. Copia o Template (`ID_TEMPLATE_LIQ` de `config_parametros`) para `pastaLiqInstrutores_()`.
4. `replaceText` no corpo para as tags de documento (`{{TRIMESTRE_EXTENSO}}`, `{{TRIMESTRE_CURTO}}`,
   `{{ANO}}`, `{{VIGENCIA_INICIO}}`, `{{VIGENCIA_FIM}}`, `{{NOTAS_SECAO2}}`, `{{COMANDANTE_NOME}}`,
   `{{COMANDANTE_POSTO}}`, `{{DIRETOR_NOME}}`, `{{DIRETOR_POSTO}}`).
5. Para a tabela de 8 colunas: clona a linha-modelo uma vez por item de `montarDadosSecao1Liq_()`,
   `replaceText` escopado à linha recém-clonada (tags `{{L1_*}}`), remove a linha-modelo original ao
   final.
6. Para a tabela de 5 colunas: mesmo processo com `montarDadosSecao2Liq_()` (tags `{{L2_*}}`).
7. Salva e retorna `{ url: string }`.

**Erros**: lança `Error` de mensagem legível em qualquer ponto de falha (template ausente, sem
permissão de pasta) — capturado pelo `.withFailureHandler` do frontend (mesmo padrão de
`salvarFichaClick_`, spec 025).

## `pastaLiqInstrutores_()`

Espelha `pastaFichasInstrutores_()` (`lib/acoes/instrutores.ts`) — `o Supabase Storage.getFolderById`/`createFolder`
idempotente para a pasta "Listas de Instrutores Qualificados".

## Alterações em `lib/acoes/crud.ts`

- `CRUD_CONFIG['turma_disciplina']` — nova entrada, mesmo perfil de leitura/escrita de `disciplinas` (Divisão de Orientação Educacional e Pedagógica + Admin), sem `COLUNAS_FORMULA`
  (nenhuma coluna calculada nesta aba).
