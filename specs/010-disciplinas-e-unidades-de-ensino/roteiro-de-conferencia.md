# Roteiro de conferência — PR 1 da fatia (b), T015

**Ponto de partida**, e ele importa: o roteiro pressupõe a base local **carregada**, porque quatro dos
nove passos só medem alguma coisa com as 175 disciplinas reais no lugar.

```
pnpm db:reset:limpo
python -m scripts.etl.executar
```

⚠️ **Nada aqui toca no remoto.** Os nove passos rodam contra o Docker desta máquina.

## Os nove passos

| # | Passo | Resultado esperado |
|---|---|---|
| 1 | `select count(*) from supabase_migrations.schema_migrations` | **44** — as 37 anteriores mais as 7 desta fatia |
| 2 | Criar disciplina pelo Studio (ou `insert`) **sem informar código** | nasce `DIS-000001` |
| 3 | `select app.excluir_disciplina('<id dela>', '<código errado>')` | `22023` — o código não confere |
| 4 | `select app.excluir_disciplina('<id>', 'DIS-000001')` | some; `select * from exclusoes_registradas` mostra quem, o quê, quando e o retrato |
| 5 | `select app.excluir_disciplina((select id from disciplinas where codigo='53 - C-Ap-FR - XIII'), '53 - C-Ap-FR - XIII')` | `23503`, nomeando os impedimentos |
| 6 | `update exclusoes_registradas set registro_codigo='X'` | recusado (`42501`, `hint = rastro_imutavel`) |
| 7 | `select codigo, modo_atribuicao_padrao from disciplinas where modo_atribuicao_padrao='simultaneo'` | as **3** nomeadas pela `RN-MAT-05` |
| 8 | `select * from vw_instrutor_carga_prevista where instrutores_designados>1` | **inteiros**, e a soma por `turma_disciplina` fecha com a CH |
| 9 | `update turma_disciplina set previsao_inicio='2020-01-01', origem_periodo='manual' where id=(select id from turma_disciplina limit 1)` | `23514`, `hint = periodo_fora_da_janela` |

## No preview do ramo

- as telas da fatia (a) abrem normalmente;
- o menu **não** oferece *Disciplinas* — este PR não liga tela nenhuma;
- a ficha de um instrutor com disciplina compartilhada mostra CH prevista **inteira**.

## Executado em 26/09/2026 — passo, esperado, obtido

Base local recriada e carregada — `pnpm db:reset:limpo` · ETL saindo **0** · 175 disciplinas ·
210 `turma_disciplina` · 96 atribuições · 44 migrations.

| # | Passo | Esperado | Obtido | |
|---|---|---|---|---|
| 1 | migrations aplicadas | **44** | 44 | ✅ |
| 2 | disciplina criada sem informar código | nasce `DIS-000001` | `DIS-000001` | ✅ |
| 3 | excluir com o código ERRADO | `22023` — o código não confere | `22023` · *o codigo digitado nao confere com o da disciplina* | ✅ |
| 4 | excluir com o código certo | some, e o rastro mostra quem, o quê, quando e o retrato | sobrou 0 · `disciplinas` / `DIS-000001` / com autor / com data / retrato com **26** campos | ✅ |
| 5 | excluir uma disciplina REAL | `23503`, nomeando os impedimentos | `23503` · `disciplina_com_historico: linha_de_turma` | ✅ |
| 6 | reescrever o rastro | recusado — `42501`, `hint = rastro_imutavel` | `42501` · hint `rastro_imutavel` | ✅ |
| 7 | as disciplinas em modo simultâneo | as **3** nomeadas pela `RN-MAT-05` | 3 — `20 - CAHO - XVIII` · `41 - C-Ap-HN - XVIII` · `53 - C-Ap-FR - XIII` | ✅ |
| 8 | a CH prevista das compartilhadas | **inteiros**, e a soma por `turma_disciplina` fecha com a CH | 17 linhas · **0** fracionárias · **0 de 5** não fecham | ✅ |
| 9 | período fora da janela da turma | `23514`, `hint = periodo_fora_da_janela` | `23514` · hint `periodo_fora_da_janela` | ✅ |

**9 de 9 como esperado.**

⚠️ **A sessão dos passos 3 a 5 foi SIMULADA por `request.jwt.claims`, e isto fica declarado**: o
porteiro daqueles passos é `app.pode(...)` **dentro de uma função**, que lê `auth.uid()`. Prova de
**permissão** propriamente dita não mora aqui — mora em `tests/invariantes/rls/disciplinas.test.ts`,
com sessão autenticada de verdade (DoD 4), onde o **Operador** é o caso que discrimina.

⚠️ **E o primeiro executor deu veredito FALSO em quatro passos.** Ele lia o `hint` da exceção como
se `pg_exception_hint` fosse coluna; o próprio tratador estourava com `42703`, e a tabela dizia
*"(não recusou)"* para quatro recusas que o banco tinha feito corretamente. O `hint` sai por
`get stacked diagnostics … = pg_exception_hint`. **Defeito do executor, não do banco** — e é o
modo de falha mais caro que existe num roteiro de conferência, porque acusa o produto.
