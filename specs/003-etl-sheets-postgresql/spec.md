# Feature Specification: Épico 2 — ETL Sheets → PostgreSQL com reconciliação verificável

**Feature Branch**: `003-etl-sheets-postgresql`

**Created**: 2026-09-07

**Status**: Clarificada em 07/09/2026 — Q1, Q2, Q3 e os resíduos Q1.c/Q1.d/Q1.e respondidos. **Todas as pendências fechadas em 08/09/2026** — A-1 (era a CAHO), A-2 (vale a *Cópia … Sabado*) e o bloqueio R-1 (coluna anulável com `CHECK`). Planejada; pronta para `/speckit-tasks`

**Input**: User description: "Épico 2 da v2.1 — ETL Sheets → PostgreSQL com reconciliação verificável"

---

## Verificação de premissa (antes de qualquer requisito)

O Épico 2 **não parte do zero**: parte de dois épicos fechados e de um plano de migração já escrito
em detalhe. O que segue foi lido em 07/09/2026, não recordado.

**Já de pé — não re-especificar:**

| Item | Evidência |
| --- | --- |
| Schema de destino | 27 tabelas, 77 policies, RLS em todas, aplicadas do zero por `pnpm db:reset` (Épico 1, 91/91) |
| Portão de qualidade | CI em três contextos, merge bloqueado — provado com cinco defeitos deliberados (Épico 0, 72/72) |
| Catálogo de Unidades de Ensino | **572 UEs**, 134 disciplinas, 21 currículos, extraídas dos currículos oficiais da DEnsM em 28/08/2026. Invariante fecha em 134/134 |
| Plano de ETL | `docs/fase-3/30-Plano-de-Migracao-ETL.md`, 1.768 linhas: cinco etapas, ordem de carga das 25 tabelas, transformações por tabela, seis consultas de reconciliação, plano de corte e de rollback |
| De-para coluna a coluna | `docs/fase-3/31-Mapa-De-Para-Sheets-PostgreSQL.md`, 753 linhas, as 23 abas |
| Auditoria da planilha real | `docs/fase-3/32-Auditoria-da-Planilha-Real.md`, 455 linhas |
| Scripts da v2.0 | `migracao/*.py` já escritos e validados, mais os corretivos residuais (documento 06, Épico 2) |
| `service_role` na Vercel | Cadastrada em Preview e Production em 07/09/2026, conforme documento 10 §2.6 |

**Esta spec existe para quê, então?** O documento 30 é um **plano de execução**, não um contrato de
requisitos: ele decide *como*. Falta o *o quê* verificável — o que precisa ser verdade ao fim, quem
verifica, e o que bloqueia. E faltam três decisões sem as quais a primeira carga não pode ser
escrita, listadas em *Clarifications*.

---

## Clarifications

### Sessão 2026-09-07 — as três bloqueantes, respondidas por Bernardo

**Q1 — A qual Unidade de Ensino pertence cada registro de aula histórico?**
→ **Nem nulo, nem sintético: o dado existe e vem de uma quarta fonte.** As planilhas de
planejamento da **v1.0**, no ambiente local do Bernardo, guardam a UE por lançamento. Verificado em
07/09/2026, abrindo os arquivos:

| Fonte | Curso | UEs na `BD DISCIPLINAS` | Lançamentos com `Nº U.E` |
| --- | --- | ---: | ---: |
| `C-AP-FR 2026.xlsx` | C-Ap-FR | 154 | 1.001 |
| `C-AP-HN 2026.xlsx` | C-Ap-HN | 214 | 891 |
| `C-ESPC-HN 2026.xlsx` | C-Espc-HN | 182 | 1.313 |
| `CAHO_2026.xlsx` | CAHO | 294 | 1.646 |
| `Cópia de C-AP-HN 2026 - Sabado.xlsx` | C-Ap-HN | 215 | 1.041 |
| `ESPC-FR 2026.xlsx` | C-Espc-FR | 250 | 1.438 |
| `C-ESP-ME 2026.xlsx` | C-ESP-ME | 120 | 804 |
| `C-EXP-METOC-OF T01_26.xlsx` | C-Exp-METOC-OF | 55 | 178 |
| **Total** | **7 cursos distintos** | **1.484** | **8.312** |

Duas abas carregam o dado: **`PREENCHIMENTO`** traz `DATA · TA · COD · Nº U.E` por lançamento
diário, e **`BD DISCIPLINAS`** mapeia disciplina → nº UE → nome da UE → CH → local → instrutor.

**Q2 — P-6 e P-7.** → **Migrations aditivas emendando o Épico 1, agora, antes de qualquer carga.**
`turma_disciplina` recebe `instrutor_id`; as chaves de prioridade passam a respeitar o `CHECK` de
formato.

**Q3 — Banco de destino.** → **Banco local, no Docker**, para a primeira carga real e para todos os
testes. Nenhum dado real sai da máquina enquanto a CIAARA-14.2 não decidir.

### Sessão 2026-09-07 (continuação) — os resíduos da Q1, decididos

**Escopo expandido, com autorização nominal.** O Épico 2 passa a incluir o **cruzamento dos registros
da v2.0 com as planilhas da v1.0** para recuperar a Unidade de Ensino. Fontes: as abas
**`PREENCHIMENTO`** e **`BD DISCIPLINAS`**. A rastreabilidade do cruzamento MUST ser preservada em
`migracao_log`.

| Resíduo | Decisão de Bernardo, 07/09/2026 |
| --- | --- |
| **Q1.c — cobertura** | Para os cursos **não cobertos**, a Unidade de Ensino **permanece `NULL`** no histórico. **Exceção declarada** à regra anterior de não usar nulo — e ela vale só aqui: continua proibido inventar dado sintético |
| **Q1.d — grão** | Cruzamento pela **chave composta `Turma + Data + Disciplina`** |
| **Q1.e — CAHO** | ⚠️ **Revisto em 08/09/2026.** `CAHO_2026.xlsx` **entra como fonte de transporte** — o "CAL 2026" da autorização anterior era ela. A rejeição de 10/08/2026 **permanece**, e vale para o papel de **padrão-ouro de validação**, que é outro: transportar dela é transporte; comparar contra ela seria validação, e essa segue proibida |
| **A-2 — duplicata do C-Ap-HN** | Vale **apenas** `Cópia de C-AP-HN 2026 - Sabado.xlsx`. O `C-AP-HN 2026.xlsx` **sai** *(decisão de 08/09/2026)* |
| **Não regressão** | Continua por **invariante estrutural e matemática**. Nenhuma planilha vira padrão-ouro — nem a CAHO, nem qualquer outra usada como fonte de transporte |

**A distinção que sustenta tudo isso:** uma planilha pode ser **fonte de dado** sem ser **padrão de
validação**. Transportar dela é transporte; comparar contra ela seria validação. O épico faz a
primeira e proíbe a segunda.

### Cobertura real, depois de excluir a CAHO

*(Fechada em 08/09/2026, com a CAHO dentro e a duplicata do C-Ap-HN resolvida.)*

| | Valor |
| --- | ---: |
| Arquivos usados | **7** de 8 — sai o `C-AP-HN 2026.xlsx` |
| Cursos cobertos | **7 de 24** |
| Cursos sem fonte de UE → `NULL` | **17** |
| UEs disponíveis | **1.270** |
| Lançamentos com `Nº U.E` | **7.421** |

Os sete cobertos: C-Ap-FR · C-Ap-HN · C-Espc-HN · **CAHO** · C-Espc-FR · C-ESP-ME · C-Exp-METOC-OF.

### Duas coisas que continuam abertas

**A-1 — a planilha "CAL 2026" não existe.** A autorização menciona usá-la "estritamente como fonte de
dados históricos para o transporte das atividades". **Procurei e ela não está em lugar nenhum**: nem
nos três caminhos indicados, nem em `Documentos/`. Os oito arquivos disponíveis são os da tabela
acima. Duas leituras possíveis, e as duas mudam o resultado:

- **se "CAL" é a CAHO**, a autorização **contradiz** a frase imediatamente anterior, que manda
  ignorá-la por inteiro no cruzamento;
- **se é outro arquivo**, ele não foi fornecido.

Não adivinhei. Enquanto não se decidir, **a CAHO segue excluída** — que é a instrução explícita e a
mais conservadora.

**A-2 — qual arquivo manda no C-Ap-HN.** `C-AP-HN 2026.xlsx` (214 UEs, 891 lançamentos) e
`Cópia de C-AP-HN 2026 - Sabado.xlsx` (215 UEs, 1.041 lançamentos) descrevem o mesmo curso e
divergem. Usar os dois **duplica** lançamento; escolher errado **perde** 150. A pergunta não foi
respondida.

### Sessão 2026-09-08 — `/speckit-clarify`

Quatro ambiguidades encontradas na varredura, **todas descobertas abrindo os arquivos**, não lendo os
documentos. Bernardo autorizou em bloco ("aplicar todas as recomendações"); cada uma fica escrita por
extenso, porque autorização em bloco só é auditável se der para conferir o que foi decidido.

- **Q: O que significa o sufixo `P` num número de UE como `1P`, e como tratá-lo?**
  → **A: Opção A — é a parte prática da mesma UE.** Normaliza para `numero_ue = 1` e o sufixo fica
  registrado em `migracao_log` como proveniência.
  *Achado:* `unidades_ensino.numero_ue` é **`smallint`**, e `1P` é o **segundo valor mais comum** da
  coluna — 210 ocorrências só no `C-AP-FR`. Sem regra, 210 lançamentos cairiam em `sem_fonte` sem
  ninguém ter decidido isso.

- **Q: Os lançamentos cujo código não é disciplina (`AD`, `FE`, `PL`, `TR`, `TE`, `LP`) participam do
  cruzamento?**
  → **A: Não. Ficam com o veredito novo `nao_aplicavel`.**
  *Achado:* são **270 linhas só no `C-AP-FR`** — `AD` 181, `FE` 42, `LP` 17, `TR` 13, `TE` 9, `PL` 8.
  Não são disciplina, logo **não têm UE por natureza**: são atividade não letiva ou evento de
  calendário. Marcá-las `sem_fonte` seria mentir — `sem_fonte` diz "procurei e não achei";
  `nao_aplicavel` diz "não havia o que procurar".

- **Q: A contagem de aceite vem de um inventário já desatualizado (P-8). O que prevalece?**
  → **A: A sondagem prévia refaz a linha de base contra a planilha ao vivo, ANTES da carga, e o delta
  contra o documento 05 §10 é registrado e aprovado.** A contagem continua **bloqueante** — o que muda
  é de onde vem o número esperado.
  *Achado:* o inventário é de 02/08/2026; a planilha ganhou `Turma_Disciplina` em 20/08 e o log passou
  de `LOG-001060`. Sem refazer a base, o **FR-009 reprova por construção**.

- **Q: O que fazer quando os cinco `NOT NULL` de `instrutores` (D-08) não têm valor na origem?**
  → **A: A carga falha, nomeando instrutor e coluna. Nunca se fabrica valor.** A lacuna vira
  **pendência operacional a resolver na planilha antes do corte**, não no ETL.
  *Razão:* preencher `NOT NULL` com valor inventado é exatamente o "aproveitar e corrigir" que o
  documento 06 proíbe — e um valor fabricado num campo obrigatório é indistinguível de dado real
  depois.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A carga inteira roda por um comando e diz se pode confiar nela (Priority: P1)

Quem opera a migração executa **um** comando e recebe, ao fim, um veredito: a base carregou e
reconcilia, ou não carregou nada. Não existe estado intermediário — nem "carregou 18 das 25 tabelas",
nem "carregou mas não sei se está certo".

**Why this priority**: é o épico inteiro. Sem dado migrado não há sistema; sem reconciliação não há
confiança no dado migrado. E o estado meio-carregado é o pior possível numa migração, porque é o
único em que ninguém sabe se o certo é continuar ou voltar.

**Independent Test**: rodar o comando contra uma base vazia e observar o relatório de reconciliação.
Entrega valor sozinho, ainda que o corte não aconteça: prova que o transporte funciona.

**Acceptance Scenarios**:

1. **Given** o schema aplicado e a base vazia, **When** o operador executa a carga, **Then** as 25
   tabelas entram **numa transação única** e a contagem de cada uma bate exatamente com o documento
   05 §10.
2. **Given** uma carga em andamento, **When** qualquer tabela falha, **Then** **nenhuma linha**
   permanece gravada e a mensagem diz qual tabela e qual linha causaram a falha.
3. **Given** a carga concluída, **When** o operador lê o relatório, **Then** ele traz veredito
   explícito — liberado ou bloqueado — e, se bloqueado, **cada divergência nomeada**.
4. **Given** a carga concluída, **When** o operador roda o comando de novo do zero, **Then** o
   resultado é idêntico em contagem e checksum por tabela.

---

### User Story 2 - A reconciliação pega o erro que a contagem não pega (Priority: P1)

Quem confere a migração não se contenta com "5.400 linhas de lá, 5.400 linhas de cá". A verificação
que vale é a que pega **linha que trocou de dono** — um registro de aula que foi parar na turma
errada durante a resolução de chave estrangeira.

**Why this priority**: contagem total não pega troca de FK; mover um registro da turma A para a B
mantém o total. O somatório de tempos de aula **por turma** pega — e é a grandeza de que todo o
sistema depende: CHD, CHT, tetos, LIQ. É a consulta que o documento 30 §7.2 diz que rodaria primeiro
se pudesse escolher uma só.

**Independent Test**: alterar deliberadamente uma FK numa cópia da base e confirmar que a
reconciliação acusa, mesmo com a contagem total intacta.

**Acceptance Scenarios**:

1. **Given** a carga concluída, **When** a reconciliação roda, **Then** a divergência de tempos de
   aula por turma é **zero nas 29 turmas**, sem tolerância.
2. **Given** um registro movido de turma de propósito, **When** a reconciliação roda, **Then** ela
   **acusa**, ainda que a contagem total não tenha mudado.
3. **Given** a base carregada, **When** a integridade referencial é verificada, **Then** há **zero**
   chave estrangeira órfã em toda a base.
4. **Given** as três identidades aritméticas do documento 06, **When** verificadas, **Then** fecham:
   1.566 + 1 + 186 = **1.753** · 663 + 1 = **664** · 531 + 62 + 60 + 11 = **664**.

---

### User Story 3 - O histórico chega intacto e rastreável até a origem (Priority: P1)

Quem precisar auditar uma linha daqui a três anos consegue dizer de onde ela veio, quando entrou, e
que ela não foi reescrita no caminho.

**Why this priority**: é o Princípio IV — integridade do histórico. Uma migração que perde a
procedência transforma dado auditável em dado apenas plausível, e a diferença só aparece quando
alguém precisa provar algo.

**Independent Test**: escolher uma linha qualquer de uma tabela migrada e reconstruir sua origem na
planilha usando apenas o que está gravado na base.

**Acceptance Scenarios**:

1. **Given** qualquer linha migrada, **When** ela é inspecionada, **Then** tem `codigo` não nulo e
   único, com o identificador da v2.0 **verbatim**, e a marca de procedência preenchida.
2. **Given** o log de migração da v2.0, **When** a carga termina, **Then** as **717+ linhas
   históricas estão intactas** — nenhuma reescrita — mais as linhas novas desta migração.
3. **Given** a carga concluída, **When** alguém tenta alterar ou apagar uma linha do log, **Then** o
   **banco recusa**, para todo perfil, inclusive o administrativo.

---

### User Story 4 - Dá para ensaiar o corte sem arriscar a base viva (Priority: P2)

Quem vai conduzir o corte ensaia antes, com o dado real, e sabe quanto tempo leva — sem que a
planilha em produção corra risco.

**Why this priority**: a base viva `Banco de dados CIAARA-11 v2.0` é escrita todo dia e continua
sendo a produção até o corte. Ensaio que precisa de janela de indisponibilidade não é ensaiado — é
adiado até virar corte de primeira tentativa. Fica em P2 porque depende da decisão Q3.

**Independent Test**: executar o ensaio completo e medir o tempo, sem escrever nada na planilha.

**Acceptance Scenarios**:

1. **Given** a planilha de origem em uso normal, **When** o ensaio roda, **Then** ele **apenas lê** —
   nenhuma escrita na origem, em nenhuma etapa.
2. **Given** um ensaio concluído, **When** o operador consulta o resultado, **Then** sabe quanto tempo
   a carga levou e onde estão os gargalos.
3. **Given** o ensaio, **When** ele termina, **Then** existe uma cópia **datada e imutável** do
   arquivo de origem, para que a carga possa ser reproduzida depois sem depender da planilha ao vivo.

---

### User Story 5 - Se der errado depois do corte, existe caminho de volta escrito (Priority: P2)

Quem faz o corte sabe, **antes de começar**, até quando é admissível voltar, o que acontece com o que
foi escrito no sistema novo, e quem decide.

**Why this priority**: o documento 30 §9 já escreveu o rollback; o que falta é ele ser requisito
verificável, e não parágrafo. Rollback que ninguém ensaiou é rollback que não existe.

**Independent Test**: executar o procedimento de reversão num ambiente de ensaio e confirmar que a
planilha volta a ser a fonte de verdade sem perda.

**Acceptance Scenarios**:

1. **Given** o corte executado, **When** se decide reverter dentro da janela admissível, **Then** o
   procedimento devolve a planilha à condição de fonte de verdade, e o que foi escrito no sistema
   novo **é preservado em algum lugar legível**, nunca descartado em silêncio.
2. **Given** a janela admissível vencida, **When** alguém pede reversão, **Then** a resposta é
   **não**, e o motivo está escrito de antemão.

---

### Edge Cases

- **A ordem de carga é uma armadilha silenciosa.** O catálogo de listas de configuração é a
  **primeira** tabela, não uma tabela de configuração qualquer: quatro gatilhos validam valor contra
  ela. Carregá-la depois faz os 1.566 registros de aula falharem com "valor fora do domínio", e a
  mensagem **não diz** que o problema é a ordem.
- **O ETL roda sem sessão autenticada**, com a chave administrativa. Duas armadilhas conhecidas
  (documento 30 §3): os carimbos de auditoria são descartados em silêncio, e o gatilho
  anti-escalonamento bloqueia a própria carga de usuários. Ambas já diagnosticadas — não redescobrir.
- **Cinco colunas obrigatórias de instrutores** podem não ter valor na origem (pendência D-08): a
  transformação **pode falhar** na carga.
- **A regra de não sobreposição de vigência pode recusar dado legítimo** vindo da planilha, que não
  a conhecia.
- **Valor de domínio inesperado** numa coluna fechada: nunca vira padrão silencioso.
- **Fuso horário deslocando data em um dia** na fronteira — o defeito clássico, invisível na
  contagem.
- **Uma linha-fantasma conhecida** na aba de usuários (`USR-04`) e **duas colunas de produção sem
  destino** no schema.
- **A tentação de "aproveitar e corrigir"** um dado durante o transporte. Proibida: correção de
  conteúdo é evento separado e logado.
- **Número de UE não numérico** (`1P`) contra uma coluna `smallint` — 210 ocorrências num arquivo só.
- **Cabeçalho repetido dentro da faixa de dados**, 36 vezes por arquivo: lido como dado, vira
  lançamento fantasma que ninguém encomendou.
- **Código que não é disciplina** (`AD`, `FE`, `PL`, `TR`, `TE`, `LP`) — 270 linhas num arquivo só.
  Não têm UE por natureza, e tratá-las como falha de busca poluiria o relatório com 270 falsos
  negativos.
- **Coluna obrigatória sem valor na origem** (D-08): a carga falha nomeando; nunca fabrica.

---

## Requirements *(mandatory)*

### Functional Requirements

**Transporte fiel**

- **FR-001**: A carga MUST trazer **100%** do histórico da planilha de origem para o banco, sem
  reinterpretar conteúdo. *(documento 06, Épico 2 — objetivo)*
- **FR-002**: Toda linha migrada MUST ter `codigo` não nulo e único, guardando o identificador da
  v2.0 **verbatim**, e MUST ter a marca de procedência preenchida. *(critério 4)*
- **FR-003**: O ETL MUST NOT corrigir conteúdo de negócio. Correção é **evento separado e logado**,
  nunca embutida no transporte. *(documento 06 — "fora de escopo"; risco declarado)*
- **FR-004**: O log de migração da v2.0 MUST chegar **íntegro** — as 717+ linhas históricas sem
  nenhuma reescrita — e MUST ser continuado, não reiniciado. *(critério 5; Princípio IV)*

**Atomicidade e idempotência**

- **FR-005**: A carga MUST acontecer em **transação única**: ou as 25 tabelas entram, ou nenhuma
  entra. Estado parcial MUST NOT ser alcançável. *(documento 30 §4)*
- **FR-006**: Reexecutar a carga do zero MUST produzir, em cada tabela de negócio, **contagem
  idêntica** e **checksum idêntico das colunas de negócio**, ordenadas por `codigo`. O checksum MUST
  excluir `id` e o quarteto de auditoria (`criado_por`, `criado_em`, `editado_por`, `editado_em`) —
  os cinco são **gerados a cada execução por construção** (`gen_random_uuid()` e o gatilho
  `app.set_auditoria()`), e sua variação **não indica divergência de dado**. *(critério 6; redação
  corrigida em 08/09/2026 — achado CHK002: como estava, o requisito era insatisfazível)*
- **FR-006.1**: A idempotência do FR-006 MUST NOT se aplicar a `migracao_log`. **Crescer a cada
  execução é o comportamento correto** dessa tabela, não violação — o que se exige dela é o FR-004:
  linhas históricas intactas e numeração continuada. *(achado CHK003)*
- **FR-007**: Cada etapa do pipeline MUST produzir **artefato inspecionável** e MUST ser
  reexecutável isoladamente, para que "onde exatamente errou?" seja respondível sem refazer tudo.
  *(documento 30 §1.1)*
- **FR-008**: A extração MUST produzir uma cópia **datada e imutável** da origem, e a carga MUST
  poder ser reproduzida a partir dela sem depender da planilha ao vivo.

**Reconciliação — o que bloqueia**

- **FR-009**: A contagem de cada tabela MUST bater exatamente com o documento 05 §10. Divergência de
  **uma linha bloqueia**. *(critério 1)*
- **FR-010**: O somatório de tempos de aula **por turma** MUST ser idêntico na origem e no destino,
  **zero divergência nas 29 turmas, sem tolerância** — é a verificação que pega troca de chave
  estrangeira, que a contagem não pega. *(documento 30 §7.2)*
- **FR-011**: A base MUST ter **zero** chave estrangeira órfã após a carga. *(critério 3)*
- **FR-012**: As três identidades MUST fechar como **relação estrutural**, sobre a linha de base
  vigente, verificadas por teste de invariante:
  `registros_aula + transferidas + avaliações = total de registros` ·
  `atividades não letivas + 1 = total` ·
  `soma das quatro categorias = total de atividades`.
  Os valores **1.566+1+186=1.753 · 663+1=664 · 531+62+60+11=664** são a linha de base de
  **02/08/2026** e MUST ser recalculados pela sondagem prévia (FR-009.1). **A identidade é o
  critério; o literal é a foto.** *(critério 2; redação corrigida em 08/09/2026 — achado CHK005: os
  literais brigavam com o FR-009.1, e ambos eram bloqueantes)*
- **FR-013**: As 210 linhas de turma-disciplina MUST chegar com **89 períodos herdados e 121 em
  branco**, exatamente como na origem. *(critério 7)*
- **FR-014**: A reconciliação MUST produzir relatório com **veredito explícito** e, quando bloqueado,
  **cada divergência nomeada**. Relatório sem veredito MUST NOT ser aceito como aprovação.
- **FR-015**: A não regressão MUST ser provada **por invariante estrutural**, nunca por diferença
  com a saída histórica de um curso específico. **A CAHO 2026 permanece rejeitada como padrão-ouro**
  (Bernardo, 10/08/2026). *(critério 8 — "inegociável")*

**Ordem, transformação e domínio**

- **FR-016**: A ordem de carga MUST seguir o grafo de dependências do documento 30 §4, e MUST existir
  **uma única definição dessa ordem** no repositório — reordenar em um lugar só.
- **FR-017**: Valor fora de um domínio fechado MUST interromper a carga com mensagem que nomeia a
  tabela, a coluna e o valor. MUST NOT virar padrão silencioso. *(documento 30 §6.7)*
- **FR-018**: Conversão de tipo MUST ser explícita e verificada por coluna antes da gravação
  definitiva, com o dado passando primeiro por área de staging **integralmente textual**.
  *(risco declarado: "tipo mal convertido em silêncio")*
- **FR-019**: Datas MUST ser tratadas com fuso explícito, e o teste MUST incluir **datas de
  fronteira**. *(risco declarado: "timezone deslocando datas em um dia")*

**Operação do corte**

- **FR-020**: MUST existir sondagem executável **contra a planilha real, antes do corte**, que
  antecipe as divergências conhecidas. *(documento 30 §7.6)*
- **FR-021**: O ensaio MUST ser possível **sem escrever nada na origem** e sem exigir
  indisponibilidade da planilha.
- **FR-022**: MUST existir procedimento de reversão escrito, com **prazo-limite declarado** e destino
  explícito para o que foi escrito no sistema novo depois do corte. *(`RNF-BKP-02`; documento 30 §9)*
- **FR-023**: MUST estar nomeado **quem opera o corte** e quem detém a chave administrativa do
  ambiente de destino. *(pendência P-10)*

**Escopo — o que não entra**

- **FR-024**: Esta fatia MUST NOT trazer nenhuma tela, nenhuma recategorização de conteúdo e nenhuma
  regra de negócio nova. *(documento 06 — "fora de escopo"; Princípio IX)*

**Pendências que a carga não contorna**

- **FR-025**: A Unidade de Ensino dos registros históricos MUST ser **recuperada por cruzamento com
  as planilhas de planejamento da v1.0**, que guardam `Nº U.E` por lançamento. MUST NOT ser inventada,
  nem preenchida com valor sintético. *(decisão de Bernardo, 07/09/2026)*
- **FR-025.1**: A chave de cruzamento MUST estar **declarada e única**, e o resultado MUST ser
  auditável linha a linha: para cada registro casado, MUST ser possível dizer de qual arquivo, aba e
  linha veio a UE.
- **FR-025.2**: O cruzamento MUST usar a chave composta **`Turma + Data + Disciplina`**. Registro que
  **não casar** MUST ficar com Unidade de Ensino **`NULL`** e MUST ser **reportado nominalmente** no
  relatório — nunca preenchido por aproximação. *(decisão de 07/09/2026)*
- **FR-025.3**: Para os **17 cursos sem planilha de origem**, a Unidade de Ensino MUST permanecer
  `NULL`. É **exceção declarada** à regra de não usar nulo, e vale **apenas** para esses registros:
  continua proibido criar UE sintética. *(decisão de 07/09/2026)*
- **FR-025.4**: `CAHO_2026.xlsx` MUST ser usada **apenas como fonte de transporte**
  *(decisão de 08/09/2026)*. Ela MUST NOT ser usada como padrão-ouro de não regressão — a rejeição
  de 10/08/2026 permanece nesse papel e não foi reaberta.
- **FR-025.5**: Nenhuma planilha usada como fonte de transporte MUST ser tratada como **padrão-ouro
  de não regressão**. A não regressão continua provada por **invariante estrutural e matemática**
  (FR-015). Fonte de dado e padrão de validação são coisas diferentes, e confundi-las é o defeito que
  a decisão de 10/08/2026 existe para impedir.
- **FR-025.6**: O cruzamento MUST deixar rastro em `migracao_log`: para cada Unidade de Ensino
  recuperada, de qual arquivo, aba e linha ela veio. *(decisão de 07/09/2026)*
- **FR-025.7**: Para o curso C-Ap-HN, a fonte autoritativa é **`Cópia de C-AP-HN 2026 - Sabado.xlsx`**.
  O `C-AP-HN 2026.xlsx` MUST NOT ser lido — usar os dois duplicaria lançamento e faria o curso inteiro
  cair em `ambiguo`. *(decisão de 08/09/2026, fecha o A-2)*
- **FR-025.9**: Número de UE com sufixo alfabético (`1P`) MUST ser normalizado para o número, e o
  sufixo MUST ser registrado em `migracao_log` como proveniência. *(decisão de 08/09/2026)*
- **FR-025.10**: Lançamento cujo código **não é disciplina** — `AD`, `FE`, `PL`, `TR`, `TE`, `LP` —
  MUST receber o veredito **`nao_aplicavel`** e MUST NOT entrar no cruzamento. `nao_aplicavel` MUST
  ser distinguido de `sem_fonte` no relatório: o primeiro diz *não havia o que procurar*, o segundo
  diz *procurei e não achei*. *(decisão de 08/09/2026)*
- **FR-025.11**: Linha de cabeçalho repetida dentro da faixa de dados — a aba `PREENCHIMENTO` repete
  o cabeçalho a cada seção, 36 vezes só no `C-AP-FR` — MUST ser descartada na extração, e o descarte
  MUST ser contado no relatório. Cabeçalho lido como dado vira lançamento fantasma.
- **FR-009.1**: A linha de base da contagem MUST ser refeita pela **sondagem prévia**, contra a
  planilha ao vivo, **antes** da carga. O delta contra o documento 05 §10 MUST ser registrado e
  aprovado antes de virar critério. A contagem continua **bloqueante** — muda de onde vem o número
  esperado, não o rigor. *(pendência P-8; decisão de 08/09/2026)*
- **FR-018.1**: Quando uma coluna obrigatória não tiver valor na origem — os cinco `NOT NULL` de
  `instrutores`, pendência D-08 —, a carga MUST **falhar nomeando o registro e a coluna**. Valor
  MUST NOT ser fabricado. A lacuna é **pendência operacional a resolver na planilha antes do corte**.
  *(decisão de 08/09/2026)*
- **FR-025.8**: `registros_aula.unidade_ensino_id` MUST tornar-se anulável **com `CHECK` que confine
  o nulo ao histórico migrado** — nulo admitido apenas quando `origem_migracao_v1` estiver preenchido.
  O grão de Unidade de Ensino MUST permanecer **obrigatório para todo dado novo**, preservando a
  decisão UE-1 onde ela importa. *(decisão de 08/09/2026, resolve o bloqueio R-1)*
- **FR-025.4**: As planilhas da v1.0 MUST NOT ser versionadas. São dado real da MB e o repositório é
  público — protegidas no `.gitignore` em 07/09/2026, antes de qualquer commit.
- **FR-026**: As duas lacunas de schema — P-6 e P-7 do documento 30 §13 — MUST ser corrigidas por
  **migrations aditivas emendando o Épico 1**, aplicadas **antes** da primeira carga:
  `turma_disciplina` recebe `instrutor_id`, e as chaves de prioridade passam a respeitar o `CHECK` de
  formato. *(decisão de Bernardo, 07/09/2026)*
- **FR-027**: A primeira carga real e todos os testes MUST rodar contra o **banco local em Docker**.
  Nenhum dado real MUST sair da máquina enquanto a CIAARA-14.2 não decidir sobre hospedagem.
  *(decisão de Bernardo, 07/09/2026)*

### Key Entities

- **Origem**: a planilha `Banco de dados CIAARA-11 v2.0`, 23 abas, **escrita todo dia** e ainda em
  produção. Fonte de verdade até o corte.
- **Snapshot da origem**: cópia datada e imutável, artefato que torna a carga reproduzível.
- **Área de staging**: retrato textual da origem dentro do banco de destino, antes de qualquer
  conversão — é o que transforma a reconciliação em comparação entre duas tabelas do mesmo motor, em
  vez de comparação entre memória e banco.
- **Chave legada**: o identificador da v2.0, preservado verbatim; **é o mapa** que resolve as chaves
  estrangeiras.
- **Log de migração**: registro append-only, contínuo desde a v2.0 — nunca reescrito, nem pelo
  perfil administrativo.
- **Relatório de reconciliação**: o artefato que autoriza ou bloqueia o corte.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A contagem de **todas** as tabelas bate com o documento 05 §10 — divergência de **uma**
  linha bloqueia o corte.
- **SC-002**: A divergência de tempos de aula por turma é **0 em 29 de 29 turmas**, sem tolerância.
- **SC-003**: **Zero** chave estrangeira órfã, e **100%** das linhas migradas com chave legada única e
  procedência preenchida.
- **SC-004**: Duas execuções da carga do zero produzem contagens e checksums **idênticos** em todas
  as tabelas.
- **SC-005**: Uma linha escolhida ao acaso pode ser rastreada até sua origem na planilha usando
  **apenas** o que está gravado no banco.
- **SC-006**: As **717+** linhas de log históricas chegam sem nenhuma alteração, e a tentativa de
  alterá-las é recusada **pelo banco** para todo perfil.
- **SC-007**: O ensaio completo roda **sem nenhuma escrita** na planilha de origem, e seu tempo total
  é conhecido antes do corte.
- **SC-008**: Uma troca deliberada de chave estrangeira, feita para testar, é **detectada** pela
  reconciliação mesmo com a contagem total inalterada.
- **SC-009**: Ao fim do épico há **zero** tela nova e **zero** regra de negócio nova — o épico
  transportou, não reinterpretou.

---

## Assumptions

- **O documento 30 decide o *como*; esta spec decide o *o quê*.** Onde os dois divergirem, o
  documento 30 tem precedência técnica e esta spec tem precedência de aceite. Divergência real vira
  pendência registrada, não escolha silenciosa.
- **A v2.0 já saneou o conteúdo.** O ETL transporta. Qualquer achado de conteúdo vira registro, nunca
  correção embutida — é o risco nomeado no documento 06.
- **Os números de referência vêm do documento 05 §10** e do documento 06, não de contagem feita na
  hora. Se a planilha ao vivo divergir deles, isso **é** um achado — e é a pendência **P-8**, que
  registra que o inventário de 02/08/2026 já não corresponde à planilha atual.
- **Os scripts da v2.0 são reaproveitados**, não reescritos do zero (documento 06, "Origem v2.0").
- **A carga roda com a chave administrativa, sem sessão autenticada**, e as duas armadilhas que isso
  produz já estão diagnosticadas no documento 30 §3 — assume-se que serão tratadas, não
  redescobertas.
- **As 572 UEs entram por seed normativo**, com a norma de origem — decisão já registrada no Épico 1
  (achado A-13). Esta fatia carrega o **histórico**, não o catálogo.
- **A base é pequena** — cerca de 5.400 linhas. A transação única custa segundos. Otimizar
  desempenho aqui é resolver problema que não existe.
- **P-9 (data e janela do corte) e P-10 (quem opera) não bloqueiam o desenvolvimento do ETL**, só o
  corte. Assume-se que serão decididos antes da fase de corte, não antes da primeira linha de código.
- **Dívida herdada do Épico 0, que esta fatia encontra pelo caminho:** o V-9 do `quickstart.md` da
  spec 001 reprova por construção desde 07/09/2026, e `contracts/variaveis-ambiente.md` contradiz o
  documento 10 sobre os escopos da chave administrativa. Nenhum dos dois bloqueia este épico;
  ambos precisam ser reescritos por quem passar por ali.

---

## Pendências abertas por esta spec

| # | Item | Bloqueia |
| --- | --- | --- |
| **Q1** | Grão de UE dos 1.566 registros históricos, e os 3 currículos sem UE | **A modelagem da carga.** É a primeira decisão a tomar |
| **Q2** | P-6 e P-7 — as duas lacunas de schema | **A primeira carga.** Sem elas, falha |
| **Q3** | Banco de destino da carga real | **O corte**, não o desenvolvimento |
| P-8 | O inventário de 02/08/2026 não corresponde à planilha ao vivo | A sondagem prévia precisa reconferir |
| P-9 | Data e janela do corte | O corte |
| P-10 | Quem opera o corte e detém a chave administrativa de produção | O corte |
