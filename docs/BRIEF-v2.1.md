---
title: "BRIEF v2.1 — Contrato de Consistência"
author: "CIAARA-11 v2.1"
date: "26/08/2026"
version: "2.1"
status: "Vigente"
---

# BRIEF v2.1 — Contrato de Consistência

> **Este documento é o contrato entre todos os artefatos da v2.1.** Nenhum documento, spec,
> migration ou linha de código pode contradizê-lo. Se algo aqui parecer errado, **reporte —
> não invente alternativa e não abra exceção local.**
>
> **Precedência:** a constitution (`docs/vibe-coding/40`) vem primeiro; este documento vem
> logo depois; os demais documentos herdam de ambos.
>
> **Nota de proveniência.** Este arquivo nasceu como contrato de trabalho durante a redação
> da suíte v2.1 e foi **entregue ao repositório em 26/08/2026**, depois que a auditoria do
> Épico 1 apontou que `CLAUDE.md`, a constitution e o documento 42 o citavam sem que ele
> existisse em `docs/`. O conteúdo abaixo já traz as correções que a validação contra
> PostgreSQL 16 e a auditoria da planilha real produziram.
>
> **Revisão de 26/08/2026 (achados D-5 e D-6).** A primeira entrega deste arquivo não
> conhecia a decisão **UE-1 rota (b)**, tomada no mesmo dia: o §2.1 tinha 26 tabelas, sem
> `unidades_ensino`, e descrevia `registros_aula` no grão antigo. Como o §2.1 se declara
> autoridade de nomes, ele levaria o Épico 1 a excluir a tabela que a decisão exige.
> Corrigido em **§2.1** (mapa), **§2.2** (o grão do fato, novo) e **§11** (o que em
> `docs/sql-referencia/` ficou para trás). D-6 está resolvido na nota ao fim do §2.1.

---

## 0. O que é a v2.1

A **v2.0** é um sistema em produção: Google Apps Script + Google Sheets + Vanilla JS/Bootstrap 5,
com 39 specs Spec Kit executadas e a base já migrada e saneada.

A **v2.1** é a **migração de plataforma** desse mesmo sistema para **Next.js + Supabase
(PostgreSQL)**, mantendo intactos requisitos, regras de negócio e vocabulário institucional.

**Regra de ouro: a v2.1 não reinventa o domínio.** Ela reimplanta o mesmo domínio noutra
plataforma. Toda regra `RN-`, requisito `RF-` e restrição `RNF-` da v2.0 tem destino explícito:
*preservada*, *preservada com nova implementação*, *substituída pela plataforma* ou *aposentada* —
sempre nomeando qual. **Nenhum requisito foi apagado**; os 120 `RF-`, 41 `RN-` e 43 `RNF-` da
v2.0 têm destino conferido.

**A inversão que define esta versão:** na v2.0 o `RNF-PLAT-01..04` proibia framework, banco
externo, bundler e CI/CD. Na v2.1 esses requisitos são **revogados e substituídos**, com o texto
original preservado e marcado `[REVOGADO — v2.1]`. O Princípio III da constitution é reescrito,
não deletado — a trilha da v2.0 até a v2.1 precisa ser seguível.

**O que a v2.1 destrava** (citar quando couber, sem inventar escopo): deep-link e URL por tela;
integridade referencial declarativa; transações ACID; segurança no dado (RLS) e não só na função;
e ambiente de pré-visualização por branch.

---

## 1. Stack alvo — decidido, não em aberto

| Camada | Decisão | Observação |
|---|---|---|
| Framework | **Next.js 15+, App Router, React 19, TypeScript `strict`** | Server Components por padrão; `"use client"` só em folha |
| Estilo | **Tailwind CSS v4** (CSS-first, `@theme`) | Substitui Bootstrap 5 e o CSS ad hoc por módulo |
| Componentes | **shadcn/ui** (Radix + `cva`) | Copiados para `components/ui/`, versionados |
| Banco | **Supabase PostgreSQL** | Projeto já criado pelo Bernardo |
| Auth | **Supabase Auth — e-mail/senha, somente por convite do Admin** | Signup público desabilitado. **Login é a primeira tela** |
| Autorização | **RLS no banco** + matriz de permissões como dado | A UI oculta por conveniência; o banco é a fronteira real |
| Acesso a dados | `@supabase/ssr` (servidor), `@supabase/supabase-js` (cliente) | Sem ORM |
| Mutações | **Server Actions** + Zod na primeira linha | Validação compartilhada cliente/servidor |
| Cache cliente | **TanStack Query** só onde RSC não bastar | Exceção, não padrão |
| Estado de navegação | **URL** (`searchParams`) com **`nuqs`** | Substitui o `AppState`; deep-link vira possível |
| Gráficos | **Recharts** | Substitui Chart.js e ApexCharts |
| PDF/impressão | CSS `@media print` + rotas `/print/*` | Paridade obrigatória com a v2.0 |
| Testes | **Vitest** · **Playwright** · **pgTAP** | Ver §7 |
| Hospedagem | **Vercel**, preview por branch | |
| Repositório | **GitHub**, Conventional Commits | |
| ETL | **Python** (`scripts/etl/`) | Reaproveita `migracao/*.py` da v2.0 |

**Proibições permanentes:** ORM que esconda o SQL (Prisma/Drizzle); banco fora do Supabase;
biblioteca de componentes além de shadcn/Radix; e **qualquer regra de negócio implementada apenas
na UI**.

---

## 2. Convenções de banco (PostgreSQL)

- **Identificadores:** `snake_case` minúsculo, sem acento, sem aspas. Tabelas no **plural**.
- **PK:** `id uuid primary key default gen_random_uuid()`.
- **Chave de negócio legada:** `codigo text unique not null` guarda o `ID_*` da v2.0 verbatim.
  É o que garante rastreabilidade 1:1 com o histórico. **FKs apontam para `id`, nunca para
  `codigo`.** Note que na base real esses códigos são legíveis, não sequenciais: `ID_Curso` é o
  próprio acrônimo (`CAHO`, `C-Ap-FR`), `ID_Turma` é `C-Ap-FR 2026`, `ID_Grade` é
  `1 - CAHO - MAT`.
- **Rastro de migração:** `origem_migracao_v1 text` em toda tabela migrada + tabela `migracao_log`.
- **Exclusão lógica universal:** `status` explícito (`ativo`/`inativo`), **nunca inferido de
  `NULL`**. Nada é apagado, e **nenhuma tabela tem policy de `DELETE`** — isso é regra de negócio
  (`RN-INST-05` generalizada), não lacuna.
- **Auditoria:** `criado_por`, `criado_em`, `editado_por`, `editado_em`, por trigger
  `app.set_auditoria()`.
- **Vigência temporal:** `vigente_de date not null` + `vigente_ate date null` (`NULL` = vigente).
  Resolução pelo maior `vigente_de <= data_do_fato`. **Nenhuma edição reinterpreta o passado.**
- **Domínios:** `ENUM` nativo só para domínio **normativo fechado**. Domínio **operacional
  administrável** vive em `config_listas` com FK. Na dúvida, `config_listas` — `ENUM` fechado cedo
  demais vira migration.
- **Parâmetro normativo é dado, nunca constante em código:** `config_parametros` (tetos AEC 10% /
  TAD 5% / TR 10%, faixas de CH docente, limite de TA por dia). Princípio VII.
- **Timezone:** `timestamptz`, banco em UTC, apresentação em `America/Sao_Paulo`.
- **Coluna derivada:** `GENERATED ALWAYS AS … STORED` ou VIEW. Nunca uma segunda fonte de verdade.
- Toda tabela tem `ENABLE ROW LEVEL SECURITY`. **Tabela sem policy é inacessível — é intencional.**

### 2.1 Mapa de tabelas — **use exatamente estes nomes**

São **27 tabelas**. Esta tabela é a autoridade de nomes citada pelo prompt do Épico 1
(documento 42, *"use EXATAMENTE estes nomes"*).

> ### ⚠️ Revisão de 26/08/2026 — decisão UE-1, rota (b)
>
> **Esta seção foi corrigida depois da decisão UE-1**, e a correção não é cosmética.
>
> A primeira versão do mapa tinha 26 tabelas e **não conhecia `unidades_ensino`**. Como o prompt
> do Épico 1 manda usar exatamente os nomes daqui, ele levaria o agente a **excluir justamente a
> tabela que a rota (b) exige** — e a excluí-la com autoridade, citando este documento. É o mesmo
> padrão do achado P-1 (`turma_disciplina` fora do mapa), e a lição é a mesma: **um mapa
> declarado autoritativo herda a obrigação de estar completo.**
>
> **`docs/sql-referencia/` ainda reflete o grão antigo.** Os seis scripts foram escritos e
> validados **antes** da decisão, e neles `registros_aula.disciplina_id` é `NOT NULL` — grão de
> disciplina. **A migration do Épico 1 implementa o grão de UE; ela não copia o script de
> referência neste ponto.** Ver §2.2 e §11.

| # | Aba v2.0 (Sheets) | **Tabela v2.1 (PostgreSQL)** | Script de referência |
|---|---|---|---|
| 1 | `Cad_Cursos` | `cursos` | 01 |
| 2 | *(cabeçalho extraído de `Horarios_Tempos_Aula`)* | `configuracoes_horario` | 01 |
| 3 | `Horarios_Tempos_Aula` | `horarios_tempos_aula` | 01 |
| 4 | `Cad_Cursos_Regime_Historico` | `curso_regime_historico` | 01 |
| 5 | `Turmas_Ativas` | `turmas` | 01 |
| 6 | `Cad_Disciplinas` | `disciplinas` | 01 |
| 7 | *(não existia — UE-1 rota (b))* | **`unidades_ensino`** | **a criar no Épico 1** |
| 8 | `Turma_Disciplina` | `turma_disciplina` | 01 |
| 9 | `Cad_Instrutor` | `instrutores` | 01 |
| 10 | `Instrutor_Disciplina` | `instrutor_disciplina` | 01 |
| 11 | `Responsaveis_Curso` | `responsaveis_curso` | 01 |
| 12 | *(colunas-lista de `Turma_Disciplina`)* | **`turma_disciplina_instrutor`** | 01 |
| 13 | `Avaliacoes_Planejadas` | `avaliacoes_planejadas` | 02 |
| 14 | `Registro_Aulas_E_Atividades` | `registros_aula` **(grão de UE — §2.2)** | 02 *(a revisar)* |
| 15 | `Avaliacoes` | `avaliacoes` | 02 |
| 16 | `Eventos_Extracurriculares` | `atividades_nao_letivas` | 02 |
| 17 | `Planejamento_Anual` | `planejamento_anual` | 02 |
| 18 | `Config_Listas` | `config_listas` | 03 |
| 19 | `Config_Parametros` | `config_parametros` | 03 |
| 20 | *(nova)* | `perfil_permissao` | 03 |
| 21 | `Calendario_Feriados` + `Eventos_Globais` | `feriados` | 03 |
| 22 | `Calendario_Janelas_Curso` | `janelas_curso` | 03 |
| 23 | `Calendario_Reservas` | `reservas_proens` | 03 |
| 24 | `_Migracao_Log` | `migracao_log` | 03 |
| 25 | `_Arquivo_Avaliacoes_v1` | `arquivo_avaliacoes_v1` | 03 |
| 26 | `Usuarios` | `usuarios` | 05 |
| 27 | `Usuario_Curso` | `usuario_curso` | 05 |
| — | `_Meta_Colunas` | **aposentada** — ver abaixo | — |

**`_Meta_Colunas` é o exemplo canônico de "requisito absorvido pela plataforma".** Ela existia
para dar ao Sheets um contrato de coluna que ele não tinha nativamente. No PostgreSQL o catálogo
(`information_schema`) e os tipos TypeScript gerados pelo Supabase CLI cumprem esse papel com
garantia do motor. Cite-a quando precisar do exemplo.

**Quatro tabelas não têm correspondência 1:1 com uma aba, e o motivo importa:**

- **`unidades_ensino`** — **[NOVO — UE-1 rota (b), 26/08/2026]** a Unidade de Ensino como entidade
  de primeira classe. Não existia em aba nenhuma: o `Rascunho de funcionalidades.txt` a descrevia
  (número da UE, tópico, instrutor daquela UE, data, tempos), mas nenhum documento da suíte a
  modelava. Detalhe em §2.2.
- **`configuracoes_horario`** — cabeçalho extraído de `Horarios_Tempos_Aula`, que era
  desnormalizada (`Nome_Config` repetido em todas as linhas da mesma configuração). Sem esse
  cabeçalho não existe alvo de FK para "a configuração", que é o que elimina as chaves órfãs
  `D`/`E`.
- **`turma_disciplina_instrutor`** — a atribuição **real** de instrutor por turma, com rateio de
  carga. A auditoria da planilha viva provou que `Turma_Disciplina.ID_Instrutor` contém **lista**
  (`"40, 60, 18, 19, 20, 21"`) e `CH_Prevista_Por_Instrutor` contém **mapa** (`"40:200, 60:200"`).
  Coluna escalar não comporta isso. **É daqui que a LIQ e a OS de Instrutoria leem** — ler
  `instrutor_disciplina` no lugar foi o defeito de produção que a spec 034 corrigiu.
- **`perfil_permissao`** — a matriz de autorização como dado (§3).

> **Achado D-6 — resolvido aqui.** Três destas quatro (`unidades_ensino`,
> `turma_disciplina_instrutor`, `configuracoes_horario`) **não constam do dicionário de entidades
> do documento 05 §4**, porque nasceram depois dele: as duas primeiras de decisões de 26/08, a
> terceira da despivotagem de `Horarios_Tempos_Aula`.
>
> **Autoridade, para não travar o Épico 1:** em **inventário e nome de tabela**, este §2.1 prevalece
> — é o que a constitution e o documento 42 citam. O documento 05 §4 é a fonte de **semântica de
> atributo**, e está **incompleto**, não errado: as três entradas faltantes precisam ser escritas
> lá, e essa é uma pendência de documentação, não um bloqueio de implementação. Não invente
> atributo para as três a partir do §4 — use o §2.2 abaixo e `docs/sql-referencia/`.

### 2.2 O grão do fato de execução — **decisão UE-1, rota (b)**

**Decidido em 26/08/2026 por Bernardo Villas Bôas dos Santos. Registro em `docs/fase-1/05` §9.1 e
na tabela de decisões da constitution.** É bloqueante para o Épico 1 porque **grão de tabela de
fato se escolhe na primeira migration, não depois**.

Quatro consequências, todas obrigatórias:

1. **`unidades_ensino` é entidade de primeira classe** — FK `disciplina_id → disciplinas(id)` e
   `unique (disciplina_id, numero_ue)`.
2. **`registros_aula` nasce no grão de UE**, não no grão de disciplina. É a mudança de fundo, e é a
   razão de a decisão ter travado o épico.
3. **"CH executada da disciplina" é derivada** — VIEW ou coluna `GENERATED`, **jamais uma segunda
   fonte de verdade**. É o que elimina a objeção principal que existia contra a rota (b): "duas
   fontes de quanto foi dado" deixa de ser risco quando uma é derivada da outra pelo motor.
4. **CHD, DSA, Cronograma e motor preditivo leem o agregado**, não o fato bruto — salvo onde a UE
   for o objeto explícito da tela, que é o diário de classe.

**O custo foi assumido de olhos abertos, e está declarado aqui para que ninguém o descubra depois.**
A recomendação da revisão de 14/08 era a rota (a), por Princípio VI (mudança cirúrgica). A rota (b)
foi escolhida assim mesmo, pela coerência conceitual e porque sob PostgreSQL a assimetria de custo
diminuiu muito — a FK é declarativa, o agregado é VIEW e mover o grão é `INSERT … SELECT`. **A
contrapartida é que os quatro consumidores centrais entram no escopo do Épico 1 desde o primeiro
dia.**

**O que isso muda em `docs/sql-referencia/02_tabelas_fato.sql`:** hoje `registros_aula` tem
`disciplina_id uuid not null references disciplinas(id)`. Na migration do Épico 1 o fato passa a
apontar para `unidades_ensino`, e a disciplina volta como agregado derivado. O script de referência
**não** é a autoridade neste ponto — esta seção é.

> ### ✅ Complemento de 28/08/2026 — a origem do dado de UE
>
> **As Unidades de Ensino não precisam ser inventadas: elas estão nos currículos oficiais da DEnsM**,
> um PDF por curso/estágio, em `SIS11/Curriculos/`. Cada currículo traz, por disciplina, a seção
> `LISTA DE UNIDADES DE ENSINO` com número, tópico, carga horária e subunidades.
>
> Extração feita e validada em 28/08/2026 (`scripts/etl/extrair_unidades_ensino.py`, saída em
> `scripts/etl/dados/`): **572 UEs**, **134 disciplinas**, **21 dos 24 currículos**. A invariante que
> prova a leitura — soma das CH das UEs igual à CH da disciplina — **fecha em 134 de 134**.
>
> **Consequência para o Épico 1:** `unidades_ensino` nasce povoada por **seed de dado normativo**,
> com norma de origem (o nº do Ofício da DEnsM), na mesma natureza de `config_parametros`. **Não** é
> carga do ETL histórico e **não** é linha sintética.
>
> **Três currículos não declaram UE**, por motivos distintos: **Est-QF-APOC** é PDF digitalizado sem
> camada de texto; **C-Espc-FR** e **C-Espc-HN** usam o modelo por competências
> (`COMPETÊNCIA TÉCNICA` → `INDICADORES`), que não tem UE. Encaminhamento em **Q1.b**, do Épico 2.
>
> **O que continua em aberto (Q1.b, Épico 2):** o catálogo diz *quais* UEs existem; não diz *a qual
> UE pertence cada um dos 1.566 registros de aula históricos* — a v2.0 nunca guardou isso. **Não
> bloqueia o Épico 1**: o grão de `registros_aula` é o mesmo em qualquer das saídas.

**O que a decisão NÃO autoriza.** Ela fixa o grão e a entidade; **não** define atributos além dos
que o §9.1 do documento 05 nomeia (`numero_ue`, `topico`, `ch_prevista_tempos`,
`tecnica_ensino_sugerida`, `status`), e **não** cria tela nova. O diário de classe por UE é
funcionalidade, e funcionalidade nova esbarra no **Princípio X — Paridade Antes de Novidade**: a
v2.1 entrega a estrutura que a decisão exige, não a tela que ela viabiliza. Se faltar atributo,
**pergunte** (Princípio I).

**As três formas de atribuição, que o schema agora separa:**

| Tabela | Significado |
|---|---|
| `instrutor_disciplina` | **habilitação** — este instrutor *pode* ministrar |
| `disciplinas.instrutores_atribuidos` | **planejamento**, por grade de curso |
| `turma_disciplina_instrutor` | **atribuição real**, por turma ← LIQ e OS leem daqui |

---

## 3. Autenticação e RBAC

- **Somente e-mail/senha, criado por convite do Admin** (decisão do Bernardo, 25/08/2026).
  Reverte a decisão D1 da v2.0, que dependia do runtime Apps Script.
- **A primeira tela do sistema é o Login.** Nenhuma rota de `(app)` ou `print` é acessível sem
  sessão; o middleware redireciona para `/login`.
- Fluxo: Admin cadastra → Server Action com `service_role` chama `auth.admin.inviteUserByEmail()`
  → usuário define senha em `/convite/[token]`. **Signup público desabilitado no painel Supabase**
  (item de checklist do Épico 0, sem equivalente em código).
- Senha: mínimo 12 caracteres, verificação contra vazamentos habilitada, sem expiração compulsória.
- `usuarios.auth_user_id uuid unique references auth.users(id) on delete restrict` — 1:1 com o
  Supabase Auth, **nulo entre o cadastro e o aceite do convite** (é a janela em que o Admin revisa
  o perfil antes de a pessoa entrar).
- **Matriz de permissões como dado:** `perfil_permissao (perfil, recurso, acao, permitido)`.
  As policies consultam `app.pode()`; trocar uma permissão é `UPDATE`, não migration.
- Funções auxiliares (schema `app`, `SECURITY DEFINER`, `STABLE`, `search_path` fixo):
  `app.usuario_atual()`, `app.perfil_atual()`, `app.pode()`, `app.eh_admin()`,
  `app.cursos_do_usuario()`, `app.alcanca_curso()`, `app.alcanca_turma()`,
  `app.alcanca_disciplina()`.
- `RNF-SEG-02` deixa de ser disciplina de código e vira garantia do motor: **é RLS**.

> ⚠️ **Pendência que afeta a policy do Operador — decidir antes do Épico 3.**
> A policy pressupõe que `cursos.classificacao` e `usuarios.escopo_curso` compartilham domínio.
> **A planilha real desmentiu:** as classificações são `Curso Regular`, `Curso Expedito`,
> `Curso Especial`, `Curso de Aperfeiçoamento Avançado` e `Estágio de qualificação`, enquanto o
> escopo prevê `ead_semipresencial` — que na verdade é **modalidade**, coluna separada. Duas
> classificações não têm escopo correspondente. Recomendação: separar os domínios e ligá-los por
> uma tabela `escopo_classificacao`. Detalhe no documento 32, §5.

---

## 4. Estrutura do repositório

```
├── app/
│   ├── (auth)/login/ · convite/[token]/ · recuperar-senha/
│   ├── (app)/inicio/ · cursos/[curso]/ · turmas/[turma]/dsa/ · cronograma/
│   │         avaliacoes/ · atividades/ · relatorio/ · instrutores/ · disciplinas/
│   │         admin/usuarios/ · admin/parametros/ · admin/calendario/
│   ├── print/            # dsa · relatorio · cronograma · ficha-instrutor · liq · os-instrutoria
│   └── layout.tsx · error.tsx · not-found.tsx
├── components/{ui,ciaara,graficos,impressao}/
├── lib/
│   ├── supabase/{client,server,middleware,admin}.ts
│   ├── dominio/          # ← REGRAS DE NEGÓCIO PURAS (RN-*). Sem I/O
│   ├── validacao/        # schemas Zod, compartilhados
│   ├── acoes/            # Server Actions por domínio
│   └── tipos/database.ts # gerado por `supabase gen types typescript`
├── supabase/migrations/ · seed.sql · config.toml
├── scripts/etl/          # Python — Sheets → PostgreSQL
├── tests/{unidade,invariantes,e2e}/
├── docs/                 # esta documentação
├── specs/                # Spec 00 + as 39 specs convertidas
└── CLAUDE.md · AGENTS.md · .claude/
```

**`lib/dominio/` é o item mais importante desta migração.** É onde as ~40 regras `RN-` viram
funções TypeScript puras, sem acesso a banco: motor preditivo, distribuição semanal de carga
horária, detecção de conflito de horário, sugestão do DSA, ordenação por antiguidade, tetos
normativos. Puras ⇒ testáveis sem banco ⇒ a suíte de invariantes da v2.0 porta quase 1:1.
**Regra: nada em `lib/dominio/` importa `supabase`, `next` ou `react`.**

---

## 5. Design System

- Tokens CIAARA como CSS custom properties em `app/globals.css` sob `@theme` (Tailwind v4).
- Tema claro e modo noturno via `next-themes`, estratégia `class`, persistido — preserva
  `RNF-USA-05`.
- O objeto global `UI` da v2.0 deixa de existir: vira **tokens + biblioteca de componentes
  tipada**. O requisito `RF-DS` é **preservado**; o mecanismo muda.
- **Impressão é requisito, não detalhe** (`RNF-COMP-01`): DSA, Relatório, Cronograma, Ficha do
  Instrutor, LIQ e OS de Instrutoria mantêm paridade. Rotas `/print/*` sem shell.
- Densidade antes de beleza: é sistema de gestão, com tabelas de centenas de linhas.
- Acessibilidade AA; nenhuma cor entra fora dos tokens.

---

## 6. Estado e navegação

- `AppState` → **URL como fonte de verdade**, via `nuqs`. Entrega o que `RF-NAV` pedia e o Apps
  Script não permitia: histórico do navegador, voltar/avançar, link compartilhável, recarregar sem
  perder contexto.
- Estado de servidor: Server Components + Server Actions com `revalidatePath`/`revalidateTag`.
- Zustand apenas para estado efêmero de UI.
- `loading.tsx` + Suspense por segmento; `error.tsx` por segmento (degradação segura, `RN-DEG-01`).

---

## 7. Testes e Definition of Done

Uma fatia só está pronta quando **todos** passam:

1. `tsc --noEmit` sem erro e `eslint` sem aviso novo.
2. **Unidade (Vitest):** toda função de `lib/dominio/` tocada, com casos sintéticos.
3. **Invariantes (pgTAP):** contagens, integridade referencial, e uma asserção **nomeada** por
   regra `RN-` de *Risco: Alto*. Stub rastreável e explicitamente pendente é melhor que cobertura
   fingida (Princípio VIII).
4. **RLS — teste negativo por perfil:** o que cada perfil **não** pode ler ou escrever é negado
   **pelo banco**. Testar só o caminho feliz aprovaria uma RLS desligada.
5. **E2E (Playwright):** o percurso principal, incluindo a rota de impressão quando houver.
6. Migration aplicada em preview e revertível.
7. Commit no padrão `feat(RF-DSA-08): …` citando o identificador de origem.

**Validação de não regressão por invariantes estruturais e matemáticos**, nunca por diff com a
saída histórica de um curso — a CAHO 2026 foi rejeitada como padrão-ouro pelo Bernardo em
2026-08-10.

---

## 8. Épicos da v2.1

| # | Épico | Origem v2.0 |
|---|---|---|
| 0 | Fundação: repo, Next.js, Supabase, CI, tipos gerados | novo (migração) |
| 1 | Schema PostgreSQL + RLS + matriz de permissões | Épicos C e F |
| 2 | ETL Sheets → PostgreSQL + reconciliação | Épico C |
| 3 | Auth por convite, gestão de usuários, RBAC | Épico F |
| 4 | Design System + shell de navegação por URL | Épicos A, B e D |
| 5 | Cadastros: cursos, turmas, disciplinas, instrutores | RF-CURSOS/MATERIAS/INSTR/CRUD |
| 6 | Detalhe Semanal de Aula (lançamento + impressão) | RF-DSA |
| 7 | Cronograma unificado + motor preditivo multi-ano | Épico G |
| 8 | Avaliações simplificadas | Épico I |
| 9 | Atividades AEC/TAD/TR/Estudo Individual + tetos | Épico E |
| 10 | Relatórios e impressão | RF-REL |
| 11 | LIQ, OS de Instrutoria, Ficha de Docentes (PDF) | specs 027, 028, 022–026 |
| 12 | Motor de sugestão do DSA | Épico H |
| 13 | Apoio à Avaliação Externa / ROTA | Épico J |

Sequenciamento: `0 → 1 → 2 → 3 → 4`, depois por valor. **2 antes de 3:** sem dado migrado não há
o que proteger.

---

## 9. O que NÃO muda (invariável)

- Todo o corpo normativo: DGPM-101/103, DEnsM-1002/1004/2001/2003, PCP-FCT-2, PROENS, Regimento
  Interno.
- Termos intraduzíveis, jamais abreviados ou substituídos: **CHD, AEC, TAD, TR, TA, DSA, CHR,
  PROENS, DGPM-101/103, CAHO, LIQ, OS de Instrutoria, ROTA, LHFC, PM, OD, TFM**, siglas de curso.
- Nomenclatura **"Disciplina"** (decisão P-14), nunca "Matéria", em schema, código e documentação.
- Tetos: AEC ≤ 10% do somatório das CH das disciplinas; TAD ≤ 5% da CHR; TR ≤ 10% da CHR.
- Faixas de CH docente: 20h → 8–12 h; 40h → 16–24 h; Dedicação Exclusiva → 16–30 h.
- 9º TA é **alerta informativo, nunca bloqueio** (autorizado por currículo de CAHO, C-Ap-HN,
  C-Ap-FR).
- `RNF-NORM-04` (sequenciamento pedagógico) permanece **rejeitado**.
- `RNF-NORM-06`: o sistema **não** calcula nota, média final, aprovação ou documento escolar —
  competência das divisões CIAARA-32 e CIAARA-12.
- Contenção de escopo (Princípio IX): *este processo está atribuído à CIAARA-11 na Matriz de
  Responsabilidades?* Se não, está fora.
- Degradação segura (`RN-DEG-01`) e alerta-não-bloqueio (`RN-DEG-02`).
- Integridade do histórico: nenhuma linha de `migracao_log` já gravada é reescrita.
- Português do Brasil em toda interface, documentação, spec e mensagem de commit.

---

## 10. Volumes reais (para dimensionar, não para otimizar)

Conferidos contra a planilha viva em **26/08/2026** — **substituem** os números do inventário de
02/08 que ainda circulam em alguns documentos:

| Entidade | Real | Documentado antes |
|---|---|---|
| Cursos | 24 | 24 |
| Turmas | 30 *(+1 linha-lixo a descartar)* | 29 |
| Disciplinas | 175 | 175 |
| Instrutores | **179** | 177 |
| Vínculos instrutor↔disciplina | **852** | 798 |
| `turma_disciplina` | **216** | 210 |
| Registros de aula | **1.568** | 1.753 |
| Avaliações | **188** | 111 |
| Atividades não letivas | 664 | 663 |
| `migracao_log` | **1.116** | 503 |

Registros de aula caíram e avaliações subiram porque a **fusão de agendamento e execução**
(`RN-AVAL-02`) foi executada depois do inventário: 186 execuções saíram de
`Registro_Aulas_E_Atividades`, foram para `arquivo_avaliacoes_v1` e foram conciliadas em
`Avaliacoes`.

**É uma base pequena. Priorize clareza de schema e manutenibilidade sobre desempenho** —
desempenho não é um problema real deste sistema, e a v2.1 não deve fingir que é.

---

## 11. Estado verificado do schema

> ### ⚠️ `docs/sql-referencia/` é REFERÊNCIA, não é a migration do Épico 1
>
> Os números abaixo são reais e foram medidos — mas **datam de antes da decisão UE-1**, tomada em
> 26/08/2026. Duas divergências conhecidas, e nenhuma delas é erro do script: são o schema anterior
> a uma decisão que veio depois.
>
> | Ponto | `docs/sql-referencia/` | O que o Épico 1 deve implementar |
> |---|---|---|
> | Tabelas | 26 | **27** — falta `unidades_ensino` (§2.1) |
> | Grão de `registros_aula` | `disciplina_id NOT NULL` | **`unidade_ensino_id`** — grão de UE (§2.2) |
> | CH executada da disciplina | coluna do próprio fato | **VIEW/`GENERATED`** sobre as UEs (§2.2) |
>
> **Tudo o mais permanece válido e vale a pena reaproveitar**: os **28** tipos enumerados
> *(eram descritos como 27 — achado A-3; o número foi medido em disco e no banco)*, as funções do schema
> `app`, as 74 policies, a matriz `perfil_permissao` semeada, os gatilhos de auditoria e as duas
> correções de produção do fim desta seção não são afetados pela mudança de grão.
>
> **Regra para o agente do Épico 1:** o script de referência é ponto de partida revisável, **não é
> cópia**. Onde §2.1 ou §2.2 divergirem dele, **o BRIEF vence** — e a divergência é do script, que
> nasceu antes da decisão.

As seis migrations de `docs/sql-referencia/` foram aplicadas em ordem contra um **PostgreSQL 16
real**, com stubs de `auth.users`, `auth.uid()` e dos papéis `anon`/`authenticated`/`service_role`:

| Métrica | Valor |
|---|---|
| Tabelas (no script de referência) | **26** — o alvo é 27, §2.1 |
| Chaves primárias | 26 |
| Chaves estrangeiras | **34**, todas com `ON DELETE` explícito |
| Restrições de unicidade | 31 |
| CHECKs | 67 |
| Índices | 123 |
| Policies RLS | 74 |
| Tabelas sem RLS | **0** |
| Policies de `DELETE` | **0** (deliberado) |
| Linhas semente de `perfil_permissao` | 152 |

`docs/sql-referencia/schema_completo.sql` roda de uma vez, sem erro, e serve para colar no SQL
Editor do Supabase.

**Dois defeitos de produção foram encontrados pela validação com sessão autenticada de verdade** —
nenhum apareceria em revisão de código, e ambos estão no caminho menos testado, o de servidor:

1. **`permission denied for schema extensions`** — `app.normalizar_texto()` chama
   `extensions.unaccent()` no contexto de quem faz o INSERT. Sem
   `grant usage on schema extensions to authenticated`, **todo INSERT de usuário real falha**,
   enquanto ETL, migration e seed passam por rodarem como dono do schema.
2. **Gatilho anti-escalonamento bloqueando o ETL e o painel administrativo** — impedia a carga dos
   usuários migrados e a desativação de conta pelo Supabase Studio.

---

## 12. Estilo de redação dos documentos

- Português do Brasil, tom técnico e direto.
- Frontmatter YAML: `title`, `author`, `date`, `version`.
- Toda mudança em relação à v2.0 marcada inline: `**[MIGRAÇÃO v2.1]**`, `**[REVOGADO — v2.1]**`,
  `**[PRESERVADO]**`, `**[ABSORVIDO PELA PLATAFORMA]**`, `**[NOVO — v2.1]**`.
- Rastreabilidade obrigatória: todo item cita seu identificador de origem.
- **Nunca apagar um requisito.** Um requisito que perdeu sentido é marcado `[REVOGADO — v2.1]`
  com o motivo e o que ficou no lugar.
- Comentários didáticos em código explicando *o quê*, *para quê* e *como*.
- Tabelas em vez de listas longas quando houver 3+ atributos por item.
