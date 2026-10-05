# Como a operação lança o DSA hoje — a prática da planilha

> **Transcrição das seções 1.1 a 1.4 do levantamento de Bernardo Villas Boas, 05/10/2026**, medido
> em **15 planilhas** exportadas (`Cursos Regulares/`, `Cursos Especiais-*/`, retrato de
> 08/09/2026, fora do git) e nos **PDFs assinados**.
>
> ⚠️ **ESTE ARQUIVO EXISTE PORQUE A FONTE É EFÊMERA.** As planilhas estão no Drive e os PDFs em
> pasta; nenhum dos dois é versionado. Depois do corte, **isto é a única descrição do que a
> operação fazia** — e é contra isto que a paridade da `RNF-COMP-01` se confere. Nada aqui é
> requisito: é **estado do mundo**. O que vira requisito está na `spec.md`, com identificador.

---

## 1.1 Como a operação lança hoje [MEDIDO em 15 planilhas]

**P-1.** Cada planilha tem as abas **PREENCHIMENTO** (entrada), **ESPELHO** (cálculo),
**IMPRESSÃO** (o DSA), **BD DISCIPLINAS** (catálogo do que pode ser lançado), **HORÁRIOS**,
**TECNICA DE ENSINO**, **CONTROLE** e **CRONOS**; os cursos HN têm ainda **RESPONSÁVEIS** e **DATAS
AVALIAÇÕES**; o CAHO tem **CORREÇÕES CAC** e **PROTOTIPO**.

**P-2.** O operador digita **DUAS células por Tempo de Aula**: **COD** (algarismo romano da
disciplina, ou uma sigla de duas letras para o que não é disciplina) e **Nº U.E.** São **9 linhas
fixas por dia**, segunda a sexta. **TUDO o mais é derivado**: tópico, local, técnica de ensino
(T/E), instrutor, horário e quantidade de TA do bloco saem de BD DISCIPLINAS pela chave **COD+UE**.
TA consecutivos com a mesma chave viram **UM bloco** na impressão.

> ⚠️ **ESSE É O ESFORÇO A IGUALAR OU BATER: duas escolhas por bloco.** É daqui que sai o `SC-009`
> da spec — no máximo quatro decisões, com instrutor, técnica e local chegando preenchidos.

**P-3.** **BD DISCIPLINAS** é, por turma, o catálogo de **itens lançáveis**: as Unidades de Ensino
numeradas e, **na mesma coluna de UE**, os itens de avaliação (PM1, PP, PO, PE, OD, TI, TG, AV1…),
as vistas de prova (VP1…), visitas técnicas da disciplina (VT), trabalhos (T) e o **LHFC**. Cada
item tem CH, LOCAL, T/E e INSTRUTOR, mais CH CONCLUÍDA, CH RESTANTE e uma situação **por item**:
**AGUARDANDO INÍCIO**, **FALTA** (lançou menos que a CH), **CONCLUÍDO** (igual) e **PASSOU** (lançou
mais). O operador acompanha a execução **no grão de UE**, não só no de disciplina.

**P-4.** **O DSA É EMITIDO ANTES DA SEMANA.** Em 05/10/2026 todas as planilhas ativas já estavam
preenchidas até 09 ou 10/10. Quando a semana muda, sai uma **ALTERAÇÃO numerada**: o campo
**"ALT Nº"** vai de 0 a 4 e é diferente de zero na **maioria** das semanas de vários cursos. A
planilha guarda **só a última versão**; as anteriores sobrevivem como PDF em pasta — **210 PDFs em 5
cursos, 94 deles com "ALT" no nome**.

**P-5.** Existe um **segundo documento**, o **"DETALHE SEMANAL DE AULAS (REPOSIÇÃO)"**: aulas de
reposição para **aluno específico**, **fora da grade** (ex.: 15:40 às 17:15, rodapé "1 ALUNO"), com
**outro par de assinaturas**. No CAHO há **oito** PDFs desses em 2026.

**P-6.** O **"Nº"** do DSA é **sequencial por turma** (o C-Ap-HN estava no **13** em 06/07/2026). A
aba CRONOS **pula** a numeração numa semana sem aula; a aba PREENCHIMENTO **não pula**. **As duas
contagens divergem.**

**P-7.** Há **AULA AOS SÁBADOS**: a planilha vigente do C-Ap-HN tem **oito sábados** lançados com
**5 TA** cada (22/08 a 10/10/2026), enxertados **à mão** no bloco da semana. O `Dsa.gs` da v2.0 só
conhece **segunda a sexta**.

---

## 1.2 O documento impresso, como ele é [MEDIDO nos PDFs assinados]

Uma página **A4 paisagem**.

**Cabeçalho:** `CIAARA` | `CENTRO DE INSTRUÇÃO E ADESTRAMENTO ALMIRANTE RADLER DE AQUINO`; depois
**sigla do curso** | `DETALHE SEMANAL DE AULAS Nº <n>` | `SEMANA DE <data> A <data>`.

**Colunas, nesta ordem:**

| Coluna | Conteúdo |
|---|---|
| **DIA** | data e dia da semana, **uma vez por dia** |
| **HORÁRIO** | início **"as"** fim **do BLOCO** |
| **DISCIPLINA** | o código (algarismo romano) |
| **`<n>` TA** | quantidade de tempos do bloco |
| **UNIDADES DE ENSINO E TÓPICOS** | o número da UE e o tópico |
| **LOCAL** | **por linha** |
| **T/E** | a **sigla** da técnica de ensino |
| **INSTRUTOR/PROFESSOR** | nome, no formato da `RF-INSTR-15` |

**Última linha de cada dia, fixa:** `ESTUDO INDIVIDUAL`, T/E `EI`, **sem instrutor**.

**Rodapé:**

- `Gerado em: <data hora>`;
- a nota `*É FACULTADO AO ALUNO PERMANECER A BORDO PARA ESTUDO INDIVIDUAL.`;
- `ALT <n>` quando houver;
- `<n> ALUNOS`;
- tabela **CÓD. | DISCIPLINA | CH. PREVISTA | CH. CUMPRIDA**, **só das disciplinas que aparecem
  naquela semana**;
- legenda **"TÉCNICAS DE ENSINO"**, **só com as siglas usadas naquela semana**;
- **duas assinaturas** com nome completo, posto e função — **à esquerda** o **Auxiliar** da Div. de
  Adm. Acadêmica (**muda por curso**), **à direita** o **Encarregado** da Div. de Adm. Acadêmica.

**Em avaliação:** a coluna do instrutor traz o nome seguido de **"(FISCAL)"**, e o T/E traz o **tipo**
(PM, PP, PO, PE, TI, TG, OD).

---

## 1.3 Peculiaridades por curso [MEDIDO]

### As duas grades de relógio REAL — e nenhuma começa às 08:00

| Grade | TA | Intervalo | Manhã | Tarde |
|---|---|---|---|---|
| **G45** | 45 min | **5 min** | 07:50-08:35 · 08:40-09:25 · 09:30-10:15 · 10:20-11:05 · 11:10-11:55 — **cinco TA** | 13:05-13:50 · 13:55-14:40 · 14:45-15:30 · 15:35-16:20 |
| **G50** | 50 min | **10 min** de manhã, **5 min** à tarde | 08:10-09:00 · 09:10-10:00 · 10:10-11:00 · 11:10-12:00 — **quatro TA** | 13:05-13:55 · 14:00-14:50 · 14:55-15:45 · 15:50-16:40 |

### Curso por curso

| Curso | Semanas / janela | Disciplinas | Grade e TA | Particularidades medidas |
|---|---|---|---|---|
| **CAHO** | 46 · 05/01 a 20/11 | 21 | G45, 8 TA + Estudo Individual **15:40-16:25** como 9º | siglas AD, FE, TR, PL; **T/E combinada** (`EO/AP`, `TG/TI`); aluno estrangeiro (*"PORTUGUÊS PARA ESTRANGEIROS"* lançado como **AD**); **DSA de reposição**; **ALT até 3** |
| **C-Ap-HN** | 37 · 13/04 a 25/12 | 18 | G45, **9 TA em parte dos dias e 8 em outros** + Estudo Individual **16:25-17:20** | **SÁBADOS**; siglas TR, **FR (feriado)**, NT (formatura/treinamento), LP, LA, EC, PL; controle de prazo de vista na aba DATAS AVALIAÇÕES |
| **C-Ap-FR** | 37 | 13 | G45, 8 ou 9 TA | siglas AD, FE, LP, **TE (estudo)**, PL, TR e **"12"** (palestras da DOEP) |
| **C-Espc-HN** | 46 · 12/01 a 27/11 | 14 | G50, 7 TA + EI **15:50-16:40** no 8º, **ou** 8 TA + EI **16:45-17:35** | siglas AD, LP, FR, EC, TR, PL, EI, **BDF** (reforço de TFM); embarques (local **"H36"**). ⚠️ **CURRÍCULO POR COMPETÊNCIAS** |
| **C-Espc-FR** | 46 | 17 | G50, 8 TA | siglas AD, FE, TR, LP, PL, TE, VT, BDF, "12" — e aqui ⚠️ **"FR" significa FAROL, não feriado**; **34 itens com MAIS DE UM instrutor** na mesma aula (`A / B`); muito local externo (CAMR, MACAÉ, ILHA DE SANTANA, H36). ⚠️ **CURRÍCULO POR COMPETÊNCIAS** |
| **C-Esp-ME** | 21 | 14 | G50, 8 TA | FE, LP, LA |
| **Expeditos de 5 semanas** — C-Exp-METOC-OF, C-Exp-OBS-ME T1 e T2, C-Exp-AG-MAG, C-Exp-BATI | 5 | — | 7 a 9 TA, **as duas grades** conforme a turma | siglas AD, FE, LP, AE, VT, DO e **"30"** (Depto. de Alunos); local **"LAB INFO"** e **"EAD"** (atividade assíncrona) |
| **C-ApA-OcOp-PR-SP** (semipresencial) | — | — | 5 dias, 8 TA | ⚠️ **o DSA cobre SÓ a semana presencial** |
| **Sem planilha no Drive** | — | — | — | os estágios `EST-QF-*`, `C-Esp-ALH`, `C-Esp-OpAP`, `C-ApA-AuxNav` e os **EAD puros** |

### ⚠️ As siglas de duas letras NÃO são um vocabulário

A mesma sigla **muda de sentido entre planilhas**:

- **FR** = feriado (C-Ap-HN) **ou** farol (C-Espc-FR);
- **TR** = tempo reserva, trabalho, visita, monitoria, DeCAT, APOINST;
- **AD** = administração, estudo individual, licença de pagamento, aula de reforço, cerimônia.

**Feriado, Licença de Pagamento e Licença Administrativa são digitados TA a TA, como se fossem
aula.**

A coluna **INSTRUTOR é texto livre**: posto + nome + OM de origem (`2ºTEN (RM2-T) CARDOSO (HNMD)`),
entidade (`CIAARA-30`, `DOEP`, `NAS`, `INSTRUTORES DO Ap-HN`) ou palestrante externo.

A **T/E usa SIGLA** — `EO`, `AP`, `EI`, `TG`, `TI`, `PP`, `PM`, `PO`, `PE`, `OD` — enquanto a lista
"Metodologias" do banco está **por extenso**.

> ⚠️ **É daqui que vem a proibição mais fácil de infringir por descuido:** a spec **não** reproduz
> essas siglas como entrada do operador. Elas são **saída** (a coluna T/E do papel e a legenda do
> rodapé) e, como vocabulário de entrada, são ambíguas por medição.

---

## 1.4 Os defeitos que o sistema tem de tornar impossíveis [MEDIDO]

| # | O defeito | A medição |
|---|---|---|
| **D-1** | Fórmula quebrada em massa | A inspeção da **CAC** registrou **11.918 erros de fórmula** na planilha do CAHO antes da correção: um bloco inteiro da IMPRESSÃO lendo **uma linha acima** do ESPELHO; `DATEVALUE` aplicado a número (**10.842 erros em cascata**); intervalo de `VLOOKUP` truncado; total de CH **congelado em 16** por 46 semanas |
| **D-2** | Erro **visível no documento** | `#REF!`, `#N/A`, `ERROR! VRF BD DISCIPLINA` e `VERIFICAR Nº DE TA` na IMPRESSÃO de **10 das 15** planilhas, e **1.620 a 4.500** `#REF!` no ESPELHO de **cinco** delas |
| **D-3** | Bloco que atravessa o almoço | Sai como **UM horário contínuo** (`09:30 as 13:50` para 4 TA) — **64** ocorrências no CAHO e **50** no C-Espc-FR |
| **D-4** | Atributo no lugar errado | Instrutor, local e técnica são atributo **DO ITEM do catálogo**, não do lançamento: **trocar o instrutor de uma UE reescreve todo DSA passado** |
| **D-5** | Futuro contado como feito | A "CH cumprida" é `COUNTIF` sobre a aba inteira: **conta semana futura já planejada como cumprida** |
| **D-6** | Chave sem par, e chave em dobro | Lançamento cuja chave COD+UE **não existe** no catálogo (**24 TA** no C-Espc-FR) e chave **DUPLICADA** no catálogo — o `VLOOKUP` pega a primeira, **em silêncio** — em **três** planilhas |
| **D-7** | Assinatura à mão | Digitada em **cada semana**, com nome e posto **divergindo entre semanas** |
| **D-8** | Erro de cópia entre planilhas | A de `C-EXP-OBS-ME T2/2026` traz no cabeçalho a sigla `C-Exp-METOC-OF`; a `DSA C-ESPC-HN 2027` ainda tem as **datas de 2026**; `Nº DE ALUNOS: ASD` |
| **D-9** | Numeração e horário incoerentes | `SEMANA 0` no bloco cujo DSA é o **Nº 1**; linha do **9º tempo sem horário** no CAHO |

### O de-para dos nove defeitos para o que impede cada um

| Defeito | O que o torna impossível na v2.1 | Onde está escrito |
|---|---|---|
| D-1, D-2 | não há fórmula: o cálculo é função pura com teste, e a ausência de dado tem **frase própria** | `SC-013` |
| D-3 | o horário do bloco é derivado **com quebra no almoço** | `SC-011` |
| D-4 | instrutor, local e técnica são **coluna da linha de lançamento**, e o catálogo só dá o valor inicial | `SC-012`, e `estado-atual.md` §5 |
| D-5 | depende da resposta da **`Q-2`** — e **não** de reinterpretar a `RN-CRONOS-01` | `Q-2` |
| D-6 | FK composta `reg_aula_ue_do_curso` já recusa UE de outro curso; a chave não é digitada | `estado-atual.md` §2.4 |
| D-7 | a assinatura resolve de `responsaveis_curso` pela vigência **na data da semana** | `FR-DSA-04x`, critérios 2 e 3 |
| D-8 | não há cópia: a sigla, as datas e o efetivo saem do cadastro da turma | `SC-013` |
| D-9 | depende da **`Q-3`** (número e ALT) e da `Q-6` (o 9º tempo sem horário é a divergência de catálogo) | `Q-3`, `Q-6` |

---

## O que esta transcrição NÃO autoriza

⚠️ **Nada aqui é regra de negócio.** Em particular:

1. **O modelo de horário da planilha fica fora.** Ela ancora no **fim do dia** (tabela "quantidade
   de TA → faixa"); a `RN-CONF-02` manda ancorar no **início**, e diz literalmente que *"uma
   reescrita não deve «corrigir» isso portando o modelo antigo"*. O que as planilhas trazem de útil
   é o **relógio real** — que é **dado**, não modelo.
2. **As siglas de duas letras não entram como entrada.**
3. **A classificação da planilha não prevalece sobre a `RN-EVT-01`.** Exemplo medido: *"PORTUGUÊS
   PARA ESTRANGEIROS"* é lançado como **AD** na planilha do CAHO e a regra o põe em **Estudo
   Individual** (*"inclui também Monitoria e Português para Estrangeiros"*). **A regra prevalece**
   (regra 1 do `CLAUDE.md`), e a reclassificação é visível para quem opera.
4. **O "PASSOU" do catálogo é alerta, nunca bloqueio** (`RN-DEG-02`): lançar acima da CH da UE
   sinaliza e grava.
