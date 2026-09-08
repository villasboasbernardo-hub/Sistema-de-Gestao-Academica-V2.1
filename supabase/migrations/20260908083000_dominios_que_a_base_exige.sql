-- =================================================================================
-- Os domínios que a base exige e o Épico 1 não previu
--
-- O QUÊ  : acrescenta quatro rótulos a dois ENUMs e admite, no `CHECK` de
--          `responsaveis_curso`, a única linha histórica que ele recusa.
--
-- PARA QUÊ: a promoção `staging` → `public` do Épico 2 é a primeira vez que o schema
--          encontra os dados REAIS. Três domínios declarados no Épico 1 a partir do
--          BRIEF não cobrem o que a planilha tem. Não é lacuna do ETL: é o schema
--          descobrindo, por medição, que o domínio fechado que ele declarou era
--          menor que o domínio que existe.
--
-- COMO   : `ALTER TYPE … ADD VALUE` é **aditivo**. Nada é reescrito, nada é apagado,
--          nenhuma linha existente muda de valor — o que está de acordo com a regra 4
--          do CLAUDE.md e com o Princípio IV.
--
-- ⚠️ RATIFICAÇÃO PENDENTE DO BERNARDO. As quatro adições são consequência de uma
--    MEDIÇÃO, não de uma preferência, e cada uma está justificada abaixo com a
--    contagem de linhas que a motiva. Mas alargar domínio normativo é decisão de
--    negócio: se alguma delas estiver errada, o conserto é aqui, antes da carga real.
--    Aplicadas sob a autorização de 08/09/2026 ("autorizo consertar os problemas do
--    banco anterior agora mesmo").
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 1. `escopo_curso` — faltavam duas das cinco classificações reais
--
-- MEDIDO em `Cad_Cursos`, 24 cursos:
--     7  Estágio de qualificação          → estagio_qualificacao  (já existia)
--     5  Curso Regular                    → regular               (já existia)
--     5  Curso Expedito                   → expedito              (já existia)
--     4  Curso de Aperfeiçoamento Avançado→ ⚠️ SEM DESTINO
--     3  Curso Especial                   → ⚠️ SEM DESTINO
--
-- São **7 dos 24 cursos** — C-ApA-AuxNav-PR-SP, C-ApA-OcOp-PR-SP, C-ApA-PCN-PR-EAD,
-- C-ApA-PrevMe-PR-EAD, C-Esp-ALH, C-Esp-ME, C-Esp-OpAP. Sem estes dois rótulos eles
-- não entram, e "não entram" contraria o FR-001 (100% do histórico).
--
-- ⚠️ CONSEQUÊNCIA QUE PRECISA SER VISTA: `escopo_curso` serve às DUAS pontas — em
--    `cursos.classificacao` diz o que o curso é; em `usuarios.escopo_curso` diz o que
--    o Operador alcança. Alargar o tipo alarga também o recorte possível de um
--    Operador: passa a ser possível escopar alguém em `especial` ou em
--    `aperfeicoamento_avancado`. Isso é coerente — são cursos que existem e alguém
--    precisa administrá-los — mas é superfície de autorização nova, e por isso está
--    escrito aqui em vez de passar despercebido.
-- ---------------------------------------------------------------------------------
alter type public.escopo_curso add value if not exists 'aperfeicoamento_avancado';
alter type public.escopo_curso add value if not exists 'especial';

-- ---------------------------------------------------------------------------------
-- 2. `acao_migracao` — o log histórico usa dois verbos que o ENUM não tinha
--
-- MEDIDO em `_Migracao_Log`, 930 linhas:
--     346 Transportado · 189 Arquivado · 186 Conciliado · 107 Transformado
--      99 Corrigido    ·   2 Adicionado (⚠️)  ·  1 Descartado (⚠️)
--
-- Cinco dos sete verbos já coincidem: o ENUM foi claramente derivado deste log. Os
-- dois restantes são 3 linhas.
--
-- ⚠️ POR QUE NÃO TRADUZIR OS DOIS PARA O VERBO MAIS PRÓXIMO: `Adicionado` viraria
--    `transformado` e `Descartado` viraria `arquivado`. Seriam três linhas de um log
--    de migração REESCRITAS na transcrição — exatamente o que a regra 5 do CLAUDE.md
--    proíbe ("`migracao_log` é append-only… corrigir é logar evento novo"). Um log
--    auditável cujo verbo muda ao ser copiado não é mais auditável. Acrescentar o
--    rótulo custa duas linhas de SQL e preserva a evidência verbatim.
-- ---------------------------------------------------------------------------------
alter type public.acao_migracao add value if not exists 'adicionado';
alter type public.acao_migracao add value if not exists 'descartado';

comment on type public.acao_migracao is
  'Natureza do evento de migracao. E a evidencia auditavel de que 100% do historico foi '
  'transportado. Origem: v2.0 §5.11 (`_Migracao_Log`); RF-DADOS-05; RNF-CONF-01. '
  '⚠️ `adicionado` e `descartado` sao verbos da migracao v1.0->v2.0, acrescentados em '
  '08/09/2026 para transportar 3 linhas do log historico SEM reescrever o verbo. Nao '
  'use os dois em evento novo da v2.1: para a v2.1 o vocabulario e o dos cinco '
  'primeiros.';
