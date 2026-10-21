-- =================================================================================
-- Spec 020 (Bloco 5), M2 — a capacitacao didatica do instrutor em lista fechada, com a conversao do texto.
-- 20/10/2026 (data local do responsavel; o nome do arquivo carrega o carimbo UTC da CLI).
--
-- > "4. CAPACITACAO DIDATICA DO INSTRUTOR: multipla escolha de lista fechada (C-Esp-DID, C-Exp-TE,
-- > Licenciatura). Hoje e texto livre: a CONVERSAO do texto para a lista esta AUTORIZADA por Bernardo
-- > (resposta 12 de 16/10/2026), com backup, antes x depois medido e registrado; valor que nao casar
-- > com a lista NAO se perde — fica guardado e aparece como aviso na ficha para correcao a mao."
-- > — Bernardo Villas Boas, 20/10/2026 (NOVIDADE autorizada nominalmente, regra 3)
--
-- ⚠️ SO ACRESCENTA na estrutura (regra 9.4): um tipo novo, duas colunas novas, os privilegios delas,
--    uma funcao nova e `vw_instrutores` recriada com as duas colunas NO FIM (as 38 de hoje intactas,
--    na mesma ordem). O DADO que muda e so o da conversao, AUTORIZADA no pedido.
-- ⚠️ O TEXTO ANTIGO NAO E TOCADO (C-10): `capacitacao_didatica` fica como registro de origem, aposentada.
--    O convertido vai para as colunas novas; reverter nao perde nada.
-- ⚠️ MEDIDO NO REMOTO, so leitura, em 20/10/2026: 31 de 181 instrutores com texto, todos feitos da lista
--    (11 C-Exp-TE, 10 C-Esp-DID, 6 Licenciatura e 4 com duas); 150 vazios. O antes x depois da conversao,
--    na copia do remoto, esta em `specs/020-bloco-5-cadastros-novos/antes-depois.md`.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- PARTE A — o tipo (dominio normativo fechado: o caso de ENUM das convencoes) e as colunas
-- ---------------------------------------------------------------------------------
create type public.tipo_capacitacao_didatica as enum ('C-Esp-DID', 'C-Exp-TE', 'Licenciatura');

comment on type public.tipo_capacitacao_didatica is
  'Spec 020 (C-9): as capacitacoes didaticas reconhecidas, lista fechada do pedido de 16/10/2026. '
  'A ordem e a da tela. Acrescentar um valor e `alter type ... add value` em migration.';

alter table public.instrutores
  add column if not exists capacitacoes_didaticas public.tipo_capacitacao_didatica[] not null default '{}',
  add column if not exists capacitacao_didatica_a_corrigir text;

comment on column public.instrutores.capacitacoes_didaticas is
  'Spec 020 (C-9): as capacitacoes didaticas do instrutor, da lista fechada. Vazia = nenhuma.';
comment on column public.instrutores.capacitacao_didatica_a_corrigir is
  'Spec 020 (C-10, C-11): o pedaco do texto antigo que nao casou com a lista, como foi escrito. '
  'Aparece como aviso na ficha; quem corrige marca a lista e apaga este texto. Conta como capacitacao '
  'declarada no alerta de docencia sem capacitacao (C-12, RN-DEG-02).';
comment on column public.instrutores.capacitacao_didatica is
  '[APOSENTADA — v2.1] Spec 020 (C-10): o texto livre de antes da lista fechada, guardado INTOCADO como '
  'registro de origem. Nenhuma tela le nem escreve mais; o valor vive em `capacitacoes_didaticas` e '
  '`capacitacao_didatica_a_corrigir`.';

-- ⚠️ OS MESMOS PRIVILEGIOS POR COLUNA da capacitacao antiga (medido: SELECT, INSERT e UPDATE para
--    `authenticated`, por coluna — o recorte de PII de 20260908120000 e 20260915052719). Sem eles, a
--    coluna nova seria ilegivel e ingravavel pela tela, sem erro de policy (gotcha 3).
grant select (capacitacoes_didaticas, capacitacao_didatica_a_corrigir),
      insert (capacitacoes_didaticas, capacitacao_didatica_a_corrigir),
      update (capacitacoes_didaticas, capacitacao_didatica_a_corrigir)
   on public.instrutores to authenticated;

-- ---------------------------------------------------------------------------------
-- PARTE B — a conversao (C-10), numa funcao: idempotente, e a regra mora num lugar so
--
-- ⚠️ O ESPELHO EM TypeScript e `lib/dominio/capacitacao-didatica.ts` (`converterCapacitacao`), e o
--    pgTAP `143_bloco_5.sql` cobra daqui os mesmos casos do teste de la.
-- ⚠️ IDEMPOTENTE: so converte quem tem texto e AINDA NAO tem lista nem texto a corrigir. Rodar de novo
--    nao muda nada — e quem corrigiu a mao nao e sobrescrito.
-- ---------------------------------------------------------------------------------
create or replace function app.converter_capacitacoes_didaticas()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_casadas integer;
  v_so_separador integer;
begin
  with alvo as (
    select i.id, i.capacitacao_didatica as texto
      from public.instrutores i
     where i.capacitacao_didatica is not null
       and btrim(i.capacitacao_didatica) <> ''
       and i.capacitacoes_didaticas = '{}'
       and i.capacitacao_didatica_a_corrigir is null
  ),
  partes as (
    select a.id, btrim(p.parte) as parte, p.ordem
      from alvo a
      cross join lateral regexp_split_to_table(a.texto, '[,;/]') with ordinality as p(parte, ordem)
     where btrim(p.parte) <> ''
  ),
  casadas as (
    select pa.id,
           pa.parte,
           pa.ordem,
           (select t.v
              from unnest(enum_range(null::public.tipo_capacitacao_didatica)) as t(v)
             where lower(regexp_replace(t.v::text, '[[:space:]-]', '', 'g'))
                 = lower(regexp_replace(pa.parte, '[[:space:]-]', '', 'g'))) as valor
      from partes pa
  ),
  por_instrutor as (
    select c.id,
           coalesce(array_agg(distinct c.valor order by c.valor) filter (where c.valor is not null),
                    '{}') as lista,
           string_agg(c.parte, ', ' order by c.ordem) filter (where c.valor is null) as a_corrigir
      from casadas c
     group by c.id
  )
  update public.instrutores i
     set capacitacoes_didaticas = p.lista,
         capacitacao_didatica_a_corrigir = p.a_corrigir
    from por_instrutor p
   where i.id = p.id;
  get diagnostics v_casadas = row_count;

  -- Texto feito so de separadores: nao ha parte, e ele nao pode sumir — vai inteiro para corrigir.
  update public.instrutores i
     set capacitacao_didatica_a_corrigir = btrim(i.capacitacao_didatica)
   where i.capacitacao_didatica is not null
     and btrim(i.capacitacao_didatica) <> ''
     and i.capacitacoes_didaticas = '{}'
     and i.capacitacao_didatica_a_corrigir is null;
  get diagnostics v_so_separador = row_count;

  return v_casadas + v_so_separador;
end;
$$;

comment on function app.converter_capacitacoes_didaticas() is
  'Spec 020 (C-10): converte o texto antigo da capacitacao didatica para a lista fechada; o que nao casa '
  'vai para `capacitacao_didatica_a_corrigir`. Idempotente. Devolve quantos instrutores mudaram.';

revoke all on function app.converter_capacitacoes_didaticas() from public, anon, authenticated;

select app.converter_capacitacoes_didaticas();

-- ---------------------------------------------------------------------------------
-- PARTE C — `vw_instrutores` com as duas colunas novas NO FIM
--
-- ⚠️ GOTCHA 10: `create or replace view` SUBSTITUI as opcoes da view pelas do comando — o
--    `with (security_invoker = true)` TEM de estar aqui, senao ela passa a rodar com os direitos do dono
--    e a ler o cadastro inteiro para qualquer perfil. `010_estrutura.sql` guarda.
-- ⚠️ A lista abaixo e a de `20260915091717_filtros_de_vinculo_na_leitura.sql`, na mesma ordem (38
--    colunas, medido no catalogo local), com as duas novas por ultimo. A view nao tem dependentes.
-- ---------------------------------------------------------------------------------
create or replace view public.vw_instrutores with (security_invoker = true) as
with atribuicoes_ativas as (
  select tdi.instrutor_id, td.disciplina_id
    from public.turma_disciplina_instrutor tdi
    join public.turma_disciplina td on td.id = tdi.turma_disciplina_id
   where tdi.status = 'ativo' and td.status = 'ativo'
),
habilitacoes_ativas as (
  select v.instrutor_id, v.disciplina_id
    from public.instrutor_disciplina v
   where v.status = 'ativo'
),
cursos_por_instrutor as (
  select x.instrutor_id,
         array_agg(distinct c.codigo order by c.codigo)                          as cursos,
         array_agg(distinct c.classificacao::text order by c.classificacao::text) as classificacoes
    from (select * from habilitacoes_ativas union select * from atribuicoes_ativas) x
    join public.disciplinas d on d.id = x.disciplina_id
    join public.cursos c      on c.id = d.curso_id
   group by x.instrutor_id
)
select
  i.id,
  i.codigo,
  i.posto_graduacao,
  i.esp_hab_obs,
  i.nome_completo,
  i.categoria,
  i.om,
  i.nome_guerra,
  i.nome_normalizado,
  i.nip,
  i.data_nascimento,
  i.dep_divisao,
  i.data_assuncao_setor,
  i.email,
  i.regime_trabalho,
  i.nivel_escolaridade,
  i.formacao_principal_secundaria,
  i.capacitacao_didatica,
  i.data_inicio_docencia_mb,
  i.data_inicio_docencia_ciaara,
  i.ultima_avaliacao_desempenho,
  i.data_avaliacao_desempenho,
  i.preferencia,
  i.disciplinas_ministradas_legado_v1,
  i.antiguidade_declarada,
  i.antiguidade_declarada_num,
  i.status,
  i.origem_migracao_v1,
  i.criado_por,
  i.criado_em,
  i.editado_por,
  i.editado_em,
  i.area_conhecimento,
  app.fn_antiguidade_ordem(i.id) as ordem_antiguidade,
  exists (select 1 from habilitacoes_ativas h where h.instrutor_id = i.id) as habilitado,
  exists (select 1 from atribuicoes_ativas a where a.instrutor_id = i.id)  as selecionado,
  coalesce(cpi.cursos, '{}'::text[])                                         as cursos_vinculados,
  coalesce(cpi.classificacoes, '{}'::text[])                                 as classificacoes_vinculadas,
  i.capacitacoes_didaticas,
  i.capacitacao_didatica_a_corrigir
from public.instrutores i
left join cursos_por_instrutor cpi on cpi.instrutor_id = i.id;

comment on column public.vw_instrutores.capacitacoes_didaticas is
  'Spec 020 (C-9): as capacitacoes didaticas da lista fechada.';
comment on column public.vw_instrutores.capacitacao_didatica_a_corrigir is
  'Spec 020 (C-10): o pedaco do texto antigo que nao casou com a lista (aviso na ficha).';

revoke insert, update, delete, truncate on public.vw_instrutores from authenticated;

-- =================================================================================
-- PLANO DE REVERSAO
--
--   1. Recriar `vw_instrutores` com a definicao de `20260915091717_filtros_de_vinculo_na_leitura.sql`
--      (`create or replace` nao tira coluna: e `drop view` + `create view` com o `grant select` e os
--      `revoke` de la — a view nao tem dependentes, conferir com `pg_depend`).
--   2. drop function app.converter_capacitacoes_didaticas();
--   3. alter table public.instrutores drop column capacitacao_didatica_a_corrigir,
--        drop column capacitacoes_didaticas;
--   4. drop type public.tipo_capacitacao_didatica;
--   5. Devolver o comentario antigo de `instrutores.capacitacao_didatica`.
--
-- ⚠️ O texto antigo esta intocado: voltar nao perde nada do que havia antes. O que se perde e o que
--    alguem tiver marcado na lista DEPOIS — e a decisao de reverter passa a ser de Bernardo.
-- =================================================================================
