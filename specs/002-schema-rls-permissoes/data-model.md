# Fase 1 — Modelo de dados

**Fatia**: Épico 1 — Schema PostgreSQL, RLS e matriz de permissões
**Data**: 2026-08-28
**Autoridade de nomes**: BRIEF §2.1 · **Semântica de atributo**: doc 05 §4 + `docs/sql-referencia/`

Este documento descreve **o que cada entidade guarda e o que o motor garante sobre ela**. O DDL
literal é escrito à mão na migration, a partir de `docs/sql-referencia/` revisado — não é reproduzido
aqui, para não criar uma segunda fonte de verdade do schema.

---

## 1. Convenções universais

Valem para **toda** entidade, sem exceção. Onde uma entidade se desvia, o desvio está anotado.

| Convenção | Regra | Requisito |
|---|---|---|
| Identidade | `id uuid` gerado pelo motor. Não deriva de valor de negócio e nunca se recalcula | FR-002 |
| Chave legada | `codigo text unique not null` — o `ID_*` da v2.0 **verbatim**. Não é sequencial: guarda `CAHO`, `C-Ap-FR 2026`, `1 - CAHO - MAT`. **Nenhuma FK aponta para ele** | FR-003 |
| Rastro | `origem_migracao_v1 text` em toda tabela migrada | FR-004 |
| Ciclo de vida | `status` explícito, nunca deduzido de ausência | FR-005 |
| Auditoria | `criado_por`, `criado_em`, `editado_por`, `editado_em`, por gatilho, a partir da identidade autenticada | FR-006 |
| Referências | `on delete restrict` por padrão. Duas exceções, ambas documentadas | FR-007 |
| Acesso | RLS ligada. Sem policy, inacessível — intencional | FR-032 |
| Exclusão | **Nenhuma** policy de `DELETE`, **nenhum** `GRANT` de `DELETE` | FR-033 |
| Tempo | `timestamptz`, banco em UTC, apresentação em `America/Sao_Paulo` | — |

---

## 2. Núcleo acadêmico

### `cursos`
Catálogo institucional — 24 linhas. Raiz de quase todo o grafo.
**Atenção:** as sete colunas de regime que a v2.0 mantinha como fórmula de exibição **não existem
aqui** — reaparecem em `vw_cursos_regime_vigente`, resolvidas pelo histórico de vigência.
**Garante:** `unique (id, curso_id)`... não se aplica; `codigo` é a sigla (`CAHO`, `C-Ap-FR`).

### `configuracoes_horario`
Cabeçalho extraído de `Horarios_Tempos_Aula`, que era desnormalizada. **Sem este cabeçalho não existe
alvo de FK para "a configuração"** — é o que elimina as chaves órfãs `D`/`E`.

### `horarios_tempos_aula`
Catálogo de posições do dia (~40 linhas despivotadas). `unique (config_codigo, tempo_numero)`.

### `curso_regime_historico`
O regime como **série temporal** — 29 linhas. `vigente_de` obrigatório, `vigente_ate` nulo = vigente.
**Garante (FR-017, `RN-2027-09`):** nenhum curso tem dois regimes **do mesmo tipo** vigentes ao mesmo
tempo. Imposto por exclusão sobre intervalo, restrito às linhas ativas, tratando "sem término" como
infinito. **Nenhuma edição reinterpreta o passado** (FR-019): o histórico é lido com a configuração
vigente na data do próprio registro.

### `turmas`
A ocorrência do curso no tempo — 29 linhas.
**Garante (FR-009):** `unique (curso_id, turma, ano_letivo)`.
**Domínio de situação (FR-047):** exatamente quatro valores — planejada, ativa, concluída, cancelada.
**"Arquivada" não entra** (TURMA-1, decisão de 28/08/2026): é filtro de apresentação.
**Chave auxiliar:** `unique (id, curso_id)` — componente da cadeia de RN-MAT-01 (research §3).

### `disciplinas`
A grade curricular do curso — 175 linhas.
**Garante (FR-008, `RN-MAT-02`, `RF-DADOS-06`):** `unique (curso_id, cod_disciplina)`, genérico para
qualquer curso. Encerra o contorno específico do C-Ap-FR, que não pegou a duplicata do `C-Esp-ALH`.
**Chave auxiliar:** `unique (id, curso_id)`.
**Não recriar** as colunas mortas removidas pela spec `033` da v2.0 (FR-015).
**Não existe** campo gravável de carga horária executada (FR-028).

### `unidades_ensino` — **[NOVA — UE-1 rota (b)]**
A Unidade de Ensino como entidade de primeira classe. **572 linhas** no catálogo extraído dos
currículos da DEnsM.

| Atributo | Origem | Observação |
|---|---|---|
| `disciplina_id` | — | obrigatório, `restrict` |
| `curso_id` | — | componente da cadeia de chaves compostas (research §3) |
| `numero_ue` | currículo | inteiro **positivo** |
| `topico` | currículo | verbatim |
| `ch_prevista_tempos` | currículo | verbatim |
| `tecnica_ensino_sugerida` | doc 05 §9.1 | anulável |
| `fundamento_normativo` | currículo | **o Ofício da DEnsM que o aprovou** (FR-023) |
| `status` | — | universal |

**Garante (FR-021):** `unique (disciplina_id, numero_ue)`; `numero_ue > 0`; `unique (id, curso_id)`;
FK composta `(disciplina_id, curso_id) → disciplinas(id, curso_id)`.

**Não garante, de propósito (FR-025):** **numeração contígua**. Um currículo pode numerar com salto, e
lacuna é dado válido. Uma verificação de contiguidade recusaria dado normativo correto — **não
acrescentar**.

**Atributos limitados aos cinco do doc 05 §9.1 mais os universais.** Atributo a mais exige pergunta,
não suposição (Princípio I).

**Carga:** Épico 2 — depende de `disciplinas`. Ver [plan.md](./plan.md), *O que fica FORA desta fatia*.

### `turma_disciplina`
A execução da grade **por turma** — 210 linhas, das quais **121 têm período em branco**. Exigir
preenchimento aqui inviabiliza a carga do Épico 2.
**Garante (FR-011, LIQ-1):** `unique (turma_id, disciplina_id)`.

---

## 3. Corpo docente — e as três formas de atribuição

**Confundi-las já causou defeito em produção.** São entidades distintas e continuam distintas.

| Entidade | Significa | Quem lê |
|---|---|---|
| `instrutor_disciplina` | **habilitação** — este instrutor *pode* ministrar | validações de lançamento |
| `disciplinas.instrutores_atribuidos` | **planejamento**, por grade de curso | telas de grade |
| `turma_disciplina_instrutor` | **atribuição real**, por turma, com rateio de carga | **LIQ e OS de Instrutoria** |

Ler `instrutor_disciplina` no lugar da terceira foi o defeito que a spec `034` da v2.0 corrigiu.

### `instrutores`
177 linhas. `nip` como chave de negócio quando presente.
**Garante (FR-029, `RN-INST-04`):** **não existe** campo editável de carga horária. A grandeza é
exposta por view agregada — sempre calculada, nunca digitada.
**Situação explícita em 100% das linhas** (FR-005, `RN-INST-05`) — os 177 estavam em branco na base
viva, e é essa correção que torna `RN-INST-02` testável desde o primeiro dia.

### `instrutor_disciplina`
798 vínculos. **Garante (FR-010):** `unique (instrutor_id, disciplina_id)`.

### `turma_disciplina_instrutor`
A atribuição real. Existe porque a auditoria da planilha viva provou que a coluna de instrutor
continha **lista** (`"40, 60, 18, 19"`) e a de carga continha **mapa** (`"40:200, 60:200"`) — coluna
escalar não comporta isso.

### `responsaveis_curso`
As assinaturas do DSA impresso. Vigência temporal.
**Garante (FR-018):** um curso não tem duas assinaturas do mesmo papel vigentes ao mesmo tempo — é o
que impede um DSA reimpresso sair com duas rubricas do mesmo papel.

---

## 4. Fatos de execução

### `registros_aula` — **no grão de Unidade de Ensino**
1.566 linhas históricas a migrar (Épico 2).

**A mudança de fundo desta fatia:**

| | Referência (grão antigo) | **Épico 1** |
|---|---|---|
| Aponta para | `disciplina_id` obrigatório | **`unidade_ensino_id` obrigatório** |
| Guarda disciplina | sim, como coluna | **não** — alcançada pela unidade |
| RN-MAT-01 | implícita | **cadeia de chaves compostas** |

**Garante (FR-020):** o grão é a unidade de ensino, provado por asserção pgTAP **nomeada** — que falha
se `disciplina_id` reaparecer como coluna gravável. É o risco explícito do documento 06.
**Garante (FR-061, `RN-MAT-01`):** turma e unidade de ensino **do mesmo curso**, por construção (research §3). Asserção nomeada obrigatória em T040 (FR-062).
**Mantém:** consumo de tempos de aula; o último tempo ocupado como valor derivado imutável;
`ta_inicial` anulável — registros históricos sem posição exibem-se em faixa de rodapé, nunca lançam
exceção (`RN-DEG-01`).
**Domínio de duas categorias apenas** — aula e atividade extraclasse. O valor "Avaliação" **não
existe** aqui: avaliação vive só em `avaliacoes` (`RN-AVAL-02`), e é o domínio fechado que impede o
retorno da contagem dupla de tempos que subdimensionava a carga horária.

### `avaliacoes`
111 linhas. **Agendamento e execução são um único fato** (`RN-AVAL-02`) — não existe tabela paralela
de execução onde 186 registros pudessem flutuar soltos.
**Garante (FR-015, `RF-AVAL-06`):** fiscal interno e fiscal externo **mutuamente exclusivos**.
**Garante (FR-061, `RN-MAT-01`):** cadeia de chaves compostas **própria** — a avaliação referencia disciplina, não unidade de ensino: `(turma_id, curso_id) → turmas` e `(disciplina_id, curso_id) → disciplinas`, com `curso_id` na própria tabela.
**Exceção de referência documentada:** o fiscal usa `set null` — fiscal **não** exige habilitação
(`RN-INST-01` delimitada).
**Consome tempos de aula e compõe a CHD** (`RN-EVT-03`), incluindo a vista de prova.

### `avaliacoes_planejadas`
118 linhas, catálogo do "dever-ser".
**Sem FK para `disciplinas`, e é deliberado** (`RN-AVAL-01`): o vínculo se dá por **casamento de nome
normalizado**, não por chave formal. Criar a FK mudaria a regra de negócio. O que a plataforma
acrescenta é o nome normalizado como valor derivado, que torna o casamento determinístico.
**Exceção de referência documentada:** `set null` — a FK só guarda o vínculo já confirmado.

### `atividades_nao_letivas`
664 linhas — 531 estudo individual, 62 AEC, 60 TAD, 11 TR.
**Garante (FR-014, `RN-EVT-02`):** turma obrigatória **se e somente se** o escopo for de turma; escopo
global **nunca** tem turma.
**Valor derivado imutável:** compõe CHT ⟺ não é estudo individual. **Estudo individual fica fora da
soma de CHT**, controlado à parte — a fórmula é `CHT = CHD + AEC + TAD + TR`.

### `planejamento_anual`
Resultado do motor preditivo, versionado.
**Garante (FR-012, `RF-2027-04`):** **no máximo um planejamento salvo por ano** — índice único
parcial. Promover uma versão a oficial é operação única e indivisível.
**Garante (FR-016):** linha de disciplina **se e somente se** houver disciplina.

---

## 5. Calendário

`feriados` (26 linhas, funde `Eventos_Globais` e `Calendario_Feriados`), `janelas_curso` e
`reservas_proens`. Aposentam as constantes `FERIADOS_2027`, `SEMENTES_2027` e `RESERVAS_PROENS` do
`Código.gs` (`RF-DADOS-04`, `RNF-MAN-04`).

**Nota de regra (`RN-EVT-02`):** um feriado só desconta capacidade quando o impacto é de dia inteiro.
Parcial e informativo não descontam nada.

---

## 6. Governança e acesso

### `usuarios`
3 linhas. Ligação 1:1 com a conta de autenticação, **anulável entre o cadastro e o aceite do
convite** — é a janela em que o Admin revisa o perfil antes de a pessoa entrar.
**Garante (FR-013):** `unique (auth_user_id)`.
**Garante (FR-037, `RN-RBAC-02`):** ninguém amplia o próprio perfil, escopo ou situação. **Por
gatilho, não por policy** — a policy avalia a linha inteira e não sabe **o que mudou**; ela aprovaria
a escalada. O gatilho libera explicitamente o contexto sem sessão autenticada, sob pena de bloquear a
carga do Épico 2 e a desativação de conta pelo painel.

### `usuario_curso`
Vínculo N:N — o Encarregado de Curso pode ter mais de um curso.

### `perfil_permissao`
**A autorização como dado.** `(perfil, recurso, acao, permitido)`, `unique (perfil, recurso, acao)`.
152 linhas de semente.
**A ação chama-se `desativar`, nunca `excluir`** (FR-035) — a matriz descreve o que o sistema faz, e
este sistema não apaga nada.
**Leitura aberta a qualquer sessão autenticada** (FR-039): a interface precisa saber quais ações
oferecer, e a matriz é a definição pública das regras. Escondê-la seria obscuridade sem ganho.

**As três tabelas de fronteira** — `perfil_permissao`, `usuarios`, `usuario_curso` — são as únicas
presas diretamente ao perfil de Administrador, e não à matriz (FR-038). **A matriz não pode ser a
autoridade sobre quem edita a matriz**: quem escreve nela pode se autoconceder qualquer permissão.

---

## 7. Configuração

### `config_parametros`
Tetos AEC 10% / TAD 5% / TR 10%, faixas de carga horária docente por regime (20h → 8–12h,
40h → 16–24h, Dedicação Exclusiva → 16–30h) e limite de tempos de aula por dia. **Cada um com a norma
de origem** (FR-048, `RNF-NORM-08`).

> **A proibição que a plataforma convida a violar (FR-049, `RN-DEG-02`).** Escrever
> `check (tempos <= 8)` é trivial em PostgreSQL, e **mudaria a regra de negócio**. O 9º tempo de aula
> é autorização normativa explícita nos currículos de CAHO, C-Ap-HN e C-Ap-FR; a capacitação didática
> está ausente em 83,6% dos 177 instrutores. Bloquear qualquer um dos dois contrariaria a norma e
> inviabilizaria a operação. **São alerta com justificativa registrada.** Existe teste **positivo**
> provando que o 9º TA é aceito (FR-050) — o par que documenta a intenção e impede que uma mudança
> futura "conserte" o que não está quebrado.

### `config_listas`
Domínio operacional **administrável**: metodologias, tipos de avaliação, subtipos de atividade,
classificações de curso. Acrescentar valor é cadastrar (FR-046).

**A divisão dos domínios (FR-046).** Normativo fechado vira tipo enumerado — ampliar exige decisão
versionada, e **é assim que deve ser**, porque a taxonomia vem do Glossário DEnsM e não é
administrável. Operacional vira `config_listas`. **Na dúvida, `config_listas`**: fechar cedo demais
custa uma migração para desfazer.

---

## 8. Rastro técnico — o que não se reescreve

### `migracao_log`
717+ linhas históricas, e continua a partir delas. **Append-only em três camadas**, e a redundância é
de propósito (FR-051, Princípio IV):

1. Privilégio de escrita **revogado** para sessão autenticada;
2. **Gatilho** que impede alteração **inclusive para a credencial de maior privilégio** — a que ignora
   todas as demais regras de acesso **não ignora este gatilho**;
3. Policy **apenas de leitura**, condicionada à permissão de auditoria.

**Corrigir é registrar evento novo, nunca reescrever** (FR-052). Foi assim com a renomeação
Matéria→Disciplina (P-14). Uma linha reescrita destrói a evidência sem deixar rastro.

### `arquivo_avaliacoes_v1`
186 linhas em quarentena. **Somente leitura** (FR-053).

---

## 9. Grandezas derivadas — nenhuma com segunda fonte de verdade

**A regra (FR-027, `RN-CRUD-02`):** derivado é **valor imutável calculado da própria linha** ou
**view**. Nunca coluna gravada em paralelo. Tentar gravar **falha**.

| Grandeza | Forma | Por quê |
|---|---|---|
| Compõe CHT | valor da própria linha | Depende só dela, e é imutável |
| Último tempo ocupado | valor da própria linha | Aritmética imutável. Torna a detecção de sobreposição comparação de intervalos |
| Semanas, CH semanal | valor da própria linha | idem |
| Nome normalizado | valor da própria linha | Torna o casamento de `RN-AVAL-01` determinístico e indexável |
| Situação de vista de prova | **view** | Depende da data corrente — um valor imutável **rejeitaria** a expressão |
| Tempo de setor | **view** | idem |
| **Execução por unidade de ensino** | **view** | Agregação entre tabelas — **nova** |
| **Execução por disciplina** | **view sobre a anterior** | **Reescrita para o grão de UE.** Assinatura pública inalterada |
| Carga horária anual do instrutor | **view** | `RN-INST-04`: sempre calculada, nunca digitada |
| Regime vigente do curso | **view** | Resolve o histórico de vigência |
| Rótulo completo do instrutor | **componente de interface** | Formatação de apresentação, não dado |

---

## 10. Volumes — para dimensionar, não para otimizar

| Entidade | Linhas |
|---|---|
| cursos · turmas · disciplinas | 24 · 29 · 175 |
| **unidades de ensino** | **572** *(carga no Épico 2)* |
| instrutores · habilitações · grade por turma | 177 · 798 · 210 |
| registros de aula · avaliações · atividades não letivas | 1.566 · 111 · 664 |
| log de migração · quarentena | 717+ · 186 |
| **Total de fatos de execução** | **~2.400** |

**A base é pequena.** Prefere-se view a coluna materializada; normalizar a duplicar; e **não se cria
índice sem consulta lenta observada**. O gargalo real deste sistema nunca foi o banco — foi a
dificuldade de entender e alterar o que existia.

**Aritmética de reconciliação, para o Épico 2 conferir:** 1.566 + 1 transferida + 186 avaliações =
**1.753** · 663 + 1 = **664** · 531 + 62 + 60 + 11 = **664**.
**Nova invariante desta fatia:** para toda disciplina com unidades cadastradas, a soma das cargas
horárias das suas unidades é igual à carga horária da disciplina — **134 de 134** no catálogo extraído.
