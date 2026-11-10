-- =====================================================================================================================
-- Bloco 18 (spec 033), M1 — O MÓDULO DE ATIVIDADES: o catálogo, as AEC previstas do currículo, a APOINST planejada, a
-- marcação à mão e as colunas novas do lançamento.
-- Data local: 03/11/2026 (o carimbo do nome é UTC; não renomear).
--
-- > "RA-1 Catálogo de tipos de atividade (lista do sistema, Admin edita) (…) Cada tipo tem classificação PADRÃO
-- > (AEC/TAD/TR), que o operador pode trocar no lançamento. (…) RA-2 AEC previstas pertencem ao CURRÍCULO (RC-1): nome,
-- > tipo, TA previstos, disciplina opcional, obrigatória sim/não. (…) RA-4 Lançamento de atividade no DSA ganha: tipo
-- > (RA-1), 'Conta como' (TA da disciplina escolhida / AEC / TAD / TR), vínculo opcional com uma AEC prevista ou uma
-- > APOINST planejada, Responsável/Palestrante (instrutor cadastrado OU texto livre com nome e OM para externo) (…)
-- > RA-5 (…) marcada à mão pelo trio (Admin/Encarregado/Ajudante) com justificativa obrigatória e trilha (…) RA-6 APOINST:
-- > planejada no módulo Atividades pelo trio, por turma: nome, disciplina, instrutor responsável (designado da
-- > disciplina), período previsto, TA previstos. (…) Só turmas de 2027 em diante." — Bernardo Villas Boas, 03/11/2026
-- > (o texto inteiro em docs/correcoes/regras-de-atividades.md)
--
-- E as decisões da conferência do passo 0 (Bernardo Villas Boas, 03/11/2026): (3) acrescentar Desportiva (AEC), DeCAT
-- (TR), Reforço (TR) e Outra (AEC), sem renomear tipo nenhum; (4) "AUTORIZADO renomear só o rótulo 'Atividade
-- Extracurricular' → 'Atividade Extraclasse' (sem mudar categoria nem lançamento), por migration com o rito completo".
--
-- O que entra, e só isto (SÓ ACRESCENTA — regra 9.4 com a emenda de 19/10/2026; a troca do rótulo é a autorização 4):
--   1. O catálogo: os quatro tipos novos e o rótulo novo. O VALOR «Atividade Extracurricular» não muda — é a chave que o
--      gatilho (`subtipo := valor`), a sincronização (`resolver.py`) e o ETL casam; a tela passa a mostrar o rótulo.
--   2. Dois parâmetros operacionais (regra 8): `apoinst.ano_inicial` (2027) e `atividades.aviso_aec_semanas` (4).
--   3. Um recurso NOVO da matriz, `planejamento_de_atividades`/`editar`, só o trio — junto com as tabelas novas que o
--      leem, como o `ta_fora_do_dsa` do Bloco 2 (D-5 da spec 033). Nenhuma permissão existente muda.
--   4. `aec_previstas_curriculo` (RA-2): no molde de `limites_curriculo` e dos regimes do currículo — o currículo pela FK
--      composta, a versão pelo gatilho de sempre, a RC-6 pelo `app.guardar_curriculo_em_uso` que já existe.
--   5. `apoinst_planejadas` (RA-6): por turma, a disciplina da turma, o instrutor designado nela, o período e os TA; o
--      ano da turma a partir do parâmetro.
--   6. `marcacoes_de_atividade` (RA-5 e a «Concluída à mão» da RA-6): SÓ DE ACRÉSCIMO, no molde de `ajustes_de_avaliacao`.
--   7. `atividades_nao_letivas`: `conta_como`, `atividade_prevista_id`, `apoinst_id`, `responsavel_externo_om` — todas
--      NULAS, com os CHECKs delas e o porteiro do vínculo. ⚠️ NADA LÊ `conta_como` AINDA: quem passa a respeitá-la é a M2
--      (o gatilho da categoria e as views), sob a condição de efeito ZERO (item 1 da conferência).
-- ⚠️ NENHUMA VIEW, FUNÇÃO OU POLICY EXISTENTE MUDA AQUI.
--
-- REVERSÃO (`specs/033-bloco-18-atividades/reversao.sql`): apagar as colunas novas (nascidas aqui, vazias), as três
-- tabelas (recusar se tiverem linha), as funções, as sequências, os parâmetros, o recurso e os quatro tipos sem uso, e
-- devolver o rótulo «Atividade Extracurricular».
-- =====================================================================================================================

-- ---------------------------------------------------------------- 1. o catálogo (RA-1; decisões 3 e 4)
insert into public.config_listas (lista, valor, rotulo_exibicao, ordem, ativo, metadados)
select 'tipos_atividade', t.valor, t.valor, t.ordem, true, jsonb_build_object('categoria', t.categoria)
  from (values
    ('Desportiva', 936::smallint, 'AEC'),
    ('DeCAT',      937::smallint, 'TR'),
    ('Reforço',    938::smallint, 'TR'),
    ('Outra',      939::smallint, 'AEC')
  ) as t(valor, ordem, categoria)
on conflict (lista, valor) do nothing;

-- Só o RÓTULO (autorização 4). `metadados` não é tocado, e por isso o gatilho de recategorização (que dispara em
-- `update of metadados`) não roda; nenhum lançamento muda.
update public.config_listas
   set rotulo_exibicao = 'Atividade Extraclasse'
 where lista = 'tipos_atividade' and valor = 'Atividade Extracurricular';

-- ---------------------------------------------------------------- 2. os parâmetros (regra 8)
insert into public.config_parametros
  (chave, valor, tipo, unidade, natureza, descricao, fundamento_normativo, editavel_por, status)
select 'apoinst.ano_inicial', '2027', 'inteiro', 'ano', 'operacional',
       'Bloco 18 (spec 033), RA-6: a APOINST planejada vale para turmas deste ano letivo em diante; as anteriores ficam '
       'como estão, sem retroajuste (decisão de Bernardo Villas Boas, 03/11/2026).',
       null, 'encarregado_administracao_academica', 'ativo'
 where not exists (select 1 from public.config_parametros where chave = 'apoinst.ano_inicial' and status = 'ativo');

insert into public.config_parametros
  (chave, valor, tipo, unidade, natureza, descricao, fundamento_normativo, editavel_por, status)
select 'atividades.aviso_aec_semanas', '4', 'inteiro', 'semanas', 'operacional',
       'Bloco 18 (spec 033), RA-8: o sininho avisa a AEC obrigatória do currículo ainda não cumprida a partir de este '
       'número de semanas antes do término da turma.',
       null, 'encarregado_administracao_academica', 'ativo'
 where not exists (select 1 from public.config_parametros
                    where chave = 'atividades.aviso_aec_semanas' and status = 'ativo');

-- ---------------------------------------------------------------- 3. o recurso do trio (D-5)
insert into public.perfil_permissao (perfil, recurso, acao, permitido, observacao)
select p, 'planejamento_de_atividades', 'editar',
       p in ('admin', 'encarregado_administracao_academica', 'ajudante_administracao_academica'),
       'Bloco 18 (spec 033), RA-5 e RA-6: planeja a APOINST da turma e marca à mão a AEC prevista cumprida e a APOINST '
       'concluída. Admin, Encarregado e Ajudante da Administração Acadêmica.'
  from unnest(enum_range(null::public.perfil_usuario)) as p
on conflict (perfil, recurso, acao) do update set permitido = excluded.permitido, observacao = excluded.observacao;

-- ---------------------------------------------------------------- 4. as sequências de código (gotcha 9 e 5.1)
create sequence app.aec_previstas_curriculo_codigo_seq as bigint;
select setval('app.aec_previstas_curriculo_codigo_seq', 1, false);
create or replace function app.proximo_codigo_aec_prevista()
returns text language sql security definer set search_path = pg_catalog, public as $$
  select 'AEP-' || lpad(nextval('app.aec_previstas_curriculo_codigo_seq')::text, 6, '0');
$$;
revoke all on function app.proximo_codigo_aec_prevista() from public, anon;
grant execute on function app.proximo_codigo_aec_prevista() to authenticated, service_role;

create sequence app.apoinst_planejadas_codigo_seq as bigint;
select setval('app.apoinst_planejadas_codigo_seq', 1, false);
create or replace function app.proximo_codigo_apoinst()
returns text language sql security definer set search_path = pg_catalog, public as $$
  select 'APO-' || lpad(nextval('app.apoinst_planejadas_codigo_seq')::text, 6, '0');
$$;
revoke all on function app.proximo_codigo_apoinst() from public, anon;
grant execute on function app.proximo_codigo_apoinst() to authenticated, service_role;

create sequence app.marcacoes_de_atividade_codigo_seq as bigint;
select setval('app.marcacoes_de_atividade_codigo_seq', 1, false);
create or replace function app.proximo_codigo_marcacao_de_atividade()
returns text language sql security definer set search_path = pg_catalog, public as $$
  select 'MAT-' || lpad(nextval('app.marcacoes_de_atividade_codigo_seq')::text, 6, '0');
$$;
revoke all on function app.proximo_codigo_marcacao_de_atividade() from public, anon;
grant execute on function app.proximo_codigo_marcacao_de_atividade() to authenticated, service_role;

-- ---------------------------------------------------------------- 5. as AEC previstas do currículo (RA-2)
create table public.aec_previstas_curriculo (
  id                 uuid primary key default gen_random_uuid(),
  codigo             text not null unique default app.proximo_codigo_aec_prevista(),
  curso_id           uuid not null references public.cursos(id) on delete restrict,
  curriculo_id       uuid not null,
  linhagem_id        uuid not null default gen_random_uuid(),
  nome               text not null check (length(btrim(nome)) between 1 and 200),
  tipo_atividade_id  uuid not null references public.config_listas(id) on delete restrict,
  ta_previstos       smallint check (ta_previstos is null or ta_previstos between 1 and 999),
  disciplina_id      uuid references public.disciplinas(id) on delete restrict,
  obrigatoria        boolean not null default true,
  ordem              smallint not null default 0,
  fonte_arquivo      text,
  fonte_pagina       text,
  observacao         text check (observacao is null or length(observacao) <= 1000),
  status             public.status_registro not null default 'ativo',
  origem_migracao_v1 text,
  criado_por         uuid,
  criado_em          timestamptz not null default now(),
  editado_por        uuid,
  editado_em         timestamptz,
  constraint aec_previstas_do_curriculo_do_curso_fk
    foreign key (curriculo_id, curso_id) references public.curriculos (id, curso_id) on delete restrict
);

comment on table public.aec_previstas_curriculo is
  'Bloco 18 (spec 033), RA-2: as AEC PREVISTAS do currículo — as palestras e visitas que o currículo nomeia, com o tipo '
  '(do catálogo, classificação AEC), os TA previstos (vazio quando o currículo não diz), a disciplina (opcional, do mesmo '
  'currículo) e se é obrigatória. A turma as herda pelo currículo dela, como "a cumprir" (RA-3); nada se copia para a '
  'turma. No currículo em uso, mudar é correção RC-6 (justificativa e trilha). Só informativo (regra 6).';
comment on column public.aec_previstas_curriculo.ta_previstos is
  'Bloco 18: os TA que o currículo prevê (1 h = 1 TA). NULO quando o currículo não diz — "não definido", nunca zero '
  '(RN-DEG-01; item 6 da conferência do passo 0).';
comment on column public.aec_previstas_curriculo.linhagem_id is
  'Bloco 18: a mesma AEC prevista em currículos diferentes (a cópia do currículo herda a linhagem, RC-7).';
comment on column public.aec_previstas_curriculo.fonte_pagina is
  'Bloco 18: a página do PDF do currículo, como o PDF a escreve (ex.: "A-74 (Anexo B)").';

create index aec_previstas_curriculo_curriculo_idx on public.aec_previstas_curriculo (curriculo_id, ordem);
create index aec_previstas_curriculo_linhagem_idx on public.aec_previstas_curriculo (linhagem_id);

-- O guarda: o tipo é do catálogo e de classificação AEC; a disciplina é do mesmo currículo; o currículo e a linhagem não
-- mudam depois de gravados. ⚠️ Roda ANTES do gatilho `versao` (ordem alfabética: "guarda" < "versao"): sem
-- `curriculo_id`, resolve o único ativo do curso como ele (e deixa a recusa para ele, quando há mais de um).
create or replace function app.guardar_aec_prevista()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_curriculo uuid := new.curriculo_id;
  v_categoria text;
begin
  if tg_op = 'UPDATE' and (new.curriculo_id is distinct from old.curriculo_id
                           or new.curso_id is distinct from old.curso_id
                           or new.linhagem_id is distinct from old.linhagem_id) then
    raise exception 'A AEC prevista não muda de currículo: desative-a e cadastre outra no currículo certo.'
      using errcode = '23514', hint = 'aec_prevista_de_outro_curriculo';
  end if;
  -- ⚠️ SÓ QUANDO O TIPO NASCE OU MUDA (achado da revisão do Bloco 18): conferir em todo UPDATE travaria a edição e a
  --    desativação da AEC prevista cujo tipo o Admin reclassificou depois no catálogo.
  if tg_op = 'INSERT' or new.tipo_atividade_id is distinct from old.tipo_atividade_id then
    select c.metadados ->> 'categoria' into v_categoria
      from public.config_listas c where c.id = new.tipo_atividade_id and c.lista = 'tipos_atividade';
    if v_categoria is distinct from 'AEC' then
      raise exception 'A AEC prevista tem de ser de um tipo de atividade de classificação AEC.'
        using errcode = '23514', hint = 'aec_prevista_tipo_sem_aec';
    end if;
  end if;
  if new.disciplina_id is not null then
    if v_curriculo is null then
      select (array_agg(c.id))[1] into v_curriculo
        from public.curriculos c where c.curso_id = new.curso_id and c.status = 'ativo'
      having count(*) = 1;
    end if;
    if not exists (select 1 from public.disciplinas d
                    where d.id = new.disciplina_id and d.curriculo_id is not distinct from v_curriculo) then
      raise exception 'A disciplina não é deste currículo.'
        using errcode = '23514', hint = 'disciplina_de_outra_versao';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function app.guardar_aec_prevista() from public, anon, authenticated;

create trigger trg_aec_previstas_curriculo_auditoria before insert or update on public.aec_previstas_curriculo
  for each row execute function app.set_auditoria();
create trigger trg_aec_previstas_curriculo_curriculo_em_uso before insert or update on public.aec_previstas_curriculo
  for each row execute function app.guardar_curriculo_em_uso();
create trigger trg_aec_previstas_curriculo_guarda before insert or update on public.aec_previstas_curriculo
  for each row execute function app.guardar_aec_prevista();
create trigger trg_aec_previstas_curriculo_versao before insert on public.aec_previstas_curriculo
  for each row execute function app.versao_unica_do_curso();

alter table public.aec_previstas_curriculo enable row level security;

create policy aec_previstas_curriculo_ler on public.aec_previstas_curriculo
  for select to authenticated
  using (coalesce(app.pode('cursos', 'ler'), false) and app.alcanca_curso(curso_id));
create policy aec_previstas_curriculo_criar on public.aec_previstas_curriculo
  for insert to authenticated
  with check (coalesce(app.pode('cursos', 'editar'), false)
              and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));
create policy aec_previstas_curriculo_editar on public.aec_previstas_curriculo
  for update to authenticated
  using      (coalesce(app.pode('cursos', 'editar'), false)
              and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id))
  with check (coalesce(app.pode('cursos', 'editar'), false)
              and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));

revoke delete, truncate on public.aec_previstas_curriculo from authenticated, anon;

-- ---------------------------------------------------------------- 6. a APOINST planejada da turma (RA-6)
create table public.apoinst_planejadas (
  id                 uuid primary key default gen_random_uuid(),
  codigo             text not null unique default app.proximo_codigo_apoinst(),
  turma_id           uuid not null references public.turmas(id) on delete restrict,
  disciplina_id      uuid not null references public.disciplinas(id) on delete restrict,
  instrutor_id       uuid not null references public.instrutores(id) on delete restrict,
  nome               text not null check (length(btrim(nome)) between 1 and 200),
  inicio_previsto    date not null,
  fim_previsto       date not null,
  ta_previstos       smallint not null check (ta_previstos between 1 and 999),
  observacao         text check (observacao is null or length(observacao) <= 1000),
  status             public.status_registro not null default 'ativo',
  origem_migracao_v1 text,
  criado_por         uuid,
  criado_em          timestamptz not null default now(),
  editado_por        uuid,
  editado_em         timestamptz,
  constraint apoinst_periodo_valido check (fim_previsto >= inicio_previsto),
  -- ⚠️ CHECK que chama função: `app.disciplina_e_da_turma` já tem `grant execute` a authenticated e service_role
  --    (gotcha 5.1), e o `coalesce` fecha o NULO (gotcha 15).
  constraint apoinst_disciplina_da_turma check (coalesce(app.disciplina_e_da_turma(disciplina_id, turma_id), false))
);

comment on table public.apoinst_planejadas is
  'Bloco 18 (spec 033), RA-6: a APOINST PLANEJADA da turma — nome, disciplina da turma, instrutor responsável (designado '
  'na disciplina), período e TA previstos. A execução são os lançamentos do DSA vinculados (`atividades_nao_letivas.'
  'apoinst_id`); a situação (Planejada, Em andamento, Concluída, Atrasada) é DERIVADA em lib/dominio, nunca gravada. Só '
  'turmas do ano `apoinst.ano_inicial` em diante.';

create index apoinst_planejadas_turma_idx on public.apoinst_planejadas (turma_id, inicio_previsto);

-- O guarda: o ano da turma a partir do parâmetro (o parâmetro ausente não restringe — RN-DEG-01); o instrutor designado
-- na disciplina da turma; a turma não muda depois de gravada.
create or replace function app.guardar_apoinst_planejada()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_ano     smallint;
  v_inicial numeric;
begin
  if tg_op = 'UPDATE' and new.turma_id is distinct from old.turma_id then
    raise exception 'A APOINST não muda de turma: desative-a e cadastre outra na turma certa.'
      using errcode = '23514', hint = 'apoinst_de_outra_turma';
  end if;
  if tg_op = 'INSERT' then
    select t.ano_letivo into v_ano from public.turmas t where t.id = new.turma_id;
    v_inicial := app.fn_parametro_numerico('apoinst.ano_inicial', v_ano);
    if v_inicial is not null and v_ano < v_inicial then
      raise exception 'A APOINST planejada vale para turmas de % em diante; as anteriores ficam como estão.', v_inicial
        using errcode = '23514', hint = 'apoinst_antes_do_ano_inicial';
    end if;
  end if;
  if tg_op = 'INSERT' or new.instrutor_id is distinct from old.instrutor_id
     or new.disciplina_id is distinct from old.disciplina_id then
    if not exists (select 1
                     from public.turma_disciplina td
                     join public.turma_disciplina_instrutor tdi on tdi.turma_disciplina_id = td.id
                    where td.turma_id = new.turma_id and td.disciplina_id = new.disciplina_id
                      and td.status = 'ativo' and tdi.status = 'ativo' and tdi.instrutor_id = new.instrutor_id) then
      raise exception 'O instrutor responsável tem de ser designado na disciplina desta turma.'
        using errcode = '23514', hint = 'apoinst_instrutor_nao_designado';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function app.guardar_apoinst_planejada() from public, anon, authenticated;

create trigger trg_apoinst_planejadas_auditoria before insert or update on public.apoinst_planejadas
  for each row execute function app.set_auditoria();
create trigger trg_apoinst_planejadas_guarda before insert or update on public.apoinst_planejadas
  for each row execute function app.guardar_apoinst_planejada();

alter table public.apoinst_planejadas enable row level security;

create policy apoinst_planejadas_ler on public.apoinst_planejadas
  for select to authenticated
  using (coalesce(app.pode('atividades_nao_letivas', 'ler'), false) and app.alcanca_turma(turma_id));
create policy apoinst_planejadas_criar on public.apoinst_planejadas
  for insert to authenticated
  with check (coalesce(app.pode('planejamento_de_atividades', 'editar'), false)
              and app.alcanca_turma(turma_id) and app.turma_em_oferta(turma_id));
create policy apoinst_planejadas_editar on public.apoinst_planejadas
  for update to authenticated
  using      (coalesce(app.pode('planejamento_de_atividades', 'editar'), false)
              and app.alcanca_turma(turma_id) and app.turma_em_oferta(turma_id))
  with check (coalesce(app.pode('planejamento_de_atividades', 'editar'), false)
              and app.alcanca_turma(turma_id) and app.turma_em_oferta(turma_id));

revoke delete, truncate on public.apoinst_planejadas from authenticated, anon;

-- ---------------------------------------------------------------- 7. a marcação à mão (RA-5; a «Concluída à mão» da RA-6)
create table public.marcacoes_de_atividade (
  id                    uuid primary key default gen_random_uuid(),
  codigo                text not null unique default app.proximo_codigo_marcacao_de_atividade(),
  turma_id              uuid not null references public.turmas(id) on delete restrict,
  atividade_prevista_id uuid references public.aec_previstas_curriculo(id) on delete restrict,
  apoinst_id            uuid references public.apoinst_planejadas(id) on delete restrict,
  situacao              text not null check (situacao in ('cumprida', 'a_cumprir')),
  data_realizada        date,
  justificativa         text not null check (length(btrim(justificativa)) >= 10 and length(justificativa) <= 1000),
  autor_nome            text,
  status                public.status_registro not null default 'ativo',
  origem_migracao_v1    text,
  criado_por            uuid,
  criado_em             timestamptz not null default now(),
  editado_por           uuid,
  editado_em            timestamptz,
  constraint marcacoes_de_atividade_um_alvo check (num_nonnulls(atividade_prevista_id, apoinst_id) = 1)
);

comment on table public.marcacoes_de_atividade is
  'Bloco 18 (spec 033), RA-5 e RA-6: a marcação À MÃO pelo trio — a AEC prevista da turma "cumprida" (ou desfeita, '
  '"a_cumprir") e a APOINST "concluída" (ou reaberta) —, com justificativa (>= 10) e autor. SÓ DE ACRÉSCIMO: a mais '
  'recente vale, as anteriores são o histórico na linha. Não muda CH (nenhuma view a lê).';

create index marcacoes_de_atividade_turma_idx on public.marcacoes_de_atividade (turma_id, criado_em);

create or replace function app.guardar_marcacao_de_atividade()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op <> 'INSERT' then
    raise exception 'A marcação à mão não se reescreve: grave uma marcação nova.'
      using errcode = '42501', hint = 'marcacao_de_atividade_imutavel';
  end if;
  -- O alvo é da turma: a AEC prevista pelo currículo da turma; a APOINST pela própria turma.
  if new.atividade_prevista_id is not null then
    if not exists (select 1 from public.aec_previstas_curriculo p join public.turmas t on t.curriculo_id = p.curriculo_id
                    where p.id = new.atividade_prevista_id and t.id = new.turma_id) then
      raise exception 'A AEC prevista não é do currículo desta turma.'
        using errcode = '23514', hint = 'marcacao_fora_da_turma';
    end if;
  elsif not exists (select 1 from public.apoinst_planejadas a
                     where a.id = new.apoinst_id and a.turma_id = new.turma_id) then
    raise exception 'A APOINST não é desta turma.' using errcode = '23514', hint = 'marcacao_fora_da_turma';
  end if;
  -- O autor é o cadastro da sessão (nome de exibição, senão o nome); sem sessão (script), fica nulo.
  select coalesce(nullif(btrim(u.nome_exibicao), ''), u.nome) into new.autor_nome
    from public.usuarios u where u.auth_user_id = auth.uid();
  return new;
end;
$$;
revoke all on function app.guardar_marcacao_de_atividade() from public, anon, authenticated;

create trigger trg_marcacoes_de_atividade_auditoria before insert or update on public.marcacoes_de_atividade
  for each row execute function app.set_auditoria();
create trigger trg_marcacoes_de_atividade_guarda before insert or update on public.marcacoes_de_atividade
  for each row execute function app.guardar_marcacao_de_atividade();

alter table public.marcacoes_de_atividade enable row level security;

create policy marcacoes_de_atividade_ler on public.marcacoes_de_atividade
  for select to authenticated
  using (coalesce(app.pode('atividades_nao_letivas', 'ler'), false) and app.alcanca_turma(turma_id));
create policy marcacoes_de_atividade_criar on public.marcacoes_de_atividade
  for insert to authenticated
  with check (coalesce(app.pode('planejamento_de_atividades', 'editar'), false)
              and app.alcanca_turma(turma_id) and app.turma_em_oferta(turma_id));

-- ⚠️ O `DELETE` da `service_role` fica (como em toda tabela do sistema, e como nos ajustes de avaliação): é o que deixa
--    as amostras de teste saírem, já que as FKs são `restrict`.
revoke update, delete, truncate on public.marcacoes_de_atividade from authenticated, anon;

-- ---------------------------------------------------------------- 8. as colunas novas do lançamento (RA-4)
alter table public.atividades_nao_letivas
  add column conta_como            text,
  add column atividade_prevista_id uuid references public.aec_previstas_curriculo(id) on delete restrict,
  add column apoinst_id            uuid references public.apoinst_planejadas(id) on delete restrict,
  add column responsavel_externo_om text;

comment on column public.atividades_nao_letivas.conta_como is
  'Bloco 18 (spec 033), RA-4 e decisão 1 da conferência do passo 0: COMO a atividade conta, escolhido pelo operador — '
  '"CHD" (TA da disciplina: soma na CHD da turma e da disciplina e na carga do instrutor, como aula, e sai da AEC/TAD/TR), '
  '"AEC", "TAD" ou "TR". NULA = a classificação padrão do tipo. Quem a respeita é o gatilho da categoria e as views (M2).';
comment on column public.atividades_nao_letivas.atividade_prevista_id is
  'Bloco 18, RA-4/RA-5: a AEC prevista do currículo da turma que este lançamento cumpre (opcional).';
comment on column public.atividades_nao_letivas.apoinst_id is
  'Bloco 18, RA-4/RA-6: a APOINST planejada da turma que este lançamento executa (opcional).';
comment on column public.atividades_nao_letivas.responsavel_externo_om is
  'Bloco 18, RA-4: a OM do palestrante ou responsável EXTERNO (o nome segue em `responsavel_externo`).';

alter table public.atividades_nao_letivas
  add constraint ativ_conta_como_valido
    check (conta_como is null or conta_como in ('CHD', 'AEC', 'TAD', 'TR')),
  add constraint ativ_conta_como_chd_com_disciplina
    check (conta_como is distinct from 'CHD' or (disciplina_id is not null and turma_id is not null)),
  add constraint ativ_conta_como_sem_bloqueio
    check (conta_como is null or not bloqueia_aula),
  add constraint ativ_conta_como_com_tipo
    check (conta_como is null or tipo_atividade_id is not null),
  add constraint ativ_um_vinculo
    check (num_nonnulls(atividade_prevista_id, apoinst_id) <= 1),
  add constraint ativ_vinculo_so_de_turma
    check ((atividade_prevista_id is null and apoinst_id is null) or turma_id is not null),
  add constraint ativ_om_so_do_externo
    check (responsavel_externo_om is null
           or (responsavel_externo is not null and length(btrim(responsavel_externo_om)) between 1 and 120));

create index idx_ativ_atividade_prevista on public.atividades_nao_letivas (atividade_prevista_id)
  where atividade_prevista_id is not null;
create index idx_ativ_apoinst on public.atividades_nao_letivas (apoinst_id) where apoinst_id is not null;

-- O porteiro do vínculo: a AEC prevista é do currículo da turma; a APOINST é da turma; as duas ativas — conferido quando o
-- vínculo NASCE ou MUDA.
-- ⚠️ A SOMBRA DO RASCUNHO NÃO É VÍNCULO NOVO (achado da revisão do Bloco 18): para editar ou excluir um lançamento SALVO,
--    `gravar_rascunho_do_dsa` primeiro INSERE a sombra copiando todas as colunas, o vínculo inclusive. Conferida como
--    vínculo novo, a sombra de um lançamento ligado a AEC prevista ou APOINST que o trio DESATIVOU depois seria recusada —
--    e o lançamento ficaria sem edição nem exclusão. A sombra que mantém o vínculo e a turma do salvo passa.
create or replace function app.conferir_vinculo_da_atividade()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_origem          record;
  v_mesma_prevista  boolean := false;
  v_mesma_apoinst   boolean := false;
begin
  if tg_op = 'INSERT' and new.rascunho_de is not null then
    select o.atividade_prevista_id, o.apoinst_id, o.turma_id into v_origem
      from public.atividades_nao_letivas o where o.id = new.rascunho_de;
    if found then
      v_mesma_prevista := v_origem.atividade_prevista_id is not distinct from new.atividade_prevista_id
                          and v_origem.turma_id is not distinct from new.turma_id;
      v_mesma_apoinst := v_origem.apoinst_id is not distinct from new.apoinst_id
                         and v_origem.turma_id is not distinct from new.turma_id;
    end if;
  end if;
  if new.atividade_prevista_id is not null and not v_mesma_prevista
     and (tg_op = 'INSERT' or new.atividade_prevista_id is distinct from old.atividade_prevista_id
          or new.turma_id is distinct from old.turma_id) then
    if not exists (select 1 from public.aec_previstas_curriculo p join public.turmas t on t.curriculo_id = p.curriculo_id
                    where p.id = new.atividade_prevista_id and t.id = new.turma_id and p.status = 'ativo') then
      raise exception 'A AEC prevista escolhida não é do currículo desta turma (ou está desativada).'
        using errcode = '23514', hint = 'vinculo_fora_do_curriculo_da_turma';
    end if;
  end if;
  if new.apoinst_id is not null and not v_mesma_apoinst
     and (tg_op = 'INSERT' or new.apoinst_id is distinct from old.apoinst_id
          or new.turma_id is distinct from old.turma_id) then
    if not exists (select 1 from public.apoinst_planejadas a
                    where a.id = new.apoinst_id and a.turma_id = new.turma_id and a.status = 'ativo') then
      raise exception 'A APOINST escolhida não é desta turma (ou está desativada).'
        using errcode = '23514', hint = 'vinculo_fora_da_turma';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function app.conferir_vinculo_da_atividade() from public, anon, authenticated;

create trigger trg_atividades_vinculo before insert or update on public.atividades_nao_letivas
  for each row execute function app.conferir_vinculo_da_atividade();
