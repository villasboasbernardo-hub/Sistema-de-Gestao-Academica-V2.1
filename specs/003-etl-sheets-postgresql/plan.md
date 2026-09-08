# Implementation Plan: Épico 2 — ETL Sheets → PostgreSQL com reconciliação verificável

**Branch**: `db/003-etl-sheets-postgresql` | **Date**: 2026-09-07, **revisto em 2026-09-08** | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-etl-sheets-postgresql/spec.md`

> **Revisão de 08/09/2026.** A spec passou de **34 para 57 requisitos** depois do `/speckit-clarify` e
> do checklist de integridade. **Onze deles mudam o desenho**, não só a redação — consolidados em
> _O que a revisão mudou no desenho_, abaixo. O plano de 07/09 continua válido no essencial: as três
> frentes, a ordem obrigatória e a estrutura de arquivos não mudaram.

## Summary

Levar as ~5.400 linhas da planilha da v2.0 para o PostgreSQL, **numa transação única**, com
reconciliação que bloqueia o corte quando algo não fecha — e, no caminho, **recuperar a Unidade de
Ensino** de 7 cursos cruzando com as planilhas de planejamento da v1.0, que a v2.0 nunca guardou.

Três frentes, nesta ordem obrigatória:

1. **Destravar o schema** — duas migrations: a aditiva de P-6 e a que torna a UE anulável sob `CHECK`
   com catraca (R-1). Nada de carga antes disso: a primeira falharia por `NOT NULL`, e falharia
   **tarde**, depois de 16 tabelas já promovidas dentro da transação.
2. **O transporte da v2.0** — o pipeline do documento 30, escrito do zero (R-6), com a área de
   staging textual que torna a reconciliação uma comparação entre duas tabelas do mesmo motor.
3. **A recuperação da UE** — etapa 1-B, paralela à extração, convergindo na staging (R-7). Trabalho
   **novo**, que os documentos 30 e 31 não preveem.

**A restrição que molda o plano:** o risco aqui não é volume — são 5.400 linhas e a transação custa
segundos. O risco é **silêncio**: tipo mal convertido, data deslocada em um dia, linha que trocou de
turma na resolução de chave. Todos passam despercebidos na contagem. Por isso a staging não é
opcional, e a reconciliação por somatório de TA por turma é o que decide o corte.

## O que a revisão de 08/09 mudou no desenho

Onze requisitos com efeito de projeto, não só de texto:

| #   | Requisito                                                                | Efeito no desenho                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **FR-006** — checksum por `md5()`, excluindo `id` e o quarteto de auditoria | O módulo de reconciliação ganha uma **função de checksum canônica**, usada por todas as tabelas. Sem a exclusão a idempotência seria insatisfazível: `id` vem de `gen_random_uuid()` e os carimbos vêm de gatilho |
| 2   | **FR-006** — idempotência sobre o **snapshot**, não sobre a planilha viva | O snapshot vira **objeto de primeira classe**, com identidade própria, e não efeito colateral da extração                                                                              |
| 3   | **FR-007.1** — etapa recusa artefato de snapshot que não corresponda      | Cada artefato de `dados/` carrega o **identificador do snapshot** que o gerou, e cada etapa o confere na entrada                                                                       |
| 4   | **FR-006.1** — `migracao_log` fora da idempotência                        | A comparação de checksums **pula** essa tabela por lista explícita, não por acidente                                                                                                   |
| 5   | **Staging truncada no início da execução seguinte**                       | Muda o **ciclo de vida**: a staging sobrevive ao fim da carga, e é isso que torna `--somente-reconciliar` executável                                                                   |
| 6   | **FR-014.1** — soma bruta do lado da origem, sem filtro de negócio        | Decide **o que** a R-02 lê de cada lado. Ver a nota abaixo                                                                                                                             |
| 7   | **FR-019** — proibida conversão de fuso sobre `date`                      | A normalização passa a ter **dois caminhos separados**: `date` como literal `YYYY-MM-DD`, `timestamptz` com `America/Sao_Paulo`. Misturá-los é como o deslocamento de um dia nasce      |
| 8   | **FR-002.1** — `origem_migracao_v1` = `<tabela_origem>:<chave_original>`  | A função de promoção em `_comum.py` **constrói** esse valor; ele deixou de ser texto livre e passou a ter formato verificável                                                          |
| 9   | **FR-011.1** — nulo em FK anulável não é órfã                             | A verificação de órfãs passa a ser **por coluna**, com a lista das anuláveis declarada. Uma verificação genérica contaria 1.566 nulos legítimos como violação                          |
| 10  | **FR-004.1** — provar o log intacto por checksum antes/depois             | Nasce uma etapa de **captura do estado do log** antes da carga                                                                                                                        |
| 11  | **FR-015.1** — lista fechada de invariantes (R-01 a R-08)                 | O módulo de reconciliação tem **conjunto fixo**; acrescentar critério de bloqueio em tempo de execução deixa de ser possível                                                           |

### A nota que o FR-014.1 exigiu

O FR-014.1 manda somar o lado da origem **"em bruto sobre o CSV extraído, sem filtro de negócio"**, e
o contrato do pipeline (P-2) diz que a staging existe para que a comparação seja **entre duas tabelas
do mesmo motor**. Parecem brigar; não brigam, e vale escrever por quê:

> **A staging _é_ o CSV, carregado verbatim como texto.** Somar a staging **sem cláusula de filtro** é
> somar o CSV em bruto. O que o FR-014.1 proíbe não é usar a staging — é aplicar, do lado da origem,
> qualquer recorte de negócio (`status`, `categoria_normativa`, exclusão de cancelados). Filtrar dos
> dois lados esconderia exatamente o erro que a R-02 existe para achar.

**Consequência de desenho:** a R-02 lê `staging.*` **sem `WHERE`**, e a conversão numérica do lado da
origem acontece **na consulta de reconciliação**, isoladamente — nunca reaproveitando a conversão da
etapa de normalização, que é justamente o que pode estar errado.

## Technical Context

**Language/Version**: Python 3.14 (medido) para o ETL — BRIEF §1 e documento 30 §1.3. SQL para
migrations e reconciliação.

**Primary Dependencies**: `openpyxl` 3.1.5 · `psycopg` 3.2.3 · `tzdata` 2024.2 (**obrigatória no
Windows**: sem ela `ZoneInfo("America/Sao_Paulo")` levanta `ZoneInfoNotFoundError`). **Sem ORM**
(Princípio III). **Sem API do Google** — ver FR-008.1.

**Storage**: PostgreSQL local via Supabase CLI em Docker — **decisão de Bernardo (Q3, 07/09/2026)**.
Nenhum dado real sai da máquina enquanto a CIAARA-14.2 não decidir. Destino: as 27 tabelas do Épico 1.

**Testing**: pgTAP para as invariantes de reconciliação e para o `CHECK` da R-1 · testes de unidade
Python para o cruzamento e para a normalização de data · Playwright e Vitest **não se aplicam**: não
há tela nem `lib/dominio/` nesta fatia.

**Target Platform**: linha de comando, na máquina do operador. **Não é código de aplicação** — nada
disto roda por requisição de tela.

**Project Type**: pipeline de dados em lote, com ponto de entrada único.

**Performance Goals**: não há. A transação custa segundos. O que se exige é **reexecutabilidade por
etapa** (FR-007) e **legibilidade do progresso** (FR-021.1) — não velocidade.

**Constraints**: transação única, sem estado parcial alcançável · o ETL roda com a chave
administrativa **sem sessão autenticada**, e as duas armadilhas disso já estão diagnosticadas
(documento 30 §3) · `migracao_log` append-only por gatilho, inclusive para a chave administrativa ·
**conversão de fuso proibida sobre `date`** (FR-019) · nenhuma planilha vira padrão-ouro de não
regressão (FR-025.5) · as planilhas da v1.0 **nunca** são versionadas (FR-025.4).

**Scale/Scope**: 25 tabelas · ~5.400 linhas · 1.566 registros de aula · 7.421 lançamentos da v1.0 para
cruzar · 7 cursos com fonte de UE, **17 sem**.

## Constitution Check

_GATE: avaliado antes da Fase 0, reavaliado após a Fase 1 e **de novo em 08/09**, após a revisão._

| #   | Princípio                     | Veredito                                | Justificativa                                                                                                                                                                                                              |
| --- | ----------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | Fidelidade à Fase 1           | ✅ **Passa**                            | Todo FR cita origem no documento 06 §Épico 2, no 30, ou em decisão datada. **Achado:** o documento 30 §13 dá P-7 como bloqueante e ela já está resolvida (R-3) — divergência registrada, correção agendada em T069           |
| II  | Preservação de Regras         | ✅ **Passa**                            | O épico transporta, não reinterpreta (FR-003). Nenhuma `RN-` é tocada                                                                                                                                                       |
| III | Restrição de Plataforma       | ✅ **Passa**                            | Python para ETL é o que o BRIEF §1 determina. Sem ORM                                                                                                                                                                       |
| IV  | Integridade do Histórico      | ✅ **Passa, e é o eixo**                | Log íntegro e continuado, agora **provado por checksum antes/depois** (FR-004.1); `codigo` verbatim; proveniência do cruzamento com arquivo, aba e linha                                                                     |
| V   | Degradação Segura             | ✅ **Passa** _(era tensão em 07/09)_    | A tensão com o `NOT NULL` foi resolvida pelo `CHECK` com catraca. E o FR-014.2 fecha o caso que faltava: reconciliação que **não consegue ler** falha nomeando, em vez de aprovar por ausência de divergência                |
| VI  | Mudança Cirúrgica             | ✅ **Passa**                            | Três frentes com ordem obrigatória. A prova é por invariante, e a **lista agora é fechada** (FR-015.1) — critério de bloqueio não se acrescenta em tempo de execução                                                         |
| VII | Configuração Sobre Constante  | ✅ **Passa**                            | A ordem de carga tem definição única (FR-016). E o FR-012 deixou de cravar literais: a identidade é a relação, o número é a linha de base                                                                                    |
| VIII| Rastreabilidade               | ✅ **Passa**                            | `origem_migracao_v1` ganhou **formato verificável** (FR-002.1) e deixou de ser texto livre                                                                                                                                   |
| IX  | Contenção de Escopo           | ⚠️ **Ampliado, com autorização nominal** | O cruzamento com a v1.0 não estava previsto nos documentos 30/31. Autorizado por Bernardo em 07/09, registrado na spec §Consequência de escopo                                                                               |
| X   | Paridade Antes de Novidade    | ✅ **Passa**                            | Zero funcionalidade nova. É transporte                                                                                                                                                                                      |
| XI  | O Banco é a Fronteira         | ✅ **Passa, e cobrou duas vezes**       | Foi o `NOT NULL` que expôs o conflito da R-1, e foram as **23 constraints `UNIQUE(codigo)`** que responderam ao CHK018. Nos dois casos o banco decidiu o que o documento não dizia                                           |

**Gate: PASSA.** Nenhuma pendência bloqueante. A única tensão (IX) tem autorização nominal e data.

**Um residual declarado, que não é violação mas é dívida:** a catraca do FR-025.8 impede que uma linha
migrada **editada** fique sem UE, mas não impede um `INSERT` novo de preencher `origem_migracao_v1` e
nascer sem ela. A trava tornou a fraude **deliberada em vez de acidental**; fechá-la exige gatilho que
distinga a sessão do ETL — **Épico 3**. Registrado em `checklists/integridade.md` §CHK023.

### Reavaliação após a Fase 1

**Gate: continua passando** nas duas avaliações — a de 07/09 e a de 08/09. O desenho não introduziu
violação nova em nenhuma delas.

**As três observações de 07/09 continuam valendo**, e migraram para onde são consultadas na hora de
implementar:

1. **A chave de cruzamento pedida não é aplicável como escrita.** A planilha da v1.0 **não tem
   turma**, só curso (R-5), e 4 cursos rodam duas turmas no mesmo ano — cruzar por curso casaria na
   turma errada. O desenho desambigua pela **janela de datas da turma**; o que continuar ambíguo não
   casa. → agora em `contracts/cruzamento-ue.md` §A chave, em três passos.
2. **O cruzamento é de muitos para um** — 7.421 lançamentos contra 1.566 registros. Quando os
   lançamentos que casam apontarem UEs diferentes, a regra é **não casar e reportar**, nunca escolher
   a mais frequente. → agora em `data-model.md` §3.3 e no contrato §O desempate.
3. **P-7 saiu do escopo** (R-3): já resolvida no Épico 1. A migration desta fatia cobre só P-6.
   → agora na linha I do Constitution Check acima.

**A quarta, nascida em 08/09:** a **conversão numérica do lado da origem** na R-02 não pode
reaproveitar a conversão da normalização — é ela que está sob suspeita. Está em *Complexity Tracking*
e na nota do FR-014.1. É o tipo de detalhe que, esquecido, faz a reconciliação aprovar o defeito que
deveria pegar.

## Project Structure

### Documentation (this feature)

```
specs/003-etl-sheets-postgresql/
├── spec.md              ← 57 requisitos
├── plan.md              ← este arquivo
├── research.md          ← R-1 a R-7, tudo medido
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── pipeline.md          # as 6 etapas, seus artefatos e o que reexecuta
│   ├── cruzamento-ue.md     # a chave, os 5 vereditos, o que NÃO casa
│   └── reconciliacao.md     # R-01 a R-08 — lista FECHADA (FR-015.1)
└── checklists/
    ├── requirements.md      # qualidade da spec — 16/16
    └── integridade.md       # qualidade dos requisitos de integridade — 36/36
```

### Source Code (repository root)

```
scripts/etl/
├── executar.py                  # ponto de entrada ÚNICO — as etapas, uma transação
├── _comum.py                    # promoção staging→public · origem_migracao_v1 · log
├── ordem.py                     # a ÚNICA definição da ordem de carga (FR-016)
├── snapshot.py                  # identidade do snapshot, conferida por cada etapa ⭐
├── extrair_v20.py               # etapa 1   — v2.0, de ARQUIVO LOCAL (sem rede) ⭐
├── extrair_ue_v1.py             # etapa 1-B — v1.0, dos .xlsx locais
├── cruzar_ue.py                 # etapa 2-B — casa v1.0 × v2.0, 5 vereditos
├── reconciliar.py               # etapa 5   — R-01 a R-08 + checksum md5 canônico ⭐
├── tabelas/                     # um módulo por tabela, na ordem do documento 30 §4
└── dados/                       # NUNCA versionado
    ├── bruto/
    ├── normalizado/
    └── relatorio_divergencia.md

supabase/
├── migrations/
│   ├── <ts>_p6_turma_disciplina_instrutor.sql    # P-6 (R-4)
│   ├── <ts>_ue_anulavel_no_historico.sql         # R-1, com catraca (FR-025.8)
│   └── <ts>_staging_etl.sql                      # staging + as 3 tabelas do cruzamento
└── tests/
    ├── 090_reconciliacao_etl.sql                 # R-01 a R-08
    └── 091_ue_anulavel.sql                       # o CHECK e a catraca
```

⭐ = **acrescentado pela revisão de 08/09.** O `snapshot.py` existe porque o FR-007.1 tornou a
identidade do snapshot obrigação de cada etapa; o `reconciliar.py` ganhou o checksum canônico do
FR-006.

**Structure Decision**: o ETL vive em `scripts/etl/`, fora de `app/` e de `lib/` — não é código de
aplicação e não roda por requisição (documento 24 §1, documento 30 §5.1). Os módulos do escopo
ampliado (`extrair_ue_v1.py`, `cruzar_ue.py`) ficam **nomeadamente separados**, para que se veja num
`ls` o que é transporte e o que é recuperação de UE.

## Complexity Tracking

| Desvio                                                       | Por que é necessário                                                                                                       | Alternativa rejeitada                                              |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Segunda fonte de dado (v1.0)**, fora dos documentos 30 e 31 | Única forma de recuperar a UE sem inventá-la. Autorizado nominalmente em 07/09                                             | Deixar tudo nulo (rejeitado); UE sintética (vetada)                 |
| **Etapa 1-B paralela**, em vez de enriquecimento pós-carga    | A UE precisa estar resolvida **antes** do `INSERT` (research R-1, R-2)                                                      | `UPDATE` após a promoção                                            |
| **Migration que afrouxa `NOT NULL`**                          | Sem ela, os 17 cursos sem fonte não entram e o FR-001 cai. Mitigada pelo `CHECK` com catraca                                | Não migrar esses cursos (viola o critério 1 do documento 06)        |
| **Escrita do zero, sem reaproveitar `migracao/*.py`**         | Os scripts **não estão nesta máquina** (R-6)                                                                                | Bloquear o épico até localizá-los                                   |
| **Dois caminhos de data na normalização** ⭐                  | `date` não tem fuso e `timestamptz` tem. Um caminho só é como o deslocamento de um dia nasce (FR-019)                       | Tratamento único "com fuso explícito", que era a redação anterior   |
| **Conversão numérica duplicada na R-02** ⭐                   | A reconciliação **não pode** reaproveitar a conversão da normalização: é ela que está sob suspeita (FR-014.1)               | Somar o valor já convertido, o que esconderia o defeito             |

## Fase 0 e Fase 1 — estado dos artefatos

**Não foram regenerados**: já existiam de 07/09 e foram **atualizados em lugar** ao longo de 08/09,
conforme as decisões entravam. O que mudou em cada um:

| Artefato                        | Revisão de 08/09                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `research.md`                   | R-1 marcada resolvida (saída A blindada); R-5 recontada com a CAHO dentro e o `C-AP-HN 2026.xlsx` fora — **7 arquivos, 1.270 UEs, 7.421 lançamentos**   |
| `data-model.md`                 | Ciclo de vida da staging corrigido (truncada no início, não descartada ao fim); §1.2 passou de pendência a decisão aplicada                             |
| `contracts/cruzamento-ue.md`    | Quinto veredito `nao_aplicavel`; normalização do `1P`; cabeçalho repetido; A-1 e A-2 encerrados                                                         |
| `contracts/reconciliacao.md`    | R-04 virou relação estrutural; R-08 ganhou a exclusão de `id`, auditoria e `migracao_log`                                                               |
| `quickstart.md`                 | **Corrigido em 08/09, depois do `/speckit-analyze`:** o V-4 listava **4 vereditos** e o contrato tem **5**. A afirmação anterior — "sem mudança" — estava errada, e era minha |
