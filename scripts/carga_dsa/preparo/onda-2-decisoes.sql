-- Preparo da onda 2 da VIRADA-1 (cursos regulares) — decisao D1 de Bernardo Villas Boas (06/10/2026),
-- aplicada nos dois bancos como UM bloco `DO` (a CLI executa uma instrucao por arquivo). Idempotente.
--
-- ── D1. CATALOGO DE HORARIO do C-Ap-HN com o Estudo Individual fora da tabela HORARIOS ──────────────
-- A aba HORARIOS da «Cópia de C-AP-HN 2026 - Sabado» vai ate o 9º tempo (16:20); a IMPRESSAO repete, em
-- todas as semanas, o EI em 16:25-17:20 — 55 min, que os cinco campos do regime (TA de 45) nao produzem.
-- O CFG-G e a tabela de 9x45 (07:50, intervalos de 5 min, tarde 13:05) mais o EI como 10º tempo,
-- excepcional. A vigencia de EXCECAO do curso (a que o DSA usa) passa a apontar para ele pela carga.
do $$
declare v_cfg uuid;
begin
  select id into v_cfg from public.configuracoes_horario where codigo = 'CFG-G';
  if v_cfg is null then
    insert into public.configuracoes_horario (codigo, nome_config)
    values ('CFG-G', '9 TA de 45 min - intervalo 5 min - EI 16:25 (C-Ap-HN 2026, aba HORARIOS + IMPRESSAO)')
    returning id into v_cfg;
    insert into public.horarios_tempos_aula (configuracao_id, tempo_numero, periodo, tipo_tempo, hora_inicio, hora_fim, intervalo_apos_min) values
      (v_cfg, 1, 'manha', 'normal', '07:50', '08:35', 5),
      (v_cfg, 2, 'manha', 'normal', '08:40', '09:25', 5),
      (v_cfg, 3, 'manha', 'normal', '09:30', '10:15', 5),
      (v_cfg, 4, 'manha', 'normal', '10:20', '11:05', 5),
      (v_cfg, 5, 'manha', 'normal', '11:10', '11:55', null),
      (v_cfg, 6, 'tarde', 'normal', '13:05', '13:50', 5),
      (v_cfg, 7, 'tarde', 'normal', '13:55', '14:40', 5),
      (v_cfg, 8, 'tarde', 'normal', '14:45', '15:30', 5),
      (v_cfg, 9, 'tarde', 'normal', '15:35', '16:20', 5),
      (v_cfg, 10, 'tarde', 'excepcional', '16:25', '17:20', null);
    raise notice 'CFG-G criado';
  else
    raise notice 'CFG-G ja existe';
  end if;
end $$;
