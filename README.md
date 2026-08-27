# CIAARA-11 v2.1 — Documentação da Migração

## Nota de migração (v2.1)

Esta pasta é a suíte de documentação da **Versão 2.1** do sistema de gestão acadêmica do CIAARA-11 (Divisão de Administração Acadêmica do Centro de Instrução e Adestramento Almirante Radler de Aquino, Marinha do Brasil). A v2.1 é **uma migração de plataforma, e nada além disso**: o sistema da v2.0 — hoje em produção sobre Google Apps Script + Google Sheets, com 39 ciclos Spec Kit executados e a base já saneada — é reimplantado sobre **Next.js 15 (App Router, React 19, TypeScript `strict`) + Supabase (PostgreSQL, Auth, RLS)**, hospedado na Vercel. Requisitos, regras de negócio e vocabulário institucional permanecem **intactos**; muda o substrato técnico. A decisão é de **Bernardo Villas Bôas dos Santos, Primeiro-Tenente**, arquiteto/desenvolvedor responsável, em **25/08/2026**. Não há funcionalidade nova de negócio nesta versão: o valor entregue é a plataforma — integridade referencial, transações, segurança no dado (RLS), deep-link por tela, ambiente de teste por branch e tipos verificados em compilação.

**Regra que governa tudo aqui:** a v2.1 **não reinventa o domínio**. Todo `RF-`, `RN-` e `RNF-` da v2.0 tem destino explícito — *preservado*, *preservado com nova implementação*, *absorvido pela plataforma* ou *revogado* — e **nenhum requisito é apagado**.

---

## Comece por aqui

**Se você tem 15 minutos:** leia `docs/fase-1/00-Visao-Geral-e-Escopo.md`, seções **5** (por que migrar, com as perdas declaradas) e **9** (os 12 critérios de aceite). Elas contêm o essencial da decisão.

**Se você vai começar a implementar hoje**, o primeiro comando prático é o do **Épico 0 — Fundação**. O projeto Supabase e o repositório GitHub **já existem** (ver *Estado do projeto*), então o passo real é conectar o repositório à base e gerar os tipos:

```bash
# 1. no repositório já criado no GitHub, inicializar o Next.js (Épico 0)
npx create-next-app@latest . --typescript --tailwind --app --eslint --import-alias "@/*"

# 2. inicializar o Supabase local e vincular ao projeto que o Bernardo já criou
npx supabase init
npx supabase link --project-ref <ref-do-projeto>

# 3. gerar os tipos a partir do schema real — este arquivo é o contrato de dados da v2.1,
#    e substitui a aba `_Meta_Colunas` da v2.0 (ver Glossário, "tipos gerados")
npx supabase gen types typescript --linked > lib/tipos/database.ts
```

Antes de escrever a primeira migration, leia `docs/fase-2/21-Schema-Fisico-PostgreSQL.md` e os scripts de `docs/sql-referencia/` **na ordem numérica** — ela é a ordem de execução.

---

## Mapa de leitura por papel

### Quem vai **implementar** (escrever código, conduzir os ciclos Spec Kit)

| Ordem | Leia | Por quê |
|---|---|---|
| 1 | `docs/vibe-coding/40-Constitution-v2.1.md` | Os princípios que prevalecem sobre qualquer plano ou tarefa. Em especial o **Princípio III**, reescrito: deixa de proibir framework/banco externo/CI e passa a fixar a nova stack |
| 2 | `docs/fase-2/20-Arquitetura-Alvo-Next-Supabase.md` | O desenho de conjunto e as fronteiras de camada |
| 3 | `docs/fase-2/24-Estrutura-do-Repositorio-e-Convencoes.md` | Onde cada coisa mora e como se nomeia |
| 4 | `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md` | **O contrato.** As ~40 regras `RN-`, que viram funções puras em `lib/dominio/` |
| 5 | `docs/fase-2/21-Schema-Fisico-PostgreSQL.md` + `docs/sql-referencia/` | O schema e os scripts, na ordem numérica |
| 6 | `docs/vibe-coding/42-Prompts-por-Epico.md` | O prompt de partida do épico em que você vai trabalhar |
| 7 | `docs/fase-1/07-Glossario.md` | Consulta permanente — sobretudo a coluna *Equivalente na v2.0* |

> **As duas regras que mais economizam retrabalho:** **nada em `lib/dominio/` importa `supabase`** (regra pura ⇒ testável sem banco), e **nenhuma regra de negócio vive só na UI**.

### Quem vai **revisar requisito** (conferir escopo, fronteira e conformidade normativa)

| Ordem | Leia | Por quê |
|---|---|---|
| 1 | `docs/fase-1/00-Visao-Geral-e-Escopo.md` | Escopo, não-escopo e o que foi revogado em 25/08/2026 (seção 7.1) |
| 2 | `docs/fase-1/01-Stakeholders-e-Perfis-de-Usuario.md` | A fronteira organizacional (seção 0) e a matriz perfil × recurso × ação (seção 2.5) |
| 3 | `docs/fase-1/02` e `03` | Requisitos funcionais e não-funcionais, com a coluna *Destino na v2.1* |
| 4 | `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md` | Classificação de risco e de conformidade de cada regra |
| 5 | `docs/fase-1/08` e `09` *(históricos)* | A fundamentação: decisões D1–D7, achados A-1..A-12, propostas P-1..P-14 |

> **O teste de escopo, em uma frase (Princípio IX):** *este processo está atribuído à CIAARA-11 na Matriz de Responsabilidades?* Se não, está fora — por mais simples que seja implementar. É o critério que sustenta `RNF-NORM-06` (o sistema **não** calcula nota, média, aprovação ou documento escolar).

### Quem vai **operar a migração** (ETL, corte, reconciliação)

| Ordem | Leia | Por quê |
|---|---|---|
| 1 | `docs/fase-3/30-Plano-de-Migracao-ETL.md` | Ordem de carga, congelamento de escrita, corte, reconciliação, critério de aborto e rollback |
| 2 | `docs/fase-3/31-Mapa-De-Para-Sheets-PostgreSQL.md` | Aba por aba, coluna por coluna, com a transformação aplicada |
| 3 | `docs/fase-1/05-Modelo-de-Dados-Conceitual.md` | As entidades e as convenções (`codigo`, `origem_migracao_v1`, exclusão lógica, vigência) |
| 4 | `docs/fase-1/00`, seção **9** | Os critérios **CA-02**, **CA-03**, **CA-10** e **CA-11** — que são o portão do corte |
| 5 | `docs/fase-1/07-Glossario.md`, seção *Termos de migração* | Para que "reconciliação", "corte" e "rollback" signifiquem a mesma coisa para todos |

> **Duas decisões já tomadas, para não serem rediscutidas no meio do corte:** **dupla escrita foi considerada e rejeitada** (o corte é único, com congelamento curto); e **a CAHO 2026 não é padrão-ouro** — validação é por invariante estrutural e matemático, nunca por diff com a saída histórica de um curso.

---

## Árvore de arquivos

Cada `.md` tem uma versão **`.docx`** ao lado, para leitura e revisão fora do editor. **O `.md` é a fonte de verdade**; o `.docx` é derivado e nunca é editado diretamente.

```
v2.1/
├── README.md                          Este índice: mapa de leitura, árvore, estado e primeiro comando
├── CLAUDE.md                          Contexto operacional do repositório de código: convenções, gotchas, comandos
│
├── docs/fase-1/
│   ├── 00-Visao-Geral-e-Escopo        Por que migrar, o que entra, o que não entra, e os 12 critérios de aceite
│   ├── 01-Stakeholders-e-Perfis       Fronteira organizacional, os 9 perfis, matriz perfil × recurso × ação, ciclo de vida da conta
│   ├── 02-Requisitos-Funcionais       O que o sistema faz, módulo a módulo, com o destino de cada RF-
│   ├── 03-Requisitos-Nao-Funcionais   Desempenho, usabilidade, segurança, manutenibilidade — com RNF-PLAT-01..04 e RNF-SEG-01 revogados
│   ├── 04-Regras-de-Negocio           As ~40 regras RN-, com risco, conformidade e destino em lib/dominio/, constraint, trigger ou policy
│   ├── 05-Modelo-de-Dados-Conceitual  Entidades, relacionamentos e as convenções de dado da v2.1
│   ├── 06-Backlog-de-Epicos-V2.1      Os 14 épicos (0–13), sequenciamento e critérios de aceite de alto nível
│   ├── 07-Glossario                   Termos institucionais (invariáveis) + termos técnicos com equivalente na v2.0 + termos de migração
│   ├── 08-Relatorio-de-Triagem        [histórico, preservado] Os 48 comentários e as decisões D1–D7 que geraram a v1.1
│   ├── 09-Relatorio-de-Auditoria      [histórico, preservado] 12 achados, 7 recomendações, 14 propostas — a fundamentação normativa
│   └── 10-Plano-de-Execucao-Vibe      Como os épicos viram ciclos Spec Kit, a Definition of Done e o portão de CI
│
├── docs/fase-2/
│   ├── 20-Arquitetura-Alvo            App Router, Server/Client Components, Server Actions, o papel de lib/dominio/
│   ├── 21-Schema-Fisico-PostgreSQL    DDL comentado tabela a tabela: tipos, ENUM, constraints, índices, colunas geradas
│   ├── 22-Seguranca-RLS-Autenticacao  Convite e sessão, perfil_permissao, funções app.*, policies e os testes negativos obrigatórios
│   ├── 23-Design-System               Tokens CIAARA sob @theme, tema claro/noturno, components/ciaara/, rotas /print/*
│   ├── 24-Estrutura-do-Repositorio    Árvore de pastas, nomenclatura, Conventional Commits, organização de testes
│   └── 25-Camada-de-Dados-e-Estado    @supabase/ssr, URL como fonte de verdade (nuqs), revalidate*, degradação segura
│
├── docs/fase-3/
│   ├── 30-Plano-de-Migracao-ETL       Ordem de carga, congelamento de escrita, corte, reconciliação, aborto e rollback
│   └── 31-Mapa-De-Para                Aba por aba e coluna por coluna: origem, destino, tipo, transformação, ID legado em `codigo`
│
├── docs/vibe-coding/
│   ├── 40-Constitution-v2.1           Os princípios reescritos — em especial o Princípio III, que muda de sentido
│   ├── 41-Guia-de-Vibe-Coding         Como conduzir os ciclos Spec Kit nesta stack; a Definition of Done por fatia
│   └── 42-Prompts-por-Epico           O prompt de partida de cada um dos 14 épicos
│
└── docs/sql-referencia/            Fonte de supabase/migrations/*.sql e seed.sql — a ordem numérica É a ordem de execução
    ├── 00-extensoes-e-tipos.sql       Extensões, schema `app` e os ENUM normativos (perfil_usuario, escopo_curso, ...)
    ├── 01-tabelas-cadastro.sql        cursos, turmas, disciplinas, instrutores, instrutor_disciplina, usuarios, usuario_curso
    ├── 02-tabelas-fato.sql            registros_aula, avaliacoes, atividades_nao_letivas, planejamento_anual, migracao_log
    ├── 03-config-e-calendario.sql     config_listas, config_parametros, feriados, janelas_curso, reservas_proens, horarios
    ├── 04-views-e-funcoes.sql         Funções app.*, trigger set_auditoria() e as VIEWs de compatibilidade com as abas da v2.0
    └── 05-policies-rls.sql            RLS em toda tabela, policies por operação e o seed de perfil_permissao
```

---

## Ordem de leitura recomendada

Se você vai ler a suíte inteira, esta é a sequência que faz cada documento ser entendido com o contexto que ele pressupõe:

1. **`00`** — Visão Geral e Escopo. Estabelece por que a v2.1 existe e o que ela **não** é.
2. **`01`** — Stakeholders. A fronteira organizacional é pré-requisito para julgar qualquer escopo.
3. **`07`** — Glossário. Lido **cedo**, não no fim: sem ele, metade dos termos das seções seguintes é ruído.
4. **`04`** — Regras de Negócio. O contrato que a migração precisa honrar.
5. **`05`** — Modelo de Dados. As entidades sobre as quais as regras operam.
6. **`02`** e **`03`** — Requisitos funcionais e não-funcionais, com os destinos.
7. **`06`** — Backlog de Épicos. Como o trabalho é fatiado.
8. **`20`–`25`** — Arquitetura, na ordem numérica.
9. **`30`–`31`** — Migração de dados.
10. **`40`–`42`** — Vibe coding, imediatamente antes de começar a implementar.
11. **`08`** e **`09`** — históricos, por consulta: quando quiser saber **por que** uma decisão é como é.

---

## Estado do projeto (25/08/2026)

| Item | Estado |
|---|---|
| **Sistema em produção** | **v2.0** — Apps Script + Sheets. Continua sendo a produção até o corte. Base viva: `Banco de dados CIAARA-11 v2.0`, 23 abas |
| **Decisão de migrar** | ✅ Tomada por Bernardo Villas Bôas dos Santos em **25/08/2026** |
| **Projeto Supabase** | ✅ **Criado pelo Bernardo** — vazio, aguardando o schema do Épico 1 |
| **Repositório GitHub** | ✅ **Criado pelo Bernardo** — aguardando o *scaffold* do Épico 0 |
| **Stack** | ✅ Decidida, não em aberto: Next.js 15 · React 19 · TypeScript `strict` · Tailwind v4 · shadcn/ui · Supabase · Vercel · Vitest/Playwright/pgTAP · ETL em Python |
| **Documentação Fase 1** | 🟡 Em redação — `00`, `01` e `07` escritos; `02`–`06` e `10` pendentes |
| **Documentação Fases 2–3 e Vibe Coding** | ⬜ Pendentes |
| **Schema PostgreSQL / `docs/sql-referencia/`** | ⬜ Pendente (Épico 1) |
| **ETL e corte** | ⬜ Pendentes (Épicos 2 e o plano do documento 30) |
| **Ambiente de preview e CI** | ⬜ Pendentes (Épico 0) |

**Sequenciamento dos épicos:** `0 → 1 → 2 → 3 → 4`, depois por valor. **O Épico 2 (ETL) vem antes do 3 (Auth)**: sem dado migrado não há o que proteger.

**Volumes, para dimensionar — não para otimizar:** 24 cursos · 29 turmas · 175 disciplinas · 177 instrutores · 798 vínculos instrutor↔disciplina · ~1.753 registros de aula · 663 atividades não letivas · 111 avaliações · dezenas de usuários simultâneos no máximo. **É uma base pequena.** Priorize clareza de schema e manutenibilidade sobre desempenho; desempenho não é um problema real deste sistema.

---

## O que nunca muda, em nenhum documento desta pasta

- **Todo o corpo normativo:** DGPM-101/103, DEnsM-1002/1004/2001/2003, PCP-FCT-2, PROENS, Regimento Interno.
- **Termos intraduzíveis**, jamais abreviados ou substituídos: **CHD, AEC, TAD, TR, TA, DSA, CHR, PROENS, DGPM-101/103, CAHO, LIQ, OS de Instrutoria, ROTA, LHFC, PM, OD, TFM** e as siglas de curso.
- **"Disciplina", nunca "Matéria"** (decisão P-14) — em schema, código, interface e documentação.
- **Os tetos:** AEC ≤ 10% do somatório das CHD · TAD ≤ 5% da CHR · TR ≤ 10% da CHR. E as faixas de CH docente: 20h → 8–12 h · 40h → 16–24 h · DE → 16–30 h.
- **9º TA é alerta informativo, nunca bloqueio.** Regra normativa não 100% verificável pelos dados vira alerta com justificativa, jamais trava (`RN-DEG-02`).
- **Nada é apagado:** exclusão lógica universal, `migracao_log` apenas-acrescenta, requisito revogado fica marcado e não some.
- **Português do Brasil** em interface, documentação, specs e mensagens de commit.

---

## Convenções desta documentação

- **Frontmatter YAML** em todo `.md` de fase: `title`, `author`, `date: "25/08/2026"`, `version: "2.1"`.
- **Marcação inline de mudança:** `[PRESERVADO]` · `[MIGRAÇÃO v2.1]` · `[REVOGADO — v2.1]` · `[ABSORVIDO PELA PLATAFORMA]` · `[NOVO — v2.1]`.
- **Rastreabilidade obrigatória:** todo item cita seu identificador de origem (`RF-…`, `RN-…`, `RNF-…`, achado, decisão, épico ou spec).
- **Numeração com faixas livres** (11–19, 26–29, 32–39, 43+): documento novo entra sem renumerar os existentes — renumerar quebraria toda citação cruzada, que é a espinha dorsal da suíte.

---

## `specs/` — as 39 specs da v2.0, convertidas *(acrescentado em 26/08/2026)*

| Item | O que é |
|---|---|
| `specs/00-Fundacao-Tecnica.md` | **Spec 00 — o documento mestre.** Declara Next.js (App Router), Tailwind CSS e Supabase (banco + auth), fixa o Login como primeira tela e o RBAC via Supabase Auth. **Prevalece sobre qualquer spec numerada.** |
| `specs/README.md` | Guia de leitura das specs, com o grau de confiabilidade de cada artefato |
| `specs/001-…` a `specs/039-…` | As 39 specs executadas na v2.0, com a plataforma convertida — ~11.300 substituições, zero menção a Apps Script/Sheets |

⚠️ `plan.md` e `tasks.md` de cada spec foram **traduzidos, não replanejados**. Ao retomar uma
feature, regere os dois com `/speckit.plan` e `/speckit.tasks` a partir do `spec.md`.
