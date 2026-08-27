# Quickstart — Validação Épico A (Design System Unificado)

## Pré-requisitos

- Branch `007-design-system-unificado`, `tasks.md` completo e implementado.
- `pnpm vitest run` disponível.
- Acesso à implantação `o fluxo Git → Vercel` viva para os passos de verificação manual no navegador (a maioria
  desta spec é visual — sem saída numérica testável automaticamente).

## 1. `formatarNomeInstrutor_` (única lógica testável automaticamente)

```sh
pnpm vitest run tests/design_system.test.ts
```

**Esperado**: formato "P/G Especialidade/Habilitação **Nome de Guerra**" (negrito), sem espaços
duplos nem "undefined" para campos vazios.

## 2. Objeto UI e cores semânticas (User Story 1, SC-001)

1. Adicionar uma cor semântica de teste em `app/globals.css` (`:root`).
2. Confirmar que ela fica disponível em qualquer view sem editar CSS em mais de um arquivo.
3. Reverter a cor de teste.
4. Abrir as 4 views que já usam `badge-categoria-*` (Avaliações, Curso, DSA, Relatório) e confirmar
   que as 5 cores continuam **exatamente** as mesmas de antes da migração para `var(--cor-*)`.

## 3. Temas claro/escuro (User Story 2, SC-003)

1. Limpar `localStorage` do navegador (simula primeiro acesso).
2. Configurar o SO/navegador para tema escuro; abrir o sistema — confirmar que carrega direto no
   tema escuro, sem "flash" do tema claro antes.
3. Usar o toggle manual para trocar para o tema claro; recarregar a página — confirmar que o tema
   claro persiste (a escolha manual prevalece sobre a preferência do SO).
4. Abrir qualquer tela já existente (Cronograma, Avaliações, Usuários) nos dois temas e confirmar
   contraste adequado — nenhum campo "claro demais" como no modo noturno da V1.0.
5. Em `app/(app)/cronograma/page.tsx`, aplicar um filtro (ex.: filtro de disciplina/instrutor) ou selecionar
   um curso/turma; alternar o tema; confirmar que o filtro/seleção continua aplicado — o toggle de
   tema nunca deve limpar estado de tela (spec.md, Edge Cases).

## 4. Componentes reutilizáveis (User Story 3, SC-004)

1. Abrir `app/(app)/instrutores/page.tsx` e confirmar que o nome aparece como "P/G Especialidade/Habilitação
   **Nome de Guerra**", não `Nome_Guerra` cru.
2. Abrir `app/(app)/cronograma/page.tsx` e confirmar que a grade semanal continua funcionando exatamente como
   antes da extração do componente `.grade-semanal` (Épico G intocado funcionalmente).

## 5. Identidade institucional (User Story 4, SC-005)

1. Abrir o sistema e confirmar que a navbar mostra o título de exibição "Sistema de Gestão
   Acadêmica".
2. Se o asset do brasão já tiver sido fornecido e configurado: confirmar que ele aparece ao lado do
   título. Se ainda não: confirmar que a navbar degrada graciosamente (só o texto, sem ícone de
   imagem quebrada) — ver research.md achado 4.
3. Confirmar que todos os itens de menu existentes continuam funcionando sem mudança.

## 6. Não regressão geral

```sh
pnpm vitest run tests/unidade/*.test.ts
```

**Esperado**: nenhuma regressão em nenhum teste já existente — só o teste novo de
`formatarNomeInstrutor_` é adicionado.
