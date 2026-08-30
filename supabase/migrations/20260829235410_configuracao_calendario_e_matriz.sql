-- =====================================================================================
-- M4 — Configuracao, calendario, matriz de permissoes e o rastro da migracao
-- Epico 1 · specs/002-schema-rls-permissoes
-- FR-034 · FR-035 · FR-046 · FR-047 · FR-048 · FR-049 · FR-051 · FR-053
-- -------------------------------------------------------------------------------------
-- O QUE  : as oito tabelas que tiram do CODIGO aquilo que e DADO — listas de dominio,
--          parametros normativos, permissoes, feriados, janelas e reservas anuais — mais
--          as duas append-only que guardam a memoria da migracao.
-- PARA QUE: e o Principio VII aplicado ao banco. Um teto normativo, uma permissao ou um
--          feriado de 2028 nao podem exigir editar e reimplantar software: aqui viram
--          UPDATE e INSERT.
-- -------------------------------------------------------------------------------------
-- VEM ANTES DE M5 E M6 POR DEPENDENCIA TECNICA, nao por prioridade (tasks.md, aviso do
-- topo): as policies de M6 consultam `perfil_permissao`, e as funcoes de dominio de M5
-- leem `config_parametros`. Entregar a autorizacao sem a matriz seria entregar policies
-- que nao aplicam.
-- -------------------------------------------------------------------------------------
-- A SEMENTE NORMATIVA VIVE AQUI, NAO EM `seed.sql`, e a diferenca importa: `seed.sql` so
-- roda em `supabase db reset`, que e LOCAL — ele NAO e aplicado por `db push`. Um teto
-- normativo em `seed.sql` simplesmente nao chegaria a producao, e a falha seria silenciosa:
-- as consultas devolveriam vazio e o sistema calcularia com teto ausente (research.md §6).
--
-- A PROIBICAO QUE A PLATAFORMA CONVIDA A VIOLAR (FR-049 · RN-DEG-02): escrever
-- `check (tempos <= 8)` e trivial em PostgreSQL e MUDARIA A REGRA DE NEGOCIO. O 9o tempo
-- de aula e autorizacao normativa explicita nos curriculos de CAHO, C-Ap-HN e C-Ap-FR, e a
-- capacitacao didatica esta ausente em 83,6% dos 177 instrutores. Tetos sao ALERTA com
-- justificativa registrada, nunca recusa. Ha teste POSITIVO provando que o 9o TA e aceito.
--
-- Pre-requisito: M1, M2 e M3 aplicadas.
-- -------------------------------------------------------------------------------------
-- REVERSAO (FR-056): `drop table` na ordem inversa — arquivo_avaliacoes_v1, migracao_log,
--   reservas_proens, janelas_curso, feriados, perfil_permissao, config_parametros,
--   config_listas — e `alter table ... drop constraint` das FKs postergadas que este
--   arquivo acrescenta a M3. Segura enquanto nao houver carga.
-- =====================================================================================

-- =====================================================================================
-- TABELA 16 — `config_listas`  (v2.0: `Config_Listas`, reconstruída)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : todas as listas de domínio OPERACIONAL do sistema, em formato longo.
-- PARA QUÊ: é a contraparte dos ENUMs. O BRIEF §2 divide os domínios em dois: normativo
--          fechado (ENUM, muda por migration) e operacional administrável (esta tabela,
--          muda por INSERT). Metodologias, tipos de atividade e tipos de avaliação são
--          administráveis — o Encarregado acrescenta um valor sem chamar o desenvolvedor.
-- COMO   : sai do formato LARGO da v1.0 (4 colunas independentes, com buracos no meio)
--          para o formato LONGO. Permite acrescentar lista sem acrescentar coluna, e
--          desativar um valor sem apagá-lo do histórico — que é o ponto: um valor
--          desativado hoje ainda precisa ser legível nos 1.753 registros que o usam.
-- =====================================================================================

create table public.config_listas (
  id                uuid primary key default gen_random_uuid(),
  lista             text not null,
  valor             text not null,
  rotulo_exibicao   text not null,
  ordem             smallint not null default 0,
  ativo             boolean not null default true,
  observacao        text,
  origem_migracao_v1 text,
  criado_por        uuid,
  criado_em         timestamptz not null default now(),
  editado_por       uuid,
  editado_em        timestamptz,

  -- A chave natural (lista, valor) é UNIQUE, não PK — a PK é o uuid (BRIEF §2). É esta
  -- unicidade que torna a tabela referenciável pelo gatilho de validação de domínio.
  constraint config_listas_chave_natural unique (lista, valor),
  constraint config_listas_lista_snake   check (lista ~ '^[a-z][a-z0-9_]*$'),
  constraint config_listas_valor_nao_vazio check (btrim(valor) <> '')
);

comment on table  public.config_listas is
  'Domínios OPERACIONAIS administráveis, em formato longo (13 linhas largas da v1.0 '
  'despivotadas). Contraparte dos ENUMs: aqui um valor novo é INSERT, não migration. '
  'v2.0: `Config_Listas` §5.8. Origem: BRIEF v2.1 §2.';
comment on column public.config_listas.lista is
  'Nome da lista em snake_case (`metodologias`, `tipos_atividade`, `tipos_avaliacao`, '
  '`escala_antiguidade`). Substitui o que na v1.0 era uma COLUNA por lista.';
comment on column public.config_listas.valor is
  'Valor canônico gravado nas tabelas de fato. NUNCA alterar um valor já em uso — '
  'desative-o e crie outro, sob pena de reescrever o significado do histórico.';
comment on column public.config_listas.ativo is
  'Desativar esconde o valor de novos lançamentos SEM apagá-lo do histórico. É a exclusão '
  'lógica (C-05) aplicada ao próprio domínio.';
comment on column public.config_listas.ordem is
  'Ordem de exibição no seletor. Em `escala_antiguidade` carrega SEMÂNTICA: é o peso da '
  'RN-ANT-02 (peso menor = mais antigo).';

alter table public.config_listas enable row level security;

create trigger trg_config_listas_auditoria
  before insert or update on public.config_listas
  for each row execute function app.set_auditoria();

create index idx_config_listas_lista on public.config_listas (lista, ordem) where ativo;


-- =====================================================================================
-- TABELA 17 — `config_parametros`  (v2.0: `Config_Parametros`)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : os limites normativos do sistema como DADO, com a norma de origem ao lado.
-- PARA QUÊ: RNF-NORM-08, literalmente: tetos (AEC 10%, TAD 5%, TR 10%), faixas de carga
--          horária docente por regime e limites de TA por dia NÃO podem ser constante em
--          código. Uma revisão da DGPM/DEnsM deve ser um UPDATE, não um deploy.
-- COMO   : par chave/valor tipado, versionado por `ano_vigencia` — porque um teto pode
--          mudar de um ano letivo para o outro sem reinterpretar o ano anterior (C-08
--          aplicado a parâmetro).
-- -------------------------------------------------------------------------------------
-- `valor` é TEXT com `tipo` ao lado, e isso é deliberado: a tabela precisa guardar
-- percentuais, inteiros e faixas com a mesma estrutura. A conversão é responsabilidade de
-- quem lê (`app.fn_parametro_numerico()`, arquivo 04), que valida o tipo antes de
-- converter — em vez de espalhar `NUMERIC` e `INTEGER` em colunas mutuamente nulas.
-- =====================================================================================

create table public.config_parametros (
  id                    uuid primary key default gen_random_uuid(),
  chave                 text not null,
  valor                 text not null,
  tipo                  text not null default 'numero',
  unidade               text,
  ano_vigencia          smallint,
  descricao             text,
  fundamento_normativo  text,
  editavel_por          public.perfil_usuario,
  status                public.status_registro not null default 'ativo',
  origem_migracao_v1    text,
  criado_por            uuid,
  criado_em             timestamptz not null default now(),
  editado_por           uuid,
  editado_em            timestamptz,

  constraint config_param_chave_snake check (chave ~ '^[a-z][a-z0-9_.]*$'),
  constraint config_param_tipo_valido check (tipo in ('numero', 'percentual', 'inteiro', 'texto', 'booleano')),
  constraint config_param_ano_valido  check (ano_vigencia is null or ano_vigencia between 2020 and 2099)
);

comment on table  public.config_parametros is
  'Limites normativos como DADO, com a norma de origem ao lado. Tira do código os tetos '
  'AEC 10% / TAD 5% / TR 10%, as faixas de CH docente por regime e os limites de TA por '
  'dia. v2.0: `Config_Parametros` §5.9. Origem: RNF-NORM-08; BRIEF v2.1 §2.';
comment on column public.config_parametros.ano_vigencia is
  'NULL = parâmetro perene. Preenchido quando o valor muda de um ano letivo para outro — '
  'a resolução usa o maior `ano_vigencia <= ano do fato`, sem reinterpretar o passado (C-08).';
comment on column public.config_parametros.fundamento_normativo is
  'Norma que sustenta o valor (DGPM-101/103, DEnsM-1002/1004/2001/2003, Glossário DEnsM). '
  'Sem isto, um número no banco vira folclore. Origem: RNF-NORM-07 (rastreabilidade normativa).';
comment on column public.config_parametros.editavel_por is
  'Perfil mínimo autorizado a alterar o parâmetro. Consultado pelas policies do arquivo 05.';

alter table public.config_parametros enable row level security;

create trigger trg_config_parametros_auditoria
  before insert or update on public.config_parametros
  for each row execute function app.set_auditoria();

-- Uma chave, um valor por ano de vigência. `coalesce` no índice porque NULL não colide
-- com NULL em UNIQUE — e "perene" precisa ser único também.
create unique index uq_config_param_chave_ano
  on public.config_parametros (chave, coalesce(ano_vigencia, 0))
  where status = 'ativo';

create index idx_config_param_chave on public.config_parametros (chave) where status = 'ativo';


-- =====================================================================================
-- TABELA 18 — `perfil_permissao`  (BRIEF §3 — matriz de permissões como DADO)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : a matriz (perfil × recurso × ação → permitido) que as policies RLS consultam.
-- PARA QUÊ: **[NOVO — v2.1]** a RN-RBAC-02 estabelece que a permissão de escrita é
--          definida POR ÁREA DE DADOS, não globalmente por perfil. Escrever isso como uma
--          policy por perfil daria ~9 perfis × 22 tabelas × 4 ações de policies — e
--          trocar uma permissão viraria migration. Como dado, vira UPDATE.
-- COMO   : as policies do arquivo 05 chamam `app.pode(recurso, acao)`, que lê esta tabela.
--          É o Princípio VII (parâmetro é dado, não constante) aplicado à autorização.
-- -------------------------------------------------------------------------------------
-- ATENÇÃO: esta tabela é a fronteira de segurança do sistema. Quem pode escrever NELA
-- pode se autoconceder qualquer permissão. A policy que a protege (arquivo 05) deve
-- restringi-la ao perfil `admin` — e o teste negativo disso é obrigatório (BRIEF §7.4).
-- =====================================================================================

create table public.perfil_permissao (
  id            uuid primary key default gen_random_uuid(),
  perfil        public.perfil_usuario not null,
  recurso       text not null,
  acao          text not null,
  permitido     boolean not null default false,
  observacao    text,
  criado_por    uuid,
  criado_em     timestamptz not null default now(),
  editado_por   uuid,
  editado_em    timestamptz,

  constraint perfil_permissao_unica  unique (perfil, recurso, acao),
  -- `recurso` é o nome da tabela ou da área de dados, em snake_case — o mesmo vocabulário
  -- do schema, para que não exista um segundo dicionário a manter sincronizado.
  constraint perfil_permissao_recurso_snake check (recurso ~ '^[a-z][a-z0-9_]*$'),
  constraint perfil_permissao_acao_valida
    check (acao in ('ler', 'criar', 'editar', 'desativar'))
);

comment on table  public.perfil_permissao is
  '[NOVO — v2.1] Matriz de permissões como DADO (perfil × recurso × ação → permitido). As '
  'policies RLS a consultam via `app.pode()`; trocar uma permissão é UPDATE, não migration. '
  'Origem: BRIEF v2.1 §3; RN-RBAC-02.';
comment on column public.perfil_permissao.acao is
  '`desativar` no lugar de `excluir`: nada é apagado neste sistema (C-05). O vocabulário da '
  'matriz precisa refletir o que o sistema realmente faz.';
comment on column public.perfil_permissao.recurso is
  'Nome da tabela ou da área de dados, em snake_case — mesmo vocabulário do schema, para '
  'não criar um segundo dicionário a manter sincronizado.';

alter table public.perfil_permissao enable row level security;

create trigger trg_perfil_permissao_auditoria
  before insert or update on public.perfil_permissao
  for each row execute function app.set_auditoria();

create index idx_perfil_permissao_lookup on public.perfil_permissao (perfil, recurso, acao)
  where permitido;


-- =====================================================================================
-- TABELA 19 — `feriados`  (v2.0: `Calendario_Feriados` + `Eventos_Globais`)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : datas de impacto institucional por ano (26 linhas de `Eventos_Globais` absorvidas).
-- PARA QUÊ: aposenta a constante `FERIADOS_2027` do `Código.gs`. Era preciso editar e
--          reimplantar código-fonte todo ano só para o motor preditivo enxergar o
--          calendário correto — o acoplamento de maior custo de manutenção do sistema.
-- COMO   : `Eventos_Globais` é absorvida como CASO PARTICULAR de feriado, com `ano`
--          derivado da data e `Impacto` mapeado (`Dia Inteiro` → `dia_inteiro`,
--          `Nenhum (informativo)` → `informativo`).
-- =====================================================================================

create table public.feriados (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique,
  ano                 smallint not null,
  data                date not null,
  descricao           text not null,
  impacto             public.impacto_feriado not null default 'dia_inteiro',
  abrangencia         text,
  origem_proens       text,
  status              public.status_registro not null default 'ativo',
  origem_migracao_v1  text,
  criado_por          uuid,
  criado_em           timestamptz not null default now(),
  editado_por         uuid,
  editado_em          timestamptz,

  constraint feriados_ano_valido check (ano between 2020 and 2099),
  -- A redundância `ano` × `data` é deliberada (consulta por ano é o padrão da carga
  -- anual); o CHECK garante que ela seja sempre verdadeira.
  constraint feriados_ano_bate_data check (ano = extract(year from data)::smallint)
);

comment on table  public.feriados is
  'Datas de impacto institucional por ano. Absorve `Eventos_Globais` (26 linhas) como caso '
  'particular. Aposenta a constante `FERIADOS_2027` do `Código.gs`. '
  'v2.0: `Calendario_Feriados` §5.10. Origem: RF-DADOS-04; RNF-MAN-04; achado (e).';
comment on column public.feriados.impacto is
  '`dia_inteiro` zera a capacidade letiva do dia no motor preditivo; `parcial` reduz; '
  '`informativo` não altera cálculo algum.';
comment on column public.feriados.origem_proens is
  'Referência ao PROENS do ano que publicou a data. Vazio nas 26 linhas migradas de '
  '`Eventos_Globais` — a ser preenchido na primeira carga anual.';

alter table public.feriados enable row level security;

create trigger trg_feriados_auditoria
  before insert or update on public.feriados
  for each row execute function app.set_auditoria();

create index idx_feriados_ano  on public.feriados (ano) where status = 'ativo';
create index idx_feriados_data on public.feriados (data) where status = 'ativo';


-- =====================================================================================
-- TABELA 20 — `janelas_curso`  (v2.0: `Calendario_Janelas_Curso`)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : as janelas oficiais de início/término por curso e ano, publicadas pelo PROENS.
-- PARA QUÊ: aposenta a constante `SEMENTES_2027` do `Código.gs`. É a semente do motor
--          preditivo: sem ela, o motor não sabe quando cada curso pode começar.
-- COMO   : `turma_prevista` é TEXTO (`T1`, `T2`) e não FK — a janela é publicada ANTES de
--          a turma existir no sistema. Amarrá-la a `turmas` inverteria a ordem real dos
--          fatos: primeiro o PROENS publica, depois a turma é criada.
-- =====================================================================================

create table public.janelas_curso (
  id                       uuid primary key default gen_random_uuid(),
  codigo                   text not null unique,
  ano                      smallint not null,
  curso_id                 uuid not null references public.cursos(id) on delete restrict,
  turma_prevista           text,
  data_inicio_prevista     date,
  data_termino_prevista    date,
  origem_proens            text,
  status                   public.status_registro not null default 'ativo',
  origem_migracao_v1       text,
  criado_por               uuid,
  criado_em                timestamptz not null default now(),
  editado_por              uuid,
  editado_em               timestamptz,

  constraint janelas_ano_valido      check (ano between 2020 and 2099),
  constraint janelas_periodo_coerente
    check (data_termino_prevista is null or data_inicio_prevista is null
           or data_termino_prevista >= data_inicio_prevista)
);

comment on table  public.janelas_curso is
  'Janelas oficiais de início/término por curso e ano, publicadas pelo PROENS. Aposenta a '
  'constante `SEMENTES_2027` do `Código.gs`. v2.0: `Calendario_Janelas_Curso` §5.10. '
  'Origem: RF-DADOS-04; RNF-MAN-04; achado (e).';
comment on column public.janelas_curso.turma_prevista is
  'Rótulo previsto (`T1`, `T2`). TEXTO e não FK: a janela é publicada ANTES de a turma '
  'existir. Amarrá-la a `turmas` inverteria a ordem real dos fatos.';

alter table public.janelas_curso enable row level security;

create trigger trg_janelas_curso_auditoria
  before insert or update on public.janelas_curso
  for each row execute function app.set_auditoria();

create unique index uq_janelas_curso_ano_turma
  on public.janelas_curso (ano, curso_id, coalesce(turma_prevista, ''))
  where status = 'ativo';
create index idx_janelas_ano_curso on public.janelas_curso (ano, curso_id);


-- =====================================================================================
-- TABELA 21 — `reservas_proens`  (v2.0: `Calendario_Reservas`)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : reservas anuais de TAD e TR concedidas a cada curso pelo PROENS.
-- PARA QUÊ: aposenta a constante `RESERVAS_PROENS` do `Código.gs`. É o "previsto" contra o
--          qual `vw_conformidade_tetos` compara o TAD/TR efetivamente lançado.
-- COMO   : `tipo_reserva` é ENUM de dois valores (só TAD e TR são reservados a priori;
--          AEC e Estudo Individual não têm reserva prévia).
-- =====================================================================================

create table public.reservas_proens (
  id                   uuid primary key default gen_random_uuid(),
  codigo               text not null unique,
  ano                  smallint not null,
  curso_id             uuid not null references public.cursos(id) on delete restrict,
  tipo_reserva         public.tipo_reserva not null,
  tempos_reservados    integer not null,
  criterio             text,
  origem_proens        text,
  status               public.status_registro not null default 'ativo',
  origem_migracao_v1   text,
  criado_por           uuid,
  criado_em            timestamptz not null default now(),
  editado_por          uuid,
  editado_em           timestamptz,

  constraint reservas_ano_valido      check (ano between 2020 and 2099),
  constraint reservas_tempos_validos  check (tempos_reservados >= 0)
);

comment on table  public.reservas_proens is
  'Reservas anuais de TAD e TR por curso, concedidas pelo PROENS. Aposenta a constante '
  '`RESERVAS_PROENS` do `Código.gs`. v2.0: `Calendario_Reservas` §5.10. '
  'Origem: RF-DADOS-04; RNF-MAN-04; achado (e).';
comment on column public.reservas_proens.tempos_reservados is
  'TA reservados no ano. É o "previsto" contra o qual `vw_conformidade_tetos` compara o '
  'TAD/TR efetivamente lançado em `atividades_nao_letivas`.';

alter table public.reservas_proens enable row level security;

create trigger trg_reservas_proens_auditoria
  before insert or update on public.reservas_proens
  for each row execute function app.set_auditoria();

create unique index uq_reservas_ano_curso_tipo
  on public.reservas_proens (ano, curso_id, tipo_reserva)
  where status = 'ativo';
create index idx_reservas_ano_curso on public.reservas_proens (ano, curso_id);


-- =====================================================================================
-- TABELA 22 — `migracao_log`  (v2.0: `_Migracao_Log`)  ·  APPEND-ONLY
-- -------------------------------------------------------------------------------------
-- O QUÊ  : o rastro linha a linha de cada transformação da migração.
-- PARA QUÊ: é a evidência auditável de que 100% do histórico foi transportado (RF-DADOS-05,
--          RNF-CONF-01). Sem ele, "nada se perdeu" seria uma afirmação, não um fato
--          verificável.
-- COMO   : **[NOVO — v2.1]** o gatilho `app.bloquear_reescrita()` (arquivo 04) recusa
--          UPDATE e DELETE. No Sheets, "nenhuma linha já gravada é reescrita" era uma
--          REGRA que qualquer pessoa podia violar abrindo a planilha. Aqui é uma exceção
--          do banco. Corrige-se logando NOVO evento — é a doutrina do BRIEF §9.
-- =====================================================================================

create table public.migracao_log (
  id               uuid primary key default gen_random_uuid(),
  codigo           text not null unique,
  executado_em     timestamptz not null default now(),
  executado_por    uuid,
  origem_tabela    text not null,
  origem_chave     text,
  destino_tabela   text,
  destino_chave    text,
  acao             public.acao_migracao not null,
  regra_aplicada   text,
  valor_antes      text,
  valor_depois     text,
  observacao       text
);

comment on table  public.migracao_log is
  'APPEND-ONLY. Rastro linha a linha de cada transformação da migração — evidência '
  'auditável de que 100% do histórico foi transportado. UPDATE e DELETE são recusados pelo '
  'gatilho `trg_migracao_log_imutavel`. v2.0: `_Migracao_Log` §5.11. '
  'Origem: BRIEF v2.1 §9; RF-DADOS-05; RNF-CONF-01.';
comment on column public.migracao_log.codigo is
  'Identificador sequencial do evento (`LOG-000508`…). A continuidade da numeração da v2.0 '
  'é preservada pelo ETL: o log da v2.1 é continuação do log da v2.0, não um novo começo.';
comment on column public.migracao_log.acao is
  '`corrigido` marca valor ATRIBUÍDO pela migração, não observado na origem — a distinção '
  'que separa dado medido de dado inferido.';
comment on column public.migracao_log.valor_antes is
  'Valor bruto antes da transformação. Junto com `valor_depois`, é o que torna toda '
  'reclassificação reversível (C-07).';

alter table public.migracao_log enable row level security;

create index idx_migracao_log_origem   on public.migracao_log (origem_tabela, origem_chave);
create index idx_migracao_log_destino  on public.migracao_log (destino_tabela, destino_chave);
create index idx_migracao_log_executado on public.migracao_log (executado_em desc);


-- =====================================================================================
-- TABELA 23 — `arquivo_avaliacoes_v1`  (v2.0: `_Arquivo_Avaliacoes_v1`)  ·  APPEND-ONLY
-- -------------------------------------------------------------------------------------
-- O QUÊ  : cópia integral das 186 linhas de execução de avaliação legadas, em quarentena.
-- PARA QUÊ: a fusão da Missão 3 retirou essas linhas da tabela de fatos ativa para não
--          deixar contagem dupla de TA. Nenhuma foi APAGADA: todas vivem aqui, com o
--          `ID_Avaliacao` de destino. Satisfaz RF-DADOS-05 sem corromper a soma de TA.
-- COMO   : quarentena consultável, fora da tabela de fatos. Também append-only — um
--          arquivo que se pode reescrever não é arquivo.
-- =====================================================================================

create table public.arquivo_avaliacoes_v1 (
  id                    uuid primary key default gen_random_uuid(),
  codigo                text not null unique,

  -- Cópia dos campos da linha original de `Registro_Aulas_E_Atividades` ---------------
  data                  date,
  turma_codigo_v1       text,
  disciplina_codigo_v1  text,
  instrutor_codigo_v1   text,
  tipo_atividade_v1     text,
  metodologia_v1        text,
  tempos_consumidos_v1  smallint,
  ta_inicial_v1         smallint,
  conteudo_resumo_v1    text,
  local_v1              text,
  observacoes_v1        text,
  registrado_por_v1     text,
  registrado_em_v1      text,

  -- Ponte para o destino da fusão -----------------------------------------------------
  avaliacao_destino_id  uuid references public.avaliacoes(id) on delete restrict,
  avaliacao_destino_codigo_v1 text,

  arquivado_em          timestamptz not null default now(),
  arquivado_por         uuid,
  observacao_migracao   text
);

comment on table  public.arquivo_avaliacoes_v1 is
  'APPEND-ONLY. Quarentena consultável das 186 linhas de execução de avaliação legadas, '
  'retiradas da tabela de fatos ativa pela fusão da Missão 3. Nenhuma foi apagada. '
  'v2.0: `_Arquivo_Avaliacoes_v1` §5.11. Origem: RF-DADOS-05; RN-AVAL-02.';
comment on column public.arquivo_avaliacoes_v1.avaliacao_destino_id is
  'Linha de `avaliacoes` que absorveu esta execução. NULL apenas se a conciliação não '
  'encontrou destino — caso que o `migracao_log` registra explicitamente.';
comment on column public.arquivo_avaliacoes_v1.registrado_em_v1 is
  'TEXTO, deliberadamente: guarda o carimbo BRUTO da v1.0, inclusive quando ele estiver '
  'malformado. Converter aqui destruiria a evidência que a quarentena existe para guardar.';

alter table public.arquivo_avaliacoes_v1 enable row level security;

create index idx_arquivo_aval_destino on public.arquivo_avaliacoes_v1 (avaliacao_destino_id);


-- =====================================================================================
-- BLOCO FINAL A — VALIDAÇÃO DE DOMÍNIO CONTRA `config_listas` (FKs postergadas)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : gatilho genérico que verifica se um valor pertence a uma lista administrável.
-- PARA QUÊ: as colunas `registros_aula.tipo_atividade`, `registros_aula.metodologia` e
--          `avaliacoes.tipo_avaliacao` são domínio administrável e precisam ser validadas
--          contra `config_listas`. Não puderam ser declaradas nos arquivos 01/02 porque
--          `config_listas` só nasce aqui — daí a validação vir NO FIM deste arquivo.
-- COMO   : POR QUE GATILHO E NÃO FK — a chave natural de `config_listas` é composta
--          (`lista`, `valor`). Uma FK exigiria replicar o nome da lista como coluna
--          constante em cada tabela filha (três colunas-fantasma só para satisfazer a
--          sintaxe). O gatilho parametrizado por `TG_ARGV` faz o mesmo trabalho, não
--          polui o schema e ainda devolve mensagem em português — que é o que a tela
--          precisa mostrar (RF-DADOS-06 pede alerta, não erro cru de constraint).
-- -------------------------------------------------------------------------------------
-- DEGRADAÇÃO SEGURA (RN-DEG-01): um valor NULO é sempre aceito, e a validação só recusa
-- quando o valor existe E não está na lista. Isso permite que o ETL carregue histórico com
-- lacunas sem travar, exatamente como a v2.0 fazia.
-- =====================================================================================

create or replace function app.validar_dominio_config_lista()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_coluna  text := tg_argv[0];       -- nome da coluna a validar
  v_lista   text := tg_argv[1];       -- nome da lista em config_listas
  v_valor   text;
begin
  v_valor := to_jsonb(new) ->> v_coluna;

  -- Ausência é sempre válida: o domínio restringe o que EXISTE, não obriga a existir.
  if v_valor is null or btrim(v_valor) = '' then
    return new;
  end if;

  if not exists (
    select 1 from public.config_listas c
     where c.lista = v_lista and c.valor = v_valor and c.ativo
  ) then
    raise exception
      'O valor "%" não pertence à lista "%" (coluna %.%).',
      v_valor, v_lista, tg_table_name, v_coluna
      using errcode = '23514',
            hint = 'Cadastre o valor em config_listas antes de usá-lo, ou escolha um valor ativo da lista. Origem: BRIEF v2.1 §2 (domínio operacional administrável).';
  end if;

  return new;
end;
$$;

comment on function app.validar_dominio_config_lista() is
  'Gatilho genérico de validação de domínio contra `config_listas`, parametrizado por '
  'TG_ARGV (coluna, lista). Substitui uma FK composta que exigiria colunas-fantasma, e '
  'devolve mensagem de domínio em português. Valor NULO é sempre aceito (RN-DEG-01).';

create trigger trg_reg_aula_tipo_atividade
  before insert or update of tipo_atividade on public.registros_aula
  for each row execute function app.validar_dominio_config_lista('tipo_atividade', 'tipos_atividade');

create trigger trg_reg_aula_metodologia
  before insert or update of metodologia on public.registros_aula
  for each row execute function app.validar_dominio_config_lista('metodologia', 'metodologias');

create trigger trg_avaliacoes_tipo
  before insert or update of tipo_avaliacao on public.avaliacoes
  for each row execute function app.validar_dominio_config_lista('tipo_avaliacao', 'tipos_avaliacao');

create trigger trg_avaliacoes_metodologia
  before insert or update of metodologia on public.avaliacoes
  for each row execute function app.validar_dominio_config_lista('metodologia', 'metodologias');


-- =====================================================================================
-- BLOCO FINAL B — SEED NORMATIVO MÍNIMO
-- -------------------------------------------------------------------------------------
-- O QUÊ  : carga inicial de `config_parametros` (tetos e faixas) e da escala de
--          antiguidade em `config_listas`.
-- PARA QUÊ: sem estes valores, `vw_conformidade_tetos` e `app.fn_antiguidade_ordem()`
--          retornam neutro — comportamento correto por RN-DEG-01, mas inútil. Estes
--          números NÃO são configuração de gosto: são norma, e a norma é pré-condição do
--          sistema funcionar.
-- COMO   : `ON CONFLICT DO NOTHING` torna o bloco idempotente e seguro em reaplicação.
--          Pode ser movido para `supabase/seed.sql` se a equipe preferir separar DDL de
--          dado — mas note que estes valores são estruturais, não dado de teste.
-- =====================================================================================

-- Tetos normativos de composição da carga horária (RNF-NORM-02, BRIEF §9) ------------
insert into public.config_parametros (chave, valor, tipo, unidade, descricao, fundamento_normativo, editavel_por)
values
  ('teto.aec_percentual_chr', '10', 'percentual', '%',
   'Atividades Extraclasse (AEC) ≤ 10% do somatório das cargas horárias das disciplinas.',
   'Glossário DEnsM §2; RNF-NORM-02', 'encarregado_administracao_academica'),
  ('teto.tad_percentual_chr', '5', 'percentual', '%',
   'Tempo para a Administração (TAD) ≤ 5% da Carga Horária Real (CHR).',
   'Glossário DEnsM §2; RNF-NORM-02', 'encarregado_administracao_academica'),
  ('teto.tr_percentual_chr', '10', 'percentual', '%',
   'Tempo Reserva (TR) ≤ 10% da Carga Horária Real (CHR).',
   'Glossário DEnsM §2; RNF-NORM-02', 'encarregado_administracao_academica')
on conflict do nothing;

-- Faixas de carga horária semanal docente por regime (RNF-NORM-03, BRIEF §9) ---------
-- Corrige o defeito histórico em que o NÚMERO do regime (20, 40) virava teto direto.
insert into public.config_parametros (chave, valor, tipo, unidade, descricao, fundamento_normativo, editavel_por)
values
  ('ch_docente.20h.min',                 '8',  'inteiro', 'h/semana', 'Piso semanal do regime 20h.',                   'RNF-NORM-03; RN-2027-06', 'encarregado_administracao_academica'),
  ('ch_docente.20h.max',                 '12', 'inteiro', 'h/semana', 'Teto semanal do regime 20h.',                   'RNF-NORM-03; RN-2027-06', 'encarregado_administracao_academica'),
  ('ch_docente.40h.min',                 '16', 'inteiro', 'h/semana', 'Piso semanal do regime 40h.',                   'RNF-NORM-03; RN-2027-06', 'encarregado_administracao_academica'),
  ('ch_docente.40h.max',                 '24', 'inteiro', 'h/semana', 'Teto semanal do regime 40h.',                   'RNF-NORM-03; RN-2027-06', 'encarregado_administracao_academica'),
  ('ch_docente.dedicacao_exclusiva.min', '16', 'inteiro', 'h/semana', 'Piso semanal do regime de Dedicação Exclusiva.', 'RNF-NORM-03; RN-2027-06', 'encarregado_administracao_academica'),
  ('ch_docente.dedicacao_exclusiva.max', '30', 'inteiro', 'h/semana', 'Teto semanal do regime de Dedicação Exclusiva.', 'RNF-NORM-03; RN-2027-06', 'encarregado_administracao_academica')
on conflict do nothing;

-- Tetos semanais de alocação por disciplina (RN-DIST-03) ------------------------------
-- Consumidos pelo motor em `lib/dominio/`; ficam aqui porque são limite, não algoritmo.
insert into public.config_parametros (chave, valor, tipo, unidade, descricao, fundamento_normativo, editavel_por)
values
  ('alocacao.teto_tfm_rigido',      '6',  'inteiro', 'TA/semana',
   'Teto RÍGIDO de TA semanais para Treinamento Físico Militar (TFM). Nunca ultrapassável.',
   'RN-DIST-03 (a)', 'encarregado_administracao_academica'),
  ('alocacao.teto_geral_recomendado', '25', 'inteiro', 'TA/semana',
   'Teto RECOMENDADO de TA semanais por disciplina. Pode ser ultrapassado quando a janela '
   'for curta demais; o motor tenta diluir antes.',
   'RN-DIST-03 (c)', 'encarregado_administracao_academica'),
  ('alocacao.limite_ta_dia_padrao', '8',  'inteiro', 'TA/dia',
   'Limite diário padrão de TA. O 9º TA é exceção autorizada por currículo e gera ALERTA '
   'INFORMATIVO, nunca bloqueio.',
   'RNF-NORM-01; RN-DEG-02', 'encarregado_administracao_academica'),
  ('avaliacao.ta_padrao_bloco_prova', '3', 'inteiro', 'TA',
   'Bloco padrão de TA de uma aplicação de prova. Usado como valor INFERIDO na migração '
   'das linhas `sem_execucao`.',
   'RN-2027-04', 'encarregado_administracao_academica'),
  ('avaliacao.prazo_vista_dias', '7', 'inteiro', 'dias corridos',
   'Prazo máximo entre aplicação e vista de prova. Ultrapassá-lo marca a vista como atrasada.',
   'RF-AVAL-03', 'encarregado_administracao_academica')
on conflict do nothing;

-- Escala de antiguidade por posto/graduação (RN-ANT-02) --------------------------------
-- `ordem` É o peso: menor = mais antigo. Fica em `config_listas`, e não em código, para
-- que a implementação SQL (`app.fn_peso_posto`) e a de TypeScript (`lib/dominio/`) leiam
-- a MESMA fonte — evitando duas escalas divergentes, que é o risco real da RN-ANT-02.
insert into public.config_listas (lista, valor, rotulo_exibicao, ordem, observacao)
values
  ('escala_antiguidade', 'CMG',   'Capitão de Mar e Guerra',    1,  'RN-ANT-02'),
  ('escala_antiguidade', 'CF',    'Capitão de Fragata',         2,  'RN-ANT-02'),
  ('escala_antiguidade', 'CC',    'Capitão de Corveta',         3,  'RN-ANT-02'),
  ('escala_antiguidade', 'CT',    'Capitão-Tenente',            4,  'RN-ANT-02'),
  ('escala_antiguidade', '1ºTen', 'Primeiro-Tenente',           5,  'RN-ANT-02'),
  ('escala_antiguidade', '2ºTen', 'Segundo-Tenente',            6,  'RN-ANT-02'),
  ('escala_antiguidade', 'SO',    'Suboficial',                 7,  'RN-ANT-02'),
  ('escala_antiguidade', '1ºSG',  'Primeiro-Sargento',          8,  'RN-ANT-02'),
  ('escala_antiguidade', '2ºSG',  'Segundo-Sargento',           9,  'RN-ANT-02'),
  ('escala_antiguidade', '3ºSG',  'Terceiro-Sargento',          10, 'RN-ANT-02'),
  ('escala_antiguidade', 'CB',    'Cabo',                       11, 'RN-ANT-02'),
  ('escala_antiguidade', 'MN',    'Marinheiro',                 12, 'RN-ANT-02'),
  ('escala_antiguidade', 'SC',    'Servidor Civil',             13, 'Achado residual v2.0 §6.8 — categoria civil, peso 13'),
  ('escala_antiguidade', 'SCNS',  'Servidor Civil não Sigiloso',13, 'Achado residual v2.0 §6.8 — categoria civil, peso 13')
on conflict do nothing;


-- =====================================================================================
-- FIM DE M4. Proxima: M5 — derivados e funcoes de dominio.
-- =====================================================================================
