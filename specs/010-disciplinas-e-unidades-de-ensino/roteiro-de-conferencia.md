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

`[pendente — a tabela é preenchida pela execução, nunca por antecipação (regra 9.3)]`
