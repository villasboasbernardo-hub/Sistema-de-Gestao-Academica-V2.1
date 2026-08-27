# Feature Specification: Hotfix — Sidebar, Ordenação de Cursos, Carrossel e Contagem de Estatísticas

**Feature Branch**: `010-hotfix-sidebar-carrossel-estatisticas`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "HOTFIX: Correção Crítica de UI/UX e Lógica de Agrupamento. A
implementação do Épico 009 (Refatoração UI/UX) apresentou 4 falhas críticas: (1) sidebar não abre
ao clicar no hambúrguer; (2) tela de cursos só exibe cursos ativos, deveria exibir todos com os
ativos primeiro; (3) listagem de cursos precisa de carrossel de rolagem horizontal, não grade
vertical; (4) card de estatísticas conta cursos de forma multiplicada/incorreta (relatou '41 cursos
regulares'), precisa contar valores únicos por curso."

## Contexto e achados confirmados no código antes desta spec

Verificação direta do código entregue pelo Épico 009 (`specs/009-refatoracao-ui-ux/`), antes de
escrever qualquer requisito, confirmou 3 dos 4 relatos como bugs reais e localizou precisamente onde
cada um vive:

1. **Sidebar não abre**: `app/globals.css` carrega `app/globals.css` mas **nunca**
   o pacote `tailwindcss` + `shadcn/ui` — nenhum arquivo do projeto inclui o JS do Tailwind CSS. O botão hambúrguer
   em `app/layout.tsx` usa `data-bs-toggle="offcanvas"`/`data-bs-target="#sidebarPrincipal"` corretamente
   (o HTML está certo), mas sem o JS do Tailwind CSS carregado esses atributos não têm efeito nenhum —
   confirma o relato 1 como uma omissão real do Épico 009, não um erro de configuração do usuário.
2. **Carrossel ausente na Página do Curso**: existem HOJE **duas telas diferentes** que listam
   cursos. `app/(app)/inicio/page.tsx` (Painel Início, rota padrão `tabInicio`) já usa `.carrossel-scroll-snap`
   corretamente (rolagem horizontal, UI-05) — mas só lista cursos que têm uma turma "em destaque"
   resolvida (Status=`Ativa` com a data de hoje dentro da janela `Data_Inicio`–`Data_Termino`).
   `app/(app)/cursos/[curso]/page.tsx` (Página do Curso, `tabCurso`) lista **todos** os cursos agrupados por
   classificação, mas dentro de `<div class="row g-3">` — uma grade Tailwind CSS que empilha
   verticalmente, não uma rolagem horizontal. O relato do usuário ("grade vertical infinita") bate
   exatamente com este segundo container.
3. **Cursos sem turma em destaque ficam invisíveis**: em `app/(app)/inicio/page.tsx`,
   `renderizarPainelInicio()` pula qualquer curso cujo `AppState.ctx.turmasEmDestaque[idCurso]` seja
   `undefined` (`if (!destaque) return;`) — ou seja, um curso sem nenhuma turma `Ativa` cursando hoje
   simplesmente não aparece no Painel Início, sem nenhuma indicação de que existe. Isso bate com o
   relato "só exibe cursos ativos".
4. **Contagem de estatísticas**: `getEstatisticasCursos()` (`lib/acoes/estatisticas.ts`) lê
   `cursos` inteira e conta `cursos.length`/agrupamento por `Classificacao` **sem nenhuma
   deduplicação por `ID_Curso`**. A auditoria de schema de 2026-08-14
   (`docs/arquitetura/01-schema.md` §1.2) registrou `cursos` com 24 linhas no total — um valor
   como "41 cursos regulares" só é possível se a aba viva hoje tiver mais de uma linha para o mesmo
   `ID_Curso` (o schema não proíbe fisicamente isso) ou outra fonte de duplicação de linha. Não é
   possível confirmar a partir do repositório se a causa exata é dado duplicado na banco de produção ou
   outra coisa — mas a correção pedida pelo usuário (contar `ID_Curso` único, nunca linha bruta) é
   correta e necessária de qualquer forma: nenhuma contagem de curso deste sistema deve depender da
   cardinalidade real de linhas da aba.

## Clarifications

### Session 2026-08-16

- Q: Quando o mesmo `ID_Curso` aparece em mais de uma linha de `cursos` com valores divergentes, qual linha vence na deduplicação? → A: primeira linha encontrada na ordem de leitura do banco, sem lógica nova de desempate.
- Q: Dentro de cada um dos dois grupos (com turma em destaque / sem turma em destaque) na Página do Curso, em que ordem os cursos aparecem entre si? → A: ordem natural do banco (sem critério de ordenação novo, ex.: alfabético).

Este hotfix corrige exatamente esses 4 pontos, cirurgicamente, dentro dos arquivos já identificados
acima. **Fora de escopo**: qualquer outra lógica de cálculo (RN-DEG-01, motor preditivo, DSA,
avaliações), qualquer aba além de `cursos`/`turmas`, e qualquer novo componente/dependência
JS (nenhuma biblioteca de carrossel — mantém o CSS scroll-snap nativo já em uso, constitution
Princípio III).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir e fechar o menu lateral (Priority: P1)

Qualquer usuário autenticado clica no ícone de hambúrguer no canto superior esquerdo e precisa que o
menu lateral (sidebar) deslize para dentro da tela, mostrando os itens de navegação; clicar de novo
(ou no X) precisa fechá-lo. Hoje isso não acontece — o clique não tem nenhum efeito visível.

**Why this priority**: Sem o menu lateral funcionando, a navegação para qualquer tela além da rota
inicial fica bloqueada em telas onde a sidebar é o único ponto de navegação — é um bloqueio total de
uso, não um defeito cosmético.

**Independent Test**: Abrir o sistema, clicar no hambúrguer — o menu desliza visível; clicar em
"Fechar" ou fora do menu — ele fecha. Testável isoladamente, sem depender de nenhum dado do banco.

**Acceptance Scenarios**:

1. **Given** o sistema carregado em qualquer tela, **When** o usuário clica no botão de hambúrguer,
   **Then** o menu lateral abre e exibe todos os itens de navegação permitidos ao perfil do usuário.
2. **Given** o menu lateral aberto, **When** o usuário clica no botão de fechar (X) ou em qualquer
   item do menu, **Then** o menu lateral fecha.

---

### User Story 2 - Ver todos os cursos, ativos primeiro (Priority: P1)

Um usuário navegando pela Página do Curso precisa ver **todos** os cursos cadastrados no sistema —
não só os que têm uma turma cursando hoje — para poder consultar informações de cursos passados ou
futuros. Cursos com atividade em andamento (turma em destaque ativa) devem aparecer antes dos demais,
para que o caso de uso mais comum (acompanhar o que está rodando agora) continue rápido.

**Why this priority**: Esconder cursos sem turma ativa hoje impede consultar o histórico ou o
planejamento de qualquer curso fora de uma janela de execução — perda de informação real, não só
estética.

**Independent Test**: Abrir a Página do Curso com a banco de produção (que tem cursos com e sem turma
ativa hoje) e confirmar que todos aparecem, com os que têm turma em destaque no topo de cada grupo de
classificação.

**Acceptance Scenarios**:

1. **Given** um curso sem nenhuma turma com Status=Ativa cursando hoje, **When** o usuário abre a
   Página do Curso, **Then** esse curso aparece na lista (dentro do seu grupo de classificação), só
   que depois dos cursos que têm turma em destaque.
2. **Given** dois cursos da mesma classificação, um com turma em destaque e outro sem, **When** a
   lista é exibida, **Then** o curso com turma em destaque aparece primeiro.

---

### User Story 3 - Rolagem horizontal na listagem de cursos (Priority: P2)

Dentro de cada grupo de classificação na Página do Curso, os cartões de curso devem ficar em uma
faixa de rolagem horizontal (mesmo padrão visual já usado no Painel Início), em vez de uma grade que
cresce verticalmente sem limite conforme mais cursos são cadastrados.

**Why this priority**: Sem isso, uma classificação com muitos cursos (ex.: "Regular") empurra o resto
da tela para baixo indefinidamente, tornando a navegação por rolagem vertical cada vez pior conforme
o cadastro cresce — mas o sistema continua utilizável enquanto isso não é corrigido (P2, não bloqueia
o uso como P1).

**Independent Test**: Abrir a Página do Curso com uma classificação que tenha vários cursos
cadastrados e confirmar que os cartões ficam lado a lado com rolagem horizontal (mouse/touch), sem
quebrar linha.

**Acceptance Scenarios**:

1. **Given** uma classificação de curso com mais cursos do que cabem na largura da tela, **When** o
   usuário rola horizontalmente dentro da faixa daquela classificação, **Then** os cartões adicionais
   ficam visíveis sem que a página cresça verticalmente por causa deles.

---

### User Story 4 - Contagem de cursos por classificação sem duplicidade (Priority: P1)

O painel de estatísticas de Cursos, ao contar quantos cursos existem por classificação, precisa
contar cada curso (`ID_Curso`) uma única vez — nunca uma linha do banco mais de uma vez para o
mesmo curso.

**Why this priority**: Um número de contagem errado é ativamente enganoso — pior do que não mostrar
nenhum número —, e é o achado mais crítico apontado pelo usuário.

**Independent Test**: Comparar a contagem exibida no card "Total de cursos"/gráfico por classificação
com a contagem manual de `ID_Curso` únicos na tabela `cursos`.

**Acceptance Scenarios**:

1. **Given** a tabela `cursos` (mesmo que tenha, por qualquer motivo, mais de uma linha para o mesmo
   `ID_Curso`), **When** o painel de estatísticas de Cursos é carregado, **Then** cada curso é contado
   exatamente uma vez, tanto no KPI "Total de cursos" quanto no gráfico por classificação e no cálculo
   de duração média por classificação.

---

### Edge Cases

- Curso com `ID_Curso` vazio/nulo no banco: nunca deve ser agrupado junto com outro curso de
  `ID_Curso` igualmente vazio como se fossem o mesmo curso — cada linha sem `ID_Curso` continua sendo
  contada individualmente (não há chave de deduplicação válida).
- Classificação com um único curso: a faixa de rolagem horizontal ainda deve renderizar
  corretamente (sem esticar para ocupar 100% da largura de forma estranha) — mesmo comportamento já
  validado em `app/(app)/inicio/page.tsx`.
- Nenhum curso tem turma em destaque (ex.: início de um novo ano letivo): a lista da Página do Curso
  continua mostrando todos os cursos, só que sem nenhum "primeiro" com destaque — ordem cai para a
  ordem natural do banco dentro de cada classificação.
- Sidebar: clicar no hambúrguer duas vezes em sequência rápida não deve deixar o menu em estado
  inconsistente (parcialmente aberto) — comportamento nativo do `.offcanvas` do Tailwind CSS, não requer
  tratamento customizado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE carregar o JavaScript do Tailwind CSS + shadcn/ui (o pacote `tailwindcss` + `shadcn/ui`, mesma
  origem CDN já usada para o CSS do Tailwind CSS) em toda página, para que os componentes interativos
  nativos do Tailwind CSS (offcanvas, dropdown, etc.) funcionem.
- **FR-002**: O sistema DEVE permitir abrir e fechar o menu lateral (sidebar) clicando no botão de
  hambúrguer e no botão de fechar, usando exclusivamente o mecanismo nativo `.offcanvas` do Tailwind CSS
  já presente no HTML (nenhum JavaScript customizado de abrir/fechar).
- **FR-003**: A Página do Curso DEVE listar todos os cursos cadastrados, independentemente de terem
  ou não uma turma em destaque resolvida para hoje.
- **FR-004**: Dentro de cada grupo de classificação da Página do Curso, os cursos com turma em
  destaque resolvida DEVEM aparecer antes dos cursos sem turma em destaque; dentro de cada um desses
  dois subgrupos, os cursos mantêm a ordem natural em que aparecem na tabela `cursos` — nenhum
  critério de ordenação adicional (ex.: alfabético) é introduzido (Clarifications 2026-08-16).
- **FR-005**: A listagem de cursos por classificação na Página do Curso DEVE ser exibida em um
  container de rolagem horizontal (mesmo componente visual `.carrossel-scroll-snap` já usado no
  Painel Início), substituindo a grade vertical atual.
- **FR-006**: `getEstatisticasCursos()` DEVE agrupar as linhas de `cursos` por `ID_Curso` antes
  de calcular o KPI "Total de cursos", a contagem por classificação e a duração média por
  classificação — cada `ID_Curso` distinto contribui exatamente uma vez para cada um desses três
  cálculos, mesmo que existam múltiplas linhas para o mesmo `ID_Curso` na aba. Quando linhas
  duplicadas do mesmo `ID_Curso` divergem em algum campo (`Classificacao`, `Duracao_Semanas`), os
  valores da **primeira linha encontrada na ordem de leitura do banco** são os usados — sem
  nenhuma lógica adicional de desempate (Clarifications 2026-08-16).
- **FR-007**: O Painel Início (`app/(app)/inicio/page.tsx`) NÃO é alterado por este hotfix — continua exibindo
  só cursos com turma em destaque resolvida, comportamento intencional e já validado no Épico 009
  (FR-004 daquela spec); a mudança de "mostrar todos, ativos primeiro" (FR-003/FR-004 acima) se aplica
  apenas à Página do Curso.

### Key Entities

- **Curso** (`cursos`): já existente, nenhum campo novo. Este hotfix só muda como a lista de
  cursos é filtrada/ordenada/exibida/contada no front-end e no painel de estatísticas — nenhuma
  mudança na estrutura da aba.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário consegue abrir e fechar o menu lateral em qualquer tela do sistema, em 100%
  das tentativas, sem recarregar a página.
- **SC-002**: A Página do Curso exibe 100% dos cursos cadastrados no banco, independentemente de
  status ou turma em destaque.
- **SC-003**: Dentro de cada classificação, todo curso com turma em destaque aparece antes de todo
  curso sem turma em destaque.
- **SC-004**: A listagem de cursos por classificação na Página do Curso rola horizontalmente e não
  aumenta a altura vertical da página conforme mais cursos são adicionados a uma classificação.
- **SC-005**: O número de "Total de cursos" e a soma dos valores do gráfico por classificação no
  painel de estatísticas de Cursos batem exatamente com a contagem de `ID_Curso` distintos na aba
  `cursos`.

## Assumptions

- A causa raiz exata da contagem "41 cursos regulares" (dado duplicado na banco de produção vs. outra
  origem) não é verificável a partir do repositório local — a correção adotada (deduplicar por
  `ID_Curso`) é a solução correta independentemente da causa raiz, e será testada com um caso de
  teste que injeta linhas duplicadas propositalmente.
- "Ativos primeiro" (relato do usuário) é interpretado como "cursos com turma em destaque resolvida
  primeiro" — a mesma noção de "curso ativo agora" já usada por `resolverTurmaEmDestaque_`/
  `turmasEmDestaque` do Épico 009 (FR-004 daquela spec), não uma leitura do campo `cursos.Status`
  (que já existe mas não é hoje o critério de nenhuma tela). Reaproveita um conceito já existente em
  vez de introduzir um segundo critério de "ativo".
- O Painel Início (`app/(app)/inicio/page.tsx`) fica fora do escopo deste hotfix — o pedido do usuário ("tela
  inicial só exibe cursos ativos") corresponde, na prática do código, ao comportamento da Página do
  Curso (`app/(app)/cursos/[curso]/page.tsx`), que é a tela que lista todos os cursos agrupados por classificação; o
  Painel Início já tem carrossel e seu filtro por turma em destaque é comportamento intencional e
  específico daquela tela (mostrar só o que está em andamento agora), não um bug.
- Nenhum novo teste automatizado de UI/DOM é adicionado (a suíte do projeto não cobre DOM/interação
  de navegador, mesma limitação já registrada em todos os épicos anteriores) — FR-006 (deduplicação
  no backend) é a única peça desta spec testável por `pnpm vitest run`.
