-- =================================================================================
-- O recorte de ESCRITA do dado pessoal de instrutor
--
-- O QUE  : tira de `authenticated` o privilegio de gravar as 12 colunas de identificacao civil e
--          residencia — por UPDATE e por INSERT —, devolve a escrita das 33 funcionais, e cria a
--          funcao com porteiro pela qual os tres perfis autorizados gravam a PII.
--
-- PARA QUE: a migration `20260908120000` fez a metade da LEITURA e deixou a da escrita aberta.
--          Medido em 10/09/2026: `authenticated` tinha SELECT em 33 colunas de `instrutores` e
--          UPDATE e INSERT em 45. **O mesmo perfil que nao le o CPF conseguia grava-lo.**
--          Contar gente, e nao coluna: o encarregado e o ajudante de Orientacao Pedagogica tem
--          `editar` em instrutores e NAO leem a PII — gravavam CPF e endereco que a tela nunca lhes
--          mostra. Edicao as cegas de CPF e como um dado se apaga sem ninguem notar.
--
-- A REGRA, NUMA FRASE: **quem nao ve, nao escreve** (FR-032, decisao de Bernardo, 10/09/2026).
--
-- Contrato: specs/006-cadastro-de-instrutores/contracts/recorte-de-escrita.md
--
-- =================================================================================
-- ⚠️ POR QUE O INSERT ENTRA, se hoje nao e buraco
--
-- `criar` pertence aos mesmos tres perfis que leem a PII, entao a insercao esta contida — POR
-- COINCIDENCIA DA MATRIZ, NAO POR DESENHO. A matriz e dado administravel (Principio VII). No dia em
-- que alguem conceder `criar` a um quarto perfil, o buraco abriria sem migration, sem revisao e sem
-- erro. Duas travas independentes que por acaso coincidem nao sao uma trava.
--
-- ⚠️ POR QUE A ORDEM ABAIXO E OBRIGATORIA
--
-- `revoke update (colunas)` NAO TEM EFEITO enquanto houver privilegio de TABELA: privilegio de
-- tabela cobre toda coluna. E exatamente o defeito que a primeira tentativa do recorte de leitura
-- teve — a migration rodou, nao deu erro, e nao protegeu nada. Por isso o passo 1 revoga a TABELA,
-- e o passo 2 devolve coluna por coluna. Inverter os dois produz uma migration que roda sem erro e
-- nao protege nada.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 1. Tirar o privilegio de TABELA de escrita. Sem isto, o passo 2 e decorativo.
-- ---------------------------------------------------------------------------------
revoke update, insert on public.instrutores from authenticated;

-- ---------------------------------------------------------------------------------
-- 2. Devolver a escrita das MESMAS 33 colunas que a leitura alcanca.
--
-- ⚠️ A LISTA E A DO `grant select` DE `20260908120000`, sem tirar nem por. Colunas geradas
--    (`nome_normalizado`, `antiguidade_declarada_num`) continuam recusadas pelo proprio motor ao
--    serem escritas; ficam na lista para que o conjunto gravavel seja, literalmente, o legivel —
--    que e o que a asserção N-4 de `093_recorte_escrita_instrutor.sql` compara.
-- ---------------------------------------------------------------------------------
grant update (
  id,
  codigo,
  posto_graduacao,
  esp_hab_obs,
  nome_completo,
  categoria,
  om,
  nome_guerra,
  nome_normalizado,
  nip,
  data_nascimento,
  dep_divisao,
  data_assuncao_setor,
  email,
  regime_trabalho,
  nivel_escolaridade,
  formacao_principal_secundaria,
  capacitacao_didatica,
  data_inicio_docencia_mb,
  data_inicio_docencia_ciaara,
  ultima_avaliacao_desempenho,
  data_avaliacao_desempenho,
  preferencia,
  disciplinas_ministradas_legado_v1,
  antiguidade_declarada,
  antiguidade_declarada_num,
  status,
  origem_migracao_v1,
  criado_por,
  criado_em,
  editado_por,
  editado_em,
  area_conhecimento
), insert (
  id,
  codigo,
  posto_graduacao,
  esp_hab_obs,
  nome_completo,
  categoria,
  om,
  nome_guerra,
  nome_normalizado,
  nip,
  data_nascimento,
  dep_divisao,
  data_assuncao_setor,
  email,
  regime_trabalho,
  nivel_escolaridade,
  formacao_principal_secundaria,
  capacitacao_didatica,
  data_inicio_docencia_mb,
  data_inicio_docencia_ciaara,
  ultima_avaliacao_desempenho,
  data_avaliacao_desempenho,
  preferencia,
  disciplinas_ministradas_legado_v1,
  antiguidade_declarada,
  antiguidade_declarada_num,
  status,
  origem_migracao_v1,
  criado_por,
  criado_em,
  editado_por,
  editado_em,
  area_conhecimento
) on public.instrutores to authenticated;

-- ---------------------------------------------------------------------------------
-- 3. A funcao COM PORTEIRO — como os tres autorizados continuam gravando a PII.
--
-- ⚠️ NAO E A `service_role`. Ela e para convite, ETL e manutencao, nunca por requisicao de tela.
--
-- ⚠️ SECURITY DEFINER NAO E OPCIONAL: a funcao precisa dos direitos do dono justamente para
--    alcancar as colunas que o passo 1 revogou. O porteiro e o que a torna segura, e ele e o MESMO
--    da `vw_instrutor_dados_pessoais` — espelhar a leitura e o requisito, nao uma escolha.
--
-- ⚠️ AS DUAS CONDICOES SOMAM, NAO SUBSTITUEM. Quem nao pode editar instrutor nenhum nao passa a
--    poder por causa do perfil.
--
-- ⚠️ SO AS 12 COLUNAS. Chave fora delas e recusada com `22023`, antes de qualquer escrita: uma
--    funcao de dono que aceitasse coluna qualquer seria a porta dos fundos do recorte inteiro.
--
-- ⚠️ A CHAVE AUSENTE NAO MEXE NA COLUNA; a chave presente com `null` a limpa. A funcao nao
--    normaliza valor — mascara e limpeza sao da tela e da validacao, nao do banco.
--
-- ⚠️ A AUTORIA CONTINUA SENDO DA SESSAO. `app.set_auditoria()` le `auth.uid()` das
--    `request.jwt.claims`, que valem dentro de SECURITY DEFINER: `editado_por` sai com quem chamou.
-- ---------------------------------------------------------------------------------
create or replace function app.gravar_dados_pessoais_instrutor(
  p_instrutor_id uuid,
  p_dados jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_chave text;
  v_colunas constant text[] := array[
    'cpf', 'rg', 'orgao_emissor', 'telefone', 'retelma',
    'endereco_logradouro', 'endereco_numero', 'endereco_complemento',
    'endereco_bairro', 'endereco_cidade', 'endereco_estado', 'endereco_cep'
  ];
begin
  if not (
    app.pode('instrutores', 'editar')
    and app.perfil_atual() in (
      'admin',
      'encarregado_administracao_academica',
      'ajudante_administracao_academica'
    )
  ) then
    raise exception 'escrita de dado pessoal restrita aos tres perfis que o leem'
      using errcode = '42501';
  end if;

  if p_dados is null or jsonb_typeof(p_dados) <> 'object' then
    raise exception 'p_dados precisa ser um objeto com colunas de dado pessoal'
      using errcode = '22023';
  end if;

  for v_chave in select jsonb_object_keys(p_dados) loop
    if not (v_chave = any (v_colunas)) then
      raise exception 'coluna % fora do recorte de dado pessoal', v_chave
        using errcode = '22023';
    end if;
  end loop;

  update public.instrutores i set
    cpf                  = case when p_dados ? 'cpf'                  then p_dados->>'cpf'                  else i.cpf end,
    rg                   = case when p_dados ? 'rg'                   then p_dados->>'rg'                   else i.rg end,
    orgao_emissor        = case when p_dados ? 'orgao_emissor'        then p_dados->>'orgao_emissor'        else i.orgao_emissor end,
    telefone             = case when p_dados ? 'telefone'             then p_dados->>'telefone'             else i.telefone end,
    retelma              = case when p_dados ? 'retelma'              then p_dados->>'retelma'              else i.retelma end,
    endereco_logradouro  = case when p_dados ? 'endereco_logradouro'  then p_dados->>'endereco_logradouro'  else i.endereco_logradouro end,
    endereco_numero      = case when p_dados ? 'endereco_numero'      then p_dados->>'endereco_numero'      else i.endereco_numero end,
    endereco_complemento = case when p_dados ? 'endereco_complemento' then p_dados->>'endereco_complemento' else i.endereco_complemento end,
    endereco_bairro      = case when p_dados ? 'endereco_bairro'      then p_dados->>'endereco_bairro'      else i.endereco_bairro end,
    endereco_cidade      = case when p_dados ? 'endereco_cidade'      then p_dados->>'endereco_cidade'      else i.endereco_cidade end,
    endereco_estado      = case when p_dados ? 'endereco_estado'      then p_dados->>'endereco_estado'      else i.endereco_estado end,
    endereco_cep         = case when p_dados ? 'endereco_cep'         then p_dados->>'endereco_cep'         else i.endereco_cep end
  where i.id = p_instrutor_id;

  if not found then
    raise exception 'instrutor inexistente' using errcode = 'P0002';
  end if;
end;
$$;

comment on function app.gravar_dados_pessoais_instrutor(uuid, jsonb) is
  'Grava identificacao civil e residencia de um instrutor, para os TRES perfis que as leem '
  '(admin, encarregado e ajudante de Administracao Academica) — o mesmo porteiro da '
  'vw_instrutor_dados_pessoais. Aceita so as 12 colunas de PII; chave ausente nao mexe, '
  'chave com null limpa. Quem nao ve, nao escreve. Origem: FR-032, FR-033.';

revoke all on function app.gravar_dados_pessoais_instrutor(uuid, jsonb) from public;
revoke all on function app.gravar_dados_pessoais_instrutor(uuid, jsonb) from anon;
grant execute on function app.gravar_dados_pessoais_instrutor(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------------
-- 4. O invólucro exposto — o schema `app` nao e servido pela interface de dados.
--    Nao decide nada: o porteiro e a lista de colunas vivem na funcao de dentro.
-- ---------------------------------------------------------------------------------
create or replace function public.gravar_dados_pessoais_instrutor(
  p_instrutor_id uuid,
  p_dados jsonb
)
returns void
language sql
security invoker
set search_path = pg_catalog, public
as $$
  select app.gravar_dados_pessoais_instrutor(p_instrutor_id, p_dados);
$$;

comment on function public.gravar_dados_pessoais_instrutor(uuid, jsonb) is
  'Ponto de entrada exposto de app.gravar_dados_pessoais_instrutor. Existe porque a interface de '
  'dados nao expoe o schema app. Nao decide nada.';

-- ⚠️ `revoke ... from public` NAO tira de `anon` no Supabase — medido no PR #12 para funcao.
revoke all on function public.gravar_dados_pessoais_instrutor(uuid, jsonb) from public;
revoke all on function public.gravar_dados_pessoais_instrutor(uuid, jsonb) from anon;
grant execute on function public.gravar_dados_pessoais_instrutor(uuid, jsonb) to authenticated;

-- =================================================================================
-- PLANO DE REVERSAO
--
--   drop function if exists public.gravar_dados_pessoais_instrutor(uuid, jsonb);
--   drop function if exists app.gravar_dados_pessoais_instrutor(uuid, jsonb);
--   revoke update, insert on public.instrutores from authenticated;
--   grant  update, insert on public.instrutores to authenticated;
--
-- ⚠️ Reverter DEVOLVE A ESCRITA de CPF, RG, telefone e endereco de 177 militares a 2 perfis que
--    nao os leem. E operacao tecnica de quatro linhas e decisao de seguranca de outra ordem — a
--    mesma nota que a migration da leitura carrega.
-- =================================================================================
