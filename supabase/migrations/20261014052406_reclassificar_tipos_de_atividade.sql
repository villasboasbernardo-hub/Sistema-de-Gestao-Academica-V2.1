-- =================================================================================
-- Spec 014, PR 1 · migration de DADO D-2 — tipos de parada e reclassificação dos tipos de atividade
-- Data local: 14/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- O que faz (FR-010, FR-021, FR-023, FR-007, A-5; data-model §2.3 e §2.6):
--   1. A lista `tipos_parada`: FR, LA, LP, NT, RC, PF, com `pode_global` e `aceita_tr`.
--   2. Recepção aos alunos → TAD e Apoio à Instrução → AEC (criados: não existiam).
--   3. Monitoria → Apoio_Individualizado (era Estudo_Individual); Português para Estrangeiros, BDA e BDF
--      → Apoio_Individualizado (criados: não existiam). D-AA-12, Q-3.
--   4. Os seis tipos sem categoria: Aula, Avaliação, Vista de Prova, Aula Teórica e Aula Prática recebem
--      `metadados.uso = 'aula'` (fora da oferta de atividade, FR-010); Licença de Pagamento fica
--      `ativo = false` na lista de atividade, porque passa a ser o `LP` de `tipos_parada`.
--   5. `config_parametros`: `avaliacao.vence_em_breve_dias = 2` (operacional, A-5). A referência de EI
--      reaproveita `estudo_obrig_com_regime_pct`/`_sem_regime_pct`, que já existem (só conferidas).
--
-- ⚠️ Medido na cópia `remoto-20261014-021627.sql`: nenhuma atividade ativa aponta Monitoria; as linhas
--    de Monitoria da sincronização foram gravadas com o subtipo "Administração" (resolver.py:63) e só
--    mudam na rodada do PR 3. Esta migration não reclassifica linha de atividade nenhuma por si.
-- ⚠️ Linhas novas de `config_listas` nascem SEM `origem_migracao_v1` (não são carga do ETL).
--
-- Reversão (reversao-pr1.sql): os valores antigos abaixo voltam por UPDATE; os tipos e as paradas
-- criados aqui ficam `ativo = false` (nada é apagado, regra 4).
--   Antes: Monitoria = {"categoria": "Estudo_Individual"}; Aula, Avaliação, Vista de Prova, Aula Teórica,
--   Aula Prática e Licença de Pagamento = {} (ativo = true).
-- =================================================================================

-- ---------------------------------------------------------------- 1. tipos de parada
insert into public.config_listas (lista, valor, rotulo_exibicao, ordem, ativo, metadados, observacao)
select 'tipos_parada', t.valor, t.rotulo, t.ordem, true,
       jsonb_build_object('pode_global', t.pode_global, 'aceita_tr', t.aceita_tr), t.obs
  from (values
    ('FR', 'FR — Feriado',                  1::smallint, true,  false, 'Feriado: sempre previsto; nunca consome Tempo Reserva (FR-025.2).'),
    ('LA', 'LA — Licença Administrativa',   2::smallint, true,  true,  'Licença administrativa; a não prevista pode consumir Tempo Reserva (FR-025.1).'),
    ('LP', 'LP — Licença de Pagamento',     3::smallint, true,  true,  'Licença de pagamento; a não prevista pode consumir Tempo Reserva.'),
    ('NT', 'NT — Parada de turma (outro motivo)', 4::smallint, false, true, 'Parada só da turma por outro motivo (treinamento, evento); a não prevista pode consumir Tempo Reserva.'),
    ('RC', 'RC — Recesso',                  5::smallint, true,  false, 'Recesso escolar: previsto.'),
    ('PF', 'PF — Ponto facultativo',        6::smallint, true,  false, 'Ponto facultativo: previsto.')
  ) as t(valor, rotulo, ordem, pode_global, aceita_tr, obs)
on conflict (lista, valor) do nothing;

-- ---------------------------------------------------------------- 2 e 3. tipos de atividade novos
insert into public.config_listas (lista, valor, rotulo_exibicao, ordem, ativo, metadados)
select 'tipos_atividade', t.valor, t.valor, t.ordem, true, jsonb_build_object('categoria', t.categoria)
  from (values
    ('Recepção aos alunos',          931::smallint, 'TAD'),
    ('Apoio à Instrução',            932::smallint, 'AEC'),
    ('Português para Estrangeiros',  933::smallint, 'Apoio_Individualizado'),
    ('BDA',                          934::smallint, 'Apoio_Individualizado'),
    ('BDF',                          935::smallint, 'Apoio_Individualizado')
  ) as t(valor, ordem, categoria)
on conflict (lista, valor) do nothing;

update public.config_listas
   set metadados = metadados || jsonb_build_object('categoria', 'Apoio_Individualizado')
 where lista = 'tipos_atividade' and valor = 'Monitoria'
   and metadados ->> 'categoria' is distinct from 'Apoio_Individualizado';

-- ---------------------------------------------------------------- 4. os tipos sem categoria
update public.config_listas
   set metadados = metadados || jsonb_build_object('uso', 'aula')
 where lista = 'tipos_atividade'
   and valor in ('Aula', 'Avaliação', 'Vista de Prova', 'Aula Teórica', 'Aula Prática')
   and metadados ->> 'uso' is distinct from 'aula';

update public.config_listas
   set ativo = false
 where lista = 'tipos_atividade' and valor = 'Licença de Pagamento' and ativo;

-- ---------------------------------------------------------------- 5. parâmetros
insert into public.config_parametros (chave, valor, tipo, unidade, descricao, natureza)
select 'avaliacao.vence_em_breve_dias', '2', 'inteiro', 'dias corridos',
       'Spec 014, A-5: a vista que vence nos próximos N dias aparece no /inicio e na ficha da turma (FR-054).',
       'operacional'
 where not exists (select 1 from public.config_parametros
                    where chave = 'avaliacao.vence_em_breve_dias' and status = 'ativo');

do $$
declare
  v_normativos integer;
begin
  select count(*) into v_normativos from public.config_parametros
   where chave in ('estudo_obrig_com_regime_pct', 'estudo_obrig_sem_regime_pct')
     and status = 'ativo' and natureza = 'normativo';
  if v_normativos = 0 then
    raise notice 'D-2 (spec 014): referências de EI ausentes nesta base — a tela mostra "parâmetro não cadastrado".';
  elsif v_normativos <> 2 then
    raise exception 'D-2 (spec 014): esperava as duas referências de EI normativas, há %', v_normativos;
  end if;
end;
$$;
