-- =====================================================================================================================
-- Bloco 18 (spec 033) — CARGA INICIAL DAS AEC PREVISTAS do currículo 1 de 2026, a partir do passo 0 conferido.
--
-- > "6. AUTORIZAÇÃO NOMINAL para carregar por script, no remoto, as AEC previstas da tabela do passo 0 nos currículos 1
-- > de 2026, como correção RC-6 com a justificativa 'Carga inicial das AEC previstas do currículo (bloco de Atividades,
-- > conferida por Bernardo em 03/11/2026)' e trilha. Item sem TA no currículo entra com TA vazio. Backup antes,
-- > conferência só de leitura depois, e a lista do que entrou no relatório." — Bernardo Villas Boas, 03/11/2026
-- > "5. AEC prevista = roteiros de palestra + visitas nomeadas (visita de estudo é AEC pelo 2.5, inclusive as de
-- > cômputo não informado). Fora: categorias genéricas, o que o currículo põe na UE, e o TG da Navegação Astronômica do
-- > C-Ap-HN (texto contraditório)."
--
-- O QUE FAZ: as 48 AEC previstas de `specs/033-bloco-18-atividades/passo-0-aec-dos-curriculos.md` (D-8 da spec 033:
-- também ficam fora a corrida de balizamento do CAHO e o embarque de Oceanografia do C-Espc-HN — não são palestra nem
-- visita), em `aec_previstas_curriculo`, no currículo 1 de cada curso.
--
-- ⚠️ A TRILHA DA RC-6 É A DO GATILHO, NÃO ESCRITA À MÃO: o bloco roda com a SESSÃO do Admin (`USR-ADMIN-001`) e a
--    justificativa autorizada no cabeçalho, como a tela faria — `app.guardar_curriculo_em_uso` grava `correcoes_de_curriculo`
--    (acao `incluir`) em cada currículo em uso, e `set_auditoria` carimba `criado_por`. `autor_id` da trilha é obrigatório
--    (D-13 da spec 033): quem gravou foi este script, autorizado nominalmente — o relatório diz isso.
-- ⚠️ ATÔMICO E IDEMPOTENTE: um bloco só (tudo ou nada); a AEC prevista que já existe ativa, com o mesmo nome, no mesmo
--    currículo, é pulada — rodar de novo dá zero inclusões.
-- ⚠️ RECUSA, SEM GRAVAR NADA, se faltar o curso, o currículo 1, o tipo ou a disciplina citada.
--
-- COMO RODAR: ensaio no banco LOCAL com a cópia do remoto (docker exec … psql < este arquivo); no remoto, depois do
-- backup (`python -m scripts.manutencao.dado_do_remoto --somente-copia`), `supabase db query --linked -f <este arquivo>`;
-- a conferência é `scripts/manutencao/conferir_aec_previstas.sql`, só de leitura.
-- =====================================================================================================================
do $carga$
declare
  v_admin      uuid;
  v_curso      uuid;
  v_curriculo  uuid;
  v_tipo       uuid;
  v_disciplina uuid;
  v_incluidas  int := 0;
  v_puladas    int := 0;
  r            record;
begin
  select u.auth_user_id into v_admin
    from public.usuarios u where u.codigo = 'USR-ADMIN-001' and u.status = 'ativo' and u.auth_user_id is not null;
  if v_admin is null then
    raise exception 'Carga das AEC previstas: a conta USR-ADMIN-001 não está ativa com credencial. Nada foi gravado.';
  end if;
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.headers',
    jsonb_build_object('x-justificativa-de-correcao',
      encode(convert_to('Carga inicial das AEC previstas do currículo (bloco de Atividades, conferida por Bernardo em 03/11/2026)',
                        'UTF8'), 'base64'))::text,
    true);

  for r in
    select * from (values
      -- curso, ordem, nome (grafia do PDF), tipo (valor), TA, disciplina (cod), obrigatória, arquivo, página, observação
      ('CAHO', 1, 'SEGURANÇA ORGÂNICA (SEGORG)', 'Palestra', 1, null, true, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 'A-74 (Anexo B)', null),
      ('CAHO', 2, 'AMAZÔNIA AZUL (AMAZUL)', 'Palestra', 4, null, true, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 'A-76 (Anexo C)', null),
      ('CAHO', 3, 'EDUCAÇÃO FINANCEIRA (EDFIN)', 'Palestra', 2, null, true, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 'A-78 (Anexo D)', null),
      ('CAHO', 4, 'ESTRATÉGIA NACIONAL DE DEFESA (END)', 'Palestra', 2, null, true, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 'A-80 (Anexo E)', null),
      ('CAHO', 5, 'Visita orientada ao Centro de Auxílios à Navegação Almirante Moraes Rego (CAMR)', 'Visita Técnica', 4, 'VIII', true, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 'A-31', null),
      ('CAHO', 6, 'Visitas ao CHM (UE 3 e 4: análise e carga dos dados nos bancos de dados)', 'Visita Técnica', 6, 'XV', true, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 'A-51', null),
      ('CAHO', 7, 'Visita à Divisão de Previsões Ambientais e à Divisão de Previsão Numérica (CH-12 e CH-13)', 'Visita Técnica', 2, 'V', true, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 'A-22', 'O currículo não diz onde se computa (AEC pela definição de visita de estudo, item 2.5).'),
      ('CAHO', 8, 'Visita à oficina de Agulhas Magnéticas da Base de Hidrografia da Marinha em Niterói (BHMN)', 'Visita Técnica', null, 'XII', true, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 'A-43', 'O currículo não dá TA nem diz onde se computa (AEC pela definição de visita de estudo, item 2.5).'),
      ('CAHO', 9, 'Visita técnica à Raia Acústica em Arraial do Cabo (CASOP)', 'Visita Técnica', null, 'XIII', false, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 'A-46', 'Facultativa («poderá»); computada na CH das atividades extraclasse; sem TA no currículo.'),
      ('CAHO', 10, 'Visita ao Centro de Pesquisa da Eletrobrás (CEPEL)', 'Visita Técnica', null, 'VIII', false, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 'A-31', 'Facultativa («poderá»); o currículo não dá TA.'),
      ('C-Ap-FR', 1, 'AMAZÔNIA AZUL (AMAZUL)', 'Palestra', 2, null, true, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 'C-40 (Anexo A)', null),
      ('C-Ap-FR', 2, 'PATRULHA NAVAL (PN)', 'Palestra', 2, null, true, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 'C-42 (Anexo B)', null),
      ('C-Ap-FR', 3, 'INTEGRAÇÃO DA MULHER E REGRAS DE CONDUTA E CONVIVÊNCIA (RCCM-MB)', 'Palestra', 2, null, true, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 'C-44 (Anexo C)', null),
      ('C-Ap-FR', 4, 'SEGURANÇA ORGÂNICA (SEGORG)', 'Palestra', 8, null, true, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 'C-45 (Anexo D)', null),
      ('C-Ap-HN', 1, 'AMAZÔNIA AZUL (AMAZUL)', 'Palestra', 2, null, true, 'c-ap-hn.pdf', 'B-58 (Anexo A)', null),
      ('C-Ap-HN', 2, 'PATRULHA NAVAL (PN)', 'Palestra', 2, null, true, 'c-ap-hn.pdf', 'B-60 (Anexo B)', null),
      ('C-Ap-HN', 3, 'INTEGRAÇÃO DA MULHER E REGRAS DE CONDUTA E CONVIVÊNCIA (RCCM-MB)', 'Palestra', 2, null, true, 'c-ap-hn.pdf', 'B-62 (Anexo C)', null),
      ('C-Ap-HN', 4, 'SEGURANÇA ORGÂNICA (SEGORG)', 'Palestra', 8, null, true, 'c-ap-hn.pdf', 'B-63 (Anexo D)', null),
      ('C-Ap-HN', 5, 'Visitas ao Serviço Meteorológico Marinho no Centro de Hidrografia da Marinha (2 visitas de 2 TA)', 'Visita Técnica', 4, 'IV', true, 'c-ap-hn.pdf', 'B-15', 'O currículo não diz onde se computa (AEC pela definição de visita de estudo, item 2.5).'),
      ('C-Espc-FR', 1, 'SEGURANÇA ORGÂNICA', 'Palestra', 8, null, true, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 'A-97 (Anexo A)', null),
      ('C-Espc-FR', 2, 'DIREITO INTERNACIONAL DOS CONFLITOS ARMADOS', 'Palestra', 2, null, true, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 'A-99 (Anexo B)', null),
      ('C-Espc-FR', 3, 'SEGURANÇA DA INFORMAÇÃO E COMUNICAÇÕES', 'Palestra', 2, null, true, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 'A-101 (Anexo C)', null),
      ('C-Espc-FR', 4, 'PROGRAMA DE EXCELÊNCIA DE GESTÃO DA MARINHA - PROGRAMA NETUNO', 'Palestra', 3, null, true, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 'A-104 (Anexo D)', null),
      ('C-Espc-FR', 5, 'AMAZÔNIA AZUL', 'Palestra', 4, null, true, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 'A-107 (Anexo E)', null),
      ('C-Espc-FR', 6, 'EDUCAÇÃO AMBIENTAL', 'Palestra', 2, null, true, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 'A-110 (Anexo F)', null),
      ('C-Espc-FR', 7, 'EDUCAÇÃO FINANCEIRA 1 (início do curso)', 'Palestra', 2, null, true, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 'A-113 (Anexo G)', null),
      ('C-Espc-FR', 8, 'EDUCAÇÃO FINANCEIRA 2 (meio do ano)', 'Palestra', 2, null, true, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 'A-115 (Anexo H)', null),
      ('C-Espc-FR', 9, 'EDUCAÇÃO FINANCEIRA 3 (final do curso)', 'Palestra', 2, null, true, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 'A-117 (Anexo I)', null),
      ('C-Espc-FR', 10, 'PATRULHA NAVAL', 'Palestra', 2, null, true, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 'A-119 (Anexo J)', null),
      ('C-Espc-FR', 11, 'REGRAS DE CONDUTA E CONVIVÊNCIA ENTRE MILITARES DA MARINHA', 'Palestra', 2, null, true, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 'A-121 (Anexo K)', 'O roteiro está no anexo K, mas o 4.2.2 do currículo não a lista entre as AEC.'),
      ('C-Espc-HN', 1, 'SEGURANÇA ORGÂNICA', 'Palestra', 8, null, true, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 'B-114 (Anexo A)', null),
      ('C-Espc-HN', 2, 'DIREITO INTERNACIONAL DOS CONFLITOS ARMADOS', 'Palestra', 2, null, true, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 'B-116 (Anexo B)', null),
      ('C-Espc-HN', 3, 'SEGURANÇA DA INFORMAÇÃO E COMUNICAÇÕES', 'Palestra', 2, null, true, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 'B-118 (Anexo C)', null),
      ('C-Espc-HN', 4, 'PROGRAMA DE EXCELÊNCIA DE GESTÃO DA MARINHA - PROGRAMA NETUNO', 'Palestra', 3, null, true, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 'B-121 (Anexo D)', null),
      ('C-Espc-HN', 5, 'AMAZÔNIA AZUL', 'Palestra', 4, null, true, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 'B-124 (Anexo E)', null),
      ('C-Espc-HN', 6, 'EDUCAÇÃO AMBIENTAL', 'Palestra', 2, null, true, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 'B-127 (Anexo F)', null),
      ('C-Espc-HN', 7, 'EDUCAÇÃO FINANCEIRA 1 (início do curso)', 'Palestra', 2, null, true, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 'B-130 (Anexo G)', null),
      ('C-Espc-HN', 8, 'EDUCAÇÃO FINANCEIRA 2 (meio do ano)', 'Palestra', 2, null, true, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 'B-132 (Anexo H)', null),
      ('C-Espc-HN', 9, 'EDUCAÇÃO FINANCEIRA 3 (final do curso)', 'Palestra', 2, null, true, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 'B-134 (Anexo I)', null),
      ('C-Espc-HN', 10, 'PATRULHA NAVAL', 'Palestra', 2, null, true, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 'B-136 (Anexo J)', null),
      ('C-Espc-HN', 11, 'REGRAS DE CONDUTA E CONVIVÊNCIA ENTRE MILITARES DA MARINHA', 'Palestra', 2, null, true, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 'B-138 (Anexo K)', null),
      ('C-Espc-HN', 12, 'APOIO LOGÍSTICO INTEGRADO E GESTÃO DO CICLO DE VIDA', 'Palestra', 2, null, true, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 'B-139 (Anexo L)', null),
      ('C-Exp-MetocOf', 1, 'Visita à Divisão de Informações Oceanográficas do CHM (CH-11)', 'Visita Técnica', null, null, true, 'c-exp-metocof_0.pdf', '4', 'As 6 h de AEC do currículo cobrem as três visitas ao CHM, sem repartição.'),
      ('C-Exp-MetocOf', 2, 'Visita à Divisão de Sensoriamento Remoto do CHM (CH-14)', 'Visita Técnica', null, null, true, 'c-exp-metocof_0.pdf', '4', 'As 6 h de AEC do currículo cobrem as três visitas ao CHM, sem repartição.'),
      ('C-Exp-MetocOf', 3, 'Visita à Divisão do Banco Nacional de Dados Oceanográficos - BNDO do CHM (CH-22)', 'Visita Técnica', null, null, true, 'c-exp-metocof_0.pdf', '4', 'As 6 h de AEC do currículo cobrem as três visitas ao CHM, sem repartição.'),
      ('C-Exp-Obs-ME', 1, 'Visita à Divisão de Previsões Ambientais do CHM', 'Visita Técnica', null, null, true, 'c-exp-obs-me_0_0.pdf', '4', 'As 5 h de AEC do currículo cobrem as duas visitas, sem repartição.'),
      ('C-Exp-Obs-ME', 2, 'Visita ao Departamento de Controle do Espaço Aéreo do Galeão (DTCEA-GL)', 'Visita Técnica', null, null, true, 'c-exp-obs-me_0_0.pdf', '4', 'As 5 h de AEC do currículo cobrem as duas visitas, sem repartição.'),
      ('C-Exp-Ag-Mag', 1, 'Visita à oficina de Agulhas Magnéticas da Base de Hidrografia da Marinha em Niterói (BHMN)', 'Visita Técnica', null, 'II', true, 'c-exp-agmag.pdf', '8', 'O currículo não dá TA nem diz onde se computa (AEC pela definição de visita de estudo).')
    ) as t(curso, ordem, nome, tipo, ta, disciplina, obrigatoria, arquivo, pagina, observacao)
  loop
    select c.id, cu.id into v_curso, v_curriculo
      from public.cursos c join public.curriculos cu on cu.curso_id = c.id and cu.versao = 1
     where c.codigo = r.curso;
    if v_curriculo is null then
      raise exception 'Carga das AEC previstas: o curso % não tem o currículo 1. Nada foi gravado.', r.curso;
    end if;
    select l.id into v_tipo from public.config_listas l where l.lista = 'tipos_atividade' and l.valor = r.tipo;
    if v_tipo is null then
      raise exception 'Carga das AEC previstas: o tipo «%» não está no catálogo. Nada foi gravado.', r.tipo;
    end if;
    v_disciplina := null;
    if r.disciplina is not null then
      select d.id into v_disciplina from public.disciplinas d
       where d.curriculo_id = v_curriculo and d.cod_disciplina = r.disciplina and d.status = 'ativo';
      if v_disciplina is null then
        raise exception 'Carga das AEC previstas: a disciplina % do % não existe no currículo 1. Nada foi gravado.',
                        r.disciplina, r.curso;
      end if;
    end if;
    if exists (select 1 from public.aec_previstas_curriculo p
                where p.curriculo_id = v_curriculo and p.status = 'ativo' and lower(btrim(p.nome)) = lower(btrim(r.nome))) then
      v_puladas := v_puladas + 1;
      continue;
    end if;
    insert into public.aec_previstas_curriculo (curso_id, curriculo_id, nome, tipo_atividade_id, ta_previstos,
                                                disciplina_id, obrigatoria, ordem, fonte_arquivo, fonte_pagina, observacao)
    values (v_curso, v_curriculo, r.nome, v_tipo, r.ta, v_disciplina, r.obrigatoria, r.ordem, r.arquivo, r.pagina,
            r.observacao);
    v_incluidas := v_incluidas + 1;
  end loop;

  perform set_config('request.headers', '{}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  raise notice 'Carga das AEC previstas: % incluídas, % puladas (já existiam).', v_incluidas, v_puladas;
end;
$carga$;
