-- Spec 014, PR 1 · migrations de dado D-1 (limites dos 24 currículos) e D-2 (tipos de parada e
-- reclassificação dos tipos de atividade).
--
-- ⚠️ pgTAP de dado NUNCA pula: na base limpa (sem cursos) confere o valor que prova a ABSTENÇÃO da D-1
--    (0 linhas); na base carregada (ETL + ETAPA 6, ou a cópia do remoto), os valores do CSV revisado.
begin;
select plan(13);

-- ── D-1 ──
select is(
  (select count(*)::int from public.limites_curriculo where status = 'ativo' and origem_migracao_v1 like 'spec014-D1:%'),
  case when exists (select 1 from public.cursos where codigo = 'CAHO') then 30 else 0 end,
  'D-1 · 30 limites com a procedência na base carregada; 0 na base sem cursos (a migration se absteve)'
);
select is(
  (select count(*)::int from public.limites_curriculo where status = 'ativo' and (fonte_arquivo is null or fonte_pagina is null)),
  0,
  'FR-001.1 · todo limite tem arquivo e página'
);
select is(
  (select array_agg(l.tempos order by l.categoria) from public.limites_curriculo l join public.cursos c on c.id = l.curso_id
    where c.codigo = 'CAHO' and l.status = 'ativo'),
  case when exists (select 1 from public.cursos where codigo = 'CAHO') then array[166, 166] end,
  'M-8 · CAHO: AEC 166 e TR 166'
);
select is(
  (select l.tempos from public.limites_curriculo l join public.cursos c on c.id = l.curso_id
    where c.codigo = 'C-Espc-HN' and l.categoria = 'TAD' and l.status = 'ativo'),
  case when exists (select 1 from public.cursos where codigo = 'C-Espc-HN') then 62 end,
  'M-8 · C-Espc-HN: TAD 62 (declara acima do percentual: vale o currículo, Q-16)'
);
select lives_ok(
  $q$do $t$ declare v uuid := (select id from public.limites_curriculo where status = 'ativo' limit 1); begin
      if v is not null then
        update public.limites_curriculo set status = 'inativo' where id = v;
        insert into public.limites_curriculo (curso_id, categoria, tempos, fonte_arquivo, fonte_pagina)
          select curso_id, categoria, tempos, fonte_arquivo, fonte_pagina from public.limites_curriculo where id = v;
      end if; end $t$$q$,
  'R-11 · inativar um limite e recriar o mesmo par passa (índice único parcial)'
);

-- ── D-2: tipos de parada ──
select is(
  (select array_agg(valor order by ordem) from public.config_listas where lista = 'tipos_parada' and valor in ('FR','LA','LP','NT','RC','PF')),
  array['FR','LA','LP','NT','RC','PF'],
  'FR-023 · a lista tipos_parada tem FR, LA, LP, NT, RC e PF'
);
select is(
  (select count(*)::int from public.config_listas where lista = 'tipos_parada' and valor in ('FR','LA','LP','NT','RC','PF')
      and metadados ? 'pode_global' and metadados ? 'aceita_tr'),
  6,
  'FR-023 · todo tipo de parada diz se pode ser global e se aceita "consome Tempo Reserva"'
);
select is(
  (select metadados ->> 'aceita_tr' from public.config_listas where lista = 'tipos_parada' and valor = 'FR'),
  'false',
  'FR-025.2 · feriado nunca consome Tempo Reserva'
);

-- ── D-2: tipos de atividade ──
select is(
  (select count(*)::int from public.config_listas
    where lista = 'tipos_atividade' and ativo and coalesce(metadados ->> 'uso', '') <> 'aula'
      and (metadados ->> 'categoria') is null),
  0,
  'FR-010 · todo tipo OFERECIDO para atividade tem categoria'
);
select is(
  (select array_agg(metadados ->> 'categoria' order by valor) from public.config_listas
    where lista = 'tipos_atividade' and valor in ('Apoio à Instrução', 'BDA', 'BDF', 'Monitoria', 'Português para Estrangeiros', 'Recepção aos alunos')),
  array['AEC', 'Apoio_Individualizado', 'Apoio_Individualizado', 'Apoio_Individualizado', 'Apoio_Individualizado', 'TAD'],
  'FR-021 · Recepção = TAD, Apoio à Instrução = AEC, Monitoria/Português/BDA/BDF = Apoio Individualizado'
);
select is(
  (select count(*)::int from public.config_listas
    where lista = 'tipos_atividade' and valor in ('Aula', 'Avaliação', 'Vista de Prova', 'Aula Teórica', 'Aula Prática')
      and metadados ->> 'uso' = 'aula'),
  (select count(*)::int from public.config_listas
    where lista = 'tipos_atividade' and valor in ('Aula', 'Avaliação', 'Vista de Prova', 'Aula Teórica', 'Aula Prática')),
  'FR-010 · os tipos de aula e avaliação estão marcados uso = aula (fora da oferta de atividade)'
);
select is(
  (select bool_or(ativo) from public.config_listas where lista = 'tipos_atividade' and valor = 'Licença de Pagamento'),
  case when exists (select 1 from public.config_listas where lista = 'tipos_atividade' and valor = 'Licença de Pagamento') then false end,
  'D-2 · Licença de Pagamento sai da lista de atividade (passa a ser o LP de tipos_parada)'
);
select is(
  (select valor from public.config_parametros where chave = 'avaliacao.vence_em_breve_dias' and status = 'ativo'),
  '2',
  'A-5 · o parâmetro "vence em breve" é 2 dias, como dado operacional'
);

select * from finish();
rollback;
