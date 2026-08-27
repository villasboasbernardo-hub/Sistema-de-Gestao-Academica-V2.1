# Feature Specification: Épico F — RBAC Ampliado e Gestão de Usuários

**Feature Branch**: `004-rbac-ampliado-usuarios`

**Created**: 2026-08-14

**Status**: Draft

**Input**: User description: "Épico F do documento 06 — RBAC Ampliado e Gestão de Usuários"

**Fontes primárias**: `docs/fase-1/06-Backlog-de-Epicos-V2.md` (Épico F), `docs/fase-1/01-Stakeholders-e-Perfis-de-Usuario.md` (§2 — matriz de 9 perfis, autoritativa), `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md` (RN-RBAC-01, RN-RBAC-02 revisada), `docs/fase-1/02-Requisitos-Funcionais.md` (RF-AUTH-01 a 05), `docs/fase-1/08-Relatorio-de-Triagem-de-Comentarios.md` (decisões D1, D2, D6), `docs/arquitetura/01-schema.md` (§5.7 `usuarios`/`usuario_curso`).

## Clarifications

### Session 2026-08-14

- Q: Quando um Operador tem `Escopo_Curso` diferente de `Geral`, contra qual campo do curso o
  sistema deve comparar esse escopo para decidir o que ele vê/edita? → A: Opção A —
  `Regular`/`Expedito`/`Estagio_Qualificacao` comparam contra `cursos.Classificacao`;
  `EAD_Semipresencial` compara contra `turmas.Modalidade` (campos diferentes conforme o
  valor do escopo, `docs/fase-1/07-Glossario.md`). Cursos com `Classificacao = Especial` ou
  `Aperfeiçoamento Avançado` só ficam visíveis/editáveis para Operador com `Escopo_Curso = Geral`
  — nenhum valor de escopo dedicado a eles nesta versão.

## Nota de escopo e dependência do Épico C

O Épico C já entregou a **camada de dado**: `usuarios` ganhou `Perfil` (domínio dos 9 perfis do
documento 01, substituindo o `Funcao` de 3 valores da V1.0), `Escopo_Curso`
(`Geral`/`Regular`/`Expedito`/`Estagio_Qualificacao`/`EAD_Semipresencial`), `Status` e
`Ultimo_Acesso`; a aba nova `usuario_curso` modela o vínculo N:N entre Encarregado de Curso e
o(s) curso(s) sob sua responsabilidade. Este épico entrega a **camada de aplicação** sobre esse
dado: hoje, todo o código V2.0 (herdado dos Épicos E/I) só reconhece dois perfis (`Admin`,
`Operador`) — qualquer outro perfil cadastrado é bloqueado até de carregar o contexto inicial do
sistema, mesmo quando o documento 01 já autoriza esse perfil a pelo menos ler.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cada perfil vê e edita exatamente o que a matriz do documento 01 autoriza (Priority: P1) 🎯 MVP

Como usuário de qualquer um dos 9 perfis definidos no documento 01, quero acessar o sistema e ver
exatamente as telas, dados e ações que meu perfil autoriza — nem mais, nem menos —, em vez de ficar
bloqueado (perfis diferentes de Admin/Operador hoje nem carregam o sistema) ou ver um botão de uma
ação que não posso executar.

**Why this priority**: é o problema central do épico — sem isso, 7 dos 9 perfis do documento 01
(todos exceto Admin/Operador) estão efetivamente fora do sistema, mesmo já cadastrados na
planilha.

**Independent Test**: cadastrar um usuário de cada um dos 9 perfis e, para cada um, confirmar que
consegue logar, que só vê os botões de ação que seu perfil autoriza (RF-AUTH-04), e que uma
tentativa de chamar uma função de escrita fora do seu perfil é bloqueada pelo servidor mesmo que a
interface não mostre o botão correspondente.

**Acceptance Scenarios**:

1. **Given** um usuário com perfil `Visualização`, **When** ele acessa qualquer tela do sistema,
   **Then** vê todos os dados (leitura total) e nenhum botão de cadastro/edição/exclusão em
   nenhuma tela.
2. **Given** um usuário com perfil `Chefe do Departamento de Ensino`, **When** ele acessa o
   sistema, **Then** vê indicadores consolidados de todos os cursos, sem nenhuma permissão de
   escrita.
3. **Given** um usuário com perfil `Encarregado de Curso` vinculado a um curso específico (via
   `usuario_curso`), **When** ele acessa o sistema, **Then** só vê dados desse curso, nunca de
   outro, e nenhum botão de escrita em nenhuma tela.
4. **Given** um usuário com perfil `Encarregado da Divisão de Administração Acadêmica` ou
   `Ajudante` da mesma divisão, **When** ele acessa o sistema, **Then** tem a mesma permissão de
   escrita (cursos, turmas, disciplinas, instrutores, vínculo de habilitação, regime/horário,
   planejamento anual) — a diferença entre os dois é hierárquica, não de acesso.
5. **Given** um usuário com perfil `Encarregado` ou `Ajudante` da Divisão de Orientação
   Educacional e Pedagógica, **When** ele tenta editar uma disciplina ou uma avaliação planejada,
   **Then** a ação é aceita; **When** ele tenta editar qualquer outra área de dado (ex.: cadastro
   de instrutor), **Then** a ação é bloqueada pelo servidor.
6. **Given** um usuário com perfil `Operador` e `Escopo_Curso = Expedito`, **When** ele acessa
   dados de leitura/escrita, **Then** só vê/edita turmas de cursos com `Classificacao = Expedito`
   — nunca de outra classificação. **Given** o mesmo Operador com `Escopo_Curso =
   EAD_Semipresencial`, **When** ele acessa dados, **Then** só vê/edita turmas com
   `Modalidade = EAD` ou `Semipresencial` — comparação por um campo diferente do caso anterior
   (Clarifications 2026-08-14).
7. **Given** qualquer chamada de função de escrita, **When** o perfil do usuário autenticado não
   está na lista autorizada daquela área de dado, **Then** o servidor bloqueia a ação com uma
   mensagem de acesso negado, independentemente do que a interface exibia (RN-RBAC-02).

---

### User Story 2 - Admin gerencia usuários numa tela dedicada, sem editar o banco (Priority: P1)

Como Admin, quero uma tela dedicada para cadastrar, editar o perfil/escopo e desativar usuários,
para nunca precisar abrir a tabela `usuarios` diretamente no banco.

**Why this priority**: é a única forma prática de operar os 9 perfis da User Story 1 em escala —
sem uma tela, cada cadastro de usuário volta a exigir edição manual de planilha, o problema
original que o épico existe para resolver (RF-AUTH-05).

**Independent Test**: como Admin, cadastrar um novo usuário informando e-mail e perfil, confirmar
que ele consegue logar em seguida; editar o perfil de um usuário existente e confirmar que a nova
permissão passa a valer imediatamente; desativar um usuário e confirmar que ele passa a receber a
tela de acesso negado no próximo acesso.

**Acceptance Scenarios**:

1. **Given** a tela de gestão de usuários, **When** o Admin cadastra um novo e-mail com um perfil
   válido, **Then** esse e-mail passa a autenticar com sucesso no próximo acesso, com a permissão
   do perfil atribuído.
2. **Given** um usuário já cadastrado, **When** o Admin edita seu perfil ou escopo de curso,
   **Then** a mudança vale a partir do próximo carregamento do sistema por esse usuário, sem
   exigir nenhuma ação dele.
3. **Given** um usuário ativo, **When** o Admin o desativa (exclusão lógica), **Then** ele recebe
   a tela de acesso negado no próximo acesso, e o registro continua existindo no banco (C-05).
4. **Given** um e-mail que já existe cadastrado, **When** o Admin tenta cadastrá-lo de novo,
   **Then** o sistema rejeita com uma mensagem clara, em vez de criar um segundo registro para o
   mesmo e-mail.

---

### User Story 3 - Operador e Divisão de Administração Acadêmica cadastram instrutor e habilitação (Priority: P2)

Como Operador ou Encarregado/Ajudante da Divisão de Administração Acadêmica, quero cadastrar,
editar e desativar instrutores e criar o vínculo de habilitação instrutor↔disciplina, permissão
que hoje só é praticável editando o banco diretamente, sem controle de acesso nenhum.

**Why this priority**: amplia uma permissão que RN-RBAC-02 já determina que não é mais exclusiva
de Admin — mas depende da User Story 1 (matriz de perfis) já existir para ter contra o que validar.

**Independent Test**: como Operador, cadastrar um instrutor, editá-lo, desativá-lo (exclusão
lógica) e criar seu vínculo de habilitação com uma disciplina, tudo sem precisar de um Admin;
confirmar que um perfil sem essa permissão (ex.: `Visualização`) é bloqueado ao tentar a mesma
ação.

**Acceptance Scenarios**:

1. **Given** um Operador autenticado, **When** ele cadastra um novo instrutor, **Then** o
   registro é criado normalmente, sem exigir perfil Admin.
2. **Given** um instrutor já cadastrado, **When** um Encarregado/Ajudante da Divisão de
   Administração Acadêmica cria o vínculo de habilitação dele com uma disciplina, **Then** o
   vínculo é criado e passa a valer imediatamente para RN-INST-01 (validação de habilitação).
3. **Given** um instrutor ativo, **When** um Operador o desativa, **Then** a desativação é lógica
   (`Status`), nunca remoção física, e o instrutor deixa de aparecer nas listas de seleção de
   novos lançamentos.
4. **Given** um usuário com perfil `Visualização` ou `Encarregado de Curso`, **When** ele tenta
   cadastrar um instrutor ou criar um vínculo de habilitação, **Then** o servidor bloqueia a
   ação.

---

### User Story 4 - Divisão de Orientação Pedagógica edita disciplinas e avaliações planejadas (Priority: P2)

Como Encarregado ou Ajudante da Divisão de Orientação Educacional e Pedagógica, quero editar
disciplinas e o catálogo de avaliações planejadas, sem depender de Admin, porque esse é o dado
sob minha responsabilidade regimental (documento 01 §1.1 e §2.2).

**Why this priority**: mesma prioridade de risco/volume da User Story 3 — corrige uma trava
indevida sem bloquear nenhuma operação hoje se ficar para o final; depende da User Story 1 (matriz
de perfis) já existir.

**Independent Test**: como Encarregado da Divisão de Orientação Educacional e Pedagógica, editar
uma disciplina e um item do catálogo de avaliações planejadas; confirmar que um Operador consegue
editar a disciplina (permissão compartilhada com a Divisão de Administração Acadêmica) mas **não**
o catálogo de avaliações planejadas (exclusivo desta divisão); confirmar que `Visualização` é
bloqueada em ambas.

**Acceptance Scenarios**:

1. **Given** um Encarregado/Ajudante da Divisão de Orientação Educacional e Pedagógica, **When**
   ele edita uma disciplina, **Then** a alteração é aceita sem exigir perfil Admin.
2. **Given** o mesmo usuário, **When** ele edita um item do catálogo de avaliações planejadas,
   **Then** a alteração é aceita.
3. **Given** um Operador, **When** ele tenta editar um item do catálogo de avaliações planejadas
   (não uma disciplina), **Then** o servidor bloqueia — essa área é exclusiva da Divisão de
   Orientação Educacional e Pedagógica, diferente de disciplinas (compartilhada com a Divisão de
   Administração Acadêmica, FR-011).
4. **Given** um usuário com perfil `Visualização`, **When** ele tenta editar uma disciplina ou uma
   avaliação planejada, **Then** o servidor bloqueia ambas as ações.

---

### Edge Cases

- Usuário cadastrado no banco mas com `Status` inativo: recebe a mesma tela de acesso negado de
  um e-mail não cadastrado (FR-006) — não há distinção visível entre "não existe" e "inativo",
  para não vazar informação sobre quem já foi cadastrado.
- Usuário com `Perfil` vazio ou fora do domínio dos 9 valores válidos (dado legado ou erro de
  cadastro): degrada para acesso negado, nunca gera exceção não tratada (RN-DEG-01).
- `Encarregado de Curso` sem nenhum vínculo ativo em `usuario_curso`: a tela abre vazia, sem erro
  (RN-DEG-01) — não é tratado como acesso negado, porque o perfil em si é válido.
- `Operador` com `Escopo_Curso` vazio: tratado como equivalente a `Geral` (sem restrição adicional
  por tipo de curso), para não bloquear silenciosamente um Operador já cadastrado antes deste
  épico existir.
- Curso com `cursos.Classificacao = Especial` ou `Aperfeiçoamento Avançado`: nenhum valor de
  `Escopo_Curso` cobre essas duas classificações (Clarifications 2026-08-14) — só aparecem para
  Operador com `Escopo_Curso = Geral`; um Operador escopado a qualquer outro valor nunca os vê,
  mesmo sem ter sido essa a intenção original do cadastro dele.
- Tentativa de cadastrar um e-mail já existente na tela de gestão de usuários: rejeitada com
  mensagem clara, nunca cria um segundo registro para o mesmo e-mail (edge case da User Story 2).
- Admin desativa o próprio usuário: fora do escopo desta feature impedir isso — o sistema não
  precisa de uma trava especial para esse caso specific, mas registra a ação normalmente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE reconhecer os 9 perfis do documento 01 — Admin, Chefe do
  Departamento de Ensino, Encarregado da Divisão de Administração Acadêmica, Ajudante da
  Divisão de Administração Acadêmica, Encarregado da Divisão de Orientação Educacional e
  Pedagógica, Ajudante da Divisão de Orientação Educacional e Pedagógica, Operador, Encarregado
  de Curso e Visualização — cada usuário cadastrado associado a exatamente um perfil.
- **FR-002**: A permissão de escrita DEVE ser avaliada por área de dados, nunca globalmente por
  perfil — o mesmo perfil pode ter escrita autorizada numa área e bloqueada noutra (RN-RBAC-02).
- **FR-003**: A leitura DEVE seguir a matriz do documento 01 §2.2: total para Admin, Chefe do
  Departamento de Ensino, Encarregado/Ajudante de ambas as divisões e Visualização; restrita
  ao(s) curso(s) vinculados para Encarregado de Curso; restrita ao tipo de curso do
  `Escopo_Curso` para Operador quando esse escopo não é `Geral` — comparando
  `Regular`/`Expedito`/`Estagio_Qualificacao` contra `cursos.Classificacao`, e
  `EAD_Semipresencial` contra `turmas.Modalidade` (Clarifications 2026-08-14). Cursos com
  `Classificacao = Especial` ou `Aperfeiçoamento Avançado` só ficam visíveis/editáveis para
  Operador com `Escopo_Curso = Geral`.
- **FR-004**: Elementos de interface associados a uma ação restrita (cadastro, edição, exclusão,
  geração de planejamento) DEVEM ficar ocultos, nunca apenas desabilitados, para o perfil sem a
  permissão correspondente (RF-AUTH-04).
- **FR-005**: O Admin DEVE ter uma tela dedicada para cadastrar, editar perfil/escopo e desativar
  (exclusão lógica) usuários, sem precisar editar a tabela `usuarios` diretamente (RF-AUTH-05).
- **FR-006**: Um e-mail não cadastrado ou cadastrado com `Status` inativo DEVE receber uma tela de
  acesso negado orientando a solicitar cadastro ao Admin, sem distinguir entre as duas situações.
- **FR-007**: Operador e Encarregado/Ajudante da Divisão de Administração Acadêmica DEVEM poder
  cadastrar, editar e desativar (exclusão lógica) instrutores.
- **FR-008**: Operador e Encarregado/Ajudante da Divisão de Administração Acadêmica DEVEM poder
  criar o vínculo de habilitação instrutor↔disciplina (RN-RBAC-02) — permissão que hoje nenhum
  perfil tem em código.
- **FR-009**: Encarregado/Ajudante da Divisão de Orientação Educacional e Pedagógica DEVEM poder
  escrever em disciplinas e em avaliações planejadas/agendadas, sem permissão de escrita em
  nenhuma outra área de dado.
- **FR-010**: A geração e edição do planejamento anual DEVE passar a autorizar Admin e
  Encarregado/Ajudante da Divisão de Administração Acadêmica — deixa de ser exclusiva de Admin.
- **FR-011**: Encarregado/Ajudante da Divisão de Administração Acadêmica DEVEM ter a mesma
  permissão de escrita entre si (cursos, turmas, disciplinas, instrutores, vínculo de
  habilitação, regime/horário, planejamento anual) — a distinção entre os dois é hierárquica, não
  de acesso (documento 01 §2.3).
- **FR-012**: Toda função de escrita DEVE validar a permissão do perfil autenticado no servidor
  antes de gravar, independentemente do que a interface exibe (RN-RBAC-02, mesmo padrão já usado
  por `exigirFuncao`/`CRUD_CONFIG`).
- **FR-013**: A autenticação DEVE continuar baseada exclusivamente na conta  ativa do
  usuário (`supabase.auth.getUser()`), sem introduzir usuário/senha próprios do sistema — decisão
  D1 preservada, RF-AUTH-01.

### Key Entities

- **Perfil**: um dos 9 valores do documento 01 §2.2, atributo de `usuarios`. Determina a
  permissão de leitura/escrita por área de dado — nunca uma permissão binária única.
- **Escopo de Curso**: atributo de `Operador` (`Geral`/`Regular`/`Expedito`/
  `Estagio_Qualificacao`/`EAD_Semipresencial`) — restringe leitura/escrita às turmas
  correspondentes, quando diferente de `Geral`. Mistura duas dimensões fisicamente separadas
  (Clarifications 2026-08-14): `Regular`/`Expedito`/`Estagio_Qualificacao` são valores de
  `cursos.Classificacao`; `EAD_Semipresencial` é um valor de `turmas.Modalidade`.
- **Vínculo Usuário↔Curso**: relação N:N (`usuario_curso`) entre um `Encarregado de Curso` e o(s)
  curso(s) sob sua responsabilidade — define o escopo de leitura desse perfil.
- **Área de dado**: unidade de concessão de permissão de escrita (ex.: cadastro de instrutor,
  vínculo de habilitação, planejamento anual, disciplinas, avaliações) — cada uma tem sua própria
  lista de perfis autorizados, independente das demais (RN-RBAC-02).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário de qualquer um dos 9 perfis consegue logar e ver exatamente as
  telas/ações que o documento 01 autoriza para esse perfil, sem exceção.
- **SC-002**: Nenhuma tentativa de escrita fora da permissão do perfil autenticado é aceita pelo
  servidor, mesmo quando disparada diretamente (sem passar pela interface).
- **SC-003**: O Admin cadastra, edita e desativa um usuário inteiramente pela tela dedicada, sem
  precisar abrir o banco em nenhum momento.
- **SC-004**: Um Operador ou Encarregado/Ajudante da Divisão de Administração Acadêmica cadastra
  um instrutor e cria seu vínculo de habilitação sem depender de um Admin.
- **SC-005**: Um Encarregado de Curso nunca vê dado de um curso fora do seu vínculo; um Chefe do
  Departamento de Ensino vê todos os cursos.

## Assumptions

- A camada de dado (`usuarios.Perfil`/`Escopo_Curso`/`Status`, `usuario_curso`) já foi entregue
  pelo Épico C — esta feature entrega a camada de aplicação (verificação de perfil, telas),
  como os Épicos E/I fizeram para suas respectivas áreas.
- Nenhum CRUD de instrutor existe ainda em código V2.0 (`lib/acoes/`) — os Épicos anteriores só
  entregaram Aulas/Avaliações/Cronograma/DSA/Relatório. Este épico provavelmente precisa portar o
  cadastro de instrutor da V1.0 (`Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio)`), adaptado ao schema V2.0, não apenas
  destravar uma permissão sobre algo que já existe — a confirmar em detalhe no `/speckit-plan`.
- "Desativar" um usuário ou instrutor é sempre exclusão lógica (`Status`), nunca remoção física
  (C-05) — mesmo padrão já usado em `turmas`, `instrutores`, `instrutor_disciplina` e
  `avaliacoes` (Épico I).
- O e-mail cadastrado em `usuarios` continua sendo a única credencial de acesso — nenhuma senha,
  PIN ou segunda camada de autenticação é introduzida (decisão D1, documento 08).
- RBAC completo por área de dado (granularidade final de cada função de escrita) é entregue
  incrementalmente por este épico; áreas de dado que nenhum épico ainda implementou (ex.:
  Cronograma/DSA completos, motor preditivo) recebem sua whitelist de perfis quando esse épico
  específico (G/H) as implementar, não retroativamente por este.
