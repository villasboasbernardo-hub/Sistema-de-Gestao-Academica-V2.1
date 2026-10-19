-- =================================================================================
-- Spec 017 · Bloco 2 · M3 — o PAINEL DE TURMAS
-- Data local: 19/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- Pedido de Bernardo Villas Boas (16/10/2026, Bloco 2 item 4): *"Dashboard de turmas, no molde do de instrutores:
--   total, canceladas, concluídas, em andamento, iniciando nos próximos 30 dias, e alertas do que falta (data,
--   instrutor, conflito)."*
-- Regra 9.4 (emenda de 19/10/2026): SÓ ACRESCENTA — uma linha nova de parâmetro e uma função nova.
--
-- O que faz:
--   1. `config_parametros` `turmas.aviso_inicio_dias` = 30, OPERACIONAL (decisão da Divisão, não norma — a mesma
--      natureza de `disciplinas.aviso_inicio_dias`; regra 8: o número é dado, não constante).
--   2. `public.ocupacao_para_conflitos(p_de, p_ate)` — a ocupação de TA da semana, de TODAS as turmas, numa chamada,
--      para o aviso de conflito (`RN-CONF-01`) do painel. Quem decide o conflito continua sendo `detectarConflitos`
--      (`lib/dominio/dsa/conflitos.ts`): aqui só se entrega a ocupação.
--      ⚠️ `SECURITY DEFINER`, como `conflitos_da_semana`, porque o conflito é contra turmas que a pessoa pode não
--         alcançar; a ocupação delas sai ANÔNIMA (turma, origem, fato, sessão e local nulos), com só o que a regra
--         precisa (data, TA, instrutor, fiscal), e SÓ quando cruza a da pessoa — nunca a agenda inteira de outro
--         curso. Porteiro `coalesce(…, false) is not true` (gotcha 15).
--      ⚠️ A janela é de no máximo uma semana; sem valor padrão — quem chama manda as datas, calculadas do dia de São
--         Paulo (D20).
--
-- Reversão: drop function public.ocupacao_para_conflitos(date, date); a linha do parâmetro sai por
--   `status = 'inativo'` (regra 4).
-- =================================================================================

-- ---------------------------------------------------------------- 1. o parâmetro
-- ⚠️ `where not exists` em vez de `on conflict`: a unicidade de `config_parametros` é o índice PARCIAL
--    `uq_config_param_chave_ano` (molde 20260925135058).
insert into public.config_parametros
  (chave, valor, tipo, unidade, natureza, descricao, fundamento_normativo, editavel_por, status)
select 'turmas.aviso_inicio_dias', '30', 'inteiro', 'dias', 'operacional',
       'Dias à frente em que o painel de /turmas conta a turma como "iniciando" (Bloco 2, spec 017, FR-005.1): '
       'início entre hoje e hoje mais este número, situação diferente de cancelada.',
       null,
       'encarregado_administracao_academica', 'ativo'
 where not exists (select 1 from public.config_parametros
                    where chave = 'turmas.aviso_inicio_dias' and status = 'ativo');

-- ---------------------------------------------------------------- 2. a ocupação da semana, em lote
create or replace function public.ocupacao_para_conflitos(p_de date, p_ate date)
returns table (
  turma_id     uuid,
  origem       text,
  fato_id      uuid,
  sessao_id    uuid,
  data         date,
  ta_inicial   smallint,
  ta_final     smallint,
  instrutor_id uuid,
  fiscal_id    uuid,
  local        text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(app.pode('registros_aula', 'ler'), false) is not true then
    raise exception 'Sem permissao para ler lancamento.'
      using errcode = '42501', hint = 'sem_alcance';
  end if;
  if p_de is null or p_ate is null or p_ate < p_de or p_ate - p_de > 6 then
    raise exception 'A janela da ocupacao e de uma semana.'
      using errcode = '22023', hint = 'janela_de_uma_semana';
  end if;

  -- ⚠️ A ocupação ALHEIA só sai quando CRUZA a da pessoa — mesma data, TA sobreposto (`taFinal` é o último TA
  --    ocupado, como em `seSobrepoem`) e a mesma pessoa como instrutor ou fiscal. É o `join minha` de
  --    `conflitos_da_semana` (Q-17 da spec 013: *"a regra exige ver o conflito, não o DSA do outro curso"*),
  --    generalizado para o conjunto das turmas que a pessoa alcança; o local alheio sai nulo, porque o conflito de
  --    sala fica fora do painel (analyze, achado 53).
  return query
    with ocupacao as (
      select o.turma_id, o.origem, o.fato_id, o.sessao_id, o.data, o.ta_inicial, o.ta_final,
             o.instrutor_id, o.fiscal_id, o.local,
             coalesce(app.alcanca_turma(o.turma_id), false) as alcanca
        from public.vw_ocupacao_ta o
       where o.turma_id is not null
         and o.ta_inicial is not null
         and o.data between p_de and p_ate
    ),
    minha as (
      select m.* from ocupacao m where m.alcanca
    )
    select m.turma_id, m.origem, m.fato_id, m.sessao_id, m.data, m.ta_inicial, m.ta_final,
           m.instrutor_id, m.fiscal_id, m.local
      from minha m
    union all
    select null::uuid, null::text, null::uuid, null::uuid, a.data, a.ta_inicial, a.ta_final,
           a.instrutor_id, a.fiscal_id, null::text
      from ocupacao a
     where not a.alcanca
       and exists (
             select 1
               from minha m
              where m.data = a.data
                and m.ta_inicial <= a.ta_final and m.ta_final >= a.ta_inicial
                and (   (a.instrutor_id is not null and a.instrutor_id in (m.instrutor_id, m.fiscal_id))
                     or (a.fiscal_id    is not null and a.fiscal_id    in (m.instrutor_id, m.fiscal_id))));
end;
$$;

comment on function public.ocupacao_para_conflitos(date, date) is
  'A ocupação de TA das turmas que a pessoa alcança numa semana, mais a das outras que CRUZA com ela (mesma data, TA '
  'sobreposto, mesma pessoa), anônima — para o aviso de conflito do painel de /turmas (RN-CONF-01; Bloco 2, '
  'spec 017). Quem decide o conflito é '
  '`detectarConflitos`; aqui só se entrega a ocupação. Sem valor padrão (D20).';

revoke all on function public.ocupacao_para_conflitos(date, date) from public, anon;
grant execute on function public.ocupacao_para_conflitos(date, date) to authenticated;
