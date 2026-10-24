# Tarefas — spec 024 (Bloco 9)

## Fase 1 — banco
- [x] T001 M1: colunas do rascunho, trilha, funções de rascunho/salvar/descartar/alterar/publicar, `vw_ocupacao_do_dsa`,
      marca presencial e `vw_carga_presencial_turma`
- [x] T002 M2: o filtro do salvo nas 13 definições, os índices da sessão, `chd_da_turma_na_etapa_ate` e a guarda de escrita
- [x] T003 pgTAP `148` (estrutura, o caso que discrimina, sombra, trava, guarda do catálogo)
- [x] T004 RLS `tests/invariantes/rls/publicacao-do-dsa.test.ts` (quem lança grava; quem não lança é recusado; a escrita
      direta nasce rascunho; o salvo não muda fora do Salvar)
- [x] T005 `reversao.sql`

## Fase 2 — domínio
- [x] T006 `lib/dominio/dsa/publicacao.ts` + teste (visto falhar)
- [x] T007 `contagemDaTurma` e `controle_da_dead` em `andamento-da-turma.ts` + teste (visto falhar)

## Fase 3 — escrita e leitura
- [x] T008 `lib/acoes/dsa.ts` pelo RPC de rascunho; leituras da própria turma pela grade com rascunho
- [x] T009 `leitura.ts` com `comRascunho`; impressão e planilha só do salvo
- [x] T010 as demais leituras com o filtro (aba Avaliações, avisos, atividades, planilha)
- [x] T011 guarda TS do RP-8

## Fase 4 — telas
- [x] T012 `PainelDaPublicacao` (situação, Salvar, Descartar, Publicar, Fazer alteração, Publicar alteração, histórico)
- [x] T013 o papel: PRÉVIA e ALT; impressão do retrato (`?versao=`)
- [x] T014 «não salvo» no cartão; a trava desliga o lançamento e o «Parar dia» da turma
- [x] T015 item 2: os quatro leitores, a ficha (aviso da DEaD e da contagem) e a marca em *Editar disciplina*

## Fase 5 — prova e entrega
- [x] T016 retrato das telas antes × depois (cópia `remoto-20261023-130122.sql`)
- [x] T017 retrato das páginas antes × depois
- [x] T018 impressão digital do que soma e reversão provada com dado
- [x] T019 medição do item 2
- [x] T020 e2e `publicacao-do-dsa.spec.ts` e o ajuste dos e2e do DSA ao rascunho
- [x] T021 defeitos deliberados; `verificar:tudo`; rito do remoto (portão: PARAR se mudar número de tela)
- [ ] T022 PR, CI verde, plano de correções
