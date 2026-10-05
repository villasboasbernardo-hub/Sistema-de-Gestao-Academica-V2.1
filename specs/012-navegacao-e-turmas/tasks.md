# Tasks: Navegação recolhível e o módulo de Turmas

**Input**: `specs/012-navegacao-e-turmas/` — `spec.md`, `plan.md`, `research.md`, `data-model.md`,
`contracts/{lateral,turmas,andamento}.md`, `quickstart.md`

**Ramo**: `feat/EPICO-5.5-navegacao-e-turmas` · **Épico 5.5** · **Sem migration nos três PRs**

**Testes**: obrigatórios, e **junto da tarefa que eles provam** — é a convenção desta base. Toda
tarefa que muda veredito traz o **caso que discrimina** (DoD 8).

## Formato: `[ID] [P?] [Story] Descrição com o caminho do arquivo`

- **[P]**: pode rodar em paralelo (arquivo diferente, sem dependência pendente)
- **[US1..US4]**: a história da `spec.md` que a tarefa serve

---

## Fase 1 — Preparação

- [X] T001 Registrar em `specs/012-navegacao-e-turmas/research.md` a adoção de **D1 a D12** na recomendação (04/10/2026, Bernardo) e a **confirmação de D7 e D9 no `Código.gs` da v1.0** (`diasUteis_`: `while d <= ate`, logo **inclusivo nas duas pontas**; só segunda a sexta; feriado por **data distinta** com impacto dia inteiro) — a citação da fórmula deixa de ser só testemunho e passa a ter o nome da função de origem, que é o que o cabeçalho de `lib/dominio/andamento-da-turma.ts` vai citar no PR 3

## Fase 2 — Base comum

**Não há.** ⚠️ **E isto é medido, não descuido:** os três PRs tocam arquivos diferentes e nenhum
depende de estrutura nova — zero migration, zero pacote, zero tabela. O que parece base comum (o
campo `icone` em `EntradaDeMenu`) é entregue na **T002** porque só a US1 o usa; a US2 apenas
acrescenta uma linha à lista que a T002 já reorganizou.

---

## Fase 3 — US1 · A tela devolve a largura, e a navegação continua ao alcance (P1, **PR 1**)

**Meta**: a lateral nasce recolhida (só ícones), expande ao apontar, recolhe ao sair, e um clique a
**fixa** — estado que sobrevive à troca de página e ao recarregamento, lido no **servidor**, sem
piscar.

**Teste independente**: entrar, navegar entre três telas sem tocar em turma nenhuma; a lateral se
comporta igual nas três e o estado fixado sobrevive.

- [X] T002 [US1] `lib/navegacao/menu.ts` — acrescentar o tipo `NomeDeIcone` e o campo `icone` a `EntradaDeMenu`; reordenar a lista para a **D-NAV-1** (Início · Cursos · Disciplinas · Instrutores · Cronograma · Atividades · Administração — *Turmas* entra na T016); reescrever o cabeçalho para declarar que a **validação vigente é a D-NAV-1 (04/10/2026)** e que a MENU-1 (11/09/2026) é a anterior. ⚠️ **O ícone é identificador (string), nunca componente** — `menu.ts` é importado por teste de unidade e por `tests/e2e/shell.spec.ts:11` **sem DOM**
- [X] T003 [P] [US1] `specs/008-shell-e-estado-na-url/contracts/casca.md` — sessão **04/10/2026** com a D-NAV-1 **ao lado** da validação de 11/09, não no lugar dela: a ordem nova insere Turmas e reagrupa quatro entradas, e o `RF-NAV-02` é **[PRESERVADO]**
- [X] T004 [P] [US1] `components/casca/icones-do-menu.tsx` — o mapa `NomeDeIcone → componente lucide` (**um** lugar), servidor, com `aria-hidden` e `size-4` no uso. ⚠️ Ícone à mão (`<path`, `d="M`) é proibido por `fronteira-componentes`
- [X] T005 [US1] `app/(app)/layout.tsx` — ler `cookies().get("ciaara-lateral")` de `next/headers` junto do `Promise.all` que já lê `headers()`, e passar `lateralFixada` à casca. ⚠️ **É o servidor que decide o estado inicial** — é o que elimina o flash (`FR-005`), e é por isso que o padrão NÃO é o do tema (que guarda em `localStorage` e corrige depois da hidratação)
- [X] T006 [US1] `components/casca/casca-do-app.tsx` — receber e repassar `lateralFixada` a `NavegacaoLateral`; **sem** marcador de cliente (proibido nominalmente por `tests/unidade/fronteira-casca.test.ts:101-109`)
- [X] T007 [US1] `components/casca/navegacao-lateral.tsx` — continua **servidor**: monta a `<ul>` com ícone + rótulo, mantém `data-entrada`, `aria-current="page"` e a etiqueta *"em breve"*, e entrega a lista como `children` do painel. ⚠️ **O rótulo desaparece por OPACIDADE, não por `sr-only`** — medido ao escrever: `sr-only` tira o elemento do fluxo, e devolvê-lo no `:hover` com `not-sr-only` briga com `truncate` e reflui a linha a cada passada do mouse. As três condições que o trazem de volta são `lg:group-hover`, `lg:group-focus-within` (de onde sai o `FR-008`, de graça) e `lg:group-data-[fixada=true]`
- [X] T008 [US1] `components/casca/painel-retratil.tsx` — a folha de cliente **que já existe** passa a ser dona do `<nav aria-label="Navegação principal" data-slot="navegacao-lateral">`, com `data-fixada`, as larguras (`lg:w-14`, `lg:hover:w-56`, `lg:focus-within:w-56`, fixada → `lg:w-56` por `cn`), a transição com `motion-reduce`, o **controle de fixar** depois da lista (`aria-pressed`, `Tooltip`, ícone) e a escrita do cookie por `document.cookie`. ⚠️ **A expansão ao apontar é CSS, sem estado em JS** — o Playwright faz *hover* antes de todo `click()`, e seis arquivos de e2e clicam links do menu; estado de hover em JS seria disputa garantida. ⚠️ **A gaveta abaixo de `lg` não muda**: nenhuma das variantes `lg:` se aplica ali, e é da **ausência** delas que sai o `FR-006`
- [X] T009 [US1] `tests/unidade/fronteira-casca.test.ts` — atualizar **só a frase de justificativa** de `painel-retratil.tsx` em `COM_INTERACAO` para dizer o que ele faz agora (fixar, cookie, gaveta). ⚠️ **A lista NÃO cresce** — é por isso que a interação foi para a folha existente em vez de nascer num arquivo novo, que exigiria entrada nas **duas** listas fechadas (`fronteira-casca` e `fronteira-componentes`)
- [X] T010 [US1] `tests/e2e/lateral.spec.ts` (novo) — **sete** casos sobre `contracts/lateral.md` §7, **por mouse e clique de verdade**: `nav.hover()` para expandir e `page.mouse.move()` para sair (nunca estado forçado nem classe injetada); medição por **largura da caixa** do `<nav>` (`boundingBox()`), não por `toBeVisible()` do rótulo — ⚠️ `sr-only` tem caixa de 1 px e o Playwright o considera **visível**, então essa asserção passaria pelo motivo errado; cookie lido por `context.cookies()`; o anti-flash em DUAS metades — o **HTML do servidor** lido por `page.request.get` (a que discrimina) e zero mutações de `data-fixada` por `MutationObserver` instalado em **`document`**, nunca em `document.documentElement`, que é `null` quando o `addInitScript` roda; tela estreita por `page.setViewportSize({ width: 800, height: 900 })`, como `teclado.spec.ts:230`
- [X] T011 [US1] **Defeito deliberado** (DoD 8): servir `data-fixada="false"` ignorando o cookie `fixada` — o caso do anti-flash da T010 **reprova**; desfazer e ver passar. Registrar no corpo do PR qual caso reprovou e com que mensagem. ⚠️ Sem isto não se sabe se o caso discrimina ou se ele passa porque não olha nada
- [X] T012 [US1] `pnpm verificar:tudo` → **0**, com as quatro contagens (unidade, pgTAP, RLS e ambiente, ponta a ponta) **medidas e só então escritas** (regra 9.3). ⚠️ Rodar com a porta 3000 livre: `reuseExistingServer` não distingue qual servidor ocupa a 3100 (gotcha 7)
- [X] T013 [US1] Commit, push do ramo e **CI verde nos três blocos sobre o mesmo commit** (`SC-011`). ⚠️ **O primeiro commit leva os dois registros adiados** que já estão na árvore: a linha de encerramento da spec 011 no `CLAUDE.md` e a **T050** fechada em `specs/011-gestao-de-usuarios/tasks.md`
- [X] T014 [US1] 👤 `specs/012-navegacao-e-turmas/roteiro-de-conferencia-pr1.md` — **8 passos** (recolhida por padrão · expande ao apontar · recolhe ao sair · clique fixa · persiste ao trocar de página e após `F5` · clique de novo recolhe · celular como gaveta · *"em breve"* intacto), com o **link exato do preview** e o **commit que ele serve**, medidos. **PARAR AQUI**: a conferência é de Bernardo

**Critério de merge do PR 1**: T012 verde, T013 com CI verde, T014 com o "de acordo" de Bernardo.

---

## Fase 4 — US2 · Encontrar uma turma sem saber o curso dela (P1, **PR 2**)

**Meta**: existe `/turmas`, com filtros na URL, e cada linha leva à ficha.

**Teste independente**: do menu, chegar à lista, filtrar, abrir a ficha — sem passar por curso nenhum.

- [X] T015 [US2] `lib/navegacao/contrato.ts` — entrada `/turmas` (`origem: "RF-CURSO-01"`; `curso`, `ano`, `situacao`, `busca`, conforme `data-model.md` §3.1) e a constante nova `SITUACOES_DE_TURMA = Constants.public.Enums.status_turma`. ⚠️ `SITUACOES_DE_CADASTRO` é `status_registro` (`ativo|inativo`) e **não serve**
- [X] T016 [US2] `lib/navegacao/menu.ts` — `{ rotulo: "Turmas", rota: "/turmas", icone: "turmas", disponivel: true, entregaEm: "Épico 5.5" }` na **terceira** posição, **no mesmo commit** da T018. ⚠️ `tests/e2e/shell.spec.ts:70-92` reprova nos **dois** sentidos: tela que existe com menu dizendo *"em breve"*, e menu disponível sem tela
- [X] T017 [US2] `tests/unidade/contrato-de-parametros.test.ts` — **inverter** o bloco `FR-031.7` (hoje três asserções de **ausência** de `/turmas`) em guarda de **presença**, citando a **D-NAV-1 (04/10/2026) que substitui a MENU-1**. ⚠️ **Reverter, não excepcionar**: apagar as três deixaria o repositório sem dizer por que a lista existe
- [X] T018 [US2] `app/(app)/turmas/page.tsx` + `consulta.ts` — servidor, `lerParametros("/turmas", …)`, **uma** consulta de turmas com embed do curso (`data-model.md` §4) e as opções de filtro em `Promise.all`; `montarConsultaDeTurmas<C>` **pura** sobre o `Encadeavel` de `app/(app)/instrutores/consulta.ts:33-40`, com Vitest
- [X] T019 [P] [US2] `app/(app)/turmas/FiltrosDeTurmas.tsx` — folha com `FiltroAvancado` (curso, ano, situação) + busca + `BotaoLimparFiltros`; a regra de aparecer é *"algum filtro fora do padrão"*, e o padrão é **todos vazios** (D4). ⚠️ O filtro de curso vai pelo `FiltroAvancado` canônico — `tests/unidade/seletor-turma-unico.test.ts` reprova quem itere `turmas.map(… <option)`
- [X] T020 [P] [US2] `app/(app)/turmas/TabelaDeTurmas.tsx` — folha com `TabelaDensa`, rótulo por `rotuloDaTurma`, `[data-turma]` na linha, `aoAtivarLinha` → `router.push(enderecoDaTurma(codigo))`; estado vazio distinguindo *não há* de *você não vê* por `alcanceDoPerfil`
- [X] T021 [US2] `tests/unidade/fronteira-das-telas.test.ts` — `FOLHAS_DE_CLIENTE` ganha `FiltrosDeTurmas.tsx` e `TabelaDeTurmas.tsx`, cada uma com a frase do motivo. ⚠️ A lista é fechada nos dois sentidos
- [X] T022 [US2] `tests/e2e/turmas-lista.spec.ts` (novo) — percurso **por clique**: menu → *Turmas* → lista → linha → ficha → voltar; filtros escrevendo a URL e a URL reproduzindo a lista; *Limpar filtros* aparecendo e limpando; recorte vazio dizendo *"nenhuma turma neste recorte"*

## Fase 5 — US3 · A turma tem um só lugar, e nenhum link antigo quebra (P2, **PR 2**)

**Meta**: o bloco por turma sai de `/disciplinas` e vai para a ficha, com os **mesmos** painéis e a
**mesma** edição; os endereços antigos redirecionam.

**Teste independente**: abrir um endereço antigo anotado antes da mudança e chegar ao lugar novo, na
seção certa.

- [X] T023 [US3] `lib/navegacao/endereco-de-turma.ts` — `enderecoDasTurmas(sigla?)`, `enderecoDaSecaoDeDisciplinas(codigo)` e `ROTA_DA_FICHA_DA_TURMA`, com Vitest da grafia do `nuqs` em `?curso=`. ⚠️ **Tem de nascer aqui**: a guarda T070 (`tests/unidade/endereco-de-turma-unico.test.ts:53-54`) reprova qualquer `"/turmas/…"` ou `?turma=` fora deste módulo — inclusive dentro de um `redirect()`
- [X] T024 [US3] `lib/navegacao/contrato.ts` — `aberta` em `/turmas/[turma]`; `/disciplinas` **perde** `situacao_turma` e `instrutor` (parâmetros que só tinham efeito com o bloco por turma) e **mantém** `turma` com o papel único de endereço antigo (D5); emendar, com data, o cabeçalho das linhas 473-479, que afirma *"a turma se alcança pelo curso"* — **vencido** pela D-NAV-3
- [X] T025 [US3] `app/(app)/turmas/[turma]/page.tsx` — cabeçalho do `FR-021` (rótulo, curso com link, início, término, situação, alunos, modalidade); `[data-slot="voltar-a-lista"]` **no lugar de** `voltar-ao-curso` (D-NAV-3); âncora `#disciplinas`; `hoje` por `hojeNaCiaara()` (hoje há cópia local); `disciplinasAtivas` **real** na ficha (D6 — a aba Grade do curso segue com `1`, porque o `FR-012` da spec 009 proíbe consulta por turma ali)
- [X] T026 [US3] `app/(app)/turmas/[turma]/DisciplinasDaTurma.tsx` (novo, folha) + `consulta.ts` — `TabelaDensa` com `detalhe` e `abertas` ligados a `?aberta=`, importando `PainelDePeriodo` e `PainelDeInstrutores` **de `app/(app)/disciplinas/paineis/`** e consumindo `lerGradeDeDisciplinas`. ⚠️ **Os painéis NÃO se movem**: importam Server Actions, e `fronteira-componentes` proíbe `@/lib/acoes/` em `components/`. ⚠️ **Reusar `lerGradeDeDisciplinas` preserva de graça** o `.order("ordem_antiguidade")` que `tests/unidade/ordenacao-de-instrutor.test.ts` cobra de toda leitura de instrutor
- [X] T027 [US3] `app/(app)/disciplinas/page.tsx` — `redirect(enderecoDaSecaoDeDisciplinas(valores.turma))` quando `turma !== ""`, **antes de qualquer consulta**; `hoje` por `hojeNaCiaara()` (hoje é UTC e diverge das outras telas entre 21h e meia-noite)
- [X] T028 [US3] `app/(app)/disciplinas/GradeDeDisciplinas.tsx` e `CascataDeCursoETurma.tsx` — tirar os ramos `porTurma` (colunas Período/Instrutores/Situação, filtros `situacao_turma` e `instrutor`, indicadores por turma, os dois painéis no detalhe) e a escolha de turma da cascata; a frase do detalhe passa a apontar para a ficha da turma
- [X] T029 [P] [US3] `app/(app)/cursos/[curso]/AbaGrade.tsx` — *"Ver todas as turmas"* (`[data-slot="ver-todas-as-turmas"]`) → `enderecoDasTurmas(sigla)`; o botão *Disciplinas* com turma selecionada → `enderecoDaSecaoDeDisciplinas(codigo)`
- [X] T030 [P] [US3] `lib/acoes/disciplina.ts` e `lib/acoes/atribuicao.ts` — acrescentar `revalidatePath(ROTA_DA_FICHA_DA_TURMA, "page")`. ⚠️ Hoje revalidam só `/disciplinas`: com os painéis na ficha, gravar período ou instrutores deixaria **dado velho na tela, sem erro** — gotcha 4 na forma de cache
- [X] T031 [US3] `tests/e2e/enderecos-antigos.spec.ts` (novo) — os sete endereços de `contracts/turmas.md` §4, cada um com o destino esperado; e reescrever `turmas.spec.ts:180-185` (volta), `disciplinas.spec.ts:70-95` (`irAGradePorClique` sem turma) e `curso-pagina.spec.ts` (ver todas)
- [X] T032 [US3] **Defeito deliberado**: trocar o `redirect` da T027 por um destino montado à mão com `/turmas/${…}` — a guarda T070 **reprova**; desfazer e registrar
- [X] T033 [US3] `pnpm verificar:tudo` → 0, push, **CI verde**, e `roteiro-de-conferencia-pr2.md` 👤 — lista, ficha, edição na seção e os sete endereços antigos

**Critério de merge do PR 2**: T033 verde e o "de acordo" de Bernardo.

---

## Fase 6 — US4 · Saber se a turma cabe no tempo que resta (P2, **PR 3**)

**Meta**: a ficha diz quanto falta e **se o que falta cabe**; e existe **um só** cálculo de *em
atraso* no sistema.

**Teste independente**: escolher uma turma com lançamentos reais, calcular à mão e comparar número a
número.

- [X] T034 [US4] `lib/dominio/andamento-da-turma.ts` (novo) — `diasUteisEntre`, `capacidadeDiaria`, `andamentoDaTurma` (`contracts/andamento.md` §1), TS **puro**, tudo por parâmetro (`hoje: string`, como todo módulo da pasta); cabeçalho com `RF-INI-01`, `RN-CRONOS-01`, `RN-EVT-02`, `RN-MAT-04` e a citação de `Código.gs` (`getDashboardGeral`, `temposDiaDaTurma_`, `diasUteis_`) — ⚠️ **o arquivo não está neste repositório**, e o cabeçalho diz isso: é testemunho datado de Bernardo (03 e 04/10/2026), confirmado por ele na T001
- [X] T035 [US4] `tests/unidade/andamento-da-turma.test.ts` — os **doze** casos de `contracts/andamento.md` §1.2, com a conta de cada número **no comentário** e calculada antes de escrita (regra 9.3). Os que importam: **U3** (excesso **não** é atraso — o veredito que `/inicio` dava errado), **U6** (modalidade sem o campo do regime → *sem dado*, sem fallback), **U8** (feriado duplicado conta uma vez; no sábado não conta), **U9** (inclusivo nas duas pontas, confirmado no `diasUteis_`)
- [X] T036 [P] [US4] `components/ciaara/barra-de-progresso.tsx` (novo) — servidor, `role="progressbar"`, `aria-valuenow/min/max`, só tokens do `@theme`; **com amostra em `app/estilo/`**, porque `fronteira-componentes.test.ts:198-216` exige que todo componente da pasta seja alcançável pela vitrine
- [X] T037 [US4] `app/(app)/turmas/[turma]/consulta.ts` + `page.tsx` — ler `vw_carga_horaria_turma` (1 linha), `vw_cursos_regime_vigente` (1 linha) e `feriados` com `impacto='dia_inteiro'` no intervalo, em `Promise.all`; a seção **Andamento** com os cinco estados de `contracts/andamento.md` §2
- [X] T038 [US4] `app/(app)/turmas/[turma]/DisciplinasDaTurma.tsx` — colunas **CH executada** e **%** por disciplina, rodapé que reconcilia com o Andamento, e o aviso dos lançamentos **sem unidade de ensino** (as 1.566 linhas do ETL têm UE nula; `vw_disciplinas_execucao` soma por UE e `vw_carga_horaria_turma` por turma — a diferença é dita na tela, não corrigida)
- [X] T039 [US4] `tests/e2e/panorama-de-teste.ts` — a semente passa a três turmas com `data_termino` e regime coerente: `turmaEmExcesso` (era `turmaAtrasada`), `turmaEmDia` (EAD **com** `limite_diario_ead_horas`) e `turmaSemCapacidade` (nova). ⚠️ A semente é compartilhada por `cursos-de-teste.ts`, `instrutores-de-teste.ts` e `url-degradada.spec.ts` — os quatro rodam
- [X] T040 [US4] **O caso que discrimina, na ordem certa** (DoD 8): com a semente da T039 e o `panorama.ts` **antigo**, rodar `tests/e2e/inicio.spec.ts` e **ver reprovar** nos dois sentidos; anotar a mensagem. Só então a T041
- [X] T041 [US4] `app/(app)/inicio/page.tsx` + `panorama.ts` — três leituras a mais (`turmas` com `data_termino` e `modalidade`; regime por curso; feriados até o maior término); `montarPanorama` **delega** `emAtraso` e `percentual` ao módulo; **nada mais do painel muda** (`FR-031.2`); reescrever o cabeçalho de `panorama.ts`, que hoje afirma *"aqui não há regra de domínio"* — há, e ela mora em `lib/dominio/`
- [X] T042 [P] [US4] `tests/unidade/andamento-unico.test.ts` (novo) — `emAtraso` só se **calcula** em `lib/dominio/andamento-da-turma.ts`; `panorama.ts` e a ficha o **importam**; controle positivo exigindo os dois imports (`SC-006`)
- [X] T043 [P] [US4] `tests/unidade/vocabulario-proibido.test.ts` (novo) — zero `gordura` em código **sem comentário** de `app`, `lib`, `components`, `supabase` e `tests`, com este arquivo excluído da própria varredura e controle positivo exigindo *"Saldo de capacidade"* na ficha (`SC-007`). ⚠️ `vocabulario.test.ts` é o vocabulário **visual** e não serve
- [X] T044 [US4] `tests/e2e/andamento.spec.ts` (novo) + `inicio.spec.ts` — os cinco estados da seção na ficha, e no Início os **dois vereditos virados**: `turmaEmExcesso` sem badge, `turmaSemCapacidade` com badge
- [X] T045 [US4] `pnpm verificar:tudo` → 0, push, **CI verde**, e `roteiro-de-conferencia-pr3.md` 👤 com o **caso calculado à mão** sobre uma turma real do banco **local** (`quickstart.md` §3), datado — o "hoje" muda o resultado

**Critério de merge do PR 3**: T045 verde, a conta à mão batendo número a número, e o "de acordo".

---

## Fase 7 — Polimento e fechamento

- [X] T046 Atualizar o `CLAUDE.md` com a fatia fechada: os três PRs, os commits, as quatro contagens medidas, o **achado do indicador invertido de `/inicio`**, a **D-NAV-1 substituindo a MENU-1**, e o Épico 5.5 na linha de estado
- [X] T047 Conferir que a estrutura do banco **não mudou**: `scripts/provas/impressao_digital_do_esquema.sql` com o mesmo resumo antes e depois dos três PRs — é o que prova *"sem migration"* em vez de afirmá-lo

---

## Dependências

`T001 → T002`. **PR 1**: `T002 → T007 → T008`; `T003`, `T004` em paralelo; `T005 → T006 → T007`;
`T008 → T009, T010 → T011 → T012 → T013 → T014`.
**PR 2** (depois do merge do PR 1): `T015 → T018 → T019, T020 → T021 → T022`; `T016` no commit da
T018; `T023 → T024 → T025 → T026`; `T027 → T028`; `T029`, `T030` em paralelo; `T031 → T032 → T033`.
**PR 3** (depois do merge do PR 2): `T034 → T035`; `T036` em paralelo; `T037 → T038`;
`T039 → T040 → T041`; `T042`, `T043` em paralelo; `T044 → T045`.
`T046`, `T047` ao fim dos três.

## Oportunidades de paralelo

**PR 1**: T003 e T004 (documento e mapa de ícones, arquivos diferentes). **PR 2**: T019 com T020
(duas folhas); T029 com T030 (tela e ações). **PR 3**: T036 com T034 (componente e módulo puro);
T042 com T043 (duas guardas).

## Contagem

| PR | Tarefas | Faixa |
|---|---|---|
| **PR 1** — a lateral recolhível | **14** | T001–T014 |
| **PR 2** — a lista, o menu, os links e o bloco movido | **19** | T015–T033 |
| **PR 3** — o andamento e o conserto do `/inicio` | **12** | T034–T045 |
| Fechamento | **2** | T046–T047 |
| **Total** | **47** | |

## Estratégia

O PR 1 é o MVP e é **independente**: ele entrega valor em toda tela (largura de volta) sem tocar em
turma nenhuma. O PR 2 só então faz sentido, porque a ficha precisa ser destino antes de virar o
único lugar da turma. O PR 3 vem por último porque reconcilia somas com a seção que o PR 2 cria —
e porque é ele que **conserta um indicador errado em produção**, o que merece suíte estável embaixo.
