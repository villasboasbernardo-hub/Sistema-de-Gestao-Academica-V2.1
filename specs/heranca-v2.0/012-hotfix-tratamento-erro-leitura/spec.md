# Feature Specification: Hotfix — Tratamento de Erro Ausente em Chamadas de Leitura ao Backend

**Feature Branch**: `012-hotfix-tratamento-erro-leitura`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "HOTFIX: Tratamento de Erro Ausente em Chamadas de Leitura ao
Backend. Auditoria estática de todos os módulos encontrou 14 funções em 8 arquivos front-end que
fazem uma chamada gs(...) de leitura sem nenhum .catch() — diferente de toda chamada de escrita
(salvar/cadastrar/excluir), que sempre tem .catch(e => alert(...)). Se o backend lançar um erro,
a tela correspondente fica em branco/desatualizada sem nenhuma mensagem. Adicionar tratamento de
erro visível ao usuário nas 14 chamadas, zero alteração de lógica de negócio/backend."

## Contexto e achados confirmados no código antes desta spec

Achado de uma auditoria estática desta sessão (não de um relato do usuário) — varredura cruzando
toda chamada `gs('...')` de cada um dos 13 arquivos de view contra as funções de backend, feita
com um script Node ad hoc que isola cada função declarada e verifica se `.catch` aparece em algum
lugar do seu corpo. Confirmado por leitura direta do código de cada arquivo afetado, não só pelo
script.

**O padrão real do projeto, hoje**: toda chamada de **escrita** (`gs('salvar...')`,
`gs('cadastrar...')`, `gs('atualizar...')`, `gs('excluir...')`/`gs('crudExcluir', ...)`) sempre
termina em `.catch(e => alert(e && e.message ? e.message : e))` — sem exceção, em todo arquivo do
projeto. Já as chamadas de **leitura** (`gs('listar...')`, `gs('getEstatisticas...')`,
`gs('getContextoInicial')`-adjacentes, `gs('getPainelavaliacoesCurso', ...)` etc.) **nunca** têm
`.catch` em **15 pontos**, espalhados por 7 arquivos (2 correções de contagem: o pedido original
desta spec dizia "14 funções em 8 arquivos" — a tabela abaixo sempre teve 15 linhas e 7 arquivos
distintos, contados errado tanto no resumo de `/speckit.specify` quanto, por transcrição, em
`plan.md`/`data-model.md`/`tasks.md`; corrigido em todos durante `/speckit-implement`, quando o
script de auditoria voltou a apontar `carregarCursosVinculados` como pendente mesmo depois de
"todos os 14" estarem supostamente tratados):

| Arquivo | Função | Disparo |
|---|---|---|
| `app/(app)/avaliacoes/page.tsx` | `aoTrocarTurmaAvaliacao` | usuário seleciona turma (`onchange`) |
| `app/(app)/avaliacoes/page.tsx` | `popularFiscalVistaProva` | **automático no boot** (`contexto-pronto`) |
| `app/(app)/avaliacoes/page.tsx` | `carregarPainelavaliacoes` | usuário expande um cartão de curso |
| `app/(app)/cronograma/page.tsx` | `garantirNomesInstrutores_` | usuário abre/troca a visão do Cronograma |
| `app/(app)/cursos/[curso]/page.tsx` | `renderizarDetalheCurso` | usuário expande um cartão de curso |
| `app/(app)/cursos/[curso]/page.tsx` | `aoTrocarTurmaCurso` | usuário seleciona turma (`onchange`) |
| `app/(app)/cursos/[curso]/page.tsx` | `aoClicarCardDisciplina` | usuário expande um cartão de disciplina |
| `app/(app)/cursos/[curso]/page.tsx` | `aoTrocarTurmaEstudoIndividual` | usuário seleciona turma (`onchange`) |
| `app/(app)/disciplinas/page.tsx` | `carregarDisciplinas` | usuário seleciona curso (`onchange`) |
| `app/(app)/disciplinas/page.tsx` | `carregaravaliacoesPlanejadas` | usuário seleciona curso (`onchange`) |
| `app/(app)/instrutores/page.tsx` | `carregarInstrutores` | **automático no boot** + após cada escrita |
| `app/(app)/instrutores/page.tsx` | `carregarDisciplinasParaVinculo` | **automático no boot** |
| `app/(app)/relatorio/page.tsx` | `carregarTotalizadoresCurso` | usuário expande um cartão de curso |
| `app/(app)/admin/usuarios/page.tsx` | `carregarusuarios` | **automático no boot** (só para perfil Admin) |
| `app/(app)/admin/usuarios/page.tsx` | `carregarCursosVinculados` | usuário abre a edição de um usuário Encarregado de Curso |

**Não existe rede de segurança global** — confirmado por `grep -rn "unhandledrejection\|window.onerror" app/*.html`, nenhum resultado. Uma rejeição não tratada nessas 15 funções produz, no melhor caso, um erro de console invisível ao usuário; a seção da tela que dependia daquele dado simplesmente não é preenchida, sem nenhum aviso.

**Quando isso acontece de verdade**: qualquer timeout de rede (o chamada direta da Server Action já tem timeout de 30s
embutido), qualquer exceção de backend, ou — o caso mais realista deste sistema — uma checagem de
escopo (`exigirEscopoCurso_`/`exigirEscopoTurma_`, Épico F) barrando um usuário
Encarregado_Curso/Operador que tenta ver um curso/turma fora do seu escopo.

**4 das 15 chamadas disparam automaticamente no carregamento da página** (`contexto-pronto`), antes
de qualquer ação do usuário — um `alert()` bloqueante nesse momento seria uma regressão de UX real
(uma janela modal aparecendo sem nenhuma ação do usuário), diferente das outras 11, que já
acontecem em resposta a um clique/seleção do próprio usuário (onde `alert()` após a ação é o
padrão já estabelecido em toda chamada de escrita do projeto).

**Mecanismo já existente e não usado para isto**: `mostrarAvisoNivel2(containerId, mensagem)` /
`limparAviso(containerId)` (`components/ciaara/`, Design System §5) — um banner amarelo dispensável,
não-bloqueante, já usado no projeto para avisos informativos. Nunca foi usado para erro de
leitura.

## Clarifications

### Session 2026-08-16

- Q: As 14 chamadas devem usar o mesmo `alert()` bloqueante já padronizado nas chamadas de escrita do projeto, ou o banner não-bloqueante `mostrarAvisoNivel2` já existente (nunca usado para erro até hoje)? → A: mista — `mostrarAvisoNivel2` (banner) só nas 4 chamadas automáticas do boot (evita modal-surpresa sem ação do usuário); `alert()` nas outras 10, disparadas por clique/seleção do usuário (consistente com o padrão já usado em toda chamada de escrita do projeto).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Falha numa leitura disparada por ação do usuário mostra um aviso claro (Priority: P1)

Um usuário clica para expandir um cartão de curso/disciplina, ou troca a seleção de turma/curso num
dropdown, e a chamada ao backend correspondente falha (timeout, exceção, ou bloqueio de escopo).
Hoje a seção simplesmente não aparece, sem nenhuma explicação — o usuário não sabe se está
carregando, se não há dado, ou se algo quebrou.

**Why this priority**: É a maioria dos 15 pontos (11 de 15) e o cenário mais frequente na prática —
o usuário está ativamente navegando quando o erro acontece.

**Independent Test**: Forçar uma falha numa das 11 funções disparadas por ação do usuário (ex.:
simular timeout/erro do backend) e confirmar que aparece uma mensagem de erro visível, no mesmo
padrão já usado pelas chamadas de escrita do projeto.

**Acceptance Scenarios**:

1. **Given** o usuário clica para expandir um cartão de curso, **When** a chamada de leitura
   correspondente falha, **Then** uma mensagem de erro visível aparece, informando o usuário sem
   travar a navegação do restante da tela.
2. **Given** o usuário troca a turma selecionada num dropdown, **When** a chamada de leitura
   correspondente falha, **Then** uma mensagem de erro visível aparece no mesmo padrão.

---

### User Story 2 - Falha numa leitura automática do carregamento da página não interrompe o usuário com um modal surpresa (Priority: P1)

Ao carregar a página, 4 chamadas de leitura disparam automaticamente antes de qualquer ação do
usuário (ex.: carregar a lista de usuários para o Admin). Se uma delas falhar, o usuário precisa
saber — mas sem uma janela modal bloqueante aparecendo do nada, antes que ele tenha feito qualquer
coisa.

**Why this priority**: Mesma prioridade da User Story 1 — sem isso, a mesma classe de bug (silêncio
total) continua existindo nos 4 pontos mais visíveis do sistema (tudo que roda no boot).

**Independent Test**: Forçar uma falha numa das 4 funções automáticas de boot e confirmar que
aparece um aviso não-bloqueante (banner), sem nenhum `alert()`/modal interrompendo o carregamento
da página.

**Acceptance Scenarios**:

1. **Given** o usuário é Admin e a página carrega, **When** `carregarusuarios` falha,
   **Then** um banner de aviso (não-bloqueante) aparece na tela de Usuários, sem interromper o
   carregamento do resto da aplicação.
2. **Given** a página carrega para qualquer perfil, **When** `popularFiscalVistaProva` ou
   `carregarInstrutores`/`carregarDisciplinasParaVinculo` falha, **Then** um banner de aviso
   aparece na tela correspondente, sem `alert()`.

---

### Edge Cases

- Duas das 15 falham na mesma sessão, em telas diferentes: cada aviso é independente — um banner
  de uma tela nunca aparece/permanece em outra tela.
- Usuário navega para outra tela antes do erro aparecer (chamada assíncrona lenta): o aviso, ao
  chegar, aparece no container correto daquela tela específica — se o usuário já não está mais
  naquela tela, o aviso fica visível quando ele voltar (mesmo comportamento do `mostrarAvisoNivel2`
  já existente, que não desaparece sozinho).
- A mesma função de leitura falha duas vezes seguidas (ex.: usuário tenta de novo): o segundo aviso
  substitui o primeiro, nunca empilha dois avisos duplicados no mesmo container.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cada uma das 11 chamadas de leitura disparadas por ação direta do usuário (tabela em
  "Contexto e achados") DEVE, ao falhar, mostrar `alert(e && e.message ? e.message : e)` — mesmo
  padrão já usado por toda chamada de escrita do projeto (Clarifications 2026-08-16).
- **FR-002**: Cada uma das 4 chamadas de leitura disparadas automaticamente no carregamento da
  página (`popularFiscalVistaProva`, `carregarInstrutores`, `carregarDisciplinasParaVinculo`,
  `carregarusuarios`) DEVE, ao falhar, mostrar um aviso não-bloqueante via `mostrarAvisoNivel2`
  (reaproveitando o mecanismo já existente em `components/ciaara/`) num container próprio da tela
  correspondente — nunca `alert()`/`confirm()` (Clarifications 2026-08-16, SC-002).
- **FR-003**: Nenhuma das 15 correções pode alterar o que é enviado ao backend, o nome de nenhuma
  função de backend, ou o comportamento em caso de sucesso — só o caminho de falha, hoje
  inexistente, ganha tratamento.
- **FR-004**: Onde uma tela já tem um container de aviso reaproveitável para a função em questão
  (ex.: um container de erro já usado por outra função da mesma tela), a nova chamada de
  `mostrarAvisoNivel2`/`alert` reaproveita esse container/padrão em vez de criar um novo elemento
  HTML — só cria um container novo quando a tela genuinamente não tem nenhum ponto de aviso
  reaproveitável.

### Key Entities

*Não aplicável — nenhuma entidade de dados nova ou alterada; esta spec é inteiramente sobre
tratamento de erro no front-end.*

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das 15 chamadas de leitura auditadas, uma falha do backend produz uma
  mensagem visível ao usuário — zero casos de "tela fica em branco sem explicação".
- **SC-002**: Nenhuma das 4 chamadas automáticas do boot pode disparar uma janela modal bloqueante
  (`alert()`/`confirm()`) sem nenhuma ação prévia do usuário.
- **SC-003**: O comportamento de sucesso das 15 chamadas (o que é exibido quando a leitura funciona)
  permanece byte-a-byte idêntico ao de antes desta spec.

## Assumptions

- Escopo restrito exatamente aos 15 pontos já identificados por leitura direta do código — não uma
  varredura especulativa por mais pontos hipotéticos, nem uma reescrita do padrão de erro do
  projeto inteiro (constitution Princípio IX).
- Nenhuma mudança de backend, nenhuma mudança de schema — inteiramente front-end, mesmo perfil do
  Hotfix 010 e do Épico D.
- A classificação "automático no boot" vs. "disparado por ação do usuário" (tabela em "Contexto e
  achados") foi determinada por leitura direta de cada `document.addEventListener('contexto-pronto',
  ...)` e `onclick`/`onchange` do código — não é uma suposição.
- Nenhum teste automatizado novo é viável para esta spec — as 15 correções são, por definição, sobre
  o que acontece quando uma chamada a Server Action falha, que é DOM/rede, fora do alcance de
  `pnpm vitest run` (mesma limitação registrada em todo hotfix visual anterior desta sessão).
