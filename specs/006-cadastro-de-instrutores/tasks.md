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

- [ ] T001 Conferir o ponto de partida do quickstart, passo 0: ramo `feat/EPICO-5c-cadastro-de-instrutores`, `.specify/feature.json` apontando para `specs/006-cadastro-de-instrutores`, e `pnpm db:start && pnpm db:reset && pnpm db:tipos:conferir` saindo 0 (research R-9)
- [ ] T002 [P] 👤 Emendar o `SC-010` em `specs/006-cadastro-de-instrutores/spec.md` para comparar colunas com `SELECT` contra a **união** de `UPDATE` e `INSERT` (`FR-032`, `SC-010`, research R-4) ⚠️ é emenda de redação do critério, não de regra; aplicar só com a confirmação de Bernardo registrada na própria linha
- [ ] T003 [P] 👤 Emendar a *Assumption 1* em `specs/006-cadastro-de-instrutores/spec.md` com o número real de migrations desta fatia — **três**, pela Fase 2, ou **quatro** se a T014 sair depois da T013 mesclada — (`FR-032`, `FR-014`, `FR-005`, `FR-007`, research R-7, D-3, D-4) ⚠️ mesma regra da T002
- [ ] T004 [P] Criar `tests/e2e/instrutores-de-teste.ts` com semeadura **por processo de trabalho** e códigos únicos, no molde de `tests/e2e/panorama-de-teste.ts` (research R-9). A amostra MUST conter: postos diferentes; **dois do mesmo posto** com antiguidade declarada distinta; **um `SC` e um `SCNS`**; um posto **fora da escala**; um 20h com 14h previstas e um 40h com 20h previstas; um com **duas** capacitações; um com o campo de capacitação **vazio** e docência iniciada há mais de um ano; um **selecionado sem habilitação ativa**; um com **aula lançada**; um **inativo**; um **vinculado a conta de acesso** (`SC-001`, `SC-004`, `SC-006`, `FR-026.1`, `FR-026.4`) ⚠️ **nunca o ETL**: ele carrega CPF, RG, telefone e endereço reais

**Ponto de conferência**: `pnpm verificar` sai 0.

---

## Fase 2 — Fundação (bloqueia todas as histórias)

### Bloco A — o recorte de escrita do dado pessoal (`FR-032`, `FR-033`)

⚠️ **Sai em PR próprio, a partir da `main`** (plano, sequência 1): amarrar uma correção de segurança
à fatia inteira faz ela esperar a fatia inteira.

- [ ] T005 Criar o ramo `db/FR-032-recorte-escrita-dado-pessoal` a partir da `main` para as tarefas T006 a T010, e trazer o resultado de volta a este ramo depois do merge (plano, sequência 1)
- [ ] T006 Escrever em `tests/invariantes/rls/rls.test.ts` o bloco `FR-032 · recorte de escrita do dado pessoal`, com N-1 (`encarregado_orientacao_pedagogica` **não** grava `cpf`), N-2 (`ajudante_orientacao_pedagogica` **não** grava `endereco_cep`), N-3 (os três autorizados gravam `cpf` pela função) e N-5 (os cinco perfis com `editar` gravam as 33 colunas funcionais) (`FR-033`, `I-2`, `I-3`, contrato recorte-de-escrita) ⚠️ **N-3 e N-5 são controle positivo**: sem elas, um recorte que nega todo mundo passaria. Precisa reprovar antes da T008
- [ ] T007 [P] Escrever `supabase/tests/093_recorte_escrita_instrutor.sql` com a asserção nomeada `FR-032 · colunas com SELECT = colunas com UPDATE ∪ INSERT para authenticated` (`N-4`, `I-1`, `SC-010` emendado) ⚠️ comparar só `SELECT` × `UPDATE` sai verde com o `INSERT` aberto
- [ ] T008 Escrever `supabase/migrations/<ts>_recorte_escrita_dado_pessoal.sql` (gerar com `pnpm db:migration`): **primeiro** `revoke update, insert on public.instrutores from authenticated`, **depois** `grant update (…33…), insert (…33…) on public.instrutores to authenticated` (`FR-032`, `SC-010`, contrato recorte-de-escrita) ⚠️ a ordem é obrigatória: `revoke` de coluna não tem efeito com privilégio de tabela, e a migration invertida roda sem erro e não protege nada. Cabeçalho com o plano de reversão do contrato e a nota de que reverter devolve a escrita de PII a dois perfis que não a leem
- [ ] T009 Na mesma migration, criar `app.gravar_dados_pessoais_instrutor(...)` `SECURITY DEFINER`, com `search_path` fixo e o porteiro `app.pode('instrutores','editar') and app.perfil_atual() in ('admin','encarregado_administracao_academica','ajudante_administracao_academica')`, e o invólucro de uma linha em `public` que a interface de dados consegue chamar (`FR-032`, contrato recorte-de-escrita) ⚠️ as duas condições **somam**. ⚠️ `revoke ... from public` **não** remove `anon` — revogar dos dois, como o PR #12 mediu. ⚠️ o schema `app` não é servido pela interface de dados, daí o invólucro
- [ ] T010 Rodar `pnpm db:reset && pnpm db:tipos`, depois `pnpm test:rls` e `pnpm test:invariantes`; conferir por **defeito deliberado** — repor `grant update, insert on public.instrutores to authenticated`, ver N-1, N-2 e N-4 reprovarem, desfazer — e registrar as duas execuções no PR (`FR-032`, `FR-033`, quickstart, passo 1) ⚠️ portão nunca visto reprovando é afirmação, não prova

### Bloco B — a carga prevista e a ordem de antiguidade no caminho de leitura (`FR-014`, `FR-001`)

- [ ] T011 👤 Levar a Bernardo, e registrar a resposta em `specs/006-cadastro-de-instrutores/contracts/carga-horaria-e-alertas.md`: (a) a conversão de tempo de aula em hora; (b) o divisor que torna a prevista anual em semanal; (c) qual data põe uma atribuição de `turma_disciplina_instrutor` num ano; (d) se os limites da faixa são inclusivos (`FR-016`, `RF-INSTR-13`, `RF-INSTR-14`, `RN-2027-06`, D-1, D-2) ⚠️ **a T013 depende de (c); a T014 e a Fase 7 (US4) inteira dependem de tudo**. Não inventar: um divisor escolhido por conveniência vira alerta falso em 160 instrutores de 20h
- [ ] T012 [P] Escrever `supabase/tests/094_carga_prevista_e_ordem.sql` com amostra semeada no próprio teste e as asserções nomeadas: `RN-ANT-01 · em vw_instrutores ordenada por ordem_antiguidade, todo militar vem antes de todo civil` (`SC` e `SCNS`, peso 13); `RN-ANT-01 · dois instrutores do mesmo posto saem na ordem da antiguidade_declarada, e quem não a declara fica no fim do próprio posto`; `RN-ANT-01 · posto fora da escala vai para o fim da lista, depois dos civis` (peso 999 de `app.fn_peso_posto`); `RN-INST-04 · vw_instrutor_carga_anual traz ta_ministrado_ano e ta_previsto_ano`; `RN-INST-04 · ta_previsto_ano soma ch_prevista_tempos só das atribuições ativas`; e `I-8 · as duas views não concedem insert, update, delete nem truncate a authenticated` (`FR-001`, `FR-002`, `FR-014`, `FR-015`, `RN-ANT-01`, `RN-ANT-02`, D-5) ⚠️ **corrigida em 15/09/2026** (análise C2): a versão anterior só conferia que a coluna existia, o que é cobertura fingida de uma regra de *Risco: Alto*. ⚠️ as asserções de `ta_previsto_ano` dependem da T011 (c); se ela não fechar, ficam como stub explicitamente pendente
- [ ] T013 Escrever `supabase/migrations/<ts>_carga_prevista_por_instrutor.sql`: `create or replace view` de `vw_instrutor_carga_anual` acrescentando **ao fim** `ta_previsto_ano`, e de `vw_instrutores` acrescentando **ao fim** `ordem_antiguidade` por `app.fn_antiguidade_ordem(i.id)`; repetir o `revoke delete, truncate, insert, update ... from authenticated` nas duas (`FR-014`, `FR-001`, `RN-INST-04`, `RN-ANT-01`, research R-7, R-8, D-5) ⚠️ `create or replace view` só aceita coluna nova **no fim**. ⚠️ VIEW, nunca coluna gravada (`FR-015`). ⚠️ se a T011 atrasar, a `ordem_antiguidade` sai sozinha e a `ta_previsto_ano` vem com a T014
- [ ] T014 Acrescentar `ta_previsto_semanal` a `vw_instrutor_carga_anual` com a fórmula que a T011 registrar, e a asserção nomeada `RN-2027-06 · ta_previsto_semanal segue a fórmula registrada` em `supabase/tests/094_carga_prevista_e_ordem.sql` (`FR-016`, `RN-2027-06`) ⚠️ depende da T011. Se a T013 já estiver mesclada, é migration nova, não edição
- [ ] T015 Rodar `pnpm db:reset && pnpm db:tipos` e `pnpm test:invariantes`; conferir em `lib/tipos/database.ts` que as colunas novas existem (`FR-014`, `FR-001`, quickstart, passo 4) ⚠️ coluna que o TypeScript não conhece é, quase sempre, coluna inventada

### Bloco C — os cinco obrigatórios e o código gerado (`FR-005` a `FR-007`)

- [ ] T016 Medir, na base carregada pelo ETL do Épico 2 (`python -m scripts.etl.executar` contra o banco local), quantas linhas de `instrutores` têm um dos cinco obrigatórios só com espaços e quantos `codigo` não são inteiros; registrar os dois números no cabeçalho da migration da T018 (`RN-INST-03`, `RN-CRUD-03`, D-3, D-4) ⚠️ **se algum for maior que zero, parar e perguntar**: o `CHECK` falharia na carga, e a saída conhecida — a catraca do achado 3 do Épico 2 — é decisão, não padrão
- [ ] T017 [P] Escrever `supabase/tests/095_obrigatorios_e_codigo_instrutor.sql` com as asserções nomeadas `RN-INST-03 · cada um dos cinco obrigatórios é recusado vazio e só com espaços` (dez casos) e `RN-CRUD-03 · instrutor inserido sem codigo recebe inteiro simples, sem prefixo, maior que o maior existente` (`FR-005`, `FR-006`, `FR-007`, `I-5`, `SC-003`)
- [ ] T018 Escrever `supabase/migrations/<ts>_obrigatorios_e_codigo_instrutor.sql`: `check (btrim(<coluna>) <> '')` em `posto_graduacao`, `esp_hab_obs`, `nome_completo`, `categoria` e `om`, e geração do `codigo` como inteiro simples por sequência iniciada acima do maior código existente, como `default` da coluna (`FR-005`, `FR-006`, `FR-007`, `RN-INST-03`, `RN-CRUD-03`) ⚠️ **migration não prevista no plano** (D-3, D-4): o cabeçalho diz por quê e traz o plano de reversão. ⚠️ o `CHECK` é do banco porque o `FR-006` exige que a recusa valha por qualquer caminho. ⚠️ **sequência, e não gatilho, por decisão de 15/09/2026**: o cabeçalho registra a divergência com o artefato `gerar_codigo()` do documento 04, como no data-model
- [ ] T019 Rodar `pnpm db:reset && pnpm db:tipos` e `pnpm test:invariantes`, e conferir o `default` de `codigo` em `lib/tipos/database.ts` (`FR-005`, `FR-007`, quickstart, passo 7)

### Bloco D — o contrato das rotas

- [ ] T020 Declarar em `lib/navegacao/contrato.ts` a rota `/instrutores` com os oito parâmetros da tabela do contrato — `busca`, `om`, `categoria`, `capacitacao`, `regime`, `escolaridade`, `situacao` (padrão `ativo`) e `ordem` —, a rota `/instrutores/[codigo]` sem parâmetro, e a rota `/instrutores/novo` sem parâmetro (`FR-028`, `RF-NAV-01`, `RF-INSTR-01`, `RF-INSTR-02`, `RF-INSTR-10`, contrato parametros-instrutores, D-6) ⚠️ todo filtro `substitui` e avisa o servidor; `busca` com `LIMITE_DE_FREQUENCIA_MS`; `ordem` é o único que **não** avisa o servidor
- [ ] T021 [P] Registrar a rota `/instrutores/novo` em `specs/006-cadastro-de-instrutores/contracts/parametros-instrutores.md`, com a origem `RF-INSTR-02` e o motivo de ela não constar da Fase 1 (D-6)
- [ ] T022 [P] Estender `tests/unidade/contrato-de-parametros.test.ts` para as três rotas: histórico `substitui` e aviso ao servidor em todo filtro, `ordem` sem aviso, padrão não vazio só em `situacao`, e **nenhum** parâmetro com nome de coluna de identificação civil ou residência (`FR-028`, `SC-008`, contrato parametros-instrutores §recusas) ⚠️ CPF na barra de endereço vaza por histórico, por log e por ombro

**Ponto de conferência**: `pnpm verificar:tudo` sai 0 com as migrations da Fase 2 aplicadas e nenhuma tela nova.

---

## Fase 3 — História 1 (P1): a ordem é sempre a da antiguidade 🎯 MVP

**Objetivo**: toda lista, seletor e filtro de instrutor nasce ordenado por antiguidade, sem depender
de o autor lembrar.

**Teste independente**: enumerar **todas** as ocorrências de lista, seletor e filtro de instrutor no
repositório e conferir cada uma — não por amostragem (`SC-001`).

### Testes da US1

- [ ] T023 [P] [US1] Estender `tests/unidade/antiguidade.test.ts` só com os casos que ainda faltarem: `SC` e `SCNS` depois de todo militar, desempate entre dois civis pela antiguidade declarada, e posto fora da escala **não** indo ao topo (`FR-002`, `RN-ANT-02`, quickstart passo 3) ⚠️ conferir antes o que a fatia (b) do Épico 4 já cobre; caso duplicado é ruído
- [ ] T024 [P] [US1] Criar `tests/unidade/ordenacao-de-instrutor.test.ts`: varredura de `app/`, `components/` e `lib/`, **em código sem comentário**, que enumera toda lista, seletor e filtro de instrutor e exige que cada ocorrência passe por `ordenarPorAntiguidade`, por `SeletorInstrutor` ou por consulta com `ordem_antiguidade`, com controle positivo (`FR-001`, `FR-004`, `SC-001`, `I-7`) ⚠️ três varreduras da fatia (b) reprovaram lendo a própria documentação como violação
- [ ] T025 [P] [US1] Criar `tests/unidade/escala-de-antiguidade.test.ts` para a função da T027: 14 linhas de `config_listas` viram 14 pesos, `SC` e `SCNS` empatam em 13, linha inativa não entra (`FR-003`, research R-5)
- [ ] T026 [P] [US1] Criar `tests/unidade/consulta-de-instrutores.test.ts` para a função de montagem da T028: com qualquer valor de `ordem`, inclusive `nome`, a consulta montada pede `order by ordem_antiguidade` e **não** ordena por outra coluna; e os filtros entram na mesma consulta (`SC-001`, `RN-ANT-01`, `FR-001`, contrato parametros-instrutores §Ordenação) ⚠️ **corrigida em 15/09/2026** (análise H4): a versão anterior pedia ao Playwright que observasse a consulta, que sai do servidor e não passa pelo navegador. O percurso visível — a amostra da T004 em antiguidade — continua na T068

### Implementação da US1

- [ ] T027 [US1] Acrescentar a `lib/dominio/antiguidade.ts` a função pura que monta a `EscalaDeAntiguidade` a partir das linhas de `config_listas` da lista `escala_antiguidade`, com a citação literal do `RN-ANT-02` no topo (`FR-003`, research R-6) ⚠️ acrescentar, não reescrever: a escala continua chegando por argumento
- [ ] T028 [US1] Criar `app/(app)/instrutores/consulta.ts`, sem `"use client"` e sem I/O próprio, com a função que recebe o construtor de consulta e os parâmetros e monta a leitura de `vw_instrutores` com `order by ordem_antiguidade`; e `app/(app)/instrutores/page.tsx` (Server Component), que a executa e entrega a lista à `TabelaDensa` controlada, com as colunas posto/graduação, nome (`NomeInstrutor`), categoria, OM e regime (`FR-001`, `FR-019`, `FR-020`, `FR-027.1`, `RN-ANT-01`, research R-10) ⚠️ ler `vw_instrutores`, **nunca** `instrutores`: `select *` na tabela falha com `permission denied` e manda procurar a RLS, que não é a causa. ⚠️ nenhum `await` em laço
- [ ] T029 [US1] Criar a folha de cliente `app/(app)/instrutores/TabelaDeInstrutores.tsx`, que aplica `ordem` **por cima** da antiguidade recebida, sem tocar na consulta (`FR-001`, contrato parametros-instrutores §Ordenação) ⚠️ `"use client"` só aqui, nunca no `page.tsx`
- [ ] T030 [P] [US1] Criar `app/(app)/instrutores/loading.tsx` com `EsqueletoTabela` e `app/(app)/instrutores/error.tsx` com a mensagem de degradação (`RN-DEG-01`)
- [ ] T031 [US1] Virar `disponivel: true` na entrada Instrutores de `lib/navegacao/menu.ts`, **no mesmo commit** da T028 (`RF-NAV-02`, `RF-INSTR-01`, contrato parametros-instrutores §As duas rotas) ⚠️ o teste do shell confere os dois sentidos e reprova se a tela nascer com o menu dizendo "em breve"

**Ponto de conferência**: `pnpm test:unidade` e `pnpm test:e2e tests/e2e/instrutores.spec.ts` verdes (quickstart, passo 3).

---

## Fase 4 — História 2 (P1): o cadastro não aceita ficar pela metade

**Objetivo**: salvar sem posto, especialidade, nome, categoria ou OM é recusado, pela tela e por
fora dela.

**Teste independente**: tentar salvar sem cada um dos cinco campos, e por caminho que não seja a tela
(`SC-003`).

### Testes da US2

- [ ] T032 [P] [US2] Criar `tests/unidade/validacao-instrutor.test.ts`: o esquema recusa cada um dos cinco vazio e só com espaços, e a mensagem diz **qual** campo falta (`FR-005`, `RN-INST-03`, US2 cenários 1 e 2)
- [ ] T033 [P] [US2] Escrever em `tests/invariantes/rls/rls.test.ts` o bloco `FR-029 · autoria vem da sessão`: escrita autenticada em `instrutores` grava `criado_por`/`editado_por` com o usuário da sessão, e o valor enviado pelo cliente é ignorado (`FR-029`, `RF-INSTR-12`)
- [ ] T034 [P] [US2] Escrever em `tests/e2e/instrutores.spec.ts` o percurso de cadastro: cada obrigatório ausente é recusado com o nome do campo, a confirmação aparece antes de salvar, e depois da recusa **nada** foi salvo (`FR-005`, `FR-011`, US2 cenário 3, quickstart passo 7)

### Implementação da US2

- [ ] T035 [US2] Criar `lib/validacao/instrutor.ts`: esquema Zod com os cinco obrigatórios aparados e com mensagem por campo, e as colunas funcionais opcionais (`FR-005`, `RN-INST-03`) ⚠️ nenhum campo de carga horária no esquema (`FR-015`)
- [ ] T036 [US2] Criar `lib/acoes/instrutor.ts` com as Server Actions `criarInstrutor` e `editarInstrutor`: `safeParse` na primeira linha, escrita das colunas funcionais pelo cliente de servidor, dado pessoal só pelo invólucro da T009, e a recusa do `CHECK` traduzida para o campo (`FR-005`, `FR-006`, `FR-012`, `FR-032`) ⚠️ **nunca** `service_role`: ela é para convite, ETL e manutenção
- [ ] T037 [US2] Criar a folha `app/(app)/instrutores/FormularioDeInstrutor.tsx`: os cinco obrigatórios com `CampoObrigatorio`, `DialogoConfirmacao` antes de salvar, e **nenhum** campo de carga horária (`FR-005`, `FR-011`, `FR-015`)
- [ ] T038 [US2] Criar `app/(app)/instrutores/novo/page.tsx`, que monta o formulário em modo cadastro e só aparece para quem pode `criar` (`FR-005`, `RF-INSTR-02`, D-6)
- [ ] T039 [US2] Criar `app/(app)/instrutores/[codigo]/page.tsx` com a ficha mínima e o formulário em modo edição, **todos os campos carregados** com o valor salvo; código inexistente e código fora de alcance respondem com `EstadoVazio` de motivos diferentes (`FR-012`, `FR-027.3`, `FR-027.4`, `FR-031`) ⚠️ o `id` uuid nunca aparece na URL nem na tela
- [ ] T040 [US2] Em `app/(app)/instrutores/FormularioDeInstrutor.tsx`, mostrar a seção de identificação civil e residência **só** a quem a lê — leitura por `vw_instrutor_dados_pessoais` — e gravá-la pela ação da T036 (`FR-032`) ⚠️ quem não vê, não escreve: o campo não existe na tela de quem não o lê
- [ ] T041 [P] [US2] Criar `app/(app)/instrutores/[codigo]/loading.tsx` e `app/(app)/instrutores/[codigo]/error.tsx` (`RN-DEG-01`)
- [ ] T041.1 [P] [US2] Criar `app/(app)/instrutores/novo/loading.tsx` e `app/(app)/instrutores/novo/error.tsx`, iguais aos dos outros dois segmentos (`RN-DEG-01`, constitution §V) ⚠️ **acrescentada em 15/09/2026** (análise M6)

**Ponto de conferência**: `pnpm test:unidade`, `pnpm test:rls` e o percurso de cadastro verdes.

---

## Fase 5 — História 3 (P1): a carga horária é lida, nunca digitada

**Objetivo**: ministrada e prevista aparecem sempre como reflexo do que está lançado, e não existe
onde digitá-las.

**Teste independente**: procurar campo de CH editável em qualquer formulário do sistema; não deve
existir nenhum (`SC-002`).

### Testes da US3

- [ ] T042 [P] [US3] Criar `tests/unidade/carga-horaria-digitavel.test.ts`: varredura de `app/` e `components/`, em código sem comentário, que conta `input`, `select` e campo de formulário ligados a carga horária e exige **zero**, com controle positivo (`FR-015`, `SC-002`, `I-4`)
- [ ] T043 [US3] Acrescentar a `supabase/tests/094_carga_prevista_e_ordem.sql` a asserção nomeada `RN-INST-04 · lançamento novo muda ta_ministrado_ano sem ação adicional` (`FR-014`, US3 cenário 2) ⚠️ o cenário 3 — escrita por fora recusada — já é a `I-8` da T012

### Implementação da US3

- [ ] T044 [US3] Acrescentar a `app/(app)/instrutores/page.tsx` a coluna CH total no ano, lida de `vw_instrutor_carga_anual` do ano corrente em `Promise.all` com a leitura da T028, e casada por `instrutor_id` com **zero** quando não houver linha (`FR-014`, `FR-027.1`) ⚠️ a view só tem linha em ano com fato: ausência é zero, não "sem instrutor"
- [ ] T045 [US3] Mostrar em `app/(app)/instrutores/[codigo]/page.tsx` a CH ministrada e a prevista do ano, somente leitura, na unidade que a view entrega e com a indicação de que são calculadas (`FR-014`, `FR-015`, `RF-INSTR-13`)

**Ponto de conferência**: `pnpm test:invariantes && pnpm test:unidade` verdes (quickstart, passo 4).

---

## Fase 6 — História 5 (P2): desativar preserva o passado

⚠️ **Vem antes da US4 de propósito** (plano, sequência 6 e 7): a US4 depende da T011, e esta não.

**Objetivo**: desativar tira o instrutor das atribuições futuras sem apagar nada do que ele fez, e
sem tocar a conta de acesso.

**Teste independente**: desativar alguém com histórico e conferir os dois lados (`SC-004`).

### Testes da US5

- [ ] T046 [P] [US5] Criar `tests/unidade/ciclo-de-vida-instrutor.test.ts`: inativo sai da lista de nova atribuição, ativo fica, e a lista de entrada não é alterada (`FR-009`, `RN-INST-02`)
- [ ] T047 [P] [US5] Escrever em `tests/invariantes/rls/rls.test.ts` o bloco `FR-010.1 · desativar instrutor não toca a conta`: com instrutor vinculado desativado, `usuarios.status` continua `ativo` e a sessão continua alcançando o que alcançava (`FR-010.1`)
- [ ] T048 [P] [US5] Escrever em `tests/e2e/instrutores.spec.ts` o percurso do quickstart, passo 6: desativar instrutor com aula lançada, conferir que some da listagem padrão e aparece com `?situacao=inativo`, que o histórico continua com nome e vínculos, que reativar devolve tudo, e que a tela de usuários mostra o instrutor vinculado inativo (`FR-008`, `FR-009`, `FR-010`, `FR-010.1`, `SC-004`)

### Implementação da US5

- [ ] T049 [US5] Criar `lib/dominio/ciclo-de-vida-instrutor.ts` com a função pura que devolve os elegíveis para nova atribuição, com a citação literal do `RN-INST-02` no topo (`FR-009`, `RN-INST-02`)
- [ ] T050 [US5] Acrescentar a `lib/acoes/instrutor.ts` as Server Actions `desativarInstrutor` e `reativarInstrutor`: Zod na primeira linha, `status` explícito, **nunca** `delete` (`FR-008`, `FR-010`, `RN-INST-05`)
- [ ] T051 [US5] Criar a folha `app/(app)/instrutores/[codigo]/AcoesDeInstrutor.tsx` com desativar e reativar, `DialogoConfirmacao` e ocultação por `SePodeVer` para quem não pode `editar` (`FR-008`, `FR-010`) ⚠️ oculto, não desabilitado
- [ ] T052 [US5] Mostrar em `app/(app)/admin/usuarios/page.tsx`, no mesmo `select` da lista, a situação do instrutor vinculado a cada conta (`FR-010.1`) ⚠️ a conta **não** é desativada em cascata; a tela só mostra

**Ponto de conferência**: o percurso da T048 verde (quickstart, passo 6).

---

## Fase 7 — História 4 (P2): o sistema avisa, e não impede

⚠️ **Bloqueada pela T011** para o alerta de faixa, e pela T053 para o de capacitação.

**Objetivo**: fora da faixa do regime e docência sem capacitação aparecem como aviso, e nada deixa
de funcionar.

**Teste independente**: pôr um instrutor fora da faixa e conferir que o aviso aparece **e** que tudo
continua funcionando (`SC-006`).

### Decisão da US4

- [ ] T053 [US4] 👤 Registrar em `specs/006-cadastro-de-instrutores/contracts/carga-horaria-e-alertas.md` a data de referência do `FR-017` — **`data_inicio_docencia_ciaara`, decidida por Bernardo em 15/09/2026** —, e levar a ele o que ainda falta: o que fazer quando essa data está vazia (`FR-017`, `RF-INSTR-16`, D-7) ⚠️ tarefa da US4, que segue travada pela T011

### Testes da US4

- [ ] T054 [P] [US4] Criar `tests/unidade/carga-horaria.test.ts`: com a faixa chegando por argumento, 40h com 20h previstas **não** alerta, 20h com 14h **alerta**, e os limites se comportam como a T011 registrar (`FR-016`, `RN-2027-06`, `SC-006`, `I-9`) ⚠️ um teste que use 40 como limite passa no primeiro caso pelo motivo errado
- [ ] T055 [P] [US4] Criar `tests/unidade/alertas-instrutor.test.ts`: docência há mais de um ano com capacitação vazia gera aviso, e o resultado é **só** aviso, sem nenhum campo que bloqueie (`FR-017`, `FR-018`, `RN-DEG-02`)
- [ ] T056 [P] [US4] Escrever em `tests/e2e/instrutores.spec.ts` o caso do `SC-006`: a ficha do 20h com 14h mostra o alerta **e** o salvar continua disponível; a do 40h com 20h não mostra alerta (`FR-016`, `FR-018`, `SC-006`) ⚠️ "desabilitar o botão enquanto houver alerta" é a forma que o erro costuma tomar

### Implementação da US4

- [ ] T057 [US4] Criar `lib/dominio/carga-horaria.ts` com a função pura que situa a prevista semanal na faixa do regime, com a citação literal do `RN-2027-06` no topo (`FR-016`, `RN-2027-06`) ⚠️ o teto é a **faixa**, jamais o número do regime
- [ ] T058 [US4] Criar `lib/dominio/alertas-instrutor.ts` com os avisos do `FR-016` e do `FR-017`, com a citação literal do `RN-DEG-02` no topo (`FR-016`, `FR-017`, `FR-018`)
- [ ] T059 [US4] Exibir os avisos em `app/(app)/instrutores/[codigo]/page.tsx` com `AlertaConformidade`, sem condicionar nenhuma ação a eles (`FR-018`, `RN-DEG-02`) ⚠️ nunca `CHECK`, policy que nega ou botão desabilitado

**Ponto de conferência**: `pnpm test:unidade` e o caso da T056 verdes.

---

## Fase 8 — História 6 (P2): a ficha mostra o que a v2.0 mostrava

**Objetivo**: cada refinamento das oito specs da v2.0 tem endereço na v2.1.

**Teste independente**: percorrer a tabela §4 do documento 06, item a item, e apontar onde cada
refinamento reaparece (`SC-007`).

### Decisões e conferências da US6

- [ ] T060 [US6] Registrar em `specs/006-cadastro-de-instrutores/contracts/carga-horaria-e-alertas.md` a lista **aberta e extensível** do quadro de avisos, decidida por Bernardo em 15/09/2026, começando pelos dois exemplos do `RF-INSTR-09` — instrutor sem NIP e campo obrigatório pendente (`FR-027`, `RF-INSTR-09`, D-7) ⚠️ **corrigida em 15/09/2026**: a lista **não** é enum fixo; aviso novo entra sem mudar o tipo que a descreve
- [ ] T061 [US6] Registrar no cabeçalho de `app/(app)/instrutores/FormularioDeInstrutor.tsx` que `preferencia` é **texto livre** nesta fatia, como simplificação deliberada do `RF-INSTR-06` decidida em 15/09/2026, e não grade dia × período (`FR-030`, `RF-INSTR-06`) ⚠️ **corrigida em 15/09/2026** (análise M8): não há mais conferência que pare a fatia
- [ ] T062 [US6] Conferir em `supabase/migrations/` qual recurso e qual ação a policy de escrita de `instrutor_disciplina` consulta, e registrar no cabeçalho da T082 (`FR-022`, `RN-INST-01`)

### Testes da US6

- [ ] T063 [P] [US6] Criar `tests/unidade/indicadores-instrutor.test.ts`: exatamente 4 indicadores; capacitação conta o campo **não vazio**; com selecionados maior que habilitados, os dois absolutos aparecem e o percentual passa de 100% (`FR-026`, `FR-026.1`, `SC-007.1`)
- [ ] T064 [P] [US6] Criar `tests/unidade/graficos-instrutor.test.ts`: exatamente 7 séries; as barras de posto/graduação em ordem de antiguidade, **nunca** alfabética, sem exigir posição do gráfico; a série de classificação lida da coluna `categoria`; posto fora da escala na faixa "Outros" ao final; duas capacitações contam em ambas as barras e o campo vazio em nenhuma; nenhuma série com mais de 7 valores (`FR-026.2`, `FR-026.3`, `FR-026.4`, `SC-007.1`)
- [ ] T065 [P] [US6] Criar `tests/unidade/mascaras.test.ts` com os casos literais da v2.0: NIP `00.0000.00`; CPF `12345678901` → `123.456.789-01`; CEP `12345678` → `12345-678`; telefone com 11 e com 10 dígitos; RETELMA com 10 e com 8 dígitos; e a limpeza que devolve só os dígitos (`FR-024`, **o `FR-013` da spec 016 da v2.0, não o desta spec**, spec 025 US4)
- [ ] T066 [P] [US6] Criar `tests/unidade/habilitacao.test.ts`: ministrar e ser responsável exigem vínculo ativo; avaliação e vista de prova **não** exigem (`FR-021`, `RN-INST-01`) ⚠️ a delimitação é a parte que se perde
- [ ] T067 [P] [US6] Criar `tests/unidade/avisos-cadastro-instrutor.test.ts` com os dois avisos iniciais da T060, e um caso que acrescenta um terceiro aviso sem alterar a função que avalia a lista (`FR-027`, `RF-INSTR-09`)
- [ ] T068 [P] [US6] Escrever em `tests/e2e/instrutores.spec.ts` os itens 2 a 9 do quickstart, passo 5: filtro de OM na URL **e** contagem mudando; categoria por cima operando sobre o resultado; URL em aba nova reproduzindo a tela; oito letras na busca gerando **uma** entrada de histórico; ficha em `/instrutores/<codigo>`; código inexistente distinguindo "não há" de "você não vê"; 4 indicadores e 7 gráficos, com as barras de posto/graduação em antiguidade; a listagem sem `ordem` exibindo a amostra da T004 em antiguidade; e **nenhuma** edição em linha (`FR-013`, `FR-025`, `FR-026`, `FR-027.4`, `FR-028`, `SC-007.1`, `SC-008`)

### Implementação da US6

- [ ] T069 [P] [US6] Criar `lib/dominio/indicadores-instrutor.ts`, com a citação do `RF-INSTR-08` e do `FR-026.1` no topo; selecionados são os `instrutor_id` distintos com atribuição ativa em `turma_disciplina_instrutor` (`FR-026`, `FR-026.1`, achado 6 do Épico 2)
- [ ] T070 [P] [US6] Criar `lib/dominio/graficos-instrutor.ts`, que monta as 7 séries e ordena a de posto/graduação pela escala recebida por argumento (`FR-026.2`, `FR-026.3`, `FR-026.4`, `RN-ANT-01`)
- [ ] T071 [P] [US6] Criar `lib/formato/mascaras.ts` com uma função pura por campo e a de limpeza (`FR-024`, documento 24 §`lib/formato/`)
- [ ] T072 [P] [US6] Criar `lib/dominio/habilitacao.ts` com a citação literal do `RN-INST-01` no topo, incluindo a delimitação de avaliação e vista (`FR-021`, `RN-INST-01`)
- [ ] T073 [P] [US6] Criar `lib/dominio/avisos-cadastro-instrutor.ts` com a lista da T060 como **dado extensível** — uma lista de regras avaliada por uma função única —, nunca como enum fixo (`FR-027`, `RF-INSTR-09`)
- [ ] T074 [US6] Criar a folha `app/(app)/instrutores/FiltrosDeInstrutores.tsx` sobre `FiltroAvancado` e o contrato da T020, e aplicar todos os filtros em `app/(app)/instrutores/page.tsx` na mesma consulta, em E lógico (`FR-025`, `FR-028`, `SC-008`) ⚠️ nenhum filtro por identificação civil
- [ ] T075 [US6] Exibir em `app/(app)/instrutores/page.tsx` os 4 indicadores com `CardKpi`, com a taxa de seleção mostrando os dois absolutos e o percentual como secundário (`FR-026`, `FR-026.1`)
- [ ] T076 [US6] Exibir em `app/(app)/instrutores/page.tsx` os 7 gráficos com os componentes de `components/graficos/`, na ordem do `FR-026.2`, com as barras de posto/graduação em antiguidade e a classificação lida de `categoria` (`FR-026.2`, `SC-007.1`)
- [ ] T077 [US6] Exibir em `app/(app)/instrutores/page.tsx` o quadro de avisos de qualidade, sempre visível, nunca colapsado por padrão (`FR-027`, `RNF-USA-04`)
- [ ] T078 [US6] Tratar em `app/(app)/instrutores/page.tsx` o filtro combinado sem resultado com `EstadoVazio`, distinguindo "não há" de "você não tem permissão de ver" (`FR-027.4`, `RN-DEG-01`)
- [ ] T079 [US6] Completar a ficha em `app/(app)/instrutores/[codigo]/page.tsx` com as seções da v2.0 — identificação, lotação, formação e capacitação, avaliação —, e o nome de guerra em negrito no nome completo quando houver (`FR-023`, `FR-027.2`, `FR-031`)
- [ ] T080 [US6] Aplicar as máscaras da T071 em `app/(app)/instrutores/FormularioDeInstrutor.tsx` e a limpeza no esquema de `lib/validacao/instrutor.ts`; campo Estado com as 27 UFs e `RJ` pré-selecionado em modo cadastro (`FR-024`, spec 025 US4) ⚠️ valida-se o formato limpo, não o mascarado (documento 25)
- [ ] T081 [US6] Acrescentar a `app/(app)/instrutores/FormularioDeInstrutor.tsx` o registro de preferências e restrições **gerais** como **texto livre** na coluna `preferencia` (`FR-030`, `RF-INSTR-06`, T061) ⚠️ as por turma e por disciplina ficam para depois da fatia (b)
- [ ] T082 [US6] Criar a folha `app/(app)/instrutores/[codigo]/PainelDeDisciplinas.tsx` e, em `lib/acoes/instrutor.ts`, a Server Action `sincronizarHabilitacoes`, com `safeParse` do Zod **na primeira linha**, como na T036 e na T050, que cria vínculo novo e inativa o desmarcado, **nunca** apagando; o painel fica oculto por `SePodeVer` para quem não pode escrever o vínculo, e a negação é do banco (`FR-022`, `RN-INST-01`, `RN-INST-05`, spec 019 da v2.0)

**Ponto de conferência**: o percurso da T068 verde (quickstart, passo 5).

---

## Fase 9 — Fechamento

- [ ] T083 [P] Criar `tests/unidade/nome-padronizado.test.ts`: varredura de `app/` e `components/`, em código sem comentário, que exige que todo nome de instrutor exibido passe por `NomeInstrutor` ou `nomeEmTexto`, com controle positivo (`FR-019`, `FR-020`, `SC-005`)
- [ ] T084 [P] Criar `specs/006-cadastro-de-instrutores/paridade.md` com a tabela §4 do documento 06 — as specs `014`, `015`, `016`, `019`, `020`, `025`, `036` e `038` — e o endereço de cada refinamento na v2.1, **nenhum** sem resposta, inclusive a `038`: *"a edição em linha continua removida"* (`SC-007`, quickstart passo 9)
- [ ] T085 Rodar `pnpm verificar:tudo` e conferir que o CI de `.github/workflows/ci.yml` dá **veredito idêntico** sobre o mesmo commit (`SC-009`, quickstart passo 8) ⚠️ verde local e vermelho no CI é defeito da verificação, e vira tarefa
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
| 9 — Fechamento | 7 |
| **Total** | **90** |

👤 **Cinco tarefas dependem de Bernardo**: T002, T003, T011, T053 e T087. Outras duas — T016 e
T062 — são conferências que **só param** se o que medirem exigir decisão. *(Atualizado em
15/09/2026: a T060 e a T061 deixaram de depender de decisão, e a T041.1 foi acrescentada.)*
