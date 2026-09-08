-- =================================================================================
-- `config_parametros.natureza` — separar o parâmetro normativo do operacional
--
-- O QUÊ  : acrescenta a coluna `natureza` (`normativo` | `operacional`) e converte o
--          invariante RNF-NORM-08 de teste em CHECK do banco.
--
-- PARA QUÊ: o invariante `070_normativo.sql` exige que **todo** parâmetro declare o
--          `fundamento_normativo` — "sem isso, revisão normativa vira arqueologia".
--          A regra é certa. Só que a carga real trouxe 18 parâmetros e um deles,
--          `id_template_ficha_instrutor`, não tem fundamento e **não deveria ter**:
--          o valor é `1EzYw9oSBFiM41Qi_...`, o ID do template do Google Docs da Ficha
--          de Docentes (spec 022 da v2.0). É parâmetro operacional, não normativo —
--          e ainda por cima de uma tecnologia que a v2.1 aposentou (a Ficha passa a
--          sair por `/print/*`).
--
-- ⚠️ POR QUE UMA COLUNA E NÃO UMA EXCEÇÃO NO TESTE: escrever a chave numa lista de
--    exceção dentro do pgTAP esconderia a informação no lugar onde ninguém procura.
--    A natureza do parâmetro é um FATO SOBRE A LINHA; o lugar dela é a linha.
--
-- ⚠️ POR QUE NÃO DERIVAR `natureza` DE `fundamento_normativo` ESTAR VAZIO: seria
--    circular — todo parâmetro sem fundamento viraria "operacional" por definição, e
--    o invariante passaria a não provar nada. Declarar exige que alguém DIGA que a
--    chave é operacional, e o default `normativo` faz o parâmetro novo nascer
--    obrigado a citar a norma.
--
-- Aplicado sob a autorização de 08/09/2026 de consertar os defeitos do Épico 1.
-- =================================================================================

alter table public.config_parametros
  add column natureza text not null default 'normativo';

alter table public.config_parametros
  add constraint config_param_natureza_valida
  check (natureza in ('normativo', 'operacional'));

-- O invariante, agora imposto pelo banco em vez de conferido depois. É a diferença
-- entre "o teste passou hoje" e "não é possível gravar o contrário" (Princípio VI).
alter table public.config_parametros
  add constraint config_param_normativo_tem_fundamento
  check (
    natureza <> 'normativo'
    or (fundamento_normativo is not null and btrim(fundamento_normativo) <> '')
  );

comment on column public.config_parametros.natureza is
  'normativo = o valor vem de uma norma e OBRIGA `fundamento_normativo` (RNF-NORM-08); '
  'operacional = parametro de funcionamento do sistema, sem norma por tras. O default '
  'e `normativo`, de modo que parametro novo nasca obrigado a citar a norma. '
  'Declarado no ETL por `mapa.PARAMETROS_OPERACIONAIS`, nunca inferido da ausencia do '
  'fundamento — inferir seria circular.';

comment on constraint config_param_normativo_tem_fundamento on public.config_parametros is
  'RNF-NORM-08: parametro normativo declara a norma de que veio. Sem isto, revisao '
  'normativa vira arqueologia.';

-- =================================================================================
-- PLANO DE REVERSÃO
--   alter table public.config_parametros
--     drop constraint config_param_normativo_tem_fundamento,
--     drop constraint config_param_natureza_valida,
--     drop column natureza;
-- =================================================================================
