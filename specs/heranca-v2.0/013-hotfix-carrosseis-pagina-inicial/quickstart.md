# Quickstart — Validação do Hotfix Carrosséis Fixos da Página Inicial

## Pré-requisitos

- Implantação via `o fluxo Git → Vercel` já feita (`o histórico de deploys da Vercel` tem o passo a passo — `push.sh` +
  `o merge na `main` (a Vercel publica em produção) --deploymentId ...`).
- Acesso à aplicação Next.js publicada com um usuário cadastrado em `usuarios` (qualquer perfil — nenhuma das
  correções depende de perfil específico).
- Idealmente, a banco de produção `Banco de dados CIAARA-11 v2.0` tem, entre as 5 categorias de
  `cursos`: pelo menos uma categoria com curso(s) cuja turma está Ativa hoje, pelo menos uma com
  curso(s) só com turma Planejada/Inativa/Cancelada/Concluída (ou sem turma nenhuma), e — se possível
  — uma categoria sem nenhum curso cadastrado, para exercitar FR-004 sem precisar simular dado.

## Passo 1 — `pnpm vitest run` (parte automatizável, FR-001/003/004/008)

```
pnpm vitest run tests/unidade/*.test.ts
```

Esperado: baseline da suíte (187 testes/187 passam, ver
`implantacao/historico/2026-08-16-hotfix-012-tratamento-erro-leitura.md`) mais os casos novos deste
hotfix, todos passando, 0 regressão. Casos novos esperados em `tests/unidade/regras_ui_dados.test.ts`, para
`montarCarrosseisPainelInicio_`:

- Array de cursos sintético cobrindo as 5 classificações + `turmasEmDestaque` parcial → devolve
  sempre exatamente 5 entradas, na ordem `Regular, Especial, Expedito, Aperfeiçoamento Avançado,
  Estágio de Qualificação`, com os títulos exatos exigidos por FR-003.
- Categoria sem nenhum curso no array de entrada → a entrada correspondente vem com `comDestaque: []`
  e `semDestaque: []` (FR-004 — a mensagem de vazio em si é DOM, verificada no Passo 2).
- Curso sem entrada em `turmasEmDestaque` (simula turma Planejada/Inativa/Cancelada/Concluída, ou
  nenhuma turma) → aparece em `semDestaque` da sua categoria, nunca omitido (FR-001).
- Dois cursos da mesma categoria, um com destaque e outro sem → o com destaque aparece em
  `comDestaque`, o outro em `semDestaque`, cada subgrupo preservando a ordem natural de entrada
  (FR-008, Clarifications 2026-08-16) — mesmo formato de teste já usado para
  `agruparCursosParaPagina_` no Hotfix 010.

## Passo 2 — Estrutura fixa de 5 carrosséis (FR-003/005, manual)

1. Abrir a aplicação Next.js — a Página Inicial é a rota padrão (`tabInicio`).
2. **Esperado**: exatamente 5 seções, nesta ordem, com estes títulos exatos: "Cursos Regulares",
   "Cursos Especiais", "Cursos Expeditos", "Cursos de Aperfeiçoamento Avançado", "Estágios de
   Qualificação".
3. Para uma categoria com vários cursos: **esperado** que os cartões fiquem lado a lado com rolagem
   horizontal (mouse/touch), sem quebrar linha nem esticar a página verticalmente.

## Passo 3 — Catálogo completo, sem esconder por status de turma (FR-001, manual)

1. Escolher, na banco de produção, um curso cuja única turma tenha `Status` diferente de `Ativa` (ou sem
   nenhuma turma cadastrada).
2. **Esperado**: esse curso aparece na Página Inicial, dentro do carrossel da sua classificação.
3. **Esperado**: um curso com turma `Ativa` cursando hoje continua aparecendo com as mesmas
   informações de turma em destaque de antes deste hotfix (nome da turma, status, barra de
   progresso).

## Passo 4 — Ordem dentro do carrossel (FR-008, manual)

1. Escolher uma categoria com pelo menos um curso com turma em destaque e um sem.
2. **Esperado**: o(s) curso(s) com turma em destaque aparece(m) antes do(s) curso(s) sem, dentro da
   mesma faixa de rolagem.

## Passo 5 — Mensagem de categoria vazia (FR-004, manual)

1. Se alguma das 5 categorias não tiver nenhum curso cadastrado hoje na banco de produção, abrir a Página
   Inicial e localizar essa seção. Se todas as 5 tiverem pelo menos um curso, este passo pode ser
   validado só pelo teste automatizado do Passo 1 (cobre a mesma lógica de decisão).
2. **Esperado**: a seção aparece com o título normalmente e a mensagem "Nenhum curso cadastrado nesta
   modalidade" no lugar dos cartões — nunca uma faixa em branco nem a seção ausente.

## Passo 6 — Clique no cartão continua funcionando (FR-006/007, manual)

1. Clicar em um cartão de curso sem turma em destaque (se existir algum na base viva).
2. **Esperado**: navega para a Página do Curso, com esse curso já selecionado — mesmo destino de
   sempre, sem erro no console do navegador.
3. Clicar em um cartão de curso com turma em destaque.
4. **Esperado**: mesmo comportamento de antes deste hotfix (curso e turma já selecionados na Página
   do Curso).

## Passo 7 — Nenhuma mudança visual de Design System (SC-004, manual)

1. Comparar cores, fonte (Rawline) e tema claro/escuro da Página Inicial antes/depois desta
   implantação (ou contra qualquer outra tela não tocada, ex.: Página do Curso).
2. **Esperado**: nenhuma diferença perceptível — este hotfix não toca nenhum token `--cor-*`/
   `--fonte-principal`/`data-bs-theme`.

## Fora do escopo desta validação

- `getContextoInicial`/`resolverTurmaEmDestaque_` (``app/layout.tsx` + `lib/supabase/server.ts``) — nenhuma mudança de código, só
  confirmação de comportamento já existente (achado 1, Passo 1 cobre isso indiretamente via
  `montarCarrosseisPainelInicio_`).
- `app/(app)/cursos/[curso]/page.tsx` — já resolvido no Hotfix 010, inalterado por este hotfix.
- Qualquer painel de estatística (`lib/acoes/estatisticas.ts`) — não tocado.
