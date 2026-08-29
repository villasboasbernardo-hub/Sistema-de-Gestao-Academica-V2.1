<!--
SYNC IMPACT REPORT — .specify/memory/constitution.md
====================================================
Version change:      (template não preenchido) → 2.1.0
Motivo do bump:      nenhum. Não é emenda: é a TRANSCRIÇÃO da constitution 2.1.0
                     já vigente em `docs/vibe-coding/40-Constitution-v2.1.md`, ratificada
                     em 2026-08-26. Nenhum princípio foi criado, alterado ou removido.

Princípios preenchidos (11 — o template trazia 5 vagas; ampliado conforme a skill):
  I.    Fidelidade à Fase 1 ........................ [PRESERVADO]
  II.   Preservação de Regras de Negócio ........... [PRESERVADO E REFORÇADO]
  III.  Restrição de Plataforma .................... [REESCRITO — v2.1]
  IV.   Integridade do Histórico ................... [PRESERVADO]
  V.    Degradação Segura e Alerta-Não-Bloqueio .... [PRESERVADO]
  VI.   Mudança Cirúrgica, Validada por Invariantes  [PRESERVADO]
  VII.  Configuração Sobre Constante ............... [PRESERVADO E ESTENDIDO]
  VIII. Rastreabilidade ............................ [PRESERVADO]
  IX.   Contenção de Escopo ........................ [PRESERVADO]
  X.    Paridade Antes de Novidade ................. [NOVO — v2.1]
  XI.   O Banco é a Fronteira ...................... [NOVO — v2.1]

Seções preenchidas:
  SECTION_2_NAME → Restrições Adicionais
  SECTION_3_NAME → Fluxo de Desenvolvimento
  GOVERNANCE_RULES → Governança (íntegra, incl. precedência entre documentos)
  GUIDANCE_FILE → CLAUDE.md (na raiz do repositório)

Placeholders remanescentes: nenhum.

Cabeçalhos mantidos em português (Princípios Fundamentais / Governança, e não
"Core Principles" / "Governance"): o princípio de Idioma exige pt-BR em toda a
documentação, e nenhum script ou skill do Spec Kit faz parse estrutural desses
títulos — verificado por grep em .specify/scripts, .specify/templates e
.claude/skills antes da escrita.

TODO(FONTE-ÚNICA): este arquivo e `docs/vibe-coding/40-Constitution-v2.1.md` passam a
conter o mesmo texto normativo em dois lugares. Enquanto os dois existirem, uma
emenda precisa ser aplicada NOS DOIS, sob pena de divergência silenciosa. A decisão
sobre consolidar num só endereço é do Bernardo e não foi tomada aqui.
-->

# CIAARA-11 v2.1 Constitution

> **Nota de transcrição — não normativa.** O texto normativo abaixo é reprodução literal de
> `docs/vibe-coding/40-Constitution-v2.1.md`, ratificado em 26/08/2026. Este arquivo existe porque é o
> endereço que as skills `/speckit-*` leem em tempo de execução. **Não edite aqui sem aplicar a
> mesma emenda no documento 40** — e vice-versa. Emenda exige decisão nominal do Bernardo, com data
> e motivo, conforme a seção *Governança*.

## Princípios Fundamentais

### I. Fidelidade à Fase 1 · **[PRESERVADO]**

Os documentos **00 a 09** de `Fase 1 - Requisitos/` são a fonte de verdade sobre requisitos, regras
de negócio, modelo de dados e escopo. Os documentos **20 a 25** de `Fase 2 - Arquitetura/` são a
fonte de verdade sobre o desenho técnico que os realiza. O **`BRIEF-v2.1.md`** é o contrato de
consistência entre todos eles: nenhum documento pode contradizê-lo.

Toda decisão técnica de arquitetura, plano ou tarefa deve citar o(s) identificador(es)
`RF-`/`RN-`/`RNF-` correspondente(s). Quando um documento estiver ambíguo ou omisso sobre um ponto
necessário à implementação, a decisão é **levada ao responsável (Bernardo) antes de assumida** —
nunca inferida silenciosamente. É o mesmo padrão que resolveu P-14 e a rejeição da CAHO 2026 como
padrão-ouro (ver Princípio VI).

**Mudança de endereço, não de natureza.** Na v2.0 os documentos viviam em `docs/fase-1/`. Na v2.1
vivem em `docs/` dentro do repositório de código, versionados junto dele (BRIEF §4). Copiar a
documentação para dentro do repositório não é redundância burocrática: é o que permite ao agente
citar `RF-DSA-08` ou `RN-2027-06` **com o texto real à vista**, em vez de parafrasear de memória.

Se um documento da Fase 1 ou 2 parecer errado, **reporte — não invente alternativa** (BRIEF,
cabeçalho).

---

### II. Preservação de Regras de Negócio · **[PRESERVADO E REFORÇADO]**

Uma migração de plataforma implica **zero mudança de comportamento observável** no domínio. As ~40
regras `RN-` do documento 04 — sobretudo as ~22 classificadas *Risco: Alto* — são o contrato a
preservar. Elas não são "código legado a modernizar": são a codificação de normas da Marinha do
Brasil, validadas em produção e conferidas pelo responsável ao longo de 39 specs.

**[NOVO — v2.1] O reforço é físico, não retórico.** Na v2.0 uma regra de negócio podia morar em
qualquer lugar do `Código.gs`. Na v2.1 ela tem endereço obrigatório:

| Onde a regra vive | O que mora ali | Restrição de construção |
|---|---|---|
| **`lib/dominio/`** | As regras `RN-` como **funções TypeScript puras**: motor preditivo, distribuição semanal de CH, detecção de conflito de horário, sugestão do DSA, ordenação por antiguidade, tetos normativos, rateio de CH multidisciplinar | **Nada em `lib/dominio/` importa `supabase`, `next` ou `react`.** Sem I/O. Garantido por regra de ESLint que falha o build, não por disciplina |
| **Constraint / trigger / policy** | Integridade e autorização que o motor pode garantir melhor que a aplicação | Ver Princípio XI |
| **`lib/acoes/`** | Orquestração: Zod → domínio → Supabase → `revalidatePath` | Não decide regra; **aplica** a que veio de `lib/dominio/` |

**A prova é a suíte de invariantes, não a leitura do diff.** Toda função de `lib/dominio/` tocada por
uma fatia tem teste Vitest com casos sintéticos; toda regra `RN-` de *Risco: Alto* tem asserção
pgTAP nomeada pelo próprio identificador. A suíte de invariantes da v2.0 (`tests/*.test.js`) porta
quase 1:1, porque as regras já eram funções puras — foi para isso que `RF-MOD-02` existiu.

**A tradução proibida.** Portar uma regra é reescrevê-la na sintaxe nova **preservando o
comportamento**, incluindo o comportamento que parece errado. Quem encontrar uma regra estranha
reporta; não conserta. `RN-CONF-02` (o horário ancora no início do dia, deliberadamente diferente
das planilhas legadas) é o exemplo canônico: é fácil de "melhorar" por engano e a melhoria é um
defeito.

---

### III. Restrição de Plataforma · **[REESCRITO — v2.1]**

Este é o princípio que muda de sentido nesta versão. **Ele não é deletado**, porque a trilha importa:
quem ler esta constitution em 2028 precisa entender que a restrição anterior existiu, por que
existiu, quem a revogou e quando.

#### III.a — O texto revogado, preservado para leitura

> **[REVOGADO — v2.1, em 25/08/2026, por decisão de Bernardo Villas Bôas dos Santos]**
>
> *"V2.0 permanece em Google Apps Script (V8) + Google Sheets como banco + Vanilla JS/Bootstrap 5 no
> front-end, modularizado via `include()`/`HtmlService` nativo. Qualquer proposta de framework de
> front-end, bundler, CI-CD automatizado, banco de dados externo ou biblioteca de build é rejeitada
> por padrão — não é uma restrição de custo, é a decisão documentada em `RNF-PLAT-01..04`."*
>
> *"**`clasp` como padrão de implantação** (decisão de 2026-08-14, ampliada no mesmo dia de 'exceção
> pontual' para padrão do projeto). (…) A partir de 2026-08-14, `clasp login`/`clasp push`/`clasp
> deploy` (rodados manualmente por sessão — nunca pipeline automatizado, gatilho de commit, ou
> serviço de CI/CD) é o procedimento padrão de implantação do projeto (…). O protocolo de
> `BUILD_ID`/`MANIFESTO.md`/substituição completa de arquivo (documento 10 **da v2.0**, §8) continua valendo
> integralmente."*

**Por que foi revogado.** `RNF-PLAT-01` a `RNF-PLAT-04` eram restrições **da plataforma Apps
Script**, não do domínio. Faziam todo sentido enquanto o alvo era o Apps Script: proibir framework,
bundler, banco externo e CI/CD era o que mantinha o sistema publicável por uma pessoa, sem cadeia de
ferramentas. Ao mudar o alvo, a restrição perde o objeto. Mantê-la seria proibir a plataforma nova
de ser ela mesma.

**O que a revogação não alcança.** A revogação atinge **exclusivamente** `RNF-PLAT-01..04` e o
protocolo de implantação. Ela **não** toca em nenhuma regra de negócio, em nenhum termo normativo,
em nenhum teto, em nenhum critério de escopo. Quem invocar "a v2.1 revogou a restrição de
plataforma" para justificar mudança de domínio está usando este princípio ao contrário.

#### III.b — A restrição vigente

| Camada | Decisão — **não está em aberto** |
|---|---|
| Framework | **Next.js 15+, App Router, React 19, TypeScript `strict`.** Server Components por padrão; `"use client"` só onde houver interação real |
| Estilo | **Tailwind CSS v4**, configuração CSS-first via `@theme`. Substitui Bootstrap 5 e o CSS ad hoc por módulo |
| Componentes | **shadcn/ui** (Radix + `cva`), copiado para `components/ui/` e versionado no repositório |
| Banco | **Supabase PostgreSQL**. Projeto já criado pelo Bernardo |
| Autenticação | **Supabase Auth — e-mail/senha, somente por convite do Admin.** Signup público desabilitado no painel |
| Autorização | **RLS no banco** + matriz de permissões como dado (`perfil_permissao`) |
| Acesso a dados | `@supabase/ssr` (servidor) e `@supabase/supabase-js` (cliente). **Sem ORM** |
| Mutações | **Server Actions** + **Zod**, validação compartilhada cliente/servidor |
| Estado de navegação | **URL** (`searchParams`) com **`nuqs`**. Substitui o objeto `AppState` |
| Gráficos | **Recharts**. Substitui Chart.js |
| Impressão | CSS `@media print` + rotas dedicadas `/print/*` |
| Testes | **Vitest** (unidade/regras) · **Playwright** (e2e) · **pgTAP** (invariantes SQL) |
| Hospedagem | **Vercel**, com preview por branch |
| Repositório | **GitHub**, Conventional Commits |
| ETL | **Python**, reaproveitando `migracao/*.py` da v2.0 |

**Proibições permanentes da v2.1** (BRIEF §1), rejeitadas por padrão como as anteriores eram:

1. **ORM que esconda o SQL** — Prisma, Drizzle ou equivalente. O SQL desta migração é documentação
   executável; escondê-lo atrás de um gerador anula a razão de ter migrado.
2. **Banco fora do Supabase.**
3. **Biblioteca de componentes além de shadcn/Radix.**
4. **Qualquer regra de negócio implementada apenas na UI.** Se a regra só existe no componente, ela
   não existe: o dado entra por Server Action, por script, por outra tela.

#### III.c — O protocolo de implantação também se aposenta

**[REVOGADO — v2.1]** `clasp login`/`clasp push`/`clasp deploy`, o `BUILD_ID` compartilhado entre
backend e frontend, o `implantacao/MANIFESTO.md` e o ritual de substituição completa de arquivo.
Todos existiam para resolver problemas que **deixam de ser possíveis**:

| O que se aposenta | O problema que resolvia | O que fica no lugar |
|---|---|---|
| `clasp push`/`deploy` manual | Colar 16 arquivos no editor gerava implantação órfã e erro de digitação | **Git → push → preview automático da Vercel → merge → produção.** O deploy é consequência do merge |
| `BUILD_ID` nos dois lugares (`RF-MOD-04`) | Detectar **implantação parcial** — estado possível quando arquivos eram publicados um a um | **[ABSORVIDO PELA PLATAFORMA]** O build da Vercel é atômico e versionado: implantação parcial deixa de ser um estado alcançável |
| `implantacao/MANIFESTO.md` | Inventário de conferência arquivo a arquivo | O `git log` e o histórico de deploys da Vercel, ambos automáticos |
| `implantacao/historico/*.md` | Registro manual de cada publicação | Histórico de deploy da Vercel + `supabase/migrations/` versionadas |
| Substituição completa de arquivo, nunca edição parcial | Impedir dessincronização repositório × editor do navegador | Não há mais editor no navegador. **O repositório é a única origem** |

**A regra que substitui o ritual:** `main` é sempre implantável, push direto nela é bloqueado, toda
fatia vive numa branch com preview própria, e **a validação do Bernardo acontece na URL de preview,
antes do merge** — nunca em produção, nunca em captura de tela. O procedimento completo está no
documento 10 §8.

#### III.d — O gotcha da plataforma nova

O gotcha do escopo global do Apps Script morre com o Apps Script (ver *Restrições Adicionais*). O
que ocupa o lugar dele é a **fronteira Server/Client Component** e o risco de vazamento da chave
`service_role`. Está nas *Restrições Adicionais* porque é dessa natureza: uma armadilha de
plataforma que produz defeito silencioso e caro.

---

### IV. Integridade do Histórico · **[PRESERVADO]**

Nenhuma migração, saneamento ou renomeação pode apagar ou tornar irrecuperável um registro já
lançado. Toda operação desse tipo exige snapshot prévio e fica registrada — na v2.0, na aba
`_Migracao_Log`; **[PRESERVADO — nova implementação]** na v2.1, na tabela `migracao_log` do
PostgreSQL, que recebe as 717+ linhas históricas **intactas** e continua a partir delas.

**Reescrever uma linha de log já gravada para "corrigir" o passado é sempre proibido. O jeito certo
de corrigir é logar a correção como um evento novo.** Foi assim com a renomeação Matéria→Disciplina
(P-14), que gerou linhas novas em vez de reescrever as existentes.

**[MIGRAÇÃO v2.1] A garantia deixa de ser disciplina e passa a ser motor.** Na v2.0 a
imutabilidade do log dependia de ninguém editar a aba. Na v2.1 ela é imposta em três camadas, e
nenhuma delas depende de boa memória:

1. **`GRANT` de `INSERT`/`UPDATE`/`DELETE` revogado** para `authenticated` em `migracao_log` e em
   `arquivo_avaliacoes_v1`.
2. **Gatilho `app.bloquear_reescrita`**, que impede `UPDATE` **inclusive para `service_role`** — a
   chave que ignora toda a RLS não ignora este gatilho.
3. **Policy apenas de `SELECT`**, condicionada a `app.pode('auditoria','ler')`.

`migracao_log` é a evidência auditável de que 100% do histórico foi transportado. Uma linha
reescrita destrói a evidência sem deixar rastro — por isso a proteção é redundante de propósito.
Verificado pelo teste **T-08** da suíte de segurança (documento 22 §10).

---

### V. Degradação Segura e Alerta-Não-Bloqueio · **[PRESERVADO]**

Quando uma funcionalidade depende de um dado que ainda não existe, o retorno é **vazio/neutro com
aviso** — nunca uma exceção não tratada (`RN-DEG-01`). Na v2.1 isso se materializa como `error.tsx`
e `loading.tsx` **por segmento de rota**: uma falha de leitura no painel de KPIs derruba o painel,
não a tela inteira.

Regras de origem normativa cuja violação **não é 100% verificável** a partir dos dados do sistema —
uso do 9º TA, capacitação didática pendente, estouro de teto de AEC/TAD/TR — são implementadas como
**alerta com necessidade de justificativa, nunca como bloqueio automático** (`RN-DEG-02`).

**[NOVO — v2.1] O corolário de plataforma, que precisa ser dito.** O PostgreSQL oferece `CHECK`
constraints, e um agente zeloso vai propor transformar um teto normativo em `CHECK`. **Isso mudaria
a regra de negócio.** O teto de AEC (≤ 10%), o de TAD (≤ 5%), o de TR (≤ 10%) e o 9º TA são
**alerta**, autorizados por currículo em cursos como CAHO, C-Ap-HN e C-Ap-FR. Um `CHECK` os
converteria em bloqueio, e o operador ficaria impedido de lançar o que a norma permite. Está
explicitamente proibido no Épico 9 do documento 06 e repetido aqui porque é o erro que a plataforma
nova convida a cometer.

Distinguir "não há dado" de "há dado que você não pode ver" é parte desta obrigação: uma RLS
restritiva demais faz a tela abrir **vazia, sem erro**, e o usuário conclui que não há cadastro
(risco R-03, documento 20 §11). O componente de estado vazio precisa dizer qual dos dois é.

---

### VI. Mudança Cirúrgica, Validada por Invariantes · **[PRESERVADO]**

Cada unidade de mudança é pequena, testável isoladamente e vem em um commit próprio — o mesmo padrão
que produziu os 22 commits "Missão N" da v1.0 e as 39 specs da v2.0.

**Decisão de 2026-08-10, mantida integralmente e sem reabertura.** O texto original do documento 10
da v2.0 (§3.3) usava a **CAHO 2026** como curso de referência para validar não regressão por diff de
saída histórica. Bernardo determinou descartar essa estratégia — *"descobri que ele possui muitos
erros"* — porque os dados da CAHO 2026 não são confiáveis como padrão-ouro.

A validação de não regressão é feita por **invariantes estruturais e matemáticos**:

- contagens por tabela e as identidades aritméticas da reconciliação (1.566 + 1 + 186 = 1.753;
  663 + 1 = 664; 531 + 62 + 60 + 11 = 664);
- integridade referencial — zero FK órfã em toda a base;
- regras `RN-` verificáveis por função pura com casos sintéticos (Vitest) ou por asserção SQL
  (pgTAP);
- invariantes cruzados entre módulos: os totais por categoria do DSA, do Relatório e do Cronograma
  para o mesmo período têm de bater, porque saem do **mesmo conjunto de funções de agregação**.

**Nunca por comparação byte a byte com a saída histórica de um curso específico.** Este critério é
inegociável e aparece como critério de aceite do Épico 2 e do Épico 7 do documento 06.

**[NOVO — v2.1] O que "cirúrgico" significa numa plataforma com migrations.** Uma migration é
irreversível na prática assim que roda em produção com dado real em cima. Portanto: uma fatia = uma
migration coesa, revertível, com o plano de reversão escrito **antes** do merge, e aplicada primeiro
em preview. O documento 10 §8.3 e §8.4 trazem o procedimento.

---

### VII. Configuração Sobre Constante · **[PRESERVADO E ESTENDIDO]**

Limites normativos (tetos de AEC/TAD/TR, faixas de carga horária docente, limite diário de TA por
par curso/regime) e dados anuais do PROENS (feriados, janelas de curso, reservas) vivem em tabelas
administráveis — **nunca** como literais no código (`RNF-NORM-08`, `RF-DADOS-04`).

**[PRESERVADO — nova implementação]** `Config_Parametros` e `Calendario_*` das abas da v2.0 viram
`config_parametros`, `feriados`, `janelas_curso` e `reservas_proens` no PostgreSQL, administrados
por `/admin/parametros` e `/admin/calendario`. Domínio **normativo fechado** é `ENUM` nativo;
domínio **operacional administrável** (metodologias, tipos de atividade e de avaliação) vive em
`config_listas` com FK. Na dúvida entre os dois, é `config_listas`: `ENUM` fechado cedo demais é
migration para desfazer.

**[NOVO — v2.1] A extensão à autorização.** A matriz de permissões é **dado**, não código:

```sql
create table public.perfil_permissao (
  perfil     public.perfil_usuario not null,
  recurso    text not null,        -- nome da tabela, em snake_case
  acao       text not null,        -- ler | criar | editar | desativar
  permitido  boolean not null default false,
  constraint perfil_permissao_unica unique (perfil, recurso, acao)
);
```

**Nenhuma policy do sistema contém `perfil = 'operador'`.** Toda policy pergunta
`app.pode('registros_aula','criar')`, e a resposta vem da matriz. A consequência prática vale ser
lida duas vezes: **mudar quem pode lançar aula é um `UPDATE` em uma linha** — não é migration, não é
`DROP POLICY`/`CREATE POLICY` em produção, não é deploy, não é janela de manutenção. Acrescentar um
perfil novo toca no `ENUM` (porque criar perfil é decisão organizacional) e em linhas de
`perfil_permissao` — e **em nenhuma das 68 policies**.

Note o vocabulário da matriz: a ação chama-se **`desativar`**, não `excluir`. A matriz descreve o
que o sistema faz, e este sistema não apaga nada.

---

### VIII. Rastreabilidade · **[PRESERVADO]**

Requisito ↔ regra ↔ tarefa ↔ teste ↔ commit. As quatro convenções mecânicas:

1. **Toda tarefa cita a origem.** `[RF-CRONOS-07] Aplicar mudança de regime a partir da data de
   vigência`. Tarefa sem `RF-`/`RN-` de origem significa requisito faltando na spec **ou** tarefa
   fora de escopo — ambos são bloqueio.
2. **Todo commit cita a fatia.** `feat(RF-DSA-08): gerar sugestão semanal do DSA`. Commit sem
   identificador só é aceito em `chore`, `style` e `docs` genéricos.
3. **Todo teste carrega o nome da regra.** Toda `RN-` de *Risco: Alto* do documento 04 tem asserção
   nomeada pelo próprio identificador — `RN-ANT-02`, `RN-DIST-03`, `RN-CONF-01`, `RN-2027-06`…
4. **Toda linha migrada carrega a chave legada.** `codigo text unique not null` guarda o `ID_*` da
   v2.0 (`CUR-000001`, `VIN-000123`) e `origem_migracao_v1` guarda a origem. FKs apontam para `id`,
   nunca para `codigo` — mas o `codigo` é o que garante rastreabilidade 1:1 com o histórico.

**Um stub rastreável e explicitamente pendente é melhor que cobertura fingida.** Quando o épico que
implementa o comportamento ainda não chegou, o teste da regra entra como stub nomeado e marcado
pendente. O que não se admite é um teste que passa sem verificar nada.

---

### IX. Contenção de Escopo · **[PRESERVADO]**

Todo pedido novo passa pelo teste permanente do documento 00 §7:

> **Este processo está atribuído à CIAARA-11 na Matriz de Responsabilidades?**

Se não, está **fora de escopo** desta versão, independentemente de adjacência ou de simplicidade
técnica. Vira, no máximo, uma nota para uma versão futura.

Ficam permanentemente fora, por serem competência de outras divisões: nota, média final, situação de
aprovação e qualquer documento escolar (`RNF-NORM-06`, competência da CIAARA-32 e da CIAARA-12);
AVA/EAD; reserva de salas como recurso gerenciado (`RF-CRONOS-10` — a visão de ocupação é
**planejamento e leitura**); dados do corpo discente; infraestrutura física.

Permanecem **rejeitados**, e nenhum épico os reabre: `RNF-NORM-04` (sequenciamento pedagógico de
técnica de ensino — não gera requisito, em nenhuma etapa do Épico 12) e a criação de
`Instrutor_Impedimento` (LIQ-2, decisão de Bernardo em 20/08/2026 — a coluna "Observação" da LIQ sai
**sempre vazia**, e isso é comportamento pretendido, verificado por teste).

**[NOVO — v2.1] A plataforma barateia coisas erradas.** Next.js e PostgreSQL tornam trivial gerar um
arquivo, expor um endpoint, integrar um serviço. Barato não é o critério; **atribuição na Matriz de
Responsabilidades** é. O Épico 13 (ROTA) é onde isso será mais testado: a tentação de "já que
estamos aqui, gerar a planilha" é forte e está explicitamente barrada.

---

### X. Paridade Antes de Novidade · **[NOVO — v2.1]**

**Enquanto não houver paridade funcional com a v2.0, nenhuma funcionalidade nova de negócio entra.**

Este princípio é a defesa contra o modo de falha mais provável desta versão: a migração que vira
reescrita e nunca termina. Ele existe porque o risco é estrutural, não hipotético — a v2.0 tem 39
specs de funcionalidade e refinamento em produção, e cada uma delas é um convite a "já que vamos
reescrever, vamos melhorar".

**A regra operacional:**

| Situação | Decisão |
|---|---|
| Requisito `RF-`/`RN-` da v2.0 ainda não portado | **Entra.** É paridade |
| Refinamento de UI entregue por uma das 39 specs | **Entra.** É paridade — a tabela de rastreabilidade do documento 06 §4 é a lista de conferência |
| Correção de defeito que existe na v2.0 e foi reportado | **Entra**, com o identificador do defeito, e a correção é declarada na spec |
| Capacidade que a plataforma nova destrava sem escopo novo — deep-link por tela, integridade referencial declarativa, transação ACID, RLS, preview por branch | **Entra.** Não é funcionalidade nova: é o mesmo requisito com mecanismo melhor |
| Funcionalidade de negócio que **não existe** na v2.0 | **Não entra** enquanto houver épico de paridade pendente. Vira nota, com identificador, para depois do corte |

**O marco que encerra este princípio.** A paridade se declara atingida quando os 12 critérios de
aceite do documento 00 §9 estiverem verdes e o corte para produção tiver acontecido. **Só o Bernardo
declara a paridade atingida**, por registro explícito nesta constitution — não o agente, não o
volume de código escrito, não a sensação de que "já está quase tudo lá".

**O sinal de alerta a vigiar.** Uma spec cujo `RF-`/`RN-` de origem é `—`, ou cuja justificativa é
"aproveitando que", ou que descreve algo que o usuário nunca pediu porque nunca existiu. Se o agente
propuser, a resposta é: *isto é paridade ou é novidade?* — e a novidade espera.

---

### XI. O Banco é a Fronteira · **[NOVO — v2.1]**

**Toda regra de autorização e toda invariante de integridade que puder viver como constraint,
gatilho ou policy vive lá — não apenas na aplicação.**

Na v2.0 isso era impossível: o Sheets não tem constraint, não tem transação e não tem policy. Toda
integridade era convenção defendida por código, e `RNF-SEG-02` (verificação no servidor) era
**disciplina** — dependia de nenhuma função de escrita esquecer de verificar o perfil. Na v2.1
`RNF-SEG-02` é **[ABSORVIDO PELA PLATAFORMA]**: é RLS, e o motor não esquece.

**O que isso obriga:**

1. **Toda tabela tem `ENABLE ROW LEVEL SECURITY`.** Uma tabela sem policy é inacessível por padrão —
   **isso é intencional**, é a falha na direção segura.
2. **A UI oculta por conveniência; o banco nega por autoridade.** Botão fora do escopo do perfil fica
   oculto *e* a ação correspondente é negada pelo banco quando invocada diretamente. Testar só o
   caminho feliz não prova nada: **o teste negativo por perfil é obrigatório na Definition of Done**.
3. **Server Action é endpoint HTTP de fato.** Validação Zod na primeira linha, sem exceção (risco
   R-07). A RLS é a segunda barreira, não a única.
4. **O que o motor garante melhor, o motor garante:** unicidade (`UNIQUE`, incluindo índice parcial),
   integridade referencial (`FK … on delete restrict`), não sobreposição de vigência
   (`btree_gist` + `EXCLUDE`), coluna derivada não gravável (`GENERATED ALWAYS AS … STORED`),
   exclusividade condicional (`CHECK`).
5. **O que é regra de negócio continua em `lib/dominio/`.** Este princípio **não** autoriza migrar
   cálculo para PL/pgSQL "porque resolve mais rápido" — é o risco R-06, e o custo é a regra sair do
   alcance do Vitest. Toda RPC nova declara no PR por que não é Server Action.

#### XI.a — `FOR DELETE` não existe, e isso é regra de negócio

Nenhuma tabela de cadastro ou de fato recebe policy de `DELETE`. Sem policy permissiva, o PostgreSQL
nega. **Essa negação é a implementação física de `RN-INST-05` generalizada** — exclusão lógica
universal. O que a interface chama de "excluir" é um `UPDATE` de `status` para `inativo`, coberto
pela policy de `UPDATE` e pela ação `desativar` da matriz. A proteção é dupla e deliberada: o
`GRANT` de `DELETE` também não é concedido a `authenticated`.

> ⚠️ **Aviso permanente ao agente de código e ao humano que revisa.** Um agente que encontre a
> ausência de policy de `DELETE` vai propor acrescentá-la, de boa-fé, como quem corrige um
> esquecimento. **É regra de negócio, não lacuna.** Um PR que acrescenta `for delete` é rejeitado
> sem discussão. Está registrado em `sql/05_rls_policies.sql` no ponto exato, no documento 22 §6.2 e
> aqui.

#### XI.b — O limite deste princípio

Policy não enxerga `OLD` e `NEW`. Por isso a policy `usuarios_editar` — que legitimamente deixa a
pessoa manter o próprio cadastro — **aprovaria** um `update usuarios set perfil = 'admin' where id =
<o próprio>`: a linha continua sendo dela. O buraco só se fecha com **gatilho**
(`app.impedir_autoescalonamento`), verificado pelo teste **T-05**, o mais importante da suíte.
A lição a generalizar: **quando a regra depende do que mudou, é gatilho; quando depende de qual
linha é, é policy.**


## Restrições Adicionais

### Nomenclatura física — "Disciplina", nunca "Matéria" (P-14, decisão de 2026-08-10)

O sistema usa **"Disciplina"** em schema, código, interface, spec e documentação. A v2.0 executou a
renomeação física das abas e colunas; a v2.1 nasce já com `disciplinas`, `instrutor_disciplina`,
`turma_disciplina`, `disciplina_id`, `nome_disciplina`. **Nenhum artefato novo introduz "Matéria"**,
nem como sinônimo em comentário, nem como nome de variável, nem em texto de interface.

A única exceção histórica documentada: identificadores da v2.0 que carregavam o conceito de *slot na
grade curricular* e não de disciplina não foram renomeados, porque não eram sinônimo direto. Se
aparecerem no mapa de-para do ETL, entram como estão, com nota.

### Termos normativos intraduzíveis

Nunca traduzidos, nunca abreviados de outra forma, nunca substituídos por sinônimo — em código,
schema, spec, comentário, mensagem de commit, texto de interface ou nome de arquivo:

> **CHD · AEC · TAD · TR · TA · DSA · CHR · PROENS · DGPM-101 · DGPM-103 · CAHO · LIQ ·
> OS de Instrutoria · ROTA · LHFC · PM · OD · TFM** — e todas as siglas de curso.

Também intocado o corpo normativo que os sustenta: DGPM-101/103, DEnsM-1002/1004/2001/2003,
PCP-FCT-2, PROENS, NORMHIDRO nº 30-23 e o Regimento Interno do CIAARA.

Nenhum desses termos vira `evaluation`, `teachingHours`, `extraClassActivity` ou coisa parecida. O
código deste sistema é escrito em português do Brasil porque o domínio dele é escrito em português
do Brasil, e a tradução perde a rastreabilidade até a norma.

### Gotcha crítico da plataforma — **[SUBSTITUÍDO — v2.1]**

**[REVOGADO — v2.1]** *"Todos os arquivos `.gs` de um projeto compartilham um único escopo global, e
a ordem de execução de código de nível superior depende da ordem dos arquivos no projeto. Regra
permanente: nenhum arquivo `.gs` pode ter código executável de nível superior que dependa de outro
arquivo."* — Módulos ES têm escopo próprio, `import` é explícito e dependência circular é erro de
build, não bug silencioso. A regra perde o objeto junto com a plataforma.

**[NOVO — v2.1] O que ocupa o lugar dela são duas armadilhas, e ambas produzem defeito silencioso:**

**1. A fronteira Server/Client Component.** No App Router, tudo é Server Component até que alguém
escreva `"use client"`. Esse marcador não é local: ele **contamina toda a subárvore de importação**.
Um `"use client"` no `page.tsx` de instrutores manda a tabela de 177 linhas, o catálogo de siglas e a
escala de antiguidade para o bundle do navegador (risco R-01). Regras permanentes:

- `"use client"` **só em folha** — no componente que realmente tem interação, nunca em `page.tsx`
  nem em `layout.tsx`.
- Nenhum `await` dentro de laço em `app/**` — é N+1 invisível e devastador, a mesma classe do achado
  da spec 017 (~435 leituras redundantes). Um `select` com join do PostgREST por tela; `Promise.all`
  quando as consultas forem independentes (risco R-02).
- Erro de fronteira frequentemente **não** aparece no `tsc`; aparece no `next build`. Por isso
  `pnpm build` faz parte da verificação local, não só do CI.

**2. O vazamento de `service_role`.** `SUPABASE_SERVICE_ROLE_KEY` **ignora a RLS inteira** — é
acesso administrativo ao banco. Um `import` inocente num componente compartilhado a leva para o
bundle (risco R-09). Três defesas em profundidade, todas obrigatórias:

- a variável **nunca** tem prefixo `NEXT_PUBLIC_` (sem o prefixo, o Next.js não a injeta no cliente);
- `import 'server-only'` no topo de `lib/supabase/admin.ts`, o único arquivo que a lê — importá-lo de
  um Client Component vira **erro de build**, e o deploy não sai;
- regra de ESLint `no-restricted-imports` barrando o caminho em arquivos com `"use client"`, para o
  erro aparecer no editor antes do build.

**Usos autorizados da `service_role`, e só estes três:** convite de usuário pelo Admin
(`auth.admin.inviteUserByEmail()`, que a exige), carga do ETL no Épico 2, e script de manutenção
versionado executado à mão. **Nunca por requisição de tela.** Qualquer quarto uso é decisão do
Bernardo, registrada aqui.

**3. O `GRANT` que ninguém lembra.** RLS é filtro sobre privilégio que já existe — **ela não concede
nada por si**. Sem `GRANT`, `authenticated` recebe `permission denied for table`, não a linha
filtrada. E há a armadilha específica do Supabase encontrada na validação desta arquitetura:
`unaccent`, `btree_gist` e `pg_trgm` vivem no schema **`extensions`**, e `app.normalizar_texto()`
chama `extensions.unaccent()` no contexto de **quem faz o INSERT**. Sem
`grant usage on schema extensions to authenticated`, **todo INSERT de usuário autenticado falha** —
enquanto o ETL, a migration e o seed passam, porque rodam como dono do schema. Encontrado pelo teste
**T-04**; nenhuma revisão de código o teria pego. É a justificativa concreta da exigência de teste
negativo.

### Idioma

Português do Brasil em **toda** a interface, documentação, spec, plan, tasks, comentário de código e
mensagem de commit. Identificadores de banco em `snake_case` sem acento (é restrição do motor, não
tradução); identificadores de código em `camelCase`/`PascalCase` **com palavras em português**.

---

## Fluxo de Desenvolvimento

**Granularidade Spec Kit: 1 fatia entregável = 1 feature.** A v2.0 usava *1 épico = 1 feature*
porque tinha dez épicos. A v2.1 tem catorze, e três deles (4, 5 e 7) são grandes demais para uma
fatia só — o próprio documento 06 recomenda subdividir o Épico 5 em *cursos+turmas → disciplinas →
instrutores*. Portanto: **um épico pequeno é uma feature; um épico grande é uma sequência de
features**, cada uma com valor verificável ao final.

**O ciclo, na ordem, sem pular passo:**

```
specify → clarify → plan → tasks → analyze → implement → verificar → PR → preview → merge
```

`/speckit.clarify` e `/speckit.analyze` são **obrigatórios, não opcionais** — mesma regra da v2.0, e
pela mesma razão: eles deslocam a descoberta do erro para quando corrigir ainda é barato. Artefatos
(spec, plan, tasks) em português do Brasil. O detalhamento de cada passo — o que o humano faz e o que
o agente faz — está no documento 10 §7.

**Ordem dos épicos.** A espinha `0 → 1 → 2 → 3 → 4` é **dependência dura**, não preferência. Em
especial **2 antes de 3**: sem dado migrado não há o que proteger, e uma suíte de RLS validada contra
fixtures passa em tudo e falha no primeiro dado real. Do Épico 5 em diante, a ordem é por valor,
respeitando as dependências do documento 06 §6. Duas frentes **nunca** escrevem migrations ao mesmo
tempo: uma frente detém a caneta do schema.

**Definition of Done (BRIEF §7).** Uma fatia só está pronta quando **todos** passam:

1. `tsc --noEmit` sem erro e `eslint` sem aviso novo;
2. **Unidade (Vitest):** toda função de `lib/dominio/` tocada, com casos sintéticos;
3. **Invariantes (pgTAP):** contagens, integridade referencial e uma asserção nomeada por regra `RN-`
   de *Risco: Alto* — stub explicitamente pendente é aceito, cobertura fingida não;
4. **RLS (teste negativo):** para cada perfil, o que ele **não** pode ler/escrever é negado pelo
   banco;
5. **E2E (Playwright):** o percurso principal da fatia, incluindo a rota `/print/*` quando houver;
6. Migration aplicada em preview e **revertível**;
7. Commit no padrão `feat(RF-DSA-08): …`, citando o identificador de origem.

**Implantação.** Git → preview por branch → validação do Bernardo na preview → merge por squash →
produção. Sem `clasp`, sem `BUILD_ID`, sem `MANIFESTO.md` (Princípio III.c). O protocolo completo,
incluindo migration em produção e rollback, está no documento 10 §8.

---

## Governança

Esta constitution **prevalece sobre qualquer plano, spec, tarefa ou sugestão individual**. Conflito
entre um plano e um princípio daqui é **reportado ao responsável antes de prosseguir**, nunca
resolvido silenciosamente a favor do plano.

**Emendas** exigem decisão explícita do responsável (**Bernardo Villas Bôas dos Santos**), registrada
neste documento com **data e motivo** — o mesmo padrão usado para P-14, para a rejeição da CAHO 2026
e para a revogação de `RNF-PLAT-01..04` que produziu esta versão. Um princípio que perde sentido é
marcado `[REVOGADO]` com o motivo e o substituto; **nunca apagado**.

**Precedência entre documentos**, quando houver divergência aparente:

1. Esta constitution;
2. `BRIEF-v2.1.md` (contrato de consistência);
3. Fase 1 — documentos 00 a 09 (requisitos, regras, escopo);
4. Fase 2 — documentos 20 a 25 (arquitetura);
5. Documentos 10, 41 e 42 (processo e prompts);
6. Spec, plan e tasks da fatia corrente.

Divergência entre 1–4 é **defeito de documentação** e se resolve com o responsável, nunca por
escolha do agente. Divergência entre 5–6 e qualquer um acima resolve-se sempre a favor do de cima.

**Decisões registradas que nenhum artefato reabre sem autorização nominal:**

| Data | Decisão | Onde vive |
|---|---|---|
| 2026-08-10 | CAHO 2026 **rejeitada** como padrão-ouro de não regressão | Princípio VI |
| 2026-08-10 | P-14 — "Disciplina", nunca "Matéria" | Restrições Adicionais |
| 2026-08-14 | Épico E (categorização AEC/TAD/TR/Estudo Individual) confirmado funcionando | Documento 06, Épico 9 |
| 2026-08-20 | LIQ-2 — `Instrutor_Impedimento` **não será criada**; "Observação" sai vazia | Princípio IX |
| 2026-08-25 | Migração de plataforma para Next.js + Supabase; `RNF-PLAT-01..04` **revogados** | Princípio III |
| 2026-08-25 | Autenticação por **e-mail/senha somente por convite**; reverte D1 (conta Google) | Princípio III.b |
| 2026-08-26 | `turma_disciplina` e `configuracoes_horario` são obrigatórias no mapa de tabelas | BRIEF §2.1 |
| 2026-08-26 | **UE-1 — rota (b)**: o fato de execução passa ao grão de **Unidade de Ensino**; disciplina vira agregado (VIEW) | Documento 05 §9.1 |
| 2026-08-28 | **TURMA-1 — filtro de apresentação**: "Arquivada" não é valor do domínio de status de turma; é VIEW sobre turmas concluídas | Documento 05 §9.2 |
| 2026-08-28 | **Origem do dado de UE**: as Unidades de Ensino vêm dos currículos oficiais da DEnsM (572 UEs, 134 disciplinas), não de linha sintética | BRIEF §2.2 · documento 05 §9.1 |
| 2026-08-28 | **Matriz de permissões**: a CIAARA-11 escreve nas tabelas de fato; CIAARA-11 e Admin administram calendário e parâmetros (concessões `(a)` e `(b)` confirmadas) | Documento 22 §11, itens 2 e 3 |

**Decisões pendentes que bloqueiam épicos** (nenhuma reaberta aqui; listadas para que ninguém as
atropele): **LIQ-3** — papel titular/reserva, bloqueia o Épico 11; **LIQ-4** — persistência da LIQ
emitida; **Q1.b** — a qual Unidade de Ensino pertence cada registro de aula histórico, e como
participam do grão de UE os três cursos cujo currículo não a declara, **decidir no Épico 2**;
**hospedagem fora da infraestrutura da MB**, pendente na CIAARA-14.2, **decidir antes do Épico 2** —
é a única pendência capaz de bloquear a versão por razão não técnica. **TURMA-1 saiu desta lista:
fechada em 28/08/2026.**

**UE-1 saiu desta lista em 26/08/2026** — decidida pela rota (b), registrada na tabela acima. O
Épico 1 está desbloqueado.

**Version:** 2.1.0 · **Ratificada:** 26/08/2026 · **Sucede:** 1.2.0 (11/08/2026, emendada em
14/08/2026) · **Última emenda:** — · **Responsável:** Bernardo Villas Bôas dos Santos

**Version**: 2.1.0 | **Ratified**: 2026-08-26 | **Last Amended**: 2026-08-26
