-- =================================================================================
-- O PORTEIRO DE ADMIN DEIXA DE FALHAR ABERTO — spec 011, achado em 03/10/2026
-- Data local do responsavel: 03/10/2026 (o carimbo do nome do arquivo e UTC)
-- =================================================================================
-- ⚠️ ESTE DEFEITO FOI ACHADO AO PLANTAR UM DEFEITO DELIBERADO EM OUTRA FUNCAO, e nao por
--    revisao. Ao deixar inerte o porteiro de `public.excluir_conta` para ver o caso novo
--    reprovar, a recusa chegou de `public.registrar_acao_em_conta` — e ler o porteiro DELA
--    mostrou que ele tem a forma do **gotcha 15**: `if not app.eh_admin() then raise`.
--
-- ⚠️ O ATOR NAO E HIPOTETICO: E A CONTA QUE O ADMIN ACABOU DE DESATIVAR.
--    `app.perfil_atual()` filtra `status = 'ativo'`, e desativar **nao toca a credencial** (e de
--    proposito: o cadastro fica). Entao a conta desativada continua AUTENTICANDO, e para ela
--    `app.perfil_atual()` devolve NULL, logo `app.eh_admin()` devolvia NULL — e `if not NULL`
--    **nao entra no `if`**. O mesmo vale para credencial orfa, que e o que a exclusao deixa se o
--    passo 2 (apagar a credencial) falhar.
--    MEDIDO no banco local em 03/10/2026, com sessao real: a conta desativada **GRAVOU** uma
--    linha na trilha, com `error: null`. O caso esta em
--    `tests/invariantes/rls/gestao-de-usuarios.test.ts` e reprovava antes desta migration.
--
-- ⚠️ O QUE ISSO CUSTARIA: LINHA FORJADA NUMA TABELA QUE NINGUEM APAGA. A trilha e so de
--    acrescimo e imutavel **inclusive para a `service_role`** (pgTAP 114), entao registro falso
--    ali e permanente — e a trilha e a primeira coisa que alguem le ao investigar uma conta.
--
-- ⚠️ E A VARREDURA DO CATALOGO MOSTROU QUE O PROBLEMA E DE UMA FUNCAO SO, nao de nove:
--    ha 9 porteiros na forma `if not app.<fn>()`, mas 8 chamam `app.pode()`, que **devolve
--    `false` explicitamente** quando nao ha perfil (`if v_perfil is null then return false`).
--    Somente `app.eh_admin()` — que era `select app.perfil_atual() = 'admin'` — devolvia NULL.
--    E `app.impedir_autoescalonamento()` usa a forma POSITIVA (`if app.eh_admin() then return
--    new`), que falha FECHADA. Medido no catalogo do banco local, nao suposto.
--
-- O conserto e nos DOIS lugares, de proposito:
--   A. na RAIZ — `app.eh_admin()` deixa de poder devolver NULL;
--   B. no CHAMADOR — o porteiro passa a `coalesce(..., false) is not true`, a mesma forma que as
--      duas funcoes de `20261003000205` ja usam.
-- Consertar so a raiz deixaria a forma perigosa escrita no codigo para a proxima funcao copiar;
-- consertar so o chamador deixaria a funcao capaz de devolver NULL para o proximo chamador.
--
-- REVERSAO: recriar as duas funcoes como estavam em `20260830000111` e `20261002195248`. Nenhuma
-- linha de dado e tocada: esta migration nao le nem escreve a trilha, `usuarios`, nem qualquer
-- outra tabela.
-- ⚠️ REVERTER REABRE O BURACO — a reversao esta escrita porque o DoD 6 a exige, nao porque ela
--    deva ser usada.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- PARTE A — a raiz: `app.eh_admin()` nunca mais devolve NULL
-- ---------------------------------------------------------------------------------
-- ⚠️ ISTO E ESTRITAMENTE MAIS RESTRITIVO, E NAO MUDA NENHUMA POLICY. Em posicao de porteiro
--    booleano, NULL e `false` dao o MESMO veredito: numa policy, `using NULL` nega; `NULL or
--    true` = true como `false or true`; `NULL and true` = NULL (nega) como `false and true` =
--    false (nega). A unica posicao em que os dois diferem e sob `not` — e e exatamente o buraco.
--    As 6 policies que a chamam (contadas no catalogo) seguem com o mesmo comportamento.
create or replace function app.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  -- ⚠️ O `coalesce` NAO E ESTILO DEFENSIVO: sem ele a funcao devolve NULL para toda sessao sem
  --    cadastro ATIVO — conta desativada, credencial orfa, conta excluida com token ainda vivo.
  select coalesce(app.perfil_atual() = 'admin', false);
$$;

comment on function app.eh_admin() is
  'Verdadeiro quando a sessao atual tem cadastro ATIVO com perfil Admin. Nunca devolve NULL '
  '(emenda de 03/10/2026, spec 011): devolvia NULL para sessao sem cadastro ativo, e porteiro '
  'escrito com `if not app.eh_admin()` falhava ABERTO para a conta desativada.';

-- ⚠️ **O PRIVILEGIO DE `app.eh_admin()` NAO E TOCADO AQUI, E ISSO E DELIBERADO.** A primeira versao
--    desta migration trazia `revoke all … from public, anon` + `grant … to authenticated,
--    service_role`, e isso **estreitava** a funcao: medido no catalogo, ela tinha
--    `{=X/postgres,postgres=X,authenticated=X}` — o `=X` da frente e o EXECUTE para **PUBLIC** que
--    `create function` concede por padrao, e que as irmas `app.pode()` e `app.perfil_atual()` ainda
--    tem. `create or replace function` **preserva** a ACL, entao nao mexer aqui deixa a funcao
--    exatamente como estava.
-- ⚠️ **E a conferencia mostrou que estreitar nao resolveria nada:** as **6** policies que a chamam
--    estao em `usuarios`, `usuario_curso` e `perfil_permissao`, e as tres sao `to authenticated` —
--    `anon` nunca avalia nenhuma delas. O defeito desta migration e o **valor de retorno**, nao quem
--    pode chamar; misturar as duas coisas num conserto de seguranca e o jeito de mudar
--    comportamento que ninguem pediu.

-- ---------------------------------------------------------------------------------
-- PARTE B — o chamador: a forma que nao depende do valor de retorno
-- ---------------------------------------------------------------------------------
create or replace function public.registrar_acao_em_conta(
  p_conta_alvo_id     uuid,
  p_acao              text,
  p_conta_alvo_codigo text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_autor  uuid := auth.uid();
  v_codigo text := p_conta_alvo_codigo;
begin
  if v_autor is null then
    raise exception 'registro de auditoria exige sessao autenticada'
      using errcode = '42501', hint = 'auditoria_sem_autor';
  end if;

  -- ⚠️ SO ADMIN REGISTRA, e a conferencia e aqui porque a funcao e DEFINER: sem ela, qualquer
  --    sessao autenticada poderia escrever na trilha, que nao tem policy de escrita
  --    justamente para que ninguem escreva por fora.
  -- ⚠️ `coalesce(..., false) is not true` E A FORMA, e `if not app.eh_admin()` era o defeito
  --    (gotcha 15): com NULL, `not NULL` e NULL, o `if` NAO entra, e o porteiro vira enfeite.
  --    A forma abaixo recusa para `false` E para NULL, qualquer que seja o retorno da funcao.
  if coalesce(app.eh_admin(), false) is not true then
    raise exception 'registro de auditoria restrito ao perfil Admin'
      using errcode = '42501', hint = 'auditoria_sem_permissao';
  end if;

  if v_codigo is null then
    select u.codigo into v_codigo from public.usuarios u where u.id = p_conta_alvo_id;
  end if;

  if v_codigo is null or btrim(v_codigo) = '' then
    raise exception 'conta alvo % nao tem codigo legivel para o rastro', p_conta_alvo_id
      using errcode = '23502', hint = 'auditoria_sem_codigo';
  end if;

  insert into public.auditoria_de_conta (autor_id, acao, conta_alvo_id, conta_alvo_codigo)
  values (v_autor, p_acao, p_conta_alvo_id, v_codigo);
end;
$$;

comment on function public.registrar_acao_em_conta(uuid, text, text) is
  'Grava uma linha na trilha de acoes sobre conta. O autor sai de `auth.uid()` DENTRO da '
  'funcao, e o codigo da conta alvo sai da propria tabela quando nao e informado — na '
  'exclusao ele e informado, porque a linha ja nao existe. Recusa sem sessao (42501) e sem '
  'perfil Admin (42501) — inclusive quando o cadastro existe e esta INATIVO.';

-- ⚠️ `create or replace function` PRESERVA privilegio, e o revoke/grant fica repetido de
--    proposito: ele e a declaracao de quem alcanca a funcao, e migration que o omite ensina a
--    omitir — como a nota do Epico 3 sobre view nova que nasce com DELETE para `authenticated`.
revoke all on function public.registrar_acao_em_conta(uuid, text, text) from public, anon;
grant execute on function public.registrar_acao_em_conta(uuid, text, text) to authenticated;
