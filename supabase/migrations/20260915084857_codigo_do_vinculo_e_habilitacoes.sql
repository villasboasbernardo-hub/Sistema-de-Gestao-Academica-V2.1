-- =================================================================================
-- O codigo do vinculo de habilitacao e a sincronizacao do painel de disciplinas
-- (FR-022 da spec 006, T082 destravada; spec 019 da v2.0)
--
-- O QUE  : (1) `app.proximo_codigo_vinculo()` como `default` de `instrutor_disciplina.codigo`;
--          (2) `public.sincronizar_habilitacoes(instrutor, disciplinas[])`, que faz o conjunto de
--          vinculos ativos de um instrutor refletir o que o painel marcou, numa transacao.
--
-- DECISAO DE BERNARDO VILLAS BOAS, 15/09/2026 (T082): o codigo segue o formato REAL da base,
--   `VIN-NNNNNN`, com 6 digitos, gerado por sequencia que comeca acima do maior existente.
--
-- ⚠️ DIVERGENCIA COM O DOCUMENTO 04, ANOTADA E NAO CORRIGIDA. O `RN-CRUD-03` diz "prefixo + numero
--    sequencial de 4 digitos (ex. REG-0001)". O dado migrado (`VIN-000419`), o comentario da coluna
--    (`VIN-{NNNNNN}`) e o `mapa.py` do ETL tem 6. Vale o formato real; o documento 04 nao muda.
--    Mesmo padrao do codigo de instrutor, migration `20260915054204`.
--
-- ⚠️ A SEQUENCIA SOZINHA COLIDIRIA NO CORTE: as migrations rodam antes do ETL, que grava os
--    `VIN-` da v2.0 explicitamente. A funcao tira o proximo da sequencia e, se ele ficou para tras do
--    maior numero gravado, avanca a sequencia para depois dele. Lacuna na numeracao e aceita, como no
--    codigo de instrutor; concorrencia logo depois de uma carga explicita e recusada pela `unique`.
--
-- AS REGRAS DA SINCRONIZACAO, lidas na spec 019 da v2.0:
--   · FR-009 — desmarcar INATIVA o vinculo, nunca apaga (e RN-INST-05, regra 4 do BRIEF);
--   · FR-010 — marcada sem vinculo e CRIADA ativa;
--   · FR-011 — marcada com vinculo inativo e REATIVADA, nunca duplicada;
--   · FR-012 — marcada e ja ativa NAO muda;
--   · FR-013 — o painel so lista disciplina ativa, e vinculo ativo com disciplina descontinuada
--     fica como esta: por isso a inativacao so alcanca disciplina ATIVA, e marcar disciplina inativa
--     e recusado.
--
-- ⚠️ `SECURITY INVOKER`, E O PORTEIRO E A RLS. As policies de `instrutor_disciplina` exigem
--    `app.pode('instrutores','editar')` e alcance sobre a disciplina (migration `20260830000111`).
--    A funcao nao ganha privilegio nenhum: roda com a sessao. ⚠️ A RLS NEGA `UPDATE` FILTRANDO, em
--    silencio — por isso a funcao confere a contagem de linhas e recusa com `42501` quando a sessao
--    nao alcancou todas. Sem isso, uma sincronizacao negada pareceria gravada.
-- =================================================================================

create sequence if not exists app.instrutor_disciplina_codigo_seq as bigint start with 1;

comment on sequence app.instrutor_disciplina_codigo_seq is
  'Fonte do numero do codigo de vinculo novo (VIN-NNNNNN, T082 de 15/09/2026). Lida por '
  'app.proximo_codigo_vinculo(), que a avanca quando ela ficou para tras do maior codigo gravado.';

select setval(
  'app.instrutor_disciplina_codigo_seq',
  greatest(
    coalesce((select max(substring(codigo from 5)::bigint) from public.instrutor_disciplina
               where codigo ~ '^VIN-[0-9]+$'), 0),
    1
  ),
  exists (select 1 from public.instrutor_disciplina where codigo ~ '^VIN-[0-9]+$')
);

create or replace function app.proximo_codigo_vinculo()
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_proximo bigint;
  v_maior   bigint;
begin
  v_proximo := nextval('app.instrutor_disciplina_codigo_seq');
  select coalesce(max(substring(codigo from 5)::bigint), 0)
    into v_maior
    from public.instrutor_disciplina
   where codigo ~ '^VIN-[0-9]+$';
  if v_proximo <= v_maior then
    v_proximo := v_maior + 1;
    perform setval('app.instrutor_disciplina_codigo_seq', v_proximo);
  end if;
  return 'VIN-' || lpad(v_proximo::text, 6, '0');
end;
$$;

comment on function app.proximo_codigo_vinculo() is
  'Proximo codigo de vinculo instrutor-disciplina: VIN- e 6 digitos, o formato real da base '
  '(T082, 15/09/2026). Diverge dos 4 digitos do RN-CRUD-03, divergencia anotada.';

revoke all on function app.proximo_codigo_vinculo() from public;
revoke all on function app.proximo_codigo_vinculo() from anon;
grant execute on function app.proximo_codigo_vinculo() to authenticated, service_role;

alter table public.instrutor_disciplina
  alter column codigo set default app.proximo_codigo_vinculo();


create or replace function public.sincronizar_habilitacoes(
  p_instrutor_id uuid,
  p_disciplinas  uuid[]
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_marcadas   uuid[] := array(
    select distinct d from unnest(coalesce(p_disciplinas, '{}'::uuid[])) as d where d is not null
  );
  v_esperado   integer;
  v_feito      integer;
  v_criados    integer := 0;
  v_reativados integer := 0;
  v_inativados integer := 0;
begin
  if not app.pode('instrutores', 'editar') then
    raise exception 'o seu perfil nao edita habilitacao de instrutor'
      using errcode = '42501';
  end if;

  if p_instrutor_id is null
     or not exists (select 1 from public.instrutores where id = p_instrutor_id) then
    raise exception 'instrutor inexistente' using errcode = '22023';
  end if;

  if exists (
    select 1 from unnest(v_marcadas) m
     where not exists (select 1 from public.disciplinas d where d.id = m and d.status = 'ativo')
  ) then
    raise exception 'disciplina inexistente ou inativa entre as marcadas' using errcode = '22023';
  end if;

  -- FR-011 · reativar: marcada, sem vinculo ativo, com vinculo inativo — o mais recente de cada.
  with alvo as (
    select distinct on (v.disciplina_id) v.id
      from public.instrutor_disciplina v
     where v.instrutor_id = p_instrutor_id
       and v.disciplina_id = any (v_marcadas)
       and v.status = 'inativo'
       and not exists (
         select 1 from public.instrutor_disciplina a
          where a.instrutor_id = p_instrutor_id and a.disciplina_id = v.disciplina_id
            and a.status = 'ativo'
       )
     order by v.disciplina_id, coalesce(v.editado_em, v.criado_em) desc
  )
  select count(*) into v_esperado from alvo;

  update public.instrutor_disciplina v
     set status = 'ativo'
   where v.id in (
     select distinct on (x.disciplina_id) x.id
       from public.instrutor_disciplina x
      where x.instrutor_id = p_instrutor_id
        and x.disciplina_id = any (v_marcadas)
        and x.status = 'inativo'
        and not exists (
          select 1 from public.instrutor_disciplina a
           where a.instrutor_id = p_instrutor_id and a.disciplina_id = x.disciplina_id
             and a.status = 'ativo'
        )
      order by x.disciplina_id, coalesce(x.editado_em, x.criado_em) desc
   );
  get diagnostics v_feito = row_count;
  if v_feito < v_esperado then
    raise exception 'o seu perfil nao alcanca todas as disciplinas marcadas' using errcode = '42501';
  end if;
  v_reativados := v_feito;

  -- FR-010 · criar: marcada sem vinculo nenhum. A policy de INSERT recusa com 42501 sozinha.
  insert into public.instrutor_disciplina (instrutor_id, disciplina_id)
  select p_instrutor_id, m
    from unnest(v_marcadas) m
   where not exists (
     select 1 from public.instrutor_disciplina v
      where v.instrutor_id = p_instrutor_id and v.disciplina_id = m
   );
  get diagnostics v_criados = row_count;

  -- FR-009 e FR-013 · inativar: ativo, de disciplina ATIVA, e desmarcado.
  select count(*) into v_esperado
    from public.instrutor_disciplina v
    join public.disciplinas d on d.id = v.disciplina_id and d.status = 'ativo'
   where v.instrutor_id = p_instrutor_id
     and v.status = 'ativo'
     and not (v.disciplina_id = any (v_marcadas));

  update public.instrutor_disciplina v
     set status = 'inativo'
    from public.disciplinas d
   where d.id = v.disciplina_id
     and d.status = 'ativo'
     and v.instrutor_id = p_instrutor_id
     and v.status = 'ativo'
     and not (v.disciplina_id = any (v_marcadas));
  get diagnostics v_feito = row_count;
  if v_feito < v_esperado then
    raise exception 'o seu perfil nao alcanca todos os vinculos desmarcados' using errcode = '42501';
  end if;
  v_inativados := v_feito;

  return jsonb_build_object(
    'criados', v_criados, 'reativados', v_reativados, 'inativados', v_inativados
  );
end;
$$;

comment on function public.sincronizar_habilitacoes(uuid, uuid[]) is
  'Faz os vinculos ativos do instrutor refletirem as disciplinas marcadas no painel (spec 019 da '
  'v2.0, FR-009 a FR-013): cria, reativa sem duplicar, inativa sem apagar; nao toca vinculo de '
  'disciplina inativa. SECURITY INVOKER: a RLS decide; UPDATE filtrado vira 42501.';

revoke all on function public.sincronizar_habilitacoes(uuid, uuid[]) from public;
revoke all on function public.sincronizar_habilitacoes(uuid, uuid[]) from anon;
grant execute on function public.sincronizar_habilitacoes(uuid, uuid[]) to authenticated;

-- =================================================================================
-- PLANO DE REVERSAO
--
--   drop function public.sincronizar_habilitacoes(uuid, uuid[]);
--   alter table public.instrutor_disciplina alter column codigo drop default;
--   drop function app.proximo_codigo_vinculo();
--   drop sequence app.instrutor_disciplina_codigo_seq;
--
-- ⚠️ A reversao deixa o painel sem como gravar e o vinculo novo sem codigo; os vinculos ja criados
--    ficam, com os codigos que receberam.
-- =================================================================================
