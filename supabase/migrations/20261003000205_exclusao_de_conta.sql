-- =================================================================================
-- M3 da spec 011 — a exclusao permanente de CONTA.
--
-- O QUE  : (1) `usuarios.excluida_em`, o marcador que tira a conta anonimizada da lista;
--          (2) `public.dependentes_da_conta(uuid)`, que mede se a conta carimbou linha;
--          (3) `public.excluir_conta(uuid)`, com porteiro, os DOIS caminhos e o rastro.
--
-- POR QUE: *"EXCLUIR usuario permanentemente (admin) (...) conta SEM registros dependentes
--          -> apaga a credencial (auth) e a linha; conta COM dependentes -> apaga a
--          credencial de vez e anonimiza a linha"* — decisao de Bernardo Villas Boas,
--          03/10/2026, na reconferencia do PR 2 da spec 011.
--
-- ⚠️ EMENDA A REGRA 4, E ELA E NOMINAL. O `CLAUDE.md` diz, com estas palavras: *"a excecao
--    passa a cobrir TRES tabelas — `instrutores`, `disciplinas` e `unidades_ensino` (...)
--    nenhuma outra tabela ganha excecao"*. Esta migration acrescenta `usuarios` a lista, por
--    decisao expressa de Bernardo nesta data. **O registro vai no `CLAUDE.md` junto** — sem
--    isso, a sessao seguinte leria esta funcao como violacao da regra que ela mesma emenda.
--
-- ⚠️ E ELA CONTINUA SEM POLICY E SEM PRIVILEGIO DE `DELETE` PARA `authenticated`. Quem apaga e
--    esta funcao, `SECURITY DEFINER`, com porteiro de Admin dentro. A assercao 13 de
--    `107_exclusao_com_rastro.sql` — zero policies de `DELETE` no catalogo — segue valendo e
--    segue verde.
--
-- ⚠️ DOIS CAMINHOS, E A ESCOLHA NAO E DE GOSTO. `criado_por` e `editado_por` existem em **27
--    tabelas** e **nao tem FK nenhuma** (medido em 03/10/2026): apagar a linha nao viola
--    restricao alguma, e e por isso que o cuidado tem de ser deliberado. O que se perde e a
--    RESOLUCAO do autor — a tela deixaria de saber de quem era aquele `uuid`, e o historico
--    passaria a exibir um identificador sem nome. Por isso:
--      · conta que nunca carimbou nada  -> a linha SAI (nao ha historico a proteger);
--      · conta que carimbou qualquer coisa -> a linha FICA, anonimizada.
--    E a mesma logica da excecao de instrutor: *"a regra existe para proteger historico, e um
--    cadastro criado por engano nao tem historico a proteger"*.
--
-- ⚠️ A ANONIMIZACAO LIBERA O E-MAIL, e isso e requisito. `usuarios_email_key` e UNIQUE e
--    `usuarios_email_normalizado` exige minuscula com `@` e ponto depois — entao o e-mail vai
--    para um sentinela que casa o CHECK e nao colide: `excluida-<id>@ciaara11.invalid`.
--    `.invalid` e reservado por norma (RFC 2606) e nunca existira de verdade.
--
-- ⚠️ `excluida_em` E COLUNA, E NAO VALOR NOVO EM `status`. Acrescentar `excluida` ao enum faria
--    **todo filtro de status do sistema** passar a ter um terceiro caso — e filtro escrito como
--    `status = 'ativo'` continuaria compilando e silenciosamente passaria a esconder coisa nova.
--    Coluna anulavel nao mexe em nada do que ja existe: `null` = conta viva.
--
-- ⚠️ A ACAO `excluir` JA EXISTIA no CHECK de `auditoria_de_conta` — ela entrou com a trilha, em
--    02/10/2026, porque a decisao D-2 ja previa os seis verbos. **Nao ha CHECK a alterar.**
--
-- REVERSAO (executada numa base descartavel antes do PR):
--    drop function if exists public.excluir_conta(uuid);
--    drop function if exists public.dependentes_da_conta(uuid);
--    alter table public.usuarios drop column if exists excluida_em;
--    ⚠️ O `drop column` so e seguro ENQUANTO nenhuma conta tiver sido excluida. Com linha
--       anonimizada, perder a coluna faria a conta voltar a aparecer na lista como se estivesse
--       viva — e o nome dela seria "Conta excluida", o que e pior que o estado de antes.
--       Nesse caso a reversao para nas funcoes, e a coluna fica.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- PARTE A — o marcador
-- ---------------------------------------------------------------------------------
alter table public.usuarios
  add column if not exists excluida_em timestamptz;

comment on column public.usuarios.excluida_em is
  'Quando a conta foi EXCLUIDA pelo Admin. Nulo = conta viva (o caso normal). A linha so '
  'sobrevive a exclusao quando ela carimbou historico: nesse caso ela fica anonimizada, para '
  'que `criado_por` continue resolvendo para um nome — "Conta excluida" — em vez de um uuid '
  'sem dono. Conta sem historico nenhum NAO deixa linha. Ver `public.excluir_conta`.';

-- ⚠️ O indice e PARCIAL de proposito: a lista pergunta sempre por `excluida_em is null`, e um
--    indice sobre a coluna inteira ocuparia espaco para indexar o valor que quase nao existe.
create index if not exists ix_usuarios_vivas
  on public.usuarios (nome) where excluida_em is null;

-- ---------------------------------------------------------------------------------
-- PARTE B — a conta carimbou alguma coisa?
--
-- ⚠️ A LISTA DE TABELAS E LIDA DO CATALOGO, NUNCA ESCRITA A MAO. Medido em 03/10/2026: 27
--    tabelas de `public` tem `criado_por`/`editado_por` (as duas entradas restantes da
--    varredura eram VIEWS, que nao guardam nada). Uma lista literal aqui envelheceria na
--    primeira tabela nova, e envelheceria para o lado perigoso: a conta pareceria sem
--    historico e a linha seria apagada.
-- ---------------------------------------------------------------------------------
create or replace function public.dependentes_da_conta(p_conta_id uuid)
returns table (tabela text, quantas bigint)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_auth uuid;
  v_sql  text;
  v_n    bigint;
  r      record;
begin
  -- ⚠️ **`coalesce(..., false)` NAO E ENFEITE, E A FALTA DELE DEIXOU ESTE PORTEIRO INERTE.**
  --    Medido em 03/10/2026, no banco local: sem sessao, `app.eh_admin()` devolve **NULL**, nao
  --    `false` — ela e `app.perfil_atual() = 'admin'`, e comparacao com nulo da nulo. E
  --    `if not NULL then` **nao entra**: a funcao seguia em frente e devolvia a lista de onde a
  --    conta agiu para quem nao tem sessao nenhuma. Quem pegou foi o pgTAP, que roda sem sessao.
  --    ⚠️ O mesmo padrao existe em `registrar_acao_em_conta`, e lá ele e inofensivo **por
  --       acidente**: o `raise` de `auth.uid() is null` vem ANTES e barra o caminho.
  if coalesce(app.eh_admin(), false) is not true then
    raise exception 'consulta de dependentes restrita ao perfil Admin'
      using errcode = '42501', hint = 'conta_sem_permissao';
  end if;

  select u.auth_user_id into v_auth from public.usuarios u where u.id = p_conta_id;

  -- ⚠️ Conta SEM credencial nunca carimbou nada: o gatilho de auditoria le `auth.uid()`, e sem
  --    `auth_user_id` nao existe sessao que pudesse ter gravado em nome dela. Devolver vazio
  --    aqui nao e atalho — e a resposta certa.
  if v_auth is null then
    return;
  end if;

  for r in
    select c.table_name, c.column_name
      from information_schema.columns c
      join information_schema.tables t
        on t.table_schema = c.table_schema and t.table_name = c.table_name
     where c.table_schema = 'public'
       and c.column_name in ('criado_por', 'editado_por')
       and t.table_type = 'BASE TABLE'
  loop
    v_sql := format('select count(*) from public.%I where %I = $1', r.table_name, r.column_name);
    execute v_sql into v_n using v_auth;
    if v_n > 0 then
      tabela := r.table_name || '.' || r.column_name;
      quantas := v_n;
      return next;
    end if;
  end loop;

  -- A trilha de contas tambem conta: um Admin que agiu sobre contas deixou rastro com o nome
  -- dele, e `auditoria_de_conta.autor_id` nao tem FK justamente para o rastro sobreviver.
  select count(*) into v_n from public.auditoria_de_conta a where a.autor_id = v_auth;
  if v_n > 0 then
    tabela := 'auditoria_de_conta.autor_id';
    quantas := v_n;
    return next;
  end if;
end;
$$;

comment on function public.dependentes_da_conta(uuid) is
  'Onde a conta carimbou linha — `criado_por`/`editado_por` das 27 tabelas de `public` (lista '
  'lida do catalogo, nunca escrita a mao) e `auditoria_de_conta.autor_id`. Vazio significa '
  'que a exclusao pode apagar a linha; qualquer resultado significa que ela sera anonimizada.';

revoke all on function public.dependentes_da_conta(uuid) from public, anon;
grant execute on function public.dependentes_da_conta(uuid) to authenticated;

-- ---------------------------------------------------------------------------------
-- PARTE C — a exclusao, com porteiro
--
-- ⚠️ ELA NAO APAGA A CREDENCIAL, e nao e esquecimento: `auth.users` e da plataforma, e quem a
--    remove e `auth.admin.deleteUser` na Server Action. **A ORDEM NA ACAO E CREDENCIAL
--    PRIMEIRO** — se esta funcao falhasse depois, sobraria linha sem credencial, que e estado
--    visivel na lista e que o Admin consegue repetir. O inverso deixaria credencial sem
--    cadastro: a pessoa autenticaria e entraria num sistema que nao a conhece.
-- ---------------------------------------------------------------------------------
create or replace function public.excluir_conta(p_conta_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_eu        uuid := auth.uid();
  v_minha     uuid;
  v_codigo    text;
  v_perfil    public.perfil_usuario;
  v_status    text;
  v_admins    integer;
  v_tem       boolean;
  v_caminho   text;
begin
  if v_eu is null then
    raise exception 'exclusao de conta exige sessao autenticada'
      using errcode = '42501', hint = 'conta_sem_sessao';
  end if;
  -- ⚠️ `coalesce` aqui tambem, pelo mesmo motivo — ver a nota em `dependentes_da_conta`. Nesta
  --    funcao o `raise` de `auth.uid() is null` acima ja barraria, mas depender da ORDEM de dois
  --    porteiros e o tipo de coisa que a proxima edicao desfaz sem perceber.
  if coalesce(app.eh_admin(), false) is not true then
    raise exception 'exclusao de conta restrita ao perfil Admin'
      using errcode = '42501', hint = 'conta_sem_permissao';
  end if;

  select u.codigo, u.perfil, u.status, u.excluida_em is not null
    into v_codigo, v_perfil, v_status, v_tem
    from public.usuarios u where u.id = p_conta_id;
  if not found then
    raise exception 'conta % nao existe', p_conta_id
      using errcode = '23503', hint = 'conta_inexistente';
  end if;
  if v_tem then
    raise exception 'esta conta ja foi excluida'
      using errcode = '23505', hint = 'conta_ja_excluida';
  end if;

  -- ⚠️ A PROPRIA CONTA: a comparacao e por `usuarios.id`, e nao por `auth.uid()`. Comparar o
  --    uuid de `auth` com o da linha daria SEMPRE diferente, e o Admin passaria a poder excluir
  --    a si mesmo com a guarda no lugar e nada acusando.
  select u.id into v_minha from public.usuarios u where u.auth_user_id = v_eu;
  if v_minha = p_conta_id then
    raise exception 'ninguem exclui a propria conta'
      using errcode = '42501', hint = 'conta_propria';
  end if;

  -- ⚠️ O CHAO DE UM ADMIN ATIVO (`FR-042`). Excluir tira da lista de admins tanto quanto
  --    rebaixar ou desativar — e aqui sem volta.
  if v_perfil = 'admin' and v_status = 'ativo' then
    select count(*) into v_admins
      from public.usuarios u
     where u.perfil = 'admin' and u.status = 'ativo' and u.excluida_em is null
       and u.id <> p_conta_id;
    if v_admins = 0 then
      raise exception 'o sistema precisa de pelo menos um Administrador ativo'
        using errcode = '42501', hint = 'ultimo_admin';
    end if;
  end if;

  -- O rastro ANTES de a linha mudar: depois da anonimizacao o codigo ainda existe, mas depois
  -- do apagamento nao — e o rastro precisa do codigo legivel nos dois caminhos.
  perform public.registrar_acao_em_conta(p_conta_id, 'excluir', v_codigo);

  select exists (select 1 from public.dependentes_da_conta(p_conta_id)) into v_tem;

  -- Os vinculos de curso saem nos DOIS caminhos: eles sao configuracao da conta, nao
  -- historico. A FK `usuario_curso.usuario_id` e `restrict`, entao sem isto o apagamento falha.
  delete from public.usuario_curso where usuario_id = p_conta_id;

  if v_tem then
    update public.usuarios
       set nome           = 'Conta excluída',
           nome_exibicao  = 'Conta excluída',
           email          = 'excluida-' || replace(p_conta_id::text, '-', '') || '@ciaara11.invalid',
           avatar_caminho = null,
           auth_user_id   = null,
           status         = 'inativo',
           excluida_em    = now()
     where id = p_conta_id;
    v_caminho := 'anonimizada';
  else
    delete from public.usuarios where id = p_conta_id;
    v_caminho := 'apagada';
  end if;

  return v_caminho;
end;
$$;

comment on function public.excluir_conta(uuid) is
  'Exclusao permanente de conta (decisao de Bernardo Villas Boas, 03/10/2026; emenda nominal a '
  'regra 4). Recusa sem sessao, sem perfil Admin, a propria conta, o ultimo Admin ativo e a '
  'conta ja excluida — todas com 42501 ou 23505 e `hint` nomeado. Grava o rastro ANTES de '
  'mexer na linha. Devolve `apagada` quando a conta nunca carimbou nada, e `anonimizada` '
  'quando carimbou: ali a linha fica, com o e-mail trocado por sentinela `.invalid`, para que '
  '`criado_por` continue resolvendo para um nome. NAO toca em `auth.users`: a credencial sai '
  'na Server Action, ANTES desta chamada.';

revoke all on function public.excluir_conta(uuid) from public, anon;
grant execute on function public.excluir_conta(uuid) to authenticated;
