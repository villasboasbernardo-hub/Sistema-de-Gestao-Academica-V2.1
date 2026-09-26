# Modelo de dados — Épico 5, fatia (b): disciplinas e unidades de ensino

**Data**: 24/09/2026 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md) ·
**Pesquisa**: [research.md](./research.md)

Tudo abaixo foi **medido** no banco local (retrato do remoto, cópia `remoto-20260924-153818.sql`) e
no código da `main` em `406b566`. Nada aqui foi aplicado — este é o desenho que o **PR 1** (banco) e o
**PR 2** (carga das UEs) implementam. Cada mudança nomeia o requisito que a exige e a decisão de
Bernardo que a fixou.

## 1. Entidades e o que muda em cada uma

### `disciplinas` — 175 linhas, 24 cursos

| O quê | Hoje (medido) | Depois | Origem |
|---|---|---|---|
| `codigo` | `text unique not null`, **sem `DEFAULT`** — guarda o `ID_Grade` da v2.0 verbatim (`53 - C-Ap-FR - XIII`); **0 de 175** começam com `DIS-` | `DEFAULT app.proximo_codigo_disciplina()` → `DIS-000001`, `DIS-000002`… (sequência `app.disciplinas_codigo_seq`, `lpad` 6, como o `TDI-`); **`grant execute` a `authenticated` e `service_role`** (gotcha 5.1). O tipo gerado passa a mostrar `codigo` **opcional** em `Insert` (gotcha 5.2 — é a conferência de que virou `DEFAULT`) | `FR-012`, Q-11, N-5 |
| `modo_atribuicao_padrao` | ENUM `modo_atribuicao` (`herdar`, `dividido`, `simultaneo`); `CHECK disciplinas_modo_padrao_concreto (<> 'herdar')` **já existe**; `simultaneo` em **0** | **3 linhas** viram `simultaneo` por `UPDATE` nomeado na migration (`53 - C-Ap-FR - XIII`, `41 - C-Ap-HN - XVIII`, `20 - CAHO - XVIII`), com `migracao_log` recebendo um evento por linha (regra 5: corrigir é logar evento novo). **Nenhum `CHECK` novo** | `FR-040`, Q-02, N-2 |
| `instrutores_atribuidos` (`uuid[]`) | vazio nas 175; gatilho `trg_disciplinas_instrutores_fk` confere os elementos | **`[APOSENTADA — v2.1]`** no comentário da coluna; **sem `drop`**; o gatilho fica (inerte). A RPC de exclusão de instrutor continua a lê-la como impedimento — não muda (`FR-025`) | `FR-032`, Q-01 |
| `sem_unidades_ensino` | não existe | **coluna nova** `boolean not null default false` — `true` só onde a conferência disse que o currículo **não lista UE para a disciplina** (as 5 `AMBIENTAÇÃO VIRTUAL` e a emprestada `C-Exp-Metoc-OF-SP IV`); preenchida pela carga (PR 2), editável por `disciplinas.editar` | `FR-063` |
| nascimento nas turmas | não existe (o de `turmas` só age em turma nova) | ⚠️ **RPC, não gatilho** (A-2, 25/09/2026): `public.criar_disciplina(jsonb)` e `public.reativar_disciplina(uuid)` inserem a disciplina / reativam **e** criam as linhas de `turma_disciplina` das turmas `planejada`/`ativa` **na mesma transação**, no molde de `criar_curso_com_regime`; **idempotentes** pela unicidade `(turma_id, disciplina_id)`. Gatilho `AFTER INSERT` foi **recusado**: colidiria com a ordem do ETL e com 4 amostras pgTAP | `FR-070`, `FR-070.1`, Q-08, N-4, A-2, A-2b |
| desativar / reativar | `UPDATE status` pela policy `disciplinas_editar` | igual; reativar com código tomado é recusada por `uq_disciplinas_curso_cod_ativo` (`23505`) e traduzida | `FR-013`, Q-04 |

### `turma_disciplina` — 210 linhas

| O quê | Hoje | Depois | Origem |
|---|---|---|---|
| `instrutor_id` | 79 preenchidos; comentário diz *"de onde a LIQ lê"*; **79 de 79** têm linha ativa na junção com o mesmo instrutor | **`[APOSENTADA — v2.1]`**: comentário reescrito — *"a LIQ (Épico 11) lê `turma_disciplina_instrutor`"*; **nenhuma escrita** por esta fatia; sem `drop`. **Antes** da migration que aposenta, a asserção pgTAP `FR-032.1` prova a cobertura na base carregada; se falhar, a migration migra as faltantes para a junção | `FR-032`, `FR-032.1`, Q-01 |
| `ch_prevista_por_instrutor` | 0 preenchidos | **`[APOSENTADA — v2.1]`**; a CH rateada vive só na junção | `FR-032`, A-4, D-7 |
| `previsao_inicio` / `previsao_termino` / `origem_periodo` | `herdado_grade` 89 · `nao_informado` 121 · `manual` 0 | a tela grava com `origem_periodo = 'manual'` e **exatamente uma linha** (critério 4) | `FR-030` |
| gatilho novo `trg_turma_disciplina_janela` | não existe. ⚠️ **Medido: 4 linhas hoje têm período fora da janela da turma** (herdadas do ETL; 27 turmas têm janela) | `BEFORE INSERT OR UPDATE OF previsao_inicio, previsao_termino, origem_periodo`: **só quando `new.origem_periodo = 'manual'`** e a turma tem `data_inicio` e `data_termino`, recusa período fora da janela com `errcode 23514` e `hint = 'periodo_fora_da_janela'`, `DETAIL` JSON com a janela — traduzido pela tela. Linha migrada (`herdado_grade`/`nao_informado`) **não** é tocada — as 4 divergentes ficam como estão, visíveis no quadro da turma (`FR-028.4` da spec 009) | `FR-030.1`, Q-07 |

### `turma_disciplina_instrutor` — 96 linhas em 85 `turma_disciplina`

| O quê | Hoje | Depois | Origem |
|---|---|---|---|
| `ch_prevista_tempos` | `numeric(6,2)`, `NULL` nas 96 — **0 valores fracionários**, medido em 25/09/2026 | **fica `NULL`** até alguém salvar a atribuição; a leitura divide igualmente com aviso (`RN-DEG-01`). Ganha `CHECK ch_prevista_inteira (ch_prevista_tempos = trunc(ch_prevista_tempos))` — **parcela sempre inteira** (`FR-041`, A-1). A coluna **não** muda de tipo: `numeric(6,2)` é o padrão de CH do schema, e mudar tipo de coluna com histórico não se faz | `FR-041.4`, `FR-043`, Q-03, A-1 |
| `papel` | `NULL` nas 96 | intocado — LIQ-3 | fora de escopo |
| escrita | policies `tdi_criar`/`tdi_editar` sobre `disciplinas.editar` + alcance + turma em oferta | **uma RPC** `public.definir_instrutores_da_turma(p_turma_disciplina_id uuid, p_instrutores jsonb)` (INVOKER — as policies existentes decidem) que **regrava por completo** a lista da turma: ativa/insere quem está na lista com a parcela calculada, desativa quem saiu (`status = 'inativo'`, nunca `DELETE`), numa transação só. Parcelas vêm da função pura de `lib/dominio/` **e são reconferidas pelo gatilho** | `FR-031`, `FR-041`, `FR-043` |
| gatilho novo `trg_tdi_soma_do_rateio` | não existe | **constraint trigger `DEFERRABLE INITIALLY DEFERRED`**, `AFTER INSERT OR UPDATE` em `turma_disciplina_instrutor` **e** em `turma_disciplina_unidade`: ao fim da transação, para cada `turma_disciplina` tocada — **caso 4** (parcela preenchida): soma MUST ser `= disciplinas.carga_horaria_tempos`, e mistura de `NULL` com valor recusa (`rateio_incompleto`); **caso 5** (há linha em `turma_disciplina_unidade`): **toda** UE ativa da disciplina MUST estar atribuída (`ue_sem_instrutor`) e `ch_prevista_tempos` MUST ser `NULL` nas parcelas (`rateio_por_ue_com_ta`, os casos 4 e 5 não coexistem); `simultaneo` → cada parcela preenchida MUST ser `= carga_horaria_tempos`. Recusa `23514` com `hint` próprio e `DETAIL` com os números | `FR-041.4`, `FR-041.5`, `FR-041.6`, `FR-043` |

### `unidades_ensino` — **0 linhas hoje**; **587** depois do PR 2 (582 do extrator + 5 do APOC — conferência §2, P-4)

| O quê | Hoje | Depois | Origem |
|---|---|---|---|
| `codigo` | `text unique not null`, **sem `DEFAULT`** | `DEFAULT app.proximo_codigo_unidade_ensino()` → `UE-000001`… (sequência `app.unidades_ensino_codigo_seq`), com `grant execute`; a **carga** também usa o `DEFAULT` (não inventa código) — e **a sequência entra em `SEQUENCIAS_DE_CODIGO`** junto com a de `DIS-` (o teste `sequencias-apos-restaurar` e a prova P3 passam a exigir **6**) | `FR-061`, regra do gotcha 9 |
| `fundamento_normativo` | anulável, vazio | a carga preenche **toda** linha: `Of nº 10-6/2025, da DEnsM` (15 currículos) ou `Currículo <sigla> — <órgão da capa>, <ano>` (8); UE criada no sistema: **obrigatório na tela** (Zod) — o banco continua anulável para não travar a coluna migrada (catraca, padrão do Épico 2) | `FR-064`, N-1 |
| `origem_migracao_v1` | anulável | a carga grava o **nome do arquivo** do currículo; UE criada no sistema fica `NULL` **com `criado_por`** — é assim que a tela distingue *do currículo* × *criada no sistema* (R-05, duas isenções) | `FR-061` |
| `status` | `ativo` | desativar/reativar por `unidades_ensino_editar`; excluir pela RPC | `FR-060` |
| soma × CH da disciplina | asserção pgTAP `FR-024` (spec 002) | **aviso na tela, nunca gatilho** (Q-06); a asserção pgTAP passa a ser sobre a **carga** (`050_grao_unidade_ensino.sql` já a tem — conferir que ela não vira bloqueio de edição) | `FR-062` |

### `turma_disciplina_unidade` — **tabela nova** (A-1, caso 5)

Quem ministra **cada UE** de uma disciplina **naquela turma**. É o que sustenta o rateio **por UE**, e
a parcela do instrutor passa a ser a **soma da CH das UEs dele** — derivada, nunca gravada.

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | `uuid pk default gen_random_uuid()` | |
| `codigo` | `text unique not null default app.proximo_codigo_turma_disciplina_unidade()` | `TDU-NNNNNN`, sequência em `app`, **na lista única** de `avancar_sequencias` (passa a **7**) |
| `turma_disciplina_id` | `uuid not null` | FK `restrict` |
| `disciplina_id` | `uuid not null` | redundante **de propósito**, para a FK composta abaixo — o mesmo padrão de `curso_id` em `unidades_ensino` (spec 002, `plan.md` §105) |
| `unidade_ensino_id` | `uuid not null` | FK `restrict` |
| `instrutor_id` | `uuid not null` | FK `restrict` |
| `status`, `origem_migracao_v1`, quarteto de auditoria | como o resto do schema | |

**Constraints** — a coerência é do motor, não de gatilho (`RN-MAT-01`):
- `unique (turma_disciplina_id, unidade_ensino_id)` — **cada UE com exatamente um instrutor** naquela turma.
- FK composta `(turma_disciplina_id, disciplina_id) → turma_disciplina (id, disciplina_id)` — exige a
  unique nova `td_id_disciplina` em `turma_disciplina`.
- FK composta `(unidade_ensino_id, disciplina_id) → unidades_ensino (id, disciplina_id)` — exige a
  unique nova `ue_id_disciplina`. **Juntas, garantem que a UE é da disciplina daquela turma**, sem
  gatilho.
- FK composta `(turma_disciplina_id, instrutor_id) → turma_disciplina_instrutor (turma_disciplina_id,
  instrutor_id)` (a unique `tdi_par_unico` já existe) — **só instrutor já atribuído àquela turma**
  recebe UE.

**RLS**: `ler` / `criar` / `editar` sobre `app.pode('disciplinas', …)` + alcance da turma + turma em
oferta, espelhando `turma_disciplina_instrutor`. Sem policy nem privilégio de `DELETE`.

### `cursos` — 24 linhas

| O quê | Depois | Origem |
|---|---|---|
| `curriculo_modelo` | **coluna nova** `text not null default 'unidades_de_ensino'` com `CHECK (curriculo_modelo in ('unidades_de_ensino', 'competencias'))` — `competencias` para `C-Espc-FR` e `C-Espc-HN` (carga, PR 2). `EST-QF-APOC` fica `unidades_de_ensino` **se** a conferência por agentes confirmar a transcrição; senão, ganha `sem_unidades_ensino` nas disciplinas e pendência. ⚠️ É `text + CHECK`, não ENUM: o domínio é da DEnsM mas pode crescer (regra "ENUM fechado cedo demais é migration") | `FR-063`, D-B3 |

### `config_parametros` — uma linha nova

| Coluna | Valor |
|---|---|
| `chave` | `disciplinas.aviso_inicio_dias` (passa em `config_param_chave_snake`) |
| `valor` / `tipo` / `unidade` | `30` / `inteiro` / `dias` |
| `natureza` | `operacional` — número da Divisão, não texto de norma (`config_param_normativo_tem_fundamento` não exige fundamento) |
| `descricao` | dias antes do início previsto a partir dos quais a disciplina é sinalizada como "início próximo" (`RF-MATERIAS-03`) |
| `editavel_por` | `encarregado_administracao_academica`, como os demais operacionais |

### `exclusoes_registradas` — **tabela nova** (Q-09)

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | `uuid pk default gen_random_uuid()` | |
| `tabela` | `text not null check (tabela in ('instrutores','disciplinas','unidades_ensino'))` | a lista é a da regra 4 emendada |
| `registro_id` | `uuid not null` | o `id` apagado — **não é FK** (a linha já não existe) |
| `registro_codigo` | `text not null` | o `codigo` apagado, para busca humana |
| `retrato` | `jsonb not null` | `to_jsonb(linha)` antes do `DELETE` |
| `excluido_por` | `uuid not null` | `auth.uid()` — gravado pela função DEFINER, **não** pelo cliente |
| `excluido_em` | `timestamptz not null default now()` | |

**RLS**: `enable`; policy `SELECT` para `app.pode('auditoria','ler')`; **nenhuma** policy de escrita;
`revoke insert, update, delete, truncate … from authenticated, anon`; escrita só de dentro de
`app.excluir_*` (DEFINER). **Append-only** como `curso_sigla_historico`: gatilhos de *statement*
`BEFORE UPDATE OR DELETE` e `BEFORE TRUNCATE` que recusam **inclusive para `service_role`**. Sem
`origem_migracao_v1` (não é tabela migrada) e sem o quarteto de auditoria (`excluido_por/em` **é** a
auditoria; `editado_*` não faz sentido numa linha que não muda) — desvio declarado das convenções.
A RPC de instrutor **não** passa a gravar aqui nesta fatia (`FR-025`, `PEND-5b-1`).

## 2. Funções e gatilhos — o que nasce

| Objeto | Tipo | Faz | Origem |
|---|---|---|---|
| `app.disciplinas_codigo_seq`, `app.proximo_codigo_disciplina()` | sequência + função `DEFAULT` | `DIS-` + 6 dígitos | `FR-012` |
| `app.unidades_ensino_codigo_seq`, `app.proximo_codigo_unidade_ensino()` | idem | `UE-` + 6 dígitos | `FR-061` |
| `app.impedimentos_de_exclusao_da_disciplina(uuid) returns text[]` | DEFINER | porteiro `app.pode('disciplinas','criar') and app.alcanca_curso(curso_id)`; chaves: `linha_de_turma` (`turma_disciplina`), `vinculo_de_habilitacao` (`instrutor_disciplina`), `avaliacao`, `planejamento`, `unidade_de_ensino`, `aula_lancada` (por `unidades_ensino → registros_aula` **e** por `registros_aula.disciplina_codigo_legado_v1 = disciplinas.codigo`) | `FR-021`, `FR-022`, A-11 |
| `app.excluir_disciplina(uuid, text) returns jsonb` | DEFINER | porteiro; confere `p_codigo_confirmacao = codigo`; impedimentos → `23503` com a lista; grava `exclusoes_registradas`; `DELETE`; confere `found` | `FR-020..024` |
| `app.impedimentos_de_exclusao_da_unidade_ensino(uuid)`, `app.excluir_unidade_ensino(uuid, text)` | idem | impedimento único: `aula_lancada` (as duas FKs de `registros_aula`) | `FR-022` |
| `public.*` (4 espelhos) | INVOKER, `sql` | como `public.excluir_instrutor`; `grant execute to authenticated`, `revoke` de `public`/`anon` | mesmo desenho de `20260915140100` |
| `public.definir_instrutores_da_turma(uuid, jsonb)` | INVOKER | regrava a lista da turma (§1) | `FR-031` |
| `public.criar_disciplina(jsonb)` / `public.reativar_disciplina(uuid)` | RPC INVOKER → `app.*` DEFINER | §1 — disciplina + linhas das turmas `planejada`/`ativa`, numa transação, idempotentes | `FR-070`, `FR-070.1`, A-2, A-2b |
| `vw_instrutor_carga_prevista` **reescrita** | view | os 5 casos do `FR-041`; a divisão padrão usa `row_number() over (partition by turma_disciplina_id order by app.fn_antiguidade_ordem(instrutor_id))` para dar o resto aos mais antigos, **sem fração** | `FR-041.7` |
| `app.trg_turma_disciplina_janela()` | gatilho | §1 | `FR-030.1` |
| `app.trg_tdi_soma_do_rateio()` | constraint trigger deferred | §1 | `FR-043` |
| `app.trg_exclusoes_imutaveis()` / `_sem_truncate()` | gatilhos de statement | §1 | Q-09 |

**Nada de `FOR DELETE`, nada de `grant delete`** — a asserção pgTAP que já existe (zero policies de
`DELETE`, zero privilégio) continua verde e ganha as duas tabelas novas na lista.

## 3. Invariantes — cada uma vira asserção pgTAP nomeada (`supabase/tests/1xx_*.sql`)

| # | Invariante | Como se prova |
|---|---|---|
| I-1 | `codigo` de disciplina nova nasce `DIS-NNNNNN` sem a pessoa mandar; **nenhum** legado usa o prefixo | `insert … returning codigo`; `count(*) where codigo like 'DIS-%'` = número de inseridos na prova |
| I-2 | as 3 linhas nomeadas estão `simultaneo`; as outras 172 `dividido`; `herdar` é recusado pelo `CHECK` existente | contagens + `throws_ok` |
| I-3 | `FR-032.1`: todo `turma_disciplina.instrutor_id` não nulo tem linha ativa na junção com o mesmo instrutor — **antes** da migration que aposenta (asserção com a base carregada) | `select count(*) … not exists` = 0 |
| I-4 | exclusão de disciplina **com** cada dependente (6 tipos) é recusada com `23503` e a chave certa; **sem** dependente apaga e deixa rastro | `throws_ok` ×6 + `lives_ok` + `results_eq` em `exclusoes_registradas` |
| I-5 | exclusão de UE com aula recusada; sem aula apaga com rastro | idem |
| I-6 | `exclusoes_registradas` recusa `UPDATE`, `DELETE` e `TRUNCATE` **como `service_role`** | `throws_ok` ×3 (modelo do R-22 da spec 009) |
| I-7 | rateio: `dividido` soma exata; mistura `NULL`/valor recusada; `simultaneo` cada = CH; `NULL` em todas aceito | `lives_ok`/`throws_ok` com `set constraints all immediate` |
| I-8 | período manual fora da janela recusado (turma com janela); aceito sem janela; linha `herdado_grade` **não** é tocada (as 4 divergentes continuam) | `throws_ok` + `lives_ok` + contagem = 4 |
| I-9 | disciplina nova nasce nas turmas `planejada`/`ativa` do curso e **não** nas `concluida`/`cancelada`; segunda inserção não duplica | contagens |
| I-10 | zero policies `FOR DELETE`; zero `DELETE`/`TRUNCATE` para `authenticated` em **todas** as tabelas, inclusive `exclusoes_registradas` | a asserção existente, com a lista estendida |
| I-11 | `config_parametros.disciplinas.aviso_inicio_dias` existe, `operacional`, `30` | `results_eq` |
| I-12 | depois da carga (PR 2): `count(unidades_ensino)` = o número da conferência; toda linha com `fundamento_normativo` e `origem_migracao_v1`; soma das UE = CH em **toda** disciplina carregada (a asserção `FR-024` da spec 002 deixa de passar vacuamente) | `050_grao_unidade_ensino.sql` + arquivo novo |
| I-13 | **toda** view de `public` e de `app` tem `security_invoker = true`, com **uma** exceção nominal — `vw_instrutor_dados_pessoais`, que é de dono de propósito (PII-1) e carrega o porteiro no `where`. Nasceu do defeito da M5 achado pela T010: `create or replace view` não preserva as `reloptions`, e a view de CH prevista passou a rodar com `rolbypassrls` (gotcha 10) | `010_estrutura.sql`, duas asserções — a invariante e o controle positivo da exceção |

**Prova de permissão NÃO mora aqui** (DoD 4): quem pode excluir/editar se prova em
`tests/invariantes/rls/disciplinas.test.ts` com sessão real — negativo (**operador** tem
`disciplinas.editar` e **não** `criar` → `42501` na RPC de exclusão: **é o caso que discrimina**),
controle positivo (ajudante exclui), fora de alcance (`42501`).

## 4. Plano de reversão, por migration (PR 1)

| Migration | Reverte com | Segura? |
|---|---|---|
| sequências + `DEFAULT` de `codigo` (2 tabelas) | `alter column … drop default; drop function; drop sequence` | sim — linhas criadas ficam com o código que receberam |
| aposentadorias (3 comentários) + `UPDATE` das 3 linhas `simultaneo` | restaurar comentários; `UPDATE` de volta (evento novo em `migracao_log`) | sim |
| `cursos.curriculo_modelo`, `disciplinas.sem_unidades_ensino` | `drop column` — **só enquanto não houver dado além do default** (as duas nascem `default` e só a carga do PR 2 as preenche) | sim antes do PR 2; depois, a reversão é do PR 2 |
| `exclusoes_registradas` + RPCs de exclusão | `drop function` ×8, `drop table` — **só se vazia**; com linha, a tabela **fica** (regra 4) e só as funções caem | condicional |
| gatilhos (janela, rateio, nascimento em turmas) | `drop trigger`/`drop function` | sim |
| parâmetro | `update … set status = 'inativo'` (regra 4) | sim |

**PR 2 (carga)**: reversível por `delete from unidades_ensino where origem_migracao_v1 = '<arquivo>'`
**enquanto nenhuma aula apontar para elas** — depois, não (FK `restrict`, e é o comportamento
pretendido). A migration da carga é **idempotente** (`on conflict (disciplina_id, numero_ue) do nothing`)
e termina com `assert` de contagem.
