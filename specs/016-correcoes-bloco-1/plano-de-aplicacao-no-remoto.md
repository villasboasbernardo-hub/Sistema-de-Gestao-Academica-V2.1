# Plano de aplicação no remoto — spec 016, PR 3 (M1 e M2)

*17/10/2026. Projeto `cqhpfuaweoyglhtrckcp`, que serve **preview e Production** (AMBIENTE-1): aplicar no
remoto é aplicar na Production, **antes** do merge. Nada aqui foi executado.*

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
3. **Backup:** `python -m scripts.manutencao.dado_do_remoto --somente-copia`. O arquivo datado que ele
   imprime é citado aqui: `[pendente]`.
4. **Remedir sobre o backup:** restaurar o backup no local e rodar a medição versionada do PR 3
   (`scripts/provas/medir_bloco_1.sql`), que calcula o *antes* pelas views de hoje e pela regra antiga
   da janela, e o *depois* pelas funções e pela view novas. Se algum número de `contracts/migrations.md`
   mudou, a tabela é atualizada e **volta para Bernardo** (passo 0).
5. **Dry-run:** `supabase db push --linked --dry-run` — tem de listar **só** M1 e M2.
6. **Aplicar:** `supabase db push --linked`.
7. **Conferência só de leitura**, registrada aqui com os números:
   - `supabase migration list --linked`: **N e N** migrations, nenhuma só de um lado: `[pendente]`;
   - impressão digital do esquema **igual** nos dois bancos (`[pendente]`, objetos `[pendente]`);
   - `vw_instrutor_carga_prevista` com `{security_invoker=true}`; `vw_chd_por_fato` com
     `{security_invoker=true}`;
   - as duas funções com `pronargdefaults = 0`, `prosecdef = false`, `execute` só para
     `authenticated`;
   - **0** policies de `DELETE` no catálogo;
   - a medição do passo 4 refeita **no remoto**, só de leitura, por
     `python -m scripts.provas.medir_no_remoto` (atenção: a CLI devolve as colunas em ordem
     alfabética), batendo com a do backup.
8. **Production respondendo:** `/login` 200; as telas protegidas 307.
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
