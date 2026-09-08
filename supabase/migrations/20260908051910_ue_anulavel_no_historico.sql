-- =================================================================================
-- R-1 — `registros_aula.unidade_ensino_id` passa a aceitar nulo, sob CHECK com catraca
--
-- O QUÊ  : remove `not null` da coluna e acrescenta um `CHECK` que confina o nulo ao
--          histórico migrado e ainda não editado.
--
-- PARA QUÊ: a decisão UE-1 (26/08/2026, rota (b)) pôs `registros_aula` no grão de
--          Unidade de Ensino, e o Épico 1 a materializou com a coluna OBRIGATÓRIA —
--          é o que *significa* estar no grão de UE. Mas a v2.0 NUNCA GUARDOU a UE dos
--          seus 1.566 registros, e as planilhas da v1.0 só cobrem 7 dos 24 cursos.
--          Os 17 cursos restantes não têm de onde tirar o dado, e inventá-lo foi
--          vetado por Bernardo em 07/09/2026.
--
--          Sem esta migration, a carga falha por `NOT NULL` — e falha TARDE, depois de
--          16 tabelas já promovidas dentro da transação.
--
-- COMO   : `drop not null` mais um `CHECK` de duas condições.
--
-- O QUE A CATRACA PRESERVA — e é o ponto desta migration:
--
--   A decisão UE-1 CONTINUA VALENDO para todo dado novo. O nulo é admitido apenas
--   quando a linha (a) veio da migração, e (b) NUNCA FOI EDITADA. Assim que alguém
--   edita um registro histórico, ele passa a exigir a Unidade de Ensino: o histórico
--   pode ficar incompleto, mas não pode ser MANTIDO incompleto por quem mexe nele.
--
--   A regra fica EXPLÍCITA NO BANCO, e não em comentário que alguém lê em 2028 sem
--   entender por que a coluna é anulável.
--
-- ⚠️ RESIDUAL CONHECIDO E DECLARADO (checklists/integridade.md §CHK023):
--   um INSERT novo também nasce com `editado_em` nulo. Quem preencher
--   `origem_migracao_v1` no formato do FR-002.1 ainda consegue gravar sem UE.
--   A catraca tornou a fraude DELIBERADA em vez de acidental; fechá-la por completo
--   exige gatilho que distinga a sessão do ETL da sessão de um usuário — e isso é o
--   Épico 3, que traz autenticação. NÃO é lacuna esquecida: é dívida datada.
--
-- Origem: spec 003 FR-025.8 · research §R-1 · decisão de Bernardo, 08/09/2026
-- =================================================================================

alter table public.registros_aula
  alter column unidade_ensino_id drop not null;

alter table public.registros_aula
  add constraint reg_aula_ue_so_nula_no_historico check (
    unidade_ensino_id is not null
    or (origem_migracao_v1 is not null and editado_em is null)
  );

comment on constraint reg_aula_ue_so_nula_no_historico on public.registros_aula is
  'A Unidade de Ensino so pode ser nula em linha MIGRADA e NUNCA EDITADA. '
  'Dado novo continua obrigado a declara-la — a decisao UE-1 de 26/08/2026 segue valendo '
  'onde importa. Editar uma linha historica passa a exigir a UE: e uma catraca. '
  'Residual conhecido: um INSERT novo com origem_migracao_v1 preenchido escapa; '
  'fecha-lo exige gatilho de sessao, Epico 3 (ver CHK023).';

comment on column public.registros_aula.unidade_ensino_id is
  'Unidade de Ensino do registro. Anulavel APENAS no historico migrado nao editado '
  '(constraint reg_aula_ue_so_nula_no_historico). Os 17 cursos sem planilha da v1.0 '
  'chegam com nulo, por decisao de Bernardo de 07/09/2026 — nao se inventa UE sintetica.';

-- =================================================================================
-- PLANO DE REVERSÃO
--
--   alter table public.registros_aula drop constraint if exists reg_aula_ue_so_nula_no_historico;
--   -- ⚠️ o `set not null` abaixo SÓ funciona se nenhuma linha tiver UE nula.
--   -- Depois da primeira carga real, ele FALHA — e falhar é o correto: significa que
--   -- há histórico dependendo da anulabilidade. Nesse ponto a reversão desta migration
--   -- deixa de ser possível sem decidir o que fazer com o histórico, e a decisão é do
--   -- Bernardo, não do script.
--   alter table public.registros_aula alter column unidade_ensino_id set not null;
-- =================================================================================
