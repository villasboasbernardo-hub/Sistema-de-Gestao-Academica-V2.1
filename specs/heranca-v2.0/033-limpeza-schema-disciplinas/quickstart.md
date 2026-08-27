# Quickstart: Limpeza de Colunas Mortas em disciplinas e Coerência de Datas por Turma

**Pré-requisitos**: deploy publicado com o `o SHA do commit` desta spec; migração
`migracao/remover_colunas_mortas_cad_disciplinas.py` aplicada (local + banco de produção).

## Passo 1 — Colunas mortas removidas, sem regressão de tela

1. Abrir o banco `disciplinas` e confirmar que `Instrutores_Selecionados`,
   `Tecnica_Ensino_Sugerida` e `Local_Padrao` não existem mais no cabeçalho.
2. Navegar pelo Módulo de Disciplinas, Página do Curso, e (se houver acesso) Motor Preditivo e
   Estatísticas — confirmar que nenhuma tela quebra, nenhum erro no console, nenhum campo some que
   deveria estar lá (as 3 colunas removidas nunca tiveram consumidor de UI).
3. Rodar a migração de novo — confirmar que ela informa "já aplicado" e não faz nada.

**Esperado**: SC-001, FR-001, FR-002.

## Passo 2 — turma_disciplina preferida sobre a semente de grade

1. Escolher uma disciplina cuja turma já teve o período editado (`turma_disciplina.Previsao_Inicio`/
   `Termino` diferente de `disciplinas` da mesma disciplina — ex. qualquer edição feita via
   `app/(app)/cursos/[curso]/page.tsx`/`app/(app)/disciplinas/page.tsx` desde a spec 029).
2. Abrir o Diário de Classe Detalhado (ou o card de ritmo da disciplina) daquela turma e confirmar
   que o período exibido é o da turma, não o da grade.
3. Repetir para uma disciplina cuja turma ainda não teve o período editado
   (`Origem_Periodo='Herdado_Grade'` ou `'Nao_Informado'`) — confirmar que o comportamento é
   idêntico ao de antes desta spec (degrada para a semente).

**Esperado**: SC-002, FR-003, FR-004, FR-005.

## Passo 3 — Módulos fora de escopo permanecem intocados

1. Confirmar que o Motor Preditivo (simulação de ano futuro) continua funcionando normalmente —
   ele nunca usa `turma_disciplina` (não existe para anos futuros) e não foi alterado.
2. Confirmar que as Estatísticas de Disciplinas sem filtro de turma continuam mostrando os mesmos
   números de antes desta spec.

**Esperado**: SC-003.

## Passo 4 — Regressão

1. `pnpm vitest run` — 0 falhas, incluindo os casos novos de `resolverPeriodoEfetivo_`
   e das 2 funções ajustadas.
2. Confirmar que nenhum teste pré-existente de `lib/acoes/cronograma.ts`/`lib/acoes/estatisticas.ts`/`lib/dominio/motor-preditivo.ts`
   mudou de resultado.

**Esperado**: SC-004.
