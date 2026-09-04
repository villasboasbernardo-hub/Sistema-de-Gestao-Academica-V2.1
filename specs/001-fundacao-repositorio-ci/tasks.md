# Tasks: Épico 0 — Fundação: repositório, Next.js, Supabase, CI e tipos gerados

**Input**: Design documents from `specs/001-fundacao-repositorio-ci/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) ·
[data-model.md](./data-model.md) · [contracts/](./contracts/) · [quickstart.md](./quickstart.md)

**Tests**: **Obrigatórios.** A spec os exige nominalmente (FR-006, FR-011) e a *Definition of Done* do
`CLAUDE.md` os lista como itens 2 a 5. Não são opcionais nesta fatia.

**Revisão**: corrigido em 27/08/2026 após `/speckit-analyze` — dez achados aplicados. Ver
*Histórico de correções* no fim.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivo diferente, sem dependência pendente)
- **[Story]**: US1…US5, conforme `spec.md`
- Todo caminho de arquivo é relativo à raiz do repositório

## Ordem das fases — por que não é a ordem de prioridade

As cinco histórias são P1/P1/P1/P2/P2, mas **dependência manda mais que prioridade** aqui. O plano
impõe três frentes, e inverter a ordem transforma um problema de configuração num problema de git:

| Fase | Conteúdo | Frente | Precisa de rede? |
|---|---|---|---|
| 1–2 | Setup + Fundação | 1 | Não (só Docker local) |
| 3 · US3 | As duas fronteiras | 1 | Não |
| 4 · US1 | Ambiente reprodutível (artefatos) | 1 | Não |
| 5 · US4 | Contrato de dados (parte local) | 1 | Não |
| **6** | **Replantio do repositório** | **2** | Sim — e é a etapa irreversível |
| 7 · US2 | CI barra o merge | 3 | Sim |
| 8 · US5 | Preview por branch | 3 | Sim |
| 9 | Polimento e dívida documental | — | Parcial |

**US1 antes de US4, de propósito:** T029 **reescreve** o `README.md` e T031 **acrescenta** a ele.
Invertido, a reescrita apagaria o acréscimo.

**Regra dura:** nada da fase 6 começa antes de `pnpm verificar:tudo` estar verde (T033). O primeiro
push do repositório novo tem de ser um repositório saudável.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: o que falta na base antes de qualquer história

- [X] T001 Declarar `engines: { "node": ">=22" }` em `package.json` — hoje não declara (research R-2)
- [X] T002 [P] Criar `.gitattributes` com normalização de fim de linha, para que a verificação de formatação dê o mesmo resultado no Windows e no Linux do CI (FR-023)
- [X] T003 [P] Instalar e configurar Prettier em `.prettierrc` e `.prettierignore` — `format:check` é exigido pelo bloco `qualidade` (contracts/ci-contextos.md)
- [X] T004 Criar o esqueleto de diretórios: `lib/supabase/`, `lib/dominio/`, `lib/validacao/`, `lib/acoes/`, `lib/tipos/`, `tests/unidade/`, `tests/invariantes/rls/`, `tests/e2e/` (FR-019, plan.md §Project Structure)
- [X] T005 Ler `docs/BRIEF-v2.1.md` **integralmente** e registrar em `spec.md` §Pendências toda divergência com esta fatia — o BRIEF é precedência 2 e chegou depois da spec (plan.md, Constitution Check I)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: infraestrutura que **toda** história consome

**⚠️ CRÍTICO**: nenhuma história começa antes desta fase fechar

- [X] T006 Rodar `supabase init` e versionar `supabase/config.toml`; `supabase/migrations/` e `supabase/seed.sql` nascem **vazios** — o schema é o Épico 1 (FR-008, data-model.md §2)
- [X] T007 Provar que o banco local é descartável: `supabase start` seguido de `supabase db reset` reconstrói do zero sem passo manual (FR-008, invariante D-1)
- [X] T008 [P] Criar `lib/supabase/client.ts` — cliente de navegador com `@supabase/ssr` (FR-007)
- [X] T009 [P] Criar `lib/supabase/server.ts` — cliente de servidor lendo cookies do App Router (FR-007)
- [X] T010 [P] Criar `lib/supabase/middleware.ts` — renovação de sessão (FR-007)
- [X] T011 Criar `lib/supabase/admin.ts` com `import "server-only";` **na primeira linha** — segunda das três defesas contra vazamento da `service_role`, e a que quebra o build (FR-005, contracts/variaveis-ambiente.md V-3)
- [X] T012 Resolver as armadilhas de cookie/sessão do `@supabase/ssr` com o App Router **aqui**, e registrar a solução em comentário nos três clientes — o documento 06 manda resolver nesta fatia, não espalhado pelos épicos seguintes (FR-007)
- [X] T013 Instalar Vitest, `@vitest/coverage-v8` e Playwright/Chromium; configurar as quatro suítes com um teste trivial que passa em cada uma: `tests/unidade/`, `supabase/tests/`, `tests/invariantes/rls/`, `tests/e2e/` (FR-011)
- [X] T014 Escrever os 26 scripts em `package.json` — os 25 do documento 24 §7 **com os comentários** mais `verificar:tudo` (FR-012, FR-013, FR-014, contracts/comandos.md)
- [X] T015 Garantir que `next typegen` precede `tsc --noEmit` dentro de `verificar` — sem isso a checagem de tipos acusa `Cannot find name 'LayoutProps'` no Next 16 (research R-6, contracts/comandos.md)

---

## Phase 3: US3 — As duas fronteiras impostas por ferramenta (P1)

**Goal**: quem escreve regra de negócio é impedido de importar banco; quem escreve tela é impedido de
alcançar a chave administrativa. A tentativa falha na máquina de quem escreveu.

**Independent Test**: desligar cada regra de propósito e observar o teste **ficar vermelho**
(quickstart V-4). Se continuar verde, o teste não prova nada.

- [X] T016 [US3] Acrescentar a **fronteira 1** em `eslint.config.mjs`: `no-restricted-imports` proibindo `@supabase/*`, `@/lib/supabase/*`, `next/*`, `react` e `react-dom` dentro de `lib/dominio/**`, com mensagem citando o princípio violado (FR-004)
- [X] T017 [US3] Acrescentar a **fronteira 2** em `eslint.config.mjs`: `no-restricted-imports` proibindo `@/lib/supabase/admin` em todo `**/*.ts` e `**/*.tsx`, com mensagem apontando as Restrições Adicionais da constitution (FR-005)
- [X] T018 [P] [US3] Criar o fixture `tests/unidade/lint/fixtures/dominio-importa-supabase.ts`, que viola a fronteira 1 de propósito — insumo do teste que prova a regra ativa (FR-006, research R-4)
- [X] T019 [P] [US3] Criar o fixture `tests/unidade/lint/fixtures/cliente-importa-admin.tsx`, que viola a fronteira 2 de propósito — insumo do teste que prova a regra ativa (FR-006, research R-4)
- [X] T020 [US3] Isentar do lint do repositório, em `eslint.config.mjs`, **apenas** `tests/unidade/lint/fixtures/**` — nada além disso. **Sem a isenção `pnpm lint` fica vermelho para sempre; com isenção larga demais, a fronteira desliga em silêncio.** T021 falha se o alcance da isenção crescer (research R-4)
- [X] T021 [US3] Escrever `tests/unidade/lint/fronteiras.test.ts`, que executa o ESLint sobre cada fixture e **afirma a presença do erro** — nunca a ausência (FR-006)
- [X] T022 [US3] Provar as duas regras ativas seguindo `quickstart.md` V-4: comentar cada regra, ver o teste vermelho, descomentar, ver verde. Registrar no PR que a prova foi feita (SC-004)
- [X] T023 [US3] Criar `lib/dominio/.gitkeep` e confirmar que o diretório termina a fatia **vazio** — a fronteira existe antes de haver o que proteger (FR-004, SC-007)

---

## Phase 4: US1 — Máquina limpa vira ambiente seguindo só o README (P1)

**Goal**: quem chega clona, lê só o README, e em minutos tem a aplicação no ar.

**Independent Test**: clonar numa pasta nova e seguir o README à risca (quickstart V-1). **A prova
final é T056**, depois do replantio — só faz sentido clonar de um repositório que existe.

- [X] T024 [P] [US1] Criar `app/error.tsx` — falha de leitura degrada com aviso, nunca exceção não tratada (FR-019, `RN-DEG-01`)
- [X] T025 [P] [US1] Criar `app/loading.tsx` (FR-019)
- [X] T026 [P] [US1] Criar `app/not-found.tsx` (FR-019)
- [X] T027 [US1] Implementar validação das variáveis de ambiente na inicialização, com aviso legível dizendo **qual** falta — sem exceção não tratada e sem tela branca (FR-003, quickstart V-3)
- [X] T028 [US1] Reconferir `.env.local.example` contra `contracts/variaveis-ambiente.md`: toda variável listada, com comentário, **zero** segredo real (FR-002, SC-002)
- [X] T029 [US1] **Reescrever** `README.md` como o **contrato do SC-001**: pré-requisitos, clone, `pnpm install`, cópia do arquivo de exemplo, `pnpm db:start`, `pnpm dev` — e nada que exija consultar outra fonte. **É a única tarefa que reescreve o arquivo**; T031, T037 e T047 só acrescentam (FR-001)

---

## Phase 5: US4 — O contrato de dados é gerado, nunca digitado (P2)

**Goal**: `lib/tipos/database.ts` sai do banco por comando documentado; ninguém digita nome de coluna.

**Independent Test**: alterar o schema local, **não** regenerar, e observar a reprovação
(quickstart V-5). O portão de CI vem em T042.

- [X] T030 [US4] Gerar `lib/tipos/database.ts` com `pnpm db:tipos` contra o banco local e commitá-lo — nasce praticamente vazio, porque o schema é do Épico 1, **e isso é o correto** (FR-009, data-model.md §3)
- [X] T031 [US4] **Acrescentar** a `README.md` — sem reescrevê-lo, T029 já o fez — que `lib/tipos/database.ts` é **gerado**, que ninguém o edita à mão, e que `pnpm db:tipos` roda depois de **toda** migration (FR-009, risco R-04)
- [X] T032 [US4] Provar localmente a sequência do portão: `pnpm db:reset && pnpm db:tipos && git diff --exit-code lib/tipos/database.ts` sai 0 (FR-010, research R-3)

---

## Phase 6: Replantio do repositório (bloqueia US2 e US5)

**Purpose**: mover a v2.1 para repositório próprio, preservando a trilha. **É a única etapa
irreversível na prática.**

**⚠️ Portão de entrada**: T033 é obrigatório. Não começar com a base vermelha.

- [ ] T033 Rodar `time pnpm verificar` e `pnpm verificar:tudo` e confirmar **os dois verdes** antes de tocar em git; registrar o tempo de `verificar` e confirmar que fica **abaixo de 5 minutos** (SC-008, plan.md §Summary)
- [ ] T034 No repositório `SIS11`, gerar a branch com a raiz correta: `git subtree split --prefix=Versao_2.1_NextJS -b replantio-v2.1` — verificado em teste seco em 27/08/2026 (research R-1)
- [ ] T035 Mover a cópia de trabalho para fora do worktree do `SIS11`, para `OneDrive/Documentos/CIAARA-11-v2.1` — **não** criar repositório aninhado (FR-021.1)
- [ ] T036 `git init` no destino, `git remote add origin https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1.git`, trazer `replantio-v2.1` e empurrar para `main` (FR-021)
- [ ] T037 **Acrescentar** a `README.md` a correspondência de SHA — `d19ab10` → novo, `d31bd56` → novo — porque `subtree split` preserva mensagem, autor e data mas **gera commits novos**; os originais ficam intactos no `SIS11` (FR-021.2, plan.md reavaliação item 1)
- [ ] T038 Provar cópia única: o caminho antigo não responde mais como projeto ativo e `git status` no `SIS11` não acusa a árvore da v2.1 como modificada (FR-021.3)

---

## Phase 7: US2 — O CI dá o veredito, e o veredito barra o merge (P1)

**Goal**: quem abre PR recebe veredito automático; quem revisa não confere à mão o que a máquina
confere melhor.

**Independent Test**: abrir PR descartável com defeito deliberado e observar o merge **bloqueado**
(quickstart V-7).

> **Estado em 03/09/2026 — ler antes de marcar mais nada.** O arquivo
> `.github/workflows/ci.yml` **existe, com os três contextos**, e **nunca foi executado**: não há
> remote configurado (o replantio, fase 6, não aconteceu) e o token ainda não tem o escopo `workflow`.
> As tarefas de **escrita** estão feitas; as de **prova** — T042, T048, T049 — continuam abertas, e são
> elas que valem, porque este projeto exige prova e não declaração (Princípio VI). Conferido nesta
> máquina: `pnpm lint --max-warnings=0` sai 0 e `CI=true pnpm test:e2e` fica verde (1 passou, 2 puladas,
> 50,1 s). O bloco `banco` **não** foi executado localmente.

- [ ] T039 [US2] **Pré-requisito humano, do Bernardo**: `gh auth refresh -s workflow`. Sem esse escopo o push de `.github/workflows/ci.yml` é **recusado**; os escopos atuais são `gist`, `read:org`, `repo` (FR-014, research R-5). **Continua aberto:** o escopo trava o push, não a escrita — o arquivo foi criado sem ele
- [X] T040 [US2] Criar `.github/workflows/ci.yml` com o job **`qualidade`**: `next typegen` → `tsc --noEmit` → `eslint --max-warnings=0` → `prettier --check` → `vitest run tests/unidade` (FR-014, contracts/ci-contextos.md). **`--max-warnings=0` acrescentado em 03/09/2026**: sem a flag o ESLint sai 0 com aviso, e a DoD exige "sem aviso novo"
- [X] T041 [US2] Acrescentar o job **`banco`** em `.github/workflows/ci.yml`: `supabase start` → `db reset` → `db:tipos` → `git diff --exit-code lib/tipos/database.ts` → `supabase test db` → `vitest run tests/invariantes/rls` (FR-014)
- [ ] T042 [US2] Confirmar que o passo de `git diff --exit-code` do job `banco` reprova quando o contrato de dados está desatualizado — **é o portão do FR-010, que serve US4** (FR-010, quickstart V-5)
- [X] T043 [US2] Acrescentar o job **`build`** em `.github/workflows/ci.yml`: `next build` — é o único bloco que pega erro de fronteira servidor/cliente (FR-005, FR-014) — **e, desde 03/09/2026, a suíte de ponta a ponta**: `playwright install --with-deps chromium` → `pnpm test:e2e`. Nenhum contexto do CI a executava, contra o SC-003 e o FR-013 (achado CHK011/CHK012 de `checklists/entrega.md`; decisão de Bernardo por acrescentá-la ao `build` em vez de criar um quarto contexto — ver `contracts/ci-contextos.md`, invariante CI-7)
- [X] T044 [US2] Fixar em `.github/workflows/ci.yml` a versão da CLI do Supabase e Node **22**; CLI sem versão fixada é a causa nº 1 de o bloco `banco` falhar na primeira execução (invariantes CI-3 e CI-4). **Nota:** o Node 22 exigiu `actions/setup-node@v4` nos três jobs — o `pnpm/action-setup@v4` instala o pnpm, **não** fixa o Node
- [ ] T045 [US2] Configurar a proteção da branch `main` com o comando de `contracts/ci-contextos.md` — revisão aprovada, verificações estritas e os três contextos exigidos. **Depois de T040–T044, antes do primeiro PR** (FR-014.1)
- [ ] T046 [US2] Ligar varredura de segredos e **proteção de push** no repositório — verificado em 27/08/2026: as duas estão `disabled`, e o repositório é público desde 26/08 (FR-002.1)
- [ ] T047 [US2] **Acrescentar** a `README.md` o procedimento para segredo vazado: **rotacionar a chave**, não apagar o commit — em repositório público, remover história não desfaz a exposição (FR-002.2)
- [ ] T048 [US2] Provar o bloqueio quebrando o CI de propósito, com commit descartável, nas **quatro** formas: erro de tipo, aviso de lint, teste de unidade e ponta a ponta. Apagar a branch depois (FR-015, SC-003, quickstart V-7)
- [ ] T049 [US2] Provar a coincidência local × CI: rodar `pnpm verificar:tudo` e o CI **sobre o mesmo commit**, nos casos de T048, e confirmar veredito **idêntico**. Divergência é defeito da verificação, vira tarefa de correção — não se aceita como azar (SC-005, contracts/comandos.md)

---

## Phase 8: US5 — Toda branch tem uma URL que o Bernardo pode abrir (P2)

**Goal**: push em branch gera endereço próprio com a mudança rodando, antes de qualquer merge.

**Independent Test**: push numa branch, abrir a URL, ver a aplicação (quickstart V-8).

- [ ] T050 [US5] Rodar `vercel link` apontando para o projeto da v2.1 (FR-016)
- [ ] T051 [US5] Cadastrar no escopo **Preview** da Vercel as variáveis de `contracts/variaveis-ambiente.md`, apontando para `cqhpfuaweoyglhtrckcp` com `NEXT_PUBLIC_AMBIENTE="preview"` (FR-016, FR-022.1, research R-7)
- [ ] T052 [US5] Confirmar por `vercel env ls` que o escopo **Production** está **sem** variáveis de Supabase — a ausência **é** a garantia do FR-022, porque não há produção nesta fatia (FR-016.1, invariante A-3)
- [ ] T053 [US5] Conferir, na pré-visualização no ar, que `NEXT_PUBLIC_AMBIENTE` **corresponde** ao projeto Supabase realmente apontado — conferir, não presumir. Repetir a conferência para `.env.local` (FR-022.2, invariante A-1)
- [ ] T054 [US5] Implementar a faixa de ambiente lendo `NEXT_PUBLIC_AMBIENTE`, visível em `local` e `preview`, para que ninguém registre aula de verdade achando que está em homologação (FR-017)
- [ ] T055 [US5] Provar a atomicidade da implantação: forçar um deploy que falhe (por exemplo, um erro de build deliberado em branch de teste) e confirmar que **o ambiente anterior permanece no ar** — implantação parcial deixa de ser um estado possível (FR-018, `RF-MOD-04` revogado)
- [ ] T056 [US5] **Bernardo abre a URL de pré-visualização e confere** — o SC-006 é critério com pessoa e nome, de propósito; sem isso não está cumprido

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: fechar as provas que só fazem sentido no fim, e pagar a dívida documental que esta fatia
abriu

- [ ] T057 [US1] Executar `quickstart.md` V-1 **de verdade**, numa pasta nova: clonar, seguir **só** o README, chegar à aplicação no ar em menos de 15 minutos, com zero perguntas a outra pessoa (SC-001)
- [ ] T058 Executar `quickstart.md` V-9 e provar a contenção de escopo: `lib/dominio/` vazia, zero tabelas de negócio, zero ambiente de produção da v2.1 (SC-007, FR-020)
- [ ] T059 [P] Aplicar a pendência **D-7** em `docs/fase-2/24-Estrutura-do-Repositorio-e-Convencoes.md` §7: acrescentar `verificar:tudo` com o comentário explicando por que são dois comandos (FR-013.1)
- [ ] T060 [P] Aplicar a pendência **D-8** em `CLAUDE.md`, *Definition of Done*: passaram a ser dois comandos, com promessas diferentes (FR-013.1)
- [ ] T061 [P] Aplicar a pendência **D-1** em `docs/fase-1/06-Backlog-de-Epicos-V2.1.md`, Épico 0: o critério de aceite 1 diz `npm install` / `npm run dev`; a decisão de 26/08/2026 é `pnpm` (FR-001)
- [ ] T062 Atualizar o *Estado atual* do `CLAUDE.md`: Épico 0 fechado, caminho novo do repositório, e o que o Épico 1 herda — é a primeira coisa que o agente lê numa sessão nova (Princípio VIII)

---

## Dependencies

```text
Fase 1 (T001–T005)
   └─> Fase 2 (T006–T015)   ← portão: nenhuma história antes daqui
          ├─> Fase 3 · US3 (T016–T023)   ─┐
          ├─> Fase 4 · US1 (T024–T029)   ─┤ frente 1, sem rede
          └─> Fase 5 · US4 (T030–T032)   ─┘  (T031 depende de T029)
                 └─> Fase 6 · Replantio (T033–T038)   ← T033 é portão duro
                        ├─> Fase 7 · US2 (T039–T049)
                        │        └─> T057 (clone limpo, fecha US1)
                        └─> Fase 8 · US5 (T050–T056)
                                 └─> Fase 9 (T058–T062)
```

**Dependências finas que não aparecem no desenho:**

- **T029 é a única tarefa que reescreve `README.md`.** T031, T037 e T047 **acrescentam**. Inverter a
  ordem apaga trabalho — foi o achado F1 do `/speckit-analyze`.
- **T042 serve US4**, não US2: é o portão do FR-010. Está na fase 7 porque vive no arquivo do CI.
- **T039 é humano e interativo.** Se não estiver feito, T040–T044 ficam prontos localmente mas não
  podem ser empurrados. Não bloqueia as fases 1 a 6.
- **T020 tem risco embutido**: isentar além de `fixtures/**` desliga a fronteira em silêncio, e é T021
  que percebe.
- **T045 depende de T040–T044** — a proteção referencia os jobs pelo nome, e nome que não existe é
  contexto que nunca é exigido (invariante CI-1).
- **T049 depende de T048**: só há o que comparar depois de o CI ter reprovado alguma coisa.

---

## Parallel Execution Examples

**Fase 2 — os quatro clientes de acesso a dados:**

```
T008 lib/supabase/client.ts      ─┐
T009 lib/supabase/server.ts      ─┤ arquivos distintos, sem dependência mútua
T010 lib/supabase/middleware.ts  ─┘
T011 lib/supabase/admin.ts        ← faça depois: T012 depende de decidir a estratégia de cookie
```

**Fase 3 — os dois fixtures:**

```
T018 fixtures/dominio-importa-supabase.ts   ─┬─ depois T020 (isenção) e T021 (o teste)
T019 fixtures/cliente-importa-admin.tsx     ─┘
```

**Fase 4 — os três segmentos de degradação:**

```
T024 app/error.tsx  ·  T025 app/loading.tsx  ·  T026 app/not-found.tsx
```

**Fase 9 — a dívida documental:** T059, T060 e T061 tocam arquivos diferentes e rodam juntas.

**Fases 3, 4 e 5** podem correr em paralelo depois da fase 2, **com uma exceção**: T031 (fase 5)
depende de T029 (fase 4), porque os dois escrevem no `README.md`.

---

## Implementation Strategy

### MVP — a menor coisa que entrega valor sozinha

**Fases 1, 2 e 3 (T001–T023).** Ao fim delas o repositório tem as duas fronteiras arquiteturais
instaladas **e provadas**, a camada de acesso a dados resolvida com as armadilhas de sessão já pagas,
e as quatro suítes rodando. Nada disso depende de rede, credencial ou decisão de terceiro — e é o que
protege os treze épicos seguintes.

É o MVP porque as fronteiras são o item de maior valor por unidade de esforço desta fatia: instalá-las
antes de `lib/dominio/` ter conteúdo custa horas; instalá-las depois custa uma negociação por import
indevido já escrito.

### Entrega incremental

| Incremento | Fases | Entrega |
|---|---|---|
| 1 | 1–3 | Fronteiras provadas, acesso a dados resolvido, suítes de pé |
| 2 | 4–5 | Ambiente reprodutível documentado, contrato de dados gerado |
| 3 | 6 | Repositório próprio, com a trilha preservada |
| 4 | 7 | CI barrando merge — o portão mecânico |
| 5 | 8–9 | Preview por branch, provas finais, dívida documental paga |

**Onde parar, se for preciso parar:** ao fim do incremento 3. O repositório estará saudável, próprio e
com tudo provado localmente; falta o portão automático, que a regra escrita no `CLAUDE.md` supre
temporariamente. Parar antes do incremento 3 deixa a v2.1 dentro do repositório errado, que é a única
situação pior que a de hoje.

---

## Histórico de correções — `/speckit-analyze` de 27/08/2026

| Achado | Severidade | O que mudou |
|---|---|---|
| **F1** | CRITICAL | US1 e US4 trocaram de fase. T029 é agora a **única** tarefa que reescreve `README.md`; T031, T037 e T047 acrescentam. Antes, a reescrita vinha depois do acréscimo e o apagava |
| **E1** | HIGH | **T055 é nova** — FR-018 (implantação atômica) não tinha tarefa nenhuma |
| **E2** | HIGH | **T049 é nova** — SC-005 (veredito local = CI) não era provado; T033 roda antes de o CI existir |
| **E3** | HIGH | T033 passou a **medir** `time pnpm verificar` contra o teto de 5 minutos (SC-008) |
| **E4** | MEDIUM | **T053 é nova** — FR-022.2 exige conferir a correspondência rótulo ↔ projeto, e nenhuma tarefa conferia |
| **C1** | MEDIUM | T018, T019, T050 e T062 ganharam citação de origem (Princípio VIII) |
| **F2 · F3 · U1 · A1** | LOW/MEDIUM | Aplicados em `plan.md` (Node fixado), `spec.md` (terminologia e FR-019 delimitado) e T020 (isenção com alcance verificável) |

**Cobertura após as correções:** 41 de 41 requisitos com ≥1 tarefa. Zero lacunas.

---

## Phase 10: Convergence

**Origem**: `/speckit-converge` de 27/08/2026, após o `/speckit-implement` das fases 1 a 5.
Avaliação do código real contra spec, plan e constitution. **Zero achados `missing`** — as fases 6 a 9
seguem pendentes e não são repetidas aqui.

- [X] T063 **CRITICAL** — Reescrever `AGENTS.md` em português do Brasil, ou removê-lo com decisão registrada: hoje tem 9 linhas geradas pelo Next.js, em inglês, começando por "This is NOT the Next.js you know". O documento 06 lista `AGENTS.md` na linha *Governança* do escopo do Épico 0 per Constitution · Restrições Adicionais → Idioma (contradicts). **Resolvido em 03/09/2026 por uma terceira via: nem traduzir, nem remover.** O bloco em inglês é gerado e **reescrito a cada `pnpm dev`** pelo próprio Next (`node_modules/next/dist/server/lib/generate-agent-files.js`), entre os marcadores `<!-- BEGIN/END:nextjs-agent-rules -->` — traduzi-lo deixaria a árvore suja para sempre. O conteúdo do projeto foi escrito **fora dos marcadores**, em português, com os papéis e limites que o documento 24 §linha 131 especifica ("papéis e limites dos agentes"). **Verificado:** `pnpm dev` rodou e o arquivo saiu byte a byte idêntico
- [ ] T064 Commitar `lib/tipos/database.ts` e **reexecutar** `pnpm db:tipos:conferir`, confirmando que o portão reprova de verdade: arquivo não rastreado é invisível a `git diff --exit-code`, e T032 passou por vacuidade per FR-010 (partial)
- [ ] T065 Registrar em `specs/001-fundacao-repositorio-ci/spec.md` §Pendências a dívida de estilo: `app/error.tsx`, `app/loading.tsx`, `app/not-found.tsx` e `components/faixa-de-ambiente.tsx` usam `style={{}}` com cores literais (`#f4f4f5`, `#1e3a8a`, `#9a3412`) em vez de tokens `@theme`. Os tokens são do Épico 4 — a dívida entra como item de entrada dele per plan: Tailwind v4 · CLAUDE.md (contradicts)
- [ ] T066 Reconciliar a migração `middleware.ts` → `proxy.ts` nos artefatos: `spec.md`, `plan.md` §Project Structure e `contracts/` ainda dizem "middleware". A migração foi feita porque o Next 16 depreciou a convenção e avisava a cada build; **nenhuma tarefa a pedia** per plan: estrutura de arquivos (unrequested)
- [ ] T067 Atualizar `specs/001-fundacao-repositorio-ci/contracts/comandos.md`: declara **26** scripts, o `package.json` tem **28** — `typegen` (o CI precisa dele isolado) e `db:tipos:conferir` (o portão do FR-010) per contracts/comandos.md (partial)
- [ ] T068 Registrar em FR-012 e em `contracts/comandos.md` que "com os comentários" foi satisfeito pela chave irmã `scriptsComentarios` no `package.json`, porque JSON não aceita comentário — a forma adotada não está escrita em lugar nenhum per FR-012 (partial)
- [X] T069 Isolar `tests/unidade/lint/fixtures/**` do `include` do `tsconfig.json`: os fixtures violam as fronteiras de propósito e hoje só passam no `tsc` porque violam apenas o **lint**; um fixture futuro que viole o **tipo** quebraria a checagem de tipos do repositório per research R-4 (partial). **Feito em 03/09/2026** por `exclude`, não por mudança no `include` — mesmo efeito, uma linha. **Não quebra a prova das fronteiras (T021):** o ESLint deste repositório não é type-aware, e `fronteiras.test.ts` linta os fixtures por `lintText` com **caminho virtual** (`lib/dominio/_fixture-fronteira-1.ts`), nunca pelo caminho real — conferido antes de mexer. `pnpm verificar` verde, 12 testes de unidade passando
- [ ] T070 Registrar a justificativa da reescrita de `app/page.tsx` e `app/layout.tsx`: o scaffold trazia `lang="en"` e o título "Create Next App", contra o princípio do Idioma, e T027 precisava de uma superfície onde mostrar o aviso de configuração. Nenhuma tarefa a pedia per Constitution · Idioma (unrequested)
- [ ] T071 Registrar a justificativa da ampliação de `.prettierignore` (`.claude/`, `ferramentas/`, `CLAUDE.md`, `AGENTS.md`, artefatos de teste) e de `.gitignore`: `pnpm format` reformatou as 10 `SKILL.md` do Spec Kit e `ferramentas/dicionario-traducao/README.md`, revertidos em seguida per plan: qualidade (unrequested)
- [ ] T072 Reconciliar T054 com o código: a faixa de ambiente **já está implementada** em `components/faixa-de-ambiente.tsx`, entregue na fase 4 porque `app/layout.tsx` seria tocado duas vezes; a tarefa continua na fase 8 e desmarcada per FR-017 (partial)
