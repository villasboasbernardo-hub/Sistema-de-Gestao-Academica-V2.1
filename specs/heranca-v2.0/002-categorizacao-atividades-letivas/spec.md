# Feature Specification: Épico E — Categorização de Atividades Letivas

**Feature Branch**: `002-categorizacao-atividades-letivas`

**Created**: 2026-08-14

**Status**: Draft

**Input**: User description: "Épico E do documento 06 — Categorização de Atividades Letivas na taxonomia normativa de cinco categorias."

**Fontes primárias**: `docs/fase-1/06-Backlog-de-Epicos-V2.md` (Épico E), `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md` (RN-EVT-01 resolvida, RN-EVT-03, RN-CRONOS-02/RF-CRONOS-04, RN-DEG-02, RN-INST-01 delimitada), `docs/fase-1/02-Requisitos-Funcionais.md` (RF-DSA-01, RF-EXTRA-01 a 04, RF-CRONOS-04), `docs/fase-1/03-Requisitos-Nao-Funcionais.md` (RNF-NORM-02, RNF-NORM-08), `docs/fase-1/10-Plano-de-Execucao-Spec-Kit.md` (Feature 002, gate de saída), `docs/arquitetura/02-modularizacao.md` (`lib/acoes/aulas.ts`, `app/(app)/atividades/page.tsx`).

## Nota de escopo e dependência do Épico C

O Épico C (`specs/001-migracao-saneamento-dados/`) já entregou a **camada de dado** completa desta funcionalidade: `atividades_nao_letivas.Categoria_Normativa` (AEC/TAD/TR/Estudo_Individual) preenchida nos 664 registros históricos, `Compoe_CHT` calculada, e os tetos normativos (10%/5%/10%) já existem em `config_parametros` como dado administrável (RNF-NORM-08), não como literal de código. O gate de saída deste épico no documento 10 — *"os cinco totalizadores conferem com a tabela de-para do documento 05: Estudo Individual 531, AEC 62, TAD 59, TR 11"* — já está satisfeito no dado (verificado pela suíte de invariantes do Épico C). O que esta feature entrega é a **camada de aplicação** sobre esse dado: nenhum código backend/frontend para isto existe ainda (o projeto Supabase e o repositório Next.js não foi publicado — ver Assumptions).

## Clarifications

### Session 2026-08-14

- Q: O CIAARA opera sob o regime de "Estudo Obrigatório" da Avaliação Institucional (20% das horas-aula diárias) ou sem esse regime (10%)? → A: Sem o regime de Estudo Obrigatório — Estudo Individual é facultativo no CIAARA, e a referência informativa é 10% das horas-aula diárias, não 20%.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lançar atividade não vinculada a disciplina em uma das três categorias operacionais (Priority: P1)

Como Operador, quero lançar uma atividade AEC (Atividade Extraclasse), TAD (Tempo para Administração) ou TR (Tempo Reserva), escolhendo o escopo Global (todas as turmas ativas na data) ou de uma Turma específica, para que o sistema pare de tratar "evento extracurricular" como uma categoria única e passe a diferenciar corretamente essas três grandezas normativas.

**Why this priority**: É a capacidade fundamental sem a qual nenhuma das demais histórias (tetos, totalizadores) tem o que calcular — substitui diretamente o formulário único de hoje.

**Independent Test**: Lançar uma atividade de cada categoria (AEC, TAD, TR) com escopo Turma e uma com escopo Global; confirmar que cada uma aparece na aba/tela correta com a categoria certa, e que a de escopo Global aparece refletida em todas as turmas ativas na data do lançamento.

**Acceptance Scenarios**:

1. **Given** o Operador na tela de lançamento de atividade, **When** ele escolhe categoria AEC/TAD/TR e informa data, tempos consumidos, descrição e observações, **Then** o lançamento é salvo com a categoria escolhida, sem exigir vínculo com disciplina.
2. **Given** um lançamento de escopo Turma, **When** salvo, **Then** ele fica associado exclusivamente àquela turma.
3. **Given** um lançamento de escopo Global, **When** salvo, **Then** ele aparece refletido em todas as turmas ativas na data do lançamento, sem precisar ser repetido turma a turma.

---

### User Story 2 - Sinalização automática dos tetos normativos de AEC, TAD e TR (Priority: P2)

Como Operador, quero ver o sistema calcular e sinalizar automaticamente, por curso, o cumprimento dos tetos normativos — AEC ≤ 10% do somatório das CHD do curso, TAD ≤ 5% e TR ≤ 10% da Carga Horária Real — para saber, no momento do lançamento, se uma categoria já está no limite ou ultrapassada, sem precisar calcular isso manualmente.

**Why this priority**: É o valor normativo central do épico (RNF-NORM-02) — sem ele, os tetos existem só como número em `config_parametros`, sem nenhuma sinalização visível a quem lança.

**Independent Test**: Lançar atividades AEC até ultrapassar 10% da CHD de um curso de teste e confirmar que o sistema sinaliza o teto ultrapassado; confirmar que os valores de teto usados vêm de `config_parametros`, não de um número fixo na tela.

**Acceptance Scenarios**:

1. **Given** um curso com CHD e lançamentos AEC/TAD/TR já registrados, **When** o Operador consulta o curso, **Then** o sistema mostra o percentual atual de cada um dos três tetos frente ao limite configurado.
2. **Given** um teto (AEC, TAD ou TR) de um curso ultrapassado, **When** o Operador tenta lançar mais uma atividade daquela categoria para o mesmo curso, **Then** o sistema exibe um alerta explícito com a justificativa (percentual atual vs. limite), mas **permite** o lançamento — nunca bloqueia (RN-DEG-02).
3. **Given** o limite normativo de uma categoria é alterado em `config_parametros` (dado administrável, não código), **When** o próximo cálculo de teto roda, **Then** ele usa o novo valor, sem exigir alteração ou reimplantação de código.

---

### User Story 3 - Lançar e acompanhar Estudo Individual em categoria própria (Priority: P3)

Como Operador, quero lançar Estudo Individual (incluindo Monitoria e apoio de idiomas) numa categoria própria, sempre de escopo Turma, e acompanhá-la informativamente contra a referência normativa de 10% das horas-aula diárias (o CIAARA não opera sob o regime de Estudo Obrigatório — ver Clarifications), sem que ela seja confundida ou somada junto com AEC/TAD/TR.

**Why this priority**: Estudo Individual já responde por 77% dos lançamentos sem disciplina vinculada (531 de 664) — tratá-lo com a mesma mecânica de AEC/TAD/TR (inclusive nos tetos) contaria carga horária de forma normativamente incorreta.

**Independent Test**: Lançar um registro de Estudo Individual e confirmar que ele (a) não aparece nem afeta o cálculo dos tetos de AEC/TAD/TR, e (b) aparece acompanhado, separadamente, contra a referência de 10%.

**Acceptance Scenarios**:

1. **Given** o Operador lançando Estudo Individual, **When** ele tenta escolher escopo Global, **Then** o sistema não permite — Estudo Individual é sempre de Turma.
2. **Given** registros de Estudo Individual já lançados para uma turma, **When** os tetos de AEC/TAD/TR daquele curso são calculados, **Then** o Estudo Individual não entra em nenhum dos três — fica fora da fórmula CHT = CHD + AEC + TAD + TR.
3. **Given** uma turma com Estudo Individual lançado, **When** o Operador consulta o acompanhamento, **Then** vê o total comparado à referência de 10% das horas-aula diárias (regime aplicável ao CIAARA, sem Estudo Obrigatório), de forma informativa, sem qualquer sinalização de bloqueio ou teto ultrapassado — e sem exigir lançamento algum, já que Estudo Individual é facultativo.

---

### User Story 4 - Lançar Avaliação/Vista de Prova computando automaticamente a CHD (Priority: P4)

Como Operador, quero lançar uma Avaliação ou Vista de Prova vinculada a uma disciplina e ver essa carga horária contar corretamente para a CHD daquela disciplina, no mesmo ato do lançamento, sem exigir um segundo lançamento manual para "confirmar" a execução.

**Why this priority**: Fecha a taxonomia de cinco categorias no lado "vinculado a disciplina" (RF-DSA-01) — sem isso, CHD continua incompleta mesmo com AEC/TAD/TR/Estudo Individual corretos.

**Independent Test**: Lançar uma avaliação vinculada a uma disciplina de turma de teste e confirmar que a CHD da disciplina aumenta no mesmo lançamento, sem exigir uma segunda tela ou um segundo registro para "marcar como aplicada".

**Acceptance Scenarios**:

1. **Given** o Operador lançando uma Avaliação/Vista de Prova vinculada a uma disciplina de uma turma, **When** ele salva o lançamento com os tempos de aula consumidos, **Then** esse valor soma imediatamente à CHD daquela disciplina.
2. **Given** o mesmo lançamento, **When** o Operador designa o instrutor responsável pela aplicação, **Then** o sistema não exige que esse instrutor tenha habilitação registrada na disciplina para o papel de fiscal (RN-INST-01 delimitada) — a habilitação continua exigida apenas para quem ministra a Aula.
3. **Given** uma Avaliação/Vista de Prova já lançada, **When** o Operador ou qualquer usuário consulta a disciplina, **Then** não existe um segundo registro paralelo de "execução" a conciliar manualmente — é o mesmo fato.

---

### User Story 5 - Ver as cinco categorias totalizadas separadamente no Cronograma, DSA e Relatório (Priority: P5)

Como usuário do Cronograma, do Detalhe Semanal de Aula e do Relatório, quero ver as cinco categorias (Aula/CHD, Avaliação/Vista, AEC, TAD, TR, Estudo Individual) totalizadas separadamente em cada tela que hoje mostra "evento extracurricular" como bloco único, para entender exatamente como a carga horária de uma turma se compõe.

**Why this priority**: É o critério de aceite de alto nível do próprio Épico E (documento 06) e o RF-CRONOS-04 — sem isso, as quatro histórias anteriores entregam dado correto que ninguém consegue enxergar diferenciado.

**Independent Test**: Abrir o Cronograma, o DSA e o Relatório de uma turma de teste com lançamentos nas cinco categorias e confirmar que cada tela totaliza as cinco separadamente, sem nenhuma soma cruzada entre Aula/Avaliação e as quatro não-letivas.

**Acceptance Scenarios**:

1. **Given** uma turma com lançamentos nas cinco categorias, **When** o Cronograma da turma é aberto, **Then** AEC, TAD, TR e Estudo Individual aparecem totalizados cada um separadamente, nunca somados entre si nem à execução de uma disciplina específica.
2. **Given** a mesma turma, **When** o DSA semanal é aberto, **Then** todo lançamento AEC/TAD/TR/Estudo Individual da semana aparece refletido automaticamente na grade, sem exigir uma segunda ação para "sincronizar".
3. **Given** a mesma turma, **When** o Relatório do curso é gerado, **Then** Aula e Avaliação/Vista de Prova aparecem somadas na CHD de cada disciplina, e nunca dentro do agrupamento não letivo (AEC/TAD/TR/Estudo Individual).

### Edge Cases

- O que acontece quando um curso ainda não tem nenhuma disciplina cadastrada em `disciplinas` (denominador zero para o cálculo do teto de AEC, que é percentual da soma curricular de CHD — não deveria ocorrer em operação normal, já que grade curricular é pré-requisito do curso existir, mas é um estado de dado possível durante cadastro)? O sistema exibe que ainda não há base de cálculo, em vez de erro ou divisão por zero.
- O que acontece quando uma turma não tem nenhum lançamento de Estudo Individual? Nada é sinalizado como pendência ou erro — Estudo Individual é facultativo, e o acompanhamento informativo simplesmente mostra 0% até que algo seja lançado.
- O que acontece se `config_parametros` não tiver o teto configurado para o ano corrente de um curso (lacuna de configuração, não de código — RNF-MAN-04)? Degradação segura: alerta neutro informando ausência de configuração, nunca uma exceção não tratada (RN-DEG-01).
- O que acontece se o Operador tentar lançar Estudo Individual com escopo Global? O sistema não permite — Estudo Individual é sempre de Turma (RF-EXTRA-02).
- O que acontece com um lançamento AEC/TAD/TR de escopo Global quando uma turma nova é ativada depois da data do lançamento? O lançamento se aplica a todas as turmas ativas *na data* — uma turma ativada depois não é retroativamente incluída, mas passa a ser considerada em qualquer novo lançamento Global futuro.
- O que acontece quando um teto de curso já ultrapassado recebe mais um lançamento da mesma categoria? O alerta é reforçado (percentual mais alto), mas o lançamento continua sendo permitido — nunca bloqueado.
- O que acontece com os 664 registros históricos de `atividades_nao_letivas` já migrados (Épico C) quando estas telas entram em produção? Eles aparecem exibidos e totalizados normalmente pelas categorias já atribuídas na migração — nenhuma reclassificação ocorre nesta feature.

## Requirements *(mandatory)*

### Functional Requirements

**Lançamento nas cinco categorias (User Story 1)**

- **FR-001**: O sistema DEVE permitir lançar, para um dia específico de uma turma, um registro em uma das cinco categorias: Aula, Avaliação/Vista de Prova, AEC, TAD, TR, ou Estudo Individual (RF-DSA-01).
- **FR-002**: Todo lançamento AEC, TAD ou TR DEVE informar escopo Global (todas as turmas ativas na data) ou de uma Turma específica (RF-EXTRA-02).
- **FR-003**: Todo lançamento não vinculado a disciplina (AEC/TAD/TR/Estudo Individual) DEVE informar data, tempos de aula consumidos, descrição e observações (RF-EXTRA-01).
- **FR-004**: O sistema DEVE permitir lançar atividades não vinculadas a disciplina tanto a partir do Detalhe Semanal de Aula quanto de um módulo dedicado (RF-EXTRA-01).
- **FR-005**: Todo lançamento novo DEVE ter uma categoria normativa explícita — o sistema nunca aceita um lançamento sem categoria definida.

**Tetos normativos de AEC/TAD/TR (User Story 2)**

- **FR-006**: O sistema DEVE calcular e sinalizar, por curso, o cumprimento de três tetos: AEC ≤ 10% do somatório das CHD das disciplinas do curso; TAD ≤ 5% da Carga Horária Real (CHR); TR ≤ 10% da CHR (RF-EXTRA-04, RNF-NORM-02). CHD e CHR são os totais **curriculares** do curso — o somatório de `Carga_Horaria_Tempos` cadastrado em `disciplinas` (Glossário DEnsM §2: CHR = "somatório estrito das cargas horárias de todas as disciplinas integrantes do currículo") —, não uma soma do que já foi efetivamente executado até a data; o teto é um percentual estável do orçamento de horas do curso, não um alvo que se move conforme aulas são lançadas ao longo do ano.
- **FR-007**: Os limites dos três tetos DEVEM ser lidos de uma tabela de parâmetros administrável, nunca de um valor fixo no código (RNF-NORM-08) — a tabela já existe (`config_parametros`, entregue pelo Épico C).
- **FR-008**: Ultrapassar qualquer um dos três tetos DEVE gerar um alerta explícito com a justificativa (percentual atual vs. limite) — nunca um bloqueio do lançamento (RN-DEG-02).

**Estudo Individual (User Story 3)**

- **FR-009**: O sistema DEVE permitir lançar Estudo Individual (incluindo Monitoria e apoio de idiomas) numa categoria própria, sempre de escopo Turma — nunca Global (RF-EXTRA-01/02).
- **FR-010**: Estudo Individual NUNCA DEVE compor nenhum dos três tetos de AEC/TAD/TR, nem a soma CHT = CHD + AEC + TAD + TR.
- **FR-011**: O sistema DEVE acompanhar Estudo Individual informativamente contra a referência de 10% das horas-aula diárias (regime aplicável ao CIAARA — sem Estudo Obrigatório, decisão de esclarecimento de 2026-08-14), sem gerar alerta de teto ultrapassado e sem exigir lançamento algum — Estudo Individual é facultativo, nunca obrigatório.

**Avaliação/Vista de Prova (User Story 4)**

- **FR-012**: O sistema DEVE permitir lançar uma Avaliação ou Vista de Prova vinculada a uma disciplina, com os tempos de aula consumidos somando automaticamente à CHD daquela disciplina no mesmo ato (RN-EVT-03) — sem exigir um segundo lançamento para "confirmar execução".
- **FR-013**: O lançamento de Avaliação/Vista de Prova NÃO DEVE exigir habilitação do instrutor responsável pela aplicação na disciplina — essa exigência vale apenas para quem ministra Aula (RN-INST-01 delimitada); o papel de fiscal pode ser exercido por qualquer pessoa, inclusive alguém não cadastrado como instrutor.

**Totalização separada por categoria (User Story 5)**

- **FR-014**: Todo lançamento AEC/TAD/TR/Estudo Individual DEVE refletir automaticamente no Detalhe Semanal de Aula, no Relatório do curso e no Cronograma da(s) turma(s) afetada(s), sem exigir uma ação manual de sincronização (RF-EXTRA-03).
- **FR-015**: O Cronograma, o Relatório e o Detalhe Semanal de Aula DEVEM totalizar as cinco categorias (Aula/CHD, Avaliação/Vista, AEC, TAD, TR, Estudo Individual) separadamente, sem que uma seja somada ou confundida com outra (RF-CRONOS-04).
- **FR-016**: Lançamentos de Aula e de Avaliação/Vista de Prova, por comporem a CHD de uma disciplina, NUNCA DEVEM entrar no agrupamento não letivo (AEC/TAD/TR/Estudo Individual) de nenhuma tela ou cálculo (RF-CRONOS-04).

### Key Entities *(include if feature involves data)*

Esta feature **consome** entidades já entregues pelo Épico C, sem alterar seu schema:

- **atividades_nao_letivas**: já tem `Categoria_Normativa` (AEC/TAD/TR/Estudo_Individual) e `Compoe_CHT` preenchidos nos 664 registros históricos; esta feature passa a lançar e exibir novos registros através dela.
- **avaliacoes**: já unifica agendamento e execução (`Tempos_Consumidos`, `TA_Inicial`); esta feature constrói a tela/fluxo de lançamento sobre essa estrutura já existente.
- **config_parametros**: já contém os tetos AEC/TAD/TR e a referência informativa de Estudo Individual (10% — CIAARA sem regime de Estudo Obrigatório); esta feature lê esses valores, nunca os grava.
- **registros_aula**: já tem `Categoria_Normativa` (Aula/Atividade_Extraclasse); consumida para os totalizadores de CHD.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos lançamentos novos feitos após a implementação desta feature têm uma categoria normativa explícita — zero lançamentos sem categoria aceitos pelo sistema.
- **SC-002**: Os três tetos normativos (AEC/TAD/TR) aparecem calculados e sinalizados para 100% dos 24 cursos ativos, recalculados automaticamente a cada novo lançamento relevante, sem necessidade de ação manual de recálculo.
- **SC-003**: Zero lançamentos são bloqueados por ultrapassagem de teto — 100% dos casos de ultrapassagem geram alerta explícito, e o lançamento é sempre aceito.
- **SC-004**: As cinco categorias aparecem totalizadas separadamente em 100% das telas (Cronograma, DSA, Relatório) que hoje tratam "evento extracurricular" como categoria única.
- **SC-005**: Os totalizadores exibidos para os 664 registros históricos já migrados batem exatamente com o dado de origem (Estudo Individual 531, AEC 62, TAD 60, TR 11) — zero divergência entre o dado migrado e o que a tela exibe.
- **SC-006**: 100% dos lançamentos de Avaliação/Vista de Prova somam à CHD da disciplina no mesmo ato de lançamento — zero casos exigindo um segundo lançamento manual para a carga horária ser contabilizada.

## Assumptions

- A banco da v2.1 precisa estar publicada como banco Supabase em produção, com o projeto Supabase e o repositório Next.js criado e vinculado a ela, antes desta feature poder ser implementada — pré-requisito operacional (RNF-PLAT-01), ainda pendente no momento desta especificação, e fora do escopo funcional desta spec (mesmo padrão de fronteira já usado no Épico C).
- O módulo dedicado de acompanhamento de Avaliações (situação de execução — Concluída/Em andamento/Pendente/Atrasada/Sem correspondência —, papel de fiscal, tela de dashboard) é escopo do Épico I (Simplificação do Módulo de Avaliações), não desta feature. Esta feature cobre apenas o lançamento de Avaliação/Vista de Prova e o cômputo automático de CHD (User Story 4) — a base mínima que RF-DSA-01 exige para fechar a taxonomia de cinco categorias.
- A detecção de conflito de horário/instrutor entre lançamentos (RN-CONF-01) não é escopo desta feature — já é uma pendência rastreada (`tests/unidade/pendentes.test.ts`) para quando o Detalhe Semanal de Aula for revisado.
- Os dados consumidos por esta feature (categorias, tetos, estrutura de `avaliacoes`) já estão corretos e migrados pelo Épico C — esta feature não remigra nem corrige dado, apenas constrói a camada de aplicação sobre ele.
- Segue a restrição de plataforma não-negociável do projeto (Next.js + PostgreSQL + React + Tailwind CSS, `o App Router`/a importação de componentes, deploy manual) — constitution, Princípio III.
