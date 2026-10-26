# Tarefas — spec 026 (Bloco 11)

## Fase 0 — regras e triagem
- [X] T001 `docs/correcoes/regras-do-dsa-lancamento.md` (RD-1 a RD-8) e o ponteiro no `CLAUDE.md`
- [X] T002 Triagem medida na `main` e na cópia do remoto (spec §3)

## Fase 1 — domínio puro (teste visto reprovar antes)
- [X] T003 `instrutoresDaAula` + `preencherLancamento` com habilitados (RD-1, D-3)
- [X] T004 `slotDoEstudoIndividual` pela RD-2 (D-7, D-8) — o caso `:245-247` muda de 1 para o último tempo
- [X] T005 `regimeDaSemana` e `semanasSalvas` (RD-3)
- [X] T006 `operacoesDeLimpeza` (RD-4, D-17)
- [X] T007 `seloDaSituacao`, `versaoVigentePorTurma` (RD-5, RD-7)
- [X] T008 `contagemPorSituacao` (RD-8)

## Fase 2 — banco (só acrescenta)
- [X] T009 Migration do regime da semana (tabelas, funções, RLS, grants)
- [X] T010 pgTAP `151` com os casos que discriminam
- [X] T011 `pnpm db:tipos`

## Fase 3 — servidor
- [X] T012 RD-1 na Server Action: par final na edição, instrutor ativo (D-4, D-5)
- [X] T013 RD-2 no botão do EI (pela semana lida) e no cartão fixo do papel e na planilha (D-9)
- [X] T014 `temposDoDiaDaTurmaNoServidor` com a data (D-14)
- [X] T015 `definirRegimeDaSemana` e o grava-ao-salvar (RD-3)
- [X] T016 `limparSemanaDoDsa` (RD-4)

## Fase 4 — leitura e telas
- [ ] T017 Leitura do DSA: status, habilitações, regime da semana (RD-1, RD-3)
- [ ] T018 Formulário e cartão: a lista da aula filtrada (RD-1)
- [ ] T019 Vocabulário de ícones e o selo com ícone (RD-5, RD-6)
- [ ] T020 A barra de ações no cabeçalho do DSA, o fim dos cartões, *Versões publicadas* (RD-6, D-24)
- [ ] T021 O diálogo do regime e o *Limpar* (RD-3, RD-4)
- [ ] T022 Os rascunhos até o sábado na tela e na impressão (FR-005.3)
- [ ] T023 Início: os cartões por situação, o carrossel das turmas sem *Abrir DSA* (RD-8, item 7)
- [ ] T024 Início: o carrossel do DSA publicado, a escolha da semana, a escala do papel (RD-7)
- [ ] T025 *Editar turma*: a vigência atual do regime, só leitura (D-10)

## Fase 5 — testes de ponta a ponta e conferência
- [ ] T026 RLS com sessão real do regime da semana e do Limpar
- [ ] T027 E2E por clique de cada item; os casos antigos ajustados ao desenho
- [ ] T028 Defeitos deliberados nos testes que provam a mudança
- [ ] T029 Roteiro de conferência, plano de aplicação, plano de correções; `verificar:tudo`; PR; CI; remoto
