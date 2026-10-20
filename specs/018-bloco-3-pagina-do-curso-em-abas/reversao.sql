-- =================================================================================
-- Reversão da migration da spec 018 (Bloco 3): `20261020025815_regimes_nomeados_por_curso` — `plano-de-aplicacao-no-remoto.md`.
--
-- ⚠️ O CORPO DA VIEW FOI EXTRAÍDO POR SCRIPT de `20261014051943` (nada transcrito à mão), trocando só `create` por
--    `create or replace`: as colunas são as mesmas, então a view é substituída no lugar e os PRIVILÉGIOS ficam.
-- ⚠️ SÓ SEM DADO: com regime cadastrado ou turma com regime escolhido, apagar é decisão de Bernardo (regra 4) — o
--    script PARA no primeiro bloco.
-- ⚠️ ANTES DE RODAR NO REMOTO: o código que lê o que a migration criou tem de sair da `main`.
-- ⚠️ RODAR POR `psql -v ON_ERROR_STOP=1 < reversao.sql`: `supabase db query -f` manda o arquivo como UM comando
--    preparado e recusa vários. E no remoto, depois, o histórico: `supabase migration repair --status reverted
--    20261020025815`, senão o próximo `db push` a dá por aplicada.
-- ⚠️ Provada numa base descartável (DoD 6): a impressão digital do esquema volta à de partida
--    (`bb6e48a83cd7a0aaa8fe74fe95ef8d24`, 2.137 objetos) — registro em `progresso-implement.md`.
-- =================================================================================
begin;

do $$
begin
  if exists (select 1 from public.regimes_de_horario)
     or exists (select 1 from public.turmas where regime_de_horario_id is not null) then
    raise exception 'Há regime nomeado cadastrado ou turma com regime: a reversão com dado é decisão de Bernardo (regra 4).';
  end if;
end $$;

-- ---------------------------------------------------------------- a view, com o corpo de 20261014051943
create or replace view public.vw_dias_parados_turma with (security_invoker = true) as
with regime as (
  select t.id as turma_id, coalesce(r.regime_padrao_tempos, 8) as tempos_do_dia
    from public.turmas t
    left join public.vw_cursos_regime_vigente r on r.curso_id = t.curso_id
),
paradas as (
  -- da turma
  select d.turma_id, d.data, tp.valor as tipo, d.tempos
    from public.dias_parados d
    join public.config_listas tp on tp.id = d.tipo_parada_id
   where d.status = 'ativo' and d.turma_id is not null
  union all
  -- global de parte do dia, em cada turma com DSA na data
  select t.id, d.data, tp.valor, d.tempos
    from public.dias_parados d
    join public.config_listas tp on tp.id = d.tipo_parada_id
    cross join public.turmas t
   where d.status = 'ativo' and d.turma_id is null
     and app.turma_tem_dsa_na_data(t.id, d.data)
  union all
  -- feriado de dia inteiro do calendário, em cada turma com DSA na data. O TIPO vem da sigla do
  -- prefixo "<sigla> — " da descrição quando ela casa com `tipos_parada`; senão, FR (histórico).
  select t.id, f.data,
         coalesce((select tp.valor from public.config_listas tp
                    where tp.lista = 'tipos_parada'
                      and f.descricao like tp.valor || ' — %'), 'FR'),
         null::smallint
    from public.feriados f
    cross join public.turmas t
   where f.status = 'ativo' and f.impacto = 'dia_inteiro'
     and app.turma_tem_dsa_na_data(t.id, f.data)
)
select p.turma_id,
       p.tipo,
       count(distinct p.data)                                as dias,
       sum(coalesce(p.tempos, rg.tempos_do_dia))::bigint      as tempos
  from paradas p
  join regime rg on rg.turma_id = p.turma_id
 group by p.turma_id, p.tipo;

-- ---------------------------------------------------------------- a escolha da turma
drop trigger trg_turmas_regime_de_horario on public.turmas;
drop function app.guardar_regime_da_turma();
alter table public.turmas drop constraint turmas_regime_do_proprio_curso_fk;
drop index public.turmas_regime_de_horario_idx;
alter table public.turmas drop column regime_de_horario_id;

-- ---------------------------------------------------------------- as leituras da tela e as funções de apoio
drop function public.regime_de_horario_em_uso(uuid);
drop function public.regime_da_turma_travado(uuid);

-- ---------------------------------------------------------------- a tabela (vazia: conferido acima)
drop table public.regimes_de_horario;
drop function app.guardar_regime_de_horario();
drop function app.regime_em_uso_com_lancamento(uuid);
drop function app.regime_escolhivel(uuid);
drop function app.turma_tem_lancamento_no_dsa(uuid);
drop function app.proximo_codigo_regime_de_horario();
drop sequence app.regimes_de_horario_codigo_seq;

commit;
