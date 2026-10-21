-- =================================================================================
-- Spec 021 · Bloco 6 — o CURRÍCULO VERSIONADO, M1: a estrutura que SÓ ACRESCENTA
-- Data local: 21/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- Pedido de Bernardo Villas Boas, 16/10/2026: *"poder registrar um currículo NOVO de um curso — disciplinas, UEs, CH,
--   avaliações do currículo, duração em semanas, tudo o que for preciso — SEM alterar o currículo em vigor. (…) eu
--   cadastro esse currículo novo, planejo as turmas do ano seguinte por ele, e as turmas em andamento continuam
--   regidas pelo currículo atual, sem nenhum acompanhamento estragado."*
--
-- O que faz (nada aqui muda dado existente nem o que uma tela lê — o portão é da M2, `…030050`):
--   1. `public.curriculos` — a VERSÃO do currículo de um curso: número, vigência (a partir de que data), descrição do
--      que muda e de que versão foi copiada. Código `CRV-NNNNNN`. Inativar, nunca apagar (regra 4).
--   2. As colunas NULÁVEIS que a M2 preenche e amarra: `curriculo_id` em `disciplinas`, `limites_curriculo` e `turmas`;
--      `linhagem_id` em `disciplinas`, `unidades_ensino` e `avaliacoes_curriculo` (a mesma disciplina, UE ou avaliação
--      em versões diferentes tem a MESMA linhagem — é o que permite levar o planejamento de uma turma ao trocar de
--      versão, e comparar versões).
--   3. As funções: a versão vigente numa data, a versão padrão de uma turma (para a tela) e se uma versão está em uso
--      por turma com lançamento.
-- ⚠️ A CÓPIA DE UMA VERSÃO (`public.criar_versao_do_curriculo`) NÃO ESTÁ AQUI, de propósito: ela entra no PR 2, junto
--    com os leitores do código que sabem distinguir duas versões. Antes deles, uma versão 2 criada à mão misturaria as
--    duas no DSA, na planilha e na aba Disciplinas.
--
-- ⚠️ Nada aqui lê data do servidor (D20): a vigência é resolvida pela data que quem chama passa.
-- ⚠️ A unidade de ensino e a avaliação do currículo NÃO ganham `curriculo_id`: a versão delas é a da disciplina (uma
--    segunda coluna seria uma segunda fonte de verdade).
--
-- Reversão (sem versão além da 1 e com a M2 já revertida): `drop function public.curriculo_padrao_da_turma`,
--   `app.curriculo_em_uso_com_lancamento`, `app.curriculo_vigente`;
--   `alter table … drop column` das seis colunas; `drop table public.curriculos`; a função e a sequência do código.
--   O roteiro executável e provado é `specs/021-bloco-6-curriculo-versionado/reversao.sql`.
-- =================================================================================

-- ---------------------------------------------------------------- 1. o código CRV-
-- Gotcha 5.1: o DEFAULT roda com os direitos de quem insere.
create sequence app.curriculos_codigo_seq as bigint;
select setval('app.curriculos_codigo_seq', 1, false);

create or replace function app.proximo_codigo_curriculo()
returns text language sql security definer set search_path = pg_catalog, public as $$
  select 'CRV-' || lpad(nextval('app.curriculos_codigo_seq')::text, 6, '0');
$$;
revoke all on function app.proximo_codigo_curriculo() from public, anon;
grant execute on function app.proximo_codigo_curriculo() to authenticated, service_role;

-- ---------------------------------------------------------------- 2. a tabela das versões
create table public.curriculos (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique default app.proximo_codigo_curriculo(),
  curso_id            uuid not null references public.cursos(id) on delete restrict,
  versao              smallint not null check (versao >= 1),
  -- A partir de que data esta versão rege as turmas NOVAS (a turma escolhe pela data de início). A versão 1 vale
  -- "desde sempre": 01/01/2020, o primeiro ano que `turmas_ano_valido` aceita.
  vigente_de          date not null,
  descricao           text check (descricao is null or length(btrim(descricao)) between 1 and 500),
  -- A duração da VERSÃO (o pedido: "um currículo com 3 semanas a menos"). NULA = a do curso (`cursos.duracao_*`), que
  -- é o caso da versão 1: assim não nasce uma segunda fonte de verdade para o currículo de hoje.
  duracao_semanas     numeric check (duracao_semanas is null or duracao_semanas > 0),
  duracao_dias        integer check (duracao_dias is null or duracao_dias > 0),
  copiada_de          uuid references public.curriculos(id) on delete restrict,
  status              public.status_registro not null default 'ativo',
  origem_migracao_v1  text,
  criado_por          uuid,
  criado_em           timestamptz not null default now(),
  editado_por         uuid,
  editado_em          timestamptz,

  constraint curriculos_versao_no_curso_key unique (curso_id, versao),
  -- O alvo das FKs compostas: a versão e o curso dela.
  constraint curriculos_id_curso_key unique (id, curso_id)
);

comment on table public.curriculos is
  'Bloco 6 (spec 021): as VERSÕES do currículo de um curso. A versão é dona das disciplinas (e, por elas, das UEs e '
  'das avaliações do currículo) e dos limites de AEC/TAD/TR. Toda turma segue UMA versão (`turmas.curriculo_id`), '
  'escolhida ao nascer pela vigência na data de início; a escolha trava no primeiro lançamento. A versão em uso por '
  'turma com lançamento não muda número nenhum (RF-HOR-05). Inativar, nunca apagar.';
comment on column public.curriculos.vigente_de is
  'A partir de que data a versão rege as turmas novas: a turma nasce na versão de maior `vigente_de` <= a data de início '
  'dela (sem data, 1º de janeiro do ano letivo). A versão 1 de todo curso vale desde 01/01/2020.';
comment on column public.curriculos.duracao_semanas is
  'A duração em semanas desta versão; NULA = a do curso (cursos.duracao_semanas). A versão 1 nasce nula.';
comment on column public.curriculos.copiada_de is
  'A versão de que esta foi copiada (`public.criar_versao_do_curriculo`). Nula na versão 1.';

-- Duas versões ativas do mesmo curso não começam no mesmo dia: a vigência tem de decidir uma só.
create unique index curriculos_um_inicio_por_curso_uq
  on public.curriculos (curso_id, vigente_de) where status = 'ativo';
create index curriculos_curso_idx on public.curriculos (curso_id);

create trigger trg_curriculos_auditoria before insert or update on public.curriculos
  for each row execute function app.set_auditoria();

alter table public.curriculos enable row level security;

-- Quem lê o curso lê as versões dele.
create policy curriculos_ler on public.curriculos for select to authenticated
  using (app.pode('cursos', 'ler') and app.alcanca_curso(curso_id));
-- Editar o cabeçalho da versão (vigência, descrição, situação) é editar o currículo: o mesmo direito das disciplinas.
create policy curriculos_editar on public.curriculos for update to authenticated
  using (coalesce(app.pode('disciplinas', 'editar'), false) and app.alcanca_curso(curso_id)
         and app.curso_em_oferta(curso_id))
  with check (coalesce(app.pode('disciplinas', 'editar'), false) and app.alcanca_curso(curso_id)
              and app.curso_em_oferta(curso_id));
-- ⚠️ NENHUMA policy de INSERT nem de DELETE: a versão nasce só pela cópia (`public.criar_versao_do_curriculo`, com
--    porteiro) e nunca sai (regra 4).
revoke all on public.curriculos from anon;
revoke insert, delete, truncate on public.curriculos from authenticated;
grant select, update (vigente_de, descricao, duracao_semanas, duracao_dias, status) on public.curriculos to authenticated;

-- ---------------------------------------------------------------- 3. as colunas que a M2 preenche e amarra
alter table public.disciplinas add column curriculo_id uuid;
alter table public.disciplinas add column linhagem_id uuid;
alter table public.unidades_ensino add column linhagem_id uuid;
alter table public.avaliacoes_curriculo add column linhagem_id uuid;
alter table public.limites_curriculo add column curriculo_id uuid;
alter table public.turmas add column curriculo_id uuid;

comment on column public.disciplinas.curriculo_id is
  'Bloco 6 (spec 021): a versão do currículo a que a disciplina pertence. A UE e a avaliação do currículo herdam dela.';
comment on column public.disciplinas.linhagem_id is
  'Bloco 6 (spec 021): a mesma disciplina em versões diferentes tem a mesma linhagem (a cópia leva a da original).';
comment on column public.unidades_ensino.linhagem_id is
  'Bloco 6 (spec 021): a mesma UE em versões diferentes tem a mesma linhagem.';
comment on column public.avaliacoes_curriculo.linhagem_id is
  'Bloco 6 (spec 021): a mesma avaliação do currículo em versões diferentes tem a mesma linhagem.';
comment on column public.limites_curriculo.curriculo_id is
  'Bloco 6 (spec 021): a versão do currículo que declara este limite de AEC/TAD/TR.';
comment on column public.turmas.curriculo_id is
  'Bloco 6 (spec 021): a versão do currículo que rege esta turma — as disciplinas, UEs, avaliações e limites dela. '
  'Escolhida ao nascer pela vigência na data de início; trava no primeiro lançamento (RF-HOR-05).';

-- ---------------------------------------------------------------- 4. as funções
-- A versão vigente de um curso numa data: a de maior `vigente_de` <= a data, entre as ativas. Sem nenhuma (data
-- anterior à primeira vigência), a primeira. A data é de quem chama (D20: nada de relógio do servidor).
create or replace function app.curriculo_vigente(p_curso_id uuid, p_data date)
returns uuid
language sql
stable security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    (select c.id from public.curriculos c
      where c.curso_id = p_curso_id and c.status = 'ativo' and c.vigente_de <= p_data
      order by c.vigente_de desc limit 1),
    (select c.id from public.curriculos c
      where c.curso_id = p_curso_id and c.status = 'ativo'
      order by c.vigente_de, c.versao limit 1));
$$;
revoke all on function app.curriculo_vigente(uuid, date) from public, anon, authenticated;

-- A versão padrão de uma turma nova, para a tela oferecer antes de gravar: a vigente na data de início, ou em 1º de
-- janeiro do ano letivo quando a data não vem. ⚠️ É a MESMA regra do gatilho de nascimento da turma (M2) — uma só.
create or replace function public.curriculo_padrao_da_turma(p_curso_id uuid, p_data_inicio date, p_ano_letivo integer)
returns uuid
language sql
stable security invoker
set search_path = pg_catalog, public
as $$
  select app.curriculo_vigente(p_curso_id, coalesce(p_data_inicio, make_date(p_ano_letivo, 1, 1)));
$$;
revoke all on function public.curriculo_padrao_da_turma(uuid, date, integer) from public, anon;
grant execute on function public.curriculo_padrao_da_turma(uuid, date, integer) to authenticated, service_role;
-- ⚠️ `security invoker` que chama uma `definer` de `app`: quem chama precisa de `execute` nela.
grant execute on function app.curriculo_vigente(uuid, date) to authenticated, service_role;

-- A versão está em uso por alguma turma com lançamento? É a régua da trava (RF-HOR-05), a mesma do regime de
-- horário: `app.turma_tem_lancamento_no_dsa`.
create or replace function app.curriculo_em_uso_com_lancamento(p_curriculo_id uuid)
returns boolean
language sql
stable security definer
set search_path = pg_catalog, public
as $$
  select exists (select 1 from public.turmas t
                  where t.curriculo_id = p_curriculo_id and app.turma_tem_lancamento_no_dsa(t.id));
$$;
revoke all on function app.curriculo_em_uso_com_lancamento(uuid) from public, anon, authenticated;
grant execute on function app.curriculo_em_uso_com_lancamento(uuid) to authenticated, service_role;
