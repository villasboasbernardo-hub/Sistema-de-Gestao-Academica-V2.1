---
description: "Lista de tarefas — Épico 5, fatia (c): cadastro de instrutores"
---

# Tarefas: Épico 5, fatia (c) — cadastro de instrutores

**Entrada**: [spec.md](./spec.md) · [plan.md](./plan.md) · [research.md](./research.md) ·
[data-model.md](./data-model.md) · [contracts/](./contracts/) · [quickstart.md](./quickstart.md)

**Formato**: `[ID] [P?] [História] Descrição com o caminho do arquivo (origem)`
· **[P]** = pode ir em paralelo (arquivo diferente, sem dependência pendente)
· **👤** = decisão ou autorização de Bernardo; a tarefa **bloqueia** o que depende dela

**Rastreabilidade**: toda tarefa cita, entre parênteses, o `FR-`, `RN-`, `SC-` ou achado de origem.

**Testes**: **incluídos**, e não por opção. A *Definition of Done* exige Vitest em toda função de
`lib/dominio/` tocada, pgTAP com asserção **nomeada** por `RN-` de *Risco: Alto*, teste negativo de
RLS por perfil e Playwright no percurso principal. **Em cada história, o teste vem antes e precisa
ser visto reprovando.**

**Ordem dentro de cada história**: de dentro para fora — `lib/dominio/` → `lib/validacao/` →
`lib/acoes/` → `app/` → `components/` (`CLAUDE.md`, *Convenções de código*).

---

## ⚠️ Oito coisas que a decomposição achou e o plano não trazia

**Listadas, não decididas.** As marcadas 👤 têm tarefa própria de decisão, e nada que dependa delas
começa antes.

| # | Achado | Tarefa |
|---|---|---|
| **D-1** | 👤 **A carga prevista semanal não tem fórmula escrita.** A faixa do regime está em `h/semana` (`config_parametros`, `ch_docente.*`); a atribuição está em `ch_prevista_tempos`; o plano diz só *"a derivação semanal"*. Faltam a conversão de tempo em hora, o divisor semanal e qual data põe uma atribuição num ano | T011 |
| **D-2** | 👤 **Os limites da faixa não dizem se são inclusivos.** *"20h → 8 a 12 h"* não diz se 8 e 12 estão dentro | T011 |
| **D-3** | **O código de instrutor não é gerado pelo banco.** `instrutores.codigo` é `text not null unique`, sem `default`, sequência nem gatilho — os 177 vieram do ETL. O `FR-007` manda gerar automaticamente. ✅ **Decidido em 15/09/2026**: sequência, porque a `gerar_codigo()` do documento 04 é, para instrutores, um contador simples; divergência de mecanismo anotada no data-model | T016, T018 |
| **D-4** | **O `CHECK` de texto em branco não está na lista de migrations do plano**, embora o data-model o exija. As cinco colunas têm hoje só `NOT NULL` | T016, T018 |
| **D-5** | **`vw_instrutores` não expõe a ordem de antiguidade**, e o contrato de parâmetros exige que a consulta a peça ao banco. Só `vw_instrutor_carga_anual` a expõe, e ela só tem linha em ano com fato | T012, T013 |
| **D-6** | **O contrato de URL tem duas rotas, e o cadastro precisa de uma terceira.** Criar instrutor não cabe em `/instrutores/[codigo]`, que pressupõe código existente | T020, T021 |
| **D-7** | 👤 **O quadro de avisos (`FR-027`) não tem lista fechada, e o alerta do `FR-017` não diz qual data de docência conta.** O `RF-INSTR-09` dá dois exemplos; o schema tem `data_inicio_docencia_mb` **e** `data_inicio_docencia_ciaara`. ✅ **Decidido em 15/09/2026**: a data é `data_inicio_docencia_ciaara`, e a lista de avisos é aberta e extensível | T053, T060 |
| **D-8** | 👤 **O projeto remoto de preview é o mesmo de Production** (exceção do `FR-016.1`, 15/09/2026). Aplicar as migrations desta fatia no preview as aplica em Production | T087 |

---

## Fase 1 — Preparação

- [X] T001 Conferir o ponto de partida do quickstart, passo 0: ramo `feat/EPICO-5c-cadastro-de-instrutores`, `.specify/feature.json` apontando para `specs/006-cadastro-de-instrutores`, e `pnpm db:start && pnpm db:reset && pnpm db:tipos:conferir` saindo 0 (research R-9) ✅ Conferido em 15/09/2026: ramo e `feature.json` corretos; `pnpm db:reset` e `db:tipos:conferir` sem diferença.
- [ ] T002 [P] 👤 Emendar o `SC-010` em `specs/006-cadastro-de-instrutores/spec.md` para comparar colunas com `SELECT` contra a **união** de `UPDATE` e `INSERT` (`FR-032`, `SC-010`, research R-4) ⚠️ é emenda de redação do critério, não de regra; aplicar só com a confirmação de Bernardo registrada na própria linha
- [ ] T003 [P] 👤 Emendar a *Assumption 1* em `specs/006-cadastro-de-instrutores/spec.md` com o número real de migrations desta fatia — **três**, pela Fase 2, ou **quatro** se a T014 sair depois da T013 mesclada — (`FR-032`, `FR-014`, `FR-005`, `FR-007`, research R-7, D-3, D-4) ⚠️ mesma regra da T002
- [X] T004 [P] Criar `tests/e2e/instrutores-de-teste.ts` com semeadura **por processo de trabalho** e códigos únicos, no molde de `tests/e2e/panorama-de-teste.ts` (research R-9). A amostra MUST conter: postos diferentes; **dois do mesmo posto** com antiguidade declarada distinta; **um `SC` e um `SCNS`**; um posto **fora da escala**; um 20h com 14h previstas e um 40h com 20h previstas; um com **duas** capacitações; um com o campo de capacitação **vazio** e docência iniciada há mais de um ano; um **selecionado sem habilitação ativa**; um com **aula lançada**; um **inativo**; um **vinculado a conta de acesso** (`SC-001`, `SC-004`, `SC-006`, `FR-026.1`, `FR-026.4`) ⚠️ **nunca o ETL**: ele carrega CPF, RG, telefone e endereço reais ⏸️ **PARCIAL em 15/09/2026**: `tests/e2e/instrutores-de-teste.ts` semeia, por processo e numa OM exclusiva, todos os casos da lista **menos dois números**: o 20h e o 40h existem com o regime, mas **sem** a atribuição que produziria 14h e 20h previstas, porque a conta depende da T011. Semear o número agora seria escolher a fórmula no teste. O instrutor com aula lançada também tem habilitação, para a T048 conferir nome **e** vínculo. A tarefa fecha junto com a US4. ✅ **Fechada em 15/09/2026**: `semearInstrutores(processo, suite, { comCargaPrevista: true })` semeia duas disciplinas de 56 e 80 tempos numa janela de quatro semanas ISO exatas, atribuídas ao 20h e ao 40h — 14 h e 20 h por semana, os dois lados do `SC-006`. Sem a opção a amostra fica como era, para não mudar as contagens das outras suítes.

**Ponto de conferência**: `pnpm verificar` sai 0.

---

## Fase 2 — Fundação (bloqueia todas as histórias)

### Bloco A — o recorte de escrita do dado pessoal (`FR-032`, `FR-033`)

⚠️ **Sai em PR próprio, a partir da `main`** (plano, sequência 1): amarrar uma correção de segurança
à fatia inteira faz ela esperar a fatia inteira.

- [X] T005 Criar o ramo `db/FR-032-recorte-escrita-dado-pessoal` a partir da `main` para as tarefas T006 a T010, e trazer o resultado de volta a este ramo depois do merge (plano, sequência 1) ✅ Ramo local `db/FR-032-recorte-escrita-dado-pessoal` criado a partir da `main` do origin; o commit `f698bfc` voltou a este ramo por cherry-pick (`a0e727e`). ⚠️ **PR não aberto**: sem push, por instrução de 15/09/2026.
- [X] T006 Escrever em `tests/invariantes/rls/rls.test.ts` o bloco `FR-032 · recorte de escrita do dado pessoal`, com N-1 (`encarregado_orientacao_pedagogica` **não** grava `cpf`), N-2 (`ajudante_orientacao_pedagogica` **não** grava `endereco_cep`), N-3 (os três autorizados gravam `cpf` pela função) e N-5 (os cinco perfis com `editar` gravam as 33 colunas funcionais) (`FR-033`, `I-2`, `I-3`, contrato recorte-de-escrita) ⚠️ **N-3 e N-5 são controle positivo**: sem elas, um recorte que nega todo mundo passaria. Precisa reprovar antes da T008 ✅ Bloco `FR-032 · recorte de escrita do dado pessoal` com N-1, N-2, N-3, N-5, e mais N-6 (os seis que não leem a PII também são negados pela função), N-7 (inserção com `cpf` negada aos três) e N-8 (a função recusa coluna fora das 12). As negativas conferem o **código** do erro. Antes da migration, 15 casos reprovaram.
- [X] T007 [P] Escrever `supabase/tests/093_recorte_escrita_instrutor.sql` com a asserção nomeada `FR-032 · colunas com SELECT = colunas com UPDATE ∪ INSERT para authenticated` (`N-4`, `I-1`, `SC-010` emendado) ⚠️ comparar só `SELECT` × `UPDATE` sai verde com o `INSERT` aberto ✅ Seis asserções: sem UPDATE/INSERT de tabela, N-4, nada recortado demais, função SECURITY DEFINER, porteiro com os três perfis, `anon` sem execute. Antes da migration, 5 reprovaram.
- [X] T008 Escrever `supabase/migrations/<ts>_recorte_escrita_dado_pessoal.sql` (gerar com `pnpm db:migration`): **primeiro** `revoke update, insert on public.instrutores from authenticated`, **depois** `grant update (…33…), insert (…33…) on public.instrutores to authenticated` (`FR-032`, `SC-010`, contrato recorte-de-escrita) ⚠️ a ordem é obrigatória: `revoke` de coluna não tem efeito com privilégio de tabela, e a migration invertida roda sem erro e não protege nada. Cabeçalho com o plano de reversão do contrato e a nota de que reverter devolve a escrita de PII a dois perfis que não a leem ✅ `20260915052719_recorte_escrita_dado_pessoal.sql`: revoke de tabela, depois grant das 33.
- [X] T009 Na mesma migration, criar `app.gravar_dados_pessoais_instrutor(...)` `SECURITY DEFINER`, com `search_path` fixo e o porteiro `app.pode('instrutores','editar') and app.perfil_atual() in ('admin','encarregado_administracao_academica','ajudante_administracao_academica')`, e o invólucro de uma linha em `public` que a interface de dados consegue chamar (`FR-032`, contrato recorte-de-escrita) ⚠️ as duas condições **somam**. ⚠️ `revoke ... from public` **não** remove `anon` — revogar dos dois, como o PR #12 mediu. ⚠️ o schema `app` não é servido pela interface de dados, daí o invólucro ✅ Na mesma migration: `app.gravar_dados_pessoais_instrutor(uuid, jsonb)` e o invólucro em `public`; chave ausente não mexe, chave com `null` limpa; coluna fora das 12 → `22023`; perfil sem direito → `42501`.
- [X] T010 Rodar `pnpm db:reset && pnpm db:tipos`, depois `pnpm test:rls` e `pnpm test:invariantes`; conferir por **defeito deliberado** — repor `grant update, insert on public.instrutores to authenticated`, ver N-1, N-2 e N-4 reprovarem, desfazer — e registrar as duas execuções no PR (`FR-032`, `FR-033`, quickstart, passo 1) ⚠️ portão nunca visto reprovando é afirmação, não prova ✅ Medido: pgTAP **108**, RLS **124**, verdes. Defeito deliberado com o grant de tabela de volta: N-1, N-2, N-7 e as asserções 1 e 2 do 093 reprovaram; desfeito, verde de novo.

### Bloco B — a carga prevista e a ordem de antiguidade no caminho de leitura (`FR-014`, `FR-001`)

- [X] T011 👤 Levar a Bernardo, e registrar a resposta em `specs/006-cadastro-de-instrutores/contracts/carga-horaria-e-alertas.md`: (a) a conversão de tempo de aula em hora; (b) o divisor que torna a prevista anual em semanal; (c) qual data põe uma atribuição de `turma_disciplina_instrutor` num ano; (d) se os limites da faixa são inclusivos (`FR-016`, `RF-INSTR-13`, `RF-INSTR-14`, `RN-2027-06`, D-1, D-2) ⚠️ **a T013 depende de (c); a T014 e a Fase 7 (US4) inteira dependem de tudo**. Não inventar: um divisor escolhido por conveniência vira alerta falso em 160 instrutores de 20h ✅ **Respondida por Bernardo em 15/09/2026**: as quatro respostas estão na T090, e a composição semanal do instrutor, que ficou de fora delas, foi decidida no fechamento da fatia (T114).
- [X] T012 [P] Escrever `supabase/tests/094_carga_prevista_e_ordem.sql` com amostra semeada no próprio teste e as asserções nomeadas: `RN-ANT-01 · em vw_instrutores ordenada por ordem_antiguidade, todo militar vem antes de todo civil` (`SC` e `SCNS`, peso 13); `RN-ANT-01 · dois instrutores do mesmo posto saem na ordem da antiguidade_declarada, e quem não a declara fica no fim do próprio posto`; `RN-ANT-01 · posto fora da escala vai para o fim da lista, depois dos civis` (peso 999 de `app.fn_peso_posto`); `RN-INST-04 · vw_instrutor_carga_anual traz ta_ministrado_ano e ta_previsto_ano`; `RN-INST-04 · ta_previsto_ano soma ch_prevista_tempos só das atribuições ativas`; e `I-8 · as duas views não concedem insert, update, delete nem truncate a authenticated` (`FR-001`, `FR-002`, `FR-014`, `FR-015`, `RN-ANT-01`, `RN-ANT-02`, D-5) ⚠️ **corrigida em 15/09/2026** (análise C2): a versão anterior só conferia que a coluna existia, o que é cobertura fingida de uma regra de *Risco: Alto*. ⚠️ as asserções de `ta_previsto_ano` dependem da T011 (c); se ela não fechar, ficam como stub explicitamente pendente ✅ `094_carga_prevista_e_ordem.sql` com amostra de 7 instrutores cujos nomes invertem a ordem alfabética: as 4 asserções da `RN-ANT-01`, a coluna exposta e a `I-8` de `vw_instrutores` passam. As 2 da carga prevista ficam como `todo` do pgTAP, pendentes da T011 — rodam, reprovam e aparecem no relatório como TODO. Defeito deliberado com a chave trocada por ordem alfabética de nome: as asserções 2 a 5 reprovaram.
- [X] T013 Escrever `supabase/migrations/<ts>_carga_prevista_por_instrutor.sql`: `create or replace view` de `vw_instrutor_carga_anual` acrescentando **ao fim** `ta_previsto_ano`, e de `vw_instrutores` acrescentando **ao fim** `ordem_antiguidade` por `app.fn_antiguidade_ordem(i.id)`; repetir o `revoke delete, truncate, insert, update ... from authenticated` nas duas (`FR-014`, `FR-001`, `RN-INST-04`, `RN-ANT-01`, research R-7, R-8, D-5) ⚠️ `create or replace view` só aceita coluna nova **no fim**. ⚠️ VIEW, nunca coluna gravada (`FR-015`). ⚠️ se a T011 atrasar, a `ordem_antiguidade` sai sozinha e a `ta_previsto_ano` vem com a T014 ✅ Só a `ordem_antiguidade`, em `20260915053511_ordem_de_antiguidade_na_leitura.sql`, por `app.fn_antiguidade_ordem` — sem copiar a fórmula. ⚠️ `ta_previsto_ano` **não** entrou: espera a T011 e virá em migration própria, com o revoke de `vw_instrutor_carga_anual`. A fatia passa a ter quatro migrations.
- [X] T014 Acrescentar `ta_previsto_semanal` a `vw_instrutor_carga_anual` com a fórmula que a T011 registrar, e a asserção nomeada `RN-2027-06 · ta_previsto_semanal segue a fórmula registrada` em `supabase/tests/094_carga_prevista_e_ordem.sql` (`FR-016`, `RN-2027-06`) ⚠️ depende da T011. Se a T013 já estiver mesclada, é migration nova, não edição ✅ **Superada em 15/09/2026**: pela decisão da semanal do instrutor, ela é **por semana ISO** e não cabe numa coluna por ano — é calculada em `lib/dominio/carga-semanal.ts` (T114). O `todo` do `094` virou duas asserções reais: `ta_previsto_semanal` **não** existe em `vw_instrutor_carga_anual`, e `vw_instrutor_carga_prevista` entrega janela e média de cada atribuição para a soma por semana.
- [X] T015 Rodar `pnpm db:reset && pnpm db:tipos` e `pnpm test:invariantes`; conferir em `lib/tipos/database.ts` que as colunas novas existem (`FR-014`, `FR-001`, quickstart, passo 4) ⚠️ coluna que o TypeScript não conhece é, quase sempre, coluna inventada ✅ Medido: pgTAP **116** (2 TODO da T011), RLS **124**; `ordem_antiguidade` presente em `lib/tipos/database.ts`.

### Bloco C — os cinco obrigatórios e o código gerado (`FR-005` a `FR-007`)

- [X] T016 Medir, na base carregada pelo ETL do Épico 2 (`python -m scripts.etl.executar` contra o banco local), quantas linhas de `instrutores` têm um dos cinco obrigatórios só com espaços e quantos `codigo` não são inteiros; registrar os dois números no cabeçalho da migration da T018 (`RN-INST-03`, `RN-CRUD-03`, D-3, D-4) ⚠️ **se algum for maior que zero, parar e perguntar**: o `CHECK` falharia na carga, e a saída conhecida — a catraca do achado 3 do Épico 2 — é decisão, não padrão ✅ Medido em 15/09/2026 com `python -m scripts.etl.executar --ambiente local` (reconciliação APROVADA): 177 instrutores; **0** com obrigatório só com espaços, em cada uma das cinco colunas; **0** código não inteiro; maior código **177**; **0** posto fora da escala. O `CHECK` entra sem catraca.
- [X] T017 [P] Escrever `supabase/tests/095_obrigatorios_e_codigo_instrutor.sql` com as asserções nomeadas `RN-INST-03 · cada um dos cinco obrigatórios é recusado vazio e só com espaços` (dez casos) e `RN-CRUD-03 · instrutor inserido sem codigo recebe inteiro simples, sem prefixo, maior que o maior existente` (`FR-005`, `FR-006`, `FR-007`, `I-5`, `SC-003`) ✅ 13 asserções: dez recusas com `23514`, controle positivo, código inteiro sem prefixo e código acima do gravado com código explícito. Antes da migration, as dez recusas reprovaram e a inserção sem código foi negada pelo `NOT NULL`.
- [X] T018 Escrever `supabase/migrations/<ts>_obrigatorios_e_codigo_instrutor.sql`: `check (btrim(<coluna>) <> '')` em `posto_graduacao`, `esp_hab_obs`, `nome_completo`, `categoria` e `om`, e geração do `codigo` como inteiro simples por sequência iniciada acima do maior código existente, como `default` da coluna (`FR-005`, `FR-006`, `FR-007`, `RN-INST-03`, `RN-CRUD-03`) ⚠️ **migration não prevista no plano** (D-3, D-4): o cabeçalho diz por quê e traz o plano de reversão. ⚠️ o `CHECK` é do banco porque o `FR-006` exige que a recusa valha por qualquer caminho. ⚠️ **sequência, e não gatilho, por decisão de 15/09/2026**: o cabeçalho registra a divergência com o artefato `gerar_codigo()` do documento 04, como no data-model ✅ `20260915054204_obrigatorios_e_codigo_instrutor.sql`. ⚠️ O `default` é `app.proximo_codigo_instrutor()` sobre a sequência `app.instrutores_codigo_seq`, que se **avança** acima do maior código gravado: sem isso, o ETL do corte, que grava 1 a 177 depois das migrations, faria o primeiro cadastro colidir. Divergência de mecanismo com `gerar_codigo()` registrada no cabeçalho. Defeito deliberado — sem o `CHECK` de OM e com sequência pura —: as asserções 9, 10 e 13 reprovaram.
- [X] T019 Rodar `pnpm db:reset && pnpm db:tipos` e `pnpm test:invariantes`, e conferir o `default` de `codigo` em `lib/tipos/database.ts` (`FR-005`, `FR-007`, quickstart, passo 7) ✅ Medido: pgTAP **129**, RLS **124**; `default` de `codigo` refletido em `lib/tipos/database.ts`. Carga limpa do ETL sobre as migrations: reconciliação APROVADA e próximo código **178**. ⚠️ Rodar o ETL **depois** das suítes dá BLOQUEADA, porque a RLS deixa linha no `migracao_log`, que não se apaga — não é defeito desta fatia.

### Bloco D — o contrato das rotas

- [X] T020 Declarar em `lib/navegacao/contrato.ts` a rota `/instrutores` com os oito parâmetros da tabela do contrato — `busca`, `om`, `categoria`, `capacitacao`, `regime`, `escolaridade`, `situacao` (padrão `ativo`) e `ordem` —, a rota `/instrutores/[codigo]` sem parâmetro, e a rota `/instrutores/novo` sem parâmetro (`FR-028`, `RF-NAV-01`, `RF-INSTR-01`, `RF-INSTR-02`, `RF-INSTR-10`, contrato parametros-instrutores, D-6) ⚠️ todo filtro `substitui` e avisa o servidor; `busca` com `LIMITE_DE_FREQUENCIA_MS`; `ordem` é o único que **não** avisa o servidor ✅ As três rotas em `lib/navegacao/contrato.ts`. ⚠️ `om`, `categoria`, `capacitacao` e `escolaridade` são **texto**, e não escolha: o domínio deles é o dado, e uma lista fixa degradaria em silêncio o link com uma OM nova. `regime` e `situacao` são escolha lida de `Constants`; `ordem` é escolha com um valor por sentido.
- [X] T021 [P] Registrar a rota `/instrutores/novo` em `specs/006-cadastro-de-instrutores/contracts/parametros-instrutores.md`, com a origem `RF-INSTR-02` e o motivo de ela não constar da Fase 1 (D-6) ✅ Rota `/instrutores/novo` e a troca de tipo registradas no contrato, com a divergência em relação ao documento 25 §1.3, que declara outro conjunto de parâmetros para `/instrutores` e não foi alterado.
- [X] T022 [P] Estender `tests/unidade/contrato-de-parametros.test.ts` para as três rotas: histórico `substitui` e aviso ao servidor em todo filtro, `ordem` sem aviso, padrão não vazio só em `situacao`, e **nenhum** parâmetro com nome de coluna de identificação civil ou residência (`FR-028`, `SC-008`, contrato parametros-instrutores §recusas) ⚠️ CPF na barra de endereço vaza por histórico, por log e por ombro ✅ Nove casos novos. **Ponto de conferência da Fase 2**, medido em 15/09/2026: `pnpm verificar:tudo` sai **0** — unidade **344**, pgTAP **129** (2 TODO da T011), RLS **124**, ponta a ponta **134** (2 pulados).

**Ponto de conferência**: `pnpm verificar:tudo` sai 0 com as migrations da Fase 2 aplicadas e nenhuma tela nova.

---

## Fase 3 — História 1 (P1): a ordem é sempre a da antiguidade 🎯 MVP

**Objetivo**: toda lista, seletor e filtro de instrutor nasce ordenado por antiguidade, sem depender
de o autor lembrar.

**Teste independente**: enumerar **todas** as ocorrências de lista, seletor e filtro de instrutor no
repositório e conferir cada uma — não por amostragem (`SC-001`).

### Testes da US1

- [X] T023 [P] [US1] Estender `tests/unidade/antiguidade.test.ts` só com os casos que ainda faltarem: `SC` e `SCNS` depois de todo militar, desempate entre dois civis pela antiguidade declarada, e posto fora da escala **não** indo ao topo (`FR-002`, `RN-ANT-02`, quickstart passo 3) ⚠️ conferir antes o que a fatia (b) do Épico 4 já cobre; caso duplicado é ruído ✅ Cinco casos novos, com nomes que invertem a ordem alfabética. ⚠️ **Achado**: `ordenarPorAntiguidade`, da fatia (b) do Épico 4, desempatava direto pelo **nome**, enquanto o banco sempre desempatou pela **declarada** — duas regras para a mesma lista. Três casos reprovaram antes da correção.
- [X] T024 [P] [US1] Criar `tests/unidade/ordenacao-de-instrutor.test.ts`: varredura de `app/`, `components/` e `lib/`, **em código sem comentário**, que enumera toda lista, seletor e filtro de instrutor e exige que cada ocorrência passe por `ordenarPorAntiguidade`, por `SeletorInstrutor` ou por consulta com `ordem_antiguidade`, com controle positivo (`FR-001`, `FR-004`, `SC-001`, `I-7`) ⚠️ três varreduras da fatia (b) reprovaram lendo a própria documentação como violação ✅ Varredura em duas portas: toda leitura de lista de instrutor pede `ordem_antiguidade` ou passa pela montagem; nenhum comando que fala de instrutor reordena com `.sort(` sem o domínio. Controle positivo com violação sintética. ⚠️ A primeira versão olhava o arquivo inteiro e acusou `nome-instrutor.ts` e `menu.ts`; passou a olhar o comando.
- [X] T025 [P] [US1] Criar `tests/unidade/escala-de-antiguidade.test.ts` para a função da T027: 14 linhas de `config_listas` viram 14 pesos, `SC` e `SCNS` empatam em 13, linha inativa não entra (`FR-003`, research R-5) ✅ Quatro casos; reprovaram antes da T027 com `escalaDeLinhas is not a function`.
- [X] T026 [P] [US1] Criar `tests/unidade/consulta-de-instrutores.test.ts` para a função de montagem da T028: com qualquer valor de `ordem`, inclusive `nome`, a consulta montada pede `order by ordem_antiguidade` e **não** ordena por outra coluna; e os filtros entram na mesma consulta (`SC-001`, `RN-ANT-01`, `FR-001`, contrato parametros-instrutores §Ordenação) ⚠️ **corrigida em 15/09/2026** (análise H4): a versão anterior pedia ao Playwright que observasse a consulta, que sai do servidor e não passa pelo navegador. O percurso visível — a amostra da T004 em antiguidade — continua na T068 ✅ `tests/unidade/consulta-de-instrutores.test.ts`: 13 valores de `ordem`, todos com uma única ordenação por `ordem_antiguidade`; filtros em E lógico; busca normalizada e com curinga escapado; nenhuma coluna de PII.

### Implementação da US1

- [X] T027 [US1] Acrescentar a `lib/dominio/antiguidade.ts` a função pura que monta a `EscalaDeAntiguidade` a partir das linhas de `config_listas` da lista `escala_antiguidade`, com a citação literal do `RN-ANT-02` no topo (`FR-003`, research R-6) ⚠️ acrescentar, não reescrever: a escala continua chegando por argumento ✅ `escalaDeLinhas`, e o desempate pela antiguidade declarada em `ordenarPorAntiguidade` (`antiguidadeDeclarada` opcional em `Ordenavel`), alinhando a função ao `app.fn_antiguidade_ordem`. Sem a declarada, o comportamento anterior — desempate por nome — continua.
- [X] T028 [US1] Criar `app/(app)/instrutores/consulta.ts`, sem `"use client"` e sem I/O próprio, com a função que recebe o construtor de consulta e os parâmetros e monta a leitura de `vw_instrutores` com `order by ordem_antiguidade`; e `app/(app)/instrutores/page.tsx` (Server Component), que a executa e entrega a lista à `TabelaDensa` controlada, com as colunas posto/graduação, nome (`NomeInstrutor`), categoria, OM e regime (`FR-001`, `FR-019`, `FR-020`, `FR-027.1`, `RN-ANT-01`, research R-10) ⚠️ ler `vw_instrutores`, **nunca** `instrutores`: `select *` na tabela falha com `permission denied` e manda procurar a RLS, que não é a causa. ⚠️ nenhum `await` em laço ✅ `consulta.ts` e `page.tsx`. ⚠️ Duas correções pegas pelo `tsc`: as colunas concatenadas com `+` perdiam o tipo literal, e a restrição genérica contra o construtor tipado estourava a profundidade (TS2589); a montagem passou a devolver o mesmo tipo que recebe, sem restrição estrutural.
- [X] T029 [US1] Criar a folha de cliente `app/(app)/instrutores/TabelaDeInstrutores.tsx`, que aplica `ordem` **por cima** da antiguidade recebida, sem tocar na consulta (`FR-001`, contrato parametros-instrutores §Ordenação) ⚠️ `"use client"` só aqui, nunca no `page.tsx` ✅ `TabelaDeInstrutores.tsx`, única folha de cliente da tela; a coluna de posto ordena por `ordem_antiguidade`, nunca pelo texto.
- [X] T030 [P] [US1] Criar `app/(app)/instrutores/loading.tsx` com `EsqueletoTabela` e `app/(app)/instrutores/error.tsx` com a mensagem de degradação (`RN-DEG-01`) ✅ Silhueta de tabela e contenção com a casca de pé.
- [X] T031 [US1] Virar `disponivel: true` na entrada Instrutores de `lib/navegacao/menu.ts`, **no mesmo commit** da T028 (`RF-NAV-02`, `RF-INSTR-01`, contrato parametros-instrutores §As duas rotas) ⚠️ o teste do shell confere os dois sentidos e reprova se a tela nascer com o menu dizendo "em breve" ✅ Entrada Instrutores com `disponivel: true` no mesmo commit da página. **Ponto de conferência**: unidade **379** verde, `tsc`, `eslint` e Prettier limpos; a ponta a ponta da listagem entra com `tests/e2e/instrutores.spec.ts`, na US2 e na US6.

**Ponto de conferência**: `pnpm test:unidade` e `pnpm test:e2e tests/e2e/instrutores.spec.ts` verdes (quickstart, passo 3).

---

## Fase 4 — História 2 (P1): o cadastro não aceita ficar pela metade

**Objetivo**: salvar sem posto, especialidade, nome, categoria ou OM é recusado, pela tela e por
fora dela.

**Teste independente**: tentar salvar sem cada um dos cinco campos, e por caminho que não seja a tela
(`SC-003`).

### Testes da US2

- [X] T032 [P] [US2] Criar `tests/unidade/validacao-instrutor.test.ts`: o esquema recusa cada um dos cinco vazio e só com espaços, e a mensagem diz **qual** campo falta (`FR-005`, `RN-INST-03`, US2 cenários 1 e 2) ✅ 21 casos: cada obrigatório vazio, só com espaços e ausente, com a mensagem que diz qual; controle positivo; valores aparados; carga horária e CPF descartados do bloco funcional. ⚠️ `z.uuid()` do Zod 4 recusa identificadores válidos para o PostgreSQL; trocado por `z.guid()`.
- [X] T033 [P] [US2] Escrever em `tests/invariantes/rls/rls.test.ts` o bloco `FR-029 · autoria vem da sessão`: escrita autenticada em `instrutores` grava `criado_por`/`editado_por` com o usuário da sessão, e o valor enviado pelo cliente é ignorado (`FR-029`, `RF-INSTR-12`) ✅ ⚠️ **Reprovou, e o defeito era real**: com sessão autenticada, um INSERT mandando `criado_por` gravava o autor falso — `app.set_auditoria()` só o preenchia quando vinha nulo, para o ETL. Corrigido na migration `20260915060809_autoria_da_sessao_na_criacao.sql` (commit `a867e26`): com sessão, o autor é sempre o da sessão; sem sessão, nada muda. ETL em banco limpo, com e sem a correção: APROVADA nas duas, mesmas contagens. Alcance universal, registrado para revisão.
- [X] T034 [P] [US2] Escrever em `tests/e2e/instrutores.spec.ts` o percurso de cadastro: cada obrigatório ausente é recusado com o nome do campo, a confirmação aparece antes de salvar, e depois da recusa **nada** foi salvo (`FR-005`, `FR-011`, US2 cenário 3, quickstart passo 7) ✅ `tests/e2e/instrutores.spec.ts`: entrada pelo menu; nome só com espaços recusado com a mensagem e **nenhuma linha gravada**, conferido pela `service_role`; cadastro completo abre a ficha com código inteiro e `criado_por` preenchido. ⚠️ `getByRole("alert")` era ambíguo com o anunciador de rota do Next; escopado ao formulário.

### Implementação da US2

- [X] T035 [US2] Criar `lib/validacao/instrutor.ts`: esquema Zod com os cinco obrigatórios aparados e com mensagem por campo, e as colunas funcionais opcionais (`FR-005`, `RN-INST-03`) ⚠️ nenhum campo de carga horária no esquema (`FR-015`) ✅ `lib/validacao/instrutor.ts`: funcional, dado pessoal em esquema próprio, edição, gravação de PII e situação.
- [X] T036 [US2] Criar `lib/acoes/instrutor.ts` com as Server Actions `criarInstrutor` e `editarInstrutor`: `safeParse` na primeira linha, escrita das colunas funcionais pelo cliente de servidor, dado pessoal só pelo invólucro da T009, e a recusa do `CHECK` traduzida para o campo (`FR-005`, `FR-006`, `FR-012`, `FR-032`) ⚠️ **nunca** `service_role`: ela é para convite, ETL e manutenção ✅ `criarInstrutor`, `editarInstrutor` e `gravarDadosPessoaisDoInstrutor`; `safeParse` na primeira linha; tradução por código de erro e nome da restrição, com a mensagem desconhecida só no log; edição que devolve zero linhas é recusa, não sucesso.
- [X] T037 [US2] Criar a folha `app/(app)/instrutores/FormularioDeInstrutor.tsx`: os cinco obrigatórios com `CampoObrigatorio`, `DialogoConfirmacao` antes de salvar, e **nenhum** campo de carga horária (`FR-005`, `FR-011`, `FR-015`) ✅ `FormularioDeInstrutor.tsx` com `DialogoConfirmacao`. ⚠️ Os campos e tipos vivem em `campos.ts`, sem marcador de cliente: exportados do arquivo `"use client"`, virariam referência de cliente nas páginas. ⚠️ As escolhas de posto e regime foram para `CampoDeEscolha.tsx`: no mesmo arquivo do formulário, o `seletor-unico.test.ts` as contava como segundo construtor de seletor de instrutor.
- [X] T038 [US2] Criar `app/(app)/instrutores/novo/page.tsx`, que monta o formulário em modo cadastro e só aparece para quem pode `criar` (`FR-005`, `RF-INSTR-02`, D-6) ✅ `novo/page.tsx`, oculto para quem não pode `criar`, e link "Novo instrutor" na listagem com `SePodeVer`.
- [X] T039 [US2] Criar `app/(app)/instrutores/[codigo]/page.tsx` com a ficha mínima e o formulário em modo edição, **todos os campos carregados** com o valor salvo; código inexistente e código fora de alcance respondem com `EstadoVazio` de motivos diferentes (`FR-012`, `FR-027.3`, `FR-027.4`, `FR-031`) ⚠️ o `id` uuid nunca aparece na URL nem na tela ✅ `[codigo]/page.tsx`: ficha mínima, formulário com todos os campos carregados, e os dois vazios distintos.
- [X] T040 [US2] Em `app/(app)/instrutores/FormularioDeInstrutor.tsx`, mostrar a seção de identificação civil e residência **só** a quem a lê — leitura por `vw_instrutor_dados_pessoais` — e gravá-la pela ação da T036 (`FR-032`) ⚠️ quem não vê, não escreve: o campo não existe na tela de quem não o lê ✅ A seção de identificação civil só aparece quando `vw_instrutor_dados_pessoais` entrega a linha — o banco decide, sem lista de perfis na tela. ⚠️ **No cadastro ela não aparece**: saber ali se a sessão lê PII exigiria declarar os perfis na tela (`FR-021` da spec 004); a PII é gravada na ficha, depois do cadastro.
- [X] T041 [P] [US2] Criar `app/(app)/instrutores/[codigo]/loading.tsx` e `app/(app)/instrutores/[codigo]/error.tsx` (`RN-DEG-01`) ✅ Loading e erro da ficha.
- [X] T041.1 [P] [US2] Criar `app/(app)/instrutores/novo/loading.tsx` e `app/(app)/instrutores/novo/error.tsx`, iguais aos dos outros dois segmentos (`RN-DEG-01`, constitution §V) ⚠️ **acrescentada em 15/09/2026** (análise M6) ✅ Loading e erro do cadastro. **Ponto de conferência**: unidade **400**, RLS **126**, ponta a ponta do cadastro **3 de 3**.

**Ponto de conferência**: `pnpm test:unidade`, `pnpm test:rls` e o percurso de cadastro verdes.

---

## Fase 5 — História 3 (P1): a carga horária é lida, nunca digitada

**Objetivo**: ministrada e prevista aparecem sempre como reflexo do que está lançado, e não existe
onde digitá-las.

**Teste independente**: procurar campo de CH editável em qualquer formulário do sistema; não deve
existir nenhum (`SC-002`).

### Testes da US3

- [X] T042 [P] [US3] Criar `tests/unidade/carga-horaria-digitavel.test.ts`: varredura de `app/` e `components/`, em código sem comentário, que conta `input`, `select` e campo de formulário ligados a carga horária e exige **zero**, com controle positivo (`FR-015`, `SC-002`, `I-4`) ✅ `carga-horaria-digitavel.test.ts`: a tela com controle de formulário não cita a carga do instrutor, **e** `lib/validacao/` e `lib/acoes/` não a citam em nada — os campos do formulário saem de listas, e o esquema do Zod é onde um campo novo teria de entrar. O vocabulário é o da carga do **instrutor**: `carga_horaria_tempos` e `ch_prevista_tempos` são dado curricular, e reprovar neles barraria o cadastro de disciplina. Defeito deliberado (campo no formulário e chave no esquema): os dois casos reprovaram.
- [X] T043 [US3] Acrescentar a `supabase/tests/094_carga_prevista_e_ordem.sql` a asserção nomeada `RN-INST-04 · lançamento novo muda ta_ministrado_ano sem ação adicional` (`FR-014`, US3 cenário 2) ⚠️ o cenário 3 — escrita por fora recusada — já é a `I-8` da T012 ✅ Asserção 7 do 094, pela **diferença**: mede a soma do ano, lança 4 tempos para o mesmo instrutor, exige +4. Conferir o valor absoluto dependeria dos lançamentos do ETL no ano corrente.

### Implementação da US3

- [X] T044 [US3] Acrescentar a `app/(app)/instrutores/page.tsx` a coluna CH total no ano, lida de `vw_instrutor_carga_anual` do ano corrente em `Promise.all` com a leitura da T028, e casada por `instrutor_id` com **zero** quando não houver linha (`FR-014`, `FR-027.1`) ⚠️ a view só tem linha em ano com fato: ausência é zero, não "sem instrutor" ✅ Coluna `CH <ano> (TA)`, ordenável por `ch_ano`, lida na mesma rodada de `Promise.all`; ausência de linha é 0. Se a leitura da carga falhar, a coluna mostra “—” e uma linha de estado diz por quê: zero afirmaria que ninguém deu aula. O ano é contado em `America/Sao_Paulo` (`lib/formato/ano-corrente.ts`, com teste da virada de ano).
- [X] T045 [US3] Mostrar em `app/(app)/instrutores/[codigo]/page.tsx` a CH ministrada e a prevista do ano, somente leitura, na unidade que a view entrega e com a indicação de que são calculadas (`FR-014`, `FR-015`, `RF-INSTR-13`) ⏸️ **PARCIAL em 15/09/2026**: a ministrada está na ficha, em TA, somente leitura e com a dica de que é calculada, e a ponta a ponta confere `0 TA` num instrutor sem lançamento. **A prevista fica como "ainda não calculada"**: `ta_previsto_ano` não existe no banco e depende da T011, que segue sem resposta. A tarefa fecha junto com a US4. ✅ Fechada em 15/09/2026 pela T094: a prevista do ano está na ficha.

**Ponto de conferência**: `pnpm test:invariantes && pnpm test:unidade` verdes (quickstart, passo 4).

---

## Fase 6 — História 5 (P2): desativar preserva o passado

⚠️ **Vem antes da US4 de propósito** (plano, sequência 6 e 7): a US4 depende da T011, e esta não.

**Objetivo**: desativar tira o instrutor das atribuições futuras sem apagar nada do que ele fez, e
sem tocar a conta de acesso.

**Teste independente**: desativar alguém com histórico e conferir os dois lados (`SC-004`).

### Testes da US5

- [X] T046 [P] [US5] Criar `tests/unidade/ciclo-de-vida-instrutor.test.ts`: inativo sai da lista de nova atribuição, ativo fica, e a lista de entrada não é alterada (`FR-009`, `RN-INST-02`) ✅ Cinco casos: inativo sai, ativos ficam, ordem de chegada preservada, lista de entrada intacta, e status ausente **não** é ativo por padrão (`RN-INST-05`).
- [X] T047 [P] [US5] Escrever em `tests/invariantes/rls/rls.test.ts` o bloco `FR-010.1 · desativar instrutor não toca a conta`: com instrutor vinculado desativado, `usuarios.status` continua `ativo` e a sessão continua alcançando o que alcançava (`FR-010.1`) ✅ Bloco `FR-010.1 · desativar instrutor não toca a conta`: desativa **pela sessão do admin**, confere conta ativa, vínculo mantido e o mesmo alcance da sessão vinculada. Defeito deliberado (gatilho de cascata criado à mão no banco local): reprovou com *"desativar o instrutor desativou a conta em cascata"*; removido, voltou a passar.
- [X] T048 [P] [US5] Escrever em `tests/e2e/instrutores.spec.ts` o percurso do quickstart, passo 6: desativar instrutor com aula lançada, conferir que some da listagem padrão e aparece com `?situacao=inativo`, que o histórico continua com nome e vínculos, que reativar devolve tudo, e que a tela de usuários mostra o instrutor vinculado inativo (`FR-008`, `FR-009`, `FR-010`, `FR-010.1`, `SC-004`) ✅ Dois casos na ponta a ponta, sobre a amostra da T004: desativar some da listagem padrão e aparece com `?situacao=inativo`; a aula e a habilitação continuam no banco; reativar devolve. E o vinculado: tela de usuários mostra *instrutor inativo* com a conta *ativo*, conferido também no banco. ⚠️ O "histórico" é conferido no banco: nenhuma tela desta fatia lista aulas por instrutor.

### Implementação da US5

- [X] T049 [US5] Criar `lib/dominio/ciclo-de-vida-instrutor.ts` com a função pura que devolve os elegíveis para nova atribuição, com a citação literal do `RN-INST-02` no topo (`FR-009`, `RN-INST-02`) ✅ `lib/dominio/ciclo-de-vida-instrutor.ts`, com a citação literal do `RN-INST-02`. Só o item (i); histórico e cadastro não passam por ela.
- [X] T050 [US5] Acrescentar a `lib/acoes/instrutor.ts` as Server Actions `desativarInstrutor` e `reativarInstrutor`: Zod na primeira linha, `status` explícito, **nunca** `delete` (`FR-008`, `FR-010`, `RN-INST-05`) ✅ `desativarInstrutor` e `reativarInstrutor`, Zod na primeira linha; o cliente manda só o `id`, e um `status` no corpo é descartado (2 casos novos em `validacao-instrutor.test.ts`). `UPDATE` de `status`, zero linhas é falha, e revalida também `/admin/usuarios`.
- [X] T051 [US5] Criar a folha `app/(app)/instrutores/[codigo]/AcoesDeInstrutor.tsx` com desativar e reativar, `DialogoConfirmacao` e ocultação por `SePodeVer` para quem não pode `editar` (`FR-008`, `FR-010`) ⚠️ oculto, não desabilitado ✅ `AcoesDeInstrutor.tsx`: uma ação por situação, diálogo com a consequência escrita (histórico fica, conta não é tocada), montada na ficha sob `SePodeVer` de `editar`.
- [X] T052 [US5] Mostrar em `app/(app)/admin/usuarios/page.tsx`, no mesmo `select` da lista, a situação do instrutor vinculado a cada conta (`FR-010.1`) ⚠️ a conta **não** é desativada em cascata; a tela só mostra ✅ Coluna *Instrutor vinculado* com `NomeInstrutor` e selo *instrutor ativo/inativo*, na mesma consulta da lista por junção. ⚠️ O tipo gerado declara a junção como lista, porque `usuarios.instrutor_id` também se relaciona com três views; a tela normaliza as duas formas em vez de forçar o tipo.

**Ponto de conferência**: o percurso da T048 verde (quickstart, passo 6).

---

## Fase 7 — História 4 (P2): o sistema avisa, e não impede

⚠️ **Bloqueada pela T011** para o alerta de faixa, e pela T053 para o de capacitação.
✅ **Destravada em 15/09/2026**: a T011, a composição semanal e a T053 foram decididas por Bernardo, e a fase fechou na Fase 8.2.

**Objetivo**: fora da faixa do regime e docência sem capacitação aparecem como aviso, e nada deixa
de funcionar.

**Teste independente**: pôr um instrutor fora da faixa e conferir que o aviso aparece **e** que tudo
continua funcionando (`SC-006`).

### Decisão da US4

- [X] T053 [US4] 👤 Registrar em `specs/006-cadastro-de-instrutores/contracts/carga-horaria-e-alertas.md` a data de referência do `FR-017` — **`data_inicio_docencia_ciaara`, decidida por Bernardo em 15/09/2026** —, e levar a ele o que ainda falta: o que fazer quando essa data está vazia (`FR-017`, `RF-INSTR-16`, D-7) ⚠️ tarefa da US4, que segue travada pela T011 ✅ **Fechada em 15/09/2026**: com `data_inicio_docencia_ciaara` vazia o alerta não dispara, e o quadro de avisos ganha "Data de início de docência não informada" *(decisão de Bernardo Villas Boas, 15/09/2026)*. Registrado no `FR-017`, no `FR-027` e no contrato de carga horária.

### Testes da US4

- [X] T054 [P] [US4] Criar `tests/unidade/carga-horaria.test.ts`: com a faixa chegando por argumento, 40h com 20h previstas **não** alerta, 20h com 14h **alerta**, e os limites se comportam como a T011 registrar (`FR-016`, `RN-2027-06`, `SC-006`, `I-9`) ⚠️ um teste que use 40 como limite passa no primeiro caso pelo motivo errado ✅ Coberta pela T093, em `tests/unidade/carga-horaria.test.ts`, com os limites da T011 (d).
- [X] T055 [P] [US4] Criar `tests/unidade/alertas-instrutor.test.ts`: docência há mais de um ano com capacitação vazia gera aviso, e o resultado é **só** aviso, sem nenhum campo que bloqueie (`FR-017`, `FR-018`, `RN-DEG-02`) ✅ `tests/unidade/alertas-instrutor.test.ts`, 7 casos: mais de um ano sem capacitação alerta; um ano exato não; capacitação preenchida não; data vazia não; o resultado só tem chave, título e detalhes — nenhum campo que bloqueie; e o alerta de faixa nomeia a semana.
- [X] T056 [P] [US4] Escrever em `tests/e2e/instrutores.spec.ts` o caso do `SC-006`: a ficha do 20h com 14h mostra o alerta **e** o salvar continua disponível; a do 40h com 20h não mostra alerta (`FR-016`, `FR-018`, `SC-006`) ⚠️ "desabilitar o botão enquanto houver alerta" é a forma que o erro costuma tomar ✅ Suíte `SC-006` em `tests/e2e/instrutores.spec.ts`: o 20h com 14 h mostra o alerta com **quatro** linhas de semana e gravar e desativar continuam habilitados; o 40h com 20 h mostra "80 TA" e nenhum alerta. Acrescentados o caso do `FR-017` e o do militar sem especialidade que volta a salvar.

### Implementação da US4

- [X] T057 [US4] Criar `lib/dominio/carga-horaria.ts` com a função pura que situa a prevista semanal na faixa do regime, com a citação literal do `RN-2027-06` no topo (`FR-016`, `RN-2027-06`) ⚠️ o teto é a **faixa**, jamais o número do regime ✅ Coberta pela T093: `lib/dominio/carga-horaria.ts` com a citação do `RN-2027-06` e da T011 (d).
- [X] T058 [US4] Criar `lib/dominio/alertas-instrutor.ts` com os avisos do `FR-016` e do `FR-017`, com a citação literal do `RN-DEG-02` no topo (`FR-016`, `FR-017`, `FR-018`) ✅ `lib/dominio/alertas-instrutor.ts`: `alertaForaDaFaixa` (uma linha por semana fora, `Semana N/AAAA (DD/MM a DD/MM): X h, acima da faixa de 8 a 12 h.`) e `alertaSemCapacitacao` ("mais de um ano" estrito), com a citação do `RN-DEG-02` no topo.
- [X] T059 [US4] Exibir os avisos em `app/(app)/instrutores/[codigo]/page.tsx` com `AlertaConformidade`, sem condicionar nenhuma ação a eles (`FR-018`, `RN-DEG-02`) ⚠️ nunca `CHECK`, policy que nega ou botão desabilitado ✅ `app/(app)/instrutores/[codigo]/page.tsx`: os alertas saem no topo da ficha com `AlertaConformidade`, a faixa lida de `vw_instrutor_carga_anual` (`config_parametros`), e nenhum botão depende deles.

**Ponto de conferência**: `pnpm test:unidade` e o caso da T056 verdes.

---

## Fase 8 — História 6 (P2): a ficha mostra o que a v2.0 mostrava

**Objetivo**: cada refinamento das oito specs da v2.0 tem endereço na v2.1.

**Teste independente**: percorrer a tabela §4 do documento 06, item a item, e apontar onde cada
refinamento reaparece (`SC-007`).

### Decisões e conferências da US6

- [X] T060 [US6] Registrar em `specs/006-cadastro-de-instrutores/contracts/carga-horaria-e-alertas.md` a lista **aberta e extensível** do quadro de avisos, decidida por Bernardo em 15/09/2026, começando pelos dois exemplos do `RF-INSTR-09` — instrutor sem NIP e campo obrigatório pendente (`FR-027`, `RF-INSTR-09`, D-7) ⚠️ **corrigida em 15/09/2026**: a lista **não** é enum fixo; aviso novo entra sem mudar o tipo que a descreve ✅ Seção *O quadro de avisos de qualidade de cadastro* em `contracts/carga-horaria-e-alertas.md`: lista aberta, dois avisos iniciais, regra como dado, sempre visível e sobre o recorte. ⚠️ O aviso de obrigatório pendente hoje não encontra ninguém, porque os cinco já são `NOT NULL` com `CHECK`; fica como defesa e como o exemplo que a regra nomeia.
- [X] T061 [US6] Registrar no cabeçalho de `app/(app)/instrutores/FormularioDeInstrutor.tsx` que `preferencia` é **texto livre** nesta fatia, como simplificação deliberada do `RF-INSTR-06` decidida em 15/09/2026, e não grade dia × período (`FR-030`, `RF-INSTR-06`) ⚠️ **corrigida em 15/09/2026** (análise M8): não há mais conferência que pare a fatia ✅ O cabeçalho do formulário já registrava a simplificação desde a US2; conferido.
- [X] T062 [US6] Conferir em `supabase/migrations/` qual recurso e qual ação a policy de escrita de `instrutor_disciplina` consulta, e registrar no cabeçalho da T082 (`FR-022`, `RN-INST-01`) ✅ Conferido: `instrutor_disciplina_criar` e `_editar` consultam `app.pode('instrutores', 'editar')` **e** `app.alcanca_disciplina(disciplina_id)` (migration `20260830000111`, linhas 754–761). Registrado em `paridade.md`, porque o cabeçalho da T082 não chegou a existir: a T082 está travada.

### Testes da US6

- [X] T063 [P] [US6] Criar `tests/unidade/indicadores-instrutor.test.ts`: exatamente 4 indicadores; capacitação conta o campo **não vazio**; com selecionados maior que habilitados, os dois absolutos aparecem e o percentual passa de 100% (`FR-026`, `FR-026.1`, `SC-007.1`) ✅ 7 casos, com a taxa de 300% e o percentual nulo sem habilitado.
- [X] T064 [P] [US6] Criar `tests/unidade/graficos-instrutor.test.ts`: exatamente 7 séries; as barras de posto/graduação em ordem de antiguidade, **nunca** alfabética, sem exigir posição do gráfico; a série de classificação lida da coluna `categoria`; posto fora da escala na faixa "Outros" ao final; duas capacitações contam em ambas as barras e o campo vazio em nenhuma; nenhuma série com mais de 7 valores (`FR-026.2`, `FR-026.3`, `FR-026.4`, `SC-007.1`) ✅ 8 casos. ⚠️ **Redação corrigida na implementação**: *"nenhuma série com mais de 7 valores"* não é o teto do Design System. `components/graficos/` recusa gráfico com mais de `MAXIMO_DE_SERIES` (6) **séries**; o gráfico de OM da base viva tem oito barras e uma série. O caso confere o teto real, e o cabeçalho do teste explica.
- [X] T065 [P] [US6] Criar `tests/unidade/mascaras.test.ts` com os casos literais da v2.0: NIP `00.0000.00`; CPF `12345678901` → `123.456.789-01`; CEP `12345678` → `12345-678`; telefone com 11 e com 10 dígitos; RETELMA com 10 e com 8 dígitos; e a limpeza que devolve só os dígitos (`FR-024`, **o `FR-013` da spec 016 da v2.0, não o desta spec**, spec 025 US4) ✅ Casos literais da spec 025 (US4) e da 016 (NIP), mais a limpeza e a máscara sobre valor já mascarado.
- [X] T066 [P] [US6] Criar `tests/unidade/habilitacao.test.ts`: ministrar e ser responsável exigem vínculo ativo; avaliação e vista de prova **não** exigem (`FR-021`, `RN-INST-01`) ⚠️ a delimitação é a parte que se perde ✅ 6 casos, incluindo vínculo inativo e vínculo com outra disciplina.
- [X] T067 [P] [US6] Criar `tests/unidade/avisos-cadastro-instrutor.test.ts` com os dois avisos iniciais da T060, e um caso que acrescenta um terceiro aviso sem alterar a função que avalia a lista (`FR-027`, `RF-INSTR-09`) ✅ 6 casos; o terceiro aviso entra como dado, com tipo estendido, sem mudar a função.
- [X] T068 [P] [US6] Escrever em `tests/e2e/instrutores.spec.ts` os itens 2 a 9 do quickstart, passo 5: filtro de OM na URL **e** contagem mudando; categoria por cima operando sobre o resultado; URL em aba nova reproduzindo a tela; oito letras na busca gerando **uma** entrada de histórico; ficha em `/instrutores/<codigo>`; código inexistente distinguindo "não há" de "você não vê"; 4 indicadores e 7 gráficos, com as barras de posto/graduação em antiguidade; a listagem sem `ordem` exibindo a amostra da T004 em antiguidade; e **nenhuma** edição em linha (`FR-013`, `FR-025`, `FR-026`, `FR-027.4`, `FR-028`, `SC-007.1`, `SC-008`) ✅ 4 casos sobre amostra própria (chave de suíte `P`) mais um civil de outra OM que prova o E lógico: OM na URL muda a contagem de 11 para 10; categoria por cima dá 2 e exclui o de fora; aba nova reproduz; oito letras dão no máximo uma entrada de histórico; ficha por código sem uuid; código inexistente com `data-motivo=sem-dado`; 4 indicadores, 7 gráficos, barras de posto `CMG, CF, CC, CT, 1ºTen, SO, SC, SCNS, Outros`; listagem em antiguidade; zero controle de edição na grade. ⚠️ **Achou defeito**: a grade só ativava linha por teclado, e com mouse a ficha era inalcançável pela listagem — o nome virou link com `tabIndex={-1}`.

### Implementação da US6

- [X] T069 [P] [US6] Criar `lib/dominio/indicadores-instrutor.ts`, com a citação do `RF-INSTR-08` e do `FR-026.1` no topo; selecionados são os `instrutor_id` distintos com atribuição ativa em `turma_disciplina_instrutor` (`FR-026`, `FR-026.1`, achado 6 do Épico 2) ✅ `lib/dominio/indicadores-instrutor.ts`: quatro chaves; carga `null` se alguma leitura falhou.
- [X] T070 [P] [US6] Criar `lib/dominio/graficos-instrutor.ts`, que monta as 7 séries e ordena a de posto/graduação pela escala recebida por argumento (`FR-026.2`, `FR-026.3`, `FR-026.4`, `RN-ANT-01`) ✅ `lib/dominio/graficos-instrutor.ts`: posto pela escala recebida, "Outros" no fim, "Não informado" no fim para escolaridade e regime vazios.
- [X] T071 [P] [US6] Criar `lib/formato/mascaras.ts` com uma função pura por campo e a de limpeza (`FR-024`, documento 24 §`lib/formato/`) ✅ `lib/formato/mascaras.ts`.
- [X] T072 [P] [US6] Criar `lib/dominio/habilitacao.ts` com a citação literal do `RN-INST-01` no topo, incluindo a delimitação de avaliação e vista (`FR-021`, `RN-INST-01`) ✅ `lib/dominio/habilitacao.ts`, com `EXIGE_HABILITACAO` como `Record` sobre as quatro atuações.
- [X] T073 [P] [US6] Criar `lib/dominio/avisos-cadastro-instrutor.ts` com a lista da T060 como **dado extensível** — uma lista de regras avaliada por uma função única —, nunca como enum fixo (`FR-027`, `RF-INSTR-09`) ✅ `lib/dominio/avisos-cadastro-instrutor.ts`: chave `string`, regras em lista, `avisosDoCadastro` única.
- [X] T074 [US6] Criar a folha `app/(app)/instrutores/FiltrosDeInstrutores.tsx` sobre `FiltroAvancado` e o contrato da T020, e aplicar todos os filtros em `app/(app)/instrutores/page.tsx` na mesma consulta, em E lógico (`FR-025`, `FR-028`, `SC-008`) ⚠️ nenhum filtro por identificação civil ✅ `FiltrosDeInstrutores.tsx` sobre `FiltroAvancado`: busca, OM, categoria, capacitação, regime, escolaridade e situação, mais *Limpar filtros*. As opções de OM, categoria, capacitação e escolaridade vêm do cadastro inteiro (`opcoes.ts`), não do recorte. Sem contagem por opção: calculá-la exigiria reimplementar em memória os predicados da consulta.
- [X] T075 [US6] Exibir em `app/(app)/instrutores/page.tsx` os 4 indicadores com `CardKpi`, com a taxa de seleção mostrando os dois absolutos e o percentual como secundário (`FR-026`, `FR-026.1`) ✅ 4 `CardKpi`; a taxa mostra `habilitados × selecionados` no número grande e o percentual embaixo.
- [X] T076 [US6] Exibir em `app/(app)/instrutores/page.tsx` os 7 gráficos com os componentes de `components/graficos/`, na ordem do `FR-026.2`, com as barras de posto/graduação em antiguidade e a classificação lida de `categoria` (`FR-026.2`, `SC-007.1`) ✅ `PainelDeInstrutores.tsx`: 7 `GraficoBarras` na ordem do `FR-026.2`, cada um com `data-barras`. Categoria exibida como está na coluna (ver `paridade.md`).
- [X] T077 [US6] Exibir em `app/(app)/instrutores/page.tsx` o quadro de avisos de qualidade, sempre visível, nunca colapsado por padrão (`FR-027`, `RNF-USA-04`) ✅ `QuadroDeAvisos.tsx`: sem botão de recolher, diz quando não há aviso, nomes por `NomeInstrutor` com link para a ficha.
- [X] T078 [US6] Tratar em `app/(app)/instrutores/page.tsx` o filtro combinado sem resultado com `EstadoVazio`, distinguindo "não há" de "você não tem permissão de ver" (`FR-027.4`, `RN-DEG-01`) ✅ Recorte vazio: `sem-dado` para quem lê, `sem-permissao` para quem não lê, conferido pela matriz antes de dizer "não há".
- [X] T079 [US6] Completar a ficha em `app/(app)/instrutores/[codigo]/page.tsx` com as seções da v2.0 — identificação, lotação, formação e capacitação, avaliação —, e o nome de guerra em negrito no nome completo quando houver (`FR-023`, `FR-027.2`, `FR-031`) ✅ `FichaEmLeitura.tsx` com as quatro seções, para todo perfil que lê; o formulário fica embaixo, sob *Editar cadastro*. Data de calendário sem `Date` (`lib/formato/data.ts`, com o controle do dia a menos).
- [X] T080 [US6] Aplicar as máscaras da T071 em `app/(app)/instrutores/FormularioDeInstrutor.tsx` e a limpeza no esquema de `lib/validacao/instrutor.ts`; campo Estado com as 27 UFs e `RJ` pré-selecionado em modo cadastro (`FR-024`, spec 025 US4) ⚠️ valida-se o formato limpo, não o mascarado (documento 25) ✅ Máscara na digitação para NIP, CPF, telefone, RETELMA e CEP; Zod valida os dígitos e grava o formato **mascarado** canônico (6 casos novos). Estado com as 27 UFs. ⚠️ **Duas divergências registradas em `paridade.md`**: gravar mascarado diverge do exemplo do documento 25, porque o NIP migrado é mascarado em 157 de 157 linhas; e `RJ` **não** é pré-selecionado, porque o cadastro não tem seção de endereço e pré-selecionar na edição gravaria estado em quem nunca o informou.
- [X] T081 [US6] Acrescentar a `app/(app)/instrutores/FormularioDeInstrutor.tsx` o registro de preferências e restrições **gerais** como **texto livre** na coluna `preferencia` (`FR-030`, `RF-INSTR-06`, T061) ⚠️ as por turma e por disciplina ficam para depois da fatia (b) ✅ O campo de texto livre `preferencia` já estava no formulário desde a US2, na seção *Avaliação e preferências*.
- [X] T082 [US6] Criar a folha `app/(app)/instrutores/[codigo]/PainelDeDisciplinas.tsx` e, em `lib/acoes/instrutor.ts`, a Server Action `sincronizarHabilitacoes`, com `safeParse` do Zod **na primeira linha**, como na T036 e na T050, que cria vínculo novo e inativa o desmarcado, **nunca** apagando; o painel fica oculto por `SePodeVer` para quem não pode escrever o vínculo, e a negação é do banco (`FR-022`, `RN-INST-01`, `RN-INST-05`, spec 019 da v2.0) ⏸️ **TRAVADA em 15/09/2026**: criar vínculo novo exige gerar `instrutor_disciplina.codigo`, que não tem `default` no schema. O `RN-CRUD-03` (*Risco: Alto*) diz *"prefixo + número sequencial de 4 dígitos (ex. `REG-0001`)"*; o dado migrado, o comentário da coluna e o `mapa.py` do ETL dizem `VIN-NNNNNN`, **6** dígitos. Pela instrução de 15/09/2026, a lógica de `gerar_codigo()` não é fechada sem reportar a Bernardo. Nada da T082 foi escrito. ✅ **Destravada e feita em 15/09/2026** pelas T095 a T099: Bernardo decidiu `VIN-` + 6 dígitos, e o painel entrou **dentro do formulário**, não como folha separada da ficha.

**Ponto de conferência**: o percurso da T068 verde (quickstart, passo 5).

---

## Fase 8.1 — Emendas de 15/09/2026, depois da verificação com dado real

**Origem**: Bernardo conferiu a fatia no ambiente local com a base real do Épico 2 e decidiu destravar
a T011 e a T082 e restaurar partes da v2.0 que a spec tinha deixado de fora. *(decisão de Bernardo Villas Boas, 15/09/2026)*

**Ordem**: emendas e tarefas → implementação por bloco → verificação. Regra da v2.0 é lida na herança
e reimplementada fiel; detalhe que não está escrito em lugar nenhum **para e vira pergunta**.

### Bloco 1 — destravar a T011 e a T082

- [X] T090 👤 Registrar em `contracts/carga-horaria-e-alertas.md` as quatro respostas da T011, e as regras já escritas que completam a fórmula (`RN-MAT-05`, comentário de `ch_prevista_tempos`, `disciplinas.semanas`) (`FR-014`, `FR-016`, T011) ✅ Registrado nesta rodada: as quatro respostas, as regras escritas que completam a fórmula, e a pendência da semanal do instrutor.
- [X] T091 [US4] Escrever `supabase/migrations/<ts>_carga_prevista_por_instrutor.sql`: view `vw_instrutor_carga_prevista`, uma linha por atribuição ativa, com ano pela data de início prevista, tempos do instrutor pelo rateio do `RN-MAT-05` e média semanal = tempos ÷ `disciplinas.semanas`; e `vw_instrutor_carga_anual` recriada com `ta_previsto_ano` **no fim**, com os anos de fato **e** de previsão; `revoke` nas duas (`FR-014`, `RN-INST-04`, `RN-MAT-05`, T013, T014) ⚠️ `ta_previsto_semanal` **não** entra: espera a composição semanal do instrutor ✅ `20260915084854_carga_prevista_por_instrutor.sql`: `vw_instrutor_carga_prevista` por atribuição ativa (tdi e turma_disciplina ativas), rateio pelo `RN-MAT-05` com `herdar` resolvido na disciplina, média = tempos ÷ `disciplinas.semanas`; `vw_instrutor_carga_anual` com `ta_previsto_ano` no fim e anos de fato ∪ previsão. Base real: 96 atribuições de 35 instrutores, 6.207 tempos em 2026, todas no modo dividido. ⚠️ Sob RLS a view anual passou de 364 para 505 ms.
- [X] T092 [US4] Trocar os dois `todo` de `supabase/tests/094_carga_prevista_e_ordem.sql` por asserções reais, e acrescentar as nomeadas `RN-INST-04 · ta_previsto_ano conta só atribuições ativas, no ano da data de início prevista`, `RN-MAT-05 · modo dividido reparte e modo simultâneo dá a carga integral` e `T011 b · média semanal da atribuição = tempos ÷ semanas da janela prevista` (`FR-014`, `RN-MAT-05`) ⚠️ a asserção da semanal do instrutor (T014) fica `todo`, pela pendência ✅ 094 com plan(14): as duas pendentes viraram asserções reais, mais três nomeadas (ano pelo início, `RN-MAT-05` dividido/simultâneo/declarado, média semanal) e a I-8 da view nova. Só a semanal do instrutor segue `todo`.
- [X] T093 [P] [US4] Criar `lib/dominio/carga-horaria.ts` e `tests/unidade/carga-horaria.test.ts`: a semanal situada na faixa recebida por argumento, **com limites inclusivos** — 8 e 12 dentro, 7,9 e 12,1 fora —, 40h com 20h dentro e 20h com 14h acima (`FR-016`, `RN-2027-06`, `SC-006`, T054, T057) ⚠️ a função recebe a semanal pronta; como compô-la é a pendência ✅ `situarNaFaixa` com limites inclusivos; 6 casos, incluindo 7,99 e 12,01 e os dois lados do `SC-006`.
- [X] T094 [US4] Completar a T045: a ficha mostra a CH **prevista** do ano e as atribuições com a média semanal de cada uma, somente leitura (`FR-014`, `RF-INSTR-13`) ✅ `CargaDoInstrutor.tsx`: ministrada e prevista do ano, e a tabela de atribuições com janela, tempos, semanas e média de cada uma. Sem soma semanal e sem alerta, pela pendência.
- [X] T095 Escrever `supabase/migrations/<ts>_codigo_do_vinculo.sql`: sequência `app.instrutor_disciplina_codigo_seq`, função `app.proximo_codigo_vinculo()` que devolve `VIN-` + 6 dígitos e avança para depois do maior código existente, como `default` de `instrutor_disciplina.codigo` (`FR-022`, `RN-CRUD-03`, T082) ⚠️ divergência com o documento 04 (4 dígitos) anotada no cabeçalho, sem alterá-lo ✅ Na migration `20260915084857_codigo_do_vinculo_e_habilitacoes.sql`: sequência posicionada no maior `VIN` (798 na base real) e `default` da coluna.
- [X] T096 Escrever `public.sincronizar_habilitacoes(p_instrutor_id uuid, p_disciplinas uuid[])`, `SECURITY INVOKER`, numa transação: marcada e ativa não muda; marcada e inativa é **reativada**, não duplicada; marcada sem vínculo é criada; ativa desmarcada é **inativada**, nunca apagada; vínculo com disciplina **inativa** não é tocado (spec 019, `FR-009` a `FR-013`; `RN-INST-05`) ⚠️ a RLS filtra `UPDATE` em silêncio: a função confere a contagem e recusa com `42501` ✅ Na mesma migration, invoker, com porteiro de permissão e contagem de linhas contra o `UPDATE` filtrado; devolve criados, reativados e inativados.
- [X] T097 [P] Escrever `supabase/tests/096_codigo_e_habilitacoes.sql` (formato e sequência do código, reativar sem duplicar, inativar sem apagar, disciplina inativa intocada) e o bloco `FR-022 · painel de disciplinas` em `tests/invariantes/rls/rls.test.ts` (quem não edita instrutor é negado; controle positivo com o admin) (`FR-022`, `RN-INST-05`) ✅ `096` com 8 asserções; bloco `FR-022` com 4 casos por sessão real: criar e reativar sem duplicar, inativar sem apagar, disciplina inativa recusada, e visualização negada com `42501` sem nada mudar.
- [X] T098 Criar a Server Action `sincronizarHabilitacoes` em `lib/acoes/instrutor.ts`, Zod na primeira linha, e o painel `app/(app)/instrutores/PainelDeDisciplinas.tsx` **dentro do formulário**, no fim, em cadastro e edição: busca por nome e sigla do curso, rótulo "Disciplina (SIGLA)", pré-marcado com os vínculos ativos, gravado junto com o cadastro, depois do instrutor existir (spec 019, `FR-001` a `FR-008`, `FR-014`; spec 021, siglas) ⚠️ a busca é estado efêmero, fora da URL ✅ `sincronizarHabilitacoes` com Zod e `PainelDeDisciplinas.tsx` dentro do formulário, em cadastro e edição; `criarInstrutor` passou a devolver o `id` para o painel gravar depois do instrutor existir. Catálogo casado em memória (`catalogo.ts`).
- [X] T099 [P] Mostrar na ficha em leitura as disciplinas habilitadas, e escrever a ponta a ponta do painel: marcar, gravar com confirmação, desmarcar e conferir o vínculo inativo no banco (`FR-022`, spec 019) ✅ Ficha em leitura com "Disciplinas habilitadas"; ponta a ponta marca, grava com confirmação, confere `VIN-NNNNNN` no banco, recarrega marcado, desmarca e confere o vínculo inativo sem apagar.

### Bloco 2 — os filtros da v2.0

- [X] T100 Acrescentar ao contrato de `/instrutores` em `lib/navegacao/contrato.ts` os parâmetros `habilitado`, `selecionado`, `curso`, `classificacao`, `posto` e `circulo`, com os testes em `tests/unidade/contrato-de-parametros.test.ts` (`FR-025`, `FR-028`) ✅ Seis parâmetros no contrato (`posto`, `circulo`, `curso`, `classificacao`, `habilitado`, `selecionado`), todos `substitui` e avisando o servidor; teste de domínio de cada um.
- [X] T101 [P] Criar `lib/dominio/circulo-hierarquico.ts` com o mapa da spec 015 (research §4) e `lib/dominio/filtros-por-vinculo.ts`, que devolve os instrutores a incluir e a excluir por habilitado, selecionado, curso e classificação, com testes (`FR-025`, spec 015 `FR-005` a `FR-009`) ⚠️ habilitado e selecionado são conjuntos independentes ✅ `lib/dominio/circulo-hierarquico.ts` com o mapa da spec 015 e teste próprio. ⚠️ **Mudança de desenho durante a implementação**: a função de recorte por ids em TypeScript foi escrita e **removida** — com a base real, "não habilitado" virava `not in` com 175 ids na URL da interface de dados, e a consulta falhou na ponta a ponta. A regra passou para `vw_instrutores` (migration `20260915091717`: `habilitado`, `selecionado`, `cursos_vinculados`, `classificacoes_vinculadas`), com o pgTAP `097` provando as regras da spec 015.
- [X] T102 Aplicar os filtros novos em `app/(app)/instrutores/consulta.ts` e `page.tsx`, na mesma consulta, e a opção `nenhuma` de capacitação (`FR-025`, `FR-026.4`) ✅ `montarConsultaDeInstrutores` com predicados curtos na mesma consulta: `eq` booleano para habilitado e selecionado, `contains` para curso e classificação, `in` de postos para círculo, e `or` nulo/vazio para capacitação "nenhuma". Indicadores passaram a ler habilitado e selecionado da própria linha, o mesmo critério do filtro.
- [X] T103 Acrescentar os campos a `FiltrosDeInstrutores.tsx`: posto em antiguidade, curso pela sigla, as cinco classificações do glossário, círculo, habilitado, selecionado e "Nenhuma" em capacitação; e a ponta a ponta de dois filtros novos (`FR-025`, `SC-008`) ✅ Barra com posto em antiguidade, círculo, curso pela sigla, as cinco classificações do glossário (`CLASSIFICACOES_DE_CURSO_NA_BARRA`), habilitado, selecionado e "Nenhuma"; ponta a ponta com os números esperados da amostra: Oficiais 7, habilitados 2, selecionado e não habilitado 1, curso 3, nenhuma 7.

### Bloco 3 — gráficos e estatísticas

- [X] T104 Dar a `components/graficos/grafico-barras.tsx` cor por categoria e valor escrito em cada barra, e ao cartão dos gráficos a elevação pelo token de sombra, com o teste do componente atualizado (`FR-026.2`, documento 23 §7) ✅ `GraficoBarras` ganhou `corPorCategoria` (uma `Cell` com `var(--serie-N)` por categoria quando há uma série) e o valor escrito em cima de cada barra, junto do marcador de forma; os cartões dos gráficos usam `shadow-ciaara-1`. Suítes de gráficos e vitrine verdes (18 casos).
- [X] T105 Reescrever `lib/dominio/graficos-instrutor.ts` para os 9 gráficos — "Nenhuma" em capacitação, círculo com "Outros", índice de capacitação geral — e o de-para de classificação em `lib/constantes/instrutor.ts`, com os testes de contagem (`FR-026.2`, `FR-026.4`, `SC-007.1`) ✅ 9 gráficos em `lib/dominio/graficos-instrutor.ts`, cada um com `forma`: status de seleção (título da spec 021), "Nenhuma" em capacitação, círculo com "Outros", índice de capacitação geral com as duas fatias da spec 021 somando o total; de-para `ROTULO_DA_CATEGORIA` da spec 014 aplicado na exibição. 13 casos. ⚠️ Escolaridade segue em barras pela pendência do limite de 5 fatias; por isso a ponta a ponta conta 4 de barras e 5 de pizza até a decisão.
- [X] T106 Reduzir `lib/dominio/indicadores-instrutor.ts` a 3 indicadores e atualizar os testes (`FR-026`) ✅ 3 indicadores; teste confere que a CH do ano não está mais entre as chaves.
- [X] T107 Criar o botão de exibir/ocultar estatísticas, efêmero e começando recolhido, e atualizar `PainelDeInstrutores.tsx` e a ponta a ponta do passo 5 para 3 indicadores e 9 gráficos (`FR-026.5`, `SC-007.1`) ✅ `EstatisticasRecolhiveis.tsx`: começa recolhido, `aria-expanded`, conteúdo não montado quando fechado; ponta a ponta confere que abrir não mexe na URL, 3 cartões, 9 gráficos, valores escritos no status de seleção, duas cores por token e percentual na pizza.

### Bloco 4 — listagem e ficha

- [X] T108 Tirar a coluna de posto de `TabelaDeInstrutores.tsx` e renomear "Nome" para "Instrutor", ordenável por antiguidade (`FR-027.1` emendado, spec 020) ✅ Coluna "Instrutor" com `NomeInstrutor`, chave `posto` ordenando por `ordem_antiguidade`; colunas conferidas na ponta a ponta: Instrutor, Categoria, OM, Regime e CH do ano.
- [X] T109 Conferir o diálogo do `FR-011` em todo caminho de gravação, inclusive `Enter` num campo, e corrigir o que faltar, com caso de ponta a ponta (`FR-011`) ✅ Conferido: o formulário não tem botão de envio, então `Enter` num campo não grava; o caso de ponta a ponta prova com `Enter` no nome de guerra e na busca do painel, sem diálogo e sem gravação. O painel grava pelo mesmo diálogo de "Gravar alterações"; desativar e reativar têm o próprio. Nenhum caminho sem confirmação encontrado.
- [X] T110 Mover "Desativar instrutor" para o fim da página, ao lado de "Gravar alterações", com formato parecido (`FR-008`, posição apenas) ✅ `AcoesDeInstrutor` saiu do cabeçalho e entrou no rodapé do formulário, ao lado de "Gravar alterações"; ponta a ponta confere a posição.
- [ ] T111 ⏸️ Ficha A4 com "Gerar ficha" e impressão pelo navegador (`FR-031` emendado) — **parada**: o layout da v2.0 depende dos dois brasões de `SIS11/modelos/Ficha de cadastro/images/`, que não estão no repositório **Conferência de 15/09/2026, a pedido de Bernardo — continua parada**: `image1.png` é captura de tela do brasão do CIAARA, e o oficial já está em `public/marca/brasao-ciaara-impressao.png`; `image2.png` é o selo verde "Marinha do Brasil — Hidrografia e Navegação", que **não está** no repositório. Sem os dois não se implementa nem se improvisa.

### Fechamento

- [X] T112 Atualizar `paridade.md` e `quickstart.md` com as decisões de 15/09/2026 ✅ `paridade.md` reescrita com as decisões de 15/09/2026 e uma tabela das seis pendências abertas; `quickstart.md` com o passo 4 atualizado e os itens 10 a 12 do passo 5.
- [X] T113 Rodar `pnpm verificar` a cada bloco e `pnpm verificar:tudo` ao fim ✅ `pnpm verificar` verde ao fim de cada bloco; `pnpm verificar:tudo` saiu **0** no commit `bb43822`: 496 de unidade · 148 pgTAP (1 `todo`, a semanal do instrutor) · 131 RLS · 147 ponta a ponta (2 pulados). ⚠️ A conferência com o CI não foi feita: exige push, que não houve.

## Fase 8.2 — Fechamento de 15/09/2026: as seis pendências decididas

**Origem**: Bernardo decidiu as seis pendências da Fase 8.1 *(decisão de Bernardo Villas Boas, 15/09/2026)*. Onde a decisão mandava parar, a
parte parou e o resto seguiu.

- [X] T114 [US4] Criar `lib/dominio/carga-semanal.ts` e `tests/unidade/carga-semanal.test.ts`: a carga semanal do instrutor numa semana ISO é a soma das médias das atribuições ativas cuja janela prevista cobre a semana; semana sem atribuição não é computada; somar o ano inteiro é proibido (`FR-016`, `RN-2027-06`, T014) ✅ `semanaIsoDe`, `cargaPorSemana` e `semanasForaDaFaixa`, 10 casos: janelas que não se tocam, janelas sobrepostas, exatamente 8 e 12 dentro, sem atribuição, sem faixa, janela ou média ausente, e a virada de ano ISO. O `todo` do `094` foi trocado por asserções reais (T014).
- [X] T115 [US4] Exibir os alertas do `FR-016` e do `FR-017` na ficha, sem bloquear (`FR-016`, `FR-017`, `FR-018`, T058, T059) ✅ ver T058 e T059.
- [X] T116 [US4] Acrescentar o aviso `sem-data-docencia` a `AVISOS_INICIAIS` em `lib/dominio/avisos-cadastro-instrutor.ts`, com teste, e a coluna `data_inicio_docencia_ciaara` à consulta da listagem (`FR-017`, `FR-027`, T053) ✅ O aviso cobra quem está sem a data **e** sem capacitação — é para esses que o alerta precisaria da data; ⚠️ esse recorte é **leitura aplicada, a confirmar por Bernardo** (checklist `fechamento.md`, CHK004). Base real: 176 de 177 sem a data, **148** também sem capacitação.
- [X] T117 [US2] Tornar especialidade/habilitação opcional em `lib/validacao/instrutor.ts`, `lib/acoes/instrutor.ts` e `FormularioDeInstrutor.tsx`, recusando texto só com espaços, com emenda ao `FR-005` e ao `RN-INST-03` na spec (`FR-005`, `RN-INST-03`) ✅ Quatro obrigatórios; `ESPECIALIDADE_EM_BRANCO` para o `CHECK` do banco; ponta a ponta com militar sem especialidade salvando. Os 15 da base real são **todos militares** (12 da ativa, 3 do Magistério Militar Naval): o aviso de obrigatório pendente continua cobrando a especialidade deles, e nenhuma delimitação para civil foi registrada.
- [X] T118 Registrar no `FR-026.2` e no contrato que a escolaridade fica em barras, e emendar o `SC-007.1` para 4 barras e 5 pizzas (`FR-026.2`, `SC-007.1`) ✅ Decisão "não reabrir" anotada nos dois.
- [ ] T119 ⏸️ Legenda clicável (`FR-026.6`) — **parada em 15/09/2026**: o código real da v2.0 foi lido em `SIS11/CIAARA-11-v2`, e `renderizarGrafico_` (`src/frontend/_Comum.html`, linhas 253 a 264) não configura legenda nem evento; a busca por `legend`, `onItemClick`, `toggleDataSeries`, `dataPointSelection` e `events:` em `src/frontend/` e `appsscript/` não achou nada. Não se inventa: vira requisito novo, que Bernardo define.
- [X] T120 Rodar `/speckit-checklist` sobre a spec 006, corrigir o que for mecânico e listar o que pede decisão ✅ `checklists/fechamento.md`, 22 itens: 14 passam e 8 pedem decisão ou insumo (CHK004, CHK005, CHK008, CHK012, CHK019, CHK020, CHK021, CHK022). Correções mecânicas: US2, `SC-003`, *Key Entities* e `data-model.md` com quatro obrigatórios; US4 e `SC-006` com a previsão por semana e o cenário da data vazia; item 7 nas regras estranhas; e o recorte do aviso `sem-data-docencia` separado da decisão, como leitura a confirmar.
- [ ] T121 Atualizar `paridade.md`, `quickstart.md` e a seção *Estado atual e onde retomar* do `CLAUDE.md` (T088)
- [ ] T122 Recarregar a base real do ETL no banco local e recriar a conta de Bernardo pelo fluxo de convite, depois do PR aberto

---

## Fase 9 — Fechamento

- [X] T083 [P] Criar `tests/unidade/nome-padronizado.test.ts`: varredura de `app/` e `components/`, em código sem comentário, que exige que todo nome de instrutor exibido passe por `NomeInstrutor` ou `nomeEmTexto`, com controle positivo (`FR-019`, `FR-020`, `SC-005`) ✅ `nome-padronizado.test.ts`: três moldes de exibição crua (filho de JSX, interpolação, atributo de texto). Defeito deliberado (`<span>{i.nome_completo}</span>` num arquivo de tela): reprovou apontando o arquivo.
- [X] T084 [P] Criar `specs/006-cadastro-de-instrutores/paridade.md` com a tabela §4 do documento 06 — as specs `014`, `015`, `016`, `019`, `020`, `025`, `036` e `038` — e o endereço de cada refinamento na v2.1, **nenhum** sem resposta, inclusive a `038`: *"a edição em linha continua removida"* (`SC-007`, quickstart passo 9) ✅ `paridade.md`: as oito specs, cada refinamento com endereço, divergência ou travamento. As diferenças que pedem decisão estão marcadas 🟨 e ⏸️.
- [ ] T085 Rodar `pnpm verificar:tudo` e conferir que o CI de `.github/workflows/ci.yml` dá **veredito idêntico** sobre o mesmo commit (`SC-009`, quickstart passo 8) ⚠️ verde local e vermelho no CI é defeito da verificação, e vira tarefa ⏸️ **METADE LOCAL FEITA em 15/09/2026**, sobre o commit `2af1278`: `pnpm verificar:tudo` saiu **0** — 465 de unidade · 130 pgTAP (2 `todo` da T011) · 127 RLS · 143 ponta a ponta (2 pulados). **A metade do CI não foi feita**: exige push do ramo, e não houve push por instrução de 15/09/2026.
- [ ] T086 Listar na descrição do PR, sem corrigir, o achado R-8 (dez views do Épico 1 com `INSERT`/`UPDATE` para `authenticated`) e as seis regras que pareceram estranhas na spec (`CLAUDE.md` regra 1, research R-8)
- [ ] T087 👤 Aplicar as migrations desta fatia, de `supabase/migrations/`, no projeto remoto **só com autorização de Bernardo**, porque ele é ao mesmo tempo preview e Production, com os planos de reversão prontos no PR (`FR-016.1` da spec 001 e sua exceção de 15/09/2026, Definition of Done item 6, D-8)
- [ ] T088 Atualizar a seção *Estado atual e onde retomar* do `CLAUDE.md` com o fechamento da fatia e os achados D-1 a D-8 (`CLAUDE.md`, instrução no topo da seção)
- [ ] T089 Abrir o PR com o modelo de `.github/pull_request_template.md` inteiro preenchido, incluindo o plano de reversão de cada migration desta fatia (Definition of Done item 6, *Convenções de commit*)

---

## Dependências

| Fase ou tarefa | Depende de |
|---|---|
| Fase 2 inteira | Fase 1 |
| **Bloco A** (T005–T010) | só da Fase 1; sai em PR próprio |
| T013 | T011 (c) para `ta_previsto_ano`; a `ordem_antiguidade` não depende |
| T014 | T011 inteira |
| T018 | T016 sem linha em branco nem código não inteiro |
| **US1** (Fase 3) | T013 (`ordem_antiguidade`), T020 |
| **US2** (Fase 4) | Blocos A e C, T020; a T040 depende do Bloco A |
| **US3** (Fase 5) | T013, T028 (a listagem) e T039 (a ficha) |
| **US5** (Fase 6) | T039 (a ficha) |
| **US4** (Fase 7) | T011, T014, T053 e T039 |
| **US6** (Fase 8) | T028, T037 e T039; a T067, a T073 e a T077 dependem da T060; a T081 da T061; a T082 da T062 |
| Fase 9 | todas as histórias; a T087 depende de autorização |

**Ordem das histórias**: US1 → US2 → US3 → US5 → US4 → US6. Ela segue a sequência por risco do
plano, e não a numeração da spec: a US4 depende de duas decisões, e a US5 não.

---

## O que dá para fazer em paralelo

- **Na Fase 1**: T002, T003 e T004.
- **Na Fase 2**: o Bloco A inteiro corre em outro ramo enquanto os Blocos B, C e D avançam; dentro
  deles, T007, T012, T017, T021 e T022.
- **US1**: T023, T024, T025 e T026 juntos; depois T030 junto da T028.
- **US2**: T032, T033 e T034 juntos; T041 a qualquer momento depois da T039, e T041.1 depois da T038.
- **US5**: T046, T047 e T048 juntos.
- **US4**: T054, T055 e T056 juntos, depois da T053.
- **US6**: os seis testes T063 a T068 juntos, e as cinco funções puras T069 a T073 juntas.

---

## Escopo mínimo entregável

1. **O Bloco A sozinho** já é entrega: fecha a escrita de CPF, RG, telefone e endereço por dois
   perfis que não os leem. É o maior risco da fatia e não espera tela nenhuma.
2. **MVP da fatia**: Fase 2 + **US1**. A listagem existe, está no menu e ordena por antiguidade no
   banco.
3. **Incremento seguinte**: **US2 e US3**, as duas outras P1. Cadastro que recusa ficar pela metade
   e carga horária que só se lê.
4. **Paridade**: US5, US4 e US6, nessa ordem.

---

## Contagem

| Fase | Tarefas |
|---|---|
| 1 — Preparação | 4 |
| 2 — Fundação | 18 |
| 3 — US1 | 9 |
| 4 — US2 | 11 |
| 5 — US3 | 4 |
| 6 — US5 | 7 |
| 7 — US4 | 7 |
| 8 — US6 | 23 |
| 8.1 — Emendas de 15/09/2026 | 24 |
| 8.2 — Fechamento de 15/09/2026 | 9 |
| 9 — Fechamento | 7 |
| **Total** | **123** |

👤 **Cinco tarefas dependem de Bernardo**: T002, T003, T011, T053 e T087. Outras duas — T016 e
T062 — são conferências que **só param** se o que medirem exigir decisão. *(Atualizado em
15/09/2026: a T060 e a T061 deixaram de depender de decisão, e a T041.1 foi acrescentada.)*
