-- =====================================================================================
-- CIAARA-11 v2.1 — 02_tabelas_fato.sql
-- Tabelas de fato: execução letiva, avaliação, atividade não letiva e planejamento anual.
-- -------------------------------------------------------------------------------------
-- O QUÊ  : cria as tabelas que registram O QUE ACONTECEU (ou o que se planeja acontecer),
--          por oposição às tabelas de cadastro do arquivo 01, que dizem o que EXISTE.
-- PARA QUÊ: são a base de cálculo de CHD, CHT, conformidade de tetos, DSA, cronograma e
--          carga horária docente. Cada linha aqui é história — e história neste sistema
--          não se apaga nem se reescreve (BRIEF §9).
-- COMO   : todas carregam o quarteto de auditoria completo (C-06), `status` para exclusão
--          lógica (C-05) e `origem_migracao_v1` (C-07). Toda FK usa `ON DELETE RESTRICT`:
--          um cadastro só pode ser desativado, nunca removido enquanto houver fato.
-- -------------------------------------------------------------------------------------
-- Pré-requisito: 00 e 01 aplicados.
-- Origem: v2.0 §4.1, §4.4, §4.5, §5.5; BRIEF v2.1 §2.
-- =====================================================================================


-- =====================================================================================
-- TABELA 11 — `avaliacoes_planejadas`  (v2.0: `Avaliacoes_Planejadas`)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : o catálogo do "dever-ser" de avaliação por disciplina/curso (118 linhas).
-- PARA QUÊ: é o previsto contra o qual as avaliações efetivamente agendadas se comparam.
-- COMO   : criada ANTES de `avaliacoes` porque é alvo da FK `item_planejado_id`.
-- -------------------------------------------------------------------------------------
-- ATENÇÃO — NÃO HÁ FK PARA `disciplinas`, E ISSO É DELIBERADO. A RN-AVAL-01 estabelece
-- que o vínculo com a disciplina se dá por CASAMENTO DE NOME NORMALIZADO, não por chave
-- estrangeira formal. Criar a FK aqui mudaria a regra de negócio, e a v2.1 não reinventa
-- o domínio (BRIEF §0). O que a plataforma acrescenta é a coluna GERADA
-- `nome_normalizado`, que torna esse casamento determinístico e indexável — antes ele
-- dependia de a função de normalização do Apps Script ser chamada igual nos dois lados.
-- =====================================================================================

create table public.avaliacoes_planejadas (
  id                       uuid primary key default gen_random_uuid(),
  codigo                   text not null unique,
  curso_id                 uuid not null references public.cursos(id) on delete restrict,

  nome_disciplina          text not null,
  nome_normalizado         text generated always as (app.normalizar_texto(nome_disciplina)) stored,

  descricao_instrumentos   text,

  -- ⚠️ CAMPOS LEGADOS — ver COMMENT abaixo ------------------------------------------
  formula_mf               text,
  carater                  text,

  observacoes              text,
  status                   public.status_registro not null default 'ativo',
  origem_migracao_v1       text,
  criado_por               uuid,
  criado_em                timestamptz not null default now(),
  editado_por              uuid,
  editado_em               timestamptz
);

comment on table  public.avaliacoes_planejadas is
  'Catálogo do "dever-ser" de avaliação por disciplina/curso (118 linhas). Vincula-se a '
  '`disciplinas` por CASAMENTO DE NOME NORMALIZADO, NÃO por FK — decisão de domínio '
  'preservada (RN-AVAL-01). v2.0: `Avaliacoes_Planejadas`.';
comment on column public.avaliacoes_planejadas.nome_disciplina is
  '[MIGRAÇÃO v2.1] era `Nome_Materia`. Nomenclatura "Disciplina", nunca "Matéria" (P-14).';
comment on column public.avaliacoes_planejadas.nome_normalizado is
  'Coluna GERADA — chave de casamento da RN-AVAL-01. Torna determinístico e indexável um '
  'vínculo que na v2.0 dependia de o Apps Script normalizar igual nos dois lados.';
comment on column public.avaliacoes_planejadas.formula_mf is
  '⚠️ CAMPO LEGADO — PRESERVADO POR DECISÃO EXPLÍCITA. Achado (k): com a simplificação do '
  'módulo de Avaliações (decisão D5), deixou de ser lido por qualquer regra de negócio '
  '(RN-AVAL-01 revisada). Mantido no schema como INFORMATIVO, nunca removido fisicamente '
  '— mesmo tratamento do achado (d). Consequência normativa direta de RNF-NORM-06: o '
  'sistema NÃO calcula nota, média final nem aprovação (competência da CIAARA-32/CIAARA-12).';
comment on column public.avaliacoes_planejadas.carater is
  '⚠️ CAMPO LEGADO — PRESERVADO POR DECISÃO EXPLÍCITA. Mesmo tratamento e mesma origem de '
  '`formula_mf` (achado (k), v2.0 §6.8: "Adiado com justificativa (mantidos como legado)").';

alter table public.avaliacoes_planejadas enable row level security;

create trigger trg_avaliacoes_planejadas_auditoria
  before insert or update on public.avaliacoes_planejadas
  for each row execute function app.set_auditoria();

create index idx_aval_plan_curso on public.avaliacoes_planejadas (curso_id, status);
-- Índice sobre a chave de casamento da RN-AVAL-01: é a consulta que descobre o item
-- planejado correspondente a uma avaliação agendada.
create index idx_aval_plan_nome_norm on public.avaliacoes_planejadas (curso_id, nome_normalizado);


-- =====================================================================================
-- TABELA 12 — `registros_aula`  (v2.0: `Registro_Aulas_E_Atividades`)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : o diário de execução letiva — cada aula ou atividade extraclasse lançada
--          (1.566 linhas migradas, depois de a fusão da Missão 3 retirar as 186 de
--          avaliação e 1 de cerimônia migrar para `atividades_nao_letivas`).
-- PARA QUÊ: é a maior parcela da CHD e a matéria-prima do DSA impresso.
-- COMO   : **[MIGRAÇÃO v2.1]** o valor `Avaliação` de `Tipo_Atividade` DEIXA DE EXISTIR
--          aqui. Avaliação passou a viver exclusivamente em `avaliacoes` (RN-AVAL-02,
--          fusão da Missão 3). O ENUM `categoria_registro_aula` só tem dois valores, e é
--          o motor que impede o retorno da contagem dupla de TA que subdimensionava a
--          carga horária.
-- -------------------------------------------------------------------------------------
-- AS DUAS CATEGORIAS EXIGEM DISCIPLINA. É isso — e só isso — que separa esta tabela de
-- `atividades_nao_letivas`: aqui `disciplina_id` é NOT NULL; lá a disciplina não existe.
-- A regra de repartição é essa fronteira, não uma lista de tipos.
-- -------------------------------------------------------------------------------------
-- [ALTERADO PELA DECISÃO UE-1 — 26/08/2026, rota (b)]  ATENÇÃO ANTES DE COPIAR DAQUI.
-- O grão desta tabela MUDOU. Esta referência está no grão de DISCIPLINA; a decisão UE-1
-- moveu o fato de execução para o grão de UNIDADE DE ENSINO (documento 05 §9.1). Na
-- migration do Épico 1: criar `unidades_ensino` (FK `disciplina_id`, unique
-- (disciplina_id, numero_ue)); acrescentar `unidade_ensino_id` aqui; e derivar a CH
-- executada da disciplina por VIEW/GENERATED, NUNCA por segunda coluna gravada.
-- Este arquivo NÃO foi reescrito: é o registro do desenho anterior à decisão. O desenho
-- definitivo sai do /speckit-plan do Épico 1.
-- =====================================================================================

create table public.registros_aula (
  id                      uuid primary key default gen_random_uuid(),
  codigo                  text not null unique,

  data                    date not null,
  turma_id                uuid not null references public.turmas(id)      on delete restrict,
  disciplina_id           uuid not null references public.disciplinas(id) on delete restrict,
  instrutor_id            uuid          references public.instrutores(id) on delete restrict,

  -- Grandeza normativa (v2.0 §5.5) --------------------------------------------------
  categoria_normativa     public.categoria_registro_aula not null default 'aula',
  -- Subtipo OPERACIONAL, administrável — vive em `config_listas` (FK adicionada no
  -- arquivo 03, ver bloco "FKs postergadas"). Ex.: `Aula Teórica`, `Aula Prática`.
  tipo_atividade          text,
  metodologia             text,

  -- Consumo de TA --------------------------------------------------------------------
  tempos_consumidos       smallint not null,
  ta_inicial              smallint,
  ta_final smallint generated always as (
    case when ta_inicial is not null then ta_inicial + tempos_consumidos - 1 end
  ) stored,

  conteudo_resumo         text,
  local                   text,
  observacoes             text,

  status                  public.status_registro not null default 'ativo',
  origem_migracao_v1      text,
  criado_por              uuid,
  criado_em               timestamptz not null default now(),
  editado_por             uuid,
  editado_em              timestamptz,

  constraint reg_aula_tempos_positivos check (tempos_consumidos between 1 and 12),
  constraint reg_aula_ta_valido        check (ta_inicial is null or ta_inicial between 1 and 12),
  -- Aula EXIGE instrutor (RN-INST-01, que também cobra habilitação — verificada em
  -- `lib/dominio/`). Atividade extraclasse NÃO exige instrutor habilitado, portanto
  -- aceita instrutor nulo.
  constraint reg_aula_instrutor_obrigatorio
    check (categoria_normativa <> 'aula' or instrutor_id is not null)
);

comment on table  public.registros_aula is
  'Diário de execução letiva: aulas e atividades extraclasse (1.566 linhas migradas). '
  'AMBAS as categorias exigem disciplina vinculada — é essa a fronteira com '
  '`atividades_nao_letivas`. v2.0: `Registro_Aulas_E_Atividades` §5.5.';
comment on column public.registros_aula.categoria_normativa is
  '[MIGRAÇÃO v2.1] o valor `Avaliação` da v1.0 NÃO EXISTE neste domínio. As 186 linhas de '
  'execução de avaliação foram fundidas em `avaliacoes` (RN-AVAL-02) e arquivadas em '
  '`arquivo_avaliacoes_v1`. O ENUM de dois valores é o que impede a recorrência da '
  'contagem dupla de TA.';
comment on column public.registros_aula.tipo_atividade is
  'Subtipo OPERACIONAL (`Aula Teórica`, `Aula Prática`). Rebaixado de "tipo" a "subtipo" '
  'na v2.0. Domínio ADMINISTRÁVEL: FK para `config_listas` (lista `tipos_atividade`), '
  'não ENUM — mudar a lista é um INSERT, não uma migration (BRIEF §2).';
comment on column public.registros_aula.metodologia is
  'Domínio ADMINISTRÁVEL: FK para `config_listas` (lista `metodologias`).';
comment on column public.registros_aula.tempos_consumidos is
  'TA consumidos. Compõe a CHD da disciplina (RN-EVT-03). Unidade: TA (1 TA = 1 hora).';
comment on column public.registros_aula.ta_inicial is
  'Nº do primeiro TA ocupado — posiciona o bloco na grade do DSA. NULL nos registros '
  'históricos sem posição: a grade aplica degradação segura e os exibe em faixa de rodapé '
  'do dia, nunca lança exceção (RN-DEG-01).';
comment on column public.registros_aula.ta_final is
  'Coluna GERADA — último TA ocupado. Existe para tornar a detecção de sobreposição uma '
  'comparação de intervalos, e não aritmética repetida em cada consulta.';
comment on column public.registros_aula.instrutor_id is
  'NULL permitido apenas em `atividade_extraclasse`, que não exige instrutor habilitado. '
  'Para `aula` é obrigatório por CHECK (RN-INST-01).';

alter table public.registros_aula enable row level security;

create trigger trg_registros_aula_auditoria
  before insert or update on public.registros_aula
  for each row execute function app.set_auditoria();

-- Índices — os quatro padrões de consulta reais do sistema (documento 21 §6):
create index idx_reg_aula_turma_data   on public.registros_aula (turma_id, data);        -- DSA da semana
create index idx_reg_aula_disciplina   on public.registros_aula (disciplina_id, data);   -- CHD da disciplina
create index idx_reg_aula_instrutor    on public.registros_aula (instrutor_id, data)     -- carga do instrutor
  where instrutor_id is not null;
create index idx_reg_aula_data         on public.registros_aula (data);                  -- intervalo de datas / ano


-- =====================================================================================
-- TABELA 13 — `avaliacoes`  (v2.0: `Avaliacoes` — FUSÃO, Missão 3)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : a FONTE ÚNICA de agendamento E execução de avaliação (111 linhas migradas,
--          conciliadas com até 186 execuções legadas).
-- PARA QUÊ: resolve a falha estrutural mais cara da base: 111 agendamentos e 186 registros
--          de execução em cadastros paralelos, sem correspondência garantida — causa raiz
--          do subdimensionamento sistemático de carga horária (RN-AVAL-02).
-- COMO   : um único fato, preenchido em DOIS MOMENTOS. Agendar preenche `data_avaliacao`
--          e NÃO consome TA. Registrar no DSA preenche `ta_inicial`/`tempos_consumidos`
--          NA MESMA LINHA — nunca um segundo cadastro (nota de revisão v1.4, Épico I).
-- -------------------------------------------------------------------------------------
-- APLICAÇÃO E VISTA COMPÕEM A CHD (RN-EVT-03). É normativo: o Glossário DEnsM §2 define a
-- Carga Horária da Disciplina como o somatório dos TA da disciplina INCLUINDO o tempo de
-- avaliações e de vista/comentários de prova. Por isso os dois pares de colunas de TA.
-- =====================================================================================

create table public.avaliacoes (
  id                        uuid primary key default gen_random_uuid(),
  codigo                    text not null unique,

  turma_id                  uuid not null references public.turmas(id)      on delete restrict,
  disciplina_id             uuid not null references public.disciplinas(id) on delete restrict,

  -- Domínio ADMINISTRÁVEL (FK para config_listas adicionada no arquivo 03) -----------
  tipo_avaliacao            text,

  -- Momento 1 — AGENDAMENTO (não consome TA) ------------------------------------------
  data_avaliacao            date not null,
  local                     text,

  -- Momento 2 — APLICAÇÃO registrada no DSA (consome TA e compõe a CHD) ----------------
  ta_inicial                smallint,
  tempos_consumidos         smallint,
  ta_final smallint generated always as (
    case when ta_inicial is not null and tempos_consumidos is not null
         then ta_inicial + tempos_consumidos - 1 end
  ) stored,

  -- Momento 3 — VISTA DE PROVA (também consome TA e compõe a CHD, RN-EVT-03) -----------
  data_vista_prova          date,
  ta_inicial_vista          smallint,
  tempos_consumidos_vista   smallint,
  local_vista               text,
  ta_final_vista smallint generated always as (
    case when ta_inicial_vista is not null and tempos_consumidos_vista is not null
         then ta_inicial_vista + tempos_consumidos_vista - 1 end
  ) stored,

  -- Responsáveis -----------------------------------------------------------------------
  instrutor_responsavel_id  uuid not null references public.instrutores(id) on delete restrict,
  fiscal_id                 uuid          references public.instrutores(id) on delete restrict,
  nome_fiscal_externo       text,

  status                    public.status_avaliacao not null default 'pendente',

  -- Vínculo com o planejado (RN-AVAL-01) -----------------------------------------------
  item_planejado_id         uuid references public.avaliacoes_planejadas(id) on delete set null,

  conteudo_resumo           text,
  metodologia               text,
  observacoes               text,

  -- Rastro da fusão (v2.0 §6.3) ---------------------------------------------------------
  origem_migracao_v1        text,
  origem_execucao_v1        text,
  conciliacao_migracao      public.conciliacao_migracao,

  criado_por                uuid,
  criado_em                 timestamptz not null default now(),
  editado_por               uuid,
  editado_em                timestamptz,

  -- Invariantes -------------------------------------------------------------------------
  constraint aval_ta_coerente
    check ((ta_inicial is null) = (tempos_consumidos is null)),
  constraint aval_ta_vista_coerente
    check ((ta_inicial_vista is null) = (tempos_consumidos_vista is null)),
  constraint aval_tempos_positivos
    check (tempos_consumidos is null or tempos_consumidos between 1 and 12),
  constraint aval_tempos_vista_positivos
    check (tempos_consumidos_vista is null or tempos_consumidos_vista between 1 and 12),
  constraint aval_ta_valido
    check (ta_inicial is null or ta_inicial between 1 and 12),
  constraint aval_ta_vista_valido
    check (ta_inicial_vista is null or ta_inicial_vista between 1 and 12),
  -- A vista comenta uma prova já aplicada: nunca antecede a aplicação.
  constraint aval_vista_apos_aplicacao
    check (data_vista_prova is null or data_vista_prova >= data_avaliacao),
  -- Fiscal do cadastro E fiscal externo são mutuamente exclusivos (RF-AVAL-06).
  constraint aval_fiscal_exclusivo
    check (fiscal_id is null or nome_fiscal_externo is null)
);

comment on table  public.avaliacoes is
  'FONTE ÚNICA de agendamento e execução de avaliação (111 linhas migradas). Fusão da '
  'Missão 3: elimina a duplicidade de fato que subdimensionava a carga horária. '
  'v2.0: `Avaliacoes` §4.4. Origem: RN-AVAL-02, RN-EVT-03, RF-AVAL-05.';
comment on column public.avaliacoes.data_avaliacao is
  'Data prevista de aplicação, preenchida JÁ NO AGENDAMENTO, antes de qualquer consumo '
  'de TA. Agendar não consome TA por si só (RN-AVAL-02 revisada, Épico I).';
comment on column public.avaliacoes.tempos_consumidos is
  'TA consumidos pela APLICAÇÃO. Vazio até o registro efetivo no DSA; a partir daí COMPÕE '
  'A CHD da disciplina (RN-EVT-03). Padrão de migração: 3 TA (RN-2027-04) apenas nas linhas '
  '`sem_execucao` — valor INFERIDO, não medido, e sinalizado como tal no log.';
comment on column public.avaliacoes.tempos_consumidos_vista is
  'TA consumidos pela VISTA/COMENTÁRIO DE PROVA. TAMBÉM compõe a CHD (RN-EVT-03) — '
  'exigência normativa direta do Glossário DEnsM §2.';
comment on column public.avaliacoes.instrutor_responsavel_id is
  'Aplicador. EXIGE habilitação na disciplina (RN-INST-01), verificada em `lib/dominio/`.';
comment on column public.avaliacoes.fiscal_id is
  'Fiscal. NÃO exige habilitação na disciplina — RN-INST-01 delimitada (RF-AVAL-06). '
  'Mutuamente exclusivo com `nome_fiscal_externo`.';
comment on column public.avaliacoes.nome_fiscal_externo is
  'Fiscal fora do cadastro de instrutores (RF-AVAL-06).';
comment on column public.avaliacoes.item_planejado_id is
  'Vínculo CONFIRMADO em cache com `avaliacoes_planejadas`. O casamento por nome '
  'normalizado (RN-AVAL-01) continua sendo o MECANISMO DE DESCOBERTA; esta coluna guarda '
  'o resultado confirmado. `ON DELETE SET NULL`: perder o item planejado não pode apagar '
  'a avaliação realmente aplicada.';
comment on column public.avaliacoes.conciliacao_migracao is
  'Rastro da qualidade da fusão de 111 agendamentos com 186 execuções legadas. Alimenta a '
  'conferência humana pós-migração. NULL em linhas criadas depois da migração.';
comment on column public.avaliacoes.origem_execucao_v1 is
  '`ID_Registro` da linha de execução conciliada em `Registro_Aulas_E_Atividades`, ou NULL '
  'se não houve par. C-07.';

alter table public.avaliacoes enable row level security;

create trigger trg_avaliacoes_auditoria
  before insert or update on public.avaliacoes
  for each row execute function app.set_auditoria();

-- Índices
create index idx_avaliacoes_turma_data  on public.avaliacoes (turma_id, data_avaliacao);
create index idx_avaliacoes_disciplina  on public.avaliacoes (disciplina_id);
create index idx_avaliacoes_instrutor   on public.avaliacoes (instrutor_responsavel_id);
create index idx_avaliacoes_fiscal      on public.avaliacoes (fiscal_id) where fiscal_id is not null;
create index idx_avaliacoes_data        on public.avaliacoes (data_avaliacao);
-- Consulta da regra dos 7 dias (RF-AVAL-03): "vistas ainda não realizadas".
create index idx_avaliacoes_vista_pendente
  on public.avaliacoes (data_avaliacao)
  where data_vista_prova is null and status <> 'cancelada';


-- =====================================================================================
-- TABELA 14 — `atividades_nao_letivas`  (v2.0: `Eventos_Extracurriculares`)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : lançamentos SEM disciplina vinculada (664 linhas migradas: 663 + a única
--          `Evento/Cerimônia` transferida de `Registro_Aulas_E_Atividades`).
-- PARA QUÊ: é onde vivem AEC, TAD, TR e Estudo Individual — as quatro grandezas cujos
--          tetos normativos a RNF-NORM-02 manda calcular e sinalizar.
-- COMO   : **[MIGRAÇÃO v2.1]** o nome da tabela muda de `Eventos_Extracurriculares` para
--          `atividades_nao_letivas` (BRIEF §2.1) porque o conteúdo deixou de ser
--          "extracurricular": passou a ser toda atividade não letiva, categorizada por
--          norma. O nome antigo descrevia UMA das quatro categorias e batizava as quatro.
-- -------------------------------------------------------------------------------------
-- A COLUNA `Tipo` DA v1.0 VIROU TRÊS. `categoria_normativa` (a grandeza, domínio fechado),
-- `subtipo` (o detalhe operacional, lista SUGERIDA e não restritiva) e `tipo_legado_v1`
-- (o valor bruto original, C-07). Nada do vocabulário foi descartado — ele foi PROMOVIDO
-- a dois níveis. Se o CIAARA-11 decidir depois que "Treinamento Físico" é TAD e não AEC,
-- a reclassificação é um UPDATE sobre um dado preservado, não uma nova arqueologia.
-- =====================================================================================

create table public.atividades_nao_letivas (
  id                      uuid primary key default gen_random_uuid(),
  codigo                  text not null unique,

  categoria_normativa     public.categoria_normativa not null,
  subtipo                 text,
  tipo_legado_v1          text,

  escopo                  public.escopo_atividade not null default 'turma',
  turma_id                uuid references public.turmas(id) on delete restrict,

  data                    date not null,
  descricao               text not null,

  tempos_consumidos       smallint not null,
  ta_inicial              smallint,
  ta_final smallint generated always as (
    case when ta_inicial is not null then ta_inicial + tempos_consumidos - 1 end
  ) stored,
  local                   text,

  -- Coluna DERIVADA que materializa a fórmula normativa CHT = CHD + AEC + TAD + TR,
  -- mantendo Estudo Individual FORA da soma (RN-EVT-01). Substitui a FORMULA `Compoe_CHT`
  -- da v2.0 por uma coluna gerada: mesmo resultado, com garantia do motor.
  compoe_cht boolean generated always as (categoria_normativa <> 'Estudo_Individual') stored,

  observacoes             text,
  status                  public.status_registro not null default 'ativo',
  origem_migracao_v1      text,
  criado_por              uuid,
  criado_em               timestamptz not null default now(),
  editado_por             uuid,
  editado_em              timestamptz,

  constraint ativ_tempos_positivos check (tempos_consumidos between 1 and 12),
  constraint ativ_ta_valido        check (ta_inicial is null or ta_inicial between 1 and 12),
  -- Escopo e turma são estritamente correlatos: `global` vale para todas as turmas ativas
  -- na data (turma nula); `turma` exige a turma. Sem este CHECK o escopo seria decorativo.
  constraint ativ_escopo_coerente
    check ((escopo = 'turma'  and turma_id is not null)
        or (escopo = 'global' and turma_id is null))
);

comment on table  public.atividades_nao_letivas is
  'Lançamentos SEM disciplina vinculada — AEC, TAD, TR e Estudo Individual (664 linhas '
  'migradas). [MIGRAÇÃO v2.1] renomeada de `Eventos_Extracurriculares`: o nome antigo '
  'descrevia UMA das quatro categorias e batizava as quatro. v2.0: §4.5 (Missão 4). '
  'Origem: RN-EVT-01; RF-DADOS-03.';
comment on column public.atividades_nao_letivas.categoria_normativa is
  'Domínio ESTRITAMENTE FECHADO, sem valor padrão — exigido em todo lançamento novo '
  '(RN-EVT-01). Distribuição migrada: Estudo_Individual 531 · AEC 62 · TAD 59 (60 com a '
  'cerimônia transferida) · TR 11.';
comment on column public.atividades_nao_letivas.subtipo is
  'Detalhe OPERACIONAL dentro da categoria (Palestra, Visita Técnica, Monitoria…). Lista '
  'SUGERIDA, explicitamente NÃO restritiva — por isso texto livre, sem FK.';
comment on column public.atividades_nao_letivas.tipo_legado_v1 is
  '⚠️ CAMPO LEGADO — valor bruto de `Tipo` na v1.0, preservado intacto (C-07). É o que '
  'torna a recategorização dos 663 lançamentos auditável e REVERSÍVEL.';
comment on column public.atividades_nao_letivas.compoe_cht is
  'Coluna GERADA — materializa CHT = CHD + AEC + TAD + TR mantendo Estudo Individual FORA '
  'da soma (RN-EVT-01). Substitui a FORMULA `Compoe_CHT` da v2.0.';
comment on column public.atividades_nao_letivas.ta_inicial is
  'Coluna NOVA na v2.0 (achado (c)): antes, um evento aparecia na grade do DSA sem posição '
  'de horário. Nasceu vazia nas 663 linhas migradas — a grade aplica degradação segura e '
  'exibe esses históricos em faixa de rodapé do dia (RN-DEG-01).';
comment on column public.atividades_nao_letivas.escopo is
  '`turma` em 100% das linhas migradas (toda linha da v1.0 tinha turma). `global` só passa '
  'a existir em lançamentos novos.';

alter table public.atividades_nao_letivas enable row level security;

create trigger trg_atividades_nao_letivas_auditoria
  before insert or update on public.atividades_nao_letivas
  for each row execute function app.set_auditoria();

create index idx_ativ_turma_data on public.atividades_nao_letivas (turma_id, data) where turma_id is not null;
create index idx_ativ_data       on public.atividades_nao_letivas (data);
-- Consulta da conformidade de tetos: soma por categoria dentro de uma turma.
create index idx_ativ_categoria  on public.atividades_nao_letivas (categoria_normativa, turma_id)
  where status = 'ativo';
-- Eventos globais são poucos e consultados por data em toda montagem de DSA.
create index idx_ativ_globais    on public.atividades_nao_letivas (data) where escopo = 'global';


-- =====================================================================================
-- TABELA 15 — `planejamento_anual`  (v2.0: `Planejamento_Anual` — Missão 1)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : a saída persistente e VERSIONADA do motor preditivo multi-ano.
-- PARA QUÊ: substitui a aba temporária `Planejamento_2027`, que era apagada e recriada a
--          cada execução. Reverte a RN-2027-07: gerar de novo NÃO apaga mais nada.
-- COMO   : gerar cria `versao = MAX+1` em `rascunho`. Promover a `salvo` arquiva a versão
--          anterior NA MESMA TRANSAÇÃO — e agora isso é uma transação ACID de verdade,
--          não uma sequência de escritas no Sheets que podia falhar pela metade.
-- -------------------------------------------------------------------------------------
-- O DIFF MOTOR × HUMANO É O ATIVO DESTA TABELA. `tempos_alocados` guarda o valor CORRENTE
-- (possivelmente editado); `tempos_alocados_motor` guarda o ORIGINAL. A v1.0 destruía essa
-- diferença a cada regeneração — e ela é o insumo direto para calibrar o motor.
-- =====================================================================================

create table public.planejamento_anual (
  id                      uuid primary key default gen_random_uuid(),
  codigo                  text not null unique,

  ano_letivo              smallint not null,
  versao                  smallint not null,
  status_previa           public.status_planejamento not null default 'rascunho',

  curso_id                uuid not null references public.cursos(id)  on delete restrict,
  turma_prevista_id       uuid          references public.turmas(id)  on delete restrict,
  rotulo_turma_prevista   text,

  tipo_linha              public.tipo_linha_planejamento not null,
  disciplina_id           uuid references public.disciplinas(id) on delete restrict,

  semana_ano              smallint not null,
  data_inicio_semana      date not null,

  tempos_alocados         smallint not null,
  tempos_alocados_motor   smallint,
  origem_linha            public.origem_linha_planejamento not null default 'motor',

  descricao               text,
  observacoes             text,

  -- Auditoria de GERAÇÃO e de PROMOÇÃO, além do quarteto padrão -----------------------
  gerado_por              uuid,
  gerado_em               timestamptz not null default now(),
  salvo_por               uuid,
  salvo_em                timestamptz,

  origem_migracao_v1      text,
  criado_por              uuid,
  criado_em               timestamptz not null default now(),
  editado_por             uuid,
  editado_em              timestamptz,

  constraint plan_ano_valido        check (ano_letivo between 2020 and 2099),
  constraint plan_versao_positiva   check (versao >= 1),
  constraint plan_semana_iso        check (semana_ano between 1 and 53),
  constraint plan_tempos_validos    check (tempos_alocados >= 0),
  constraint plan_tempos_motor_validos check (tempos_alocados_motor is null or tempos_alocados_motor >= 0),
  -- Linha de disciplina EXIGE disciplina; as demais naturezas NÃO a admitem.
  constraint plan_disciplina_coerente
    check ((tipo_linha =  'disciplina' and disciplina_id is not null)
        or (tipo_linha <> 'disciplina' and disciplina_id is null)),
  -- `data_inicio_semana` é a segunda-feira da semana ISO. Redundância DELIBERADA (torna a
  -- linha legível sem recalcular ISO); o CHECK garante que a redundância seja verdadeira.
  constraint plan_semana_e_segunda
    check (extract(isodow from data_inicio_semana) = 1),
  constraint plan_semana_bate_com_data
    check (semana_ano = extract(week from data_inicio_semana)::smallint)
);

comment on table  public.planejamento_anual is
  'Saída persistente e VERSIONADA do motor preditivo multi-ano. Substitui a aba temporária '
  '`Planejamento_2027`, apagada a cada execução. Reverte RN-2027-07: gerar de novo cria '
  '`versao = N+1` e preserva o histórico. v2.0: §4.1 (Missão 1). Origem: RF-2027-04/05.';
comment on column public.planejamento_anual.status_previa is
  '`rascunho` = editável; `salvo` = planejamento oficial do ano; `arquivado` = versão '
  'superada. INVARIANTE garantida por gatilho: no máximo UMA versão `salvo` por ano letivo.';
comment on column public.planejamento_anual.tempos_alocados is
  'Valor CORRENTE — pode ter sido editado pelo Encarregado.';
comment on column public.planejamento_anual.tempos_alocados_motor is
  'Valor ORIGINAL gerado pelo motor. NUNCA atualizado por edição manual. A diferença entre '
  'esta coluna e `tempos_alocados` é o diff motor × humano — informação que a v1.0 destruía '
  'a cada regeneração e que é o insumo direto para calibrar o motor.';
comment on column public.planejamento_anual.origem_linha is
  '`motor_editado` é gravado AUTOMATICAMENTE por gatilho quando tempos_alocados diverge de '
  'tempos_alocados_motor — nunca depende de a aplicação lembrar de marcar.';
comment on column public.planejamento_anual.tipo_linha is
  '`evento_manual` atende RF-2027-05: ocorrências que o motor não prevê (licenças '
  'administrativas de ocasião, por exemplo).';
comment on column public.planejamento_anual.turma_prevista_id is
  'NULL enquanto a turma real não existir; nesse intervalo o planejamento usa '
  '`rotulo_turma_prevista` (`T1`, `T2`).';
comment on column public.planejamento_anual.data_inicio_semana is
  'Segunda-feira da semana ISO. Redundância DELIBERADA em relação a `semana_ano`: torna a '
  'linha legível sem recalcular ISO. Os dois CHECKs garantem que a redundância seja sempre '
  'verdadeira — redundância sem verificação é a origem de toda segunda fonte de verdade.';

alter table public.planejamento_anual enable row level security;

create trigger trg_planejamento_anual_auditoria
  before insert or update on public.planejamento_anual
  for each row execute function app.set_auditoria();

-- ---------------------------------------------------------------------------------
-- Unicidade lógica (v2.0 §4.1) — aplicada SÓ às linhas de disciplina.
-- Por quê parcial: nas linhas que não são de disciplina (`evento_manual`, `feriado`,
-- `reserva_proens`, `licenca_pagamento`) `disciplina_id` é NULL, e várias delas na mesma
-- semana são legítimas — um teto total colapsaria todos os eventos manuais de uma semana
-- em um só.
-- ---------------------------------------------------------------------------------
create unique index uq_planejamento_disciplina_semana
  on public.planejamento_anual (ano_letivo, versao, curso_id, disciplina_id, semana_ano)
  where tipo_linha = 'disciplina';

create index idx_plan_ano_versao  on public.planejamento_anual (ano_letivo, versao);
create index idx_plan_curso_ano   on public.planejamento_anual (curso_id, ano_letivo);
create index idx_plan_turma       on public.planejamento_anual (turma_prevista_id)
  where turma_prevista_id is not null;
-- A consulta mais frequente do Cronograma: "o planejamento OFICIAL deste ano".
create index idx_plan_oficial     on public.planejamento_anual (ano_letivo, curso_id, semana_ano)
  where status_previa = 'salvo';


-- =====================================================================================
-- GATILHO — invariante "no máximo uma versão `salvo` por ano letivo"
-- -------------------------------------------------------------------------------------
-- O QUÊ  : recusa promover uma versão a `salvo` se já houver OUTRA versão salva no ano.
-- PARA QUÊ: é a invariante declarada na v2.0 §4.1. Não pode ser um índice único: uma
--          versão salva tem MUITAS linhas, todas com `status_previa = 'salvo'` — um
--          UNIQUE(ano_letivo) rejeitaria a segunda linha da própria versão correta.
--          A invariante é sobre VERSÃO, não sobre linha.
-- COMO   : gatilho por linha que ignora linhas da mesma versão e só recusa quando existe
--          uma versão DIFERENTE já salva no mesmo ano.
-- =====================================================================================

create or replace function app.validar_versao_salva_unica()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_outra smallint;
begin
  if new.status_previa <> 'salvo' then
    return new;                       -- rascunho e arquivado não competem pela oficialidade
  end if;

  select p.versao into v_outra
    from public.planejamento_anual p
   where p.ano_letivo    = new.ano_letivo
     and p.versao       <> new.versao
     and p.status_previa = 'salvo'
   limit 1;

  if v_outra is not null then
    raise exception
      'O ano letivo % já possui a versão % como planejamento oficial; arquive-a antes de salvar a versão %.',
      new.ano_letivo, v_outra, new.versao
      using errcode = '23505',
            hint = 'A promoção a `salvo` deve arquivar a versão anterior NA MESMA TRANSAÇÃO. Origem: v2.0 §4.1 e §6.2; RN-2027-07 revertida.';
  end if;

  return new;
end;
$$;

comment on function app.validar_versao_salva_unica() is
  'Invariante: no máximo UMA versão `salvo` por ano letivo em `planejamento_anual`. Não '
  'pode ser índice único porque a invariante é sobre VERSÃO, não sobre linha. '
  'Origem: v2.0 §4.1; RN-2027-07 revertida.';

create trigger trg_planejamento_versao_salva
  before insert or update of status_previa on public.planejamento_anual
  for each row execute function app.validar_versao_salva_unica();


-- =====================================================================================
-- GATILHO — marcação automática de `origem_linha = 'motor_editado'`
-- -------------------------------------------------------------------------------------
-- O QUÊ  : grava `motor_editado` quando `tempos_alocados` diverge de `tempos_alocados_motor`.
-- PARA QUÊ: a v2.0 declara essa marcação como AUTOMÁTICA. Deixá-la a cargo da aplicação
--          significaria que uma tela nova poderia esquecer e apagar silenciosamente o
--          rastro do diff motor × humano — exatamente o dado que esta tabela existe para
--          preservar.
-- COMO   : BEFORE INSERT OR UPDATE, e só quando a linha veio do motor (linhas `manual`
--          não são "motor editado" — nasceram humanas).
-- =====================================================================================

create or replace function app.marcar_origem_linha_planejamento()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  -- Linha genuinamente manual permanece manual: não existe "motor editado" sem motor.
  if new.origem_linha = 'manual' then
    return new;
  end if;

  if new.tempos_alocados_motor is not null
     and new.tempos_alocados is distinct from new.tempos_alocados_motor then
    new.origem_linha := 'motor_editado';
  elsif new.tempos_alocados_motor is not null then
    new.origem_linha := 'motor';
  end if;

  return new;
end;
$$;

comment on function app.marcar_origem_linha_planejamento() is
  'Grava `origem_linha = motor_editado` automaticamente quando o valor corrente diverge do '
  'valor original do motor. Preserva o diff motor × humano sem depender da aplicação. '
  'Origem: v2.0 §4.1 e §6.2.';

create trigger trg_planejamento_origem_linha
  before insert or update of tempos_alocados, tempos_alocados_motor on public.planejamento_anual
  for each row execute function app.marcar_origem_linha_planejamento();


-- =====================================================================================
-- FIM DE 02_tabelas_fato.sql
-- Próximo: 03_config_e_calendario.sql
-- =====================================================================================
