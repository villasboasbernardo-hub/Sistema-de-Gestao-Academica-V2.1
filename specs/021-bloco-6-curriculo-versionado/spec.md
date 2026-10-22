# Feature Specification: Bloco 6 — currículo versionado

**Feature Branch**: `feat/BLOCO-6-curriculo-versionado`
**Created**: 2026-10-21
**Status**: PR 1 na `main` (`ae4e595`, #81, 21/10/2026) · PR 2 em conferência
**Input**: Bloco 6 do plano de correções, pelo `/corrigir` de Bernardo Villas Boas de 20/10/2026 (pedido de 16/10/2026):
*"poder registrar um currículo NOVO de um curso — disciplinas, UEs, CH, avaliações do currículo, duração em semanas, tudo o
que for preciso — SEM alterar o currículo em vigor (…) e as turmas em andamento continuam regidas pelo currículo atual,
sem nenhum acompanhamento estragado."* E as **regras de negócio do currículo, RC-1 a RC-12**, decisões nominais de
Bernardo Villas Boas de 21/10/2026 (`docs/correcoes/regras-do-curriculo-bloco-6.md`, texto integral versionado no ramo).

## 1. O problema, em uma frase

O currículo **é o curso** — mudar uma CH, uma UE ou uma avaliação do currículo muda o acompanhamento de toda turma do
curso, inclusive das que estão em andamento; não há como preparar o currículo do ano seguinte sem estragar o deste.

## 2. Paridade ou novidade (regra 3)

**Novidade**, autorizada nominalmente por Bernardo Villas Boas (resposta 7 da triagem de 16/10/2026, e o `/corrigir` de
20/10/2026). Épico próprio, por último no plano de correções.

## 3. As regras de negócio do currículo — RC-1 a RC-12 *(decisões nominais de Bernardo Villas Boas, 21/10/2026)*

O texto que vale é o de `docs/correcoes/regras-do-curriculo-bloco-6.md`; aqui, a referência curta.

| # | A regra |
|---|---|
| **RC-1** | O **curso** é a identidade permanente (sigla, nome, classificação); tudo o que descreve **o que se ensina** é do **currículo**: propósito, duração, disciplinas, UEs, avaliações e regras de avaliação, limites de AEC/TAD/TR, habilitações por disciplina e o PDF. A coluna que vai para o currículo **não é apagada** do curso: o currículo 1 recebe o valor, os leitores leem do currículo, a coluna fica `[APOSENTADA — v2.1]` |
| **RC-2** | No máximo **um vigente** por curso; pode haver **um futuro** e os **passados** |
| **RC-3** | Vigência por data: vigente = maior início ≤ hoje (São Paulo); futuro = início depois de hoje; passado = os demais. **Derivado**; só "arquivado" é guardado |
| **RC-4** | A turma **escolhe o currículo ao ser criada** (vigente ou futuro; padrão: o vigente na data de início); tudo da turma segue o currículo dela; troca só sem lançamento |
| **RC-5** | Cadastrar ou editar o conteúdo é sempre **num currículo escolhido** |
| **RC-6** | Corrigir currículo seguido por turma com lançamento (mudar valor, acrescentar ou inativar item): **só o trio**, com **justificativa obrigatória** e **trilha** (quem, quando, o quê, valor anterior, justificativa); **completar o que estava vazio é livre**; os demais perfis não editam currículo em uso. **Substitui a D-4/D-6** |
| **RC-7** | "Novo currículo" nasce como **cópia do vigente** e se edita livremente enquanto nenhuma turma com lançamento o segue |
| **RC-8** | A página do curso tem **seletor de currículo** (vigente por padrão; vigente, futuro, passados) e "Novo currículo"; as abas Sobre o Curso, Grade, Disciplinas, Avaliações e Atividades mostram **só** o selecionado (URL dona do estado). ⚠️ **Emendada na conferência do PR #82 (A-1 a A-3, abaixo):** a página mostra **só o vigente**, sem seletor; o seletor e "Novo currículo" foram para *Editar curso*, e a aba *Currículo* consulta os outros |
| **RC-9** | Turmas do curso: **todas**, inclusive arquivadas, cada uma com o currículo que segue — "Currículo 1 (vigência 2024)"; o mesmo rótulo na ficha |
| **RC-10** | O trio **arquiva** o currículo passado quando todas as turmas que o seguem estão arquivadas; sai do seletor, **nunca é apagado**, consulta-se por "mostrar currículos arquivados"; coluna própria, não `status` |
| **RC-11** | Cada currículo tem **o seu PDF**; o do Bloco 5 passa a ser do currículo 1 |
| **RC-12** | Na tela, **"Currículo N"** com o ano de início da vigência; "versão" só no código |

### 3.1 O quadro: cada RC × o que já estava feito × o que muda

"Feito" é o PR 1 como estava no portão de 21/10/2026 (commits `3468d4c`, `810ee6a`, `ee10119`), antes da revisão.

| RC | Já estava feito | Banco | Código | Tela |
|---|---|---|---|---|
| RC-1 | o currículo era dono de disciplinas, UEs, avaliações do currículo, limites e (pela disciplina) habilitações | **PR 1:** `curriculos` ganha propósito, duração em semanas e em dias, modelo e data do PDF; o currículo 1 recebe os valores do curso; `avaliacoes_planejadas` (fórmula da MF, caráter) ganha currículo; as cinco colunas do curso ficam `[APOSENTADA — v2.1]`; `app.disciplina_sem_ue` lê o modelo do currículo; o curso novo nasce com o currículo 1 carregando os valores | **PR 1:** todo leitor e escritor dessas colunas passa ao currículo — o vigente hoje nas telas do curso (catálogo, página, edição, download do PDF), o da turma no DSA, papel, planilha, ficha e Início; a sincronização da VIRADA-1 e a conferência do ETL leem o modelo do currículo; a ETAPA 6c do ETL ressincroniza o currículo 1; guarda contra leitura da coluna aposentada | nada muda (PR 1) |
| RC-2 | índice único (curso, início) entre os ativos | — | **PR 2:** a cópia recusa um segundo futuro e exige começar depois do mais novo (D-27) | PR 2 |
| RC-3 | vigência por data; currículo 1 desde 01/01/2020 | **PR 1:** o currículo 1 começa no ano em que o sistema conhece o curso (D-2 revista); `arquivado_em`/`arquivado_por`, a única situação guardada | **PR 1:** `lib/dominio/curriculos.ts` (vigente, futuro, passado; o mesmo critério de `app.curriculo_vigente`) | PR 2 |
| RC-4 | a turma nascia no vigente e trocava só sem lançamento | **PR 1:** o currículo arquivado não recebe turma nem é o padrão | — | **PR 2:** o seletor em *Nova turma* |
| RC-5 | `criar_disciplina` aceita o currículo; sem ele, com dois, recusa | — | **PR 2:** todo formulário de conteúdo passa o currículo selecionado | PR 2 |
| RC-6 | a trava estrita (D-4/D-6) na M2 — derrubava três funções de hoje no CI | **PR 1: a trava SAI.** **PR 2:** a correção pelo trio (recurso próprio na matriz), com justificativa, e a trilha `correcoes_de_curriculo`, só de acréscimo | PR 2 | PR 2 |
| RC-7 | o rascunho da cópia (`contracts/copia-da-versao-rascunho.sql`) | **PR 2:** a cópia, levando também o conteúdo da RC-1 e as regras de avaliação | PR 2 | PR 2 |
| RC-8 | — | — | PR 2 (`?curriculo=` no contrato da URL) | PR 2 |
| RC-9 | — | — | PR 2 (`rotuloDoCurriculo`, já no PR 1) | PR 2 |
| RC-10 | `status` inativo só sem turma | **PR 1:** a coluna; **PR 2:** a função de arquivar, com porteiro do trio | PR 2 | PR 2 |
| RC-11 | o PDF no curso (Bloco 5) | **PR 1:** `pdf_carregado_em` no currículo, copiado; **PR 2:** o caminho por currículo e as policies do balde | **PR 1:** o download e o registro pelo currículo vigente | PR 2 |
| RC-12 | mensagens e descrição com "versão" | **PR 1:** mensagens e a descrição do currículo 1 sem "versão" | **PR 1:** traduções das recusas sem "versão" | — |

### 3.2 RC-1, coluna a coluna de `cursos`

| Coluna | Fica no curso ou vai para o currículo |
|---|---|
| `codigo`, `nome_curso`, `nome_normalizado`, `classificacao` | **curso** — a identidade (RC-1) |
| `limite_turmas_ano` | **curso** — decorre da classificação, é regra de oferta |
| `prioridade_alocacao` | **curso** — prioridade entre cursos na alocação, não descreve o ensino |
| `status`, auditoria, `origem_migracao_v1` | **curso** — convenção |
| `proposito` | **currículo** (RC-1, nominal) |
| `duracao_semanas`, `duracao_dias` | **currículo** (RC-1, "duração") |
| `curriculo_modelo` (UEs ou competências) | **currículo** — *recomendação adotada (D-20)*: descreve como o currículo oficial organiza o ensino; um currículo novo pode trocar de modelo |
| `curriculo_pdf_em` | **currículo** (RC-11) |
| `modalidade` | **curso** — *recomendação (D-20)*: é como o curso é oferecido, e a turma já tem a sua (`turmas.modalidade`, D8 do Épico 5.5). Alternativa: currículo |
| `ofertavel_estrangeiros`, `estrangeiros_observacao` | **curso** — *recomendação (D-20)*: política de oferta, não conteúdo. Alternativa: currículo |
| `custo_total`, `custo_composicao` | **curso** — *recomendação (D-20)*: informativo. ✅ **A regra 2 foi respondida por Bernardo Villas Boas em 21/10/2026: custo de curso É controle da CIAARA-11** — a `PEND-020-3` está fechada, e as colunas ficam em uso |
| regimes de horário NOMEADOS (`regimes_de_horario`, Bloco 3) | ~~**curso** — *recomendação (D-20)*~~ → **currículo**, por **emenda à RC-1 de Bernardo Villas Boas, 21/10/2026** (A-4, abaixo): os de cada curso vão para o currículo 1 dele; o currículo novo copia os seus; a turma escolhe entre os do currículo dela |
| regime padrão com vigência (`curso_regime_historico`) | **curso** — *adotada por padrão (D-39)*: é o relógio de quem não escolheu regime nomeado, com vigência própria por data; a emenda fala dos regimes nomeados |
| *(tabela)* `avaliacoes_planejadas` — fórmula da MF, caráter | **currículo** (RC-1, "regras de avaliação"): ganha `curriculo_id` |

## 4. O que é banco e o que é tela

- **PR 1 (banco + leitores da RC-1):** a tabela dos currículos; o currículo de hoje vira o currículo 1 de cada curso,
  com toda turma ligada a ele e o conteúdo da RC-1 copiado; tudo o que lia o currículo **pelo curso** no banco passa a ler
  **pelo currículo da turma**; os leitores e escritores do código das colunas aposentadas passam ao currículo. **Altera o
  que existe** (regra 9.4), e **nada muda em tela** — provado na cópia do remoto. **Merge autorizado** por Bernardo se a
  prova passar.
- **PR 2 (código e telas):** a cópia (RC-7), o seletor (RC-8), o currículo em *Nova turma* e o rótulo (RC-4, RC-9), a
  correção pelo trio (RC-6), o arquivamento (RC-10), o PDF por currículo (RC-11) e os leitores do `contracts/codigo.md`
  (inclusive a VIRADA-1).

## Clarifications

### Session 2026-10-21 *(adotadas por padrão — Bernardo confere no fim; revistas pelas RC no mesmo dia)*

- D-1 · Q: Como o currículo guarda o conteúdo? → A: o currículo é **dono** das disciplinas (e, por elas, das UEs e das
  avaliações do currículo), dos limites e — pela RC-1 — das regras de avaliação e do propósito, duração, modelo e PDF; o
  currículo novo é uma **cópia** das linhas, com a mesma **linhagem**. Alternativa: camada de "diferenças" — rejeitada.
- D-2 · Q: Qual a vigência do currículo 1? → A *(revista pelas RC)*: **1º de janeiro do ano mais antigo em que o sistema
  conhece o curso** — o da turma mais antiga ou o do cadastro do curso, o menor. Medido na cópia
  `remoto-20261021-074644.sql`: **2026 nos 24 cursos** (todas as turmas começam em 2026; todo curso foi cadastrado em
  2026). O curso novo começa no ano do cadastro. *Antes:* 01/01/2020 em todos, que na tela sairia "vigência 2020" — um ano
  inventado. O trio corrige a vigência pela RC-6. Alternativa: manter 2020.
- D-3 · Q: O currículo da turma pode ser "nulo = o vigente", como o regime de horário? → A: **Não**: fixo (`NOT NULL`).
- ~~D-4 · O que a trava pega~~ → **SUBSTITUÍDA pela RC-6** (21/10/2026). A trava estrita **saiu do PR 1**.
- D-5 · Q: A regra da RC-6 vale sem sessão? → A: **Não**: migration, ETL e script de manutenção passam (atos revistos; o
  ETL corrige `modo_atribuicao_padrao` e ressincroniza o currículo 1 depois da carga). Vale para o PR 2.
- ~~D-6 · O arbitrado trava?~~ → **SUBSTITUÍDA pela RC-6**: arbitrar o que era vazio é completar (livre); mudar o
  arbitrado é correção (trio, justificativa).
- D-7 · Q: Trocar o currículo de uma turma sem lançamento perde o planejamento? → A: **Não**: as linhas do currículo velho
  ficam inativas e as do novo levam, por linhagem, período, atribuições, rateio e ajustes.
- D-8 · Q: E a turma que muda de curso (`FR-026`, caminho 4)? → A: vai para o vigente do curso novo.
- D-9 · Q: Disciplina, limite ou regra de avaliação gravados sem currículo num curso com dois ativos? → A: **recusado**
  (*"Informe o currículo"*): o banco não adivinha (Princípio I, RC-5).
- D-10 · Q: O código da disciplina continua único no curso? → A: único **no currículo** — emenda ao `RF-DADOS-06`
  (documento 02); `RN-MAT-02` (aposentada) intocada; `RN-MAT-01` preservada e reforçada.
- ~~D-11 · A duração é do curso ou da versão (nula = a do curso)?~~ → **SUBSTITUÍDA pela RC-1**: é do currículo, sem
  recurso ao curso; o currículo 1 recebe a do curso.
- D-12 · Q: A cópia leva as habilitações de instrutor? → A: **Sim** (novos vínculos `VIN-`).
- D-13 · Q: Um PR ou dois? → A *(revista)*: **dois.** O **PR 1** é o banco **e** os leitores das colunas que a RC-1 tirou do
  curso — sem eles, a primeira edição na tela divergiria do que outra tela lê; nada muda em tela, provado. A **trava sai do
  PR 1**: a RC-6 precisa da tela da justificativa e vai inteira no PR 2. O **PR 2** traz as telas, a cópia, a correção, o
  arquivamento e os leitores por currículo.
- D-14 · Q: Dois currículos podem começar no mesmo dia? → A: **Não** (índice único entre os ativos).
- D-15 · Q: Quem cria e quem edita o currículo? → A *(revista pela RC-1)*: **`cursos.editar`** (o trio), com alcance e curso
  em oferta — o **mesmo** direito que editava propósito e duração quando eram do curso. *Antes:* `disciplinas.editar`, que
  daria ao Operador o propósito e a duração, que ele não editava — o caso que discrimina em
  `tests/invariantes/rls/curriculos.test.ts`. O conteúdo (disciplinas, UEs, avaliações) segue com as permissões de hoje.
- ~~D-16 · Onde fica na tela~~ → **SUBSTITUÍDA pela RC-8, RC-4, RC-9 e RC-12** (seletor de currículo no alto da página do
  curso, *Novo currículo*, o currículo em *Nova turma*, o rótulo "Currículo N (vigência AAAA)").
- D-17 · Q: E a VIRADA-1? → A: a sincronização casa disciplina e UE **dentro do currículo da turma** (PR 2); o modelo já é
  lido do currículo da turma no PR 1.
- ~~D-18 · A vigência de uma versão em uso pode mudar livremente?~~ → **SUBSTITUÍDA pela RC-6**: no currículo em uso, mudar
  a vigência é correção (trio, justificativa).
- D-19 · Q: Um currículo pode ser inativado? → A: só se **nenhuma turma** o segue — é a exclusão lógica do currículo criado
  por engano; o passado sai do seletor pelo **arquivamento** (RC-10), não por aqui. Sem tela no PR 2.
- D-20 · Q: As colunas ambíguas de `cursos` (RC-1)? → A: ficam no **curso** `modalidade`, estrangeiros, custo e os regimes
  de horário; vai para o **currículo** `curriculo_modelo` (§3.2).
- D-21 · Q: O currículo 1 recebe o conteúdo da RC-1 como? → A: por cópia, na M2, com a conferência dentro da própria
  migration (24 de 24 iguais, ou ela se desfaz); o curso novo, pelo gatilho que cria o currículo 1.
- D-22 · Q: O ETL reaplica a carga das UEs, que marca o modelo **no curso**. → A: a **ETAPA 6c** ressincroniza o currículo 1
  com o curso, só onde há um currículo, idempotente — o "dois caminhos" do `simultaneo` (spec 010) e da conversão da
  capacitação (spec 020).
- D-23 · Q: O currículo arquivado pode reger turma nova? → A: **Não**: não é o padrão (`app.curriculo_vigente` o ignora) e
  a turma não entra nele (`versao_inativa`).
- D-24 · Q: "Completar o que estava vazio" (RC-6) é o quê? → A: o valor que era **nulo** e passa a ter valor; qualquer
  outra mudança no currículo em uso — valor que muda, valor que se apaga, item que entra, item que se inativa ou reativa
  — é correção. Vale para toda coluna do conteúdo, inclusive texto (nome no DSA, propósito): texto também sai no papel.
- D-25 · Q: As habilitações de instrutor travam no currículo em uso? → A: **Não**: habilitar um instrutor novo numa
  disciplina em uso é cadastro do instrutor, não reinterpreta o passado. Alternativa: tratá-las como conteúdo (RC-6).
- ~~D-26 · Q: Como a justificativa chega ao banco (RC-6)? → A: por função (`public.corrigir_curriculo`) que a recebe,
  marca a transação e faz a mudança.~~ → **REVISTA NA IMPLEMENTAÇÃO DO PR 2** *(adotada por padrão — Bernardo confere no
  fim)*: pelo **cabeçalho** `x-justificativa-de-correcao` da própria gravação, em **base64 do UTF-8** (o acento cabe), lido
  pelo gatilho por `app.justificativa_de_correcao()` em `request.headers`. O gatilho continua sendo quem decide: recusa a
  correção sem ela (`justificativa_obrigatoria`) e grava a trilha **antes** da mudança. Motivo: a função única exigiria
  reescrever como RPC **toda** gravação do conteúdo — disciplina, UE, avaliação do currículo, arbitrado, limites, PDF —,
  seis caminhos que hoje são `update` com policy; o cabeçalho deixa cada ação como está e só acrescenta a frase. A
  justificativa vale **só** para a requisição que a leva (o PostgREST põe o cabeçalho na transação dela).
- D-27 · Q: O "um futuro" da RC-2 é regra? → A: **Sim**, na cópia: o currículo novo começa **depois do mais novo** que existe,
  e não se cria outro quando o mais novo ainda é futuro (*"edite o futuro"*). A data de hoje vem de quem chama
  (`hojeNaCiaara()`, D20).
- D-28 · Q: Desarquivar? → A: **Sim**, pelo trio, como a turma (Bloco 2) — a RC-10 não o pede, e o arquivamento sem volta
  seria a única ação do sistema que não se desfaz.
- D-29 · Q: O PDF por currículo mora onde? → A *(revista no PR 2, adotada por padrão — Bernardo confere no fim)*: o do
  Bloco 5 continua em `<curso>/curriculo.pdf` (não se move objeto do Storage por SQL) e passa a ser apontado pelo
  currículo 1 (`curriculos.pdf_caminho`); todo envio novo vai para **um arquivo novo**,
  `<curso>/<currículo>/<instante>.pdf`, **sem sobrescrever** — substituir é trocar o caminho no currículo, e no currículo
  em uso isso é correção (RC-6), com a trilha guardando o caminho anterior. O arquivo anterior fica no balde (regra 4,
  sem policy de `DELETE`). Uma policy nova de `INSERT` no balde aceita só esse caminho.
- D-30 · Q: A aba *Grade* mostra as turmas do currículo selecionado ou todas? → A *(adotada por padrão)*: **todas** (a
  RC-9 é a regra específica das turmas: *"todas juntas"*), cada uma com o currículo que segue; o seletor de currículo não
  filtra turmas. Alternativa: só as do selecionado.
- D-31 · Q: E as arquivadas, na aba *Grade*? → A *(adotada por padrão)*: aparecem **na lista**, marcadas *Arquivada*
  (RC-9); o **seletor de turma** e a pré-seleção continuam sem elas (C-24 da spec 017), e *Turmas com teto excedido*
  também.
- D-32 · Q: Onde se editam o propósito, a duração e o PDF? → A *(adotada por padrão)*: em **Editar currículo**
  (`/cursos/<sigla>/curriculos/<N>/editar`, aberto pela barra do currículo), no currículo escolhido (RC-5). *Editar curso*
  deixa de mostrá-los e aponta o caminho; *Novo curso* continua pedindo-os, porque o currículo 1 nasce com o curso.
- D-33 · Q: As disciplinas, as UEs e as avaliações do currículo novo se editam onde? → A *(adotada por padrão)*: na aba
  *Disciplinas* do curso, com o currículo escolhido no seletor — a mesma tela de hoje, recortada pelo currículo.
- D-34 · Q: Turma nova: qual vem marcada? → A *(adotada por padrão)*: **"o vigente na data de início da turma"**, que o
  banco escolhe ao gravar (`app.curriculo_padrao_da_turma`) — a data ainda está sendo digitada; as outras opções são o
  vigente e o futuro, pelo nome.
- D-35 · Q: Na ficha do instrutor, como se distinguem as duas cópias da mesma disciplina? → A *(adotada por padrão)*: com
  dois currículos no curso, o rótulo vira *"CAHO · Currículo 2 (vigência 2027)"*; com um só, segue *"CAHO"*.
- D-36 · Q: E o currículo criado por engano (ou na conferência)? → A *(adotada por padrão)*: **Descartar currículo** na
  barra do currículo — exclusão lógica (`status = 'inativo'`, D-19), só para o que **nenhuma turma** segue e **não** é o
  vigente; o banco recusa o resto (`versao_em_uso`). Sem ele, um currículo de teste criado no preview ficaria no dado
  real para sempre. Alternativa: sem tela (o D-19 original).
- D-37 · Q: A situação do currículo (`status`) é "conteúdo" para a RC-6? → A *(adotada por padrão)*: **não** — ela tem
  regra própria (`app.guardar_situacao_da_versao`: o currículo seguido por turma não se inativa); tratada como correção,
  a recusa certa chegaria disfarçada de pedido de justificativa (medido no teste com sessão real).

### Conferência do PR #82 — os ajustes nominais *(Bernardo Villas Boas, 21/10/2026, antes do merge, no mesmo PR)*

- **A-0 · Custo do curso:** *"É controle da CIAARA-11 (regra 2) — feche a pendência."* A `PEND-020-3` está fechada.
- **A-1 · Página do curso SÓ LEITURA**, mostrando o currículo **vigente** nas abas (Sobre, Grade, Disciplinas,
  Avaliações, Atividades, Horários). **Sai o seletor de currículo da página.**
- **A-2 · Nova aba "Currículo":** lista o vigente, o novo (futuro) e os arquivados, com consulta ao conteúdo de cada um
  (disciplinas, avaliações, horários, atividades) **só para leitura**.
- **A-3 · "Novo currículo" e "Editar currículo" passam para DENTRO de "Editar curso":** escolher o currículo (ou criar o
  novo, cópia do vigente) e editar ali **todas** as informações dele — disciplinas, códigos, CH, UEs, avaliações, horários,
  atividades/limites, propósito, duração, PDF. A correção do vigente em uso continua pela RC-6.
- **A-4 · Horários passam a ser do currículo (emenda à RC-1):** os regimes nomeados de cada curso vão para o currículo 1
  dele; currículo novo copia e edita os seus; a turma escolhe regime entre os do currículo **dela**. Migration que altera:
  **autorizada**, com a prova de sempre na cópia do remoto (DSA, papel, planilha e páginas idênticos para as 29 turmas);
  se mudar qualquer número de tela, PARE. Antes da M4: 24 cursos → 24 currículos (currículo 1 cada) e 0 turmas ligadas a
  currículo de outro curso.

### As dúvidas desta rodada *(adotadas por padrão — Bernardo confere no fim)*

- D-38 · Q: O regime nomeado é conteúdo para a RC-6? → A *(adotada por padrão)*: **sim** — acrescentar, mudar ou inativar
  regime no currículo seguido por turma com lançamento é correção (o trio, com justificativa, na trilha), como disciplina e
  limite. Consequência: o **Operador** cria e edita regime só em currículo livre. Alternativa: isentar regime da RC-6 (um
  regime novo não muda nenhuma turma até ser escolhido, e a troca já trava no primeiro lançamento — `RF-HOR-05`).
- D-39 · Q: E o regime padrão com vigência (`curso_regime_historico`)? → A *(adotada por padrão)*: **fica no curso** — é o
  relógio de quem não escolheu regime nomeado e já tem vigência própria; levá-lo ao currículo mudaria o relógio de turma
  que não escolheu nada. Alternativa: currículo.
- D-40 · Q: Quem entra em *Editar curso*? → A *(adotada por padrão)*: quem tem `cursos.editar` **ou** `horarios.criar`/
  `editar` **ou** `disciplinas.criar`/`editar`; cada parte segue a sua permissão (o Operador edita disciplinas e horários
  sem editar o cadastro do curso). O botão da página do curso segue a mesma regra.
- D-41 · Q: Como se organiza a seção *Currículo* de *Editar curso*? → A *(adotada por padrão)*: a barra (seletor com todos,
  arquivados inclusive; situação; *Novo currículo*; *Descartar*; *Arquivar/Desarquivar*) e quatro partes na URL
  (`?parte=`): **Dados e PDF** (padrão) · **Disciplinas e avaliações** · **Horários** · **Atividades e limites**.
- D-42 · Q: Os limites de AEC/TAD/TR se editam onde, e como? → A *(adotada por padrão)*: na parte *Atividades e limites* —
  declarar (tempos, arquivo e página do currículo), editar e **retirar** (exclusão lógica, volta a valer o percentual da
  norma). Até aqui eles só entravam por migration.
- D-43 · Q: O arbitrado de avaliação "no curso" se faz onde? → A *(adotada por padrão)*: em *Editar curso* → *Disciplinas
  e avaliações*, no quadro das avaliações do currículo; o arbitrado da turma continua na aba Avaliações da turma.
- D-44 · Q: O currículo arquivado se edita? → A *(adotada por padrão)*: **não** — ele se consulta (aba *Currículo* e o
  seletor de *Editar curso*); para editar, desarquiva-se.
- D-45 · Q: A aba *Currículo* mostra os arquivados sem pedir? → A *(adotada por padrão)*: **sim**, com a situação escrita
  ("arquivado"); o seletor "mostrar arquivados" saiu com o seletor da página.
- D-46 · Q: O buraco achado na M4 (o porteiro da RC-6 rodava antes de o gatilho da versão preencher o currículo, então
  inserir só com `curso_id` pulava a regra)? → A: **corrigido na própria M4, antes do remoto** — o porteiro resolve o
  currículo do curso quando ele é único. Um caso de RLS (limites, pelo Ajudante) passava **pelo buraco**; agora manda a
  justificativa, e o caso de pgTAP `146` reprova com a correção desligada.

## 5. Requisitos

### FR-001 — Currículos (PR 1)
- **FR-001.1**: Cada curso MUST ter um ou mais currículos, numerados, com vigência (D-1, D-2; RC-2, RC-3).
- **FR-001.2**: O currículo de hoje MUST ser o currículo 1 de cada curso, e toda disciplina, limite, regra de avaliação e
  turma existente MUST ficar ligada a ele.
- **FR-001.3**: O currículo 1 MUST receber o propósito, a duração, o modelo e a data do PDF do curso (RC-1, RC-11), e as
  cinco colunas do curso MUST ficar, comentadas `[APOSENTADA — v2.1]`.
- **FR-001.4**: Nenhum número nem texto de tela MUST mudar com a ligação (SC-001).
- **FR-001.5**: Curso novo MUST nascer com o currículo 1, com o conteúdo da RC-1 que veio na criação.
- **FR-001.6**: Situação (vigente, futuro, passado) MUST ser derivada da data; só o arquivamento é guardado (RC-3).

### FR-002 — A turma e o currículo (PR 1)
- **FR-002.1**: A turma MUST nascer no currículo vigente na data de início, salvo escolha (RC-4).
- **FR-002.2**: O currículo da turma MUST mudar só sem lançamento (`RF-HOR-05`), levando o planejamento por linhagem (D-7).
- **FR-002.3**: Linha, lançamento e ajuste da turma MUST apontar só disciplina, UE ou avaliação do currículo dela (D-10).
- **FR-002.4**: O currículo arquivado MUST NOT receber turma nem ser o padrão (D-23).

### FR-003 — Os leitores da RC-1 (PR 1)
- **FR-003.1**: Toda tela que mostra propósito, duração, modelo ou PDF MUST lê-los do currículo (o vigente hoje nas telas
  do curso, o da turma nas da turma), e toda gravação MUST ir ao currículo.
- **FR-003.2**: Editar o currículo MUST exigir `cursos.editar`, alcance e curso em oferta (D-15).

### FR-004 — As telas, a cópia, a correção e o arquivamento (PR 2)
- **FR-004.1**: "Novo currículo" MUST nascer como cópia do vigente (RC-7, D-12, D-27).
- **FR-004.2**: ~~A página do curso MUST ter o seletor de currículo (RC-8).~~ → A página do curso MUST ser **só
  leitura** e mostrar o currículo **vigente** em todas as abas; a aba *Currículo* MUST listar todos e consultar cada um
  só para leitura (A-1, A-2).
- **FR-004.3**: *Nova turma* MUST oferecer o currículo (vigente ou futuro; padrão: o vigente na data de início) (RC-4).
- **FR-004.4**: As turmas do curso MUST aparecer todas, inclusive arquivadas, com "Currículo N (vigência AAAA)"; a ficha da
  turma MUST mostrar o mesmo rótulo (RC-9, RC-12).
- **FR-004.5**: No currículo em uso, a correção MUST ser só do trio, com justificativa, gravada na trilha; completar o vazio
  MUST ser livre (RC-6, D-24, D-26).
- **FR-004.6**: O trio MUST poder arquivar o currículo passado com todas as turmas arquivadas, e desarquivar (RC-10, D-28).
- **FR-004.7**: Cada currículo MUST ter o seu PDF (RC-11, D-29).
- **FR-004.8**: O DSA, o papel, a planilha, as abas e a sincronização (VIRADA-1) MUST usar o currículo da turma (D-17).

### FR-005 — Os ajustes da conferência do PR #82
- **FR-005.1**: *Editar curso* MUST ter a seção *Currículo*: escolher (todos, arquivados inclusive), criar o novo (cópia
  do vigente), arquivar/desarquivar, descartar, e editar em quatro partes — dados e PDF, disciplinas e avaliações (com o
  arbitrado), horários, atividades e limites (A-3, D-41 a D-44).
- **FR-005.2**: Os regimes nomeados MUST ser do currículo: o currículo 1 de cada curso recebe os seus, a cópia leva os do
  vigente, e a turma MUST escolher só entre os do currículo dela; trocar o currículo da turma (sem lançamento) leva o
  regime correspondente, ou nenhum (A-4).
- **FR-005.3**: No currículo em uso, acrescentar, mudar ou inativar regime MUST seguir a RC-6 (D-38).

## 6. Critérios de sucesso

- **SC-001** (PR 1): Numa cópia **nova** do remoto, antes (o código da `main`) × depois (o código do ramo, com as
  migrations): a impressão digital do que o currículo alimenta **idêntica**; o retrato das telas (planilha, `.xlsx` e DSA
  de toda semana com lançamento das 29 turmas) **idêntico**; e o retrato das páginas (Sobre o Curso e as seis abas de cada
  curso, a edição do curso, a ficha e as avaliações de cada turma, o Início, o catálogo e a lista de turmas)
  **idêntico**.
- **SC-002** (PR 1): Com dois currículos do mesmo curso, cada turma lê o SEU — pgTAP com o caso que discrimina.
- **SC-003** (PR 1): A reversão volta o esquema à impressão digital da `main`, com dado.
- **SC-004** (PR 2): Criar o currículo 2 da CAHO com 3 semanas e uma CH a menos, planejar a `CAHO 2027` por ele, e a
  `CAHO 2026` continuar com os mesmos números em toda tela.
- **SC-005** (PR 2): No currículo em uso, a correção sem justificativa é recusada; com ela, o trio corrige e a trilha
  guarda quem, quando, o quê, o valor anterior e a justificativa; o Operador é recusado; completar o vazio passa.
- **SC-006** (ajustes do PR #82): Numa cópia **nova** do remoto, com a M4 e a M5: o DSA, o papel e a planilha de toda
  semana com lançamento das 29 turmas **idênticos** antes e depois; as páginas das turmas idênticas (salvo o link *"Segue o
  Currículo"*, que passa a abrir a aba *Currículo*); e, antes da M4, 24 cursos com 24 currículos (o 1 de cada) e 0 turmas
  em currículo de outro curso.
