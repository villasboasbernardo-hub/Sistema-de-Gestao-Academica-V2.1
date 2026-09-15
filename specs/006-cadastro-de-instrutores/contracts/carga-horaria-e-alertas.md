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
