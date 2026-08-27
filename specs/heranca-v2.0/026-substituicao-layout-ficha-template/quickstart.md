# Quickstart — Hotfix: Substituição Estrita do Layout da Ficha pelo Template Local

Roteiro de validação manual contra a aplicação Next.js implantada. Nenhuma das mudanças tem harness
automatizado disponível (troca de HTML/CSS gerado, sem lógica condicional nova).

## Pré-requisitos

- Acesso à aplicação Next.js com um perfil autorizado a visualizar a Ficha.
- Um instrutor de teste com o máximo de campos preenchidos possível (para conferir todas as tags).
- O arquivo `SIS11/modelos/Ficha de cadastro/FICHACADASTRODEDOCENTESCIAARA_2_.docx.html` aberto
  num navegador, lado a lado, como referência visual.

## Passo 1 — Layout idêntico ao arquivo local (US1)

1. Abrir a Ficha do instrutor de teste.
2. Comparar visualmente com o arquivo HTML local aberto lado a lado — confirmar a mesma estrutura
   de tabela (3 seções numeradas: Dados Pessoais/Profissionais/Complementares), os mesmos rótulos,
   a mesma tipografia.
3. Confirmar que o cabeçalho mostra as 2 imagens (brasões) e o texto "Marinha do Brasil" em
   Título/Frase normal (não mais TUDO MAIÚSCULO) — reflete a nova fonte de verdade (Clarifications
   spec 024 revertida por este achado).
4. Confirmar que as 2 imagens aparecem instantaneamente, sem nenhuma requisição de rede adicional
   visível na aba Rede do navegador (DevTools) — confirma o Base64.
5. Conferir cada campo preenchido do instrutor de teste contra o valor esperado — nenhuma tag
   `{{...}}` literal deve aparecer em lugar nenhum.
6. Confirmar que `Disciplinas Habilitadas` e a data no rodapé (`Data`) aparecem preenchidas, mesmo
   sem ter uma coluna direta — vêm de `disciplinasHabilitadasDoInstrutor_`/data atual.

## Passo 2 — Botões e impressão sem regressão (US2)

1. Clicar "Voltar" — confirmar retorno à listagem principal.
2. Reabrir a Ficha, clicar "Salvar Ficha" — confirmar o mesmo toast de sucesso já
   existente desde a spec 025.
3. Clicar "Imprimir" — confirmar que o preview de impressão mostra só o conteúdo da Ficha, sem
   nenhuma página em branco/quase-vazia extra (confirma a remoção do `page-break-before`,
   Clarifications 2026-08-19).
4. Repetir o teste de impressão do DSA (Épico H, A4 paisagem) — confirmar que continua funcionando
   sem regressão.
5. Navegar por 2-3 outras views da SPA (Painel Início, Cursos, formulário de edição de Instrutor)
   — confirmar que nenhuma delas mudou de aparência (o CSS do arquivo local ficou contido à Ficha).

## Resultado esperado

Layout da Ficha visualmente idêntico ao arquivo HTML local (exceto a remoção deliberada do
page-break); imagens carregando via Base64 sem requisição de rede; os 3 botões funcionando
exatamente como antes; nenhuma outra tela do sistema alterada.
