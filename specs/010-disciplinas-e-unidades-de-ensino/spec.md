# Feature Specification: Disciplinas e Unidades de Ensino — Épico 5, fatia (b)

**Feature Branch**: `feat/EPICO-5b-disciplinas-e-unidades-de-ensino`

**Created**: 24/09/2026

**Status**: Draft — specify concluído em 24/09/2026; **clarify rodado em lote em 24/09/2026** (Q-01 a
Q-17 decididas por Bernardo Villas Boas — ver *Clarifications*); **plan NÃO rodado**

**Input**: `/speckit.specify Épico 5 da v2.1 — Cadastros. FATIA (b): DISCIPLINAS E UNIDADES DE ENSINO.`
(pedido de 24/09/2026, com as decisões D-B1 a D-B4, a análise obrigatória dos currículos e a lista de
leitura; reproduzido nas seções pertinentes, não parafraseado de memória)

---

## Contexto de ramo — leia antes de qualquer coisa

**Este ramo nasceu da `main` em `406b566`**, que **já contém o PR 2 da fatia (a)** (`#18`, mesclado por
squash em 24/09/2026). Tudo o que a spec anterior citava "pelo nome, a mesclar depois" **está na `main`**
e é reaproveitado sem rebase: `components/ciaara/seletor-turma.tsx`, `lib/navegacao/endereco-de-turma.ts`,
`lib/dominio/confirmacao-de-gravacao.ts`, `components/ciaara/botao-limpar-filtros.tsx`,
`components/ciaara/dialogo-confirmacao.tsx`, `lib/acoes/traducao-de-recusas.ts`, as rotas `/cursos`,
`/cursos/novo`, `/cursos/[curso]` (abas *Grade* e *Sobre*), `/cursos/[curso]/editar`,
`/cursos/[curso]/turmas/nova`, `/turmas/[turma]` e `/admin/salas`.

### O que foi reaproveitado e o que foi descartado do specify preliminar (`ddf5909`)

O ramo `feat/EPICO-5b-disciplinas-e-atribuicao` (commit `ddf5909`, `specs/010-disciplinas-e-atribuicao/`)
foi **só consulta**, como pedido. **Não é base deste ramo** e **não foi apagado**.

| Item de `ddf5909` | Destino aqui |
|---|---|
| As 5 histórias (cascata, CRUD, período/instrutor por turma, rateio, quadro) | **reaproveitadas** como US1–US5, reescritas com o que a `main` já tem |
| FR-001 a FR-025 | **reaproveitados** em substância; renumerados porque entram os blocos de exclusão (D-B1) e de UE (D-B3/D-B4), que não existiam |
| Achado A-1 (0 de 175 em `simultaneo`; 6 nomes sem "FIM") | **reaproveitado** — remedido hoje, igual (A-1 abaixo) |
| Achado A-2 (*"a unicidade `(curso_id, cod_disciplina)` não existe"*) | **descartado como vencido**: medido hoje, existe o índice parcial `uq_disciplinas_curso_cod_ativo` **e** o gatilho `trg_disciplinas_unicidade`, ambos só entre **ativas** — o que muda a pergunta (Q-04) |
| Achado A-3 (`RN-MAT-02`: 0 duplicatas em `C-Ap-FR`) e A-4 (CH rateada 0 de 210) | **reaproveitados**, remedidos |
| D-1 (critério 7 → fatia (a)) e D-2 (`RF-MATERIAS-05` "da disciplina" × por turma) | **reaproveitadas** (D-1, D-2 abaixo) |
| Q-01 a Q-08 | **reaproveitadas e reordenadas** no lote final; Q-01 (duplicata `ALH-II`) muda de natureza porque a duplicata é `ativo` × `inativo` e a unicidade já vale |
| "Contexto de ramo: rebasear depois do PR 2" | **descartado** — o PR 2 já está na `main` |
| Tudo sobre **Unidades de Ensino** | **não existia** lá; é novo aqui |

---

## Decisões de Bernardo Villas Boas registradas nesta spec (24/09/2026)

> **D-B1 — Padrão de CRUD desta fatia.** Todo cadastro desta fatia tem **desativar**, **reativar** e
> **excluir permanentemente**. Excluir exige **confirmação e alerta**. Exclusão permanente só é
> permitida para registro **sem histórico e sem dependente**; a recusa por `ON DELETE RESTRICT` chega à
> tela como *"este registro tem histórico — desative em vez de excluir"*. Toda exclusão deixa **rastro
> de quem, o quê e quando**. A spec **MUST dizer como o `DELETE` chega ao banco** — policy ou RPC — e
> **sob qual permissão**. **Vale só para `disciplinas` e `unidades_ensino`**; estender a cursos, turmas,
> instrutores e salas é **pendência** (`PEND-5b-1`), não escopo.

> **D-B2 — Cadastrar e editar disciplinas por curso é o centro do escopo.**

> **D-B3 — Nem todo curso tem UE.** Os que têm **MUST** editar e criar UEs; os que não têm **MUST**
> funcionar inteiros sem UE e **sem aviso enganoso**.

> **D-B4 — Toda UE vem do currículo oficial**, por análise do arquivo — **nunca por digitação de
> inferência nem por dedução**.

Estas quatro **não são reinterpretadas** aqui. Onde uma delas encontra uma regra do documento 04 ou
um dado do banco que parece contrariá-la, a tensão está **listada ao final** ("Regras que pareceram
erradas"), não resolvida.

---

## Clarifications

### Session 2026-09-24

*(Respostas em lote de **Bernardo Villas Boas**, 24/09/2026, às 17 perguntas do specify. Cada uma está
propagada ao requisito que a citava; as medições pedidas estão ao lado da resposta, com artefato.)*

- Q: Q-01 — o que fazer com `turma_disciplina.instrutor_id`, `ch_prevista_por_instrutor` e
  `disciplinas.instrutores_atribuidos`? → A: **Aposentar os três.** A fonte da verdade da atribuição
  por turma é **`turma_disciplina_instrutor`**. Antes de aposentar, **provar** que os 79 valores de
  `instrutor_id` já estão na junção, sem perder nenhum; depois a coluna para de ser escrita. **Nenhum
  quinto lugar.** *Medido em 24/09/2026 (retrato `remoto-20260924-153818.sql`):* dos **79**
  `turma_disciplina.instrutor_id` preenchidos, **79** têm linha **ativa** na junção com o **mesmo**
  instrutor; `ch_prevista_por_instrutor` preenchida em **0**; `instrutores_atribuidos` preenchido em
  **0 de 175**. **Não há nada a migrar** — a prova vira asserção pgTAP antes da migration que aposenta
  (`FR-032`, `FR-032.1`).
- Q: Q-02 — quais disciplinas em modo simultâneo, e o que é `herdar`? → A: **Começam como simultâneo as
  três da `RN-MAT-05`** — Prática de Fim de Curso, LHFC e Prática de Manutenção de Auxílios à
  Navegação —, identificadas no banco **pelo nome atual**; as demais Bernardo marca **pela tela** (o
  modo é campo editável da disciplina). **`herdar` = usar o modo padrão da disciplina, sem outro
  significado.** *Medido em 24/09/2026, `disciplinas.nome_disciplina` com `DE CURSO`, `LHFC` ou
  `PRÁTICA`+`MANUTEN`:* **casam 3 linhas** — `53 - C-Ap-FR - XIII` *PRÁTICA DE  DE CURSO EM MANUTENÇÃO
  DE AUXÍLIOS À NAVEGAÇÃO* (casa as duas práticas de uma vez), `41 - C-Ap-HN - XVIII` e
  `20 - CAHO - XVIII` *LEVANTAMENTO HIDROGRÁFICO DE  DE CURSO* (LHFC). **Não casam** por nome, ficam
  para a tela: `82 - C-Espc-FR - MBFCFR-017` *MANUTENÇÃO DE AUXÍLIOS À NAVEGAÇÃO DE  DE CURSO* (sem a
  palavra "prática" — candidata provável), e os quatro trabalhos/projetos de conclusão
  (`C-ApA-AuxNav-PR-SP III`, `C-ApA-OcOp-PR-SP X`, `C-ApA-PCN-PR-EAD PCN-PR-VII-EAD`,
  `C-ApA-PrevMe-PR-EAD PrevMe VII`), que não são práticas. Todas as 8 estão hoje em `dividido`
  (`FR-040`).
- Q: Q-03 — resto do rateio e as 96 linhas com CH `NULL`? → A: **Resto para os mais antigos, pela ordem
  de antiguidade do sistema. `NULL` = dividir igualmente só na leitura, sem gravar** (`FR-042`,
  `FR-043`).
- Q: Q-04 — desativar libera o código? `ALH-II` fica? → A: **Sim — desativar libera o código, como o
  banco já faz. `ALH-II` fica** (`FR-011`, `FR-013`, D-5).
- Q: Q-05 — exceções da carga? → A: **Carga por UE, sem fundir linhas, com o tratamento que a spec
  propõe para cada exceção. Exceção sem tratamento claro fica FORA da carga como pendência nomeada, sem
  bloquear o resto. `EST-QF-APOC`: pendência — tentar OCR; se não for confiável, fica sem UE até
  transcrição** (`FR-063`, `FR-065`).
- Q: Q-06 — soma das UEs não fecha com a CH da disciplina? → A: **Aviso, nunca recusa. CH derivada fica
  como pergunta para o plano** (`FR-062`).
- Q: Q-07 — período fora da janela da turma? → A: **Recusa quando o período sai da janela de uma turma
  que tem janela (paridade v2.0, spec 029). Turma sem janela: aceita** (`FR-030.1`).
- Q: Q-08 — grade muda com turma existente? → A: **Disciplina acrescentada à grade nasce como
  `nao_informado` nas turmas não concluídas; disciplina desativada continua nas turmas onde já está**
  (`FR-070`).
- Q: Q-09 — onde mora o rastro de exclusão? → A: **Tabela nova, só de acréscimo** (`FR-024`).
- Q: Q-10 — quem edita período e instrutor por turma? → A: **`disciplinas.editar`, como está, operador
  incluído** (`FR-035`).
- Q: Q-11 — código de disciplina nova? → A: **`DIS-` por sequência em `app` — e a sequência MUST entrar
  na lista de `avancar_sequencias`, com teste, como as outras quatro** (`FR-012`).
- Q: Q-12 — 1 TA = 1 hora para carregar a CH do currículo? → A: **Sim** (`FR-064`, Assumptions).
- Q: Q-13 — renomear disciplinas para a grafia do currículo? → A: **Não renomear. Pendência**
  (`PEND-5b-2`).
- Q: Q-14 — concluída e atrasada derivam de quê? → A: **Da execução** (`FR-052`).
- Q: Q-15 — edição em linha ou painel? → A: **Painel** (`FR-003`).
- Q: Q-16 — aposentar a `RN-MAT-02`? → A: **Medir no banco: se não existe mais nenhuma duplicata do
  `C-Ap-FR`, a `RN-MAT-02` está aposentada (era transitória até o fim da migração); se existir, mantém.**
  *Medido em 24/09/2026, `disciplinas` × `cursos` onde `codigo = 'C-Ap-FR'`, qualquer status:* **0
  pares** de `cod_disciplina` repetido em **13** linhas, **0** inativas, **0** sem previsão de início.
  **Logo a `RN-MAT-02` está APOSENTADA** — emenda registrada no documento 04 (`.md`; o `.docx` não a
  recebe), item 3 de "Regras que pareceram erradas" fechado (A-3).
- Q: Q-17 — `RF-INSTR-06.1` nesta fatia? → A: **Não.**
- Q: A "leitura humana dos 15 PDFs sem Ofício no nome" — o que verifica, e o que acontece sem ela? → A:
  *(pedido de explicação, respondido com medição)* Ela verificaria **só o identificador do ato que
  aprovou o currículo** (o *"Of nº 10-6/2025, da DEnsM"*), para a coluna `fundamento_normativo` —
  **não versão nem conteúdo**: a decisão de 28/08/2026 já fixou os arquivos de `SIS11/Curriculos/` como
  fonte oficial. *Medido em 24/09/2026 no texto dos 24 PDFs (PyMuPDF):* o Ofício está **legível por
  máquina em 15** (os 9 do nome do arquivo + `c-ap-hn` `Of nº 10-6/2025`, `c-esp-alh` `10-16/2020`,
  `c-esp-me` `10-22/2025`, `c-esp-opap` `10-20/2025`, `c-exp-agmag` `10-24/2025`, `c-exp-bati`
  `10-17/2025`); **8 não trazem Ofício nenhum** e se identificam pela capa — *"CURRÍCULO … (sigla) —
  MARINHA DO BRASIL — DIRETORIA DE ENSINO DA MARINHA, 2011"* (`C-EXP-METOC-OF`, `C-EXP-OBS-ME`) ou
  *"… CENTRO DE INSTRUÇÃO E ADESTRAMENTO ALMIRANTE RADLER DE AQUINO, 2023/2024/2025/2026"* (os 6
  estágios); **1** é ilegível (`EST-QF-APOC`). **Conclusão: a leitura humana é DISPENSADA** — o
  extrator captura o Ofício onde ele existe e a capa (órgão + ano) onde não existe (`FR-064`). O que
  fica é a pergunta **N-1** sobre o formato do fundamento nos 8 sem Ofício.
- Q: A emenda nominal da regra 4 do `CLAUDE.md` (exclusão por RPC para disciplina e UE)? → A:
  **Aprovada — é consequência da D-B1.** Aplicada em 24/09/2026 no `CLAUDE.md`, com data e autoria
  (`FR-020`).
- Q: A divisão em 3 PRs (banco → carga das UEs → telas)? → A: **Aprovada.**

### Session 2026-09-25

*(Respostas de **Bernardo Villas Boas**, 25/09/2026, ao lote do plan.)*

- Q: P-1 — as 9 CH de disciplina divergentes do currículo, confirmadas com página? → A: **(a) nenhuma CH
  é corrigida por script.** As divergências ficam com o **aviso da Q-06**, e Bernardo as corrige **pela
  tela do PR 3, com rastro** (`FR-010`, `FR-062`, `FR-064`).
- Q: P-2 — qual currículo vale para o `C-Exp-MetocOf`? → A: **`C-Exp-MetocOf` (presencial) e
  `C-Exp-Metoc-OF-SP` (semipresencial) são DOIS CURSOS DIFERENTES, cada um com o seu currículo** — o
  presencial com o de **2011**, o semipresencial com o **SP de 2025**, que tem CH levemente diferente
  **por ser semipresencial**. **O pareamento é sempre curso ↔ o próprio currículo, nunca cruzado.** O
  `C-Exp-MetocOf` carrega as **27 UEs** do currículo de 2011. As CH do presencial no banco que
  coincidem com as do SP são divergências tratadas pela **P-1** (aviso na tela, correção de Bernardo),
  com a observação **"provavelmente copiadas do SP"** (`FR-064`, `FR-065`).
- Q: P-3 — quem lê `exclusoes_registradas`? → A: **(a) quem tem `auditoria.ler`** (`FR-024`).
- Q: P-4 — as 5 UEs do `EST-QF-APOC` transcritas de imagem? → A: **(a) entram nesta carga**,
  registradas no curso e marcadas **"transcrito de imagem"**, com a asserção de soma **excluindo o
  APOC nominalmente** (`FR-063`, `FR-065`).
- Q: N-3 — a tabela de destino por UE das disciplinas desdobradas? → A: **confirmada pela conferência
  (§4.2, com página) — aceita** (`FR-065`).

*(Respostas ao lote do `/speckit-analyze`, mesmo dia.)*

- Q: A-1 — a parcela do rateio é digitável, contra o critério 9 (*"CH do instrutor nunca é campo
  digitável"*)? → A: **A parcela da disciplina entre os instrutores É digitável.** O critério 9 e o
  `RF-INSTR-13` continuam valendo para a **CH TOTAL do instrutor**, que segue **sempre calculada a
  partir das parcelas**. Por turma são **cinco casos** (`FR-041.1` a `FR-041.5`): **1.** um instrutor
  só → CH integral e todas as UEs; **2.** simultâneo → cada um recebe a CH integral; **3.** dividido
  **sem definição** (padrão) → divisão igual em **TA inteiros**, resto aos mais antigos pela
  antiguidade do sistema (Q-03); **4.** dividido **por TA** → o usuário digita TA inteiros por
  instrutor e **o banco recusa** se a soma diferir da CH da disciplina; **5.** dividido **por UE** → o
  usuário atribui UEs a instrutores e a CH de cada um é a **soma da CH das suas UEs pelo currículo**,
  com **cada UE em exatamente um instrutor e todas atribuídas**, só para disciplina que tem UE.
  **Parcela sempre inteira.** Exige **tabela nova** para a atribuição UE → instrutor por turma, no
  PR 1. A CH prevista do instrutor (`vw_instrutor_carga_prevista` e quem lê dela) passa a vir dessas
  parcelas; **a função pura de `lib/dominio/` é a referência e a view é testada contra ela**.
  *Medido em 25/09/2026, antes de escrever a regra:* `turma_disciplina_instrutor.ch_prevista_tempos`
  é `numeric(6,2)` e tem **0 de 96** preenchidas — **nenhum valor fracionário a relatar**; e
  `turma_disciplina.ch_prevista_por_instrutor`, **0** preenchidas.
- Q: A-2 — o gatilho de nascimento colide com a ordem do ETL e com 4 amostras? → A: **(b) sem gatilho
  de nascimento.** Uma **RPC `criar_disciplina`** insere a disciplina **e** as linhas de
  `turma_disciplina` das turmas `planejada`/`ativa` **numa transação**, no molde de
  `criar_curso_com_regime`. **ETL e amostras não mudam** (`FR-070`).
- Q: A-2b — reativar disciplina com turma criada enquanto ela estava inativa? → A: **(a) a RPC de
  reativar acrescenta as linhas que faltam** nas turmas `planejada`/`ativa`, **idempotente**
  (`FR-070.1`).

*(Lote 2 — respostas de **Bernardo Villas Boas**, 24/09/2026, no pedido do plan.)*

- Q: N-1 — `fundamento_normativo` dos 8 currículos sem Ofício? → A: **(a)** *"Currículo `<sigla>` —
  `<órgão da capa>`, `<ano>`"* (`FR-064`).
- Q: N-2 — `herdar` gravado em `disciplinas.modo_atribuicao_padrao`? → A: **(a) proibido.** *"O `CHECK`
  `disciplinas_modo_padrao_concreto` já existe na migration de 29/08 — confirme no banco e não crie
  outro."* *Confirmado em 24/09/2026 no banco local:* `disciplinas_modo_padrao_concreto CHECK
  ((modo_atribuicao_padrao <> 'herdar'))` existe. **Nenhum `CHECK` novo**; a tela oferece só
  `dividido`/`simultaneo` (`FR-040`).
- Q: N-3 — a tabela de destino por UE das desdobradas (`HN-2101` UEs 1–6 → `I`, UE 7 → `I-I`; `MATFIS`
  UE 1 → `MAT`, UE 2 → `FIS`)? → A: **Verificada pela conferência por agentes da Fase 0 do plano
  (`conferencia-dos-curriculos.md`). Se ela confirmar com página, está aceita; se divergir, vem para
  Bernardo** (`FR-065`). ✅ **Confirmada com página em 25/09/2026** (conferência §4.2: `MATFIS` p. 8 e
  72–73; `HN-2101` p. 6 e 8–9) — **aceita**.
- Q: N-4 — "turmas não concluídas" da Q-08 inclui canceladas? → A: **(a) só `planejada` e `ativa`;
  cancelada não recebe** (`FR-070`).
- Q: N-5 — `DIS-` começa em `000001`? → A: **(a) sim, com asserção de que nenhum código legado usa o
  prefixo** (`FR-012`).

---

## O que foi MEDIDO, e contra qual artefato

*(regra 9.2 do `CLAUDE.md`. Tudo em **24/09/2026**, no **banco local recém-copiado do remoto** —
`dado_do_remoto.py`, cópia `remoto-20260924-153818.sql` — e na **reexecução do extrator** sobre os 24
currículos. Detalhe completo, consultas e pareamento em [`analise-dos-curriculos.md`](analise-dos-curriculos.md).)*

| Medida | Valor | Por que importa aqui |
|---|---|---|
| currículos / com UE / UEs / disciplinas com UE | **24 / 21 / 572 / 134** — invariante *soma das UE = CH* fecha em **134 de 134** | é o insumo da carga (D-B4) |
| ⚠️ **remedido em 25/09/2026**, extrator corrigido (`DEENSINO`) + conferência por agentes | **135 / 582** do extrator, invariante **135 de 135**; **+ 5** UEs do APOC lidas de imagem = **587 candidatas em 136 disciplinas** | [conferência §2](./conferencia-dos-curriculos.md) — vale sobre a linha acima |
| disciplinas do banco com par no currículo | **134 de 175**; **565 de 572** UEs com destino inequívoco | a carga tem destino claro para 565; **7** UEs (`C-Ap-HN`) dependem de decisão |
| disciplinas do banco **sem par** | **41**, explicadas inteiras: 32 em cursos sem UE · 5 `AMBIENTAÇÃO VIRTUAL` · 3 metades de desdobramento · 1 emprestada de outro curso | nenhuma sobra sem explicação |
| CH divergente entre par | **4** (3 reais + 1 desdobramento) | Q-06, Q-12 |
| os três sem UE | **confirmados**: `EST-QF-APOC` (PDF **sem texto** — não está provado que não tem UE), `C-Espc-FR` e `C-Espc-HN` (modelo por competências) | D-B3 |
| `unidades_ensino` | **0** · `registros_aula` com UE: **0 de 1.566** | UE-1 ainda não tem dado |
| `disciplinas` sem dependente nenhum | **0 de 175** | **nenhuma disciplina real é excluível hoje** — D-B1 só alcança cadastro novo por engano |
| FKs para `disciplinas` e `unidades_ensino` | todas **`ON DELETE RESTRICT`** | a recusa de D-B1 já existe no motor |
| privilégio/policy de `DELETE` | **0 / 0**; exceção existente: RPC `excluir_instrutor` (INVOKER → DEFINER), **sem rastro** | o modelo de D-B1 |
| unicidade de código | índice parcial + gatilho, **só entre ativas**; duplicata `C-Esp-ALH`/`ALH-II` = ativo × inativo | Q-04 |
| `turma_disciplina` | 210 · período `herdado_grade` 89 · `nao_informado` **121** · `manual` 0 · `instrutor_id` em 79 · CH rateada em **0** | os 121 **não** podem ser preenchidos por inferência |
| `turma_disciplina_instrutor` | 96 em 85 linhas · `ch_prevista_tempos` **NULL nas 96** · `papel` NULL | Q-03 |
| `instrutor_id` × junção | 79 em ambos · 0 só em `instrutor_id` · **6 só na junção** | **quatro** lugares de "instrutor da disciplina", não três — D-3 |
| habilitação | 798 vínculos · 120 disciplinas com habilitado · **55 sem nenhum** | `RF-MATERIAS-02` tem 55 casos de lista vazia |
| `modo_atribuicao` | ENUM `herdar, dividido, simultaneo`; `simultaneo` em **0 de 175**; sem coluna de modo por turma | A-1, Q-02 |
| cursos com 2 turmas no mesmo ano | **4** (`T1 2026` / `T2 2026`) | dado real do critério 4 |
| `config_parametros` | **nenhum** limiar de "início em ≤ N dias" | `FR-030` cria o parâmetro |
| matriz | `disciplinas.criar`: admin, encarregado, ajudante · `editar`: + operador · `ler`: 9 perfis · **sem** recurso `unidades_ensino` (policies de UE leem `disciplinas.*`) | `FR-060` |
| menu | `lib/navegacao/menu.ts:73` — `{ rotulo: "Disciplinas", rota: "/disciplinas", disponivel: false, entregaEm: "Épico 5 (b)" }` | esta fatia liga |
| contrato de rotas | `/disciplinas` **não está** em `lib/navegacao/contrato.ts`; documento 25 §rota prevê `curso, status, busca` | D-6 |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Achar a disciplina descendo curso → turma → disciplina (Priority: P1)

Quem administra a Divisão abre **Disciplinas** no menu, escolhe o curso, escolhe a turma e vê a grade
**daquela turma**: cada disciplina com código, nome, CH prevista, período previsto **na turma**,
instrutor(es) **da turma**, CH cumprida e situação. Expande uma linha para ver o detalhe (UEs, quando o
curso tem; instrutores e rateio) sem sair da página. O endereço da página reproduz o recorte inteiro.

**Why this priority**: é a tela que a v2.0 mais usou (specs 030, 031, 035) e o ponto de entrada de tudo
o mais desta fatia.

**Independent Test**: com a base copiada do remoto, chegar por clique de `/inicio` a `/disciplinas`,
escolher `C-ApA-PCN-PR-EAD` e `T2 2026`, e conferir que a lista tem **8** linhas com os períodos
daquela turma (não os de `T1 2026`); colar o endereço em janela nova reproduz a mesma vista.

**Acceptance Scenarios**:

1. **Given** o menu, **When** clico em *Disciplinas*, **Then** a tela abre com o seletor de curso e
   **sem** turma escolhida, e não é beco: dá para escolher o curso ali.
2. **Given** curso escolhido e turma não, **When** olho a tabela, **Then** vejo a **grade do curso**
   (visão de catálogo) e os indicadores que dependem de turma **degradam com aviso**, nunca zero
   enganoso (`RN-DEG-01`, achado da spec 037).
3. **Given** curso e turma escolhidos, **When** expando uma linha, **Then** vejo o detalhe **sem trocar
   de página**, e o endereço registra a linha expandida.
4. **Given** um endereço com `?curso=…&turma=…`, **When** alguém sem alcance sobre o curso o abre,
   **Then** vê o estado "não há / você não vê" da spec 009 (`FR-031.4`), não uma tela vazia muda.

---

### User Story 2 — Cadastrar, editar, desativar, reativar e excluir a disciplina do curso (Priority: P1)

Quem tem `disciplinas.criar` cadastra disciplina **num curso** com código, nome, CH prevista, ordem,
modo de atribuição padrão e observação; edita o que cadastrou; desativa e reativa; e **exclui
permanentemente** só a que **não tem histórico nem dependente** (D-B1). O banco recusa código repetido
no curso e a tela diz em português.

**Why this priority**: D-B2 — *"cadastrar e editar disciplinas por curso é o centro do escopo"*.

**Independent Test**: cadastrar `SEQ-1` em curso de amostra, tentar cadastrar `SEQ-1` de novo no mesmo
curso (**recusa pelo banco**, mensagem clara), cadastrar `SEQ-1` em **outro** curso (aceita), desativar,
reativar, excluir a de amostra sem dependente (**some**, com rastro), tentar excluir uma com linha de
`turma_disciplina` (**recusa** com *"tem histórico — desative"*).

**Acceptance Scenarios**:

1. **Given** um curso e um código já usado nele, **When** salvo, **Then** o banco recusa (`23505`,
   `uq_disciplinas_curso_cod_ativo` / `trg_disciplinas_unicidade`) e a tela mostra *"Já existe uma
   disciplina ativa com este código neste curso"* — nunca o texto cru.
2. **Given** o mesmo código em **outro** curso, **When** salvo, **Then** aceita.
3. **Given** uma disciplina criada por engano, sem turma, vínculo, avaliação nem UE, **When** clico em
   *Excluir* e confirmo digitando o código, **Then** ela é apagada pela RPC, o rastro é gravado e a lista
   não a mostra mais.
4. **Given** uma disciplina com **qualquer** dependente (linha de `turma_disciplina`, vínculo de
   habilitação, avaliação, UE, planejamento), **When** tento excluir, **Then** o banco recusa
   (`23503`) e a tela diz *"este registro tem histórico — desative em vez de excluir"*, oferecendo
   *Desativar*.
5. **Given** uma disciplina desativada, **When** abro atribuição em qualquer turma, **Then** ela não
   aparece como opção nova; **When** abro uma turma que já a tinha, **Then** a linha histórica continua.

---

### User Story 3 — Definir período e instrutor(es) por turma (Priority: P1)

Para a disciplina **de uma turma**, quem tem `disciplinas.editar` informa início e término previstos
**daquela turma** e escolhe o(s) instrutor(es) **daquela turma** entre os **habilitados** para a
disciplina — preservando na edição quem já está atribuído, mesmo desabilitado ou desativado
(`RF-MATERIAS-02`). Editar `T2` **não** toca `T1`.

**Why this priority**: critério de aceite **4** (CRÍTICO) do Épico 5, e a LIQ lê daqui.

**Independent Test**: em `C-ApA-PCN-PR-EAD`, gravar período em `T2 2026` e conferir que a linha de
`T1 2026` da mesma disciplina **não mudou** (contagem de linhas alteradas = **1**, e o `editado_em` de
`T1` continua nulo) — o caso que discrimina, com dado real.

**Acceptance Scenarios**:

1. **Given** disciplina X em `T1` e `T2` do mesmo curso, **When** gravo período em `T2`, **Then**
   exatamente 1 linha de `turma_disciplina` muda e `origem_periodo` dela vira `manual`.
2. **Given** disciplina com 3 habilitados, **When** abro a atribuição, **Then** as opções são os 3,
   **ordenados por antiguidade**, pelo `SeletorInstrutor` único.
3. **Given** instrutor atribuído ontem e desativado hoje, **When** abro a edição, **Then** ele continua
   marcado e visível como *inativo*; **When** desmarco e salvo, **Then** sai da turma **sem** apagar
   registro de aula que ele tenha.
4. **Given** disciplina **sem** habilitado (55 na base), **When** abro a atribuição, **Then** vejo
   *"nenhum instrutor habilitado para esta disciplina"* com caminho clicável ao painel de habilitação
   da ficha do instrutor (`/instrutores/[codigo]`, spec 006) — não uma lista vazia muda.
5. **Given** período informado fora da janela da turma, **When** salvo, **Then** o comportamento é o
   seguinte: turma **com** janela → o banco recusa e a tela mostra a janela; turma **sem** janela →
   grava (Q-07, 24/09/2026).

---

### User Story 4 — Ratear a CH prevista entre os instrutores da turma (Priority: P2)

Quando a disciplina de uma turma tem mais de um instrutor, o sistema distingue **modo dividido**
(padrão — repartem a CH da disciplina) e **modo simultâneo** (cada um recebe a CH integral), e grava a
CH prevista **por instrutor** em `turma_disciplina_instrutor.ch_prevista_tempos`. No dividido, a soma
fecha **exatamente** com a CH da disciplina — sem sobra nem falta.

**Why this priority**: critério **5** do Épico 5, e é o que alimenta a CH prevista da ficha de docente
(`RF-INSTR-13`, spec 006).

**Independent Test**: função pura de `lib/dominio/` com 10 tempos e 3 instrutores no dividido: as três
parcelas somam **10**; no simultâneo, **cada** um recebe **10**; com 1 instrutor, recebe 10 nos dois modos.

**Acceptance Scenarios**:

1. **Given** disciplina de 30 tempos, modo dividido, 3 instrutores, **When** salvo, **Then** 10/10/10.
2. **Given** 10 tempos, dividido, 3 instrutores (CT, 1ºTen, SO), **When** salvo, **Then** 4/3/3 — o
   resto vai ao mais antigo (Q-03).
3. **Given** modo simultâneo, **When** salvo, **Then** cada instrutor tem a CH integral e a CH
   **cumprida** não muda (`RF-MATERIAS-06`: *"a CH prevista é rateada; a CH cumprida, nunca"*).
4. **Given** a pessoa ajusta o rateio à mão, **When** a soma não fecha, **Then** a gravação é recusada
   **pelo banco** com mensagem clara — a soma exata é invariante de banco, não só de tela.

---

### User Story 5 — Ver o quadro da grade: indicadores, sinalização, filtros e proporção (Priority: P3)

A tela mostra total de disciplinas, concluídas, atrasadas e sem instrutor; sinaliza disciplina **sem
instrutor** e disciplina com **início em ≤ N dias** (N em `config_parametros`, 30 por padrão), com
destaque diferente conforme tenha ou não instrutor; filtra por instrutor e por situação, com os filtros
**na URL** e o botão *Limpar filtros*; e mostra um gráfico de proporção da CH prevista por disciplina.

**Why this priority**: `RF-MATERIAS-03/04`, specs 037 e 035 — paridade, mas não bloqueia US1–US4.

**Independent Test**: aplicar filtro de instrutor, conferir que tabela, indicadores **e** gráfico
mudam juntos; clicar *Limpar filtros* devolve a lista completa e limpa o endereço.

**Acceptance Scenarios**:

1. **Given** disciplina sem instrutor na turma, **Then** a linha traz a sinalização "sem instrutor".
2. **Given** início previsto daqui a 20 dias, **Then** sinaliza "início próximo", **com** destaque
   diferente se tem ou não instrutor; **Given** início `NULL` (`nao_informado`), **Then** **não**
   sinaliza início próximo nem atraso — período ausente é "não informado", nunca inferido.
3. **Given** curso sem turma escolhida, **Then** indicadores que dependem de turma mostram
   *"escolha uma turma"*, não zero.
4. **Given** parâmetro alterado para 15 dias, **Then** a sinalização segue 15 sem deploy.

---

### User Story 6 — Manter as Unidades de Ensino da disciplina, nos cursos que têm (Priority: P2)

Dentro da tela da disciplina, quem tem `disciplinas.criar`/`editar` vê a lista de UEs (número, tópico,
CH prevista, fundamento normativo), **cria**, **edita**, **desativa**, **reativa** e **exclui** UE (D-B1),
e vê a soma das CH das UEs contra a CH da disciplina. O banco nasce com as UEs **dos currículos
oficiais**, carregadas com origem registrada (D-B4).

**Why this priority**: UE-1 (rota (b), 26/08/2026) fez da UE o **grão** de `registros_aula`; sem UE no
banco o Épico 6 não lança aula. É desta fatia porque o Épico 2 não carregou (registrado no `CLAUDE.md`).

**Independent Test**: depois da carga, `select count(*) from unidades_ensino` = número declarado no
plano de carga (565 ou 572, conforme Q-05), **cada** linha com `fundamento_normativo` preenchido, e a
asserção pgTAP `FR-024` da spec 002 (soma fecha) passa para **toda** disciplina carregada. Na tela:
criar UE `99` em disciplina de amostra, excluí-la (sem aula: some), tentar excluir UE com aula (recusa,
"desative").

**Acceptance Scenarios**:

1. **Given** `CAHO` `I` INFORMÁTICA APLICADA À HIDROGRAFIA, **When** abro a disciplina, **Then** vejo as
   UEs do currículo (`Of nº 10-6/2025 DEnsM`), 1..n, com tópico e CH, soma = 45.
2. **Given** UE com registro de aula, **When** tento excluir, **Then** o banco recusa (`23503`,
   `reg_aula_ue_do_curso`) e a tela diz *"tem histórico — desative"*; **When** desativo, **Then** ela
   sai das opções de lançamento e o histórico fica.
3. **Given** UE criada no sistema (não do currículo), **Then** ela é distinguível da UE do currículo
   (origem visível); **When** a soma das UEs deixa de fechar com a CH da disciplina, **Then** a tela
   **avisa** com a diferença e **grava** (Q-06).

---

### User Story 7 — Curso sem UE trabalha inteiro sem UE (Priority: P2)

Em `C-Espc-FR`, `C-Espc-HN` e `EST-QF-APOC` (e na disciplina `AMBIENTAÇÃO VIRTUAL` dos 5 cursos que a
têm), a tela **não** mostra seção de UE vazia, **não** avisa "faltam UEs", **não** exige UE para nada
desta fatia, e o lançamento futuro (Épico 6) terá o que precisa — o **como** é do Épico 6.

**Why this priority**: D-B3 — *"sem aviso enganoso"* é requisito, não acabamento.

**Independent Test**: abrir `C-Espc-FR` em `/disciplinas`, expandir qualquer linha: **zero** menções a
UE e **zero** avisos; a mesma tela em `CAHO` mostra as UEs.

**Acceptance Scenarios**:

1. **Given** curso marcado como sem UE, **Then** a seção de UE não é renderizada e nenhum indicador
   conta "UEs faltantes".
2. **Given** curso com UE e uma disciplina que o currículo lista **sem** UE (`C-Ap-FR` TOPOGRAFIA),
   **Then** a disciplina mostra "sem UE no currículo" como **fato**, não como alerta.

---

### Edge Cases

- **Código reaproveitado depois de desativar**: `uq_disciplinas_curso_cod_ativo` só vale entre ativas —
  desativar **libera** o código (e excluir também); reativar com o código tomado é recusada (Q-04).
- **Grade muda com turma existente** (`FR-032.4` da spec 009): disciplina **acrescentada** nasce
  `nao_informado` nas turmas não concluídas; **desativada** fica onde está (Q-08, `FR-070`).
- **Período fora da janela**: recusa pelo banco quando a turma tem janela; sem janela, aceita (Q-07,
  `FR-030.1`).
- **Reativar disciplina** cujo código foi tomado por outra enquanto estava inativa: o índice parcial
  recusa a reativação (`23505`) — a tela traduz como *"o código está em uso por outra disciplina ativa"*.
- **Instrutor atribuído e depois desabilitado** (vínculo inativo): fica na edição, marcado, com o
  rótulo do estado; não aparece como opção **nova** em outra turma.
- **Rateio com CH da disciplina alterada depois**: as parcelas gravadas deixam de somar a CH nova —
  aviso na linha, nunca recálculo silencioso; o gatilho do `FR-043` só age na **próxima** gravação.
- **UE com aula em uma turma e sem em outra**: a UE é do **curso**; a recusa de exclusão vale se houver
  aula em **qualquer** turma.
- **Disciplina sem habilitado nenhum** (55): a atribuição abre vazia com caminho para habilitar.
- **Período em turma sem janela** (`nao_informado`): sem janela não há contra o que validar — grava o
  que foi informado e o quadro da turma (spec 009 `FR-028.4`) segue avisando "turma sem janela".
- **Endereço com turma de outro curso** (`?curso=A&turma=<turma de B>`): a turma prevalece? o curso? —
  regra única do `FR-031.2`/`FR-006.1` da spec 009: **a turma resolve o curso**, e o parâmetro
  incoerente é descartado com aviso.
- **Exclusão concorrente**: dois administradores, um desativa e o outro exclui — a RPC confere tudo no
  banco no momento da execução; a tela nunca decide.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Cascata, endereço e caminho clicável

- **FR-001**: O sistema MUST permitir chegar à disciplina descendo **curso → turma → disciplina** na
  rota `/disciplinas`, com o **seletor de turma único** da spec 009 (`FR-033`, `seletor-turma.tsx`) e o
  endereço de turma da **função única** (`FR-031.2`, `endereco-de-turma.ts`).
- **FR-002**: O recorte inteiro MUST viver na URL, via `nuqs` e o **contrato tipado** de
  `lib/navegacao/contrato.ts` (spec 008): `curso`, `turma`, `instrutor`, `situacao`, `busca`, linha
  expandida. Parâmetro fora do contrato **não compila**. O documento 25 prevê `curso, status, busca` —
  a lista real é maior (D-6).
- **FR-003**: A tabela MUST ser **expansível** (spec 031): a mesma tabela, não uma segunda, ganha as
  colunas de turma quando há turma; a linha expandida mostra detalhe (instrutores e rateio; UEs quando
  o curso tem) **sem** trocar de página. **Toda edição é por painel** (`dialogo`/formulário sobre a
  página), **nunca em linha** — Q-15, 24/09/2026, paridade com a spec 038.
- **FR-004**: Sem turma escolhida, a tela MUST mostrar a **grade do curso** (visão de catálogo) com
  edição de cadastro (US2) e **degradar** os indicadores de turma com aviso (`RN-DEG-01`; paridade
  obrigatória do `RF-MATERIAS-04`).
- **FR-005**: A entrada *Disciplinas* do menu MUST passar a `disponivel: true` (`lib/navegacao/menu.ts`),
  e **toda tela nova** desta fatia MUST ter **caminho clicável** até ela, provado pela varredura
  `tests/unidade/toda-tela-tem-caminho.test.ts` e por e2e que chega **por clique** (só o primeiro `goto`).
- **FR-006**: A tela MUST nascer com **`Limpar filtros`** — o componente único
  `components/ciaara/botao-limpar-filtros.tsx` — e `loading.tsx` / `error.tsx` no segmento.

#### Cadastro da disciplina (D-B2)

- **FR-010**: O sistema MUST manter o cadastro de disciplina **do curso** com código, nome, CH prevista
  (tempos), ordem sugerida, modo de atribuição padrão (`herdar` / `dividido` / `simultaneo`), técnica
  de ensino sugerida, local padrão e observação (`RF-MATERIAS-01`), com **criar** e **editar** para quem
  tem `disciplinas.criar` / `disciplinas.editar` (matriz), **pelo banco** (RLS existente).
- **FR-011**: O banco MUST recusar código repetido **entre disciplinas ativas do mesmo curso**
  (`uq_disciplinas_curso_cod_ativo` + `trg_disciplinas_unicidade`, já existentes — `RF-DADOS-06`), e a
  tela MUST traduzir o `23505` por `traducao-de-recusas.ts`, **nunca** expondo o texto cru. O mesmo
  código em cursos diferentes MUST ser aceito. **Desativar libera o código** para outra disciplina
  ativa do curso — é o comportamento do índice parcial, **confirmado** (Q-04, 24/09/2026); a dupla
  `C-Esp-ALH`/`ALH-II` (ativo × inativo) **fica como está**. Reativar uma inativa cujo código foi tomado
  é recusada pelo mesmo índice e traduzida como *"o código está em uso por outra disciplina ativa"*.
- **FR-012**: O identificador MUST ser **gerado pelo banco** (`RN-CRUD-03`): `disciplinas.codigo` hoje
  guarda o `ID_Grade` da v2.0 verbatim (`53 - C-Ap-FR - XIII`); para disciplina nova o código MUST ser
  **`DIS-NNNNNN`**, por **sequência em `app`** com `DEFAULT app.proximo_codigo_disciplina()` (mesmo
  desenho do `TDI-`, com o `grant execute` do gotcha 5.1), e **a sequência MUST entrar em
  `carregar.SEQUENCIAS_DE_CODIGO`**, coberta por `tests/unidade/sequencias-apos-restaurar.test.ts` e
  pela prova `provar_sequencias_apos_copia.py` (P3 passa a exigir **5**) — Q-11, 24/09/2026. **Começa
  em `DIS-000001`, com asserção pgTAP de que nenhum `codigo` legado usa o prefixo** (N-5; medido: 0 de
  175). A tela
  MUST NOT pedir que a pessoa digite; o `23505` desta coluna é *"erro interno de numeração"* (gotcha 9).
- **FR-013**: **Desativar** e **reativar** MUST ser `UPDATE` de `status` (regra 4). Disciplina inativa
  MUST sair das opções de **nova** atribuição e da criação de linha em turma nova (`FR-032.3` da spec
  009) e MUST permanecer em todo histórico.
- **FR-014**: Coluna derivada MUST NOT ser gravável por caminho nenhum (`RN-CRUD-02`) — CH cumprida,
  `ta_executados`, `ta_saldo` vêm de `vw_disciplinas_execucao`. **A CH total do instrutor MUST ser
  sempre calculada** a partir das parcelas, nunca digitada (critério 9, `RF-INSTR-13`). ⚠️ **A parcela
  de uma disciplina numa turma É digitável** (`FR-041.4`, A-1 de 25/09/2026): o critério 9 fala da
  grandeza do instrutor, não da repartição de uma disciplina — e a repartição digitada é recusada pelo
  banco se não fechar.
- **FR-015**: **Confirmação antes de salvar** MUST seguir a **lista fechada** de
  `lib/dominio/confirmacao-de-gravacao.ts`, estendida com as escritas desta fatia que alcançam o que já
  foi lançado: excluir (sempre), desativar disciplina/UE com histórico, mudar CH de disciplina com
  rateio gravado, mudar modo de atribuição com instrutores atribuídos.

#### Exclusão permanente — D-B1, e como o `DELETE` chega ao banco

- **FR-020**: A exclusão permanente de **disciplina** e de **UE** MUST chegar ao banco por **RPC**, não
  por policy — **exatamente o desenho da exceção de instrutor** (`20260915140100`): função
  `public.excluir_disciplina(p_disciplina_id uuid, p_codigo_confirmacao text)` **INVOKER**, que chama
  `app.excluir_disciplina` **DEFINER**, e o par `excluir_unidade_ensino` / `app.excluir_unidade_ensino`.
  **Continua sem policy `FOR DELETE` e sem privilégio de `DELETE`** para `authenticated`; PR que
  acrescente qualquer um dos dois é rejeitado (regra 4).
- **FR-021**: A permissão MUST ser conferida **dentro da função**, no banco: só quem tem
  **`disciplinas.criar`** no alcance do curso (admin, encarregado e ajudante da Divisão) exclui — quem
  pode criar é quem pode desfazer o cadastro criado por engano; `disciplinas.editar` (operador) **não**
  basta. Recusa com `42501`.
- **FR-022**: A função MUST conferir **no banco**, na hora, os impedimentos —
  `app.impedimentos_de_exclusao_da_disciplina`: linha em `turma_disciplina`, vínculo em
  `instrutor_disciplina`, `avaliacoes`, `planejamento_anual`, `unidades_ensino`, aula por
  `unidade_ensino_id` **e** por `disciplina_codigo_legado_v1` (que não é FK, mas é histórico). Com
  qualquer um, recusa com `23503` e a lista de chaves; a tela traduz por `traducao-de-recusas.ts` como
  *"este registro tem histórico — desative em vez de excluir"*, nomeando os impedimentos. Para UE, os
  impedimentos são `registros_aula` (as duas FKs) — **UE com aula NUNCA é excluída, só desativada**.
- **FR-023**: **Confirmação e alerta**: a tela MUST exigir digitar o **código** do registro
  (`p_codigo_confirmacao`, conferido pela função) e MUST avisar que é permanente, pelo
  `dialogo-confirmacao.tsx`.
- **FR-024**: **Rastro**: toda exclusão MUST gravar **quem** (`auth.uid()`), **o quê** (tabela, `id`,
  `codigo`, e o retrato JSON da linha apagada) e **quando**, **na mesma transação** da RPC, numa tabela
  **append-only** (gatilho recusando `UPDATE`/`DELETE`/`TRUNCATE` inclusive para `service_role`, como
  `curso_regime_historico`), legível por quem tem `auditoria.ler`. **Decidido (Q-09, 24/09/2026): é
  uma TABELA NOVA, só de acréscimo** — nome e colunas são do plano; `migracao_log` **não** é reutilizada
  (é da migração, regra 5). Hoje a RPC de instrutor **não grava rastro** (A-9) — harmonizá-la é
  `PEND-5b-1`.
- **FR-025**: A exclusão de instrutor existente MUST NOT ser alterada por esta fatia; harmonizar o rastro
  dela com o desta é `PEND-5b-1`, junto com estender D-B1 aos outros cadastros.

#### Período e instrutor(es) por turma — e qual tela escreve onde

- **FR-030**: Período previsto MUST ser gravado **por turma** em `turma_disciplina.previsao_inicio/termino`,
  com `origem_periodo = 'manual'`; a escrita numa turma MUST alterar **exatamente uma** linha
  (critério 4). `NULL` continua significando **"não informado"** — as 121 linhas MUST NOT ser preenchidas
  por inferência (Q1.b, emenda de 22/09/2026).
- **FR-031**: Os instrutores da disciplina **na turma** MUST ser gravados em
  **`turma_disciplina_instrutor`** (uma linha por instrutor, com `ch_prevista_tempos` e, quando LIQ-3
  vier, `papel`). **É a única tabela que esta fatia escreve para "instrutor da disciplina".**
- **FR-032**: **Os outros lugares, e o destino de cada um** — decidido em **Q-01, 24/09/2026**: a
  fonte da verdade é a junção, **nenhum quinto lugar**, e os três resquícios são **aposentados**:
  | Lugar | Significa | Quem escreve | Esta fatia |
  |---|---|---|---|
  | `instrutor_disciplina` | **habilitação** (`RN-INST-01`, `VIN-`) | painel de habilitação da ficha do instrutor (spec 006, `FR-030` lá) | **só lê**, para filtrar quem pode ser oferecido (`RF-MATERIAS-02`) |
  | `turma_disciplina_instrutor` | **atribuição por turma — a fonte da verdade** | **esta fatia** (`FR-031`) | escreve |
  | `disciplinas.instrutores_atribuidos` (`uuid[]`, **vazio nas 175**) | "atribuição de planejamento" (`RN-CRONOS-01`) | ninguém | **APOSENTADA** — comentário `[APOSENTADA — v2.1]`, sem `drop` (regra de banco); o gatilho `trg_disciplinas_instrutores_fk` fica inerte |
  | `turma_disciplina.instrutor_id` (**79** preenchidos) | *"de onde a LIQ lê"* (comentário da coluna, P-6) | ETL | **APOSENTADA** depois da prova do `FR-032.1`; a LIQ (Épico 11) lê a junção — o comentário da coluna é reescrito para dizer isso |
  | `turma_disciplina.ch_prevista_por_instrutor` (**0** preenchidos) | CH rateada na linha | ninguém | **APOSENTADA** — a CH rateada vive só em `turma_disciplina_instrutor.ch_prevista_tempos` (A-4, D-7) |
- **FR-032.1**: **Antes** da migration que aposenta, uma asserção pgTAP MUST provar, **na base
  carregada**, que **todo** `turma_disciplina.instrutor_id` não nulo tem linha **ativa** na junção com o
  **mesmo** instrutor, e que `ch_prevista_por_instrutor` e `instrutores_atribuidos` estão vazios — se
  um valor não estiver na junção, a migration **o migra para lá** antes de aposentar, **sem perder
  nenhum**. *Medido em 24/09/2026: 79 de 79 na junção, 0 e 0 nos outros dois — nada a migrar.*
- **FR-033**: A escolha MUST oferecer **só os habilitados** (`instrutor_disciplina.status = 'ativo'`)
  como opção nova, e MUST **preservar** na edição quem já está atribuído mesmo desabilitado ou
  desativado (`RF-MATERIAS-02`), com o estado visível — `on delete restrict` + `status`, nunca `DELETE`.
- **FR-034**: Toda lista, seletor e filtro de instrutor MUST sair por `components/ciaara/seletor-instrutor.tsx`
  e `lib/dominio/antiguidade.ts` (`RN-ANT-01/02`), **sem exceção** — verificado em **todas** as
  ocorrências (critério 1). Nome no formato do `RF-INSTR-15`, por `nome-instrutor.tsx` (critério 2).
- **FR-035**: Quem edita período e instrutor por turma MUST ser decidido **pelo banco**, pelas policies
  **existentes** de `turma_disciplina` e `turma_disciplina_instrutor`: **`disciplinas.editar`** (+
  alcance de turma + turma em oferta), **operador incluído** — Q-10, 24/09/2026. A matriz **não** muda.
- **FR-030.1**: Período previsto **fora da janela da turma** MUST ser **recusado pelo banco** quando a
  turma **tem** janela (`data_inicio`/`data_termino` preenchidas) — paridade com a v2.0 (spec 029
  `FR-005`/`FR-006`); turma **sem** janela **aceita** o período informado — Q-07, 24/09/2026. A recusa
  vem com chave própria, traduzida como *"o período sai da janela da turma (dd/mm/aaaa a dd/mm/aaaa)"*.

#### Rateio da CH prevista (`RF-MATERIAS-06`, `RN-MAT-05`)

- **FR-040**: O modo MUST ser **dado**, nunca inferido do nome (`RN-MAT-05`): `disciplinas.modo_atribuicao_padrao`
  é **campo editável** do cadastro (US2). **Decidido (Q-02, 24/09/2026):** a migration do PR 1 marca
  `simultaneo` nas **três** linhas cujo nome atual casa com as três práticas da `RN-MAT-05` —
  `53 - C-Ap-FR - XIII`, `41 - C-Ap-HN - XVIII`, `20 - CAHO - XVIII` —, **nomeadas uma a uma na
  migration** (é decisão de Bernardo sobre linhas identificadas, não inferência por nome em tempo de
  execução); as demais, inclusive `82 - C-Espc-FR - MBFCFR-017`, Bernardo marca **pela tela**.
  **`herdar` significa "usar o modo padrão da disciplina", e nada mais** — sem coluna de modo por turma
  nesta fatia, o rateio lê sempre `disciplinas.modo_atribuicao_padrao`. **`herdar` é proibido nessa
  coluna pelo `CHECK` `disciplinas_modo_padrao_concreto`, que já existe** (N-2, 24/09/2026 — confirmado
  no banco; nenhum `CHECK` novo); a tela oferece só `dividido` e `simultaneo`.
- **FR-041**: A função pura `lib/dominio/rateio-de-carga.ts` MUST ser a **referência** do rateio:
  recebe CH da disciplina, lista de instrutores **já ordenada por antiguidade**, o modo e — quando
  houver — as parcelas digitadas ou a atribuição de UEs; devolve as parcelas, **sempre inteiras**.
  **Vitest com 2 e 3 instrutores em cada caso** (documento 04). Os **cinco casos** (A-1, 25/09/2026):
- **FR-041.1**: **Um instrutor só** → CH **integral**, e todas as UEs são dele.
- **FR-041.2**: **Simultâneo** → **cada** instrutor recebe a CH **integral** (`RN-MAT-05`).
- **FR-041.3**: **Dividido sem definição** (o padrão) → divisão igual em **TA inteiros**, com o resto
  distribuído **aos mais antigos, um TA cada**, pela ordem de antiguidade do sistema (Q-03). 10 TA
  entre 3 → **4 + 3 + 3**. **Nunca produz fração.**
- **FR-041.4**: **Dividido por TA** → a pessoa **digita** TA inteiros por instrutor, e **o banco
  recusa** se a soma diferir da CH da disciplina. É a exceção deliberada ao critério 9, que continua
  valendo para a **CH total** do instrutor — essa segue **calculada**, nunca digitada (`FR-014`).
- **FR-041.5**: **Dividido por UE** → a pessoa atribui **UEs a instrutores**, e a CH de cada um é a
  **soma da CH das suas UEs pelo currículo** — **derivada, nunca gravada**. Cada UE MUST ter
  **exatamente um** instrutor e **todas** MUST estar atribuídas; o modo só é oferecido para disciplina
  **com UE**. Exige a entidade nova **`turma_disciplina_unidade`** (data-model §1).
- **FR-041.6**: **Qual caso vale numa turma se lê do dado, sem coluna de modo**: linhas em
  `turma_disciplina_unidade` → caso 5; `ch_prevista_tempos` preenchida → caso 4; nenhum dos dois →
  caso 3 (ou 1, se houver um instrutor só); `modo_atribuicao_padrao = 'simultaneo'` → caso 2. Os
  casos 4 e 5 MUST NOT coexistir na mesma `turma_disciplina` — o banco recusa. **Nenhuma segunda
  fonte de verdade**: no caso 5 a parcela é derivada e `ch_prevista_tempos` fica `NULL`.
- **FR-041.7**: `vw_instrutor_carga_prevista` MUST implementar exatamente os cinco casos — hoje ela
  divide `carga_horaria_tempos / instrutores_designados` e **produz fração** (medido: `round(…, 2)`),
  o que contraria `FR-041.3`. A view MUST ser **testada contra a função pura**, com a mesma tabela de
  casos, e a ordem de antiguidade MUST vir de `app.fn_antiguidade_ordem`, que já existe.
- **FR-042**: Quando a CH não divide igualmente (10 tempos entre 3), a **divisão é inteira e o resto vai
  aos mais antigos, um tempo cada, pela ordem de antiguidade do sistema** (`lib/dominio/antiguidade.ts`,
  com `antiguidade_declarada` como desempate) — Q-03, 24/09/2026. Registrado: a v2.0 (spec 032,
  `FR-007`) punha o resto **no último da lista**; a regra muda de propósito, por decisão nominal.
  Exemplos obrigatórios no Vitest: 10 entre 3 → 4/3/3 (mais antigo primeiro); 11 entre 3 → 4/4/3;
  30 entre 3 → 10/10/10.
- **FR-043**: A soma exata MUST ser **invariante do banco** (gatilho adiado em
  `turma_disciplina_instrutor` e em `turma_disciplina_unidade`, recusa com chave própria traduzida),
  não só da tela: no **caso 4**, a soma das parcelas digitadas MUST ser igual à CH da disciplina; no
  **caso 5**, **toda** UE da disciplina MUST estar atribuída e **cada uma a exatamente um** instrutor.
  **`ch_prevista_tempos` `NULL` significa "dividir igualmente" SÓ NA LEITURA — nunca é gravado por
  inferência** (Q-03): as 96 linhas migradas **ficam `NULL`** até alguém salvar a atribuição daquela
  turma. Mistura de `NULL` com valor é recusada; e parcela **fracionária** é recusada (`FR-041`).
- **FR-044**: A CH **cumprida** MUST NOT ser tocada por nada desta fatia — vem de `registros_aula`
  via `vw_disciplinas_execucao` / `vw_unidades_ensino_execucao` (spec 032, `FR-011`).

#### Sinalização, indicadores, filtros, gráfico

- **FR-050**: O limiar de "início próximo" MUST ser **dado** em `config_parametros`
  (`disciplinas.aviso_inicio_dias`, `30`, natureza **operacional**, `editavel_por` a decidir com a matriz
  — regra 8), lido pela Server Action e passado à função pura; **nunca constante**.
- **FR-051**: A sinalização MUST distinguir *sem instrutor* e *início em ≤ N dias* **com** e **sem**
  instrutor (`RF-MATERIAS-03`), por `badge-status.tsx`; período `NULL` **não** sinaliza.
- **FR-052**: Indicadores MUST ser total, concluídas, atrasadas e sem instrutor (`RF-MATERIAS-04`),
  calculados por função pura sobre `vw_disciplinas_execucao`. **Derivam da execução** (Q-14,
  24/09/2026): *não iniciada* = `ta_executados = 0`; *em andamento* = executado > 0 e `ta_saldo > 0`;
  *concluída* = `ta_saldo <= 0`; *atrasada* = hoje > `previsao_termino_efetiva` **e** `ta_saldo > 0` —
  com `previsao_termino_efetiva` `NULL`, **nunca** atrasada. Vocabulário de `badge-status.tsx`
  (`naoIniciada`, `emAndamento`, `disciplinaConcluida`, `atrasada`), fórmula da spec 037 `FR-003`.
- **FR-053**: Filtros por instrutor e por situação (da turma e da disciplina) MUST viver na URL e MUST
  reiniciar ao trocar curso/turma (spec 037 `FR-005`); tabela, indicadores e gráfico MUST refletir
  **o mesmo** subconjunto.
- **FR-054**: O gráfico MUST ser de **proporção** da CH prevista por disciplina (`components/graficos/`,
  Recharts), só com curso escolhido, rotulado por código/nome (spec 037 `FR-007..009`).

#### Unidades de Ensino — D-B3 e D-B4

- **FR-060**: A UE MUST ser lida, criada, editada, desativada, reativada e excluída **dentro da tela da
  disciplina**, pelas policies **existentes** de `unidades_ensino` (`disciplinas.ler/criar/editar` +
  alcance + curso em oferta) — **sem recurso novo na matriz**; exclusão pela RPC do `FR-020`.
- **FR-061**: A UE MUST ter número, tópico, CH prevista (tempos, `> 0`), `fundamento_normativo` e
  origem visível — **do currículo** (carga) ou **criada no sistema**. `unique (disciplina_id, numero_ue)`
  já existe e MUST ser traduzida como *"já existe UE com este número nesta disciplina"*.
- **FR-062**: A tela MUST mostrar a **soma** das CH das UEs contra a CH da disciplina. Quando a soma
  **não fecha** — UE editada, UE criada no sistema, CH da disciplina alterada, ou as 3 divergências
  reais de CH da análise §4.1 — o sistema MUST **avisar, nunca recusar** (Q-06, 24/09/2026): aviso na
  linha da disciplina e no quadro, com a soma e a diferença à vista; a asserção pgTAP `FR-024` da spec
  002 passa a valer **sobre a carga** (dado do currículo), não como gatilho sobre edição, **e exclui
  nominalmente `EST-QF-APOC`**, cuja soma de 80 contra CH de 79 é divergência do próprio currículo
  (P-4, 25/09/2026). **CH da disciplina derivada da soma das UEs fica como pergunta para o plano**, não
  decidida aqui. ⚠️ **Nenhuma CH de disciplina é corrigida por script** (P-1, 25/09/2026): as 9
  divergências confirmadas com página ficam com este aviso, e a correção é feita **na tela** por quem
  responde pelo dado, com o rastro de auditoria que o gatilho `set_auditoria` já grava.
- **FR-063**: **Cursos e disciplinas sem UE** MUST ser **dado**, não dedução: um marcador no curso
  (`cursos.sem_unidades_ensino`, ou equivalente decidido no plano) preenchido pela carga para
  `C-Espc-FR`, `C-Espc-HN` e `EST-QF-APOC`, e um estado por disciplina para as 5 `AMBIENTAÇÃO VIRTUAL` e
  `C-Ap-FR` TOPOGRAFIA. Com o marcador, a tela **não renderiza** seção de UE, **não** avisa e **não**
  exige (D-B3). ⚠️ `EST-QF-APOC` fica marcado como **"currículo não legível por máquina"**, não como
  "sem UE" — a distinção é dado (§2.1 da análise). **Decidido (Q-05, 24/09/2026): pendência
  `PEND-5b-3` — tentar OCR no PR 2; se o resultado não for confiável (invariante da soma não fecha, ou
  texto ilegível), o curso fica sem UE até transcrição humana**, sem bloquear a carga dos demais.
  ✅ **Resolvido na Fase 0 do plano (25/09/2026)**: leitura das imagens por agente + segunda
  verificação, legibilidade alta — 1 disciplina de 79 h, 5 UEs (9, 18, 9, 20, 24), soma 80 explicada
  pelo próprio PDF (*tempo reserva 1 h*). As 5 UEs entram na carga marcadas *"transcrito de imagem"*
  e `EST-QF-APOC` fica `curriculo_modelo = 'unidades_de_ensino'` (conferência §4.1, research R-3).
- **FR-064**: A carga das UEs MUST vir **da extração existente** (`scripts/etl/extrair_unidades_ensino.py`,
  saída versionada `scripts/etl/dados/unidades_ensino.csv`, **idêntica** à reexecução de hoje), por
  `INSERT … SELECT` que resolve `disciplina_id` com a **tabela de pareamento explícita** da análise
  (§3–§4), **versionada e revisada por Bernardo** — nunca por casamento automático de nome em tempo de
  carga. **Toda linha carregada** MUST ter `fundamento_normativo` **capturado pelo extrator do texto
  do PDF** — *medido em 24/09/2026:* o Ofício da DEnsM é legível por máquina em **15 dos 24**
  (`Of nº 10-6/2025` etc.); nos **8** sem Ofício, a capa traz órgão e ano (*"Diretoria de Ensino da
  Marinha, 2011"* / *"CIAARA, 2023–2026"*), gravada como *"Currículo `<sigla>` — `<órgão da capa>`,
  `<ano>`"* (N-1, 24/09/2026); **leitura humana dispensada** (decisão de 24/09/2026 — a fonte oficial é o arquivo, desde 28/08/2026). Nunca um
  Ofício inventado; `origem_migracao_v1` nomeia o arquivo. Nome de UE e tópico com a **grafia do
  currículo**. **CH: 1 TA = 1 hora, sem conversão** (Q-12, 24/09/2026). ⚠️ **Cada curso é pareado com o
  SEU currículo, nunca com o de outro** (P-2, 25/09/2026): `C-Exp-MetocOf` (presencial) carrega as
  **27 UEs** do currículo de 2011; `C-Exp-Metoc-OF-SP` (semipresencial), as **24** do SP de 2025 — são
  dois cursos, e a CH difere por ser um semipresencial. **A carga MUST NOT corrigir CH, nome nem código
  de disciplina** (P-1).
- **FR-065**: As **exceções medidas** têm tratamento decidido (Q-05, 24/09/2026 — *carga por UE, sem
  fundir linhas; exceção sem tratamento claro fica FORA da carga como pendência nomeada, sem bloquear o
  resto*):
  | Exceção | Tratamento |
  |---|---|
  | 7 UEs de `HN-2101-0621` (`C-Ap-HN`; banco tem `I` MATEMÁTICA 105 e `I-I` FÍSICA 21) | **carga por UE**, cada uma para a metade que o currículo indica. *Medido:* UE 7 *FÍSICA* = **21 h** = CH de `I-I`; UEs 1–6 (matemática, estatística, erros, incerteza, ajustamento) somam **105 h** = CH de `I`. A tabela de pareamento por UE é **revisada por Bernardo** antes da carga (**N-3**) |
  | UEs de `MATFIS` (`CAHO`; banco tem `MAT` 28 e `FIS` 28) — **são 2, não 3** (correção da análise §4.2) | **carga por UE**: UE 1 *EMPREGO DOS CONCEITOS DE MATEMÁTICA…* 28 h → `MAT`; UE 2 *…DE FÍSICA…* 28 h → `FIS` — revisada por Bernardo (**N-3**) |
  | `C-Exp-Metoc-OF-SP` `IV` (linha do banco cujo nome carrega a sigla do **outro** curso) | **sem UE**: o pareamento é **curso ↔ o próprio currículo, nunca cruzado** (P-2, 25/09/2026), e o currículo SP não tem esta disciplina. A existência e a CH da linha são cadastro, corrigidos na tela (P-1) — `PEND-5b-5` |
  | TOPOGRAFIA de `C-Ap-FR` (`VIII`, 100) | **não é exceção do currículo — é defeito do extrator**: *medido em 24/09/2026 no PDF*, a seção existe com o cabeçalho grafado *"LISTA DE UNIDADES DEENSINO"* (sem espaço) e traz **10 UEs que somam 100 h**; o extrator, que procura *"UNIDADES DE ENSINO"*, não a viu. O extrator foi corrigido em 24/09 (**uma** implementação) e **remedido**: **582 UEs em 135 disciplinas**, invariante 135/135 (conferência §2) |
  | Nome truncado (`C-Exp-MetocOf` `IV`) e "DE DE DADOS" (2 estágios) | corrigir/confirmar **no extrator**, contra o PDF, no PR 2; o nome gravado é o do PDF |
  | 5 `AMBIENTAÇÃO VIRTUAL` | **sem UE**, marcadas (`FR-063`) |
  | `EST-QF-APOC` | `FR-063` — OCR, senão pendência |
  **Nenhuma** é resolvida por inferência: o pareamento por UE é tabela explícita, versionada e revisada.
- **FR-066**: A carga MUST ser **migration/seed aplicada ao remoto como as demais** — depois do CI verde,
  com **cópia datada do remoto antes** (`dado_do_remoto.py --somente-copia`, arquivo citado no PR) —
  **antes do merge**, porque preview e Production são o mesmo projeto (AMBIENTE-1). ⚠️ **Nada disto é
  desta rodada**: esta rodada só escreve documento.
- **FR-067**: A conferência **currículo × banco** MUST ser reexecutável (extrator + consultas da análise
  §1) e MUST dar **zero diferença sem explicação** depois da carga — cada diferença remanescente com a
  decisão de Q-05 ao lado.

#### Fronteira herdada da spec 009

- **FR-070**: `FR-032.4` da spec 009 — decidido (Q-08, 24/09/2026): **disciplina acrescentada à grade
  nasce como `nao_informado` nas turmas `planejada` e `ativa`** do curso (`cancelada` e `concluida`
  **não** recebem — N-4); **disciplina desativada continua nas turmas onde já está** — a linha de
  `turma_disciplina` fica, sai das listas de nova atribuição e aparece como inativa.
  ⚠️ **O mecanismo é RPC, não gatilho** (A-2, 25/09/2026): `public.criar_disciplina(jsonb)` insere a
  disciplina **e** as linhas numa transação, no molde de `criar_curso_com_regime`. **Um gatilho
  `AFTER INSERT` em `disciplinas` foi recusado** porque colidiria com a ordem do ETL (`turmas` →
  `disciplinas` → `turma_disciplina`, medido em `scripts/etl/ordem.py`) e com as amostras `020`, `094`,
  `097` e `098`, que inserem `turma_disciplina` explicitamente — **ETL e amostras não mudam**.
- **FR-070.1**: **Reativar** disciplina MUST acrescentar, pela RPC `public.reativar_disciplina`, as
  linhas que **faltam** nas turmas `planejada`/`ativa` — uma turma criada enquanto a disciplina estava
  inativa não tem a linha (`FR-032.3` da spec 009 só cria para disciplina ativa). **Idempotente**
  (A-2b, 25/09/2026).

#### Transversal

- **FR-080**: Toda escrita MUST passar por Server Action com `safeParse` do Zod na primeira linha e
  recusa traduzida por `traducao-de-recusas.ts`; **nenhuma regra só na UI**.
- **FR-081**: Toda tela MUST distinguir "não há" de "você não vê" (gotcha 4) e MUST usar só tokens do
  `@theme` (regra de cor, zero violações).
- **FR-082**: e2e MUST chegar por **clique**; `goto` só no início; casos que **discriminam** para cada
  regra que muda permissão, coluna ou condição (DoD 8): editar `T2` não toca `T1`; excluir sem/com
  dependente; instrutor atribuído-e-desativado permanece; operador **não** exclui.

### Key Entities

- **Disciplina** (`disciplinas`): a grade do curso — código no curso, nome, CH prevista (tempos), ordem,
  modo padrão, situação. `codigo` = `ID_Grade` verbatim da v2.0. Única por (curso, código) **entre
  ativas**.
- **Disciplina na turma** (`turma_disciplina`, `TDI-`): a instância — período previsto **da turma**,
  origem do período, situação. Nasce com a turma (spec 009 `FR-032`).
- **Instrutor da disciplina na turma** (`turma_disciplina_instrutor`): um por instrutor, com CH prevista
  rateada e (LIQ-3) papel.
- **Habilitação** (`instrutor_disciplina`, `VIN-`): quem **pode** ser oferecido; escrita na ficha do
  instrutor (spec 006).
- **Unidade de Ensino** (`unidades_ensino`): subdivisão da disciplina declarada no currículo — número,
  tópico, CH prevista, fundamento normativo, origem; grão de `registros_aula` (UE-1).
- **Parâmetro** (`config_parametros`): `disciplinas.aviso_inicio_dias`.
- **Rastro de exclusão** (tabela a decidir em Q-09): quem, o quê, quando; append-only.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: De `/inicio`, chega-se à disciplina de uma turma em **≤ 3 cliques**, e **100%** das telas
  novas têm caminho clicável (varredura verde).
- **SC-002**: Código repetido **no mesmo curso** é recusado **pelo banco** em **100%** das tentativas —
  inclusive por chamada direta ao PostgREST —, com mensagem em português e sem texto cru (critério 3).
- **SC-003**: Mesmo código em cursos diferentes aceito em **100%**.
- **SC-004**: Editar período/instrutor em `T2` altera **exatamente 0** linhas de `T1` — provado com as
  4 duplas reais `T1 2026 / T2 2026` (critério 4, **CRÍTICO**).
- **SC-005**: Modo dividido: soma das parcelas = CH da disciplina em **100%** dos casos, na função pura
  **e** no banco (critério 5); simultâneo: **cada** instrutor = 100% da CH.
- **SC-006**: Exclusão de disciplina/UE **sem** dependente: some, rastro gravado com quem/o quê/quando,
  em **100%**; **com** dependente: recusa **pelo banco** com *"desative em vez de excluir"* em **100%**,
  para disciplina **e** UE — **e nenhuma das 175 disciplinas reais é excluível** (0 sem dependente).
- **SC-007**: Depois da carga: **toda** UE do currículo com destino decidido está no banco com
  `fundamento_normativo`; a conferência currículo × banco dá **0 diferença sem explicação**; pgTAP
  `FR-024` (soma fecha) verde em **100%** das disciplinas carregadas.
- **SC-008**: Nos cursos/disciplinas sem UE, **0** avisos e **0** exigências ligadas a UE.
- **SC-009**: Instrutor atribuído e depois desabilitado/desativado continua na edição em **100%** dos
  casos e **nunca** aparece como opção nova.
- **SC-010**: Desativar disciplina a remove de **100%** das listas de nova atribuição e mantém **100%**
  do histórico.
- **SC-011**: **100%** das listas/seletores/filtros de instrutor por antiguidade (varredura em todas as
  ocorrências, não amostragem).
- **SC-012**: **0** campos digitáveis de CH de instrutor; **0** violações das varreduras existentes.
- **SC-013**: Período `NULL` **nunca** sinaliza "início próximo" nem "atrasada"; as 121 linhas
  `nao_informado` seguem `NULL` depois da fatia, salvo edição manual com rastro.

---

## Assumptions

- **Convenção de CH**: 1 TA = 1 hora de carga (comentário de `disciplinas.carga_horaria_tempos`) — logo
  a CH do currículo (horas) entra em `ch_prevista_tempos` **sem conversão**. Se Q-12 disser outra coisa,
  a carga muda e as 4 divergências de CH mudam de natureza.
- **Perfis**: a matriz **não** muda nesta fatia; permissões novas (excluir) são conferidas dentro da
  RPC sobre permissões **existentes** (`disciplinas.criar`).
- **Rota**: `/disciplinas` é a rota (documento 24 §1, menu MENU-1); ficha própria de disciplina
  (`/disciplinas/[id]`) **não** é assumida — a edição é na própria tela (Q-15 decide formulário × painel).
- **Componentes**: `TabelaDensa`, `FiltroAvancado`, `CardKpi`, `BadgeStatus`, `SeletorInstrutor`,
  `SeletorTurma`, `DialogoConfirmacao`, `BotaoLimparFiltros` existem; nenhum componente concorrente.
- **Nada no remoto nesta rodada**; a carga das UEs vai ao remoto **só** no PR correspondente, com cópia
  prévia, depois de CI verde e conferência de Bernardo.

---

## Achados — medidos, não corrigidos aqui

- **A-1** · `modo_atribuicao_padrao = 'simultaneo'` em **0 de 175**, e o documento 04 (`RN-MAT-05`) diz
  que o ETL marcaria três práticas de fim de curso. **Não marcou**; e **6 nomes perderam "FIM"** na
  origem (`LEVANTAMENTO HIDROGRÁFICO DE  DE CURSO`), o que faz o casamento por nome impossível **e** a
  regra proíbe inferir. ✅ **Decidido (Q-02, 24/09/2026): 3 linhas nomeadas na migration; o resto pela
  tela** (`FR-040`).
- **A-2** · A unicidade existe, mas **só entre ativas** (índice parcial + gatilho). A "duplicata"
  `C-Esp-ALH`/`ALH-II` é `ativo` × `inativo` — hoje **legal** pela regra do banco. Se desativar libera o
  código é a pergunta certa, não "como sanear" (**Q-04**).
- **A-3** · `RN-MAT-02` (`C-Ap-FR`): **0** duplicatas em qualquer status (13 linhas, 0 inativas, 0 sem
  previsão). ✅ **Aposentada por Bernardo em 24/09/2026 (Q-16)** — emenda no documento 04 `.md`.
- **A-4** · CH rateada: **0 de 210** em `turma_disciplina.ch_prevista_por_instrutor` e **NULL nas 96**
  de `turma_disciplina_instrutor.ch_prevista_tempos`. Há **duas colunas** para o mesmo dado (uma
  `numeric(6,2)` na linha, outra por instrutor na junção) — esta spec escreve **só** na junção
  (`FR-031`); a da linha fica como resquício (D-7).
- **A-5** · **Quatro** lugares de "instrutor da disciplina", não três: o pedido nomeou
  `disciplinas.instrutores_atribuidos`, `instrutor_disciplina` e `turma_disciplina_instrutor`; o banco
  tem ainda **`turma_disciplina.instrutor_id`** (79 preenchidos, todos também na junção; 6 só na junção),
  cujo comentário diz ser *"a coluna de onde a LIQ do Épico 11 lê"*. ✅ **Decidido (Q-01): a junção é a
  fonte; os resquícios são aposentados** (`FR-032`, `FR-032.1`).
- **A-6** · `EST-QF-APOC` é PDF **sem camada de texto**: "sem UE" nunca foi medido — foi **não lido**.
- **A-7** · O extrator não lê o ordinal em `c-exp-metocof_0.pdf` (5 × `?`) e trunca um nome; e há
  "DE DE" em dois estágios — na extração; se está no PDF, é do currículo (análise §6).
- **A-8** · `disciplinas` sem dependente: **0 de 175** — D-B1 alcança **só** cadastro novo por engano.
  É o que a autorização de 15/09/2026 já dizia para instrutor, e vale igual aqui.
- **A-9** · A RPC `excluir_instrutor` **não grava rastro**; D-B1 exige — o modelo é reaproveitado, o
  rastro é novo (Q-09).
- **A-10** · 55 disciplinas **sem nenhum habilitado**: a atribuição nasce vazia em um terço da base.
- **A-11** · `registros_aula` alcança a disciplina hoje **só** por `disciplina_codigo_legado_v1` (texto,
  1.566 casam) — a RPC de exclusão MUST contá-lo como impedimento (`FR-022`), senão uma disciplina "sem
  FK" com 100 aulas históricas seria excluível.

---

## Divergências reportadas, não corrigidas (numeradas — nenhuma resolvida em silêncio)

- **D-1** · Documento 42 põe o **critério 7** nesta fatia; a spec 009 (T-1, 16/09/2026) o levou inteiro
  à fatia (a), onde foi feito. Esta fatia **só lê** o regime vigente. Documento 42 **não alterado**.
- **D-2** · `RF-MATERIAS-05` fala em *"instrutores designados da disciplina"*; o próprio requisito anota
  que a seleção efetiva é **por turma**. `disciplinas.instrutores_atribuidos` fica intocada (`FR-032`).
- **D-3** · O pedido enumera **três** lugares de instrutor; o banco tem **quatro** (A-5). A spec não
  cria um quinto e não escolhe entre os quatro — **Q-01**.
- **D-4** · `RN-MAT-05` afirma *"O ETL marca `simultaneo` nas três disciplinas nomeadas"* — o ETL
  **não** marcou (0 de 175). Regra não alterada; o dado é que não a cumpre (A-1).
- **D-5** · `RF-DADOS-06` diz `unique (curso_id, codigo)`; o implementado é **parcial** (`where status =
  'ativo'`) sobre `cod_disciplina`. Comportamento diferente do texto: código de inativa é reutilizável.
  ✅ **Confirmado como o comportamento pretendido (Q-04, 24/09/2026)**; o documento 02 não foi emendado.
- **D-6** · Documento 25 lista `/disciplinas` com `curso, status, busca`; a cascata exige `turma` e os
  filtros da spec 037 exigem `instrutor` e a situação. O contrato tipado (`FR-002`) é a fonte; o
  documento 25 **não** foi emendado.
- **D-7** · Duas colunas para CH rateada (`turma_disciplina.ch_prevista_por_instrutor` e
  `turma_disciplina_instrutor.ch_prevista_tempos`); a spec escreve numa só (A-4). Aposentar a outra é
  decisão de schema, **Q-01** junto com `instrutor_id`.
- **D-8** · Spec 002 e `CLAUDE.md` dizem que a carga das UEs é do **Épico 2**; o Épico 2 não a fez (por
  decisão) e ela **entra aqui** (`FR-064..067`) — registrado, sem reescrever o passado.
- **D-9** · Documento 05 §9.1 e BRIEF dizem *"134 disciplinas, 21 currículos"*; o extrator lê **135**
  registros (um sem lista de UE). A frase dos documentos conta as **com UE** — correta, mas a
  TOPOGRAFIA de `C-Ap-FR` não aparece em lugar nenhum. Não emendado.
- **D-10** · Documento 04 cita `distribuirCargaEntreInstrutores` em `lib/dominio/carga-instrutor.ts`;
  o repositório tem `carga-horaria.ts` (`RN-2027-06`) e `carga-semanal.ts`. O nome definitivo é do
  plano; a regra é a mesma.
- **D-11** · O pedido diz *"as três conhecidas sem UE"*; a medição confirma **duas** sem UE por modelo e
  **uma** **ilegível** (A-6). A diferença muda o que `FR-063` grava para `EST-QF-APOC`.

---

## Divisão em PRs — ✅ APROVADA por Bernardo Villas Boas em 24/09/2026

| PR | Conteúdo | Por que separado |
|---|---|---|
| **PR 1 — banco** | RPCs `excluir_disciplina` / `excluir_unidade_ensino` + impedimentos + rastro (Q-09); gatilho da soma do rateio (Q-03); parâmetro `disciplinas.aviso_inicio_dias`; marcador de curso/disciplina sem UE (Q-05/`FR-063`); pgTAP e RLS negativa (operador não exclui; `42501`/`23503` conferidos pelo código); tipos gerados | É o que **vai ao remoto** (AMBIENTE-1) e precisa de plano de reversão próprio; sem tela, a conferência é toda por teste — e mescla **antes** de a tela existir, como o PR 1 da 009 |
| **PR 2 — carga das UEs** | tabela de pareamento revisada (Q-05), `INSERT … SELECT` com `fundamento_normativo` lido dos PDFs, conferência currículo × banco reexecutável (`FR-067`), correções mínimas do extrator se Q-05 exigir (ordinal `?`, nome truncado) | **Dado normativo** — exige leitura humana dos 15 PDFs sem Ofício no nome e as decisões de Q-05; misturá-lo ao PR de estrutura faria o PR de banco esperar por leitura de PDF, e misturá-lo à tela faria a tela esperar pelo dado. Vai ao remoto com **cópia prévia** e conferência de contagem |
| **PR 3 — telas** | `/disciplinas` (cascata, tabela expansível, URL), CRUD + desativar/reativar/excluir, período e instrutor por turma, rateio (função pura + tela), indicadores/filtros/gráfico, seção de UE (CRUD), menu ligado, e2e por clique | Depende dos dois anteriores mesclados e aplicados; é o maior e o único que Bernardo confere **na tela** |

**Alternativa recusada:** PR único — o de banco vai ao remoto antes do merge, e um PR que mistura
migration com 20 telas não tem plano de reversão legível. **Alternativa aceitável se Q-05 sair rápido:**
fundir PR 1 e PR 2 (uma ida só ao remoto, uma cópia só).

---

## Perguntas do specify — ✅ TODAS DECIDIDAS em 24/09/2026 (registro histórico)

*(A tabela abaixo é a que o specify entregou, mantida como registro do que foi perguntado e
recomendado. **A decisão de cada uma está em *Clarifications*, e não é sempre a recomendação** — Q-03
mudou a regra do resto em relação à v2.0; Q-16 foi decidida por medição. As perguntas **novas** que o
clarify produziu estão no lote 2, abaixo desta tabela.)*

| # | Pergunta | Opções | Recomendação (não decisão) | Muda |
|---|---|---|---|---|
| **Q-01** | Há **quatro** lugares de "instrutor da disciplina" (A-5). O que esta fatia faz com **`turma_disciplina.instrutor_id`** (79 preenchidos, "de onde a LIQ lê") e com **`ch_prevista_por_instrutor`**? | (a) a junção é a fonte; `instrutor_id` e a coluna de CH da linha viram **aposentadas** (comentário `[APOSENTADA — v2.1]`, sem `drop`) e a LIQ (Épico 11) passa a ler a junção; (b) manter `instrutor_id` **sincronizado** por gatilho = o "titular" (primeiro por antiguidade) — antecipa LIQ-3; (c) esta fatia não toca em `instrutor_id` e a decisão fica para o Épico 11 | **(a)** — a junção já tem os 79 e mais 6; dois lugares para o mesmo fato é a segunda fonte de verdade que o BRIEF proíbe; (b) decide LIQ-3 por tabela | banco (schema), LIQ |
| **Q-02** | Quais disciplinas ficam em **modo simultâneo**, e o que significa o valor **`herdar`** do ENUM? | (a) Bernardo nomeia a lista pelos códigos (as 6 de "fim de curso" da análise §4.5 são candidatas), marcada por migration com registro; (b) só a tela, sem carga — todas ficam `dividido` até alguém marcar; (c) `herdar` = "a turma herda o padrão da disciplina" e ganha coluna por turma | **(a)** para a lista (a regra proíbe inferir; a lista tem de vir de quem conhece) **e** definir `herdar` como valor **sem uso** desta fatia (não há coluna por turma) | banco (dado), rateio |
| **Q-03** | Rateio: como distribuir o **resto** (10 tempos entre 3), e o que vale para as **96** linhas com `ch_prevista_tempos` **NULL**? | (a) resto para o(s) **mais antigo(s)**, um a um, e `NULL` = "dividir igualmente" **em leitura** (não gravar); (b) resto no **último** da lista (v2.0, spec 032 `FR-007`) e a carga preenche as 96; (c) permitir meio tempo (`numeric`) — soma exata sempre | **(a)**: soma exata, determinística, e não escreve dado que ninguém informou; (c) cria CH fracionária que o DSA não lança | dominio, banco (gatilho), dado |
| **Q-04** | A unicidade vale **só entre ativas**. Desativar libera o código para outra? Excluir libera? E `ALH-II` (ativo × inativo) fica como está? | (a) sim aos três — é o comportamento do índice de hoje; `ALH-II` fica, e reativar a inativa é recusada enquanto a ativa existir; (b) unicidade **total** (sem `where`) — exige renomear a `ALH-II` inativa antes; (c) só excluir libera | **(a)** — é o que o banco já faz e o `RF-DADOS-06` quer evitar é duplicata **viva**; (b) contraria regra 4 na prática | banco (índice), tela |
| **Q-05** | As **exceções da carga** (análise §4): 7 UEs de `HN-2101` (banco tem `I` + `I-I`); 3 de `MATFIS` (`MAT` + `FIS`); `C-Exp-Metoc-OF-SP` `IV` emprestada; TOPOGRAFIA sem lista; `EST-QF-APOC` ilegível; 5 `AMBIENTAÇÃO VIRTUAL` | por caso: **(i)** desdobradas: Bernardo lê o currículo e diz UE por metade — carga por UE; ou funde as duas linhas do banco (muda `turma_disciplina` e histórico); **(ii)** emprestada: replicar as 5 UEs no curso SP com `fundamento_normativo` do currículo de origem, ou deixar sem UE; **(iii)** TOPOGRAFIA: Bernardo confirma no PDF; **(iv)** APOC: OCR/transcrição agora, ou marcar "não legível" e seguir sem UE; **(v)** AMBIENTAÇÃO: sem UE, marcada | (i) carga **por UE** com leitura de Bernardo, sem fundir linhas; (ii) **sem UE** até norma própria; (iii) confirmar; (iv) marcar "não legível" agora, transcrição como pendência; (v) sem UE | dado, carga |
| **Q-06** | Quando a **soma das UE deixa de fechar** com a CH da disciplina (edição de UE, UE criada no sistema, mudança de CH da disciplina) — e nas 3 divergências reais de CH (análise §4.1): aviso ou recusa? qual lado vale? | (a) **aviso** na disciplina (`RN-DEG-02`-like), soma visível, nunca bloqueio; CH do banco fica e a divergência com o currículo é anotada; (b) gatilho recusa gravação que quebra a soma; (c) CH da disciplina passa a ser **derivada** da soma das UEs (view) — deixa de ser digitável onde há UE | **(a)** para a tela; **(c)** é conceitualmente o que a UE-1 diz ("disciplina é agregado"), mas muda 175 linhas de digitável para derivada e é decisão de schema — recomendação: (a) agora, (c) como pergunta para o plano | banco, tela |
| **Q-07** | Período por turma **fora da janela da turma**: aviso ou recusa? (v2.0 specs 029/030 **bloqueavam**) | (a) aviso, grava (`RN-DEG-02`); (b) recusa pelo banco (paridade com a v2.0); (c) recusa só se a turma tem janela; sem janela grava | **(c)** — é o que a v2.0 fazia (`FR-006`/`FR-007` da 029) e paridade vem antes | banco (gatilho), tela |
| **Q-08** | `FR-032.4`: grade muda com turma existente. Disciplina **acrescentada**: nasce linha em quais turmas? **Desativada**: a linha some de onde? | (a) acrescentada → linha `nao_informado` em turmas **não concluídas/não canceladas**, por gatilho; desativada → linha fica, sai das listas de nova atribuição, aparece como inativa na turma; (b) nada automático — a pessoa acrescenta por turma; (c) só turmas `planejada` | **(a)** — simetria com o nascimento da turma e nada apagado | banco (gatilho), tela |
| **Q-09** | **Onde mora o rastro** de exclusão (D-B1)? | (a) tabela nova `exclusoes_registradas` append-only (quem, tabela, id, código, retrato JSON, quando), gatilho anti-`UPDATE/DELETE/TRUNCATE` inclusive `service_role`, legível por `auditoria.ler`; (b) reutilizar `migracao_log` (é de migração, regra 5); (c) log do servidor | **(a)** — (b) mistura naturezas e (c) não é consultável pela Divisão | banco (tabela nova) |
| **Q-10** | Quem edita **período e instrutor por turma**: `disciplinas.editar` (inclui **operador**), como as policies já fazem? | (a) sim, como está; (b) recorte novo (`horarios.criar`?) — muda a matriz | **(a)** — a matriz não muda nesta fatia | RLS |
| **Q-11** | `disciplinas.codigo` para disciplina **nova**: formato? Hoje é `ID_Grade` verbatim (`53 - C-Ap-FR - XIII`), sem gerador | (a) sequência em `app` + prefixo `DIS-000001` (padrão geral do `RN-CRUD-03`), entra em `SEQUENCIAS_DE_CODIGO`; (b) reproduzir `N - sigla - cod` (frágil: sigla muda); (c) `codigo` = `id` | **(a)** | banco (sequência) |
| **Q-12** | **1 TA = 1 hora** vale para carregar a CH do currículo (horas) em `ch_prevista_tempos`? (regime tem TA de 45/50 min) | (a) sim — identidade, como o comentário da coluna; (b) converter por regime vigente | **(a)** — é a convenção escrita e a que a spec 006 usou (T011) | carga |
| **Q-13** | Renomear as disciplinas do banco para a **grafia do currículo** (§4.5 — "FIM", "TFM", abreviações)? | (a) não nesta fatia; a UE segue o currículo, a disciplina fica — pendência; (b) sim, por migration registrada (não é o ETL inferindo: é correção de origem nomeada); (c) corrigir na planilha da v2.0 (janela fechada — já há dado no remoto) | **(a)** com pendência `PEND-5b-2`; (b) toca nome que a LIQ imprime | dado |
| **Q-14** | *Concluída* e *atrasada* dos indicadores derivam de quê? | (a) da execução: concluída = `ta_saldo <= 0`; atrasada = hoje > `previsao_termino_efetiva` e saldo > 0; não iniciada = 0 executado; (b) só de datas; (c) de situação gravada | **(a)** — é a fórmula de execução que a spec 037 mandou reaproveitar | dominio |
| **Q-15** | Edição **em linha** (spec 038 tirou a inline de datas por turma) ou **painel/formulário**? | (a) painel para tudo (038); (b) inline só na visão de catálogo; (c) formulário em rota própria | **(a)** | tela |
| **Q-16** | Aposentar a `RN-MAT-02` (0 duplicatas em `C-Ap-FR`; regra transitória)? Exige autorização nominal | (a) sim, com data; (b) manter como no-op documentado | **(b)** até autorização | doc 04 |
| **Q-17** | `RF-INSTR-06.1` (preferências por turma/disciplina) entra aqui, já que a estrutura por turma existe? (spec 006 deixou "depois da fatia (b)") | (a) não — fatia própria; (b) sim, mínimo | **(a)** | escopo |

### Lote 2 — perguntas novas do clarify de 24/09/2026, nenhuma respondida

| # | Pergunta | Opções | Recomendação (não decisão) | Muda |
|---|---|---|---|---|
| **N-1** | Nos **8** currículos sem Ofício, o que vai em `fundamento_normativo`? | (a) *"Currículo `<sigla>` — `<órgão da capa>`, `<ano da capa>`"* (ex.: *Currículo EST-QF-APHID — CIAARA, 2023*), capturado pelo extrator; (b) o nome do arquivo; (c) deixar `NULL` e pendência | **(a)** — é o que o documento diz de si mesmo, legível por máquina; (b) não é fundamento; (c) contraria `FR-023` da spec 002 (coluna obrigatória) | carga |
| **N-2** | `herdar` = "usar o padrão da disciplina" — mas o ENUM está **na própria** `disciplinas.modo_atribuicao_padrao`, onde não há de quem herdar. O que fazer? | (a) `CHECK` proibindo `herdar` em `disciplinas`; o valor fica reservado para uma futura coluna por turma; a tela oferece só `dividido`/`simultaneo`; (b) tratar `herdar` em `disciplinas` como `dividido` (leitura), sem `CHECK`; (c) criar `turma_disciplina.modo_atribuicao` `default 'herdar'` já nesta fatia | **(a)** — dado sem semântica não deve ser gravável; (c) é estrutura sem requisito | banco, tela |
| **N-3** | O pareamento **por UE** das duas disciplinas desdobradas: aceitar a tabela proposta no `FR-065` (`HN-2101` UEs 1–6 → `I`, UE 7 → `I-I`; `MATFIS` UE 1 → `MAT`, UE 2 → `FIS` — as CH fecham exatamente nas quatro) como **revisada**? | (a) sim, como está; (b) Bernardo revisa contra o PDF antes do PR 2; (c) fora da carga, pendência | **(b)** — é o que o Q-05 pediu ("revisada"); as somas exatas tornam a revisão rápida, mas confirmar é dele, não do agente | carga |
| **N-4** | "Turmas não concluídas" do Q-08 inclui as **canceladas**? | (a) não — só `planejada` e `ativa` recebem a linha nova; (b) sim, todas menos `concluida` | **(a)** — turma cancelada não terá lançamento; linha nova nela é ruído na LIQ | banco (gatilho) |
| **N-5** | `disciplinas.codigo` das linhas migradas (`53 - C-Ap-FR - XIII`) e o novo `DIS-NNNNNN` convivem na mesma coluna `unique`. A sequência começa em **1** (`DIS-000001`) — há risco de colisão com algum `codigo` legado? *Medido: nenhum dos 175 começa com `DIS-`* | (a) começa em 1, com asserção pgTAP de que nenhum legado tem o prefixo; (b) começa em 1000 por precaução | **(a)** — medido, não há colisão possível; (b) é superstição | banco |

---

## Fora de escopo — declarado, não esquecido

- **Regime/vigência** (fatia (a), T-1; critério 7 **não** é daqui — D-1).
- **Avaliações e atividades** de qualquer tipo (Épicos 8, 9); **DSA** (6); **cronograma** (7);
  **LIQ/OS** (11) e **LIQ-3**.
- **Preferências do instrutor** `RF-INSTR-06.1` — **confirmado fora** (Q-17, 24/09/2026).
- **D-B1 nos outros cadastros** (`PEND-5b-1`).
- **Qualquer escrita no banco remoto nesta rodada.**
- **Ficha em PDF**; **subunidade (SUE)** como tabela (documento 05: Princípio X).

## Pendências nomeadas

- `PEND-5b-1` — estender D-B1 (excluir com rastro) a cursos, turmas, instrutores e salas; harmonizar
  o rastro de `excluir_instrutor`.
- `PEND-5b-2` — grafia das disciplinas do banco × currículo (Q-13).
- `PEND-5b-3` — transcrição/OCR do currículo de `EST-QF-APOC`.
- `PEND-5b-4` — ~~normalizar `disciplinas.instrutores_atribuidos` ou aposentar~~ ✅ **decidido: aposentar**
  (Q-01, 24/09/2026) — vira tarefa do PR 1, não pendência.
- `PEND-5b-5` — UEs da disciplina emprestada `C-Exp-Metoc-OF-SP` `IV` (fora da carga, `FR-065`).

---

## Regras que pareceram erradas — listadas, não corrigidas

1. **`RN-MAT-05`** diz que o ETL marca `simultaneo` — não marcou (D-4).
2. **`RF-DADOS-06`** descreve `unique (curso_id, codigo)`; o banco tem unicidade **parcial** sobre
   `cod_disciplina` (D-5).
3. ~~**`RN-MAT-02`** se declara transitória e já não tem objeto (A-3).~~ ✅ **Aposentada em 24/09/2026
   por Bernardo Villas Boas (Q-16), sob medição de 0 duplicatas** — emenda no documento 04 `.md`.
4. **`RF-MATERIAS-05`** fala em "da disciplina"; o fato é por turma (D-2).
5. **O comentário de `turma_disciplina.instrutor_id`** afirma que a LIQ lê dali — mas a junção existe e
   tem mais dado (A-5). Um dos dois comentários está vencido.
6. **Documento 05 §9.1** diz que a SUE "não vira tabela enquanto não houver requisito" — a tela de UE
   mostrará o tópico; se Bernardo quiser as subunidades visíveis, é requisito novo, não desta fatia.
7. ~~**D-B1 × regra 4 do `CLAUDE.md`** … precisa de emenda nominal~~ ✅ **Emenda aprovada por Bernardo
   Villas Boas em 24/09/2026 e aplicada no `CLAUDE.md`**: a exceção passa a cobrir instrutor,
   disciplina e unidade de ensino, sempre sem histórico nenhum, por RPC com porteiro e rastro; nenhuma
   outra tabela.
