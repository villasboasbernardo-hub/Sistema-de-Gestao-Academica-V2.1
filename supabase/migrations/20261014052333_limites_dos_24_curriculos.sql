-- =================================================================================
-- Spec 014, PR 1 · migration de DADO D-1 — limites máximos de AEC, TAD e TR dos 24 currículos
-- GERADA por `python -m scripts.etl.gerar_carga_de_limites` a partir de
-- `scripts/etl/dados/limites_curriculo.csv` (revisado). NÃO editar à mão.
--
-- 30 linhas: o número que o quadro final de cada currículo declara, em TA (1 h = 1 TA,
-- premissa A-10), com arquivo e página (FR-001.1, Q-16). Curso sem linha cai no percentual da norma.
-- Abstém-se em base sem cursos; idempotente; evento em `migracao_log` só quando grava.
-- Reversão: `update limites_curriculo set status = 'inativo'` nas linhas com a procedência abaixo,
-- com evento novo em `migracao_log` (regra 5).
-- =================================================================================

do $$
declare
  v_cursos integer;
  v_inseridos integer;
  v_esperados integer;
begin
  select count(*) into v_cursos from public.cursos;
  if v_cursos = 0 then
    raise notice 'D-1 (spec 014): base sem cursos — a migration se abstém (a ETAPA 6 do ETL aplica o mesmo arquivo).';
    return;
  end if;

  with dado (curso_codigo, categoria, tempos, fonte_arquivo, fonte_pagina) as (values
    ('C-Ap-FR', 'AEC', 110, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 7),
    ('C-Ap-FR', 'TR', 126, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 7),
    ('C-Ap-HN', 'AEC', 65, 'c-ap-hn.pdf', 7),
    ('C-Ap-HN', 'TR', 78, 'c-ap-hn.pdf', 7),
    ('C-Esp-ALH', 'AEC', 30, 'c-esp-alh.pdf', 5),
    ('C-Esp-ALH', 'TR', 20, 'c-esp-alh.pdf', 5),
    ('C-Esp-ME', 'AEC', 43, 'c-esp-me.pdf', 5),
    ('C-Esp-ME', 'TR', 42, 'c-esp-me.pdf', 5),
    ('C-Esp-OpAP', 'AEC', 1, 'c-esp-opap.pdf', 5),
    ('C-Esp-OpAP', 'TR', 2, 'c-esp-opap.pdf', 5),
    ('C-Espc-FR', 'AEC', 80, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 5),
    ('C-Espc-FR', 'TAD', 62, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 5),
    ('C-Espc-FR', 'TR', 57, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 5),
    ('C-Espc-HN', 'AEC', 80, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 5),
    ('C-Espc-HN', 'TAD', 62, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 5),
    ('C-Espc-HN', 'TR', 112, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 5),
    ('C-Exp-Ag-Mag', 'AEC', 10, 'c-exp-agmag.pdf', 5),
    ('C-Exp-Ag-Mag', 'TR', 10, 'c-exp-agmag.pdf', 5),
    ('C-Exp-BATI', 'AEC', 3, 'c-exp-bati.pdf', 4),
    ('C-Exp-BATI', 'TR', 4, 'c-exp-bati.pdf', 4),
    ('C-Exp-MetocOf', 'AEC', 6, 'c-exp-metocof_0.pdf', 4),
    ('C-Exp-MetocOf', 'TR', 15, 'c-exp-metocof_0.pdf', 4),
    ('C-Exp-Obs-ME', 'AEC', 5, 'c-exp-obs-me_0_0.pdf', 4),
    ('C-Exp-Obs-ME', 'TR', 20, 'c-exp-obs-me_0_0.pdf', 4),
    ('CAHO', 'AEC', 166, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 8),
    ('CAHO', 'TR', 166, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 8),
    ('EST-QF-APHID', 'TR', 8, 'curriculo-ciaara-est-qf-aphid_presencial_mod2.pdf', 5),
    ('EST-QF-EM2040PHS', 'TR', 4, 'curriculo-ciaara-est-qf-em2040phs.pdf', 5),
    ('EST-QF-MAREFLU', 'TR', 4, 'est-qf-mareflu.pdf', 4),
    ('EST-QF-PGRS100', 'TR', 5, 'est-qf-pgrs100.pdf', 4)
  ), ins as (
    insert into public.limites_curriculo (curso_id, categoria, tempos, fonte_arquivo, fonte_pagina, origem_migracao_v1)
    select c.id, d.categoria::public.categoria_normativa, d.tempos, d.fonte_arquivo, d.fonte_pagina,
           'spec014-D1:' || d.fonte_arquivo
      from dado d join public.cursos c on c.codigo = d.curso_codigo
    on conflict (curso_id, categoria) where status = 'ativo' do nothing
    returning 1
  )
  select count(*) into v_inseridos from ins;

  select count(*) into v_esperados
    from public.limites_curriculo l where l.status = 'ativo' and l.origem_migracao_v1 like 'spec014-D1:%';
  if v_esperados <> 30 then
    raise exception 'D-1 (spec 014): esperava 30 limites ativos com a procedência, há %', v_esperados;
  end if;

  if v_inseridos > 0 then
    insert into public.migracao_log (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,
                                     acao, regra_aplicada, valor_antes, valor_depois, observacao)
    values ('MLOG-014-D1-' || to_char(now(), 'YYYYMMDDHH24MISS'), 'curriculo_densm', 'limites_curriculo.csv',
            'limites_curriculo', 'quadro final', 'adicionado'::public.acao_migracao, 'FR-001.1 / Q-16 (spec 014)',
            null, v_inseridos || ' limites',
            'Carga dos limites máximos de AEC, TAD e TR do quadro final dos currículos da DEnsM (30 pares declarados).');
  end if;
  raise notice 'D-1 (spec 014): % limite(s) inserido(s); % ativo(s) com a procedência.', v_inseridos, v_esperados;
end;
$$;
