# Quickstart — Hotfix: Roteamento SPA, Fonte Rawline e Performance do DSA

Roteiro de validação manual no navegador, após ``git push` (a Vercel publica a preview da branch)`/`deploy` (nenhuma migração de schema
envolvida neste hotfix — pular direto para a aplicação Next.js publicada).

## Pré-requisitos

- Implantação via `o fluxo Git → Vercel` já feita (`o histórico de deploys da Vercel`).
- Logado na aplicação Next.js como Operador/Admin (mesma conta de sempre).
- Console do navegador aberto (F12) durante todo o roteiro.

## Passo 1 — Roteamento por clique (US1, FR-001/002)

1. Abrir a aplicação Next.js, ir para a aba **Instrutores**.
2. Clicar em **"Cadastrar Novo Instrutor"**.
3. **Esperado**: o formulário de cadastro aparece imediatamente, na mesma aba/janela do navegador —
   nenhuma nova aba/janela é criada, a tela inicial não aparece no meio do caminho, sem
   "piscar"/recarregar a página inteira.
4. Clicar em **"Voltar"** — a listagem/dashboard de Instrutores volta a aparecer.
5. Na listagem, clicar em **"Editar"** numa linha qualquer.
6. **Esperado**: mesmo comportamento do passo 3, agora com o formulário pré-preenchido daquele
   instrutor.

## Passo 2 — Roteamento por deep-link (US1, FR-003)

1. Copiar a URL da aplicação Next.js (`AppState.ctx.urlWebApp` — visível no console via
   `AppState.ctx.urlWebApp` ou copiada de um clique em "Editar" antes desta correção).
2. Abrir uma aba nova do navegador e colar `<urlWebApp>?editarInstrutor=<algum ID_Instrutor real>`.
3. **Esperado**: a página carrega **diretamente** no formulário de edição daquele instrutor — a tela
   inicial (Painel Início) não aparece em nenhum momento, nem por uma fração de segundo.
4. Repetir com `?novoInstrutor=1` — **esperado**: carrega diretamente no formulário de cadastro
   vazio.

## Passo 3 — Fonte Rawline (US3, FR-005)

1. Com o console aberto, recarregar qualquer tela do sistema (F5).
2. Inspecionar a aba **Console**/**Network** do DevTools.
3. **Esperado**: nenhum erro de tipo MIME (`text/plain` recusado) relacionado a
   `rawline.css`/`fonts.cdnfonts.com`.

## Passo 4 — Performance do DSA (US2, FR-006/007/008)

1. Ir para **Detalhe Semanal de Aula**.
2. Selecionar uma turma de um curso com múltiplas turmas ativas simultâneas (conferir a lista atual
   de turmas ativas antes de escolher — o cenário real usado nesta spec teve 29 turmas ativas ao
   todo no sistema).
3. Cronometrar o tempo entre a seleção e a grade aparecer.
4. **Esperado**: grade completa (blocos, conflitos, horários) aparece em **menos de 3 segundos**,
   sem nenhum erro de tempo esgotado no console (`[gs:getDsaSemanal] timeout`).
5. Comparar os blocos/conflitos exibidos com uma captura de tela feita **antes** deste hotfix (ou
   com o resultado de `pnpm vitest run tests/regras_dsa.test.ts`, inalterado) — **esperado**: idênticos,
   só a velocidade muda (FR-007/008).

## Passo 5 — Suíte automatizada (cobre US1 parcialmente e US2 integralmente)

```bash
pnpm vitest run tests/unidade/*.test.ts
```

**Esperado**: mesma contagem de testes de antes deste hotfix + os casos novos de
`tests/unidade/regras_dsa.test.ts` (contagem de leituras de planilha) e `tests/ficha_formulario_
instrutores.test.ts` (`abrirPainelEdicaoInstrutor_`/`fecharPainelEdicaoInstrutor_`), 0 falhas, 0
regressão em nenhum teste já existente.
