-- =================================================================================
-- 101 — O código e o rótulo da turma (Épico 5, fatia (a))
--
-- O QUÊ  : parte 1 — o RÓTULO tem forma imposta pelo banco: `T` maiúsculo seguido de
--          inteiro positivo, sem espaço. FR-025.2, SC-004.4, invariante I-4.
--          (A parte do código gerado entra na migration 3, na T031.)
--
-- ⚠️ POR QUE A FORMA É DO BANCO, e não só do formulário. A unicidade do FR-026 é por
--    IGUALDADE DE TEXTO: `t1`, `T1 ` com espaço e `Turma 1` passariam por ela como
--    rótulos DIFERENTES da `T1`, e gerariam código de turma fora do padrão — o código é
--    `sigla [rótulo] ano` e sai impresso no DSA.
--
-- ⚠️ E NÃO É MOTIVO DE ENDEREÇO. O `FR-031.1` proíbe restringir rótulo por causa de URL;
--    a restrição existe pela unicidade e pelo código, não pela barra de endereços.
--
-- ⚠️ MEDIDO EM 16/09/2026: os 10 rótulos da base são `T1` ou `T2`. A restrição entra
--    SEM SANEAMENTO — nenhuma turma existente precisa ser tocada para ela passar.
-- =================================================================================

begin;
select plan(29);

-- Nomeia a restricao que recusou, e nao so o SQLSTATE. O motivo esta no cabecalho do
-- `020_unicidade.sql`: com o codigo sendo funcao deterministica de curso, rotulo e ano, duas
-- restricoes ficaram acionaveis pelo mesmo caso, e `23505` sozinho deixou de dizer qual regra valeu.
create function pg_temp.restricao_violada(p_sql text) returns text
language plpgsql as $f$
declare
  v_restricao text;
begin
  execute p_sql;
  return '(nao houve recusa)';
exception when others then
  get stacked diagnostics v_restricao = constraint_name;
  return sqlstate || ' · ' || coalesce(nullif(v_restricao, ''), '(sem nome de restricao)');
end;
$f$;

-- E o que a recusa CARREGA — chave estavel e dados —, que e o que a Server Action le.
create function pg_temp.recusa(p_sql text) returns jsonb
language plpgsql as $f$
declare
  v_hint text;
  v_detail text;
begin
  execute p_sql;
  return jsonb_build_object('recusou', false);
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint, v_detail = pg_exception_detail;
  return jsonb_build_object('recusou', true, 'sqlstate', sqlstate, 'hint', v_hint,
                            'detail', nullif(v_detail, '')::jsonb);
end;
$f$;

create temporary table _ha_dado as
select (select count(*) from public.turmas) > 0 as sim;

\set motivo 'base vazia — rode o ETL antes; nao foi verificado, e nao e aprovacao'

-- --------------------------------------------------------------------------- amostra
insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('10100000-0000-0000-0000-000000000101', 'T101-CUR', 'Curso T101', 'expedito', 'presencial', 10);

-- ================================================= FR-025.2 — os quatro que sao recusados
select throws_ok(
  $$insert into public.turmas (codigo, curso_id, turma, ano_letivo, status, modalidade)
    values ('T101-CUR t1 2026', '10100000-0000-0000-0000-000000000101', 't1', 2026, 'planejada', 'presencial')$$,
  '23514',
  null,
  'FR-025.2 · rotulo em minuscula (t1) e RECUSADO — a unicidade e por igualdade de texto'
);

select throws_ok(
  $$insert into public.turmas (codigo, curso_id, turma, ano_letivo, status, modalidade)
    values ('T101-CUR T1 2026', '10100000-0000-0000-0000-000000000101', 'T1 ', 2026, 'planejada', 'presencial')$$,
  '23514',
  null,
  'FR-025.2 · rotulo com espaco no fim (T1 ) e RECUSADO — invisivel na tela, diferente para o banco'
);

select throws_ok(
  $$insert into public.turmas (codigo, curso_id, turma, ano_letivo, status, modalidade)
    values ('T101-CUR Turma 1 2026', '10100000-0000-0000-0000-000000000101', 'Turma 1', 2026, 'planejada', 'presencial')$$,
  '23514',
  null,
  'FR-025.2 · rotulo por extenso (Turma 1) e RECUSADO'
);

select throws_ok(
  $$insert into public.turmas (codigo, curso_id, turma, ano_letivo, status, modalidade)
    values ('T101-CUR T0 2026', '10100000-0000-0000-0000-000000000101', 'T0', 2026, 'planejada', 'presencial')$$,
  '23514',
  null,
  'FR-025.2 · T0 e RECUSADO — o numero e inteiro POSITIVO, e nao existe turma zero'
);

-- ================================================ FR-025.2 — os que a base ja usa, aceitos
select lives_ok(
  $$insert into public.turmas (codigo, curso_id, turma, ano_letivo, status, modalidade)
    values ('T101-CUR T1 2026', '10100000-0000-0000-0000-000000000101', 'T1', 2026, 'planejada', 'presencial')$$,
  'FR-025.2 · T1 e aceito'
);

select lives_ok(
  $$insert into public.turmas (codigo, curso_id, turma, ano_letivo, status, modalidade)
    values ('T101-CUR T2 2026', '10100000-0000-0000-0000-000000000101', 'T2', 2026, 'planejada', 'presencial')$$,
  'FR-025.2 · T2 e aceito'
);

-- ⚠️ AUSENCIA DE ROTULO E LEGITIMA E PERMANENTE (FR-025.1), como o Epico 2 ratificou em
-- 08/09/2026: turma unica no ano nao tem rotulo, e exigir um seria inventar dado.
select lives_ok(
  $$insert into public.turmas (codigo, curso_id, turma, ano_letivo, status, modalidade)
    values ('T101-CUR 2027', '10100000-0000-0000-0000-000000000101', null, 2027, 'planejada', 'presencial')$$,
  'FR-025.1 · turma SEM rotulo continua aceita — a restricao vale so para rotulo preenchido'
);

-- ============================================= SC-004.4 — a base real passa sem saneamento
select case when (select sim from _ha_dado) then
  is_empty(
    $$select codigo from public.turmas
       where turma is not null and turma !~ '^T[1-9][0-9]*$'$$,
    'SC-004.4 · nenhuma turma da base tem rotulo fora do padrao — a restricao entrou sem saneamento'
  )
else pass('SC-004.4 SKIP · ' || :'motivo') end;

-- =================================================================================
-- PARTE 2 — o codigo gerado pelo banco (migration 3)
-- =================================================================================
--
-- ⚠️ O CODIGO NASCE NO BANCO E NUNCA MUDA (FR-025.1). Ele sai impresso no DSA: regrava-lo
--    retroativamente seria a reescrita silenciosa de documento ja emitido que a RN-2027-09 impede
--    para o regime. Editar sigla, rotulo ou ano NAO o regrava — e por isso a turma antiga carrega a
--    sigla antiga, que e historia correta, nao inconsistencia (FR-014.2).
--
-- ⚠️ E NAO E SEQUENCIA, como o codigo do instrutor. Ele depende da SIGLA DO CURSO, que mora em
--    outra tabela, e do rotulo e do ano da propria linha — e `DEFAULT` nao le outra coluna. Por isso
--    e gatilho, e por isso o gatilho e `SECURITY DEFINER`: ele le `cursos.codigo` sem depender do
--    `cursos.ler` de quem grava, e a policy de `turmas` decide a autorizacao logo depois.

insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('10100000-0000-0000-0000-000000000202', 'T101-OUT', 'Curso T101 outro', 'expedito', 'presencial', 10);

-- 1. Turma sem codigo informado: o banco grava `sigla [rotulo] ano`.
insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade) values
  ('10100000-0000-0000-0000-0000000000a1', '10100000-0000-0000-0000-000000000101', 'T3', 2030, 'planejada', 'presencial');
select is(
  (select codigo from public.turmas where id = '10100000-0000-0000-0000-0000000000a1'),
  'T101-CUR T3 2030',
  'FR-025.1 · turma sem codigo informado nasce com `sigla rotulo ano`, gerado pelo banco'
);

-- 2. E sem rotulo, o codigo e `sigla ano` — com UM espaco, nao dois.
insert into public.turmas (id, curso_id, ano_letivo, status, modalidade) values
  ('10100000-0000-0000-0000-0000000000a2', '10100000-0000-0000-0000-000000000101', 2031, 'planejada', 'presencial');
select is(
  (select codigo from public.turmas where id = '10100000-0000-0000-0000-0000000000a2'),
  'T101-CUR 2031',
  'FR-025.1 · sem rotulo o codigo e `sigla ano` — a ausencia de rotulo e legitima e permanente'
);

-- 3. Codigo informado e DIVERGENTE e recusado, com a chave estavel.
select results_eq(
  $$select r ->> 'sqlstate', r ->> 'hint', r -> 'detail' ->> 'esperado'
      from (select pg_temp.recusa(
              $x$insert into public.turmas (curso_id, turma, ano_letivo, status, modalidade, codigo)
                 values ('10100000-0000-0000-0000-000000000101', 'T4', 2032, 'planejada', 'presencial',
                         'CODIGO QUE EU INVENTEI')$x$) as r) x$$,
  $$values ('23514'::text, 'codigo_de_turma_divergente'::text, 'T101-CUR T4 2032'::text)$$,
  'FR-025.1 · codigo informado e divergente e RECUSADO, e a recusa diz qual era o esperado'
);

-- 4. E informado IGUAL ao que o banco geraria, passa: e o caminho do ETL, que grava o codigo.
select lives_ok(
  $$insert into public.turmas (curso_id, turma, ano_letivo, status, modalidade, codigo)
    values ('10100000-0000-0000-0000-000000000101', 'T4', 2032, 'planejada', 'presencial',
            'T101-CUR T4 2032')$$,
  'FR-025.1 · codigo informado IGUAL ao gerado e aceito — e o caminho da carga do ETL'
);

-- 5. Mudar o codigo e recusado, por qualquer caminho.
select is(
  (pg_temp.recusa(
     $$update public.turmas set codigo = 'T101-CUR T9 2030'
        where id = '10100000-0000-0000-0000-0000000000a1'$$) ->> 'hint'),
  'codigo_de_turma_imutavel',
  'FR-025.1 · mudar o codigo de uma turma e RECUSADO — ele e carimbado na criacao'
);

-- =================================================================================
-- OS QUATRO CAMINHOS DE COLISAO (FR-026) — recusados quando colidem...
-- =================================================================================
--
-- ⚠️ O PRIMEIRO SO EXISTE COM `NULLS NOT DISTINCT`. No `UNIQUE` padrao, `NULL <> NULL`: duas
--    turmas SEM rotulo no mesmo curso e ano passariam pela restricao e so colidiriam no codigo —
--    e a mensagem falaria de codigo, nao de rotulo, para quem nao informou rotulo nenhum.

insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade) values
  ('10100000-0000-0000-0000-0000000000b1', '10100000-0000-0000-0000-000000000101', 'T1', 2040, 'planejada', 'presencial'),
  ('10100000-0000-0000-0000-0000000000b2', '10100000-0000-0000-0000-000000000101', 'T2', 2040, 'planejada', 'presencial'),
  ('10100000-0000-0000-0000-0000000000b3', '10100000-0000-0000-0000-000000000101', null, 2040, 'planejada', 'presencial'),
  ('10100000-0000-0000-0000-0000000000b4', '10100000-0000-0000-0000-000000000101', 'T1', 2041, 'planejada', 'presencial'),
  ('10100000-0000-0000-0000-0000000000b5', '10100000-0000-0000-0000-000000000202', 'T1', 2040, 'planejada', 'presencial');

select is(
  pg_temp.restricao_violada(
    $$update public.turmas set turma = null where id = '10100000-0000-0000-0000-0000000000b2'$$),
  '23505 · turmas_unica_por_ano',
  'FR-026 · caminho 1 · REMOVER o rotulo colide com a turma que ja esta sem rotulo — vazio e um caso particular de igual'
);

select is(
  pg_temp.restricao_violada(
    $$update public.turmas set turma = 'T1' where id = '10100000-0000-0000-0000-0000000000b2'$$),
  '23505 · turmas_unica_por_ano',
  'FR-026 · caminho 2 · TROCAR por um rotulo ja usado no mesmo curso e ano e recusado'
);

select is(
  pg_temp.restricao_violada(
    $$update public.turmas set ano_letivo = 2040 where id = '10100000-0000-0000-0000-0000000000b4'$$),
  '23505 · turmas_unica_por_ano',
  'FR-026 · caminho 3 · MUDAR O ANO para um em que o rotulo ja existe e recusado'
);

select is(
  pg_temp.restricao_violada(
    $$update public.turmas set curso_id = '10100000-0000-0000-0000-000000000101'
       where id = '10100000-0000-0000-0000-0000000000b5'$$),
  '23505 · turmas_unica_por_ano',
  'FR-026 · caminho 4 · MUDAR O CURSO para um em que o rotulo ja existe naquele ano e recusado'
);

-- ================================================= ...e ACEITOS quando nao colidem
-- Sem estas quatro, uma restricao que recusasse TUDO passaria nas quatro de cima.
insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade) values
  ('10100000-0000-0000-0000-0000000000c1', '10100000-0000-0000-0000-000000000101', 'T7', 2050, 'planejada', 'presencial'),
  ('10100000-0000-0000-0000-0000000000c2', '10100000-0000-0000-0000-000000000101', 'T8', 2051, 'planejada', 'presencial'),
  ('10100000-0000-0000-0000-0000000000c3', '10100000-0000-0000-0000-000000000202', 'T9', 2052, 'planejada', 'presencial');

select lives_ok(
  $$update public.turmas set turma = null where id = '10100000-0000-0000-0000-0000000000c1'$$,
  'FR-026 · caminho 1 · remover o rotulo onde NAO ha outra sem rotulo e aceito'
);

select lives_ok(
  $$update public.turmas set turma = 'T6' where id = '10100000-0000-0000-0000-0000000000c2'$$,
  'FR-026 · caminho 2 · trocar para um rotulo livre e aceito'
);

select lives_ok(
  $$update public.turmas set ano_letivo = 2053 where id = '10100000-0000-0000-0000-0000000000c2'$$,
  'FR-026 · caminho 3 · mudar para um ano livre e aceito'
);

select lives_ok(
  $$update public.turmas set curso_id = '10100000-0000-0000-0000-000000000101'
     where id = '10100000-0000-0000-0000-0000000000c3'$$,
  'FR-026 · caminho 4 · mudar para um curso em que o rotulo esta livre naquele ano e aceito'
);

-- ⚠️ E o codigo das quatro NAO mudou, embora rotulo, ano e curso tenham mudado.
select results_eq(
  $$select codigo from public.turmas
     where id in ('10100000-0000-0000-0000-0000000000c1', '10100000-0000-0000-0000-0000000000c2',
                  '10100000-0000-0000-0000-0000000000c3')
     order by codigo$$,
  $$values ('T101-CUR T7 2050'::text), ('T101-CUR T8 2051'::text), ('T101-OUT T9 2052'::text)$$,
  'FR-025.1 · editar rotulo, ano ou curso NAO regrava o codigo — nem o da turma que mudou de curso'
);

-- =================================================================================
-- FR-014.2 — trocar a sigla do curso nao cascateia, e a turma NOVA usa a sigla nova
-- =================================================================================
update public.cursos set codigo = 'T101-NOVA' where id = '10100000-0000-0000-0000-000000000101';

select is(
  (select count(*)::int from public.turmas
    where curso_id = '10100000-0000-0000-0000-000000000101' and codigo like 'T101-NOVA%'),
  0,
  'FR-014.2 · trocar a sigla NAO muda o codigo de nenhuma turma existente'
);

insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade) values
  ('10100000-0000-0000-0000-0000000000d1', '10100000-0000-0000-0000-000000000101', 'T1', 2060, 'planejada', 'presencial');
select is(
  (select codigo from public.turmas where id = '10100000-0000-0000-0000-0000000000d1'),
  'T101-NOVA T1 2060',
  'FR-014.2 · e a turma criada DEPOIS da troca usa a sigla nova — o gatilho le a sigla vigente'
);

-- =================================================================================
-- T031.1 — GUARDA DE AUSENCIA: a janela da turma nao toca `janelas_curso` (FR-025.3)
-- =================================================================================
--
-- ⚠️ REQUISITO DE AUSENCIA SEM TESTE NAO E REQUISITO, E TORCIDA (achado 5 do analyze). `janelas_curso`
--    e o PREVISTO do PROENS; a janela da turma e o REALIZADO. Sincronizar destruiria a unica forma de
--    enxergar divergencia entre os dois — entao o teste prova que NADA acontece.
insert into public.janelas_curso (codigo, ano, curso_id, turma_prevista, data_inicio_prevista, data_termino_prevista) values
  ('JAN-T101-1', 2040, '10100000-0000-0000-0000-000000000101', 'T1', '2040-03-01', '2040-06-30');

create temporary table _janelas_antes as
  select id, ano, curso_id, turma_prevista, data_inicio_prevista, data_termino_prevista, status
    from public.janelas_curso;

update public.turmas
   set data_inicio = '2040-01-05', data_termino = '2040-11-20'
 where id = '10100000-0000-0000-0000-0000000000b1';
update public.turmas
   set curso_id = '10100000-0000-0000-0000-000000000202'
 where id = '10100000-0000-0000-0000-0000000000b4';

select is_empty(
  $$with agora as (
      select id, ano, curso_id, turma_prevista, data_inicio_prevista, data_termino_prevista, status
        from public.janelas_curso
    )
    (select * from agora except select * from _janelas_antes)
    union all
    (select * from _janelas_antes except select * from agora)$$,
  'FR-025.3 · editar datas e curso da turma NAO altera nenhuma linha de janelas_curso — nem contagem, nem conteudo'
);

select is(
  (select count(*)::int from pg_trigger
    where tgrelid = 'public.janelas_curso'::regclass and not tgisinternal),
  1,
  'FR-025.3 · janelas_curso segue com UM gatilho — o de auditoria do Epico 1 — e nenhum desta fatia'
);

select is(
  (select count(*)::int from pg_constraint
    where conrelid = 'public.janelas_curso'::regclass and contype = 'f'),
  1,
  'FR-025.3 · e com UMA chave estrangeira, a do curso — nenhuma FK nova aponta para turmas'
);

-- =================================================================================
-- T031.2 — GUARDA DE AUSENCIA: nenhum status trava nada nesta fatia (FR-028.2)
-- =================================================================================
--
-- ⚠️ O que cada status libera ou trava no LANCAMENTO DE AULA e regra do Epico 6, e nao entra aqui.
--    As 12 transicoes sao aceitas pelo banco EM QUALQUER ORDEM — inclusive `concluida -> planejada` e
--    `cancelada -> ativa`, que parecem erradas e nao sao: desfazer um status trocado por engano nao
--    pode exigir migration.
do $$
declare
  v_de   text;
  v_para text;
  v_n    int := 0;
begin
  foreach v_de in array array['planejada', 'ativa', 'concluida', 'cancelada'] loop
    foreach v_para in array array['planejada', 'ativa', 'concluida', 'cancelada'] loop
      if v_de <> v_para then
        update public.turmas set status = v_de::public.status_turma
         where id = '10100000-0000-0000-0000-0000000000d1';
        update public.turmas set status = v_para::public.status_turma
         where id = '10100000-0000-0000-0000-0000000000d1';
        v_n := v_n + 1;
      end if;
    end loop;
  end loop;
  create temporary table _transicoes as select v_n as aceitas;
end;
$$;

select is(
  (select aceitas from _transicoes),
  12,
  'FR-028.2 · as 12 de 12 transicoes entre os quatro status sao aceitas pelo banco, em qualquer ordem'
);

select is(
  (select count(*)::int from pg_trigger t
     join pg_proc p on p.oid = t.tgfoid
    where t.tgrelid = 'public.turmas'::regclass and not t.tgisinternal
      and p.prosrc ~* '\mstatus\M' and p.prosrc ~* 'raise'),
  0,
  'FR-028.2 · nenhum gatilho de turmas le o status para recusar — a ausencia e a regra'
);

select * from finish();
rollback;
