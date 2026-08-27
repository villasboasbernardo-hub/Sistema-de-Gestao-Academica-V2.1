# Quickstart — Hotfix: Correção do Motor de PDF, Regras de Impressão e Limpeza de UI (Ficha do Instrutor)

Roteiro de validação manual contra a aplicação Next.js implantada. Nenhum dos 3 bugs tem harness
automatizado disponível (DOM/CSS e `o Supabase Storage`, sem mock no projeto).

## Pré-requisitos

- Acesso à aplicação Next.js com um perfil autorizado a visualizar a Ficha (mesmo alcance de leitura já
  configurado desde a spec 022).
- Um instrutor de teste com Nome de Guerra preenchido (para o Passo 1) e Posto/Graduação +
  Especialidade preenchidos (para o Passo 3, nome de exibição completo).
- Confirmar que o template da rota `/print/ficha-instrutor` já tem as tags `{{TAG}}` (já aplicado nesta sessão,
  independente desta spec — ver spec 022/023 Achados reais).

## Passo 1 — Sem vazamento de HTML no título (US1)

1. Abrir a Ficha (botão renomeado — confirmar que agora diz "Ficha", não mais "Imprimir Ficha").
2. Confirmar que o título da Ficha mostra o nome do instrutor com o nome de guerra em **negrito
   visual real** — nunca as tags `<strong>`/`</strong>` aparecendo como texto na tela.

## Passo 2 — Impressão sem páginas em branco (US2)

1. Com a Ficha aberta, acionar a impressão nativa do navegador (botão "Imprimir" ou `Ctrl+P`).
2. Confirmar no preview de impressão que aparece **só** o conteúdo da Ficha — sem sidebar, navbar,
   fundo escurecido do modal, nem nenhuma página em branco antes ou depois.
3. Repetir o mesmo teste na tela do DSA (impressão A4 paisagem já existente, Épico H) — confirmar
   que continua funcionando exatamente como antes, sem regressão.

## Passo 3 — PDF com nome correto na pasta certa (US3)

1. Clicar "Gerar PDF" na Ficha do instrutor de teste.
2. Confirmar que o PDF gerado abre normalmente (dados mesclados corretamente — já resolvido via
   edição do Template, verificação apenas confirmatória aqui).
3. Abrir o  Supabase Storage do executor — confirmar que existe uma pasta "Fichas dos Instrutores" e
   que o PDF está dentro dela (nunca no Supabase Storage).
4. Confirmar que o nome do arquivo é exatamente `"Ficha - <Posto/Graduação> (<Especialidade>)
   <Nome Completo>.pdf"` (o mesmo formato que a listagem principal já usa para o instrutor,
   `formatarNomeInstrutor_` com `isHTML=false`) — nunca contendo o `ID_Instrutor` cru.
5. Gerar o PDF de um segundo instrutor de teste — confirmar que o segundo arquivo cai na MESMA
   pasta "Fichas dos Instrutores" (nenhuma pasta duplicada criada).

## Resultado esperado

Todos os 3 passos concluídos sem exceção não tratada no console do navegador; nenhuma regressão na
impressão do DSA; nenhuma pasta "Fichas dos Instrutores" duplicada no Supabase Storage.
