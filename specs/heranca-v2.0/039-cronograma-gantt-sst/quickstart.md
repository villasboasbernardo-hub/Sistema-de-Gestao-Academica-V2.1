# Quickstart — Gráfico de Gantt e Fonte Única de Dados no Módulo de Cronograma

Roteiro de validação manual contra o app publicado (aplicação Next.js via `o fluxo Git → Vercel`).

## Passo 1 — Nomenclatura de Turma idêntica (User Story 1)

1. Abra o Módulo de Disciplinas, selecione um Curso com 2+ turmas no mesmo ano, anote os rótulos
   do dropdown de Turma (ex. "Turma 01/2026", "Turma 02/2026").
2. Abra o Módulo de Cronograma, selecione o mesmo Curso.
3. **Esperado**: os rótulos do dropdown de Turma são idênticos, caractere a caractere, aos do
   Módulo de Disciplinas — nunca o nome completo cru do curso (ex. nunca "CAHO 2026").

## Passo 2 — Gantt do ano vigente, agrupado por Turma (User Story 2)

1. No Módulo de Cronograma, com o ano atual selecionado, escolha uma Turma com 3+ disciplinas com
   datas de Início/Término diferentes cadastradas.
2. **Esperado**: aparece 1 Gantt com 1 barra por disciplina (eixo Y = nome da disciplina),
   início/término batendo exatamente com o painel "Editar" do Módulo de Disciplinas para a mesma
   turma.
3. Troque para o Curso sem selecionar Turma (todas as turmas do curso).
4. **Esperado**: aparece 1 Gantt por Turma, empilhados verticalmente, cada um com um cabeçalho
   "Turma \<rótulo\>" acima.
5. Se alguma disciplina não tiver Data de Início ou Término cadastrada — **esperado**: ela não
   aparece no Gantt, sem quebrar a renderização das demais.
6. Sem nenhum Curso selecionado — **esperado**: nenhum Gantt aparece.

## Passo 3 — Filtros avançados reativos (User Story 3)

1. Com o Gantt de uma turma aberto, aplique o filtro de Instrutor.
2. **Esperado**: só as barras das disciplinas daquele instrutor permanecem, instantaneamente
   (< 1s), sem nenhuma nova chamada de rede (verificar na aba Network do navegador — nenhuma
   chamada nova a Server Action/`gs`).
3. Combine 2+ filtros (ex. Instrutor + Status da Disciplina).
4. **Esperado**: só as barras que batem com **todos** os filtros ativos aparecem.
5. Escolha uma combinação sem nenhuma disciplina correspondente.
6. **Esperado**: mensagem "nenhuma disciplina" em vez de um Gantt vazio ou quebrado.

## Passo 4 — Grade antiga removida; CSV e impressão sobre o Gantt (User Story 4)

1. Abra o Módulo de Cronograma.
2. **Esperado**: não existe mais nenhum dropdown "Visão" (Por disciplina/Por instrutor) nem
   nenhuma tabela previsto×executado — só o(s) Gantt(s).
3. Com um Gantt renderizado (com filtros aplicados), clique em "Exportar CSV".
4. **Esperado**: o arquivo baixado contém 1 linha por barra atualmente visível (Curso, Turma,
   Disciplina, Início, Término, Instrutor(es)) — nunca a matriz semanal do formato antigo.
5. Clique em "Imprimir".
6. **Esperado**: a área impressa é o(s) Gantt(s) visível(is), no lugar da tabela antiga (mesmo
   padrão de página única já usado no DSA/Ficha do Instrutor).

## Passo 5 — Gantt cobre a prévia do motor preditivo em ano futuro (User Story 5)

1. Selecione um ano futuro no Cronograma, para um Curso que ainda não tem nenhuma prévia salva.
2. **Esperado**: aviso "Este ano ainda não tem planejamento oficial salvo..." em vez de Gantt vazio
   ou tela quebrada.
3. Use o motor preditivo (botões "Gerar prévia" → "Salvar versão como planejamento oficial") para
   esse curso/ano.
4. Volte a selecionar o mesmo curso/ano.
5. **Esperado**: aparece 1 único Gantt (sem sub-agrupamento por Turma — a prévia não tem turma
   real), 1 barra por disciplina com tempo alocado na prévia, início/término batendo com a semana
   mais cedo/mais tarde com tempo alocado.
6. Aplique os 3 filtros avançados neste Gantt de ano futuro.
7. **Esperado**: os 3 controles continuam visíveis e reativos; Status da Turma e Instrutor não têm
   nenhuma opção além de "Todos" (sem turma/instrutor estruturado na prévia); Status da Disciplina
   sempre resolve para "Não Iniciada" — nenhum erro, nenhuma tela quebrada.
8. Gere/edite/salve uma nova versão da prévia para o mesmo ano e volte ao Gantt.
9. **Esperado**: o Gantt reflete a versão `Salvo` mais recente.

## Passo 6 — Regressão do motor preditivo em si (Edge Cases)

1. Com um ano futuro selecionado, use os 3 botões do motor preditivo (Gerar prévia, Lançar evento
   manual, Salvar).
2. **Esperado**: os 3 continuam funcionando exatamente como antes desta spec (mesmos prompts,
   mesmas mensagens de sucesso/erro) — só a visualização do resultado mudou (Gantt em vez da grade
   antiga).
