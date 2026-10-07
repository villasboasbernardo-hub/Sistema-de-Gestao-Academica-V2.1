-- Preparo da onda 2 da VIRADA-1 — cadastro decidido por Bernardo Villas Boas em 06/10/2026 (respostas ao lote da
-- onda 2, itens 3 e 4). Rodado nos dois bancos como UM bloco `DO` (a CLI executa uma instrucao por arquivo).
-- Idempotente. SEM NOME DE PESSOA: tudo por codigo de instrutor e codigo de curso; nome, posto e nome de guerra
-- da assinatura saem do proprio cadastro do instrutor.
--
-- ── 4a. PROMOCAO do instrutor 144: 1ºSG → SO (especialidade -MR inalterada), efetiva em 01/06/2026 — a data do
--    primeiro DSA em que ele aparece como SO (C-AP-FR 2026, aba PREENCHIMENTO). ⚠️ O cadastro NAO guarda historico
--    de posto nem tem campo de observacao: a data fica registrada AQUI e em `turmas-carregadas.md`. A planilha que
--    ainda escreve o posto antigo casa com ele pela regra `postos_aceitos_por_codigo` (fontes.json).
-- ── 4b. O instrutor 173 JA ESTA como 2ºTen (RM2-T), OM HNMD — e a pessoa decidida (conferido por posto, OM e
--    formacao); nada a atualizar. O texto «GM …» das planilhas casa com ele pela mesma regra.
-- ── 3. ASSINATURA: o 1º responsavel (elaborador, o Auxiliar da Divisao) POR CURSO, como a aba RESPONSAVEIS da
--    planilha (ou o rodape da IMPRESSAO quando ela nao existe), desde o inicio da turma de 2026. Modo `fixo`, ligado
--    ao instrutor. A linha GERAL (dinamica) continua valendo para os cursos que nao estao aqui: C-Ap-HN, C-Espc-HN
--    e C-Exp-BATI, cujo auxiliar nao esta no cadastro (vai para pendencias-cadastro.csv).
do $$
declare
  r record;
  v_inicio date;
  v_curso uuid;
  v_inst public.instrutores;
begin
  update public.instrutores set posto_graduacao = 'SO'
   where codigo = '144' and posto_graduacao = '1ºSG' and esp_hab_obs = '-MR';

  for r in select * from (values
      ('C-Ap-FR', '118'), ('C-Espc-FR', '118'), ('C-Esp-ME', '118'), ('C-Exp-MetocOf', '118'),
      ('C-Exp-Obs-ME', '118'), ('C-Exp-Ag-Mag', '118'), ('CAHO', '103')
    ) as t(curso, instrutor) loop
    select id into strict v_curso from public.cursos where codigo = r.curso;
    select min(data_inicio) into v_inicio from public.turmas where curso_id = v_curso and ano_letivo = 2026;
    select * into strict v_inst from public.instrutores where codigo = r.instrutor;
    if v_inst.nome_guerra is null then
      raise exception 'O instrutor % nao tem nome de guerra: a assinatura fixa exige (resp_fixo_tem_nominal).', r.instrutor;
    end if;
    if not exists (select 1 from public.responsaveis_curso where curso_id = v_curso and papel_assinatura = 'elaborador' and status = 'ativo') then
      insert into public.responsaveis_curso
        (codigo, curso_id, ordem, papel_assinatura, preenchimento, posto_graduacao, especialidade, nome_guerra,
         nome_completo, funcao_descricao, instrutor_id, vigente_de, exibir_no_dsa)
      select 'RSP-' || lpad((coalesce(max(substring(codigo from '^RSP-([0-9]+)$')::int), 0) + 1)::text, 6, '0'),
             v_curso, 1, 'elaborador', 'fixo', v_inst.posto_graduacao, nullif(btrim(v_inst.esp_hab_obs, ' -'), ''),
             v_inst.nome_guerra, v_inst.nome_completo, 'Aux. da Div. de Adm. Acadêmica', v_inst.id, v_inicio, true
        from public.responsaveis_curso;
    end if;
  end loop;
end $$;
