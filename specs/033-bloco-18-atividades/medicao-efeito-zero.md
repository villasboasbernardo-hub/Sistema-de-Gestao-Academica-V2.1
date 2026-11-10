# Medição do efeito zero da M2 (spec 033)

**Artefato medido** (regra 9.2): a cópia `remoto-20261103-103124.sql`, restaurada no banco **local** por
`python -m scripts.manutencao.dado_do_remoto` em 03/11/2026, com as migrations da `main` `d77f21d`. **Instrumento:**
[`medicao-efeito-zero.sql`](medicao-efeito-zero.sql) — md5 das linhas ordenadas de cada objeto, só com as colunas que
existiam antes da M2 —, rodado antes e depois de `supabase migration up --local` aplicar a M1 (`20261103140231`) e a M2
(`20261103140512`) sobre a cópia, sem reset.

| Objeto | Linhas | md5 antes | md5 depois | Igual? |
|---|---|---|---|---|
| `vw_ocupacao_ta` | 3561 | `e8efaa0c856498b375f81388a21b68ae` | `e8efaa0c856498b375f81388a21b68ae` | sim |
| `vw_ocupacao_do_dsa` | 3559 | `312de6566da9c4e32bfba4596f077956` | `312de6566da9c4e32bfba4596f077956` | sim |
| `vw_chd_por_fato` | 2723 | `e1f1ba5804f07b30769f1ba586a18b86` | `e1f1ba5804f07b30769f1ba586a18b86` | sim |
| `vw_carga_horaria_turma` | 30 | `f8d2610850985146fbcb7af2b4ce6260` | `f8d2610850985146fbcb7af2b4ce6260` | sim |
| `vw_disciplinas_execucao` | 230 | `410c11f0d078d28bbc711104351b913f` | `410c11f0d078d28bbc711104351b913f` | sim |
| `vw_instrutor_carga_anual` | 182 | `6f27a3c4d8dfcfd7875c68db61c8c150` | `6f27a3c4d8dfcfd7875c68db61c8c150` | sim |
| `vw_conformidade_tetos` | 90 | `d812cc7910c77908659338a65af760b7` | `d812cc7910c77908659338a65af760b7` | sim |
| `chd_da_turma_ate(2026-11-03)` | 12 | `633c565f5f38d9124f969a0d76415d76` | `633c565f5f38d9124f969a0d76415d76` | sim |
| `execucao_por_disciplina_ate(2026-11-03)` | 108 | `52c4d7f1f1f8516a61bf648e7ef924f9` | `52c4d7f1f1f8516a61bf648e7ef924f9` | sim |
| `atividades (categoria, subtipo, tipo)` | 1594 | `7604b784e8d13e1ef8aca0cf676f0f63` | `7604b784e8d13e1ef8aca0cf676f0f63` | sim |

**Resultado: efeito ZERO** — os dez objetos têm o mesmo número de linhas e o mesmo md5 antes e depois. A tabela de
atividades (com `editado_em`) também: nenhuma linha foi tocada.

Conferido depois, na mesma cópia: `ta_atividade_na_disciplina` (nova em `vw_carga_horaria_turma`) e
`ta_atividade_executados` (nova em `vw_disciplinas_execucao`) valem **0** em todas as linhas; as **6** views recriadas
têm `security_invoker=true`; **19** tipos com categoria (eram 15); o rótulo «Atividade Extraclasse» no valor «Atividade
Extracurricular»; o recurso `planejamento_de_atividades` permitido a **3** perfis; **0** policies de `DELETE`.

## Remedição de 10/11/2026, antes do remoto — com as correções da revisão

**Artefato medido** (regra 9.2): a cópia `remoto-20261110-201931.sql`, tirada às 20:19 de 10/11/2026 e restaurada no
banco **local** por `python -m scripts.manutencao.dado_do_remoto` com as migrations até `20261031151628` (as duas do
bloco fora da pasta durante a restauração); depois, `supabase migration up --local` aplicou a M1 e a M2 **na forma
corrigida pela revisão adversarial** (o porteiro do vínculo, a recategorização que pula a turma arquivada e a guarda da
AEC prevista). Mesmo instrumento, com a data das duas funções trocada para o dia (`2026-11-10`).

| Objeto | Linhas | md5 antes | md5 depois | Igual? |
|---|---|---|---|---|
| `vw_ocupacao_ta` | 3574 | `7d3ea84176a2e6c9402ee842ccf27557` | `7d3ea84176a2e6c9402ee842ccf27557` | sim |
| `vw_ocupacao_do_dsa` | 3576 | `e659a8ef44863ca4d3be7b21d7739d1c` | `e659a8ef44863ca4d3be7b21d7739d1c` | sim |
| `vw_chd_por_fato` | 2736 | `d161bec5d022272176098ff264ea8c35` | `d161bec5d022272176098ff264ea8c35` | sim |
| `vw_carga_horaria_turma` | 30 | `244357159ad156ad93615d8e3c04fbdb` | `244357159ad156ad93615d8e3c04fbdb` | sim |
| `vw_disciplinas_execucao` | 230 | `729ab19e55a497ddcce92d0a0b0d7ab9` | `729ab19e55a497ddcce92d0a0b0d7ab9` | sim |
| `vw_instrutor_carga_anual` | 182 | `076918cbf242b038a974c38f05269245` | `076918cbf242b038a974c38f05269245` | sim |
| `vw_conformidade_tetos` | 90 | `d812cc7910c77908659338a65af760b7` | `d812cc7910c77908659338a65af760b7` | sim |
| `chd_da_turma_ate(2026-11-10)` | 12 | `b2c3c8ef07a190ad1d83ed1ff62528e2` | `b2c3c8ef07a190ad1d83ed1ff62528e2` | sim |
| `execucao_por_disciplina_ate(2026-11-10)` | 109 | `9e72a129c2edc22b7e1cc76efba0dc28` | `9e72a129c2edc22b7e1cc76efba0dc28` | sim |
| `atividades (categoria, subtipo, tipo)` | 1594 | `7604b784e8d13e1ef8aca0cf676f0f63` | `7604b784e8d13e1ef8aca0cf676f0f63` | sim |

**Resultado: efeito ZERO de novo** — `diff` vazio entre as duas leituras. Na mesma cópia, depois: as colunas novas valem
**0** em todas as linhas (`0 / 0`), as **6** views recriadas têm `security_invoker=true`, **0** policies de `DELETE`,
**19** tipos com categoria, o rótulo «Atividade Extraclasse», o recurso `planejamento_de_atividades` para **3** perfis,
**0** lançamentos com «Conta como» e **0** retratos publicados com «Atividade Extracurricular». ⚠️ Os md5 diferem dos de
03/11 porque o dado do remoto andou (13 linhas a mais em `vw_ocupacao_ta`, por exemplo) — a comparação que vale é
antes × depois **sobre a mesma cópia**.
