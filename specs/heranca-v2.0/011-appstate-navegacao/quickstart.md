# Quickstart — Validação do Épico D (AppState)

## Pré-requisitos

- Implantação via `o fluxo Git → Vercel` já feita (`o histórico de deploys da Vercel`).
- Acesso à aplicação Next.js com um usuário cadastrado em `usuarios`, perfil com acesso a Disciplinas e
  Instrutores (Admin ou as Divisões correspondentes — ver `docs/fase-1/01-Perfis-e-Permissoes.md`).
- Pelo menos 1 disciplina e 1 instrutor cadastrados na banco de produção.

## Passo 1 — `pnpm vitest run` (parte automatizável, FR-001/002)

```
pnpm vitest run tests/unidade/*.test.ts
```

Esperado: baseline da suíte (181 testes/181 passam, ver
`implantacao/historico/2026-08-16-hotfix-010-sidebar-carrossel-estatisticas.md`) mais os casos
novos desta spec, todos passando, 0 regressão. Casos novos esperados em `tests/unidade/design_system.test.ts`
(mesmo arquivo que já carrega `components/ciaara/`):
- `AppState.invalidar('chave')` remove só a chave informada, mantém as demais.
- `AppState.invalidar(['a', 'b'])` remove as duas chaves informadas.
- `AppState.invalidar('*')` remove todas as chaves em cache.
- `AppState.invalidar('chave-nunca-populada')` não lança exceção (no-op seguro).
- `AppState.onChange('chave', cb)` — `cb` é chamado quando `invalidar('chave')` roda; **não** é
  chamado quando outra chave é invalidada.

## Passo 2 — Seleção de curso/turma/filtro sobrevive à navegação (FR-007, manual)

1. Na Página do Curso, selecionar um curso e uma turma.
2. Navegar para Avaliações, depois DSA, depois Cronograma, pelo menu lateral.
3. Voltar para a Página do Curso.
4. **Esperado**: o mesmo curso/turma continuam selecionados (mesmo comportamento de antes desta
   spec — não regressão, RF-NAV-03).

## Passo 3 — Painel de Disciplinas não mostra dado desatualizado (FR-003/004, manual)

1. Abrir a tela Disciplinas, expandir "Estatísticas de Disciplinas" — anotar o número de
   "Concluídas".
2. Editar uma disciplina que ainda não está concluída para que sua carga horária executada bata com
   a carga horária total (ou, mais simples: ir ao DSA e lançar uma Aula dessa disciplina até
   completar a carga).
3. Sem recarregar a página, voltar para Disciplinas e reabrir o painel de estatísticas.
4. **Esperado**: o número de "Concluídas" reflete a mudança — não é preciso recarregar a página
   (SC-001).

## Passo 4 — Painel de Instrutores não mostra dado desatualizado (FR-003/004, manual)

1. Abrir a tela Instrutores, expandir "Estatísticas de Instrutores" — anotar o "Total".
2. Cadastrar um instrutor novo.
3. Sem recarregar a página, reabrir o painel de estatísticas de Instrutores.
4. **Esperado**: o novo instrutor já está contado (SC-001).

## Passo 5 — Sem escrita relevante, sem chamada de rede nova (FR-005/SC-002, manual)

1. Abrir o painel de estatísticas de Instrutores (aba de rede do navegador aberta,
   `Ctrl+Shift+I`/F12).
2. Fechar e reabrir o mesmo painel, sem cadastrar/editar/excluir nada.
3. **Esperado**: nenhuma nova chamada da Server Action/`getEstatisticasInstrutores` aparece na
   aba de rede na segunda abertura — o cache é reaproveitado.

## Fora do escopo desta validação

- Painel de Cursos (`app/(app)/cursos/[curso]/page.tsx`) — o mecanismo de cache é o mesmo, mas não há hoje nenhuma
  escrita em app que o invalide (spec.md FR-004, achado); validar só que abrir/fechar o painel
  repetidamente não lança erro e mostra o mesmo dado (comportamento de cache, não de invalidação).
- History API, deep-link, voltar/avançar do navegador — fora de escopo (FR-008).
