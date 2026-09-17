-- =================================================================================
-- 100 — Obrigatórios do curso, limite pela classificação e a auditoria da sigla
--       (Épico 5, fatia (a), migration 2)
--
-- O QUÊ  : nenhum valor-padrão silencioso em `cursos` e `turmas`; o limite de turmas
--          vem da classificação e é EDITÁVEL; `ead_semipresencial` recusado; e a troca
--          de sigla fica registrada numa tabela que não se altera nem se apaga.
--          FR-003.1, FR-003.2, FR-015, FR-015.1, FR-014.1 a FR-014.3, SC-001.2,
--          SC-001.4, SC-001.6, SC-001.7 · invariantes I-3 e I-3b.
--
-- ⚠️ POR QUE O `DEFAULT 1` DE `limite_turmas_ano` PRECISOU SAIR. Com ele, o gatilho recebe
--    `1` tanto quando a pessoa ESCOLHEU 1 quanto quando NÃO INFORMOU nada, e não tem como
--    distinguir as duas coisas — ou sobrescreve a escolha, ou deixa passar o 1 errado num
--    Expedito. Sem o `DEFAULT`, o ausente chega NULO ao gatilho, que preenche; o `NOT NULL`
--    continua valendo, porque é conferido DEPOIS dos gatilhos `BEFORE`. As três asserções
--    de limite provam exatamente esse par: preenche quando falta, respeita quando veio.
--
-- ⚠️ O QUARTETO DE AUDITORIA NÃO SERVE PARA A SIGLA, e é por isso que existe uma tabela.
--    `app.set_auditoria()` guarda quem fez a ÚLTIMA edição e quando — perde a sigla
--    anterior, e a edição seguinte apaga o autor. Um rastro guardado dentro de `cursos`
--    ainda poderia ser reescrito pela mesma operação que troca a sigla (B-21).
--
-- ⚠️ E O GATILHO DE `TRUNCATE` É DELIBERADO. O de `migracao_log` é só `BEFORE DELETE OR
--    UPDATE`, e a `service_role` TEM o privilégio de `TRUNCATE` nela — medido e provado em
--    17/09/2026 (R-22, pendência `PEND-5a-3`). Esta tabela nasce sem essa lacuna, e a
--    asserção de `TRUNCATE` abaixo é o que impede alguém de "simplificar" os dois gatilhos
--    num só mais tarde.
-- =================================================================================

begin;
select plan(22);

-- --------------------------------------------------------------------------- amostra
insert into auth.users (id, email, aud, role) values
  ('a0000000-0000-0000-0000-000000000100', 't100-admin@ciaara.teste', 'authenticated', 'authenticated');
insert into public.usuarios (codigo, auth_user_id, email, nome, perfil) values
  ('T100-USR-ADM', 'a0000000-0000-0000-0000-000000000100', 't100-admin@ciaara.teste', 'Admin T100', 'admin');

insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('10000000-0000-0000-0000-000000000001', 'T100-SIGLA', 'Curso Da Sigla', 'regular', 'presencial', 30),
  ('10000000-0000-0000-0000-000000000002', 'T100-OUTRO', 'Curso Que Quer A Sigla', 'expedito', 'presencial', 10);

-- ===================================== FR-015 / FR-015.1 — obrigatório é obrigatório
select throws_ok(
  $$insert into public.cursos (codigo, nome_curso, classificacao, duracao_dias)
    values ('T100-SEM-MOD', 'Curso Sem Modalidade', 'regular', 30)$$,
  '23502',
  null,
  'FR-015 · curso SEM modalidade e recusado — o DEFAULT silencioso saiu'
);

select throws_ok(
  $$insert into public.cursos (codigo, nome_curso, classificacao, modalidade)
    values ('T100-SEM-DUR', 'Curso Sem Duracao', 'regular', 'presencial')$$,
  '23502',
  null,
  'FR-015 · curso SEM duracao em dias e recusado'
);

select throws_ok(
  $$insert into public.turmas (codigo, curso_id, turma, ano_letivo, status)
    values ('T100-SIGLA T9 2026', '10000000-0000-0000-0000-000000000001', 'T9', 2026, 'planejada')$$,
  '23502',
  null,
  'FR-015 · turma SEM modalidade e recusada — ela NUNCA e copiada do curso (FR-027)'
);

-- ============================== FR-003.2 — o limite vem da classificacao, e e editavel
insert into public.cursos (codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('T100-REG', 'Curso Regular Sem Limite',  'regular',  'presencial', 30),
  ('T100-EXP', 'Curso Expedito Sem Limite', 'expedito', 'presencial', 10);
insert into public.cursos (codigo, nome_curso, classificacao, modalidade, duracao_dias, limite_turmas_ano) values
  ('T100-EXP-1', 'Curso Expedito Com Um', 'expedito', 'presencial', 10, 1);

select is(
  (select limite_turmas_ano from public.cursos where codigo = 'T100-REG'),
  1::smallint,
  'FR-003.2 · Regular sem limite informado recebe 1, pelo gatilho'
);

select is(
  (select limite_turmas_ano from public.cursos where codigo = 'T100-EXP'),
  2::smallint,
  'FR-003.2 · Expedito sem limite informado recebe 2, pelo gatilho'
);

-- A asserção que o `DEFAULT` tornava impossível: escolher 1 num Expedito e ser OBEDECIDO.
select is(
  (select limite_turmas_ano from public.cursos where codigo = 'T100-EXP-1'),
  1::smallint,
  'FR-003.2 · Expedito com 1 EXPLICITO fica com 1 — o gatilho preenche, nunca sobrescreve'
);

-- =================================================== FR-003.1 — a classificacao invisivel
-- O recorte do Operador e `classificacao = escopo`: um curso com este valor ficaria
-- invisivel para TODOS os Operadores, e o formulario sozinho nao impede a chamada direta.
select throws_ok(
  $$insert into public.cursos (codigo, nome_curso, classificacao, modalidade, duracao_dias)
    values ('T100-EAD', 'Curso EAD Semi', 'ead_semipresencial', 'ead', 30)$$,
  '23514',
  null,
  'FR-003.1 · classificacao ead_semipresencial e RECUSADA pelo banco, como geral ja era'
);

-- ==================================================== FR-014.1 — a troca de sigla, gravada
-- A sessao e simulada como o PostgREST faz: `request.jwt.claim.sub` aponta para o usuario,
-- e e dai que `app.set_auditoria()` tira o autor.
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000100', true);

-- Uma turma ANTES da troca: o codigo dela e o que nao pode mudar (FR-014.2).
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade) values
  ('10100000-0000-0000-0000-000000000001', 'T100-SIGLA T1 2026', '10000000-0000-0000-0000-000000000001',
   'T1', 2026, 'ativa', 'presencial');

update public.cursos set codigo = 'T100-NOVA' where id = '10000000-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from public.curso_sigla_historico
    where curso_id = '10000000-0000-0000-0000-000000000001'),
  1,
  'FR-014.1 · trocar a sigla grava UMA linha em curso_sigla_historico'
);

select results_eq(
  $$select sigla_anterior, sigla_nova, criado_por
      from public.curso_sigla_historico
     where curso_id = '10000000-0000-0000-0000-000000000001'$$,
  $$values ('T100-SIGLA'::text, 'T100-NOVA'::text,
            'a0000000-0000-0000-0000-000000000100'::uuid)$$,
  'FR-014.1 · a linha traz a sigla ANTERIOR, a NOVA e o autor da sessao'
);

select isnt(
  (select criado_em from public.curso_sigla_historico
    where curso_id = '10000000-0000-0000-0000-000000000001'),
  null,
  'FR-014.1 · e o momento da troca'
);

-- ⚠️ FR-014.2 — NADA CASCATEIA. O codigo da turma sai impresso no DSA; reescreve-lo
-- retroativamente seria a reescrita silenciosa de documento emitido que a RN-2027-09 impede.
select is(
  (select codigo from public.turmas where id = '10100000-0000-0000-0000-000000000001'),
  'T100-SIGLA T1 2026',
  'FR-014.2 · ZERO codigos de turma mudam na troca de sigla — turma antiga com sigla antiga e historia correta'
);

-- Reenviar o MESMO valor nao e troca, e nao grava linha nenhuma.
update public.cursos set codigo = 'T100-NOVA' where id = '10000000-0000-0000-0000-000000000001';
select is(
  (select count(*)::int from public.curso_sigla_historico
    where curso_id = '10000000-0000-0000-0000-000000000001'),
  1,
  'FR-014.1 · reenviar a MESMA sigla nao grava linha — o gatilho so registra mudanca de valor'
);

-- ================================= FR-014.1 — nem alteracao, nem exclusao, por caminho nenhum
set local role authenticated;
select throws_ok(
  $$insert into public.curso_sigla_historico (curso_id, sigla_anterior, sigla_nova)
    values ('10000000-0000-0000-0000-000000000002', 'X', 'Y')$$,
  '42501',
  null,
  'FR-014.1 · authenticated nao ESCREVE na tabela: a escrita e so do gatilho'
);
reset role;

set local role service_role;

select throws_ok(
  $$update public.curso_sigla_historico set sigla_anterior = 'adulterada'$$,
  'P0001',
  null,
  'FR-014.1 · UPDATE e recusado TAMBEM para service_role — a chave que ignora a RLS nao ignora o gatilho'
);

select throws_ok(
  $$delete from public.curso_sigla_historico$$,
  'P0001',
  null,
  'FR-014.1 · DELETE e recusado TAMBEM para service_role'
);

-- ⚠️ A assercao que `migracao_log` nao tem: TRUNCATE nao passa por gatilho de linha nem pela
-- RLS. Sem um gatilho de STATEMENT para TRUNCATE, a service_role esvaziaria a auditoria inteira.
select throws_ok(
  $$truncate public.curso_sigla_historico$$,
  'P0001',
  null,
  'FR-014.1 · TRUNCATE e recusado TAMBEM para service_role — a lacuna do migracao_log (R-22) nao se repete aqui'
);

reset role;
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000100', true);

-- ==================================== FR-014.3 — sigla que ja foi de OUTRO curso e recusada
-- A recusa carrega a chave estavel no HINT e os dados no DETAIL, como o contrato de escritas
-- §2 exige — a Server Action le codigo, chave e dados, e NUNCA o `message` cru.
create function pg_temp.recusa_da_sigla(p_curso uuid, p_sigla text) returns jsonb
language plpgsql as $f$
declare
  v_hint text;
  v_detail text;
begin
  update public.cursos set codigo = p_sigla where id = p_curso;
  return jsonb_build_object('recusou', false);
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint, v_detail = pg_exception_detail;
  return jsonb_build_object(
    'recusou', true, 'sqlstate', sqlstate, 'hint', v_hint,
    'detail', nullif(v_detail, '')::jsonb
  );
end;
$f$;

select is(
  (pg_temp.recusa_da_sigla('10000000-0000-0000-0000-000000000002', 'T100-SIGLA') ->> 'sqlstate'),
  '23505',
  'FR-014.3 · adotar sigla que ja foi de OUTRO curso e recusado com 23505'
);

select is(
  (pg_temp.recusa_da_sigla('10000000-0000-0000-0000-000000000002', 'T100-SIGLA') ->> 'hint'),
  'sigla_de_outro_curso',
  'FR-014.3 · com a chave estavel no HINT, que e o que a Server Action traduz'
);

select results_eq(
  $$select d ->> 'curso_sigla_atual', d ->> 'curso_nome', (d ->> 'deixada_em') is not null
      from (select pg_temp.recusa_da_sigla('10000000-0000-0000-0000-000000000002', 'T100-SIGLA') -> 'detail' as d) x$$,
  $$values ('T100-NOVA'::text, 'Curso Da Sigla'::text, true)$$,
  'FR-014.3 · e o DETAIL nomeia a sigla ATUAL do curso que a tinha, o nome dele e a data em que a deixou'
);

-- A criacao cai na mesma regra: "por qualquer caminho".
select throws_ok(
  $$insert into public.cursos (codigo, nome_curso, classificacao, modalidade, duracao_dias)
    values ('T100-SIGLA', 'Curso Novo Com Sigla Alheia', 'regular', 'presencial', 30)$$,
  '23505',
  null,
  'FR-014.3 · e na CRIACAO tambem, nao so na edicao'
);

-- ⚠️ A EXCECAO EXPLICITA: voltar a uma sigla que foi DELE MESMO e seguro e permitido. A
-- unicidade de rotulo por curso e ano (FR-026) ja impede codigo de turma repetido dentro do
-- mesmo curso, e a mensagem dela diz qual turma ocupa o rotulo.
select lives_ok(
  $$update public.cursos set codigo = 'T100-SIGLA'
     where id = '10000000-0000-0000-0000-000000000001'$$,
  'FR-014.3 · o curso PODE voltar a uma sigla que foi DELE — a excecao e explicita'
);

select is(
  (select count(*)::int from public.curso_sigla_historico
    where curso_id = '10000000-0000-0000-0000-000000000001'),
  2,
  'FR-014.1 · e a volta tambem fica registrada: duas trocas, duas linhas'
);

select * from finish();
rollback;
