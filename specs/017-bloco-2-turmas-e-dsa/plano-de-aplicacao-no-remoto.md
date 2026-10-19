# Plano de aplicação no remoto — Bloco 2 (spec 017)

*19/10/2026. Projeto `cqhpfuaweoyglhtrckcp`, que serve **preview e Production** (AMBIENTE-1): aplicar no remoto é
aplicar na Production, **antes** do merge. Regra 9.4 com a emenda de 19/10/2026: M1, M2 e M3 só acrescentam e seguem
o rito sem parar; **M4 altera e é PORTÃO** — não vai ao remoto antes do *"aprovado"* de Bernardo ao desenho
(`contracts/migrations.md` §M4). E o **merge só depois de a M4 aplicada** pelo rito dela; se o desenho não for aprovado
a tempo, a M4 sai deste PR antes do merge (C-30). Nada aqui foi executado: os resultados entram em cada passo, com
`[pendente]` até lá (regra 9.3). Emendado pelo analyze de 19/10/2026 (achados 22, 23, 32, 38, 49, 55, 64).*

## Passos — M1, M2 e M3

0. **Pré-condição:** CI verde nos três blocos sobre o commit do PR.
1. **Backup:** `python -m scripts.manutencao.dado_do_remoto --somente-copia`. Arquivo citado aqui, para a medição dos
   passos 2 e 3: **`remoto-20261019-113345.sql`** (19/10/2026, 11:33). O backup imediatamente antes do push: `[pendente]`.
2. **Impressão digital das views, ANTES (SC-010):** com o backup restaurado **só no local** e o esquema **sem** M1–M4.
   ⚠️ O `dado_do_remoto` recria o local por **todas** as migrations da pasta: para o "sem M1–M4", tirar as quatro da
   pasta **só na cópia de trabalho** durante a restauração (sem commit), ou restaurar numa worktree em `c1f8d65`. O md5
   do conteúdo ordenado de `vw_chd_por_fato` (as 5 colunas antigas), `vw_carga_horaria_turma` e
   `vw_disciplinas_execucao` (as colunas antigas) — `scripts/provas/impressao_digital_das_views_da_chd.sql`:
   **feito em 19/10/2026** — as quatro migrations tiradas da pasta só na cópia de trabalho, `supabase db reset` (78
   migrations, a última `20261019035110`), o `public` esvaziado e a cópia restaurada por `psql`:
   `vw_chd_por_fato` **2.510** linhas `23b021c5a003e4f03cded618b5ae16e8` · `vw_carga_horaria_turma` **29**
   `b955b777b0f34bcd403e3344074d8850` · `vw_disciplinas_execucao` **228** `c61a16bfce04c73087f65c1bd09af245`.
3. **Impressão digital das views, DEPOIS, no mesmo dado:** o local com M1–M3 aplicadas sobre o mesmo backup; tem de
   ser **igual** à do passo 2: **IGUAL nas três** (81 migrations, a última `20261019114403`; mesmas contagens e mesmos
   md5), 19/10/2026. O local voltou à base limpa (`pnpm db:reset:limpo`) logo em seguida. Se não for, **PARE**: a M1 mudou algo em tela. ⚠️ Restaurar a cópia por
   cima do local com M1–M3 **sobrescreve** `perfil_permissao` e `config_parametros` com o conteúdo do remoto — o local
   perde o recurso `ta_fora_do_dsa` e o parâmetro `turmas.aviso_inicio_dias` (o achado da spec 014). Para as views do
   passo não importa; **antes de qualquer outra conferência no local**, voltar à base limpa (`pnpm db:reset:limpo`) ou
   reaplicar à mão as linhas da matriz e do parâmetro.
4. **Dry-run:** M4 fora de `supabase/migrations/` **só na cópia de trabalho** (sem commit);
   `supabase db push --linked --dry-run` tem de listar **só** M1, M2 e M3: `[pendente]`.
5. **Aplicar:** `supabase db push --linked` (o pedido de permissão aparece para Bernardo): `[pendente]`. M4 volta à
   pasta logo depois.
6. **Conferência só de leitura:**
   - `supabase migration list --linked`: **N+1 no local e N no remoto**, com a M4 só do lado local (esperado até o
     portão): `[pendente]`;
   - impressão digital do esquema igual à do local **com M1–M3** (o local é recriado sem M4 para a comparação):
     `[pendente]`;
   - `security_invoker=true` nas **quatro** views tocadas ou criadas (`vw_chd_por_fato`, `vw_carga_horaria_turma`,
     `vw_disciplinas_execucao`, `vw_turmas_arquivadas`), e `vw_conformidade_tetos` intacta: `[pendente]`;
   - `execute` para `authenticated` (e **não** para `anon`) em `public.trocar_situacao_da_turma`,
     `public.ocupacao_para_conflitos`, `app.turma_arquivada` e `app.proximo_codigo_ta_fora_do_dsa`; as funções de
     gatilho (`app.guardar_ta_fora_do_dsa`, `app.anotar_troca_de_situacao`, `app.carimbar_arquivamento`,
     `app.trilha_da_turma_imutavel`) **sem** `execute` para `public`, `anon` e `authenticated`; **0** policies de
     `DELETE`: `[pendente]`;
   - ⚠️ **a prova de "nada em tela mudou" no remoto é a dos DOIS RETRATOS DATADOS (gotcha 13), não o md5 do remoto
     vivo**: qualquer lançamento de testador entre o backup e a conferência muda o md5 sem relação com a migration, e
     a M2 passa a anotar toda troca de situação no mesmo instante do push. Rodar `--somente-copia` **logo depois** do
     push, restaurá-lo no local com M1–M3 e comparar as views com as do passo 3; o que restar de diferença é nomeado
     pelo `diff` dos dois retratos: `[pendente]`;
   - `ta_fora_do_dsa`, `turma_trocas_de_situacao` e `turma_arquivamentos`: **zero linhas, ou só linhas com `criado_em`
     posterior ao push, nomeadas**; o parâmetro novo presente: `[pendente]`.
7. **Production respondendo:** `/login` 200; as telas protegidas 307: `[pendente]`.

## M4 — depois do *"aprovado"*

0. **Contagem que o desenho precisa:** `select count(*) from public.vw_turmas_arquivadas` no remoto, só leitura,
   **imediatamente antes** do push; se for maior que zero, a lista das turmas, para Bernardo ver antes do `db push`:
   `[pendente]`.
1. Backup novo (citado): `[pendente]`.
2. `supabase db push --linked --dry-run` lista **só** M4: `[pendente]`.
3. `supabase db push --linked`: `[pendente]`.
4. Conferência: N e N; impressão digital igual; os 13 gatilhos no catálogo; uma recusa de amostra **não** se faz no
   remoto (seria escrita) — a prova é o pgTAP 140 e o caso de RLS no local e no CI: `[pendente]`.

Só então o merge (C-30), e só entre semanas (FR-009.1).

## Todo PR seguinte, enquanto a M4 não estiver aplicada

O dry-run do rito dele confere que a M4 **não** aparece na lista (ela não está na `main`, pela C-30; se aparecer, a
ordem foi violada e o rito **para**).

## Reversão

`contracts/migrations.md`, seção *Reversão* de cada migration. Provada numa base descartável antes do PR (impressão
digital voltando à de antes).
