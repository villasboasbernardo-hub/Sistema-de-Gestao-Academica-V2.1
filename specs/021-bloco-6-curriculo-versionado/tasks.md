# Tasks: Bloco 6 — currículo versionado (spec 021)

## PR 1 — banco (portão da regra 9.4)

- [X] T001 Triagem medida na `main` `fa372c2` e na cópia do remoto (`triagem.md`); mapa do código (`contracts/codigo.md`)
- [X] T002 Instrumentos: `scripts/provas/impressao_digital_do_curriculo.sql` e `tests/invariantes/retrato-das-telas.test.ts`
  (determinístico: duas rodadas, 0 diferenças)
- [X] T003 M1 `20261021030049_curriculo_versionado_estrutura.sql` (só acrescenta)
- [X] T004 M2 `20261021030050_curriculo_versionado_ligacao.sql` (altera), com os atributos originais das funções conferidos
- [X] T005 Antes × depois na cópia `remoto-20261020-235051.sql`: impressão e retrato idênticos (`antes-depois.md`)
- [X] T006 O caso que discrimina na cópia (10 casos + a troca levando o planejamento)
- [X] T007 Reversão provada com dado (`reversao.sql`), e a reaplicação remedida
- [X] T008 `pnpm db:tipos`; pgTAP `144` (31), visto reprovar com a junção pelo curso; guardas `010`, `105`, `107`, `127`
  emendadas pela regra dos valores esperados; BRIEF §2.1
- [X] T009 Traduções das recusas novas; `SEQUENCIAS_DE_CODIGO`; o ETL reaplicando a D-1 com o índice provisório (carga
  APROVADA); o bloco do arbitrado da RLS com curso próprio
- [X] T010 Suítes na base limpa: pgTAP 971, unidade 2.614, RLS 417
- [ ] T011 **PORTÃO** — Bernardo aprova o desenho (`contracts/banco.md`) e o lote de dúvidas (`spec.md`)
- [ ] T012 Ponta a ponta inteira (`pnpm verificar:tudo`), e o que a trava derrubar ajustado sem afrouxar a trava
- [ ] T013 PR 1 com o template; CI verde
- [ ] T014 Rito do remoto (`plan.md`), remedindo sobre o backup do dia; conferência só de leitura
- [ ] T015 Roteiro de conferência do PR 1 (o que muda é o que a tela recusa)

## PR 2 — código e telas

- [ ] T020 A cópia (`public.criar_versao_do_curriculo`), com a prova do porteiro com sessão real
- [ ] T021 Os leitores pela versão (`contracts/codigo.md`): DSA, papel, planilha, abas do curso, ficha, avaliações,
  habilitações; a duração da versão
- [ ] T022 A sincronização (VIRADA-1) casando na versão da turma
- [ ] T023 As telas (D-16): seletor de versão, *Nova versão do currículo*, a versão na ficha da turma e na turma nova
- [ ] T024 O retrato das telas antes × depois (0 diferenças) e o SC-004 por clique (CAHO 2027 pela v2, CAHO 2026 igual)
