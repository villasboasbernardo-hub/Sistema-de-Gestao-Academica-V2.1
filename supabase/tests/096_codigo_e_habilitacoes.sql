-- =================================================================================
-- 096 — O codigo do vinculo de habilitacao e a funcao do painel de disciplinas
--
-- O QUE  : prova o formato e a sequencia do codigo `VIN-NNNNNN` (T082, decisao de Bernardo Villas
--          Boas, 15/09/2026) e a fronteira da `sincronizar_habilitacoes`: invoker, sem `anon`, e
--          recusando quem nao tem sessao.
--
-- ⚠️ O COMPORTAMENTO COM SESSAO — criar, reativar sem duplicar, inativar sem apagar, disciplina
--    inativa intocada — mora em `tests/invariantes/rls/rls.test.ts`, bloco `FR-022`, com JWT de
--    verdade. Aqui nao ha usuario autenticado, e a funcao consulta a permissao da sessao.
--
-- ⚠️ A SEQUENCIA NAO VOLTA COM O ROLLBACK. Rodar este teste consome numeros; o proximo codigo real
--    pula. E dado de teste num banco descartavel, e a recarga do ETL recompoe o estado.
-- =================================================================================
begin;
select plan(8);

insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('11111111-0000-0000-0000-000000000096', 'T096-CUR', 'Curso T096', 'regular', 'presencial', 30);
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('22222222-0000-0000-0000-0000000960d1', 'T096-D1', '11111111-0000-0000-0000-000000000096', 'T96-1', 'Disciplina T096 um', 10),
  ('22222222-0000-0000-0000-0000000960d2', 'T096-D2', '11111111-0000-0000-0000-000000000096', 'T96-2', 'Disciplina T096 dois', 10);
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('66666666-0000-0000-0000-000000000096', 'T096-INS', 'CT', '-EF', 'Instrutor Do Vinculo', 'Militar', 'CIAARA');

-- 1. O default da coluna e a funcao.
select ok(
  (select column_default like '%proximo_codigo_vinculo%'
     from information_schema.columns
    where table_schema = 'public' and table_name = 'instrutor_disciplina' and column_name = 'codigo'),
  'RN-CRUD-03 · instrutor_disciplina.codigo tem default app.proximo_codigo_vinculo()'
);

-- 2. Vinculo sem codigo recebe VIN- e seis digitos.
insert into public.instrutor_disciplina (instrutor_id, disciplina_id)
values ('66666666-0000-0000-0000-000000000096', '22222222-0000-0000-0000-0000000960d1');

select matches(
  (select codigo from public.instrutor_disciplina
    where instrutor_id = '66666666-0000-0000-0000-000000000096'
      and disciplina_id = '22222222-0000-0000-0000-0000000960d1'),
  '^VIN-[0-9]{6}$',
  'T082 · o codigo gerado segue o formato real VIN-NNNNNN, seis digitos'
);

-- 3. Codigo explicito alto (o ETL grava assim) e o proximo gerado vem depois dele.
--    ⚠️ O explicito e calculado ACIMA do valor atual da sequencia: como ela nao volta com o rollback,
--    um numero fixo ficaria abaixo dela na segunda execucao, e o teste reprovaria pelo motivo errado.
create temp table t096_alto on commit drop as
  select (greatest(
            (select last_value from app.instrutor_disciplina_codigo_seq),
            coalesce((select max(substring(codigo from 5)::bigint) from public.instrutor_disciplina
                       where codigo ~ '^VIN-[0-9]+$'), 0)
          ) + 500) as numero;

insert into public.instrutor_disciplina (codigo, instrutor_id, disciplina_id, status)
select 'VIN-' || lpad(numero::text, 6, '0'), '66666666-0000-0000-0000-000000000096',
       '22222222-0000-0000-0000-0000000960d2', 'inativo'
  from t096_alto;
insert into public.instrutor_disciplina (instrutor_id, disciplina_id)
values ('66666666-0000-0000-0000-000000000096', '22222222-0000-0000-0000-0000000960d2');

select is(
  (select codigo from public.instrutor_disciplina
    where instrutor_id = '66666666-0000-0000-0000-000000000096'
      and disciplina_id = '22222222-0000-0000-0000-0000000960d2' and status = 'ativo'),
  (select 'VIN-' || lpad((numero + 1)::text, 6, '0') from t096_alto),
  'T082 · a sequencia avanca para depois do maior codigo gravado — o ETL grava codigo explicito'
);

-- 4. Seis digitos com numero maior que 999999 nao existe na base; o formato e o da coluna.
select is_empty(
  $$select 1 from public.instrutor_disciplina where codigo !~ '^VIN-[0-9]{6}$'$$,
  'T082 · nenhum vinculo fora do formato VIN-NNNNNN'
);

-- 5. A funcao do painel existe e e invoker.
select is(
  (select prosecdef from pg_proc where oid = 'public.sincronizar_habilitacoes(uuid, uuid[])'::regprocedure),
  false,
  'FR-022 · sincronizar_habilitacoes e SECURITY INVOKER — a RLS decide'
);

-- 6. anon nao executa; authenticated executa.
select ok(
  not has_function_privilege('anon', 'public.sincronizar_habilitacoes(uuid, uuid[])', 'execute')
  and has_function_privilege('authenticated', 'public.sincronizar_habilitacoes(uuid, uuid[])', 'execute'),
  'FR-022 · anon nao executa a sincronizacao; authenticated executa'
);

-- 7. Sem sessao nao ha perfil, e sem perfil a funcao recusa com 42501.
select throws_ok(
  $$select public.sincronizar_habilitacoes('66666666-0000-0000-0000-000000000096', array['22222222-0000-0000-0000-0000000960d1']::uuid[])$$,
  '42501',
  null,
  'FR-022 · sem perfil de edicao, a sincronizacao e recusada com 42501'
);

-- 8. Nenhuma policy de DELETE em instrutor_disciplina: desmarcar so pode inativar.
select is_empty(
  $$select 1 from pg_policies where schemaname = 'public' and tablename = 'instrutor_disciplina' and cmd = 'DELETE'$$,
  'RN-INST-05 · instrutor_disciplina nao tem policy de DELETE — desmarcar inativa, nunca apaga'
);

select * from finish();
rollback;
