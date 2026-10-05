-- =====================================================================================
-- T046 · O `down` da migration 20261005181116, executado numa base descartavel.
-- A ordem e a INVERSA da aplicacao, e e o texto do cabecalho da migration virado SQL.
-- ⚠️ As duas views voltam com a definicao ANTERIOR **e** com o `with (security_invoker = true)`
--    REPETIDO — e justamente essa opcao que o `pg_dump` confere (gotcha 10).
-- =====================================================================================
begin;

-- 9/10 · a semente e os comentarios
update public.config_listas set metadados = metadados - 'sigla'
 where lista = 'metodologias' and metadados ? 'sigla';
update public.config_listas set metadados = metadados - 'categoria'
 where lista = 'tipos_atividade' and metadados ? 'categoria';
delete from public.config_listas
 where (lista, valor) in (('metodologias','Prova Mista'), ('metodologias','Prova Objetiva'),
        ('metodologias','Observação de Desempenho'), ('metodologias','Trabalho Individual'),
        ('metodologias','Trabalho em Grupo'), ('metodologias','Estudo Individual'),
        ('metodologias','Exposição Oral'), ('metodologias','Aula Prática'),
        ('metodologias','Prova Prática'), ('metodologias','Prova Escrita'),
        ('tipos_atividade','Visita Técnica'), ('tipos_atividade','Estudo Individual'),
        ('tipos_atividade','Monitoria'), ('tipos_atividade','Palestra'),
        ('tipos_atividade','Atividade Extracurricular'), ('tipos_atividade','Orientação de TFM'),
        ('tipos_atividade','Evento/Cerimônia'), ('tipos_atividade','Administração'),
        ('tipos_atividade','Tempo Reserva'), ('tipos_atividade','Recuperação da Aprendizagem'))
   -- ⚠️ **SO A LINHA SEM PROCEDENCIA**, e e o que faz a reversao valer nas DUAS bases: numa base
   --    recriada os 19 valores nasceram da migration (procedencia NULA) e todos saem; no remoto,
   --    onde o ETL ja rodou, **9 deles vieram da planilha** e carregam
   --    `origem_migracao_v1 = 'Config_Listas:…'` — apaga-los seria apagar DADO, nao reverter
   --    estrutura. Sem este filtro a reversao destroi vocabulario real.
     and origem_migracao_v1 is null;
delete from public.config_parametros
 where chave in ('dsa.teto_tfm_semana','dsa.teto_recomendado_semana','dsa.sabado_tempos');

comment on type public.impacto_feriado is
  'Impacto da data sobre a capacidade letiva: `dia_inteiro` zera o dia no motor preditivo; '
  '`parcial` reduz; `informativo` não altera cálculo algum. '
  'Origem: BRIEF v2.1 §2; v2.0 `Calendario_Feriados`; RF-DADOS-04.';

-- 8 · a funcao de conflito
drop function if exists public.conflitos_da_semana(uuid, date, date);

-- 7 · `vw_disciplinas_execucao` com a definicao ANTERIOR (JOIN interno na UE)
create or replace view public.vw_disciplinas_execucao with (security_invoker = true) as
  with aulas as (
    select ue.disciplina_id, r.turma_id,
           min(r.data) as primeira_data, max(r.data) as ultima_data,
           sum(r.tempos_consumidos) as ta
      from public.registros_aula r
      join public.unidades_ensino ue on ue.id = r.unidade_ensino_id
     where r.status = 'ativo'::status_registro
     group by ue.disciplina_id, r.turma_id
  ), provas as (
    select a.disciplina_id, a.turma_id,
           min(a.data_avaliacao) as primeira_data,
           greatest(max(a.data_avaliacao), max(a.data_vista_prova)) as ultima_data,
           sum(coalesce(a.tempos_consumidos::integer, 0)
               + coalesce(a.tempos_consumidos_vista::integer, 0)) as ta
      from public.avaliacoes a
     where a.status <> 'cancelada'::status_avaliacao
     group by a.disciplina_id, a.turma_id
  )
  select d.id as disciplina_id, d.codigo as disciplina_codigo, d.curso_id, d.cod_disciplina,
         d.nome_disciplina, d.carga_horaria_tempos, t.id as turma_id, t.codigo as turma_codigo,
         t.ano_letivo,
         coalesce(td.previsao_inicio, d.previsao_inicio) as previsao_inicio_efetiva,
         coalesce(td.previsao_termino, d.previsao_termino) as previsao_termino_efetiva,
         td.origem_periodo,
         least(au.primeira_data, pr.primeira_data) as data_real_inicio,
         greatest(au.ultima_data, pr.ultima_data) as data_real_termino,
         coalesce(au.ta, 0::bigint) as ta_aula_executados,
         coalesce(pr.ta, 0::bigint) as ta_avaliacao_executados,
         coalesce(au.ta, 0::bigint) + coalesce(pr.ta, 0::bigint) as ta_executados,
         d.carga_horaria_tempos - coalesce(au.ta, 0::bigint) - coalesce(pr.ta, 0::bigint) as ta_saldo
    from public.disciplinas d
    join public.turmas t on t.curso_id = d.curso_id
    left join public.turma_disciplina td
      on td.disciplina_id = d.id and td.turma_id = t.id and td.status = 'ativo'::status_registro
    left join aulas au on au.disciplina_id = d.id and au.turma_id = t.id
    left join provas pr on pr.disciplina_id = d.id and pr.turma_id = t.id
   where d.status = 'ativo'::status_registro;

-- 6 · `vw_ocupacao_ta` com a definicao ANTERIOR (9 colunas, JOIN interno, global de fora)
drop view if exists public.vw_ocupacao_ta;
create view public.vw_ocupacao_ta with (security_invoker = true) as
  select r.turma_id, r.data, r.ta_inicial, r.ta_final, r.tempos_consumidos,
         'aula'::text as origem, r.id as fato_id, ue.disciplina_id, r.instrutor_id
    from public.registros_aula r
    join public.unidades_ensino ue on ue.id = r.unidade_ensino_id
   where r.status = 'ativo'::status_registro and r.ta_inicial is not null
  union all
  select a.turma_id, a.data_avaliacao as data, a.ta_inicial, a.ta_final, a.tempos_consumidos,
         'avaliacao'::text as origem, a.id as fato_id, a.disciplina_id,
         a.instrutor_responsavel_id as instrutor_id
    from public.avaliacoes a
   where a.status <> 'cancelada'::status_avaliacao and a.ta_inicial is not null
  union all
  select a.turma_id, a.data_vista_prova as data, a.ta_inicial_vista as ta_inicial,
         a.ta_final_vista as ta_final, a.tempos_consumidos_vista as tempos_consumidos,
         'vista_prova'::text as origem, a.id as fato_id, a.disciplina_id,
         a.instrutor_responsavel_id as instrutor_id
    from public.avaliacoes a
   where a.status <> 'cancelada'::status_avaliacao and a.ta_inicial_vista is not null
  union all
  select n.turma_id, n.data, n.ta_inicial, n.ta_final, n.tempos_consumidos,
         'atividade_nao_letiva'::text as origem, n.id as fato_id,
         null::uuid as disciplina_id, null::uuid as instrutor_id
    from public.atividades_nao_letivas n
   where n.status = 'ativo'::status_registro and n.ta_inicial is not null
     and n.turma_id is not null;

comment on view public.vw_ocupacao_ta is
  'Grade unificada de ocupação de TA por turma e data, reunindo aula, aplicação de prova, vista de prova e atividade não letiva. Insumo do DSA e da detecção de conflito de horário. NÃO é uma constraint: conflito de TA é ALERTA, nunca bloqueio (RN-DEG-02).';

-- ⚠️ **O `drop view` + `create view` DEVOLVE OS PRIVILEGIOS PADRAO, e o `anon` VOLTA.** Medido
--    pela propria prova: o `pg_dump` revertido trazia
--    `GRANT SELECT,INSERT,... ON vw_ocupacao_ta TO anon`, que o original NAO tinha — a reversao
--    ALARGAVA permissao. `revoke delete, truncate` nao cobria isso; o que cobre e `revoke all`.
revoke all on public.vw_ocupacao_ta from anon;
revoke delete, truncate on public.vw_ocupacao_ta from authenticated;
revoke delete, truncate on public.vw_disciplinas_execucao from authenticated, anon;

-- 5 · o responsavel da atividade
alter table public.atividades_nao_letivas drop constraint ativ_responsavel_exclusivo;
alter table public.atividades_nao_letivas drop column instrutor_id, drop column responsavel_externo;

-- 4 · o CHECK do Estudo Individual
alter table public.atividades_nao_letivas drop constraint ativ_estudo_individual_de_turma;

-- 3 · os CHECK de registros_aula, e a catraca de volta a forma original
alter table public.registros_aula drop constraint reg_aula_ue_xor_disciplina;
alter table public.registros_aula drop constraint reg_aula_ue_ou_disciplina;
alter table public.registros_aula drop constraint reg_aula_ue_so_nula_no_historico;
alter table public.registros_aula add constraint reg_aula_ue_so_nula_no_historico check (
  unidade_ensino_id is not null or (origem_migracao_v1 is not null and editado_em is null));

comment on constraint reg_aula_ue_so_nula_no_historico on public.registros_aula is
  'A Unidade de Ensino so pode ser nula em linha MIGRADA e NUNCA EDITADA. Dado novo continua obrigado a declara-la — a decisao UE-1 de 26/08/2026 segue valendo onde importa. Editar uma linha historica passa a exigir a UE: e uma catraca. Residual conhecido: um INSERT novo com origem_migracao_v1 preenchido escapa; fecha-lo exige gatilho de sessao, Epico 3 (ver CHK023).';

-- 2/1 · a funcao e a coluna
drop function if exists app.disciplina_sem_ue(uuid);
drop index if exists public.idx_registros_aula_disciplina;
alter table public.registros_aula drop constraint reg_aula_disciplina_do_curso;
alter table public.registros_aula drop column disciplina_id;

commit;
