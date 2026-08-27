# Quickstart — Validação do Hotfix Sidebar/Carrossel/Estatísticas

## Pré-requisitos

- Implantação via `o fluxo Git → Vercel` já feita (`o histórico de deploys da Vercel` tem o passo a passo — `push.sh` +
  `o merge na `main` (a Vercel publica em produção) --deploymentId ...`).
- Acesso à aplicação Next.js publicada com um usuário cadastrado em `usuarios` (qualquer perfil — nenhuma das 4
  correções depende de perfil específico).
- A banco de produção `Banco de dados CIAARA-11 v2.0` deve ter pelo menos um curso com turma `Ativa`
  cursando hoje e pelo menos um curso sem nenhuma turma ativa hoje, para exercitar os dois subgrupos
  de FR-004.

## Passo 1 — `pnpm vitest run` (parte automatizável, FR-006/FR-004)

```
pnpm vitest run tests/unidade/*.test.ts
```

Esperado: baseline da suíte (176 testes/176 passam, ver `implantacao/historico/2026-08-16-epico-009-refatoracao-ui-ux.md`)
mais os casos novos deste hotfix, todos passando, 0 regressão. Casos novos esperados em
`tests/unidade/regras_ui_dados.test.ts`:
- `getEstatisticasCursos`-equivalente (ou teste direto da função de dedup, dependendo de como a
  fase `/speckit-tasks` isolar a lógica): array de cursos sintético com `ID_Curso` repetido e
  `Classificacao` divergente entre as linhas duplicadas → `porClassificacao`/`totalCursos` contam o
  `ID_Curso` uma única vez, usando os valores da primeira linha.
- `agruparCursosParaPagina_`: array sintético de cursos + `turmasEmDestaque` parcial → confirma que
  os cursos com destaque vêm antes, mantendo a ordem de entrada dentro de cada subgrupo.

## Passo 2 — Sidebar (FR-001/002, manual)

1. Abrir a aplicação Next.js em qualquer tela.
2. Clicar no ícone de hambúrguer (canto superior esquerdo).
3. **Esperado**: o menu lateral desliza visível, com todos os itens permitidos ao perfil do usuário.
4. Clicar no X (ou em qualquer item do menu).
5. **Esperado**: o menu fecha.

## Passo 3 — Página do Curso: todos os cursos, destaque primeiro, carrossel (FR-003/004/005, manual)

1. Ir para "Página do Curso" pelo menu lateral.
2. Escolher uma classificação (ex.: "Regular") que tenha cursos com e sem turma ativa hoje.
3. **Esperado**: todos os cursos da classificação aparecem — nenhum ausente — dentro de uma faixa que
   rola horizontalmente (não empilha verticalmente).
4. **Esperado**: os cursos com turma em destaque (mesmo indicador visual já usado no Painel Início)
   aparecem antes dos demais dentro da mesma faixa.

## Passo 4 — Estatísticas de Cursos (FR-006, manual, contra a banco de produção)

1. Na Página do Curso, clicar em "Estatísticas de Cursos e Turmas".
2. Contar manualmente, na tabela `cursos` da banco de produção, quantos valores distintos de `ID_Curso`
   têm `Classificacao = Regular` (ou outra classificação escolhida).
3. **Esperado**: o valor no gráfico "Cursos por classificação" bate exatamente com a contagem manual
   — nunca maior (o que indicaria contagem de linha duplicada).
4. **Esperado**: a soma de todas as fatias do gráfico por classificação é igual ao KPI "Total de
   cursos".

## Fora do escopo desta validação

- Painel Início (`app/(app)/inicio/page.tsx`) — inalterado por este hotfix (FR-007), continua mostrando só
  cursos com turma em destaque, sem carrossel de subgrupo.
- Qualquer outro painel de estatística (Disciplinas/Instrutores/Turmas) — não tocado.
