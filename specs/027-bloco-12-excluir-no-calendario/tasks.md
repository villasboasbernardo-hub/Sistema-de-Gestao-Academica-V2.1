# Tasks 027 — Bloco 12: excluir no Calendário

## Fase 0 — triagem e medição
- [x] T001 Medir o caminho do *Excluir* até o banco, o que `registros_do_feriado` conta, o 12/11, as regras de linha
  antiga e os outros *Excluir* do módulo (spec §2), na cópia `remoto-20261027-061453.sql`, só leitura.

## Fase 1 — banco (só acrescenta)
- [x] T002 Migration `20261027123023_exclusao_logica_no_calendario.sql`, aplicada no local com `migration up`.
- [x] T003 Medir na cópia, com `rollback`: o 12/11 e a linha da v2.0 nunca editada saem; `vw_dias_parados_turma` deixa de
  contar; a excluída congela; outra linha na mesma data; o Encarregado recusado (spec §7).
- [x] T004 `pnpm db:tipos`.
- [x] T005 pgTAP `152_exclusao_logica_no_calendario.sql`, visto reprovar sem a migration.

## Fase 2 — domínio puro (teste visto reprovar antes)
- [x] T006 `tests/unidade/exclusao-no-calendario.test.ts` (reprova: módulo inexistente).
- [x] T007 `lib/dominio/exclusao-no-calendario.ts`.

## Fase 3 — servidor
- [x] T008 `esquemaDaLinhaParaExcluir` em `lib/validacao/calendario.ts`.
- [x] T009 `lerImpactoDaExclusao` e `excluirLinhaDoCalendario` reescrita em `lib/acoes/calendario.ts`.

## Fase 4 — leitura e telas
- [x] T010 A lista do calendário sem as excluídas (`calendario.ts`).
- [x] T011 `page.tsx`: `podeExcluir` só do Admin; sem a leitura dos impedimentos.
- [x] T012 `ExcluirDoCalendario.tsx` e o painel.

## Fase 5 — testes de invariante e ponta a ponta
- [x] T013 RLS `tests/invariantes/rls/exclusao-no-calendario.test.ts`.
- [x] T014 e2e `tests/e2e/excluir-no-calendario.spec.ts` (SC-001 a SC-003) e `bloco-10.spec.ts` item 11.
- [x] T015 Defeitos deliberados: (a) o gatilho sem o porteiro de Admin → RLS reprova; (b) a lista sem o filtro de
  `excluido_em` → e2e reprova; (c) a ação sem revalidar / o painel mostrando o Excluir ao Encarregado → e2e reprova.

## Fase 6 — documentos, verificação e PR
- [x] T016 D-COR-7 e `PEND-027-1` no plano de correções e em `padroes-de-tela.md`; `reversao.sql`;
  `plano-de-aplicacao-no-remoto.md`; `roteiro-de-conferencia.md`.
- [ ] T017 Unidade, pgTAP e RLS verdes no local; os e2e tocados no local; commit; push; PR com o template; CI verde.
- [ ] T018 Rito do remoto (backup, dry-run só com ela, `db push`, conferência só de leitura).
