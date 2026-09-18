-- =================================================================================
-- 105 — Curso inativo (Épico 5, fatia (a), migration 7)
--
-- O QUÊ  : curso inativo continua **legível e alcançável** no escopo, e **não recebe escrita
--          nova** em nenhuma das tabelas que dependem dele; reativar é só a situação, decidida
--          POR VALOR; desativar exige permissão e nenhuma turma pendente.
--          FR-017 a FR-017.9 · SC-001.3, SC-001.5 · invariantes I-9 e I-10.
--
-- ⚠️ A COMPLETUDE SE PROVA POR ENUMERAÇÃO, NÃO POR AMOSTRAGEM (exigência de Bernardo Villas Boas,
--    18/09/2026). O risco aqui **não é uma policy quebrar** — é **uma ficar de fora**, e a tabela
--    seguir aceitando escrita em curso inativo, em silêncio, sem erro nenhum. Testar policy por
--    policy não pega isso: o que pega é afirmar o **conjunto**. É a mesma passagem que o
--    `010_estrutura.sql` fez, de contagem para conjunto de nomes, e pelo mesmo motivo.
--
-- ⚠️ E O COMPORTAMENTO NÃO SE PROVA AQUI. Este arquivo roda como **dono do schema**, e sob
--    privilégio de dono **a RLS não se aplica**: uma asserção de "esta escrita é recusada pela
--    policy" passaria com a RLS desligada. As recusas com `42501`, o `UPDATE` que devolve zero
--    linhas e o **caso que discrimina** estão em `tests/invariantes/rls/cursos-e-turmas.test.ts`,
--    com sessão autenticada de verdade (`CLAUDE.md`, *Definition of Done* item 4).
--    Aqui ficam: a **enumeração** das policies, e o que é **gatilho ou função** — que valem para o
--    dono do schema tanto quanto para qualquer um.
-- =================================================================================

begin;
select plan(15);

-- --------------------------------------------------------------------------- amostra
insert into auth.users (id, email, aud, role) values
  ('a0000000-0000-0000-0000-000000000105', 't105-admin@ciaara.teste', 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000106', 't105-ope@ciaara.teste', 'authenticated', 'authenticated');
insert into public.usuarios (codigo, auth_user_id, email, nome, perfil, escopo_curso) values
  ('T105-USR-ADM', 'a0000000-0000-0000-0000-000000000105', 't105-admin@ciaara.teste', 'Admin T105', 'admin', 'geral'),
  ('T105-USR-OPE', 'a0000000-0000-0000-0000-000000000106', 't105-ope@ciaara.teste', 'Ope T105', 'operador', 'expedito');
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000105', true);

create function pg_temp.recusa(p_sql text) returns jsonb
language plpgsql as $f$
declare
  v_hint text;
  v_detail text;
  v_json jsonb;
begin
  execute p_sql;
  return jsonb_build_object('recusou', false);
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint, v_detail = pg_exception_detail;
  begin
    v_json := nullif(v_detail, '')::jsonb;
  exception when others then
    v_json := to_jsonb(v_detail);
  end;
  return jsonb_build_object('recusou', true, 'sqlstate', sqlstate, 'hint', v_hint, 'detail', v_json);
end;
$f$;

select public.criar_curso_com_regime(
  '{"codigo":"T105-EXP","nome_curso":"Curso T105 expedito","classificacao":"expedito",
    "modalidade":"presencial","duracao_dias":10}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2020-01-01"}'::jsonb);

create temporary table _t105 as select id as curso_id from public.cursos where codigo = 'T105-EXP';

insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('20500000-0000-0000-0000-000000000001', 'T105-D1', (select curso_id from _t105), 'T105', 'Disciplina T105', 30);

-- =================================================================================
-- A ENUMERAÇÃO — o conjunto, não as instâncias
-- =================================================================================
--
-- A lista das 15 tabelas é a do `data-model.md` §3, transcrita. Tabela nova que passe a depender
-- do curso entra AQUI e na migration, juntas — como a lista do `FR-021.2`.
create temporary table _protegidas as
select * from (values
  ('turmas',                     'curso_em_oferta'),
  ('curso_regime_historico',     'curso_em_oferta'),
  ('responsaveis_curso',         'curso_em_oferta'),
  ('disciplinas',                'curso_em_oferta'),
  ('unidades_ensino',            'curso_em_oferta'),
  ('avaliacoes_planejadas',      'curso_em_oferta'),
  ('registros_aula',             'curso_em_oferta'),
  ('avaliacoes',                 'curso_em_oferta'),
  ('janelas_curso',              'curso_em_oferta'),
  ('planejamento_anual',         'curso_em_oferta'),
  ('reservas_proens',            'curso_em_oferta'),
  ('turma_disciplina',           'turma_em_oferta'),
  ('turma_disciplina_instrutor', 'turma_em_oferta'),
  ('atividades_nao_letivas',     'turma_em_oferta'),
  ('instrutor_disciplina',       'disciplina_em_oferta')
) as v(tabela, chave);

-- ⚠️ ESTA É A ASSERÇÃO QUE PEGA O QUE FALTA. Ela lista, pelo nome, toda policy de escrita de uma
--    tabela protegida que NÃO carrega a condição de oferta. Uma policy esquecida aparece aqui;
--    quinze testes de comportamento, um por tabela, não a mostrariam — mostrariam só que as
--    quatorze que alguém lembrou de testar funcionam.
select is_empty(
  $$select (p.polrelid::regclass)::text || ' · ' || p.polname
      from pg_policy p
      join _protegidas t on t.tabela = (p.polrelid::regclass)::text
     where p.polcmd in ('a', 'w')
       and coalesce(pg_get_expr(p.polqual, p.polrelid), '')
           || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') not like '%' || t.chave || '%'$$,
  'FR-017.5 · NENHUMA policy de escrita das tabelas protegidas ficou sem a condicao de oferta'
);

-- E o contrapeso da enumeracao: o conjunto de TABELAS cobertas e exatamente o declarado. Sem esta,
-- apagar uma linha da lista acima faria a assercao de cima passar por ter menos o que conferir.
select results_eq(
  $$select t.tabela from _protegidas t order by t.tabela$$,
  $$select (p.polrelid::regclass)::text from pg_policy p
     where p.polcmd in ('a', 'w')
       and coalesce(pg_get_expr(p.polqual, p.polrelid), '')
           || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') ~ '(curso|turma|disciplina)_em_oferta'
     group by 1 order by 1$$,
  'FR-017.5 · e o conjunto de tabelas com a condicao e EXATAMENTE o declarado — nem mais, nem menos'
);

select is(
  (select count(*)::int from pg_policy p
     join _protegidas t on t.tabela = (p.polrelid::regclass)::text
    where p.polcmd in ('a', 'w')),
  30,
  'FR-017.5 · sao 30 policies de escrita em 15 tabelas — duas por tabela, criar e editar'
);

-- ⚠️ E `cursos_editar` NAO carrega a condicao, de proposito: a excecao cirurgica da reativacao mora
--    no GATILHO, e nao na policy. Uma policy que recusasse escrita em curso inativo tornaria o curso
--    IRREATIVAVEL — o estado seria absorvente, e so a migration seguinte o tiraria de la.
select is_empty(
  $$select polname from pg_policy
     where polrelid = 'public.cursos'::regclass and polcmd in ('a', 'w')
       and coalesce(pg_get_expr(polqual, polrelid), '')
           || coalesce(pg_get_expr(polwithcheck, polrelid), '') like '%em_oferta%'$$,
  'FR-017.7 · `cursos` NAO recebe a condicao — senao o curso inativo nunca mais seria reativado'
);

-- =================================================================================
-- O ALCANCE — curso inativo continua alcancavel (FR-017.1)
-- =================================================================================
update public.cursos set status = 'inativo' where id = (select curso_id from _t105);

select ok(
  (select curso_id from _t105) in (select app.cursos_do_usuario()),
  'FR-017.1 · o ramo do Admin devolve o curso INATIVO — desativar nao e esconder'
);

select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000106', true);
select ok(
  (select curso_id from _t105) in (select app.cursos_do_usuario()),
  'FR-017.1 · e o ramo do Operador tambem, dentro do escopo dele'
);
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000105', true);

-- =================================================================================
-- A REATIVACAO — decidida POR VALOR, e provada pelo CAMINHO REAL (FR-017.7)
-- =================================================================================
--
-- ⚠️ PELO CAMINHO REAL, E NAO PELO LIMPO (exigência de Bernardo Villas Boas, 18/09/2026). A regra
--    foi escrita em termos de VALOR ALTERADO, e nao de coluna enviada, EXATAMENTE porque formulario
--    reenvia a linha inteira. Provar so com um `UPDATE` que manda a situacao sozinha deixaria a
--    garantia inteira sem prova: seria testar o caminho que o requisito NAO precisou prever.
select lives_ok(
  $$update public.cursos set
      status = 'ativo',
      codigo = codigo, nome_curso = nome_curso, classificacao = classificacao,
      modalidade = modalidade, proposito = proposito, limite_turmas_ano = limite_turmas_ano,
      duracao_semanas = duracao_semanas, duracao_dias = duracao_dias,
      prioridade_alocacao = prioridade_alocacao
    where id = (select curso_id from _t105)$$,
  'FR-017.7 · reativar REENVIANDO A LINHA INTEIRA e aceito — a regra e por valor, e o formulario reenvia tudo'
);

update public.cursos set status = 'inativo' where id = (select curso_id from _t105);
select is(
  (pg_temp.recusa(
     $$update public.cursos set status = 'ativo', proposito = 'mudou junto'
        where id = (select curso_id from _t105)$$) ->> 'hint'),
  'curso_inativo_so_reativa',
  'FR-017.7 · mas mudar a situacao E outra coluna junto e RECUSADO — reativar nao carrega edicao a reboque'
);

select lives_ok(
  $$update public.cursos set status = 'ativo' where id = (select curso_id from _t105)$$,
  'FR-017.7 · e a situacao sozinha, claro, tambem passa'
);

-- =================================================================================
-- A DESATIVACAO — permissao e nenhuma turma pendente (FR-017.4)
-- =================================================================================
insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade) values
  ('50500000-0000-0000-0000-000000000001', (select curso_id from _t105), 'T1', 2050, 'planejada', 'presencial');

select results_eq(
  $$select r ->> 'hint', r -> 'detail' -> 'turmas' -> 0 ->> 'codigo'
      from (select pg_temp.recusa(
              $x$update public.cursos set status = 'inativo' where id = (select curso_id from _t105)$x$) as r) x$$,
  $$values ('curso_com_turma_pendente'::text, 'T105-EXP T1 2050'::text)$$,
  'FR-017.4 · desativar com turma planejada e RECUSADO, e a recusa NOMEIA a turma'
);

update public.turmas set status = 'concluida' where id = '50500000-0000-0000-0000-000000000001';
select lives_ok(
  $$update public.cursos set status = 'inativo' where id = (select curso_id from _t105)$$,
  'FR-017.4 · com a turma concluida, a desativacao passa'
);

-- ⚠️ SEM SESSAO, A DESATIVACAO E RECUSADA — e e o achado A-4: a `service_role` nao tem perfil, e a
--    guarda exige `cursos.desativar`. "Por qualquer caminho" inclui o caminho da carga.
update public.cursos set status = 'ativo' where id = (select curso_id from _t105);
select set_config('request.jwt.claim.sub', null, true);
select is(
  (pg_temp.recusa(
     $$update public.cursos set status = 'inativo' where id = (select curso_id from _t105)$$) ->> 'hint'),
  'situacao_sem_permissao',
  'FR-017 · sem sessao (o caminho da carga) a desativacao e recusada — a guarda vale por qualquer caminho'
);
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000105', true);

-- =================================================================================
-- `sincronizar_habilitacoes` COM CURSO DE VERDADE DESATIVADO (FR-017.9)
-- =================================================================================
--
-- ⚠️ COM CURSO REALMENTE DESATIVADO, e nao simulado (exigência de 18/09/2026). A pesquisa (R-2)
--    apontou que esta funcao quebraria no PRIMEIRO curso desativado: ela inativa habilitacoes por
--    diferenca, e a escrita em `instrutor_disciplina` de curso inativo passa a ser recusada.
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('40500000-0000-0000-0000-000000000001', 'T105-INS', 'CT', '-EF', 'Instrutor T105', 'Militar', 'CIAARA');
insert into public.instrutor_disciplina (codigo, instrutor_id, disciplina_id) values
  ('VIN-T105-1', '40500000-0000-0000-0000-000000000001', '20500000-0000-0000-0000-000000000001');

update public.cursos set status = 'inativo' where id = (select curso_id from _t105);

select lives_ok(
  $$select public.sincronizar_habilitacoes('40500000-0000-0000-0000-000000000001', array[]::uuid[])$$,
  'FR-017.9 · sincronizar IGNORA disciplina de curso inativo na inativacao — nao quebra no primeiro curso desativado'
);

select is(
  (select status::text from public.instrutor_disciplina where codigo = 'VIN-T105-1'),
  'ativo',
  'FR-017.9 · e a habilitacao existente no curso inativo fica INTACTA — o passado nao se reescreve'
);

select is(
  (pg_temp.recusa(
     $$select public.sincronizar_habilitacoes('40500000-0000-0000-0000-000000000001',
         array['20500000-0000-0000-0000-000000000001']::uuid[])$$) ->> 'hint'),
  'habilitacao_em_curso_inativo',
  'FR-017.9 · e MARCAR disciplina de curso inativo e recusado, com a mensagem de negocio'
);

select * from finish();
rollback;
