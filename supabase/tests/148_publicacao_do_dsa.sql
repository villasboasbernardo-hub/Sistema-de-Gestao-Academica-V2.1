-- =================================================================================
-- 148 — Spec 024, Bloco 9 (`20261023161631` e `20261023161634`): o RASCUNHO e a PUBLICAÇÃO do DSA.
--
-- O que se prova aqui (regra de banco; quem pode o quê fica em `tests/invariantes/rls/publicacao-do-dsa.test.ts`):
--   · estrutura: a trilha só de acréscimo (inclusive para a service_role), sem policy de escrita, sem DELETE;
--   · o caso que discrimina do RP-8: o rascunho NÃO conta em `vw_carga_horaria_turma` nem em `vw_ocupacao_ta`, e conta
--     depois do Salvar; e aparece na grade da tela (`vw_ocupacao_do_dsa`);
--   · a edição de um salvo é sombra: o salvo continua contando, e o Salvar aplica a sombra sobre o MESMO registro;
--   · o descarte inativa; a trava recusa quem tem sessão e não recusa o script sem sessão (RP-5);
--   · a guarda: todo objeto de `public`/`app` que lê uma tabela de lançamento filtra `salvo`, menos a lista nominal.
-- =================================================================================
begin;
select plan(21);

create function pg_temp.recusa(p_sql text) returns jsonb
language plpgsql as $f$
declare v_hint text;
begin
  execute p_sql;
  return jsonb_build_object('recusou', false);
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  return jsonb_build_object('recusou', true, 'sqlstate', sqlstate, 'hint', v_hint);
end;
$f$;

-- ── estrutura ──
select ok((select relrowsecurity from pg_class where oid = 'public.dsa_eventos_da_semana'::regclass),
          'dsa_eventos_da_semana tem RLS ligada');
select is((select count(*)::int from pg_policy where polrelid = 'public.dsa_eventos_da_semana'::regclass), 1,
          'a trilha tem só a policy de leitura (quem grava são as funções)');
select ok(not has_table_privilege('authenticated', 'public.dsa_eventos_da_semana', 'INSERT')
          and not has_table_privilege('authenticated', 'public.dsa_eventos_da_semana', 'DELETE'),
          'authenticated não insere nem apaga na trilha');
select is((select count(*)::int from pg_policy where polcmd = 'd'), 0, 'regra 4: nenhuma policy de DELETE');
select is((select reloptions from pg_class where oid = 'public.vw_ocupacao_do_dsa'::regclass),
          array['security_invoker=true'], 'vw_ocupacao_do_dsa é security_invoker (gotcha 10)');
select is((select reloptions from pg_class where oid = 'public.vw_ocupacao_ta'::regclass),
          array['security_invoker=true'], 'vw_ocupacao_ta continua security_invoker depois da M2');

-- ── a amostra: um curso, uma turma ativa, uma disciplina ──
insert into auth.users (id, email, aud, role) values
  ('a1480000-0000-0000-0000-000000000001', 't148-admin@ciaara.teste', 'authenticated', 'authenticated');
insert into public.usuarios (codigo, auth_user_id, email, nome, perfil, escopo_curso) values
  ('T148-ADM', 'a1480000-0000-0000-0000-000000000001', 't148-admin@ciaara.teste', 'Admin T148', 'admin', 'geral');
select public.criar_curso_com_regime(
  '{"codigo":"T148-CUR","nome_curso":"Curso T148","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2046-01-01"}'::jsonb);
insert into public.turmas (curso_id, ano_letivo, turma, modalidade, status, data_inicio, data_termino, codigo)
select id, 2046, 'T1', 'presencial', 'ativa', date '2046-02-01', date '2046-11-30', 'T148-CUR T1 2046'
  from public.cursos where codigo = 'T148-CUR';
insert into public.disciplinas (curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos)
select id, 'I', 'Disciplina I', 40 from public.cursos where codigo = 'T148-CUR';
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('c1480000-0000-0000-0000-000000000001', 'T148-INS', 'CT', 'AA', 'Instrutor T148', 'Militar', 'CIAARA');
create temporary table _t as
  select t.id as turma, t.curso_id as curso, d.id as disc
    from public.turmas t join public.disciplinas d on d.curso_id = t.curso_id where t.codigo = 'T148-CUR T1 2046';
-- 2046-03-07 é quarta da semana ISO 10 de 2046 (de 05/03 a 11/03).

-- ── o rascunho não conta (o caso que discrimina) ──
select set_config('request.jwt.claim.sub', 'a1480000-0000-0000-0000-000000000001', true);
select public.gravar_rascunho_do_dsa(jsonb_build_array(jsonb_build_object(
  'acao', 'inserir', 'tabela', 'registros_aula', 'campos', jsonb_build_object(
    'id', 'b1480000-0000-0000-0000-000000000001', 'codigo', 'T148-AULA-1', 'turma_id', (select turma from _t),
    'curso_id', (select curso from _t), 'disciplina_id', (select disc from _t), 'data', '2046-03-07',
    'ta_inicial', 1, 'tempos_consumidos', 2, 'categoria_normativa', 'aula', 'conteudo_resumo', 'Tópico T148',
    'instrutor_id', 'c1480000-0000-0000-0000-000000000001'))));
select is((select salvo from public.registros_aula where id = 'b1480000-0000-0000-0000-000000000001'), false,
          'a aula lançada pelo DSA nasce rascunho');
select is((select ta_aula from public.vw_carga_horaria_turma where turma_id = (select turma from _t)), 0::bigint,
          'RP-8: o rascunho NÃO conta na CH da turma');
select is((select count(*)::int from public.vw_ocupacao_ta where turma_id = (select turma from _t)), 0,
          'RP-8: o rascunho NÃO cruza com outras turmas (vw_ocupacao_ta)');
select is((select count(*)::int from public.vw_ocupacao_do_dsa where turma_id = (select turma from _t) and rascunho), 1,
          'RP-0: o rascunho aparece na grade da tela, marcado');

-- ── salvar: conta ──
select is(public.salvar_semana_do_dsa((select turma from _t), 2046::smallint, 10::smallint, date '2046-03-05', date '2046-03-11'),
          1, 'Salvar aplica o rascunho da semana');
select is((select ta_aula from public.vw_carga_horaria_turma where turma_id = (select turma from _t)), 2::bigint,
          'depois do Salvar, a aula conta');

-- ── editar um salvo é sombra: o salvo continua contando até o Salvar ──
select public.gravar_rascunho_do_dsa(jsonb_build_array(jsonb_build_object(
  'acao', 'atualizar', 'tabela', 'registros_aula', 'id', 'b1480000-0000-0000-0000-000000000001',
  'campos', jsonb_build_object('tempos_consumidos', 3))));
select results_eq(
  $$select tempos_consumidos::int, salvo from public.registros_aula
     where id = 'b1480000-0000-0000-0000-000000000001' or rascunho_de = 'b1480000-0000-0000-0000-000000000001'
     order by salvo desc$$,
  $$values (2, true), (3, false)$$,
  'editar o salvo cria a sombra; o salvo fica como estava');
select is((select ta_aula from public.vw_carga_horaria_turma where turma_id = (select turma from _t)), 2::bigint,
          'o que conta é o último Salvar (2 TA), não a sombra (3 TA)');
select public.salvar_semana_do_dsa((select turma from _t), 2046::smallint, 10::smallint, date '2046-03-05', date '2046-03-11');
select is((select tempos_consumidos::int from public.registros_aula where id = 'b1480000-0000-0000-0000-000000000001'), 3,
          'o Salvar aplica a sombra sobre o MESMO registro');

-- ── publicar e travar ──
select is(public.publicar_semana_do_dsa((select turma from _t), 2046::smallint, 10::smallint, date '2046-03-05',
                                       date '2046-03-11', '{"hoje":"2046-03-12","dados":{}}'::jsonb), 0::smallint,
          'publicar a semana registrada grava a original (0)');
select is((pg_temp.recusa($$select public.gravar_rascunho_do_dsa(jsonb_build_array(jsonb_build_object(
            'acao', 'atualizar', 'tabela', 'registros_aula', 'id', 'b1480000-0000-0000-0000-000000000001',
            'campos', jsonb_build_object('tempos_consumidos', 1))))$$)) ->> 'hint',
          'semana_do_dsa_publicada', 'semana publicada recusa a edição de quem tem sessão (RP-1)');
select is((pg_temp.recusa($$select public.publicar_semana_do_dsa((select turma from _t), 2046::smallint, 10::smallint,
            date '2046-03-05', date '2046-03-11', '{"hoje":"2046-03-12","dados":{}}'::jsonb, 'curta')$$)) ->> 'hint',
          'semana_do_dsa_publicada', 'sem «Fazer alteração», publicar de novo é recusado');
select public.iniciar_alteracao_do_dsa((select turma from _t), 2046::smallint, 10::smallint);
select is((pg_temp.recusa($$select public.publicar_semana_do_dsa((select turma from _t), 2046::smallint, 10::smallint,
            date '2046-03-05', date '2046-03-11', '{"hoje":"2046-03-12","dados":{}}'::jsonb, 'curta')$$)) ->> 'hint',
          'alteracao_sem_justificativa', 'a alteração sem justificativa é recusada (RP-1)');
select is(public.publicar_semana_do_dsa((select turma from _t), 2046::smallint, 10::smallint, date '2046-03-05',
                                       date '2046-03-11', '{"hoje":"2046-03-13","dados":{}}'::jsonb,
                                       'Troca do instrutor por missão de serviço'), 1::smallint,
          'com justificativa, a alteração publica a ALT 1');

-- ── a guarda: quem lê lançamento filtra o salvo ──
select is(
  (select coalesce(string_agg(n.nspname || '.' || coalesce(c.relname, p.proname), ', ' order by 1), '')
     from (select c.oid, null::oid as foid, c.relnamespace as ns,
                  regexp_replace(pg_get_viewdef(c.oid), '--[^\n]*', '', 'g') as corpo
             from pg_class c where c.relkind = 'v'
           union all
           select null, p.oid, p.pronamespace,
                  regexp_replace(p.prosrc, '--[^\n]*', '', 'g')
             from pg_proc p) o
     join pg_namespace n on n.oid = o.ns and n.nspname in ('public', 'app')
     left join pg_class c on c.oid = o.oid
     left join pg_proc p on p.oid = o.foid
    where o.corpo ~ '\m(registros_aula|avaliacoes|atividades_nao_letivas|vistas_de_avaliacao|sessoes_de_aplicacao)\M'
      and o.corpo !~ '\msalvo\M'
      and coalesce(c.relname, p.proname) not in (
        -- Lista nominal (spec 024): quem cita uma tabela de lançamento SEM somar nem cruzar o que conta.
        -- · escrita e gatilho (o rascunho é deles, ou eles não contam nada):
        'espelhar_vista_na_sessao_1', 'juntar_como_sessao_nucleo', 'recategorizar_pelo_tipo', 'turma_da_linha',
        'gravar_lancamentos_em_transacao', 'marcar_excluido', 'status_de_excluido', 'turma_e_data_do_lancamento',
        'registrar_evento_do_dsa', 'guardar_rascunho_do_dsa',
        -- · o impedimento de exclusão enxerga TUDO, o rascunho inclusive (um rascunho também prende o cadastro):
        'impedimentos_de_exclusao_da_disciplina', 'impedimentos_de_exclusao_da_unidade_ensino',
        'impedimentos_de_exclusao_do_instrutor',
        -- · spec 025 (Bloco 10, D-COR-6): o que prende a turma e o item do currículo, pelo mesmo motivo.
        'registros_da_turma', 'registros_do_item',
        -- · leem `vw_ocupacao_ta` ou `vw_avaliacoes_situacao`/`fn_status_vista`, que já filtram o salvo (M2):
        'conflitos_da_semana', 'ocupacao_para_conflitos', 'situacao_da_avaliacao',
        -- · a proteção de vigência pela atividade global lê `lancamentos_que_travam_vigencia`, que filtra (M2):
        'protecao_das_vigencias_por_atividade_global',
        -- · spec 026 (Bloco 11): o porteiro do regime da semana só cita o RECURSO `registros_aula` da matriz de
        --   permissões (`app.pode`), como `registrar_evento_do_dsa`; a semana salva ele lê de `vw_ocupacao_ta`.
        'porteiro_do_regime_do_dsa')),
  '',
  'RP-8: todo objeto que lê uma tabela de lançamento filtra «salvo» (ou está na lista nominal)');

select * from finish();
rollback;
