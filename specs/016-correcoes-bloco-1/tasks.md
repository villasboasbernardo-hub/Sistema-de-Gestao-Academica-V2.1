# Tasks: Correções do Bloco 1 — tela e defeitos dos testes de 16/10/2026

**Input**: `specs/016-correcoes-bloco-1/` — `spec.md` (com o clarify), `plan.md` (aprovado em 17/10/2026, §0),
`research.md`, `data-model.md`, `contracts/migrations.md` (desenho **aprovado**, regra 9.4),
`contracts/telas.md`, `quickstart.md`, `plano-de-aplicacao-no-remoto.md`

**Tests**: **pedidos** — todo FR da spec tem critério de aceite com teste, e a Definition of Done exige
unidade, pgTAP, RLS com sessão real e ponta a ponta **por clique**. Onde a tarefa diz **"reprova antes"**,
o teste é escrito e rodado **antes** da mudança e tem de reprovar (DoD 8).

**Organização**: pedida por Bernardo — **três grupos, um por PR, na ordem tela → DSA → banco** (P-1). Dentro
de cada grupo, de dentro para fora: domínio → validação → ação → tela → ponta a ponta. Cada tarefa leva a
etiqueta da história da spec que ela atende:

| Etiqueta | História da spec | Itens |
|---|---|---|
| **US1** (P1) | Ver o andamento real da turma e trocar a situação | 1.14 (PR 3), 1.15 (PR 1) |
| **US2** (P1) | DSA: a semana do curso, a sugestão e o cartão | 1.8, 1.9, 1.11, 1.12 (PR 2) |
| **US3** (P2) | Instrutor: ver primeiro, editar ao clicar, e a CH prevista | 1.10 (PR 1), 1.13 (PR 3) |
| **US4** (P2) | Entrar e se orientar | 1.1, 1.2, 1.3 (PR 1) |
| **US5** (P3) | Listas e páginas mais limpas | 1.4, 1.6, 1.7 (PR 1), 1.5 (PR 2) |

As tarefas de fechamento de cada PR (verificar, commitar, CI, conferência) e a preparação **não** levam
etiqueta: são transversais.

## Formato: `[ID] [P?] [História?] Descrição`

- **[P]**: pode correr em paralelo (arquivo diferente, sem depender de tarefa aberta).
- **[USn]**: a história da spec.
- Caminhos relativos à raiz do repositório.

## Regras que valem para toda tarefa

- **Antes de qualquer ponta a ponta: `pnpm db:reset:limpo`.** O banco local está com a cópia
  `remoto-20261017-005738.sql`, e com feriado real a semente do DSA quebra. `pnpm verificar:tudo` já faz o
  reset limpo; rodar um arquivo e2e sozinho, não.
- **E2e chega por clique** a partir do menu; `page.goto` só para o login e o ponto de partida
  (`tests/e2e/conta-de-teste.ts`, `entrar`).
- **Toda varredura lê código sem comentário** (regra 9.1.1); **todo número escrito em disco vem depois da
  medição** (regra 9.3), com o artefato nomeado (regra 9.2).
- **`"use client"` só em folha**, e toda folha nova entra na lista fechada da guarda de fronteira
  (`tests/unidade/fronteira-componentes.test.ts` para `components/`, `tests/unidade/fronteira-das-telas.test.ts`
  para `app/`).
- **Só tokens existentes** de `app/globals.css`; nenhuma cor literal em `components/ciaara/`.
- **Guardas de ponto único** (gotcha 12): lista de instrutor só pelo `SeletorInstrutor`, de turma só pelo `SeletorTurma`; um `<select>` que não é de instrutor nem de turma, numa tela que menciona instrutor, vai para **arquivo próprio** — o conserto é usar o canônico, nunca excepcionar a guarda.
- **Commit por item**, no padrão `<tipo>(<identificador>): <resumo>` da tabela do plan §6.
- **O acompanhamento** vai em `specs/016-correcoes-bloco-1/progresso-implement.md` (criado na T003):
  contagens, defeitos deliberados, medições.

## O que adotei sozinho, pela recomendação do plan
- **Cores da faixa** (1.1): mantêm-se as de hoje por ambiente (`planejado` em local, `atrasado` em preview), e
  em Production ou sem ambiente declarado a faixa usa `marca` / `marca-contraste` — tokens existentes.
- **Confirmação depois de gravar a turma** (1.15): por parâmetro efêmero de URL lido pela ficha, como o
  `?excluida=` de `/admin/usuarios` — a navegação desmonta a folha que gravou.
- **Nova turma** (1.6) sai da aba Grade e fica **só** na barra do topo: um lugar para a mesma ação.
- **Nome do recolhível do instrutor** (1.10): *"Editar instrutor"*, como *"Editar turma"*.

---

## Fase 1 — Preparação (neste ramo)

- [X] T001 Conferir o ponto de partida: ramo `fix/BLOCO-1-correcoes-de-tela`, árvore limpa, `stash@{0}` antigo **intocado**; `git fetch` e, se a `main` andou, `git rebase origin/main` (o ramo só tem commits de documentação em `specs/016-correcoes-bloco-1/` e `docs/correcoes/plano-de-correcoes-em-blocos.md`) · **Origem:** plan §1 (P-1)
- [X] T002 Restaurar a base limpa com `pnpm db:reset:limpo` (o local está com a cópia do remoto) e conferir pela contagem de `public.turmas` que a base é a da semente (`supabase/seed.sql`) · **Origem:** DoD 5; quickstart §Pré-requisitos
- [X] T003 Linha de base: `pnpm verificar` sai 0 antes de qualquer mudança; criar `specs/016-correcoes-bloco-1/progresso-implement.md` com as contagens de unidade e o commit medido · **Origem:** DoD 1–2

## Fase 2 — Fundação comum

*Nenhuma tarefa é comum aos três PRs: cada PR nasce da `main` e é independente. O que é compartilhado dentro
de um PR está na fundação dele (T004).*

---

## Grupo PR 1 — casca, entrada, listas e fichas (ramo `fix/BLOCO-1-correcoes-de-tela`, sem banco)

### Fundação do PR 1

- [X] T004 Criar `components/ciaara/barra-de-acoes.tsx` (Server Component, só tokens, `data-slot="barra-de-acoes"`): recebe os botões e links como filhos, alinha-os numa linha com o **mesmo tamanho** (`size="sm"`) e espaçamento; **não decide permissão** — cada filho chega já filtrado por quem o monta. Exibir na vitrine `app/estilo/amostras.tsx` · **Origem:** FR-006.1, FR-010.2

### 1.1 — Faixa Beta (US4)

- [X] T005 [P] [US4] **Reprova antes**: `tests/unidade/faixa-beta.test.ts` — o texto exato *"Sistema privado – Versão Beta – Esta é uma versão de testes do Sistema de Gestão Acadêmica"*; acréscimo *" · ambiente local"* com `NEXT_PUBLIC_AMBIENTE=local` e *" · pré-visualização"* com `preview`; **sem** acréscimo com `producao`, **ausente** e valor desconhecido; o aviso de variável por preencher de hoje preservado (FR-001.1, FR-001.4) · **Origem:** FR-001.1, FR-001.4, SC-001
- [X] T006 [US4] Em `lib/ambiente.ts`: criar `ambienteDeclarado()` (`local` | `preview` | `producao` | `null`, sem padrão, com acesso **literal** a `process.env.NEXT_PUBLIC_AMBIENTE` dentro da função — achado 1 do Épico 3) e a função pura `textoDaFaixa(ambienteDeclarado, variaveisFaltando)`; `ambienteAtual()` **não muda** (depende de T005) · **Origem:** FR-001.1, FR-001.4
- [X] T007 [US4] Em `components/faixa-de-ambiente.tsx`: renderizar **sempre** (inclusive Production), com `textoDaFaixa`; `sticky top-0` com camada acima da casca; **sem** botão de fechar; manter `role="status"` e `data-slot="faixa-de-ambiente"`; cor por ambiente conforme "O que adotei sozinho" (depende de T006) · **Origem:** FR-001.1, FR-001.4
- [X] T008 [US4] Descontar a altura da faixa: variável `--altura-da-faixa` em `app/globals.css` (não é cor); lateral fixa em `components/casca/painel-retratil.tsx:152` com `top` e altura descontando a faixa; `components/casca/casca-do-app.tsx:56` e `app/(auth)/layout.tsx` sem passar da tela (depende de T007) · **Origem:** FR-001.3
- [X] T009 [P] [US4] Esconder a faixa em **todos** os estados de `/print/dsa`: `app/print/dsa/loading.tsx` e `app/print/dsa/error.tsx` passam a carregar a regra de `app/print/dsa/impressao.css:46-48` (FR-001.2) · **Origem:** FR-001.2
- [X] T010 [P] [US4] Atualizar o texto da regra da faixa em `.env.local.example:79-82` · **Origem:** FR-001.4
- [X] T011 [US4] E2e `tests/e2e/faixa-beta.spec.ts`: `/login` (ponto de partida) mostra o texto e *"· ambiente local"*; entrar → menu *Turmas* → rolar a lista → a faixa continua no topo (caixa em `y = 0`); turma → *Abrir o DSA* → *Imprimir* → faixa **não** visível (complementa `tests/e2e/dsa-imprimir.spec.ts:114`); uma rota inexistente (`not-found`) também mostra a faixa · **Origem:** FR-001.1, FR-001.2, FR-001.3, FR-016, SC-001

### 1.2 — Contraste do item ativo (US4)

- [X] T012 [P] [US4] **Reprova antes**: acrescentar a `PARES` de `lib/design/vocabulario.ts` o par do item ativo — texto `marca-contraste` sobre `marca` — e o par de distinção fundo `marca` × lateral `superficie-2`, com a vitrine `app/estilo/page.tsx`; `tests/unidade/contraste.test.ts` mede os dois temas (FR-002.2, `RF-DS-03`) · **Origem:** FR-002.2, SC-010, RF-DS-03
- [X] T013 [US4] Em `components/casca/navegacao-lateral.tsx:108-114`: item ativo com `bg-marca text-marca-contraste font-medium` e o traço `border-marca`; os demais com `hover:bg-marca-suave`; foco visível conferido sobre o fundo `marca`; `aria-current="page"` mantido (depende de T012) · **Origem:** FR-002.1, RF-DS-03
- [X] T014 [US4] E2e: estender `tests/e2e/shell.spec.ts:44-51` — clicar numa entrada do menu, conferir `[aria-current="page"]` com fundo computado **diferente** do fundo da lateral; clicar em *Noturno* e conferir de novo · **Origem:** FR-002.1, FR-016, SC-010

### 1.3 — Ver senha (US4)

- [X] T015 [P] [US4] Criar a folha `components/ciaara/campo-de-senha.tsx` (`"use client"`): o `<input>` com `name`, `id`, `autoComplete`, `required` e as classes de quem usa, e o botão de olho (`lucide-react` `Eye`/`EyeOff`) com `type="button"`, nome *"Mostrar senha"* / *"Ocultar senha"*, `aria-pressed` e `data-slot="mostrar-senha"`; o nome do botão **não** casa com `/entrar/i` nem com `/trocar senha/i`; incluir na lista fechada de `tests/unidade/fronteira-componentes.test.ts:135-173` · **Origem:** FR-003.1, FR-003.2
- [X] T016 [US4] Usar `CampoDeSenha` em `app/(auth)/login/FormularioDeLogin.tsx:84-90` e nos dois campos de `app/(app)/perfil/senha/FormularioDeSenhaNova.tsx:59` e `:64-70` (depende de T015) · **Origem:** FR-003.1
- [X] T017 [US4] E2e `tests/e2e/ver-senha.spec.ts`: no `/login`, digitar a senha, acionar o olho → `type="text"`, acionar de novo → `password`, e entrar; conta com troca obrigatória (cadastro pelo Admin, como em `tests/e2e/admin-sobre-contas.spec.ts`) → redirecionada a `/perfil/senha` → olho nos dois campos; e o caminho voluntário por clique: menu do avatar → *Meu perfil* → *Trocar a minha senha* → olho nos dois campos · **Origem:** FR-003.1, FR-016

### 1.4 — Filtros recolhidos com contagem (US5)

- [X] T018 [P] [US5] **Reprova antes**: `tests/unidade/filtros-fora-do-padrao.test.ts` — com o contrato real de `lib/navegacao/contrato.ts`: em `/cursos`, `situacao=ativo` conta **0**; dois parâmetros fora do padrão contam **2**; em `/turmas`, `situacao=""` conta 0 (FR-004.2) · **Origem:** FR-004.2, SC-009
- [X] T019 [US5] Criar `lib/navegacao/filtros-fora-do-padrao.ts`: `filtrosForaDoPadrao(rota, valores)` compara cada parâmetro com o `padrao` do contrato (depende de T018) · **Origem:** FR-004.2
- [X] T020 [US5] Em `components/ciaara/filtro-avancado.tsx`: `useState(false)` (`:75`); receber o número pronto numa propriedade `ativos` e mostrar *"Filtros"* / *"Filtros N"* com `data-slot="filtros-ativos"`; **apagar** a conta interna de `:63-66`; continuar sem palavra de domínio e sem conta no componente (`tests/unidade/filtro-avancado.test.ts:61-85`) e com o estado de abrir interno (`tests/unidade/estado-efemero-intacto.test.ts`) · **Origem:** FR-004.1, FR-004.3
- [X] T021 [US5] Passar `ativos` ao `FiltroAvancado` e `haFiltroAtivo={ativos > 0}` ao `BotaoLimparFiltros` em `app/(app)/turmas/FiltrosDeTurmas.tsx`, `app/(app)/cursos/FiltrosDoCatalogo.tsx`, `app/(app)/instrutores/FiltrosDeInstrutores.tsx`, `app/(app)/atividades/FiltrosDeAtividades.tsx`, `app/(app)/disciplinas/GradeDeDisciplinas.tsx` e na vitrine `app/estilo/amostras.tsx`, apagando a conta booleana escrita à mão em cada tela (depende de T019 e T020) · **Origem:** FR-004.2
- [X] T022 [US5] Abrir o painel antes de mexer nos campos (auxiliar `abrirFiltros` de `tests/e2e/navegar-turmas.ts:38`) em `tests/e2e/instrutores.spec.ts:302-305`, `:384`, `:1017`, `tests/e2e/turmas-lista.spec.ts:104-108` e `tests/e2e/estado-na-url.spec.ts:97`, `:137`, `:141`, `:171` · **Origem:** FR-004.1, FR-016
- [X] T023 [US5] E2e `tests/e2e/filtros-recolhidos.spec.ts`: para `/turmas`, `/cursos`, `/instrutores`, `/atividades` e `/disciplinas` (depois de escolher o curso), chegar pelo menu → painel recolhido e botão *"Filtros"* sem número → escolher dois filtros → *"Filtros 2"* → *Limpar filtros* → sem número; em `/cursos` limpo, **nenhum** número (hoje mostra 1) · **Origem:** FR-004.1, FR-004.2, FR-016, SC-009

### 1.6 — Página do curso (US5)

- [X] T024 [US5] Em `lib/navegacao/contrato.ts:794-802`: `aba` com `padrao: "sobre"` e opções na ordem `["sobre", "grade", "avaliacoes"]`; em `app/(app)/cursos/[curso]/AbasDoCurso.tsx:22-38`, a ordem *Sobre o Curso · Grade · Avaliações* e o padrão **lido do contrato** (apagar o segundo dono de `:38`); ajustar `tests/unidade/contrato-de-parametros.test.ts:355-361` e `tests/unidade/endereco-de-turma.test.ts:77-78` (FR-006.2) · **Origem:** FR-006.2
- [X] T025 [US5] Barra única no topo com `BarraDeAcoes` (T004): *Editar curso* (de `CabecalhoDoCurso.tsx:99-107`), *Desativar/Reativar* (de `AcoesDeSituacao.tsx:68-75`, cor destrutiva mantida, saindo de `page.tsx:308-310`) e *Nova turma* (saindo de `AbaGrade.tsx:110-117`, só com `turmas/criar` e curso em oferta), em `app/(app)/cursos/[curso]/page.tsx` (FR-006.1) · **Origem:** FR-006.1
- [X] T026 [US5] Em `app/(app)/inicio/page.tsx:388`, o cartão passa a pedir a Grade: `enderecoDaTurmaNoCurso(t.cursoCodigo, t.turmaCodigo, "grade")` (FR-006.3; é o único chamador sem aba) · **Origem:** FR-006.3
- [X] T027 [US5] E2e: ajustar `tests/e2e/curso-pagina.spec.ts:53-62`, `:95-104`, `:107-219` e o bloco de `:221`, `tests/e2e/turmas.spec.ts:140-150`, `tests/e2e/turmas-lista.spec.ts:147-165`; caso novo em `curso-pagina.spec.ts`: menu *Cursos* → cartão do curso → aba *Sobre o Curso* selecionada, a barra com três botões de **mesma altura** (caixas medidas) e *Nova turma* levando ao formulário; `tests/e2e/cards-levam-a-aba.spec.ts:75-87` continua chegando à Grade · **Origem:** FR-006.1, FR-006.2, FR-006.3, FR-016

### 1.7 — Disciplinas: UEs em tabela e pizza (US5)

- [X] T028 [P] [US5] **Reprova antes**: `tests/unidade/agrupar-em-outras.test.ts` — até 5 categorias intactas; com mais, as 4 maiores e *"Outras (N)"* com a soma preservada; depois criar `agruparEmOutras(categorias, maximo)` em `components/graficos/tipos.ts` respeitando `MAXIMO_DE_CATEGORIAS_NA_PIZZA` · **Origem:** FR-007.2
- [X] T029 [US5] Em `app/(app)/disciplinas/paineis/ProporcaoDaCarga.tsx`: `GraficoPizza` com `agruparEmOutras`, e a lista em texto abaixo com **todas** as disciplinas (FR-007.2; depende de T028) · **Origem:** FR-007.2
- [X] T030 [US5] Em `app/(app)/disciplinas/paineis/PainelDeUnidades.tsx:83-196`: tabela só leitura (número, tópico, CH, situação) com `data-slot="tabela-de-unidades"`; **Editar** por linha (`editar-unidade`) abre o formulário só daquela linha; *Acrescentar unidade* atrás de botão (`acrescentar-unidade`); desativar e excluir continuam (FR-007.1) · **Origem:** FR-007.1
- [X] T031 [US5] E2e: ajustar `tests/e2e/disciplinas.spec.ts:135-169` (a lista virou tabela; o formulário de nova UE abre pelo botão); caso novo: menu *Disciplinas* → curso → expandir disciplina → **0** campos editáveis → *Editar* numa UE → gravar → valor novo; a pizza mostra *"Outras"* num curso com mais de 4 disciplinas · **Origem:** FR-007.1, FR-007.2, FR-016

### 1.10 — Ficha do instrutor (US3)

- [X] T032 [US3] Criar a folha `app/(app)/instrutores/[codigo]/EdicaoDoInstrutor.tsx` (`"use client"`, `Collapsible` como `app/(app)/turmas/[turma]/EdicaoDaTurma.tsx`, nasce fechada, gatilho *"Editar instrutor"* com `data-slot="abrir-edicao-do-instrutor"`); incluir em `tests/unidade/fronteira-das-telas.test.ts` · **Origem:** FR-010.1
- [X] T033 [US3] Em `app/(app)/instrutores/[codigo]/page.tsx:275-316`: barra no topo com `BarraDeAcoes` (T004) — *Editar* (abre T032), *Desativar/Reativar* e *Excluir* (tirados do rodapé do formulário, `:302-314`), cada um com a permissão de hoje; o formulário vai para dentro de `EdicaoDoInstrutor`, com *Gravar alterações* no rodapé (FR-010.1, FR-010.2; depende de T032) · **Origem:** FR-010.1, FR-010.2
- [X] T034 [P] [US3] Em `app/(app)/disciplinas/paineis/PainelDeAvaliacoesDoCurriculo.tsx:86-125`: itens em leitura, com **Editar** por item (`editar-avaliacao-do-curriculo`); o formulário de nova avaliação atrás de botão (FR-010.3) · **Origem:** FR-010.3
- [X] T035 [US3] E2e: criar o auxiliar `abrirEdicaoDoInstrutor` em `tests/e2e/navegar-instrutores.ts` (idempotente, como `abrirEdicaoDaTurma`) e usá-lo nos casos de `tests/e2e/instrutores.spec.ts` que mexem no formulário ou no rodapé sem abrir (`:174-219`, `:237-267`, `:589-638`, `:665-741`, o auxiliar `abrirFicha` de `:765-771` e os casos que ele serve, `:935-1063`), passando Desativar/Excluir para a barra; caso novo: menu *Instrutores* → linha → **0** campos editáveis visíveis (hoje 207) → *Editar* → gravar · **Origem:** FR-010.1, FR-010.2, FR-016, SC-008
- [X] T036 [US3] E2e em `tests/e2e/disciplinas.spec.ts`: menu *Disciplinas* → curso → expandir disciplina → avaliações do currículo em leitura → *Editar* num item → gravar · **Origem:** FR-010.3, FR-016

### 1.15 — Trocar a situação da turma (US1)

- [X] T037 [P] [US1] **Reprova antes**: `tests/unidade/validacao-turma.test.ts` — o esquema de **criação** exige `status`; o de **edição** não o aceita; o de **troca de situação** aceita só `codigo` e `status` válido; depois, dividir `lib/validacao/turma.ts:22-38` nesses três esquemas (FR-015.4) · **Origem:** FR-015.4, FR-017
- [X] T038 [US1] Em `lib/acoes/turma.ts`: Server Action `trocarSituacaoDaTurma` — `safeParse` na primeira linha; `update({ status }).eq("codigo", …).select("codigo")`; zero linhas → `recusaPorAlcance`; erro → `traduzirRecusa`; `revalidatePath` da ficha e da lista; e `atualizarTurma` (`:120-168`) passa a usar o esquema de edição, **sem** `status` (depende de T037) · **Origem:** FR-015.1, FR-015.4, FR-017
- [X] T039 [US1] Em `app/(app)/turmas/FormularioDeTurma.tsx:213-229`: o campo *Situação* só no modo **novo**; depois de gravar a edição, a ficha mostra a confirmação (`data-slot="situacao-gravada"`) pelo parâmetro efêmero da URL (FR-015.2; depende de T038) · **Origem:** FR-015.2, FR-015.4
- [X] T040 [US1] Criar a folha `app/(app)/turmas/[turma]/TrocarSituacao.tsx` (`"use client"`): botão *"Trocar situação"* (`data-slot="trocar-situacao"`) ao lado do selo de `app/(app)/turmas/[turma]/page.tsx:496-506`, diálogo com as quatro situações, chamada a `trocarSituacaoDaTurma`, confirmação ou recusa na tela; montado só com `pode(turmas, editar)` e curso em oferta; incluir em `tests/unidade/fronteira-das-telas.test.ts` (FR-015.1; depende de T038) · **Origem:** FR-015.1, FR-015.2
- [X] T041 [US1] RLS em `tests/invariantes/rls/cursos-e-turmas.test.ts`: corrigir `:564-576` para conferir a linha **no banco** (não só `error === null`); caso negativo novo: o perfil `visualizacao` (sem `turmas/editar`) tenta trocar a situação → **zero** linhas e o banco **não** muda (gotcha 4; DoD 4) · **Origem:** FR-015.1; DoD 4
- [X] T042 [US1] E2e `tests/e2e/turmas-situacao.spec.ts`: **Admin e Encarregado** — menu *Turmas* → linha da turma → *Trocar situação* → escolher → confirmação → **recarregar** → selo com a nova situação; `visualizacao` não vê o botão; *Editar turma* sem o campo *Situação*; a criação (curso → *Nova turma*) com o campo. Reescrever `tests/e2e/turmas.spec.ts:297-313` e `:391-412` pelo botão, provando a gravação (hoje leem o estado local do `<select>`) · **Origem:** FR-015.1, FR-015.2, FR-015.4, FR-016, SC-005

### Prova e entrega do PR 1

- [X] T043 Defeitos deliberados, um de cada vez, desfeitos em seguida e registrados em `specs/016-correcoes-bloco-1/progresso-implement.md`: (a) faixa voltando a sumir em Production → `faixa-beta.test.ts` reprova; (b) a contagem voltando a contar o padrão → `filtros-fora-do-padrao.test.ts` e `filtros-recolhidos.spec.ts` reprovam; (c) `useState(true)` de volta → `filtros-recolhidos.spec.ts` reprova; (d) sem o botão *Trocar situação* → `turmas-situacao.spec.ts` reprova · **Origem:** DoD 8
- [X] T044 `pnpm verificar:tudo` sai 0 (ele faz o `db:reset:limpo`); contagens de unidade, pgTAP, RLS e ponta a ponta em `specs/016-correcoes-bloco-1/progresso-implement.md`; toda reprovação instável isolada e repetida antes de ser chamada de instável (`PEND-014-7`) · **Origem:** SC-011; DoD 1–5
- [X] T045 Commits por item, no padrão do plan §6 (`fix(BLOCO-1)`, `fix(RF-DS-03)`…), e `git push -u origin fix/BLOCO-1-correcoes-de-tela`; abrir o PR na `main` com o template de `.github/` inteiro (sem migration: plano de reversão = reverter o merge) · **Origem:** DoD 7; Princípio VIII
- [X] T046 CI verde nos três blocos, com a **mesma contagem** do `verificar:tudo` (SC-005 da spec 001); registrar o run em `progresso-implement.md` · **Origem:** SC-011
- [X] T047 Escrever `specs/016-correcoes-bloco-1/roteiro-de-conferencia-pr1.md` a partir de `quickstart.md` §*PR 1*, passo a passo por clique no preview · **Origem:** SC-001, SC-005, SC-008, SC-009, SC-010
- [X] T048 **PARE** — conferência de Bernardo no preview pelo roteiro; merge por squash **só com a palavra dele** · **Origem:** plan §1 (P-1)

---

## Grupo PR 2 — DSA, papel e planilha (ramo `fix/BLOCO-1-dsa`, sem banco)

⚠️ **Mesclado entre semanas — sexta à noite ou fim de semana** (P-5).

- [X] T049 Depois do merge do PR 1: `git switch main && git pull`, `git switch -c fix/BLOCO-1-dsa`, `pnpm db:reset:limpo`; anotar o ponto de partida em `specs/016-correcoes-bloco-1/progresso-implement.md` · **Origem:** plan §1 (P-1)

### 1.9 — A semana do curso, "Semana N de T" (US2)

- [X] T050 [P] [US2] **Reprova antes**: `tests/unidade/dsa/semana-do-curso.test.ts` — semana vazia no meio **consome** número (o inverso de `tests/unidade/dsa/numero-do-dsa.test.ts:89`); virada do ano; início numa quinta; T pela duração do curso, pela turma mais longa (37 × 35 → T = 37), sem duração (T = semanas da turma) e sem os dois (rótulo *"Semana N"*); N nunca maior que T; semana antes do início e depois do término → nulo com motivo, nunca zero; a semipresencial C-ApA-AuxNav T2 (início 03/08, etapa 12/10) → *"Semana 11 de 13"*; `avisoDeDuracao` → *"a turma tem 37 semanas e o curso, 35"* só quando a turma é mais longa · **Origem:** FR-009.1, FR-009.3, FR-009.6, FR-009.7, FR-009.8, SC-003; D-COR-1
- [X] T051 [US2] Criar `lib/dominio/dsa/semana-do-curso.ts` (`semanaDoCurso`, `rotuloDaSemana`, `avisoDeDuracao`, as frases de motivo), contando pelas segundas-feiras que `semanaIsoDe` (`lib/dominio/carga-semanal.ts`) devolve; cabeçalho com a D-COR-1 citada literalmente (depende de T050) · **Origem:** FR-009.1, FR-009.3, FR-009.4, FR-009.6, FR-009.8; D-COR-1
- [X] T052 [US2] Leitura: `app/(app)/turmas/[turma]/dsa/consulta.ts:44-45` traz `data_termino` da turma e a leitura traz `cursos.duracao_semanas`; `app/print/dsa/documento.ts:69-73` passa a montar o número com `semanaDoCurso` (tela, papel e planilha passam por ele) (depende de T051) · **Origem:** FR-009.1, FR-009.3
- [X] T053 [US2] Tela: `app/(app)/turmas/[turma]/dsa/NavegacaoDaSemana.tsx:153-155` → *"Semana N de T"* e as datas da semana (`data-slot="semana-atual"`); `DocumentoNaTela.tsx:24-28` → *"Semana N de T"* no lugar de *"Semana 41/2026"* e de *"DSA Nº"*; avisos antes de imprimir em `app/(app)/turmas/[turma]/dsa/page.tsx:291-292` com os motivos novos (depende de T052) · **Origem:** FR-009.2, FR-009.6
- [X] T054 [US2] Papel: `app/print/dsa/DocumentoDoDsa.tsx:110-115` e o rodapé `:227-230` com *"Semana N de T"* (FR-009.2; depende de T052) · **Origem:** FR-009.2; RF-DSA-06, RF-PDF-01
- [X] T055 [US2] Planilha: a fórmula do número em `lib/dominio/dsa/planilha/preenchimento.ts:579-635` vira a semana corrida (diferença de datas ÷ 7 + 1, no vocabulário do Excel 2007, `DP-2` da spec 015), com T; *"DSA Nº"* de `lib/dominio/dsa/planilha/impressao.ts:327`, `:343` e o rótulo de `lib/dominio/dsa/planilha/semanas.ts:51-55` passam a *"Semana N de T"*; retirar de `lib/dominio/dsa/planilha/catalogo.ts` o que só servia à contagem CRONOS (`contaNoNumero`, `semanasComAulaForaDaPasta`); ajustar `tests/unidade/dsa/planilha/sintetico.ts:294-304`, `planilha-preenchimento.test.ts:69-72`, `planilha-impressao.test.ts:155-157`, `planilha-catalogo.test.ts:103-104` e `planilha/comparar-com-o-papel.ts:158`, mantendo a prova *fórmula = função* (FR-009.5; depende de T051) · **Origem:** FR-009.5
- [X] T056 [US2] Apagar `lib/dominio/dsa/numero-do-dsa.ts` e `tests/unidade/dsa/numero-do-dsa.test.ts` depois de migrar os consumidores (T052–T055); apontar a guarda `tests/unidade/distribuicao-unica.test.ts:131`, `:176-183` para `semana-do-curso.ts`; ajustar `tests/unidade/dsa/impressao.test.ts:420-437` e `tests/invariantes/leitura-paginada.test.ts:28`, `:189-193`, `:225` · **Origem:** FR-009.4; RN-DIST-01
- [X] T057 [US2] Aviso de duração na ficha: `lib/dominio/avisos-da-turma.ts` (`avisosDaTurma`) ganha o aviso do `avisoDeDuracao` (teste em `tests/unidade/avisos-da-turma.test.ts`), a ficha `app/(app)/turmas/[turma]/page.tsx` passa a ler `cursos.duracao_semanas`, e `QuadroDeAvisosDaTurma.tsx` o exibe (FR-009.7; depende de T051) · **Origem:** FR-009.7
- [X] T058 [US2] E2e `tests/e2e/dsa-semana-do-curso.spec.ts`: semear uma turma com a forma medida da C-Ap-FR 2026 (curso de 35 semanas, turma de 37, duas semanas sem aula) → menu *Turmas* → turma → aviso *"a turma tem 37 semanas e o curso, 35"* → *Abrir o DSA* → *Ir para a semana do dia* (28ª semana) → *"Semana 28 de 37"* → *Imprimir* → o mesmo no papel, sem *"Nº"*; ajustar o auxiliar `tests/e2e/percurso-do-dsa.ts:27` (exige *"semana X de 2026"*, serve 14 suítes), `tests/e2e/dsa-imprimir.spec.ts:340-345` e `tests/e2e/dsa-ver.spec.ts:324`, `:331`, `:341`, `:391` · **Origem:** FR-009.2, FR-009.7, FR-016, SC-003

### 1.11 — Dia com 7 TA e bloco que atravessa o almoço (US2, regressão)

- [X] T059 [P] [US2] Caso de regressão: em `tests/unidade/dsa/planilha-preenchimento.test.ts`, um dia com regime 7, 4 TA de manhã e um bloco de 1 a 7 → **7** linhas preenchidas na entrada; e2e `tests/e2e/dsa-sete-tempos.spec.ts` com a turma semeada nessa forma → menu *Turmas* → turma → *Abrir o DSA* → o dia mostra *"parte 1 de 2"* (4 TA) e *"parte 2 de 2"* (3 TA) → *Imprimir* → os 7 TA no papel (FR-011.1) · **Origem:** FR-011.1, SC-013

### 1.12 — Sugestão de instrutor e técnica, ordem estável (US2)

- [X] T060 [P] [US2] **Reprova antes**: em `tests/unidade/dsa/grade.test.ts`, dois lançamentos começando no mesmo TA, entregues em **duas ordens** → o mesmo ocupa a grade nas duas, e o outro vai para *"sem posição"* com o motivo *"no mesmo TA de outro lançamento"* (FR-012.3) · **Origem:** FR-012.3
- [X] T061 [US2] Em `lib/dominio/dsa/grade.ts`: `FatoDaSemana` ganha `criadoEm` e `codigo`; ordenar por (TA inicial, criado em, código); o segundo do mesmo TA vai para a faixa sem posição; a constante do motivo passa a morar aqui e `lib/dominio/dsa/planilha/preenchimento.ts:82` a importa; e um caso em `tests/unidade/dsa/impressao.test.ts` e outro em `tests/unidade/dsa/planilha-preenchimento.test.ts` provam o segundo lançamento em *"sem posição"* **no papel e na planilha**, não só na tela (FR-012.3; depende de T060) · **Origem:** FR-012.3
- [X] T062 [US2] Em `app/(app)/turmas/[turma]/dsa/leitura.ts`: trazer `codigo` e `criado_em` dos fatos (`:377` e as leituras de avaliações, atividades e sessões); corrigir as atribuições por UE (`:490-497`) para `turma_disciplina!inner(turma_id)` com `status = 'ativo'`, como `app/(app)/turmas/[turma]/dsa/planilha/leitura.ts:106-117`; ler `turma_disciplina_instrutor` ativas da turma e `tecnica_ensino_sugerida` de UEs (`:560-569`) e disciplinas; apagar o `tecnicaSugerida: null` de `:1248`; repassar `erros` (`:743`, `:760`, `:1445-1470`) para a tela mostrar um aviso (`data-slot="aviso-de-leitura"`) em vez de lista vazia (FR-012.1) · **Origem:** FR-012.1, FR-012.2
- [X] T063 [US2] Em `app/(app)/turmas/[turma]/dsa/FormularioDeLancamento.tsx:309-318`: sugerir instrutor e técnica por `preencherLancamento` (`lib/dominio/dsa/pre-preenchimento.ts`), cascata UE → disciplina na turma → vazio, com a lista em antiguidade pelo `SeletorInstrutor` canônico (`RN-ANT-01`); a sugestão é editável e nunca bloqueia (FR-012.2; depende de T062) · **Origem:** FR-012.2; RF-DSA-08, FR-014 da spec 013, RN-ANT-01
- [X] T064 [P] [US2] Em `app/(app)/turmas/[turma]/dsa/planilha/leitura.ts:75`, `:208-209`: retirar `FALHA_CONHECIDA_DO_DSA`, que deixa de existir (depende de T062) · **Origem:** FR-012.1
- [X] T065 [US2] **Reprova antes**: invariante em `tests/invariantes/leitura-do-dsa.test.ts` (sessão real, como `tests/invariantes/leitura-paginada.test.ts`) — semear uma atribuição por UE e uma por disciplina e conferir que a leitura do DSA devolve as duas; com o filtro antigo (`turma_id`) plantado, reprova · **Origem:** FR-012.1
- [X] T066 [US2] E2e `tests/e2e/dsa-sugestao.spec.ts`: turma semeada com instrutor atribuído na disciplina → menu *Turmas* → turma → *Abrir o DSA* → clicar num tempo vazio → escolher disciplina e UE → o instrutor vem preenchido e pode ser trocado · **Origem:** FR-012.2, FR-016, SC-006

### 1.8 — Cartão do DSA (US2)

- [X] T067 [P] [US2] Em `components/ciaara/grade-dsa.tsx`, `CorpoDoCartao` (`:205-280`) e `CorpoDoBloco` (`:124-182`): **nome** da disciplina em destaque, **código** depois, técnica numa linha própria e discreta (`data-slot="cartao-tecnica"`); o rótulo acessível começa pelo nome; o papel (`app/print/dsa/DocumentoDoDsa.tsx`) e a planilha **não** mudam; caso em `tests/e2e/dsa-grade.spec.ts`, chegando por clique (menu *Turmas* → turma → *Abrir o DSA*), conferindo a ordem nome → código e a técnica separada (FR-008) · **Origem:** FR-008.1, FR-008.2, FR-016; RF-DSA-03

### 1.5 — DD/MM/AAAA em todo o sistema (US5)

- [X] T068 [US5] **Reprova antes**: reforçar `tests/unidade/formato-de-data.test.ts` — reprovar template de **dois** pedaços com `padStart`, `.slice(0, 5)` sobre data formatada, `Intl.DateTimeFormat` fora de `lib/formato/`, e contar imports relativos no controle positivo (`:175`); rodar e ver reprovar nas ocorrências de hoje (FR-005.4) · **Origem:** FR-005.4, SC-002
- [X] T069 [US5] Em `lib/dominio/dsa/grade-do-papel.ts:90`, `:98`: o cabeçalho dos dias por `dataParaLeitura` (DD/MM/AAAA) e a lista de dias de `lib/formato/data.ts` (`DIA_DA_SEMANA`), apagando o formatador e a lista próprios (e a de `lib/dominio/dsa/planilha/preenchimento.ts:71`); ajustar `tests/unidade/dsa/grade-do-papel.test.ts:112` (depende de T068) · **Origem:** FR-005.1
- [X] T070 [US5] Planilha com ano: `lib/dominio/dsa/planilha/impressao.ts:193-197`, `:381-382`, `:591-592` (`dataPorExtenso` com ano), `lib/dominio/dsa/planilha/cronos.ts:78` e `lib/dominio/dsa/planilha/semanas.ts:54`; ajustar `tests/unidade/dsa/planilha-impressao.test.ts:126` e `tests/unidade/dsa/planilha-semanas.test.ts:41-42` (FR-005.1; depende de T068) · **Origem:** FR-005.1
- [X] T071 [P] [US5] Rótulo acessível em DD/MM/AAAA: `components/ciaara/grade-alocacao.tsx:296-304` usa o rótulo da coluna em vez da chave ISO; `lib/dominio/dsa/itens-da-disciplina.ts:97` formata a data da aplicação · **Origem:** FR-005.1
- [X] T072 [US5] `/atividades`: os filtros *De* e *Até* (`app/(app)/atividades/FiltrosDeAtividades.tsx:48-49`) viram campo de data — novo tipo `data` em `components/ciaara/filtro-avancado.tsx` (`<input type="date">`, valor ISO na URL); e2e novo em `tests/e2e/atividades-filtro-de-data.spec.ts` (não há arquivo próprio de `/atividades` hoje): menu *Atividades* → *Filtros* → escolher a data → a URL em ISO e a lista filtrada (FR-005.2) · **Origem:** FR-005.2, FR-005.3, FR-016
- [X] T073 [US5] E2e em `tests/e2e/dsa-imprimir.spec.ts`, chegando por clique (menu *Turmas* → turma → *Abrir o DSA* → *Imprimir*): o cabeçalho dos dias com o ano, e o papel **continua numa página A4** (asserção de `RF-PDF-01`) · **Origem:** FR-005.1, FR-016; RF-PDF-01

### Prova e entrega do PR 2

- [X] T074 Defeitos deliberados, desfeitos e registrados em `progresso-implement.md`: (a) a contagem CRONOS de volta → `semana-do-curso.test.ts` e `dsa-semana-do-curso.spec.ts` reprovam; (b) o filtro `turma_id` de volta → `leitura-do-dsa.test.ts` reprova; (c) o formatador `diaMes` de volta → `formato-de-data.test.ts` reprova · **Origem:** DoD 8
- [X] T075 `pnpm verificar:tudo` sai 0; contagens em `specs/016-correcoes-bloco-1/progresso-implement.md` · **Origem:** SC-011
- [X] T076 Commits por item (`fix(RF-DSA-06)`, `fix(RF-DSA-08)`, `fix(RF-DSA-03)`, `test(RF-DSA-03)`, `fix(BLOCO-1)`); `git push -u origin fix/BLOCO-1-dsa`; PR na `main` com o template inteiro e o aviso de **merge entre semanas** · **Origem:** DoD 7
- [X] T077 CI verde nos três blocos com a mesma contagem; run em `progresso-implement.md` · **Origem:** SC-011
- [X] T078 Escrever `specs/016-correcoes-bloco-1/roteiro-de-conferencia-pr2.md` a partir de `quickstart.md` §*PR 2* (com a cópia do remoto no local para a C-Ap-FR 2026 e a C-Exp-Obs-ME 2026), mais a **medição do SC-006** sobre essa cópia: para cada linha de turma com instrutor atribuído (92 na cópia de 17/10/2026), `preencherLancamento` devolve instrutor — resultado em `progresso-implement.md` · **Origem:** SC-003, SC-006, SC-013
- [X] T079 **PARE** — conferência de Bernardo no preview; merge por squash **só com a palavra dele**, **entre semanas** (sexta à noite ou fim de semana) · **Origem:** plan §0 (P-5) · *Feita em 18/10/2026: APROVADO, com dois ajustes no papel e três dúvidas do lote a aplicar neste PR (T079.1–T079.6).*

### Ajustes da conferência de 18/10/2026 (Bernardo Villas Boas), neste PR, antes do merge

*Subnúmeros de propósito: T080 em diante já são do PR 3.*

- [X] T079.1 **A** — o campo do cabeçalho num rótulo só, *"Semana do curso: 28 de 37"*, na tela e no papel (`campoDaSemanaDoCurso` em `lib/dominio/dsa/semana-do-curso.ts`); a IMPRESSÃO da planilha não tem o rótulo e não repete; reprovou antes em `dsa-semana-do-curso`, `dsa-imprimir` e `dsa-ver` · **Origem:** FR-009.2
- [X] T079.2 **B** — o quadro de CH em duas colunas não cruza as assinaturas (`app/print/dsa/documento.css`); `tests/e2e/dsa-rodape-do-papel.spec.ts` compara as caixas e conta 1 página; reprovou antes · **Origem:** SC-001 da spec 013
- [X] T079.3 **Dúvida 2** — tela e planilha só sugerem instrutor a partir de linha de turma **ativa** (as quatro consultas de atribuição filtram `turma_disciplina.status`); `tests/invariantes/leitura-do-dsa.test.ts` reprovou antes · **Origem:** FR-012.1
- [X] T079.4 **Dúvida 6** — `limparDsa` apaga as atribuições pela `turma_disciplina_id` e confere o erro (`apagarLinhasDaTurma` em `tests/e2e/dsa-de-teste.ts`, também em `dsa-etapa-presencial.spec.ts`); o caso novo de `leitura-do-dsa.test.ts` reprovou antes · **Origem:** DoD 4
- [X] T079.5 **Dúvida 7** — `salas.spec.ts:126`, `dsa-tipo-e-global.spec.ts:160` e `avaliacoes-nas-telas.spec.ts:53` na `PEND-014-7` do `CLAUDE.md`
- [X] T079.6 Unidade + ponta a ponta do DSA e da impressão → commit → push → CI verde → roteiro curto de A e B; **merge por squash só se o CI ficar verde antes de 19/10/2026, 06:00 (Brasília)** — depois disso, PARE (o merge fica para sexta à noite); com o merge, CI verde na `main`, Production servindo o merge e o ramo apagado (local e remoto). **Não começar o PR 3.** · *Mesclado por squash em `5e55f97` em 19/10/2026, 00:21 (antes das 06:00); CI verde na `main` (run `39194326183`); deploy de Production de `5e55f97` `success` (deployment `7164936267`); ramo `fix/BLOCO-1-dsa` apagado, local e remoto.*

---

## Grupo PR 3 — banco e o que depende dele (ramo `db/BLOCO-1-execucao-e-ch-prevista`)

- [X] T080 Depois do merge do PR 2: `git switch main && git pull`, `git switch -c db/BLOCO-1-execucao-e-ch-prevista`, `pnpm db:reset:limpo`; anotar em `progresso-implement.md` · **Origem:** plan §1 (P-1) · *Feita em 19/10/2026: ramo criado da `main` `5e55f97` por `git switch -c` (não troca arquivo; o OneDrive não atrapalhou).*

### As migrations e as provas de banco

- [X] T081 [US1] `supabase migration new execucao_ate_uma_data` e escrever a **M1** exatamente como `specs/016-correcoes-bloco-1/contracts/migrations.md` §M1: `public.vw_chd_por_fato` (`security_invoker`), `public.chd_da_turma_ate(p_ate date)` e `public.execucao_por_disciplina_ate(p_ate date, p_turma_id uuid)` (`stable`, `security invoker`, `search_path = ''`, **sem** valor padrão), os `revoke`/`grant`; cabeçalho com o por quê (D-COR-2, Q-5, NQ-1), a medição citada com o artefato e o plano de reversão. **O nome do arquivo não é renomeado** depois · **Origem:** FR-014.1, FR-014.3, FR-014.5; RF-INI-01, D-COR-2
- [X] T082 [US3] `supabase migration new janela_da_ch_prevista` e escrever a **M2** como `contracts/migrations.md` §M2: o corpo inteiro de `supabase/migrations/20260926005750_ch_prevista_com_security_invoker.sql` com a janela pela primeira fonte com as duas datas (linha da turma → disciplina → turma) e `with (security_invoker = true)`; cabeçalho com o por quê (Q-7), a medição e a reversão · **Origem:** FR-013.1, FR-013.2, FR-013.5; RN-INST-04
- [X] T083 [P] [US1] pgTAP `supabase/tests/135_execucao_ate_uma_data.sql`: invariantes **base sem corte = `vw_carga_horaria_turma.chd_executada`** por turma e **= `vw_disciplinas_execucao.ta_executados`** por turma × disciplina; o caso sintético (2 TA ontem, 1 no dia, 3 amanhã, avaliação pendente de 2 e vista de 1 depois) → `chd_da_turma_ate(dia)` = 3 e a view = 9; borda do dia inclusiva; funções `stable`, não `security definer`, `pronargdefaults = 0`; **nenhum** `current_date`/`now()`/`current_timestamp`/`localtimestamp` no corpo, lido sem comentário; base sem escrita para `authenticated`; `anon` sem `execute` (depende de T081) · **Origem:** FR-014.1, FR-014.3, FR-014.5; DoD 3, DoD 8
- [X] T084 [P] [US3] pgTAP `supabase/tests/136_janela_da_ch_prevista.sql`: (1) período só na linha da turma → ano preenchido; (2) sem período na linha nem na disciplina, turma com janela → ano e janela da turma; (3) linha da turma e disciplina diferentes → vence a linha; (4) nenhuma fonte com as duas datas → ano do primeiro início e término nulo; (5) `vw_instrutor_carga_anual.ta_previsto_ano` conta o caso 1; (6) colunas iguais às de antes, na mesma ordem; `security_invoker` mantido (depende de T082) · **Origem:** FR-013.1, FR-013.2; DoD 3, DoD 8
- [X] T085 `pnpm db:reset:limpo`; os pgTAP 135 e 136 passam e os demais continuam passando; `pnpm db:tipos` e `git add lib/tipos/database.ts` **antes** do `verificar:tudo` (o CI compara com o índice) · **Origem:** FR-013.5, FR-014.5; DoD 3
- [X] T086 [US1] RLS `tests/invariantes/rls/execucao-ate.test.ts` (sessão real): um perfil com alcance restrito recebe de `chd_da_turma_ate` **só** as turmas do alcance; o Admin recebe todas (controle positivo); `anon` sem `execute` · **Origem:** FR-014.5; DoD 4 · *O controle positivo é o Encarregado de escopo geral, não o Admin: nenhuma conta da suíte pode ser Admin (gotcha 8).*
- [X] T087 Reversão provada (DoD 6): numa base descartável, aplicar M1 e M2, reverter (o SQL de `plano-de-aplicacao-no-remoto.md` §*A reversão*) e conferir `scripts/provas/impressao_digital_do_esquema.sql` voltando ao valor de antes; registrar em `specs/016-correcoes-bloco-1/plano-de-aplicacao-no-remoto.md` · **Origem:** FR-013.5, FR-014.5; DoD 6
- [X] T088 [P] Versionar a medição `scripts/provas/medir_bloco_1.sql`: o *antes* pelas views de hoje e pela regra antiga da janela, o *depois* pelas funções e pela view novas — por turma (executada, e as entradas do andamento), por turma × disciplina e por instrutor (CH prevista de 2026); conferir que reproduz as tabelas de `contracts/migrations.md` sobre a cópia `remoto-20261017-005738.sql` · **Origem:** SC-004, SC-007

### Domínio

- [X] T089 [P] [US1] **Reprova antes**: reescrever em `tests/unidade/andamento-da-turma.test.ts` os casos U1, U2, U3, U4 e U7 com os dias úteis **de amanhã**, mais a borda de hoje num sábado e numa segunda, `diaSeguinte` na virada do mês e do ano, e o relógio às 23:30 em São Paulo (já dia seguinte em UTC) pelo `hojeNaCiaara`; depois, em `lib/dominio/andamento-da-turma.ts`, criar `diaSeguinte(iso)` e contar os dias úteis de `diaSeguinte(hoje)`, com a D-COR-2 citada no cabeçalho · **Origem:** FR-014.1, FR-014.2, FR-014.3; RF-INI-01
- [X] T090 [P] [US3] **Reprova antes**: `tests/unidade/media-semanal.test.ts` (a média cadastrada vence; sem `semanas`, CH ÷ semanas da janela por `semanasDaJanela`; sem janela, nulo); depois criar `lib/dominio/media-semanal.ts` com a `RN-DIST-02` citada literalmente; o `describe` do teste leva o identificador **`RN-DIST-02`** (Risco Alto — Princípio VIII.3) · **Origem:** FR-013.3; RN-DIST-02 · *A divisão (`mediaSemanalDaJanela`) mora em `distribuicao-semanal.ts`: a guarda `distribuicao-unica.test.ts` reprova divisão de carga por semanas fora dele; `media-semanal.ts` decide a precedência.*
- [X] T091 [P] [US3] **Reprova antes**: `tests/unidade/so-habilitado.test.ts` (habilitada sem atribuição no ano → marcada; atribuída noutro ano → marcada; atribuída no ano → não); depois criar `lib/dominio/so-habilitado.ts` · **Origem:** FR-013.4

### Telas — "fora do DSA, executado é até hoje"

- [X] T092 [US1] `/inicio`: em `app/(app)/inicio/page.tsx:126-130` acrescentar ao `Promise.all` a chamada `chd_da_turma_ate` com `hojeNaCiaara()`, e em `app/(app)/inicio/panorama.ts:120-137` usar essa executada no `andamentoDaTurma` (depende de T081, T085 e T089) · **Origem:** FR-014.1, FR-014.3, FR-014.4
- [X] T093 [US1] Ficha da turma: em `app/(app)/turmas/[turma]/page.tsx:201-205`, `:247-258`, a executada do andamento por `chd_da_turma_ate` filtrada pela turma (depende de T081 e T089) · **Origem:** FR-014.1, FR-014.4
- [X] T094 [US1] Tabela de disciplinas da ficha **e** `/disciplinas` — a mesma leitura: em `app/(app)/disciplinas/consulta.ts:380` trocar `vw_disciplinas_execucao` por `execucao_por_disciplina_ate(hoje, turma)` (depende de T081) · **Origem:** FR-014.4 · *`/disciplinas` não mostra execução por turma desde 04/10/2026: a leitura é a mesma da tabela da ficha.*
- [X] T095 [US1] Aba Avaliações: em `app/(app)/turmas/[turma]/consulta-de-avaliacoes.ts:71`, `ta_executados` e `data_real_inicio` de `execucao_por_disciplina_ate(hoje, turma)` (depende de T081) · **Origem:** FR-014.4
- [X] T096 [US1] `/turmas`: em `app/(app)/turmas/page.tsx:61` ler, num `Promise.all`, `chd_da_turma_ate`, a carga curricular, o regime vigente e os feriados de dia inteiro, e em `app/(app)/turmas/TabelaDeTurmas.tsx` as colunas **Progresso** (todas; `data-slot="coluna-progresso"`) e **Saldo (TA)** (só ativa e planejada; *"—"* nas demais; `coluna-saldo`), com a marca de atraso do `/inicio`; registrar o terceiro consumidor em `tests/unidade/andamento-unico.test.ts:45` (FR-014.6, P-4; depende de T081 e T089) · **Origem:** FR-014.6, SC-012
- [X] T097 [US3] Ficha do instrutor: em `app/(app)/instrutores/[codigo]/page.tsx:180-210` a média por `mediaSemanalDaAtribuicao` na lista e no alerta de faixa; `CargaDoInstrutor.tsx` mostra a média de reserva; na leitura das habilitações (`FichaEmLeitura.tsx`) a marca *"só habilitado — não gera CH prevista"* (`data-slot="so-habilitado"`) por `disciplinasSoHabilitadas`, e a frase junto da CH prevista (`explica-ch-prevista`) (FR-013.3, FR-013.4; depende de T082, T090 e T091) · **Origem:** FR-013.3, FR-013.4

### Ponta a ponta

- [X] T098 [US1] **O caso que discrimina**: acrescentar à semente `tests/e2e/panorama-de-teste.ts` **um lançamento futuro** (atualizando o comentário de `:74-76`) e criar `tests/e2e/andamento-ate-hoje.spec.ts`: menu *Início* (o saldo não o conta) → menu *Turmas* → turma (andamento e tabela de disciplinas não o contam; aba *Avaliações* idem) → menu *Disciplinas* → curso → turma (idem) → *Abrir o DSA* na semana dele → a situação **o conta**. Rodar contra o commit anterior às telas (T092–T095) e registrar a **reprovação** em `progresso-implement.md` · **Origem:** FR-014.1, FR-014.4, FR-016, SC-004; DoD 8 · *Reprovou antes (*"Expected: 10 — Received: 18"* no `/inicio`); o passo do DSA compara a semana do lançamento com a anterior. A aba Avaliações e `/disciplinas` ficam fora do caso (ver `progresso-implement.md`).*
- [X] T099 [US1] E2e em `tests/e2e/turmas-lista.spec.ts`: menu *Turmas* → as colunas *Progresso* (todas as turmas) e *Saldo (TA)* (ativa e planejada; *"—"* em concluída e cancelada), com a marca de atraso igual à do `/inicio` · **Origem:** FR-014.6, FR-016, SC-012
- [X] T100 [US3] E2e em `tests/e2e/instrutores.spec.ts`: instrutor semeado com atribuição sem período na disciplina → menu *Instrutores* → linha → a CH prevista do ano inclui a atribuição; uma habilitação sem atribuição marcada *"só habilitado — não gera CH prevista"* · **Origem:** FR-013.1, FR-013.4, FR-016, SC-007

### Prova e entrega do PR 3

- [X] T101 Defeitos deliberados, desfeitos e registrados: (a) `current_date` como padrão de `p_ate` → pgTAP 135 reprova; (b) a janela voltando a `disciplinas.previsao_*` → pgTAP 136 reprova; (c) a executada voltando à view sem corte → `andamento-ate-hoje.spec.ts` reprova; (d) a função como `security definer` → RLS `execucao-ate.test.ts` reprova · **Origem:** DoD 8
- [X] T102 `pnpm verificar:tudo` sai 0; contagens em `specs/016-correcoes-bloco-1/progresso-implement.md` · **Origem:** SC-011 · *Saiu 1 por 4 casos: o erro do meu teste (corrigido) e três da `PEND-014-7`, que isolados deram 83 de 83 com os arquivos tocados.*
- [X] T103 Commits (`db(RF-INI-01)` para a M1, `db(RN-INST-04)` para a M2, `test(…)`, `feat(RF-INI-01)`, `fix(RN-INST-04)`); `git push -u origin db/BLOCO-1-execucao-e-ch-prevista`; PR na `main` com o template inteiro, o **plano de reversão das duas migrations** e a declaração de **por que as duas funções são RPC e não Server Action** (Princípio XI.5: a soma precisa do banco e da RLS de quem lê; a regra do andamento continua em `lib/dominio/`) · **Origem:** DoD 6, DoD 7; Princípio XI.5 · *PR #69; commits `9157204` (M1), `e03d570` (M2), `a262554`, `fba4021`, `2ae6b1f`, `7d562f8`.*
- [X] T104 CI verde nos três blocos com a mesma contagem; run em `progresso-implement.md` · **Origem:** SC-011 · *Run `39204161859`: 2.383 · 800 · 335 · 517 (511 + 6 pulados), sem instável.*

### O rito do remoto (`plano-de-aplicacao-no-remoto.md`) — antes da conferência, porque o preview lê o banco remoto

- [X] T105 Portão 9.4: conferir que M1 e M2 **são** o desenho aprovado em 17/10/2026 (`contracts/migrations.md`); qualquer diferença volta a Bernardo antes de seguir · **Origem:** FR-013.5, FR-014.5; regra 9.4
- [X] T106 Backup: `python -m scripts.manutencao.dado_do_remoto --somente-copia`; citar o arquivo datado em `specs/016-correcoes-bloco-1/plano-de-aplicacao-no-remoto.md` (passo 3) · **Origem:** FR-013.5, FR-014.5 · *`remoto-20261019-024230.sql`.*
- [X] T107 Remedir sobre o dado do dia: `python -m scripts.manutencao.dado_do_remoto` (traz o retrato para o local, com as migrations do ramo) e rodar `scripts/provas/medir_bloco_1.sql`; comparar com as tabelas de `contracts/migrations.md`. **Se o efeito mudou, atualizar as tabelas e PARAR para Bernardo** (decisão de 17/10/2026) · **Origem:** FR-013.5, FR-014.5, SC-004, SC-007 · *Remedido sobre o backup restaurado no local (sem novo `dado_do_remoto`, para não ler o remoto de novo): o efeito é o do desenho; as diferenças vêm do avanço da data, explicadas linha a linha em `plano-de-aplicacao-no-remoto.md`.*
- [X] T108 **PARE** — pedir a autorização explícita de Bernardo para o `db push`, com o CI verde (T104) e a medição batendo (T107) · **Origem:** FR-013.5, FR-014.5 · *Autorização condicional de Bernardo Villas Boas, 19/10/2026, cumprida pela T107.*
- [X] T109 `supabase db push --linked --dry-run` lista **só** M1 e M2 · **Origem:** FR-014.5
- [X] T110 `supabase db push --linked` · **Origem:** FR-014.5
- [X] T111 Conferência só de leitura, registrada no `plano-de-aplicacao-no-remoto.md` (passo 7): `supabase migration list --linked` N e N; impressão digital do esquema igual nos dois bancos; `security_invoker=true` em `vw_chd_por_fato` e `vw_instrutor_carga_prevista`; as duas funções com `pronargdefaults = 0`, `prosecdef = false` e `execute` só para `authenticated`; **0** policies de `DELETE`; a medição refeita no remoto por `python -m scripts.provas.medir_no_remoto` (colunas em ordem alfabética), batendo com a do T107 · **Origem:** FR-013.5, FR-014.5
- [X] T112 Production respondendo: `/login` 200 e as protegidas 307; registrar · **Origem:** FR-014.5
- [X] T113 Escrever `specs/016-correcoes-bloco-1/roteiro-de-conferencia-pr3.md` a partir de `quickstart.md` §*PR 3*, e voltar o local à base limpa (`pnpm db:reset:limpo`) depois de usá-lo com o dado real · **Origem:** SC-004, SC-007, SC-012
- [X] T114 **PARE** — conferência de Bernardo no preview; merge por squash **só com a palavra dele** · **Origem:** plan §1 (P-1) · *Aprovado por Bernardo Villas Boas em 19/10/2026 (dúvidas 1 a 5 como deixadas; a 6 virou a `PEND-016-5`); mesclado por squash em `c7313c3`.*

---

## Fase final — Encerramento da spec

- [X] T115 Depois do merge do PR 3: CI verde na `main`, Production servindo o merge (provado por uma tela que só o merge mostra), e os três ramos apagados, local e remoto, conferidos por `gh pr list --state merged` (`git merge-base` mente para squash) · **Origem:** plan §1; DoD · *CI da `main` verde nos três blocos sobre `c7313c3` (run `39231123999`: 2.383 · 800 · 335 · 517 casos de ponta a ponta, 510 + 1 instável + 6 pulados; o instável é o `avaliacoes-nas-telas.spec.ts:53`, já na `PEND-014-7`); o deploy de `c7313c3` no ambiente Production saiu `success` (a tela que só o merge mostra é autenticada: a prova é o deploy do commit, por decisão de Bernardo Villas Boas, 19/10/2026); os ramos dos PRs #67, #68 e #69 apagados, local e remoto.*
- [X] T116 Atualizar o `CLAUDE.md` (*Estado atual e onde retomar*: a spec 016 encerrada; a tabela de pendências com a **`PEND-016-1`** — unificar a composição da CHD —, a **dependência do Bloco 2** — os "TA fora do DSA" da D-COR-3 somam na base da M1 — e o D20 residual) e o *Status* de `specs/016-correcoes-bloco-1/spec.md`; marcar o Bloco 1 como feito em `docs/correcoes/plano-de-correcoes-em-blocos.md`; varrer o que sobe por nome de pessoa real antes do push; e conferir que **nenhuma** regra do documento 04 mudou (`git diff` de `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md` entre a `main` de partida e a de chegada: vazio) · **Origem:** plan §0.1 (PEND-016-1, dependência do Bloco 2); FR-018 · *`CLAUDE.md`, `spec.md`, `plan.md` (§0 e §0.1, com a `PEND-016-5`) e o plano de correções; na tabela de pendências do `CLAUDE.md`, `PEND-016-1`, `-2`, `-4`, `-5`, a dependência do Bloco 2 e o D20 residual (e a `PEND-DSA-SUGESTAO` riscada, fechada pelo #68); `git diff b8f7100 c7313c3` do documento 04 (`.md` e `.docx`): vazio; nome de pessoa real nas linhas acrescentadas do `git diff` do ramo `docs/BLOCO-1-encerramento`: só `Bernardo Villas Boas`.*

---

## Dependências e ordem

```text
Preparação (T001–T003)
   └─ PR 1: T004 → [1.1 | 1.2 | 1.3 | 1.4 | 1.6 | 1.7 | 1.10 | 1.15] → T043–T048 PARE → merge
        └─ PR 2: T049 → [1.9 → 1.11] [1.12] [1.8] [1.5] → T074–T079 PARE → merge entre semanas
             └─ PR 3: T080 → banco (T081–T088) → domínio (T089–T091) → telas (T092–T097)
                       → e2e (T098–T100) → T101–T104 → rito (T105–T112) → T113–T114 PARE → merge
                            └─ Encerramento (T115–T116)
```

- **Entre PRs:** estrito. Cada PR nasce da `main` depois do merge do anterior (P-1).
- **Dentro do PR 1:** T004 antes de T025 e T033 (as duas barras). Os oito itens são independentes entre
  si; só disputam `tests/e2e/instrutores.spec.ts` (T022 e T035) e `tests/e2e/disciplinas.spec.ts` (T031 e
  T036) — fazer em sequência nesses dois arquivos.
- **Dentro do PR 2:** 1.9 antes do 1.11 (o 1.11 usa a semana nova no e2e); 1.12 e 1.8 tocam
  `components/ciaara/grade-dsa.tsx` e `lib/dominio/dsa/grade.ts` — em sequência; o 1.5 toca a planilha
  depois do 1.9 (T055 antes de T070).
- **Dentro do PR 3:** migrations e `db:tipos` (T081–T085) antes das telas; o domínio (T089–T091) em
  paralelo com o banco; o e2e que discrimina (T098) roda **antes** das telas para registrar a reprovação;
  o rito (T105–T112) **antes** da conferência no preview.

## Paralelismo

| PR | Pode correr junto |
|---|---|
| 1 | T005, T012, T015, T018, T028, T034, T037 (testes e módulos em arquivos distintos); T009 e T010 |
| 2 | T050, T060, T067, T071 |
| 3 | T083 e T084; T088; T089, T090 e T091 |

### Exemplo — o começo do PR 1

```text
Em paralelo:  T005 faixa-beta.test.ts · T012 vocabulario/contraste · T015 campo-de-senha.tsx
              T018 filtros-fora-do-padrao.test.ts · T028 agrupar-em-outras · T037 validacao-turma.test.ts
Depois:       T006 → T007 → T008 (faixa) · T019 → T020 → T021 (filtros) · T038 → T039/T040 (situação)
```

## Estratégia de entrega

- **MVP = PR 1** (US4 inteira e as partes de US1, US3 e US5 que são só tela): é o que os testadores sentem
  primeiro — faixa, senha, filtros, fichas, a situação da turma à mão.
- **PR 2** entrega a US2 inteira e fecha a US5, **entre semanas**.
- **PR 3** fecha a US1 (o andamento até hoje) e a US3 (a CH prevista), depois do rito do remoto.
- Cada PR para na conferência de Bernardo; nenhum merge sem a palavra dele.

## Totais

| | Tarefas |
|---|---|
| Preparação | 3 (T001–T003) |
| PR 1 | 45 (T004–T048): US4 13 · US5 14 · US3 5 · US1 6 · fundação 1 · fechamento 6 |
| PR 2 | 31 (T049–T079): US2 18 · US5 6 · abertura 1 · fechamento 6 — e mais 6 da conferência de 18/10/2026 (T079.1–T079.6) |
| PR 3 | 35 (T080–T114): US1 11 · US3 6 · banco e provas sem história 3 (T085, T087, T088) · abertura 1 · fechamento e rito 14 |
| Encerramento | 2 (T115–T116) |
| **Total** | **116**, das quais **21** marcadas `[P]` |

*(Contagem medida no próprio arquivo, depois de escrito.)*

## Requisitos sem tarefa, de propósito
- **FR-011.2** — *"nenhuma correção de código é feita por este item"* (o 1.11 é sem objeto; fica o caso de
  regressão da T059).
- **FR-015.3** — a observação por troca de status é do **Bloco 2** (D-COR-4).

## O que NÃO está aqui
- Implementação: as tarefas começam no `/speckit-implement`.
- Escrita no remoto fora do rito do PR 3, e o `db push` sem a autorização explícita de Bernardo (T108).
- A `PEND-016-1` (unificar a composição da CHD) e os "TA fora do DSA" do Bloco 2: registrados no plan §0.1,
  sem tarefa.
- Os Blocos 2 a 6.
