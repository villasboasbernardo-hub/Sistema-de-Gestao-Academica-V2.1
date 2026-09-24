---
description: "Lista de tarefas — Épico 5, fatia (a): cursos e turmas"
---

# Tarefas: Épico 5, fatia (a) — cursos e turmas

**Data**: 17/09/2026 · **Entrada**: [spec.md](./spec.md) · [plan.md](./plan.md) · [research.md](./research.md) ·
[data-model.md](./data-model.md) · [contracts/](./contracts/) · [quickstart.md](./quickstart.md)

**Formato**: `- [ ] ID [PR] [P?] [História?] Descrição com o caminho do arquivo (origem)`
· **[PR1]** / **[PR2]** = o PR a que a tarefa pertence — **obrigatório em toda tarefa**
· **[P]** = pode ir em paralelo (arquivo diferente, sem dependência pendente)
· **[USn]** = a história da spec; fases transversais não levam história
· **👤** = autorização de Bernardo; a tarefa **bloqueia** o que depende dela
· **⛓** = dependência explícita

**Rastreabilidade**: toda tarefa cita, entre parênteses, o `FR-`, `RF-`, `RN-` ou `SC-` de origem. **Citação de
requisito de OUTRA spec MUST carregar o número da spec** — `FR-001` da spec 002, por exemplo —, porque o mesmo
número existe em cada spec com conteúdo diferente *(decisão de Bernardo Villas Boas, 17/09/2026; achado 2 do analyze)*.

**Testes**: **incluídos, e pareados** (Restrição 5). Toda tarefa que cria comportamento nomeia a tarefa de
teste que a prova, e **o teste vem antes e é visto reprovando**. A *Definition of Done* do `CLAUDE.md`
exige Vitest em todo `lib/dominio/` tocado, pgTAP com asserção **nomeada** por `RN-` de Risco Alto, RLS
negativa por perfil e Playwright no percurso principal.

**Ordem dentro de cada história**: de dentro para fora — migration e `pnpm db:tipos` → `lib/dominio/` →
`lib/validacao/` → `lib/acoes/` → `app/` → `components/` (`CLAUDE.md`, *Convenções de código*).

**Os dois PRs** (`FR-046.1`): o **PR 1** (T001–T108, mais T031.1 e T031.2) mescla **verde e sozinho** — **nenhuma** tarefa dele
depende de tarefa do PR 2 — e vai ao Supabase remoto **antes** do merge; o **PR 2** (T109–T209, mais T182.1) começa
depois dele, **num ramo novo a partir da `main`** (decisão de 17/09/2026).

**Regra dos valores esperados** *(decisão de Bernardo Villas Boas, 17/09/2026)*: toda tarefa que ajusta amostra
ou teste cujo número esperado **muda** por causa do gatilho de `turma_disciplina` — ou de qualquer mudança desta
fatia — MUST declarar, **no texto da tarefa**, qual das duas coisas faz: **(a)** o número novo é o correto, e o
esperado passa a ser ele, **com o porquê**; ou **(b)** o número correto é o antigo, e a **amostra** é ajustada para
preservá-lo. **É proibido atualizar valor esperado só para igualar o que saiu** — *"teste cujo esperado é
atualizado para bater com a saída deixa de testar e fica verde para sempre."* Onde a tarefa declara que **nenhum**
esperado muda, isso foi **medido**; se na execução algum mudar, a tarefa **para** e declara (a) ou (b) antes de
seguir.

---

## ⚠️ Medida honesta — a decomposição saiu maior que o plano (Restrição 4)

| | Plano (17/09/2026) | Esta decomposição | Diferença |
|---|---|---|---|
| **PR 1 — tarefas** | 65 | **110** | **+45** |
| **PR 2 — tarefas** | 79 | **102** | **+23** |
| **Total** | 144 | **212** | **+68 (+47%)** |
| PR 1 — arquivos | ~62 | **~67** | +5 |
| PR 2 — arquivos | ~82 | **~98** | +16 |
| Arquivos distintos | ~141 | **~162** | +21 |

**De onde vêm as 68 a mais — nenhuma é escopo novo.** Comparadas bloco a bloco com a tabela do plano:

**PR 1 — +45**

| Bloco do plano | Plano | Aqui | Diferença | Por quê |
|---|---|---|---|---|
| Carga do ETL | 7 | **26** | **+19** | as dez conferências e **uma prova para cada**, mais a estrutura, as sequências, a sala e a carga completa (Restrição 5) |
| Amostras dos testes existentes | 6 | **19** | **+13** | **uma tarefa por arquivo** (15), uma segunda etapa nos 3 que criam curso pela API, depois da migration 6, e o `010_estrutura.sql`, que o R-21 não contava (A-2, A-3, A-9) |
| Guardas de ausência (`FR-025.3`, `FR-028.2`) — T031.1, T031.2 | 0 | **2** | **+2** | requisito de ausência sem teste é torcida (achado 5 do analyze, 17/09/2026) |
| Emenda do BRIEF §2.1 | 0 | **1** | **+1** | a tabela nova contradiz *"São 27 tabelas"*; a emenda é por acréscimo datado, e o `010` passa a comparar **conjunto**, não contagem (A-9) |
| Migrations, pgTAP e RLS nova | 31 | **36** | **+5** | a migration 2 tem quatro assuntos e a 6 tem dez funções; o pgTAP do `104` em três partes |
| Varredura dos consumidores | 6 | **9** | **+3** | o teste de vazamento e o do Início como tarefas próprias, e a conferência de `convite.spec.ts` (A-1) |
| Defeitos deliberados | 2 | **4** | **+2** | o N-7 e o gatilho de curso sem regime, que o quickstart já exige |
| Endereço de turma | 4 | **5** | **+1** | o teste do link do Início separado da mudança |
| Preparação | 3 | **2** | **−1** | *"decisões registradas"* já está feito |
| Tipos, remoto e fechamento | 6 | **6** | 0 | — |

**PR 2 — +23**

| Bloco do plano | Plano | Aqui | Diferença | Por quê |
|---|---|---|---|---|
| Contrato de rotas e menu | 2 | **10** | **+8** | cada grupo de rotas com o seu teste no `contrato-de-parametros.test.ts`, e o do shell |
| Ponta a ponta | 7 | **12** | **+5** | `cursos-cadastro.spec.ts` novo para a US4; `curso-pagina` e `turmas` em duas partes; amostra e acessibilidade como tarefas |
| Testes de consulta e varreduras | 0 | **6** | **+6** | a guarda de ausência do `FR-031.7` (T182.1) entrou aqui (achado 5 do analyze) — as três montagens de consulta testadas sem banco, a varredura da aba "Sobre" e a do construtor único |
| Validação | 4 | **8** | **+4** | cada esquema Zod com o seu teste |
| Domínio | 20 | **22** | **+2** | `confirmacao-de-gravacao.ts` e o teste (A-7) |
| Ramo e fechamento | 3 | **5** | **+2** | o ramo do PR 2 e o fechamento em tarefas separadas |
| Ações | 8 | **7** | **−1** | a tradução comum absorve o que era repetido por ação |
| Telas | 33 | **30** | **−3** | as consultas contam como teste + montagem, e três componentes se juntaram |
| Emenda da MENU-1 e defeito do seletor | 2 | **2** | 0 | — |

⚠️ **A razão de crescimento da fatia (c)** (+47% na verificação) **não** deve ser aplicada por cima destas
212 sem cuidado: parte do que a (c) só achou na verificação — amostras quebradas, testes que faltavam — esta
decomposição já antecipou. A projeção honesta fica **entre 212 e ~300**, e o número de verdade aparece na
implementação. **Cada PR continua menor que a fatia (c)**, entregue com 132 tarefas num PR só.

---

## ⚠️ Achados da decomposição — o que o plano não trazia

| # | Achado | Tarefas |
|---|---|---|
| **A-1** | **`tests/e2e/convite.spec.ts` só LÊ `cursos`** (`comCredencial.from("cursos").select("codigo")`, linha 126) — não insere. Não quebra pelas restrições novas; pode mudar só pela ampliação do alcance a curso inativo (`FR-017.1`). **Dos "16 arquivos a ajustar" do plano, 15 precisam de edição certa e 1 de conferência** | T059 |
| **A-2** | **O gatilho de nascimento de `turma_disciplina` (`FR-032.2`) quebra amostras que o R-21 não contava.** `097_filtros_de_vinculo.sql` insere a disciplina (linha 19), **depois** a turma (23) e **depois** a `turma_disciplina` explícita (25): com o gatilho, a turma já nasce com a linha, e a inserção explícita colide com `uq_turma_disciplina_ativo`. O mesmo desenho aparece em `020`, `094` e `098` (os quatro inserem `turma_disciplina`) e em `tests/e2e/instrutores-de-teste.ts` (disciplina na linha 219, turma na 246, `turma_disciplina` na 259). `030`, `060`, `070` e `tests/e2e/panorama-de-teste.ts` também inserem disciplina **antes** da turma e passarão a ganhar linhas de `turma_disciplina`. **Medido em 17/09/2026 que nenhum esperado desses quatro muda**: `vw_carga_horaria_turma`, que o Início lê, **não** lê `turma_disciplina`; `vw_disciplinas_execucao`, que o `060` confere, usa `COALESCE` com a previsão da grade e soma por disciplina e turma, e a linha nascida é `nao_informado`, sem datas; `030` e `070` não leem a tabela. Cada tarefa declara (a), (b) ou *nenhum esperado muda*, pela regra acima | T003, T004, T008, T009, T011, T013, T014, T016, T017 |
| **A-3** | **Amostra que cria curso pela API quebra duas vezes.** Na migration 2 (`NOT NULL` de modalidade e duração) e na 6 (curso só existe com vigência `padrao`, conferido no fim da transação — e cada chamada da API é uma transação). `rls.test.ts` tem ainda um **controle positivo** que cria curso como Admin pela API (`RLS-NEG-CONTROLE`, linha 995), que passa a ser recusado. E a **limpeza** precisa apagar a vigência antes do curso (`on delete restrict`) | T015, T016, T017, T050 a T052 |
| **A-4** | **Amostra não consegue desativar curso pela `service_role`.** A guarda da situação exige `cursos.desativar` (`FR-017`), e a `service_role` não tem perfil — é recusada, como deve ser (*"por qualquer caminho"*, `FR-017.4`). Teste que precisa de curso inativo o desativa **com sessão autenticada** de Admin; no pgTAP, com `request.jwt.claim.sub`, como `098` já faz. ✅ **Aprovado por Bernardo em 17/09/2026** | T053, T054, T060 |
| **A-5** | **O documento 01 tem um `.docx` gêmeo.** ✅ **Decidido em 17/09/2026**: a emenda vai **só** no `.md`, que registra que o `.docx` não a recebeu; e o `CLAUDE.md` ganhou a regra geral — **o `.md` prevalece, o `.docx` é o original entregue e não é emendado**. Medido ao registrar a regra: **11** documentos já divergiam assim | T002 |
| **A-6** | **As provas do ETL não rodam no CI.** `tests/etl/` está vazia; as provas do Épico 2 são scripts rodados à mão, e nem o `verificar:tudo` nem o CI os chamam. ✅ **Decidido em 17/09/2026**: rodam **à mão** nesta fatia, com a saída registrada no PR 1, e a ida ao CI é a pendência nomeada **`PEND-5a-4`** — **sem** dado real da v2.0 no CI, porque o repositório é público | T074, T076, T088 a T097 |
| **A-7** | **O `SC-002.3` precisa de uma função pura.** Sem uma função que decida se a gravação confirma, o teste seria uma ponta a ponta por gravação. ✅ **Aprovado por Bernardo em 17/09/2026** | T114, T115 |
| **A-9** | **`supabase/tests/010_estrutura.sql` afirma exatamente 27 tabelas** — *"FR-001: as 27 entidades do BRIEF §2.1 existem — nem mais, nem menos"* (linha 64) —, e o `BRIEF-v2.1.md` diz *"São **27 tabelas**. Esta tabela é a autoridade de nomes"* (linha 113). A `curso_sigla_historico` (B-21) faz 28. **O teste existente a ajustar que o R-21 não contava**: são **17**, não 16. ✅ **Decidido em 17/09/2026**: o BRIEF §2.1 recebe **emenda por acréscimo, datada**, só no `.md`, com a observação de que a lista é normativa e a contagem deriva dela; e o `010` passa a afirmar o **conjunto de nomes**, não a contagem — *"contagem é fato com prazo de validade e quebra de novo na 29ª tabela"* | T029, T030 |
| **A-8** | **A reconciliação do ETL já declara `config_listas` e `config_parametros` como tabelas semeadas pelo schema** (`SEMEADAS_PELO_SCHEMA`, `scripts/etl/reconciliar.py`), então as 8 salas e o parâmetro do 9º TA **não** disparam a **R-05 da reconciliação** (`scripts/etl/reconciliar.py`, homônima do R-5 da pesquisa). `curso_sigla_historico` não está na ordem de carga nem no de-para, e a cobertura do ETL só compara as duas — confere-se na carga completa | T098 |

---

# PR 1 — banco, carga e varredura

**Critério de merge** (`FR-046.1`): suíte completa verde e CI com o mesmo veredito; sistema utilizável, sem
nada meio construído — nenhuma tela, menu ou rota aponta para o que só tem banco; as 7 migrations no remoto
**antes** do merge.

## Fase 1 — Preparação (PR 1)

- [X] T001 [PR1] Conferir o ponto de partida: ramo `feat/EPICO-5a-cursos-e-turmas`, `.specify/feature.json` apontando para `specs/009-cursos-e-turmas`, e com a `main` atual `pnpm db:reset`, `python -m scripts.etl.executar` (saída **0**, reconciliação APROVADA) e `pnpm verificar:tudo` (saída **0**); registrar os números de partida na própria tarefa — pgTAP **167**, unidade, RLS, ponta a ponta (`FR-046.1`, `SC-009`, quickstart passo 0)
      ✅ **17/09/2026** — `pnpm db:reset` + `python -m scripts.etl.executar` (saída **0**, reconciliação **APROVADA**, 5.394 linhas) + `pnpm verificar:tudo` (saída **0**). Linha de partida medida: **529** de unidade (43 arquivos) · **167** pgTAP (18 arquivos) · **141** RLS e ambiente (3 arquivos) · **158** ponta a ponta (2 pulados).
- [X] T002 [PR1] [P] [US5] Emendar **só** `docs/fase-1/01-Stakeholders-e-Perfis-de-Usuario.md`, com data e autoria: §2.2 — o Operador abre e edita as turmas do seu escopo, inclusive o status; §2.5 — linha `turmas`, coluna `OPE`, de `L` para `LCE`; a linha `horarios` **não** muda; e, **junto da emenda**, a nota de que o `.docx` correspondente **não** a recebeu. O `.docx` **não** é tocado (`FR-028.3`; regra de precedência do `CLAUDE.md`, 17/09/2026)

**Ponto de conferência**: `pnpm verificar` sai 0.

---

## Fase 2 — Fundação do PR 1: as amostras dos testes que já existem, primeira etapa

**Por que antes das migrations**: cada ajuste abaixo é **compatível com o schema de hoje** — acrescentar
modalidade e duração, escrever o código de turma no formato `sigla [rótulo] ano`, criar a turma **antes** das
disciplinas. Feitos primeiro, os testes continuam verdes agora **e** depois das migrations 1 a 5. **Nenhuma
asserção muda** — só a amostra.

**O que cada tarefa confere no arquivo**: (1) `cursos` com `modalidade` e `duracao_dias`; (2) `turmas` com
`modalidade` e `codigo` exatamente `sigla [rótulo] ano`; (3) rótulo vazio ou `T<n>`; (4) nenhuma duas turmas
com o mesmo rótulo — vazio incluído — no mesmo curso e ano; (5) sala vazia ou uma das 8 do inventário; (6)
se o arquivo insere `turma_disciplina`, a turma é criada **antes** das disciplinas do curso, para o gatilho do
`FR-032.2` não criar a linha que a inserção explícita vai criar (A-2); (7) **a declaração da regra dos valores
esperados** — (a), (b) ou *nenhum esperado muda, medido*.

- [X] T003 [PR1] [P] Ajustar a amostra de `supabase/tests/020_unicidade.sql` — o código `'UNI-A 2026 T1'` vira `'UNI-A T1 2026'`, e a turma (linha 22) passa a ser inserida **antes** das disciplinas (linha 19). **Regra dos esperados: (b)** — o comportamento correto é o antigo: as asserções das linhas 69 e 72 provam a unicidade de `(turma, disciplina)` com a linha que **o próprio teste** insere; sem a troca de ordem, o gatilho criaria a linha antes e a inserção da linha 69 falharia fora de qualquer asserção (`FR-015`, `FR-025.1`, `FR-032.2`, R-21, A-2)
- [X] T004 [PR1] [P] Ajustar a amostra de `supabase/tests/030_condicionais.sql` — `'COND-A 2026'` com rótulo `T1` vira `'COND-A T1 2026'`. **Regra dos esperados: nenhum esperado muda, medido** — a disciplina é inserida antes da turma e a turma ganhará a linha de `turma_disciplina`, mas nenhuma asserção do arquivo lê a tabela; a ordem **não** muda (`FR-015`, `FR-025.1`, R-21, A-2)
- [X] T005 [PR1] [P] Ajustar a amostra de `supabase/tests/040_vigencia.sql` — só os dois `insert into public.cursos` ganham modalidade e duração; **as seis asserções de vigência não mudam uma linha** (`FR-015`, `FR-019`, R-19, R-21)
- [X] T006 [PR1] [P] Ajustar a amostra de `supabase/tests/050_grao_unidade_ensino.sql` (`FR-015`, R-21)
- [X] T007 [PR1] [P] Ajustar a amostra de `supabase/tests/055_mat01_curso_cruzado.sql` — `'SONDA-A 2026'` e `'SONDA-B 2026'` com rótulo `T1` viram `'SONDA-A T1 2026'` e `'SONDA-B T1 2026'` (`FR-015`, `FR-025.1`, R-21)
- [X] T008 [PR1] [P] Ajustar a amostra de `supabase/tests/060_derivados.sql` — `'DER-A 2026'` vira `'DER-A T1 2026'`. **Regra dos esperados: nenhum esperado muda, medido** — a turma ganhará a linha `nao_informado` da disciplina `DER-A-MAT`, e `vw_disciplinas_execucao` usa `COALESCE(td.previsao_inicio, d.previsao_inicio)` e soma por disciplina e turma: o `13` das linhas 67 a 72 continua `13`. Se sair outro número, **parar** e declarar (a) ou (b) — nunca igualar (`FR-015`, `FR-025.1`, `FR-032.2`, R-21, A-2)
- [X] T009 [PR1] [P] Ajustar a amostra de `supabase/tests/070_normativo.sql` — `'NORM-A 2026'` vira `'NORM-A T1 2026'`. **Regra dos esperados: nenhum esperado muda, medido** — a turma ganhará linha de `turma_disciplina`, que o arquivo não lê; e as contagens de `config_parametros` das linhas 44 a 66 filtram `teto.%` e `ch_docente.%`, que o parâmetro novo do 9º TA não casa (`FR-015`, `FR-025.1`, `FR-023`, R-21, A-2)
- [X] T010 [PR1] [P] Ajustar a amostra de `supabase/tests/080_imutabilidade.sql` (`FR-015`, R-21)
- [X] T011 [PR1] [P] Ajustar a amostra de `supabase/tests/094_carga_prevista_e_ordem.sql` — o código `'T096-TUR'` vira `sigla T1 ano`, com o ano calculado como o arquivo já calcula, e a turma (linha 123) passa a ser inserida **antes** das disciplinas da linha 119. **Regra dos esperados: (b)** — os números corretos são os antigos: a carga prevista sai das `turma_disciplina` que **o teste** insere (linhas 173 e 295) com as suas atribuições; a amostra muda de ordem para o gatilho não criar essas linhas antes (`FR-015`, `FR-025.1`, `FR-032.2`, R-21, A-2)
- [X] T012 [PR1] [P] Ajustar a amostra de `supabase/tests/096_codigo_e_habilitacoes.sql` (`FR-015`, R-21)
- [X] T013 [PR1] [P] Ajustar a amostra de `supabase/tests/097_filtros_de_vinculo.sql` — `'T099-TUR'` vira `'T099-EXP T1 2026'`, e a turma (linha 22) passa a ser inserida **antes** das disciplinas (linha 19). **Regra dos esperados: (b)** — os resultados corretos são os antigos: o filtro de *selecionado* depende da `turma_disciplina` com id fixo que o teste insere (linha 24) e **inativa** (linha 54); a amostra muda de ordem para o gatilho não criar outra linha ativa da mesma disciplina (`FR-015`, `FR-025.1`, `FR-032.2`, A-2)
- [X] T014 [PR1] [P] Ajustar a amostra de `supabase/tests/098_exclusao_e_especialidade.sql` — `'T100-TUR'` no formato, e a turma (linha 48) inserida **antes** das disciplinas (linha 44). **Regra dos esperados: (b)** — o resultado correto é o antigo: o impedimento de exclusão vem da atribuição que **o teste** grava sobre a `turma_disciplina` da linha 56; a amostra muda de ordem para não nascer uma segunda linha (`FR-015`, `FR-025.1`, `FR-032.2`, R-21, A-2)
- [X] T015 [PR1] [P] Ajustar `tests/invariantes/rls/rls.test.ts`, primeira etapa: amostras de `cursos` (linha 144) e `turmas` (162) com modalidade, duração e código no formato; **e o caso N-7** — *"visualizacao não cria curso"* (linha 1164) passa a mandar a linha **completa** e a exigir **`42501`**, não só `error not null` (`FR-044`, `FR-015`, `SC-005`, R-21, quickstart passo 3) ⚠️ sem isto, depois da migration 2 o caso passa por causa do `23502` **com a RLS desligada**
      ✅ **17/09/2026** — feita, e com **uma declaração a mais que a tarefa previa**: as linhas 262 e 267 comparavam o código da turma da amostra (`RLS-REG 2026`, `RLS-EXP 2026`) e reprovaram. **Regra dos esperados: (a)** — o valor novo é o correto, porque é a **identidade da linha que esta mesma tarefa renomeou** por decisão registrada (`FR-025.1`), e o fato provado (o alcance do Operador) não mudou. Manter o literal antigo seria **pior que falhar**: a asserção **negativa** passaria por vacuidade, já que `RLS-REG 2026` deixou de existir.
- [X] T016 [PR1] [P] Ajustar `tests/e2e/instrutores-de-teste.ts`, primeira etapa: curso (linha 208) e turma (246) com os campos e o código; turma criada **antes** das disciplinas (219, 302). **Regra dos esperados: (b)** — os números corretos são os antigos: *selecionado*, habilitado e as cargas de 14 h e 20 h por semana saem das `turma_disciplina` que a amostra insere (259, 340) e das atribuições dela; a amostra muda de ordem para o gatilho não criar linhas antes (`FR-015`, `FR-025.1`, `FR-032.2`, A-2)
- [X] T017 [PR1] [P] Ajustar `tests/e2e/panorama-de-teste.ts`, primeira etapa: cursos (52) e turmas (155) com os campos e o código; a limpeza (224 a 232) passa a apagar `turma_disciplina` **antes** de `turmas` (FK `restrict`). **Regra dos esperados: nenhum esperado muda, medido** — as turmas ganharão as linhas de `turma_disciplina` das disciplinas (73, 93), como toda turma real, e a ordem **não** muda; mas a tela Início lê `cursos` e `vw_carga_horaria_turma`, e a view **não** lê `turma_disciplina`. Se algum número de `tests/e2e/inicio.spec.ts` mudar na execução, **parar** e declarar (a) ou (b) nesta tarefa — nunca igualar (`FR-015`, `FR-025.1`, `FR-032.2`, A-2)

**Ponto de conferência**: `pnpm test:invariantes`, `pnpm test:rls` e `pnpm test:e2e` verdes, **ainda sem
migration nova** — é a prova de que os ajustes não mudaram nenhuma asserção.

---

## Fase 3 — US5 (PR 1): a lista de salas e a validação da sala (migration 1)

**Objetivo**: a sala da turma passa a ser conferida contra a lista administrável, com a natureza física ou
virtual explícita em toda sala. **Teste independente**: `099_salas.sql` e o caso N-4/N-5 verdes.

- [X] T018 [PR1] [P] [US5] Escrever `supabase/tests/099_salas.sql`: as 8 salas com `ambiente_virtual` explícito (7 `false`, Moodle `true`); **três** recusas da natureza — chave ausente, valor nulo, valor não booleano; sala fora da lista recusada; sala vazia aceita; sala desativada aceita em `UPDATE` de turma; `tipo_atividade` inativo **continua recusado** em `registros_aula`; **zero** comparações com o texto `'Moodle'` em função (`FR-029` a `FR-029.7`, `SC-014.2`, `SC-014.4`, I-1, I-2) — ver reprovando antes da T020
- [X] T019 [PR1] [P] [US5] Criar `tests/invariantes/rls/cursos-e-turmas.test.ts` com o bloco de salas: N-4 — Ajudante da Divisão acrescenta sala e recebe **`42501`**; N-5 — Admin e Encarregado da Divisão acrescentam; o Operador **lê** a lista (`FR-029.2`, `SC-014.3`, quickstart passo 3) — ver reprovando antes da T020
      ✅ **17/09/2026** — feita. ⚠️ **`pnpm test:rls` passou a rodar um arquivo por vez** (`--no-file-parallelism`): este arquivo cria conta **Admin**, e `app.impedir_remocao_do_ultimo_admin()` conta os Admins ativos do banco **inteiro**. Precaução **medida**: em três execuções paralelas seguidas a corrida **não** se materializou — mas suíte que compartilha banco não deve depender de escalonamento.
- [X] T020 [PR1] [US5] Escrever `supabase/migrations/<ts>_salas_lista_e_validacao.sql` (gerar com `pnpm db:migration`): `metadados jsonb not null default '{}'`; a restrição `config_listas_sala_com_natureza` com **as duas metades** (`metadados ? 'ambiente_virtual' and jsonb_typeof(...) = 'boolean'`); as 8 salas; a reconciliação **conferida no momento em que roda** — lista os valores gravados, casa ignorando caixa e acento, faz o `UPDATE` com a lista de substituições **em comentário**, **aborta** nomeando o valor se sobrar algum sem par; `TG_ARGV[2] = 'aceita_inativo'` em `app.validar_dominio_config_lista()` sem mudar o comportamento dos 4 gatilhos existentes; o gatilho de sala em `turmas`; `revoke` de `public` e `anon` em toda função nova (`FR-029` a `FR-029.7`, `FR-046`, R-4, R-11) ⛓ T018, T019 · testes: T018, T019
      ✅ **17/09/2026** — `20260917210558_salas_lista_e_validacao.sql`. A reconciliação foi exercida **sobre a base carregada** (migration aplicada por `supabase migration up` depois do ETL): **9** turmas normalizadas, **0** órfãs, **2** vazias intactas. E a previsão do `FR-029.8` foi **medida**: com a migration no lugar e sem a T075, `python -m scripts.etl.executar` **aborta** com saída **3**, nomeando `Laboratório de informática` — e não deixa nada atrás, transação única.
- [X] T021 [PR1] [US5] Escrever o plano de reversão da migration 1 no cabeçalho dela e **executá-lo** numa base descartável — `pnpm db:reset`, aplicar, reverter, `pnpm test:invariantes` dos arquivos anteriores verde —, com a lista das 9 turmas cuja grafia volta (`FR-046`, data-model §5) ⛓ T020
      ✅ **17/09/2026** — plano no cabeçalho e **executado** numa base descartável: 9 turmas de volta à grafia anterior (as 9 nomeadas no cabeçalho), 8 salas presentes e `ativo = false` (regra 4), gatilho ausente, sala fora de lista aceita de novo, e os **18** arquivos pgTAP anteriores **verdes** na base revertida.

---

## ⚠️ Achados da execução — fatia 1 (T001 a T021), 17/09/2026 — **decididos em 17/09/2026**

**Registro de execução, não escopo novo.** Nenhum é corrigido nesta fatia; os dois primeiros são de
código alheio a ela, e corrigir teste alheio é decisão, não subproduto.

| # | Achado | Medido | ✅ Decisão de Bernardo Villas Boas, 17/09/2026 |
|---|---|---|---|
| **E-1** | **`pnpm test:rls` reprova numa base carregada pelo ETL** — **12 casos**, e nenhum deles fala de salas. O `rls.test.ts` do Épico 1 assere que *"desativar o último Admin é recusado"* **assumindo ser o único Admin**, premissa verdadeira só em base recém-resetada; a base real traz **`USR-01` e `USR-02`**, dois Admins ativos. A desativação passa, a conta Admin da suíte fica `inativo`, e as 12 falhas seguintes são `42501` **em cascata**. `pnpm verificar:tudo` **não vê**, porque faz `db:reset` antes | 17/09/2026, base local com ETL carregado | **Pendência nomeada `PEND-5a-5`**, registrada no `plan.md` com dono e diagnóstico por extenso. **Não consertar**: o teste é do Épico 1 e o caminho documentado roda depois do `db:reset`. A ordem foi registrada no **`quickstart.md`, passo 0** |
| **E-2** | **Rodar o ETL depois da suíte de RLS faz a reconciliação divergir em 1.** `R-01` e `R-06` esperam **930** linhas em `migracao_log` e encontram **931**: a suíte grava `LOG-RLS-1` para provar que a tabela é *append-only*, e *append-only* **é o que impede desfazer**. Saída **1**, veredito reprovado, sem nada errado no dado | 17/09/2026 | **Registrado no `quickstart.md`, passo 0**: a suíte roda **sempre antes** do ETL; depois dele, `migracao_log` diverge em 1 |
| **E-3** | 🔗 **Uma causa, não duas: trabalhadores em paralelo sobre estado global do banco que algumas asserções tratam como privado.** Apareceu em **dois lugares** no mesmo dia: **(i)** `inicio.spec.ts` `FR-025` comparou **4 com 4** — a amostra do panorama é **por processo** e os trabalhadores do Playwright semeiam em paralelo, então a contagem do escopo geral sai num instante e a do escopo estreito noutro; **(ii)** a suíte de RLS, onde `cursos-e-turmas.test.ts` cria conta **Admin** e o gatilho do último Admin conta o banco **inteiro** | 17/09/2026; (i) não se reproduziu — o arquivo sozinho passa 8/8 e a suíte inteira, remedida, dá **158**; (ii) não se materializou em três execuções paralelas seguidas | **`--no-file-parallelism` fica** no `test:rls`, **com o motivo escrito no `vitest.config.mts`** — *"sinalizador sem motivo registrado é removido por quem quiser acelerar a suíte"*. A metade (i), do Playwright, fica **registrada e não corrigida**: é do Épico 4 |
| **E-3b** | **A falha de `convite.spec.ts` é de ambiente, e fica separada**: `supabase status -o env` morreu num **rename do `telemetry.json`** da CLI. Nada a ver com trabalhadores nem com esta fatia | 17/09/2026, uma vez, não reproduzida | Nenhuma ação |
| **E-4** | **A carga do ETL não completa entre a migration 1 e a T075** — e isso é a **previsão do `FR-029.8` cumprindo-se**: com o gatilho de sala no lugar e sem a substituição no ETL, `python -m scripts.etl.executar` **aborta com saída 3**, nomeando `Laboratório de informática`, e a transação única não deixa nada atrás | 17/09/2026 | **Nada a fazer.** Confirmado como a previsão se cumprindo; fecha na **T075** |

**E o refinamento da T003, decidido junto** *(17/09/2026)*: a asserção do `020_unicidade.sql` passou a
**afirmar o nome da restrição violada**, e não só o `23505`. **A medição deu razão à decisão e
contrariou a expectativa**: por inserção, quem recusa é **`turmas_codigo_key`** — com o código sendo
função determinística de curso, rótulo e ano, as duas restrições ficaram acionáveis pelo mesmo caso, e o
índice do código, criado antes, é avaliado primeiro. Se a unicidade por (curso, ano, rótulo) fosse
removida, o arquivo seguiria **verde**. Por isso entrou uma **segunda** asserção, pela **edição** — onde
o código **nunca muda** (`FR-025.1`) e a colisão é só de rótulo: ali quem recusa é
**`turmas_unica_por_ano`**, pelo nome. **Reconferir quando a migration 3 entrar.**

---

## Fase 4 — US4 e US5 (PR 1): obrigatórios, rótulo e auditoria da sigla (migration 2)

**Objetivo**: nenhum valor-padrão silencioso; limite pela classificação; rótulo `T<n>`; troca de sigla
auditada, sem cascata e sem reúso por outro curso. **Teste independente**: `100` e a parte de rótulo do `101`
verdes.

- [X] T022 [PR1] [P] [US4] Escrever `supabase/tests/100_curso_obrigatorios.sql`: curso sem modalidade e sem duração recusados; Regular sem limite → **1**, Expedito sem limite → **2**, Expedito com **1** explícito → **1**; `ead_semipresencial` recusado; turma sem modalidade recusada; **troca de sigla** grava **uma** linha em `curso_sigla_historico` com anterior, nova, autor e momento (sessão por `request.jwt.claim.sub`, A-4); reenviar a mesma sigla **não** grava; `UPDATE`, `DELETE` e `TRUNCATE` na tabela recusados **como `service_role`**; **zero** códigos de turma mudam na troca; sigla que foi de **outro** curso recusada com o curso e a data na mensagem, por criação e por edição; o curso **voltando** à própria sigla aceito (`FR-003.1`, `FR-003.2`, `FR-015`, `FR-014.1` a `FR-014.3`, `SC-001.2`, `SC-001.4`, `SC-001.6`, `SC-001.7`, I-3, I-3b) — ver reprovando antes das T024 a T027
- [X] T023 [PR1] [P] [US5] Criar `supabase/tests/101_turma_codigo_e_rotulo.sql` com a parte do rótulo: `t1`, `T1 ` com espaço, `Turma 1` e `T0` recusados; os 10 rótulos da base (`T1`, `T2`) aceitos (`FR-025.2`, `SC-004.4`, I-4) — ver reprovando antes da T025
- [X] T024 [PR1] [US4] Escrever `supabase/migrations/<ts>_curso_e_turma_obrigatorios.sql`, parte A: `drop default` de `cursos.modalidade` e `cursos.limite_turmas_ano`; `set not null` em `cursos.duracao_dias` e `turmas.modalidade`; gatilho `app.limite_de_turmas_pela_classificacao()` que preenche **só se nulo**; `cursos_classificacao_nao_geral` passa a recusar também `ead_semipresencial`; ⚠️ **o `default` de `cursos.prioridade_alocacao` FICA — exceção declarada ao `FR-015.1`, justificada no `FR-015.2`: não é campo do cadastro desta fatia, e o valor é a regra em vigor do motor** (`FR-003.1`, `FR-003.2`, `FR-015`, `FR-015.1`, `FR-015.2`, `FR-027`) ⛓ T003 a T017, T022 · teste: T022
      ✅ **17/09/2026** — `20260917224841_curso_e_turma_obrigatorios.sql`, parte A. ⚠️ **Consequência medida na hora**: sem `default`, `limite_turmas_ano` passa a ser **obrigatório no tipo de inserção** gerado (`lib/tipos/database.ts`), embora o gatilho o preencha — o gerador de tipos não enxerga gatilho. Não morde no PR 2, porque o caminho da tela é a RPC `criar_curso_com_regime(jsonb, jsonb)`; morde quem inserir `cursos` pelo cliente tipado.
- [X] T025 [PR1] [US5] Na mesma migration, parte B: `CHECK (turma is null or turma ~ '^T[1-9][0-9]*$')` em `turmas` (`FR-025.2`) ⛓ T023 · teste: T023
- [X] T026 [PR1] [US4] Na mesma migration, parte C: tabela `curso_sigla_historico` (colunas do data-model, quarteto, `origem_migracao_v1`, FK `restrict`, índice por `curso_id`); RLS com leitura por `app.pode('auditoria','ler')`, **nenhuma** policy de escrita, `revoke` de `insert, update, delete, truncate` de `authenticated` e `anon`; gatilho `app.registrar_troca_de_sigla()` `AFTER UPDATE OF codigo` `SECURITY DEFINER` só quando o valor **mudou**; `BEFORE UPDATE OR DELETE` **e** `BEFORE TRUNCATE`, `FOR EACH STATEMENT`, com `app.bloquear_reescrita()` (`FR-014.1`, `FR-046`, `SC-001.6`, R-22) ⛓ T022 · teste: T022
      ✅ **17/09/2026** — tabela criada com RLS, leitura por `auditoria.ler`, `revoke` de `insert, update, delete, truncate` de `authenticated` e `anon`, **nenhuma** policy de escrita, e os **dois** gatilhos de statement (`UPDATE OR DELETE` e `TRUNCATE`) com `app.bloquear_reescrita()`. O quarteto de auditoria é `uuid` **sem FK**, como nas outras 27 — FK ali faria a gravação do gatilho falhar no dia em que a conta do autor sumisse.
- [X] T027 [PR1] [US4] Na mesma migration, parte D: gatilho `app.recusar_sigla_de_outro_curso()` `BEFORE INSERT OR UPDATE OF codigo`, que recusa com `23505`, chave `sigla_de_outro_curso` e `DETAIL` com sigla atual, nome e data em que o outro curso deixou a sigla (a mais recente); **aceita** sigla que foi do próprio curso; os dois gatilhos de sigla pegam a **mesma trava de aconselhamento pela sigla** antes de ler ou gravar (`FR-014.3`, `SC-001.7`, R-26) ⛓ T026 · teste: T022
- [X] T028 [PR1] [US4] Plano de reversão da migration 2 no cabeçalho e **executado** numa base descartável — a tabela `curso_sigla_historico` **fica**, com os gatilhos que a protegem; sai só o que a alimenta (`FR-046`, data-model §5) ⛓ T024 a T027
      ✅ **17/09/2026** — plano no cabeçalho e **executado sobre a base CARREGADA**: as duas migrations aplicadas por `supabase migration up` depois do ETL (24 cursos, 28 turmas) **aplicaram limpo** — 0 cursos sem modalidade, limites 1 e 2, rótulos só `T1`/`T2`/vazio. Depois da reversão: curso volta a nascer `presencial`, Expedito volta ao limite 1, `duracao_dias` aceita nulo, e `curso_sigla_historico` **fica de pé**. Os **19** arquivos pgTAP anteriores verdes; `100` e `101` reprovam, como se espera deles.
- [X] T029 [PR1] [US4] Emendar `docs/BRIEF-v2.1.md` §2.1 **por acréscimo datado, sem reescrever o texto original** (linha 113, *"São 27 tabelas"*): a emenda acrescenta a **28ª**, `curso_sigla_historico`, citando a B-21 de 17/09/2026, e registra a observação de que **a lista é normativa e a contagem é descritiva, derivada dela** — para a próxima tabela não reabrir a questão. **Só** o `.md`; o `.docx` **não** é emendado, e a emenda diz isso (regra de precedência do `CLAUDE.md`, 17/09/2026) (`FR-001` da **spec 002, Épico 1**; `FR-014.1`, `FR-046`, A-9) ⚠️ vem **antes** da T030, que compara o conjunto do banco com o conjunto declarado aqui
- [X] T030 [PR1] [US4] Reescrever a asserção da linha 64 de `supabase/tests/010_estrutura.sql` para comparar **conjunto de nomes**, não contagem: o conjunto de tabelas de `public` MUST ser igual ao **conjunto declarado no BRIEF §2.1**, agora com a `curso_sigla_historico` (B-21), e a mensagem de falha MUST **nomear** o que falta e o que sobra — `results_eq`/`set_eq` do pgTAP, com a lista escrita no próprio arquivo *(decisão de Bernardo Villas Boas, 17/09/2026)*. **Regra dos esperados: (a)** — a mudança decorre de decisão registrada, e o conjunto é o que o BRIEF afirma ser (*autoridade de nomes*): **(1)** contagem tem prazo de validade e quebraria de novo na 29ª tabela, trazendo a pergunta de volta; **(2)** contagem acusa que algo mudou, e não **o quê**; **(3)** conjunto pega tabela faltando **e** tabela inesperada. **Nenhuma** outra asserção do arquivo muda — os 28 tipos `ENUM` continuam 28, zero policies de `DELETE`, toda tabela com policy, zero `FORCE` (`FR-001` da **spec 002, Épico 1**; `FR-014.1`, `FR-046`, A-9) ⛓ T026, T029
      ✅ **17/09/2026** — `set_eq` com os **28** nomes transcritos do BRIEF §2.1. **Conferido por defeito deliberado**, numa transação desfeita: criando `zz_defeito_deliberado` em `public`, a asserção **acusa a tabela inesperada pelo nome** — o que a contagem não fazia.

---

## ⚠️ Achados da execução — fatia 2 (T022 a T030), 17/09/2026 — **decididos em 17/09/2026**

| # | Achado | Medido | ✅ Decisão de Bernardo Villas Boas, 17/09/2026 |
|---|---|---|---|
| **E-6** | 🔴 **A conferência 3 do ETL não dá zero: dá 13.** O `FR-019.6` registrava *"medido: 0"* **sobre o dado de origem**, mas o 0 foi medido **na base carregada**, com o `DEFAULT 'presencial'` já aplicado. Na origem, **13 dos 24 cursos têm `Modalidade` vazia**, e `promover.py` dependia desse default | 17/09/2026, contra `bruto/v20/Cad_Cursos.csv`, não contra o banco | **Opção (b), a catraca** — `cursos.modalidade` anulável **só** em linha migrada e nunca editada; obrigatória em linha nova e ao editar a migrada (`cursos_modalidade_so_nula_no_historico`). É o padrão do achado 3 do Épico 2. **Recusada a (a)**, gravar `presencial` declarado e logado: *"valor inventado, uma vez gravado, fica indistinguível de valor real, porque relatórios, DSAs e decisões leem a coluna e não o `migracao_log`"* — e entre os 13 há cursos `EST-QF`, família que tem curso EAD na base. **A (c) não foi recusada, foi adiada pela catraca**: a exigência chega a quem tem a informação, um curso por vez |
| **E-6b** | **E o erro foi de método, não de número** — medir o artefato errado pode ter afetado mais de uma conferência | — | **As dez foram remedidas contra a origem, nomeando o artefato**, e o resultado entrou como **emenda datada** ao `FR-019.6`, sem reescrever o texto original. **Nove confirmaram-se; só a 3 mudou** |
| **E-7** | **O gerador de tipos não enxerga gatilho**: toda coluna `NOT NULL` preenchida por gatilho aparece como **obrigatória** no tipo de inserção. Apareceu em `limite_turmas_ano`, e valerá para o código de turma, o `TDI-` e o regime | 17/09/2026, `lib/tipos/database.ts` | **Registrado como propriedade geral, uma vez**, no `CLAUDE.md` (*Gotchas da plataforma*, item 5) — e não como nota por coluna |
| **E-8** | **O contrato de escritas §2 promete `sala_fora_da_lista` no `HINT`, e o gatilho genérico não o emitia** | 17/09/2026 | **Caminho da exceção autorizada**, e não a emenda do contrato: a **B-2/R-4** já tinha decidido **parametrizar** a função, e o parâmetro foi **estendido** — `TG_ARGV[3]` opcional carrega a chave, com `{valor, lista}` no `DETAIL`. **Os quatro consumidores existentes passam dois argumentos e não mudaram em nada**, e o `099_salas.sql` prova as duas metades. A nota de qual caminho foi seguido está no próprio contrato |
| **E-9** | **Seis asserções negativas do `SC-004` passavam pelo motivo errado, e quem as pegou foi o CONTROLE POSITIVO.** O A-3 mordeu na etapa 1 em mais lugares do que a T015 nomeava: além das linhas 144/162 e do N-7, quebraram o controle positivo `RLS-NEG-CONTROLE` (reprovou com `23502`) e os seis negativos de *ESCRITA negada, por perfil* | 17/09/2026 | **Aprovado, e registrado como evidência**: é argumento empírico a favor de **manter controle positivo em todo bloco de asserções negativas** — e é o fundamento da correção da **T003**, onde não existe controle que distinga e por isso a asserção passou a nomear a restrição. Corrigido dentro da T015: linha completa nos oito, `42501` conferido em sete |

---

## Fase 5 — US5 (PR 1): código de turma gerado e rótulo único (migration 3)

**Objetivo**: o código nasce no banco e nunca muda; o rótulo é único por curso e ano, com o vazio igual.
**Teste independente**: `101` inteiro verde.

- [X] T031 [PR1] [US5] Completar `supabase/tests/101_turma_codigo_e_rotulo.sql`: turma sem código grava `sigla [rótulo] ano`; código divergente **recusado**; `UPDATE` do código recusado; os **4** caminhos de colisão — remover rótulo, trocar por rótulo usado, mudar ano, mudar curso — **recusados** quando colidem e **aceitos** quando não; trocar a sigla do curso **não** muda o código de nenhuma turma, e a turma criada depois usa a sigla nova (`FR-025.1`, `FR-026`, `FR-014.2`, `SC-004.1`, `SC-004.2`, I-4) ⛓ T023 — ver reprovando antes da T032
      ✅ **17/09/2026** — `101` completo, **29** asserções. As de colisão **nomeiam a restrição**, pelo refinamento da T003: os quatro caminhos caem em `turmas_unica_por_ano`, e o primeiro — remover o rótulo — **só existe com `NULLS NOT DISTINCT`**. E as quatro contraprovas (aceito quando não colide) estão junto: sem elas, uma restrição que recusasse tudo passaria nas quatro de cima.
- [X] T031.1 [PR1] [P] [US5] Acrescentar a `supabase/tests/101_turma_codigo_e_rotulo.sql` a guarda de **ausência**: `UPDATE` de `data_inicio`, `data_termino` e `curso_id` de uma turma **não altera nenhuma linha** de `janelas_curso` — contagem e conteúdo iguais antes e depois —, e `janelas_curso` não ganha gatilho nem FK nova nesta fatia (`FR-025.3`; achado 5 do analyze: *"requisito de ausência sem teste não é requisito, é torcida"*) ⛓ T032
      ✅ **17/09/2026** — três asserções: o conteúdo de `janelas_curso` **idêntico** antes e depois de editar datas e curso da turma (por `EXCEPT` nos dois sentidos, não por contagem), **um** gatilho (o de auditoria do Épico 1) e **uma** FK (a do curso).
- [X] T031.2 [PR1] [P] [US5] Acrescentar a `supabase/tests/101_turma_codigo_e_rotulo.sql` a guarda de **ausência** do status: **12 de 12** transições entre `planejada`, `ativa`, `concluida` e `cancelada` aceitas pelo banco, em qualquer ordem, inclusive `concluida → planejada` e `cancelada → ativa`; nenhum gatilho de `turmas` lê `status` para recusar (`FR-028.2`, `SC-013`; achado 5 do analyze) ⛓ T032
      ✅ **17/09/2026** — as **12 de 12** transições exercidas por laço, inclusive `concluida → planejada` e `cancelada → ativa`, e **zero** gatilhos de `turmas` que leiam `status` para recusar.
- [X] T032 [PR1] [US5] Escrever `supabase/migrations/<ts>_turma_codigo_e_rotulo.sql`: gatilho `app.gerar_codigo_da_turma()` `BEFORE INSERT OR UPDATE` `SECURITY DEFINER` lendo a sigla **vigente**, recusando código divergente e mudança de código; `turmas_unica_por_ano` recriada como `UNIQUE NULLS NOT DISTINCT`, mesmo nome (`FR-025.1`, `FR-026`, `FR-014.2`) ⛓ T024, T031 · teste: T031
      ✅ **17/09/2026** — `20260918002208_turma_codigo_e_rotulo.sql` *(carimbo em UTC; o relógio da máquina marcava 17/09/2026 21:22)*. O gatilho **impõe o formato**, não só preenche o vazio: código divergente é recusado com `codigo_de_turma_divergente` e o `DETAIL` diz **qual era o esperado**. ⚠️ **Medido sobre a base carregada: 28 de 28 turmas reais passam** — o gatilho poderia ter recusado a base inteira e não recusou nenhuma.
- [X] T033 [PR1] [US5] Plano de reversão da migration 3 no cabeçalho e executado numa base descartável (`FR-046`) ⛓ T032
      ✅ **17/09/2026** — reversão **executada sobre a base carregada**: um código inventado volta a ser aceito, as 28 turmas ficam intactas, e os **20** arquivos pgTAP anteriores verdes.

---

## Fase 6 — US5 (PR 1): as linhas de disciplina nascem com a turma (migration 4)

**Objetivo**: criar turma, por qualquer caminho, faz nascer uma `turma_disciplina` por disciplina ativa, com
código de sequência. **Teste independente**: `102` verde.

- [X] T034 [PR1] [US5] Escrever `supabase/tests/102_turma_disciplina_nasce.sql`: amostra de 22 disciplinas ativas → **22** linhas; uma inativa **não** replicada; `herdado_grade` **se e só se** a previsão cai na janela completa, com as duas datas; turma sem datas → **100%** `nao_informado`; falha do gatilho desfaz a turma; **duas turmas criadas em sequência não repetem código**; sequência `TDI-` **nunca atrás** do maior código gravado; criar turma com um perfil **sem** `disciplinas.editar` funciona (`FR-032` a `FR-032.3`, `SC-004.3`, I-5, R-5, R-6) — ver reprovando antes da T035
      ✅ **17/09/2026** — `102`, **15** asserções. ⚠️ **A prova de permissão MUDOU DE ARQUIVO, por exigência de Bernardo de 17/09/2026**: ela não pode morar no pgTAP, que roda como **dono do schema**, onde a RLS não se aplica — ali passaria com a RLS desligada. Está em `cursos-e-turmas.test.ts`, **sessão autenticada real**, nas **duas metades**.
- [X] T035 [PR1] [US5] Escrever `supabase/migrations/<ts>_turma_disciplina_nasce.sql`: `app.turma_disciplina_codigo_seq` com `setval` único (`is_called = false` com a tabela vazia); `app.proximo_codigo_turma_disciplina()` `SECURITY DEFINER` **só com `nextval`**, sem `max()`; `default` da coluna; gatilho `app.fazer_nascer_disciplinas_da_turma()` `AFTER INSERT` `SECURITY DEFINER`, `search_path = pg_catalog, public`, `revoke all` de `public`, `anon` e `authenticated`, com a condição de herança do script da v2.0 (`FR-032` a `FR-032.3`, R-5, R-6) ⛓ T032, T034 · teste: T034
      ✅ **17/09/2026** — `20260918013345_turma_disciplina_nasce.sql`. **As duas metades da prova de permissão, e o defeito deliberado que as valida**: com a função em `SECURITY INVOKER`, a metade 1 **reprova** com `42501` em `turma_disciplina` — o acoplamento que o R-6 previu, medido; a metade 2 passa **nos dois casos**, que é o que a torna necessária. ⚠️ E o `DEFAULT` da coluna exigiu `grant execute` a `authenticated`: ele é avaliado com os direitos de **quem insere**, e sem isso toda criação de turma falharia com `permission denied for function`.
- [X] T036 [PR1] [US5] Plano de reversão da migration 4 no cabeçalho e executado — linhas já nascidas **ficam** (`FR-046`) ⛓ T035
      ✅ **17/09/2026** — reversão **executada sobre a base carregada**: turma nova (`CAHO T9 2099`) nasce com **zero** linhas, as **210** ficam intactas, e os 21 arquivos pgTAP anteriores verdes. ⚠️ **Medido no caminho de aplicação sobre base carregada, o `setval` posicionou a sequência em 210** — ali ela já nasce correta; quem precisa do passo da **T073** é o caminho inverso, `db:reset` primeiro e carga depois.

---

## Fase 7 — US6, US5 e US4 (PR 1): permissões (migration 5)

**Objetivo**: a linha `horarios` inteira do documento 01, `turmas.criar` do Operador, `cursos.desativar`
para os três, e as policies de regime sobre `horarios`. **Teste independente**: `103` e o bloco do Operador
verdes.

- [X] T037 [PR1] [P] [US6] Escrever `supabase/tests/103_permissoes.sql`: `horarios` com `ler` para os 9, `criar`/`editar` para os 4, `desativar` para os 3; `turmas.criar` do Operador; `cursos.desativar` só para Admin, Encarregado e Ajudante; **zero** ações `reativar` no seed; policies de escrita de `curso_regime_historico` lendo `horarios` (`FR-024`, `FR-024.1`, `FR-025`, `FR-017`, I-6) — ver reprovando antes da T039
      ✅ **17/09/2026** — `103`, **12** asserções de **catálogo**: cada célula conferida contra a linha do documento 01 §2.5, mais o **negativo de catálogo** (ninguém fora dos nomeados recebeu), zero ações `reativar`, as duas policies lendo `horarios`, a leitura ficando em `cursos.ler` e o `alcanca_curso` preservado nas duas.
- [X] T038 [PR1] [P] [US6] Acrescentar a `tests/invariantes/rls/cursos-e-turmas.test.ts` o bloco do Operador `expedito`: N-1 — em `C-Exp-BATI` cria turma e muda status (**aceitos**); N-2 — em `CAHO`, as mesmas **recusadas** pelo banco; N-3 — edita curso dentro e fora do escopo, **recusado** nos dois; perfis sem `horarios.criar` recusados ao inserir vigência (`FR-024`, `FR-025`, `FR-028`, `FR-044`, `SC-005`, `SC-005.1`) ⛓ T019 — ver reprovando antes da T039 · a vigência pela RPC entra na T044
      ✅ **17/09/2026** — **10** casos novos na suíte de RLS, com **sessão real**. ⚠️ **Entrou um perfil a mais, o `encarregado_orientacao_pedagogica`**: ele é quem o doc 01 deixa com `L` em `horarios` e em `turmas`, ou seja, o perfil pelo qual se prova o **negativo** de cada permissão nova. E entrou o **caso que discrimina a mudança de policy** (N-1b): o Operador é o **único** perfil com `horarios.criar` **sem** `cursos.editar`, então só por ele se observa que a policy trocou de recurso — sem ele, o negativo e o controle positivo passariam **antes e depois** da migration.
- [X] T039 [PR1] [US6] Escrever `supabase/migrations/<ts>_permissoes_horarios_turmas_cursos.sql`: as linhas novas de `perfil_permissao`, com as de `horarios.ler` e `horarios.desativar` **declaradas sem leitor** em comentário; `drop policy` e `create policy` de escrita de `curso_regime_historico` sobre `horarios.criar` e `horarios.editar`, com alcance; leitura continua em `cursos.ler` (`FR-024`, `FR-024.1`, `FR-025`, `FR-028`, `FR-017`) ⛓ T036, T037, T038 · testes: T037, T038
      ✅ **17/09/2026** — `20260918022106_permissoes_horarios_turmas_cursos.sql`, **24 linhas** (matriz de 152 → **176**), cada uma citando **a célula do doc 01 §2.5** que a autoriza. ⚠️ **Duas coisas que o documento autoriza e a migration NÃO criou, relatadas e não feitas**: `turmas.desativar` (turma tem ciclo de vida por `status`, não exclusão lógica) e as policies de `horarios_tempos_aula`, que continuam lendo `parametros`.
- [X] T040 [PR1] [US6] Plano de reversão da migration 5 no cabeçalho e executado — linhas passam a `permitido = false` (`FR-046`) ⛓ T039
      ✅ **17/09/2026** — reversão **executada sobre a base carregada**: as 20 linhas de `horarios` **continuam na matriz** com `permitido = false` (regra 4 — a matriz é dado), nenhuma policy lê `horarios`, e os 22 arquivos pgTAP anteriores verdes.

---

## Fase 8 — US6 (PR 1): vigência de regime (migration 6) e a segunda etapa das amostras

**Objetivo**: a vigência é append-only; a sucessão é explícita; a correção é atômica, com trava; vigência nova
não reinterpreta lançamento; curso não existe sem regime; a proteção por atividade global é legível; o
parâmetro do 9º TA existe. **Teste independente**: `104` verde, com **`RN-2027-09` nomeada**.

- [X] T041 [PR1] [P] [US6] Escrever `supabase/tests/104_vigencia_regime.sql`, parte 1: asserção nomeada **`RN-2027-09 · três vigências sucessivas resolvem cada lançamento pelo regime da sua data`**, com as três registradas **pela RPC**; cada parâmetro alterado recusado, **um por coluna**; `vigente_ate` gravado sem sucessora recusado **com `set constraints … immediate`**; sobreposição direta **ainda** `23P01`; o código `REG-NNNNNN` gerado por sequência (`RN-2027-09`, `FR-019`, `FR-019.3`, `FR-020`, `SC-006`, I-7) — ver reprovando antes das T045 a T048
      ✅ **18/09/2026** — `104`, **38** asserções nas três partes. ⚠️ **Dois achados de método, medidos aqui**: `set constraints … immediate` **vale até o fim da transação**, não só para o comando seguinte — deixá-lo ligado faz o gatilho adiado disparar no meio da RPC de correção, que legitimamente deixa a anterior com fim e sem sucessora por um instante; e **nem todo `DETAIL` é JSON** (o da `EXCLUDE` é texto do motor), o que derrubava o auxiliar antes da asserção que interessava.
- [X] T042 [PR1] [P] [US6] Parte 2 do `104`: correção — vigência sem lançamento corrigida mantendo a data (`FR-021.9`), e mudando a data (confere a menor); vigência com lançamento recusada, **um caso por tabela** (`registros_aula`, `avaliacoes` pela data e pela vista, `atividades_nao_letivas`); atividade global nos **4** resultados (janela contém, sem datas, janela incompleta compatível com motivo, curso sem turma na data); **nenhuma** decisão pelo status da turma (`FR-021.1` a `FR-021.6`, `SC-011.1`, `SC-011.2`, I-8) — ver reprovando antes das T045 a T048
- [X] T043 [PR1] [P] [US6] Parte 3 do `104`: vigência nova cujo período contém lançamento recusada, **um caso por tabela**, e vigência futura aceita; curso sem vigência `padrao` recusado **com `set constraints … immediate`**, por inserção solta e por cancelamento da única, e curso com vigência pela RPC aceito; a RPC `protecao_das_vigencias_por_atividade_global` devolve a vigência travada só pela atividade global semeada, marca a com lançamento próprio e devolve **vazio** a quem não tem `turmas.editar`; o parâmetro `regime.nono_ta_dias_por_semana_sem_aviso` = **2**, `operacional`, com fundamento (`FR-019.4`, `FR-019.5`, `FR-021.8`, `FR-023`, `SC-011.3` a `SC-011.5`, `SC-011.7`, I-8b, I-8c, I-11) — ver reprovando antes das T046 a T048
- [X] T044 [PR1] [P] [US6] Acrescentar a `tests/invariantes/rls/cursos-e-turmas.test.ts`: N-8 — Admin cria curso **pela API sem vigência** e é recusado com `curso_sem_regime`; pela RPC com a vigência, aceito; Operador `expedito` registra vigência em `C-Exp-BATI` pela RPC e é recusado em `CAHO` (`FR-019.5`, `FR-024`, `SC-005.1`, `SC-011.4`) ⛓ T038 — ver reprovando antes da T047
- [X] T045 [PR1] [US6] Escrever `supabase/migrations/<ts>_vigencia_de_regime.sql`, parte A: `app.guardar_vigencia_de_regime()` (imutabilidade de todo parâmetro, `fundamento_curricular`, `motivo` e `codigo`; `cancelado → ativo` recusado); `app.conferir_encadeamento_de_vigencias()` como `CONSTRAINT TRIGGER … DEFERRABLE INITIALLY DEFERRED`; `regime_unico_por_inicio` recriada como índice único parcial `WHERE status = 'ativo'`, mesmo nome; sequência e `app.proximo_codigo_vigencia_regime()` só com `nextval` (`FR-019.3`, `FR-020`, `FR-021.9`, R-13, R-14, R-19) ⛓ T040, T041 · teste: T041
      ✅ **18/09/2026** — `20260918025141_vigencia_de_regime.sql`. ⚠️ **O append-only da vigência bloqueia `DELETE` e `TRUNCATE` por gatilho de statement, inclusive para a `service_role` — mas NÃO `UPDATE`**, e a diferença é requisito: o `FR-020` manda aceitar exatamente duas escritas (gravar `vigente_ate` e cancelar), e um gatilho de statement em `UPDATE` recusaria as duas. Quem guarda o `UPDATE` é o gatilho de **linha**, coluna por coluna.
- [X] T046 [PR1] [US6] Na mesma migration, parte B: `app.lancamentos_que_travam_vigencia(vigencia_id, desde)` `SECURITY DEFINER` `STABLE`, com as 3 tabelas e o alcance global pela janela, e **o comentário do `FR-021.2`** junto (*toda tabela nova que dependa do regime entra nesta lista na mesma migration que a cria*); `app.travar_curso_para_correcao(curso_id)` com a ordem de trava do R-7; `app.conferir_vigencia_nova()` `BEFORE INSERT` com a trava e a recusa `vigencia_reinterpretaria_lancamento`; cancelamento só sem lançamento, com a trava; gatilho `app.travar_atividade_global()` em `atividades_nao_letivas` com trava exclusiva quando `turma_id` é nulo (`FR-019.4`, `FR-021.2` a `FR-021.7`, R-7) ⛓ T045, T042, T043 · testes: T042, T043
- [X] T047 [PR1] [US6] Na mesma migration, parte C: RPCs `public.registrar_vigencia_regime`, `public.corrigir_vigencia_regime` e `public.criar_curso_com_regime`, todas `SECURITY INVOKER`, com a recusa estruturada (`HINT` = chave, `DETAIL` = JSON) do contrato; `app.conferir_curso_com_regime()` como gatilho de restrição adiado `AFTER INSERT` em `cursos` e `AFTER UPDATE OF status` em `curso_regime_historico` (`FR-019`, `FR-019.5`, `FR-021.1`, `FR-021.3`, contrato de escritas §2) ⛓ T046, T044 · testes: T041 a T044
      ✅ **18/09/2026** — as três RPCs, `SECURITY INVOKER`. ⚠️ **Achado que só aparece rodando**: `criar_curso_com_regime` falhava com *new row violates row-level security policy* embora `cursos.criar` fosse **verdadeiro** — porque `INSERT … RETURNING` exige a policy de **LEITURA**, e `app.alcanca_curso()` é `STABLE`: dentro do mesmo comando, a linha recém-criada ainda não está no retrato que ela enxerga. O `id` passou a ser gerado na função, a inserção não devolve nada, e a leitura vem num comando separado. A mensagem apontava para a escrita, e a causa estava na leitura.
- [X] T048 [PR1] [US6] Na mesma migration, parte D: RPC de leitura `public.protecao_das_vigencias_por_atividade_global(curso_id)` `SECURITY DEFINER` `STABLE` com porteiro `turmas.editar` e alcance; a linha de `config_parametros` do 9º TA; `revoke` de `public` e `anon` em **toda** função desta migration (`FR-021.8`, `FR-023`, `FR-046`) ⛓ T047 · teste: T043
- [X] T049 [PR1] [US6] Plano de reversão da migration 6 no cabeçalho e executado — vigências registradas **ficam**; o parâmetro passa a `inativo`; a restauração da unicidade para e relata se houver cancelada com a data de uma ativa (`FR-046`) ⛓ T048
      ✅ **18/09/2026** — reversão executada: curso solto aceito de novo, parâmetro de vigência editável de novo, 23 arquivos pgTAP anteriores verdes. A restauração da unicidade passou porque a base tinha **0** pares de mesma data.
- [X] T050 [PR1] [US4] Ajustar `tests/invariantes/rls/rls.test.ts`, segunda etapa: as amostras de curso nascem por `criar_curso_com_regime`; o controle positivo `RLS-NEG-CONTROLE` (linha 995) cria pela RPC; a limpeza apaga a vigência antes do curso (`FR-019.5`, A-3) ⛓ T047, T015
      ✅ **18/09/2026** — e com uma consequência que a tarefa não previa: **o curso deixou de ser apagável**. `curso_regime_historico` é append-only com `DELETE` recusado **inclusive para a `service_role`**, e a FK do curso é `restrict` — então a limpeza não apaga curso nem vigência, e as amostras viraram **idempotentes**. Os `id` fixos saíram: a RPC gera o dela, e as constantes viraram o que sempre foram, chave de busca. O controle positivo passou a usar **código único por execução**.
- [X] T051 [PR1] [P] [US4] Ajustar `tests/e2e/instrutores-de-teste.ts`, segunda etapa: curso pela RPC; limpeza (linhas 407 a 438) apaga vigência antes do curso. **Regra dos esperados: nenhum esperado muda** — a vigência `padrao` é exigência do banco, e nenhuma asserção de instrutor a lê (`FR-019.5`, A-3) ⛓ T047, T016
      ✅ **18/09/2026** — curso pela RPC, idempotente; a limpeza deixa curso e vigência de pé, pelo mesmo motivo da T050. **Nenhum esperado mudou.**
- [X] T052 [PR1] [P] [US4] Ajustar `tests/e2e/panorama-de-teste.ts`, segunda etapa: cursos pela RPC; limpeza (224 a 232) apaga vigência antes do curso. **Regra dos esperados: nenhum esperado muda** — `vw_carga_horaria_turma` não lê a vigência; se o panorama mudar, **parar** e declarar (a) ou (b) (`FR-019.5`, A-3) ⛓ T047, T017
      ✅ **18/09/2026** — idem, e **nenhum esperado do panorama mudou**: `vw_carga_horaria_turma` não lê vigência, e a ponta a ponta continua em **158 passados**.

**Ponto de conferência**: `pnpm test:invariantes`, `pnpm test:rls` e `pnpm test:e2e` verdes.

---

## Fase 9 — US4 (PR 1): curso inativo (migration 7) e a varredura dos consumidores

**Objetivo**: curso inativo legível e alcançável no escopo, sem escrita nova; reativação só pela situação;
nenhuma tela da `main` deixa curso inativo vazar para lista de escolha. **Teste independente**: `105`, o bloco
de curso inativo da RLS e os casos de vazamento verdes.

- [X] T053 [PR1] [P] [US4] Escrever `supabase/tests/105_curso_inativo.sql`: `app.cursos_do_usuario()` devolve curso inativo nos **três** ramos e só no escopo; escrita recusada nas **16** tabelas com curso inativo, **uma asserção por tabela**, e o total de policies de escrita com a condição de oferta = **31**; desativar com turma `planejada`/`ativa` recusado nomeando as turmas; reativação aceita **só** pela situação, **por valor** (reenviar a linha inteira passa; mudar situação e propósito juntos, não); `sincronizar_habilitacoes` ignora curso inativo na inativação e recusa marcar disciplina dele; desativação feita **com sessão** por `request.jwt.claim.sub` (`FR-017` a `FR-017.9`, `SC-001.3`, `SC-001.5`, I-9, I-10, A-4) — ver reprovando antes das T055 a T057
      ✅ **18/09/2026** — `105`, **15** asserções. ⚠️ **A completude passou a ser provada por ENUMERAÇÃO, e as asserções de comportamento saíram daqui** *(decisão de Bernardo Villas Boas, 18/09/2026)*: o risco não é uma policy quebrar, é **uma ficar de fora**; e o pgTAP roda como dono do schema, onde a RLS não se aplica, de modo que "esta escrita é recusada" passaria com a RLS desligada. Aqui ficam o **conjunto** de policies e o que é **gatilho ou função**; o comportamento foi para a suíte de RLS. ⚠️ **Medido**: são **30** policies em **15** tabelas, e não 31 em 16 — ver o achado E-10.
- [X] T054 [PR1] [P] [US4] Acrescentar a `tests/invariantes/rls/cursos-e-turmas.test.ts`: N-6 — com `C-Exp-BATI` inativo, reativar aceito para os **3** e recusado para os outros **6**; escrita em tabela dependente de curso inativo pela API: `INSERT` recusado com `42501`, `UPDATE` devolvendo **zero linhas**; N-9 — `curso_sigla_historico` lida por quem tem `auditoria.ler` e recusada ao Operador, e gravação direta recusada a **todos** (`FR-017.5`, `FR-017.7`, `FR-014.1`, `SC-001.5`, contrato de escritas §2, A-4) ⛓ T044 — ver reprovando antes da T055
      ✅ **18/09/2026** — **8** casos novos, com o **caso que discrimina** em duas metades: a MESMA escrita, no MESMO curso, com a MESMA sessão, **aceita** com o curso ativo e **recusada com `42501`** depois de desativá-lo; e o **contrapeso**, a mesma escrita num curso ativo, que continua aceita — sem ele, uma condição que recusasse tudo passaria na primeira metade. ⚠️ **E a desativação da amostra é feita pela SESSÃO do Admin**: a `service_role` não tem perfil e cai em `situacao_sem_permissao` (A-4) — o achado mordeu a própria amostra.
- [X] T055 [PR1] [US4] Escrever `supabase/migrations/<ts>_curso_inativo.sql`, parte A: `app.cursos_do_usuario()` sem filtro de situação; `app.curso_em_oferta`, `app.turma_em_oferta` (nulo → verdadeiro) e `app.disciplina_em_oferta` `SECURITY DEFINER` `STABLE`; as **31** policies de escrita com a condição, tabela por tabela como o data-model §3; `cursos_editar` **sem** a condição (`FR-017.1`, `FR-017.5`, R-1, R-3) ⛓ T049, T053, T054 · testes: T053, T054
      ✅ **18/09/2026** — `20260918041449_curso_inativo.sql`, parte A: `cursos_do_usuario()` sem filtro de situação nos três ramos, as três funções de oferta e as **30** policies, tabela por tabela.
- [X] T056 [PR1] [US4] Na mesma migration, parte B: gatilho `app.guardar_situacao_do_curso()` `BEFORE UPDATE` — desativar exige `cursos.desativar` e nenhuma turma pendente (mensagem com as turmas); curso inativo só aceita voltar a `ativo` com o resto igual, excluídos auditoria e `nome_normalizado`; `cursos_criar` com `status = 'ativo'` no `WITH CHECK` (`FR-017`, `FR-017.4`, `FR-017.7`) ⛓ T055 · testes: T053, T054
      ✅ **18/09/2026** — a guarda compara **por valor**, sobre a linha inteira **menos** `status`, o quarteto de auditoria e `nome_normalizado` (coluna gerada, que num gatilho `BEFORE` ainda não foi recalculada). ⚠️ **Provado pelo caminho real**: reenviar a linha **inteira** com os mesmos valores é aceito — é o que o formulário faz.
- [X] T057 [PR1] [US4] Na mesma migration, parte C: `public.sincronizar_habilitacoes` ignora disciplina de curso inativo na inativação e recusa marcar, com a chave `habilitacao_em_curso_inativo` (`FR-017.9`, R-2) ⛓ T056 · teste: T053
      ✅ **18/09/2026** — e exercido com um curso **realmente desativado**, não simulado: a previsão do R-2 confirmou-se, a função ignora disciplina de curso inativo na inativação (a habilitação existente fica **intacta**) e recusa marcar, com `habilitacao_em_curso_inativo`.
- [X] T058 [PR1] [US4] Plano de reversão da migration 7 no cabeçalho e executado (`FR-046`) ⛓ T057
      ✅ **18/09/2026** — reversão executada: criar disciplina em curso inativo volta a ser **aceito**, e desativar deixa de exigir permissão.
- [X] T059 [PR1] [P] [US4] Conferir `tests/e2e/convite.spec.ts` depois da migration 7: a leitura de alcance da linha 126 continua com o resultado que o caso espera, agora que curso inativo é alcançável; se mudar, ajustar a expectativa citando o `FR-017.1`; se não mudar, fechar sem edição, com a execução registrada (`FR-017.1`, A-1) ⛓ T055
      ✅ **18/09/2026 — fechada SEM edição**, e medida, não deduzida: a suíte inteira rodou verde depois da migration 7. A asserção da linha 126 prova que credencial **sem linha em `usuarios`** alcança **zero** cursos, e esse ramo é o **primeiro** de `cursos_do_usuario()` — `if v_usuario is null or v_perfil is null then return;` —, que devolve conjunto vazio **antes** de qualquer filtro de situação. A migration não o tocou.
- [X] T060 [PR1] [P] [US4] Escrever em `tests/e2e/instrutores.spec.ts` os casos de vazamento, com um curso de teste **desativado por sessão autenticada** — `cliente('admin').from('cursos').update({ status: 'inativo' })`, pela API com a RLS, **nunca** a Server Action `desativarCurso`, que só nasce no PR 2, Fase 18 (A-4; achado 4 do analyze): o painel de habilitação do cadastro e da ficha **não** oferece disciplina dele; habilitação existente nele aparece **só leitura**; o filtro por curso da listagem **mostra** o curso, depois dos ativos, marcado *inativo*; marcar disciplina dele pela ação recebe a mensagem de negócio (`FR-017.6`, `FR-017.9`, `FR-017.10`, `SC-001.3`) ⛓ T057 — ver reprovando antes das T061 a T064
      ✅ **18/09/2026** — **4** casos novos, com curso **próprio** (`CUR-INAT-<processo>`) e não o da amostra compartilhada: `fullyParallel` está ligado, e desativar o curso comum derrubaria casos vizinhos, com a reprovação aparecendo longe da causa. ⚠️ **E o caso da mensagem de negócio percorre a CORRIDA REAL** — a ficha abre com o curso ativo (logo a opção é oferecida), o curso é desativado **por outra sessão** com a página aberta, e só então a pessoa marca e grava. É o único caminho honesto de chegar à gravação depois de as T061 e T062 tirarem a opção da tela.
- [X] T061 [PR1] [US4] Em `app/(app)/instrutores/novo/page.tsx`, não oferecer disciplina de curso inativo ao painel de habilitação (`FR-017.6`) ⛓ T060 · teste: T060
      ✅ **18/09/2026** — e a correção não ficou na página: `comSigla()` passou a decidir a oferta, porque **`disciplinas.status` continua `ativo` quando o curso é desativado**. O painel oferecia uma disciplina que o banco ia **recusar** na gravação. Caso em duas metades: com o curso ativo a disciplina **é** oferecida; desativado, some — a mesma tela, a mesma busca.
- [X] T062 [PR1] [US4] Em `app/(app)/instrutores/[codigo]/page.tsx`, mesma regra para as opções, e as habilitações existentes em curso inativo **exibidas só leitura** (`FR-017.6`) ⛓ T060 · teste: T060
      ✅ **18/09/2026** — as duas metades no mesmo arquivo: a **opção** some, e a **habilitação existente** continua exibida. A ficha já lia de duas listas (`catalogo` inteiro para exibir, `catalogo.filter(d => d.ativa)` para oferecer), então bastou `ativa` passar a significar **oferecível**. ⚠️ Tirar a linha do catálogo teria apagado o histórico da tela.
- [X] T063 [PR1] [P] [US4] Em `app/(app)/instrutores/page.tsx`, o filtro por curso mostra curso inativo depois dos ativos, marcado *inativo* (`FR-017.10`) ⛓ T060 · teste: T060
      ✅ **18/09/2026** — ⚠️ **na direção contrária das T061/T062, de propósito**: filtrar instrutor por curso arquivado é consulta sobre **histórico**, e escondê-lo tornaria o passado inalcançável. Ele entra, **no fim e marcado**. Provado por **defeito deliberado** (a lista volta a não ordenar nem marcar → reprova) e por **teste de unidade** novo, `tests/unidade/opcoes-de-filtro-de-curso.test.ts`: a prova de ponta a ponta tem **um** curso inativo e não distingue *"os inativos vão para o fim"* de *"este curso foi para o fim"*.
- [X] T064 [PR1] [P] [US4] Em `lib/acoes/instrutor.ts`, traduzir a recusa `habilitacao_em_curso_inativo` em *"{Disciplina} é de curso inativo e não recebe habilitação nova."* (`FR-017.9`, contrato de escritas §2) ⛓ T057 · teste: T060
      ✅ **18/09/2026** — a recusa chega como **`23514` com `hint`**, e não `42501`, de propósito: a policy sozinha devolveria `42501`, que esta ação traduz como *"o seu perfil não pode"* — e **a pessoa tem exatamente o perfil certo**. A leitura do `DETAIL` degrada para o plural genérico se ele não for JSON (`RN-DEG-01`). Provado por defeito deliberado.
- [X] T065 [PR1] [P] [US4] Escrever em `tests/e2e/inicio.spec.ts` o caso: curso de teste inativo **não** aparece no panorama, e a contagem que distingue *"ainda não existe"* continua contando todos (`FR-017.6`) ⛓ T055 — ver reprovando antes da T066
      ✅ **18/09/2026** — **2** casos, e o contrapeso só morde com os **dois** cursos inativos: com um ativo sobrando o panorama não fica vazio, nenhum estado vazio é desenhado e a asserção passaria sem provar nada.
- [X] T066 [PR1] [US4] Em `app/(app)/inicio/page.tsx`, filtrar `cursos.status = 'ativo'` **explicitamente** na montagem das turmas, mantendo a contagem sobre todos (`FR-017.6`, R-1) ⛓ T065 · teste: T065
      ✅ **18/09/2026** — o caso **reprovou antes** da correção: a turma do curso desativado continuava no panorama. ⚠️ **E a contagem NÃO recebeu o filtro**: ela responde *"existe curso neste sistema?"*, e curso arquivado existe — filtrá-la por simetria faria a tela anunciar *"ainda não existe no sistema"* numa base com dezenas de cursos arquivados.
- [X] T067 [PR1] [US4] Refazer a varredura de consumidores de `app.cursos_do_usuario()` e do alcance **por busca no repositório** — não pela lista do R-1 — e registrar o resultado, com o que mudou em cada consumidor, como adendo datado ao R-1 em `specs/009-cursos-e-turmas/research.md` (`FR-017.6`) ⛓ T061 a T066
      ✅ **18/09/2026** — adendo datado no `research.md`. **Nenhum dos seis números do R-1 estava errado, e a lista NÃO cresceu**; mudou só a linha 6 (testes que nomeiam o alcance: **0 → 2**), e os dois nasceram nesta fatia. ⚠️ **A varredura quase produziu um quarto consumidor que não existe**: `criar_curso_com_regime` casa a busca em `prosrc` mas **só menciona a função num comentário** — é o achado 5 da fatia (b) do Épico 4 do lado do SQL, e por isso a contagem tira comentário antes de comparar. ⚠️ **E a §3 do `data-model.md` reusava o número certo para a pergunta errada**: são **31** policies de escrita com *alcance* (16 tabelas) e **30** que ganham a *condição de oferta* (15) — a diferença é `cursos_editar`.

---

## Fase 10 — US2 (PR 1): o endereço de turma, uma função só

**Objetivo**: todo endereço de turma sai de uma função, e o link do Início sai codificado. **Teste
independente**: ida e volta dos 28 códigos e das 24 siglas, varredura e o link do Início verdes.

- [X] T068 [PR1] [P] [US2] Escrever `tests/unidade/endereco-de-turma.test.ts` com o retrato versionado dos **28** códigos de turma e das **24** siglas da base de 16/09/2026 em `tests/unidade/dados/codigos-da-base.json`, gerado por consulta ao banco local povoado: cada um, codificado e decodificado, volta **idêntico**; `enderecoDaTurma`, `enderecoDaTurmaNoCurso` (com `%20`, nunca `+`) e `enderecoDaNovaTurma` produzem os exemplos do contrato; decodificar **uma vez só** (`FR-031.1` a `FR-031.3`, `SC-002.1`, contrato de rotas §4) — ver reprovando antes da T069
      ✅ **18/09/2026** — **11** asserções, sobre o retrato de `tests/unidade/dados/codigos-da-base.json`, gerado **por consulta ao banco carregado** (28 turmas, 24 siglas). ⚠️ **Por isso a Fase 11 rodou ANTES da 10**: um retrato inventado passaria com qualquer implementação, porque os exemplos que alguém inventa são os que ele já sabe que funcionam. Inclui o caso do código com `%`, que **nenhum dos 28 tem** — e é justamente por isso que ele existe: a decodificação dupla passaria despercebida na base inteira.
- [X] T069 [PR1] [US2] Criar `lib/navegacao/endereco-de-turma.ts` — TypeScript puro, sem `next` nem `react` — com as quatro funções do contrato de rotas §4 (`FR-031.1`, `FR-031.2`, `FR-037`) ⛓ T068 · teste: T068
      ✅ **18/09/2026** — `lib/navegacao/endereco-de-turma.ts`, as quatro funções. ⚠️ **`encodeURIComponent` e não `URLSearchParams`**: este serializa espaço como `+`, que é válido em corpo de formulário e **não** em caminho de URL; os dois decodificam para o mesmo texto, e o `FR-031.1` pede **uma** representação.
- [X] T070 [PR1] [P] [US2] Escrever `tests/unidade/endereco-de-turma-unico.test.ts`: varredura de `app/`, `components/` e `lib/` **em código sem comentário** que reprova `/turmas/` ou `?turma=` montado fora de `lib/navegacao/endereco-de-turma.ts`, com controle positivo (`FR-031.2`, `SC-002.1`) ⛓ T069
      ✅ **18/09/2026** — e o **controle positivo pegou a fraqueza da própria varredura**: a primeira formulação exigia `"/turmas/` dentro do módulo e reprovou, porque ele declara `RAIZ_DE_TURMAS = "/turmas"`, sem barra. Uma verificação que não encontra o caso que deveria encontrar não distingue *"ninguém viola"* de *"eu procuro errado"*.
- [X] T071 [PR1] [P] [US2] Escrever em `tests/e2e/inicio.spec.ts` o caso: o link de uma turma de teste com espaço no código sai **codificado** (`%20`) no `href` (`FR-031.2`, `SC-002.1`) — ver reprovando antes da T072
      ✅ **18/09/2026** — **2** casos: o `href` traz `%20` e **é exatamente** o que a função produz. A segunda metade fecha a regra — *"tem `%20`"* passaria com qualquer codificação parcial feita à mão. ⚠️ E a asserção é sobre o `href` que foi para o DOM, **não** sobre a URL depois do clique: o navegador conserta o espaço ao navegar, e medir depois mostraria verde com o defeito no lugar.
- [X] T072 [PR1] [US2] Em `app/(app)/inicio/page.tsx`, montar o link com `enderecoDaTurmaNoCurso` (`FR-031.2`) ⛓ T066, T069, T071 · testes: T070, T071
      ✅ **18/09/2026** — o defeito do `FR-031.2` **estava na `main`** desde a fatia (c) do Épico 4: `href={`/cursos/${t.cursoCodigo}?turma=${t.turmaCodigo}`}`, sem codificar, e o código da turma **contém espaço**.

---

## Fase 11 — Carga do ETL (PR 1): sequências, sala e a verificação prévia

**Transversal** — atravessa as US4, US5 e US6. Cada prova parte de `pnpm db:reset`, carrega o `staging` e o
**altera** para produzir o caso, confere a mensagem e confere que **nada** foi gravado. As provas moram em
scripts no padrão de `scripts/etl/provar_carregador.py` e são **rodadas à mão**, com a saída registrada no PR 1
(decisão de 17/09/2026). **Levá-las ao CI é a pendência `PEND-5a-4`**, em PR próprio e **sem** dado real da v2.0.

- [X] T073 [PR1] Acrescentar à carga, em `scripts/etl/carregar.py`, o passo final que avança cada sequência de código — `turma_disciplina`, `curso_regime_historico`, e as duas da fatia (c) — para o maior valor carregado (`FR-032.2`, `FR-019.3`, R-16) · prova: T074
      ✅ **18/09/2026** — `avancar_sequencias()` em `carregar.py`, chamada por `promover()` **dentro da transação**: ela lê `public`, que no início da carga está vazia, e promoção desfeita não pode deixar sequência avançada. ⚠️ `setval(…, n, true)` — com `false` o próximo `nextval` devolveria `n`, e a primeira turma nova colidiria com a última carregada.
      ⚠️ **O MOTIVO MEDIDO, escrito aqui porque quem testar pelo caminho bom conclui que esta tarefa é redundante** *(17/09/2026)*: aplicando as migrations **sobre a base já carregada**, o `setval` da migration 4 posiciona a sequência no maior código existente — **medido: 210** — e o passo parece desnecessário. No caminho **inverso**, que é o de todo dia (`pnpm db:reset` primeiro, carga depois), as migrations rodam sobre base **vazia**, a sequência fica em **1**, o ETL grava `TDI-000001` a `TDI-000210` explicitamente, e a **primeira turma nova colide com `23505`**. Mesmo princípio do `--no-file-parallelism`: **sinalizador sem motivo registrado é sinalizador apagado**
- [X] T074 [PR1] [P] Escrever em `scripts/etl/provar_carga_009.py` a prova das sequências: depois da carga, criar uma turma e uma vigência de teste e conferir `TDI-000211` e `REG-000030`; sem o passo da T073, reprova com `23505` (`FR-032.2`, `FR-019.3`, R-16, quickstart passo 1) ⛓ T073
      ✅ **18/09/2026** — medido: **TDI-000211** e **REG-000030**, exatamente o previsto. Provado por **defeito deliberado** (as quatro em 1 → reprova). ⚠️ **ACHADO: as duas da fatia (c) passam mesmo zeradas** — a rede do `MAX+1` dentro de `proximo_codigo_vinculo` e `proximo_codigo_instrutor` mascara o defeito, e é o que a **T132** vai tirar; no dia em que sair, este passo é a única defesa. ⚠️ **E a prova foi tornada IDEMPOTENTE**: `nextval`/`setval` **não obedecem a `ROLLBACK`**, e a primeira versão reprovava na segunda execução sem nada de errado na carga.
- [X] T075 [PR1] Aplicar na promoção, em `scripts/etl/promover.py`, **a mesma lista de substituições de sala** da migration 1, e gravar cada troca em `migracao_log` como `corrigido` (`FR-029.8`, R-20) ⛓ T020 · prova: T076
      ✅ **18/09/2026** — ⚠️ **e a posição do passo é o aprendizado**: escrito ao fim da promoção, a carga **abortou** com *"O valor «Laboratório de informática» não pertence à lista «salas»"* — `trg_turmas_sala_alocada` recusa no instante em que `turmas` é promovida. A substituição passou para **antes do laço**, sobre o `staging`; o **registro** ficou para depois, porque `migracao_log` só existe no fim e o código do evento continua a numeração da origem.
- [X] T076 [PR1] [P] Acrescentar a `scripts/etl/provar_carga_009.py` a prova da substituição: **9** turmas com `Laboratório de Informática`, **0** com a grafia antiga, **9** eventos `corrigido` (`FR-029.8`, `SC-014.4`) ⛓ T075
      ✅ **18/09/2026** — **9** turmas na grafia canônica, **0** na antiga, **9** eventos `corrigido`, e cada evento conferido contra a turma: o `valor_depois` é o que está gravado hoje. Contar eventos não prova nada; o que prova é que o registro descreve uma correção real.
- [X] T077 [PR1] Criar a estrutura da verificação prévia em `scripts/etl/carregar.py`, dentro de `conferir_antes_de_escrever`: lê o `staging` já preparado, reúne **todas** as falhas de todas as conferências com a linha e o requisito, e impede a carga antes de qualquer `INSERT` (`FR-019.6`, R-27) · provas: T088 a T097
      ✅ **18/09/2026** — ⚠️ **a ordem em `carregar()` mudou, e a mudança é o ponto**: a verificação lê o `staging`, então ele é preparado **antes** — dentro da mesma transação. Recusa → `rollback` desfaz até a criação das tabelas (DDL é transacional no PostgreSQL), e a base fica **byte a byte** como estava. É isso que faz *"nada foi escrito"* ser conferível, e não uma promessa.
- [X] T078 [PR1] Conferência 1 — curso sem vigência `Padrao` ativa em `Cad_Cursos_Regime_Historico`, nomeando código e nome do curso (`FR-019.5`, `FR-019.6`) ⛓ T077 · prova: T088
      ✅ **18/09/2026** — curso sem vigência `Padrao` ativa. Medida **zero** na origem.
- [X] T079 [PR1] Conferência 2 — curso com classificação `geral` ou `ead_semipresencial` (`FR-003.1`, `FR-019.6`) ⛓ T077 · prova: T089
      ✅ **18/09/2026** — classificação que o banco recusa. Medida **zero** na origem.
- [X] T080 [PR1] Conferência 3 — curso sem modalidade ou sem duração em dias (`FR-015`, `FR-019.6`) ⛓ T077 · prova: T090
      ✅ **18/09/2026** — curso sem duração **ou** sem modalidade. Medida **zero** na origem. ⚠️ **AS DUAS METADES TÊM DESFECHOS DIFERENTES, e isso é a decisão E-6**: duração ausente **aborta** (`NOT NULL` sem catraca); modalidade ausente **não aborta** — a catraca aceita nulo em linha migrada e nunca editada. Mas os **13** são **relatados em voz alta** mesmo sem abortar: silenciá-los faria a carga passar sem ninguém saber que 13 dos 24 cursos entraram sem modalidade.
- [X] T081 [PR1] Conferência 4 — turma sem modalidade (`FR-015`, `FR-027`, `FR-019.6`) ⛓ T077 · prova: T091
      ✅ **18/09/2026** — turma sem modalidade. Medida **zero** na origem.
- [X] T082 [PR1] Conferência 5 — sala sem correspondência na lista **depois** da substituição da T075 (`FR-029`, `FR-029.8`, `FR-019.6`) ⛓ T077, T075 · prova: T092
      ✅ **18/09/2026** — sala sem correspondência. Medida **zero** na origem. ⚠️ Casa por `app.normalizar_texto()`, a **mesma** regra da substituição — conferir por igualdade exata acusaria as 9 turmas que a promoção corrige sozinha, e a carga abortaria por um problema que ela mesma resolve.
- [X] T083 [PR1] Conferência 6 — rótulo fora da forma `T<n>` (`FR-025.2`, `FR-019.6`) ⛓ T077 · prova: T093
      ✅ **18/09/2026** — rótulo fora de `T<n>`. Medida **zero** na origem.
- [X] T084 [PR1] Conferência 7 — código de turma diferente de `sigla [rótulo] ano` (`FR-025.1`, `FR-019.6`) ⛓ T077 · prova: T094
      ✅ **18/09/2026** — código ≠ `sigla [rótulo] ano`. Medida **zero** na origem.
- [X] T085 [PR1] Conferência 8 — duas turmas com o mesmo rótulo, vazio incluído, no mesmo curso e ano (`FR-026`, `FR-019.6`) ⛓ T077 · prova: T095
      ✅ **18/09/2026** — rótulo repetido no mesmo curso e ano. Medida **zero** na origem.
- [X] T086 [PR1] Conferência 9 — vigência ativa com `Vigente_Ate` sem sucessora ativa no dia seguinte (`FR-020`, `FR-019.6`) ⛓ T077 · prova: T096
      ✅ **18/09/2026** — vigência encerrada sem sucessora. Medida **zero** na origem.
- [X] T087 [PR1] Conferência 10 — ordem de carga em `scripts/etl/ordem.py`: `cursos` antes de `curso_regime_historico`; `turmas` antes de `disciplinas`; `curso_regime_historico` antes de `registros_aula`, `avaliacoes` e `atividades_nao_letivas` (`FR-032.2`, `FR-019.4`, `FR-019.6`) ⛓ T077 · prova: T097
      ✅ **18/09/2026** — ordem de carga. Medida **zero** na origem. ⚠️ Confere **precedência**, não lista literal: comparar com uma cópia da ordem certa só detectaria que alguém mexeu, e obrigaria a manter duas listas em sincronia.
- [X] T088 [PR1] [P] Prova da conferência 1 em `scripts/etl/provar_verificacao_previa.py`: `staging` sem a linha `Padrao` de um curso → carga falha na verificação, mensagem nomeia o curso, **zero** linhas gravadas (`FR-019.6`, `SC-011.6`) ⛓ T078
      ✅ **18/09/2026** — `provar_verificacao_previa.py`. **As dez pegam**, cada uma com um defeito injetado no `staging` e desfeito por savepoint; mais o **controle positivo** (a origem real passa nas dez), sem o qual uma verificação que recusasse tudo passaria em todas as provas.
- [X] T089 [PR1] [P] Prova da conferência 2 no mesmo script: um curso com `EAD_Semipresencial` (`FR-003.1`, `SC-011.6`) ⛓ T079
      ✅ **18/09/2026** — ver T088.
- [X] T090 [PR1] [P] Prova da conferência 3: um curso sem modalidade e outro sem duração em dias (`FR-015`, `SC-011.6`) ⛓ T080
      ✅ **18/09/2026** — ver T088.
- [X] T091 [PR1] [P] Prova da conferência 4: uma turma sem modalidade (`FR-027`, `SC-011.6`) ⛓ T081
      ✅ **18/09/2026** — ver T088.
- [X] T092 [PR1] [P] Prova da conferência 5: uma turma com `Sala 05` (`FR-029`, `SC-011.6`) ⛓ T082
      ✅ **18/09/2026** — ver T088.
- [X] T093 [PR1] [P] Prova da conferência 6: uma turma com rótulo `t1` (`FR-025.2`, `SC-011.6`) ⛓ T083
      ✅ **18/09/2026** — ver T088.
- [X] T094 [PR1] [P] Prova da conferência 7: uma turma com código `CAHO 2026 T1` (`FR-025.1`, `SC-011.6`) ⛓ T084
      ✅ **18/09/2026** — ver T088.
- [X] T095 [PR1] [P] Prova da conferência 8: duas turmas sem rótulo no mesmo curso e ano (`FR-026`, `SC-011.6`) ⛓ T085
      ✅ **18/09/2026** — ver T088.
- [X] T096 [PR1] [P] Prova da conferência 9: uma vigência com `Vigente_Ate` e sem sucessora (`FR-020`, `SC-011.6`) ⛓ T086
      ✅ **18/09/2026** — ver T088.
- [X] T097 [PR1] [P] Prova da conferência 10: uma ordem de carga com `disciplinas` antes de `turmas`, montada na prova sem tocar em `ordem.py` (`FR-032.2`, `SC-011.6`) ⛓ T087
      ✅ **18/09/2026** — ver T088.
- [X] T098 [PR1] Carga completa sobre as sete migrations: `pnpm db:reset` + `python -m scripts.etl.executar` saindo **0**, reconciliação APROVADA, as dez conferências em **zero**, `curso_sigla_historico` sem tropeçar na cobertura (A-8); rodar `provar_carga_009.py` e `provar_verificacao_previa.py` e registrar as saídas; conferir à mão com a base povoada as **18 de 29** vigências corrigíveis (quickstart passos 1 e 2) (`FR-019.6`, `SC-011.1`, `SC-011.6`, `SC-014.4`) ⛓ T074, T076, T088 a T097, T067
      ✅ **18/09/2026** — `pnpm db:reset` + `python -m scripts.etl.executar --primeira-carga` sai **0**, reconciliação **APROVADA**, **5.394** linhas promovidas, as dez conferências em zero. As **18 de 29** vigências corrigíveis conferidas à mão na base povoada — e **11 travadas**, como o `SC-011.1` prevê. ⚠️ **O ABORTO FOI PROVADO POR COMPARAÇÃO, não por mensagem** *(exigência de Bernardo Villas Boas, 18/09/2026)*: as **55** tabelas de `public` e `staging` têm contagem **idêntica** antes e depois de uma carga abortada com origem inválida. *"Abortou com saída 3"* prova que parou, não que não escreveu.
      ✅ **22/09/2026 — conferência local de Bernardo Villas Boas, concluída**, pelo [`roteiro-de-conferencia.md`](./roteiro-de-conferencia.md). Os cinco números da tela: **conferiram**, em 22/09/2026. As salas: **reformulada** — a substituição casou por texto normalizado **exato** contra a lista canônica, e não por semelhança (8 salas, 8 formas normalizadas distintas, medido), então trocar uma sala por outra era impossível pelo caminho usado; **fica para conferência humana a distribuição (9 no laboratório) e as 2 turmas sem sala, pendentes da leitura de Bernardo** da tabela entregue em 22/09/2026. **A guarda do `credencial_local.py`** — recusa endereço de banco que não seja local e não cria cadastro que não exista — **foi conferida em 22/09/2026** *(registro pedido por Bernardo Villas Boas)*. ⚠️ **Dois defeitos de acesso no caminho, registrados no roteiro para quem o repetir**: (1) `pnpm dev` abre as telas contra o banco da **nuvem** — corrigido com `pnpm dev:local` (`7e4eca4`), e um `pnpm dev` esquecido aberto continua respondendo no lugar do novo; (2) abrir pelo **endereço de rede** da máquina em vez de `localhost` faz o Next bloquear os arquivos de desenvolvimento (*"Blocked cross-origin request to Next.js dev resource"*), e o botão Entrar não funciona — reproduzido em 22/09/2026.

---

## Fase 12 — Fechamento do PR 1

- [X] T099 [PR1] `pnpm db:tipos` e `pnpm db:tipos:conferir`, com `lib/tipos/database.ts` trazendo as colunas, a tabela e as RPCs — e a conferência **onde a garantia de fato está**: `duracao_dias` **obrigatória** no tipo de inserção; `modalidade` **anulável e opcional**, porque a catraca a moveu para o `CHECK` `cursos_modalidade_so_nula_no_historico`, e o tipo **não a garante mais** (`FR-046`, `FR-015.1`) ⛓ T058
      ⚠️ **Texto corrigido em 17/09/2026, na fatia 3, e não na Fase 13** *(decisão de Bernardo Villas Boas)*. Ele dizia *"a obrigatoriedade nova de `modalidade` e `duracao_dias`"*, o que deixou de valer com a catraca do achado E-6. **Motivo de corrigir agora:** *"tarefa que se sabe errada e só será lida dez paradas adiante é lida literalmente por quem a executar"* — o mesmo motivo pelo qual o `CLAUDE.md` foi corrigido na hora e não na T107. E a propriedade geral por trás está no `CLAUDE.md` (*Gotchas*, item 5): **o gerador de tipos não enxerga gatilho nem `CHECK`**, então `turmas.codigo`, o `TDI-` e o regime também aparecerão como obrigatórios sem que o tipo prove coisa alguma sobre eles
      ✅ **22/09/2026** — `db:tipos` e `db:tipos:conferir` saem 0, e o tipo versionado **já estava igual** ao banco. Conferido **onde a garantia está**: `cursos.Insert.duracao_dias` **obrigatória**; `cursos.Insert.modalidade?` **opcional e anulável** — a garantia é a catraca, não o tipo. E o gotcha 5.2 confirmado na prática: `turmas.Insert.codigo` obrigatório (é gatilho), `turma_disciplina.Insert.codigo?` opcional (é `DEFAULT`). `curso_sigla_historico` e as quatro RPCs presentes.
- [X] T100 [PR1] [P] Defeito deliberado: tirar a condição de oferta de uma das 31 policies — `105` e o bloco de curso inativo da RLS **reprovam**; desfazer e registrar (`FR-017.5`, quickstart passo 2) ⛓ T055
      ✅ **22/09/2026** — `disciplinas_criar` sem `app.curso_em_oferta(curso_id)` (a tarefa diz "uma das 31"; são **30**, ver o adendo do `data-model.md` §3). **Reprovaram:** o `105` e a RLS do bloco `FR-017.5` (**7 passados, 1 reprovado** — exatamente a *metade 2*, o caso que discrimina). **Depois de desfeito:** `105` verde, bloco **8 de 8**. **Rastro:** **1** disciplina entrou em curso inativo durante a janela do defeito — que é o furo que ele abria. ⚠️ **Os quatro defeitos rodaram numa execução só, pelo script versionado `scripts/provas/provar_defeitos_deliberados.py`**, cada um: plantado e **commitado** (as suítes entram por outras conexões), suítes **reprovando**, desfeito **explicitamente** — nunca por `rollback` —, e as mesmas suítes **verdes** de novo. **Como se conferiu que a base voltou:** `pg_dump` da estrutura de `public` e `app` antes e depois, **byte a byte** — 9.746 linhas idênticas depois de cada defeito e no fim.
- [X] T101 [PR1] [P] Defeito deliberado N-7: `cursos_criar` com `with check (true)` — o caso N-7 **reprova**; desfazer e registrar (`FR-044`, quickstart passo 3) ⛓ T015, T056
      ✅ **22/09/2026** — `cursos_criar` com `with check (true)`. O "N-7" do quickstart mora em `rls.test.ts` (Épico 1, ajustado pela T015). **Reprovaram 8 de 8** casos de "não cria curso"; **depois, 8 de 8 verdes**. **Rastro: 0** cursos gravados por perfil sem `cursos.criar`. **Por que zero, com a policy aberta — medido em 22/09/2026, numa transação desfeita:** o `INSERT` **passa pela RLS** (`INSERT 0 1`), e quem recusa é o gatilho adiado de curso sem regime, no `COMMIT` — *"Todo curso tem regime de horario"*, chave `curso_sem_regime` (`FR-019.5`). ⚠️ **As duas defesas são independentes, e a segunda segurou o que a primeira deixou de segurar**. (Medido como `authenticated` sem usuário específico: as contas da suíte já tinham sido removidas, e com a condição literalmente `true` o usuário não entra na decisão.)
- [X] T102 [PR1] [P] Defeito deliberado: remover `app.conferir_curso_com_regime()` — o `104` e o N-8 **reprovam**; desfazer e registrar (`FR-019.5`, quickstart passo 2) ⛓ T047
      ✅ **22/09/2026** — `drop function app.conferir_curso_com_regime() cascade`, que leva junto **os dois** gatilhos adiados. **Reprovaram:** o `104` e o N-8 (**1 passado, 1 reprovado** — o "Admin NÃO cria curso pela API sem vigência"). **Restaurado a partir das 5 seções do próprio `pg_dump` de antes** — função, comentário, os dois gatilhos e as permissões —, e não de SQL reescrito de memória. **Depois:** `104` verde, N-8 **2 de 2**. **Rastro:** **1** curso sem regime ficou gravado — o furo que o defeito abria.
- [X] T103 [PR1] [P] Defeito deliberado: montar à mão um endereço de turma em `app/(app)/inicio/page.tsx` — a T070 **reprova**; desfazer e registrar (`FR-031.2`) ⛓ T070, T072
      ✅ **22/09/2026** — `href` montado à mão no Início. A varredura da T070 **reprovou** (3 passados, 1 reprovado); o arquivo foi restaurado **byte a byte**, `git diff` vazio, e a varredura voltou a **4 de 4**. ⚠️ **Três defeitos da própria prova, pegos no caminho e corrigidos antes do veredito:** (1) o comparador acusava "estrutura diferente" por causa das linhas `\restrict`/`\unrestrict`, que o `pg_dump` 17.6 escreve com **código aleatório novo a cada execução** — as 6 linhas diferentes eram só essas; (2) o contador de rastro do T100 procurava `= 'DEPOIS'` e o teste grava `DEPOIS-<carimbo>`, então contou **zero** com a disciplina lá; (3) o leitor do vitest pegava a linha `Test Files` e dizia "1 passado" onde tinham passado 8. **A prova foi rodada de novo inteira depois das três correções**, e o resultado acima é o dessa rodada.
- [X] T104 [PR1] `pnpm verificar:tudo` saindo 0 e o CI com **o mesmo veredito** sobre o mesmo commit; confirmar que **nenhuma** tarefa do PR 2 é pré-requisito e que nenhuma tela, menu ou rota aponta para o que só existe no banco (`FR-046.1`, `SC-009`) ⛓ T098 a T103
      🟨 **22/09/2026 — metade LOCAL feita, metade CI pendente.** `pnpm verificar:tudo` sai **0**: 548 de unidade · 325 pgTAP · 167 RLS · 166 ponta a ponta (2 pulados). **Nenhuma tarefa do PR 2 é pré-requisito**, e o menu **não** oferece nada novo — "Cursos" segue *"em breve"* (`disponivel: false`). ⚠️ **Achado, não regressão:** cada turma do Início leva a `/cursos/<sigla>?turma=…`, e **essa rota não existe** — nem neste PR nem na `main`, onde o link já estava, sem codificar. O PR 1 só corrigiu a codificação; a tela de destino é do PR 2. **A metade CI exige subir o ramo para o GitHub**, que é remoto — pendente da palavra de Bernardo.
      ⚠️ **22/09/2026 — o histórico do ramo foi REESCRITO antes de subir** *(decisão de Bernardo Villas Boas, 22/09/2026)*. Motivo: o nome completo de um instrutor real tinha entrado no roteiro de conferência, e tirá-lo num commit novo não o tiraria dos commits antigos, que subiriam junto — o repositório é público, e o GitHub guarda os commits de todo PR. A linha foi reescrita para o texto já corrigido (só o código 54 e as 20 disciplinas) nos três commits que a traziam, **mudando uma linha em cada e nada mais**, conferido commit a commit. **Antigo → novo:** `6e28682` → `cf9dfb0` · `dcf7309` → `7e4eca4` · `2ad06ae` → `a292b78` · `b293d73` → `2b4f380` (conteúdo idêntico; muda só porque o pai mudou). Os **13** commits anteriores **não mudaram** — mesmo identificador. **Conferido sobre o histórico inteiro que sobe** (129 commits, os da `main` inclusive): o nome aparece em **0** conteúdos, **0** linhas acrescentadas e **0** mensagens. A cópia do ramo original ficou em `backup/EPICO-5a-antes-da-reescrita-2026-09-22`, **local, não sobe**.
      ✅ **22/09/2026 — metade CI fechada: MESMO VEREDITO, MESMAS CONTAGENS, sobre o MESMO commit `5b16820`.** Local, `pnpm verificar:tudo` sai **0**; CI, execução `35752720774`, disparada pelo push do ramo (sem PR), **success** nos três blocos — `qualidade`, `banco`, `build`. Contagem a contagem: unidade **548 = 548** · pgTAP **325 = 325** · RLS **167 = 167** · ponta a ponta **166 + 2 pulados = 166 + 2 pulados** (`SC-005`).
- [X] T105 [PR1] 👤 Aplicar as 7 migrations no projeto remoto `cqhpfuaweoyglhtrckcp` **só com autorização de Bernardo**, antes do merge: `supabase migration list --linked`, `supabase db push --linked --dry-run`, `pnpm db:push` (`FR-046`, `FR-046.1`) ⛓ T104
- [X] T106 [PR1] Conferir o remoto só por leitura: migrations dos dois lados iguais; `curso_sigla_historico` com os gatilhos; `authenticated` sem `DELETE`; as RPCs respondendo; a Production seguindo sem erro novo (`FR-046`, quickstart passo 8) ⛓ T105
- [X] T107 [PR1] [P] Atualizar *Estado atual e onde retomar* do `CLAUDE.md` com o PR 1: migrations, números medidos, achados A-1 a A-8, `PEND-5a-1` a `PEND-5a-4` e a T132 da spec 006 (`FR-046.1`, `CLAUDE.md`) ⛓ T106
      🟨 **22/09/2026 — parcial.** A linha do Épico 5 (a) no *Estado atual* do `CLAUDE.md` estava vencida (*"PLANEJADA… nada commitado ainda"*) e foi atualizada com o que vale hoje, e as decisões AMBIENTE-1 a AMBIENTE-3 entraram na tabela de decisões. **Falta o que só a T106 mede**: o estado do remoto depois da aplicação.
- [X] T108 [PR1] Abrir o PR 1 com `.github/pull_request_template.md` inteiro: o plano de reversão de **cada** uma das 7 migrations, a declaração do Princípio XI.5 para as quatro RPCs, e a lista de reporte — D-21 (`TRUNCATE` de `migracao_log`), R-8 da fatia (c) e as regras que pareceram estranhas (`FR-046`, `FR-046.1`, Definition of Done) ⛓ T107

**Critério de merge do PR 1**: T104 e T106 feitas; T105 com a autorização registrada.

---

# PR 2 — telas

**Começa depois do merge do PR 1, num ramo novo a partir da `main`** — nunca empilhado *(decisão de Bernardo
Villas Boas, 17/09/2026: o PR 1 toca 46 policies, mudança na revisão é provável, e empilhar arriscaria refazer
101 tarefas)*. **Nenhuma migration** — se aparecer uma corretiva, ela volta ao critério do remoto antes do merge
(`FR-046.1`).

## Fase 13 — Fundação do PR 2

- [X] T109 [PR2] Criar o ramo `feat/EPICO-5a-cursos-e-turmas-telas` a partir da `main` **depois** do merge do PR 1 — nunca empilhado —, trazendo `specs/009-cursos-e-turmas/` como está na `main`, e conferir `pnpm verificar:tudo` saindo 0 antes de qualquer tela (`FR-046.1`)
- [X] T109.1 [PR2] Criar `scripts/etl/correcoes.py` — a **camada de correções de origem**, lida de `scripts/etl/dados/correcoes-de-origem.md` e aplicada **depois** do retrato fiel, na mesma transação da promoção. **Origem: a auditoria de modalidade de 22/09/2026** — Bernardo informou os 24 valores, 13 preenchem vazios que a catraca amparava e **1 diverge** (`C-ApA-PCN-PR-EAD`, gravado `semipresencial` porque a célula diz `A Distância (EAD / Presencial)`), e a cópia datada de 20/08/2026 **não será substituída** — trocá-la traria um mês de edições não auditadas por cima de uma base já conferida linha a linha. **Requisitos:** sobrevive ao `db:reset`, porque é parte da carga e não do banco; cada correção rastreável até a **linha do arquivo**, no erro e em `migracao_log`; e **correção que não acha o valor velho que declara corrigir ABORTA a carga**, nomeando a linha — correção que virou no-op é correção podre, e no-op silencioso esconde que a origem mudou. ⚠️ **Não mexe na extração nem no `bruto/v20/`**, e **não** altera o de-para: a leitura de `A Distância (EAD / Presencial)` como `semipresencial` está **correta para o texto que está lá** — o que está errado é o texto, e ele se corrige na planilha viva (`FR-015.1`, emenda de 22/09/2026 ao princípio de 08/09/2026) ⛓ T109 · prova: T109.2
- [X] T109.2 [PR2] [P] Provar a camada em `scripts/etl/provar_carga_009.py`: depois da carga, as **24** modalidades conferem com a lista de 22/09/2026, a sala da `C-Ap-HN 2026` é **Sala 01**, a contagem total de linhas é **idêntica** à da carga sem correções — correção altera célula, não cria nem apaga linha —, e há **15** eventos `corrigido` citando a linha do arquivo. E o **defeito deliberado**: uma correção com o `De` trocado faz a carga **abortar** nomeando a linha (`FR-015.1`) ⛓ T109.1
- [X] T109.3 [PR2] Implementar o guarda da **AMBIENTE-2** em `scripts/etl/carregar.py` (`dados_ja_carregados`): `--primeira-carga` contra destino que já tem dado **recusa antes de escrever**, nomeando tabela e contagem. **Origem: a decisão de Bernardo Villas Boas de 21/09/2026, amarrada em 22/09** — *"nenhuma carga é executada contra o remoto antes de o script recusar `--primeira-carga` contra destino com dados"*, **pré-requisito da carga**, e não tarefa do PR que a acompanha. ⚠️ O critério é a **procedência** (`origem_migracao_v1`), não *"a tabela tem linha"*: o que a plataforma semeia não conta. Medido nos dois sentidos — recusa contra a base carregada, passa depois do `db:reset`. Antes dele, o que impedia a segunda carga era colisão de chave **por acidente** ⛓ T109.1
- [X] T110 [PR2] [P] Criar `tests/e2e/cursos-de-teste.ts`, semeadura **por processo de trabalho** no molde de `panorama-de-teste.ts`: cursos pela RPC nas cinco classificações; um curso com duas turmas de janelas diferentes; um com as duas `cancelada`; um sem duração em semanas e sem propósito; uma turma `ativa` com término passado; uma sem janela; uma sem sala; um curso **desativado por sessão autenticada** — `cliente('admin').from('cursos').update({ status: 'inativo' })`, nunca a Server Action (A-4; achado 4 do analyze); uma vigência corrigível e uma com lançamento; uma atividade de escopo global; uma sala de teste (`SC-001`, `SC-001.3`, `SC-003.1`, `SC-011.1`, `SC-014`)
- [X] T111 [PR2] [P] Mover `app/(app)/instrutores/AvisosRecolhiveis.tsx` para `components/ciaara/avisos-recolhiveis.tsx`, sem mudar comportamento, e atualizar o import de `app/(app)/instrutores/QuadroDeAvisos.tsx`; `tests/e2e/instrutores.spec.ts` continua verde (`FR-048`, `FR-010.1`)
- [X] T112 [PR2] [P] Escrever `tests/unidade/traducao-de-recusas.test.ts`: para **cada** linha da tabela do contrato de escritas §2, código + chave + dados → a mensagem de negócio; `UPDATE` com **zero linhas** tratado como recusa; `42501` distinguindo curso inativo de fora do escopo; `40P01`; **nunca** o `message` cru (`FR-042`, `FR-021.4`, contrato de escritas §2) — ver reprovando antes da T113
- [X] T113 [PR2] Criar `lib/acoes/traducao-de-recusas.ts` (`FR-042`, `RN-DEG-01`) ⛓ T112 · teste: T112
- [X] T114 [PR2] [P] Escrever `tests/unidade/confirmacao-de-gravacao.test.ts`: **cada** gravação da fatia com o contexto que a faz confirmar ou não — as da lista fechada do `FR-018.1` confirmam, e **nenhuma** outra; uma gravação que cai em dois casos produz **um** diálogo com as duas mensagens (`FR-018.1`, `SC-002.3`, A-7) — ver reprovando antes da T115
- [X] T115 [PR2] Criar `lib/dominio/confirmacao-de-gravacao.ts` com o identificador e a citação no topo (`FR-018.1`, `FR-043`) ⛓ T114 · teste: T114

---

## Fase 14 — US1 (PR 2): ver o catálogo de cursos por classificação — P1 🎯 MVP das telas

**Objetivo**: `/cursos` com os cinco grupos, os indicadores, os filtros na URL e os três estados vazios.
**Teste independente**: abrir `/cursos`, contar 5 grupos e 24 cartões, filtrar por situação, chegar à página
de um curso.

- [X] T116 [PR2] [P] [US1] Escrever `tests/unidade/classificacoes-de-curso.test.ts`: as **5** na ordem do Glossário; subconjunto do tipo `escopo_curso` de `Constants`; `geral` e `ead_semipresencial` fora (`FR-003`, D-19) — ver reprovando antes da T117
- [X] T117 [PR2] [US1] Criar `lib/dominio/classificacoes-de-curso.ts` (`FR-003`, `FR-043`) ⛓ T116 · teste: T116
- [X] T118 [PR2] [P] [US1] Escrever `tests/unidade/indicadores-do-catalogo.test.ts`: cursos regulares, estágios de qualificação, duração média **em dias** por classificação, cursos por classificação; lista **fechada** — nada além dos quatro (`FR-002`) — ver reprovando antes da T119
- [X] T119 [PR2] [US1] Criar `lib/dominio/indicadores-do-catalogo.ts` (`FR-002`, `RF-CURSOS-02`) ⛓ T118 · teste: T118
- [X] T120 [PR2] [P] [US1] Acrescentar a `tests/unidade/contrato-de-parametros.test.ts` a rota `/cursos` com `classificacao`, `modalidade` e `situacao` (padrão `ativo`) (`FR-004`, `FR-017.2`, `FR-037`) — ver reprovando antes da T121
- [X] T121 [PR2] [US1] Acrescentar `/cursos` a `lib/navegacao/contrato.ts`, com `CLASSIFICACOES_DE_CURSO` e o descritor de `situacao` igual ao de `/instrutores`; o Início **não** muda (`FR-004`, `FR-017.2`, `FR-037`, D-19) ⛓ T117, T120 · teste: T120
- [X] T122 [PR2] [P] [US1] Escrever `tests/unidade/consulta-de-cursos.test.ts`: a montagem da consulta de `/cursos` aplica os três filtros, **uma** consulta, e devolve o motivo do vazio — *não há*, *você não vê*, *ainda não existe* (`FR-004`, `FR-047`, `FR-012`) — ver reprovando antes da T123
- [X] T123 [PR2] [US1] Criar `app/(app)/cursos/consulta.ts` (`FR-004`, `FR-012`, `FR-047`) ⛓ T121, T122 · teste: T122
- [X] T124 [PR2] [US1] Criar `app/(app)/cursos/page.tsx` (Server Component), `loading.tsx` e `error.tsx`, com os três estados vazios por `EstadoVazio` (`FR-005`, `FR-041`, `FR-047`, `RN-DEG-01`) ⛓ T123 · teste: T128 ⚠️ **mesmo commit** da T130 (`FR-039`)
- [X] T125 [PR2] [P] [US1] Criar `app/(app)/cursos/CatalogoDeCursos.tsx`: cartões agrupados na ordem da T117, só informação descritiva, link para `/cursos/[sigla]` (`FR-001`, `FR-003`, `RF-CURSOS-02`) ⛓ T124 · teste: T128
- [X] T126 [PR2] [P] [US1] Criar `app/(app)/cursos/IndicadoresDoCatalogo.tsx` com `CardKpi` e dois `GraficoBarras` (`FR-002`, `FR-048`) ⛓ T119, T124 · teste: T128
- [X] T127 [PR2] [P] [US1] Criar `app/(app)/cursos/FiltrosDoCatalogo.tsx`, folha de cliente com `useParametro` para os três filtros (`FR-004`, `FR-017.2`, `FR-041`) ⛓ T121, T124 · teste: T128
- [X] T128 [PR2] [US1] Escrever `tests/e2e/cursos.spec.ts`: **5** grupos na ordem com a amostra da T110; os indicadores; filtros que mudam a URL e sobrevivem ao `F5`; `?situacao=inativo` mostra o curso desativado; Encarregado de Curso vê só o seu; os três estados vazios; clique no cartão chega à página do curso (`SC-001`, `SC-001.3`, `SC-002`, US1 cenários 1 a 5) ⛓ T110, T125 a T127

---

## Fase 15 — US7 (PR 2): o menu aponta os épicos certos, e "Cursos" fica disponível — P3

**Antecipada**: a entrada "Cursos" vira `disponivel` **no mesmo commit** da página `/cursos` (`FR-039`) —
o teste do shell confere os dois sentidos.

- [X] T129 [PR2] [P] [US7] Atualizar `tests/e2e/shell.spec.ts` (e o teste de unidade do menu, se houver) para esperar Cursos → `"Épico 5 (a)"` **disponível**, Disciplinas → `"Épico 5 (b)"`, Cronograma → `"Épico 7"`, Atividades → `"Épico 9"`, ordem e rótulos iguais (`FR-038`, `FR-039`, `SC-008`) — ver reprovando antes da T130
- [X] T130 [PR2] [US7] Corrigir `lib/navegacao/menu.ts`: os quatro `entregaEm` e `disponivel: true` em Cursos; `FORA_DO_MENU` **não** muda (`FR-038`, `FR-039`, `FR-008`) ⛓ T124, T129 · teste: T129 ⚠️ mesmo commit da T124
- [X] T131 [PR2] [P] [US7] Emendar com data a tabela da MENU-1 em `specs/008-shell-e-estado-na-url/contracts/casca.md` (linhas 134–138) com os mesmos quatro rótulos (`FR-040`)

---

## Fase 16 — US2 (PR 2): a página do curso com a turma na URL e a aba "Sobre o Curso" — P1

**Objetivo**: `/cursos/[curso]` com cabeçalho e regime vigente, quadro de avisos acima de exatamente duas
abas, pré-seleção pela janela, e nada anunciado que não exista. **Teste independente**: colar a URL com
`?aba=` e `?turma=` numa aba nova e ver a mesma vista.

- [X] T132 [PR2] [P] [US2] Escrever `tests/unidade/pre-selecao-de-turma.test.ts`: janela contém hoje; início mais próximo no futuro; empate pelo início mais recente; `concluida` e `cancelada` nunca; nenhuma → sem seleção; curso de uma turma abre nela; **hoje recebido como argumento**; os 4 cursos com seletor da base: 3 na `T2`, `C-ApA-OcOp-PR-SP` sem seleção (`FR-006.1`, `SC-003.1`) — ver reprovando antes da T133
- [X] T133 [PR2] [US2] Criar `lib/dominio/pre-selecao-de-turma.ts` (`FR-006.1`, `FR-043`) ⛓ T132 · teste: T132
- [X] T134 [PR2] [P] [US2] Escrever `tests/unidade/limite-de-turmas.test.ts`: `STATUS_QUE_CONTAM` por enumeração positiva, com um **status inventado** que **não** conta; mensagem do diálogo e do quadro; baixar o limite gera uma mensagem **por ano** afetado; `C-ApA-OcOp-PR-SP` conta 0 (`FR-030`, `FR-030.1`, `SC-014.1`) — ver reprovando antes da T135
- [X] T135 [PR2] [US2] Criar `lib/dominio/limite-de-turmas.ts` (`FR-030`, `FR-030.1`, `FR-043`) ⛓ T134 · teste: T134
- [X] T136 [PR2] [P] [US2] Escrever `tests/unidade/avisos-do-curso.test.ts`: `sem_duracao_semanas`, `sem_proposito` (vazio ou só espaços), `acima_do_limite` com ano, contagem e limite; tipo com zero não aparece; retrato da base: **12**, **10**, **0** (`FR-010`, `SC-014`) — ver reprovando antes da T137
- [X] T137 [PR2] [US2] Criar `lib/dominio/avisos-do-curso.ts`, lista aberta (`FR-010`, `FR-043`) ⛓ T135, T136 · teste: T136
- [X] T138 [PR2] [P] [US2] Escrever `tests/unidade/avisos-da-turma.test.ts`: `ativa_com_termino_passado` e `planejada_com_inicio_passado` **estritos** — o dia de hoje não conta; `sem_janela`, `sem_sala`, `sem_efetivo_fora_de_planejada` (nunca só "sem efetivo"), `sem_disciplina`; data vazia não dispara incoerência; retrato: **11** incoerências (1 + 10), **1**, **2**, **0** (`FR-028.1`, `FR-028.4`, `SC-013`, `SC-014`) — ver reprovando antes da T139
- [X] T139 [PR2] [US2] Criar `lib/dominio/avisos-da-turma.ts`, lista aberta (`FR-028.1`, `FR-028.4`, `FR-043`) ⛓ T138 · teste: T138
- [X] T140 [PR2] [P] [US2] Acrescentar a `tests/unidade/contrato-de-parametros.test.ts` a rota `/cursos/[curso]` com `aba` (`grade` | `sobre`, padrão `grade`, empilha) e `turma` (texto, empilha) (`FR-006.2`, `FR-036`, `FR-037`) — ver reprovando antes da T141
- [X] T141 [PR2] [US2] Acrescentar `/cursos/[curso]` a `lib/navegacao/contrato.ts` (`FR-006.2`, `FR-036`, `FR-037`, D-10) ⛓ T140 · teste: T140
- [X] T142 [PR2] [P] [US2] Escrever `tests/unidade/consulta-do-curso.test.ts`: `Promise.all` de consultas independentes, **nenhuma** por turma; `?turma=` de outro curso ou inexistente degrada para a pré-seleção com aviso; sigla sem curso visível produz a mensagem **pelo perfil** — alcance total *"Curso não encontrado"*, recorte *"… ou fora do seu alcance"* (`FR-012`, `FR-006`, `FR-031.4`, research R-9) — ver reprovando antes da T143
- [X] T143 [PR2] [US2] Criar `app/(app)/cursos/[curso]/consulta.ts`, lendo a turma pela função única do endereço (`FR-006`, `FR-011`, `FR-012`, `FR-031.2`) ⛓ T133, T141, T142 · teste: T142
- [X] T144 [PR2] [US2] Criar `app/(app)/cursos/[curso]/page.tsx`, `loading.tsx` e `error.tsx`, com o não encontrado por perfil, **sem** link, botão nem *"em breve"* para Avaliações e Relatório (`FR-006`, `FR-008`, `FR-031.4`, `FR-041`) ⛓ T143 · testes: T152, T153
- [X] T145 [PR2] [P] [US2] Criar `app/(app)/cursos/[curso]/CabecalhoDoCurso.tsx` com o regime vigente de `vw_cursos_regime_vigente` e o caminho para o histórico em `/cursos/[curso]/editar` (`FR-011`, `RF-CURSO-01`) ⛓ T144 · teste: T153
- [X] T146 [PR2] [P] [US2] Criar `app/(app)/cursos/[curso]/QuadroDeAvisosDoCurso.tsx` sobre `components/ciaara/avisos-recolhiveis.tsx`, **acima** das abas, nascendo recolhido com as contagens à vista (`FR-010`, `FR-010.1`) ⛓ T111, T137, T144 · teste: T153
- [X] T147 [PR2] [P] [US2] Criar `app/(app)/cursos/[curso]/AbasDoCurso.tsx`, folha de cliente com **exatamente duas** abas em `?aba=` (`FR-006.2`, `FR-041`) ⛓ T141, T144 · teste: T152
- [X] T148 [PR2] [US2] Criar `app/(app)/cursos/[curso]/AbaGrade.tsx`: indicadores da turma selecionada, lista de turmas com a **contagem** de avisos de cada uma e link para a ficha, botão de nova turma alcançável com curso sem turma, três estados vazios (`FR-006.2`, `FR-006.3`, `FR-028.1`, `FR-047`) ⛓ T139, T144 · teste: T152 ✂️ **sem** progresso por disciplina (`FR-009.1`)
- [X] T149 [PR2] [P] [US2] Criar `app/(app)/cursos/[curso]/AbaSobre.tsx`: catálogo, grade de disciplinas ativas com CH em TA e total, avaliações previstas com caráter e fórmula **como texto**; nada editável; lugar das UEs com o vazio *"ainda não existe no sistema"* se mostrado (`FR-007` a `FR-007.2`, `RF-CURSO-04`) ⛓ T144 · testes: T150, T153
- [X] T150 [PR2] [P] [US2] Escrever `tests/unidade/sobre-o-curso-so-consulta.test.ts`: varredura, em código sem comentário, que reprova campo editável na aba e **qualquer** leitura de `carater` ou `formula_mf` fora da exibição (`FR-007.1`, `SC-001.1`) ⛓ T149
- [X] T151 [PR2] [P] [US2] Criar `app/(app)/cursos/[curso]/AcoesDeSituacao.tsx`, folha de cliente com desativar/reativar **oculto** para quem não tem `cursos.desativar` (a ação é da US4) (`FR-017.8`) ⛓ T144 · teste: T171
- [X] T152 [PR2] [US2] Escrever `tests/e2e/curso-pagina.spec.ts`, parte 1: colar `/cursos/C-ApA-PCN-PR-EAD?aba=grade&turma=…%20T2%202026` numa aba nova reproduz aba e turma; `F5` reproduz; "voltar" desfaz um passo; **exatamente 2** abas; pré-seleção sem `?turma=` e `?turma=` explícito **nunca** sobrescrito; curso sem seleção pede a escolha; `?turma=` inválido degrada (`FR-006`, `FR-006.1`, `FR-006.2`, `SC-002`, `SC-002.2`, `SC-003`, `SC-003.1`) ⛓ T110, T147, T148
- [X] T153 [PR2] [US2] Escrever `tests/e2e/curso-pagina.spec.ts`, parte 2: quadro de avisos acima das abas nas duas; recolhido com as contagens; curso sem aviso diz isso; "Sobre" do `CAHO` com **22** disciplinas e **1.668** TA e o caráter *Eliminatório* como texto; **nenhum** acesso a Avaliações ou Relatório; não encontrado para Admin e para Operador `expedito` (`FR-007`, `FR-008`, `FR-010`, `FR-010.1`, `FR-031.4`, `SC-001.1`, `SC-002.1`) ⛓ T145, T146, T149

---

## Fase 17 — US3 (PR 2): o mesmo seletor de turma em qualquer tela — P1

**Objetivo**: um construtor só, alimentado de verdade, com rótulo e ordem decididos, escrevendo na URL.
**Teste independente**: a varredura acha **um** construtor e a troca de turma produz a URL da função única.

- [X] T154 [PR2] [P] [US3] Escrever `tests/unidade/seletor-de-turma.test.ts`: rótulo `código · Status` **não vazio para 28 de 28**; ordem ano decrescente, início decrescente com sem data por último, código; as **quatro** situações entram (`FR-034`, `FR-035`, `SC-004`) — ver reprovando antes da T155
- [X] T155 [PR2] [US3] Criar `lib/dominio/seletor-de-turma.ts` (`FR-034`, `FR-035`, `FR-043`) ⛓ T154 · teste: T154
- [X] T156 [PR2] [US3] Em `app/(app)/cursos/[curso]/AbaGrade.tsx`, adotar `components/ciaara/seletor-turma.tsx` com as turmas de **um** curso, ordenadas pela T155, escrevendo `?turma=` por `useParametro` com histórico **empilhado** (`FR-033`, `FR-033.1`, `FR-036`) ⛓ T148, T155 · testes: T157, T158
- [X] T157 [PR2] [P] [US3] Escrever `tests/unidade/seletor-turma-unico.test.ts`: **exatamente um** construtor de seletor de turma na aplicação, lendo código sem comentário, com controle positivo — no molde de `tests/unidade/seletor-unico.test.ts` (`FR-033`, `SC-004`) ⛓ T156
- [X] T158 [PR2] [US3] Acrescentar a `tests/e2e/curso-pagina.spec.ts`: trocar a turma pelo seletor deixa na URL **exatamente** o que `enderecoDaTurmaNoCurso` produz — **`+`, e não `%20`**, *(corrigido em 23/09/2026, `PEND-5a-8`: o `FR-036` obriga o `nuqs`, e ele não emite `%20`)*; abrir, escolher e fechar pelo teclado; lista vazia com motivo (`FR-031.1`, `FR-033`, `SC-002.1`, US3 cenários 1 a 3) ⛓ T156
- [X] T159 [PR2] [US3] Defeito deliberado: um segundo `<select>` de turma em `AbaGrade.tsx` — a T157 **reprova**; desfazer e registrar (`FR-033`, `SC-004`) ⛓ T157

---

## Fase 18 — US4 (PR 2): cadastrar e editar um curso — P2

**Objetivo**: `/cursos/novo` e `/cursos/[curso]/editar`, com regime obrigatório na criação, sigla auditada e
confirmada com todas as letras, desativação e reativação. **Teste independente**: criar curso como Ajudante,
negar como Visualização, trocar sigla e ver a turma antiga intacta.

- [X] T160 [PR2] [P] [US4] Escrever `tests/unidade/validacao-curso.test.ts`: sigla, nome, classificação (as 5), modalidade **sem padrão** e duração em dias obrigatórios, **recusados vazios ou só com espaços**; limite ausente vira **nulo**; regime `padrao` obrigatório na criação (`FR-013`, `FR-015`, `FR-015.1`, `FR-019.5`, `SC-001.4`) — ver reprovando antes da T161
- [X] T161 [PR2] [US4] Criar `lib/validacao/curso.ts` (`FR-013`, `FR-015`, `FR-019.5`) ⛓ T160 · teste: T160
- [X] T162 [PR2] [US4] Criar em `lib/acoes/curso.ts` as ações `criarCurso` (RPC `criar_curso_com_regime`) e `editarCurso` (sem `status`, pedindo a linha de volta), com `safeParse` na primeira linha e a tradução da T113; depois da troca de sigla, destino pela sigla **nova** (`FR-013`, `FR-014.1`, `FR-016`, `FR-042`) ⛓ T113, T161 · testes: T170, T171
- [X] T163 [PR2] [US4] Criar em `lib/acoes/curso.ts` as ações `desativarCurso` e `reativarCurso`, mandando **só** a situação (`FR-017`, `FR-017.4`, `FR-017.7`) ⛓ T162 · teste: T171
- [X] T164 [PR2] [P] [US4] Acrescentar a `tests/unidade/contrato-de-parametros.test.ts` as rotas `/cursos/novo` e `/cursos/[curso]/editar`, sem parâmetros (`FR-013.1`, `FR-037`) — ver reprovando antes da T165
- [X] T165 [PR2] [US4] Acrescentar as duas rotas a `lib/navegacao/contrato.ts` (`FR-013.1`, `FR-037`) ⛓ T164 · teste: T164
- [X] T166 [PR2] [US4] Criar `app/(app)/cursos/FormularioDeCurso.tsx`, folha de cliente com `CampoObrigatorio`, modos `novo` (com o regime `padrao`) e `edicao` (sem regime), exibindo o `fundamento_curricular` ao lado dos parâmetros (`FR-013`, `FR-015`, `FR-019.1`, `FR-022`, `FR-048`) ⛓ T161, T165 · teste: T170
- [X] T167 [PR2] [US4] Criar `app/(app)/cursos/novo/page.tsx` e `app/(app)/cursos/[curso]/editar/page.tsx` (Server Components), com o estado sem permissão, e contando as turmas do curso para o diálogo de sigla (`FR-013.1`, `FR-016`, `FR-014.2`, `FR-041`) ⛓ T166 · testes: T170, T171
- [X] T168 [PR2] [US4] Ligar em `FormularioDeCurso.tsx` o `DialogoConfirmacao` pela T115: troca de **sigla** com o texto do `FR-014.2` **com todas as letras**, incluindo quantas turmas ficam com a sigla antiga; troca de **classificação** dizendo que o alcance dos Operadores muda; **limite** abaixo da contagem com uma mensagem por ano (`FR-014.2`, `FR-016.1`, `FR-030.1`, `FR-018.1`) ⛓ T115, T135, T167 · teste: T171
- [X] T169 [PR2] [US4] Ligar `AcoesDeSituacao.tsx` às ações da T163, com confirmação **sempre**, e a mensagem de turmas pendentes nomeando cada uma (`FR-017.4`, `FR-017.8`, `FR-018.1`) ⛓ T151, T163 · teste: T171
- [X] T170 [PR2] [US4] Escrever `tests/e2e/cursos-cadastro.spec.ts`, parte 1: Ajudante cria curso com regime e o vê no grupo certo; sigla duplicada com mensagem em português; obrigatório vazio recusado pelo esquema; Visualização sem o formulário e **negada pelo banco** se chamar a ação; editar o propósito grava **sem** diálogo (`FR-013`, `FR-015`, `FR-018.1`, `SC-001.2`, `SC-002.3`, US4 cenários 1 a 3 e 5) ⛓ T110, T167
- [X] T171 [PR2] [US4] Escrever `tests/e2e/cursos-cadastro.spec.ts`, parte 2: trocar a sigla mostra o diálogo com todas as letras, grava, leva à sigla nova, a sigla antiga dá *"Curso não encontrado"*, a ficha da turma antiga **abre pelo mesmo endereço** e a turma criada depois nasce com a sigla nova; adotar sigla que foi de **outro** curso é recusado nomeando o curso e a data, e voltar à **própria** sigla é aceito; desativar `CAHO` recusado nomeando `CAHO 2026`; desativar e reativar o curso de teste; Operador **sem** o botão (`FR-014.1` a `FR-014.3`, `FR-017.4`, `FR-017.7`, `FR-017.8`, `SC-001.3`, `SC-001.5` a `SC-001.7`, US1 cenários 5 a 7) ⛓ T168, T169

---

## Fase 19 — US5 (PR 2): cadastrar, editar e mudar o status de uma turma, e as salas — P2

**Objetivo**: criação sob o curso, ficha e edição em `/turmas/[turma]`, avisos que não bloqueiam, e a tela
mínima de salas. **Teste independente**: criar a `T3`, cair na ficha, colidir rótulo e ver a mensagem, desativar
sala em uso e seguir editando.

- [X] T172 [PR2] [P] [US5] Escrever `tests/unidade/salas.test.ts`: natureza lida de `metadados.ambiente_virtual`, **nunca** do texto; salas ativas para turma nova; turmas que usam uma sala; retrato: `Sala 04` → **5**, `Moodle` → **6**, `Laboratório de Informática` → **9** (`FR-029.1`, `FR-029.4`, `SC-014.2`, `SC-014.3`) — ver reprovando antes da T173
- [X] T173 [PR2] [US5] Criar `lib/dominio/salas.ts` (`FR-029.1`, `FR-029.4`, `FR-043`) ⛓ T172 · teste: T172
- [X] T174 [PR2] [P] [US5] Escrever `tests/unidade/protecao-de-vigencia.test.ts` **com os mesmos casos semeados** do `104` (T043): encurtar a janela lista **exatamente** as vigências travadas só pela atividade que sai do alcance; lançamento próprio e outra turma mantêm fora; janela incompleta; **mudar o curso** avalia o curso de origem; nenhuma perdida, nenhum aviso (`FR-021.8`, `SC-011.5`) — ver reprovando antes da T175
- [X] T175 [PR2] [US5] Criar `lib/dominio/protecao-de-vigencia.ts` (`FR-021.8`, `FR-043`) ⛓ T174 · teste: T174
- [X] T176 [PR2] [P] [US5] Escrever `tests/unidade/validacao-turma.test.ts`: ano, status e modalidade **sem padrão** obrigatórios; rótulo vazio ou `T<n>`; `data_termino ≥ data_inicio`; **sem** campo de código (`FR-025`, `FR-025.2`, `FR-015`, `FR-027`, `SC-007`) — ver reprovando antes da T177
- [X] T177 [PR2] [US5] Criar `lib/validacao/turma.ts` (`FR-025`, `FR-025.2`) ⛓ T176 · teste: T176
- [X] T178 [PR2] [P] [US5] Escrever `tests/unidade/validacao-sala.test.ts`: nome obrigatório; natureza **obrigatória, sem padrão**; **nenhum** campo de renomear (`FR-029.5`, `FR-029.6`, `SC-014.3`) — ver reprovando antes da T179
- [X] T179 [PR2] [US5] Criar `lib/validacao/sala.ts` (`FR-029.6`) ⛓ T178 · teste: T178
- [X] T180 [PR2] [US5] Criar `lib/acoes/turma.ts` com `criarTurma` (sem `codigo`, curso pelo caminho, destino `enderecoDaTurma(codigo)`) e `editarTurma` (sem `codigo`, pedindo a linha de volta, lendo a turma que ocupa o rótulo no `23505`) (`FR-025`, `FR-026`, `FR-031.6`, `FR-042`) ⛓ T113, T177 · teste: T190
- [X] T181 [PR2] [US5] Criar `lib/acoes/sala.ts` com `acrescentarSala`, `desativarSala` e `reativarSala` — só `ativo` nas duas últimas (`FR-029.2`, `FR-029.4`, `FR-029.5`) ⛓ T113, T179 · teste: T195
- [X] T182 [PR2] [P] [US5] Acrescentar a `tests/unidade/contrato-de-parametros.test.ts` as rotas `/cursos/[curso]/turmas/nova`, `/turmas/[turma]` e `/admin/salas`, sem parâmetros (`FR-031`, `FR-029.2`, `FR-037`) — ver reprovando antes da T183
- [X] T182.1 [PR2] [P] [US5] Acrescentar a `tests/unidade/contrato-de-parametros.test.ts` a guarda de **ausência**: o contrato **não** tem rota `/turmas` (lista global) nem `/turmas/[turma]/dsa`; `lib/navegacao/menu.ts` **não** tem entrada "Turmas"; e a varredura de `app/` **não** encontra `app/(app)/turmas/page.tsx` nem `app/(app)/turmas/[turma]/dsa/` — com a mensagem de reprovação citando o `FR-031.7` e o Épico 6 (`FR-031.7`; achado 5 do analyze)
- [X] T183 [PR2] [US5] Acrescentar as três rotas a `lib/navegacao/contrato.ts` (`FR-031`, `FR-029.2`, `FR-037`) ⛓ T182 · teste: T182
- [X] T184 [PR2] [P] [US5] Escrever `tests/unidade/consulta-da-turma.test.ts`: segmento decodificado **uma vez** pela função única; mensagem de não encontrada **pelo perfil**; a RPC de proteção só é lida para quem pode editar; contagem de turmas por curso e ano para o limite (`FR-031.1`, `FR-031.4`, `FR-021.8`, `FR-030`) — ver reprovando antes da T185
- [X] T185 [PR2] [US5] Criar `app/(app)/turmas/[turma]/consulta.ts`, `page.tsx`, `loading.tsx` e `error.tsx`: a ficha com o curso e **caminho de volta**, e o formulário no modo `edicao` só para quem pode editar — **sem** `/editar` (`FR-031`, `FR-031.4` a `FR-031.6`, `FR-041`) ⛓ T183, T184 · testes: T184, T191
- [X] T186 [PR2] [US5] Criar `app/(app)/turmas/FormularioDeTurma.tsx`, folha de cliente nos modos `novo` e `edicao`: sala entre as **ativas** (a atual aparece mesmo desativada), status livre entre os quatro, e a **nota** da segunda turma sem rótulo (`FR-025`, `FR-026.1`, `FR-028`, `FR-029.4`) ⛓ T173, T177, T185 · teste: T190
- [X] T187 [PR2] [US5] Ligar em `FormularioDeTurma.tsx` o `DialogoConfirmacao` pela T115: passar do **limite** com a mensagem do `FR-030` e deixar **vigência sem proteção** com a mensagem do `FR-021.8`, **num diálogo só** (`FR-030`, `FR-021.8`, `FR-018.1`) ⛓ T115, T135, T175, T186 · testes: T190, T191
- [X] T188 [PR2] [P] [US5] Criar `app/(app)/cursos/[curso]/turmas/nova/page.tsx` com o curso definido pelo caminho (`FR-031`, `FR-031.6`) ⛓ T186 · teste: T190
- [X] T189 [PR2] [P] [US5] Criar `app/(app)/turmas/[turma]/QuadroDeAvisosDaTurma.tsx` sobre `avisos-recolhiveis.tsx` (`FR-028.1`, `FR-028.4`) ⛓ T111, T139, T185 · teste: T191
- [X] T190 [PR2] [US5] Escrever `tests/e2e/turmas.spec.ts`, parte 1: criar a `T3` de 2027 e cair em `/turmas/…%20T3%202027` com o curso e a volta; `C-Ap-FR` 2026 no limite mostra o diálogo com ano, contagem e limite, e `C-ApA-OcOp-PR-SP` não; levar uma turma de `planejada` a `concluida` e de volta; os **4** caminhos de colisão com a mensagem nomeando a turma ocupante; segunda turma sem rótulo com a nota; editar o efetivo grava **sem** diálogo (`FR-025.1`, `FR-026`, `FR-026.1`, `FR-028`, `FR-030`, `FR-031.6`, `SC-004.1`, `SC-004.2`, `SC-013`, `SC-014.1`, US5 cenários 1 a 8, 12 a 14 e 17) ⛓ T110, T187, T188
- [X] T191 [PR2] [US5] Escrever `tests/e2e/turmas.spec.ts`, parte 2: aviso de incoerência que **não** impede salvar; turma sem janela sem incoerência; `/turmas/C-Ap-FR%202030` como Admin e `/turmas/CAHO%202026` como Operador `expedito`, sem dado nenhum; Operador `expedito` cria e muda status em `C-Exp-BATI`; encurtar a janela da turma que alcança a atividade global da amostra mostra o diálogo **nomeando** a vigência e grava (`FR-021.8`, `FR-028.1`, `FR-031.4`, `SC-005.1`, `SC-011.5`, US5 cenários 9 a 11 e 18) ⛓ T185, T187, T189
- [X] T192 [PR2] [US5] Acrescentar a aba `{ rotulo: "Salas", rota: "/admin/salas" }` a `app/(app)/admin/layout.tsx` e criar `app/(app)/admin/salas/page.tsx` (Server Component), lista com natureza e situação, botões só para `parametros.criar`/`editar` (`FR-029.2`, `SC-014.3`) ⛓ T173, T183 · teste: T195
- [X] T193 [PR2] [P] [US5] Criar `app/(app)/admin/salas/FormularioDeSala.tsx`, folha de cliente sem opção marcada de natureza (`FR-029.6`) ⛓ T181, T192 · teste: T195
- [X] T194 [PR2] [P] [US5] Criar `app/(app)/admin/salas/AcoesDeSala.tsx`: desativar sala **em uso** abre o diálogo com as turmas e deixa prosseguir; reativar (`FR-029.4`, `FR-018.1`) ⛓ T115, T181, T192 · teste: T195
- [X] T195 [PR2] [US5] Escrever `tests/e2e/salas.spec.ts`: Encarregado da Divisão acrescenta sala **só** escolhendo física ou virtual; a sala aparece no formulário de turma **na hora**; desativar `Sala 04` lista as **5** turmas e prossegue; editar uma delas mantendo a sala grava; `Sala 04` some da turma nova; reativar; **exatamente 4** ações e nenhum caminho de renomear ou apagar; Ajudante vê a lista **sem** botões (`FR-029.2`, `FR-029.4` a `FR-029.6`, `SC-014.3`, US5 cenários 15 e 16) ⛓ T110, T192 a T194

---

## Fase 20 — US6 (PR 2): registrar regime com data de vigência, sem reinterpretar o passado — P2

**Objetivo**: em `/cursos/[curso]/editar`, o histórico de vigências, o registro de vigência nova e "Corrigir
esta vigência" só onde cabe. **Teste independente**: corrigir uma das 18, ser recusado numa das 11 com a
mensagem, registrar uma futura.

- [X] T196 [PR2] [P] [US6] Escrever `tests/unidade/vigencia-de-regime.test.ts`: histórico por tipo, **ativas e canceladas**, a mais recente primeiro, cancelada marcada com motivo e data; "Corrigir esta vigência" oferecida **só** onde o banco disse que não há lançamento; o formulário pré-preenchido com os valores atuais (`FR-011`, `FR-021.1`, `FR-021.2`) — ver reprovando antes da T197
- [X] T197 [PR2] [US6] Criar `lib/dominio/vigencia-de-regime.ts` (`FR-011`, `FR-019` a `FR-021.1`, `FR-043`) ⛓ T196 · teste: T196
- [X] T198 [PR2] [P] [US6] Escrever `tests/unidade/validacao-vigencia-regime.test.ts`: tipo e `vigente_de` obrigatórios; os parâmetros dentro do que o banco já valida (45 ou 50 min, 1 a 12 TA, EAD com limite diário) (`FR-019`, `FR-022`) — ver reprovando antes da T199
- [X] T199 [PR2] [US6] Criar `lib/validacao/vigencia-regime.ts` (`FR-019`, `FR-022`) ⛓ T198 · teste: T198
- [X] T200 [PR2] [US6] Criar `lib/acoes/vigencia-regime.ts` com `registrarVigencia` (RPC `registrar_vigencia_regime`) e `corrigirVigencia` (RPC `corrigir_vigencia_regime`), lendo a recusa no **resultado da RPC** — inclusive as que só chegam no `COMMIT` (`FR-019`, `FR-019.4`, `FR-021.1`, `FR-021.4`, `FR-042`) ⛓ T113, T199 · teste: T204
- [X] T201 [PR2] [US6] Criar `app/(app)/cursos/[curso]/editar/SecaoDeRegime.tsx` com o histórico da T197 (`FR-011`, `FR-019.1`) ⛓ T167, T197 · teste: T204
- [X] T202 [PR2] [US6] Criar `app/(app)/cursos/[curso]/editar/FormularioDeVigencia.tsx`, folha de cliente para registrar vigência nova, com o `fundamento_curricular` ao lado e confirmação **sempre** (`FR-019`, `FR-022`, `FR-018.1`) ⛓ T115, T200, T201 · teste: T204
- [X] T203 [PR2] [US6] Acrescentar "Corrigir esta vigência" a `SecaoDeRegime.tsx`, só nas corrigíveis, abrindo `FormularioDeVigencia.tsx` pré-preenchido e confirmando **sempre** (`FR-021.1`, `FR-018.1`) ⛓ T202 · teste: T204
- [X] T204 [PR2] [US6] Escrever `tests/e2e/vigencia.spec.ts`: corrigir a vigência corrigível da amostra deixa uma **cancelada** e uma **ativa**; na vigência com lançamento, a ação **não** aparece, e a chamada direta à ação recebe a mensagem com tipo, data, turma e total — **nunca** erro cru; registrar vigência futura; o histórico mostra a cancelada marcada (`FR-019`, `FR-021.1`, `FR-021.4`, `SC-011.1`, US6 cenários 1, 4 a 6) ⛓ T110, T203

---

## Fase 21 — Fechamento do PR 2

- [X] T205 [PR2] [P] ⚠️ **Feita em `tests/e2e/telas-acessiveis.spec.ts`, e não dentro dos dois arquivos que esta linha nomeia** *(desvio registrado em 23/09/2026, com o motivo)*: `acessibilidade.spec.ts` e `teclado.spec.ts` têm `beforeEach` **de arquivo** que abre a vitrine, que é rota **sem sessão** (`FR-038`); as telas desta fatia exigem sessão e amostra, e enfiá-las lá obrigaria a desmontar o preparo dos dois. As telas novas: `/cursos`, `/cursos/[curso]` nas duas abas, `/cursos/novo`, `/turmas/[turma]`, `/admin/salas` (`FR-041`, `FR-048`, contrato de teclado do Épico 4 (b))
- [X] T206 [PR2] [P] Varreduras: **nenhum** `page.tsx` nem `layout.tsx` com `"use client"`; folhas de cliente declaradas e contadas; **nenhum** `await` em laço em `app/**`; regra de cor em **zero** violações; **zero** campos digitáveis de carga horária nas telas de curso e turma — estendendo os testes que já existem em `tests/unidade/` (`FR-041`, `FR-045`, `SC-007`, `SC-010`)
- [ ] T207 [PR2] `pnpm verificar:tudo` saindo 0 e o CI com **o mesmo veredito** sobre o mesmo commit (`FR-046.1`, `SC-009`) ⛓ T128 a T206
- [X] T208 [PR2] [P] Atualizar *Estado atual e onde retomar* do `CLAUDE.md` com o fechamento da fatia e marcar os itens de `specs/009-cursos-e-turmas/checklists/requirements.md` que passarem (`FR-046.1`, `CLAUDE.md`) ⛓ T207
- [ ] T209 [PR2] Abrir o PR 2 com `.github/pull_request_template.md` inteiro. ⚠️ **A declaração de "nenhuma migration" DEIXOU DE VALER em 23/09/2026**: a Fase 20 criou `20260923231815_vigencias_do_curso_para_a_tela.sql`, e ela **precisa ser aplicada no remoto antes do merge** — a parte B conserta um defeito que hoje está lá (o `grant` que faltava em `app.recusar_se_ha_lancamento`, sem o qual ninguém corrige vigência). Ver `plano-de-aplicacao-no-remoto.md` §0.1 (`FR-046.1`, Definition of Done) ⛓ T208

---

## Dependências

### Entre PRs
- **PR 1 → PR 2**: o PR 2 inteiro depende do PR 1 **mesclado** (T108), e nasce da `main` depois disso. **Nenhuma**
  tarefa do PR 1 depende de tarefa do PR 2 — conferido na T104.

### Dentro do PR 1
```text
T001 ─┬─ T003…T017 (amostras, 1ª etapa) ── ponto de conferência verde
      └─ T002
T018,T019 → T020 → T021                         (migration 1)
T022,T023 → T024 → T025 → T026 → T027 → T028    (migration 2)   ⛓ T003…T017
T026 → T029 (BRIEF, emenda por acréscimo) → T030 (010_estrutura, conjunto de nomes) · T032 → T031.1, T031.2 (guardas de ausência)
T031 → T032 → T033                              (migration 3)
T034 → T035 → T036                              (migration 4)
T037,T038 → T039 → T040                         (migration 5)
T041…T044 → T045 → T046 → T047 → T048 → T049    (migration 6)
          T047 → T050, T051, T052               (amostras, 2ª etapa)
T053,T054 → T055 → T056 → T057 → T058           (migration 7)
          T055 → T059 · T057 → T060 → T061…T064 · T065 → T066 → T067
T068 → T069 → T070 · T071 → T072 (⛓ T066)       (endereço de turma)
T073 → T074 · T020 → T075 → T076 · T077 → T078…T087 → T088…T097 → T098
T058 → T099 · T100…T103 → T104 → T105 👤 → T106 → T107 → T108
```

### Dentro do PR 2
```text
T109 → T110, T111, T112→T113, T114→T115
US1: T116→T117 · T118→T119 · T120→T121 · T122→T123 → T124 → T125…T127 → T128
US7: T129 → T130 (mesmo commit da T124) · T131
US2: T132→T133 · T134→T135 → T136→T137 · T138→T139 · T140→T141 · T142→T143 → T144 → T145…T151 → T152, T153
US3: T154→T155 → T156 → T157 → T159 · T158
US4: T160→T161 → T162 → T163 · T164→T165 → T166 → T167 → T168, T169 → T170, T171
US5: T172→T173 · T174→T175 · T176→T177 · T178→T179 → T180, T181 · T182→T183 · T184→T185 → T186 → T187 → T188, T189 → T190, T191 · T192 → T193, T194 → T195
US6: T196→T197 · T198→T199 → T200 → T201 → T202 → T203 → T204
Fechamento: T205, T206 → T207 → T208 → T209
```

**Ordem das histórias no PR 2**: US1 e US7 juntas (o menu vira com a página) → US2 → US3 (usa a aba "Grade")
→ US4 → US5 (usa o domínio de limite da US2) → US6 (vive na tela de edição da US4).

---

## O que dá para fazer em paralelo

- **PR 1, Fase 2**: as **15** amostras (T003 a T017) são arquivos diferentes — todas em paralelo.
- **PR 1, cada migration**: o pgTAP e o bloco de RLS da mesma migration em paralelo (T018/T019; T022/T023;
  T037/T038; T041 a T044; T053/T054).
- **PR 1, ETL**: as **dez** provas (T088 a T097) em paralelo, depois das conferências.
- **PR 1, fechamento**: os quatro defeitos deliberados (T100 a T103).
- **PR 2**: os pares teste → módulo de `lib/dominio/` e de `lib/validacao/` de histórias diferentes não se tocam;
  os componentes marcados [P] de uma mesma página são arquivos distintos.

Exemplo — PR 2, US2, depois da T144:
```text
T145 CabecalhoDoCurso.tsx · T146 QuadroDeAvisosDoCurso.tsx · T147 AbasDoCurso.tsx
T149 AbaSobre.tsx · T151 AcoesDeSituacao.tsx
```

---

## Estratégia de implementação

1. **PR 1 primeiro, e sozinho.** Amostras verdes antes de qualquer migration; migrations na ordem 1 a 7, cada uma
   com o teste visto reprovando e a reversão executada; a varredura antes do fechamento, porque a migration 7
   sem ela faria curso inativo vazar no dia do merge; o ETL por último, porque carrega sobre as sete. Remoto
   **antes** do merge (T105, 👤).
2. **PR 2 por incremento visível.** **MVP das telas: US1 + US7** — `/cursos` no ar e "Cursos" disponível no
   menu. Depois US2 (a página que o Início já aponta), US3, e as escritas: US4, US5, US6.
3. **Cada ponto de conferência é parada real**: suíte do trecho verde antes de seguir.

---

## Contagem

| Fase | PR | História | Tarefas |
|---|---|---|---|
| 1 — Preparação | PR 1 | — / US5 | 2 |
| 2 — Amostras, 1ª etapa | PR 1 | — | 15 |
| 3 — Salas (migration 1) | PR 1 | US5 | 4 |
| 4 — Obrigatórios, rótulo, sigla (migration 2) | PR 1 | US4 / US5 | 9 |
| 5 — Código e rótulo (migration 3) | PR 1 | US5 | 5 |
| 6 — `turma_disciplina` (migration 4) | PR 1 | US5 | 3 |
| 7 — Permissões (migration 5) | PR 1 | US6 | 4 |
| 8 — Vigência (migration 6) e amostras, 2ª etapa | PR 1 | US6 / US4 | 12 |
| 9 — Curso inativo (migration 7) e varredura | PR 1 | US4 | 15 |
| 10 — Endereço de turma | PR 1 | US2 | 5 |
| 11 — Carga do ETL | PR 1 | — | 26 |
| 12 — Fechamento do PR 1 | PR 1 | — | 10 |
| **PR 1** | | | **110** |
| 13 — Fundação do PR 2 | PR 2 | — | 7 |
| 14 — Catálogo | PR 2 | US1 | 13 |
| 15 — Menu | PR 2 | US7 | 3 |
| 16 — Página do curso | PR 2 | US2 | 22 |
| 17 — Seletor de turma | PR 2 | US3 | 6 |
| 18 — Cadastro de curso | PR 2 | US4 | 12 |
| 19 — Turma e salas | PR 2 | US5 | 25 |
| 20 — Regime | PR 2 | US6 | 9 |
| 21 — Fechamento do PR 2 | PR 2 | — | 5 |
| **PR 2** | | | **102** |
| **Total** | | | **212** |

**Por história, somando os dois PRs**: US1 13 · US2 27 · US3 6 · US4 37 · US5 40 · US6 22 · US7 3 · transversais 64.

**Sub-IDs de 17/09/2026** (achado 5 do analyze, sem renumerar — o precedente é a T041.1 da fatia (c)): **T031.1**, **T031.2** no PR 1 e **T182.1** no PR 2.

---

## Decisões de 17/09/2026 sobre as perguntas do `tasks.md`

- **1 — Opção C, acrescida da nota da A.** Emenda **só** no `.md`, que registra que o `.docx` não a recebeu; e o
  `CLAUDE.md` ganhou a regra geral: nos documentos em `.md` e `.docx`, **o `.md` prevalece**; o `.docx` é o
  original entregue, preservado, nunca emendado. *"O repositório é a única fonte da verdade (P-1), e duas cópias do
  mesmo documento normativo sem regra de precedência é lacuna de governança. A opção B depende de reflexão manual
  em toda emenda futura e falha por desgaste."* **Feito** no `CLAUDE.md`. *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **2 — Opção C.** Provas do ETL **à mão** nesta fatia, com a saída registrada no PR 1, e pendência nomeada
  **`PEND-5a-4`**, dono Bernardo, para levá-las ao CI em PR próprio. **Recusada a A pura:** *"prova fora do CI
  envelhece sem ninguém perceber; pendência nomeada custa zero e impede o apodrecimento silencioso."* **Recusada a
  B:** *"levar as provas ao CI exigiria carregar dados reais da v2.0 no bloco de banco, e o repositório é
  público."* *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **3 — Opção A.** O ramo do PR 2 nasce da `main` **depois** do merge do PR 1. *"O paralelismo que a opção B compra
  não tem quem o use — o trabalho é sequencial e de um só desenvolvedor; em troca, a B aceitaria refazer 101 tarefas
  caso o PR 1 mude na revisão, e o PR 1 toca 46 policies."* *(decisão de Bernardo Villas Boas, 17/09/2026)*
- **Regra dos valores esperados** — no topo deste arquivo, e declarada em cada tarefa que a exige.
- **Confirmados**: `confirmacao-de-gravacao.ts` (A-7); a desativação nos testes por sessão autenticada (A-4); o
  controle positivo de `rls.test.ts` pela função do banco (A-3). **Nada mais é cortado.**

---

## A última pergunta, respondida em 17/09/2026

**O `BRIEF-v2.1.md` §2.1 recebe a 28ª tabela? — Opção A, com um acréscimo.** O BRIEF recebe **emenda por
acréscimo, datada**, citando a B-21, **só no `.md`** — o `.docx` não é emendado, pela regra de precedência —, e a
emenda registra que **a lista é normativa e a contagem é descritiva, derivada dela**, sem reescrever o texto
original. **Acréscimo:** o `010_estrutura.sql` passa a afirmar o **conjunto de nomes**, não a contagem, e a
mensagem de falha nomeia o que falta e o que sobra.

**Recusadas:** **B** *"deixaria o BRIEF, que se declara autoridade de nomes, afirmando um número sabidamente
falso, com a correção visível só para quem encontrasse uma divergência dentro da pasta de uma fatia — é repetir o
erro da regra 5 do `CLAUDE.md`, corrigido hoje"*; **C** *"colocaria o inventário de tabelas em dois lugares, um
deles dentro de um arquivo de teste, garantindo que divirjam"*.

**Não há pergunta aberta neste `tasks.md`.** *(decisão de Bernardo Villas Boas, 17/09/2026)*
