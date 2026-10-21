-- =================================================================================
-- Spec 021 · Bloco 6 — PR 2, M5: os HORÁRIOS passam a ser do CURRÍCULO
-- Data local: 21/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- Emenda à RC-1, decisão nominal de Bernardo Villas Boas na conferência do PR #82 (21/10/2026):
--   *"HORÁRIOS PASSAM A SER DO CURRÍCULO: os regimes nomeados (Bloco 3) de cada curso vão para o currículo 1 dele;
--   currículo novo copia e edita os seus; a turma escolhe regime entre os do currículo DELA. Migration que altera:
--   AUTORIZADA, com a prova de sempre na cópia do remoto."*
--
-- ⚠️ ALTERA (regra 9.4), autorizada: o que muda em `regimes_de_horario` e nas regras em volta.
--   1. `regimes_de_horario.curriculo_id` e `linhagem_id`: cada regime vai para o currículo 1 do seu curso (preenchimento
--      estrutural, sem os gatilhos de negócio, como a M2); o regime não muda de currículo depois (o guarda o recusa).
--   2. O nome do regime é único entre os ATIVOS do CURRÍCULO (era: do curso) — o currículo novo copia os nomes.
--   3. Sem `curriculo_id`, o regime vai para o único currículo ativo do curso (`app.versao_unica_do_curso`, como a
--      disciplina); com mais de um, quem grava diz qual.
--   4. A turma só aponta regime do currículo DELA (FK composta), e a troca de currículo leva o regime pelo
--      correspondente (a mesma linhagem); sem correspondente ativo, a turma volta ao regime vigente do curso (nulo).
--   5. A cópia (`public.criar_curriculo`, RC-7) passa a copiar os regimes ativos.
--   6. RC-6: o regime do currículo seguido por turma com lançamento entra na correção com justificativa (o gatilho da M4
--      e a trilha passam a aceitar a tabela). O RF-HOR-05 (o relógio do regime usado por turma lançada não muda)
--      continua valendo por cima.
-- ⚠️ Nada muda no que a tela mostra: hoje todo regime é do currículo 1 e toda turma segue o currículo 1 — provado na cópia
--    do remoto (DSA, papel, planilha e páginas), `specs/021-…/antes-depois.md`.
--
-- Reversão: `specs/021-bloco-6-curriculo-versionado/reversao-pr2.sql` (a parte da M5 primeiro).
-- =================================================================================

-- ---------------------------------------------------------------- 1. as colunas e o preenchimento
alter table public.regimes_de_horario add column curriculo_id uuid, add column linhagem_id uuid;
comment on column public.regimes_de_horario.curriculo_id is
  'Bloco 6 (emenda à RC-1, 21/10/2026): o currículo deste regime. Cada currículo tem os seus horários; o currículo novo '
  'copia os do vigente. Não muda depois de gravado.';
comment on column public.regimes_de_horario.linhagem_id is
  'Bloco 6: o mesmo regime em currículos diferentes (a cópia herda a linhagem). É por ela que a troca de currículo da '
  'turma leva o regime escolhido.';

-- ⚠️ SEM OS GATILHOS DE NEGÓCIO (o guarda, a auditoria): o preenchimento é estrutural e não carimba ninguém.
alter table public.regimes_de_horario disable trigger user;
update public.regimes_de_horario r
   set curriculo_id = c.id, linhagem_id = r.id
  from public.curriculos c
 where c.curso_id = r.curso_id and c.versao = 1;
alter table public.regimes_de_horario enable trigger user;

alter table public.regimes_de_horario
  alter column curriculo_id set not null,
  alter column linhagem_id set not null,
  alter column linhagem_id set default gen_random_uuid(),
  add constraint regimes_de_horario_do_curriculo_do_curso_fk
    foreign key (curriculo_id, curso_id) references public.curriculos (id, curso_id) on delete restrict,
  -- O alvo da FK composta da turma: o regime e o currículo dele.
  add constraint regimes_de_horario_id_curriculo_key unique (id, curriculo_id);
create index regimes_de_horario_curriculo_idx on public.regimes_de_horario (curriculo_id);
create index regimes_de_horario_linhagem_idx on public.regimes_de_horario (linhagem_id);

-- ---------------------------------------------------------------- 2. o nome, único no currículo
drop index public.regimes_de_horario_nome_ativo_uq;
create unique index regimes_de_horario_nome_ativo_uq
  on public.regimes_de_horario (curriculo_id, lower(btrim(nome))) where status = 'ativo';

-- ---------------------------------------------------------------- 3. sem currículo, o único ativo do curso
create trigger trg_regimes_de_horario_versao before insert on public.regimes_de_horario
  for each row execute function app.versao_unica_do_curso();

-- O guarda do regime (Bloco 3) passa a recusar também a troca de currículo e de linhagem: o regime nasce num currículo e
-- fica nele. O resto do corpo é o de `20261020025815`.
create or replace function app.guardar_regime_de_horario()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.curso_id is distinct from old.curso_id
     or new.codigo is distinct from old.codigo
     or new.regime_tempos is distinct from old.regime_tempos
     or new.ta_duracao_min is distinct from old.ta_duracao_min then
    raise exception 'A quantidade de TA por dia e a duracao do TA decorrem do curriculo e nao mudam (RF-HOR-02).'
      using errcode = '23514', hint = 'regime_curricular_imutavel';
  end if;

  if new.curriculo_id is distinct from old.curriculo_id or new.linhagem_id is distinct from old.linhagem_id then
    raise exception 'O regime de horario pertence ao seu curriculo e nao muda de curriculo.'
      using errcode = '23514', hint = 'regime_curricular_imutavel';
  end if;

  if (new.hora_inicio_manha, new.hora_inicio_tarde, new.intervalo_manha_min, new.intervalo_tarde_min,
      new.configuracao_horario_id)
     is distinct from
     (old.hora_inicio_manha, old.hora_inicio_tarde, old.intervalo_manha_min, old.intervalo_tarde_min,
      old.configuracao_horario_id)
     and app.regime_em_uso_com_lancamento(old.id) then
    raise exception 'O horario deste regime nao muda: uma turma que o usa ja tem lancamento (RF-HOR-05).'
      using errcode = '23514', hint = 'regime_em_uso_com_lancamento';
  end if;

  -- ⚠️ A policy não vê OLD (gotcha 4): inativar e reativar exigem `horarios.desativar`, conferido aqui. Gotcha 15.
  if new.status is distinct from old.status
     and coalesce(app.pode('horarios', 'desativar'), false) is not true then
    raise exception 'Inativar ou reativar regime de horario exige a permissao de desativar horarios.'
      using errcode = '42501', hint = 'sem_permissao_de_desativar';
  end if;
  return new;
end;
$$;
revoke all on function app.guardar_regime_de_horario() from public, anon, authenticated;

-- ---------------------------------------------------------------- 4. a turma e o regime do currículo dela
-- Os dados de hoje já cumprem (todo regime e toda turma no currículo 1 do curso); a M5 confere no fim.
alter table public.turmas add constraint turmas_regime_do_proprio_curriculo_fk
  foreign key (regime_de_horario_id, curriculo_id) references public.regimes_de_horario (id, curriculo_id)
  on delete restrict;

-- O correspondente de um regime noutro currículo: a mesma linhagem, ativo. Fora do gatilho de `turmas`, porque nenhum
-- gatilho de turmas decide pela palavra da situação (guarda de ausência dos pgTAP 101 e 138).
create or replace function app.regime_correspondente(p_regime uuid, p_curriculo uuid)
returns uuid
language sql
stable security definer
set search_path = pg_catalog, public
as $$
  select r_nova.id
    from public.regimes_de_horario r_velho
    join public.regimes_de_horario r_nova on r_nova.linhagem_id = r_velho.linhagem_id
   where r_velho.id = p_regime and r_nova.curriculo_id = p_curriculo and r_nova.status = 'ativo'
   limit 1;
$$;
revoke all on function app.regime_correspondente(uuid, uuid) from public, anon, authenticated;

-- A troca de currículo da turma (só sem lançamento, `app.guardar_curriculo_da_turma`) leva o regime escolhido pelo
-- correspondente; sem ele, a turma volta ao regime vigente do curso. Roda DEPOIS de `trg_turmas_curriculo` (ordem
-- alfabética), que já decidiu o currículo — inclusive o da turma que muda de curso.
create or replace function app.regime_do_curriculo_da_turma()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.regime_de_horario_id is null or new.curriculo_id is not distinct from old.curriculo_id then
    return new;
  end if;
  if exists (select 1 from public.regimes_de_horario r
              where r.id = new.regime_de_horario_id and r.curriculo_id = new.curriculo_id) then
    return new;   -- quem gravou já escolheu um regime do currículo novo
  end if;
  new.regime_de_horario_id := app.regime_correspondente(new.regime_de_horario_id, new.curriculo_id);
  return new;
end;
$$;
revoke all on function app.regime_do_curriculo_da_turma() from public, anon, authenticated;
create trigger trg_turmas_curriculo_regime before update on public.turmas
  for each row execute function app.regime_do_curriculo_da_turma();

-- ---------------------------------------------------------------- 5. a cópia leva os regimes
create or replace function public.criar_curriculo(
  p_curso_id uuid,
  p_vigente_de date,
  p_descricao text,
  p_hoje date
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_origem    uuid;
  v_nova      uuid := gen_random_uuid();
  v_versao    smallint;
  v_mais_novo date;
begin
  if coalesce(app.pode('cursos', 'editar'), false) is not true
     or coalesce(app.alcanca_curso(p_curso_id), false) is not true
     or coalesce(app.curso_em_oferta(p_curso_id), false) is not true then
    raise exception 'O seu perfil não cria currículo neste curso.'
      using errcode = '42501', hint = 'curriculo_sem_permissao';
  end if;
  if p_vigente_de is null or p_hoje is null then
    raise exception 'Informe a partir de quando o currículo novo vale.'
      using errcode = '23502', hint = 'curriculo_sem_vigencia';
  end if;

  select max(c.vigente_de) into v_mais_novo
    from public.curriculos c where c.curso_id = p_curso_id and c.status = 'ativo';
  if v_mais_novo is not null and v_mais_novo > p_hoje then
    raise exception 'O curso já tem um currículo futuro (a partir de %): edite-o em vez de criar outro.',
                    to_char(v_mais_novo, 'DD/MM/YYYY')
      using errcode = '23514', hint = 'ja_ha_curriculo_futuro';
  end if;
  if v_mais_novo is not null and p_vigente_de <= v_mais_novo then
    raise exception 'O currículo novo tem de começar depois do mais novo que o curso já tem (a partir de %).',
                    to_char(v_mais_novo, 'DD/MM/YYYY')
      using errcode = '23514', hint = 'curriculo_antes_do_mais_novo';
  end if;

  v_origem := app.curriculo_vigente(p_curso_id, p_hoje);
  if v_origem is null then
    raise exception 'O curso não tem currículo vigente para copiar.'
      using errcode = '23514', hint = 'curriculo_sem_vigente';
  end if;

  select coalesce(max(c.versao), 0) + 1 into v_versao from public.curriculos c where c.curso_id = p_curso_id;

  insert into public.curriculos (id, curso_id, versao, vigente_de, descricao, proposito, duracao_semanas, duracao_dias,
                                 curriculo_modelo, copiada_de)
  select v_nova, p_curso_id, v_versao, p_vigente_de, nullif(btrim(p_descricao), ''), o.proposito, o.duracao_semanas,
         o.duracao_dias, o.curriculo_modelo, o.id
    from public.curriculos o where o.id = v_origem;

  drop table if exists pg_temp._mapa_disciplina, pg_temp._mapa_ue;
  create temporary table _mapa_disciplina on commit drop as
    select d.id as antiga, gen_random_uuid() as nova
      from public.disciplinas d
     where d.curriculo_id = v_origem and d.status = 'ativo';

  -- `semanas`, `ch_semanal` e `nome_normalizado` são GERADAS: vêm junto, sem ser copiadas.
  insert into public.disciplinas (
    id, curso_id, curriculo_id, linhagem_id, cod_disciplina, nome_disciplina, carga_horaria_tempos, ordem_sugerida,
    prioridade_alocacao_peso, previsao_inicio, previsao_termino, modo_atribuicao_padrao, tecnica_ensino_sugerida,
    local_padrao, sem_unidades_ensino, nome_no_dsa)
  select m.nova, d.curso_id, v_nova, d.linhagem_id, d.cod_disciplina, d.nome_disciplina, d.carga_horaria_tempos,
         d.ordem_sugerida, d.prioridade_alocacao_peso, d.previsao_inicio, d.previsao_termino,
         d.modo_atribuicao_padrao, d.tecnica_ensino_sugerida, d.local_padrao, d.sem_unidades_ensino, d.nome_no_dsa
    from _mapa_disciplina m join public.disciplinas d on d.id = m.antiga;

  create temporary table _mapa_ue on commit drop as
    select u.id as antiga, gen_random_uuid() as nova, m.nova as disciplina_nova
      from public.unidades_ensino u join _mapa_disciplina m on m.antiga = u.disciplina_id
     where u.status = 'ativo';

  insert into public.unidades_ensino (
    id, disciplina_id, curso_id, linhagem_id, numero_ue, topico, ch_prevista_tempos, tecnica_ensino_sugerida,
    fundamento_normativo)
  select mu.nova, mu.disciplina_nova, u.curso_id, u.linhagem_id, u.numero_ue, u.topico, u.ch_prevista_tempos,
         u.tecnica_ensino_sugerida, u.fundamento_normativo
    from _mapa_ue mu join public.unidades_ensino u on u.id = mu.antiga;

  insert into public.avaliacoes_curriculo (
    disciplina_id, curso_id, linhagem_id, ordem, instrumento_id, numero, unidade_ensino_id, origem_ue, ue_decidida_em,
    ues_abordadas, ta_aplicacao, origem_ta_aplicacao, ta_vista, origem_ta_vista, origem_item, fonte_arquivo,
    fonte_pagina)
  select m.nova, a.curso_id, a.linhagem_id, a.ordem, a.instrumento_id, a.numero, mu.nova, a.origem_ue,
         a.ue_decidida_em, a.ues_abordadas, a.ta_aplicacao, a.origem_ta_aplicacao, a.ta_vista, a.origem_ta_vista,
         a.origem_item, a.fonte_arquivo, a.fonte_pagina
    from public.avaliacoes_curriculo a
    join _mapa_disciplina m on m.antiga = a.disciplina_id
    left join _mapa_ue mu on mu.antiga = a.unidade_ensino_id
   where a.status = 'ativo';

  insert into public.limites_curriculo (curso_id, curriculo_id, categoria, tempos, fonte_arquivo, fonte_pagina)
  select l.curso_id, v_nova, l.categoria, l.tempos, l.fonte_arquivo, l.fonte_pagina
    from public.limites_curriculo l
   where l.curriculo_id = v_origem and l.status = 'ativo';

  insert into public.avaliacoes_planejadas (codigo, curso_id, curriculo_id, nome_disciplina, descricao_instrumentos,
                                            formula_mf, carater, observacoes)
  select a.codigo || '#C' || v_versao, a.curso_id, v_nova, a.nome_disciplina, a.descricao_instrumentos, a.formula_mf,
         a.carater, a.observacoes
    from public.avaliacoes_planejadas a
   where a.curriculo_id = v_origem and a.status = 'ativo';

  insert into public.instrutor_disciplina (instrutor_id, disciplina_id, modo_atribuicao)
  select v.instrutor_id, m.nova, v.modo_atribuicao
    from public.instrutor_disciplina v join _mapa_disciplina m on m.antiga = v.disciplina_id
   where v.status = 'ativo';

  -- Emenda de 21/10/2026 à RC-1: os HORÁRIOS são do currículo — os regimes nomeados ativos, com a linhagem do original
  -- (a troca de currículo da turma leva o regime dela pelo correspondente).
  insert into public.regimes_de_horario (curso_id, curriculo_id, linhagem_id, nome, regime_tempos, ta_duracao_min,
                                         intervalo_manha_min, intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde,
                                         configuracao_horario_id, observacao)
  select r.curso_id, v_nova, r.linhagem_id, r.nome, r.regime_tempos, r.ta_duracao_min, r.intervalo_manha_min,
         r.intervalo_tarde_min, r.hora_inicio_manha, r.hora_inicio_tarde, r.configuracao_horario_id, r.observacao
    from public.regimes_de_horario r
   where r.curriculo_id = v_origem and r.status = 'ativo';

  return v_nova;
end;
$$;
revoke all on function public.criar_curriculo(uuid, date, text, date) from public, anon;
grant execute on function public.criar_curriculo(uuid, date, text, date) to authenticated;
comment on function public.criar_curriculo(uuid, date, text, date) is
  'Bloco 6 (spec 021, RC-7 e RC-2): cria o currículo N+1 do curso como cópia do vigente em `p_hoje` — o conteúdo da '
  'RC-1, disciplinas, UEs, avaliações do currículo, limites, regras de avaliação, habilitações e regimes de horário '
  'ativos, com a linhagem '
  'da original. Começa depois do mais novo; não cria um segundo futuro. Porteiro: cursos.editar, alcance e oferta.';

-- ---------------------------------------------------------------- 6. RC-6 nos horários do currículo em uso
alter table public.correcoes_de_curriculo drop constraint correcoes_de_curriculo_tabela_check;
alter table public.correcoes_de_curriculo add constraint correcoes_de_curriculo_tabela_check
  check (tabela in ('curriculos', 'disciplinas', 'unidades_ensino', 'avaliacoes_curriculo', 'limites_curriculo',
                    'avaliacoes_planejadas', 'regimes_de_horario'));
create trigger trg_regimes_de_horario_curriculo_em_uso before insert or update on public.regimes_de_horario
  for each row execute function app.guardar_curriculo_em_uso();

-- ---------------------------------------------------------------- 7. a conferência, dentro da migration
do $$
declare
  v_falhas text := '';
begin
  if exists (select 1 from public.regimes_de_horario r join public.curriculos c on c.id = r.curriculo_id
              where c.curso_id <> r.curso_id or c.versao <> 1) then
    v_falhas := v_falhas || ' regime fora do currículo 1 do seu curso;';
  end if;
  if exists (select 1 from public.turmas t join public.regimes_de_horario r on r.id = t.regime_de_horario_id
              where r.curriculo_id <> t.curriculo_id) then
    v_falhas := v_falhas || ' turma com regime de outro currículo;';
  end if;
  if v_falhas <> '' then
    raise exception 'Os horários não passaram ao currículo:%', v_falhas;
  end if;
end;
$$;
