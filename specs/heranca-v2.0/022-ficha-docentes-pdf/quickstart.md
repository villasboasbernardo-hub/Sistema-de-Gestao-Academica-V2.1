# Quickstart — Ficha de Cadastro de Docentes Ampliada e Geração de PDF via a rota de impressão `/print/*`

Roteiro de validação manual contra a aplicação Next.js implantada. Nenhuma das 3 User Stories tem harness
automatizado disponível: US1/US2 dependem de `document`/DOM (mesmo achado de toda spec anterior do
módulo de Instrutores); US3 depende de `a rota de impressão `/print/*``/`o Supabase Storage`, sem mock no projeto.

## Pré-requisitos

- Migração de schema executada contra a banco de produção (12 colunas em `instrutores` + linha
  `ID_TEMPLATE_FICHA_INSTRUTOR` em `config_parametros`, ver `migracao/`). **Concluído em
  2026-08-18** — verificado por leitura de volta (`instrutores!AF1:AQ1`,
  `config_parametros!A19:H19`).
- Acesso à aplicação Next.js com um perfil autorizado a editar instrutor (RF-INSTR-12) — para os Passos 1-2.
- Um `ID_Instrutor` de teste, de preferência com Ficha já parcialmente preenchida.
- Confirmar que o template da rota `/print/ficha-instrutor` (`1EzYw9oSBFiM41Qi_F9qQylKTVxGbtwnQl_IaYinPUpg`) já tem as
  tags `{{TAG}}` da tabela em `data-model.md` — se não tiver, editar o Template antes do Passo 3.

## Passo 1 — Campos novos persistindo corretamente (US1)

1. Abrir o cadastro/edição de um instrutor de teste.
2. Na aba "1. Dados Pessoais", preencher RG, CPF, Órgão Emissor, Telefone e os 6 sub-campos de
   endereço (Logradouro, Número, Bairro, Cidade, Complemento, CEP).
3. Na aba "2. Dados Profissionais", preencher RETELMA.
4. Na aba "3. Dados Complementares", preencher Área de Conhecimento.
5. Salvar, reabrir a edição do mesmo instrutor — confirmar que todos os 12 valores persistiram
   exatamente como digitados, e que nenhum outro campo (existente antes desta spec) mudou de valor.

## Passo 2 — 3 abas e validação obrigatória (US2)

1. Abrir o cadastro de um novo instrutor — confirmar exatamente 3 abas visíveis: "1. Dados
   Pessoais", "2. Dados Profissionais", "3. Dados Complementares".
2. Preencher um valor em cada uma das 3 abas, trocar de aba várias vezes — confirmar que nenhum
   valor já digitado se perde ao trocar de aba.
3. Deixar "Nome de Guerra" (aba 1) vazio e "Posto/Graduação" (aba 1) preenchido; ir para a aba 3 e
   clicar Salvar — confirmar que o salvamento é bloqueado, um aviso indica o campo faltando, e a
   tela volta automaticamente para a aba 1.
4. Preencher os 4 campos obrigatórios e salvar — confirmar sucesso.
5. (Defesa em profundidade, opcional/avançado) Se houver forma de chamar `atualizarInstrutor`
   diretamente sem passar por `salvarEdicaoInstrutor_` (ex.: console do navegador,
   `a Server Action.atualizarInstrutor(id, {})`), confirmar que o backend rejeita com erro claro.
6. Confirmar que `ID_Instrutor` continua oculto no cadastro e somente leitura na edição — mesmo
   comportamento de antes desta spec, agora dentro da aba "1. Dados Pessoais" (FR-005, achado
   /speckit-analyze G2).
7. Confirmar que o card "Sistema (somente leitura)" (Carga Horária Ministrada, Instrutor completo,
   Status, Editado Por, Última Edição) continua aparecendo fora das 3 abas, exatamente como antes
   desta spec (research.md §1, achado /speckit-analyze G3).

## Passo 3 — Geração de PDF real (US3)

1. Abrir o modal "Imprimir Ficha" de um instrutor com Ficha completa (idealmente já passado pelo
   Passo 1).
2. Confirmar que o botão "Gerar PDF" aparece ao lado do botão "Imprimir" já existente.
3. Clicar "Gerar PDF" — confirmar que uma nova aba abre com um PDF real (não a caixa de diálogo de
   impressão do navegador), em menos de 30 segundos, sem erro no console.
4. Conferir que o conteúdo do PDF reflete os dados reais do instrutor nas tags mapeadas
   (`data-model.md`).
5. Abrir o  Supabase Storage do executor e confirmar que nenhum documento a rota de impressão `/print/*` temporário
   (diferente do Template original e do PDF final) ficou fora da lixeira.
6. Confirmar que o botão "Imprimir" (`window.print()`) continua funcionando normalmente, sem
   nenhuma mudança de comportamento.
7. (Caminho de erro, opcional) Esvaziar temporariamente o valor de `ID_TEMPLATE_FICHA_INSTRUTOR` em
   `config_parametros`, clicar "Gerar PDF" novamente — confirmar mensagem de erro clara no frontend,
   e restaurar o valor original depois do teste.
8. (Degradação segura de tag, FR-009, achado /speckit-analyze G1) No Template, acrescentar
   temporariamente uma tag sem correspondência no mapeamento (ex.: `{{TAG_INEXISTENTE}}`) e gerar o
   PDF de um instrutor com pelo menos um campo mapeado vazio (ex.: `RETELMA` em branco) — confirmar
   que o PDF é gerado sem exceção, a tag desconhecida permanece como texto literal `{{TAG_INEXISTENTE}}`,
   e o campo mapeado vazio aparece como string vazia (nunca `undefined`/`null` literal). Remover a
   tag de teste do Template depois da verificação.

## Resultado esperado

Todos os 3 passos concluídos sem exceção não tratada no console do navegador; nenhuma regressão nas
~30 colunas/comportamentos de `instrutores` existentes antes desta spec; nenhum documento
temporário órfão no Supabase Storage após qualquer geração de PDF, inclusive no caminho de erro do Passo 3.7.
