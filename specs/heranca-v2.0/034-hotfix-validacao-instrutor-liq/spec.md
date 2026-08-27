# Feature Specification: Hotfix — Validação da LIQ Passa a Reconhecer o Instrutor Realmente Selecionado por Turma

**Feature Branch**: `034-hotfix-validacao-instrutor-liq`

**Created**: 2026-08-21

**Status**: Draft

**Input**: User description: "HOTFIX CRÍTICO: Correção da Lógica da LIQ e Varredura de Referências
Órfãs no Banco de Dados. A funcionalidade geradora da LIQ acusa que os instrutores não estão
cadastrados, ignorando os cadastros feitos no novo módulo de disciplinas. Corrigir a função da LIQ
para consultar as tabelas normalizadas corretas; auditar todo o backend por leituras/gravações em
planilhas duplicadas; garantir que salvar um instrutor não crie aba nova nem duplique linha."

## Achados reais (verificação de premissa antes de escrever qualquer requisito — investigação por
fork, dados ao vivo, apresentada e confirmada com o usuário antes desta spec)

- **Bug real confirmado, mas não o descrito no pedido**: `validarLiq_` (`lib/acoes/liq.ts`, FR-005, escrita na
  spec 027) valida presença de instrutor checando `instrutor_disciplina` (tabela de QUALIFICAÇÃO/
  habilitação, filtrada pelo `ID_Grade` exato) — nunca lê `turma_disciplina.ID_Instrutor` (a
  SELEÇÃO real por turma, fonte de verdade desde a spec 029, **2 specs depois** de `validarLiq_` ter
  sido escrita, e nunca atualizada para refletir isso). Confirmado ao vivo: **os 4 trimestres de
  2026 falham ao gerar**, com 27 dos 54 bloqueios sendo falsos positivos — ex. a disciplina LHFC do
  CAHO tem `turma_disciplina.ID_Instrutor='40'` (alguém foi genuinamente selecionado no módulo de
  disciplinas) mas `validarLiq_` ainda acusa "sem instrutor selecionado", porque o instrutor 40 não
  tem vínculo de `instrutor_disciplina` especificamente para aquele `ID_Grade`. Este bug existe
  desde a spec 029 — a "normalização do banco de dados" (spec 033) citada no pedido original **nunca
  tocou `lib/acoes/liq.ts`** e não tem nenhuma relação causal com o problema.
- **Mesmo gap em `montarDadosSecao2Liq_`**: monta a lista de instrutores de cada disciplina do
  documento LIQ a partir de `instrutor_disciplina` (todos os habilitados àquele `ID_Grade`), não de
  `turma_disciplina.ID_Instrutor` (quem foi de fato selecionado para aquela turma) — mesmo quando a
  geração não é bloqueada, o documento pode listar instrutor errado.
- **"Varredura de referências órfãs/abas duplicadas" (escopo 2 do pedido original) não encontrou
  nada**: os 8 usos de `.from()` em todo `lib/acoes/*.ts` e `lib/dominio/*.ts` passam pela constante `TABELAS`
  (`lib/supabase/server.ts`) ou pelo parâmetro genérico do motor CRUD — nenhum bypass hardcoded. A banco de produção
  tem exatamente 24 abas, todas batendo 1:1 com `TABELAS`. Nenhuma referência a aba legada/V1.0
  (`Cad_Materias`) existe fora de 1 comentário histórico. Não há nada para "auditar e refatorar" —
  a arquitetura relacional (`cursos`/`turmas`/`disciplinas`/`turma_disciplina`) já é
  a única usada em todo o backend.
- **"Prevenção de duplicação ao salvar instrutor" (escopo 3 do pedido original) não encontrou
  nada**: `atualizarTurmaDisciplina` (`lib/acoes/liq.ts`) → `crudAtualizar` (`lib/acoes/crud.ts`) localiza a linha por
  ID e grava célula a célula na linha existente — não existe caminho de `append`/criação de aba
  nova nesse fluxo, confirmado lendo o código.
- **`montarDadosSecao1Liq_` (Seção 1 do documento — roster geral de instrutores qualificados, com
  carga horária e disciplinas habilitadas) é um conceito diferente e correto**: continua baseada em
  `instrutor_disciplina` de propósito — não é "quem está dando aula nesta turma agora", é "quem está
  qualificado no sistema todo". Fora de escopo desta correção, permanece intocada.
- **Decisão confirmada com o usuário**: escopo desta spec fica restrito a `lib/acoes/liq.ts` (2 funções) —
  sem varredura sistêmica de `.from(<tabela>)`, sem função de limpeza genérica, sem mudança em
  `atualizarTurmaDisciplina`/`lib/acoes/crud.ts` (nenhum dos dois tem o problema descrito).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gerar a LIQ sem bloqueio falso para disciplinas com instrutor já selecionado (Priority: P1)

Como Divisão de Orientação Educacional e Pedagógica gerando a LIQ de um trimestre, quero que a
validação reconheça os instrutores que já selecionei no módulo de disciplinas — não ser bloqueado
dizendo "sem instrutor selecionado" quando eu já selecionei um.

**Why this priority**: É o "Critério de Aceite" central do pedido original e o bug real confirmado
— sem ele, a LIQ fica bloqueada para qualquer trimestre com pelo menos 1 disciplina nessa situação
(hoje, todos os 4 trimestres de 2026).

**Independent Test**: Gerar a LIQ de um trimestre cujo intervalo intercepta a disciplina LHFC do
CAHO (que tem instrutor selecionado mas sem vínculo de qualificação para aquele `ID_Grade`
específico) e confirmar que essa disciplina não aparece mais na lista de bloqueios.

**Acceptance Scenarios**:

1. **Given** uma linha de `turma_disciplina` cujo período intercepta o trimestre e tem
   `ID_Instrutor` preenchido, **When** `validarLiq_` roda, **Then** essa disciplina nunca aparece na
   lista de problemas — independente de haver ou não vínculo em `instrutor_disciplina` para aquele
   `ID_Grade`.
2. **Given** uma linha de `turma_disciplina` cujo período intercepta o trimestre e `ID_Instrutor`
   está vazio, **When** `validarLiq_` roda, **Then** essa disciplina continua aparecendo na lista de
   problemas — comportamento genuíno preservado, nunca uma regressão de deixar passar disciplina
   sem ninguém selecionado.
3. **Given** os 4 trimestres de 2026 (estado real hoje), **When** `gerarLiq` é chamado para cada um,
   **Then** nenhum deles é bloqueado pelas 27 disciplinas que hoje falham incorretamente (turmas com
   instrutor genuinamente vazio continuam bloqueando, corretamente).

---

### User Story 2 - Documento LIQ lista os instrutores realmente selecionados por turma (Priority: P1)

Como usuário abrindo o documento LIQ gerado, quero que a Seção 2 (turma × disciplina × instrutor)
mostre exatamente quem foi selecionado para aquela turma — não todo instrutor habilitado à
disciplina que porventura nunca deu aula naquela turma específica.

**Why this priority**: Mesma prioridade da User Story 1 — sem ela, mesmo depois do desbloqueio, o
documento oficial submetido à DHN listaria o instrutor errado.

**Independent Test**: Gerar a LIQ de um trimestre com uma disciplina onde o instrutor selecionado
(`turma_disciplina.ID_Instrutor`) é diferente de outro instrutor habilitado mas não selecionado
(`instrutor_disciplina`) para o mesmo `ID_Grade`, e confirmar que a Seção 2 lista o selecionado, não
o meramente habilitado.

**Acceptance Scenarios**:

1. **Given** uma disciplina com 1 ou mais `ID_Instrutor` em `turma_disciplina`, **When** a Seção 2 é
   montada, **Then** lista exatamente esses instrutores (resolvidos via `instrutores`), separados
   por "; " (mesmo formato já existente).
2. **Given** um `ID_Instrutor` que não corresponde a nenhuma linha real de `instrutores` (dado
   órfão), **When** a Seção 2 é montada, **Then** esse nome é omitido silenciosamente da lista —
   nunca lança erro nem quebra a geração do documento (mesmo padrão RN-DEG-01 já usado em todo o
   projeto).
3. **Given** a Seção 1 do mesmo documento, **When** ela é montada, **Then** continua idêntica ao
   comportamento de antes desta spec — baseada em `instrutor_disciplina`, não em `turma_disciplina`.

---

### Edge Cases

- Múltiplos instrutores selecionados na mesma disciplina (CSV em `ID_Instrutor`): todos aparecem na
  Seção 2, mesmo formato já usado.
- `ID_Instrutor` com espaços/vírgulas soltas (`"40, "` ou `", 40"`): mesmo parse tolerante já usado
  em outros pontos do projeto (`split(',').map(trim).filter(Boolean)`).
- Turma Cancelada: continua excluída por completo das duas checagens de `validarLiq_`, comportamento
  já existente e preservado (Edge Case original da spec 027).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `validarLiq_` MUST considerar uma disciplina (linha de `turma_disciplina`) como tendo
  instrutor atribuído quando `turma_disciplina.ID_Instrutor` estiver preenchido (não vazio) — nunca
  mais checando `instrutor_disciplina` para essa validação.
- **FR-002**: A mensagem de bloqueio de `validarLiq_` para disciplina sem instrutor MUST continuar
  citando o nome real da disciplina e do curso (comportamento já existente, preservado).
- **FR-003**: `montarDadosSecao2Liq_` MUST montar a lista de instrutores de cada disciplina a partir
  de `turma_disciplina.ID_Instrutor` (resolvido via `instrutores`), nunca mais a partir de
  `instrutor_disciplina`.
- **FR-004**: `montarDadosSecao1Liq_` (Seção 1, roster geral de instrutores qualificados) MUST
  permanecer intocada — continua baseada em `instrutor_disciplina`, conceito de qualificação
  distinto de seleção por turma, fora de escopo desta correção.
- **FR-005**: Um `ID_Instrutor` de `turma_disciplina` que não corresponde a nenhuma linha real de
  `instrutores` MUST ser omitido silenciosamente da Seção 2, nunca lançar erro (RN-DEG-01) — mas
  MUST continuar contando como "instrutor atribuído" para fins de FR-001 (a validação verifica
  presença, não integridade referencial).
- **FR-006**: Esta spec MUST NUNCA alterar `atualizarTurmaDisciplina`, `crudAtualizar`, ou qualquer
  outro arquivo `.ts` além de `lib/acoes/liq.ts` — a investigação de premissa não encontrou nenhum problema de
  referência de aba redundante nem de duplicação de linha em nenhum outro ponto do backend.
- **FR-007**: Esta spec MUST NUNCA criar uma função genérica de varredura/auditoria de
  `.from()` — não há evidência de nenhuma referência de aba redundante em todo o backend.

### Key Entities

Nenhuma entidade nova — leitura de `turma_disciplina.ID_Instrutor` (já existente, fonte de verdade
desde a spec 029) e `instrutores` (já existente) em vez de `instrutor_disciplina`, dentro das 2
funções de `lib/acoes/liq.ts` listadas acima. `instrutor_disciplina` continua sendo lida por
`montarDadosSecao1Liq_` (Seção 1, inalterada).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Gerar a LIQ dos 4 trimestres de 2026 não bloqueia mais nenhuma das 27 disciplinas que
  hoje falham incorretamente (instrutor selecionado, sem vínculo de qualificação para aquele
  `ID_Grade` exato).
- **SC-002**: A Seção 2 do documento LIQ gerado lista exatamente os instrutores selecionados via
  `turma_disciplina.ID_Instrutor` para cada disciplina — nunca um instrutor apenas habilitado mas
  não selecionado para aquela turma.
- **SC-003**: A Seção 1 do documento permanece byte-a-byte idêntica ao comportamento anterior a esta
  spec — 0% de mudança.
- **SC-004**: Turmas/disciplinas genuinamente sem nenhum instrutor selecionado continuam bloqueando
  a geração, com a mesma mensagem — 0% de regressão nesse comportamento.
- **SC-005**: 0% de regressão na suíte de testes (`pnpm vitest run`).

## Assumptions

- A validação de FR-001 verifica só presença (`ID_Instrutor` não vazio), não se o(s) ID(s)
  correspondem a instrutores reais nem se estão habilitados — a habilitação já é garantida no
  momento da seleção pela própria UI do módulo de disciplinas (checkboxes filtrados por
  `instrutor_disciplina`/`instrutoresElegiveis_`, specs 029-032); esta correção não duplica essa
  checagem no momento da geração da LIQ.
- `instrutor_disciplina` continua sendo a fonte correta e única da Seção 1 (roster geral de
  qualificação) — esta spec não questiona nem altera esse uso.
- Nenhuma migração de dado é necessária — `turma_disciplina.ID_Instrutor` já existe e já está
  populado desde a spec 029; esta é uma correção de lógica de leitura, não de schema.
