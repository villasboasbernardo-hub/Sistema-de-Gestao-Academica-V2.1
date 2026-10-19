-- =================================================================================
-- Spec 017 · Bloco 2 · M2 — a HISTÓRIA DA TURMA: a trilha da situação e o arquivamento
-- Data local: 19/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- Decisões de Bernardo Villas Boas (16/10/2026):
--   D-COR-4 *"toda troca de status aceita uma observação (…), que fica visível na ficha"*;
--   D-COR-5 *"Arquivar turma em QUALQUER estado (…) Arquivar não é um quinto status: são colunas próprias
--     (`arquivada_em`, `arquivada_por`, observação) (…) o Admin pode desarquivar"* — reabre nominalmente a TURMA-1.
-- Regra 9.4 (emenda de 19/10/2026): SÓ ACRESCENTA — tabelas, view e funções novas; o gatilho novo em `turmas`
--   só ANOTA (não recusa, não muda linha).
--
-- O que faz:
--   1. `public.turma_trocas_de_situacao` — de → para, observação, autor, quando. SÓ DE ACRÉSCIMO, imutável inclusive
--      para a service_role. Sem FK para `turmas`, de propósito: a suíte apaga turmas de amostra (molde
--      `previstos_proens_alteracoes`).
--   2. `app.anotar_troca_de_situacao` + `trg_turmas_anotar_troca` (AFTER UPDATE OF status): TODA troca fica na trilha,
--      por qualquer caminho — a tela, um `update` direto, um script. A observação chega pela transação
--      (`ciaara.observacao_da_troca`), posta por (3).
--      ⚠️ O corpo da função não contém a palavra de recusa: a guarda de ausência do pgTAP 101 conta gatilho de
--      `turmas` com a situação E a recusa no corpo.
--   3. `public.trocar_situacao_da_turma(p_codigo, p_status, p_observacao)` — troca e anota de uma vez. INVOKER: quem
--      decide se troca é a policy `turmas_editar`. Zero linha = fora do alcance (`42501`).
--   4. `public.turma_arquivamentos` — eventos `arquivar`/`desarquivar`, só de acréscimo. Arquiva quem pode editar a
--      turma, no alcance; DESARQUIVA SÓ O ADMIN (a policy de criação diz quem faz cada ação). Autor e instante são
--      carimbados aqui (o cliente não escolhe), e a sequência vale: arquivar a já arquivada, ou desarquivar a que
--      não está, é recusado.
--   5. `app.turma_arquivada(turma_id)` e `public.vw_turmas_arquivadas` (`arquivada_em`, `arquivada_por`,
--      observação) — o estado atual é o ÚLTIMO evento. A situação da turma NÃO muda ao arquivar.
--
-- Reversão (perde-se o histórico que as tabelas tiverem — decisão de Bernardo se houver linha):
--   drop trigger trg_turmas_anotar_troca on public.turmas; drop view public.vw_turmas_arquivadas;
--   drop function public.trocar_situacao_da_turma(text, public.status_turma, text);
--   drop function app.turma_arquivada(uuid); drop function app.anotar_troca_de_situacao();
--   drop table public.turma_arquivamentos; drop table public.turma_trocas_de_situacao;
--   drop function app.carimbar_arquivamento(); drop function app.trilha_da_turma_imutavel().
-- =================================================================================

-- ---------------------------------------------------------------- 0. a imutabilidade (as duas tabelas)
create or replace function app.trilha_da_turma_imutavel()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception '% e so de acrescimo: % nao e permitido', tg_table_name, tg_op
    using errcode = '42501',
          hint = 'rastro_imutavel',
          detail = 'Corrigir a historia da turma e registrar evento novo, nunca reescrever o antigo '
                   '(Principio IV, regra 4 do CLAUDE.md).';
end;
$$;
comment on function app.trilha_da_turma_imutavel() is
  'Recusa UPDATE, DELETE e TRUNCATE na trilha da situação e no arquivamento da turma. Gatilho de STATEMENT: pega '
  'também quem tem privilégio, a service_role inclusive.';
revoke all on function app.trilha_da_turma_imutavel() from public, anon, authenticated;

-- ---------------------------------------------------------------- 1. a trilha da situação
create table public.turma_trocas_de_situacao (
  id                uuid primary key default gen_random_uuid(),
  ordem             bigint generated always as identity,
  turma_id          uuid not null,
  situacao_anterior public.status_turma not null,
  situacao_nova     public.status_turma not null,
  observacao        text check (observacao is null or length(observacao) <= 500),
  autor_id          uuid,
  criado_em         timestamptz not null default now()
);

comment on table public.turma_trocas_de_situacao is
  'Bloco 2 (spec 017), D-COR-4: a trilha das trocas de situação da turma — toda troca, por qualquer caminho, anotada '
  'pelo gatilho `trg_turmas_anotar_troca`. Só de acréscimo. `autor_id` = `auth.uid()`; nulo = troca sem sessão '
  '(script, service_role). Sem FK para `turmas` de propósito (a suíte apaga turmas de amostra).';
comment on column public.turma_trocas_de_situacao.observacao is
  'Opcional (decisão 13 da triagem de 16/10/2026), até 500 caracteres.';

create index turma_trocas_de_situacao_turma_idx on public.turma_trocas_de_situacao (turma_id, ordem desc);

alter table public.turma_trocas_de_situacao enable row level security;

create policy turma_trocas_de_situacao_ler on public.turma_trocas_de_situacao
  for select to authenticated
  using (app.pode('turmas', 'ler') and app.alcanca_turma(turma_id));

revoke insert, update, delete, truncate on public.turma_trocas_de_situacao from authenticated, anon;

create trigger trg_turma_trocas_imutaveis
  before update or delete on public.turma_trocas_de_situacao
  for each statement execute function app.trilha_da_turma_imutavel();
create trigger trg_turma_trocas_sem_truncate
  before truncate on public.turma_trocas_de_situacao
  for each statement execute function app.trilha_da_turma_imutavel();

-- ---------------------------------------------------------------- 2. o gatilho que anota
create or replace function app.anotar_troca_de_situacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.turma_trocas_de_situacao (turma_id, situacao_anterior, situacao_nova, observacao, autor_id)
  values (new.id, old.status, new.status,
          nullif(btrim(coalesce(current_setting('ciaara.observacao_da_troca', true), '')), ''),
          auth.uid());
  return null;
end;
$$;
comment on function app.anotar_troca_de_situacao() is
  'Anota na trilha toda troca de situação da turma (D-COR-4). Não recusa nada; a observação vem de '
  '`ciaara.observacao_da_troca`, posta por `trocar_situacao_da_turma` na mesma transação.';
revoke all on function app.anotar_troca_de_situacao() from public, anon, authenticated;

create trigger trg_turmas_anotar_troca
  after update of status on public.turmas
  for each row
  when (old.status is distinct from new.status)
  execute function app.anotar_troca_de_situacao();

-- ---------------------------------------------------------------- 3. trocar e anotar de uma vez
create or replace function public.trocar_situacao_da_turma(
  p_codigo text,
  p_status public.status_turma,
  p_observacao text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_linhas integer;
begin
  perform set_config('ciaara.observacao_da_troca', coalesce(p_observacao, ''), true);
  update public.turmas set status = p_status where codigo = p_codigo;
  get diagnostics v_linhas = row_count;
  perform set_config('ciaara.observacao_da_troca', '', true);
  if v_linhas = 0 then
    raise exception 'Turma fora do alcance: %', p_codigo
      using errcode = '42501', hint = 'turma_fora_do_alcance';
  end if;
end;
$$;
comment on function public.trocar_situacao_da_turma(text, public.status_turma, text) is
  'Troca a situação da turma e anota a observação na trilha, numa gravação só (D-COR-4, FR-003.2 da spec 017). '
  'INVOKER: a policy `turmas_editar` decide; zero linha = 42501 `turma_fora_do_alcance`.';
revoke all on function public.trocar_situacao_da_turma(text, public.status_turma, text) from public, anon;
grant execute on function public.trocar_situacao_da_turma(text, public.status_turma, text) to authenticated;

-- ---------------------------------------------------------------- 4. o arquivamento
create table public.turma_arquivamentos (
  id         uuid primary key default gen_random_uuid(),
  ordem      bigint generated always as identity,
  turma_id   uuid not null,
  acao       text not null check (acao in ('arquivar', 'desarquivar')),
  observacao text check (observacao is null or length(observacao) <= 500),
  autor_id   uuid,
  criado_em  timestamptz not null default now()
);

comment on table public.turma_arquivamentos is
  'Bloco 2 (spec 017), D-COR-5: os eventos de arquivar e desarquivar a turma. Só de acréscimo; o estado atual é o '
  'último evento (`vw_turmas_arquivadas`, `app.turma_arquivada`). Arquivar NÃO é situação: o enum continua com quatro '
  'valores e a situação da turma não muda (TURMA-1 reaberta só para isto). Desarquiva só o Admin.';

create index turma_arquivamentos_turma_idx on public.turma_arquivamentos (turma_id, ordem desc);

create or replace function app.turma_arquivada(p_turma_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (select a.acao = 'arquivar'
       from public.turma_arquivamentos a
      where a.turma_id = p_turma_id
      order by a.ordem desc
      limit 1),
    false)
$$;
comment on function app.turma_arquivada(uuid) is
  'A turma está arquivada? = o último evento de `turma_arquivamentos` é `arquivar` (D-COR-5).';
revoke all on function app.turma_arquivada(uuid) from public, anon;
grant execute on function app.turma_arquivada(uuid) to authenticated, service_role;

-- O carimbo e a sequência (tabela nova): o autor e o instante são do banco, a turma existe, e não se arquiva a
-- arquivada nem se desarquiva a que não está.
create or replace function app.carimbar_arquivamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.autor_id := auth.uid();
  new.criado_em := now();
  if not exists (select 1 from public.turmas t where t.id = new.turma_id) then
    raise exception 'A turma nao existe.' using errcode = '23503', hint = 'turma_inexistente';
  end if;
  if new.acao = 'arquivar' and app.turma_arquivada(new.turma_id) then
    raise exception 'A turma ja esta arquivada.' using errcode = '23514', hint = 'turma_ja_arquivada';
  end if;
  if new.acao = 'desarquivar' and not app.turma_arquivada(new.turma_id) then
    raise exception 'A turma nao esta arquivada.' using errcode = '23514', hint = 'turma_nao_arquivada';
  end if;
  return new;
end;
$$;
revoke all on function app.carimbar_arquivamento() from public, anon, authenticated;

create trigger trg_turma_arquivamentos_carimbo
  before insert on public.turma_arquivamentos
  for each row execute function app.carimbar_arquivamento();
create trigger trg_turma_arquivamentos_imutaveis
  before update or delete on public.turma_arquivamentos
  for each statement execute function app.trilha_da_turma_imutavel();
create trigger trg_turma_arquivamentos_sem_truncate
  before truncate on public.turma_arquivamentos
  for each statement execute function app.trilha_da_turma_imutavel();

alter table public.turma_arquivamentos enable row level security;

create policy turma_arquivamentos_ler on public.turma_arquivamentos
  for select to authenticated
  using (app.pode('turmas', 'ler') and app.alcanca_turma(turma_id));

-- ⚠️ D-COR-5: arquiva quem pode editar a turma, no alcance; DESARQUIVA SÓ O ADMIN. `coalesce(…, false)` (gotcha 15).
create policy turma_arquivamentos_criar on public.turma_arquivamentos
  for insert to authenticated
  with check (
    (acao = 'arquivar' and coalesce(app.pode('turmas', 'editar'), false) and app.alcanca_turma(turma_id))
    or (acao = 'desarquivar' and coalesce(app.eh_admin(), false))
  );

revoke update, delete, truncate on public.turma_arquivamentos from authenticated, anon;

-- ---------------------------------------------------------------- 5. o estado atual
create view public.vw_turmas_arquivadas with (security_invoker = true) as
select u.turma_id,
       u.criado_em  as arquivada_em,
       u.autor_id   as arquivada_por,
       u.observacao
  from (select distinct on (a.turma_id) a.turma_id, a.acao, a.criado_em, a.autor_id, a.observacao
          from public.turma_arquivamentos a
         order by a.turma_id, a.ordem desc) u
 where u.acao = 'arquivar';

comment on view public.vw_turmas_arquivadas is
  'As turmas arquivadas agora, com `arquivada_em`, `arquivada_por` (auth.uid) e a observação do arquivamento '
  '(D-COR-5). A turma some das listas e fica só de leitura enquanto estiver aqui.';

revoke insert, update, delete, truncate on public.vw_turmas_arquivadas from authenticated;
revoke all on public.vw_turmas_arquivadas from anon;
