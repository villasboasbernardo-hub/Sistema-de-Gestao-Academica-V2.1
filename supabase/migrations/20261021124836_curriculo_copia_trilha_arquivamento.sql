-- =================================================================================
-- Spec 021 · Bloco 6 — PR 2, M3: o que SÓ ACRESCENTA (regra 9.4, emenda de 19/10/2026)
-- Data local: 21/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- As regras de negócio do currículo, RC-1 a RC-12 (Bernardo Villas Boas, 21/10/2026,
-- `docs/correcoes/regras-do-curriculo-bloco-6.md`). O que esta migration acrescenta:
--   1. RC-11 · `curriculos.pdf_caminho`: o PDF de CADA currículo, num caminho próprio dele. O do currículo 1 já
--      carregado (Bloco 5) continua onde está, `<curso>/curriculo.pdf`, e o caminho passa a apontá-lo.
--   2. RC-6 · a trilha `correcoes_de_curriculo` — quem, quando, o quê, o valor anterior, o novo e a justificativa de
--      cada correção no currículo seguido por turma com lançamento. Só de acréscimo, imutável inclusive para a
--      `service_role`. Quem a escreve é o gatilho da M4 (SECURITY DEFINER); aqui, a tabela e a leitura.
--   3. RC-6 · `app.justificativa_de_correcao()`: a justificativa da requisição, que a tela manda no cabeçalho
--      `x-justificativa-de-correcao` (base64 do texto em UTF-8; acento não cabe em cabeçalho HTTP).
--   4. RC-7 e RC-2 · `public.criar_curriculo`: o currículo novo nasce como CÓPIA do vigente.
--   5. RC-10 · `public.arquivar_curriculo` e `public.desarquivar_curriculo`.
-- ⚠️ Os porteiros leem os recursos da matriz que a M4 cria; sem a M4, eles recusam (falham fechados).
-- ⚠️ "Hoje" vem de quem chama (`hojeNaCiaara()`, D20): nada aqui lê o relógio do servidor.
--
-- Reversão (sem currículo além do 1): `drop function` das cinco funções; `drop table public.correcoes_de_curriculo`
--   (com os gatilhos); `alter table public.curriculos drop column pdf_caminho`.
-- =================================================================================

-- ---------------------------------------------------------------- 1. o caminho do PDF de cada currículo (RC-11)
alter table public.curriculos add column pdf_caminho text;
comment on column public.curriculos.pdf_caminho is
  'RC-11: onde mora o PDF deste currículo, no balde `curriculos` (`<curso>/<currículo>/<instante>.pdf`; o do currículo 1 '
  'carregado no Bloco 5, `<curso>/curriculo.pdf`). Cada envio é um arquivo NOVO — substituir troca o caminho, e o '
  'anterior fica no balde (regra 4) e na trilha da correção.';
update public.curriculos cr
   set pdf_caminho = cr.curso_id::text || '/curriculo.pdf'
 where cr.versao = 1 and cr.pdf_carregado_em is not null and cr.pdf_caminho is null;
grant update (pdf_caminho) on public.curriculos to authenticated;

-- ---------------------------------------------------------------- 2. a trilha da correção (RC-6)
create table public.correcoes_de_curriculo (
  id             uuid primary key default gen_random_uuid(),
  curriculo_id   uuid not null,
  curso_id       uuid not null,
  tabela         text not null check (tabela in ('curriculos', 'disciplinas', 'unidades_ensino', 'avaliacoes_curriculo',
                                                 'limites_curriculo', 'avaliacoes_planejadas')),
  registro_id    uuid not null,
  acao           text not null check (acao in ('alterar', 'incluir', 'inativar', 'reativar')),
  campos         text[] not null,
  antes          jsonb,
  depois         jsonb not null,
  justificativa  text not null check (length(btrim(justificativa)) between 5 and 1000),
  autor_id       uuid not null,
  feito_em       timestamptz not null default now(),
  constraint correcao_antes_so_na_mudanca check ((acao = 'incluir') = (antes is null))
);

comment on table public.correcoes_de_curriculo is
  'Bloco 6 (spec 021, RC-6, Bernardo Villas Boas, 21/10/2026): a trilha de toda CORREÇÃO num currículo seguido por '
  'turma com lançamento — quem (`auth.uid()`), quando, a tabela e o registro, o que mudou (os campos, o valor anterior e '
  'o novo) e a justificativa. Só de acréscimo: UPDATE, DELETE e TRUNCATE recusados por gatilho de comando, inclusive '
  'para a service_role. Escrita só pelo gatilho `app.guardar_curriculo_em_uso` (SECURITY DEFINER). Os ids NÃO são FK: '
  'o rastro não impede nada de sair.';

create index correcoes_de_curriculo_curriculo_idx on public.correcoes_de_curriculo (curriculo_id, feito_em);

alter table public.correcoes_de_curriculo enable row level security;
create policy correcoes_de_curriculo_ler on public.correcoes_de_curriculo for select to authenticated
  using (app.pode('cursos', 'ler') and app.alcanca_curso(curso_id));
revoke all on public.correcoes_de_curriculo from anon;
revoke insert, update, delete, truncate on public.correcoes_de_curriculo from authenticated;

create or replace function app.correcoes_de_curriculo_imutaveis()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'correcoes_de_curriculo e so de acrescimo: % nao e permitido', tg_op
    using errcode = '42501',
          hint = 'rastro_imutavel',
          detail = 'Corrigir um rastro e registrar evento novo, nunca reescrever o antigo (Principio IV, regra 5).';
end;
$$;
revoke all on function app.correcoes_de_curriculo_imutaveis() from public, anon, authenticated;
create trigger trg_correcoes_de_curriculo_imutaveis before update or delete on public.correcoes_de_curriculo
  for each statement execute function app.correcoes_de_curriculo_imutaveis();
create trigger trg_correcoes_de_curriculo_sem_truncate before truncate on public.correcoes_de_curriculo
  for each statement execute function app.correcoes_de_curriculo_imutaveis();

-- ---------------------------------------------------------------- 3. a justificativa da requisição (RC-6)
-- ⚠️ PELO CABEÇALHO, e não por uma função que faça a gravação (D-26, revista): toda tela de edição do currículo já grava
--    pelo seu caminho, com a RLS dela; a justificativa só VIAJA junto, no cabeçalho que o PostgREST expõe em
--    `request.headers`. Base64, porque cabeçalho HTTP não leva acento. Sem cabeçalho (script, ETL, pgTAP), nulo.
create or replace function app.justificativa_de_correcao()
returns text
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_bruto text := nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-justificativa-de-correcao';
begin
  if v_bruto is null or btrim(v_bruto) = '' then
    return null;
  end if;
  return nullif(btrim(convert_from(decode(v_bruto, 'base64'), 'UTF8')), '');
exception when others then
  return null;   -- cabeçalho malformado vale como ausente: a correção é recusada, nunca aceita
end;
$$;
revoke all on function app.justificativa_de_correcao() from public, anon;
grant execute on function app.justificativa_de_correcao() to authenticated, service_role;

-- ---------------------------------------------------------------- 4. a cópia (RC-7, RC-2)
-- O currículo novo nasce IGUAL ao vigente hoje e se edita livremente enquanto nenhuma turma com lançamento o segue.
-- Copia o conteúdo da RC-1 (propósito, duração, modelo — o PDF não: cada currículo tem o seu, RC-11), as disciplinas,
-- UEs, avaliações do currículo, limites, regras de avaliação e habilitações ATIVAS, cada cópia com a linhagem da
-- original e código novo das sequências.
-- RC-2: começa DEPOIS do mais novo que existe, e não se cria outro enquanto o mais novo ainda é futuro (*"edite o
-- futuro"*) — no máximo um vigente e um futuro.
-- ⚠️ SECURITY DEFINER COM PORTEIRO (gotcha 15): `cursos.editar` com alcance e curso em oferta — o mesmo direito que edita
--    o currículo (D-15). O currículo não tem policy de INSERT: este é o único caminho.
-- ⚠️ A CÓPIA NÃO FAZ NASCER LINHA DE TURMA: nenhuma turma segue o currículo novo até escolhê-lo (RC-4).
-- ⚠️ Ids gerados ANTES, sem `RETURNING` (gotcha 4.1); as tabelas temporárias saem antes de recriadas (duas cópias na
--    mesma transação).
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
  'da original. Começa depois do mais novo; não cria um segundo futuro. Porteiro: cursos.editar, alcance e oferta.';

-- ---------------------------------------------------------------- 5. arquivar e desarquivar (RC-10)
-- O trio arquiva o currículo PASSADO (nem o vigente nem o futuro em `p_hoje`) quando TODAS as turmas que o seguem estão
-- arquivadas. Arquivado sai do seletor e nunca é apagado (regra 4); a turma arquivada continua mostrando as
-- disciplinas dele. Desarquivar devolve ao seletor (D-28).
create or replace function public.arquivar_curriculo(p_curriculo_id uuid, p_hoje date)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_c public.curriculos;
begin
  select * into v_c from public.curriculos where id = p_curriculo_id;
  if v_c.id is null
     or coalesce(app.pode('arquivamento_de_curriculo', 'editar'), false) is not true
     or coalesce(app.alcanca_curso(v_c.curso_id), false) is not true then
    raise exception 'O seu perfil não arquiva currículo deste curso.'
      using errcode = '42501', hint = 'arquivamento_de_curriculo_sem_permissao';
  end if;
  if p_hoje is null then
    raise exception 'Falta a data de hoje.' using errcode = '23502', hint = 'curriculo_sem_vigencia';
  end if;
  if v_c.arquivado_em is not null then
    return;   -- idempotente
  end if;
  if v_c.vigente_de > p_hoje or app.curriculo_vigente(v_c.curso_id, p_hoje) = v_c.id then
    raise exception 'Só se arquiva currículo PASSADO: este é o vigente ou o futuro do curso.'
      using errcode = '23514', hint = 'curriculo_nao_passado';
  end if;
  if exists (select 1 from public.turmas t where t.curriculo_id = v_c.id and not app.turma_arquivada(t.id)) then
    raise exception 'Este currículo ainda é seguido por turma não arquivada: arquive as turmas antes.'
      using errcode = '23514', hint = 'curriculo_com_turma_nao_arquivada';
  end if;
  update public.curriculos set arquivado_em = now(), arquivado_por = auth.uid() where id = v_c.id;
end;
$$;

create or replace function public.desarquivar_curriculo(p_curriculo_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_curso uuid;
begin
  select curso_id into v_curso from public.curriculos where id = p_curriculo_id;
  if v_curso is null
     or coalesce(app.pode('arquivamento_de_curriculo', 'editar'), false) is not true
     or coalesce(app.alcanca_curso(v_curso), false) is not true then
    raise exception 'O seu perfil não desarquiva currículo deste curso.'
      using errcode = '42501', hint = 'arquivamento_de_curriculo_sem_permissao';
  end if;
  update public.curriculos set arquivado_em = null, arquivado_por = null
   where id = p_curriculo_id and arquivado_em is not null;
end;
$$;
revoke all on function public.arquivar_curriculo(uuid, date) from public, anon;
revoke all on function public.desarquivar_curriculo(uuid) from public, anon;
grant execute on function public.arquivar_curriculo(uuid, date) to authenticated;
grant execute on function public.desarquivar_curriculo(uuid) to authenticated;
