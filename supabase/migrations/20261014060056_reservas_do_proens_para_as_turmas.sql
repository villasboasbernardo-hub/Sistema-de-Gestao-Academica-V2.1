-- =================================================================================
-- Spec 014, PR 1.1 · migration de DADO D-3 — as reservas do PROENS passam para as turmas
-- Data local: 14/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- O que faz (FR-008, emenda E-7 aprovada; data-model §2.8):
--   1. Cada reserva de `reservas_proens` COM curso vira o previsto da turma do mesmo curso e ano, com a
--      mesma categoria (TAD ou TR), o mesmo valor e `origem_proens` preservada. AEC não ganha linha: o
--      PROENS não deu valor de AEC.
--   2. A reserva GENÉRICA (sem curso) vira parâmetro normativo: `proens.reserva_generica_tad` e
--      `proens.reserva_generica_tr`, com o ano de vigência. Ela é SUGESTÃO no formulário, nunca previsto
--      gravado (RN-2027-03).
--
-- ⚠️ NÃO ADIVINHA TURMA: medido na cópia `remoto-20261014-021627.sql` (medicoes/d3-antes.md), cada um dos
--    cinco cursos com reserva tem EXATAMENTE uma turma em 2026. Se um curso tiver zero ou mais de uma no
--    ano, a migration ABORTA nomeando o curso — o caso vai a Bernardo, não a uma escolha da máquina.
-- ⚠️ Abstém-se, com aviso, em base sem reservas (o `db reset`); idempotente pelo índice parcial
--    `previsto_unico` e pelo `where not exists` dos parâmetros; evento em `migracao_log` só quando grava.
--
-- Reversão (reversao-pr1-1.sql): os previstos com a procedência `spec014-D3:` e os dois parâmetros ficam
-- `inativo`, com evento novo em `migracao_log` (regra 5).
-- =================================================================================

do $$
declare
  v_reservas   integer;
  v_ambiguo    text;
  v_previstos  integer := 0;
  v_parametros integer := 0;
  v_esperados  integer;
begin
  select count(*) into v_reservas from public.reservas_proens where status = 'ativo';
  if v_reservas = 0 then
    raise notice 'D-3 (spec 014): base sem reservas do PROENS — a migration se abstém (a ETAPA 6b do ETL aplica o mesmo arquivo).';
    return;
  end if;

  select string_agg(format('%s/%s (%s turmas)', c.codigo, r.ano, x.n), ', ') into v_ambiguo
    from (select distinct curso_id, ano from public.reservas_proens where status = 'ativo' and curso_id is not null) r
    join public.cursos c on c.id = r.curso_id
    cross join lateral (select count(*) as n from public.turmas t
                         where t.curso_id = r.curso_id and t.ano_letivo = r.ano) x
   where x.n <> 1;
  if v_ambiguo is not null then
    raise exception 'D-3 (spec 014): curso sem exatamente UMA turma no ano da reserva — %. A migration não escolhe turma: o caso vai a Bernardo.', v_ambiguo;
  end if;

  with ins as (
    insert into public.previstos_proens_turma (turma_id, categoria, tempos_previstos, origem_proens, origem_migracao_v1)
    select t.id, r.tipo_reserva::text::public.categoria_normativa, r.tempos_reservados, r.origem_proens,
           'spec014-D3:' || r.codigo
      from public.reservas_proens r
      join public.turmas t on t.curso_id = r.curso_id and t.ano_letivo = r.ano
     where r.status = 'ativo' and r.curso_id is not null
    on conflict (turma_id, categoria) where status = 'ativo' do nothing
    returning 1
  )
  select count(*) into v_previstos from ins;

  with ins as (
    insert into public.config_parametros (chave, valor, tipo, unidade, ano_vigencia, descricao, fundamento_normativo, natureza)
    select 'proens.reserva_generica_' || lower(r.tipo_reserva::text), r.tempos_reservados::text, 'inteiro', 'TA', r.ano,
           'Spec 014, D-3: a reserva GENÉRICA do PROENS (cursos sem detalhamento). Sugestão no formulário do '
           'previsto, nunca previsto gravado (RN-2027-03).',
           coalesce(r.origem_proens, 'PROENS') || ' — ' || coalesce(r.criterio, 'reserva genérica'),
           'normativo'
      from public.reservas_proens r
     where r.status = 'ativo' and r.curso_id is null
       and not exists (select 1 from public.config_parametros p
                        where p.chave = 'proens.reserva_generica_' || lower(r.tipo_reserva::text)
                          and coalesce(p.ano_vigencia, 0) = r.ano and p.status = 'ativo')
    returning 1
  )
  select count(*) into v_parametros from ins;

  select count(*) into v_esperados
    from public.reservas_proens r
   where r.status = 'ativo' and r.curso_id is not null
     and not exists (select 1 from public.previstos_proens_turma p
                       join public.turmas t on t.id = p.turma_id
                      where t.curso_id = r.curso_id and t.ano_letivo = r.ano
                        and p.categoria::text = r.tipo_reserva::text
                        and p.tempos_previstos = r.tempos_reservados and p.status = 'ativo');
  if v_esperados <> 0 then
    raise exception 'D-3 (spec 014): % reserva(s) com curso sem o previsto igual na turma', v_esperados;
  end if;

  if v_previstos + v_parametros > 0 then
    insert into public.migracao_log (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,
                                     acao, regra_aplicada, valor_antes, valor_depois, observacao)
    values ('MLOG-014-D3-' || to_char(now(), 'YYYYMMDDHH24MISS'), 'reservas_proens', 'por curso e ano',
            'previstos_proens_turma', 'por turma', 'adicionado'::public.acao_migracao, 'FR-008 / E-7 (spec 014)',
            null, v_previstos || ' previstos e ' || v_parametros || ' parâmetros',
            'As reservas do PROENS por curso passaram para a turma do mesmo curso e ano; a genérica para config_parametros.');
  end if;
  raise notice 'D-3 (spec 014): % previsto(s) e % parâmetro(s) gravados.', v_previstos, v_parametros;
end;
$$;
