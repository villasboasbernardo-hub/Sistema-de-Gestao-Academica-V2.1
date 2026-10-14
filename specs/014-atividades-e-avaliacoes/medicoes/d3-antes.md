# D-3 — medição antes (T036)

Medido em 14/10/2026 no banco **local**, restaurado da cópia `remoto-20261014-021627.sql` com as
migrations do PR 1 aplicadas por cima (`scripts/provas/antes_e_depois.py preparar`).

`reservas_proens`: **12** linhas ativas, todas de 2026 e com `origem_proens = RESERVAS_PROENS (Versao
1.0/Codigo.gs)`. **10** têm curso — cinco cursos, TAD e TR cada — e **2** são a genérica (`curso_id`
nulo): TAD 2 e TR 0.

| Curso | TAD | TR | Turmas em 2026 |
|---|---|---|---|
| CAHO | 6 | 121 | 1 (`CAHO 2026`) |
| C-Ap-HN | 5 | 16 | 1 (`C-Ap-HN 2026`) |
| C-Ap-FR | 5 | 89 | 1 (`C-Ap-FR 2026`) |
| C-Espc-HN | 3 | 100 | 1 (`C-Espc-HN 2026`) |
| C-Espc-FR | 0 | 7 | 1 (`C-Espc-FR 2026`) |

Cada curso com reserva tem **exatamente uma** turma no ano: a D-3 não precisa escolher turma. Se isso
mudar até a aplicação no remoto, a D-3 aborta nomeando o curso.
