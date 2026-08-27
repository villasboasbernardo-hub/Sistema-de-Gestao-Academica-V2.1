---

description: "Task list template for feature implementation"
---

# Tasks: Épico C — Migração e Saneamento da Base de Dados

**Input**: Design documents de `/specs/001-migracao-saneamento-dados/`

**Prerequisites**: plan.md (obrigatório), spec.md (histórias de usuário), research.md, data-model.md, quickstart.md

**Tests**: A suíte de invariantes (`tests/unidade/*.test.ts`) já existe e é o critério de aceite desta
feature (constitution, Princípio VI) — não há tarefas de "escrever teste" novas, só de **atualizar**
os dois testes que hoje capturam os 3 achados como falha esperada, e confirmar que os 45 asserts
concretos passam ao final.

**Organização**: Tarefas agrupadas por história de usuário (spec.md). A maior parte do trabalho de
migração já está aplicada à planilha de trabalho (ver `research.md`, "achado de escopo") — a maioria
das fases abaixo é **verificação**, não construção; só US1, US3, US4 e US5 têm implementação nova.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: A qual história de usuário esta tarefa pertence (US1..US9, spec.md)
- Caminhos de arquivo exatos em cada descrição

## Path Conventions

Projeto único, sem `src/` (não há código de aplicação nesta feature — ver plan.md, Project
Structure): `migracao/` (scripts de correção), `tests/` (suíte de invariantes), `docs/arquitetura/`
(documentação física), `CLAUDE.md` (estado do projeto). Todos os caminhos abaixo são relativos a
`CIAARA-11-v2/`.

---

## Phase 1: Setup

**Purpose**: Capturar o estado atual antes de qualquer correção, para poder medir o efeito de cada
tarefa depois.

- [X] T001 Rodar `pnpm vitest run` a partir de `CIAARA-11-v2/` e registrar o resultado
  baseline (`tests 58, pass 42, fail 3, todo 13`) — nenhuma mudança de arquivo, só confirmação de
  ponto de partida (ver `quickstart.md`, passo 1).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura obrigatória antes de qualquer história.

**Nenhuma tarefa nesta fase.** `migracao/` e `tests/` já existem com o padrão necessário (ver
`migracao/renomear_materia_para_disciplina.py`); o único artefato verdadeiramente compartilhado
pelas três correções (o utilitário de backup+log) é entregue dentro da User Story 1 abaixo, não
aqui, porque é o próprio produto daquela história — não faria sentido duplicá-lo como tarefa
"invisível" numa fase sem rótulo.

---

## Phase 3: User Story 1 - Snapshot de segurança e trilha de auditoria da migração (Priority: P1) 🎯 MVP

**Goal**: Toda correção desta feature segue o mesmo padrão auditável e reversível já validado em
`migracao/renomear_materia_para_disciplina.py` — backup antes de escrever, `migracao_log` só
recebe linhas novas.

**Independent Test**: Rodar qualquer um dos 3 scripts de correção (T005, T007, T011) isoladamente e
confirmar que (a) um backup `.xlsx` irmão foi criado antes da escrita, e (b) `migracao_log` ganhou
linha(s) nova(s) sem que nenhuma linha pré-existente tenha mudado de conteúdo.

### Implementation for User Story 1

- [X] T002 [US1] Criar `migracao/_util_migracao.py` com duas funções compartilhadas: uma que faz
  backup do `.xlsx` de trabalho como arquivo irmão antes de qualquer escrita (mesmo padrão de
  `migracao/renomear_materia_para_disciplina.py`), e uma que grava uma linha nova em
  `migracao_log` (`ID_Log` sequencial, nunca reescrevendo linha existente) — reaproveitada pelos
  3 scripts de correção (T005, T007, T011).
- [X] T003 [US1] Depois que T005, T007 e T011 tiverem rodado, confirmar em
  `tests/unidade/reconciliacao_migracao.test.ts` (teste já existente "`migracao_log`: nenhuma linha antiga
  foi reescrita") que a aba recebeu exatamente 81 linhas novas (1 + 2 + 78) com `ID_Log` contíguo, e
  nenhuma das ~408 linhas anteriores foi alterada.

**Checkpoint**: O utilitário de backup+log está pronto e disponível para as três correções abaixo.

---

## Phase 4: User Story 2 - Recategorização normativa das atividades letivas (Priority: P2)

**Goal**: As 664 linhas de `atividades_nao_letivas` têm `Categoria_Normativa` correta e um ID no
formato canônico.

**Independent Test**: Rodar `tests/unidade/regras_de_negocio.test.ts` (RN-EVT-01) e confirmar 531/62/60/11.

**Nota de escopo**: a recategorização em si (FR-005 a FR-008) já está aplicada e coberta por
RN-EVT-01, verde desde antes desta feature — não há tarefa de implementação nova para isso. A única
pendência desta história é a renumeração de `EVT-M00001`, que é **a mesma operação e o mesmo
arquivo** que a renumeração de `avaliacoes` na User Story 5 (T011) — não duplicada aqui como uma
segunda tarefa de implementação.

### Implementation for User Story 2

- [X] T004 [US2] (FR-034) Depois de T011 (User Story 5) rodar, confirmar que `atividades_nao_letivas!EVT-M00001`
  passou a `EXT-####` e que RN-EVT-01 (`tests/unidade/regras_de_negocio.test.ts`) e a reconciliação de
  contagem por aba (`tests/unidade/reconciliacao_migracao.test.ts`) continuam batendo em 664/664.

**Checkpoint**: `atividades_nao_letivas` sem nenhum ID fora do padrão `EXT-####`.

---

## Phase 5: User Story 3 - Unicidade de disciplina por curso e correção de duplicatas (Priority: P3)

**Goal**: Nenhum vínculo `instrutor_disciplina` aponta para uma disciplina inexistente.

**Independent Test**: Rodar `tests/unidade/reconciliacao_migracao.test.ts` (checagem de FK
`instrutor_disciplina.ID_Grade -> disciplinas.ID_Grade`) e confirmar zero órfãs.

**Nota de escopo**: a correção da duplicata `C-Esp-ALH`/`ALH-II` e a validação genérica de
unicidade (FR-009 a FR-011) já estão aplicadas e cobertas por RN-MAT-02, verde desde antes desta
feature. A única pendência é o vínculo órfão abaixo.

### Implementation for User Story 3

- [X] T005 [US3] Implementar `migracao/corrigir_vinculo_orfao_instrutor_disciplina.py` (FR-032):
  localizar `instrutor_disciplina!VIN-000419` (`ID_Grade = "40 - C-Ap-FR - XVII"`, hoje sem
  correspondência em `Cad_Disciplinas`), acrescentar a coluna `ID_Grade_Legado_v1` à aba se ainda
  não existir, copiar o valor bruto para lá, esvaziar `ID_Grade`, manter `Status = Inativo` (já está
  assim), e gravar 1 linha em `migracao_log` via `migracao/_util_migracao.py` (T002) com
  `Acao = Corrigido`.
- [X] T006 [US3] Confirmar que o teste `instrutor_disciplina.ID_Grade -> disciplinas.ID_Grade`
  (`tests/unidade/reconciliacao_migracao.test.ts`) passa a verde — nenhuma alteração de lógica de teste é
  necessária, a checagem já trata FK vazia como não-órfã.

**Checkpoint**: Integridade referencial de `instrutor_disciplina` 100% (nenhuma FK pendurada).

---

## Phase 6: User Story 4 - Status explícito do instrutor (Priority: P4)

**Goal**: `instrutores.Posto_Graduacao` só contém valores reconhecidos pela escala de antiguidade.

**Independent Test**: Rodar `tests/unidade/regras_de_negocio.test.ts` (RN-ANT-02) e confirmar zero valores
fora da escala.

**Nota de escopo**: o preenchimento explícito de `Status` (FR-012/FR-013) já está aplicado e coberto
por RN-INST-02/RF-DADOS-07, verde desde antes desta feature. A pendência desta história é a escala
de `Posto_Graduacao`.

### Implementation for User Story 4

- [X] T007 [US4] Implementar `migracao/normalizar_posto_graduacao.py` (FR-033): corrigir
  `instrutores.Posto_Graduacao` nas 2 linhas com símbolo de grau `U+00B0` (`ID_Instrutor 118`,
  `"2°SG"`, e `ID_Instrutor 164`, `"1°SG"`) para o indicador ordinal `U+00BA` (`"2ºSG"`/`"1ºSG"`),
  gravando 2 linhas em `migracao_log` via `migracao/_util_migracao.py` (T002).
- [X] T008 [US4] No mesmo script (`migracao/normalizar_posto_graduacao.py`), documentar em docstring
  a decisão de esclarecimento de 2026-08-14 sobre as 6 linhas `Categoria = "SCNS"` /
  `Posto_Graduacao = "SC"` (`ID_Instrutor` 17–22): nenhum dado é alterado, é uma decisão de
  **interpretação** da escala (ver T009), não de correção de valor.
- [X] T009 [P] [US4] Atualizar `tests/unidade/regras_de_negocio.test.ts`: `PESO_POR_PG` ganha a entrada
  `SC: 13` (após `MN: 12`), com comentário citando a decisão de 2026-08-14 e `research.md` — pode
  ser feito em paralelo a T007/T008 (arquivo diferente), mas só valida depois que eles rodarem.
- [X] T010 [US4] Confirmar que o teste RN-ANT-02 (`tests/unidade/regras_de_negocio.test.ts`) passa a verde.

**Checkpoint**: Todo `Posto_Graduacao` de `instrutores` mapeia para a escala oficial (militar ou
civil).

---

## Phase 7: User Story 5 - Fusão de agendamento e execução de avaliação (Priority: P5)

**Goal**: Todo ID de `avaliacoes`/`atividades_nao_letivas` segue um dos dois formatos previstos
por RN-CRUD-03.

**Independent Test**: Rodar `tests/unidade/regras_de_negocio.test.ts` (RN-CRUD-03) e confirmar zero formatos
de ID fora do padrão `PREFIXO-dígitos`.

**Nota de escopo**: a fusão de agendamento+execução em si (FR-014 a FR-016) já está aplicada e
coberta pela reconciliação de `Conciliacao_Migracao` (`tests/unidade/reconciliacao_migracao.test.ts`),
verde desde antes desta feature. A pendência é o formato de ID das linhas criadas pela própria
migração.

### Implementation for User Story 5

- [X] T011 [US5] Implementar `migracao/renumerar_ids_migracao_avaliacoes_eventos.py` (FR-034):
  renumerar as 77 linhas `AVL-M00001`..`AVL-M00077` de `avaliacoes` para `AVA-####`, continuando a
  sequência
  existente (não reinicia em 1), e a linha `EVT-M00001` de `atividades_nao_letivas` para
  `EXT-####`, continuando a sequência existente; atualizar `arquivo_avaliacoes_v1.ID_Avaliacao_Destino`
  para as 77 linhas afetadas; gravar 78 linhas em `migracao_log` via `migracao/_util_migracao.py`
  (T002), com `Valor_Antes`/`Valor_Depois` preenchidos. **Não roda em paralelo com T005/T007** —
  mesmo arquivo `.xlsx` de trabalho, escrita concorrente corromperia o arquivo.
- [X] T012 [US5] Confirmar que o teste RN-CRUD-03 (`tests/unidade/regras_de_negocio.test.ts`) passa a verde.

**Checkpoint**: Nenhum ID fora dos dois padrões previstos por RN-CRUD-03 em toda a base.

---

## Phase 8: User Story 6 - Dados de configuração administráveis (Priority: P6)

**Goal**: Confirmar que nenhum limite normativo ou dado anual do PROENS depende de correção nesta
feature.

**Independent Test**: Inspecionar `config_parametros` e `feriados`/`janelas_curso`/
`reservas_proens` no banco de trabalho.

### Implementation for User Story 6

- [X] T013 [US6] Confirmar manualmente que `config_parametros` (tetos AEC 10%/TAD 5%/TR 10%, faixas
  de carga docente por regime, limites de TA diário) e `feriados`/`janelas_curso`/
  `reservas_proens` existem populados no banco de trabalho, conforme
  `docs/arquitetura/01-schema.md` §5.9–5.10. **Achado durante a verificação (fora dos 3 achados
  originais — nenhum teste automatizado cobre esta aba):** `reservas_proens` estava vazia (0
  linhas), diferente de `feriados`/`janelas_curso` (26/27 linhas). Corrigido
  com `migracao/popular_calendario_reservas.py` (novo), migrando a constante `RESERVAS_PROENS` de
  `Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio)` (5 cursos detalhados + valor genérico `GERAL`) — 12 linhas gravadas, 12
  linhas novas em `migracao_log`. `config_parametros`, `feriados` e
  `janelas_curso` já estavam corretos.

**Checkpoint**: Nenhuma constante anual do PROENS ou limite normativo pendente de virar dado.

---

## Phase 9: User Story 7 - Planejamento anual como dado versionado (Priority: P7)

**Goal**: Confirmar que `planejamento_anual` existe com o schema correto e que `Planejamento_2027`
não é mais fonte ativa.

**Independent Test**: Inspecionar o cabeçalho de `planejamento_anual` contra
`docs/arquitetura/01-schema.md` §4.1.

### Implementation for User Story 7

- [X] T014 [US7] Confirmar manualmente que `planejamento_anual` existe (vazia, aguardando a primeira
  geração do motor) com o schema de `docs/arquitetura/01-schema.md` §4.1, e que nenhuma leitura
  ativa depende mais de `Planejamento_2027` — FR-020/FR-021 já satisfeitas pela decisão de
  esclarecimento "preservar sem converter" (ver spec.md, Clarifications), sem tarefa de
  implementação nesta feature.

**Checkpoint**: `planejamento_anual` pronta para a primeira execução do motor (Épico G).

---

## Phase 10: User Story 8 - Vigência de regime de horário e modo de atribuição de disciplina (Priority: P8)

**Goal**: Confirmar que `curso_regime_historico` e o modo de atribuição de disciplina já
existem populados.

**Independent Test**: Inspecionar `curso_regime_historico` (24 cursos desdobrados) e
`disciplinas.Modo_Atribuicao_Padrao`.

### Implementation for User Story 8

- [X] T015 [US8] Confirmar manualmente que `curso_regime_historico` e
  `disciplinas.Modo_Atribuicao_Padrao`/`instrutor_disciplina.Modo_Atribuicao` existem populados
  conforme `docs/arquitetura/01-schema.md` §4.2/§5.2/§5.3 — FR-022 a FR-025 já satisfeitas, sem
  tarefa de implementação nesta feature.

**Checkpoint**: Vigência de regime e modo de atribuição prontos para consumo pelo Épico G.

---

## Phase 11: User Story 9 - Saneamento estrutural residual (Priority: P9)

**Goal**: Fechar formalmente os achados (a)–(k) do documento 05, incluindo a única pendência
genuinamente operacional (dado nominal).

**Independent Test**: Conferir `responsaveis_curso`, `disciplinas.Carga_Horaria_Tempos` e a
Config E de horário contra `docs/arquitetura/01-schema.md`.

### Implementation for User Story 9

- [X] T016 [US9] Confirmar que `responsaveis_curso` (2 linhas semente), a consolidação
  `Carga_Horaria_Tempos` e a correção da Config E (janela de almoço 12h–13h) já estão aplicadas
  conforme `docs/arquitetura/01-schema.md` §4.6/§5.2/§6.1 — FR-026 a FR-029 já satisfeitas.
- [X] T017 [US9] Obter do responsável (Bernardo) o dado nominal real (`Nome_Guerra`,
  `Posto_Graduacao`, `Especialidade`) do Encarregado da Divisão de Administração Acadêmica e, quando
  disponível, atualizar a linha semente `Papel_Assinatura = Encarregado_Divisao` em
  `responsaveis_curso` (hoje `"[A PREENCHER]"`). **Concluído em 2026-08-14**: Bernardo Villas Bôas
  dos Santos, Primeiro-Tenente (`Posto_Graduacao="1ºTen"`, `Nome_Guerra="VILLAS BÔAS"`,
  `Nome_Completo="BERNARDO VILLAS BÔAS DOS SANTOS"`), aplicado por
  `migracao/preencher_encarregado_divisao.py`. O diagnóstico de placeholder em
  `tests/unidade/reconciliacao_migracao.test.ts` não dispara mais.
- [X] T018 [US9] Registrar em `docs/arquitetura/01-schema.md` (nova nota datada, mesmo padrão das
  notas de revisão já existentes) a decisão final de cada achado (a)–(k) do documento 05
  (corrigido/adiado/não será feito) — FR-031, incluindo explicitamente a decisão de `Antiguidade`/
  `Formula_MF`/`Carater` (FR-030). A maioria já está implicitamente fechada pela migração aplicada;
  esta tarefa só torna a decisão explícita e citável.

**Checkpoint**: Todos os achados (a)–(k) do documento 05 têm decisão registrada; único item aberto é
a pendência operacional de T017, explicitamente documentada como tal.

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Fechar o épico com a suíte 100% verde (exceto os `todo` de outros épicos) e o estado do
projeto atualizado.

- [X] T019 [P] Rodar `quickstart.md` do início ao fim; confirmar `tests 58, pass 45, fail 0, todo 13`.
- [X] T020 [P] Atualizar `CLAUDE.md`: substituir a seção "3 achados reais da suíte de invariantes"
  por um registro de fechamento datado (o que foi corrigido, por qual script, em qual commit), e
  atualizar a linha "Épico C (`/speckit.specify`) ⬜ Não iniciado" da tabela de estado para refletir
  o ciclo Spec-Kit completo.
- [X] T021 Checagem final de consistência (equivalente a `/speckit-analyze`) entre `spec.md`,
  `plan.md` e este `tasks.md` pós-implementação: FR-032/033/034 (achado G1 do `/speckit-analyze`
  original) todas com tarefa concluída e teste verde; achado novo de `reservas_proens`
  (fora do escopo original) documentado em T013, `CLAUDE.md` e `docs/arquitetura/01-schema.md`
  §6.8, sem exigir FR nova (já coberto por FR-017); único item aberto é T017 (pendência
  operacional, não técnica), consistente com o que `tasks.md` já previa desde `/speckit-tasks`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — pode começar imediatamente.
- **Foundational (Phase 2)**: vazia nesta feature (ver nota na própria fase).
- **User Story 1 (Phase 3)**: depende só do Setup. **Bloqueia** as User Stories 3, 4 e 5 — T005,
  T007 e T011 chamam `migracao/_util_migracao.py` (T002).
- **User Stories 2, 3, 4, 5 (Phases 4–7)**: T004 (US2) depende de T011 (US5) — mesmo script/arquivo.
  T005 (US3), T007–T009 (US4) e T011 (US5) dependem de T002 (US1), mas são independentes **entre
  si** quanto à lógica — só não podem escrever no `.xlsx` ao mesmo tempo (ver nota de T011).
- **User Stories 6, 7, 8 (Phases 8–10)**: verificação apenas, sem dependência de nenhuma outra fase
  — podem ser feitas a qualquer momento, inclusive antes das demais.
- **User Story 9 (Phase 11)**: T016 é verificação independente; T017 depende de informação externa
  (Bernardo), sem prazo determinado por este plano; T018 pode ser feita a qualquer momento.
- **Polish (Phase 12)**: T019 depende de todas as fases de implementação (3, 4, 5, 6, 7) concluídas;
  T020/T021 dependem de T019.

### Dentro de cada história

- T002 (utilitário) antes de T005, T007, T011 (scripts que o usam).
- Cada script de correção (T005, T007, T011) antes do teste de confirmação correspondente
  (T006, T010, T012).
- **As três correções físicas (T005, T007, T011) devem rodar em sequência, nunca simultaneamente**
  — diferente do padrão usual de "[P] = arquivos diferentes = pode paralelizar": aqui os três
  scripts são arquivos `.py` diferentes, mas todos escrevem no mesmo `.xlsx` de trabalho, então
  paralelizar a **execução** corromperia o arquivo, mesmo que a **autoria** do código possa ser
  paralela.

### Parallel Opportunities

- T009 (edição de `tests/unidade/regras_de_negocio.test.ts`) pode ser escrita em paralelo a T007/T008
  (arquivo diferente), mas só valida depois que eles rodarem.
- As Phases 8, 9 e 10 (US6/US7/US8 — só verificação) podem ser feitas a qualquer momento, em
  paralelo entre si e com qualquer outra fase.
- T019 e T020 (Polish) são arquivos diferentes e podem ser feitas em paralelo, uma vez que as
  fases de implementação estejam concluídas.

---

## Parallel Example: User Story 4

```bash
# T007/T008 (migracao/normalizar_posto_graduacao.py) e T009 (tests/regras_de_negocio.test.ts)
# podem ser escritos em paralelo - arquivos diferentes, sem dependência de autoria:
Task: "Implementar migracao/normalizar_posto_graduacao.py (T007+T008)"
Task: "Atualizar PESO_POR_PG em tests/regras_de_negocio.test.ts (T009)"

# T010 só roda depois que AMBOS acima estiverem prontos e T007/T008 tiverem sido executados.
```

---

## Implementation Strategy

### MVP First (User Story 1 apenas)

1. Completar Phase 1: Setup (baseline).
2. Completar Phase 3: User Story 1 (`migracao/_util_migracao.py`) — sem isso, nenhuma correção
   segue o padrão de auditoria exigido pela constitution (Princípio IV).
3. **Parar e validar**: revisar o utilitário isoladamente antes de usá-lo nas 3 correções.

### Entrega incremental

1. Setup + User Story 1 → utilitário de backup/log pronto.
2. User Story 3 (T005/T006) → vínculo órfão corrigido → validar → commit.
3. User Story 4 (T007–T010) → `Posto_Graduacao` saneado → validar → commit.
4. User Story 5 (T011/T012) → IDs renumerados → validar → commit (fecha também User Story 2, T004).
5. User Stories 6/7/8 (verificação) → confirmar a qualquer momento, sem ordem obrigatória.
6. User Story 9 (T016/T018 técnicas + T017 operacional) → fecha o épico, exceto a pendência nominal.
7. Polish (T019–T021) → suíte 100% verde, estado do projeto atualizado, `/speckit-analyze` limpo.

### Estratégia de commit (Princípio VI — mudança cirúrgica)

Um commit por script de correção (T002, T005, T007+T008, T011), não um commit único "corrige os 3
achados" — mesmo padrão já usado por `migracao/renomear_materia_para_disciplina.py`.

---

## Notes

- [P] = arquivos diferentes, sem dependência de **autoria** — não confundir com poder **executar**
  simultaneamente (ver aviso em T011).
- [Story] mapeia cada tarefa à história de usuário correspondente em `spec.md`, para rastreabilidade
  (constitution, Princípio VIII).
- A maioria das histórias (US2, US6, US7, US8, e a maior parte de US3/US5/US9) já está satisfeita
  pela migração aplicada antes deste ciclo Spec-Kit — as tarefas correspondentes são de verificação,
  não de construção, e isso é intencional (ver `research.md`, "achado de escopo"), não uma lacuna
  deste `tasks.md`.
- T017 (dado nominal) é a única tarefa desta feature sem critério técnico de conclusão — depende de
  informação operacional externa; documentar como pendência aberta, não como bloqueio.
