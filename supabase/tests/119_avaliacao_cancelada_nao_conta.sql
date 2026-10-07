-- =================================================================================
-- 119 — A avaliação CANCELADA não entra em contagem nenhuma
--
-- O QUÊ  : a forma da VIRADA-1 para substituir a avaliação do ETL pela da planilha é
--          `status = 'cancelada'` com a marca em `observacoes` *(aprovada por Bernardo Villas Boas em
--          06/10/2026, item 2 do lote da onda 1, com a condição: "prove que avaliação cancelada não
--          entra em nenhuma contagem")*. Este arquivo é a prova, por DADO e não por definição: uma
--          avaliação com aplicação e vista, contada enquanto `pendente`, some das cinco leituras ao
--          virar `cancelada` — ocupação do DSA, CH da turma, execução da disciplina, carga anual do
--          instrutor (ministrada e fiscalizada) e a trava da vigência.
--
-- ⚠️ CONTROLE POSITIVO PRIMEIRO: cada leitura é medida com a avaliação pendente e tem de contar.
--    Uma asserção de "zero" sem o controle passaria com a view quebrada.
-- =================================================================================

begin;
select plan(12);

insert into auth.users (id, email, aud, role) values
  ('a0000000-0000-0000-0000-000000000119', 't119-admin@ciaara.teste', 'authenticated', 'authenticated');
insert into public.usuarios (codigo, auth_user_id, email, nome, perfil) values
  ('T119-USR-ADM', 'a0000000-0000-0000-0000-000000000119', 't119-admin@ciaara.teste', 'Admin T119', 'admin');
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000119', true);

select public.criar_curso_com_regime(
  '{"codigo":"T119-CUR","nome_curso":"Curso T119","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2043-01-01"}'::jsonb);
create temporary table _t119 as select id as curso_id from public.cursos where codigo = 'T119-CUR';
insert into public.config_listas (lista, valor, rotulo_exibicao) values ('tipos_avaliacao', 'Prova T119', 'Prova T119');
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('20190000-0000-0000-0000-000000000001', 'T119-D1', (select curso_id from _t119), 'T119', 'Disciplina T119', 30);
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('40190000-0000-0000-0000-000000000001', 'T119-INS', 'CT', '-EF', 'Instrutor T119', 'Militar', 'CIAARA'),
  ('40190000-0000-0000-0000-000000000002', 'T119-FIS', 'CT', '-EF', 'Fiscal T119', 'Militar', 'CIAARA');
insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino) values
  ('50190000-0000-0000-0000-000000000001', (select curso_id from _t119), 'T1', 2043,
   'ativa', 'presencial', '2043-01-05', '2043-11-30');

insert into public.avaliacoes
  (codigo, turma_id, disciplina_id, curso_id, tipo_avaliacao, data_avaliacao, ta_inicial, tempos_consumidos,
   instrutor_responsavel_id, fiscal_id, data_vista_prova, ta_inicial_vista, tempos_consumidos_vista)
values
  ('T119-AVA-1', '50190000-0000-0000-0000-000000000001', '20190000-0000-0000-0000-000000000001',
   (select curso_id from _t119), 'Prova T119', '2043-04-10', 1, 3,
   '40190000-0000-0000-0000-000000000001', '40190000-0000-0000-0000-000000000002', '2043-04-12', 1, 1);

create function pg_temp.medidas() returns jsonb
language sql as $f$
  select jsonb_build_object(
    'ocupacao', (select count(*) from public.vw_ocupacao_ta
                  where turma_id = '50190000-0000-0000-0000-000000000001' and origem in ('avaliacao', 'vista_prova')),
    'ch_turma', (select ta_avaliacao + ta_vista_prova from public.vw_carga_horaria_turma
                  where turma_id = '50190000-0000-0000-0000-000000000001'),
    'execucao', (select ta_avaliacao_executados from public.vw_disciplinas_execucao
                  where turma_id = '50190000-0000-0000-0000-000000000001'
                    and disciplina_id = '20190000-0000-0000-0000-000000000001'),
    'ministrado', (select ta_ministrado_ano from public.vw_instrutor_carga_anual
                    where instrutor_id = '40190000-0000-0000-0000-000000000001' and ano = 2043),
    'fiscalizado', (select ta_fiscalizado_ano from public.vw_instrutor_carga_anual
                     where instrutor_id = '40190000-0000-0000-0000-000000000002' and ano = 2043),
    'trava', (select count(*) from app.lancamentos_que_travam_vigencia(
                (select id from public.curso_regime_historico
                  where curso_id = (select curso_id from _t119) and status = 'ativo'), '2043-01-01'))
  );
$f$;

-- controle positivo: pendente, tudo conta
select is((pg_temp.medidas() ->> 'ocupacao')::int, 2, 'pendente · a ocupação do DSA tem a aplicação e a vista');
select is((pg_temp.medidas() ->> 'ch_turma')::int, 4, 'pendente · a CH da turma soma 3 TA de prova e 1 de vista');
select is((pg_temp.medidas() ->> 'execucao')::int, 4, 'pendente · a execução da disciplina conta prova e vista (3 + 1)');
select is((pg_temp.medidas() ->> 'ministrado')::int, 4, 'pendente · a carga anual do responsável conta prova e vista (3 + 1)');
select is((pg_temp.medidas() ->> 'fiscalizado')::int, 3, 'pendente · a carga anual do fiscal conta a prova');
select is((pg_temp.medidas() ->> 'trava')::int, 1, 'pendente · a avaliação trava a vigência');

update public.avaliacoes
   set status = 'cancelada',
       observacoes = '[SUBSTITUIDO PELA PLANILHA DE CONTROLE] (status anterior: pendente)'
 where codigo = 'T119-AVA-1';

select is((pg_temp.medidas() ->> 'ocupacao')::int, 0, '⚠️ cancelada · some da ocupação do DSA — aplicação e vista');
select is(coalesce((pg_temp.medidas() ->> 'ch_turma')::int, 0), 0, '⚠️ cancelada · some da CH da turma');
select is(coalesce((pg_temp.medidas() ->> 'execucao')::int, 0), 0, '⚠️ cancelada · some da execução da disciplina');
select is(coalesce((pg_temp.medidas() ->> 'ministrado')::int, 0), 0, '⚠️ cancelada · some da carga anual do responsável');
select is(coalesce((pg_temp.medidas() ->> 'fiscalizado')::int, 0), 0, '⚠️ cancelada · some da carga anual do fiscal');
select is((pg_temp.medidas() ->> 'trava')::int, 0, '⚠️ cancelada · não trava a vigência (emenda de 06/10/2026)');

select * from finish();
rollback;
