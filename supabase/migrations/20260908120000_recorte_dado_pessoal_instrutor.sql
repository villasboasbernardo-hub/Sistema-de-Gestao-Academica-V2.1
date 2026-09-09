-- =================================================================================
-- O recorte do dado pessoal de instrutor
--
-- O QUE  : tira de `authenticated` o privilegio de ler as 12 colunas de identificacao civil
--          e residencia, devolve as 33 funcionais, e cria duas views — uma de leitura e uma
--          com porteiro.
--
-- PARA QUE: o Epico 2 acrescentou CPF, RG, telefone e endereco de 177 militares a
--          `instrutores`, sob autorizacao da CIAARA-14.2. A RLS do Epico 1 foi desenhada
--          quando a tabela so tinha dado funcional, e hoje **quem pode ler a tabela le tudo**.
--          A divida esta escrita no cabecalho da migration `20260908071000`, que criou as
--          colunas — e e paga aqui.
--
-- QUEM LE A PII, e so estes tres (decisao de Bernardo, 08/09/2026):
--          `admin` · `encarregado_administracao_academica` · `ajudante_administracao_academica`
--
--          ⚠️ `chefe_departamento_ensino` fica DE FORA, e e deliberado: ele enxerga todos os
--          cursos do sistema, o que faria dele o perfil de maior alcance sobre dado pessoal se
--          entrasse por inercia.
--
-- =================================================================================
-- ⚠️ POR QUE NAO E `ROW LEVEL SECURITY` — e por que a ordem abaixo e obrigatoria
--
-- RLS decide quais LINHAS uma sessao enxerga; ela nao sabe recortar coluna. E privilegio de
-- coluna nao distingue perfil: **todo usuario autenticado compartilha o papel `authenticated`**,
-- porque o perfil vive em `usuarios.perfil`, que e dado, nao papel. Nenhum dos dois resolve
-- sozinho — dai as tres pecas.
--
-- 🛑 A PRIMEIRA TENTATIVA DESTE RECORTE NAO PROTEGEU NADA, e o modo de falhar importa:
--    escrever apenas `revoke select (cpf, ...)` **nao tem efeito** enquanto houver `GRANT` de
--    TABELA, porque privilegio de tabela cobre todas as colunas. Medido com sessao autenticada
--    de verdade: depois do revoke das 12, o Operador leu o CPF normalmente e o `select *`
--    devolveu tudo. A tela funcionava perfeitamente. Ver research.md secao R-1.
--
--    E por isso que o passo 1 vem primeiro, e e ele que protege.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 1. Tirar o privilegio de TABELA. Sem isto, o passo 2 e decorativo.
-- ---------------------------------------------------------------------------------
revoke select on public.instrutores from authenticated;

-- ---------------------------------------------------------------------------------
-- 2. Devolver as 33 colunas funcionais — o recorte nao pode recortar demais (FR-029).
--
-- ⚠️ `area_conhecimento` ESTA nesta lista. Ela nasceu na mesma migration e no mesmo bloco de
--    colunas que o documento 31 nao conhecia, mas **nao e dado pessoal**: e area de atuacao
--    docente, e a grade precisa dela. Esta escrito no comentario da coluna desde que foi criada.
-- ---------------------------------------------------------------------------------
grant select (
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
-- 3. A visao de LEITURA — so o funcional, com a RLS da tabela base ainda valendo.
--
-- ⚠️ `security_invoker = true` NAO E OPCIONAL AQUI. Sem essa opcao a view roda com os direitos
--    do dono e **contorna a policy** de `instrutores` — trocaria um problema de coluna por um
--    problema de linha, que e pior porque ninguem procuraria por ele.
--
-- E esta view que devolve a ergonomia de `select *` as telas (ver o aviso no rodape).
-- ---------------------------------------------------------------------------------
create view public.vw_instrutores with (security_invoker = true) as
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
  i.area_conhecimento
from public.instrutores i;

grant select on public.vw_instrutores to authenticated;

comment on view public.vw_instrutores is
  'Instrutores SEM as 12 colunas de identificacao civil e residencia. E o caminho de leitura das '
  'telas: `select *` aqui e seguro, e a RLS da tabela base continua valendo por security_invoker. '
  'Quem precisa da PII usa vw_instrutor_dados_pessoais, e precisa de um dos tres perfis.';

-- ---------------------------------------------------------------------------------
-- 4. A visao COM PORTEIRO — a PII, para os tres perfis.
--
-- ⚠️ Esta NAO e `security_invoker`, e tambem nao e opcional: ela precisa dos direitos do dono
--    justamente para alcancar as colunas que o passo 1 revogou. O porteiro e o `where`.
--
-- ⚠️ O `app.pode('instrutores','ler')` continua na frente: quem nao pode ler instrutor nenhum
--    nao passa a poder por causa do perfil. As duas condicoes somam, nao substituem.
-- ---------------------------------------------------------------------------------
create view public.vw_instrutor_dados_pessoais as
select
  i.id,
  i.codigo,
  i.cpf,
  i.rg,
  i.orgao_emissor,
  i.telefone,
  i.retelma,
  i.endereco_logradouro,
  i.endereco_numero,
  i.endereco_complemento,
  i.endereco_bairro,
  i.endereco_cidade,
  i.endereco_estado,
  i.endereco_cep
from public.instrutores i
where app.pode('instrutores', 'ler')
  and app.perfil_atual() in (
    'admin',
    'encarregado_administracao_academica',
    'ajudante_administracao_academica'
  );

grant select on public.vw_instrutor_dados_pessoais to authenticated;

comment on view public.vw_instrutor_dados_pessoais is
  'Identificacao civil e residencia dos instrutores, para os TRES perfis autorizados em '
  '08/09/2026 (admin, encarregado e ajudante de Administracao Academica). Os outros seis perfis '
  'recebem ZERO LINHAS — vazio, nao erro. `chefe_departamento_ensino` esta fora de proposito: '
  'ele enxerga todos os cursos, e entraria como o perfil de maior alcance sobre dado pessoal.';


-- ---------------------------------------------------------------------------------
-- ⚠️ ARMADILHA DO SUPABASE, e ela pegou esta migration na primeira execucao.
--
-- O schema `public` do Supabase tem privilegio PADRAO que concede tudo a `authenticated` em
-- objeto novo. A migration do Epico 1 faz
--     revoke delete, truncate on all tables in schema public from authenticated;
-- **uma unica vez** — e "all tables" e uma foto do momento, nao uma regra permanente. Toda view
-- ou tabela criada DEPOIS nasce com DELETE e TRUNCATE de volta.
--
-- As duas views acima nasceram assim, e os testes `FR-033` e `A-17` de `080_imutabilidade.sql`
-- reprovaram na hora — que e exatamente o que eles existem para fazer. Sem eles, este recorte
-- teria entrado devolvendo a `authenticated` um privilegio que o BRIEF proibe.
--
-- 🛑 TODA MIGRATION QUE CRIAR TABELA OU VIEW PRECISA REPETIR ESTE REVOKE.
-- ---------------------------------------------------------------------------------
revoke delete, truncate on public.vw_instrutores from authenticated;
revoke delete, truncate on public.vw_instrutor_dados_pessoais from authenticated;
revoke insert, update on public.vw_instrutores from authenticated;
revoke insert, update on public.vw_instrutor_dados_pessoais from authenticated;

-- =================================================================================
-- ⚠️ O ERRO QUE VOCE VAI VER, E O QUE ELE QUER DIZER
--
--     permission denied for table instrutores
--
-- A mensagem fala de TABELA, nao de coluna, e a primeira suspeita de quem depurar vai ser a
-- RLS. **Nao e a RLS.** E uma destas duas coisas:
--
--   1. `select *` em `public.instrutores` — o `*` expande para as colunas revogadas. Use
--      `public.vw_instrutores`.
--   2. Uma coluna de PII citada por nome, inclusive **dentro de subconsulta** ou **apenas como
--      filtro** (`where cpf is not null`). O privilegio e do banco, nao da forma da consulta —
--      as duas foram medidas e as duas sao negadas.
--
-- O ETL nao e afetado: `service_role` mantem o privilegio de tabela, e e quem carrega a PII.
-- =================================================================================

-- =================================================================================
-- PLANO DE REVERSAO
--
--   drop view if exists public.vw_instrutor_dados_pessoais;
--   drop view if exists public.vw_instrutores;
--   grant select on public.instrutores to authenticated;
--
-- ⚠️ Reverter **devolve CPF, RG, telefone e endereco de 177 militares a 6 perfis** que hoje nao
--    os alcancam. E operacao tecnica de uma linha e decisao de seguranca de outra ordem: a
--    autorizacao da CIAARA-14.2 cobre hospedar o dado, nao quem dentro da Divisao o ve.
-- =================================================================================
