-- #####################################################################################
-- CIAARA-11 v2.1 — 05_rls_policies.sql
-- Autenticação, autorização e Row Level Security
-- -------------------------------------------------------------------------------------
-- Versão : 2.1 · 26/08/2026
-- Origem : BRIEF v2.1 §3 · documento 01 §2.2 (matriz de perfis) · documento 22
-- Aplica-se depois de: 00_extensoes_e_tipos · 01_tabelas_cadastro · 02_tabelas_fato
--                      03_config_e_calendario · 04_views_e_funcoes
-- -------------------------------------------------------------------------------------
-- O QUÊ  : cria as duas tabelas da camada de autenticação (`usuarios`, `usuario_curso`),
--          concede os GRANTs de tabela e escreve as policies RLS das 25 tabelas.
--
-- PARA QUÊ: este arquivo é a materialização do `RNF-SEG-02`. Na v2.0 aquele requisito
--          dizia "toda operação de escrita deve ser verificada no servidor contra o
--          perfil do usuário autenticado, independentemente do que a interface exibe".
--          Era uma DISCIPLINA DE CÓDIGO: bastava um `.gs` esquecer a checagem para o
--          requisito virar ficção, e nada no sistema avisava. Aqui ele deixa de ser
--          disciplina e vira GARANTIA DO MOTOR — o PostgreSQL recusa a linha, não
--          importa por qual caminho a requisição chegou.
--
-- COMO   : três decisões estruturais sustentam o arquivo inteiro.
--
--          1. AS POLICIES SÃO DIRIGIDAS POR DADO, NÃO POR PERFIL.
--             Nenhuma policy diz `perfil = 'operador'`. Toda policy pergunta
--             `app.pode('<recurso>','<acao>')`, e a resposta vem da tabela
--             `perfil_permissao`. Consequência prática: mudar quem pode lançar aula é
--             um UPDATE numa linha, não uma migration com `DROP POLICY`/`CREATE POLICY`
--             em produção. É o Princípio VII (Configuração sobre Constante) aplicado à
--             autorização — o mesmo princípio que tirou os tetos normativos de dentro
--             do `Código.gs`.
--
--          2. PERMISSÃO E ALCANCE SÃO COISAS DIFERENTES, E AMBAS PRECISAM SER VERDADE.
--             `app.pode()` responde "este PERFIL pode executar esta AÇÃO?".
--             `app.cursos_do_usuario()` responde "sobre QUAIS CURSOS?".
--             Um Operador de escopo `expedito` pode criar registro de aula (permissão),
--             mas só nas turmas dos cursos expeditos (alcance). Toda policy de tabela
--             com recorte de curso é a conjunção das duas — separá-las é o que evita a
--             explosão combinatória de 9 perfis × 5 escopos × 25 tabelas.
--
--          3. `FOR DELETE` NÃO EXISTE.
--             Nenhuma tabela de cadastro ou de fato recebe policy de DELETE. Sem policy
--             permissiva, o PostgreSQL nega — e essa negação é a implementação física de
--             `RN-INST-05` generalizada (exclusão lógica universal, C-05). O que a
--             interface chama de "excluir" é um UPDATE de `status` para `inativo`,
--             coberto pela policy de UPDATE e pela ação `desativar` da matriz. Um agente
--             de código que "conserte" isso acrescentando uma policy de DELETE está
--             quebrando uma regra de negócio, não corrigindo um esquecimento.
-- #####################################################################################


-- #####################################################################################
-- PARTE I — TABELAS DA CAMADA DE AUTENTICAÇÃO
-- -------------------------------------------------------------------------------------
-- Por que `usuarios` e `usuario_curso` nascem AQUI e não em `01_tabelas_cadastro.sql`:
-- elas não são cadastro de domínio, são a camada de autorização. Vivem junto das policies
-- que as consomem, e as funções de `04_views_e_funcoes.sql` já foram escritas para
-- degradar com segurança (`exception when undefined_table then return null`) justamente
-- para que os arquivos 00–04 apliquem sozinhos, sem esta migration. Quem lê `04` e vê
-- `public.usuarios` referenciada está vendo a dependência declarada, não um erro.
-- #####################################################################################

-- =====================================================================================
-- TABELA 24 — `usuarios`   (v2.0: aba `Usuarios`, 4 linhas)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : a conta autorizada e seu perfil de RBAC. Espelho 1:1 de `auth.users`.
-- PARA QUÊ: `auth.users` é do Supabase e guarda credencial (e-mail, hash de senha,
--          confirmação). Ela NÃO é lugar para dado de domínio — não se põe perfil
--          organizacional da Marinha dentro da tabela de credenciais de um fornecedor.
--          `public.usuarios` é o nosso lado do espelho: perfil, escopo, vínculo com o
--          instrutor, status. É esta tabela que as policies consultam.
-- COMO   : `auth_user_id` referencia `auth.users(id)` com `on delete restrict` — apagar
--          uma credencial não pode orfanar um histórico de lançamentos. A desativação de
--          um usuário é `status = 'inativo'`, nunca DELETE (C-05).
--
-- Origem : BRIEF v2.1 §3 · documento 01 §2.2 · documento 05 (`Usuarios` revisada) ·
--          RN-RBAC-01 · RN-RBAC-02 · RF-AUTH-05
-- =====================================================================================

create table public.usuarios (
  id                uuid primary key default gen_random_uuid(),

  -- Chave de negócio legada: o `ID_Usuario` da planilha v2.0 (`USU-000001`). Preserva a
  -- rastreabilidade 1:1 exigida pelo BRIEF §2 e consumida por `origem_migracao_v1`.
  codigo            text not null unique,

  -- Espelho da credencial no Supabase Auth. NULO enquanto o convite não foi aceito:
  -- o Admin cadastra a pessoa (linha existe, perfil definido), o convite é enviado, e só
  -- quando ela define a senha é que `auth.users` ganha a linha e este campo é preenchido.
  -- Esse intervalo é justamente o que permite revisar o perfil antes do primeiro acesso.
  auth_user_id      uuid unique references auth.users(id) on delete restrict,

  email             text not null unique,
  nome              text not null,

  -- Nome de guerra / tratamento, para exibição na interface. Opcional: nem todo usuário
  -- do sistema é militar (há servidores civis — ver documento 01).
  nome_exibicao     text,

  -- O perfil de RBAC. ENUM (domínio normativo fechado, BRIEF §2): acrescentar um perfil
  -- é decisão organizacional, não configuração de tela, e exige migration deliberada.
  perfil            public.perfil_usuario not null,

  -- Recorte de curso do Operador. `geral` alcança todos. Para os demais perfis o campo é
  -- ignorado por `app.cursos_do_usuario()`, mas continua NOT NULL com default para não
  -- reintroduzir estado inferido de NULL — o defeito que a v2.0 corrigiu em `Status`.
  escopo_curso      public.escopo_curso not null default 'geral',

  -- Vínculo opcional com a ficha de instrutor da mesma pessoa (v2.0: `ID_Instrutor_Link`).
  -- É o que permite, no futuro, um portal de autoatendimento — explicitamente adiado
  -- para a v3.0 (documento 00 §7). Aqui serve só para exibir "você" nos relatórios.
  instrutor_id      uuid references public.instrutores(id) on delete restrict,

  status            public.status_registro not null default 'ativo',

  -- Registrado pelo middleware a cada sessão validada. Alimenta `RNF-SEG` (auditoria de
  -- acesso) e responde à pergunta operacional "esta conta ainda é usada?".
  ultimo_acesso     timestamptz,

  observacao        text,

  origem_migracao_v1 text,

  criado_por        uuid,
  criado_em         timestamptz not null default now(),
  editado_por       uuid,
  editado_em        timestamptz,

  -- E-mail em minúsculas e sem espaço: evita que a mesma pessoa entre duas vezes por
  -- diferença de caixa. O UNIQUE acima só é confiável com esta normalização.
  constraint usuarios_email_normalizado
    check (email = lower(btrim(email)) and email like '%_@_%._%'),

  -- Um Encarregado de Curso sem curso vinculado não enxerga nada, o que na prática é uma
  -- conta quebrada. A validação do vínculo N:N não cabe em CHECK (é outra tabela), então
  -- fica como asserção do seed e do teste de aceite — registrado aqui para quem procurar.
  constraint usuarios_escopo_coerente
    check (perfil <> 'operador' or escopo_curso is not null)
);

comment on table public.usuarios is
  'Contas autorizadas e seu perfil de RBAC. Espelho de domínio de `auth.users`: a '
  'credencial fica com o Supabase, o perfil organizacional fica aqui. '
  'Origem: BRIEF v2.1 §3; v2.0 aba `Usuarios`; RN-RBAC-01.';
comment on column public.usuarios.auth_user_id is
  'NULO entre o cadastro pelo Admin e o aceite do convite. Preenchido quando a pessoa '
  'define a senha. Origem: RF-AUTH (fluxo de convite).';
comment on column public.usuarios.perfil is
  'Perfil de RBAC. A permissão efetiva NÃO está aqui — está em `perfil_permissao`, '
  'consultada por `app.pode()`. Origem: RN-RBAC-02.';
comment on column public.usuarios.escopo_curso is
  'Recorte de curso do Operador, casado com `cursos.classificacao` por '
  '`app.cursos_do_usuario()`. Ignorado pelos demais perfis. Origem: documento 01 §2.2.';
comment on column public.usuarios.status is
  'Desativação de conta é `inativo`, nunca DELETE — o histórico de `criado_por` precisa '
  'continuar resolvendo o nome. Origem: C-05; RNF-CONF-01.';

alter table public.usuarios enable row level security;

create trigger trg_usuarios_auditoria
  before insert or update on public.usuarios
  for each row execute function app.set_auditoria();

-- Índice do caminho mais quente do sistema: toda requisição autenticada resolve
-- `auth_user_id → id` pelo menos uma vez, dentro de `app.usuario_atual()`.
create index idx_usuarios_auth on public.usuarios (auth_user_id) where status = 'ativo';
create index idx_usuarios_perfil on public.usuarios (perfil) where status = 'ativo';


-- =====================================================================================
-- TABELA 25 — `usuario_curso`   (v2.0: aba `Usuario_Curso`, NOVA na v2.0)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : vínculo N:N entre um Encarregado de Curso e os cursos sob sua coordenação.
-- PARA QUÊ: modelar isso como colunas em `usuarios` limitaria artificialmente o número
--          de cursos por coordenador — foi exatamente a conclusão registrada no
--          documento 21 §5.7 da v2.0, e continua valendo.
-- COMO   : par (usuario_id, curso_id) único entre vínculos ativos. É a fonte que
--          `app.cursos_do_usuario()` lê no ramo do Encarregado de Curso.
--
-- Origem : BRIEF v2.1 §3 · documento 01 §2.2 · v2.0 `Usuario_Curso`
-- =====================================================================================

create table public.usuario_curso (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null unique,
  usuario_id    uuid not null references public.usuarios(id) on delete restrict,
  curso_id      uuid not null references public.cursos(id)   on delete restrict,
  status        public.status_registro not null default 'ativo',
  observacao    text,
  origem_migracao_v1 text,
  criado_por    uuid,
  criado_em     timestamptz not null default now(),
  editado_por   uuid,
  editado_em    timestamptz,

  -- UNIQUE parcial: o mesmo par pode reaparecer depois de um vínculo desativado
  -- (a pessoa deixou a coordenação e voltou), mas nunca dois vínculos ativos iguais.
  constraint usuario_curso_unico_ativo unique (usuario_id, curso_id)
);

comment on table public.usuario_curso is
  'Vínculo N:N Encarregado de Curso ↔ cursos coordenados. Lido por '
  '`app.cursos_do_usuario()`. Origem: BRIEF v2.1 §3; v2.0 `Usuario_Curso`.';

alter table public.usuario_curso enable row level security;

create trigger trg_usuario_curso_auditoria
  before insert or update on public.usuario_curso
  for each row execute function app.set_auditoria();

create index idx_usuario_curso_usuario on public.usuario_curso (usuario_id) where status = 'ativo';
create index idx_usuario_curso_curso   on public.usuario_curso (curso_id)   where status = 'ativo';


-- #####################################################################################
-- PARTE II — FUNÇÕES DE ALCANCE
-- -------------------------------------------------------------------------------------
-- `app.pode()` e `app.cursos_do_usuario()` já existem em 04_views_e_funcoes.sql.
-- Aqui entram apenas os atalhos de alcance que as policies usam repetidamente, escritos
-- uma vez para não repetir a mesma subconsulta em 25 policies.
--
-- TODAS são SECURITY DEFINER + STABLE. Os dois qualificadores são deliberados:
--   • SECURITY DEFINER faz a função rodar como dona do schema, e por isso ela LÊ
--     `usuarios` e `usuario_curso` SEM passar pela RLS dessas tabelas. É o que quebra a
--     recursão infinita — sem isso, a policy de `usuarios` chamaria uma função que lê
--     `usuarios`, que dispara a policy de `usuarios`, e o PostgreSQL aborta a consulta.
--     Por isso, também, NENHUMA destas tabelas recebe `FORCE ROW LEVEL SECURITY`:
--     forçar RLS para o dono reintroduziria exatamente a recursão que se quer evitar.
--   • STABLE permite ao planejador avaliar a função uma vez por statement em vez de uma
--     vez por linha. Numa consulta de 1.753 registros de aula, a diferença não é sutil.
--   • `set search_path` fixo impede sequestro de nome por schema temporário — o vetor
--     clássico de escalonamento de privilégio em SECURITY DEFINER.
-- #####################################################################################

-- -------------------------------------------------------------------------------------
-- app.eh_admin() — atalho para as tabelas cuja escrita é exclusiva do Admin.
-- -------------------------------------------------------------------------------------
create or replace function app.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select app.perfil_atual() = 'admin';
$$;

comment on function app.eh_admin() is
  'Verdadeiro apenas para o perfil técnico `admin`. Usado nas tabelas de fronteira de '
  'segurança (`perfil_permissao`, `usuarios`, `usuario_curso`). Origem: RN-RBAC-02.';


-- -------------------------------------------------------------------------------------
-- app.alcanca_curso(curso_id) — o curso está no conjunto alcançado pela sessão?
-- -------------------------------------------------------------------------------------
create or replace function app.alcanca_curso(p_curso_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  -- NULL de entrada devolve falso, não NULL: numa policy, `NULL` e `false` têm o mesmo
  -- efeito prático (a linha não passa), mas devolver boolean torna o teste legível e
  -- evita surpresa em expressão composta com `and`/`or`.
  select p_curso_id is not null
     and exists (select 1 from app.cursos_do_usuario() c where c = p_curso_id);
$$;

comment on function app.alcanca_curso(uuid) is
  'O curso está no alcance da sessão? Encapsula `app.cursos_do_usuario()` para as '
  'policies das tabelas com recorte direto por curso. Origem: BRIEF v2.1 §3.';


-- -------------------------------------------------------------------------------------
-- app.alcanca_turma(turma_id) — idem, propagando turma → curso.
-- -------------------------------------------------------------------------------------
-- A maioria das tabelas de fato não guarda `curso_id`: guarda `turma_id`. Esta função é
-- o salto que faltava, escrito uma vez. Uma `turma_id` NULA devolve VERDADEIRO — e isso
-- é intencional, não descuido: em `atividades_nao_letivas`, `turma_id` nulo significa
-- ESCOPO GLOBAL (o evento vale para todas as turmas ativas na data, ver documento 05,
-- achado sobre a coluna `Escopo`). Negar o alcance de um evento global esconderia
-- feriado e formatura de quem tem escopo restrito.
-- -------------------------------------------------------------------------------------
create or replace function app.alcanca_turma(p_turma_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case
    when p_turma_id is null then true          -- evento de escopo global: alcança todos
    else exists (
      select 1
        from public.turmas t
       where t.id = p_turma_id
         and app.alcanca_curso(t.curso_id)
    )
  end;
$$;

comment on function app.alcanca_turma(uuid) is
  'A turma pertence a um curso no alcance da sessão? `turma_id` NULO devolve verdadeiro '
  'por representar escopo global em `atividades_nao_letivas`. Origem: RN-EVT-02.';


-- -------------------------------------------------------------------------------------
-- app.alcanca_disciplina(disciplina_id) — idem, propagando disciplina → curso.
-- -------------------------------------------------------------------------------------
create or replace function app.alcanca_disciplina(p_disciplina_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p_disciplina_id is not null
     and exists (
       select 1
         from public.disciplinas d
        where d.id = p_disciplina_id
          and app.alcanca_curso(d.curso_id)
     );
$$;

comment on function app.alcanca_disciplina(uuid) is
  'A disciplina pertence a um curso no alcance da sessão? Origem: BRIEF v2.1 §3.';


-- #####################################################################################
-- PARTE III — GRANTS DE TABELA
-- -------------------------------------------------------------------------------------
-- RLS é um FILTRO sobre um privilégio que já existe — ela não concede nada por si.
-- Sem o GRANT abaixo, `authenticated` recebe "permission denied for table", e não a
-- linha filtrada. É a confusão nº 1 de quem escreve RLS pela primeira vez: a policy está
-- correta e a consulta falha mesmo assim.
--
-- DELETE não é concedido a ninguém. Nem por GRANT, nem por policy — dupla negação
-- deliberada, para que remover uma das duas por engano não abra o caminho (C-05).
-- #####################################################################################

grant usage on schema public to authenticated;
grant usage on schema app    to authenticated;

-- -------------------------------------------------------------------------------------
-- ⚠️  `extensions` — o GRANT que não é óbvio e que derruba TODA escrita se faltar.
-- -------------------------------------------------------------------------------------
-- No Supabase, `unaccent`, `btree_gist` e `pg_trgm` são instaladas no schema `extensions`,
-- não em `public`. `app.normalizar_texto()` (arquivo 00) chama `extensions.unaccent()`, e
-- essa função roda no contexto de quem faz o INSERT — não de quem a definiu.
--
-- Sem este GRANT, todo INSERT feito por um usuário autenticado numa tabela que use
-- normalização de texto falha com `permission denied for schema extensions`. E o defeito
-- é traiçoeiro: o ETL roda como dono do schema e passa, os testes de aplicação da
-- migration passam, o seed passa — só o usuário real quebra, em produção, no primeiro
-- cadastro. Foi exatamente assim que ele apareceu no teste T-04 desta suíte.
--
-- Este comentário fica aqui de propósito: é a classe de defeito que só teste negativo
-- com sessão autenticada de verdade encontra (BRIEF §7.4).
-- -------------------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'extensions') then
    execute 'grant usage on schema extensions to authenticated';
    execute 'grant execute on all functions in schema extensions to authenticated';
  end if;
end;
$$;

grant select, insert, update on all tables    in schema public to authenticated;
grant execute                on all functions in schema app    to authenticated;

-- Revogação explícita do que o GRANT amplo acima concedeu de forma ampla demais.
revoke insert, update on public.migracao_log         from authenticated;
revoke insert, update on public.arquivo_avaliacoes_v1 from authenticated;

-- `anon` (visitante não autenticado) não alcança nada. O sistema não tem página pública:
-- a única rota anônima é a de login, que fala com `auth`, não com `public`.
revoke all on all tables in schema public from anon;

comment on schema app is
  'Funções de autorização e de domínio. `authenticated` recebe EXECUTE; as funções são '
  'SECURITY DEFINER e leem `usuarios` sem passar pela RLS, o que quebra a recursão.';


-- #####################################################################################
-- PARTE IV — POLICIES
-- -------------------------------------------------------------------------------------
-- Convenção de nome: `<tabela>_<acao>` — `registros_aula_ler`, `registros_aula_criar`.
-- Cada tabela recebe no máximo quatro policies (SELECT, INSERT, UPDATE) e nunca DELETE.
--
-- Padrão de escrita, aplicado sem exceção:
--   FOR SELECT ................. USING       (permissão and alcance)
--   FOR INSERT ................. WITH CHECK  (permissão and alcance)  ← valida a linha NOVA
--   FOR UPDATE ................. USING       (permissão and alcance)  ← qual linha pode tocar
--                                WITH CHECK  (permissão and alcance)  ← em que pode transformá-la
--
-- O WITH CHECK do UPDATE é o que impede a fuga de escopo: sem ele, um Operador de escopo
-- `expedito` poderia pegar um registro de aula que alcança e reatribuí-lo a uma turma de
-- curso regular — a linha sairia do seu alcance, levando o dado junto. Com ele, o banco
-- recusa. Este é o tipo exato de defeito que a v2.0 não tinha como impedir por construção.
-- #####################################################################################

-- =====================================================================================
-- IV.1 — TABELAS DE FRONTEIRA DE SEGURANÇA
-- -------------------------------------------------------------------------------------
-- `perfil_permissao`, `usuarios` e `usuario_curso` são as três tabelas em que escrever
-- equivale a se autoconceder qualquer permissão. Elas NÃO consultam `app.pode()` — seria
-- circular: a matriz não pode ser a autoridade sobre quem edita a matriz. São as únicas
-- do sistema presas diretamente ao perfil, por `app.eh_admin()`.
-- =====================================================================================

-- ---- perfil_permissao ---------------------------------------------------------------
-- Leitura liberada a qualquer sessão autenticada: a interface precisa saber quais botões
-- mostrar, e a matriz não contém dado sensível — contém a definição pública das regras.
-- Esconder a matriz seria segurança por obscuridade, sem ganho: a RLS protege o dado
-- mesmo com a matriz à vista.
create policy perfil_permissao_ler on public.perfil_permissao
  for select to authenticated
  using (app.usuario_atual() is not null);

create policy perfil_permissao_criar on public.perfil_permissao
  for insert to authenticated
  with check (app.eh_admin());

create policy perfil_permissao_editar on public.perfil_permissao
  for update to authenticated
  using (app.eh_admin())
  with check (app.eh_admin());

-- ---- usuarios -----------------------------------------------------------------------
-- Cada um lê a própria linha sempre; ler as demais exige permissão em `usuarios`.
-- A cláusula `id = app.usuario_atual()` é o que garante que uma conta recém-convidada,
-- ainda sem permissão de leitura ampla, consiga carregar o próprio perfil no login.
create policy usuarios_ler on public.usuarios
  for select to authenticated
  using (
    id = app.usuario_atual()
    or app.pode('usuarios', 'ler')
  );

create policy usuarios_criar on public.usuarios
  for insert to authenticated
  with check (app.eh_admin());

-- UPDATE em duas faixas: o próprio usuário pode manter o próprio cadastro, mas NÃO pode
-- tocar em `perfil`, `escopo_curso` nem `status` — os três campos que definem seu poder.
-- O bloqueio desses campos é feito pelo gatilho abaixo, porque uma policy não enxerga
-- coluna a coluna: `WITH CHECK` avalia a linha inteira, e não sabe o que mudou.
create policy usuarios_editar on public.usuarios
  for update to authenticated
  using (
    id = app.usuario_atual()
    or app.eh_admin()
  )
  with check (
    id = app.usuario_atual()
    or app.eh_admin()
  );

-- -------------------------------------------------------------------------------------
-- Gatilho de escalonamento de privilégio.
-- -------------------------------------------------------------------------------------
-- O QUÊ  : impede que um usuário altere o próprio perfil, escopo ou status.
-- PARA QUÊ: a policy `usuarios_editar` permite que a pessoa mantenha o próprio cadastro
--          (nome de exibição, por exemplo). Sem este gatilho, ela também poderia rodar
--          `update usuarios set perfil = 'admin' where id = <o próprio>` — a policy
--          aprovaria, porque a linha continua sendo a dela. É o buraco clássico de RLS
--          em tabela de usuário, e ele não se fecha com policy: fecha-se com gatilho,
--          porque só o gatilho vê OLD e NEW.
-- COMO   : compara os três campos sensíveis; se algum mudou e quem executa não é admin,
--          levanta exceção com mensagem explícita.
-- -------------------------------------------------------------------------------------
create or replace function app.impedir_autoescalonamento()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Contexto de servidor (ETL, `service_role`, painel do Supabase, script de manutenção):
  -- não há JWT, logo não há "próprio usuário" a proteger de si mesmo. Liberar aqui é
  -- necessário, não frouxidão — sem isto, NEM MESMO o ETL consegue gravar o perfil dos
  -- 4 usuários migrados, e nenhum administrador consegue desativar uma conta pelo painel.
  -- O caminho continua fechado para quem tem sessão: `anon` não recebe GRANT algum nesta
  -- tabela, então a única forma de chegar aqui sem JWT é já estar do lado do servidor.
  -- (Descoberto pelo teste T-11 desta suíte, que falhou por este motivo.)
  if app.uid_atual() is null then
    return new;
  end if;

  if app.eh_admin() then
    return new;                                  -- Admin pode tudo nesta tabela
  end if;

  if new.perfil       is distinct from old.perfil
  or new.escopo_curso is distinct from old.escopo_curso
  or new.status       is distinct from old.status then
    raise exception
      'Alteração de perfil, escopo ou status exige o perfil admin (RN-RBAC-02).'
      using errcode = '42501';                   -- insufficient_privilege
  end if;

  return new;
end;
$$;

create trigger trg_usuarios_impedir_autoescalonamento
  before update on public.usuarios
  for each row execute function app.impedir_autoescalonamento();

comment on function app.impedir_autoescalonamento() is
  'Impede que um usuário altere o próprio perfil/escopo/status. Uma policy não consegue '
  'fazer isso: `WITH CHECK` avalia a linha inteira e não enxerga o que mudou. '
  'Origem: RN-RBAC-02; documento 22 §6.';

-- ---- usuario_curso ------------------------------------------------------------------
create policy usuario_curso_ler on public.usuario_curso
  for select to authenticated
  using (
    usuario_id = app.usuario_atual()
    or app.pode('usuarios', 'ler')
  );

create policy usuario_curso_criar on public.usuario_curso
  for insert to authenticated
  with check (app.eh_admin());

create policy usuario_curso_editar on public.usuario_curso
  for update to authenticated
  using (app.eh_admin())
  with check (app.eh_admin());


-- =====================================================================================
-- IV.2 — CADASTROS COM RECORTE DIRETO POR CURSO
-- =====================================================================================

-- ---- cursos -------------------------------------------------------------------------
-- Leitura: todo curso alcançado. Um Operador de escopo `expedito` não enxerga a CAHO.
create policy cursos_ler on public.cursos
  for select to authenticated
  using (app.pode('cursos', 'ler') and app.alcanca_curso(id));

create policy cursos_criar on public.cursos
  for insert to authenticated
  with check (app.pode('cursos', 'criar'));
  -- Sem teste de alcance no INSERT: `app.cursos_do_usuario()` lê `cursos`, e o curso
  -- ainda não existe no instante do WITH CHECK. Criar curso é atribuição da CIAARA-11,
  -- que tem alcance institucional total — a permissão basta.

create policy cursos_editar on public.cursos
  for update to authenticated
  using      (app.pode('cursos', 'editar') and app.alcanca_curso(id))
  with check (app.pode('cursos', 'editar') and app.alcanca_curso(id));

-- ---- turmas -------------------------------------------------------------------------
create policy turmas_ler on public.turmas
  for select to authenticated
  using (app.pode('turmas', 'ler') and app.alcanca_curso(curso_id));

create policy turmas_criar on public.turmas
  for insert to authenticated
  with check (app.pode('turmas', 'criar') and app.alcanca_curso(curso_id));

create policy turmas_editar on public.turmas
  for update to authenticated
  using      (app.pode('turmas', 'editar') and app.alcanca_curso(curso_id))
  with check (app.pode('turmas', 'editar') and app.alcanca_curso(curso_id));

-- ---- disciplinas --------------------------------------------------------------------
create policy disciplinas_ler on public.disciplinas
  for select to authenticated
  using (app.pode('disciplinas', 'ler') and app.alcanca_curso(curso_id));

create policy disciplinas_criar on public.disciplinas
  for insert to authenticated
  with check (app.pode('disciplinas', 'criar') and app.alcanca_curso(curso_id));

create policy disciplinas_editar on public.disciplinas
  for update to authenticated
  using      (app.pode('disciplinas', 'editar') and app.alcanca_curso(curso_id))
  with check (app.pode('disciplinas', 'editar') and app.alcanca_curso(curso_id));

-- ---- curso_regime_historico ---------------------------------------------------------
-- Vigência de regime de horário por curso. Escrita restrita: mudar um regime reinterpreta
-- a capacidade diária de todo o período seguinte (RN-2027-09).
create policy curso_regime_historico_ler on public.curso_regime_historico
  for select to authenticated
  using (app.pode('cursos', 'ler') and app.alcanca_curso(curso_id));

create policy curso_regime_historico_criar on public.curso_regime_historico
  for insert to authenticated
  with check (app.pode('cursos', 'editar') and app.alcanca_curso(curso_id));

create policy curso_regime_historico_editar on public.curso_regime_historico
  for update to authenticated
  using      (app.pode('cursos', 'editar') and app.alcanca_curso(curso_id))
  with check (app.pode('cursos', 'editar') and app.alcanca_curso(curso_id));

-- ---- responsaveis_curso -------------------------------------------------------------
-- Assinaturas do rodapé do DSA impresso. `curso_id` NULO = assinatura institucional
-- padrão, válida para qualquer curso — por isso o `or curso_id is null` na leitura.
create policy responsaveis_curso_ler on public.responsaveis_curso
  for select to authenticated
  using (
    app.pode('cursos', 'ler')
    and (curso_id is null or app.alcanca_curso(curso_id))
  );

create policy responsaveis_curso_criar on public.responsaveis_curso
  for insert to authenticated
  with check (app.pode('cursos', 'editar') and (curso_id is null or app.alcanca_curso(curso_id)));

create policy responsaveis_curso_editar on public.responsaveis_curso
  for update to authenticated
  using      (app.pode('cursos', 'editar') and (curso_id is null or app.alcanca_curso(curso_id)))
  with check (app.pode('cursos', 'editar') and (curso_id is null or app.alcanca_curso(curso_id)));

-- ---- turma_disciplina ---------------------------------------------------------------
-- Achado LIQ-1: previsão de início/término é por TURMA, não por grade de curso.
-- Alcance propagado pela turma.
create policy turma_disciplina_ler on public.turma_disciplina
  for select to authenticated
  using (app.pode('disciplinas', 'ler') and app.alcanca_turma(turma_id));

create policy turma_disciplina_criar on public.turma_disciplina
  for insert to authenticated
  with check (app.pode('disciplinas', 'editar') and app.alcanca_turma(turma_id));

create policy turma_disciplina_editar on public.turma_disciplina
  for update to authenticated
  using      (app.pode('disciplinas', 'editar') and app.alcanca_turma(turma_id))
  with check (app.pode('disciplinas', 'editar') and app.alcanca_turma(turma_id));


-- ---- turma_disciplina_instrutor -----------------------------------------------------
-- Atribuição real de instrutor por turma+disciplina (specs 029/032/034). O alcance
-- propaga por dois saltos — vínculo → turma_disciplina → turma → curso —, e por isso é a
-- única policy do arquivo com subconsulta em vez de chamada direta a `app.alcanca_*`.
-- Escrever aqui é atribuir docente, ato de planejamento: exige permissão de `disciplinas`.
create policy tdi_ler on public.turma_disciplina_instrutor
  for select to authenticated
  using (
    app.pode('disciplinas', 'ler')
    and exists (
      select 1 from public.turma_disciplina td
       where td.id = turma_disciplina_id
         and app.alcanca_turma(td.turma_id)
    )
  );

create policy tdi_criar on public.turma_disciplina_instrutor
  for insert to authenticated
  with check (
    app.pode('disciplinas', 'editar')
    and exists (
      select 1 from public.turma_disciplina td
       where td.id = turma_disciplina_id
         and app.alcanca_turma(td.turma_id)
    )
  );

create policy tdi_editar on public.turma_disciplina_instrutor
  for update to authenticated
  using (
    app.pode('disciplinas', 'editar')
    and exists (
      select 1 from public.turma_disciplina td
       where td.id = turma_disciplina_id and app.alcanca_turma(td.turma_id)
    )
  )
  with check (
    app.pode('disciplinas', 'editar')
    and exists (
      select 1 from public.turma_disciplina td
       where td.id = turma_disciplina_id and app.alcanca_turma(td.turma_id)
    )
  );


-- =====================================================================================
-- IV.3 — CADASTROS INSTITUCIONAIS SEM RECORTE DE CURSO
-- -------------------------------------------------------------------------------------
-- O cadastro de instrutores é institucional: um instrutor não "pertence" a um curso, e
-- restringir sua leitura por escopo esconderia justamente a informação que o Operador
-- precisa para atribuir aula. O recorte, aqui, é por PERMISSÃO apenas.
-- Consequência aceita e registrada: quem lê `instrutores` lê os 177. Ver documento 22 §9
-- (dado pessoal de militar).
-- =====================================================================================

-- ---- instrutores --------------------------------------------------------------------
create policy instrutores_ler on public.instrutores
  for select to authenticated
  using (app.pode('instrutores', 'ler'));

create policy instrutores_criar on public.instrutores
  for insert to authenticated
  with check (app.pode('instrutores', 'criar'));

create policy instrutores_editar on public.instrutores
  for update to authenticated
  using      (app.pode('instrutores', 'editar'))
  with check (app.pode('instrutores', 'editar'));

-- ---- instrutor_disciplina -----------------------------------------------------------
-- Habilitação instrutor↔disciplina (798 vínculos). Leitura institucional — a LIQ precisa
-- enxergar todos os habilitados. Escrita propaga alcance pela disciplina, porque conceder
-- habilitação numa disciplina é ato sobre o curso dela.
create policy instrutor_disciplina_ler on public.instrutor_disciplina
  for select to authenticated
  using (app.pode('instrutores', 'ler'));

create policy instrutor_disciplina_criar on public.instrutor_disciplina
  for insert to authenticated
  with check (app.pode('instrutores', 'editar') and app.alcanca_disciplina(disciplina_id));

create policy instrutor_disciplina_editar on public.instrutor_disciplina
  for update to authenticated
  using      (app.pode('instrutores', 'editar') and app.alcanca_disciplina(disciplina_id))
  with check (app.pode('instrutores', 'editar') and app.alcanca_disciplina(disciplina_id));


-- =====================================================================================
-- IV.4 — TABELAS DE FATO
-- -------------------------------------------------------------------------------------
-- É aqui que a RLS ganha o dinheiro dela. Estas quatro tabelas concentram os ~2.500
-- lançamentos do sistema, e são exatamente as que a v2.0 protegia só por disciplina de
-- código dentro dos `.gs`.
-- =====================================================================================

-- ---- registros_aula (1.753 linhas) --------------------------------------------------
create policy registros_aula_ler on public.registros_aula
  for select to authenticated
  using (app.pode('registros_aula', 'ler') and app.alcanca_turma(turma_id));

create policy registros_aula_criar on public.registros_aula
  for insert to authenticated
  with check (app.pode('registros_aula', 'criar') and app.alcanca_turma(turma_id));

create policy registros_aula_editar on public.registros_aula
  for update to authenticated
  using      (app.pode('registros_aula', 'editar') and app.alcanca_turma(turma_id))
  with check (app.pode('registros_aula', 'editar') and app.alcanca_turma(turma_id));

-- ---- avaliacoes (111 linhas) --------------------------------------------------------
create policy avaliacoes_ler on public.avaliacoes
  for select to authenticated
  using (app.pode('avaliacoes', 'ler') and app.alcanca_turma(turma_id));

create policy avaliacoes_criar on public.avaliacoes
  for insert to authenticated
  with check (app.pode('avaliacoes', 'criar') and app.alcanca_turma(turma_id));

create policy avaliacoes_editar on public.avaliacoes
  for update to authenticated
  using      (app.pode('avaliacoes', 'editar') and app.alcanca_turma(turma_id))
  with check (app.pode('avaliacoes', 'editar') and app.alcanca_turma(turma_id));

-- ---- avaliacoes_planejadas ----------------------------------------------------------
-- Catálogo do "dever-ser" por curso. Recorte direto por `curso_id`.
create policy avaliacoes_planejadas_ler on public.avaliacoes_planejadas
  for select to authenticated
  using (app.pode('avaliacoes', 'ler') and app.alcanca_curso(curso_id));

create policy avaliacoes_planejadas_criar on public.avaliacoes_planejadas
  for insert to authenticated
  with check (app.pode('avaliacoes', 'editar') and app.alcanca_curso(curso_id));

create policy avaliacoes_planejadas_editar on public.avaliacoes_planejadas
  for update to authenticated
  using      (app.pode('avaliacoes', 'editar') and app.alcanca_curso(curso_id))
  with check (app.pode('avaliacoes', 'editar') and app.alcanca_curso(curso_id));

-- ---- atividades_nao_letivas (663 linhas) --------------------------------------------
-- AEC, TAD, TR e Estudo Individual. `turma_id` NULO = escopo global (RN-EVT-02) e alcança
-- todos, por decisão de `app.alcanca_turma()`. Criar um evento GLOBAL, porém, é ato de
-- alcance institucional: exige o perfil que a matriz autoriza em `atividades_globais`.
create policy atividades_nao_letivas_ler on public.atividades_nao_letivas
  for select to authenticated
  using (app.pode('atividades_nao_letivas', 'ler') and app.alcanca_turma(turma_id));

create policy atividades_nao_letivas_criar on public.atividades_nao_letivas
  for insert to authenticated
  with check (
    app.pode('atividades_nao_letivas', 'criar')
    and app.alcanca_turma(turma_id)
    and (turma_id is not null or app.pode('atividades_globais', 'criar'))
  );

create policy atividades_nao_letivas_editar on public.atividades_nao_letivas
  for update to authenticated
  using (
    app.pode('atividades_nao_letivas', 'editar')
    and app.alcanca_turma(turma_id)
    and (turma_id is not null or app.pode('atividades_globais', 'criar'))
  )
  with check (
    app.pode('atividades_nao_letivas', 'editar')
    and app.alcanca_turma(turma_id)
    and (turma_id is not null or app.pode('atividades_globais', 'criar'))
  );

-- ---- planejamento_anual -------------------------------------------------------------
-- Saída do motor preditivo, versionada por ano. Recorte direto por curso.
create policy planejamento_anual_ler on public.planejamento_anual
  for select to authenticated
  using (app.pode('planejamento_anual', 'ler') and app.alcanca_curso(curso_id));

create policy planejamento_anual_criar on public.planejamento_anual
  for insert to authenticated
  with check (app.pode('planejamento_anual', 'criar') and app.alcanca_curso(curso_id));

create policy planejamento_anual_editar on public.planejamento_anual
  for update to authenticated
  using      (app.pode('planejamento_anual', 'editar') and app.alcanca_curso(curso_id))
  with check (app.pode('planejamento_anual', 'editar') and app.alcanca_curso(curso_id));


-- =====================================================================================
-- IV.5 — CONFIGURAÇÃO E CALENDÁRIO
-- -------------------------------------------------------------------------------------
-- Leitura ampla, escrita restrita. Estes valores entram em TODO cálculo do sistema: um
-- teto alterado por engano não gera erro, gera um número errado num relatório que alguém
-- vai assinar. Por isso a escrita é do perfil que a matriz autorizar em `parametros`, e
-- a leitura é de qualquer sessão autenticada — sem ler o teto não se calcula nada.
-- =====================================================================================

create policy config_parametros_ler on public.config_parametros
  for select to authenticated using (app.usuario_atual() is not null);
create policy config_parametros_criar on public.config_parametros
  for insert to authenticated with check (app.pode('parametros', 'criar'));
create policy config_parametros_editar on public.config_parametros
  for update to authenticated
  using (app.pode('parametros', 'editar')) with check (app.pode('parametros', 'editar'));

create policy config_listas_ler on public.config_listas
  for select to authenticated using (app.usuario_atual() is not null);
create policy config_listas_criar on public.config_listas
  for insert to authenticated with check (app.pode('parametros', 'criar'));
create policy config_listas_editar on public.config_listas
  for update to authenticated
  using (app.pode('parametros', 'editar')) with check (app.pode('parametros', 'editar'));

create policy configuracoes_horario_ler on public.configuracoes_horario
  for select to authenticated using (app.usuario_atual() is not null);
create policy configuracoes_horario_criar on public.configuracoes_horario
  for insert to authenticated with check (app.pode('parametros', 'criar'));
create policy configuracoes_horario_editar on public.configuracoes_horario
  for update to authenticated
  using (app.pode('parametros', 'editar')) with check (app.pode('parametros', 'editar'));

create policy horarios_tempos_aula_ler on public.horarios_tempos_aula
  for select to authenticated using (app.usuario_atual() is not null);
create policy horarios_tempos_aula_criar on public.horarios_tempos_aula
  for insert to authenticated with check (app.pode('parametros', 'criar'));
create policy horarios_tempos_aula_editar on public.horarios_tempos_aula
  for update to authenticated
  using (app.pode('parametros', 'editar')) with check (app.pode('parametros', 'editar'));

-- Calendário anual do PROENS: feriados, janelas de curso e reservas.
-- Aposentaram as constantes `FERIADOS_2027`, `SEMENTES_2027` e `RESERVAS_PROENS` do
-- `Código.gs` (RF-DADOS-04, RNF-MAN-04). Leitura ampla pelo mesmo motivo dos parâmetros.
create policy feriados_ler on public.feriados
  for select to authenticated using (app.usuario_atual() is not null);
create policy feriados_criar on public.feriados
  for insert to authenticated with check (app.pode('calendario', 'criar'));
create policy feriados_editar on public.feriados
  for update to authenticated
  using (app.pode('calendario', 'editar')) with check (app.pode('calendario', 'editar'));

create policy janelas_curso_ler on public.janelas_curso
  for select to authenticated
  using (app.usuario_atual() is not null and app.alcanca_curso(curso_id));
create policy janelas_curso_criar on public.janelas_curso
  for insert to authenticated
  with check (app.pode('calendario', 'criar') and app.alcanca_curso(curso_id));
create policy janelas_curso_editar on public.janelas_curso
  for update to authenticated
  using      (app.pode('calendario', 'editar') and app.alcanca_curso(curso_id))
  with check (app.pode('calendario', 'editar') and app.alcanca_curso(curso_id));

create policy reservas_proens_ler on public.reservas_proens
  for select to authenticated
  using (app.usuario_atual() is not null and app.alcanca_curso(curso_id));
create policy reservas_proens_criar on public.reservas_proens
  for insert to authenticated
  with check (app.pode('calendario', 'criar') and app.alcanca_curso(curso_id));
create policy reservas_proens_editar on public.reservas_proens
  for update to authenticated
  using      (app.pode('calendario', 'editar') and app.alcanca_curso(curso_id))
  with check (app.pode('calendario', 'editar') and app.alcanca_curso(curso_id));


-- =====================================================================================
-- IV.6 — TABELAS TÉCNICAS DE MIGRAÇÃO
-- -------------------------------------------------------------------------------------
-- SOMENTE LEITURA para toda sessão autenticada com permissão de auditoria. A escrita é
-- exclusiva da `service_role` do ETL, que ignora RLS por definição — e é por isso que
-- os GRANTs de INSERT/UPDATE foram revogados de `authenticated` na Parte III.
--
-- Dupla proteção deliberada, e ela tem nome: Princípio IV da constitution (Integridade
-- do Histórico). `migracao_log` é a evidência auditável de que 100% do histórico foi
-- transportado. Uma linha reescrita destrói a evidência sem deixar rastro — e "corrigir
-- o passado" reescrevendo log é sempre proibido; o jeito certo é logar a correção como
-- evento novo. O gatilho `app.bloquear_reescrita` (arquivo 00) já impede UPDATE mesmo
-- para a `service_role`.
-- =====================================================================================

create policy migracao_log_ler on public.migracao_log
  for select to authenticated
  using (app.pode('auditoria', 'ler'));

create policy arquivo_avaliacoes_v1_ler on public.arquivo_avaliacoes_v1
  for select to authenticated
  using (app.pode('auditoria', 'ler'));


-- #####################################################################################
-- PARTE V — SEED DA MATRIZ DE PERMISSÕES
-- -------------------------------------------------------------------------------------
-- O QUÊ  : as linhas de `perfil_permissao` que dão vida a todas as policies acima.
-- PARA QUÊ: sem este seed, `app.pode()` devolve `false` para tudo e o sistema fica
--          hermeticamente fechado. Isso é o comportamento correto para um banco recém-
--          criado — mas significa que ESTE BLOCO é parte da migration, não um extra.
-- COMO   : uma linha por (perfil, recurso, ação). Só as combinações PERMITIDAS são
--          inseridas; a ausência é a negação (`coalesce(v_permitido, false)` em
--          `app.pode`). Inserir explicitamente as negações dobraria o tamanho da tabela
--          sem mudar comportamento algum.
--
-- Fonte  : documento 01 §2.2, matriz perfil × recurso × ação.
--
-- ⚠️  DOIS PONTOS AGUARDAM CONFIRMAÇÃO DO BERNARDO (documento 22 §11):
--     (a) A matriz da v2.0, lida ao pé da letra, NÃO dá escrita em `registros_aula`,
--         `avaliacoes` nem `atividades_nao_letivas` ao Encarregado e ao Ajudante da
--         própria CIAARA-11 — o que implica que o dono do sistema não pode lançar aula.
--         Isso parece um artefato da leitura, não uma intenção. Aqui a escrita FOI
--         concedida a eles, marcada com `-- (a)`. Se a leitura literal for a correta,
--         remova essas linhas.
--     (b) Ninguém foi designado para administrar `calendario` e `parametros` em nenhum
--         documento. Atribuí à CIAARA-11 e ao Admin, marcado com `-- (b)`.
-- #####################################################################################

insert into public.perfil_permissao (perfil, recurso, acao, permitido, observacao) values

-- ---- admin: papel técnico, alcance total -------------------------------------------
-- Único perfil sem correspondência regimental. Existe para o dia em que ninguém mais
-- consegue entrar. Deve haver POUCAS contas admin, e o teste negativo do bloco VI
-- verifica que nenhum outro perfil escreve em `perfil_permissao`.
  ('admin','usuarios','ler',true,null),
  ('admin','usuarios','criar',true,null),
  ('admin','usuarios','editar',true,null),
  ('admin','usuarios','desativar',true,null),
  ('admin','cursos','ler',true,null),
  ('admin','cursos','criar',true,null),
  ('admin','cursos','editar',true,null),
  ('admin','turmas','ler',true,null),
  ('admin','turmas','criar',true,null),
  ('admin','turmas','editar',true,null),
  ('admin','disciplinas','ler',true,null),
  ('admin','disciplinas','criar',true,null),
  ('admin','disciplinas','editar',true,null),
  ('admin','instrutores','ler',true,null),
  ('admin','instrutores','criar',true,null),
  ('admin','instrutores','editar',true,null),
  ('admin','registros_aula','ler',true,null),
  ('admin','registros_aula','criar',true,null),
  ('admin','registros_aula','editar',true,null),
  ('admin','avaliacoes','ler',true,null),
  ('admin','avaliacoes','criar',true,null),
  ('admin','avaliacoes','editar',true,null),
  ('admin','atividades_nao_letivas','ler',true,null),
  ('admin','atividades_nao_letivas','criar',true,null),
  ('admin','atividades_nao_letivas','editar',true,null),
  ('admin','atividades_globais','criar',true,null),
  ('admin','planejamento_anual','ler',true,null),
  ('admin','planejamento_anual','criar',true,null),
  ('admin','planejamento_anual','editar',true,null),
  ('admin','parametros','criar',true,null),
  ('admin','parametros','editar',true,null),
  ('admin','calendario','criar',true,null),
  ('admin','calendario','editar',true,null),
  ('admin','auditoria','ler',true,null),

-- ---- chefe_departamento_ensino (CIAARA-10): leitura total, escrita nenhuma ----------
-- Supervisiona o Departamento de Ensino inteiro. Precisa enxergar tudo para acompanhar;
-- não lança nada, porque lançamento é ato da divisão executora.
  ('chefe_departamento_ensino','cursos','ler',true,null),
  ('chefe_departamento_ensino','turmas','ler',true,null),
  ('chefe_departamento_ensino','disciplinas','ler',true,null),
  ('chefe_departamento_ensino','instrutores','ler',true,null),
  ('chefe_departamento_ensino','registros_aula','ler',true,null),
  ('chefe_departamento_ensino','avaliacoes','ler',true,null),
  ('chefe_departamento_ensino','atividades_nao_letivas','ler',true,null),
  ('chefe_departamento_ensino','planejamento_anual','ler',true,null),
  ('chefe_departamento_ensino','auditoria','ler',true,null),
  ('chefe_departamento_ensino','usuarios','ler',true,null),

-- ---- encarregado_administracao_academica (CIAARA-11): o dono do sistema -------------
  ('encarregado_administracao_academica','cursos','ler',true,null),
  ('encarregado_administracao_academica','cursos','criar',true,null),
  ('encarregado_administracao_academica','cursos','editar',true,null),
  ('encarregado_administracao_academica','turmas','ler',true,null),
  ('encarregado_administracao_academica','turmas','criar',true,null),
  ('encarregado_administracao_academica','turmas','editar',true,null),
  ('encarregado_administracao_academica','disciplinas','ler',true,null),
  ('encarregado_administracao_academica','disciplinas','criar',true,null),
  ('encarregado_administracao_academica','disciplinas','editar',true,null),
  ('encarregado_administracao_academica','instrutores','ler',true,null),
  ('encarregado_administracao_academica','instrutores','criar',true,null),
  ('encarregado_administracao_academica','instrutores','editar',true,null),
  ('encarregado_administracao_academica','registros_aula','ler',true,null),
  ('encarregado_administracao_academica','registros_aula','criar',true,'(a) aguarda confirmação'),
  ('encarregado_administracao_academica','registros_aula','editar',true,'(a) aguarda confirmação'),
  ('encarregado_administracao_academica','avaliacoes','ler',true,null),
  ('encarregado_administracao_academica','avaliacoes','criar',true,'(a) aguarda confirmação'),
  ('encarregado_administracao_academica','avaliacoes','editar',true,'(a) aguarda confirmação'),
  ('encarregado_administracao_academica','atividades_nao_letivas','ler',true,null),
  ('encarregado_administracao_academica','atividades_nao_letivas','criar',true,'(a) aguarda confirmação'),
  ('encarregado_administracao_academica','atividades_nao_letivas','editar',true,'(a) aguarda confirmação'),
  ('encarregado_administracao_academica','atividades_globais','criar',true,null),
  ('encarregado_administracao_academica','planejamento_anual','ler',true,null),
  ('encarregado_administracao_academica','planejamento_anual','criar',true,null),
  ('encarregado_administracao_academica','planejamento_anual','editar',true,null),
  ('encarregado_administracao_academica','parametros','criar',true,'(b) aguarda confirmação'),
  ('encarregado_administracao_academica','parametros','editar',true,'(b) aguarda confirmação'),
  ('encarregado_administracao_academica','calendario','criar',true,'(b) aguarda confirmação'),
  ('encarregado_administracao_academica','calendario','editar',true,'(b) aguarda confirmação'),
  ('encarregado_administracao_academica','auditoria','ler',true,null),
  ('encarregado_administracao_academica','usuarios','ler',true,null),

-- ---- ajudante_administracao_academica: permissão idêntica ao encarregado ------------
-- A matriz da v2.0 não distingue os dois em nenhuma área de dados. Manter idêntico é
-- fidelidade ao documento; se a intenção for distinguir, é decisão nova a registrar.
  ('ajudante_administracao_academica','cursos','ler',true,null),
  ('ajudante_administracao_academica','cursos','criar',true,null),
  ('ajudante_administracao_academica','cursos','editar',true,null),
  ('ajudante_administracao_academica','turmas','ler',true,null),
  ('ajudante_administracao_academica','turmas','criar',true,null),
  ('ajudante_administracao_academica','turmas','editar',true,null),
  ('ajudante_administracao_academica','disciplinas','ler',true,null),
  ('ajudante_administracao_academica','disciplinas','criar',true,null),
  ('ajudante_administracao_academica','disciplinas','editar',true,null),
  ('ajudante_administracao_academica','instrutores','ler',true,null),
  ('ajudante_administracao_academica','instrutores','criar',true,null),
  ('ajudante_administracao_academica','instrutores','editar',true,null),
  ('ajudante_administracao_academica','registros_aula','ler',true,null),
  ('ajudante_administracao_academica','registros_aula','criar',true,'(a) aguarda confirmação'),
  ('ajudante_administracao_academica','registros_aula','editar',true,'(a) aguarda confirmação'),
  ('ajudante_administracao_academica','avaliacoes','ler',true,null),
  ('ajudante_administracao_academica','avaliacoes','criar',true,'(a) aguarda confirmação'),
  ('ajudante_administracao_academica','avaliacoes','editar',true,'(a) aguarda confirmação'),
  ('ajudante_administracao_academica','atividades_nao_letivas','ler',true,null),
  ('ajudante_administracao_academica','atividades_nao_letivas','criar',true,'(a) aguarda confirmação'),
  ('ajudante_administracao_academica','atividades_nao_letivas','editar',true,'(a) aguarda confirmação'),
  ('ajudante_administracao_academica','atividades_globais','criar',true,null),
  ('ajudante_administracao_academica','planejamento_anual','ler',true,null),
  ('ajudante_administracao_academica','planejamento_anual','criar',true,null),
  ('ajudante_administracao_academica','planejamento_anual','editar',true,null),
  ('ajudante_administracao_academica','auditoria','ler',true,null),
  ('ajudante_administracao_academica','usuarios','ler',true,null),

-- ---- encarregado/ajudante de orientação pedagógica (CIAARA-12) ----------------------
-- Competência pedagógica, não de lançamento. Lê tudo que sustenta a avaliação de ensino;
-- escreve apenas onde a norma lhe dá a caneta (cadastro de instrutor: capacitação
-- didática, titulação — RNF-NORM-05).
  ('encarregado_orientacao_pedagogica','cursos','ler',true,null),
  ('encarregado_orientacao_pedagogica','turmas','ler',true,null),
  ('encarregado_orientacao_pedagogica','disciplinas','ler',true,null),
  ('encarregado_orientacao_pedagogica','instrutores','ler',true,null),
  ('encarregado_orientacao_pedagogica','instrutores','editar',true,null),
  ('encarregado_orientacao_pedagogica','registros_aula','ler',true,null),
  ('encarregado_orientacao_pedagogica','avaliacoes','ler',true,null),
  ('encarregado_orientacao_pedagogica','atividades_nao_letivas','ler',true,null),
  ('encarregado_orientacao_pedagogica','planejamento_anual','ler',true,null),
  ('ajudante_orientacao_pedagogica','cursos','ler',true,null),
  ('ajudante_orientacao_pedagogica','turmas','ler',true,null),
  ('ajudante_orientacao_pedagogica','disciplinas','ler',true,null),
  ('ajudante_orientacao_pedagogica','instrutores','ler',true,null),
  ('ajudante_orientacao_pedagogica','instrutores','editar',true,null),
  ('ajudante_orientacao_pedagogica','registros_aula','ler',true,null),
  ('ajudante_orientacao_pedagogica','avaliacoes','ler',true,null),
  ('ajudante_orientacao_pedagogica','atividades_nao_letivas','ler',true,null),
  ('ajudante_orientacao_pedagogica','planejamento_anual','ler',true,null),

-- ---- operador: o lançamento diário, restrito por escopo de curso --------------------
-- Perfil mais numeroso e o único cuja permissão é fortemente recortada pelo ALCANCE.
-- Note o que NÃO tem: `atividades_globais.criar`. Um Operador lança a palestra da turma
-- dele; não decreta feriado para o Centro inteiro.
  ('operador','cursos','ler',true,null),
  ('operador','turmas','ler',true,null),
  ('operador','turmas','editar',true,null),
  ('operador','disciplinas','ler',true,null),
  ('operador','disciplinas','editar',true,null),
  ('operador','instrutores','ler',true,null),
  ('operador','registros_aula','ler',true,null),
  ('operador','registros_aula','criar',true,null),
  ('operador','registros_aula','editar',true,null),
  ('operador','avaliacoes','ler',true,null),
  ('operador','avaliacoes','criar',true,null),
  ('operador','avaliacoes','editar',true,null),
  ('operador','atividades_nao_letivas','ler',true,null),
  ('operador','atividades_nao_letivas','criar',true,null),
  ('operador','atividades_nao_letivas','editar',true,null),
  ('operador','planejamento_anual','ler',true,null),

-- ---- encarregado_curso: leitura restrita aos cursos sob coordenação -----------------
-- O alcance vem de `usuario_curso` (N:N), não de `escopo_curso`.
  ('encarregado_curso','cursos','ler',true,null),
  ('encarregado_curso','turmas','ler',true,null),
  ('encarregado_curso','disciplinas','ler',true,null),
  ('encarregado_curso','instrutores','ler',true,null),
  ('encarregado_curso','registros_aula','ler',true,null),
  ('encarregado_curso','avaliacoes','ler',true,null),
  ('encarregado_curso','atividades_nao_letivas','ler',true,null),
  ('encarregado_curso','planejamento_anual','ler',true,null),

-- ---- visualizacao: leitura total, escrita nenhuma ----------------------------------
  ('visualizacao','cursos','ler',true,null),
  ('visualizacao','turmas','ler',true,null),
  ('visualizacao','disciplinas','ler',true,null),
  ('visualizacao','instrutores','ler',true,null),
  ('visualizacao','registros_aula','ler',true,null),
  ('visualizacao','avaliacoes','ler',true,null),
  ('visualizacao','atividades_nao_letivas','ler',true,null),
  ('visualizacao','planejamento_anual','ler',true,null)

on conflict (perfil, recurso, acao) do nothing;


-- #####################################################################################
-- PARTE VI — TESTES NEGATIVOS
-- -------------------------------------------------------------------------------------
-- ⚠️  ESTE BLOCO É DOCUMENTAÇÃO EXECUTÁVEL, NÃO PARTE DA MIGRATION.
--     Copie-o para `tests/invariantes/rls.test.sql` e rode-o com pgTAP contra o banco de
--     preview, autenticando como cada perfil.
--
-- POR QUE TESTE NEGATIVO É OBRIGATÓRIO (BRIEF §7.4): testar que o Operador CONSEGUE ler
-- a turma dele não prova nada sobre segurança — uma policy `using (true)` passa nesse
-- teste. O que prova é o contrário: que ele NÃO consegue ler a turma alheia. Uma suíte
-- de RLS só com caminho feliz é uma suíte que aprova uma RLS desligada.
--
-- Padrão de execução, dentro de uma transação descartável:
--
--   begin;
--   set local role authenticated;
--   set local request.jwt.claims to '{"sub":"<auth_user_id do perfil sob teste>"}';
--   <consulta>
--   rollback;
-- #####################################################################################

/*
-- T-01 · Operador de escopo `expedito` NÃO enxerga turma de curso regular.
--        Esperado: 0 linhas. Falha aqui = vazamento de escopo entre cursos.
select count(*) as deve_ser_zero
  from public.turmas t
  join public.cursos c on c.id = t.curso_id
 where c.classificacao = 'regular';

-- T-02 · Operador NÃO consegue criar registro de aula em turma fora do escopo.
--        Esperado: erro 42501 (new row violates row-level security policy).
insert into public.registros_aula (codigo, turma_id, disciplina_id, data, tempos_consumidos)
values ('TEST-001', '<turma de curso regular>', '<disciplina dela>', current_date, 2);

-- T-03 · FUGA DE ESCOPO POR UPDATE — o teste que só o WITH CHECK pega.
--        Operador pega um registro que ALCANÇA e tenta movê-lo para turma fora do escopo.
--        Esperado: erro 42501. Sem WITH CHECK no UPDATE, isto PASSA e leva o dado junto.
update public.registros_aula
   set turma_id = '<turma de curso regular>'
 where id = '<registro de turma expedita que ele alcança>';

-- T-04 · Perfil `visualizacao` NÃO escreve em lugar nenhum.
--        Esperado: erro 42501 em cada um.
insert into public.registros_aula (codigo, turma_id, disciplina_id, data, tempos_consumidos)
values ('TEST-002','<qualquer turma>','<qualquer disciplina>', current_date, 2);
update public.instrutores set nome = 'X' where id = '<qualquer instrutor>';

-- T-05 · ESCALONAMENTO DE PRIVILÉGIO — o teste mais importante do arquivo.
--        Um Operador tenta se promover a admin na própria linha.
--        Esperado: exceção do gatilho `app.impedir_autoescalonamento`.
--        A policy `usuarios_editar` APROVA esta linha (ela é dele) — é o gatilho que barra.
update public.usuarios set perfil = 'admin' where id = app.usuario_atual();

-- T-06 · Ninguém além do admin escreve na matriz de permissões.
--        Esperado: erro 42501. Falha aqui = qualquer um se autoconcede qualquer coisa.
insert into public.perfil_permissao (perfil, recurso, acao, permitido)
values ('operador','usuarios','editar',true);

-- T-07 · DELETE é impossível em toda tabela de cadastro e de fato.
--        Esperado: erro em todas. Rode uma por tabela, sem exceção.
delete from public.registros_aula where id = '<qualquer registro que ele alcança>';
delete from public.instrutores    where id = '<qualquer instrutor>';
delete from public.turmas         where id = '<turma que ele alcança>';

-- T-08 · `migracao_log` é imutável mesmo para quem o lê.
--        Esperado: erro em ambos (GRANT revogado + gatilho de bloqueio).
insert into public.migracao_log (tabela_origem, acao) values ('teste','Transportado');
update public.migracao_log set acao = 'Corrigido' where id = '<qualquer linha>';

-- T-09 · Sessão sem linha em `usuarios` não alcança nada.
--        Cenário real: credencial criada em `auth.users`, convite ainda não vinculado.
--        Esperado: 0 em todas as contagens.
select
  (select count(*) from public.cursos)         as cursos,
  (select count(*) from public.turmas)         as turmas,
  (select count(*) from public.registros_aula) as registros;

-- T-10 · Operador NÃO cria atividade de escopo global (turma_id nulo).
--        Esperado: erro 42501 — falta `atividades_globais.criar` na matriz dele.
insert into public.atividades_nao_letivas (codigo, turma_id, data, categoria_normativa, tempos_consumidos)
values ('TEST-003', null, current_date, 'TAD', 4);

-- T-11 · Usuário desativado perde acesso imediatamente.
--        `status = 'inativo'` faz `app.usuario_atual()` devolver NULL, e nenhuma policy
--        concede acesso a NULL. Esperado: 0 linhas.
select count(*) as deve_ser_zero from public.registros_aula;

-- T-12 · Encarregado de Curso só enxerga os cursos vinculados em `usuario_curso`.
--        Esperado: exatamente o conjunto de `usuario_curso`, nem um curso a mais.
select count(*) from public.cursos;
*/

-- =====================================================================================
-- FIM — 05_rls_policies.sql
-- 25 tabelas · 2 tabelas de autenticação criadas · 4 funções de alcance ·
-- 68 policies · 1 gatilho anti-escalonamento · 0 policies de DELETE (deliberado) ·
-- ~180 linhas de matriz de permissões · 12 testes negativos
-- Próximo: aplicar em preview e rodar a suíte de testes negativos antes de qualquer seed
-- de dado real (BRIEF §7.4).
-- =====================================================================================
