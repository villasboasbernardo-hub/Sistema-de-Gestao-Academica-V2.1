-- =================================================================================
-- Spec 014, PR 4 · migration de DADO D-4 — as avaliações dos 24 currículos da DEnsM
-- GERADA por `python -m scripts.etl.gerar_carga_de_avaliacoes_curriculo` a partir de
-- `scripts/etl/dados/avaliacoes_curriculo.csv`. NÃO editar à mão.
--
-- 284 itens extraídos; ENTRAM 194 (sem `conferir`, com disciplina de destino, instrumento da
-- lista e página); FICAM FORA 90, marcados para a decisão de Bernardo (antes/depois da D-4).
-- Roda DEPOIS da D-5 e da D-6: os itens apontam para a disciplina já corrigida e unificada.
-- Abstém-se em base sem cursos (a lista de instrumentos entra sempre); idempotente; evento em
-- `migracao_log` só quando grava. Reversão: os itens com a procedência `spec014-D4:` ficam `inativo`.
-- =================================================================================

-- 1. a lista de instrumentos (domínio operacional: `config_listas`, nunca ENUM)
insert into public.config_listas (lista, valor, rotulo_exibicao, ordem, metadados)
values
  ('instrumentos_avaliacao', 'PE', 'Prova Escrita', 1, jsonb_build_object('natureza', 'prova')),
  ('instrumentos_avaliacao', 'PM', 'Prova Mista', 2, jsonb_build_object('natureza', 'prova')),
  ('instrumentos_avaliacao', 'PP', 'Prova Prática', 3, jsonb_build_object('natureza', 'prova')),
  ('instrumentos_avaliacao', 'PO', 'Prova Oral', 4, jsonb_build_object('natureza', 'prova')),
  ('instrumentos_avaliacao', 'PD', 'Prova Discursiva', 5, jsonb_build_object('natureza', 'prova')),
  ('instrumentos_avaliacao', 'TG', 'Trabalho em Grupo', 6, jsonb_build_object('natureza', 'trabalho')),
  ('instrumentos_avaliacao', 'TI', 'Trabalho Individual', 7, jsonb_build_object('natureza', 'trabalho')),
  ('instrumentos_avaliacao', 'EC', 'Estudo de caso', 8, jsonb_build_object('natureza', 'trabalho')),
  ('instrumentos_avaliacao', 'PJ', 'Projeto', 9, jsonb_build_object('natureza', 'trabalho')),
  ('instrumentos_avaliacao', 'MN', 'Monografia', 10, jsonb_build_object('natureza', 'trabalho')),
  ('instrumentos_avaliacao', 'OD', 'Observação de Desempenho', 11, jsonb_build_object('natureza', 'od'))
on conflict (lista, valor) do nothing;

-- 2. os itens
do $$
declare
  v_inseridos integer;
  v_ativos integer;
begin
  if not exists (select 1 from public.cursos) then
    raise notice 'D-4 (spec 014): base sem cursos — a migration se abstém (a ETAPA 6 do ETL aplica o mesmo arquivo).';
    return;
  end if;

  with dado (disciplina, ordem, instrumento, numero, ue, ues_abordadas, ta_aplicacao, ta_vista, fonte_arquivo, fonte_pagina) as (values
    ('4 - CAHO - II', 1, 'PM', 1, 5::smallint, 'UE 1 a 5', 3::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 13),
    ('4 - CAHO - II', 2, 'PM', 2, 9::smallint, 'UE 6 a 9', 3::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 13),
    ('4 - CAHO - II', 3, 'TI', 1, 10::smallint, 'UE 10', 3::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 13),
    ('5 - CAHO - III', 1, 'PM', 1, 9::smallint, 'toda a disciplina', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 16),
    ('6 - CAHO - IV', 1, 'PM', 1, 4::smallint, 'UE 1 a 4', 4::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 19),
    ('6 - CAHO - IV', 2, 'PM', 2, 5::smallint, 'UE 5', 4::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 19),
    ('7 - CAHO - V', 1, 'PM', 1, 3::smallint, 'UE 1 a 3', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 22),
    ('7 - CAHO - V', 2, 'PM', 2, 6::smallint, 'UE 4 a 6', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 22),
    ('7 - CAHO - V', 3, 'OD', 1, null::smallint, null, 4::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 22),
    ('8 - CAHO - VI', 1, 'PM', 1, 2::smallint, 'UE 1 e 2', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 25),
    ('8 - CAHO - VI', 2, 'PM', 2, 4::smallint, 'UE 3 e 4', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 25),
    ('8 - CAHO - VI', 3, 'PM', 3, null::smallint, 'UE 6', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 25),
    ('8 - CAHO - VI', 4, 'TI', 1, null::smallint, 'UE 5', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 25),
    ('8 - CAHO - VI', 5, 'TG', 1, 6::smallint, 'UE 1, 2, 3, 4 ou 6', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 25),
    ('8 - CAHO - VI', 6, 'TG', 2, null::smallint, 'UE 6', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 25),
    ('10 - CAHO - VIII', 1, 'PM', 1, 6::smallint, 'toda a disciplina', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 31),
    ('10 - CAHO - VIII', 2, 'TG', 1, 5::smallint, 'UE 5', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 31),
    ('11 - CAHO - IX', 1, 'PM', 1, 6::smallint, 'toda a disciplina', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 34),
    ('12 - CAHO - X', 1, 'PM', 1, 6::smallint, 'UE 1 a 6', 3::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 37),
    ('12 - CAHO - X', 2, 'PM', 2, 11::smallint, 'UE 7 a 11', 3::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 37),
    ('13 - CAHO - XI', 1, 'PM', 1, 4::smallint, 'UE 1 a 4', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 40),
    ('13 - CAHO - XI', 2, 'PM', 2, 6::smallint, 'UE 5 e 6', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 40),
    ('14 - CAHO - XII', 1, 'PM', 1, 5::smallint, 'UE 1 a 5', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 43),
    ('14 - CAHO - XII', 2, 'PP', 1, 6::smallint, 'UE 6', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 43),
    ('15 - CAHO - XIII', 1, 'PM', 1, 5::smallint, 'toda a disciplina', 3::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 46),
    ('15 - CAHO - XIII', 2, 'TG', 1, 5::smallint, 'UE 5', 4::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 46),
    ('16 - CAHO - XIV', 1, 'PM', 1, 6::smallint, 'toda a disciplina', 3::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 48),
    ('16 - CAHO - XIV', 2, 'TI', 1, 6::smallint, null, 1::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 48),
    ('17 - CAHO - XV', 1, 'PM', 1, 4::smallint, 'toda a disciplina', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 51),
    ('17 - CAHO - XV', 2, 'TI', 1, 4::smallint, 'toda a disciplina', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 51),
    ('18 - CAHO - XVI', 1, 'PM', 1, 6::smallint, 'UE 1 a 6', 4::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 58),
    ('18 - CAHO - XVI', 2, 'PM', 2, 14::smallint, 'UE 7 a 10 e 14', 3::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 58),
    ('19 - CAHO - XVII', 1, 'PM', 1, 4::smallint, 'toda a disciplina', 4::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 61),
    ('19 - CAHO - XVII', 2, 'TI', 1, 4::smallint, 'toda a disciplina', 4::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 61),
    ('20 - CAHO - XVIII', 1, 'OD', 1, null::smallint, null, null::smallint, null::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 62),
    ('21 - CAHO - XIX', 3, 'PP', 3, 2::smallint, 'UE 2', 1::smallint, null::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 65),
    ('1 - CAHO - MAT', 1, 'PM', 1, 1::smallint, 'UE 1', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 73),
    ('1 - CAHO - MAT', 2, 'PM', 2, 2::smallint, 'UE 2', 2::smallint, 1::smallint, '2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf', 73),
    ('125 - C-ApA-AuxNav-PR-SP - VII', 1, 'PM', 1, 4::smallint, null, 1::smallint, 1::smallint, '2._of-10-26-2022-densm-ciaara-an-c-apa-aux-nav-sp_0_0.pdf', 19),
    ('126 - C-ApA-PCN-PR-EAD - PCN-PR-I-EAD', 1, 'PE', 1, null::smallint, null, 2::smallint, null::smallint, '2._of-10-31-densm-ciaara-an-capa-pcn-pr-ead_2.pdf', 6),
    ('127 - C-ApA-PCN-PR-EAD - PCN-PR-II-EAD', 1, 'PE', 1, 4::smallint, null, 2::smallint, null::smallint, '2._of-10-31-densm-ciaara-an-capa-pcn-pr-ead_2.pdf', 9),
    ('128 - C-ApA-PCN-PR-EAD - PCN-PR-III-EAD', 1, 'PE', 1, 4::smallint, null, 2::smallint, null::smallint, '2._of-10-31-densm-ciaara-an-capa-pcn-pr-ead_2.pdf', 11),
    ('129 - C-ApA-PCN-PR-EAD - PCN-PR-IV-EAD', 1, 'PE', 1, 2::smallint, null, 2::smallint, null::smallint, '2._of-10-31-densm-ciaara-an-capa-pcn-pr-ead_2.pdf', 12),
    ('130 - C-ApA-PCN-PR-EAD - PCN-PR-V-EAD', 1, 'PE', 1, 3::smallint, null, 2::smallint, null::smallint, '2._of-10-31-densm-ciaara-an-capa-pcn-pr-ead_2.pdf', 14),
    ('131 - C-ApA-PCN-PR-EAD - PCN-PR-VI-EAD', 1, 'PE', 1, 2::smallint, null, 2::smallint, null::smallint, '2._of-10-31-densm-ciaara-an-capa-pcn-pr-ead_2.pdf', 16),
    ('42 - C-Ap-FR - I', 1, 'PM', 1, 2::smallint, 'UE 1 e 2', 2::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 9),
    ('42 - C-Ap-FR - I', 2, 'PM', 2, 4::smallint, 'UE 3 e 4', 2::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 9),
    ('43 - C-Ap-FR - II', 1, 'PM', 1, 4::smallint, null, 2::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 11),
    ('44 - C-Ap-FR - III', 1, 'PM', 1, 3::smallint, 'toda a disciplina', 2::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 13),
    ('44 - C-Ap-FR - III', 2, 'PP', 1, 3::smallint, 'toda a disciplina', 4::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 13),
    ('45 - C-Ap-FR - IV', 1, 'PM', 1, 1::smallint, 'toda a disciplina', 2::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 14),
    ('45 - C-Ap-FR - IV', 2, 'TG', 1, 2::smallint, 'toda a disciplina', 8::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 14),
    ('46 - C-Ap-FR - V', 1, 'PM', 1, 3::smallint, 'UE 1 a 3', 2::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 17),
    ('46 - C-Ap-FR - V', 2, 'PM', 2, 5::smallint, 'UE 4 e 5', 2::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 17),
    ('47 - C-Ap-FR - VI', 1, 'PM', 1, 1::smallint, 'UE 1', 2::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 19),
    ('47 - C-Ap-FR - VI', 2, 'PM', 2, 2::smallint, 'UE 2 a 8', 3::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 19),
    ('47 - C-Ap-FR - VI', 3, 'PP', 1, 2::smallint, 'UE 2', 4::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 19),
    ('48 - C-Ap-FR - VII', 1, 'PM', 1, 1::smallint, 'UE 1', 2::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 21),
    ('48 - C-Ap-FR - VII', 2, 'PM', 2, 2::smallint, 'UE 2', 2::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 21),
    ('49 - C-Ap-FR - VIII', 1, 'PM', 1, 4::smallint, 'UE 1 a 4', 2::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 24),
    ('49 - C-Ap-FR - VIII', 2, 'PM', 2, 6::smallint, 'UE 5 e 6', 2::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 24),
    ('49 - C-Ap-FR - VIII', 3, 'PM', 3, 10::smallint, 'UE 7 a 10', 2::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 25),
    ('49 - C-Ap-FR - VIII', 4, 'PP', 1, 10::smallint, 'UE 9', 4::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 25),
    ('50 - C-Ap-FR - IX', 1, 'PM', 1, 5::smallint, 'toda a disciplina', 2::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 27),
    ('50 - C-Ap-FR - IX', 2, 'PP', 1, 5::smallint, 'toda a disciplina', 8::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 27),
    ('40 - C-Ap-FR - X', 3, 'PP', 3, 2::smallint, 'UE 2', 1::smallint, null::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 29),
    ('51 - C-Ap-FR - XI', 1, 'PM', 1, 8::smallint, 'toda a disciplina', 2::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 35),
    ('51 - C-Ap-FR - XI', 2, 'PP', 1, 4::smallint, 'UE 2 a 4', 4::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 35),
    ('52 - C-Ap-FR - XII', 1, 'PM', 1, 2::smallint, 'toda a disciplina', 2::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 36),
    ('53 - C-Ap-FR - XIII', 1, 'OD', 1, null::smallint, null, null::smallint, 1::smallint, '4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf', 39),
    ('23 - C-Ap-HN - I', 1, 'PM', 1, 1::smallint, 'UE 1', 3::smallint, 1::smallint, 'c-ap-hn.pdf', 9),
    ('23 - C-Ap-HN - I', 2, 'PM', 2, 2::smallint, 'UE 2', 2::smallint, 1::smallint, 'c-ap-hn.pdf', 9),
    ('23 - C-Ap-HN - I', 3, 'PM', 3, 6::smallint, 'UE 3 a 6', 3::smallint, 1::smallint, 'c-ap-hn.pdf', 9),
    ('23 - C-Ap-HN - I', 4, 'PM', 4, 7::smallint, 'UE 7', 2::smallint, 1::smallint, 'c-ap-hn.pdf', 9),
    ('25 - C-Ap-HN - II', 1, 'TI', 1, 1::smallint, 'UE 1 e 2', 2::smallint, 1::smallint, 'c-ap-hn.pdf', 11),
    ('25 - C-Ap-HN - II', 2, 'TI', 2, 4::smallint, 'UE 3 e 4', 2::smallint, 1::smallint, 'c-ap-hn.pdf', 12),
    ('26 - C-Ap-HN - III', 1, 'PM', 1, 1::smallint, 'UE 1', 2::smallint, 1::smallint, 'c-ap-hn.pdf', 13),
    ('26 - C-Ap-HN - III', 2, 'PM', 2, 2::smallint, 'UE 2', 2::smallint, 1::smallint, 'c-ap-hn.pdf', 14),
    ('27 - C-Ap-HN - IV', 1, 'PM', 1, 1::smallint, 'UE 1', 2::smallint, 1::smallint, 'c-ap-hn.pdf', 16),
    ('27 - C-Ap-HN - IV', 2, 'PM', 2, 2::smallint, 'UE 2', 3::smallint, 1::smallint, 'c-ap-hn.pdf', 16),
    ('28 - C-Ap-HN - V', 1, 'PM', 1, 4::smallint, 'UE 1 a 4', 2::smallint, 1::smallint, 'c-ap-hn.pdf', 18),
    ('28 - C-Ap-HN - V', 2, 'PM', 2, 8::smallint, 'UE 5 a 8', 2::smallint, 1::smallint, 'c-ap-hn.pdf', 19),
    ('28 - C-Ap-HN - V', 3, 'TG', 1, 9::smallint, 'UE 9', 4::smallint, 1::smallint, 'c-ap-hn.pdf', 19),
    ('29 - C-Ap-HN - VI', 1, 'PM', 1, 4::smallint, null, 2::smallint, 1::smallint, 'c-ap-hn.pdf', 21),
    ('30 - C-Ap-HN - VII', 1, 'PM', 1, 3::smallint, 'UE 1 a 3', 2::smallint, 1::smallint, 'c-ap-hn.pdf', 23),
    ('30 - C-Ap-HN - VII', 2, 'PM', 2, 6::smallint, 'UE 4 a 6', 2::smallint, 1::smallint, 'c-ap-hn.pdf', 23),
    ('30 - C-Ap-HN - VII', 3, 'TG', 1, 7::smallint, 'UE 7', 4::smallint, 1::smallint, 'c-ap-hn.pdf', 23),
    ('31 - C-Ap-HN - VIII', 1, 'PM', 1, 3::smallint, 'UE 1 a 3', 3::smallint, 1::smallint, 'c-ap-hn.pdf', 26),
    ('31 - C-Ap-HN - VIII', 2, 'PM', 2, 6::smallint, 'UE 4 a 6', 3::smallint, 1::smallint, 'c-ap-hn.pdf', 26),
    ('32 - C-Ap-HN - IX', 1, 'PM', 1, 3::smallint, 'UE 1 a 3', 4::smallint, 1::smallint, 'c-ap-hn.pdf', 29),
    ('32 - C-Ap-HN - IX', 2, 'PM', 2, 6::smallint, 'UE 4 a 6', 4::smallint, 1::smallint, 'c-ap-hn.pdf', 29),
    ('33 - C-Ap-HN - X', 1, 'PM', 1, 2::smallint, 'UE 1 e 2', 3::smallint, 1::smallint, 'c-ap-hn.pdf', 31),
    ('33 - C-Ap-HN - X', 2, 'PM', 2, 4::smallint, 'UE 2 a 4', 4::smallint, 1::smallint, 'c-ap-hn.pdf', 31),
    ('34 - C-Ap-HN - XI', 1, 'PM', 1, 5::smallint, 'UE 1 a 5', 4::smallint, 1::smallint, 'c-ap-hn.pdf', 35),
    ('34 - C-Ap-HN - XI', 2, 'PM', 2, 10::smallint, 'UE 6 a 10', 4::smallint, 1::smallint, 'c-ap-hn.pdf', 35),
    ('34 - C-Ap-HN - XI', 3, 'PP', 1, 12::smallint, 'UE 11 a 13', 8::smallint, 1::smallint, 'c-ap-hn.pdf', 35),
    ('35 - C-Ap-HN - XII', 1, 'TI', 1, 1::smallint, 'UE 1', 2::smallint, 1::smallint, 'c-ap-hn.pdf', 37),
    ('35 - C-Ap-HN - XII', 2, 'PM', 1, 2::smallint, 'toda a disciplina', 2::smallint, 1::smallint, 'c-ap-hn.pdf', 37),
    ('36 - C-Ap-HN - XIII', 1, 'PM', 1, 1::smallint, 'UE 1', 3::smallint, 1::smallint, 'c-ap-hn.pdf', 40),
    ('36 - C-Ap-HN - XIII', 2, 'PM', 2, 3::smallint, 'UE 2 e 3', 3::smallint, 1::smallint, 'c-ap-hn.pdf', 40),
    ('37 - C-Ap-HN - XIV', 1, 'PM', 1, 3::smallint, 'UE 1 a 3', 2::smallint, 1::smallint, 'c-ap-hn.pdf', 42),
    ('37 - C-Ap-HN - XIV', 2, 'PM', 2, 5::smallint, 'UE 4 a 5', 2::smallint, 1::smallint, 'c-ap-hn.pdf', 42),
    ('37 - C-Ap-HN - XIV', 3, 'TG', 1, 6::smallint, 'UE 6', 8::smallint, 1::smallint, 'c-ap-hn.pdf', 42),
    ('38 - C-Ap-HN - XV', 1, 'PM', 1, 3::smallint, 'UE 1 a 3', 2::smallint, 1::smallint, 'c-ap-hn.pdf', 43),
    ('38 - C-Ap-HN - XV', 2, 'TG', 1, 3::smallint, 'UE 3', 1::smallint, 1::smallint, 'c-ap-hn.pdf', 43),
    ('39 - C-Ap-HN - XVI', 1, 'PM', 1, 5::smallint, 'toda a disciplina', 3::smallint, 1::smallint, 'c-ap-hn.pdf', 47),
    ('40 - C-Ap-HN - XVII', 3, 'PP', 3, 2::smallint, 'UE 2', 1::smallint, null::smallint, 'c-ap-hn.pdf', 49),
    ('41 - C-Ap-HN - XVIII', 1, 'OD', 1, null::smallint, null, null::smallint, 1::smallint, 'c-ap-hn.pdf', 56),
    ('103 - C-Esp-ME - I', 1, 'PM', 1, 8::smallint, 'toda a disciplina', 2::smallint, 1::smallint, 'c-esp-me.pdf', 7),
    ('104 - C-Esp-ME - II', 1, 'PM', 1, 4::smallint, 'UE 1 a 4', 2::smallint, 1::smallint, 'c-esp-me.pdf', 9),
    ('104 - C-Esp-ME - II', 2, 'PP', 1, 5::smallint, 'UE 5', 4::smallint, 1::smallint, 'c-esp-me.pdf', 9),
    ('105 - C-Esp-ME - III', 1, 'PM', 1, 4::smallint, 'UE 1 a 4', 2::smallint, 1::smallint, 'c-esp-me.pdf', 11),
    ('105 - C-Esp-ME - III', 2, 'PP', 1, 4::smallint, 'UE 4', 4::smallint, 1::smallint, 'c-esp-me.pdf', 12),
    ('106 - C-Esp-ME - IV', 1, 'PM', 1, 4::smallint, 'toda a disciplina', 2::smallint, 1::smallint, 'c-esp-me.pdf', 14),
    ('107 - C-Esp-ME - V', 1, 'PM', 1, 2::smallint, 'UE 1 e 2', 2::smallint, 1::smallint, 'c-esp-me.pdf', 15),
    ('107 - C-Esp-ME - V', 2, 'PP', 1, 3::smallint, 'UE 3', 3::smallint, 1::smallint, 'c-esp-me.pdf', 15),
    ('108 - C-Esp-ME - VI', 1, 'PM', 1, 6::smallint, 'UE 1 a 6', 3::smallint, 1::smallint, 'c-esp-me.pdf', 18),
    ('108 - C-Esp-ME - VI', 2, 'PM', 2, 9::smallint, 'UE 7 a 9', 3::smallint, 1::smallint, 'c-esp-me.pdf', 19),
    ('109 - C-Esp-ME - VII', 1, 'PM', 1, 5::smallint, 'UE 1 a 5', 2::smallint, 1::smallint, 'c-esp-me.pdf', 21),
    ('109 - C-Esp-ME - VII', 2, 'PP', 1, 5::smallint, 'UE 4 e 5', 4::smallint, 1::smallint, 'c-esp-me.pdf', 21),
    ('110 - C-Esp-ME - VIII', 1, 'PM', 1, 6::smallint, 'UE 1 a 6', 2::smallint, 1::smallint, 'c-esp-me.pdf', 23),
    ('110 - C-Esp-ME - VIII', 2, 'PP', 1, 7::smallint, 'UE 5 a 7', 4::smallint, 1::smallint, 'c-esp-me.pdf', 23),
    ('111 - C-Esp-ME - IX', 1, 'PM', 1, 5::smallint, 'toda a disciplina', 2::smallint, 1::smallint, 'c-esp-me.pdf', 25),
    ('112 - C-Esp-ME - X', 1, 'PM', 1, 3::smallint, 'toda a disciplina', 2::smallint, 1::smallint, 'c-esp-me.pdf', 27),
    ('113 - C-Esp-ME - XI', 1, 'PM', 1, 3::smallint, 'UE 1 a 3', 2::smallint, 1::smallint, 'c-esp-me.pdf', 29),
    ('113 - C-Esp-ME - XI', 2, 'PP', 1, 6::smallint, 'UE 4 a 6', 4::smallint, 1::smallint, 'c-esp-me.pdf', 29),
    ('114 - C-Esp-ME - XII', 1, 'PM', 1, 3::smallint, 'toda a disciplina', 2::smallint, 1::smallint, 'c-esp-me.pdf', 31),
    ('118 - C-Esp-OpAP - OPAP IV', 1, 'PP', 1, null::smallint, null, 2::smallint, 1::smallint, 'c-esp-opap.pdf', 12),
    ('83 - C-Exp-Ag-Mag - I', 1, 'PM', 1, 2::smallint, 'UE 1 e 2', 2::smallint, 1::smallint, 'c-exp-agmag.pdf', 7),
    ('83 - C-Exp-Ag-Mag - I', 2, 'PM', 2, 4::smallint, 'UE 3 e 4', 2::smallint, 1::smallint, 'c-exp-agmag.pdf', 7),
    ('84 - C-Exp-Ag-Mag - II', 1, 'TG', 1, 2::smallint, 'toda a disciplina', 2::smallint, 1::smallint, 'c-exp-agmag.pdf', 8),
    ('85 - C-Exp-BATI - I', 1, 'PM', 1, 8::smallint, 'UE 1 a 8', 3::smallint, 1::smallint, 'c-exp-bati.pdf', 6),
    ('85 - C-Exp-BATI - I', 2, 'PP', 1, 9::smallint, 'UE 9', 3::smallint, 1::smallint, 'c-exp-bati.pdf', 6),
    ('86 - C-Exp-MetocOf - I', 1, 'PM', 1, null::smallint, 'todas as UE', 3::smallint, 1::smallint, 'c-exp-metocof_0.pdf', 6),
    ('87 - C-Exp-MetocOf - II', 1, 'PM', 1, null::smallint, 'todas as UE', 3::smallint, 1::smallint, 'c-exp-metocof_0.pdf', 8),
    ('88 - C-Exp-MetocOf - III', 1, 'PM', 1, null::smallint, 'todas as UE', 2::smallint, 1::smallint, 'c-exp-metocof_0.pdf', 11),
    ('89 - C-Exp-MetocOf - IV', 1, 'PM', 1, null::smallint, 'todas as unidades de ensino', 2::smallint, 1::smallint, 'c-exp-metocof_0.pdf', 14),
    ('90 - C-Exp-MetocOf - V', 1, 'OD', 1, null::smallint, null, null::smallint, null::smallint, 'c-exp-metocof_0.pdf', 15),
    ('92 - C-Exp-Obs-ME - I', 1, 'PE', 1, null::smallint, 'UE 1 a 4', null::smallint, null::smallint, 'c-exp-obs-me_0_0.pdf', 6),
    ('92 - C-Exp-Obs-ME - I', 2, 'PE', 2, null::smallint, 'UE 5', null::smallint, null::smallint, 'c-exp-obs-me_0_0.pdf', 6),
    ('93 - C-Exp-Obs-ME - II', 1, 'PE', 1, null::smallint, 'UE 1 a 3', null::smallint, null::smallint, 'c-exp-obs-me_0_0.pdf', 8),
    ('93 - C-Exp-Obs-ME - II', 2, 'PE', 2, null::smallint, 'UE 4', null::smallint, null::smallint, 'c-exp-obs-me_0_0.pdf', 8),
    ('90 - C-Exp-Metoc-OF-SP - V', 1, 'OD', 1, null::smallint, null, null::smallint, null::smallint, 'of-10-16-2025-densm-ciaara-an-c-exp-metoc-sp-512.2.01.pdf', 16),
    ('135 - C-ApA-PrevMe-PR-EAD - PrevMe III', 1, 'PM', 1, 2::smallint, 'UE 1 e 2', 2::smallint, null::smallint, 'of-10-27-2022-densm-ciaara-an-c-apa-prevme-pr-ead_0_0.pdf', 10),
    ('135 - C-ApA-PrevMe-PR-EAD - PrevMe III', 2, 'PM', 2, 4::smallint, 'UE 3 e 4', 2::smallint, null::smallint, 'of-10-27-2022-densm-ciaara-an-c-apa-prevme-pr-ead_0_0.pdf', 10),
    ('138 - C-ApA-PrevMe-PR-EAD - PrevMe VI', 1, 'PM', 1, 6::smallint, 'toda a disciplina', 2::smallint, null::smallint, 'of-10-27-2022-densm-ciaara-an-c-apa-prevme-pr-ead_0_0.pdf', 17),
    ('68 - C-Espc-FR - MAANFR-001', 1, 'PM', 1, null::smallint, 'indicadores 1.1 a 1.3', 3::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 14),
    ('55 - C-Espc-FR - HN-1104-0506', 1, 'PM', 1, null::smallint, 'indicadores 2.1 e 2.2', 3::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 16),
    ('69 - C-Espc-FR - IITFR-003', 1, 'PM', 1, null::smallint, 'indicadores 11.1 e 11.2', 3::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 19),
    ('69 - C-Espc-FR - IITFR-003', 2, 'PM', 2, null::smallint, 'indicadores 11.3 e 11.4', 3::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 20),
    ('72 - C-Espc-FR - INTANFR-006', 1, 'PE', 1, null::smallint, 'indicadores 4.1 a 4.3 e 7.2', 2::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 37),
    ('74 - C-Espc-FR - AUXNAVFR-008', 1, 'PM', 1, null::smallint, 'indicadores 4.4 e 4.5', 2::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 46),
    ('74 - C-Espc-FR - AUXNAVFR-008', 2, 'PM', 2, null::smallint, 'indicadores 4.6 a 4.10', 2::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 46),
    ('75 - C-Espc-FR - INELEFR-009', 1, 'PM', 1, null::smallint, 'indicadores 3.1 e 3.4', 2::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 51),
    ('75 - C-Espc-FR - INELEFR-009', 2, 'PM', 2, null::smallint, 'indicadores 3.2 e 3.3', 2::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 51),
    ('77 - C-Espc-FR - FONFR-011', 1, 'PM', 1, null::smallint, 'indicadores 5.1 a 5.3 e 5.8 a 5.12', 3::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 61),
    ('77 - C-Espc-FR - FONFR-011', 2, 'PP', 1, null::smallint, 'indicadores 5.1 a 5.3 e 5.8 a 5.12', 4::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 61),
    ('77 - C-Espc-FR - FONFR-011', 3, 'PP', 2, null::smallint, 'indicadores 5.4 e 5.7', 8::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 61),
    ('79 - C-Espc-FR - FANAVFR-13', 1, 'PP', 1, null::smallint, 'indicadores 8.1 e 8.2', 4::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 69),
    ('79 - C-Espc-FR - FANAVFR-13', 2, 'PP', 2, null::smallint, 'indicadores 8.3 a 8.5', 4::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 69),
    ('80 - C-Espc-FR - ADMANFR-014', 1, 'PM', 1, null::smallint, 'indicadores 7.1 e 7.3 a 7.8', 2::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 75),
    ('80 - C-Espc-FR - ADMANFR-014', 2, 'PP', 1, null::smallint, 'indicadores 7.9 a 7.13', 2::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 75),
    ('81 - C-Espc-FR - NAV-015', 1, 'PM', 1, null::smallint, null, 2::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 78),
    ('81 - C-Espc-FR - NAV-015', 2, 'PP', 1, null::smallint, null, 8::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 78),
    ('81 - C-Espc-FR - NAV-015', 3, 'PM', 2, null::smallint, null, 2::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 78),
    ('66 - C-Espc-FR - SN-1103-0506', 1, 'PM', 1, null::smallint, 'indicadores 13.1 a 13.9', 2::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 82),
    ('66 - C-Espc-FR - SN-1103-0506', 2, 'PP', 1, null::smallint, 'indicadores 13.1 a 13.8', 4::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 82),
    ('82 - C-Espc-FR - MBFCFR-017', 1, 'OD', 1, null::smallint, null, 7::smallint, 1::smallint, 'of10-82-2024-densm-ana-c-espc-fr.pdf', 95),
    ('54 - C-Espc-HN - HN-1104-0808', 1, 'PM', 1, null::smallint, 'indicadores 1.1 a 1.3', 4::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 14),
    ('55 - C-Espc-HN - HN-1104-0506', 1, 'PM', 1, null::smallint, 'indicadores 2.1 e 2.2', 3::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 17),
    ('56 - C-Espc-HN - HN-1102-0710', 1, 'PM', 1, null::smallint, 'indicadores 4.1 a 4.3', 3::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 20),
    ('56 - C-Espc-HN - HN-1102-0710', 3, 'PO', 1, null::smallint, 'indicadores 4.4 e 4.5', 1::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 20),
    ('58 - C-Espc-HN - HN-1105-0243', 1, 'PE', 1, null::smallint, 'indicadores 7.5, 7.8, 9.1, 9.4, 9.6, 9.7, 9.10, 11.3, 11.13, 11.14, 16.7 e 16.11', 3::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 30),
    ('58 - C-Espc-HN - HN-1105-0243', 2, 'TG', 1, null::smallint, 'indicadores 9.16, 15.6, 16.7 e 16.11', 3::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 30),
    ('59 - C-Espc-HN - HN-1106-0423', 1, 'PM', 1, null::smallint, 'indicadores 3.1, 7.8, 8.2 a 8.5, 8.7, 9.4, 9.10 e 9.11', 2::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 43),
    ('59 - C-Espc-HN - HN-1106-0423', 2, 'PP', 1, null::smallint, 'indicadores 9.2, 9.3, 9.6, 9.8, 9.9, 9.12, 9.13, 11.5 a 11.8, 12.3, 12.12 e 12.14', 3::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 43),
    ('59 - C-Espc-HN - HN-1106-0423', 3, 'PM', 2, null::smallint, 'indicadores 9.14, 10.9 a 10.11, 10.19 e 12.8 a 12.10', 2::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 43),
    ('60 - C-Espc-HN - HN-1107-1011', 1, 'PM', 1, null::smallint, 'indicadores 3.2, 3.3, 9.3, 9.5, 9.6, 9.8, 9.9,9.10 e 9.11', 2::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 57),
    ('60 - C-Espc-HN - HN-1107-1011', 2, 'PM', 2, null::smallint, 'indicadores 9.13, 9,14, 9.15, 12.1, 12.6, 12.12, 12.13 e 12.14', 3::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 57),
    ('60 - C-Espc-HN - HN-1107-1011', 3, 'PM', 3, null::smallint, 'indicadores 7.6, 10.9, 10.10, 10.19, 12.2, 12.4, 12.5, 12.7, 12.10 12.11', 3::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 57),
    ('60 - C-Espc-HN - HN-1107-1011', 4, 'PP', 1, null::smallint, 'indicadores 8.6, 11.2, 11.11, 11.12, 11.13, 11.14, 11.15, 17.11 e 18.9', 4::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 57),
    ('61 - C-Espc-HN - HN-1108-0619', 1, 'PM', 1, null::smallint, 'indicadores 10.12, 10.13, 10.16, 10.22 e 14.1', 3::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 64),
    ('61 - C-Espc-HN - HN-1108-0619', 2, 'PP', 1, null::smallint, 'indicadores 14.1, 14.2, 14.3, 14.4 e 18.4', 4::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 64),
    ('61 - C-Espc-HN - HN-1108-0619', 3, 'PM', 2, null::smallint, 'indicadores 14.5, 14.6, 14.7 e 14.8', 3::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 64),
    ('62 - C-Espc-HN - HN-1109-0812', 1, 'PM', 1, null::smallint, 'indicadores 10.14, 13.17, 18.3, 13.6 e 13.13', 3::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 71),
    ('62 - C-Espc-HN - HN-1109-0812', 2, 'PM', 2, null::smallint, 'indicadores 13.9, 18.1, 18.2, 13.10 e 13.11', 3::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 72),
    ('62 - C-Espc-HN - HN-1109-0812', 3, 'PP', 1, null::smallint, 'indicadores 10.17, 13.7, 13.14 e 13.16', 10::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 72),
    ('63 - C-Espc-HN - HN-1110-0815', 1, 'PM', 1, null::smallint, 'indicadores 7.7, 7.8, 8.8, 10.1, 10.2, 10.3, 10.4 e 10.5', 3::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 78),
    ('63 - C-Espc-HN - HN-1110-0815', 2, 'PP', 1, null::smallint, 'indicadores 10.6, 10.7, 11.1, 11.3, 11.4, 18.5, 18.6 e 18.7', 3::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 78),
    ('64 - C-Espc-HN - HN-1111-0508', 1, 'PM', 1, null::smallint, 'indicadores 17.1, 17.2, 17.3, 17.4', 2::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 84),
    ('64 - C-Espc-HN - HN-1111-0508', 2, 'PP', 1, null::smallint, 'indicadores 8.9, 8.10, 10.18, 10.20, 17.5, 17.6, 17.7, 17.8, 17.9, 17.10 e 18.8', 5::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 84),
    ('65 - C-Espc-HN - HN-1112-0815', 1, 'PM', 1, null::smallint, 'indicadores 10.8, 10.19, 10.22, 15.8, 15.9, 15.10 e 15.11', 3::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 92),
    ('65 - C-Espc-HN - HN-1112-0815', 2, 'PM', 2, null::smallint, 'indicadores 13.19, 13.20, 15.1, 15.2, 15.13 e 16.1', 3::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 92),
    ('65 - C-Espc-HN - HN-1112-0815', 3, 'PP', 1, null::smallint, 'indicadores 9.7, 9.16, 15.3, 15.4, 15.5, 15.6, 15.7 e 15.12', 4::smallint, 1::smallint, 'of10-82-2024-densm-anb-c-espc-hn.pdf', 92)
  ), ins as (
    insert into public.avaliacoes_curriculo (disciplina_id, curso_id, ordem, instrumento_id, numero, unidade_ensino_id,
                                             origem_ue, ues_abordadas, ta_aplicacao, origem_ta_aplicacao, ta_vista,
                                             origem_ta_vista, origem_item, fonte_arquivo, fonte_pagina, origem_migracao_v1)
    select d.id, d.curso_id, x.ordem, i.id, x.numero, u.id, case when u.id is not null then 'curriculo' end,
           x.ues_abordadas, x.ta_aplicacao, case when x.ta_aplicacao is not null then 'curriculo' end, x.ta_vista,
           case when x.ta_vista is not null then 'curriculo' end, 'curriculo', x.fonte_arquivo, x.fonte_pagina,
           'spec014-D4:' || x.fonte_arquivo
      from dado x
      join public.disciplinas d on d.codigo = x.disciplina and d.status = 'ativo'
      join public.config_listas i on i.lista = 'instrumentos_avaliacao' and i.valor = x.instrumento
      left join public.unidades_ensino u on u.disciplina_id = d.id and u.numero_ue = x.ue and u.status = 'ativo'
    on conflict (disciplina_id, instrumento_id, numero) where status = 'ativo' do nothing
    returning 1
  )
  select count(*) into v_inseridos from ins;

  select count(*) into v_ativos from public.avaliacoes_curriculo where status = 'ativo' and origem_migracao_v1 like 'spec014-D4:%';
  if v_ativos <> 194 then
    raise exception 'D-4 (spec 014): esperava 194 itens ativos com a procedência, há % (disciplina ou UE sem destino?)', v_ativos;
  end if;
  if exists (select 1 from public.avaliacoes_curriculo a join public.disciplinas d on d.id = a.disciplina_id
              where a.status = 'ativo' group by d.id, d.carga_horaria_tempos
             having sum(coalesce(a.ta_aplicacao, 0) + coalesce(a.ta_vista, 0)) > d.carga_horaria_tempos) then
    raise exception 'D-4 (spec 014): há disciplina com avaliação do currículo acima da CH (FR-031.2).';
  end if;
  if v_inseridos > 0 then
    insert into public.migracao_log (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,
                                     acao, regra_aplicada, valor_antes, valor_depois, observacao)
    values ('MLOG-014-D4-' || to_char(now(), 'YYYYMMDDHH24MISS'), 'curriculo_densm', 'avaliacoes_curriculo.csv',
            'avaliacoes_curriculo', 'por disciplina', 'adicionado'::public.acao_migracao, 'FR-030 / R-13 (spec 014, D-4)',
            null, v_inseridos || ' itens', 'Avaliações dos currículos da DEnsM (194 itens; 90 ficaram para decisão).');
  end if;
  raise notice 'D-4 (spec 014): % item(ns) inserido(s); % ativo(s) com a procedência.', v_inseridos, v_ativos;
end;
$$;
