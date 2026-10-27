-- AS ASSINATURAS DO DSA da rodada de 26/10/2026 — respostas de Bernardo Villas Boas ao fechamento (26/10/2026, à noite):
-- «nenhum DSA sai com assinatura em branco» e «o Encarregado da Divisão é 1º-Tenente: RSP-000013 e RSP-000002 estão
-- certas». Sem nome de pessoa neste arquivo: os dados nominais são COPIADOS de uma linha que já existe ou do cadastro do
-- instrutor, pelo código. Um bloco só (atômico) e idempotente. Roda no local e, depois do merge, no remoto (os dois
-- estavam em RSP-000013).
--
-- ── 1. C-Exp-Obs-ME T1 2026 (02/02 a 27/02/2026): o elaborador saía EM BRANCO nas 4 semanas — a linha do curso
--    (RSP-000007) começa em 14/09 e a GERAL (RSP-000001) em 02/08. O rodapé da IMPRESSÃO da planilha da T1 traz o mesmo
--    Aux. em todas as folhas: o 3º-Sargento FR, a mesma pessoa da RSP-000012 (o nome completo é igual, conferido em
--    26/10/2026). Ele não é instrutor: a linha é DIGITADA (`fixo`, sem `instrutor_id`), no mesmo modo da RSP-000012, e
--    o texto é copiado dela. Vigência só o período da T1.
--
-- ── 2. C-Exp-BATI T1 2026 (09/03 a 13/03/2026): a RSP-000012 (digitada, 3º-Sargento FR, desde 09/03) veio das folhas-
--    modelo da IMPRESSÃO; a semana REAL (1ª folha) é assinada pelo instrutor 103 (2º-Sargento HN). A troca vale só para o
--    período da turma, pelo caminho das linhas por curso (onda-2-cadastro.sql: `fixo`, ligada ao instrutor):
--    (a) a RSP-000012 NÃO é apagada nem inativada — a vigência dela passa a começar no dia seguinte ao fim da turma
--        (14/03), e fora do período da T1 nada muda;
--    (b) entra a linha do instrutor 103 de 09/03 a 13/03/2026.
--    Na ordem (a) → (b), por causa da exclusão de vigência sobreposta (`ex_assinatura_sem_sobreposicao`).
do $$
declare
  v_obs uuid;
  v_bati uuid;
  v_inst public.instrutores;
  v_proximo text;
begin
  select id into strict v_obs from public.cursos where codigo = 'C-Exp-Obs-ME';
  select id into strict v_bati from public.cursos where codigo = 'C-Exp-BATI';

  -- 1. T1: a linha digitada, copiada da RSP-000012
  if not exists (select 1 from public.responsaveis_curso where curso_id = v_obs and papel_assinatura = 'elaborador'
                  and status = 'ativo' and vigente_de = date '2026-02-02') then
    select 'RSP-' || lpad((coalesce(max(substring(codigo from '^RSP-([0-9]+)$')::int), 0) + 1)::text, 6, '0')
      into v_proximo from public.responsaveis_curso;
    insert into public.responsaveis_curso
      (codigo, curso_id, ordem, papel_assinatura, preenchimento, posto_graduacao, especialidade, nome_guerra, nome_completo,
       nip, funcao_descricao, instrutor_id, email_usuario, usuario_id, vigente_de, vigente_ate, exibir_no_dsa)
    select v_proximo, v_obs, r.ordem, r.papel_assinatura, r.preenchimento, r.posto_graduacao, r.especialidade, r.nome_guerra,
           r.nome_completo, r.nip, r.funcao_descricao, null, null, null, date '2026-02-02', date '2026-02-27', true
      from public.responsaveis_curso r
     where r.codigo = 'RSP-000012' and r.papel_assinatura = 'elaborador' and r.preenchimento = 'fixo' and r.instrutor_id is null;
    if not found then
      raise exception 'A RSP-000012 nao esta como a decisao a leu (elaborador digitado): pare e confira.';
    end if;
  end if;

  -- 2a. BATI: a RSP-000012 passa a valer do dia seguinte ao fim da T1
  update public.responsaveis_curso set vigente_de = date '2026-03-14'
   where codigo = 'RSP-000012' and curso_id = v_bati and vigente_de = date '2026-03-09' and status = 'ativo';

  -- 2b. BATI: o instrutor 103 no período da T1
  if not exists (select 1 from public.responsaveis_curso where curso_id = v_bati and papel_assinatura = 'elaborador'
                  and status = 'ativo' and vigente_de = date '2026-03-09') then
    select * into strict v_inst from public.instrutores where codigo = '103' and status = 'ativo';
    if v_inst.nome_guerra is null then
      raise exception 'O instrutor 103 nao tem nome de guerra: a assinatura fixa exige (resp_fixo_tem_nominal).';
    end if;
    select 'RSP-' || lpad((coalesce(max(substring(codigo from '^RSP-([0-9]+)$')::int), 0) + 1)::text, 6, '0')
      into v_proximo from public.responsaveis_curso;
    insert into public.responsaveis_curso
      (codigo, curso_id, ordem, papel_assinatura, preenchimento, posto_graduacao, especialidade, nome_guerra,
       nome_completo, funcao_descricao, instrutor_id, vigente_de, vigente_ate, exibir_no_dsa)
    values (v_proximo, v_bati, 1, 'elaborador', 'fixo', v_inst.posto_graduacao, nullif(btrim(v_inst.esp_hab_obs, ' -'), ''),
            v_inst.nome_guerra, v_inst.nome_completo, 'Aux. da Div. de Adm. Acadêmica', v_inst.id,
            date '2026-03-09', date '2026-03-13', true);
  end if;
end $$;
