# Quickstart — Filtros Avançados (Instrutor/Status) e Gráfico Proporcional (Módulo Disciplinas)

Roteiro de validação manual contra o app publicado (aplicação Next.js via `o fluxo Git → Vercel`). Pré-requisito: login
 com perfil que tenha acesso de leitura ao Módulo de Disciplinas (qualquer um dos 9 perfis).

## Passo 1 — Filtro de Status da Turma (User Story 1)

1. Abra o Módulo de Disciplinas sem selecionar nenhum Curso (estado inicial, disciplinas do ano
   vigente de todos os cursos).
2. No filtro "Status da Turma", selecione "Ativa".
3. **Esperado**: só linhas de turmas com `Status='Ativa'` permanecem na tabela; os 4 cartões
   estatísticos e o gráfico de rosca recalculam para esse subconjunto.
4. Volte o filtro para "Todos" — a lista volta ao estado anterior (turmas `Cancelada` continuam
   fora, mesmo comportamento padrão da spec 035, a menos que "Cancelada" seja escolhida
   explicitamente).

## Passo 2 — Filtro de Instrutor (User Story 2)

1. Selecione um Curso com pelo menos 2 turmas/disciplinas com instrutores diferentes alocados.
2. Confira que o dropdown de Instrutor lista só quem está de fato alocado no recorte atual
   (Curso/Turma/Status da Turma), ordenado por antiguidade (postos mais graduados primeiro).
3. Selecione um instrutor — **esperado**: só disciplinas com aquele instrutor alocado (`turma_disciplina.ID_Instrutor`, CSV) permanecem visíveis.
4. Troque de Turma — **esperado**: o filtro de Instrutor volta a "Todos" e a lista de opções é
   recalculada para o novo recorte.

## Passo 3 — Filtro de Status da Disciplina (User Story 3)

1. Com uma turma selecionada contendo disciplinas em mais de um estágio de execução, selecione
   "Concluída" no filtro de Status da Disciplina.
2. **Esperado**: só disciplinas com Carga Horária Cumprida ≥ Carga Horária Total permanecem
   visíveis — a mesma contagem de "Concluída" do gráfico de rosca do painel estatístico (abra o
   painel e confira que os números batem).
3. Repita para "Não Iniciada" e "Em Andamento".

## Passo 4 — Combinação de filtros (FR-004)

1. Aplique Curso + Turma + Status da Turma + Instrutor + Status da Disciplina simultaneamente,
   numa combinação que ainda deixe pelo menos 1 linha visível.
2. **Esperado**: tabela e cartões refletem exatamente a interseção dos 5 filtros.
3. Escolha uma combinação sem nenhuma linha correspondente (ex.: Status da Disciplina "Concluída" +
   Instrutor que só está alocado numa disciplina "Não Iniciada").
4. **Esperado**: mensagem "nenhuma disciplina" na tabela, cartões zerados — nunca erro no console.

## Passo 5 — Gráfico de pizza (User Story 4)

1. Sem nenhum Curso selecionado — **esperado**: gráfico de pizza ausente.
2. Selecione o CAHO — **esperado**: gráfico de pizza aparece com uma fatia por disciplina `Ativo`
   do curso, rotulada por Código/Nome, percentuais somando a Carga Horária Total do curso.
3. Selecione uma Turma do CAHO (sem desselecionar o Curso) — **esperado**: gráfico de pizza
   continua visível (é por Curso, não por Turma).
4. Se disponível, selecione um curso sem nenhuma disciplina ativa cadastrada — **esperado**:
   gráfico de pizza ausente, sem erro.

## Passo 6 — Filtros desabilitados na visão de catálogo puro (FR-006)

1. Selecione um Curso sem selecionar nenhuma Turma (visão de catálogo puro, sem coluna de
   Início/Término/Instrutores/CH Cumprida).
2. **Esperado**: os 3 selects novos (Status da Turma, Instrutor, Status da Disciplina) aparecem
   desabilitados (cinza, não clicáveis) — nunca interativos sem efeito.
3. Selecione uma Turma desse Curso — **esperado**: os 3 selects voltam a ficar habilitados.
4. Desselecione o Curso (volta ao estado inicial) — **esperado**: os 3 selects continuam
   habilitados (o estado inicial é uma das 2 visões turma-aware, FR-006).

## Passo 7 — Ausência de chamada de rede nova (SC-001)

1. Abra a aba Rede (Network) do navegador antes de interagir com os filtros novos.
2. Aplique/troque os 3 filtros novos várias vezes.
3. **Esperado**: nenhuma requisição nova da Server Action disparada só pela mudança desses 3
   filtros (as únicas chamadas de rede esperadas são as já existentes ao trocar Curso/Turma).
