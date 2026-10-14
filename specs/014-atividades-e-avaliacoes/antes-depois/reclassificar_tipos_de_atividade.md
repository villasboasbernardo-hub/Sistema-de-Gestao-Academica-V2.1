# Antes/depois — `20261014052406_reclassificar_tipos_de_atividade.sql`

Medido em 14/10/2026 02:25 no banco **local** (`supabase_db_ciaara-11-v2-1`), restaurado da cópia `remoto-20261014-021627.sql`, com as migrations anteriores do ramo aplicadas. A migration rodou numa transação **desfeita** (ROLLBACK): nada ficou gravado.

**Aprovação de Bernardo:** [pendente]


## Tipos de atividade (categoria, uso, ativo)

**Antes**

| valor | categoria | uso | ativo |
|---|---|---|---|
| Administração | TAD | — | t |
| Atividade Extracurricular | AEC | — | t |
| Aula | — | — | t |
| Aula Prática | — | — | t |
| Aula Teórica | — | — | t |
| Avaliação | — | — | t |
| Estudo Individual | Estudo_Individual | — | t |
| Evento/Cerimônia | TAD | — | t |
| Licença de Pagamento | — | — | t |
| Monitoria | Estudo_Individual | — | t |
| Orientação de TFM | AEC | — | t |
| Palestra | AEC | — | t |
| Recuperação da Aprendizagem | TR | — | t |
| Tempo Reserva | TR | — | t |
| Visita Técnica | AEC | — | t |
| Vista de Prova | — | — | t |


**Depois**

| valor | categoria | uso | ativo |
|---|---|---|---|
| Administração | TAD | — | t |
| Apoio à Instrução | AEC | — | t |
| Atividade Extracurricular | AEC | — | t |
| Aula | — | aula | t |
| Aula Prática | — | aula | t |
| Aula Teórica | — | aula | t |
| Avaliação | — | aula | t |
| BDA | Apoio_Individualizado | — | t |
| BDF | Apoio_Individualizado | — | t |
| Estudo Individual | Estudo_Individual | — | t |
| Evento/Cerimônia | TAD | — | t |
| Licença de Pagamento | — | — | f |
| Monitoria | Apoio_Individualizado | — | t |
| Orientação de TFM | AEC | — | t |
| Palestra | AEC | — | t |
| Português para Estrangeiros | Apoio_Individualizado | — | t |
| Recepção aos alunos | TAD | — | t |
| Recuperação da Aprendizagem | TR | — | t |
| Tempo Reserva | TR | — | t |
| Visita Técnica | AEC | — | t |
| Vista de Prova | — | aula | t |


## Tipos de parada

**Antes**

| valor | rotulo_exibicao | pode_global | aceita_tr |
|---|---|---|---|


**Depois**

| valor | rotulo_exibicao | pode_global | aceita_tr |
|---|---|---|---|
| FR | FR — Feriado | true | false |
| LA | LA — Licença Administrativa | true | true |
| LP | LP — Licença de Pagamento | true | true |
| NT | NT — Parada de turma (outro motivo) | false | true |
| RC | RC — Recesso | true | false |
| PF | PF — Ponto facultativo | true | false |


## Por turma ativa: AEC, TAD, TR, EI e Apoio (vw_carga_horaria_turma)

**Antes**

| turma_codigo | ta_aec | ta_tad | ta_tr | ta_estudo_individual | ta_apoio_individualizado |
|---|---|---|---|---|---|
| C-Ap-FR 2026 | 15 | 89 | 0 | 103 | 0 |
| C-Ap-HN 2026 | 41 | 85 | 57 | 0 | 0 |
| C-ApA-AuxNav-PR-SP T2 2026 | 0 | 0 | 0 | 0 | 0 |
| C-ApA-PCN-PR-EAD T2 2026 | 0 | 0 | 0 | 0 | 0 |
| C-ApA-PrevMe-PR-EAD T2 2026 | 0 | 0 | 0 | 0 | 0 |
| C-Espc-FR 2026 | 126 | 51 | 1 | 163 | 0 |
| C-Espc-HN 2026 | 86 | 63 | 27 | 9 | 0 |
| CAHO 2026 | 57 | 40 | 59 | 128 | 0 |


**Depois**

| turma_codigo | ta_aec | ta_tad | ta_tr | ta_estudo_individual | ta_apoio_individualizado |
|---|---|---|---|---|---|
| C-Ap-FR 2026 | 15 | 89 | 0 | 103 | 0 |
| C-Ap-HN 2026 | 41 | 85 | 57 | 0 | 0 |
| C-ApA-AuxNav-PR-SP T2 2026 | 0 | 0 | 0 | 0 | 0 |
| C-ApA-PCN-PR-EAD T2 2026 | 0 | 0 | 0 | 0 | 0 |
| C-ApA-PrevMe-PR-EAD T2 2026 | 0 | 0 | 0 | 0 | 0 |
| C-Espc-FR 2026 | 126 | 51 | 1 | 163 | 0 |
| C-Espc-HN 2026 | 86 | 63 | 27 | 9 | 0 |
| CAHO 2026 | 57 | 40 | 59 | 128 | 0 |


## Atividades ativas com subtipo Monitoria (mudam na rodada do PR 3, não aqui)

**Antes**

| monitorias_ativas |
|---|
| 0 |


**Depois**

| monitorias_ativas |
|---|
| 0 |


## Parâmetro vence em breve

**Antes**

| chave | valor | natureza |
|---|---|---|


**Depois**

| chave | valor | natureza |
|---|---|---|
| avaliacao.vence_em_breve_dias | 2 | operacional |
