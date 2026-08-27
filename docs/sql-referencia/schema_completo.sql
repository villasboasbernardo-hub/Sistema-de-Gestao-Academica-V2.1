-- #####################################################################################
-- CIAARA-11 v2.1 — SCHEMA COMPLETO (arquivo único)
-- #####################################################################################
-- Versão : 2.1 · 26/08/2026
-- Gerado : concatenação, NA ORDEM, dos seis scripts de `sql/`. Não edite este arquivo —
--          edite as partes e gere de novo, senão as duas versões divergem em silêncio.
--
-- COMO USAR
--   Opção A (recomendada) — Supabase CLI, versionado:
--       supabase migration new schema_inicial
--       # cole o conteúdo no arquivo criado em supabase/migrations/
--       supabase db push
--   Opção B — SQL Editor do painel do Supabase: cole tudo e execute de uma vez.
--
-- PRÉ-REQUISITOS no projeto Supabase (já vêm prontos num projeto novo):
--   · schema `auth` com `auth.users` e a função `auth.uid()`
--   · papéis `anon`, `authenticated`, `service_role`
--   · schema `extensions` (as extensões são criadas pelo bloco 00)
--
-- CONTEÚDO
--   00  extensões, schema `app`, ENUMs, funções de auditoria
--   01  tabelas de cadastro   (cursos, turmas, disciplinas, instrutores, vínculos)
--   02  tabelas de fato       (registros de aula, avaliações, atividades, planejamento)
--   03  configuração, calendário do PROENS e tabelas técnicas de migração
--   04  views e funções de domínio
--   05  autenticação (`usuarios`, `usuario_curso`), GRANTs, policies RLS e seed do RBAC
--
-- VALIDADO contra PostgreSQL 16: aplica limpo, em ordem, com 0 erro.
-- #####################################################################################



-- ═══════════════════════════════════════════════════════════════════════════════════
-- ▼▼▼  00_extensoes_e_tipos.sql
-- ═══════════════════════════════════════════════════════════════════════════════════

-- =====================================================================================
-- CIAARA-11 v2.1 — 00_extensoes_e_tipos.sql
-- Extensões, schema `app`, domínios (ENUM), funções utilitárias e gatilho de auditoria.
-- -------------------------------------------------------------------------------------
-- O QUÊ  : primeiro arquivo da migration Supabase. Cria o alicerce de tipos e funções
--          de que TODAS as tabelas dos arquivos 01, 02 e 03 dependem.
-- PARA QUÊ: garantir, no motor do banco, aquilo que na v2.0 (Google Sheets) só existia
--          como disciplina de código ou validação de célula — domínios fechados,
--          carimbo de auditoria e imutabilidade de histórico.
-- COMO   : `CREATE TYPE ... AS ENUM` para domínio normativo/estrutural fechado;
--          funções em PL/pgSQL no schema `app`, com `search_path` fixo (exigência de
--          segurança do BRIEF §3 para toda função `SECURITY DEFINER`).
-- -------------------------------------------------------------------------------------
-- Ordem de aplicação: 00 → 01 → 02 → 03 → 04 → 05 (RLS, de outro autor).
-- Origem: BRIEF v2.1 §2 (Convenções de banco) e §3 (Autenticação e RBAC).
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
-- 7 Ativa, 7 Concluida, 3 Cancelada). "Arquivada" NÃO entra — ver achado TURMA-1.
create type public.status_turma as enum ('planejada', 'ativa', 'concluida', 'cancelada');
comment on type public.status_turma is
  'Ciclo de vida da turma. Domínio fechado nos QUATRO valores observados na base viva. '
  'O valor "arquivada", citado no rascunho de funcionalidades, NÃO foi incluído: o achado '
  'TURMA-1 (v2.0 §7) segue ABERTO, aguardando decisão. Acrescentá-lo depois é '
  '`ALTER TYPE ... ADD VALUE`, aditivo e sem risco.';

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
-- FIM DE 00_extensoes_e_tipos.sql
-- Próximo: 01_tabelas_cadastro.sql
-- =====================================================================================


-- ═══════════════════════════════════════════════════════════════════════════════════
-- ▼▼▼  01_tabelas_cadastro.sql
-- ═══════════════════════════════════════════════════════════════════════════════════

-- =====================================================================================
-- CIAARA-11 v2.1 — 01_tabelas_cadastro.sql
-- Entidades de cadastro: cursos, regime de horário, turmas, disciplinas, instrutores,
-- vínculos de habilitação, responsáveis pela assinatura do DSA.
-- -------------------------------------------------------------------------------------
-- O QUÊ  : cria as tabelas que descrevem o "dever-ser" do ensino — o que existe, quem
--          ministra, sob qual regime, em que janela.
-- PARA QUÊ: são o alicerce referencial de TODOS os fatos (arquivo 02). Uma FK quebrada
--          aqui orfana histórico; por isso toda FK declara `ON DELETE` explícito e, na
--          prática, nenhuma delas jamais dispara — nada é apagado neste sistema (C-05).
-- COMO   : `id uuid` como PK técnica + `codigo text unique` guardando o `ID_*` da v2.0
--          (BRIEF §2). FKs apontam para `id`, NUNCA para `codigo`.
-- -------------------------------------------------------------------------------------
-- Pré-requisito: 00_extensoes_e_tipos.sql aplicado.
-- Origem: v2.0 `docs/arquitetura/01-schema.md` §4 e §5; BRIEF v2.1 §2.
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
  constraint turmas_unica_por_ano     unique (curso_id, ano_letivo, turma)
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
  'funcionalidades NÃO foi incluído — achado TURMA-1 (v2.0 §7) segue ABERTO.';

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
  constraint disciplinas_modo_padrao_concreto check (modo_atribuicao_padrao <> 'herdar')
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
-- TABELA 7 — `turma_disciplina`  (v2.0: `Turma_Disciplina`, achado LIQ-1)
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
-- FIM DE 01_tabelas_cadastro.sql
-- Próximo: 02_tabelas_fato.sql
-- =====================================================================================


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


-- ═══════════════════════════════════════════════════════════════════════════════════
-- ▼▼▼  02_tabelas_fato.sql
-- ═══════════════════════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════════════════════
-- ▼▼▼  03_config_e_calendario.sql
-- ═══════════════════════════════════════════════════════════════════════════════════

-- =====================================================================================
-- CIAARA-11 v2.1 — 03_config_e_calendario.sql
-- Configuração administrável, matriz de permissões, calendário anual do PROENS e
-- tabelas técnicas de migração.
-- -------------------------------------------------------------------------------------
-- O QUÊ  : cria as tabelas que tiram do CÓDIGO aquilo que é DADO — listas de domínio,
--          parâmetros normativos, permissões, feriados, janelas e reservas anuais — mais
--          as duas tabelas append-only que guardam a memória da migração.
-- PARA QUÊ: é o Princípio VII do projeto aplicado ao banco: um teto normativo, uma
--          permissão ou um feriado de 2028 não podem exigir editar e reimplantar
--          software. Aqui viram UPDATE e INSERT.
-- COMO   : `config_listas` (domínio operacional), `config_parametros` (valores
--          normativos), `perfil_permissao` (autorização como dado) e as três tabelas de
--          calendário que aposentam as constantes `FERIADOS_2027`, `SEMENTES_2027` e
--          `RESERVAS_PROENS` do `Código.gs`.
-- -------------------------------------------------------------------------------------
-- Pré-requisito: 00, 01 e 02 aplicados.
-- Origem: v2.0 §5.8 a §5.11; BRIEF v2.1 §2 e §3; RF-DADOS-04; RNF-MAN-04; RNF-NORM-08.
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
-- FIM DE 03_config_e_calendario.sql
-- Próximo: 04_views_e_funcoes.sql
-- =====================================================================================


-- ═══════════════════════════════════════════════════════════════════════════════════
-- ▼▼▼  04_views_e_funcoes.sql
-- ═══════════════════════════════════════════════════════════════════════════════════

-- =====================================================================================
-- CIAARA-11 v2.1 — 04_views_e_funcoes.sql
-- Funções de apoio à autorização, funções de domínio, views de leitura e gatilhos finais.
-- -------------------------------------------------------------------------------------
-- O QUÊ  : cria (a) as funções auxiliares que as policies RLS do arquivo 05 consomem;
--          (b) as funções de domínio que resolvem regime, antiguidade e situação de
--          vista; (c) as views que substituem as colunas-FÓRMULA da v2.0; (d) os
--          gatilhos que dependem de objetos criados aqui.
-- PARA QUÊ: no Google Sheets, uma fórmula era o único jeito de exibir dado derivado — e
--          cada fórmula era uma segunda fonte de verdade em potencial. Em PostgreSQL,
--          derivado é VIEW ou coluna GENERATED. Nunca uma coluna gravada em paralelo.
-- COMO   : funções em `app` com `search_path` fixo; views em `public` para serem lidas
--          pelo PostgREST com a RLS das tabelas-base aplicada.
-- -------------------------------------------------------------------------------------
-- FRONTEIRA DELIBERADA — O QUE **NÃO** ESTÁ AQUI:
-- as regras de PLANEJAMENTO (distribuição semanal de carga, motor preditivo, sugestão do
-- DSA, detecção de conflito) NÃO são implementadas em SQL. A RN-DIST-01 é explícita:
-- existe UMA função compartilhada de distribuição e "não pode existir uma segunda
-- implementação em paralelo". Essa função vive em `lib/dominio/` (BRIEF §4), pura e
-- testável sem banco. O SQL aqui AGREGA fatos já registrados; ele não planeja.
-- -------------------------------------------------------------------------------------
-- Pré-requisito: 00, 01, 02 e 03 aplicados.
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
  select r.turma_id, r.data, r.ta_inicial, r.ta_final, r.tempos_consumidos,
         'aula'::text        as origem, r.id as fato_id, r.disciplina_id, r.instrutor_id
    from public.registros_aula r
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
  d.nome_disciplina,
  d.curso_id
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
create or replace view public.vw_disciplinas_execucao
with (security_invoker = true) as
with aulas as (
  select r.disciplina_id, r.turma_id,
         min(r.data) as primeira_data,
         max(r.data) as ultima_data,
         sum(r.tempos_consumidos) as ta
    from public.registros_aula r
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
-- FIM DE 04_views_e_funcoes.sql
-- Próximo: 05_rls.sql — policies de Row Level Security (OUTRO AUTOR).
-- Este arquivo NÃO concede GRANT algum: privilégios de tabela e policies pertencem
-- integralmente ao 05, para que a superfície de segurança tenha um único dono.
-- =====================================================================================


-- ═══════════════════════════════════════════════════════════════════════════════════
-- ▼▼▼  05_rls_policies.sql
-- ═══════════════════════════════════════════════════════════════════════════════════

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
