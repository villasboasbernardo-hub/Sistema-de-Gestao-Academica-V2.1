# Feature Specification: Módulo de Disciplinas — Navegação em Cascata e Edição de Período/Instrutor por Turma

**Feature Branch**: `030-ui-disciplinas-cascata`

**Created**: 2026-08-20

**Status**: Draft

**Input**: User description: "NOVO ÉPICO: Refatoração da UI do Módulo de Disciplinas (Cascata e
Atribuição). A interface do módulo de disciplinas precisa refletir o modelo Curso → Turma →
Disciplina: seletores dependentes (Curso → Turma), tabela de disciplinas da turma selecionada
(Nome, Início, Término, Instrutores Selecionados, Ações), modal de edição com data de início/fim e
multi-select de instrutores (com busca), e validação client-side de que o período não ultrapassa a
janela da turma."

## Achados reais (leitura de código antes de escrever qualquer requisito)

- **`app/(app)/disciplinas/page.tsx` hoje não tem nenhuma cascata** — só 1 `<select>` de Curso
  (`#discCursoSelecao`); `carregarDisciplinas(idCurso)` chama `gs('listarDisciplinas')` e filtra só
  por `ID_Curso`, trabalhando inteiramente sobre `disciplinas` (nível de grade/curso) — **zero
  consciência de `turma_disciplina`**, nenhum `ID_Turma` em nenhum lugar do arquivo. A tabela edita
  inline (`Carga_Horaria_Tempos`/`Tecnica_Ensino_Sugerida`/`Local_Padrao`, botão "Salvar" por
  linha) — sem modal, sem colunas de Início/Término/Instrutor. Os pontos 1 e 2 do pedido original
  (cascata; tabela por turma com datas+instrutor) são lacunas reais, não redundância com specs
  anteriores.
- **`lib/acoes/disciplinas.ts` (27 linhas) só tem 4 wrappers finos** sobre `disciplinas`/
  `avaliacoes_planejadas` (`listarDisciplinas`, `atualizarDisciplina`, `listaravaliacoesPlanejadas`,
  `atualizarAvaliacaoPlanejada`) — nenhuma leitura/escrita de `turma_disciplina`.
- **Todo o backend necessário já existe e está em produção (specs 027/029) — esta spec MUST NUNCA
  precisar de nenhuma mudança de backend**: `crudListar('turma_disciplina')`,
  `atualizarTurmaDisciplina(idTurmaDisciplina, alteracoes)` (bloqueio server-side já ativo, mensagem
  citando os limites reais da turma), `crudListar('instrutor_disciplina')`, `crudListar('instrutores')` — mesmas funções já usadas pelo painel de período de `app/(app)/cursos/[curso]/page.tsx`.
- **Nenhum Tailwind CSS `.modal` existe em nenhum arquivo deste projeto** — mesmo achado já registrado
  nas specs 028/029 (`grep -rl 'class="modal fade"' src/frontend` não encontra nada); todo painel
  existente (LIQ, O.S. de Instrutoria, Ficha, período por turma) alterna via `style.display`. O
  "modal" pedido é implementado com a mesma convenção, por consistência.
- **Existe precedente de checkbox-com-busca, mas na direção oposta**: `painelAtribuicaoDisciplinasHtmlInstrutor_`
  (`app/(app)/instrutores/page.tsx`, spec 019) tem busca (`#buscaDisciplinasInstrutor` +
  `filtrarPainelDisciplinasInstrutor_`) sobre checkboxes de **disciplina→instrutor** (atribuir
  disciplinas a um instrutor). O checkbox de **instrutor→disciplina** que a spec 029 construiu
  (`checkboxesInstrutor_`, `app/(app)/cursos/[curso]/page.tsx`) **não tem busca nem exibição compacta** reutilizável
  numa célula de tabela — os dois precisam ser construídos aqui, reaproveitando o *padrão* de busca
  da spec 019 (não o código, que está na direção errada).
- **A validação client-side pedida como "crucial" já é bloqueada no servidor** (`intervaloContidoEm_`/
  `atualizarTurmaDisciplina`, `lib/acoes/liq.ts`, spec 029, já implantado) — o pedido acrescenta uma camada
  de validação no cliente (feedback instantâneo, sem round-trip ao servidor), **complementar**, não
  substituta, à validação server-side já existente (defesa em profundidade — nunca confiar só no
  cliente).
- **`app/(app)/disciplinas/page.tsx` e `app/(app)/cursos/[curso]/page.tsx` são telas genuinamente diferentes** — a primeira é um
  catálogo de edição de grade (CH/técnica/local), curso-scoped, compartilhado entre 2 divisões
  (doc do próprio arquivo); a segunda é um drill-down operacional curso→turma→disciplina que já
  hospeda o painel de período (specs 027/029). Construir a cascata aqui não duplica as specs
  anteriores — é uma superfície de UI nova para um público/fluxo diferente —, mas a edição
  reaproveita a **mesma** função de backend (`atualizarTurmaDisciplina`), nunca duplicando lógica de
  validação no servidor.

## Clarifications

### Session 2026-08-20

- Q: O que acontece com a edição de grade que já existe hoje em `app/(app)/disciplinas/page.tsx` (Carga
  Horária, Técnica de Ensino, Local Padrão — por curso, inline, sem turma) depois que a cascata
  Curso→Turma for adicionada? → A: A edição de grade continua exatamente como está hoje (curso-
  scoped, sempre visível, inalterada) — a nova cascata Curso→Turma + tabela por turma aparece como
  uma **seção adicional**, visível só depois da turma escolhida. Nada existente é removido.
- Nenhuma outra pergunta formal necessária: a única decisão de design que restava (modal Tailwind CSS
  vs. painel `style.display`) já segue precedente estabelecido e confirmado nesta sessão (specs
  028/029, zero exceção em todo o projeto).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegar em cascata Curso → Turma e ver a grade daquela turma (Priority: P1)

Como Divisão de Orientação Educacional e Pedagógica, quero escolher um curso, depois uma turma
específica daquele curso, e ver só as disciplinas daquela turma (não a grade completa do curso) —
com o período e os instrutores selecionados já visíveis na tabela, sem precisar abrir cada
disciplina para saber quem está atribuído.

**Why this priority**: É o pré-requisito de navegação — sem ele, não há como chegar à disciplina
certa para editar (User Story 2).

**Independent Test**: Abrir o Módulo de Disciplinas, escolher um curso com 2 turmas no mesmo ano
(ex. `C-ApA-AuxNav-PR-SP`), confirmar que o seletor de Turma mostra só as turmas daquele curso, e
que a tabela só aparece depois da turma escolhida — trocando de turma, a tabela muda para as
disciplinas daquela turma específica (não da grade inteira do curso).

**Acceptance Scenarios**:

1. **Given** o Módulo de Disciplinas recém-aberto, **When** a página carrega, **Then** só o
   seletor de Curso está visível — nenhum seletor de Turma, nenhuma tabela.
2. **Given** um curso selecionado, **When** o seletor de Turma é populado, **Then** contém
   exclusivamente as turmas vinculadas àquele curso (`turmas`, `ID_Curso` igual ao
   selecionado).
3. **Given** curso selecionado mas turma ainda não, **When** a tela é observada, **Then** a tabela
   principal de disciplinas não é renderizada.
4. **Given** uma turma selecionada, **When** a tabela renderiza, **Then** lista as disciplinas de
   `turma_disciplina` daquela turma (não `disciplinas` diretamente), com as colunas Nome da
   Disciplina, Início, Término, Instrutores Selecionados (resumo compacto, nunca a lista de
   checkboxes completa) e Ações.
5. **Given** um curso sem nenhuma turma, **When** o curso é selecionado, **Then** o seletor de
   Turma aparece vazio com mensagem informativa, nunca erro.

---

### User Story 2 - Editar período e instrutores de uma disciplina, com validação instantânea (Priority: P1)

Como Divisão de Orientação Educacional e Pedagógica, quero clicar em "Editar" numa disciplina da
tabela, alterar a data de início/término e marcar/desmarcar instrutores habilitados numa lista
com busca, e ser avisado imediatamente — sem esperar o servidor — se a data que escolhi está fora
do período da turma.

**Why this priority**: Mesma prioridade da User Story 1 — as duas juntas formam o ciclo completo
(navegar até a disciplina certa, depois editá-la).

**Independent Test**: Editar uma disciplina, tentar salvar uma data fora da janela da turma —
confirmar bloqueio imediato (sem chamada de rede), depois corrigir e confirmar que salva
normalmente, refletindo na tabela.

**Acceptance Scenarios**:

1. **Given** a tabela de disciplinas de uma turma, **When** o usuário clica "Editar" numa linha,
   **Then** um painel abre com campos de Data de Início/Término pré-preenchidos e uma lista de
   checkboxes com busca dos instrutores **habilitados** para aquela disciplina, pré-marcados
   conforme a seleção atual.
2. **Given** o painel de edição aberto, **When** o usuário digita na busca, **Then** a lista de
   checkboxes filtra em tempo real, sem chamada de rede nova.
3. **Given** o painel de edição aberto, **When** o usuário altera a data de início ou término para
   fora da janela `Data_Inicio`–`Data_Termino` da turma e tenta salvar, **Then** o salvamento é
   bloqueado no cliente, com alerta citando os limites reais da turma — nenhuma chamada ao
   backend acontece.
4. **Given** a mesma situação, **When** o usuário corrige a data para dentro da janela e salva de
   novo, **Then** a gravação é aceita (via `atualizarTurmaDisciplina`, mesma função de backend das
   specs 027/029), a tabela reflete o novo período/instrutores, e o painel fecha.
5. **Given** uma disciplina sem nenhum instrutor habilitado, **When** o painel de edição abre,
   **Then** aparece mensagem informativa no lugar da lista de checkboxes, nunca erro.

---

### Edge Cases

- Turma sem nenhuma disciplina em `turma_disciplina`: tabela vazia com mensagem informativa, nunca
  erro.
- Disciplina sem nenhum instrutor selecionado: coluna "Instrutores Selecionados" mostra "—" ou
  texto equivalente, nunca célula quebrada/vazia sem explicação.
- Turma sem `Data_Inicio`/`Data_Termino` preenchidos: a validação client-side degrada para permitir
  o salvamento sem bloqueio — mesmo comportamento de `intervaloContidoEm_` no servidor (RN-DEG-01),
  nunca uma inconsistência entre as 2 camadas.
- Validação client-side aprova mas o servidor bloqueia mesmo assim (ex.: dado mudou entre abrir o
  painel e salvar): o erro do servidor ainda aparece normalmente — a camada client-side é
  conveniência, nunca a única defesa.
- Muitos instrutores selecionados numa disciplina: o resumo compacto da tabela trunca/agrega (ex.
  "Fulano, Beltrano +2"), nunca estoura o layout da coluna.
- Curso selecionado sem nenhuma turma: a edição de grade (FR-002.1) continua funcionando
  normalmente — só a seção nova (cascata/tabela por turma) fica vazia com mensagem informativa.
- Curso deselecionado depois de já ter escolhido turma [achado de `/speckit-analyze`]: o seletor
  de Turma, a tabela por turma e o painel de edição MUST resetar/esconder junto com a limpeza já
  existente das 2 tabelas antigas — nunca permanecer visível com dado do curso anterior.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `app/(app)/disciplinas/page.tsx` MUST ganhar um seletor de Turma, populado dinamicamente com as
  turmas do curso selecionado (`turmas` filtrado por `ID_Curso`), visível só depois de um
  curso escolhido.
- **FR-002**: A tabela principal de disciplinas (turma-scoped) MUST renderizar somente depois de
  uma turma selecionada, listando as linhas de `turma_disciplina` daquela turma — nunca mais `disciplinas` diretamente para este propósito.
- **FR-002.1** [Clarifications 2026-08-20]: A tela de edição de grade já existente (Carga Horária,
  Técnica de Ensino Sugerida, Local Padrão — curso-scoped, inline, sem turma) MUST permanecer
  exatamente como está hoje, sempre visível, sem nenhuma alteração de comportamento — a cascata
  Curso→Turma e a tabela por turma (FR-001 a FR-008) são uma **seção adicional** na mesma tela,
  nunca uma substituição. Justificativa: `Carga_Horaria_Tempos`/`Tecnica_Ensino_Sugerida`/
  `Local_Padrao` são atributos de grade (mesmos para todas as turmas do curso) — não fazem sentido
  estrutural no nível de turma, e nada no pedido original justificaria removê-los.
- **FR-003**: A tabela MUST exibir exatamente as colunas Nome da Disciplina, Início, Término,
  Instrutores Selecionados (resumo compacto de nomes/postos, nunca a lista de checkboxes completa)
  e Ações.
- **FR-004**: O botão "Editar" de cada linha MUST abrir um painel de edição (mesma convenção
  `style.display` já usada em todo o projeto — nenhum Tailwind CSS `.modal` existe hoje) com: campos
  de Data de Início/Término pré-preenchidos, e uma lista de checkboxes **com busca** dos
  instrutores habilitados (`instrutor_disciplina`, `Status='Ativo'`, mesmo `ID_Grade`) para aquela
  disciplina, pré-marcados conforme `turma_disciplina.ID_Instrutor` atual.
- **FR-005**: A busca de instrutores no painel de edição MUST filtrar a lista de checkboxes em
  tempo real, sem nenhuma chamada de rede nova (mesmo padrão de UX de
  `filtrarPainelDisciplinasInstrutor_`, spec 019, aplicado na direção instrutor→disciplina).
- **FR-006**: Antes de enviar a gravação, o sistema MUST validar no cliente que a data de início/
  término informada está dentro da janela `Data_Inicio`–`Data_Termino` da turma correspondente —
  se violar, MUST bloquear o envio com alerta citando os limites reais da turma, sem chamar o
  backend. Mesma regra de `intervaloContidoEm_` (server-side, spec 029), replicada no cliente para
  feedback instantâneo — complementar, nunca substituta da validação server-side.
- **FR-007**: Quando a turma correspondente não tiver `Data_Inicio`/`Data_Termino` preenchidos, a
  validação client-side de FR-006 MUST degradar para permitir o envio sem bloqueio — mesmo
  comportamento de degradação já usado pelo servidor (RN-DEG-01).
- **FR-008**: O salvamento MUST reaproveitar `atualizarTurmaDisciplina` (backend, spec 029) sem
  nenhuma mudança de backend — mesma função já usada pelo painel de período de `app/(app)/cursos/[curso]/page.tsx`,
  chamada agora também a partir deste novo ponto de UI.
- **FR-009**: Esta spec MUST NUNCA alterar `lib/acoes/disciplinas.ts`, `lib/acoes/liq.ts`,
  nem qualquer schema (`disciplinas`, `turma_disciplina`, `instrutor_disciplina`) — é
  estritamente frontend, reaproveitando 100% do backend já existente.
- **FR-010**: Esta spec MUST NUNCA alterar o painel de período por turma já existente em
  `app/(app)/cursos/[curso]/page.tsx` (specs 027/029) — cobre um fluxo semelhante para um público diferente, sem
  substituí-lo nem duplicar sua lógica de validação.

### Key Entities

Nenhuma entidade nova — leitura/escrita pura sobre `turma_disciplina`, `turmas`,
`instrutor_disciplina` e `instrutores` (todas já existentes).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Selecionar curso → turma exibe exclusivamente as disciplinas daquela turma
  (`turma_disciplina`), nunca a grade completa do curso.
- **SC-002**: Tentar salvar uma data fora da janela da turma é bloqueado no cliente 100% das vezes,
  sem nenhuma chamada de rede ao backend (verificável: `atualizarTurmaDisciplina` não é chamada).
- **SC-003**: Marcar/desmarcar múltiplos instrutores e salvar reflete corretamente em `turma_disciplina.ID_Instrutor`, confirmado reabrindo o painel de edição.
- **SC-004**: A busca de instrutor filtra a lista em tempo real, sem nenhuma chamada de rede nova.
- **SC-005**: 0% de regressão na suíte de testes (`pnpm vitest run`).

## Assumptions

- "Modal" é implementado como painel colapsável (`style.display`), mesma convenção já estabelecida
  em toda a SPA — nenhum Tailwind CSS `.modal` existe em nenhum lugar do projeto (achado real,
  reconfirmado nesta spec).
- Nenhuma mudança de backend — 100% reaproveitamento de `atualizarTurmaDisciplina`/`intervaloContidoEm_`
  (spec 029) e do CRUD genérico já existentes.
- A validação client-side é uma cópia funcional da regra já aplicada no servidor, para feedback
  instantâneo — nunca a única camada de defesa (o servidor continua validando de qualquer forma).
- `app/(app)/cursos/[curso]/page.tsx`'s painel de período (specs 027/029) permanece intocado — esta spec não o
  substitui nem reaproveita seu código diretamente, só reaproveita a mesma função de backend.
