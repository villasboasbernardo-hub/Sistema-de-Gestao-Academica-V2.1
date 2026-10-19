-- =================================================================================
-- Spec 017 · Bloco 2 · M1 — a EXECUÇÃO: TA fora do DSA, o sem posição e o nome no DSA
-- Data local: 19/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- Decisões de Bernardo Villas Boas:
--   D-COR-3 (16/10/2026) *"TA fora do DSA, com observação (…) Esses TA somam na CH executada e no saldo"*;
--   PEND-016-5 (19/10/2026) — a situação do DSA soma o lançamento sem `ta_inicial`;
--   o pedido de 19/10/2026 (Bloco 2, item 6) — o nome da disciplina no cartão do DSA.
-- Regra 9.4 (emenda de 19/10/2026): esta migration SÓ ACRESCENTA — tabela, coluna, recurso e um ramo que soma
--   ZERO enquanto a tabela estiver vazia; as colunas antigas das três views ficam na mesma ordem e com o mesmo
--   valor — provado no LOCAL pela impressão digital do conteúdo antes × depois sobre a cópia
--   `remoto-20261019-024230.sql` (SC-010 da spec 017); no remoto, [pendente: passo 3 do rito].
--
-- O que faz:
--   1. `public.ta_fora_do_dsa` — TA executados fora do DSA, por linha da turma: data, quantidade ≥ 1 (sem ajuste
--      negativo), instrutor opcional, observação obrigatória. Corrigir é DESFAZER (status inativo): depois de
--      gravado, nada mais muda. Código `TFD-NNNNNN`.
--   2. O recurso `ta_fora_do_dsa`/`editar` na matriz: só Admin, Encarregado e Ajudante da Administração Acadêmica.
--      Lê quem lê lançamento da turma (`registros_aula`/`ler` + alcance) — a mesma régua de `registros_aula`, para as
--      views `security_invoker` somarem igual para todo leitor.
--   3. `disciplinas.nome_no_dsa` — o nome do cartão do DSA (o banco guarda até 60; o limite do CARTÃO é do domínio,
--      medido no papel — `lib/dominio/nome-no-dsa.ts`).
--   4. As três somas da CHD (a guarda do pgTAP 135 continua: as três batem):
--      `vw_chd_por_fato` — o ramo `fora_do_dsa` e a coluna `sem_posicao` NO FIM (a PEND-016-5: o fato sem posição na
--        grade entra no acumulado do DSA por aqui);
--      `vw_carga_horaria_turma` — `chd_executada` e `cht_executada` somam o fora do DSA; `ta_fora_do_dsa` NO FIM;
--      `vw_disciplinas_execucao` — `ta_executados`, `ta_saldo` e as datas reais somam o fora do DSA;
--        `ta_fora_do_dsa` e `nome_no_dsa` NO FIM.
--   ⚠️ `with (security_invoker = true)` nas três (gotcha 10). Os corpos de `vw_carga_horaria_turma` e
--      `vw_disciplinas_execucao` são os de `20261016092307` com só a diferença acima.
--
-- Reversão (só com `ta_fora_do_dsa` vazia; com registro, é decisão de Bernardo):
--   recriar `vw_chd_por_fato` com o corpo de `20261019035107` (⚠️ é `create or replace` com coluna a menos: exige
--   `drop view` + recriar as duas funções da M1 da spec 016, que dependem dela) e as outras duas com o de
--   `20261016092307` (idem: `drop` + recriar `vw_conformidade_tetos`, que depende de `vw_carga_horaria_turma`);
--   `alter table public.disciplinas drop column nome_no_dsa` SÓ se nula em todas as linhas (o precedente é a
--   reversão de `20260925135058`); com dado, ela fica como `-- [APOSENTADA — v2.1]` e a decisão é de Bernardo;
--   o recurso na matriz vai a `permitido = false`, sem `delete` (regra 4);
--   `drop table public.ta_fora_do_dsa`; `drop function app.guardar_ta_fora_do_dsa()`,
--   `drop function app.proximo_codigo_ta_fora_do_dsa()`, `drop sequence app.ta_fora_do_dsa_codigo_seq`.
--   O roteiro executável e provado é `specs/017-bloco-2-turmas-e-dsa/reversao.sql`.
-- =================================================================================

-- ---------------------------------------------------------------- 1. o código TFD-
-- Gotcha 5.1: o DEFAULT roda com os direitos de quem insere.
create sequence app.ta_fora_do_dsa_codigo_seq as bigint;
select setval('app.ta_fora_do_dsa_codigo_seq', 1, false);

create or replace function app.proximo_codigo_ta_fora_do_dsa()
returns text language sql security definer set search_path = pg_catalog, public as $$
  select 'TFD-' || lpad(nextval('app.ta_fora_do_dsa_codigo_seq')::text, 6, '0');
$$;
revoke all on function app.proximo_codigo_ta_fora_do_dsa() from public, anon;
grant execute on function app.proximo_codigo_ta_fora_do_dsa() to authenticated, service_role;

-- ---------------------------------------------------------------- 2. a tabela
create table public.ta_fora_do_dsa (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique default app.proximo_codigo_ta_fora_do_dsa(),
  turma_disciplina_id uuid not null references public.turma_disciplina(id) on delete restrict,
  turma_id            uuid not null references public.turmas(id) on delete restrict,
  disciplina_id       uuid not null references public.disciplinas(id) on delete restrict,
  data                date not null,
  tempos              smallint not null check (tempos >= 1),
  instrutor_id        uuid references public.instrutores(id) on delete restrict,
  observacao          text not null check (length(btrim(observacao)) >= 3 and length(observacao) <= 1000),
  status              public.status_registro not null default 'ativo',
  origem_migracao_v1  text,
  criado_por          uuid,
  criado_em           timestamptz not null default now(),
  editado_por         uuid,
  editado_em          timestamptz
);

comment on table public.ta_fora_do_dsa is
  'Bloco 2 (spec 017), D-COR-3: TA executados FORA do DSA, por linha da turma — atividade fora dos tempos, aula que '
  'virou EAD, histórico de curso sem DSA. Somam na CH executada e no saldo (as três somas da CHD), não ocupam a grade. '
  'Corrigir é desfazer (status = inativo); nada é apagado.';
comment on column public.ta_fora_do_dsa.data is
  'O dia do fato. Data futura é recusada pelo servidor com o dia de São Paulo (D20: o banco não usa relógio).';
comment on column public.ta_fora_do_dsa.tempos is 'Quantidade de TA, inteira e positiva: sem ajuste negativo.';

create index ta_fora_do_dsa_turma_data_idx on public.ta_fora_do_dsa (turma_id, data);
create index ta_fora_do_dsa_linha_idx on public.ta_fora_do_dsa (turma_disciplina_id);

create trigger trg_ta_fora_do_dsa_auditoria before insert or update on public.ta_fora_do_dsa
  for each row execute function app.set_auditoria();

-- ---------------------------------------------------------------- 3. o guarda da linha
-- A turma e a disciplina são as DA LINHA; a linha está ativa na criação; e depois de gravado só o status muda, e só
-- de ativo para inativo ("desfazer").
create or replace function app.guardar_ta_fora_do_dsa()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_linha record;
begin
  if tg_op = 'INSERT' then
    select td.turma_id, td.disciplina_id, td.status
      into v_linha
      from public.turma_disciplina td
     where td.id = new.turma_disciplina_id;
    if v_linha.turma_id is distinct from new.turma_id
       or v_linha.disciplina_id is distinct from new.disciplina_id then
      raise exception 'A turma e a disciplina nao sao as da linha.'
        using errcode = '23514', hint = 'ta_fora_linha_divergente';
    end if;
    if v_linha.status is distinct from 'ativo' then
      raise exception 'A disciplina nao esta ativa na turma.'
        using errcode = '23514', hint = 'ta_fora_linha_inativa';
    end if;
    return new;
  end if;

  -- ⚠️ O REGISTRO INTEIRO, menos o que o desfazer muda: o código e a procedência também ficam (analyze, achado 63).
  if (to_jsonb(new) - array['status', 'editado_por', 'editado_em'])
       is distinct from
     (to_jsonb(old) - array['status', 'editado_por', 'editado_em'])
     or not (old.status = 'ativo' and new.status = 'inativo') then
    raise exception 'O registro de TA fora do DSA so pode ser desfeito.'
      using errcode = '23514', hint = 'ta_fora_so_desfaz';
  end if;
  return new;
end;
$$;
revoke all on function app.guardar_ta_fora_do_dsa() from public, anon, authenticated;

create trigger trg_ta_fora_do_dsa_guarda before insert or update on public.ta_fora_do_dsa
  for each row execute function app.guardar_ta_fora_do_dsa();

-- ---------------------------------------------------------------- 4. RLS e a matriz
alter table public.ta_fora_do_dsa enable row level security;

create policy ta_fora_do_dsa_ler on public.ta_fora_do_dsa
  for select to authenticated
  using (app.pode('registros_aula', 'ler') and app.alcanca_turma(turma_id));

create policy ta_fora_do_dsa_criar on public.ta_fora_do_dsa
  for insert to authenticated
  with check (coalesce(app.pode('ta_fora_do_dsa', 'editar'), false)
              and app.alcanca_turma(turma_id) and app.turma_em_oferta(turma_id));

-- ⚠️ O DESFAZER TAMBÉM EXIGE A TURMA EM OFERTA, como toda escrita das tabelas da turma (pgTAP 105): curso inativo
--    não recebe nem desfaz.
create policy ta_fora_do_dsa_editar on public.ta_fora_do_dsa
  for update to authenticated
  using      (coalesce(app.pode('ta_fora_do_dsa', 'editar'), false)
              and app.alcanca_turma(turma_id) and app.turma_em_oferta(turma_id))
  with check (coalesce(app.pode('ta_fora_do_dsa', 'editar'), false)
              and app.alcanca_turma(turma_id) and app.turma_em_oferta(turma_id));

revoke delete, truncate on public.ta_fora_do_dsa from authenticated, anon;

insert into public.perfil_permissao (perfil, recurso, acao, permitido, observacao)
select p, 'ta_fora_do_dsa', 'editar',
       p in ('admin', 'encarregado_administracao_academica', 'ajudante_administracao_academica'),
       'Bloco 2 (spec 017), D-COR-3: registra e desfaz TA fora do DSA. Admin, Encarregado e Ajudante.'
  from unnest(enum_range(null::public.perfil_usuario)) as p
on conflict (perfil, recurso, acao) do update set permitido = excluded.permitido, observacao = excluded.observacao;

-- ---------------------------------------------------------------- 5. o nome no DSA
alter table public.disciplinas add column nome_no_dsa text
  check (nome_no_dsa is null or (length(btrim(nome_no_dsa)) between 1 and 60));

comment on column public.disciplinas.nome_no_dsa is
  'Bloco 2 (spec 017), item 6: o nome da disciplina no CARTÃO do DSA (tela, papel e planilha). Vazio = a abreviação '
  'automática de `lib/dominio/nome-no-dsa.ts` quando o nome não cabe. O quadro de CH e o resto do sistema usam o nome '
  'inteiro. O banco guarda até 60; o limite do cartão é do domínio.';

-- ---------------------------------------------------------------- 6. a base da M1 (spec 016)
-- O ramo `fora_do_dsa` e a coluna `sem_posicao` NO FIM: as cinco colunas de antes, com o mesmo valor.
create or replace view public.vw_chd_por_fato with (security_invoker = true) as
with vivas as (
  select a.id, a.turma_id, a.disciplina_id, a.data_avaliacao, a.tempos_consumidos, a.ta_inicial
    from public.avaliacoes a
   where a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
)
select r.turma_id,
       coalesce(ue.disciplina_id, r.disciplina_id) as disciplina_id,
       r.data,
       r.tempos_consumidos::bigint as tempos,
       'aula'::text as origem,
       r.ta_inicial is null as sem_posicao
  from public.registros_aula r
  left join public.unidades_ensino ue on ue.id = r.unidade_ensino_id
 where r.status = 'ativo'
union all
select v.turma_id, v.disciplina_id, v.data_avaliacao, coalesce(v.tempos_consumidos, 0)::bigint, 'aplicacao',
       v.ta_inicial is null
  from vivas v
union all
select v.turma_id, v.disciplina_id, p.data, coalesce(p.tempos_consumidos, 0)::bigint, 'sessao_de_aplicacao',
       p.ta_inicial is null
  from public.sessoes_de_aplicacao p
  join vivas v on v.id = p.avaliacao_id
 where p.status = 'ativo'
union all
select v.turma_id, v.disciplina_id, s.data, coalesce(s.tempos_consumidos, 0)::bigint, 'vista',
       s.ta_inicial is null
  from public.vistas_de_avaliacao s
  join vivas v on v.id = s.avaliacao_id
 where s.status = 'ativo'
union all
select f.turma_id, f.disciplina_id, f.data, f.tempos::bigint, 'fora_do_dsa', true
  from public.ta_fora_do_dsa f
 where f.status = 'ativo';

comment on view public.vw_chd_por_fato is
  'A CHD lançada, um fato por linha, com a DATA do próprio fato (spec 016, M1; D-COR-2) — inclusive os TA fora do '
  'DSA (spec 017, D-COR-3). `sem_posicao` = o fato não ocupa TA na grade (sem `ta_inicial`, ou fora do DSA): é por '
  'ela que o acumulado do DSA o soma (PEND-016-5). Sem corte, soma o mesmo que `vw_carga_horaria_turma.chd_executada` '
  'e `vw_disciplinas_execucao.ta_executados` (pgTAP 135; PEND-016-1).';

-- ---------------------------------------------------------------- 7. a CH da turma
create or replace view public.vw_carga_horaria_turma with (security_invoker = true) as
 WITH aulas AS (
         SELECT r.turma_id,
            sum(r.tempos_consumidos) FILTER (WHERE r.categoria_normativa = 'aula'::categoria_registro_aula) AS ta_aula,
            sum(r.tempos_consumidos) FILTER (WHERE r.categoria_normativa = 'atividade_extraclasse'::categoria_registro_aula) AS ta_extraclasse
           FROM registros_aula r
          WHERE r.status = 'ativo'::status_registro
          GROUP BY r.turma_id
        ), vivas AS (
         SELECT a.id, a.turma_id, a.tempos_consumidos
           FROM avaliacoes a
          WHERE a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao,
                                      'concluida'::status_avaliacao, 'atrasada'::status_avaliacao])
        ), provas AS (
         -- RN-AV-12: a aplicação é a 1ª sessão (a avaliação) MAIS as sessões 2..N.
         SELECT v.turma_id,
            (sum(COALESCE(v.tempos_consumidos::integer, 0))
             + sum((SELECT COALESCE(sum(p.tempos_consumidos), 0) FROM sessoes_de_aplicacao p
                     WHERE p.avaliacao_id = v.id AND p.status = 'ativo'::status_registro)))::bigint AS ta_aplicacao,
            sum((SELECT COALESCE(sum(s.tempos_consumidos), 0) FROM vistas_de_avaliacao s
                  WHERE s.avaliacao_id = v.id AND s.status = 'ativo'::status_registro))::bigint AS ta_vista
           FROM vivas v
          GROUP BY v.turma_id
        ), linhas_nao_letivas AS (
         SELECT n.turma_id,
            n.categoria_normativa,
            n.tempos_consumidos
           FROM atividades_nao_letivas n
          WHERE n.status = 'ativo'::status_registro AND n.turma_id IS NOT NULL
        UNION ALL
         SELECT t_1.id,
            n.categoria_normativa,
            n.tempos_consumidos
           FROM atividades_nao_letivas n
             CROSS JOIN turmas t_1
          WHERE n.status = 'ativo'::status_registro AND n.turma_id IS NULL AND app.turma_tem_dsa_na_data(t_1.id, n.data)
        ), nao_letivas AS (
         SELECT l.turma_id,
            sum(l.tempos_consumidos) FILTER (WHERE l.categoria_normativa = 'AEC'::categoria_normativa) AS ta_aec,
            sum(l.tempos_consumidos) FILTER (WHERE l.categoria_normativa = 'TAD'::categoria_normativa) AS ta_tad,
            sum(l.tempos_consumidos) FILTER (WHERE l.categoria_normativa = 'TR'::categoria_normativa) AS ta_tr,
            sum(l.tempos_consumidos) FILTER (WHERE l.categoria_normativa = 'Estudo_Individual'::categoria_normativa) AS ta_estudo_individual,
            sum(l.tempos_consumidos) FILTER (WHERE l.categoria_normativa = 'Apoio_Individualizado'::categoria_normativa) AS ta_apoio_individualizado
           FROM linhas_nao_letivas l
          GROUP BY l.turma_id
        ), parados AS (
         SELECT p.turma_id,
            sum(p.tempos) AS ta_dias_parados
           FROM vw_dias_parados_turma p
          GROUP BY p.turma_id
        ), fora AS (
         -- Bloco 2 (D-COR-3): os TA fora do DSA, somados na CHD da turma.
         SELECT f.turma_id, sum(f.tempos)::bigint AS ta_fora_do_dsa
           FROM ta_fora_do_dsa f
          WHERE f.status = 'ativo'::status_registro
          GROUP BY f.turma_id
        ), curricular AS (
         SELECT t_1.id AS turma_id,
            sum(d.carga_horaria_tempos) AS chr_curricular
           FROM turmas t_1
             JOIN disciplinas d ON d.curso_id = t_1.curso_id AND d.status = 'ativo'::status_registro
          GROUP BY t_1.id
        )
 SELECT t.id AS turma_id,
    t.codigo AS turma_codigo,
    t.curso_id,
    c.codigo AS curso_codigo,
    c.nome_curso,
    t.ano_letivo,
    t.status AS status_turma,
    COALESCE(cu.chr_curricular, 0::bigint) AS chr_curricular,
    COALESCE(au.ta_aula, 0::bigint) AS ta_aula,
    COALESCE(au.ta_extraclasse, 0::bigint) AS ta_extraclasse,
    COALESCE(pr.ta_aplicacao, 0::bigint) AS ta_avaliacao,
    COALESCE(pr.ta_vista, 0::bigint) AS ta_vista_prova,
    COALESCE(au.ta_aula, 0::bigint) + COALESCE(au.ta_extraclasse, 0::bigint) + COALESCE(pr.ta_aplicacao, 0::bigint) + COALESCE(pr.ta_vista, 0::bigint) + COALESCE(fo.ta_fora_do_dsa, 0::bigint) AS chd_executada,
    COALESCE(nl.ta_aec, 0::bigint) AS ta_aec,
    COALESCE(nl.ta_tad, 0::bigint) AS ta_tad,
    COALESCE(nl.ta_tr, 0::bigint) AS ta_tr,
    COALESCE(nl.ta_estudo_individual, 0::bigint) AS ta_estudo_individual,
    COALESCE(au.ta_aula, 0::bigint) + COALESCE(au.ta_extraclasse, 0::bigint) + COALESCE(pr.ta_aplicacao, 0::bigint) + COALESCE(pr.ta_vista, 0::bigint) + COALESCE(fo.ta_fora_do_dsa, 0::bigint) + COALESCE(nl.ta_aec, 0::bigint) + COALESCE(nl.ta_tad, 0::bigint) + COALESCE(nl.ta_tr, 0::bigint) AS cht_executada,
    COALESCE(nl.ta_apoio_individualizado, 0::bigint) AS ta_apoio_individualizado,
    COALESCE(pa.ta_dias_parados, 0::bigint::numeric) AS ta_dias_parados,
    COALESCE(fo.ta_fora_do_dsa, 0::bigint) AS ta_fora_do_dsa
   FROM turmas t
     JOIN cursos c ON c.id = t.curso_id
     LEFT JOIN aulas au ON au.turma_id = t.id
     LEFT JOIN provas pr ON pr.turma_id = t.id
     LEFT JOIN nao_letivas nl ON nl.turma_id = t.id
     LEFT JOIN parados pa ON pa.turma_id = t.id
     LEFT JOIN curricular cu ON cu.turma_id = t.id
     LEFT JOIN fora fo ON fo.turma_id = t.id;


-- ---------------------------------------------------------------- 8. a execução da disciplina
create or replace view public.vw_disciplinas_execucao with (security_invoker = true) as
 WITH aulas AS (
         SELECT COALESCE(ue.disciplina_id, r.disciplina_id) AS disciplina_id,
            r.turma_id,
            min(r.data) AS primeira_data,
            max(r.data) AS ultima_data,
            sum(r.tempos_consumidos) AS ta
           FROM registros_aula r
             LEFT JOIN unidades_ensino ue ON ue.id = r.unidade_ensino_id
          WHERE r.status = 'ativo'::status_registro AND COALESCE(ue.disciplina_id, r.disciplina_id) IS NOT NULL
          GROUP BY (COALESCE(ue.disciplina_id, r.disciplina_id)), r.turma_id
        ), sessoes AS (
         SELECT s.avaliacao_id, max(s.data) AS ultima_vista, sum(COALESCE(s.tempos_consumidos::integer, 0)) AS ta_vista
           FROM vistas_de_avaliacao s
          WHERE s.status = 'ativo'::status_registro
          GROUP BY s.avaliacao_id
        ), aplicacoes AS (
         -- RN-AV-12: as sessões 2..N da aplicação.
         SELECT p.avaliacao_id, max(p.data) AS ultima_sessao, sum(COALESCE(p.tempos_consumidos::integer, 0)) AS ta_sessoes
           FROM sessoes_de_aplicacao p
          WHERE p.status = 'ativo'::status_registro
          GROUP BY p.avaliacao_id
        ), provas AS (
         SELECT a.disciplina_id,
            a.turma_id,
            min(a.data_avaliacao) AS primeira_data,
            GREATEST(max(a.data_avaliacao), max(se.ultima_vista), max(ap.ultima_sessao)) AS ultima_data,
            sum(COALESCE(a.tempos_consumidos::integer, 0) + COALESCE(ap.ta_sessoes, 0) + COALESCE(se.ta_vista, 0))::bigint AS ta
           FROM avaliacoes a
             LEFT JOIN sessoes se ON se.avaliacao_id = a.id
             LEFT JOIN aplicacoes ap ON ap.avaliacao_id = a.id
          WHERE a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao,
                                      'concluida'::status_avaliacao, 'atrasada'::status_avaliacao])
          GROUP BY a.disciplina_id, a.turma_id
        ), fora AS (
         -- Bloco 2 (D-COR-3): os TA fora do DSA da disciplina na turma.
         SELECT f.disciplina_id, f.turma_id, min(f.data) AS primeira_data, max(f.data) AS ultima_data,
            sum(f.tempos)::bigint AS ta
           FROM ta_fora_do_dsa f
          WHERE f.status = 'ativo'::status_registro
          GROUP BY f.disciplina_id, f.turma_id
        )
 SELECT d.id AS disciplina_id,
    d.codigo AS disciplina_codigo,
    d.curso_id,
    d.cod_disciplina,
    d.nome_disciplina,
    d.carga_horaria_tempos,
    t.id AS turma_id,
    t.codigo AS turma_codigo,
    t.ano_letivo,
    COALESCE(td.previsao_inicio, d.previsao_inicio) AS previsao_inicio_efetiva,
    COALESCE(td.previsao_termino, d.previsao_termino) AS previsao_termino_efetiva,
    td.origem_periodo,
    LEAST(au.primeira_data, pr.primeira_data, fo.primeira_data) AS data_real_inicio,
    GREATEST(au.ultima_data, pr.ultima_data, fo.ultima_data) AS data_real_termino,
    COALESCE(au.ta, 0::bigint) AS ta_aula_executados,
    COALESCE(pr.ta, 0::bigint) AS ta_avaliacao_executados,
    COALESCE(au.ta, 0::bigint) + COALESCE(pr.ta, 0::bigint) + COALESCE(fo.ta, 0::bigint) AS ta_executados,
    d.carga_horaria_tempos - COALESCE(au.ta, 0::bigint) - COALESCE(pr.ta, 0::bigint) - COALESCE(fo.ta, 0::bigint) AS ta_saldo,
    COALESCE(fo.ta, 0::bigint) AS ta_fora_do_dsa,
    d.nome_no_dsa
   FROM disciplinas d
     JOIN turmas t ON t.curso_id = d.curso_id
     LEFT JOIN turma_disciplina td ON td.disciplina_id = d.id AND td.turma_id = t.id AND td.status = 'ativo'::status_registro
     LEFT JOIN aulas au ON au.disciplina_id = d.id AND au.turma_id = t.id
     LEFT JOIN provas pr ON pr.disciplina_id = d.id AND pr.turma_id = t.id
     LEFT JOIN fora fo ON fo.disciplina_id = d.id AND fo.turma_id = t.id
  WHERE d.status = 'ativo'::status_registro;


revoke insert, update, delete, truncate on public.vw_chd_por_fato from authenticated;
revoke insert, update, delete, truncate on public.vw_carga_horaria_turma from authenticated;
revoke insert, update, delete, truncate on public.vw_disciplinas_execucao from authenticated;
