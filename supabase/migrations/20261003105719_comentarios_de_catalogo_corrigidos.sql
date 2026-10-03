-- =================================================================================
-- DOIS COMENTARIOS DE CATALOGO QUE DIZIAM O CONTRARIO DO CODIGO — spec 011
-- Data local do responsavel: 03/10/2026 (o carimbo do nome do arquivo e UTC)
-- Autorizacao de Bernardo Villas Boas, 03/10/2026, nesta sessao: "Sim, migration so de
-- comentario", respondendo a pergunta sobre os dois comentarios gravados no banco.
-- =================================================================================
-- ⚠️ ESTA MIGRATION NAO MUDA COMPORTAMENTO NENHUM. Ela corrige TEXTO que esta gravado no
--    catalogo do banco — e texto de catalogo e o que a proxima pessoa le quando roda `\df+` ou
--    `\sf` no psql, longe de qualquer documento do repositorio.
--
-- ⚠️ POR QUE ISSO MERECE UMA MIGRATION: os dois comentarios nao estao vagos, estao INVERTIDOS.
--    Um deles descreve a ordem de duas operacoes ao contrario do que ela e, e essa ordem custou
--    uma medicao (`Database error deleting user`) e esta registrada no `CLAUDE.md` como achado.
--    **Comentario que inverte a ordem manda a proxima edicao "consertar" o codigo na direcao
--    errada** — e quem edita confia no comentario que esta ao lado da funcao, nao no que esta
--    num arquivo `.md` a tres pastas de distancia.
--
-- REVERSAO: reaplicar os textos de `20261003000205`, que estao no repositorio. Nenhuma linha de
-- dado e tocada, nenhuma assinatura muda, nenhum privilegio muda.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- PARTE A — `public.excluir_conta`: a ordem estava invertida no comentario
-- ---------------------------------------------------------------------------------
-- ⚠️ O TEXTO ANTERIOR AFIRMAVA: "NAO toca em `auth.users`: a credencial sai na Server Action,
--    **ANTES desta chamada**." A segunda metade e falsa, e o contrario dela foi MEDIDO em
--    03/10/2026: `usuarios_auth_user_id_fkey` -> `auth.users` e **restrict**, entao enquanto a
--    linha de `usuarios` referencia a credencial, `auth.admin.deleteUser` responde
--    "Database error deleting user". A ordem real e **cadastro primeiro (esta funcao),
--    credencial depois**, e o risco invertido esta declarado no codigo da Server Action:
--    credencial orfa nao alcanca dado nenhum, porque sem cadastro a RLS nega tudo.
-- ⚠️ Apenas o COMENTARIO muda. A funcao nao e recriada aqui — `comment on function` escreve em
--    `pg_description` e nao encosta em `prosrc`.
comment on function public.excluir_conta(uuid) is
  'Exclusao permanente de conta (decisao de Bernardo Villas Boas, 03/10/2026; emenda nominal a '
  'regra 4). Recusa sem sessao, sem perfil Admin, a propria conta, o ultimo Admin ativo e a '
  'conta ja excluida — todas com 42501 ou 23505 e `hint` nomeado. Grava o rastro ANTES de '
  'mexer na linha. Devolve `apagada` quando a conta nunca carimbou nada, e `anonimizada` '
  'quando carimbou: ali a linha fica, com o e-mail trocado por sentinela `.invalid`, para que '
  '`criado_por` continue resolvendo para um nome. NAO toca em `auth.users` — a credencial sai '
  'na Server Action, DEPOIS desta chamada, e a ordem e forcada pela FK restrict '
  '`usuarios_auth_user_id_fkey`: com a linha ainda referenciando a credencial, apagar a '
  'credencial falha. (Comentario corrigido em 03/10/2026: ele dizia ANTES, e o contrario foi '
  'medido.)';

-- ---------------------------------------------------------------------------------
-- PARTE B — `public.dependentes_da_conta`: a nota sobre a OUTRA funcao era falsa
-- ---------------------------------------------------------------------------------
-- ⚠️ O CORPO DESTA FUNCAO AFIRMAVA, sobre `registrar_acao_em_conta`: "la ele e inofensivo **por
--    acidente**: o `raise` de `auth.uid() is null` vem ANTES e barra o caminho." **As duas
--    afirmacoes eram falsas**, e a medicao veio horas depois, no mesmo dia: `auth.uid()` protege
--    contra "sem sessao", e o ator que importa **tem sessao** — e a conta que o Admin acabou de
--    desativar, que continua autenticando porque desativar nao toca a credencial. Medido com
--    sessao real: ela **GRAVOU** linha na trilha imutavel, com `error: null`.
--    O conserto foi `20261003042704`, que fez `app.eh_admin()` nunca mais devolver NULL e trocou
--    a forma do porteiro de la.
-- ⚠️ AQUI A FUNCAO E RECRIADA, porque o texto errado esta DENTRO do corpo (`prosrc`), e nao num
--    `comment on`. **O corpo e identico ao de `20261003000205`, exceto esse comentario** — nada
--    de logica muda. ⚠️ Consequencia conhecida: a impressao digital do esquema MUDA de valor,
--    porque ela resume `prosrc`; ela precisa mudar **do mesmo jeito nos dois bancos**, que e o
--    que a conferencia da aplicacao mede.
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
  --    Medido em 03/10/2026, no banco local: sem sessao, `app.eh_admin()` devolvia **NULL**, nao
  --    `false` — ela era `app.perfil_atual() = 'admin'`, e comparacao com nulo da nulo. E
  --    `if not NULL then` **nao entra**: a funcao seguia em frente e devolvia a lista de onde a
  --    conta agiu para quem nao tem sessao nenhuma. Quem pegou foi o pgTAP, que roda sem sessao.
  --    ⚠️ **A FORMA ERRADA EXISTIA TAMBEM EM `registrar_acao_em_conta`, E LA ELA NAO ERA
  --       INOFENSIVA** — este comentario afirmava que era, "por acidente", porque o `raise` de
  --       `auth.uid() is null` vinha antes. **Falso, e medido no mesmo dia:** `auth.uid()` barra
  --       quem nao tem sessao, e o ator que importa TEM sessao — e a conta que o Admin acabou de
  --       desativar, que `app.perfil_atual()` ignora (filtra `status = 'ativo'`) mas que continua
  --       autenticando, porque desativar nao toca a credencial. Com sessao real, ela GRAVOU linha
  --       na trilha imutavel. Consertado em `20261003042704`, na raiz: `app.eh_admin()` nunca mais
  --       devolve NULL.
  if coalesce(app.eh_admin(), false) is not true then
    raise exception 'consulta de dependentes restrita ao perfil Admin'
      using errcode = '42501', hint = 'conta_sem_permissao';
  end if;

  select u.auth_user_id into v_auth from public.usuarios u where u.id = p_conta_id;

  -- ⚠️ Conta SEM credencial nunca carimbou nada: o gatilho de auditoria le `auth.uid()`, e sem
  --    `auth_user_id` nao existe sessao que pudesse ter gravado em nome dela. Devolver vazio
  --    aqui nao e atalho — e a resposta certa.
  --    ⚠️ E ela e o caso COMUM, nao a excecao: medido no remoto em 03/10/2026, so por leitura,
  --       **4 das 5 contas reais estao nesse estado** — vieram do ETL e do convite antigo.
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

-- ⚠️ `create or replace function` PRESERVA privilegio, e o revoke/grant fica repetido de
--    proposito: ele e a declaracao de quem alcanca a funcao, e migration que o omite ensina a
--    omitir — como a nota do Epico 3 sobre view nova que nasce com DELETE para `authenticated`.
revoke all on function public.dependentes_da_conta(uuid) from public, anon;
grant execute on function public.dependentes_da_conta(uuid) to authenticated;
