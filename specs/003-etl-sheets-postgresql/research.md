# Pesquisa — Fase 0 · Épico 2 (ETL Sheets → PostgreSQL)

**2026-09-07** · [spec.md](./spec.md) · [plan.md](./plan.md)

Tudo abaixo foi **medido no banco vivo ou lido nos arquivos**, não deduzido dos documentos. Onde o
documento e o disco divergem, o disco venceu e a divergência está registrada.

---

## R-1 · ⛔ `registros_aula.unidade_ensino_id` é **NOT NULL** — a decisão de deixar `NULL` não cabe

**Medido:**

```
data              :: date :: NOT NULL
turma_id          :: uuid :: NOT NULL
unidade_ensino_id :: uuid :: NOT NULL      ← aqui
curso_id          :: uuid :: NOT NULL
instrutor_id      :: uuid :: ACEITA NULO
```

**O conflito, em duas frases.** A decisão **UE-1** (26/08/2026, rota (b)) pôs `registros_aula` no grão
de Unidade de Ensino, e o Épico 1 a materializou com a coluna **obrigatória** — é o que *significa*
estar no grão de UE. A decisão de **07/09/2026** manda deixar a UE **nula** nos 18 cursos sem fonte.
**As duas não podem valer ao mesmo tempo.**

**As três saídas, e o que cada uma custa:**

| # | Saída | Custo |
| --- | --- | --- |
| **A** | Migration tornando `unidade_ensino_id` **anulável** | O grão de UE deixa de ser garantido pelo banco e passa a ser convenção. É enfraquecer a UE-1 — que foi decisão estrutural, não detalhe. Toda consulta por UE passa a tratar nulo |
| **B** | Não migrar os registros dos 18 cursos | Viola o FR-001 (100% do histórico) e o critério 1 do documento 06. **Descartável de saída** |
| **C** | UE sintética por disciplina para os não cobertos | **Vetada por Bernardo em 07/09/2026**, e com razão: cria 134 UEs que ninguém escreveu em currículo nenhum |

**Recomendação: A, com a anulabilidade restrita e declarada.** Tornar a coluna anulável e acrescentar
um `CHECK` que só admita nulo quando a linha vier da migração — algo como *"`unidade_ensino_id` pode
ser nulo apenas se `origem_migracao_v1` estiver preenchido"*. Assim o grão de UE **continua obrigatório
para todo dado novo**, e o nulo fica confinado ao histórico que a v2.0 nunca registrou. A regra vira
explícita no banco em vez de virar comentário.

**Isto precisa de decisão do Bernardo antes da primeira migration.** É a única pendência bloqueante
que sobrou.

---

## R-2 · `registros_aula` **não tem `disciplina_id`** — e isso decide onde o cruzamento acontece

**Medido:**

```
id · codigo · data · turma_id · unidade_ensino_id · curso_id · instrutor_id ·
categoria_normativa · tipo_atividade · metodologia · tempos_consumidos ·
ta_inicial · ta_final · conteudo_resumo · local · observacoes · status ·
origem_migracao_v1 · (quarteto de auditoria)
```

A disciplina é alcançada **através** da UE: `unidades_ensino.disciplina_id`.

**Consequência para a chave `Turma + Data + Disciplina`.** Ela não pode ser aplicada contra
`public.registros_aula`, porque lá a disciplina só existe *depois* de a UE estar resolvida — e é
justamente a UE que se está tentando descobrir. Circular.

**Decisão:** o cruzamento acontece **na área de staging**, onde a disciplina ainda vive como o código
legado da v2.0, **antes** da promoção. A UE entra como coluna resolvida na staging, e a promoção para
`public` já recebe `unidade_ensino_id` pronto. Não é detalhe de implementação: define a etapa em que
o trabalho novo se encaixa no pipeline de cinco etapas do documento 30.

---

## R-3 · P-7 **já está resolvida** — o documento 30 §13 está desatualizado

O documento 30 §13 lista P-7 como bloqueante ("a carga falha"). **Não falha mais.** O Épico 1 aplicou
exatamente a recomendação do §6.8: a prioridade foi **promovida a coluna da disciplina**.

**Medido:** `disciplinas.prioridade_alocacao_peso` existe.

E a migration explica o porquê, no próprio comentário:

> *"`config_parametros` guarda LIMITE NORMATIVO com fundamento em norma; prioridade de alocação é
> ATRIBUTO OPERACIONAL de uma disciplina específica. Guardá-la lá era desvio de propósito da tabela,
> herdado da limitação do Sheets."*

**Efeito no escopo:** a autorização de 07/09 pedia migration para P-6 **e** P-7. Metade do trabalho
não existe. Sobra P-6.

---

## R-4 · P-6 é **real e está aberta**

**Medido — as colunas de `turma_disciplina`:**

```
id · codigo · turma_id · disciplina_id · previsao_inicio · previsao_termino ·
origem_periodo · status · origem_migracao_v1 · (quarteto de auditoria)
```

**Não há `instrutor_id` nem `ch_prevista_por_instrutor`.** Confirmado no banco vivo, não só no SQL.

*Nota de método:* o `grep` inicial encontrou `instrutor_id` na linha 1067 do arquivo de migration e
quase me fez concluir que a coluna existia. Ela é de **`responsaveis_curso`**. Foi a consulta ao
`information_schema` que decidiu. Grep em migration acha texto; só o banco diz o que existe.

**Decisão:** migration aditiva, exatamente como Bernardo autorizou. Duas colunas, FK com `restrict`
(nada é apagado neste sistema), e comentário citando o achado LIQ-1 — é a LIQ do Épico 11 que lê
dali.

---

## R-5 · As planilhas da v1.0 — estrutura confirmada arquivo a arquivo

**Ferramenta:** `openpyxl` 3.1.5, já instalado. Emite avisos de `pivotCacheDefinition` inválida em
todos os arquivos; são **inofensivos** (tabelas dinâmicas órfãs) e devem ser silenciados, não
investigados.

**`PREENCHIMENTO`** — cabeçalho na **linha 3**, dado a partir da **linha 4**:

| Coluna | Conteúdo |
| --- | --- |
| 1 | `QSA Nº` |
| 2 | `DATA` |
| 3 | `TA` (ordinal do tempo: 1º, 2º…) |
| 4 | `COD` |
| **5** | **`Nº U.E`** ← o dado que o épico veio buscar |
| 6 | `TA` (quantidade) |
| 7 | `ESPELHO DO QSA IMPRESSO` |

A sigla do curso está em **`B1`** (`SIGLA DO CURSO:`), e o número de alunos em `B2`.

**`BD DISCIPLINAS`** — cabeçalho na **linha 2**, dado a partir da **linha 3**:

`CÓD · DISCIPLINA · Nº UE · CONCATENADO · UNIDADES DE ENSINO E ASSUNTOS · CH · LOCAL · T/E ·
INSTRUTOR/PROFESSOR · CH CONCLUÍDA · CH RESTANTE · · OK/PASSOU/FALTA`

Traz o **nome da UE**, a **CH prevista**, o **local**, a **técnica (T/E)** e o **instrutor** —
material para conferência, além do número da UE.

**Contagem por arquivo** *(a CAHO consta para registro; está **excluída** por decisão de 07/09)*:

| Arquivo | Curso | UEs | Lançamentos com UE |
| --- | --- | ---: | ---: |
| `C-AP-FR 2026.xlsx` | C-Ap-FR | 154 | 1.001 |
| `C-AP-HN 2026.xlsx` | C-Ap-HN | 214 | 891 |
| `C-ESPC-HN 2026.xlsx` | C-Espc-HN | 182 | 1.313 |
| `Cópia de C-AP-HN 2026 - Sabado.xlsx` | C-Ap-HN | 215 | 1.041 |
| `ESPC-FR 2026.xlsx` | C-Espc-FR | 250 | 1.438 |
| `C-ESP-ME 2026.xlsx` | C-ESP-ME | 120 | 804 |
| `C-EXP-METOC-OF T01_26.xlsx` | C-Exp-METOC-OF | 55 | 178 |
| **Utilizável** | **6 cursos** | **1.190** | **6.666** |
| ~~`CAHO_2026.xlsx`~~ | ~~CAHO~~ | ~~294~~ | ~~1.646~~ — **excluída** |

**Duas coisas que a estrutura não resolve:**

1. **A turma não está na planilha.** Há a sigla do **curso** em `B1`, não a turma. A chave pedida é
   `Turma + Data + Disciplina`; o arquivo oferece `Curso + Data + Disciplina`. Nos cursos com **uma
   turma no ano**, os dois coincidem. Nos que rodam **duas turmas** — e o documento 30 §5.2 diz que
   **quatro cursos** rodam duas turmas no mesmo ano com janelas distintas — não coincidem, e o
   cruzamento por curso **casaria a linha na turma errada**. É o defeito que a reconciliação por
   somatório de TA por turma (FR-010) existe para pegar; melhor não produzi-lo.
2. **O grão continua diferente:** 6.666 lançamentos de tempo de aula contra 1.566 registros de sessão.
   Vários lançamentos da v1.0 casam com um registro da v2.0. A regra precisa dizer o que fazer quando
   **os lançamentos que casam apontam UEs diferentes**.

---

## R-6 · Os scripts `migracao/*.py` da v2.0 **não estão nesta máquina**

O documento 06 manda reaproveitá-los ("Reaproveita diretamente os scripts `migracao/*.py` já escritos
e validados"). Procurei em `SIS11/migracao/` e em toda a árvore do `SIS11`: **não há nenhum `.py`**.

**Decisão:** o plano assume **escrita do zero**, seguindo a estrutura do documento 30 §5, e trata o
reaproveitamento como **oportunidade**, não como premissa. Se os scripts aparecerem, o ganho é bem-vindo;
o plano não depende deles.

---

## R-7 · A extração da v1.0 não é a etapa 1 do documento 30 — é uma etapa 1-B

O pipeline do documento 30 tem cinco etapas, e a etapa 1 lê **a planilha da v2.0 pela API do Sheets**.
As planilhas da v1.0 são **arquivos locais `.xlsx`**, de outra origem, com outro formato.

**Decisão:** entram como **etapa 1-B**, paralela à 1, produzindo seu próprio artefato bruto
(`dados/bruto/ue_v1/<curso>.csv`) e sua própria normalização. Convergem na **etapa 3**, quando ambas
viram tabela de staging. Assim o pipeline continua reexecutável por etapa (FR-007), e a reconciliação
da etapa 5 pode comparar os dois lados no mesmo motor.

**Alternativa considerada e descartada:** tratar a v1.0 como enriquecimento pós-carga, com `UPDATE`
depois da promoção. Descartada porque o `unidade_ensino_id` é **NOT NULL** (R-1) — não há linha para
enriquecer depois; a UE precisa estar resolvida **antes** do `INSERT`.
