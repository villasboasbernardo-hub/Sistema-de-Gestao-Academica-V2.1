# Tasks: Bloco 2 — turmas e o DSA no papel

**Input**: `specs/017-bloco-2-turmas-e-dsa/` — spec.md (US1–US6), plan.md, research.md (R-1–R-12), data-model.md,
contracts/migrations.md (M1–M4), contracts/telas.md, quickstart.md, plano-de-aplicacao-no-remoto.md.

**Um PR só** (pedido de 19/10/2026), ramo `feat/BLOCO-2-turmas-e-dsa-no-papel`. Testes são **pedidos** (DoD do
`CLAUDE.md`): cada teste que prova a mudança é escrito e **visto reprovar antes**. Antes de **todo** e2e:
`pnpm db:reset:limpo`. Antes de todo build: apagar `.next` (OneDrive). `--workers=2` se faltar memória.

**Emendado pelo analyze de 19/10/2026** (os 70 achados; as decisões novas são a C-22 a C-30 da spec). Toda amostra que
**arquiva** é idempotente (regra 9.1): o arquivamento é imutável, então cada execução usa turma de amostra nova
(rótulo gerado, nunca fixo) ou termina desarquivando pelo Admin antes da limpeza.

**Formato:** `- [ ] [ID] [P?] [Story?] Descrição com o arquivo`.

---

## Phase 1: Setup — a linha de base

- [X] T001 Medir a linha de base do ramo: `pnpm verificar` sai 0 sobre `c1f8d65` mais os commits de docs, registrando a contagem de unidade em `specs/017-bloco-2-turmas-e-dsa/progresso-implement.md` (com o artefato de cada número)
- [X] T002 Registrar em `progresso-implement.md` as medições na cópia `remoto-20261019-024230.sql` restaurada no local (turmas por situação, sem janela, sem instrutor — em turmas e em linhas —, iniciando em 30 dias, nomes ativos por tamanho, a `PEND-016-5` com 0 fato de CHD ativo sem posição que some TA), com a consulta e o banco de cada uma; e versionar os 172 nomes ativos como a fixture `tests/unidade/dados/disciplinas-ativas-2026-10-19.txt` (o conjunto do SC-008)

---

## Phase 2: Foundational — as migrations que acrescentam, os tipos e as obrigações (bloqueia todas as histórias)

- [X] T003 Gerar M1 com `supabase migration new ta_fora_do_dsa_e_execucao` e escrever `supabase/migrations/<carimbo>_ta_fora_do_dsa_e_execucao.sql` conforme `contracts/migrations.md` §M1: sequência e função `TFD-`, tabela `ta_fora_do_dsa` com guarda (o registro inteiro por `to_jsonb`, menos `status`/`editado_por`/`editado_em`), auditoria, RLS (`turma_em_oferta` nas **duas** policies de escrita, C-29) e revoke, recurso `ta_fora_do_dsa` na matriz, `disciplinas.nome_no_dsa` (teto 60), e as três views da CHD recriadas com o ramo `fora_do_dsa` e as colunas novas **no fim** (`vw_carga_horaria_turma` e `vw_disciplinas_execucao` copiadas de `20261016092307` com só a diferença do contrato; `vw_chd_por_fato` de `20261019035107` com `sem_posicao`)
- [X] T004 Gerar M2 (`supabase migration new historico_e_arquivamento_da_turma`) e escrever conforme §M2: `turma_trocas_de_situacao` (imutável, sem FK, índice `(turma_id, ordem desc)`), `app.anotar_troca_de_situacao` + gatilho `AFTER UPDATE OF status` em `turmas` — ⚠️ o corpo **não contém `raise` em lugar nenhum, nem em comentário** (o pgTAP 101 lê o `prosrc` com comentário e o corpo tem `status`) —, `public.trocar_situacao_da_turma`, `turma_arquivamentos` (índice `(turma_id, ordem desc)`, policies de criação por ação, gatilho que carimba autor/instante e confere a turma e a sequência, imutável), `app.turma_arquivada` (`security definer`, com `revoke`/`grant`) e `vw_turmas_arquivadas`; `revoke all … from public, anon, authenticated` em toda função de gatilho
- [X] T005 Gerar M3 (`supabase migration new painel_de_turmas`) e escrever conforme §M3: o parâmetro `turmas.aviso_inicio_dias` = 30 e `public.ocupacao_para_conflitos(p_de, p_ate)` (`SECURITY DEFINER`, porteiro `coalesce … is not true`, janela ≤ 7 dias **e nula recusada**, da ocupação alheia só a linha que **cruza** uma alcançada, anônima e com `local` nulo — C-16 emendada)
- [X] T006 Aplicar no local (`pnpm db:reset:limpo`), rodar `pnpm db:tipos`, conferir no tipo gerado as colunas e funções novas, e `git add lib/tipos/database.ts`
- [X] T007 [P] Escrever `supabase/tests/137_ta_fora_do_dsa.sql`: estrutura (colunas, `CHECK`s, `security_invoker` nas três views, colunas antigas iguais e na mesma ordem), `disciplinas.nome_no_dsa` **nulável**, com o `CHECK` de 1 a 60 e `'   '` recusado; o guarda (linha divergente, linha inativa, só desfaz, **desfazer trocando `codigo` recusado**); **zero** linhas de `ta_fora_do_dsa` cuja turma ou disciplina difira da de `turma_disciplina` (P-1); o ramo nas três somas com uma linha plantada (`chd_da_turma_ate`, `execucao_por_disciplina_ate`, `vw_carga_horaria_turma.chd_executada`, `vw_disciplinas_execucao.ta_executados`), a guarda do 135 ainda batendo com a linha, **`vw_ocupacao_ta` sem linha nova** e **`vw_instrutor_carga_anual` igual** (FR-001.6, FR-001.8); `sem_posicao` (aula sem `ta_inicial` = true; com = false; fora = true); recurso na matriz para o trio; revoke; zero policy de `DELETE`; e a varredura de relógio (`current_date`/`now()`/`current_timestamp`/`localtimestamp`) sobre as funções novas da M1, lidas **sem comentário** (regra 9.1.1)
- [X] T008 [P] Escrever `supabase/tests/138_historico_e_arquivamento.sql`: o gatilho anota toda troca (por `update` direto e pela função, com e sem observação), não anota quando não muda, **`insert` em `turmas` não gera linha na trilha** (FR-003.5), a trilha e o arquivamento recusam `UPDATE`/`DELETE`/`TRUNCATE` (inclusive dono), a sequência do arquivamento (arquivar 2× e desarquivar sem estar recusados com o *hint*; turma inexistente → `23503` `turma_inexistente`), **arquivar não altera `turmas.status`** (FR-004.2), a arquivada **continua contando** no limite de turmas por ano e no veto de inativar curso (FR-004.7), `app.turma_arquivada` e a view, a guarda de ausência do pgTAP 101 ainda zero, e a varredura de relógio sobre as funções novas da M2 lidas sem comentário, com a **isenção nominal e comentada** do `now()` de `app.carimbar_arquivamento()` (*"instante, não data de fato"*, D20)
- [X] T009 [P] Escrever `supabase/tests/139_painel_de_turmas.sql`: o parâmetro presente e operacional; `ocupacao_para_conflitos` recusa sem sessão (`42501`, gotcha 15), recusa janela > 7 dias **e janela com `p_de` ou `p_ate` nulo** (`22023`, a forma do gotcha 15), `stable`, sem valor padrão e sem relógio do servidor no corpo (lido sem comentário)
- [X] T010 Rodar `pnpm test:invariantes` e ver 137–139 passarem e os 56 anteriores continuarem verdes (depois da T010.1)
- [X] T010.1 As duas guardas que as tabelas novas tocam — **já feito pela sessão principal em 19/10/2026, junto das migrations**: (a) emendar `docs/BRIEF-v2.1.md` §2.1 (só o `.md`, registrando que o `.docx` não recebeu a emenda) com `ta_fora_do_dsa`, `turma_trocas_de_situacao` e `turma_arquivamentos`, e **depois** acrescentar as três ao `set_eq` de `supabase/tests/010_estrutura.sql`, com o comentário *REGRA DOS VALORES ESPERADOS: (a)* e a citação da spec 017; (b) emendar `supabase/tests/105_curso_inativo.sql`: `('ta_fora_do_dsa', 'turma_em_oferta')` em `_protegidas` e 42 → 44 policies em 22 tabelas, com a mesma regra; a emenda do BRIEF vai no lote final para Bernardo
- [X] T011 [P] Acrescentar `TFD-` (e a `SAP-` que faltava) às obrigações de sequência: `scripts/etl/carregar.py` (`SEQUENCIAS_DE_CODIGO`) e `lib/acoes/traducao-de-recusas.ts` (`NUMERACAO_INTERNA`), e as frases dos *hints* novos (`ta_fora_linha_divergente`, `ta_fora_linha_inativa`, `ta_fora_so_desfaz`, `turma_fora_do_alcance`, `turma_inexistente`, `turma_ja_arquivada`, `turma_nao_arquivada`, `janela_de_uma_semana`) — `tests/unidade/recusas-cobrem-o-banco.test.ts` e `sequencias-apos-restaurar.test.ts` verdes
- [X] T012 [P] Escrever `tests/invariantes/rls/bloco-2.test.ts` com sessão real, toda negativa mandando a linha completa e conferindo o código: **TA fora do DSA** — Admin, Encarregado e Ajudante gravam; **cada** perfil fora do trio recebe `42501` ao gravar; o Operador **desfaz** e o caso mede **zero linhas** e o status `ativo` **lido de volta no banco** (não `error`, gotcha 4); um desfaz do trio que muda a quantidade → `23514`; desfazer em turma de curso inativo recusado (C-29); `anon` recusado; **leitura** — `visualizacao` lê `ta_fora_do_dsa`, `turma_trocas_de_situacao` e `turma_arquivamentos` da turma; o Encarregado de Curso lê **zero** linhas dessas três e de `vw_turmas_arquivadas` em turma fora do alcance, medido pelo tamanho da lista, com **controle positivo** na alcançada; **arquivamento** — Operador arquiva; Operador, **Encarregado e Ajudante** recebem `42501` ao desarquivar; Admin desarquiva; o Encarregado de Curso recebe `42501` ao arquivar turma fora do alcance; ninguém escreve na trilha direto; `visualizacao` em `trocar_situacao_da_turma` → `42501` com *hint* `turma_fora_do_alcance`; **ocupação** — `ocupacao_para_conflitos` devolve a linha alheia que cruza, com `turma_id` nulo, e **não** devolve a linha alheia da mesma semana sem cruzamento (o caso que discrimina da C-16 emendada); amostra idempotente (turma nova por execução ou desarquivada no fim)
- [X] T013 Commit `db(BLOCO-2): …` das três migrations, dos tipos e das provas
- [X] T013.1 Criar `lib/acoes/turma-arquivada.ts` — **já feito em 19/10/2026, antes da T017** (achado 13): `recusaSeTurmaArquivada(supabase, turmaId)` e `recusaSeTurmaArquivadaPeloCodigo`, lendo `vw_turmas_arquivadas` com a sessão de quem grava, **sem `"use server"`** (não é endpoint), e **recusando também quando a leitura falha**; a frase vem de `lib/dominio/arquivamento-da-turma.ts` (`RECUSA_DA_TURMA_ARQUIVADA`)

---

## Phase 3: User Story 1 — TA fora do DSA, e a `PEND-016-5` (Priority: P1) 🎯

**Goal**: registrar TA fora do DSA por disciplina da turma, somando em toda execução e no DSA, e o DSA somando o sem posição.
**Independent Test**: registrar 5 TA numa disciplina da semente e conferir `/inicio`, `/turmas`, ficha e DSA por clique.

- [X] T014 [P] [US1] Escrever `tests/unidade/ta-fora-do-dsa.test.ts` (reprovando antes): a execução separada (*"45 TA executados · 40 no DSA · 5 fora do DSA"*, e só o total quando fora = 0), o que conta até hoje
- [X] T015 [US1] Implementar `lib/dominio/ta-fora-do-dsa.ts` com o cabeçalho de origem (D-COR-3) e a citação
- [X] T016 [P] [US1] Escrever `lib/validacao/ta-fora-do-dsa.ts` (Zod: linha, quantidade inteira ≥ 1, data ISO não futura contra `hojeNaCiaara()`, instrutor opcional, observação ≥ 3 úteis e ≤ 1.000) e o teste `tests/unidade/validacao-ta-fora-do-dsa.test.ts`
- [X] T017 [US1] Implementar `lib/acoes/ta-fora-do-dsa.ts` (`registrarTaForaDoDsa`, `desfazerTaForaDoDsa`): `safeParse` na 1ª linha, a trava da turma arquivada (T013.1), insert sem `RETURNING` (gotcha 4.1), recusa traduzida (gravar: `42501`; desfazer: zero linhas — a mesma frase), confirmação por `?gravada=ta-fora` / `ta-fora-desfeito` — o contrato de `?gravada=` (`lib/navegacao/contrato.ts`) e `enderecoDaTurmaGravada` **já aceitam os seis valores** (`turma`, `situacao`, `arquivada`, `desarquivada`, `ta-fora`, `ta-fora-desfeito`; feito junto desta tarefa em 19/10/2026) —, revalidação da ficha, `/turmas` e `/inicio`; e desenhar na ficha a mensagem de `ta-fora` e `ta-fora-desfeito` (`role="status"`)
- [X] T018 [US1] Ler os registros na ficha: `app/(app)/turmas/[turma]/consulta.ts` (os registros da turma no `Promise.all` da página, com o autor resolvido pelo padrão da ficha: nome para quem lê `usuarios`, *"outra conta"* para os demais — C-22) e a coluna `ta_fora_do_dsa` de `vw_carga_horaria_turma`/`vw_disciplinas_execucao`
- [X] T019 [US1] Criar a folha `app/(app)/turmas/[turma]/TaForaDoDsa.tsx` (lista + formulário + *Desfazer*, `SeletorInstrutor` para o instrutor, a **data com `defaultValue` = `hojeNaCiaara()` passado pelo servidor**) e ligá-la em `DisciplinasDaTurma.tsx` (botão por linha e *"· Y fora do DSA"*), só para o trio e turma não arquivada; registrá-la na lista fechada de `tests/unidade/fronteira-das-telas.test.ts`
- [X] T020 [US1] Mostrar a execução separada no andamento da ficha (`app/(app)/turmas/[turma]/page.tsx`, seção de andamento, `data-slot="execucao-separada"`)
- [X] T021 [US1] `PEND-016-5`: em `app/(app)/turmas/[turma]/dsa/leitura.ts` ler, na mesma rodada, `vw_chd_por_fato` da turma com `sem_posicao = true` e `data <= ate`, e juntar à `ocupacaoAcumulada` (sem marca de conflito); na planilha (`app/(app)/turmas/[turma]/dsa/planilha/leitura.ts`), levar os mesmos fatos **por um caminho só** — ⚠️ ela já repassa `semanaCorrente.ocupacaoAcumulada`, então somá-los também a `foraDaPasta` contaria em dobro (achado 3); a CRONOS (*Distribuída* e *Restante*) passa a contá-los (C-26)
- [X] T022 [US1] Atualizar o caso que discrimina em `tests/e2e/andamento-ate-hoje.spec.ts`: a situação da semana do lançamento futuro passa a **18 %** (ver reprovar com a leitura antiga: 8 %); e, num teste de unidade ou invariante com **10 TA sem `ta_inicial` e 5 TA fora do DSA**, o quadro de CH do papel, a CONTROLE e a *Distribuída*/*Restante* da CRONOS mostram os 15 até o fim da semana — cada um **visto reprovar antes** —, e a planilha conta esses fatos **uma vez só** (rodapé da IMPRESSÃO igual ao quadro do papel e à CONTROLE)
- [X] T023 [US1] Escrever `tests/e2e/ta-fora-do-dsa.spec.ts` por clique: semente própria idempotente; *Turmas* → turma → *TA fora do DSA* → o campo de data **abre com hoje** → 5 TA → a confirmação de `?gravada=ta-fora` na ficha e a linha no banco; `[data-slot=execucao-separada]` com *"45 TA executados · 40 no DSA · 5 fora do DSA"* (o texto exato da semente); a linha da disciplina com *"· 5 fora do DSA"* e os executados +5; o **card de CHT** +5; a **aba Avaliações** +5; `/inicio` e `/turmas` (progresso e **Saldo (TA)**) +5; DSA da semana com a situação +5 e **sem cartão novo**; com **8 TA fora do DSA no dia**, lançar o teto inteiro desse dia continua aceito e nenhum conflito é marcado (FR-001.6); registrar os TA que faltam faz a disciplina **sair como concluída** (FR-001.7); *Desfazer* → as somas voltam e `[data-slot=registro-fora-do-dsa]` continua listado e marcado *desfeito*; Operador sem o botão; observação vazia recusada
- [X] T024 [US1] Commit `feat(BLOCO-2): TA fora do DSA …` e `fix(RF-DSA-05): o DSA soma o lançamento sem posição …`

---

## Phase 4: User Story 2 — Observação em toda troca de situação (Priority: P1)

**Goal**: a observação no diálogo e o histórico na ficha.
**Independent Test**: trocar a situação com observação e ver o histórico, recarregado e no banco.

- [X] T025 [P] [US2] Escrever `tests/unidade/historico-da-turma.test.ts` (reprovando antes): junta trocas e arquivamentos, mais recente primeiro, rótulos *"Ativa → Concluída"*, *"Arquivada"*, *"Desarquivada"*, autor ausente (*"sem sessão"*) e **autor não legível** (*"outra conta"*, C-22)
- [X] T026 [US2] Implementar `lib/dominio/historico-da-turma.ts`
- [X] T027 [US2] `lib/validacao/turma.ts`: `esquemaDaTrocaDeSituacao` ganha `observacao` opcional (≤ 500); atualizar `tests/unidade/validacao-turma.test.ts`
- [X] T028 [US2] `lib/acoes/turma.ts`: `trocarSituacaoDaTurma` passa a chamar `rpc("trocar_situacao_da_turma")` com a observação, com a trava da arquivada (T013.1); recusa `turma_fora_do_alcance` traduzida
- [X] T029 [US2] `app/(app)/turmas/[turma]/TrocarSituacao.tsx`: campo *Observação*; as situações lidas de `Constants.public.Enums.status_turma` (não à mão)
- [X] T030 [US2] Criar `app/(app)/turmas/[turma]/HistoricoDaTurma.tsx` (servidor, seção recolhível pelo componente existente) e ler trilha + arquivamentos + nomes dos autores na página (o padrão de `usuarios.auth_user_id` com `.in()`; quem não lê `usuarios` vê *"outra conta"*, C-22)
- [X] T031 [US2] Estender `tests/e2e/turmas-situacao.spec.ts`: troca com observação → histórico na ficha recarregada e no banco; troca sem observação também no histórico; quem só lê vê o histórico e não o botão; **como Operador** (perfil sem `usuarios.ler`), o histórico mostra o autor como *"outra conta"*
- [X] T032 [US2] Commit `feat(BLOCO-2): observação e histórico da situação da turma`

---

## Phase 5: User Story 3 — Arquivar a turma (Priority: P1)

**Goal**: arquivar em qualquer situação, some das listas, só leitura, Admin desarquiva.
**Independent Test**: arquivar, ver sumir das listas, aparecer com o filtro, ficha e DSA só leitura, servidor recusando, Admin desarquivando.

- [X] T033 [P] [US3] Escrever `tests/unidade/arquivamento-da-turma.test.ts` (reprovando antes): estado pelo último evento, pode arquivar/desarquivar por perfil, aviso de não concluída, a frase *"Turma arquivada em DD/MM/AAAA por X — somente leitura"* e o caso do **autor não legível** (X = *"outra conta"*, C-22) ou ausente
- [X] T034 [US3] Implementar `lib/dominio/arquivamento-da-turma.ts`
- [X] T035 [US3] `lib/validacao/turma.ts`: esquemas de arquivar (código, observação opcional ≤ 500) e desarquivar
- [X] T036 [US3] `lib/acoes/turma.ts`: `arquivarTurma` e `desarquivarTurma` (insert em `turma_arquivamentos` sem `RETURNING`; recusas traduzidas; `?gravada=arquivada|desarquivada`, que o contrato já aceita desde a T017); desenhar na ficha a mensagem de `arquivada` e `desarquivada`
- [X] T037 [US3] Criar a folha `app/(app)/turmas/[turma]/ArquivarTurma.tsx` (diálogo com o aviso de não concluída; *Desarquivar* só para Admin) e **registrá-la na lista fechada de `tests/unidade/fronteira-das-telas.test.ts`**; o aviso `turma-arquivada` no topo da ficha; esconder toda ação de gravar na arquivada (cabeçalho, edição, troca de situação, período, instrutores, avaliações do currículo, **juntar como sessão** na aba Avaliações, previsto PROENS, TA fora do DSA)
- [X] T038 [US3] Listas (C-24): **enumerar** os leitores de `from("turmas")` em `app/` (medido no analyze: 18 arquivos) e, para cada lista ou seletor, aplicar a C-24 ou registrar em `progresso-implement.md` por que fica; no mínimo: `/turmas` (parâmetro novo `arquivadas` no contrato, `FiltrosDeTurmas.tsx`, selo *Arquivada* em `TabelaDeTurmas.tsx`, a leitura de `vw_turmas_arquivadas` no `Promise.all`) e emendar `tests/unidade/contrato-de-parametros.test.ts` (5 parâmetros, com a decisão); `/inicio` (`app/(app)/inicio/page.tsx`/`panorama.ts`); aba *Grade* do curso (`app/(app)/cursos/[curso]/page.tsx`) e a **pré-seleção** (`pre-selecao-de-turma.ts`), com caso de teste de que ela não escolhe a arquivada; *"Turmas com teto excedido"* (`BlocoDeLimites`); o filtro de `/atividades`; a cascata de `/disciplinas` (`CascataDeCursoETurma.tsx`/`consulta.ts`); e **mantidas por histórico** a ficha do instrutor e `/admin/salas`
- [X] T039 [US3] DSA, impressão e planilha da arquivada: só leitura por uma **marca própria (`arquivada`)** que desliga só o formulário de gravar — **não** pelo *"pode lançar"*, porque `podeBaixarPlanilhaDeContingencia` (`dsa/planilha/acesso.ts`) usa a mesma condição para a rota e os dois botões e continua **igual**; o aviso no topo do DSA (`app/(app)/turmas/[turma]/dsa/page.tsx`)
- [X] T040 [US3] Chamar `recusaSeTurmaArquivada` (criada na T013.1) em toda Server Action que grava dado da turma: `lib/acoes/dsa.ts` (lançar, atualizar, mover, editar, excluir, estudo individual), `dia-parado.ts`, `atribuicao.ts`, `disciplina.ts` (`definirPeriodoDaTurma`), `turma.ts` (editar, trocar situação), `avaliacoes-do-curriculo.ts` (as de turma), `previsto-proens.ts`, `juntar-sessao.ts`, `ta-fora-do-dsa.ts` (já chama)
- [X] T041 [US3] Escrever a guarda `tests/unidade/turma-arquivada-trava.test.ts`: enumera as Server Actions que gravam dado da turma e exige a chamada da trava (código sem comentário, regra 9.1.1), com controle positivo
- [X] T042 [US3] Escrever `tests/e2e/turmas-arquivar.spec.ts` por clique, com amostra idempotente: Encarregado arquiva turma ativa (aviso, confirma) → a confirmação de `?gravada=arquivada` e a linha no banco → some de `/turmas`, `/inicio`, aba *Grade* e `/atividades`; *Mostrar arquivadas* → aparece com o selo; ficha só leitura com o aviso; o DSA mostra `[data-slot=turma-arquivada]`, sem nenhum botão de gravar, *Imprimir* abre `/print/dsa` e *Baixar planilha de contingência* fica **visível** e responde 200; Server Action de lançamento recusada; **o Admin tenta editar a arquivada e o servidor recusa** (C-4); Encarregado sem *Desarquivar*; Admin desarquiva → volta; o histórico mostra os eventos *Arquivada* e *Desarquivada*; banco conferido
- [X] T043 [US3] Commit `feat(BLOCO-2): arquivar turma em qualquer situação …`

---

## Phase 6: User Story 5 — O cartão do DSA com o nome que cabe (Priority: P1)

**Goal**: nome no DSA (cadastrado ou abreviado), o instrutor nunca some, edição da disciplina preserva os campos.
**Independent Test**: 1 TA com o nome mais longo do catálogo no papel e na tela; nome cadastrado nas três superfícies.

- [X] T044 [US5] Escrever primeiro `tests/e2e/dsa-cartao-do-papel.spec.ts` (molde `dsa-rodape-do-papel.spec.ts`): semente idempotente com aulas de **1 TA** das disciplinas de nome mais longo (81, 74, 73, 72, 60 caracteres, e a de 6 dias), e **uma disciplina com `nome_no_dsa`**; por clique até *Imprimir*: mede a caixa do instrutor dentro da do cartão, 1 página, o nome cadastrado no cartão e o **nome inteiro** no quadro de CH; e **na tela**, o cartão de 1 TA do nome de 81 caracteres na grade com relógio e na lista sem relógio (`CorpoDoBloco`) com a caixa do instrutor dentro da do cartão — **ver reprovar com o CSS de hoje** e registrar a medida em `progresso-implement.md`
- [X] T045 [US5] Medir L (R-8): no papel de 6 dias e compacto, o maior nome que cabe em 1 linha do título do cartão de 1 TA com o código mais largo; registrar a medição e o valor em `progresso-implement.md`, e **trocar o marcador** `[pendente: L medido na T045 …]` do FR-007.1 da spec, o `[pendente]` do `data-model.md` e o do comentário do §M1 do contrato pelo valor e pelo artefato da medição
- [X] T046 [P] [US5] Escrever `tests/unidade/nome-no-dsa.test.ts` (reprovando antes): cadastrado vence; curto fica **como está**, mesmo com espaço duplo ou ponto final (C-25); a regra R-8 passo a passo; sufixo `" / "`; espaço duplo no nome que não cabe; o mesmo resultado duas vezes; **as 172 ativas** da fixture `tests/unidade/dados/disciplinas-ativas-2026-10-19.txt` dentro de L (o SC-008, *172 de 172*)
- [X] T047 [US5] Implementar `lib/dominio/nome-no-dsa.ts` (L e a medição no cabeçalho)
- [X] T048 [US5] Levar `nomeNoCartao` de `vw_disciplinas_execucao.nome_no_dsa` por `lerExtrasDaImpressao` (`app/(app)/turmas/[turma]/dsa/leitura.ts`) até o cartão: tela (`components/ciaara/grade-dsa.tsx` — a grade com relógio **e** o `CorpoDoBloco` da lista sem relógio, linhas 165–189, onde o instrutor tem `truncate` —, título em 1 linha, instrutor sempre visível, `aria-label` com o nome inteiro), papel (`app/print/dsa/DocumentoDoDsa.tsx` + `documento.css`, título 1 linha, tópico recorta, pé `flex: none`) e planilha (`lib/dominio/dsa/planilha/catalogo.ts` coluna `DISC_NOME_DSA`, `preenchimento.ts` título do cartão); o quadro de CH continua com o nome inteiro
- [X] T049 [US5] Atualizar a invariante planilha × papel (`tests/unidade/dsa/planilha/comparar-com-o-papel.ts`) para o nome do cartão, conferindo que a planilha usa `DISC_NOME_DSA` no cartão e `DISC_NOME` no rodapé; e `tests/e2e/dsa-grade.spec.ts` se o nome de 29 caracteres mudar
- [X] T050 [US5] Cadastro: `FormularioDeDisciplina.tsx` com o campo *Nome no DSA* **só no modo de edição** (C-19) e a prévia, e com técnica, local e nome no DSA vindo preenchidos; `app/(app)/disciplinas/consulta.ts` lendo as três colunas; `lib/validacao/disciplina.ts` (≤ L) com teste do esquema (`nome_no_dsa` de L + 1 recusado, **com L na frase**; vazio vira nulo); e `lib/acoes/disciplina.ts` (`editarDisciplina` grava `nome_no_dsa`)
- [X] T051 [US5] Estender `tests/e2e/disciplinas.spec.ts`: editar só o *Nome no DSA* → no banco técnica e local iguais e o nome gravado (ver reprovar antes: técnica e local viram nulo); o texto de `[data-slot=previa-do-cartao]`; o campo ausente na criação; o cartão do DSA da tela com o nome do DSA
- [X] T052 [US5] Rodar `dsa-cartao-do-papel.spec.ts` e ver passar; commit `fix(BLOCO-2): o cartão do DSA com o nome que cabe …`

---

## Phase 7: User Story 4 — O painel de turmas (Priority: P2)

**Goal**: cinco indicadores e três avisos em `/turmas`, do recorte.
**Independent Test**: semente com cada aviso; números batendo com a tabela, inclusive filtrada.

- [X] T053 [P] [US4] Escrever `tests/unidade/painel-de-turmas.test.ts` (reprovando antes): os cinco indicadores (em andamento = ativa; iniciando = [hoje, hoje + N], não cancelada), **a arquivada fora dos indicadores e avisos sem o filtro** (FR-005.3), *sem janela* (**só planejada ou ativa**, C-27), *sem instrutor* (planejada/ativa, quantas), *conflito* de **pessoa** pelo `detectarConflitos` — com outra turma visível, com outra anônima e **dentro da própria turma** (C-23), e **um caso de sala que NÃO vira aviso** —, a semana corrente de segunda a sábado, e **o *"não pude ler"***: com a leitura de `turma_disciplina_instrutor` ou de `ocupacao_para_conflitos` marcada como falha, o quadro sai como *"não pude ler"* e não como zero avisos (FR-005.4, gotcha 4) — ver reprovar antes
- [X] T054 [US4] Implementar `lib/dominio/painel-de-turmas.ts` (reusa `lib/dominio/dsa/conflitos.ts`)
- [X] T055 [US4] `app/(app)/turmas/page.tsx` + `consulta.ts`: no mesmo `Promise.all`, `turma_disciplina` e `turma_disciplina_instrutor` das turmas do recorte, `ocupacao_para_conflitos` da semana e o parâmetro; *"não pude ler"* quando a leitura falhar (gotcha 4)
- [X] T056 [US4] Criar `app/(app)/turmas/PainelDeTurmas.tsx` (servidor: `CardKpi` × 5 e o quadro com `AvisosRecolhiveis`)
- [X] T057 [US4] Escrever `tests/e2e/turmas-painel.spec.ts` por clique: semente com turma sem janela, disciplina sem instrutor e conflito de instrutor nesta semana entre duas turmas; os cinco números; os três avisos levando à ficha; filtro por curso mudando os números
- [X] T058 [US4] Commit `feat(BLOCO-2): painel de turmas …`

---

## Phase 8: User Story 6 — O quadro de CH na ordem natural (Priority: P2)

- [X] T059 [P] [US6] Escrever o caso IV, IX, V, X em `tests/unidade/dsa/impressao.test.ts` (reprovando antes) e no teste do rodapé da planilha
- [X] T060 [US6] `lib/dominio/dsa/impressao.ts` (`tabelaDeCh`) e `lib/dominio/dsa/planilha/catalogo.ts` (`disciplinasNaOrdemDoRodape`) com `emOrdemNaturalDoCodigo`; corrigir o comentário de `app/(app)/turmas/[turma]/dsa/consulta.ts` que dizia o contrário
- [X] T061 [US6] Commit `fix(BLOCO-2): quadro de CH na ordem natural …`

---

## Phase 9: M4 — a trava no banco (PORTÃO), as provas e a entrega

- [X] T062 Gerar M4 (`supabase migration new trava_da_turma_arquivada`, a mais nova) conforme `contracts/migrations.md` §M4 — a turma da linha **só por `to_jsonb(new)`/`to_jsonb(old)`** (nunca `new.campo` num `case`, achado 21) e, no `UPDATE`, por OLD **e** NEW (achado 56); `revoke all` nas funções de gatilho; o guarda de `turmas` **sem `status`** nem em comentário, mensagem ou *hint* — e escrever `supabase/tests/140_trava_da_turma_arquivada.sql`: enumeração das 12 tabelas + `turmas`; **uma gravação que passa em cada uma das 12 com turma NÃO arquivada**; uma recusa por tabela com o *hint*; um `UPDATE` que **move** a linha da arquivada para outra turma, recusado; volta a gravar depois de desarquivar; disciplina nova não nasce na arquivada; a frase de `turma_arquivada` em `traducao-de-recusas.ts`; **e o caso com sessão real** em `tests/invariantes/rls/bloco-2.test.ts`: o Encarregado grava em `registros_aula` de turma arquivada e recebe `23514`/`turma_arquivada` (linha completa), e depois de o Admin desarquivar a mesma gravação passa
- [ ] T063 Defeitos deliberados, cada um pego pela prova certa e desfeito, registrados em `progresso-implement.md`: (a) o ramo fora do DSA tirado de uma das views → 137 e a guarda do 135; (b) a trilha anotando só pela função → 138; (c) a policy de desarquivar aberta ao Operador → RLS; (d) uma Server Action sem a trava → guarda T041; (e) `sem_posicao` ignorado no DSA → `andamento-ate-hoje` 8 %; (f) o CSS antigo do cartão → `dsa-cartao-do-papel`; (g) M4 sem uma tabela → 140; (h) a ocupação alheia sem o filtro de cruzamento → o caso da T012
- [ ] T064 Reversão provada numa base descartável: aplicar a reversão de M4, M3, M2 e M1 (`specs/017-bloco-2-turmas-e-dsa/reversao.sql`, na ordem do contrato — views por `drop`/recriação, `nome_no_dsa` só se nula, matriz a `permitido = false`) e ver a impressão digital do esquema voltar à de `c1f8d65` (`cbd61b2b…`, 2.012 objetos)
- [ ] T065 `pnpm verificar:tudo` (base limpa, `.next` apagada) e registrar as contagens; isolar toda reprovação antes de chamá-la de instável (`PEND-014-7`); e **rodar `pnpm test:rls` e os e2e novos duas vezes seguidas, sem reset no meio** (regra 9.1: a idempotência das amostras que arquivam), registrando as duas contagens em `progresso-implement.md`
- [ ] T066 Rebase sobre a `main` depois do squash do #71 (`git rebase --onto origin/main c1f8d65`), conferindo que a árvore só ganha os arquivos do Bloco 2
- [ ] T067 Push e PR com o template inteiro (o plano de reversão, a classificação de cada migration, a M4 como portão e a C-30: o merge só depois da M4 no remoto, ou a M4 sai do PR); CI verde nos três blocos
- [ ] T068 Rito do remoto para **M1, M2 e M3** (`plano-de-aplicacao-no-remoto.md`): backup citado, impressão digital das views antes × depois na cópia (igual), dry-run só com as três (M4 fora da pasta, sem commit), `supabase db push --linked` (pedido de permissão para Bernardo), conferência só de leitura (os `grant`/`revoke` das funções e a comparação dos **dois retratos datados**, gotcha 13), Production respondendo
- [ ] T069 Escrever `specs/017-bloco-2-turmas-e-dsa/roteiro-de-conferencia.md` a partir de `quickstart.md`, com os números do preview, avisando os passos que gravam (e que arquivar no preview entra na contagem do desenho da M4); voltar o local à base limpa
- [X] T070 Registrar as pendências novas no plano de correções (`docs/correcoes/plano-de-correcoes-em-blocos.md`): os três critérios de "concluída", o comentário vencido do código da turma, a célula de 1 TA da planilha, e **a divergência 3 da spec** (o plano diz que a aba Avaliações do curso mostra *"só o previsto"*; o código mostra o cumprido da turma) anotada no **item 4 do Bloco 3**
- [ ] T071 **PARE** — entrega do `/corrigir` (o que foi feito, preview e commit, roteiro, lote de dúvidas — C-1 a C-30, P-1 a P-8 e a emenda do BRIEF —, banco, pendências) e o desenho da M4 para o portão, com a contagem do remoto (passo 0 do plano), o que ela **não** trava (atividade não letiva e dia parado globais) e a consequência de até ela a disciplina nova nascer na arquivada; **sem merge** — e, quando aprovado, o merge só depois da M4 no remoto (ou com a M4 fora do PR, C-30) e só entre semanas

---

## Dependências e ordem

```text
T001–T002 → Foundational T003–T013.1 (bloqueia tudo)
  → US1 (T014–T024) → US2 (T025–T032) → US3 (T033–T043)
  → US5 (T044–T052) → US4 (T053–T058) → US6 (T059–T061)
  → M4 e entrega (T062–T071)
```

- A trava do servidor nasce na Phase 2 (T013.1), **antes** das ações da US1 e da US2 que a chamam (T017, T028); a
  T040 só a liga nas ações que já existem, e a guarda T041 pega o que faltar.
- T010 depende da T010.1 (o 010 e o 105 reprovam sem ela).
- T066 (rebase) depende do merge do #71 pela outra sessão.
- O merge depende da M4 aplicada no remoto, ou da M4 fora do PR (C-30).

## Paralelismo

- T007, T008, T009, T011, T012 em paralelo depois de T006.
- Os testes de unidade de cada história ([P]) em paralelo com as migrations já aplicadas.
- US4 e US6 independentes de US1–US3 e US5.

## Estratégia de entrega

Um PR só (pedido), com os commits por história. O MVP seria a US1 (TA fora do DSA), mas o pedido é o Bloco 2
inteiro numa conferência. A M4 é o único passo que espera Bernardo antes do remoto; o merge espera o *"aprovado"*
dele, a M4 no remoto (ou fora do PR, C-30), e só entre semanas.

## Totais

| Fase | Tarefas |
|---|---|
| Setup | 2 |
| Foundational | 13 (T003–T013, mais T010.1 e T013.1) |
| US1 | 11 |
| US2 | 8 |
| US3 | 11 |
| US5 | 9 |
| US4 | 6 |
| US6 | 3 |
| M4 e entrega | 10 |
| **Total** | **73** |
