-- =================================================================================
-- CARGA DAS UNIDADES DE ENSINO — 587 linhas, 138 disciplinas
--
-- ⚠️ GERADA, NAO ESCRITA A MAO. Refaca com:
--      python -m scripts.etl.gerar_carga_de_unidades_ensino \
--        20260926024246_carga_unidades_ensino.sql > supabase/migrations/20260926024246_carga_unidades_ensino.sql
--    A entrada e `scripts/etl/dados/pareamento_ue.csv`, revisado e versionado (T018).
--
-- O QUE  : (1) insere as UEs dos curriculos oficiais da DEnsM; (2) marca os dois cursos
--          por competencias; (3) marca as disciplinas que nao tem UE por natureza; e
--          (4) registra um evento por curriculo em `migracao_log`.
--
-- POR QUE: a decisao UE-1 (rota (b), 26/08/2026) poe `registros_aula` no grao de UE, e a
--          UE nao existe em aba nenhuma da v2.0 — ela vive nos curriculos aprovados pela
--          DEnsM. Esta carga e a unica origem autorizada (D-B4).
--
-- ⚠️ NAO ALTERA CH, NOME NEM CODIGO DE DISCIPLINA (P-1, Q-13). Onde a soma das UEs
--    divergir da CH da disciplina, a TELA avisa (Q-06) e Bernardo corrige — nunca um
--    script. Foram medidas 8 divergencias de CH na conferencia; nenhuma e tocada aqui.
--
-- ⚠️ A CH DA UE ENTRA SEM CONVERSAO: 1 TA = 1 hora (Q-12). O curriculo diz "10 HORAS" e
--    `ch_prevista_tempos` recebe 10. Soma de todas: 7411.
--
-- ⚠️ O NUMERO DA UE E O DO CURRICULO, e nao e renumerado. Nos dois desdobramentos isso
--    aparece: `2 - CAHO - FIS` fica com a UE numero **2** e `24 - C-Ap-HN - I-I` com a
--    numero **7**, porque e essa a posicao delas no curriculo de origem. Renumerar para 1
--    ficaria mais bonito na tela e perderia a rastreabilidade ao PDF — e seria inferencia.
--
-- ⚠️ ABORTA se algum destino declarado nao existir em `disciplinas` NA HORA DE APLICAR. O
--    `join` por codigo descartaria a linha em silencio, e carga silenciosamente incompleta
--    e o pior resultado possivel: contagem menor, nenhum erro.
--
-- REVERSAO (executada numa base descartavel antes do PR):
--    delete from public.unidades_ensino where origem_migracao_v1 = '20260926024246_carga_unidades_ensino.sql';
--    update public.cursos set curriculo_modelo = 'unidades_de_ensino'
--     where codigo in ('C-Espc-FR', 'C-Espc-HN');
--    update public.disciplinas set sem_unidades_ensino = false where codigo in (...);
--    ⚠️ O `delete` vale **enquanto nenhuma aula apontar** para a UE: `registros_aula`
--       tem FK `restrict` para `unidades_ensino`, entao o proprio banco recusa depois
--       disso — e e assim que a regra 4 protege o historico. A partir do Epico 6, a
--       reversao passa a ser exclusao LOGICA (`status = 'inativo'`).
--    ⚠️ O evento de `migracao_log` NAO e apagado: corrigir ali e logar evento novo
--       (regra 5).
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- PARTE A — o porteiro: todo destino declarado tem de existir ANTES de inserir
-- ---------------------------------------------------------------------------------
-- ⚠️ **ELE SE ABSTEM NUMA BASE SEM CADASTROS, E ISSO NAO E COMPLACENCIA.** Toda migration
--    roda tambem no `db reset`, contra uma base VAZIA, antes de o ETL carregar qualquer
--    coisa: ali nenhum destino existe, e abortar derrubaria `db:reset:limpo` e o CI
--    inteiro. A distincao que importa e outra: **base sem cadastro nenhum** e estado
--    legitimo e a carga simplesmente nao se aplica; **base COM cadastros e faltando um
--    destino declarado** e inconsistencia, e aborta nomeando qual.
-- ⚠️ E POR ISSO A CARGA TEM DOIS CAMINHOS, como a marcacao `simultaneo` do PR 1: a
--    migration carrega no REMOTO, que tem os cadastros, e no LOCAL quem carrega e a
--    ETAPA 6 do `scripts/etl/executar.py`, que aplica **este mesmo arquivo** depois do
--    ETL. Nao ha segunda copia do dado — ha uma segunda EXECUCAO do mesmo SQL.
do $porteiro$
declare
  v_faltando text;
begin
  if not exists (select 1 from public.disciplinas) then
    raise notice 'carga de UE: base sem cadastros, a carga nao se aplica aqui (db reset). No local ela vem pela ETAPA 6 do ETL.';
    return;
  end if;

  select string_agg(codigo, ', ' order by codigo) into v_faltando
    from (values
      ('1 - CAHO - MAT'),
      ('10 - CAHO - VIII'),
      ('100 - C-Esp-ALH - ALH-VII'),
      ('101 - C-Esp-ALH - ALH-VIII'),
      ('102 - C-Esp-ALH - ALH-IX'),
      ('103 - C-Esp-ME - I'),
      ('104 - C-Esp-ME - II'),
      ('105 - C-Esp-ME - III'),
      ('106 - C-Esp-ME - IV'),
      ('107 - C-Esp-ME - V'),
      ('108 - C-Esp-ME - VI'),
      ('109 - C-Esp-ME - VII'),
      ('11 - CAHO - IX'),
      ('110 - C-Esp-ME - VIII'),
      ('111 - C-Esp-ME - IX'),
      ('112 - C-Esp-ME - X'),
      ('113 - C-Esp-ME - XI'),
      ('114 - C-Esp-ME - XII'),
      ('115 - C-Esp-OpAP - OPAP I'),
      ('116 - C-Esp-OpAP - OPAP II'),
      ('117 - C-Esp-OpAP - OPAP III'),
      ('118 - C-Esp-OpAP - OPAP IV'),
      ('119 - C-ApA-AuxNav-PR-SP - I'),
      ('12 - CAHO - X'),
      ('120 - C-ApA-AuxNav-PR-SP - II'),
      ('121 - C-ApA-AuxNav-PR-SP - III'),
      ('122 - C-ApA-AuxNav-PR-SP - IV'),
      ('123 - C-ApA-AuxNav-PR-SP - V'),
      ('124 - C-ApA-AuxNav-PR-SP - VI'),
      ('125 - C-ApA-AuxNav-PR-SP - VII'),
      ('126 - C-ApA-PCN-PR-EAD - PCN-PR-I-EAD'),
      ('127 - C-ApA-PCN-PR-EAD - PCN-PR-II-EAD'),
      ('128 - C-ApA-PCN-PR-EAD - PCN-PR-III-EAD'),
      ('129 - C-ApA-PCN-PR-EAD - PCN-PR-IV-EAD'),
      ('13 - CAHO - XI'),
      ('130 - C-ApA-PCN-PR-EAD - PCN-PR-V-EAD'),
      ('131 - C-ApA-PCN-PR-EAD - PCN-PR-VI-EAD'),
      ('132 - C-ApA-PCN-PR-EAD - PCN-PR-VII-EAD'),
      ('133 - C-ApA-PrevMe-PR-EAD - PrevMe I'),
      ('134 - C-ApA-PrevMe-PR-EAD - PrevMe II'),
      ('135 - C-ApA-PrevMe-PR-EAD - PrevMe III'),
      ('136 - C-ApA-PrevMe-PR-EAD - PrevMe IV'),
      ('137 - C-ApA-PrevMe-PR-EAD - PrevMe V'),
      ('138 - C-ApA-PrevMe-PR-EAD - PrevMe VI'),
      ('139 - C-ApA-PrevMe-PR-EAD - PrevMe VII'),
      ('14 - CAHO - XII'),
      ('140 - C-ApA-OcOp-PR-SP - I'),
      ('141 - C-ApA-OcOp-PR-SP - II'),
      ('142 - C-ApA-OcOp-PR-SP - III'),
      ('143 - C-ApA-OcOp-PR-SP - IV'),
      ('144 - C-ApA-OcOp-PR-SP - V'),
      ('145 - C-ApA-OcOp-PR-SP - VI'),
      ('146 - C-ApA-OcOp-PR-SP - VII'),
      ('147 - C-ApA-OcOp-PR-SP - VIII'),
      ('148 - C-ApA-OcOp-PR-SP - IX'),
      ('149 - C-ApA-OcOp-PR-SP - X'),
      ('15 - CAHO - XIII'),
      ('150 - EST-QF-APOC - I'),
      ('151 - EST-QF-APHID - I'),
      ('152 - EST-QF-APHID - II'),
      ('153 - EST-QF-APHID - III'),
      ('154 - EST-QF-APHID - IV'),
      ('155 - EST-QF-APHID - V'),
      ('156 - EST-QF-PROC-MF-EAD - I'),
      ('157 - EST-QF-EM2040PHS - I'),
      ('158 - EST-QF-EM2040PHS - II'),
      ('159 - EST-QF-EM2040PHS - III'),
      ('16 - CAHO - XIV'),
      ('160 - EST-QF-PGRS100 - I'),
      ('161 - EST-QF-PGRS100 - II'),
      ('162 - EST-QF-NAVFLU-EAD - I'),
      ('163 - EST-QF-MAREFLU - I'),
      ('17 - CAHO - XV'),
      ('18 - CAHO - XVI'),
      ('19 - CAHO - XVII'),
      ('2 - CAHO - FIS'),
      ('20 - CAHO - XVIII'),
      ('21 - CAHO - XIX'),
      ('22 - CAHO - XX'),
      ('23 - C-Ap-HN - I'),
      ('24 - C-Ap-HN - I-I'),
      ('25 - C-Ap-HN - II'),
      ('26 - C-Ap-HN - III'),
      ('27 - C-Ap-HN - IV'),
      ('28 - C-Ap-HN - V'),
      ('29 - C-Ap-HN - VI'),
      ('3 - CAHO - I'),
      ('30 - C-Ap-HN - VII'),
      ('31 - C-Ap-HN - VIII'),
      ('32 - C-Ap-HN - IX'),
      ('33 - C-Ap-HN - X'),
      ('34 - C-Ap-HN - XI'),
      ('35 - C-Ap-HN - XII'),
      ('36 - C-Ap-HN - XIII'),
      ('37 - C-Ap-HN - XIV'),
      ('38 - C-Ap-HN - XV'),
      ('39 - C-Ap-HN - XVI'),
      ('4 - CAHO - II'),
      ('40 - C-Ap-FR - X'),
      ('40 - C-Ap-HN - XVII'),
      ('41 - C-Ap-HN - XVIII'),
      ('42 - C-Ap-FR - I'),
      ('43 - C-Ap-FR - II'),
      ('44 - C-Ap-FR - III'),
      ('45 - C-Ap-FR - IV'),
      ('46 - C-Ap-FR - V'),
      ('47 - C-Ap-FR - VI'),
      ('48 - C-Ap-FR - VII'),
      ('49 - C-Ap-FR - VIII'),
      ('5 - CAHO - III'),
      ('50 - C-Ap-FR - IX'),
      ('51 - C-Ap-FR - XI'),
      ('52 - C-Ap-FR - XII'),
      ('53 - C-Ap-FR - XIII'),
      ('6 - CAHO - IV'),
      ('7 - CAHO - V'),
      ('8 - CAHO - VI'),
      ('83 - C-Exp-Ag-Mag - I'),
      ('84 - C-Exp-Ag-Mag - II'),
      ('85 - C-Exp-BATI - I'),
      ('86 - C-Exp-Metoc-OF-SP - I'),
      ('86 - C-Exp-MetocOf - I'),
      ('87 - C-Exp-Metoc-OF-SP - II'),
      ('87 - C-Exp-MetocOf - II'),
      ('88 - C-Exp-Metoc-OF-SP - III'),
      ('88 - C-Exp-MetocOf - III'),
      ('89 - C-Exp-Metoc-OF-SP - IV'),
      ('89 - C-Exp-MetocOf - IV'),
      ('9 - CAHO - VII'),
      ('90 - C-Exp-Metoc-OF-SP - V'),
      ('90 - C-Exp-MetocOf - V'),
      ('91 - C-ApA-AuxNav-PR-SP - -'),
      ('91 - C-ApA-OcOp-PR-SP - -'),
      ('91 - C-ApA-PCN-PR-EAD - -'),
      ('91 - C-ApA-PrevMe-PR-EAD - -'),
      ('91 - C-Exp-Metoc-OF-SP - -'),
      ('92 - C-Exp-Obs-ME - I'),
      ('93 - C-Exp-Obs-ME - II'),
      ('94 - C-Esp-ALH - ALH-I'),
      ('95 - C-Esp-ALH - ALH-II'),
      ('96 - C-Esp-ALH - ALH-II'),
      ('97 - C-Esp-ALH - ALH-IV'),
      ('98 - C-Esp-ALH - ALH-V'),
      ('99 - C-Esp-ALH - ALH-VI')
    ) as declarados(codigo)
   where not exists (select 1 from public.disciplinas d where d.codigo = declarados.codigo);

  if v_faltando is not null then
    raise exception 'carga de UE abortada: destino declarado que nao existe em disciplinas: %', v_faltando
      using hint = 'destino_inexistente';
  end if;
end
$porteiro$;

-- ---------------------------------------------------------------------------------
-- PARTE B — as UEs
--
-- `disciplina_id` e `curso_id` saem da MESMA linha de `disciplinas`, e por isso a FK
-- composta `ue_curso_coerente` fecha por construcao — nao ha como pendurar uma UE num
-- curso que nao e o da disciplina dela.
--
-- `on conflict (disciplina_id, numero_ue) do nothing` torna a carga idempotente. A
-- unicidade `ue_unica_na_disciplina` e TOTAL, nao parcial — conferido no catalogo, porque
-- `on conflict` contra unique parcial falha com `42P10`, que foi o que aconteceu duas
-- vezes no PR 1 desta fatia.
--
-- `codigo` NAO aparece na lista de colunas: ele vem do `DEFAULT`
-- `app.proximo_codigo_unidade_ensino()`, o gerador unico. Escrever o codigo aqui seria
-- inventar identificador (gotcha 9 / FR-012).
-- ---------------------------------------------------------------------------------
with entrada (destino, numero_ue, topico, ch, fundamento) as (values
  ('3 - CAHO - I', 1::smallint, 'SISTEMAS COMPUTACIONAIS', 10::smallint, 'Of no 10-6/2025'),
  ('3 - CAHO - I', 2::smallint, 'EDITOR DE TEXTO, PLANILHA E APLICATIVO GRÁFICO', 8::smallint, 'Of no 10-6/2025'),
  ('3 - CAHO - I', 3::smallint, 'SISTEMAS GERENCIADORES DE BANCO DE DADOS', 11::smallint, 'Of no 10-6/2025'),
  ('3 - CAHO - I', 4::smallint, 'PROGRAMAÇÃO', 16::smallint, 'Of no 10-6/2025'),
  ('4 - CAHO - II', 1::smallint, 'PROPRIEDADES DA ÁGUA DO MAR', 13::smallint, 'Of no 10-6/2025'),
  ('4 - CAHO - II', 2::smallint, 'O CAMPO DE DENSIDADE', 4::smallint, 'Of no 10-6/2025'),
  ('4 - CAHO - II', 3::smallint, 'CAMPO DE GRAVIDADE NO MAR', 3::smallint, 'Of no 10-6/2025'),
  ('4 - CAHO - II', 4::smallint, 'O CAMPO DE PRESSÃO', 2::smallint, 'Of no 10-6/2025'),
  ('4 - CAHO - II', 5::smallint, 'A EQUAÇÃO DO MOVIMENTO', 5::smallint, 'Of no 10-6/2025'),
  ('4 - CAHO - II', 6::smallint, 'O MOVIMENTO GEOSTRÓFICO', 3::smallint, 'Of no 10-6/2025'),
  ('4 - CAHO - II', 7::smallint, 'CORRENTES PRODUZIDAS PELO VENTO', 5::smallint, 'Of no 10-6/2025'),
  ('4 - CAHO - II', 8::smallint, 'CIRCULAÇÃO GERAL DOS OCEANOS', 10::smallint, 'Of no 10-6/2025'),
  ('4 - CAHO - II', 9::smallint, 'ONDAS', 10::smallint, 'Of no 10-6/2025'),
  ('4 - CAHO - II', 10::smallint, 'PLANEJAMENTO E EXECUÇÃO DE LEVANTAMENTO OCEANOGRÁFICO', 32::smallint, 'Of no 10-6/2025'),
  ('5 - CAHO - III', 1::smallint, 'INTRODUÇÃO À ANÁLISE ESTATÍSTICA', 4::smallint, 'Of no 10-6/2025'),
  ('5 - CAHO - III', 2::smallint, 'INTRODUÇÃO À TEORIA DAS PROBABILIDADES', 3::smallint, 'Of no 10-6/2025'),
  ('5 - CAHO - III', 3::smallint, 'VARIÁVEIS ALEATÓRIAS', 3::smallint, 'Of no 10-6/2025'),
  ('5 - CAHO - III', 4::smallint, 'DISTRIBUIÇÕES DE PROBABILIDADE', 5::smallint, 'Of no 10-6/2025'),
  ('5 - CAHO - III', 5::smallint, 'FUNÇÕES DE VARIÁVEIS ALEATÓRIAS', 5::smallint, 'Of no 10-6/2025'),
  ('5 - CAHO - III', 6::smallint, 'AMOSTRAGEM ESTATÍSTICA', 5::smallint, 'Of no 10-6/2025'),
  ('5 - CAHO - III', 7::smallint, 'ESTIMAÇÃO DE PARÂMETROS', 3::smallint, 'Of no 10-6/2025'),
  ('5 - CAHO - III', 8::smallint, 'TESTE DE HIPÓTESES', 3::smallint, 'Of no 10-6/2025'),
  ('5 - CAHO - III', 9::smallint, 'AJUSTE DE CURVAS, REGRESSÃO E CORRELAÇÃO', 8::smallint, 'Of no 10-6/2025'),
  ('6 - CAHO - IV', 1::smallint, 'CONCEITOS INTRODUTÓRIOS', 4::smallint, 'Of no 10-6/2025'),
  ('6 - CAHO - IV', 2::smallint, 'MEDIÇÃO DE ÂNGULOS', 20::smallint, 'Of no 10-6/2025'),
  ('6 - CAHO - IV', 3::smallint, 'MEDIÇÃO DE DISTÂNCIAS', 16::smallint, 'Of no 10-6/2025'),
  ('6 - CAHO - IV', 4::smallint, 'NIVELAMENTO', 16::smallint, 'Of no 10-6/2025'),
  ('6 - CAHO - IV', 5::smallint, 'POSICIONAMENTO TOPOGRÁFICO', 52::smallint, 'Of no 10-6/2025'),
  ('6 - CAHO - IV', 6::smallint, 'LEVANTAMENTO TOPOGRÁFICO', 40::smallint, 'Of no 10-6/2025'),
  ('7 - CAHO - V', 1::smallint, 'FUNDAMENTOS E OBSERVAÇÃO DO TEMPO', 14::smallint, 'Of no 10-6/2025'),
  ('7 - CAHO - V', 2::smallint, 'PRESSÃO ATMOSFÉRICA E VENTOS', 14::smallint, 'Of no 10-6/2025'),
  ('7 - CAHO - V', 3::smallint, 'VENTOS E A CIRCULAÇÃO GERAL DA ATMOSFERA', 12::smallint, 'Of no 10-6/2025'),
  ('7 - CAHO - V', 4::smallint, 'PREVISÃO DO TEMPO: SISTEMAS ATMOSFÉRICOS', 12::smallint, 'Of no 10-6/2025'),
  ('7 - CAHO - V', 5::smallint, 'PREVISÃO DO TEMPO: TÉCNICAS DE PREVISÃO', 14::smallint, 'Of no 10-6/2025'),
  ('7 - CAHO - V', 6::smallint, 'METEOROLOGIA APLICADA NA MB', 12::smallint, 'Of no 10-6/2025'),
  ('8 - CAHO - VI', 1::smallint, 'INTRODUÇÃO À GEODÉSIA', 10::smallint, 'Of no 10-6/2025'),
  ('8 - CAHO - VI', 2::smallint, 'GEODÉSIA GEOMÉTRICA', 13::smallint, 'Of no 10-6/2025'),
  ('8 - CAHO - VI', 3::smallint, 'GEODÉSIA FÍSICA', 8::smallint, 'Of no 10-6/2025'),
  ('8 - CAHO - VI', 4::smallint, 'SISTEMAS GEODÉSICOS DE REFERÊNCIA', 9::smallint, 'Of no 10-6/2025'),
  ('8 - CAHO - VI', 5::smallint, 'CÁLCULOS GEODÉSICOS', 17::smallint, 'Of no 10-6/2025'),
  ('8 - CAHO - VI', 6::smallint, 'POSICIONAMENTO GEODÉSICO COM SATÉLITES ARTIFICIAIS', 50::smallint, 'Of no 10-6/2025'),
  ('9 - CAHO - VII', 1::smallint, 'GEOLOGIA', 4::smallint, 'Of no 10-6/2025'),
  ('9 - CAHO - VII', 2::smallint, 'ESTRUTURA DA TERRA', 2::smallint, 'Of no 10-6/2025'),
  ('9 - CAHO - VII', 3::smallint, 'TECTÔNICA DE PLACAS', 4::smallint, 'Of no 10-6/2025'),
  ('9 - CAHO - VII', 4::smallint, 'FISIOGRAFIA DO FUNDO OCEÂNICO', 4::smallint, 'Of no 10-6/2025'),
  ('9 - CAHO - VII', 5::smallint, 'TIPOS DE MARGEM', 4::smallint, 'Of no 10-6/2025'),
  ('9 - CAHO - VII', 6::smallint, 'INTRODUÇÃO GERAL À GEOFÍSICA MARINHA', 1::smallint, 'Of no 10-6/2025'),
  ('9 - CAHO - VII', 7::smallint, 'GRAVIMETRIA OCEÂNICA', 4::smallint, 'Of no 10-6/2025'),
  ('9 - CAHO - VII', 8::smallint, 'MÉTODO MAGNETOMÉTRICO MARINHO', 4::smallint, 'Of no 10-6/2025'),
  ('9 - CAHO - VII', 9::smallint, 'MORFOLOGIA E PROCESSOS LITORÂNEOS', 5::smallint, 'Of no 10-6/2025'),
  ('9 - CAHO - VII', 10::smallint, 'SEDIMENTOLOGIA', 3::smallint, 'Of no 10-6/2025'),
  ('9 - CAHO - VII', 11::smallint, 'MÉTODO SÍSMICO MARINHO', 5::smallint, 'Of no 10-6/2025'),
  ('10 - CAHO - VIII', 1::smallint, 'CONCEITOS BÁSICOS DE AUXÍLIOS À NAVEGAÇÃO', 3::smallint, 'Of no 10-6/2025'),
  ('10 - CAHO - VIII', 2::smallint, 'OS AUXÍLIOS À NAVEGAÇÃO E O NAVEGANTE', 4::smallint, 'Of no 10-6/2025'),
  ('10 - CAHO - VIII', 3::smallint, 'ESTRUTURAS', 3::smallint, 'Of no 10-6/2025'),
  ('10 - CAHO - VIII', 4::smallint, 'EQUIPAMENTOS LUMINOSOS', 3::smallint, 'Of no 10-6/2025'),
  ('10 - CAHO - VIII', 5::smallint, 'PROJETOS DE AUXÍLIOS À NAVEGAÇÃO', 6::smallint, 'Of no 10-6/2025'),
  ('10 - CAHO - VIII', 6::smallint, 'ADMINISTRAÇÃO DOS AUXÍLIOS À NAVEGAÇÃO', 5::smallint, 'Of no 10-6/2025'),
  ('10 - CAHO - VIII', 7::smallint, 'NOVAS TECNOLOGIAS, SISTEMAS E MÉTODOS DE AUXÍLIOS À NAVEGAÇÃO', 6::smallint, 'Of no 10-6/2025'),
  ('11 - CAHO - IX', 1::smallint, 'CONCEITOS INTRODUTÓRIOS', 4::smallint, 'Of no 10-6/2025'),
  ('11 - CAHO - IX', 2::smallint, 'DATUM E COORDENADAS', 7::smallint, 'Of no 10-6/2025'),
  ('11 - CAHO - IX', 3::smallint, 'CONVENÇÕES CARTOGRÁFICAS', 5::smallint, 'Of no 10-6/2025'),
  ('11 - CAHO - IX', 4::smallint, 'PROJEÇÕES CARTOGRÁFICAS', 7::smallint, 'Of no 10-6/2025'),
  ('11 - CAHO - IX', 5::smallint, 'PROJEÇÃO DE MERCATOR', 6::smallint, 'Of no 10-6/2025'),
  ('11 - CAHO - IX', 6::smallint, 'PROJEÇÕES TRANSVERSAIS DE MERCATOR', 12::smallint, 'Of no 10-6/2025'),
  ('12 - CAHO - X', 1::smallint, 'O FENÔMENO DA MARÉ', 3::smallint, 'Of no 10-6/2025'),
  ('12 - CAHO - X', 2::smallint, 'FORÇAS GERADORAS DE MARÉ', 6::smallint, 'Of no 10-6/2025'),
  ('12 - CAHO - X', 3::smallint, 'MARÉ DE EQUILÍBRIO', 9::smallint, 'Of no 10-6/2025'),
  ('12 - CAHO - X', 4::smallint, 'MOVIMENTOS DA LUA E DO SOL', 8::smallint, 'Of no 10-6/2025'),
  ('12 - CAHO - X', 5::smallint, 'DESENVOLVIMENTO HARMÔNICO DA MARÉ', 6::smallint, 'Of no 10-6/2025'),
  ('12 - CAHO - X', 6::smallint, 'ANÁLISES ESPECTRAL E HARMÔNICA DA MARÉ', 14::smallint, 'Of no 10-6/2025'),
  ('12 - CAHO - X', 7::smallint, 'MARÉS EM ÁGUAS RASAS', 6::smallint, 'Of no 10-6/2025'),
  ('12 - CAHO - X', 8::smallint, 'MÉTODOS DE PREVISÃO DE MARÉS', 6::smallint, 'Of no 10-6/2025'),
  ('12 - CAHO - X', 9::smallint, 'CORRENTES DE MARÉ', 6::smallint, 'Of no 10-6/2025'),
  ('12 - CAHO - X', 10::smallint, 'ESTAÇÃO MAREGRÁFICA', 8::smallint, 'Of no 10-6/2025'),
  ('12 - CAHO - X', 11::smallint, 'REDUÇÃO DE SONDAGENS', 14::smallint, 'Of no 10-6/2025'),
  ('13 - CAHO - XI', 1::smallint, 'PUBLICAÇÕES DE AUXÍLIO À NAVEGAÇÃO', 5::smallint, 'Of no 10-6/2025'),
  ('13 - CAHO - XI', 2::smallint, 'LEGISLAÇÃO REFERENTE À SEGURANÇA DA NAVEGAÇÃO', 7::smallint, 'Of no 10-6/2025'),
  ('13 - CAHO - XI', 3::smallint, 'CONVENÇÃO DAS NAÇÕES UNIDAS SOBRE O DIREITO DO MAR (CNDUM)', 4::smallint, 'Of no 10-6/2025'),
  ('13 - CAHO - XI', 4::smallint, 'RESPONSABILIDADE CIVIL DO HIDRÓGRAFO', 6::smallint, 'Of no 10-6/2025'),
  ('13 - CAHO - XI', 5::smallint, 'CARTAS NÁUTICAS, SISTEMAS DE APRESENTAÇÃO DE CARTAS ELETRÔNICAS (ECDIS e ECS)', 12::smallint, 'Of no 10-6/2025'),
  ('13 - CAHO - XI', 6::smallint, 'SISTEMAS DE POSICIONAMENTO E DE MONITORAMENTO MARÍTIMO', 15::smallint, 'Of no 10-6/2025'),
  ('14 - CAHO - XII', 1::smallint, 'INTRODUÇÃO ÀS AGULHAS NÁUTICAS', 2::smallint, 'Of no 10-6/2025'),
  ('14 - CAHO - XII', 2::smallint, 'MAGNETISMO', 2::smallint, 'Of no 10-6/2025'),
  ('14 - CAHO - XII', 3::smallint, 'TEORIA DOS DESVIOS', 3::smallint, 'Of no 10-6/2025'),
  ('14 - CAHO - XII', 4::smallint, 'AGULHAS MAGNÉTICAS', 2::smallint, 'Of no 10-6/2025'),
  ('14 - CAHO - XII', 5::smallint, 'COMPENSAÇÃO DE AGULHAS MAGNÉTICAS', 8::smallint, 'Of no 10-6/2025'),
  ('14 - CAHO - XII', 6::smallint, 'EXECUÇÃO DA COMPENSAÇÃO', 15::smallint, 'Of no 10-6/2025'),
  ('15 - CAHO - XIII', 1::smallint, 'NOÇÕES DE ACÚSTICA', 7::smallint, 'Of no 10-6/2025'),
  ('15 - CAHO - XIII', 2::smallint, 'FUNDAMENTOS DE ACÚSTICA SUBMARINA', 13::smallint, 'Of no 10-6/2025'),
  ('15 - CAHO - XIII', 3::smallint, 'INTRODUÇÃO AO PROCESSAMENTO DE SINAIS ACÚSTICOS', 8::smallint, 'Of no 10-6/2025'),
  ('15 - CAHO - XIII', 4::smallint, 'A EQUAÇÃO SONAR', 4::smallint, 'Of no 10-6/2025'),
  ('15 - CAHO - XIII', 5::smallint, 'SISTEMAS ACÚSTICOS', 15::smallint, 'Of no 10-6/2025'),
  ('16 - CAHO - XIV', 1::smallint, 'AEROFOTOGRAMETRIA', 4::smallint, 'Of no 10-6/2025'),
  ('16 - CAHO - XIV', 2::smallint, 'CONCEITOS BÁSICOS PARA TRABALHO COM FOTOGRAFIAS', 7::smallint, 'Of no 10-6/2025'),
  ('16 - CAHO - XIV', 3::smallint, 'OPERAÇÕES AEROFOTOGRAMÉTRICAS NOS LH', 5::smallint, 'Of no 10-6/2025'),
  ('16 - CAHO - XIV', 4::smallint, 'SENSORIAMENTO REMOTO', 17::smallint, 'Of no 10-6/2025'),
  ('16 - CAHO - XIV', 5::smallint, 'APLICATIVOS DO SENSORIAMENTO REMOTO', 11::smallint, 'Of no 10-6/2025'),
  ('16 - CAHO - XIV', 6::smallint, 'TÉCNICAS NÃO ACÚSTICAS DE BATIMETRIA', 16::smallint, 'Of no 10-6/2025'),
  ('17 - CAHO - XV', 1::smallint, 'A CARTOGRAFIA NÁUTICA BRASILEIRA', 8::smallint, 'Of no 10-6/2025'),
  ('17 - CAHO - XV', 2::smallint, 'NORMAS DA ORGANIZAÇÃO HIDROGRÁFICA INTERNACIONAL', 6::smallint, 'Of no 10-6/2025'),
  ('17 - CAHO - XV', 3::smallint, 'BANCOS DE DADOS E INFRAESTRUTURAS DE DADOS ESPACIAIS MARINHOS (IDE)', 8::smallint, 'Of no 10-6/2025'),
  ('17 - CAHO - XV', 4::smallint, 'PROCESSO DA CARTOGRAFIA NÁUTICA BASEADO EM BANCOS DE DADOS ESPACIAIS', 13::smallint, 'Of no 10-6/2025'),
  ('18 - CAHO - XVI', 1::smallint, 'LEVANTAMENTO HIDROGRÁFICO (LH)', 8::smallint, 'Of no 10-6/2025'),
  ('18 - CAHO - XVI', 2::smallint, 'SISTEMA DE BATIMETRIA', 4::smallint, 'Of no 10-6/2025'),
  ('18 - CAHO - XVI', 3::smallint, 'DETERMINAÇÃO DA PROFUNDIDADE', 8::smallint, 'Of no 10-6/2025'),
  ('18 - CAHO - XVI', 4::smallint, 'SONDAGEM MONOFEIXE', 10::smallint, 'Of no 10-6/2025'),
  ('18 - CAHO - XVI', 5::smallint, 'SONDAGEM MULTIFEIXE', 46::smallint, 'Of no 10-6/2025'),
  ('18 - CAHO - XVI', 6::smallint, 'INSTALAÇÕES DE SENSORES HIDROGRÁFICOS', 24::smallint, 'Of no 10-6/2025'),
  ('18 - CAHO - XVI', 7::smallint, 'COMUNICAÇÕES, ELETRÔNICA E INFORMÁTICA', 12::smallint, 'Of no 10-6/2025'),
  ('18 - CAHO - XVI', 8::smallint, 'VARREDURA', 8::smallint, 'Of no 10-6/2025'),
  ('18 - CAHO - XVI', 9::smallint, 'OUTROS SISTEMAS DE LEVANTAMENTO', 4::smallint, 'Of no 10-6/2025'),
  ('18 - CAHO - XVI', 10::smallint, 'CARACTERIZAÇÃO ACÚSTICA DO FUNDO', 3::smallint, 'Of no 10-6/2025'),
  ('18 - CAHO - XVI', 11::smallint, 'PLANEJAMENTO DE LINHAS DE SONDAGEM E PRÁTICA EM SIMULADOR', 8::smallint, 'Of no 10-6/2025'),
  ('18 - CAHO - XVI', 12::smallint, 'PLANEJAMENTO DE LH', 14::smallint, 'Of no 10-6/2025'),
  ('18 - CAHO - XVI', 13::smallint, 'INSTRUÇÕES TÉCNICAS DA DHN', 4::smallint, 'Of no 10-6/2025'),
  ('18 - CAHO - XVI', 14::smallint, 'HIDROGRAFIA MILITAR', 6::smallint, 'Of no 10-6/2025'),
  ('18 - CAHO - XVI', 15::smallint, 'HIDROGRAFIA APLICADA', 40::smallint, 'Of no 10-6/2025'),
  ('18 - CAHO - XVI', 16::smallint, 'PROCESSAMENTO DE DADOS BATIMÉTRICOS', 40::smallint, 'Of no 10-6/2025'),
  ('19 - CAHO - XVII', 1::smallint, 'FUNDAMENTOS DA TEORIA DOS ERROS', 11::smallint, 'Of no 10-6/2025'),
  ('19 - CAHO - XVII', 2::smallint, 'PROPAGAÇÃO DE ERROS', 19::smallint, 'Of no 10-6/2025'),
  ('19 - CAHO - XVII', 3::smallint, 'QUANTIFICAÇÃO DA INCERTEZA POSICIONAL', 7::smallint, 'Of no 10-6/2025'),
  ('19 - CAHO - XVII', 4::smallint, 'AJUSTAMENTO TOPO-GEODÉSICO', 23::smallint, 'Of no 10-6/2025'),
  ('20 - CAHO - XVIII', 1::smallint, 'LEVANTAMENTO HIDROCEANOGRÁFICO DE FIM DE CURSO (LHFC)', 200::smallint, 'Of no 10-6/2025'),
  ('21 - CAHO - XIX', 1::smallint, 'CORRIDA', 35::smallint, 'Of no 10-6/2025'),
  ('21 - CAHO - XIX', 2::smallint, 'NATAÇÃO E PERMANÊNCIA DENTRO D’ÁGUA', 35::smallint, 'Of no 10-6/2025'),
  ('22 - CAHO - XX', 1::smallint, 'TÉCNICAS PARA ELABORAÇÃO DE MONOGRAFIAS', 2::smallint, 'Of no 10-6/2025'),
  ('22 - CAHO - XX', 2::smallint, 'NORMATIZAÇÃO DO TRABALHO CIENTÍFICO', 2::smallint, 'Of no 10-6/2025'),
  ('22 - CAHO - XX', 3::smallint, 'ESTRUTURA DO TRABALHO INDIVIDUAL', 4::smallint, 'Of no 10-6/2025'),
  ('22 - CAHO - XX', 4::smallint, 'PESQUISA, DESENVOLVIMENTO E ORIENTAÇÃO', 111::smallint, 'Of no 10-6/2025'),
  ('1 - CAHO - MAT', 1::smallint, 'EMPREGO DOS CONCEITOS DE MATEMÁTICA NA RESOLUÇÃO DE PROBLEMAS PRÁTICOS', 28::smallint, 'Of no 10-6/2025'),
  ('2 - CAHO - FIS', 2::smallint, 'EMPREGO DOS CONHECIMENTOS DE FÍSICA NA RESOLUÇÃO DE PROBLEMAS PRÁTICOS', 28::smallint, 'Of no 10-6/2025'),
  ('119 - C-ApA-AuxNav-PR-SP - I', 1::smallint, 'ORIENTAÇÕES E DOCUMENTOS DA IALA', 4::smallint, 'Of no 10-26/2022'),
  ('119 - C-ApA-AuxNav-PR-SP - I', 2::smallint, 'BOIAS DE POLIETILENO', 20::smallint, 'Of no 10-26/2022'),
  ('119 - C-ApA-AuxNav-PR-SP - I', 3::smallint, 'ATIVIDADE PRÁTICA DE PINTURA E REPARO', 10::smallint, 'Of no 10-26/2022'),
  ('120 - C-ApA-AuxNav-PR-SP - II', 1::smallint, 'ESTRATÉGIAS DE LEITURA', 28::smallint, 'Of no 10-26/2022'),
  ('121 - C-ApA-AuxNav-PR-SP - III', 1::smallint, 'APRESENTAÇÃO DOS TEMAS', 10::smallint, 'Of no 10-26/2022'),
  ('121 - C-ApA-AuxNav-PR-SP - III', 2::smallint, 'ORIENTAÇÃO DE FORMATAÇÃO, ESTRUTURAÇÃO E COMPOSIÇÃO DO TRABALHO DE FINAL DE CURSO', 70::smallint, 'Of no 10-26/2022'),
  ('122 - C-ApA-AuxNav-PR-SP - IV', 1::smallint, 'RADAR BEACON', 10::smallint, 'Of no 10-26/2022'),
  ('122 - C-ApA-AuxNav-PR-SP - IV', 2::smallint, 'AIS AtoN', 10::smallint, 'Of no 10-26/2022'),
  ('122 - C-ApA-AuxNav-PR-SP - IV', 3::smallint, 'ATIVIDADE PRÁTICA', 10::smallint, 'Of no 10-26/2022'),
  ('123 - C-ApA-AuxNav-PR-SP - V', 1::smallint, 'INTRODUÇÃO À RADIONAVEGAÇÃO E DGNSS', 24::smallint, 'Of no 10-26/2022'),
  ('124 - C-ApA-AuxNav-PR-SP - VI', 1::smallint, 'SISTEMAS DE ALIMENTAÇÃO DE CA', 6::smallint, 'Of no 10-26/2022'),
  ('124 - C-ApA-AuxNav-PR-SP - VI', 2::smallint, 'GERADORES FOTOVOLTAICOS E EÓLICOS', 8::smallint, 'Of no 10-26/2022'),
  ('124 - C-ApA-AuxNav-PR-SP - VI', 3::smallint, 'SISTEMAS GERADORES A DIESEL E GASOLINA', 10::smallint, 'Of no 10-26/2022'),
  ('125 - C-ApA-AuxNav-PR-SP - VII', 1::smallint, 'A IMPORTÂNCIA DOS AUXÍLIOS À NAVEGAÇÃO MARÍTIMOS (AtoN)', 7::smallint, 'Of no 10-26/2022'),
  ('125 - C-ApA-AuxNav-PR-SP - VII', 2::smallint, 'A NECESSIDADE DE AtoN', 7::smallint, 'Of no 10-26/2022'),
  ('125 - C-ApA-AuxNav-PR-SP - VII', 3::smallint, 'CONSIDERAÇÕES GERAIS DOS AUXÍLIOS À NAVEGAÇÃO', 6::smallint, 'Of no 10-26/2022'),
  ('125 - C-ApA-AuxNav-PR-SP - VII', 4::smallint, 'NOÇÕES DE ANÁLISE DE PROJETOS DE AUXÍLIOS À NAVEGAÇÃO', 20::smallint, 'Of no 10-26/2022'),
  ('126 - C-ApA-PCN-PR-EAD - PCN-PR-I-EAD', 1::smallint, 'ESTRATÉGIAS DE LEITURA', 30::smallint, 'Of no 10-31/2022'),
  ('127 - C-ApA-PCN-PR-EAD - PCN-PR-II-EAD', 1::smallint, 'NAVEGAÇÃO SOLAS', 10::smallint, 'Of no 10-31/2022'),
  ('127 - C-ApA-PCN-PR-EAD - PCN-PR-II-EAD', 2::smallint, 'DIRETORIA DE HIDROGRAFIA E NAVEGAÇÃO (DHN)', 10::smallint, 'Of no 10-31/2022'),
  ('127 - C-ApA-PCN-PR-EAD - PCN-PR-II-EAD', 3::smallint, 'CHM', 10::smallint, 'Of no 10-31/2022'),
  ('127 - C-ApA-PCN-PR-EAD - PCN-PR-II-EAD', 4::smallint, 'NOÇÕES DE CARTOGRAFIA', 10::smallint, 'Of no 10-31/2022'),
  ('128 - C-ApA-PCN-PR-EAD - PCN-PR-III-EAD', 1::smallint, 'HISTÓRICO', 10::smallint, 'Of no 10-31/2022'),
  ('128 - C-ApA-PCN-PR-EAD - PCN-PR-III-EAD', 2::smallint, 'PLANO CARTOGRÁFICO NÁUTICO BRASILEIRO (PCNB)', 10::smallint, 'Of no 10-31/2022'),
  ('128 - C-ApA-PCN-PR-EAD - PCN-PR-III-EAD', 3::smallint, 'ESTRUTURA DO CHM', 10::smallint, 'Of no 10-31/2022'),
  ('128 - C-ApA-PCN-PR-EAD - PCN-PR-III-EAD', 4::smallint, 'PLANOS DE TRABALHO DA DHN', 10::smallint, 'Of no 10-31/2022'),
  ('129 - C-ApA-PCN-PR-EAD - PCN-PR-IV-EAD', 1::smallint, 'TIPOS DE PRODUTOS CARTOGRÁFICOS', 10::smallint, 'Of no 10-31/2022'),
  ('129 - C-ApA-PCN-PR-EAD - PCN-PR-IV-EAD', 2::smallint, 'PRODUÇÃO DE NOVAS EDIÇÕES', 40::smallint, 'Of no 10-31/2022'),
  ('130 - C-ApA-PCN-PR-EAD - PCN-PR-V-EAD', 1::smallint, 'PUBLICAÇÕES DE AUXÍLIOS À NAVEGAÇÃO', 10::smallint, 'Of no 10-31/2022'),
  ('130 - C-ApA-PCN-PR-EAD - PCN-PR-V-EAD', 2::smallint, 'AVISOS', 20::smallint, 'Of no 10-31/2022'),
  ('130 - C-ApA-PCN-PR-EAD - PCN-PR-V-EAD', 3::smallint, 'ATUALIZAÇÃO CARTOGRÁFICA', 10::smallint, 'Of no 10-31/2022'),
  ('131 - C-ApA-PCN-PR-EAD - PCN-PR-VI-EAD', 1::smallint, 'O MODELO DE DADOS UNIVERSAL (S-100)', 20::smallint, 'Of no 10-31/2022'),
  ('131 - C-ApA-PCN-PR-EAD - PCN-PR-VI-EAD', 2::smallint, 'S-101 e S-401: AS ENC E InlanENC DO FUTURO', 20::smallint, 'Of no 10-31/2022'),
  ('132 - C-ApA-PCN-PR-EAD - PCN-PR-VII-EAD', 1::smallint, 'APRESENTAÇÃO DOS TEMAS', 10::smallint, 'Of no 10-31/2022'),
  ('132 - C-ApA-PCN-PR-EAD - PCN-PR-VII-EAD', 2::smallint, 'ORIENTAÇÃO DE FORMATAÇÃO, ESTRUTURAÇÃO E COMPOSIÇÃO DO TRABALHO DE FINAL DE CURSO', 70::smallint, 'Of no 10-31/2022'),
  ('42 - C-Ap-FR - I', 1::smallint, 'INSTALAÇÕES ELÉTRICAS', 48::smallint, 'Of no 10-6/2025'),
  ('42 - C-Ap-FR - I', 2::smallint, 'DISPOSITIVOS DE PROTEÇÃO', 17::smallint, 'Of no 10-6/2025'),
  ('42 - C-Ap-FR - I', 3::smallint, 'ELETRODUTOS, CÁLCULOS E DIMENSIONAMENTOS', 37::smallint, 'Of no 10-6/2025'),
  ('42 - C-Ap-FR - I', 4::smallint, 'PRECAUÇÕES DE SEGURANÇA', 18::smallint, 'Of no 10-6/2025'),
  ('43 - C-Ap-FR - II', 1::smallint, 'AUXÍLIOS À NAVEGAÇÃO', 30::smallint, 'Of no 10-6/2025'),
  ('43 - C-Ap-FR - II', 2::smallint, 'BALIZAMENTO', 10::smallint, 'Of no 10-6/2025'),
  ('43 - C-Ap-FR - II', 3::smallint, 'ESTABELECIMENTO, CANCELAMENTO E ALTERAÇÃO DE SINAIS NÁUTICOS DE AUXÍLIOS À NAVEGAÇÃO', 15::smallint, 'Of no 10-6/2025'),
  ('43 - C-Ap-FR - II', 4::smallint, 'COMUNICAÇÃO DE ALTERAÇÃO EM AUXÍLIOS À NAVEGAÇÃO', 10::smallint, 'Of no 10-6/2025'),
  ('44 - C-Ap-FR - III', 1::smallint, 'LANTERNAS ELÉTRICAS PORTÁTEIS', 20::smallint, 'Of no 10-6/2025'),
  ('44 - C-Ap-FR - III', 2::smallint, 'LANTERNAS DE DIODO EMISSOR DE LUZ (LED)', 22::smallint, 'Of no 10-6/2025'),
  ('44 - C-Ap-FR - III', 3::smallint, 'EQUIPAMENTOS AUTOMÁTICOS DE ALTA INTENSIDADE', 33::smallint, 'Of no 10-6/2025'),
  ('45 - C-Ap-FR - IV', 1::smallint, 'PESQUISA DE DELINEAMENTO', 64::smallint, 'Of no 10-6/2025'),
  ('45 - C-Ap-FR - IV', 2::smallint, 'LINHA DE FUNDEIO', 40::smallint, 'Of no 10-6/2025'),
  ('46 - C-Ap-FR - V', 1::smallint, 'DADOS OPERACIONAIS SOBRE MEIOS FLUTUANTES', 10::smallint, 'Of no 10-6/2025'),
  ('46 - C-Ap-FR - V', 2::smallint, 'ELABORAÇÃO DE INSTRUÇÕES ESPECIAIS', 10::smallint, 'Of no 10-6/2025'),
  ('46 - C-Ap-FR - V', 3::smallint, 'SISTEMA DE MANUTENÇÃO PLANEJADA DAS OPERAÇÕES DE AUXÍLIOS À NAVEGAÇÃO', 35::smallint, 'Of no 10-6/2025'),
  ('46 - C-Ap-FR - V', 4::smallint, 'ABASTECIMENTO', 38::smallint, 'Of no 10-6/2025'),
  ('46 - C-Ap-FR - V', 5::smallint, 'CONTROLE DE SISTEMAS DE AUXÍLIOS À NAVEGAÇÃO', 47::smallint, 'Of no 10-6/2025'),
  ('47 - C-Ap-FR - VI', 1::smallint, 'PUBLICAÇÕES', 25::smallint, 'Of no 10-6/2025'),
  ('47 - C-Ap-FR - VI', 2::smallint, 'NAVEGAÇÃO COSTEIRA', 45::smallint, 'Of no 10-6/2025'),
  ('47 - C-Ap-FR - VI', 3::smallint, 'ALINHAMENTO', 10::smallint, 'Of no 10-6/2025'),
  ('47 - C-Ap-FR - VI', 4::smallint, 'SEGMENTOS CAPAZES', 10::smallint, 'Of no 10-6/2025'),
  ('47 - C-Ap-FR - VI', 5::smallint, 'CARTA ELETRÔNICA', 8::smallint, 'Of no 10-6/2025'),
  ('47 - C-Ap-FR - VI', 6::smallint, 'ELECTRONIC CHART DISPLAY AND INFORMATION SYSTEM (ECDIS)', 8::smallint, 'Of no 10-6/2025'),
  ('47 - C-Ap-FR - VI', 7::smallint, 'E-NAVIGATION', 6::smallint, 'Of no 10-6/2025'),
  ('47 - C-Ap-FR - VI', 8::smallint, 'NORMAS PARA NAVEGAÇÃO NOS NAVIOS DA MB', 8::smallint, 'Of no 10-6/2025'),
  ('48 - C-Ap-FR - VII', 1::smallint, 'ESTRUTURA GRAMATICAL I', 25::smallint, 'Of no 10-6/2025'),
  ('48 - C-Ap-FR - VII', 2::smallint, 'ESTRUTURA GRAMATICAL II', 25::smallint, 'Of no 10-6/2025'),
  ('49 - C-Ap-FR - VIII', 1::smallint, 'CONCEITOS MATEMÁTICOS NA REPRESENTAÇÃO DA TERRA E DA CARTA NÁUTICA', 4::smallint, 'Of no 10-6/2025'),
  ('49 - C-Ap-FR - VIII', 2::smallint, 'SEMELHANÇA DE TRIÂNGULOS NA NAVEGAÇÃO COSTEIRA', 4::smallint, 'Of no 10-6/2025'),
  ('49 - C-Ap-FR - VIII', 3::smallint, 'GEOMETRIA MÉTRICA ESPACIAL APLICADA À TOPOGRAFIA', 3::smallint, 'Of no 10-6/2025'),
  ('49 - C-Ap-FR - VIII', 4::smallint, 'MEDIDA DE ÂNGULO', 10::smallint, 'Of no 10-6/2025'),
  ('49 - C-Ap-FR - VIII', 5::smallint, 'TOPOGRAFIA', 5::smallint, 'Of no 10-6/2025'),
  ('49 - C-Ap-FR - VIII', 6::smallint, 'MEDIDA DE ÂNGULOS EM TOPOGRAFIA', 16::smallint, 'Of no 10-6/2025'),
  ('49 - C-Ap-FR - VIII', 7::smallint, 'MEDIDA DE DISTÂNCIAS', 10::smallint, 'Of no 10-6/2025'),
  ('49 - C-Ap-FR - VIII', 8::smallint, 'ALTIMETRIA', 14::smallint, 'Of no 10-6/2025'),
  ('49 - C-Ap-FR - VIII', 9::smallint, 'SISTEMAS ORBITAIS (RASTREIO)', 20::smallint, 'Of no 10-6/2025'),
  ('49 - C-Ap-FR - VIII', 10::smallint, 'PLANIMETRIA', 14::smallint, 'Of no 10-6/2025'),
  ('50 - C-Ap-FR - IX', 1::smallint, 'FERRAMENTAS', 4::smallint, 'Of no 10-6/2025'),
  ('50 - C-Ap-FR - IX', 2::smallint, 'ALVENARIA', 32::smallint, 'Of no 10-6/2025'),
  ('50 - C-Ap-FR - IX', 3::smallint, 'CONCRETO ARMADO', 32::smallint, 'Of no 10-6/2025'),
  ('50 - C-Ap-FR - IX', 4::smallint, 'REPAROS EM CONCRETO ARMADO', 15::smallint, 'Of no 10-6/2025'),
  ('50 - C-Ap-FR - IX', 5::smallint, 'PINTURA', 27::smallint, 'Of no 10-6/2025'),
  ('40 - C-Ap-FR - X', 1::smallint, 'CORRIDA', 15::smallint, 'Of no 10-6/2025'),
  ('40 - C-Ap-FR - X', 2::smallint, 'NATAÇÃO E PERMANÊNCIA DENTRO D`ÁGUA', 25::smallint, 'Of no 10-6/2025'),
  ('51 - C-Ap-FR - XI', 1::smallint, 'SEGURANÇA DO TRABALHO', 6::smallint, 'Of no 10-6/2025'),
  ('51 - C-Ap-FR - XI', 2::smallint, 'RISCOS AMBIENTAIS', 6::smallint, 'Of no 10-6/2025'),
  ('51 - C-Ap-FR - XI', 3::smallint, 'MAPA DE RISCOS AMBIENTAIS', 6::smallint, 'Of no 10-6/2025'),
  ('51 - C-Ap-FR - XI', 4::smallint, 'EQUIPAMENTOS DE PROTEÇÃO', 10::smallint, 'Of no 10-6/2025'),
  ('51 - C-Ap-FR - XI', 5::smallint, 'INSPEÇÃO DE SEGURANÇA', 4::smallint, 'Of no 10-6/2025'),
  ('51 - C-Ap-FR - XI', 6::smallint, 'ANÁLISE E INVESTIGAÇÃO', 6::smallint, 'Of no 10-6/2025'),
  ('51 - C-Ap-FR - XI', 7::smallint, 'LEGISLAÇÃO', 5::smallint, 'Of no 10-6/2025'),
  ('51 - C-Ap-FR - XI', 8::smallint, 'SEMANA INTERNA DE PREVENÇÃO DE ACIDENTES (SIPAT)', 7::smallint, 'Of no 10-6/2025'),
  ('52 - C-Ap-FR - XII', 1::smallint, 'NAVEGAÇÃO ELETRÔNICA', 14::smallint, 'Of no 10-6/2025'),
  ('52 - C-Ap-FR - XII', 2::smallint, 'EQUIPAMENTOS E SISTEMAS ELETRÔNICOS DE AUXÍLIO À NAVEGAÇÃO', 16::smallint, 'Of no 10-6/2025'),
  ('53 - C-Ap-FR - XIII', 1::smallint, 'NAVEGAÇÃO', 35::smallint, 'Of no 10-6/2025'),
  ('53 - C-Ap-FR - XIII', 2::smallint, 'MANUTENÇÃO EM SINAIS NÁUTICOS DE ALVENARIA', 35::smallint, 'Of no 10-6/2025'),
  ('53 - C-Ap-FR - XIII', 3::smallint, 'EQUIPAMENTOS DE SINALIZAÇÃO NÁUTICA', 35::smallint, 'Of no 10-6/2025'),
  ('53 - C-Ap-FR - XIII', 4::smallint, 'PROJETOS DE AUXÍLIOS À NAVEGAÇÃO', 35::smallint, 'Of no 10-6/2025'),
  ('53 - C-Ap-FR - XIII', 5::smallint, 'ADMINISTRAÇÃO DE AUXÍLIOS À NAVEGAÇÃO', 20::smallint, 'Of no 10-6/2025'),
  ('23 - C-Ap-HN - I', 1::smallint, 'MATEMÁTICA APLICADA NA RESOLUÇÃO DE PROBLEMAS HIDROGRÁFICOS', 48::smallint, 'Of no 10-6/2025'),
  ('23 - C-Ap-HN - I', 2::smallint, 'ESTATÍSTICA', 21::smallint, 'Of no 10-6/2025'),
  ('23 - C-Ap-HN - I', 3::smallint, 'FUNDAMENTOS DA TEORIA DOS ERROS', 11::smallint, 'Of no 10-6/2025'),
  ('23 - C-Ap-HN - I', 4::smallint, 'PROPAGAÇÃO DE ERROS', 7::smallint, 'Of no 10-6/2025'),
  ('23 - C-Ap-HN - I', 5::smallint, 'QUANTIFICAÇÃO DA INCERTEZA POSICIONAL', 3::smallint, 'Of no 10-6/2025'),
  ('23 - C-Ap-HN - I', 6::smallint, 'AJUSTAMENTO TOPO-GEODÉSICO', 15::smallint, 'Of no 10-6/2025'),
  ('24 - C-Ap-HN - I-I', 7::smallint, 'FÍSICA', 21::smallint, 'Of no 10-6/2025'),
  ('25 - C-Ap-HN - II', 1::smallint, 'SISTEMAS COMPUTACIONAIS', 11::smallint, 'Of no 10-6/2025'),
  ('25 - C-Ap-HN - II', 2::smallint, 'EDITOR DE TEXTO, PLANILHA E APLICATIVO GRÁFICO', 4::smallint, 'Of no 10-6/2025'),
  ('25 - C-Ap-HN - II', 3::smallint, 'SISTEMAS DE BANCO DE DADOS', 10::smallint, 'Of no 10-6/2025'),
  ('25 - C-Ap-HN - II', 4::smallint, 'PROGRAMAÇÃO', 26::smallint, 'Of no 10-6/2025'),
  ('26 - C-Ap-HN - III', 1::smallint, 'ESTRUTURA GRAMATICAL I', 20::smallint, 'Of no 10-6/2025'),
  ('26 - C-Ap-HN - III', 2::smallint, 'ESTRUTURA GRAMATICAL II', 20::smallint, 'Of no 10-6/2025'),
  ('27 - C-Ap-HN - IV', 1::smallint, 'METEOROLOGIA BÁSICA', 26::smallint, 'Of no 10-6/2025'),
  ('27 - C-Ap-HN - IV', 2::smallint, 'METEOROLOGIA SINÓTICA', 34::smallint, 'Of no 10-6/2025'),
  ('28 - C-Ap-HN - V', 1::smallint, 'PROBLEMA GERAL DA NAVEGAÇÃO', 4::smallint, 'Of no 10-6/2025'),
  ('28 - C-Ap-HN - V', 2::smallint, 'DISTÂNCIAS, RUMOS E MARCAÇÕES', 4::smallint, 'Of no 10-6/2025'),
  ('28 - C-Ap-HN - V', 3::smallint, 'POSICIONAMENTO', 15::smallint, 'Of no 10-6/2025'),
  ('28 - C-Ap-HN - V', 4::smallint, 'CARACTERÍSTICAS DO NAVIO PARA MANOBRA', 7::smallint, 'Of no 10-6/2025'),
  ('28 - C-Ap-HN - V', 5::smallint, 'REGRAS DE GOVERNO E BALIZAMENTO', 5::smallint, 'Of no 10-6/2025'),
  ('28 - C-Ap-HN - V', 6::smallint, 'EQUIPAMENTOS USADOS NA NAVEGAÇÃO', 18::smallint, 'Of no 10-6/2025'),
  ('28 - C-Ap-HN - V', 7::smallint, 'SISTEMAS EMPREGADOS NA NAVEGAÇÃO', 13::smallint, 'Of no 10-6/2025'),
  ('28 - C-Ap-HN - V', 8::smallint, 'NAVEGAÇÃO INERCIAL', 10::smallint, 'Of no 10-6/2025'),
  ('28 - C-Ap-HN - V', 9::smallint, 'ASPECTOS PRÁTICOS DA NAVEGAÇÃO', 16::smallint, 'Of no 10-6/2025'),
  ('29 - C-Ap-HN - VI', 1::smallint, 'PUBLICAÇÕES DE AUXÍLIO À NAVEGAÇÃO', 7::smallint, 'Of no 10-6/2025'),
  ('29 - C-Ap-HN - VI', 2::smallint, 'NORMAS DA AUTORIDADE MARÍTIMA', 11::smallint, 'Of no 10-6/2025'),
  ('29 - C-Ap-HN - VI', 3::smallint, 'CONVENÇÃO DAS NAÇÕES UNIDAS SOBRE O DIREITO DO MAR (CNUDM)', 7::smallint, 'Of no 10-6/2025'),
  ('29 - C-Ap-HN - VI', 4::smallint, 'RESPONSABILIDADE CIVIL DO HIDRÓGRAFO', 5::smallint, 'Of no 10-6/2025'),
  ('29 - C-Ap-HN - VI', 5::smallint, 'CONCEITOS FUNDAMENTAIS DE APOIO LOGÍSTICO INTEGRADO (ALI)', 2::smallint, 'Of no 10-6/2025'),
  ('29 - C-Ap-HN - VI', 6::smallint, 'GESTÃO DE MANUTENÇÃO', 2::smallint, 'Of no 10-6/2025'),
  ('30 - C-Ap-HN - VII', 1::smallint, 'ESFERA CELESTE', 10::smallint, 'Of no 10-6/2025'),
  ('30 - C-Ap-HN - VII', 2::smallint, 'MEDIDA DE TEMPO', 6::smallint, 'Of no 10-6/2025'),
  ('30 - C-Ap-HN - VII', 3::smallint, 'CORREÇÃO DAS OBSERVAÇÕES', 7::smallint, 'Of no 10-6/2025'),
  ('30 - C-Ap-HN - VII', 4::smallint, 'USO DAS EFEMÉRIDES', 4::smallint, 'Of no 10-6/2025'),
  ('30 - C-Ap-HN - VII', 5::smallint, 'AZIMUTE ASTRONÔMICO', 6::smallint, 'Of no 10-6/2025'),
  ('30 - C-Ap-HN - VII', 6::smallint, 'ERRO E DESVIO DAS AGULHAS', 7::smallint, 'Of no 10-6/2025'),
  ('30 - C-Ap-HN - VII', 7::smallint, 'ASPECTOS PRÁTICOS DE NAVEGAÇÃO ASTRONÔMICA', 16::smallint, 'Of no 10-6/2025'),
  ('31 - C-Ap-HN - VIII', 1::smallint, 'CARTOGRAFIA', 8::smallint, 'Of no 10-6/2025'),
  ('31 - C-Ap-HN - VIII', 2::smallint, 'PROJEÇÕES GERAIS', 8::smallint, 'Of no 10-6/2025'),
  ('31 - C-Ap-HN - VIII', 3::smallint, 'PROJEÇÕES CILÍNDRICAS', 15::smallint, 'Of no 10-6/2025'),
  ('31 - C-Ap-HN - VIII', 4::smallint, 'SISTEMA UNIVERSAL TRANSVERSO DE MERCATOR (UTM)', 12::smallint, 'Of no 10-6/2025'),
  ('31 - C-Ap-HN - VIII', 5::smallint, 'DOCUMENTOS CARTOGRÁFICOS', 8::smallint, 'Of no 10-6/2025'),
  ('31 - C-Ap-HN - VIII', 6::smallint, 'CONSTRUÇÃO DA CARTA NÁUTICA', 9::smallint, 'Of no 10-6/2025'),
  ('32 - C-Ap-HN - IX', 1::smallint, 'FUNDAMENTOS DA GEODÉSIA', 7::smallint, 'Of no 10-6/2025'),
  ('32 - C-Ap-HN - IX', 2::smallint, 'SISTEMAS GEODÉSICOS DE REFERÊNCIA', 7::smallint, 'Of no 10-6/2025'),
  ('32 - C-Ap-HN - IX', 3::smallint, 'TRANSPORTE DE COORDENADAS SOBRE O ELIPSÓIDE DE REVOLUÇÃO', 20::smallint, 'Of no 10-6/2025'),
  ('32 - C-Ap-HN - IX', 4::smallint, 'GEODÉSIA ESPACIAL', 10::smallint, 'Of no 10-6/2025'),
  ('32 - C-Ap-HN - IX', 5::smallint, 'AS OBSERVÁVEIS GNSS', 10::smallint, 'Of no 10-6/2025'),
  ('32 - C-Ap-HN - IX', 6::smallint, 'GEODÉSIA APLICADA', 16::smallint, 'Of no 10-6/2025'),
  ('33 - C-Ap-HN - X', 1::smallint, 'FUNDAMENTOS DAS MARÉS', 14::smallint, 'Of no 10-6/2025'),
  ('33 - C-Ap-HN - X', 2::smallint, 'ANÁLISE E PREVISÃO DA MARÉ', 18::smallint, 'Of no 10-6/2025'),
  ('33 - C-Ap-HN - X', 3::smallint, 'MARÉGRAFOS, ESTAÇÃO MAREGRÁFICA E DATUMS', 13::smallint, 'Of no 10-6/2025'),
  ('33 - C-Ap-HN - X', 4::smallint, 'REDUÇÃO DE SONDAGEM', 19::smallint, 'Of no 10-6/2025'),
  ('34 - C-Ap-HN - XI', 1::smallint, 'PROJETO DE LH', 6::smallint, 'Of no 10-6/2025'),
  ('34 - C-Ap-HN - XI', 2::smallint, 'SISTEMAS DE BATIMETRIA E SENSORES AUXILIARES', 5::smallint, 'Of no 10-6/2025'),
  ('34 - C-Ap-HN - XI', 3::smallint, 'DETERMINAÇÃO DA PROFUNDIDADE', 8::smallint, 'Of no 10-6/2025'),
  ('34 - C-Ap-HN - XI', 4::smallint, 'SONDAGEM MONOFEIXE', 5::smallint, 'Of no 10-6/2025'),
  ('34 - C-Ap-HN - XI', 5::smallint, 'SONDAGEM MULTIFEIXE', 22::smallint, 'Of no 10-6/2025'),
  ('34 - C-Ap-HN - XI', 6::smallint, 'INSTALAÇÕES DE SENSORES HIDROGRÁFICOS', 8::smallint, 'Of no 10-6/2025'),
  ('34 - C-Ap-HN - XI', 7::smallint, 'COMUNICAÇÕES, ELETRÔNICA E INFORMÁTICA', 8::smallint, 'Of no 10-6/2025'),
  ('34 - C-Ap-HN - XI', 8::smallint, 'VARREDURA', 10::smallint, 'Of no 10-6/2025'),
  ('34 - C-Ap-HN - XI', 9::smallint, 'OUTROS SISTEMAS DE LEVANTAMENTO', 2::smallint, 'Of no 10-6/2025'),
  ('34 - C-Ap-HN - XI', 10::smallint, 'PROCEDIMENTOS DE SONDAGEM', 24::smallint, 'Of no 10-6/2025'),
  ('34 - C-Ap-HN - XI', 11::smallint, 'OPERAÇÃO E MANUTENÇÃO DE EQUIPAMENTOS HIDROCEANOGRÁFICOS E PRÁTICAS DE SEGURANÇA', 8::smallint, 'Of no 10-6/2025'),
  ('34 - C-Ap-HN - XI', 12::smallint, 'PROCESSAMENTO DE DADOS BATIMÉTRICOS', 40::smallint, 'Of no 10-6/2025'),
  ('34 - C-Ap-HN - XI', 13::smallint, 'HIDROGRAFIA MILITAR', 2::smallint, 'Of no 10-6/2025'),
  ('35 - C-Ap-HN - XII', 1::smallint, 'BANCOS DE DADOS E INFRAESTRUTURAS DE DADOS ESPACIAIS', 15::smallint, 'Of no 10-6/2025'),
  ('35 - C-Ap-HN - XII', 2::smallint, 'PRODUTOS DERIVADOS DE LH', 10::smallint, 'Of no 10-6/2025'),
  ('36 - C-Ap-HN - XIII', 1::smallint, 'OCEANOGRAFIA FÍSICA', 50::smallint, 'Of no 10-6/2025'),
  ('36 - C-Ap-HN - XIII', 2::smallint, 'OCEANOGRAFIA GEOLÓGICA', 16::smallint, 'Of no 10-6/2025'),
  ('36 - C-Ap-HN - XIII', 3::smallint, 'IMPACTO AMBIENTAL', 9::smallint, 'Of no 10-6/2025'),
  ('37 - C-Ap-HN - XIV', 1::smallint, 'INTRODUÇÃO À TOPOGRAFIA', 5::smallint, 'Of no 10-6/2025'),
  ('37 - C-Ap-HN - XIV', 2::smallint, 'MEDIDA DE ÂNGULOS', 15::smallint, 'Of no 10-6/2025'),
  ('37 - C-Ap-HN - XIV', 3::smallint, 'MEDIDA DE DISTÂNCIAS', 10::smallint, 'Of no 10-6/2025'),
  ('37 - C-Ap-HN - XIV', 4::smallint, 'ALTIMETRIA', 15::smallint, 'Of no 10-6/2025'),
  ('37 - C-Ap-HN - XIV', 5::smallint, 'PLANIMETRIA', 15::smallint, 'Of no 10-6/2025'),
  ('37 - C-Ap-HN - XIV', 6::smallint, 'LEVANTAMENTO TOPOGRÁFICO', 30::smallint, 'Of no 10-6/2025'),
  ('38 - C-Ap-HN - XV', 1::smallint, 'INTRODUÇÃO AO SENSORIAMENTO REMOTO E AO SISTEMA LiDAR', 6::smallint, 'Of no 10-6/2025'),
  ('38 - C-Ap-HN - XV', 2::smallint, 'SISTEMA LiDAR', 15::smallint, 'Of no 10-6/2025'),
  ('38 - C-Ap-HN - XV', 3::smallint, 'SENSORIAMENTO REMOTO', 17::smallint, 'Of no 10-6/2025'),
  ('39 - C-Ap-HN - XVI', 1::smallint, 'NOÇÕES DE ACÚSTICA', 2::smallint, 'Of no 10-6/2025'),
  ('39 - C-Ap-HN - XVI', 2::smallint, 'FUNDAMENTOS DE ACÚSTICA SUBMARINA', 7::smallint, 'Of no 10-6/2025'),
  ('39 - C-Ap-HN - XVI', 3::smallint, 'TRANSDUTORES', 2::smallint, 'Of no 10-6/2025'),
  ('39 - C-Ap-HN - XVI', 4::smallint, 'EQUAÇÃO SONAR', 4::smallint, 'Of no 10-6/2025'),
  ('39 - C-Ap-HN - XVI', 5::smallint, 'SISTEMAS ACÚSTICOS', 13::smallint, 'Of no 10-6/2025'),
  ('40 - C-Ap-HN - XVII', 1::smallint, 'CORRIDA', 15::smallint, 'Of no 10-6/2025'),
  ('40 - C-Ap-HN - XVII', 2::smallint, 'NATAÇÃO E PERMANÊNCIA DENTRO D`ÁGUA', 25::smallint, 'Of no 10-6/2025'),
  ('41 - C-Ap-HN - XVIII', 1::smallint, 'PLANEJAMENTO DO LEVANTAMENTO HIDROGRÁFICO', 10::smallint, 'Of no 10-6/2025'),
  ('41 - C-Ap-HN - XVIII', 2::smallint, 'ELABORAÇÃO DO CRONOGRAMA DOS SERVIÇOS A SEREM EXECUTADOS', 10::smallint, 'Of no 10-6/2025'),
  ('41 - C-Ap-HN - XVIII', 3::smallint, 'ELABORAÇÃO DA INSTRUÇÃO ESPECIAL DO LEVANTAMENTO HIDROGRÁFICO', 10::smallint, 'Of no 10-6/2025'),
  ('41 - C-Ap-HN - XVIII', 4::smallint, 'TRABALHOS DE GEODÉSIA, TOPOGRAFIA, OCEANOGRAFIA, MARÉS, AEROFOTOGRAMETRIA E BATIMETRIA', 80::smallint, 'Of no 10-6/2025'),
  ('41 - C-Ap-HN - XVIII', 5::smallint, 'PROCESSAMENTO CONVENCIONAL E AUTOMÁTICO', 16::smallint, 'Of no 10-6/2025'),
  ('41 - C-Ap-HN - XVIII', 6::smallint, 'INTERPRETAÇÃO E ANÁLISE DOS DADOS COLETADOS E PROCESSADOS', 12::smallint, 'Of no 10-6/2025'),
  ('41 - C-Ap-HN - XVIII', 7::smallint, 'PRODUÇÃO DOS DOCUMENTOS DO LEVANTAMENTO HIDROGRÁFICO', 12::smallint, 'Of no 10-6/2025'),
  ('41 - C-Ap-HN - XVIII', 8::smallint, 'ELABORAÇÃO E ENTREGA DO RELATÓRIO FINAL DA COMISSÃO HIDROGRÁFICA', 10::smallint, 'Of no 10-6/2025'),
  ('94 - C-Esp-ALH - ALH-I', 1::smallint, 'ESTRATÉGIAS DE LEITURA', 20::smallint, 'Of no 10-16/2020'),
  ('95 - C-Esp-ALH - ALH-II', 1::smallint, 'FERRAMENTAS DE ANÁLISES DO EXCEL', 6::smallint, 'Of no 10-16/2020'),
  ('95 - C-Esp-ALH - ALH-II', 2::smallint, 'SISTEMAS DE AQUISIÇÃO DE DADOS AUTOMATIZADOS', 12::smallint, 'Of no 10-16/2020'),
  ('95 - C-Esp-ALH - ALH-II', 3::smallint, 'SISTEMAS DE PROCESSAMENTOS DE DADOS', 89::smallint, 'Of no 10-16/2020'),
  ('95 - C-Esp-ALH - ALH-II', 4::smallint, 'TREINAMENTO EM BANCO DE DADOS', 40::smallint, 'Of no 10-16/2020'),
  ('96 - C-Esp-ALH - ALH-II', 1::smallint, 'NORMAS DA AUTORIDADE MARÍTIMA', 4::smallint, 'Of no 10-16/2020'),
  ('96 - C-Esp-ALH - ALH-II', 2::smallint, 'INSTRUÇÕES TÉCNICAS (DHN)', 12::smallint, 'Of no 10-16/2020'),
  ('96 - C-Esp-ALH - ALH-II', 3::smallint, 'NORMAS INTERNACIONAIS', 16::smallint, 'Of no 10-16/2020'),
  ('97 - C-Esp-ALH - ALH-IV', 1::smallint, 'FUNDAMENTOS DA TEORIA DOS ERROS', 20::smallint, 'Of no 10-16/2020'),
  ('97 - C-Esp-ALH - ALH-IV', 2::smallint, 'PROPAGAÇÃO DE ERROS', 24::smallint, 'Of no 10-16/2020'),
  ('98 - C-Esp-ALH - ALH-V', 1::smallint, 'DEFINIÇÕES GERAIS', 6::smallint, 'Of no 10-16/2020'),
  ('98 - C-Esp-ALH - ALH-V', 2::smallint, 'ANÁLISE DE MARÉS', 34::smallint, 'Of no 10-16/2020'),
  ('99 - C-Esp-ALH - ALH-VI', 1::smallint, 'ARQUITETURA DO SVL', 8::smallint, 'Of no 10-16/2020'),
  ('99 - C-Esp-ALH - ALH-VI', 2::smallint, 'AQUISIÇÃO DE DADOS', 4::smallint, 'Of no 10-16/2020'),
  ('99 - C-Esp-ALH - ALH-VI', 3::smallint, 'PROCESSAMENTO E ANÁLISE DE DADOS', 28::smallint, 'Of no 10-16/2020'),
  ('100 - C-Esp-ALH - ALH-VII', 1::smallint, 'DEFINIÇÕES GERAIS', 17::smallint, 'Of no 10-16/2020'),
  ('100 - C-Esp-ALH - ALH-VII', 2::smallint, 'ANÁLISE DE DADOS GNSS', 20::smallint, 'Of no 10-16/2020'),
  ('101 - C-Esp-ALH - ALH-VIII', 1::smallint, 'ARQUITETURA DO MBES', 8::smallint, 'Of no 10-16/2020'),
  ('101 - C-Esp-ALH - ALH-VIII', 2::smallint, 'AQUISIÇÃO DE DADOS', 8::smallint, 'Of no 10-16/2020'),
  ('101 - C-Esp-ALH - ALH-VIII', 3::smallint, 'PROCESSAMENTO E ANÁLISE DE DADOS', 44::smallint, 'Of no 10-16/2020'),
  ('102 - C-Esp-ALH - ALH-IX', 1::smallint, 'PROCEDIMENTOS OPERACIONAIS DO CHM', 50::smallint, 'Of no 10-16/2020'),
  ('103 - C-Esp-ME - I', 1::smallint, 'INTRODUÇÃO À METEOROLOGIA', 2::smallint, 'Of no 10-22/2025'),
  ('103 - C-Esp-ME - I', 2::smallint, 'ATMOSFERA TERRESTRE', 3::smallint, 'Of no 10-22/2025'),
  ('103 - C-Esp-ME - I', 3::smallint, 'RADIAÇÃO NA ATMOSFERA', 4::smallint, 'Of no 10-22/2025'),
  ('103 - C-Esp-ME - I', 4::smallint, 'PARÂMETROS METEOROLÓGICOS', 4::smallint, 'Of no 10-22/2025'),
  ('103 - C-Esp-ME - I', 5::smallint, 'NUVENS', 3::smallint, 'Of no 10-22/2025'),
  ('103 - C-Esp-ME - I', 6::smallint, 'PRECIPITAÇÃO', 4::smallint, 'Of no 10-22/2025'),
  ('103 - C-Esp-ME - I', 7::smallint, 'VISIBILIDADE', 3::smallint, 'Of no 10-22/2025'),
  ('103 - C-Esp-ME - I', 8::smallint, 'METEOROS', 5::smallint, 'Of no 10-22/2025'),
  ('104 - C-Esp-ME - II', 1::smallint, 'NOÇÕES FUNDAMENTAIS', 6::smallint, 'Of no 10-22/2025'),
  ('104 - C-Esp-ME - II', 2::smallint, 'INSTRUMENTAÇÃO METEOROLÓGICA', 16::smallint, 'Of no 10-22/2025'),
  ('104 - C-Esp-ME - II', 3::smallint, 'ESTAÇÕES METEOROLÓGICAS', 8::smallint, 'Of no 10-22/2025'),
  ('104 - C-Esp-ME - II', 4::smallint, 'OBSERVAÇÃO METEOROLÓGICA', 10::smallint, 'Of no 10-22/2025'),
  ('104 - C-Esp-ME - II', 5::smallint, 'CÓDIGOS METEOROLÓGICOS', 30::smallint, 'Of no 10-22/2025'),
  ('105 - C-Esp-ME - III', 1::smallint, 'NOÇÕES FUNDAMENTAIS', 4::smallint, 'Of no 10-22/2025'),
  ('105 - C-Esp-ME - III', 2::smallint, 'SISTEMAS OPERACIONAIS', 16::smallint, 'Of no 10-22/2025'),
  ('105 - C-Esp-ME - III', 3::smallint, 'REDES DE COMUNICAÇÃO DE DADOS', 4::smallint, 'Of no 10-22/2025'),
  ('105 - C-Esp-ME - III', 4::smallint, 'SOFTWARE DE VISUALIZAÇÃO DE DADOS AMBIENTAIS', 22::smallint, 'Of no 10-22/2025'),
  ('106 - C-Esp-ME - IV', 1::smallint, 'NOÇÕES FUNDAMENTAIS', 2::smallint, 'Of no 10-22/2025'),
  ('106 - C-Esp-ME - IV', 2::smallint, 'FORÇAS REAIS E APARENTES', 6::smallint, 'Of no 10-22/2025'),
  ('106 - C-Esp-ME - IV', 3::smallint, 'EQUAÇÕES DO MOVIMENTO', 4::smallint, 'Of no 10-22/2025'),
  ('106 - C-Esp-ME - IV', 4::smallint, 'APLICAÇÕES DAS EQUAÇÕES DO MOVIMENTO', 10::smallint, 'Of no 10-22/2025'),
  ('107 - C-Esp-ME - V', 1::smallint, 'CLIMATOLOGIA GERAL', 6::smallint, 'Of no 10-22/2025'),
  ('107 - C-Esp-ME - V', 2::smallint, 'CLIMATOLOGIA ESTATÍSTICA', 9::smallint, 'Of no 10-22/2025'),
  ('107 - C-Esp-ME - V', 3::smallint, 'CLIMATOLOGIA APLICADA', 10::smallint, 'Of no 10-22/2025'),
  ('108 - C-Esp-ME - VI', 1::smallint, 'CONCEITOS BÁSICOS', 2::smallint, 'Of no 10-22/2025'),
  ('108 - C-Esp-ME - VI', 2::smallint, 'SISTEMAS DE PRESSÃO', 2::smallint, 'Of no 10-22/2025'),
  ('108 - C-Esp-ME - VI', 3::smallint, 'CIRCULAÇÃO GERAL DA ATMOSFERA', 6::smallint, 'Of no 10-22/2025'),
  ('108 - C-Esp-ME - VI', 4::smallint, 'MASSAS DE AR', 4::smallint, 'Of no 10-22/2025'),
  ('108 - C-Esp-ME - VI', 5::smallint, 'SISTEMAS FRONTAIS', 6::smallint, 'Of no 10-22/2025'),
  ('108 - C-Esp-ME - VI', 6::smallint, 'CARTAS SINÓTICAS DE SUPERFÍCIE', 18::smallint, 'Of no 10-22/2025'),
  ('108 - C-Esp-ME - VI', 7::smallint, 'SISTEMAS SINÓTICOS', 18::smallint, 'Of no 10-22/2025'),
  ('108 - C-Esp-ME - VI', 8::smallint, 'CICLONES TROPICAIS', 6::smallint, 'Of no 10-22/2025'),
  ('108 - C-Esp-ME - VI', 9::smallint, 'SISTEMAS DE MICROESCALA E MESOESCALA', 10::smallint, 'Of no 10-22/2025'),
  ('109 - C-Esp-ME - VII', 1::smallint, 'INTRODUÇÃO AO SENSORIAMENTO REMOTO', 2::smallint, 'Of no 10-22/2025'),
  ('109 - C-Esp-ME - VII', 2::smallint, 'SATÉLITES AMBIENTAIS', 4::smallint, 'Of no 10-22/2025'),
  ('109 - C-Esp-ME - VII', 3::smallint, 'SISTEMAS DE RECEPÇÃO DE DADOS, PRODUTOS E IMAGENS DE ALTA RESOLUÇÃO DE SATÉLITES METEOROLÓGICOS IMPLANTADOS NA MB', 14::smallint, 'Of no 10-22/2025'),
  ('109 - C-Esp-ME - VII', 4::smallint, 'INTERPRETAÇÃO DE IMAGENS', 18::smallint, 'Of no 10-22/2025'),
  ('109 - C-Esp-ME - VII', 5::smallint, 'RADARES METEOROLÓGICOS', 12::smallint, 'Of no 10-22/2025'),
  ('110 - C-Esp-ME - VIII', 1::smallint, 'CONCEITOS GERAIS', 2::smallint, 'Of no 10-22/2025'),
  ('110 - C-Esp-ME - VIII', 2::smallint, 'CONHECIMENTOS BÁSICOS', 3::smallint, 'Of no 10-22/2025'),
  ('110 - C-Esp-ME - VIII', 3::smallint, 'OBSERVAÇÕES METEOROLÓGICAS PARA FINS AERONÁUTICO', 4::smallint, 'Of no 10-22/2025'),
  ('110 - C-Esp-ME - VIII', 4::smallint, 'FENÔMENOS METEOROLÓGICOS ADVERSOS À AVIAÇÃO', 4::smallint, 'Of no 10-22/2025'),
  ('110 - C-Esp-ME - VIII', 5::smallint, 'CÓDIGOS METEOROLÓGICOS', 20::smallint, 'Of no 10-22/2025'),
  ('110 - C-Esp-ME - VIII', 6::smallint, 'CARTAS METEOROLÓGICAS', 6::smallint, 'Of no 10-22/2025'),
  ('110 - C-Esp-ME - VIII', 7::smallint, 'BRIEFINGS METEOROLÓGICOS', 9::smallint, 'Of no 10-22/2025'),
  ('111 - C-Esp-ME - IX', 1::smallint, 'CONCEITOS BÁSICOS', 6::smallint, 'Of no 10-22/2025'),
  ('111 - C-Esp-ME - IX', 2::smallint, 'LEIS DA TERMODINÂMICA', 6::smallint, 'Of no 10-22/2025'),
  ('111 - C-Esp-ME - IX', 3::smallint, 'TERMODINÂMICA DO AR ÚMIDO', 6::smallint, 'Of no 10-22/2025'),
  ('111 - C-Esp-ME - IX', 4::smallint, 'DIAGRAMAS TERMODINÂMICOS', 10::smallint, 'Of no 10-22/2025'),
  ('111 - C-Esp-ME - IX', 5::smallint, 'ESTABILIDADE DA ATMOSFERA', 10::smallint, 'Of no 10-22/2025'),
  ('112 - C-Esp-ME - X', 1::smallint, 'METEOROLOGIA MARINHA', 6::smallint, 'Of no 10-22/2025'),
  ('112 - C-Esp-ME - X', 2::smallint, 'OCEANOGRAFIA', 6::smallint, 'Of no 10-22/2025'),
  ('112 - C-Esp-ME - X', 3::smallint, 'GELO MARINHO E TERRESTRE', 10::smallint, 'Of no 10-22/2025'),
  ('113 - C-Esp-ME - XI', 1::smallint, 'CONCEITOS GERAIS', 4::smallint, 'Of no 10-22/2025'),
  ('113 - C-Esp-ME - XI', 2::smallint, 'SERVIÇO METEOROLÓGICO MARINHO', 4::smallint, 'Of no 10-22/2025'),
  ('113 - C-Esp-ME - XI', 3::smallint, 'PREVISÃO NUMÉRICA DO TEMPO', 12::smallint, 'Of no 10-22/2025'),
  ('113 - C-Esp-ME - XI', 4::smallint, 'BOLETINS E AVISOS DE MAU TEMPO', 10::smallint, 'Of no 10-22/2025'),
  ('113 - C-Esp-ME - XI', 5::smallint, 'CARTAS METEOROLÓGICAS', 22::smallint, 'Of no 10-22/2025'),
  ('113 - C-Esp-ME - XI', 6::smallint, 'BRIEFINGS METEOROLÓGICOS', 20::smallint, 'Of no 10-22/2025'),
  ('114 - C-Esp-ME - XII', 1::smallint, 'VOCABULÁRIO TÉCNICO', 20::smallint, 'Of no 10-22/2025'),
  ('114 - C-Esp-ME - XII', 2::smallint, 'PUBLICAÇÕES ESTRANGEIRAS', 12::smallint, 'Of no 10-22/2025'),
  ('114 - C-Esp-ME - XII', 3::smallint, 'DISSEMINAÇÃO DE INFORMAÇÕES', 20::smallint, 'Of no 10-22/2025'),
  ('115 - C-Esp-OpAP - OPAP I', 1::smallint, 'ASPECTOS GERAIS SOBRE O CONTINENTE ANTÁRTICO E OPERAÇÕES', 10::smallint, 'Of no 10-20/2025'),
  ('115 - C-Esp-OpAP - OPAP I', 2::smallint, 'LEGISLAÇÃO ANTÁRTICA', 5::smallint, 'Of no 10-20/2025'),
  ('116 - C-Esp-OpAP - OPAP II', 1::smallint, 'METEOROLOGIA', 7::smallint, 'Of no 10-20/2025'),
  ('116 - C-Esp-OpAP - OPAP II', 2::smallint, 'GLACIOLOGIA ANTÁRTICA', 3::smallint, 'Of no 10-20/2025'),
  ('116 - C-Esp-OpAP - OPAP II', 3::smallint, 'PRÁTICA DE METEOROLOGIA ANTÁRTICA', 3::smallint, 'Of no 10-20/2025'),
  ('117 - C-Esp-OpAP - OPAP III', 1::smallint, 'OPERAÇÕES E NAVEGAÇÃO NA REGIÃO ANTÁRTICA', 11::smallint, 'Of no 10-20/2025'),
  ('117 - C-Esp-OpAP - OPAP III', 2::smallint, 'PROCEDIMENTOS OPERATIVOS PARA AS REGIÕES POLARES', 5::smallint, 'Of no 10-20/2025'),
  ('117 - C-Esp-OpAP - OPAP III', 3::smallint, 'PLANEJAMENTO DE OPERAÇÕES', 18::smallint, 'Of no 10-20/2025'),
  ('118 - C-Esp-OpAP - OPAP IV', 1::smallint, 'PRÁTICA EM SIMULADORES', 15::smallint, 'Of no 10-20/2025'),
  ('83 - C-Exp-Ag-Mag - I', 1::smallint, 'MAGNETISMO', 12::smallint, 'Of no 10-24/2025'),
  ('83 - C-Exp-Ag-Mag - I', 2::smallint, 'AGULHAS NÁUTICAS', 9::smallint, 'Of no 10-24/2025'),
  ('83 - C-Exp-Ag-Mag - I', 3::smallint, 'TEORIA DOS DESVIOS', 18::smallint, 'Of no 10-24/2025'),
  ('83 - C-Exp-Ag-Mag - I', 4::smallint, 'COMPENSAÇÃO DE AGULHA MAGNÉTICA', 21::smallint, 'Of no 10-24/2025'),
  ('84 - C-Exp-Ag-Mag - II', 1::smallint, 'PRÁTICA DE COMPENSAÇÃO DE AGULHA MAGNÉTICA EM SIMULADOR', 48::smallint, 'Of no 10-24/2025'),
  ('84 - C-Exp-Ag-Mag - II', 2::smallint, 'PRÁTICA DE COMPENSAÇÃO DE AGULHA MAGNÉTICA A BORDO DE NAVIO', 32::smallint, 'Of no 10-24/2025'),
  ('85 - C-Exp-BATI - I', 1::smallint, 'SISTEMA DE BATITERMOGRAFIA', 1::smallint, 'Of no 10-17/2025'),
  ('85 - C-Exp-BATI - I', 2::smallint, 'BATITERMÓGRAFO DESCARTÁVEL (X-BT)', 3::smallint, 'Of no 10-17/2025'),
  ('85 - C-Exp-BATI - I', 3::smallint, 'SISTEMAS DE LANÇAMENTO DO X-BT', 6::smallint, 'Of no 10-17/2025'),
  ('85 - C-Exp-BATI - I', 4::smallint, 'ESTRUTURA TÉRMICA VERTICAL TÍPICA DO OCEANO', 6::smallint, 'Of no 10-17/2025'),
  ('85 - C-Exp-BATI - I', 5::smallint, 'BATITERMOGRAMAS', 4::smallint, 'Of no 10-17/2025'),
  ('85 - C-Exp-BATI - I', 6::smallint, 'PARÂMETROS METEOROLÓGICOS', 4::smallint, 'Of no 10-17/2025'),
  ('85 - C-Exp-BATI - I', 7::smallint, 'MODELOS: REGISTRO DE DADOS BATITERMOGRÁFICOS', 3::smallint, 'Of no 10-17/2025'),
  ('85 - C-Exp-BATI - I', 8::smallint, 'MENSAGENS BATHY', 8::smallint, 'Of no 10-17/2025'),
  ('85 - C-Exp-BATI - I', 9::smallint, 'OPERAÇÃO COM O SISTEMA BATITERMOGRÁFICO', 7::smallint, 'Of no 10-17/2025'),
  ('86 - C-Exp-MetocOf - I', 1::smallint, 'INTRODUÇÃO A METEOROLOGIA', 2::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('86 - C-Exp-MetocOf - I', 2::smallint, 'METEOROLOGIA FÍSICA', 6::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('86 - C-Exp-MetocOf - I', 3::smallint, 'METEOROLOGIA DINÂMICA', 4::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('86 - C-Exp-MetocOf - I', 4::smallint, 'METEOROLOGIA SINÓTICA', 5::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('86 - C-Exp-MetocOf - I', 5::smallint, 'METEOROLOGIA TROPICAL', 4::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('86 - C-Exp-MetocOf - I', 6::smallint, 'METEOROLOGIA DE MESOESCALA', 3::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('86 - C-Exp-MetocOf - I', 7::smallint, 'METEOROLOGIA POR SATÉLITE', 6::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('87 - C-Exp-MetocOf - II', 1::smallint, 'PRODUTOS DISPONÍVEIS', 4::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('87 - C-Exp-MetocOf - II', 2::smallint, 'PROCESSOS DE PREVISÃO', 15::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('88 - C-Exp-MetocOf - III', 1::smallint, 'INTRODUÇÃO À OCEANOGRAFIA', 2::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('88 - C-Exp-MetocOf - III', 2::smallint, 'PROPRIEDADES FÍSICO-QUÍMICAS DA ÁGUA DO MAR', 3::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('88 - C-Exp-MetocOf - III', 3::smallint, 'ACÚSTICA SUBMARINA', 11::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('88 - C-Exp-MetocOf - III', 4::smallint, 'INTERAÇÃO OCEANO-ATMOSFERA', 4::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('88 - C-Exp-MetocOf - III', 5::smallint, 'CIRCULAÇÃO OCEÂNICA', 3::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('88 - C-Exp-MetocOf - III', 6::smallint, 'CARACTERÍSTICAS DAS ONDAS OCEÂNICAS', 1::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('88 - C-Exp-MetocOf - III', 7::smallint, 'GERAÇÃO, PREVISÃO E PROPAGAÇÃO DAS ONDAS', 3::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('88 - C-Exp-MetocOf - III', 8::smallint, 'TÉCNICAS DE OBSERVAÇÃO DA ONDA', 1::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('88 - C-Exp-MetocOf - III', 9::smallint, 'MÉTODOS DE PREVISÃO DE ONDAS E ANÁLISE DA CARTA SINÓTICA', 2::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('88 - C-Exp-MetocOf - III', 10::smallint, 'APLICAÇÕES OPERACIONAIS DOS MÉTODOS DE PREVISÃO', 2::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('88 - C-Exp-MetocOf - III', 11::smallint, 'ARREBENTAÇÃO DAS ONDAS', 5::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('89 - C-Exp-MetocOf - IV', 1::smallint, 'REFRAÇÃO DAS ONDAS ELETROMAGNÉTICAS', 2::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('89 - C-Exp-MetocOf - IV', 2::smallint, 'INTERAÇÃO DAS ONDAS ELETROMAGNÉTICAS ATMOSFERA', 4::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('89 - C-Exp-MetocOf - IV', 3::smallint, 'DUTOS DE EVAPORAÇÃO', 3::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('89 - C-Exp-MetocOf - IV', 4::smallint, 'CAMADAS DE CONFINAMENTO ELEVADAS', 3::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('89 - C-Exp-MetocOf - IV', 5::smallint, 'PREVISÃO DA PROPAGAÇÃO ELETROMAGNÉTICA', 6::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('90 - C-Exp-MetocOf - V', 1::smallint, 'FASE I - PLANEJAMENTO DA OPERAÇÃO INDICADA PARA O ESTUDO PRÁTICO', 24::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('90 - C-Exp-MetocOf - V', 2::smallint, 'FASE II - EXECUÇÃO DA OPERAÇÃO', 26::smallint, 'Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('92 - C-Exp-Obs-ME - I', 1::smallint, 'METEOROLOGIA NAS ATIVIDADES NAVAIS', 3::smallint, 'Curriculo C-EXP-OBS-ME — MARINHA DO BRASIL, 2011'),
  ('92 - C-Exp-Obs-ME - I', 2::smallint, 'PROPRIEDADES FÍSICAS E FENÔMENOS', 18::smallint, 'Curriculo C-EXP-OBS-ME — MARINHA DO BRASIL, 2011'),
  ('92 - C-Exp-Obs-ME - I', 3::smallint, 'METEOROLOGIA SINÓTICA', 10::smallint, 'Curriculo C-EXP-OBS-ME — MARINHA DO BRASIL, 2011'),
  ('92 - C-Exp-Obs-ME - I', 4::smallint, 'TELECOMUNICAÇÕES METEOROLÓGICAS', 5::smallint, 'Curriculo C-EXP-OBS-ME — MARINHA DO BRASIL, 2011'),
  ('92 - C-Exp-Obs-ME - I', 5::smallint, 'CARTAS E BOLETINS METEOROLÓGICOS', 14::smallint, 'Curriculo C-EXP-OBS-ME — MARINHA DO BRASIL, 2011'),
  ('93 - C-Exp-Obs-ME - II', 1::smallint, 'ESTAÇÃO METEOROLÓGICA', 2::smallint, 'Curriculo C-EXP-OBS-ME — MARINHA DO BRASIL, 2011'),
  ('93 - C-Exp-Obs-ME - II', 2::smallint, 'INSTRUMENTOS METEOROLÓGICOS', 10::smallint, 'Curriculo C-EXP-OBS-ME — MARINHA DO BRASIL, 2011'),
  ('93 - C-Exp-Obs-ME - II', 3::smallint, 'OBSERVAÇÕES METEOROLÓGICAS', 45::smallint, 'Curriculo C-EXP-OBS-ME — MARINHA DO BRASIL, 2011'),
  ('93 - C-Exp-Obs-ME - II', 4::smallint, 'OBSERVAÇÃO EM ALTITUDE', 8::smallint, 'Curriculo C-EXP-OBS-ME — MARINHA DO BRASIL, 2011'),
  ('151 - EST-QF-APHID - I', 1::smallint, 'ACÚSTICA SUBMARINA', 2::smallint, 'Curriculo EST - QF - APHID — MARINHA DO BRASIL, 2023'),
  ('151 - EST-QF-APHID - I', 2::smallint, 'PUBLICAÇÃO', 2::smallint, 'Curriculo EST - QF - APHID — MARINHA DO BRASIL, 2023'),
  ('151 - EST-QF-APHID - I', 3::smallint, 'PRINCÍCPIOS DOS SISTEMA MULTIFEIXE', 5::smallint, 'Curriculo EST - QF - APHID — MARINHA DO BRASIL, 2023'),
  ('151 - EST-QF-APHID - I', 4::smallint, 'VELOCIDADE DO SOM E REFRAÇÃO', 1::smallint, 'Curriculo EST - QF - APHID — MARINHA DO BRASIL, 2023'),
  ('151 - EST-QF-APHID - I', 5::smallint, 'SENSORES AUXILIARES E MOVIMENTO DA EMBARCAÇÃO', 2::smallint, 'Curriculo EST - QF - APHID — MARINHA DO BRASIL, 2023'),
  ('151 - EST-QF-APHID - I', 6::smallint, 'CALIBRAÇÃO DE SISTEMA MULTIFEIXE (PATCH TEST)', 2::smallint, 'Curriculo EST - QF - APHID — MARINHA DO BRASIL, 2023'),
  ('151 - EST-QF-APHID - I', 7::smallint, 'MARÉ APLICADA', 2::smallint, 'Curriculo EST - QF - APHID — MARINHA DO BRASIL, 2023'),
  ('152 - EST-QF-APHID - II', 1::smallint, 'COMUNICAÇÃO SERIAL', 2::smallint, 'Curriculo EST - QF - APHID — MARINHA DO BRASIL, 2023'),
  ('152 - EST-QF-APHID - II', 2::smallint, 'COMUNICAÇÃO ETHERNET', 2::smallint, 'Curriculo EST - QF - APHID — MARINHA DO BRASIL, 2023'),
  ('152 - EST-QF-APHID - II', 3::smallint, 'PRÁTICA DE CONFIGURAÇÃO DE EQUIPAMENTOS', 4::smallint, 'Curriculo EST - QF - APHID — MARINHA DO BRASIL, 2023'),
  ('153 - EST-QF-APHID - III', 1::smallint, 'AML SEACAST', 2::smallint, 'Curriculo EST - QF - APHID — MARINHA DO BRASIL, 2023'),
  ('153 - EST-QF-APHID - III', 2::smallint, 'CARIS HIPS & SIPS', 2::smallint, 'Curriculo EST - QF - APHID — MARINHA DO BRASIL, 2023'),
  ('153 - EST-QF-APHID - III', 3::smallint, 'SEAFLOOR INFORMATION SYSTEM', 12::smallint, 'Curriculo EST - QF - APHID — MARINHA DO BRASIL, 2023'),
  ('154 - EST-QF-APHID - IV', 1::smallint, 'PRÁTICA DE AQUISIÇÃO DE DADOS', 16::smallint, 'Curriculo EST - QF - APHID — MARINHA DO BRASIL, 2023'),
  ('155 - EST-QF-APHID - V', 1::smallint, 'PRÁTICA DE PROCESSAMENTO DE DADOS', 16::smallint, 'Curriculo EST - QF - APHID — MARINHA DO BRASIL, 2023'),
  ('157 - EST-QF-EM2040PHS - I', 1::smallint, 'MONTAGEM DA HASTE', 6::smallint, 'Curriculo EST - QF -  EM2040PHS — MARINHA DO BRASIL, 2024'),
  ('157 - EST-QF-EM2040PHS - I', 2::smallint, 'SMP', 2::smallint, 'Curriculo EST - QF -  EM2040PHS — MARINHA DO BRASIL, 2024'),
  ('158 - EST-QF-EM2040PHS - II', 1::smallint, 'COMUNICAÇÃO DO SISTEMA', 3::smallint, 'Curriculo EST - QF -  EM2040PHS — MARINHA DO BRASIL, 2024'),
  ('158 - EST-QF-EM2040PHS - II', 2::smallint, 'PRINCIPAIS CONFIGURAÇÕES E TRÂMITE DE DADOS', 3::smallint, 'Curriculo EST - QF -  EM2040PHS — MARINHA DO BRASIL, 2024'),
  ('158 - EST-QF-EM2040PHS - II', 3::smallint, 'SISTEMAS DE POSICIONAMENTO DIFERENCIAL', 2::smallint, 'Curriculo EST - QF -  EM2040PHS — MARINHA DO BRASIL, 2024'),
  ('159 - EST-QF-EM2040PHS - III', 1::smallint, 'SISv5', 4::smallint, 'Curriculo EST - QF -  EM2040PHS — MARINHA DO BRASIL, 2024'),
  ('156 - EST-QF-PROC-MF-EAD - I', 1::smallint, 'PRÁTICA DE PROCESSAMENTO DE DADOS MULTIFEIXE', 57::smallint, 'Curriculo EST - QF – PROC – MF - EAD — MARINHA DO BRASIL, 2024'),
  ('163 - EST-QF-MAREFLU - I', 1::smallint, 'DEFINIÇÕES GERAIS BÁSICAS', 12::smallint, 'Curriculo EST-QF-MAREFLU — MARINHA DO BRASIL, 2026'),
  ('163 - EST-QF-MAREFLU - I', 2::smallint, 'NOÇÕES BÁSICAS DE AQUISIÇÃO E ANÁLISE DE DADOS MAREGRÁFICOS', 28::smallint, 'Curriculo EST-QF-MAREFLU — MARINHA DO BRASIL, 2026'),
  ('163 - EST-QF-MAREFLU - I', 3::smallint, 'NOÇÕES BÁSICAS DE AQUISIÇÃO E ANÁLISE DE DADOS FLUVIOMÉTRICOS', 12::smallint, 'Curriculo EST-QF-MAREFLU — MARINHA DO BRASIL, 2026'),
  ('163 - EST-QF-MAREFLU - I', 4::smallint, 'REDUÇÃO DE SONDAGEM EM RIOS COM INFLUÊNCIA DE MARÉ ASTRONÔMICA', 8::smallint, 'Curriculo EST-QF-MAREFLU — MARINHA DO BRASIL, 2026'),
  ('162 - EST-QF-NAVFLU-EAD - I', 1::smallint, 'Métodos de Navegação Empregados a Bordo', 2::smallint, 'Curriculo EST - QF - NAVFLU - EAD — MARINHA DO BRASIL, 2026'),
  ('162 - EST-QF-NAVFLU-EAD - I', 2::smallint, 'Equipe de Navegação', 2::smallint, 'Curriculo EST - QF - NAVFLU - EAD — MARINHA DO BRASIL, 2026'),
  ('162 - EST-QF-NAVFLU-EAD - I', 3::smallint, 'Planejamento de Viagem', 6::smallint, 'Curriculo EST - QF - NAVFLU - EAD — MARINHA DO BRASIL, 2026'),
  ('162 - EST-QF-NAVFLU-EAD - I', 4::smallint, 'Acompanhamento de Embarcações na Área Navegada', 3::smallint, 'Curriculo EST - QF - NAVFLU - EAD — MARINHA DO BRASIL, 2026'),
  ('162 - EST-QF-NAVFLU-EAD - I', 5::smallint, 'Particularidades da Navegação em Hidrovias', 7::smallint, 'Curriculo EST - QF - NAVFLU - EAD — MARINHA DO BRASIL, 2026'),
  ('162 - EST-QF-NAVFLU-EAD - I', 6::smallint, 'Procedimentos da Navegação Fluvial', 12::smallint, 'Curriculo EST - QF - NAVFLU - EAD — MARINHA DO BRASIL, 2026'),
  ('162 - EST-QF-NAVFLU-EAD - I', 7::smallint, 'Termos Regionais Utilizados na Navegação Fluvial', 4::smallint, 'Curriculo EST - QF - NAVFLU - EAD — MARINHA DO BRASIL, 2026'),
  ('160 - EST-QF-PGRS100 - I', 1::smallint, 'CONCEITOS INTRODUTÓRIOS', 2::smallint, 'Curriculo EST - QF - PGRS100 — MARINHA DO BRASIL, 2025'),
  ('160 - EST-QF-PGRS100 - I', 2::smallint, 'MÓDULO 2: PRÉ-IMPRESSÃO', 4::smallint, 'Curriculo EST - QF - PGRS100 — MARINHA DO BRASIL, 2025'),
  ('160 - EST-QF-PGRS100 - I', 3::smallint, 'IMPRESSÃO', 3::smallint, 'Curriculo EST - QF - PGRS100 — MARINHA DO BRASIL, 2025'),
  ('160 - EST-QF-PGRS100 - I', 4::smallint, 'PÓS-IMPRESSÃO', 3::smallint, 'Curriculo EST - QF - PGRS100 — MARINHA DO BRASIL, 2025'),
  ('160 - EST-QF-PGRS100 - I', 5::smallint, 'PROJETO FINAL', 3::smallint, 'Curriculo EST - QF - PGRS100 — MARINHA DO BRASIL, 2025'),
  ('160 - EST-QF-PGRS100 - I', 6::smallint, 'PROJEÇÕES TRANSVERSAIS DE MERCATOR', 5::smallint, 'Curriculo EST - QF - PGRS100 — MARINHA DO BRASIL, 2025'),
  ('161 - EST-QF-PGRS100 - II', 1::smallint, 'TIPOS DE PRODUTOS CARTOGRÁFICOS', 3::smallint, 'Curriculo EST - QF - PGRS100 — MARINHA DO BRASIL, 2025'),
  ('161 - EST-QF-PGRS100 - II', 2::smallint, 'PUBLICAÇÕES DE AUXÍLIO À NAVEGAÇÃO', 3::smallint, 'Curriculo EST - QF - PGRS100 — MARINHA DO BRASIL, 2025'),
  ('161 - EST-QF-PGRS100 - II', 3::smallint, 'O MODELO DE DADOS UNIVERSAL (S-100)', 4::smallint, 'Curriculo EST - QF - PGRS100 — MARINHA DO BRASIL, 2025'),
  ('140 - C-ApA-OcOp-PR-SP - I', 1::smallint, 'ESTRATÉGIA DE LEITURA', 30::smallint, 'Of no 10-16/2023'),
  ('141 - C-ApA-OcOp-PR-SP - II', 1::smallint, 'IMPORTÂNCIA DA OCEANOGRAFIA PARA MARINHA DO BRASIL', 1::smallint, 'Of no 10-16/2023'),
  ('141 - C-ApA-OcOp-PR-SP - II', 2::smallint, 'COMPOSIÇÃO DA ÁGUA DO MAR', 4::smallint, 'Of no 10-16/2023'),
  ('141 - C-ApA-OcOp-PR-SP - II', 3::smallint, 'PROPRIEDADES FÍSICO QUÍMICAS DA ÁGUA DO MAR', 7::smallint, 'Of no 10-16/2023'),
  ('141 - C-ApA-OcOp-PR-SP - II', 4::smallint, 'INTERAÇÃO OCEANO ATMOSFERA', 6::smallint, 'Of no 10-16/2023'),
  ('141 - C-ApA-OcOp-PR-SP - II', 5::smallint, 'CORRENTES OCEÂNICAS E MASSAS DE ÁGUA', 23::smallint, 'Of no 10-16/2023'),
  ('141 - C-ApA-OcOp-PR-SP - II', 6::smallint, 'PRÁTICA DE OCEANOGRAFIA FÍSICA DESCRITIVA', 5::smallint, 'Of no 10-16/2023'),
  ('142 - C-ApA-OcOp-PR-SP - III', 1::smallint, 'ONDAS', 14::smallint, 'Of no 10-16/2023'),
  ('143 - C-ApA-OcOp-PR-SP - IV', 1::smallint, 'INTERPRETAÇÃO DA ANÁLISE E PREVISÃO DA MARÉ', 8::smallint, 'Of no 10-16/2023'),
  ('143 - C-ApA-OcOp-PR-SP - IV', 2::smallint, 'ESTAÇÃO MAREGRÁFICA', 6::smallint, 'Of no 10-16/2023'),
  ('143 - C-ApA-OcOp-PR-SP - IV', 3::smallint, 'REDUÇÃO DE SONDAGENS', 16::smallint, 'Of no 10-16/2023'),
  ('144 - C-ApA-OcOp-PR-SP - V', 1::smallint, 'PREVISÃO NUMÉRICA', 7::smallint, 'Of no 10-16/2023'),
  ('144 - C-ApA-OcOp-PR-SP - V', 2::smallint, 'SERVIÇO METEOROLÓGICO MARINHO', 8::smallint, 'Of no 10-16/2023'),
  ('145 - C-ApA-OcOp-PR-SP - VI', 1::smallint, 'NOÇÕES DE PROCESSAMENTO DE DADOS', 30::smallint, 'Of no 10-16/2023'),
  ('146 - C-ApA-OcOp-PR-SP - VII', 1::smallint, 'SISTEMAS OPERACIONAIS', 6::smallint, 'Of no 10-16/2023'),
  ('146 - C-ApA-OcOp-PR-SP - VII', 2::smallint, 'FERRAMENTAS DE ANÁLISE DO EXCEL', 8::smallint, 'Of no 10-16/2023'),
  ('146 - C-ApA-OcOp-PR-SP - VII', 3::smallint, 'LINGUAGEM DE PROGRAMAÇÃO', 16::smallint, 'Of no 10-16/2023'),
  ('147 - C-ApA-OcOp-PR-SP - VIII', 1::smallint, 'DADOS OCEANOGRÁFICOS ADQUIRIDOS PELA MB', 4::smallint, 'Of no 10-16/2023'),
  ('147 - C-ApA-OcOp-PR-SP - VIII', 2::smallint, 'TEMPERATURA E SALINIDADE', 10::smallint, 'Of no 10-16/2023'),
  ('147 - C-ApA-OcOp-PR-SP - VIII', 3::smallint, 'CORRENTOMETRIA', 10::smallint, 'Of no 10-16/2023'),
  ('147 - C-ApA-OcOp-PR-SP - VIII', 4::smallint, 'BOIAS E FLUTUADORES', 8::smallint, 'Of no 10-16/2023'),
  ('147 - C-ApA-OcOp-PR-SP - VIII', 5::smallint, 'OCEANOGRAFIA POR SATÉLITE', 4::smallint, 'Of no 10-16/2023'),
  ('148 - C-ApA-OcOp-PR-SP - IX', 1::smallint, 'PLANEJAMENTO DO LEVANTAMENTO OCEANOGRÁFICO', 5::smallint, 'Of no 10-16/2023'),
  ('148 - C-ApA-OcOp-PR-SP - IX', 2::smallint, 'PREPARAÇÃO E OPERAÇÃO DE EQUIPAMENTOS OCEANOGRÁFICOS', 24::smallint, 'Of no 10-16/2023'),
  ('149 - C-ApA-OcOp-PR-SP - X', 1::smallint, 'APRESENTAÇÃO DOS TEMAS', 10::smallint, 'Of no 10-16/2023'),
  ('149 - C-ApA-OcOp-PR-SP - X', 2::smallint, 'ORIENTAÇÃO DE FORMATAÇÃO, ESTRUTURAÇÃO E COMPOSIÇÃO DO TRABALHO DE FINAL DE CURSO', 70::smallint, 'Of no 10-16/2023'),
  ('86 - C-Exp-Metoc-OF-SP - I', 1::smallint, 'INTRODUÇÃO À METEOROLOGIA', 4::smallint, 'Of no 10-16/2025'),
  ('86 - C-Exp-Metoc-OF-SP - I', 2::smallint, 'METEOROLOGIA FÍSICA', 8::smallint, 'Of no 10-16/2025'),
  ('86 - C-Exp-Metoc-OF-SP - I', 3::smallint, 'METEOROLOGIA DINÂMICA', 6::smallint, 'Of no 10-16/2025'),
  ('86 - C-Exp-Metoc-OF-SP - I', 4::smallint, 'METEOROLOGIA SINÓTICA', 5::smallint, 'Of no 10-16/2025'),
  ('86 - C-Exp-Metoc-OF-SP - I', 5::smallint, 'METEOROLOGIA TROPICAL', 5::smallint, 'Of no 10-16/2025'),
  ('86 - C-Exp-Metoc-OF-SP - I', 6::smallint, 'METEOROLOGIA DE MESOESCALA', 4::smallint, 'Of no 10-16/2025'),
  ('86 - C-Exp-Metoc-OF-SP - I', 7::smallint, 'METEOROLOGIA POR SATÉLITE', 2::smallint, 'Of no 10-16/2025'),
  ('86 - C-Exp-Metoc-OF-SP - I', 8::smallint, 'EFEITOS ATMOSFÉRICOS SOBRE A PROPAGAÇÃO ELETROMAGNÉTICA', 14::smallint, 'Of no 10-16/2025'),
  ('87 - C-Exp-Metoc-OF-SP - II', 1::smallint, 'MONITORAMENTO METEOROLÓGICO', 4::smallint, 'Of no 10-16/2025'),
  ('87 - C-Exp-Metoc-OF-SP - II', 2::smallint, 'PRODUTOS METEOROLÓGICOS DISPONÍVEIS AOS NAVEGANTES', 5::smallint, 'Of no 10-16/2025'),
  ('87 - C-Exp-Metoc-OF-SP - II', 3::smallint, 'PROCESSO DE PREVISÃO', 10::smallint, 'Of no 10-16/2025'),
  ('88 - C-Exp-Metoc-OF-SP - III', 1::smallint, 'INTRODUÇÃO À OCEANOGRAFIA', 2::smallint, 'Of no 10-16/2025'),
  ('88 - C-Exp-Metoc-OF-SP - III', 2::smallint, 'PROPRIEDADES FÍSICO-QUÍMICAS DA ÁGUA DO MAR', 3::smallint, 'Of no 10-16/2025'),
  ('88 - C-Exp-Metoc-OF-SP - III', 3::smallint, 'ACÚSTICA SUBMARINA', 11::smallint, 'Of no 10-16/2025'),
  ('88 - C-Exp-Metoc-OF-SP - III', 4::smallint, 'INTERAÇÃO OCEANO-ATMOSFERA', 4::smallint, 'Of no 10-16/2025'),
  ('88 - C-Exp-Metoc-OF-SP - III', 5::smallint, 'CIRCULAÇÃO OCEÂNICA', 3::smallint, 'Of no 10-16/2025'),
  ('88 - C-Exp-Metoc-OF-SP - III', 6::smallint, 'CARACTERÍSTICAS DAS ONDAS OCEÂNICAS', 1::smallint, 'Of no 10-16/2025'),
  ('88 - C-Exp-Metoc-OF-SP - III', 7::smallint, 'GERAÇÃO, PROPAGAÇÃO E PREVISÃO DAS ONDAS', 3::smallint, 'Of no 10-16/2025'),
  ('88 - C-Exp-Metoc-OF-SP - III', 8::smallint, 'TÉCNICA DA OBSERVAÇÃO DA ONDA', 1::smallint, 'Of no 10-16/2025'),
  ('88 - C-Exp-Metoc-OF-SP - III', 9::smallint, 'MÉTODOS DE PREVISÃO DE ONDAS E CARTA SINÓTICA', 2::smallint, 'Of no 10-16/2025'),
  ('88 - C-Exp-Metoc-OF-SP - III', 10::smallint, 'APLICAÇÕES OPERACIONAIS DOS MÉTODOS DE PREVISÃO', 2::smallint, 'Of no 10-16/2025'),
  ('88 - C-Exp-Metoc-OF-SP - III', 11::smallint, 'ARREBENTAÇÃO DAS ONDAS', 5::smallint, 'Of no 10-16/2025'),
  ('90 - C-Exp-Metoc-OF-SP - V', 1::smallint, 'PLANEJAMENTO DA OPERAÇÃO INDICADA PARA O ESTUDO PRÁTICO', 25::smallint, 'Of no 10-16/2025'),
  ('90 - C-Exp-Metoc-OF-SP - V', 2::smallint, 'EXECUÇÃO DA OPERAÇÃO', 15::smallint, 'Of no 10-16/2025'),
  ('133 - C-ApA-PrevMe-PR-EAD - PrevMe I', 1::smallint, 'ESTRATÉGIAS DE LEITURA', 37::smallint, 'Of no 10-27/2022'),
  ('134 - C-ApA-PrevMe-PR-EAD - PrevMe II', 1::smallint, 'METEOROLOGIA SINÓTICA PARA A NAVEGAÇÃO', 30::smallint, 'Of no 10-27/2022'),
  ('134 - C-ApA-PrevMe-PR-EAD - PrevMe II', 2::smallint, 'INTERPRETAÇÃO DE PRODUTOS DE SATÉLITES METEOROLÓGICOS', 12::smallint, 'Of no 10-27/2022'),
  ('134 - C-ApA-PrevMe-PR-EAD - PrevMe II', 3::smallint, 'SISTEMA GLOBAL DE INFORMAÇÕES METEOROLÓGICAS PARA O MAR', 12::smallint, 'Of no 10-27/2022'),
  ('135 - C-ApA-PrevMe-PR-EAD - PrevMe III', 1::smallint, 'MASSAS DE ÁGUA', 16::smallint, 'Of no 10-27/2022'),
  ('135 - C-ApA-PrevMe-PR-EAD - PrevMe III', 2::smallint, 'NÍVEL DO MAR', 8::smallint, 'Of no 10-27/2022'),
  ('135 - C-ApA-PrevMe-PR-EAD - PrevMe III', 3::smallint, 'CIRCULAÇÃO OCEÂNICA E COSTEIRA', 15::smallint, 'Of no 10-27/2022'),
  ('135 - C-ApA-PrevMe-PR-EAD - PrevMe III', 4::smallint, 'DADOS OCEANOGRÁFICOS', 8::smallint, 'Of no 10-27/2022'),
  ('136 - C-ApA-PrevMe-PR-EAD - PrevMe IV', 1::smallint, 'INTRODUÇÃO À MODELAGEM NUMÉRICA', 4::smallint, 'Of no 10-27/2022'),
  ('136 - C-ApA-PrevMe-PR-EAD - PrevMe IV', 2::smallint, 'TIPOS DE MODELOS NUMÉRICOS', 4::smallint, 'Of no 10-27/2022'),
  ('136 - C-ApA-PrevMe-PR-EAD - PrevMe IV', 3::smallint, 'CARACTERÍSTICAS DOS MODELOS NUMÉRICOS', 10::smallint, 'Of no 10-27/2022'),
  ('136 - C-ApA-PrevMe-PR-EAD - PrevMe IV', 4::smallint, 'ETAPAS DA PREVISÃO NUMÉRICA', 4::smallint, 'Of no 10-27/2022'),
  ('136 - C-ApA-PrevMe-PR-EAD - PrevMe IV', 5::smallint, 'INTERPRETAÇÃO DE PRODUTOS NUMÉRICOS', 10::smallint, 'Of no 10-27/2022'),
  ('136 - C-ApA-PrevMe-PR-EAD - PrevMe IV', 6::smallint, 'PRODUTOS NUMÉRICOS DISPONIBILIZADOS PELO CHM', 2::smallint, 'Of no 10-27/2022'),
  ('137 - C-ApA-PrevMe-PR-EAD - PrevMe V', 1::smallint, 'CÓDIGOS METEOROLÓGICOS', 9::smallint, 'Of no 10-27/2022'),
  ('137 - C-ApA-PrevMe-PR-EAD - PrevMe V', 2::smallint, 'CARTAS METEOROLÓGICAS', 7::smallint, 'Of no 10-27/2022'),
  ('137 - C-ApA-PrevMe-PR-EAD - PrevMe V', 3::smallint, 'BRIEFING METEOROLÓGICO', 18::smallint, 'Of no 10-27/2022'),
  ('138 - C-ApA-PrevMe-PR-EAD - PrevMe VI', 1::smallint, 'ORGANIZAÇÃO METEOROLÓGICA MUNDIAL (OMM/WMO)', 4::smallint, 'Of no 10-27/2022'),
  ('138 - C-ApA-PrevMe-PR-EAD - PrevMe VI', 2::smallint, 'NORMAS E MANUAIS DA OMM', 20::smallint, 'Of no 10-27/2022'),
  ('138 - C-ApA-PrevMe-PR-EAD - PrevMe VI', 3::smallint, 'COMISSÃO OCEANOGRÁFICA INTERGOVERNAMENTAL (COI/IOC)', 4::smallint, 'Of no 10-27/2022'),
  ('138 - C-ApA-PrevMe-PR-EAD - PrevMe VI', 4::smallint, 'ORGANIZAÇÃO MARÍTIMA INTERNACIONAL (OMI/IMO)', 10::smallint, 'Of no 10-27/2022'),
  ('138 - C-ApA-PrevMe-PR-EAD - PrevMe VI', 5::smallint, 'ORGANIZAÇÃO HIDROGRÁFICA INTERNACIONAL (OHI/IHO)', 4::smallint, 'Of no 10-27/2022'),
  ('138 - C-ApA-PrevMe-PR-EAD - PrevMe VI', 6::smallint, 'NORMAS DA MARINHA DO BRASIL', 12::smallint, 'Of no 10-27/2022'),
  ('139 - C-ApA-PrevMe-PR-EAD - PrevMe VII', 1::smallint, 'APRESENTAÇÃO DOS TEMAS E ORIENTAÇÕES GERAIS', 4::smallint, 'Of no 10-27/2022'),
  ('139 - C-ApA-PrevMe-PR-EAD - PrevMe VII', 2::smallint, 'ELABORAÇÃO DO TRABALHO DE FINAL DE CURSO', 96::smallint, 'Of no 10-27/2022'),
  ('150 - EST-QF-APOC - I', 1::smallint, 'INTRODUÇÃO À OCEANOGRAFIA', 9::smallint, 'Curriculo EST-QF-APOC — CIAARA, 2021 (transcrito de imagem)'),
  ('150 - EST-QF-APOC - I', 2::smallint, 'AQUISIÇÃO DE DADOS NOS MEIOS DA MB', 18::smallint, 'Curriculo EST-QF-APOC — CIAARA, 2021 (transcrito de imagem)'),
  ('150 - EST-QF-APOC - I', 3::smallint, 'CORRENTOMETRIA', 9::smallint, 'Curriculo EST-QF-APOC — CIAARA, 2021 (transcrito de imagem)'),
  ('150 - EST-QF-APOC - I', 4::smallint, 'ANÁLISE DOS DADOS', 20::smallint, 'Curriculo EST-QF-APOC — CIAARA, 2021 (transcrito de imagem)'),
  ('150 - EST-QF-APOC - I', 5::smallint, 'ATIVIDADES PRÁTICAS', 24::smallint, 'Curriculo EST-QF-APOC — CIAARA, 2021 (transcrito de imagem)')
)
insert into public.unidades_ensino
  (disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos,
   fundamento_normativo, origem_migracao_v1)
select d.id, d.curso_id, e.numero_ue, e.topico, e.ch, e.fundamento,
       '20260926024246_carga_unidades_ensino.sql'
  from entrada e
  join public.disciplinas d on d.codigo = e.destino
on conflict (disciplina_id, numero_ue) do nothing;

-- ---------------------------------------------------------------------------------
-- PARTE C — os dois cursos por competencias e as seis disciplinas sem UE
--
-- ⚠️ `curriculo_modelo` e DADO, nao deducao (D-B3): a tela nao pode concluir "este curso
--    nao tem UE porque nao achei nenhuma". Sem esta marca, um curso por competencias
--    apareceria como curso incompleto para sempre.
-- ---------------------------------------------------------------------------------
update public.cursos
   set curriculo_modelo = 'competencias'
 where codigo in ('C-Espc-FR', 'C-Espc-HN')
   and curriculo_modelo <> 'competencias';

-- As que nao tem UE por NATUREZA, uma a uma, com o motivo no comentario:
--   C-ApA-AuxNav-PR-SP · AMBIENTAÇÃO VIRTUAL.: AMBIENTACAO e FASE no curriculo, nao disciplina: aparece so na composicao da CH, nunca no quadro de disciplinas (conferencia §4.5). Sem UE por naturez
--   C-ApA-OcOp-PR-SP · AMBIENTAÇÃO VIRTUAL.: idem §4.5 — curriculo 10 h x banco 8.
--   C-ApA-PCN-PR-EAD · AMBIENTAÇÃO VIRTUAL.: idem §4.5 — curriculo 5 h x banco 8.
--   C-ApA-PrevMe-PR-EAD · AMBIENTAÇÃO VIRTUAL.: idem §4.5 — curriculo 5 h x banco 8.
--   C-Exp-Metoc-OF-SP · AMBIENTAÇÃO VIRTUAL.: idem §4.5 — curriculo 8 h = banco 8.
--   C-Exp-Metoc-OF-SP · EFEITOS ATMOSFÉRICOS SOBRE A PROPAGAÇÃO ELETROMAGNÉTICA / C-Exp-METOC-OF: A linha carrega a sigla do OUTRO curso e a CH da `IV` do curriculo de 2011. O pareamento NUNCA e cruzado (P-2), e replicar a UE do presencial seria in
-- ⚠️ A chave e `disciplinas.codigo`, NAO o nome: `EFEITOS ATMOSFERICOS SOBRE A PROPAGACAO
--    ELETROMAGNETICA / C-Exp-METOC-OF` existe com o MESMO nome nos DOIS cursos METOC, e so
--    a copia do SP e marcada — no presencial a disciplina e legitima e recebe 5 UEs.
--    Casar por nome marcaria a errada, ou as duas.
update public.disciplinas
   set sem_unidades_ensino = true
 where sem_unidades_ensino = false
   and codigo in (
     '91 - C-ApA-AuxNav-PR-SP - -',   -- C-ApA-AuxNav-PR-SP · AMBIENTAÇÃO VIRTUAL.
     '91 - C-ApA-OcOp-PR-SP - -',   -- C-ApA-OcOp-PR-SP · AMBIENTAÇÃO VIRTUAL.
     '91 - C-ApA-PCN-PR-EAD - -',   -- C-ApA-PCN-PR-EAD · AMBIENTAÇÃO VIRTUAL.
     '91 - C-ApA-PrevMe-PR-EAD - -',   -- C-ApA-PrevMe-PR-EAD · AMBIENTAÇÃO VIRTUAL.
     '91 - C-Exp-Metoc-OF-SP - -',   -- C-Exp-Metoc-OF-SP · AMBIENTAÇÃO VIRTUAL.
     '89 - C-Exp-Metoc-OF-SP - IV'   -- C-Exp-Metoc-OF-SP · EFEITOS ATMOSFÉRICOS SOBRE A PROPAGAÇÃO ELETRO
   );

-- ---------------------------------------------------------------------------------
-- PARTE D — um evento por curriculo em `migracao_log` (append-only, regra 5)
-- ---------------------------------------------------------------------------------
insert into public.migracao_log
  (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,
   acao, regra_aplicada, valor_antes, valor_depois, observacao)
select * from (values
  ('MLOG-5B-UE-2OF1062025DENSMCIAARAANACAHO512201PDF', 'curriculo_densm', '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf',
   'unidades_ensino', 'CAHO',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '132 UEs',
   'Carga das UEs do curriculo 2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf: 132 unidades em 22 disciplinas de CAHO. Fundamento por oficio. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Of no 10-6/2025'),
  ('MLOG-5B-UE-2OF10262022DENSMCIAARAANCAPAAUXNAVSP00PD', 'curriculo_densm', '2._of-10-26-2022-densm-ciaara-an-c-apa-aux-nav-sp_0_0.pdf',
   'unidades_ensino', 'C-ApA-AuxNav-PR-SP',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '17 UEs',
   'Carga das UEs do curriculo 2._of-10-26-2022-densm-ciaara-an-c-apa-aux-nav-sp_0_0.pdf: 17 unidades em 7 disciplinas de C-ApA-AuxNav-PR-SP. Fundamento por oficio. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Of no 10-26/2022'),
  ('MLOG-5B-UE-2OF1031DENSMCIAARAANCAPAPCNPREAD2PDF', 'curriculo_densm', '2._of-10-31-densm-ciaara-an-capa-pcn-pr-ead_2.pdf',
   'unidades_ensino', 'C-ApA-PCN-PR-EAD',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '18 UEs',
   'Carga das UEs do curriculo 2._of-10-31-densm-ciaara-an-capa-pcn-pr-ead_2.pdf: 18 unidades em 7 disciplinas de C-ApA-PCN-PR-EAD. Fundamento por oficio. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Of no 10-31/2022'),
  ('MLOG-5B-UE-4OF1062025DENSMCIAARAANCCAPFRPDF', 'curriculo_densm', '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf',
   'unidades_ensino', 'C-Ap-FR',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '60 UEs',
   'Carga das UEs do curriculo 4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf: 60 unidades em 13 disciplinas de C-Ap-FR. Fundamento por oficio. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Of no 10-6/2025'),
  ('MLOG-5B-UE-CAPHNPDF', 'curriculo_densm', 'c-ap-hn.pdf',
   'unidades_ensino', 'C-Ap-HN',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '95 UEs',
   'Carga das UEs do curriculo c-ap-hn.pdf: 95 unidades em 19 disciplinas de C-Ap-HN. Fundamento por oficio. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Of no 10-6/2025'),
  ('MLOG-5B-UE-CESPALHPDF', 'curriculo_densm', 'c-esp-alh.pdf',
   'unidades_ensino', 'C-Esp-ALH',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '21 UEs',
   'Carga das UEs do curriculo c-esp-alh.pdf: 21 unidades em 9 disciplinas de C-Esp-ALH. Fundamento por oficio. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Of no 10-16/2020'),
  ('MLOG-5B-UE-CESPMEPDF', 'curriculo_densm', 'c-esp-me.pdf',
   'unidades_ensino', 'C-Esp-ME',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '62 UEs',
   'Carga das UEs do curriculo c-esp-me.pdf: 62 unidades em 12 disciplinas de C-Esp-ME. Fundamento por oficio. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Of no 10-22/2025'),
  ('MLOG-5B-UE-CESPOPAPPDF', 'curriculo_densm', 'c-esp-opap.pdf',
   'unidades_ensino', 'C-Esp-OpAP',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '9 UEs',
   'Carga das UEs do curriculo c-esp-opap.pdf: 9 unidades em 4 disciplinas de C-Esp-OpAP. Fundamento por oficio. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Of no 10-20/2025'),
  ('MLOG-5B-UE-CEXPAGMAGPDF', 'curriculo_densm', 'c-exp-agmag.pdf',
   'unidades_ensino', 'C-Exp-Ag-Mag',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '6 UEs',
   'Carga das UEs do curriculo c-exp-agmag.pdf: 6 unidades em 2 disciplinas de C-Exp-Ag-Mag. Fundamento por oficio. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Of no 10-24/2025'),
  ('MLOG-5B-UE-CEXPBATIPDF', 'curriculo_densm', 'c-exp-bati.pdf',
   'unidades_ensino', 'C-Exp-BATI',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '9 UEs',
   'Carga das UEs do curriculo c-exp-bati.pdf: 9 unidades em 1 disciplinas de C-Exp-BATI. Fundamento por oficio. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Of no 10-17/2025'),
  ('MLOG-5B-UE-CEXPMETOCOF0PDF', 'curriculo_densm', 'c-exp-metocof_0.pdf',
   'unidades_ensino', 'C-Exp-MetocOf',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '27 UEs',
   'Carga das UEs do curriculo c-exp-metocof_0.pdf: 27 unidades em 5 disciplinas de C-Exp-MetocOf. Fundamento por capa. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Curriculo C-EXP-METOC-OF — MARINHA DO BRASIL, 2011'),
  ('MLOG-5B-UE-CEXPOBSME00PDF', 'curriculo_densm', 'c-exp-obs-me_0_0.pdf',
   'unidades_ensino', 'C-Exp-Obs-ME',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '9 UEs',
   'Carga das UEs do curriculo c-exp-obs-me_0_0.pdf: 9 unidades em 2 disciplinas de C-Exp-Obs-ME. Fundamento por capa. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Curriculo C-EXP-OBS-ME — MARINHA DO BRASIL, 2011'),
  ('MLOG-5B-UE-CURRICULOCIAARAESTQFAPHIDPRESENCIALMOD2P', 'curriculo_densm', 'curriculo-ciaara-est-qf-aphid_presencial_mod2.pdf',
   'unidades_ensino', 'EST-QF-APHID',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '15 UEs',
   'Carga das UEs do curriculo curriculo-ciaara-est-qf-aphid_presencial_mod2.pdf: 15 unidades em 5 disciplinas de EST-QF-APHID. Fundamento por capa. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Curriculo EST - QF - APHID — MARINHA DO BRASIL, 2023'),
  ('MLOG-5B-UE-CURRICULOCIAARAESTQFEM2040PHSPDF', 'curriculo_densm', 'curriculo-ciaara-est-qf-em2040phs.pdf',
   'unidades_ensino', 'EST-QF-EM2040PHS',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '6 UEs',
   'Carga das UEs do curriculo curriculo-ciaara-est-qf-em2040phs.pdf: 6 unidades em 3 disciplinas de EST-QF-EM2040PHS. Fundamento por capa. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Curriculo EST - QF -  EM2040PHS — MARINHA DO BRASIL, 2024'),
  ('MLOG-5B-UE-CURRICULOCIAARAESTQFPROCMFEADMOD3PDF', 'curriculo_densm', 'curriculo-ciaara-est-qf-proc-mf-ead_mod3.pdf',
   'unidades_ensino', 'EST-QF-PROC-MF-EAD',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '1 UEs',
   'Carga das UEs do curriculo curriculo-ciaara-est-qf-proc-mf-ead_mod3.pdf: 1 unidades em 1 disciplinas de EST-QF-PROC-MF-EAD. Fundamento por capa. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Curriculo EST - QF – PROC – MF - EAD — MARINHA DO BRASIL, 2024'),
  ('MLOG-5B-UE-ESTQFMAREFLUPDF', 'curriculo_densm', 'est-qf-mareflu.pdf',
   'unidades_ensino', 'EST-QF-MAREFLU',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '4 UEs',
   'Carga das UEs do curriculo est-qf-mareflu.pdf: 4 unidades em 1 disciplinas de EST-QF-MAREFLU. Fundamento por capa. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Curriculo EST-QF-MAREFLU — MARINHA DO BRASIL, 2026'),
  ('MLOG-5B-UE-ESTQFNAVFLUEADPDF', 'curriculo_densm', 'est-qf-navflu-ead.pdf',
   'unidades_ensino', 'EST-QF-NAVFLU-EAD',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '7 UEs',
   'Carga das UEs do curriculo est-qf-navflu-ead.pdf: 7 unidades em 1 disciplinas de EST-QF-NAVFLU-EAD. Fundamento por capa. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Curriculo EST - QF - NAVFLU - EAD — MARINHA DO BRASIL, 2026'),
  ('MLOG-5B-UE-ESTQFPGRS100PDF', 'curriculo_densm', 'est-qf-pgrs100.pdf',
   'unidades_ensino', 'EST-QF-PGRS100',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '9 UEs',
   'Carga das UEs do curriculo est-qf-pgrs100.pdf: 9 unidades em 2 disciplinas de EST-QF-PGRS100. Fundamento por capa. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Curriculo EST - QF - PGRS100 — MARINHA DO BRASIL, 2025'),
  ('MLOG-5B-UE-MARINHADOBRASILCURRICULODOESTQFAPOCPDF', 'curriculo_densm', 'marinha_do_brasil_-_curriculo-do-est-qf-apoc.pdf',
   'unidades_ensino', 'EST-QF-APOC',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '5 UEs',
   'Carga das UEs do curriculo marinha_do_brasil_-_curriculo-do-est-qf-apoc.pdf: 5 unidades em 1 disciplinas de EST-QF-APOC. Fundamento por transcrito_de_imagem. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Curriculo EST-QF-APOC — CIAARA, 2021 (transcrito de imagem)'),
  ('MLOG-5B-UE-OF10162023DENSMCIAARAANCAPAOCOPPRSPPDF', 'curriculo_densm', 'of-10-16-2023-densm-ciaara-an-c-apa-ocop-pr-sp.pdf',
   'unidades_ensino', 'C-ApA-OcOp-PR-SP',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '26 UEs',
   'Carga das UEs do curriculo of-10-16-2023-densm-ciaara-an-c-apa-ocop-pr-sp.pdf: 26 unidades em 10 disciplinas de C-ApA-OcOp-PR-SP. Fundamento por oficio. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Of no 10-16/2023'),
  ('MLOG-5B-UE-OF10162025DENSMCIAARAANCEXPMETOCSP512201', 'curriculo_densm', 'of-10-16-2025-densm-ciaara-an-c-exp-metoc-sp-512.2.01.pdf',
   'unidades_ensino', 'C-Exp-Metoc-OF-SP',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '24 UEs',
   'Carga das UEs do curriculo of-10-16-2025-densm-ciaara-an-c-exp-metoc-sp-512.2.01.pdf: 24 unidades em 4 disciplinas de C-Exp-Metoc-OF-SP. Fundamento por oficio. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Of no 10-16/2025'),
  ('MLOG-5B-UE-OF10272022DENSMCIAARAANCAPAPREVMEPREAD00', 'curriculo_densm', 'of-10-27-2022-densm-ciaara-an-c-apa-prevme-pr-ead_0_0.pdf',
   'unidades_ensino', 'C-ApA-PrevMe-PR-EAD',
   'adicionado'::public.acao_migracao,
   'UE-1 / FR-064', NULL, '25 UEs',
   'Carga das UEs do curriculo of-10-27-2022-densm-ciaara-an-c-apa-prevme-pr-ead_0_0.pdf: 25 unidades em 7 disciplinas de C-ApA-PrevMe-PR-EAD. Fundamento por oficio. Conferido por leitura independente em 24-25/09/2026 (conferencia-dos-curriculos.md) e pareado em pareamento_ue.csv. Fundamento: Of no 10-27/2022')
) as novos(codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,
           acao, regra_aplicada, valor_antes, valor_depois, observacao)
-- Idempotente sem `on conflict`: `migracao_log` recusa UPDATE e DELETE por gatilho, e
-- `where not exists` e o que deixa a migration poder ser reaplicada sem duplicar evento.
-- ⚠️ E `exists (disciplinas)`: numa base sem cadastros a carga nao aconteceu, e gravar o
--    evento dela seria registrar por antecipacao um fato que nao ocorreu (regra 9.3).
where not exists (
  select 1 from public.migracao_log m where m.codigo = novos.codigo
)
  and exists (select 1 from public.unidades_ensino);

-- ---------------------------------------------------------------------------------
-- PARTE E — a assercao: a carga fechou, ou a migration nao vale
--
-- ⚠️ Ela conta o que esta NO BANCO com esta procedencia, nao o que o INSERT devolveu: o
--    `do nothing` esconde a diferenca entre "inseri 587" e "ja havia 587", e as duas
--    situacoes sao aceitaveis; o que NAO e aceitavel e 586.
-- ---------------------------------------------------------------------------------
do $assercao$
declare
  v_ues              integer;
  v_disciplinas      integer;
  v_sem_fundamento   integer;
  v_sem_procedencia  integer;
  v_ch               integer;
  v_competencias     integer;
  v_sem_ue           integer;
  v_sequencia        bigint;
begin
  if not exists (select 1 from public.disciplinas) then
    raise notice 'carga de UE: nada a conferir numa base sem cadastros.';
    return;
  end if;

  select count(*), count(distinct disciplina_id), coalesce(sum(ch_prevista_tempos), 0)
    into v_ues, v_disciplinas, v_ch
    from public.unidades_ensino where origem_migracao_v1 = '20260926024246_carga_unidades_ensino.sql';

  if v_ues <> 587 then
    raise exception 'carga de UE: % linhas com esta procedencia, esperava 587', v_ues;
  end if;
  if v_disciplinas <> 138 then
    raise exception 'carga de UE: % disciplinas, esperava 138', v_disciplinas;
  end if;
  if v_ch <> 7411 then
    raise exception 'carga de UE: soma de CH %, esperava 7411', v_ch;
  end if;

  -- FR-064: procedencia e fundamento em TODA linha, sem excecao.
  select count(*) filter (where fundamento_normativo is null or btrim(fundamento_normativo) = ''),
         count(*) filter (where origem_migracao_v1 is null)
    into v_sem_fundamento, v_sem_procedencia
    from public.unidades_ensino;
  if v_sem_fundamento > 0 or v_sem_procedencia > 0 then
    raise exception 'carga de UE: % sem fundamento e % sem procedencia',
      v_sem_fundamento, v_sem_procedencia;
  end if;

  select count(*) into v_competencias from public.cursos
   where curriculo_modelo = 'competencias';
  if v_competencias <> 2 then
    raise exception 'carga de UE: % cursos por competencias, esperava 2', v_competencias;
  end if;

  select count(*) into v_sem_ue from public.disciplinas where sem_unidades_ensino;
  if v_sem_ue <> 6 then
    raise exception 'carga de UE: % disciplinas marcadas sem UE, esperava 6',
      v_sem_ue;
  end if;

  -- gotcha 9, na forma que importa: a sequencia NAO pode ficar atras do que ja existe,
  -- senao a primeira UE criada na tela colide com uma que esta carga acabou de trazer.
  -- Nao ha `setval` aqui: o `DEFAULT` avancou a sequencia sozinho, uma vez por linha, e
  -- `setval` nao obedece a ROLLBACK (gotcha 6).
  select last_value into v_sequencia from app.unidades_ensino_codigo_seq;
  if v_sequencia < (select count(*) from public.unidades_ensino) then
    raise exception 'carga de UE: sequencia em % e a tabela tem % linhas',
      v_sequencia, (select count(*) from public.unidades_ensino);
  end if;

  raise notice 'carga de UE conferida: % linhas, % disciplinas, % de CH, sequencia em %',
    v_ues, v_disciplinas, v_ch, v_sequencia;
end
$assercao$;
