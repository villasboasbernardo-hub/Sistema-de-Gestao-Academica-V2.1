-- =================================================================================
-- Spec 014, emenda de 15/10/2026 · migration E-6 — as SESSÕES DE APLICAÇÃO e o INSTRUMENTO da prova
-- Data local: 16/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- Desenho `specs/014-atividades-e-avaliacoes/desenho-emenda-15-10.md`, OPÇÃO A — aprovada por Bernardo Villas Boas
-- em 16/10/2026 (`aprovacoes-pendentes.md`, seção de 16/10/2026). As regras (spec §2.4):
--   RN-AV-12 *"…qualquer prova com a MESMA descrição em dias consecutivos ou próximos (mesma disciplina, mesmo COD)
--            é UMA prova com N sessões de aplicação, não N provas. O card "N de M" conta 1."*
--   RN-AV-13 *"vista é obrigatória só para PM e PO…"* — emendada em 16/10/2026: **PM, PO e PE**.
--   RN-AV-14 *"prova a mais que o currículo prevê NÃO é erro de planilha; vira alerta informativo na aba
--            Avaliações da turma ("currículo prevê 1 PP; aplicadas 2")."*
--
-- O que faz:
--   A1. `public.sessoes_de_aplicacao` (SAP-) — a 2ª, 3ª… sessão de aplicação da MESMA avaliação. A 1ª continua
--       nas colunas de `avaliacoes`: a avaliação segue sendo o fato único (`RN-AVAL-02`, Risco Alto). O molde é
--       `vistas_de_avaliacao` (E-4): RLS pela avaliação-mãe, nenhuma policy de DELETE, sessão antes da 1ª
--       aplicação recusada por gatilho.
--       + A TRILHA DE "JUNTAR" (decisão de 16/10/2026: *"juntar como sessão da mesma prova" (Encarregado/Admin,
--         com trilha)*): a sessão nascida de uma junção guarda a avaliação juntada, quem, quando e o retrato dela
--         antes; um gatilho recusa mudar esses campos. ⚠️ A trilha mora NA SESSÃO, e não numa tabela à parte, de
--         propósito: tabela fora do desenho aprovado seria portão de novo (regra 9.4).
--       + `public.juntar_como_sessao(p_prova_id, p_avaliacao_id)`, SECURITY INVOKER (a RLS decide o alcance),
--         com porteiro do recurso novo `avaliacoes_juntar_sessao` (Admin e Encarregado) que falha FECHADO
--         (gotcha 15).
--   A2. `avaliacoes.instrumento_id` — o instrumento da prova SEM item (a «a mais», a de disciplina sem currículo
--       carregado, a lançada sem item). Com item ligado, fica NULA ou igual à do item (gatilho): quem lê usa a do
--       item — a coluna nunca é segunda fonte de verdade.
--   A3. As leituras que somam a aplicação somam as sessões: `vw_carga_horaria_turma`, `vw_ocupacao_ta` (ramo novo
--       `sessao_aplicacao`, com `sessao_id` e `numero_sessao`), `vw_disciplinas_execucao`,
--       `vw_instrutor_carga_anual` (aplicador e fiscal), `app.lancamentos_que_travam_vigencia` e
--       `public.gravar_lancamentos_em_transacao`. Toda view recriada com `security_invoker` (gotcha 10).
--       `public.conflitos_da_semana` lê `vw_ocupacao_ta` e passa a cruzar as sessões sem mudar.
--   A4. `app.fn_status_vista` decide a obrigação de vista pelo INSTRUMENTO (`config_listas.metadados
--       .vista_obrigatoria`, posta pela D-9, a migration seguinte) — o espelho SQL da RN-AV-13. E o prazo da vista
--       conta da ÚLTIMA sessão de aplicação (leitura da implementação, 16/10/2026: a prova só termina na última
--       sessão; contar da 1ª acusaria atraso numa prova ainda em aplicação — o alerta falso que a opção A evita).
--   (A5, o parâmetro da janela, e a marca de vista obrigatória são DADO: migration D-9, `20261016092315`.)
--
-- Reversão (`specs/014-atividades-e-avaliacoes/reversao-emenda-15-10.sql`): as views, `fn_status_vista`,
--   `lancamentos_que_travam_vigencia` e `gravar_lancamentos_em_transacao` voltam ao corpo de `20261014151554`;
--   saem a função de juntar, os gatilhos novos e o recurso. Na base descartável, `drop` da tabela e da coluna; no
--   remoto, com dado, elas FICAM, comentadas `[APOSENTADA]` (regra: nunca `drop` com histórico). Provada numa
--   base descartável pela impressão digital do esquema antes e depois (DoD 6).
-- =================================================================================

-- ---------------------------------------------------------------- A1. a sequência SAP-
create sequence app.sessoes_de_aplicacao_codigo_seq as bigint;
select setval('app.sessoes_de_aplicacao_codigo_seq', 1, false);

create or replace function app.proximo_codigo_sessao_de_aplicacao()
returns text language sql security definer set search_path = pg_catalog, public as $$
  select 'SAP-' || lpad(nextval('app.sessoes_de_aplicacao_codigo_seq')::text, 6, '0');
$$;
-- Gotcha 5.1: o DEFAULT é avaliado com os direitos de quem insere.
revoke all on function app.proximo_codigo_sessao_de_aplicacao() from public, anon;
grant execute on function app.proximo_codigo_sessao_de_aplicacao() to authenticated, service_role;

-- ---------------------------------------------------------------- A1. a tabela
create table public.sessoes_de_aplicacao (
  id                      uuid primary key default gen_random_uuid(),
  codigo                  text not null unique default app.proximo_codigo_sessao_de_aplicacao(),
  avaliacao_id            uuid not null references public.avaliacoes(id) on delete restrict,
  numero                  smallint not null check (numero >= 2),
  data                    date not null,
  ta_inicial              smallint check (ta_inicial is null or ta_inicial between 1 and 12),
  tempos_consumidos       smallint check (tempos_consumidos is null or tempos_consumidos between 1 and 12),
  ta_final                smallint generated always as (ta_inicial + tempos_consumidos - 1) stored,
  local                   text,
  juntada_de_avaliacao_id uuid references public.avaliacoes(id) on delete restrict,
  juntada_por             uuid,
  juntada_em              timestamptz,
  avaliacao_juntada_antes jsonb,
  status                  public.status_registro not null default 'ativo',
  origem_migracao_v1      text,
  criado_por              uuid,
  criado_em               timestamptz not null default now(),
  editado_por             uuid,
  editado_em              timestamptz,
  constraint sap_ta_coerente check ((ta_inicial is null) = (tempos_consumidos is null)),
  -- A trilha da junção anda inteira: a avaliação juntada, o instante e o retrato dela, ou nada.
  constraint sap_juntada_inteira check (
    (juntada_de_avaliacao_id is null) = (juntada_em is null)
    and (juntada_de_avaliacao_id is null) = (avaliacao_juntada_antes is null)),
  constraint sap_juntada_de_outra check (juntada_de_avaliacao_id is distinct from avaliacao_id)
);

comment on table public.sessoes_de_aplicacao is
  'Spec 014, RN-AV-12 (emenda de 15/10/2026; desenho aprovado em 16/10/2026): a 2ª, 3ª… SESSÃO DE APLICAÇÃO da '
  'mesma avaliação — UMA prova em N sessões, não N provas (RN-AVAL-02). A 1ª sessão continua nas colunas de '
  '`avaliacoes`. Quem aplica e quem fiscaliza são os da avaliação. O TA de cada sessão consome tempo no dia dela e '
  'entra na CHD (`vw_carga_horaria_turma`, `vw_ocupacao_ta`). A sessão nascida de "juntar como sessão da mesma '
  'prova" traz a trilha (juntada_*), imutável.';
comment on column public.sessoes_de_aplicacao.numero is 'A ordem da sessão na prova: 2, 3… (a 1ª é a própria avaliação).';
comment on column public.sessoes_de_aplicacao.juntada_de_avaliacao_id is
  'Trilha (16/10/2026): a avaliação que foi JUNTADA como esta sessão, pela aba Avaliações da turma. Ela fica '
  'cancelada, com a marca «[JUNTADA COMO SESSAO …]». Nula na sessão lançada no DSA ou pela sincronização.';
comment on column public.sessoes_de_aplicacao.juntada_por is 'Trilha: quem juntou (`auth.uid()`; nulo = carga sem sessão).';
comment on column public.sessoes_de_aplicacao.juntada_em is 'Trilha: quando juntou.';
comment on column public.sessoes_de_aplicacao.avaliacao_juntada_antes is
  'Trilha: o retrato da avaliação juntada ANTES da junção (a linha inteira, e as vistas que passaram para a prova).';

create unique index sap_numero_unico on public.sessoes_de_aplicacao (avaliacao_id, numero) where status = 'ativo';
create index sessoes_de_aplicacao_avaliacao_idx on public.sessoes_de_aplicacao (avaliacao_id);
create index sessoes_de_aplicacao_data_idx on public.sessoes_de_aplicacao (data);
create index sessoes_de_aplicacao_juntada_idx on public.sessoes_de_aplicacao (juntada_de_avaliacao_id)
  where juntada_de_avaliacao_id is not null;

create trigger trg_sessoes_de_aplicacao_auditoria before insert or update on public.sessoes_de_aplicacao
  for each row execute function app.set_auditoria();

-- A sessão não pode ser antes da 1ª aplicação (o molde de `app.vista_apos_aplicacao`).
create or replace function app.sessao_apos_aplicacao()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_aplicacao date;
begin
  select a.data_avaliacao into v_aplicacao from public.avaliacoes a where a.id = new.avaliacao_id;
  if new.status = 'ativo' and v_aplicacao is not null and new.data < v_aplicacao then
    raise exception 'A sessão de aplicação (%) não pode ser antes da 1ª aplicação da prova (%).', new.data, v_aplicacao
      using errcode = '23514', hint = 'sessao_antes_da_aplicacao';
  end if;
  return new;
end;
$$;

comment on function app.sessao_apos_aplicacao() is
  'Spec 014, RN-AV-12: a sessão de aplicação 2..N não pode ser antes da 1ª (a data de `avaliacoes`). Gatilho, '
  'porque a data da 1ª está em outra tabela.';

revoke all on function app.sessao_apos_aplicacao() from public, anon, authenticated;

create trigger trg_sessoes_de_aplicacao_apos_aplicacao before insert or update on public.sessoes_de_aplicacao
  for each row execute function app.sessao_apos_aplicacao();

-- A trilha da junção: só quem pode juntar a cria, ela é carimbada pelo banco e nunca muda.
create or replace function app.proteger_trilha_da_juntada()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    if new.juntada_de_avaliacao_id is not null and auth.uid() is not null then
      -- Gotcha 15: a forma que não falha aberto quando `app.pode` devolve nulo.
      if coalesce(app.pode('avaliacoes_juntar_sessao', 'editar'), false) is not true then
        raise exception 'Só o Admin e o Encarregado juntam uma avaliação como sessão de outra.'
          using errcode = '42501', hint = 'juntar_sem_permissao';
      end if;
      new.juntada_por := auth.uid();
      new.juntada_em := now();
    end if;
    return new;
  end if;

  if new.juntada_de_avaliacao_id is distinct from old.juntada_de_avaliacao_id
     or new.juntada_por is distinct from old.juntada_por
     or new.juntada_em is distinct from old.juntada_em
     or new.avaliacao_juntada_antes is distinct from old.avaliacao_juntada_antes
     or (old.juntada_de_avaliacao_id is not null and new.avaliacao_id is distinct from old.avaliacao_id) then
    raise exception 'A trilha da junção não muda: quem juntou, quando, a avaliação juntada e a prova são registro.'
      using errcode = '42501', hint = 'trilha_da_juntada_imutavel';
  end if;
  return new;
end;
$$;

comment on function app.proteger_trilha_da_juntada() is
  'Spec 014 (decisão de 16/10/2026, "juntar como sessão da mesma prova", com trilha): no INSERT com avaliação '
  'juntada, exige `avaliacoes_juntar_sessao.editar` (Admin, Encarregado) e carimba quem e quando — o cliente não '
  'escolhe; no UPDATE, recusa com 42501 mudar a trilha (e a prova de uma sessão juntada). A carga roda sem sessão.';

revoke all on function app.proteger_trilha_da_juntada() from public, anon, authenticated;

create trigger trg_sessoes_de_aplicacao_trilha before insert or update on public.sessoes_de_aplicacao
  for each row execute function app.proteger_trilha_da_juntada();

alter table public.sessoes_de_aplicacao enable row level security;

-- As policies seguem as de `vistas_de_avaliacao`, pelo alcance da turma da avaliação-mãe.
create policy sessoes_de_aplicacao_ler on public.sessoes_de_aplicacao
  for select to authenticated
  using (app.pode('avaliacoes', 'ler')
         and exists (select 1 from public.avaliacoes a where a.id = avaliacao_id and app.alcanca_turma(a.turma_id)));
create policy sessoes_de_aplicacao_criar on public.sessoes_de_aplicacao
  for insert to authenticated
  with check (coalesce(app.pode('avaliacoes', 'editar'), false)
              and exists (select 1 from public.avaliacoes a
                           where a.id = avaliacao_id and app.alcanca_turma(a.turma_id) and app.curso_em_oferta(a.curso_id)));
create policy sessoes_de_aplicacao_editar on public.sessoes_de_aplicacao
  for update to authenticated
  using (coalesce(app.pode('avaliacoes', 'editar'), false)
         and exists (select 1 from public.avaliacoes a
                      where a.id = avaliacao_id and app.alcanca_turma(a.turma_id) and app.curso_em_oferta(a.curso_id)))
  with check (coalesce(app.pode('avaliacoes', 'editar'), false)
              and exists (select 1 from public.avaliacoes a
                           where a.id = avaliacao_id and app.alcanca_turma(a.turma_id) and app.curso_em_oferta(a.curso_id)));

-- Regra 4: nada é apagado; a sessão sai por `status = 'inativo'`.
revoke delete, truncate on public.sessoes_de_aplicacao from authenticated, anon;

-- ---------------------------------------------------------------- A1. o recurso de juntar
insert into public.perfil_permissao (perfil, recurso, acao, permitido, observacao)
select p, 'avaliacoes_juntar_sessao', 'editar',
       p in ('admin', 'encarregado_administracao_academica'),
       'Spec 014 (decisão de Bernardo Villas Boas, 16/10/2026): juntar uma avaliação como sessão de aplicação de '
       'outra prova da mesma disciplina, na aba Avaliações da turma. Admin e Encarregado, com trilha.'
  from unnest(enum_range(null::public.perfil_usuario)) as p
on conflict (perfil, recurso, acao) do update set permitido = excluded.permitido, observacao = excluded.observacao;

-- ---------------------------------------------------------------- A2. o instrumento da prova
alter table public.avaliacoes add column instrumento_id uuid references public.config_listas(id) on delete restrict;

create index avaliacoes_instrumento_idx on public.avaliacoes (instrumento_id) where instrumento_id is not null;

comment on column public.avaliacoes.instrumento_id is
  'Spec 014, RN-AV-13 e RN-AV-14 (desenho de 15/10/2026, aprovado em 16/10/2026): o instrumento da prova SEM item '
  'do currículo ligado (a «a mais», a de disciplina sem currículo carregado, a lançada sem item) — só valores de '
  '`config_listas.instrumentos_avaliacao`. Com item ligado, fica NULA ou igual à do item (gatilho), e quem lê usa a '
  'do item: a coluna nunca é segunda fonte de verdade.';

create or replace function app.instrumento_da_avaliacao()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_do_item uuid;
begin
  if new.instrumento_id is null then
    return new;
  end if;
  if not exists (select 1 from public.config_listas l
                  where l.id = new.instrumento_id and l.lista = 'instrumentos_avaliacao') then
    raise exception 'O instrumento da avaliação tem de ser da lista de instrumentos de avaliação.'
      using errcode = '23514', hint = 'instrumento_fora_da_lista';
  end if;
  if new.avaliacao_curriculo_id is not null then
    select c.instrumento_id into v_do_item from public.avaliacoes_curriculo c where c.id = new.avaliacao_curriculo_id;
    if v_do_item is distinct from new.instrumento_id then
      raise exception 'O instrumento da avaliação não é o do item do currículo ligado a ela.'
        using errcode = '23514', hint = 'instrumento_diferente_do_item';
    end if;
  end if;
  return new;
end;
$$;

comment on function app.instrumento_da_avaliacao() is
  'Spec 014 (A2 do desenho de 15/10/2026): `avaliacoes.instrumento_id` só aceita valor de `instrumentos_avaliacao` '
  'e, com item ligado, só o instrumento do item (CHECK não enxerga outra tabela).';

revoke all on function app.instrumento_da_avaliacao() from public, anon, authenticated;

create trigger trg_avaliacoes_instrumento before insert or update of instrumento_id, avaliacao_curriculo_id
  on public.avaliacoes for each row execute function app.instrumento_da_avaliacao();

-- ---------------------------------------------------------------- A4. a situação, espelho do TS
create or replace function app.fn_status_vista(p_avaliacao_id uuid, p_hoje date default current_date,
                                               p_prazo_dias integer default null)
returns text
language sql
stable
set search_path = pg_catalog, public
as $$
  with a as (
    select av.id, av.status, av.data_avaliacao,
           -- A prova termina na ÚLTIMA sessão de aplicação (RN-AV-12): o prazo da vista conta dela.
           greatest(av.data_avaliacao,
                    (select max(s.data) from public.sessoes_de_aplicacao s
                      where s.avaliacao_id = av.id and s.status = 'ativo')) as fim_da_aplicacao,
           -- RN-AV-13 (PM, PO e PE desde 16/10/2026): a obrigação é do INSTRUMENTO — o do item; sem item, o da
           -- própria prova. Instrumento desconhecido: exige, como antes da emenda.
           (select coalesce((l.metadados ->> 'vista_obrigatoria')::boolean, false)
              from public.config_listas l
             where l.id = coalesce((select c.instrumento_id from public.avaliacoes_curriculo c
                                     where c.id = av.avaliacao_curriculo_id),
                                   av.instrumento_id)) as vista_obrigatoria,
           exists (select 1 from public.vistas_de_avaliacao v where v.avaliacao_id = av.id and v.status = 'ativo') as tem_sessao
      from public.avaliacoes av
     where av.id = p_avaliacao_id
  )
  select case
    when a.status not in ('pendente', 'em_andamento', 'concluida', 'atrasada') then null
    when a.data_avaliacao is null or a.data_avaliacao > p_hoje then 'pendente'
    when not coalesce(a.vista_obrigatoria, true) or a.tem_sessao then 'concluida'
    when p_hoje - a.fim_da_aplicacao
         > coalesce(p_prazo_dias, app.fn_parametro_numerico('avaliacao.prazo_vista_dias')::integer, 7) then 'atrasada'
    else 'em_andamento'
  end
  from a;
$$;

comment on function app.fn_status_vista(uuid, date, integer) is
  'Spec 014, R-8: a situação de PROVA e TRABALHO (pendente, em_andamento, concluida, atrasada), calculada na '
  'leitura pelas SESSÕES de vista. ESPELHO de `situacaoDaAvaliacao` (lib/dominio/avaliacoes/situacao.ts), que é '
  'quem decide; a OD e o «sem correspondência» vivem só lá. RN-AV-13 (16/10/2026): a vista é obrigatória pelo '
  'INSTRUMENTO (`config_listas.metadados.vista_obrigatoria`: PM, PO e PE) — o do item, ou `avaliacoes.instrumento_id` '
  'sem item; instrumento desconhecido exige. RN-AV-12: o prazo conta da ÚLTIMA sessão de aplicação. Chamar com '
  '`p_hoje` explícito (D20). Devolve nulo para a avaliação cancelada ou substituída.';

-- ---------------------------------------------------------------- A3. CH da turma
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
    COALESCE(au.ta_aula, 0::bigint) + COALESCE(au.ta_extraclasse, 0::bigint) + COALESCE(pr.ta_aplicacao, 0::bigint) + COALESCE(pr.ta_vista, 0::bigint) AS chd_executada,
    COALESCE(nl.ta_aec, 0::bigint) AS ta_aec,
    COALESCE(nl.ta_tad, 0::bigint) AS ta_tad,
    COALESCE(nl.ta_tr, 0::bigint) AS ta_tr,
    COALESCE(nl.ta_estudo_individual, 0::bigint) AS ta_estudo_individual,
    COALESCE(au.ta_aula, 0::bigint) + COALESCE(au.ta_extraclasse, 0::bigint) + COALESCE(pr.ta_aplicacao, 0::bigint) + COALESCE(pr.ta_vista, 0::bigint) + COALESCE(nl.ta_aec, 0::bigint) + COALESCE(nl.ta_tad, 0::bigint) + COALESCE(nl.ta_tr, 0::bigint) AS cht_executada,
    COALESCE(nl.ta_apoio_individualizado, 0::bigint) AS ta_apoio_individualizado,
    COALESCE(pa.ta_dias_parados, 0::bigint::numeric) AS ta_dias_parados
   FROM turmas t
     JOIN cursos c ON c.id = t.curso_id
     LEFT JOIN aulas au ON au.turma_id = t.id
     LEFT JOIN provas pr ON pr.turma_id = t.id
     LEFT JOIN nao_letivas nl ON nl.turma_id = t.id
     LEFT JOIN parados pa ON pa.turma_id = t.id
     LEFT JOIN curricular cu ON cu.turma_id = t.id;

revoke insert, update, delete, truncate on public.vw_carga_horaria_turma from authenticated;

-- ---------------------------------------------------------------- A3. ocupação do TA
-- O ramo novo `sessao_aplicacao` entra ANTES do da vista; as colunas não mudam (a sessão usa `sessao_id` e
-- `numero_sessao`, que a vista já trazia). `with (security_invoker)` obrigatório (gotcha 10).
create or replace view public.vw_ocupacao_ta with (security_invoker = true) as
 SELECT r.turma_id,
    r.data,
    r.ta_inicial,
    r.ta_final,
    r.tempos_consumidos,
    'aula'::text AS origem,
    r.id AS fato_id,
    COALESCE(ue.disciplina_id, r.disciplina_id) AS disciplina_id,
    r.instrutor_id,
    NULL::uuid AS fiscal_id,
    r.local,
    r.origem_migracao_v1 IS NOT NULL AND r.editado_em IS NULL AS herdado,
    NULL::uuid AS sessao_id,
    NULL::smallint AS numero_sessao
   FROM registros_aula r
     LEFT JOIN unidades_ensino ue ON ue.id = r.unidade_ensino_id
  WHERE r.status = 'ativo'::status_registro AND r.ta_inicial IS NOT NULL
UNION ALL
 SELECT a.turma_id,
    a.data_avaliacao AS data,
    a.ta_inicial,
    a.ta_final,
    a.tempos_consumidos,
    'avaliacao'::text AS origem,
    a.id AS fato_id,
    a.disciplina_id,
    a.instrutor_responsavel_id AS instrutor_id,
    a.fiscal_id,
    a.local,
    a.origem_migracao_v1 IS NOT NULL AND a.editado_em IS NULL AS herdado,
    NULL::uuid AS sessao_id,
    NULL::smallint AS numero_sessao
   FROM avaliacoes a
  WHERE a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao,
                              'concluida'::status_avaliacao, 'atrasada'::status_avaliacao])
    AND a.ta_inicial IS NOT NULL
UNION ALL
 -- RN-AV-12: a sessão 2..N da aplicação — o mesmo aplicador e o mesmo fiscal da avaliação.
 SELECT a.turma_id,
    p.data,
    p.ta_inicial,
    p.ta_final,
    p.tempos_consumidos,
    'sessao_aplicacao'::text AS origem,
    a.id AS fato_id,
    a.disciplina_id,
    a.instrutor_responsavel_id AS instrutor_id,
    a.fiscal_id,
    p.local,
    a.origem_migracao_v1 IS NOT NULL AND a.editado_em IS NULL AS herdado,
    p.id AS sessao_id,
    p.numero AS numero_sessao
   FROM sessoes_de_aplicacao p
     JOIN avaliacoes a ON a.id = p.avaliacao_id
  WHERE p.status = 'ativo'::status_registro AND p.ta_inicial IS NOT NULL
    AND a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao,
                              'concluida'::status_avaliacao, 'atrasada'::status_avaliacao])
UNION ALL
 SELECT a.turma_id,
    s.data,
    s.ta_inicial,
    s.ta_final,
    s.tempos_consumidos,
    'vista_prova'::text AS origem,
    a.id AS fato_id,
    a.disciplina_id,
    COALESCE(s.conduz_instrutor_id, a.instrutor_responsavel_id) AS instrutor_id,
    a.fiscal_id,
    s.local,
    a.origem_migracao_v1 IS NOT NULL AND a.editado_em IS NULL AS herdado,
    s.id AS sessao_id,
    s.numero AS numero_sessao
   FROM vistas_de_avaliacao s
     JOIN avaliacoes a ON a.id = s.avaliacao_id
  WHERE s.status = 'ativo'::status_registro AND s.ta_inicial IS NOT NULL
    AND a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao,
                              'concluida'::status_avaliacao, 'atrasada'::status_avaliacao])
UNION ALL
 SELECT n.turma_id,
    n.data,
    n.ta_inicial,
    n.ta_final,
    n.tempos_consumidos,
    'atividade_nao_letiva'::text AS origem,
    n.id AS fato_id,
    NULL::uuid AS disciplina_id,
    n.instrutor_id,
    NULL::uuid AS fiscal_id,
    n.local,
    n.origem_migracao_v1 IS NOT NULL AND n.editado_em IS NULL AS herdado,
    NULL::uuid AS sessao_id,
    NULL::smallint AS numero_sessao
   FROM atividades_nao_letivas n
  WHERE n.status = 'ativo'::status_registro AND n.ta_inicial IS NOT NULL;

revoke insert, update, delete, truncate on public.vw_ocupacao_ta from authenticated;

-- ---------------------------------------------------------------- A3. execução da disciplina
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
    LEAST(au.primeira_data, pr.primeira_data) AS data_real_inicio,
    GREATEST(au.ultima_data, pr.ultima_data) AS data_real_termino,
    COALESCE(au.ta, 0::bigint) AS ta_aula_executados,
    COALESCE(pr.ta, 0::bigint) AS ta_avaliacao_executados,
    COALESCE(au.ta, 0::bigint) + COALESCE(pr.ta, 0::bigint) AS ta_executados,
    d.carga_horaria_tempos - COALESCE(au.ta, 0::bigint) - COALESCE(pr.ta, 0::bigint) AS ta_saldo
   FROM disciplinas d
     JOIN turmas t ON t.curso_id = d.curso_id
     LEFT JOIN turma_disciplina td ON td.disciplina_id = d.id AND td.turma_id = t.id AND td.status = 'ativo'::status_registro
     LEFT JOIN aulas au ON au.disciplina_id = d.id AND au.turma_id = t.id
     LEFT JOIN provas pr ON pr.disciplina_id = d.id AND pr.turma_id = t.id
  WHERE d.status = 'ativo'::status_registro;

revoke insert, update, delete, truncate on public.vw_disciplinas_execucao from authenticated;

-- ---------------------------------------------------------------- A3. carga anual do instrutor
create or replace view public.vw_instrutor_carga_anual with (security_invoker = true) as
 WITH vivas AS (
         SELECT a.id, a.instrutor_responsavel_id, a.fiscal_id, a.data_avaliacao, a.tempos_consumidos
           FROM avaliacoes a
          WHERE a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao,
                                      'concluida'::status_avaliacao, 'atrasada'::status_avaliacao])
        ), aplicacoes AS (
         -- RN-AV-12: cada sessão de aplicação, no ano DELA, para o aplicador e o fiscal da avaliação.
         SELECT a_1.instrutor_responsavel_id, a_1.fiscal_id, p.data, p.tempos_consumidos
           FROM sessoes_de_aplicacao p
             JOIN vivas a_1 ON a_1.id = p.avaliacao_id
          WHERE p.status = 'ativo'::status_registro
        UNION ALL
         SELECT a_1.instrutor_responsavel_id, a_1.fiscal_id, a_1.data_avaliacao, a_1.tempos_consumidos
           FROM vivas a_1
        ), fatos AS (
         SELECT r.instrutor_id,
            EXTRACT(year FROM r.data)::smallint AS ano,
            sum(r.tempos_consumidos) AS ta,
            0 AS ta_fiscal
           FROM registros_aula r
          WHERE r.status = 'ativo'::status_registro AND r.instrutor_id IS NOT NULL
          GROUP BY r.instrutor_id, (EXTRACT(year FROM r.data)::smallint)
        UNION ALL
         SELECT ap.instrutor_responsavel_id,
            EXTRACT(year FROM ap.data)::smallint AS "extract",
            sum(COALESCE(ap.tempos_consumidos::integer, 0)) AS sum,
            0
           FROM aplicacoes ap
          GROUP BY ap.instrutor_responsavel_id, (EXTRACT(year FROM ap.data)::smallint)
        UNION ALL
         -- A vista conta para quem a CONDUZ; sem condutor registrado, para o responsável da avaliação.
         SELECT COALESCE(s.conduz_instrutor_id, a_1.instrutor_responsavel_id),
            EXTRACT(year FROM s.data)::smallint AS "extract",
            sum(COALESCE(s.tempos_consumidos::integer, 0)) AS sum,
            0
           FROM vistas_de_avaliacao s
             JOIN vivas a_1 ON a_1.id = s.avaliacao_id
          WHERE s.status = 'ativo'::status_registro
          GROUP BY (COALESCE(s.conduz_instrutor_id, a_1.instrutor_responsavel_id)), (EXTRACT(year FROM s.data)::smallint)
        UNION ALL
         SELECT ap.fiscal_id,
            EXTRACT(year FROM ap.data)::smallint AS "extract",
            0,
            sum(COALESCE(ap.tempos_consumidos::integer, 0)) AS sum
           FROM aplicacoes ap
          WHERE ap.fiscal_id IS NOT NULL
          GROUP BY ap.fiscal_id, (EXTRACT(year FROM ap.data)::smallint)
        ), consolidado AS (
         SELECT fatos.instrutor_id,
            fatos.ano,
            sum(fatos.ta) AS ta_ministrado,
            sum(fatos.ta_fiscal) AS ta_fiscalizado
           FROM fatos
          WHERE fatos.instrutor_id IS NOT NULL
          GROUP BY fatos.instrutor_id, fatos.ano
        ), previstos AS (
         SELECT vw_instrutor_carga_prevista.instrutor_id,
            vw_instrutor_carga_prevista.ano,
            sum(vw_instrutor_carga_prevista.tempos_previstos) AS ta_previsto
           FROM vw_instrutor_carga_prevista
          WHERE vw_instrutor_carga_prevista.ano IS NOT NULL
          GROUP BY vw_instrutor_carga_prevista.instrutor_id, vw_instrutor_carga_prevista.ano
        ), janelas AS (
         SELECT p_1.instrutor_id,
            generate_series(EXTRACT(year FROM p_1.previsao_inicio - 3)::integer, EXTRACT(year FROM p_1.previsao_termino + 3)::integer)::smallint AS ano
           FROM vw_instrutor_carga_prevista p_1
          WHERE p_1.previsao_inicio IS NOT NULL AND p_1.previsao_termino IS NOT NULL AND p_1.previsao_termino >= p_1.previsao_inicio
        ), anos AS (
         SELECT consolidado.instrutor_id,
            consolidado.ano
           FROM consolidado
        UNION
         SELECT previstos.instrutor_id,
            previstos.ano
           FROM previstos
        UNION
         SELECT janelas.instrutor_id,
            janelas.ano
           FROM janelas
        )
 SELECT i.id AS instrutor_id,
    i.codigo AS instrutor_codigo,
    i.posto_graduacao,
    COALESCE(i.nome_guerra, i.nome_completo) AS nome_exibicao,
    i.nome_completo,
    i.om,
    i.dep_divisao,
    i.regime_trabalho,
    i.status,
    app.fn_antiguidade_ordem(i.id) AS ordem_antiguidade,
    a.ano,
    COALESCE(co.ta_ministrado, 0::numeric) AS ta_ministrado_ano,
    COALESCE(co.ta_fiscalizado, 0::numeric) AS ta_fiscalizado_ano,
    app.fn_parametro_numerico(('ch_docente.'::text || i.regime_trabalho::text) || '.min'::text, a.ano) AS faixa_semanal_min,
    app.fn_parametro_numerico(('ch_docente.'::text || i.regime_trabalho::text) || '.max'::text, a.ano) AS faixa_semanal_max,
        CASE
            WHEN i.data_assuncao_setor IS NOT NULL THEN floor((CURRENT_DATE - i.data_assuncao_setor)::numeric / 365.25)::integer
            ELSE NULL::integer
        END AS tempo_setor_anos,
    ( SELECT count(*) AS count
           FROM instrutor_disciplina v
          WHERE v.instrutor_id = i.id AND v.status = 'ativo'::status_registro) AS qtd_disciplinas_habilitadas,
    COALESCE(p.ta_previsto, 0::numeric) AS ta_previsto_ano
   FROM instrutores i
     LEFT JOIN anos a ON a.instrutor_id = i.id
     LEFT JOIN consolidado co ON co.instrutor_id = i.id AND co.ano = a.ano
     LEFT JOIN previstos p ON p.instrutor_id = i.id AND p.ano = a.ano;

revoke insert, update, delete, truncate on public.vw_instrutor_carga_anual from authenticated;

-- ---------------------------------------------------------------- A3. o que trava a vigência
create or replace function app.lancamentos_que_travam_vigencia(p_vigencia_id uuid, p_desde date)
returns table(tipo text, data date, turma text, atividade text, total bigint, ponta_ausente text)
language sql
stable security definer
set search_path = pg_catalog, public
as $$
  with v as (
    select curso_id from public.curso_regime_historico where id = p_vigencia_id
  ),
  achados (a_tipo, a_data, a_turma, a_atividade, a_ponta) as (
    -- ⚠️ A LISTA E A GARANTIA, E ELA ENVELHECE (FR-021.2). Toda tabela nova que passe a depender do
    --    regime entra AQUI, na mesma migration que a cria.
    -- ⚠️ SO O LANCAMENTO ATIVO TRAVA (emenda de 06/10/2026); a avaliacao viva pela LISTA POSITIVA (spec 014).
    select 'aula'::text, r.data, t.codigo, null::text, null::text
      from public.registros_aula r
      join v on v.curso_id = r.curso_id
      left join public.turmas t on t.id = r.turma_id
     where r.data >= p_desde
       and r.status = 'ativo'
    union all
    select 'avaliacao', a.data_avaliacao, t.codigo, null, null
      from public.avaliacoes a
      join v on v.curso_id = a.curso_id
      left join public.turmas t on t.id = a.turma_id
     where a.data_avaliacao >= p_desde
       and a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
    union all
    -- Spec 014 (RN-AV-12, 16/10/2026): a sessao 2..N da aplicacao, com horario proprio.
    select 'sessao_de_aplicacao', p.data, t.codigo, null, null
      from public.sessoes_de_aplicacao p
      join public.avaliacoes a on a.id = p.avaliacao_id
      join v on v.curso_id = a.curso_id
      left join public.turmas t on t.id = a.turma_id
     where p.data >= p_desde
       and p.status = 'ativo'
       and a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
    union all
    -- Spec 014 (R-5): a vista pelas SESSOES, cada uma com horario proprio.
    select 'vista_de_prova', s.data, t.codigo, null, null
      from public.vistas_de_avaliacao s
      join public.avaliacoes a on a.id = s.avaliacao_id
      join v on v.curso_id = a.curso_id
      left join public.turmas t on t.id = a.turma_id
     where s.data >= p_desde
       and s.status = 'ativo'
       and a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
    union all
    select 'atividade', n.data, t.codigo, n.descricao, null
      from public.atividades_nao_letivas n
      join public.turmas t on t.id = n.turma_id
      join v on v.curso_id = t.curso_id
     where n.data >= p_desde
       and n.status = 'ativo'
    union all
    select 'atividade_global', n.data, t.codigo, n.descricao, t.ponta
      from public.atividades_nao_letivas n
      cross join lateral (
        select tu.codigo,
               case when tu.data_inicio is not null and tu.data_termino is null then 'termino'
                    when tu.data_inicio is null and tu.data_termino is not null then 'inicio' end as ponta
          from public.turmas tu
          join v on v.curso_id = tu.curso_id
         where (tu.data_inicio is not null and tu.data_termino is not null
                and n.data between tu.data_inicio and tu.data_termino)
            or (tu.data_inicio is not null and tu.data_termino is null and n.data >= tu.data_inicio)
            or (tu.data_inicio is null and tu.data_termino is not null and n.data <= tu.data_termino)
         order by tu.codigo
         limit 1
      ) t
     where n.turma_id is null and n.data >= p_desde
       and n.status = 'ativo'
  )
  select a.a_tipo, a.a_data, a.a_turma, a.a_atividade, count(*) over () as total, a.a_ponta
    from achados a
   order by a.a_data, a.a_tipo
   limit 1;
$$;

-- ---------------------------------------------------------------- A3. a gravação em transação aceita sessões
create or replace function public.gravar_lancamentos_em_transacao(p_operacoes jsonb)
returns integer
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_op       jsonb;
  v_acao     text;
  v_tabela   text;
  v_campos   jsonb;
  v_id       uuid;
  v_colunas  text;
  v_qtd      integer;
  v_chaves   integer;
  v_linhas   integer;
  v_total    integer := 0;
begin
  if jsonb_typeof(p_operacoes) is distinct from 'array' or jsonb_array_length(p_operacoes) = 0 then
    raise exception 'Operacao invalida para gravar_lancamentos_em_transacao' using errcode = '22023', hint = 'operacoes_invalidas';
  end if;

  for v_op in select o from jsonb_array_elements(p_operacoes) as o loop
    v_acao   := v_op ->> 'acao';
    v_tabela := v_op ->> 'tabela';
    v_campos := v_op -> 'campos';

    -- Spec 014: `vistas_de_avaliacao` (E-5) e `sessoes_de_aplicacao` (E-6, RN-AV-12) andam na mesma transação.
    if v_tabela is null
       or v_tabela not in ('registros_aula', 'avaliacoes', 'atividades_nao_letivas', 'vistas_de_avaliacao',
                           'sessoes_de_aplicacao') then
      raise exception 'Operacao invalida para gravar_lancamentos_em_transacao' using errcode = '22023', hint = 'operacoes_invalidas';
    end if;
    if jsonb_typeof(v_campos) is distinct from 'object' then
      raise exception 'Operacao invalida para gravar_lancamentos_em_transacao' using errcode = '22023', hint = 'operacoes_invalidas';
    end if;

    select string_agg(format('%I', c.column_name), ', ' order by c.ordinal_position), count(*)
      into v_colunas, v_qtd
      from information_schema.columns c
     where c.table_schema = 'public'
       and c.table_name = v_tabela
       and c.is_generated = 'NEVER'
       and c.column_name not in ('criado_por', 'criado_em', 'editado_por', 'editado_em')
       and v_campos ? c.column_name;

    select count(*) into v_chaves from jsonb_object_keys(v_campos);
    if v_qtd = 0 or v_qtd <> v_chaves then
      raise exception 'Operacao invalida para gravar_lancamentos_em_transacao' using errcode = '22023', hint = 'operacoes_invalidas';
    end if;

    if v_acao = 'inserir' then
      execute format(
        'insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1)',
        v_tabela, v_colunas, v_colunas, v_tabela
      ) using v_campos;
    elsif v_acao = 'atualizar' then
      v_id := (v_op ->> 'id')::uuid;
      if v_id is null then
        raise exception 'Operacao invalida para gravar_lancamentos_em_transacao' using errcode = '22023', hint = 'operacoes_invalidas';
      end if;
      execute format(
        'update public.%I set (%s) = (select %s from jsonb_populate_record(null::public.%I, $1)) where id = $2',
        v_tabela, v_colunas, v_colunas, v_tabela
      ) using v_campos, v_id;
      get diagnostics v_linhas = row_count;
      if v_linhas = 0 then
        raise exception 'Lancamento fora do alcance de quem grava' using errcode = '42501', hint = 'lancamento_fora_do_alcance';
      end if;
    else
      raise exception 'Operacao invalida para gravar_lancamentos_em_transacao' using errcode = '22023', hint = 'operacoes_invalidas';
    end if;

    v_total := v_total + 1;
  end loop;

  return v_total;
end
$$;

-- ---------------------------------------------------------------- A1. juntar como sessão da mesma prova
create or replace function public.juntar_como_sessao(p_prova_id uuid, p_avaliacao_id uuid)
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
  -- Gotcha 15: falha FECHADO quando `app.pode` devolve nulo (sem sessão, conta inativa).
  if coalesce(app.pode('avaliacoes_juntar_sessao', 'editar'), false) is not true then
    raise exception 'Só o Admin e o Encarregado juntam uma avaliação como sessão de outra.'
      using errcode = '42501', hint = 'juntar_sem_permissao';
  end if;
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

comment on function public.juntar_como_sessao(uuid, uuid) is
  'Spec 014 (decisão de Bernardo Villas Boas, 16/10/2026): "juntar como sessão da mesma prova", na aba Avaliações da '
  'turma — a avaliação `p_avaliacao_id` vira a próxima sessão de aplicação de `p_prova_id` (mesma turma e disciplina, '
  'no dia dela ou depois), as vistas dela passam para a prova, e ela fica CANCELADA com a marca «[JUNTADA COMO SESSAO '
  'n DE <codigo>]». A trilha (quem, quando, o retrato antes) mora na sessão, imutável. Só Admin e Encarregado '
  '(`avaliacoes_juntar_sessao.editar`). SECURITY INVOKER: a RLS decide o alcance.';

revoke all on function public.juntar_como_sessao(uuid, uuid) from public, anon;
grant execute on function public.juntar_como_sessao(uuid, uuid) to authenticated;
