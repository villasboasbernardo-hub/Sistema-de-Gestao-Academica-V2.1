# Quickstart — Painel de Atribuição de Disciplinas do Instrutor

Roteiro de validação manual contra a aplicação Next.js implantada (não substitui a suíte automatizada —
`pnpm vitest run` — cobre a lógica pura; este roteiro cobre a interação real no
navegador, incluída a escrita na banco de produção).

## Pré-requisitos

- Acesso à aplicação Next.js com um perfil autorizado a escrever em `instrutor_disciplina` (Admin, Operador
  ou um dos perfis da Divisão de Administração Acadêmica).
- Anotar, antes de começar, o `ID_Instrutor` de um instrutor real com pelo menos 1 disciplina
  habilitada hoje (para o Passo 2) e o `ID_Instrutor` de outro sem nenhuma (ou aceitar cadastrar um
  novo instrutor de teste no Passo 4).

## Passo 1 — Rótulo com sigla e busca (US1 + US2)

1. Abrir a aba "Instrutores" → editar qualquer instrutor.
2. Confirmar que o novo painel aparece abaixo do bloco "Disciplinas Habilitadas (calculado)" já
   existente (que continua lá, inalterado — FR-006).
3. Conferir visualmente 3-4 rótulos ao acaso: todos devem estar no formato
   `"Nome da Disciplina (CÓDIGO)"`, nunca com o nome completo do curso.
4. Digitar `TFM` no campo de busca — confirmar que a lista se reduz às disciplinas cujo nome ou
   código contém "TFM" (qualquer capitalização) e que o rótulo de alguma delas mostra
   `"... (CAHO)"` ou similar.
5. Apagar a busca — confirmar que a lista completa volta a aparecer.
6. (FR-014) Com a aba Network do navegador aberta, reabrir a ficha de edição de outro instrutor —
   confirmar que nenhuma chamada de rede nova é disparada ao renderizar o painel (as únicas
   chamadas visíveis devem ser as já existentes de `carregarInstrutores()`, do carregamento inicial
   da tela).

## Passo 2 — Pré-marcação correta em modo edição (US1)

1. Abrir a ficha de edição do instrutor anotado com disciplinas habilitadas conhecidas.
2. Conferir que exatamente essas disciplinas aparecem marcadas no painel, e nenhuma outra.
3. Fechar sem salvar ("Voltar") — nenhuma escrita deve ter ocorrido.

## Passo 3 — Editar e salvar sem perder histórico (US3, cenário mais crítico)

1. Reabrir a ficha do mesmo instrutor do Passo 2.
2. Desmarcar 1 disciplina hoje habilitada; marcar 1 disciplina nova.
3. Clicar em "Salvar" — confirmar mensagem de sucesso.
4. Reabrir a ficha do mesmo instrutor — confirmar que o painel reflete exatamente a mudança (a
   desmarcada não aparece mais marcada; a nova aparece marcada).
5. Via acesso administrativo à planilha (`instrutor_disciplina`), localizar a linha do vínculo
   desmarcado no Passo 2 — confirmar que a linha **ainda existe**, apenas com `Status` diferente de
   `'Ativo'` (não foi excluída).
6. Repetir o Passo 3 marcando de novo a mesma disciplina desmarcada — confirmar, no banco, que a
   **mesma linha** (mesmo `ID_Vinculo`) voltou a `Status = 'Ativo'`, em vez de uma linha nova ter
   sido criada.

## Passo 4 — Cadastro com disciplinas já atribuídas (US3, cenário de cadastro)

1. Abrir "Cadastrar Novo Instrutor".
2. Confirmar que o painel aparece com a lista completa, toda desmarcada.
3. Preencher os campos obrigatórios, marcar 2 disciplinas no painel, salvar.
4. Reabrir a ficha do instrutor recém-criado — confirmar que exatamente essas 2 disciplinas
   aparecem marcadas.

## Passo 5 — Falha no cadastro não cria vínculo órfão (Edge Case)

1. Tentar cadastrar um instrutor deixando um campo obrigatório em branco, com 1+ disciplinas
   marcadas no painel.
2. Confirmar que o salvamento falha com mensagem de erro (comportamento já existente, inalterado).
3. Via acesso administrativo à planilha, confirmar que nenhum vínculo novo foi criado em
   `instrutor_disciplina` para esse tentativa (nenhum `ID_Instrutor` órfão sem instrutor
   correspondente em `instrutores`).

## Resultado esperado

Todos os 5 passos concluídos sem exceção não tratada, sem perda de linha em `instrutor_disciplina`
em nenhum momento, e sem nenhuma chamada de rede adicional observável (aba Network do navegador)
além das já existentes ao abrir a tela de instrutores e ao salvar.
