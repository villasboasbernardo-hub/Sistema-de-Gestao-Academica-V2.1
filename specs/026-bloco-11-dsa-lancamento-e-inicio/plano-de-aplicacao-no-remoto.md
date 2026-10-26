# Plano de aplicação no remoto — Bloco 11 (spec 026)

**Uma migration, que só ACRESCENTA** — `20261026043358_regime_da_semana_do_dsa.sql`: as tabelas `dsa_regime_da_semana` e
`turma_regime_vigencia` (RLS ligada, uma policy de leitura em cada, sem escrita para `authenticated`, sem `DELETE`), as
auxiliares em `app` e as três RPCs do regime de tempos da semana em `public`. Nenhuma função, view, policy ou dado
existente muda — por isso segue sem portão (regra 9.4, emenda de 19/10/2026), com o rito completo.

**Reversão:** `reversao.sql`, nesta pasta — vale antes de uso real (depois dele, desfazer apaga as escolhas de regime e
o regime gravado das semanas salvas). **Provada** em 26/10/2026, numa transação desfeita no banco local (99 migrations):
a impressão digital do esquema vai de **2.721 objetos `d69c3a6c…`** a **2.637 objetos `7e7eb3d5…`** — a do remoto depois
do Bloco 10 — e volta a 2.721 com o `rollback`.

## O rito

1. **Backup** — `python -m scripts.manutencao.dado_do_remoto --somente-copia` → `[pendente]`.
2. **Dry-run** — `supabase db push --linked --dry-run` listando **só** `20261026043358` → `[pendente]`.
3. **Aplicação** — `supabase db push --linked` (o pedido de permissão é de Bernardo) → `[pendente]`.
4. **Conferência só de leitura** → `[pendente]`:
   - migrations iguais nos dois lados (`supabase migration list --linked`);
   - impressão digital do esquema igual nos dois bancos (`scripts/provas/impressao_digital_do_esquema.sql`);
   - as duas tabelas com RLS, uma policy cada, zero linhas;
   - zero policies de `DELETE` no catálogo;
   - toda view de `public`/`app` com `security_invoker` (a exceção nominal de PII intacta);
   - Production respondendo.
