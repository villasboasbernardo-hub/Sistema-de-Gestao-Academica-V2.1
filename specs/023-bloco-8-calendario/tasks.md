# Tarefas — spec 023 (Bloco 8)

Ordem de dentro para fora. `[P]` = pode correr em paralelo.

## Fase 1 — banco

- [x] T001 Migration M1 (`supabase/migrations/<carimbo>_calendario_tipo_e_abrangencia.sql`) conforme `contracts/banco.md`
- [x] T002 Migration M2 (`<carimbo>_dias_parados_respeitam_abrangencia.sql`)
- [x] T003 `scripts/etl/carregar.py`: `app.feriado_turma_codigo_seq` em `SEQUENCIAS_DE_CODIGO`
- [x] T004 pgTAP `supabase/tests/1xx_calendario_abrangencia.sql`: estrutura (RLS, 0 `for delete`, `security_invoker`,
      `grant execute`), o gatilho do tipo e o caso que discrimina da view — visto falhar antes da M2
- [x] T005 RLS `tests/invariantes/rls/calendario.test.ts`: Operador recusado com `42501` (linha completa) em `feriado_turma`
      e em `feriados`; Encarregado grava (controle positivo)
- [x] T006 `pnpm db:reset:limpo` + `pnpm db:tipos`; `reversao.sql` escrita

## Fase 2 — domínio e validação

- [x] T007 [P] `lib/dominio/calendario.ts` (RN-EVT-02 citado): `alcancaTurma`, `datasQueAlcancam`, `tipoDaLinha`,
      `rotuloDaAbrangencia`, `diasBloqueadosComLancamento` — com `tests/unidade/calendario.test.ts` visto falhar antes
- [x] T008 [P] `lib/calendario/abrangencia.ts` (`linhasComAbrangencia`, `COLUNAS_DA_ABRANGENCIA`)
- [x] T009 [P] `lib/validacao/calendario.ts` e a emenda de `lib/validacao/dia-parado.ts` (`turmaId` nulo só com
      `alcance: "todas"` e sem TR)

## Fase 3 — os leitores respeitam a abrangência (FR-015)

- [x] T010 `lib/acoes/dsa.ts` — as duas leituras do calendário
- [x] T011 `app/(app)/turmas/[turma]/dsa/leitura.ts` — o período e a faixa (feriado com `destino: "feriado"`)
- [x] T012 ficha (`turmas/[turma]/page.tsx`), `/turmas` (`page.tsx` + `consulta.ts`), `/inicio` (`page.tsx` +
      `panorama.ts`), avisos (`avisos/leitura.ts`)
- [x] T013 guarda `tests/unidade/calendario-abrangencia.test.ts` (toda leitura de `feriados` pede `feriado_turma`) — vista
      reprovar com um leitor sem o embutido

## Fase 4 — ações e telas

- [x] T014 `lib/acoes/dia-parado.ts`: grava `tipo_parada_id`; `turmaId` opcional no global sem TR; revalida `/atividades`
- [x] T015 `lib/acoes/calendario.ts` (criar/editar com turmas, inativar/reativar, lançamentos no dia)
- [x] T016 DSA: `ControleDeParadas` com `podeDesfazerGlobal` e confirmação do feriado; `dsa/page.tsx` passa a permissão
- [x] T017 `/atividades`: abas por `?aba=`, contrato de URL (`aba`, `ano`), `AnoDoPainel` com `/atividades`
- [x] T018 aba Calendário: tabela, diálogo da linha (tipo, impacto, abrangência por marcação), confirmar
      inativar/reativar, *Parar dia* (todas as turmas), resposta acima da lista
- [x] T019 sininho: módulo `calendario` em `avisos/leitura.ts` (+ domínio de avisos se houver tipo de módulo)

## Fase 5 — prova e entrega

- [x] T020 e2e `tests/e2e/calendario.spec.ts` (os quatro percursos do plano), por clique, banco conferido
- [x] T021 Medição do item 3 (`antes-depois.md`) sobre `remoto-20261022-220721.sql`; e a impressão digital da view
      antes × depois da M2 (SC-005)
- [x] T022 Defeitos deliberados nos testes que provam a mudança (filtro de abrangência removido; botão sem permissão;
      M2 sem a cláusula)
- [x] T023 `pnpm verificar:tudo`; papel do DSA sem diff (`app/print/`, `lib/dominio/dsa/impressao*`)
- [x] T024 Rito do remoto (backup, dry-run só M1+M2, `db push`, conferência só de leitura)
- [x] T025 Commit, push, PR com o template, CI verde; `roteiro-de-conferencia.md`; plano de correções e pendências
