# Contrato — Funções de servidor (Épico G)

Todas expostas via Server Action (chamadas pelo chamada direta da Server Action do frontend, `components/ciaara/`).
Toda função de leitura chama `exigirFuncao(...)` primeiro; toda função de escrita valida o perfil
explicitamente antes de gravar (RN-RBAC-02).

## `lib/dominio/regime-curso.ts`

### `getRegimeVigente(idCurso, data, tipoRegime)`

- **Perfis**: função pura auxiliar, não chamada diretamente do frontend — sem `exigirFuncao`
  próprio; herda o contexto de quem a chama (`lib/acoes/cronograma.ts`/`lib/dominio/motor-preditivo.ts`).
- **Parâmetros**: `idCurso` (string), `data` (Date), `tipoRegime` (`'Padrao'`|`'Excecao'`).
- **Retorno**: a linha `Ativo` de `curso_regime_historico` com maior `Vigente_A_Partir_De <=
  data` (e `Vigente_Ate` vazio ou `>= data`), ou `null` se nenhuma vigente (degrada com aviso no
  chamador, RN-DEG-01).
- **Regras**: RN-2027-09, RF-HOR-05.

## `lib/acoes/cronograma.ts`

### `getCronograma(idCurso, idTurma, ano, granularidade, visao)`

- **Perfis**: `PERFIS_TODOS` (leitura) + `exigirEscopoCurso_`/`exigirEscopoTurma_`.
- **Parâmetros**: `granularidade` ∈ `semana|mes|trimestre|semestre|ano`; `visao` ∈
  `disciplina|instrutor`; `ano` seleciona a fonte (ano corrente = execução real via `avaliacoes`/
  `atividades_nao_letivas`/aulas lançadas; ano futuro = `planejamento_anual` versão `Salvo`
  daquele ano, se existir).
- **Retorno**: previsto × executado por semana/disciplina (ou por instrutor), totalizadores por
  categoria (FR-CRONOS-04, reaproveita `totalizadoresDaTurma_`), linha de feriados descontada
  (FR-006), sinalização de densidade/sobrecarga (FR-003).
- **Regras**: RF-CRONOS-01/02/03/04/05/06/07, RN-DIST-01/02/03, RN-CRONOS-01/02/03.
- **Substitui**: `getCronos(idTurma)` (assinatura anterior preservada como caso particular —
  `ano`/`granularidade`/`visao` com defaults reproduzem o comportamento atual, RF-MOD-03).

### `distribuicaoSemanalMateria_(materia, semanas, ancora)` (interna, não exposta)

- Portada de ``lib/` (monólito da v1.0, hoje dividido por domínio):1550` (V1.0) sem mudança de algoritmo — só renomeação dos helpers internos
  (`ehTfm_`/`ehSemTetoSemanal_`/`limiteSemanalMateria_`, Achado 1 do `research.md`).
- **Regras**: RN-DIST-01/02/03.

## `lib/dominio/motor-preditivo.ts`

### `gerarPlanejamento(ano)`

- **Perfis**: `Admin` ou `PERFIS_DIVISAO_ADMIN_ACADEMICA`.
- **Parâmetros**: `ano` (inteiro, qualquer ano seguinte ao corrente).
- **Comportamento**: para cada curso com janela em `janelas_curso` filtrada por `ano`,
  simula a grade (aulas, provas mistas, revisões, blocos de Administração/Tempo Reserva), grava
  todas as linhas em `planejamento_anual` como nova `Versao` (`Status_Previa = 'Rascunho'`,
  `Origem_Linha = 'Motor'`) — nunca apaga versão existente (Achado 2).
- **Retorno**: resumo `{ turmasSimuladas, blocosGerados, alertas[] }` (FR-2027-02) — nunca lança
  exceção por causa de um alerta individual.
- **Regras**: RF-2027-01/02/03, RN-2027-01/02/03/04/05/06.

### `editarLinhaPlanejamento(idPlanejamento, novosTemposAlocados)`

- **Perfis**: `Admin` ou `PERFIS_DIVISAO_ADMIN_ACADEMICA` ou `Operador`.
- **Comportamento**: atualiza `Tempos_Alocados` de uma linha `Rascunho`; se o novo valor difere de
  `Tempos_Alocados_Motor`, marca `Origem_Linha = 'Motor_Editado'`; recalcula totalizadores afetados
  daquela semana/disciplina no retorno. Rejeita edição em linha `Salvo`/`Arquivado`.
- **Regras**: RF-2027-04.

### `lancarEventoManualPlanejamento(ano, versao, evento)`

- **Perfis**: `Admin` ou `PERFIS_DIVISAO_ADMIN_ACADEMICA`.
- **Comportamento**: insere uma linha `Tipo_Linha = 'Evento_Manual'` na prévia `Rascunho` indicada,
  sem substituir as linhas `Feriado`/`Licenca_Pagamento` já geradas automaticamente.
- **Regras**: RF-2027-05.

### `salvarPlanejamento(ano, versao)`

- **Perfis**: `Admin` ou `PERFIS_DIVISAO_ADMIN_ACADEMICA`.
- **Comportamento**: promove a `Versao` indicada de `Rascunho` para `Salvo`; na mesma operação,
  rebaixa a versão que estava `Salvo` daquele `Ano_Letivo` (se houver) para `Arquivado`. Rejeita se
  a versão não estiver em `Rascunho`.
- **Regras**: RF-2027-04, invariante "no máximo 1 `Salvo` por `Ano_Letivo`" (`01-schema.md` §4.1).

### `definirPrioridadeDisciplina(idGrade, peso)`

- **Perfis**: `PERFIS_DIVISAO_ADMIN_ACADEMICA`.
- **Parâmetros**: `peso` (inteiro 1–10) — usado por `gerarPlanejamento` para ajustar/desempatar o
  critério automático (RN-2027-05) na próxima geração daquele curso; ausência de peso preserva o
  comportamento automático (Clarifications 2026-08-15, FR-008).
- **Armazenamento**: grava/atualiza uma linha em `config_parametros` com `Chave =
  'PRIORIDADE_DISCIPLINA_' + idGrade` — nenhuma coluna/tabela nova (`data-model.md`, decisão
  2026-08-15).
- **Regras**: RF-CRONOS-08.
