-- =================================================================================
-- Spec 021 · Bloco 6 — a REVERSÃO do PR 2: desfaz a M5 (`20261021201915`), a M4 (`20261021124838`) e depois a M3
-- (`20261021124836`), nessa ordem.
--
-- ⚠️ ANTES de rodar: nenhum currículo além do 1 (os currículos novos, as disciplinas, UEs e avaliações copiadas e as
--    turmas que os seguem saem antes, pelo caminho que a decisão da reversão disser — não por este script), e o PDF de
--    cada currículo 1 no lugar do Bloco 5 (`<curso>/curriculo.pdf`): o código antigo lê só esse caminho.
-- ⚠️ A TRILHA SAI COM A TABELA: `correcoes_de_curriculo` é só de acréscimo (os gatilhos recusam UPDATE, DELETE e
--    TRUNCATE), mas `drop table` não passa por eles. Guardar a trilha antes (`pg_dump -t`) é a decisão de quem reverte;
--    o que ela registrou deixa de existir no banco.
-- ⚠️ Os arquivos novos do balde (`<curso>/<currículo>/<instante>.pdf`) FICAM — regra 4, sem `DELETE`; sem a policy de
--    INSERT, ninguém acrescenta outro.
-- =================================================================================
begin;

-- ── M5: os horários do currículo (`20261021201915`) — desfeita PRIMEIRO ──
-- ⚠️ ANTES: nenhum regime fora do currículo 1 (a cópia leva os regimes; os do currículo novo saem com ele), senão o
--    índice do nome por curso volta com nomes repetidos e a reversão para no `create unique index`.
drop trigger if exists trg_regimes_de_horario_curriculo_em_uso on public.regimes_de_horario;
alter table public.correcoes_de_curriculo drop constraint correcoes_de_curriculo_tabela_check;
alter table public.correcoes_de_curriculo add constraint correcoes_de_curriculo_tabela_check
  check (tabela in ('curriculos', 'disciplinas', 'unidades_ensino', 'avaliacoes_curriculo', 'limites_curriculo',
                    'avaliacoes_planejadas'));
drop trigger if exists trg_turmas_curriculo_regime on public.turmas;
drop function if exists app.regime_do_curriculo_da_turma();
drop function if exists app.regime_correspondente(uuid, uuid);
alter table public.turmas drop constraint if exists turmas_regime_do_proprio_curriculo_fk;
drop trigger if exists trg_regimes_de_horario_versao on public.regimes_de_horario;
drop index if exists public.regimes_de_horario_nome_ativo_uq;
create unique index regimes_de_horario_nome_ativo_uq
  on public.regimes_de_horario (curso_id, lower(btrim(nome))) where status = 'ativo';
drop index if exists public.regimes_de_horario_linhagem_idx;
drop index if exists public.regimes_de_horario_curriculo_idx;
alter table public.regimes_de_horario
  drop constraint if exists regimes_de_horario_id_curriculo_key,
  drop constraint if exists regimes_de_horario_do_curriculo_do_curso_fk,
  drop column if exists linhagem_id,
  drop column if exists curriculo_id;

-- O guarda do regime, como o Bloco 3 o deixou (`20261020025815`).
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

-- A cópia, como a M3 a deixou (`20261021124836`): sem os regimes.
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

  return v_nova;
end;
$$;
revoke all on function public.criar_curriculo(uuid, date, text, date) from public, anon;
grant execute on function public.criar_curriculo(uuid, date, text, date) to authenticated;
comment on function public.criar_curriculo(uuid, date, text, date) is
  'Bloco 6 (spec 021, RC-7 e RC-2): cria o currículo N+1 do curso como cópia do vigente em `p_hoje` — o conteúdo da '
  'RC-1, disciplinas, UEs, avaliações do currículo, limites, regras de avaliação e habilitações ativas, com a linhagem '
  'da original. Começa depois do mais novo;


-- ── M4: a correção do currículo em uso, a matriz e a policy do balde ──
drop policy if exists curriculos_carregar_por_curriculo on storage.objects;
drop trigger if exists trg_curriculos_curriculo_em_uso on public.curriculos;
drop trigger if exists trg_disciplinas_curriculo_em_uso on public.disciplinas;
drop trigger if exists trg_unidades_ensino_curriculo_em_uso on public.unidades_ensino;
drop trigger if exists trg_avaliacoes_curriculo_em_uso on public.avaliacoes_curriculo;
drop trigger if exists trg_limites_curriculo_em_uso on public.limites_curriculo;
drop trigger if exists trg_avaliacoes_planejadas_curriculo_em_uso on public.avaliacoes_planejadas;
drop function if exists app.guardar_curriculo_em_uso();
delete from public.perfil_permissao where recurso in ('correcao_de_curriculo', 'arquivamento_de_curriculo');

-- ── M3: a cópia, o arquivamento, a justificativa, a trilha e o caminho do PDF ──
drop function if exists public.desarquivar_curriculo(uuid);
drop function if exists public.arquivar_curriculo(uuid, date);
drop function if exists public.criar_curriculo(uuid, date, text, date);
drop function if exists app.justificativa_de_correcao();
drop table if exists public.correcoes_de_curriculo;
drop function if exists app.correcoes_de_curriculo_imutaveis();
revoke update (pdf_caminho) on public.curriculos from authenticated;
alter table public.curriculos drop column if exists pdf_caminho;

commit;
