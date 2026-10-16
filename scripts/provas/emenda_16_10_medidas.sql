-- O antes/depois das decisões de 16/10/2026 (spec 014, opção A do desenho de 15/10/2026) — SÓ SELECT.
-- Rodar no local (docker exec … psql -At -F'|') ou no remoto (supabase db query --linked -f), com o MESMO arquivo.
-- Hoje fixo em 2026-10-16 (a data da medição), prazo de vista 7 e «vence em breve» 2 (os parâmetros do banco).
--
-- 1. provas: as avaliações VIVAS da sincronização (DSAP-), quantas ligadas a item do currículo, e as sessões de
--    aplicação 2..N (RN-AV-12) — da planilha (DSAP-…-SA) e da tela (SAP-).
-- 2. vistas atrasadas e vencendo em breve, pelas DUAS regras:
--    · a de 14/10/2026: só a prova LIGADA a item com tempo de vista (`ta_vista > 0`), prazo da data da prova;
--    · a de 16/10/2026: a situação do espelho `app.fn_status_vista` (o instrumento — PM, PO e PE —, do item ou de
--      `avaliacoes.instrumento_id`; o prazo da última sessão), só para a prova ligada OU com instrumento gravado, e
--      sem OD — o mesmo filtro do alerta (`lib/dominio/avaliacoes/alertas-de-vista.ts`), provado pela prova cruzada.
\pset footer off
with vivas as (
  select a.* from public.avaliacoes a
   where a.codigo like 'DSAP-%' and a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
)
select 'provas' as medida,
       count(*) as vivas,
       count(*) filter (where avaliacao_curriculo_id is not null) as ligadas,
       count(*) filter (where avaliacao_curriculo_id is null and instrumento_id is not null) as sem_item_com_instrumento,
       (select count(*) from public.sessoes_de_aplicacao s join vivas v on v.id = s.avaliacao_id
         where s.status = 'ativo') as sessoes_2_a_n,
       (select count(distinct s.avaliacao_id) from public.sessoes_de_aplicacao s join vivas v on v.id = s.avaliacao_id
         where s.status = 'ativo') as provas_em_n_sessoes
  from vivas;

with base as (
  select a.id, a.codigo, t.codigo as turma, a.avaliacao_curriculo_id, a.instrumento_id, c.ta_vista, a.data_avaliacao,
         coalesce(li.metadados ->> 'natureza', lo.metadados ->> 'natureza', '') as natureza,
         greatest(a.data_avaliacao, (select max(s.data) from public.sessoes_de_aplicacao s
                                      where s.avaliacao_id = a.id and s.status = 'ativo')) as fim,
         exists (select 1 from public.vistas_de_avaliacao v where v.avaliacao_id = a.id and v.status = 'ativo') as tem_vista,
         app.fn_status_vista(a.id, '2026-10-16') as situacao
    from public.avaliacoes a
    join public.turmas t on t.id = a.turma_id
    left join public.avaliacoes_curriculo c on c.id = a.avaliacao_curriculo_id
    left join public.config_listas li on li.id = c.instrumento_id
    left join public.config_listas lo on lo.id = a.instrumento_id
   where a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
     and a.data_avaliacao <= '2026-10-16'
)
select 'vistas, regra de 14/10' as medida,
       count(*) filter (where avaliacao_curriculo_id is not null and natureza <> 'od' and not tem_vista
                          and coalesce(ta_vista, 0) > 0 and '2026-10-16'::date - data_avaliacao > 7) as atrasadas,
       count(*) filter (where avaliacao_curriculo_id is not null and natureza <> 'od' and not tem_vista
                          and coalesce(ta_vista, 0) > 0 and (data_avaliacao + 7) - '2026-10-16'::date between 0 and 2) as vencendo
  from base
union all
select 'vistas, regra de 16/10',
       count(*) filter (where (avaliacao_curriculo_id is not null or instrumento_id is not null) and natureza <> 'od'
                          and situacao = 'atrasada'),
       count(*) filter (where (avaliacao_curriculo_id is not null or instrumento_id is not null) and natureza <> 'od'
                          and situacao = 'em_andamento' and (fim + 7) - '2026-10-16'::date between 0 and 2)
  from base;

-- o detalhe das atrasadas pela regra de 16/10
select t.codigo as turma, d.cod_disciplina, coalesce(li.valor || ' ' || c.numero, lo.valor || ' (sem item)') as prova,
       a.data_avaliacao, a.codigo
  from public.avaliacoes a
  join public.turmas t on t.id = a.turma_id
  join public.disciplinas d on d.id = a.disciplina_id
  left join public.avaliacoes_curriculo c on c.id = a.avaliacao_curriculo_id
  left join public.config_listas li on li.id = c.instrumento_id
  left join public.config_listas lo on lo.id = a.instrumento_id
 where a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
   and (a.avaliacao_curriculo_id is not null or a.instrumento_id is not null)
   and coalesce(li.metadados ->> 'natureza', lo.metadados ->> 'natureza', '') <> 'od'
   and app.fn_status_vista(a.id, '2026-10-16') = 'atrasada'
 order by t.codigo, a.data_avaliacao;
