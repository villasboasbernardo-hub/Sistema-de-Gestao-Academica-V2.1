# Quickstart — Hotfix: Refinamento de UI e Correção do Algoritmo de Nome de Guerra

Roteiro de validação manual contra a aplicação Next.js implantada (a suíte automatizada —
`pnpm vitest run` — cobre `formatarNomeInstrutor_`; este roteiro cobre a parte de
interface que não tem harness disponível: consolidação de coluna, remoção de seção, renomeação de
rótulo).

## Pré-requisitos

- Acesso à aplicação Next.js com um perfil que já via a listagem de instrutores hoje.
- Anotar um `ID_Instrutor` real com posto, especialidade e nome de guerra preenchidos, para o
  Passo 1.

## Passo 1 — Coluna "Instrutor" consolidada (US1)

1. Abrir a aba "Instrutores".
2. Confirmar que o cabeçalho da tabela tem uma única coluna "Instrutor" no lugar de
   "Posto/Graduação" + "Nome Completo".
3. Localizar o instrutor anotado nos pré-requisitos — confirmar que a célula mostra posto +
   especialidade (quando aplicável pelas regras de círculo hierárquico) + nome completo, com o
   nome de guerra em negrito.
4. Aplicar um filtro que não retorne nenhum instrutor — confirmar que a mensagem "Nenhum instrutor
   encontrado" ocupa a largura correta da tabela (sem coluna sobrando/faltando visualmente).

## Passo 2 — Destaque de nome de guerra não contíguo (US2)

Como este é um comportamento preventivo (nenhum instrutor real tem hoje um nome de guerra de
palavras não contíguas), a validação em produção é indireta — confirmar visualmente que os únicos
2 instrutores reais com nome de guerra preenchido continuam com o destaque correto (mesmo caso
contíguo de antes, agora com marcações separadas por palavra — research.md §2). A cobertura formal
do caso não contíguo está na suíte automatizada (`tests/unidade/design_system.test.ts`), não neste roteiro.

## Passo 3 — Seção legada removida (US3)

1. Na página principal de instrutores, rolar até o final.
2. Confirmar que a seção "Vínculo de qualificação" (formulário com dropdowns de Instrutor/Disciplina
   e botão "Qualificar") não existe mais em nenhum ponto da página.
3. Forçar um erro de carregamento (ex.: recarregar a página com a rede momentaneamente
   desconectada, se possível no ambiente de teste) — confirmar que um aviso de erro ainda aparece
   em algum lugar visível da página principal.

## Passo 4 — Rótulo "Qualificação do Instrutor" (US4)

1. Abrir a ficha de edição de qualquer instrutor (ou o cadastro de um novo).
2. Localizar o painel de busca + checkboxes de disciplinas.
3. Confirmar que o rótulo acima do campo de busca é exatamente "Qualificação do Instrutor".
4. Confirmar que o painel continua funcionando normalmente (busca, marcar/desmarcar, salvar) —
   nenhuma mudança funcional além do texto do rótulo.

## Resultado esperado

Todos os 4 passos concluídos sem exceção no console do navegador, sem nenhuma coluna/seção
duplicada ou faltando, e sem nenhuma mudança de comportamento de salvamento em nenhuma das telas
tocadas.
