# Tarefas — spec 029 (Bloco 14)

`[US1]`…`[US8]` = itens 1 a 8 do pedido (FR-001 a FR-008). Em cada item, o teste vem **antes** e é **visto reprovar** na
`main`; só depois a mudança. Arquivos diferentes podem andar em paralelo (`[P]`); `inicio/page.tsx` (itens 5, 7, 8) e os
arquivos do DSA (itens 1, 2, 3, 6) andam em sequência.

## Fase 0 — regras e triagem

- [x] T001 Regras escritas antes do código: RP-9 em `docs/correcoes/regras-da-publicacao-do-dsa.md`; RT-8 em
  `docs/correcoes/padroes-de-tela.md`; notas em `docs/correcoes/regras-do-dsa-lancamento.md` (RD-2, RD-3, RD-4, RD-5,
  RD-6, RD-7, RD-8); emenda da RN-DIST-03 (a) em `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md` (só o `.md`) e as
  notas de consequência (D-4); RF-EXTRA-01 em `docs/fase-1/02-Requisitos-Funcionais.md`; RT-8 citada no `CLAUDE.md`
  (FR-007.5).

## Fase 1 — item 1, o TFM sem teto (FR-001)

- [x] T002 [US1] Teste que reprova: `tests/unidade/dsa/tetos.test.ts` (7 TA de TFM → nenhum bloqueio nem alerta; 26 TA →
  só o alerta do recomendado) e `tests/e2e/dsa-cartao-unico.spec.ts` (o editar de 4 para 7 tempos grava; 4 + 3 TA em
  dois dias livres → *Salvar minuta* registra 7 TA no banco). Ver reprovar.
- [x] T003 [US1] `lib/dominio/dsa/tetos.ts` sem o ramo TFM; `lib/acoes/dsa.ts` (`tetosDoBanco` só com o recomendado;
  comentários); comentários de `FormularioDeLancamento.tsx` e `PainelDeLancamento.tsx`; `supabase/tests/116_dsa.sql` (só
  a descrição do parâmetro inerte).
- [x] T004 [P] [US1] Scripts: `scripts/carga_dsa/plano.py`, `resolver.py` e `provar_carga_dsa.py` sem o ramo TFM.

## Fase 2 — item 2, o EI sem «O que é» (FR-002)

- [x] T005 [US2] Testes que reprovam: `tests/unidade/categoria-pelo-tipo.test.ts`, `tests/unidade/dsa/validacao.test.ts`
  e pgTAP `supabase/tests/153_estudo_individual_sem_descricao.sql` (EI nulo aceito — hoje `23502`; AEC nula recusada).
- [x] T006 [US2] Migration `supabase/migrations/<carimbo>_estudo_individual_sem_descricao.sql` (drop not null + CHECK +
  comentário; cabeçalho com efeito e reversão); `pnpm db:tipos`; `reversao.sql` na pasta da spec, provada numa base
  descartável.
- [x] T007 [US2] `lib/dominio/categoria-pelo-tipo.ts` (`descricaoObrigatoria`), `lib/validacao/dsa.ts` (`textoOuNulo`),
  `lib/acoes/dsa.ts` (lançar e editar), `lib/acoes/traducao-de-recusas.ts` (a restrição nova),
  `lib/dominio/dsa/impressao.ts` (EI no mesmo TA sem descrição → texto do EI).
- [x] T008 [US2] Telas: `FormularioDeLancamento.tsx` (`required` só fora do EI; *"(opcional)"*), `AcoesDoBloco.tsx` e
  `components/ciaara/grade-dsa.tsx` (título pelo subtipo), `app/(app)/atividades/` (*"—"*). E2E: EI sem *"O que é"* →
  *Salvar minuta* → banco com `descricao` nula; AEC sem ele recusada.

## Fase 3 — item 3, Salvar alteração (FR-003)

- [x] T009 [US3] Testes que reprovam: `tests/unidade/dsa/publicacao.test.ts` e `selo-e-versoes.test.ts` (alteração
  salva; `salvo` anterior ao último `alteracao_iniciada` não conta; rascunho novo tira o *· salva*; `versaoVigente` não
  muda); e2e em `tests/e2e/publicacao-do-dsa.spec.ts` (publicar → Fazer alteração → lançar → Salvar alteração → selo,
  CH, Reimprimir da Original → sair e voltar → Descartar volta ao salvo → Publicar → ALT 1).
- [x] T010 [US3] `lib/dominio/dsa/publicacao.ts`; `lib/acoes/publicacao-do-dsa.ts` (`salvarAlteracaoDoDsa`);
  `app/(app)/turmas/[turma]/dsa/BarraDoDsa.tsx`, `page.tsx` e `VersoesPublicadas.tsx`.

## Fase 4 — item 4, a janela da carga (FR-004)

- [x] T011 [US4] Teste que reprova: `tests/unidade/carga-semanal.test.ts` (`janelaDaCarga`: dentro, transborda, disjunta,
  turma sem período) e e2e em `tests/e2e/bloco-10.spec.ts` (alerta lilás no ano da turma de outro ano).
- [x] T012 [US4] `lib/dominio/carga-semanal.ts` (`janelaDaCarga`, com nota de emenda ao lado da citação);
  `app/(app)/instrutores/[codigo]/page.tsx` e `CargaDoInstrutor.tsx`; `app/(app)/avisos/leitura.ts`;
  `lib/dominio/media-semanal.ts` (comentário).

## Fase 5 — item 5, o saldo pelo regime da semana (FR-005)

- [x] T013 [US5] Testes que reprovam: `tests/unidade/andamento-da-turma.test.ts` (8 TA com «desde» de 9 na semana
  seguinte; «só esta semana»; gravado vence o «desde»; sem exceções = idêntico; dia sem TA → sem regime).
- [x] T014 [US5] `lib/dominio/andamento-da-turma.ts`; leitor comum `app/(app)/turmas/regimes-das-semanas.ts`; ligar em
  `app/(app)/inicio/page.tsx` + `panorama.ts`, `app/(app)/avisos/leitura.ts`, `app/(app)/turmas/page.tsx` +
  `consulta.ts` e a ficha `app/(app)/turmas/[turma]/page.tsx`; `IndicadoresDaTurma.tsx` (faixa de TA/dia); textos de
  `FormularioDeTurma.tsx` e `RegimesDoCurso.tsx`; `tests/unidade/andamento-unico.test.ts` se a guarda pedir.
- [x] T015 [US5] E2E em `tests/e2e/bloco-11-dsa.spec.ts`: «Desta semana em diante» no relógio do DSA → o saldo da ficha
  igual ao de `andamentoDaTurma` com as semanas.

## Fase 6 — item 6, o seletor vazio (FR-006)

- [x] T016 [US6] Testes que reprovam: `tests/unidade/seletor-instrutor-vazio.test.ts` (dois motivos, duas frases; nunca
  *"Nada cadastrado ainda"*) e e2e em `tests/e2e/ta-fora-do-dsa.spec.ts` (disciplina sem habilitado).
- [x] T017 [US6] `lib/dominio/instrutores-da-aula.ts` (`fraseDaListaDeInstrutoresVazia`);
  `components/ciaara/seletor-instrutor.tsx` (`vazio` obrigatório, compacto); chamadores (`TaForaDoDsa`,
  `DisciplinasDaTurma`, `PainelDeInstrutores`, `ResponsavelOuNomeLivre`, `FormularioDeLancamento`, `AcoesDoBloco`,
  `dsa/page.tsx`, `turmas/[turma]/page.tsx`); vitrine `app/estilo/amostras.tsx`; prévia `.design-sync/previews/`;
  `app/(app)/disciplinas/consulta.ts` sem erro descartado.

## Fase 7 — item 7, RT-8 (FR-007)

- [x] T018 [US7] Testes que reprovam: `tests/unidade/cartoes-do-inicio` / `contagem-por-situacao` e
  `painel-de-turmas.test.ts`; e2e em `tests/e2e/inicio-bloco-4.spec.ts` (concluída arquivada conta em Concluídas no ano;
  não no ano seguinte; fora do carrossel) e o painel de `/turmas`.
- [x] T019 [US7] `lib/dominio/cartoes-do-inicio.ts`, `lib/dominio/painel-de-turmas.ts`,
  `lib/dominio/arquivamento-da-turma.ts` (docblock); `app/(app)/inicio/page.tsx`; `app/(app)/turmas/page.tsx`
  (cabeçalho e vazio, D-19).

## Fase 8 — item 8, o Início (FR-008)

- [x] T020 [US8] Testes que reprovam: `tests/unidade/enquadramento-do-papel.test.ts`; e2e em
  `tests/e2e/bloco-11-dsa.spec.ts` (1366×768 e 1920×1080: papel inteiro sem rolar, captura anexada; DSA antes dos
  cartões; frase do cabeçalho fora) e o vazio sem área grande.
- [x] T021 [US8] `lib/dominio/enquadramento-do-papel.ts`; `app/(app)/inicio/EscalaDoPapel.tsx`;
  `app/(app)/inicio/page.tsx` (ordem, frase); `CartaoDaTurma.tsx` (comentário);
  `tests/unidade/fronteira-das-telas.test.ts` (justificativa da folha).

## Fase 9 — prova e entrega

- [x] T022 Defeitos deliberados, cada um desfeito em seguida: (a) devolver o ramo do TFM → o caso de 7 TA reprova;
  (b) `required` de volta no EI → o e2e do EI reprova; (c) `alteracaoSalva` sempre falso → o selo reprova; (d) janela sem
  recorte → `janelaDaCarga` reprova; (e) capacidade ignorando as semanas → o caso do «desde» reprova; (f) seletor sem o
  motivo → a frase reprova; (g) cartões sem a arquivada → o caso da RT-8 reprova; (h) escala só pela largura → o
  enquadramento reprova.
- [x] T023 `pnpm verificar` verde; pgTAP e RLS verdes no local; os e2e dos arquivos tocados verdes com 1 processo
  (a suíte inteira fica com o CI). ⚠️ A rodada local dos arquivos tocados foi **interrompida pelo sistema por falta de
  memória** depois de 29 casos verdes e nenhum vermelho (spec §10); o resto ficou com o CI.
- [x] T024 Revisão adversarial do diff (independente), correções no mesmo PR.
- [ ] T025 `roteiro-de-conferencia.md`, `plano-de-aplicacao-no-remoto.md`; plano de correções (Bloco 14 em conferência;
  PEND-025-5, PEND-026-1 e PEND-026-2 fechadas; pendências novas); commit `fix(BLOCO-14): …`; push; PR com o template.
- [ ] T026 CI verde; rito do remoto da migration do item 2 (backup, dry-run só com ela, `db push`, conferência só de
  leitura); preview conferido.

## Dependências

T001 antes de tudo. Em cada fase, o teste antes da mudança. T006 antes de T007/T008. T014, T019 e T021 tocam o mesmo
`app/(app)/inicio/page.tsx`: em sequência, nunca em paralelo. T003, T007, T010 e T017 tocam arquivos do DSA em comum:
em sequência. T022 depois de T002–T021. T026 depois de T025.
