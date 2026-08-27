# Quickstart: Expansão de CRUD (Cadastro/Edição Completa) e Ordenação Hierárquica de Instrutores

Roteiro de validação manual contra o app publicado (`o merge na `main` (a Vercel publica em produção)`), mesma URL de sempre.

## Pré-requisitos

- Deploy mais recente aplicado via ``git push` (a Vercel publica a preview da branch)`/`o merge na `main` (a Vercel publica em produção)`.
- Login com um usuário `Admin` ou da Divisão de Administração Acadêmica/Orientação Pedagógica
  (perfis com escrita em `disciplinas`).
- Suíte automatizada verde: `pnpm vitest run`.

## Passo 1 — Ordenação por precedência militar (US1, FR-001/FR-002/FR-003)

1. Abrir uma disciplina/turma que tenha pelo menos 2 instrutores habilitados de postos diferentes
   (ex.: um CMG e um CC) e clicar em "Editar".
2. **Esperado**: na lista de checkboxes, o CMG aparece antes do CC — mesma ordem já usada no
   Módulo de Instrutores, nunca ordem alfabética/de cadastro.
3. Se houver um instrutor com posto fora do domínio conhecido, conferir que ele aparece ao final
   da lista, sem quebrar a renderização dos demais.

## Passo 2 — Edição completa da disciplina (US2, FR-004/FR-005/FR-006/FR-006.1)

1. Abrir o painel de edição de uma disciplina existente.
2. **Esperado**: além de Início/Término/Instrutores (já existentes), o painel mostra Código, Nome,
   Carga Horária, Prioridade e Modo de Atribuição — todos preenchidos com os valores reais atuais.
3. Se a disciplina já tinha uma Prioridade salva anteriormente (via a célula inline da tabela),
   conferir que o campo do painel mostra esse valor — não em branco.
4. Alterar o Nome e salvar — conferir que a tabela reflete o novo nome sem recarregar a página.
5. Anotar quantas turmas estão vinculadas à disciplina editada (mesmo `ID_Grade`, visível trocando
   de Turma no seletor). Alterar o Código e salvar — abrir cada uma dessas outras turmas e conferir
   que todas mostram o novo Código (propagação, FR-006.1).
6. Tentar salvar com um Código já usado por outra disciplina do mesmo curso — conferir que é
   bloqueado com mensagem clara, sem gravar nada.

## Passo 3 — Cadastro de nova disciplina (US3, FR-007 a FR-013)

1. Conferir que o botão "Nova Disciplina" aparece no topo do módulo, tanto no estado inicial
   (nenhum curso selecionado) quanto com um curso/turma já escolhidos.
2. Clicar em "Nova Disciplina" — conferir que o formulário abre com todos os campos vazios,
   incluindo os seletores de Curso e Turma.
3. Selecionar um Curso — conferir que o seletor de Turma passa a listar só as turmas daquele curso.
4. Tentar salvar sem selecionar Turma — conferir que é bloqueado antes de qualquer chamada de rede
   (aba Rede do navegador sem nenhuma requisição nova).
5. Preencher Curso, Turma, Código (não usado ainda nesse curso), Nome e Carga Horária, salvar.
6. **Esperado**: a disciplina aparece imediatamente na Visão 2 da turma escolhida, com todos os
   campos corretos, pronta para receber Início/Término/Instrutor pelo painel de edição já existente.
7. Tentar cadastrar de novo com o mesmo Código no mesmo curso — conferir que é bloqueado, e que
   nenhuma disciplina nova aparece na lista (nem uma "fantasma" sem turma).

## Critério de aceite final

Os 3 passos acima batem com o Critério de Aceite do pedido original: o modal de edição e cadastro
tem todos os campos da disciplina; um CMG sempre aparece acima de um CC na seleção de instrutores;
o botão de nova disciplina salva um registro completo e utilizável no banco de dados.
