# Feature Specification: Hotfix — Carrosséis Fixos da Página Inicial (Catálogo Completo)

**Feature Branch**: `013-hotfix-carrosseis-pagina-inicial`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "HOTFIX: Reestruturação dos Carrosséis da Página Inicial. A página
inicial atual está aplicando um filtro restritivo que exibe apenas cursos com turmas em andamento.
Essa regra de negócio foi alterada e a interface precisa refletir todo o catálogo. Refatorar a
exibição (frontend) e a busca de dados (backend .ts) da página inicial para exibir 100% dos cursos,
agrupados em 5 carrosséis fixos (Cursos Regulares, Cursos Especiais, Cursos Expeditos, Cursos de
Aperfeiçoamento Avançado, Estágios de Qualificação), independentemente do status atual de suas
turmas, com empty state por categoria e sem alterar Design System nem comportamento de clique."

## Contexto e achados confirmados no código antes desta spec

Verificação direta do código da Página Inicial (`app/(app)/inicio/page.tsx`, o "Painel Início"
entregue pelo Épico 009) antes de escrever qualquer requisito:

1. **O backend já não filtra por status de turma.** `getContextoInicial` (`lib/acoes/
   `app/layout.tsx` + `lib/supabase/server.ts`:39-108`) monta `cursos` lendo `cursos` inteira, filtrando só pelo escopo de
   acesso do usuário (`usuarioTemAcessoAoCurso_`) — nenhuma condição de `Status` de turma entra
   nesse filtro. `turmasEmDestaque`, por outro lado, só é preenchido para cursos com uma turma
   `Status=Ativa` cuja janela `Data_Inicio`–`Data_Termino` cobre a data de hoje
   (`resolverTurmaEmDestaque_`, linha 116) — cursos sem essa turma específica simplesmente não
   ganham uma entrada em `turmasEmDestaque`.
2. **O filtro restritivo relatado pelo usuário vive inteiramente no front-end.**
   `renderizarPainelInicio()` (``app/(app)/inicio/page.tsx`:21-63`) itera `AppState.ctx.cursos` e, na linha 29,
   descarta qualquer curso sem entrada em `turmasEmDestaque` (`if (!destaque) return;`) — é essa
   linha que produz o sintoma "só mostra cursos com turma em andamento".
3. **Este comportamento já foi revisado uma vez e mantido de propósito.** O Hotfix 010
   (`specs/010-hotfix-sidebar-carrossel-estatisticas/spec.md`, FR-007/Assumptions) verificou o
   mesmo ponto e decidiu explicitamente **não** alterá-lo, registrando-o como "comportamento
   intencional e já validado no Épico 009". Este hotfix **reabre e reverte** essa decisão porque a
   regra de negócio que a justificava mudou (contexto obrigatório do pedido) — não é uma correção
   de bug não percebido antes, é uma mudança de requisito.
4. **O agrupamento por classificação já tem precedente direto no mesmo repositório.**
   `agruparCursosParaPagina_` (`app/(app)/cursos/[curso]/page.tsx`:36-45`, criada no Hotfix 010) já resolve
   exatamente "mostrar 100% dos cursos agrupados por classificação, sem depender de turma em
   destaque" para a Página do Curso — sem badge nem barra de progresso de turma no cartão, só dados
   do curso (nome, classificação, duração). Este hotfix reaproveita o mesmo padrão de cartão para a
   Página Inicial, para as duas telas ficarem consistentes.
5. **O domínio de classificação de curso já é fechado em 5 valores.** O glossário
   (`docs/fase-1/07-Glossario.md:117`) define exatamente 5 categorias: Curso Regular, Curso
   Expedito, Curso Especial, Curso de Aperfeiçoamento Avançado, Estágio de Qualificação — o mesmo
   conjunto que `CLASSIFICACOES_ORDEM` já codifica em ``app/(app)/inicio/page.tsx`:15`. Os 5 títulos exigidos
   pelo pedido (`Cursos Regulares`, `Cursos Especiais`, `Cursos Expeditos`, `Cursos de
   Aperfeiçoamento Avançado`, `Estágios de Qualificação`) mapeiam 1:1 para esse domínio fechado —
   não há um sexto valor possível de `Classificacao` a tratar.
6. **A rolagem horizontal com scroll-snap já existe como componente reutilizável.**
   `.carrossel-scroll-snap` (`app/globals.css`:140-144`) já implementa `overflow-x: auto`
   + `scroll-snap-type: x proximity` nativo (sem biblioteca de carrossel, constitution Princípio
   III) e já é usado pelo próprio `app/(app)/inicio/page.tsx`. Nenhum CSS novo é necessário para a rolagem em
   si — só a estrutura de 5 seções fixas ao redor dela.

Este hotfix corrige cirurgicamente o filtro da linha 29 de `app/(app)/inicio/page.tsx` e reestrutura a
montagem das seções ao redor de uma lista fixa de 5 classificações (em vez da lista dinâmica atual,
que só mostra classificações com pelo menos um curso com destaque). **Fora de escopo**: qualquer
mudança em `getContextoInicial`/`resolverTurmaEmDestaque_` em si (já expõem o dado correto, ver
achado 1), em `app/(app)/cursos/[curso]/page.tsx` (já resolvido no Hotfix 010), no Design System (cores `--cor-*`,
fonte Rawline) ou no destino de navegação do clique no cartão (`aoClicarCardInicio`, mantém curso
selecionado e leva à Página do Curso).

## Clarifications

### Session 2026-08-16

- Q: Dentro de cada um dos 5 carrosséis, cursos com turma em destaque resolvida devem aparecer antes
  dos cursos sem turma em destaque, ou a ordem deve ser a ordem natural do banco, misturando os
  dois grupos? → A: cursos com turma em destaque primeiro; dentro de cada subgrupo (com/sem
  destaque), ordem natural do banco — mesmo padrão já adotado por `agruparCursosParaPagina_`
  (`app/(app)/cursos/[curso]/page.tsx`, Hotfix 010), para manter as duas telas de carrossel consistentes entre si.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o catálogo completo de cursos na Página Inicial (Priority: P1)

Um usuário autenticado abre a Página Inicial e precisa ver **todos** os cursos cadastrados no
sistema, agrupados por classificação — incluindo cursos cuja turma está Planejada, Inativa,
Cancelada ou Concluída, e cursos sem nenhuma turma com Status=Ativa cursando hoje. Hoje, qualquer
curso sem uma turma em destaque resolvida (Ativa e dentro da janela de datas) simplesmente
desaparece da tela, sem nenhuma indicação de que existe.

**Why this priority**: Esconder parte do catálogo é uma perda de informação real (o usuário não
consegue nem saber que o curso existe a partir da Página Inicial) — é o problema central que motiva
este hotfix, decorrente de uma mudança de regra de negócio já decidida.

**Independent Test**: Abrir a Página Inicial com a banco de produção (que tem cursos com turmas em
diferentes status, incluindo cursos sem nenhuma turma Ativa hoje) e confirmar que todo `ID_Curso`
de `cursos` aparece em algum dos 5 carrosséis.

**Acceptance Scenarios**:

1. **Given** um curso cuja única turma tem Status=Cancelada, **When** o usuário abre a Página
   Inicial, **Then** esse curso aparece no carrossel da sua classificação.
2. **Given** um curso sem nenhuma turma cadastrada, **When** o usuário abre a Página Inicial,
   **Then** esse curso aparece no carrossel da sua classificação.
3. **Given** um curso com uma turma Status=Ativa cursando hoje, **When** o usuário abre a Página
   Inicial, **Then** esse curso continua aparecendo, com as mesmas informações de turma em destaque
   que já exibia antes deste hotfix (nome da turma, status, progresso).
4. **Given** dois cursos da mesma classificação, um com turma em destaque e outro sem, **When** o
   carrossel dessa classificação é exibido, **Then** o curso com turma em destaque aparece primeiro
   (Clarifications 2026-08-16, FR-008).

---

### User Story 2 - Estrutura fixa de 5 carrosséis, sempre visível (Priority: P1)

A Página Inicial deve sempre exibir exatamente 5 seções de carrossel, uma por classificação de
curso, nesta ordem e com estes títulos exatos: "Cursos Regulares", "Cursos Especiais", "Cursos
Expeditos", "Cursos de Aperfeiçoamento Avançado", "Estágios de Qualificação" — independentemente de
quantos cursos existem em cada categoria no momento. Hoje a lista de seções é dinâmica: uma
classificação sem nenhum curso com turma em destaque simplesmente não gera seção nenhuma.

**Why this priority**: Sem uma estrutura fixa, o usuário não tem como distinguir "esta categoria
não tem cursos cadastrados" de "esta categoria não existe" — a mesma ambiguidade que motivou a
User Story 1, agora no nível de seção em vez de cartão.

**Independent Test**: Abrir a Página Inicial e contar as seções renderizadas — devem ser exatamente
5, com os 5 títulos exigidos, nesta ordem, em qualquer estado da base de dados.

**Acceptance Scenarios**:

1. **Given** a Página Inicial carregada com qualquer conteúdo de `cursos`, **When** a tela
   renderiza, **Then** exatamente 5 seções aparecem, com os títulos "Cursos Regulares", "Cursos
   Especiais", "Cursos Expeditos", "Cursos de Aperfeiçoamento Avançado" e "Estágios de
   Qualificação", nesta ordem.

---

### User Story 3 - Mensagem clara quando uma categoria não tem cursos (Priority: P2)

Quando uma das 5 categorias não tem nenhum curso cadastrado no momento, o carrossel correspondente
não deve ficar quebrado ou vazio sem explicação — deve exibir o título da categoria normalmente e,
no lugar dos cartões, uma mensagem em texto claro: "Nenhum curso cadastrado nesta modalidade".

**Why this priority**: É a consequência direta de tornar as 5 seções fixas (User Story 2) — sem
essa mensagem, uma categoria vazia apareceria como uma faixa em branco, o que parece um defeito
visual em vez de um estado de dados válido. P2 porque o sistema já funciona corretamente sem isso
(a seção aparece, só sem indicação do motivo de estar vazia) até esta melhoria ser aplicada.

**Independent Test**: Com uma categoria conhecida sem cursos cadastrados (ou temporariamente
filtrando os dados de teste para simular isso), abrir a Página Inicial e confirmar que a seção
aparece com o título e a mensagem de vazio, sem quebrar o layout das demais seções.

**Acceptance Scenarios**:

1. **Given** uma classificação de curso sem nenhum curso cadastrado em `cursos`, **When** a
   Página Inicial renderiza, **Then** a seção dessa classificação exibe seu título e a mensagem
   "Nenhum curso cadastrado nesta modalidade", sem cartões e sem espaço em branco quebrado.

---

### Edge Cases

- Curso com `Classificacao` vazia ou com um valor fora do domínio fechado de 5 categorias (dado
  malformado): não pertence a nenhum dos 5 carrosséis fixos definidos por este hotfix — nenhuma 6ª
  seção "(sem classificação)" é criada (a exigência de FR-003 é "exatamente 5", nesta ordem e com
  estes títulos). **Correção pós-`/speckit-analyze` (achado F1)**: diferente do que uma versão
  anterior deste documento afirmava, isso NÃO é equivalente ao comportamento atual de
  `app/(app)/inicio/page.tsx` — hoje (`const chave = c.classificacao || '(sem classificação)'`) um curso assim
  ainda ganha uma seção própria ad-hoc. Este hotfix aceita conscientemente essa regressão pontual
  para um dado hoje inexistente na base, porque o domínio de `Classificacao` está fechado em 5
  valores conhecidos (achado 5 acima, glossário do projeto) e nenhum dado real observado até agora
  usa outro valor — decisão registrada aqui em vez de deixada implícita.
- Curso sem nenhuma turma em destaque resolvida (sem turma Ativa cursando hoje): o cartão continua
  aparecendo na categoria certa, mas sem o badge de status/barra de progresso de turma — mesmo
  padrão de cartão "sem destaque" já usado por `app/(app)/cursos/[curso]/page.tsx` (achado 4).
- Todas as 5 categorias sem nenhum curso (base de dados vazia/recém-provisionada): as 5 seções
  aparecem todas com a mensagem de vazio — nunca uma tela em branco sem nenhuma seção.
- Uma categoria com um único curso: o carrossel de rolagem horizontal ainda renderiza corretamente
  (sem esticar para 100% da largura de forma estranha) — mesmo comportamento já validado em
  `.carrossel-scroll-snap` (achado 6 / Hotfix 010).
- Nenhum curso da categoria tem turma em destaque (ex.: início de um novo ano letivo, nenhuma turma
  Ativa cursando hoje): o carrossel continua mostrando todos os cursos da categoria, só que sem
  nenhum "primeiro" com destaque — ordem cai para a ordem natural do banco (Clarifications
  2026-08-16, FR-008).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A Página Inicial DEVE exibir todo curso presente em `cursos` dentro do escopo de
  acesso do usuário autenticado, independentemente do `Status` de qualquer turma vinculada a ele
  (Ativa, Planejada, Inativa, Cancelada ou Concluída) e independentemente de o curso ter ou não uma
  turma em destaque resolvida para hoje.
- **FR-002**: O backend (`getContextoInicial`, `app/layout.tsx` + `lib/supabase/server.ts``) DEVE continuar expondo
  100% dos cursos do escopo do usuário em `cursos`, sem nenhum filtro por status de turma — este
  hotfix garante e testa explicitamente essa propriedade, já verdadeira hoje (achado 1), para que
  regressões futuras sejam pegas.
- **FR-003**: A Página Inicial DEVE renderizar exatamente 5 seções de carrossel, sempre, na ordem e
  com os títulos exatos: "Cursos Regulares", "Cursos Especiais", "Cursos Expeditos", "Cursos de
  Aperfeiçoamento Avançado", "Estágios de Qualificação" — mapeando 1:1 para os valores de
  `Classificacao` `Regular`, `Especial`, `Expedito`, `Aperfeiçoamento Avançado`, `Estágio de
  Qualificação`, respectivamente.
- **FR-004**: Cada uma das 5 seções DEVE renderizar mesmo quando não há nenhum curso daquela
  classificação — nesse caso, exibindo o título da seção e a mensagem "Nenhum curso cadastrado
  nesta modalidade" no lugar dos cartões, sem quebrar o layout das demais seções.
- **FR-005**: Cada seção DEVE exibir seus cursos dentro de um container de rolagem horizontal com
  scroll snapping (reaproveitando o componente `.carrossel-scroll-snap` já existente), consistente
  com o padrão visual já usado nesta e em outras telas do sistema.
- **FR-006**: Um cartão de curso sem turma em destaque resolvida DEVE continuar sendo clicável e
  navegar para a Página do Curso com esse curso selecionado (`aoClicarCardInicio`/
  `AppState.setCurso`), mesmo sem exibir badge de status ou barra de progresso de turma.
- **FR-007**: Este hotfix NÃO DEVE alterar nenhum token do Design System (`--cor-*`,
  `--fonte-principal`/Rawline, `data-bs-theme`), nem o destino ou o mecanismo do clique em um
  cartão de curso já existente antes deste hotfix.
- **FR-008**: Dentro de cada um dos 5 carrosséis, os cursos com turma em destaque resolvida DEVEM
  aparecer antes dos cursos sem turma em destaque; dentro de cada um desses dois subgrupos, os
  cursos mantêm a ordem natural em que aparecem em `cursos` — nenhum critério de ordenação
  adicional (ex.: alfabético) é introduzido (Clarifications 2026-08-16), mesmo padrão já usado por
  `agruparCursosParaPagina_` (`app/(app)/cursos/[curso]/page.tsx`, Hotfix 010).

### Key Entities

- **Curso** (`cursos`): já existente, nenhum campo novo. Este hotfix só muda quais cursos a
  Página Inicial exibe e como agrupa/renderiza a exibição — nenhuma mudança na estrutura da aba.
- **Turma em destaque** (`turmasEmDestaque`, resolvida por `resolverTurmaEmDestaque_`): já
  existente, nenhuma mudança na lógica de resolução — passa a ser tratada como informação
  opcional/complementar do cartão de curso, nunca mais como pré-condição para o curso aparecer.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A Página Inicial exibe 100% dos cursos cadastrados em `cursos` dentro do escopo
  do usuário, verificável comparando a contagem total de cursos renderizados nos 5 carrosséis com a
  contagem de `ID_Curso` distintos acessíveis àquele usuário.
- **SC-002**: A Página Inicial sempre renderiza exatamente 5 seções de carrossel, com os 5 títulos
  exigidos, em qualquer estado de dados (incluindo base vazia).
- **SC-003**: Nenhuma categoria sem cursos cadastrados produz layout quebrado ou seção ausente —
  100% das categorias vazias exibem a mensagem padrão definida.
- **SC-004**: Nenhuma alteração visual de cor/fonte ou de destino de navegação do clique no cartão é
  observável entre antes e depois deste hotfix, para os cursos que já apareciam na Página Inicial
  antes dele.
- **SC-005**: Dentro de cada um dos 5 carrosséis, todo curso com turma em destaque resolvida aparece
  antes de todo curso sem turma em destaque (Clarifications 2026-08-16).

## Assumptions

- "Reestruturação dos Carrosséis" reabre deliberadamente uma decisão registrada no Hotfix 010
  (manter o filtro por turma em destaque como comportamento intencional da Página Inicial) — este
  hotfix documenta essa reversão explicitamente (achado 3) em vez de tratá-la como um bug não visto
  antes.
- O cartão de curso sem turma em destaque resolvida reaproveita o mesmo padrão visual já usado por
  `app/(app)/cursos/[curso]/page.tsx` (nome, classificação, duração — sem badge/progresso de turma), em vez de inventar
  um terceiro layout de cartão só para a Página Inicial. Mantém consistência entre as duas telas que
  hoje já compartilham o mesmo componente `.carrossel-scroll-snap`.
- O mapeamento entre os 5 títulos exigidos pelo pedido e os 5 valores de `Classificacao` já
  existentes na base (`Regular`, `Especial`, `Expedito`, `Aperfeiçoamento Avançado`, `Estágio de
  Qualificação`) é 1:1 e fechado — não há necessidade de cadastro/configuração administrável nova,
  já que o domínio de classificação de curso é definido no glossário do projeto (achado 5), não em
  configuração de execução.
- Nenhum teste automatizado de DOM/renderização é adicionado (mesma limitação já registrada em
  todos os hotfixes anteriores — a suíte do projeto roda em `pnpm vitest run`, sem navegador); a
  verificação de FR-001/FR-002 (backend expõe 100% dos cursos sem filtro de status de turma) é
  testável por `pnpm vitest run` isolando `getContextoInicial`/a lógica de agrupamento por
  classificação; FR-003/FR-004/FR-005 (estrutura fixa de 5 seções, empty state, scroll snap) exigem
  verificação visual manual contra a banco de produção, roteiro em `quickstart.md`.
