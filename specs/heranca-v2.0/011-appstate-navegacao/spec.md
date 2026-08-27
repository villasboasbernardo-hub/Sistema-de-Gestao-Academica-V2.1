# Feature Specification: Arquitetura de Navegação com Estado Centralizado (AppState)

**Feature Branch**: `011-appstate-navegacao`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "Épico D do documento 06 — Arquitetura de Navegação com Estado
Centralizado."

## Contexto e achados confirmados no código antes desta spec

Como em todo épico desta sessão, o código atual foi lido antes de escrever qualquer requisito —
neste caso com um documento de decisão pré-existente adicional, `docs/arquitetura/04-appstate.md`
(2026-08-11), que já projetou o `AppState`/`Router` completos por escrito, citando explicitamente
RF-NAV-01..03 (`docs/fase-1/02-Requisitos-Funcionais.md`) como origem. Esta spec **não desenha do
zero** — fecha uma lacuna já identificada por escrito entre o que `04-appstate.md` projetou e o que
os Épicos E/B/A/009 (que tocaram `components/ciaara/` incrementalmente, cada um pegando só o que a própria
feature precisava) efetivamente construíram:

1. **`AppState` existe, mas é "mínimo" por decisão explícita registrada no próprio código**
   (`components/ciaara/`, comentário de topo do arquivo): tem `ctx`/`cursoSelecionado`/
   `turmaSelecionada`/`filtros` e os setters correspondentes — mas **não tem** `cache`,
   `invalidar()` nem `onChange()`, os três membros que `04-appstate.md` descreve como a peça central
   do "único ponto de verdade" (RF-NAV-01).
2. **A ausência de cache centralizado já reproduziu, de forma pequena, exatamente o problema que
   `04-appstate.md` cita como motivação** (`INICIO_STATE.dash`/`CRONOS_STATE.dados`/`DIAG.dados` da
   V1.0, cada um zerado manualmente e sem padrão comum): hoje existem 3 flags booleanas
   independentes e desconectadas entre si — `estatisticasCursoCarregadas` (`app/(app)/cursos/[curso]/page.tsx`),
   `estatisticasDisciplinasCarregadas` (`app/(app)/disciplinas/page.tsx`),
   `estatisticasInstrutoresCarregadas` (`app/(app)/instrutores/page.tsx`) — cada uma controlando se o painel
   de estatísticas daquela tela já foi buscado do backend. Nenhuma delas é invalidada quando um dado
   que afeta a estatística muda (ex.: cadastrar um curso novo não invalida
   `estatisticasCursoCarregadas`) — o painel mostra dado desatualizado até a página inteira ser
   recarregada. É a mesma classe de bug que motivou o `AppState.cache`/`invalidar()` no design
   original.
3. **O roteador (`registrarRota`/`ROTAS[hash]`) declarado em `components/ciaara/` nunca é chamado por
   nenhuma view** (`grep -rn "registrarRota\|ROTAS\[" app/*.html` só encontra a própria
   declaração) — código morto. Toda view hoje se inicializa via
   `document.addEventListener('contexto-pronto', <funcaoDeRender>)`, que dispara **uma única vez**,
   no boot da aplicação — não a cada navegação de volta àquela tela. `irPara(hash)` (o roteador que
   de fato está em uso) já cumpre RF-NAV-02 corretamente (mesmos pontos de entrada, mesmo
   comportamento) só trocando qual `<div data-view>` fica visível — não chama nenhum callback de
   re-render por trás.
4. **History API / navegação por link direto (voltar/avançar do navegador, compartilhar link para
   uma tela específica) está explicitamente marcada como "avaliação, não compromisso" em
   `04-appstate.md`**, condicionada a "não colocar em risco RF-NAV-03". O próprio `components/ciaara/` já
   documenta por que isso é arriscado neste projeto especificamente: mudar `window.location.hash`
   dentro do página isolado que o Next.js usa para servir o aplicação Next.js quebra a comunicação
   `postMessage` com a página externa e faz o conteúdo "sumir" ~1s depois de carregar — bug real já
   observado e corrigido no Épico E (`ver `implantacao/historico/2026-08-14-epico-e.md`).

## Clarifications

### Session 2026-08-16

- Q: O roteador `registrarRota`/`ROTAS[hash]` (declarado em `components/ciaara/`, hoje código morto — nenhuma view o chama) deve ser removido, ou passa a ser usado de verdade nesta spec? → A: removido (dead code) — `irPara` sozinho já cumpre RF-NAV-02; nenhuma tela hoje precisa re-renderizar a cada navegação de volta.
- Q: As 3 flags `*Carregada` existentes (`app/(app)/cursos/[curso]/page.tsx`/`app/(app)/disciplinas/page.tsx`/`app/(app)/instrutores/page.tsx`) devem ser migradas para `AppState.cache`/`invalidar()` nesta spec, ou fica só a infraestrutura nova? → A: migrar as 3 — `AppState.cache`/`invalidar()` nasce com prova real de uso, resolvendo o bug real de dado desatualizado no painel.
- Q: FR-004 (invalidação de cache) deve cobrir só as 3 escritas citadas literalmente (Curso/Disciplina/Instrutor), ou o conjunto completo de escritas que realmente afetam cada painel — incluindo Turma (mesma chave de cache do painel de Cursos) e lançamento de Aula via DSA (afeta "concluída"/"atrasada" do painel de Disciplinas)? → A: conjunto completo — evita reintroduzir a mesma classe de bug que esta spec existe para corrigir.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Estado de seleção nunca se perde ao navegar (Priority: P1)

Um usuário seleciona um curso e uma turma numa tela, navega para outra tela pelo menu lateral, e
espera que a turma/curso selecionados continuem sendo os mesmos ao voltar — sem ter que escolher de
novo. Esse comportamento já existe hoje (via `AppState.cursoSelecionado`/`turmaSelecionada`); esta
User Story garante que ele **continua** existindo depois da mudança desta spec (RF-NAV-03) — é uma
proteção de não regressão, não uma funcionalidade nova.

**Why this priority**: É o requisito mais restritivo do próprio documento de origem (RF-NAV-03:
"nenhuma tela pode perder... dado de contexto") — qualquer regressão aqui derruba a razão de ser do
`AppState`.

**Independent Test**: Selecionar curso/turma na Página do Curso, navegar para Avaliações, DSA,
Cronograma e voltar para a Página do Curso — a mesma turma/curso continuam selecionados em cada
tela que os usa.

**Acceptance Scenarios**:

1. **Given** um curso e uma turma selecionados na Página do Curso, **When** o usuário navega para
   outra tela pelo menu lateral e depois volta, **Then** o mesmo curso/turma continuam selecionados.
2. **Given** um filtro ativo numa tela (ex.: filtro de status de turma), **When** o usuário navega
   para outra tela e volta, **Then** o filtro permanece como estava.

---

### User Story 2 - Painel de estatísticas nunca mostra dado desatualizado depois de uma escrita (Priority: P1)

Um usuário edita uma disciplina (ou cadastra/edita um instrutor, ou lança uma aula pelo DSA) e, ao
abrir o painel de estatísticas correspondente, espera ver o dado novo refletido — sem precisar
recarregar a página inteira. Hoje isso não acontece: a flag `estatisticasDisciplinasCarregadas`/
`estatisticasInstrutoresCarregadas` (e a equivalente de Cursos) não é invalidada por nenhuma escrita,
então o painel, uma vez aberto, mostra o mesmo dado até a página ser recarregada manualmente.

**Why this priority**: É um bug de dado desatualizado silencioso — o usuário não tem nenhum sinal de
que está vendo um número velho, o mesmo tipo de risco que motivou o hotfix anterior desta sessão
("41 cursos regulares"), só que aqui a causa é cache nunca invalidado em vez de contagem errada.

**Independent Test**: Abrir o painel de estatísticas de Instrutores, cadastrar um instrutor novo,
reabrir (ou manter aberto) o mesmo painel sem recarregar a página — o novo instrutor já aparece na
contagem. Mesma mecânica testável para Disciplinas (editar uma disciplina) e para o efeito indireto
de lançar uma aula pelo DSA sobre o painel de Disciplinas. O painel de Cursos usa o mesmo mecanismo,
mas hoje não tem nenhuma escrita em app para exercitá-lo (FR-004) — validado só pela ausência de
erro ao ler o cache vazio, não por um cenário de "escrita → atualização".

**Acceptance Scenarios**:

1. **Given** o painel de estatísticas de Disciplinas ou de Instrutores já foi aberto uma vez,
   **When** um cadastro relevante àquele painel é criado/editado/removido na mesma sessão (incluindo
   lançar uma aula pelo DSA, no caso do painel de Disciplinas), **Then** a próxima vez que o painel é
   aberto ele busca dado novo do backend, não o cache antigo.
2. **Given** nenhuma escrita relevante ocorreu desde a última vez que um painel de estatísticas foi
   aberto, **When** o usuário reabre o mesmo painel, **Then** o sistema reaproveita o dado já
   buscado, sem uma nova chamada ao backend (preserva o comportamento de performance atual — não é
   "sempre buscar de novo", é "buscar de novo só quando algo relevante mudou").

---

### Edge Cases

- Duas telas compartilham o mesmo dado de origem (ex.: um curso aparece tanto no painel de
  estatísticas de Cursos quanto potencialmente em outro lugar no futuro): invalidar o cache de uma
  chave nunca deve invalidar acidentalmente o cache de uma chave não relacionada.
- Usuário nunca abre um painel de estatísticas na sessão: `AppState.cache` correspondente nunca é
  populado — nenhum custo de performance para quem não usa a funcionalidade.
- Sessão longa com múltiplas escritas intercaladas de Curso/Disciplina/Instrutor: cada escrita
  invalida só a(s) chave(s) de cache que ela realmente afeta, nunca o cache inteiro (mesmo espírito
  de "invalidação explícita por chave, não recálculo global" já decidido em `04-appstate.md`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `AppState` DEVE ganhar um objeto `cache` (chave = identificador da informação
  cacheada) e um método `invalidar(chaves)` que aceita uma chave, uma lista de chaves, ou `"*"` para
  limpar tudo — substituindo variáveis locais de cada view que hoje controlam isso ad hoc (RF-NAV-01).
- **FR-002**: `AppState` DEVE ganhar um método `onChange(chave, callback)` que registra uma função a
  ser chamada quando o cache daquela chave for invalidado — para que uma view possa reagir a uma
  mudança de dado sem sondagem manual.
- **FR-003**: As 3 flags de controle de cache hoje existentes (`estatisticasCursoCarregadas` em
  `app/(app)/cursos/[curso]/page.tsx`, `estatisticasDisciplinasCarregadas` em `app/(app)/disciplinas/page.tsx`,
  `estatisticasInstrutoresCarregadas` em `app/(app)/instrutores/page.tsx`) DEVEM ser substituídas pelo novo
  `AppState.cache`/`invalidar()` (Clarifications 2026-08-16).
- **FR-004**: Toda escrita que altera um dado agregado por um painel de estatísticas DEVE invalidar a
  chave de cache correspondente, para que a próxima abertura daquele painel busque dado atualizado
  do backend — não só as escritas "primárias" de Curso/Disciplina/Instrutor, mas o conjunto completo
  de dados que cada painel de fato agrega (Clarifications 2026-08-16), especificamente:
  - Painel de Cursos (`app/(app)/cursos/[curso]/page.tsx`, uma única chave de cache cobrindo Cursos e Turmas juntos,
    já que hoje é uma única flag/uma única consulta combinada): escrita em `cursos` **ou**
    `turmas` invalida essa chave. **Achado**: hoje nenhuma tela do app escreve em
    `cursos`/`turmas` (cadastro de curso/turma é feito direto no banco, fora do app) —
    não há, no momento, nenhum ponto de chamada real para essa invalidação; o mecanismo fica pronto
    para quando um caminho de escrita existir, sem redesenho.
  - Painel de Disciplinas (`app/(app)/disciplinas/page.tsx`): escrita em `disciplinas` (edição de
    disciplina, prioridade) **ou** lançamento/exclusão de uma Aula em
    `registros_aula` (via DSA) invalida essa chave — lançar uma aula muda a carga
    horária executada, que por sua vez muda "concluída"/"atrasada" no painel.
  - Painel de Instrutores (`app/(app)/instrutores/page.tsx`): escrita em `instrutores` (cadastro, edição,
    desativação) invalida essa chave.
- **FR-005**: Reabrir um painel de estatísticas sem que nenhuma escrita relevante tenha ocorrido
  desde a última vez que ele foi aberto NÃO DEVE disparar uma nova chamada ao backend — preserva o
  comportamento de performance atual (User Story 2, cenário 2).
- **FR-006**: O mecanismo de roteador declarado mas nunca usado (`registrarRota`/`ROTAS[hash]`) DEVE
  ser removido de `components/ciaara/` — código morto, sem nenhum consumidor real (Clarifications
  2026-08-16). `irPara(hash)` continua sendo o único mecanismo de navegação, sem nenhuma mudança de
  comportamento externo (RF-NAV-02/03).
- **FR-007**: Nenhuma tela existente pode perder a seleção de curso/turma/filtro ativa ao navegar
  para outra tela e voltar (RF-NAV-03) — comportamento de não regressão coberto pela suíte de
  invariantes onde a lógica for pura/testável, e pelo roteiro manual de `quickstart.md` para o resto.
- **FR-008**: Navegação por link direto/histórico do navegador (voltar/avançar, compartilhar link
  para uma tela específica) fica **fora de escopo** desta spec — permanece "avaliação, não
  compromisso" (`04-appstate.md`), dado o risco documentado de quebrar a comunicação `postMessage`
  do página do Next.js (mesmo bug já corrigido no Épico E). Nenhuma mudança em
  `window.location.hash` é introduzida por esta spec.

### Key Entities

- **`AppState.cache`**: estrutura em memória, não persistida, existente apenas durante a sessão do
  navegador — mapa de chave (string, nome da informação cacheada, ex.: `"estatisticasCursos"`) para
  o dado já buscado do backend. Não é uma entidade de dados do domínio CIAARA-11, é infraestrutura
  de front-end.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Após uma escrita que afeta um painel de estatísticas (Disciplina, Instrutor, ou
  lançamento de Aula pelo DSA para o painel de Disciplinas), o painel correspondente mostra dado
  atualizado na primeira vez que é reaberto, sem exigir recarregar a página — em 100% dos casos
  testados manualmente via `quickstart.md`.
- **SC-002**: Reabrir um painel de estatísticas sem escrita relevante desde a última abertura não
  gera uma nova chamada de rede ao backend (verificável via aba de rede do navegador durante o
  roteiro manual).
- **SC-003**: Nenhum dos pontos de entrada de navegação hoje existentes (menu lateral, cartões da
  tela Início, seleção de turma dentro de uma tela) muda de comportamento observável para o usuário.
- **SC-004**: Seleção de curso/turma/filtro sobrevive a pelo menos 3 navegações consecutivas entre
  telas diferentes, testado manualmente.

## Assumptions

- Escopo restrito ao que está **concretamente quebrado ou incompleto hoje** (cache/invalidação
  ausente, 3 flags ad hoc, roteador morto) — não uma reescrita especulativa de todo o `AppState`
  para casos de uso que nenhuma tela tem hoje. Mesmo critério de contenção de escopo já usado em
  todo hotfix/épico anterior desta sessão (constitution Princípio IX).
- History API / deep-link ficam fora desta rodada (FR-008) — decisão já hedged pelo próprio
  `04-appstate.md" e reforçada pelo risco concreto e já documentado de quebrar o página do Next.js. Se algum dia entrar, é uma spec própria, não uma extensão silenciosa desta.
- `registrarRota`/`ROTAS[hash]` sai do código (FR-006, Clarifications 2026-08-16); se uma view
  futura precisar re-buscar dado a cada navegação (não só no boot), essa necessidade é resolvida
  quando surgir, não antecipada aqui — nenhuma tela hoje pede isso.
- `AppState.filtros`/`setFiltro` (já existentes desde o Épico E) não mudam nesta spec — já cumprem
  RF-NAV-01 para filtro; o gap real e verificado é só cache de estatística, não filtro.
- Nenhuma mudança de schema físico, nenhuma função de backend nova — esta spec é inteiramente
  front-end (`components/ciaara/` + as 3 views citadas), mesmo perfil do Hotfix 010.
