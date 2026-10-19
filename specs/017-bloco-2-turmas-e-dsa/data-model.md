# Modelo de dados — Bloco 2

*19/10/2026. O SQL está em `contracts/migrations.md`; aqui, as entidades, as regras e os estados.*

## `ta_fora_do_dsa` (nova, M1)

| Campo | Regra |
|---|---|
| `codigo` | `TFD-NNNNNN`, gerado (sequência em `app`, entra em `SEQUENCIAS_DE_CODIGO` e na tradução de numeração interna) |
| `turma_disciplina_id`, `turma_id`, `disciplina_id` | a linha da turma, e a turma e a disciplina **dela** (o gatilho confere); a linha tem de estar ativa na criação |
| `data` | obrigatória; não futura (Zod do servidor, `hojeNaCiaara()` — o banco não usa relógio, D20) |
| `tempos` | inteiro ≥ 1 (sem ajuste negativo) |
| `instrutor_id` | opcional |
| `observacao` | obrigatória, ≥ 3 caracteres úteis, ≤ 1.000 |
| `status` | `ativo` → `inativo` (*desfeito*); nenhuma outra mudança depois de gravado |

**Estados:** `ativo` (soma) → `inativo` (não soma; fica no histórico com `editado_por`/`editado_em`).
**Quem:** lê quem lê lançamento da turma (`registros_aula.ler` + alcance); grava e desfaz o trio
(`ta_fora_do_dsa.editar`: Admin, Encarregado e Ajudante da Administração Acadêmica), com a turma em oferta.

## `turma_trocas_de_situacao` (nova, M2)

`turma_id` (sem FK), `situacao_anterior`, `situacao_nova`, `observacao` (≤ 500, opcional), `autor_id` (`auth.uid()`,
nulo sem sessão), `criado_em`, `ordem`. **Só de acréscimo** (nem a `service_role` reescreve). Nasce do gatilho
`AFTER UPDATE OF status` em `turmas`; a observação chega pela transação (`ciaara.observacao_da_troca`), posta pela
função `trocar_situacao_da_turma`. Lê quem lê a turma.

## `turma_arquivamentos` (nova, M2)

`turma_id` (sem FK), `acao` (`arquivar` | `desarquivar`), `observacao` (≤ 500, opcional), `autor_id`, `criado_em`,
`ordem`. **Só de acréscimo.** Autor e instante carimbados pelo gatilho (o cliente não escolhe).

**Estado da turma** = o último evento: `arquivar` → arquivada; `desarquivar` ou nenhum → não arquivada.
`vw_turmas_arquivadas` expõe `turma_id`, `arquivada_em`, `arquivada_por`, `observacao` das arquivadas;
`app.turma_arquivada(turma_id)` responde sim/não.

**Transições:** não arquivada → *arquivar* (quem tem `turmas.editar`, no alcance) → arquivada → *desarquivar* (só o
Admin) → não arquivada. Arquivar a já arquivada ou desarquivar a que não está: recusado.

**Arquivada é ortogonal à situação:** a situação não muda, o enum não muda (TURMA-1, reaberta por D-COR-5).

## `disciplinas.nome_no_dsa` (nova coluna, M1)

Opcional, 1 a L caracteres (L medido no cartão real, R-8). Vale só no cartão do DSA.

## Views (M1)

| View | Muda | Igual |
|---|---|---|
| `vw_chd_por_fato` | ramo `fora_do_dsa`; coluna `sem_posicao` no fim | as colunas de antes, com os mesmos valores |
| `vw_carga_horaria_turma` | `chd_executada` e `cht_executada` somam o fora do DSA; coluna `ta_fora_do_dsa` no fim | todas as outras colunas |
| `vw_disciplinas_execucao` | `ta_executados`, `ta_saldo` e as datas reais somam o fora do DSA; colunas `ta_fora_do_dsa` e `nome_no_dsa` no fim | todas as outras colunas |

## `config_parametros` (linha nova, M3)

`turmas.aviso_inicio_dias` = 30, operacional, editável pelo Encarregado.
