-- =====================================================================================
-- M5 — Derivados e funcoes de dominio
-- Epico 1 · specs/002-schema-rls-permissoes
-- FR-027 · FR-028 · FR-029 · FR-030 · FR-051
-- -------------------------------------------------------------------------------------
-- O QUE  : (a) as funcoes auxiliares que as policies de M6 consomem; (b) as funcoes de
--          dominio que resolvem regime, antiguidade e situacao de vista; (c) as views que
--          substituem as colunas-FORMULA da v2.0; (d) os gatilhos de imutabilidade.
-- PARA QUE: no Sheets, uma formula era o unico jeito de exibir dado derivado — e cada
--          formula era uma segunda fonte de verdade em potencial. Aqui, derivado e VIEW ou
--          coluna GERADA. Nunca uma coluna gravada em paralelo.
-- -------------------------------------------------------------------------------------
-- FRONTEIRA DELIBERADA — O QUE NAO ESTA AQUI: as regras de PLANEJAMENTO (distribuicao
-- semanal, motor preditivo, sugestao do DSA, deteccao de conflito) NAO sao implementadas
-- em SQL. A RN-DIST-01 e explicita: existe UMA funcao compartilhada de distribuicao e
-- "nao pode existir uma segunda implementacao em paralelo". Ela vive em `lib/dominio/`,
-- pura e testavel sem banco. O SQL aqui AGREGA fatos ja registrados; ele nao planeja.
-- -------------------------------------------------------------------------------------
-- ORIGEM E REVISAO. Deriva de `docs/sql-referencia/04_views_e_funcoes.sql`, com tres
-- revisoes, todas consequencia do grao de UE:
--
--   1. `vw_ocupacao_ta` lia `registros_aula.disciplina_id` — coluna que o grao eliminou.
--      Passa a alcancar a disciplina pela unidade de ensino.
--   2. `vw_disciplinas_execucao` agrega ATRAVES da unidade. E aqui que a rota (b) cumpre
--      a promessa: a assinatura publica nao muda, e CHD, DSA, Cronograma e motor preditivo
--      nao percebem a mudanca de grao.
--   3. `vw_unidades_ensino_execucao` ACRESCENTADA — a origem daquela agregacao.
--
-- UMA DEPENDENCIA PARA FRENTE, DELIBERADA: `app.usuario_atual()` nasce aqui e le
-- `usuarios`, que so existe em M6. O referencia resolve capturando o erro de tabela
-- inexistente e devolvendo "ninguem" — e como nenhuma policy concede acesso a "ninguem", o
-- padrao de falha e NEGAR. Degradacao segura (Principio V), e o que permite M5 aplicar
-- isoladamente (research.md §5).
--
-- Pre-requisito: M1 a M4 aplicadas.
-- -------------------------------------------------------------------------------------
-- REVERSAO (FR-056): `drop view` e `drop function` de tudo o que este arquivo cria, mais
--   `drop trigger` dos gatilhos de imutabilidade. TOTALMENTE reversivel: nao ha dado.
-- =====================================================================================

-- #####################################################################################
-- PARTE I — FUNÇÕES AUXILIARES DE AUTORIZAÇÃO (consumidas por 05_rls.sql)
-- #####################################################################################
-- NOTA DE ORDEM DE CRIAÇÃO: estas quatro funções leem `usuarios` e `usuario_curso`, que
-- são criadas na migration de AUTENTICAÇÃO (não pertence a este arquivo). Por isso são
-- escritas em PL/pgSQL, e não em SQL puro: o PL/pgSQL resolve referências em tempo de
-- EXECUÇÃO, então `CREATE FUNCTION` funciona mesmo antes de a tabela existir. Uma função
-- `LANGUAGE sql` falharia na criação. É uma escolha de composição entre migrations, não
-- estilo.
--
-- TODAS são `SECURITY DEFINER` + `STABLE` + `search_path` fixo (BRIEF §3):
--   • SECURITY DEFINER — precisam ler `usuarios` ignorando a RLS de `usuarios`, senão a
--     policy que pergunta "quem sou eu?" dependeria de já saber quem eu sou (recursão).
--   • STABLE — resultado constante dentro da consulta; permite ao planejador chamá-las
--     uma vez por statement em vez de uma vez por linha.
--   • search_path fixo — impede sequestro de nome por schema temporário, o vetor clássico
--     de escalonamento de privilégio em SECURITY DEFINER.
-- #####################################################################################

-- -------------------------------------------------------------------------------------
-- app.usuario_atual() — a linha de `usuarios` correspondente ao JWT da sessão.
-- -------------------------------------------------------------------------------------
create or replace function app.usuario_atual()
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
begin
  select u.id into v_id
    from public.usuarios u
   where u.auth_user_id = app.uid_atual()
     and u.status = 'ativo'
   limit 1;
  return v_id;
exception when undefined_table then
  -- Migration de autenticação ainda não aplicada: degrada para "ninguém" em vez de
  -- estourar. Nenhuma policy concede acesso a NULL, então o padrão seguro é negar.
  return null;
end;
$$;

comment on function app.usuario_atual() is
  'uuid do registro em `usuarios` correspondente ao JWT da sessão, ou NULL. Base de todas '
  'as demais funções de autorização. Origem: BRIEF v2.1 §3.';

-- -------------------------------------------------------------------------------------
-- app.perfil_atual() — o perfil RBAC do usuário da sessão.
-- -------------------------------------------------------------------------------------
create or replace function app.perfil_atual()
returns public.perfil_usuario
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_perfil public.perfil_usuario;
begin
  select u.perfil into v_perfil
    from public.usuarios u
   where u.auth_user_id = app.uid_atual()
     and u.status = 'ativo'
   limit 1;
  return v_perfil;
exception when undefined_table then
  return null;
end;
$$;

comment on function app.perfil_atual() is
  'Perfil RBAC do usuário da sessão, ou NULL. Origem: BRIEF v2.1 §3; documento 01 §2.2.';

-- -------------------------------------------------------------------------------------
-- app.pode(recurso, acao) — consulta a matriz de permissões como DADO.
-- -------------------------------------------------------------------------------------
-- É esta função que evita escrever uma policy por perfil: as ~9 policies do arquivo 05
-- chamam `app.pode('registros_aula','criar')` e a resposta vem da tabela
-- `perfil_permissao`. Trocar uma permissão vira UPDATE, não migration (Princípio VII).
-- -------------------------------------------------------------------------------------
create or replace function app.pode(p_recurso text, p_acao text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_perfil    public.perfil_usuario := app.perfil_atual();
  v_permitido boolean;
begin
  -- Sem perfil não há permissão. Negar por omissão é o padrão correto: uma tabela sem
  -- policy é inacessível, e uma pergunta sem resposta é "não" (BRIEF §2).
  if v_perfil is null then
    return false;
  end if;

  select pp.permitido into v_permitido
    from public.perfil_permissao pp
   where pp.perfil  = v_perfil
     and pp.recurso = p_recurso
     and pp.acao    = p_acao
   limit 1;

  return coalesce(v_permitido, false);
end;
$$;

comment on function app.pode(text, text) is
  'Consulta a matriz `perfil_permissao` para o perfil da sessão. Nega por omissão. '
  'É o que permite UMA policy por tabela em vez de uma por perfil. '
  'Origem: BRIEF v2.1 §3; RN-RBAC-02.';

-- -------------------------------------------------------------------------------------
-- app.cursos_do_usuario() — o conjunto de cursos que a sessão alcança.
-- -------------------------------------------------------------------------------------
-- Resolve as TRÊS formas de alcance do sistema, nesta ordem de precedência:
--   1. Perfis de leitura total (admin, chefe, encarregados/ajudantes, visualização) →
--      todos os cursos ativos.
--   2. Encarregado de Curso → apenas os cursos vinculados em `usuario_curso` (N:N).
--   3. Operador → os cursos cuja `classificacao` casa com seu `escopo_curso`; escopo
--      `geral` alcança todos.
-- -------------------------------------------------------------------------------------
create or replace function app.cursos_do_usuario()
returns setof uuid
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_usuario uuid                  := app.usuario_atual();
  v_perfil  public.perfil_usuario := app.perfil_atual();
  v_escopo  public.escopo_curso;
begin
  if v_usuario is null or v_perfil is null then
    return;                       -- conjunto vazio: nenhum curso alcançado
  end if;

  -- 1. Perfis de alcance institucional total.
  if v_perfil in ('admin', 'chefe_departamento_ensino', 'visualizacao',
                  'encarregado_administracao_academica', 'ajudante_administracao_academica',
                  'encarregado_orientacao_pedagogica',  'ajudante_orientacao_pedagogica') then
    return query select c.id from public.cursos c where c.status = 'ativo';
    return;
  end if;

  -- 2. Encarregado de Curso: restrito ao(s) curso(s) sob coordenação (N:N).
  if v_perfil = 'encarregado_curso' then
    return query
      select uc.curso_id
        from public.usuario_curso uc
       where uc.usuario_id = v_usuario
         and uc.status = 'ativo';
    return;
  end if;

  -- 3. Operador: recorte por escopo de curso.
  if v_perfil = 'operador' then
    select u.escopo_curso into v_escopo from public.usuarios u where u.id = v_usuario;

    if v_escopo is null or v_escopo = 'geral' then
      return query select c.id from public.cursos c where c.status = 'ativo';
    else
      return query
        select c.id from public.cursos c
         where c.status = 'ativo'
           and c.classificacao = v_escopo;
    end if;
    return;
  end if;

  return;
exception when undefined_table then
  return;                          -- migration de autenticação ainda não aplicada
end;
$$;

comment on function app.cursos_do_usuario() is
  'Conjunto de cursos alcançados pela sessão, resolvendo alcance institucional total, '
  'vínculo N:N do Encarregado de Curso e recorte por escopo do Operador. '
  'Origem: BRIEF v2.1 §3; documento 01 §2.2.';


-- #####################################################################################
-- PARTE II — FUNÇÕES DE DOMÍNIO
-- #####################################################################################

-- =====================================================================================
-- app.fn_parametro_numerico(chave, ano) — lê um limite normativo de `config_parametros`
-- -------------------------------------------------------------------------------------
-- O QUÊ  : devolve o valor numérico de um parâmetro, resolvido por ano de vigência.
-- PARA QUÊ: é o ponto único por onde tetos e faixas entram em qualquer cálculo. Sem ele,
--          cada view repetiria a resolução de vigência e a conversão de tipo.
-- COMO   : maior `ano_vigencia <= ano do fato`, com parâmetro perene (`NULL`) como
--          fallback. Conversão protegida: valor não numérico devolve NULL em vez de
--          derrubar a consulta (RN-DEG-01).
-- =====================================================================================
create or replace function app.fn_parametro_numerico(p_chave text, p_ano smallint default null)
returns numeric
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_texto text;
  v_num   numeric;
begin
  select cp.valor into v_texto
    from public.config_parametros cp
   where cp.chave = p_chave
     and cp.status = 'ativo'
     and (cp.ano_vigencia is null or p_ano is null or cp.ano_vigencia <= p_ano)
   order by cp.ano_vigencia desc nulls last     -- vigência específica vence a perene
   limit 1;

  if v_texto is null then
    return null;                                -- parâmetro ausente: neutro, sem exceção
  end if;

  begin
    v_num := v_texto::numeric;
  exception when others then
    v_num := null;                              -- valor malformado degrada para neutro
  end;

  return v_num;
end;
$$;

comment on function app.fn_parametro_numerico(text, smallint) is
  'Lê um limite normativo de `config_parametros` resolvido por ano de vigência. Ponto '
  'ÚNICO de entrada de teto/faixa em qualquer cálculo. Degrada para NULL, nunca estoura '
  '(RN-DEG-01). Origem: RNF-NORM-08.';


-- =====================================================================================
-- app.fn_regime_vigente(curso_id, data, tipo) — resolve o regime aplicável a uma data
-- -------------------------------------------------------------------------------------
-- O QUÊ  : devolve a linha de `curso_regime_historico` vigente para o curso na data.
-- PARA QUÊ: é o contrato central da RN-2027-09. TODO módulo que na v1.0 lia
--          `Cad_Cursos.Regime_Padrao_Tempos` passa a chamar esta função COM A DATA DO
--          PRÓPRIO REGISTRO. É isso, e só isso, que garante que mudar o regime hoje não
--          reinterprete um DSA de março.
-- COMO   : maior `vigente_de <= data`, entre linhas `ativo`, respeitando `vigente_ate`.
--          A constraint EXCLUDE de `curso_regime_historico` garante que o resultado é
--          único — a função não precisa desempatar, porque a ambiguidade é impossível.
-- =====================================================================================
create or replace function app.fn_regime_vigente(
  p_curso_id uuid,
  p_data     date,
  p_tipo     public.tipo_regime default 'padrao'
)
returns public.curso_regime_historico
language sql
stable
set search_path = pg_catalog, public
as $$
  select r.*
    from public.curso_regime_historico r
   where r.curso_id    = p_curso_id
     and r.tipo_regime = p_tipo
     and r.status      = 'ativo'
     and r.vigente_de <= p_data
     and (r.vigente_ate is null or r.vigente_ate >= p_data)
   order by r.vigente_de desc
   limit 1;
$$;

comment on function app.fn_regime_vigente(uuid, date, public.tipo_regime) is
  'Regime de horário vigente para o curso na data. Contrato central da RN-2027-09: '
  'nenhuma edição de regime reinterpreta o passado. Substitui a leitura direta de '
  '`Cad_Cursos.Regime_Padrao_Tempos` da v1.0. Resultado único por construção (a constraint '
  'EXCLUDE impede vigências sobrepostas). Origem: RN-2027-09; RF-HOR-05; achado (j).';


-- =====================================================================================
-- app.fn_peso_posto(posto) — peso de antiguidade de um posto/graduação
-- -------------------------------------------------------------------------------------
-- O QUÊ  : converte o posto/graduação no peso da escala da RN-ANT-02 (menor = mais antigo).
-- PARA QUÊ: a RN-ANT-01 exige que TODA lista de instrutores seja ordenada por antiguidade,
--          sem exceção. Sem uma função, cada consulta reimplantaria a escala.
-- COMO   : lê a escala de `config_listas` (lista `escala_antiguidade`), NÃO de constante
--          no corpo. É deliberado: `lib/dominio/` (TypeScript) lê a MESMA tabela, então
--          existe uma única escala no sistema. Duas implementações da RN-ANT-02 que
--          divergissem seriam o defeito mais provável de uma reescrita — este é o
--          antídoto estrutural.
-- -------------------------------------------------------------------------------------
-- Posto desconhecido devolve 999 (o mais moderno), nunca erro: a lista continua sendo
-- exibida, com o registro anômalo no fim, e a UI sinaliza (RN-DEG-01/02).
-- =====================================================================================
create or replace function app.fn_peso_posto(p_posto text)
returns smallint
language sql
stable
set search_path = pg_catalog, public
as $$
  select coalesce(
    (select c.ordem
       from public.config_listas c
      where c.lista = 'escala_antiguidade'
        and c.ativo
        and app.normalizar_texto(c.valor) = app.normalizar_texto(p_posto)
      limit 1),
    999::smallint                     -- desconhecido: vai para o fim, sem quebrar a lista
  );
$$;

comment on function app.fn_peso_posto(text) is
  'Peso de antiguidade do posto/graduação segundo a escala da RN-ANT-02 (CMG=1 … MN=12, '
  'categorias civis SC/SCNS=13). Lê `config_listas`, NÃO uma constante — é a mesma fonte '
  'que `lib/dominio/` consome, evitando duas escalas divergentes. Desconhecido = 999.';


-- =====================================================================================
-- app.fn_antiguidade_ordem(instrutor_id) — chave de ordenação completa por antiguidade
-- -------------------------------------------------------------------------------------
-- O QUÊ  : devolve a chave composta que ordena instrutores por antiguidade.
-- PARA QUÊ: a RN-ANT-02 tem dois níveis — critério PRIMÁRIO é o posto/graduação; o
--          DESEMPATE, quando dois instrutores têm o mesmo posto, é a
--          `antiguidade_declarada` (achado (d), reaproveitada e não removida).
-- COMO   : devolve `peso_posto * 100000 + antiguidade_declarada`, de modo que a ordenação
--          por um único inteiro já respeita os dois níveis. Instrutor sem antiguidade
--          declarada cai no fim do seu próprio posto, nunca fora dele.
-- =====================================================================================
create or replace function app.fn_antiguidade_ordem(p_instrutor_id uuid)
returns integer
language sql
stable
set search_path = pg_catalog, public
as $$
  select app.fn_peso_posto(i.posto_graduacao)::integer * 100000
       + coalesce(i.antiguidade_declarada_num, 99999)
    from public.instrutores i
   where i.id = p_instrutor_id;
$$;

comment on function app.fn_antiguidade_ordem(uuid) is
  'Chave única de ordenação por antiguidade: posto/graduação como critério PRIMÁRIO '
  '(RN-ANT-02) e `antiguidade_declarada` como DESEMPATE entre iguais (achado (d)). '
  'Um só inteiro resolve os dois níveis. Origem: RN-ANT-01/02.';


-- =====================================================================================
-- app.fn_status_vista(data_avaliacao, data_vista, status, prazo_dias) — situação da vista
-- -------------------------------------------------------------------------------------
-- O QUÊ  : calcula se a vista de prova está `realizada`, `atrasada` ou `pendente`.
-- PARA QUÊ: é a FORMULA `Status_Vista` da v2.0 §4.4, portada.
-- COMO   : **POR QUE FUNÇÃO E NÃO COLUNA GERADA** — a regra depende de `CURRENT_DATE`.
--          Uma coluna `GENERATED ALWAYS AS ... STORED` exige expressão IMMUTABLE; gravar
--          "atrasada" em disco significaria que uma linha correta hoje estaria errada
--          amanhã, sem ninguém tocar nela. Seria exatamente a segunda fonte de verdade
--          que o BRIEF §2 proíbe. Situação que depende de "hoje" é sempre calculada na
--          leitura. Este é o exemplo canônico da distinção coluna gerada × view.
-- =====================================================================================
create or replace function app.fn_status_vista(
  p_data_avaliacao date,
  p_data_vista     date,
  p_status         public.status_avaliacao,
  p_prazo_dias     integer default null
)
returns public.status_vista
language sql
stable
set search_path = pg_catalog, public
as $$
  select case
    -- Vista registrada e avaliação concluída: realizada.
    when p_data_vista is not null and p_status = 'concluida' then 'realizada'::public.status_vista
    -- Passou do prazo sem vista registrada: atrasada (RF-AVAL-03, 7 dias corridos).
    when p_data_vista is null
     and p_status not in ('cancelada')
     and current_date - p_data_avaliacao
         > coalesce(p_prazo_dias, app.fn_parametro_numerico('avaliacao.prazo_vista_dias')::integer, 7)
    then 'atrasada'::public.status_vista
    else 'pendente'::public.status_vista
  end;
$$;

comment on function app.fn_status_vista(date, date, public.status_avaliacao, integer) is
  'Situação da vista de prova. Porta a FORMULA `Status_Vista` da v2.0 §4.4. É FUNÇÃO e não '
  'coluna gerada porque depende de CURRENT_DATE — gravá-la em disco criaria uma segunda '
  'fonte de verdade que envelhece sozinha. Prazo lido de `config_parametros`. '
  'Origem: RF-AVAL-03.';


-- #####################################################################################
-- PARTE III — VIEWS
-- #####################################################################################
-- Todas as views herdam a RLS das tabelas-base (são `security_invoker`, padrão no
-- PostgreSQL 15+ quando declarado). Declaramos explicitamente para não depender da
-- versão: sem isso, uma view criada pelo owner ignoraria a RLS das tabelas que lê — um
-- furo de segurança silencioso.
-- #####################################################################################

-- =====================================================================================
-- vw_cursos_regime_vigente — substitui as SETE colunas-FÓRMULA de `Cad_Cursos`
-- -------------------------------------------------------------------------------------
-- O QUÊ  : cada curso com seu regime padrão e de exceção vigentes HOJE.
-- PARA QUÊ: a v2.0 manteve `Regime_Padrao_Tempos`, `TA_Padrao`, `Intervalo_Padrao`,
--          `Config_Horario_Padrao`, `Regime_Excecao`, `Config_Horario_Excecao` e
--          `Limite_Diario_EAD` como FORMULA de exibição somente-leitura, para não quebrar
--          a compatibilidade visual de quem abre a planilha. Em PostgreSQL isso é uma
--          view — e uma view não pode divergir da fonte nem por acidente.
-- COMO   : dois LATERAL sobre `fn_regime_vigente`, um por tipo de regime.
-- =====================================================================================
create or replace view public.vw_cursos_regime_vigente
with (security_invoker = true) as
select
  c.id                       as curso_id,
  c.codigo                   as curso_codigo,
  c.nome_curso,
  c.classificacao,
  c.modalidade,
  c.status,
  -- Regime PADRÃO vigente hoje
  rp.regime_tempos           as regime_padrao_tempos,
  rp.ta_duracao_min          as ta_padrao_duracao_min,
  rp.intervalo_manha_min     as intervalo_padrao_manha_min,
  rp.intervalo_tarde_min     as intervalo_padrao_tarde_min,
  rp.hora_inicio_manha,
  rp.hora_inicio_tarde,
  cfp.codigo                 as config_horario_padrao,
  rp.limite_diario_ead_horas,
  -- Regime de EXCEÇÃO vigente hoje (autorizado por currículo)
  re.regime_tempos           as regime_excecao_tempos,
  re.ta_duracao_min          as ta_excecao_duracao_min,
  cfe.codigo                 as config_horario_excecao,
  re.fundamento_curricular   as fundamento_excecao
from public.cursos c
left join lateral app.fn_regime_vigente(c.id, current_date, 'padrao')  rp on true
left join lateral app.fn_regime_vigente(c.id, current_date, 'excecao') re on true
left join public.configuracoes_horario cfp on cfp.id = rp.configuracao_horario_id
left join public.configuracoes_horario cfe on cfe.id = re.configuracao_horario_id;

comment on view public.vw_cursos_regime_vigente is
  '[MIGRAÇÃO v2.1] Substitui as SETE colunas-FÓRMULA de regime que a v2.0 manteve em '
  '`Cad_Cursos` por compatibilidade visual. Resolve o regime VIGENTE HOJE. Para o regime '
  'aplicável a um FATO PASSADO use `app.fn_regime_vigente(curso, data_do_fato)` — esta '
  'view é para tela de cadastro, nunca para recalcular histórico. Origem: v2.0 §5.1.';


-- =====================================================================================
-- vw_turmas_rotulo — substitui a FORMULA `Nome_Completo_Curso` de `Turmas_Ativas`
-- =====================================================================================
create or replace view public.vw_turmas_rotulo
with (security_invoker = true) as
select
  t.id                          as turma_id,
  t.codigo                      as turma_codigo,
  t.curso_id,
  c.codigo                      as curso_codigo,
  c.nome_curso,
  t.turma,
  t.ano_letivo,
  t.status,
  t.data_inicio,
  t.data_termino,
  -- Rótulo institucional completo, como aparece na LIQ e no DSA impresso (ex.: "C-Ap-FR T2/2026").
  c.codigo || ' ' || t.turma || '/' || t.ano_letivo::text  as rotulo_completo,
  c.nome_curso || ' — ' || t.turma || '/' || t.ano_letivo::text as nome_completo_curso
from public.turmas t
join public.cursos c on c.id = t.curso_id;

comment on view public.vw_turmas_rotulo is
  '[MIGRAÇÃO v2.1] Substitui a FORMULA `Nome_Completo_Curso` da v2.0. Exibição é view, '
  'nunca coluna gravada. O sufixo de turma (`T2`) é o mesmo que a LIQ real usa (achado LIQ-1).';


-- =====================================================================================
-- vw_instrutor_disciplina_rotulada — substitui as três FORMULA de `Instrutor_Disciplina`
-- =====================================================================================
create or replace view public.vw_instrutor_disciplina_rotulada
with (security_invoker = true) as
select
  v.id                     as vinculo_id,
  v.codigo                 as vinculo_codigo,
  v.instrutor_id,
  i.posto_graduacao,
  i.nome_guerra,
  i.nome_completo,
  i.posto_graduacao || ' ' || coalesce(i.nome_guerra, i.nome_completo) as instrutor_rotulo,
  v.disciplina_id,
  d.cod_disciplina,
  d.nome_disciplina,
  d.carga_horaria_tempos,
  d.curso_id,
  c.codigo                 as curso_codigo,
  c.nome_curso,
  -- `herdar` resolve no padrão da disciplina — a resolução acontece AQUI, uma vez, e não
  -- em cada tela que precise saber o modo efetivo.
  case when v.modo_atribuicao = 'herdar'
       then d.modo_atribuicao_padrao
       else v.modo_atribuicao
  end                      as modo_atribuicao_efetivo,
  app.fn_antiguidade_ordem(v.instrutor_id) as ordem_antiguidade,
  v.status
from public.instrutor_disciplina v
join public.instrutores  i on i.id = v.instrutor_id
join public.disciplinas  d on d.id = v.disciplina_id
join public.cursos       c on c.id = d.curso_id;

comment on view public.vw_instrutor_disciplina_rotulada is
  '[MIGRAÇÃO v2.1] Substitui as três colunas-FÓRMULA de `Instrutor_Disciplina` (rótulo do '
  'instrutor, da disciplina e do curso), que eram desnormalização de exibição exigida pelo '
  'Sheets por falta de JOIN. Resolve `modo_atribuicao = herdar` uma única vez '
  '(RN-MAT-05) e já entrega a ordem de antiguidade (RN-ANT-01).';


-- =====================================================================================
-- vw_ocupacao_ta — a grade unificada de ocupação de Tempos de Aula
-- -------------------------------------------------------------------------------------
-- O QUÊ  : união dos TRÊS tipos de fato que ocupam TA na grade de uma turma: aula,
--          avaliação (aplicação e vista) e atividade não letiva.
-- PARA QUÊ: é o insumo do DSA e da detecção de CONFLITO DE HORÁRIO. Um conflito só é
--          visível olhando as três origens juntas — nenhuma constraint por tabela poderia
--          enxergá-lo, porque a sobreposição é ENTRE tabelas.
-- COMO   : **POR QUE NÃO É UMA CONSTRAINT EXCLUDE** — porque conflito de TA é ALERTA, não
--          bloqueio (RN-DEG-02, e o 9º TA é o caso canônico: "alerta informativo, nunca
--          bloqueio", BRIEF §9). Uma EXCLUDE recusaria o lançamento; o CIAARA-11 precisa
--          aceitar e sinalizar. A view entrega o dado; a decisão é da aplicação.
-- =====================================================================================
create or replace view public.vw_ocupacao_ta
with (security_invoker = true) as
  -- [GRAO DE UE] o referencia lia `r.disciplina_id`; a coluna nao existe mais. A
  -- disciplina vem da unidade de ensino, e a assinatura publica da view nao muda.
  select r.turma_id, r.data, r.ta_inicial, r.ta_final, r.tempos_consumidos,
         'aula'::text        as origem, r.id as fato_id, ue.disciplina_id, r.instrutor_id
    from public.registros_aula r
    join public.unidades_ensino ue on ue.id = r.unidade_ensino_id
   where r.status = 'ativo' and r.ta_inicial is not null
union all
  select a.turma_id, a.data_avaliacao, a.ta_inicial, a.ta_final, a.tempos_consumidos,
         'avaliacao'::text   as origem, a.id, a.disciplina_id, a.instrutor_responsavel_id
    from public.avaliacoes a
   where a.status <> 'cancelada' and a.ta_inicial is not null
union all
  select a.turma_id, a.data_vista_prova, a.ta_inicial_vista, a.ta_final_vista, a.tempos_consumidos_vista,
         'vista_prova'::text as origem, a.id, a.disciplina_id, a.instrutor_responsavel_id
    from public.avaliacoes a
   where a.status <> 'cancelada' and a.ta_inicial_vista is not null
union all
  select n.turma_id, n.data, n.ta_inicial, n.ta_final, n.tempos_consumidos,
         'atividade_nao_letiva'::text, n.id, null::uuid, null::uuid
    from public.atividades_nao_letivas n
   where n.status = 'ativo' and n.ta_inicial is not null and n.turma_id is not null;

comment on view public.vw_ocupacao_ta is
  'Grade unificada de ocupação de TA por turma e data, reunindo aula, aplicação de prova, '
  'vista de prova e atividade não letiva. Insumo do DSA e da detecção de conflito de '
  'horário. NÃO é uma constraint: conflito de TA é ALERTA, nunca bloqueio (RN-DEG-02).';


-- =====================================================================================
-- vw_carga_horaria_turma — CHD, CHT e composição por turma
-- -------------------------------------------------------------------------------------
-- O QUÊ  : para cada turma, os TA efetivamente consumidos, separados por grandeza normativa.
-- PARA QUÊ: é a base de `vw_conformidade_tetos` e do Relatório do Curso.
-- COMO   : materializa as duas fórmulas normativas do Glossário DEnsM §2:
--            CHD = aulas + atividades extraclasse + avaliações + vistas de prova
--            CHT = CHD + AEC + TAD + TR      (Estudo Individual FICA DE FORA)
--          A inclusão de avaliação e vista na CHD é a RN-EVT-03, e é normativa — foi a
--          ausência dela que causou o subdimensionamento sistemático diagnosticado na v2.0.
-- =====================================================================================
create or replace view public.vw_carga_horaria_turma
with (security_invoker = true) as
with aulas as (
  select r.turma_id,
         sum(r.tempos_consumidos) filter (where r.categoria_normativa = 'aula')                  as ta_aula,
         sum(r.tempos_consumidos) filter (where r.categoria_normativa = 'atividade_extraclasse') as ta_extraclasse
    from public.registros_aula r
   where r.status = 'ativo'
   group by r.turma_id
),
provas as (
  select a.turma_id,
         sum(coalesce(a.tempos_consumidos, 0))       as ta_aplicacao,
         sum(coalesce(a.tempos_consumidos_vista, 0)) as ta_vista
    from public.avaliacoes a
   where a.status <> 'cancelada'
   group by a.turma_id
),
nao_letivas as (
  select n.turma_id,
         sum(n.tempos_consumidos) filter (where n.categoria_normativa = 'AEC')               as ta_aec,
         sum(n.tempos_consumidos) filter (where n.categoria_normativa = 'TAD')               as ta_tad,
         sum(n.tempos_consumidos) filter (where n.categoria_normativa = 'TR')                as ta_tr,
         sum(n.tempos_consumidos) filter (where n.categoria_normativa = 'Estudo_Individual') as ta_estudo_individual
    from public.atividades_nao_letivas n
   where n.status = 'ativo' and n.turma_id is not null
   group by n.turma_id
),
curricular as (
  -- CHR = somatório estrito das CH de todas as disciplinas do currículo do curso.
  select t.id as turma_id, sum(d.carga_horaria_tempos) as chr_curricular
    from public.turmas t
    join public.disciplinas d on d.curso_id = t.curso_id and d.status = 'ativo'
   group by t.id
)
select
  t.id                                      as turma_id,
  t.codigo                                  as turma_codigo,
  t.curso_id,
  c.codigo                                  as curso_codigo,
  c.nome_curso,
  t.ano_letivo,
  t.status                                  as status_turma,
  coalesce(cu.chr_curricular, 0)            as chr_curricular,
  coalesce(au.ta_aula, 0)                   as ta_aula,
  coalesce(au.ta_extraclasse, 0)            as ta_extraclasse,
  coalesce(pr.ta_aplicacao, 0)              as ta_avaliacao,
  coalesce(pr.ta_vista, 0)                  as ta_vista_prova,
  -- CHD inclui avaliação e vista por exigência normativa (RN-EVT-03).
  coalesce(au.ta_aula, 0) + coalesce(au.ta_extraclasse, 0)
    + coalesce(pr.ta_aplicacao, 0) + coalesce(pr.ta_vista, 0)          as chd_executada,
  coalesce(nl.ta_aec, 0)                    as ta_aec,
  coalesce(nl.ta_tad, 0)                    as ta_tad,
  coalesce(nl.ta_tr, 0)                     as ta_tr,
  coalesce(nl.ta_estudo_individual, 0)      as ta_estudo_individual,
  -- CHT = CHD + AEC + TAD + TR. Estudo Individual permanece FORA (RN-EVT-01).
  coalesce(au.ta_aula, 0) + coalesce(au.ta_extraclasse, 0)
    + coalesce(pr.ta_aplicacao, 0) + coalesce(pr.ta_vista, 0)
    + coalesce(nl.ta_aec, 0) + coalesce(nl.ta_tad, 0) + coalesce(nl.ta_tr, 0) as cht_executada
from public.turmas t
join public.cursos c        on c.id = t.curso_id
left join aulas au          on au.turma_id = t.id
left join provas pr         on pr.turma_id = t.id
left join nao_letivas nl    on nl.turma_id = t.id
left join curricular cu     on cu.turma_id = t.id;

comment on view public.vw_carga_horaria_turma is
  'Carga horária executada por turma, decomposta por grandeza normativa. Materializa '
  'CHD = aula + extraclasse + avaliação + vista (RN-EVT-03) e CHT = CHD + AEC + TAD + TR, '
  'com Estudo Individual FORA da soma (RN-EVT-01). `chr_curricular` é o somatório das CH '
  'das disciplinas do curso — base dos três tetos. Origem: Glossário DEnsM §2.';


-- =====================================================================================
-- vw_conformidade_tetos — sinalização dos três tetos normativos (RNF-NORM-02)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : compara AEC, TAD e TR executados contra os tetos de 10%, 5% e 10% da CHR.
-- PARA QUÊ: RNF-NORM-02, literalmente. É a única view do schema cuja saída vira ALERTA na
--          tela — e alerta, não bloqueio (RN-DEG-02).
-- COMO   : os percentuais vêm de `config_parametros`, nunca de literal no corpo da view
--          (RNF-NORM-08). Uma revisão normativa é UPDATE, e esta view passa a comparar
--          contra o novo valor sem redeploy.
-- -------------------------------------------------------------------------------------
-- EQUIVALÊNCIA REGISTRADA: o teto de AEC é enunciado ora como "10% do somatório das CHD"
-- (Glossário DEnsM §2), ora como "10% do somatório das cargas horárias das disciplinas"
-- (RNF-NORM-02, BRIEF §9). São a mesma grandeza: a CHD é a carga horária DA disciplina, e
-- seu somatório sobre o currículo É a CHR. As três bases são, portanto, a CHR curricular.
-- =====================================================================================
create or replace view public.vw_conformidade_tetos
with (security_invoker = true) as
select
  v.turma_id,
  v.turma_codigo,
  v.curso_id,
  v.curso_codigo,
  v.nome_curso,
  v.ano_letivo,
  v.chr_curricular,

  -- AEC ---------------------------------------------------------------------------------
  v.ta_aec,
  round(v.chr_curricular * app.fn_parametro_numerico('teto.aec_percentual_chr', v.ano_letivo) / 100, 2) as teto_aec,
  (v.ta_aec > v.chr_curricular * app.fn_parametro_numerico('teto.aec_percentual_chr', v.ano_letivo) / 100) as aec_excedido,

  -- TAD ---------------------------------------------------------------------------------
  v.ta_tad,
  round(v.chr_curricular * app.fn_parametro_numerico('teto.tad_percentual_chr', v.ano_letivo) / 100, 2) as teto_tad,
  (v.ta_tad > v.chr_curricular * app.fn_parametro_numerico('teto.tad_percentual_chr', v.ano_letivo) / 100) as tad_excedido,

  -- TR ----------------------------------------------------------------------------------
  v.ta_tr,
  round(v.chr_curricular * app.fn_parametro_numerico('teto.tr_percentual_chr', v.ano_letivo) / 100, 2) as teto_tr,
  (v.ta_tr > v.chr_curricular * app.fn_parametro_numerico('teto.tr_percentual_chr', v.ano_letivo) / 100) as tr_excedido,

  -- Reservas concedidas pelo PROENS, para comparar previsto × executado -------------------
  (select r.tempos_reservados from public.reservas_proens r
    where r.curso_id = v.curso_id and r.ano = v.ano_letivo
      and r.tipo_reserva = 'TAD' and r.status = 'ativo' limit 1) as tad_reservado_proens,
  (select r.tempos_reservados from public.reservas_proens r
    where r.curso_id = v.curso_id and r.ano = v.ano_letivo
      and r.tipo_reserva = 'TR'  and r.status = 'ativo' limit 1) as tr_reservado_proens,

  v.chd_executada,
  v.cht_executada,
  v.ta_estudo_individual
from public.vw_carga_horaria_turma v;

comment on view public.vw_conformidade_tetos is
  'Sinalização dos três tetos normativos por turma: AEC ≤ 10%, TAD ≤ 5% e TR ≤ 10% da CHR. '
  'Percentuais lidos de `config_parametros` (RNF-NORM-08), nunca literais. A saída é '
  'ALERTA na tela, jamais bloqueio (RN-DEG-02). Origem: RNF-NORM-02.';


-- =====================================================================================
-- vw_instrutor_carga_anual — carga horária ministrada e prevista por instrutor
-- -------------------------------------------------------------------------------------
-- O QUÊ  : por instrutor e ano, os TA efetivamente ministrados e a faixa normativa do seu
--          regime de trabalho.
-- PARA QUÊ: a RN-INST-04 é categórica: a carga horária de um instrutor é sempre CALCULADA,
--          nunca digitada. A v1.0 tinha `Carga horária ministrada no ano` como coluna —
--          aqui ela é view, e por isso não pode ser editada nem divergir dos fatos.
--          Alimenta também a coluna "Carga Horária" da LIQ (Anexo C da NORMHIDRO 30-23).
-- COMO   : soma aulas + avaliações aplicadas + fiscalizações, por ano civil do fato.
--          As faixas por regime vêm de `config_parametros` (RNF-NORM-03).
-- =====================================================================================
create or replace view public.vw_instrutor_carga_anual
with (security_invoker = true) as
with fatos as (
  select r.instrutor_id, extract(year from r.data)::smallint as ano,
         sum(r.tempos_consumidos) as ta, 0 as ta_fiscal
    from public.registros_aula r
   where r.status = 'ativo' and r.instrutor_id is not null
   group by 1, 2
  union all
  select a.instrutor_responsavel_id, extract(year from a.data_avaliacao)::smallint,
         sum(coalesce(a.tempos_consumidos, 0) + coalesce(a.tempos_consumidos_vista, 0)), 0
    from public.avaliacoes a
   where a.status <> 'cancelada'
   group by 1, 2
  union all
  -- Fiscalização de prova também é atuação docente do instrutor (RN-INST-04 ampliada),
  -- mas é contabilizada em coluna própria para não inflar a carga de instrutoria.
  select a.fiscal_id, extract(year from a.data_avaliacao)::smallint,
         0, sum(coalesce(a.tempos_consumidos, 0))
    from public.avaliacoes a
   where a.status <> 'cancelada' and a.fiscal_id is not null
   group by 1, 2
),
consolidado as (
  select instrutor_id, ano, sum(ta) as ta_ministrado, sum(ta_fiscal) as ta_fiscalizado
    from fatos
   where instrutor_id is not null
   group by 1, 2
)
select
  i.id                            as instrutor_id,
  i.codigo                        as instrutor_codigo,
  i.posto_graduacao,
  coalesce(i.nome_guerra, i.nome_completo) as nome_exibicao,
  i.nome_completo,
  i.om,
  i.dep_divisao,
  i.regime_trabalho,
  i.status,
  app.fn_antiguidade_ordem(i.id)  as ordem_antiguidade,
  co.ano,
  coalesce(co.ta_ministrado, 0)   as ta_ministrado_ano,
  coalesce(co.ta_fiscalizado, 0)  as ta_fiscalizado_ano,
  -- Faixa normativa do regime (RNF-NORM-03), lida de `config_parametros`.
  app.fn_parametro_numerico('ch_docente.' || i.regime_trabalho::text || '.min', co.ano) as faixa_semanal_min,
  app.fn_parametro_numerico('ch_docente.' || i.regime_trabalho::text || '.max', co.ano) as faixa_semanal_max,
  -- Tempo no setor em anos — era FORMULA na v1.0; depende de "hoje", logo é view.
  case when i.data_assuncao_setor is not null
       then floor((current_date - i.data_assuncao_setor)::numeric / 365.25)::integer
  end                             as tempo_setor_anos,
  -- Habilitações ativas: insumo direto da coluna "Disciplinas habilitadas (C.H)" da LIQ.
  (select count(*) from public.instrutor_disciplina v
    where v.instrutor_id = i.id and v.status = 'ativo') as qtd_disciplinas_habilitadas
from public.instrutores i
left join consolidado co on co.instrutor_id = i.id;

comment on view public.vw_instrutor_carga_anual is
  'Carga horária ministrada e fiscalizada por instrutor e ano, com a faixa normativa do '
  'regime de trabalho. Materializa a RN-INST-04: carga de instrutor é sempre CALCULADA, '
  'nunca digitada — por isso view e não coluna. Alimenta a coluna "Carga Horária" da LIQ '
  '(Anexo C da NORMHIDRO 30-23) e a Ficha de Docentes. Origem: RN-INST-04; RNF-NORM-03.';


-- =====================================================================================
-- vw_avaliacoes_situacao — avaliações com a situação da vista calculada
-- =====================================================================================
create or replace view public.vw_avaliacoes_situacao
with (security_invoker = true) as
select
  a.*,
  app.fn_status_vista(a.data_avaliacao, a.data_vista_prova, a.status) as situacao_vista,
  t.codigo  as turma_codigo,
  d.cod_disciplina,
  d.nome_disciplina
  -- `d.curso_id` REMOVIDO: `a.*` ja traz `avaliacoes.curso_id`, acrescentado em M3 como
  -- componente da chave composta de RN-MAT-01. A constraint `aval_disciplina_do_curso`
  -- garante que os dois valores sao iguais, entao nao ha informacao perdida — havia
  -- coluna duplicada.
from public.avaliacoes a
join public.turmas      t on t.id = a.turma_id
join public.disciplinas d on d.id = a.disciplina_id;

comment on view public.vw_avaliacoes_situacao is
  'Avaliações com `situacao_vista` calculada na leitura (RF-AVAL-03, regra dos 7 dias). '
  'Porta a FORMULA `Status_Vista` da v2.0 §4.4 sem gravar em disco um estado que envelhece '
  'sozinho.';


-- =====================================================================================
-- vw_disciplinas_execucao — datas REAIS de início/término (achado DISC-2)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : para cada disciplina em cada turma, a primeira e a última data efetivamente
--          lançadas, ao lado das datas PREVISTAS.
-- PARA QUÊ: o achado DISC-2 pediu "Data real de início" e "Data real de término". A v2.0
--          registrou que isso NÃO é coluna: é leitura derivada (mín./máx. de `Data` em
--          `Registro_Aulas_E_Atividades` filtrado por disciplina). Esta view é essa
--          leitura, agora com o período por TURMA vindo de `turma_disciplina` (LIQ-1).
-- =====================================================================================
-- ATENÇÃO — `ta_executados` soma AULAS **e** AVALIAÇÕES/VISTAS, porque a CHD é definida
-- normativamente como o somatório dos TA da disciplina INCLUINDO avaliação e vista de prova
-- (Glossário DEnsM §2, RN-EVT-03). Contar só `registros_aula` faria o DSA exibir um saldo
-- MAIOR do que o real — exatamente o subdimensionamento sistemático de carga horária que a
-- auditoria da v2.0 diagnosticou como causa raiz do achado A-5. O saldo é da disciplina, e a
-- disciplina consome TA por três caminhos distintos.
-- =====================================================================================
-- `vw_unidades_ensino_execucao`   [NOVA — decisao UE-1, rota (b)]
-- -------------------------------------------------------------------------------------
-- O QUE  : previsto (do curriculo) x executado (dos fatos) x saldo, POR UNIDADE DE ENSINO.
-- PARA QUE: e a ORIGEM DA AGREGACAO de `vw_disciplinas_execucao`. Existe porque o agregado
--          por disciplina precisa dela — nao por antecipacao de tela. Que um futuro diario
--          de classe venha a consumi-la e consequencia, nao justificativa: a distincao
--          importa por causa do Principio X (Paridade Antes de Novidade).
-- COMO   : VIEW, nunca coluna gravada. `GENERATED ... STORED` esta fora de questao porque
--          depende de agregacao entre tabelas, e o PostgreSQL exige imutabilidade.
-- =====================================================================================
create or replace view public.vw_unidades_ensino_execucao
with (security_invoker = true) as
select
  ue.id                        as unidade_ensino_id,
  ue.codigo                    as unidade_codigo,
  ue.disciplina_id,
  ue.curso_id,
  ue.numero_ue,
  ue.topico,
  ue.ch_prevista_tempos,
  r.turma_id,
  count(r.id)                  as lancamentos,
  coalesce(sum(r.tempos_consumidos), 0)                         as ta_executados,
  ue.ch_prevista_tempos - coalesce(sum(r.tempos_consumidos), 0) as ta_saldo,
  min(r.data)                  as data_real_inicio,
  max(r.data)                  as data_real_termino
from public.unidades_ensino ue
left join public.registros_aula r
       on r.unidade_ensino_id = ue.id and r.status = 'ativo'
where ue.status = 'ativo'
group by ue.id, ue.codigo, ue.disciplina_id, ue.curso_id, ue.numero_ue, ue.topico,
         ue.ch_prevista_tempos, r.turma_id;

comment on view public.vw_unidades_ensino_execucao is
  'Previsto x executado x saldo por Unidade de Ensino. E a origem da agregacao de '
  '`vw_disciplinas_execucao` — o grao de UE (decisao UE-1 rota (b)) chega aos consumidores '
  'ja agregado, e a assinatura publica daquela view nao muda. Nunca uma coluna gravada.';

create or replace view public.vw_disciplinas_execucao
with (security_invoker = true) as
with aulas as (
  -- [GRAO DE UE] a execucao letiva e agregada ATRAVES da unidade de ensino. E o ponto
  -- exato em que a rota (b) cumpre a promessa: a assinatura publica desta view nao muda,
  -- e quem a consome — CHD, DSA, Cronograma, motor preditivo — nao percebe o novo grao.
  select ue.disciplina_id, r.turma_id,
         min(r.data) as primeira_data,
         max(r.data) as ultima_data,
         sum(r.tempos_consumidos) as ta
    from public.registros_aula r
    join public.unidades_ensino ue on ue.id = r.unidade_ensino_id
   where r.status = 'ativo'
   group by 1, 2
),
provas as (
  select a.disciplina_id, a.turma_id,
         min(a.data_avaliacao) as primeira_data,
         greatest(max(a.data_avaliacao), max(a.data_vista_prova)) as ultima_data,
         sum(coalesce(a.tempos_consumidos, 0) + coalesce(a.tempos_consumidos_vista, 0)) as ta
    from public.avaliacoes a
   where a.status <> 'cancelada'
   group by 1, 2
)
select
  d.id                     as disciplina_id,
  d.codigo                 as disciplina_codigo,
  d.curso_id,
  d.cod_disciplina,
  d.nome_disciplina,
  d.carga_horaria_tempos,
  t.id                     as turma_id,
  t.codigo                 as turma_codigo,
  t.ano_letivo,
  -- Previsto: o período POR TURMA tem precedência sobre o padrão da grade (LIQ-1).
  coalesce(td.previsao_inicio,  d.previsao_inicio)   as previsao_inicio_efetiva,
  coalesce(td.previsao_termino, d.previsao_termino)  as previsao_termino_efetiva,
  td.origem_periodo,
  -- Executado: derivado dos fatos, nunca gravado (achado DISC-2). `least`/`greatest`
  -- ignoram NULL, então uma disciplina só com aula (ou só com prova) resolve corretamente.
  least   (au.primeira_data, pr.primeira_data)       as data_real_inicio,
  greatest(au.ultima_data,   pr.ultima_data)         as data_real_termino,
  coalesce(au.ta, 0)                                 as ta_aula_executados,
  coalesce(pr.ta, 0)                                 as ta_avaliacao_executados,
  coalesce(au.ta, 0) + coalesce(pr.ta, 0)            as ta_executados,
  d.carga_horaria_tempos - coalesce(au.ta, 0) - coalesce(pr.ta, 0) as ta_saldo
from public.disciplinas d
join public.turmas t                 on t.curso_id = d.curso_id
left join public.turma_disciplina td on td.disciplina_id = d.id and td.turma_id = t.id and td.status = 'ativo'
left join aulas  au                  on au.disciplina_id = d.id and au.turma_id = t.id
left join provas pr                  on pr.disciplina_id = d.id and pr.turma_id = t.id
where d.status = 'ativo';

comment on view public.vw_disciplinas_execucao is
  'Disciplina × turma com previsto (período por turma tem precedência sobre o padrão da '
  'grade — LIQ-1), executado e saldo de TA. Atende o achado DISC-2 sem criar coluna gravada. '
  '`ta_executados` inclui aula + avaliação + vista, por exigência normativa da CHD '
  '(RN-EVT-03); contar só aulas inflaria o saldo exibido no DSA.';


-- #####################################################################################
-- PARTE IV — GATILHOS FINAIS E ÍNDICE DE GATILHOS DO SCHEMA
-- #####################################################################################

-- =====================================================================================
-- Imutabilidade das tabelas append-only
-- -------------------------------------------------------------------------------------
-- O QUÊ  : liga `app.bloquear_reescrita()` a `migracao_log` e `arquivo_avaliacoes_v1`.
-- PARA QUÊ: "nenhuma linha de `migracao_log` já gravada é reescrita; corrige-se logando
--          novo evento" (BRIEF §9) deixa de ser regra que uma pessoa pode violar e passa
--          a ser exceção do banco.
-- COMO   : `FOR EACH STATEMENT` — o bloqueio não precisa inspecionar linha nenhuma, então
--          basta um disparo por comando; é mais barato e igualmente intransponível.
-- =====================================================================================

create trigger trg_migracao_log_imutavel
  before update or delete on public.migracao_log
  for each statement execute function app.bloquear_reescrita();

create trigger trg_arquivo_avaliacoes_imutavel
  before update or delete on public.arquivo_avaliacoes_v1
  for each statement execute function app.bloquear_reescrita();


-- =====================================================================================
-- ÍNDICE DE GATILHOS DO SCHEMA (documentação — nenhum comando abaixo)
-- -------------------------------------------------------------------------------------
--  Total do schema: 31 gatilhos (21 de auditoria + 8 de domínio + 2 de imutabilidade).
--
--  AUDITORIA (app.set_auditoria) — 21 gatilhos, um por tabela auditável:
--    cursos · configuracoes_horario · horarios_tempos_aula · curso_regime_historico ·
--    turmas · disciplinas · turma_disciplina · instrutores · instrutor_disciplina ·
--    responsaveis_curso · avaliacoes_planejadas · registros_aula · avaliacoes ·
--    atividades_nao_letivas · planejamento_anual · config_listas · config_parametros ·
--    perfil_permissao · feriados · janelas_curso · reservas_proens
--    (migracao_log e arquivo_avaliacoes_v1 ficam de fora: são append-only e carregam
--     carimbo próprio de execução).
--
--  DOMÍNIO (arquivo 01):
--    trg_disciplinas_unicidade        → unicidade genérica curso + cod_disciplina (RF-DADOS-06)
--    trg_disciplinas_instrutores_fk   → integridade referencial do uuid[] (achado (i))
--
--  DOMÍNIO (arquivo 02):
--    trg_planejamento_versao_salva    → no máximo 1 versão `salvo` por ano (RN-2027-07)
--    trg_planejamento_origem_linha    → marca `motor_editado` automaticamente
--
--  DOMÍNIO (arquivo 03):
--    trg_reg_aula_tipo_atividade      ┐
--    trg_reg_aula_metodologia         ├ validação contra config_listas
--    trg_avaliacoes_tipo              │ (app.validar_dominio_config_lista)
--    trg_avaliacoes_metodologia       ┘
--
--  IMUTABILIDADE (este arquivo):
--    trg_migracao_log_imutavel        → append-only (BRIEF §9)
--    trg_arquivo_avaliacoes_imutavel  → append-only
-- =====================================================================================


-- =====================================================================================
-- FIM DE M5. Proxima: M6 — acesso, RLS e matriz de permissoes.
-- =====================================================================================
