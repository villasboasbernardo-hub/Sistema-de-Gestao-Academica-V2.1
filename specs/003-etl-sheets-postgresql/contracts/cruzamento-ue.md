# Contrato — o cruzamento que recupera a Unidade de Ensino

**Fase 1** · 2026-09-07 · fonte: decisão de Bernardo de 07/09/2026 · [research.md §R-5](../research.md)

## Por que isto é contrato, e não detalhe de implementação

Este cruzamento **atribui significado a dado histórico**. Uma linha casada errado não produz erro:
produz um registro de aula apontando para a Unidade de Ensino errada, que vai alimentar CHD, CHT,
tetos normativos e a LIQ — e que ninguém vai questionar, porque estará preenchida. **Erro que
preenche é pior que erro que falha.**

Por isso as regras abaixo são fechadas, e o que não se encaixa nelas **não casa**.

## A chave

Bernardo autorizou `Turma + Data + Disciplina`. **Ela não é aplicável como escrita**, e a razão está
medida em [research.md §R-5](../research.md):

> A planilha da v1.0 **não tem turma**. Tem a sigla do **curso**, em `B1` da aba `PREENCHIMENTO`.

Nos cursos com uma turma no ano, curso e turma coincidem. Mas **quatro cursos rodam duas turmas no
mesmo ano com janelas distintas** (documento 30 §5.2) — e neles, cruzar por curso **casa a linha na
turma errada**. É precisamente o defeito que a reconciliação por somatório de TA por turma (FR-010)
existe para pegar. Melhor não produzi-lo.

**A chave efetiva, em três passos:**

| Passo | O que faz |
| --- | --- |
| 1 | `curso_sigla` (da planilha) → **curso** da v2.0 |
| 2 | **curso + `data` do lançamento** → **turma**, pela janela de datas da turma. Se a data cair na janela de **duas** turmas do mesmo curso, o lançamento é **ambíguo** e não casa |
| 3 | `turma + data + disciplina` → registro de aula da v2.0, na staging |

O passo 2 é o que a autorização não previu, e é o que impede o casamento errado.

## O desempate — e o que não é desempate

O cruzamento é **de muitos para um**: 7.421 lançamentos para 1.566 registros.

| Situação | Veredito | UE |
| --- | --- | --- |
| Todos os lançamentos que casam apontam **a mesma** UE | `casado` | resolvida |
| Apontam **UEs diferentes** | `ambiguo` | **nula**, reportado nominalmente |
| A data cai na janela de **duas turmas** do mesmo curso | `ambiguo` | **nula**, reportado |
| Nenhum lançamento casa | `sem_fonte` | **nula**, reportado |
| Curso sem planilha (17 deles) | `fora_de_cobertura` | **nula**, **esperado** |
| Código **não é disciplina** (`AD`·`FE`·`PL`·`TR`·`TE`·`LP`) | `nao_aplicavel` | **nula**, **esperado** — não há UE a procurar |

**O que MUST NOT ser usado como desempate**, em nenhuma hipótese:

- a UE **mais frequente** entre os lançamentos que casam — frequência não é evidência;
- a UE do lançamento **mais próximo** em data ou em ordem;
- a **primeira** UE encontrada;
- qualquer heurística de "provavelmente é esta".

Todas produzem preenchimento com aparência de dado. A regra é: **na dúvida, nulo e relatório.**

## Normalização do número de UE *(08/09/2026)*

`unidades_ensino.numero_ue` é **`smallint`**. A planilha grava valores como **`1P`** — 210 ocorrências
só no `C-AP-FR`, o segundo valor mais comum da coluna.

**Regra:** o sufixo alfabético marca a **parte prática da mesma UE**. Normaliza-se para o número
(`1P` → `1`), e o sufixo vai para `migracao_log` como proveniência. Nada se perde e nada se inventa.

**Cabeçalho repetido:** a aba repete o cabeçalho a cada seção — `COD` aparece como *valor* 36 vezes
no `C-AP-FR`. Essas linhas são descartadas na extração, e o descarte é **contado** no relatório.
Cabeçalho lido como dado vira lançamento fantasma.

## Os seis códigos que não são disciplina

`AD` (181) · `FE` (42) · `LP` (17) · `TR` (13) · `TE` (9) · `PL` (8) — **270 linhas só no `C-AP-FR`**.

São atividade não letiva ou evento de calendário: **não têm UE por natureza**. Recebem
`nao_aplicavel` e ficam **fora** do cruzamento.

**Por que não `sem_fonte`:** `sem_fonte` afirma *"procurei e não achei"* — e não é verdade. Usá-lo
aqui poluiria o relatório com **270 falsos negativos por arquivo**, e quem lesse concluiria que o
cruzamento falhou onde ele nem devia tentar. `nao_aplicavel` diz o que houve: *não havia o que
procurar*.

## As fontes

**Autorizadas** — abas `PREENCHIMENTO` e `BD DISCIPLINAS` de:

| Arquivo | Curso |
| --- | --- |
| `C-AP-FR 2026.xlsx` | C-Ap-FR |
| ~~`C-AP-HN 2026.xlsx`~~ | ~~C-Ap-HN~~ — **NÃO usar** (A-2 fechado) |
| `CAHO_2026.xlsx` | CAHO — **entra como fonte de transporte** (08/09/2026) |
| `C-ESPC-HN 2026.xlsx` | C-Espc-HN |
| `Cópia de C-AP-HN 2026 - Sabado.xlsx` | C-Ap-HN — **a autoritativa** |
| `ESPC-FR 2026.xlsx` | C-Espc-FR |
| `C-ESP-ME 2026.xlsx` | C-ESP-ME |
| `C-EXP-METOC-OF T01_26.xlsx` | C-Exp-METOC-OF |

**Sobre a CAHO — a distinção que sustenta a decisão.** Em 07/09 a instrução foi excluí-la do
cruzamento; em 08/09 Bernardo esclareceu que o "CAL 2026" da autorização **era ela**, e que entra
**como fonte de transporte**. Não há conflito com a regra de 10/08/2026, porque os papéis são
distintos:

| Papel | CAHO 2026 |
| --- | --- |
| **Fonte de dado a transportar** | ✅ autorizada (08/09/2026) |
| **Padrão-ouro de não regressão** | 🚫 **rejeitada** (10/08/2026) — e a rejeição **não foi reaberta** |

Transportar dela é transporte. Comparar contra ela seria validação — e essa segue proibida (X-1).

**A-1 encerrado:** não existe planilha "CAL 2026"; era a `CAHO_2026.xlsx`.
**A-2 encerrado:** para o C-Ap-HN vale **apenas** a `Cópia de C-AP-HN 2026 - Sabado.xlsx`.

## Invariantes

- **X-1**: fonte de dado **não é** padrão-ouro de validação. Nenhuma planilha usada aqui valida
  coisa alguma; a não regressão continua por invariante estrutural e matemática (FR-015, FR-025.5).
  Confundir os dois é o defeito que a decisão de 10/08/2026 existe para impedir.
- **X-2**: toda UE recuperada MUST registrar **arquivo, aba e linha** de origem (FR-025.6). UE sem
  proveniência é UE inventada.
- **X-3**: o que **não casou** MUST ser gravado com seu veredito, não apenas omitido. A ausência é o
  que alguém vai querer explicar depois.
- **X-4**: `fora_de_cobertura` **não é divergência** e MUST NOT bloquear o corte — são os 17 cursos
  sem fonte, e isso é o esperado. `ambiguo` e `sem_fonte` **entram no relatório** e exigem leitura
  humana.
- **X-5**: o cruzamento acontece **na staging**, antes da promoção — porque `registros_aula` não tem
  `disciplina_id` e a UE é `NOT NULL` (research §R-1, §R-2). Não há como enriquecer depois.
- **X-6**: as planilhas da v1.0 **nunca** são versionadas. Protegidas no `.gitignore` em 07/09/2026,
  antes de qualquer commit. O repositório é público.

## Cobertura final

**7 arquivos · 7 cursos · 1.270 UEs · 7.421 lançamentos.** Dos 24 cursos, **17 ficam sem fonte** e
seus registros vão para `fora_de_cobertura`, com Unidade de Ensino nula — o que o `CHECK` da migration
da R-1 admite, por ser histórico migrado.

**Nenhum achado aberto.** A-1 e A-2 foram fechados em 08/09/2026.
