-- Reversão da D-11 (`20261016225643_correcoes_da_lista_16_10.sql`) — nada é apagado (regra 4).
-- Rodar como dono (psql), numa transação, DEPOIS de conferir que a D-11 gravou (eventos `MLOG-014-D11-%`).
-- ⚠️ O `editado_por` das duas avaliações NÃO volta sozinho: o valor de antes está no `valor_antes` dos eventos D1 e D2.
begin;

-- 1. as sugestões sem valor voltam a ativas: as que a D-11 inativou têm `editado_em` = o instante do evento
update public.avaliacoes_curriculo_turma x
   set status = 'ativo'
  from public.migracao_log m
 where m.codigo like 'MLOG-014-D11-SUG-%' and x.editado_em = m.executado_em
   and x.origem = 'sugestao_planilha' and x.status = 'inativo' and x.ta_aplicacao is null and x.ta_vista is null;

-- 2. D1: sem item e sem U.E.; a vista de 27/08 sai (inativa); a marca sai de `observacoes`
update public.avaliacoes
   set avaliacao_curriculo_id = null, ues_abordadas = null,
       observacoes = regexp_replace(observacoes, ' \[CORRIGIDO NO SISTEMA — DECISÃO DE BERNARDO VILLAS BOAS, 16/10/2026 \(D1[^]]*\]', '')
 where codigo = 'DSAP-C-AP-HN-2026-L1111-V';
update public.vistas_de_avaliacao set status = 'inativo' where codigo = 'DSAP-C-AP-HN-2026-L1182-S';

-- 3. D2: sem item; a marca sai
update public.avaliacoes
   set avaliacao_curriculo_id = null,
       observacoes = regexp_replace(observacoes, ' \[CORRIGIDO NO SISTEMA — DECISÃO DE BERNARDO VILLAS BOAS, 16/10/2026 \(D2[^]]*\]', '')
 where codigo = 'DSAP-C-AP-HN-2026-L1249-V';

insert into public.migracao_log (codigo, origem_tabela, destino_tabela, acao, regra_aplicada, observacao)
values ('MLOG-014-D11-REVERSAO-' || to_char(now(), 'YYYYMMDDHH24MISS'), 'migracao_log (D-11)', 'avaliacoes_curriculo_turma, avaliacoes, vistas_de_avaliacao',
        'corrigido'::public.acao_migracao, 'reversão da D-11 (spec 014)', 'Reversão da D-11.');
commit;
