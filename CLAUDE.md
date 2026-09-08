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

**São dois comandos, com promessas diferentes** *(emenda de 27/08/2026 — pendência D-8)*:

| Comando | Cobre | Docker? | Promete | Quando |
|---|---|---|---|---|
| **`pnpm verificar`** | tipos, lint, formatação, unidade, build | não | **rapidez** — alvo de 5 min (`SC-008`) | a cada commit |
| **`pnpm verificar:tudo`** | tudo acima **+** pgTAP, RLS negativa e ponta a ponta | sim | **coincidir com o CI** (`SC-005`) | antes de abrir o PR |

Não são redundantes: um só comando não promete as duas coisas. Verde em `verificar:tudo` seguido de
vermelho no CI é **defeito da verificação**, não azar — vira tarefa de correção.

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
| Projeto Supabase | ✅ `cqhpfuaweoyglhtrckcp`, **designado desenvolvimento/preview** (FR-022.1) — o de produção nasce antes da carga real do Épico 2 e **não existe ainda**. Schema **preenchido pelo Épico 1**: 27 tabelas, aplicadas do zero por `pnpm db:reset`. ⚠️ A CLI do Supabase **não está autenticada** nesta máquina (`supabase login` pendente), então só o banco local é alcançável por comando |
| Repositório GitHub | ✅ `villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1` — **PÚBLICO** desde 26/08/2026, branch padrão `main`. **Replantio FEITO** (FR-021): `main` local e remota em dia. Correspondência de SHA no `README.md` — `d19ab10`→`0eb509c`, `d31bd56`→`e64484d`; os originais seguem intactos no `SIS11`. `gh` com escopos `gist`, `read:org`, `repo`, **`workflow`** |
| Proteção da branch `main` | ✅ **Aplicada em 03/09/2026** e conferida lendo de volta: contextos `qualidade`/`banco`/`build`, `strict=true`, **`enforce_admins=true`** (07/09/2026) e **sem revisão exigida** — num projeto de um operador ninguém aprova o próprio PR (fecha o **CHK014**), mas o portão **barra todo mundo, inclusive você** (fecha o **CHK013**). A `main` não aceita mais push direto. ⚠️ **O comando do documento 10 §2.7 não funcionava**: `gh -F` não aninha chave com ponto e a API devolve 422 — corrigido para JSON via `--input` |
| ⚠️ Repositório público | **O push aconteceu.** Toda a suíte documental das Fases 1–3 está **legível por qualquer pessoa**: estrutura da CIAARA-11, volumes de pessoal, regras da MB, referência normativa e o ref do projeto Supabase. **Não é credencial** — a `service_role` está fora do repo e o `.env.local` é ignorado. Exposição institucional, decidida por Bernardo. Procedimento de vazamento: `README.md` §*Se um segredo vazar* — **rotacionar, nunca apagar o commit** |
| Gerenciador de pacotes | ✅ **`pnpm` confirmado por Bernardo em 26/08/2026.** Pendência fechada |
| Preview na Vercel | 🟨 **Projeto vinculado em 03/09/2026** — `ciaara-11/sistema-de-gestao-academica-v2-1`, **sem URL de produção** (FR-016.1). Escopo **Preview** com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_AMBIENTE=preview`; escopo **Production vazio**, e é essa ausência que satisfaz o FR-022. Falta `NEXT_PUBLIC_URL_APLICACAO` (decisão pendente) e as provas T053–T056 |
| Documentação (Fases 1–3 + Vibe Coding) | ✅ Escrita. `docs/sql-referencia/` com os seis scripts de referência |
| **Épico 0 — Fundação** | ✅ **CONCLUÍDO em 07/09/2026 — 72 de 72.** O portão é **prova, não declaração**: cinco defeitos deliberados no PR #2 (descartável, fechado sem merge) produziram cinco reprovações e **cinco merges bloqueados** — erro de tipo, violação da fronteira de `lib/dominio/`, teste de unidade, **ponta a ponta** e contrato de dados desatualizado. O 4º é o que importa: `qualidade` e `banco` verdes, só o `build` vermelho — até 03/09 nenhum contexto o pegaria. `verificar:tudo` local e CI deram **veredito idêntico** sobre o mesmo commit (SC-005). Atomicidade provada: um deploy em `ERROR` não derrubou o anterior |
| **Épico 1 — Schema + RLS** | ✅ **CONCLUÍDO.** Implementado em 30/08/2026 e **na `main`** desde então. Medido no banco: **27 tabelas · 0 sem RLS · 0 com FORCE · 77 policies · 0 de DELETE · 0 UPDATE sem WITH CHECK · 152 linhas de matriz · 10 views**. **80 asserções pgTAP** e **19 testes de RLS com sessão autenticada**, tudo rodando **no CI**, no bloco `banco`, verde. A T091 (abrir PR) ficou **sem objeto**: o código entrou na `main` em 30/08, antes de existir CI ou proteção. Registrado, não encenado — abrir PR retroativo para código já mesclado não provaria nada |
| Épico 1 — o que **não** entrou | A **carga das 572 UEs** — depende de `disciplinas`, é do Épico 2 (achado A-13). *(O `ci.yml` saiu desta lista: existe desde 03/09/2026 e roda verde.)* |
| **Catálogo de Unidades de Ensino** | ✅ **Extraído em 28/08/2026** dos 24 currículos da DEnsM (`SIS11/Curriculos/`): **572 UEs**, 134 disciplinas, 21 currículos. Invariante fecha em **134/134** (soma das CH das UEs = CH da disciplina). Script `scripts/etl/extrair_unidades_ensino.py`, dado em `scripts/etl/dados/`. **3 currículos sem UE** — ver Q1.b |
| **Épico 2 — Migração de dados** | ✅ **CONCLUÍDO em 08/09/2026.** **5.394 linhas em 26 tabelas**, transação única, contra o banco local. Reconciliação **APROVADA nas oito bloqueantes** (R-01 a R-08), com a R-02 **provada**: `REG-0176` movido de turma à mão, contagem total intacta em 1.566, e a verificação acusou os dois lados. **96 asserções pgTAP** verdes com a base povoada **e** vazia. Ponto de entrada único: `python -m scripts.etl.executar`, cujo **código de saída é o veredito da reconciliação**. Os dois bloqueios não técnicos caíram: a **CIAARA-14.2 autorizou a hospedagem de dado pessoal em nuvem** (08/09) e a **Q1.b foi resolvida por cruzamento** com as planilhas de planejamento da v1.0 |
| Épico 2 — o que **não** entrou | A **carga das 572 UEs** e a aplicação do cruzamento. `unidades_ensino` está **vazia** e `registros_aula.unidade_ensino_id` é **nula nas 1.566** — ratificado por Bernardo em 08/09 (*"o ETL deve ser o retrato fiel da origem, sem preenchimentos inventados"*). O cruzamento existe e tem **901 `casado` de 1.566** (`dados/normalizado/ue_cruzamento.csv`); o que falta é reconciliar um **terceiro** espaço de nomes — a sigla de curso do catálogo da DEnsM não bate com `cursos.codigo` em **8 dos 21** (`EST - QF - APHID` × `EST-QF-APHID`) e o `disciplina_id` fecha em **84 de 134** pelo nome |
| Épicos 3 a 13 | ⬜ Pendentes. **Entra no Épico 3, além do abaixo:** a carga das 572 UEs, que é o único item do Épico 2 deixado aberto. **Entram no Épico 3:** a Server Action de convite (primeiro consumidor real de `lib/supabase/admin.ts`) e `NEXT_PUBLIC_URL_APLICACAO`, deixada fora do Épico 0 por decisão de 07/09. **Entra no Épico 4:** a dívida de estilo C-1 — 4 arquivos usam `style={{}}` com cor literal, à espera dos tokens `@theme` |
| **Decisão UE-1** | ✅ **Fechada em 26/08/2026 — rota (b)**: `registros_aula` no grão de **Unidade de Ensino**; disciplina é agregado derivado. Épico 1 **desbloqueado**. Ver documento 05 §9.1. **Origem do dado resolvida em 28/08/2026**: as UEs vêm dos **currículos oficiais da DEnsM**, não de linha sintética |
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

**Os treze achados do Épico 2 — o schema encontrando o dado real pela primeira vez.**
Cada um está medido e justificado na migration que o corrige, e **todos foram ratificados por
Bernardo em 08/09/2026** (*"foram balizados por medição real e justificados na migration"*):

1. **`escopo_curso` não cobria a base.** Faltavam `especial` e `aperfeicoamento_avancado` — **7
   dos 24 cursos**. `acao_migracao` não tinha `adicionado`/`descartado`, os verbos de 3 linhas do
   log histórico: traduzi-los seria **reescrever linha de log**, que a regra 5 proíbe.
2. **Cinco `NOT NULL` em que a ausência é legítima e permanente** — hora de turno em curso EAD (a
   própria planilha escreve "sem regime de TA presencial"), designador de turma única, sufixo de
   especialidade, instrutor responsável por avaliação, tabela de origem em evento que não
   transportou nada.
3. **Cinco em que a ausência é só do histórico** — entram por **catraca**, o padrão da UE: exigem a
   coluna em linha nova **e** quando alguém editar a linha migrada. Para dado novo é **mais forte**
   que o `NOT NULL` original.
4. **`GERAL` é sentinela, não curso** (`reservas_proens`, `responsaveis_curso`). Criar uma linha
   `cursos` chamada "GERAL" a faria aparecer em toda listagem e todo relatório para sempre.
5. **A conferência de órfãos estava PROMETIDA no cabeçalho do ETL e não acontecia** — o chamador
   descartava a lista. Sem ela, `LEFT JOIN` sem par gravava vínculo nulo **sem erro nenhum**.
6. **`Turma_Disciplina.ID_Instrutor` guarda LISTA** (`'17, 18, 19, 20, 40, 60, 55'`). As **96**
   atribuições vão para `turma_disciplina_instrutor` — a tabela de junção **que já existia no
   schema** e o ETL ignorava. Contagem conferida por outro caminho.
7. **`Tipo_Atividade` e `Config_Listas` nunca foram o mesmo vocabulário.** A coluna guarda
   `Aula Teórica`; a lista tem `Aula`, `Palestra`, `Avaliação`. A v2.0 é planilha e não impunha a
   lista; o gatilho da v2.1 é a primeira conferência da história. **10 valores semeados**, marcados
   por procedência — traduzir apagaria a distinção teórica/prática de 1.566 lançamentos.
8. **`config_parametros` misturava normativo com operacional.** `natureza` separa os dois e o
   RNF-NORM-08 virou **CHECK do banco**, não teste.
9. **13 parâmetros normativos chegavam por duas chaves.** Decisão de Bernardo (08/09): fica a
   **canônica da v2.1**; as 13 da v2.0 são transportadas e chegam **`inativo`** — exclusão lógica,
   regra 4. Se os valores divergirem, a carga **aborta**: dois números para a mesma norma não é
   duplicidade de nome, é conflito.

**Quatro achados do Épico 1 — corrigidos, e que ninguém deve reintroduzir:**

1. **`TRUNCATE` não passa pela RLS.** O Supabase concede `ALL` a `authenticated` por padrão e
   `docs/sql-referencia/05` nunca revogava `DELETE` nem `TRUNCATE`. Um usuário autenticado
   poderia **truncar `migracao_log`** e apagar a evidência auditável da migração sem que
   policy nenhuma fosse consultada. M6 revoga os dois. A "proteção dupla" do FR-033 só existia
   pela metade.
2. **`responsaveis_curso` não tinha `EXCLUDE` de vigência.** O documento 05 §7.5 especifica
   dois; o referência implementa um. Sem ele, um DSA reimpresso sairia com duas rubricas do
   mesmo papel. Acrescentado em M2.
3. **Uma FK usava `CASCADE`** (`horarios_tempos_aula`), contra a regra geral do BRIEF §2 e sem
   justificativa escrita. Trocada por `restrict` — nada é apagado neste sistema, então não muda
   comportamento alcançável.
4. **O rodapé de `docs/sql-referencia/01` está extraviado**, antes da TABELA 11. Quem extrair
   "do início até o rodapé" perde `turma_disciplina_instrutor` — a tabela de onde a LIQ lê.

**Divergência reportada, não corrigida:** a semântica de `vigente_ate`. O documento 05 §7.5
escreve `daterange(…, '[)')` — fim **exclusivo**; o referência implementa `vigente_ate + 1` —
fim **inclusivo**. Vale um dia, na fronteira. Seguimos o referência.

**Três armadilhas já pagas — não redescobrir:**

1. **Veio Next 16, não 15.** `tsc --noEmit` isolado falha com `Cannot find name 'LayoutProps'` até
   que um `next build` (ou `next typegen`) gere os tipos de rota. Não é erro de código.
2. **Spec Kit 0.16.0 usa hífen:** `/speckit-specify`, não `/speckit.specify` como o documento 10
   §2.8 escreve. As skills estão instaladas e corretas.
3. **A constitution existe em dois endereços** — `docs/vibe-coding/40-Constitution-v2.1.md` e
   `.specify/memory/constitution.md`. **Emenda tem de ir nos dois**, sob pena de divergência
   silenciosa. Consolidar num só é decisão pendente do Bernardo (CONST-1).
   **⚠️ Corrigido em 28/08/2026: eles NÃO são idênticos.** O corpo normativo já divergia em 5 linhas
   antes de qualquer edição desta data — a cópia de `.specify` aponta para `sql/05_rls_policies.sql`,
   caminho que não existe (o certo é `docs/sql-referencia/05_rls_policies.sql`), e o rodapé de versão
   está posicionado de forma diferente. **A divergência silenciosa que o CONST-1 previa já aconteceu.**

**Volumes** (para dimensionar, não para otimizar): 24 cursos · 29 turmas · 175 disciplinas ·
177 instrutores · 798 vínculos instrutor↔disciplina · ~1.753 registros de aula · 663 + 1 = 664
atividades não letivas (531 Estudo Individual · 62 AEC · 60 TAD · 11 TR) · 111 avaliações · 210 linhas de `turma_disciplina` · dezenas de usuários simultâneos no
máximo. **É uma base pequena: priorize clareza de schema e manutenibilidade sobre desempenho.**

### Decisões pendentes do Bernardo — não atropelar por suposição

| # | Decisão | Bloqueia |
|---|---|---|
| ~~**Hospedagem fora da infraestrutura da MB**~~ | ✅ **AUTORIZADA pela CIAARA-14.2 em 08/09/2026**, inclusive para **dado pessoal** — CPF, RG, telefone e endereço dos 177 instrutores migram em cheio (migration `20260908071000`). ⚠️ **Consequência que fica aberta:** a RLS do Épico 1 foi desenhada para dado FUNCIONAL, e hoje quem lê `instrutores` lê tudo. Não há recorte que permita ver posto e habilitação **sem** ver CPF e endereço — e é plausível que devesse haver. É desenho de segurança, portanto **Épico 3** | Nada. Era a única pendência capaz de bloquear a versão por razão não técnica |
| **CONST-1** | Constitution em dois endereços: consolidar ou manter espelho | Nenhum épico. Custo cresce a cada emenda |
| ~~**TURMA-1**~~ | ✅ **Fechada em 28/08/2026 — filtro de apresentação.** O domínio de status de turma fica com os quatro valores reais (`planejada`, `ativa`, `concluida`, `cancelada`); "Arquivada" é VIEW, **não** valor novo | — |
| ~~**Q1.b**~~ | ✅ **Fechada em 08/09/2026.** O cruzamento com as 7 planilhas de planejamento da v1.0 recuperou a UE de **901 dos 1.566** lançamentos; os demais ficam **nulos**, amparados pela catraca `reg_aula_ue_so_nula_no_historico`. Bernardo ratificou os nulos: *"o ETL deve ser o retrato fiel da origem, sem preenchimentos inventados"* | — |
| ~~**UE-PUB**~~ | ✅ **Fechada em 30/08/2026 — pode ser público.** O catálogo de UE (572 unidades, 2.446 subunidades, ementa de 134 disciplinas) fica legível por qualquer pessoa no repositório. Decisão de Bernardo, na mesma linha da abertura do repositório em 26/08. `scripts/etl/dados/` permanece versionado | — |
| **LIQ-3** | Papel titular/reserva na atribuição | Épico 11 |
| **LIQ-4** | Persistência da LIQ emitida | Épico 11 |

Quando uma dessas aparecer no caminho: **pergunte. Não assuma.** É o Princípio I.
