# Feature Specification: Épico 1 — Schema PostgreSQL, RLS e matriz de permissões

**Feature Branch**: `002-schema-rls-permissoes`

**Created**: 2026-08-28

**Status**: Clarificada (28/08/2026, 3 perguntas). **Q2 e Q3 fechadas; Q1 resolvida na origem do dado
e com uma pergunta residual (Q1.b) que não bloqueia o schema.** Pronta para `/speckit-plan`.

**Input**: User description: "Épico 1 — Schema PostgreSQL + RLS + matriz de permissões"

---

## Verificação de premissa (antes de qualquer requisito)

Esta fatia não parte do zero e não parte de memória. Foi lida em disco, em 28/08/2026:

| Insumo | O que foi verificado |
|---|---|
| `docs/BRIEF-v2.1.md` §2, §2.1, §2.2, §3, §11 | Autoridade de nomes: **27 tabelas**, `unidades_ensino` incluída |
| `docs/fase-1/05` §3, §5.2, §6, §7.2–§7.8, §9.1, §10 | Entidades, cardinalidade, unicidade, `CHECK`, vigência, derivados, UE-1, volumes |
| `docs/fase-2/22` §5, §6, §7.3, §8, §10, §11 | Permissão × alcance, as policies, o `GRANT` de `extensions`, auditoria, os 12 testes, as 7 pendências |
| `docs/fase-1/06` (Épico 1) | Escopo, 9 critérios de aceite, riscos |
| `docs/vibe-coding/42` (Épico 1) | Armadilhas do épico |
| `docs/sql-referencia/*.sql` (00 a 05) | Contados em disco: **26 tabelas**, **28 `CREATE TYPE … AS ENUM`**, **74 policies**, **0 policies de `DELETE`** |
| `.specify/memory/constitution.md` | Os 11 princípios, íntegros |

**O que já existe e não se re-especifica.** O projeto Supabase `cqhpfuaweoyglhtrckcp` está criado e
alcançável (conexão verificada em 26/08/2026). O schema está **vazio** — esta fatia é a primeira a
escrever nele.

**⚠️ Correção de 28/08/2026 — o arnês do Épico 0 está pronto.** A primeira redação desta seção
afirmava que `supabase/` **não existia em disco** e listava três bloqueios. **Era erro**: a afirmação
saiu da tabela *Estado atual* do `CLAUDE.md`, que está desatualizada, e não de leitura do disco. O
`git status` já mostrava `?? supabase/`. Conferido agora, arquivo a arquivo:

| Item do Épico 0 | Estado real |
|---|---|
| §6.2 fronteiras de ESLint + teste que prova a regra ativa | ✅ 2 regras em `eslint.config.mjs` + `tests/unidade/lint/fronteiras.test.ts` com fixtures |
| §6.3 `supabase init` | ✅ `supabase/config.toml` (`project_id = "ciaara-11-v2-1"`), `migrations/`, `seed.sql`, `.gitignore` |
| §6.3 clientes de `lib/supabase/` | ✅ os quatro: `client`, `server`, `middleware`, `admin` |
| §6.5 suítes vazias | ✅ pgTAP (`supabase/tests/invariantes.test.sql`), Vitest, Playwright, `tests/invariantes/rls/rls.test.ts` |
| §6.6 scripts do documento 24 §7 | ✅ **28 scripts**, incluindo `verificar` e `verificar:tudo` |
| §6.7 `.github/workflows/ci.yml` | ⬜ **`.github/` não existe** |
| §6.8 primeiro deploy verde na Vercel | ⬜ |

**Nada do Épico 0 bloqueia esta fatia.** Restam §6.7 e §6.8, que são portão de entrega, não de início.

**Dois fatos que a conferência revelou e afetam o plano.** O banco local é **PostgreSQL 17**
(`config.toml`, `major_version = 17`), enquanto os seis scripts de referência foram validados contra
**PG16** — nada do que eles usam mudou entre as versões, mas a validação não é literalmente
transferível e um `db:reset` cedo é o que a confirma. E o **stub pgTAP existente afirma que `public`
tem zero tabelas**: ele **vai falhar** na primeira migration, e é a primeira coisa a substituir.

**A relação com `docs/sql-referencia/` precisa ser dita sem ambiguidade.** Os seis scripts foram
escritos, aplicados em ordem contra um PostgreSQL 16 real e validados com sessão autenticada de
verdade. **Eles são ponto de partida revisável, não cópia** (BRIEF §11). Onde o BRIEF §2.1 ou §2.2
divergirem deles, **o BRIEF vence**, e a divergência é do script — que nasceu antes da decisão UE-1.
As três divergências conhecidas estão em *Assumptions*.

---

## Restrição fechada — UE-1, rota (b)

**Decidida por Bernardo em 26/08/2026.** Não é pergunta desta spec; é restrição de entrada. Registro
em `docs/fase-1/05` §9.1, BRIEF §2.2 e na constitution. **A comparação rota (a) × rota (b) não é
reaberta aqui.**

1. `unidades_ensino` é entidade de primeira classe — FK `disciplina_id → disciplinas(id)`,
   `unique (disciplina_id, numero_ue)`, `numero_ue > 0`.
2. **`registros_aula` nasce no grão de Unidade de Ensino**, não no grão de disciplina.
3. "CH executada da disciplina" é **derivada** — VIEW ou `GENERATED`, jamais segunda coluna gravada.
4. CHD, DSA, Cronograma e motor preditivo leem o **agregado**, não o fato bruto — salvo o diário de
   classe, onde a UE é o objeto explícito da tela.

**O que a decisão não autoriza.** Ela fixa o grão e a entidade. Não define atributo de
`unidades_ensino` além dos cinco que o documento 05 §9.1 nomeia (`numero_ue`, `topico`,
`ch_prevista_tempos`, `tecnica_ensino_sugerida`, `status`), e **não cria tela nova** — o diário de
classe por UE é funcionalidade, e funcionalidade nova esbarra no Princípio X (Paridade Antes de
Novidade).

**A UE tem fonte documental, e ela foi lida.** A pergunta Q1 — de onde vêm as Unidades de Ensino —
foi respondida por Bernardo em 28/08/2026: **elas estão nos currículos oficiais da DEnsM**, um PDF por
curso, em `SIS11/Curriculos/`. Os 24 currículos foram processados e **572 UEs foram extraídas**. Ver
*Clarifications* Q1 e a seção *Catálogo de Unidades de Ensino*.

---

## Catálogo de Unidades de Ensino — extraído dos currículos da DEnsM

**A UE deixa de ser entidade sem dado.** Cada currículo aprovado pela Diretoria de Ensino da Marinha
traz, por disciplina, a seção `LISTA DE UNIDADES DE ENSINO`: número, tópico e carga horária, com as
subunidades detalhadas abaixo de cada uma. É exatamente a estrutura que a decisão UE-1 exige, e ela
já existe — aprovada, assinada e vigente.

Extração por `scripts/etl/extrair_unidades_ensino.py`, com saída versionada em
`scripts/etl/dados/unidades_ensino.{csv,json}`:

| Métrica | Valor |
|---|---|
| Currículos processados | **24** — um por curso/estágio |
| Currículos que declaram UE | **21** |
| Disciplinas com UE | **134** |
| **Unidades de Ensino** | **572** |
| Subunidades de Ensino (SUE) | 2.446 |
| CH total distribuída em UE | 7.231 horas |
| `numero_ue` máximo | 16 |
| UE por disciplina (mín / médio / máx) | 1 / 4,3 / 16 |

**A invariante que prova a leitura.** Para **134 de 134** disciplinas, a soma das CH das suas UEs
**fecha exatamente** com a CH declarada da disciplina. Zero divergências, zero UE sem CH. Não é
elegância de parser: é a única prova disponível de que o currículo foi lido certo, e ela é o teste de
regressão do extrator. As três correções que produziram esse resultado estão comentadas no ponto
exato do script — cada uma nomeando o currículo que a revelou.

**Duas das garantias exigidas pelo FR-021 já estão verificadas contra o dado real**, antes de existir
qualquer implementação:

- **numeração sem repetição dentro da disciplina** — zero violações nas 572 UEs;
- **número sempre positivo** — zero UEs com número menor ou igual a zero.

**Três currículos não entregam UE, e o motivo é diferente em cada caso:**

| Currículo | Situação | Encaminhamento |
|---|---|---|
| `marinha_do_brasil_-_curriculo-do-est-qf-apoc.pdf` (Est-QF-APOC) | **PDF digitalizado, sem camada de texto.** 6 páginas de imagem | Exige OCR ou transcrição manual. Não é limitação do extrator |
| `of10-82-2024-densm-ana-c-espc-fr.pdf` (C-Espc-FR) | **Modelo por competências**, não por UE: `COMPETÊNCIA TÉCNICA` → `INDICADORES` → `OBJETIVOS DA APRENDIZAGEM`. Não existe seção `LISTA DE UNIDADES DE ENSINO` | **Decisão pendente — Q1.b.** Ver *Clarifications* |
| `of10-82-2024-densm-anb-c-espc-hn.pdf` (C-Espc-HN) | Idem | Idem |

**O que a extração não resolve, e precisa ser dito.** O catálogo diz **quais UEs existem**. Ele não
diz **a qual UE cada um dos 1.566 registros de aula históricos pertence** — a base da v2.0 nunca
registrou essa informação. Essa é a pergunta residual **Q1.b**, e ela é do **Épico 2**, não desta
fatia: o schema fica pronto de qualquer forma, e o grão é o mesmo nas três saídas possíveis.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Reconstruir a base inteira do zero, com as regras já impostas (Priority: P1)

Quem mantém o sistema executa um comando e obtém, em minutos, uma base vazia porém **estruturalmente
completa**: as 27 entidades do BRIEF §2.1, com as regras de identidade, unicidade, domínio e vigência
**já em vigor**. A partir daqui, a classe inteira de defeito de dado que a v2.0 combatia por
convenção — código de disciplina repetido dentro do curso, vínculo apontando para registro
inexistente, situação em branco, dois regimes vigentes ao mesmo tempo — **deixa de ser construível**.

**Why this priority**: sem esta fatia não há Épico 2, e sem Épico 2 não há sistema. É a única de que
tudo o mais depende. Além disso, **o grão do registro de execução se escolhe na primeira construção**
— errar aqui custa reescrita, não correção.

**Independent Test**: reconstruir do zero em ambiente local; conferir o inventário de entidades e de
regras; **tentar violar cada regra de FR-008 a FR-018 e esperar a recusa**. Entrega valor mesmo antes
de qualquer regra de acesso: é a base que a carga do Épico 2 vai povoar.

**Acceptance Scenarios**:

1. **Given** uma base vazia, **When** a construção é executada, **Then** as 27 entidades existem, sem
   erro e **sem nenhuma etapa manual**.
2. **Given** a base construída, **When** se tenta cadastrar duas disciplinas com o mesmo código no
   mesmo curso, **Then** a gravação é recusada, e a mensagem que chega ao usuário é em português e
   específica — nunca o texto cru do sistema de dados.
3. **Given** um curso com um regime vigente desde 01/01/2026, **When** se tenta abrir um segundo
   regime **do mesmo tipo** com período sobreposto, **Then** a gravação é recusada.
4. **Given** uma atividade não letiva de escopo **global**, **When** se informa uma turma, **Then** a
   gravação é recusada; e o simétrico: atividade de escopo **de turma** sem turma também é recusada.
5. **Given** uma disciplina com Unidades de Ensino, **When** se tenta cadastrar duas unidades com o
   mesmo número na mesma disciplina, **Then** a gravação é recusada; e número zero ou negativo também.
6. **Given** um curso que já tem turma, **When** se tenta removê-lo, **Then** a remoção é recusada —
   nada que seja referenciado por outro registro pode ser apagado.
7. **Given** um planejamento anual já salvo para 2027, **When** se tenta salvar um segundo para o
   mesmo ano, **Then** a gravação é recusada.

---

### User Story 2 — Autorização que vive no dado e se troca sem implantação (Priority: P2)

O Administrador precisa mudar quem pode lançar aula. Ele altera **uma linha da matriz de permissões**.
Não há mudança de código, não há implantação, não há janela de manutenção. E um Operador com escopo
restrito a cursos expeditos que tente consultar a turma de um curso regular **não recebe erro: recebe
nada** — porque a fronteira é o dado, não a tela.

**Why this priority**: `RNF-SEG-02` deixa de ser disciplina de código e vira garantia do sistema de
dados. É o segundo maior ganho estrutural da migração, e é o que torna o Épico 3 uma tela sobre dado
existente, em vez de um sistema de permissões novo.

**Independent Test**: com sessão autenticada de verdade, perfil a perfil, em transação descartável.
Para cada perfil, provar o **negativo**: o que ele não pode ler e não pode escrever é recusado pelo
próprio repositório de dados. Depois, alterar uma linha da matriz e observar o comportamento mudar
**sem nenhuma alteração de código**.

**Acceptance Scenarios**:

1. **Given** a matriz de permissões povoada, **When** um Operador de escopo expedito consulta turmas,
   **Then** só enxerga as de cursos expeditos (T-01).
2. **Given** o mesmo Operador, **When** ele tenta **reatribuir** um registro de aula que alcança para
   uma turma que **não** alcança, **Then** a operação é recusada — a linha não sai do escopo dele
   levando o dado junto (T-03).
3. **Given** um usuário de perfil de visualização, **When** ele tenta escrever em qualquer lugar,
   **Then** é recusado em todos (T-04).
4. **Given** um usuário que não é Administrador, **When** ele tenta elevar o próprio perfil a
   Administrador, **Then** é recusado — **e a recusa depende de perceber o que mudou**, não apenas o
   estado final, porque avaliar só o estado final aprovaria a escalada (T-05).
5. **Given** qualquer perfil, **When** se tenta apagar qualquer registro, **Then** é recusado, por
   duas proteções independentes: não há regra que permita, e o privilégio de apagar não é concedido
   (T-07).
6. **Given** a linha que autoriza o Operador a editar disciplina, **When** ela é desligada, **Then**
   ele deixa de poder editar disciplina — **sem nenhuma alteração de código** (critério 7 do doc 06).
7. **Given** uma sessão autenticada **sem cadastro de usuário correspondente**, **When** ela consulta
   qualquer coisa, **Then** não alcança nada (T-09).
8. **Given** um usuário cuja conta é desativada, **When** ele faz a requisição seguinte, **Then**
   perde o acesso imediatamente (T-11).
9. **Given** um Operador, **When** ele tenta criar um evento de escopo **global**, **Then** é recusado
   — ele lança a palestra da turma dele, não decreta feriado para o Centro (T-10).

---

### User Story 3 — O registro no grão de UE, com a disciplina como agregado (Priority: P3)

Quem pergunta "quanta carga horária já foi executada nesta disciplina" recebe **um** número, calculado
a partir das Unidades de Ensino executadas. Não existe um segundo valor gravado para a mesma
grandeza — e portanto não existe a pergunta "qual dos dois está certo".

**Why this priority**: é a consequência estrutural da decisão UE-1, e o risco vivo nomeado no
documento 06 — *"registrar no grão de disciplina por hábito"*. Precisa de teste nomeado que prove o
grão, não de boa intenção.

**Independent Test**: cadastrar unidades e lançar execução contra elas; conferir que a carga horária
executada da disciplina corresponde à soma das unidades; tentar gravar qualquer grandeza derivada e
esperar a recusa; procurar um campo editável de carga horária executada e não encontrar nenhum.

**Acceptance Scenarios**:

1. **Given** uma disciplina com 3 unidades e execução lançada contra duas delas, **When** se consulta
   a carga horária executada da disciplina, **Then** o valor é a soma das unidades executadas.
2. **Given** a base construída, **When** se tenta gravar diretamente qualquer grandeza derivada,
   **Then** a gravação é recusada (critério 8 do doc 06).
3. **Given** o cadastro de disciplina, **When** se procura um campo editável de carga horária
   executada, **Then** ele **não existe** — a violação é impossível, não apenas improvável.
4. **Given** o cadastro de instrutor, **When** se procura um campo editável de carga horária,
   **Then** ele **não existe**: a grandeza é sempre calculada, nunca digitada (`RN-INST-04`).
5. **Given** o catálogo carregado a partir dos currículos, **When** se soma a carga horária das
   unidades de qualquer disciplina, **Then** o total é igual à carga horária declarada da disciplina.

---

### User Story 4 — Parâmetro normativo como dado, nunca como constante (Priority: P4)

Uma revisão da DGPM muda o teto de AEC de 10% para 12%. Quem administra o sistema altera **um valor
cadastrado**. Não há recompilação, não há implantação, e o valor anterior continua legível pela
vigência.

**Why this priority**: é o Princípio VII, e é o que impede que os tetos voltem a ser números fixos
espalhados pelo código, como eram na v2.0. Depende só do cadastro e da carga inicial, e por isso é
destacável das três anteriores.

**Independent Test**: consultar os parâmetros e conferir os tetos, as três faixas de carga horária
docente e o limite diário de tempos de aula, cada um com a norma de origem; verificar por busca no
código que nenhum desses números aparece escrito ali.

**Acceptance Scenarios**:

1. **Given** a carga inicial aplicada, **When** se consultam os parâmetros, **Then** os tetos AEC 10%,
   TAD 5% e TR 10% estão lá, cada um com a **norma de origem** (`RNF-NORM-08`).
2. **Given** a carga inicial aplicada, **When** se consultam as faixas de carga horária docente,
   **Then** 20h → 8–12h, 40h → 16–24h e Dedicação Exclusiva → 16–30h estão registradas como **faixa**,
   nunca como o número do regime (`RN-2027-06`).
3. **Given** um lançamento que excede um teto normativo, **When** ele é gravado, **Then** **é aceito**,
   com alerta e justificativa registrada — o teto sinaliza, não impede (`RN-DEG-02`).
4. **Given** uma aula lançada no 9º tempo do dia, **When** ela é gravada, **Then** **é aceita** — é
   autorização normativa explícita nos currículos de CAHO, C-Ap-HN e C-Ap-FR.
5. **Given** um domínio operacional administrável — metodologia, tipo de avaliação, subtipo de
   atividade, classificação de curso —, **When** se acrescenta um valor novo, **Then** basta cadastrar,
   **sem intervenção técnica**.

---

### User Story 5 — Autoria automática e histórico que não se reescreve (Priority: P5)

Toda escrita carrega quem fez e quando, sem que ninguém precise lembrar de preencher. E o registro da
migração — a evidência auditável de que 100% do histórico foi transportado — **não pode ser reescrito
por ninguém**, nem pela credencial que ignora todas as demais regras de acesso.

**Why this priority**: é o Princípio IV, e é a garantia que a carga do Épico 2 vai exercitar no
primeiro dia. É também onde mora uma armadilha já paga: um registro de autoria que pressuponha sessão
autenticada quebra justamente no caminho da carga, que é o menos testado.

**Independent Test**: gravar com sessão autenticada e conferir autor e momento; gravar **sem** sessão
(o caminho da carga) e conferir que a linha entra íntegra; tentar alterar e apagar o registro da
migração, tanto como usuário comum quanto com a credencial de maior privilégio.

**Acceptance Scenarios**:

1. **Given** uma sessão autenticada, **When** um registro é criado, **Then** autor e momento são
   preenchidos a partir da identidade autenticada — e um autor **informado por quem escreve é
   sobrescrito**, não aceito (`RF-AUTH-11`).
2. **Given** o caminho da carga de dados, **sem** sessão autenticada, **When** um registro é criado,
   **Then** ele entra normalmente e **nenhum outro campo é descartado**.
3. **Given** o registro da migração com linhas gravadas, **When** qualquer perfil tenta alterá-lo ou
   apagá-lo, **Then** é recusado — **inclusive para a credencial de maior privilégio** (T-08,
   critério 9 do doc 06).
4. **Given** uma correção a fazer no histórico de migração, **When** ela é registrada, **Then** é um
   **evento novo**, e a linha original permanece intacta.
5. **Given** a quarentena das avaliações da v1.0, **When** um usuário autenticado tenta escrever nela,
   **Then** é recusado.

---

### Edge Cases

Cada item abaixo é uma armadilha **já observada**, não hipótese. Todas produzem defeito silencioso, e
é por isso que estão aqui e não no plano: são o que os testes têm de cobrir.

- **A falha que só o usuário real encontra.** Existe uma classe de erro de permissão em que a
  construção, a carga inicial e o ETL **passam** — porque rodam com privilégio de dono — e **todo
  cadastro feito por usuário autenticado falha**, em produção, no primeiro uso. Foi encontrada na
  validação desta arquitetura, e **nenhuma revisão de código a pegaria**: só um teste com sessão
  autenticada de verdade. É a justificativa concreta do FR-044.
- **A negativa silenciosa.** Uma regra de leitura restritiva demais faz a tela abrir **vazia, sem
  erro**, e o usuário conclui "não há cadastro". O sistema precisa permitir distinguir *"não há"* de
  *"você não vê"*. A apresentação disso é do Épico 4; **a informação tem de existir desde aqui**.
- **A verificação que consulta a si mesma.** Decidir se um usuário pode ler o cadastro de usuários
  exige ler o cadastro de usuários. Sem cuidado explícito, a verificação entra em recursão e a
  consulta aborta.
- **Escopo global alcança todos, de propósito.** Uma atividade sem turma é de escopo global
  (`RN-EVT-02`) e **deve** ser visível a quem tem escopo restrito — esconder feriado e formatura é o
  oposto do desejado. O contrapeso está na escrita, não na leitura (FR-040).
- **A proteção que bloqueia a própria carga.** A trava contra elevação de privilégio, se não liberar
  explicitamente o contexto sem sessão autenticada, **impede a carga dos usuários migrados** e a
  desativação de conta pelo painel administrativo. Já encontrado e corrigido na validação — não
  redescobrir.
- **Vigência em aberto.** "Sem data de término" significa **vigente**, não "terminou". Tratá-la como
  período fechado deixa passar duas vigências simultâneas — exatamente o que FR-017 proíbe.
- **Período em branco é dado legítimo.** Das 210 linhas de grade de turma da base real, **121 têm o
  período vazio**. Exigir preenchimento aqui inviabiliza a carga do Épico 2.
- **O identificador legado não é sequencial.** Ele guarda `CAHO`, `C-Ap-FR 2026`, `1 - CAHO - MAT`.
  **Nada pode presumir formato, ordem ou numeração** a partir dele.
- **Numeração de unidade com lacuna.** Um currículo pode numerar as unidades de uma disciplina com
  saltos. Lacuna é admissível (FR-025); tratá-la como erro recusaria dado normativo válido.

---

## Requirements *(mandatory)*

> **Onde mora o mecanismo.** Esta seção diz **o que** o sistema tem de garantir e **por que**, citando
> a regra `RN-`/`RF-`/`RNF-` de origem, como exige o Princípio I. **Como** cada garantia é obtida —
> a constraint, o índice, a policy, o gatilho, a coluna derivada — é decisão do `/speckit-plan`, e o
> desenho já está escrito em `docs/fase-2/21`, `docs/fase-2/22` e `docs/sql-referencia/`. Separar as
> duas coisas não é formalismo: uma garantia enunciada por comportamento continua verificável se o
> mecanismo mudar, e é o que permite ao teste provar a regra em vez de provar a sintaxe.

### Requisitos funcionais — identidade, rastro e ciclo de vida (US1)

- **FR-001**: O sistema DEVE conter as **27 entidades** nomeadas no BRIEF §2.1 — nem mais, nem menos —
  com o vocabulário do glossário (documento 07). `unidades_ensino` está entre elas.
- **FR-002**: Todo registro DEVE ter um identificador **único e estável**, que não deriva de nenhum
  valor de negócio e nunca se recalcula. Uma chave que se recalcula orfana o histórico que a
  referencia (convenção C-04 da v2.0, preservada).
- **FR-003**: Todo registro migrado da v2.0 DEVE conservar seu **identificador de origem**, obrigatório
  e sem repetição, e as ligações entre registros **NÃO DEVEM** depender dele (`RF-DADOS-01`). É o que
  garante correspondência 1:1 verificável com o histórico.
- **FR-004**: Todo registro migrado DEVE indicar **de onde veio** (`RNF-CONF-01`).
- **FR-005**: A situação de todo registro — **em uso ou fora de uso** — DEVE ser sempre explícita e
  **nunca deduzida da ausência de valor** (`RN-INST-05` generalizada, `RF-DADOS-07`). Foi a ausência
  dessa garantia que deixou os 177 instrutores da base viva sem situação preenchida.
- **FR-006**: Toda escrita DEVE registrar automaticamente **quem fez e quando**, a partir da identidade
  autenticada — **nunca de valor informado por quem escreve** (`RF-AUTH-11`, `RNF-AUD-01`).
- **FR-007**: **Nenhum registro referenciado por outro pode ser removido** (`RF-DADOS-05`). A regra
  vale por padrão; as duas exceções documentadas — o fiscal de uma avaliação e o vínculo com o
  catálogo de avaliações planejadas — apenas **perdem a referência**, sem que nada seja apagado.

### Requisitos funcionais — as regras que o sistema não pode deixar violar (US1)

Cada item abaixo é uma regra de negócio que hoje depende de conferência humana e passa a ser
**impossível de violar**. Todas vêm do documento 05 §7.2 e §7.3.

- **FR-008**: Duas disciplinas do **mesmo curso** não podem ter o mesmo código (`RF-DADOS-06`,
  `RN-MAT-02`). Vale para qualquer curso, presente ou futuro — encerra o contorno específico do
  C-Ap-FR, que não pegou a duplicata equivalente do `C-Esp-ALH`.
- **FR-009**: Não podem existir duas turmas do mesmo curso com o mesmo rótulo no mesmo ano letivo.
- **FR-010**: Um instrutor não pode ser habilitado duas vezes na mesma disciplina.
- **FR-011**: Uma turma não pode ter a mesma disciplina lançada duas vezes na sua grade (LIQ-1).
- **FR-012**: Não pode existir **mais de um planejamento anual salvo** para o mesmo ano
  (`RF-2027-04`). Promover uma versão a oficial é operação única e indivisível: ou a anterior é
  arquivada e a nova entra, ou nada muda.
- **FR-013**: Uma conta de acesso não pode estar ligada a dois usuários.
- **FR-014**: Uma atividade não letiva DEVE ter turma **se e somente se** for de escopo de turma;
  a de escopo global **nunca** tem turma (`RN-EVT-02`).
- **FR-015**: Uma avaliação **NÃO PODE** ter fiscal interno e fiscal externo ao mesmo tempo
  (`RF-AVAL-06`).
- **FR-016**: Uma linha de planejamento **DEVE** apontar para uma disciplina se, e somente se, for uma
  linha de disciplina.
- **FR-017**: Um curso **NÃO PODE** ter dois regimes de horário do mesmo tipo vigentes ao mesmo tempo,
  nem um intervalo descoberto entre eles (`RN-2027-09`). Hoje nada impede o cadastro duplicado, e a
  resolução escolhe um dos dois **em silêncio** — é essa escolha silenciosa que deixa de ser possível.
- **FR-018**: Um curso **NÃO PODE** ter duas assinaturas do mesmo papel vigentes ao mesmo tempo — é o
  que impede um DSA reimpresso sair com duas rubricas do mesmo papel.
- **FR-019**: **Nenhuma edição pode reinterpretar o passado.** Um registro histórico é sempre lido com
  a configuração vigente na data do próprio registro, nunca com a atual (`RN-2027-09`).

> **Sobre a numeração.** Os identificadores `FR-` são **estáveis**: um requisito acrescentado depois
> recebe o próximo número livre e fica na seção temática a que pertence, mesmo fora de ordem numérica.
> Renumerar invalidaria as citações em `plan.md`, `research.md`, `data-model.md`, `tasks.md` e
> `contracts/` — é o mesmo princípio que impede reescrever chave em uso.

### Requisitos funcionais — o grão da execução e o catálogo de UE (US1, US3)

- **FR-020**: A execução letiva DEVE ser registrada no **grão de Unidade de Ensino**, não no grão de
  disciplina (decisão UE-1, rota (b)). A prova é um teste nomeado; o risco declarado no documento 06 é
  justamente registrar no grão de disciplina por hábito.
- **FR-021**: A **Unidade de Ensino** DEVE existir como entidade própria, pertencente a exatamente uma
  disciplina, numerada dentro dela **sem repetição** e com número sempre positivo. Seus atributos DEVEM
  limitar-se aos cinco que o documento 05 §9.1 nomeia — atributo a mais exige pergunta, não suposição.
- **FR-022**: O catálogo de Unidades de Ensino DEVE ser povoado a partir dos **currículos oficiais da
  DEnsM** — 572 unidades, 134 disciplinas, 21 currículos — com número, tópico e carga horária
  **idênticos ao documento aprovado**. É dado normativo, não dado gerado.
- **FR-023**: Cada Unidade de Ensino DEVE registrar a **norma que a aprovou** — o Ofício da DEnsM do
  currículo de origem —, pelo mesmo princípio que obriga todo parâmetro normativo a declarar a sua
  (`RNF-NORM-08`).
- **FR-024**: Para toda disciplina com unidades cadastradas, a **soma das cargas horárias das suas
  unidades DEVE ser igual à carga horária da disciplina**. A regra vale hoje em 134 de 134 casos; o
  teste existe para impedir que uma carga futura a quebre em silêncio.
- **FR-025**: A **numeração das unidades não precisa ser contígua** dentro de uma disciplina. Lacuna é
  admissível e **NÃO DEVE** ser tratada como erro.
- **FR-026**: A **subunidade de ensino NÃO DEVE** ser implementada nesta fatia: não há requisito que a
  peça, e funcionalidade sem requisito esbarra no Princípio X.
- **FR-061**: Um lançamento de execução letiva **NÃO PODE** referenciar uma turma e uma Unidade de
  Ensino pertencentes a **cursos diferentes**; o mesmo vale para uma avaliação e a disciplina que ela
  avalia (`RN-MAT-01`, **Risco: Alto**). A verificação cruzada turma↔curso↔disciplina é obrigatória em
  **todo** ponto de lançamento — foi a facilidade de esquecê-la em um deles que tornou a regra de risco
  alto na v2.0.
- **FR-062**: A garantia de FR-061 DEVE ser imposta **pelo próprio motor**, não por código de
  aplicação, e DEVE ter asserção nomeada `RN-MAT-01` que insira um lançamento cruzando cursos e
  **espere a recusa** — em `registros_aula` **e** em `avaliacoes`.

### Requisitos funcionais — grandezas derivadas (US3)

- **FR-027**: Nenhuma grandeza calculada DEVE ter **duas fontes de verdade**. Um valor derivado é
  sempre recalculado a partir dos dados que o originam, e **tentar gravá-lo DEVE falhar**
  (`RN-CRUD-02`). É a correção estrutural do defeito em que uma propriedade calculada vazou para o
  formulário genérico e apareceu como campo editável.
- **FR-028**: A **carga horária executada de uma disciplina** DEVE ser derivada das suas Unidades de
  Ensino. **NÃO PODE** existir campo gravável dessa grandeza em lugar nenhum.
- **FR-029**: A **carga horária de um instrutor** DEVE ser sempre calculada, nunca digitada
  (`RN-INST-04`). Não existe campo editável de carga horária no cadastro de instrutor — a violação
  passa de improvável a impossível.
- **FR-030**: CHD, DSA, Cronograma e motor preditivo DEVEM ler o **agregado**, não o fato bruto —
  salvo onde a Unidade de Ensino for o objeto explícito da tela.

### Requisitos funcionais — autorização (US2)

- **FR-031**: A decisão de quem pode ler e escrever o quê DEVE ser tomada **pelo próprio repositório
  de dados**, não pela interface (`RNF-SEG-02`, `RF-AUTH-10`). Ocultar botão continua sendo
  conveniência de uso (`RF-AUTH-04`); **a fronteira real é o dado**.
- **FR-032**: Dado sem regra de acesso declarada DEVE ser **inacessível por padrão**. É intencional:
  esquecer de declarar a regra fecha o acesso, nunca o abre.
- **FR-033**: **NÃO DEVE existir nenhum caminho de exclusão física de registro**, por nenhum perfil e
  por nenhuma via. O que a interface chama de "excluir" é sempre inativar. **Isto é regra de negócio,
  não lacuna** (`RN-INST-05` generalizada) — a ausência do caminho é a implementação da regra, e um
  pedido de mudança que o acrescente é recusado sem discussão.
- **FR-034**: A autorização DEVE ser lida de uma **matriz de dados administrável** — perfil, recurso,
  ação —, jamais de perfis escritos dentro da regra de acesso (`RN-RBAC-02`, `RF-CRUD-04`). Trocar uma
  permissão DEVE ser alteração de dado, **sem intervenção técnica e sem nova implantação**.
- **FR-035**: A ação de tirar de uso DEVE chamar-se **desativar**, nunca "excluir": a matriz descreve
  o que o sistema faz, e este sistema não apaga nada.
- **FR-036**: Um usuário **NÃO PODE mover um registro para fora do próprio alcance**. Sem essa
  garantia, um Operador de escopo restrito reatribui um registro que alcança a uma turma que não
  alcança e **leva o dado junto**, sem violar nada.
- **FR-037**: Um usuário **NÃO PODE ampliar o próprio perfil, escopo ou situação** — só o
  Administrador pode (`RN-RBAC-02`). A verificação DEVE enxergar **o que mudou**, e não apenas o
  estado final, porque avaliar só o estado final aprova a escalada.
- **FR-038**: A administração da própria matriz de autorização DEVE ser restrita ao Administrador,
  **fora do sistema que ela governa** — a matriz não pode ser a autoridade sobre quem edita a matriz.
  Vale para a matriz, para o cadastro de usuários e para o vínculo usuário↔curso.
- **FR-039**: A **leitura** da matriz DEVE ser aberta a qualquer sessão autenticada: a interface
  precisa saber quais ações oferecer, e a matriz não contém dado sensível — contém a definição pública
  das regras.
- **FR-040**: Um evento de **escopo global** DEVE ser visível a todos, inclusive a quem tem escopo
  restrito (`RN-EVT-02`) — esconder feriado e formatura é o oposto do desejado. **Criá-lo**, porém,
  DEVE exigir permissão que o Operador não tem: ele lança a palestra da turma dele, não decreta
  feriado para o Centro.
- **FR-041**: Uma sessão autenticada **sem cadastro correspondente** de usuário **NÃO DEVE alcançar
  nada**.
- **FR-042**: Um usuário desativado DEVE **perder o acesso imediatamente**.
- **FR-043**: A matriz DEVE conceder ao **Encarregado e ao Ajudante da CIAARA-11** escrita nos
  lançamentos de aula, avaliação e atividade não letiva, e atribuir a administração de **calendário e
  parâmetros** à CIAARA-11 e ao Administrador (decisão de Bernardo, 28/08/2026). A leitura literal do
  documento 01 impediria o dono do sistema de lançar aula; a divergência é achado documental (**A-7**),
  não requisito.
- **FR-044**: **Um usuário real, autenticado, DEVE conseguir cadastrar.** O requisito parece óbvio e
  não é: existe uma classe de falha em que migração, carga e semente passam — porque rodam com
  privilégio de dono — e **só o usuário real quebra**, em produção, no primeiro cadastro. A
  verificação DEVE ser feita com **sessão autenticada de verdade**.
- **FR-045**: Um visitante **não autenticado NÃO DEVE alcançar dado nenhum**.

### Requisitos funcionais — domínios e parâmetros normativos (US4)

- **FR-046**: Um domínio **normativo fechado** — aquele que vem de norma da MB e não é administrável
  pelo usuário — DEVE recusar valor fora da lista, e ampliá-lo DEVE exigir decisão versionada. Um
  domínio **operacional administrável** DEVE poder ganhar valor novo **sem intervenção técnica**. Na
  dúvida entre os dois, o domínio é administrável: fechar cedo demais custa uma migração para desfazer.
- **FR-047**: A situação de uma turma DEVE ter **exatamente os quatro valores reais** da base viva —
  planejada, ativa, concluída, cancelada. **"Arquivada" NÃO É valor de dado**: é filtro de apresentação
  sobre turmas concluídas (TURMA-1, decisão de 28/08/2026).
- **FR-048**: Os tetos AEC 10% / TAD 5% / TR 10%, as faixas de carga horária docente por regime
  (20h → 8–12h, 40h → 16–24h, Dedicação Exclusiva → 16–30h) e o limite de tempos de aula por dia DEVEM
  viver como **dado administrável**, cada um com a **norma de origem** (`RNF-NORM-08`). Revisão da
  DGPM DEVE ser alteração de dado, nunca nova implantação.
- **FR-049**: **Nenhum limite normativo DEVE virar bloqueio.** Teto excedido, 9º tempo de aula e
  capacitação didática pendente são **alerta com justificativa registrada**, nunca recusa
  (`RN-DEG-02`). O 9º TA é autorização normativa explícita nos currículos de CAHO, C-Ap-HN e C-Ap-FR:
  bloqueá-lo contrariaria a norma que o autoriza, e a capacitação está ausente em 83,6% dos 177
  instrutores — exigi-la inviabilizaria a operação e a própria migração.
- **FR-050**: DEVE existir prova **positiva** de que o 9º tempo de aula **é aceito**. É o par que
  documenta a intenção e impede que uma mudança futura "conserte" o que não está quebrado.

### Requisitos funcionais — integridade do histórico (US5)

- **FR-051**: O **registro da migração NÃO PODE ser alterado nem removido por ninguém** — inclusive
  pela credencial de maior privilégio, aquela que ignora todas as demais regras de acesso
  (Princípio IV). Ele é a evidência auditável de que 100% do histórico foi transportado, e uma linha
  reescrita destrói a evidência sem deixar rastro.
- **FR-052**: Corrigir um registro de migração DEVE ser **registrar um evento novo**, nunca reescrever
  o anterior.
- **FR-053**: O arquivo de quarentena das avaliações da v1.0 DEVE ser **somente leitura**.
- **FR-054**: O registro automático de autoria DEVE funcionar também **sem sessão autenticada** — é o
  caminho da carga de dados, e é o menos testado. Uma implementação que pressuponha sessão autenticada
  **descarta os carimbos justamente ali**.

### Requisitos funcionais — reprodutibilidade e verificação

- **FR-055**: Reconstruir a base inteira do zero DEVE ser **um comando**, sem nenhuma etapa manual.
- **FR-056**: Cada etapa da construção DEVE ser aplicável isoladamente e trazer **plano de reversão
  escrito**. **Nada que tenha histórico pode ser removido** — o que sai de uso vira anotação e fica.
- **FR-057**: Cada uma das regras FR-008 a FR-018 DEVE ter teste que **tenta violá-la e espera a
  recusa**. Testar só o caminho válido não prova nada.
- **FR-058**: DEVE existir **teste negativo por perfil**: para cada perfil, o que ele **não** pode ler
  e não pode escrever é recusado pelo próprio repositório de dados. Os doze testes T-01 a T-12 do
  documento 22 §10.2 são a linha de base. **Uma suíte só com caminho feliz aprova uma proteção
  desligada.**
- **FR-059**: Toda regra `RN-` de *Risco: Alto* tocada por esta fatia DEVE ter asserção **nomeada pelo
  próprio identificador**. Stub explicitamente pendente é aceito; **cobertura fingida não**.
- **FR-060**: A descrição de dados que a aplicação compila DEVE ser **derivada do próprio sistema de
  dados**, e a verificação automática DEVE falhar se divergir. Campo que a aplicação conhece e o dado
  não é, quase sempre, campo inventado. Fecha o item §6.4 do Épico 0, que aguardava este schema.

### Key Entities

As **27 entidades** do BRIEF §2.1 — que é a autoridade de nomes —, agrupadas por natureza. Os nomes
são os do glossário (documento 07) e não se traduzem.

- **Núcleo acadêmico** — **Curso**, **Configuração de Horário**, **Tempos de Aula**, **Regime do
  Curso** (série temporal, com vigência), **Turma**, **Disciplina**, **Unidade de Ensino** e a
  **grade da turma** (a disciplina como executada por uma turma).
- **Corpo docente** — **Instrutor**; a **habilitação** (quem *pode* ministrar); a **atribuição real
  por turma**, com rateio de carga, que é de onde a LIQ e a OS de Instrutoria leem; e os
  **responsáveis pela assinatura** do DSA.
- **Fatos de execução** — o **registro de aula**, no grão de Unidade de Ensino; a **avaliação**, em
  que agendamento e execução são **um único fato** (`RN-AVAL-02`); a **atividade não letiva**; o
  **catálogo de avaliações planejadas**; e o **planejamento anual**, versionado.
- **Calendário** — **feriados**, **janelas de curso** e **reservas do PROENS**.
- **Governança e acesso** — **usuário**, o **vínculo usuário↔curso** e a **matriz de permissões**.
- **Configuração** — **listas administráveis** e **parâmetros normativos**.
- **Rastro técnico** — o **registro da migração**, que nunca se reescreve, e a **quarentena** das
  avaliações da v1.0.

**As três formas de atribuição são entidades distintas, e confundi-las já causou defeito em
produção:** a *habilitação* diz quem pode ministrar; o *planejamento* diz quem está previsto na grade
do curso; a *atribuição real por turma* diz quem efetivamente ministra. A LIQ lê a terceira — ler a
primeira no lugar foi o defeito que a spec 034 da v2.0 corrigiu.

**`_Meta_Colunas` não tem sucessora.** Ela existia para dar à planilha um contrato de campos que a
planilha não tinha. Na plataforma nova esse papel é cumprido com garantia do próprio sistema: um
campo renomeado quebra a verificação automática **antes** de chegar a produção. É o exemplo canônico
de requisito absorvido pela plataforma.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Reconstruir a base inteira do zero é **um comando**, sem nenhuma etapa manual, e
  termina sem erro.
- **SC-002**: **100%** das tabelas têm proteção de acesso ativa. Tabelas sem regra de acesso são
  **inacessíveis**, e há prova disso para o visitante anônimo e para o autenticado sem permissão.
- **SC-003**: **Zero** caminhos de exclusão física: nenhuma tabela aceita apagar linha, por nenhum
  perfil, por nenhuma via.
- **SC-004**: As **sete** regras de unicidade têm, cada uma, um teste que tenta violá-la e **espera a
  recusa** — sete de sete.
- **SC-005**: **100%** das regras condicionais — escopo, fiscal exclusivo, linha de disciplina — têm
  teste que prova a recusa do caso inválido.
- **SC-006**: Mudar quem pode executar uma ação leva **menos de um minuto** e **zero implantações** —
  é a alteração de uma linha de configuração, provada por teste que observa a mudança de
  comportamento.
- **SC-007**: Para **cada** perfil existe ao menos um teste que prova o que ele **não** alcança. A
  suíte reprova se contiver apenas caminhos felizes.
- **SC-008**: **Zero** grandezas com duas fontes de verdade: nenhuma tentativa de gravar valor
  derivado é aceita.
- **SC-009**: **Zero** linhas de registro de migração podem ser reescritas ou apagadas — inclusive
  pela credencial de maior privilégio.
- **SC-010**: **100%** dos parâmetros normativos (tetos, faixas de CH docente, limite diário) vivem
  como dado, com norma de origem, e **nenhum** deles aparece como número fixo em código.
- **SC-011**: Um usuário real, autenticado, consegue cadastrar — provado com **sessão de verdade**,
  nunca com o privilégio elevado sob o qual a carga e a construção rodam.
- **SC-012**: Nenhum valor normativo vira bloqueio: o 9º TA continua **aceito**, com teste positivo
  que o comprova.
- **SC-013**: O catálogo de Unidades de Ensino está **pronto para entrar integralmente e sem
  invenção** — as 572 UEs dos 21 currículos que as declaram, extraídas e conferidas, com a estrutura
  que as recebe e a regra que as valida já de pé. **⚠️ A entrada efetiva é do Épico 2**, pela mesma
  razão que difere FR-022 e FR-023: as unidades pendem de disciplinas, que só a carga traz. Medir este
  critério **contra base povoada é do Épico 2**; aqui ele mede prontidão.
- **SC-014**: Para **100%** das disciplinas com UE cadastrada, a soma das cargas horárias das suas
  unidades é **igual** à carga horária da disciplina — hoje 134 de 134, e nenhuma carga futura pode
  quebrar isso sem reprovar.

---

## Assumptions

Registradas porque foram escolhas feitas por padrão razoável, e não por decisão do responsável.

1. **Autoridade de inventário: BRIEF §2.1, com 27 tabelas.** O documento 06 e o documento 05 §3 falam
   em **24 entidades**, e o BRIEF §2.1 lista **27**. O próprio BRIEF resolve o conflito no achado
   D-6: *"em inventário e nome de tabela, este §2.1 prevalece"*. Adotado. As três tabelas ausentes do
   documento 05 §4 (`unidades_ensino`, `turma_disciplina_instrutor`, `configuracoes_horario`) têm sua
   semântica em BRIEF §2.2 e em `docs/sql-referencia/`, não inventada aqui.
2. **`docs/sql-referencia/` é reaproveitado onde não conflita.** Os tipos enumerados, as funções do
   schema `app`, os gatilhos de auditoria, as 74 policies e as 152 linhas de seed de
   `perfil_permissao` foram aplicados e validados contra um PostgreSQL 16 real. São reaproveitados
   como ponto de partida revisável. As **três divergências conhecidas** — número de tabelas, grão de
   `registros_aula`, CH executada da disciplina — seguem o BRIEF, não o script.
3. **Uma migration por grupo temático**, na ordem dos scripts de referência (`00` a `05`), cada uma
   aplicável isoladamente e com plano de reversão. É o que o documento 42 exige do `/speckit-plan`.
   O detalhamento é da fase de plano, não desta spec.
4. **`lib/tipos/database.ts` entra nesta fatia.** O item §6.4 do Épico 0 ficou pendente aguardando um
   schema; ele existe agora e é aqui.
5. **As telas ficam fora.** Administração de usuários, de parâmetros e de calendário é Épico 3.
   Diário de classe por UE é funcionalidade nova — Princípio X.
6. **`liq_emitida` e `papel_liq` ficam fora**, por decisão ainda pendente (LIQ-3 e LIQ-4, Épico 11).
7. **A pendência de domínio entre `cursos.classificacao` e `usuarios.escopo_curso`** (BRIEF §3, doc
   32 §5) é declarada *"decidir antes do Épico 3"* e **não bloqueia esta fatia**. O schema nasce com
   os dois domínios como estão em `docs/sql-referencia/`; se a decisão for separá-los, a mudança é
   aditiva.
8. **Perfis: nove valores efetivos** no domínio fechado, como em `docs/sql-referencia/`. O BRIEF §3
   fala em "~12" porque conta Encarregado e Ajudante de cada divisão separadamente; o domínio já os
   traz como valores distintos. Não há divergência de fato.
9. **Encarregado e Ajudante permanecem com permissão idêntica**, por fidelidade ao documento 01, que
   não os distingue em nenhuma área de dados (doc 22 §11, item 4). Distinguir seria decisão nova.
10. **Volume não é critério de projeto.** ~2.400 linhas de fato no total, mais 572 UEs. Prefere-se
    VIEW a coluna materializada, normalizar a duplicar, e não se cria índice sem consulta lenta
    observada.
11. **O casamento UE → disciplina é do Épico 2.** O catálogo extraído identifica a disciplina por
    **sigla do curso + ordinal + nome** do currículo. Ligar isso a `disciplinas.id` exige o de-para
    do documento 31 e é trabalho de carga, não de schema. O extrator não inventa `disciplina_id`.
12. **`scripts/etl/dados/unidades_ensino.{csv,json}` é versionado**, para que a extração seja
    auditável e o parser tenha teste de regressão. Ver o achado **A-8** sobre o repositório público.

---

## Dependências

| Dependência | Situação | Efeito |
|---|---|---|
| Épico 0 §6.2, §6.3, §6.5, §6.6 — ESLint, `supabase init`, clientes, suítes vazias, scripts | ✅ **Prontos** (conferido em disco, 28/08/2026) | Não bloqueiam mais |
| Épico 0 §6.7 — `.github/workflows/ci.yml` | ⬜ Pendente | Bloqueia a **verificação automática** de FR-060, não a implementação |
| Docker no ar | ⬜ Parado nesta máquina | `db:start` e `db:reset` não rodam sem ele |
| Projeto Supabase `cqhpfuaweoyglhtrckcp` | ✅ Alcançável | Alvo da aplicação em pré-visualização |
| Decisão UE-1 | ✅ Fechada em 26/08/2026, rota (b) | **Determina** o grão de `registros_aula` |
| Decisão TURMA-1 | ✅ Fechada em 28/08/2026, opção A | Filtro de apresentação; o domínio **não** ganha valor novo |
| Currículos da DEnsM (`SIS11/Curriculos/`) | ✅ Lidos e extraídos em 28/08/2026 | Fonte de `unidades_ensino`. 21 dos 24 declaram UE |
| Hospedagem fora da infraestrutura da MB (CIAARA-14.2) | ⬜ Pendente | **Não bloqueia**: esta fatia é schema, sem dado real. Bloqueia o Épico 2 |

---

## Clarifications

### Sessão 2026-08-28 — as três perguntas, respondidas por Bernardo

**Q1 — De onde vêm as Unidades de Ensino?**
→ **Dos currículos oficiais.** *"As unidades de ensino estão nos currículos dos cursos/estágios, na
pasta `SIS11/Curriculos`; cada curso/estágio tem as suas unidades de ensino conforme o currículo."*

A resposta reformula a pergunta em vez de escolher entre A, B e C: a opção C (UEs reais, a partir do
currículo do PROENS) foi descartada na redação original por supor que o currículo de 175 disciplinas
não estivesse disponível. **Estava.** São 24 PDFs aprovados pela DEnsM, e deles saíram **572 UEs**
para 134 disciplinas, com a soma das CH fechando em 134 de 134. **`unidades_ensino` nasce povoada com
dado normativo real — não com dado sintético.** Ver *Catálogo de Unidades de Ensino*.

Consequências fixadas para o schema desta fatia:

1. `unidades_ensino` é povoada pela **carga do catálogo dos currículos**, não pelo ETL do histórico.
   É seed de dado normativo, na mesma natureza de `config_parametros` — e, como ele, tem norma de
   origem: o número do Ofício da DEnsM que aprovou o currículo.
2. `numero_ue`, `topico` e `ch_prevista_tempos` vêm do currículo verbatim. **Nenhum é inventado.**
3. As duas garantias de unicidade e positividade do FR-021 estão verificadas contra as 572 linhas
   reais **antes** de existir implementação.
4. A subunidade (SUE) existe no currículo e **não vira tabela nesta fatia** — Princípio X. Fica no
   catálogo extraído, disponível quando houver requisito que a peça.

**Q1.b — pergunta residual, aberta, do Épico 2 (não bloqueia esta fatia).** Ver abaixo.

**Q2 — TURMA-1, o status "Arquivada"** → **Opção A: filtro de apresentação.**
O domínio de status de turma fica com os **quatro valores reais** da base viva — `planejada`,
`ativa`, `concluida`, `cancelada`. "Arquivada" é resolvida como VIEW/filtro sobre turmas concluídas,
**sem valor novo no domínio fechado**. É a recomendação escrita do documento 06 §5. **TURMA-1 está
fechada**; deixa de constar como decisão pendente.

**Q3 — As concessões `(a)` e `(b)` do seed da matriz de permissões** → **Opção A: confirmar as duas.**
- **(a)** O Encarregado e o Ajudante da CIAARA-11 **têm** escrita em `registros_aula`, `avaliacoes` e
  `atividades_nao_letivas`. A leitura literal do documento 01 impediria o dono do sistema de lançar
  aula, e isso é artefato da leitura, não intenção da norma.
- **(b)** `calendario` e `parametros` são administrados pela **CIAARA-11 e pelo Admin**.

As linhas marcadas `(a)` e `(b)` em `docs/sql-referencia/05_rls_policies.sql` **permanecem**, e as
marcas de revisão saem. **Consequência documental registrada:** a matriz do documento 01 fica
desatualizada neste ponto — está no quadro de achados como **A-7**, para correção no documento, não
no seed.

---

## Clarification pendente — Q1.b (Épico 2)

**Não bloqueia esta fatia.** O grão de `registros_aula` é o mesmo nas três saídas; o que muda é o
trabalho do ETL. Registrada aqui para não ser redescoberta no Épico 2.

### Q1.b — Os 1.566 registros históricos e os três currículos sem UE

**Contexto.** O catálogo diz quais UEs existem. Ele **não** diz a qual UE cada registro de aula
histórico pertence — a v2.0 lançava contra a disciplina inteira e nunca guardou a UE. Some-se a isso
que **três cursos não têm UE**: Est-QF-APOC (currículo digitalizado, sem camada de texto) e C-Espc-FR
e C-Espc-HN (currículos no modelo por competências, que não declaram UE).

**O que precisamos saber**: como um registro de aula de 2024, que não conhece Unidade de Ensino,
entra numa tabela cujo grão é a Unidade de Ensino — e o que acontece nos três cursos que não têm UE
nenhuma?

| Opção | Resposta | Implicações |
|--------|--------|--------------|
| **A** | **UE "não discriminada" por disciplina**, criada pelo ETL e marcada como artefato de migração, recebendo todo o histórico daquela disciplina | Um único caminho de agregação. Resolve também os três cursos sem UE. Custo: uma UE a mais por disciplina, visível na tela, que a CIAARA-11 precisa entender |
| **B** | **Casamento heurístico** do resumo de conteúdo do registro histórico contra o tópico da UE, com o não casado indo para a UE "não discriminada" | Recupera parte do histórico no grão certo. Custo: heurística sobre 1.566 linhas, que precisa de conferência humana e de registro por linha em `migracao_log` |
| **C** | **Vínculo com UE opcional só para linha migrada**, obrigatório para lançamento novo | Carga trivial. Custo: dois caminhos de agregação e uma regra que depende da origem da linha |
| Custom | Outra resposta | — |

**Sub-pergunta, nos três cursos sem UE**: transcrever o currículo APOC à mão (é digitalizado), e
tratar C-Espc-FR/HN — cujos currículos genuinamente **não têm** UE — por UE única por disciplina, ou
manter esses cursos fora do grão de UE?

**Sua escolha**: _[aguardando — Épico 2]_

---

## Perguntas resolvidas — registro

### Q1 — As 1.566 linhas históricas e o grão de Unidade de Ensino *(reformulada pela resposta)*

**Contexto.** A rota (b) fixa que `registros_aula` nasce no grão de UE (BRIEF §2.2, doc 05 §9.1). Mas
a base viva da v2.0 **não tem nenhuma noção de UE**: são 1.566 registros lançados contra a disciplina
inteira. A decisão fixou o grão; não disse como o histórico chega a ele. Esta é a pergunta que o
Épico 2 vai encontrar de frente, e ela precisa ser respondida **nesta migration**, porque grão de
tabela de fato se escolhe na primeira.

**O que precisamos saber**: como um registro de aula histórico, que não conhece Unidade de Ensino,
existe numa tabela cujo grão é a Unidade de Ensino?

| Opção | Resposta | Implicações |
|--------|--------|--------------|
| **A** | **Uma UE de migração por disciplina.** O vínculo com a UE é obrigatório; o ETL cria, para cada uma das 175 disciplinas, uma UE única com tópico marcado como não discriminado e rastro de migração preenchido, e aponta as 1.566 linhas para ela | Grão único e limpo: **um** caminho de agregação, sempre pela UE. Custo: 175 UEs sintéticas visíveis na interface, que a CIAARA-11 vai ver e precisar entender. Fica marcado no dado que é artefato de migração |
| **B** | **UE opcional.** O vínculo com a UE aceita vazio e o vínculo com a disciplina permanece obrigatório; a agregação usa a UE quando existe e a disciplina quando não | Carga do Épico 2 trivial, sem dado sintético. Custo: **dois** caminhos de agregação e o risco concreto de a rota (a) voltar pela porta dos fundos — que é exatamente o que a decisão de 26/08 recusou |
| **C** | **UEs reais antes da carga.** As Unidades de Ensino são cadastradas a partir dos currículos do PROENS, e só então o histórico é distribuído entre elas | O único que produz dado verdadeiro. Custo: exige o currículo de 175 disciplinas e uma regra de distribuição do histórico que **não existe** em documento nenhum. Bloqueia o Épico 2 por tempo indefinido |
| Custom | Outra resposta | Descreva o comportamento pretendido; a spec é atualizada e a decisão registrada em BRIEF §2.2 |

> **Resposta de Bernardo, 28/08/2026 — nenhuma das três, e o motivo importa.** As UEs estão nos
> currículos oficiais, em `SIS11/Curriculos/`. A opção **C** foi redigida supondo que o currículo não
> estivesse disponível e que sua obtenção bloquearia o Épico 2 por tempo indefinido — **a premissa era
> falsa**. Com os 24 currículos em mãos, C deixa de ser a opção cara e passa a ser a única que produz
> dado verdadeiro: **572 UEs reais, para 134 disciplinas, com a soma das CH fechando em 134 de 134.**
> A pergunta que sobra — a qual UE pertence cada registro histórico — virou **Q1.b**, do Épico 2.

---

### Q2 — TURMA-1: o status "Arquivada"

**Contexto.** O rascunho de funcionalidades lista **cinco** status de turma para filtro: Ativas,
Planejadas, Concluídas, Canceladas e **Arquivadas**. A base viva tem **quatro** valores reais —
Planejada (11), Ativa (7), Concluída (7), Cancelada (3). "Arquivada" não é valor observado nem
domínio declarado em documento nenhum da Fase 1. O documento 06 atribui esta decisão ao **Épico 1** —
*"barato agora, migration depois"*.

**O que precisamos saber**: "Arquivada" é um **status do domínio** ou um **filtro de apresentação**
sobre turmas concluídas antigas?

| Opção | Resposta | Implicações |
|--------|--------|--------------|
| **A** *(recomendada pelo doc 06)* | **Filtro de apresentação.** O domínio fica com os quatro valores reais; "Arquivada" vira uma visão sobre turmas concluídas há mais de N anos | Nenhum valor novo no domínio fechado. Reversível a custo zero. É a recomendação escrita do documento 06 §5 |
| **B** | **Status do domínio.** "arquivada" entra agora no domínio fechado de status de turma | Barato **agora**, caro depois — acrescentar valor a domínio fechado com histórico é migration. Custo: precisa da regra de quem arquiva, quando, e o que muda no comportamento |
| **C** | **Adiar.** Não implementar nada; reabrir quando a tela de cursos existir (Épico 5) | Sem custo agora. Custo: se a resposta for B, a migration chega com a base já povoada |
| Custom | Outra resposta | Descreva a semântica pretendida de "arquivada" |

> **Resposta de Bernardo, 28/08/2026: opção A.** "Arquivada" é **filtro de apresentação**. O domínio
> de status de turma fica com os quatro valores reais da base viva e **não recebe valor novo**.
> **TURMA-1 está fechada.**

---

### Q3 — As duas linhas marcadas `(a)` e `(b)` no seed da matriz de permissões

**Contexto.** O documento 22 §11 registra duas decisões **tomadas provisoriamente pelo autor do
seed** e marcadas no arquivo para revisão:

> **(a)** *"A matriz do documento 01, lida ao pé da letra, **não** dá escrita em `registros_aula`,
> `avaliacoes` e `atividades_nao_letivas` ao Encarregado e ao Ajudante da própria CIAARA-11 — o dono
> do sistema não poderia lançar aula. Parece artefato da leitura. **Concedida no seed.**"*
>
> **(b)** *"Nenhum documento designa quem administra `calendario` e `parametros`. **Atribuído à
> CIAARA-11 e ao Admin.**"*

São os tetos normativos e o calendário anual do PROENS: um valor errado ali não gera erro, gera
**número errado em relatório assinado**. O seed é entregável desta fatia, então a decisão precisa ser
tomada agora.

**O que precisamos saber**: as concessões `(a)` e `(b)` ficam como estão, ou o seed passa a seguir a
leitura literal do documento 01?

| Opção | Resposta | Implicações |
|--------|--------|--------------|
| **A** | **Confirmar as duas.** CIAARA-11 escreve nos fatos; CIAARA-11 e Admin administram calendário e parâmetros | O sistema funciona como a CIAARA-11 opera hoje. Custo: a matriz do documento 01 fica **desatualizada neste ponto**, e isso vira pendência documental a registrar |
| **B** | **Leitura literal.** Remover as linhas `(a)`: só o Operador e o Admin lançam aula; o Encarregado da CIAARA-11 não | Fidelidade ao documento 01. Custo: o dono do sistema não pode lançar aula — verificar se é isso mesmo que se quer antes de confirmar |
| **C** | **Confirmar `(a)`, restringir `(b)`.** CIAARA-11 escreve nos fatos, mas calendário e parâmetros ficam **só com o Admin** | Protege os tetos normativos com a permissão mais estreita, sem tirar da CIAARA-11 a operação diária |
| Custom | Outra resposta | Indique perfil por perfil; a matriz é dado, e trocar depois é uma alteração de linha |

> **Resposta de Bernardo, 28/08/2026: opção A.** As duas concessões ficam. A CIAARA-11 escreve nas
> tabelas de fato; CIAARA-11 e Admin administram calendário e parâmetros. As marcas de revisão `(a)` e
> `(b)` saem de `docs/sql-referencia/05_rls_policies.sql`; a divergência com o documento 01 vira o
> achado **A-7**.

---

## Achados para reportar — não corrigidos por esta spec

Conforme a regra invariável 1 do `CLAUDE.md` e o Princípio I: **listados, não consertados.**

| # | Achado | Evidência | Encaminhamento sugerido |
|---|---|---|---|
| **A-1** | **Contagem de tabelas divergente entre documentos.** O documento 06 (Épico 1) e o documento 05 §3 dizem **24 entidades**; o BRIEF §2.1 lista **27** | `docs/fase-1/06`, Épico 1, linha "Tabelas"; `docs/fase-1/05` §3; `docs/BRIEF-v2.1.md` §2.1 | O próprio BRIEF já resolve pelo achado D-6 (§2.1 prevalece em inventário). Falta **corrigir o texto** dos documentos 05 §3 e 06 |
| **A-2** | **Contagem de policies divergente.** O documento 22 §6 abre com *"68 policies sobre 25 tabelas"* e o §5.2 repete *"as 68 policies existentes"*; o BRIEF §11 diz **74**, e a contagem em disco confirma **74** | `grep -c "create policy" docs/sql-referencia/05_rls_policies.sql` → 74 | Corrigir o documento 22 §6 e §5.2 para 74 |
| **A-3** | **Contagem de tipos enumerados divergente.** O BRIEF §11 diz *"os 27 ENUMs"*; a contagem em disco dá **28**. E o documento 06 e o documento 42 falam em *"sete ENUM normativos"*, que são os sete **domínios conceituais** do documento 05 §6 — não o número de tipos declarados | `grep -c "as enum" docs/sql-referencia/00_extensoes_e_tipos.sql` → 28 | Corrigir o BRIEF §11 para 28 e distinguir, nos documentos 06 e 42, "domínio conceitual" de "tipo declarado" |
| **A-4** | **P-1 continua listado como pendência aberta, mas já foi atendido.** O achado pede a inclusão de `turma_disciplina` no BRIEF §2.1, e ela **já está lá** (item 8) | `docs/BRIEF-v2.1.md` §2.1 item 8; `docs/fase-1/06` §5, linha P-1 | Fechar P-1 no documento 06 |
| **A-5** | **`docs/sql-referencia/02_tabelas_fato.sql` está desatualizado em relação à decisão UE-1**, e o próprio arquivo declara isso num comentário. É registro do desenho anterior, mantido de propósito | `02_tabelas_fato.sql`, bloco *"[ALTERADO PELA DECISÃO UE-1]"* | Nenhum. Está correto manter — corrigir o passado é registrar evento novo, nunca editar o registro (Princípio IV) |
| **A-6** | **A constitution vive em dois endereços** — `docs/vibe-coding/40-Constitution-v2.1.md` e `.specify/memory/constitution.md`, hoje idênticos. Emenda tem de ir nos dois | Ambos os arquivos | Decisão **CONST-1**, pendente do Bernardo. Não bloqueia esta fatia |
| **A-7** | **A matriz de permissões do documento 01, lida ao pé da letra, não dá escrita nas tabelas de fato à própria CIAARA-11.** Bernardo confirmou em 28/08/2026 que a concessão é a intenção correta (Q3, opção A) — logo é **o documento que está desatualizado**, não o seed | `docs/fase-1/01` §2.2; `docs/fase-2/22` §11 itens 2 e 3 | Corrigir a matriz do documento 01 e fechar os itens 2 e 3 do documento 22 §11 |
| **A-8** | ~~O catálogo de UE vai para um repositório público~~ — **RESOLVIDO em 30/08/2026**: Bernardo confirmou que **não há problema em torná-lo público**, na mesma linha da decisão de abrir o repositório em 26/08/2026. As 572 UEs, 2.446 subunidades e a ementa de 134 disciplinas permanecem versionadas em `scripts/etl/dados/` | Decisão registrada | Nenhum. Fechado |
| **A-9** | **Três currículos não declaram Unidade de Ensino**, por dois motivos distintos: Est-QF-APOC é **PDF digitalizado sem camada de texto**; C-Espc-FR e C-Espc-HN usam o **modelo por competências** (`COMPETÊNCIA TÉCNICA`/`INDICADORES`), que não tem UE | Saída de `scripts/etl/extrair_unidades_ensino.py` | Q1.b, Épico 2. O APOC precisa de OCR ou transcrição; os dois C-Espc precisam de decisão sobre como participam do grão de UE |
| **A-14** | **O rodapé de `docs/sql-referencia/01` está extraviado.** "FIM DE 01_tabelas_cadastro.sql" aparece na linha 1111, **antes** da TABELA 11 (`turma_disciplina_instrutor`), que vive de 1118 ao fim. Quem extrair "do início até o rodapé" perde exatamente a tabela de onde a LIQ e a OS de Instrutoria leem — a que a spec 034 da v2.0 separou a duras penas | `docs/sql-referencia/01_tabelas_cadastro.sql`, linhas 1111 e 1118 | Mover o rodapé para o fim do arquivo. Contornado na montagem de M2 |
| **A-15** | **A semântica de `vigente_ate` diverge entre documentos.** O documento 05 §7.5 escreve `daterange(vigente_de, vigente_ate, '[)')` — fim **exclusivo**, em que `vigente_ate` é o primeiro dia não coberto. `docs/sql-referencia/01` implementa `daterange(vigente_de, vigente_ate + 1)` — fim **inclusivo**. A diferença vale um dia, na fronteira entre duas vigências | `docs/fase-1/05` §7.5 × constraint `regime_sem_sobreposicao` no banco | **Seguido o referência** (validado contra banco real, e corresponde ao que uma pessoa quer dizer ao preencher "vigente até"). Falta alinhar o texto do documento 05 |
| **A-16** | **Uma FK usava `CASCADE`.** `horarios_tempos_aula.configuracao_id` era `on delete cascade` no referência, sem justificativa escrita e contra a regra geral do BRIEF §2 — *"uma FK cascade seria a porta pela qual histórico se perderia por acidente"*. FR-007 admite duas exceções, ambas `set null`; cascade não está entre elas | `docs/sql-referencia/01_tabelas_cadastro.sql`, linha 196 | **Trocada por `restrict`** em M2. Nada é apagado neste sistema, então não muda comportamento alcançável |
| **A-17** | **`TRUNCATE` não é filtrado por RLS, e o privilégio estava concedido.** O Supabase concede `ALL` a `authenticated` por padrão; o referência revoga `insert, update` das duas append-only e `all` de `anon`, mas **nunca revoga `DELETE` nem `TRUNCATE` de `authenticated`**, em tabela nenhuma. Para `DELETE` a RLS barrava e a "proteção dupla" do FR-033 era só uma. Para `TRUNCATE` era brecha real: **nenhuma policy é consultada num TRUNCATE**, e um usuário autenticado poderia apagar `migracao_log` inteiro — a evidência auditável da migração — sem deixar rastro | Medido no banco antes da correção: `authenticated` tinha `DELETE` e `TRUNCATE` em **37** tabelas | **Revogados em M6.** É o achado mais sério da implementação. Vale rever se o mesmo padrão existe em outros projetos Supabase da divisão |
| **A-12** | **O documento 24 se contradiz sobre onde vivem os testes pgTAP.** O §1 desenha `tests/invariantes/` para *"pgTAP + SQL"*; o §7 define `"test:invariantes": "supabase test db"`, e esse comando **só procura em `supabase/tests/`**, sem opção de configuração | `docs/fase-2/24` §1 e §7 | Resolvido no plano por natureza do teste (research §7): pgTAP em `supabase/tests/`, teste negativo de RLS em `tests/invariantes/`. Falta **corrigir a árvore do documento 24 §1** |
| **A-13** | **A carga do catálogo de UE não cabe no Épico 1.** `unidades_ensino.disciplina_id` referencia `disciplinas`, que só existe depois do ETL. As 572 unidades não têm onde aterrissar nesta fatia — o alcance de FR-022 e FR-023 fica em *estrutura + arquivo versionado*, e a carga vira **tarefa nova do Épico 2**, a sequenciar logo após `disciplinas` | Descoberto ao planejar; ver [plan.md](./plan.md), *O que fica FORA desta fatia* | Acrescentar a tarefa ao escopo do Épico 2 no documento 06 |
| **A-11** | **As duas cópias da constitution já divergem** — e o `CLAUDE.md` afirmava que eram idênticas. São 5 linhas de diferença no corpo normativo, **anteriores** às edições de 28/08/2026: a cópia de `.specify` cita `sql/05_rls_policies.sql`, caminho inexistente, e posiciona o rodapé de versão de outro jeito | `diff` entre `docs/vibe-coding/40-Constitution-v2.1.md` e `.specify/memory/constitution.md`, a partir de *Princípios Fundamentais* | Reforça **CONST-1**: o custo de manter espelho já foi cobrado. Corrigido o texto do `CLAUDE.md`; a divergência em si **não foi consertada** — consolidar ou não é decisão do Bernardo |
| **A-10** | **Lacuna de numeração de UE dentro de um currículo.** Em C-Exp-Metoc-OF-SP, a disciplina OCEANOGRAFIA numera as UEs 1–11 sem interrupção, mas outras disciplinas da suíte podem não fazê-lo. `unique (disciplina_id, numero_ue)` tolera lacuna; **numeração contígua não é invariante** e não deve virar constraint | Verificado: 0 violações de unicidade em 572 UEs | Nenhum. Registrado para que ninguém acrescente um `CHECK` de contiguidade |
