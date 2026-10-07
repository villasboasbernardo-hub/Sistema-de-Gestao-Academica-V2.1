-- O ENCARREGADO DA DIVISAO (2ª assinatura do DSA) DE 05/01 A 01/08/2026 — conferencia visual de Bernardo Villas Boas, 07/10/2026.
--
-- ⚠️ CAUSA, medida: a linha GERAL do encarregado (RSP-000002) nasceu com `vigente_de` = data da migracao (02/08/2026),
--    de proposito, para nao afirmar retroativamente quem assinou. Mas as planilhas de controle agora carregadas TEM o
--    DSA assinado de cada semana, e o rodape da IMPRESSAO traz o mesmo encarregado desde 05/01/2026 (235 semanas, em
--    todas as turmas). Todo DSA anterior a 02/08 saia sem a 2ª assinatura: 143 semanas em 8 turmas.
-- ⚠️ NADA E REESCRITO: a linha de 02/08 fica como esta. Entra UMA linha nova, GERAL, do mesmo papel, com o periodo
--    anterior — a vigencia nao reinterpreta o passado, ela o completa com o que o documento assinado prova.
--    Os dados nominais sao copiados da propria RSP-000002 (sem nome de pessoa neste arquivo). Idempotente.
insert into public.responsaveis_curso
  (codigo, curso_id, ordem, papel_assinatura, preenchimento, posto_graduacao, especialidade, nome_guerra, nome_completo,
   nip, funcao_descricao, instrutor_id, email_usuario, usuario_id, vigente_de, vigente_ate, exibir_no_dsa)
select (select 'RSP-' || lpad((coalesce(max(substring(codigo from '^RSP-([0-9]+)$')::int), 0) + 1)::text, 6, '0') from public.responsaveis_curso),
       null, r.ordem, r.papel_assinatura, r.preenchimento, r.posto_graduacao, r.especialidade, r.nome_guerra, r.nome_completo,
       r.nip, r.funcao_descricao, r.instrutor_id, r.email_usuario, r.usuario_id, date '2026-01-05', date '2026-08-01', true
  from public.responsaveis_curso r
 where r.codigo = 'RSP-000002' and r.vigente_de = date '2026-08-02'
   and not exists (select 1 from public.responsaveis_curso x where x.curso_id is null and x.papel_assinatura = 'encarregado_divisao'
                    and x.status = 'ativo' and x.vigente_de = date '2026-01-05');
