# Quickstart — Hotfix e Nova Feature: Integração de Template SPA, Máscaras de Input e Limpeza de Formulário

Roteiro de validação manual contra a aplicação Next.js implantada. Nenhuma das mudanças de DOM/CSS tem
harness automatizado disponível; as 4 funções de máscara têm teste automatizado próprio
(`pnpm vitest run`), verificação aqui é confirmatória.

## Pré-requisitos

- Migração `remover_instrutor_completo_adicionar_estado.py` já aplicada à banco de produção
  (pendência real — ver contracts/backend-migration.md).
- Um instrutor de teste com endereço completo preenchido.

## Passo 1 — Ficha como página inteira, sem modal (US1)

1. Na listagem de instrutores, clicar em "Ficha" — confirmar que a tela inteira muda para a Ficha
   (nunca um modal sobreposto/backdrop).
2. Confirmar os 3 botões no topo: "Voltar", "Salvar Ficha", "Imprimir".
3. Clicar "Voltar" — confirmar retorno à listagem principal.
4. Reabrir a Ficha, clicar "Salvar Ficha" — confirmar um toast de sucesso (não mais
   `alert()`/nova aba silenciosa).
5. Clicar "Imprimir" — confirmar que o preview de impressão do navegador mostra **só** o conteúdo
   da Ficha, sem nenhuma página em branco.
6. Repetir o teste de impressão do DSA (Épico H, A4 paisagem) — confirmar que funciona corretamente
   (o redesenho do `@media print` compartilhado é validado nos dois casos juntos).

## Passo 2 — Abas sem conteúdo repetido/solto (US2)

1. Abrir a edição de um instrutor — nas Abas 1 e 2, confirmar que **nenhum** dos 3 painéis (Sistema,
   Disciplinas Habilitadas, Qualificação do Instrutor) aparece.
2. Selecionar a Aba 3 ("Dados Complementares") — confirmar que os 3 painéis aparecem, com "Sistema"
   como card avulso (não misturado aos campos de Qualificação Docente).
3. Confirmar que o card mostra só "Sistema" no título, sem o sufixo "(Somente Leitura)".

## Passo 3 — Coluna `Instrutor_Completo` removida (US3)

1. Abrir a edição de qualquer instrutor — confirmar que o campo "Instrutor (nome completo
   formatado)" não aparece em lugar nenhum.
2. Na banco de produção, confirmar que a coluna `Instrutor_Completo` não existe mais em
   `instrutores`, e que `migracao_log` tem a linha da remoção.

## Passo 4 — Campo Estado e máscaras (US4)

1. Abrir "Cadastrar Novo Instrutor" — confirmar que o campo "Estado" já nasce com "RJ" selecionado.
2. No campo CPF, digitar `12345678901` — confirmar `123.456.789-01` aparecendo em tempo real.
3. No campo CEP, digitar `12345678` — confirmar `12345-678`.
4. No campo Telefone, digitar 11 dígitos — confirmar `(00) 00000-0000`; digitar 10 dígitos —
   confirmar `(00) 0000-0000`.
5. No campo RETELMA, digitar 10 dígitos — confirmar `(00) 0000-0000`; digitar 8 dígitos — confirmar
   `0000-0000`.
6. Confirmar que NIP e os campos de Data continuam validando exatamente como antes desta spec.

## Resultado esperado

Todos os 4 passos concluídos sem exceção não tratada no console do navegador; impressão da Ficha E
do DSA sem nenhuma página em branco; nenhum campo/painel fora da aba correta; nenhuma referência
visível a `Instrutor_Completo`; as 4 máscaras formatando em tempo real.
