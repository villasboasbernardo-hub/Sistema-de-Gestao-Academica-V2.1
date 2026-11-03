# Tarefas — spec 033 (Bloco 18)

## Fase 1 — banco e domínio (fundação)

- [X] T001 Passo 0: a tabela das AEC previstas e dos limites, conferida por Bernardo (`passo-0-aec-dos-curriculos.md`)
- [X] T002 M1 `20261103140231` (só acrescenta) e M2 `20261103140512` (recria) em `supabase/migrations/`
- [X] T003 A medição do efeito zero na cópia do remoto (`medicao-efeito-zero.md`)
- [X] T004 `lib/tipos/database.ts`, BRIEF §2.1, pgTAP `010` e `105`, `SEQUENCIAS_DE_CODIGO`
- [X] T005 [US1] O «Conta como» em `lib/dominio/categoria-pelo-tipo.ts` e as regras de `lib/dominio/atividades/`
- [X] T006 Vitest `tests/unidade/atividades-bloco-18.test.ts`
- [X] T007 O contrato de URL, os endereços das abas e o esqueleto das abas (turma, DSA, módulo); as frases das recusas

## Fase 2 — telas (em paralelo)

- [ ] T010 [US2] A — AEC previstas em *Editar curso → Currículo → Atividades* (RC-6) e na aba *Atividades* do curso
- [ ] T011 [US1] B — o lançamento no DSA (RA-4): tipo pelo rótulo, «Conta como», disciplina, vínculo, palestrante com OM, sala ou texto; o cartão de edição; o «TA da disciplina» como CHD nos leitores TS
- [ ] T012 [US3] C — Palestras e APOINST na turma, no DSA (só leitura) e no módulo; a marcação à mão; *Nova APOINST*
- [ ] T013 [US4] D — a aba *Atividades* do módulo (filtros, estatísticas, ações da linha) e a da turma
- [ ] T014 [US5] E — `/admin/tipos-de-atividade` e o módulo *Atividades* do sininho

## Fase 3 — provas

- [ ] T020 pgTAP `156_bloco_18_atividades.sql` (o caso que discrimina do «Conta como», as tabelas, a RC-6, a trilha) e os pgTAP antigos que contam o catálogo
- [ ] T021 RLS com sessão real `tests/invariantes/rls/atividades-bloco-18.test.ts` (o Operador como caso que discrimina)
- [ ] T022 As guardas compartilhadas (`fronteira-das-telas`, `sem-campo-aberto`, `telas-acessiveis`, contrato)
- [ ] T023 Os e2e dos arquivos afetados, com 1 processo; a revisão adversarial
- [ ] T024 `pnpm verificar` + pgTAP + RLS verdes; push; PR; CI verde

## Fase 4 — remoto e cargas

- [ ] T030 Rito do remoto das duas migrations
- [ ] T031 A carga das 48 AEC previstas (item 6) e a dos 24 PDFs (item 7), com backup e conferência só de leitura
- [ ] T032 Regras RA no `CLAUDE.md`, no documento 04 e no plano de correções (`PEND-033-*`); o roteiro de conferência
