-- =================================================================================
-- Spec 017 · Bloco 2 · M4 — a TRAVA DA TURMA ARQUIVADA no banco
-- Data local: 19/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- ⚠️ PORTÃO DA REGRA 9.4 (emenda de 19/10/2026): esta migration ALTERA o que existe — gravações que hoje passam
--    passam a ser RECUSADAS quando a turma está arquivada. Ela NÃO vai ao remoto antes do "aprovado" de Bernardo
--    Villas Boas sobre o desenho (`specs/017-bloco-2-turmas-e-dsa/contracts/migrations.md` §M4).
--
-- Decisão de Bernardo Villas Boas, D-COR-5 (16/10/2026): *"Arquivar turma em QUALQUER estado (…) A turma arquivada
--   some das listas (…), trava DSA, instrutor e edição; o Admin pode desarquivar."* A trava do SERVIDOR já existe
--   (`lib/acoes/turma-arquivada.ts`); esta é a do banco, que vale também para quem grava sem passar pela tela.
--
-- O que faz:
--   1. `app.turma_da_linha(tabela, linha)` — a turma de uma linha das 12 tabelas da turma, lida por `to_jsonb` (⚠️ em
--      PL/pgSQL os campos de `new` num `case` são resolvidos ao preparar a expressão, inclusive nos ramos que não
--      rodam — `new.avaliacao_id` numa tabela sem a coluna derrubaria toda gravação; analyze, achado 21).
--   2. `app.recusar_se_turma_arquivada()` — BEFORE INSERT OR UPDATE nas 12 tabelas: recusa com `23514`
--      `turma_arquivada` se a turma da linha NOVA ou da ANTIGA estiver arquivada (mover a linha para fora da
--      arquivada também é gravar nela; achado 56). Linha GLOBAL (turma nula) passa.
--   3. `app.turma_arquivada_so_le()` — BEFORE UPDATE em `turmas`: a arquivada não aceita alteração nenhuma; o
--      caminho é desarquivar. (⚠️ O corpo não tem a palavra da coluna de situação: o pgTAP 101 lê o corpo com
--      comentário e reprova gatilho de turmas que a tenha junto de `raise` — achado 70.)
--   4. `app.nascer_disciplina_nas_turmas` — a disciplina nova não nasce na arquivada (sem isso, criar disciplina num
--      curso com turma arquivada seria recusado inteiro pelo gatilho da `turma_disciplina`).
--
-- O que NÃO trava, declarado para o portão (achado 67): a atividade não letiva e o dia parado GLOBAIS (turma nula)
--   continuam alcançando a arquivada — `vw_carga_horaria_turma` e `vw_dias_parados_turma` os somam. Excluí-la ali
--   recriaria view e função com resultado em tela (ALTERA), e fica para Bernardo decidir.
--
-- Efeito no remoto: [pendente — `select count(*) from public.vw_turmas_arquivadas`, só leitura, imediatamente antes
--   do push desta migration; se > 0, a lista das turmas para Bernardo ver antes do `db push`].
--
-- Reversão: `drop trigger` dos 13 gatilhos; `drop function app.recusar_se_turma_arquivada()`,
--   `app.turma_arquivada_so_le()` e `app.turma_da_linha(text, jsonb)`; e `app.nascer_disciplina_nas_turmas` com o
--   corpo de `20260925135051`. O roteiro executável é `specs/017-bloco-2-turmas-e-dsa/reversao.sql`.
-- =================================================================================

-- ---------------------------------------------------------------- 1. a turma de uma linha
create or replace function app.turma_da_linha(p_tabela text, p_linha jsonb)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_turma uuid;
begin
  if p_linha is null then
    return null;
  end if;
  if p_tabela in ('sessoes_de_aplicacao', 'vistas_de_avaliacao') then
    select a.turma_id into v_turma
      from public.avaliacoes a
     where a.id = (p_linha ->> 'avaliacao_id')::uuid;
  elsif p_tabela in ('turma_disciplina_instrutor', 'turma_disciplina_unidade') then
    select td.turma_id into v_turma
      from public.turma_disciplina td
     where td.id = (p_linha ->> 'turma_disciplina_id')::uuid;
  else
    v_turma := (p_linha ->> 'turma_id')::uuid;
  end if;
  return v_turma;
end;
$$;
comment on function app.turma_da_linha(text, jsonb) is
  'A turma de uma linha das tabelas da turma (spec 017, M4), lida por to_jsonb — nunca por new.campo, que '
  'derrubaria a gravação nas tabelas sem a coluna. Nula = linha global.';
revoke all on function app.turma_da_linha(text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------- 2. a recusa nas 12 tabelas
create or replace function app.recusar_se_turma_arquivada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nova   uuid;
  v_antiga uuid;
begin
  v_nova := app.turma_da_linha(tg_table_name, to_jsonb(new));
  if tg_op = 'UPDATE' then
    v_antiga := app.turma_da_linha(tg_table_name, to_jsonb(old));
  end if;
  if (v_nova is not null and app.turma_arquivada(v_nova))
     or (v_antiga is not null and app.turma_arquivada(v_antiga)) then
    raise exception 'A turma esta arquivada: somente leitura.'
      using errcode = '23514', hint = 'turma_arquivada';
  end if;
  return new;
end;
$$;
comment on function app.recusar_se_turma_arquivada() is
  'D-COR-5 (spec 017, M4): a turma arquivada é somente leitura — recusa (23514 turma_arquivada) toda gravação '
  'cuja linha nova OU antiga é de turma arquivada. A linha global (turma nula) passa.';
revoke all on function app.recusar_se_turma_arquivada() from public, anon, authenticated;

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'registros_aula', 'avaliacoes', 'sessoes_de_aplicacao', 'vistas_de_avaliacao',
    'atividades_nao_letivas', 'dias_parados', 'turma_disciplina', 'turma_disciplina_instrutor',
    'turma_disciplina_unidade', 'ta_fora_do_dsa', 'previstos_proens_turma', 'avaliacoes_curriculo_turma'
  ] loop
    execute format(
      'create trigger trg_%1$s_turma_arquivada before insert or update on public.%1$I '
      'for each row execute function app.recusar_se_turma_arquivada()',
      v_tabela);
  end loop;
end;
$$;

-- ---------------------------------------------------------------- 3. a ficha da arquivada só lê
create or replace function app.turma_arquivada_so_le()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if app.turma_arquivada(old.id) then
    raise exception 'A turma esta arquivada: somente leitura. Para alterar, desarquive.'
      using errcode = '23514', hint = 'turma_arquivada';
  end if;
  return new;
end;
$$;
comment on function app.turma_arquivada_so_le() is
  'D-COR-5 (spec 017, M4): a turma arquivada não aceita alteração nenhuma; o caminho é desarquivar (só o Admin).';
revoke all on function app.turma_arquivada_so_le() from public, anon, authenticated;

create trigger trg_turmas_arquivada_so_le before update on public.turmas
  for each row execute function app.turma_arquivada_so_le();

-- ---------------------------------------------------------------- 4. a disciplina nova não nasce na arquivada
create or replace function app.nascer_disciplina_nas_turmas(p_disciplina_id uuid, p_curso_id uuid)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_criadas integer;
begin
  -- ⚠️ `planejada` e `ativa` apenas (N-4, 24/09/2026): turma cancelada nao tera
  --    lancamento, e linha nova nela e ruido na LIQ; turma concluida ja fechou.
  -- ⚠️ E NAO na ARQUIVADA (spec 017, M4): ela e somente leitura, e o gatilho da
  --    `turma_disciplina` recusaria a linha — derrubando a criacao da disciplina inteira.
  -- ⚠️ `not exists` em vez de `on conflict`, e a razao foi MEDIDA: a unicidade
  --    `uq_turma_disciplina_ativo` e PARCIAL (`where status = 'ativo'`), e `on conflict`
  --    sobre indice parcial exige repetir o predicado — o que faria a linha INATIVA ser
  --    duplicada em vez de respeitada. Aqui, linha existente em qualquer status conta
  --    como existente, e a chamada fica idempotente de verdade (A-2b).
  insert into public.turma_disciplina (turma_id, disciplina_id, origem_periodo)
  select t.id, p_disciplina_id, 'nao_informado'
    from public.turmas t
   where t.curso_id = p_curso_id
     and t.status in ('planejada', 'ativa')
     and not app.turma_arquivada(t.id)
     and not exists (select 1 from public.turma_disciplina td
                      where td.turma_id = t.id and td.disciplina_id = p_disciplina_id);

  get diagnostics v_criadas = row_count;
  return v_criadas;
end;
$$;
