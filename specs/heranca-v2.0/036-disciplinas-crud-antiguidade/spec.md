# Feature Specification: Expansão de CRUD (Cadastro/Edição Completa) e Ordenação Hierárquica de Instrutores

**Feature Branch**: `036-disciplinas-crud-antiguidade`

**Created**: 2026-08-21

**Status**: Draft

**Input**: User description: "NOVO ÉPICO: Expansão de CRUD (Cadastro/Edição Completa) e Ordenação Hierárquica de Instrutores. Escopo: (1) ordenar os checkboxes de instrutores do painel de edição por precedência militar antes de renderizar; (2) expandir o modal de edição para permitir alterar todos os campos da disciplina (Código, Nome, Carga Horária, Prioridade, etc.); (3) botão 'Nova Disciplina' que abre um modal de cadastro (Curso + Turma + todos os campos) e grava a nova linha no banco relacional."

## Verificação de premissa (antes de qualquer requisito)

Confirmado por leitura direta de `app/(app)/disciplinas/page.tsx`, `lib/acoes/instrutores.ts`, `lib/dominio/motor-preditivo.ts`, `lib/acoes/crud.ts` e do cabeçalho real de `disciplinas`/`turma_disciplina` no banco de trabalho, antes de escrever este documento:

1. **Ordenação por antiguidade — gap real, mas o array proposto no pedido está errado.** `instrutoresElegiveis_` (`app/(app)/disciplinas/page.tsx`) hoje filtra/dedupe os habilitados sem nenhuma ordenação — a lista de checkboxes sai na ordem crua de `instrutor_disciplina` (ordem de linha do banco), não por antiguidade. Gap confirmado. **Mas** o array de precedência pedido no texto original (`Almirante, CMG, CF, CC, CT, 1º Ten, 2º Ten, SO, 1º SG, 2º SG, 3º SG, CB, MN`) não bate com o dado real: `Posto_Graduacao` nunca grava a palavra "Almirante" (os códigos reais são `AE`/`VA`/`CA`), e os 11 códigos que realmente existem em `instrutores` (confirmado por leitura direta: `2ºSG, 1ºSG, 3ºSG, 1ºTen, SO, CC, CT, SC, CF, 2ºTen, CMG`) não incluem `CB` nem `MN` — o projeto já tem uma escala de precedência única, revisada 3 vezes nesta sessão contra dado real (`RN-ANT-02`, `ESCALA_ANTIGUIDADE_POSTO`/`ORDEM_ANTIGUIDADE_POSTO`, `lib/acoes/instrutores.ts`/`app/(app)/instrutores/page.tsx`). Implementar um array novo e divergente, como o texto original pede literalmente, reintroduziria exatamente o tipo de "2 lógicas de formatação/ordenação diferentes" que a spec anterior (035) acabou de eliminar para nome de instrutor.
2. **Edição completa — gap real, com uma pegadinha em "Prioridade".** O painel de edição hoje (pós-spec 035) só expõe Início/Término/Instrutores — `Código`/`Nome`/`Carga Horária`/`Modo de Atribuição` realmente não são editáveis ali (só via a célula inline da tabela, que cobre Carga Horária e, para alguns perfis, Prioridade). **Achado real**: "Prioridade" não é uma coluna de `disciplinas` — é gravada em `config_parametros` (chave `PRIORIDADE_DISCIPLINA_{ID_Grade}`, `lib/dominio/motor-preditivo.ts`) e **nunca é lida de volta para a tela hoje** (`lerPesosPrioridadeDisciplina_` é uma função interna, sem nenhuma função pública que a exponha ao frontend) — o campo de prioridade da tabela sempre abre em branco, mesmo quando já tem um peso salvo. Um modal de "edição completa" que não carrega o valor atual não é edição de verdade.
3. **Cadastro de nova disciplina — gap real, com 3 achados estruturais que mudam a implementação:**
   - `ID_Grade` (PK de `disciplinas`) não segue o padrão `PREFIXO-NNNNNN` do resto do sistema — é uma string composta `"{ID_Disciplina} - {ID_Curso} - {Cod_Disciplina}"` (`ID_Disciplina` sequencial único em toda a aba, confirmado nos dados reais: 1 a 175). Uma disciplina nova precisa desse ID composto calculado explicitamente, não do gerador genérico (`gerarProximoId_`).
   - **Bug latente confirmado em `lib/acoes/crud.ts`**: `CRUD_CONFIG['turma_disciplina'].prefixo` está `''` (vazio), mas todas as 210+ linhas reais de `turma_disciplina` usam o padrão `TDI-NNNNNN` — só nunca foi notado porque toda linha existente foi semeada por script Python de migração, nunca por `crudCriar` do backend. Esta é a primeira vez que o motor genérico do backend vai criar uma linha de `turma_disciplina` — sem corrigir o prefixo, a linha nasce com `ID_turma_disciplina` em branco.
   - A restrição de unicidade `ID_Curso`+`Cod_Disciplina` (documentada em `01-schema.md` como obrigatória "em toda gravação") nunca foi implementada em código nenhum — esta spec é o primeiro ponto de escrita real de `disciplinas` desde a migração original, então é aqui que ela precisa existir pela primeira vez.

**Decisão de escopo (`/speckit-clarify` embutido nesta especificação)**: o pedido original não deixava claro se a Turma no cadastro é obrigatória (cria disciplina já vinculada a uma turma específica) ou opcional (só grade do curso, sem turma). Bernardo escolheu **obrigatória** — Curso e Turma sempre exigidos, criando as 2 linhas relacionadas (`disciplinas` + `turma_disciplina`) na mesma operação, para a disciplina nascer imediatamente utilizável.

## Clarifications

### Session 2026-08-21

- Q: Quando o usuário edita o Código ou Nome de uma disciplina já vinculada a várias turmas, as linhas de `turma_disciplina` dessas turmas (que guardam sua própria cópia de Código/Nome) devem ser atualizadas junto, ou continuam com o valor antigo até alguém tocar naquela turma especificamente? → A: Propagar — editar Código/Nome no catálogo atualiza automaticamente todas as linhas de `turma_disciplina` daquele `ID_Grade`.
- Q: No cadastro de disciplina nova (2 gravações em sequência — catálogo, depois vínculo com a turma), se a 2ª gravação falhar depois da 1ª já ter tido sucesso, o que deve acontecer com a linha de catálogo já criada? → A: Desfazer automaticamente — a linha de `disciplinas` recém-criada é marcada `Inativa`/`Cancelada` (nunca deletada de fato, C-05) e o erro é informado; nenhuma disciplina "fantasma" sem turma fica visível.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instrutores ordenados por precedência militar (Priority: P1)

Ao abrir o painel de edição de uma disciplina/turma, a lista de checkboxes de instrutores habilitados aparece ordenada por antiguidade — os postos mais graduados no topo — nunca em ordem alfabética ou de cadastro.

**Why this priority**: item obrigatório do pedido, correção isolada e de baixo risco, sem dependência de nenhuma outra história.

**Independent Test**: abrir o painel de edição de uma disciplina/turma com pelo menos 2 instrutores habilitados de postos diferentes (ex.: um CMG e um CC) e conferir que o CMG aparece antes do CC na lista.

**Acceptance Scenarios**:

1. **Given** uma disciplina com instrutores habilitados de postos diferentes, **When** o painel de edição é aberto, **Then** a lista de checkboxes aparece ordenada do posto mais antigo para o mais recente, seguindo a mesma escala de precedência já usada no Módulo de Instrutores.
2. **Given** um instrutor habilitado com `Posto_Graduacao` fora da escala conhecida, **When** a lista é montada, **Then** esse instrutor aparece ao final da lista, sem quebrar a renderização dos demais.
3. **Given** dois instrutores do mesmo posto, **When** a lista é montada, **Then** a ordem relativa entre eles não precisa ser determinística por antiguidade (mesmo posto = mesma precedência) — qualquer ordem estável entre os dois é aceitável.

---

### User Story 2 - Edição completa da disciplina (Priority: P1)

Ao editar uma disciplina/turma, o painel de edição mostra e permite alterar todos os campos reais da disciplina (Código, Nome, Carga Horária, Prioridade, Modo de Atribuição), já preenchidos com os valores atuais — não só Início/Término/Instrutores como hoje.

**Why this priority**: item obrigatório do pedido; a estrutura expandida do modal é reaproveitada diretamente pela User Story 3 (cadastro).

**Independent Test**: abrir o painel de edição de uma disciplina existente com Prioridade já definida anteriormente e conferir que todos os campos aparecem preenchidos com os valores reais salvos, incluindo a Prioridade (hoje sempre em branco).

**Acceptance Scenarios**:

1. **Given** uma disciplina existente com Código/Nome/Carga Horária/Modo de Atribuição já preenchidos, **When** o painel de edição é aberto, **Then** todos esses campos aparecem pré-carregados com os valores reais, editáveis.
2. **Given** uma disciplina com um peso de Prioridade já salvo anteriormente, **When** o painel de edição é aberto, **Then** o campo de Prioridade mostra o valor real salvo, não um campo em branco (correção do gap descrito na Verificação de Premissa).
3. **Given** o usuário altera Nome/Carga Horária/Prioridade/Modo de Atribuição e salva, **When** a gravação é concluída, **Then** os novos valores aparecem refletidos na tabela sem precisar recarregar a página manualmente.
4. **Given** o usuário altera o Código de uma disciplina para um valor já usado por outra disciplina do mesmo curso, **When** tenta salvar, **Then** o sistema bloqueia com uma mensagem clara, antes ou depois da chamada ao backend, mas sempre sem gravar a duplicata.
5. **Given** uma disciplina já vinculada a 3 turmas diferentes (3 linhas em `turma_disciplina` com sua própria cópia de Código/Nome), **When** o usuário altera o Código ou o Nome dessa disciplina no catálogo e salva, **Then** as 3 linhas de `turma_disciplina` daquele `ID_Grade` são atualizadas com o novo Código/Nome, sem exigir que o usuário edite cada turma manualmente (decisão do `/speckit-clarify`).

---

### User Story 3 - Cadastro de nova disciplina (Priority: P2)

Um botão "Nova Disciplina", visível no topo do módulo, abre um formulário (reaproveitando a estrutura da User Story 2) para cadastrar uma disciplina nova, vinculada a um Curso e a uma Turma específicos.

**Why this priority**: depende da estrutura de campos da User Story 2 já existir; entrega funcionalidade nova, não uma correção de gap existente.

**Independent Test**: clicar em "Nova Disciplina", preencher Curso, Turma e os campos da disciplina, salvar, e conferir que a disciplina aparece imediatamente na Visão 2 da turma escolhida com todos os dados corretos.

**Acceptance Scenarios**:

1. **Given** o usuário está em qualquer ponto do módulo de Disciplinas, **When** clica em "Nova Disciplina", **Then** um formulário de cadastro abre com todos os campos vazios, incluindo seletores de Curso e Turma.
2. **Given** o formulário de cadastro está aberto, **When** o usuário seleciona um Curso, **Then** o seletor de Turma passa a listar só as turmas daquele curso (mesma cascata já usada no resto do módulo).
3. **Given** o usuário preenche Curso, Turma e os campos obrigatórios da disciplina e salva, **When** a gravação é concluída, **Then** a disciplina aparece na Visão 2 da turma escolhida, com Código/Nome/Carga Horária corretos e pronta para receber Início/Término/Instrutor.
4. **Given** o usuário tenta salvar sem selecionar Turma, **When** tenta salvar, **Then** o sistema bloqueia antes de qualquer chamada ao backend, com mensagem indicando que Turma é obrigatória (decisão do `/speckit-clarify`).
5. **Given** o usuário tenta cadastrar um Código já usado por outra disciplina do mesmo Curso, **When** tenta salvar, **Then** o sistema bloqueia com mensagem clara, sem criar nenhuma linha (nem em `disciplinas` nem em `turma_disciplina`).
6. **Given** o registro de catálogo foi criado com sucesso mas o registro de vínculo com a turma falha em seguida, **When** o erro acontece, **Then** o sistema desfaz automaticamente o registro de catálogo recém-criado (exclusão lógica) e mostra uma mensagem de erro clara — nenhuma disciplina "fantasma" sem turma fica visível (decisão do `/speckit-clarify`).

---

### Edge Cases

- Instrutor habilitado com `Posto_Graduacao` vazio ou fora da escala conhecida (Edge Case da User Story 1) → cai ao final da lista, nunca lança erro (RN-DEG-01).
- Cadastro de disciplina com Código duplicado no mesmo Curso → bloqueado, nenhuma linha criada em nenhuma das 2 tabelas (nem `disciplinas` órfã, nem `turma_disciplina` apontando para um `ID_Grade` nunca criado).
- Cadastro de disciplina bem-sucedido, mas sem nenhum instrutor ainda habilitado (`instrutor_disciplina`) para o `ID_Grade` novo → painel de edição dessa disciplina mostra a lista de instrutores vazia, mesma mensagem já existente ("Nenhum instrutor habilitado"), não é tratado como erro.
- Usuário edita Prioridade para um valor fora de 1–10 → bloqueado antes de salvar (validação já existente em `definirPrioridadeDisciplina`, reaproveitada).
- Usuário abre "Nova Disciplina" a partir do estado inicial (nenhum Curso pré-selecionado) → formulário abre com Curso vazio, mesma cascata da User Story 3, Acceptance Scenario 2.
- Disciplina editada (Código/Nome) sem nenhuma linha de `turma_disciplina` vinculada ainda → propagação (FR-006.1) não tem nenhuma linha para atualizar, não é tratado como erro.
- Disciplina editada (Código/Nome) vinculada a uma turma cujo período já passou (turma `Concluida`) → a linha de `turma_disciplina` dessa turma também é atualizada; a correção de Código/Nome é sobre a identidade da disciplina, não sobre se a turma ainda está em andamento.
- Falha de rede/permissão logo após o catálogo ser criado, antes do vínculo de turma ser gravado → catálogo é desfeito automaticamente (exclusão lógica), usuário vê o erro e pode tentar cadastrar de novo do zero, sem duplicata nem linha órfã (FR-013).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A lista de checkboxes de instrutores habilitados no painel de edição MUST ser ordenada por precedência militar (mais antigo primeiro) antes de renderizar.
- **FR-002**: A ordenação MUST usar a mesma escala de precedência já estabelecida e auditada contra dado real no Módulo de Instrutores — nenhuma escala de precedência divergente ou duplicada pode ser introduzida.
- **FR-003**: Instrutor com posto fora da escala conhecida MUST cair ao final da lista, sem interromper a renderização dos demais.
- **FR-004**: O painel de edição de disciplina MUST expor, além de Início/Término/Instrutores (já existentes), os campos Código, Nome, Carga Horária, Prioridade e Modo de Atribuição — todos editáveis.
- **FR-005**: Ao abrir o painel de edição, todo campo exposto pela FR-004 MUST vir pré-preenchido com o valor real atualmente salvo — incluindo Prioridade, que hoje nunca é lida de volta para a tela.
- **FR-006**: O sistema MUST rejeitar a gravação de um Código de disciplina que já exista em outra disciplina do mesmo Curso, tanto na edição quanto no cadastro, sem criar nenhum registro parcial.
- **FR-006.1**: Ao salvar uma mudança de Código ou Nome no catálogo da disciplina, o sistema MUST propagar o novo valor para toda linha de `turma_disciplina` que referencia aquele `ID_Grade` — nenhuma turma já vinculada pode ficar mostrando um Código/Nome desatualizado depois da edição (decisão do `/speckit-clarify`).
- **FR-007**: O módulo de Disciplinas MUST exibir um botão "Nova Disciplina" visível independentemente do estado de seleção de Curso/Turma.
- **FR-008**: Ao clicar em "Nova Disciplina", o sistema MUST abrir um formulário reaproveitando a mesma estrutura de campos da FR-004, com todos os campos vazios, mais seletores de Curso e Turma.
- **FR-009**: O seletor de Turma do formulário de cadastro MUST ficar restrito às turmas do Curso selecionado (mesma cascata já usada no resto do módulo).
- **FR-010**: Curso e Turma MUST ser obrigatórios para cadastrar uma nova disciplina (decisão do `/speckit-clarify`) — o sistema MUST bloquear o salvamento sem os dois antes de qualquer chamada ao backend.
- **FR-011**: Ao cadastrar com sucesso, o sistema MUST criar tanto o registro de catálogo da disciplina (grade do curso) quanto o registro de vínculo com a turma escolhida, de forma que a disciplina apareça imediatamente pronta para uso na Visão 2 daquela turma.
- **FR-012**: Todo identificador gerado automaticamente pelo cadastro (chave da disciplina, chave do vínculo com a turma) MUST seguir a convenção de geração de identificador já usada pelo restante do sistema para a respectiva tabela — nenhum identificador MUST ficar em branco.
- **FR-013**: Se o registro de vínculo com a turma falhar depois que o registro de catálogo já tiver sido criado com sucesso, o sistema MUST desfazer automaticamente o registro de catálogo (exclusão lógica, nunca remoção física da linha) e informar o erro claramente — nenhuma disciplina sem vínculo de turma nenhum pode ficar visível como resultado de um cadastro malsucedido (decisão do `/speckit-clarify`).

### Key Entities *(data involved)*

- **disciplinas**: catálogo de disciplinas por curso (grade) — ganha, nesta spec, o primeiro caminho de escrita para criar uma linha nova (até aqui só editado via migração/seed) e o primeiro ponto de validação de unicidade de Código dentro do curso.
- **turma_disciplina**: vínculo de uma disciplina a uma turma específica — ganha, nesta spec, o primeiro caminho de escrita genérico do backend para criar uma linha nova (até aqui toda linha existente veio de script de migração), e passa a ter seu Código/Nome propagados automaticamente sempre que a disciplina correspondente é editada no catálogo (FR-006.1, decisão do `/speckit-clarify`).
- **config_parametros**: já armazena o peso de Prioridade por disciplina (`PRIORIDADE_DISCIPLINA_{ID_Grade}`); ganha, nesta spec, o primeiro caminho de leitura exposto ao frontend para esse valor.
- **instrutores**: fonte do `Posto_Graduacao` usado pela ordenação por precedência (FR-001/FR-002) — nenhuma mudança de schema, só leitura.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ao abrir o seletor de instrutores de qualquer disciplina com instrutores de postos diferentes, a ordem reflete precedência militar (mais antigo primeiro) em 100% dos casos verificados.
- **SC-002**: Editar uma disciplina existente permite alterar Código/Nome/Carga Horária/Prioridade/Modo de Atribuição em 100% dos casos, com os valores atuais corretos pré-carregados (incluindo Prioridade).
- **SC-003**: Uma disciplina cadastrada pelo botão "Nova Disciplina" aparece na Visão 2 da turma escolhida imediatamente após salvar, com 100% dos campos gravados corretamente, em 100% dos casos de teste.
- **SC-004**: Tentar cadastrar ou editar para um Código já usado no mesmo curso é bloqueado em 100% dos casos, sem nenhum registro parcial criado.
- **SC-005**: Depois de editar Código/Nome de uma disciplina vinculada a N turmas, as N linhas de `turma_disciplina` correspondentes mostram o valor novo, em 100% dos casos verificados.
- **SC-006**: Numa falha simulada entre a criação do catálogo e a criação do vínculo de turma, 0% dos casos de teste deixam uma disciplina de catálogo ativa sem nenhuma turma vinculada.

## Assumptions

- A ordenação por precedência militar reaproveita a escala já estabelecida (`ESCALA_ANTIGUIDADE_POSTO`/`ORDEM_ANTIGUIDADE_POSTO`, `lib/acoes/instrutores.ts`/`app/(app)/instrutores/page.tsx`) em vez do array literal do pedido original (que usa "Almirante" genérico e inclui `CB`/`MN`, nenhum dos quais corresponde ao formato real de `Posto_Graduacao` nem aos 11 códigos que de fato existem na base) — mesma duplicação já aceita no projeto para constantes de ordenação por view (Next.js não compartilha `.ts` entre arquivos `.html`).
- `Código` (`Cod_Disciplina`) fica editável na User Story 2, apesar de fazer parte do texto do identificador `ID_Grade` — a PK em si (`ID_Grade`) nunca muda depois de criada (Princípio IV/C-04), só o texto legível do Código; nenhum código do sistema reconstrói `ID_Grade` a partir de `Cod_Disciplina` em tempo de execução, então essa divergência cosmética entre o texto do ID e o Código atual é aceitável (mesmo padrão já tolerado para `ID_turma_disciplina`).
- O peso de Prioridade continua vivendo em `config_parametros` (decisão já tomada no Épico G, não revisitada aqui) — esta spec só adiciona a leitura que falta para pré-carregar o valor na tela, reaproveitando `definirPrioridadeDisciplina` já existente para a gravação.
- O formulário de cadastro/edição segue o mesmo padrão visual de blocos/campos já usado no Módulo de Instrutores (pedido explícito do usuário), mas a decisão de implementação exata (reaproveitar o mesmo motor de renderização ou replicar o padrão) fica para o `/speckit-plan`.
- O desfazimento automático do catálogo (FR-013) reaproveita o mesmo mecanismo de exclusão lógica já usado em todo o sistema (equivalente a `crudExcluir` — grava `Status` inativo/cancelado, nunca remove a linha, C-05) — nunca uma remoção física, mesmo tratando-se de uma linha recém-criada na mesma operação.
