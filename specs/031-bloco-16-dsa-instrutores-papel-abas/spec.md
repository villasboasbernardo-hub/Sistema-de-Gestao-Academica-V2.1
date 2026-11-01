# Spec 031 — Bloco 16: lançamento no DSA, mais de um instrutor, papel e abas de acompanhamento

**Pedido:** Bernardo Villas Boas, 30/10/2026, pelo `/corrigir` — *"Bloco 16 — lançamento no DSA, mais de um instrutor,
papel e abas de acompanhamento. Rodar sozinho até o PR. Registrar as regras novas no documento 04 /
regras-do-dsa-lancamento.md."* Nove itens, em três grupos (formulários do DSA; papel e grade; abas de acompanhamento).
**Ramo:** `fix/BLOCO-16-dsa-instrutores-papel-abas`, a partir da `main` `8504136` (Bloco 15 encerrado). **Regras
emendadas:** **RD-9** (nova) e **RD-1** em [`regras-do-dsa-lancamento.md`](../../docs/correcoes/regras-do-dsa-lancamento.md);
**RP-1** (o campo ALT) em [`regras-da-publicacao-do-dsa.md`](../../docs/correcoes/regras-da-publicacao-do-dsa.md); e a
**`RN-INST-04`** do documento 04, com nota datada (a autorização nominal é o próprio pedido). **Banco:** uma migration,
que só acrescenta (§6). ⚠️ **O papel do DSA muda** (itens 5, 6, 7 e 8): o merge espera a virada de semana.

## 1. O problema, em uma frase

O formulário de lançamento tem botões escritos, um rótulo comprido, a técnica de ensino na prova e o instrutor no
Estudo Individual; o Apoio Individualizado sai com um sufixo que Bernardo não quer; a aula só aceita **um** instrutor do
cadastro (o segundo é texto livre que não conta na carga); o campo ALT do papel diz *"ALT —"* na original; o cartão de
1 tempo esconde o local; e o acompanhamento do DSA só mostra disciplinas.

## 2. Paridade ou novidade (regra 3)

- **Padrão de tela pedido nominalmente** (itens 1, 2, 8 e 9): RT-1 (ícones), rótulos e o acompanhamento em abas.
- **Regra nova pedida nominalmente** (item 6): mais de um instrutor do cadastro por aula, cada um com os TA inteiros na
  própria carga, e a CH da turma contando uma vez. Emenda a `RN-INST-04` (documento 04) e cria a RD-9.
- **Mudança de texto do papel pedida nominalmente** (itens 5 e 7).
- **Contenção de escopo (regra 2):** tudo é da CIAARA-11 — o DSA e a carga do instrutor.

## 3. A triagem — o pedido, item a item, medido na `main` `8504136`

Medido no código e **no remoto, só leitura** (`supabase db query --linked`, 30/10/2026; as consultas estão em [`consultas/`](consultas/)).

| # | Item | Tipo | Medido |
|---|---|---|---|
| 1 | Lançar e Cancelar em ícone | padrão (RT-1) | O formulário de lançamento (`FormularioDeLancamento.tsx`) é **um só para todos os tipos** — aula, avaliação, vista, AEC, TAD, TR, EI e Apoio — e termina com dois botões **escritos**, *Lançar* e *Cancelar*, e *Entendi* depois de gravar com aviso. O cartão de edição (`AcoesDoBloco.tsx`) já tem *Salvar · Cancelar · Excluir* em ícones no canto inferior esquerdo (Bloco 15). |
| 2 | *"Em qual tempo começa"* → *"Início"* | rótulo | O rótulo está no lançamento **e** na edição. |
| 3a | Tipo de avaliação × Instrumento | ⛔ **PARADO** — guardam informação diferente | No remoto, nas avaliações vivas: *Prova Escrita* aparece com os instrumentos **PE, PM, PO e TI**; *Prova Prática* com **PP e PM**; *Trabalho* com **TG, TI e PM**. O tipo não determina o instrumento, nem o contrário. E os dois são lidos: o **tipo** vira o título da prova no papel (`conteudoDaAvaliacao`), a coluna do item na planilha (`catalogo.ts`) e a natureza do casamento com o planejado (`naturezaPeloTipo`, `RN-AVAL-01`); o **instrumento** decide a vista obrigatória (`RN-AV-13`). **Pela instrução do pedido, nada muda aqui e o quadro vai para Bernardo** (§9, `PEND-031-3`). |
| 3b | Tirar *"Técnica de ensino"* da avaliação | tela | `avaliacoes.metodologia` é **nulável** no banco: tirar o campo não pede migration. |
| 4 | EI sem escolha de instrutor | tela | `atividades_nao_letivas.instrutor_id` e `responsavel_externo` são **nuláveis**, e a regra do EI (`regraDoResponsavel`) já é *"cadastro opcional"*: tirar o campo não pede migration. |
| 5 | Apoio sem *" - alunos específicos"* | texto da tela e do papel | O texto é `ROTULO_DO_APOIO` (`lib/dominio/dsa/rotulos.ts`), mais o *"Conta como"* do formulário e a frase do Apoio no mesmo tempo (`grade.ts`). ⚠️ No remoto, **1 das 10** originais publicadas traz o texto no retrato — o RP-4 o normaliza para não acusar *"alterado desde a publicação"* (D-6). |
| 6 | Mais de um instrutor por aula | regra nova | Hoje a aula tem **um** `instrutor_id` e o campo **"Demais instrutores" em texto livre** (`outros_instrutores text[]`, spec 014 FR-046), que aceita quem não é do cadastro e **não conta em carga nenhuma** (`vw_instrutor_carga_anual` soma só `instrutor_id`). ⚠️ **No remoto, 25 aulas ativas têm esse texto preenchido** (por código, da D-8 da spec 014): se contassem, o instrutor de código **162** ganharia **+72 TA** e o **40**, **+34 TA**, em 2026, e **1** código não casa com instrutor nenhum. **A condição do pedido é efeito ZERO**: por isso a regra nova vai num campo **novo**, que nasce vazio, e as 25 aulas antigas **não são tocadas** — migrá-las é decisão de Bernardo (`PEND-031-1`). |
| 7 | ALT: *ORIGINAL*, *ALT 1*… | texto do papel | `rotuloDoAlt` (`lib/dominio/dsa/publicacao.ts`) dá *"ALT —"* para a original e a prévia; a impressão, o *Reimprimir*, as abas de versão e o carrossel do Início usam a mesma função. O número não está no retrato: muda no reimprimir das versões antigas sem tocar nelas. |
| 8 | Instrutor e local na mesma linha | 🐛 o local some no cartão de 1 TA | No papel (`DocumentoDoDsa.tsx`), o local está na linha de dados (*TA · local · T/E*), a que **encolhe primeiro** — no cartão de 1 TA ela some; o instrutor fica no pé, que nunca encolhe. A tela (`grade-dsa.tsx`) repete a ordem. Os nomes já se juntam com *" / "* (`consulta.ts`). |
| 9 | Abas de acompanhamento | tela | Abaixo da grade fica só o painel das disciplinas (`PainelDeSituacao.tsx`). O quadro das avaliações da turma existe (`quadroDeAvaliacoesDaTurma`, aba *Avaliações* da ficha). |

## 4. Requisitos

### FR-001 — Lançar e Cancelar em ícones (item 1)

O formulário de lançamento termina com **dois ícones juntos no canto inferior esquerdo**, com a dica só do verbo:
**Lançar** (o envio) e **Cancelar**. Gravado com aviso, o formulário fica aberto para a leitura e o *Cancelar* vira
**Fechar** (como no cartão de edição, D-1). Vale para todos os tipos.

### FR-002 — *Início* (item 2)

O campo *"Em qual tempo começa"* passa a se chamar **Início**, no lançamento e na edição.

### FR-003 — Avaliação sem técnica de ensino (item 3b)

O lançamento de **avaliação** não mostra *Técnica de ensino* e grava a técnica **nula**; na edição da avaliação o campo
também sai, e a técnica já gravada **não é tocada** (D-4). A **aula** continua com o campo.
⛔ **O item 3a fica parado** (§3): *Tipo de avaliação* e *Instrumento* continuam os dois no formulário, como estão.

### FR-004 — EI sem escolha de instrutor (item 4)

No **Estudo Individual**, o lançamento e a edição não mostram *quem ministra* nem o nome livre; o EI grava instrutor e
responsável **nulos** (a Server Action ignora o que vier). As demais atividades não mudam.

### FR-005 — Apoio Individualizado sem o sufixo (item 5)

O texto do Apoio passa a ser **"Apoio Individualizado"** na grade, no papel, na prévia e na planilha (e *"Conta como:
Apoio Individualizado (fora da CHT)"* no formulário). O retrato já publicado não muda; o RP-4 lê o texto antigo como o
novo (D-6).

### FR-006 — Mais de um instrutor por aula (item 6) — RD-9

1. Na **aula** (teórica ou prática), além de *quem ministra*, o lançamento e a edição oferecem **Instrutores
   adicionais**: zero ou mais instrutores **do cadastro**, escolhidos pelo seletor canônico, cada um **habilitado** na
   disciplina da aula (RD-1). Quem ministra não aparece entre os adicionais, e o mesmo instrutor não entra duas vezes.
2. A Server Action recusa adicional não habilitado (o par final, também quando só a disciplina muda), inexistente,
   repetido ou igual a quem ministra; o banco recusa inexistente, repetido e igual a quem ministra (gatilho).
3. **A CH da turma conta os TA uma vez só** (nada muda em `vw_chd_por_fato`, `vw_carga_horaria_turma` nem no saldo).
4. **A carga ministrada de CADA instrutor conta os TA inteiros** (`vw_instrutor_carga_anual`, `ta_ministrado_ano`):
   ficha, lista e estatísticas de Instrutores (D-10).
5. **O papel, a prévia, o cartão da grade e a planilha mostram todos os nomes**, separados por *" / "* — quem ministra
   primeiro, depois os adicionais em antiguidade, depois o texto livre antigo, se houver.
6. O campo de texto livre *"Demais instrutores"* sai do lançamento da **aula**; avaliação e atividades o mantêm (D-8).

### FR-007 — O campo ALT do papel (item 7)

O campo *Alteração* do papel diz **ORIGINAL** na primeira versão publicada e **ALT N** na alteração N; na **prévia**
(e na minuta), **PRÉVIA** (D-13). Vale na impressão, no *Reimprimir* das versões antigas, nas abas de versão e no
carrossel do Início.

### FR-008 — Instrutor e local na mesma linha (item 8)

No cartão do papel e da tela, **o instrutor e o local ficam na mesma linha** — a última, que nunca encolhe (*"Fulano /
Sicrano · Sala 3"*); a linha de dados fica com *TA · T/E*. No cartão de 1 TA o local deixa de sumir.

### FR-009 — Abas de acompanhamento (item 9)

Abaixo da grade, o acompanhamento ganha **abas**: **Disciplinas** (o painel de hoje, igual), **Avaliações**,
**APOINST** e **Palestras**. A aba vai para a URL (`?acompanhamento=`, padrão *disciplinas*). Para toda turma com DSA.

- **Avaliações** — uma linha por avaliação da turma (do currículo e lançada sem item), em ordem natural da disciplina:
  *Disciplina · Avaliação · Situação · Semana prevista · Semana lançada · Semana aplicada · TA*, com a referência no fim
  da semana mostrada, como as disciplinas (D-16).
- **APOINST** e **Palestras** — em branco, com o aviso **"Em breve"**.

## 5. Critérios de sucesso

- **SC-001** — O formulário de lançamento não tem botão escrito *Lançar* nem *Cancelar*; os dois ícones lançam e fecham.
- **SC-002** — Nenhuma tela do DSA diz *"Em qual tempo começa"*.
- **SC-003** — A avaliação lançada grava `metodologia` nula; a edição não mostra o campo.
- **SC-004** — O EI lançado grava `instrutor_id` e `responsavel_externo` nulos, sem campo de instrutor na tela.
- **SC-005** — Nenhum texto de tela, papel ou planilha diz *"alunos específicos"*; a semana publicada com o texto antigo
  não acusa *"alterado desde a publicação"*.
- **SC-006** — Uma aula com quem ministra **A** e adicional **B**, 3 TA: a CH da turma sobe 3; a carga ministrada de
  **A** e de **B** sobe 3 cada; o papel e o cartão mostram *"A / B"*; adicional não habilitado é recusado com a frase.
- **SC-007** — Na cópia do remoto, `vw_instrutor_carga_anual` dá **o mesmo resultado** antes e depois da migration
  (efeito zero, condição do pedido).
- **SC-008** — A impressão da original diz *ORIGINAL*; a da ALT 2, *ALT 2*; a prévia, *PRÉVIA*.
- **SC-009** — No cartão de 1 TA com local, o local aparece na linha do instrutor.
- **SC-010** — As quatro abas existem; *?acompanhamento=avaliacoes* abre a de avaliações, e APOINST e Palestras dizem
  *"Em breve"*.

## 6. Banco

**Uma migration, que só acrescenta** (regra 9.4 com a emenda de 19/10/2026): `registros_aula.instrutores_adicionais
uuid[] not null default '{}'` com o gatilho que confere (D-7), e a recriação de `vw_instrutor_carga_anual` somando os
adicionais — **autorizada pelo pedido com efeito zero medido na cópia do remoto** (SC-007). Nada de dado muda: a coluna
nasce vazia em todas as linhas. A view mantém `security_invoker` (gotcha 10). Rito completo do remoto.

**Aplicada no remoto em 30/10/2026**, depois do CI verde: backup `remoto-20261030-211901.sql`, dry-run só com ela, `db
push` 0; **102 e 102** migrations, impressão digital igual nos dois bancos (2.741 objetos, `35049a56…`), e a view de carga
no remoto com o mesmo md5 da medição (`21e538e8…`, 182 linhas) — o efeito zero confirmado no próprio remoto.

## 7. Fora do escopo

- Somar na carga os adicionais **antigos**, em texto (`PEND-031-1`).
- Conflito de horário (`RN-CONF-01`) olhar os adicionais (`PEND-031-2`).
- Juntar *Tipo de avaliação* e *Instrumento* (`PEND-031-3`, parado por instrução).
- O conteúdo das abas APOINST e Palestras.

## 8. Ajustes da conferência de 31/10/2026

*"Conferência do Bloco 16, Bernardo, 31/10/2026. O que não está abaixo: APROVADO."* Decisões: **item 3a** — *Tipo de
avaliação* e *Instrumento* ficam **os dois** (a `PEND-031-3` fecha com o motivo medido); **`PEND-031-1`** fica aberta,
sem mexer nas 25 aulas; **D-10** aprovada (os adicionais contam na ministrada). Ajustes no PR #109, antes do merge:

### FR-010 — Estudo Individual sem *Tipo de atividade* (ajuste A)

Quando a categoria tem **uma opção só** de *Tipo de atividade* (o Estudo Individual: 1 tipo no remoto e na base limpa),
o campo **não aparece** e a opção **já vem escolhida**. Vale para qualquer categoria nessa situação (D-19).

### FR-011 — O papel corta os tempos finais vazios (ajuste B)

*"se o último tempo do regime não tem nenhum lançamento na semana inteira, ele não sai no papel (repetir para os tempos
finais seguintes enquanto estiverem vazios), e as linhas restantes dividem a altura."* No **papel** — impressão, prévia e
o retrato das versões publicadas **a partir de agora** —, as linhas vão até o **último tempo ocupado** em qualquer dia da
semana (aula, avaliação, atividade, EI ou parada de parte do dia); as que sobram dividem a altura. A semana sem nada
mantém o regime. A **tela** continua com todas as linhas (é onde se lança num tempo vazio), e o *Reimprimir* das versões
já publicadas sai **idêntico** — o retrato guarda a grade dele. A orientação do papel não muda. A **planilha de
contingência** mantém o regime inteiro (D-20).

### FR-012 — O cartão adaptável (ajuste C)

**O "defeito" medido não é defeito do lançamento**: na CAHO 2026, semana do curso 44 (02 a 06/11), os adicionais foram
**salvos em 31/10/2026 dentro de uma alteração ainda não publicada** (a semana tem Original e ALT 1, de 27/10). A tela
(Minuta) os mostra; o **papel** mostra a versão publicada até *Publicar alteração* (RP-9) — por isso eles não estavam lá.
Medido na cópia `remoto-20261031-121200.sql`, só leitura (D-21).

Layout novo do cartão, na grade e no papel (`arranjoDoCartao`): **disciplina + código no topo**; **todos os instrutores
em negrito**, **empilhados** um por linha quando há altura (`instrutores ≤ 2 × tempos − 2`) e **lado a lado** com « / »
quando não há; a **quantidade de TA**; o **local** na última linha — ou, no cartão de **1 tempo**, na linha dos
instrutores, com o TA. O conteúdo se **distribui** pela altura do cartão (`space-between`). Provado com 1, 3 e 5 tempos ×
1 e 4 instrutores, na tela e na impressão: todo nome dentro do cartão (D-22).

### FR-013 — A aba Avaliações com *Editar* e histórico (ajuste D)

1. Colunas **Avaliação · Situação · Data de aplicação · Data da vista**; as semanas e o TA saem (D-23).
2. Ícone **Editar** por linha (diálogo): **situação** (*Pendente · Em andamento · Concluída · Cancelada · Atrasada · Sem
   correspondência*), **data de aplicação** e **data da vista**, com **justificativa obrigatória** (10 caracteres ou mais).
   Cada ajuste é uma linha nova de `ajustes_de_avaliacao` (só de acréscimo); o **mais recente vale**, e o **histórico**
   (autor, data e justificativa) aparece na linha. O autor é carimbado pelo banco.
3. **Edita quem lança o DSA da turma** (`registros_aula.criar` + alcance + turma em oferta; a arquivada só lê).
4. **A edição manual NÃO muda a CH**: nenhuma view lê a tabela; o ajuste vale só na linha — a contagem do quadro, a
   projeção e os alertas continuam os do lançado (D-24).
5. A **ficha da turma** (aba Avaliações) mostra a **mesma** situação ajustada, marcada *"ajustada à mão"*.
6. **Banco**: uma migration que **só acrescenta** (`20261031151628_ajustes_de_avaliacao`). A situação das avaliações é
   calculada em TypeScript (`quadroDeAvaliacoesDaTurma`), não numa view: **nenhuma view muda** — efeito zero por
   construção (pgTAP 155 confere que nenhuma view a lê). **Aplicada no remoto em 31/10/2026**, depois do CI verde: backup
   `remoto-20261031-141540.sql`, dry-run só com ela, `db push` 0; **103 e 103** migrations, impressão digital igual nos dois
   bancos (2.781 objetos, `315a6f87…`), a tabela vazia e nenhuma view a lê.

### Critérios de sucesso dos ajustes

- **SC-011** — No Estudo Individual não há campo *Tipo de atividade*; o lançamento grava com o tipo único.
- **SC-012** — No papel da semana com o último tempo vazio, ele não sai; na tela, sai.
- **SC-013** — Nos 6 cartões (1, 3 e 5 tempos × 1 e 4 nomes), na tela e no papel, todo nome fica dentro do cartão; o de 5
  tempos com 4 nomes, empilhado; o de 1 tempo, lado a lado com o local na mesma linha.
- **SC-014** — Um ajuste pela tela grava no banco (com o autor), aparece no histórico da linha e a ficha mostra a mesma
  situação; o Chefe de Departamento (lê, não lança) é recusado pelo banco (`42501`).

## Clarifications

### Session 2026-10-30

Decisões adotadas por padrão — **Bernardo confere no fim**.

- **D-1** — O "cartão de lançamento de atividades" é o formulário *Lançar*, que é um só para todos os tipos: os ícones
  valem para todos. Depois de gravar com aviso, *Cancelar* vira *Fechar* (no lugar do botão *Entendi*), como no cartão de
  edição. *Alternativa: só nos tipos de atividade.*
- **D-2** — *Início* também no cartão de edição. *Alternativa: só no lançamento.*
- **D-3** — Item 3a parado: tipo e instrumento ficam como estão (§3). *Alternativa: decidir agora — é de Bernardo.*
- **D-4** — Avaliação sem técnica: a edição tira o campo e não apaga a técnica gravada nas avaliações antigas.
  *Alternativa: limpar a técnica ao editar.*
- **D-5** — EI sem instrutor também na edição; a ação grava nulo mesmo que venha valor. *Alternativa: só no lançamento.*
- **D-6** — O RP-4 compara o texto do Apoio sem o sufixo antigo (1 semana publicada no remoto o tem), e o retrato
  publicado não muda. *Alternativa: deixar acusar "alterado".*
- **D-7** — Os adicionais vão numa **coluna nova** (`registros_aula.instrutores_adicionais uuid[]`), com gatilho que
  confere existência, repetição e o titular, e **não numa tabela nova**: o ciclo do rascunho (`gravar_rascunho_do_dsa`,
  `aplicar_rascunhos_da_semana`, descartar, publicar) copia as colunas da linha de forma genérica
  (`app.colunas_copiaveis`), e uma tabela filha exigiria reescrever essas funções, que estão em uso. *Alternativa: tabela
  `registro_aula_instrutores` com FK, reescrevendo as quatro funções (migration que altera).*
- **D-8** — Só a **aula** (teórica e prática) ganha adicionais do cadastro; avaliação e atividades seguem com o texto
  livre *"Demais instrutores"*, que não conta na carga. *Alternativa: estender a atividades (AEC) — elas não somam na
  carga ministrada hoje.*
- **D-9** — As 25 aulas antigas com o texto livre continuam mostrando os nomes e não contam (efeito zero); a migração é
  a `PEND-031-1`. *Alternativa: migrar agora — muda a carga de 2 instrutores (+72 e +34 TA): portão.*
- **D-10** — "Carga de cada instrutor" = a **ministrada** (`vw_instrutor_carga_anual`), que alimenta ficha, lista e
  estatísticas. A **prevista** vem da atribuição da disciplina (rateio A-1; o modo simultâneo da `RN-MAT-05` já dá a CH
  inteira a cada um), e o alerta lilás e o sininho leem a prevista: nenhum dos três depende do lançamento.
  *Alternativa: o adicional entrar na prevista — mudaria a `RN-MAT-05`.*
- **D-11** — A habilitação dos adicionais é conferida na Server Action, como a do titular (RD-1); o banco confere
  existência, repetição e titular. *Alternativa: conferir a habilitação também no banco.*
- **D-12** — O conflito de instrutor (`RN-CONF-01`) não olha os adicionais neste bloco (`PEND-031-2`).
- **D-13** — O campo ALT da **prévia** diz *PRÉVIA*; a planilha de contingência fica como está. *Alternativa: a prévia
  continuar com "ALT —".*
- **D-14** — O pé do cartão é *instrutor(es) · local*, no papel e na tela. *Alternativa: o local antes do instrutor.*
- **D-15** — A aba vai em `?acompanhamento=` (avisa o servidor: a de avaliações é lida só quando aberta).
- **D-16** — Na aba Avaliações: **Semana prevista** = a semana do curso do **término previsto da disciplina** (a janela
  da carga — a prova costuma fechar a disciplina); **Semana lançada** = a semana do curso da data lançada; **Semana
  aplicada** = a lançada, quando a data já chegou (até o fim da semana mostrada); **TA** = o tempo da avaliação do
  currículo (o arbitrado, se houver), ou *—*. A situação é a do quadro de avaliações, com a referência no fim da semana
  mostrada. *Alternativa: a semana prevista pelo início da disciplina.*
- **D-17** — APOINST e Palestras: a aba existe e diz *"Em breve"*, sem consulta.
- **D-18** — A regra nova vai como **RD-9** em `regras-do-dsa-lancamento.md` e como **nota datada na `RN-INST-04`** do
  documento 04 (só no `.md`; o `.docx` não recebe emenda).

### Session 2026-10-31 (ajustes da conferência)

Decisões adotadas por padrão — **Bernardo confere no fim**.

- **D-19** — A regra "uma opção só → o campo some e ela vem escolhida" vale para qualquer categoria de atividade, não só o
  EI (hoje só o EI tem um tipo). *Alternativa: só o EI.*
- **D-20** — A planilha de contingência mantém todas as linhas do regime (é formulário de preencher à mão). *Alternativa:
  cortar também na planilha.*
- **D-21** — O papel da semana em alteração continua o publicado (RP-9): os adicionais salvos na alteração aparecem no
  papel ao *Publicar alteração*. Nada muda nessa regra.
- **D-22** — "Há altura" = `instrutores ≤ 2 × tempos − 2` (cada tempo comporta duas linhas curtas; título, tópico e TA
  ocupam duas). No cartão de 1 tempo, a linha dos instrutores leva também o TA e o local. O layout novo vale também no
  *Reimprimir* das versões antigas (o conteúdo do retrato não muda, só a arrumação). *Alternativa: medir a altura no
  navegador.*
- **D-23** — A aba Avaliações perde também a coluna TA (o pedido listou as quatro colunas); a disciplina aparece no
  começo da célula da avaliação. *Alternativa: manter o TA.*
- **D-24** — O ajuste vale **só na linha** (situação e datas); a contagem do quadro, a projeção e os alertas de vista
  seguem o lançado. *Alternativa: o ajuste também mudar as contagens e os alertas.*
- **D-25** — Na tabela, sem `UPDATE` nem `DELETE` para quem usa a tela (sem policy e sem privilégio); o gatilho recusa
  reescrever inclusive para a `service_role`; o `DELETE` da `service_role` fica, como em toda tabela, para as amostras de
  teste (as FKs são `restrict`).

