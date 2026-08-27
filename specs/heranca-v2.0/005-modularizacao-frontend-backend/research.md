# Research — Épico B: Modularização do Frontend e do Backend

Nenhum `NEEDS CLARIFICATION` restou no Technical Context do `plan.md` — este documento registra as
decisões técnicas concretas encontradas ao ler o código real antes de extrair qualquer bloco, não
resoluções de ambiguidade de requisito (essas já foram fechadas em `/speckit-clarify`).

## Achado 1 — Como a nova `app/(app)/avaliacoes/page.tsx` reage à troca de curso sem acoplar arquivos

**Decisão**: reusar o padrão de guarda já existente em ``app/(app)/cursos/[curso]/page.tsx`:127` —
`if (typeof carregarTotalizadoresCurso === 'function') carregarTotalizadoresCurso(idCurso);` — para
todo ponto de integração entre `aoTrocarCurso()` (que continua em `app/(app)/cursos/[curso]/page.tsx`, dono do
`<select id="cursoSelecao">`) e as funções que hoje vivem no mesmo arquivo mas vão mudar de casa
(`carregarPainelavaliacoes`, `carregarTotalizadoresCurso`). Depois da extração:

```js
// `app/(app)/cursos/[curso]/page.tsx` — aoTrocarCurso(), depois da extração
if (typeof carregarTotalizadoresCurso === 'function') carregarTotalizadoresCurso(idCurso); // `app/(app)/relatorio/page.tsx`
if (typeof carregarPainelavaliacoes === 'function') carregarPainelavaliacoes(idCurso);      // `app/(app)/avaliacoes/page.tsx`
```

**Rationale**: o próprio código já usa exatamente esse padrão para o mesmo propósito (manter
`aoTrocarCurso()` funcionando mesmo que a função-alvo ainda não exista/tenha sido movida) — é
literalmente a marca de um ponto de extração já previsto pela sessão que escreveu
`app/(app)/cursos/[curso]/page.tsx` (Épico I). Seguir o padrão já estabelecido evita introduzir um segundo mecanismo
de acoplamento fraco (ex.: `CustomEvent`) para resolver o mesmo problema, o que violaria a diretriz
de não adicionar abstração além do necessário. Funções declaradas em `<script>` de partials
incluídos por a importação de componentes compartilham o mesmo escopo global do documento HTML final (diferente do
gotcha de backend, que é sobre ordem de execução de código de **nível superior** entre arquivos
`.ts` — aqui só há declarações de função, nunca chamada de nível superior), então a ordem dos
a importação de componentes em `app/layout.tsx` não afeta a correção — a chamada só acontece depois de um evento
(`onchange`), quando todo o HTML/JS da página já foi parseado.

**Alternativas consideradas**:
- `CustomEvent` (`document.dispatchEvent`/`addEventListener`), como já é usado para
  `contexto-pronto`: rejeitado para este caso específico porque introduziria um segundo padrão
  para o mesmo problema que o `typeof` guard já resolve; o padrão de evento continua sendo o
  correto para o carregamento inicial de contexto (não muda) e fica reservado para quando o
  AppState completo do Épico D existir.
- Callback registrado explicitamente (`registrarAoTrocarCurso(fn)`): rejeitado por adicionar
  infraestrutura nova para um problema que a guarda `typeof` já resolve com uma linha.

## Achado 2 — Como dividir `aplicarVisibilidadePorPerfilExtra()` sem quebrar RF-AUTH-04

Hoje, uma única função em `app/(app)/atividades/page.tsx` esconde **os dois formulários** (AEC/TAD/TR/
Estudo Individual **e** Agendar avaliação) atrás de um único `perfilEm_(['Admin', 'Operador'])` e um
único banner (`avisoSomenteLeituraExtra`). Depois que "Agendar avaliação" muda de arquivo, os dois
formulários continuam exigindo exatamente o mesmo gate de perfil (`Admin`/`Operador`,
RF-AUTH-04/RN-RBAC-02) — só o arquivo que os hospeda muda, não a regra. **Decisão**: duplicar a
função (não compartilhar), uma cópia por view, cada uma com seu próprio `id` de linha/banner —
`aplicarVisibilidadePorPerfilExtra()` continua em `app/(app)/atividades/page.tsx` (só cobre
`rowLancamentosExtra`/`avisoSomenteLeituraExtra`, sem o formulário de avaliação); nova
`aplicarVisibilidadePorPerfilavaliacoes()` em `app/(app)/avaliacoes/page.tsx` (cobre um novo
`rowAgendarAvaliacao`/`avisoSomenteLeituraavaliacoes`), ambas registradas independentemente no
evento `contexto-pronto`. **Rationale**: as duas telas devem ser editáveis sem que uma dependa da
outra (User Story 1) — uma função compartilhada exigiria que qualquer editor de uma tela soubesse
da existência da outra. `perfilEm_()` (helper genérico em `components/ciaara/`) já é reaproveitável sem
mudança.

## Achado 3 — Split de `popularTurmasExtra()` (dois `<select>` populados por uma função)

`popularTurmasExtra()` hoje popula `#extraTurma` (fica em `app/(app)/atividades/page.tsx`) **e**
`#avalTurma` (muda para `app/(app)/avaliacoes/page.tsx`) a partir da mesma lista de turmas ativas
(`AppState.ctx.turmas`). **Decisão**: dividir em duas funções, cada uma no arquivo dono do seu
`<select>`, cada uma registrada em `contexto-pronto` — `popularTurmasExtra()` só `#extraTurma`;
nova `popularTurmasavaliacoes()` só `#avalTurma`. **Rationale**: mesmo raciocínio do Achado 2 —
duas assinaturas de evento independentes (`contexto-pronto` já suporta múltiplos listeners, é
`addEventListener`, não atribuição de `onXxx`) em vez de uma função com conhecimento dos dois
arquivos.

## Achado 4 — Nenhuma função de backend muda de arquivo

Confirmado por grep em `lib/acoes/*.ts` e `lib/dominio/*.ts`: `registrarAvaliacao`, `registrarVistaProva`,
`getPainelavaliacoesCurso`, `cancelarAvaliacao` já vivem em `lib/acoes/avaliacoes.ts`; `calcularTetosDoCurso`
e `acompanharEstudoIndividualDaTurma` já vivem em `lib/dominio/regras-normativas.ts`; `getRelatorio` já vive em
`lib/acoes/relatorio.ts` — todos criados/movidos para lá pelos Épicos I/F, já batendo com o RF-MOD-02
("preservando os nomes de função já existentes"). **Decisão**: nenhuma tarefa de backend nesta
spec além de, no máximo, um comentário de cabeçalho desatualizado (nenhum encontrado que cite
"Épico B" como pendência). **Rationale**: evita trabalho de "mover por mover" sem nenhum FR que o
exija — RF-MOD-02 já está cumprido.

## Achado 5 — `docs/arquitetura/02-modularizacao.md` está desatualizado em ambas as direções

Lido arquivo a arquivo contra ` e `app/` reais (2026-08-15):

- **Faltam da tabela de backend** (existem no projeto, não listados no mapa): `lib/dominio/regras-normativas.ts`,
  `lib/acoes/disciplinas.ts`, `lib/acoes/usuarios.ts`, `lib/acoes/instrutores.ts` (existe na tabela mas com funções antigas de
  V1.0 que não batem com o `lib/acoes/instrutores.ts` real do Épico F — `listarInstrutores`,
  `cadastrarInstrutor`, `atualizarInstrutor`, `desativarInstrutor`, `criarVinculoHabilitacao`, não
  `instrutorHabilitado_`/`sincronizarDisciplinasHabilitadas`, que na verdade estão em
  `lib/dominio/regras-normativas.ts`/`lib/acoes/aulas.ts`).
- **Listados na tabela mas sem nenhum arquivo real**: `lib/dominio/regime-curso.ts`, `lib/acoes/dashboards.ts`,
  `lib/dominio/motor-preditivo.ts` (backend); `app/(app)/inicio/page.tsx`, `app/(app)/cronograma/page.tsx`, `app/(app)/cursos/page.tsx`,
  `app/(app)/admin/calendario/page.tsx`, `ModalCrud.html`, `components/ciaara/ModalLancamentoAula.tsx`, `ModalFichaInstrutor.html`
  (frontend) — nenhum desses módulos tem conteúdo implementado hoje (spec, Edge Cases).
- **`app/(app)/avaliacoes/page.tsx`/`app/(app)/relatorio/page.tsx`** já estavam previstos na tabela original (linhas
  58/60) com a descrição certa ("Avaliações: catálogo planejado + agendamento + tabela",
  "Relatório consolidado de 7 seções") — este épico finalmente cria o primeiro, e uma versão
  parcial do segundo (só o bloco de totalizadores, não as 7 seções completas).

**Decisão**: reescrever as duas tabelas (backend/frontend) do zero a partir do `wc -l`/leitura real
de 2026-08-15, marcando explicitamente cada módulo sem conteúdo como "não construído — ver Épico
[G/H/não sequenciado]" em vez de removê-lo (FR-005) — mantém o documento como mapa de **destino**
completo, não só do que já existe. **Rationale**: FR-004/FR-005/SC-004 exigem exatamente isso; a
User Story 2 já documenta o risco de um mapa errado (`instrutorHabilitado_` como exemplo real).
