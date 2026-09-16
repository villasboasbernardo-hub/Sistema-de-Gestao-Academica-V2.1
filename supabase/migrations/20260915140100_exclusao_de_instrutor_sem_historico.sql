-- =================================================================================
-- Exclusao permanente de instrutor SEM HISTORICO NENHUM — a excecao unica a "nada e apagado"
--
-- O QUE  : (1) `app.impedimentos_de_exclusao_do_instrutor(id)` devolve o que prende o instrutor ao
--          historico; (2) `app.excluir_instrutor(id, codigo digitado)` apaga o instrutor limpo, numa
--          transacao, e recusa o resto; (3) os dois invólucros expostos em `public`.
--
-- AUTORIZACAO NOMINAL, TRANSCRITA LITERALMENTE:
--   "Autorizacao de Bernardo Villas Boas, 15/09/2026: fica autorizada a exclusao permanente de
--   instrutor, delimitada a registro SEM HISTORICO NENHUM. A regra 4 do CLAUDE.md ('nada e apagado')
--   passa a ter essa excecao unica, delimitada e registrada. Motivo: a regra existe para proteger
--   historico, e um cadastro criado por engano nao tem historico a proteger. Instrutor com qualquer
--   aula lancada, atribuicao, vinculo de habilitacao ou conta de acesso ligada continua nao podendo
--   ser excluido — so desativado."
--
-- ⚠️ A LISTA DE IMPEDIMENTOS FOI LIDA NO SCHEMA, NAO PRESUMIDA (15/09/2026). Tudo que referencia
--    instrutor, com ou sem FK declarada, e historico — em qualquer `status`, porque vinculo inativo e
--    atribuicao inativa tambem sao passado:
--      · `registros_aula.instrutor_id`                          (FK)  -> aula_lancada
--      · `turma_disciplina_instrutor.instrutor_id`              (FK)  -> atribuicao
--      · `turma_disciplina.instrutor_id`                        (FK)  -> atribuicao
--      · `disciplinas.instrutores_atribuidos` (uuid[], sem FK)        -> atribuicao
--      · `instrutor_disciplina.instrutor_id`                    (FK)  -> vinculo_de_habilitacao
--      · `usuarios.instrutor_id`                                (FK)  -> conta_de_acesso
--      · `avaliacoes.instrutor_responsavel_id` e `.fiscal_id`   (FK)  -> avaliacao
--      · `arquivo_avaliacoes_v1.instrutor_codigo_v1` (codigo, sem FK) -> avaliacao
--      · `responsaveis_curso.instrutor_id`                      (FK)  -> responsavel_de_curso
--    As quatro primeiras chaves sao as da autorizacao. As outras duas nao estao nela com esse nome,
--    e entram pela primeira frase dela: "registro SEM HISTORICO NENHUM". Nenhuma das FKs e CASCADE —
--    todas `restrict`, conferido em `pg_constraint` —, entao o banco recusaria de qualquer jeito;
--    a funcao recusa antes, dizendo o motivo.
--
-- ⚠️ PERMISSAO: `app.pode('instrutores', 'criar')`. A matriz nao tem acao de exclusao, e nenhuma
--    linha foi inventada. Das acoes de escrita que ela ja oferece para `instrutores`, `criar` e a mais
--    restritiva — tres perfis (admin, encarregado e ajudante de Administracao Academica), contra
--    cinco de `editar`. Quem pode criar um cadastro pode desfazer o criado por engano.
--
-- ⚠️ SECURITY DEFINER, PORQUE `authenticated` NAO TEM DELETE — e continua sem ter. Nenhuma policy
--    `FOR DELETE` nasce aqui (`010_estrutura`, `080_imutabilidade` e a T-07 da RLS seguem valendo). A
--    unica porta e esta funcao, com o porteiro dentro. O invólucro de `public` e invoker e nao decide
--    nada, no padrao de `gravar_dados_pessoais_instrutor` (migration `20260915052719`).
--
-- ⚠️ A LINHA E TRAVADA ANTES DA CONFERENCIA (`for update`). Uma atribuicao ou aula gravada no mesmo
--    instante espera a transacao; quando ela solta, a FK recusa. Nao ha janela entre conferir e apagar.
--
-- ⚠️ O CODIGO DIGITADO E CONFERIDO NO BANCO, e nao so na tela: a confirmacao por digitacao e parte da
--    regra de "permanente e irreversivel", e uma chamada por fora da tela passa pelo mesmo portao.
--
-- ⚠️ AUDITORIA: NAO HA ONDE GRAVAR, E NENHUMA TABELA FOI CRIADA. O schema tem `migracao_log`, e ela
--    nao serve: e o rastro append-only da MIGRACAO ("evidencia auditavel de que 100% do historico foi
--    transportado"), o dominio `acao_migracao` nao tem verbo de exclusao, e acrescentar um mudaria
--    um log cuja razao de existir e outra. `auth.audit_log_entries` e interna do servico de auth. A
--    funcao devolve codigo e nome do excluido a quem chamou; quem registra, e onde, e decisao a parte.
--
-- ERROS, estaveis e especificos:
--   42501 — sessao sem `app.pode('instrutores','criar')`;
--   P0002 — instrutor inexistente;
--   22023 — o codigo digitado nao confere;
--   23503 — `instrutor_com_historico: <chaves>`, com as chaves do que prende o instrutor.
-- =================================================================================

create or replace function app.impedimentos_de_exclusao_do_instrutor(p_instrutor_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_codigo text;
  v_impedimentos text[] := array[]::text[];
begin
  if not app.pode('instrutores', 'criar') then
    raise exception 'exclusao de instrutor restrita a quem pode criar instrutor'
      using errcode = '42501';
  end if;

  select i.codigo into v_codigo from public.instrutores i where i.id = p_instrutor_id;
  if not found then
    raise exception 'instrutor inexistente' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.registros_aula r where r.instrutor_id = p_instrutor_id) then
    v_impedimentos := array_append(v_impedimentos, 'aula_lancada');
  end if;

  if exists (select 1 from public.turma_disciplina_instrutor t where t.instrutor_id = p_instrutor_id)
     or exists (select 1 from public.turma_disciplina t where t.instrutor_id = p_instrutor_id)
     or exists (select 1 from public.disciplinas d where p_instrutor_id = any (d.instrutores_atribuidos)) then
    v_impedimentos := array_append(v_impedimentos, 'atribuicao');
  end if;

  if exists (select 1 from public.instrutor_disciplina v where v.instrutor_id = p_instrutor_id) then
    v_impedimentos := array_append(v_impedimentos, 'vinculo_de_habilitacao');
  end if;

  if exists (select 1 from public.usuarios u where u.instrutor_id = p_instrutor_id) then
    v_impedimentos := array_append(v_impedimentos, 'conta_de_acesso');
  end if;

  if exists (select 1 from public.avaliacoes a
              where a.instrutor_responsavel_id = p_instrutor_id or a.fiscal_id = p_instrutor_id)
     or exists (select 1 from public.arquivo_avaliacoes_v1 a where a.instrutor_codigo_v1 = v_codigo) then
    v_impedimentos := array_append(v_impedimentos, 'avaliacao');
  end if;

  if exists (select 1 from public.responsaveis_curso rc where rc.instrutor_id = p_instrutor_id) then
    v_impedimentos := array_append(v_impedimentos, 'responsavel_de_curso');
  end if;

  return v_impedimentos;
end;
$$;

comment on function app.impedimentos_de_exclusao_do_instrutor(uuid) is
  'O que prende o instrutor ao historico e impede a exclusao permanente: aula_lancada, atribuicao, '
  'vinculo_de_habilitacao, conta_de_acesso, avaliacao, responsavel_de_curso — em qualquer status. '
  'Vazio = registro sem historico. Porteiro: app.pode(instrutores, criar). Autorizacao de Bernardo '
  'Villas Boas, 15/09/2026.';

revoke all on function app.impedimentos_de_exclusao_do_instrutor(uuid) from public;
revoke all on function app.impedimentos_de_exclusao_do_instrutor(uuid) from anon;
grant execute on function app.impedimentos_de_exclusao_do_instrutor(uuid) to authenticated;


create or replace function app.excluir_instrutor(p_instrutor_id uuid, p_codigo_confirmacao text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_codigo text;
  v_nome text;
  v_impedimentos text[];
  v_apagadas integer;
begin
  if not app.pode('instrutores', 'criar') then
    raise exception 'exclusao de instrutor restrita a quem pode criar instrutor'
      using errcode = '42501';
  end if;

  select i.codigo, i.nome_completo into v_codigo, v_nome
    from public.instrutores i
   where i.id = p_instrutor_id
     for update;
  if not found then
    raise exception 'instrutor inexistente' using errcode = 'P0002';
  end if;

  if p_codigo_confirmacao is null or btrim(p_codigo_confirmacao) <> v_codigo then
    raise exception 'o codigo digitado nao confere com o do instrutor' using errcode = '22023';
  end if;

  v_impedimentos := app.impedimentos_de_exclusao_do_instrutor(p_instrutor_id);
  if cardinality(v_impedimentos) > 0 then
    raise exception 'instrutor_com_historico: %', array_to_string(v_impedimentos, ', ')
      using errcode = '23503',
            detail = 'Instrutor com historico nao e excluido: so desativado (RN-INST-02).';
  end if;

  delete from public.instrutores i where i.id = p_instrutor_id;

  -- ⚠️ ZERO LINHAS NAO E SUCESSO. Se um dia a tabela ganhar FORCE ROW LEVEL SECURITY, o dono passa pela
  --    RLS, que nao tem policy de DELETE, e o apagar filtraria em silencio. A contagem transforma isso
  --    em erro, em vez de uma exclusao que parece feita.
  get diagnostics v_apagadas = row_count;
  if v_apagadas <> 1 then
    raise exception 'a exclusao nao alcancou o instrutor' using errcode = '42501';
  end if;

  return jsonb_build_object('codigo', v_codigo, 'nome_completo', v_nome);
end;
$$;

comment on function app.excluir_instrutor(uuid, text) is
  'Exclusao PERMANENTE de instrutor sem historico nenhum — a excecao unica a regra 4 do CLAUDE.md, '
  'autorizada por Bernardo Villas Boas em 15/09/2026. Exige app.pode(instrutores, criar), o codigo '
  'digitado igual ao do instrutor e nenhum impedimento. Recusa com 42501, P0002, 22023 ou 23503.';

revoke all on function app.excluir_instrutor(uuid, text) from public;
revoke all on function app.excluir_instrutor(uuid, text) from anon;
grant execute on function app.excluir_instrutor(uuid, text) to authenticated;


-- Os invólucros expostos — o schema `app` nao e servido pela interface de dados. Nao decidem nada.
create or replace function public.impedimentos_de_exclusao_do_instrutor(p_instrutor_id uuid)
returns text[]
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select app.impedimentos_de_exclusao_do_instrutor(p_instrutor_id);
$$;

comment on function public.impedimentos_de_exclusao_do_instrutor(uuid) is
  'Ponto de entrada exposto de app.impedimentos_de_exclusao_do_instrutor. Nao decide nada.';

revoke all on function public.impedimentos_de_exclusao_do_instrutor(uuid) from public;
revoke all on function public.impedimentos_de_exclusao_do_instrutor(uuid) from anon;
grant execute on function public.impedimentos_de_exclusao_do_instrutor(uuid) to authenticated;

create or replace function public.excluir_instrutor(p_instrutor_id uuid, p_codigo_confirmacao text)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public
as $$
  select app.excluir_instrutor(p_instrutor_id, p_codigo_confirmacao);
$$;

comment on function public.excluir_instrutor(uuid, text) is
  'Ponto de entrada exposto de app.excluir_instrutor. Nao decide nada.';

revoke all on function public.excluir_instrutor(uuid, text) from public;
revoke all on function public.excluir_instrutor(uuid, text) from anon;
grant execute on function public.excluir_instrutor(uuid, text) to authenticated;

-- =================================================================================
-- PLANO DE REVERSAO
--
--   drop function if exists public.excluir_instrutor(uuid, text);
--   drop function if exists public.impedimentos_de_exclusao_do_instrutor(uuid);
--   drop function if exists app.excluir_instrutor(uuid, text);
--   drop function if exists app.impedimentos_de_exclusao_do_instrutor(uuid);
--
-- ⚠️ Reverter tira a unica porta de exclusao e devolve a regra 4 a "nada e apagado" sem excecao.
--    Instrutores ja excluidos NAO voltam: a exclusao e permanente, e nao ha registro de onde
--    recupera-los.
-- =================================================================================
