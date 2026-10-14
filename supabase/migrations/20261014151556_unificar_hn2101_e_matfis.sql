-- =================================================================================
-- Spec 014, PR 4 · migration de DADO D-6 — a unificação dos desdobramentos (Q-15, FR-031.5)
-- Data local: 14/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- O currículo da DEnsM tem UMA disciplina onde o banco tem DUAS (desdobramento N-3 da carga de UEs):
--   C-Ap-HN · I (105) + I-I (21)  → a disciplina I passa a ser HN-2101 «MATEMÁTICA E FÍSICA APLICADAS À
--                                   HIDROGRAFIA.», 126 TA (PDF c-ap-hn.pdf, p. 6 e 8). `cod_disciplina` FICA «I»:
--                                   é a chave da planilha de controle e de toda a grade da turma (decisão D4.1).
--   CAHO · MAT (28) + FIS (28)    → a disciplina MAT passa a ser MATFIS «NIVELAMENTO DE MATEMÁTICA E FÍSICA.»,
--                                   56 TA, com `cod_disciplina` MATFIS (PDF do CAHO, p. 8 e 72; T152).
--
-- Pela DECISÃO D-2 do plan (respondida: sim) e pela D-UNIF-1 (Q do clarify):
--   - as UEs da extra passam à unificada (a numeração do currículo já é contínua: I-I tem a UE 7; FIS, a 2);
--   - a `turma_disciplina` unificada fica com a UNIÃO dos períodos (menor início, maior término,
--     `origem_periodo = manual`) e a UNIÃO das atribuições (`turma_disciplina_instrutor`, código
--     `<TDI da unificada>#<código do instrutor>`, cada instrutor uma vez, `ch_prevista_tempos` nula = rateio
--     igual); a linha extra é INATIVADA, nunca apagada;
--   - `turma_disciplina_unidade`, aulas, avaliações e atividades com disciplina são reapontadas;
--   - os vínculos de `instrutor_disciplina`: quem só tinha a extra passa a ter a unificada; quem tinha as duas
--     fica com a da unificada e a da extra é inativada;
--   - `planejamento_anual` da extra é reapontado; semana que colidir ABORTA (não há regra de fusão a adivinhar —
--     medido em 14/10/2026: zero linhas nas quatro disciplinas);
--   - a disciplina extra é INATIVADA (regra 4).
--   - ⚠️ D-UNIF-1: as linhas históricas ativas (com `origem_migracao_v1`) reapontadas PRESERVAM `editado_em`
--     nulo — é reclassificação, não edição —; por isso os gatilhos de auditoria das tabelas tocadas ficam
--     desligados SÓ dentro desta transação. Nenhuma catraca é emendada.
--
-- ⚠️ A ASSERÇÃO FINAL: por turma, a contagem de aulas, avaliações e atividades e a CH executada
--    (`vw_carga_horaria_turma.chd_executada`) são IGUAIS antes e depois; senão a migration aborta.
-- ⚠️ O mapa `id antigo → id novo` e as contagens vão para `migracao_log` (o evento de referência).
-- ⚠️ Idempotente (a extra já inativa com a unificada certa é pulada) e abstém-se em base sem cadastros.
--
-- Reversão (reversao-pr4.sql): o mapa de volta — reaponta à extra e a reativa, com os valores antigos.
-- =================================================================================

do $$
declare
  p record;
  v_a uuid;          -- a unificada (fica)
  v_b uuid;          -- a extra (inativada)
  v_td record;
  v_td_a uuid;
  v_feitos integer := 0;
  v_antes jsonb;
  v_depois jsonb;
  v_n integer;
  v_carimbo text := to_char(now(), 'YYYYMMDDHH24MISS');
  v_mov jsonb;
begin
  if not exists (select 1 from public.cursos where codigo in ('C-Ap-HN', 'CAHO')) then
    raise notice 'D-6 (spec 014): base sem cadastros — a migration se abstém (a ETAPA 6 do ETL aplica o mesmo arquivo).';
    return;
  end if;

  -- O retrato por turma, antes.
  select jsonb_object_agg(t.codigo, jsonb_build_array(
           (select count(*) from public.registros_aula r where r.turma_id = t.id),
           (select count(*) from public.avaliacoes a where a.turma_id = t.id),
           (select count(*) from public.atividades_nao_letivas n where n.turma_id = t.id),
           (select v.chd_executada from public.vw_carga_horaria_turma v where v.turma_id = t.id)))
    into v_antes
    from public.turmas t join public.cursos c on c.id = t.curso_id where c.codigo in ('C-Ap-HN', 'CAHO');

  alter table public.registros_aula disable trigger trg_registros_aula_auditoria;
  alter table public.avaliacoes disable trigger trg_avaliacoes_auditoria;
  alter table public.atividades_nao_letivas disable trigger trg_atividades_nao_letivas_auditoria;
  alter table public.unidades_ensino disable trigger trg_unidades_ensino_auditoria;
  alter table public.instrutor_disciplina disable trigger trg_instrutor_disciplina_auditoria;
  alter table public.planejamento_anual disable trigger trg_planejamento_anual_auditoria;
  -- A FK composta (UE, disciplina) de `turma_disciplina_unidade` impede mover a UE e a linha da turma no
  -- mesmo passo; ela sai e VOLTA nesta transação, validando tudo de novo.
  alter table public.turma_disciplina_unidade drop constraint tdu_da_unidade_ensino;
  alter table public.turma_disciplina_unidade drop constraint tdu_da_turma_disciplina;

  for p in
    select * from (values
      ('C-Ap-HN', 'I',   'I-I', 105, 21, 'I',      'MATEMÁTICA E FÍSICA APLICADAS À HIDROGRAFIA.', 126),
      ('CAHO',    'MAT', 'FIS', 28,  28, 'MATFIS', 'NIVELAMENTO DE MATEMÁTICA E FÍSICA.',          56)
    ) as x(curso, cod_a, cod_b, ch_a, ch_b, cod_novo, nome_novo, ch_nova)
  loop
    select d.id into v_a from public.disciplinas d join public.cursos k on k.id = d.curso_id
     where k.codigo = p.curso and d.cod_disciplina = p.cod_novo and d.carga_horaria_tempos = p.ch_nova and d.status = 'ativo';
    if v_a is not null then
      continue;  -- já unificada
    end if;
    select d.id into v_a from public.disciplinas d join public.cursos k on k.id = d.curso_id
     where k.codigo = p.curso and d.cod_disciplina = p.cod_a and d.carga_horaria_tempos = p.ch_a and d.status = 'ativo';
    select d.id into v_b from public.disciplinas d join public.cursos k on k.id = d.curso_id
     where k.codigo = p.curso and d.cod_disciplina = p.cod_b and d.carga_horaria_tempos = p.ch_b and d.status = 'ativo';
    if v_a is null or v_b is null then
      raise exception 'D-6 %: as disciplinas % e % não estão como o lote as mediu. Pare e confira.', p.curso, p.cod_a, p.cod_b;
    end if;

    v_mov := jsonb_build_object('curso', p.curso, 'unificada', v_a, 'extra', v_b);

    -- UEs
    update public.unidades_ensino set disciplina_id = v_a where disciplina_id = v_b;
    get diagnostics v_n = row_count; v_mov := v_mov || jsonb_build_object('ues', v_n);

    -- turma_disciplina: união por turma
    for v_td in select * from public.turma_disciplina where disciplina_id = v_b and status = 'ativo' loop
      select id into v_td_a from public.turma_disciplina
       where disciplina_id = v_a and turma_id = v_td.turma_id and status = 'ativo';
      if v_td_a is null then
        update public.turma_disciplina set disciplina_id = v_a where id = v_td.id;
        continue;
      end if;
      update public.turma_disciplina a
         set previsao_inicio = least(a.previsao_inicio, v_td.previsao_inicio),
             previsao_termino = greatest(a.previsao_termino, v_td.previsao_termino),
             origem_periodo = case when least(a.previsao_inicio, v_td.previsao_inicio) is null then a.origem_periodo else 'manual' end
       where a.id = v_td_a;
      insert into public.turma_disciplina_instrutor (codigo, turma_disciplina_id, instrutor_id, ch_prevista_tempos, papel,
                                                     status, origem_migracao_v1)
      select ta.codigo || '#' || i.codigo, v_td_a, b.instrutor_id, null, b.papel, 'ativo', 'spec014-D6'
        from public.turma_disciplina_instrutor b
        join public.instrutores i on i.id = b.instrutor_id
        join public.turma_disciplina ta on ta.id = v_td_a
       where b.turma_disciplina_id = v_td.id and b.status = 'ativo'
      on conflict on constraint tdi_par_unico do nothing;
      update public.turma_disciplina_unidade set turma_disciplina_id = v_td_a where turma_disciplina_id = v_td.id;
      update public.turma_disciplina set status = 'inativo' where id = v_td.id;
    end loop;
    update public.turma_disciplina_unidade set disciplina_id = v_a where disciplina_id = v_b;

    -- lançamentos
    update public.registros_aula set disciplina_id = v_a where disciplina_id = v_b;
    get diagnostics v_n = row_count; v_mov := v_mov || jsonb_build_object('aulas', v_n);
    update public.avaliacoes set disciplina_id = v_a where disciplina_id = v_b;
    get diagnostics v_n = row_count; v_mov := v_mov || jsonb_build_object('avaliacoes', v_n);
    update public.atividades_nao_letivas set disciplina_id = v_a where disciplina_id = v_b;
    get diagnostics v_n = row_count; v_mov := v_mov || jsonb_build_object('atividades', v_n);

    -- habilitações: quem só tinha a extra passa à unificada; quem tinha as duas fica com a unificada
    update public.instrutor_disciplina b set status = 'inativo'
     where b.disciplina_id = v_b and b.status = 'ativo'
       and exists (select 1 from public.instrutor_disciplina a
                    where a.disciplina_id = v_a and a.instrutor_id = b.instrutor_id and a.status = 'ativo');
    update public.instrutor_disciplina set disciplina_id = v_a where disciplina_id = v_b and status = 'ativo';
    get diagnostics v_n = row_count; v_mov := v_mov || jsonb_build_object('habilitacoes_movidas', v_n);

    -- planejamento
    if exists (select 1 from public.planejamento_anual b join public.planejamento_anual a
                 on a.disciplina_id = v_a and a.ano_letivo = b.ano_letivo and a.versao = b.versao
                and a.curso_id = b.curso_id and a.semana_ano = b.semana_ano and a.tipo_linha = b.tipo_linha
                where b.disciplina_id = v_b) then
      raise exception 'D-6 %: o planejamento das duas disciplinas colide na mesma semana — não há regra de fusão escrita.', p.curso;
    end if;
    update public.planejamento_anual set disciplina_id = v_a where disciplina_id = v_b;

    -- as disciplinas
    update public.disciplinas set cod_disciplina = p.cod_novo, nome_disciplina = p.nome_novo,
                                  carga_horaria_tempos = p.ch_nova where id = v_a;
    update public.disciplinas set status = 'inativo' where id = v_b;

    insert into public.migracao_log (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,
                                     acao, regra_aplicada, valor_antes, valor_depois, observacao)
    values ('MLOG-014-D6-' || v_carimbo || '-' || p.curso, 'disciplinas', v_b::text, 'disciplinas', v_a::text,
            'conciliado'::public.acao_migracao, 'FR-031.5 / Q-15 / D-UNIF-1 (spec 014, D-6)',
            format('%s (%s) + %s (%s)', p.cod_a, p.ch_a, p.cod_b, p.ch_b),
            format('%s «%s» (%s)', p.cod_novo, p.nome_novo, p.ch_nova),
            'Mapa e contagens: ' || v_mov::text);
    v_feitos := v_feitos + 1;
  end loop;

  alter table public.turma_disciplina_unidade add constraint tdu_da_turma_disciplina
    foreign key (turma_disciplina_id, disciplina_id) references public.turma_disciplina (id, disciplina_id) on delete restrict;
  alter table public.turma_disciplina_unidade add constraint tdu_da_unidade_ensino
    foreign key (unidade_ensino_id, disciplina_id) references public.unidades_ensino (id, disciplina_id) on delete restrict;
  alter table public.registros_aula enable trigger trg_registros_aula_auditoria;
  alter table public.avaliacoes enable trigger trg_avaliacoes_auditoria;
  alter table public.atividades_nao_letivas enable trigger trg_atividades_nao_letivas_auditoria;
  alter table public.unidades_ensino enable trigger trg_unidades_ensino_auditoria;
  alter table public.instrutor_disciplina enable trigger trg_instrutor_disciplina_auditoria;
  alter table public.planejamento_anual enable trigger trg_planejamento_anual_auditoria;

  select jsonb_object_agg(t.codigo, jsonb_build_array(
           (select count(*) from public.registros_aula r where r.turma_id = t.id),
           (select count(*) from public.avaliacoes a where a.turma_id = t.id),
           (select count(*) from public.atividades_nao_letivas n where n.turma_id = t.id),
           (select v.chd_executada from public.vw_carga_horaria_turma v where v.turma_id = t.id)))
    into v_depois
    from public.turmas t join public.cursos c on c.id = t.curso_id where c.codigo in ('C-Ap-HN', 'CAHO');
  if v_depois is distinct from v_antes then
    raise exception 'D-6: a contagem por turma mudou — antes % · depois %', v_antes, v_depois;
  end if;

  if v_feitos > 0 then
    insert into public.migracao_log (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,
                                     acao, regra_aplicada, valor_antes, valor_depois, observacao)
    values ('MLOG-014-D6-' || v_carimbo || '-REFERENCIA', 'turmas', 'C-Ap-HN e CAHO', 'turmas', 'C-Ap-HN e CAHO',
            'conciliado'::public.acao_migracao, 'FR-031.5 (spec 014, D-6)', v_antes::text, v_depois::text,
            'Evento de referência: por turma, [aulas, avaliações, atividades, CHD executada] iguais antes e depois.');
  end if;
  raise notice 'D-6 (spec 014): % unificação(ões); contagem por turma igual antes e depois.', v_feitos;
end;
$$;
