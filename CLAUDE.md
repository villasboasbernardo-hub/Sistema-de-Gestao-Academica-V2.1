# CIAARA-11 v2.1 — Contexto do Projeto

> Este arquivo é lido pelo agente a **cada sessão**. Ele aponta para os documentos; não os resume.
> Mantenha-o curto: um `CLAUDE.md` de 500 linhas é lido com o mesmo cuidado que um contrato de licença.

## O que é

Sistema de gestão acadêmica da Divisão de Administração Acadêmica (**CIAARA-11**) do Centro de
Instrução e Adestramento Almirante Radler de Aquino, Marinha do Brasil. Gerencia cursos, turmas,
disciplinas, instrutores, o lançamento diário de aulas (**DSA**), o cronograma anual e os documentos
oficiais (**LIQ**, **OS de Instrutoria**, Ficha de Docentes). "CIAARA-11" é o **código regimental da
divisão**, não um número de versão. A **v2.1** é a migração da v2.0 (Google Apps Script + Sheets, em
produção) para Next.js + Supabase — **mesmo domínio, plataforma nova**.

## Idioma

Português do Brasil em **tudo**: interface, spec, plan, tasks, comentário de código, mensagem de
commit, nome de variável e de função. Identificadores de banco em `snake_case` sem acento (restrição
do motor, não tradução). Nada de `WeeklyClassDetail`, `teachingHours`, `subject`, `student`.

## Plataforma — decidida, não em aberto

| Camada | Decisão |
|---|---|
| Framework | Next.js 15+, App Router, React 19, TypeScript `strict`. **Server Components por padrão** |
| Estilo | Tailwind CSS v4 (`@theme`, CSS-first) |
| Componentes | shadcn/ui (Radix + `cva`), copiados para `components/ui/` e versionados |
| Banco | Supabase PostgreSQL |
| Auth | Supabase Auth — **e-mail/senha, somente por convite do Admin**. Signup público desabilitado |
| Autorização | **RLS no banco** + matriz `perfil_permissao` como dado |
| Dados | `@supabase/ssr` (servidor) · `@supabase/supabase-js` (cliente). **Sem ORM** |
| Mutações | Server Actions + **Zod na primeira linha, sempre** |
| Estado de navegação | **URL** (`searchParams`) via `nuqs`. Zustand só para estado efêmero de UI |
| Gráficos | Recharts · **Impressão** CSS `@media print` + rotas `/print/*` |
| Testes | Vitest (unidade) · Playwright (e2e) · pgTAP (invariantes SQL) |
| Hospedagem | Vercel, preview por branch · **Repositório** GitHub, Conventional Commits |
| ETL | Python (`scripts/etl/`), reaproveita `migracao/*.py` da v2.0 |

**Proibido, sem discussão:** ORM que esconda o SQL (Prisma, Drizzle) · banco fora do Supabase ·
biblioteca de componentes além de shadcn/Radix · **regra de negócio implementada apenas na UI**.

**Aposentado da v2.0, não reintroduzir:** `clasp`, `BUILD_ID`, `implantacao/MANIFESTO.md`,
`include()`/`HtmlService`, `AppState` como objeto global, o objeto global `UI`, Chart.js, Bootstrap.
Implantação agora é **Git → preview por branch → merge → produção**.

## Documentos de referência — e quando ler cada um

Vivem em `docs/`. **Leia antes de responder sobre requisito; não parafraseie de memória.**

| Quando | Leia |
|---|---|
| **Sempre, antes de qualquer fatia** | `docs/vibe-coding/40-Constitution-v2.1.md` — os 11 princípios. Prevalece sobre qualquer plano |
| Dúvida sobre consistência entre documentos | `docs/BRIEF-v2.1.md` — o contrato. Se algo parecer errado nele, **reporte, não invente alternativa** |
| Vai portar uma regra `RN-` | `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md` — **o contrato do domínio** |
| Vai implementar um `RF-` | `docs/fase-1/02-Requisitos-Funcionais.md` (coluna *Destino na v2.1*) |
| Vai escrever migration | `docs/fase-2/21-Schema-Fisico-PostgreSQL.md` + `docs/sql-referencia/*.sql` **na ordem numérica** |
| Vai escrever policy RLS ou mexer em auth | `docs/fase-2/22-Seguranca-RLS-e-Autenticacao.md` |
| Vai criar tela ou componente | `docs/fase-2/23-Design-System-Tailwind-shadcn.md` |
| Não sabe onde um arquivo mora | `docs/fase-2/24-Estrutura-do-Repositorio-e-Convencoes.md` |
| Vai buscar/ mutar dado | `docs/fase-2/25-Camada-de-Dados-e-Estado.md` |
| Vai começar um épico | `docs/fase-1/06-Backlog-de-Epicos-V2.1.md` (§3) + `docs/vibe-coding/42-Prompts-por-Epico.md` |
| Dúvida de processo ou implantação | `docs/fase-1/10-Plano-de-Execucao-Vibe-Coding.md` |
| Dúvida de vocabulário | `docs/fase-1/07-Glossario.md` — sobretudo a coluna *Equivalente na v2.0* |
| Vai mexer no ETL / no corte | `docs/fase-3/30-Plano-de-Migracao-ETL.md` e `31-Mapa-De-Para-Sheets-PostgreSQL.md` |

## Regras invioláveis

1. **Nenhuma regra do documento 04 é alterada.** Portar é reescrever na sintaxe nova **preservando o
   comportamento — inclusive o que parecer errado**. Achou algo estranho? **Liste ao final; não
   conserte.** Alterar exige autorização nominal do Bernardo.
2. **Contenção de escopo.** *Este processo está atribuído à CIAARA-11 na Matriz de
   Responsabilidades?* Se não, está fora. Nota, média, aprovação, documento escolar, AVA/EAD,
   reserva de salas como recurso, corpo discente e infraestrutura são de outras divisões
   (`RNF-NORM-06`).
3. **Paridade antes de novidade.** Enquanto não houver paridade funcional com a v2.0, **nenhuma
   funcionalidade nova de negócio entra**. Pergunta de triagem: *isto é paridade ou é novidade?*
4. **Nada é apagado.** Exclusão é **lógica** (`status = 'inativo'`). Nenhuma tabela tem policy
   `FOR DELETE`, e **isso é regra de negócio, não lacuna** (`RN-INST-05` generalizada). PR que
   acrescenta `for delete` é rejeitado sem discussão.
5. **`migracao_log` é append-only.** Nunca reescrever linha já gravada — corrigir é **logar evento
   novo**. Bloqueado por gatilho **inclusive para `service_role`** (Princípio IV).
6. **Regra normativa vira alerta, nunca bloqueio** (`RN-DEG-02`). Os tetos AEC 10% / TAD 5% / TR 10%
   e o 9º TA são **alerta**. **Nunca transformá-los em `CHECK`** — mudaria a regra de negócio.
7. **Degradação segura** (`RN-DEG-01`): dependência ausente devolve vazio/neutro com aviso, nunca
   exceção não tratada. `error.tsx` + `loading.tsx` por segmento.
8. **Parâmetro normativo é dado, nunca constante.** Tetos, faixas de CH docente, feriados, janelas e
   reservas do PROENS vivem em `config_parametros` e nas tabelas de calendário (`RNF-NORM-08`).
9. **Nada em `lib/dominio/` importa `supabase`, `next` ou `react`.** Imposto por ESLint.
10. **Não regressão se prova por invariante**, nunca por diff com a saída histórica de um curso.
    **A CAHO 2026 foi rejeitada como padrão-ouro** (Bernardo, 10/08/2026) — não reabrir.
11. **`RNF-NORM-04` permanece rejeitado** (sequenciamento pedagógico de técnica de ensino): não gera
    requisito, em nenhuma etapa do Épico 12. **LIQ-2 permanece fechado**: `Instrutor_Impedimento`
    **não será criada**; a coluna "Observação" da LIQ sai **sempre vazia** — é comportamento
    pretendido, verificado por teste.

## Vocabulário

**Termos intraduzíveis** — nunca traduzidos, abreviados de outra forma ou substituídos por sinônimo,
em código, schema, spec, comentário, commit, interface ou nome de arquivo:

> **CHD · AEC · TAD · TR · TA · DSA · CHR · PROENS · DGPM-101 · DGPM-103 · DEnsM-1002/1004/2001/2003 ·
> PCP-FCT-2 · NORMHIDRO nº 30-23 · CAHO · LIQ · OS de Instrutoria · ROTA · LHFC · PM · OD · TFM** —
> e todas as siglas de curso (C-Ap-HN, C-Ap-FR, C-Esp-ALH…).

**"Disciplina", nunca "Matéria"** (decisão P-14, 10/08/2026) — em schema, código, interface e
documentação. `disciplinas`, `instrutor_disciplina`, `turma_disciplina`, `disciplina_id`.

**Fórmula de composição:** `CHT = CHD + AEC + TAD + TR`. **Estudo Individual fica fora da soma**,
controlado à parte.

**Faixas de CH docente por regime:** 20h → 8–12 h · 40h → 16–24 h · Dedicação Exclusiva → 16–30 h.
O teto é a **faixa**, nunca o número do regime (`RN-2027-06`).

Regra prática: **se o Bernardo não usaria a palavra numa conversa, ela não entra no código.**

## Convenções de banco

- `snake_case` minúsculo, sem acento, sem aspas. **Tabelas no plural.**
- `id uuid primary key default gen_random_uuid()`.
- `codigo text unique not null` — guarda o `ID_*` da v2.0 verbatim (`CUR-000001`, `VIN-000123`).
  **FKs apontam para `id`, nunca para `codigo`.**
- `origem_migracao_v1 text` em toda tabela migrada.
- **Exclusão lógica universal:** `status` explícito (`ativo`/`inativo`), **nunca inferido de `NULL`**.
- **Auditoria:** `criado_por`, `criado_em`, `editado_por`, `editado_em` — preenchidos pelo trigger
  `app.set_auditoria()` a partir de `auth.uid()`.
- **Vigência temporal:** `vigente_de date not null` + `vigente_ate date null` (`NULL` = vigente).
  Resolução pelo maior `vigente_de <= data_do_fato`. **Nenhuma edição reinterpreta o passado.**
- **`ENUM` só para domínio normativo fechado.** Domínio operacional administrável vive em
  `config_listas` com FK. Na dúvida, `config_listas` — `ENUM` fechado cedo demais é migration.
- `timestamptz`, banco em UTC, apresentação em `America/Sao_Paulo`.
- Coluna derivada: `GENERATED ALWAYS AS … STORED` ou VIEW. **Nunca uma segunda fonte de verdade.**
- **Toda tabela tem `ENABLE ROW LEVEL SECURITY`.** Tabela sem policy é inacessível — **intencional**.
- Toda migration que cria tabela cria junto: RLS, policies, índices, `set_auditoria()`, o quarteto de
  auditoria e `origem_migracao_v1`. **O SQL é escrito à mão**, nunca gerado por diff não lido.
- **Nunca `drop column` nem `drop table`** em tabela com histórico. Coluna sem uso vira comentário
  `-- [APOSENTADA — v2.1]` e fica.

## Convenções de código

- **Ordem de implementação, de dentro para fora:** `lib/dominio/` (regra pura + teste) →
  `lib/validacao/` (Zod) → `lib/acoes/` (Server Action) → `app/` (página) → `components/`.
- `"use client"` **só em folha** — nunca em `page.tsx` nem em `layout.tsx`. O marcador contamina toda
  a subárvore de importação.
- **Nenhum `await` dentro de laço em `app/**`.** Um `select` com join do PostgREST por tela;
  `Promise.all` para consultas independentes.
- Server Action **é endpoint HTTP de fato**: `safeParse` do Zod na primeira linha, sem exceção.
- Estado de tela vai para a **URL** (`nuqs`), não para `useState`. É o que dá deep-link de graça.
- `components/ciaara/` **não define cor literal** — só token do `@theme`.
- Densidade antes de beleza: é sistema de gestão, com tabelas grandes.
- Toda função de `lib/dominio/` traz no topo o identificador `RN-` e a **citação literal** da regra.

## Convenções de commit

```
<tipo>(<identificador>): <resumo no imperativo, em português, ≤ 72 caracteres>
```

`feat` · `fix` · `refactor` · `perf` · `test` · `db` (migration) · `docs` · `chore` · `style`.
O `<identificador>` é o `RF-`/`RN-`/`RNF-`/épico de origem. Commit **sem** identificador só em
`chore`, `style` e `docs` genéricos.

```
feat(RF-DSA-08): gerar sugestão semanal do DSA
db(RN-2027-09): criar curso_regime_historico com vigência por EXCLUDE
test(RN-ANT-02): cobrir empate de posto por antiguidade declarada
```

Branch: `<tipo>/<identificador>-<resumo-curto>`. **Nunca `git push` direto na `main`.** Merge por
squash, via PR com o template inteiro preenchido.

## Definition of Done — uma fatia só está pronta quando **todos** passam

1. `tsc --noEmit` sem erro e `eslint` sem aviso novo.
2. **Vitest** em toda função de `lib/dominio/` tocada, com casos sintéticos.
3. **pgTAP**: contagens, integridade referencial e uma asserção **nomeada** por regra `RN-` de
   *Risco: Alto*. Stub explicitamente pendente é aceito; **cobertura fingida não**.
4. **RLS — teste negativo por perfil:** o que cada perfil **não** pode ler/escrever é negado **pelo
   banco**. Testar só o caminho feliz não prova nada.
5. **Playwright** no percurso principal, incluindo a rota `/print/*` quando houver.
6. Migration aplicada em preview e **revertível** (plano de reversão escrito no PR).
7. Commits no padrão `feat(RF-…): …`.

Comando único que roda a sequência do CI localmente: **`pnpm verificar`**.

## Gotchas da plataforma — os quatro que produzem defeito silencioso

**1. Fronteira Server/Client.** `"use client"` contamina toda a subárvore de importação. Um deles no
`page.tsx` de instrutores manda a tabela de 177 linhas e o catálogo de siglas para o bundle. Erro de
fronteira **frequentemente não aparece no `tsc`** — aparece no `next build`. Por isso `pnpm build`
faz parte da verificação local.

**2. `service_role` vazando.** `SUPABASE_SERVICE_ROLE_KEY` **ignora a RLS inteira**. Três defesas,
todas obrigatórias: nunca prefixar com `NEXT_PUBLIC_` · `import "server-only"` no topo de
`lib/supabase/admin.ts` (importá-lo de Client Component vira **erro de build**) · regra ESLint
`no-restricted-imports`. **Usos autorizados, e só estes três:** convite de usuário pelo Admin
(`auth.admin.inviteUserByEmail()`), carga do ETL, script de manutenção versionado rodado à mão.
**Nunca por requisição de tela.**

**3. O `GRANT` de `extensions`.** RLS é **filtro sobre privilégio que já existe** — não concede nada
por si. `unaccent`, `btree_gist` e `pg_trgm` vivem no schema `extensions`, e
`app.normalizar_texto()` chama `extensions.unaccent()` **no contexto de quem faz o INSERT**. Sem
`grant usage on schema extensions to authenticated`, **todo INSERT de usuário autenticado falha** —
enquanto ETL, migration e seed passam, porque rodam como dono do schema. Quando uma consulta falhar
com `permission denied`, **o primeiro suspeito é o `GRANT`, não a policy.**

**4. RLS que nega em silêncio.** Policy de `SELECT` restritiva demais faz a tela abrir **vazia, sem
erro**, e o usuário conclui "não tem dado cadastrado". Distinga sempre *"não há"* de *"você não
vê"* no estado vazio. E: **policy não enxerga `OLD`/`NEW`** — quando a regra depende do que mudou
(auto-escalonamento de perfil, por exemplo), é **gatilho**, não policy.

**Bônus:** `pnpm db:tipos` **depois de toda migration**. O CI falha se `lib/tipos/database.ts`
divergir do schema. Coluna que o TypeScript não conhece é, quase sempre, coluna inventada.

## Estado atual e onde retomar

*Atualize esta seção ao fim de cada fatia — é a primeira coisa que o agente lê numa sessão nova.*

| Item | Estado |
|---|---|
| Sistema em produção | **v2.0** (Apps Script + Sheets). Continua sendo a produção **até o corte**. Base viva: `Banco de dados CIAARA-11 v2.0`, 23 abas, sendo escrita todo dia |
| Decisão de migrar | ✅ Bernardo, 25/08/2026 |
| Projeto Supabase | ✅ Criado e **alcançável pela aplicação** (`cqhpfuaweoyglhtrckcp`, chave publicável no `.env.local`, conexão verificada em 26/08/2026). Schema ainda **vazio** — aguarda o Épico 1 |
| Repositório GitHub | ✅ `villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1` — **PÚBLICO** desde 26/08/2026 (decisão de Bernardo), branch padrão `main`, um commit (`a1aa9fb`, só `README.md`). `gh` autenticado. **Ainda sem push da v2.1**: o commit de 26/08 vive em `master` no repo `SIS11` e precisa ser replantado em `main` (FR-021 da spec 001) |
| Proteção da branch `main` | ⬜ **Disponível, não configurada** (`404 Branch not protected`). Aplicar o comando do documento 10 §2.7 **depois** do `ci.yml` e **antes** do primeiro PR — os três contextos (`qualidade`, `banco`, `build`) precisam existir com esses nomes |
| ⚠️ Repositório público | Toda a suíte documental das Fases 1–3 fica **legível por qualquer pessoa** quando o push acontecer: estrutura da CIAARA-11, volumes de pessoal, regras da MB, referência normativa e o ref do projeto Supabase. **Não é credencial** — a `service_role` está fora do repo e o `.env.local` é ignorado. É exposição institucional, decidida por Bernardo |
| Gerenciador de pacotes | ✅ **`pnpm` confirmado por Bernardo em 26/08/2026.** Pendência fechada |
| Preview na Vercel | ✅ **Liberada em 26/08/2026, só com dado sintético** até a CIAARA-14.2 decidir sobre hospedagem fora da MB. Nem a base viva nem o Supabase de produção alcançáveis pela preview (FR-022 da spec 001) |
| Documentação (Fases 1–3 + Vibe Coding) | ✅ Escrita. `docs/sql-referencia/` com os seis scripts de referência |
| **Épico 0 — Fundação** | 🟨 **Em andamento.** Feitos §6.1 e §2.8. **Retomar em §6.2** do documento 10 |
| Épicos 1 a 13 | ⬜ Pendentes |
| **Decisão UE-1** | ✅ **Fechada em 26/08/2026 — rota (b)**: `registros_aula` no grão de **Unidade de Ensino**; disciplina é agregado derivado. Épico 1 **desbloqueado**. Ver documento 05 §9.1 |
| Numeração das specs | ✅ **Reiniciada em 26/08/2026.** As 39 specs herdadas da v2.0 vivem em `specs/heranca-v2.0/`; a v2.1 recomeça em `specs/001-…`. "Spec 001" **exige o diretório** para não ser ambíguo |

**Épico 0 — de pé em 26/08/2026:** `pnpm` 11.24.0 via `corepack` · Next.js **16.3.3** + React
19.2.8 + Tailwind **v4.3.3**, App Router, sem `src/`, alias `@/*` · `tsconfig.json` conforme o
documento 24 §5.1, `exactOptionalPropertyTypes` **ligado** · `@supabase/supabase-js` 2.112.4 e
`@supabase/ssr` 0.12.5 · `.env.local` e `.env.local.example` (documento 24 §5.4) · Spec Kit 0.16.0,
integração `claude`, scripts `sh`, 10 skills em `.claude/skills/` · constitution 2.1.0 transcrita
**literalmente** para `.specify/memory/constitution.md`. `tsc`, `eslint` e `next build` verdes.

**Épico 0 — pendente, nesta ordem:** ESLint das duas fronteiras + o teste que prova a regra ativa
(§6.2) · `supabase init`/`start` e os quatro clientes de `lib/supabase/` (§6.3) ·
`lib/tipos/database.ts` (§6.4 — depende do schema do Épico 1) · suítes vazias Vitest/Playwright/
pgTAP (§6.5) · scripts do documento 24 §7 no `package.json` (§6.6) · `.github/workflows/ci.yml`
(§6.7) · primeiro deploy verde na Vercel (§6.8).

**Três armadilhas já pagas — não redescobrir:**

1. **Veio Next 16, não 15.** `tsc --noEmit` isolado falha com `Cannot find name 'LayoutProps'` até
   que um `next build` (ou `next typegen`) gere os tipos de rota. Não é erro de código.
2. **Spec Kit 0.16.0 usa hífen:** `/speckit-specify`, não `/speckit.specify` como o documento 10
   §2.8 escreve. As skills estão instaladas e corretas.
3. **A constitution existe em dois endereços** — `docs/vibe-coding/40-Constitution-v2.1.md` e
   `.specify/memory/constitution.md`, hoje idênticos. **Emenda tem de ir nos dois**, sob pena de
   divergência silenciosa. Consolidar num só é decisão pendente do Bernardo.

**Volumes** (para dimensionar, não para otimizar): 24 cursos · 29 turmas · 175 disciplinas ·
177 instrutores · 798 vínculos instrutor↔disciplina · ~1.753 registros de aula · 663 + 1 = 664
atividades não letivas (531 Estudo Individual · 62 AEC · 60 TAD · 11 TR) · 111 avaliações · 210 linhas de `turma_disciplina` · dezenas de usuários simultâneos no
máximo. **É uma base pequena: priorize clareza de schema e manutenibilidade sobre desempenho.**

### Decisões pendentes do Bernardo — não atropelar por suposição

| # | Decisão | Bloqueia |
|---|---|---|
| **Hospedagem fora da infraestrutura da MB** | Pendente na CIAARA-14.2 | **Épico 2.** Única pendência capaz de bloquear a versão por razão não técnica. *Não bloqueia mais o Épico 0: em 26/08/2026 Bernardo liberou a preview com dado sintético apenas* |
| **CONST-1** | Constitution em dois endereços: consolidar ou manter espelho | Nenhum épico. Custo cresce a cada emenda |
| **TURMA-1** | Status "Arquivada" no domínio de turma | Épico 1 (barato agora) |
| **LIQ-3** | Papel titular/reserva na atribuição | Épico 11 |
| **LIQ-4** | Persistência da LIQ emitida | Épico 11 |

Quando uma dessas aparecer no caminho: **pergunte. Não assuma.** É o Princípio I.
