-- =================================================================================
-- Spec 014, PR 5 · a TRILHA DO ARBITRADO (condição da D5.3)
--
-- Decisão de Bernardo Villas Boas, 14/10/2026, ao aceitar a D5.3 (sem «desfazer» do arbitrado nesta entrega):
-- *"aceita, desde que a trilha de auditoria registre quem arbitrou, quando e o valor anterior"*.
-- Medido antes desta migration: o arbitrado gravava QUEM e QUANDO (`editado_por`/`editado_em`, pelo
-- `app.set_auditoria()`), mas NÃO o valor anterior — a próxima gravação sobrescrevia o anterior sem rastro.
--
-- O que entra (o padrão de `previstos_proens_alteracoes`, PR 1.1, e de `auditoria_de_conta`, spec 011):
--   1. `avaliacoes_curriculo_arbitragens`: a trilha — antes, depois, quem (`auth.uid()`) e quando —, SÓ DE
--      ACRÉSCIMO, protegida por gatilho de comando que recusa UPDATE, DELETE e TRUNCATE inclusive para a
--      `service_role`. Lida por quem lê a disciplina do curso (`disciplinas.ler` + alcance).
--   2. O gatilho AFTER em `avaliacoes_curriculo` e em `avaliacoes_curriculo_turma`. Grava quando o que muda é
--      ARBITRADO: no ajuste por turma, toda mudança (ele é sempre arbitrado ou sugestão); no item do curso, só
--      quando a linha é (ou era) arbitrada, sugestão da planilha ou UE decidida pela Divisão. Gravação sem
--      mudança dos campos acompanhados não é alteração e não deixa linha (a 2ª rodada da sincronização continua
--      com ZERO mudança). A carga sem sessão também deixa linha, com `autor_id` nulo: é o rastro de que veio da
--      carga (a sugestão da planilha, FR-031.8).
--
-- ⚠️ Não muda dado nenhum: só cria a tabela, a função e os gatilhos. Nada a reconciliar no remoto.
-- ⚠️ `registro_id`, `avaliacao_curriculo_id`, `curso_id` e `turma_id` NÃO são FK (como na trilha do previsto):
--    o rastro imutável não pode impedir que a linha que ele descreve deixe de existir numa base de amostra.
--
-- Reversão (base descartável): drop dos dois gatilhos de registro, da função, dos gatilhos de imutabilidade e da
-- tabela. No remoto: os dois gatilhos de registro saem (`drop trigger`), e a tabela FICA (regra 4 — nada é
-- apagado; a trilha já gravada é histórico).
-- =================================================================================

create table public.avaliacoes_curriculo_arbitragens (
  id                     uuid primary key default gen_random_uuid(),
  tabela                 text not null check (tabela in ('avaliacoes_curriculo', 'avaliacoes_curriculo_turma')),
  registro_id            uuid not null,
  avaliacao_curriculo_id uuid not null,
  curso_id               uuid not null,
  turma_id               uuid,
  operacao               text not null check (operacao in ('INSERT', 'UPDATE')),
  antes                  jsonb,
  depois                 jsonb not null,
  autor_id               uuid,
  registrado_em          timestamptz not null default now(),
  constraint arbitragem_turma_so_no_ajuste check ((tabela = 'avaliacoes_curriculo_turma') = (turma_id is not null)),
  constraint arbitragem_antes_so_no_update check ((operacao = 'UPDATE') = (antes is not null))
);

comment on table public.avaliacoes_curriculo_arbitragens is
  'Spec 014, D5.3 (condição de Bernardo Villas Boas, 14/10/2026): a trilha do ARBITRADO das avaliações do '
  'currículo — antes, depois, quem (`auth.uid()`; nulo = carga sem sessão) e quando —, no curso '
  '(`avaliacoes_curriculo`) e por turma (`avaliacoes_curriculo_turma`). Só de acréscimo: UPDATE, DELETE e '
  'TRUNCATE recusados por gatilho de comando, inclusive para a service_role. Escrita só pelo gatilho '
  '`app.registrar_arbitragem` (SECURITY DEFINER). Os ids NÃO são FK (o rastro não impede a linha de sair).';

create index avaliacoes_curriculo_arbitragens_item_idx
  on public.avaliacoes_curriculo_arbitragens (avaliacao_curriculo_id, registrado_em);

alter table public.avaliacoes_curriculo_arbitragens enable row level security;

create policy avaliacoes_curriculo_arbitragens_ler on public.avaliacoes_curriculo_arbitragens
  for select to authenticated
  using (app.pode('disciplinas', 'ler') and app.alcanca_curso(curso_id));

revoke insert, update, delete, truncate on public.avaliacoes_curriculo_arbitragens from authenticated, anon;

create or replace function app.registrar_arbitragem()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_antes  jsonb;
  v_depois jsonb;
  v_curso  uuid;
  v_item   uuid;
  v_turma  uuid;
begin
  if tg_table_name = 'avaliacoes_curriculo_turma' then
    v_depois := jsonb_build_object('ta_aplicacao', new.ta_aplicacao, 'ta_vista', new.ta_vista, 'origem', new.origem,
                                   'confirmado_em', new.confirmado_em, 'status', new.status);
    if tg_op = 'UPDATE' then
      v_antes := jsonb_build_object('ta_aplicacao', old.ta_aplicacao, 'ta_vista', old.ta_vista, 'origem', old.origem,
                                    'confirmado_em', old.confirmado_em, 'status', old.status);
    end if;
    v_item := new.avaliacao_curriculo_id;
    v_turma := new.turma_id;
    select ac.curso_id into v_curso from public.avaliacoes_curriculo ac where ac.id = new.avaliacao_curriculo_id;
  else
    -- No item do curso, só o que é (ou era) do arbitrado: o item do currículo carregado pela D-4 não entra.
    if not (new.origem_item = 'arbitrado'
            or coalesce(new.origem_ta_aplicacao in ('arbitrado', 'sugestao_planilha'), false)
            or coalesce(new.origem_ta_vista in ('arbitrado', 'sugestao_planilha'), false)
            or new.origem_ue is not distinct from 'decisao_ciaara'
            or (tg_op = 'UPDATE' and (old.origem_item = 'arbitrado'
                                      or coalesce(old.origem_ta_aplicacao in ('arbitrado', 'sugestao_planilha'), false)
                                      or coalesce(old.origem_ta_vista in ('arbitrado', 'sugestao_planilha'), false)
                                      or old.origem_ue is not distinct from 'decisao_ciaara'))) then
      return null;
    end if;
    v_depois := jsonb_build_object('origem_item', new.origem_item, 'ta_aplicacao', new.ta_aplicacao,
                                   'origem_ta_aplicacao', new.origem_ta_aplicacao, 'ta_vista', new.ta_vista,
                                   'origem_ta_vista', new.origem_ta_vista, 'unidade_ensino_id', new.unidade_ensino_id,
                                   'origem_ue', new.origem_ue, 'ue_decidida_em', new.ue_decidida_em,
                                   'status', new.status);
    if tg_op = 'UPDATE' then
      v_antes := jsonb_build_object('origem_item', old.origem_item, 'ta_aplicacao', old.ta_aplicacao,
                                    'origem_ta_aplicacao', old.origem_ta_aplicacao, 'ta_vista', old.ta_vista,
                                    'origem_ta_vista', old.origem_ta_vista, 'unidade_ensino_id', old.unidade_ensino_id,
                                    'origem_ue', old.origem_ue, 'ue_decidida_em', old.ue_decidida_em,
                                    'status', old.status);
    end if;
    v_item := new.id;
    v_curso := new.curso_id;
  end if;

  if tg_op = 'UPDATE' and v_antes = v_depois then
    return null;   -- gravação sem mudança dos campos acompanhados não é alteração
  end if;

  insert into public.avaliacoes_curriculo_arbitragens
    (tabela, registro_id, avaliacao_curriculo_id, curso_id, turma_id, operacao, antes, depois, autor_id)
  values (tg_table_name, new.id, v_item, v_curso, v_turma, tg_op, v_antes, v_depois, auth.uid());
  return null;
end;
$$;

comment on function app.registrar_arbitragem() is
  'Spec 014, D5.3: alimenta `avaliacoes_curriculo_arbitragens` com antes, depois, autor e instante a cada INSERT e '
  'a cada UPDATE que muda o arbitrado (ajuste por turma; item do curso arbitrado, sugestão ou UE decidida). '
  'SECURITY DEFINER: a trilha não tem policy de escrita.';

revoke all on function app.registrar_arbitragem() from public, anon, authenticated;

create trigger trg_avaliacoes_curriculo_trilha after insert or update on public.avaliacoes_curriculo
  for each row execute function app.registrar_arbitragem();
create trigger trg_avaliacoes_curriculo_turma_trilha after insert or update on public.avaliacoes_curriculo_turma
  for each row execute function app.registrar_arbitragem();

create or replace function app.avaliacoes_curriculo_arbitragens_imutavel()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'A trilha do arbitrado é só de acréscimo: % não é permitido.', tg_op
    using errcode = '42501',
          hint = 'trilha_do_arbitrado_imutavel',
          detail = 'Corrigir o arbitrado é gravar valor novo, que deixa linha nova na trilha (regra 5).';
end;
$$;

revoke all on function app.avaliacoes_curriculo_arbitragens_imutavel() from public, anon, authenticated;

create trigger trg_avaliacoes_curriculo_arbitragens_imutavel
  before update or delete on public.avaliacoes_curriculo_arbitragens
  for each statement execute function app.avaliacoes_curriculo_arbitragens_imutavel();
create trigger trg_avaliacoes_curriculo_arbitragens_sem_truncate
  before truncate on public.avaliacoes_curriculo_arbitragens
  for each statement execute function app.avaliacoes_curriculo_arbitragens_imutavel();
