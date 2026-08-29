-- =====================================================================================
-- M1 — Fundacao: extensoes, schema `app`, dominios e auditoria
-- Epico 1 · specs/002-schema-rls-permissoes · FR-001 a FR-006, FR-044, FR-047, FR-054
-- -------------------------------------------------------------------------------------
-- O QUE  : o alicerce de tipos e funcoes de que TODAS as tabelas de M2 a M6 dependem.
-- PARA QUE: garantir no motor o que na v2.0 era disciplina de codigo — dominio fechado,
--          carimbo de auditoria e imutabilidade de historico.
-- -------------------------------------------------------------------------------------
-- ORIGEM E REVISAO. Derivado de `docs/sql-referencia/00_extensoes_e_tipos.sql`, que foi
-- aplicado e validado contra um PostgreSQL 16 real. E ponto de partida REVISADO, nao
-- copia (research.md §1). Revisoes desta migration:
--
--   1. O GRANT de `extensions` para `authenticated` foi TRAZIDO PARA CA, do arquivo 05.
--      Sem ele TODO cadastro de usuario real falha, enquanto migration, semente e ETL
--      passam — porque rodam como dono do schema. Foi o defeito que o teste T-04
--      encontrou. Ele pertence a fundacao, nao a camada de acesso: a funcao que o exige
--      (`app.normalizar_texto`) nasce AQUI (FR-044, doc 22 §7.3).
--   2. `status_turma` conferido em quatro valores. "arquivada" NAO entra — TURMA-1 foi
--      decidida em 28/08/2026 como filtro de apresentacao, nao valor de dominio (FR-047).
--
-- Construcoes conferidas contra o PostgreSQL **17** local em 29/08/2026 (tarefa T004):
-- `btree_gist` no schema `extensions`, `EXCLUDE` com `daterange`, `GENERATED ... STORED`,
-- indice unico parcial, `num_nonnulls()` e cadeia de chaves compostas. Todas passam.
-- -------------------------------------------------------------------------------------
-- REVERSAO (FR-056):
--   drop schema app cascade;
--   drop type public.<cada dominio criado abaixo>;
--   -- as extensoes ficam: sao inofensivas e outras migrations podem depender delas.
--   Segura enquanto a base estiver vazia, que e o estado desta fatia.
-- =====================================================================================

-- =====================================================================================
-- BLOCO 1 — EXTENSÕES
-- -------------------------------------------------------------------------------------
-- O QUÊ  : habilita quatro extensões nativas do PostgreSQL.
-- PARA QUÊ: cada uma resolve uma necessidade concreta e já identificada do domínio —
--          nenhuma está aqui "por precaução".
-- COMO   : instaladas no schema `extensions`, convenção do Supabase que mantém o
--          `public` limpo e evita colisão de nome com objetos da aplicação.
-- =====================================================================================

create schema if not exists extensions;

-- gen_random_uuid() — gerador das chaves primárias (BRIEF §2: `id uuid default gen_random_uuid()`).
create extension if not exists "pgcrypto" with schema extensions;

-- unaccent() — remove acentuação. Serve ao casamento por nome normalizado exigido pela
-- RN-AVAL-01 (vínculo Avaliacoes ↔ Avaliacoes_Planejadas, que não tem FK formal) e à
-- busca textual tolerante das telas de cadastro.
create extension if not exists "unaccent" with schema extensions;

-- btree_gist — permite combinar igualdade (uuid, text) com sobreposição de intervalo (&&)
-- dentro de uma mesma constraint EXCLUDE. É o que torna possível proibir, no motor, duas
-- vigências de regime sobrepostas para o mesmo curso (C-08 / RN-2027-09).
create extension if not exists "btree_gist" with schema extensions;

-- pg_trgm — índice de similaridade para busca por trecho de nome (disciplina, instrutor)
-- nas tabelas densas do sistema. Volume pequeno (BRIEF §10), mas melhora a UX de filtro.
create extension if not exists "pg_trgm" with schema extensions;


-- -------------------------------------------------------------------------------------
-- O GRANT QUE NINGUEM LEMBRA E DERRUBA TUDO (FR-044 · doc 22 §7.3 · teste T-04).
--
-- RLS e filtro sobre um privilegio que ja existe — ela nao concede nada por si. No
-- Supabase, `unaccent` vive no schema `extensions`, e `app.normalizar_texto()` chama
-- `extensions.unaccent()` NO CONTEXTO DE QUEM FAZ O INSERT, nao de quem definiu a funcao.
--
-- Sem este GRANT, TODO INSERT de usuario autenticado falha com
-- `permission denied for schema extensions` — enquanto migration, seed e ETL PASSAM,
-- porque rodam como dono do schema. So o usuario real quebra, em producao, no primeiro
-- cadastro. Nenhuma revisao de codigo pega isso: so teste com sessao autenticada de
-- verdade, que e por isso que FR-044 existe.
--
-- Guardado por `do $$` porque o papel `authenticated` nao existe num PostgreSQL puro
-- (pgTAP fora do Supabase) — degradacao segura aplicada a propria infraestrutura.
-- -------------------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant usage on schema extensions to authenticated';
    execute 'grant execute on all functions in schema extensions to authenticated';
  end if;
end;
$$;


-- =====================================================================================
-- BLOCO 2 — SCHEMA `app`
-- -------------------------------------------------------------------------------------
-- O QUÊ  : cria o schema `app`, casa de todas as funções auxiliares e de gatilho.
-- PARA QUÊ: separar fisicamente "lógica do banco" (funções) de "dado do banco" (tabelas,
--          que ficam em `public` para serem expostas pelo PostgREST/supabase-js).
--          É o schema nomeado no BRIEF §3 para `app.usuario_atual()`, `app.perfil_atual()`,
--          `app.pode()` e `app.cursos_do_usuario()` — funções que o arquivo 05_rls.sql
--          criará e que dependem deste schema já existir.
-- COMO   : `CREATE SCHEMA IF NOT EXISTS`, idempotente, seguro em reaplicação.
-- -------------------------------------------------------------------------------------
-- NOTA DE CONVENÇÃO: os TIPOS (ENUM) ficam em `public`, não em `app`. Motivo prático:
-- o `supabase gen types typescript` os expõe automaticamente como
-- `Database["public"]["Enums"]`, sem exigir `--schema app` na geração. Como o contrato de
-- dados da v2.1 É o tipo gerado (é o que aposenta a aba `_Meta_Colunas` da v2.0, C-02),
-- manter os ENUMs em `public` é o que faz esse contrato chegar ao TypeScript de graça.
-- =====================================================================================

create schema if not exists app;

comment on schema app is
  'CIAARA-11 v2.1 — funções auxiliares, de gatilho e de domínio. As tabelas ficam em `public`; '
  'as funções de autorização (app.pode, app.cursos_do_usuario) são criadas em 05_rls.sql. '
  'Origem: BRIEF v2.1 §3.';


-- =====================================================================================
-- BLOCO 3 — DOMÍNIOS NORMATIVOS FECHADOS (ENUM obrigatórios do BRIEF §2)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : os sete ENUMs nomeados explicitamente no BRIEF §2.
-- PARA QUÊ: são domínios cujo conjunto de valores é fixado por NORMA (DGPM/DEnsM/PROENS)
--          ou pela estrutura organizacional — ninguém os administra pela tela. Um valor
--          novo aqui é uma mudança normativa, e mudança normativa deve virar migration
--          revisável, não um INSERT silencioso.
-- COMO   : `CREATE TYPE ... AS ENUM`. Acrescentar valor futuro = `ALTER TYPE ... ADD VALUE`.
-- -------------------------------------------------------------------------------------
-- CONVENÇÃO DE RÓTULO (decisão registrada, ver documento 21 §9):
--   • Domínios que carregam sigla institucional preservam a grafia oficial em MAIÚSCULA
--     (`AEC`, `TAD`, `TR`) — o BRIEF §9 proíbe abreviar ou substituir esses termos, e a
--     grafia É o termo.
--   • Todos os demais rótulos usam `snake_case` minúsculo sem acento, igual à convenção
--     de identificadores do BRIEF §2.
-- =====================================================================================

-- ---------------------------------------------------------------------------------
-- status_registro — exclusão lógica universal (BRIEF §2; C-05 da v2.0; RN-INST-05).
-- Nada é apagado no CIAARA-11. Uma linha "removida" é uma linha `inativo`.
-- Note que o estado NUNCA é inferido de NULL: a coluna é NOT NULL com default.
-- ---------------------------------------------------------------------------------
create type public.status_registro as enum ('ativo', 'inativo');
comment on type public.status_registro is
  'Exclusão lógica universal. `inativo` substitui o DELETE em todo o sistema. '
  'Origem: BRIEF v2.1 §2; convenção C-05 da v2.0; RN-INST-05.';

-- ---------------------------------------------------------------------------------
-- categoria_normativa — as quatro grandezas de tempo NÃO letivo (RN-EVT-01).
-- Resolve o achado (n) do documento 05: a coluna `Tipo` da v1.0 misturava quatro
-- grandezas normativas distintas num balde só. Aqui elas são separadas por norma.
-- `Estudo_Individual` é categoria própria e FICA DE FORA da soma CHT (RN-EVT-01).
-- ---------------------------------------------------------------------------------
create type public.categoria_normativa as enum ('AEC', 'TAD', 'TR', 'Estudo_Individual');
comment on type public.categoria_normativa is
  'Grandeza normativa do lançamento não letivo. AEC = Atividades Extraclasse (teto 10%); '
  'TAD = Tempo para a Administração (teto 5% da CHR); TR = Tempo Reserva (teto 10% da CHR); '
  'Estudo_Individual = categoria própria, fora da fórmula CHT = CHD + AEC + TAD + TR. '
  'Origem: BRIEF v2.1 §9; RN-EVT-01; documento 05 §7.1 (de-para dos 663 lançamentos).';

-- ---------------------------------------------------------------------------------
-- tipo_reserva — reservas anuais do PROENS por curso (v2.0 `Calendario_Reservas`).
-- Subconjunto estrito de categoria_normativa: só TAD e TR são reservados a priori.
-- ---------------------------------------------------------------------------------
create type public.tipo_reserva as enum ('TAD', 'TR');
comment on type public.tipo_reserva is
  'Tipo de reserva anual de tempos concedida pelo PROENS a um curso. '
  'Origem: BRIEF v2.1 §2; v2.0 `Calendario_Reservas`; RF-DADOS-04.';

-- ---------------------------------------------------------------------------------
-- modo_atribuicao — como a carga de uma disciplina se reparte entre seus instrutores.
-- `herdar` só é válido no VÍNCULO (instrutor_disciplina); a DISCIPLINA precisa declarar
-- um modo concreto, por isso a tabela `disciplinas` carrega um CHECK que o proíbe.
-- ---------------------------------------------------------------------------------
create type public.modo_atribuicao as enum ('herdar', 'dividido', 'simultaneo');
comment on type public.modo_atribuicao is
  'Repartição da carga entre instrutores. `dividido` = cada um ministra parte da CH; '
  '`simultaneo` = todos em sala ao mesmo tempo (disciplinas práticas de encerramento: '
  'LHFC, Prática de Fim de Curso, Prática de Manutenção de Auxílios à Navegação); '
  '`herdar` = o vínculo segue `disciplinas.modo_atribuicao_padrao`. Origem: RN-MAT-05.';

-- ---------------------------------------------------------------------------------
-- perfil_usuario — os perfis organizacionais da matriz do documento 01 §2.2.
-- Criado AQUI (e não no arquivo de autenticação) porque o BRIEF §2 o classifica como
-- domínio normativo fechado e porque `04_views_e_funcoes.sql` e `05_rls.sql` dependem
-- dele. A tabela `usuarios` que o consome é criada na migration de autenticação.
-- ---------------------------------------------------------------------------------
create type public.perfil_usuario as enum (
  'admin',                                  -- papel técnico, sem correspondência regimental
  'chefe_departamento_ensino',              -- CIAARA-10 — leitura total, escrita nenhuma
  'encarregado_administracao_academica',    -- CIAARA-11 — dono do sistema
  'ajudante_administracao_academica',       -- apoio da CIAARA-11, permissão idêntica ao encarregado
  'encarregado_orientacao_pedagogica',      -- CIAARA-12
  'ajudante_orientacao_pedagogica',         -- apoio da CIAARA-12
  'operador',                               -- lançamento diário; restrito por `escopo_curso`
  'encarregado_curso',                      -- leitura restrita aos cursos sob coordenação
  'visualizacao'                            -- leitura total, escrita nenhuma
);
comment on type public.perfil_usuario is
  'Perfis de RBAC. Espelha a matriz do documento 01 §2.2 da v2.0 (nove perfis efetivos; '
  '"~12" no BRIEF §3 conta as variações Encarregado/Ajudante por divisão separadamente). '
  'A permissão é definida POR ÁREA DE DADOS na tabela `perfil_permissao` (05_rls.sql), '
  'nunca globalmente por perfil. Origem: RN-RBAC-02; documento 01 §2.2/§2.3.';

-- ---------------------------------------------------------------------------------
-- escopo_curso — recorte de curso do perfil Operador e classificação do próprio curso.
-- Um único domínio serve às duas pontas de propósito: `usuarios.escopo_curso` diz o que
-- o operador alcança, `cursos.classificacao` diz onde o curso se enquadra. É o casamento
-- desses dois valores que a policy RLS do Operador vai avaliar.
-- ---------------------------------------------------------------------------------
create type public.escopo_curso as enum (
  'geral',                  -- alcança todos os cursos (só faz sentido em `usuarios`)
  'regular',
  'expedito',
  'estagio_qualificacao',
  'ead_semipresencial'
);
comment on type public.escopo_curso is
  'Recorte de curso. Em `usuarios.escopo_curso` define o alcance do Operador; em '
  '`cursos.classificacao` define o enquadramento do curso (o valor `geral` é proibido lá '
  'por CHECK). Reaproveitar um único domínio nas duas pontas é o que permite escrever a '
  'policy de escopo como uma comparação simples. Origem: BRIEF v2.1 §3; documento 01 §2.2.';

-- ---------------------------------------------------------------------------------
-- impacto_feriado — efeito de uma data institucional sobre a capacidade letiva do dia.
-- Absorve `Eventos_Globais.Impacto` da v1.0 (`Dia Inteiro`, `Nenhum (informativo)`).
-- ---------------------------------------------------------------------------------
create type public.impacto_feriado as enum ('dia_inteiro', 'parcial', 'informativo');
comment on type public.impacto_feriado is
  'Impacto da data sobre a capacidade letiva: `dia_inteiro` zera o dia no motor preditivo; '
  '`parcial` reduz; `informativo` não altera cálculo algum. '
  'Origem: BRIEF v2.1 §2; v2.0 `Calendario_Feriados`; RF-DADOS-04.';


-- =====================================================================================
-- BLOCO 4 — DOMÍNIOS ESTRUTURAIS FECHADOS (ENUM adicionais)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : ENUMs além dos sete nomeados no BRIEF §2.
-- PARA QUÊ: o BRIEF fixa o CRITÉRIO ("ENUM para domínio normativo fechado; tabela
--          `config_listas` para domínio operacional administrável"). Os domínios abaixo
--          satisfazem o critério: são fechados pela ESTRUTURA do software ou pela norma,
--          e nenhum deles é administrável por tela — acrescentar um valor exige mudar
--          código que faz `switch` sobre ele. Colocá-los em `config_listas` daria ao
--          usuário um botão que quebra o sistema.
-- COMO   : mesma mecânica do bloco 3. A decisão está registrada no documento 21 §9.
-- -------------------------------------------------------------------------------------
-- CONTRAEXEMPLO deliberado (para deixar o critério claro): metodologias de ensino, tipos
-- de atividade e tipos de avaliação NÃO viram ENUM. São administráveis, mudam sem norma
-- nova, e por isso vivem em `config_listas` com FK — exatamente como manda o BRIEF §2.
-- =====================================================================================

-- Vigência de configuração: `cancelado` ≠ `inativo`, porque cancelar uma vigência é um
-- ato com significado normativo próprio (a configuração nunca valeu), distinto de
-- desativar um cadastro. C-05 / C-08.
create type public.status_vigencia as enum ('ativo', 'cancelado');
comment on type public.status_vigencia is
  'Situação de uma linha de vigência temporal. `cancelado` = a vigência foi anulada e não '
  'deve ser considerada pela resolução por data. Origem: C-05 e C-08 da v2.0.';

-- Regime de horário: padrão do curso × exceção autorizada por currículo.
-- Substitui o par de COLUNAS `Regime_Padrao_*`/`Regime_Excecao_*` da v1.0 por duas LINHAS.
create type public.tipo_regime as enum ('padrao', 'excecao');
comment on type public.tipo_regime is
  'Natureza do regime de horário. `excecao` é o regime autorizado explicitamente pelo '
  'currículo do curso (ex.: 9º TA opcional de apoio em CAHO, C-Ap-HN e C-Ap-FR). '
  'Origem: RN-2027-08/09; RF-HOR-03; documento 05 achado (j).';

-- Turno do tempo de aula. Existe para o DSA desenhar a janela de almoço sem INFERIR
-- período a partir do horário de relógio (RF-HOR-04).
create type public.periodo_dia as enum ('manha', 'tarde');
comment on type public.periodo_dia is
  'Turno do TA. Permite ao DSA delimitar a janela de almoço 12h00–13h00 sem inferência '
  'por horário. Origem: v2.0 §4.3; RF-HOR-04.';

-- Natureza do TA na configuração de horário. `excepcional` marca o 9º TA.
create type public.tipo_tempo as enum ('normal', 'excepcional');
comment on type public.tipo_tempo is
  'Natureza do TA. `excepcional` marca o 9º TA opcional de apoio, que dispara ALERTA '
  'INFORMATIVO e NUNCA bloqueio (BRIEF §9; RN-DEG-02; RF-HOR-03.1).';

-- Configuração de horário: nunca se edita uma config, cria-se uma sucessora versionada.
create type public.status_config_horario as enum ('ativo', 'substituido');
comment on type public.status_config_horario is
  'Ciclo de vida da configuração de horário. `substituido` = uma versão sucessora (`-v2`) '
  'assumiu. A linha original nunca é editada nem apagada. Origem: v2.0 §4.3.';

-- Ciclo de vida da turma. Os quatro valores observados na base viva (11 Planejada,
-- 7 Ativa, 7 Concluida, 3 Cancelada). "Arquivada" NAO entra — TURMA-1 FECHADO em
-- 28/08/2026: e filtro de apresentacao (VIEW), nao valor de dominio.
create type public.status_turma as enum ('planejada', 'ativa', 'concluida', 'cancelada');
comment on type public.status_turma is
  'Ciclo de vida da turma. Domínio fechado nos QUATRO valores observados na base viva. '
  'O valor "arquivada", citado no rascunho de funcionalidades, NÃO foi incluído: o achado '
  'TURMA-1 foi FECHADO em 28/08/2026 (Bernardo): "Arquivada" e filtro de apresentacao, '
  'resolvido por VIEW sobre turmas concluidas, e NAO valor deste dominio.';

-- Situação de execução de uma avaliação (RN-AVAL-01 revisada).
create type public.status_avaliacao as enum
  ('pendente', 'em_andamento', 'concluida', 'atrasada', 'cancelada');
comment on type public.status_avaliacao is
  'Situação de execução da avaliação. Migração da v1.0: `Planejada`→pendente, '
  '`Aplicada`→em_andamento, `Vista Realizada`→concluida. Origem: RN-AVAL-01 revisada.';

-- Situação da vista de prova. NÃO é coluna gravada: é calculada por fn_status_vista(),
-- porque depende da data corrente. Ver documento 21 §7 e §9.
create type public.status_vista as enum ('pendente', 'realizada', 'atrasada');
comment on type public.status_vista is
  'Situação da vista/comentário de prova. Domínio de RETORNO da função app.fn_status_vista() '
  '— nunca uma coluna gravada, porque depende de CURRENT_DATE e teria duas fontes de '
  'verdade. Regra dos 7 dias corridos. Origem: RF-AVAL-03; v2.0 §4.4 (`Status_Vista`).';

-- Alcance de um lançamento não letivo.
create type public.escopo_atividade as enum ('global', 'turma');
comment on type public.escopo_atividade is
  '`global` = aplica-se a todas as turmas ativas na data (turma_id fica NULL); '
  '`turma` = lançamento de uma turma específica (turma_id obrigatório). '
  'Nas 663 linhas migradas o valor é `turma` em 100%. Origem: v2.0 §4.5; RF-DADOS-03.';

-- Natureza do fato registrado no diário de execução. As DUAS exigem disciplina vinculada.
create type public.categoria_registro_aula as enum ('aula', 'atividade_extraclasse');
comment on type public.categoria_registro_aula is
  'Natureza do fato letivo. Ambas EXIGEM disciplina vinculada — é isso que as separa de '
  '`atividades_nao_letivas`. O valor "Avaliação" da v1.0 NÃO existe aqui: avaliação passou '
  'a viver exclusivamente em `avaliacoes` (RN-AVAL-02, fusão da Missão 3).';

-- Natureza da linha do planejamento anual gerado pelo motor preditivo.
create type public.tipo_linha_planejamento as enum
  ('disciplina', 'evento_manual', 'reserva_proens', 'feriado', 'licenca_pagamento');
comment on type public.tipo_linha_planejamento is
  'Natureza da linha do planejamento. `evento_manual` atende RF-2027-05 (ocorrências que o '
  'motor não prevê). `disciplina` é a única que exige `disciplina_id`. Origem: v2.0 §4.1.';

-- Procedência da linha do planejamento — preserva o diff motor × humano.
create type public.origem_linha_planejamento as enum ('motor', 'motor_editado', 'manual');
comment on type public.origem_linha_planejamento is
  '`motor_editado` é gravado por gatilho quando tempos_alocados <> tempos_alocados_motor. '
  'É o insumo para calibrar o motor preditivo — informação que a v1.0 destruía a cada '
  'regeneração. Origem: v2.0 §4.1 e §6.2.';

-- Ciclo de vida da versão de planejamento anual (RN-2027-07 revertida).
create type public.status_planejamento as enum ('rascunho', 'salvo', 'arquivado');
comment on type public.status_planejamento is
  '`rascunho` = editável; `salvo` = planejamento oficial vigente do ano; `arquivado` = '
  'versão superada. INVARIANTE: no máximo UMA versão `salvo` por ano letivo, garantida por '
  'índice único parcial em `planejamento_anual`. Origem: v2.0 §4.1; RN-2027-07 revertida.';

-- Papel funcional na assinatura do rodapé do DSA impresso (RF-DSA-06).
create type public.papel_assinatura as enum
  ('elaborador', 'encarregado_divisao', 'encarregado_curso', 'chefe_departamento');
comment on type public.papel_assinatura is
  'Papel na assinatura do DSA impresso. `elaborador` + `encarregado_divisao` são o par '
  'mínimo exigido por RF-DSA-06. Origem: v2.0 §4.6 (Missão 5, achado (b)).';

-- Como a assinatura é preenchida na hora da impressão.
create type public.modo_preenchimento_assinatura as enum ('fixo', 'dinamico_usuario_logado');
comment on type public.modo_preenchimento_assinatura is
  'É a coluna que AUTOMATIZA a assinatura. `fixo` usa os dados nominais da própria linha; '
  '`dinamico_usuario_logado` monta Posto + Especialidade + Nome de Guerra a partir do '
  'usuário da sessão em tempo de impressão. Origem: v2.0 §4.6; RF-DSA-06.';

-- Qualidade do casamento agendamento × execução na fusão da Missão 3.
create type public.conciliacao_migracao as enum
  ('par_exato', 'par_inferido', 'sem_execucao', 'execucao_orfa');
comment on type public.conciliacao_migracao is
  'Rastro da qualidade da fusão de 111 agendamentos com 186 execuções legadas. '
  '`par_inferido` = casou com tolerância de ±3 dias; `sem_execucao` = recebeu '
  'tempos_consumidos = 3 por padrão normativo (valor INFERIDO, não medido, RN-2027-04); '
  '`execucao_orfa` = prova aplicada e lançada que nunca foi agendada. '
  'Alimenta a conferência humana pós-migração. Origem: v2.0 §4.4 e §6.3.';

-- Natureza da transformação registrada no log de migração.
create type public.acao_migracao as enum
  ('transportado', 'transformado', 'conciliado', 'arquivado', 'corrigido');
comment on type public.acao_migracao is
  'Natureza do evento de migração. É a evidência auditável de que 100% do histórico foi '
  'transportado. Origem: v2.0 §5.11 (`_Migracao_Log`); RF-DADOS-05; RNF-CONF-01.';

-- Procedência da janela de datas de uma disciplina numa turma (achado LIQ-1).
create type public.origem_periodo as enum ('herdado_grade', 'manual', 'nao_informado');
comment on type public.origem_periodo is
  'De onde veio a data prevista de início/término da disciplina naquela turma. Separa dado '
  'REAL de AUSÊNCIA sem adivinhação: das 210 linhas geradas, 89 herdaram e 121 nasceram '
  '`nao_informado` — que é precisamente o trabalho que a regra de bloqueio da LIQ cobra. '
  'Origem: achado LIQ-1 (v2.0 §8), aplicado à planilha ao vivo em 2026-08-20.';

-- Regime de trabalho do docente. Domínio normativo: cada valor tem uma FAIXA de carga
-- horária semanal própria (RNF-NORM-03), guardada em `config_parametros` — a chave do
-- parâmetro é exatamente o rótulo deste ENUM, o que torna o join determinístico.
create type public.regime_trabalho_docente as enum ('20h', '40h', 'dedicacao_exclusiva');
comment on type public.regime_trabalho_docente is
  'Regime de trabalho do docente. Faixas de carga horária semanal: 20h → 8 a 12 h; '
  '40h → 16 a 24 h; dedicacao_exclusiva → 16 a 30 h. Corrige o defeito histórico em que o '
  'NÚMERO do regime (20, 40) era usado diretamente como teto. Os limites NÃO ficam aqui: '
  'ficam em `config_parametros`, chaveados por estes rótulos (RNF-NORM-08). '
  'Origem: RNF-NORM-03; RN-2027-06 revisada; BRIEF v2.1 §9.';

-- Modalidade de oferta do curso e da turma.
create type public.modalidade_ensino as enum ('presencial', 'ead', 'semipresencial');
comment on type public.modalidade_ensino is
  'Modalidade de oferta. Cursos `ead` puros (4 na base) não têm regime de TA — só '
  '`limite_diario_ead_horas`. PENDENTE DE CONFIRMAÇÃO: a v2.0 não declara o domínio '
  'fechado desta coluna; estes três valores são os observados na base.';

-- Critério de priorização de alocação do motor preditivo, configurável por curso.
create type public.criterio_prioridade_alocacao as enum
  ('carga_restante_por_dia_util', 'ordem_sugerida', 'manual');
comment on type public.criterio_prioridade_alocacao is
  'Critério que o motor preditivo usa para decidir qual disciplina ocupa cada espaço livre. '
  '`carga_restante_por_dia_util` é o comportamento atual e fixo da v1.0 (RN-2027-05) e '
  'permanece como default, garantindo não regressão. PENDENTE DE CONFIRMAÇÃO: RF-CRONOS-08 '
  'pede que o critério seja configurável por curso, mas a v2.0 declarou o ENUM sem listar '
  'os valores. Origem: RF-CRONOS-08; v2.0 §5.1 (`Prioridade_Alocacao`).';


-- =====================================================================================
-- BLOCO 5 — FUNÇÃO DE IDENTIDADE DO USUÁRIO CORRENTE
-- -------------------------------------------------------------------------------------
-- O QUÊ  : `app.uid_atual()` devolve o uuid do usuário autenticado, ou NULL.
-- PARA QUÊ: alimentar o carimbo de auditoria (`criado_por`, `editado_por`) sem depender
--          do schema `auth` já existir no momento em que ESTA migration roda.
-- COMO   : lê a claim `sub` do JWT exatamente como o `auth.uid()` do Supabase faz, mas
--          direto de `current_setting`, com fallback e proteção contra exceção. Em um
--          PostgreSQL sem Supabase (pgTAP local, CI), devolve NULL em vez de estourar —
--          é degradação segura aplicada à própria infraestrutura (RN-DEG-01).
-- =====================================================================================

create or replace function app.uid_atual()
returns uuid
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid;
begin
  -- Caminho 1: claim individual, formato usado pelo PostgREST em versões recentes.
  begin
    v_uid := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  exception when others then
    v_uid := null;                 -- claim ausente ou não conversível: segue sem erro
  end;

  -- Caminho 2: objeto JSON completo de claims, formato alternativo do PostgREST.
  if v_uid is null then
    begin
      v_uid := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid;
    exception when others then
      v_uid := null;
    end;
  end if;

  return v_uid;                    -- NULL = execução fora de sessão autenticada (ETL, cron, psql)
end;
$$;

comment on function app.uid_atual() is
  'uuid do usuário autenticado (claim `sub` do JWT), ou NULL fora de sessão autenticada. '
  'Equivalente a auth.uid(), mas sem acoplar esta migration à ordem de criação do schema '
  '`auth` — o que permite rodar a suíte pgTAP em PostgreSQL puro. Origem: BRIEF v2.1 §3.';


-- =====================================================================================
-- BLOCO 6 — GATILHO DE AUDITORIA UNIVERSAL
-- -------------------------------------------------------------------------------------
-- O QUÊ  : `app.set_auditoria()` preenche o quarteto de auditoria em qualquer tabela.
-- PARA QUÊ: substituir a convenção C-06 da v2.0 (quarteto `Registrado_Por`,
--          `Timestamp_Registro`, `Editado_Por`, `Timestamp_Edicao` preenchido pelo Apps
--          Script) por uma GARANTIA DO MOTOR. No Sheets, esquecer de carimbar era um bug
--          silencioso; aqui é impossível — o gatilho roda antes de a linha existir.
-- COMO   : converte NEW em jsonb, mexe só nas chaves que existirem naquela tabela e
--          reconstrói o registro. Essa generalidade é o que permite UMA função servir às
--          22 tabelas sem uma versão por tabela.
-- -------------------------------------------------------------------------------------
-- REGRA DE IMUTABILIDADE: no UPDATE, `criado_por` e `criado_em` são FORÇADOS de volta ao
-- valor de OLD. Quem criou a linha e quando não se reescreve — nem por engano, nem por
-- má-fé. É a mesma disciplina que a v2.0 aplicava ao `_Migracao_Log` (§6.7), aqui
-- generalizada para todo carimbo de criação.
-- =====================================================================================

-- ARMADILHA DOCUMENTADA (custou um bug real em teste — fica registrada para não se repetir):
-- `jsonb_set()` é STRICT e `to_jsonb(NULL::uuid)` devolve **SQL NULL**, não o jsonb `null`.
-- Sem proteção, `jsonb_set(acumulador, '{editado_por}', to_jsonb(v_uid))` com `v_uid` nulo
-- transforma o ACUMULADOR INTEIRO em NULL, descartando em silêncio todos os carimbos já
-- aplicados — e `v_uid` é nulo exatamente no caminho mais importante: ETL, cron e psql, que
-- rodam fora de sessão autenticada. O invólucro `app.jsonb_valor()` abaixo elimina a classe
-- inteira de defeito convertendo SQL NULL em jsonb `null` antes de qualquer `jsonb_set`.

create or replace function app.jsonb_valor(p_valor jsonb)
returns jsonb
language sql
immutable
parallel safe
as $$
  select coalesce(p_valor, 'null'::jsonb);
$$;

comment on function app.jsonb_valor(jsonb) is
  'Converte SQL NULL em jsonb `null`. Existe porque `jsonb_set()` é STRICT: um valor SQL '
  'NULL anularia o documento inteiro em vez de gravar `null` na chave.';

create or replace function app.set_auditoria()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_novo    jsonb;
  v_antigo  jsonb;
  v_uid     uuid := app.uid_atual();
  v_agora   timestamptz := now();     -- now() = instante da TRANSAÇÃO: todas as linhas de
                                      -- um mesmo lote recebem o mesmo carimbo, o que torna
                                      -- o lote reconhecível na auditoria.
begin
  v_novo := to_jsonb(new);

  if tg_op = 'INSERT' then
    -- Carimbo de criação. `criado_por` só é preenchido se veio NULL: o ETL Python
    -- (BRIEF §1) precisa poder informar explicitamente o autor histórico da linha.
    if v_novo ? 'criado_em' then
      v_novo := jsonb_set(v_novo, '{criado_em}', app.jsonb_valor(to_jsonb(v_agora)));
    end if;
    if v_novo ? 'criado_por' and (v_novo ->> 'criado_por') is null then
      v_novo := jsonb_set(v_novo, '{criado_por}', app.jsonb_valor(to_jsonb(v_uid)));
    end if;
    -- Numa criação não existe edição: o par de edição nasce vazio, sempre.
    if v_novo ? 'editado_em' then
      v_novo := jsonb_set(v_novo, '{editado_em}', 'null'::jsonb);
    end if;
    if v_novo ? 'editado_por' then
      v_novo := jsonb_set(v_novo, '{editado_por}', 'null'::jsonb);
    end if;

  elsif tg_op = 'UPDATE' then
    v_antigo := to_jsonb(old);
    -- Carimbo de criação é IMUTÁVEL: devolve à força o valor original.
    if v_novo ? 'criado_em' then
      v_novo := jsonb_set(v_novo, '{criado_em}', app.jsonb_valor(v_antigo -> 'criado_em'));
    end if;
    if v_novo ? 'criado_por' then
      v_novo := jsonb_set(v_novo, '{criado_por}', app.jsonb_valor(v_antigo -> 'criado_por'));
    end if;
    -- Carimbo de edição é sempre reescrito pelo motor, nunca aceito da aplicação.
    if v_novo ? 'editado_em' then
      v_novo := jsonb_set(v_novo, '{editado_em}', app.jsonb_valor(to_jsonb(v_agora)));
    end if;
    if v_novo ? 'editado_por' then
      v_novo := jsonb_set(v_novo, '{editado_por}', app.jsonb_valor(to_jsonb(v_uid)));
    end if;
  end if;

  -- Reconstrói o registro tipado a partir do jsonb ajustado.
  new := jsonb_populate_record(new, v_novo);
  return new;
end;
$$;

comment on function app.set_auditoria() is
  'Gatilho BEFORE INSERT OR UPDATE que preenche criado_por/criado_em/editado_por/editado_em. '
  'Genérico por inspeção jsonb: serve a qualquer tabela, preenchendo apenas as colunas que '
  'ela tiver. O carimbo de CRIAÇÃO é imutável em UPDATE. '
  'Substitui a convenção C-06 da v2.0 por garantia do motor.';


-- =====================================================================================
-- BLOCO 7 — GATILHO DE IMUTABILIDADE (append-only)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : `app.bloquear_reescrita()` recusa UPDATE e DELETE.
-- PARA QUÊ: a integridade do histórico é invariável no CIAARA-11 (BRIEF §9): "nenhuma
--          linha de `migracao_log` já gravada é reescrita; corrige-se logando novo evento".
--          Na v2.0 isso era uma REGRA que uma pessoa podia violar abrindo a planilha.
--          Aqui é uma exceção do banco.
-- COMO   : gatilho BEFORE UPDATE OR DELETE que sempre levanta erro, com SQLSTATE próprio
--          (`P0001` de aplicação) e mensagem em português dizendo o que fazer no lugar.
-- -------------------------------------------------------------------------------------
-- Aplicado em `migracao_log` e `arquivo_avaliacoes_v1` (03_config_e_calendario.sql).
-- =====================================================================================

create or replace function app.bloquear_reescrita()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception
    'A tabela %.% é somente-inclusão: linhas já gravadas não podem ser alteradas nem removidas (operação recusada: %).',
    tg_table_schema, tg_table_name, tg_op
    using
      errcode = 'P0001',
      hint    = 'Para corrigir um registro histórico, INSIRA um novo evento descrevendo a correção. Origem: BRIEF v2.1 §9 (integridade do histórico); v2.0 §6.7.';
end;
$$;

comment on function app.bloquear_reescrita() is
  'Gatilho BEFORE UPDATE OR DELETE que torna uma tabela append-only. Usado em `migracao_log` '
  'e `arquivo_avaliacoes_v1`. Origem: BRIEF v2.1 §9; v2.0 §6.7.';


-- =====================================================================================
-- BLOCO 8 — NORMALIZAÇÃO DE TEXTO (IMUTÁVEL)
-- -------------------------------------------------------------------------------------
-- O QUÊ  : `app.normalizar_texto()` devolve o texto sem acento, minúsculo e sem espaço
--          redundante.
-- PARA QUÊ: a RN-AVAL-01 casa `avaliacoes` com `avaliacoes_planejadas` POR NOME
--          NORMALIZADO, porque não existe FK formal entre elas. Sem uma normalização
--          única e determinística, "Navegação Costeira" e "navegacao  costeira" seriam
--          disciplinas diferentes — e o casamento falharia silenciosamente.
-- COMO   : `unaccent()` é declarada STABLE (depende de dicionário), então não pode ir
--          direto em índice nem em coluna gerada. Este invólucro a declara IMMUTABLE
--          fixando o dicionário explicitamente — a técnica padrão para o caso.
-- -------------------------------------------------------------------------------------
-- CUIDADO OPERACIONAL: se o dicionário `unaccent` for alterado no servidor, índices que
-- usem esta função precisam de REINDEX. Na prática o dicionário é estático.
-- =====================================================================================

create or replace function app.normalizar_texto(p_texto text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog, public, extensions
as $$
  select nullif(
           btrim(
             regexp_replace(
               lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_texto, ''))),
               '\s+', ' ', 'g'                    -- colapsa qualquer sequência de espaço em um só
             )
           ),
           ''                                     -- string vazia vira NULL: ausência é NULL, não ''
         );
$$;

comment on function app.normalizar_texto(text) is
  'Normaliza texto para casamento e busca: minúsculo, sem acento, espaços colapsados, '
  'vazio convertido em NULL. IMMUTABLE (dicionário fixado), portanto utilizável em índice '
  'e em coluna GENERATED. Origem: RN-AVAL-01 (casamento por nome normalizado).';


-- =====================================================================================
-- FIM DE M1. Proxima: M2 — cadastro e unidades de ensino.
-- Conferencia desta camada: `supabase/tests/010_estrutura.sql`.
-- =====================================================================================
