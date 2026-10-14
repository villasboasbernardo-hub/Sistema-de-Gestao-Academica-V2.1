-- Spec 014, PR 1.1 · migrations E-3 e D-3 — o previsto do PROENS por turma e a trilha imutável.
--
-- RN-2027-03 (Risco Alto): a reserva do PROENS é POR TURMA; a genérica é só sugestão, nunca previsto
-- gravado. ⚠️ pgTAP de dado nunca pula: na base limpa, o valor que prova a abstenção da D-3 (0 previstos
-- com a procedência); na carregada, a invariante "toda reserva com curso tem o previsto igual na turma".
begin;
select plan(18);

insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('d1260000-0000-0000-0000-000000000001', 'T126-PP', 'Curso do 126', 'regular', 'presencial', 30);
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino) values
  ('d1265000-0000-0000-0000-000000000001', 'T126-PP T1 2026', 'd1260000-0000-0000-0000-000000000001',
   'T1', 2026, 'ativa', 'presencial', '2026-03-02', '2026-06-30');

-- ── estrutura ──
select ok(
  (select relrowsecurity from pg_class where oid = 'public.previstos_proens_turma'::regclass)
  and (select relrowsecurity from pg_class where oid = 'public.previstos_proens_alteracoes'::regclass),
  'R-10 · as duas tabelas têm RLS'
);
select is(
  (select array_agg(polcmd::text order by polcmd) from pg_policy where polrelid = 'public.previstos_proens_alteracoes'::regclass),
  array['r'],
  'FR-008.2 · a trilha tem UMA policy, de leitura'
);
select ok(
  not has_table_privilege('authenticated', 'public.previstos_proens_alteracoes', 'INSERT')
  and not has_table_privilege('authenticated', 'public.previstos_proens_alteracoes', 'UPDATE'),
  'FR-008.2 · authenticated não escreve na trilha (revoke)'
);
select ok(
  not has_table_privilege('authenticated', 'public.reservas_proens', 'INSERT')
  and not has_table_privilege('authenticated', 'public.reservas_proens', 'UPDATE')
  and has_table_privilege('authenticated', 'public.reservas_proens', 'SELECT'),
  'E-7 · reservas_proens fica só de leitura'
);
select is(
  (select count(*)::int from pg_policy where polrelid = 'public.reservas_proens'::regclass and polcmd in ('a', 'w')),
  0,
  'E-7 · reservas_proens sem policy de escrita'
);
select ok(
  (select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.vw_conformidade_tetos'::regclass),
  'Gotcha 10 · vw_conformidade_tetos com security_invoker'
);
select is(
  (select array_agg(attname::text order by attnum) from pg_attribute
    where attrelid = 'public.vw_conformidade_tetos'::regclass and attnum > 0 and not attisdropped),
  array['turma_id', 'turma_codigo', 'curso_id', 'curso_codigo', 'nome_curso', 'ano_letivo', 'categoria',
        'cumprido', 'previsto', 'limite_declarado', 'ch_curricular', 'percentual_norma'],
  'Ponto único · a view entrega só números crus — sem limite calculado, origem nem alerta'
);
select is(
  (select array_agg(perfil::text order by perfil::text) from public.perfil_permissao
    where recurso = 'previsto_proens' and acao = 'editar' and permitido),
  array['admin', 'ajudante_administracao_academica', 'encarregado_administracao_academica'],
  'FR-008.1 · previsto_proens.editar: Admin, Encarregado e Ajudante'
);

-- ── a trilha ──
insert into public.previstos_proens_turma (id, turma_id, categoria, tempos_previstos)
values ('d1267000-0000-0000-0000-000000000001', 'd1265000-0000-0000-0000-000000000001', 'TAD', 5);
update public.previstos_proens_turma set tempos_previstos = 7 where id = 'd1267000-0000-0000-0000-000000000001';
update public.previstos_proens_turma set tempos_previstos = 7 where id = 'd1267000-0000-0000-0000-000000000001';
select results_eq(
  $$select tempos_antes, tempos_depois from public.previstos_proens_alteracoes
     where previsto_id = 'd1267000-0000-0000-0000-000000000001' order by registrado_em, tempos_depois$$,
  $$values (null::int, 5), (5, 7)$$,
  'FR-008.2 · a trilha ganha linha no INSERT e no UPDATE que muda o valor; a gravação igual não conta'
);
select throws_ok(
  $$update public.previstos_proens_alteracoes set tempos_depois = 1$$,
  '42501', null, 'FR-008.2 · UPDATE na trilha recusado'
);
select throws_ok(
  $$delete from public.previstos_proens_alteracoes$$,
  '42501', null, 'FR-008.2 · DELETE na trilha recusado'
);
select throws_ok(
  $$truncate public.previstos_proens_alteracoes$$,
  '42501', null, 'FR-008.2 · TRUNCATE na trilha recusado (o gatilho de comando pega também a service_role)'
);
select throws_ok(
  $$insert into public.previstos_proens_turma (turma_id, categoria, tempos_previstos)
    values ('d1265000-0000-0000-0000-000000000001', 'TAD', 1)$$,
  '23505', null, 'previsto_unico · um previsto ativo por turma e categoria'
);
select lives_ok(
  $$update public.previstos_proens_turma set status = 'inativo' where id = 'd1267000-0000-0000-0000-000000000001';
    insert into public.previstos_proens_turma (turma_id, categoria, tempos_previstos)
    values ('d1265000-0000-0000-0000-000000000001', 'TAD', 1)$$,
  'previsto_unico · índice PARCIAL: inativar e recriar o mesmo par passa'
);

-- ── a view ──
select is(
  (select (cumprido, previsto) from public.vw_conformidade_tetos
    where turma_id = 'd1265000-0000-0000-0000-000000000001' and categoria = 'TAD'),
  (0::bigint, 1),
  'A view devolve o cumprido e o previsto ATIVO da turma'
);
select is(
  (select (limite_declarado, ch_curricular) from public.vw_conformidade_tetos
    where curso_codigo = 'C-Ap-HN' and categoria = 'AEC' and ano_letivo = 2026),
  case when exists (select 1 from public.limites_curriculo l join public.cursos c on c.id = l.curso_id where c.codigo = 'C-Ap-HN')
       then (65, 1257::bigint) end,
  'M-8 · C-Ap-HN AEC: limite declarado 65 e CH curricular 1.257 (base carregada)'
);

-- ── D-3 e RN-2027-03 ──
select is(
  (select count(*)::int from public.reservas_proens r
    where r.status = 'ativo' and r.curso_id is not null
      and not exists (select 1 from public.previstos_proens_turma p join public.turmas t on t.id = p.turma_id
                       where t.curso_id = r.curso_id and t.ano_letivo = r.ano and p.status = 'ativo'
                         and p.categoria::text = r.tipo_reserva::text and p.tempos_previstos = r.tempos_reservados)),
  0,
  'RN-2027-03 · toda reserva com curso tem o previsto IGUAL na turma do mesmo curso e ano (na base limpa: nenhuma reserva)'
);
select is(
  (select count(*)::int from public.reservas_proens where status = 'ativo' and curso_id is null)
  - (select count(*)::int from public.config_parametros where chave like 'proens.reserva_generica_%' and status = 'ativo'),
  0,
  'RN-2027-03 · a genérica está em config_parametros (sugestão), nunca como previsto de turma'
);

select * from finish();
rollback;
