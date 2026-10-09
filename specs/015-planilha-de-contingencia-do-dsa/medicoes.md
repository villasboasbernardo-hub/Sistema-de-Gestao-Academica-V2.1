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

- T007, antes da paginação: `[pendente]`
- T011, suíte do DSA: `[pendente]`
- T012, defeitos deliberados: `[pendente]`
- T013, idempotência e CI: `[pendente]`
