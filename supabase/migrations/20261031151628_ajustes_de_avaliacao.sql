-- =====================================================================================================================
-- Bloco 16 (spec 031), ajuste D da conferência de 31/10/2026 — AJUSTE MANUAL DA SITUAÇÃO E DAS DATAS DE UMA AVALIAÇÃO.
-- Data local: 31/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- > "ABA AVALIAÇÕES do DSA: (…) Ícone Editar por linha (diálogo): situação (Pendente / Em andamento / Concluída /
-- > Cancelada e as que já existirem), data de aplicação e data da vista, com JUSTIFICATIVA OBRIGATÓRIA (mín. 10
-- > caracteres), gravando autor e data num histórico visível na linha. Edita quem lança o DSA da turma. A edição manual
-- > NÃO muda a CH (…). Tabela nova de ajustes = migration que ACRESCENTA." — Bernardo Villas Boas, 31/10/2026
--
-- O que entra, e só isto (só ACRESCENTA — regra 9.4 com a emenda de 19/10/2026):
--   1. `public.ajustes_de_avaliacao` — SÓ DE ACRÉSCIMO: cada ajuste é uma linha, o mais recente vale, e os anteriores são
--      o histórico da linha da tela. Liga a UMA avaliação do currículo da turma (`avaliacao_curriculo_id`) OU a UMA
--      avaliação lançada sem item (`avaliacao_id`). O autor (`autor_nome`) é carimbado pelo banco, do cadastro de quem
--      tem a sessão — nunca do que o cliente manda.
--   2. RLS: lê quem lê o DSA (`registros_aula.ler`) ou as avaliações (`avaliacoes.ler`) e alcança a turma; grava quem
--      LANÇA o DSA (`registros_aula.criar`), alcança a turma e a tem em oferta. Sem `UPDATE` nem `DELETE` para quem usa
--      a tela (sem policy e sem privilégio — regra 4), e o gatilho recusa REESCREVER a linha inclusive para a
--      `service_role`. ⚠️ O `DELETE` da `service_role` fica (como em toda tabela do sistema): é o que deixa as amostras de
--      teste saírem, já que as FKs são `restrict`.
--   3. ⚠️ NENHUMA VIEW MUDA: a situação da avaliação é calculada em TypeScript (`quadroDeAvaliacoesDaTurma`); o ajuste é
--      aplicado lá, por `comAjustes`. A CH não lê esta tabela — a edição manual não muda a CH.
--
-- REVERSÃO (`specs/031-…/reversao-ajustes.sql`): `drop table public.ajustes_de_avaliacao` (tabela nascida aqui; recusar se
-- tiver linha), as funções e a sequência.
-- =====================================================================================================================

create sequence app.ajustes_de_avaliacao_codigo_seq as bigint;
select setval('app.ajustes_de_avaliacao_codigo_seq', 1, false);

create or replace function app.proximo_codigo_ajuste_de_avaliacao()
returns text language sql security definer set search_path = pg_catalog, public as $$
  select 'AJA-' || lpad(nextval('app.ajustes_de_avaliacao_codigo_seq')::text, 6, '0');
$$;
revoke all on function app.proximo_codigo_ajuste_de_avaliacao() from public, anon;
grant execute on function app.proximo_codigo_ajuste_de_avaliacao() to authenticated, service_role;

create table public.ajustes_de_avaliacao (
  id                     uuid primary key default gen_random_uuid(),
  codigo                 text not null unique default app.proximo_codigo_ajuste_de_avaliacao(),
  turma_id               uuid not null references public.turmas(id) on delete restrict,
  avaliacao_curriculo_id uuid references public.avaliacoes_curriculo(id) on delete restrict,
  avaliacao_id           uuid references public.avaliacoes(id) on delete restrict,
  situacao               text not null check (situacao in ('pendente', 'em_andamento', 'concluida', 'atrasada',
                                                           'sem_correspondencia', 'cancelada')),
  data_aplicacao         date,
  data_vista             date,
  justificativa          text not null check (length(btrim(justificativa)) >= 10 and length(justificativa) <= 1000),
  autor_nome             text,
  status                 public.status_registro not null default 'ativo',
  origem_migracao_v1     text,
  criado_por             uuid,
  criado_em              timestamptz not null default now(),
  editado_por            uuid,
  editado_em             timestamptz,
  constraint ajustes_de_avaliacao_um_alvo check (num_nonnulls(avaliacao_curriculo_id, avaliacao_id) = 1),
  constraint ajustes_de_avaliacao_vista_depois check (data_vista is null or data_aplicacao is null
                                                      or data_vista >= data_aplicacao)
);

comment on table public.ajustes_de_avaliacao is
  'Bloco 16 (spec 031), ajuste D de 31/10/2026: o ajuste MANUAL da situação e das datas de aplicação e de vista de uma '
  'avaliação da turma, com justificativa (>= 10) e autor — só de acréscimo; o mais recente vale, os anteriores são o '
  'histórico. Não muda a CH (nenhuma view a lê).';

create index ajustes_de_avaliacao_turma_idx on public.ajustes_de_avaliacao (turma_id, criado_em);

create trigger trg_ajustes_de_avaliacao_auditoria before insert or update on public.ajustes_de_avaliacao
  for each row execute function app.set_auditoria();

create or replace function app.guardar_ajuste_de_avaliacao()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_turma uuid;
begin
  if tg_op <> 'INSERT' then
    raise exception 'O ajuste de avaliacao nao se reescreve: grave um ajuste novo.'
      using errcode = '42501', hint = 'ajuste_de_avaliacao_imutavel';
  end if;
  -- O alvo é da turma: a avaliação lançada pela turma dela; o item do currículo pelo curso da turma.
  if new.avaliacao_id is not null then
    select a.turma_id into v_turma from public.avaliacoes a where a.id = new.avaliacao_id;
    if v_turma is distinct from new.turma_id then
      raise exception 'A avaliacao nao e desta turma.' using errcode = '23514', hint = 'ajuste_fora_da_turma';
    end if;
  else
    if not exists (select 1 from public.avaliacoes_curriculo c join public.turmas t on t.curso_id = c.curso_id
                    where c.id = new.avaliacao_curriculo_id and t.id = new.turma_id) then
      raise exception 'A avaliacao do curriculo nao e do curso da turma.'
        using errcode = '23514', hint = 'ajuste_fora_da_turma';
    end if;
  end if;
  -- O autor é o cadastro da sessão (nome de exibição, senão o nome); sem sessão (script), fica nulo.
  select coalesce(nullif(btrim(u.nome_exibicao), ''), u.nome) into new.autor_nome
    from public.usuarios u where u.auth_user_id = auth.uid();
  return new;
end;
$$;
revoke all on function app.guardar_ajuste_de_avaliacao() from public, anon, authenticated;

create trigger trg_ajustes_de_avaliacao_guarda before insert or update on public.ajustes_de_avaliacao
  for each row execute function app.guardar_ajuste_de_avaliacao();

alter table public.ajustes_de_avaliacao enable row level security;

create policy ajustes_de_avaliacao_ler on public.ajustes_de_avaliacao
  for select to authenticated
  using ((coalesce(app.pode('registros_aula', 'ler'), false) or coalesce(app.pode('avaliacoes', 'ler'), false))
         and app.alcanca_turma(turma_id));

create policy ajustes_de_avaliacao_criar on public.ajustes_de_avaliacao
  for insert to authenticated
  with check (coalesce(app.pode('registros_aula', 'criar'), false)
              and app.alcanca_turma(turma_id) and app.turma_em_oferta(turma_id));

revoke update, delete, truncate on public.ajustes_de_avaliacao from authenticated, anon;
