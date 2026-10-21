-- =================================================================================
-- RASCUNHO — a CÓPIA da versão do currículo, para o PR 2 da spec 021 (NÃO é migration deste PR).
--
-- Fica fora do PR 1 de propósito: antes de os leitores do código saberem distinguir duas versões, uma versão 2 criada
-- à mão misturaria as duas no DSA, na planilha e na aba Disciplinas (contracts/codigo.md).
-- Medido na cópia do remoto `remoto-20261021-010344.sql`, numa transação desfeita: a CAHO v2 sai com as mesmas 21
-- disciplinas, 1.668 TA, 132 UEs, 54 avaliações do currículo, 2 limites e 59 habilitações da v1, cada linha com par de
-- linhagem; nenhuma turma passa sozinha para ela (antes-depois.md §6).
-- A fazer no PR 2: as tabelas temporárias saírem antes de recriadas (duas cópias na mesma transação), e a prova do
-- porteiro com sessão real.
-- =================================================================================

-- A CÓPIA: a versão nova nasce igual a uma existente (padrão: a vigente na data de vigência pedida) e é editada
-- depois. Copia as disciplinas ATIVAS, as UEs ATIVAS delas, as avaliações do currículo ATIVAS, os limites ATIVOS e as
-- habilitações ATIVAS de instrutor. Cada cópia leva a linhagem da original e ganha código novo das sequências.
-- ⚠️ SECURITY DEFINER COM PORTEIRO (gotcha 15: `coalesce(…, false) is not true`): a cópia escreve em cinco tabelas,
--    e a versão não tem policy de INSERT — é este o único caminho. O carimbo de autoria é o de quem chama
--    (`app.set_auditoria` lê `auth.uid()`, que a definer não troca).
-- ⚠️ A CÓPIA NÃO FAZ NASCER LINHA DE TURMA: nenhuma turma segue a versão nova até escolhê-la.
create or replace function public.criar_versao_do_curriculo(
  p_curso_id uuid,
  p_vigente_de date,
  p_descricao text,
  p_copiar_de uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_origem  uuid := coalesce(p_copiar_de, app.curriculo_vigente(p_curso_id, p_vigente_de));
  v_nova    uuid := gen_random_uuid();
  v_versao  smallint;
begin
  if coalesce(app.pode('disciplinas', 'criar'), false) is not true
     or coalesce(app.alcanca_curso(p_curso_id), false) is not true
     or coalesce(app.curso_em_oferta(p_curso_id), false) is not true then
    raise exception 'O seu perfil não cria versão de currículo neste curso.'
      using errcode = '42501', hint = 'versao_sem_permissao';
  end if;
  if p_vigente_de is null then
    raise exception 'Informe a partir de quando a versão nova vale.'
      using errcode = '23502', hint = 'versao_sem_vigencia';
  end if;
  if v_origem is null or not exists (select 1 from public.curriculos c
                                      where c.id = v_origem and c.curso_id = p_curso_id) then
    raise exception 'A versão a copiar não é deste curso.'
      using errcode = '23514', hint = 'versao_de_outro_curso';
  end if;

  select coalesce(max(c.versao), 0) + 1 into v_versao from public.curriculos c where c.curso_id = p_curso_id;

  insert into public.curriculos (id, curso_id, versao, vigente_de, descricao, copiada_de)
  values (v_nova, p_curso_id, v_versao, p_vigente_de, nullif(btrim(p_descricao), ''), v_origem);

  -- As disciplinas: id novo gerado aqui, para mapear UE, avaliação e habilitação sem `RETURNING` (gotcha 4.1).
  create temporary table _mapa_disciplina on commit drop as
    select d.id as antiga, gen_random_uuid() as nova
      from public.disciplinas d
     where d.curriculo_id = v_origem and d.status = 'ativo';

  insert into public.disciplinas (
    id, curso_id, curriculo_id, linhagem_id, cod_disciplina, nome_disciplina, carga_horaria_tempos, ordem_sugerida,
    prioridade_alocacao_peso, previsao_inicio, previsao_termino, modo_atribuicao_padrao, tecnica_ensino_sugerida,
    local_padrao, sem_unidades_ensino, nome_no_dsa)
  -- `semanas` e `ch_semanal` são GERADAS das previsões: vêm junto, sem ser copiadas.
  select m.nova, d.curso_id, v_nova, d.linhagem_id, d.cod_disciplina, d.nome_disciplina, d.carga_horaria_tempos,
         d.ordem_sugerida, d.prioridade_alocacao_peso, d.previsao_inicio, d.previsao_termino,
         d.modo_atribuicao_padrao, d.tecnica_ensino_sugerida, d.local_padrao, d.sem_unidades_ensino, d.nome_no_dsa
    from _mapa_disciplina m join public.disciplinas d on d.id = m.antiga;

  create temporary table _mapa_ue on commit drop as
    select u.id as antiga, gen_random_uuid() as nova, m.nova as disciplina_nova
      from public.unidades_ensino u join _mapa_disciplina m on m.antiga = u.disciplina_id
     where u.status = 'ativo';

  insert into public.unidades_ensino (
    id, disciplina_id, curso_id, linhagem_id, numero_ue, topico, ch_prevista_tempos, tecnica_ensino_sugerida,
    fundamento_normativo)
  select mu.nova, mu.disciplina_nova, u.curso_id, u.linhagem_id, u.numero_ue, u.topico, u.ch_prevista_tempos,
         u.tecnica_ensino_sugerida, u.fundamento_normativo
    from _mapa_ue mu join public.unidades_ensino u on u.id = mu.antiga;

  insert into public.avaliacoes_curriculo (
    disciplina_id, curso_id, linhagem_id, ordem, instrumento_id, numero, unidade_ensino_id, origem_ue, ue_decidida_em,
    ues_abordadas, ta_aplicacao, origem_ta_aplicacao, ta_vista, origem_ta_vista, origem_item, fonte_arquivo,
    fonte_pagina)
  select m.nova, a.curso_id, a.linhagem_id, a.ordem, a.instrumento_id, a.numero, mu.nova, a.origem_ue,
         a.ue_decidida_em, a.ues_abordadas, a.ta_aplicacao, a.origem_ta_aplicacao, a.ta_vista, a.origem_ta_vista,
         a.origem_item, a.fonte_arquivo, a.fonte_pagina
    from public.avaliacoes_curriculo a
    join _mapa_disciplina m on m.antiga = a.disciplina_id
    left join _mapa_ue mu on mu.antiga = a.unidade_ensino_id
   where a.status = 'ativo';

  insert into public.limites_curriculo (curso_id, curriculo_id, categoria, tempos, fonte_arquivo, fonte_pagina)
  select l.curso_id, v_nova, l.categoria, l.tempos, l.fonte_arquivo, l.fonte_pagina
    from public.limites_curriculo l
   where l.curriculo_id = v_origem and l.status = 'ativo';

  insert into public.instrutor_disciplina (instrutor_id, disciplina_id, modo_atribuicao)
  select v.instrutor_id, m.nova, v.modo_atribuicao
    from public.instrutor_disciplina v join _mapa_disciplina m on m.antiga = v.disciplina_id
   where v.status = 'ativo';

  return v_nova;
end;
$$;
revoke all on function public.criar_versao_do_curriculo(uuid, date, text, uuid) from public, anon;
grant execute on function public.criar_versao_do_curriculo(uuid, date, text, uuid) to authenticated;

comment on function public.criar_versao_do_curriculo(uuid, date, text, uuid) is
  'Bloco 6 (spec 021): cria a versão N+1 do currículo do curso copiando uma versão existente (padrão: a vigente na '
  'data pedida) — disciplinas, UEs, avaliações do currículo, limites e habilitações ativas, cada cópia com a linhagem da '
  'original. Devolve o id da versão nova. Porteiro: disciplinas.criar com alcance e curso em oferta.';
