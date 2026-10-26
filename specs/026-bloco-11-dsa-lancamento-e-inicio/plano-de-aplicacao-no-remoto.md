# Plano de aplicação no remoto — Bloco 11 (spec 026)

**Uma migration, que só ACRESCENTA** — `20261026043358_regime_da_semana_do_dsa.sql`: as tabelas `dsa_regime_da_semana` e
`turma_regime_vigencia` (RLS ligada, uma policy de leitura em cada, sem escrita para `authenticated`, sem `DELETE`), as
auxiliares em `app` e as três RPCs do regime de tempos da semana em `public`. Nenhuma função, view, policy ou dado
existente muda — por isso segue sem portão (regra 9.4, emenda de 19/10/2026), com o rito completo.

**Reversão:** `reversao.sql`, nesta pasta — vale antes de uso real (depois dele, desfazer apaga as escolhas de regime e
o regime gravado das semanas salvas). **Provada** em 26/10/2026, numa transação desfeita no banco local (99 migrations):
a impressão digital do esquema vai de **2.721 objetos `d69c3a6c…`** a **2.637 objetos `7e7eb3d5…`** — a do remoto depois
do Bloco 10 — e volta a 2.721 com o `rollback`.

## O rito — aplicado em 26/10/2026, depois do CI verde em `6b1c69b` (run `40313875740`)

1. **Backup** — `python -m scripts.manutencao.dado_do_remoto --somente-copia` →
   **`remoto-20261026-084656.sql`** (4.374 KB, fora do git).
2. **Dry-run** — `supabase db push --linked --dry-run` listou **só** `20261026043358_regime_da_semana_do_dsa.sql`.
3. **Aplicação** — `supabase db push --linked`, saída **0**.
4. **Conferência só de leitura**, na hora:
   - migrations: **99 e 99**, nenhuma só de um lado (`supabase migration list --linked`);
   - impressão digital do esquema **idêntica nos dois bancos**: **2.721 objetos, `d69c3a6c…`** (era 2.637, `7e7eb3d5…`,
     depois do Bloco 10);
   - `dsa_regime_da_semana` e `turma_regime_vigencia`: RLS ligada, **uma** policy cada (de leitura), **0** linhas;
     `authenticated` com `SELECT` (e os `REFERENCES`/`TRIGGER` de padrão), **sem** `INSERT`, `UPDATE`, `DELETE` nem
     `TRUNCATE`;
   - as três RPCs: `execute` para `authenticated`, **não** para `anon`; as cinco auxiliares de `app` que conferem ou
     gravam (`semana_do_dsa_salva`, `regime_resolvido_da_semana`, `inserir_…`, `congelar_…`, `porteiro_…`): nenhum dos
     dois;
   - **0** policies de `DELETE` no catálogo;
   - toda view de `public`/`app` com `security_invoker`, menos a exceção nominal `vw_instrutor_dados_pessoais`;
   - Production respondendo: `/login` **200**; `/`, `/inicio` e `/turmas` **307** (para o login).
