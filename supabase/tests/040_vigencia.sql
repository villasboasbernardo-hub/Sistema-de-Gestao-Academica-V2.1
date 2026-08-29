-- =====================================================================================
-- 040_vigencia.sql — vigencia temporal sem sobreposicao
-- Epico 1 · T038 · FR-017 · FR-018 · FR-019 · RN-2027-09
-- -------------------------------------------------------------------------------------
-- A REGRA (RN-2027-09, Risco: Alto): "Toda mudanca de regime de horario de um curso deve
-- ter data de vigencia explicita, e a mudanca NUNCA altera a interpretacao de registros ja
-- lancados sob a configuracao anterior."
--
-- Na v2.0 a convencao C-08 estava certa — mas nada impedia cadastrar dois regimes vigentes
-- ao mesmo tempo, e a funcao de resolucao escolhia um dos dois EM SILENCIO. E o silencio
-- que esta constraint elimina.
--
-- ACHADO DESTE ARQUIVO (29/08/2026): ao escrever a assercao de FR-018 descobriu-se que
-- `responsaveis_curso` NAO tinha constraint de exclusao — o documento 05 §7.5 especifica
-- duas e `docs/sql-referencia/01` implementa uma. A migration M2 foi corrigida.
-- =====================================================================================
begin;
select plan(6);

insert into public.cursos (id, codigo, nome_curso, classificacao) values
  ('11111111-0000-0000-0000-0000000000a1', 'VIG-A', 'Curso Vigencia', 'regular');

-- ============================================= FR-017 / RN-2027-09 — regime do curso
insert into public.curso_regime_historico
  (codigo, curso_id, tipo_regime, regime_tempos, ta_duracao_min, intervalo_manha_min,
   intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde, vigente_de, vigente_ate)
  values ('REG-VIG-1', '11111111-0000-0000-0000-0000000000a1', 'padrao', 8, 45, 10, 10,
          '07:30', '13:30', '2026-01-01', null);

-- Sobreposicao direta: o segundo regime comeca dentro da vigencia aberta do primeiro.
select throws_ok(
  $$insert into public.curso_regime_historico
      (codigo, curso_id, tipo_regime, regime_tempos, ta_duracao_min, intervalo_manha_min,
       intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde, vigente_de, vigente_ate)
    values ('REG-VIG-2', '11111111-0000-0000-0000-0000000000a1', 'padrao', 9, 45, 10, 10,
            '07:30', '13:30', '2026-06-01', null)$$,
  '23P01',
  null,
  'RN-2027-09 · dois regimes do MESMO tipo com periodos sobrepostos sao recusados'
);

-- O caso que a implementacao ingenua deixa passar: `vigente_ate` NULO significa VIGENTE,
-- nao "terminou". Tratado como intervalo infinito, qualquer data futura conflita.
select throws_ok(
  $$insert into public.curso_regime_historico
      (codigo, curso_id, tipo_regime, regime_tempos, ta_duracao_min, intervalo_manha_min,
       intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde, vigente_de, vigente_ate)
    values ('REG-VIG-3', '11111111-0000-0000-0000-0000000000a1', 'padrao', 7, 45, 10, 10,
            '07:30', '13:30', '2030-01-01', null)$$,
  '23P01',
  null,
  'RN-2027-09 · vigente_ate NULO e infinito: data futura tambem conflita'
);

-- Tipo diferente NAO conflita: a regra e por (curso, tipo_regime), e um curso pode ter
-- regime de excecao vigente ao lado do padrao.
select lives_ok(
  $$insert into public.curso_regime_historico
      (codigo, curso_id, tipo_regime, regime_tempos, ta_duracao_min, intervalo_manha_min,
       intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde, vigente_de, vigente_ate)
    values ('REG-VIG-4', '11111111-0000-0000-0000-0000000000a1', 'excecao', 6, 45, 10, 10,
            '07:30', '13:30', '2026-03-01', '2026-04-01')$$,
  'RN-2027-09 · regime de tipo DIFERENTE no mesmo periodo e aceito'
);

-- ================================================== FR-018 — assinatura do DSA
insert into public.responsaveis_curso
  (codigo, curso_id, ordem, papel_assinatura, preenchimento, funcao_descricao, vigente_de, vigente_ate, posto_graduacao, nome_guerra)
  values ('RESP-VIG-1', '11111111-0000-0000-0000-0000000000a1', 1, 'encarregado_curso', 'fixo',
          'Encarregado do Curso', '2026-01-01', null, 'CC', 'SILVA');

select throws_ok(
  $$insert into public.responsaveis_curso
      (codigo, curso_id, ordem, papel_assinatura, preenchimento, funcao_descricao, vigente_de, vigente_ate, posto_graduacao, nome_guerra)
    values ('RESP-VIG-2', '11111111-0000-0000-0000-0000000000a1', 2, 'encarregado_curso', 'fixo',
            'Encarregado do Curso', '2026-07-01', null, 'CT', 'SOUZA')$$,
  '23P01',
  null,
  'FR-018 · duas assinaturas do MESMO papel vigentes ao mesmo tempo sao recusadas'
);

select lives_ok(
  $$insert into public.responsaveis_curso
      (codigo, curso_id, ordem, papel_assinatura, preenchimento, funcao_descricao, vigente_de, vigente_ate, posto_graduacao, nome_guerra)
    values ('RESP-VIG-3', '11111111-0000-0000-0000-0000000000a1', 3, 'encarregado_divisao', 'fixo',
            'Encarregado da Divisao', '2026-01-01', null, 'CF', 'COSTA')$$,
  'FR-018 · papel DIFERENTE no mesmo periodo e aceito'
);

-- ================================ FR-019 — nenhuma edicao reinterpreta o passado
-- Um regime encerrado e um novo em vigor. Um fato datado sob o primeiro TEM de resolver
-- pelo primeiro, nunca pelo atual. E o que impede uma mudanca de horario de 2027 alterar
-- retroativamente a leitura do DSA de 2026.
--
-- ATENCAO A SEMANTICA DE `vigente_ate`, e ela DIVERGE ENTRE OS DOCUMENTOS (achado A-15):
--   documento 05 §7.5 escreve `daterange(vigente_de, vigente_ate, '[)')` — fim EXCLUSIVO,
--     em que `vigente_ate` e o primeiro dia NAO coberto;
--   `docs/sql-referencia/01` implementa `daterange(vigente_de, vigente_ate + 1)` — fim
--     INCLUSIVO, em que `vigente_ate` e o ultimo dia coberto.
-- A diferenca vale exatamente um dia, na fronteira. Seguimos o REFERENCIA, que foi aplicado
-- e validado contra banco real e corresponde ao que uma pessoa quer dizer ao preencher
-- "vigente ate": vale ATE esse dia, inclusive. A divergencia esta reportada, nao corrigida.
-- Por isso o primeiro regime encerra em 31/12/2026, nao em 01/01/2027.
insert into public.cursos (id, codigo, nome_curso, classificacao) values
  ('11111111-0000-0000-0000-0000000000a2', 'VIG-B', 'Curso Sucessao', 'regular');
insert into public.curso_regime_historico
  (codigo, curso_id, tipo_regime, regime_tempos, ta_duracao_min, intervalo_manha_min,
   intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde, vigente_de, vigente_ate)
  values
  ('REG-SUC-1', '11111111-0000-0000-0000-0000000000a2', 'padrao', 8, 45, 10, 10, '07:30', '13:30', '2026-01-01', '2026-12-31'),
  ('REG-SUC-2', '11111111-0000-0000-0000-0000000000a2', 'padrao', 9, 50, 15, 15, '07:00', '13:00', '2027-01-01', null);

select is(
  (select r.regime_tempos
     from public.curso_regime_historico r
    where r.curso_id = '11111111-0000-0000-0000-0000000000a2'
      and r.status = 'ativo'
      and r.vigente_de <= date '2026-06-15'
      and (r.vigente_ate is null or r.vigente_ate > date '2026-06-15')),
  8::smallint,
  'FR-019 · um fato de 2026 resolve pelo regime de 2026, nao pelo que passou a vigir em 2027'
);

select * from finish();
rollback;
