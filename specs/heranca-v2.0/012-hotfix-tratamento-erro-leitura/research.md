# Research — Hotfix Tratamento de Erro em Leituras

Nenhum `NEEDS CLARIFICATION` restou em `plan.md` — a única ambiguidade real desta spec (mecanismo
de apresentação de erro) já foi resolvida em `/speckit.specify`. Este documento registra as
decisões de implementação.

## 1. Padrão para as 10 chamadas disparadas por ação do usuário (US1, FR-001)

**Decisão**: `.catch(e => alert(e && e.message ? e.message : e))` ao final da cadeia `.then()` já
existente de cada uma das 10 funções — texto idêntico, char por char, ao já usado em toda chamada
de escrita do projeto (`salvarDisciplina`, `salvarInstrutor`, `salvarUsuario` etc.).

**Rationale**: Zero padrão novo — reaproveita literalmente a mesma linha já escrita 14+ vezes no
projeto. `aoTrocarTurmaAvaliacao` é a única das 10 com `Promise.all([...])` (3 chamadas a Server Action
simultâneas) — um único `.catch` no fim do `.then()` já cobre a falha de qualquer uma das 3 (é
assim que `Promise.all` já se comporta: a primeira rejeição rejeita o `Promise.all` inteiro).

**Alternatives considered**: Nenhuma — o padrão já está estabelecido no projeto, replicá-lo é a
escolha de menor risco (research.md desta spec não precisa inventar nada).

## 2. Container de aviso para as 4 chamadas automáticas do boot (US2, FR-002)

**Decisão**: reaproveitar um container `mostrarAvisoNivel2` já existente em cada tela, escolhido
pelo formulário/seção mais relacionada à chamada que pode falhar (FR-004, "reaproveita antes de
criar"):

| Função | Container reaproveitado | Por quê |
|---|---|---|
| `popularFiscalVistaProva` (`app/(app)/avaliacoes/page.tsx`) | `#avisoVistaProva` | popula o dropdown `vistaFiscalInstrutor`, dentro do mesmo formulário de vista de prova |
| `carregarInstrutores` (`app/(app)/instrutores/page.tsx`) | `#avisoInstrutor` | é a lista principal de instrutores da tela, mesmo container do formulário de cadastro |
| `carregarDisciplinasParaVinculo` (`app/(app)/instrutores/page.tsx`) | `#avisoVinculo` | popula o dropdown `vincGrade`, dentro do formulário de vínculo de habilitação |
| `carregarusuarios` (`app/(app)/admin/usuarios/page.tsx`) | `#avisoUsuario` | único container de aviso já existente na tela; não há um container dedicado à tabela de usuários, e criar um novo só para isto contrariaria FR-004 |

**Rationale**: os 4 containers já existem, já são estilizados (`.mt-2`, dentro do `<form>`
correspondente), e já são usados pelo `.catch` de escrita da mesma tela — reaproveitá-los para
erro de leitura é consistente com o próprio propósito do elemento (mostrar aviso relacionado
àquele formulário/seção), não uma apropriação forçada.

**Alternatives considered**: criar um container novo, topo de página, para cada uma das 4 telas —
rejeitado, FR-004 pede reaproveitamento explícito antes de criar elemento novo, e os 4 containers
já existentes cobrem exatamente os pontos certos.

## 3. Como testar manualmente uma falha real (quickstart.md)

**Decisão**: a técnica mais realista e não-destrutiva é logar como um perfil com escopo restrito
(`Encarregado_Curso` vinculado a um único curso, ou `Operador` com `Escopo_Curso` diferente de
`Geral`) e tentar abrir/interagir com um curso fora daquele escopo — `exigirEscopoCurso_`/
`exigirEscopoTurma_` (Épico F, ``lib/supabase/middleware.ts` + policies RLS`) lança um `Error` real, sem precisar alterar nenhum
arquivo do projeto para forçar a falha.

**Rationale**: é o cenário de falha mais realista deste sistema especificamente (citado em
`spec.md` §"Contexto e achados") — testar com o mecanismo de RBAC já existente prova o
comportamento com um erro genuíno do backend, não uma falha simulada artificialmente.

**Alternatives considered**: desconectar a internet momentaneamente para forçar o timeout de 30s
do a Server Action — funciona, mas testa só a categoria "timeout", não "erro de permissão/lógica", que é o
caso mais provável na prática deste projeto.

## 4. Comportamento de sobrescrita do aviso (Edge Case de `spec.md`)

**Achado (confirmado por leitura de `components/ciaara/`, nenhuma mudança necessária)**:
`mostrarAvisoNivel2(containerId, mensagem)` já faz `el.innerHTML = ...` (sobrescreve, nunca
concatena) — uma segunda chamada já substitui a primeira automaticamente, satisfazendo o Edge Case
"nunca empilha dois avisos duplicados" sem nenhum código adicional desta spec.
