-- =================================================================================
-- Migration 7 de 7 — Epico 5, fatia (a): curso inativo
-- (carimbo do arquivo em UTC; o relogio da maquina marcava 18/09/2026)
--
-- O QUE  : A. curso inativo continua ALCANCAVEL, e as 30 policies de escrita das 15 tabelas que
--             dependem dele ganham a condicao de OFERTA;
--          B. a guarda da situacao — desativar exige permissao e nenhuma turma pendente; reativar
--             e so a situacao, decidida POR VALOR;
--          C. `sincronizar_habilitacoes` convive com curso inativo.
--
-- ORIGEM : FR-017 a FR-017.9, FR-046 · spec `009-cursos-e-turmas` · R-1, R-2, R-3.
--
-- ⚠️ DESATIVAR NAO E ESCONDER (FR-017.1). `app.cursos_do_usuario()` perde o filtro de situacao nos
--    tres ramos: quem alcanca o curso continua alcancando depois de desativado — a ficha abre, o
--    historico aparece, os relatorios contam. O que muda e que ele **nao recebe escrita nova**.
--    Esconder seria a pior das duas coisas: o dado continua la e ninguem o encontra.
--
-- ⚠️ E `cursos` NAO recebe a condicao, de proposito. Se a policy de edicao de `cursos` recusasse
--    escrita em curso inativo, o curso ficaria IRREATIVAVEL — `inativo` seria estado absorvente, e
--    so uma migration tiraria o curso de la. A excecao cirurgica mora no GATILHO (parte B), que
--    decide POR VALOR: a unica coluna com valor diferente pode ser `status`.
--
-- ⚠️ POR VALOR, E NAO POR COLUNA ENVIADA — e essa e a diferenca que faz a regra funcionar no mundo
--    real. Formulario reenvia a linha INTEIRA; uma regra escrita em termos de "so a coluna `status`
--    pode vir no UPDATE" recusaria toda reativacao feita pela tela. A comparacao e sobre a linha
--    inteira MENOS `status`, o quarteto de auditoria e `nome_normalizado` — que e coluna GERADA e,
--    num gatilho `BEFORE`, ainda nao foi recalculada.
--
-- ⚠️ E A COMPLETUDE DAS POLICIES SE PROVA POR ENUMERACAO (105_curso_inativo.sql). O risco nao e uma
--    policy quebrar: e uma FICAR DE FORA, e a tabela seguir aceitando escrita em curso inativo sem
--    erro nenhum. Tabela nova que dependa do curso entra na lista do `105` e aqui, JUNTAS.
-- =================================================================================

-- =================================================================================
-- PARTE A — alcance sem filtro, e a condicao de oferta
-- =================================================================================

create or replace function app.cursos_do_usuario()
returns setof uuid
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_usuario uuid                  := app.usuario_atual();
  v_perfil  public.perfil_usuario := app.perfil_atual();
  v_escopo  public.escopo_curso;
begin
  if v_usuario is null or v_perfil is null then
    return;                       -- conjunto vazio: nenhum curso alcançado
  end if;

  -- 1. Perfis de alcance institucional total.
  -- ⚠️ SEM `c.status = 'ativo'` (FR-017.1, 18/09/2026): desativar tira de oferta, nao de vista.
  if v_perfil in ('admin', 'chefe_departamento_ensino', 'visualizacao',
                  'encarregado_administracao_academica', 'ajudante_administracao_academica',
                  'encarregado_orientacao_pedagogica',  'ajudante_orientacao_pedagogica') then
    return query select c.id from public.cursos c;
    return;
  end if;

  -- 2. Encarregado de Curso: restrito ao(s) curso(s) sob coordenação (N:N). Este ramo NUNCA teve
  --    filtro de situação — ele resolve por `usuario_curso`.
  if v_perfil = 'encarregado_curso' then
    return query
      select uc.curso_id
        from public.usuario_curso uc
       where uc.usuario_id = v_usuario
         and uc.status = 'ativo';
    return;
  end if;

  -- 3. Operador: recorte por escopo de curso, tambem sem filtro de situacao.
  if v_perfil = 'operador' then
    select u.escopo_curso into v_escopo from public.usuarios u where u.id = v_usuario;

    if v_escopo is null or v_escopo = 'geral' then
      return query select c.id from public.cursos c;
    else
      return query
        select c.id from public.cursos c
         where c.classificacao = v_escopo;
    end if;
    return;
  end if;

  return;
exception when undefined_table then
  return;                          -- migration de autenticação ainda não aplicada
end;
$$;

comment on function app.cursos_do_usuario() is
  'FR-017.1: os cursos que a pessoa alcanca, SEM filtro de situacao nos tres ramos — curso inativo '
  'continua legivel e alcancavel no escopo. Quem tira curso inativo de LISTA DE ESCOLHA e cada tela, '
  'explicitamente (FR-017.6); quem impede ESCRITA nele e a condicao de oferta nas policies.';

create or replace function app.curso_em_oferta(p_curso_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  -- ⚠️ NULO E VERDADEIRO: `curso_id` nulo e a sentinela `GERAL` (achado 4 do Epico 2) — nao ha
  --    curso a estar fora de oferta, e recusar ali seria inventar regra.
  select p_curso_id is null
      or exists (select 1 from public.cursos c where c.id = p_curso_id and c.status = 'ativo');
$$;

create or replace function app.turma_em_oferta(p_turma_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  -- ⚠️ NULO E VERDADEIRO: atividade de escopo global nao tem turma (FR-014 do Epico 1).
  select p_turma_id is null
      or exists (
        select 1 from public.turmas t
          join public.cursos c on c.id = t.curso_id
         where t.id = p_turma_id and c.status = 'ativo'
      );
$$;

create or replace function app.disciplina_em_oferta(p_disciplina_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p_disciplina_id is null
      or exists (
        select 1 from public.disciplinas d
          join public.cursos c on c.id = d.curso_id
         where d.id = p_disciplina_id and c.status = 'ativo'
      );
$$;

comment on function app.curso_em_oferta(uuid) is
  'FR-017.5: o curso existe e esta ATIVO. Nulo devolve verdadeiro — e a sentinela GERAL. '
  'SECURITY DEFINER para responder igual a quem le e a quem nao le o curso: a pergunta e sobre a '
  'situacao do curso, nao sobre o alcance de quem pergunta, que a policy ja confere a parte.';

revoke all on function app.curso_em_oferta(uuid) from public, anon;
revoke all on function app.turma_em_oferta(uuid) from public, anon;
revoke all on function app.disciplina_em_oferta(uuid) from public, anon;
grant execute on function app.curso_em_oferta(uuid) to authenticated, service_role;
grant execute on function app.turma_em_oferta(uuid) to authenticated, service_role;
grant execute on function app.disciplina_em_oferta(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------- as 30 policies, tabela por tabela
-- turmas
drop policy turmas_criar on public.turmas;
create policy turmas_criar on public.turmas for insert to authenticated
  with check (app.pode('turmas','criar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));
drop policy turmas_editar on public.turmas;
create policy turmas_editar on public.turmas for update to authenticated
  using (app.pode('turmas','editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id))
  with check (app.pode('turmas','editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));

-- curso_regime_historico
drop policy curso_regime_historico_criar on public.curso_regime_historico;
create policy curso_regime_historico_criar on public.curso_regime_historico for insert to authenticated
  with check (app.pode('horarios','criar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));
drop policy curso_regime_historico_editar on public.curso_regime_historico;
create policy curso_regime_historico_editar on public.curso_regime_historico for update to authenticated
  using (app.pode('horarios','editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id))
  with check (app.pode('horarios','editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));

-- responsaveis_curso
drop policy responsaveis_curso_criar on public.responsaveis_curso;
create policy responsaveis_curso_criar on public.responsaveis_curso for insert to authenticated
  with check (app.pode('cursos','editar') and (curso_id is null or app.alcanca_curso(curso_id))
              and app.curso_em_oferta(curso_id));
drop policy responsaveis_curso_editar on public.responsaveis_curso;
create policy responsaveis_curso_editar on public.responsaveis_curso for update to authenticated
  using (app.pode('cursos','editar') and (curso_id is null or app.alcanca_curso(curso_id))
         and app.curso_em_oferta(curso_id))
  with check (app.pode('cursos','editar') and (curso_id is null or app.alcanca_curso(curso_id))
              and app.curso_em_oferta(curso_id));

-- disciplinas
drop policy disciplinas_criar on public.disciplinas;
create policy disciplinas_criar on public.disciplinas for insert to authenticated
  with check (app.pode('disciplinas','criar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));
drop policy disciplinas_editar on public.disciplinas;
create policy disciplinas_editar on public.disciplinas for update to authenticated
  using (app.pode('disciplinas','editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id))
  with check (app.pode('disciplinas','editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));

-- unidades_ensino
drop policy unidades_ensino_criar on public.unidades_ensino;
create policy unidades_ensino_criar on public.unidades_ensino for insert to authenticated
  with check (app.pode('disciplinas','criar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));
drop policy unidades_ensino_editar on public.unidades_ensino;
create policy unidades_ensino_editar on public.unidades_ensino for update to authenticated
  using (app.pode('disciplinas','editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id))
  with check (app.pode('disciplinas','editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));

-- avaliacoes_planejadas
drop policy avaliacoes_planejadas_criar on public.avaliacoes_planejadas;
create policy avaliacoes_planejadas_criar on public.avaliacoes_planejadas for insert to authenticated
  with check (app.pode('avaliacoes','editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));
drop policy avaliacoes_planejadas_editar on public.avaliacoes_planejadas;
create policy avaliacoes_planejadas_editar on public.avaliacoes_planejadas for update to authenticated
  using (app.pode('avaliacoes','editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id))
  with check (app.pode('avaliacoes','editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));

-- registros_aula
drop policy registros_aula_criar on public.registros_aula;
create policy registros_aula_criar on public.registros_aula for insert to authenticated
  with check (app.pode('registros_aula','criar') and app.alcanca_turma(turma_id) and app.curso_em_oferta(curso_id));
drop policy registros_aula_editar on public.registros_aula;
create policy registros_aula_editar on public.registros_aula for update to authenticated
  using (app.pode('registros_aula','editar') and app.alcanca_turma(turma_id) and app.curso_em_oferta(curso_id))
  with check (app.pode('registros_aula','editar') and app.alcanca_turma(turma_id) and app.curso_em_oferta(curso_id));

-- avaliacoes
drop policy avaliacoes_criar on public.avaliacoes;
create policy avaliacoes_criar on public.avaliacoes for insert to authenticated
  with check (app.pode('avaliacoes','criar') and app.alcanca_turma(turma_id) and app.curso_em_oferta(curso_id));
drop policy avaliacoes_editar on public.avaliacoes;
create policy avaliacoes_editar on public.avaliacoes for update to authenticated
  using (app.pode('avaliacoes','editar') and app.alcanca_turma(turma_id) and app.curso_em_oferta(curso_id))
  with check (app.pode('avaliacoes','editar') and app.alcanca_turma(turma_id) and app.curso_em_oferta(curso_id));

-- janelas_curso
drop policy janelas_curso_criar on public.janelas_curso;
create policy janelas_curso_criar on public.janelas_curso for insert to authenticated
  with check (app.pode('calendario','criar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));
drop policy janelas_curso_editar on public.janelas_curso;
create policy janelas_curso_editar on public.janelas_curso for update to authenticated
  using (app.pode('calendario','editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id))
  with check (app.pode('calendario','editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));

-- planejamento_anual
drop policy planejamento_anual_criar on public.planejamento_anual;
create policy planejamento_anual_criar on public.planejamento_anual for insert to authenticated
  with check (app.pode('planejamento_anual','criar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));
drop policy planejamento_anual_editar on public.planejamento_anual;
create policy planejamento_anual_editar on public.planejamento_anual for update to authenticated
  using (app.pode('planejamento_anual','editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id))
  with check (app.pode('planejamento_anual','editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));

-- reservas_proens
drop policy reservas_proens_criar on public.reservas_proens;
create policy reservas_proens_criar on public.reservas_proens for insert to authenticated
  with check (app.pode('calendario','criar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));
drop policy reservas_proens_editar on public.reservas_proens;
create policy reservas_proens_editar on public.reservas_proens for update to authenticated
  using (app.pode('calendario','editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id))
  with check (app.pode('calendario','editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));

-- turma_disciplina
drop policy turma_disciplina_criar on public.turma_disciplina;
create policy turma_disciplina_criar on public.turma_disciplina for insert to authenticated
  with check (app.pode('disciplinas','editar') and app.alcanca_turma(turma_id) and app.turma_em_oferta(turma_id));
drop policy turma_disciplina_editar on public.turma_disciplina;
create policy turma_disciplina_editar on public.turma_disciplina for update to authenticated
  using (app.pode('disciplinas','editar') and app.alcanca_turma(turma_id) and app.turma_em_oferta(turma_id))
  with check (app.pode('disciplinas','editar') and app.alcanca_turma(turma_id) and app.turma_em_oferta(turma_id));

-- turma_disciplina_instrutor — chega a turma pela grade
drop policy tdi_criar on public.turma_disciplina_instrutor;
create policy tdi_criar on public.turma_disciplina_instrutor for insert to authenticated
  with check (app.pode('disciplinas','editar') and exists (
    select 1 from public.turma_disciplina td
     where td.id = turma_disciplina_instrutor.turma_disciplina_id
       and app.alcanca_turma(td.turma_id) and app.turma_em_oferta(td.turma_id)));
drop policy tdi_editar on public.turma_disciplina_instrutor;
create policy tdi_editar on public.turma_disciplina_instrutor for update to authenticated
  using (app.pode('disciplinas','editar') and exists (
    select 1 from public.turma_disciplina td
     where td.id = turma_disciplina_instrutor.turma_disciplina_id
       and app.alcanca_turma(td.turma_id) and app.turma_em_oferta(td.turma_id)))
  with check (app.pode('disciplinas','editar') and exists (
    select 1 from public.turma_disciplina td
     where td.id = turma_disciplina_instrutor.turma_disciplina_id
       and app.alcanca_turma(td.turma_id) and app.turma_em_oferta(td.turma_id)));

-- atividades_nao_letivas
drop policy atividades_nao_letivas_criar on public.atividades_nao_letivas;
create policy atividades_nao_letivas_criar on public.atividades_nao_letivas for insert to authenticated
  with check (app.pode('atividades_nao_letivas','criar') and app.alcanca_turma(turma_id)
              and (turma_id is not null or app.pode('atividades_globais','criar'))
              and app.turma_em_oferta(turma_id));
drop policy atividades_nao_letivas_editar on public.atividades_nao_letivas;
create policy atividades_nao_letivas_editar on public.atividades_nao_letivas for update to authenticated
  using (app.pode('atividades_nao_letivas','editar') and app.alcanca_turma(turma_id)
         and (turma_id is not null or app.pode('atividades_globais','criar'))
         and app.turma_em_oferta(turma_id))
  with check (app.pode('atividades_nao_letivas','editar') and app.alcanca_turma(turma_id)
              and (turma_id is not null or app.pode('atividades_globais','criar'))
              and app.turma_em_oferta(turma_id));

-- instrutor_disciplina
drop policy instrutor_disciplina_criar on public.instrutor_disciplina;
create policy instrutor_disciplina_criar on public.instrutor_disciplina for insert to authenticated
  with check (app.pode('instrutores','editar') and app.alcanca_disciplina(disciplina_id)
              and app.disciplina_em_oferta(disciplina_id));
drop policy instrutor_disciplina_editar on public.instrutor_disciplina;
create policy instrutor_disciplina_editar on public.instrutor_disciplina for update to authenticated
  using (app.pode('instrutores','editar') and app.alcanca_disciplina(disciplina_id)
         and app.disciplina_em_oferta(disciplina_id))
  with check (app.pode('instrutores','editar') and app.alcanca_disciplina(disciplina_id)
              and app.disciplina_em_oferta(disciplina_id));

-- =================================================================================
-- PARTE B — a guarda da situacao
-- =================================================================================

create or replace function app.guardar_situacao_do_curso()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_mudou    text[];
  v_pendentes jsonb;
begin
  -- ⚠️ A COMPARACAO E POR VALOR, SOBRE A LINHA INTEIRA MENOS tres coisas: `status` (que e o que se
  --    quer mudar), o quarteto de auditoria (que `app.set_auditoria()` escreve em toda edicao) e
  --    `nome_normalizado`, que e coluna GERADA e num gatilho BEFORE ainda nao foi recalculada.
  select coalesce(array_agg(chave order by chave), '{}')
    into v_mudou
    from jsonb_each_text(to_jsonb(new)) as n(chave, valor)
    join jsonb_each_text(to_jsonb(old)) as o(chave, valor) using (chave)
   where n.valor is distinct from o.valor
     and chave not in ('status', 'criado_por', 'criado_em', 'editado_por', 'editado_em',
                       'nome_normalizado');

  -- ------------------------------------------------------------------ mudou a situacao?
  if new.status is distinct from old.status then
    if not app.pode('cursos', 'desativar') then
      raise exception 'O seu perfil nao desativa nem reativa curso.'
        using errcode = '42501', hint = 'situacao_sem_permissao',
              detail = jsonb_build_object('curso', old.codigo)::text;
    end if;

    if new.status = 'inativo' then
      select jsonb_agg(jsonb_build_object('codigo', t.codigo, 'status', t.status))
        into v_pendentes
        from public.turmas t
       where t.curso_id = old.id and t.status in ('planejada', 'ativa');

      if v_pendentes is not null then
        raise exception 'Nao e possivel desativar: o curso tem turma planejada ou ativa.'
          using errcode = '23514', hint = 'curso_com_turma_pendente',
                detail = jsonb_build_object('curso', old.codigo, 'turmas', v_pendentes)::text;
      end if;
    end if;
  end if;

  -- ------------------------------------------------------------------ curso inativo so reativa
  -- ⚠️ E AQUI ESTA A EXCECAO CIRURGICA. Reenviar a linha inteira com os MESMOS valores passa —
  --    porque nenhuma coluna MUDOU DE VALOR. Mudar a situacao e mais alguma coisa, nao.
  if old.status = 'inativo' and v_mudou <> '{}' then
    raise exception 'O curso esta inativo. Reative-o antes de editar.'
      using errcode = '23514', hint = 'curso_inativo_so_reativa',
            detail = jsonb_build_object('curso', old.codigo, 'colunas', v_mudou)::text;
  end if;

  return new;
end;
$$;

comment on function app.guardar_situacao_do_curso() is
  'FR-017, FR-017.4, FR-017.7: desativar exige `cursos.desativar` e nenhuma turma planejada ou ativa '
  '(a recusa NOMEIA as turmas); curso inativo so aceita voltar a ativo, e a decisao e POR VALOR — '
  'reenviar a linha inteira com os mesmos valores passa, porque formulario reenvia tudo. '
  'SECURITY DEFINER para enxergar TODAS as turmas do curso, e nao so as que a RLS mostra a quem grava.';

revoke all on function app.guardar_situacao_do_curso() from public, anon, authenticated;

create trigger trg_cursos_guardar_situacao
  before update on public.cursos
  for each row execute function app.guardar_situacao_do_curso();

-- ⚠️ E CURSO NASCE ATIVO PELA SESSAO. A carga do ETL, que nao passa pela RLS, continua podendo
--    trazer curso inativo da v2.0 — que e historia, nao escrita nova.
drop policy cursos_criar on public.cursos;
create policy cursos_criar on public.cursos for insert to authenticated
  with check (app.pode('cursos', 'criar') and status = 'ativo');

-- =================================================================================
-- PARTE C — `sincronizar_habilitacoes` convive com curso inativo
-- =================================================================================
-- ⚠️ O R-2 previu que esta funcao quebraria NO PRIMEIRO CURSO DESATIVADO, e a previsao e precisa:
--    ela inativa habilitacoes POR DIFERENCA — tudo o que esta ativo e nao veio marcado —, e a
--    escrita em `instrutor_disciplina` de curso inativo passou a ser recusada pela policy. O
--    `v_esperado` contaria linhas que o `UPDATE` nao alcanca, e a funcao levantaria `42501`
--    dizendo *"o seu perfil nao alcanca todos os vinculos desmarcados"* — mensagem falsa: o perfil
--    alcanca, o curso e que saiu de oferta.
create or replace function public.sincronizar_habilitacoes(p_instrutor_id uuid, p_disciplinas uuid[])
returns jsonb
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_marcadas   uuid[] := array(
    select distinct d from unnest(coalesce(p_disciplinas, '{}'::uuid[])) as d where d is not null
  );
  v_inativas   jsonb;
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

  -- ⚠️ MARCAR disciplina de curso INATIVO e recusado com mensagem de negocio propria (FR-017.9).
  --    Sem esta recusa, a policy devolveria `42501` cru, que a tela traduziria como "sem permissao"
  --    — e o problema nao e de permissao, e de o curso estar fora de oferta.
  select jsonb_agg(d.nome_disciplina order by d.nome_disciplina)
    into v_inativas
    from unnest(v_marcadas) m
    join public.disciplinas d on d.id = m
   where not app.disciplina_em_oferta(m);

  if v_inativas is not null then
    raise exception 'Disciplina de curso inativo nao recebe habilitacao nova.'
      using errcode = '23514', hint = 'habilitacao_em_curso_inativo',
            detail = jsonb_build_object('disciplinas', v_inativas)::text;
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
  -- ⚠️ E DE CURSO EM OFERTA (FR-017.9, 18/09/2026): habilitacao em curso inativo e IGNORADA aqui —
  --    ela fica como esta, intacta. O passado nao se reescreve, e desmarcar o que nao se pode
  --    marcar seria pedir a funcao que apagasse historico por omissao.
  select count(*) into v_esperado
    from public.instrutor_disciplina v
    join public.disciplinas d on d.id = v.disciplina_id and d.status = 'ativo'
   where v.instrutor_id = p_instrutor_id
     and v.status = 'ativo'
     and not (v.disciplina_id = any (v_marcadas))
     and app.disciplina_em_oferta(v.disciplina_id);

  update public.instrutor_disciplina v
     set status = 'inativo'
    from public.disciplinas d
   where d.id = v.disciplina_id
     and d.status = 'ativo'
     and v.instrutor_id = p_instrutor_id
     and v.status = 'ativo'
     and not (v.disciplina_id = any (v_marcadas))
     and app.disciplina_em_oferta(v.disciplina_id);
  get diagnostics v_feito = row_count;
  if v_feito < v_esperado then
    raise exception 'o seu perfil nao alcanca todos os vinculos desmarcados' using errcode = '42501';
  end if;
  v_inativados := v_feito;

  return jsonb_build_object('criados', v_criados, 'reativados', v_reativados,
                            'inativados', v_inativados);
end;
$$;

revoke all on function public.sincronizar_habilitacoes(uuid, uuid[]) from public, anon;
grant execute on function public.sincronizar_habilitacoes(uuid, uuid[]) to authenticated, service_role;

-- =================================================================================
-- PLANO DE REVERSAO — ESCRITO E EXECUTADO em 18/09/2026, numa base descartavel (T058)
--
-- CONFERIDO DEPOIS DA REVERSAO: com a guarda e a condicao fora, criar disciplina num curso INATIVO
-- volta a ser ACEITO — sem erro, sem aviso —, e desativar curso deixa de exigir permissao. E o
-- buraco inteiro de volta, que e o que a reversao promete e o que ela custa.
--
--   -- C: volta a versao sem a conferencia de oferta (a da fatia (c));
--   -- B: drop trigger trg_cursos_guardar_situacao; `cursos_criar` sem `status = 'ativo'`;
--   --    drop function app.guardar_situacao_do_curso();
--   -- A: as 30 policies voltam sem a condicao; `app.cursos_do_usuario()` volta com
--   --    `c.status = 'ativo'` nos dois ramos; drop das tres funcoes de oferta.
--
-- ⚠️ REVERTER DEVOLVE A ESCRITA EM CURSO INATIVO — sem erro, sem aviso, em quinze tabelas. E o
--    curso volta a SUMIR do alcance ao ser desativado, que e a metade pior: o dado continua la e
--    ninguem o encontra.
--
-- ⚠️ E CURSO JA DESATIVADO CONTINUA DESATIVADO. A situacao e dado, nao estrutura; reverter a
--    migration nao reativa curso nenhum.
-- =================================================================================
