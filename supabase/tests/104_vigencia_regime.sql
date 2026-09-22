-- =================================================================================
-- 104 — A vigência de regime (Épico 5, fatia (a), migration 6)
--
-- O QUÊ  : a vigência é append-only; a sucessão é explícita; a correção é atômica; vigência
--          nova não reinterpreta lançamento; curso não existe sem regime.
--          RN-2027-09 · FR-019 a FR-019.5 · FR-020 · FR-021 a FR-021.9 · FR-023 ·
--          SC-006, SC-011.1 a SC-011.5, SC-011.7 · invariantes I-7, I-8, I-8b, I-8c, I-11.
--
-- ⚠️ A REGRA, EM UMA FRASE (RN-2027-09): *"a mudança nunca altera a interpretação de registros já
--    lançados sob a configuração anterior"*. Um DSA impresso em março foi calculado com o regime de
--    março. Uma vigência gravada depois, com data no passado, recalcularia aquele horário EM
--    SILÊNCIO — e é por isso que o banco recusa, em vez de avisar.
--
-- ⚠️ GATILHO DE RESTRIÇÃO ADIADO SÓ DISPARA NO `COMMIT`, e o pgTAP roda dentro de `begin … rollback`
--    — ele nunca chega lá. `set constraints … immediate` força a conferência no ponto onde o teste
--    a quer, e é a única forma de provar uma garantia adiada dentro de uma transação desfeita.
--
-- ⚠️ E A CORRIDA NÃO SE PROVA AQUI. Corrida precisa de DUAS SESSÕES CONCORRENTES, e este arquivo é
--    uma só: um teste sequencial não produz a corrida que ele diz medir. A prova mora em
--    `scripts/provas/provar_corrida_vigencia.py`, com duas conexões e defeito deliberado.
-- =================================================================================

begin;
select plan(38);

-- --------------------------------------------------------------------------- amostra
insert into auth.users (id, email, aud, role) values
  ('a0000000-0000-0000-0000-000000000104', 't104-admin@ciaara.teste', 'authenticated', 'authenticated');
insert into public.usuarios (codigo, auth_user_id, email, nome, perfil) values
  ('T104-USR-ADM', 'a0000000-0000-0000-0000-000000000104', 't104-admin@ciaara.teste', 'Admin T104', 'admin');
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000104', true);

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
  -- ⚠️ Nem todo DETAIL e JSON: o do contrato desta fatia e, mas o de uma restricao do motor — a
  -- `EXCLUDE` de sobreposicao, por exemplo — e texto do PostgreSQL. Tentar `::jsonb` direto
  -- derruba o helper e o arquivo inteiro reprova antes da assercao que interessa.
  begin
    v_json := nullif(v_detail, '')::jsonb;
  exception when others then
    v_json := to_jsonb(v_detail);
  end;
  return jsonb_build_object('recusou', true, 'sqlstate', sqlstate, 'hint', v_hint, 'detail', v_json);
end;
$f$;

-- O curso nasce PELA RPC — é o único caminho, e o gatilho adiado recusa quem tentar só o curso.
select public.criar_curso_com_regime(
  '{"codigo":"T104-CUR","nome_curso":"Curso T104","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2040-01-01"}'::jsonb);

create temporary table _t104 as
  select id as curso_id from public.cursos where codigo = 'T104-CUR';

-- ⚠️ `tipos_avaliacao` e domínio ADMINISTRÁVEL, e na base do `db:reset` ele está VAZIO — quem o
--    semeia é o ETL. Sem esta linha, o gatilho genérico recusa a avaliação da amostra, e o arquivo
--    reprovaria por vocabulário em vez de por regime.
insert into public.config_listas (lista, valor, rotulo_exibicao)
  values ('tipos_avaliacao', 'Prova T104', 'Prova T104');

-- =================================================================================
-- PARTE 1 — append-only, sucessão e código
-- =================================================================================

-- ⚠️ A ASSERÇÃO NOMEADA DA REGRA DE RISCO ALTO. Três vigências sucessivas, e cada data resolvendo
--    pelo regime que valia NAQUELE dia — é o critério 7 do documento 06, provado aqui.
select public.registrar_vigencia_regime((select curso_id from _t104),
  '{"regime_tempos":9,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2040-06-01"}'::jsonb);
select public.registrar_vigencia_regime((select curso_id from _t104),
  '{"regime_tempos":6,"ta_duracao_min":50,"intervalo_manha_min":15,"intervalo_tarde_min":15,
    "hora_inicio_manha":"08:00","hora_inicio_tarde":"14:00","vigente_de":"2041-01-01"}'::jsonb);

select results_eq(
  $$select (app.fn_regime_vigente((select curso_id from _t104), d)).regime_tempos
      from (values ('2040-03-15'::date), ('2040-08-20'::date), ('2041-03-10'::date)) as v(d)$$,
  $$values (8::smallint), (9::smallint), (6::smallint)$$,
  'RN-2027-09 · três vigências sucessivas resolvem cada lançamento pelo regime da SUA data'
);

select results_eq(
  $$select vigente_de, vigente_ate from public.curso_regime_historico
     where curso_id = (select curso_id from _t104) and status = 'ativo' order by vigente_de$$,
  $$values ('2040-01-01'::date, '2040-05-31'::date),
           ('2040-06-01'::date, '2040-12-31'::date),
           ('2041-01-01'::date, null::date)$$,
  'FR-019 · a sucessão é EXPLÍCITA: cada anterior recebe a véspera da seguinte, na mesma transação'
);

select matches(
  (select codigo from public.curso_regime_historico
    where curso_id = (select curso_id from _t104) and vigente_de = '2041-01-01'),
  '^REG-[0-9]{6}$',
  'FR-019.3 · o código da vigência é gerado pelo banco, no formato real REG-NNNNNN'
);

-- ------------------------------------------------- FR-020 — nenhum parâmetro se altera, um por coluna
-- ⚠️ UMA ASSERÇÃO POR COLUNA, e não uma só com todas: um gatilho que recusasse só a primeira
--    passaria num teste que mandasse todas juntas.
select is(
  (pg_temp.recusa(format(
     $$update public.curso_regime_historico set %s where curso_id = (select curso_id from _t104) and vigente_de = '2041-01-01'$$,
     coluna)) ->> 'hint'),
  'vigencia_imutavel',
  'FR-020 · alterar ' || coluna || ' numa vigência existente é RECUSADO'
)
from unnest(array[
  'regime_tempos = 7',
  'ta_duracao_min = 45',
  'intervalo_manha_min = 5',
  'intervalo_tarde_min = 5',
  $$hora_inicio_manha = '09:00'$$,
  $$hora_inicio_tarde = '15:00'$$,
  $$tipo_regime = 'excecao'$$,
  $$vigente_de = '2041-02-01'$$,
  $$fundamento_curricular = 'outro'$$,
  $$motivo = 'outro'$$,
  $$codigo = 'REG-999999'$$
]) as coluna;

-- ------------------------------------------------- FR-020 — as DUAS escritas que passam
select lives_ok(
  $$update public.curso_regime_historico set vigente_ate = '2041-12-31'
     where curso_id = (select curso_id from _t104) and vigente_de = '2041-01-01'$$,
  'FR-020 · gravar `vigente_ate` numa vigência ATIVA é aceito — é a escrita da sucessão'
);

-- ⚠️ E AGORA A VIGÊNCIA FICOU COM FIM E SEM SUCESSORA. O gatilho de restrição é ADIADO: só
--    `set constraints … immediate` o traz para dentro desta transação.
select is(
  (pg_temp.recusa('set constraints trg_curso_regime_encadeamento immediate') ->> 'hint'),
  'vigencia_sem_sucessora',
  'FR-020 · vigência encerrada SEM sucessora é recusada — o curso ficaria sem regime a partir do dia seguinte'
);

update public.curso_regime_historico set vigente_ate = null
 where curso_id = (select curso_id from _t104) and vigente_de = '2041-01-01';
select lives_ok(
  'set constraints trg_curso_regime_encadeamento immediate',
  'FR-020 · e com a ponta aberta de novo, o encadeamento fecha'
);

-- ⚠️ E VOLTA A SER ADIADO. `set constraints … immediate` vale ATÉ O FIM DA TRANSAÇÃO, não só para o
--    comando seguinte: deixá-lo ligado faria o gatilho disparar no MEIO da RPC de correção — que
--    cancela uma vigência antes de inserir a sucessora e, por um instante legítimo, deixa a
--    anterior com fim e sem sucessora. Medido em 18/09/2026: sem esta linha, a correção reprova
--    com `vigencia_sem_sucessora`, que é justamente o estado intermediário que o adiamento existe
--    para tolerar.
set constraints all deferred;

-- ------------------------------------------------- a sobreposição direta continua 23P01
select is(
  (pg_temp.recusa(
     $$insert into public.curso_regime_historico
        (curso_id, tipo_regime, regime_tempos, ta_duracao_min, intervalo_manha_min,
         intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde, vigente_de)
       values ((select curso_id from _t104), 'padrao', 8, 45, 10, 10, '07:30', '13:30', '2041-06-01')$$)
   ->> 'sqlstate'),
  '23P01',
  'Épico 1 · inserir vigência SOLTA, sobrepondo a ativa, continua recusado por `regime_sem_sobreposicao`'
);

-- ------------------------------------------------- append-only: nem DELETE, nem TRUNCATE
set local role service_role;
select is(
  (pg_temp.recusa('delete from public.curso_regime_historico') ->> 'sqlstate'),
  'P0001',
  'FR-020 · DELETE em vigência é recusado TAMBÉM para service_role'
);
select is(
  (pg_temp.recusa('truncate public.curso_regime_historico') ->> 'sqlstate'),
  'P0001',
  'FR-020 · TRUNCATE também — a lacuna do migracao_log (PEND-5a-3) não se repete aqui'
);
reset role;
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000104', true);

-- =================================================================================
-- PARTE 2 — a correção, e o que a trava
-- =================================================================================

-- FR-021.9 — corrigir MANTENDO a data: a cancelada guarda a data dela, e só o índice PARCIAL
-- permite que a sucessora comece no mesmo dia.
select lives_ok(
  $$select public.corrigir_vigencia_regime(
      (select id from public.curso_regime_historico
        where curso_id = (select curso_id from _t104) and vigente_de = '2041-01-01' and status = 'ativo'),
      '{"regime_tempos":7}'::jsonb)$$,
  'FR-021.9 · vigência sem lançamento é corrigida MANTENDO a data de início'
);

select results_eq(
  $$select status::text, regime_tempos from public.curso_regime_historico
     where curso_id = (select curso_id from _t104) and vigente_de = '2041-01-01'
     order by status$$,
  $$values ('ativo'::text, 7::smallint), ('cancelado'::text, 6::smallint)$$,
  'FR-021.1 · a anterior fica CANCELADA e a sucessora ativa — append-only, sem UPDATE de parâmetro'
);

-- FR-021.2 — e agora com lançamento, UM CASO POR TABELA.
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('20400000-0000-0000-0000-000000000001', 'T104-D1', (select curso_id from _t104), 'T104', 'Disciplina T104', 30);
insert into public.unidades_ensino (id, codigo, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos) values
  ('30400000-0000-0000-0000-000000000001', 'T104-UE1', '20400000-0000-0000-0000-000000000001',
   (select curso_id from _t104), 1, 'Unidade T104', 30);
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('40400000-0000-0000-0000-000000000001', 'T104-INS', 'CT', '-EF', 'Instrutor T104', 'Militar', 'CIAARA');
insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino) values
  ('50400000-0000-0000-0000-000000000001', (select curso_id from _t104), 'T1', 2041,
   'ativa', 'presencial', '2041-01-05', '2041-11-30');

create temporary table _vig as
  select id, codigo from public.curso_regime_historico
   where curso_id = (select curso_id from _t104) and vigente_de = '2041-01-01' and status = 'ativo';

insert into public.registros_aula
  (codigo, data, turma_id, unidade_ensino_id, curso_id, tempos_consumidos, ta_inicial,
   categoria_normativa, instrutor_id)
values ('T104-REG-1', '2041-03-10', '50400000-0000-0000-0000-000000000001',
        '30400000-0000-0000-0000-000000000001', (select curso_id from _t104), 2, 1,
        'atividade_extraclasse', '40400000-0000-0000-0000-000000000001');

select results_eq(
  $$select r ->> 'hint', r -> 'detail' ->> 'tipo', (r -> 'detail' ->> 'total')::int
      from (select pg_temp.recusa(
              $x$select public.corrigir_vigencia_regime((select id from _vig), '{"regime_tempos":5}'::jsonb)$x$) as r) x$$,
  $$values ('vigencia_com_lancamento'::text, 'aula'::text, 1)$$,
  'FR-021.2 · vigência com AULA lançada não é corrigida, e a recusa diz o tipo e o total'
);

insert into public.avaliacoes (codigo, turma_id, disciplina_id, curso_id, tipo_avaliacao, data_avaliacao) values
  ('T104-AVA-1', '50400000-0000-0000-0000-000000000001', '20400000-0000-0000-0000-000000000001',
   (select curso_id from _t104), 'Prova T104', '2041-04-10');
select is(
  (pg_temp.recusa($$select public.corrigir_vigencia_regime((select id from _vig), '{"regime_tempos":5}'::jsonb)$$)
   ->> 'hint'),
  'vigencia_com_lancamento',
  'FR-021.2 · AVALIAÇÃO pela data também trava'
);

delete from public.registros_aula where codigo = 'T104-REG-1';
update public.avaliacoes set data_avaliacao = '2039-01-01', data_vista_prova = '2041-05-10'
 where codigo = 'T104-AVA-1';
select is(
  (pg_temp.recusa($$select public.corrigir_vigencia_regime((select id from _vig), '{"regime_tempos":5}'::jsonb)$$)
   ->> 'hint'),
  'vigencia_com_lancamento',
  'FR-021.2 · e a VISTA DE PROVA trava sozinha — é lançamento com horário próprio'
);

update public.avaliacoes set data_vista_prova = null where codigo = 'T104-AVA-1';
insert into public.atividades_nao_letivas (codigo, categoria_normativa, data, descricao, tempos_consumidos, escopo, turma_id) values
  ('T104-ATV-1', 'AEC', '2041-06-10', 'Atividade da turma T104', 2, 'turma', '50400000-0000-0000-0000-000000000001');
select is(
  (pg_temp.recusa($$select public.corrigir_vigencia_regime((select id from _vig), '{"regime_tempos":5}'::jsonb)$$)
   ->> 'hint'),
  'vigencia_com_lancamento',
  'FR-021.2 · ATIVIDADE de escopo de turma trava, chegando ao curso pela turma'
);

-- ------------------------------------------------- FR-021.5 — a atividade GLOBAL, nos quatro resultados
delete from public.atividades_nao_letivas where codigo = 'T104-ATV-1';
insert into public.atividades_nao_letivas (codigo, categoria_normativa, data, descricao, tempos_consumidos, escopo) values
  ('T104-GLOB-1', 'TAD', '2041-07-15', 'Formatura do Centro', 4, 'global');

select results_eq(
  $$select r -> 'detail' ->> 'tipo', r -> 'detail' ->> 'turma', r -> 'detail' ->> 'atividade'
      from (select pg_temp.recusa(
              $x$select public.corrigir_vigencia_regime((select id from _vig), '{"regime_tempos":5}'::jsonb)$x$) as r) x$$,
  $$values ('atividade_global'::text, 'T104-CUR T1 2041'::text, 'Formatura do Centro'::text)$$,
  'FR-021.5 caso 1 / FR-021.6 · janela COMPLETA contendo a data trava, e a recusa NOMEIA atividade e turma'
);

update public.turmas set data_inicio = null, data_termino = null
 where id = '50400000-0000-0000-0000-000000000001';
select is(
  (pg_temp.recusa($$select public.corrigir_vigencia_regime((select id from _vig), '{"regime_tempos":5}'::jsonb)$$)
   ->> 'recusou')::boolean,
  false,
  'FR-021.5 caso 2 · turma SEM datas NÃO é alcançada — sem janela não há horário calculável a proteger'
);

-- A correção acima passou: a vigência ativa agora é outra. Segue-se com a nova.
delete from _vig;
insert into _vig select id, codigo from public.curso_regime_historico
 where curso_id = (select curso_id from _t104) and vigente_de = '2041-01-01' and status = 'ativo';

update public.turmas set data_inicio = '2041-01-05', data_termino = null
 where id = '50400000-0000-0000-0000-000000000001';
select results_eq(
  $$select r ->> 'hint', r -> 'detail' ->> 'ponta_ausente'
      from (select pg_temp.recusa(
              $x$select public.corrigir_vigencia_regime((select id from _vig), '{"regime_tempos":4}'::jsonb)$x$) as r) x$$,
  $$values ('vigencia_com_lancamento'::text, 'termino'::text)$$,
  'FR-021.5 caso 3 / FR-021.6 · janela INCOMPLETA compatível trava, e a recusa diz QUAL ponta falta'
);

-- ⚠️ E NENHUMA DECISÃO PELO STATUS DA TURMA: ele é mutável, e decidir por ele destravaria a
--    vigência no dia em que alguém marcasse a turma como concluída.
update public.turmas set status = 'concluida' where id = '50400000-0000-0000-0000-000000000001';
select is(
  (pg_temp.recusa($$select public.corrigir_vigencia_regime((select id from _vig), '{"regime_tempos":4}'::jsonb)$$)
   ->> 'hint'),
  'vigencia_com_lancamento',
  'FR-021.5 · marcar a turma como CONCLUÍDA não destrava a vigência — decide-se pela janela, nunca pelo status'
);

-- =================================================================================
-- PARTE 3 — vigência nova não reinterpreta, e curso não existe sem regime
-- =================================================================================
update public.turmas set data_inicio = '2041-01-05', data_termino = '2041-11-30'
 where id = '50400000-0000-0000-0000-000000000001';
delete from public.atividades_nao_letivas where codigo = 'T104-GLOB-1';
update public.avaliacoes set data_avaliacao = '2041-04-10' where codigo = 'T104-AVA-1';

select results_eq(
  $$select r ->> 'hint', (r -> 'detail' ->> 'total')::int
      from (select pg_temp.recusa(
              $x$select public.registrar_vigencia_regime((select curso_id from _t104),
                   '{"regime_tempos":3,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
                     "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2041-02-01"}'::jsonb)$x$) as r) x$$,
  $$values ('vigencia_reinterpretaria_lancamento'::text, 1)$$,
  'FR-019.4 · vigência nova cujo período contém lançamento é RECUSADA — a RN-2027-09 vale no registro também'
);

select lives_ok(
  $$select public.registrar_vigencia_regime((select curso_id from _t104),
      '{"regime_tempos":3,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
        "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2042-01-01"}'::jsonb)$$,
  'FR-019.4 · e vigência FUTURA é aceita — ela nunca encontra lançamento'
);

-- ------------------------------------------------- FR-019.5 — curso sem regime, pelos dois caminhos
select is(
  (pg_temp.recusa($$
     insert into public.cursos (codigo, nome_curso, classificacao, modalidade, duracao_dias)
       values ('T104-SEM','Curso sem regime','regular','presencial',30);
     set constraints trg_cursos_com_regime immediate;
   $$) ->> 'hint'),
  'curso_sem_regime',
  'FR-019.5 · curso inserido SOLTO, sem vigência padrão, é recusado no fim da transação'
);

select is(
  (pg_temp.recusa($$
     update public.curso_regime_historico set status = 'cancelado'
      where curso_id = (select curso_id from _t104) and status = 'ativo' and vigente_de = '2040-01-01';
     update public.curso_regime_historico set status = 'cancelado'
      where curso_id = (select curso_id from _t104) and status = 'ativo';
     set constraints trg_regime_curso_continua_com_regime immediate;
   $$) ->> 'recusou')::boolean,
  true,
  'FR-019.5 · e cancelar TODAS as vigências padrão do curso também é recusado — por qualquer caminho'
);

-- ------------------------------------------------- FR-021.8 — a leitura da proteção
insert into public.atividades_nao_letivas (codigo, categoria_normativa, data, descricao, tempos_consumidos, escopo) values
  ('T104-GLOB-2', 'TAD', '2041-08-20', 'Segunda formatura', 4, 'global');
-- ⚠️ A avaliação sai daqui, e é o que torna esta asserção útil: com ela no lugar, as vigências
--    estariam travadas por lançamento PRÓPRIO, e o aviso do `FR-021.8` diria que encurtar a janela
--    não desprotege nada. Sem ela, a única coisa que as trava é a atividade global — que é
--    exatamente o caso que o aviso existe para nomear.
delete from public.avaliacoes where codigo = 'T104-AVA-1';

-- MEDIDO, e contraria a expectativa de quem escreveu a asserção primeiro: a atividade global trava
-- TODAS as vigências ativas cujo início é anterior a ela — três —, e não só a mais recente. Ela é
-- um lançamento com data, e toda vigência que começou antes dessa data o contém.
select is(
  (select count(*)::int from public.protecao_das_vigencias_por_atividade_global((select curso_id from _t104))),
  3,
  'FR-021.8 · a RPC devolve as TRÊS vigências ativas que a atividade global alcança — a de 2042 começa depois dela'
);

select results_eq(
  $$select atividade, turmas, travada_por_lancamento_proprio
      from public.protecao_das_vigencias_por_atividade_global((select curso_id from _t104))
     order by vigente_de desc limit 1$$,
  $$values ('Segunda formatura'::text, array['T104-CUR T1 2041']::text[], false)$$,
  'FR-021.8 · nomeando a atividade, AS TURMAS pelas quais ela alcança, e que não há lançamento próprio'
);

-- ⚠️ SEM `turmas.editar`, VAZIO — e não erro. A RPC é `SECURITY DEFINER` para enxergar atividade e
--    turma que a RLS talvez não mostre, e não para furar o porteiro.
select set_config('request.jwt.claim.sub', null, true);
select is(
  (select count(*)::int from public.protecao_das_vigencias_por_atividade_global((select curso_id from _t104))),
  0,
  'FR-021.8 · quem não tem `turmas.editar` recebe VAZIO, não erro e não dado'
);
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000104', true);

-- ------------------------------------------------- FR-023 — o parâmetro do 9º TA
select results_eq(
  $$select valor, tipo, unidade, natureza,
           coalesce(btrim(fundamento_normativo), '') <> '' as tem_fundamento
      from public.config_parametros
     where chave = 'regime.nono_ta_dias_por_semana_sem_aviso' and status = 'ativo'$$,
  $$values ('2'::text, 'inteiro'::text, 'dias/semana'::text, 'operacional'::text, true)$$,
  'FR-023 · o 9º TA é parâmetro OPERACIONAL com valor 2 — o número é decisão da Divisão, e a norma fica no fundamento'
);

select * from finish();
rollback;
