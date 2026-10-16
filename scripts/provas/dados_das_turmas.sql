-- Os dados de cada turma, num md5 por tabela — SÓ SELECT, o MESMO arquivo nos dois bancos:
--   local : docker exec -i supabase_db_ciaara-11-v2-1 psql -U postgres -d postgres -At -F'|' < este_arquivo
--   remoto: supabase db query --linked -f scripts/provas/dados_das_turmas.sql -o csv
-- Serve à conferência «dados das turmas iguais local × remoto» depois da rodada da sincronização (spec 014).
--
-- ⚠️ SEM ids, SEM auditoria (criado_por/em, editado_por/em) e SEM `observacoes` com a procedência da rodada: o que se
--    compara é o FATO, em chaves naturais — o código do lançamento, o rótulo do item («PM 1»), o código do instrutor,
--    o valor da lista. Os uuids e o autor diferem entre os bancos por construção (cadastro de conta, cópia).
-- ⚠️ Uma linha por turma: aulas · avaliações (com item e instrumento) · sessões de vista · sessões de aplicação ·
--    atividades · dias parados · ajustes da turma. A última linha é o md5 das 28 turmas juntas.
\pset footer off
with por_turma as (
  select t.codigo as turma,
    md5(coalesce((select string_agg(concat_ws(':', r.codigo, r.data, u.codigo, d.cod_disciplina, i.codigo, r.ta_inicial,
                                              r.tempos_consumidos, r.status, r.metodologia, r.local, r.conteudo_resumo,
                                              array_to_string(r.outros_instrutores, ',')), '|' order by r.codigo)
                    from public.registros_aula r
                    left join public.unidades_ensino u on u.id = r.unidade_ensino_id
                    left join public.disciplinas d on d.id = r.disciplina_id
                    left join public.instrutores i on i.id = r.instrutor_id
                   where r.turma_id = t.id), '')) as aulas,
    md5(coalesce((select string_agg(concat_ws(':', a.codigo, a.data_avaliacao, d.cod_disciplina, a.tipo_avaliacao, a.ta_inicial,
                                              a.tempos_consumidos, a.status, a.status_anterior, i.codigo, f.codigo,
                                              a.nome_fiscal_externo, lc.valor || ' ' || c.numero, lo.valor, a.local,
                                              array_to_string(a.outros_instrutores, ',')), '|' order by a.codigo)
                    from public.avaliacoes a
                    join public.disciplinas d on d.id = a.disciplina_id
                    left join public.instrutores i on i.id = a.instrutor_responsavel_id
                    left join public.instrutores f on f.id = a.fiscal_id
                    left join public.avaliacoes_curriculo c on c.id = a.avaliacao_curriculo_id
                    left join public.config_listas lc on lc.id = c.instrumento_id
                    left join public.config_listas lo on lo.id = a.instrumento_id
                   where a.turma_id = t.id), '')) as avaliacoes,
    md5(coalesce((select string_agg(concat_ws(':', a.codigo, v.codigo, v.numero, v.data, v.ta_inicial, v.tempos_consumidos,
                                              v.local, v.status, ci.codigo, v.conduz_nome_externo), '|' order by v.codigo)
                    from public.vistas_de_avaliacao v
                    join public.avaliacoes a on a.id = v.avaliacao_id
                    left join public.instrutores ci on ci.id = v.conduz_instrutor_id
                   where a.turma_id = t.id), '')) as vistas,
    md5(coalesce((select string_agg(concat_ws(':', a.codigo, s.codigo, s.numero, s.data, s.ta_inicial, s.tempos_consumidos,
                                              s.local, s.status), '|' order by s.codigo)
                    from public.sessoes_de_aplicacao s
                    join public.avaliacoes a on a.id = s.avaliacao_id
                   where a.turma_id = t.id), '')) as aplicacoes,
    md5(coalesce((select string_agg(concat_ws(':', n.codigo, n.data, n.categoria_normativa, n.subtipo, n.descricao, n.ta_inicial,
                                              n.tempos_consumidos, n.status, i.codigo, n.responsavel_externo, n.local), '|' order by n.codigo)
                    from public.atividades_nao_letivas n
                    left join public.instrutores i on i.id = n.instrutor_id
                   where n.turma_id = t.id), '')) as atividades,
    md5(coalesce((select string_agg(concat_ws(':', p.codigo, p.data, p.ta_inicial, p.tempos, l.valor, p.motivo, p.prevista, p.status),
                                    '|' order by p.codigo)
                    from public.dias_parados p join public.config_listas l on l.id = p.tipo_parada_id
                   where p.turma_id = t.id), '')) as dias_parados,
    md5(coalesce((select string_agg(concat_ws(':', c.codigo, x.ta_aplicacao, x.ta_vista, x.origem, x.confirmado_em is not null, x.status),
                                    '|' order by c.codigo)
                    from public.avaliacoes_curriculo_turma x join public.avaliacoes_curriculo c on c.id = x.avaliacao_curriculo_id
                   where x.turma_id = t.id), '')) as ajustes
    from public.turmas t
)
select turma, left(aulas, 8), left(avaliacoes, 8), left(vistas, 8), left(aplicacoes, 8), left(atividades, 8),
       left(dias_parados, 8), left(ajustes, 8)
  from por_turma
union all
select '~TODAS', left(md5(string_agg(concat_ws(':', turma, aulas, avaliacoes, vistas, aplicacoes, atividades, dias_parados, ajustes),
                                     '|' order by turma)), 8), '', '', '', '', '', ''
  from por_turma
 order by 1;
