# Tasks: Bloco 3 — a página do curso em abas

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md` desta pasta.
**Tests**: pedidos (fluxo `/corrigir`: o teste que prova a mudança é escrito e **visto falhar antes**; e2e por clique).
**Regra do e2e:** `pnpm db:reset:limpo` antes; `.next` apagada antes do build; `--workers=2` se faltar memória.

## Phase 1: Setup

- [X] T001 Medir a linha de base: `pnpm test:unidade` sobre a `main` de partida e a impressão digital do esquema no banco local limpo (`scripts/provas/impressao_digital_do_esquema.sql`), registradas em `specs/018-bloco-3-pagina-do-curso-em-abas/progresso-implement.md`

## Phase 2: Foundational — as seis abas e o contrato

- [X] T002 Escrever primeiro, vendo falhar: `tests/unidade/contrato-de-parametros.test.ts` com `aba` de seis opções na ordem e os parâmetros `situacao`, `busca` e `aberta` em `/cursos/[curso]` (e a exceção nominal do `aberta` visual)
- [X] T003 `lib/navegacao/contrato.ts`: as seis opções de `aba` e os três parâmetros da aba Disciplinas
- [X] T004 `app/(app)/cursos/[curso]/AbasDoCurso.tsx`: seis abas na ordem (*Sobre o Curso · Grade · Disciplinas · Avaliações · Atividades · Horários*), cada painel por propriedade

## Phase 3: User Story 1 — as disciplinas dentro do curso (P1)

**Goal**: a aba Disciplinas com as funções de `/disciplinas` e *Nova disciplina*; o menu sem a entrada; `/disciplinas` redireciona.
**Independent Test**: *Cursos* → curso → *Disciplinas* → criar e editar, conferindo no banco.

- [X] T005 [US1] `app/(app)/disciplinas/GradeDeDisciplinas.tsx`: ler `situacao`, `busca` e `aberta` de `/cursos/[curso]`, sem a cascata de curso (o curso vem por propriedade); *Nova disciplina* para `disciplinas.criar`, com `paineis/FormularioDeDisciplina.tsx` em modo de criação
- [X] T006 [US1] `app/(app)/cursos/[curso]/AbaDisciplinas.tsx` (servidor) e a leitura condicionada a `aba === "disciplinas"` em `app/(app)/cursos/[curso]/page.tsx` (`lerGradeDeDisciplinas({ cursoCodigo, turmaCodigo: "" })`)
- [X] T007 [US1] `app/(app)/disciplinas/page.tsx` só redireciona (curso → aba; sem curso → `/cursos`; turma → a ficha); `app/(app)/disciplinas/CascataDeCursoETurma.tsx` aposentado se ficar sem uso
- [X] T008 [US1] O botão *Disciplinas* da aba Grade (`AbaGrade.tsx`) e `enderecoDasDisciplinas` (`lib/navegacao/endereco-de-turma.ts`) apontando para a aba do curso
- [X] T009 [US1] Revalidar a página do curso nas ações de disciplina, UE e itens do currículo (`lib/acoes/disciplina.ts`, `unidade-ensino.ts`, `itens-do-curriculo.ts`)
- [X] T010 [US1] Menu sem *Disciplinas* (`lib/navegacao/menu.ts`, o ícone em `components/casca/icones-do-menu.tsx`), com o registro datado em `specs/008-shell-e-estado-na-url/contracts/casca.md`; e os testes do menu (`tests/unidade/entrada-ativa.test.ts`, `tests/e2e/shell.spec.ts`) e a guarda `tests/unidade/toda-tela-tem-caminho.test.ts` (a rota que só redireciona fora da lista de telas)
- [X] T011 [US1] E2E por clique: o auxiliar `irAGradePorClique` de `tests/e2e/disciplinas.spec.ts` chegando pelo curso; um caso de *Nova disciplina* (banco); `avaliacoes-nas-telas.spec.ts` e `filtros-recolhidos.spec.ts` pelo curso; o redirecionamento

## Phase 4: User Story 2 — Avaliações só com o previsto (P1)

**Goal**: a aba Avaliações sem nada de turma.
**Independent Test**: curso com turma em andamento → aba *Avaliações* → nenhum elemento de turma.

- [X] T012 [US2] Escrever primeiro, vendo falhar: o caso de `tests/e2e/avaliacoes-nas-telas.spec.ts` (US5) e o de `tests/e2e/cards-levam-a-aba.spec.ts` que dependem do cumprido no curso, reescritos para *"nada de turma"*
- [X] T013 [US2] Leitura do previsto do curso (disciplinas, UEs e itens do currículo) e `app/(app)/cursos/[curso]/AbaAvaliacoes.tsx` desenhando `previstoDaDisciplina` por disciplina, com *Definir tempo* só do curso; `page.tsx` sem `lerAvaliacoesDoCurso`

## Phase 5: User Story 3 — regimes nomeados escolhidos pela turma (P1)

**Goal**: regimes do curso na aba Horários; a turma escolhe; DSA, alertas, cascata, dia parado e saldo usam o regime.
**Independent Test**: criar *Regime B — 9 TA*, escolher numa turma sem lançamento, ver 9 tempos no DSA; outra turma igual.

- [X] T014 [P] [US3] Escrever primeiro, vendo falhar: `tests/unidade/regime-da-turma.test.ts` (regime efetivo, TA do dia, rótulo, EAD ignora o regime)
- [X] T015 [US3] `lib/dominio/regime-da-turma.ts`
- [X] T016 [US3] A migration (`supabase migration new regimes_nomeados_por_curso`) conforme `contracts/migrations.md`
- [X] T017 [US3] `supabase/tests/142_regimes_nomeados.sql` (estrutura, imutáveis, guarda em uso, escolha travada, FK de outro curso, regime inativo, a view com regime de 9 TA — o caso que discrimina); e as enumerações de `010_estrutura.sql` e `105_curso_inativo.sql` com a tabela nova
- [X] T018 [US3] `pnpm db:tipos`
- [X] T019 [US3] RLS com sessão real em `tests/invariantes/rls/regimes-nomeados.test.ts`: Admin/Encarregado/Ajudante criam, editam e inativam; o **Operador** cria e edita e **não** inativa (o caso que discrimina); a Visualização não cria; a escolha da turma por quem edita turma; a escolha travada com lançamento; o curso fora de oferta recusa regime novo e edição (`42501`)
- [X] T020 [US3] `lib/validacao/regime-de-horario.ts` (Zod, com teste) e o campo `regime_de_horario_id` em `lib/validacao/turma.ts`
- [X] T021 [US3] `lib/acoes/regime-de-horario.ts` (criar, editar, inativar, reativar) e as frases das recusas novas em `lib/acoes/traducao-de-recusas.ts`
- [X] T022 [US3] O regime da turma no DSA: `app/(app)/turmas/[turma]/dsa/leitura.ts` e `consulta.ts` (`vigente = regimeDaTurma ?? excecao ?? padrao`, a configuração na leitura do catálogo, os TA declarados)
- [X] T023 [US3] `lib/acoes/regime-do-dia.ts` e o seu uso nos alertas e na cascata (`lib/acoes/dsa.ts`) e no dia parado (`lib/acoes/dia-parado.ts`)
- [X] T024 [US3] O regime efetivo no saldo: a ficha (`app/(app)/turmas/[turma]/page.tsx`), `/turmas` (`app/(app)/turmas/page.tsx`, `consulta.ts`) e `/inicio` (`app/(app)/inicio/page.tsx`, `panorama.ts`)
- [X] T025 [US3] `app/(app)/cursos/[curso]/AbaHorarios.tsx` com as folhas `RegimesDoCurso.tsx` e `FormularioDeRegime.tsx`, e as vigências do curso só para ler; o curso EAD (0 TA) dizendo que não tem tempos presenciais; as folhas em `tests/unidade/fronteira-das-telas.test.ts`
- [X] T026 [US3] O campo *Regime de horário* em `app/(app)/turmas/FormularioDeTurma.tsx` (os regimes ativos do curso, travado com lançamento, ausente em EAD pura), lido na ficha
- [X] T027 [US3] E2E por clique `tests/e2e/regimes-nomeados.spec.ts`: criar o regime na aba, escolher na turma, o DSA com 9 tempos e os horários; a outra turma igual; a recusa da troca com lançamento

## Phase 6: User Story 4 — a aba Atividades (P2)

- [X] T028 [US4] `app/(app)/cursos/[curso]/AbaAtividades.tsx` (os limites com a origem, a referência do Estudo Individual, *"o currículo não prevê"* do Apoio Individualizado, o catálogo de tipos por categoria); os limites saem de cima das abas e *"Turmas com teto excedido"* fica (`BlocoDeLimites.tsx`)
- [X] T029 [US4] E2E por clique: a aba com os limites e a origem (`tests/e2e/curso-abas.spec.ts`), e `tests/e2e/tetos-da-turma.spec.ts` lendo os limites na aba

## Phase 7: User Story 5 — a ordem das abas (P3)

- [X] T030 [US5] `tests/e2e/curso-pagina.spec.ts` e `tests/e2e/telas-acessiveis.spec.ts` com as seis abas na ordem; `tests/e2e/curso-abas.spec.ts` alcançando cada aba por clique

## Phase 8: Polish, prova e entrega

- [X] T031 Defeitos deliberados, cada um pego pela prova certa e desfeito, em `progresso-implement.md`: (a) a guarda do regime sem a trava de horário em uso → 142; (b) a guarda da turma sem a trava de lançamento → 142 e RLS; (c) a policy de criar aberta à Visualização → RLS; (d) o DSA ignorando o regime da turma → e2e; (e) a view dos dias parados sem o regime da turma → 142; (f) a aba Avaliações com o cumprido → e2e
- [X] T032 `specs/018-bloco-3-pagina-do-curso-em-abas/reversao.sql` e a prova numa base limpa: a impressão digital volta à da linha de base (T001)
- [X] T033 A impressão digital das views sobre a cópia do remoto, sem e com a migration (SC-009), em `plano-de-aplicacao-no-remoto.md`
- [ ] T034 `pnpm verificar:tudo` (ou `verificar` + pgTAP + RLS + o CI para a ponta a ponta, se a memória da máquina não deixar), registrado; reprovação instável isolada antes de ser chamada de instável
- [ ] T035 Push, PR com o template inteiro e CI verde nos três blocos
- [ ] T036 Rito do remoto (`plano-de-aplicacao-no-remoto.md`): backup citado, dry-run só com a migration, `supabase db push --linked`, conferência só de leitura (os dois retratos datados)
- [ ] T037 `roteiro-de-conferencia.md`, as pendências novas no plano de correções, e a entrega do `/corrigir` — **sem merge**

## Dependencies

- Phase 2 antes de todas as histórias (as abas e o contrato).
- US3: T014 → T015; T016 → T017/T018 → T019 → T020/T021 → T022–T026 → T027.
- US1, US2 e US4 são independentes entre si e da US3.
- Phase 8 depois de todas.

## Parallel

- T014 (unidade) em paralelo com o desenho da migration (T016).
- US1, US2 e US4 em paralelo com a US3 (arquivos diferentes), menos `page.tsx` do curso, que é compartilhado.

## Strategy

**Ordem de execução** (não a da numeração): Phase 2 → **US3** (a única com banco, primeiro, para o rito do remoto não
esperar a tela) → US1, US2 e US4 → US5 → Phase 8.
