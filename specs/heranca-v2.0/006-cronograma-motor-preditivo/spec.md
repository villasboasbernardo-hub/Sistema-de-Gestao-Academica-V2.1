# Feature Specification: Épico G — Cronograma Unificado e Motor Preditivo Multi-Ano

**Feature Branch**: `006-cronograma-motor-preditivo`

**Created**: 2026-08-15

**Status**: Draft

**Input**: User description: "Épico G do documento 06 — Cronograma Unificado e Motor Preditivo Multi-Ano"

**Fontes primárias**: `docs/fase-1/06-Backlog-de-Epicos-V2.md` (Épico G), `docs/fase-1/02-Requisitos-Funcionais.md`
(RF-CRONOS-01 a 10, RF-2027-01 a 05, RF-HOR-05, RF-DADOS-04), `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md`
(RN-DIST-01 a 03, RN-2027-01 a 09, RN-CRONOS-01 a 03), `docs/arquitetura/01-schema.md` (§4.1 `planejamento_anual`,
§4.2 `curso_regime_historico`, §5.9/5.10 `config_parametros`/`Calendario_*`), `tests/unidade/pendentes.test.ts`
(stubs já nomeados "Pendentes - Epico G"), `.specify/memory/constitution.md`.

## Clarifications

### Session 2026-08-15

- Q: Como deve funcionar, na prática, o ajuste manual de prioridade entre disciplinas de um curso
  (User Story 4, FR-008)? → A: Opção A — peso numérico por disciplina (ex.: 1–10), usado para
  desempatar/ajustar o critério automático (RN-2027-05) quando presente, sem substituí-lo por
  completo.

## Nota de escopo — o que já existe vs. o que falta construir

Verificado antes de escrever esta spec, para não repetir trabalho já feito nem inventar escopo que
não existe:

1. **`lib/acoes/cronograma.ts` hoje é um stub de 15 linhas** — só `getCronos(idTurma)`, que devolve
   os totalizadores por categoria (já entregues nos Épicos E/I via `totalizadoresDaTurma_`,
   RF-CRONOS-04). O restante de RF-CRONOS (visão unificada previsto×executado, granularidade
   variável, view por instrutor, regime com vigência, priorização configurável, salas) **não existe
   ainda no backend V2.0** — é o trabalho real deste épico.
2. **`lib/dominio/motor-preditivo.ts` não existe no backend V2.0** (`docs/arquitetura/02-modularizacao.md`,
   reconciliado no Épico B, lista-o como "não construído — Épico G"). A V1.0 (`Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio)`)
   tem uma implementação funcionando, mas travada no ano fixo "2027" (13 funções com sufixo `27` —
   RN-2027-01) — este épico generaliza essa lógica para qualquer ano, não a reescreve do zero.
3. **O modelo de dados já foi criado no Épico C, não é escopo deste épico**: `planejamento_anual`
   (versionado por ano, `Rascunho`/`Salvo`/`Arquivado`), `curso_regime_historico` (29 linhas já
   populadas, `Vigente_A_Partir_De`), `config_parametros`, `feriados`,
   `janelas_curso`, `reservas_proens` — todas já existem e estão povoadas no banco
   viva. Este épico constrói a **lógica** que lê essas abas, não o schema.
4. **9 regras `RN-` Risco Alto já têm um stub `test.todo` nomeado**, literalmente sob o título
   "Pendentes - Epico G" em `tests/unidade/pendentes.test.ts`: RN-DIST-01/02/03 e RN-2027-01/02/03/04/06/09.
   Converter esses 9 stubs em testes reais (constitution, Princípio VIII) é o critério objetivo de
   cobertura deste épico — nenhuma regra nova precisa ser inventada, nenhuma já coberta precisa ser
   duplicada.
5. **RN-CONF-01 (conflito de instrutor/sala) está fora deste épico** — tem seu próprio stub, sob um
   título diferente ("Pendentes - Epico C/DSA") no mesmo arquivo, e pertence a `lib/acoes/dsa.ts`, não a
   `lib/acoes/cronograma.ts`/`lib/dominio/motor-preditivo.ts`.
6. **O critério de aceite original do documento 06** ("saída idêntica à soma de Diagrama+Cronos da
   v1.0 para o curso CAHO 2026") é substituído pelo critério já vigente do projeto (suíte de
   invariantes estruturais, constitution Princípio VI, decisão de 2026-08-10) — mesmo padrão já
   aplicado a todo épico anterior desta sessão.
7. **RF-CRONOS-09/10 (visão de ocupação de salas) fica fora do escopo desta spec.** O documento 06
   não menciona salas em nenhuma das 4 "Histórias de alto nível" nem nos 3 "Critérios de aceite de
   alto nível" do Épico G — só aparece na seção RF-CRONOS do documento 02 (adicionada v1.2,
   independentemente do backlog de épicos). Sem nenhuma história de usuário do próprio documento 06
   pedindo-a, construí-la aqui seria escopo além do que o épico pede (constitution, Princípio IX).
   Registrada como Assumption abaixo, para ser retomada quando/se um épico futuro a sequenciar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar previsto e executado no mesmo módulo (Priority: P1) 🎯 MVP

Como usuário do sistema, quero consultar a distribuição semanal de carga horária **prevista** e a
**execução real** de um curso/turma no mesmo módulo de Cronograma, com granularidade e visão
ajustáveis, em vez de alternar entre dois módulos separados (Diagrama de Alocação e Cronos) que já
usam o mesmo cálculo por trás.

**Why this priority**: é o problema central que o épico existe para resolver (documento 06) — a
fusão dos dois módulos v1.0 num só, com uma única função de distribuição compartilhada (RN-DIST-01,
já stub nomeado em `tests/unidade/pendentes.test.ts`).

**Independent Test**: abrir o Cronograma unificado para uma turma, alternar granularidade
(semana/mês/trimestre/semestre/ano) e visão (por disciplina/por instrutor), e confirmar que os
totais previstos e executados aparecem lado a lado, com a linha de feriados descontando capacidade
corretamente e a soma da distribuição semanal fechando exatamente com a carga horária total de cada
disciplina (nunca perder nem sobrar tempo por arredondamento).

**Acceptance Scenarios**:

1. **Given** uma turma com disciplinas cadastradas e aulas já lançadas, **When** um usuário abre o
   Cronograma unificado, **Then** vê a distribuição prevista e a execução real da mesma turma na
   mesma tela, sem precisar navegar para outro módulo.
2. **Given** o Cronograma aberto, **When** o usuário alterna a granularidade ou a visão (disciplina
   ↔ instrutor), **Then** os totais são recalculados corretamente para a nova granularidade/visão,
   sem perder nem duplicar tempo de aula.
3. **Given** a visão por instrutor, **When** o mesmo instrutor está alocado em mais de uma
   disciplina/turma na mesma semana, **Then** o sistema soma a carga de todas elas e sinaliza a
   semana como sobrecarga quando o total ultrapassa a capacidade do instrutor.
4. **Given** uma semana com feriado de "Dia Inteiro" cadastrado em `feriados`, **When**
   o Cronograma calcula a capacidade daquela semana, **Then** a capacidade é descontada
   corretamente; um feriado de impacto "Parcial"/"Informativo" não desconta nada (RN-EVT-02).
5. **Given** o Cronograma aberto, **When** o usuário filtra por disciplina ou instrutor e exporta ou
   imprime, **Then** o resultado exportado/impresso reflete exatamente o filtro aplicado na tela.

---

### User Story 2 - Gerar planejamento preditivo de qualquer ano futuro (Priority: P1)

Como Encarregado/Ajudante da Divisão de Administração Acadêmica, quero gerar uma simulação completa
da grade curricular de **qualquer ano futuro informado**, não apenas um ano fixo no código, editar
manualmente o resultado antes de confirmá-lo, e então salvá-lo como o planejamento oficial daquele
ano — disponível no Cronograma unificado para comparação previsto×executado quando o ano chegar.

**Why this priority**: é a segunda metade do problema do documento 06 — o motor preditivo hoje só
existe travado em "2027"; sem generalização, o sistema para de servir a esse propósito assim que
2027 passar.

**Independent Test**: gerar a prévia de um ano futuro qualquer (não 2027), confirmar o resumo de
turmas simuladas/blocos gerados/alertas emitidos, editar manualmente uma semana da prévia
(reduzindo/aumentando tempos, com o sistema recalculando os totais afetados), salvar, e confirmar
que o resultado salvo aparece no Cronograma unificado como fonte daquele ano.

**Acceptance Scenarios**:

1. **Given** um perfil autorizado (Admin ou Encarregado/Ajudante da Divisão de Administração
   Acadêmica), **When** ele solicita a geração da prévia para um ano futuro qualquer (ex.: 2029),
   **Then** o sistema simula a grade de todos os cursos com janela oficial definida naquele ano,
   espelhando as janelas do ano corrente pelo "n-ésimo dia da semana do mês" (nunca soma simples de
   365 dias).
2. **Given** a geração concluída, **When** o resumo é exibido, **Then** ele mostra o número de
   turmas simuladas, blocos gerados e alertas emitidos (falta de instrutor habilitado, sobrecarga de
   instrutor, carga horária que não coube na janela), e a simulação **não é interrompida** por causa
   de nenhum alerta individual.
3. **Given** uma prévia gerada, **When** o usuário edita manualmente a distribuição (ex.: reduz de 8
   para 7 tempos de uma disciplina numa semana e realoca o excedente em outra semana), **Then** o
   sistema recalcula os totais afetados corretamente, sem exigir gerar tudo de novo.
4. **Given** uma prévia editada, **When** o usuário salva, **Then** ela passa a ser o planejamento
   oficial daquele ano — versionado (uma nova geração não apaga a versão salva anterior, que passa a
   "Arquivado") e disponível no Cronograma unificado como fonte do ano simulado, sem exigir nenhum
   lançamento real prévio.
5. **Given** a prévia de um ano futuro, **When** o usuário lança manualmente um evento de calendário
   que o motor não tem como prever (ex.: uma licença administrativa pontual), **Then** o evento é
   incorporado à prévia sem substituir a previsão automática de feriados/licenças já gerada.
6. **Given** uma disciplina com carga horária total ≥ 20 tempos, **When** o motor aloca sua Prova
   Mista, **Then** aloca um bloco fechado de exatamente 3 tempos contíguos no mesmo dia (nunca
   fatiado); a Revisão obrigatória de 1 tempo ocorre em até 7 dias corridos após a prova, forçada no
   7º dia (com alerta) se não houver folga antes disso.
7. **Given** a escolha de instrutor para um bloco simulado, **When** o motor aloca, **Then**
   prioriza, entre os habilitados/atribuídos, o de menor carga já alocada na semana, respeitando a
   faixa de horas de aula do regime dele (20h→8-12h; 40h→16-24h; Dedicação Exclusiva→16-30h,
   DGPM-103); quando nenhum candidato cabe, aloca o menos sobrecarregado e registra alerta de
   sobrecarga, nunca deixa o bloco sem instrutor.

---

### User Story 3 - Mudança de regime de horário aplicada efetivamente aos cálculos (Priority: P2)

Como responsável pelo planejamento, quero que uma mudança de regime de horário cadastrada para
entrar em vigor no meio da janela de um curso seja **efetivamente aplicada** nos cálculos de
capacidade a partir da data de vigência — em vez de permanecer apenas informativa, como hoje.

**Why this priority**: `curso_regime_historico` já existe e está populada (29 linhas,
`Vigente_A_Partir_De`) desde o Épico C, mas a função que a consome (`getRegimeVigente`) ainda não
existe — o achado (j) de `docs/arquitetura/01-schema.md` §6.7 já registra isso como pendência
explícita deste épico.

**Independent Test**: cadastrar uma mudança de regime com vigência no meio da janela de um curso,
confirmar que o Cronograma calcula a capacidade da semana anterior à vigência com o regime antigo e
da semana posterior com o regime novo, e que um registro do Detalhe Semanal de Aula já lançado antes
da vigência continua sendo lido com a configuração vigente na data do próprio registro (nunca
reinterpretado pela mudança).

**Acceptance Scenarios**:

1. **Given** um curso com uma mudança de regime de horário cadastrada com `Vigente_A_Partir_De` no
   meio de sua janela, **When** o Cronograma calcula a capacidade das semanas antes e depois dessa
   data, **Then** cada semana usa o regime correto para o seu próprio período — antes: regime
   anterior; depois: regime novo — tanto na visão prevista quanto na executada.
2. **Given** um registro de aula já lançado antes da data de vigência de uma mudança de regime
   posterior, **When** o sistema exibe ou recalcula esse registro, **Then** ele continua sendo
   interpretado com a configuração vigente na data do próprio lançamento, nunca com a configuração
   nova.

---

### User Story 4 - Priorização de disciplina ajustável por curso (Priority: P2)

Como Encarregado/Ajudante da Divisão de Administração Acadêmica, quero poder registrar um peso
numérico de prioridade (ex.: 1–10) por disciplina de um curso, usado para ajustar/desempatar o
critério automático padrão do motor preditivo (disciplina mais "apertada" — maior carga restante
por dia útil restante) nos casos em que ele não é o desejado para aquele curso específico —
sem precisar substituir o critério automático por uma lista de prioridade inteira (Clarifications
2026-08-15).

**Why this priority**: é uma exceção pontual ao critério automático (RN-2027-05, Risco Médio), não
um bloqueio — o motor já funciona corretamente sem ela na maioria dos casos (por isso P2, não P1).

**Independent Test**: gerar a prévia de um curso sem nenhum peso manual definido e confirmar que usa
o critério automático de sempre; registrar um peso manual mais alto para uma disciplina daquele
curso, gerar de novo, e confirmar que a disciplina com peso mais alto recebe alocação nos espaços
livres antes das demais quando há disputa pelo mesmo espaço.

**Acceptance Scenarios**:

1. **Given** um curso sem nenhum peso manual configurado para nenhuma disciplina, **When** o motor
   aloca espaços livres entre disciplinas concorrentes, **Then** usa o critério automático padrão
   (RN-2027-05), sem nenhuma mudança de comportamento em relação a hoje.
2. **Given** um curso com um peso manual mais alto configurado para uma disciplina específica,
   **When** o motor aloca um espaço livre disputado por essa disciplina e outra sem peso
   configurado (ou com peso menor), **Then** a disciplina de maior peso recebe o espaço primeiro,
   respeitando ainda os limites rígidos já existentes (máx. 4 disciplinas/dia, máx. 4 tempos da
   mesma disciplina/dia, teto de TFM).
3. **Given** duas disciplinas do mesmo curso com o mesmo peso manual configurado, **When** o motor
   precisa decidir entre elas para o mesmo espaço, **Then** volta a usar o critério automático
   (RN-2027-05) como desempate entre as duas — o peso manual ajusta o critério automático, nunca o
   substitui por completo.

---

### Edge Cases

- Curso sem reservas de Administração/Tempo Reserva detalhadas no PROENS do ano simulado: usa um
  valor de reserva genérico (RN-2027-03), nunca falha por ausência do dado específico.
- Disciplina sem nenhum instrutor habilitado ou atribuído: gera alerta explícito no resumo da
  geração, nunca falha silenciosa nem bloqueia o restante da simulação (RF-2027-02, RN-2027-06).
- Carga horária de uma disciplina que não cabe inteira na janela do curso: gera alerta, a simulação
  continua para as demais disciplinas/cursos (RF-2027-02).
- Curso sem nenhuma janela oficial definida para o ano simulado: não entra na simulação daquele ano
  (RF-2027-01 só cobre cursos "com janela oficial definida naquele ano").
- Gerar uma nova prévia quando já existe uma versão "Salvo" anterior do mesmo ano: cria uma nova
  versão em "Rascunho"; a versão "Salvo" anterior só vira "Arquivado" no momento em que a nova for
  salva, nunca antes (mecânica de não regressão já definida em `01-schema.md` §4.1).
- Cronograma consultado para um ano cuja única fonte é uma prévia ainda em "Rascunho" (nunca salva):
  o sistema deve deixar claro que aquele ano ainda não tem planejamento oficial, degradando com
  aviso (RN-DEG-01), nunca travando.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE unificar, em um único módulo de Cronograma, a distribuição semanal de
  carga horária prevista e a execução real, por curso/turma, com fonte selecionável por ano —
  qualquer ano corrente ou futuro simulado pelo motor preditivo (RF-CRONOS-01).
- **FR-002**: O sistema DEVE permitir alternar a granularidade de exibição (semana, mês, trimestre,
  semestre, ano) e a visão (por disciplina ou por instrutor), com carga horária prevista, executada
  e restante (RF-CRONOS-02).
- **FR-003**: O sistema DEVE oferecer comparação "Previsto × Realizado" por semana e por disciplina,
  sinalizando divergência e a densidade de alocação (abaixo do regime, dentro do ideal, acima do
  regime/sobrecarga); na visão por instrutor, DEVE sinalizar semanas em que o mesmo instrutor
  ultrapassa sua capacidade semanal somando todas as disciplinas/turmas (RF-CRONOS-03).
- **FR-004**: O sistema DEVE continuar totalizando separadamente as categorias não letivas (AEC,
  TAD, TR, Estudo Individual) e o total geral da turma, sem incluir Aula/Avaliação nesse
  agrupamento (RF-CRONOS-04 — já entregue nos Épicos E/I via `totalizadoresDaTurma_`; este épico só
  precisa preservar, não recriar).
- **FR-005**: O sistema DEVE permitir filtrar por disciplina e por instrutor, exportar os dados em
  CSV e imprimir a grade (RF-CRONOS-05).
- **FR-006**: O sistema DEVE incluir uma linha de feriados descontando a capacidade das semanas
  correspondentes, só para feriados de impacto "Dia Inteiro" (RF-CRONOS-06, RN-EVT-02).
- **FR-007**: Quando um curso tiver uma mudança de regime de horário cadastrada (`curso_regime_historico`)
  com vigência dentro de sua janela, o Cronograma DEVE refletir essa mudança de forma consistente em
  todas as semanas afetadas, tanto na visão prevista quanto na executada, sem reinterpretar registros
  já lançados antes da data de vigência (RF-CRONOS-07, RF-HOR-05, RN-2027-09).
- **FR-008**: O sistema DEVE permitir a um perfil de Encarregado/Ajudante da Divisão de
  Administração Acadêmica registrar um **peso numérico de prioridade** (ex.: 1–10) por disciplina
  dentro de um curso; ao decidir qual disciplina recebe alocação num espaço livre disputado, o motor
  DEVE usar esse peso para ajustar/desempatar o critério automático (RN-2027-05), nunca substituí-lo
  por completo — na ausência de peso configurado (ou em empate de pesos), o critério automático
  decide sozinho, exatamente como hoje (RF-CRONOS-08, Clarifications 2026-08-15).
- **FR-009**: A distribuição semanal de carga horária de uma disciplina DEVE ser calculada por uma
  única função compartilhada, reaproveitada pelo Cronograma unificado e pelo bloco "Previsto" —
  nenhuma segunda implementação desse cálculo pode existir em paralelo (RN-DIST-01). Usa a carga
  semanal cadastrada quando existir, ou a carga total dividida pelas semanas da janela, com a última
  semana absorvendo o resto (RN-DIST-02); preserva os três regimes de teto semanal — TFM rígido (6
  TA/semana), fim de curso sem teto, demais 25 TA/semana recomendado (RN-DIST-03).
- **FR-010**: O sistema DEVE permitir a um perfil autorizado (Admin ou Encarregado/Ajudante da
  Divisão de Administração Acadêmica) gerar, sob demanda, uma simulação completa da grade curricular
  de qualquer ano futuro informado, para todos os cursos com janela oficial definida naquele ano,
  distribuindo aulas, provas mistas, revisões, blocos de Administração e Tempo Reserva conforme as
  regras RN-2027-02 a 06 (RF-2027-01).
- **FR-011**: A geração DEVE produzir um resumo com o número de turmas simuladas, blocos gerados e
  alertas emitidos (falta de instrutor habilitado, sobrecarga de instrutor, carga horária que não
  coube na janela), sem interromper a simulação por causa de um alerta individual (RF-2027-02).
- **FR-012**: O resultado da simulação DEVE alimentar o Cronograma unificado como fonte do ano
  simulado, sem exigir nenhum lançamento real prévio (RF-2027-03).
- **FR-013**: A geração do motor preditivo DEVE produzir uma prévia editável, não um resultado final:
  gerar → editar manualmente (com recálculo automático dos totais afetados) → salvar, momento em que
  a prévia vira o planejamento oficial daquele ano, versionado — uma nova geração nunca apaga uma
  versão já salva (RF-2027-04).
- **FR-014**: O sistema DEVE permitir o lançamento manual de eventos de calendário na prévia de um
  ano futuro, para ocorrências que o motor não tem como prever, preservando a previsão automática de
  feriados/licenças como ponto de partida, não como resultado fechado (RF-2027-05).
- **FR-015**: A verificação de não regressão de qualquer função nova ou generalizada por este épico
  DEVE ser feita pela suíte de invariantes estruturais (`tests/`) — nunca por comparação de saída
  contra o curso CAHO 2026 (constitution, Princípio VI; substitui o critério de aceite original do
  documento 06).

### Key Entities

Todas já existem no schema migrado (Épico C) — este épico constrói a lógica que as lê/escreve, não
o modelo de dados:

- **`planejamento_anual`**: linha por disciplina/semana/ano/versão do planejamento simulado ou
  salvo; chave `ID_Planejamento`; versionado (`Rascunho`/`Salvo`/`Arquivado` por `Ano_Letivo`).
- **`curso_regime_historico`**: histórico de regime de horário por curso, com
  `Vigente_A_Partir_De`/`Vigente_Ate`.
- **`config_parametros`**: tetos e limites normativos como dado administrável (não usado
  diretamente pelo motor preditivo, mas pela mesma infraestrutura de configuração).
- **`feriados`**, **`janelas_curso`**, **`reservas_proens`**: dados
  anuais do PROENS administráveis por ano, substituindo as constantes `FERIADOS_2027`/
  `SEMENTES_2027`/`RESERVAS_PROENS` da V1.0.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário consulta previsto e executado do mesmo curso/turma numa única tela, sem
  precisar abrir um segundo módulo.
- **SC-002**: O motor preditivo gera uma prévia completa para qualquer ano futuro informado (testado
  com pelo menos um ano diferente de 2027), não apenas o ano historicamente fixo no código.
- **SC-003**: As 9 regras Risco Alto já stubadas como `test.todo` sob "Pendentes - Epico G"
  (RN-DIST-01/02/03, RN-2027-01/02/03/04/06/09) passam a ser testes reais na suíte de invariantes,
  sem nenhuma regressão nos demais testes já existentes.
- **SC-004**: Uma mudança de regime de horário cadastrada no meio da janela de um curso altera
  corretamente a capacidade calculada a partir da data de vigência, sem alterar a interpretação de
  nenhum registro já lançado antes dela.
- **SC-005**: Uma prévia gerada pelo motor pode ser editada manualmente antes de salva; uma vez
  salva, vira o planejamento oficial do ano, consultável e comparável previsto×executado no
  Cronograma unificado, sem apagar a versão anterior.

## Assumptions

- RF-CRONOS-09/10 (visão de ocupação de salas) fica **fora do escopo desta spec** — não citada em
  nenhuma das histórias/critérios de aceite do Épico G no documento 06 (Nota de escopo, item 7).
  Fica registrada aqui para retomada quando um épico futuro a sequenciar explicitamente.
- A priorização manual de disciplina (User Story 4, FR-008, Clarifications 2026-08-15) é um peso
  numérico por disciplina dentro de um curso, que **ajusta/desempata** o critério automático
  (RN-2027-05) — nunca o substitui por completo. Na ausência de peso configurado (ou em empate de
  pesos), o comportamento automático de hoje é preservado sem nenhuma mudança.
- O motor preditivo generaliza a lógica já funcionando na V1.0 (`Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio)`, funções com
  sufixo `27`) — não é uma reescrita do zero; o trabalho é remover o hardcode do ano e passar a ler
  `Calendario_*`/`curso_regime_historico` em vez de constantes de código.
- RN-CONF-01 (conflito de instrutor/sala) permanece fora deste épico — stub próprio sob "Pendentes -
  Epico C/DSA", pertence a `lib/acoes/dsa.ts`.
- A função única de distribuição semanal (FR-009, RN-DIST-01) é nova neste épico — não existe ainda
  em `lib/acoes/`; ao ser criada, tanto o Cronograma unificado quanto qualquer consumidor futuro
  (ex.: prévia semanal do DSA, Épico H) devem reutilizá-la, nunca duplicar o cálculo.
