-- =================================================================================
-- Reversão da migration 20261024063555 (spec 025, Bloco 10) — gerada a partir do texto das migrations.
--
-- ⚠️ SÓ VALE SE NENHUMA EXCLUSÃO DAS TABELAS NOVAS TIVER ACONTECIDO: com linha de `turmas`, `feriados`,
--    `regimes_de_horario`, `avaliacoes_curriculo` ou `config_listas` em `exclusoes_registradas`, a restrição antiga
--    não volta (o rastro é só de acréscimo, e apagá-lo é o que a regra 4 existe para impedir) — a conferência abaixo
--    recusa antes de mexer em qualquer coisa.
-- ⚠️ As três funções antigas de impedimento voltam com o texto EXATO de 20260915140100 e 20260925135044.
-- =================================================================================
do $$
begin
  if exists (select 1 from public.exclusoes_registradas
              where tabela not in ('instrutores', 'disciplinas', 'unidades_ensino')) then
    raise exception 'ha exclusao registrada das tabelas novas: a reversao nao apaga rastro';
  end if;
end $$;

drop function if exists public.impedimentos_de_exclusao_da_turma(p_turma_id uuid);
drop function if exists public.impedimentos_de_exclusao_das_turmas(p_turmas uuid[]);
drop function if exists public.excluir_turma(p_turma_id uuid, p_codigo_confirmacao text);
drop function if exists public.impedimentos_de_exclusao_do_feriado(p_feriado_id uuid);
drop function if exists public.impedimentos_de_exclusao_dos_feriados(p_feriados uuid[]);
drop function if exists public.excluir_feriado(p_feriado_id uuid, p_codigo_confirmacao text);
drop function if exists public.impedimentos_de_exclusao_dos_regimes(p_regimes uuid[]);
drop function if exists public.excluir_regime_de_horario(p_regime_id uuid, p_codigo_confirmacao text);
drop function if exists public.impedimentos_de_exclusao_dos_itens(p_itens uuid[]);
drop function if exists public.excluir_item_de_avaliacao_do_curriculo(p_item_id uuid, p_codigo_confirmacao text);
drop function if exists public.impedimentos_de_exclusao_das_salas(p_salas uuid[]);
drop function if exists public.excluir_sala(p_sala_id uuid, p_nome_confirmacao text);
drop function if exists public.impedimentos_de_exclusao_das_unidades(p_unidades uuid[]);

drop function if exists app.referencias_por_fk(regclass, uuid[], text[]);
drop function if exists app.registros_da_turma(uuid);
drop function if exists app.impedimentos_de_exclusao_da_turma(uuid);
drop function if exists app.impedimentos_de_exclusao_das_turmas(uuid[]);
drop function if exists app.excluir_turma(uuid, text);
drop function if exists app.registros_do_feriado(uuid);
drop function if exists app.impedimentos_de_exclusao_do_feriado(uuid);
drop function if exists app.impedimentos_de_exclusao_dos_feriados(uuid[]);
drop function if exists app.excluir_feriado(uuid, text);
drop function if exists app.registros_do_regime(uuid);
drop function if exists app.impedimentos_de_exclusao_dos_regimes(uuid[]);
drop function if exists app.excluir_regime_de_horario(uuid, text);
drop function if exists app.registros_do_item(uuid);
drop function if exists app.impedimentos_de_exclusao_dos_itens(uuid[]);
drop function if exists app.excluir_item_de_avaliacao_do_curriculo(uuid, text);
drop function if exists app.registros_da_sala(uuid);
drop function if exists app.impedimentos_de_exclusao_das_salas(uuid[]);
drop function if exists app.excluir_sala(uuid, text);
drop function if exists app.impedimentos_de_exclusao_das_unidades(uuid[]);

create or replace function app.impedimentos_de_exclusao_do_instrutor(p_instrutor_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_codigo text;
  v_impedimentos text[] := array[]::text[];
begin
  if not app.pode('instrutores', 'criar') then
    raise exception 'exclusao de instrutor restrita a quem pode criar instrutor'
      using errcode = '42501';
  end if;

  select i.codigo into v_codigo from public.instrutores i where i.id = p_instrutor_id;
  if not found then
    raise exception 'instrutor inexistente' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.registros_aula r where r.instrutor_id = p_instrutor_id) then
    v_impedimentos := array_append(v_impedimentos, 'aula_lancada');
  end if;

  if exists (select 1 from public.turma_disciplina_instrutor t where t.instrutor_id = p_instrutor_id)
     or exists (select 1 from public.turma_disciplina t where t.instrutor_id = p_instrutor_id)
     or exists (select 1 from public.disciplinas d where p_instrutor_id = any (d.instrutores_atribuidos)) then
    v_impedimentos := array_append(v_impedimentos, 'atribuicao');
  end if;

  if exists (select 1 from public.instrutor_disciplina v where v.instrutor_id = p_instrutor_id) then
    v_impedimentos := array_append(v_impedimentos, 'vinculo_de_habilitacao');
  end if;

  if exists (select 1 from public.usuarios u where u.instrutor_id = p_instrutor_id) then
    v_impedimentos := array_append(v_impedimentos, 'conta_de_acesso');
  end if;

  if exists (select 1 from public.avaliacoes a
              where a.instrutor_responsavel_id = p_instrutor_id or a.fiscal_id = p_instrutor_id)
     or exists (select 1 from public.arquivo_avaliacoes_v1 a where a.instrutor_codigo_v1 = v_codigo) then
    v_impedimentos := array_append(v_impedimentos, 'avaliacao');
  end if;

  if exists (select 1 from public.responsaveis_curso rc where rc.instrutor_id = p_instrutor_id) then
    v_impedimentos := array_append(v_impedimentos, 'responsavel_de_curso');
  end if;

  return v_impedimentos;
end;
$$;

comment on function app.impedimentos_de_exclusao_do_instrutor(uuid) is
  'O que prende o instrutor ao historico e impede a exclusao permanente: aula_lancada, atribuicao, '
  'vinculo_de_habilitacao, conta_de_acesso, avaliacao, responsavel_de_curso — em qualquer status. '
  'Vazio = registro sem historico. Porteiro: app.pode(instrutores, criar). Autorizacao de Bernardo '
  'Villas Boas, 15/09/2026.';

create or replace function app.impedimentos_de_exclusao_da_disciplina(p_disciplina_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_codigo       text;
  v_curso_id     uuid;
  v_impedimentos text[] := array[]::text[];
begin
  if not app.pode('disciplinas', 'criar') then
    raise exception 'exclusao de disciplina restrita a quem pode criar disciplina'
      using errcode = '42501';
  end if;

  select d.codigo, d.curso_id into v_codigo, v_curso_id
    from public.disciplinas d where d.id = p_disciplina_id;
  if not found then
    raise exception 'disciplina inexistente' using errcode = 'P0002';
  end if;

  if not app.alcanca_curso(v_curso_id) then
    raise exception 'disciplina fora do escopo' using errcode = '42501';
  end if;

  if exists (select 1 from public.turma_disciplina t where t.disciplina_id = p_disciplina_id) then
    v_impedimentos := array_append(v_impedimentos, 'linha_de_turma');
  end if;

  if exists (select 1 from public.instrutor_disciplina v where v.disciplina_id = p_disciplina_id) then
    v_impedimentos := array_append(v_impedimentos, 'vinculo_de_habilitacao');
  end if;

  if exists (select 1 from public.avaliacoes a where a.disciplina_id = p_disciplina_id) then
    v_impedimentos := array_append(v_impedimentos, 'avaliacao');
  end if;

  if exists (select 1 from public.planejamento_anual p where p.disciplina_id = p_disciplina_id) then
    v_impedimentos := array_append(v_impedimentos, 'planejamento');
  end if;

  if exists (select 1 from public.unidades_ensino u where u.disciplina_id = p_disciplina_id) then
    v_impedimentos := array_append(v_impedimentos, 'unidade_de_ensino');
  end if;

  if exists (select 1
               from public.registros_aula r
               join public.unidades_ensino u on u.id = r.unidade_ensino_id
              where u.disciplina_id = p_disciplina_id)
     or exists (select 1 from public.registros_aula r
                 where r.disciplina_codigo_legado_v1 = v_codigo) then
    v_impedimentos := array_append(v_impedimentos, 'aula_lancada');
  end if;

  return v_impedimentos;
end;
$$;

comment on function app.impedimentos_de_exclusao_da_disciplina(uuid) is
  'O que prende a disciplina. Vazio = registro sem historico. Porteiro: '
  '`app.pode(disciplinas, criar)` + alcance do curso (FR-021). ⚠️ `aula_lancada` olha '
  'TAMBEM `registros_aula.disciplina_codigo_legado_v1`, que nao e FK — sem isso a '
  'disciplina com aula historica seria excluivel (achado A-11 da spec 010).';

create or replace function app.impedimentos_de_exclusao_da_unidade_ensino(p_unidade_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_curso_id     uuid;
  v_impedimentos text[] := array[]::text[];
begin
  if not app.pode('disciplinas', 'criar') then
    raise exception 'exclusao de unidade de ensino restrita a quem pode criar disciplina'
      using errcode = '42501';
  end if;

  select u.curso_id into v_curso_id from public.unidades_ensino u where u.id = p_unidade_id;
  if not found then
    raise exception 'unidade de ensino inexistente' using errcode = 'P0002';
  end if;

  if not app.alcanca_curso(v_curso_id) then
    raise exception 'unidade de ensino fora do escopo' using errcode = '42501';
  end if;

  if exists (select 1 from public.registros_aula r where r.unidade_ensino_id = p_unidade_id) then
    v_impedimentos := array_append(v_impedimentos, 'aula_lancada');
  end if;

  return v_impedimentos;
end;
$$;

comment on function app.impedimentos_de_exclusao_da_unidade_ensino(uuid) is
  'O que prende a UE: aula lancada. UE com aula NUNCA e excluida, so desativada — ela e o '
  'grao do fato de execucao (decisao UE-1, 26/08/2026).';

alter table public.exclusoes_registradas drop constraint exclusoes_tabela_permitida;
alter table public.exclusoes_registradas add constraint exclusoes_tabela_permitida
  check (tabela in ('instrutores', 'disciplinas', 'unidades_ensino'));
