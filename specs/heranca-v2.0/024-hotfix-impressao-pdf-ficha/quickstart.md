# Quickstart — Hotfix: Título/Cabeçalho da Ficha do Instrutor, Novo Fluxo de Impressão via PDF do Supabase Storage e Completar Tags do Template

Roteiro de validação manual contra a aplicação Next.js implantada. Nenhuma das 4 mudanças de código tem
harness automatizado disponível (DOM/JS sem mock no projeto); a completude de tags do Template não
é testável por `pnpm vitest run` de forma alguma (artefato externo ao Supabase Storage).

## Pré-requisitos

- Acesso à aplicação Next.js com um perfil autorizado a visualizar a Ficha (mesmo alcance já configurado
  desde a spec 022).
- Um instrutor de teste com Posto/Graduação, Especialidade e Nome de Guerra preenchidos.
- template da rota `/print/ficha-instrutor` já com as 14 tags novas inseridas (contracts/template-tags.md) — passo
  não-navegador, feito via API do a rota de impressão `/print/*` antes do teste de aceite abaixo.

## Passo 1 — Título e cabeçalho corretos (US1)

1. Abrir a Ficha do instrutor de teste.
2. Confirmar que o título mostra posto/graduação e especialidade junto do nome (mesmo formato da
   listagem principal, RF-INSTR-15) — nunca só o nome.
3. Confirmar que o cabeçalho on-screen mostra, centralizado e em TUDO MAIÚSCULO, nesta ordem:
   "MARINHA DO BRASIL" / "CENTRO DE INSTRUÇÃO E ADESTRAMENTO ALMIRANTE RADLER DE AQUINO" /
   "DIVISÃO DE ADMINISTRAÇÃO ACADÊMICA", com "Ficha do Instrutor" como subtítulo logo abaixo (não
   maiúsculo).

## Passo 2 — Impressão via PDF, sem página em branco (US2)

1. Com a Ficha aberta, confirmar que o rodapé do modal mostra os botões "Fechar", "Salvar Ficha no
   Supabase Storage" e "Imprimir" (não mais "Gerar PDF").
2. Clicar em "Imprimir" — confirmar que abre uma nova aba com o PDF gerado (nunca o preview de
   impressão nativo do navegador sobre o modal).
3. No PDF aberto, confirmar visualmente que não há nenhuma página em branco.
4. Acionar a impressão pelo visualizador nativo de PDF do navegador (`Ctrl+P` sobre a aba do PDF) —
   confirmar que imprime só o conteúdo real da Ficha.
5. Clicar em "Salvar Ficha" — confirmar que o comportamento é idêntico ao de "Imprimir"
   (mesmo PDF gerado/atualizado, nova aba) — só o rótulo do botão muda.
6. Repetir o teste de impressão do DSA (Épico H, impressão A4 paisagem) — confirmar que continua
   funcionando exatamente como antes desta spec, sem regressão na correção `display`/`revert` da
   spec 023.

## Passo 3 — PDF com todas as 34 tags preenchidas (US3)

1. Gerar o PDF do instrutor de teste (Posto/Graduação, Especialidade, Nome de Guerra e os 14 campos
   novos preenchidos no cadastro).
2. Abrir o PDF e confirmar que os 14 campos novos aparecem preenchidos com o dado real cadastrado,
   no lugar antes ocupado pela tag ou por um espaço em branco.
3. Confirmar que a linha "SERÁ INSTRUTOR DE QUAL DISCIPLINA/CURSO:" mostra o valor de
   `Disciplinas_Ministradas` no lugar dos sublinhados.
4. Confirmar que nenhuma tag `{{...}}` literal aparece em nenhum lugar do documento.
5. Gerar o PDF de um segundo instrutor de teste com um dos 14 campos novos vazio (ex.: sem
   `RETELMA` cadastrado) — confirmar que o campo correspondente aparece vazio no PDF, sem erro e
   sem tag literal.

## Resultado esperado

Todos os 3 passos concluídos sem exceção não tratada no console do navegador; nenhuma regressão na
impressão do DSA; nenhuma tag `{{...}}` literal visível em nenhum PDF gerado.
