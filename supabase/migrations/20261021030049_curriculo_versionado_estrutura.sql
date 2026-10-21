-- =================================================================================
-- Spec 021 · Bloco 6 — o CURRÍCULO VERSIONADO, M1: a estrutura que SÓ ACRESCENTA
-- Data local: 21/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- Pedido de Bernardo Villas Boas, 16/10/2026: *"poder registrar um currículo NOVO de um curso — disciplinas, UEs, CH,
--   avaliações do currículo, duração em semanas, tudo o que for preciso — SEM alterar o currículo em vigor. (…) eu
--   cadastro esse currículo novo, planejo as turmas do ano seguinte por ele, e as turmas em andamento continuam
--   regidas pelo currículo atual, sem nenhum acompanhamento estragado."*
-- E as regras de negócio do currículo, RC-1 a RC-12 (decisões nominais de Bernardo Villas Boas, 21/10/2026,
--   `docs/correcoes/regras-do-curriculo-bloco-6.md`). As que esta migration materializa:
--   RC-1 · o curso é a identidade (sigla, nome, classificação); TUDO o que descreve o que se ensina é do CURRÍCULO:
--          propósito, duração, o modelo (UEs ou competências), disciplinas, UEs, avaliações e regras de avaliação,
--          limites de AEC/TAD/TR, habilitações por disciplina e o PDF.
--   RC-3 · vigente / futuro / passado é DERIVADO da data de início da vigência; só o ARQUIVADO é guardado, em coluna
--          própria (não é situação nem `status`).
--   RC-11 · cada currículo tem o SEU PDF (a data de carga mora no currículo).
--
-- O que faz (nada aqui muda dado existente nem o que uma tela lê — a ligação é a M2, `…030050`):
--   1. `public.curriculos` — um currículo de um curso: número (o "Currículo N" da tela, RC-12), vigência, descrição do
--      que muda, de qual foi copiado, o conteúdo da RC-1 que era coluna do curso, e o arquivamento. Código `CRV-NNNNNN`.
--   2. As colunas NULÁVEIS que a M2 preenche e amarra: `curriculo_id` em `disciplinas`, `limites_curriculo`,
--      `avaliacoes_planejadas` (as regras de avaliação: fórmula da MF e caráter, RC-1) e `turmas`; `linhagem_id` em
--      `disciplinas`, `unidades_ensino` e `avaliacoes_curriculo` (a mesma disciplina, UE ou avaliação em currículos
--      diferentes tem a MESMA linhagem — é o que permite levar o planejamento de uma turma ao trocar de currículo).
--   3. As funções: o currículo vigente numa data, o padrão de uma turma (para a tela) e se um currículo é seguido por
--      turma com lançamento (a régua da correção da RC-6, que entra no PR 2).
-- ⚠️ A CÓPIA (RC-7), a CORREÇÃO PELO TRIO (RC-6) e o ARQUIVAMENTO (RC-10) NÃO ESTÃO AQUI, de propósito: entram no
--    PR 2, junto com as telas e os leitores do código que sabem distinguir dois currículos. Até lá cada curso tem UM.
--
-- ⚠️ "Versão" é a palavra do CÓDIGO (`versao`); na tela é sempre "Currículo N" (RC-12).
-- ⚠️ Nada aqui lê data do servidor (D20): a vigência é resolvida pela data que quem chama passa.
-- ⚠️ A unidade de ensino e a avaliação do currículo NÃO ganham `curriculo_id`: o currículo delas é o da disciplina (uma
--    segunda coluna seria uma segunda fonte de verdade).
--
-- Reversão (sem currículo além do 1 e com a M2 já revertida): `drop function public.curriculo_padrao_da_turma`,
--   `app.curriculo_em_uso_com_lancamento`, `app.curriculo_vigente`; `alter table … drop column` das sete colunas;
--   `drop table public.curriculos`; a função e a sequência do código. O roteiro executável e provado é
--   `specs/021-bloco-6-curriculo-versionado/reversao.sql`.
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

-- ---------------------------------------------------------------- 2. a tabela dos currículos
create table public.curriculos (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique default app.proximo_codigo_curriculo(),
  curso_id            uuid not null references public.cursos(id) on delete restrict,
  -- O N do "Currículo N" (RC-12): 1, 2, 3… — único no curso.
  versao              smallint not null check (versao >= 1),
  -- A partir de que data este currículo rege as turmas NOVAS (RC-3, RC-4). Vigente = o de maior `vigente_de` <= hoje;
  -- futuro = `vigente_de` depois de hoje; passado = os demais. DERIVADO — nada disso é guardado.
  vigente_de          date not null,
  descricao           text check (descricao is null or length(btrim(descricao)) between 1 and 500),
  -- ── o conteúdo da RC-1 que era coluna do curso (a M2 copia o de hoje para o currículo 1) ──
  proposito           text,
  duracao_semanas     numeric,
  duracao_dias        integer not null,
  curriculo_modelo    text not null default 'unidades_de_ensino',
  -- RC-11: quando o PDF DESTE currículo foi registrado. NULO = nenhum PDF.
  pdf_carregado_em    timestamptz,
  copiada_de          uuid references public.curriculos(id) on delete restrict,
  -- RC-10: o ÚNICO estado guardado. Arquivado sai do seletor e nunca é apagado (regra 4).
  arquivado_em        timestamptz,
  arquivado_por       uuid,
  status              public.status_registro not null default 'ativo',
  origem_migracao_v1  text,
  criado_por          uuid,
  criado_em           timestamptz not null default now(),
  editado_por         uuid,
  editado_em          timestamptz,

  constraint curriculos_versao_no_curso_key unique (curso_id, versao),
  -- O alvo das FKs compostas: o currículo e o curso dele.
  constraint curriculos_id_curso_key unique (id, curso_id),
  -- As mesmas regras que as colunas do curso tinham (`cursos_*`), com o mesmo texto de recusa.
  constraint curriculos_duracao_semanas_positiva check (duracao_semanas is null or duracao_semanas > 0),
  constraint curriculos_duracao_dias_positiva check (duracao_dias > 0),
  constraint curriculos_curriculo_modelo_valido check (curriculo_modelo in ('unidades_de_ensino', 'competencias')),
  constraint curriculos_arquivamento_inteiro check ((arquivado_em is null) = (arquivado_por is null))
);

comment on table public.curriculos is
  'Bloco 6 (spec 021; RC-1 a RC-12, Bernardo Villas Boas, 21/10/2026): os CURRÍCULOS de um curso. O curso é a '
  'identidade; o currículo é dono do que se ensina — propósito, duração, modelo, disciplinas (e por elas UEs e '
  'avaliações do currículo), regras de avaliação, limites de AEC/TAD/TR e o PDF. Toda turma segue UM currículo '
  '(`turmas.curriculo_id`), escolhido ao nascer (padrão: o vigente na data de início); a escolha trava no primeiro '
  'lançamento. Vigente/futuro/passado é derivado de `vigente_de`; só o arquivamento é guardado. Nunca apagar.';
comment on column public.curriculos.versao is
  'O N do "Currículo N" da tela (RC-12). "Versão" é só a palavra do código.';
comment on column public.curriculos.vigente_de is
  'A partir de que data o currículo rege as turmas novas: a turma nasce no currículo de maior `vigente_de` <= a data '
  'de início dela (sem data, 1º de janeiro do ano letivo), entre os ativos e não arquivados.';
comment on column public.curriculos.proposito is
  'RC-1: o propósito do curso neste currículo (era `cursos.proposito`).';
comment on column public.curriculos.duracao_semanas is
  'RC-1: a duração em semanas neste currículo — o T da "Semana do curso N de T" das turmas que o seguem (era '
  '`cursos.duracao_semanas`).';
comment on column public.curriculos.duracao_dias is
  'RC-1: a duração em dias neste currículo (era `cursos.duracao_dias`).';
comment on column public.curriculos.curriculo_modelo is
  'RC-1: como o currículo oficial da DEnsM descreve o curso — `unidades_de_ensino` ou `competencias` (D-B3; era '
  '`cursos.curriculo_modelo`). Com `competencias`, a tela não renderiza seção de UE nem avisa que faltam.';
comment on column public.curriculos.pdf_carregado_em is
  'RC-11: quando o PDF deste currículo foi registrado (era `cursos.curriculo_pdf_em`). NULO = nenhum PDF.';
comment on column public.curriculos.copiada_de is
  'O currículo de que este foi copiado (RC-7). Nulo no currículo 1.';
comment on column public.curriculos.arquivado_em is
  'RC-10: quando o currículo foi arquivado (sai do seletor; nunca é apagado). NULO = não arquivado.';

-- Dois currículos ativos do mesmo curso não começam no mesmo dia: a vigência tem de decidir um só (RC-2).
create unique index curriculos_um_inicio_por_curso_uq
  on public.curriculos (curso_id, vigente_de) where status = 'ativo';
create index curriculos_curso_idx on public.curriculos (curso_id);

create trigger trg_curriculos_auditoria before insert or update on public.curriculos
  for each row execute function app.set_auditoria();

alter table public.curriculos enable row level security;

-- Quem lê o curso lê os currículos dele.
create policy curriculos_ler on public.curriculos for select to authenticated
  using (app.pode('cursos', 'ler') and app.alcanca_curso(curso_id));
-- Editar o currículo (vigência, descrição, propósito, duração, modelo, PDF) é o MESMO direito que editava essas colunas
-- no curso — `cursos.editar` com alcance (`cursos_editar`): mudá-las de tabela não muda quem as edita. E, como toda
-- tabela que depende do curso, só com o curso EM OFERTA (FR-017.5 da spec 009): curso inativo não recebe escrita — o
-- mesmo que `curso_inativo_so_reativa` já garantia para essas colunas quando eram do curso.
create policy curriculos_editar on public.curriculos for update to authenticated
  using (coalesce(app.pode('cursos', 'editar'), false) and app.alcanca_curso(curso_id)
         and app.curso_em_oferta(curso_id))
  with check (coalesce(app.pode('cursos', 'editar'), false) and app.alcanca_curso(curso_id)
              and app.curso_em_oferta(curso_id));
-- ⚠️ NENHUMA policy de INSERT nem de DELETE: o currículo nasce com o curso (o 1) ou pela cópia (RC-7, PR 2, função com
--    porteiro) e nunca sai (regra 4). O arquivamento (RC-10) também é por função, no PR 2: sem privilégio de coluna.
revoke all on public.curriculos from anon;
-- ⚠️ `revoke all` e só depois o `grant` por coluna: o privilégio de tabela que o Supabase dá por padrão deixaria
--    `authenticated` atualizar QUALQUER coluna, inclusive o arquivamento.
revoke all on public.curriculos from authenticated;
grant select,
      update (vigente_de, descricao, proposito, duracao_semanas, duracao_dias, curriculo_modelo, pdf_carregado_em, status)
   on public.curriculos to authenticated;

-- ---------------------------------------------------------------- 3. as colunas que a M2 preenche e amarra
alter table public.disciplinas add column curriculo_id uuid;
alter table public.disciplinas add column linhagem_id uuid;
alter table public.unidades_ensino add column linhagem_id uuid;
alter table public.avaliacoes_curriculo add column linhagem_id uuid;
alter table public.limites_curriculo add column curriculo_id uuid;
alter table public.avaliacoes_planejadas add column curriculo_id uuid;
alter table public.turmas add column curriculo_id uuid;

comment on column public.disciplinas.curriculo_id is
  'Bloco 6 (spec 021): o currículo a que a disciplina pertence. A UE e a avaliação do currículo herdam dele.';
comment on column public.disciplinas.linhagem_id is
  'Bloco 6 (spec 021): a mesma disciplina em currículos diferentes tem a mesma linhagem (a cópia leva a da original).';
comment on column public.unidades_ensino.linhagem_id is
  'Bloco 6 (spec 021): a mesma UE em currículos diferentes tem a mesma linhagem.';
comment on column public.avaliacoes_curriculo.linhagem_id is
  'Bloco 6 (spec 021): a mesma avaliação do currículo em currículos diferentes tem a mesma linhagem.';
comment on column public.limites_curriculo.curriculo_id is
  'Bloco 6 (spec 021): o currículo que declara este limite de AEC/TAD/TR.';
comment on column public.avaliacoes_planejadas.curriculo_id is
  'Bloco 6 (spec 021, RC-1): o currículo a que estas regras de avaliação (fórmula da MF, caráter) pertencem.';
comment on column public.turmas.curriculo_id is
  'Bloco 6 (spec 021, RC-4): o currículo que rege esta turma — as disciplinas, UEs, avaliações, limites e a duração '
  'dela. Escolhido ao nascer (padrão: o vigente na data de início); trava no primeiro lançamento (RF-HOR-05).';

-- ---------------------------------------------------------------- 4. as funções
-- O currículo vigente de um curso numa data: o de maior `vigente_de` <= a data, entre os ativos e não arquivados. Sem
-- nenhum (data anterior à primeira vigência), o primeiro. A data é de quem chama (D20: nada de relógio do servidor).
-- ⚠️ É A MESMA REGRA de `lib/dominio/curriculos.ts` (`curriculoVigenteEm`), que a tela usa: uma só, em dois lados.
create or replace function app.curriculo_vigente(p_curso_id uuid, p_data date)
returns uuid
language sql
stable security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    (select c.id from public.curriculos c
      where c.curso_id = p_curso_id and c.status = 'ativo' and c.arquivado_em is null and c.vigente_de <= p_data
      order by c.vigente_de desc limit 1),
    (select c.id from public.curriculos c
      where c.curso_id = p_curso_id and c.status = 'ativo' and c.arquivado_em is null
      order by c.vigente_de, c.versao limit 1));
$$;
revoke all on function app.curriculo_vigente(uuid, date) from public, anon, authenticated;

-- O currículo padrão de uma turma nova, para a tela oferecer antes de gravar: o vigente na data de início, ou em 1º de
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

-- O currículo é seguido por alguma turma com lançamento? É a régua da correção (RC-6, PR 2), a mesma do regime de
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
