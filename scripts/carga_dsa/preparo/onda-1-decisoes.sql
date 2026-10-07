-- Preparo da onda 1 da VIRADA-1 — as decisoes D1 a D5 de Bernardo Villas Boas (06/10/2026, segunda rodada
-- de respostas), aplicadas nos dois bancos (local e remoto), cada bloco idempotente, como UMA instrucao
-- da CLI do Supabase (db query -f).
--
-- ⚠️ REGISTRO DO QUE FOI RODADO A MAO, nao migration: e cadastro, e a regra de direcao so admite dado no
--    remoto por decisao nominal. Nenhum gatilho foi desligado.
--
-- ⚠️ O QUE NAO ESTA AQUI, de proposito (repositorio publico): os NOMES DE GUERRA preenchidos nos sete
--    instrutores que nao os tinham (D-nomes) e o cadastro da 1ºTen que a planilha traz e o cadastro nao
--    tinha (D3). Os dois foram rodados a mao, a partir do texto da IMPRESSAO, e conferidos por codigo e
--    posto; aqui fica a lista dos codigos: nome de guerra em 13, 17, 18, 21, 45, 149, 175.

-- ⚠️ UM SO BLOCO `DO`: a CLI (db query -f) executa uma instrucao por arquivo.
do $$
declare v_cfg uuid; v_d uuid; v_n int;
begin
-- ── D1. CATALOGO DE HORARIO com o Estudo Individual fora da tabela HORARIOS ──────────────────────────
-- A aba HORARIOS do C-EXP-AG-MAG T01/26 vai ate o 8º tempo; a IMPRESSAO repete, em todas as semanas, o
-- EI em 16:50-17:30 — um tempo de 40 min que os cinco campos do regime nao representam. O modelo ja tem
-- catalogo de horario (`configuracoes_horario` + `horarios_tempos_aula`, com `tipo_tempo = excepcional`
-- para o tempo alem do regime): o CFG-F e a tabela da planilha mais o EI como 9º tempo, excepcional.
-- A vigencia passa a apontar para ele pela carga (sincronizar, decisao `relogio.catalogo`).
  select id into v_cfg from public.configuracoes_horario where codigo = 'CFG-F';
  if v_cfg is null then
    insert into public.configuracoes_horario (codigo, nome_config)
    values ('CFG-F', '8 TA de 50 min - intervalo 10/5 min - EI 16:50 (C-Exp-Ag-Mag 2026, aba HORARIOS + IMPRESSAO)')
    returning id into v_cfg;
    insert into public.horarios_tempos_aula (configuracao_id, tempo_numero, periodo, tipo_tempo, hora_inicio, hora_fim, intervalo_apos_min) values
      (v_cfg, 1, 'manha', 'normal', '08:10', '09:00', 10),
      (v_cfg, 2, 'manha', 'normal', '09:10', '10:00', 10),
      (v_cfg, 3, 'manha', 'normal', '10:10', '11:00', 10),
      (v_cfg, 4, 'manha', 'normal', '11:10', '12:00', null),
      (v_cfg, 5, 'tarde', 'normal', '13:05', '13:55', 5),
      (v_cfg, 6, 'tarde', 'normal', '14:00', '14:50', 5),
      (v_cfg, 7, 'tarde', 'normal', '14:55', '15:45', 5),
      (v_cfg, 8, 'tarde', 'normal', '15:50', '16:40', 10),
      (v_cfg, 9, 'tarde', 'excepcional', '16:50', '17:30', null);
    raise notice 'CFG-F criado';
  else
    raise notice 'CFG-F ja existe';
  end if;

-- ── D2. ESTAGIO PRATICO (V) do C-Exp-MetocOf: disciplina SEM unidades de ensino ─────────────────────
-- A planilha abre a V em 12 topicos e o curriculo tem 2 UE; a aula entra por disciplina, com o topico
-- da planilha. Pre-condicao exigida: NENHUM lancamento ativo nas 2 UE, em turma nenhuma — o bloco para
-- se houver (medido antes de rodar: 0 no remoto; no local, so a linha que a propria carga desta
-- planilha havia criado, refeita pela mesma carga).
  select d.id into strict v_d from public.disciplinas d join public.cursos c on c.id = d.curso_id
   where c.codigo = 'C-Exp-MetocOf' and d.cod_disciplina = 'V' and d.status = 'ativo';
  select count(*) into v_n from public.registros_aula r join public.unidades_ensino u on u.id = r.unidade_ensino_id
   where u.disciplina_id = v_d and r.status = 'ativo';
  if v_n > 0 then
    raise exception 'A disciplina V do C-Exp-MetocOf tem % lancamento(s) ativo(s) nas UE: pare e mostre.', v_n;
  end if;
  update public.disciplinas set sem_unidades_ensino = true where id = v_d and sem_unidades_ensino is distinct from true;
  raise notice 'V sem_unidades_ensino: % linha(s)', (select count(*) from public.disciplinas where id = v_d and sem_unidades_ensino);

-- ── D5. O local «H11» como esta no DSA; a turma do C-Exp-MetocOf com 6 alunos, encerrada ────────────
  insert into public.config_listas (lista, valor, rotulo_exibicao, metadados)
  select 'salas', 'H11', 'H11', '{"ambiente_virtual": false}'::jsonb
   where not exists (select 1 from public.config_listas where lista = 'salas' and valor = 'H11');

  update public.turmas set alunos = 6, status = 'concluida'
   where codigo = 'C-Exp-MetocOf 2026' and curso_id = (select id from public.cursos where codigo = 'C-Exp-MetocOf')
     and (alunos is distinct from 6 or status <> 'concluida');
end $$;
