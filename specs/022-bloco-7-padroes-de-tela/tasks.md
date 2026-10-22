# Tasks — Spec 022, Bloco 7: padrões de tela (um PR, sem banco)

## Fase 1 — domínio (puro, com teste visto falhar)
- [X] T001 [US3] `lib/dominio/ordem-de-cursos.ts` + `tests/unidade/ordem-de-cursos.test.ts`; `CLASSIFICACOES_DE_CURSO`
  na ordem da A-4, e os testes que fixavam a ordem antiga emendados
- [X] T002 [US4] `lib/dominio/avisos/central.ts` + teste: chave, módulos, agrupamento, não vistos, resumo

## Fase 2 — componentes de base
- [X] T003 [US1] `components/ciaara/botao-de-icone.tsx` (folha de cliente, com o vocabulário `ICONE_DA_ACAO` no mesmo
  arquivo), amostra na vitrine, listas de fronteira; `BarraDeAcoes` à direita
- [X] T004 [US2] `components/ciaara/dialogo-de-formulario.tsx` (folha de cliente), amostra na vitrine
- [X] T005 [US1] Guarda `tests/unidade/botoes-de-icone.test.ts` (compilador do TypeScript, controle positivo)

## Fase 3 — item 6 e item 5 (os menores)
- [X] T006 [US6] Cores do DSA em `grade-alocacao.tsx` / `grade-dsa.tsx` / `ControleDeParadas.tsx` (tokens D-13)
- [X] T007 [US5] Contrato `aba` (grade → turmas), redirecionamento, `AbaTurmas`, `AbaSobre` enxuta, avaliações previstas
  na aba *Avaliações*, `AbaHorarios` sem vigências e com *Editar*

## Fase 4 — item 3
- [X] T008 [US3] Ordem nos consumidores: catálogo, `/turmas`, Início, submenu, aba *Turmas*, filtros de curso

## Fase 5 — item 4
- [X] T009 [US4] `app/(app)/avisos/leitura.ts` (`lerAvisos`), `page.tsx`, `MarcarComoVistos.tsx`, `resumo/route.ts`;
  contrato da rota
- [X] T010 [US4] `components/casca/sininho-de-avisos.tsx` no cabeçalho; listas da casca
- [X] T011 [US4] Saem os oito quadros e as leituras que só eles usavam; o link do DSA sem vigência corrigido

## Fase 6 — item 2
- [X] T012 [US2] Página própria da disciplina (editar e nova), contrato, ícones na grade de *Editar curso*; o detalhe
  da linha só leitura
- [X] T013 [US2] Diálogos: UE, avaliação do currículo, arbitrado, regime, limite, novo currículo
- [X] T014 [US2] Diálogos da turma e do DSA: previsto, período, instrutores, TA fora do DSA, juntar, parar dia,
  assinaturas; sala; nome do perfil
- [X] T015 [US2] Guarda: nenhum campo aberto nas páginas de leitura

## Fase 7 — item 1 nas telas
- [X] T016 [US1] Botões de ícone nas barras e nas linhas de todas as telas (inventário da triagem), tema em ícones

## Fase 8 — testes, prova e entrega
- [ ] T017 E2E por clique: sininho e Avisos, diálogos, página da disciplina, ordem, abas, cores; os casos dos quadros
  migrados; os casos dos botões pelo nome acessível
- [ ] T018 Retrato das telas do DSA idêntico (SC-005); `pnpm verificar`; pgTAP e invariantes; e2e dos arquivos tocados
- [ ] T019 Plano de correções (Rodada 2 / Bloco 7), roteiro de conferência, PR com o template, CI verde, lote de dúvidas
