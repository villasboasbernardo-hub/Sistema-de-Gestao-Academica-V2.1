-- =================================================================================
-- Spec 016 · PR 3 · M1 — a CHD EXECUTADA ATÉ UM DIA DADO (item 1.14 do Bloco 1)
-- Data local: 19/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- Decisões de Bernardo Villas Boas:
--   D-COR-2 (16/10/2026) *"o saldo de capacidade conta só até hoje"*;
--   Q-5 e NQ-1 (17/10/2026) — fora do DSA e da planilha, executado é "até hoje" em toda tela: andamento da turma
--     (`/inicio`, ficha, `/turmas`), tabela de disciplinas da ficha, `/disciplinas` e a aba Avaliações;
--   regra 9.4 — DESENHO APROVADO em 17/10/2026 (`specs/016-correcoes-bloco-1/contracts/migrations.md` §M1).
--
-- Por quê: a CH executada sai de `vw_carga_horaria_turma.chd_executada` e de `vw_disciplinas_execucao.ta_executados`,
--   que somam TUDO, inclusive o lançado no futuro. Cortar em TypeScript não serve (a `vw_ocupacao_ta` perde a linha
--   sem posição, e a soma da CHD passaria a viver fora do banco, contra a `RN-CRONOS-01`); pôr "hoje" dentro do SQL
--   também não — o servidor é UTC, e erraria das 21h à meia-noite (FR-014.3, D20).
--
-- O que faz — só ACRESCENTA objetos; nenhuma view, tabela, policy ou dado de hoje muda:
--   1. `public.vw_chd_por_fato` — a CHD lançada, um fato por linha, com turma, disciplina e a DATA do próprio fato:
--      aula ativa (a disciplina da UE, senão a da linha), a 1ª aplicação da avaliação viva, as sessões de aplicação
--      ativas e as vistas ativas. `security_invoker` (gotcha 10): a RLS de quem lê vale.
--   2. `public.chd_da_turma_ate(p_ate date)` — a soma por turma com `data <= p_ate` (inclusive).
--   3. `public.execucao_por_disciplina_ate(p_ate date, p_turma_id uuid)` — a soma por disciplina de UMA turma e a
--      primeira data (o "iniciada" da aba Avaliações), com `data <= p_ate`.
--   ⚠️ AS DUAS FUNÇÕES NÃO TÊM VALOR PADRÃO PARA A DATA: quem chama manda o dia de São Paulo (`hojeNaCiaara()`). O
--      esquecimento vira ERRO DE CHAMADA, não um número errado das 21h à meia-noite — o precedente
--      `app.fn_status_vista(…, p_hoje date default current_date)` é o que se evita aqui. O pgTAP 135 reprova
--      `current_date`, `now()`, `current_timestamp` e `localtimestamp` no corpo delas, lido sem comentário.
--   ⚠️ `security invoker`, `stable`, `search_path = ''`; `execute` só para `authenticated`. Por que RPC e não Server
--      Action: a soma precisa do banco e da RLS de quem lê; a REGRA do andamento continua em `lib/dominio/`.
--
-- ⚠️ A COMPOSIÇÃO DA CHD PASSA A EXISTIR EM TRÊS LUGARES (as duas views de hoje e esta base) — aceito por Bernardo em
--   17/10/2026 (P-3). A guarda é o pgTAP 135: SEM CORTE, a base bate com `vw_carga_horaria_turma.chd_executada` por
--   turma e com `vw_disciplinas_execucao.ta_executados` por turma × disciplina, em toda execução da suíte. Unificar é
--   a `PEND-016-1`.
--
-- Medido (regra 9.2), com este SQL criado e desfeito no banco LOCAL restaurado da cópia `remoto-20261017-005738.sql`,
--   "hoje" = 17/10/2026: sem corte, a base bate em 29 de 29 turmas e em 228 de 228 linhas turma × disciplina; com o
--   corte, a C-Ap-FR 2026 vai de 868 a 828 TA executados e passa a "em atraso" (saldo +24 → −16 TA), e 19 linhas de
--   disciplina mudam (tabelas em `contracts/migrations.md`).
--
-- Reversão (objetos novos e sem dado; antes, o código que os lê tem de sair da `main`):
--   drop function public.execucao_por_disciplina_ate(date, uuid);
--   drop function public.chd_da_turma_ate(date);
--   drop view public.vw_chd_por_fato;
--   Provada numa base descartável pela impressão digital do esquema antes e depois (DoD 6).
-- =================================================================================

-- ---------------------------------------------------------------- 1. a base: um fato de CHD por linha
create view public.vw_chd_por_fato with (security_invoker = true) as
with vivas as (
  select a.id, a.turma_id, a.disciplina_id, a.data_avaliacao, a.tempos_consumidos
    from public.avaliacoes a
   where a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
)
select r.turma_id,
       coalesce(ue.disciplina_id, r.disciplina_id) as disciplina_id,
       r.data,
       r.tempos_consumidos::bigint as tempos,
       'aula'::text as origem
  from public.registros_aula r
  left join public.unidades_ensino ue on ue.id = r.unidade_ensino_id
 where r.status = 'ativo'
union all
select v.turma_id, v.disciplina_id, v.data_avaliacao, coalesce(v.tempos_consumidos, 0)::bigint, 'aplicacao'
  from vivas v
union all
select v.turma_id, v.disciplina_id, p.data, coalesce(p.tempos_consumidos, 0)::bigint, 'sessao_de_aplicacao'
  from public.sessoes_de_aplicacao p
  join vivas v on v.id = p.avaliacao_id
 where p.status = 'ativo'
union all
select v.turma_id, v.disciplina_id, s.data, coalesce(s.tempos_consumidos, 0)::bigint, 'vista'
  from public.vistas_de_avaliacao s
  join vivas v on v.id = s.avaliacao_id
 where s.status = 'ativo';

comment on view public.vw_chd_por_fato is
  'A CHD lançada, um fato por linha, com a DATA do próprio fato (spec 016, M1; D-COR-2). Base das funções '
  '`chd_da_turma_ate` e `execucao_por_disciplina_ate`. Sem corte, soma o mesmo que '
  '`vw_carga_horaria_turma.chd_executada` e `vw_disciplinas_execucao.ta_executados` (pgTAP 135; PEND-016-1).';

-- ⚠️ View nova nasce com DELETE e TRUNCATE para `authenticated` (achado do Épico 1): o revoke é repetido aqui.
revoke insert, update, delete, truncate on public.vw_chd_por_fato from authenticated;
revoke all on public.vw_chd_por_fato from anon;

-- ---------------------------------------------------------------- 2. a CHD executada por turma até p_ate
-- SEM valor padrão para a data: quem chama manda o dia.
create function public.chd_da_turma_ate(p_ate date)
returns table (turma_id uuid, chd_executada bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select f.turma_id, sum(f.tempos)::bigint
    from public.vw_chd_por_fato f
   where f.data <= p_ate
   group by f.turma_id
$$;

comment on function public.chd_da_turma_ate(date) is
  'A CHD executada por turma até p_ate, inclusive (spec 016, M1; D-COR-2, FR-014.1). p_ate é o dia de São Paulo, '
  'passado por quem chama — sem valor padrão, de propósito (FR-014.3).';

-- ---------------------------------------------------------------- 3. a execução por disciplina de UMA turma
-- E a primeira data — o "iniciada" da aba Avaliações.
create function public.execucao_por_disciplina_ate(p_ate date, p_turma_id uuid)
returns table (disciplina_id uuid, ta_executados bigint, data_real_inicio date)
language sql
stable
security invoker
set search_path = ''
as $$
  select f.disciplina_id, sum(f.tempos)::bigint, min(f.data)
    from public.vw_chd_por_fato f
   where f.turma_id = p_turma_id
     and f.data <= p_ate
     and f.disciplina_id is not null
   group by f.disciplina_id
$$;

comment on function public.execucao_por_disciplina_ate(date, uuid) is
  'A execução por disciplina de uma turma até p_ate, inclusive, e a primeira data (spec 016, M1; FR-014.4). '
  'p_ate é o dia de São Paulo, passado por quem chama — sem valor padrão, de propósito (FR-014.3).';

revoke all on function public.chd_da_turma_ate(date) from public, anon;
grant execute on function public.chd_da_turma_ate(date) to authenticated;
revoke all on function public.execucao_por_disciplina_ate(date, uuid) from public, anon;
grant execute on function public.execucao_por_disciplina_ate(date, uuid) to authenticated;
