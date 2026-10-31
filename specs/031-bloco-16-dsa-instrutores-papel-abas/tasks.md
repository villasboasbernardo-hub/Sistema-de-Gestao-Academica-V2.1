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
- [ ] T019 Encerramento depois da aprovação (merge na virada de semana, CI da `main`, Production, ramo apagado, plano de
  correções, `CLAUDE.md`). *[pendente]*
