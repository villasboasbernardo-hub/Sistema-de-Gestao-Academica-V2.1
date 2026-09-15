# Contrato — as duas cargas horárias e os alertas que elas alimentam

**Fase 1** · 11/09/2026 · `FR-014` a `FR-018`, `SC-002`, `SC-006` · `RN-INST-04` **[AMPLIADA]**,
`RN-2027-06`, `RN-DEG-02`

> **Carga horária é lida, nunca digitada.** Um número de CH escrito à mão é a origem de toda
> divergência entre o sistema e a realidade.

---

## As duas grandezas

| Grandeza | O que é | Fonte | Estado |
|---|---|---|---|
| **Ministrada no ano** | o que já foi dado | `registros_aula` + `avaliacoes`, em `vw_instrutor_carga_anual.ta_ministrado_ano` | ✅ existe desde o Épico 1 |
| **Prevista** | o que está atribuído | `turma_disciplina_instrutor.ch_prevista_tempos` | ⬜ **nunca foi somada por instrutor** |

⚠️ **Medido em 11/09/2026: nenhuma view do schema agrega CH prevista por instrutor.** A única que
cita `ch_prevista` é `vw_unidades_ensino_execucao`, e ela agrega por unidade de ensino.

**Consequência que a spec não nomeia:** o `FR-016` compara a **semanal prevista** contra a faixa do
regime. Sem a prevista, **o alerta não tem o que comparar** — a US4 inteira fica sem chão. A faixa
já está na view desde o Épico 1 (`faixa_semanal_min`, `faixa_semanal_max`): **existe denominador e
falta numerador**, e é por isso que esse alerta nunca pôde ser escrito.

---

## O que a fatia acrescenta

Estender `vw_instrutor_carga_anual` com duas colunas derivadas:

| Coluna | Definição |
|---|---|
| `ta_previsto_ano` | soma de `ch_prevista_tempos` das atribuições **ativas** do instrutor no ano |
| `ta_previsto_semanal` | a derivação semanal que o `FR-016` compara |

⚠️ **VIEW, nunca coluna gravada.** O `FR-015` proíbe campo de CH digitável e o projeto proíbe segunda
fonte de verdade. Gravar o total seria as duas violações na mesma linha.

⚠️ **A view nova repete o `revoke`** de `delete`, `truncate`, `insert` e `update` — o do Épico 1 é
foto do momento, e toda view nova nasce com eles de volta.

### T011 — a fórmula da prevista, registrada em 15/09/2026

**Decisão de Bernardo**, nas quatro perguntas da T011: *(decisão de Bernardo Villas Boas, 15/09/2026)*

| # | Pergunta | Resposta |
|---|---|---|
| (a) | conversão de tempo de aula em hora | **1 tempo de aula ≈ 1 hora** nesta fatia. A duração exata do tempo é definida no currículo de cada curso; os casos de exceção — tempo reduzido por mudança de regime no dia — ficam para épico futuro |
| (b) | o divisor que torna a prevista semanal | **média simples**: tempos previstos da disciplina ÷ semanas entre a data de início prevista e a data de término prevista da disciplina. Exemplo: 40 tempos em 4 semanas = 10 por semana. A distribuição real, com encaixe de agenda entre vários instrutores, é feature futura |
| (c) | qual data põe uma atribuição num ano | a **data de início prevista** da disciplina |
| (d) | se os limites da faixa são inclusivos | **inclusivos**: exatamente 8h ou 12h, no regime de 20h, está dentro e não alerta; menos de 8 ou mais de 12 alerta |

**O que já estava escrito e completa a resposta, sem nada inventado:**

| Ponto | Regra escrita | Onde |
|---|---|---|
| Quanto da disciplina cabe a cada instrutor | **modo dividido** reparte a carga entre os designados; **modo simultâneo** dá a carga integral a cada um | `RN-MAT-05` (documento 04), `RF-MATERIAS-06` |
| Rateio declarado × não declarado | `turma_disciplina_instrutor.ch_prevista_tempos` preenchido vale; **nulo divide igualmente** | comentário da coluna, migration `20260829233423` |
| De onde vem o modo | o do vínculo de habilitação; `herdar` resolve no `modo_atribuicao_padrao` da disciplina | comentário de `instrutor_disciplina.modo_atribuicao` |
| Quantas semanas tem a janela | `disciplinas.semanas` = `floor((término − início) / 7) + 1`, coluna gerada | migration `20260829233423` |
| A média simples da disciplina | `disciplinas.ch_semanal` = carga ÷ semanas, coluna gerada, "média informativa, **não** a distribuição semanal" | idem; a distribuição é `RN-DIST-01`, fora desta fatia |

⚠️ **As datas de `turma_disciplina` coincidem com as da disciplina** nas 89 linhas preenchidas da
base real (medido em 15/09/2026), e a decisão diz "da disciplina": a fonte é `disciplinas`.

⚠️ **Atribuição sem data de início prevista não tem ano**, e por isso não entra em ano nenhum. Não é
zero escondido: a view de atribuições a mostra com `ano` nulo.

### A semanal do instrutor — decisão de 15/09/2026

*(decisão de Bernardo Villas Boas, 15/09/2026)*

> A carga semanal do instrutor numa semana é a **soma das médias semanais das atribuições ativas cuja
> janela prevista** (início e término previstos da disciplina) **cobre aquela semana**. Semana sem
> atribuição nenhuma não entra no cálculo nem gera alerta. O alerta do `FR-016` dispara quando
> **alguma** semana coberta sai da faixa do regime — limites inclusivos — e a mensagem nomeia a semana.

🛑 **Somar as médias do ano inteiro é PROIBIDO.** Criaria alerta para quem nunca passou da faixa em
semana nenhuma: duas disciplinas de 10 h por semana, uma em março e outra em agosto, somariam 20 h.

| Ponto | Como ficou |
|---|---|
| Semana | **ISO 8601, de segunda a domingo**. A herança não define outro início; o projeto já usa semana ISO (documento 20, consolidação do DSA; documento 25, `?semana=`) |
| Janela cobre a semana | quando tem ao menos um dia dentro dela |
| Onde é calculada | `lib/dominio/carga-semanal.ts`, função pura, sobre as linhas de `vw_instrutor_carga_prevista` |
| Atribuição sem janela ou sem média | não entra em semana nenhuma |
| Sem faixa (regime não informado) | não há o que comparar, e não há alerta |
| Semanas avaliadas na ficha | ✅ **Decidido em 15/09/2026 (CHK005)** *(decisão de Bernardo Villas Boas, 15/09/2026)*: **todas** as semanas ISO do **ano corrente** cobertas por atribuição ativa — inclusive as já passadas, e inclusive a parte do ano corrente de uma janela que começou no ano anterior. O ano da semana é o **ano ISO** (o da quinta-feira): a semana 1 de 2026 vai de 29/12/2025 a 04/01/2026, e a de 28/12/2026 a 03/01/2027 é a 53 de 2026. `limitesDoAnoIso` e `semanasDoAno`, em `lib/dominio/carga-semanal.ts`. *(Substitui a leitura aplicada anterior, que avaliava só as atribuições com início no ano corrente.)* |
| A faixa de um ano só tocado pela janela | `vw_instrutor_carga_anual` passa a ter linha em **todo ano que a janela prevista toca** (`previsao_inicio - 3` a `previsao_termino + 3`, por causa da quinta-feira ISO), e não só nos anos de fato e de início. Sem isso, a janela vinda do ano anterior não teria faixa e o alerta calaria. `ta_previsto_ano` continua pela data de início; o ano só tocado tem previsto zero. Guardado pelo pgTAP `094`, asserção 16 |
| A seção de carga da ficha | lista as atribuições **com início no ano corrente** (T011 c), como antes; a consulta traz também as janelas que tocam o ano, e só o alerta as usa |
| Mensagem | `Semana 12/2026 (16/03 a 22/03): 14 h, acima da faixa de 8 a 12 h.` — uma linha por semana fora |

⚠️ **Consequência da decisão, registrada para não surpreender**: `disciplinas.semanas` conta blocos
de sete dias a partir do início previsto, e a semana ISO começa na segunda. Uma janela que começa numa
quarta pode tocar **uma semana ISO a mais** do que `semanas` conta; a média é a mesma em todas elas.

| Coluna ou view | Estado em 15/09/2026 |
|---|---|
| `vw_instrutor_carga_prevista` — uma linha por atribuição ativa: ano, tempos do instrutor, semanas, média semanal | ✅ implementável: tudo acima está escrito |
| `vw_instrutor_carga_anual.ta_previsto_ano` — soma dos tempos das atribuições do ano | ✅ implementável |
| `vw_instrutor_carga_anual.ta_previsto_semanal` | **não é coluna**: a semanal é por semana, calculada no domínio; o pgTAP `094` confere a ausência |

---

## A faixa do regime — o erro que parece certo

| Regime | Faixa |
|---|---|
| 20h | **8 – 12 h** |
| 40h | **16 – 24 h** |
| Dedicação Exclusiva | **16 – 30 h** |

🛑 **O teto é a FAIXA, jamais o número do regime** (`RN-2027-06`).

Um instrutor de **40h com 20h previstas está DENTRO** — 20 cai em 16–24. Quem comparar contra o
número do regime vai achar que ele está com folga de 20 horas e não alertará nada; quem comparar
contra o teto da faixa vai alertar um caso saudável. **Os dois erros são silenciosos**, e é por isso
que o `SC-006` fixa os dois lados:

| Caso | Esperado |
|---|---|
| 40h com 20h previstas | **não** alerta |
| 20h com 14h previstas | **alerta** |
| nenhum dos dois | é impedido de coisa alguma |

---

## Os alertas avisam, **nunca** bloqueiam

`FR-018`, sob o `RN-DEG-02`: **regra normativa vira alerta, nunca bloqueio.**

| Alerta | Gatilho | Requisito |
|---|---|---|
| Fora da faixa | `ta_previsto_semanal` fora de `[faixa_min, faixa_max]` | `FR-016` |
| Sem capacitação didática | docência iniciada há **mais de um ano** e `capacitacao_didatica` vazia | `FR-017` |

🛑 **Nunca transformar em `CHECK`, em policy que nega, ou em botão desabilitado.** Transformá-los em
impedimento **muda a regra de negócio** e exige autorização nominal do Bernardo.

⚠️ **"Desabilitar o botão de salvar enquanto houver alerta" é a forma que esse erro costuma tomar.**
Parece cuidado e é mudança de regra.

---

## Zero campo digitável (`FR-015`, `SC-002`)

A contagem de campos de CH editáveis em **todo** o sistema é **zero** — e a escrita por fora da tela
é recusada.

| Camada | Como se prova |
|---|---|
| Tela | varredura: nenhum `input`/`select` ligado a CH em formulário algum |
| Fora da tela | a grandeza é **view**; não há coluna para gravar |

⚠️ **A segunda linha é a que torna a primeira verificável.** Enquanto a CH for derivada, "recusar
escrita" não é uma regra que alguém precise lembrar de aplicar: **não existe onde escrever.**

⚠️ **"Permitir ajuste manual" é pedido plausível e é proibido.** Ele reaparece como "só um campo de
observação numérica" — e é o mesmo campo.

---

## Os quatro indicadores e os sete gráficos

A lista é **fechada** (`FR-026`, `FR-026.2`, `SC-007.1`). Contagem exata, não "aproximadamente".

### Indicadores — exatamente 4

1. Total de instrutores
2. Instrutores com capacitação didática — conta quem tem o campo **não vazio**
3. CH total ministrada no ano
4. Taxa de seleção — **habilitados × selecionados**

⚠️ **Selecionados NÃO é subconjunto de habilitados.** A v2.0 mediu **10 casos reais** de instrutor
selecionado sem vínculo de habilitação ativo. Os **dois valores absolutos aparecem sempre**, e o
percentual é secundário (`FR-026.1`). Forçar o menor dos dois, ou esconder um percentual acima de
100%, **apagaria justamente a inconsistência que o número existe para revelar**.

### Gráficos — exatamente 7, e as barras de posto seguem a antiguidade

1. Habilitados × selecionados
2. Classificação — coluna `categoria`
3. **Posto/graduação** — barras **sempre em ordem de antiguidade**, sem posição fixa na tela
4. OM
5. Escolaridade
6. Regime de trabalho
7. Capacitação didática

**Correção registrada em 15/09/2026**: esta lista punha posto/graduação "sempre primeiro". Passa a seguir a ordem da spec 014 da v2.0 e o `FR-026.2` emendado: a antiguidade governa as **barras** do gráfico, não a posição dele. *(decisão de Bernardo Villas Boas, 15/09/2026)*

🛑 **Ordenação alfabética é PROIBIDA no gráfico de posto/graduação** — está escrito assim na spec 014
da v2.0.

⚠️ **Posto fora do domínio conhecido vai para uma faixa "Outros" ao final, nunca é omitido em
silêncio** (`FR-026.3`, Princípio V). Sumir com a barra é como um dado errado deixa de ser notado.

⚠️ **No gráfico de capacitação, quem tem duas qualificações conta em ambas as barras; quem tem o
campo vazio não conta em nenhuma** (`FR-026.4`). A soma das barras **não** é o total de instrutores,
e isso é correto — quem "corrigir" para fechar a soma quebra o requisito.

⚠️ **Os gráficos vêm do Épico 4 (b)** — `components/graficos/`, com a moldura que **recusa** oito
séries em vez de avisar. Sete gráficos, nenhum deles com mais de sete séries.

---

## O quadro de avisos de qualidade de cadastro (`FR-027`, `RF-INSTR-09`)

**Registrado em 15/09/2026** (T060): a lista de avisos é **aberta e extensível**, e não um conjunto fechado. *(decisão de Bernardo Villas Boas, 15/09/2026)*

> *"O sistema deve exibir um quadro de avisos de qualidade de cadastro (ex.: instrutores sem NIP ou
> com campos obrigatórios pendentes)."* — `RF-INSTR-09`, **[PRESERVADO]**

### A lista começa por dois avisos

| Chave | Aviso | Quando um instrutor entra nele |
|---|---|---|
| `sem-nip` | Instrutor sem NIP | `nip` vazio, nulo ou só com espaços |
| `obrigatorio-pendente` | Campo obrigatório pendente | posto, especialidade, nome completo, categoria ou OM vazio, nulo ou só com espaços |
| `sem-data-docencia` | Data de início de docência não informada | `data_inicio_docencia_ciaara` vazia **e** capacitação didática vazia — no lugar do alerta do `FR-017` (decisão de Bernardo Villas Boas, 15/09/2026). O recorte "e capacitação vazia" é **decisão** desde 15/09/2026 (CHK004), não mais leitura |

⚠️ **Correção registrada em 15/09/2026: o aviso de campo obrigatório pendente encontra 15 instrutores
na base real.** A primeira redação desta seção dizia que ele não encontraria ninguém, porque os cinco
obrigatórios seriam `NOT NULL` — e não são: o Épico 2 tirou o `NOT NULL` de `esp_hab_obs` (migration
`20260908084000`), porque 15 dos 177 não têm sufixo de especialidade.

**Decisão de 15/09/2026** *(decisão de Bernardo Villas Boas, 15/09/2026)*: os 15 são **todos militares** — 12 da ativa e 3 do Magistério Militar
Naval, nenhum civil. Especialidade/habilitação ficou **opcional** na tela (emenda ao `RN-INST-03` e ao
`FR-005`), e a ficha desses 15 voltou a salvar. O aviso **continua cobrando** a especialidade desses
militares. Nenhuma delimitação para civil foi registrada, porque nenhum civil está sem o campo.

**Alerta do `FR-017` com data vazia** *(decisão de Bernardo Villas Boas, 15/09/2026)*: não dispara — sem data não há como contar o ano —, e o
aviso `sem-data-docencia` entra no quadro no lugar dele. Na base real, 176 dos 177 instrutores estão
sem a data, e 148 deles também sem capacitação: são esses 148 que o aviso lista.

**O recorte passou a ser decisão, e deixou de ser inferência (CHK004)** *(decisão de Bernardo Villas Boas, 15/09/2026)*: o aviso
cobra **apenas** quem está sem a data **e também** sem capacitação didática registrada. Quem já tem
capacitação nunca dispararia o alerta do `FR-017`, então cobrar a data dessa pessoa seria ruído. Até
esta decisão, o recorte estava registrado como leitura aplicada de "em lugar do alerta", a confirmar.

### Como a lista cresce

A lista é **dado**: cada aviso é uma regra com `chave`, `titulo` e a condição sobre um instrutor. Uma
**única função** avalia a lista inteira. Aviso novo entra acrescentando uma regra, **sem mudar o tipo
que descreve a lista** nem a função que a avalia — o teste da T067 prova isso com um terceiro aviso.

🛑 **Nunca como `enum` ou união fechada de chaves.** Fechar o tipo faria cada aviso novo exigir
mudança de contrato, que é o que a decisão de 15/09/2026 recusou.

### Como aparece

| Regra | Origem |
|---|---|
| **Sempre visível**, nunca recolhido por padrão | `RNF-USA-04` |
| Avaliado sobre **o mesmo recorte da listagem** — o filtro aplicado vale para os avisos, como vale para indicadores e gráficos | spec 015 da v2.0, `FR-016` |
| Sem aviso no recorte, o quadro **continua na tela** e diz que não há aviso | `RN-DEG-01` |
| Aviso **nunca bloqueia** nada: nenhum botão, nenhuma gravação depende dele | `RN-DEG-02` |
| O nome de cada instrutor sai por `NomeInstrutor` | `FR-019`, `FR-020` |

---

## Indicadores e gráficos — segunda emenda de 15/09/2026

*(decisão de Bernardo Villas Boas, 15/09/2026)*

**Indicadores — exatamente 3**: total de instrutores · com capacitação didática · habilitados ×
selecionados. O cartão de CH ministrada no ano sai; a CH do ano **fica** como coluna da listagem.

**Gráficos — exatamente 9, 4 de barras e 5 de pizza** (escolaridade decidida em barras em 15/09/2026):

| # | Gráfico | Forma | Regra |
|---|---|---|---|
| 1 | Status de Seleção | barras | habilitados e selecionados em **duas cores**; título da spec 021 |
| 2 | Classificação | pizza | coluna `categoria`, rótulos da v2.0: `Militar da Ativa` → Militares da Ativa, `TTC` → TTC, `SCNS` → Civis, `MMN` → Magistério Militar Naval (spec 014, `data-model.md`); valor fora do mapa aparece como está |
| 3 | Posto/graduação | barras | antiguidade; "Outros" no fim (`FR-026.3`) |
| 4 | OM | barras | |
| 5 | Escolaridade | **barras** | **decidido em 15/09/2026, não reabrir** (decisão de Bernardo Villas Boas): 6 categorias contra o limite de 5 do documento 23 §7, e 142 de 177 sem o campo, o que faria a pizza quase toda "Não informado" |
| 6 | Regime de trabalho | pizza | |
| 7 | Capacitação didática | pizza | duas qualificações contam nas duas; **"Nenhuma"** conta o campo vazio (`FR-026.4` emendado) |
| 8 | Círculo hierárquico | pizza | novo. Oficiais e Praças pelo mapa da spec 015; o posto fora do mapa (SC, e CB e MN, que a escala tem e o mapa da v2.0 não) vai para **"Outros"**, pela mesma regra do `FR-026.3` — nunca some em silêncio |
| 9 | Índice de capacitação geral | pizza | spec 021: exatamente duas fatias, "Com Capacitação Didática" e "Sem Capacitação Didática", somando o total do recorte |

| Regra visual | Por quê |
|---|---|
| Uma cor por categoria, da paleta `--serie-N`, nos dois temas | fim da cor única; o documento 23 §7 já manda a cor vir do token |
| Valor escrito em toda barra, além do eixo | rótulo direto, documento 23 §7 |
| Percentual escrito em toda pizza | documento 23 §7 |
| **Sem 3D nem perspectiva** | a pizza inclinada distorce o ângulo, e o ângulo é o percentual |
| Elevação leve no **cartão** que envolve o gráfico, pelo token `--shadow-ciaara-1` | o documento 23 §7 veda sombra **no gráfico**; o cartão já usa esse token pela tabela de equivalências do mesmo documento |

⚠️ **A pizza de capacitação didática soma mais que o total**, porque quem tem duas qualificações
conta nas duas. O percentual de cada fatia é sobre a **soma das fatias**, que é como a pizza se lê.
O índice de capacitação geral (#9) é o que soma o total de instrutores.

**Exibir/ocultar estatísticas** (`FR-026.5`): botão que recolhe e expande indicadores e gráficos,
começando recolhido, com o estado **fora da URL**.

**Legenda clicável** (`FR-026.6`): ⏸️ **parada em 15/09/2026, depois da conferência no código real da
v2.0.** `renderizarGrafico_` (`SIS11/CIAARA-11-v2/src/frontend/_Comum.html`, linhas 253 a 264) não
configura legenda nem evento, e nada em `src/frontend/` ou `appsscript/` o faz. Vira requisito novo.
