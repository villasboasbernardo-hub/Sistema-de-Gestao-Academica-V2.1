# Especificação da Feature: Épico 5, fatia (a) — Cursos e turmas

**Feature Branch**: `feat/EPICO-5a-cursos-e-turmas` · diretório `specs/009-cursos-e-turmas`

**Created**: 16/09/2026

**Status**: **Fechada para implementação em 17/09/2026.** *(Histórico: nasceu como Draft, ainda com pontos em aberto, de propósito.)* As sessões de
`/speckit-clarify` de 16/09/2026 fecharam T-1, Q-22, Q-28, Q-21, Q-07, Q-06, Q-06.1, Q-12, Q-07.1, Q-01, Q-08, Q-13, Q-14, Q-11 e a parte de limite da Q-23; as rodadas seguintes, no mesmo dia, fecharam Q-20, Q-22.1, a parte de sala da Q-23, a Q-23.1, a Q-11.1, a Q-06.3, a Q-24, a
Q-24.1, a Q-02 e a Q-03. **Em 17/09/2026, as respostas ao lote único do plano fecharam todas as
demais** — Q-04, Q-05, Q-06.2, Q-08.1, Q-09, Q-10, Q-15, Q-16, Q-17, Q-18, Q-19, Q-21.1, Q-21.2, Q-22.2,
Q-22.3, Q-23.2, Q-25, Q-26, Q-27 e Q-29 —, com o `FR-023` **adiado por dado ausente**. A pergunta que
o registro das respostas abriu — a auditoria da troca de sigla (B-21) — **fechou no mesmo dia**, e a
**B-22**, que o fechamento dela abriu, **fechou também**. **Não há pergunta aberta**; o que resta são
pendências nomeadas, com dono, no `plan.md`. Esta spec **não** foi escrita para parecer completa.

**Input**: fatia (a) do Épico 5 — cursos e turmas —, a partir da `main` atualizada com a fatia
(c) mesclada (PR #16, squash `7b85f27`, 16/09/2026). Tela e regra sobre tabelas que **já existem**
desde o Épico 1 e **já têm dado real** desde o Épico 2. Sem tabela nova e sem código nesta rodada.
**Emenda de 16/09/2026 (Q-07):** a fatia passa a ter **uma** migration — imutabilidade do regime e
geração do código de turma, ambas no banco (`FR-046`).
**Emenda de 17/09/2026 (B-1, A-1):** a fatia passa a ter **sete** migrations e é entregue em **dois
PRs** — banco e varredura primeiro, telas depois (`FR-046`, `FR-046.1`).

---

## Contexto

O Épico 5 entrega os quatro cadastros estruturantes, em três fatias — (a) cursos e turmas,
(b) disciplinas, (c) instrutores. A **(c) já está na `main`** (spec 006, PR #16). Esta é a **(a)**.
A `(b)` não é tocada aqui, exceto pelo que ela **depende** desta: o seletor de turma.

### ⚠️ Esta fatia não tem spec de herança — e o que existe foi procurado, não presumido

Cursos e turmas são herdados da **v1.0**, sem documento dedicado na v2.0. Antes de escrever
requisito, o comportamento real foi procurado nos três lugares alcançáveis. **O que foi encontrado, e
onde:**

| Fonte | Caminho | O que mostra |
|---|---|---|
| **Código da v1.0** | `SIS11/Versão 1.0/index.html` (aba `#tabCursos`, linhas 411–437 e 1025–1084; Início, 929–1020; página do curso, 1085–1130) e `SIS11/Versão 1.0/Código.gs` (`CRUD_CONFIG`, linhas 63–77; `LISTAS_VALIDACAO`, 101–112; `getContextoInicial`, ~540–570) | A aba **Cursos** da v1.0 tinha: indicadores (total de cursos e contagem por classificação), **um gráfico de barras** de duração média por classificação, um aviso *"N curso(s) sem duração (semanas) cadastrada"*, **cartões descritivos agrupados por classificação** em acordeão (sigla, classificação, nome, modalidade, duração, propósito) e, abaixo, a **tabela genérica de CRUD** com botão *"+ Novo Curso"* **só para Admin**. A tela **Início** derivava o *status do curso* das turmas (`derivarStatusCurso_`: prioridade Ativa › Planejada › Concluida › Cancelada › "Sem turma"). A **página do curso** mostrava cabeçalho com status derivado, classificação, os parâmetros de regime como *chip* (`8 TA/dia · Config A · 50min/int 10min`, ou `EAD Nh/dia`), um emblema *"parâmetros padrão"* quando o curso caía no valor de reserva (`RN-MAT-03`) e **pílulas de turma** quando havia mais de uma. **`Turmas_Ativas` estava no `CRUD_CONFIG` (escrita Admin), mas não tinha formulário na interface** — a turma era editada na planilha |
| **Código da v2.0** | `SIS11/CIAARA-11-v2/src/frontend/ViewCurso.html` (479 linhas), `ViewInicio.html`, `backend/Estatisticas.gs` (`getEstatisticasCursos`, `getEstatisticasTurmas`), `backend/Bootstrap.gs` (`resolverTurmaEmDestaque_`, linhas 139–150), `backend/RegimeCurso.gs`, `backend/Crud.gs` (`CRUD_CONFIG`, linhas 19–41) | A **Página do Curso** virou **cartões por classificação, expansíveis**, na ordem fixa *Regular · Especial · Expedito · Estágio de Qualificação · Aperfeiçoamento Avançado*; o cartão expandido traz modalidade, propósito, **grade curricular** (tabela disciplina × CH), os três cartões de teto AEC/TAD/TR, Estudo Individual, o **módulo de turmas** (filtro pelos 4 status, **pré-selecionado em "Ativa"**, mais a opção "Todas"; um `<select>` de turma; botão "Período das Disciplinas") e os cartões de disciplina. A tela Início mostra **carrosséis por classificação** com a *turma em destaque* de cada curso — regra pura: **turma `Ativa` cuja janela contém hoje; empate pela `Data_Inicio` mais recente; nenhuma se não houver**. As estatísticas de cursos são *total de cursos, turmas ativas, contagem por classificação e duração média por classificação*; as de turmas, *total, ativas, por status e por ano de início*. `RegimeCurso.gs` só **lê** o regime vigente. ⚠️ **O `CRUD_CONFIG` da v2.0 NÃO lista `Cad_Cursos`, `Turmas_Ativas` nem `Cad_Cursos_Regime_Historico`**, e nenhuma tela chama `abrirModalCrud` para eles — **a v2.0 em produção não tem caminho de escrita de curso, de turma nem de regime pela aplicação**. Quem cadastra, cadastra na planilha |
| **Spec 009 da herança** | `specs/heranca-v2.0/009-refatoracao-ui-ux/spec.md` — US3 (cartões expansíveis), `FR-007` (cartões por classificação), `FR-010` (filtro pelos 4 status), `FR-014` (painéis de estatística dos 4 módulos), `SC-003`, `SC-005` | Confirma a leitura do código acima. É **refatoração de UI/UX**, não regra de cadastro |
| **Documentos da Fase 1** | `RF-CURSOS-01/02/03`, `RF-CURSO-01` a `06`, `RF-HOR-01` a `10`, `RF-INI-01` a `04`, `RF-NAV-01` a `04`, `RF-CRUD-01/04`; `RN-2027-09`, `RN-MAT-03/04`, `RN-CRUD-01/02/03`, `RN-DEG-01/02`; documento 06 (Épico 5, tabela de escopo e critérios 3–7); documento 08, Tema J (origem da aba "Sobre"); documento 05 §4.1, §7.5, §9.2; documento 01 §2.5 (matriz) | A **regra**. Onde o código da v1.0/v2.0 e os documentos divergem, **os documentos prevalecem** (Princípio I) — e a divergência é **listada**, não resolvida aqui |

**O que isso significa para esta spec:** há comportamento real de **leitura** (cartões, indicadores,
página do curso, turma em destaque) e **nenhum** comportamento real de **escrita** de curso, turma ou
regime pela aplicação. O "cadastro completo" desta fatia é, na prática, **a primeira tela de cadastro
que cursos e turmas terão** — e todo campo, regra e transição que os documentos não fixam está na
seção *Pontos em aberto*, não inventado aqui.

### Conferência do escopo, item a item — o que o pedido disse, o que a fonte diz

| Item citado no pedido | Documento 06 (tabela de escopo do Épico 5) | Documento 42 | Veredito |
|---|---|---|---|
| Cursos: **cadastro completo** | *"CRUD"* | O 42 **não tem prompt próprio para a (a)**: diz que ela *"segue o mesmo molde"* da (c) e só acrescenta parágrafo para a (b) | ✅ Confirmado, com a ressalva acima: não há tela legada de escrita a portar |
| **Cartões por classificação** | *"cartões agrupados por classificação com informações descritivas"* | — | ✅ `RF-CURSOS-02`, que acrescenta os **indicadores agregados** (nº de cursos regulares, nº de estágios de qualificação, duração média por classificação) |
| **Aba "Sobre o Curso"** | *"aba 'Sobre o Curso' com grade curricular"* | — | ✅ `RF-CURSO-04`; origem no doc 08 Tema J: *"propósito, matérias, avaliações previstas, só para consulta"*. ✅ **Decidido em 16/09/2026** (Q-01): catálogo, grade curricular e avaliações previstas, só leitura; UEs quando carregadas (`FR-007` a `FR-007.2`) |
| **Vigência com histórico imutável** | *"regime de horário com data de vigência e histórico imutável"* — na linha de **Cursos** | O critério **7** do doc 06 é atribuído pelo 42 à fatia **(b)** | ✅ **Decidido em 16/09/2026 — é desta fatia** (T-1), inclusive a vigência futura e a prova do critério 7. Divergência com o 42 registrada em D-14 |
| **Alertas do curso** | *"alertas do curso"* | — | ✅ `RF-CURSO-06` — mas os três alertas que ele nomeia dependem de disciplina, período por turma e avaliação, que são da (b) e do Épico 8. ✅ **Decidido em 16/09/2026** (Q-13, Q-14): quadro de avisos no curso e na turma, com o que esta fatia cadastra; os três do `RF-CURSO-06` entram como tipos novos quando o dado chegar (`FR-010`, `FR-028.4`) |
| Turmas: **cadastro** | *"CRUD"* | — | ✅ |
| Turmas: **carga alocada** | ✗ **O documento 06 diz "janela real; sala alocada"** — não "carga" | — | ❌ **Corrigido**: é *sala alocada* e *janela real*. A carga da turma é a `vw_carga_horaria_turma`, já consumida pela tela Início, e não é item de cadastro |
| Turmas: **status** | *"status"* | — | ✅ Quatro valores fechados (TURMA-1) |
| **Seletor de turma reutilizável** | *"seletor de turma reutilizável"* — na linha de **Turmas** | — | ✅ **Entregue nesta fatia** — ver *O seletor de turma é desta fatia* |
| (não citado) **Transversal** | *"confirmação antes de salvar; geração automática de identificador"* | — | ➕ Entra, com as perguntas de Q-18 (confirmação) e Q-19 (identificador do curso) |

---

## O que foi medido no banco local em 16/09/2026 — a spec fala do que existe

Stack local subido do zero por `supabase start` (Docker 29.7.2), base do Épico 2. O **projeto remoto**
(`cqhpfuaweoyglhtrckcp`, o mesmo que serve Preview e Production) tem **0 linhas** nas seis tabelas
desta fatia — conferido por `supabase db query --linked`. A Production, hoje, lê uma base vazia.

| Tabela / view | Linhas | O que o dado diz |
|---|---|---|
| `cursos` | **24** (24 `ativo`, 0 `inativo`) | Classificação: `regular` 5 · `expedito` 5 · `estagio_qualificacao` 7 · `aperfeicoamento_avancado` 4 · `especial` 3 — **cinco valores reais**; o `ENUM escopo_curso` tem **sete** (`geral` e `ead_semipresencial` não aparecem em curso nenhum). Modalidade: `presencial` 17 · `semipresencial` 4 · `ead` 3. `limite_turmas_ano` = 1 nos cinco regulares, 2 nos outros 19. `duracao_dias` preenchida nos 24; `duracao_semanas` **nula em 12 de 24**; `proposito` preenchido em 14 de 24. `prioridade_alocacao` no valor padrão nos 24 |
| `turmas` | **28** — `planejada` 11 · `ativa` 7 · `concluida` 7 · `cancelada` 3 | Todas de `ano_letivo` 2026. `turma` (o rótulo `T1`/`T2`) **nulo em 18 de 28** — só os quatro cursos com duas turmas no ano (`C-ApA-AuxNav-PR-SP`, `C-ApA-OcOp-PR-SP`, `C-ApA-PCN-PR-EAD`, `C-ApA-PrevMe-PR-EAD`), o `C-Esp-OpAP T1` e o `C-Exp-BATI T1` têm rótulo. `alunos` nulo em 7 (e igual a 0 em outras 3); `sala_alocada` nula em 2 (`EST-QF-MAREFLU`, `EST-QF-PGRS100`), com **8 valores distintos** (Sala 02/03/04/06, Sala CAHO, Laboratório de informática, Moodle); `data_inicio`/`data_termino` nulas em 1 (`EST-QF-NAVFLU-EAD`). ⚠️ **A documentação diz 29** (doc 00 §, doc 05 §4.1, doc 30): a planilha bruta tem 29 linhas, **mas só 28 com `ID_Turma`** — a 29ª não tem identidade e não entrou. O banco está certo |
| `vw_turmas_rotulo` | 28 | ⚠️ **`rotulo_completo` e `nome_completo_curso` NULOS em 18 de 28** — a view concatena `t.turma`, e `NULL` propaga. A tela Início não a usa (lê `turma_codigo` da `vw_carga_horaria_turma`), por isso ninguém viu. É a view que o seletor de turma naturalmente consumiria. **Divergência listada** (D-3) |
| `curso_regime_historico` | **29** — 24 `padrao` (um por curso) + 5 `excecao` | **Nenhum curso tem mais de uma vigência do mesmo tipo**: todas com `vigente_ate` nulo e `status = 'ativo'`. **A mudança de regime nunca aconteceu no dado** — o "histórico" é hoje um único ponto por curso, ancorado na data de início da turma (ou `2020-01-01` para o `EST-QF-NAVFLU-EAD`, sem data). As 5 exceções: `CAHO`, `C-Ap-HN`, `C-Ap-FR` → 9 TA de 45 min; `C-Espc-FR`, `C-Espc-HN` → 8 TA de 50 min. **4 cursos EAD puros** (`C-ApA-PCN-PR-EAD`, `C-ApA-PrevMe-PR-EAD`, `EST-QF-NAVFLU-EAD`, `EST-QF-PROC-MF-EAD`) com `regime_tempos = 0`, `ta_duracao_min = 0`, horas nulas, sem configuração de horário e com `limite_diario_ead_horas` (4 a 5 h). 3 semipresenciais com TA **e** limite EAD. `fundamento_curricular` preenchido em 10 linhas (as 5 exceções, os 4 EAD e o `C-ApA-AuxNav-PR-SP`); `motivo` em 5 |
| `configuracoes_horario` / `horarios_tempos_aula` | 5 / 40 | O catálogo A–E, imutável por regra (corrigir cria versão sucessora) |
| `responsaveis_curso` | **2**, ambas **gerais** (`curso_id` nulo) | `RSP-000001` elaborador, `dinamico_usuario_logado`; `RSP-000002` encarregado_divisao, `fixo`, *"1ºTen VILLAS BÔAS"*. **Nenhuma por curso.** Consumidor real é o DSA impresso (Épico 6). Se a página do curso as mostra ou edita está em aberto (Q-17) |
| `turma_disciplina` | **210** — 89 `herdado_grade` · 121 `nao_informado` · **0 `manual`** | Só 6 turmas têm período (`CAHO` 22, `C-Ap-HN` 19, `C-Espc-FR` 17, `C-Ap-FR` 13, `C-Espc-HN` 14, `C-Exp-MetocOf` 4 de 5). É dado da fatia (b); aqui só interessa para saber que **criar turma nova hoje não semeia nada** (Q-24) |
| `janelas_curso` | 27 | Derivadas de `Turmas_Ativas` na migração; 28 turmas, 27 janelas — a turma sem datas não gerou janela. É calendário (Épico 7 / `RF-DADOS-04`), não cadastro de turma — mas a **relação janela × turma** está em aberto (Q-25) |
| `perfil_permissao` | — | `cursos`: `ler` para 9 perfis; `criar`/`editar` para **3** (`admin`, `encarregado_administracao_academica`, `ajudante_administracao_academica`). `turmas`: idem, **mais `operador` em `editar`**. ⚠️ **Não existe o recurso `horarios`** nem a ação **`desativar`** que a matriz do documento 01 §2.5 declara; as policies de `curso_regime_historico` e de `responsaveis_curso` usam `cursos.editar`. **Divergência listada** (D-1, D-2) |
| `config_listas` | — | `status_turma` com os 4 valores; `escopo_curso` com **5** valores (`Geral, Regular, Expedito, Estagio_Qualificacao, EAD_Semipresencial`) — **sem** `Especial` nem `Aperfeicoamento_Avancado`, que o `ENUM` tem e 7 cursos usam. **Não há lista de sala** (a v1.0 tinha 8 valores em código) nem de rótulo de turma (`T1`/`T2`) |
| `config_parametros` | — | Nada específico de curso. Existem `janela_almoco_inicio/fim` (12:00–13:00) e `alocacao.limite_ta_dia_padrao` (8) |

---

## O seletor de turma é desta fatia — porque a (b) depende dele

O componente **já existe**: `components/ciaara/seletor-turma.tsx` (Épico 4, fatia (b), `FR-010` da
spec 007). Ele recebe `{ id, rotulo }[]`, **não ordena** (turma não tem antiguidade), nunca exibe
identificador técnico e degrada com `EstadoVazio` quando a lista chega vazia. **Nenhuma tela real o
consome ainda** — só a vitrine `/estilo`.

**O que esta fatia entrega, e registra como entrega sua:** o seletor **alimentado de verdade** — a
consulta que traz as turmas de um curso, o **rótulo** que a pessoa lê, a **pré-seleção** quando
`?turma=` está ausente (`RF-CURSO-01`), e a escrita da escolha **na URL**, não em estado interno.
É este contrato que a fatia (b) (cascata curso → turma → disciplina) e o Épico 6 (`/turmas/[turma]/dsa`)
consomem sem reescrever. A **pré-seleção** está decidida (Q-28, 16/09/2026 — `FR-006.1`); rótulo,
ordem e alcance foram decididos em 17/09/2026 (`FR-034`, `FR-035`, `FR-033.1`).

---

## Clarifications

### Session 2026-09-16

- Q: Em qual fatia fica o registro de mudança de regime de horário com data de vigência, inclusive futura, e a prova de que ela não altera o que já foi lançado? (T-1) → A: **Opção A — tudo na (a).** O documento 06 lista o regime na linha de Cursos, o `RF-CURSOS-03` é requisito do cadastro de curso, e `app.fn_regime_vigente` já permite provar a regra sem disciplina. O regime é atributo do curso, e o cadastro de curso é desta fatia — *"um formulário que não preenche o próprio campo está quebrado"*. **A fatia (b) apenas lê o regime vigente.** A divergência com o documento 42 fica registrada (D-14), **sem alterá-lo**. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- Q: Como o status de uma turma muda ao longo do tempo, e algum status trava alguma coisa nesta fatia? (Q-22) → A: **Opção D — manual e livre, com aviso de incoerência.** Quem pode editar turma escolhe qualquer um dos quatro status a qualquer momento, **sem transição restrita e sem automação**. Acresce-se o **aviso de incoerência entre status e janela, nunca bloqueio**, no mesmo padrão do quadro de avisos de qualidade de cadastro da spec 006 (`FR-027`, lista **aberta e extensível**) e do princípio *"regra normativa vira alerta, nunca bloqueio"*. **O que cada status libera ou trava no lançamento de aula continua sendo do Épico 6** e não entra nesta fatia. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- Q: Quando alguém abre a página de um curso sem indicar a turma no endereço, qual turma deve vir selecionada? (Q-28) → A: **Opção A — pela janela de datas, não pelo status.** A turma cuja janela contém hoje; se nenhuma, a de início mais próximo no futuro; empate pelo início mais recente; nunca `concluida` nem `cancelada`; **curso sem turma em andamento nem futura abre sem turma, com o seletor pedindo a escolha**. Justificativa: na Q-22 o status ficou manual e livre, sem automação — *"logo ele pode ficar desatualizado por desenho"*, e hoje está incoerente em 11 das 28 turmas, com as três `T2` em curso marcadas como `planejada`. *"A navegação não pode depender de um campo que a própria decisão anterior não garante. A janela é fato."* A regra fica mais próxima do `RF-CURSO-01` escrito e do Tema J do documento 08 do que a implementação por status da v2.0; essa divergência com a v2.0 fica registrada (D-15), **sem alterá-la**. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- Q: Como nasce o código de uma turma nova, e o rótulo `T1`/`T2` é obrigatório nela? (Q-21) → A: **Opção A, a recomendada — gerado pela regra existente**, `sigla [rótulo] ano` (`CAHO 2026`, `C-ApA-PCN-PR-EAD T2 2026`), que **28 de 28** turmas já seguem e o Início já usa no link; **rótulo opcional**, coerente com a ratificação de 08/09/2026 de que o designador de turma única é ausência legítima e permanente; o código, uma vez gerado, **nunca muda** (C-04). Duas turmas sem rótulo no mesmo curso e ano colidem no código e são recusadas. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- Q: A regra de que TA por dia e duração do TA não mudam numa vigência já registrada deve ser imposta pelo próprio banco nesta fatia, mesmo que isso traga a primeira migration dela? (Q-07) → A: **Opção B — imutabilidade no banco e geração do código de turma no banco, na mesma migration**, fechando a D-4 e a D-5 como garantia do motor. Justificativa: o `RF-HOR-02` já descreve o mecanismo como policy de `UPDATE` mais trigger de recusa, e o Princípio XI não admite regra de Risco Alto fora do banco; além disso, a fatia (c) já estabeleceu que **código nasce no banco**, tanto para instrutor quanto para o vínculo `VIN`, e gerar o de turma na aplicação criaria dois padrões para a mesma coisa. **O gatilho do código de turma precisa ler a sigla do curso — não é sequência simples.** *(decisão de Bernardo Villas Boas, 16/09/2026)*

*Segunda rodada, 16/09/2026:*

- Q: Quando é preciso corrigir o horário de início ou o intervalo de um regime já registrado, isso pode ser feito editando a vigência existente, ou exige registrar uma vigência nova? (Q-06) → A: **Opção A — vigência nova para qualquer mudança, imposta pelo banco.** Nenhum parâmetro de vigência existente é alterado; só se grava o `vigente_ate` quando entra a sucessora; vigência que ainda não começou pode ser cancelada e substituída; vigência que já começou nunca é editada nem cancelada. **Acréscimo de tela:** a correção de vigência que ainda não começou MUST ser **uma única ação — "Corrigir esta vigência"** —, que abre o formulário pré-preenchido com os valores atuais e, ao salvar, **cancela a anterior e grava a sucessora numa mesma transação**: *"para quem usa parece edição; para o banco continua sendo append-only, sem nenhum UPDATE de parâmetro"*. **Por que A e não D:** a regra da D dependeria da data corrente, *"tornando a mesma linha editável hoje e imutável amanhã, o que é frágil de impor e instável de testar"*; a A torna a vigência imutável sem condicional temporal, coerente com a Q-07 e com o princípio de que histórico não se reescreve. A leitura do `RF-HOR-02` fica registrada como divergência (D-16), **sem alterá-lo**. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- Q: Até quando uma vigência de regime pode ser corrigida pela ação "Corrigir esta vigência": enquanto a data de início dela não chegou, ou enquanto nenhum lançamento do curso ainda depende dela? (Q-06.1) → A: **Opção A — pelo fato**: corrigível enquanto nenhum lançamento do curso — aula, avaliação, vista de prova ou atividade de turma — tiver data igual ou posterior ao início da vigência. **Três acréscimos:** (1) a checagem MUST cobrir **nominalmente** `registros_aula`, `avaliacoes` e `atividades_nao_letivas`, e **qualquer tabela nova que passe a depender do regime tem de entrar nessa lista**, sob pena de o gatilho virar falsa garantia; (2) verificação e substituição acontecem **na mesma transação, com a linha da vigência travada**, para não haver corrida entre conferir e trocar; (3) havendo lançamento, a recusa chega como **mensagem compreensível**, dizendo **qual lançamento impede** e **qual é o caminho** — registrar vigência nova a partir de uma data —, nunca como erro cru do banco. Justificativa: o critério de fato protege exatamente o que a `RN-2027-09` protege, *"registros já lançados"*, e é determinístico de testar; o critério por data depende do relógio e hoje deixaria **0 das 29** vigências corrigíveis, tornando a ação inútil. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- Q: O Operador deve poder registrar e corrigir vigência de regime de horário, e deve poder editar turma, inclusive mudar o status? (Q-12, D-1, D-2) → A: **Opção B, com correção de rumo — o Operador escreve regime e horário E edita turma, sempre dentro do seu escopo de curso; e, confirmado na desambiguação, também cria turma no seu escopo.** No regime, **o documento 01 já estava certo e o seed é que se corrige**. Na turma, **a realidade está certa e o documento 01 é que se emenda** — não fica como "divergência aceita". Justificativa: *"o Operador é o responsável pelo curso — quem opera o curso no dia a dia também abre as turmas dele, por praticidade"*. A matriz de permissões **é dado, não código**, e esta divisão pode ser revista à frente, quando outros perfis ganharem mais permissões. Requisitos da implementação desta fatia: o seed ganha a permissão de regime e horário para o Operador; as policies de `curso_regime_historico` passam a usar essa permissão em vez de *editar curso*; e os testes negativos de RLS refletem que o Operador escreve regime, cria e edita turma **dentro** do seu escopo e é recusado **fora** dele. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- Q: Na edição de uma turma existente, o que o banco deve fazer quando a mudança de rótulo, ano ou curso deixaria duas turmas sem rótulo no mesmo curso e ano? (Q-07.1) → A: **Opção B — edição livre, e o banco recusa só a edição que produz a colisão**, com dois acréscimos: (1) a checagem MUST valer para **os três caminhos** que produzem a colisão — remover o rótulo, mudar o ano e mudar o curso —, *"sob pena de virar gatilho parcial"*; (2) a regra correta **não** é "duas turmas sem rótulo", e sim **"duas turmas com o mesmo rótulo, sendo o vazio um caso particular de igual"**, no mesmo curso e ano: como o código nunca muda, editar o rótulo de uma `T2` para `T1` produziria duas turmas exibindo `T1` com códigos diferentes, *"e a ambiguidade para quem lê é exatamente a mesma"*. A mensagem de recusa diz **qual turma já ocupa aquele rótulo naquele curso e ano**. *(decisão de Bernardo Villas Boas, 16/09/2026)*

*Terceira rodada, 16/09/2026 — a última antes do plano, priorizando o que a tela entrega:*

- Q: O que a aba "Sobre o Curso" deve mostrar nesta fatia? (Q-01) → A: **Opção A — catálogo do curso, grade curricular e avaliações previstas, só leitura**, com duas ressalvas. **Primeira:** conferir se a norma proíbe *modelar* ou também *exibir* `formula_mf` e `carater`; se for só modelar, os dois entram como **texto descritivo em leitura** — *"saber que uma avaliação é eliminatória é informação que quem consulta precisa"*. **Conferido: a proibição é de modelar, calcular e interpretar, não de exibir** — os dois campos entram (`FR-007.1`, com as citações). **Segunda:** as **Unidades de Ensino com a ementa de cada disciplina entram nesta aba quando o Épico 2 carregar as 572**, e a tela MUST ser construída de modo que acrescentá-las depois não exija refazer o que foi feito agora. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- Q: Quais classificações um curso pode ter, em que ordem os grupos de cartões aparecem, e a classificação carrega alguma regra além de agrupar os cartões e recortar o escopo do Operador? (Q-08) → A: **Opção B, com o limite de turmas corrigido.** As **cinco classificações do Glossário, na ordem do Glossário e da v1.0 — Regular · Expedito · Especial · Aperfeiçoamento Avançado · Estágio de Qualificação** —, porque *"é a v2.0 que diverge das duas fontes normativas sem registro, e mudar ordem de cartão não quebra dependência nenhuma"*; a divergência de ordem com a v2.0 fica registrada (D-18), sem alterá-la. **O banco passa a recusar `ead_semipresencial` em curso**, e não só o formulário: como o recorte do Operador é por igualdade exata de classificação, um curso gravado com esse valor ficaria invisível para todos os Operadores. **Correção quanto ao limite de turmas — é regra, não só dado:** o limite é **UM por ano letivo para curso Regular e DOIS por ano letivo para as demais classificações**, e a classificação determina esse valor ao cadastrar. **O limite é POR ANO LETIVO, nunca total** — um curso regular pode ter uma turma em 2026 e outra em 2027 —, e a contagem considera **apenas as turmas daquele ano**. O valor entra como **padrão vindo da classificação e permanece editável por curso**; se precisar ser fixo e inegociável, é decisão separada (Q-08.1). **O que acontece quando o limite é atingido — alerta ou bloqueio — continua sendo a Q-23 e não é respondido aqui.** *(decisão de Bernardo Villas Boas, 16/09/2026)*
- Decisão antecipada por Bernardo, sem pergunta formal, sobre desativar curso (parte da Q-11): **curso inativo NÃO fica oculto para o Admin.** O Admin é o perfil que enxerga e alcança tudo no sistema, sem restrição de escopo; hoje `app.cursos_do_usuario()` devolve só cursos ativos para todos os perfis, inclusive para ele — *"o que torna desativar um curso uma porta sem maçaneta por dentro: ninguém consegue reativá-lo pela tela"*. **Com a condição expressa de conferir antes se isso colide com o recorte de identificação civil e residência da spec 006** — e, se colidisse, parar e reportar em vez de ampliar. **Conferido em 16/09/2026: não colide** (`FR-017.1`). *(decisão de Bernardo Villas Boas, 16/09/2026)*
- Q: Quais alertas o curso e a turma devem mostrar nesta fatia? (Q-13, Q-14) → A: **Opção A, com três ajustes** — quadro de avisos no **curso** e na **turma**, com o que esta fatia cadastra, no molde do quadro recolhível da spec 006: **contagens sempre à vista, lista a um clique, nunca bloqueio**. **Curso:** sem duração em semanas, e **também sem propósito** — *"a Q-01 decidiu que o propósito aparece na aba 'Sobre o Curso'; sem esse aviso, quase metade dos cursos abre a aba com um bloco vazio e ninguém fica sabendo"*. **Turma:** além da incoerência já decidida, sem janela, sem sala e **sem efetivo E que não está planejada** — *"nunca só 'sem efetivo'"*: efetivo vazio em turma planejada é situação normal; com o refinamento o aviso dá zero hoje e aparece no dia em que uma turma virar ativa sem efetivo. **Os três alertas do `RF-CURSO-06` NÃO ganham região reservada e sempre vazia**: entram como **tipos novos da lista aberta** quando a fatia (b) e o Épico 8 trouxerem o dado, porque a lista é aberta e extensível e tipo com contagem zero não aparece — *"reservar espaço visível permanentemente vazio contraria essa decisão"*. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- Q: Quem pode desativar um curso, e o que os perfis que não são Admin continuam vendo de um curso inativo e do histórico dele? (Q-11) → A: **Opção D, com quatro acréscimos.** Desativam **Admin, Encarregado e Ajudante da Divisão**, com a ação criada no seed; o curso **só pode ser desativado se não tiver turma `planejada` nem `ativa`** — resolve-se a turma primeiro, concluindo ou cancelando; e o curso e todo o histórico continuam legíveis por quem já o alcançaria ativo, com o escopo preservado. **(1) O principal:** curso inativo MUST continuar **alcançável**, não só legível por link direto — a listagem de cursos ganha **filtro de situação** no padrão do `?situacao=` dos instrutores, abrindo com os ativos e mostrando os inativos quando a pessoa escolhe; as turmas do curso permanecem com a própria situação e continuam consultáveis. *"Desativar ARQUIVA, e não apaga: o dado sai de oferta e continua à mão para consulta, como acontece com uma turma concluída."* **(2)** "Arquivar" é **mudar de situação, nunca mover dado** — nenhuma tabela de arquivo, nenhuma transferência, nenhuma cópia; e a Q-22.2 ("Arquivada" para turma concluída há muito) **não pode usar o mesmo nome para coisa diferente**. **(3)** "Legível" é **leitura**: curso inativo **não recebe turma nova nem lançamento novo**, como o instrutor desativado; se a recusa de lançamento for matéria do Épico 6, registrar lá explicitamente, sem deixar ambíguo aqui. **(4) O maior risco:** ao `app.cursos_do_usuario()` deixar de filtrar `ativo`, o filtro que vinha de graça some para **todos** os consumidores, inclusive telas já na `main`; a implementação MUST varrer todos e cada um que precise de "só ativo" passa a filtrar explicitamente, **com teste que reprove se curso inativo vazar para uma lista de escolha** — *"isso é requisito, não observação"*. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- Q: Quando abrir uma turma faz o curso passar do limite de turmas daquele ano letivo, o sistema avisa ou recusa, e turma cancelada conta para o limite? (Q-23) → A: **Opção A — avisa, nunca recusa; cancelada não conta** —, com três acréscimos. **(1)** O aviso MUST aparecer **também no momento de salvar**, e não só depois no quadro: o **diálogo de confirmação** é enriquecido quando o limite é ultrapassado — algo como *"este curso já tem 2 turmas em 2026, que é o limite; confirmar mesmo assim?"* —, mantendo a confirmação e nunca bloqueando; *"aviso que só aparece dias depois, no quadro, chega tarde: a informação precisa estar onde a decisão é tomada"*. O aviso no quadro continua existindo, para quem não estava lá na hora. **(2)** A mensagem, **nos dois lugares**, MUST nomear o **ano** e **quantas turmas** já ocupam o limite — nunca um "acima do limite" genérico. **(3)** A contagem MUST ser definida por **enumeração positiva** do que conta — turmas **`planejada`, `ativa` e `concluida`** —, e **não** como "todas menos cancelada", para que um status novo não entre na contagem por descuido. Turma cancelada não ocupa vaga no ano, porque não vai acontecer: o `C-ApA-OcOp-PR-SP`, com as duas turmas de 2026 canceladas, **deve poder abrir turma naquele ano sem aviso nenhum**. *(decisão de Bernardo Villas Boas, 16/09/2026)*

*Quarta rodada, 16/09/2026:*

- Q: Além do que o banco já exige, quais campos de curso e de turma devem ser obrigatórios, e quais valores-padrão silenciosos devem sair? (Q-20, Q-22.1) → A: **Opção A — o banco exige modalidade da turma, modalidade do curso (sem o padrão `presencial`) e duração em dias do curso; o padrão do limite de turmas vem da classificação, no banco** —, com três acréscimos. **(1)** O padrão do limite **não pode ser `DEFAULT` de coluna**, porque `DEFAULT` não enxerga outra coluna da mesma linha: tem de ser **gatilho `BEFORE INSERT` que lê a classificação**, como o gatilho do código de turma da Q-07; e ele MUST **preencher apenas quando o valor não vier** — limite informado explicitamente é respeitado, porque a Q-08 decidiu que o limite continua editável por curso. *"Sem isso escrito, ou o gatilho sobrescreve a escolha da pessoa e o limite deixa de ser editável, ou não preenche nada e o furo continua."* **(2)** Registrar **por que** o padrão silencioso sai: *"valor gravado que ninguém escolheu é indistinguível de escolha real — é pior que nulo, porque nulo o quadro de avisos detecta e sinaliza, enquanto o padrão silencioso some para sempre. Um curso EAD que virou 'presencial' por padrão jamais apareceria num aviso."* **(3)** A **modalidade da turma não é, e não deve virar, cópia ou herança da modalidade do curso**: o `C-ApA-PCN-PR-EAD` está `semipresencial` e as duas turmas dele estão `ead`; fazer a turma herdar quebraria a `RN-MAT-04`. Os campos que já geram aviso — duração em semanas, propósito, janela, sala e efetivo — **continuam opcionais**. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- Q: A sala da turma deve ser escolhida de uma lista administrável, conferida pelo banco, ou continuar texto livre? (Q-23) → A: **Lista administrável em `config_listas`, conferida pelo gatilho genérico já existente** (o mesmo de `registros_aula.tipo_atividade`); **vazio continua aceito** — turma sem sala gera aviso, nunca bloqueio. **Valores iniciais: o inventário institucional informado por Bernardo, não inferido dos dados** — Sala CAHO (sala do Curso de Aperfeiçoamento em Hidrografia para Oficiais), Sala 01, Sala 02, Sala 03, Sala 04, Sala 06, Laboratório de Informática, Moodle; **Sala 05 não consta do inventário — ausência deliberada, não omissão de transcrição**. **Moodle é ambiente virtual, não sala física:** a lista distingue os dois por **atributo do próprio registro** (campo de metadado ou lista irmã), **nunca** por comparação de texto com "Moodle" no código, e todo cálculo futuro de ocupação, conflito ou lotação de sala ignora ambientes virtuais. **Acrescentar sala nova é requisito explícito**, sem código nem migration, e o `quickstart.md` diz onde e quem. **Reconciliação obrigatória na mesma migration, nesta ordem:** listar as salas gravadas; comparar com os oito nomes sem caixa e acento; normalizar por `UPDATE` o que é claramente a mesma sala, com as substituições em comentário na migration; relatar a Bernardo o que não corresponder, sem inventar nem apagar; **só então** criar o gatilho. **Não fazer:** tabela de salas com chave estrangeira; semear a lista a partir das turmas; tratar Moodle como caso especial em código; recusar sala vazia; alterar sala de turma existente sem a substituição registrada na migration. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- Q: Por onde, e por quem, uma sala nova é acrescentada, já que não existe tela para editar a lista? (Q-23.1) → A: **Opção A — tela mínima de salas em Administração, nesta fatia**, com escrita para quem o seed já autoriza, **Admin e Encarregado da Divisão**, e o caminho documentado no `quickstart.md`. **Recusadas, com motivo:** **C** — tela genérica de `config_listas` abriria edição de vocabulário normativo pela interface, o que a regra de vocabulário inviolável proíbe, e antecipa `/admin/parametros`, que não é desta fatia; **D** — deixaria o `FR-029.2` sem caminho real: *"acrescentar sala pelo banco direto é pedido de desenvolvimento com outro nome"*; **B** — o Ajudante da Divisão fica de fora **de propósito**: a matriz do documento 01 ainda marca Encarregado e Ajudante como "a confirmar", e ampliar a matriz é decisão própria, registrada e datada, não subproduto de uma pergunta sobre salas; acrescentar depois é uma linha de seed. **Três emendas:** **(1)** desativar sala **não invalida** turma existente — a validação MUST aceitar valor inativo já gravado; desativar é sair do seletor de turma nova, nunca recusar a edição de turma que já usa a sala; ao desativar sala em uso, a tela **avisa listando as turmas afetadas e permite prosseguir**. **(2)** A tela **não renomeia** sala — ações: listar, acrescentar, desativar, reativar; renomear na lista órfã toda turma que gravou o nome anterior, a mesma divergência que a reconciliação teve de corrigir; correção de nome é por migration registrada, com o `UPDATE` das turmas. **(3)** Física ou virtual é **obrigatório** ao acrescentar, **sem padrão silencioso** — senão o próximo ambiente virtual nasce como sala física e o `FR-029.1` deixa de valer sem ninguém perceber. **Não fazer:** tela genérica de listas; Ajudante no seed; renomear; apagar sala (regra 4); física/virtual com padrão; validação de sala recusando valor inativo. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- Q: Quem pode reativar um curso inativo, e a reativação tem alguma condição? (Q-11.1) → A: **Opção A — desativar e reativar têm a mesma permissão e os mesmos perfis: Admin, Encarregado e Ajudante da Divisão; sem condição e sem motivo obrigatório.** **Recusada a B:** permissão assimétrica torna a desativação irreversível na prática, contradizendo o "arquivar, não apagar" do `FR-017`. **Recusada a C:** exigir justificativa para reativar e não para desativar põe o atrito no lado errado; motivo registrado, se desejado, pertence às duas direções e é decisão própria — e a auditoria já registra autor e momento da mudança de situação. **Emenda 1 — a exceção no gatilho é cirúrgica:** vale **só** para a coluna de situação, **só** na própria linha de `cursos`, **nunca** para as tabelas dependentes; é expressa em termos de **valor alterado, não de coluna enviada** — um `UPDATE` que reenvie colunas inalteradas junto com a situação é aceito, porque formulários reenviam a linha inteira (a mesma falha do gatilho genérico de domínio); a ação de reativar, ainda assim, envia só a situação. **Emenda 2 — quem reativa precisa enxergar o curso inativo**, por filtro ou aba explícita, e essa abertura de leitura **não** habilita escrita nas tabelas protegidas. O botão de reativar segue o padrão do instrutor: oculto para quem não tem a permissão, visível para quem tem, na tela do curso inativo. **Não fazer:** restringir a reativação a menos perfis que a desativação; exigir motivo; escrever a exceção por coluna enviada; estender a exceção a tabela dependente; abrir a leitura de inativos trazendo a escrita junto; criar ação de reativar separada no seed. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- Q: Uma atividade de escopo global, que vale para todas as turmas e não tem turma própria, impede a correção da vigência de regime de quais cursos? (Q-06.3) → A: **Opção A — pela janela: conta para todo curso que tenha turma cuja janela de datas contenha a data da atividade.** **Recusadas:** **B** congelaria a correção de vigências de cursos que não tinham turma em curso na data, tornando "Corrigir esta vigência" inútil já na primeira atividade global; **C** amarra a trava ao status da turma, que é mutável — uma turma que passa a `concluida` destravaria a vigência e permitiria reescrever horário já emitido e distribuído, *"a mesma falha que a garantia impede, apenas adiada"*; **D** mantém a falsa garantia que o acréscimo (1) da Q-06.1 mandou eliminar. **Três acréscimos:** **(1)** turma **sem datas não alcança**, e isso é texto do requisito, não consequência acidental — sem início e fim não há horário calculável, logo nada foi emitido e nada há a proteger; **(2)** **janela incompleta conta como alcançada** quando a data da atividade é compatível com a ponta existente, com o motivo exibido — *"travar errado é atrito visível e reversível; não travar errado é reescrita silenciosa de horário já distribuído. Diante de dado incompleto, o sistema escolhe o erro visível"*; **(3)** a recusa **nomeia a atividade e a turma** que produziram a trava, e **existe teste automatizado** que cadastra atividade global e prova os três casos — janela contendo a data, turma sem datas, janela incompleta —, porque a base tem zero atividades globais e nenhum teste natural exercita a regra. **Fronteira com a Q-06.1:** esta decisão define **quais cursos** a atividade global alcança; **não** resolve quando a checagem roda nem a corrida entre corrigir a vigência e lançar aula nova — isso continua com o plano, e as duas coisas não se fundem. **Não fazer:** usar o status da turma; contar para cursos sem turma na data; deixar atividade global fora; tratar janela incompleta como "não alcança"; recusar sem nomear a causa. *(decisão de Bernardo Villas Boas, 16/09/2026)*

*Quinta rodada, 16/09/2026:*

- Q: Quando uma turma nova é criada, as linhas de disciplina dela, com o período previsto de cada uma, devem nascer junto, ou ficam para a fatia de disciplinas criar depois? (Q-24) → A: **Opção A — nascem junto com a turma, no banco, na mesma transação**: uma por disciplina **ativa** do curso, com período herdado da grade quando houver (`herdado_grade`) e em branco quando não houver (`nao_informado`). **Recusadas:** **C** faria toda turma criada entre as fatias (a) e (b) nascer diferente das 28 migradas, exigindo preenchimento retroativo sobre dado já em uso; **D** abre a janela da turma gravada sem disciplinas por falha da segunda escrita e duplica em código uma regra que já existe; **B** obriga a redigitar período que a grade já prevê e gera aviso de LIQ em turma recém-criada. **Cinco precisões:** **(1)** conferir **no código**, não nos dados, se a cláusula da janela é regra existente — **conferido: é**, no script da v2.0 que criou as linhas (`FR-032.1`); **(2)** turma sem datas ou com janela incompleta nasce `nao_informado`, **como texto do requisito**; **(3)** criação por **gatilho `AFTER INSERT` em `turmas`**, cobrindo qualquer caminho, com unicidade sobre (turma, disciplina) — **conferida: já existe**; **(4)** só disciplina **ativa**; a linha histórica da `ALH-II` inativa do `C-Esp-ALH` **não é removida nem replicada**; **(5)** mudança da grade depois de a turma existir é da **fatia (b)**, não resolvida aqui. **Caso adicional:** curso sem disciplina ativa gera turma com **zero** linhas — **aviso, nunca bloqueio**. **Não fazer:** criar as linhas pela aplicação em escritas separadas; deixar para a (b); nascer tudo em branco; replicar disciplina inativa; tratar a cláusula da janela como regra existente sem ler o código. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- Q: Onde a turma é listada, criada e editada: dentro da página do curso, em rotas próprias, ou numa tela de turmas com entrada no menu? (Q-24.1) → A: **Opção B — lista e criação sob o curso, ficha no segmento da turma**: lista na página do curso; criação em `/cursos/[curso]/turmas/nova`; ficha e edição em `/turmas/[turma]`, o segmento que o documento 24 já reservou para o DSA. **Recusadas:** **A** poria a ficha em segmento distinto de `/turmas/[turma]/dsa`, fazendo a turma existir em dois endereços sem parentesco e obrigando o Épico 6 a contrariar o documento ou mover o DSA; **C** contraria o achado D-6 da fatia (c) e o `RF-NAV-04` — criação tem rota própria, e diálogo sem endereço não é linkável nem marcável; **D** exigiria entrada "Turmas" no menu, que a MENU-1 validou sem ela, e listagem global de turmas não foi pedida. **Precisões:** **(1)** o identificador da URL é o **próprio código da turma, sempre codificado** (`/turmas/C-ApA-PCN-PR-EAD%20T2%202026`) — uma representação só, decodificando exatamente no código gravado; recusadas a troca de espaço por **hífen** (ambígua, porque a sigla já tem hífen, e exigiria coluna derivada e única para resolver o problema que cria) e por **sublinhado** (exigiria proibir sublinhado em sigla e rótulo por motivo cosmético de URL, e criaria segunda representação); com **quatro condições**: função **única** que monta todo endereço de turma, sem concatenação em lugar nenhum; o link da tela **Início**, que hoje escreve o código sem codificar, **corrigido nesta fatia**; teste de **ida e volta sobre os 28 códigos reais** e as siglas de curso, nunca sobre exemplos à mão; e **"turma não encontrada" distinto de "sem permissão"**, no padrão de estado vazio da spec. **(2)** a ficha não fica órfã: mostra o curso a que a turma pertence, com caminho de volta. **(3)** repete o desenho de rotas do instrutor, sem gramática nova. **(4)** depois de criar, o destino é a ficha da turma criada. **(5)** **não existe listagem global de turmas nesta fatia, por decisão**, e `/turmas/[turma]/dsa` fica **reservado ao Épico 6**. **Não fazer:** aninhar a ficha sob o curso; criar ou editar em diálogo sem rota; entrada no menu; construir o DSA; padrão de rota diferente do instrutor; trocar espaço por hífen ou sublinhado; coluna derivada para a URL; restringir sigla ou rótulo por causa de endereço; codificação espalhada; adiar o link do Início. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- Q: Quais abas a página do curso tem, qual abre por padrão, e o progresso de cada disciplina na turma selecionada entra nesta fatia? (Q-02, Q-03) → A: **Opção A — duas abas, "Grade" (padrão) e "Sobre o Curso"**; a aba padrão traz o seletor de turma, os indicadores de progresso da turma, as disciplinas dela com CH prevista e executada, e a lista de turmas do curso com o botão de nova turma; **o progresso por disciplina entra nesta fatia** (`RF-CURSO-03`). **Recusadas:** **D** tornaria `?aba=` decorativo, contra o estado de navegação na URL; **B** separaria "Turmas" de "Grade" quando as duas são consultadas juntas — escolhe-se a turma para ver a grade dela —, acrescentando clique sem ganho; **C** deixaria o progresso por disciplina sem dono — a fatia (b) edita período por turma, não exibe progresso —, e o dado já existe em `vw_disciplinas_execucao` (209 linhas, 28 turmas). **Precisões:** **(1)** o **quadro de avisos do curso fica ACIMA das abas**, visível em qualquer aba — *"aviso que só aparece numa aba é aviso que se perde"* —, nascendo recolhido com as contagens à vista; **(2)** `?aba=` e `?turma=` **moram ambos na URL** e reproduzem exatamente a mesma vista para quem cola o endereço; a pré-seleção segue o `FR-006.1`, e o parâmetro de turma usa a função única do `FR-031.2`; **(3)** **curso sem turma não vira beco**: a aba padrão distingue os estados vazios da spec e o botão de nova turma continua alcançável; **(4)** **linha de corte registrada desde já**: se o plano dimensionar esta fatia como **maior que a fatia (c)**, a **primeira e única** coisa cortada é o progresso por disciplina — recai-se na opção C, e só nela. **Nota ao ponto "turma não encontrada" × "sem permissão":** juntar os dois casos **pode ser a resposta correta, não um remendo** — num endereço direto, dizer que a turma existe a quem não pode vê-la confirma a existência de um registro a quem não tem direito a ela; em listas, distinguir os três estados continua válido. **Não fazer:** terceira aba; página única com âncoras; adiar o progresso por disciplina; quadro de avisos do curso dentro de uma aba; aba ou turma selecionada fora da URL. *(decisão de Bernardo Villas Boas, 16/09/2026)*

### Session 2026-09-17

*Respostas ao lote único do `/speckit-plan`. As perguntas B-1 a B-22 estão no [plan.md](./plan.md) — o Lote B em
tabela, a B-22 por extenso; o Lote A está lá em tabela **reconstruída a partir deste registro**, porque a versão por
extenso se perdeu numa reescrita não commitada (achado 1 do analyze, 17/09/2026). Aqui fica a resposta e onde ela mora.*

- Q: A fatia é entregue em um PR ou em dois? (A-1) → A: **Opção A — dois: banco e varredura primeiro,
  telas depois**, com **três critérios obrigatórios**: cada PR mescla **verde com a suíte completa**;
  cada PR deixa o sistema **utilizável, sem nada meio construído**; o PR de banco vai **ao remoto antes
  do merge**, como a fatia (c) fez. A quantidade de tarefas e de arquivos de cada PR é informada antes
  do `/speckit-tasks` (`FR-046.1`). *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Q: Quais recomendações do lote são aceitas sem alteração? → A: **B-1** (sete migrations), **B-3**,
  **B-4**, **B-7**, **B-8**, **B-10**, **B-11** (Q-21.2), **B-13** (Q-08.1), **B-14** (Q-09), **B-17**
  (Q-22.2), **B-18** (Q-25), **B-20**, **A-2**, **A-5** (Q-06.2), **A-7** (Q-16), **A-8** (Q-17), **A-10**
  (Q-21.1), **A-11** (Q-22.3), **A-12** (Q-23.2), **A-13** (Q-26), **A-14** (Q-27) e **A-15** (Q-29).
  **Motivo registrado em três:** **B-8** conserta a restrição para o que ela sempre significou —
  *retirá-la removeria proteção real, e proibir manter a data imporia contorno ao usuário por defeito
  da restrição*; **B-18** mantém previsto e realizado separados — *sincronizar destruiria a única forma
  de enxergar divergência entre o PROENS e o que a turma de fato fez*; **B-20** mantém **uma lista só**
  para ETL e migration — *aceitar grafia antiga criaria segunda representação, que a Q-24.1 acabou de
  eliminar*. *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Q: Como a sala guarda "física ou virtual"? (B-2) → A: **Opção A — `metadados jsonb` com `CHECK`**, com
  a condição: o `CHECK` MUST exigir a chave **presente e válida em toda linha de sala**; **ausência da
  chave é rejeitada, nunca interpretada como "física"** — *"sem isso, a opção A recria pela porta dos
  fundos o padrão silencioso que o `FR-029.6` proibiu"* (`FR-029.7`). *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Q: O `MAX+1` dos geradores da fatia (c) é corrigido aqui? (B-6) → A: **Opção B — PR próprio, depois do
  PR de banco desta fatia**, com a condição: registrar como **pendência nomeada, com número e dono**,
  junto das pendências da fatia (c) — *"pendência sem nome é esquecimento agendado"*. Registrada como
  **T132** em `specs/006-cadastro-de-instrutores/tasks.md`. *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Q: O código da vigência usa sequência no formato real, com o prefixo `REG-` que `registros_aula` também
  usa? (B-9) → A: **Opção A — sequência `REG-NNNNNN`**, com a condição de verificar se os dois usos
  aparecem juntos em lista, tela ou relatório; **se aparecerem, a exibição MUST desambiguar; se não, a
  divergência anotada basta**. **Verificado em 17/09/2026: não aparecem juntos** (D-20) (`FR-019.3`).
  *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Q: A sigla do curso é digitada e editável? (B-12, Q-19) → A: **Opção A — digitada e editável**, com
  duas condições: a edição da sigla MUST exigir **confirmação que nomeia a consequência** (*"links antigos
  deixam de funcionar"*) e MUST ficar **registrada em auditoria** — *"a sigla é vocabulário institucional;
  alterá-la é ato deliberado, não edição corriqueira de campo"* (`FR-014.1`). ⚠️ **O mecanismo da
  auditoria abriu pergunta nova (B-21)**: o quarteto `editado_por`/`editado_em` não guarda o valor
  anterior. *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Q: O que esta fatia faz com os pares autorizados pelo currículo e com o 9º TA? (B-16, Q-10) → A:
  **Opção A — nenhum dado novo.** O **`FR-023` fica adiado por dado ausente, com o motivo registrado como
  tal — não cortado por tamanho**; *"a distinção importa no registro"*. O número de "frequência incomum"
  fica para Bernardo levantar (`FR-022`, `FR-023`). *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Q: O padrão de `cursos.prioridade_alocacao` fica? (B-19) → A: **Opção A — mantém**, com a condição de
  registrar por que ele **não** cai na regra do padrão silencioso — que é valor de negócio legítimo e não
  substituto de "ninguém informou"; *se não houver justificativa, a resposta passa a ser B*. **Justificado
  em 17/09/2026** (`FR-015.2`). *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Q: Onde se cria e se edita curso? (A-3) → A: **Opção A — `/cursos/novo` e `/cursos/[curso]/editar`**, e
  Bernardo **retira a ressalva** que havia levantado: *"a página do curso tem abas e não comporta edição no
  lugar, ao contrário da ficha da turma"*. Condição: registrar a justificativa, **para que a diferença de
  gramática entre curso e turma seja deliberada e não pareça descuido** (`FR-013.1`). *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Q: Quais indicadores e gráficos o catálogo tem? (A-6, Q-15) → A: **Opção A — os três do `RF-CURSOS-02`
  mais barras por classificação**, com a condição: **paridade de catálogo com a v2.0 a recuperar vira
  pedido separado, registrado para fatia posterior** — *"não entra aqui, que já está 45% acima da (c)"*
  (`FR-002`; pendência `PEND-5a-2`). *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Q: Encurtar a janela de uma turma que tem atividade global dentro — o que acontece? (B-5) → A: **Opção
  C — aviso, não A nem B.** *"Encurtar a janela não pode soltar a trava em silêncio: seria recriar pela
  porta dos fundos a falsa garantia que a Q-06.3 mandou eliminar. Mas recusar a edição impediria corrigir
  data errada de turma por causa de uma atividade global, o que é rígido demais. O aviso é o meio certo,
  e segue o critério já adotado na fatia — avisa quando a consequência não é óbvia, recusa quando o dado
  ficaria ambíguo."* Condição: o aviso MUST **nomear quais vigências deixam de ficar protegidas**
  (`FR-021.8`). *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Q: O curso nasce com regime? (B-15, Q-05) → A: **Opção C — nasce com regime no mesmo passo, por função no
  banco, e o banco recusa curso sem regime.** *"Mesmo raciocínio já aplicado ao gatilho de
  `turma_disciplina`: se é consequência estrutural, o banco garante, não apenas executa. O custo é uma
  restrição; o ganho é que nenhum caminho futuro cria curso sem regime."* (`FR-019.5`). *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Q: Quais gravações confirmam antes de salvar? (A-9, Q-18) → A: **Opção B — só o que é difícil de
  desfazer.** *"Confirmação em toda gravação treina a pessoa a clicar sem ler, e a confirmação falha
  exatamente quando importa."* Proporcionalidade — o mesmo critério dos avisos e das recusas (`FR-018.1`).
  *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Q: Avaliações e Relatório aparecem na página do curso antes dos Épicos 8 e 10? (A-4, Q-04) → A: **Opção B
  — não aparecem.** *"A tela não anuncia o que não entrega. Roteiro de versões é documento, não interface;
  'em breve' envelhece mal e vira promessa sem dono."* (`FR-008`). *(decisão de Bernardo Villas Boas, 17/09/2026)*

*Segunda rodada, 17/09/2026:*

- Q: Com que mecanismo a troca de sigla fica registrada em auditoria? (B-21) → A: **Opção A — tabela
  `curso_sigla_historico`** (sigla anterior, sigla nova, autor e momento), **escrita só por gatilho**, **sem
  permitir alteração nem exclusão**, legível por quem tem permissão. Emenda o `FR-046`, *"que já foi
  emendado nesta fatia pela decisão das sete migrations"*. **Recusadas:** **B** perderia a sigla anterior,
  *"que é justamente o dado que a auditoria existe para responder — auditoria sem auditoria"*; **C**
  colocaria o rastro dentro da própria linha que ele fiscaliza, *"destrutível pela mesma operação que
  deveria registrar"*, e exigiria outro gatilho para se proteger (`FR-014.1`). *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Decisão de Bernardo, sem pergunta formal, **fechando o buraco da sigla dentro do código da turma**:
  **trocar a sigla NÃO altera os códigos de turma já existentes; turmas criadas depois usam a sigla
  nova.** *"O código da turma é carimbado na criação e sai impresso no DSA; reescrevê-lo retroativamente é
  a mesma reescrita silenciosa de documento já emitido que a regra da vigência impede. Turma antiga
  carregando a sigla antiga é história correta, não inconsistência."* A confirmação da troca de sigla MUST
  dizer isso **com todas as letras** — requisito próprio (`FR-014.2`). *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Q: Qual é o número de "frequência incomum" do 9º TA? (B-16) → A: **2.** *"Até dois dias por semana com
  uso do 9º tempo não geram aviso; a partir do terceiro, avisa."* **Valor gravado em `config_parametros` e
  ajustável sem código** (`FR-023`). *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Condição adicional, vinda da B-15: **o PR 1 ganha uma verificação prévia**, que roda **antes** da carga do
  ETL, **lista os cursos sem regime** e **falha cedo, com mensagem clara**, em vez de a carga abortar no
  meio (`FR-019.6`). *(decisão de Bernardo Villas Boas, 17/09/2026)*

*Terceira rodada, 17/09/2026:*

- Q: A sigla que um curso deixou pode passar a outro curso? (B-22) → A: **Opção A, como recusa — não como
  aviso.** O sistema recusa que um curso adote sigla que já pertenceu a outro curso, e a mensagem MUST nomear
  **qual curso** a usou e **até quando**. *"Reusar sigla de outro curso torna a identidade genuinamente
  ambígua — dois cursos emitindo documento com a mesma sigla, e códigos de turma colidindo. Isso atende ao
  critério já adotado na fatia: avisa quando o dado está incompleto, recusa quando ficaria ambíguo."*
  **Recusadas B e C:** *"deslocam a falha para longe da causa — ela aparece na criação de uma turma do curso
  B, para uma pessoa que não tem alcance para ver a turma antiga do curso A que provocou a colisão, e portanto
  não tem como entender nem resolver."* **Exceção explícita, no texto do requisito:** um curso **pode** voltar
  a uma sigla que foi **dele mesmo** — é seguro, porque a unicidade de rótulo por curso e ano já impede código
  repetido dentro do mesmo curso (`FR-014.3`). *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Decisão de Bernardo sobre o achado do `migracao_log`: além de registrar a pendência (`PEND-5a-3`), **anotar
  a regra 5 do `CLAUDE.md` com a lacuna conhecida, datada e com o número da pendência** — o gatilho recusa
  alteração e exclusão, mas a `service_role` pode truncar a tabela, e a imutabilidade prometida ainda não é
  integral. **Sem alterar a regra nem o comportamento**: *"documento que promete garantia inexistente é pior
  que a lacuna, porque decisões são tomadas em cima dele."* **Não** se corrige o `migracao_log` nesta fatia
  (D-21). *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Decisão de Bernardo: **a verificação prévia do ETL cobre todos os modos de aborto que esta fatia cria**,
  inclusive os que hoje dão zero — *"uma verificação prévia que cobre só um dos modos de aborto é meia
  verificação. Retornar zero hoje é justamente o argumento para incluí-las: custam quase nada e servem no dia
  em que deixarem de retornar zero"* (`FR-019.6`). *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Confirmação de Bernardo das três escolhas feitas ao registrar a segunda rodada: o parâmetro do 9º TA é
  **operacional**; "uso do 9º tempo" lê a **marca `excepcional`** da configuração de horário, e não o número
  9 literal; e o **aviso do 9º TA continua adiado** até o Épico 6 preencher `ta_inicial` e `ta_final` —
  **não é construído nesta fatia** (`FR-023`). *(decisão de Bernardo Villas Boas, 17/09/2026)*

*Quarta rodada, 17/09/2026 — as decisões da rodada do `/speckit-tasks`, registradas aqui porque esta sessão é o
registro único e datado (P-1):*

- **Regra dos valores esperados.** Toda tarefa que ajusta amostra ou teste cujo número esperado muda por causa do
  gatilho de `turma_disciplina` — ou de qualquer mudança desta fatia — MUST declarar, no texto da tarefa, **(a)** o
  número novo é o correto e o esperado passa a ser ele, com o porquê, ou **(b)** o número correto é o antigo e a
  amostra é ajustada para preservá-lo. **É proibido atualizar valor esperado apenas para igualar o que saiu** —
  *"teste cujo esperado é atualizado para bater com a saída deixa de testar e fica verde para sempre."*
  *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Q: O `.docx` gêmeo do documento 01 recebe a emenda do `FR-028.3`? → A: **Opção C, com a nota da A** — emenda **só**
  no `.md`, que registra que o `.docx` não a recebeu; e o `CLAUDE.md` ganha a regra geral: **nos documentos em `.md`
  e `.docx`, o `.md` prevalece; o `.docx` é o original entregue, preservado e nunca emendado**. *"O repositório é a
  única fonte da verdade (P-1), e duas cópias do mesmo documento normativo sem regra de precedência é lacuna de
  governança. A opção B depende de reflexão manual em toda emenda futura e falha por desgaste."* Medido ao registrar:
  **11** documentos já divergiam assim. *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Q: As provas do ETL rodam no CI ou à mão? → A: **Opção C** — à mão nesta fatia, no padrão do Épico 2, com a saída
  registrada no PR 1, e a pendência nomeada **`PEND-5a-4`** para levá-las ao CI em PR próprio. **Recusada a A pura:**
  *"prova fora do CI envelhece sem ninguém perceber; pendência nomeada custa zero."* **Recusada a B:** *"exigiria
  carregar dados reais da v2.0 no bloco de banco, e o repositório é público."* *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Q: De onde sai o ramo do PR 2? → A: **Opção A** — da `main`, **depois** do merge do PR 1, nunca empilhado. *"O
  paralelismo que a B compra não tem quem o use — o trabalho é sequencial e de um só desenvolvedor; em troca, a B
  aceitaria refazer 101 tarefas caso o PR 1 mude na revisão, e o PR 1 toca 46 policies."*
  *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Q: O BRIEF §2.1 recebe a 28ª tabela? → A: **Opção A, com um acréscimo** — emenda **por acréscimo datado**, sem
  reescrever o original, só no `.md`, registrando que **a lista é normativa e a contagem é descritiva, derivada
  dela**; e o `010_estrutura.sql` passa a afirmar o **conjunto de nomes**, não a contagem — *"contagem é fato com
  prazo de validade e quebra de novo na 29ª tabela"*. **Recusadas:** **B** deixaria o BRIEF afirmando número
  sabidamente falso; **C** poria o inventário em dois lugares, um deles dentro de um teste.
  *(decisão de Bernardo Villas Boas, 17/09/2026)*
- Decisões sobre os 11 achados do `/speckit-analyze`: aplicados todos em 17/09/2026 — Lote A reconstruído no plano;
  citação de requisito de outra spec MUST carregar o número da spec; adendos de medição; guardas de ausência para
  `FR-025.3`, `FR-028.2` e `FR-031.7` (T031.1, T031.2, T182.1) e `FR-015.2` citado na T024; `CLAUDE.md` corrigido
  antes do implement; Princípio VI **mantido**, com nota datada nos dois endereços da constituição.
  *(decisão de Bernardo Villas Boas, 17/09/2026)*

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o catálogo de cursos por classificação (Priority: P1)

Quem usa o sistema abre **Cursos** no menu e vê os 24 cursos como **cartões agrupados por
classificação**, só com informação descritiva — sem dado de acompanhamento —, mais os indicadores
agregados que o `RF-CURSOS-02` nomeia. Clicar num cartão leva à página daquele curso.

**Why this priority**: é o ponto de entrada do módulo e o que a v1.0 e a v2.0 sempre mostraram.
Sem ele, "Cursos" continua *"em breve"* no menu.

**Independent Test**: abrir `/cursos` com sessão de qualquer perfil que lê cursos; contar cinco
grupos, 24 cartões, os indicadores; clicar num cartão e chegar a `/cursos/<sigla>`.

**Acceptance Scenarios**:

1. **Given** os 24 cursos da base, **When** `/cursos` abre, **Then** aparecem **cinco** grupos, na
   ordem **Regular (5) · Expedito (5) · Especial (3) · Aperfeiçoamento Avançado (4) · Estágio de
   Qualificação (7)** (`FR-003`).
2. **Given** um cartão, **When** exibido, **Then** traz sigla, nome, classificação, modalidade,
   duração e propósito quando houver — e **nenhum** progresso, status de turma ou carga
   (`RF-CURSOS-02`: *"apenas informações descritivas"*).
3. **Given** um perfil de **Encarregado de Curso** vinculado a um só curso, **When** `/cursos` abre,
   **Then** só aquele curso aparece — negado **pelo banco**, ainda que a URL seja a mesma.
4. **Given** a base remota vazia, **When** `/cursos` abre, **Then** a tela distingue *"ainda não há
   curso cadastrado"* de *"você não vê"* (gotcha nº 4; `FR-033` da spec 008).
5. **Given** o `C-Exp-BATI` desativado (só tem turma `concluida`), **When** `/cursos` abre, **Then**
   ele não aparece; **When** a pessoa escolhe a situação *inativo*, **Then** ele aparece, e a página
   dele mostra a turma concluída — **sem** permitir abrir turma nova nem lançar nada (`FR-017.1` a
   `FR-017.5`); o botão de reativar aparece para o Encarregado da Divisão e **não** aparece para o
   Operador.
6. **Given** o `C-Exp-BATI` inativo, **When** o Ajudante da Divisão o reativa, **Then** a situação
   volta a `ativo` sem pedir motivo, a auditoria registra quem e quando, e o curso volta à listagem
   padrão; **When** alguém tenta, no mesmo curso ainda inativo, mudar a situação **e** o propósito na
   mesma gravação, **Then** o banco recusa (`FR-017.7`).
7. **Given** o `CAHO`, com turma `ativa`, **When** alguém tenta desativá-lo, **Then** o banco recusa
   e a mensagem nomeia `CAHO 2026` e o caminho: concluir ou cancelar a turma primeiro (`FR-017.4`).

---

### User Story 2 - Abrir a página de um curso com a turma na URL e a aba "Sobre o Curso" (Priority: P1)

Quem chega a `/cursos/<sigla>` — pelo cartão, pelo Início (`?turma=` já vem preenchido) ou por um
link colado — vê o cabeçalho do curso, o **seletor de turma** quando há mais de uma, e as abas, entre
elas **"Sobre o Curso"**. Trocar de turma ou de aba muda a URL; recarregar mantém tudo.

**Why this priority**: é a única tela que o `RF-CURSO-01` a `06` descrevem, e é o destino de todo
link do Início. O `?turma=` que o Início já escreve hoje aponta para uma rota que **não existe**.

**Independent Test**: colar `/cursos/C-ApA-PCN-PR-EAD?turma=<T2>&aba=sobre` numa aba nova e ver
exatamente a turma T2 e a aba "Sobre"; `F5` reproduz; "voltar" desfaz um passo por vez.

**Acceptance Scenarios**:

1. **Given** `C-ApA-PCN-PR-EAD`, com a `T1` `concluida` (16/03–19/06) e a `T2` `planejada`
   (03/08–04/11), e `?turma=` ausente, **When** a página abre em 16/09/2026, **Then** vem
   pré-selecionada a **`T2`** — a janela contém hoje, ainda que o status diga `planejada` — e a URL
   **não** é reescrita (`FR-006.1`).
2. **Given** `?turma=` **explícito**, **When** a página abre, **Then** ele **nunca** é sobrescrito
   pela pré-seleção (`RF-CURSO-01`, condição verificável).
3. **Given** um curso com **uma** turma, **When** a página abre, **Then** o seletor não aparece e
   a página abre **nessa** turma, qualquer que seja o status ou a janela dela.
4. **Given** `C-ApA-OcOp-PR-SP`, com as duas turmas `cancelada`, **When** a página abre sem
   `?turma=`, **Then** **nenhuma** turma vem selecionada e o seletor pede a escolha — a tela
   funciona e diz isso (`FR-006.1`).
5. **Given** `/cursos/CAHO?aba=sobre`, **When** a página abre, **Then** a aba "Sobre o Curso" está
   ativa com o catálogo do CAHO, a grade de **22** disciplinas somando **1.668** TA e as avaliações
   previstas do curso — entre elas o `Levantamento Hidroceanográfico … (LHFC)` com caráter
   **Eliminatório** exibido como texto; o link compartilhado abre na mesma aba (`RF-CURSO-04`,
   `FR-007`).
6. **Given** um `?turma=` que não pertence ao curso ou não existe, **When** a página abre, **Then**
   degrada para o padrão com a tela funcionando — nunca erro (`FR-006` da spec 008).
7. **Given** `/cursos/C-ApA-PCN-PR-EAD?aba=sobre`, **When** a página abre, **Then** o quadro de
   avisos do curso aparece **acima das abas**, e continua lá ao trocar para "Grade"; **When** a
   pessoa troca para "Grade", **Then** a URL passa a `?aba=grade` e a vista mostra a turma
   pré-selecionada pelo `FR-006.1` com as disciplinas dela e a CH prevista e executada de cada uma
   (`FR-006.2`, `FR-009`, `FR-010.1`). ✂️ *As disciplinas com CH prevista e executada saíram com a linha
   de corte aplicada em 17/09/2026 (`FR-009.1`); a aba "Grade" mostra a turma pré-selecionada, os
   indicadores dela e a lista de turmas.*
8. **Given** `/cursos/C-Exp-BATI`, **When** a página abre, **Then** o quadro de avisos do curso
   aparece **recolhido**, com **"sem duração em semanas: 1"** e **"sem propósito: 1"** à vista; um
   clique mostra a lista; nada impede salvar o curso (`FR-010`).
9. **Given** `/cursos/C-Ap-FR`, que tem duração e propósito, **When** a página abre, **Then** o quadro
   diz que não há aviso — **não** some, e **nenhum** tipo com contagem zero aparece.
10. **Given** uma turma `planejada` sem efetivo, **When** o quadro da turma é exibido, **Then** **não**
   há aviso de efetivo; **When** a mesma turma passa a `ativa` sem efetivo, **Then** o aviso
   aparece (`FR-028.4`).

---

### User Story 3 - Escolher turma pelo mesmo seletor em qualquer tela (Priority: P1)

Toda tela que precise de uma turma usa **o mesmo** seletor, com o mesmo rótulo e a mesma ordem — e a
escolha vai para a URL.

**Why this priority**: a fatia (b) e o Épico 6 dependem dele. Entregá-lo aqui é o que impede que
cada tela invente o seu.

**Independent Test**: um teste conta os construtores de seletor de turma na aplicação e acha **um**;
a página do curso o usa; a lista é a mesma que uma consulta direta ao banco devolve para aquele curso.

**Acceptance Scenarios**:

1. **Given** as 28 turmas, **When** o seletor recebe as de um curso, **Then** exibe **rótulo legível**
   para **todas**, inclusive as 18 sem `T1`/`T2` — nunca um rótulo vazio ou nulo (ver D-3).
2. **Given** a lista vazia, **When** o seletor renderiza, **Then** mostra estado vazio com motivo,
   sem quebrar a tela (`RN-DEG-01`).
3. **Given** o teclado, **When** a pessoa navega, **Then** abre, escolhe e fecha sem ponteiro
   (contrato do Épico 4 (b)).

---

### User Story 4 - Cadastrar e editar um curso (Priority: P2)

Um perfil autorizado cria um curso novo com os campos do `RF-CURSOS-01` e edita um existente. O que
não é permitido é **recusado pelo banco**, não só pela tela. Nada é apagado: curso sai de uso por
`status = 'inativo'`.

**Why this priority**: é o "CRUD" do documento 06 — e é **a primeira tela de escrita de curso que o
sistema terá**, já que nem a v1.0 (formulário genérico só de Admin) nem a v2.0 (sem caminho de
escrita) tinham uma de verdade. Vem depois da leitura porque o dado já está lá.

**Independent Test**: criar um curso com sessão de `ajudante_administracao_academica`, vê-lo no
catálogo; tentar o mesmo com `visualizacao` e receber negativa do banco; inativar e vê-lo sumir das
listas de escolha.

**Acceptance Scenarios**:

1. **Given** um formulário completo, **When** salvar, **Then** o curso aparece no catálogo no grupo
   da sua classificação, com `codigo` igual à sigla informada (Q-19).
2. **Given** uma sigla já existente, **When** salvar, **Then** a recusa vem do banco (`unique`) e a
   mensagem é em português, sem o texto cru da constraint.
3. **Given** um perfil sem `cursos.criar`, **When** tentar por qualquer caminho, **Then** o banco
   nega — testado **negativamente** por perfil.
4. **Given** um curso com turmas e histórico, **When** inativado, **Then** some das listas de nova
   escolha e **permanece** em todo histórico (regra 4 do `CLAUDE.md`; `RN-INST-05` generalizada).
5. **Given** os campos obrigatórios do `FR-015` — sigla, nome, classificação, modalidade e duração em dias —, **When** um deles vier vazio ou só com
   espaços, **Then** a recusa vale pelo esquema **e** pelo banco.

---

### User Story 5 - Cadastrar, editar e mudar o status de uma turma (Priority: P2)

Um perfil autorizado abre uma turma de um curso num ano letivo, com rótulo, janela real, sala,
efetivo e modalidade, e muda seu status **livremente** entre os quatro valores — sem transição
restrita e sem automação —, sendo **avisada, nunca impedida**, quando o status contradiz a janela
(Q-22, 16/09/2026).

**Why this priority**: sem turma não há DSA, cronograma nem relatório. Vem depois do curso porque
depende dele.

**Independent Test**: criar uma turma `T2/2026` num curso que já tem `T1/2026`; tentar uma segunda
`T2/2026` no mesmo curso e receber recusa do banco; levar uma turma de `planejada` direto a
`concluida` e de volta, sem recusa; ver o aviso de incoerência aparecer e sumir com o status.

**Acceptance Scenarios**:

1. **Given** curso `C-Ap-FR`, ano 2027, sem rótulo, e janela, **When** salvar, **Then** a turma
   existe com `codigo` **`C-Ap-FR 2027`**, gerado — nunca digitado —, e aparece no seletor do curso
   (`FR-025.1`).
2. **Given** `C-Ap-FR 2027` já existente, sem rótulo, **When** alguém abre outra turma de
   `C-Ap-FR` em 2027 também sem rótulo, **Then** o código gerado colide e a turma é **recusada**,
   com mensagem pedindo o rótulo; com rótulo `T2`, nasce `C-Ap-FR T2 2027`.
3. **Given** `curso_id + ano_letivo + turma` já existente, **When** salvar, **Then** recusa **pelo
   banco** (`turmas_unica_por_ano`).
4. **Given** `data_termino` anterior a `data_inicio`, **When** salvar, **Then** recusa pelo banco
   (`turmas_periodo_coerente`), com mensagem de negócio.
5. **Given** um curso cujo nome sugere EAD mas a turma é `presencial`, **When** qualquer cálculo de
   capacidade acontecer, **Then** vale a **modalidade da turma** (`RN-MAT-04`) — o nome nunca decide.
6. **Given** o `CAHO`, com limite 1 e `CAHO 2026` `ativa`, **When** alguém abre outra turma de
   2026, **Then** o diálogo de confirmação diz que o curso **já tem 1 turma em 2026, que é o
   limite**, e pergunta se confirma; **When** confirma, **Then** a turma é gravada e o quadro do
   curso passa a mostrar o aviso com o ano e a contagem; **When** abre uma turma de **2027**, **Then**
   não há aviso (`FR-030`).
7. **Given** o `C-ApA-OcOp-PR-SP`, com limite 2 e as duas turmas de 2026 `cancelada`, **When** alguém
   abre turma de 2026, **Then** **nenhum** aviso aparece — cancelada não ocupa vaga; **When** alguém
   volta uma das canceladas para `planejada` e isso deixa a contagem acima do limite, **Then** o
   aviso aparece nessa gravação.
8. **Given** uma turma em qualquer status, **When** um perfil que pode editar turma escolhe
   qualquer um dos outros três — inclusive voltar de `cancelada` ou de `concluida` —, **Then** a
   mudança é gravada; nenhuma transição é recusada e nenhuma acontece sozinha pela data.
9. **Given** a `C-Esp-ME 2026`, `ativa` com término em 28/08/2026, **When** a turma é exibida em
   16/09/2026, **Then** aparece o aviso **"ativa com término passado"**, e salvar a turma continua
   permitido sem mudar o status.
10. **Given** a `EST-QF-NAVFLU-EAD 2026`, sem janela, **When** exibida, **Then** nenhum aviso de
   incoerência dispara — sem data não há o que contradizer (`RN-DEG-01`).
11. **Given** um Operador de escopo `expedito`, **When** ele abre uma turma de `C-Exp-BATI` e muda o
   status dela, **Then** as duas escritas são gravadas; **When** tenta o mesmo em `CAHO`, **Then** o
   banco recusa, ainda que a chamada não passe pela tela (`FR-025`, `FR-028`, `FR-044`).
12. **Given** `C-Ap-FR 2027` sem rótulo e `C-Ap-FR T2 2027`, **When** alguém tira o rótulo da `T2`,
   **Then** o banco recusa, e a mensagem diz que `C-Ap-FR 2027` já ocupa o rótulo vazio em
   `C-Ap-FR` 2027 (`FR-026`).
13. **Given** `C-ApA-PCN-PR-EAD T1 2026` e `T2 2026`, **When** alguém troca o rótulo da `T2` para
   `T1`, **Then** o banco recusa — mesmo sendo códigos diferentes, as duas exibiriam `T1`.
14. **Given** `CAHO 2026` sem rótulo e uma `CAHO 2027` sem rótulo, **When** alguém muda o ano da de
   2027 para 2026, **Then** o banco recusa; **When** alguém muda o curso de uma turma sem rótulo para
   um curso que já tem turma sem rótulo naquele ano, **Then** também recusa.
15. **Given** a `Sala 04`, usada por 5 turmas, **When** o Encarregado da Divisão a desativa, **Then**
   a tela lista as 5 turmas e deixa prosseguir; **When** alguém edita depois o efetivo de uma delas,
   mantendo a `Sala 04`, **Then** a gravação é aceita; **When** alguém abre turma nova, **Then** a
   `Sala 04` não é oferecida (`FR-029.4`).
16. **Given** a tela de salas, **When** o Encarregado acrescenta `Sala 07` sem escolher física ou
   virtual, **Then** não salva; **When** escolhe física e salva, **Then** a sala passa a ser oferecida
   em turma nova **sem** deploy nem migration (`FR-029.2`, `FR-029.6`).
17. **Given** a página do `C-ApA-PCN-PR-EAD`, **When** a pessoa cria a `T3` de 2027 em
   `/cursos/C-ApA-PCN-PR-EAD/turmas/nova`, **Then** ao salvar é levada a
   `/turmas/C-ApA-PCN-PR-EAD%20T3%202027`, que mostra o curso com caminho de volta (`FR-031`,
   `FR-031.5`, `FR-031.6`).
18. **Given** um link colado para `/turmas/C-Ap-FR%202030`, que não existe, **When** abre, **Then**
   aparece o estado vazio sem nenhum dado; **Given** um Operador de escopo `expedito`, **When** abre
   `/turmas/CAHO%202026`, **Then** não vê dado nenhum da turma — se a mensagem distingue "não existe"
   de "você não vê", ou junta os dois, é o ponto do `FR-031.4` que o plano resolve.

---

### User Story 6 - Registrar um regime de horário com data de vigência, sem reinterpretar o passado (Priority: P2)

Um perfil autorizado registra, para um curso, um regime novo **a partir de uma data** — e o que já
foi lançado antes dessa data continua lido com o regime de então.

**Why this priority**: é a única regra de *Risco: Alto* desta fatia (`RN-2027-09`) e a única que
hoje **não tem caso real no dado** — 29 vigências, nenhuma sucessão. **É desta fatia por decisão de
16/09/2026 (T-1)**: o regime é atributo do curso, e a prova não depende de disciplina.

**Independent Test**: com três vigências sucessivas num curso sintético, um registro de cada
período resolve para a configuração certa; registrar uma sucessora **não muda** os totais
históricos (teste pgTAP nomeado `RN-2027-09`, já exigido pelo documento 04); e "Corrigir esta
vigência" numa vigência futura deixa **uma** cancelada e **uma** ativa, sem nenhum `UPDATE` de
parâmetro.

**Acceptance Scenarios**:

1. **Given** um curso com regime vigente, **When** registrar um regime novo com `vigente_de` futuro,
   **Then** a linha anterior **não é editada**: ganha `vigente_ate = vigente_de − 1` da sucessora e
   a nova entra — histórico por `INSERT`, nunca `UPDATE` do passado (documento 04, `RN-2027-09`).
2. **Given** duas vigências do mesmo tipo sobrepostas, **When** salvar, **Then** o banco recusa
   (`regime_sem_sobreposicao`).
3. **Given** um curso com registros de aula antes da mudança, **When** o regime muda, **Then** a
   capacidade diária desses registros é a do regime **da data deles** (`app.fn_regime_vigente`).
4. **Given** **qualquer** parâmetro de uma vigência existente — TA por dia, duração, horário de
   início, intervalo —, **When** alguém tenta editá-lo por qualquer caminho, **Then** a recusa vem
   do banco, não só de campo desabilitado (`FR-020`).
5. **Given** a vigência `padrao` de `C-Esp-ALH` (início em 07/09/2026, **nenhum** lançamento) e o
   horário da tarde digitado errado, **When**
   alguém usa "Corrigir esta vigência", muda o horário e salva, **Then** a anterior fica
   `cancelado`, a sucessora entra `ativo` com os demais valores iguais, e as duas escritas
   aconteceram juntas; se a segunda falhar, a primeira não fica gravada (`FR-021.1`).
6. **Given** a vigência `padrao` de `CAHO` (553 lançamentos a partir do início), **When** alguém
   procura corrigi-la, **Then** a ação "Corrigir esta vigência" não é oferecida, o banco recusa o
   cancelamento por qualquer caminho, e o que existe é registrar vigência nova a partir de uma data.
7. **Given** uma vigência sem lançamento, **When** entre abrir "Corrigir esta vigência" e salvar
   alguém grava **uma** aula, **ou** uma avaliação, **ou** uma vista de prova, **ou** uma atividade
   de turma do curso com data a partir do início dela, **Then** o salvamento é recusado com a
   mensagem do `FR-021.4` — um caso de teste **por tabela** — e nada é gravado.
7. **Given** um regime de exceção (9º TA), **When** for usado com frequência incomum, **Then** é
   **alerta informativo**, jamais bloqueio (`RF-HOR-03.1`) — o que é "frequência incomum" está em
   aberto (Q-10). ⏸️ *Cenário adiado por dado ausente em 17/09/2026 (`FR-023`).*

---

### User Story 7 - O menu aponta os épicos certos, e "Cursos" deixa de ser "em breve" (Priority: P3)

Quem abre o menu vê "Cursos" disponível ao fim desta fatia, e as entradas ainda futuras anunciam o
épico **correto** — hoje quatro delas anunciam épico errado.

**Why this priority**: custa uma edição, mas hoje o menu **mente** — e o registro datado em
`contracts/casca.md` da spec 008 repete o erro.

**Independent Test**: o teste do shell, que confere os dois sentidos (nenhuma tela existente pode
seguir "em breve"; nenhuma "em breve" pode já existir), passa com "Cursos" ligado e os quatro
rótulos corrigidos.

**Acceptance Scenarios**:

1. **Given** `lib/navegacao/menu.ts`, **When** esta fatia entra, **Then** *Cursos → "Épico 5 (a)"*,
   *Disciplinas → "Épico 5 (b)"*, *Cronograma → "Épico 7"*, *Atividades → "Épico 9"* — conforme os
   títulos dos épicos no documento 06 §3.
2. **Given** a rota `/cursos` existindo, **When** o shell renderiza, **Then** "Cursos" está
   `disponivel: true`, e o teste do shell é quem obriga a virada no mesmo passo.
3. **Given** o registro datado da MENU-1 em `specs/008-shell-e-estado-na-url/contracts/casca.md`,
   **When** os rótulos mudam, **Then** o registro recebe emenda datada — **ordem e nomes das
   entradas não mudam** (`RF-NAV-02`), só o épico anunciado.

---

### Edge Cases

- Curso **sem turma nenhuma**: a página abre sem seletor e sem turma, e diz isso — a v1.0 chamava de
  *"Sem turma"*.
- Curso com **duas turmas cujas janelas contêm hoje** (não há na base, mas a spec 009 previa, e
  `limite_turmas_ano = 2` em 19 cursos): vence a de **início mais recente** (`FR-006.1`).
- Turma **cancelada continua ocupando o rótulo** no curso e ano: a unicidade do `FR-026` não olha
  o status, e o código dela também não muda. Abrir outra `T1` no lugar de uma `T1` cancelada é
  recusado — é consequência da regra decidida, não caso especial. Hoje: `C-ApA-OcOp-PR-SP` tem `T1` e
  `T2` de 2026, ambas `cancelada`.
- Turma nova **sem datas**, num curso cuja grade tem previsão: **todas** as linhas nascem
  `nao_informado` — sem janela não se avalia a herança (`FR-032.1`).
- Duas turmas do **mesmo ano** num curso (`T1` e `T2`) e grade com previsão dentro da janela só da
  `T1`: a `T1` herda, a `T2` nasce em branco — é o que o script da v2.0 foi escrito para garantir.
- Curso **sem disciplina ativa**: a turma nasce sem linha nenhuma e aparece no quadro como **turma sem
  disciplina** — nada impede a gravação (`FR-032.3`).
- Sala **"Sala 05"** informada numa turma: recusada pelo banco — não consta do inventário, **por
  decisão**. Se a sala passar a existir, entra pela lista administrável (`FR-029.2`), não por código.
- Duas turmas **EAD** com sala **Moodle** no mesmo tempo de aula: **não** é conflito de sala — Moodle é
  ambiente virtual (`FR-029.1`). O cálculo que detecta conflito é do Épico 6, e lê o atributo da lista.
- Turma **sem datas** num curso com mais de uma turma: não é candidata à pré-seleção, porque não
  tem janela que contenha hoje nem início futuro — continua escolhível no seletor.
- Turma **sem datas** (`EST-QF-NAVFLU-EAD`): não entra em nenhuma regra de "em andamento" e **não
  dispara aviso de incoerência** — sem janela não há o que contradizer; o rótulo e a listagem
  continuam funcionando. Ela aparece no quadro como **turma sem janela** (`FR-028.4`).
- Vigência com **lançamento exatamente no dia do início**: conta — o critério é data **igual ou
  posterior** (`FR-021.2`).
- Atividade **global** no dia **exato** do início ou do término da janela de uma turma: alcança —
  a janela inclui as duas pontas (`FR-021.5`).
- Atividade **global** e curso cuja única turma é a `EST-QF-NAVFLU-EAD 2026`, sem datas: **não** trava
  a vigência — não há horário calculável, logo nada a proteger.
- Vigência **já sucedida** por outra: o critério literal conta também os lançamentos que caem sob a
  sucessora, porque a data deles é posterior ao início da anterior — resultado conservador, que
  recusa mais do que o estritamente necessário e nunca menos.
- Turma com **início ou término exatamente hoje**: **não** conta como "passado" para o aviso de
  incoerência (Q-22.3, decidida em 17/09/2026, `FR-028.1`). Na base de 16/09/2026 **nenhuma** turma cai
  nessa fronteira, e o teste semeia o caso.
- Turma **sem rótulo `T1`/`T2`** (18 de 28): o rótulo lido precisa existir mesmo assim (D-3).
- Curso EAD puro (`regime_tempos = 0`, sem hora): a página não mostra "0 TA de 0 min"; mostra o
  limite diário em horas, como a v1.0 fazia (`EAD Nh/dia`).
- `duracao_semanas` nula em 12 cursos: o indicador de duração média ignora-os e o aviso da v1.0
  (*"N curso(s) sem duração"*) entra no quadro do curso como **curso sem duração em semanas** (`FR-010`).
- `?classificacao=` com valor fora das cinco (`geral`, `ead_semipresencial` ou texto qualquer): o
  parâmetro degrada para "todas" e a tela abre (`FR-006` da spec 008). Nenhum curso pode ter esses
  valores (`FR-003.1`), então filtrar por eles nunca seria mais que vazio.
- Curso **Expedito** cadastrado com limite **1** escolhido pela pessoa: o gatilho **não**
  sobrescreve — o `1` fica (`FR-003.2`). Sem limite informado, o mesmo curso recebe **2**.
- Turma nova do `C-ApA-PCN-PR-EAD` (curso `semipresencial`): a modalidade **não** vem pré-escolhida
  do curso como se fosse dela; a pessoa informa, e `ead` é válido (`FR-027`).
- Curso **Regular** com uma turma em 2026 abrindo turma em **2027**: o limite de 1 **não** é
  atingido — a contagem é só das turmas do ano letivo (`FR-003.2`).
- Sigla de curso e código de turma **contêm espaço e hífen** (`C-Ap-FR 2026`): a URL os codifica
  e o link colado MUST abrir — é o formato decidido (`FR-025.1`), não um acidente a contornar.
- Sessão de **Encarregado de Curso** abrindo `/cursos/<sigla>` de curso fora do vínculo: o banco
  devolve vazio; a tela diz "você não vê", não "não existe".

---

## Requirements *(mandatory)*

Onde o comportamento **não está escrito** em documento nem no código real, o requisito **aponta a
pergunta** (`→ Q-nn`) em vez de fixar uma resposta. Isso é deliberado.

### Functional Requirements

#### Catálogo de cursos

- **FR-001**: O sistema MUST apresentar os cursos em **cartões agrupados por classificação**, com
  **apenas informações descritivas** — sigla, nome, classificação, modalidade, duração e propósito —
  e nenhum dado de acompanhamento operacional (`RF-CURSOS-02`; spec 009 `FR-007`).
- **FR-002**: O catálogo MUST exibir os **indicadores agregados** do `RF-CURSOS-02`: número de
  cursos regulares, número de estágios de qualificação, duração média por classificação. O que mais
  entra (a v1.0 mostrava total e contagem por classificação; a v2.0 acrescentava turmas ativas; a
  spec 009 pedia pelo menos um gráfico categórico e um numérico) → ~~Q-15~~.
  **Decidido em 17/09/2026 (A-6), lista fechada:** dois indicadores — **cursos regulares** e **estágios
  de qualificação** — e dois gráficos de barras — **duração média em dias por classificação** (a
  `duracao_dias` não tem nulo; a `duracao_semanas` tem 12) e **cursos por classificação**. **Nada
  mais.** A paridade com o catálogo da v2.0 — **total de cursos** e **turmas ativas**, e os indicadores de
  turma (total, ativas, por status, por ano de início) — **vira pedido separado para fatia posterior**,
  registrado como `PEND-5a-2` no plano. *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-003**: As classificações de curso MUST ser **as cinco do Glossário**, e a ordem dos grupos
  MUST ser **a do Glossário e da v1.0**, fixa e a mesma em todo lugar desta fatia: **Regular ·
  Expedito · Especial · Aperfeiçoamento Avançado · Estágio de Qualificação** (Q-08, 16/09/2026).
  A classificação **agrupa** os cartões, **recorta o escopo do Operador** (por igualdade exata) e
  **determina o limite padrão de turmas por ano** (`FR-003.2`). A ordem da v2.0 diverge e fica
  registrada (D-18). O filtro do Início, entregue pelo Épico 4 (c), oferece a lista do tipo do banco
  inteira — D-19.
- **FR-003.1**: O banco MUST recusar curso com classificação **`ead_semipresencial`**, como já recusa
  `geral` (`cursos_classificacao_nao_geral`) — **não** só o formulário (Q-08, 16/09/2026). Motivo: o
  recorte do Operador é `classificacao = escopo`, e um curso gravado com esse valor ficaria
  **invisível para todos os Operadores**. **Medido em 16/09/2026: nenhum** dos 24 cursos tem esse
  valor, então a restrição entra sem saneamento. Vai na migration do `FR-046`.
- **FR-003.2**: O **limite de turmas por ano** é **regra**: **1 por ano letivo para curso Regular,
  2 por ano letivo para as demais classificações**, e a classificação MUST determinar esse valor ao
  cadastrar o curso (Q-08, 16/09/2026).
  ⚠️ **É POR ANO LETIVO, NUNCA TOTAL.** Um curso regular pode ter uma turma em 2026 e outra em 2027;
  a contagem para efeito do limite considera **apenas as turmas daquele ano letivo**.
  O valor entra como **padrão vindo da classificação** e **permanece editável por curso**, como o
  campo já é. Torná-lo fixo e inegociável é decisão separada → ~~Q-08.1~~ — **decidido em 17/09/2026
  (B-13): continua editável por curso**; o banco não recusa limite diferente do padrão.
  **Mecanismo, decidido em 16/09/2026 (Q-20):** o padrão MUST ser aplicado **pelo banco**, por
  **gatilho `BEFORE INSERT` que lê a classificação** — **não** por `DEFAULT` de coluna, que não
  enxerga outra coluna da linha. O gatilho MUST **preencher apenas quando o limite não vier**; limite
  informado explicitamente é **respeitado**, inclusive um `1` num curso Expedito.
  ⚠️ **O `DEFAULT 1` atual da coluna MUST sair.** Com ele, o gatilho recebe `1` tanto quando a pessoa
  escolheu `1` quanto quando não informou nada, e não tem como distinguir as duas coisas — ou
  sobrescreve a escolha, ou deixa passar o `1` errado num Expedito. Sem o `DEFAULT`, o valor ausente
  chega nulo ao gatilho, que o preenche; o `NOT NULL` continua valendo depois dele. *(decisão de Bernardo Villas Boas, 16/09/2026)* **O que acontece quando o
  limite é atingido — alerta ou bloqueio — é a Q-23, e não é respondido aqui.**
  **Medido em 16/09/2026:** os **24 de 24** cursos já seguem a regra (5 regulares com 1, 19 demais
  com 2), e **nenhum** curso tem, num mesmo ano, mais turmas que o seu limite.
- **FR-004**: O recorte do catálogo (classificação, modalidade, e o que mais for decidido) MUST viver
  na **URL**, no contrato tipado de parâmetros, nunca em estado interno (`RF-NAV-01`; `FR-001` da
  spec 008). O filtro de **situação** está decidido (`FR-017.2`); os demais → ~~Q-16~~ — **decidido em
  17/09/2026 (A-7): classificação, modalidade e situação**, sem busca por nome e sem status derivado das
  turmas. *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-005**: A **rota** `/cursos` MUST existir e MUST ser o destino da entrada "Cursos" do menu; a
  rota `/cursos/[curso]` MUST identificar o curso pelo **`codigo`** (a sigla, `C-Ap-FR`), nunca pelo
  `uuid` — como o Início já faz (`href="/cursos/${cursoCodigo}?turma=…"`).
  ⚠️ O documento 24 §1 exemplifica `/cursos/CUR-000004`; **a base não tem `CUR-`** — `cursos.codigo`
  guarda a sigla. Divergência de exemplo, listada (D-6).

#### Página do curso

- **FR-006**: A página MUST ter cabeçalho identificador, **seletor de turma quando o curso tiver mais
  de uma**, e indicadores agregados de progresso (`RF-CURSO-01`). A turma selecionada MUST viver em
  `?turma=`; a pré-seleção quando ausente MUST ser aplicada no servidor e MUST NOT sobrescrever um
  `?turma=` explícito. A regra de pré-seleção é o `FR-006.1`.
- **FR-006.1**: Quando `?turma=` está ausente, a turma pré-selecionada MUST ser decidida **pela
  janela de datas, não pelo status** (Q-28, 16/09/2026), nesta ordem:
  1. a turma cuja janela **contém hoje** (`data_inicio ≤ hoje ≤ data_termino`);
  2. se nenhuma, a de **início mais próximo no futuro**;
  3. em empate, a de **início mais recente**;
  4. turma `concluida` ou `cancelada` **nunca** é pré-selecionada;
  5. se nenhuma sobrar, a página abre **sem turma selecionada**, e o seletor **pede a escolha**.

  Curso com **uma única** turma abre **nela**, sem seletor — sem seletor não há outra escolha
  (`RF-CURSO-01`).
  ⚠️ **Por que a janela e não o status:** o status é manual e livre (`FR-028`) e pode ficar
  desatualizado por desenho — *"a navegação não pode depender de um campo que a própria decisão
  anterior não garante. A janela é fato."* O status entra **só como veto** (item 4), como manda o
  Tema J do documento 08 (*"nunca uma concluída/cancelada"*).
  **Medido em 16/09/2026**, nos **4** cursos que têm seletor: a regra pré-seleciona a `T2` em curso
  de `C-ApA-AuxNav-PR-SP`, `C-ApA-PCN-PR-EAD` e `C-ApA-PrevMe-PR-EAD` (**3 de 4**), e
  `C-ApA-OcOp-PR-SP`, com as duas turmas canceladas, abre sem seleção. A regra por status da v2.0
  pré-selecionaria **0 de 4**. Divergência com a v2.0 registrada em D-15.
  A regra é **função pura** de `lib/dominio/`, com a data de hoje recebida como argumento — nunca
  lida do relógio dentro dela (`FR-043`).
- **FR-006.2**: A página do curso MUST ter **exatamente duas abas** (Q-02, 16/09/2026):
  - **"Grade"** — a **padrão**, `?aba=grade`: o **seletor de turma**, os **indicadores de progresso**
    da turma selecionada, as **disciplinas** dela com CH prevista e executada (`FR-009`), e a **lista
    de turmas do curso** com o **botão de nova turma** (`FR-031`);
  - **"Sobre o Curso"** — `?aba=sobre` (`FR-007`).

  O **quadro de avisos do curso** fica **acima das abas**, fora de qualquer uma (`FR-010.1`). O
  **regime vigente** fica no cabeçalho (`FR-011`); **onde** se registra e corrige a vigência — decidido
  em 17/09/2026 — é `/cursos/[curso]/editar` (`FR-013.1`).
  `?aba=` e `?turma=` MUST morar **ambos na URL** e reproduzir **exatamente a mesma vista** para quem
  cola o endereço: a aba e a turma selecionada. Sem `?turma=`, vale a pré-seleção do `FR-006.1`; o
  valor de `?turma=` é montado pela **função única** do `FR-031.2`.
  **MUST NOT:** terceira aba; página única com âncoras, que tornaria `?aba=` decorativo.
  **Recusadas:** separar "Turmas" de "Grade" — escolhe-se a turma para ver a grade dela, e a
  separação acrescenta clique sem ganho. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-006.3**: **Curso sem turma não vira beco** (Q-02, 16/09/2026). Quando o curso não tem turma
  alguma, a aba "Grade" MUST distinguir os estados vazios da spec — *"não há"*, *"você não vê"*,
  *"ainda não existe no sistema"* (`FR-047`) — e o **botão de nova turma** MUST continuar alcançável,
  **não** escondido atrás de uma lista vazia. **Medido em 16/09/2026:** **nenhum** dos 24 cursos está
  sem turma hoje. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-007**: A página MUST ter a aba **"Sobre o Curso"**, alcançada por `?aba=sobre`
  (`RF-CURSO-04`), **só para consulta** (doc 08 Tema J), com **três blocos** (Q-01, 16/09/2026):
  1. **Catálogo do curso** — sigla, nome, classificação, modalidade, duração (semanas e dias),
     limite de turmas por ano e propósito;
  2. **Grade curricular** — as disciplinas **ativas** do curso, com código, nome e CH em TA, e o
     **total do curso**;
  3. **Avaliações previstas** — do catálogo oficial (`avaliacoes_planejadas`): disciplina,
     descrição dos instrumentos, **caráter** e **fórmula de média final**, como texto (`FR-007.1`).

  **Nada nesta aba é editável** e **nada é calculado a partir dela** além do total de TA da grade.
  **Medido em 16/09/2026:** 174 disciplinas ativas nos 24 cursos (de 1 em `EST-QF-APOC` a 22 em
  `CAHO`, que soma 1.668 TA); 118 avaliações previstas cobrindo os 24 cursos — caráter preenchido
  nas 118 (113 `Normal`, 5 `Eliminatório`), fórmula em 16, instrumentos nas 118.
  **Fora da aba, com dono:** tetos AEC/TAD/TR e Estudo Individual — acompanhamento, Épico 9; o painel
  de avaliações planejadas × realizadas — Épico 8 (`RF-AVAL-02`).
  **As abas da página** são duas, e esta é a segunda; a padrão é a "Grade" (`FR-006.2`).
  ⚠️ **A leitura das avaliações previstas usa a permissão `avaliacoes.ler`**, não `cursos.ler`
  (policy de `avaliacoes_planejadas`). Os 9 perfis a têm hoje; ainda assim, o bloco MUST distinguir
  *"não há"* de *"você não vê"* (`FR-047`) — é o gotcha nº 4.
- **FR-007.1**: `carater` e `formula_mf` MUST ser **exibidos como texto descritivo, em leitura**, e
  MUST NOT ser **interpretados**: nenhuma média é calculada, nenhuma situação de aprovação é
  derivada, nenhum filtro, ordenação, alerta ou regra lê esses campos (Q-01, 16/09/2026).
  **A leitura da norma que sustenta isso, conferida no texto em 16/09/2026:**
  - `RF-AVAL-02`: *"sem **modelar** fórmula de média final nem caráter eliminatório"*; e *"o sistema
    **não calcula** nota, média final, aprovação ou documento escolar"*.
  - `RNF-NORM-06`: *"O sistema não deve **produzir, calcular ou armazenar** notas, médias finais,
    situação de aprovação ou documentos escolares"*. A fórmula é o **texto do currículo**, não uma
    média; e o campo já está armazenado por decisão (achado (k)).
  - `RN-AVAL-01` (revisada): *"o sistema deixa de **interpretar funcionalmente** `Formula_MF` e
    `Carater` — esses campos tornam-se **informativos apenas**, se mantidos no schema"*.
  - Documento 05, achado (k): *"permanecem no schema como campos **informativos**, sem leitura por
    nenhuma regra ativa"*.

  Isto é: a proibição alcança **modelar, calcular e interpretar**, e os próprios documentos chamam
  os campos de **informativos**. Exibir o que o currículo já diz não produz nota nem aprovação.
- **FR-007.2**: As **Unidades de Ensino**, com a **ementa** de cada disciplina, MUST entrar nesta
  aba **quando o Épico 2 carregar as 572 UEs** — hoje `unidades_ensino` tem **0** linhas (Q-01,
  16/09/2026). A aba MUST ser construída de modo que acrescentá-las **não exija refazer** o que esta
  fatia entrega: a grade é organizada **por disciplina**, e cada disciplina é o lugar onde as suas
  UEs vão aparecer. Enquanto a tabela estiver vazia, **nenhuma UE é exibida nem inventada**; se o
  lugar delas for mostrado antes da carga, é com o vazio *"ainda não existe no sistema"*
  (`FR-047`).
- **FR-008**: A página MUST dar acesso a **Avaliações** e **Relatório** do curso, que **não** têm
  entrada no menu (`RF-CURSO-02`). Enquanto os Épicos 8 e 10 não existem, o acesso MUST aparecer
  como indisponível e anunciado — mesma decisão da MENU-2 — ou não aparecer → ~~Q-04~~.
  **Decidido em 17/09/2026 (A-4): não aparece.** Nenhum link, botão ou marca *"em breve"* para Avaliações
  e Relatório nesta fatia; o acesso nasce com a tela, nos Épicos 8 e 10. *"A tela não anuncia o que não
  entrega. Roteiro de versões é documento, não interface."* A reserva das duas rotas em `FORA_DO_MENU`
  (`lib/navegacao/menu.ts`) **não muda** — ela declara que o menu não as terá, não que a página já as
  mostra. *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-009**: ✂️ **Cortado desta fatia em 17/09/2026 pela linha de corte do `FR-009.1`** — o texto
  abaixo fica como registro do que foi decidido e passa a outra fatia.
  A aba "Grade" MUST listar as **disciplinas da turma selecionada com o progresso de
  cada uma** — **CH prevista e executada** —, **só leitura**, lida de `vw_disciplinas_execucao`
  (`RF-CURSO-03`; Q-03, 16/09/2026). O progresso por disciplina **entra nesta fatia**: a fatia (b)
  trata de **editar** o período por turma, não de **exibir** progresso, e o dado já existe calculado.
  **Medido em 16/09/2026:** a view tem **209** linhas cobrindo as **28** turmas, com CH prevista, TA
  executados, saldo e datas previstas e reais por turma e disciplina. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-009.1**: **Linha de corte, registrada desde já** (Q-03, 16/09/2026). Se o `/speckit-plan`
  dimensionar esta fatia como **maior que a fatia (c)**, a **primeira e única** coisa cortada é o
  **progresso por disciplina** do `FR-009` — recai-se na opção C da Q-02/Q-03, **e só nela**: a aba
  "Grade" fica com seletor, indicadores e lista de turmas, e o `RF-CURSO-03` passa a outra fatia.
  **Nada mais é cortado no lugar dele.** Registrado para que a escolha não seja feita sob pressão no
  meio do implement. Referência para a comparação: o `tasks.md` da spec 006, a fatia (c), tem **132**
  tarefas; o plano fixa a medida que compara. *(decisão de Bernardo Villas Boas, 16/09/2026)*
  ✂️ **APLICADA em 17/09/2026.** O `plan.md` mediu a fatia contra a (c) — **~149** tarefas planejadas
  contra **90**, **~219** projetadas contra **132**, contadas depois das três rodadas de respostas do dia —
  e cortou **o progresso por disciplina, e só ele**. O `FR-009` **não é entregue nesta fatia**; o
  `RF-CURSO-03` passa a outra. A aba "Grade" fica com o seletor, os indicadores da turma, a lista de turmas
  e o botão de nova turma. Depois do corte, **~144** planejadas: **continua maior que a (c)**, e nada mais
  foi cortado — a resposta ao tamanho foi dividir a entrega em dois PRs (`FR-046.1`).
- **FR-010**: A página do curso MUST sinalizar os **alertas daquele curso** (`RF-CURSO-06`) num
  **quadro de avisos no molde da spec 006** (`FR-027` de lá): **recolhível**, com a **contagem de cada
  tipo sempre à vista**, a **lista a um clique**, **nunca bloqueio**; tipo com contagem zero **não
  aparece**; sem aviso nenhum, o quadro continua na tela dizendo isso (`RN-DEG-01`). A lista de tipos
  MUST ser **aberta e extensível** (Q-13 e Q-14, 16/09/2026). Nesta fatia ela **começa** por dois:
  - **curso sem duração em semanas** — `duracao_semanas` vazia; o aviso que a v1.0 já dava;
  - **curso sem propósito** — `proposito` vazio ou só com espaços; sem ele, o bloco de propósito da
    aba "Sobre o Curso" (`FR-007`) abre vazio sem ninguém saber;
  - **curso acima do limite de turmas no ano** — nomeando o ano, a contagem e o limite (`FR-030`,
    Q-23, 16/09/2026).

  **Medido em 16/09/2026:** **12 de 24** cursos sem duração em semanas e **10 de 24** sem propósito
  (o `CAHO` está entre os sem propósito; o `C-Exp-BATI`, nos dois).
  ⚠️ **Os três alertas nomeados pelo `RF-CURSO-06`** — dias restantes insuficientes para a carga
  pendente, disciplina em atraso, vista de prova vencida — **NÃO** ganham região reservada nem espaço
  sempre vazio: entram como **tipos novos desta mesma lista** quando a fatia (b) e o Épico 8
  trouxerem o dado de que dependem. O aviso de *"regime próximo de mudança"* do `RF-INI-04` é do
  painel Início e **não** está nesta lista.
  Cada tipo é **regra pura** de `lib/dominio/` com teste (`FR-043`).
- **FR-010.1**: O quadro de avisos do curso MUST ficar **acima das abas**, **visível em qualquer aba**
  — nunca dentro da "Grade" nem da "Sobre o Curso": *aviso que só aparece numa aba é aviso que se
  perde* (Q-02, 16/09/2026). Mantém o comportamento do quadro de instrutores: **nasce recolhido**, com
  as **contagens sempre visíveis**. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-011**: A página MUST mostrar o **regime vigente hoje** do curso, lido de
  `vw_cursos_regime_vigente` — TA por dia, duração, intervalos, horários, configuração e, para EAD, o
  limite diário em horas — no lugar do *chip* da v1.0. Se mostra também o histórico de vigências
  → ~~Q-06.2~~ — **decidido em 17/09/2026 (A-5):** a página mostra **só o regime vigente**, com caminho
  para o histórico; o **histórico** fica em `/cursos/[curso]/editar` (`FR-013.1`), **por tipo**, com
  vigências **ativas e canceladas** — as canceladas marcadas, com motivo e data —, a mais recente
  primeiro. *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-012**: A página MUST ser **Server Component**; só a troca de turma, de aba e o formulário são
  folhas de cliente. A leitura MUST ser **uma consulta com junção por tela**, ou `Promise.all` de
  independentes — **nunca uma consulta por turma**.

#### Cadastro de curso

- **FR-013**: Um perfil com `cursos.criar` MUST poder criar curso com os campos do `RF-CURSOS-01`:
  nome, classificação, limite de turmas por ano (padrão vindo da classificação, `FR-003.2`),
  duração, modalidade, propósito — com os obrigatórios do `FR-015`. Os **parâmetros de
  regime** que o mesmo `RF` cita **não são colunas de `cursos`** — vivem em `curso_regime_historico`
  (documento 05 §4.1) — e se o cadastro de curso os pede junto ou em passo próprio → ~~Q-05~~ —
  **decidido em 17/09/2026: junto, e o banco o garante** (`FR-019.5`).
- **FR-013.1**: Curso é **criado em `/cursos/novo`** e **editado em `/cursos/[curso]/editar`**, onde
  também se registram, corrigem e consultam as vigências de regime (`FR-019.1`, `FR-011`) (A-3,
  17/09/2026). ⚠️ **A diferença de gramática em relação à turma é deliberada, não descuido.** A turma é
  editada **na própria ficha** (`FR-031.6`), como o instrutor. O curso **não pode** ser: a página dele
  tem **exatamente duas abas** (`FR-006.2`, *MUST NOT terceira aba*) e a "Sobre o Curso" é **só
  consulta** (`FR-007`, *nada nesta aba é editável*) — não há lugar na página que comporte edição no
  lugar, e a rota própria é a consequência. *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-014**: O `codigo` do curso MUST ser a **sigla institucional**, única (`cursos.codigo unique`).
  Se é digitada pela pessoa ou gerada (o documento 06 fala em *"geração automática de
  identificador"* como transversal; o `RN-CRUD-03` fala de prefixo) → ~~Q-19~~ — **decidido em
  17/09/2026: digitada e editável** (`FR-014.1`).
- **FR-014.1**: A sigla é **digitada** e **editável** por quem tem `cursos.editar` (B-12, 17/09/2026). A
  edição da sigla **não é edição corriqueira de campo** — *"a sigla é vocabulário institucional;
  alterá-la é ato deliberado"*:
  1. MUST exigir **confirmação que nomeia a consequência**: *links antigos deixam de funcionar*
     (`/cursos/[sigla]` é o endereço do curso, `FR-005`) e as turmas já criadas **continuam** com a
     sigla antiga no código (`FR-025.1`);
  2. MUST ficar **registrada em auditoria**: qual era a sigla, qual passou a ser, quem mudou e quando.

  **O mecanismo do item 2, decidido em 17/09/2026 (B-21): tabela `curso_sigla_historico`** — sigla
  anterior, sigla nova, autor e momento —, **escrita só por gatilho** quando a sigla muda de valor, **sem
  alteração nem exclusão possíveis** por nenhum caminho, inclusive a `service_role`, e **legível** por
  quem tem `auditoria.ler`. **Nunca** dentro da linha de `cursos`. Motivo: o quarteto de auditoria de
  `app.set_auditoria()` guarda só **quem fez a última edição e quando** — perde a sigla anterior, e a
  edição seguinte apaga o autor; e um rastro guardado na própria linha poderia ser reescrito pela mesma
  operação que troca a sigla. *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-014.2**: **Trocar a sigla de um curso NÃO altera o código de nenhuma turma já existente; turma
  criada depois da troca usa a sigla nova** (17/09/2026). O código da turma é **carimbado na criação**
  (`FR-025.1`) e **sai impresso no DSA**; reescrevê-lo retroativamente seria a mesma reescrita silenciosa
  de documento já emitido que a `RN-2027-09` impede para o regime. **Turma antiga carregando a sigla
  antiga é história correta, não inconsistência** — e nada a "corrige" depois: nem migration, nem ação,
  nem gatilho cascateia a sigla nova para códigos existentes.
  A **confirmação** da troca de sigla (`FR-014.1`, `FR-018.1`) MUST dizer isso **com todas as letras**,
  nomeando a sigla antiga e a nova e **quantas turmas** ficam com a antiga — por exemplo: *"Trocar a sigla
  de C-Ap-FR para {nova}: os links antigos deste curso deixam de funcionar. As turmas já criadas (1)
  continuam com C-Ap-FR no código — como em C-Ap-FR 2026 —, porque o código é carimbado na criação e sai
  impresso no DSA. As turmas criadas daqui em diante usam {nova}. A troca fica registrada na auditoria."*
  **Consequências registradas:** o endereço `/turmas/[turma]` das turmas antigas **continua funcionando**,
  porque o código não mudou — só `/cursos/[sigla antiga]` deixa de existir; e a ficha de uma turma antiga
  mostra o curso pela sigla **nova** ao lado de um código com a **antiga**, que é o registro correto dos
  dois momentos. **O que acontece se outro curso tentar usar a sigla deixada** está decidido no
  `FR-014.3`. *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-014.3**: O banco MUST **recusar** que um curso adote — ao ser criado ou editado — uma sigla que **já
  pertenceu a outro curso**, por qualquer caminho (B-22, 17/09/2026). **É recusa, não aviso**: reusar sigla de
  outro curso torna a identidade ambígua — dois cursos emitindo documento com a mesma sigla, e códigos de
  turma colidindo —, e a fatia **avisa quando o dado está incompleto e recusa quando ficaria ambíguo**.
  - **A mensagem MUST nomear qual curso usou a sigla e até quando** — a sigla atual e o nome do curso, e a
    data em que ele a deixou; se ele a deixou mais de uma vez, a mais recente. Por exemplo: *"A sigla X
    identificou o curso {sigla atual} — {nome} — até {data}, e continua nos códigos das turmas dele. Escolha
    outra sigla."*
  - **Exceção explícita: um curso PODE voltar a uma sigla que foi dele mesmo.** É seguro: a unicidade de
    rótulo por curso e ano (`FR-026`) já impede código de turma repetido **dentro** do mesmo curso, e a
    mensagem dela diz qual turma ocupa o rótulo.
  - **De onde vem "já pertenceu"**: de `curso_sigla_historico` (`FR-014.1`) — a sigla que conste como
    **sigla anterior** de outro curso. Sigla que **pertence hoje** a outro curso continua recusada pela
    unicidade de `cursos.codigo`, com a sua mensagem.
  - **Por que não permitir e deixar a colisão aparecer depois:** a falha iria para **longe da causa** — na
    criação de uma turma do outro curso, para uma pessoa que **não tem alcance** para ver a turma antiga que a
    provocou, e portanto não tem como entender nem resolver.
  *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-015**: Os campos **obrigatórios** MUST ser recusados vazios ou só com espaços, pelo esquema e
  pelo banco (Q-20, 16/09/2026):
  - **curso:** sigla, nome, classificação, **modalidade** — **sem** o padrão silencioso `presencial`,
    que MUST sair da coluna —, limite de turmas por ano (preenchido pela classificação se não vier,
    `FR-003.2`) e **duração em dias**, que passa a `NOT NULL`;
  - **turma:** curso, ano letivo, status e **modalidade**, que passa a `NOT NULL`, **sem** padrão.

  **Continuam opcionais**, porque é para isso que o aviso existe (`FR-010`, `FR-028.4`): duração em
  semanas, propósito, janela, sala, efetivo e rótulo.
  **Medido em 16/09/2026:** `cursos.duracao_dias` e `turmas.modalidade` **não têm nenhum nulo** nas 24
  e 28 linhas — as restrições entram **sem saneamento**. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-015.1**: **Nenhum valor-padrão silencioso** em campo que a pessoa deveria escolher (Q-20,
  16/09/2026). **Por quê:** *valor gravado que ninguém escolheu é indistinguível de escolha real — é
  pior que nulo*. O nulo o quadro de avisos detecta e sinaliza; o padrão silencioso **some para
  sempre**. Um curso EAD que virou `presencial` por padrão **jamais** apareceria num aviso. O limite de
  turmas não é padrão silencioso: ele é **regra declarada** (`FR-003.2`), aplicada à vista e editável.
  *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-015.2**: `cursos.prioridade_alocacao` **mantém** o padrão `carga_restante_por_dia_util` (B-19,
  17/09/2026), e isso **não** é o padrão silencioso do `FR-015.1`, por três razões conferidas:
  1. **O valor é a regra em vigor, não um palpite no lugar de uma resposta.** O `RF-CRONOS-08` descreve a
     priorização como *"hoje fixa por 'carga restante ÷ dias úteis restantes'"* (`RN-2027-05`), e o
     documento 21 (P-2) registra que *"o default reproduz o comportamento fixo da v1.0, então não há
     regressão"*.
  2. **Ninguém escolhe esse valor — nem nunca escolheu.** Na v2.0, `Cad_Cursos.Prioridade_Alocacao`
     tinha **um único valor em uso** (documento 32, P-2); na base, **24 de 24** cursos o têm; e esta fatia
     **não** o põe no cadastro, porque o `RF-CURSOS-01` não o lista (`FR-013`).
  3. **O padrão silencioso é o que ocupa o lugar de um atributo que varia por curso e que alguém
     deveria informar** — a modalidade tem 3 valores em uso, e o `presencial` escondia um curso EAD. Aqui
     não há o que esconder: o valor gravado **é** o comportamento do motor para todo curso.

  ⚠️ **A justificativa vence no dia em que a escolha existir.** Quando o Épico 7 tornar a prioridade
  configurável (`RF-CRONOS-08`), o padrão MUST ser reavaliado pelo `FR-015.1`.
  *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-016**: Editar curso MUST ser possível pelos mesmos perfis de `cursos.editar`. Mudar a
  **classificação** de um curso com histórico muda o escopo de quem o vê (`app.alcanca_curso`) → o
  que isso pode ou não fazer está em ~~Q-09~~ — **decidido em 17/09/2026** (`FR-016.1`).
- **FR-016.1**: Mudar a **classificação** de um curso é **edição comum** (B-14, 17/09/2026): sem vigência,
  sem recusa por turma existente e **sem reaplicar** o limite de turmas — o gatilho do `FR-003.2` só age
  na **criação**. A confirmação (`FR-018.1`) MUST dizer que **o alcance dos Operadores muda**: os do
  escopo antigo deixam de alcançar o curso, e os do novo passam a alcançá-lo.
  *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-017**: Curso MUST sair de uso por **exclusão lógica** (`status = 'inativo'`), **nunca**
  apagado. **Desativam Admin, Encarregado e Ajudante da Divisão de Administração Acadêmica** — a
  matriz do documento 01 já lhes dá `D` —, e o seed MUST ganhar a ação **`desativar`** em `cursos`
  para os três (Q-11, 16/09/2026). ⚠️ A ação precisa ser **distinguível** de `editar` pelo banco: a
  policy de `UPDATE` não enxerga `OLD`/`NEW` (gotcha nº 4), então quem separa "mudar o status para
  `inativo`" de "editar o curso" é gatilho — o mecanismo é do plano.
  **Reativam os mesmos três, pela mesma ação `desativar`** — o seed **não** ganha ação de reativar
  separada —, **sem condição e sem motivo obrigatório** (Q-11.1, 16/09/2026). Permissão assimétrica
  tornaria a desativação irreversível na prática, contra o "arquivar, não apagar" do `FR-017.3`; e
  motivo só na reativação poria o atrito no lado errado — a auditoria já registra autor e momento da
  mudança de situação. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-017.1**: Curso **inativo** MUST continuar **legível e alcançável** por **todo perfil que o
  alcançaria ativo**, com o **escopo preservado** — o Admin incluído, que é quem hoje não consegue
  sequer reativá-lo (Q-11 e decisão antecipada, 16/09/2026). Hoje `app.cursos_do_usuario()` devolve só
  `status = 'ativo'` a **todos** os perfis, e com isso o curso inativo **some com todo o histórico**
  para todo mundo — *"uma porta sem maçaneta por dentro"*. A função MUST deixar de filtrar a
  situação, na migration do `FR-046`, com pgTAP por perfil: dentro do escopo, curso inativo e seu
  histórico são lidos; fora do escopo, continuam negados.
  **Conferido em 16/09/2026 que isto NÃO colide com o recorte de dado pessoal da spec 006:**
  - o acesso a identificação civil e residência de instrutor é decidido **só por perfil**: o
    porteiro de `vw_instrutor_dados_pessoais` (migration `20260908120000`) e o de
    `gravar_dados_pessoais_instrutor` (migration `20260915052719`) exigem `app.pode('instrutores',
    …)` **e** `app.perfil_atual()` entre `admin`, `encarregado_administracao_academica` e
    `ajudante_administracao_academica`; as 12 colunas estão fora do `grant` de tabela;
  - a policy de `instrutores` é `app.pode('instrutores', …)`, **sem** recorte de curso;
  - **nenhuma** migration das fatias 3 e 5c usa `cursos_do_usuario` nem `alcanca_curso`/`alcanca_turma`;
  - o Admin **já** está entre os três perfis do porteiro.

  Logo, ampliar o alcance de **curso** — do Admin ou de qualquer perfil — **não acrescenta acesso
  nenhum** a dado pessoal: o porteiro é o perfil, e ele não mudou. ⚠️ Se uma migration futura passar
  a recortar dado pessoal por alcance de curso, esta conferência precisa ser refeita.
- **FR-017.2**: A listagem `/cursos` MUST ter **filtro de situação na URL**, no **mesmo padrão do
  `?situacao=` dos instrutores**: parâmetro `situacao`, tipo escolha entre `ativo` e `inativo`,
  **padrão `ativo`**, substituindo a entrada do histórico e avisando o servidor (Q-11, 16/09/2026).
  Abre com os ativos; mostra os inativos quando a pessoa escolhe; o link com `?situacao=inativo` é
  compartilhável. As **turmas** de um curso inativo permanecem na base com a **própria situação** e
  continuam **consultáveis** pela página do curso.
- **FR-017.3**: **Desativar arquiva, e "arquivar" é MUDAR DE SITUAÇÃO — nunca mover dado** (Q-11,
  16/09/2026). **Nenhuma** tabela de arquivo, **nenhuma** transferência, **nenhuma** cópia: a linha
  continua onde sempre esteve e **só o `status` muda**. ⚠️ Registrado para que ninguém implemente
  arquivamento físico.
  ⚠️ **Nomes distintos para coisas distintas.** O curso fora de oferta se chama **inativo** — a
  situação de `status_registro` e a ação `desativar` da matriz, os mesmos termos do instrutor. A
  palavra **"Arquivada"** já está reservada pela **TURMA-1** para o **filtro de apresentação de turma
  concluída** (Q-22.2). O curso **não** é exibido como "arquivado", e a Q-22.2 **não** pode chamar de
  "inativa" a turma que ela filtrar.
- **FR-017.4**: O banco MUST **recusar desativar** curso que tenha turma **`planejada` ou `ativa`**,
  por qualquer caminho, com mensagem que **nomeie as turmas pendentes** e diga o caminho — concluir
  ou cancelar cada uma primeiro (Q-11, 16/09/2026). **Medido em 16/09/2026: 6 de 24** cursos são
  desativáveis hoje — `C-ApA-OcOp-PR-SP`, `C-Esp-OpAP`, `C-Exp-Ag-Mag`, `C-Exp-BATI`,
  `C-Exp-Metoc-OF-SP` e `EST-QF-APOC`; os outros 18 têm turma `planejada` ou `ativa`.
- **FR-017.5**: **Legível é leitura.** Curso inativo **não recebe turma nova nem lançamento novo**,
  como o instrutor desativado (Q-11, 16/09/2026). Hoje **nenhuma** escrita alcança curso inativo, por
  efeito colateral de `app.cursos_do_usuario()`; ao a função deixar de filtrar a situação, esse
  efeito some. Por isso esta fatia MUST **manter explícita** a recusa **pelo banco** em **todo**
  caminho de escrita que hoje depende do alcance de curso — as policies de escrita das **16**
  tabelas medidas: `cursos`, `turmas`, `curso_regime_historico`, `responsaveis_curso`,
  `disciplinas`, `unidades_ensino`, `turma_disciplina`, `turma_disciplina_instrutor`,
  `instrutor_disciplina`, `registros_aula`, `avaliacoes`, `avaliacoes_planejadas`,
  `atividades_nao_letivas`, `janelas_curso`, `planejamento_anual` e `reservas_proens`. **Nenhuma
  escrita recusada hoje para curso inativo pode passar a ser aceita.** A única exceção é a própria
  **reativação** do curso, nos termos estritos do `FR-017.7`.
  ⚠️ **Lançamento — sem ambiguidade:** a recusa de aula, avaliação, vista de prova e atividade em
  curso inativo **já é garantida pelo banco a partir desta fatia**. As specs dos Épicos 6, 8 e 9 MUST
  registrá-la e MUST NOT removê-la; as telas deles só a traduzem em mensagem.
- **FR-017.6**: **Varredura de consumidores — requisito, não observação** (Q-11, 16/09/2026). Ao
  `app.cursos_do_usuario()` deixar de filtrar `ativo`, o filtro some para **todos** os consumidores,
  inclusive telas já na `main`. A implementação MUST varrer **cada** consumidor e decidir, um por um,
  se ele precisa de "só ativo" — e, se precisar, filtrar **explicitamente**. **Medido em 16/09/2026**,
  o inventário mínimo:
  - **banco:** as policies de leitura e escrita das 16 tabelas do `FR-017.5`, e as views com
    `security_invoker` que as herdam — **oito** leem `cursos` ou `turmas`: `vw_carga_horaria_turma`,
    `vw_turmas_rotulo`, `vw_cursos_regime_vigente`, `vw_disciplinas_execucao`,
    `vw_avaliacoes_situacao`, `vw_instrutor_disciplina_rotulada`, `vw_instrutores` e
    `vw_instrutor_carga_prevista`;
  - **tela Início** (`app/(app)/inicio/page.tsx`): `cursos`, a contagem de cursos e
    `vw_carga_horaria_turma`;
  - **instrutores** (fatia (c)): o filtro por curso da listagem (`instrutores/page.tsx`) e o painel
    de habilitação do cadastro e da ficha (`instrutores/novo`, `instrutores/[codigo]`), que leem
    `disciplinas` e `cursos` — **uma lista de escolha**: disciplina de curso inativo não pode aparecer
    para nova habilitação;
  - as funções chamadas pela aplicação que leem por alcance (`sincronizar_habilitacoes`, entre
    outras) e **toda tela desta fatia** — catálogo, seletor de turma, formulário de turma.

  MUST existir **teste que reprove se curso inativo — ou turma, ou disciplina dele — vazar para uma
  lista de escolha**, cobrindo cada lista do inventário, e a varredura MUST ser refeita pela ordem de
  busca no repositório, não só por esta lista.
- **FR-017.7**: **A mudança de situação de um curso inativo para ativo MUST ser aceita pelo banco como
  exceção única à recusa de escrita em curso inativo. A exceção MUST alcançar somente a coluna de
  situação da própria linha de cursos; nenhuma outra coluna e nenhuma outra tabela** (Q-11.1,
  16/09/2026).
  ⚠️ **A exceção MUST ser escrita em termos de VALOR ALTERADO, não de coluna enviada.** Um `UPDATE`
  que reenvie colunas **inalteradas** junto com a situação MUST ser aceito — formulários reenviam a
  linha inteira, e é a mesma falha já identificada no gatilho genérico de domínio (`FR-029`). Um
  `UPDATE` que mude a situação **e** qualquer outra coluna, num curso inativo, é recusado. A **ação
  de escrita** da reativação, ainda assim, MUST enviar **somente** a coluna de situação.
  ⚠️ **Nenhuma tabela dependente ganha exceção** — turma, vigência, responsável, disciplina e as
  demais do `FR-017.5` continuam recusando escrita enquanto o curso estiver inativo. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-017.8**: **Os perfis autorizados a reativar MUST alcançar cursos inativos na leitura, por filtro
  ou aba explícita de inativos. Essa abertura de leitura MUST NOT, por si, habilitar escrita em curso
  inativo nas tabelas protegidas pelo `FR-017.5`** (Q-11.1, 16/09/2026). O `FR-017.1` já dá essa
  leitura a todo perfil que alcançaria o curso ativo, e o `FR-017.2` já dá o filtro
  `?situacao=inativo`; este requisito fixa que **ler e reativar não trazem escrita junto**.
  O **botão de reativar** segue o padrão do instrutor: **oculto** para quem não tem a permissão,
  **visível** para quem tem, na tela do curso inativo — e ocultá-lo é cortesia; quem nega é o banco.
  *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-017.9**: `sincronizar_habilitacoes` (fatia c) MUST **ignorar, na inativação, a disciplina de
  curso inativo** — a habilitação histórica fica como está — e MUST **recusar com mensagem** marcar
  disciplina de curso inativo como habilitação nova (B-3, 17/09/2026). Sem isso, instrutor habilitado em
  curso desativado **não salva mais as próprias habilitações**: a função tenta inativar o vínculo que a
  tela não reenviou, a recusa do `FR-017.5` a barra, e a gravação inteira aborta (research R-2).
  *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-017.10**: O **filtro por curso** da listagem de instrutores MUST mostrar **curso inativo**, depois
  dos ativos e **marcado como inativo** (A-2, 17/09/2026): filtrar é consultar histórico, não escolher o
  alvo de uma escrita. As listas de escolha do painel de habilitação continuam **sem** disciplina de
  curso inativo, e o teste do `FR-017.6` as cobre. *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-018**: MUST haver **confirmação antes de salvar** (documento 06, transversal do Épico 5),
  com o `DialogoConfirmacao` da fatia (b) do Épico 4. Em quais operações → ~~Q-18~~ — **decidido em
  17/09/2026** (`FR-018.1`) —, com uma já decidida antes: a gravação de turma que passa do limite do ano
  letivo **sempre** confirma, com a mensagem do `FR-030` (Q-23, 16/09/2026).
- **FR-018.1**: Confirma **só o que é difícil de desfazer** (A-9, 17/09/2026) — *"confirmação em toda
  gravação treina a pessoa a clicar sem ler, e a confirmação falha exatamente quando importa"*. A lista é
  **fechada**:
  1. **desativar** e **reativar** curso;
  2. **registrar** e **corrigir** vigência de regime;
  3. **editar curso** quando muda a **sigla** (`FR-014.1`), muda a **classificação** (`FR-016.1`) ou baixa
     o **limite** abaixo da contagem de algum ano (`FR-030.1`);
  4. **criar ou editar turma** quando passa do **limite** do ano (`FR-030`) ou quando a mudança de janela
     ou de curso **deixa vigência sem proteção** (`FR-021.8`);
  5. **desativar sala em uso** (`FR-029.4`).

  **Nenhuma outra gravação confirma** — criar ou editar curso e turma fora desses casos, acrescentar e
  reativar sala, desativar sala sem turma. Quando uma gravação cai em mais de um caso, é **um** diálogo
  com todas as mensagens. *(decisão de Bernardo Villas Boas, 17/09/2026)*

#### Regime de horário com vigência

- **FR-019**: Registrar mudança de regime MUST ser **inserir vigência nova** com `vigente_de`
  explícito; a linha anterior recebe `vigente_ate` e **nunca** tem seus parâmetros editados
  (`RN-2027-09`; `RF-HOR-05`; `RF-CURSOS-03`). **Vale também para `vigente_de` futuro**, e o
  critério de aceite **7** do documento 06 — *"registrar mudança de regime com data de vigência
  futura preserva o cálculo dos lançamentos anteriores àquela data"* — é provado **nesta fatia**,
  por asserção pgTAP nomeada `RN-2027-09`, sobre `registros_aula` e `app.fn_regime_vigente`, sem
  depender de disciplina (T-1, 16/09/2026).
- **FR-019.1**: O **cadastro de curso** MUST ser o lugar onde o regime é registrado — o regime é
  atributo do curso, e um formulário de curso que não preenche o próprio regime está incompleto
  (T-1, 16/09/2026). **Se** isso acontece no mesmo passo da criação ou em passo próprio da página
  do curso continua em aberto → ~~Q-05~~ — **decidido em 17/09/2026: no mesmo passo** (`FR-019.5`).
- **FR-019.2**: A fatia **(b)** MUST apenas **ler** o regime vigente; nenhuma escrita de
  `curso_regime_historico` nasce fora desta fatia (T-1, 16/09/2026).
- **FR-019.3**: O **código da vigência** MUST ser gerado **pelo banco**, por **sequência**, sem
  `MAX(...)+1`, no formato real `REG-NNNNNN` (B-9, 17/09/2026). Medido: a coluna é obrigatória e **não
  tinha gerador** — registrar vigência pela tela seria impossível. A coincidência do prefixo `REG-` com
  `registros_aula` fica registrada (D-20). **Se** uma lista, tela ou relatório futuro mostrar códigos das
  duas tabelas juntos, a exibição MUST **desambiguar**. *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-019.4**: O banco MUST **recusar vigência nova cujo período contenha lançamento já gravado do
  curso**, nas três tabelas do `FR-021.2` (B-10, 17/09/2026). É a `RN-2027-09` — *"a mudança nunca altera
  a interpretação de registros já lançados sob a configuração anterior"* — imposta **também no registro**,
  e não só na correção: sem isso, uma vigência com data no passado recalcula **em silêncio** o horário de
  DSAs já distribuídos. Mesma trava do `FR-021.3`, mesma mensagem do `FR-021.4`, com o caminho: escolher
  data posterior ao último lançamento. Vigência com data **futura** nunca encontra lançamento.
  *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-019.5**: O curso MUST **nascer com a vigência `padrao` no mesmo passo**, por **função no banco**,
  numa transação — **e o banco MUST recusar curso sem vigência `padrao` ativa, por qualquer caminho** (B-15,
  17/09/2026). A conferência é **no fim da transação**, para que criar o curso e a vigência juntos passe; e
  alcança também o **cancelamento** da única vigência `padrao` sem a sucessora na mesma transação.
  *"Se é consequência estrutural, o banco garante, não apenas executa. O custo é uma restrição; o ganho é
  que nenhum caminho futuro cria curso sem regime."* **Medido em 16/09/2026: os 24 cursos têm** vigência
  `padrao` — a restrição entra sem saneamento. ⚠️ **Consequência registrada:** a carga do ETL é um desses
  caminhos — um curso sem regime na v2.0 no dia do corte faz a carga **abortar**, e a reconciliação MUST
  nomeá-lo. *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-019.6**: A carga do ETL MUST ter uma **verificação prévia**, que roda **antes de qualquer escrita**,
  **lista todos os cursos sem vigência `padrao` ativa** no dado de origem e **falha cedo, com mensagem
  clara** — o código e o nome de cada curso, e o que falta —, **em vez de** a carga abortar no meio, no
  `COMMIT`, com a recusa do gatilho do `FR-019.5` (17/09/2026). A verificação mora na conferência que o ETL
  **já faz** antes de escrever, e é **provada** com um dado de origem que tenha um curso sem regime: a
  carga falha na verificação e **nada** é gravado. *(decisão de Bernardo Villas Boas, 17/09/2026)*
  **Emenda de 17/09/2026, terceira rodada — a verificação cobre todos os modos de aborto que esta fatia
  cria, inclusive os que hoje dão zero.** Cada conferência lista **todas** as linhas que falham, com o que
  identifica a linha e o requisito que ela violaria; a carga só começa com as dez em zero:

  | # | Conferência, sobre o dado de origem | O que abortaria | Medido em 17/09/2026 |
  |---|---|---|---|
  | 1 | curso sem vigência `Padrao` ativa | gatilho adiado do `FR-019.5` | **0** |
  | 2 | curso com classificação que o banco recusa (`geral`, `ead_semipresencial`) | `FR-003.1` | **0** |
  | 3 | curso sem modalidade ou sem duração em dias | `FR-015` | **0** |
  | 4 | turma sem modalidade | `FR-015`, `FR-027` | **0** |
  | 5 | sala sem correspondência na lista **depois** da substituição do `FR-029.8` | gatilho de sala, `FR-029` | **0** |
  | 6 | rótulo fora da forma `T<n>` | `FR-025.2` | **0** |
  | 7 | código de turma diferente de `sigla [rótulo] ano` | gatilho do código, `FR-025.1` | **0** |
  | 8 | duas turmas com o mesmo rótulo — vazio incluído — no mesmo curso e ano | `FR-026` | **0** |
  | 9 | vigência ativa com `vigente_ate` sem sucessora ativa no dia seguinte | gatilho adiado do `FR-020` | **0** |
  | 10 | ordem de carga: `cursos` antes das vigências; `turmas` antes de `disciplinas`; vigências antes de aula, avaliação e atividade | gatilho de nascimento do `FR-032.2` e recusa do `FR-019.4` | **em ordem** |

  A **prova** usa um dado de origem que faz **cada** conferência falhar pelo menos uma vez, e confere que a
  mensagem nomeia a linha e que **nada** foi gravado. *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-020**: **Nenhum parâmetro** de uma vigência existente MUST ser alterado — TA por dia
  (`regime_tempos`), duração do TA (`ta_duracao_min`), horários de início (`hora_inicio_manha`,
  `hora_inicio_tarde`), intervalos (`intervalo_manha_min`, `intervalo_tarde_min`), limite diário EAD,
  configuração de horário, tipo, curso e `vigente_de` —, **imposto pelo banco** na migration desta
  fatia, por qualquer caminho de escrita, não só por campo desabilitado nem só pela Server Action
  (Q-07 e Q-06, 16/09/2026; `RN-2027-09`; Princípio XI). **Qualquer** mudança é **vigência nova**
  (`FR-019`). O banco MUST aceitar, numa vigência existente, **apenas** duas escritas:
  gravar `vigente_ate` quando a sucessora entra, e passar `status` a `cancelado` **nas condições do
  `FR-021.1`**.
  ⚠️ **Por que horário e intervalo também:** `registros_aula` guarda só o **número** do TA
  (`ta_inicial`, `ta_final`), não horário de relógio — o horário do DSA é sempre recalculado do
  regime vigente na data. Editar o horário de uma vigência em uso **reescreveria o horário impresso
  de DSAs passados**. A `RN-2027-09` lista nominalmente *"horário de início dos períodos, duração dos
  intervalos"* entre as mudanças que exigem vigência.
  ⚠️ **Policy não enxerga `OLD`/`NEW`** (gotcha nº 4 do `CLAUDE.md`): a recusa de *mudar* uma
  coluna é **gatilho** ou privilégio de `UPDATE` por coluna, não expressão de policy. O `RF-HOR-02`
  nomeia *"policy de UPDATE e trigger de recusa"*; o mecanismo exato é do plano.
  **Teste:** pgTAP **negativo** — `UPDATE` de **cada** parâmetro numa vigência existente é
  recusado, com sessão autenticada de perfil que **pode** editar curso; e o de `vigente_ate` pela
  entrada da sucessora é aceito.
- **FR-021**: Horário de início dos períodos e duração dos intervalos MUST ser **alteráveis pelo
  Encarregado por vigência nova**, nunca por edição da linha (Q-06, 16/09/2026). É a leitura
  adotada do *"editáveis"* do `RF-HOR-01/02`: o contraste do requisito é com TA e duração, que vêm
  do currículo — não uma autorização para `UPDATE`. Divergência registrada em D-16.
- **FR-021.1**: Vigência **sem lançamento que dependa dela** (`FR-021.2`) MUST poder ser corrigida por **uma única ação,
  "Corrigir esta vigência"**, que abre o formulário **pré-preenchido com os valores atuais** e, ao
  salvar, **cancela a anterior** (`status = 'cancelado'`) **e grava a sucessora numa mesma
  transação** — ou as duas escritas acontecem, ou nenhuma (Q-06, 16/09/2026). Para quem usa, parece
  edição; para o banco, é **append-only**, sem `UPDATE` de parâmetro.
  Vigência **com lançamento que dependa dela** MUST NOT ser editada nem cancelada: mudar o que vale
  dali em diante é registrar **vigência nova a partir de uma data** (`FR-019`).
  ⚠️ **A transação é do banco.** Duas escritas separadas a partir da aplicação não são uma
  transação; a forma (função no banco, na mesma migration do `FR-046`) é do plano.
- **FR-021.2**: "Lançamento que depende da vigência" MUST ser decidido **pelo fato, não pela data**
  (Q-06.1, 16/09/2026): existe lançamento **do curso** com data **igual ou posterior** ao
  `vigente_de` da vigência em ao menos uma destas tabelas, **nominalmente**:
  - `registros_aula` — pela `data`;
  - `avaliacoes` — pela `data_avaliacao` **e** pela `data_vista_prova`;
  - `atividades_nao_letivas` — pela `data`, chegando ao curso pela turma; e, quando a atividade é
    de **escopo global** (sem turma), chegando a **todo curso que tenha turma cuja janela contenha a
    data da atividade**, nos termos do `FR-021.5` (Q-06.3, 16/09/2026).

  O banco MUST impor o critério **por qualquer caminho**: cancelar vigência com lançamento é recusado
  mesmo fora da ação "Corrigir esta vigência".
  ⚠️ **A lista é a garantia, e ela envelhece.** Toda tabela nova que passe a depender do regime
  MUST entrar nesta lista **na mesma migration que a cria** — do contrário o gatilho continua
  aprovando o cancelamento e vira **falsa garantia**, sem erro nenhum. A migration desta fatia MUST
  registrar isso em comentário junto do gatilho, e o teste MUST ter um caso por tabela.
  **Medido em 16/09/2026:** **18 de 29** vigências são corrigíveis; as **11** com lançamento são as
  `padrao` e `excecao` de `CAHO`, `C-Ap-FR`, `C-Ap-HN`, `C-Espc-FR`, `C-Espc-HN` e a `padrao` de
  `C-Esp-ME`, com 286 a 553 lançamentos cada. Pela data, seriam **0 de 29**.
- **FR-021.3**: A verificação do `FR-021.2` e a substituição do `FR-021.1` MUST acontecer **na mesma
  transação**, com a **linha da vigência travada**, para que não haja corrida entre conferir que não
  há lançamento e trocar (Q-06.1, 16/09/2026).
  ⚠️ **Travar a linha da vigência impede duas correções simultâneas, mas não basta sozinho contra
  um lançamento novo:** gravar aula, avaliação ou atividade **não toca** a linha da vigência, e
  pode entrar entre a conferência e a troca. O requisito é o **resultado** — nenhum lançamento
  gravado sob a vigência durante a correção —, e o plano MUST mostrar como o lado do lançamento o
  respeita (a mesma trava do lado de quem lança, ou nível de isolamento que detecte o conflito).
- **FR-021.4**: Havendo lançamento, a recusa MUST chegar como **mensagem compreensível**, que diga
  **qual lançamento impede** — ao menos o tipo (aula, avaliação, vista de prova ou atividade), a
  data e a turma do primeiro encontrado, e quantos são — e **qual é o caminho**: registrar vigência
  nova a partir de uma data. **Nunca** o erro cru do banco (Q-06.1, 16/09/2026; `RN-DEG-01`). Quando
  a trava vem de atividade de escopo global, vale o `FR-021.6`.
- **FR-021.5**: **Alcance da atividade de escopo global** sobre a vigência de regime (Q-06.3,
  16/09/2026). A atividade global alcança o curso que tenha **turma cuja janela de datas contenha a
  data da atividade** — decidido **pela janela, nunca pelo status** da turma, que é mutável e
  destravaria a vigência ao virar `concluida`. Casos fixados **no texto**, não deixados à
  implementação:
  1. **janela completa** (`data_inicio` e `data_termino`): alcança quando `data_inicio ≤ data da
     atividade ≤ data_termino`;
  2. **turma sem datas** (as duas vazias): **não alcança** — sem início e fim não há horário
     calculável, logo nada foi emitido e nada há a proteger;
  3. **janela incompleta** (só uma das pontas): **alcança** quando a data da atividade é compatível
     com a ponta existente — **igual ou posterior** ao início, se só houver início; **igual ou
     anterior** ao término, se só houver término —, e a recusa **exibe o motivo**. Diante de dado
     incompleto, o sistema escolhe **o erro visível**: travar errado é atrito reversível; não travar
     é reescrita silenciosa de horário já distribuído.

  Curso **sem turma** na data **não** é alcançado.
  **Medido em 16/09/2026:** das 28 turmas, **27** têm janela completa, **1** não tem datas
  (`EST-QF-NAVFLU-EAD 2026`) e **0** têm janela incompleta; as **664** atividades não letivas são
  **todas** de escopo de turma — **nenhuma** global.
  ⚠️ **Fronteira com a Q-06.1 — não fundir:** este requisito define **quais cursos** a atividade global
  alcança. **Quando** a checagem roda e a **corrida** entre corrigir a vigência e lançar algo novo
  continuam com o `FR-021.3` e com o plano. ⚠️ Registro para o plano, na mesma fronteira: a **janela
  da turma também é editável**, então encurtá-la depois de lançada uma atividade global muda o
  alcance — o plano decide se isso precisa de cuidado próprio. *(decisão de Bernardo Villas Boas, 16/09/2026)*
  **Decidido em 17/09/2026 (B-5): aviso que nomeia as vigências desprotegidas** (`FR-021.8`).
- **FR-021.6**: A recusa de correção por atividade de escopo global MUST **nomear a atividade e a
  turma** que produziram a trava — e, na janela incompleta, dizer que a trava veio da ponta que
  falta; *"não é possível corrigir"* sem causa é beco sem saída (Q-06.3, 16/09/2026). MUST existir
  **teste automatizado** que cadastre uma atividade de escopo global e prove o resultado nos **três**
  casos do `FR-021.5` — janela contendo a data (trava), turma sem datas (não trava), janela
  incompleta compatível (trava, com motivo). Motivo: a base tem **zero** atividades globais, e nenhum
  teste natural exercita esta regra — ela apodreceria sem ninguém notar. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-021.7**: Gravar **atividade de escopo global** MUST respeitar a trava da correção de vigência
  **pelo lado de quem lança** (B-4, 17/09/2026). Atividade de turma já a respeita pela chave estrangeira
  da turma; a global **não tem turma** e, sem uma trava própria, pode entrar entre a conferência e a troca
  do `FR-021.3`. *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-021.8**: Editar a **janela** de uma turma — ou mudar o **curso** dela — de modo que uma atividade
  de escopo global **deixe de alcançá-la** MUST ser **aceito com aviso**, nunca recusado, e MUST NOT
  soltar a trava **em silêncio** (B-5, 17/09/2026). O aviso, no diálogo de salvar (`FR-018.1`), MUST
  **nomear as vigências que deixam de ficar protegidas** — as que só estavam travadas por atividade global
  que alcançava o curso **por esta turma** —, com a atividade e a data. Vigência que continua travada por
  lançamento próprio ou por outra turma **não** entra no aviso; sem vigência perdendo proteção, não há
  aviso. *"Encurtar a janela não pode soltar a trava em silêncio; recusar impediria corrigir data errada
  de turma. Avisa quando a consequência não é óbvia, recusa quando o dado ficaria ambíguo."* Medido em
  16/09/2026: **zero** atividades globais na base — o teste semeia a própria.
  *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-021.9**: A unicidade de vigência por **curso, tipo e data de início** MUST valer **só entre
  vigências ativas** (B-8, 17/09/2026). Medido: a restrição de hoje conta as canceladas, e a correção do
  `FR-021.1` que **mantém a data** — o caso mais comum — seria recusada na primeira vez. *"Conserta a
  restrição para o que ela sempre significou: retirá-la removeria proteção real, e proibir manter a data
  imporia contorno ao usuário por defeito da restrição."* *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-022**: O regime MUST ser validado contra o que o **currículo do curso** autoriza
  (`RF-HOR-03`) — os pares autorizados por curso são **dado**. Hoje esse dado **não existe** em
  tabela nem em `config_parametros`; só `fundamento_curricular` (texto) nas 9 linhas. O que esta
  fatia faz com isso → ~~Q-10~~ — **decidido em 17/09/2026 (B-16): nenhum dado novo.** O formulário
  exibe o `fundamento_curricular` ao lado dos parâmetros, e a validação é a que o banco já faz (TA de 45
  ou 50 min, de 1 a 12 TA por dia, EAD com limite diário). ⚠️ **O registro dos pares por curso que o
  `RF-HOR-03` pede não acontece nesta fatia** — aguarda o dado, pelo mesmo motivo do `FR-023`.
  *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-023**: O 9º TA MUST ser **alerta informativo** quando usado com frequência incomum, jamais
  bloqueio (`RF-HOR-03.1`, `RN-DEG-02`). **Nunca `CHECK`.**
  ⏸️ **Adiado em 17/09/2026 por dado ausente — não cortado por tamanho** (B-16). Faltam **dois** dados:
  **(1)** o **número** que define "frequência incomum", que nenhum documento traz e Bernardo vai
  levantar; **(2)** **qual TA** cada aula ocupou — `registros_aula.ta_inicial` e `ta_final` estão
  **vazios nos 1.566** lançamentos migrados (medido em 17/09/2026); o Épico 6 é o primeiro a gravá-los.
  O requisito **continua valendo** e volta quando os dois existirem; o número entra como parâmetro
  normativo em `config_parametros` (`RNF-NORM-08`). Registrado como `PEND-5a-1` no plano.
  *(decisão de Bernardo Villas Boas, 17/09/2026)*
  **O número chegou no mesmo dia: 2** (B-16, segunda rodada de 17/09/2026). **Até dois dias por semana
  ISO com uso do 9º tempo não geram aviso; a partir do terceiro, a turma recebe aviso informativo** —
  nunca bloqueio. "Uso do 9º tempo" num dia é **haver lançamento da turma que ocupe um tempo marcado
  `excepcional`** na configuração de horário vigente naquela data (`horarios_tempos_aula.tipo_tempo`, onde
  o documento 31 anota *"`excepcional` = 9º TA"*). O valor é **gravado em `config_parametros` nesta fatia**,
  no PR 1, e **ajustável sem código**:
  - chave `regime.nono_ta_dias_por_semana_sem_aviso`, tipo `inteiro`, unidade `dias/semana`, valor `2`;
  - natureza **`operacional`**, não `normativo` — ⚠️ **corrige o que este requisito dizia acima**: o
    número **não** vem de norma, vem da decisão da Divisão; a regra que ele parametriza, o `RF-HOR-03.1`,
    é que vem do currículo, e fica citada em `fundamento_normativo`.

  ⏸️ **Continua adiado, agora por um dado só:** **qual TA** cada aula ocupou. `ta_inicial` e `ta_final`
  seguem **vazios nos 1.566** lançamentos, e é o **Épico 6** que passa a gravá-los. O aviso entra na fatia
  que os gravar, lendo o parâmetro que esta deixa pronto. *(decisão de Bernardo Villas Boas, 17/09/2026)*
  **Confirmado por Bernardo na terceira rodada de 17/09/2026:** natureza `operacional`; leitura pela marca
  `excepcional`, não pelo número 9; e **o aviso NÃO é construído nesta fatia**.
  *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-024**: Registrar e corrigir vigência de regime MUST ser permitido a **Admin, Encarregado e
  Ajudante da Divisão de Administração Acadêmica e Operador** — o Operador **dentro do seu escopo de
  curso** (`RF-HOR-10`; documento 01 §2.2 e §2.5; Q-12, 16/09/2026). Consequências obrigatórias da
  implementação desta fatia, na migration do `FR-046`:
  1. a matriz `perfil_permissao` ganha o **recurso de regime e horário** — `horarios`, o nome da
     matriz do documento 01 §2.5 —, com as ações que registrar e corrigir vigência exigem, para os
     quatro perfis acima;
  2. as policies de **escrita** de `curso_regime_historico` passam a exigir **essa** permissão, e
     não mais `cursos.editar`; a de **leitura** continua em `cursos.ler`;
  3. o alcance continua pela função de escopo de curso: fora do escopo, o banco recusa.

  ⚠️ Só acrescentar linha na matriz **não basta**: as policies de hoje citam `cursos` pelo nome, e
  trocá-las é DDL. O catálogo de **configurações** de horário (`configuracoes_horario`,
  `horarios_tempos_aula`) continua sob `parametros` — esta decisão não o toca.
  ⚠️ **A matriz é dado, não código** (documento 01 §2.5.2), e esta divisão pode ser revista quando
  outros perfis ganharem permissões.
- **FR-024.1**: A matriz ganha a **linha `horarios` inteira do documento 01 §2.5** (B-7, 17/09/2026):
  `ler` para os **9** perfis; `criar` e `editar` para Admin, Encarregado, Ajudante e Operador; `desativar`
  para Admin, Encarregado e Ajudante. As linhas que **nenhuma policy lê nesta fatia** — `ler`, porque a
  leitura continua em `cursos.ler`, e `desativar` — ficam **declaradas como tal** na migration.
  *(decisão de Bernardo Villas Boas, 17/09/2026)*

#### Cadastro de turma

- **FR-025**: Admin, Encarregado e Ajudante da Divisão **e o Operador, dentro do seu escopo de
  curso** (Q-12, 16/09/2026), MUST poder abrir turma com curso, ano letivo, rótulo
  (`T1`/`T2` ou vazio), janela real (`data_inicio`/`data_termino`), sala alocada, efetivo (`alunos`),
  modalidade e status (documento 06; documento 05 §4.1). O `codigo` segue o `FR-025.1`.
- **FR-025.1**: O `codigo` da turma MUST ser **gerado**, nunca digitado, pela regra que as 28
  turmas migradas já seguem: **sigla do curso**, espaço, **rótulo** quando houver, espaço, **ano
  letivo** — `CAHO 2026`, `C-ApA-PCN-PR-EAD T2 2026` (Q-21, 16/09/2026). **Medido em 16/09/2026:
  28 de 28** seguem exatamente esse formato. O rótulo MUST ser **opcional** — ausência legítima e
  permanente em turma única, como o Épico 2 ratificou em 08/09/2026 —, e **2** das 10 turmas
  rotuladas são turma única no ano (`C-Esp-OpAP T1`, `C-Exp-BATI T1`), o que continua permitido.
  Uma vez gerado, o `codigo` **nunca muda** (C-04): editar sigla, rótulo ou ano **não** o regrava.
  Como `turmas.codigo` é único, duas turmas **sem rótulo** no mesmo curso e ano geram o mesmo
  código e a segunda é **recusada**, com mensagem de negócio pedindo o rótulo.
  A geração MUST morar **no banco**, na migration desta fatia (Q-07, 16/09/2026) — o mesmo
  princípio da fatia (c), em que o código de instrutor e o do vínculo `VIN` nascem no banco.
  ⚠️ **Não é sequência simples, e por isso não é o mesmo mecanismo da (c).** Lá o código é
  `default` de coluna tirado de sequência; aqui ele depende da **sigla do curso**, que mora em outra
  tabela, e do rótulo e do ano da própria linha — e `default` não lê outra coluna. É **gatilho**,
  e o gatilho **lê a sigla do curso** no momento da criação.
  ⚠️ **Para ser garantia do motor, o gatilho MUST impor o formato**, e não só preencher quando o
  código vier vazio: um `codigo` divergente vindo de qualquer caminho **não** pode ser gravado. Se
  ele sobrescreve ou recusa o valor divergente é do plano; as duas formas cumprem a garantia.
  **Teste:** pgTAP — criar turma sem informar código grava `sigla [rótulo] ano`; segunda turma sem
  rótulo no mesmo curso e ano é recusada **pelo banco**; `codigo` divergente não é gravado.
- **FR-025.2**: O **rótulo**, quando preenchido, MUST ter a forma **`T<n>`** — `T` maiúsculo seguido de
  inteiro positivo, sem espaço —, imposta **pelo banco** (B-11, Q-21.2, 17/09/2026). Motivo: a unicidade
  do `FR-026` é por **igualdade de texto**, e `t1`, `T1 ` ou `Turma 1` passariam por ela como rótulos
  diferentes da `T1` e gerariam código fora do padrão. **Não** é motivo de endereço — o `FR-031.1` proíbe
  restringir rótulo por causa de URL. Medido em 16/09/2026: os **10** rótulos da base são `T1` ou `T2`; a
  restrição entra sem saneamento. *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-025.3**: A **janela real** da turma (`data_inicio`, `data_termino`) e as **`janelas_curso`** são
  **coisas distintas**, e MUST NOT ser sincronizadas (B-18, Q-25, 17/09/2026): `janelas_curso` é o
  **previsto** do PROENS — medido: `turma_prevista`, `data_inicio_prevista`, `data_termino_prevista`,
  `origem_proens` —, calendário do Épico 7; a janela da turma é o **realizado**. Editar uma não muda a
  outra. *"Sincronizar destruiria a única forma de enxergar divergência entre o PROENS e o que a turma
  de fato fez."* *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-026**: No mesmo **curso** e **ano letivo**, duas turmas MUST NOT ter o **mesmo rótulo**,
  sendo o **rótulo vazio um caso particular de igual** — duas sem rótulo colidem, como duas `T1`
  (Q-07.1, 16/09/2026). A recusa MUST vir **do banco**, na **criação e na edição**, pelos **três
  caminhos** que produzem a colisão: **remover ou trocar o rótulo**, **mudar o ano** e **mudar o
  curso**. A mensagem MUST dizer **qual turma já ocupa aquele rótulo naquele curso e ano** — nunca
  o erro cru do banco.
  ⚠️ **Por que "mesmo rótulo" e não "sem rótulo":** o código nunca muda (`FR-025.1`). Editar a `T2`
  para `T1` deixaria duas turmas **exibindo** `T1` com códigos diferentes — a mesma ambiguidade
  para quem lê que duas sem rótulo.
  ⚠️ **O que já existe e o que falta:** `turmas_unica_por_ano` (`curso_id`, `ano_letivo`, `turma`)
  já recusa rótulo igual **não vazio** nos três caminhos; o que falta é tratar o **vazio como
  igual**, que o `UNIQUE` padrão não faz (`NULL ≠ NULL`, D-5). **Medido em 16/09/2026:** o banco é
  **PostgreSQL 17.6**, no local e no remoto, e **nenhuma** combinação de curso, ano e rótulo — vazio
  incluído — se repete nas 28 turmas. Uma restrição de unicidade **declarativa** que trate nulos como
  iguais cobre os três caminhos numa declaração só, e o documento 04 prefere constraint declarativa
  a gatilho *"por ser verificável no catálogo"*; a forma é do plano, e vai na migration do
  `FR-046`.
  **Teste:** pgTAP negativo **por caminho** — remover o rótulo, trocar `T2` por `T1`, mudar o ano,
  mudar o curso — cada um recusado quando colide e aceito quando não colide.
- **FR-026.1**: Quando nasce a **segunda turma do ano** e a primeira está **sem rótulo**, **nada é
  automático** (A-10, Q-21.1, 17/09/2026): a primeira continua como está; a criação da segunda **exige
  rótulo** — o banco já recusa duas vazias (`FR-026`) — e **avisa** que a primeira está sem rótulo;
  editar a primeira para `T1` continua possível, com o código dela **intacto** (`FR-025.1`).
  *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-027**: A **modalidade da turma** MUST ser a que decide capacidade diária (`RN-MAT-04`), e
  MUST ser **obrigatória pelo banco** (`NOT NULL`, sem padrão — `FR-015`).
  ⚠️ **A modalidade da turma NÃO é, e NÃO deve virar, cópia ou herança da modalidade do curso**
  (Q-22.1, 16/09/2026). **Medido:** o `C-ApA-PCN-PR-EAD` está `semipresencial` e as duas turmas dele
  estão `ead`. Fazer a turma herdar do curso — por padrão de coluna, por gatilho ou por
  "simplificação" do formulário — **quebra a `RN-MAT-04`**, que manda a capacidade diária ser decidida
  pela modalidade **da turma**. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-028**: O **status** MUST ser um dos quatro (`planejada`, `ativa`, `concluida`, `cancelada`) —
  "Arquivada" é filtro de apresentação sobre `concluida`, **não** valor (TURMA-1). A mudança de
  status MUST ser **manual e livre**: quem pode editar turma escolhe **qualquer** um dos quatro, a
  **qualquer** momento, a partir de **qualquer** outro — **sem transição restrita** e **sem
  automação pela data** (Q-22, 16/09/2026). A v1.0 e a v2.0 nunca mudaram status pela aplicação;
  esta é a primeira tela que o faz, e ela não acrescenta regra de transição.
  **Quem pode editar turma, inclusive o status**: Admin, Encarregado e Ajudante da Divisão **e o
  Operador, dentro do seu escopo de curso** (Q-12, 16/09/2026). O seed já dá `turmas.editar` ao
  Operador; ele **ganha `turmas.criar`**.
- **FR-028.3**: O **documento 01** MUST ser **emendado**, com data e autoria, na implementação desta
  fatia: §2.2 — as responsabilidades do Operador passam a incluir **abrir e editar as turmas do seu
  escopo, inclusive o status**; §2.5 — a linha `turmas` passa de `L` para **`LCE`** na coluna `OPE`.
  A linha `horarios` **não muda**: ela já dava `LCE` ao Operador, e quem se corrige ali é o seed
  (Q-12, 16/09/2026). ⚠️ É a única emenda a documento de requisito que esta fatia faz — nos outros
  pontos (D-14, D-15, D-16) a divergência fica registrada **sem** alterar o documento.
- **FR-028.1**: O sistema MUST emitir **aviso de incoerência entre status e janela**, **nunca
  bloqueio** (`RN-DEG-02`; regra 6 do `CLAUDE.md`), no **mesmo padrão do quadro de avisos de
  qualidade de cadastro da spec 006** (`FR-027` de lá: recolhível, no topo, com a contagem de cada
  tipo à vista). A lista de tipos MUST ser **aberta e extensível** — aviso novo entra sem mudar o
  tipo que a descreve. Ela **começa** por dois (Q-22, 16/09/2026):
  - **`ativa` com término passado** — `data_termino` anterior à data de hoje;
  - **`planejada` com início passado** — `data_inicio` anterior à data de hoje.

  O aviso **não dispara** quando a data que ele compara está vazia (`RN-DEG-01`). Se o dia de hoje
  conta como passado → ~~Q-22.3~~ — **decidido em 17/09/2026 (A-11): não conta.** *"Anterior à data de
  hoje"* é **estrito**: a turma `ativa` que termina hoje e a `planejada` que começa hoje estão coerentes,
  como no `FR-006.1`, que inclui hoje nos dois extremos da janela. Com as rotas decididas (`FR-031`), o quadro da turma cabe na
  **ficha** `/turmas/[turma]`; se ele **também** aparece agregado na lista da página do curso é
  decisão do plano.
  **Medido na base de 16/09/2026: 11 de 28 turmas** disparam o aviso — 1 `ativa` com término
  passado (`C-Esp-ME 2026`, término 28/08) e 10 `planejada` com início passado (as três `T2` de
  `C-ApA-*`, `C-Esp-ALH`, `C-Exp-MetocOf`, `EST-QF-APHID`, `EST-QF-EM2040PHS`, `EST-QF-MAREFLU`,
  `EST-QF-PGRS100` e `EST-QF-PROC-MF-EAD`). Zero `concluida` com término futuro e zero `ativa` com
  início futuro — incoerências que **não** estão na lista inicial e só entram por decisão.
- **FR-028.4**: O quadro de avisos da **turma** MUST ter, além dos dois tipos de incoerência do
  `FR-028.1`, **três** tipos de qualidade de cadastro, no mesmo molde e na mesma lista aberta (Q-13 e
  Q-14, 16/09/2026):
  - **turma sem janela** — `data_inicio` ou `data_termino` vazia;
  - **turma sem sala** — `sala_alocada` vazia;
  - **turma sem efetivo e que não está planejada** — `alunos` vazio **e** status diferente de
    `planejada`. ⚠️ **Nunca só "sem efetivo":** efetivo desconhecido em turma planejada é situação
    normal, não falha de cadastro;
  - **turma sem disciplina** — nenhuma linha de `turma_disciplina` ativa, o que acontece quando o
    curso não tinha disciplina ativa ao criar a turma (`FR-032.3`, Q-24, 16/09/2026). Hoje, **0**.

  **Medido em 16/09/2026:** **1** turma sem janela (`EST-QF-NAVFLU-EAD 2026`), **2** sem sala
  (`EST-QF-MAREFLU 2026`, `EST-QF-PGRS100 2026`) e **0** sem efetivo fora de `planejada` — as **7**
  sem efetivo estão todas `planejada`. As faltas de hoje estão, todas, em turmas `planejada`.
- **FR-028.2**: **Nenhum status trava nada nesta fatia.** O que cada status libera ou trava no
  **lançamento de aula** é regra do **Épico 6** e não entra aqui (Q-22, 16/09/2026). Na
  pré-seleção, o status só **veta** `concluida` e `cancelada` (`FR-006.1`); no conteúdo do seletor,
  **não filtra** — as quatro situações entram (Q-27, decidida em 17/09/2026, `FR-035`).
- **FR-029**: A **sala alocada** MUST ser **domínio administrável em `config_listas`** — **lista de
  domínio, não entidade** —, conferida pelo banco no **padrão do gatilho genérico**
  `app.validar_dominio_config_lista(coluna, lista)`, o de `registros_aula.tipo_atividade` (Q-23,
  16/09/2026). O banco recusa sala **ausente da lista**; **sala vazia continua aceita** — turma sem sala
  gera aviso, nunca bloqueio (`FR-028.4`) —, e **sala desativada também é aceita** (`FR-029.4`).
  ⚠️ **O gatilho genérico, como está, NÃO serve — conferido em 16/09/2026:** ele só aceita valor com
  `ativo = true` e dispara em todo `UPDATE` que **envie** a coluna, mesmo com o valor inalterado. Ligado
  sem mudança, recusaria a edição de qualquer turma cuja sala foi desativada — exatamente o que o
  `FR-029.4` proíbe. A forma — variante da função ou parâmetro que dispense a checagem de `ativo` — é
  do plano, e **não** pode mudar o comportamento de `registros_aula.tipo_atividade`.
  **Valores iniciais — inventário institucional informado por Bernardo, NÃO inferido dos dados:**
  Sala CAHO (sala do Curso de Aperfeiçoamento em Hidrografia para Oficiais) · Sala 01 · Sala 02 ·
  Sala 03 · Sala 04 · Sala 06 · Laboratório de Informática · Moodle.
  ⚠️ **Sala 05 não consta do inventário informado. É ausência deliberada, não omissão de
  transcrição** — não acrescentar "por completude".
  **MUST NOT:** criar tabela de salas com chave estrangeira; semear a lista a partir das salas já
  gravadas nas turmas; tratar Moodle como caso especial em código; recusar sala vazia; alterar a sala
  de turma existente sem a substituição registrada na migration (`FR-029.3`).
  Reserva de sala como recurso **continua fora de escopo** (`RF-CRONOS-10`, `RNF-NORM-06`). *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-029.1**: A lista de salas MUST **distinguir salas físicas de ambientes virtuais**. O valor
  **Moodle** é **ambiente virtual** e existe para cursos EAD, que **não ocupam sala física**. Qualquer
  cálculo futuro de **ocupação, conflito ou lotação** de sala MUST **ignorar ambientes virtuais**:
  duas turmas EAD no mesmo tempo de aula **não configuram conflito de sala** (Q-23, 16/09/2026).
  A distinção MUST ser **atributo do próprio registro** da lista — um campo de metadado em
  `config_listas` ou uma lista irmã —, **nunca** comparação de texto com `'Moodle'` no código: se
  amanhã surgir outro ambiente virtual, a regra continua valendo **sem alterar código**.
  ⚠️ **Medido em 16/09/2026:** `config_listas` tem `lista`, `valor`, `rotulo_exibicao`, `ordem`,
  `ativo` e `observacao` — **nenhum campo de metadado**. A lista irmã não mexe em schema; o campo
  novo é alteração de uma tabela usada pelo sistema inteiro. A escolha é do plano, **com a restrição
  do `FR-029.6`**: o atributo é **explícito para toda sala**. ⚠️ Uma lista irmã que guarde **só** os
  ambientes virtuais **não** atende — a sala física ficaria **inferida pela ausência**, que é padrão
  silencioso com outro nome (`FR-015.1`).
  **Consumidores futuros que MUST ler o atributo:** o conflito de sala do DSA (`RN-CONF-01`, Épico 6)
  e a visão de ocupação de salas (`RF-CRONOS-09`, Épico 7). *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-029.2**: **Novas salas** MUST poder ser acrescentadas **sem alteração de código nem migration**,
  bastando **inserção na lista administrável** — é o que atende à criação de salas no CIAARA ao longo
  do tempo (Q-23, 16/09/2026). O **`quickstart.md`** desta fatia MUST dizer **onde** se acrescenta uma
  sala e **quem pode fazê-lo**, para que isso não vire pedido de desenvolvimento.
  **O caminho, decidido em 16/09/2026 (Q-23.1):** esta fatia entrega uma **tela mínima de salas**
  dentro de **Administração** — **sem entrada nova no menu**, que tem Administração como entrada única
  alcançada por abas (MENU-1). **Ações: listar, acrescentar, desativar e reativar** (`FR-029.4` a
  `FR-029.6`). **Escrevem Admin e Encarregado da Divisão**, os perfis que o seed já autoriza em
  `config_listas` (`parametros.criar`/`editar`); **o Ajudante da Divisão fica de fora de propósito**
  — ampliar a matriz é decisão própria, e acrescentá-lo depois é uma linha de seed. O `quickstart.md`
  MUST dar o caminho da tela e quem a alcança. *(decisão de Bernardo Villas Boas, 16/09/2026)*
  ⚠️ **Recusadas:** tela genérica de `config_listas` — abriria edição de vocabulário normativo pela
  interface e anteciparia `/admin/parametros`, que não é desta fatia; acréscimo pelo banco direto —
  *"pedido de desenvolvimento com outro nome"*.
- **FR-029.3**: **Reconciliação antes do gatilho**, na **mesma migration**, **nesta ordem** (Q-23,
  16/09/2026):
  1. listar os valores distintos de sala já gravados nas turmas;
  2. comparar com os oito nomes canônicos, **ignorando caixa e acento**;
  3. toda divergência que for **claramente a mesma sala com grafia diferente** é normalizada por
     `UPDATE` na própria migration, com a **lista de substituições registrada em comentário** no corpo
     dela;
  4. todo valor **sem correspondência** é **relatado a Bernardo antes de prosseguir** — sem inventar
     sala nova e sem apagar o valor;
  5. **só depois** de 3 e 4, o gatilho é criado.

  **Medido em 16/09/2026, para o plano saber o que esperar:** as 28 turmas gravam **7** valores de
  sala e **2** vazias. **6** batem exatamente com o inventário. **1** difere só na caixa —
  `Laboratório de informática`, em **9** turmas → `Laboratório de Informática`. **Nenhum** valor ficou
  sem correspondência, então o passo 4 não tem o que relatar **hoje**; a migration MUST repetir a
  conferência no momento em que roda, porque a base viva continua sendo escrita. As 2 vazias
  continuam vazias. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-029.4**: **Desativar uma sala remove-a da escolha em turmas novas e não invalida turmas que já
  a referenciam. A edição de uma turma cuja sala foi desativada MUST continuar permitida** (Q-23.1,
  16/09/2026). Desativar é **sair do seletor**, nunca recusar gravação: a validação da sala **não recusa
  valor inativo** (`FR-029`). Ao desativar uma sala **em uso**, a tela MUST **avisar listando as turmas
  que a referenciam** e **permitir prosseguir** — aviso, nunca bloqueio. **Medido em 16/09/2026:**
  desativar `Sala 04` listaria **5** turmas; `Moodle`, **6**; `Laboratório de Informática`, **9**.
  Sala **nunca é apagada** (regra 4 do `CLAUDE.md`). *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-029.5**: **A administração de salas permite acrescentar, desativar e reativar; não permite
  renomear. Correção de nome de sala ocorre por migração registrada, acompanhada da atualização das
  turmas que a referenciam** (Q-23.1, 16/09/2026). Motivo: `turmas.sala_alocada` é texto; renomear na
  lista **órfã** toda turma que gravou o nome anterior — a mesma divergência de caixa que a
  reconciliação do `FR-029.3` teve de corrigir. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-029.6**: Ao **acrescentar** uma sala, a tela MUST **exigir a escolha entre sala física e
  ambiente virtual**, **sem valor padrão** (Q-23.1, 16/09/2026). Sem isso, o próximo ambiente virtual
  nasce como sala física e o `FR-029.1` deixa de valer sem que ninguém perceba. As **8** salas do
  inventário entram já classificadas: **7 físicas** e **Moodle virtual**. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-029.7**: O banco MUST **recusar sala sem o atributo físico/virtual** (B-2, 17/09/2026): o atributo
  mora em `config_listas.metadados`, e a chave MUST estar **presente e ser booleana em toda linha da lista
  de salas**. **Ausência da chave é rejeitada, nunca interpretada como "física"**, e valor nulo também.
  ⚠️ **Armadilha registrada:** uma restrição escrita só como *"o tipo da chave é booleano"* **aceitaria a
  ausência** — a comparação com nulo dá nulo, e restrição com resultado nulo **passa**. O teste MUST
  provar os **três** casos: chave ausente, valor nulo, valor não booleano. *"Sem isso, a opção A recria
  pela porta dos fundos o padrão silencioso que o `FR-029.6` proibiu."*
  *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-029.8**: A **carga do ETL** MUST aplicar **a mesma lista de substituições de sala** da migration
  do `FR-029.3` — **uma lista só** — e registrar cada troca em `migracao_log` como **`corrigido`**, ação
  que já existe (B-20, 17/09/2026). Motivo medido: `pnpm db:reset` aplica a migration sobre base
  **vazia** e a carga vem **depois**, trazendo `Laboratório de informática` direto para o gatilho, que a
  recusa — a carga local e a de produção **abortariam**. *"Aceitar grafia antiga criaria segunda
  representação, que a Q-24.1 acabou de eliminar."* *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-030**: Passar do **limite de turmas por ano letivo** (`FR-003.2`) MUST gerar **aviso,
  nunca recusa** (Q-23, 16/09/2026; `RN-DEG-02`).
  - **O que conta**, por **enumeração positiva**: turmas do **mesmo curso** e do **mesmo ano
    letivo** com status **`planejada`, `ativa` ou `concluida`**. ⚠️ A regra MUST ser escrita como
    essa lista, **nunca** como "todas menos `cancelada`": um status novo que apareça no futuro não
    entra na contagem por descuido. Turma `cancelada` **não ocupa vaga** — não vai acontecer.
  - **Quando avisa:** toda **gravação de turma** que deixe a contagem daquele curso e ano **acima**
    do limite — criar turma, mudar o ano, mudar o curso, ou mudar o status de `cancelada` para um
    dos três que contam.
  - **Onde avisa — nos dois lugares, sempre:**
    1. **no momento de salvar**, no **diálogo de confirmação** (`FR-018`), que é **obrigatório**
       nessa gravação qualquer que seja a resposta da Q-18: a confirmação continua valendo e **nunca**
       bloqueia — *"a informação precisa estar onde a decisão é tomada"*;
    2. **no quadro de avisos do curso** (`FR-010`), como o tipo **curso acima do limite de turmas no
       ano**, para quem não estava lá na hora.
  - **O que a mensagem diz, nos dois lugares:** o **ano letivo**, **quantas turmas** já contam nele
    e o **limite** — por exemplo *"este curso já tem 2 turmas em 2026, que é o limite; confirmar
    mesmo assim?"* —, **nunca** um "acima do limite" genérico.

  **Medido em 16/09/2026:** **nenhum** curso está acima do limite. **Oito** estão **no** limite em
  2026 — `CAHO`, `C-Ap-FR`, `C-Ap-HN`, `C-Espc-FR`, `C-Espc-HN` (1 de 1) e `C-ApA-AuxNav-PR-SP`,
  `C-ApA-PCN-PR-EAD`, `C-ApA-PrevMe-PR-EAD` (2 de 2) —, e abrir mais uma turma de 2026 em qualquer
  deles mostra o aviso. O `C-ApA-OcOp-PR-SP` conta **0** em 2026 (as duas turmas estão `cancelada`)
  e abre turma **sem aviso nenhum**.
- **FR-030.1**: **Baixar o limite** de um curso para menos turmas do que ele já tem num ano letivo MUST
  **avisar no diálogo de salvar o curso**, com a mensagem do `FR-030` para **cada ano afetado** — nunca
  recusa (A-12, Q-23.2, 17/09/2026). *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-031**: **Rotas da turma** (Q-24.1, 16/09/2026):
  - **lista** — na **página do curso**, `/cursos/[curso]`;
  - **criação** — `/cursos/[curso]/turmas/nova`, rota própria, com o curso já definido pelo caminho;
  - **ficha e edição** — `/turmas/[turma]`, na **mesma rota**, o segmento que o documento 24 já
    reservou para o DSA (`/turmas/[turma]/dsa`), de modo que o DSA do Épico 6 seja **filho** da ficha.

  **MUST NOT:** aninhar a ficha sob o curso; criar ou editar em diálogo sem rota; acrescentar entrada
  no menu. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-031.1**: O segmento `[turma]` MUST ser o **próprio código da turma, sempre codificado** —
  `/turmas/C-ApA-PCN-PR-EAD%20T2%202026` —, e o mesmo vale para o valor de `?turma=` (`FR-037`): **uma
  representação só**, que decodifica **exatamente** no código gravado (Q-24.1, 16/09/2026).
  **Medido em 16/09/2026:** as **28** turmas seguem o formato do `FR-025.1` e **todas** têm espaço — o
  **único** caractere fora de letras, dígitos e hífen; nenhuma barra, acento, sublinhado, `?`, `#`,
  `%`, `+` ou `&`. Código novo **também terá espaço**, sempre, entre a sigla e o ano. As **24** siglas
  de curso usam só letras, dígitos e hífen e são seguras no segmento `[curso]`.
  **Recusadas:** trocar espaço por **hífen** — ambíguo, porque a sigla já tem hífen, e exigiria coluna
  derivada e única; trocar por **sublinhado** — exigiria proibir sublinhado em sigla e rótulo por
  motivo cosmético e criaria segunda representação. **MUST NOT:** coluna derivada para a URL;
  restrição de sigla ou rótulo por causa de endereço. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-031.2**: MUST existir **uma única função** que monta endereço de turma — segmento de rota **e**
  parâmetro de consulta —, usada em **todos** os pontos que produzem link para turma. **Nenhum** ponto
  monta endereço de turma por concatenação de texto: o risco desta forma não é a codificação, é alguém
  esquecê-la num lugar (Q-24.1, 16/09/2026).
  ⚠️ **Defeito existente, corrigido nesta fatia e não adiado:** a tela Início
  (`app/(app)/inicio/page.tsx`) escreve `` href={`/cursos/${t.cursoCodigo}?turma=${t.turmaCodigo}`} `` —
  o código da turma **sem codificação**, com espaço cru. Ele MUST passar a usar a função única, com
  teste que prove o link correto para um código com espaço. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-031.3**: MUST existir teste de **ida e volta** que percorra **os 28 códigos de turma da base**
  e **as siglas de curso** usadas em `/cursos/[curso]/…`, provando que cada um, codificado e
  decodificado, volta **idêntico** ao gravado — **nunca** um ou dois exemplos escritos à mão: *"o caso
  que quebra é sempre o que ninguém pensou em digitar"* (Q-24.1, 16/09/2026). *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-031.4**: Segmento que **não corresponde a turma alguma** MUST produzir **"turma não
  encontrada"**; turma **existente** que a pessoa **não pode ver** MUST produzir **mensagem própria**
  — no padrão de estado vazio da spec, que distingue *"não há"*, *"você não vê"* e *"ainda não
  existe"* (`FR-047`; Q-24.1, 16/09/2026).
  ⚠️ **Consequência para o plano, medida em 16/09/2026:** a ficha do instrutor consegue dizer "não
  encontrado" com certeza porque a leitura de instrutor **não tem recorte de escopo** — o texto dela
  diz *"o seu perfil lê o cadastro inteiro: não é falta de acesso"*. **Turma tem**
  (`turmas_ler` = `app.pode('turmas','ler') and app.alcanca_curso(curso_id)`): para o Operador fora do
  escopo e o Encarregado de Curso sem vínculo, a turma que existe e ele não vê chega **vazia, igual** à
  que não existe. Para os perfis de alcance total, a distinção vem da própria permissão, como no
  instrutor; para os perfis com recorte, ela exige **conferência de existência no banco, fora da RLS**,
  que **revela que o código existe** — sem nenhum dado da turma. O mecanismo, e se isso entra na
  migration, é do plano.
  ⚠️ **Ponderação registrada, para a resolução não partir do princípio de que distinguir é
  obviamente certo:** **juntar os dois casos pode ser a resposta correta, não um remendo.** Num
  **endereço direto**, informar que a turma existe a quem não pode vê-la **confirma a existência de um
  registro a quem não tem direito a ela**. **Em listas**, distinguir os três estados continua válido.
  **Para o endereço direto, o ponto fica aberto para o plano** — distinguir, com a conferência acima, ou
  juntar numa mensagem só —, pesando essa exposição.
  **Resolvido pelo plano (research R-9), sem objeção nas respostas de 17/09/2026:** perfis de alcance
  total recebem *"Turma não encontrada"*; perfis com recorte recebem **uma** mensagem, *"Turma não
  encontrada ou fora do seu alcance"*; nenhuma conferência de existência fora da RLS; nas listas, os três
  estados continuam distintos. *(decisão de Bernardo Villas Boas, 16/09/2026)* *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-031.5**: A ficha `/turmas/[turma]` MUST **mostrar o curso** a que a turma pertence, com
  **caminho de volta** para a página dele — para quem chega direto por link, marcador ou vindo do
  DSA. Separar os segmentos não pode deixar a ficha sem contexto (Q-24.1, 16/09/2026). *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-031.6**: Ficha, edição e criação MUST repetir **exatamente** o desenho de rotas do **instrutor**
  na fatia (c), **sem** gramática de navegação nova (Q-24.1, 16/09/2026). O desenho, conferido em
  16/09/2026:
  | Instrutor (fatia c) | Turma (esta fatia) |
  |---|---|
  | lista em `/instrutores` | lista na página do curso |
  | criação em `/instrutores/novo`, página própria, formulário no modo `novo` | criação em `/cursos/[curso]/turmas/nova`, página própria, mesmo formulário no modo `novo` |
  | ficha **e edição na mesma rota**, `/instrutores/[codigo]`, formulário no modo `edicao` visível só a quem pode editar; **não existe** `/editar` | ficha e edição em `/turmas/[turma]`, mesmo arranjo, **sem** `/editar` |
  | depois de criar, `router.push` para a ficha do criado | depois de criar, **destino é a ficha da turma recém-criada**, `/turmas/[turma]` — nunca a lista, para não deixar dúvida se gravou |
  *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-031.7**: **Ausências deliberadas, não esquecimentos** (Q-24.1, 16/09/2026): **não existe
  listagem global de turmas** nesta fatia, **por decisão** — a lista é a da página do curso; e a rota
  **`/turmas/[turma]/dsa` fica reservada ao Épico 6** e **não** é construída aqui. Registrado para que
  ninguém as acrescente achando que faltaram. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-032**: Criar turma MUST fazer nascer, **no banco e na mesma transação**, **uma linha de
  `turma_disciplina` por disciplina ativa do curso** (Q-24, 16/09/2026). Cada linha nasce com o
  período **herdado da grade** (`origem_periodo = 'herdado_grade'`) quando a condição do `FR-032.1`
  vale, e **em branco** (`'nao_informado'`) nos demais casos. Assim, turma nova e as 28 migradas ficam
  **indistinguíveis** para a fatia (b) e para a LIQ. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-032.1**: **A condição de herança é comportamento existente, conferido no código** (Q-24,
  16/09/2026). **Não** está no ETL da v2.1, que só transportou as 210 linhas: está no script da v2.0
  que as criou, `SIS11/CIAARA-11-v2/migracao/criar_turma_disciplina.py`, linhas 153–157:
  `herda = grade_ini and janela_ini and janela_fim and janela_ini <= grade_ini <= janela_fim`. O
  motivo, no próprio comentário: *"é o que impede a data da T1 de ser copiada para a T2 do mesmo
  curso"*. Portanto:
  - herda **quando** a disciplina tem **previsão de início** na grade **e** essa data cai **dentro da
    janela completa** da turma, pontas incluídas — e, herdando, copia **as duas** datas da grade;
  - **turma sem datas, ou com janela incompleta, não permite avaliar a condição: a linha nasce
    `nao_informado`** — texto do requisito, não consequência da implementação.

  **Medido em 16/09/2026:** as **89** linhas `herdado_grade` caem todas dentro da janela, **nenhuma**
  linha `nao_informado` tinha previsão na grade, **1** turma não tem datas (`EST-QF-NAVFLU-EAD 2026`)
  e **0** têm janela incompleta. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-032.2**: As linhas MUST nascer por **gatilho `AFTER INSERT` em `turmas`** — não só pela
  Server Action —, para que **qualquer** caminho de criação seja coberto (Q-24, 16/09/2026). A
  unicidade de **(turma, disciplina)** entre linhas ativas **já existe** — `uq_turma_disciplina_ativo`,
  parcial em `status = 'ativo'`, que impede linha ativa duplicada e preserva o histórico inativo — e
  não precisa ser criada. Duas consequências para a migration do `FR-046`, medidas:
  - `turma_disciplina.codigo` é `TDI-NNNNNN` nas **210** linhas (a maior é `TDI-000210`) e **não tem
    gerador** hoje — o gatilho MUST gerar o código no **padrão do `VIN-` da fatia (c)**: sequência
    que avança além do maior código gravado;
  - a policy de inserção em `turma_disciplina` exige `disciplinas.editar` e o alcance da turma; os
    **quatro** perfis que criam turma (Admin, Encarregado, Ajudante e Operador, `FR-025`) têm
    `disciplinas.editar`, então o gatilho funciona com os direitos de quem cria. ⚠️ Se um deles
    perder essa permissão, criar turma passa a falhar por inteiro — o plano decide se isso fica assim
    ou se o gatilho roda com os direitos do dono. *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-032.3**: Turma nova recebe linha **apenas para disciplina ativa** (Q-24, 16/09/2026). ⚠️ **Isto
  difere do script da v2.0**, que criava linha para **toda** disciplina do curso, sem olhar a situação
  — é de lá que vem a linha da disciplina **inativa** `ALH-II` na turma `C-Esp-ALH 2026` (9 linhas
  para 8 disciplinas ativas). Essa linha é **fato histórico**: MUST NOT ser **removida** e MUST NOT
  ser **replicada** em turmas novas. Registrado para que ninguém "corrija" a diferença depois.
  **Curso sem nenhuma disciplina ativa** gera turma com **zero** linhas — **aviso, nunca bloqueio**
  (`FR-028.4`). *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **FR-032.4**: **Fronteira com a fatia (b):** o que acontece com as linhas de uma turma **já
  existente** quando a grade do curso muda — disciplina acrescentada, disciplina desativada — **não é
  desta fatia** e **não** está resolvido aqui (Q-24, 16/09/2026). Fica registrado como ponto da (b).
  *(decisão de Bernardo Villas Boas, 16/09/2026)*

#### Seletor de turma

- **FR-033**: MUST haver **um único** construtor de seletor de turma na aplicação — o de
  `components/ciaara/seletor-turma.tsx` —, verificado por teste, como já se faz para o de instrutor
  (`FR-011` da spec 007). Ele **não** ordena por regra de domínio: quem chama ordena. A **ordem**
  → ~~Q-27~~ — **decidida em 17/09/2026** (`FR-035`).
- **FR-033.1**: Nesta fatia o seletor MUST listar as turmas de **um curso só** — o da página (A-15,
  Q-29, 17/09/2026). O componente recebe a lista pronta e **não impede** o uso com turmas de mais de um
  curso, que a fatia (b) ou o Épico 6 decidem quando precisarem. *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-034**: O **rótulo** exibido MUST existir para **toda** turma, inclusive as 18 sem `T1`/`T2`.
  Qual é o formato — a v2.0 usava `Nome_Completo_Curso`; a `vw_turmas_rotulo` produz
  `"C-Ap-FR T2/2026"` e **devolve `NULL` em 18 de 28** — → ~~Q-26~~ — **decidido em 17/09/2026 (A-13):
  o código da turma e o status**, `C-ApA-PCN-PR-EAD T2 2026 · Ativa`. O código nunca é nulo (28 de 28) e
  é o mesmo identificador da URL; a `vw_turmas_rotulo` **não** é usada (D-3). *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-035**: A lista MUST vir do banco **já recortada pela RLS**: o seletor mostra o que o perfil
  alcança. Se turmas `cancelada` e `concluida` entram no seletor por padrão (a v2.0 pré-filtrava
  por "Ativa") → ~~Q-27~~ — **decidido em 17/09/2026 (A-14): entram as quatro situações**, na ordem
  **ano letivo decrescente, data de início decrescente (sem data por último), código**. Sem pré-filtro
  por situação: o status é manual e está incoerente em 11 de 28, e a pré-seleção já veta `concluida` e
  `cancelada` (`FR-006.1`). *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-036**: A escolha MUST ir para a **URL** (`?turma=`) por `useParametro`, **empilhando**
  histórico — trocar de turma é navegação (documento 25 §1.6).
- **FR-037**: O contrato de parâmetros (`lib/navegacao/contrato.ts`) MUST ganhar as rotas `/cursos`
  e `/cursos/[curso]` com `turma` e `aba`, e as rotas **`/cursos/[curso]/turmas/nova`** e
  **`/turmas/[turma]`** sem parâmetros de consulta, como `/instrutores/novo` e
  `/instrutores/[codigo]` (`FR-031.6`). O **valor** de `?turma=` MUST ser o `codigo` da turma no
  formato do `FR-025.1`, **codificado pela função única do `FR-031.2`**, nunca `uuid`.
  **Emenda de 17/09/2026:** o contrato ganha também **`/cursos/novo`** e **`/cursos/[curso]/editar`**
  (`FR-013.1`) e **`/admin/salas`** (`FR-029.2`), sem parâmetros de consulta; e `/cursos` ganha
  **`classificacao`** e **`modalidade`** (`FR-004`).

#### Menu

- **FR-038**: `lib/navegacao/menu.ts` MUST corrigir os épicos anunciados: *Cursos → "Épico 5 (a)"*
  (hoje "Épico 7"), *Disciplinas → "Épico 5 (b)"* (hoje "Épico 6"), *Cronograma → "Épico 7"* (hoje
  "Épico 9"), *Atividades → "Épico 9"* (hoje "Épico 8") — conforme os títulos do documento 06 §3.
  **Ordem e rótulos não mudam** (`RF-NAV-02`, MENU-1).
- **FR-039**: Ao entregar `/cursos`, a entrada "Cursos" MUST virar `disponivel: true` **no mesmo
  passo** — o teste do shell confere os dois sentidos.
- **FR-040**: A tabela da MENU-1 em `specs/008-shell-e-estado-na-url/contracts/casca.md` (linhas
  134–138) MUST receber **emenda datada** com os mesmos quatro rótulos, para o registro não divergir
  do código.

#### Transversais — plataforma e fronteira

- **FR-041**: Toda leitura MUST ser **Server Component**; `"use client"` só em folha — nunca em
  `page.tsx` nem `layout.tsx`.
- **FR-042**: Toda escrita MUST ser **Server Action** com `safeParse` do Zod **na primeira linha**;
  o erro do banco (`23505`, `23514`, `23P01`, `42501`) MUST ser traduzido para mensagem de negócio
  em português. **Nenhuma** usa `service_role`.
- **FR-043**: Toda regra pura (pré-seleção de turma, rótulo, aviso de incoerência status × janela, validação de regime
  contra o currículo, alertas) MUST viver em `lib/dominio/`, em TypeScript **sem** `supabase`,
  `next` ou `react`, com o identificador `RN-`/`RF-` e a citação literal no topo, e teste Vitest ao
  lado — **antes** de qualquer componente.
- **FR-044**: A negativa MUST vir **do banco**: para cada perfil, teste **negativo** provando o que
  ele não lê e não escreve em `cursos`, `turmas`, `curso_regime_historico` e `responsaveis_curso`.
  Ocultar botão é cortesia. Para o **Operador**, os testes MUST provar os dois lados (Q-12,
  16/09/2026): **dentro** do escopo, registra e corrige vigência, cria turma e edita turma, inclusive
  o status; **fora** do escopo, as quatro operações são **recusadas** pelo banco. E ele continua
  **sem** criar nem editar **curso**.
- **FR-045**: Nenhum componente MUST definir cor literal — só token do `@theme`; a regra de cor da
  fatia (a) do Épico 4 continua bloqueante e o repositório continua em zero violações.
- **FR-046**: Nenhuma regra normativa vira `CHECK` novo (`RN-DEG-02`). Esta fatia tem **uma**
  migration, e só com o que a Q-07 e a Q-06 decidiram em 16/09/2026: a **imutabilidade de todos os
  parâmetros** de vigência existente, com as duas únicas escritas permitidas (`FR-020`); a
  **correção atômica** de vigência sem lançamento, com a checagem nas três tabelas — inclusive o
  alcance da atividade de escopo global — e a trava (`FR-021.1` a `FR-021.3`, `FR-021.5`); e a **geração do código de
  turma** (`FR-025.1`); e as **permissões do Operador** — recurso `horarios` na matriz, policies de
  escrita de `curso_regime_historico` sobre ele, `turmas.criar` para o Operador (`FR-024`,
  `FR-028`); e a **unicidade do rótulo por curso e ano com o vazio igual**, na criação e na
  edição (`FR-026`); a **recusa de `ead_semipresencial` em curso** (`FR-003.1`); e a
  **desativação de curso** — ação `desativar` no seed, recusa com turma pendente, `app.cursos_do_usuario()`
  sem filtro de situação e a recusa explícita de escrita em curso inativo nas 16 tabelas
  (`FR-017` a `FR-017.5`), com a **exceção única da reativação** por valor alterado (`FR-017.7`); e
  os **obrigatórios e padrões** — `NOT NULL` em `turmas.modalidade` e
  `cursos.duracao_dias`, saída dos `DEFAULT` de `cursos.modalidade` e `cursos.limite_turmas_ano`, e o
  gatilho do limite pela classificação (`FR-003.2`, `FR-015`, `FR-027`); e a **lista de salas** —
  valores do inventário, distinção explícita entre sala física e ambiente virtual, reconciliação das
  salas gravadas e só então a validação ligada a `turmas.sala_alocada`, aceitando sala desativada
  (`FR-029` a `FR-029.6`). **Sem** linha nova de seed para o Ajudante da Divisão. E o **nascimento
  das linhas de disciplina da turma** — gatilho `AFTER INSERT` em `turmas`, com a condição de herança
  do script da v2.0 e o gerador do código `TDI-` (`FR-032` a `FR-032.3`).
  Nenhuma tabela nova,
  nenhuma `drop`, nenhuma policy de `DELETE`. Ela MUST trazer: **plano de reversão** escrito no PR;
  asserções **pgTAP nomeadas**, incluindo as negativas; o `revoke` de `public` e `anon` em toda
  função que ela criar, como as migrations da fatia (c) fazem; `pnpm db:tipos` depois dela; e MUST ser **aplicada no Supabase remoto antes do
  merge** — Preview e Production usam o mesmo projeto (`FR-016.1` da spec 001), e mesclar sem aplicar
  deixa Production sem a garantia, como a fatia (c) já registrou.
  Qualquer outra mudança de banco que o restante desta fatia decida (Q-08.1)
  emenda este requisito com data.
  **Emenda de 17/09/2026 (B-1): SETE migrations, não uma**, na ordem do `plan.md` — salas; obrigatórios
  de curso e turma; código e rótulo de turma; `turma_disciplina`; permissões; vigência de regime; curso
  inativo —, **cada uma com o seu plano de reversão**. O conteúdo acima continua integral e **cresce**
  com o que as respostas de 17/09/2026 decidiram: a chave obrigatória de sala (`FR-029.7`); o rótulo
  `T<n>` (`FR-025.2`); a linha `horarios` inteira (`FR-024.1`); o gerador `REG-` (`FR-019.3`); a recusa
  de vigência que reinterpreta lançamento (`FR-019.4`); o curso que nasce com regime e a recusa de curso
  sem regime (`FR-019.5`); a trava da atividade global (`FR-021.7`); a leitura das vigências protegidas
  por atividade global, que o aviso do `FR-021.8` consome; a unicidade de início só entre ativas
  (`FR-021.9`); e o ajuste de `sincronizar_habilitacoes` (`FR-017.9`). Além delas, a **carga do ETL**
  ganha a mesma substituição de sala (`FR-029.8`) e o avanço das sequências de código. **Nenhuma tabela
  nova** continua valendo — ⚠️ salvo o que a pergunta **B-21** (auditoria da sigla, `FR-014.1`) decidir.
  *(decisão de Bernardo Villas Boas, 17/09/2026)*
  **Segunda emenda de 17/09/2026 (B-21):** a fatia cria **uma tabela nova, `curso_sigla_historico`**,
  append-only, escrita só por gatilho (`FR-014.1`) — é a **única** exceção ao *"nenhuma tabela nova"*, e
  vem com o que toda tabela nova traz: RLS, policy de leitura, índice, o quarteto de auditoria e
  `origem_migracao_v1`. Entram também o **parâmetro do 9º TA** em `config_parametros` (`FR-023`) e, na
  carga do ETL, a **verificação prévia de cursos sem regime** (`FR-019.6`). **Nenhuma** migration
  cascateia sigla para código de turma (`FR-014.2`). *(decisão de Bernardo Villas Boas, 17/09/2026)*
  **Terceira emenda de 17/09/2026:** o gatilho de `cursos` ganha a **recusa de sigla que já foi de outro
  curso** (`FR-014.3`), e a verificação prévia do ETL passa a cobrir **os dez** modos de aborto da fatia
  (`FR-019.6`). O `migracao_log` **não** é tocado (D-21). *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-046.1**: A fatia é entregue em **dois PRs** (A-1, 17/09/2026): o **primeiro** com as sete
  migrations, os testes, a carga do ETL e a varredura dos consumidores; o **segundo** com as telas. Os
  **três critérios são obrigatórios**:
  1. cada PR **mescla verde com a suíte completa** (`pnpm verificar:tudo` e o CI);
  2. cada PR deixa o sistema **utilizável, sem nada meio construído**;
  3. o PR de banco vai **ao Supabase remoto antes do merge**, como a fatia (c) fez.

  A contagem de tarefas e de arquivos de cada PR fica no `plan.md` e é informada **antes** do
  `/speckit-tasks`. *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **FR-047**: Estado vazio MUST distinguir **"não há"**, **"você não vê"** e **"ainda não existe no
  sistema"** (`FR-033` da spec 008) — a Production hoje é o terceiro caso.
- **FR-048**: Densidade antes de beleza: listagens com `TabelaDensa`, indicadores com `CardKpi`,
  gráficos com `components/graficos/`, avisos com `AlertaConformidade`, status com `BadgeStatus`,
  seletor com `SeletorTurma`, confirmação com `DialogoConfirmacao`, campos com `CampoObrigatorio` —
  **nada disso é reescrito**.

### Key Entities

- **Curso** — a unidade normativa: sigla (`codigo`), nome, classificação (as 5 do Glossário),
  modalidade (obrigatória, sem padrão), limite de turmas por ano (padrão pela classificação,
  editável), duração em dias (obrigatória) e em semanas (opcional), propósito (opcional), prioridade
  de alocação, status. Raiz do grafo. **Não** carrega regime: quem carrega é a vigência.
- **Vigência de regime** (`curso_regime_historico`) — o regime como série temporal por curso e por
  tipo (`padrao`/`excecao`): TA por dia e duração, intervalos e horários, limite diário EAD,
  `vigente_de`/`vigente_ate`, fundamento e motivo. **Append-only**: nenhum parâmetro muda depois de
  gravado; muda-se por sucessora, e a que não tem lançamento dependente pode ser cancelada e
  substituída numa transação (`FR-020`, `FR-021.1`, `FR-021.2`). Resolvida por
  `app.fn_regime_vigente(curso, data)`; **hoje sem nenhuma sucessão real**.
- **Turma** — a ocorrência do curso num ano: `codigo` gerado `sigla [rótulo] ano` e imutável,
  rótulo `T1`/`T2` opcional (nulo em 18 de 28) e único por curso e ano, com o vazio contando como
  igual, ano,
  efetivo, modalidade (prevalece sobre a do curso), janela real, sala, status (4 valores, mudança
  manual e livre, com aviso quando contradiz a janela).
- **Responsável do curso** (`responsaveis_curso`) — assinaturas do DSA impresso, por curso ou
  gerais, com vigência. **2 linhas, ambas gerais.** Consumidor real é o Épico 6.
- **Seletor de turma** — o único ponto de escolha de turma da aplicação, alimentado pelo curso,
  escrevendo em `?turma=`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001.1**: Na aba "Sobre o Curso" dos 24 cursos, a grade soma exatamente a CH em TA das
  disciplinas ativas de cada um (1.668 no `CAHO`), as **118** avaliações previstas aparecem no curso
  a que pertencem, e as **5** eliminatórias exibem o caráter. **Zero** campos editáveis, **zero**
  médias calculadas e **zero** regras que leiam `carater` ou `formula_mf` — verificado por teste.
- **SC-001**: Os **24** cursos aparecem em **exatamente cinco** grupos, na ordem Regular ·
  Expedito · Especial · Aperfeiçoamento Avançado · Estágio de Qualificação, com **5, 5, 3, 4 e 7**
  cartões — contados, não estimados.
- **SC-001.2**: Cadastrar curso Regular preenche limite **1**; qualquer outra classificação,
  **2** — em **100%** dos cadastros, editável depois. Gravar curso `ead_semipresencial` é recusado
  **pelo banco** em **100%** das tentativas.
- **SC-001.3**: Na base de 16/09/2026, desativar é aceito em **6 de 24** cursos e recusado nos
  **18** com turma `planejada` ou `ativa`, **100%** das recusas nomeando as turmas. Curso inativo:
  some de `/cursos` com `?situacao=ativo` e aparece com `?situacao=inativo`, com as turmas
  consultáveis, para **todo** perfil que o alcançaria ativo e para **nenhum** fora do escopo;
  **zero** escritas aceitas nele além da reativação; **zero** vazamentos para listas de escolha no
  teste do `FR-017.6`; **zero** linhas movidas ou copiadas ao desativar.
- **SC-001.5**: Com o `C-Exp-BATI` inativo, pelo banco: reativar é aceito para Admin, Encarregado e
  Ajudante da Divisão em **3 de 3** perfis e recusado para os outros **6**; um `UPDATE` que reenvia a
  linha inteira com os valores iguais e muda só a situação é **aceito**; um `UPDATE` que muda a
  situação **e** o propósito é **recusado**; escrever na turma, na vigência ou em qualquer tabela
  dependente do curso inativo é recusado **inclusive** para os três perfis. **Zero** ações de reativar
  separadas no seed.
- **SC-001.6**: Trocar a sigla de um curso com turmas grava **exatamente 1** linha em
  `curso_sigla_historico`, com sigla anterior, nova, autor e momento; `UPDATE`, `DELETE` e `TRUNCATE` nela
  são recusados em **3 de 3**, **inclusive** para a `service_role`; **zero** códigos de turma mudam; a
  primeira turma criada depois usa a sigla **nova**; e o diálogo de confirmação diz, com todas as letras,
  que as turmas já criadas continuam com a sigla antiga e quantas são (`FR-014.1`, `FR-014.2`).
- **SC-001.7**: Pelo banco, em **100%** das tentativas: criar curso ou trocar sigla para uma sigla que foi
  **de outro curso** é **recusado**, com a mensagem nomeando esse curso e a data em que ele a deixou; e um
  curso que **volta** a uma sigla que foi **dele** é **aceito** (`FR-014.3`).
- **SC-001.4**: Pelo banco, em **100%** das tentativas: curso sem modalidade ou sem duração em dias é
  **recusado**; turma sem modalidade é **recusada**; curso Expedito gravado **sem** limite recebe
  **2**, curso Regular sem limite recebe **1**, e curso Expedito com limite **1 explícito** fica com
  **1**. As **24** e **28** linhas existentes continuam válidas, sem saneamento. **Zero** turmas têm a
  modalidade preenchida a partir do curso.
- **SC-002**: **100%** das telas desta fatia reproduzem a mesma tela após `F5` e após colar a URL
  numa aba nova (`RF-NAV-04` a, c, d); "voltar" desfaz um passo por vez (b).
- **SC-002.1**: Os **28** códigos de turma e as **24** siglas de curso da base fazem ida e volta pela
  URL **idênticos** em **100%** dos casos; **zero** pontos do código montam endereço de turma por
  concatenação; o link da tela Início para um código com espaço sai **codificado**. Em **listas**, os
  três estados vazios são distinguidos em **100%** dos casos; no **endereço direto**, o resultado segue
  o que o plano decidir pelo `FR-031.4`, **nunca** revelando dado da turma a quem não a vê. Criar turma
  leva à ficha dela em **100%** das vezes, e a ficha mostra o curso com caminho de volta.
- **SC-002.2**: Colar `/cursos/C-ApA-PCN-PR-EAD?aba=grade&turma=C-ApA-PCN-PR-EAD%20T2%202026` numa aba
  nova reproduz a **mesma** aba e a **mesma** turma em **100%** das aberturas; a página tem
  **exatamente 2** abas; o quadro de avisos do curso aparece **nas duas**, acima delas; e a aba
  "Grade" mostra, para a `T2`, **uma linha por disciplina** com CH prevista e executada.
  ✂️ *A última cláusula saiu com a linha de corte aplicada em 17/09/2026 (`FR-009.1`); o restante do
  critério vale inteiro.*
- **SC-002.3**: O diálogo de confirmação aparece em **100%** das gravações da lista do `FR-018.1` e em
  **0%** das demais — verificado por teste que percorre cada gravação da fatia.
- **SC-003**: Um `?turma=` explícito é preservado em **100%** das aberturas — zero sobrescritas
  pela pré-seleção.
- **SC-003.1**: Na base de 16/09/2026, sem `?turma=`: os **20** cursos de turma única abrem na sua
  turma; dos **4** com seletor, **3** abrem na `T2` em curso e **1** (`C-ApA-OcOp-PR-SP`) abre sem
  seleção. Nenhuma pré-seleção cai em turma `concluida` ou `cancelada`.
- **SC-004**: O número de construtores de seletor de turma na aplicação é **um**, e a página do
  curso o consome; o rótulo exibido é não vazio para **28 de 28** turmas.
- **SC-004.1**: **100%** das turmas — as 28 migradas e toda turma criada pela fatia — têm `codigo`
  no formato `sigla [rótulo] ano`; **zero** códigos mudam depois de gravados; e a segunda turma sem
  rótulo no mesmo curso e ano é recusada em **100%** das tentativas, **pela tela e fora dela**.
- **SC-004.2**: Dos **quatro** caminhos de colisão na edição — remover o rótulo, trocar por um
  rótulo já usado, mudar o ano, mudar o curso —, **4 de 4** são recusados pelo banco quando colidem e
  **4 de 4** aceitos quando não colidem; **100%** das recusas nomeiam a turma que já ocupa o rótulo.
- **SC-004.4**: Rótulo fora da forma `T<n>` — `t1`, `T1 ` com espaço, `Turma 1`, `T0` — é recusado pelo
  banco em **100%** das tentativas, e os **10** rótulos da base continuam válidos (`FR-025.2`).
- **SC-004.3**: Criar turma, **por qualquer caminho**, faz nascer **exatamente** uma linha de
  `turma_disciplina` por disciplina **ativa** do curso, na mesma transação — `CAHO 2027` nasce com
  **22**, `C-Esp-ALH 2027` com **8** (sem a `ALH-II` inativa). Cada linha é `herdado_grade` **se e só
  se** a previsão de início da grade cai na janela completa da turma; turma sem datas nasce com
  **100%** das linhas `nao_informado`. Se a criação das linhas falhar, a turma **não** é gravada.
  **Zero** linhas duplicadas por um segundo caminho; a linha histórica da `ALH-II` em
  `C-Esp-ALH 2026` continua existindo; os códigos novos seguem `TDI-NNNNNN` a partir de `TDI-000211`.
- **SC-005**: Para cada um dos 9 perfis, o teste negativo de RLS prova a negativa em **100%** das
  operações que a matriz não concede sobre `cursos`, `turmas`, `curso_regime_historico` e
  `responsaveis_curso`.
- **SC-005.1**: Um Operador de escopo `expedito` **registra vigência, cria turma e muda status** em
  `C-Exp-BATI` com sucesso, e as **mesmas três** operações em `CAHO` (escopo `regular`) são
  recusadas pelo banco — **3 de 3** aceitas dentro, **3 de 3** recusadas fora; `UPDATE` de curso
  pelo Operador, recusado dentro e fora do escopo.
- **SC-006**: Com três vigências sucessivas, um registro de cada período resolve para a
  configuração certa em **3 de 3**, e alterar a mais recente muda **zero** totais históricos
  (asserção pgTAP nomeada `RN-2027-09`) — é a prova do critério 7 do documento 06, nesta fatia.
- **SC-007**: A contagem de campos digitáveis de **carga horária** nas telas de curso e turma é
  **zero**.
- **SC-008**: Os quatro rótulos de épico do menu batem com os títulos do documento 06 §3, e o
  teste do shell passa com "Cursos" disponível.
- **SC-009**: `pnpm verificar:tudo` e o CI dão **veredito idêntico** sobre o mesmo commit
  (`SC-005` da spec 001).
- **SC-010**: A regra de cor mede **zero** violações no repositório inteiro depois da fatia.
- **SC-011**: ~~**Exatamente uma** migration~~ **Exatamente sete** migrations nesta fatia (`FR-046`,
  emenda de 17/09/2026), **cada uma** com plano de reversão, pgTAP negativo, e **todas** aplicadas no remoto
  antes do merge do PR de banco (`FR-046.1`). Com ela, **zero** `UPDATE` de **parâmetro**
  em vigência existente é aceito, por qualquer caminho e qualquer perfil autenticado; e **zero**
  correções deixam a anterior cancelada sem a sucessora gravada.
- **SC-011.1**: Na base de 16/09/2026, "Corrigir esta vigência" é oferecida em **exatamente 18 de
  29** vigências e recusada nas **11** com lançamento, **100%** delas com mensagem que nomeia o
  lançamento e o caminho — **zero** erros crus do banco. O teste de corrida tem **um caso por
  tabela** da lista do `FR-021.2`, e nenhum deles grava a correção.
- **SC-011.2**: Com **uma** atividade de escopo global cadastrada pelo teste, a correção da vigência é
  **recusada** no curso com turma cuja janela contém a data, **aceita** no curso cuja única turma não
  tem datas, **recusada com motivo** no curso com janela incompleta compatível, e **aceita** no curso
  sem turma na data — **4 de 4** resultados como o `FR-021.5` fixa, e **100%** das recusas nomeando a
  atividade e a turma. **Zero** decisões de alcance tomadas pelo status da turma.
- **SC-011.3**: Registrar vigência cujo período contenha lançamento já gravado do curso é recusado pelo
  banco em **100%** das tentativas, **um caso por tabela** do `FR-021.2`, com a mensagem do `FR-021.4`; e
  vigência com data futura é aceita (`FR-019.4`).
- **SC-011.4**: Curso sem vigência `padrao` ativa é recusado pelo banco em **100%** das tentativas, **por
  qualquer caminho** — criar o curso sozinho, cancelar a única vigência `padrao` sem sucessora —, e criar
  curso e vigência juntos é aceito; os **24** cursos da base continuam válidos (`FR-019.5`).
- **SC-011.5**: Com uma atividade global cadastrada pelo teste, encurtar a janela da turma que a alcança
  **grava**, e o aviso nomeia **exatamente** as vigências que deixam de ficar protegidas — **zero** a mais
  e **zero** a menos —; vigência ainda travada por lançamento próprio ou por outra turma **não** aparece;
  mudar o curso da turma produz o mesmo aviso (`FR-021.8`).
- **SC-011.6**: Com um dado de origem que faz **cada uma das dez** conferências do `FR-019.6` falhar ao
  menos uma vez, a carga do ETL **falha na verificação prévia**, **antes de qualquer escrita**, com **10 de
  10** conferências nomeando as linhas que falham; **zero** linhas gravadas; com o dado de 16/09/2026, as
  dez dão **zero** e a carga segue (`FR-019.6`).
- **SC-011.7**: `config_parametros` tem a chave `regime.nono_ta_dias_por_semana_sem_aviso` com valor
  **2**, natureza `operacional` e fundamento preenchido, e mudar o valor **não** exige deploy (`FR-023`).
- **SC-012**: Cada ponto em aberto da seção abaixo tem **resposta datada ou permanece explicitamente
  aberto** ao fim do `/speckit-clarify` — nenhum é resolvido por suposição no plano.
- **SC-013**: Das **12** transições possíveis entre os quatro status, **12** são aceitas e **zero**
  acontecem sem ação de alguém. Na base de 16/09/2026, o aviso de incoerência marca **exatamente
  11 de 28** turmas (1 + 10), e **nenhuma** delas é impedida de salvar.
- **SC-014**: Na base de 16/09/2026, os quadros de avisos contam **exatamente**: curso sem duração
  em semanas **12**, curso sem propósito **10**; turma sem janela **1**, sem sala **2**, sem efetivo
  fora de `planejada` **0**; curso acima do limite de turmas no ano **0**. **Zero** regiões de tela
  reservadas para alerta sem dado, e **zero** avisos impedem qualquer gravação.
- **SC-014.1**: Abrir mais uma turma de 2026 mostra o aviso de limite no diálogo de confirmação em
  **8 de 8** cursos que estão no limite, e em **0** vezes no `C-ApA-OcOp-PR-SP`; **100%** das
  mensagens nomeiam o ano, a contagem e o limite; **zero** gravações recusadas por limite. O teste
  prova que a contagem é a lista `planejada`/`ativa`/`concluida` e **não** "todas menos
  `cancelada`".
- **SC-014.2**: A lista de salas tem **exatamente os 8** valores do inventário, **sem** "Sala 05";
  depois da migration, **9** turmas passam de `Laboratório de informática` a `Laboratório de
  Informática`, com a substituição escrita na migration, **0** valores ficam sem correspondência e as
  **2** vazias continuam vazias. Gravar sala fora da lista é recusado pelo banco em **100%** das
  tentativas; sala vazia é aceita em **100%**. **Zero** ocorrências de `'Moodle'` como texto em código
  de regra; marcar outro valor como ambiente virtual muda o resultado **sem** deploy.
- **SC-014.3**: A tela de salas oferece **exatamente 4** ações — listar, acrescentar, desativar,
  reativar —, com **zero** caminhos para renomear ou apagar. Acrescentar sem escolher física ou virtual
  é impossível em **100%** das tentativas, e **8 de 8** salas do inventário têm o atributo explícito.
  Desativar `Sala 04` lista as **5** turmas e prossegue; depois disso, editar qualquer dessas 5 turmas
  é aceito em **100%** das tentativas, e `Sala 04` **não** aparece no seletor de turma nova. Admin e
  Encarregado da Divisão escrevem; o Ajudante e os demais perfis são recusados pelo banco.
- **SC-014.4**: Sala **sem** a chave `ambiente_virtual`, com a chave **nula** e com valor **não
  booleano** é recusada pelo banco em **3 de 3** casos, **por qualquer caminho** (`FR-029.7`); e a carga do
  ETL termina com as **9** turmas em `Laboratório de Informática` e **9** eventos `corrigido` em
  `migracao_log` (`FR-029.8`).

---

## Pontos em aberto para o `/speckit-clarify` — enumerados

**Os fechados em 16/09/2026 estão riscados, com a decisão e o requisito que a aplica; os demais
continuam sem resposta.** Cada um traz o que os documentos e o código real dizem — inclusive quando
dizem coisas diferentes — para que a pergunta seja feita com o contexto na mão.

### A. Aba "Sobre o Curso"

- ~~**Q-01 — O que exatamente vai na aba "Sobre o Curso"?**~~ ✅ **Fechada em 16/09/2026 —
  catálogo, grade curricular e avaliações previstas com caráter e fórmula como texto; UEs quando
  carregadas** (`FR-007` a `FR-007.2`).
- ~~**Q-02 — Quais abas a página do curso tem, e qual é a padrão?**~~ e ~~**Q-03 — O que da
  listagem de disciplinas com progresso entra nesta fatia?**~~ ✅ **Fechadas em 16/09/2026 — duas
  abas, "Grade" (padrão) e "Sobre o Curso"; quadro de avisos acima delas; progresso por disciplina
  entra, e é a única linha de corte** (`FR-006.2`, `FR-006.3`, `FR-009`, `FR-009.1`, `FR-010.1`).
- ~~**Q-04 — Avaliações e Relatório na página do curso (`RF-CURSO-02`)**: aparecem como
  indisponíveis e anunciados (molde da MENU-2) ou não aparecem até os Épicos 8 e 10?~~ ✅ **Fechada em
  17/09/2026 (A-4) — não aparecem** (`FR-008`).

### B. Regime e histórico imutável

- ~~**Q-05 — O cadastro de curso pede o regime junto, ou em passo próprio?**~~ ✅ **Fechada em
  17/09/2026 (B-15, opção C) — junto, por função no banco, e o banco recusa curso sem regime**
  (`FR-019.5`).
- ~~**Q-06 — O que significa "histórico imutável com data de vigência", em termos de tela?**~~ ✅
  **Fechada em 16/09/2026 — vigência nova para qualquer mudança, imposta pelo banco, com a ação
  "Corrigir esta vigência" para a que não tem lançamento dependente** (`FR-020` a `FR-021.4`). Medido para
  decidir: `status_vigencia` tem `ativo` e `cancelado`; `registros_aula` guarda só o número do TA.
  O que a pessoa vê ao reabrir um DSA antigo é regra do Épico 6, já garantida pela `RN-2027-09`.
  **Sobram, e continuam abertos:**
  - ~~**Q-06.1** — O que é "já começou", para o banco recusar o cancelamento?~~ ✅ **Fechada em
    16/09/2026 — pelo fato, nas três tabelas nominais, com trava e mensagem** (`FR-021.2` a
    `FR-021.4`).
  - ~~**Q-06.3** — Atividade de escopo global conta para quais cursos?~~ ✅ **Fechada em 16/09/2026 —
    pela janela; turma sem datas não alcança; janela incompleta alcança com motivo; recusa nomeia
    atividade e turma, com teste dos três casos** (`FR-021.2`, `FR-021.5`, `FR-021.6`).
  - ~~**Q-06.2** — O **histórico de vigências** é exibido na página do curso?~~ ✅ **Fechada em
    17/09/2026 (A-5) — na edição do curso, ativas e canceladas; a página mostra só o vigente**
    (`FR-011`).
- ~~**Q-07 — A imutabilidade de `RF-HOR-02` é imposta pelo banco nesta fatia?**~~ ✅ **Fechada em
  16/09/2026 — sim, e o código de turma também nasce no banco, na mesma migration** (`FR-020`,
  `FR-025.1`, `FR-046`).
  - ~~**Q-07.1** — A edição de turma reabre a D-5.~~ ✅ **Fechada em 16/09/2026 — o banco recusa a
    edição que colide, nos três caminhos, com a regra "mesmo rótulo, vazio igual"** (`FR-026`).
- ~~**Q-10 — Pares autorizados por currículo e "frequência incomum" do 9º TA**~~ ✅ **Fechada em
  17/09/2026 (B-16) — nenhum dado novo; o `FR-023` fica adiado por dado ausente, não cortado**
  (`FR-022`, `FR-023`, `PEND-5a-1`).
- ~~**Q-12 — Quem escreve regime?**~~ ✅ **Fechada em 16/09/2026 — Admin, Encarregado, Ajudante e
  Operador no seu escopo; o Operador também cria e edita turma no seu escopo; o documento 01 é
  emendado na parte de turma** (`FR-024`, `FR-028`, `FR-028.3`, `FR-044`).
- ~~**T-1**~~ — ✅ **fechada em 16/09/2026**: tudo na (a). Ver *Clarifications* e a seção *Tensão*.

### C. Classificações

- ~~**Q-08 — Quais são as classificações e o que muda entre elas?**~~ ✅ **Fechada em 16/09/2026 —
  as cinco do Glossário, na ordem do Glossário; `ead_semipresencial` recusada pelo banco; o limite
  de turmas por ano vem da classificação** (`FR-003` a `FR-003.2`). **Sobra, e continua aberto:**
  - ~~**Q-08.1** — O limite de turmas por ano deve ser fixo e inegociável?~~ ✅ **Fechada em
    17/09/2026 (B-13) — continua editável por curso** (`FR-003.2`).
- ~~**Q-09 — Mudar a classificação de um curso com histórico**~~ ✅ **Fechada em 17/09/2026 (B-14) —
  edição comum, sem reaplicar o limite, com confirmação que diz que o alcance dos Operadores muda**
  (`FR-016.1`).

### D. Alertas do curso

- ~~**Q-13 — Quais alertas um curso tem, nesta fatia?**~~ e ~~**Q-14 — Quadro de avisos de
  qualidade de cadastro**~~ ✅ **Fechadas em 16/09/2026 — quadro no curso (sem duração, sem
  propósito) e na turma (incoerência, sem janela, sem sala, sem efetivo fora de `planejada`), listas
  abertas; os três do `RF-CURSO-06` entram como tipos novos quando o dado chegar, sem região
  reservada** (`FR-010`, `FR-028.4`). O emblema *"parâmetros padrão"* do `RN-MAT-03` continua sem
  coluna de onde ler (D-8) e **não** entrou na lista.
- ~~**Q-15 — Indicadores e gráficos do catálogo**~~ ✅ **Fechada em 17/09/2026 (A-6) — os três do
  `RF-CURSOS-02` mais barras por classificação; paridade com a v2.0 vira pedido para fatia posterior**
  (`FR-002`, `PEND-5a-2`).
- ~~**Q-16 — Filtros do catálogo na URL**~~ ✅ **Fechada em 17/09/2026 (A-7) — classificação,
  modalidade e situação** (`FR-004`).

### E. Ciclo de vida da turma

- ~~**Q-22 — Qual é o ciclo de vida da turma?**~~ ✅ **Fechada em 16/09/2026 — manual e livre,
  com aviso de incoerência** (`FR-028` a `FR-028.2`). Respondidos: (i) e (ii) manuais, sem
  automação pela data; (iii) `cancelada` e `concluida` voltam, como qualquer status; (iv) quem pode
  editar turma — Admin, Encarregado, Ajudante e **Operador no seu escopo** (Q-12); (v) nesta fatia **nenhum** status
  trava nada; o que trava no lançamento de aula é do Épico 6; na pré-seleção o status só veta
  (`FR-006.1`), e no conteúdo do seletor é Q-27. **Sobram, e continuam abertos:**
  - ~~**Q-22.1** — a modalidade da turma é obrigatória ou herda do curso?~~ ✅ **Fechada em
    16/09/2026 — obrigatória pelo banco, sem padrão, e nunca herdada do curso** (`FR-027`).
  - ~~**Q-22.2** — "Arquivada" entra aqui?~~ ✅ **Fechada em 17/09/2026 (B-17) — não entra nesta
    fatia**; a TURMA-1 continua valendo para quando uma tela a consumir, e a restrição de nome do
    `FR-017.3` também.
  - ~~**Q-22.3** — no aviso de incoerência, hoje conta como passado?~~ ✅ **Fechada em 17/09/2026
    (A-11) — não; "anterior a hoje" é estrito** (`FR-028.1`).
- ~~**Q-23 — Sala e limite de turmas**~~ ✅ **Fechada** — limite em 16/09/2026 (`FR-030`); sala em
  16/09/2026: lista administrável do inventário informado, conferida pelo gatilho genérico, com
  ambiente virtual distinguido por dado e reconciliação antes do gatilho (`FR-029` a `FR-029.3`).
  **Sobram, e continuam abertos:**
  - ~~**Q-23.1** — Quem acrescenta uma sala, e por onde?~~ ✅ **Fechada em 16/09/2026 — tela mínima
    de salas em Administração, Admin e Encarregado, sem renomear nem apagar, física/virtual
    obrigatório, desativar sem invalidar turma** (`FR-029.2`, `FR-029.4` a `FR-029.6`).
  - ~~**Q-23.2** — Baixar o limite abaixo da contagem avisa ao salvar o curso?~~ ✅ **Fechada em
    17/09/2026 (A-12) — sim, por ano afetado** (`FR-030.1`).
- ~~**Q-24 — Onde a turma é cadastrada e o que nasce com ela?**~~ ✅ **Fechada em 16/09/2026** — o que nasce: as linhas de `turma_disciplina`, no banco, na mesma transação, só para disciplina
  ativa, com a herança do script da v2.0 (`FR-032` a `FR-032.4`). **Sobra, e continua aberto:**
  - ~~**Q-24.1** — Onde a turma é cadastrada?~~ ✅ **Fechada em 16/09/2026 — lista e criação sob o
    curso, ficha e edição em `/turmas/[turma]` com o código codificado por função única, no desenho
    do instrutor** (`FR-031` a `FR-031.7`).
- ~~**Q-25 — Janela real da turma × `janelas_curso`**~~ ✅ **Fechada em 17/09/2026 (B-18) — coisas
  distintas, previsto e realizado, sem sincronização** (`FR-025.3`).

### F. Cadastro de curso e transversais

- ~~**Q-11 — Desativar curso**~~ ✅ **Fechada em 16/09/2026 — desativam Admin, Encarregado e
  Ajudante, só sem turma `planejada` nem `ativa`; curso inativo é arquivado por situação, legível e
  alcançável no escopo, sem escrita nova; varredura de consumidores obrigatória** (`FR-017` a
  `FR-017.6`). **Sobra, e continua aberto:**
  - ~~**Q-11.1** — Quem reativa um curso inativo?~~ ✅ **Fechada em 16/09/2026 — os mesmos três,
    pela mesma ação, sem condição nem motivo; exceção cirúrgica no gatilho, por valor alterado**
    (`FR-017`, `FR-017.7`, `FR-017.8`).
- ~~**Q-17 — `responsaveis_curso` na página do curso**~~ ✅ **Fechada em 17/09/2026 (A-8) — fora
  desta fatia**, nem exibição nem cadastro; é do Épico 6, que imprime. Os testes negativos do `FR-044`
  sobre a tabela continuam.
- ~~**Q-18 — Confirmação antes de salvar**~~ ✅ **Fechada em 17/09/2026 (A-9) — só o que é difícil de
  desfazer, em lista fechada** (`FR-018.1`).
- ~~**Q-19 — Código do curso**~~ ✅ **Fechada em 17/09/2026 (B-12) — sigla digitada e editável, com
  confirmação que nomeia a consequência e registro em auditoria** (`FR-014.1`). **Sobra, e continua
  aberto:**
  - ~~**B-21 — Com que mecanismo a troca de sigla fica registrada em auditoria?**~~ ✅ **Fechada em
    17/09/2026 — tabela `curso_sigla_historico`, escrita só por gatilho, sem alteração nem exclusão**
    (`FR-014.1`); e a sigla dentro do código da turma **não** é reescrita (`FR-014.2`). **Sobra, e continua
    aberto:**
  - ~~**B-22 — A sigla que um curso deixou pode passar a outro curso?**~~ ✅ **Fechada em 17/09/2026 —
    não: o banco recusa, nomeando o curso e até quando; o próprio curso pode voltar a uma sigla sua**
    (`FR-014.3`).
- ~~**Q-20 — Campos obrigatórios do curso**~~ ✅ **Fechada em 16/09/2026 — modalidade sem padrão
  e duração em dias obrigatórias; limite pela classificação por gatilho que respeita valor
  explícito; o que tem aviso segue opcional** (`FR-003.2`, `FR-015`, `FR-015.1`).
- ~~**Q-21 — Código e rótulo da turma**~~ ✅ **Fechada em 16/09/2026 — gerado, `sigla [rótulo]
  ano`, rótulo opcional, código imutável** (`FR-025.1`). **Sobram, e continuam abertos:**
  - ~~**Q-21.1** — A primeira turma sem rótulo ganha `T1` quando nasce a segunda?~~ ✅ **Fechada em
    17/09/2026 (A-10) — nada automático; a segunda exige rótulo e avisa** (`FR-026.1`).
  - ~~**Q-21.2** — O rótulo é livre, `T<n>` ou lista?~~ ✅ **Fechada em 17/09/2026 (B-11) — vazio ou
    `T<n>`, imposto pelo banco** (`FR-025.2`).
  - ~~**Q-21.3** — Onde a geração mora~~ ✅ **no banco, por gatilho que lê a sigla do curso**
    (Q-07, 16/09/2026).

### G. Seletor de turma

- ~~**Q-26 — Formato do rótulo**~~ ✅ **Fechada em 17/09/2026 (A-13) — código e status** (`FR-034`).
- ~~**Q-27 — Ordem e conteúdo**~~ ✅ **Fechada em 17/09/2026 (A-14) — as quatro situações, por ano e
  início decrescentes** (`FR-035`).
- ~~**Q-28 — Regra de pré-seleção quando `?turma=` está ausente.**~~ ✅ **Fechada em 16/09/2026 —
  pela janela de datas, não pelo status** (`FR-006.1`). Das três versões que não coincidiam
  (`RF-CURSO-01`, v1.0 e v2.0), vale a leitura do `RF-CURSO-01` e do Tema J; a da v2.0 fica
  registrada como divergência (D-15).
- ~~**Q-29 — O seletor mostra turmas de outros cursos?**~~ ✅ **Fechada em 17/09/2026 (A-15) — um
  curso nesta fatia, sem impedir o uso global depois** (`FR-033.1`).

---

## Tensão entre o documento 42 e o documento 06 (T-1) — ✅ decidida em 16/09/2026

> **Decisão — 16/09/2026 · Bernardo Villas Boas: opção A, tudo na (a).** O documento 06 lista o
> regime na linha de Cursos; o `RF-CURSOS-03` é requisito do cadastro de curso; e
> `app.fn_regime_vigente` já permite provar a regra sem disciplina. O regime é atributo do curso, e
> o cadastro de curso é desta fatia — *"um formulário que não preenche o próprio campo está
> quebrado"*. **A fatia (b) apenas lê o regime vigente.** O documento 42 **não é alterado**; a
> divergência fica registrada em D-14.
>
> A análise abaixo permanece como foi escrita — é o registro de como a decisão foi tomada
> (Princípio IV).

O **documento 06**, tabela de escopo do Épico 5, põe *"regime de horário com data de vigência e
histórico imutável"* na linha de **Cursos**, e o critério de aceite **7** — *"Registrar mudança de
regime com data de vigência futura preserva o cálculo dos lançamentos anteriores àquela data"* —
entre os do épico.

O **documento 42**, no prompt da fatia (c), escreve: *"os itens 3, 4, 5 e **7** pertencem à fatia
**(b), disciplinas**"*.

Isto é, o **06 põe a vigência em (a)** e o **42 põe o critério que a prova em (b)**. Nenhuma das
duas leituras é absurda: a vigência é atributo do curso (06), mas o cálculo que ela preserva é o das
disciplinas por turma (42). **A consequência prática é grande**: com a T-1 em (a), a US6, os
`FR-019` a `FR-024`, o `SC-006` e as perguntas Q-05 a Q-12 ficam aqui; com a T-1 em (b), saem
inteiros e esta fatia entrega só a **leitura** do regime vigente (`FR-011`).

**Consequência da decisão:** a US6, os `FR-019` a `FR-024`, o `SC-006` e as perguntas Q-05 a
Q-12 **ficam nesta fatia**.

---

## O que esta fatia consome da `main` — e não reescreve

| Já existe | Onde | Como entra aqui |
|---|---|---|
| Tokens, tema, regra de cor bloqueante | Épico 4 (a), `app/globals.css` | `FR-045` |
| `TabelaDensa`, `CardKpi`, `BadgeStatus`, `BadgeTeto`, `AlertaConformidade`, `FiltroAvancado`, `EstadoVazio`, `DialogoConfirmacao`, `CampoObrigatorio`, `SeletorTurma`, `ListaNavegavel` | Épico 4 (b), `components/ciaara/` | `FR-048`; o seletor é o `FR-033` |
| `GraficoBarras`, `GraficoPizza`, `GraficoLinha`, `Moldura` | Épico 4 (b), `components/graficos/` | Q-15 |
| Contrato tipado de parâmetros, `lerParametros`, `useParametro`, degradação de link velho | Épico 4 (c), `lib/navegacao/` | `FR-004`, `FR-036`, `FR-037` — as rotas novas **entram no contrato**, não fora dele |
| Casca, menu, `entradaAtiva` por prefixo (`/cursos/C-Ap-HN` acende "Cursos") | Épico 4 (c), `components/casca/`, `lib/navegacao/menu.ts` | `FR-038` a `FR-040` |
| Tela Início com link `/cursos/<sigla>?turma=<codigo>` e três vazios distintos | Épico 4 (c), `app/(app)/inicio/` | O destino do link é esta fatia; o padrão de vazio é o `FR-047` |
| `vw_cursos_regime_vigente`, `vw_turmas_rotulo`, `vw_carga_horaria_turma`, `app.fn_regime_vigente`, `app.alcanca_curso/turma` | Épico 1 | Leitura; a `vw_turmas_rotulo` tem o defeito D-3 |
| Padrão de Server Action com `safeParse` primeiro, tradução de erro do banco, sem `service_role`; padrão de página com `Promise.all`; `error.tsx` + `loading.tsx` por segmento; quadro de avisos recolhível; exclusão lógica com porteiro | Épico 5 (c), `lib/acoes/instrutor.ts`, `app/(app)/instrutores/` | O **molde** desta fatia — o documento 42 manda seguir o mesmo |
| Sessão, perfil, `perfil_permissao` como dado, RLS com `app.pode()` | Épico 3 e Épico 1 | `FR-044`; o que falta no seed (D-1, `turmas.criar` do Operador) entra na migration do `FR-046` |

---

## Dependências

| Depende de | Estado em 16/09/2026 |
|---|---|
| Épico 1 — schema das cinco tabelas, RLS, views | ✅ na `main` |
| Épico 2 — 24 cursos, 28 turmas, 29 vigências, 2 responsáveis, 210 `turma_disciplina` | ✅ **no banco local**; ⚠️ **0 linhas no remoto** |
| Épico 3 — sessão e perfis | ✅ na `main` |
| Épico 4 (a)(b)(c) — tokens, componentes, gráficos, URL, casca | ✅ na `main` desde 11/09/2026 |
| Épico 5 (c) — o molde de cadastro | ✅ na `main` desde 16/09/2026 (PR #16) |
| Fatia (b) — disciplinas | ⬜ **Depende desta** (seletor de turma, `?turma=`, e o regime vigente, que ela **apenas lê** — T-1). Nada daqui depende dela, exceto o que Q-01 e Q-03 decidirem. **Recebe desta fatia** as linhas de `turma_disciplina` nascidas com a turma (`FR-032`), e **leva como ponto próprio** o efeito de mudança da grade sobre turma já existente (`FR-032.4`) |
| Decisão **T-1** | ✅ **16/09/2026 — tudo na (a)** |

---

## Fora de escopo

- **Disciplinas, cascata curso → turma → disciplina, rateio de CH, edição do período por turma e
  efeito de mudança da grade sobre turma existente** — fatia (b). Desta fatia é **só** o nascimento
  das linhas de `turma_disciplina` junto com a turma (`FR-032`).
- **Lançamento de aula, DSA e `/turmas/[turma]/dsa`** — Épico 6; a rota fica **reservada** e não é
  construída aqui (`FR-031.7`). **Listagem global de turmas** — não existe, por decisão (`FR-031.7`).
  Esta fatia entrega `/cursos/[curso]`, `/cursos/[curso]/turmas/nova`, `/turmas/[turma]` e o seletor
  que o Épico 6 reutiliza — e a **recusa, pelo banco, de lançamento
  em curso inativo** (`FR-017.5`), que os Épicos 6, 8 e 9 recebem pronta e MUST manter.
- **Cronograma, janelas de calendário, feriados, reservas do PROENS** — Épico 7 e `RF-DADOS-04`.
  `janelas_curso` **não** é lida nem escrita por esta fatia (Q-25, decidida em 17/09/2026, `FR-025.3`).
- **Avaliações e Relatório do curso** — Épicos 8 e 10. ~~A página só dá o **acesso** (`RF-CURSO-02`).~~
  **Nem o acesso aparece nesta fatia** (A-4, 17/09/2026, `FR-008`).
- **Progresso por disciplina na aba "Grade"** (`FR-009`, `RF-CURSO-03`) — ✂️ **cortado em 17/09/2026**
  pela linha de corte do `FR-009.1`, a única aplicada.
- **Alerta do 9º TA** (`FR-023`) e **registro dos pares autorizados por currículo** (`FR-022`) — ⏸️
  **adiados por dado ausente, não cortados** (B-16, 17/09/2026; `PEND-5a-1`).
- **Paridade de indicadores com o catálogo da v2.0** — total de cursos, turmas ativas e os indicadores
  de turma — **pedido separado para fatia posterior** (A-6, 17/09/2026; `PEND-5a-2`).
- **Assinaturas do DSA (`responsaveis_curso`)** — nem exibição nem cadastro; é do Épico 6 (A-8,
  17/09/2026). Os testes negativos do `FR-044` continuam.
- **Filtro "Arquivada" de turma** (TURMA-1) — não entra (B-17, 17/09/2026).
- **O `MAX+1` dos geradores de código da fatia (c)** — PR próprio depois do PR de banco desta fatia,
  pendência **T132** da spec 006 (B-6, 17/09/2026).
- **Tetos AEC/TAD/TR e Estudo Individual** na página do curso — Épico 9.
- **Impressão e rotas `/print/*`** — nenhuma nesta fatia.
- **Reserva, agenda ou manutenção de sala** — `RF-CRONOS-10`, `RNF-NORM-06`. Sala é **domínio de
  lista** para planejamento (`FR-029`), **não** entidade nem recurso reservável.
- **Tela genérica de `config_listas` e `/admin/parametros`** — a fatia entrega **só** a tela de salas
  (`FR-029.2`). **Renomear e apagar sala** também ficam fora (`FR-029.5`, regra 4).
- **Carga das 572 UEs** — pendência herdada do Épico 2, não deste. **A aba "Sobre o Curso" as
  recebe sem refazer nada** (`FR-007.2`).
- **Alteração de qualquer `RN-`**. Porte preserva comportamento; divergência é listada abaixo.
- ~~**Mais de uma migration** — a fatia tem **uma**, com o conteúdo listado no `FR-046` (`SC-011`).~~
  **Emenda de 17/09/2026 (B-1): a fatia tem sete migrations** (`FR-046`, `SC-011`), em dois PRs
  (`FR-046.1`). `drop` e policy de `DELETE` continuam fora; tabela nova, **só** a `curso_sigla_historico`
  (B-21, `FR-014.1`).

---

## Divergências encontradas e regras que pareceram estranhas — listadas, não corrigidas

Conforme a regra 1 do `CLAUDE.md`. Cada uma foi **medida**; nenhuma foi consertada.

- **D-1 — O seed de `perfil_permissao` não tem o recurso `horarios`** que o documento 01 §2.5
  declara (`LCED` para Admin/E11/A11, `LCE` para Operador). As policies de `curso_regime_historico`
  usam `cursos.editar`. Efeito: **Operador não escreve regime**, contra o `RF-HOR-10`.
  **Decidido em 16/09/2026 (Q-12): o seed se corrige** — recurso `horarios` e policies de escrita
  sobre ele, na migration desta fatia (`FR-024`).
- **D-2 — O seed não tem a ação `desativar`** para `cursos` nem `turmas`, que a matriz marca com
  `D` para três perfis. Efeito: inativar curso hoje passa por `editar`, sem distinção de permissão.
  E **`operador` tem `turmas.editar`** no seed, enquanto a matriz do documento 01 lhe dá só `L` em
  turmas. **Decidido em 16/09/2026 (Q-12), quanto ao Operador: o seed está certo e o documento 01 se
  emenda** — e o Operador ganha também `turmas.criar` (`FR-028.3`). **A ausência da ação
  `desativar` fecha em 16/09/2026 (Q-11)**: o seed a ganha para os três perfis (`FR-017`).
- **D-3 — `vw_turmas_rotulo` devolve `NULL` em 18 de 28 turmas**: `rotulo_completo` e
  `nome_completo_curso` concatenam `t.turma`, nulo na maioria. A view existe desde o Épico 1 e
  nunca teve consumidor. Um seletor que a use mostra 18 opções em branco.
- **D-4 — A imutabilidade do `RF-HOR-02` não está imposta no banco.** O requisito diz *"policy RLS
  de UPDATE sobre as colunas curriculares e trigger de recusa"*; a policy de `UPDATE` de
  `curso_regime_historico` não distingue coluna e não há gatilho. **Decidido em 16/09/2026 (Q-07):
  fecha na migration desta fatia** (`FR-020`).
- **D-5 — `turmas_unica_por_ano` não recusa duas turmas sem rótulo** no mesmo curso e ano,
  porque `NULL ≠ NULL` no `UNIQUE`. Com 18 turmas sem rótulo, a unicidade que o documento 05 declara
  (`curso_id + turma + ano_letivo`) só vale para as 10 rotuladas. **Atualização de 16/09/2026:**
  com o `codigo` gerado **no banco** (`FR-025.1`, Q-07), a unicidade do código cobre as sem rótulo
  **na criação**, como garantia do motor. **Fechada por inteiro em 16/09/2026 (Q-07.1):** a
  unicidade passa a tratar o rótulo vazio como igual, na criação e na edição, nos três caminhos
  (`FR-026`).
- **D-6 — O documento 24 §1 exemplifica `/cursos/CUR-000004` e `/turmas/TUR-000012`**; a base
  não tem `CUR-` nem `TUR-`: `cursos.codigo` é a sigla e `turmas.codigo` é `"C-Ap-FR 2026"`. O
  `CLAUDE.md` também cita `CUR-000001` na convenção de `codigo`. Exemplos vencidos, não regra.
- **D-7 — A documentação conta 29 turmas; o banco tem 28.** A planilha bruta tem 29 linhas e só
  28 com `ID_Turma`. O ETL fez o certo; os documentos 00, 05 e 30 repetem o 29.
- **D-8 — `RN-MAT-03` prevê a coluna `usou_valor_reserva boolean` em cursos** e o `AlertaConformidade`
  exibindo-a; **a coluna não existe** em `cursos` nem em `curso_regime_historico`. A v1.0 mostrava
  o emblema *"parâmetros padrão"*. Sem a coluna, o alerta não tem de onde ler.
- **D-9 — Duas listas de classificação discordam do `ENUM`**: `config_listas.escopo_curso` tem 5
  valores (sem `Especial`, sem `Aperfeicoamento_Avancado`); o `ENUM` tem 7; os cursos usam 5, e
  não os mesmos 5. O achado 1 do Épico 2 corrigiu o `ENUM` e não a lista. Com a Q-08 (16/09/2026),
  as classificações de curso são as cinco do Glossário; a lista de `config_listas` continua
  divergente e **não é corrigida aqui**.
- **D-10 — O documento 25 §1.3 anota `aba` com padrão `"grade"`** e `turma` como *texto*; o
  `RF-CURSO-04` fala de `?aba=sobre`; e o contrato do Épico 4 (c) já provou que anotar como
  *texto* esconde domínio (achado 2 da fatia (c)). `aba` e `turma` são **escolha**, e a lista de
  abas é Q-02. **Resolvido em 16/09/2026:** `aba` é escolha entre `grade` (padrão, como o documento 25
  anotava) e `sobre` (`FR-006.2`).
- **D-11 — A modalidade `ead` × os "4 EAD puros"**: `cursos.modalidade = 'ead'` em **3** cursos,
  mas **4** vigências têm `regime_tempos = 0` — o `C-ApA-PCN-PR-EAD` está como `semipresencial` em
  `cursos` e sem TA no regime. Não se sabe qual dos dois está certo. **Nota de 16/09/2026 (Q-22.1):**
  as duas turmas dele estão `ead`, e isso **não** é erro a igualar — a modalidade da turma é dela, não
  do curso (`FR-027`).
- **D-12 — O `RF-CURSOS-01` lista os parâmetros de regime como parte do "cadastro de cursos"**, e o
  documento 05 os tirou de `cursos`. Os dois estão certos no seu nível; a tela precisa decidir
  (Q-05). **Decidido em 17/09/2026:** o cadastro de curso pede o regime no mesmo passo, e o banco recusa
  curso sem regime (`FR-019.5`).
- **D-13 — `RN-CRUD-03` (prefixo por entidade) × siglas e códigos compostos.** Curso usa a sigla
  institucional; turma usa `curso + rótulo + ano`; `responsaveis_curso` usa `RSP-`; instrutor,
  inteiro simples. A "geração automática de identificador" do documento 06 não tem uma regra só.
- **D-14 — O documento 42 atribui o critério de aceite 7 do Épico 5 à fatia (b); esta spec o põe
  na (a).** No prompt da fatia (c), o 42 escreve *"os itens 3, 4, 5 e 7 pertencem à fatia (b),
  disciplinas"*. Decidido em 16/09/2026 (T-1) que o 7 é desta fatia: o documento 06 lista o regime
  na linha de Cursos, o `RF-CURSOS-03` é requisito do cadastro de curso, e `app.fn_regime_vigente`
  prova a regra sem disciplina. **O documento 42 não foi alterado**; emendá-lo é decisão à parte.
  *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **D-15 — A v2.0 pré-seleciona turma pelo status; esta spec, pela janela.**
  `resolverTurmaEmDestaque_` (`SIS11/CIAARA-11-v2/src/backend/Bootstrap.gs`, linhas 139–150) exige
  `Status = Ativa` **e** a janela contendo hoje, e devolve nenhuma se não houver. Decidido em
  16/09/2026 (Q-28) que a v2.1 decide **pela janela**, com o status só como veto de `concluida` e
  `cancelada`: o status é manual e livre (Q-22) e está incoerente em 11 das 28 turmas, e a regra por
  janela está mais próxima do `RF-CURSO-01` escrito e do Tema J do documento 08. Medido: a regra da
  v2.0 pré-selecionaria 0 dos 4 cursos com seletor; a decidida, 3. **A v2.0 não foi alterada** — é
  a produção até o corte.
  *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **D-16 — O `RF-HOR-01/02` chama horário de início e intervalos de "editáveis"; esta spec não
  permite editá-los.** Decidido em 16/09/2026 (Q-06) que *editáveis* se lê como **alteráveis pelo
  Encarregado por vigência nova**, em contraste com TA e duração, que decorrem do currículo — e não
  como autorização para `UPDATE` da linha. Motivo: a `RN-2027-09` (Risco Alto, documento 04) lista
  nominalmente horário de início e intervalos entre as mudanças que exigem data de vigência, e o
  DSA recalcula o horário a partir do regime da data. O `RF-HOR-02` também descreve a proteção como
  *"policy RLS de UPDATE sobre as colunas curriculares"* — só as curriculares —, e esta spec a
  estende a todos os parâmetros. **O documento 02 não foi alterado.**
  *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **D-17 — A palavra "Fim" sumiu de 6 nomes de disciplina e de 5 textos de avaliação prevista na
  base da v2.0.** Medido em 16/09/2026: `CAHO` e `C-Ap-HN` têm `LEVANTAMENTO HIDROGRÁFICO DE  DE
  CURSO.`; `C-Ap-FR`, `PRÁTICA DE  DE CURSO EM MANUTENÇÃO DE AUXÍLIOS À NAVEGAÇÃO.`; `C-Espc-FR`,
  `MANUTENÇÃO DE AUXÍLIOS À NAVEGAÇÃO DE  DE CURSO.`; `C-ApA-OcOp-PR-SP`, `TRABALHO DE  DE CURSO.`;
  `C-ApA-PCN-PR-EAD`, `PROJETO DE  DE CURSO.` — o espaço duplo marca o lugar. Em
  `avaliacoes_planejadas`, 4 nomes de disciplina e 1 descrição de instrumentos têm o mesmo defeito.
  **A origem é a planilha da v2.0, não o ETL:** `scripts/etl/dados/bruto/v20/Cad_Disciplinas.csv`
  já traz `DE  DE CURSO` 6 vezes e `fim de curso` **nenhuma**; os currículos da DEnsM e as
  planilhas da v1.0 (`bruto/ue_v1/`) trazem "fim de curso". O ETL foi fiel à origem, como Bernardo
  ratificou em 08/09/2026.
  ⚠️ **Efeito fora desta fatia, e é de Risco Alto:** a `RN-DIST-03` identifica disciplina de fim de
  curso **pelo nome** (*"LHFC" ou qualquer nome contendo "fim de curso"*) para isentá-la de teto
  semanal, e hoje **zero** das 174 disciplinas ativas casam com esse critério. As seis estão também
  em modo de atribuição `dividido`, enquanto a `RN-MAT-05` nomeia *"Prática de Fim de Curso,
  Levantamento Hidrográfico de Fim de Curso"* como modo simultâneo. Nesta fatia o efeito é só
  visual — a aba "Sobre o Curso" exibe os nomes como estão. **Não corrigido aqui**: é saneamento de
  dado com decisão própria, e atinge o motor preditivo do Épico 7 e a fatia (b).
- **D-18 — A v2.0 ordena as classificações de outro jeito — e de dois jeitos.** O Glossário
  (documento 07) e a v1.0 (`LISTAS_VALIDACAO.classificacaoCurso`, `SIS11/Versão 1.0/Código.gs`)
  usam *Regular · Expedito · Especial · Aperfeiçoamento Avançado · Estágio de Qualificação*. A v2.0
  usa *Regular · Especial · Expedito · Estágio de Qualificação · Aperfeiçoamento Avançado* na página
  do curso (`ViewCurso.html`, `CLASSIFICACOES_ORDEM_CURSO`) e *Regular · Especial · Expedito ·
  Aperfeiçoamento Avançado · …* na tela Início (`ViewInicio.html`). Decidido em 16/09/2026 (Q-08)
  que vale a ordem do Glossário: *"é a v2.0 que diverge das duas fontes normativas sem registro"*.
  **A v2.0 não foi alterada.** *(decisão de Bernardo Villas Boas, 16/09/2026)*
- **D-19 — O filtro de classificação do Início oferece valores que nenhum curso pode ter.**
  `lib/navegacao/contrato.ts` exporta `CLASSIFICACOES` como o tipo `escopo_curso` inteiro (sete
  valores, com `geral` e `ead_semipresencial`), na ordem do tipo, e `FiltroDoPanorama` o usa. O
  critério registrado lá — *"o filtro não pode recusar um valor que a coluna aceita"* — deixa de
  valer para `ead_semipresencial` quando o `FR-003.1` entrar, e a ordem não é a do `FR-003`.
  **Não alterado nesta spec**: o Início é entrega do Épico 4 (c), e mudar o filtro dele é decisão à
  parte — o plano decide se as rotas `/cursos` usam lista própria ou se a constante compartilhada
  muda.
- **D-20 — O prefixo `REG-` identifica duas coisas diferentes.** `curso_regime_historico.codigo` é
  `REG-NNNNNN` (6 dígitos, `REG-000001` a `REG-000029`) e `registros_aula.codigo` é `REG-NNNN` (4 dígitos,
  `REG-0176` a `REG-1929`) — como também `arquivo_avaliacoes_v1` (`REG-1498` a `REG-1931`), que vem da
  mesma sequência de registros da v2.0. **A coincidência é herdada da v2.0**: `ID_Regime` de
  `Cad_Cursos_Regime_Historico` e `ID_Registro` de `Registro_Aulas_E_Atividades` (documento 32). As
  `unique` são por tabela, e o banco não confunde. **Verificado em 17/09/2026 que os dois usos NÃO
  aparecem juntos** em lista, tela ou relatório: nenhuma view lê as duas tabelas; nenhum arquivo de
  `app/`, `lib/` ou `components/` escreve `REG-`; `migracao_log` só tem os de 4 dígitos (186 eventos de
  `_Arquivo_Avaliacoes_v1`); e a procedência do ETL leva o nome da aba junto do código. **Anotada, não
  corrigida** — basta, por decisão de Bernardo (B-9). **Se** uma tela futura juntar as duas, a exibição
  MUST desambiguar (`FR-019.3`). *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **D-21 — A imutabilidade do `migracao_log` não cobre `TRUNCATE`.** A regra 5 do `CLAUDE.md` dizia
  *"bloqueado por gatilho inclusive para `service_role`"*. **Medido em 17/09/2026:** o gatilho
  `trg_migracao_log_imutavel` é `BEFORE DELETE OR UPDATE … FOR EACH STATEMENT`, e a `service_role` e o
  `postgres` têm o privilégio de `TRUNCATE` na tabela — o `authenticated` não tem desde o Épico 1. **Provado**
  numa tabela descartável com o mesmo gatilho, desfeita em seguida: `DELETE` recusado, `TRUNCATE` esvaziou as
  três linhas. Achado ao desenhar a proteção de `curso_sigla_historico` (`FR-014.1`), que nasce **também** com
  `BEFORE TRUNCATE`. **Anotado, não corrigido**: a regra 5 do `CLAUDE.md` ganhou a nota da lacuna, datada e com
  a pendência **`PEND-5a-3`**; nem a regra nem o comportamento mudaram. A constituição (Princípio IV) promete
  só que o gatilho impede **`UPDATE`** inclusive para a `service_role` — o que é verdade — e não foi tocada.
  *(decisão de Bernardo Villas Boas, 17/09/2026)*

---

## Assumptions

1. **Nenhuma tabela é criada, e o banco muda por uma migration só.** As cinco tabelas, as views e
   as funções do Épico 1 são consumidas como estão, com **uma** migration cujo conteúdo, decidido
   em 16/09/2026, está listado no `FR-046`. Outra mudança de banco emenda esta premissa com data.
   **Emenda de 17/09/2026 (B-1, B-21):** **sete** migrations, com o conteúdo do `FR-046` emendado; **uma**
   tabela nova, a `curso_sigla_historico`, e nenhuma outra.
2. **A RLS do Épico 1 governa quem vê o quê**, e o seed de `perfil_permissao` é dado. As linhas
   novas do Operador (Q-12) são dado; **trocar a permissão que as policies de
   `curso_regime_historico` citam é DDL** — por isso as duas coisas vão na migration do `FR-046`.
   A ação `desativar` (D-2) entra no seed pela mesma migration (`FR-017`, Q-11).
3. **Nenhuma regra `RN-` é alterada.** Porte preserva comportamento; o que pareceu errado está
   listado.
4. **O dado do banco local é o dado real da v2.0 em 15/09/2026** (ETL do Épico 2). A base viva
   continua sendo escrita todo dia; os números desta spec são de **16/09/2026**.
5. **O remoto está vazio e continua vazio** até a carga real do Épico 2 no projeto de produção, que
   **não existe ainda**. Nada desta fatia carrega dado no remoto.
6. **Os identificadores na URL são `codigo`**, nunca `uuid` — para curso é a sigla; para turma,
   `sigla [rótulo] ano` (`FR-025.1`), exatamente o que o Início já escreve.
7. **O molde é a fatia (c)**: página servidor, folhas de cliente contadas, Server Action com
   `safeParse` primeiro, quadro de avisos recolhível, exclusão lógica. O documento 42 manda que
   *"as fatias (a) e (b) seguem o mesmo molde"*.
8. **Desempenho: medido, sem requisito** — mesma decisão da (c) (CHK022). A base tem 24 cursos e
   28 turmas; nada aqui precisa de otimização antes de existir.
9. **A T-1 está decidida (16/09/2026): a US6 é desta fatia**, e a (b) só lê o regime vigente.
10. **Se a fatia crescer além da (c), o corte já está escolhido** (`FR-009.1`): sai o progresso por
    disciplina, e nada mais.
