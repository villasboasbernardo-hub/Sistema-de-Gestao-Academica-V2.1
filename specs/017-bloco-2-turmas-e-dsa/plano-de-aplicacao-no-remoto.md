# Plano de aplicação no remoto — Bloco 2 (spec 017)

*19/10/2026. Projeto `cqhpfuaweoyglhtrckcp`, que serve **preview e Production** (AMBIENTE-1): aplicar no remoto é
aplicar na Production, **antes** do merge. Regra 9.4 com a emenda de 19/10/2026: M1, M2 e M3 só acrescentam e seguem
o rito sem parar; **M4 altera e é PORTÃO** — não vai ao remoto antes do *"aprovado"* de Bernardo ao desenho
(`contracts/migrations.md` §M4). Nada aqui foi executado: os resultados entram em cada passo, com `[pendente]` até
lá (regra 9.3).*

## Passos — M1, M2 e M3

0. **Pré-condição:** CI verde nos três blocos sobre o commit do PR.
1. **Backup:** `python -m scripts.manutencao.dado_do_remoto --somente-copia`. Arquivo citado aqui: `[pendente]`.
2. **Impressão digital das views, ANTES (SC-010):** com o backup restaurado **só no local** e o esquema **sem** M1–M4,
   o md5 do conteúdo ordenado de `vw_chd_por_fato` (as 5 colunas antigas), `vw_carga_horaria_turma` e
   `vw_disciplinas_execucao` (as colunas antigas): `[pendente]`.
3. **Impressão digital das views, DEPOIS, no mesmo dado:** o local com M1–M3 aplicadas sobre o mesmo backup; tem de
   ser **igual** à do passo 2: `[pendente]`. Se não for, **PARE**: a M1 mudou algo em tela.
4. **Dry-run:** M4 fora de `supabase/migrations/` **só na cópia de trabalho** (sem commit);
   `supabase db push --linked --dry-run` tem de listar **só** M1, M2 e M3: `[pendente]`.
5. **Aplicar:** `supabase db push --linked` (o pedido de permissão aparece para Bernardo): `[pendente]`. M4 volta à
   pasta logo depois.
6. **Conferência só de leitura:**
   - `supabase migration list --linked`: N e N, com M4 só do lado local (esperado até o portão): `[pendente]`;
   - impressão digital do esquema igual à do local **com M1–M3** (o local é recriado sem M4 para a comparação):
     `[pendente]`;
   - `security_invoker=true` nas cinco views tocadas ou criadas; `execute` das funções novas para `authenticated` e
     não para `anon`; **0** policies de `DELETE`: `[pendente]`;
   - a impressão digital das views no **remoto**, igual à do passo 2: `[pendente]`;
   - `ta_fora_do_dsa`, `turma_trocas_de_situacao` e `turma_arquivamentos` vazias; o parâmetro novo presente:
     `[pendente]`.
7. **Production respondendo:** `/login` 200; as telas protegidas 307: `[pendente]`.

## M4 — depois do *"aprovado"*

1. Backup novo (citado). 2. `supabase db push --linked --dry-run` lista **só** M4. 3. `db push`. 4. Conferência: N e
N; impressão digital igual; os 13 gatilhos no catálogo; uma recusa de amostra **não** se faz no remoto (seria escrita)
— a prova é o pgTAP 140 no local e no CI.

## Reversão

`contracts/migrations.md`, seção *Reversão* de cada migration. Provada numa base descartável antes do PR (impressão
digital voltando à de antes).
