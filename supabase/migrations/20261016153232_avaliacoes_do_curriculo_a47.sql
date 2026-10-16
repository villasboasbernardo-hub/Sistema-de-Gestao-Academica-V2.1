-- =================================================================================
-- Spec 014 · A4.7 (PEND-014-6) — os itens de avaliação do currículo que ficaram fora da D-4, DECIDIDOS
-- GERADA por `python -m scripts.etl.decisao_a47 migration` a partir da planilha preenchida por Bernardo
-- Villas Boas. NÃO editar à mão.
--
-- Decisões: aceito 90 · corrijo 0 · recuso 0 · sem decisão 0 · proposta que não carrega 3. ENTRAM 87 itens.
-- Dos «aceito», 26 vieram de linha EM BRANCO que vale «aceito» da proposta por decisão de
-- Bernardo Villas Boas (16/10/2026: "as linhas 1 a 26, em branco, valem como 'aceito' da proposta").
-- Só ACRESCENTA itens em `avaliacoes_curriculo` (origem currículo, arquivo e página): nenhuma CH, nome ou código
-- de disciplina muda (D-CUR-1). Abstém-se em base sem cursos; idempotente; evento em `migracao_log` só quando grava.
-- Reversão: os itens com a procedência `spec014-A47:` ficam `inativo` (nada é apagado, regra 4).
-- =================================================================================

-- 1. instrumento novo na lista (domínio operacional: `config_listas`, nunca ENUM)
insert into public.config_listas (lista, valor, rotulo_exibicao, ordem, metadados)
values
  ('instrumentos_avaliacao', 'PT', 'Prova eletrônica', 20, jsonb_build_object('natureza', 'prova', 'vista_obrigatoria', false))
on conflict (lista, valor) do nothing;

-- 2. os itens
do $$
declare
  v_inseridos integer;
  v_ativos integer;
begin
  if not exists (select 1 from public.cursos) then
    raise notice 'A4.7 (spec 014): base sem cursos — a migration se abstém.';
    return;
  end if;

  with dado (item_a47, disciplina, ordem, instrumento, numero, ue, ues_abordadas, ta_aplicacao, ta_vista, fonte_arquivo, fonte_pagina) as (values
    (1, '3 - CAHO - I', 1, 'TG', 1, 2::smallint, 'UE 1 e 2', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 10),
    (2, '3 - CAHO - I', 2, 'TG', 2, 4::smallint, 'UE 3 e 4', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 10),
    (3, '5 - CAHO - III', 2, 'TG', 1, 9::smallint, 'toda a disciplina', null::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 16),
    (4, '6 - CAHO - IV', 3, 'PP', 1, null::smallint, 'UE 6', 40::smallint, null::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 19),
    (5, '9 - CAHO - VII', 1, 'PM', 1, null::smallint, 'toda a disciplina', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 28),
    (6, '9 - CAHO - VII', 2, 'TG', 1, null::smallint, 'toda a disciplina', 5::smallint, null::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 28),
    (7, '11 - CAHO - IX', 2, 'TG', 1, 6::smallint, 'toda a disciplina', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 34),
    (8, '12 - CAHO - X', 3, 'TG', 1, null::smallint, 'UE 3, 6 e 11', null::smallint, null::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 38),
    (9, '12 - CAHO - X', 4, 'TG', 2, null::smallint, 'UE 3, 6 e 11', null::smallint, null::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 38),
    (10, '12 - CAHO - X', 5, 'TG', 3, null::smallint, 'UE 3, 6 e 11', null::smallint, null::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 38),
    (11, '18 - CAHO - XVI', 3, 'TG', 1, 12::smallint, 'UE 11 e 12', 1::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 58),
    (12, '18 - CAHO - XVI', 4, 'TG', 2, 16::smallint, 'UE 13, 15 e 16', 1::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 58),
    (13, '21 - CAHO - XIX', 1, 'PP', 1, 2::smallint, 'toda a disciplina', 2::smallint, null::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 64),
    (14, '21 - CAHO - XIX', 2, 'PP', 2, 2::smallint, 'toda a disciplina', 2::smallint, null::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 64),
    (15, '22 - CAHO - XX', 1, 'PJ', 1, null::smallint, null, null::smallint, null::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 71),
    (16, '22 - CAHO - XX', 2, 'MN', 1, null::smallint, null, null::smallint, null::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 71),
    (17, '119 - C-ApA-AuxNav-PR-SP - I', 1, 'PT', 1, 2::smallint, 'UE 1 e 2', 1::smallint, 1::smallint, '2._of-10-26-2022-densm-ciaara-an-c-apa-aux-nav-sp_0_0.pdf', 8),
    (18, '119 - C-ApA-AuxNav-PR-SP - I', 2, 'PP', 1, 3::smallint, 'UE 3', 1::smallint, 1::smallint, '2._of-10-26-2022-densm-ciaara-an-c-apa-aux-nav-sp_0_0.pdf', 8),
    (19, '120 - C-ApA-AuxNav-PR-SP - II', 1, 'PT', 1, null::smallint, null, 1::smallint, null::smallint, '2._of-10-26-2022-densm-ciaara-an-c-apa-aux-nav-sp_0_0.pdf', 9),
    (20, '121 - C-ApA-AuxNav-PR-SP - III', 1, 'PJ', 1, null::smallint, null, null::smallint, null::smallint, '2._of-10-26-2022-densm-ciaara-an-c-apa-aux-nav-sp_0_0.pdf', 10),
    (21, '122 - C-ApA-AuxNav-PR-SP - IV', 1, 'PT', 1, 2::smallint, 'UE 1 e 2', 1::smallint, 1::smallint, '2._of-10-26-2022-densm-ciaara-an-c-apa-aux-nav-sp_0_0.pdf', 12),
    (22, '122 - C-ApA-AuxNav-PR-SP - IV', 2, 'PP', 1, 3::smallint, 'UE 3', 1::smallint, 1::smallint, '2._of-10-26-2022-densm-ciaara-an-c-apa-aux-nav-sp_0_0.pdf', 12),
    (23, '123 - C-ApA-AuxNav-PR-SP - V', 1, 'PT', 1, null::smallint, null, 1::smallint, null::smallint, '2._of-10-26-2022-densm-ciaara-an-c-apa-aux-nav-sp_0_0.pdf', 14),
    (24, '124 - C-ApA-AuxNav-PR-SP - VI', 1, 'PT', 1, null::smallint, null, 1::smallint, null::smallint, '2._of-10-26-2022-densm-ciaara-an-c-apa-aux-nav-sp_0_0.pdf', 16),
    (25, '132 - C-ApA-PCN-PR-EAD - PCN-PR-VII-EAD', 1, 'TI', 1, null::smallint, null, null::smallint, null::smallint, '2._of-10-31-densm-ciaara-an-capa-pcn-pr-ead_2.pdf', 18),
    (26, '40 - C-Ap-FR - X', 1, 'PP', 1, 2::smallint, 'UE 1 e 2', 2::smallint, null::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 28),
    (27, '40 - C-Ap-FR - X', 2, 'PP', 2, 2::smallint, 'UE 1 e 2', 1::smallint, null::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 28),
    (28, '40 - C-Ap-HN - XVII', 1, 'PP', 1, 2::smallint, 'toda a disciplina', 2::smallint, null::smallint, 'c-ap-hn.pdf', 48),
    (29, '40 - C-Ap-HN - XVII', 2, 'PP', 2, 2::smallint, 'toda a disciplina', 1::smallint, null::smallint, 'c-ap-hn.pdf', 48),
    (30, '94 - C-Esp-ALH - ALH-I', 1, 'PE', 1, null::smallint, 'UE 1', 2::smallint, 1::smallint, 'c-esp-alh.pdf', 6),
    (31, '95 - C-Esp-ALH - ALH-II', 1, 'PE', 1, null::smallint, 'UE 1 e 2', 2::smallint, 1::smallint, 'c-esp-alh.pdf', 8),
    (32, '95 - C-Esp-ALH - ALH-II', 2, 'PP', 1, null::smallint, 'UE 3', 2::smallint, 1::smallint, 'c-esp-alh.pdf', 8),
    (33, '95 - C-Esp-ALH - ALH-II', 3, 'PP', 2, null::smallint, 'UE 4', 2::smallint, 1::smallint, 'c-esp-alh.pdf', 8),
    (34, '96 - C-Esp-ALH - ALH-II', 1, 'PM', 1, null::smallint, 'todas as UE', 2::smallint, 1::smallint, 'c-esp-alh.pdf', 9),
    (35, '97 - C-Esp-ALH - ALH-IV', 1, 'PE', 1, null::smallint, 'todas as UE', 2::smallint, 1::smallint, 'c-esp-alh.pdf', 11),
    (36, '98 - C-Esp-ALH - ALH-V', 1, 'PE', 1, null::smallint, 'todas as UE', 2::smallint, 1::smallint, 'c-esp-alh.pdf', 13),
    (37, '99 - C-Esp-ALH - ALH-VI', 1, 'PE', 1, null::smallint, 'todas as UE', 2::smallint, 1::smallint, 'c-esp-alh.pdf', 15),
    (38, '100 - C-Esp-ALH - ALH-VII', 1, 'PE', 1, null::smallint, 'todas as UE', 2::smallint, 1::smallint, 'c-esp-alh.pdf', 17),
    (39, '101 - C-Esp-ALH - ALH-VIII', 1, 'PE', 1, null::smallint, null, 2::smallint, 1::smallint, 'c-esp-alh.pdf', 19),
    (40, '101 - C-Esp-ALH - ALH-VIII', 2, 'PP', 1, null::smallint, null, 2::smallint, 1::smallint, 'c-esp-alh.pdf', 19),
    (41, '102 - C-Esp-ALH - ALH-IX', 1, 'PE', 1, null::smallint, 'UE 1', 4::smallint, 1::smallint, 'c-esp-alh.pdf', 21),
    (42, '102 - C-Esp-ALH - ALH-IX', 2, 'EC', 1, null::smallint, 'UE 1', null::smallint, 1::smallint, 'c-esp-alh.pdf', 21),
    (43, '115 - C-Esp-OpAP - OPAP I', 1, 'PE', 1, 1::smallint, 'disciplinas OPAP I e II', 2::smallint, 1::smallint, 'c-esp-opap.pdf', 6),
    (45, '117 - C-Esp-OpAP - OPAP III', 1, 'TG', 1, null::smallint, 'toda a disciplina', 2::smallint, 1::smallint, 'c-esp-opap.pdf', 11),
    (46, '156 - EST-QF-PROC-MF-EAD - I', 1, 'TI', 1, null::smallint, null, null::smallint, null::smallint, 'curriculo-ciaara-est-qf-proc-mf-ead_mod3.pdf', 7),
    (47, '162 - EST-QF-NAVFLU-EAD - I', 1, 'PT', 1, 7::smallint, null, 2::smallint, null::smallint, 'est-qf-navflu-ead.pdf', 7),
    (49, '140 - C-ApA-OcOp-PR-SP - I', 1, 'PT', 1, null::smallint, null, 2::smallint, null::smallint, 'of-10-16-2023-densm-ciaara-an-c-apa-ocop-pr-sp.pdf', 7),
    (50, '141 - C-ApA-OcOp-PR-SP - II', 1, 'PT', 1, 5::smallint, 'UE 1 a 5', 2::smallint, null::smallint, 'of-10-16-2023-densm-ciaara-an-c-apa-ocop-pr-sp.pdf', 10),
    (51, '142 - C-ApA-OcOp-PR-SP - III', 1, 'PT', 1, null::smallint, null, 2::smallint, null::smallint, 'of-10-16-2023-densm-ciaara-an-c-apa-ocop-pr-sp.pdf', 11),
    (52, '143 - C-ApA-OcOp-PR-SP - IV', 1, 'PT', 1, 3::smallint, 'toda a disciplina', 2::smallint, null::smallint, 'of-10-16-2023-densm-ciaara-an-c-apa-ocop-pr-sp.pdf', 12),
    (53, '144 - C-ApA-OcOp-PR-SP - V', 1, 'PT', 1, 1::smallint, 'toda a disciplina', 2::smallint, 1::smallint, 'of-10-16-2023-densm-ciaara-an-c-apa-ocop-pr-sp.pdf', 14),
    (54, '144 - C-ApA-OcOp-PR-SP - V', 2, 'PP', 1, 2::smallint, 'UE 2', 2::smallint, 1::smallint, 'of-10-16-2023-densm-ciaara-an-c-apa-ocop-pr-sp.pdf', 14),
    (55, '145 - C-ApA-OcOp-PR-SP - VI', 1, 'PT', 1, null::smallint, null, 2::smallint, 1::smallint, 'of-10-16-2023-densm-ciaara-an-c-apa-ocop-pr-sp.pdf', 16),
    (56, '145 - C-ApA-OcOp-PR-SP - VI', 2, 'PP', 1, null::smallint, null, 3::smallint, 1::smallint, 'of-10-16-2023-densm-ciaara-an-c-apa-ocop-pr-sp.pdf', 16),
    (57, '146 - C-ApA-OcOp-PR-SP - VII', 1, 'PT', 1, 2::smallint, 'UE 1 e 2', 2::smallint, 1::smallint, 'of-10-16-2023-densm-ciaara-an-c-apa-ocop-pr-sp.pdf', 18),
    (58, '146 - C-ApA-OcOp-PR-SP - VII', 2, 'PP', 1, 3::smallint, 'UE 3', 3::smallint, 1::smallint, 'of-10-16-2023-densm-ciaara-an-c-apa-ocop-pr-sp.pdf', 18),
    (59, '147 - C-ApA-OcOp-PR-SP - VIII', 1, 'PT', 1, 5::smallint, null, 2::smallint, null::smallint, 'of-10-16-2023-densm-ciaara-an-c-apa-ocop-pr-sp.pdf', 21),
    (60, '148 - C-ApA-OcOp-PR-SP - IX', 1, 'PM', 1, 2::smallint, 'toda a disciplina', 2::smallint, 1::smallint, 'of-10-16-2023-densm-ciaara-an-c-apa-ocop-pr-sp.pdf', 22),
    (61, '148 - C-ApA-OcOp-PR-SP - IX', 2, 'PP', 1, 2::smallint, 'toda a disciplina', 2::smallint, 1::smallint, 'of-10-16-2023-densm-ciaara-an-c-apa-ocop-pr-sp.pdf', 22),
    (62, '149 - C-ApA-OcOp-PR-SP - X', 1, 'TI', 1, null::smallint, null, null::smallint, null::smallint, 'of-10-16-2023-densm-ciaara-an-c-apa-ocop-pr-sp.pdf', 24),
    (63, '86 - C-Exp-Metoc-OF-SP - I', 1, 'PT', 1, 8::smallint, null, 3::smallint, null::smallint, 'of-10-16-2025-densm-ciaara-an-c-exp-metoc-sp-512.2.01.pdf', 8),
    (64, '87 - C-Exp-Metoc-OF-SP - II', 1, 'PT', 1, 3::smallint, null, 2::smallint, null::smallint, 'of-10-16-2025-densm-ciaara-an-c-exp-metoc-sp-512.2.01.pdf', 10),
    (65, '88 - C-Exp-Metoc-OF-SP - III', 1, 'PT', 1, 11::smallint, null, 2::smallint, null::smallint, 'of-10-16-2025-densm-ciaara-an-c-exp-metoc-sp-512.2.01.pdf', 13),
    (66, '133 - C-ApA-PrevMe-PR-EAD - PrevMe I', 1, 'PT', 1, null::smallint, null, 2::smallint, null::smallint, 'of-10-27-2022-densm-ciaara-an-c-apa-prevme-pr-ead_0_0.pdf', 6),
    (67, '134 - C-ApA-PrevMe-PR-EAD - PrevMe II', 1, 'PT', 1, null::smallint, 'UE 1', 2::smallint, null::smallint, 'of-10-27-2022-densm-ciaara-an-c-apa-prevme-pr-ead_0_0.pdf', 8),
    (68, '134 - C-ApA-PrevMe-PR-EAD - PrevMe II', 2, 'PT', 2, 3::smallint, 'UE 2 e 3', 2::smallint, null::smallint, 'of-10-27-2022-densm-ciaara-an-c-apa-prevme-pr-ead_0_0.pdf', 8),
    (69, '136 - C-ApA-PrevMe-PR-EAD - PrevMe IV', 1, 'PT', 1, 5::smallint, 'toda disciplina', 2::smallint, null::smallint, 'of-10-27-2022-densm-ciaara-an-c-apa-prevme-pr-ead_0_0.pdf', 12),
    (71, '139 - C-ApA-PrevMe-PR-EAD - PrevMe VII', 1, 'TI', 1, null::smallint, null, null::smallint, null::smallint, 'of-10-27-2022-densm-ciaara-an-c-apa-prevme-pr-ead_0_0.pdf', 19),
    (72, '70 - C-Espc-FR - TFMFR-004', 1, 'PP', 1, null::smallint, 'todo o conteudo da disciplina', 2::smallint, null::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 24),
    (73, '70 - C-Espc-FR - TFMFR-004', 2, 'PP', 2, null::smallint, 'todo o conteudo da disciplina', 2::smallint, null::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 24),
    (74, '70 - C-Espc-FR - TFMFR-004', 3, 'PP', 3, null::smallint, null, 2::smallint, null::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 24),
    (75, '71 - C-Espc-FR - PPREVACER-005', 1, 'PM', 1, null::smallint, 'indicadores 12.1 a 12.9', 2::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 34),
    (76, '71 - C-Espc-FR - PPREVACER-005', 2, 'PP', 1, null::smallint, 'indicadores 12.1 a 12.9', 3::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 34),
    (77, '73 - C-Espc-FR - MFMFR-007', 1, 'PM', 1, null::smallint, 'indicadores 10.1 a 10.7', 2::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 42),
    (78, '73 - C-Espc-FR - MFMFR-007', 2, 'PP', 1, null::smallint, 'indicadores 10.5 e 10.6', 4::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 42),
    (79, '76 - C-Espc-FR - EQUFR-010', 1, 'PM', 1, null::smallint, 'indicadores 5.5, 5.6 e 5.13', 2::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 56),
    (80, '76 - C-Espc-FR - EQUFR-010', 2, 'PP', 1, null::smallint, 'indicadores 5.5 e 5.6', 4::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 56),
    (81, '78 - C-Espc-FR - ESTANFR-012', 1, 'PM', 1, null::smallint, 'indicadores 6.1 e 6.2', 2::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 65),
    (82, '78 - C-Espc-FR - ESTANFR-012', 2, 'PM', 2, null::smallint, 'indicadores 6.3 a 6.5', 2::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 65),
    (83, '78 - C-Espc-FR - ESTANFR-012', 3, 'PP', 1, null::smallint, 'indicadores 6.1 e 6.2', 4::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 65),
    (84, '56 - C-Espc-HN - HN-1102-0710', 2, 'TG', 1, null::smallint, null, 1::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 20),
    (85, '57 - C-Espc-HN - HN-1103-0506', 1, 'PP', 1, null::smallint, 'todo o conteudo da disciplina', 2::smallint, null::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 23),
    (86, '57 - C-Espc-HN - HN-1103-0506', 2, 'PP', 2, null::smallint, 'todo o conteudo da disciplina', 2::smallint, null::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 23),
    (87, '57 - C-Espc-HN - HN-1103-0506', 3, 'PP', 3, null::smallint, null, 2::smallint, null::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 23),
    (88, '66 - C-Espc-HN - SN-1103-0506', 1, 'PM', 1, null::smallint, 'indicadores 5.2, 5.3, 5.5, 5.6, 5.8 e do 19.1 a 19.7', 2::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 97),
    (89, '66 - C-Espc-HN - SN-1103-0506', 2, 'PP', 1, null::smallint, 'indicadores 5.2, 5.3, 5.5, 5.6 e 5.8 e do 19.1 a 19.7', 4::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 97),
    (90, '67 - C-Espc-HN - HN-1114-0730', 1, 'OD', 1, null::smallint, 'toda a disciplina', 17::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 112)
  ), ins as (
    insert into public.avaliacoes_curriculo (disciplina_id, curso_id, ordem, instrumento_id, numero, unidade_ensino_id,
                                             origem_ue, ues_abordadas, ta_aplicacao, origem_ta_aplicacao, ta_vista,
                                             origem_ta_vista, origem_item, fonte_arquivo, fonte_pagina, origem_migracao_v1)
    select d.id, d.curso_id, x.ordem, i.id, x.numero, u.id, case when u.id is not null then 'curriculo' end,
           x.ues_abordadas, x.ta_aplicacao, case when x.ta_aplicacao is not null then 'curriculo' end, x.ta_vista,
           case when x.ta_vista is not null then 'curriculo' end, 'curriculo', x.fonte_arquivo, x.fonte_pagina,
           'spec014-A47:item ' || x.item_a47 || ':' || x.fonte_arquivo
      from dado x
      join public.disciplinas d on d.codigo = x.disciplina and d.status = 'ativo'
      join public.config_listas i on i.lista = 'instrumentos_avaliacao' and i.valor = x.instrumento
      left join public.unidades_ensino u on u.disciplina_id = d.id and u.numero_ue = x.ue and u.status = 'ativo'
    on conflict (disciplina_id, instrumento_id, numero) where status = 'ativo' do nothing
    returning 1
  )
  select count(*) into v_inseridos from ins;

  select count(*) into v_ativos from public.avaliacoes_curriculo where status = 'ativo' and origem_migracao_v1 like 'spec014-A47:%';
  if v_ativos <> 87 then
    raise exception 'A4.7 (spec 014): esperava 87 itens ativos com a procedência, há % (disciplina sem destino, UE inexistente ou item que já existe?)', v_ativos;
  end if;
  if exists (select 1 from public.avaliacoes_curriculo a where a.status = 'ativo' and a.origem_migracao_v1 like 'spec014-A47:%'
              and a.unidade_ensino_id is null and exists (select 1 from (values
                (1, 2),
                (2, 4),
                (3, 9),
                (7, 6),
                (11, 12),
                (12, 16),
                (13, 2),
                (14, 2),
                (17, 2),
                (18, 3),
                (21, 2),
                (22, 3),
                (26, 2),
                (27, 2),
                (28, 2),
                (29, 2),
                (43, 1),
                (47, 7),
                (50, 5),
                (52, 3),
                (53, 1),
                (54, 2),
                (57, 2),
                (58, 3),
                (59, 5),
                (60, 2),
                (61, 2),
                (63, 8),
                (64, 3),
                (65, 11),
                (68, 3),
                (69, 5)
              ) q(n, ue) where a.origem_migracao_v1 like 'spec014-A47:item ' || q.n || ':%')) then
    raise exception 'A4.7 (spec 014): item com UE decidida entrou sem a UE — a UE não existe na disciplina de destino.';
  end if;
  if exists (select 1 from public.avaliacoes_curriculo a join public.disciplinas d on d.id = a.disciplina_id
              where a.status = 'ativo' group by d.id, d.carga_horaria_tempos
             having sum(coalesce(a.ta_aplicacao, 0) + coalesce(a.ta_vista, 0)) > d.carga_horaria_tempos) then
    raise exception 'A4.7 (spec 014): há disciplina com avaliação do currículo acima da CH (FR-031.2).';
  end if;
  if v_inseridos > 0 then
    insert into public.migracao_log (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,
                                     acao, regra_aplicada, valor_antes, valor_depois, observacao)
    values ('MLOG-014-A47-' || to_char(now(), 'YYYYMMDDHH24MISS'), 'curriculo_densm', 'a47-decisao.xlsx',
            'avaliacoes_curriculo', 'por disciplina', 'adicionado'::public.acao_migracao, 'A4.7 (spec 014, PEND-014-6)',
            null, v_inseridos || ' itens', 'Itens fora da D-4 decididos por Bernardo Villas Boas (87 entram).');
  end if;
  raise notice 'A4.7 (spec 014): % item(ns) inserido(s); % ativo(s) com a procedência.', v_inseridos, v_ativos;
end;
$$;
