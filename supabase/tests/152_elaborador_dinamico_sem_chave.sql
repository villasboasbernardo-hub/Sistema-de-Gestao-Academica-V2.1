-- =================================================================================
-- 152 — VIRADA-1, acertos finais da carga única de 26/10/2026 (opção B de Bernardo Villas Boas, 27/10/2026):
-- a linha de assinatura no modo DINÂMICO deixa de exigir chave de usuário (`resp_dinamico_tem_chave` sai).
--
-- O que se prova aqui (regra de banco; a assinatura impressa é provada em `tests/unidade/dsa/assinaturas.test.ts`):
--   · o caso que discrimina: linha dinâmica NOVA, sem `email_usuario` nem `usuario_id`, era recusada com 23514 e passa
--     a ser aceita — é a linha geral que preenche as semanas com o elaborador em branco;
--   · a linha dinâmica vinda da v2.0, editada sem chave, também passa (a catraca de `20260908083100` saiu junto);
--   · o que NÃO muda: a linha fixa continua exigindo posto e nome de guerra (recusa pela restrição certa), a dinâmica
--     com chave continua aceita, e as outras restrições da tabela continuam no catálogo.
-- =================================================================================
begin;
select plan(8);

-- Qual restrição recusou (o código 23514 sozinho não distingue uma CHECK da outra).
create function pg_temp.recusa(p_sql text) returns jsonb
language plpgsql as $f$
declare v_restricao text;
begin
  execute p_sql;
  return jsonb_build_object('recusou', false);
exception when others then
  get stacked diagnostics v_restricao = constraint_name;
  return jsonb_build_object('recusou', true, 'sqlstate', sqlstate, 'restricao', v_restricao);
end;
$f$;

-- ── estrutura ──
select is((select count(*)::int from pg_constraint
            where conrelid = 'public.responsaveis_curso'::regclass and conname = 'resp_dinamico_tem_chave'), 0,
          'resp_dinamico_tem_chave não existe mais');
select is((select count(*)::int from pg_constraint
            where conrelid = 'public.responsaveis_curso'::regclass
              and conname in ('resp_fixo_tem_nominal', 'resp_ordem_positiva', 'resp_vigencia_coerente',
                              'ex_assinatura_sem_sobreposicao')), 4,
          'as outras quatro restrições da tabela continuam no catálogo');

-- ── o caso que discrimina: a linha geral dinâmica NOVA, sem chave ──
select is(pg_temp.recusa($$insert into public.responsaveis_curso
            (codigo, curso_id, ordem, papel_assinatura, preenchimento, funcao_descricao, vigente_de, vigente_ate)
          values ('RSP-T152-1', null, 1, 'elaborador', 'dinamico_usuario_logado', 'Operador responsavel pelo lancamento',
                  '2026-02-09', '2026-08-01')$$),
          '{"recusou": false}'::jsonb,
          'linha dinâmica NOVA sem email_usuario nem usuario_id é aceita (era recusada com 23514)');
select is((select (email_usuario is null and usuario_id is null and origem_migracao_v1 is null)
             from public.responsaveis_curso where codigo = 'RSP-T152-1'), true,
          'e ela ficou gravada sem chave e sem procedência de ETL');

-- ── a linha da v2.0, editada sem chave ──
insert into public.responsaveis_curso
  (codigo, curso_id, ordem, papel_assinatura, preenchimento, funcao_descricao, vigente_de, origem_migracao_v1)
values ('RSP-T152-2', null, 1, 'elaborador', 'dinamico_usuario_logado', 'Operador responsavel pelo lancamento',
        '2027-01-04', 'Responsaveis_Curso:RSP-T152-2');
select is(pg_temp.recusa($$update public.responsaveis_curso set funcao_descricao = 'Operador do lancamento'
                            where codigo = 'RSP-T152-2'$$),
          '{"recusou": false}'::jsonb,
          'a linha dinâmica da v2.0 editada sem chave é aceita (a catraca de 20260908083100 recusava)');

-- ── o que não muda ──
select is(pg_temp.recusa($$insert into public.responsaveis_curso
            (codigo, curso_id, ordem, papel_assinatura, preenchimento, funcao_descricao, vigente_de)
          values ('RSP-T152-3', null, 2, 'encarregado_divisao', 'fixo', 'Encarregado da Divisao', '2027-01-04')$$)
            - 'recusou',
          '{"sqlstate": "23514", "restricao": "resp_fixo_tem_nominal"}'::jsonb,
          'controle: a linha FIXA sem posto e nome de guerra continua recusada, pela resp_fixo_tem_nominal');
select is(pg_temp.recusa($$insert into public.responsaveis_curso
            (codigo, curso_id, ordem, papel_assinatura, preenchimento, funcao_descricao, vigente_de, email_usuario)
          values ('RSP-T152-4', null, 1, 'elaborador', 'dinamico_usuario_logado', 'Operador responsavel pelo lancamento',
                  '2028-01-03', 'conta@exemplo.invalid')$$),
          '{"recusou": false}'::jsonb,
          'controle: a linha dinâmica COM chave continua aceita');
select is(pg_temp.recusa($$insert into public.responsaveis_curso
            (codigo, curso_id, ordem, papel_assinatura, preenchimento, funcao_descricao, vigente_de)
          values ('RSP-T152-5', null, 0, 'elaborador', 'dinamico_usuario_logado', 'Operador responsavel pelo lancamento',
                  '2029-01-01')$$)
            - 'recusou',
          '{"sqlstate": "23514", "restricao": "resp_ordem_positiva"}'::jsonb,
          'controle: a linha dinâmica sem chave continua sujeita às outras restrições (ordem 0 recusada)');

select * from finish();
rollback;
