# Implementation Plan: Navegação recolhível e o módulo de Turmas

**Branch**: `feat/EPICO-5.5-navegacao-e-turmas` | **Date**: 04/10/2026 | **Spec**: [spec.md](spec.md)

**Input**: `specs/012-navegacao-e-turmas/spec.md`, clarificada em 04/10/2026; `estado-atual.md`
(retrato medido em 03/10, corrigido em 04/10); a leitura de 04/10/2026 em `research.md`.

## Summary

Três PRs, sem migration, sem dependência nova. **PR 1** troca a lateral fixa por uma recolhida que
expande ao apontar e fixa por cookie lido no servidor — a interação fica na folha de cliente que já
existe. **PR 2** cria `/turmas`, põe *Turmas* no menu, move o bloco por turma de `/disciplinas` para
a ficha com os mesmos painéis e as mesmas ações, e faz os endereços antigos redirecionarem. **PR 3**
cria `lib/dominio/andamento-da-turma.ts` com as fórmulas da v1.0, dá à ficha as seções Andamento e
Disciplinas com executada e %, e **faz `/inicio` consumir o mesmo cálculo** — hoje ele acusa atraso no
excesso e nunca no atraso (medido). O TA/dia vem do regime vigente do curso, escolhido pela modalidade
da turma; nada novo no banco.

## Technical Context

**Language/Version**: TypeScript `strict`, Next.js 16.3.3 (App Router, `proxy.ts`), React 19.2.8
**Primary Dependencies**: `@supabase/ssr` 0.12.5 · `@supabase/supabase-js` 2.112.4 · `nuqs` · `radix-ui` 1.6.7 · `lucide-react` 1.43.0 · Tailwind v4 — **nenhuma nova** (Q3, definitiva; medido em `research.md` §1.5-1.6)
**Storage**: Supabase PostgreSQL — **sem migration**; leitura de `turmas`, `cursos`, `feriados`, `vw_carga_horaria_turma`, `vw_cursos_regime_vigente`, `vw_disciplinas_execucao`; um cookie de interface fora do banco
**Testing**: Vitest (unidade e guardas) · Playwright (e2e por clique, porta 3100) · pgTAP (**nenhuma asserção nova** — nada estrutural muda)
**Target Platform**: Vercel (preview por ramo; Production por exceção `FR-016.1`), navegador de escritório ≥ 1024px e telefone (gaveta)
**Project Type**: aplicação web, Server Components por padrão, folhas de cliente contadas por teste
**Performance Goals**: uma consulta de turmas por tela (`SC-008`); nenhuma consulta por linha; a lateral não acrescenta JavaScript além de um `onClick`
**Constraints**: `lib/dominio/` puro (ESLint); casca sem `@/lib/acoes/`; listas fechadas de folhas de cliente; guarda T070 do endereço de turma; regra de cor por ESLint em `components/**`; `"gordura"` proibida por guarda; não tocar o remoto; não carregar dado
**Scale/Scope**: 28 turmas, 24 cursos, 26 feriados, ~1.753 registros de aula — base pequena; clareza antes de desempenho

## Constitution Check

*GATE: avaliado antes da pesquisa e reavaliado depois do desenho (Fase 1). Veredito: **passa**, com uma nota no X.*

| Princípio | Veredito | Por quê, medido |
|---|---|---|
| I · Fidelidade à Fase 1 | ✅ | Cita `RF-INI-01`, `RF-CURSO-01/03/06`, `RF-NAV-02`, `RN-CRONOS-01`, `RN-EVT-02`, `RN-MAT-04`; a ordem nova do menu é decisão nominal datada (D-NAV-1) que **substitui** a MENU-1, registrada nos dois lugares que a citam |
| II · Preservação de regras | ✅ | Nenhuma `RN-` muda. A fórmula da v1.0 entra **como testemunho datado** (não está no repositório) e o cabeçalho do módulo diz isso. O conserto de `/inicio` não é regra nova: é o código passar a dizer o que o `RF-INI-01` já dizia |
| III · Plataforma | ✅ | Server Components, `nuqs`, shadcn/Radix, zero pacote novo. O cookie é exceção **declarada** à regra da URL (D-NAV-2, `FR-010`) |
| IV · Integridade do histórico | ✅ | Nenhuma escrita em dado; nenhum `DELETE`; a trilha de nada é tocada |
| V · Degradação segura | ✅ | *sem dado*, *sem término*, *ainda sem lançamentos* são estados da tela, nunca zero inventado; *em atraso* é alerta, nunca bloqueio (`FR-033`) |
| VI · Mudança cirúrgica por invariantes | ✅ | A guarda de ausência de `/turmas` é **invertida**, não apagada; o caso que discrimina de `/inicio` vira nos dois sentidos; a estrutura do banco é conferida idêntica antes e depois |
| VII · Configuração sobre constante | ✅ | TA/dia é **dado** (regime vigente), não constante; `8` fixo e parâmetro novo foram proibidos e não entram |
| VIII · Rastreabilidade | ✅ | D-NAV-1..4 na spec; MENU-1 superada com data em `casca.md`; cabeçalhos vencidos emendados com data, não apagados |
| IX · Contenção de escopo | ✅ | Navegação e consolidação; zero lançamento, avaliação ou atividade; VIRADA-1 intocada |
| X · Paridade antes de novidade | ✅ com nota | A lateral recolhível e a lista `/turmas` são **UX e navegação**, não funcionalidade de negócio — a regra 3 fala em *"funcionalidade nova de negócio"*. O indicador de andamento **existia na v1.0** (`getDashboardGeral`): é paridade |
| XI · O banco é a fronteira | ✅ | `/turmas` lê sob `turmas_ler`; o redirecionamento não contorna nada; o cookie não autoriza nada |

**Complexity Tracking**: nenhuma violação a justificar.

## O plano, em três PRs

⚠️ **A ordem é a do pedido e também a da dependência**: a lateral não depende de nada; a lista precisa
existir antes de a ficha virar destino; o andamento precisa da ficha com a seção de disciplinas para
reconciliar as somas.

### PR 1 — A lateral recolhível *(US1)*

**Sem migration. Zero pacote novo. Nenhuma rota nova.**

1. `lib/navegacao/menu.ts` — `EntradaDeMenu.icone: NomeDeIcone`; a lista na ordem da **D-NAV-1**
   (sete entradas; *Turmas* entra no PR 2); o cabeçalho reescrito: a validação vigente é a D-NAV-1
   (04/10/2026), e a MENU-1 fica citada como a anterior.
2. `specs/008-shell-e-estado-na-url/contracts/casca.md` — sessão de 04/10/2026 **ao lado** da de 11/09.
3. `components/casca/icones-do-menu.tsx` — o mapa `NomeDeIcone → lucide` (servidor). Os oito ícones
   são a **D2** do lote.
4. `app/(app)/layout.tsx` — lê `cookies().get("ciaara-lateral")` e passa `lateralFixada` à casca.
5. `components/casca/casca-do-app.tsx` → `navegacao-lateral.tsx` — passam a prop; a lateral renderiza
   ícone + rótulo (`sr-only` quando recolhida), `data-fixada` no `<nav>`, e o controle de fixar
   **depois** da lista. Continua **servidor**.
6. `components/casca/painel-retratil.tsx` — a folha ganha `fixadaInicial`, o `onClick` do controle
   (alterna `data-fixada`/`aria-pressed`, grava o cookie) e **nada de hover em JS**: expansão por
   `lg:hover:`/`lg:focus-within:`/`data-[fixada=true]:` (`contracts/lateral.md` §3). A gaveta abaixo
   de `lg` não muda.
7. `components/ui/tooltip.tsx` — usado **só** no controle de fixar (D3).
8. Testes: `tests/unidade/fronteira-casca.test.ts` — a frase de `painel-retratil.tsx` em
   `COM_INTERACAO` passa a dizer o que ele faz agora (a lista **não cresce**); `texto-tenue` — o
   `veste:` de *"em breve"* sobrevive à reescrita; novo `tests/e2e/lateral.spec.ts` com os seis casos
   de `contracts/lateral.md` §7, incluindo o anti-flash pelo instrumento de `tema.spec.ts`.
9. **Defeito deliberado** (DoD 8): servir `data-fixada="false"` com cookie `fixada` — o caso do flash
   **reprova**; devolver — passa. Fica registrado no PR.

**Merge quando**: `verificar:tudo` verde, CI idêntico, conferência de Bernardo pelo roteiro do PR 1.

### PR 2 — Turmas: a lista, o menu, os links cruzados, os redirecionamentos e o bloco movido *(US2, US3)*

**Sem migration.**

1. `lib/navegacao/contrato.ts` — entrada `/turmas` (`curso`, `ano`, `situacao`, `busca`; constante
   nova `SITUACOES_DE_TURMA`); `/turmas/[turma]` ganha `aberta`; `/disciplinas` **perde**
   `situacao_turma` e `instrutor` e **mantém** `turma` com papel de endereço antigo (D5). Cabeçalho
   das linhas 473-479 emendado com data (D-NAV-3).
2. `lib/navegacao/endereco-de-turma.ts` — `enderecoDasTurmas(sigla?)`,
   `enderecoDaSecaoDeDisciplinas(codigo)`, `ROTA_DA_FICHA_DA_TURMA`; `endereco-de-turma.test.ts` cobre
   a grafia do `nuqs` em `?curso=`.
3. `tests/unidade/contrato-de-parametros.test.ts` — o bloco `FR-031.7` **invertido** em guarda de
   presença, citando a D-NAV-1; a asserção *"formulários não declaram parâmetro"* nomeia `aberta`
   como exceção, com a razão.
4. `app/(app)/turmas/page.tsx` + `consulta.ts` (`montarConsultaDeTurmas` pura) + `FiltrosDeTurmas.tsx`
   + `TabelaDeTurmas.tsx` — o molde de `/instrutores`; estado vazio por `alcanceDoPerfil`.
   `fronteira-das-telas` ganha as duas folhas.
5. `lib/navegacao/menu.ts` — `{ rotulo: "Turmas", rota: "/turmas", icone: "turmas", disponivel: true }`
   na terceira posição, **no mesmo commit** do item 4.
6. `app/(app)/turmas/[turma]/page.tsx` — cabeçalho novo (`FR-021`), `voltar-a-lista` no lugar de
   `voltar-ao-curso` (D-NAV-3), link do curso mantido, âncora `#disciplinas`; `hoje` por
   `hojeNaCiaara()`; `disciplinasAtivas` real **na ficha** (D6).
7. `app/(app)/turmas/[turma]/DisciplinasDaTurma.tsx` (folha) — `TabelaDensa` + detalhe com
   `PainelDePeriodo` e `PainelDeInstrutores` importados de `app/(app)/disciplinas/paineis/`; dado de
   `lerGradeDeDisciplinas`; `useParametro("/turmas/[turma]", "aberta")`.
8. `app/(app)/disciplinas/page.tsx` — `redirect(enderecoDaSecaoDeDisciplinas(valores.turma))` antes de
   qualquer consulta; `hoje` por `hojeNaCiaara()`. `GradeDeDisciplinas.tsx` perde os ramos
   `porTurma`; `CascataDeCursoETurma.tsx` vira só curso.
9. `app/(app)/cursos/[curso]/AbaGrade.tsx` — *"Ver todas as turmas"* → `enderecoDasTurmas(sigla)`;
   botão *Disciplinas* com turma → `enderecoDaSecaoDeDisciplinas`.
10. `lib/acoes/disciplina.ts` e `lib/acoes/atribuicao.ts` — `revalidatePath(ROTA_DA_FICHA_DA_TURMA, "page")`.
11. e2e: novo `turmas-lista.spec.ts` (menu → lista → ficha, filtros na URL, limpar, vazio);
    novo `enderecos-antigos.spec.ts` (a tabela de `contracts/turmas.md` §4); `turmas.spec.ts:180-185`
    (volta), `disciplinas.spec.ts:70-95` (`irAGradePorClique` sem turma) e `curso-pagina.spec.ts`
    (ver todas) reescritos; `shell.spec.ts` passa a contar oito sem mudar linha.
12. **Defeito deliberado**: trocar o `redirect` por um `href` montado à mão com `/turmas/${…}` — a
    guarda T070 **reprova**; devolver.

**Merge quando**: `verificar:tudo` verde, CI idêntico, conferência de Bernardo (lista, ficha, edição na
seção, os sete endereços antigos).

### PR 3 — O andamento, e o Início consumindo o mesmo cálculo *(US4)*

**Sem migration.**

1. `lib/dominio/andamento-da-turma.ts` — `diasUteisEntre`, `capacidadeDiaria`, `andamentoDaTurma`
   (`contracts/andamento.md` §1), cabeçalho com o `RF-`/`RN-` e a citação da v1.0 **como testemunho
   datado**. `tests/unidade/andamento-da-turma.test.ts` com os doze casos, cada número calculado
   antes de escrito.
2. `components/ciaara/barra-de-progresso.tsx` (servidor, `role="progressbar"`, tokens) + amostra em
   `/estilo` (D10).
3. `app/(app)/turmas/[turma]/page.tsx` + `consulta.ts` — leitura de `vw_carga_horaria_turma` (1 linha),
   `vw_cursos_regime_vigente` (1 linha) e `feriados` dia inteiro no intervalo, em `Promise.all`; a
   seção **Andamento** (`contracts/andamento.md` §2); a seção Disciplinas ganha CH executada e %,
   com o rodapé que reconcila e o aviso dos lançamentos sem UE (§3).
4. `app/(app)/inicio/page.tsx` + `panorama.ts` — três leituras a mais (`turmas` com `data_termino` e
   `modalidade`; regime por curso; feriados até o maior término); `montarPanorama` delega
   `emAtraso` e `percentual` ao módulo; **nada mais do painel muda** (`FR-031.2`); cabeçalho de
   `panorama.ts` reescrito.
5. `tests/e2e/panorama-de-teste.ts` — a semente com três turmas e `data_termino` (§5 do contrato);
   `inicio.spec.ts` com os **dois vereditos virados**; `cursos-de-teste.ts`, `instrutores-de-teste.ts` e
   `url-degradada.spec.ts` rodados. Novo `andamento.spec.ts` na ficha (os cinco estados da seção).
6. Guardas novas: `vocabulario-proibido.test.ts` (`SC-007`) e `andamento-unico.test.ts` (`SC-006`).
7. **O caso que discrimina, executado na ordem certa**: semente nova → `inicio.spec.ts` **reprova**
   com o `panorama.ts` antigo → trocar o cálculo → passa. A reprovação fica anotada no PR.
8. `roteiro-de-conferencia.md` com o **caso calculado à mão** sobre uma turma real do banco local
   (`quickstart.md` §3), datado.

**Merge quando**: `verificar:tudo` verde, CI idêntico, a conta à mão batendo número a número no
preview, conferência de Bernardo.

## Estrutura

```text
specs/012-navegacao-e-turmas/
├── spec.md · estado-atual.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/{lateral,turmas,andamento}.md
├── checklists/requirements.md
└── tasks.md                       # /speckit-tasks

lib/navegacao/menu.ts              # icone, ordem D-NAV-1, Turmas (PR 2)
lib/navegacao/contrato.ts          # /turmas; /turmas/[turma].aberta; /disciplinas −2
lib/navegacao/endereco-de-turma.ts # +3 exports
lib/dominio/andamento-da-turma.ts  # NOVO (PR 3)
components/casca/{painel-retratil,navegacao-lateral,casca-do-app}.tsx · icones-do-menu.tsx (NOVO)
components/ciaara/barra-de-progresso.tsx (NOVO, PR 3)
app/(app)/layout.tsx               # lê o cookie
app/(app)/turmas/{page.tsx,consulta.ts,FiltrosDeTurmas.tsx,TabelaDeTurmas.tsx}   (NOVOS, PR 2)
app/(app)/turmas/[turma]/{page.tsx,consulta.ts,DisciplinasDaTurma.tsx (NOVO)}
app/(app)/disciplinas/{page.tsx,GradeDeDisciplinas.tsx,CascataDeCursoETurma.tsx}
app/(app)/cursos/[curso]/AbaGrade.tsx
app/(app)/inicio/{page.tsx,panorama.ts}
lib/acoes/{disciplina,atribuicao}.ts   # revalidação da ficha
tests/unidade/{andamento-da-turma,andamento-unico,vocabulario-proibido}.test.ts (NOVOS)
tests/e2e/{lateral,turmas-lista,enderecos-antigos,andamento}.spec.ts (NOVOS) · panorama-de-teste.ts
```

**Structure Decision**: a árvore existente, sem pasta nova além de `app/(app)/turmas/` ganhar a lista.
Os painéis por turma **ficam** em `app/(app)/disciplinas/paineis/` e são importados pela ficha — mover
para `components/` é proibido (importam Server Actions) e mover para `turmas/` separaria os de curso
dos de turma sem ganho.

## Riscos, com o que fazer

| Risco | O que fazer |
|---|---|
| **O Playwright clica num link do menu enquanto a lateral anima** (hover → expande → clique) e o alvo muda de lugar | expansão por CSS, `duration-150`, `motion-reduce:transition-none`; o Playwright espera a caixa estável. Se instabilizar, a classe é a `e2e-instrutores-fragil-sob-carga`: isolar com `--workers=1` antes de culpar o ramo |
| **`entrar()` trava a suíte inteira** se o `<nav>` recolhido não for "visível" | `w-14`, nunca `hidden`; o primeiro e2e a rodar no PR 1 é `shell.spec.ts` |
| **O estado "fixada" pisca** | lido no servidor; provado pelo instrumento de `tema.spec.ts` na primeira escrita do atributo; defeito deliberado no PR 1 |
| **Um `redirect`/`href` com `/turmas/` à mão** | a guarda T070 reprova; tudo pelo módulo |
| **A ficha mostra período/instrutores velhos depois de gravar** | `revalidatePath(ROTA_DA_FICHA_DA_TURMA, "page")` nas duas ações; e2e grava e confere sem recarregar |
| **`inicio.spec.ts` continua verde depois da troca** (não discrimina) | semente com `turmaEmExcesso` e `turmaSemCapacidade`; rodar **antes** da troca e ver reprovar |
| **A semente do panorama é compartilhada por quatro arquivos** | os quatro rodam no PR 3; a mudança de nomes (`turmaAtrasada` → `turmaEmExcesso`) é feita por grep |
| **Turma EAD com regime sem limite (é o estado da semente)** | `sem_regime`, sem fallback (D8); a semente passa a ter o limite |
| **Lançamento sem UE não reconcilia por disciplina** (1.566 linhas do ETL) | a tela diz quantos TA estão fora; reportado, não corrigido |
| **`hoje` difere entre São Paulo e o `current_date` do PostgreSQL** (regime vigente) | reportado; só entre 21h e meia-noite, e só muda qual vigência vale nesse intervalo |
| **`disciplinasAtivas` real faz o aviso `sem_disciplina` aparecer** | é a D6; na aba Grade fica `1`; na ficha o aviso passa a dizer a verdade |
| **A lista de folhas de cliente de `fronteira-das-telas` esquece uma folha nova** | o teste reprova nos dois sentidos — é a guarda fazendo o trabalho |

## Dúvidas em lote

Estão no relatório desta rodada, numeradas **D1 a D12**, com opções, implicações e recomendação; as
de implementação (D1, D10, D11, D12) estão também em `research.md` como decisão com alternativa. **Todas
foram adotadas como padrão provisório** para o plano sair completo; nenhuma torna impossível continuar.
