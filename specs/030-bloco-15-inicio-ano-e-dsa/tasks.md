# Tarefas — spec 030 (Bloco 15)

`[US1]`…`[US11]` = itens 1 a 11 do pedido (FR-001 a FR-011). Em cada item, o teste vem **antes** e é **visto reprovar**
na `main`; só depois a mudança. Arquivos diferentes podem andar em paralelo (`[P]`); os arquivos do DSA
(`page.tsx`, `BarraDoDsa.tsx`, `NavegacaoDaSemana.tsx`, itens 4, 7, 9 e 10) e os do Início (itens 1 e 2) andam em
sequência. **Sem banco.**

## Fase 0 — regras e triagem

- [X] T001 Regras escritas antes do código: RT-1 (setas e grupos) e RT-6 (o seletor no cabeçalho) em
  `docs/correcoes/padroes-de-tela.md`; RD-2 (sem linha fixa), RD-4 (o *Remover EI* ao lado do *Limpar*), RD-6 (a barra
  única) e RD-7 (tela cheia e setas) em `docs/correcoes/regras-do-dsa-lancamento.md`; RP-3 (o histórico em abas) em
  `docs/correcoes/regras-da-publicacao-do-dsa.md`; a frase da RT-6 no resumo dos padrões do `CLAUDE.md`.

## Fase 1 — fundação: vocabulário e formato

- [X] T002 [P] Ícones novos no vocabulário fechado (`voltar`, `avancar`, `esta-semana`, `abrir-sabado`, `fechar-sabado`,
  `lancar-ei`, `remover-ei`, `cancelar`, `fechar`, `sair-da-tela-cheia`, `pausar`, `continuar`) em
  `components/ciaara/botao-de-icone.tsx`, com a guarda `tests/unidade/botoes-de-icone.test.ts`.
- [X] T003 [P] `intervaloDeDatas(de, ate)` em `lib/formato/data.ts` com teste em `tests/unidade/formato-de-data.test.ts`
  (mesmo ano → *"26/10 a 31/10/2026"*; virada → inteiro). Ver reprovar.

## Fase 2 — item 11, «Atrasada» pela janela da carga (FR-011)

- [X] T004 [US11] Teste que reprova: `tests/unidade/dsa/painel-de-situacao.test.ts` — disciplina da turma de 2027 com
  previsão de 2026, sem lançamento, referência em 2026 → hoje `atrasada`, depois `aguardando_inicio`; e a previsão que
  transborda o término da turma é recortada.
- [X] T005 [US11] `quadrosDaSemana` em `app/(app)/turmas/[turma]/dsa/consulta.ts` com `periodoDaTurma` obrigatório e
  `janelaDaCarga`; os dois chamadores (`dsa/page.tsx`, `dsa/planilha/leitura.ts`) e `execucaoAteASemana` passam o
  período da turma.

## Fase 3 — item 4, o EI só lançado (FR-004)

- [X] T006 [US4] Testes que reprovam: `tests/unidade/dsa/impressao.test.ts` (dia sem EI lançado → nenhuma linha de EI),
  `tests/unidade/dsa/grade-do-papel.test.ts` e os da planilha (`planilha-preenchimento`, `planilha-impressao`, o
  comparador `tests/unidade/dsa/planilha/comparar-com-o-papel.ts`); `tests/unidade/dsa/publicacao.test.ts` ou novo (um
  retrato com a linha fixa e o mesmo dado sem ela → `documentosIguais`); `tests/unidade/dsa/limpar-semana.test.ts` (só
  os EI). Ver reprovar.
- [X] T007 [US4] `lib/dominio/dsa/impressao.ts` sem a linha fixa (`ehLinhaFixaDoEstudoIndividual` para os retratos
  antigos); `app/print/dsa/retrato.ts` (`conteudoDaSemana` pelos campos de origem, dias sem a linha fixa);
  `components/ciaara/grade-dsa.tsx` sem o caminho da linha fixa; a planilha sem o slot fixo
  (`lib/dominio/dsa/planilha/preenchimento.ts` e `impressao.ts`).
- [X] T008 [US4] `estudosIndividuaisParaRemover` em `lib/dominio/dsa/limpar-semana.ts`; Server Action
  `removerEstudoIndividualDaSemana` em `lib/acoes/dsa.ts` (Zod na 1ª linha).

## Fase 4 — itens 9 e 10, o cabeçalho e a barra do DSA (FR-009, FR-010)

- [X] T009 [US9] [US10] Ponta a ponta que reprova: `tests/e2e/bloco-15.spec.ts` — a semana uma vez no cabeçalho, sem
  *Voltar à turma* nem *Alunos*; a barra com os três grupos; navegar pela barra (anterior, esta semana, a data, a
  seguinte, o sábado); *Parar dia* pela barra.
- [X] T010 [US10] `BarraDoDsa.tsx` com os três grupos; `NavegacaoDaSemana.tsx` vira as peças da navegação da barra (o
  mesmo `ir()`, as mesmas `data-acao`); `ControleDeParadas.tsx` em duas peças (o gatilho com o diálogo; as paradas da
  semana); o EI da semana (lançar e remover) na barra; `PainelDeLancamento.tsx` sem o botão do EI.
- [X] T011 [US9] `dsa/page.tsx`: a linha única (código-link · semana · datas curtas) e o mesmo em `CabecalhoDoDsa`; sai
  `CabecalhoDaSemana` da tela; `turmas/[turma]/editar/page.tsx`: o código vira o link da ficha, sai *Voltar à ficha da
  turma*.

## Fase 5 — item 7, as abas de versão (FR-007)

- [X] T012 [US7] Testes que reprovam: `tests/unidade/dsa/versao-escolhida.test.ts`; em `tests/e2e/bloco-15.spec.ts` (1
  aba sem publicação; Original e ALT 1 depois; `?versao=1`) e `tests/e2e/publicacao-do-dsa.spec.ts` (o *Reimprimir*
  pela aba).
- [X] T013 [US7] `lib/dominio/dsa/versao-escolhida.ts`; `?versao=` no contrato (`lib/navegacao/contrato.ts`); a folha
  `AbasDeVersao.tsx`; `dsa/page.tsx` desenha só a aba aberta (a Minuta, ou o papel do retrato com *Reimprimir*, data,
  autor e justificativa); `VersoesPublicadas.tsx` dá lugar às abas, com as linhas da RP-4 e da RP-9 acima delas.

## Fase 6 — itens 6 e 8, o cartão e a PRÉVIA (FR-006, FR-008)

- [X] T014 [US6] Ponta a ponta que reprova (`bloco-15.spec.ts`): o rodapé do cartão sem texto, os três ícones juntos à
  esquerda; depois de gravar com aviso, *Fechar*. Mudança em `AcoesDoBloco.tsx` (rodapé e título com o nome por extenso
  e quem ministra).
- [X] T015 [P] [US8] Ponta a ponta que reprova (`bloco-15.spec.ts`): a marca atrás do conteúdo e com opacidade ≤ 0,2.
  Mudança em `app/print/dsa/documento.css`.

## Fase 7 — item 5, editar antes de publicar (FR-005, já estava feito)

- [X] T016 [US5] Caso de ponta a ponta em `bloco-15.spec.ts`: lançar → salvar → prévia → editar → salvar → prévia →
  publicar = Original, sem ALT (passa na `main`: é a prova do *já estava feito*).

## Fase 8 — item 3, o ano no cabeçalho (FR-003)

- [X] T017 [US3] Testes que reprovam: `tests/unidade/ano-no-cabecalho.test.ts` (`rotaComAnoDoCaminho`; nenhuma página de
  `app/(app)` desenha `SeletorDeAno`); `bloco-15.spec.ts` (trocar no cabeçalho em Turmas e conferir Início, Turmas e
  Instrutores).
- [X] T018 [US3] `rotaComAnoDoCaminho` em `lib/navegacao/contrato.ts`; `SeletorDeAno` sem `rota` (caminho e `?ano=` lidos
  na folha); `cabecalho-do-app.tsx` e `app/(app)/layout.tsx`; saem os sete seletores das páginas; a vitrine `/estilo`;
  os casos de ponta a ponta que usavam o seletor da página (`bloco-10`, `bloco-11-dsa`, `dsa-ver`, `inicio-bloco-4`,
  `instrutores`, `paineis.ts`, `sem-campo-aberto`, `turmas-painel`).

## Fase 9 — itens 1 e 2, a tela cheia e as setas no Início (FR-001, FR-002)

- [X] T019 [US1] [US2] Testes que reprovam: `tests/unidade/enquadramento-do-papel.test.ts` (`escalaDaTelaCheia`) e
  `bloco-15.spec.ts` (tela cheia por clique e `Enter`, `Esc` e o ícone, as setas e `←`/`→`, o papel inteiro e maior em
  1366×768 e 1920×1080; as setas da semana nos cantos e as do carrossel nas laterais).
- [X] T020 [US2] `EscolhaDaSemana.tsx` numa linha (setas nos cantos, datas curtas e calendário ao centro);
  `components/ciaara/carrossel.tsx` com as setas laterais e *Pausar* em ícone.
- [X] T021 [US1] A tela cheia como propriedade do carrossel (`Dialog`, o mesmo elemento do item, o índice compartilhado);
  `EscalaDoPapel.tsx` com o modo da tela cheia (`escalaDaTelaCheia`); `inicio/page.tsx` liga o modo.

## Fase 10 — fechamento

- [X] T022 Guarda das folhas de cliente (`tests/unidade/fronteira-das-telas.test.ts`) com as folhas novas; vitrine
  `/estilo` com os ícones novos e o carrossel; `pnpm verificar` sem erro.
- [X] T023 Defeitos deliberados nos testes que provam a mudança (um por item que muda veredito), cada um visto reprovar
  e desfeito.
- [ ] T024 `pnpm verificar:tudo` sem a ponta a ponta inteira (pgTAP e RLS locais) + a ponta a ponta dos arquivos
  afetados com 1 processo; medição da «Atrasada» no remoto (só leitura) antes e depois; `roteiro-de-conferencia.md`;
  `plano-de-correcoes-em-blocos.md` (Bloco 15, `PEND-029-1` fechada, pendências novas); commit, push, PR com o template
  inteiro; CI verde.

## Dependências e paralelo

- T002 e T003 antes das telas; T004–T005 (item 11) e T006–T008 (item 4, domínio e ação) são independentes entre si.
- Fase 4 antes da 5 (as abas vivem na página reescrita); a Fase 8 toca páginas de vários módulos e anda depois das do
  DSA; a Fase 9 depende do vocabulário (T002).
- MVP: não há — o PR é um só, com os onze itens (um pedido = um PR).
