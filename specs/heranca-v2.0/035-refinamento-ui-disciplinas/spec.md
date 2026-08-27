# Feature Specification: Refatoração de View State Inicial, Padronização de Datas e UI/UX (Módulo Disciplinas)

**Feature Branch**: `035-refinamento-ui-disciplinas`

**Created**: 2026-08-21

**Status**: Draft

**Input**: User description: "NOVO ÉPICO: Refatoração de View State Inicial, Padronização de Datas e UI/UX (Módulo Disciplinas). O módulo de disciplinas precisa melhorar a experiência do usuário logo no carregamento, garantir a integridade do formato de datas e reaproveitar a formatação de nomes de instrutores de outros módulos. Escopo: (1) estado inicial mostrando disciplinas de todos os cursos, turmas restritas ao ano vigente, sem clique nenhum; (2) padronização rígida de datas dd/mm/aaaa em frontend e backend; (3) painel de edição como modal overlay centralizado com fundo escurecido; (4) reaproveitamento da função de formatação de nome de instrutor já usada no Módulo de Instrutores, proibindo lógica duplicada."

## Verificação de premissa (antes de qualquer requisito)

Confirmado por leitura direta de `app/(app)/disciplinas/page.tsx`, `components/ciaara/` e `lib/supabase/server.ts` antes de escrever este documento — os 4 pontos do pedido são gaps reais, não sintomas mal diagnosticados:

1. `document.addEventListener('contexto-pronto', ...)` (``app/(app)/disciplinas/page.tsx`:93-97`) só popula o `<select>` de Curso e reseta a tela — nenhum curso/turma é pré-selecionado, nenhuma tabela é carregada até o usuário clicar.
2. ``lib/supabase/server.ts`:115` normaliza datas lidas do banco para ISO (`yyyy-MM-dd`); a tabela exibe esse valor cru (`linha.Previsao_Inicio || '—'`, ``app/(app)/disciplinas/page.tsx`:213-214`) sem nenhuma formatação. Não existe nenhum utilitário de data `dd/mm/aaaa` compartilhado no frontend do projeto (só um helper privado de documento em ``lib/acoes/liq.ts`:64`, não reutilizável).
3. O painel de edição é uma `<div id="painelEdicaoDisciplinaTurma" style="display:none">` (``app/(app)/disciplinas/page.tsx`:42`) inserida no fluxo normal da página, sem `position:fixed` nem backdrop.
4. `formatarNomeInstrutor_` (``components/ciaara/`:129`) é usada em `app/(app)/instrutores/page.tsx` e `app/(app)/turmas/[turma]/dsa/page.tsx`, mas nunca em `app/(app)/disciplinas/page.tsx`, que monta nomes com sua própria função (`resumoInstrutoresCompacto_`, ``app/(app)/disciplinas/page.tsx`:181-190`), mostrando só `Nome_Completo` sem posto/especialidade/negrito.

**Decisão de escopo (`/speckit-clarify` embutido nesta especificação)**: o item 1 admitia 3 leituras — pré-seleção automática dentro da cascata existente, uma tabela agregada nova combinando todos os cursos, ou um dropdown de Turma pré-filtrado sem eliminar o clique inicial. Bernardo escolheu a leitura mais literal do texto original: **tabela agregada nova**, combinando disciplinas de todos os cursos, restrita a turmas do ano vigente, como estado inicial da aba — não apenas uma pré-seleção dentro da cascata de um curso por vez.

## Clarifications

### Session 2026-08-21

- Q: A tabela de estado inicial deve incluir turmas do ano vigente com qualquer `Status` (Planejada/Ativa/Concluída/Cancelada), ou só as que estão efetivamente em andamento? → A: Excluir só "Cancelada"; manter Planejada/Ativa/Concluída.
- Q: A coluna "CH Cumprida" deve aparecer na tabela de estado inicial, mesmo exigindo ler `registros_aula` para todas as turmas do ano vigente de uma vez? → A: Sim, incluir a coluna, mas com uma leitura em lote (todas as turmas de uma vez), nunca turma por turma — evita repetir o anti-padrão de N+1 já corrigido na spec 017.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Estado inicial com disciplinas do ano vigente (Priority: P1)

Ao abrir a aba Disciplinas, o usuário vê imediatamente uma tabela com as disciplinas de todas as turmas do ano vigente, de todos os cursos, sem precisar selecionar curso nem turma.

**Why this priority**: é o requisito mais visível do pedido ("sem precisar clicar em nada") e a mudança que mais afeta a experiência de quem abre a tela pela primeira vez a cada sessão.

**Independent Test**: abrir a aba Disciplinas com uma sessão nova e verificar que a tabela já está preenchida, sem qualquer seleção prévia de Curso/Turma, mostrando apenas turmas cujo ano letivo é o ano corrente.

**Acceptance Scenarios**:

1. **Given** o usuário nunca interagiu com os seletores de Curso/Turma nesta sessão, **When** a aba Disciplinas termina de carregar, **Then** a tabela já mostra as disciplinas de todas as turmas do ano vigente, de todos os cursos, sem nenhum clique do usuário.
2. **Given** a tabela de estado inicial está visível, **When** o usuário seleciona um Curso e depois uma Turma nos seletores existentes, **Then** a tabela troca para a visão específica daquele curso/turma (comportamento de cascata já existente, inalterado), inclusive para turmas de anos anteriores ao vigente.
3. **Given** não existe nenhuma turma com ano letivo igual ao ano vigente em nenhum curso, **When** a aba carrega, **Then** a tabela mostra uma mensagem de "nenhuma disciplina no ano vigente" em vez de ficar vazia sem explicação ou lançar erro.
4. **Given** o usuário selecionou um Curso (saindo da tabela de estado inicial), **When** ele desseleciona o Curso (volta ao valor vazio do seletor), **Then** a tabela de estado inicial reaparece — nunca o prompt "Selecione um curso primeiro…" que existia antes desta feature, já que "nada selecionado" sempre significa "mostrar o ano vigente" (FR-001), não apenas no primeiro carregamento da sessão.

---

### User Story 2 - Padronização rígida de datas em dd/mm/aaaa (Priority: P1)

Toda data exibida ou editada no módulo de Disciplinas aparece e é gravada estritamente no formato dd/mm/aaaa, sem depender da localização do navegador e sem inversão de dia/mês causada por fuso horário.

**Why this priority**: item obrigatório do pedido, com risco concreto de dado incorreto (RN, gravação de data errada no banco) se não for corrigido.

**Independent Test**: abrir o painel de edição de uma disciplina/turma, digitar uma data em dd/mm/aaaa, salvar, recarregar a tela e conferir que a mesma data (mesmo dia/mês/ano) aparece na tabela e no campo de edição.

**Acceptance Scenarios**:

1. **Given** uma turma com Início/Término preenchidos, **When** a tabela de disciplinas é renderizada, **Then** as duas colunas mostram a data no formato dd/mm/aaaa.
2. **Given** o painel de edição está aberto, **When** o usuário digita uma data em dd/mm/aaaa e salva, **Then** o valor gravado, ao ser lido de volta, corresponde exatamente ao mesmo dia/mês/ano digitado — nenhuma inversão.
3. **Given** o usuário digita uma data inválida (ex.: 31/02/2026 ou formato fora de dd/mm/aaaa), **When** tenta salvar, **Then** o sistema impede o envio e sinaliza o campo como inválido antes de qualquer chamada ao backend.
4. **Given** uma turma sem Início/Término preenchidos, **When** a tabela é renderizada, **Then** a célula mostra o mesmo indicador de ausência já usado hoje ("—"), nunca uma data quebrada ou "Invalid Date".

---

### User Story 3 - Painel de edição como modal centralizado (Priority: P2)

Ao clicar em "Editar" numa disciplina/turma, o painel de edição aparece centralizado na tela, sobre um fundo escurecido que bloqueia interação com o restante da página, em vez de abrir no final da página como hoje.

**Why this priority**: melhoria de usabilidade que depende da tabela (US1) e dos campos de data (US2) já estarem corretos, mas não bloqueia a correção de dado em si.

**Independent Test**: clicar em "Editar" em qualquer linha da tabela (estado inicial ou visão de curso/turma) e verificar que o painel aparece centralizado, com fundo escurecido, sem precisar rolar a página para vê-lo.

**Acceptance Scenarios**:

1. **Given** o usuário está em qualquer ponto de rolagem da página, **When** clica em "Editar" numa linha, **Then** o painel de edição aparece centralizado na tela, sobre um fundo escurecido, sem exigir rolagem.
2. **Given** o painel de edição está aberto, **When** o usuário clica em "Cancelar" ou fora do painel (no fundo escurecido), **Then** o painel fecha sem salvar nada e a seleção de Curso/Turma (ou a tabela de estado inicial) permanece exatamente como estava.
3. **Given** o painel de edição está aberto, **When** o usuário tenta clicar em qualquer elemento do restante da página (fora do painel), **Then** a interação é bloqueada até o painel ser fechado.

---

### User Story 4 - Formatação padronizada do nome do instrutor (Priority: P2)

Em qualquer lugar do módulo de Disciplinas onde o nome de um instrutor aparece (tabela e painel de edição), ele é formatado exatamente como no Módulo de Instrutores — mesmo posto/graduação, especialidade quando aplicável, e nome de guerra em negrito dentro do nome completo.

**Why this priority**: consistência visual e eliminação de lógica duplicada, mas não bloqueia nenhum outro item — é aditivo e isolado à exibição de nome.

**Independent Test**: comparar, para o mesmo instrutor, o texto exibido na listagem do Módulo de Instrutores com o texto exibido na tabela e no painel de edição do módulo de Disciplinas — devem ser idênticos.

**Acceptance Scenarios**:

1. **Given** uma disciplina/turma com um ou mais instrutores selecionados, **When** a tabela é renderizada, **Then** cada nome aparece no mesmo formato usado no Módulo de Instrutores (posto/graduação + especialidade quando aplicável + nome completo com nome de guerra em negrito).
2. **Given** o painel de edição lista instrutores habilitados para seleção, **When** o painel é renderizado, **Then** cada nome na lista usa a mesma formatação, não apenas o nome completo cru.
3. **Given** um `ID_Instrutor` selecionado sem correspondência em `instrutores` (registro órfão), **When** a tabela ou o painel tentam formatar esse nome, **Then** o sistema degrada mostrando o ID cru (comportamento de degradação segura já existente), sem quebrar a renderização do restante da linha.

---

### Edge Cases

- Nenhuma turma do ano vigente existe em nenhum curso (ex.: início de ano letivo, turmas ainda não cadastradas) → tabela de estado inicial mostra mensagem de vazio, nunca erro.
- Todas as turmas do ano vigente de um curso estão com `Status = Cancelada` → esse curso simplesmente não aparece na tabela de estado inicial (não é tratado como erro nem como caso especial).
- Turma sem `Previsao_Inicio`/`Previsao_Termino` preenchidos → célula mostra "—", nunca uma data quebrada.
- `ID_Instrutor` órfão (sem `instrutores` correspondente) → degrada para o ID cru, tanto na tabela quanto no painel, sem interromper a formatação dos demais instrutores da mesma linha.
- Usuário digita data fora do formato dd/mm/aaaa ou uma data inexistente (31/02) → bloqueado antes de qualquer chamada ao backend, com sinalização clara do campo.
- Usuário abre o painel de edição para uma linha, fecha sem salvar, e abre para outra linha → o painel deve carregar os dados da nova linha, sem vazar valores da edição anterior.
- Usuário troca Curso/Turma enquanto o painel de edição está aberto → o painel fecha (mesmo comportamento hoje existente em `aoTrocarTurmaDisciplinas_`), evitando salvar numa turma que não é mais a exibida.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Ao carregar a aba Disciplinas, o sistema MUST exibir automaticamente, sem nenhuma ação do usuário, uma tabela combinando disciplinas de todos os cursos, restrita a turmas cujo ano letivo é o ano vigente e cujo `Status` seja `Planejada`, `Ativa` ou `Concluida` — turmas `Cancelada` são excluídas da tabela de estado inicial.
- **FR-001.1**: A tabela de estado inicial MUST reaparecer sempre que nenhum Curso estiver selecionado — não apenas no primeiro carregamento da sessão, mas também quando o usuário desseleciona um Curso já escolhido (achado do `/speckit-analyze`, F2: "nada selecionado" é sempre o mesmo estado, nunca um prompt vazio diferente do estado inicial).
- **FR-002**: O sistema MUST calcular o "ano vigente" dinamicamente a partir da data corrente no momento do carregamento, reavaliado a cada sessão — nunca um valor fixo.
- **FR-003**: A tabela de estado inicial MUST reaproveitar as mesmas colunas e ações já disponíveis na visão de curso+turma (Início, Término, Instrutores Selecionados, CH Cumprida, Editar), acrescida de uma coluna "Curso" (necessária porque a tabela agregada combina disciplinas de múltiplos cursos, diferente da visão de curso+turma) — sem introduzir um terceiro layout de tabela distinto no módulo.
- **FR-004**: Os seletores de Curso e Turma MUST permanecer disponíveis; ao serem usados, MUST substituir a tabela de estado inicial pela visão específica do curso/turma escolhido (cascata já existente, inalterada), inclusive para turmas fora do ano vigente.
- **FR-004.1**: O cálculo da CH Cumprida para a tabela de estado inicial MUST ser feito numa única operação que cobre todas as turmas do ano vigente de uma vez — o sistema MUST NOT repetir, uma vez por turma, o mesmo tipo de leitura redundante já identificado e corrigido no módulo DSA (precedente: spec 017-hotfix-roteamento-fonte-dsa).
- **FR-005**: Toda exibição de data neste módulo (tabela de estado inicial, tabela de curso/turma, painel de edição) MUST mostrar a data estritamente no formato dd/mm/aaaa.
- **FR-006**: Todo campo de entrada de data neste módulo MUST aceitar e validar exclusivamente o formato dd/mm/aaaa, de forma consistente independentemente do navegador ou da localização do sistema operacional do usuário.
- **FR-007**: O sistema MUST rejeitar, antes de qualquer chamada ao backend, uma data digitada fora do formato dd/mm/aaaa ou uma data calendaricamente inválida (ex.: 31/02).
- **FR-008**: Ao gravar uma data, o backend MUST interpretar o valor recebido como dd/mm/aaaa e persistir de forma que a leitura de volta preserve exatamente o mesmo dia/mês/ano, sem inversão causada por fuso horário.
- **FR-009**: O painel de edição de disciplina/turma MUST ser exibido como um overlay centralizado na tela, sobre um fundo escurecido que impede interação com o restante da página enquanto estiver aberto.
- **FR-010**: O usuário MUST poder fechar o painel de edição (via ação explícita de cancelar ou clique no fundo escurecido) sem salvar nada e sem perder a navegação atual (curso/turma selecionados, ou a tabela de estado inicial).
- **FR-011**: Toda exibição do nome de um instrutor neste módulo (tabela e painel de edição) MUST usar a mesma função de formatação já usada no Módulo de Instrutores — posto/graduação, especialidade quando aplicável, nome completo com o nome de guerra destacado.
- **FR-012**: O sistema MUST ter uma única lógica de formatação de nome de instrutor reutilizada por todos os módulos que exibem instrutor — nenhuma lógica de formatação de nome divergente ou duplicada pode permanecer no módulo de Disciplinas.
- **FR-013**: Quando um `ID_Instrutor` referenciado não corresponder a nenhum instrutor cadastrado, o sistema MUST degradar exibindo o ID cru, tanto na tabela quanto no painel de edição, sem interromper a renderização dos demais dados da linha.

### Key Entities *(data involved)*

- **turma_disciplina**: liga uma disciplina a uma turma específica; contém `Previsao_Inicio`/`Previsao_Termino` e `ID_Instrutor` (seleção efetiva por turma) — fonte de dados tanto da tabela de estado inicial (agregada, restrita ao ano vigente) quanto da visão específica de curso/turma.
- **disciplinas**: catálogo de disciplinas por curso (grade); fornece código/nome quando a linha de `turma_disciplina` não tiver override próprio.
- **turmas**: fornece `Ano_Letivo` e `Status` (`Planejada`/`Ativa`/`Concluida`/`Cancelada`) usados para restringir a tabela de estado inicial ao ano vigente, excluindo turmas `Cancelada`.
- **instrutores**: dados cadastrais do instrutor (posto/graduação, especialidade, nome completo, nome de guerra) consumidos pela formatação padronizada de nome.
- **registros_aula**: fonte da CH Cumprida real por turma; para a tabela de estado inicial, MUST ser lida uma única vez cobrindo todas as turmas do ano vigente (FR-004.1), nunca turma por turma.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário que abre a aba Disciplinas vê disciplinas do ano vigente na tela sem realizar nenhum clique, em 100% das aberturas de sessão.
- **SC-002**: 100% das datas exibidas ou editadas no módulo aparecem no formato dd/mm/aaaa, em qualquer navegador testado.
- **SC-003**: Em 100% dos casos de teste, uma data salva pelo usuário é lida de volta com o mesmo dia/mês/ano digitado — nenhuma inversão de mês/dia.
- **SC-004**: Em 100% dos cliques em "Editar", o painel aparece centralizado na tela com fundo escurecido, sem exigir rolagem da página para ser visto.
- **SC-005**: Para um mesmo instrutor, o texto exibido é idêntico (mesmo conteúdo, mesmo destaque) no Módulo de Instrutores e no módulo de Disciplinas, em 100% dos casos verificados.
- **SC-006**: O número de leituras de dados feitas para montar a tabela de estado inicial não cresce proporcionalmente ao número de turmas do ano vigente (leitura em lote, não uma leitura por turma).

## Assumptions

- A tabela do estado inicial reaproveita a mesma estrutura de colunas/ações da visão de curso+turma já existente (specs 030/031), evitando um terceiro layout de tabela no módulo — decisão consistente com o padrão do projeto de nunca duplicar layout de tabela sem necessidade real.
- Os seletores de Curso/Turma continuam existindo para navegação e edição fora do ano vigente ou revisão pontual de um curso específico; a tabela agregada define apenas o que é mostrado antes de qualquer seleção explícita do usuário.
- O `<input type="date">` nativo do HTML sempre segue a localização do sistema operacional do usuário e não pode ser forçado a exibir literalmente dd/mm/aaaa em todo navegador — por isso, os campos de entrada de data deste módulo passam a usar um campo de texto com máscara dd/mm/aaaa, mesmo padrão de mascaramento já usado no projeto para CPF/CEP/Telefone/RETELMA/NIP (spec 025-ficha-spa-mascaras-schema).
- O painel de edição centralizado é implementado com o componente modal nativo do Tailwind CSS + shadcn/ui (já carregado como dependência versionada no `package.json` no projeto), seguindo a convenção já estabelecida de preferir componente nativo já existente em vez de CSS customizado (Épico A — tema; Épico 009 — sidebar). Diferente da Ficha do Instrutor (specs 023-025), este painel nunca é impresso, então não herda o problema de layout que motivou remover o modal Tailwind CSS naquele caso específico.
- A função de formatação de nome de instrutor a ser reutilizada é `formatarNomeInstrutor_` (`components/ciaara/`), já usada pelos módulos de Instrutores e DSA — nenhuma função nova precisa ser criada, apenas sua aplicação nos pontos onde o módulo de Disciplinas hoje monta o nome manualmente.
- A tabela de estado inicial mantém as mesmas ações de edição já existentes na visão de curso+turma (Carga Horária/Prioridade inline, botão "Editar" para Início/Término/Instrutores) — nenhuma restrição de permissão nova é introduzida além das já vigentes (RBAC, Épico F).
