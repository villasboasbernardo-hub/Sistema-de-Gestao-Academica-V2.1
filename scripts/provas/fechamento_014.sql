-- O fechamento da spec 014 (T236) — as medidas de banco dos critérios de sucesso. SÓ SELECT.
-- Rodar com `python -X utf8 -m scripts.provas.medir_no_remoto scripts/provas/fechamento_014.sql local|remoto`:
-- a CLI do remoto devolve só a ÚLTIMA instrução de um arquivo, e o script as roda uma a uma. Sem comando do psql.
-- Hoje fixo em 2026-10-16 (a data da medição). As turmas com DSA sincronizado são as dez de `fontes.json`.

-- SC-001: AEC, TAD e TR por turma sincronizada — cumprido, previsto do PROENS e máximo; quem passa do máximo.
select turma_codigo, categoria, cumprido, previsto,
       coalesce(limite_declarado::numeric, round(ch_curricular * percentual_norma / 100.0, 2)) as maximo,
       case when cumprido > coalesce(limite_declarado::numeric, ch_curricular * percentual_norma / 100.0)
            then 'ACIMA DO MAXIMO' else '' end as alerta
  from public.vw_conformidade_tetos
 where turma_codigo in ('CAHO 2026', 'C-Ap-HN 2026', 'C-Ap-FR 2026', 'C-Espc-HN 2026', 'C-Espc-FR 2026', 'C-Esp-ME 2026',
                        'C-Exp-MetocOf 2026', 'C-Exp-Obs-ME 2026', 'C-Exp-BATI T1 2026', 'C-Exp-Ag-Mag 2026')
 order by turma_codigo, categoria;

-- SC-004 / SC-013: o EI e o Apoio Individualizado fora da CHT, e os dias parados à parte — a soma confere em toda turma.
select count(*) as turmas,
       count(*) filter (where cht_executada = chd_executada + ta_aec + ta_tad + ta_tr) as cht_igual_chd_mais_aec_tad_tr
  from public.vw_carga_horaria_turma;

-- SC-006: das avaliações vivas, quantas «pendente» com vista registrada (o critério: zero).
select count(*) as vivas,
       count(*) filter (where s.situacao = 'pendente' and exists (
         select 1 from public.vistas_de_avaliacao v where v.avaliacao_id = s.id and v.status = 'ativo')) as pendente_com_vista
  from public.vw_avaliacoes_situacao s
 where s.status in ('pendente', 'em_andamento', 'concluida', 'atrasada');

-- SC-007: as avaliações por status e com a marca de substituída.
select status::text as status, count(*) as avaliacoes,
       count(*) filter (where coalesce(observacoes, '') like '%[SUBSTITUIDO PELA PLANILHA DE CONTROLE]%') as com_a_marca,
       count(*) filter (where coalesce(observacoes, '') like '%[JUNTADA COMO SESSAO%') as juntadas
  from public.avaliacoes group by 1 order by 1;

-- SC-008: a HN-2101 do C-Ap-HN e a soma do currículo dela.
select d.codigo, d.cod_disciplina, d.carga_horaria_tempos,
       (select coalesce(sum(u.ch_prevista_tempos), 0) from public.unidades_ensino u
         where u.disciplina_id = d.id and u.status = 'ativo') as soma_das_ues,
       (select coalesce(sum(coalesce(a.ta_aplicacao, 0) + coalesce(a.ta_vista, 0)), 0) from public.avaliacoes_curriculo a
         where a.disciplina_id = d.id and a.status = 'ativo') as avaliacao_do_curriculo
  from public.disciplinas d where d.cod_disciplina = 'HN-2101' and d.status = 'ativo';

-- SC-014: as disciplinas ativas dos cursos — avaliação do currículo dentro da CH, e quantas «não definido».
select count(*) as disciplinas,
       count(*) filter (where n_itens > 0 and n_sem_tempo = 0) as com_tempo_definido,
       count(*) filter (where n_itens = 0 or n_sem_tempo > 0) as nao_definido_ou_sem_item,
       count(*) filter (where ta_avaliacao > ch) as avaliacao_acima_da_ch
  from (select d.id, d.carga_horaria_tempos as ch,
               count(a.id) filter (where a.status = 'ativo') as n_itens,
               count(a.id) filter (where a.status = 'ativo' and a.ta_aplicacao is null) as n_sem_tempo,
               coalesce(sum(coalesce(a.ta_aplicacao, 0) + coalesce(a.ta_vista, 0)) filter (where a.status = 'ativo'), 0) as ta_avaliacao
          from public.disciplinas d left join public.avaliacoes_curriculo a on a.disciplina_id = d.id
         where d.status = 'ativo' group by d.id, d.carga_horaria_tempos) x;

-- SC-015: arbitrado sem a origem «arbitrado» (o critério: zero) — o ajuste por turma e o item do curso.
select (select count(*) from public.avaliacoes_curriculo_turma where status = 'ativo') as ajustes_ativos,
       (select count(*) from public.avaliacoes_curriculo_turma where status = 'ativo' and origem is null) as ajustes_sem_origem,
       (select count(*) from public.avaliacoes_curriculo where status = 'ativo' and origem_item is null) as itens_sem_origem;

-- SC-019: a reserva do PROENS por curso chega às turmas do mesmo curso e ano com o mesmo valor; a genérica é parâmetro.
select r.codigo, c.codigo as curso, r.ano, r.tipo_reserva::text as tipo, r.tempos_reservados,
       (select string_agg(t.codigo || '=' || p.tempos_previstos, ', ' order by t.codigo)
          from public.previstos_proens_turma p join public.turmas t on t.id = p.turma_id
         where t.curso_id = r.curso_id and t.ano_letivo = r.ano and p.status = 'ativo'
           and p.categoria::text = r.tipo_reserva::text) as nas_turmas
  from public.reservas_proens r left join public.cursos c on c.id = r.curso_id
 order by r.codigo;

select chave, valor, status::text from public.config_parametros where chave like 'proens.reserva_generica%' order by 1;
