# Feature Specification: Seleção de Instrutor por Turma e Validação de Janela em `turma_disciplina`

**Feature Branch**: `029-turma-disciplina-instrutor`

**Created**: 2026-08-20

**Status**: Draft

**Input**: User description: "NOVO ÉPICO: Refatoração Relacional do Banco de Dados (Cursos, Turmas e
Disciplinas)" — pedido original amplo (renomear/fundir `cursos`/`turmas`/`disciplinas` num modelo Curso→Turma→Disciplina Alocada). Verificação de premissa (antes de
escrever qualquer requisito) mostrou que quase tudo já existe sob outros nomes, e que a peça que
faltava de verdade — confirmada em conversa direta com o responsável — é mais estreita: a seleção
efetiva de instrutor por disciplina hoje vive no nível do curso/grade (`disciplinas.
ID_Instrutor`), compartilhada por todas as turmas do mesmo curso, quando deveria ser por turma
específica — o mesmo tipo de problema que `turma_disciplina` (spec 027) já resolveu para o período,
mas nunca resolveu para o instrutor. Decisão do responsável (2026-08-20): estender `turma_disciplina` com a seleção de instrutor por turma, em vez de criar tabela nova; incluir também a
validação de que o período da disciplina não pode ficar fora da janela da turma."

## Achados reais (verificação de premissa antes de escrever qualquer requisito)

- **`cursos` não tem nenhuma coluna de data** — a premissa do pedido original ("remova colunas
  de data desta tabela") não tem o que remover. Colunas reais: `ID_Curso, Nome_Curso, Classificacao,
  Limite_Turmas_Ano, Duracao_Semanas, Duracao_Dias, Modalidade, Proposito, Status, Prioridade_
  Alocacao` + 7 colunas de regime (fórmula, resolvidas de `curso_regime_historico`).
- **`turmas` já é, coluna por coluna, a "Tabela Turmas" pedida**: `ID_Turma`, `ID_Curso`
  (FK), `Turma`/`Nome_Completo_Curso` (≈ Identificador_Turma), `Data_Inicio`, `Data_Termino`
  (≈ Data_Fim), `Status`, `Alunos`, `Sala_Alocada`, `Ano_Letivo` (≈ ano vigente). Nada a criar aqui.
- **`disciplinas` já tem quase toda a lista pedida para "Alocação_Disciplinas"**: `Nome_
  Disciplina`, `ID_Instrutor` (CSV, ex. `"89, 173"`), `Carga_Horaria_Tempos`, `Ordem_Sugerida`,
  `Previsao_Inicio`/`Termino`, `CH_Semanal`, `Semanas`. A única lacuna real: é keyed por `ID_Curso`
  (nível de grade), não por `ID_Turma`.
- **`turma_disciplina` (spec 027, aplicada à banco de produção em 2026-08-20, 210 linhas) já é
  exatamente a tabela `ID_Turma`-keyed que o pedido original descrevia como algo a criar** —
  resolve o problema do período por turma. `docs/arquitetura/01-schema.md` já documenta esse tipo
  de normalização como fechado (DISC-2: "não é achado, é confirmação... a necessidade já está
  coberta pela arquitetura atual"), não aberto.
- **A lacuna real, confirmada em conversa direta com o responsável**: `instrutor_disciplina`
  (`ID_Vinculo, ID_Instrutor, ID_Grade, Status, Modo_Atribuicao`) representa **habilitação/
  qualificação** — quem *pode* ministrar aquela disciplina — e é keyed por `ID_Grade`, correto e
  intocado. `disciplinas.ID_Instrutor` é quem foi *efetivamente selecionado*, mas também é
  keyed por `ID_Grade` — compartilhado por todas as turmas do mesmo curso. Um curso com 2 turmas no
  mesmo ano (o mesmo caso real que motivou `turma_disciplina`) não consegue ter instrutores
  diferentes selecionados por turma hoje.
- **`Instrutores_Selecionados` como array/JSON embutido numa tabela nova substituiria a relação já
  estabelecida (`instrutor_disciplina`, 9 arquivos dependentes)** — rejeitado explicitamente pelo
  responsável; a solução adotada mantém `instrutor_disciplina` intocada (qualificação) e estende
  `turma_disciplina` (seleção efetiva por turma), preservando a convenção já usada por `disciplinas.ID_Instrutor` (texto CSV, não um array/JSON literal).
- **Nenhuma validação hoje impede `turma_disciplina.Previsao_Inicio`/`Previsao_Termino` de ficar
  fora da janela `Data_Inicio`/`Data_Termino` da turma correspondente** (`turmas`) — spec 027
  não incluiu essa checagem. Diferente de `RN-DEG-02` (alerta para regra normativa de verificação
  incerta): esta é uma checagem estrutural 100% verificável a partir de dados já no sistema (a
  janela da turma já existe, já é lida), mais parecida com validação de campo obrigatório
  (`validarCamposObrigatoriosInstrutor_`, spec 016) do que com uma regra de conformidade externa.

## Clarifications

### Session 2026-08-20

- Q: A reestruturação completa das 3-4 tabelas centrais (conforme pedido original) ou o gap real
  identificado (seleção de instrutor por turma, hoje presa ao nível de curso/grade)? → A: O gap
  real — estender `turma_disciplina`, sem tocar `cursos`/`turmas`/`disciplinas`/
  `instrutor_disciplina`.
- Q: A seleção de instrutor por turma deve virar uma tabela nova, ou uma coluna nova em `turma_disciplina`? → A: Coluna nova em `turma_disciplina` (não criar tabela nova).
- Q: Incluir também a validação de janela (período da disciplina dentro do período da turma) nesta
  mesma spec? → A: Sim.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Selecionar o instrutor responsável por cada disciplina, por turma (Priority: P1)

Como Divisão de Orientação Educacional e Pedagógica, quero escolher, para cada disciplina de uma
turma específica, qual(is) instrutor(es) habilitado(s) vai(vão) efetivamente ministrá-la naquela
turma — não mais um valor compartilhado por todas as turmas do mesmo curso —, no mesmo painel onde
já registro o período da disciplina (spec 027).

**Why this priority**: É o objetivo central desta spec — sem ele, cursos com 2 turmas no mesmo ano
continuam sem conseguir registrar instrutores diferentes por turma, mesmo já tendo resolvido o
mesmo problema para as datas.

**Independent Test**: Abrir "Período das Disciplinas" de uma turma, marcar um instrutor habilitado
para uma disciplina, salvar, reabrir o painel e confirmar que a seleção persistiu em `turma_disciplina.ID_Instrutor` daquela linha especificamente — nunca em `disciplinas.ID_Instrutor`
(que continua intocada, nível de grade).

**Acceptance Scenarios**:

1. **Given** o painel "Período das Disciplinas" de uma turma aberto, **When** o operador vê uma
   linha de disciplina, **Then** aparece, ao lado dos campos de data já existentes, uma lista de
   checkboxes com os instrutores **habilitados** para aquela disciplina (`instrutor_disciplina`,
   `Status='Ativo'`, mesmo `ID_Grade`), pré-marcados conforme o `ID_Instrutor` atual daquela linha
   de `turma_disciplina`.
2. **Given** uma disciplina sem nenhum instrutor habilitado, **When** o painel é renderizado,
   **Then** aparece uma mensagem informativa no lugar da lista de checkboxes, nunca erro.
3. **Given** o operador marca 1 ou mais instrutores e salva, **When** a gravação é confirmada,
   **Then** `turma_disciplina.ID_Instrutor` daquela linha específica é atualizado (texto separado
   por vírgula, mesma convenção de `disciplinas.ID_Instrutor`) — as demais turmas do mesmo
   curso, e `disciplinas.ID_Instrutor` da grade, permanecem inalteradas.
4. **Given** um curso com 2 turmas no mesmo ano, **When** o operador seleciona instrutores
   diferentes para a mesma disciplina em cada turma, **Then** ambas as seleções persistem
   corretamente, cada uma na sua própria linha de `turma_disciplina`.

---

### User Story 2 - Bloquear período de disciplina fora da janela da turma (Priority: P1)

Como Divisão de Orientação Educacional e Pedagógica, quero que o sistema me impeça de salvar um
período de disciplina que comece antes ou termine depois do período real da turma, para não deixar
dado estruturalmente inconsistente na base (uma disciplina não pode acontecer fora da janela de
execução da própria turma).

**Why this priority**: Mesma prioridade da User Story 1 — as duas mexem na mesma ação de salvar do
mesmo painel; sem esta validação, o painel estendido por US1 continuaria aceitando datas
estruturalmente impossíveis.

**Independent Test**: No painel "Período das Disciplinas", tentar salvar uma data de início/término
fora da janela `Data_Inicio`/`Data_Termino` da turma — confirmar bloqueio com mensagem citando os
limites reais da turma, e que nada foi gravado.

**Acceptance Scenarios**:

1. **Given** uma turma com `Data_Inicio`/`Data_Termino` preenchidos, **When** o operador tenta
   salvar `Previsao_Inicio` ou `Previsao_Termino` de uma disciplina fora dessa janela, **Then** a
   gravação é bloqueada, com mensagem citando os limites reais da turma (não uma mensagem genérica).
2. **Given** a mesma situação, **When** o operador corrige a data para dentro da janela e salva de
   novo, **Then** a gravação é aceita normalmente.
3. **Given** uma turma sem `Data_Inicio`/`Data_Termino` preenchidos (caso raro, mas possível),
   **When** o operador salva qualquer período de disciplina, **Then** a gravação é aceita sem
   bloqueio — impossível validar contra uma janela ausente (RN-DEG-01).

---

### Edge Cases

- Disciplina sem nenhum instrutor habilitado (`instrutor_disciplina` vazio para aquele `ID_Grade`):
  mensagem informativa, nunca erro (Acceptance Scenario 2, US1).
- Múltiplos instrutores selecionados para a mesma disciplina/turma: todos ficam na mesma célula
  (CSV), mesma convenção já usada por `disciplinas.ID_Instrutor`.
- Turma sem janela definida: validação degrada para permitir a gravação (Acceptance Scenario 3,
  US2) — nunca trava a tela por dado ausente em outra aba.
- Instrutor selecionado que depois perde a habilitação (`instrutor_disciplina.Status` muda para
  `Inativo`): esta spec não reage retroativamente a essa mudança — fora de escopo, dado histórico
  permanece como estava até o operador corrigir manualmente.
- Migração aplicada a uma linha de `turma_disciplina` cujo `disciplinas.ID_Instrutor`
  correspondente está vazio: `turma_disciplina.ID_Instrutor` nasce vazio também — não é erro, é o
  reflexo fiel do estado atual da grade.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `turma_disciplina` MUST ganhar uma nova coluna `ID_Instrutor` — texto separado por
  vírgula (mesma convenção de `disciplinas.ID_Instrutor`), representando o(s) instrutor(es)
  efetivamente selecionado(s) para ministrar aquela disciplina **naquela turma específica** —
  aditivo, com backup prévio e registro em `migracao_log` (Princípio IV), sem apagar nenhuma
  coluna/linha existente.
- **FR-002**: A migração que cria a coluna MUST semear `turma_disciplina.ID_Instrutor` de cada
  linha com o valor atual de `disciplinas.ID_Instrutor` da grade correspondente (`ID_Grade`) —
  ponto de partida editável, mesmo padrão de "semente da grade" já usado por `Previsao_Inicio`/
  `Termino` (LIQ-1, spec 027) — nunca a fonte de verdade definitiva a partir de então.
- **FR-003**: O painel "Período das Disciplinas" (`app/(app)/cursos/[curso]/page.tsx`, spec 027) MUST ganhar, por
  linha de disciplina, uma lista de checkboxes com os instrutores **habilitados** para aquela
  disciplina (`instrutor_disciplina`, `Status='Ativo'`, mesmo `ID_Grade`), pré-marcada conforme o
  `ID_Instrutor` atual da linha de `turma_disciplina`.
- **FR-004**: O sistema MUST oferecer uma função de backend dedicada (não o `crudAtualizar`
  totalmente genérico) que valida e grava, numa única operação, o período e o instrutor
  selecionado de uma linha de `turma_disciplina`.
- **FR-005**: Antes de gravar, o sistema MUST bloquear a gravação quando `Previsao_Inicio` ou
  `Previsao_Termino` ficarem fora da janela `Data_Inicio`–`Data_Termino` da turma correspondente
  (`turmas`), com mensagem citando os limites reais da turma. Esta é uma checagem
  estrutural 100% verificável a partir de dados já no sistema — não uma regra normativa de
  verificação incerta (RN-DEG-02) —, por isso o bloqueio direto é apropriado, mesmo padrão de
  validação de campo obrigatório já usado por `validarCamposObrigatoriosInstrutor_` (spec 016).
- **FR-006**: Se a turma correspondente não tiver `Data_Inicio`/`Data_Termino` preenchidos, a
  validação de FR-005 MUST degradar para permitir a gravação sem bloqueio (RN-DEG-01) — nunca
  travar a tela por dado ausente em outra aba.
- **FR-007**: A seleção de instrutor por turma MUST permanecer distinta e independente da
  qualificação — `instrutor_disciplina` MUST NUNCA ser alterada, removida ou substituída por esta
  spec; continua representando exclusivamente "quem pode" ministrar a disciplina.
- **FR-008**: Esta spec MUST NUNCA alterar o que a LIQ (spec 027) ou a O.S. de Instrutoria (spec
  028) leem hoje para "instrutor(es)" — ambas continuam usando `instrutor_disciplina` como fonte,
  sem nenhuma mudança nesta entrega (Princípio IX — decisão de consumir o novo campo, se desejada,
  fica para uma spec futura).
- **FR-009**: Disciplina sem nenhum instrutor habilitado MUST mostrar mensagem informativa no
  lugar da lista de checkboxes, nunca erro (RN-DEG-01).
- **FR-010**: Esta spec MUST NUNCA alterar `cursos`, `turmas`, `disciplinas` ou
  `instrutor_disciplina` — escopo estritamente limitado à coluna nova em `turma_disciplina` e à
  validação de janela (achado real: praticamente tudo que o pedido original descrevia para essas 4
  tabelas já existe sob outros nomes).

### Key Entities

- **`turma_disciplina`** (já existente, spec 027) — ganha a coluna `ID_Instrutor` (texto CSV,
  seleção efetiva de instrutor por turma+disciplina). Nenhuma outra coluna muda.
- **`instrutor_disciplina`** (já existente, intocada) — continua representando habilitação/
  qualificação (quem pode), nunca seleção efetiva.
- **`disciplinas.ID_Instrutor`** (já existente, intocada) — continua sendo a semente/padrão de
  grade para a seleção de instrutor, mesmo papel que `Previsao_Inicio`/`Termino` já tinham antes de
  `turma_disciplina` existir.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Toda linha existente de `turma_disciplina` (210, confirmadas na banco de produção)
  tem `ID_Instrutor` preenchido com o valor herdado da grade correspondente, imediatamente após a
  migração.
- **SC-002**: Tentar salvar um período de disciplina fora da janela real da turma é bloqueado
  100% das vezes, com mensagem citando os limites reais daquela turma.
- **SC-003**: A interface nunca permite selecionar um instrutor que não está habilitado para
  aquela disciplina — a lista de opções contém exclusivamente instrutores habilitados.
- **SC-004**: Um curso com 2 turmas no mesmo ano consegue ter instrutores diferentes selecionados
  para a mesma disciplina em cada turma, confirmado com dado real (`C-ApA-AuxNav-PR-SP` T1/T2,
  mesmo caso que já validou `turma_disciplina` na spec 027).
- **SC-005**: 0% de regressão na suíte de testes (`pnpm vitest run`).

## Assumptions

- Nome da coluna nova: `ID_Instrutor` — mesma convenção de `disciplinas.ID_Instrutor` (texto
  CSV, não array/JSON literal), por consistência com o padrão já estabelecido no schema.
- Múltiplos instrutores por turma+disciplina permitidos, mesma convenção já existente em `disciplinas.ID_Instrutor`.
- LIQ (spec 027) e O.S. de Instrutoria (spec 028) não são atualizadas nesta spec para consumir o
  campo novo — decisão explícita de não reabrir specs já fechadas e implantadas; ambas continuam
  lendo `instrutor_disciplina` como hoje.
- A validação de janela (FR-005) é bloqueio direto, não um alerta no padrão RN-DEG-02 — por ser
  checagem estrutural 100% verificável a partir de dados já no sistema, não uma regra normativa de
  verificação incerta.
- O painel "Período das Disciplinas" (`app/(app)/cursos/[curso]/page.tsx`) é estendido, não substituído — mesmo local
  de tela, mesma ação de salvar, agora cobrindo 2 campos em vez de 1.
