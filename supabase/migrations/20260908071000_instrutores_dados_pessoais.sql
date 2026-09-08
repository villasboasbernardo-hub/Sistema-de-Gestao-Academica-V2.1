-- =================================================================================
-- Dados pessoais dos instrutores — 13 colunas que a origem tem e o schema não tinha
--
-- O QUÊ  : acrescenta a `public.instrutores` as colunas de identificação civil,
--          contato e endereço, mais a área de conhecimento.
--
-- PARA QUÊ: a aba `Cad_Instrutor` tem **42 colunas** e o documento 31 mapeia 29. As 13
--          restantes vieram da spec de ficha de docentes (há backup da planilha
--          chamado `pre-adicionar-campos-ficha-docentes`) e **não tinham destino**.
--          Sem elas, 177 instrutores × 12 campos de dado pessoal ficariam para trás —
--          o que contraria o FR-001 ("100% do histórico").
--
-- AUTORIZAÇÃO: a **CIAARA-14.2 autorizou formalmente**, em 08/09/2026, a hospedagem
--          de dados pessoais em nuvem comercial. Era a única pendência não técnica
--          capaz de bloquear a versão, e ela caiu. Sem essa autorização esta migration
--          NÃO existiria: transportar CPF e endereço para hospedagem externa sem
--          decisão da autoridade competente seria decisão de engenharia sobre matéria
--          que não é de engenharia.
--
-- ⚠️ CONSEQUÊNCIA QUE FICA REGISTRADA, e que ninguém deve descobrir depois:
--
--    Estas colunas mudam a NATUREZA do dado guardado. Até aqui `instrutores` tinha
--    dado funcional — posto, habilitação, carga horária. Passa a ter **identificação
--    civil e residência**: CPF, RG, endereço completo, telefone.
--
--    A RLS existente do Épico 1 protege a tabela por perfil, e continua valendo. Mas
--    ela foi desenhada para dado FUNCIONAL: quem pode ler `instrutores` lê tudo. Não
--    há hoje recorte que permita a um perfil ver posto e habilitação **sem** ver CPF e
--    endereço — e é plausível que devesse haver.
--
--    Isso NÃO é lacuna desta migration: é desenho de segurança, e desenho de segurança
--    é do Épico 3 (auth e RBAC), que ainda não aconteceu. Fica anotado aqui, no lugar
--    onde quem for desenhá-lo vai olhar.
--
-- Decisão de Bernardo, 08/09/2026, com autorização da CIAARA-14.2.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- Identificação civil
-- ---------------------------------------------------------------------------------
alter table public.instrutores add column cpf text;
alter table public.instrutores add column rg text;
alter table public.instrutores add column orgao_emissor text;

comment on column public.instrutores.cpf is
  'DADO PESSOAL. Texto, nao numero: preserva zero a esquerda e formatacao da origem. '
  'Sem CHECK de formato NESTA fatia — o ETL TRANSPORTA, nao valida (FR-003); validar '
  'aqui recusaria dado historico malformado que existe e precisa ser preservado.';

comment on column public.instrutores.rg is 'DADO PESSOAL. Texto pela mesma razao do CPF.';

-- ---------------------------------------------------------------------------------
-- Contato
-- ---------------------------------------------------------------------------------
alter table public.instrutores add column telefone text;
alter table public.instrutores add column retelma text;

comment on column public.instrutores.retelma is
  'RETELMA — rede telefonica da Marinha. Termo institucional, nao traduzido.';

-- ---------------------------------------------------------------------------------
-- Endereço residencial
-- ---------------------------------------------------------------------------------
alter table public.instrutores add column endereco_logradouro text;
alter table public.instrutores add column endereco_numero text;
alter table public.instrutores add column endereco_complemento text;
alter table public.instrutores add column endereco_bairro text;
alter table public.instrutores add column endereco_cidade text;
alter table public.instrutores add column endereco_estado text;
alter table public.instrutores add column endereco_cep text;

comment on column public.instrutores.endereco_numero is
  'TEXTO, nao inteiro: a origem traz "s/n", "12-A", "KM 5". Converter perderia dado.';

comment on column public.instrutores.endereco_cep is
  'DADO PESSOAL. Texto: preserva o hifen e o zero a esquerda da origem.';

-- ---------------------------------------------------------------------------------
-- Acadêmico — não é dado pessoal, mas estava no mesmo bloco não mapeado
-- ---------------------------------------------------------------------------------
alter table public.instrutores add column area_conhecimento text;

comment on column public.instrutores.area_conhecimento is
  'Area de conhecimento do docente. Nao e dado pessoal; estava no mesmo bloco de '
  'colunas que o documento 31 nao conhecia.';

-- ---------------------------------------------------------------------------------
-- Índice: a busca por CPF é a única previsível deste bloco, e é de auditoria.
-- Parcial, porque a maioria das consultas a `instrutores` nao toca dado pessoal.
-- ---------------------------------------------------------------------------------
create index idx_instrutores_cpf
  on public.instrutores (cpf)
  where cpf is not null and status = 'ativo';

-- =================================================================================
-- PLANO DE REVERSÃO
--
--   drop index if exists public.idx_instrutores_cpf;
--   alter table public.instrutores
--     drop column if exists cpf, drop column if exists rg,
--     drop column if exists orgao_emissor, drop column if exists telefone,
--     drop column if exists retelma, drop column if exists endereco_logradouro,
--     drop column if exists endereco_numero, drop column if exists endereco_complemento,
--     drop column if exists endereco_bairro, drop column if exists endereco_cidade,
--     drop column if exists endereco_estado, drop column if exists endereco_cep,
--     drop column if exists area_conhecimento;
--
-- ⚠️ Depois da carga real, reverter **apaga dado pessoal de 177 pessoas**. A partir
--    dali a reversao deixa de ser operacao tecnica: e decisao sobre descartar dado
--    que a autoridade competente autorizou guardar.
-- =================================================================================
