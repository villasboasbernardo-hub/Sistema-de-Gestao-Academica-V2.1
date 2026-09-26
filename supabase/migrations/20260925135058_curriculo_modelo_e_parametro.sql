-- =================================================================================
-- M6 da fatia (b) do Epico 5 — o que a tela precisa como DADO: o modelo do curriculo,
-- a marca de disciplina sem UE, e o limiar do aviso de inicio proximo.
--
-- ORIGEM : D-B3 (Bernardo Villas Boas, 24/09/2026) — "nem todo curso tem UE; os que tem
--          MUST editar e criar UEs; os que nao tem MUST funcionar sem UE e SEM AVISO
--          ENGANOSO"; `FR-050` e `FR-063` da spec 010; regra 8 do `CLAUDE.md` —
--          "parametro normativo e dado, nunca constante".
--
-- ⚠️ ESTA MIGRATION NAO MARCA CURSO NENHUM. Ela cria a estrutura com o padrao
--    `unidades_de_ensino` e `false`; QUEM marca e a carga do PR 2, a partir da
--    conferencia dos 24 curriculos. Estrutura e dado sao PRs diferentes de proposito: o
--    dado depende de leitura humana, a estrutura nao.
--
-- ⚠️ `text + CHECK` E NAO `ENUM`: o dominio e da DEnsM e esta fechado hoje, mas MUDOU
--    entre 2011 e 2024 — os dois curriculos por competencias sao de 2024. "ENUM fechado
--    cedo demais e migration" (convencao de banco do CLAUDE.md). E nao e `config_listas`
--    porque nao e vocabulario administravel pela Divisao: e o modelo do documento
--    normativo.
--
-- REVERSAO (executada numa base descartavel antes do PR):
--    alter table public.cursos      drop column curriculo_modelo;
--    alter table public.disciplinas drop column sem_unidades_ensino;
--    update public.config_parametros set status = 'inativo'
--     where chave = 'disciplinas.aviso_inicio_dias';   -- regra 4: parametro nao e apagado
--    ⚠️ O `drop column` so e seguro ENQUANTO nao houver dado alem do padrao — isto e,
--       antes do PR 2. Depois dele, a reversao e a do PR 2.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- PARTE A — o modelo do curriculo do curso (D-B3)
-- ---------------------------------------------------------------------------------
alter table public.cursos
  add column if not exists curriculo_modelo text not null default 'unidades_de_ensino';

alter table public.cursos
  add constraint cursos_curriculo_modelo_valido
  check (curriculo_modelo in ('unidades_de_ensino', 'competencias'));

comment on column public.cursos.curriculo_modelo is
  'Como o curriculo oficial da DEnsM descreve este curso: `unidades_de_ensino` (a secao '
  'LISTA DE UNIDADES DE ENSINO por disciplina) ou `competencias` (COMPETENCIA TECNICA -> '
  'INDICADORES, que NAO declara UE). E DADO, nao deducao (D-B3, Bernardo Villas Boas, '
  '24/09/2026): com `competencias`, a tela nao renderiza secao de UE e NAO avisa que '
  'faltam — aviso enganoso e o que a decisao proibe. Medido na conferencia de 24-25/09/2026: '
  '`C-Espc-FR` e `C-Espc-HN` sao `competencias` (busca por "UNIDADE" em 127 e 146 paginas: '
  'so unidades de medida e a SUE de anexos de palestra). ⚠️ Quem marca e a carga do PR 2.';

-- ---------------------------------------------------------------------------------
-- PARTE B — a disciplina que, mesmo em curso com UE, nao tem UE no curriculo
-- ---------------------------------------------------------------------------------
alter table public.disciplinas
  add column if not exists sem_unidades_ensino boolean not null default false;

comment on column public.disciplinas.sem_unidades_ensino is
  'Verdadeiro quando o curriculo do curso NAO lista UE para ESTA disciplina, embora liste '
  'para as outras — a D-B3 vale por disciplina, nao so por curso. Medido na conferencia: '
  'as 5 `AMBIENTACAO VIRTUAL` (que o curriculo trata como FASE, nunca como disciplina) e a '
  '`C-Exp-Metoc-OF-SP IV`, cuja linha carrega a sigla de outro curso e nao esta no '
  'curriculo do SP (P-2, 25/09/2026: o pareamento e sempre curso <-> o proprio curriculo, '
  'nunca cruzado). ⚠️ Quem marca e a carga do PR 2.';

-- ---------------------------------------------------------------------------------
-- PARTE C — o limiar do aviso de inicio proximo (FR-050, regra 8)
-- ---------------------------------------------------------------------------------
-- ⚠️ `where not exists` em vez de `on conflict`: a unicidade de `config_parametros` e o
--    indice PARCIAL `uq_config_param_chave_ano (chave, coalesce(ano_vigencia, 0)) where
--    status = 'ativo'` — `on conflict (chave)` nao casa com ele e falha com 42P10.
insert into public.config_parametros
  (chave, valor, tipo, unidade, natureza, descricao, fundamento_normativo, editavel_por, status)
select 'disciplinas.aviso_inicio_dias', '30', 'inteiro', 'dias', 'operacional',
       'Dias antes do inicio previsto a partir dos quais a disciplina e sinalizada como '
       '"inicio proximo" na tela de Disciplinas (RF-MATERIAS-03). O destaque difere conforme '
       'a disciplina ja tenha ou nao instrutor designado.',
       null,
       'encarregado_administracao_academica', 'ativo'
 where not exists (select 1 from public.config_parametros
                    where chave = 'disciplinas.aviso_inicio_dias' and status = 'ativo');

-- ⚠️ `natureza = operacional` de proposito: o numero e decisao da Divisao, nao texto de
--    norma — e por isso o CHECK `config_param_normativo_tem_fundamento` nao exige
--    fundamento. O `RF-MATERIAS-03` diz "30 dias" como pratica; se a Divisao mudar para
--    15, muda o dado, nao o codigo (regra 8 do CLAUDE.md).
