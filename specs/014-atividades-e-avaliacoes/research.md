# Research — spec 014, as decisões técnicas que a spec deixou para o plan

> **Fase 0 do `/speckit-plan`, 13/10/2026.** Cada item é uma decisão de desenho, com o motivo e as
> alternativas que perderam. Nenhum item reabre decisão de Bernardo: o que a spec decidiu está
> citado pelo identificador (`D-AA-n`, `D-CUR-n`, `D-TETO-n`, `Q-n`) e aqui só ganha forma.
>
> **Medições citadas** (regra 9.2): o schema é o das migrations em `supabase/migrations/` na `main`
> `adeb991`; o dado é a cópia `remoto-20261009-085410.sql`; o código é o da mesma `main`.

---

## R-1. Dia parado — tabela própria, não valor de categoria

**Decisão:** tabela nova `dias_parados`, com `turma_id` nulo para o alcance global de parte do dia.
`atividades_nao_letivas` **não** ganha categoria "Dia_Parado".

**Por quê:**
- O dia parado está **fora da CHT e dos tetos** (Q-14). `atividades_nao_letivas` é a tabela do que
  compõe ou acompanha a CHT (`RN-EVT-01`), e tem a coluna gerada `compoe_cht`, a `CHECK`
  `ativ_estudo_individual_de_turma` e a policy de global por `atividades_globais.criar`. Cada uma
  dessas três teria de ganhar um "exceto dia parado".
- O dia parado tem atributos que atividade não tem: **tipo de parada** (FR, LA, LP, NT…),
  **prevista**, **bloqueia aula**, e a permissão do alcance global é **`calendario.criar`** (Q-8), não
  `atividades_globais.criar`. Em tabela própria a policy diz isso em uma linha.
- `vw_carga_horaria_turma` passa a somar a linha "dias parados" por **junção**, sem `filter` novo
  nas categorias.

**Alternativas:**
- *Valor novo no enum `categoria_normativa`:* exigiria mudar `compoe_cht` (que já muda por R-2),
  excepcionar a policy de global e a `CHECK` de EI, e deixaria "dia parado" listado entre as
  categorias da `RN-EVT-01`, que a norma não tem. Perdeu.
- *Só `feriados`:* não tem turma, tempos nem tipo; e a `RN-EVT-02` desconta capacidade de todo
  `dia_inteiro` dela, o que uma licença **só de uma turma** não pode fazer. Perdeu.

**Onde cada parada grava (US4):**

| Alcance · prevista · marca | Grava em |
|---|---|
| todas as turmas · dia inteiro · prevista | `feriados` (`dia_inteiro`), como hoje |
| todas as turmas · parte do dia · prevista | `dias_parados` com `turma_id` nulo |
| só a turma · prevista, ou não prevista sem a marca | `dias_parados` com `turma_id` |
| não prevista · **"consome Tempo Reserva"** · turma ou global | `atividades_nao_letivas` **TR**, com `bloqueia_aula = true` e `tipo_parada` |

A recusa de aula (FR-026) lê as **três** origens numa função pura só: `recusaDeAulaNoDia` de
`lib/dominio/dsa/dia-bloqueado.ts`, estendida (ver R-9).

## R-2. `compoe_cht` precisa mudar de expressão, e coluna gerada não se altera no lugar

**Fato:** `atividades_nao_letivas.compoe_cht` é `generated always as (categoria_normativa <>
'Estudo_Individual') stored` (migration `20260829234045`, L461). Com a 5ª categoria
**Apoio_Individualizado** (FR-018), a expressão tem de ser `not in ('Estudo_Individual',
'Apoio_Individualizado')`. O PostgreSQL **não altera a expressão de coluna gerada**: só `drop
expression` (que a transforma em coluna comum, sem gatilho) ou `drop column` + `add column`.

**Decisão:** `drop column compoe_cht` + `add column compoe_cht ... generated always as (…) stored`,
na **mesma** migration, com a asserção de pgTAP que confere o valor nas linhas existentes antes e
depois (contagem de `true` por categoria). ⚠️ **Exceção à convenção "nunca `drop column` em tabela
com histórico"**, justificada em *Complexity Tracking* e **submetida a Bernardo** (dúvida D-1 do
plan): a coluna é **derivada**, não guarda nada que a expressão não recalcule, e por isso não há
histórico a proteger — é a mesma lógica da exceção de instrutor sem histórico.

**Alternativas:** `drop expression` e manter por gatilho (duas fontes da mesma verdade, contra a
convenção de coluna derivada); criar `compoe_cht_v2` e aposentar a antiga (duas colunas com nomes
quase iguais e a antiga **errada** para a categoria nova). As duas perdem.

## R-3. O tipo da atividade vira FK por `id`, e a categoria é derivada por gatilho

**Decisão:** `atividades_nao_letivas.tipo_atividade_id uuid references config_listas(id)`. Gatilho
`BEFORE INSERT OR UPDATE` lê `config_listas.metadados ->> 'categoria'` do tipo e **grava**
`categoria_normativa` a partir dele; linha nova sem tipo é recusada; linha **histórica** sem tipo
casável continua com a categoria que tem (catraca, como `reg_aula_ue_so_nula_no_historico`).
`subtipo text` fica, preenchido pelo gatilho com o `valor` do tipo, para as leituras que já existem.

**Por quê:** a `RF-EXTRA-01` diz *"subtipos em `config_listas` com FK"* e a spec 013 anotou a V-6:
a FK não existe. `config_listas` tem `unique (lista, valor)` (`config_listas_chave_natural`), mas
FK composta exigiria uma coluna constante `'tipos_atividade'` na tabela de fato; a FK por `id` é o
que o resto do sistema usa. A categoria continua **gravada** porque três views e a planilha de
contingência a leem por coluna, e o gatilho a torna **derivada de fato** (D-AA-3): trocar a
categoria de um tipo em `config_listas` muda a contagem na próxima leitura **só se** a view ler pela
junção. ⚠️ *(corrigido em 13/10/2026, na revisão adversarial do `tasks.md`)*: em vez de a view ler pela junção, um segundo gatilho,
`app.recategorizar_pelo_tipo()` em `config_listas`, regrava a categoria das linhas **ativas com aquele
tipo** quando a categoria do tipo muda — e `compoe_cht`, que é gerada da coluna, acompanha. A view lê a
coluna, que fica sendo uma fonte só. As históricas sem tipo nunca são tocadas (catracas). Cenário 4 da US2.
O preenchimento do tipo pelo `subtipo` vale só para as linhas sem `origem_migracao_v1`, e um `UPDATE` só de
`subtipo` recalcula o tipo.

`config_listas` ganha gatilho de validação para `lista = 'tipos_atividade'`: recusa a categoria
**presente e fora do enum** e um `uso` presente diferente de `'aula'`. ⚠️ *(corrigido em 13/10/2026, na revisão adversarial do `tasks.md`)*: a primeira
redação exigia a categoria em todo tipo, o que o ETL (que grava tipos de aula sem categoria) e
`semear_vocabulario_usado` violariam; a recusa de tipo sem categoria fica no gatilho de
`atividades_nao_letivas` e no filtro de oferta. Padrão da migration `20260917210558` (salas).

## R-4. Avaliações do currículo — uma linha por item, origem por campo

**Decisão:** tabela `avaliacoes_curriculo`, **uma linha por avaliação prevista** (prova, trabalho
ou OD), por disciplina. A **quantidade** é a contagem de linhas; a origem da quantidade é a origem
da linha (`origem_item`). O **tempo** tem origem própria por campo: `ta_aplicacao` +
`origem_ta_aplicacao`, `ta_vista` + `origem_ta_vista`. Origem ∈ `currículo | arbitrado |
sugestao_planilha`, em `text` com `CHECK` (não é lista administrável nem domínio normativo da MB —
é decisão D-CUR-2 —, e `ENUM` fechado cedo é migration para desfazer).

O **ajuste por turma** (FR-031.7) é tabela filha `avaliacoes_curriculo_turma` (item × turma), só
com os dois tempos e a origem, `arbitrado` ou `sugestao_planilha`. Sem linha, a turma herda o item.

**Natureza** do item (`prova | trabalho | od`) vem do **instrumento**, lista nova `config_listas`
`instrumentos_avaliacao` (PE, PM, PP, PO, PD, TG, TI, EC, OD…), com `metadados.natureza`. É o que
decide o "N de M" (FR-056: prova e trabalho contam; OD não) e o tratamento da Q-17.

**UE em que o currículo computa** (`unidade_ensino_id`, nulo = "no nível da disciplina", Q-11) e
**UEs abordadas** (`ues_abordadas text`, informativo, FR-030). **Origem no PDF:** `fonte_arquivo` e
`fonte_pagina`, obrigatórios quando `origem_item = 'currículo'` (`CHECK`).

**Alternativas:** *quantidade como número numa linha por disciplina* — não liga a prova aplicada ao
item (Q-2), e "Prova 1 ✔ · Prova 2 pendente" (FR-057) precisa de identidade por item. Perdeu.
*Enum para origem* — ver acima.

## R-5. Sessões de vista — tabela filha; as colunas antigas ficam aposentadas

**Decisão:** tabela `vistas_de_avaliacao` (`avaliacao_id`, `numero`, `data`, `ta_inicial`,
`tempos_consumidos`, `local`, `conduz_instrutor_id` xor `conduz_nome_externo`, `status`). As colunas
`data_vista_prova`, `ta_inicial_vista`, `tempos_consumidos_vista`, `local_vista` e a gerada
`ta_final_vista` **ficam**, marcadas `-- [APOSENTADA — v2.1]`, e a migration de dado copia cada
vista existente para a sessão 1. `vw_carga_horaria_turma`, `app.fn_status_vista` e a planilha de
contingência passam a ler **só** a tabela filha. A `CHECK` `aval_vista_apos_aplicacao` das colunas
antigas fica inerte; a regra "sessão posterior à aplicação" vira **gatilho** na filha (precisa da
`data_avaliacao` da mãe, que uma `CHECK` não alcança).

**Por quê:** D-AA-5 pede N sessões; coluna repetida não escala; `drop column` é proibido.

## R-6. Papéis e o 2º instrutor

- **Aplicador** = `instrutor_responsavel_id` (existe). ⚠️ *(corrigido em 13/10/2026, na revisão adversarial do `tasks.md`)*: a primeira redação dizia
  *"`RN-INST-01` continua exigindo habilitação"*, e é falso — `lib/dominio/habilitacao.ts` tem
  `EXIGE_HABILITACAO.avaliacao = false`. Exigir a habilitação do aplicador, como pedem a FR-043 e o
  cenário 2 da US7, é **mudar** a regra (documento 04, L190 e L346), e isso foi para o lote de
  aprovação da Fase 0 do `tasks.md` (regra 1). **Resposta de Bernardo, 13/10/2026 (D-AV-3): aviso, sem recusa;
  fiscal e quem conduz sem exigência; a `RN-INST-01` não muda.**
- **Fiscal** = `fiscal_id` xor `nome_fiscal_externo` (existe, `ativ_…`/`aval_…` `CHECK` já recusa os
  dois juntos — critério 5 do Épico 8).
- **Quem conduz a vista** = por sessão, `conduz_instrutor_id` xor `conduz_nome_externo` (R-5).
- **Demais instrutores** (D-AA-7, Q-10): coluna `outros_instrutores text[] not null default '{}'`
  em `registros_aula`, `avaliacoes` e `atividades_nao_letivas`. Texto porque a origem é texto ("A /
  B") e a tabela de junção com rateio é a `PEND-014-1`. Nada mais vai para `observacoes`.

## R-7. "Substituída pela planilha" — valor novo no enum, em migration separada da que o usa

**Decisão:** `alter type public.status_avaliacao add value 'substituida_pela_planilha'` e coluna
`status_anterior public.status_avaliacao` (o que estava entre parênteses na marca). ⚠️ **Um valor
novo de enum não pode ser usado na mesma transação em que foi criado**, e cada arquivo de migration
roda numa transação: a migration de **dado** que move as 188 é **outro arquivo** (D-7 do plan). O
mesmo vale para `Apoio_Individualizado` em `categoria_normativa` (R-3 × D-2).

O `status` continua sendo o **estado de registro** (`ativa` é o que não é cancelada nem
substituída); os quatro valores de execução (`pendente`, `em_andamento`, `concluida`, `atrasada`)
ficam no enum para o histórico migrado, e `pendente` **continua sendo o valor gravado por padrão** no
registro ativo pelo DSA e pela sincronização; a leitura o ignora e calcula a situação (R-8). Fica
escrito no `comment on type`. ⚠️ *(corrigido em 13/10/2026, na revisão adversarial do `tasks.md`)*: a primeira redação dizia que nenhum caminho de
escrita gravava esses valores. A leitura de avaliação viva passa a ser por **lista positiva** dos
quatro valores (`.in("status", [...])`), que vale antes e depois de o valor novo existir.

## R-8. Situação calculada na leitura — função pura, e a função SQL vira espelho dela

**Decisão:** `lib/dominio/avaliacoes/situacao.ts` decide as cinco situações da FR-051 mais o par
da OD (Q-17), a partir de `{ dataPrevista, aplicacao, sessoesDeVista, temItemDeVista, prazoDias,
hoje, disciplinaConcluida }`. `app.fn_status_vista` é reescrita para ler `vistas_de_avaliacao` e
devolver o **mesmo** veredito, com pgTAP comparando os dois nos casos de fronteira (7º e 8º dia),
porque a planilha de contingência e a `vw_*` leem a SQL e a tela lê a TS — duas implementações da
mesma regra exigem o teste cruzado (Princípio VI).

**OD:** `pendente` antes do primeiro lançamento da disciplina na turma; `em_andamento` enquanto a
disciplina corre; `concluida` pelo **mesmo critério** do painel da disciplina (cumprido ≥ previsto
de aula, hoje `SecaoDeAndamento`/`DisciplinasDaTurma`). Aceito por Bernardo em 13/10/2026.

## R-9. A recusa de aula em dia parado fica na Server Action e no domínio, como a `RN-EVT-04` hoje

**Decisão:** estender `recusaDeAulaNoDia` para receber `diasParados` e `atividadesBloqueantes`
além de `feriados`, e a Server Action `lancar`/`mover`/cascata (D-DSA-3) consultar os três antes de
`gravar_lancamentos_em_transacao`. **Sem gatilho no banco.**

**Por quê:** é como a `RN-EVT-04` está implementada (`lib/acoes/dsa.ts:302–309`), e um gatilho
recusaria também a **carga das planilhas** — que grava aula em dia que a planilha marcou parado em
outra linha, e cujo destino certo é a **lista de erros de planilha**, não a transação abortada.
Princípio XI, item 5: regra de negócio fica em `lib/dominio/`. ⚠️ É a dúvida D-3 do plan, porque o
Princípio XI também diz que o que pode ser gatilho vive no banco; a recomendação é esta.

## R-10. Previsto do PROENS — por turma, com trilha de alterações só de acréscimo

**Decisão:** tabela `previsto_proens_turma` (`turma_id`, `categoria` ∈ AEC/TAD/TR por `CHECK`
sobre `categoria_normativa`, `tempos_previstos`, `origem_proens`, `status`, auditoria), `unique
(turma_id, categoria)`. Trilha `previsto_proens_alteracoes` (só de acréscimo, imutável como
`auditoria_de_conta`), alimentada por gatilho `AFTER INSERT OR UPDATE` com valor anterior, novo,
autor e instante. A tela mostra o último (FR-008.2) e a trilha fica para a `PEND-011-2` ampliar.

Permissão: recurso novo **`previsto_proens`**, ação `editar`, `true` para `admin`,
`encarregado_administracao_academica` e `ajudante_administracao_academica`, `false` para os demais —
é o **caso que discrimina** (DoD 8): o Ajudante **não** tem `calendario.editar` e **passa** a poder.

`reservas_proens` **fica**, só de leitura, marcada aposentada; as 10 linhas com curso vão para a
turma de 2026 do mesmo curso (medido: cada um dos 5 cursos tem **exatamente 1** turma em 2026,
`db2.pkl`), e a **genérica** (`curso_id` nulo, TAD 2 / TR 0) vira dois parâmetros de
`config_parametros` (`proens.reserva_generica_tad`, `proens.reserva_generica_tr`, natureza
normativa), que a tela oferece como **sugestão** em turma sem previsto. `vw_conformidade_tetos` é
reescrita sobre a tabela nova. Emenda E-7 aprovada.

## R-11. Limite máximo — o número do currículo como dado, com página; o percentual como padrão

**Decisão:** tabela `limites_curriculo` (`curso_id`, `categoria` ∈ AEC/TAD/TR, `tempos`,
`fonte_arquivo`, `fonte_pagina`, `status`), `unique (curso_id, categoria)`. Função pura
`limiteMaximo({ declarado, chCurricular, percentual })` → `{ valor, origem: "currículo" | "norma" }`
(FR-001.1). A transcrição do quadro final dos 24 currículos é **migration de dado** (D-1 do plan),
uma linha por par declarado; curso sem quadro não tem linha, e cai na norma.

**Horas = TA.** O quadro final do currículo fala em **horas**; o sistema conta **TA**. Vale a
equivalência já adotada para as UEs (1 h = 1 TA, decisão T011 da spec 006), e o plan a declara como
premissa (A-10).

## R-12. A aba *Avaliações* da turma — a página da turma ganha abas como a do curso

**Decisão:** `AbasDaTurma` com o parâmetro `aba` em `/turmas/[turma]` (`ficha | avaliacoes`,
`historico: empilha`, como `AbasDoCurso`). Os **cards** (CH, progresso, AEC/TAD/TR, avaliações) ficam
**acima** das abas, sempre visíveis; a aba *Ficha* é o conteúdo de hoje; a aba *Avaliações* é a nova
(FR-058). A aba *Avaliações* do **curso** entra em `AbasDoCurso` como terceira (FR-053) — a Q-02 da
spec 009 ("exatamente duas") vence porque o Épico 8 chegou, e o registro de 25/09 fica no cabeçalho.

## R-13. Transcrição das avaliações dos 24 currículos — extração versionada, migration de dado

**Decisão:** `scripts/etl/extrair_avaliacoes_curriculo.py` lê os PDFs (fora do git) e grava
`scripts/etl/dados/avaliacoes_curriculo.csv` (uma linha por item: curso, disciplina, ordem,
instrumento, UE computada, UEs abordadas, TA de aplicação, TA de vista, arquivo, página) e
`limites_curriculo.csv`. **Revisão humana no CSV** antes da migration (como `pareamento_ue.csv`), e
a migration de dado é **gerada** do CSV, como `20260926024246` foi. A contagem oficial (M-7 marca
≈) é a do CSV revisado. O EST-QF-APOC é transcrito de imagem por dois leitores (P-4), como as 5 UEs.

## R-14. A sincronização — o que passa a gravar e o que nunca mais altera

| O que | Hoje (`resolver.py`) | Passa a |
|---|---|---|
| FR, LA, LP, NT, RECESSO, PONTO FACULTATIVO | global dia inteiro → `feriados`; só da turma → **TAD** "Administração" (L539–557) | global dia inteiro → `feriados`; só da turma, ou global parte do dia → **`dias_parados`** (FR-025.5). Linhas TAD já gravadas por isso → inativadas com marca e regravadas como dia parado |
| MONITORIA, PORTUGUÊS, BDA, BDF | TAD (L63) / outros | **Apoio_Individualizado** (FR-022) |
| RECEPÇÃO | TAD | TAD (fica) |
| APOINST | AEC | AEC (fica) |
| prova e vista | `avaliacoes` sem item | `avaliacoes.avaliacao_curriculo_id` casado por **instrumento + número dentro da disciplina**; não casou → sem item + erro de planilha (FR-036/036.1) |
| 2ª sessão de vista | AEC `vista_extra_como_aec` (L511–514) | sessão 2 em `vistas_de_avaliacao` (FR-042) |
| "(FISCAL)" | troca aplicador | `fiscal_id` (FR-045) |
| "A / B" | 2º nome em `observacoes` | `outros_instrutores` (FR-046) |
| CH de disciplina, UE, avaliação | nunca alterou | **nunca altera** — guarda: impressão digital do catálogo antes e depois da rodada, no `verificar.py` (SC-008) |
| tempo de prova/vista onde o currículo é **mudo** | — | `avaliacoes_curriculo_turma` com `origem = 'sugestao_planilha'`, **só** se o item não tem tempo do currículo e não há arbitrado confirmado (FR-031.8) |
| erros de planilha | — | `erros-de-planilha.md` na pasta da rodada (fora do git), por turma, com os dois valores (FR-036.1) |

## R-15. Rito do remoto, por migration — o que já é padrão, dito uma vez

Toda migration deste plan segue: backup `python -m scripts.manutencao.dado_do_remoto
--somente-copia` com o arquivo datado citado · `supabase db push --linked --dry-run` listando **só**
ela · `db push` · conferência só de leitura (contagem de migrations dos dois lados, impressão
digital do esquema `scripts/provas/impressao_digital_do_esquema.sql`, e as contagens de dado que a
própria migration declara) · Production respondendo. Migration de **dado** acrescenta: o relatório
**antes/depois** (as contagens nomeadas na própria migration), mostrado a Bernardo **antes** do
`db push`, e a reversão escrita como SQL em `reversao-<nome>.sql` ao lado da spec, provada numa base
descartável com a impressão digital voltando (T010/T011 da spec 010 como modelo).
