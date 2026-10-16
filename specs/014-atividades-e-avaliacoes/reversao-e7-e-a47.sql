-- =================================================================================
-- Reversão da E-7 `20261016153228_aplicacao_antes_das_sessoes_e_nucleo_de_juntar` e da D-10
-- `20261016153232_avaliacoes_do_curriculo_a47` (spec 014, 16/10/2026).
--
-- ⚠️ A PARTE 1 (estrutura) vale para qualquer base: sai o gatilho adiado e a função dele, `public.juntar_como_sessao`
--    volta ao corpo da E-6 (o texto abaixo é COPIADO de `20261016092307`, não reescrito) e o núcleo sai.
-- ⚠️ A PARTE 2 (dado da D-10) é exclusão LÓGICA (regra 4): os itens com a procedência `spec014-A47:` ficam `inativo`
--    e a PT, `ativo = false`. Nada é apagado. As provas que a rodada ligou a esses itens continuam ligadas a um item
--    inativo — a próxima rodada as desliga (o casamento só considera item ativo).
-- Prova (DoD 6): numa base descartável, a impressão digital do esquema depois da PARTE 1 é a de antes da E-7
--    (`7ed10b8c…`, 1.994 objetos, medida em 16/10/2026 no local e no remoto).
-- =================================================================================
begin;

-- ======================== PARTE 1 — a estrutura de antes
drop trigger trg_avaliacoes_aplicacao_antes_das_sessoes on public.avaliacoes;
drop function app.aplicacao_antes_das_sessoes();

create or replace function public.juntar_como_sessao(p_prova_id uuid, p_avaliacao_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_prova  public.avaliacoes;
  v_outra  public.avaliacoes;
  v_numero smallint;
  v_id     uuid := gen_random_uuid();
  v_vistas jsonb;
begin
  -- Gotcha 15: falha FECHADO quando `app.pode` devolve nulo (sem sessão, conta inativa).
  if coalesce(app.pode('avaliacoes_juntar_sessao', 'editar'), false) is not true then
    raise exception 'Só o Admin e o Encarregado juntam uma avaliação como sessão de outra.'
      using errcode = '42501', hint = 'juntar_sem_permissao';
  end if;
  if p_prova_id is null or p_avaliacao_id is null or p_prova_id = p_avaliacao_id then
    raise exception 'Escolha duas avaliações diferentes: a prova e a que vira sessão dela.'
      using errcode = '22023', hint = 'juntar_a_si_mesma';
  end if;

  -- SECURITY INVOKER: a RLS de `avaliacoes` decide o que se alcança; o que não se alcança chega como «não achou».
  select * into v_prova from public.avaliacoes where id = p_prova_id for update;
  select * into v_outra from public.avaliacoes where id = p_avaliacao_id for update;
  if v_prova.id is null or v_outra.id is null then
    raise exception 'Avaliação fora do alcance de quem junta.' using errcode = '42501', hint = 'juntar_fora_do_alcance';
  end if;
  if v_prova.turma_id is distinct from v_outra.turma_id or v_prova.disciplina_id is distinct from v_outra.disciplina_id then
    raise exception 'Só se junta avaliação da mesma turma e da mesma disciplina.'
      using errcode = '23514', hint = 'juntar_outra_disciplina';
  end if;
  if v_prova.status not in ('pendente', 'em_andamento', 'concluida', 'atrasada')
     or v_outra.status not in ('pendente', 'em_andamento', 'concluida', 'atrasada') then
    raise exception 'Só se junta avaliação viva (nem cancelada, nem substituída pela planilha).'
      using errcode = '23514', hint = 'juntar_avaliacao_nao_viva';
  end if;
  if v_outra.data_avaliacao is null or v_prova.data_avaliacao is null or v_outra.data_avaliacao < v_prova.data_avaliacao then
    raise exception 'A avaliação que vira sessão tem de ser aplicada no dia da prova ou depois dele.'
      using errcode = '23514', hint = 'juntar_anterior_a_prova';
  end if;
  if exists (select 1 from public.sessoes_de_aplicacao s where s.avaliacao_id = v_outra.id and s.status = 'ativo') then
    raise exception 'A avaliação escolhida já tem sessões de aplicação: junte a prova a ela, ou desfaça as sessões antes.'
      using errcode = '23514', hint = 'juntar_prova_com_sessoes';
  end if;

  select coalesce(max(s.numero), 1) + 1 into v_numero
    from public.sessoes_de_aplicacao s where s.avaliacao_id = v_prova.id and s.status = 'ativo';
  select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'codigo', v.codigo, 'numero', v.numero) order by v.numero), '[]')
    into v_vistas
    from public.vistas_de_avaliacao v where v.avaliacao_id = v_outra.id and v.status = 'ativo';

  -- Gotcha 4.1: o id é gerado antes e o INSERT vai SEM `returning`.
  insert into public.sessoes_de_aplicacao
    (id, avaliacao_id, numero, data, ta_inicial, tempos_consumidos, local,
     juntada_de_avaliacao_id, juntada_em, avaliacao_juntada_antes)
  values (v_id, v_prova.id, v_numero, v_outra.data_avaliacao, v_outra.ta_inicial, v_outra.tempos_consumidos,
          v_outra.local, v_outra.id, now(), to_jsonb(v_outra) || jsonb_build_object('vistas_movidas', v_vistas));

  -- A vista é da PROVA: as sessões de vista da juntada passam para ela, depois das que ela já tem.
  with novas as (
    select v.id, (select coalesce(max(x.numero), 0) from public.vistas_de_avaliacao x
                   where x.avaliacao_id = v_prova.id and x.status = 'ativo')
                 + row_number() over (order by v.data, v.ta_inicial, v.numero) as numero
      from public.vistas_de_avaliacao v
     where v.avaliacao_id = v_outra.id and v.status = 'ativo'
  )
  update public.vistas_de_avaliacao v set avaliacao_id = v_prova.id, numero = n.numero::smallint
    from novas n where n.id = v.id;

  update public.avaliacoes
     set status = 'cancelada',
         observacoes = concat_ws(' ', '[JUNTADA COMO SESSAO ' || v_numero || ' DE ' || v_prova.codigo || ']', observacoes)
   where id = v_outra.id;

  return v_id;
end;
$$;

comment on function public.juntar_como_sessao(uuid, uuid) is
  'Spec 014 (decisão de Bernardo Villas Boas, 16/10/2026): "juntar como sessão da mesma prova", na aba Avaliações da '
  'turma — a avaliação `p_avaliacao_id` vira a próxima sessão de aplicação de `p_prova_id` (mesma turma e disciplina, '
  'no dia dela ou depois), as vistas dela passam para a prova, e ela fica CANCELADA com a marca «[JUNTADA COMO SESSAO '
  'n DE <codigo>]». A trilha (quem, quando, o retrato antes) mora na sessão, imutável. Só Admin e Encarregado '
  '(`avaliacoes_juntar_sessao.editar`). SECURITY INVOKER: a RLS decide o alcance.';

revoke all on function public.juntar_como_sessao(uuid, uuid) from public, anon;
grant execute on function public.juntar_como_sessao(uuid, uuid) to authenticated;

drop function app.juntar_como_sessao_nucleo(uuid, uuid);

-- ======================== PARTE 2 — o dado da D-10 (exclusão lógica)
update public.avaliacoes_curriculo set status = 'inativo'
 where status = 'ativo' and origem_migracao_v1 like 'spec014-A47:%';
update public.config_listas set ativo = false
 where lista = 'instrumentos_avaliacao' and valor = 'PT'
   and not exists (select 1 from public.avaliacoes_curriculo c where c.instrumento_id = config_listas.id and c.status = 'ativo');

commit;
