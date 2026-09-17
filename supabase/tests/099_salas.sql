-- =================================================================================
-- 099 — A lista de salas e a validação da sala da turma (Épico 5, fatia (a), migration 1)
--
-- O QUÊ  : a sala da turma passa a ser conferida contra a lista administrável
--          `config_listas.lista = 'salas'`, e toda sala declara se é ambiente
--          virtual. FR-029 a FR-029.7, SC-014.2, SC-014.4, invariantes I-1 e I-2.
--
-- ⚠️ POR QUE A RESTRIÇÃO TEM DUAS METADES, e por que os TRÊS casos são provados:
--    escrita só como `jsonb_typeof(metadados -> 'ambiente_virtual') = 'boolean'`, ela
--    ACEITARIA a sala sem a chave — chave ausente dá nulo, a comparação dá nulo, e
--    CHECK com resultado nulo PASSA. O operador `?` devolve FALSO, nunca nulo, quando
--    a chave falta, e é ele que faz a ausência ser recusada. Sem os três casos, a
--    opção A recriaria pela porta dos fundos o padrão silencioso que o FR-029.6
--    proibiu (B-2, decisão de 17/09/2026).
--
-- ⚠️ SALA DESATIVADA CONTINUA ACEITA, e isso NÃO é lacuna (FR-029.4): desativar é
--    sair do seletor de turma nova, nunca recusar a edição de turma que já a usa. É
--    o que o terceiro argumento do gatilho genérico existe para dizer — e o teste do
--    `tipo_atividade` inativo, abaixo, prova que ele NÃO vazou para os quatro
--    gatilhos que já existiam.
-- =================================================================================

begin;
select plan(18);

-- Há base carregada? É a pergunta que decide entre asserir e pular, como no 090.
create temporary table _ha_dado as
select (select count(*) from public.turmas) > 0 as sim;

\set motivo 'base vazia — rode o ETL antes; nao foi verificado, e nao e aprovacao'

-- --------------------------------------------------------------------------- amostra
insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('99000000-0000-0000-0000-000000000001', 'SALA-A', 'Curso das Salas', 'regular', 'presencial', 30);
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade, sala_alocada) values
  ('99100000-0000-0000-0000-000000000001', 'SALA-A T1 2026', '99000000-0000-0000-0000-000000000001',
   'T1', 2026, 'ativa', 'presencial', 'Sala 02');

-- ============================================== FR-029 / FR-029.6 — o inventário, inteiro
select is(
  (select count(*)::int from public.config_listas where lista = 'salas'),
  8,
  'FR-029 · a lista de salas tem exatamente os 8 valores do inventario institucional'
);

select is_empty(
  $$select valor from public.config_listas where lista = 'salas' and valor = 'Sala 05'$$,
  'FR-029 · "Sala 05" NAO consta — ausencia deliberada do inventario, nao omissao'
);

-- ================================== FR-029.1 / FR-029.6 — a natureza, explícita nas 8
select results_eq(
  $$select valor, (metadados -> 'ambiente_virtual')::boolean
      from public.config_listas where lista = 'salas' order by valor$$,
  $$values ('Laboratório de Informática'::text, false),
           ('Moodle',                           true),
           ('Sala 01',                          false),
           ('Sala 02',                          false),
           ('Sala 03',                          false),
           ('Sala 04',                          false),
           ('Sala 06',                          false),
           ('Sala CAHO',                        false)$$,
  'FR-029.1 · as 8 salas declaram fisica ou virtual, e so o Moodle e ambiente virtual'
);

-- ==================================================== FR-029.7 / SC-014.4 — os TRÊS casos
select throws_ok(
  $$insert into public.config_listas (lista, valor, rotulo_exibicao)
    values ('salas', 'Sala Sem Natureza', 'Sala Sem Natureza')$$,
  '23514',
  null,
  'FR-029.7 · sala SEM a chave ambiente_virtual e RECUSADA — ausencia nao vira "fisica"'
);

select throws_ok(
  $$insert into public.config_listas (lista, valor, rotulo_exibicao, metadados)
    values ('salas', 'Sala Natureza Nula', 'Sala Natureza Nula', '{"ambiente_virtual": null}')$$,
  '23514',
  null,
  'FR-029.7 · sala com a chave NULA e RECUSADA — o tipo JSON dela e null, nao boolean'
);

select throws_ok(
  $$insert into public.config_listas (lista, valor, rotulo_exibicao, metadados)
    values ('salas', 'Sala Natureza Texto', 'Sala Natureza Texto', '{"ambiente_virtual": "sim"}')$$,
  '23514',
  null,
  'FR-029.7 · sala com valor NAO booleano e RECUSADA'
);

-- O controle positivo: com a chave booleana, a sala nova entra sem migration nenhuma.
select lives_ok(
  $$insert into public.config_listas (lista, valor, rotulo_exibicao, metadados)
    values ('salas', 'Sala 07', 'Sala 07', '{"ambiente_virtual": false}')$$,
  'FR-029.2 · sala nova entra pela lista administravel, sem alteracao de codigo'
);

-- E a restrição vale SÓ para salas: as outras listas não ganham exigência nenhuma.
select lives_ok(
  $$insert into public.config_listas (lista, valor, rotulo_exibicao)
    values ('metodologias', 'Metodologia Das Salas', 'Metodologia Das Salas')$$,
  'FR-029.7 · a exigencia da natureza vale SO para a lista de salas'
);

-- ==================================================== FR-029 — a sala da turma, conferida
select throws_ok(
  $$update public.turmas set sala_alocada = 'Sala Que Nao Existe'
     where id = '99100000-0000-0000-0000-000000000001'$$,
  '23514',
  null,
  'FR-029 · sala fora da lista e RECUSADA pelo banco'
);

select lives_ok(
  $$update public.turmas set sala_alocada = null
     where id = '99100000-0000-0000-0000-000000000001'$$,
  'FR-029 · sala VAZIA e aceita — turma sem sala gera aviso, nunca bloqueio'
);

select lives_ok(
  $$update public.turmas set sala_alocada = ''
     where id = '99100000-0000-0000-0000-000000000001'$$,
  'FR-029 · sala em branco e aceita pelo mesmo motivo — ausencia nao e valor invalido'
);

-- ======================================== FR-029.4 — desativar nao invalida turma existente
update public.turmas set sala_alocada = 'Sala 04' where id = '99100000-0000-0000-0000-000000000001';
update public.config_listas set ativo = false where lista = 'salas' and valor = 'Sala 04';
select lives_ok(
  $$update public.turmas set alunos = 12 where id = '99100000-0000-0000-0000-000000000001'$$,
  'FR-029.4 · editar turma cuja sala foi DESATIVADA continua permitido'
);
select lives_ok(
  $$update public.turmas set sala_alocada = 'Sala 04'
     where id = '99100000-0000-0000-0000-000000000001'$$,
  'FR-029.4 · e regravar a propria sala desativada tambem — desativar e sair do seletor'
);
update public.config_listas set ativo = true where lista = 'salas' and valor = 'Sala 04';

-- ⚠️ R-4 — O TERCEIRO ARGUMENTO NÃO VAZOU. `registros_aula.tipo_atividade` usa a MESMA
-- função, sem o argumento, e continua exigindo valor ATIVO. Se esta asserção falhar,
-- alguém trocou o padrão da função em vez de acrescentar um parâmetro.
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('99200000-0000-0000-0000-000000000001', 'SALA-A-MAT', '99000000-0000-0000-0000-000000000001', 'MAT', 'Disciplina das Salas', 40);
insert into public.unidades_ensino (id, codigo, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos) values
  ('99300000-0000-0000-0000-000000000001', 'SALA-A-UE1', '99200000-0000-0000-0000-000000000001',
   '99000000-0000-0000-0000-000000000001', 1, 'Unidade das Salas', 40);
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('99400000-0000-0000-0000-000000000001', 'SALA-INS-1', 'CT', '-EF', 'Instrutor Das Salas', 'Militar', 'CIAARA');
insert into public.config_listas (lista, valor, rotulo_exibicao, ativo)
  values ('tipos_atividade', 'Tipo Inativo Das Salas', 'Tipo Inativo Das Salas', false);

select throws_ok(
  $$insert into public.registros_aula
      (codigo, data, turma_id, unidade_ensino_id, curso_id, tempos_consumidos, ta_inicial,
       categoria_normativa, instrutor_id, tipo_atividade)
    values ('SALA-REG-1', '2026-05-04', '99100000-0000-0000-0000-000000000001',
            '99300000-0000-0000-0000-000000000001', '99000000-0000-0000-0000-000000000001',
            2, 1, 'atividade_extraclasse', '99400000-0000-0000-0000-000000000001',
            'Tipo Inativo Das Salas')$$,
  '23514',
  null,
  'R-4 · tipo_atividade INATIVO continua RECUSADO — o parametro novo nao mudou os 4 gatilhos de hoje'
);

-- =============================================== SC-014.2 / FR-029.1 — nenhum 'Moodle' em código
-- Marcar outro valor como ambiente virtual MUST mudar o resultado sem deploy; uma
-- comparação com o texto `'Moodle'` dentro de função quebraria essa promessa em silêncio.
select is(
  (select count(*)::int
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('app', 'public')
      and p.prosrc ilike '%''Moodle''%'),
  0,
  'SC-014.2 · ZERO funcoes comparam com o texto Moodle — a natureza e dado, nao codigo'
);

-- ================================================= I-1 — o dado real, quando ele existe
select case when (select sim from _ha_dado) then
  is(
    (select count(*)::int from public.turmas where sala_alocada = 'Laboratório de Informática'),
    9,
    'I-1 · as 9 turmas do Laboratorio de Informatica estao na grafia canonica'
  )
else pass('I-1 SKIP · ' || :'motivo') end;

select case when (select sim from _ha_dado) then
  is(
    (select count(*)::int from public.turmas where sala_alocada is null or btrim(sala_alocada) = ''),
    2,
    'I-1 · as 2 turmas sem sala continuam sem sala — a reconciliacao nao inventou sala'
  )
else pass('I-1 SKIP · ' || :'motivo') end;

-- Esta NÃO pula: com a base vazia ela é vacuosa, e com a base carregada ela é a
-- verificação que pega grafia órfã — inclusive a antiga, `Laboratório de informática`.
select is_empty(
  $$select t.codigo from public.turmas t
     where coalesce(btrim(t.sala_alocada), '') <> ''
       and not exists (select 1 from public.config_listas c
                        where c.lista = 'salas' and c.valor = t.sala_alocada)$$,
  'FR-029.3 · nenhuma turma guarda sala sem correspondencia na lista'
);

select * from finish();
rollback;
