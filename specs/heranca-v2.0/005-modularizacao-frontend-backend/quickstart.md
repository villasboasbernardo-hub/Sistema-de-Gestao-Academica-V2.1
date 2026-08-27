# Quickstart — Validação Épico B (Modularização Frontend/Backend)

## Pré-requisitos

- Repositório na branch `005-modularizacao-frontend-backend`, `tasks.md` completo e implementado.
- `pnpm vitest run` disponível (mesma suíte usada por todos os épicos anteriores).
- Acesso à implantação `o fluxo Git → Vercel` viva (Deployment ID fixo, ver `o histórico de deploys da Vercel`) para o
  passo de verificação manual — ou ``git push` (a Vercel publica a preview da branch)`/`o fluxo Git → Vercel open --webapp` local antes do deploy real.

## 1. Não regressão estrutural (SC-003, FR-007)

```sh
pnpm vitest run tests/unidade/*.test.ts
```

**Esperado**: mesma contagem de passes/todos que o baseline imediatamente anterior a este épico
(nenhum arquivo de backend foi tocado — research.md achado 4 — então zero diferença é o resultado
correto, não "aceitável"). Qualquer teste que passe a falhar indica um erro de extração (nome de
função digitado errado, `id` de DOM não atualizado), não uma mudança intencional.

## 2. Localização em arquivo único (SC-001, FR-001/FR-001a)

```sh
grep -rn "salvarAvaliacao\|carregarPainelavaliacoes\|salvarVistaProva" app/*.html
```

**Esperado**: todas as ocorrências (declaração + chamada) em `app/(app)/avaliacoes/page.tsx`, exceto as duas
chamadas guardadas por `typeof` em `app/(app)/cursos/[curso]/page.tsx` (contrato de integração,
`contracts/frontend-view-contract.md`).

```sh
grep -in "avalTurma\|avalGrade\|avalTipo\|avalData\|avalInstrutor\|formAvaliacao\|salvarAvaliacao" `app/(app)/atividades/page.tsx`
```

**Esperado**: nenhuma ocorrência de campo/função de avaliação (FR-001a) — comentários que só
mencionam a extração em prosa (ex.: "o formulário Agendar avaliação foi movido para
`app/(app)/avaliacoes/page.tsx`") não contam como campo e podem aparecer.

## 3. Paridade funcional na Página do Curso (Acceptance Scenario 3)

1. Publicar via `o fluxo Git → Vercel` (ou `o fluxo Git → Vercel open --webapp` local) e abrir a aplicação Next.js.
2. Ir em "Página do Curso", selecionar um curso.
3. Confirmar que os 3 indicadores de teto (AEC/TAD/TR) e o painel de Estudo Individual aparecem
   normalmente — nenhum bloco a mais, nenhum a menos além dos que saíram (totalizadores, painel de
   avaliações, vista de prova).

## 4. Paridade funcional em Atividades Extraclasse (Acceptance Scenario 4)

1. Ir em "Atividades Extraclasse".
2. Confirmar que só existe o formulário de AEC/TAD/TR/Estudo Individual — nenhum campo de
   avaliação (categoria, disciplina, tipo de avaliação, instrutor responsável).
3. Lançar um AEC de teste e confirmar que salva normalmente (nenhuma mudança de comportamento).

## 5. Nova tela de Avaliações (Acceptance Scenario 1/2)

1. Ir na nova aba "Avaliações" (menu).
2. Selecionar um curso na Página do Curso primeiro (contrato de integração via `typeof`); voltar à
   aba Avaliações e confirmar que o painel de situação de execução carregou para aquele curso.
3. Agendar uma avaliação nova — confirmar a mesma mensagem de sucesso de antes ("ainda não consome
   tempo de aula...").
4. Registrar uma vista de prova para uma avaliação já concluída — confirmar o mesmo cálculo de CHD
   atualizada de antes.
5. Cancelar um agendamento — confirmar o mesmo comportamento de antes.

## 6. Nova tela de Relatório (User Story 3)

1. Ir na nova aba "Relatório".
2. Selecionar o mesmo curso testado no passo 3; comparar os totalizadores (CHD/AEC/TAD/TR/Estudo
   Individual/CHT) com os valores que a Página do Curso mostrava antes da extração (mesmo curso,
   mesmos lançamentos) — devem ser idênticos.

## 7. Mapa de arquitetura reconciliado (SC-004, FR-004/FR-005)

```sh
node -e "
const fs = require('fs');
const backend = fs.readdirSync('src/backend').filter(f => f.endsWith('.ts'));
const frontend = fs.readdirSync('src/frontend').filter(f => f.endsWith('.html'));
console.log('backend:', backend.sort());
console.log('frontend:', frontend.sort());
"
```

Comparar manualmente contra as duas tabelas de `docs/arquitetura/02-modularizacao.md` — toda linha
sem "não construído" deve corresponder a um arquivo real da lista acima; todo arquivo real deve
aparecer em alguma linha.

## 8. Detecção de implantação parcial continua correta (SC-005, FR-006)

1. Alterar só `o SHA do commit` em `lib/supabase/server.ts` (ex.: incrementar o sequencial) sem publicar o
   frontend correspondente (ou vice-versa) num ambiente de teste.
2. Abrir a aplicação Next.js — **esperado**: banner vermelho "Implantação parcial detectada", igual ao
   comportamento já existente desde o Épico E, agora com o número de arquivos atual (não o
   antigo).
3. Reverter o `o SHA do commit` de teste antes de prosseguir para o deploy real.
