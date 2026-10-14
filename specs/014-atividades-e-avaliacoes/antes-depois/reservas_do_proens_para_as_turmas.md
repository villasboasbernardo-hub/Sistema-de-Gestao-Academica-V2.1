# Antes/depois — `20261014060056_reservas_do_proens_para_as_turmas.sql`

Medido em 14/10/2026 03:02 no banco **local** (`supabase_db_ciaara-11-v2-1`), restaurado da cópia `remoto-20261014-021627.sql`, com as migrations anteriores do ramo aplicadas. A migration rodou numa transação **desfeita** (ROLLBACK): nada ficou gravado.

**Aprovação de Bernardo:** [pendente]


## Reservas do PROENS (origem, por curso)

**Antes**

| codigo | curso | ano | tipo_reserva | tempos_reservados |
|---|---|---|---|---|
| RES-000001 | CAHO | 2026 | TAD | 6 |
| RES-000002 | CAHO | 2026 | TR | 121 |
| RES-000003 | C-Ap-HN | 2026 | TAD | 5 |
| RES-000004 | C-Ap-HN | 2026 | TR | 16 |
| RES-000005 | C-Ap-FR | 2026 | TAD | 5 |
| RES-000006 | C-Ap-FR | 2026 | TR | 89 |
| RES-000007 | C-Espc-HN | 2026 | TAD | 3 |
| RES-000008 | C-Espc-HN | 2026 | TR | 100 |
| RES-000009 | C-Espc-FR | 2026 | TAD | 0 |
| RES-000010 | C-Espc-FR | 2026 | TR | 7 |
| RES-000011 | (genérica) | 2026 | TAD | 2 |
| RES-000012 | (genérica) | 2026 | TR | 0 |


**Depois**

| codigo | curso | ano | tipo_reserva | tempos_reservados |
|---|---|---|---|---|
| RES-000001 | CAHO | 2026 | TAD | 6 |
| RES-000002 | CAHO | 2026 | TR | 121 |
| RES-000003 | C-Ap-HN | 2026 | TAD | 5 |
| RES-000004 | C-Ap-HN | 2026 | TR | 16 |
| RES-000005 | C-Ap-FR | 2026 | TAD | 5 |
| RES-000006 | C-Ap-FR | 2026 | TR | 89 |
| RES-000007 | C-Espc-HN | 2026 | TAD | 3 |
| RES-000008 | C-Espc-HN | 2026 | TR | 100 |
| RES-000009 | C-Espc-FR | 2026 | TAD | 0 |
| RES-000010 | C-Espc-FR | 2026 | TR | 7 |
| RES-000011 | (genérica) | 2026 | TAD | 2 |
| RES-000012 | (genérica) | 2026 | TR | 0 |


## Previsto do PROENS por turma (destino)

**Antes**

| turma | categoria | tempos_previstos | origem_migracao_v1 |
|---|---|---|---|


**Depois**

| turma | categoria | tempos_previstos | origem_migracao_v1 |
|---|---|---|---|
| C-Ap-FR 2026 | TAD | 5 | spec014-D3:RES-000005 |
| C-Ap-FR 2026 | TR | 89 | spec014-D3:RES-000006 |
| C-Ap-HN 2026 | TAD | 5 | spec014-D3:RES-000003 |
| C-Ap-HN 2026 | TR | 16 | spec014-D3:RES-000004 |
| C-Espc-FR 2026 | TAD | 0 | spec014-D3:RES-000009 |
| C-Espc-FR 2026 | TR | 7 | spec014-D3:RES-000010 |
| C-Espc-HN 2026 | TAD | 3 | spec014-D3:RES-000007 |
| C-Espc-HN 2026 | TR | 100 | spec014-D3:RES-000008 |
| CAHO 2026 | TAD | 6 | spec014-D3:RES-000001 |
| CAHO 2026 | TR | 121 | spec014-D3:RES-000002 |


## Reserva genérica em config_parametros

**Antes**

| chave | valor | ano_vigencia | natureza |
|---|---|---|---|


**Depois**

| chave | valor | ano_vigencia | natureza |
|---|---|---|---|
| proens.reserva_generica_tad | 2 | 2026 | normativo |
| proens.reserva_generica_tr | 0 | 2026 | normativo |


## Linhas na trilha do previsto

**Antes**

| linhas_na_trilha |
|---|
| 0 |


**Depois**

| linhas_na_trilha |
|---|
| 10 |


## Eventos da D-3 em migracao_log

**Antes**

| eventos |
|---|
| 0 |


**Depois**

| eventos |
|---|
| 1 |
