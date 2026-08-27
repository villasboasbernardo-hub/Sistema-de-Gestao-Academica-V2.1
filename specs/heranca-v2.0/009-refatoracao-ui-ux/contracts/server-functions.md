# Contrato — Funções de servidor (Refatoração UI/UX)

Todas expostas via Server Action (chamadas pelo chamada direta da Server Action do frontend, `components/ciaara/`).
Toda função de leitura chama `exigirFuncao(...)` primeiro; toda função de escrita valida o perfil
explicitamente antes de gravar (RN-RBAC-02).

## ``app/layout.tsx` + `lib/supabase/server.ts``

### `getContextoInicial()` (assinatura preservada, retorno estendido)

- **Perfis**: `PERFIS_TODOS`.
- **Retorno (campos novos)**: cada item de `ctx.cursos` ganha `classificacao`/`status` (leitura
  direta de `cursos`, sem cálculo); `ctx.turmasEmDestaque` — objeto `{idCurso:
  {idTurma, nome, status, progresso}}` (data-model.md), resolvido por `resolverTurmaEmDestaque_`
  (FR-004). Nenhum campo hoje consumido por nenhuma view é removido.
- **Regras**: RF-INI-01/02/03, FR-003/004/005.

### `resolverTurmaEmDestaque_(turmasDoCurso, hoje)` (interna, não exposta)

- Função pura (research.md achado 3): recebe a lista de turmas já filtrada por `ID_Curso` e a data
  de referência; devolve a turma `Status = Ativa` cuja janela `Data_Inicio`–`Data_Termino` contém
  `hoje`, ou `null` se nenhuma. Em caso de mais de uma candidata, a de `Data_Inicio` mais recente
  prevalece (FR-004, Clarifications da specify).

## `lib/acoes/cronograma.ts`

### `calcularRitmoDisciplina_(chExecutada, chTotal, previsaoInicio, previsaoTermino, hoje)` (interna, não exposta)

- Função pura (research.md achado 4): calcula `esperadoAteHoje = chTotal × (dias decorridos ÷ dias
  totais da janela)`, clampado a `[0, chTotal]`; delega a classificação para
  `classificarDensidade_(chExecutada, esperadoAteHoje)` já existente (banda 90%–110%, Clarifications
  2026-08-15) — retorna `'abaixo'|'ideal'|'acima'`, que o chamador mapeia para
  `'Atrasada'|'No Prazo'|'Adiantada'`.
- **Regras**: FR-008.

### `getDisciplinasDaTurmaComRitmo(idTurma)` (nova, exposta)

- **Perfis**: `PERFIS_TODOS` + `exigirEscopoTurma_`.
- **Retorno**: disciplinas da turma com `chExecutada`/`chTotal`/`statusConclusao`
  (`Não Iniciada`/`Em Andamento`/`Concluída`) e `ritmo` (via `calcularRitmoDisciplina_`) —
  reaproveita a mesma agregação de execução já usada por `getCronograma`, nunca um segundo cálculo.
- **Regras**: FR-008, RF-CURSO-03.

### `getCronogramaGlobalDisciplina(idGrade, idTurma)` (nova, exposta)

- **Perfis**: `PERFIS_TODOS` + `exigirEscopoTurma_`.
- **Retorno**: `{ previsaoInicio, previsaoTermino, dataRealInicio, dataRealTermino }` — as duas
  últimas via `FORMULA` de leitura (mín./máx. de `Data` em `registros_aula` filtrado
  por `ID_Grade`+`ID_Turma`), mesmo princípio já usado em `avaliacoes.Status_Vista`
  (`01-schema.md` §4.4, DISC-2). `null` quando não houver nenhuma execução ainda (RN-DEG-01).
- **Regras**: FR-009 (cronograma global do Diário de Classe Detalhado, sem tabela de UE).

## `lib/acoes/instrutores.ts`

Nenhuma função nova nem assinatura alterada — `criarVinculoHabilitacao` já valida `ID_Grade`
server-side (research.md achado 2). A correção de FR-012 é só o frontend trocar `<input
type="text">` por `<select>` populado via `listarDisciplinas()` (já existe).

## `lib/acoes/disciplinas.ts`

Nenhuma função nova — `atualizarDisciplina`/`crudCriar` (via `CRUD_CONFIG['disciplinas']` já
existente) já são *header-driven* e aceitam `Tecnica_Ensino_Sugerida`/`Local_Padrao` assim que as
colunas existirem fisicamente na aba (DISC-1).

## `lib/acoes/estatisticas.ts` (novo)

### `getEstatisticasCursos()`

- **Perfis**: `PERFIS_TODOS`.
- **Retorno**: `{ kpis: {totalCursos, totalTurmasAtivas}, porClassificacao: [{classificacao,
  quantidade}], duracaoMediaPorClassificacao: [{classificacao, duracaoMediaSemanas}] }`.
- **Regras**: RF-CURSOS-02, FR-014/015.

### `getEstatisticasDisciplinas()`

- **Perfis**: `PERFIS_TODOS`.
- **Retorno**: `{ kpis: {total, concluidas, atrasadas, semInstrutor}, porStatus: [{status,
  quantidade}] }` — já pedido por RF-MATERIAS-04.
- **Regras**: RF-MATERIAS-04, FR-014/015.

### `getEstatisticasInstrutores()`

- **Perfis**: `PERFIS_TODOS`.
- **Retorno**: `{ kpis: {total, ativos, inativos}, porPostoGraduacao: [{posto, quantidade}] }`.
- **Regras**: FR-014/015.

### `getEstatisticasTurmas()`

- **Perfis**: `PERFIS_TODOS`.
- **Retorno**: `{ kpis: {total, ativas}, porStatus: [{status, quantidade}], porAnoInicio: [{ano,
  quantidade}] }`.
- **Regras**: FR-014/015.

Todas as 4 leem sua própria aba via `lerAbaComoObjetos_` e agregam em memória — nenhuma passa de
~2.000 linhas hoje, satisfazendo FR-015 sem otimização adicional (research.md achado 7).

## `components/ciaara/`

### `renderizarGrafico_(elementoId, tipo, categorias, series)` (novo, frontend)

- Helper único de inicialização do Recharts, reutilizado pelos 4 painéis de estatística — nenhuma
  duplicação de opções de gráfico entre módulos (research.md achado 6).
- **Regras**: FR-014, UI-06.
