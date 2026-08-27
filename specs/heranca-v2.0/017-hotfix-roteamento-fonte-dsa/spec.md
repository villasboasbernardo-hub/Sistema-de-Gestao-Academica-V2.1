# Feature Specification: Hotfix — Roteamento SPA, Fonte Rawline e Performance do DSA

**Feature Branch**: `017-hotfix-roteamento-fonte-dsa`

**Created**: 2026-08-17

**Status**: Draft

**Input**: User description: "HOTFIX: Correção de Roteamento SPA, CDN da Fonte e Performance de
Backend (Timeout). Contexto: durante a bateria de testes, o formulário de cadastro/edição de
instrutores falhou no roteamento (abriu a tela inicial em vez do formulário), a fonte Rawline foi
bloqueada pelo navegador (MIME type), e a busca semanal do DSA estourou o limite de tempo (timeout)
para 'CAHO 2026'."

## Achados reais confirmados por leitura de código (antes de qualquer requisito ser escrito)

Os 3 relatos foram verificados um a um contra o código publicado em produção (`@37`,
`o SHA do commit` `2026-08-17.FICHA.1`) antes de qualquer requisito ser escrito — mesmo protocolo já usado
em todo hotfix anterior desta sessão (`012`, `013`, achados pós-deploy do `014`).

1. **Roteamento (não é o que o pedido original diagnosticava)**. `app/layout.tsx`:170` roda
   `irPara(window.location.hash.replace('#', '') || 'tabInicio')` dentro de `DOMContentLoaded`,
   **antes** do evento `contexto-pronto` disparar (que só depois chama
   `verificarDeepLinksInstrutor_()`). Como o deep-link de cadastro/edição de instrutor usa parâmetro
   de query (`?editarInstrutor=ID` / `?novoInstrutor=1`), nunca `#hash`, essa linha sempre resolve
   para `'tabInicio'` — e `irPara()` (`components/ciaara/`:164-172`) esconde explicitamente
   (`display:none`) **todos** os outros contêineres `[data-view]`, inclusive
   `[data-view="tabInstrutores"]`, reforçando a regra CSS já existente em `app/globals.css`. O painel
   de edição/cadastro **é** renderizado corretamente dentro dele — só que dentro de um contêiner que
   ficou invisível. A causa **não** é perda de contexto de `window.open`/página (a spec
   `014-refatoracao-modulo-instrutores` adotou "nova aba" deliberadamente, com justificativa técnica
   documentada, para um problema diferente e ainda válido — ver Assumptions).
2. **Fonte Rawline (confirmado, real)**. `app/globals.css`:16` tem exatamente a tag
   `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@govbr-ds/core@latest/dist/fonts/rawline/rawline.css">`
   descrita no pedido.
3. **Performance do DSA (causa raiz diferente da diagnosticada, mesmo sintoma)**. Não existe nenhum
   padrão de `getRange().getValue()`/`.select()` dentro de um loop em `lib/acoes/dsa.ts` — o
   código já lê cada aba em massa via `lerAbaComoObjetos_` (que já faz `getDataRange()`.select()``
   uma única vez por chamada). O bug real: `getDsaSemanal(idTurma, semanaIso)` chama
   `detectarConflitosDsa_(dataIso)` uma vez por dia da semana (5×, `for (di = 0; di < 5; di++)`), e
   `detectarConflitosDsa_` lê **todas** as turmas do sistema
   (`lerAbaComoObjetos_('turmas')`) e, para **cada** turma, chama `blocosBrutosDoDia_`, que por
   sua vez faz 3 leituras completas — `lerAbaComoObjetos_('registros_aula')`,
   `lerAbaComoObjetos_('avaliacoes')`, `lerAbaComoObjetos_('extracurriculares')` — **de novo, a
   cada turma, a cada dia**. Para um curso com múltiplas turmas ativas (ex. "CAHO 2026"), isso gera
   dezenas de leituras completas redundantes de `registros_aula` (aba com 1.500+
   linhas) numa única requisição — a causa real do timeout de 30s do chamada direta da Server Action
   (`components/ciaara/`:16-22`).
4. **a Server Action (item 4 do pedido, apenas informativo)**. Já 100% conforme: a Server Action
   (`components/ciaara/`:12-43`), único ponto de chamada de backend usado por **toda** a
   aplicação sem exceção, já sempre usa `.withSuccessHandler(...).withFailureHandler(...)`. Nenhuma
   mudança necessária — documentado aqui só para registrar que foi verificado, não vira requisito.

## Clarifications

### Session 2026-08-17

- Q: Deve o mecanismo de deep-link via URL (`?editarInstrutor=<ID>`/`?novoInstrutor=1`, `app/layout.tsx` (layout raiz))
  continuar existindo mesmo depois que o clique normal do botão passar a navegar inteiramente
  dentro da SPA (sem depender dele)? → A: Sim — mantido como entrada secundária (link direto/
  favorito), corrigido para rotear certo; o clique deixa de depender dele, mas ele continua
  funcionando por conta própria.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar/editar instrutor sem sair da tela (Priority: P1)

Um Operador/Administrador clica em "Cadastrar Novo Instrutor" (ou "Editar" numa linha da listagem)
na tela de Instrutores. O formulário completo aparece imediatamente na mesma aba, sem piscar a tela
inicial, sem abrir uma nova aba/janela do navegador.

**Why this priority**: É o defeito mais visível e mais recentemente introduzido (spec 016,
implantado há poucas horas) — o formulário de cadastro/edição inteiro está, na prática,
inacessível pela interface até este hotfix (o clique não leva a lugar nenhum visível).

**Independent Test**: Logado como Operador, clicar em "Cadastrar Novo Instrutor" a partir da tela de
Instrutores e confirmar que o formulário aparece na mesma aba, na mesma janela, sem nenhum
recarregamento de página perceptível. Repetir clicando em "Editar" numa linha existente.

**Acceptance Scenarios**:

1. **Given** o usuário está na tela de Instrutores (qualquer aba da SPA), **When** ele clica em
   "Cadastrar Novo Instrutor", **Then** o formulário de cadastro aparece imediatamente na mesma aba
   do navegador, sem nova aba/janela e sem a tela inicial aparecer no meio do caminho.
2. **Given** o usuário está na listagem de Instrutores, **When** ele clica em "Editar" numa linha,
   **Then** o formulário de edição daquele instrutor específico aparece na mesma aba, com os campos
   já preenchidos.
3. **Given** o usuário abre a aplicação Next.js diretamente por uma URL com `?editarInstrutor=<ID>` (ex.: um
   link salvo), **When** a página termina de carregar, **Then** ela mostra diretamente o formulário
   de edição daquele instrutor (não a tela inicial) — o mesmo mecanismo de link direto continua
   funcionando, só que corrigido.

---

### User Story 2 - Consultar o Detalhe Semanal de Aula de um curso com várias turmas sem timeout (Priority: P1)

Um usuário abre o Detalhe Semanal de Aula (DSA) de uma turma pertencente a um curso com múltiplas
turmas ativas simultâneas (ex.: "CAHO 2026"). A grade da semana aparece rapidamente, sem estourar o
tempo limite.

**Why this priority**: Mesma severidade da User Story 1 — sem esse hotfix, o DSA de qualquer curso
com várias turmas fica inutilizável (erro de tempo esgotado) para o caso de uso mais comum do
sistema (lançamento/consulta semanal de aula).

**Independent Test**: Abrir o DSA de uma turma de "CAHO 2026" (curso real com múltiplas turmas
ativas) e confirmar que a grade da semana aparece em poucos segundos, sem erro de tempo esgotado.

**Acceptance Scenarios**:

1. **Given** um curso com várias turmas ativas no sistema, **When** o usuário abre o DSA de uma das
   turmas desse curso, **Then** a grade da semana é exibida em menos de 3 segundos, sem erro de
   tempo esgotado.
2. **Given** a mesma consulta, **When** o resultado é comparado ao comportamento anterior a este
   hotfix, **Then** os dados exibidos (blocos, conflitos, horários) são idênticos — só a velocidade
   muda, nenhum dado sai da grade, nenhum conflito deixa de ser sinalizado.

---

### User Story 3 - Interface sem aviso de bloqueio de recurso no console (Priority: P3)

Um usuário abre qualquer tela do sistema. O navegador carrega a tipografia Rawline sem bloquear a
requisição por tipo MIME incorreto.

**Why this priority**: Cosmético/silencioso para o usuário final (a interface já degrada
graciosamente para a fonte de sistema quando a Rawline falha) — prioridade mais baixa que os 2
defeitos funcionais acima, mas parte do mesmo pedido e trivial de corrigir junto.

**Independent Test**: Abrir qualquer tela do sistema com o console do navegador aberto e confirmar
ausência de erro de tipo MIME relacionado à fonte Rawline.

**Acceptance Scenarios**:

1. **Given** qualquer tela do sistema carregada, **When** o console do navegador é inspecionado,
   **Then** não aparece nenhum erro de tipo MIME (`text/plain` bloqueado) relacionado à folha de
   estilo da fonte Rawline.

---

### Edge Cases

- Usuário clica em "Cadastrar Novo Instrutor" a partir de uma tela diferente de Instrutores (ex.:
  Cronograma) — o sistema deve trocar para a tela de Instrutores e mostrar o formulário, não exigir
  que o usuário já esteja na tela certa.
- URL de deep-link (`?editarInstrutor=<ID>`) aponta para um `ID_Instrutor` inexistente/fora de
  escopo — comportamento já coberto por FR-004 da spec `014-refatoracao-modulo-instrutores`
  (mensagem clara, nunca tela em branco), inalterado por este hotfix.
- Curso do DSA sem nenhuma turma além da consultada — a otimização de performance não pode mudar o
  resultado (mesmos blocos/conflitos de hoje), só a velocidade.
- Falha de rede ao carregar a fonte CDN nova — a interface já degrada para a fonte de sistema
  (comportamento padrão de `font-family` em cascata), sem bloquear nenhuma funcionalidade.

## Requirements *(mandatory)*

### Functional Requirements

**Roteamento (US1)**

- **FR-001**: O clique em "Cadastrar Novo Instrutor" ou "Editar" (listagem de Instrutores) DEVE
  exibir o formulário correspondente na mesma aba/janela do navegador, sem nunca abrir uma nova
  aba/janela (`target="_blank"`/`window.open` removidos deste fluxo).
- **FR-002**: A troca entre a tela atual e o formulário de cadastro/edição de instrutor DEVE
  reaproveitar o mecanismo de navegação interna já existente da SPA (mesmo padrão usado pelas outras
  8 abas do sistema) — nunca mutar `window.location.hash` (risco documentado desde o Épico E: essa
  mutação, dentro do página isolado que o Next.js usa para servir a aplicação Next.js, quebra a
  sincronização `postMessage` com o wrapper externo do a URL do projeto na Vercel e derruba a página).
- **FR-003**: Quando a aplicação Next.js é carregada com o parâmetro de deep-link de edição
  (`?editarInstrutor=<ID>`) ou de cadastro (`?novoInstrutor=1`), o roteamento inicial da SPA DEVE
  exibir a aba de Instrutores (não a tela inicial), antes de o formulário correspondente ser
  renderizado dentro dela.
- **FR-004**: O comportamento de bloqueio/mensagem para `ID_Instrutor` inválido no deep-link de
  edição (spec 014, FR-004) permanece inalterado por este hotfix.

**Fonte Rawline (US3)**

- **FR-005**: A folha de estilo da tipografia Rawline DEVE ser carregada de uma origem que sirva o
  arquivo com o tipo MIME correto (`text/css`), substituindo a URL atual (`cdn.jsdelivr.net/npm/
  @govbr-ds/core@latest/...`) por `https://fonts.cdnfonts.com/css/rawline`.

**Performance do DSA (US2)**

- **FR-006**: A consulta ao Detalhe Semanal de Aula (`getDsaSemanal`) DEVE eliminar toda leitura
  redundante e repetida das mesmas abas dentro do cruzamento dia×turma — cada aba envolvida no
  cálculo de conflitos (`turmas`, `registros_aula`, `avaliacoes`,
  `atividades_nao_letivas`) é lida no máximo uma vez por requisição, independentemente de quantas
  turmas ou dias a grade da semana precisar cruzar.
- **FR-007**: O resultado de `getDsaSemanal` (blocos, conflitos, horários, avisos) DEVE permanecer
  byte-a-byte equivalente ao comportamento anterior a este hotfix para a mesma turma/semana — a
  otimização não pode alterar nenhum dado exibido, só a velocidade de resposta.
- **FR-008**: A detecção de conflito cross-turma (RN-CONF-01, Risco Alto) DEVE continuar cobrindo
  todas as turmas do sistema no mesmo dia, exatamente como hoje — a otimização não reduz o escopo da
  verificação, só evita reler os mesmos dados do zero para cada turma/dia.

**Já conforme (item 4 do pedido, sem requisito novo)**

- Todas as chamadas de backend do frontend já usam `a Server Action (retorno tipado)(...)
  .withFailureHandler(...)` através do wrapper único a Server Action — nenhuma mudança necessária.

### Key Entities

Nenhuma entidade de dado nova ou alterada — hotfix comportamental/performance, zero mudança de
schema.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos cliques em "Cadastrar Novo Instrutor"/"Editar" abrem o formulário
  correspondente na mesma aba, sem nenhuma nova aba/janela do navegador sendo criada.
- **SC-002**: 100% dos carregamentos da aplicação Next.js via URL de deep-link (`?editarInstrutor=<ID>` ou
  `?novoInstrutor=1`) exibem o formulário de instrutor diretamente, sem a tela inicial aparecer no
  meio do caminho.
- **SC-003**: A consulta ao Detalhe Semanal de Aula de um curso com múltiplas turmas ativas (ex.:
  "CAHO 2026") responde em menos de 3 segundos, para qualquer semana do ano letivo corrente.
- **SC-004**: Nenhum erro de tipo MIME relacionado à fonte Rawline aparece no console do navegador
  em nenhuma tela do sistema.
- **SC-005**: Os dados exibidos pelo Detalhe Semanal de Aula (blocos, conflitos, horários) após a
  otimização são idênticos aos exibidos antes dela, para as mesmas turma/semana — verificado por
  comparação direta antes/depois da mudança.

## Assumptions

- O mecanismo de deep-link via URL (`app/layout.tsx` (layout raiz) lendo `e.parameter.editarInstrutor`/`novoInstrutor`,
  spec 014/016) é mantido (Clarifications 2026-08-17) — só a resolução de rota no boot da SPA é
  corrigida para reconhecê-lo. Continua útil como entrada secundária (link direto/favorito), mesmo
  com o fluxo de clique normal passando a navegar inteiramente dentro da SPA sem depender dele.
- A decisão de abrir o formulário de edição em "nova aba" (`window.open`, spec 014) é
  **revertida apenas para este formulário**, substituída pelo mecanismo de navegação interna
  (`irPara`) já usado com sucesso pelas outras 8 abas da SPA — não é uma reversão da lição aprendida
  no Épico E (nunca mutar `window.location.hash` dentro do página do Next.js), que continua
  valendo e não é violada por essa troca (`irPara` já não muta o hash desde sua criação).
- Nenhuma regra de negócio de RN-CONF-01 (conflito cross-turma) muda — só a forma como os dados são
  lidos do banco, nunca o resultado do cálculo.
- A URL do CDN alternativo da fonte (`fonts.cdnfonts.com/css/rawline`) é a exigida explicitamente
  pelo pedido do usuário — nenhuma investigação adicional de CDNs alternativos está no escopo deste
  hotfix.
