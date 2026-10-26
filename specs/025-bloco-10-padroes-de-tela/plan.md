# Plano — spec 025 (Bloco 10): padrões de tela, turma, curso, estatísticas, calendário e ano

**Ramo:** `feat/BLOCO-10-padroes-de-tela`, na pasta `C:\sis11\CIAARA-11-v2.1`. **Um PR.** O papel do DSA **não muda**
(`app/print/`, `lib/dominio/dsa/` e `lib/planilha/` sem diferença) — merge a qualquer dia. **Banco:** uma migration pelo
portão 9.4 (§6 da spec), que **espera Bernardo antes do remoto**; até lá, no preview, os ícones de exclusão de turma e
de feriado aparecem desabilitados com *"não foi possível conferir os registros"* (`RN-DEG-01`).

## Constituição

| Regra | Como |
|---|---|
| 1 (documento 04) | nenhuma `RN-` muda; a `RN-2027-06` e o aviso só acima da faixa ficam |
| 2 (escopo) | tudo é da CIAARA-11 |
| 3 (paridade) | padrão de tela, mais a novidade pedida nominalmente (exclusão, gráfico interativo, ano único) |
| 4 (nada apagado) | a exceção da D-COR-6, delimitada a registro sem histórico, por RPC com porteiro e rastro; zero policy e zero privilégio de `DELETE` |
| 9 (domínio puro) | `lib/dominio/ano-escolhido.ts`, `lib/dominio/exclusao-de-turma.ts`, `exclusao-de-feriado.ts`, `indicadores-do-catalogo.ts`; o cálculo do que fica à vista no gráfico em `components/graficos/tipos.ts` (sem marcador, lido no servidor) |
| 9.4 (portão) | a migration muda a regra 4 — desenho no §6 da spec |
| Gotcha 15 | porteiros com `app.pode(...)` (devolve `false` explícito) |
| Server Action | `excluirTurma`, `excluirLinhaDoCalendario`, `editarTurma` (agora com a situação): Zod na primeira linha |
| URL dona do estado | o `?ano=` de cada tela; o cookie do ano é a exceção declarada (D-24), como a lateral fixada |

## Desenho

1. **`BotaoDeIcone`** (RT-1): a dica sai de `ROTULO_DA_ACAO` (o verbo; em `novo`, o próprio rótulo — D-16), o nome
   acessível continua o `rotulo`. Duas ações novas no vocabulário: `filtros` (funil) e `estatisticas` (gráfico de
   barras). Prop `indisponivel` (texto): o botão fica `aria-disabled`, não aciona nada e a dica é o motivo (D-13) — um
   `disabled` de verdade não dispara a dica.
2. **`CardKpi`** (RT-7): ganha `detalhe` (o que vai abaixo do valor), `acao` (um ícone no canto) e altura cheia na grade.
   É o único desenho de cartão: a ficha da turma, Cursos, Instrutores, Turmas, Usuários e a aba *Disciplinas* (que tinha
   um `Indicador` local) passam a usá-lo.
3. **Painéis da página** (RT-4) — `components/ciaara/paineis-da-pagina.tsx` (folha de cliente): `ProvedorDePaineis`
   (o estado aberto/fechado, efêmero), `GatilhoDePainel` (o `BotaoDeIcone` com `aria-expanded`/`aria-controls` e o
   número) e `ConteudoDePainel` (só monta aberto). A página (servidor) monta o cabeçalho com a `BarraDeAcoes` e põe os
   painéis abaixo; o conteúdo chega do servidor por `children`. `FiltroAvancado` ganha o modo **sem gatilho próprio**
   (`emPainel`), e o número de filtros ativos sai do mesmo gancho da URL que os campos usam. `EstatisticasRecolhiveis`
   sai (o painel a substitui).
4. **Gráficos** (RT-5): `tipos.ts` ganha `pontosVisiveis`/`seriesVisiveis` e o percentual sobre o visível (puros, com
   teste); `GraficoPizza`, `GraficoBarras` e `GraficoLinha` guardam os grupos ocultos (`useState`), trocam a legenda por
   `LegendaInterativa` (botões com `aria-pressed`, valor e marcador) e alternam também pelo clique no desenho;
   *Mostrar todos*. `GraficoBarras` ganha `rotuloDoEixoY` e a legenda por categoria quando há uma série.
5. **O ano** (RT-6): `lib/dominio/ano-escolhido.ts` (puro): `anoValido`, `anoDaTela(url, guardado, hoje)`,
   `opcoesDeAno(vigente, escolhido)`, `fimDoAnoEmSaoPaulo`. `components/ciaara/seletor-de-ano.tsx` (folha) substitui o
   `AnoDoPainel`: escreve o `?ano=` da tela (pelo contrato), grava/apaga o cookie `ciaara-ano` e pede `router.refresh()`
   para a lateral; na abertura, se o ano veio do cookie, põe o `?ano=` na URL sem ida ao servidor. O servidor lê com
   `anoEscolhido(searchParams)` em `lib/navegacao/ano-da-tela.ts` (`cookies()` + `anoDaTela`). O `ano` entra no contrato
   de `/instrutores`, `/instrutores/[codigo]` e `/cursos/[curso]`.
6. **A ficha da turma**: `CabecalhoDaTurma` (identificação + `BarraDeAcoes`), `IndicadoresDaTurma` (os oito `CardKpi`,
   no lugar de `SecaoDeAndamento`, `CardsDeTetos` e `CardDeAvaliacoes`), `HistoricoDaTurma`, `AbasDaTurma` (a Ficha com
   *Dados da turma* e as disciplinas). Página nova `/turmas/[turma]/editar` com o `FormularioDeTurma` no modo `edicao`
   — agora com Situação e observação — e as leituras que só o formulário usava (salas, proteção de vigência, regimes,
   currículos). `EdicaoDaTurma` e `TrocarSituacao` saem.
7. **A exclusão**: a migration do §6; `lib/acoes/turma.ts` `excluirTurma`, `lib/acoes/calendario.ts`
   `excluirLinhaDoCalendario`; `lib/dominio/exclusao-de-turma.ts` e `exclusao-de-feriado.ts` (o motivo e a dica a partir
   dos impedimentos, e o `codigoConfere`); a folha `ExcluirTurma` (a ficha e a linha) e o ícone na linha do calendário.
8. **Editar curso**: `AbasDaEdicaoDoCurso` (`?aba=`) com *Cadastro* e *Currículo*; o *Currículo* com a barra, os dados e
   o PDF em cima e `PartesDoCurriculo` só com *Disciplinas*, *Horários* e *Atividades e limites*.
9. **A ficha do instrutor**: o alerta de faixa de volta (as funções da página Avisos), o ano escolhido na carga e nas
   atribuições, e a varredura RT-3 (§ Varredura).

## Validação

Unidade (vistas falhar antes): `ano-escolhido`, `exclusao-de-turma`, `exclusao-de-feriado`, `indicadores-do-catalogo`,
os pontos visíveis do gráfico, a dica do `BotaoDeIcone`, a guarda `sem-inativar`. pgTAP: as funções, o porteiro sem
sessão e a restrição do rastro. Invariantes com sessão real: quem exclui, quem não, o caso que discrimina e o rastro.
E2E por clique: a ficha e a edição da turma, a aba *Turmas*, a exclusão, os painéis, as estatísticas de Cursos, os
gráficos, o ano entre módulos, o calendário, *Editar curso* e a ficha do instrutor. O roteiro em
`roteiro-de-conferencia.md`.
