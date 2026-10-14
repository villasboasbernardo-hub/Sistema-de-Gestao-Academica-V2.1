# E-3 — a matriz de `calendario` (T037)

Medido em 14/10/2026 em `perfil_permissao` do banco **local** restaurado da cópia
`remoto-20261014-021627.sql`, linhas com `permitido = true`:

| Perfil | `calendario.criar` | `calendario.editar` |
|---|---|---|
| `admin` | sim | sim |
| `encarregado_administracao_academica` | sim | sim |

Nenhum outro perfil tem as duas. O **Ajudante** (`ajudante_administracao_academica`) **não** tem: ele é
o caso que discrimina da E-3, que passa a escrita do previsto de `calendario.*` (em `reservas_proens`)
para `previsto_proens.editar` (Admin, Encarregado e Ajudante).
