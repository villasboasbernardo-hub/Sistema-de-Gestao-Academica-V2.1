# Quickstart — Hotfix: Polimento de UI/UX, Gráficos e Regra Global de Nomenclatura de Cursos

Roteiro de validação manual contra a aplicação Next.js implantada (a suíte automatizada —
`pnpm vitest run` — cobre as funções puras alteradas/novas:
`ordenarPorAntiguidadePostoClient_`, `agregarEstatisticasInstrutores_`,
`disciplinasHabilitadasDoInstrutor_`; este roteiro cobre a parte de interface e o caminho de
escrita que não têm harness disponível: renderização de gráfico Recharts, botão condicional, e a
gravação real de `reativarInstrutor` contra a banco de produção).

## Pré-requisitos

- Acesso à aplicação Next.js com um perfil autorizado a editar/desativar instrutor (RF-INSTR-12).
- Um `ID_Instrutor` de teste que possa ser desativado e reativado sem afetar dado real (nunca usar
  um instrutor com vínculos ativos de produção).
- Um curso qualquer com `ID_Curso` (sigla) e `Nome_Curso` visivelmente diferentes (ex.: `CAHO` vs.
  nome por extenso), para os Passos 3/4.

## Passo 1 — Gráficos do painel de estatísticas de Instrutores (US1)

1. Abrir a aba "Instrutores" e expandir o painel de estatísticas.
2. Confirmar que o card antes chamado "Qualificados vs. Selecionados" agora tem o título exato
   "Status de Seleção", com as 2 barras (Qualificados/Selecionados) e seus totais reais inalterados.
3. No gráfico "Posto/Graduação", confirmar que cada barra é rotulada só pela sigla (`CMG`, `1ºTen`
   etc.) — nenhum nome por extenso deve aparecer na legenda/eixo.
4. Confirmar que existe um novo gráfico de pizza "Índice de Capacitação Geral" com exatamente 2
   fatias ("Com Capacitação Didática"/"Sem Capacitação Didática"), cuja soma bate com o total de
   instrutores exibidos, e que o gráfico de barras existente "Capacitação Didática" (por tipo)
   continua presente, sem ter sido substituído.
5. Aplicar um filtro (ex.: Curso ou Categoria) e confirmar que os 3 elementos acima recalculam
   junto com os demais gráficos do painel, sem nenhuma requisição de rede nova (aba Rede do
   navegador).
6. Abrir a Ficha impressa (botão "Imprimir Ficha") de um instrutor com posto preenchido — confirmar
   que o campo Posto/Graduação da Ficha continua mostrando "SIGLA — Nome por extenso" (ex.: "CMG —
   Capitão de Mar e Guerra"), sem regressão da tradução usada só ali (FR-003).

## Passo 2 — Botão "Reativar" (US2)

1. Localizar o instrutor de teste com `Status = Ativo` — confirmar que a linha mostra "Desativar"
   (vermelho) e nenhum botão de reativação.
2. Clicar em "Desativar", confirmar a caixa de diálogo — instrutor passa a `Status = Inativo`.
3. Confirmar que a mesma linha agora mostra "Reativar" (verde) no lugar de "Desativar", e que
   "Editar"/"Imprimir Ficha" continuam presentes.
4. Clicar em "Reativar" — confirmar que uma caixa de diálogo de confirmação aparece antes de
   qualquer gravação (Clarifications 2026-08-18).
5. Confirmar a reativação — a listagem recarrega, o instrutor volta a `Status = Ativo`, "Desativar"
   reaparece no lugar de "Reativar".
6. Abrir a banco de produção e confirmar diretamente na tabela `instrutores` que `Status = 'Ativo'` foi
   gravado para o `ID_Instrutor` de teste, e que nenhum outro campo da linha mudou de valor.
7. Abrir o DSA de uma turma qualquer e confirmar que o instrutor reativado volta a aparecer no
   dropdown de instrutor do lançamento manual de Aula — mesmo mecanismo de filtro por `Status`
   já confiável para qualquer outro instrutor ativo, sem lógica nova (Edge Case do spec.md).

## Passo 3 — Dropdowns e listas de curso com sigla (US3)

1. Abrir Cronograma, Disciplinas e (como Admin) o formulário de vínculo Encarregado↔Curso em
   Usuários — confirmar que o dropdown de curso de cada tela mostra só a sigla (`ID_Curso`), nunca o
   nome completo, e que selecionar uma opção continua filtrando/gravando o curso certo (comparar com
   o comportamento anterior à mudança, se possível).
2. Na aba Instrutores, abrir o filtro "Curso" da barra de 8 filtros — confirmar que as opções também
   mostram só a sigla, e que filtrar por uma delas continua retornando os instrutores certos.
3. Em Usuários, abrir um usuário com pelo menos um curso já vinculado — confirmar que a lista de
   cursos vinculados mostra a sigla, não o nome completo.
4. Se existir na banco de produção algum curso com `ID_Curso` em branco (não deveria ocorrer, Edge Case
   do spec.md), confirmar que ele aparece como opção/item vazio nos pontos acima, sem lançar erro no
   console — se nenhum curso assim existir hoje, este item fica sem verificação prática (aceito,
   mesmo tratamento dado a outros edge cases defensivos desta sessão).

## Passo 4 — Ficha/"Disciplinas Habilitadas" com sigla entre parênteses (US3)

1. Abrir a edição de um instrutor com pelo menos uma disciplina habilitada.
2. No bloco read-only "Disciplinas Habilitadas", confirmar que cada linha está no formato
   `"<Nome da Disciplina> (<Sigla do Curso>)"` (ex.: "Oceanografia (CAHO)"), nunca
   `"<Nome completo do curso> — <Disciplina>"`.
3. Abrir a Ficha impressa do mesmo instrutor — confirmar o mesmo formato na seção correspondente.

## Passo 5 — Exceções confirmadas intactas (US3)

1. Abrir o Painel Início — confirmar que os cartões de curso continuam mostrando o nome completo,
   sem nenhuma mudança visual.
2. Abrir a Página do Curso — confirmar que o título de cada cartão de curso continua com o nome
   completo.
3. Abrir o DSA ou o Cronograma de uma turma qualquer — confirmar que o nome da turma exibido
   continua embutindo o nome completo do curso (comportamento inalterado, fora de escopo por ser
   `FORMULA` de schema).

## Resultado esperado

Todos os 5 passos concluídos sem exceção no console do navegador; nenhuma regressão nos 3 pontos do
Passo 5; a gravação do Passo 2 confirmada diretamente na banco de produção, não só na tela.
