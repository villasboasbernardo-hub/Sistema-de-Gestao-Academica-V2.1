# Contrato — Funções de servidor (Épico H)

Todas expostas via Server Action (chamadas pelo chamada direta da Server Action do frontend, `components/ciaara/`).
Toda função de leitura chama `exigirFuncao(...)` primeiro; toda função de escrita valida o perfil
explicitamente antes de gravar (RN-RBAC-02).

## `lib/acoes/dsa.ts`

### `getDsaSemanal(idTurma, semanaIso)` (assinatura expandida)

- **Perfis**: `PERFIS_TODOS` (leitura) + `exigirEscopoTurma_`.
- **Parâmetros**: `semanaIso` passa a aceitar qualquer data ISO da semana (comportamento já existente
  hoje aceita só `null`) — recua para a segunda-feira da semana correspondente.
- **Retorno (expandido)**: `{ turma, semana:{numero,inicio,fim}, dias:[{data,diaSemana,blocos[]}],
  situacaoPorMateria, quadroCargaHoraria, totalizadores, avisos }` — `blocos[]` inclui `taIni`,
  `taFim`, `horario` (via `horarios_tempos_aula`), `idGrade`, `nome`, `conteudo`, `local`,
  `instrutor`, `idInstrutor`, `idRegistro`, `tempos`, `conflito` (bool, RF-DSA-04),
  `conflitoTipo` (`'Instrutor'|'Sala'|null`). Preserva `totalizadores`/
  `avaliacoesAgendadasNaSemana` já existentes (Épicos E/I) — não remove nenhum campo hoje consumido
  por `app/(app)/turmas/[turma]/dsa/page.tsx`.
- **Comportamento**: monta a grade dia×TA da turma juntando `registros_aula` +
  `avaliacoes` + `atividades_nao_letivas`; lançamentos sem `TA_Inicial` vão para uma lista
  `semPosicao[]` por dia, exibidos em rodapé (RN-DEG-01). Detecção de conflito (RF-DSA-04) cruza
  **todas as turmas do sistema** para cada dia da semana, não só `idTurma` (research.md achado 1) —
  e cobre as **três** fontes que compõem a grade, não só as duas com instrutor: `registros_aula`
  (`ID_Instrutor`), `avaliacoes` (`ID_Instrutor_Responsavel` **e** `ID_Fiscal`, ambos ocupam o
  slot) para conflito de instrutor; `atividades_nao_letivas` entra só na comparação de sala, por
  não ter campo de instrutor (`/speckit-analyze` 2026-08-15, achados F1/F2).
- **Regras**: RF-DSA-02/03/04, RN-CONF-01 (Risco Alto), RN-DEG-01.
- **Porta de**: `getDsaSemanal` (V1.0, ``lib/` (monólito da v1.0, hoje dividido por domínio):1258`) — algoritmo de grade/horário idêntico;
  escopo do conflito generalizado de "mesma turma" para "todo o sistema" (correção obrigatória de
  RN-CONF-01).

### `lancarAula(payload)`

- **Perfis**: `Admin`, `Operador`.
- **Parâmetros**: `{ idTurma, data, idGrade, idInstrutor, tipoAtividade?, metodologia, tempos,
  taInicial?, local?, conteudo?, observacoes }`.
- **Comportamento**: valida matéria↔curso da turma, instrutor habilitado na disciplina
  (`instrutorHabilitado_`, RN-INST-01), grava em `registros_aula` com
  `Categoria_Normativa='Aula'` via `crudCriar`. Quando a disciplina é TFM e o lançamento
  ultrapassaria 6 tempos na semana daquela disciplina, **rejeita com erro** antes de gravar
  (Clarifications 2026-08-15) — para as demais disciplinas, um total diário/semanal alto gera só
  aviso no retorno, nunca bloqueia (mesmo padrão soft de `registrarAula`, V1.0).
- **Retorno**: `{ registro, avisoLimiteDiario? }`.
- **Regras**: RF-DSA-01, RN-INST-01, RN-DIST-03 (bloqueio TFM).
- **Porta de**: `registrarAula` (V1.0, ``lib/` (monólito da v1.0, hoje dividido por domínio):828`) — validações e gravação idênticas; teto
  semanal de TFM como bloqueio rígido é o único comportamento novo (research.md achado 3).

### `excluirLancamentoDsa` — sem função nova

- Reaproveita `crudExcluir('registros_aula'|'avaliacoes'|'atividades_nao_letivas',
  'ID_Registro'|'ID_Avaliacao'|'ID_Evento', id)` (`lib/acoes/crud.ts`, já existente) diretamente do frontend —
  o prefixo do ID indica a aba de origem, mesmo padrão já usado por `excluirRegistroAula` (V1.0).
- **Regras**: RF-DSA-07, C-05 (exclusão lógica).

### `moverLancamentoDsa(idRegistro, novaData, novoTaInicial)`

- **Perfis**: `Admin`, `Operador`.
- **Comportamento**: resolve a aba de origem pelo prefixo de `idRegistro` — mesmo despacho de
  `excluirLancamentoDsa` — `registros_aula`/`avaliacoes`/`atividades_nao_letivas`,
  não só blocos de Aula (`/speckit-analyze` 2026-08-15, achado F3). Só quando a aba resolvida for
  `registros_aula` e a disciplina for TFM, revalida o teto rígido de 6 tempos/semana
  para a nova data/semana (mesma regra de `lancarAula`) antes de gravar — rejeita o movimento em
  vez de gravar uma posição inválida; para as demais abas/disciplinas, move direto. Grava via
  `crudAtualizar(aba, idRegistro, {Data: novaData, TA_Inicial: novoTaInicial})`. Não recalcula
  conflito no servidor: o frontend chama `getDsaSemanal` de novo após o movimento, que já recalcula
  (RF-DSA-04).
- **Regras**: RF-DSA-07, RN-DIST-03 (bloqueio TFM, só para Aula/TFM).

### `getImpressaoDsa(idTurma, semanaIso)`

- **Perfis**: `PERFIS_TODOS` (leitura) + `exigirEscopoTurma_`.
- **Retorno**: mesmo formato de `getDsaSemanal`, acrescido de `responsaveis[]` (via
  `responsaveis_curso`, filtrado por `ID_Curso`/vigência na data da semana — `01-schema.md` §4.6) —
  lista vazia quando não houver responsável vigente, front degrada para assinatura em branco
  (RN-DEG-01), nunca falha.
- **Regras**: RF-DSA-06.
- **Porta de**: a resolução de assinaturas de `renderizarImpressaoDsa` (V1.0, `index.html:1284`,
  front-end) — este épico move essa resolução para o backend, já que `responsaveis_curso` agora
  tem lógica de vigência (`Vigente_A_Partir_De`/`Vigente_Ate`) que não existia na V1.0.

## `lib/dominio/sugestao-dsa.ts` (novo)

### `gerarSugestaoSemanal(idTurma, semanaIso)`

- **Perfis**: `Admin`, `Operador`.
- **Comportamento**: para cada dia útil da semana, identifica espaços livres (TAs sem lançamento na
  grade real — chama `getDsaSemanal` internamente para saber o que já existe), propõe blocos de Aula
  priorizando a disciplina com maior carga restante por dia útil restante (RN-2027-05, reaproveita
  `distribuicaoSemanalMateria_`), ajustado pelo peso manual (`PRIORIDADE_DISCIPLINA_{ID_Grade}`,
  já existente), escolhendo instrutor via `escolherInstrutor_`/`faixaRegimeInstrutor_` (Épico G) —
  respeitando teto de TFM (6/semana, rígido), fim de curso (sem teto), demais (25/semana
  recomendado), máx. 4 disciplinas/dia, máx. 4 tempos da mesma disciplina/dia. **Não grava nada** —
  só retorna a prévia.
- **Retorno**: `{ blocosSugeridos:[{data, taInicial, tempos, idGrade, idInstrutor, alerta?}],
  espacosLivres }`.
- **Regras**: RF-DSA-08, RF-DSA-08.1(i), RN-DIST-03, RN-2027-05, RN-2027-06.

### `aceitarBlocoSugerido(bloco)`

- **Perfis**: `Admin`, `Operador`.
- **Comportamento**: recebe um item de `blocosSugeridos` e chama `lancarAula` com os mesmos campos
  — **nenhum caminho de escrita paralelo** (FR-007). Sujeito às mesmas validações (habilitação,
  bloqueio de TFM) que qualquer lançamento manual.
- **Regras**: RF-DSA-08.

### `validarSugestaoContraSemanaReal(idTurma, semanaIso)`

- **Perfis**: `Admin`, `PERFIS_DIVISAO_ADMIN_ACADEMICA`.
- **Comportamento**: chama `gerarSugestaoSemanal` **ignorando** os lançamentos reais já existentes
  daquela semana (trata todos os TAs como livres) e compara bloco a bloco contra o que
  `getDsaSemanal` mostra como realmente lançado — por dia/TA: `Coincidente` (mesma disciplina e
  instrutor), `Divergente` (disciplina ou instrutor diferente, com o motivo), `Sem_Correspondencia`
  (sugerido mas nada foi lançado ali, ou vice-versa). Rejeita com erro claro se a semana não tiver
  nenhum lançamento manual real (FR-010).
- **Retorno**: `{ comparacao:[{data, taInicial, sugerido, real, resultado}], resumo:{coincidentes,
  divergentes, semCorrespondencia} }` — **nenhuma taxa de aprovação/reprovação calculada** (FR-009,
  decisão é humana).
- **Regras**: RF-DSA-08.1(ii).

## `app/globals.css`

### `.area-impressao` / `@media print` (componente novo do Design System)

- Portado do padrão já usado duas vezes na V1.0 (DSA + Ficha do Instrutor — research.md achado 4):
  `@page { size: landscape; }`, oculta tudo exceto `.area-impressao`. Sem JS/dependência nova —
  puro CSS, consistente com o restante do Design System (Épico A).
- **Regras**: RF-DSA-06.
