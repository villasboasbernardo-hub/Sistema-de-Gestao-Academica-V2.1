# Tasks: Detalhe Semanal de Aula (DSA)

**Feature**: `specs/013-detalhe-semanal-de-aula` · **Branch**: `feat/EPICO-6-detalhe-semanal-de-aula`

**Input**: [spec.md](./spec.md) (18 respostas) · [plan.md](./plan.md) (D-1 a D-11) ·
[research.md](./research.md) · [data-model.md](./data-model.md) · [quickstart.md](./quickstart.md) ·
[contracts/](./contracts/)

> **Agrupadas por PR**, na ordem **PR 0 → PR B → PR 1 → PR 2 → (relógio, de Bernardo) → PR 3 → PR 4 →
> PR 5**. Cada PR termina com **a sua prova do quickstart** como última tarefa. O **PR 6** (ALT, DSA
> de reposição) está **fora** deste plano.
>
> `[P]` = paralelizável (arquivo próprio, sem dependência de tarefa incompleta).

---

## PR 0 — o domínio puro, antes de qualquer componente

**Meta**: toda regra de cálculo do DSA existe como função pura, testada, **antes** de haver tela.
**Independente**: sim — nada depende de banco nem de componente.

- [ ] T001 Criar `lib/dominio/dsa/` e `lib/dominio/dsa/bloco.ts` com o tipo `Bloco` e `blocoValido()`, conforme `contracts/lancamento.md` §"O que o Épico 12 recebe"; cabeçalho citando o contrato do Épico 12 (`FR-040`)
- [ ] T002 [P] Escrever `tests/unidade/dsa/relogio-real.ts` com as grades **G45** e **G50** inteiras (18 TA nomeados) e as **cinco** configurações do catálogo (40 TA, valores de `horarios_tempos_aula`) como fixtures compartilhadas
- [ ] T003 Implementar `lib/dominio/dsa/horario-do-bloco.ts` — relógio de cada TA a partir do regime (`RF-HOR-04/06`, `RN-CONF-02`), com a **manhã derivada** pelo limite de 12:00, e `trechosDoBloco(taInicial, tempos)` devolvendo **1 ou 2** trechos
- [ ] T004 [P] `tests/unidade/dsa/horario-do-bloco.test.ts` — G45 e G50 inteiras; as 5 configurações; o bloco de 4 TA no 3º tempo da G45 → `["09:30–11:55", "13:05–13:50"]` (`SC-011`); **sem arredondamento de minuto** (`R-2`)
- [ ] T005 [P] `tests/unidade/dsa/horario-do-bloco.test.ts` — o caso do **Estudo Individual** além de `regime_tempos`: C-Espc-HN com 7 TA → **15:50–16:40** e com 8 TA → **16:45–17:35**, os dois **exatos** contra a planilha (`plan.md` §7.3)
- [ ] T006 Implementar `lib/dominio/dsa/posicao-herdada.ts` — `semPosicao` quando `origem = 'avaliacao'` **e** `herdado` **e** `ta_inicial = 1`, com as **três** condições (`Q-12`)
- [ ] T007 [P] `tests/unidade/dsa/posicao-herdada.test.ts` — avaliação migrada nunca editada no TA 1 → **sem posição**; avaliação **nova** no TA 1 → **posicionada**; migrada **editada** → posicionada (`SC-017`)
- [ ] T008 Implementar `lib/dominio/dsa/capacidade.ts` — TA da semana descontando feriado `dia_inteiro` e **não** descontando `parcial`/`informativo` (`RN-EVT-02`)
- [ ] T009 [P] `tests/unidade/dsa/capacidade.test.ts` — os três impactos (critério **6**)
- [ ] T010 Implementar `lib/dominio/dsa/grade.ts` — matriz `dia × TA` a partir dos fatos, faixa **"Sem posição"** por dia, dia bloqueado por feriado, coluna de **sábado** quando aberta, e `estado: "sem_relogio"` quando o regime falta (`RF-DSA-03`, `RN-DEG-01`)
- [ ] T011 [P] `tests/unidade/dsa/grade.test.ts` — lançamento sem `ta_inicial` na faixa; feriado bloqueando; sábado com os TA de `config_parametros`; sem regime → TA numerados sem relógio
- [ ] T012 Implementar `lib/dominio/dsa/conflitos.ts` — `detectarConflitos(meus, alheios)` conforme `contracts/conflito.md`: sobreposição **e** (mesmo instrutor/fiscal → conflito; mesma sala → alerta secundário), em memória (`RN-CONF-01`)
- [ ] T013 [P] `tests/unidade/dsa/conflitos.test.ts` — turmas diferentes, mesmo instrutor, TA sobrepostos → conflito; mesma sala → secundário; **TA adjacentes → nada**; fiscal externo (sem `id`) **não** participa
- [ ] T014 Implementar `lib/dominio/dsa/tetos.ts` — TFM **6 rígido**, fim de curso (`LHFC`/"fim de curso") **sem teto**, demais **25 recomendado**, TA excepcional e CH de UE excedida como **alerta** (`RN-DIST-03`, `RF-HOR-03.1`, `RN-DEG-02`); os números vêm por parâmetro, **nunca** literais
- [ ] T015 [P] `tests/unidade/dsa/tetos.test.ts` — TFM 7 TA → **bloqueia**; LHFC 40 → nada; outra 26 → alerta; 9º TA → alerta
- [ ] T016 Implementar `lib/dominio/distribuicao-semanal.ts` — a função **única** de distribuição da CH pela janela da disciplina (`RN-DIST-01`), **fora** de `dsa/`, com o `RN-` e a citação literal no topo
- [ ] T017 [P] `tests/unidade/dsa/distribuicao-semanal.test.ts` — janela curta, janela longa, CH indivisível, janela de uma semana
- [ ] T018 Criar a guarda `tests/unidade/distribuicao-unica.test.ts` — ponto único da distribuição, no molde de `andamento-unico.test.ts`, lendo **código sem comentário** (regra 9.1.1) e com **controle positivo**
- [ ] T019 Criar a guarda `tests/unidade/horario-unico.test.ts` — relógio de TA calculado só em `horario-do-bloco.ts`, com controle positivo
- [ ] T020 Implementar `lib/dominio/dsa/situacao.ts` — situação por disciplina (**Aguardando Início · Em andamento · Concluída · Conflitou**) e CH **acumulada até a semana**, e o por-UE (prevista/lançada/restante) (`RF-DSA-05`, `RN-CRONOS-03`)
- [ ] T021 [P] `tests/unidade/dsa/situacao.test.ts` — semana 20 → acumulado **até a 20**, não o total; disciplina sem lançamento → Aguardando; lançamento futuro **conta** e vem marcado `lancadoAFrente` (`Q-2`)
- [ ] T022 Implementar `lib/dominio/dsa/assinaturas.ts` — resolução por papel: linha **do curso** vigente na data → **GERAL** (`curso_id` nulo) → `null`; `exibir_no_dsa = false` exclui; modo `dinamico_usuario_logado` devolve o marcador para a rota resolver (`Q-14`, `FR-036.1`)
- [ ] T023 [P] `tests/unidade/dsa/assinaturas.test.ts` — curso vence GERAL; duas vigências → a da data; sem vigente → `null`; `exibir_no_dsa = false` → fora
- [ ] T024 Implementar `lib/dominio/dsa/numero-do-dsa.ts` — Nº = semanas ISO **com lançamento** desde `turma.data_inicio`; semana sem aula **não** consome número; sem `data_inicio` → `null` (`Q-3`, D-7)
- [ ] T025 [P] `tests/unidade/dsa/numero-do-dsa.test.ts` — semana vazia no meio **não** incrementa; turma sem início → `null`
- [ ] T026 Implementar `lib/dominio/dsa/pre-preenchimento.ts` — a cascata **UE da turma → disciplina da turma → vazio com motivo** (`FR-014`), puro, recebendo as linhas já lidas
- [ ] T027 [P] `tests/unidade/dsa/pre-preenchimento.test.ts` — com linha por UE; só com a de disciplina; com **nenhuma** → motivo escrito (medido: `turma_disciplina_unidade` tem **0** linhas hoje)
- [ ] T028 **Prova do PR 0** — rodar o quadro do `quickstart.md` §"PR 0" inteiro, com **DOIS** defeitos deliberados, cada um pego pela guarda certa: (1) copiar `distribuicao-semanal` para `dsa/` → `distribuicao-unica.test.ts` reprova nomeando o arquivo; (2) ⚠️ **`import { createClient } from "@supabase/supabase-js"` dentro de `lib/dominio/dsa/grade.ts` → `pnpm lint` reprova pela FRONTEIRA 1**, provando que o ESLint alcança a **primeira subpasta** de `lib/dominio/` (`SC-018`, Princípio II). Desfazer os dois e `pnpm verificar` sair **0**

---

## PR B — a migration única, com o rito do remoto

**Meta**: o banco muda **uma vez**, e tudo o que as telas vão ler já está no lugar.
**Depende de**: T001 (o tipo `Bloco`, que a função de conflito espelha).

- [ ] T029 `supabase migration new dsa_lancamento_sem_ue_e_conflito` e escrever o **cabeçalho**: data local, origem (`Q-1`, `Q-8`, `Q-17`, `V-5`, `V-7`, `Q-10`, `Q-4`) e o **plano de reversão antes do `up`**
- [ ] T030 `registros_aula.disciplina_id uuid` nulável + FK composta `(disciplina_id, curso_id)` + `comment on column`, conforme `data-model.md` §3.1
- [ ] T031 `app.disciplina_sem_ue(uuid)` `STABLE` — `sem_unidades_ensino` **ou** `curriculo_modelo = 'competencias'`; `revoke` de `public`/`anon`, `grant execute` a `authenticated` e `service_role` (§3.2). ⚠️ **Ela pode devolver `NULL`** quando a linha não é visível, e quem trata isso é o `CHECK` — ver `T032`
- [ ] T032 Os três `CHECK` de `registros_aula`: a catraca com a **isenção nominal**, `reg_aula_ue_ou_disciplina` (tópico obrigatório sem UE) e `reg_aula_ue_xor_disciplina` (§3.3). ⚠️ **COM `coalesce(app.disciplina_sem_ue(disciplina_id), false)` nos dois primeiros** — `CHECK` **passa** em `NULL`, então a forma sem `coalesce` **falha ABERTO**, que é a classe do gotcha 15 (`H3`)
- [ ] T033 [P] `CHECK ativ_estudo_individual_de_turma` — o que a `RF-EXTRA-02` afirma e **não existia** (`V-5`, §3.4)
- [ ] T034 [P] `atividades_nao_letivas.responsavel_externo` + `instrutor_id` + `CHECK` de exclusividade (`Q-8`, §3.5)
- [ ] T035 Recriar `vw_ocupacao_ta`: `LEFT JOIN` na UE, `coalesce` da disciplina, **sem** `turma_id is not null` no ramo de atividade (`V-7`), colunas `local`, `fiscal_id`, `herdado`, e **`with (security_invoker = true)` REPETIDO** (§3.6) — ⚠️ gotcha 10
- [ ] T036 Recriar `vw_disciplinas_execucao` com `LEFT JOIN` + `coalesce` e o **`security_invoker` repetido** (§3.7)
- [ ] T037 [P] `revoke delete, truncate` nas duas views recriadas — a lição do Épico 1: *"view nova nasce com DELETE para `authenticated`"*
- [ ] T038 `public.conflitos_da_semana(uuid, date, date)` `SECURITY DEFINER` com o porteiro **na forma que falha fechado** (`coalesce(…, false) is not true`, gotcha 15), devolvendo **só** o fato, conforme `contracts/conflito.md` (§3.8)
- [ ] T039 [P] Semear `config_parametros`: `dsa.teto_tfm_semana` = 6, `dsa.teto_recomendado_semana` = 25, `dsa.sabado_tempos` = 5, com norma de origem; idempotente (§3.9)
- [ ] T040 [P] ⚠️ **SEM LISTA NOVA — a sigla vai para a lista QUE JÁ EXISTE** (`H1` do analyze; medido no remoto em 05/10/2026: `config_listas.metodologias` tem **16** linhas e **nenhuma** sigla, e eu havia medido o banco **local**, que é resto de suíte). Em `metodologias`: `UPDATE` de `metadados.sigla` em **três** — `EO` em *Exposição Oral*, `AP` em *Aula Prática*, `PP` em *Prova Prática* — e **`INSERT` idempotente de SEIS**: *Prova Mista* (`PM`), *Prova Objetiva* (`PO`), *Observação de Desempenho* (`OD`), *Trabalho Individual* (`TI`), *Trabalho em Grupo* (`TG`), *Estudo Individual* (`EI`). ⚠️ **`PE` fica de fora** e **as outras 13 ficam SEM sigla**, imprimindo por extenso (`RN-DEG-01`) — decisão de Bernardo (§3.9)
- [ ] T040.1 [P] **A categoria normativa de cada subtipo**, na lista `tipos_atividade` que já existe (13 linhas, medida) — `UPDATE` de `metadados.categoria`: **AEC** em *Palestra, Atividade Extracurricular, Orientação de TFM*; **TAD** em *Evento/Cerimônia, Administração*; **TR** em *Tempo Reserva, Recuperação da Aprendizagem*. E `INSERT` idempotente das que faltam: *Visita Técnica* (**AEC**), *Estudo Individual* e *Monitoria* (**Estudo_Individual**). ⚠️ **`Licença de Pagamento` fica SEM categoria e não aparece no DSA** — ela vem do calendário (`Q-16`); e *Aula, Aula Teórica, Aula Prática, Avaliação, Vista de Prova* **não** recebem categoria não letiva, porque são aula. É o que faz o seletor de subtipo do `T071` filtrar por categoria em vez de oferecer a lista inteira (`FR-020`, `H2`)
- [ ] T041 `pnpm db:reset:limpo && pnpm db:tipos` — regenerar `lib/tipos/database.ts` (o CI reprova se divergir)
- [ ] T042 `supabase/tests/116_dsa.sql` — uma asserção **nomeada** por regra nova: coluna e FK; aula sem UE **e** sem disciplina → recusada; sem UE em curso `unidades_de_ensino` → **recusada**; em `competencias` com tópico → aceita; `CHECK` do EI; as duas views com `security_invoker=true`; **o porteiro sem sessão levanta `42501`**; ⚠️ **o `CHECK` recusa `disciplina_id` INEXISTENTE** — o caso que prova o `coalesce` do `H3`, e que a forma sem ele deixaria passar; e as **siglas** e **categorias** de `T040`/`T040.1` conferidas por contagem (9 com sigla, 10 com categoria)
- [ ] T043 `tests/invariantes/rls/dsa.test.ts` — negativo por perfil: os **cinco** de leitura tentam **lançar, mover e excluir** nas três tabelas → `42501`, com o valor no banco conferido **antes e depois** (`SC-016`); controle positivo com o Admin
- [ ] T044 `tests/invariantes/rls/dsa.test.ts` — o caso do **Operador de escopo recortado**: `conflitos_da_semana` devolve a ocupação alheia **sem `turma_id`** **e** o `select` direto na turma alheia devolve **0 linhas**, no **mesmo** caso
- [ ] T045 **O caso que discrimina (DoD 8)** — com a função **inerte**, o caso T044 **reprova** (*"não viu o conflito"*); com ela, passa. Medido **nessa ordem**, e o resultado registrado
- [ ] T046 **Prova de reversão (DoD 6)** — numa base descartável: `pg_dump` → `up` → `down` → `pg_dump`, `diff` **vazio**, ⚠️ **inclusive nas `reloptions` das duas views**
- [ ] T047 Escrever `specs/013-detalhe-semanal-de-aula/plano-de-aplicacao-no-remoto.md` com os seis passos do `plan.md` §3 e os campos a preencher na execução
- [ ] T048 **Prova do PR B** — `pnpm verificar:tudo` **0**, CI verde nos três blocos, e o quadro do `quickstart.md` §"PR B" inteiro. ⛔ **PARAR AQUI**: a aplicação no remoto exige a autorização de Bernardo e o backup citado

---

## PR 1 — ver a semana

**Meta**: qualquer perfil com leitura abre a semana da turma e navega por ela.
**Depende de**: PR 0 (todo o domínio) e **PR B** (a view já com `LEFT`, global e `herdado`).

- [ ] T049 Acrescentar `"/turmas/[turma]/dsa"` ao `CONTRATO` de `lib/navegacao/contrato.ts` com `semana`, `ano` e `sabado`, conforme `contracts/parametros-dsa.md`
- [ ] T050 [P] `tests/unidade/contrato-de-parametros.test.ts` — os três parâmetros, tipos, padrões e política de histórico; parâmetro fora do contrato **não compila**
- [ ] T051 `components/ciaara/grade-alocacao.tsx` — o primitivo denso: matriz `linha × coluna`, cabeçalhos fixos, **rolagem horizontal própria**, navegação bidimensional por teclado reaproveitando `proximaPosicao`/`ListaNavegavel`, tokens do tema, **sem `"use client"`**, **sem** regra `RN-` dentro (doc 23 §3.2/§3.3)
- [ ] T052 [P] Acrescentar `GradeAlocacao` à vitrine `/estilo` — exigência de alcançabilidade de `components/ciaara/` (`fronteira-componentes.test.ts`)
- [ ] T053 `components/ciaara/grade-dsa.tsx` — composição sobre `GradeAlocacao`: colunas = dias (5 ou 6), linhas = TA do regime + o excepcional, blocos com `rowSpan`, intervalos e almoço como linhas finas, faixa **"Sem posição"** ao pé de cada dia. ⚠️ **E a SALA no cabeçalho**: `turmas.sala_alocada` aparece **uma vez** no cabeçalho da semana, e **só o bloco cujo `local` difere dela** é destacado — é o `RF-DSA-03` literal (`FR-006`), e é o oposto do papel, que traz LOCAL **por linha**
- [ ] T054 `app/(app)/turmas/[turma]/dsa/consulta.ts` — **uma** rodada de `Promise.all`: `vw_ocupacao_ta` da semana · os **três** `select … where ta_inicial is null` da faixa · `app.fn_regime_vigente` (`padrao` e `excecao`) · feriados do intervalo · a turma · `turma_disciplina`. ⚠️ **Nenhum `await` em laço**
- [ ] T055 `app/(app)/turmas/[turma]/dsa/page.tsx` — Server Component montando a `Semana` pelo domínio e passando ao `GradeDsa`; turma pelo código via `endereco-de-turma.ts`
- [ ] T056 [P] `loading.tsx` e `error.tsx` do segmento (`RN-DEG-01`, `error.tsx` + `loading.tsx` por segmento)
- [ ] T057 `NavegacaoDaSemana.tsx` — folha de cliente: anterior/próxima/hoje escrevendo a URL, com a virada do ano; **declarar** em `fronteira-das-telas.test.ts` com o motivo
- [ ] T058 Degradação: curso **sem regime** → grade com TA numerados sem relógio e aviso com link para *Editar curso → Registrar nova vigência*; **EAD puro** → a frase da `Q-13`, sem grade
- [ ] T059 Os **três caminhos clicáveis**: botão **"Abrir o DSA"** no cabeçalho da ficha da turma, ação de linha **"DSA"** em `/turmas`, e o link **"DSA da semana"** no bloco da turma do `/inicio` (`FR-011`)
- [ ] T060 [P] `tests/unidade/toda-tela-tem-caminho.test.ts` — cobrar o `href` de `/turmas/[turma]/dsa` em outro arquivo
- [ ] T061 `tests/e2e/dsa-de-teste.ts` — semente para a semana: turma com regime, uma com vigência mudada no meio, feriados dos três impactos, uma turma com os lançamentos sem TA e uma avaliação **herdada** no TA 1; **idempotente**, provada rodando **duas vezes seguidas** (regra 9.1)
- [ ] T062 **Prova do PR 1** — `tests/e2e/dsa-ver.spec.ts` cobrindo o quadro do `quickstart.md` §"PR 1" inteiro, **chegando por clique**, e `pnpm verificar:tudo` **0**

---

## PR 2 — lançar

**Meta**: o operador lança a semana com **no máximo quatro decisões**.
**Depende de**: PR 1 (a grade, para escolher onde) e PR B (as colunas e os `CHECK`).

- [ ] T063 `lib/validacao/dsa.ts` — `esquemaDoBloco` como união discriminada (aula com/sem UE, avaliação, vista, atividade), conforme `contracts/lancamento.md`; **o mesmo** esquema no formulário e na ação
- [ ] T064 [P] `tests/unidade/dsa/validacao.test.ts` — os quatro tipos; XOR UE/disciplina; sem UE **exige** tópico; fiscal interno XOR externo; faixa `1..12`
- [ ] T065 `lib/acoes/dsa.ts` — `lancar(bloco)`: `safeParse` na **primeira linha**, `id` gerado **antes**, `insert` **sem `RETURNING`** (gotcha 4.1), `revalidatePath` das três rotas
- [ ] T065.1 ⚠️ **O porteiro de habilitação, que não existia em tarefa nenhuma** — `lancar`, `editar` e `mover` leem `instrutor_disciplina` da dupla (instrutor, disciplina) e chamam **`podeAtuar()`** de `lib/dominio/habilitacao.ts`, que já existe e tinha **zero consumidores** (medido em 05/10/2026); a recusa é `dsa_instrutor_nao_habilitado`, com frase em `traducao-de-recusas.ts` nomeando a habilitação que falta. ⚠️ **Medido: o banco NÃO recusa** — não há FK para `instrutor_disciplina` nem gatilho em `registros_aula`/`avaliacoes`, então **a Server Action é a única defesa** (`FR-017`, `RN-INST-01`, *Risco: Alto*). A `EXIGE_HABILITACAO` do módulo já distingue `ministrar`/`responsavel` de `avaliacao`/`vista_de_prova` (`RN-INST-01` delimitada)
- [ ] T065.2 O **teste negativo** de `T065.1`, **pelo valor no banco**: instrutor sem linha em `instrutor_disciplina` para aquela disciplina → `lancar` recusa, e o `select` depois mostra que **nada** foi gravado; controle positivo com o instrutor habilitado; e o caso da **avaliação**, que a `RN-INST-01` **não** cobra habilitação
- [ ] T066 Acrescentar a `lib/acoes/traducao-de-recusas.ts` as frases das chaves novas da tabela de `contracts/lancamento.md` (`reg_aula_ue_ou_disciplina`, `reg_aula_ue_xor_disciplina`, `vigencia_reinterpretaria_lancamento`, `curso_em_oferta`, `sem_alcance`…)
- [ ] T067 [P] Estender a varredura que cobra frase para **toda chave de recusa** emitida pelas migrations (a guarda que nasceu no PR 3 da spec 010), para incluir as novas
- [ ] T068 `FormularioDeLancamento.tsx` — folha de cliente: abre na célula clicada; **quatro** decisões; pré-preenchimento pela cascata de T026; `SeletorInstrutor` **único** (antiguidade, inativo fora); troca de instrutor/técnica/local **naquele** lançamento; **declarar** em `fronteira-das-telas.test.ts`
- [ ] T068.1 A **lista de UE com os três números** — cada UE do seletor mostra **CH prevista, lançada e restante**, de `vw_unidades_ensino_execucao` daquela turma, lido em `consulta.ts` junto com o resto (`FR-018`; é o grão de UE que o `P-3` da planilha já dá ao operador)
- [ ] T069 O modo **sem UE** no formulário — oferecido **só** quando `disciplina_sem_ue()` é verdadeiro (`D-10`), com o **tópico obrigatório**
- [ ] T070 Avaliação e vista no mesmo formulário: tipo, disciplina, responsável, **fiscal interno ou nome externo**, vista com data e TA próprios; e a avaliação **já agendada sem TA** listada na semana com a ação de **posicioná-la** (`FR-019`, `H3`)
- [ ] T071 Atividade não letiva: categoria do ENUM, subtipo da lista, **responsável externo ou instrutor** (`Q-8`); **nenhuma** sigla de duas letras como entrada
- [ ] T072 `lancarEstudoIndividualDaSemana` — um lançamento por dia útil sem feriado `dia_inteiro` e sem EI, no slot **seguinte ao último TA lançado naquele dia** (`D-4`), em transação, **idempotente**
- [ ] T073 Os **alertas** no gravar: `tetos.ts` no servidor, `avisos[]` na resposta, `AlertaConformidade` na tela; **só** o TFM recusa (`FR-024`, `FR-025`)
- [ ] T074 **Prova do PR 2** — `tests/e2e/dsa-lancar.spec.ts` cobrindo o quadro do `quickstart.md` §"PR 2" inteiro, incluindo a **contagem dos campos tocados** (`SC-009`) e os **45 TA** de uma semana do C-Ap-HN (`SC-010`), e `pnpm verificar:tudo` **0**

---

## ⛔ A correção do relógio — é sua, entre o PR 2 e o PR 3

**Meta**: as 10 linhas de vigência com o relógio real, gravadas **por Bernardo**, pela tela.
**Por que aqui**: o PR 3 confere a impressão contra o PDF assinado; com o catálogo de hoje,
compararia o documento certo com o relógio errado em **quatro** eixos.

- [ ] T075 **[BERNARDO]** Registrar as **10** vigências de `plan.md` §7.2 pela tela *Editar curso → Registrar nova vigência* — cinco `padrao` e cinco `excecao`, com `vigente_de` ≥ ao piso de cada curso. ⚠️ **C-Esp-ME e os outros 18 ficam intocados**
- [ ] T076 Conferir **só por leitura** (`supabase db query --linked`) as 10 linhas gravadas: `hora_inicio_manha`, `hora_inicio_tarde`, os dois intervalos, `ta_duracao_min`, `regime_tempos`, **`configuracao_horario_id` nulo** e `vigente_de`; e que **nenhuma** linha anterior foi alterada
- [ ] T077 Conferir que `app.fn_regime_vigente` devolve **a vigência nova** para uma data posterior ao `vigente_de` e **a antiga** para uma anterior — a `RN-2027-09` em funcionamento, medida nos dois sentidos

---

## PR 3 — imprimir

**Meta**: uma página A4 paisagem com paridade contra o documento assinado.
**Depende de**: PR 2 (ter o que imprimir) e T076 (o relógio conferido).

- [ ] T078 `app/print/dsa/page.tsx` — Server Component **fora** de `(app)`: sem casca; herda `?turma=&semana=&ano=&sabado=` **sem tradução**; `not-found` sem `turma`
- [ ] T079 `app/print/dsa/impressao.css` — `@page { size: A4 landscape; margin: 10mm }` e `@media print`; ⚠️ é o **primeiro** `@media print` do repositório, e nasce num arquivo só
- [ ] T080 O cabeçalho e as oito colunas conforme `contracts/impressao.md`, com **LOCAL por linha** e o bloco que atravessa o almoço em **duas** linhas de HORÁRIO
- [ ] T081 [P] A linha fixa **`ESTUDO INDIVIDUAL · EI`** por dia, sem instrutor; e o dia de feriado como **uma linha** com a descrição (`Q-16`)
- [ ] T082 O rodapé: `Gerado em` (`instanteComHoraParaLeitura`), a nota do EI, `<n> ALUNOS`, a tabela de CH **só das disciplinas da semana** e a legenda de T/E **só das siglas usadas** (`SC-014`); **sem** `ALT`
- [ ] T082.1 [P] A linha **`OBSERVAÇÕES:`** em branco no rodapé — ⚠️ é o campo que o `RF-DSA-06` e o `RF-PDF-01` exigem **literalmente** e que **nenhum** dos PDFs medidos tem. Decisão de Bernardo (`H8`, opção **a**): a linha sai **em branco, para escrever à mão**, o que satisfaz o requisito **[PRESERVADO]** sem inventar conteúdo e sem contrariar o documento assinado
- [ ] T083 As **duas assinaturas** por `assinaturas.ts`, com o modo `dinamico_usuario_logado` resolvido pela sessão da rota; sem vigente → **linha em branco** (`FR-036`, `FR-036.1`)
- [ ] T084 [P] O nome do instrutor pelo `NomeInstrutor` **único**, e `(FISCAL)` em avaliação (`RF-INSTR-15`, `FR-038`)
- [ ] T085 O botão **Imprimir** na grade, levando os mesmos parâmetros; e os **avisos de dado faltante na TELA, antes** de imprimir (`FR-039`)
- [ ] T086 [P] Semear, no `dsa-de-teste.ts`, uma **segunda vigência de responsável** para o critério **3** — ⚠️ medido: há **uma só** vigência por papel no remoto, então sem semear o critério não é demonstrável (`SC-003`)
- [ ] T086.1 ⚠️ **A jornada do critério 8, que não existia**: `tests/e2e/dsa-jornada.spec.ts` cobre **lançar → visualizar → imprimir** num **único** percurso, **chegando por clique** — ficha da turma → *Abrir o DSA* → lança um bloco → vê na grade → *Imprimir* → o PDF de **uma** página. Os três `spec.ts` separados (`T062`, `T074`, `T087`) provam as partes; **só este prova a jornada** (`SC-008`, critério **8** do documento 06)
- [ ] T087 **Prova do PR 3** — `tests/e2e/dsa-imprimir.spec.ts` cobrindo o quadro do `quickstart.md` §"PR 3", incluindo **`page.pdf` com contagem de páginas = 1** (`SC-001`) e a varredura de cadeias técnicas (`SC-013`), e `pnpm verificar:tudo` **0**

---

## PR 4 — editar, mover, excluir · conflitos e alertas

**Meta**: a semana muda sem excluir e recriar, e o conflito aparece sem vazar o DSA alheio.
**Depende de**: PR 2 (as ações) e PR B (a função de conflito).

- [ ] T088 `mover(fatoId, origem, destino)` — `UPDATE` do **mesmo** registro, `id` e `criado_por` intactos, `editado_*` carimbados; **TFM recusa também no mover** (`FR-030`, `FR-024`); e o **porteiro de habilitação de `T065.1`** vale aqui (mover não troca o instrutor, mas editar+mover compartilham o caminho)
- [ ] T089 `editar(fatoId, origem, bloco)` — sem tocar catálogo (`SC-012`); o **porteiro de habilitação de `T065.1`** na troca de instrutor; e **mover/editar linha histórica sem UE** em curso que exige UE **pede a UE no mesmo ato** (`Q-1`, segunda metade)
- [ ] T090 `excluir(fatoId, origem)` — `status = 'inativo'` / `'cancelada'`, com `DialogoConfirmacao` descrevendo o efeito (`RNF-USA-03`); **zero** `DELETE`
- [ ] T091 `ArrastarBloco.tsx` — folha de cliente: DnD **nativo** (`draggable`/`dragstart`/`drop`) **e** a alternativa por **teclado/menu como caminho primário** (`Enter` → *Mover para…*); **declarar** em `fronteira-das-telas.test.ts`
- [ ] T092 Posicionar o que está na faixa **"Sem posição"** — é o mesmo `mover` (`Q-12`, segunda metade)
- [ ] T093 A página chama `conflitos_da_semana` e passa o resultado a `conflitos.ts`; `GradeAlocacao` **pinta** com o número no atributo, **nunca só na cor**
- [ ] T094 [P] A frase de **curso fora de oferta** nas três ações — a policy recusa e a tela explica em português, não com o `42501` cru (`FR-032`)
- [ ] T095 **Prova do PR 4** — `tests/e2e/dsa-mover.spec.ts` e `dsa-conflito.spec.ts` cobrindo o quadro do `quickstart.md` §"PR 4", incluindo **mover só pelo teclado** e a auditoria preservada (critério **7**), e `pnpm verificar:tudo` **0**

---

## PR 5 — situação e quadro de CH

**Meta**: o operador vê se a turma está no rumo.
**Depende de**: PR 0 (`situacao.ts`, `distribuicao-semanal.ts`) e PR 2 (haver lançamento).

- [ ] T096 O painel de situação ao lado da grade — por disciplina, com a CH **acumulada até a semana selecionada** (`RF-DSA-05`, `RN-CRONOS-03`)
- [ ] T097 [P] O quadro por **UE** — prevista, lançada, restante, de `vw_unidades_ensino_execucao`
- [ ] T098 A marca **lançado à frente** na grade, no quadro e no rodapé impresso — **sem** corte por data no cálculo (`Q-2`, `FR-028.1`)
- [ ] T099 [P] Conferir, por medição, que `chd_executada` da ficha da turma e as turmas em atraso do `/inicio` **continuam com os mesmos valores** de antes desta fatia — a promessa da `Q-2`
- [ ] T100 **Prova do PR 5** — o quadro do `quickstart.md` §"PR 5", e `pnpm verificar:tudo` **0** com o CI verde nos três blocos

---

## Dependências entre os PRs

```text
PR 0 ──┬──────────────► PR B ──► PR 1 ──► PR 2 ──► [T075 relógio, Bernardo] ──► PR 3
       │                                     │
       └─────────────────────────────────────┴──► PR 4
                                             └──► PR 5
```

- **PR B depende do PR 0** só por T001 (o tipo `Bloco`); o resto do PR 0 é paralelo a ele.
- **PR 1 depende do PR B** porque lê `vw_ocupacao_ta` já com `LEFT`, global e `herdado`.
- **PR 3 depende de T076**, não só do PR 2.
- **PR 4 e PR 5** dependem do PR 2 e são **paralelos entre si**.

## Paralelismo dentro de cada PR

- **PR 0**: T002, T004, T005, T007, T009, T011, T013, T015, T017, T021, T023, T025, T027 — todos de teste, arquivo próprio.
- **PR B**: T033, T034, T037, T039, T040, **T040.1** — objetos independentes na mesma migration.
- **PR 1**: T050, T052, T056, T060.
- **PR 2**: T064, T067.
- **PR 3**: T081, **T082.1**, T084, T086.
- **PR 4**: T094. **PR 5**: T097, T099.

## O que NÃO está aqui

**PR 6** (número registrado, `ALT`, DSA de Reposição) · a correção dos documentos (`V-1` a `V-8`,
menos o comportamento de `V-5` e `V-7`) · qualquer escrita minha no remoto · biblioteca nova · as
dúvidas **D-1**, **D-3**, **D-5**, **D-6**, **D-7**, **D-9**, **D-10** e **D-11**, que seguem na
recomendação adotada e **não** bloqueiam tarefa nenhuma.

⚠️ **E uma pendência nomeada pelo analyze, em backlog por decisão de Bernardo:** a **FK composta de
habilitação** que o documento 04 declara para a `RN-INST-01` (`instrutor_disciplina`) e que **não
existe no banco** — medido. Enquanto ela não existir, quem recusa é a Server Action (`T065.1`), e
escrevê-la exige medir antes: **173** das 1.566 aulas históricas estão sem `instrutor_id`, e os pares
(instrutor, disciplina) do histórico não foram conferidos contra `instrutor_disciplina`.
