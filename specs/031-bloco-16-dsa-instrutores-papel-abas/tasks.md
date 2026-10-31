# Tarefas — spec 031 (Bloco 16)

`[US1]`…`[US9]` = itens 1 a 9 do pedido (FR-001 a FR-009). Em cada item, o teste vem **antes** e é **visto reprovar**.

## Fase 0 — triagem e regras

- [X] T001 Triagem medida no código e no remoto, só leitura (`consultas/`): tipo × instrumento (item 3a, ⛔ parado),
  `outros_instrutores` em 25 aulas ativas (+72 e +34 TA se contassem), 1 retrato publicado com o texto do Apoio.
- [X] T002 Regras escritas antes do código: RD-9 e a nota na RD-1 em `docs/correcoes/regras-do-dsa-lancamento.md`; RP-1
  em `docs/correcoes/regras-da-publicacao-do-dsa.md`; nota datada na `RN-INST-04` do documento 04 (só o `.md`).

## Fase 1 — banco (item 6)

- [X] T003 [US6] pgTAP `supabase/tests/154_instrutores_adicionais_da_aula.sql`, visto reprovar sem a migration (a
  `reversao.sql` dentro da transação).
- [X] T004 [US6] Migration `20261030224204_instrutores_adicionais_da_aula.sql` (coluna, gatilho, view); efeito zero
  medido na cópia `remoto-20261030-194246.sql`; `pnpm db:tipos`; frases das três recusas em `traducao-de-recusas.ts`.
- [X] T005 [US6] Rito do remoto (30/10/2026, depois do CI verde): backup `remoto-20261030-211901.sql`; dry-run listando só
  a `20261030224204`; `supabase db push --linked` 0. Conferido só por leitura: **102 e 102** migrations; impressão digital
  **igual nos dois bancos** (2.741 objetos, `35049a56…`); `security_invoker` na view; **0** policies de `DELETE`; **0**
  aulas com adicional em 3.896; `vw_instrutor_carga_anual` no remoto com as mesmas **182** linhas e o mesmo md5
  `21e538e8…` da medição na cópia (efeito zero); Production `/login` 200, `/` e `/inicio` 307.

## Fase 2 — domínio e ações

- [X] T006 [US6] `lib/dominio/dsa/instrutores-adicionais.ts` + `tests/unidade/dsa/instrutores-adicionais.test.ts`.
- [X] T007 [US6] Zod (`instrutoresAdicionais` no lançar e no editar) e `lib/acoes/dsa.ts` (porteiro da habilitação de
  cada adicional, par final na edição, coluna gravada).
- [X] T008 [US4] `lib/acoes/dsa.ts`: o EI grava instrutor e responsável nulos e ignora os dois na edição.
- [X] T009 [US5] [US7] `tests/unidade/dsa/bloco-16-papel.test.ts`; `ROTULO_DO_APOIO`, `MOTIVO_DO_APOIO_NO_MESMO_TEMPO`,
  `rotuloDoAlt` e `conteudoComparavel` (D-6).
- [X] T010 [US9] `lib/dominio/dsa/acompanhamento-de-avaliacoes.ts` + teste.

## Fase 3 — telas

- [X] T011 [US1] [US2] [US3] [US4] [US6] `FormularioDeLancamento.tsx` (ícones, *Início*, técnica só na aula, EI sem
  responsável, adicionais na aula, texto livre fora da aula).
- [X] T012 [US2] [US3] [US4] [US6] `AcoesDoBloco.tsx` (o mesmo na edição) e `InstrutoresAdicionais.tsx`;
  `PainelDeLancamento.tsx` e `page.tsx` levam os ids de EI.
- [X] T013 [US6] Leitura: `leitura.ts` e `consulta.ts` trazem os adicionais (nomes no papel, ids no cartão).
- [X] T014 [US7] [US8] `DocumentoDoDsa.tsx`, `documento.css` e `grade-dsa.tsx`.
- [X] T015 [US9] `contrato.ts` (`acompanhamento`), `AbasDeAcompanhamento.tsx`, `AcompanhamentoDeAvaliacoes.tsx`,
  `page.tsx`; folhas declaradas em `fronteira-das-telas.test.ts`.

## Fase 4 — verificação e entrega

- [X] T016 Ponta a ponta nova `tests/e2e/bloco-16-dsa.spec.ts` e os ajustes (`publicacao-do-dsa`, `bloco-15`,
  `dsa-tipo-e-global`, `dsa-avaliacao-item`, `dsa-responsavel-livre`, `dsa-sessao-de-aplicacao`, `tetos-da-turma`).
- [X] T017 Local: tipos, lint e formatação sem erro; 3.067 de unidade (227 arquivos); build; 1.172 pgTAP (74); 491 RLS + 1
  pulado (33); ponta a ponta dos arquivos afetados com 1 processo — 27 de 27, e depois do 1º CI mais 22 de 22 (sete
  arquivos com seletor que contava o elemento novo).
- [X] T018 PR #109; o 1º CI reprovou por teste (formatação de 2 arquivos e 3 seletores diante do formulário e do cartão
  novos) e foi corrigido em `b226843`; CI verde nos três blocos sobre `b226843` (run `41147205860`: 3.067 · 1.172 · 491 +
  1 pulado · 615 de ponta a ponta, nenhum instável, 7 pulados).
## Fase 5 — ajustes da conferência de 31/10/2026 (spec §8)

- [X] T020 Medição do "defeito" C na cópia `remoto-20261031-121200.sql` (só leitura): os adicionais da CAHO 2026 (semana do
  curso 44) foram salvos em 31/10 numa alteração não publicada; a tela os mostra, o papel segue o publicado (RP-9).
- [X] T021 [A] `FormularioDeLancamento.tsx`: uma opção só de *Tipo de atividade* → o campo some, já escolhida.
- [X] T022 [B] `grade-do-papel.ts` corta os tempos finais vazios sem o mínimo da tela; testes em
  `grade-do-papel.test.ts` (vistos reprovar); a planilha de contingência mantém o regime (sintético e invariante).
- [X] T023 [C] `lib/dominio/dsa/arranjo-do-cartao.ts` + teste (1, 3 e 5 tempos × 1 e 4 nomes); o cartão do papel
  (`DocumentoDoDsa.tsx`, `documento.css`) e o da tela (`grade-dsa.tsx`, `h-px` na célula da `grade-alocacao`).
- [X] T024 [D] Migration `20261031151628_ajustes_de_avaliacao.sql` (só acrescenta), pgTAP `155` (visto reprovar sem ela,
  `reversao-ajustes.sql`), RLS `tests/invariantes/rls/ajustes-de-avaliacao.test.ts` (defeito deliberado na policy: 3
  reprovações), BRIEF §2.1 e as listas de `010`, `105` e `148`; a sequência em `scripts/etl/carregar.py`; as frases.
- [X] T025 [D] `lib/dominio/avaliacoes/ajustes.ts` (`comAjustes`) + teste; `cancelada` na situação; a data da vista no
  quadro; `lerAvaliacoesDaTurma` aplica os ajustes; `ajustarAvaliacao` (Zod + Server Action); a aba do DSA com *Editar* e o
  histórico; a ficha com «ajustada à mão».
- [X] T026 Ponta a ponta `bloco-16-dsa.spec.ts`: ajuste A no caso do formulário; o cartão adaptável na tela e na
  impressão; o ajuste D por clique, no banco, na linha e na ficha.
- [X] T027 CI verde nos três blocos sobre `591a069` (run `41221670384`: 3.083 de unidade · 1.183 pgTAP · 497 RLS + 1
  pulado · 616 de ponta a ponta, 1 instável — o `avaliacoes-nas-telas.spec.ts:55`, da `PEND-014-7` — e 7 pulados; o 1º CI
  dos ajustes reprovou por teste e pelo cartão de 1 tempo no Linux, corrigido). Rito do remoto (31/10/2026): backup
  `remoto-20261031-141540.sql`, dry-run só com a `20261031151628`, `db push` 0; **103 e 103** migrations; impressão
  digital **igual nos dois bancos** (2.781 objetos, `315a6f87…`); RLS ligada, **0** policies de `DELETE`, a tabela vazia e
  **nenhuma view** a lê; Production `/login` 200, `/` 307.

- [ ] T019 Encerramento depois da aprovação (merge na virada de semana, CI da `main`, Production, ramo apagado, plano de
  correções, `CLAUDE.md`). *[pendente]*
