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
- [X] T017 E2E por clique: sininho e Avisos, diálogos, página da disciplina, ordem, abas, cores; os casos dos quadros
  migrados; os casos dos botões pelo nome acessível. *(Local: 145 de 241 casos dos 25 arquivos tocados até o sistema
  parar a rodada por falta de memória, com uma reprovação — o instável da `PEND-014-7`; a rodada inteira é a do CI.)*
- [X] T018 Retrato das telas do DSA idêntico (SC-005); `pnpm verificar`; pgTAP e invariantes; e2e dos arquivos tocados.
  *(`tsc`, `eslint`, `prettier`, unidade — 2.683 casos em 197 arquivos — e `next build` verdes; três defeitos
  deliberados vistos reprovar. ⚠️ **O retrato das telas do DSA NÃO foi rodado** — exige dois servidores e a memória da
  máquina não comporta; a SC-005 fica provada pela **ausência de diferença** em `app/print/`, `lib/dominio/dsa/`,
  `lib/planilha/`, `dsa/leitura.ts` e `dsa/consulta.ts` contra `45a910c`, e pelos casos do DSA no CI.)*
- [X] T019 Plano de correções (Rodada 2 / Bloco 7), roteiro de conferência, PR com o template, CI verde, lote de dúvidas

## Fase 9 — a conferência de 22/10/2026 (itens 7 a 11, no mesmo PR)
- [X] T020 [US7] `components/graficos/tipos.ts` (`rotuloDaFatia`, sem teto nem `agruparEmOutras`), `grafico-pizza.tsx`
  com legenda numerada; `tests/unidade/fatias-da-pizza.test.ts`; amostra de 12 fatias na vitrine e
  `tests/e2e/graficos.spec.ts`; emendas no documento 23 §7 e no `FR-007.2` da spec 016
- [X] T021 [US7] Escolaridade dos instrutores em pizza (`FR-026.2`, D-25), com teste visto falhar
- [X] T022 [US8] `nomeNoGrafico` em `lib/dominio/nome-no-dsa.ts` (teste visto falhar) e `ProporcaoDaCarga` com todas as
  disciplinas pelo nome
- [X] T023 [US9] `FormularioDeCurso` em grupos (*Identidade do curso*, *Oferta e custo*; no cadastro, *Currículo 1*);
  *Currículo e suas partes*; a vigência do regime na parte *Horários*; o link do DSA; `vigencia.spec.ts` pela aba
- [X] T024 [US10] `indicadoresDoCatalogo` com a duração em semanas de cada curso (teste visto falhar);
  `EstatisticasRecolhiveis` em `components/ciaara/`; `IndicadoresDoCatalogo` no estilo de Instrutores; `cursos.spec.ts`
- [X] T025 [US11] `semanasAcimaDaFaixa` e `alertaAcimaDaFaixa` (testes vistos falhar); a leitura dos Avisos; o CMG de 4 h
  por semana na amostra e o caso que discrimina em `instrutores.spec.ts` (Avisos e resumo do sininho); emenda no
  `FR-016` da spec 006
- [X] T026 Guia de testes, roteiro, plano de correções; CI verde; merge por squash; CI na `main`; Production;
  encerramento por PR de documentação
