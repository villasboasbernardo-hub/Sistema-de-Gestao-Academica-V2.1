-- O ELABORADOR GERAL DINÂMICO de 09/02 a 01/08/2026 — acertos finais da carga única de 26/10/2026 (R1 de Bernardo
-- Villas Boas, 27/10/2026, com a opção B: a regra do banco passou a aceitar linha dinâmica sem chave, migration
-- `20261027082223`). Sem nome de pessoa neste arquivo. Um bloco só (atômico) e idempotente. Roda no local e, depois
-- da migration, no remoto.
--
-- 25 semanas de turmas de 2026 saíam com o elaborador EM BRANCO: nenhuma linha do curso as cobre, e a geral
-- (`RSP-000001`, dinâmica, vinda da v2.0) só vale de 02/08 em diante. A linha nova é uma COPIA do modo da `RSP-000001`
-- (geral, dinâmica — assina quem imprime —, mesma ordem, função e exibição), sem pessoa e sem chave, de 09/02 (a
-- primeira semana em branco) a 01/08 (véspera da `RSP-000001`, fim inclusivo como a resolução do DSA lê).
--   · a `RSP-000001` não é tocada;
--   · a linha do curso continua vencendo a geral, então toda semana que já tem elaborador fica igual;
--   · a exclusão de vigência sobreposta NÃO alcança linha geral (`curso_id` nulo não conflita em EXCLUDE), então a
--     sobreposição com outra geral dinâmica é conferida aqui, antes de inserir.
do $$
declare
  v_modelo public.responsaveis_curso;
  v_proximo text;
begin
  select * into strict v_modelo from public.responsaveis_curso
   where codigo = 'RSP-000001' and curso_id is null and papel_assinatura = 'elaborador'
     and preenchimento = 'dinamico_usuario_logado' and status = 'ativo' and vigente_de = date '2026-08-02';

  if exists (select 1 from public.responsaveis_curso
              where curso_id is null and papel_assinatura = 'elaborador' and status = 'ativo'
                and vigente_de = date '2026-02-09' and vigente_ate = date '2026-08-01'
                and preenchimento = 'dinamico_usuario_logado') then
    return;  -- já aplicado
  end if;

  if exists (select 1 from public.responsaveis_curso
              where curso_id is null and papel_assinatura = 'elaborador' and status = 'ativo'
                and daterange(vigente_de, vigente_ate, '[]') && daterange(date '2026-02-09', date '2026-08-01', '[]')) then
    raise exception 'Ja ha elaborador geral ativo entre 09/02 e 01/08/2026: pare e confira.';
  end if;

  select 'RSP-' || lpad((coalesce(max(substring(codigo from '^RSP-([0-9]+)$')::int), 0) + 1)::text, 6, '0')
    into v_proximo from public.responsaveis_curso;
  insert into public.responsaveis_curso
    (codigo, curso_id, ordem, papel_assinatura, preenchimento, funcao_descricao, vigente_de, vigente_ate, exibir_no_dsa)
  values (v_proximo, null, v_modelo.ordem, v_modelo.papel_assinatura, v_modelo.preenchimento, v_modelo.funcao_descricao,
          date '2026-02-09', date '2026-08-01', v_modelo.exibir_no_dsa);
end $$;
