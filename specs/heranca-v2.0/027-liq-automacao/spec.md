# Feature Specification: Épico — Automação da Lista de Instrutores Qualificados (LIQ)

**Feature Branch**: `027-liq-automacao`

**Created**: 2026-08-20

**Status**: Draft

**Input**: User description: "ÉPICO: Automação da Lista de Instrutores Qualificados (LIQ) — geração da minuta trimestral em a rota de impressão `/print/*` a partir dos dados do sistema, regida pela NORMHIDRO nº 30-23. Migração turma_disciplina (período por turma, já escrita e validada em sandbox); tela para o operador preencher período por turma; botão 'LIQ' no módulo de Instrutores com modal Ano/Trimestre; geração da minuta com 2 regras de bloqueio reais (disciplina sem período, disciplina sem instrutor) medidas na base viva; template da rota `/print/ficha-instrutor` já criado (ID informado); LIQ-2 (impedimentos) descartada por decisão do responsável — campo sempre vazio; LIQ-3/LIQ-4 abertas, a confirmar em clarify."

## Achados reais (leitura de código, dado ao vivo e provenance antes de escrever qualquer requisito)

- **Este pedido já tinha sido registrado por escrito antes desta conversa**: `docs/arquitetura/05-prompt-epico-LIQ.md` (99 linhas, já commitado no repositório, datado 2026-08-20) contém o texto do pedido palavra por palavra — não é uma afirmação nova sem lastro, é a continuação de um documento de decisão já versionado, cruzado com `01-schema.md` §8 (achados LIQ-1 a LIQ-4/5). Mesmo padrão de proveniência dos documentos `03-design-system.md`/`04-appstate.md` que motivaram o Épico 009.
- **Migração `turma_disciplina` (LIQ-1) confirmada por leitura do script real**: `migracao/criar_turma_disciplina.py` existe, é idempotente, segue o mesmo padrão de backup + `migracao_log` apenas-acrescenta de todo script anterior desta sessão (`_util_migracao.py`). Colunas/contagens batem exatamente com o pedido (210 linhas: 89 herdam o período quando a data da grade cai dentro da janela da própria turma, 121 nascem em branco com `Origem_Periodo = 'Nao_Informado'`). Ainda não aplicado à banco de produção.
- **Achado que corrige o pedido**: `lib/acoes/instrutores.ts` **não tem** nenhuma função chamada `getChMinistradaAnoInstrutores` — a função real é `listarInstrutoresComCargaHoraria()` (já devolve `cargaHorariaMinistradaAno` por instrutor para o ano corrente, usando `somarCargaHorariaPorInstrutor_()` sobre `registros_aula`, filtrando `Categoria_Normativa='Aula'` e `Status != 'Cancelada'`). É exatamente o dado que a coluna "Carga Horária" da Seção 1 precisa — só o nome da função no pedido original estava errado, a função certa já existe e faz o que é necessário.
- **Confirmado por leitura do template da rota `/print/ficha-instrutor` ao vivo** (`1XECilVycWL63dPCxXj_LUkIdbglOoAFnBsyqbltaq5w`): título "MODELO - LISTA DE INSTRUTORES QUALIFICADOS (LIQ) - CIAARA-11 v2.0"; as 22 tags citadas no pedido existem literalmente no documento; exatamente 2 tabelas (Seção 1 com 8 colunas, Seção 2 com 5 colunas), cada uma com 1 linha de cabeçalho + 1 linha-modelo de tags, prontas para clonagem.
- **Confirmado por leitura da banco de produção**: `turmas` tem `Data_Inicio`/`Data_Termino`/`Status`; `disciplinas` tem `Previsao_Inicio`/`Previsao_Termino`/`Carga_Horaria_Tempos`/`ID_Grade`; `instrutores` tem `Posto_Graduacao`/`Nome_Completo`/`OM`/`Dep_Divisao`/`Data_Assuncao_Setor`/`Formacao_Principal_Secundaria`/`Status`; `instrutor_disciplina` tem `ID_Instrutor`/`ID_Grade`/`Status` — todas as colunas que os requisitos abaixo dependem já existem, nenhuma coluna nova além de `turma_disciplina` (já decidida, LIQ-1).
- **Confirmado por leitura da banco de produção**: `turmas` tem uma coluna `Turma` (4ª de 14)
  que já armazena o sufixo "T1"/"T2" como valor literal quando o curso tem mais de uma turma no
  ano (confirmado em `C-ApA-AuxNav-PR-SP` 2026: linha T1 `Data_Inicio` 16/03, linha T2
  `Data_Inicio` 03/08, ambas com `Turma` preenchida) — nenhuma lógica de derivação é necessária
  para o sufixo da coluna CURSO da Seção 2 (FR-010), é leitura direta de campo.
- **Achado que corrige o pedido (encontrado em `/speckit-analyze`)**: o pedido original citava `ordenarInstrutoresPorAntiguidade_` para ordenar a Seção 1 por antiguidade — mas essa função vive em `app/(app)/instrutores/page.tsx` (frontend), inacessível a partir de um `.ts` de backend. A alternativa de backend `ordenarPorAntiguidadePosto_` (`lib/acoes/instrutores.ts`) também não serve: recebe pares agregados `{posto, quantidade}`, não registros completos de instrutor — chamada com uma lista de instrutores, o `.sort` viraria um no-op silencioso (sem erro, sem ordenação). A forma correta e já disponível é ordenar os registros de `instrutores` diretamente pela coluna já persistida `Antiguidade_Declarada` (gravada por `cadastrarInstrutor_`/`atualizarInstrutor_` a partir de `Posto_Graduacao`, `lib/acoes/instrutores.ts`) — nenhuma função nova é necessária.
- **Confirmado**: o padrão `lerConfigParametros_()['ID_TEMPLATE_...']` (usado por `ID_TEMPLATE_FICHA_INSTRUTOR` desde a spec 022) é exatamente o mecanismo a seguir para `ID_TEMPLATE_LIQ` (Princípio VII).
- **Texto normativo literal da NORMHIDRO 30-23 não pôde ser re-verificado byte a byte nesta sessão** (sem ferramenta de extração de PDF disponível no ambiente) — mas o acervo (`SIS11/modelos/LIQ/PUB/NORMHIDRO 30-23/` + Anexos A-D + LIQs reais 2023-2026) existe de fato no disco, e o resumo normativo do pedido bate consistentemente com `01-schema.md` §8 (documento já commitado, de uma sessão anterior que presumivelmente leu a norma). Tratado como confiável por consistência documental, não por releitura direta nesta sessão.
- **Diferença técnica confirmada em relação à Ficha (specs 022-024)**: a Ficha usa `replaceText` puro sobre tags fixas; a LIQ tem 2 tabelas de tamanho variável — exige a técnica de clonagem de linha (`body.getTables()` → `getRow(1)` → `copy()` → `appendTableRow()` → `replaceText` só na linha nova → `removeRow(1)` na linha-modelo original ao final). Documentado como decisão técnica obrigatória, não uma opção entre alternativas.

## Clarifications

### Session 2026-08-20

- Q: LIQ-3 (papel titular/reserva) e LIQ-4 (persistência da LIQ emitida) ficam de fora desta
  primeira entrega, ou algum dos dois deveria entrar já nesta spec? → A: Os dois ficam fora
  (Opção A) — Seção 2 lista todos os instrutores sem rótulo de papel; cada geração cria um
  documento novo no Supabase Storage sem histórico de versão/Ofício. Confirma o default já descrito no pedido
  original.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar o período de cada disciplina por turma (Priority: P1)

Como Divisão de Orientação Educacional e Pedagógica, quero uma tela onde eu registro a data de
início e término prevista de cada disciplina **por turma específica** (não mais só por curso),
para que cursos com 2 turmas no mesmo ano (ex.: `C-ApA-AuxNav-PR-SP` T1 mar-jun e T2 ago-out)
tenham cada um sua própria janela real, e para eu poder corrigir as 121 disciplinas que a migração
`turma_disciplina` deixou sem período (achado real, `Origem_Periodo='Nao_Informado'`).

**Why this priority**: É o pré-requisito estrutural de tudo — sem ela, a regra de bloqueio da LIQ
(User Story 2) vira um beco sem saída: o sistema diz "faltam períodos" e o operador não tem onde
registrar.

**Independent Test**: Abrir a Página do Curso/Turmas de um curso com disciplinas sem período
(`Origem_Periodo='Nao_Informado'`) — preencher `Previsao_Inicio`/`Previsao_Termino` de uma
disciplina — confirmar que o valor persiste em `turma_disciplina` (nunca em `disciplinas`).

**Acceptance Scenarios**:

1. **Given** uma turma com disciplinas em `turma_disciplina` sem período preenchido, **When** o
   operador abre a tela de período da turma, **Then** vê a lista de disciplinas daquela turma com
   um campo de data de início e término por disciplina, os já preenchidos (herdados da migração)
   mostrando o valor atual.
2. **Given** um campo de período preenchido pelo operador, **When** salvo, **Then** o valor é
   gravado em `turma_disciplina` (via `crudAtualizar` genérico, mesmo motor já usado em todo o
   projeto) — `disciplinas.Previsao_Inicio/Termino` (a semente da grade) nunca é sobrescrita.
3. **Given** uma disciplina cujo período já foi herdado corretamente pela migração
   (`Origem_Periodo` diferente de `'Nao_Informado'`), **When** a tela é aberta, **Then** o valor
   herdado aparece pré-preenchido, permitindo edição se necessário.

---

### User Story 2 - Gerar a minuta trimestral da LIQ, bloqueada quando os dados estão incompletos (Priority: P1)

Como Comandante/Divisão de Administração Acadêmica, quero clicar em "LIQ", escolher ano e
trimestre, e receber a minuta oficial em a rota de impressão `/print/*` pronta para revisão — ou, se a base de dados
tiver lacunas que tornariam a LIQ incorreta, quero ver de uma vez **todos** os pontos que preciso
corrigir antes de tentar de novo, nunca um documento incompleto gerado silenciosamente.

**Why this priority**: É o valor central do épico — a automação da minuta trimestral exigida pela
NORMHIDRO 30-23 (item 5.1, competência da CIAARA-11). Mesma prioridade de US1 porque as duas juntas
formam o primeiro ciclo completo utilizável (registrar período → gerar LIQ sem bloqueio).

**Independent Test**: Selecionar 3º trimestre de 2026 na base atual (sem corrigir nada antes) —
confirmar que a geração é bloqueada com as 2 mensagens nominais esperadas (períodos faltantes em
`C-Exp-Obs-ME`/`C-Esp-ALH`/`EST-QF-APHID`/turmas T2; instrutor faltante em `C-Espc-HN`/`C-Espc-FR`/
`C-Exp-MetocOf`) — dado real de produção, não sintético.

**Acceptance Scenarios**:

1. **Given** o módulo de Instrutores, **When** o usuário clica "LIQ", **Then** um modal pede
   **Ano** e **Trimestre** (1º a 4º) — nenhum outro campo.
2. **Given** o modal confirmado, **When** existe pelo menos 1 turma (`turmas`, `Status !=
   'Cancelada'`) cujo período intercepta o trimestre selecionado com alguma disciplina em
   `turma_disciplina` sem `Previsao_Inicio`/`Previsao_Termino`, **Then** a geração é bloqueada
   **antes de qualquer escrita no Supabase Storage**, com uma mensagem nominal por curso/turma listando as
   disciplinas faltantes (FR-004).
3. **Given** o modal confirmado, **When** existe alguma disciplina cujo período (em
   `turma_disciplina`) intercepta o trimestre selecionado sem nenhum vínculo `instrutor_disciplina`
   ativo, **Then** a geração é bloqueada **antes de qualquer escrita no Supabase Storage**, com uma mensagem
   nominal por disciplina (FR-005).
4. **Given** as duas condições de bloqueio acima, **When** ambas ocorrem ao mesmo tempo, **Then**
   o modal lista **todos** os pontos de uma vez (períodos faltantes E instrutores faltantes juntos),
   nunca um de cada vez.
5. **Given** uma base sem nenhum bloqueio pendente para o trimestre escolhido, **When** a geração
   roda, **Then** um a rota de impressão `/print/*` é criado a partir do Template (`ID_TEMPLATE_LIQ`), salvo na pasta
   "Listas de Instrutores Qualificados" do Supabase Storage, e aberto numa nova aba — com a Seção 1 (todo
   instrutor `Status='Ativo'` com ao menos 1 vínculo ativo em `instrutor_disciplina`, ordenado por
   antiguidade) e a Seção 2 (por turma cujo período intercepta o trimestre, cada disciplina prevista
   com seu(s) instrutor(es), rótulo do curso com sufixo de turma quando houver) preenchidas.
6. **Given** o rodapé do documento gerado, **When** observado, **Then** mostra a vigência exata do
   trimestre selecionado (ex.: 3º trimestre de 2026 → "01/07/2026 a 30/09/2026").
7. **Given** a coluna "Obs" da Seção 1 (`{{L1_OBS}}`), **When** o documento é gerado, **Then**
   aparece sempre vazia — comportamento pretendido (achado real, decisão do responsável), não uma
   lacuna: impedimentos são preenchidos pelos próprios instrutores fora do sistema, o artefato
   gerado aqui é uma minuta.

---

### Edge Cases

- Turma com `Status='Cancelada'`: nunca entra na verificação de bloqueio (FR-004) nem na Seção 2 —
  excluída por completo, mesmo que seu período intercepte o trimestre.
- Turma cujo período **não** intercepta o trimestre selecionado: nunca entra em nenhuma das 2
  regras de bloqueio nem na Seção 2 — não é erro, é simplesmente fora do escopo daquele trimestre.
- Disciplina com mais de 1 instrutor vinculado ativo: todos aparecem em `{{L2_INSTRUTORES}}` da
  mesma linha — sem distinção de titular/reserva (LIQ-3 deferida, ver Assumptions).
- Mesmo instrutor lecionando 2+ disciplinas dentro do trimestre: aparece em 2+ linhas distintas da
  Seção 2 (a seção é centrada em disciplina, não em instrutor) — mesmo padrão do Anexo C real.
- Curso com uma única turma (sem sufixo `T1`/`T2` no nome real): a coluna CURSO da Seção 2 mostra
  só o código do curso, sem sufixo — "quando houver" (achado 1).
- Gerar a LIQ do mesmo trimestre 2 vezes seguidas: cada clique gera um novo documento no Supabase Storage
  (LIQ-4, persistência/histórico de versão, deferida — ver Assumptions) — nenhuma deduplicação
  nesta primeira entrega.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A migração `turma_disciplina` (`migracao/criar_turma_disciplina.py`, já escrita e
  validada em sandbox) MUST ser aplicada à banco de produção, com backup prévio e registro em
  `migracao_log` (Princípio IV) — sem redecidir a modelagem (LIQ-1 já aprovada por Bernardo em
  2026-08-20).
- **FR-002**: O sistema MUST oferecer uma tela onde o operador registra/corrige
  `Previsao_Inicio`/`Previsao_Termino` por linha de `turma_disciplina` (período por turma, nunca
  mais por curso genérico), via o motor CRUD genérico já existente (`crudAtualizar`) — nunca
  escrevendo em `disciplinas` (que permanece só como semente/padrão da grade).
- **FR-003**: O módulo de Instrutores MUST ganhar um botão "LIQ", ao lado de "Cadastrar Novo
  Instrutor"/"Estatísticas", que abre um modal pedindo exclusivamente Ano e Trimestre (1º a 4º).
- **FR-004**: Para toda turma (`turmas`, `Status != 'Cancelada'`) cujo período intercepte o
  trimestre selecionado, todas as suas linhas em `turma_disciplina` MUST ter
  `Previsao_Inicio`/`Previsao_Termino` preenchidos — caso contrário a geração é **bloqueada**
  (nunca um alerta ignorável) com mensagem nominal por curso/turma, listando as disciplinas
  faltantes.
- **FR-005**: Toda disciplina cujo período (em `turma_disciplina`) intercepte o trimestre
  selecionado MUST ter ao menos 1 vínculo `instrutor_disciplina` ativo — caso contrário a geração é
  **bloqueada** com mensagem nominal por disciplina.
- **FR-006**: As validações de FR-004/FR-005 MUST rodar por completo **antes** de qualquer escrita
  no Supabase Storage, e MUST apresentar **todos** os problemas encontrados de uma vez — nunca um por vez, nem
  um documento parcial seguido de aviso.
- **FR-007**: FR-004/FR-005 são **bloqueio, não alerta** — uma exceção deliberada ao padrão geral
  RN-DEG-02 (Degradação Segura, Princípio V) desta constitution, justificada porque a LIQ é
  documento oficial submetido à DHN para aprovação externa (NORMHIDRO 30-23, item 3.2) — uma LIQ
  incompleta tem consequência institucional, diferente de um alerta de tela ignorável.
- **FR-008**: A Seção 1 ("Instrutores Habilitados") MUST listar todo instrutor `Status='Ativo'` com
  ao menos 1 vínculo `instrutor_disciplina` ativo, ordenado por antiguidade decrescente de posto
  (RN-ANT-01, via a coluna já persistida `instrutores.Antiguidade_Declarada` — não via
  `ordenarInstrutoresPorAntiguidade_`, que é função de frontend inacessível ao backend, nem via
  `ordenarPorAntiguidadePosto_`, que tem assinatura incompatível com registros completos de
  instrutor; achado de `/speckit-analyze`) — 8 colunas: Posto/Graduação, Nome, OM/Dep.
  Divisão, Data de assunção (+ tempo calculado), Formação Principal/Secundária, Disciplinas
  habilitadas (com C.H de cada), Carga Horária ministrada no ano (via
  `listarInstrutoresComCargaHoraria`), Obs.
- **FR-009**: `{{L1_OBS}}` (coluna Obs da Seção 1) MUST ser sempre vazia — comportamento
  deliberado (LIQ-2 descartada, decisão do responsável 2026-08-20): impedimentos nascem fora do
  sistema, preenchidos pelos próprios instrutores quando questionados. Nenhuma entidade
  `Instrutor_Impedimento` nem tela correspondente MUST ser criada nesta spec.
- **FR-010**: A Seção 2 ("Instrutores Selecionados") MUST listar, por turma cujo período intercepta
  o trimestre selecionado, cada disciplina prevista (via `turma_disciplina`) com seu(s)
  instrutor(es) — 5 colunas: Curso (com o sufixo de turma quando existente — lido diretamente de
  `turmas.Turma`, ex. "T2", já armazenado como valor literal, nunca derivado em tempo de
  geração), Disciplina, Período, Instrutor(es), Observações (OM do(s) instrutor(es)).
- **FR-011**: A geração do documento MUST usar a técnica de clonagem de linha (`getTables()` →
  linha-modelo → `copy()`/`appendTableRow()`/`replaceText` na linha nova → `removeRow(1)` na
  linha-modelo original ao final) — MUST NUNCA usar `replaceText` global no corpo do documento para
  as 2 tabelas (não funciona para listas de tamanho variável).
- **FR-012**: O documento gerado MUST ser salvo numa pasta dedicada do Supabase Storage ("Listas de
  Instrutores Qualificados", criada se não existir, mesmo padrão de `pastaFichasInstrutores_()`) e
  aberto numa nova aba após a geração.
- **FR-013**: O ID do template da rota `/print/ficha-instrutor` (`1XECilVycWL63dPCxXj_LUkIdbglOoAFnBsyqbltaq5w`) MUST
  ser lido de `config_parametros` sob a chave `ID_TEMPLATE_LIQ` (mesmo padrão de
  `ID_TEMPLATE_FICHA_INSTRUTOR`) — MUST NUNCA ser constante literal no código (Princípio VII).
- **FR-014**: Toda regra nova desta spec MUST receber identificador `RN-LIQ-0X` e MUST ser
  registrada em `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md`, citando o item correspondente da
  NORMHIDRO 30-23 (Princípio VIII, RNF-NORM-07).
- **FR-015**: Nenhuma mudança de schema além de `turma_disciplina` MUST ser aplicada nesta spec —
  LIQ-3 (titular/reserva) e LIQ-4 (persistência da LIQ emitida) permanecem fora do schema
  (Clarifications 2026-08-20, ver Assumptions), candidatas a uma segunda fatia futura.

### Key Entities *(include if feature involves data)*

- **`turma_disciplina`** (nova, LIQ-1, migração já escrita): fonte de verdade do período previsto
  de cada disciplina **por turma** — `ID_Turma` + `ID_Grade` (unicidade lógica), `Previsao_Inicio`,
  `Previsao_Termino`, `Origem_Periodo` (marca linhas que nasceram sem herdar período da grade).
  `disciplinas.Previsao_Inicio/Termino` permanece como semente/padrão da grade — não é apagada,
  não é mais a fonte de verdade para cálculo de trimestre.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Selecionar o 3º trimestre de 2026 na base real de hoje bloqueia a geração com as 2
  mensagens nominais esperadas (períodos e instrutores faltantes), listadas juntas, antes de
  qualquer escrita no Supabase Storage.
- **SC-002**: Depois de corrigidos os apontamentos, a mesma seleção produz um documento a rota de impressão `/print/*`
  com as 2 tabelas preenchidas, Seção 1 ordenada por antiguidade, e vigência do rodapé em
  "01/07/2026 a 30/09/2026".
- **SC-003**: 100% dos problemas de bloqueio aparecem numa única apresentação ao operador, nunca um
  de cada vez.
- **SC-004**: 0% de documento parcial/incompleto gerado no Supabase Storage quando há bloqueio pendente.
- **SC-005**: 0% de regressão na suíte de testes (`pnpm vitest run`).

## Assumptions

- **LIQ-3 (titular/reserva) fica fora do schema desta spec** (Clarifications 2026-08-20) — a Seção
  2 lista todos os instrutores vinculados a uma disciplina sem rótulo de papel (Titular/Reserva).
- **LIQ-4 (persistência da LIQ emitida) fica fora do schema desta spec** (Clarifications
  2026-08-20) — cada geração cria um novo documento no Supabase Storage, sem registro de versão/Ofício/Status.
- O aspecto de prazo normativo (NORMHIDRO 30-23, item 3.2 — nomes até dia 10 do mês anterior ao
  trimestre) é só contexto/motivação — esta spec não modela prazos nem lembretes de calendário; o
  operador gera a LIQ sob demanda para qualquer trimestre/ano escolhido.
- "Trimestre" segue o calendário civil padrão: 1º (jan-mar), 2º (abr-jun), 3º (jul-set), 4º
  (out-dez) — confirmado pelo próprio critério de aceite do pedido (3º trimestre 2026 =
  01/07 a 30/09/2026).
- A tela de período por turma (US1) fica na Página do Curso/módulo de Turmas — local exato dentro
  dessas telas fica para `/speckit-plan`, não é uma decisão de produto en aberto.
