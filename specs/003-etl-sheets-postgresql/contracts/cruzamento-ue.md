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

O cruzamento é **de muitos para um**: 6.666 lançamentos para 1.566 registros.

| Situação | Veredito | UE |
| --- | --- | --- |
| Todos os lançamentos que casam apontam **a mesma** UE | `casado` | resolvida |
| Apontam **UEs diferentes** | `ambiguo` | **nula**, reportado nominalmente |
| A data cai na janela de **duas turmas** do mesmo curso | `ambiguo` | **nula**, reportado |
| Nenhum lançamento casa | `sem_fonte` | **nula**, reportado |
| Curso sem planilha (18 deles) | `fora_de_cobertura` | **nula**, **esperado** |

**O que MUST NOT ser usado como desempate**, em nenhuma hipótese:

- a UE **mais frequente** entre os lançamentos que casam — frequência não é evidência;
- a UE do lançamento **mais próximo** em data ou em ordem;
- a **primeira** UE encontrada;
- qualquer heurística de "provavelmente é esta".

Todas produzem preenchimento com aparência de dado. A regra é: **na dúvida, nulo e relatório.**

## As fontes

**Autorizadas** — abas `PREENCHIMENTO` e `BD DISCIPLINAS` de:

| Arquivo | Curso |
| --- | --- |
| `C-AP-FR 2026.xlsx` | C-Ap-FR |
| `C-AP-HN 2026.xlsx` | C-Ap-HN ⚠️ ver A-2 |
| `C-ESPC-HN 2026.xlsx` | C-Espc-HN |
| `Cópia de C-AP-HN 2026 - Sabado.xlsx` | C-Ap-HN ⚠️ ver A-2 |
| `ESPC-FR 2026.xlsx` | C-Espc-FR |
| `C-ESP-ME 2026.xlsx` | C-ESP-ME |
| `C-EXP-METOC-OF T01_26.xlsx` | C-Exp-METOC-OF |

**Excluída, por decisão de 07/09/2026:** `CAHO_2026.xlsx` — **sai do cruzamento por inteiro**. A
rejeição de 10/08/2026 permanece e não foi reaberta.

**Não localizada:** a planilha **"CAL 2026"**, mencionada na autorização, **não existe** — nem nos
três caminhos indicados, nem em `Documentos/`. Achado **A-1**, aberto. Enquanto não se esclarecer, a
CAHO segue excluída, que é a instrução explícita.

## Invariantes

- **X-1**: fonte de dado **não é** padrão-ouro de validação. Nenhuma planilha usada aqui valida
  coisa alguma; a não regressão continua por invariante estrutural e matemática (FR-015, FR-025.5).
  Confundir os dois é o defeito que a decisão de 10/08/2026 existe para impedir.
- **X-2**: toda UE recuperada MUST registrar **arquivo, aba e linha** de origem (FR-025.6). UE sem
  proveniência é UE inventada.
- **X-3**: o que **não casou** MUST ser gravado com seu veredito, não apenas omitido. A ausência é o
  que alguém vai querer explicar depois.
- **X-4**: `fora_de_cobertura` **não é divergência** e MUST NOT bloquear o corte — são os 18 cursos
  sem fonte, e isso é o esperado. `ambiguo` e `sem_fonte` **entram no relatório** e exigem leitura
  humana.
- **X-5**: o cruzamento acontece **na staging**, antes da promoção — porque `registros_aula` não tem
  `disciplina_id` e a UE é `NOT NULL` (research §R-1, §R-2). Não há como enriquecer depois.
- **X-6**: as planilhas da v1.0 **nunca** são versionadas. Protegidas no `.gitignore` em 07/09/2026,
  antes de qualquer commit. O repositório é público.

## Achados abertos

| # | Achado | Efeito se não resolvido |
| --- | --- | --- |
| **A-1** | A planilha "CAL 2026" não existe | A CAHO segue excluída — leitura conservadora |
| **A-2** | `C-AP-HN 2026.xlsx` (214 UEs, 891 lançamentos) e `Cópia de C-AP-HN 2026 - Sabado.xlsx` (215, 1.041) descrevem o **mesmo curso** e divergem | Usar os dois **duplica** lançamento e faz o C-Ap-HN cair inteiro em `ambiguo`. É preciso declarar qual manda |
