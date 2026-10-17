-- Reversão da D-12 (`20261017023430_respostas_das_duvidas_16_10.sql`) — nada é apagado (regra 4).
-- Rodar como dono (psql), numa transação, DEPOIS de conferir que a D-12 gravou (evento `MLOG-014-D12-%`).
-- Volta a L1550-V à prova da XIII de 09/10 (como estava) e as três vistas às provas e números de antes.
-- ⚠️ O `editado_por` da L1550-V não volta sozinho: o valor de antes está no `valor_antes` do evento D-12.
begin;

-- as vistas, na ordem que não colide no índice único (avaliação, número) das ativas
update public.vistas_de_avaliacao set numero = 2
 where codigo = 'DSAP-C-AP-HN-2026-L1182-S';
update public.vistas_de_avaliacao
   set avaliacao_id = (select id from public.avaliacoes where codigo = 'DSAP-C-AP-HN-2026-L1111-V'), numero = 1
 where codigo = 'VST-000160';
update public.vistas_de_avaliacao
   set avaliacao_id = (select id from public.avaliacoes where codigo = 'DSAP-C-AP-HN-2026-L1550-V'), numero = 1
 where codigo = 'VST-000243';

-- a prova volta a ser a da XIII
update public.avaliacoes a
   set disciplina_id = (select d.id from public.disciplinas d where d.curso_id = a.curso_id and d.cod_disciplina = 'XIII' and d.status = 'ativo'),
       data_avaliacao = date '2026-10-09', ta_inicial = 1, tempos_consumidos = 3,
       tipo_avaliacao = 'Prova Escrita', metodologia = 'Prova Mista', local = 'Sala 01',
       instrutor_responsavel_id = null,
       fiscal_id = (select i.id from public.instrutores i where i.codigo::text = '17'),
       nome_fiscal_externo = null, ues_abordadas = null, avaliacao_curriculo_id = null, instrumento_id = null,
       conteudo_resumo = 'PM2 – OCEANOGRAFIA AV. DA APRENDIZAGEM (U.E. 2 e 3)',
       observacoes = regexp_replace(observacoes, ' \[CORRIGIDO NO SISTEMA — DECISÃO DE BERNARDO VILLAS BOAS, 16/10/2026 \(dúvidas 1 e 2\)[^]]*\]', '')
 where a.codigo = 'DSAP-C-AP-HN-2026-L1550-V';

insert into public.migracao_log (codigo, origem_tabela, destino_tabela, acao, regra_aplicada, observacao)
values ('MLOG-014-D12-REVERSAO-' || to_char(now(), 'YYYYMMDDHH24MISS'), 'migracao_log (D-12)', 'avaliacoes, vistas_de_avaliacao',
        'corrigido'::public.acao_migracao, 'reversão da D-12 (spec 014)', 'Reversão da D-12.');
commit;
