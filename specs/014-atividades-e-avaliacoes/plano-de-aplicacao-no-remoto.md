# Plano de aplicação no remoto — spec 014

> Uma seção por migration, na ordem de aplicação, e uma por rodada da sincronização. Cada campo do
> rito R-15 fica em `[pendente]` até ser medido (regra 9.3). **Nada desta lista foi aplicado no
> remoto** na implementação noturna de 14/10/2026: o remoto é da fase **publicar**.

## Rito (R-15), igual para toda migration

1. CI verde no commit que vai ao remoto.
2. Aprovação de Bernardo do antes/depois (só migration de dado) — `aprovacoes-pendentes.md`.
3. Backup: `python -m scripts.manutencao.dado_do_remoto --somente-copia`; o arquivo é citado aqui.
4. Comparar o backup com a cópia usada no antes/depois, nas tabelas que a migration toca. Se mudou,
   regerar o antes/depois e voltar ao passo 2.
5. `supabase db push --linked --dry-run` listando só as migrations desta seção.
6. `supabase db push --linked`.
7. Conferência só de leitura: `supabase migration list --linked`, impressão digital do esquema nos
   dois bancos (`scripts/provas/impressao_digital_do_esquema.sql`), as contagens do antes/depois.
8. Production respondendo (`/login` 200, as protegidas 307).

## PR 1 — E-1, E-2, D-1, D-2

| Campo | Valor |
|---|---|
| Migrations | `20261014051835` (E-1) · `20261014051943` (E-2) · `20261014052333` (D-1) · `20261014052406` (D-2) |
| Antes/depois | `antes-depois/limites_dos_24_curriculos.md` e `antes-depois/reclassificar_tipos_de_atividade.md`, sobre `remoto-20261014-021627.sql` |
| Aprovação de Bernardo | [pendente] |
| Backup | [pendente] |
| Dry-run | [pendente] |
| Push | [pendente] |
| Migrations dos dois lados | [pendente] |
| Impressão digital | [pendente] — no local, depois das quatro: [pendente na base que for ao CI] |
| Production | [pendente] |
| Reversão | `reversao-pr1.sql`, provada em base descartável em 14/10/2026: `3650c6c2…`, 1.623 objetos, `diff` vazio |

### Defeitos deliberados do PR 1 (T025), medidos em 14/10/2026 no banco local

| Defeito plantado | Quem reprovou | Desfeito |
|---|---|---|
| (a) `compoe_cht` com a expressão antiga (`set expression`) | `123_apoio_individualizado.sql`, casos 4 e 18 | sim, 123 volta a passar |
| (b) policy `dias_parados_criar` global lendo `atividades_globais.criar` | `atividades-e-avaliacoes.test.ts`, só o caso do Ajudante | sim, 13 de 13 |
| (c) gatilho `trg_config_listas_recategorizar` desligado | `123_apoio_individualizado.sql`, caso 13 (cenário 4 da US2) | sim |

## PR 1.1 — E-3, D-3

[pendente]

## PR 2 — rodada da sincronização: não há (a sincronização no remoto é do PR 3)

## PR 3 — rodada da sincronização no remoto

[pendente] — proibida na implementação noturna.

## Leva 2 — E-4, E-5, D-5, D-6, D-4, D-7 e a rodada do PR 6

[pendente]
