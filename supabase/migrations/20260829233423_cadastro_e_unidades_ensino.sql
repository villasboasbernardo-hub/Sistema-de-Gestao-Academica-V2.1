-- =====================================================================================
-- M2 — Cadastro e unidades de ensino
-- Epico 1 · specs/002-schema-rls-permissoes
-- FR-001 a FR-011 · FR-015 · FR-017 · FR-018 · FR-021 · FR-025 · FR-026 · FR-028 ·
-- FR-029 · FR-061
-- -------------------------------------------------------------------------------------
-- O QUE  : as 12 entidades que descrevem o "dever-ser" do ensino — o que existe, quem
--          ministra, sob qual regime, em que janela.
-- PARA QUE: sao o alicerce referencial de TODOS os fatos de M3. Uma FK quebrada aqui
--          orfana historico; por isso toda FK declara `ON DELETE` explicito e, na pratica,
--          nenhuma jamais dispara — nada e apagado neste sistema (FR-007).
-- -------------------------------------------------------------------------------------
-- ORIGEM E REVISAO. Deriva de `docs/sql-referencia/01_tabelas_cadastro.sql` (11 tabelas),
-- que foi aplicado e validado contra um PostgreSQL 16 real. Tres revisoes:
--
--   1. `unidades_ensino` ACRESCENTADA — a 12a tabela. Nao existe no referencia, escrito
--      antes da decisao UE-1. O BRIEF §2.1 vence; a divergencia e do script (BRIEF §11).
--   2. `turmas` e `disciplinas` ganham a chave auxiliar `unique (id, curso_id)`, alvo das
--      chaves estrangeiras compostas que tornam RN-MAT-01 declarativa (FR-061).
--   3. Nenhuma verificacao de contiguidade de `numero_ue` — lacuna e dado valido (FR-025).
--
-- Pre-requisito: M1 aplicada.
-- -------------------------------------------------------------------------------------
-- REVERSAO (FR-056): `drop table` na ordem inversa da criacao —
--   turma_disciplina_instrutor, responsaveis_curso, instrutor_disciplina, instrutores,
--   turma_disciplina, unidades_ensino, disciplinas, turmas, curso_regime_historico,
--   horarios_tempos_aula, configuracoes_horario, cursos.
--   Segura enquanto nao houver carga, que e o estado desta fatia.
-- =====================================================================================

-- =====================================================================================
-- TABELA 1 — `cursos`  (v2.0: `Cad_Cursos`)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : catálogo de cursos e estágios do CIAARA (24 linhas na base migrada).
-- PARA QUÊ: é a raiz de quase todo o grafo — turmas, disciplinas, janelas, reservas e
--          responsáveis pendem daqui.
-- COMO   : **[MIGRAÇÃO v2.1]** as SETE colunas de regime que a v2.0 manteve fisicamente
--          como FORMULA de exibição somente-leitura (`Regime_Padrao_Tempos`, `TA_Padrao`,
--          `Intervalo_Padrao`, `Config_Horario_Padrao`, `Regime_Excecao`,
--          `Config_Horario_Excecao`, `Limite_Diario_EAD`) NÃO existem aqui. Uma fórmula
--          de exibição em PostgreSQL é uma VIEW: elas reaparecem em
--          `vw_cursos_regime_vigente` (04_views_e_funcoes.sql), resolvidas a partir de
--          `curso_regime_historico`. Zero segunda fonte de verdade (BRIEF §2).
-- =====================================================================================

create table public.cursos (
  -- Identidade ---------------------------------------------------------------------
  id                      uuid primary key default gen_random_uuid(),
  codigo                  text not null unique,

  -- Atributos de catálogo ----------------------------------------------------------
  nome_curso              text not null,
  nome_normalizado        text generated always as (app.normalizar_texto(nome_curso)) stored,
  classificacao           public.escopo_curso not null,
  modalidade              public.modalidade_ensino not null default 'presencial',
  proposito               text,

  -- Parâmetros de oferta -----------------------------------------------------------
  limite_turmas_ano       smallint     not null default 1,
  duracao_semanas         numeric(6,2),
  duracao_dias            integer,

  -- Planejamento -------------------------------------------------------------------
  prioridade_alocacao     public.criterio_prioridade_alocacao
                            not null default 'carga_restante_por_dia_util',

  -- Exclusão lógica universal (C-05 / BRIEF §2) -------------------------------------
  status                  public.status_registro not null default 'ativo',

  -- Rastro de migração (C-07 / BRIEF §2) --------------------------------------------
  origem_migracao_v1      text,

  -- Auditoria (C-06 / BRIEF §2) -----------------------------------------------------
  criado_por              uuid,
  criado_em               timestamptz not null default now(),
  editado_por             uuid,
  editado_em              timestamptz,

  -- Invariantes do domínio ----------------------------------------------------------
  -- `geral` só faz sentido no ESCOPO de um usuário; um curso concreto sempre pertence a
  -- uma das quatro classificações reais.
  constraint cursos_classificacao_nao_geral
    check (classificacao <> 'geral'),
  constraint cursos_limite_turmas_positivo
    check (limite_turmas_ano >= 1),
  constraint cursos_duracao_semanas_positiva
    check (duracao_semanas is null or duracao_semanas > 0),
  constraint cursos_duracao_dias_positiva
    check (duracao_dias is null or duracao_dias > 0)
);

comment on table  public.cursos is
  'Catálogo de cursos e estágios (24 linhas migradas). Raiz do grafo de dados. '
  'v2.0: `Cad_Cursos`. [MIGRAÇÃO v2.1] perdeu as sete colunas-fórmula de regime, que '
  'viraram a view `vw_cursos_regime_vigente`.';
comment on column public.cursos.codigo is
  'Chave de negócio legada — guarda o `Cad_Cursos.ID_Curso` da v2.0 (ex.: `C-Ap-FR`, '
  '`C-Esp-ALH`). É o que garante rastreabilidade 1:1 com o histórico. FKs apontam para '
  '`id`, nunca para este campo (BRIEF §2).';
comment on column public.cursos.classificacao is
  'Enquadramento do curso. Casa com `usuarios.escopo_curso` para resolver o alcance do '
  'perfil Operador na policy RLS. v2.0: `Cad_Cursos.Classificacao`.';
comment on column public.cursos.prioridade_alocacao is
  'Critério de priorização do motor preditivo, configurável por curso (RF-CRONOS-08). '
  'O default reproduz o comportamento fixo da v1.0 (RN-2027-05), garantindo não regressão. '
  'PENDENTE DE CONFIRMAÇÃO: a v2.0 declarou o ENUM sem listar os valores.';
comment on column public.cursos.nome_normalizado is
  'Coluna GERADA (STORED) — nome sem acento/caixa, para busca e casamento. Nunca editável; '
  'é derivada, não uma segunda fonte de verdade (BRIEF §2).';
comment on column public.cursos.origem_migracao_v1 is
  'Chave da linha de origem na v1.0/v2.0. Convenção C-07 preservada. Nenhuma '
  'reclassificação é destrutiva.';

alter table public.cursos enable row level security;

create trigger trg_cursos_auditoria
  before insert or update on public.cursos
  for each row execute function app.set_auditoria();

-- Índices ---------------------------------------------------------------------------
-- Padrão de consulta real: listagem de cursos ativos (toda tela de filtro) e busca por
-- trecho de nome. Não há índice por `classificacao` isolado: 24 linhas cabem numa
-- varredura sequencial mais barata que o índice (BRIEF §10 — clareza sobre desempenho).
create index idx_cursos_status         on public.cursos (status) where status = 'ativo';
create index idx_cursos_nome_trgm      on public.cursos using gin (nome_normalizado extensions.gin_trgm_ops);


-- =====================================================================================
-- TABELA 2 — `configuracoes_horario`  (cabeçalho de `Horarios_Tempos_Aula`)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : a identidade de uma configuração de horário (`CFG-A1`, `CFG-A1-v2`, …).
-- PARA QUÊ: **[NOVO — v2.1 · consequência estrutural, não escopo novo]** a v2.0 tinha
--          chave composta `ID_Config` + `Tempo_Numero` numa aba só, com `Nome_Config`
--          repetido em cada linha. Isso é, em modelo relacional, um CABEÇALHO e suas
--          LINHAS. Sem o cabeçalho não existe FK possível para "a configuração" — que é
--          exatamente o que `curso_regime_historico.ID_Config` referencia. Separar não
--          inventa domínio: torna declarável a integridade que a v2.0 só podia torcer
--          para que existisse (é o item "integridade referencial declarativa" do BRIEF §0).
-- COMO   : cabeçalho aqui; os N tempos de aula na tabela 3, com FK e `ON DELETE CASCADE`
--          — o único CASCADE do schema, porque um TA órfão de configuração é lixo, não
--          histórico.
-- -------------------------------------------------------------------------------------
-- REGRA DE OURO DESTA ENTIDADE: uma configuração NUNCA é editada. Corrigir um horário
-- cria uma configuração sucessora versionada, e a antiga vira `substituido`. É o que
-- impede que ajustar o relógio de hoje reescreva o horário de um DSA de março (C-08).
-- =====================================================================================

create table public.configuracoes_horario (
  id                      uuid primary key default gen_random_uuid(),
  codigo                  text not null unique,
  nome_config             text not null,
  status                  public.status_config_horario not null default 'ativo',
  substituida_por_id      uuid references public.configuracoes_horario(id) on delete restrict,
  origem_migracao_v1      text,
  criado_por              uuid,
  criado_em               timestamptz not null default now(),
  editado_por             uuid,
  editado_em              timestamptz,

  -- Uma configuração `substituido` PRECISA dizer quem a sucedeu; uma `ativo` não pode
  -- apontar para sucessora. Sem isso, "substituída por ninguém" viraria um beco sem saída.
  constraint cfg_horario_sucessao_coerente
    check (
      (status = 'substituido' and substituida_por_id is not null)
      or (status = 'ativo'     and substituida_por_id is null)
    ),
  constraint cfg_horario_nao_sucede_a_si
    check (substituida_por_id is distinct from id)
);

comment on table  public.configuracoes_horario is
  'Cabeçalho da configuração de horário. [NOVO — v2.1] separado das linhas de TA por '
  'necessidade estrutural: é o alvo da FK de `curso_regime_historico`. Uma configuração '
  'nunca é editada — corrigir cria uma sucessora versionada. v2.0: `Horarios_Tempos_Aula` '
  '(parte cabeçalho).';
comment on column public.configuracoes_horario.codigo is
  'Código imutável e versionado (`CFG-A1`, `CFG-A1-v2`). v2.0: `ID_Config`.';
comment on column public.configuracoes_horario.nome_config is
  'Rótulo legível (`8 TA de 50 min — intervalo 10 min`). Descritivo, NUNCA chave — foi '
  'justamente o uso de rótulo como chave que produziu as chaves órfãs `D`/`E` da v1.0 '
  '(v2.0 §1.1).';
comment on column public.configuracoes_horario.origem_migracao_v1 is
  'Rótulo pivotado original da v1.0 (`A (Normal)`, `C (Curto)`…). Preserva a rastreabilidade '
  'do re-chaveamento pela tabela-verdade da v2.0 §1.1.';

alter table public.configuracoes_horario enable row level security;

create trigger trg_configuracoes_horario_auditoria
  before insert or update on public.configuracoes_horario
  for each row execute function app.set_auditoria();

create index idx_cfg_horario_status on public.configuracoes_horario (status) where status = 'ativo';


-- =====================================================================================
-- TABELA 3 — `horarios_tempos_aula`  (v2.0: `Horarios_Tempos_Aula`, despivotada)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : um registro por TEMPO DE AULA de cada configuração (~40 linhas migradas).
-- PARA QUÊ: dar ao DSA horários de relógio reais (RF-HOR-06) e marcar explicitamente o
--          9º TA como excepcional, para alerta informativo (RF-HOR-03.1 / RN-DEG-02).
-- COMO   : as 5 linhas × 30 colunas pivotadas da v1.0 viraram N linhas × poucas colunas.
--          `intervalo_apos_min` é INTEGER com CHECK — é o que impede a recorrência da
--          corrupção por coerção de tipo que gravou `1900-03-15` onde deveria haver `10`.
-- =====================================================================================

create table public.horarios_tempos_aula (
  id                      uuid primary key default gen_random_uuid(),
  configuracao_id         uuid not null references public.configuracoes_horario(id) on delete cascade,
  tempo_numero            smallint not null,
  periodo                 public.periodo_dia not null,
  tipo_tempo              public.tipo_tempo not null default 'normal',
  hora_inicio             time not null,
  hora_fim                time not null,
  intervalo_apos_min      smallint,
  origem_migracao_v1      text,
  criado_por              uuid,
  criado_em               timestamptz not null default now(),
  editado_por             uuid,
  editado_em              timestamptz,

  -- A chave natural da v2.0 (`ID_Config` + `Tempo_Numero`) vira UNIQUE, não PK: a PK é o
  -- uuid, mas a unicidade de negócio continua garantida pelo motor.
  constraint horarios_ta_unico_por_config unique (configuracao_id, tempo_numero),
  constraint horarios_ta_numero_valido    check (tempo_numero between 1 and 12),
  constraint horarios_ta_fim_apos_inicio  check (hora_fim > hora_inicio),
  -- Intervalo é minuto, nunca data. O CHECK é o guardião do achado de corrupção de tipo.
  constraint horarios_ta_intervalo_valido check (intervalo_apos_min is null
                                                 or intervalo_apos_min between 0 and 120)
);

comment on table  public.horarios_tempos_aula is
  'Tempos de aula de cada configuração de horário, um por linha (despivotado das 5×30 '
  'células da v1.0). ~40 linhas migradas. v2.0: `Horarios_Tempos_Aula` §4.3.';
comment on column public.horarios_tempos_aula.periodo is
  'Turno do TA. Existe para o DSA desenhar a janela de almoço 12h00–13h00 sem INFERIR '
  'período a partir do horário (RF-HOR-04).';
comment on column public.horarios_tempos_aula.tipo_tempo is
  '`excepcional` marca o 9º TA opcional de apoio, autorizado por currículo (CAHO, C-Ap-HN, '
  'C-Ap-FR). Habilita ALERTA INFORMATIVO — nunca bloqueio (BRIEF §9; RN-DEG-02).';
comment on column public.horarios_tempos_aula.intervalo_apos_min is
  'Minutos de intervalo APÓS este TA; NULL no último TA do dia. INTEGER com CHECK — é o '
  'que impede a recorrência da corrupção por coerção de tipo (`1900-03-15` no lugar de 10) '
  'diagnosticada na auditoria da v2.0 §1.';

alter table public.horarios_tempos_aula enable row level security;

create trigger trg_horarios_tempos_aula_auditoria
  before insert or update on public.horarios_tempos_aula
  for each row execute function app.set_auditoria();

-- Padrão de consulta real: "monte a grade de TA desta configuração, em ordem".
create index idx_horarios_ta_config on public.horarios_tempos_aula (configuracao_id, tempo_numero);


-- =====================================================================================
-- TABELA 4 — `curso_regime_historico`  (v2.0: `Cad_Cursos_Regime_Historico`)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : o histórico versionado do regime de horário de cada curso (29 linhas migradas).
-- PARA QUÊ: é o coração da RN-2027-09 — "nenhuma edição de regime reinterpreta o passado".
--          Substitui o par de COLUNAS `Regime_Padrao_*`/`Regime_Excecao_*` da v1.0 por
--          duas LINHAS, cada uma com vigência própria. Resolve o achado (j).
-- COMO   : par `vigente_de` (obrigatório) + `vigente_ate` (NULL = vigente), resolução
--          sempre pelo maior `vigente_de <= data_do_fato` (C-08 / BRIEF §2).
-- -------------------------------------------------------------------------------------
-- **[NOVO — v2.1]** A constraint EXCLUDE abaixo é o ganho concreto da plataforma: no
-- Sheets, duas vigências sobrepostas para o mesmo curso eram um erro que só um teste
-- pegava DEPOIS. Aqui o INSERT simplesmente é recusado. Sem sobreposição, a função
-- `fn_regime_vigente` nunca é ambígua — a garantia deixa de depender de disciplina.
-- =====================================================================================

create table public.curso_regime_historico (
  id                       uuid primary key default gen_random_uuid(),
  codigo                   text not null unique,
  curso_id                 uuid not null references public.cursos(id) on delete restrict,
  tipo_regime              public.tipo_regime not null,
  configuracao_horario_id  uuid references public.configuracoes_horario(id) on delete restrict,

  -- Parâmetros IMUTÁVEIS por norma (RF-HOR-02) — só mudam criando nova vigência ---------
  regime_tempos            smallint not null,
  ta_duracao_min           smallint not null,

  -- Parâmetros EDITÁVEIS pelo Encarregado (RF-HOR-01/02) --------------------------------
  intervalo_manha_min      smallint not null,
  intervalo_tarde_min      smallint not null,
  hora_inicio_manha        time not null,
  hora_inicio_tarde        time not null,

  -- EAD -------------------------------------------------------------------------------
  limite_diario_ead_horas  numeric(4,2),

  -- Vigência temporal (C-08) ------------------------------------------------------------
  vigente_de               date not null,
  vigente_ate              date,

  -- Fundamentação -----------------------------------------------------------------------
  fundamento_curricular    text,
  motivo                   text,

  status                   public.status_vigencia not null default 'ativo',
  origem_migracao_v1       text,
  criado_por               uuid,
  criado_em                timestamptz not null default now(),
  editado_por              uuid,
  editado_em               timestamptz,

  -- Invariantes -------------------------------------------------------------------------
  constraint regime_tempos_valido      check (regime_tempos between 1 and 12),
  -- 45 ou 50 minutos: os dois únicos valores normativos de duração de TA (Glossário DEnsM §2).
  constraint regime_duracao_normativa  check (ta_duracao_min in (45, 50)),
  constraint regime_intervalos_validos check (intervalo_manha_min between 0 and 120
                                          and intervalo_tarde_min between 0 and 120),
  constraint regime_tarde_apos_manha   check (hora_inicio_tarde > hora_inicio_manha),
  constraint regime_vigencia_coerente  check (vigente_ate is null or vigente_ate >= vigente_de),
  constraint regime_ead_positivo       check (limite_diario_ead_horas is null
                                              or limite_diario_ead_horas > 0),

  -- Unicidade lógica declarada na v2.0 §4.2.
  constraint regime_unico_por_inicio   unique (curso_id, tipo_regime, vigente_de),

  -- [NOVO — v2.1] Duas vigências ATIVAS do mesmo tipo não podem se sobrepor no tempo.
  -- `daterange(vigente_de, vigente_ate + 1)` usa o construtor de DOIS argumentos, cujo
  -- limite superior é exclusivo — somar 1 dia reproduz a semântica inclusiva de
  -- `Vigente_Ate` da v2.0. `vigente_ate` NULL propaga NULL, que em range significa
  -- limite superior ABERTO: exatamente "ainda vigente" (C-08).
  -- ATENÇÃO — o construtor de TRÊS argumentos (`daterange(a, b, '[]')`) NÃO pode ser
  -- usado aqui, nem `tipo_regime::text`: o cast enum→text é STABLE (passa pela função de
  -- I/O do tipo) e o PostgreSQL recusa expressão não IMMUTABLE em índice/EXCLUDE. O
  -- `btree_gist` suporta o tipo ENUM diretamente, então o cast é desnecessário.
  constraint regime_sem_sobreposicao
    exclude using gist (
      curso_id    with =,
      tipo_regime with =,
      daterange(vigente_de, vigente_ate + 1) with &&
    ) where (status = 'ativo')
);

comment on table  public.curso_regime_historico is
  'Histórico versionado do regime de horário por curso (29 linhas migradas). Substitui o '
  'par de COLUNAS Regime_Padrao_*/Regime_Excecao_* da v1.0 por duas LINHAS com vigência. '
  'Resolve o achado (j) do documento 05. Origem: RN-2027-09; RF-HOR-05; RF-CURSOS-03.';
comment on column public.curso_regime_historico.vigente_de is
  'Início da vigência — COLUNA CENTRAL DA RN-2027-09. A migração ancorou as linhas na menor '
  'Data_Inicio entre as turmas do curso (ou 01/01/2020 quando não há turma), garantindo que '
  'nenhum cálculo histórico mude de valor no dia seguinte à migração.';
comment on column public.curso_regime_historico.vigente_ate is
  'NULL = vigente. Preenchido com (vigente_de da sucessora − 1). Convenção C-08.';
comment on column public.curso_regime_historico.regime_tempos is
  'TA por dia. IMUTÁVEL POR NORMA (RF-HOR-02): mudar exige nova linha de vigência, jamais '
  'UPDATE nesta.';
comment on column public.curso_regime_historico.ta_duracao_min is
  'Duração do TA: 45 ou 50 minutos, os dois únicos valores normativos (Glossário DEnsM §2). '
  'IMUTÁVEL POR NORMA (RF-HOR-02).';
comment on column public.curso_regime_historico.configuracao_horario_id is
  'NULL nos 4 cursos EAD puros, que não têm regime de TA — só limite_diario_ead_horas.';
comment on column public.curso_regime_historico.limite_diario_ead_horas is
  'Migrado de `Cad_Cursos.Limite_Diario_EAD`. Passa a ser versionável como o resto do regime.';
comment on constraint regime_sem_sobreposicao on public.curso_regime_historico is
  '[NOVO — v2.1] Impede duas vigências ativas sobrepostas do mesmo tipo para o mesmo curso. '
  'É o que torna `app.fn_regime_vigente()` matematicamente não ambígua.';

alter table public.curso_regime_historico enable row level security;

create trigger trg_curso_regime_historico_auditoria
  before insert or update on public.curso_regime_historico
  for each row execute function app.set_auditoria();

-- Índice de resolução por data: é EXATAMENTE o padrão de `fn_regime_vigente(curso, data)`,
-- chamada uma vez por registro de aula renderizado no DSA. `vigente_de DESC` porque a
-- resolução pega o MAIOR vigente_de menor ou igual à data do fato.
create index idx_regime_resolucao
  on public.curso_regime_historico (curso_id, tipo_regime, vigente_de desc)
  where status = 'ativo';


-- =====================================================================================
-- TABELA 5 — `turmas`  (v2.0: `Turmas_Ativas`)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : ocorrências de um curso num ano letivo (29 linhas migradas).
-- PARA QUÊ: é o eixo de quase toda consulta do sistema — DSA, cronograma, relatório e
--          conformidade de tetos são todos "por turma".
-- COMO   : **[MIGRAÇÃO v2.1]** `ID_Turma`, que na v1.0 era FÓRMULA, aqui é `codigo`
--          literal (C-04 preservado e reforçado). `Nome_Completo_Curso`, que era e
--          continua sendo exibição, virou a view `vw_turmas_rotulo` — não é coluna.
-- =====================================================================================

create table public.turmas (
  id                      uuid primary key default gen_random_uuid(),
  codigo                  text not null unique,
  curso_id                uuid not null references public.cursos(id) on delete restrict,
  turma                   text not null,
  ano_letivo              smallint not null,
  alunos                  smallint,
  modalidade              public.modalidade_ensino,
  data_inicio             date,
  data_termino            date,
  sala_alocada            text,
  status                  public.status_turma not null,
  origem_migracao_v1      text,
  criado_por              uuid,
  criado_em               timestamptz not null default now(),
  editado_por             uuid,
  editado_em              timestamptz,

  constraint turmas_ano_valido        check (ano_letivo between 2020 and 2099),
  constraint turmas_alunos_valido     check (alunos is null or alunos >= 0),
  constraint turmas_periodo_coerente  check (data_termino is null or data_inicio is null
                                             or data_termino >= data_inicio),
  -- Um curso não repete o mesmo rótulo de turma (`T1`, `T2`) dentro de um ano letivo.
  constraint turmas_unica_por_ano     unique (curso_id, ano_letivo, turma),

  -- CHAVE AUXILIAR — FR-061 / RN-MAT-01 (research.md §3). Redundante para efeito de
  -- unicidade (`id` ja e PK) e NECESSARIA como alvo de chave estrangeira composta: e ela
  -- que permite a `registros_aula` provar, pelo motor, que a turma e a unidade de ensino
  -- pertencem ao MESMO curso. Sem ela, RN-MAT-01 voltaria a depender de gatilho.
  constraint turmas_id_curso          unique (id, curso_id)
);

comment on table  public.turmas is
  'Ocorrências de um curso num ano letivo (29 linhas migradas). v2.0: `Turmas_Ativas`. '
  'A única turma com Status vazio na base viva foi classificada na migração e registrada '
  'no log — aqui o NOT NULL torna a recorrência impossível.';
comment on column public.turmas.codigo is
  '[MIGRAÇÃO v2.1] guarda o `ID_Turma`, que na v1.0 era FÓRMULA e na v2.0 virou literal '
  'congelado. Uma PK que se recalcula é uma PK que pode mudar sozinha e orfanar todo o '
  'histórico que a referencia (C-04).';
comment on column public.turmas.status is
  'Domínio fechado nos quatro valores observados. O valor "arquivada" do rascunho de '
  'funcionalidades NAO foi incluido — TURMA-1 FECHADO em 28/08/2026: filtro, nao dominio.';

alter table public.turmas enable row level security;

create trigger trg_turmas_auditoria
  before insert or update on public.turmas
  for each row execute function app.set_auditoria();

-- Índices: os três padrões de consulta reais desta tabela.
create index idx_turmas_curso_ano   on public.turmas (curso_id, ano_letivo);   -- "turmas do curso X em 2026"
create index idx_turmas_ano_status  on public.turmas (ano_letivo, status);     -- "turmas ativas do ano"
create index idx_turmas_periodo     on public.turmas (data_inicio, data_termino); -- "turmas vigentes em D"


-- =====================================================================================
-- TABELA 6 — `disciplinas`  (v2.0: `Cad_Disciplinas`; v1.0: `Cad_Matérias`)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : a grade curricular — disciplinas de um curso (175 linhas migradas).
-- PARA QUÊ: define a CHR do curso e é o alvo de todo fato letivo (aula, avaliação,
--          atividade extraclasse).
-- COMO   : nomenclatura "Disciplina", nunca "Matéria" (decisão P-14, BRIEF §9).
-- -------------------------------------------------------------------------------------
-- **APOSENTADORIA DO CONTORNO DO C-Ap-FR (achado (a) / RF-DADOS-06).** A v1.0 descartava
-- duplicata por uma função escrita ESPECIFICAMENTE para o curso C-Ap-FR — e por isso não
-- pegou a duplicata equivalente do `C-Esp-ALH`/`ALH-II`. Aqui a unicidade
-- `curso_id + cod_disciplina` é GENÉRICA e garantida pelo motor, para qualquer curso.
-- O índice é PARCIAL (`where status = 'ativo'`), e essa parcialidade é essencial: a
-- migração resolveu a duplicata mantendo 1 linha `ativo` + 1 `inativo`, e um UNIQUE total
-- rejeitaria justamente o dado já saneado. Preservar histórico e garantir unicidade só
-- coexistem com índice parcial.
-- =====================================================================================

create table public.disciplinas (
  id                        uuid primary key default gen_random_uuid(),
  codigo                    text not null unique,
  curso_id                  uuid not null references public.cursos(id) on delete restrict,

  -- Identificação da disciplina ------------------------------------------------------
  id_disciplina_legado      text,
  cod_disciplina            text not null,
  nome_disciplina           text not null,
  nome_normalizado          text generated always as (app.normalizar_texto(nome_disciplina)) stored,

  -- Atribuição de planejamento (achado (i)) -------------------------------------------
  instrutores_atribuidos    uuid[] not null default '{}'::uuid[],
  instrutores_atribuidos_legado_v1 text,

  -- Carga horária e janela -------------------------------------------------------------
  carga_horaria_tempos      integer not null,
  ordem_sugerida            smallint,

  -- -----------------------------------------------------------------------------------
  -- [CORREÇÃO 26/08/2026 — achado P-7 da análise de ETL, documento 30]
  -- -----------------------------------------------------------------------------------
  -- O QUÊ  : peso de prioridade da disciplina na alocação automática (spec 036).
  -- PARA QUÊ: na v2.0 este valor vivia em `Config_Parametros`, sob a chave
  --          `PRIORIDADE_DISCIPLINA_{ID_Grade}` — e `ID_Grade` é a string composta
  --          "{ID_Disciplina} - {ID_Curso} - {Cod_Disciplina}". Essa chave viola
  --          `config_param_chave_snake` em quatro pontos (maiúsculas, espaços, hifens):
  --          a carga do ETL falharia, e o dado de prioridade de 175 disciplinas se
  --          perderia.
  -- COMO   : promovido a coluna da própria disciplina, que é onde ele sempre pertenceu.
  --          `config_parametros` guarda LIMITE NORMATIVO com fundamento em norma (teto de
  --          AEC, faixa de CH docente); prioridade de alocação é ATRIBUTO OPERACIONAL de
  --          uma disciplina específica, decidido pelo CIAARA. Guardá-la lá era desvio de
  --          propósito da tabela, herdado da limitação do Sheets — que não tinha onde
  --          mais pôr um par chave-valor por linha.
  --          Escala aberta: maior = mais prioritário. NULL = sem prioridade declarada,
  --          e o motor cai em `ordem_sugerida` (degradação segura, RN-DEG-01).
  -- Origem : spec 036 · RF-CRONOS-08 · RNF-NORM-08 (por contraste: NÃO é limite normativo)
  -- -----------------------------------------------------------------------------------
  prioridade_alocacao_peso  smallint,

  previsao_inicio           date,
  previsao_termino          date,

  -- Colunas DERIVADAS, substituindo as FORMULA da v1.0 (BRIEF §2) ------------------------
  semanas integer generated always as (
    case
      when previsao_inicio is not null
       and previsao_termino is not null
       and previsao_termino >= previsao_inicio
      then (floor((previsao_termino - previsao_inicio)::numeric / 7) + 1)::integer
    end
  ) stored,

  ch_semanal numeric(8,2) generated always as (
    case
      when previsao_inicio is not null
       and previsao_termino is not null
       and previsao_termino >= previsao_inicio
      then round(
             carga_horaria_tempos::numeric
             / (floor((previsao_termino - previsao_inicio)::numeric / 7) + 1),
             2)
    end
  ) stored,

  -- Modo de repartição da carga entre instrutores (RN-MAT-05) ---------------------------
  modo_atribuicao_padrao    public.modo_atribuicao not null default 'dividido',

  -- Campos aprovados no achado DISC-1 (Bernardo, 2026-08-15) -----------------------------
  tecnica_ensino_sugerida   text,
  local_padrao              text,

  status                    public.status_registro not null default 'ativo',
  origem_migracao_v1        text,
  criado_por                uuid,
  criado_em                 timestamptz not null default now(),
  editado_por               uuid,
  editado_em                timestamptz,

  -- Invariantes -------------------------------------------------------------------------
  -- A auditoria confirmou: nenhuma linha com carga zerada. O CHECK mantém assim.
  constraint disciplinas_carga_positiva   check (carga_horaria_tempos > 0),
  constraint disciplinas_janela_coerente  check (previsao_termino is null or previsao_inicio is null
                                                 or previsao_termino >= previsao_inicio),
  -- `herdar` só existe no VÍNCULO. A disciplina precisa declarar um modo concreto,
  -- senão o vínculo herdaria uma herança e o valor nunca se resolveria.
  constraint disciplinas_modo_padrao_concreto check (modo_atribuicao_padrao <> 'herdar'),

  -- CHAVE AUXILIAR — FR-061 / RN-MAT-01. Alvo das chaves compostas de `unidades_ensino` e
  -- de `avaliacoes`. Ver o comentario equivalente em `turmas`.
  constraint disciplinas_id_curso         unique (id, curso_id)
);

comment on table  public.disciplinas is
  'Grade curricular: disciplinas de um curso (175 linhas migradas). Nomenclatura '
  '"Disciplina", nunca "Matéria" (decisão P-14; BRIEF §9). v2.0: `Cad_Disciplinas`.';
comment on column public.disciplinas.codigo is
  'Guarda o `ID_Grade` da v2.0 — PK estática congelada como literal (C-04). O nome '
  '`ID_Grade` foi deliberadamente MANTIDO na v2.0 (não é sinônimo de "Disciplina" e '
  'renomear teria custo maior que o ganho); aqui ele vive como valor de `codigo`.';
comment on column public.disciplinas.cod_disciplina is
  'Código da disciplina dentro do curso (ex.: `ALH-II`). Sujeito à unicidade GENÉRICA '
  'curso_id + cod_disciplina — ver índice `uq_disciplinas_curso_cod_ativo` e o gatilho '
  '`trg_disciplinas_unicidade`. Aposenta o contorno específico do C-Ap-FR (RF-DADOS-06).';
comment on column public.disciplinas.carga_horaria_tempos is
  'NOME ÚNICO CANÔNICO — resolve o achado (f): a v1.0 tolerava `Carga_Horaria` E '
  '`Carga_Horaria_Tempos` para a mesma informação. Unidade: TA (1 TA = 1 hora de carga).';
comment on column public.disciplinas.instrutores_atribuidos is
  'Atribuição de PLANEJAMENTO (RN-CRONOS-01) — conceitualmente distinta da HABILITAÇÃO, '
  'que vive em `instrutor_disciplina`. Preserva o achado (i): é a única fonte bruta da '
  'atribuição. [MIGRAÇÃO v2.1] a lista CSV de IDs virou uuid[]; a integridade referencial '
  'dos elementos é garantida pelo gatilho `trg_disciplinas_instrutores_fk` (array não '
  'aceita FK declarativa). PENDENTE DE DECISÃO: normalizar em tabela própria — ver '
  'documento 21 §9.';
comment on column public.disciplinas.instrutores_atribuidos_legado_v1 is
  'Valor bruto CSV original da coluna `ID_Instrutor` da v1.0, preservado intacto (C-07). '
  'Torna a conversão para uuid[] auditável e reversível.';
comment on column public.disciplinas.ch_semanal is
  'Coluna GERADA — média informativa de TA por semana da janela prevista, equivalente à '
  'FORMULA `CH_Semanal` da v1.0. ATENÇÃO: NÃO é a distribuição semanal. A distribuição é '
  'RN-DIST-01/02 (última semana recebe o resto) e tem implementação ÚNICA em '
  '`lib/dominio/` — reimplementá-la em SQL violaria a RN-DIST-01.';
comment on column public.disciplinas.semanas is
  'Coluna GERADA — número de semanas da janela prevista. Equivalente à FORMULA `Semanas` '
  'da v1.0, agora com garantia do motor de nunca divergir das datas.';
comment on column public.disciplinas.tecnica_ensino_sugerida is
  'Achado DISC-1, APROVADO por Bernardo em 2026-08-15 e implementado em 2026-08-16.';
comment on column public.disciplinas.local_padrao is
  'Achado DISC-1, APROVADO por Bernardo em 2026-08-15 e implementado em 2026-08-16.';
comment on column public.disciplinas.modo_atribuicao_padrao is
  'Default `dividido`; `simultaneo` nas disciplinas práticas de encerramento (LHFC, '
  'Prática de Fim de Curso, Prática de Manutenção de Auxílios à Navegação). Origem: RN-MAT-05.';

alter table public.disciplinas enable row level security;

create trigger trg_disciplinas_auditoria
  before insert or update on public.disciplinas
  for each row execute function app.set_auditoria();

-- ---------------------------------------------------------------------------------
-- UNICIDADE GENÉRICA curso + cod_disciplina (RF-DADOS-06 / achado (a))
-- Índice PARCIAL: só entre linhas `ativo`, para conviver com a duplicata já saneada
-- (1 ativa + 1 inativa) sem reabrir o problema.
-- ---------------------------------------------------------------------------------
create unique index uq_disciplinas_curso_cod_ativo
  on public.disciplinas (curso_id, cod_disciplina)
  where status = 'ativo';

comment on index public.uq_disciplinas_curso_cod_ativo is
  'Unicidade GENÉRICA de código de disciplina dentro do curso, para QUALQUER curso. '
  'Aposenta o contorno específico do C-Ap-FR, que não detectou a duplicata do C-Esp-ALH. '
  'Parcial por `status = ativo` para preservar a linha inativa da duplicata saneada. '
  'Origem: RF-DADOS-06; RN-MAT-02; achado (a).';

-- Índices de consulta: grade do curso e busca por nome.
create index idx_disciplinas_curso     on public.disciplinas (curso_id, status);
create index idx_disciplinas_nome_trgm on public.disciplinas using gin (nome_normalizado extensions.gin_trgm_ops);
-- GIN sobre o array permite "quais disciplinas este instrutor está atribuído a ministrar?"
create index idx_disciplinas_instrutores_atribuidos
  on public.disciplinas using gin (instrutores_atribuidos);


-- =====================================================================================
-- TABELA 7 — `unidades_ensino`   [NOVA — decisao UE-1, rota (b), 26/08/2026]
-- -------------------------------------------------------------------------------------
-- O QUE  : a Unidade de Ensino como entidade de primeira classe — a subdivisao interna da
--          disciplina que o curriculo da DEnsM ja declara e que a v2.0 nunca modelou.
-- PARA QUE: e o GRAO do fato de execucao a partir desta versao. `registros_aula` aponta
--          para ca, nao para `disciplinas`, e a carga executada da disciplina passa a ser
--          o agregado das suas unidades (BRIEF §2.2; documento 05 §9.1).
-- -------------------------------------------------------------------------------------
-- NAO EXISTE NO REFERENCIA. `docs/sql-referencia/01` foi escrito ANTES da decisao UE-1 e
-- nao conhece esta tabela. O BRIEF §2.1 vence e a divergencia e do script (BRIEF §11).
--
-- DE ONDE VEM O DADO: dos curriculos oficiais da DEnsM, um PDF por curso, extraidos por
-- `scripts/etl/extrair_unidades_ensino.py` para `scripts/etl/dados/unidades_ensino.csv`.
-- Sao 572 unidades em 134 disciplinas, de 21 dos 24 curriculos. A CARGA E DO EPICO 2:
-- depende de `disciplinas`, que so o ETL traz (plan.md, "O que fica FORA desta fatia").
--
-- ATRIBUTOS LIMITADOS aos cinco que o documento 05 §9.1 nomeia, mais os universais. A
-- decisao UE-1 fixou o grao e a entidade; ela NAO autorizou inventar atributo. Atributo a
-- mais exige pergunta, nao suposicao (Principio I).
--
-- A SUBUNIDADE (SUE) existe no curriculo — sao 2.446 — e NAO vira tabela aqui: nao ha
-- requisito que a peca, e funcionalidade sem requisito esbarra no Principio X (FR-026).
-- =====================================================================================

create table public.unidades_ensino (
  id                      uuid primary key default gen_random_uuid(),

  -- Chave de negocio. As UEs nao vem da v2.0 — nascem do curriculo —, entao `codigo` nao
  -- guarda `ID_*` legado: e composto pelo ETL a partir de curso + disciplina + numero e,
  -- uma vez atribuido, NUNCA se recalcula (convencao C-04: chave que se recalcula orfana
  -- o historico que a referencia).
  codigo                  text not null unique,

  disciplina_id           uuid not null references public.disciplinas(id) on delete restrict,

  -- Componente da chave composta de RN-MAT-01. NAO e segunda fonte de verdade: a FK
  -- composta `ue_curso_coerente` obriga a concordar com o curso da disciplina, e divergir
  -- e exatamente o que o motor impede.
  curso_id                uuid not null references public.cursos(id)      on delete restrict,

  -- Do curriculo, verbatim ------------------------------------------------------------
  numero_ue               smallint not null,
  topico                  text     not null,
  ch_prevista_tempos      smallint not null,
  tecnica_ensino_sugerida text,

  -- A norma que aprovou o curriculo de origem. Mesmo principio que obriga todo parametro
  -- normativo a declarar a sua (RNF-NORM-08, FR-023).
  fundamento_normativo    text,

  status                  public.status_registro not null default 'ativo',
  origem_migracao_v1      text,
  criado_por              uuid,
  criado_em               timestamptz not null default now(),
  editado_por             uuid,
  editado_em              timestamptz,

  -- Invariantes ------------------------------------------------------------------------
  constraint ue_numero_positivo     check (numero_ue > 0),
  constraint ue_ch_positiva         check (ch_prevista_tempos > 0),
  constraint ue_topico_nao_vazio    check (btrim(topico) <> ''),

  -- Uma disciplina nao repete numero de unidade (FR-021).
  constraint ue_unica_na_disciplina unique (disciplina_id, numero_ue),

  -- Chave auxiliar: alvo da composta de `registros_aula`.
  constraint ue_id_curso            unique (id, curso_id),

  -- A UNIDADE PERTENCE AO CURSO DA SUA DISCIPLINA. Declarativo, nao verificado em codigo.
  constraint ue_curso_coerente
    foreign key (disciplina_id, curso_id)
    references public.disciplinas (id, curso_id) on delete restrict
);

-- NAO EXISTE, E E DELIBERADO: nenhuma verificacao de numeracao CONTIGUA (FR-025). Um
-- curriculo pode numerar com salto e lacuna e dado normativo valido; um CHECK de
-- contiguidade recusaria curriculo correto. Guardado por assercao em 010_estrutura.sql.

comment on table public.unidades_ensino is
  'Unidade de Ensino — subdivisao interna da disciplina, declarada no curriculo da DEnsM. '
  'E o GRAO do fato de execucao desde a decisao UE-1 rota (b) (26/08/2026): `registros_aula` '
  'aponta para ca, e a carga executada da disciplina e o agregado destas linhas, nunca uma '
  'segunda coluna gravada. 572 linhas previstas, carregadas no Epico 2. Origem: BRIEF §2.2; '
  'documento 05 §9.1.';
comment on column public.unidades_ensino.codigo is
  'Chave de negocio composta pelo ETL (curso + disciplina + numero). Diferente das demais '
  'tabelas, NAO guarda `ID_*` da v2.0: a UE nao existia la. Nunca se recalcula (C-04).';
comment on column public.unidades_ensino.curso_id is
  'Componente da chave composta de RN-MAT-01. Nao e dado duplicado: `ue_curso_coerente` '
  'obriga a concordar com o curso da disciplina. Ver research.md §3.';
comment on column public.unidades_ensino.numero_ue is
  'Numero da unidade dentro da disciplina, verbatim do curriculo. Unico na disciplina, '
  'positivo, e NAO necessariamente contiguo — lacuna e dado valido (FR-025).';
comment on column public.unidades_ensino.ch_prevista_tempos is
  'CH prevista da unidade, verbatim do curriculo. A soma das unidades de uma disciplina '
  'fecha com a CH da disciplina — conferido em 134 de 134 casos na extracao e imposto por '
  'assercao pgTAP (FR-024).';
comment on column public.unidades_ensino.fundamento_normativo is
  'O Oficio da DEnsM que aprovou o curriculo de origem (FR-023).';

create index ix_ue_disciplina on public.unidades_ensino (disciplina_id) where status = 'ativo';

alter table public.unidades_ensino enable row level security;

create trigger trg_unidades_ensino_auditoria
  before insert or update on public.unidades_ensino
  for each row execute function app.set_auditoria();


-- =====================================================================================
-- TABELA 8 — `turma_disciplina`  (v2.0: `Turma_Disciplina`, achado LIQ-1)
-- -------------------------------------------------------------------------------------
-- ⚠️  ATENÇÃO — TABELA AUSENTE DO MAPA DO BRIEF §2.1. LACUNA REPORTADA, NÃO INVENÇÃO.
-- -------------------------------------------------------------------------------------
-- O QUÊ  : o período previsto de cada disciplina EM CADA TURMA (210 linhas reais).
-- PARA QUÊ: `disciplinas.previsao_inicio/termino` é a janela da GRADE DO CURSO, não da
--          turma. Quatro cursos rodam DUAS turmas no mesmo ano letivo com janelas
--          completamente distintas — uma única data por disciplina não consegue
--          representar as duas, e a LIQ real é organizada POR TURMA (com sufixo `T2`).
--          Sem esta tabela, a LIQ de qualquer trimestre com segunda turma sai com o
--          período errado ou duplica a linha.
-- COMO   : mesmo precedente de `cursos` → `curso_regime_historico`: a entidade "molde"
--          mantém suas colunas como PADRÃO DA GRADE, e a entidade nova é a FONTE DE
--          VERDADE DA EXECUÇÃO. `disciplinas.previsao_*` NÃO é apagada (C-10).
-- -------------------------------------------------------------------------------------
-- POR QUE ELA ESTÁ AQUI MESMO FORA DO MAPA: o achado LIQ-1 foi APROVADO por Bernardo em
-- 2026-08-20 e APLICADO À PLANILHA AO VIVO no mesmo dia (`_Migracao_Log` LOG-000508 a
-- LOG-000717) — são 210 linhas de dado em produção, 89 herdadas e 121 em branco. O mapa
-- do BRIEF §2.1 foi escrito a partir das 23 abas e não a inclui. Omiti-la aqui seria
-- perder dado migrado e quebrar o Épico 11 (LIQ). Incluí-la é o menor dos dois danos.
-- **AGUARDA CONFIRMAÇÃO DO BERNARDO** sobre o nome e a inclusão no mapa canônico.
-- =====================================================================================

create table public.turma_disciplina (
  id                      uuid primary key default gen_random_uuid(),
  codigo                  text not null unique,
  turma_id                uuid not null references public.turmas(id)      on delete restrict,
  disciplina_id           uuid not null references public.disciplinas(id) on delete restrict,

  -- Fonte de verdade do período POR TURMA. NULL = não informado — e é exatamente esse
  -- NULL que a regra de bloqueio da LIQ cobra do usuário.
  previsao_inicio         date,
  previsao_termino        date,
  origem_periodo          public.origem_periodo not null default 'nao_informado',

  -- -----------------------------------------------------------------------------------
  -- [CORREÇÃO 26/08/2026 — achado P-6, REVISTO contra a planilha real]
  -- -----------------------------------------------------------------------------------
  -- A atribuição de instrutor NÃO mora aqui. A primeira versão desta correção acrescentou
  -- `instrutor_id` e `ch_prevista_por_instrutor` como colunas escalares — e a leitura da
  -- planilha ao vivo provou que estava errado: `Turma_Disciplina.ID_Instrutor` contém
  -- LISTA (`"40, 60, 18, 19, 20, 21"`, 15 linhas), e `CH_Prevista_Por_Instrutor` contém
  -- um MAPA `instrutor:CH` (`"40:200, 60:200"`). Coluna escalar não comporta isso.
  -- A atribuição vive na tabela filha `turma_disciplina_instrutor`, no fim deste arquivo.
  -- Origem : specs 029, 032, 034 · achado LIQ-1 · auditoria da planilha real (documento 32)
  -- -----------------------------------------------------------------------------------

  status                  public.status_registro not null default 'ativo',
  origem_migracao_v1      text,
  criado_por              uuid,
  criado_em               timestamptz not null default now(),
  editado_por             uuid,
  editado_em              timestamptz,

  constraint turma_disc_janela_coerente check (previsao_termino is null or previsao_inicio is null
                                               or previsao_termino >= previsao_inicio),

  -- `nao_informado` e período preenchido são mutuamente incoerentes: a coluna existe para
  -- separar dado real de ausência, e essa separação precisa ser verdadeira.
  constraint turma_disc_origem_coerente
    check (
      (origem_periodo =  'nao_informado' and previsao_inicio is null and previsao_termino is null)
      or
      (origem_periodo <> 'nao_informado' and previsao_inicio is not null)
    )
);

comment on table  public.turma_disciplina is
  '[NOVO — v2.1 · LACUNA DO BRIEF §2.1, AGUARDA CONFIRMAÇÃO] Período previsto de cada '
  'disciplina em cada turma. 210 linhas reais em produção (89 herdadas da grade, 121 em '
  'branco). Origem: achado LIQ-1 (v2.0 §8), APROVADO e aplicado à planilha ao vivo em '
  '2026-08-20, spec 027-liq-automacao. `disciplinas.previsao_*` permanece como padrão da '
  'grade (semente ao criar turma nova) — aditivo e não destrutivo (C-10).';
comment on column public.turma_disciplina.origem_periodo is
  'Rastreia de onde veio a data: `herdado_grade` (herdada de `disciplinas` porque caía '
  'dentro da janela da própria turma), `manual` (informada pelo usuário) ou `nao_informado`. '
  'Separa dado REAL de AUSÊNCIA sem adivinhação.';

alter table public.turma_disciplina enable row level security;

create trigger trg_turma_disciplina_auditoria
  before insert or update on public.turma_disciplina
  for each row execute function app.set_auditoria();

-- Unicidade lógica declarada no achado LIQ-1: um par turma × disciplina, uma linha ativa.
create unique index uq_turma_disciplina_ativo
  on public.turma_disciplina (turma_id, disciplina_id)
  where status = 'ativo';

create index idx_turma_disciplina_turma      on public.turma_disciplina (turma_id);
create index idx_turma_disciplina_disciplina on public.turma_disciplina (disciplina_id);


-- =====================================================================================
-- TABELA 8 — `instrutores`  (v2.0: `Cad_Instrutor`)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : cadastro do corpo docente (177 linhas migradas).
-- PARA QUÊ: alimenta habilitação, atribuição, DSA, LIQ, OS de Instrutoria e Ficha de
--          Docentes.
-- COMO   : **[MIGRAÇÃO v2.1]** todos os cabeçalhos corrompidos da v1.0 (`Dep. / Divisão`,
--          `"Previsão de "`, `" da Docência na MB"`, `" da Docência no CIAARA"`) chegam
--          aqui como identificadores `snake_case` ASCII. A classe inteira de defeito do
--          achado (g) — nome de coluna divergindo entre código e planilha — deixa de
--          existir: no PostgreSQL um nome de coluna errado é erro de compilação, não um
--          campo que aparece em branco.
-- -------------------------------------------------------------------------------------
-- RN-INST-03 VIRA GARANTIA DO MOTOR: posto/graduação, especialidade/habilitação, nome
-- completo, categoria e OM são NOT NULL. Na v2.0 isso era validação de formulário que
-- alguém podia contornar editando a planilha. ATENÇÃO PARA O ETL: se a base legada tiver
-- nulos nesses cinco campos, a carga falha — e deve falhar, sendo saneada com decisão
-- registrada no `migracao_log`, exatamente como se fez com o `Status` dos 177 instrutores.
-- =====================================================================================

create table public.instrutores (
  id                                uuid primary key default gen_random_uuid(),
  codigo                            text not null unique,

  -- Identificação naval (RN-INST-03: os cinco obrigatórios) ---------------------------
  posto_graduacao                   text not null,
  esp_hab_obs                       text not null,
  nome_completo                     text not null,
  categoria                         text not null,
  om                                text not null,

  nome_guerra                       text,
  nome_normalizado                  text generated always as (app.normalizar_texto(nome_completo)) stored,
  nip                               text,
  data_nascimento                   date,

  -- Lotação -----------------------------------------------------------------------------
  dep_divisao                       text,
  data_assuncao_setor               date,

  -- Contato e vínculo -------------------------------------------------------------------
  email                             text,
  regime_trabalho                   public.regime_trabalho_docente,

  -- Formação e capacitação --------------------------------------------------------------
  nivel_escolaridade                text,
  formacao_principal_secundaria     text,
  capacitacao_didatica              text,
  data_inicio_docencia_mb           date,
  data_inicio_docencia_ciaara       date,

  -- Avaliação de desempenho -------------------------------------------------------------
  ultima_avaliacao_desempenho       text,
  data_avaliacao_desempenho         date,

  -- Operacional --------------------------------------------------------------------------
  preferencia                       text,
  disciplinas_ministradas_legado_v1 text,

  -- Campo LEGADO reaproveitado (achado (d)) ----------------------------------------------
  antiguidade_declarada             text,
  antiguidade_declarada_num integer generated always as (
    nullif(regexp_replace(coalesce(antiguidade_declarada, ''), '\D', '', 'g'), '')::integer
  ) stored,

  status                            public.status_registro not null default 'ativo',
  origem_migracao_v1                text,
  criado_por                        uuid,
  criado_em                         timestamptz not null default now(),
  editado_por                       uuid,
  editado_em                        timestamptz,

  constraint instrutores_email_formato
    check (email is null or email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint instrutores_docencia_coerente
    check (data_inicio_docencia_ciaara is null or data_inicio_docencia_mb is null
           or data_inicio_docencia_ciaara >= data_inicio_docencia_mb)
);

comment on table  public.instrutores is
  'Cadastro do corpo docente (177 linhas migradas). v2.0: `Cad_Instrutor`. Os cinco campos '
  'NOT NULL materializam a RN-INST-03 como garantia do motor.';
comment on column public.instrutores.codigo is
  'ATENÇÃO — EXCEÇÃO DOCUMENTADA DA RN-CRUD-03(b): o identificador de instrutor é um '
  'INTEIRO SIMPLES, SEM PREFIXO (não `INS-000001`), porque todo o restante do sistema já '
  'o interpreta como número. Unificar os dois padrões quebraria referências existentes.';
comment on column public.instrutores.posto_graduacao is
  'Posto/graduação. É a fonte PRIMÁRIA da antiguidade (RN-ANT-02), resolvida pela escala '
  'fixa CMG=1 … MN=12, com as categorias civis `SC`/`SCNS` em peso 13 (achado residual da '
  'v2.0 §6.8). A escala vive em `config_listas`, não em código — ver `app.fn_peso_posto()`.';
comment on column public.instrutores.antiguidade_declarada is
  '⚠️ CAMPO LEGADO — PRESERVADO POR DECISÃO EXPLÍCITA (achado (d), v2.0 §6.8: "Não será '
  'feito (reaproveitada, não removida)"). A v1.0 `Antiguidade` estava preenchida em 100% '
  'dos 177 registros: é dado VIVO, não morto. Deixa de ser critério primário (que é o '
  'posto/graduação, RN-ANT-02) e passa a ser o DESEMPATE entre instrutores de mesmo posto. '
  'Guardado como TEXTO, valor bruto intacto (C-07).';
comment on column public.instrutores.antiguidade_declarada_num is
  'Coluna GERADA — leitura numérica de `antiguidade_declarada` para permitir ordenação de '
  'desempate. Só extrai dígitos; texto sem dígito vira NULL. O bruto permanece intacto ao '
  'lado (C-07): o valor reinterpretado nunca substitui o original.';
comment on column public.instrutores.dep_divisao is
  '[MIGRAÇÃO v2.1] era `Dep. / Divisão` na v1.0 — o cabeçalho que originou o achado (g) '
  '(campo aparecia bloqueado por divergência de acentuação entre código e planilha).';
comment on column public.instrutores.data_inicio_docencia_mb is
  '[MIGRAÇÃO v2.1] era `" da Docência na MB"` — cabeçalho FISICAMENTE TRUNCADO no arquivo '
  'da v1.0 (perdeu a palavra "Início"). Achado (g) em sua forma mais severa.';
comment on column public.instrutores.data_inicio_docencia_ciaara is
  '[MIGRAÇÃO v2.1] era `" da Docência no CIAARA"` — mesmo truncamento do campo anterior.';
comment on column public.instrutores.capacitacao_didatica is
  'Vazio em 83,6% dos 177 instrutores. Alimenta ALERTA INFORMATIVO de RNF-NORM-05 (docente '
  'com mais de um ano de exercício sem capacitação registrada) — NUNCA bloqueio, sob pena '
  'de inviabilizar a operação corrente (RN-DEG-02).';
comment on column public.instrutores.regime_trabalho is
  'Determina a faixa de carga horária semanal aplicável (RNF-NORM-03). Os limites vivem em '
  '`config_parametros`, chaveados pelo rótulo deste ENUM (RNF-NORM-08).';
comment on column public.instrutores.status is
  '[MIGRAÇÃO v2.1] NOT NULL com default. Na base viva os 177 registros tinham `Status` '
  'VAZIO em 100%; a migração atribuiu `Ativo` a todos, decisão registrada no log como '
  'valor ATRIBUÍDO, não observado. Aqui o estado nunca mais é inferido de célula vazia '
  '(RN-INST-05).';
comment on column public.instrutores.disciplinas_ministradas_legado_v1 is
  '⚠️ CAMPO LEGADO — texto livre da v1.0 (`Disciplinas Ministradas`). A verdade das '
  'disciplinas de um instrutor é `instrutor_disciplina` (habilitação) e '
  '`disciplinas.instrutores_atribuidos` (atribuição). Preservado apenas como memória (C-07).';

alter table public.instrutores enable row level security;

create trigger trg_instrutores_auditoria
  before insert or update on public.instrutores
  for each row execute function app.set_auditoria();

-- Índices: RN-ANT-01 manda ordenar TODA lista de instrutores por antiguidade; o índice
-- por (posto_graduacao, antiguidade) cobre o critério primário + desempate.
create index idx_instrutores_antiguidade on public.instrutores (posto_graduacao, antiguidade_declarada_num)
  where status = 'ativo';
create index idx_instrutores_status      on public.instrutores (status);
create index idx_instrutores_nome_trgm   on public.instrutores using gin (nome_normalizado extensions.gin_trgm_ops);
create index idx_instrutores_dep_divisao on public.instrutores (dep_divisao) where status = 'ativo';
-- Único parcial no e-mail: dois instrutores ativos não compartilham e-mail, mas nulos são
-- livres (nem todo instrutor tem e-mail cadastrado).
create unique index uq_instrutores_email_ativo
  on public.instrutores (lower(email)) where email is not null and status = 'ativo';


-- =====================================================================================
-- TABELA 9 — `instrutor_disciplina`  (v2.0: `Instrutor_Disciplina`)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : vínculo de HABILITAÇÃO instrutor ↔ disciplina (798 linhas migradas).
-- PARA QUÊ: é o que a RN-INST-01 consulta antes de aceitar um instrutor como responsável
--          por uma aula. (Aplicador de avaliação também exige; FISCAL não exige.)
-- COMO   : **[MIGRAÇÃO v2.1]** as três colunas-FÓRMULA da v1.0 (`Instrutor (Posto/Grad. e
--          Nome)`, `Matéria`, `Curso`) NÃO existem aqui. Eram desnormalização de exibição
--          que o Sheets precisava por não ter JOIN. O PostgreSQL tem JOIN — elas viram a
--          view `vw_instrutor_disciplina_rotulada`.
-- =====================================================================================

create table public.instrutor_disciplina (
  id                    uuid primary key default gen_random_uuid(),
  codigo                text not null unique,
  instrutor_id          uuid not null references public.instrutores(id) on delete restrict,
  disciplina_id         uuid not null references public.disciplinas(id) on delete restrict,
  modo_atribuicao       public.modo_atribuicao not null default 'herdar',
  status                public.status_registro not null default 'ativo',
  origem_migracao_v1    text,
  criado_por            uuid,
  criado_em             timestamptz not null default now(),
  editado_por           uuid,
  editado_em            timestamptz
);

comment on table  public.instrutor_disciplina is
  'Vínculo de HABILITAÇÃO instrutor ↔ disciplina (798 linhas migradas). Distinto da '
  'ATRIBUIÇÃO de planejamento, que vive em `disciplinas.instrutores_atribuidos` '
  '(RN-CRONOS-01). v2.0: `Instrutor_Disciplina`. [PENDENTE] o achado LIQ-3 propõe uma '
  'coluna `papel_liq` (Titular/Reserva_1/Reserva_2) exigida pelo Anexo C da NORMHIDRO '
  '30-23 — NÃO implementada, permanece deferida por decisão de 2026-08-20.';
comment on column public.instrutor_disciplina.codigo is
  'Guarda o `ID_Vinculo` da v2.0 (`VIN-{NNNNNN}`). PK própria criada na v2.0 — a v1.0 usava '
  'a dupla ID_Instrutor + ID_Grade, sem identidade própria.';
comment on column public.instrutor_disciplina.modo_atribuicao is
  'Default `herdar`, que resolve em `disciplinas.modo_atribuicao_padrao`. Origem: RN-MAT-05.';

alter table public.instrutor_disciplina enable row level security;

create trigger trg_instrutor_disciplina_auditoria
  before insert or update on public.instrutor_disciplina
  for each row execute function app.set_auditoria();

-- Um instrutor não se habilita duas vezes na mesma disciplina. Parcial por `ativo` para
-- permitir reativar um vínculo desabilitado sem colidir com o histórico.
create unique index uq_instrutor_disciplina_ativo
  on public.instrutor_disciplina (instrutor_id, disciplina_id)
  where status = 'ativo';

-- As duas direções de navegação reais: "quem pode dar esta disciplina?" e
-- "que disciplinas este instrutor pode dar?".
create index idx_inst_disc_disciplina on public.instrutor_disciplina (disciplina_id) where status = 'ativo';
create index idx_inst_disc_instrutor  on public.instrutor_disciplina (instrutor_id)  where status = 'ativo';


-- =====================================================================================
-- TABELA 10 — `responsaveis_curso`  (v2.0: `Responsaveis_Curso`)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : quem assina o rodapé do DSA impresso, e desde quando.
-- PARA QUÊ: resolve o achado (b) — a aba tinha 0 linhas na v1.0 e TODO DSA impresso saía
--          sem assinatura. A migração semeou duas linhas institucionais.
-- COMO   : **[MIGRAÇÃO v2.1]** o literal `GERAL` da coluna `ID_Curso` da v2.0 vira
--          `curso_id IS NULL`. No Sheets, um valor mágico dentro de uma coluna de FK era
--          a única saída; no PostgreSQL NULL já significa "não se aplica a um curso
--          específico", e isso mantém a FK real e verificável. Evita replicar o
--          Encarregado da Divisão em 24 linhas, que era o propósito original do literal.
-- -------------------------------------------------------------------------------------
-- POR QUE HÁ VIGÊNCIA AQUI: um DSA de março reimpresso hoje precisa trazer quem assinava
-- EM MARÇO. É a rendição de encarregados preservada (C-08).
-- =====================================================================================

create table public.responsaveis_curso (
  id                      uuid primary key default gen_random_uuid(),
  codigo                  text not null unique,

  -- NULL = assinatura institucional válida para todos os cursos (antigo literal `GERAL`).
  curso_id                uuid references public.cursos(id) on delete restrict,

  ordem                   smallint not null,
  papel_assinatura        public.papel_assinatura not null,
  preenchimento           public.modo_preenchimento_assinatura not null,

  -- Dados nominais (obrigatórios apenas no modo `fixo`) ------------------------------
  posto_graduacao         text,
  especialidade           text,
  nome_guerra             text,
  nome_completo           text,
  nip                     text,
  funcao_descricao        text not null,

  -- Resolução do modo dinâmico -------------------------------------------------------
  instrutor_id            uuid references public.instrutores(id) on delete restrict,
  email_usuario           text,
  usuario_id              uuid,

  -- Vigência (C-08) -------------------------------------------------------------------
  vigente_de              date not null,
  vigente_ate             date,

  exibir_no_dsa           boolean not null default true,
  status                  public.status_registro not null default 'ativo',
  origem_migracao_v1      text,
  criado_por              uuid,
  criado_em               timestamptz not null default now(),
  editado_por             uuid,
  editado_em              timestamptz,

  constraint resp_ordem_positiva     check (ordem >= 1),
  constraint resp_vigencia_coerente  check (vigente_ate is null or vigente_ate >= vigente_de),

  -- Modo `fixo` PRECISA de posto e nome de guerra — são o que a linha de assinatura
  -- imprime. Sem esse CHECK, o rodapé voltaria a sair em branco, que é o defeito que
  -- esta tabela existe para eliminar.
  constraint resp_fixo_tem_nominal
    check (preenchimento <> 'fixo'
           or (posto_graduacao is not null and nome_guerra is not null)),

  -- Modo dinâmico PRECISA de uma chave de resolução do usuário da sessão.
  constraint resp_dinamico_tem_chave
    check (preenchimento <> 'dinamico_usuario_logado'
           or email_usuario is not null or usuario_id is not null)
);

comment on table  public.responsaveis_curso is
  'Assinaturas do rodapé do DSA impresso. Resolve o achado (b): a aba tinha 0 linhas e '
  'todo DSA saía sem assinatura. v2.0: `Responsaveis_Curso` §4.6. Origem: RF-DSA-06.';
comment on column public.responsaveis_curso.curso_id is
  '[MIGRAÇÃO v2.1] NULL = assinatura institucional válida em TODOS os cursos — substitui o '
  'literal `GERAL` que a v2.0 precisava enfiar dentro de uma coluna de FK. Aqui a FK '
  'continua real e verificável.';
comment on column public.responsaveis_curso.preenchimento is
  'A coluna que AUTOMATIZA a assinatura. `fixo` = usa os dados nominais desta linha; '
  '`dinamico_usuario_logado` = resolve Posto + Especialidade + Nome de Guerra a partir do '
  'usuário da sessão em tempo de impressão.';
comment on column public.responsaveis_curso.vigente_de is
  'As linhas semente receberam a DATA DA MIGRAÇÃO, deliberadamente. Um DSA de semana '
  'anterior reimpresso sai sem assinatura — comportamento correto e honesto: naquela data '
  'não havia responsável cadastrado. Ancorar no passado faria o sistema afirmar '
  'retroativamente que alguém assinou um documento que saiu em branco.';
comment on column public.responsaveis_curso.usuario_id is
  'FK LÓGICA → `usuarios(id)`. A constraint FÍSICA é criada na migration de autenticação '
  '(a tabela `usuarios` não pertence a este arquivo). Ver documento 21 §9.';
comment on column public.responsaveis_curso.funcao_descricao is
  'Linha impressa ABAIXO da rubrica (ex.: "Encarregado da Divisão de Administração '
  'Acadêmica"). PENDÊNCIA OPERACIONAL conhecida: o nominal do Encarregado da Divisão da '
  'linha semente ainda precisa ser confirmado pelo CIAARA-11 antes do go-live (tasks T017).';

alter table public.responsaveis_curso enable row level security;

create trigger trg_responsaveis_curso_auditoria
  before insert or update on public.responsaveis_curso
  for each row execute function app.set_auditoria();

-- Padrão de consulta real da impressão do DSA: "responsáveis do curso X (ou institucionais)
-- vigentes na data D, visíveis, na ordem do rodapé".
create index idx_responsaveis_resolucao
  on public.responsaveis_curso (curso_id, vigente_de desc, ordem)
  where status = 'ativo' and exibir_no_dsa;


-- =====================================================================================
-- GATILHO — integridade referencial do array `disciplinas.instrutores_atribuidos`
-- -------------------------------------------------------------------------------------
-- O QUÊ  : recusa gravação que aponte para instrutor inexistente dentro do uuid[].
-- PARA QUÊ: PostgreSQL não aceita FK sobre elemento de array. Sem este gatilho, a
--          atribuição de planejamento seria o ÚNICO ponto do schema sem integridade
--          referencial — justamente o que a migração para banco veio comprar.
-- COMO   : compara a cardinalidade do array com a contagem de instrutores encontrados.
--          Definido aqui, e não junto da tabela, porque depende de `instrutores` já existir.
-- =====================================================================================

create or replace function app.validar_instrutores_atribuidos()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_informados integer;
  v_existentes integer;
begin
  -- Array vazio ou nulo é válido: disciplina sem instrutor atribuído é estado legítimo.
  if new.instrutores_atribuidos is null or cardinality(new.instrutores_atribuidos) = 0 then
    return new;
  end if;

  -- Conta valores DISTINTOS: repetir o mesmo instrutor no array não deve mascarar um id inválido.
  select count(distinct x) into v_informados
    from unnest(new.instrutores_atribuidos) as x;

  select count(*) into v_existentes
    from public.instrutores i
   where i.id = any (new.instrutores_atribuidos);

  if v_existentes <> v_informados then
    raise exception
      'disciplinas.instrutores_atribuidos contém identificador de instrutor inexistente (informados: %, encontrados: %).',
      v_informados, v_existentes
      using errcode = '23503',   -- foreign_key_violation: mesmo código de uma FK real
            hint = 'Todo uuid do array deve existir em public.instrutores. Origem: achado (i), RN-CRONOS-01.';
  end if;

  return new;
end;
$$;

comment on function app.validar_instrutores_atribuidos() is
  'Integridade referencial dos elementos de `disciplinas.instrutores_atribuidos`. Supre a '
  'ausência de FK declarativa sobre array. Origem: achado (i); RN-CRONOS-01.';

create trigger trg_disciplinas_instrutores_fk
  before insert or update of instrutores_atribuidos on public.disciplinas
  for each row execute function app.validar_instrutores_atribuidos();


-- =====================================================================================
-- GATILHO — unicidade genérica `curso_id` + `cod_disciplina` com mensagem de domínio
-- -------------------------------------------------------------------------------------
-- O QUÊ  : verifica a duplicidade ANTES do índice único e levanta erro em português.
-- PARA QUÊ: o índice `uq_disciplinas_curso_cod_ativo` já GARANTE a unicidade — este
--          gatilho não duplica a garantia, ele qualifica a MENSAGEM. A RF-DADOS-06 pede
--          "alertando o usuário em caso de duplicidade"; um erro cru de índice único
--          ("duplicate key value violates unique constraint") não é um alerta, é um
--          vazamento de detalhe de implementação para a tela.
-- COMO   : BEFORE INSERT OR UPDATE, consulta a existência de irmã ativa e levanta
--          exceção com `errcode 23505` (o mesmo do índice) e texto que a Server Action
--          pode exibir direto ao Encarregado.
-- =====================================================================================

create or replace function app.validar_unicidade_disciplina()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_conflito text;
begin
  -- Só linhas ATIVAS competem por unicidade: a duplicata saneada guarda uma irmã inativa.
  if new.status <> 'ativo' then
    return new;
  end if;

  select d.codigo into v_conflito
    from public.disciplinas d
   where d.curso_id       = new.curso_id
     and d.cod_disciplina = new.cod_disciplina
     and d.status         = 'ativo'
     and d.id            <> new.id
   limit 1;

  if v_conflito is not null then
    raise exception
      'Já existe uma disciplina ativa com o código "%" neste curso (registro %).',
      new.cod_disciplina, v_conflito
      using errcode = '23505',
            hint = 'Cada código de disciplina é único dentro de um curso. Desative a disciplina existente antes de recriá-la. Origem: RF-DADOS-06, RN-MAT-02, achado (a).';
  end if;

  return new;
end;
$$;

comment on function app.validar_unicidade_disciplina() is
  'Alerta de domínio para a unicidade genérica curso + cod_disciplina. A GARANTIA está no '
  'índice `uq_disciplinas_curso_cod_ativo`; esta função existe para entregar a MENSAGEM em '
  'português que a RF-DADOS-06 exige. Aposenta o contorno específico do C-Ap-FR.';

create trigger trg_disciplinas_unicidade
  before insert or update of curso_id, cod_disciplina, status on public.disciplinas
  for each row execute function app.validar_unicidade_disciplina();




-- =====================================================================================
-- TABELA 11 — `turma_disciplina_instrutor`   [NOVO — v2.1, auditoria da planilha real]
-- -------------------------------------------------------------------------------------
-- O QUÊ  : quem ministra esta disciplina NESTA TURMA, e com que carga horária prevista.
--
-- PARA QUÊ: é a terceira e última forma de atribuição do sistema, e a única que a LIQ e a
--          OS de Instrutoria podem legitimamente ler. As três, que a v1.0 confundia e a
--          spec 034 separou a duras penas:
--
--            instrutor_disciplina            → HABILITAÇÃO  (pode ministrar)
--            disciplinas.instrutores_atribuidos → PLANEJAMENTO por grade de curso
--            turma_disciplina_instrutor      → ATRIBUIÇÃO REAL por turma  ← esta
--
--          Ler a habilitação no lugar da atribuição foi o defeito de produção que a spec
--          034 corrigiu. O schema agora torna o erro impossível: são tabelas distintas,
--          com nomes que dizem o que são.
--
-- COMO   : tabela filha, um instrutor por linha. A alternativa escalar (uma coluna
--          `instrutor_id` em `turma_disciplina`) foi tentada e DESCARTADA depois de ler a
--          planilha ao vivo, que provou o modelo N:N:
--            · `Turma_Disciplina.ID_Instrutor` = "40, 60, 18, 19, 20, 21"  (15 linhas)
--            · `CH_Prevista_Por_Instrutor`     = "40:200, 60:200, 18:200"  (mapa id:CH)
--          São disciplinas multidisciplinares com rateio de carga (spec 032). Coluna
--          escalar não comporta seis instrutores, e um `uuid[]` não comporta a CH de cada.
--
-- ⚠️  ARMADILHA DE CARGA — leia antes de escrever o ETL (documento 32 §3):
--     No .xlsx exportado, os pares de UM instrutor foram DESTRUÍDOS por coerção de tipo:
--     o Excel leu "89:28" como duração e gravou `timedelta(3 days, 17:28:00)`.
--     A recuperação é determinística e foi validada em 43/43 valores:
--
--          ch_prevista = minutos_totais_do_timedelta − (id_instrutor × 60)
--
--     (o `id × 60` desfaz o "carry" de 60 minutos que o Excel aplicou quando CH ≥ 60).
--     A defesa definitiva, porém, é NÃO exportar para .xlsx: leia a planilha pela API do
--     Google Sheets com `valueRenderOption=UNFORMATTED_VALUE`, que devolve o texto cru.
--
-- Origem : specs 029, 032, 034 · achado LIQ-1 · RN-CRONOS-01 · documento 32 §3
-- =====================================================================================

create table public.turma_disciplina_instrutor (
  id                    uuid primary key default gen_random_uuid(),
  codigo                text not null unique,

  turma_disciplina_id   uuid not null references public.turma_disciplina(id) on delete restrict,
  instrutor_id          uuid not null references public.instrutores(id)      on delete restrict,

  -- Carga horária prevista para ESTE instrutor NESTA disciplina/turma, em tempos de aula.
  -- NULL = rateio não declarado; o consumidor divide igualmente entre os atribuídos
  -- (degradação segura, RN-DEG-01) em vez de recusar o cálculo.
  ch_prevista_tempos    numeric(6,2),

  -- Papel do instrutor na disciplina. O domínio fica em `config_listas` (lista
  -- `Papel_Instrutor_Turma`) e não em ENUM porque a decisão LIQ-3 — se há distinção
  -- titular/reserva — ainda está com o Bernardo. Domínio administrável não vira migration.
  papel                 text,

  status                public.status_registro not null default 'ativo',
  observacao            text,
  origem_migracao_v1    text,

  criado_por            uuid,
  criado_em             timestamptz not null default now(),
  editado_por           uuid,
  editado_em            timestamptz,

  -- Um instrutor não é atribuído duas vezes à mesma disciplina da mesma turma.
  constraint tdi_par_unico unique (turma_disciplina_id, instrutor_id),

  -- Carga negativa nunca é dado válido. Aqui vale barrar no banco: é aritmética, não
  -- regra normativa — o princípio alerta-não-bloqueio (RN-DEG-02) protege regra da norma
  -- cuja violação o sistema não consegue verificar, não impede o banco de recusar absurdo.
  constraint tdi_ch_nao_negativa check (ch_prevista_tempos is null or ch_prevista_tempos >= 0)
);

comment on table public.turma_disciplina_instrutor is
  '[NOVO — v2.1] Atribuição REAL de instrutor por turma+disciplina, com rateio de carga. '
  'Distinta da habilitação (`instrutor_disciplina`) e do planejamento por grade '
  '(`disciplinas.instrutores_atribuidos`). É daqui que a LIQ e a OS de Instrutoria leem. '
  'Origem: specs 029/032/034; achado LIQ-1; auditoria da planilha real (documento 32).';
comment on column public.turma_disciplina_instrutor.ch_prevista_tempos is
  'CH prevista para este instrutor, em tempos de aula. NULL = rateio não declarado; o '
  'consumidor divide igualmente (RN-DEG-01). Origem: spec 032 (coluna Q).';
comment on column public.turma_disciplina_instrutor.papel is
  'Papel na disciplina; domínio em `config_listas` (`Papel_Instrutor_Turma`). Fica como '
  'texto e não ENUM porque a decisão LIQ-3 (titular/reserva) está pendente.';

alter table public.turma_disciplina_instrutor enable row level security;

create trigger trg_tdi_auditoria
  before insert or update on public.turma_disciplina_instrutor
  for each row execute function app.set_auditoria();

-- Consulta mais quente da LIQ: "quais disciplinas este instrutor ministra?"
create index idx_tdi_instrutor on public.turma_disciplina_instrutor (instrutor_id)
  where status = 'ativo';
-- E a inversa, do DSA e da OS: "quem ministra esta disciplina nesta turma?"
create index idx_tdi_turma_disciplina on public.turma_disciplina_instrutor (turma_disciplina_id)
  where status = 'ativo';


-- =====================================================================================
-- FIM DE M2. Proxima: M3 — fatos no grao de unidade de ensino.
-- =====================================================================================
