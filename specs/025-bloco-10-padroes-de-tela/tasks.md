# Tasks — spec 025, Bloco 10: padrões de tela, turma, curso, estatísticas, calendário e ano (um PR)

## Fase 0 — o documento das regras
- [X] T001 `docs/correcoes/padroes-de-tela.md` (RT-1 a RT-7 e a D-COR-6) e o ponteiro no `CLAUDE.md`

## Fase 1 — domínio puro (teste visto falhar antes)
- [X] T002 [RT-6] `lib/dominio/ano-escolhido.ts` + `tests/unidade/ano-escolhido.test.ts`: ano válido (2020–2099), a
  ordem URL → guardado → hoje, as opções (2020 ao de hoje + 10, mais o escolhido), o fim do ano em São Paulo
- [X] T003 [D-COR-6] `lib/dominio/exclusao-de-turma.ts` e `exclusao-de-feriado.ts` + testes: a dica e o motivo a partir
  dos impedimentos, a falta de leitura, `codigoConfere`
- [X] T004 [item 6] `indicadores-do-catalogo.ts`: um cartão por classificação, *Demais* e o total (a soma fecha) +
  testes emendados (eram "exatamente quatro chaves")
- [X] T005 [RT-5] `components/graficos/tipos.ts`: o que fica à vista e o percentual sobre o visível + teste

## Fase 2 — componentes de base
- [X] T006 [RT-1] `BotaoDeIcone`: a dica pelo verbo (`ROTULO_DA_ACAO`), `filtros` e `estatisticas` no vocabulário,
  `indisponivel`; teste da dica; vitrine
- [X] T007 [RT-7] `CardKpi` com `detalhe` e `acao`, altura cheia; vitrine
- [X] T008 [RT-4] `components/ciaara/paineis-da-pagina.tsx` (provedor, gatilho, conteúdo); `FiltroAvancado` com
  `emPainel`; listas de fronteira; vitrine
- [X] T009 [RT-5] `GraficoPizza`, `GraficoBarras` (com `rotuloDoEixoY` e legenda por categoria), `GraficoLinha`:
  legenda interativa, clique no desenho, *Mostrar todos*; vitrine
- [X] T010 [RT-6] `components/ciaara/seletor-de-ano.tsx` e `lib/navegacao/ano-da-tela.ts`; o `ano` no contrato das
  telas novas; o `AnoDoPainel` sai

## Fase 3 — banco (portão 9.4: pronto e testado; o remoto espera Bernardo)
- [X] T011 [D-COR-6] Migration da exclusão de turma e de feriado (§6 da spec), com o cabeçalho de reversão
- [X] T012 pgTAP: as funções, `SECURITY DEFINER`/`INVOKER`, o porteiro sem sessão, a restrição do rastro
- [X] T013 Invariantes com sessão real: por perfil (Admin, Encarregado, Operador fora do alcance, Visualização), o caso
  que discrimina (atribuição sai junto × TA fora do DSA prende; lançamento salvo sem evento × evento salvo), o rastro, os
  códigos `42501`/`22023`/`23503`
- [X] T014 `pnpm db:tipos`; Server Actions `excluirTurma` e `excluirLinhaDoCalendario` (Zod na primeira linha)

## Fase 4 — telas
- [X] T015 [item 1] Ficha da turma: cabeçalho, barra, os oito cartões, histórico, abas (Dados da turma na Ficha)
- [X] T016 [item 1] `/turmas/[turma]/editar` com a situação e a observação; `editarTurma` com a situação; contrato e
  caminho clicável; `EdicaoDaTurma` e `TrocarSituacao` saem
- [X] T017 [itens 2, 3] Aba *Turmas* do curso com Editar · Arquivar · Excluir; `ExcluirTurma` na ficha e na linha
- [X] T018 [item 11] Calendário: dicas, *Desativar*, *Excluir* do feriado
- [X] T019 [item 4] O gráfico de barras das disciplinas
- [X] T020 [itens 5, 6] Painéis em Cursos (com as estatísticas novas), Instrutores, Turmas, Atividades, Usuários, Início
  (o filtro com o vocabulário institucional) e a aba *Disciplinas*
- [X] T021 [item 7] *Editar curso* em abas
- [X] T022 [item 9] O alerta de faixa na ficha do instrutor, do ano escolhido
- [X] T023 [item 10] O ano em todos os módulos da D-26 e no submenu da lateral
- [X] T024 [item 12] A varredura (§3.1 da spec): *Inativar* → *Desativar*, a guarda `sem-inativar`, os botões de
  texto, a edição em página da ficha do instrutor e o Excluir onde faltar

## Fase 5 — prova e entrega
- [ ] T025 E2E por clique dos itens 1 a 12; os casos antigos que mudam de forma (ficha da turma, filtros, estatísticas,
  ano, Editar curso, calendário)
- [ ] T026 Defeitos deliberados nos testes que provam a mudança; `pnpm verificar`; pgTAP; invariantes; e2e dos
  arquivos tocados
- [ ] T027 O efeito no dado real (cópia do remoto): quantas turmas e feriados teriam o Excluir habilitado
- [ ] T028 Roteiro de conferência, plano de correções (Bloco 10, D-COR-6), PR com o template, CI verde, lote de dúvidas
