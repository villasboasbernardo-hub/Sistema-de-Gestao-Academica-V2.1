# Feature Specification: Limpeza de Colunas Mortas em disciplinas e Coerência de Datas por Turma

**Feature Branch**: `033-limpeza-schema-disciplinas`

**Created**: 2026-08-20

**Status**: Draft

**Input**: User description: "NOVO ÉPICO: Normalização de Banco de Dados, Limpeza de Redundâncias e
Coerência Relacional. Observou-se dados duplicados, redundantes e vazios no banco de dados — colunas
de datas previstas tanto no cadastro genérico de disciplinas quanto nas abas de execução (turmas).
Pedido original: remover Data de Início/Término e Instrutores do Catálogo de Disciplinas
(`disciplinas`), mantendo-os exclusivamente na aba de relacionamento (`turma_disciplina`);
função `migrarELimparBancoDeDados()` para remover linhas vazias/órfãs e migrar dados da tabela
errada para a certa; revisão das funções CRUD para evitar dado duplicado no JSON de retorno."

## Achados reais (verificação de premissa antes de escrever qualquer requisito — apresentados e
discutidos diretamente com o usuário, escopo realinhado em conversa antes desta spec)

- **A "redundância" de `Previsao_Inicio`/`Previsao_Termino`/`ID_Instrutor` entre `disciplinas` e
  `turma_disciplina` é proposital, não acidental** — decisão arquitetural deliberada, construída e
  documentada ao longo das specs 027, 029, 030, 031 e 032 desta mesma sessão
  (`docs/arquitetura/01-schema.md`, seção "Evidência"). `disciplinas` guarda o valor-**semente/
  default de grade**; `turma_disciplina` guarda o valor **real por turma**, criado a partir da
  semente (`Origem_Periodo='Herdado_Grade'`) e depois editável independentemente. `turma_disciplina`
  **já é** a aba de relacionamento que o pedido original descreve como "Disciplinas_Turma" — criada
  na spec 027, não precisa ser criada de novo.
- **Consumidores reais e ativos da semente de `disciplinas`, confirmados em código**:
  `lib/dominio/motor-preditivo.ts` simula um ano **futuro** que ainda não tem nenhuma linha de `turma_disciplina`
  (só existem quando a turma daquele ano é criada) — sem a semente, a simulação não tem dado nenhum
  para trabalhar. ``lib/acoes/estatisticas.ts`:getEstatisticasDisciplinas` (spec 031, construída nesta mesma
  sessão) usa a data de grade como fallback quando nenhuma turma é filtrada — não existe "a turma"
  nesse caso. `migracao/criar_turma_disciplina.py`/`adicionar_instrutor_turma_disciplina.py` são os
  próprios scripts que semeiam `turma_disciplina` a partir dessas colunas — apagar a origem torna
  essas migrações irreproduzíveis a partir do zero. Apagar as 3 colunas quebraria o motor preditivo
  **silenciosamente** (previsões erradas, sem erro visível) e pelo menos 2 outras funções ativas.
- **As outras duas alegações do pedido original não têm evidência no código**: (a) linhas vazias/
  órfãs — `turma_disciplina` foi verificada na criação (spec 027) com "0 FK órfã, 210 pares únicos,
  0 duplicata" (`01-schema.md`); nenhuma linha vazia/órfã encontrada hoje em `cursos`/
  `turmas`/`disciplinas`/`turma_disciplina`. (b) dado duplicado no JSON de retorno —
  `listarDisciplinas`/`getDisciplinasDaTurmaComRitmo`/a Visão 2 de `app/(app)/disciplinas/page.tsx` são
  leituras diretas ou lookups por mapa (`ID_Grade` → objeto), estruturalmente incapazes de duplicar
  linha; nenhuma spec anterior desta sessão registrou esse bug.
- **Escopo realinhado, confirmado pelo usuário**: em vez do pedido literal (apagar as 3 colunas
  semente + função de limpeza genérica de linhas), esta spec ataca os problemas reais encontrados
  durante a auditoria: (1) `disciplinas.Instrutores_Selecionados` — coluna FORMULA já quebrada
  (`#ERROR!` confirmado na banco de produção, contornada há tempos por `contarSelecionadosDistintos_`,
  ``lib/acoes/instrutores.ts`:107-109`, que explicitamente nunca a lê); (2) `disciplinas.
  Tecnica_Ensino_Sugerida`/`Local_Padrao` — desde a spec 031 (mesma sessão), não são mais editáveis
  por nenhuma UI e não têm mais nenhum leitor em `src/` (confirmado por busca — só sobra 1 comentário
  histórico em `app/(app)/disciplinas/page.tsx`); (3) um bug real de coerência: ``lib/acoes/cronograma.ts`:
  getDisciplinasDaTurmaComRitmo`/`getCronogramaGlobalDisciplina` são **escopadas por turma**
  (recebem `idTurma`) mas leem a data de `disciplinas` (a semente) em vez de preferir a de
  `turma_disciplina` (o valor real daquela turma) quando ela existe — confirmado em código,
  ``lib/acoes/cronograma.ts`:470` e ``lib/acoes/cronograma.ts`:498-499`.
- **Fora de escopo, explicitamente, por decisão do usuário**: remover ou alterar
  `disciplinas.Previsao_Inicio`/`Previsao_Termino`/`ID_Instrutor`; criar uma função de limpeza
  genérica de linhas vazias/órfãs (sem evidência de necessidade); qualquer guard de deduplicação de
  JSON (sem evidência de bug).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Remover colunas mortas/quebradas do Catálogo de Disciplinas (Priority: P1)

Como Divisão de Administração Acadêmica olhando o banco `disciplinas`, quero parar de ver a
coluna `Instrutores_Selecionados` mostrando `#ERROR!` e as colunas `Tecnica_Ensino_Sugerida`/
`Local_Padrao` (que a interface não usa mais desde a spec 031) — elas não têm mais função nenhuma e
só confundem quem olha o banco diretamente.

**Why this priority**: É o "Data Cleanup" real do pedido original — defeito visível, sem
consumidor, seguro de remover.

**Independent Test**: Rodar a migração de remoção de coluna e confirmar, no banco, que
`Instrutores_Selecionados`, `Tecnica_Ensino_Sugerida` e `Local_Padrao` não existem mais em
`disciplinas`, e que nenhuma tela do sistema quebra.

**Acceptance Scenarios**:

1. **Given** o banco `disciplinas` antes da migração, **When** a migração roda, **Then** as
   3 colunas (`Instrutores_Selecionados`, `Tecnica_Ensino_Sugerida`, `Local_Padrao`) deixam de
   existir no cabeçalho.
2. **Given** a migração já aplicada, **When** qualquer tela do sistema que lê `disciplinas` é
   usada (Módulo de Disciplinas, Página do Curso, Motor Preditivo, Estatísticas), **Then** nenhuma
   delas lança erro nem se comporta diferente de antes — nenhuma das 3 colunas tinha consumidor
   real (Achados reais).
3. **Given** a migração já foi aplicada uma vez, **When** ela é executada de novo, **Then** não faz
   nada e informa que já foi aplicada (idempotência, mesmo padrão de todas as migrações anteriores).

---

### User Story 2 - Preferir a data real da turma sobre a semente de grade nas funções turma-escopadas (Priority: P1)

Como qualquer usuário consultando o ritmo/progresso de uma disciplina dentro de uma turma
específica, quero que o sistema use a data **daquela turma** (`turma_disciplina`) quando ela existir
— não a data genérica da grade (`disciplinas`) — porque a função já recebe o `ID_Turma` como
parâmetro e finge que não sabe qual turma é.

**Why this priority**: É o bug de coerência real encontrado na auditoria — funções que já são
turma-escopadas dando a resposta errada quando a turma tem uma data diferente da semente de grade
(ex. período renegociado por turma, spec 029/031).

**Independent Test**: Numa turma cuja `turma_disciplina.Previsao_Inicio`/`Termino` foi editada para
um valor diferente do `disciplinas` da mesma disciplina, confirmar que `getDisciplinasDaTurmaComRitmo`/
`getCronogramaGlobalDisciplina` devolvem a data da turma, não a da grade.

**Acceptance Scenarios**:

1. **Given** uma disciplina cuja turma tem `turma_disciplina.Previsao_Inicio`/`Termino` preenchidos
   e diferentes dos de `disciplinas`, **When** `getDisciplinasDaTurmaComRitmo(idTurma)` é
   chamada, **Then** o ritmo calculado usa a data de `turma_disciplina`, não a de `disciplinas`.
2. **Given** a mesma situação, **When** `getCronogramaGlobalDisciplina(idGrade, idTurma)` é chamada,
   **Then** `previsaoInicio`/`previsaoTermino` no retorno vêm de `turma_disciplina`.
3. **Given** uma turma cuja linha de `turma_disciplina` para aquela disciplina não tem
   `Previsao_Inicio`/`Termino` preenchidos (`Origem_Periodo='Nao_Informado'`), **When** as mesmas 2
   funções são chamadas, **Then** degradam para a semente de `disciplinas`, exatamente como hoje
   (RN-DEG-01) — nunca quebram, nunca ficam sem data quando a grade tem uma.
4. **Given** uma disciplina sem nenhuma linha de `turma_disciplina` correspondente naquela turma
   (caso defensivo, não deveria ocorrer após a semeadura da spec 027), **When** as mesmas 2 funções
   são chamadas, **Then** também degradam para a semente de `disciplinas`, nunca lançam erro.

---

### Edge Cases

- Migração rodada antes de qualquer linha de `turma_disciplina` ter sido editada individualmente: o
  comportamento de FR-003/FR-004 não muda nada visível (turma ainda reflete a semente herdada,
  `Origem_Periodo='Herdado_Grade'`) — só passa a mudar quando alguém edita a data por turma.
- `lib/dominio/motor-preditivo.ts`/`lib/dominio/sugestao-dsa.ts`/`lib/acoes/estatisticas.ts` continuam lendo `disciplinas.
  Previsao_Inicio`/`Termino`/`ID_Instrutor` exatamente como hoje — esta spec nunca toca essas 3
  colunas nem essas 3 funções (fora de escopo, Achados reais).
- Planilha em que a migração de remoção de coluna já rodou uma vez: idempotente, sem erro, sem
  segunda tentativa de escrita.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A migração MUST remover definitivamente a coluna `disciplinas.
  Instrutores_Selecionados` (fórmula quebrada, `#ERROR!` na banco de produção, sem nenhum leitor de
  código — `contarSelecionadosDistintos_` já lê exclusivamente `ID_Instrutor`).
- **FR-002**: A migração MUST remover definitivamente as colunas `disciplinas.
  Tecnica_Ensino_Sugerida` e `disciplinas.Local_Padrao` (órfãs desde a spec 031 — sem UI que as
  edite e sem nenhum leitor restante em `src/`).
- **FR-003**: `getDisciplinasDaTurmaComRitmo(idTurma)` MUST usar `turma_disciplina.Previsao_Inicio`/
  `Previsao_Termino` (casados por `ID_Grade`+`ID_Turma`) para calcular o ritmo, em vez da semente de
  `disciplinas`, sempre que a linha de `turma_disciplina` existir e tiver essas datas
  preenchidas.
- **FR-004**: `getCronogramaGlobalDisciplina(idGrade, idTurma)` MUST aplicar a mesma regra de
  preferência de FR-003 para os campos `previsaoInicio`/`previsaoTermino` do retorno.
- **FR-005**: Quando a linha de `turma_disciplina` correspondente não existir, ou existir mas sem
  `Previsao_Inicio`/`Previsao_Termino` preenchidos, FR-003/FR-004 MUST degradar para a semente de
  `disciplinas.Previsao_Inicio`/`Previsao_Termino` — exatamente o comportamento atual, nunca uma
  regressão (RN-DEG-01).
- **FR-006**: Esta spec MUST NUNCA remover ou alterar `disciplinas.Previsao_Inicio`,
  `disciplinas.Previsao_Termino` ou `disciplinas.ID_Instrutor` — colunas-semente ativamente
  consumidas por `lib/dominio/motor-preditivo.ts` (simulação de ano futuro sem `turma_disciplina`),
  `lib/acoes/estatisticas.ts`/`lib/dominio/sugestao-dsa.ts` (fallback sem turma) e pelos scripts de migração que semeiam
  `turma_disciplina` (Achados reais).
- **FR-007**: Esta spec MUST NUNCA criar uma função de limpeza genérica de linhas vazias/órfãs, nem
  qualquer guard de deduplicação de JSON — nenhuma das duas foi encontrada como problema real
  durante a auditoria (Achados reais).
- **FR-008**: A migração de remoção de coluna MUST seguir o mesmo padrão já estabelecido no projeto
  (backup do banco de trabalho + 1 entrada em `migracao_log` por operação, mesmo precedente de
  `migracao/remover_instrutor_completo_adicionar_estado.py`) e MUST ser idempotente.

### Key Entities

- **`disciplinas`** (já existente) — perde 3 colunas mortas (`Instrutores_Selecionados`,
  `Tecnica_Ensino_Sugerida`, `Local_Padrao`); `Previsao_Inicio`/`Previsao_Termino`/`ID_Instrutor`
  permanecem intocadas (semente de grade).
- **`turma_disciplina`** (já existente, sem mudança de schema) — passa a ser efetivamente preferida
  como fonte de data nas 2 funções turma-escopadas de `lib/acoes/cronograma.ts`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O banco `disciplinas` ao vivo não exibe mais `#ERROR!` nem as colunas
  `Tecnica_Ensino_Sugerida`/`Local_Padrao`.
- **SC-002**: Numa turma com data própria diferente da semente de grade, `getDisciplinasDaTurmaComRitmo`/
  `getCronogramaGlobalDisciplina` refletem a data da turma, 100% das vezes.
- **SC-003**: `lib/dominio/motor-preditivo.ts`/`lib/acoes/estatisticas.ts`/`lib/dominio/sugestao-dsa.ts` continuam funcionando sem
  nenhuma mudança de comportamento observável — 0% de regressão nesses módulos.
- **SC-004**: 0% de regressão na suíte de testes (`pnpm vitest run`).

## Assumptions

- Nenhuma linha vazia/órfã foi encontrada nas 4 abas auditadas (`cursos`/`turmas`/
  `disciplinas`/`turma_disciplina`) — não há necessidade de rotina de limpeza de linhas nesta
  spec; se uma for encontrada no futuro, é tratada como spec própria, com sua própria evidência.
- Nenhum bug de duplicação de JSON foi encontrado nos caminhos de leitura auditados — não há
  necessidade de guard de deduplicação nesta spec.
- `disciplinas.Previsao_Inicio`/`Previsao_Termino`/`ID_Instrutor` permanecem como semente/
  fallback — decisão reafirmada nesta spec (não revisitada), consistente com specs 027-032.
