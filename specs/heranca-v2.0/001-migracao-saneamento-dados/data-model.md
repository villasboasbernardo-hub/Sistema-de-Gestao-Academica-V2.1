# Data Model — Épico C: Migração e Saneamento da Base de Dados

O modelo físico completo já está documentado em `docs/arquitetura/01-schema.md` (23 abas, já
aplicado à planilha de trabalho). Este documento cobre **só o delta** que esta feature altera —
as colunas/linhas tocadas pelos 3 achados residuais e pela pendência operacional. Para qualquer
entidade não listada aqui, `01-schema.md` é a referência autoritativa e nada muda.

## `instrutor_disciplina` (alterada)

| Coluna | Tipo | Mudança |
|---|---|---|
| `ID_Grade` | TEXTO (FK) | Linha `VIN-000419` (`ID_Instrutor=86`): valor esvaziado (era `"40 - C-Ap-FR - XVII"`, referência que nunca existiu em `disciplinas`). Demais 797 linhas inalteradas. |
| `ID_Grade_Legado_v1` | TEXTO | **NOVA**, opcional. Preserva o valor bruto original só na linha corrigida (`C-07`) — vazia em todas as outras 797 linhas. |
| `Status` | ENUM(`Ativo`,`Inativo`) | Inalterado — `VIN-000419` já estava `Inativo` antes desta correção; permanece assim. |

**Invariante nova**: nenhuma linha `Ativo` de `instrutor_disciplina` pode ter `ID_Grade` vazio (uma
habilitação ativa sem disciplina não faz sentido, RN-INST-01); linhas `Inativo` podem, como este
caso único.

## `instrutores` (alterada)

| Coluna | Tipo | Mudança |
|---|---|---|
| `Posto_Graduacao` | TEXTO | 2 linhas (`ID_Instrutor` referente a "CAMPOS"/118 e "JONATHAS"/164): `U+00B0` → `U+00BA` (`"2°SG"` → `"2ºSG"`, `"1°SG"` → `"1ºSG"`). 6 linhas (`ID_Instrutor` 17–22, `Categoria = "SCNS"`): `"SC"` mantido como está (não é erro — ver decisão abaixo), mas passa a ser um valor **reconhecido** pela escala de antiguidade em vez de rejeitado. |

**Extensão de regra (não é coluna nova, é regra de leitura)**: a escala de peso derivada de
`Posto_Graduacao` (RN-ANT-02, hoje só documentada em `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md`
e replicada em `tests/unidade/regras_de_negocio.test.ts`) ganha uma 13ª entrada:

| Posto/Graduação | Peso |
|---|---|
| CMG | 1 |
| CF | 2 |
| CC | 3 |
| CT | 4 |
| 1ºTen | 5 |
| 2ºTen | 6 |
| SO | 7 |
| 1ºSG | 8 |
| 2ºSG | 9 |
| 3ºSG | 10 |
| CB | 11 |
| MN | 12 |
| **SC** (`Categoria = "SCNS"`, civil) | **13** — NOVO, decisão de esclarecimento 2026-08-14 |

## `avaliacoes` (alterada)

| Coluna | Tipo | Mudança |
|---|---|---|
| `ID_Avaliacao` | TEXTO (PK) | 77 linhas `AVL-M00001`..`AVL-M00077` renumeradas para `AVA-####`, continuando a sequência existente (não reinicia em 1). Demais 111 linhas inalteradas. |
| `Origem_Execucao_v1` / `Conciliacao_Migracao` | TEXTO / ENUM | Inalteradas — já documentam a proveniência dessas 77 linhas (`Execucao_Orfa`); o ID deixa de precisar repetir essa informação no próprio valor. |

## `atividades_nao_letivas` (alterada)

| Coluna | Tipo | Mudança |
|---|---|---|
| `ID_Evento` | TEXTO (PK) | 1 linha `EVT-M00001` renumerada para `EXT-####`, continuando a sequência existente. Demais 663 linhas inalteradas. |

## `arquivo_avaliacoes_v1` (alterada)

| Coluna | Tipo | Mudança |
|---|---|---|
| `ID_Avaliacao_Destino` | TEXTO (FK→`avaliacoes.ID_Avaliacao`) | As 77 linhas que apontavam para `AVL-M#####` são atualizadas para o novo `ID_Avaliacao` (`AVA-####`) correspondente, na mesma operação que renumera `avaliacoes` — nunca uma referência quebrada entre quarentena e tabela ativa. |

## `responsaveis_curso` (pendência operacional, sem mudança de schema)

Nenhuma coluna muda. A linha semente `Papel_Assinatura = Encarregado_Divisao` (`ID_Curso = GERAL`)
tem `Nome_Guerra`/`Posto_Graduacao` = `"[A PREENCHER]"` — dado nominal real, não uma decisão técnica.
Esta feature **não inventa** esse dado; ou fica preenchido com a informação real fornecida pelo
responsável antes do go-live, ou permanece como pendência explícita e visível (o próprio
`tests/unidade/reconciliacao_migracao.test.ts` já trata isso como aviso, não falha — `t.diagnostic`, não
`assert`).

## `migracao_log` (recebe linhas novas, schema inalterado)

Cada correção acima gera 1 linha nova por registro corrigido (não uma linha por script):

| `Acao` | Origem | Quantidade de linhas novas |
|---|---|---|
| `Corrigido` | Achado 1 (vínculo órfão) | 2 (ver nota) |
| `Corrigido` | Achado 2 (símbolo de grau) | 2 |
| `Corrigido` | Achado 3 (renumeração `avaliacoes`) | 77 |
| `Corrigido` | Achado 3 (renumeração `atividades_nao_letivas`) | 1 |

Total real: **82 linhas novas** (408 → 490), todas com `Regra_Aplicada` citando o `RN-`/`FR-`
correspondente e `Valor_Antes`/`Valor_Depois` preenchidos — nenhuma linha das 408 pré-existentes
foi tocada.

**Nota de execução (2026-08-14).** O achado 1 gerou 2 linhas em vez de 1: a primeira execução de
`corrigir_vinculo_orfao_instrutor_disciplina.py` tinha um bug (openpyxl trata
`cell(..., value=None)` como "nenhum valor informado", não como "limpar a célula" — precisa
`cell(...).value = None`), então gravou uma linha de log dizendo `Corrigido` sem ter de fato
esvaziado `ID_Grade`. Em vez de reescrever essa linha (proibido, Princípio IV), o script corrigido
gravou uma segunda linha registrando a correção real — mesmo padrão de "logar a correção como novo
evento, nunca reescrever o passado" já usado pelo projeto para a própria renomeação P-14.
