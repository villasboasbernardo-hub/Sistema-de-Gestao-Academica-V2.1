-- =================================================================================
-- Spec 014, PR 1 · REVERSÃO das migrations E-1, E-2, D-1 e D-2 (T026)
-- Ordem: D-2 → D-1 → E-2 → E-1 (o inverso da aplicação). Escrita à mão.
--
-- ⚠️ DUAS FORMAS, e o arquivo diz qual parte é de qual:
--   (A) BASE DESCARTÁVEL (local, prova de reversão): pode `drop` das tabelas e sequências NOVAS,
--       que nasceram vazias de histórico nesta mesma fatia; a impressão digital do esquema tem de
--       voltar à anotada antes do PR (`scripts/provas/impressao_digital_do_esquema.sql`).
--   (B) REMOTO: nada é apagado (regra 4). As tabelas novas ficam com `status = 'inativo'` em toda
--       linha; as colunas novas de `atividades_nao_letivas` ficam (comentário APOSENTADA), e só os
--       gatilhos, as restrições e as policies voltam ao estado anterior.
-- ⚠️ O enum `categoria_normativa` NÃO perde o valor `Apoio_Individualizado` (o PostgreSQL não remove
--    valor de enum). A volta recategoriza o que o usa para `Estudo_Individual`, com evento em
--    `migracao_log` — que é o que a linha era antes da D-2 (Monitoria era Estudo_Individual).
-- =================================================================================

begin;

-- ---------------------------------------------------------------- D-2 (dado)
update public.config_listas set metadados = metadados || '{"categoria": "Estudo_Individual"}'
 where lista = 'tipos_atividade' and valor = 'Monitoria';
update public.config_listas set metadados = metadados - 'uso'
 where lista = 'tipos_atividade' and valor in ('Aula', 'Avaliação', 'Vista de Prova', 'Aula Teórica', 'Aula Prática');
update public.config_listas set ativo = true
 where lista = 'tipos_atividade' and valor = 'Licença de Pagamento';
update public.config_listas set ativo = false
 where (lista = 'tipos_atividade' and valor in ('Recepção aos alunos', 'Apoio à Instrução', 'Português para Estrangeiros', 'BDA', 'BDF'))
    or lista = 'tipos_parada';
update public.config_parametros set status = 'inativo'
 where chave = 'avaliacao.vence_em_breve_dias' and status = 'ativo';

-- ---------------------------------------------------------------- D-1 (dado)
update public.limites_curriculo set status = 'inativo'
 where origem_migracao_v1 like 'spec014-D1:%' and status = 'ativo';
insert into public.migracao_log (codigo, origem_tabela, destino_tabela, acao, regra_aplicada, observacao)
values ('MLOG-014-D1-REV-' || to_char(now(), 'YYYYMMDDHH24MISS'), 'limites_curriculo.csv', 'limites_curriculo',
        'descartado'::public.acao_migracao, 'Reversão da D-1 (spec 014)', 'Limites da D-1 inativados pela reversão do PR 1.');

-- ---------------------------------------------------------------- E-2 (estrutura)
drop view public.vw_conformidade_tetos;
drop view public.vw_carga_horaria_turma;

-- O texto ANTERIOR, copiado de 20260829235731_derivados_e_funcoes_de_dominio.sql:
create or replace view public.vw_carga_horaria_turma
with (security_invoker = true) as
with aulas as (
  select r.turma_id,
         sum(r.tempos_consumidos) filter (where r.categoria_normativa = 'aula')                  as ta_aula,
         sum(r.tempos_consumidos) filter (where r.categoria_normativa = 'atividade_extraclasse') as ta_extraclasse
    from public.registros_aula r
   where r.status = 'ativo'
   group by r.turma_id
),
provas as (
  select a.turma_id,
         sum(coalesce(a.tempos_consumidos, 0))       as ta_aplicacao,
         sum(coalesce(a.tempos_consumidos_vista, 0)) as ta_vista
    from public.avaliacoes a
   where a.status <> 'cancelada'
   group by a.turma_id
),
nao_letivas as (
  select n.turma_id,
         sum(n.tempos_consumidos) filter (where n.categoria_normativa = 'AEC')               as ta_aec,
         sum(n.tempos_consumidos) filter (where n.categoria_normativa = 'TAD')               as ta_tad,
         sum(n.tempos_consumidos) filter (where n.categoria_normativa = 'TR')                as ta_tr,
         sum(n.tempos_consumidos) filter (where n.categoria_normativa = 'Estudo_Individual') as ta_estudo_individual
    from public.atividades_nao_letivas n
   where n.status = 'ativo' and n.turma_id is not null
   group by n.turma_id
),
curricular as (
  -- CHR = somatório estrito das CH de todas as disciplinas do currículo do curso.
  select t.id as turma_id, sum(d.carga_horaria_tempos) as chr_curricular
    from public.turmas t
    join public.disciplinas d on d.curso_id = t.curso_id and d.status = 'ativo'
   group by t.id
)
select
  t.id                                      as turma_id,
  t.codigo                                  as turma_codigo,
  t.curso_id,
  c.codigo                                  as curso_codigo,
  c.nome_curso,
  t.ano_letivo,
  t.status                                  as status_turma,
  coalesce(cu.chr_curricular, 0)            as chr_curricular,
  coalesce(au.ta_aula, 0)                   as ta_aula,
  coalesce(au.ta_extraclasse, 0)            as ta_extraclasse,
  coalesce(pr.ta_aplicacao, 0)              as ta_avaliacao,
  coalesce(pr.ta_vista, 0)                  as ta_vista_prova,
  -- CHD inclui avaliação e vista por exigência normativa (RN-EVT-03).
  coalesce(au.ta_aula, 0) + coalesce(au.ta_extraclasse, 0)
    + coalesce(pr.ta_aplicacao, 0) + coalesce(pr.ta_vista, 0)          as chd_executada,
  coalesce(nl.ta_aec, 0)                    as ta_aec,
  coalesce(nl.ta_tad, 0)                    as ta_tad,
  coalesce(nl.ta_tr, 0)                     as ta_tr,
  coalesce(nl.ta_estudo_individual, 0)      as ta_estudo_individual,
  -- CHT = CHD + AEC + TAD + TR. Estudo Individual permanece FORA (RN-EVT-01).
  coalesce(au.ta_aula, 0) + coalesce(au.ta_extraclasse, 0)
    + coalesce(pr.ta_aplicacao, 0) + coalesce(pr.ta_vista, 0)
    + coalesce(nl.ta_aec, 0) + coalesce(nl.ta_tad, 0) + coalesce(nl.ta_tr, 0) as cht_executada
from public.turmas t
join public.cursos c        on c.id = t.curso_id
left join aulas au          on au.turma_id = t.id
left join provas pr         on pr.turma_id = t.id
left join nao_letivas nl    on nl.turma_id = t.id
left join curricular cu     on cu.turma_id = t.id;

comment on view public.vw_carga_horaria_turma is
  'Carga horária executada por turma, decomposta por grandeza normativa. Materializa '
  'CHD = aula + extraclasse + avaliação + vista (RN-EVT-03) e CHT = CHD + AEC + TAD + TR, '
  'com Estudo Individual FORA da soma (RN-EVT-01). `chr_curricular` é o somatório das CH '
  'das disciplinas do curso — base dos três tetos. Origem: Glossário DEnsM §2.';

create or replace view public.vw_conformidade_tetos
with (security_invoker = true) as
select
  v.turma_id,
  v.turma_codigo,
  v.curso_id,
  v.curso_codigo,
  v.nome_curso,
  v.ano_letivo,
  v.chr_curricular,

  -- AEC ---------------------------------------------------------------------------------
  v.ta_aec,
  round(v.chr_curricular * app.fn_parametro_numerico('teto.aec_percentual_chr', v.ano_letivo) / 100, 2) as teto_aec,
  (v.ta_aec > v.chr_curricular * app.fn_parametro_numerico('teto.aec_percentual_chr', v.ano_letivo) / 100) as aec_excedido,

  -- TAD ---------------------------------------------------------------------------------
  v.ta_tad,
  round(v.chr_curricular * app.fn_parametro_numerico('teto.tad_percentual_chr', v.ano_letivo) / 100, 2) as teto_tad,
  (v.ta_tad > v.chr_curricular * app.fn_parametro_numerico('teto.tad_percentual_chr', v.ano_letivo) / 100) as tad_excedido,

  -- TR ----------------------------------------------------------------------------------
  v.ta_tr,
  round(v.chr_curricular * app.fn_parametro_numerico('teto.tr_percentual_chr', v.ano_letivo) / 100, 2) as teto_tr,
  (v.ta_tr > v.chr_curricular * app.fn_parametro_numerico('teto.tr_percentual_chr', v.ano_letivo) / 100) as tr_excedido,

  -- Reservas concedidas pelo PROENS, para comparar previsto × executado -------------------
  (select r.tempos_reservados from public.reservas_proens r
    where r.curso_id = v.curso_id and r.ano = v.ano_letivo
      and r.tipo_reserva = 'TAD' and r.status = 'ativo' limit 1) as tad_reservado_proens,
  (select r.tempos_reservados from public.reservas_proens r
    where r.curso_id = v.curso_id and r.ano = v.ano_letivo
      and r.tipo_reserva = 'TR'  and r.status = 'ativo' limit 1) as tr_reservado_proens,

  v.chd_executada,
  v.cht_executada,
  v.ta_estudo_individual
from public.vw_carga_horaria_turma v;

comment on view public.vw_conformidade_tetos is
  'Sinalização dos três tetos normativos por turma: AEC ≤ 10%, TAD ≤ 5% e TR ≤ 10% da CHR. '
  'Percentuais lidos de `config_parametros` (RNF-NORM-08), nunca literais. A saída é '
  'ALERTA na tela, jamais bloqueio (RN-DEG-02). Origem: RNF-NORM-02.';

-- ⚠️ A ACL volta IGUAL à de antes, medida no catálogo em 14/10/2026: `authenticated=arwxtm` — o
--    INSERT/UPDATE inerte das views do Épico 1 (registro R-8). `drop view` descarta a ACL, e um
--    `revoke` "mais seguro" aqui faria a impressão digital NÃO voltar (medido na prova de reversão).
revoke all on public.vw_carga_horaria_turma, public.vw_conformidade_tetos from anon, authenticated;
grant select, insert, update, references, trigger, maintain
  on public.vw_carga_horaria_turma, public.vw_conformidade_tetos to authenticated;

-- (A) base descartável:
drop view public.vw_dias_parados_turma;
drop function app.turma_tem_dsa_na_data(uuid, date);
alter table public.feriados alter column codigo drop default;
drop function app.proximo_codigo_feriado();
drop sequence app.feriados_codigo_seq;
drop table public.limites_curriculo;
drop table public.dias_parados;
drop function app.proximo_codigo_dia_parado();
drop sequence app.dias_parados_codigo_seq;
-- (B) no remoto, NO LUGAR das nove linhas acima:
--   update public.dias_parados set status = 'inativo' where status = 'ativo';
--   update public.limites_curriculo set status = 'inativo' where status = 'ativo';
--   alter table public.feriados alter column codigo drop default;   -- a sequência fica, sem uso

alter table public.atividades_nao_letivas drop constraint ativ_alunos_so_apoio;
alter table public.atividades_nao_letivas drop constraint ativ_estudo_individual_de_turma;
alter table public.atividades_nao_letivas add constraint ativ_estudo_individual_de_turma
  check (categoria_normativa <> 'Estudo_Individual' or escopo = 'turma');

update public.atividades_nao_letivas set categoria_normativa = 'Estudo_Individual'
 where categoria_normativa = 'Apoio_Individualizado';
alter table public.atividades_nao_letivas alter column compoe_cht
  set expression as (categoria_normativa <> 'Estudo_Individual'::public.categoria_normativa);

-- ---------------------------------------------------------------- E-1 (estrutura)
drop trigger if exists trg_config_listas_recategorizar on public.config_listas;
drop trigger if exists trg_config_listas_validar_tipo on public.config_listas;
drop trigger if exists trg_atividades_categoria_pelo_tipo on public.atividades_nao_letivas;
alter table public.atividades_nao_letivas drop constraint ativ_tipo_obrigatorio;
alter table public.atividades_nao_letivas drop constraint ativ_bloqueio_so_tr;
alter table public.atividades_nao_letivas drop constraint ativ_quantidade_alunos_positiva;
-- As policies criar/editar voltam à forma anterior, copiada de 20260918041449_curso_inativo.sql:
drop policy atividades_nao_letivas_criar on public.atividades_nao_letivas;
create policy atividades_nao_letivas_criar on public.atividades_nao_letivas for insert to authenticated
  with check (app.pode('atividades_nao_letivas','criar') and app.alcanca_turma(turma_id)
              and (turma_id is not null or app.pode('atividades_globais','criar'))
              and app.turma_em_oferta(turma_id));
drop policy atividades_nao_letivas_editar on public.atividades_nao_letivas;
create policy atividades_nao_letivas_editar on public.atividades_nao_letivas for update to authenticated
  using (app.pode('atividades_nao_letivas','editar') and app.alcanca_turma(turma_id)
         and (turma_id is not null or app.pode('atividades_globais','criar'))
         and app.turma_em_oferta(turma_id))
  with check (app.pode('atividades_nao_letivas','editar') and app.alcanca_turma(turma_id)
              and (turma_id is not null or app.pode('atividades_globais','criar'))
              and app.turma_em_oferta(turma_id));
-- (A) base descartável: drop das colunas novas; (B) remoto: ficam, com comentário APOSENTADA.
alter table public.atividades_nao_letivas
  drop column tipo_atividade_id, drop column bloqueia_aula, drop column tipo_parada_id,
  drop column quantidade_alunos, drop column outros_instrutores;
drop function app.categoria_pelo_tipo();
drop function app.validar_tipo_de_atividade();
drop function app.recategorizar_pelo_tipo();
-- (B) remoto: as três funções ficam, sem gatilho que as chame.

commit;
