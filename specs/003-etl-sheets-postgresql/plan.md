# Implementation Plan: Épico 2 — ETL Sheets → PostgreSQL com reconciliação verificável

**Branch**: `db/003-etl-sheets-postgresql` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-etl-sheets-postgresql/spec.md`

## Summary

Levar as ~5.400 linhas da planilha da v2.0 para o PostgreSQL, **numa transação única**, com
reconciliação que bloqueia o corte quando algo não fecha — e, no caminho, **recuperar a Unidade de
Ensino** de 7 cursos cruzando com as planilhas de planejamento da v1.0, que a v2.0 nunca guardou.

O plano tem três frentes, nesta ordem obrigatória:

1. **Destravar o schema** — duas migrations: a aditiva de P-6 e a que torna a UE anulável sob
   `CHECK` (R-1). Nada de carga antes disso: a primeira falharia por `NOT NULL`.
2. **O transporte da v2.0** — o pipeline de cinco etapas do documento 30, escrito do zero (R-6), com
   a área de staging textual que torna a reconciliação uma comparação entre duas tabelas do mesmo
   motor.
3. **A recuperação da UE** — etapa 1-B, paralela à extração, convergindo na staging (R-7). É trabalho
   **novo**, que os documentos 30 e 31 não preveem.

**A restrição que molda o plano:** o risco aqui não é volume — são 5.400 linhas, a transação custa
segundos. O risco é **silêncio**: tipo mal convertido, data deslocada em um dia, linha que trocou de
turma na resolução de chave. Todos passam despercebidos na contagem. Por isso a etapa de staging não
é opcional e a reconciliação por somatório de TA por turma é o que decide o corte.

## Technical Context

**Language/Version**: Python 3.14 (medido nesta máquina) para o ETL — decisão do BRIEF §1 e do
documento 30 §1.3. SQL para migrations e reconciliação.

**Primary Dependencies**: `openpyxl` 3.1.5 (já instalado — leitura dos `.xlsx` da v1.0) · biblioteca
de acesso ao PostgreSQL · API do Google Sheets para a extração da v2.0. **Sem ORM** (Princípio III).

**Storage**: PostgreSQL local via Supabase CLI em Docker — **decisão de Bernardo (Q3, 07/09/2026)**.
Nenhum dado real sai da máquina enquanto a CIAARA-14.2 não decidir. Schema de destino: 27 tabelas do
Épico 1, já aplicadas.

**Testing**: pgTAP para as invariantes de reconciliação (é onde as três identidades aritméticas e o
somatório por turma vivem) · Vitest não se aplica — não há `lib/dominio/` nesta fatia · Playwright não
se aplica — não há tela.

**Target Platform**: linha de comando, na máquina do operador. **Não é código de aplicação**: nada
disto roda por requisição de tela.

**Project Type**: pipeline de dados em lote, com ponto de entrada único.

**Performance Goals**: não há. A base é pequena e a transação custa segundos (documento 30 §4).
Otimizar aqui é resolver problema inexistente. O que se exige é **reexecutabilidade por etapa**
(FR-007), não velocidade.

**Constraints**: transação única, sem estado parcial alcançável · o ETL roda com a chave
administrativa **sem sessão autenticada**, e as duas armadilhas que isso produz já estão
diagnosticadas (documento 30 §3) · `migracao_log` é append-only por gatilho, **inclusive para a chave
administrativa** · nenhuma planilha vira padrão-ouro de não regressão (FR-025.5) · as planilhas da
v1.0 **nunca** são versionadas (FR-025.4).

**Scale/Scope**: 25 tabelas · ~5.400 linhas · 1.566 registros de aula · 7.421 lançamentos da v1.0
para cruzar · 7 cursos com fonte de UE, **17 sem**.

## Constitution Check

*GATE: avaliado antes da Fase 0 e reavaliado após a Fase 1.*

| # | Princípio | Veredito | Justificativa |
| --- | --- | --- | --- |
| I | Fidelidade à Fase 1 | ✅ **Passa** | Todo FR cita origem no documento 06 §Épico 2, no 30, ou em decisão datada de Bernardo. **Achado:** o documento 30 §13 lista P-7 como bloqueante e ela **já está resolvida** (R-3) — divergência registrada, não contornada |
| II | Preservação de Regras de Negócio | ✅ **Passa** | O épico **transporta**, não reinterpreta (FR-003). Nenhuma `RN-` é tocada |
| III | Restrição de Plataforma | ✅ **Passa** | Python para ETL é o que o BRIEF §1 determina. Sem ORM |
| IV | Integridade do Histórico | ✅ **Passa, e é o eixo do épico** | `migracao_log` íntegro e continuado (FR-004); `codigo` verbatim (FR-002); rastro do cruzamento gravado (FR-025.6) |
| V | Degradação Segura | ✅ **Passa** | Registro que não casa fica com UE nula e é **reportado** (FR-025.2) — degradação com aviso, nunca exceção. A tensão com o `NOT NULL` foi resolvida em 08/09 pelo `CHECK` que confina o nulo ao histórico migrado |
| VI | Mudança Cirúrgica | ✅ **Passa** | Três frentes com ordem obrigatória, cada uma fechando em commit próprio. A prova é por invariante, nunca por diff com curso (FR-015) |
| VII | Configuração Sobre Constante | ✅ **Passa** | A ordem de carga tem **uma única definição** no repositório (FR-016) |
| VIII | Rastreabilidade | ✅ **Passa** | Cada UE recuperada diz de qual arquivo, aba e linha veio (FR-025.6) |
| IX | Contenção de Escopo | ⚠️ **Escopo ampliado, com autorização nominal** | O cruzamento com a v1.0 **não estava previsto** nos documentos 30/31. Autorizado por Bernardo em 07/09/2026, registrado na spec §Consequência de escopo |
| X | Paridade Antes de Novidade | ✅ **Passa** | Zero funcionalidade nova. É transporte |
| XI | O Banco é a Fronteira | ✅ **Passa, e cobra** | É o `NOT NULL` do banco que expõe o conflito da R-1 — exatamente o que este princípio existe para fazer. A fronteira funcionou antes de a primeira linha ser escrita |

**Gate: PASSA.** Nenhuma pendência bloqueante. A R-1 foi decidida em 08/09/2026 e a tensão do
Princípio IX (escopo ampliado) tem autorização nominal e data. Nada foi contornado.

### Reavaliação após a Fase 1

**Gate: continua passando.** O desenho não introduziu violação nova. Três observações que o
`/speckit-tasks` precisa carregar:

1. **A chave de cruzamento pedida não é aplicável como escrita.** Bernardo autorizou
   `Turma + Data + Disciplina`; a planilha da v1.0 **não tem turma**, só curso (R-5). Nos 4 cursos que
   rodam duas turmas no mesmo ano, cruzar por curso casa na turma errada. O desenho resolve
   desambiguando pela **janela de datas da turma** antes do casamento — e o que continuar ambíguo
   **não casa**, por FR-025.2.
2. **O cruzamento é de muitos para um.** 7.421 lançamentos contra 1.566 registros. Quando os
   lançamentos que casam apontarem **UEs diferentes**, a regra é **não casar e reportar** — nunca
   escolher a mais frequente.
3. **P-7 saiu do escopo** (R-3): já resolvida no Épico 1. A migration desta fatia cobre só P-6.

## Project Structure

### Documentation (this feature)

```
specs/003-etl-sheets-postgresql/
├── spec.md
├── plan.md              ← este arquivo
├── research.md          ← R-1 a R-7, tudo medido
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── pipeline.md          # as 6 etapas, seus artefatos e o que reexecuta
│   ├── cruzamento-ue.md     # a chave, o desempate e o que faz o registro NÃO casar
│   └── reconciliacao.md     # as consultas que bloqueiam o corte
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```
scripts/etl/
├── executar.py                  # ponto de entrada ÚNICO — cinco etapas, uma transação
├── _comum.py                    # promoção staging→public, resolução de FK, log
├── ordem.py                     # a ÚNICA definição da ordem de carga (FR-016)
├── extrair_sheets.py            # etapa 1   — v2.0, pela API
├── extrair_ue_v1.py             # etapa 1-B — v1.0, dos .xlsx locais (NOVO)
├── cruzar_ue.py                 # etapa 2-B — casa v1.0 × v2.0 (NOVO)
├── tabelas/                     # um módulo por tabela, na ordem do documento 30 §4
└── dados/
    ├── bruto/                   # artefatos das etapas 1 e 1-B — NUNCA versionados
    ├── normalizado/
    └── relatorio_divergencia.md

supabase/
├── migrations/
│   └── <ts>_p6_turma_disciplina_instrutor.sql    # P-6 (R-4)
│   └── <ts>_ue_anulavel_no_historico.sql         # R-1 — autorizada 08/09
└── tests/
    └── 090_reconciliacao_etl.sql                 # invariantes que bloqueiam o corte
```

**Structure Decision**: o ETL vive em `scripts/etl/`, fora de `app/` e de `lib/` — não é código de
aplicação e não roda por requisição. Segue o documento 24 §1 e o documento 30 §5.1. Os dois módulos
novos (`extrair_ue_v1.py`, `cruzar_ue.py`) são a materialização do escopo ampliado e ficam
**nomeadamente separados**, para que se veja num `ls` o que é transporte e o que é recuperação de UE.

## Complexity Tracking

| Desvio | Por que é necessário | Alternativa rejeitada |
| --- | --- | --- |
| **Segunda fonte de dado (v1.0)**, fora dos documentos 30 e 31 | É a única forma de recuperar a UE sem inventá-la. Autorizado nominalmente por Bernardo em 07/09/2026 | Deixar tudo nulo (rejeitado por Bernardo); UE sintética (vetada) |
| **Etapa 1-B paralela**, em vez de enriquecimento pós-carga | `unidade_ensino_id` é `NOT NULL` (R-1): não há linha para enriquecer depois — a UE precisa estar resolvida antes do `INSERT` | `UPDATE` após a promoção |
| **Migration que afrouxa `NOT NULL`** (se a saída A da R-1 for escolhida) | Sem ela, os 17 cursos sem fonte não têm como ser migrados, e o FR-001 cai | Não migrar esses cursos (viola o critério 1 do documento 06) |
| **Escrita do zero, sem reaproveitar `migracao/*.py`** | Os scripts **não estão nesta máquina** (R-6), ainda que o documento 06 os pressuponha | Bloquear o épico até localizá-los |
