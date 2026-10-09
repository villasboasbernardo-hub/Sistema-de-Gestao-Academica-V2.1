# Medições — Planilha de contingência do DSA (spec 015)

**Aberto em**: 09/10/2026 09:03 (relógio da máquina) · **Ramo**: `feat/EPICO-6-planilha-de-contingencia` sobre `main` em `4600a95`

> Regra 9.3: nenhum número entra aqui antes da medição; o que ainda não foi medido fica `[pendente]`.

## T001 — ponto de partida

- Base local **limpa** sem precisar de reset: 0 cursos, 0 turmas, 0 registros de aula, 0 instrutores, 0 feriados (`docker exec … psql`, 09/10/2026).

## T002 — impressão digital do esquema, antes

- `scripts/provas/impressao_digital_do_esquema.sql` no banco local: **1623 objetos**, `3650c6c2e34c1710de6e63a02e192ec4` — a mesma do remoto anotada no `CLAUDE.md` em 08/10/2026.

## T003 — inventário dos testes que exercitam a leitura do DSA

Contra esta lista o grupo (a) prova que **nenhuma asserção mudou** (`git hash-object`).

| Arquivo | hash antes |
|---|---|
| `tests/unidade/dsa/assinatura-editada.test.ts` | `f547e5f0faa1558b7412dec01b779e846b6c5c22` |
| `tests/unidade/dsa/assinaturas.test.ts` | `6ab3fa6b3bc921aeec82dc3836c3533204a4e4de` |
| `tests/unidade/dsa/bloco.test.ts` | `98de1fa48510f55815fcaaf178345353a073de15` |
| `tests/unidade/dsa/capacidade.test.ts` | `488d1b012611f1bfdff255aa122f91cc5913a573` |
| `tests/unidade/dsa/conflitos.test.ts` | `af00e4cb6f1ab204c645662099830d4b0edb4209` |
| `tests/unidade/dsa/dia-bloqueado.test.ts` | `f521a7766654d9296bf541aed1e385dde1a191b4` |
| `tests/unidade/dsa/distribuicao-semanal.test.ts` | `ace7e916f6800a67947e15d4ba9ec0f63485f31b` |
| `tests/unidade/dsa/ead-puro.test.ts` | `d04c11ad9913ff4a59927416dd2d2a6a5acf42d2` |
| `tests/unidade/dsa/empurrar.test.ts` | `fdf6c97c0e29ef4ee942e4d3a88dadf28762207a` |
| `tests/unidade/dsa/etapa-presencial.test.ts` | `21f85e95c603282c216d680a2426118415845b6d` |
| `tests/unidade/dsa/fato-da-ocupacao.test.ts` | `52ba08ea89be7cc4b3923bcdd9e2c7dde5ea437d` |
| `tests/unidade/dsa/grade.test.ts` | `4f899b6637d65b4f6fabc23f077f71f5eaee17a2` |
| `tests/unidade/dsa/grade-do-papel.test.ts` | `c37e71a18325b9b7db420091dce24b6b381e42c9` |
| `tests/unidade/dsa/horario-do-bloco.test.ts` | `a72cf527f904de328842bfa0b614450fb1124b9c` |
| `tests/unidade/dsa/impressao.test.ts` | `38e6395fb15630a5fca1005cfb623544ecbe5127` |
| `tests/unidade/dsa/numero-do-dsa.test.ts` | `f3bf2653afe845c42e1d226e7e1364ed5adefc07` |
| `tests/unidade/dsa/painel-de-situacao.test.ts` | `9083814954af52d983fb51a962f7023aeeb9591d` |
| `tests/unidade/dsa/posicao-herdada.test.ts` | `3cf47225d63c6e10d3419fe78a14ba19315075cd` |
| `tests/unidade/dsa/pre-preenchimento.test.ts` | `76b965370207433c363dae40300483d458729c2c` |
| `tests/unidade/dsa/semana-escolhida.test.ts` | `44415f4b37523d782299a016455fd72e8bd312a5` |
| `tests/unidade/dsa/semana-pela-data.test.ts` | `49a8a2367935dacdc4600c7d756699056e352116` |
| `tests/unidade/dsa/situacao.test.ts` | `6137c84527d9899ea2767f6951d5569c0ba5d3ac` |
| `tests/unidade/dsa/tempos-do-dia.test.ts` | `77f2e3f2f0daac72b73e82fe94b4f1d8363d094f` |
| `tests/unidade/dsa/tetos.test.ts` | `4053b1a13702c7c1a865dbf22fd197f1663fe330` |
| `tests/unidade/dsa/validacao.test.ts` | `8a52830f18f2eed342f2ae16a954a5522a4936ab` |
| `tests/e2e/dsa-cartao-unico.spec.ts` | `00b2c3f4ae1c34587fd6eee3de55c7ca2c7f1c37` |
| `tests/e2e/dsa-conflito.spec.ts` | `3c76a07f2ca7130f37fc344a2547711f44f558d5` |
| `tests/e2e/dsa-de-teste.ts` | `0e8ca8196c9ba12cd3c370d291f88bb323563723` |
| `tests/e2e/dsa-etapa-presencial.spec.ts` | `da8d8dfbb30eeb408b54b56e7c6a1de03d470ead` |
| `tests/e2e/dsa-grade.spec.ts` | `fdee97f4388e01e486675cf512bdf929c65ddab5` |
| `tests/e2e/dsa-imprimir.spec.ts` | `c931ab8f6af6df08b2fa9392293ac48b47eb036c` |
| `tests/e2e/dsa-jornada.spec.ts` | `d7bdd6858d24e9d71543605e39a868d1f24c2125` |
| `tests/e2e/dsa-lancar.spec.ts` | `838d82f5fcc1e90754a0691b90d801587e7bccbd` |
| `tests/e2e/dsa-layout-v4.spec.ts` | `8098ced5a358861dfcaf2db03a3435e9ea723bd9` |
| `tests/e2e/dsa-mover.spec.ts` | `102fa00fdff178a1487ee7a3bbb4e76623c5866d` |
| `tests/e2e/dsa-situacao.spec.ts` | `f6d1953577762b72633435aa4a9ecb50ee8d3af5` |
| `tests/e2e/dsa-ver.spec.ts` | `ad4b05fd6babb8f273fd612a455ee38867e1a015` |
| `tests/e2e/percurso-do-dsa.ts` | `1fe1b128b2ea1757585d57591c533928d875c876` |
| `tests/invariantes/rls/dsa.test.ts` | `a0290db3b74abc7f5ae57474ca831c2ac6bddfd9` |

## Grupo (a)

- **T007, antes da paginação — REPROVOU, como tinha de reprovar** (`tests/invariantes/leitura-paginada.test.ts`, banco local, 09/10/2026, turma `E2D93` da semente do DSA com 1.100 aulas a mais e uma aula sozinha na semana 40, inserida por último):

  | O quê | A leitura de antes | A contagem direta | Diferença |
  |---|---|---|---|
  | Nº do DSA da semana 40 | 26 na 1ª rodada, 27 na 2ª | 30 | 3 a 4 semanas perdidas no corte das datas |
  | CH cumprida do rodapé da disciplina `D93` | 1.004 | 1.114 | 110 TA |
  | CH acumulada do painel da mesma disciplina | 1.004 | 1.114 | 110 TA |

  ⚠️ **O nº do DSA mudou de uma rodada para a outra com o MESMO dado**: a segunda rodada regravou as
  linhas (`upsert`), a ordem física mudou, e o corte das mil pegou outras datas. É o pior modo de falha
  do teto: além de errado, o número **não é estável**.
- **T008/T009 — a equivalência passou** nas três turmas da semente (`E2D94`: com relógio, com vigência
  nova, sem relógio), **todas as semanas do período** (2026-01-05 a 2026-12-19), com e sem sábado pedido.
  ⚠️ **Na primeira rodada ela reprovou na semana 15, e a causa era a PROVA:** vinte leituras de semana em
  paralelo faziam alguma consulta falhar sob a carga do banco local, e a semana degradava para «sem
  marca de conflito» — o comportamento certo da tela. Sondado: a RPC devolve a mesma linha de conflito
  nas duas janelas. A prova passou a ler uma semana de cada vez e a exigir que o único erro seja o
  conhecido.
- ⚠️ **ACHADO da T009 — uma consulta que SEMPRE falhou:** expor os erros da leitura mostrou
  `column turma_disciplina_unidade.turma_id does not exist` em toda leitura. A tabela se liga à turma por
  `turma_disciplina_id`; a consulta entrou assim em 07/10/2026 (`9c62669`). Não corrigida (a tela não
  muda nesta spec); registrada na `PEND-DSA-SUGESTAO`.
- **T011 — a suíte do DSA passou SEM MUDAR UMA ASSERÇÃO** (09/10/2026, banco local, ramo com a refatoração):
  - unidade: **1.832** casos em 123 arquivos — 1.830 de primeira e os 2 de lint (`fronteiras`,
    `regra-de-cor`) que estouraram o prazo de 30 s com o ESLint frio sob carga; sozinhos, 9 de 9 (a
    instabilidade registrada no Épico 4, fatia (b), achado 6);
  - invariantes e RLS (`pnpm test:rls`): **261 de 261** em 11 arquivos, já com os dois novos;
  - ponta a ponta do DSA (`tests/e2e/dsa-*.spec.ts`, 2 processos, build de produção): **97 passados e 4
    pulados**, saída 0, em 4,4 min;
  - **os 39 arquivos do inventário com o MESMO `git hash-object` da T003** — 39 iguais, 0 mudados.
- **T012 — os três defeitos deliberados acenderam cada um a sua guarda**, e foram desfeitos (arquivo
  restaurado byte a byte, `cmp`):

  | Defeito plantado | Reprovou | Ficou verde |
  |---|---|---|
  | `montarSemanaDoDsa` sem o recorte da ocupação à semana | `leitura-do-periodo` (semana 2, nas 2 turmas com lançamento) | — |
  | `lerTodasAsPaginas` devolvendo só a 1ª página | `paginacao` (6 de 15) e `leitura-paginada` (nº 26 × 30, CH 1.006 × 1.114) | — |
  | acumulado sem a própria semana | `leitura-paginada` (rodapé e painel 1.113 × 1.114) | `leitura-do-periodo` — **por desenho**: o defeito está na montagem, que os dois lados usam |
- T013, idempotência e CI: `[pendente]`
