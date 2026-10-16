-- =================================================================================
-- Spec 014 · migration E-7 — a 1ª APLICAÇÃO não passa das SESSÕES, e o NÚCLEO do «juntar»
-- Data local: 16/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- Pedido de Bernardo Villas Boas, 16/10/2026 (o 4º item do comando do dia): *"banco recusando 1ª aplicação depois
-- das sessões"* — e *"junte a prova de 19/08 à PP 1 da CAHO IV"*. As regras (spec §2.4):
--   RN-AV-12 *"…qualquer prova com a MESMA descrição em dias consecutivos ou próximos (mesma disciplina, mesmo COD)
--            é UMA prova com N sessões de aplicação, não N provas."* — a 1ª sessão é a própria avaliação, e as
--            seguintes (2..N) vivem em `sessoes_de_aplicacao`.
--
-- O que faz:
--   1. `app.aplicacao_antes_das_sessoes()` — gatilho de RESTRIÇÃO em `avaliacoes`, ADIADO para o fim da transação:
--      a avaliação viva cuja 1ª aplicação (`data_avaliacao`) caia DEPOIS de uma sessão de aplicação ativa dela é
--      recusada com 23514 (`aplicacao_depois_das_sessoes`). O mesmo dia é aceito, como do outro lado.
--      ⚠️ O OUTRO LADO JÁ EXISTIA: `app.sessao_apos_aplicacao()` (E-6) recusa a SESSÃO antes da 1ª aplicação. Faltava
--         mover a 1ª aplicação — pelo DSA, pela sincronização ou por qualquer `update` — para depois das sessões.
--      ⚠️ POR QUE ADIADO: a sincronização grava a avaliação e DEPOIS as sessões dela. Uma prova inteira que a planilha
--         desloca para frente (1ª de 22/06 para 30/06, a 2ª de 23/06 para 01/07) passaria, no meio do comando, por um
--         estado em que a 1ª já está em 30/06 e a 2ª ainda em 23/06; um gatilho imediato recusaria uma mudança que
--         termina certa. Adiado, ele decide pelo estado FINAL da transação, lendo a linha de novo (não o NEW).
--   2. `app.juntar_como_sessao_nucleo(p_prova_id, p_avaliacao_id)` — o corpo de `public.juntar_como_sessao` (E-6)
--      SEM o porteiro, para que a junção decidida por Bernardo (a PP de 19/08 da CAHO IV) rode pelo MESMO código da
--      tela num script de manutenção, sem sessão. `public.juntar_como_sessao` passa a ser porteiro + núcleo: a tela
--      não muda.
--      ⚠️ A TRILHA DIZ A VERDADE: sem sessão, `juntada_por` fica NULO — *"nulo = carga sem sessão"*, como a E-6 já
--         documenta — e `juntada_em` e o retrato ficam. Atribuir a junção a uma conta que não clicou seria rastro falso.
--      ⚠️ O NÚCLEO NÃO ABRE PORTA: com sessão, o gatilho `app.proteger_trilha_da_juntada()` (E-6) exige
--         `avaliacoes_juntar_sessao.editar` no INSERT da sessão juntada — o mesmo porteiro, no banco — e o PostgREST
--         não expõe o schema `app`.
--
-- Reversão (`specs/014-atividades-e-avaliacoes/reversao-e7-e-a47.sql`): sai o gatilho e as duas funções novas, e
--   `public.juntar_como_sessao` volta ao corpo da E-6. Provada numa base descartável pela impressão digital do
--   esquema antes e depois (DoD 6).
-- =================================================================================

-- ---------------------------------------------------------------- 1. a 1ª aplicação não passa das sessões
create or replace function app.aplicacao_antes_das_sessoes()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_data   date;
  v_status text;
  v_sessao date;
begin
  -- Adiado: lê o estado FINAL da linha, e não o NEW do comando que disparou.
  select a.data_avaliacao, a.status::text into v_data, v_status from public.avaliacoes a where a.id = new.id;
  if v_data is null or v_status not in ('pendente', 'em_andamento', 'concluida', 'atrasada') then
    return null;
  end if;
  select min(s.data) into v_sessao
    from public.sessoes_de_aplicacao s where s.avaliacao_id = new.id and s.status = 'ativo';
  if v_sessao is not null and v_data > v_sessao then
    raise exception 'A 1ª aplicação da prova (%) não pode ficar depois da sessão de aplicação de % — as sessões são a 2ª, 3ª… da mesma prova.',
      v_data, v_sessao
      using errcode = '23514', hint = 'aplicacao_depois_das_sessoes';
  end if;
  return null;
end;
$$;

comment on function app.aplicacao_antes_das_sessoes() is
  'Spec 014, RN-AV-12 (pedido de Bernardo Villas Boas, 16/10/2026): a 1ª aplicação da avaliação viva não pode cair '
  'depois de uma sessão de aplicação ativa dela (23514, `aplicacao_depois_das_sessoes`). Gatilho de restrição ADIADO: '
  'decide pelo estado final da transação. O outro lado é `app.sessao_apos_aplicacao()` (E-6).';

revoke all on function app.aplicacao_antes_das_sessoes() from public, anon, authenticated;

create constraint trigger trg_avaliacoes_aplicacao_antes_das_sessoes
  after update of data_avaliacao, status on public.avaliacoes
  deferrable initially deferred
  for each row execute function app.aplicacao_antes_das_sessoes();

-- ---------------------------------------------------------------- 2. o núcleo do «juntar»
create or replace function app.juntar_como_sessao_nucleo(p_prova_id uuid, p_avaliacao_id uuid)
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

comment on function app.juntar_como_sessao_nucleo(uuid, uuid) is
  'Spec 014 (E-7, 16/10/2026): o corpo de «juntar como sessão da mesma prova», SEM o porteiro. A tela entra por '
  '`public.juntar_como_sessao` (porteiro + núcleo); o script de manutenção, sem sessão, entra aqui — e a trilha fica '
  'com `juntada_por` nulo («carga sem sessão»). Com sessão, o gatilho da trilha exige `avaliacoes_juntar_sessao`.';

revoke all on function app.juntar_como_sessao_nucleo(uuid, uuid) from public, anon;
-- `public.juntar_como_sessao` é SECURITY INVOKER: quem a chama precisa executar o núcleo (o PostgREST não expõe `app`).
grant execute on function app.juntar_como_sessao_nucleo(uuid, uuid) to authenticated, service_role;

create or replace function public.juntar_como_sessao(p_prova_id uuid, p_avaliacao_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  -- Gotcha 15: falha FECHADO quando `app.pode` devolve nulo (sem sessão, conta inativa).
  if coalesce(app.pode('avaliacoes_juntar_sessao', 'editar'), false) is not true then
    raise exception 'Só o Admin e o Encarregado juntam uma avaliação como sessão de outra.'
      using errcode = '42501', hint = 'juntar_sem_permissao';
  end if;
  return app.juntar_como_sessao_nucleo(p_prova_id, p_avaliacao_id);
end;
$$;

comment on function public.juntar_como_sessao(uuid, uuid) is
  'Spec 014 (decisão de Bernardo Villas Boas, 16/10/2026): "juntar como sessão da mesma prova", na aba Avaliações da '
  'turma — a avaliação `p_avaliacao_id` vira a próxima sessão de aplicação de `p_prova_id` (mesma turma e disciplina, '
  'no dia dela ou depois), as vistas dela passam para a prova, e ela fica CANCELADA com a marca «[JUNTADA COMO SESSAO '
  'n DE <codigo>]». A trilha (quem, quando, o retrato antes) mora na sessão, imutável. Só Admin e Encarregado '
  '(`avaliacoes_juntar_sessao.editar`). SECURITY INVOKER: a RLS decide o alcance. Desde a E-7: porteiro + '
  '`app.juntar_como_sessao_nucleo`.';

revoke all on function public.juntar_como_sessao(uuid, uuid) from public, anon;
grant execute on function public.juntar_como_sessao(uuid, uuid) to authenticated;
