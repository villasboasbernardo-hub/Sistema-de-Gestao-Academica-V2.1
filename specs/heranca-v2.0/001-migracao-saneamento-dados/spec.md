# Feature Specification: Épico C — Migração e Saneamento da Base de Dados

**Feature Branch**: `001-migracao-saneamento-dados`

**Created**: 2026-08-13

**Status**: Draft

**Input**: User description: "Épico C do documento 06 — Migração e Saneamento da Base de Dados."

**Fontes primárias**: `docs/fase-1/06-Backlog-de-Epicos-V2.md` (Épico C), `docs/fase-1/05-Modelo-de-Dados-Conceitual.md` (achados a–o, seção 7 — migração confirmada), `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md` (RN-MAT-02/05, RN-INST-05, RN-AVAL-02, RN-EVT-01, RN-2027-09, RN-ANT-02, RN-CRUD-03), `docs/fase-1/03-Requisitos-Nao-Funcionais.md` (RNF-BKP-02, RNF-MAN-04, RNF-NORM-01/02/03/08, RNF-PLAT-02), `docs/fase-1/09-Relatorio-de-Auditoria-Fase-1.md` (achados A-1 a A-11, recomendações R-1/R-2/R-3, propostas P-1/P-3/P-4/P-6/P-7/P-11/P-12, todas aprovadas em 01/08/2026).

## Nota de escopo e sequenciamento

O documento 06 é explícito: as propostas P-1, P-3, P-4, P-6, P-7, P-11 e P-12 — todas alterações de modelo de dados aprovadas em 01/08/2026 — são executadas **numa única migração**, não em passes separados, para não multiplicar risco e retrabalho (nota de consolidação, recomendação R-1 do documento 09). As histórias de usuário abaixo são priorizadas para fins de **verificação independente** (cada uma tem seu próprio critério de aceite testável contra a suíte de invariantes estruturais) e para orientar a ordem de risco, mas a execução real desta migração — corte da banco de produção para a nova estrutura — acontece como um único evento auditável, não como entregas incrementais em produção.

## Clarifications

### Session 2026-08-14

- Q: A migração deve ser executada com o sistema em janela de manutenção (fora do ar para os usuários) até o corte para a nova estrutura, ou precisa continuar aceitando uso ao vivo enquanto os dados são transportados? → A: Opção A — janela de manutenção: o sistema fica indisponível para lançamentos durante a migração; o snapshot é a fonte congelada; o corte para a nova estrutura só ocorre após validação completa.
- Q: O conteúdo hoje em `Planejamento_2027` deve ser convertido num registro oficial de `planejamento_anual` para o ano 2027 durante a migração, ou fica apenas preservado como referência histórica inerte, sem entrar na nova estrutura versionada? → A: Opção B — preservar sem converter: `Planejamento_2027` permanece apenas como referência histórica somente-leitura; `planejamento_anual` nasce vazia, sem um registro oficial pré-existente para 2027.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Snapshot de segurança e trilha de auditoria da migração (Priority: P1)

Como responsável técnico pela migração, preciso que um snapshot completo da banco de produção seja tirado imediatamente antes de qualquer ação de saneamento, e que cada ação de transformação de dado fique registrada num log de auditoria apenas-acrescenta, para poder reverter a migração inteira ou rastrear qualquer decisão tomada, sem nunca sobrescrever ou apagar o registro de uma ação já executada.

**Why this priority**: É o envelope de segurança que autoriza todas as demais histórias. Nenhuma outra ação de saneamento desta migração pode começar sem isto — regra 4 do `CLAUDE.md` do projeto e RNF-BKP-02 (documento 03).

**Independent Test**: Executar a rotina de snapshot isoladamente, confirmar que a cópia é completa e íntegra (mesma contagem de linhas por aba que a banco de produção), e confirmar que uma entrada é acrescentada em `migracao_log` sem alterar nenhuma linha pré-existente do log.

**Acceptance Scenarios**:

1. **Given** a banco de produção da V1.0 com suas 14 abas atuais, **When** a rotina de snapshot é executada, **Then** existe uma cópia completa e somente-leitura, com contagem de linhas idêntica à origem, identificável por data/hora da execução.
2. **Given** um snapshot já existente de uma execução anterior, **When** uma nova ação de migração é registrada, **Then** uma nova linha é acrescentada a `migracao_log` e nenhuma linha anterior do log é alterada ou removida.
3. **Given** uma migração já concluída e um problema identificado posteriormente, **When** a reversão é solicitada, **Then** é possível restaurar o estado anterior a partir do snapshot, sem depender de memória ou de reconstrução manual.
4. **Given** a janela de manutenção declarada para a migração, **When** qualquer usuário tenta lançar ou editar dado na banco de produção durante essa janela, **Then** a tentativa é bloqueada ou impedida (sistema indisponível para escrita), garantindo que o snapshot permaneça a única fonte congelada até o corte.

---

### User Story 2 - Recategorização normativa das atividades letivas (Priority: P2)

Como desenvolvedor, quero que os 663 lançamentos hoje agrupados sob `atividades_nao_letivas.Tipo` sejam recategorizados nas categorias normativas finais — CHD (Aula/Avaliação-Vista, vinculada a disciplina), AEC, TAD, TR e Estudo Individual —, usando exatamente a tabela de-para do documento 05 §7.1, para que os tetos normativos (10% AEC, 5% TAD, 10% TR) possam ser calculados e sinalizados corretamente.

**Why this priority**: É o item de maior volume de dado (663 de ~2.500 registros totais da base) e o único achado classificado como Risco Alto tanto no RN-EVT-01 quanto no RNF-NORM-02; sem ele, nenhum outro módulo (Épico E, e os tetos do RNF-NORM-02) pode ser construído sobre dado confiável.

**Independent Test**: Rodar a recategorização isoladamente sobre uma cópia dos 663 registros e comparar o resultado, linha a linha, contra a tabela de-para do documento 05 §7.1; o total por categoria de destino deve fechar exatamente em Estudo Individual: 531, AEC: 62, TAD: 59, TR: 11.

**Acceptance Scenarios**:

1. **Given** os 663 registros de `atividades_nao_letivas` com seus 13 valores de `Tipo` atuais, **When** a recategorização é aplicada, **Then** cada registro recebe um valor de `Categoria_Normativa` em (`AEC`, `TAD`, `TR`, `Estudo_Individual`) conforme a tabela de-para, e a soma por categoria fecha em 531/62/59/11.
2. **Given** um novo lançamento feito após a migração, **When** o usuário salva o registro, **Then** o preenchimento de `Categoria_Normativa` é obrigatório — não há mais categoria residual sem classificação.
3. **Given** um lançamento de Aula ou de Avaliação/Vista de prova vinculado a uma disciplina, **When** a carga horária é totalizada, **Then** ele conta para a CHD da disciplina e nunca é somado a AEC, TAD ou TR.
4. **Given** um lançamento de Estudo Individual, Monitoria ou Português para Estrangeiros, **When** os tetos de AEC/TAD/TR são calculados, **Then** esse registro não entra em nenhum dos três tetos (fica fora da fórmula CHT = CHD + AEC + TAD + TR).

---

### User Story 3 - Unicidade de disciplina por curso e correção de duplicatas (Priority: P3)

Como Admin, quero que a duplicata `C-Esp-ALH`/`ALH-II` (achado A-10, encontrada em 31/07/2026) seja corrigida na migração, com todo o histórico de aulas já lançado contra ela redirecionado para a disciplina remanescente, e que o contorno de leitura específico do C-Ap-FR seja substituído por uma validação genérica de unicidade `ID_Curso` + `Cod_Disciplina`, aplicável a qualquer curso, presente ou futuro.

**Why this priority**: RN-MAT-02 é classificada como Risco Alto por ser a única regra de dedução silenciosa de identidade do sistema; deixar duas disciplinas duplicadas sem correção genérica significa que a próxima duplicata (em qualquer outro curso) volta a contar carga horária em duplicidade sem que ninguém perceba.

**Independent Test**: Consultar `disciplinas` pós-migração agrupando por `ID_Curso` + `Cod_Disciplina`; nenhum par deve ter mais de uma linha. Tentar cadastrar uma disciplina duplicada manualmente e confirmar que o sistema alerta o usuário em vez de aceitar silenciosamente.

**Acceptance Scenarios**:

1. **Given** as duas linhas de `ALH-II` sob `C-Esp-ALH`, **When** a migração é executada, **Then** apenas uma linha remanescente existe, e qualquer aula historicamente lançada contra a linha removida aparece migrada para a linha remanescente, sem perda de registro.
2. **Given** a nova estrutura de dados, **When** qualquer leitura de disciplinas usada em cálculo (painel, Cronograma, DSA, motor preditivo) é executada, **Then** ela não depende mais de nenhuma função de contorno específica do C-Ap-FR — essa função é aposentada.
3. **Given** um usuário tentando cadastrar uma nova disciplina com `ID_Curso` + `Cod_Disciplina` já existentes, **When** ele salva, **Then** o sistema bloqueia ou alerta explicitamente sobre a duplicidade, para qualquer curso.

---

### User Story 4 - Status explícito do instrutor (Priority: P4)

Como Admin, quero que todos os 177 instrutores migrem com o campo `Status` explicitamente preenchido ("Ativo" ou "Inativo"), nunca em branco, para que a exclusão lógica (soft delete) hoje implementada em código, mas nunca exercitada sobre dado real, passe a ser testável.

**Why this priority**: Achado A-11/RN-INST-05 — pré-condição obrigatória para que a Fase 4 consiga sequer testar o caminho de desativação/reativação de instrutor; hoje não existe nenhum instrutor inativo na base para servir de caso de teste.

**Independent Test**: Consultar `instrutores` pós-migração e confirmar que 100% das 177 linhas têm `Status` = "Ativo" ou "Inativo" (nenhuma célula em branco); desativar um instrutor de teste e confirmar que ele some das opções de novas atribuições, mas continua aparecendo em histórico já lançado.

**Acceptance Scenarios**:

1. **Given** os 177 instrutores com `Status` hoje em branco, **When** a migração é executada, **Then** todos os 177 recebem `Status` = "Ativo" (valor padrão explícito, na ausência de qualquer indicação em contrário nos dados de origem).
2. **Given** um instrutor com `Status` = "Inativo" pós-migração, **When** qualquer tela de novo lançamento de aula ou nova atribuição de disciplina é aberta, **Then** esse instrutor não aparece entre as opções.
3. **Given** o mesmo instrutor inativo, **When** um relatório, Cronograma ou DSA histórico que já o referencia é consultado, **Then** seu nome e posto continuam aparecendo corretamente.

---

### User Story 5 - Fusão de agendamento e execução de avaliação (Priority: P5)

Como Operador, quero que agendar uma avaliação e registrar sua execução sejam o mesmo fato (`avaliacoes` com `Tempos_Consumidos`/`TA_Inicial`), com os 111 agendamentos e 186 execuções hoje desencontrados conciliados num único registro por avaliação, para que a carga horária de avaliação nunca fique subdimensionada por falta de um segundo lançamento manual.

**Why this priority**: RN-AVAL-02/achado A-5 é Risco Alto — a falha estrutural atual (111 agendados x 186 execuções sem correspondência garantida) já causa subdimensionamento sistemático de carga horária de disciplina.

**Independent Test**: Reconciliar os 111 registros de `avaliacoes_planejadas` (agendamento) contra os 186 registros de execução tipo "Avaliação" pós-migração; todo registro de execução deve ter um agendamento correspondente (criado retroativamente quando ausente), e nenhum agendamento deve ficar duplicado.

**Acceptance Scenarios**:

1. **Given** os 111 agendamentos e os 186 registros de execução da base viva, **When** a migração concilia os dois conjuntos, **Then** cada execução fica associada a exatamente um registro de `avaliacoes`, e nenhum registro histórico de execução é descartado.
2. **Given** um registro de execução sem agendamento prévio correspondente na base viva, **When** a migração processa esse caso, **Then** um agendamento retroativo é criado para preservar o histórico, documentado no log de migração.
3. **Given** o novo modelo pós-migração, **When** um Operador agenda uma nova avaliação, **Then** o consumo de tempos de aula (`Tempos_Consumidos`/`TA_Inicial`) já é registrado no mesmo ato, sem exigir um segundo lançamento para marcar a execução.

---

### User Story 6 - Dados de configuração administráveis (calendário PROENS e limites normativos) (Priority: P6)

Como responsável pelo planejamento anual, quero que as regras do PROENS hoje fixas em ``lib/` (monólito da v1.0, hoje dividido por domínio)` (feriados, janelas de curso, reservas de Administração/Tempo Reserva) e os limites normativos de conformidade (tetos 10%/5%/10%, faixas de carga horária docente por regime, limites de TA diário por curso) se tornem dados administráveis na nova estrutura, para não precisar editar e reimplantar código todo ano, e para que qualquer revisão normativa futura da DGPM/DEnsM seja uma edição de dado, não uma reescrita de código.

**Why this priority**: RNF-MAN-04 (achado e) é citada como "a recomendação de saneamento de maior impacto de manutenção de todo o levantamento"; RNF-NORM-08 estende o mesmo princípio aos limites de conformidade (recomendação R-3). Sem isto, o motor preditivo multi-ano do Épico G não tem onde buscar dado de anos diferentes de 2027.

**Independent Test**: Popular o catálogo administrável com os valores hoje hard-coded para 2027 e para o ano corrente; confirmar que o motor preditivo lê os valores exclusivamente do catálogo (nenhuma constante anual permanece em ``lib/` (monólito da v1.0, hoje dividido por domínio)`); alterar um valor no catálogo e confirmar que o próximo cálculo reflete a mudança sem reimplantação de código.

**Acceptance Scenarios**:

1. **Given** as constantes `FERIADOS_2027`, `SEMENTES_2027` e `RESERVAS_PROENS` hoje em código, **When** a migração é executada, **Then** elas passam a existir como dado administrável (feriados por ano, janelas de curso por ano, reservas de Administração/Tempo Reserva por curso/ano), e o código passa a ser apenas consumidor desses dados.
2. **Given** os limites normativos de conformidade (10% AEC, 5% TAD, 10% TR, faixas 8-12h/16-24h/16-30h por regime, limites de TA diário por curso), **When** a migração é executada, **Then** eles existem como tabela de parâmetros administrável, com identificação da norma de origem, e não como literal na lógica do Next.js.
3. **Given** um ano futuro qualquer diferente de 2027, **When** o Encarregado cadastra o calendário desse ano no catálogo administrável, **Then** o motor preditivo consegue simular esse ano sem qualquer alteração de código.

---

### User Story 7 - Planejamento anual como dado versionado (Priority: P7)

Como Encarregado/Ajudante da Divisão de Administração Acadêmica, quero que o planejamento anual passe a ser um dado de primeira classe, versionado por ano, com um estado de rascunho editável antes de ser salvo como oficial (`planejamento_anual`, `Status_Previa`), substituindo a aba temporária e descartável `Planejamento_2027`.

**Why this priority**: Depende do catálogo administrável da User Story 6 e do motor multi-ano (Épico G); prioridade mais baixa dentro desta migração porque o valor pleno só se realiza quando o Épico G consumir esta estrutura, mas o modelo de dados precisa existir desde já para não reabrir a estrutura depois.

**Independent Test**: Gerar uma prévia para um ano de teste, editá-la manualmente, salvá-la como oficial, e confirmar que o registro salvo é versionado por ano e distinto de qualquer prévia não salva; confirmar que `Planejamento_2027` deixa de ser referenciada por qualquer função ativa.

**Acceptance Scenarios**:

1. **Given** uma prévia gerada pelo motor preditivo para um ano, **When** o usuário a edita manualmente antes de salvar, **Then** as edições são preservadas ao salvar como planejamento oficial daquele ano.
2. **Given** um planejamento já salvo como oficial para o ano N, **When** uma nova prévia é gerada para o ano N+1, **Then** o planejamento oficial do ano N não é alterado nem substituído.
3. **Given** a estrutura `planejamento_anual` pós-migração, **When** qualquer módulo do sistema precisa do planejamento de um ano, **Then** nenhuma leitura ativa depende mais da antiga tabela `Planejamento_2027`.

---

### User Story 8 - Vigência de regime de horário e modo de atribuição de disciplina (Priority: P8)

Como responsável pelo planejamento, quero registrar uma data de vigência sempre que o regime/horário de um curso mudar no meio do ano (`curso_regime_historico`, generalizando RN-2027-09), com o histórico anterior preservado e imutável; e, como Operador, quero cadastrar o modo de atribuição de uma disciplina — dividido entre instrutores ou simultâneo — refletido em `Instrutor_Materia`/`disciplinas` (RN-MAT-05).

**Why this priority**: Ambos são mudanças de modelo de dados aprovadas (P-4 e P-7) que habilitam cálculos hoje incorretos ou ausentes (mudança de regime "apenas informativa" e carga horária de disciplinas de encerramento de curso subdimensionada quando há mais de um instrutor simultâneo), mas nenhum dos dois é bloqueante para os itens de maior volume/risco acima.

**Independent Test**: Cadastrar uma mudança de regime com data de vigência futura para um curso de teste e confirmar que registros históricos anteriores à data continuam sendo lidos com a configuração antiga; marcar uma disciplina de encerramento de curso (ex.: Prática de Fim de Curso) como modo simultâneo com dois instrutores e confirmar que cada um acumula a carga horária integral, não dividida.

**Acceptance Scenarios**:

1. **Given** um curso com mudança de regime cadastrada para uma data de vigência dentro de sua janela, **When** um registro histórico anterior a essa data é consultado, **Then** ele é interpretado com a configuração de regime vigente na data do próprio registro, nunca com a nova.
2. **Given** uma disciplina com dois instrutores designados em modo "dividido" (padrão), **When** a carga horária prevista é calculada, **Then** os instrutores repartem entre si a carga horária total da disciplina.
3. **Given** uma disciplina de encerramento de curso (Prática de Fim de Curso, Levantamento Hidrográfico de Fim de Curso, Prática de Manutenção de Auxílios à Navegação) marcada como modo "simultâneo", **When** a carga horária prevista é calculada, **Then** cada instrutor designado acumula a carga horária integral da disciplina.

---

### User Story 9 - Saneamento estrutural residual (Priority: P9)

Como Admin e como desenvolvedor, quero que os itens estruturais menores, mas ainda pendentes de decisão, sejam resolvidos nesta mesma migração: popular `responsaveis_curso` (hoje vazia, causa raiz do DSA impresso sem assinatura), consolidar `Carga_Horaria`/`Carga_Horaria_Tempos` num único nome canônico, corrigir as colunas de data fora do padrão de nome, corrigir a Configuração E de horário (e equivalentes) para reservar a janela de almoço, e registrar a decisão sobre a coluna órfã `Antiguidade` e os campos órfãos `Formula_MF`/`Carater`.

**Why this priority**: Cada item individualmente é Risco Baixo/Médio, mas o critério de aceite do Épico C exige que **todos** os achados (a–k) do documento 05 tenham decisão registrada antes da migração ser considerada concluída — por isso entram nesta migração, na prioridade mais baixa por não bloquearem nenhum outro módulo.

**Independent Test**: Imprimir um Detalhe Semanal de Aula de um curso de teste pós-migração e confirmar que o rodapé de assinaturas sai preenchido; consultar o schema pós-migração e confirmar um único nome de coluna para carga horária; consultar a Config E pós-migração e confirmar que a janela de almoço (12h–13h) está reservada; confirmar que `Antiguidade`, `Formula_MF` e `Carater` aparecem documentados como legado, não removidos fisicamente.

**Acceptance Scenarios**:

1. **Given** a tabela `responsaveis_curso` vazia, **When** a migração é executada, **Then** ela é populada com os responsáveis de cada curso, e o Detalhe Semanal de Aula impresso passa a sair com as assinaturas corretas.
2. **Given** a duplicidade de nome `Carga_Horaria`/`Carga_Horaria_Tempos`, **When** a migração é executada, **Then** existe um único nome canônico na nova estrutura, sem leitura tolerante a dois nomes.
3. **Given** a Configuração E de horário (e equivalentes, ex. `C-ApA-OcOp-PR-SP`), **When** a migração é executada, **Then** a janela de almoço (aulas de 11h20 a 13h45) passa a reservar o intervalo de 12h–13h, sem alterar a interpretação de registros históricos anteriores à data de vigência (User Story 8).
4. **Given** as colunas `Antiguidade`, `Formula_MF` e `Carater`, **When** a migração é concluída, **Then** cada uma tem uma decisão registrada e documentada (mantidas como legado/informativas, não removidas fisicamente nesta migração), disponível para quem mantiver o sistema no futuro.

### Edge Cases

- O que acontece quando um registro histórico de aula referencia a linha duplicada de disciplina removida (`ALH-II` ou qualquer duplicata futura)? Deve ser redirecionado para a linha remanescente, nunca ficar órfão ou ser descartado (mesmo comportamento hoje garantido pelo contorno de leitura do C-Ap-FR, agora generalizado).
- O que acontece quando um dos 663 registros de `atividades_nao_letivas` tem um valor de `Tipo` que não consta na tabela de-para do documento 05 §7.1 (por exemplo, um lançamento criado entre a extração de 31/07/2026 e a execução real da migração)? A migração deve sinalizar esse registro explicitamente para decisão manual, nunca classificá-lo silenciosamente numa categoria por padrão.
- O que acontece com um registro de execução de avaliação (dos 186) que não tem nenhum agendamento correspondente, nem por nome normalizado nem por data/turma plausível? Um agendamento retroativo é criado a partir do registro de execução, e o caso é anotado no log de migração para revisão humana posterior.
- O que acontece se, após a migração, for encontrado um novo par duplicado de `ID_Curso` + `Cod_Disciplina` em qualquer curso (não apenas C-Ap-FR ou C-Esp-ALH)? A validação genérica de unicidade deve alertar no momento do cadastro, em vez de permitir a duplicata e depender de uma nova rodada de auditoria para descobri-la.
- O que acontece com um instrutor que, na base viva, já tenha algum indício textual de estar inativo (ex.: observação em campo livre), mas cujo `Status` estava em branco? Na ausência de um campo estruturado confiável, o padrão desta migração é "Ativo" para todos os 177 (User Story 4); qualquer correção individual baseada em conhecimento operacional é uma ação pós-migração do Admin, não uma inferência automática da migração.
- O que acontece se a reversão a partir do snapshot (User Story 1) for solicitada depois que novos lançamentos já foram feitos na estrutura nova? A reversão restaura o estado anterior à migração; os lançamentos feitos apenas na estrutura nova ficam registrados no log de migração para reconciliação manual, nunca silenciosamente perdidos.
- O que acontece com uma mudança de regime de horário cadastrada com data de vigência retroativa (no passado)? Como RN-2027-09 exige que o histórico seja sempre lido com a configuração vigente na data do próprio registro, uma vigência retroativa recalcula a interpretação de todo o histórico entre a data de vigência e hoje — esse caso deve gerar um alerta explícito antes de ser salvo, dado o impacto potencial sobre relatórios já emitidos.

## Requirements *(mandatory)*

### Functional Requirements

**Segurança e auditoria da migração (User Story 1)**

- **FR-001**: O sistema DEVE gerar um snapshot completo e íntegro da banco de produção imediatamente antes de qualquer ação de saneamento de dado (RNF-BKP-02).
- **FR-002**: O sistema DEVE registrar toda ação de transformação de dado da migração em um log de auditoria apenas-acrescenta (`migracao_log`), nunca reescrevendo ou removendo uma linha já registrada.
- **FR-003**: O sistema DEVE permitir reverter a migração para o estado do snapshot, sem depender de reconstrução manual.
- **FR-004**: A migração DEVE preservar 100% do histórico de aula, avaliação e evento já lançado — nenhum registro pode ser perdido ou tornado irrecuperável.
- **FR-004a**: A migração DEVE ocorrer dentro de uma janela de manutenção declarada, com o sistema indisponível para lançamento/edição de dados na banco de produção durante essa janela, de forma que o snapshot (FR-001) permaneça a única fonte congelada até o corte para a nova estrutura ser concluído e validado. **Nota de escopo (`/speckit-analyze`, 2026-08-14 — achado I1):** este requisito se aplica ao evento de **corte V1.0→V2.0** (publicação do banco nova como banco Supabase em produção), que ainda não ocorreu e está fora do escopo funcional desta spec (ver Assumptions). A transformação de dados descrita nas demais FRs desta seção **já foi aplicada** à cópia de trabalho `.xlsx`, antes deste ciclo Spec-Kit começar, sem uma janela de manutenção formalmente declarada — porque não havia usuário ao vivo a interromper: a cópia de trabalho é offline e nunca esteve conectada à planilha V1.0 em produção. A garantia de segurança equivalente foi obtida por outra via (planilha V1.0 intocada e com snapshot próprio em `baseline/v1-snapshot/`, backups de arquivo irmão a cada script, `migracao_log` apenas-acrescenta) — o espírito do requisito foi cumprido, ainda que não pelo mecanismo literal de "janela declarada". As correções residuais desta feature (User Stories 2–5, ver FR-032 a FR-034) seguem o mesmo modelo: operam só sobre a cópia de trabalho offline, portanto sem necessidade de janela de manutenção própria.

**Recategorização normativa de atividades (User Story 2)**

- **FR-005**: O sistema DEVE recategorizar os 663 registros de `atividades_nao_letivas` conforme a tabela de-para do documento 05 §7.1, fechando exatamente em Estudo Individual: 531, AEC: 62, TAD: 59, TR: 11.
- **FR-006**: A nova estrutura DEVE incluir um campo `Categoria_Normativa` (`AEC` | `TAD` | `TR` | `Estudo_Individual`) para toda atividade não vinculada a disciplina, obrigatório em todo lançamento novo.
- **FR-007**: O sistema DEVE calcular a Carga Horária Total como CHT = CHD + AEC + TAD + TR, mantendo Estudo Individual fora dessa soma e controlado à parte.
- **FR-008**: O sistema DEVE tratar Aula e Avaliação/Vista de Prova vinculadas a disciplina como CHD, nunca somadas a AEC/TAD/TR.

**Unicidade de disciplina (User Story 3)**

- **FR-009**: A migração DEVE corrigir a duplicata `C-Esp-ALH`/`ALH-II`, redirecionando todo histórico já lançado contra a linha removida para a linha remanescente, sem perda.
- **FR-010**: O sistema DEVE substituir a lógica de contorno em tempo de leitura específica do C-Ap-FR por uma validação genérica de unicidade de `ID_Curso` + `Cod_Disciplina`, aplicável a qualquer curso.
- **FR-011**: O sistema DEVE alertar o usuário ao tentar cadastrar uma disciplina cujo par `ID_Curso` + `Cod_Disciplina` já exista.

**Status do instrutor (User Story 4)**

- **FR-012**: A migração DEVE preencher explicitamente `Status` = "Ativo" para todo instrutor migrado cujo valor de origem esteja em branco, nunca deixando a interpretação depender de célula vazia.
- **FR-013**: O sistema DEVE manter a exclusão lógica de instrutor (soft delete) funcionalmente testável: instrutor inativo desaparece de opções para novos lançamentos e novas atribuições, mas permanece visível em histórico já existente e na própria tela de cadastro, podendo ser reativado.

**Avaliações (User Story 5)**

- **FR-014**: A migração DEVE conciliar os 111 agendamentos de `avaliacoes_planejadas` com os 186 registros de execução tipo "Avaliação", associando cada execução a um único registro de avaliação.
- **FR-015**: Quando um registro de execução não tiver agendamento correspondente na base viva, a migração DEVE criar um agendamento retroativo, documentado no log de migração.
- **FR-016**: A nova estrutura `avaliacoes` DEVE unificar agendamento e execução num único registro, com `Tempos_Consumidos`/`TA_Inicial`, de forma que agendar uma avaliação já produza o consumo de tempos de aula correspondente, sem exigir um segundo lançamento manual para a execução.

**Dados de configuração administráveis (User Story 6)**

- **FR-017**: A nova estrutura DEVE incluir um catálogo administrável de feriados por ano, janelas oficiais de curso por ano e reservas de Administração/Tempo Reserva por curso/ano, substituindo as constantes `FERIADOS_2027`, `SEMENTES_2027` e `RESERVAS_PROENS` hoje fixas em código.
- **FR-018**: A nova estrutura DEVE incluir uma tabela de parâmetros administrável para os limites normativos de conformidade (tetos 10% AEC / 5% TAD / 10% TR, faixas de carga horária docente por regime, limites de TA diário por curso), com identificação da norma de origem.
- **FR-019**: Nenhum limite normativo ou dado anual do PROENS listado em FR-017/FR-018 DEVE permanecer como literal no código `.ts` após a migração.

**Planejamento anual (User Story 7)**

- **FR-020**: A nova estrutura DEVE representar o planejamento anual como dado versionado por ano (`planejamento_anual`), com um estado de rascunho (`Status_Previa`) editável antes de ser salvo como oficial.
- **FR-021**: A migração DEVE aposentar a antiga aba temporária `Planejamento_2027` como fonte de dado ativa, preservando seu conteúdo apenas como referência histórica somente-leitura, **sem** convertê-lo em um registro oficial de `planejamento_anual` — a nova estrutura `planejamento_anual` nasce vazia, sem um registro pré-existente para 2027 (decisão de esclarecimento de 2026-08-14).

**Regime de horário e modo de atribuição (User Story 8)**

- **FR-022**: A nova estrutura DEVE registrar uma data de vigência (`Regime_Excecao_Vigente_A_Partir_De` ou equivalente) sempre que o regime/horário de um curso mudar, preservando o histórico de configurações anteriores como imutável.
- **FR-023**: Todo cálculo que interprete um registro histórico DEVE usar a configuração de regime vigente na data daquele registro, nunca a configuração corrente, quando houver mudança de regime registrada.
- **FR-024**: A nova estrutura DEVE permitir marcar o modo de atribuição de uma disciplina como "dividido" (padrão) ou "simultâneo", refletido em `Instrutor_Materia`/`disciplinas`.
- **FR-025**: O cálculo de carga horária prevista DEVE repartir a carga entre instrutores no modo "dividido" e replicar a carga integral para cada instrutor no modo "simultâneo".

**Saneamento estrutural residual (User Story 9)**

- **FR-026**: A migração DEVE popular `responsaveis_curso` com os responsáveis de cada curso, de forma que o Detalhe Semanal de Aula impresso saia com as assinaturas corretas.
- **FR-027**: A migração DEVE consolidar `Carga_Horaria`/`Carga_Horaria_Tempos` em um único nome canônico de coluna.
- **FR-028**: A migração DEVE corrigir as colunas de data fora do padrão de nome, eliminando a necessidade de lista de exceção mantida manualmente em frontend e backend.
- **FR-029**: A migração DEVE corrigir a Configuração E de horário (e equivalentes, ex. `C-ApA-OcOp-PR-SP`) para reservar a janela de almoço (12h–13h), sem alterar a interpretação de registros históricos anteriores à data de vigência dessa correção.
- **FR-030**: A migração DEVE registrar e documentar uma decisão explícita para a coluna órfã `Antiguidade` e para os campos `Formula_MF`/`Carater` (mantidos como legado/informativos, não removidos fisicamente nesta migração).
- **FR-031**: Ao final da migração, cada um dos achados (a) a (k) do documento 05 §5 DEVE ter uma decisão registrada — corrigido na migração, adiado com justificativa, ou não será feito.

**Achados residuais da suíte de invariantes, descobertos na Fase 0 de `/speckit-plan` (`/speckit-analyze`, 2026-08-14 — achado G1).** Rodar a suíte de invariantes contra o estado real do banco de trabalho (ver `research.md`) revelou 3 gaps genuínos na migração já aplicada, não previstos pelos achados (a)–(k) do documento 05 por serem posteriores a ele. Cada um tem sua própria FR, para que a rastreabilidade desta feature cubra também o que só foi descoberto durante o planejamento, não só o que já era conhecido na especificação inicial:

- **FR-032**: O sistema DEVE resolver todo vínculo `Instrutor_Disciplina` cujo `ID_Grade` não corresponda a nenhuma linha existente em `Cad_Disciplinas` — nunca inventando um destino plausível nem apagando o vínculo (RN-INST-01, Princípios IV/V da constitution): o valor bruto órfão é preservado numa coluna `*_Legado_v1`, o FK ativo é esvaziado, e o vínculo permanece com seu `Status` inalterado.
- **FR-033**: Todo valor de `instrutores.Posto_Graduacao` DEVE mapear para a escala de antiguidade (RN-ANT-02) — variações de grafia (ex.: símbolo de grau em vez de indicador ordinal) são normalizadas para a forma canônica; instrutores civis (`Categoria = "SCNS"`) recebem um degrau próprio na escala, ordenados por último, em vez de serem excluídos da ordenação de RN-ANT-01 ou tratados como erro de dado.
- **FR-034**: Todo identificador gerado pela própria migração (registros criados retroativamente sem correspondência na origem) DEVE seguir um dos dois formatos já previstos por RN-CRUD-03 — nenhum terceiro formato de ID é introduzido; identificadores de migração hoje fora do padrão são renumerados para o formato canônico, com a renumeração registrada em `migracao_log`.

### Key Entities *(include if feature involves data)*

- **Cad_Disciplinas** (antes `Cad_Matérias`, nomenclatura P-14): grade curricular por curso; ganha validação genérica de unicidade `ID_Curso`+`Cod_Disciplina` e modo de atribuição (dividido/simultâneo).
- **instrutores**: cadastro de instrutor; `Status` passa a ser sempre explícito ("Ativo"/"Inativo"); `Antiguidade` permanece como coluna legada documentada, sem função ativa.
- **atividades_nao_letivas** (ou entidade sucessora): ganha `Categoria_Normativa` (AEC | TAD | TR | Estudo_Individual) e os campos `TA_Inicial`/`Local`, hoje ausentes.
- **avaliacoes**: fusão de agendamento e execução num único registro, com `Tempos_Consumidos`/`TA_Inicial`; substitui a dualidade `avaliacoes_planejadas` (agendamento) + registros de execução tipo "Avaliação" dispersos.
- **responsaveis_curso**: aba já existente no schema, hoje vazia; passa a ser populada, alimentando a assinatura do Detalhe Semanal de Aula impresso.
- **planejamento_anual**: nova entidade, versionada por ano, com `Status_Previa` (rascunho/oficial); sucede a aba temporária `Planejamento_2027`.
- **curso_regime_historico**: nova entidade, generaliza `Regime_Excecao`/`Config_Horario_Excecao` de `cursos` com data de vigência explícita, preservando histórico imutável de configurações anteriores.
- **Instrutor_Materia** (vínculo instrutor↔disciplina, nomenclatura a confirmar em `instrutor_disciplina`): ganha modo de atribuição (dividido/simultâneo).
- **Catálogo administrável PROENS**: novas entidades para feriados por ano, janelas oficiais de curso por ano, reservas de Administração/Tempo Reserva por curso/ano — substituem constantes hoje em ``lib/` (monólito da v1.0, hoje dividido por domínio)`.
- **Tabela de parâmetros de conformidade normativa**: nova entidade para os tetos (10%/5%/10%), faixas de carga horária docente por regime e limites de TA diário por curso, com identificação da norma de origem.
- **migracao_log**: log de auditoria apenas-acrescenta de toda ação da migração.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos registros de `registros_aula` (1.753 na extração de 31/07/2026), `atividades_nao_letivas` (663), `avaliacoes_planejadas` (111) e execuções de avaliação (186) existem na nova estrutura após a migração, sem nenhuma perda.
- **SC-002**: A soma dos 663 registros recategorizados fecha exatamente em Estudo Individual: 531, AEC: 62, TAD: 59, TR: 11 — zero registros sem categoria normativa atribuída.
- **SC-003**: Zero pares duplicados de `ID_Curso` + `Cod_Disciplina` em qualquer dos 24 cursos, na estrutura pós-migração.
- **SC-004**: 100% dos 177 instrutores têm `Status` explicitamente "Ativo" ou "Inativo" — zero valores em branco.
- **SC-005**: 100% dos 186 registros de execução de avaliação estão associados a exatamente um registro de agendamento na estrutura `avaliacoes` pós-migração.
- **SC-006**: Zero constantes anuais do PROENS (feriados, janelas de curso, reservas) e zero limites normativos de conformidade permanecem como literal em código `.ts` após a migração.
- **SC-007**: Os 11 achados (a) a (k) do documento 05 §5 têm, cada um, uma decisão registrada e documentada — 100% de cobertura, zero pendências em aberto.
- **SC-008**: A suíte de invariantes estruturais (`tests/`) roda sem nenhuma falha nova introduzida pela migração, além das falhas pré-existentes já conhecidas e documentadas em `CLAUDE.md`.
- **SC-009**: Um snapshot de segurança existe e é restaurável antes de qualquer ação de saneamento ser considerada iniciada — verificável a qualquer momento durante ou após a migração.
- **SC-010**: O Detalhe Semanal de Aula impresso de qualquer curso, após a migração, sai com o rodapé de assinaturas preenchido (zero cursos com `responsaveis_curso` vazia).

## Assumptions

- A migração é executada como um único evento auditável (uma "janela de migração"), não como entregas incrementais em produção — as User Stories acima são prioridades de verificação e de risco, não uma sequência de releases separados, conforme a nota de consolidação do documento 06 (recomendação R-1).
- A migração ocorre em janela de manutenção declarada (sistema indisponível para escrita na banco de produção) até o corte para a nova estrutura, e não como migração "a quente" com uso concorrente — decisão de esclarecimento de 2026-08-14, dado o volume pequeno da base (~2.500 registros no total) e a ausência de CI/CD ou de mecanismo de sincronização em tempo real na plataforma fixa do projeto.
- Nenhum instrutor da base viva tem hoje indicação estruturada confiável de estar inativo; por isso, o valor padrão de `Status` para os 177 instrutores é "Ativo". Qualquer correção individual baseada em conhecimento operacional do Admin é uma ação pós-migração, fora do escopo automático desta migração.
- A decisão sobre a coluna `Antiguidade` e os campos `Formula_MF`/`Carater` (achados d e k) é "manter como legado/informativo, sem remoção física nesta migração" — não há informação nos documentos de Fase 1 que justifique remoção definitiva agora, e a regra 4 do projeto (nunca apagar ou tornar irrecuperável) favorece o caminho mais conservador.
- O nome físico usado nesta especificação é `Cad_Disciplinas`/`ID_Disciplina`/`Nome_Disciplina` (decisão P-14, já registrada em memória de projeto), não "Matéria", exceto quando citando literalmente um documento de Fase 1 que ainda usa a nomenclatura antiga.
- A publicação do banco V2.0 como banco Supabase em produção (item pendente no `CLAUDE.md`, estado atual) é pré-requisito operacional para executar esta migração contra um alvo real, mas não é, em si, parte do escopo funcional desta especificação.
- Esta migração cobre exclusivamente as mudanças de modelo de dados e conteúdo listadas no Épico C. Mudanças de interface, RBAC ampliado (Épico F) e o motor preditivo multi-ano (Épico G) são consumidores futuros dos dados aqui estruturados, não escopo desta especificação — a User Story 6 entrega apenas o catálogo administrável, não a lógica de simulação multi-ano.
