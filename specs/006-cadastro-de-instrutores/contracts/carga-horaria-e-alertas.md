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

**Pendência registrada em 15/09/2026 — a semanal do instrutor.** A decisão (b) define a média
semanal **de uma disciplina**. Não diz como compor a semanal **do instrutor** que tem várias
disciplinas no mesmo ano, em janelas que podem ou não se sobrepor — somar as médias do ano, ou somar
só as das disciplinas abertas em cada semana e comparar a pior semana, dão alertas diferentes. O
alerta do `FR-016`, a coluna `ta_previsto_semanal` e o `SC-006` esperam essa resposta.

| Coluna ou view | Estado em 15/09/2026 |
|---|---|
| `vw_instrutor_carga_prevista` — uma linha por atribuição ativa: ano, tempos do instrutor, semanas, média semanal | ✅ implementável: tudo acima está escrito |
| `vw_instrutor_carga_anual.ta_previsto_ano` — soma dos tempos das atribuições do ano | ✅ implementável |
| `vw_instrutor_carga_anual.ta_previsto_semanal` | ⏸️ espera a pendência acima |

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
| `obrigatorio-pendente` | Campo obrigatório pendente | algum dos cinco do `RN-INST-03` vazio, nulo ou só com espaços |

⚠️ **Correção registrada em 15/09/2026: o segundo aviso encontra 15 instrutores na base real.** A
redação anterior dizia que ele não encontraria ninguém, porque os cinco obrigatórios seriam
`NOT NULL`. **Não são**: o Épico 2 tirou o `NOT NULL` de `esp_hab_obs` (migration `20260908084000`),
porque 15 dos 177 instrutores não têm sufixo de especialidade, e Bernardo ratificou em 08/09/2026. O
`CHECK` de branco aceita o nulo. ⚠️ **Conflito aberto, não resolvido aqui**: o `RN-INST-03` manda
exigir especialidade/habilitação, e o esquema da tela a exige — então salvar a ficha de um desses 15
é recusado.

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

**Gráficos — exatamente 9**:

| # | Gráfico | Forma | Regra |
|---|---|---|---|
| 1 | Status de Seleção | barras | habilitados e selecionados em **duas cores**; título da spec 021 |
| 2 | Classificação | pizza | coluna `categoria`, rótulos da v2.0: `Militar da Ativa` → Militares da Ativa, `TTC` → TTC, `SCNS` → Civis, `MMN` → Magistério Militar Naval (spec 014, `data-model.md`); valor fora do mapa aparece como está |
| 3 | Posto/graduação | barras | antiguidade; "Outros" no fim (`FR-026.3`) |
| 4 | OM | barras | |
| 5 | Escolaridade | pizza ⏸️ | **pendência**: 6 categorias no dado real, e o documento 23 §7 limita a pizza a 5. Fica em barras até a decisão |
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

**Legenda clicável** (`FR-026.6`): ⏸️ **pendência** — não há descrição do comportamento nas specs da
herança.
