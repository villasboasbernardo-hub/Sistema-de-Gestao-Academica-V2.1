# Contrato — Server Actions, recusas do banco e avisos (fatia (b))

**Spec**: [../spec.md](../spec.md) · **Modelo**: [../data-model.md](../data-model.md) · Padrão herdado da
spec 009 (`contracts/escritas-recusas-e-avisos.md`): **quem nega é o banco; a ação traduz por
`SQLSTATE` + `HINT` ou nome da restrição — nunca pelo `message`.**

## 1. As Server Actions — `lib/acoes/`, Zod na primeira linha

| Ação | Arquivo | Escreve em | Como chega ao banco | Permissão (no banco) | Confirma antes? |
|---|---|---|---|---|---|
| `criarDisciplina` | `disciplina.ts` | `disciplinas` | `insert` tipado (sem `codigo`, sem `RETURNING`; lê em comando separado — gotcha 4.1) | policy `disciplinas_criar` | não |
| `atualizarDisciplina` | `disciplina.ts` | `disciplinas` | `update` tipado | `disciplinas_editar` | sim, se muda CH com rateio gravado ou modo com instrutores atribuídos |
| `desativarDisciplina` / `reativarDisciplina` | `disciplina.ts` | `disciplinas.status` | `update` | `disciplinas_editar` | desativar: sim, se tem histórico |
| `excluirDisciplina` | `disciplina.ts` | RPC `public.excluir_disciplina(id, codigo_confirmacao)` | INVOKER → DEFINER com porteiro e rastro | dentro da função: `disciplinas.criar` + alcance | **sempre** (diálogo + código digitado) |
| `definirPeriodoDaTurma` | `atribuicao.ts` | `turma_disciplina` (uma linha) | `update … where id = ?` com `origem_periodo = 'manual'` | `turma_disciplina_editar` | não |
| `definirInstrutoresDaTurma` | `atribuicao.ts` | `turma_disciplina_instrutor` | RPC `public.definir_instrutores_da_turma(td_id, jsonb)` — regrava a lista | policies `tdi_*` (INVOKER) | sim, se remove instrutor com aula lançada |
| `criarUnidadeEnsino` / `atualizarUnidadeEnsino` / `desativar` / `reativar` | `unidade-ensino.ts` | `unidades_ensino` | `insert`/`update` tipados | `unidades_ensino_criar`/`_editar` | desativar com aula: sim |
| `excluirUnidadeEnsino` | `unidade-ensino.ts` | RPC `public.excluir_unidade_ensino(id, codigo_confirmacao)` | idem disciplina | `disciplinas.criar` + alcance | **sempre** |

Validação (`lib/validacao/disciplina.ts`, `atribuicao.ts`, `unidade-ensino.ts`): código de disciplina
`cod_disciplina` 1–20 caracteres sem espaços nas pontas; CH inteiro `> 0`; modo `dividido|simultaneo`
(nunca `herdar`); período `dd/mm/aaaa` → `date`, término ≥ início; lista de instrutores com `id` e
parcela inteira `≥ 0` ou nula; UE número inteiro `> 0`, tópico não vazio, CH `> 0`, fundamento
obrigatório na criação pela tela.

## 2. As recusas e a tradução — `lib/acoes/traducao-de-recusas.ts`

**Chaves medidas no banco antes de escrever a tradução** (regra 9.1.1, como a spec 009 fez): a tabela
abaixo é o **contrato**; a migration MUST emitir exatamente estas chaves e o teste de unidade da
tradução MUST lê-las do SQL.

| Situação | Onde nasce | `SQLSTATE` | Discriminador | Frase na tela |
|---|---|---|---|---|
| código repetido no curso (ativas) | `uq_disciplinas_curso_cod_ativo` / `trg_disciplinas_unicidade` | `23505` | nome do índice ou `hint` do gatilho | *"Já existe uma disciplina ativa com este código neste curso. Escolha outro."* |
| reativar com código tomado | idem | `23505` | idem | *"O código está em uso por outra disciplina ativa."* |
| `DIS-`/`UE-` colidindo | `disciplinas_codigo_key` / `unidades_ensino_codigo_key` | `23505` | nome da restrição, em `NUMERACAO_INTERNA` | *"Erro interno de numeração … Avise o suporte."* (gotcha 9) |
| UE com número repetido | `ue_unica_na_disciplina` | `23505` | nome | *"Já existe UE com este número nesta disciplina."* |
| excluir com dependente | `app.excluir_disciplina` / `_unidade_ensino` | `23503` | `hint = 'registro_com_historico'`, `DETAIL` JSON `{"impedimentos": [...]}` | *"Este registro tem histórico — desative em vez de excluir."* + lista traduzida por `lib/dominio/exclusao-de-disciplina.ts` (`linha_de_turma` → "linha de turma", `vinculo_de_habilitacao`, `avaliacao`, `planejamento`, `unidade_de_ensino`, `aula_lancada`) |
| excluir sem permissão | idem | `42501` | — | *"Você não tem permissão para excluir. Quem pode criar disciplina pode excluí-la."* |
| código de confirmação errado | idem | `22023` | `hint = 'codigo_nao_confere'` | *"O código digitado não confere."* |
| registro inexistente | idem | `P0002` | — | *"Este registro já não existe."* |
| período fora da janela | `trg_turma_disciplina_janela` | `23514` | `hint = 'periodo_fora_da_janela'`, `DETAIL` `{"data_inicio","data_termino"}` | *"O período sai da janela da turma (dd/mm/aaaa a dd/mm/aaaa)."* |
| rateio não fecha | `trg_tdi_soma_do_rateio` | `23514` | `hint = 'rateio_nao_fecha'`, `DETAIL` `{"soma","carga_horaria_tempos","modo"}` | *"As parcelas somam N tempos; a disciplina tem M."* / simultâneo: *"cada instrutor recebe a CH integral (M)."* |
| mistura de parcela vazia e preenchida | idem | `23514` | `hint = 'rateio_incompleto'` | *"Preencha a parcela de todos os instrutores ou de nenhum."* |
| UE sem instrutor no rateio por UE | `trg_tdu_soma_do_rateio` | `23514` | `hint = 'ue_sem_instrutor'`, `DETAIL` JSON `{"atribuidas","unidades"}` | *"Faltam N de M unidades de ensino sem instrutor. No rateio por unidade, todas precisam de um."* |
| UE atribuída e nenhum instrutor ativo na turma | idem | `23514` | `hint = 'ue_sem_instrutor_ativo'` | *"Há unidade de ensino atribuída e nenhum instrutor ativo nesta turma."* |
| rateio por UE e por TA ao mesmo tempo | idem | `23514` | `hint = 'rateio_por_ue_com_ta'`, `DETAIL` com a frase do banco | *"Escolha um dos dois: dividir por unidade de ensino ou digitar os tempos de cada instrutor."* |
| `herdar` em disciplina | `disciplinas_modo_padrao_concreto` | `23514` | nome | *"Escolha dividido ou simultâneo."* (a tela nem oferece) |
| curso fora do escopo / inativo | RLS (`alcanca_curso`, `curso_em_oferta`) | `42501` | — | a frase existente da spec 009 (`cursoInativo` lido antes) |

⚠️ **AS TRÊS ÚLTIMAS LINHAS ENTRARAM EM 26/09/2026, e a falta delas era real.** A decisão **A-1**
criou os casos 4 e 5 do rateio, e com eles três recusas que o gatilho adiado **levanta de verdade** —
medidas no SQL de `20260925135054_rateio_por_instrutor.sql`, não supostas. Elas não estavam nesta
tabela: quem atribuísse UEs deixando uma sem instrutor, ou misturasse os dois modos, veria **o erro
cru do banco** numa tela em português. ⚠️ **As frases acima são propostas** — a chave, o `SQLSTATE` e
o `DETAIL` são medidos; o texto ao usuário pode ser reescrito sem mexer no resto.

## 3. Os avisos — `lib/dominio/`, listas abertas, nunca bloqueio

| Aviso | Função pura | Regra | Onde aparece |
|---|---|---|---|
| sem instrutor na turma | `sinalizacao-de-disciplina.ts` | `RF-MATERIAS-03` | badge na linha; indicador |
| início em ≤ N dias, com/sem instrutor | idem, `N` de `config_parametros.disciplinas.aviso_inicio_dias` | `RF-MATERIAS-03` | badge (dois tons) |
| soma das UEs ≠ CH da disciplina | `soma-das-unidades.ts` | Q-06 | linha da disciplina e painel de UEs, com a diferença |
| parcelas gravadas ≠ CH atual (CH mudou depois) | `rateio-de-carga.ts` (`conferirRateio`) | `FR-043` | linha, painel de instrutores |
| parcelas todas vazias (96 migradas) | idem | Q-03 — divide igualmente **em leitura** | painel, *"dividido igualmente (não gravado)"* |
| disciplina sem habilitado | `habilitacao.ts` (existente) | `RF-MATERIAS-02` | painel de instrutores, com caminho para a ficha |
| indicador que depende de turma sem turma escolhida | `indicadores-da-grade.ts` | `RN-DEG-01` | quadro de indicadores |
| curso sem UE / disciplina sem UE | `modelo-do-curriculo.ts` | D-B3 — **não é aviso**: a seção não é renderizada | — |

## 4. Confirmação antes de salvar — `confirmacao-de-gravacao.ts`, lista fechada estendida

Entram em `TIPOS_DE_GRAVACAO`: `excluirDisciplina`, `excluirUnidadeEnsino` (sempre; exigem o código),
`desativarDisciplinaComHistorico`, `desativarUnidadeComAula`, `alterarChComRateio`,
`alterarModoComInstrutores`, `removerInstrutorComAula`. Cada tipo com mensagem que nomeia o que é
alcançado (turmas, aulas, instrutores) — Vitest por tipo, e o teste que conta os tipos passa de
N para N+7.
