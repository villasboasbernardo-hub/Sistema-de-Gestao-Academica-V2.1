# Modelo de dados — Bloco 2

*19/10/2026. O SQL está em `contracts/migrations.md`; aqui, as entidades, as regras e os estados.*

## `ta_fora_do_dsa` (nova, M1)

| Campo | Regra |
|---|---|
| `codigo` | `TFD-NNNNNN`, gerado (sequência em `app`, entra em `SEQUENCIAS_DE_CODIGO` e na tradução de numeração interna) |
| `turma_disciplina_id`, `turma_id`, `disciplina_id` | a linha da turma (FK `restrict`) e uma **cópia** da turma e da disciplina **dela** — copiadas porque a RLS precisa de `turma_id` e as views leem as duas direto; o gatilho confere a cópia na criação e a torna imutável depois (P-1); a linha tem de estar ativa na criação |
| `data` | obrigatória; não futura (Zod do servidor, `hojeNaCiaara()` — o banco não usa relógio, D20) |
| `tempos` | inteiro ≥ 1 (sem ajuste negativo) |
| `instrutor_id` | opcional |
| `observacao` | obrigatória, ≥ 3 caracteres úteis, ≤ 1.000 |
| `status` | `ativo` → `inativo` (*desfeito*); nenhuma outra mudança depois de gravado — o gatilho compara o registro **inteiro** menos `status`, `editado_por` e `editado_em` (nem código nem procedência trocam junto) |

**Estados:** `ativo` (soma) → `inativo` (não soma; fica no histórico com `editado_por`/`editado_em`).
**Quem:** lê quem lê lançamento da turma (`registros_aula.ler` + alcance); grava **e desfaz** o trio
(`ta_fora_do_dsa.editar`: Admin, Encarregado e Ajudante da Administração Acadêmica), **com a turma em oferta nas duas
policies** (C-29: em curso inativo nem o desfazer passa). A recusa de gravar chega como `42501`; a de desfazer, como
zero linhas (gotcha 4).

## `turma_trocas_de_situacao` (nova, M2)

`turma_id` (sem FK), `situacao_anterior`, `situacao_nova`, `observacao` (≤ 500, opcional), `autor_id` (`auth.uid()`,
nulo sem sessão), `criado_em`, `ordem`; índice `(turma_id, ordem desc)`. **Só de acréscimo** (nem a `service_role`
reescreve). Nasce do gatilho `AFTER UPDATE OF status` em `turmas`; a observação chega pela transação
(`ciaara.observacao_da_troca`), posta pela função `trocar_situacao_da_turma`. Lê quem lê a turma; o autor sai pelo
nome para quem lê `usuarios` e como *"outra conta"* para os demais (C-22).

## `turma_arquivamentos` (nova, M2)

`turma_id` (sem FK), `acao` (`arquivar` | `desarquivar`), `observacao` (≤ 500, opcional), `autor_id`, `criado_em`,
`ordem`; índice `(turma_id, ordem desc)`. **Só de acréscimo.** Autor e instante carimbados pelo gatilho (o cliente não
escolhe); turma inexistente → `23503` `turma_inexistente`.

**Estado da turma** = o último evento: `arquivar` → arquivada; `desarquivar` ou nenhum → não arquivada.
`vw_turmas_arquivadas` (`security_invoker`) expõe `turma_id`, `arquivada_em`, `arquivada_por`, `observacao` das
arquivadas a quem lê a turma; `app.turma_arquivada(turma_id)` responde sim/não — `security definer`, para não falhar
aberta para quem grava sem enxergar o arquivamento (gotcha 4).

**Transições:** não arquivada → *arquivar* (quem tem `turmas.editar`, no alcance) → arquivada → *desarquivar* (só o
Admin) → não arquivada. Arquivar a já arquivada ou desarquivar a que não está: recusado.

**Arquivada é ortogonal à situação:** a situação não muda, o enum não muda (TURMA-1, reaberta por D-COR-5).

## `disciplinas.nome_no_dsa` (nova coluna, M1)

Opcional; o banco aceita de 1 a 60 caracteres (teto de segurança) e o servidor exige no máximo L, o limite do cartão
medido no papel (R-8; L `[pendente: medido na T045]`, que troca este marcador pelo valor e pela medição). Vale só no
cartão do DSA.

## Views (M1)

| View | Muda | Igual |
|---|---|---|
| `vw_chd_por_fato` | ramo `fora_do_dsa`; coluna `sem_posicao` no fim | as colunas de antes, com os mesmos valores |
| `vw_carga_horaria_turma` | `chd_executada` e `cht_executada` somam o fora do DSA; coluna `ta_fora_do_dsa` no fim | todas as outras colunas |
| `vw_disciplinas_execucao` | `ta_executados`, `ta_saldo` e as datas reais somam o fora do DSA; colunas `ta_fora_do_dsa` e `nome_no_dsa` no fim | todas as outras colunas |

## `config_parametros` (linha nova, M3)

`turmas.aviso_inicio_dias` = 30, operacional, editável pelo Encarregado.
