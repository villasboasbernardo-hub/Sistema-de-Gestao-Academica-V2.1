# Plano de aplicação no remoto — spec 016, PR 3 (M1 e M2)

*17/10/2026. Projeto `cqhpfuaweoyglhtrckcp`, que serve **preview e Production** (AMBIENTE-1): aplicar no
remoto é aplicar na Production, **antes** do merge.* ✅ **EXECUTADO em 19/10/2026, das 02:42 às 02:48 (Brasília)**,
com a autorização condicional de Bernardo Villas Boas do mesmo dia: *"se o efeito for o mesmo do desenho aprovado
(…), siga"* — e foi; os números estão abaixo, passo a passo.

## Por que as duas podem ir antes do merge sem quebrar a Production
- **M1** só **acrescenta** objetos (uma view e duas funções). O código da `main` não os lê; continua
  lendo `vw_carga_horaria_turma` e `vw_disciplinas_execucao`, que não mudam.
- **M2** recria `vw_instrutor_carga_prevista` com **as mesmas colunas**. O código da `main` continua
  funcionando, e a ficha e a lista de instrutores passam a mostrar a CH prevista corrigida **já na
  Production** — o efeito da tabela de instrutores de `contracts/migrations.md`, antes do merge do PR 3.

## O rito

0. **Portão da regra 9.4:** ✅ **desenho aprovado por Bernardo Villas Boas em 17/10/2026.** Volta para
   ele se a medição do passo 4 mudar o efeito.
1. **CI verde** nos três blocos no commit que vai ao remoto, e `pnpm verificar:tudo` com a mesma
   contagem.
2. **Reversão provada** numa base descartável: aplicar M1 e M2, reverter (o SQL de cada uma, abaixo) e
   conferir a impressão digital do esquema (`scripts/provas/impressao_digital_do_esquema.sql`) voltando
   ao valor de antes (DoD 6).
   ✅ **Feita em 19/10/2026, no banco local como base descartável** (T087), com o SQL de
   `reversao-m1-m2.sql`: com M1 e M2, **2.012** objetos e `cbd61b2b23ad95e0502e09f287b5f921`; depois da
   reversão, **2.000** objetos e `dcd9297b1986b9a3a0a9a795ab5e7b12`; e a base recriada **sem** as duas dá
   **o mesmo, linha a linha** (`diff` vazio nas 2.001 linhas). É o valor que o `CLAUDE.md` registra para os
   dois bancos desde a spec 014. Recriada a base com as duas, de novo 2.012 e `cbd61b2b…`.
3. **Backup:** `python -m scripts.manutencao.dado_do_remoto --somente-copia`. O arquivo datado que ele
   imprime é citado aqui: ✅ **`remoto-20261019-024230.sql`** (4.145 KB, 19/10/2026 02:42), depois do CI verde
   nos três blocos sobre `7d562f8` (run `39204161859`).
4. **Remedir sobre o backup:** restaurar o backup no local e rodar a medição versionada do PR 3
   (`scripts/provas/medir_bloco_1.sql`), que calcula o *antes* pelas views de hoje e pela regra antiga
   da janela, e o *depois* pelas funções e pela view novas. Se algum número de `contracts/migrations.md`
   mudou, a tabela é atualizada e **volta para Bernardo** (passo 0).
   ✅ **Feita em 19/10/2026**, com o backup restaurado **só no banco local** (o remoto não foi tocado) e "hoje" =
   **19/10/2026** (segunda), medido também com hoje = 17/10 para separar a causa de cada diferença. **O efeito é o
   do desenho:** os **5** instrutores idênticos (o 15 de **114 → 271** TA, o 13 com 4 semanas acima da faixa), a
   origem das janelas idêntica (103/5; 9 mudam; ano nulo 8 → 0), e a **C-Ap-FR 2026 passa a "em atraso" com o
   mesmo saldo do desenho, −16 TA**. **Toda diferença vem do avanço da data** — nenhum lançamento com data até
   17/10 mudou entre as duas cópias (a soma sem corte é idêntica em toda turma):
   - os lançamentos de **18 e 19/10** passam a contar "até hoje" (C-Ap-FR **+8**, C-Ap-HN **+9**, C-Espc-HN **+6**
     TA; nas disciplinas, +3 a +5, e C-Ap-FR III e C-Espc-HN HN-1110-0815 deixam de mudar);
   - numa **segunda**, os dias úteis do saldo contam de terça: **um dia a menos** em toda turma com término à
     frente (no sábado do desenho não havia diferença) — C-Ap-FR −16 + 8 − 8 = −16; C-Ap-HN
     21 + 9 − 8 = 22; C-Espc-HN 29 + 6 − 7 = 28 (regime de 7); CAHO 16 − 8 = 8; C-Espc-FR −77 − 7 = −84; as
     três zeradas, um dia (8 TA nas presenciais, 5 h nas EAD).
   ⚠️ **Uma diferença de cadastro, fora do efeito:** a `EST-QF-EM2040PHS 2026` passou de planejada a cancelada
   entre 17 e 19/10; tem **0** TA nas duas cópias, antes e depois da M1, e não está em tabela nenhuma do desenho.
5. **Dry-run:** `supabase db push --linked --dry-run` — tem de listar **só** M1 e M2. ✅ Listou só
   `20261019035107_execucao_ate_uma_data.sql` e `20261019035110_janela_da_ch_prevista.sql`.
6. **Aplicar:** `supabase db push --linked`. ✅ Saída **0**, as duas aplicadas na ordem.
7. **Conferência só de leitura**, registrada aqui com os números:
   - `supabase migration list --linked`: **N e N** migrations, nenhuma só de um lado: ✅ **78 e 78**, nenhuma
     só de um lado;
   - impressão digital do esquema **igual** nos dois bancos (✅ `cbd61b2b23ad95e0502e09f287b5f921`, objetos
     ✅ **2.012**, o mesmo valor do local com as duas migrations);
   - `vw_instrutor_carga_prevista` com `{security_invoker=true}`; `vw_chd_por_fato` com
     `{security_invoker=true}`;
   - as duas funções com `pronargdefaults = 0`, `prosecdef = false`, `execute` só para
     `authenticated`;
   - **0** policies de `DELETE` no catálogo;
   ✅ Conferido no remoto, só de leitura: as duas views com `security_invoker=true`; as duas funções com
   `pronargdefaults = 0`, `prosecdef = false` e `stable`; `execute` para `authenticated` e não para `anon` (a ACL
   traz também `service_role`, pelo privilégio padrão da plataforma — como as demais funções da casa); a base sem
   escrita para `authenticated` e sem leitura para `anon`; **0** policies de `DELETE`; e a view da M2 com **0**
   linhas de ano nulo (eram 8);
   - a medição do passo 4 refeita **no remoto**, só de leitura, por
     `python -m scripts.provas.medir_no_remoto` (atenção: a CLI devolve as colunas em ordem
     alfabética), batendo com a do backup. ✅ **Idêntica à do backup, seção por seção** (turmas, disciplinas,
     atribuições, faixas e feriados).
8. **Production respondendo:** `/login` 200; as telas protegidas 307. ✅ `/login` **200**; `/inicio`,
   `/turmas`, `/instrutores` e `/print/dsa` **307**, como antes.
9. **Merge** do PR 3 só depois de 1 a 8.

## A reversão (se for preciso)
- **M1:** `drop function public.execucao_por_disciplina_ate(date, uuid); drop function
  public.chd_da_turma_ate(date); drop view public.vw_chd_por_fato;` — antes, o código que as lê
  (PR 3) tem de sair da `main`, senão as telas caem no estado de erro.
- **M2:** `create or replace view public.vw_instrutor_carga_prevista with (security_invoker = true) as …`
  com o corpo de `20260926005750_ch_prevista_com_security_invoker.sql`.
- ⚠️ **Restaurar o backup no remoto é escrita no remoto** e exige decisão expressa de Bernardo (seção
  *A fonte da verdade* do CLAUDE.md). As duas migrations **não mexem em dado**, então a reversão é só de
  estrutura.
