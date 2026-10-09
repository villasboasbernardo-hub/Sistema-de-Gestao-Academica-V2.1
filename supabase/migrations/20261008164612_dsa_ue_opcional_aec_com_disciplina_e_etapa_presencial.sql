-- =====================================================================================
-- 20261008164612_dsa_ue_opcional_aec_com_disciplina_e_etapa_presencial.sql
-- Epico 6 · spec 013 · correcoes do DSA de 08/10/2026 — A UNICA MIGRATION DO COMANDO
-- Data local: 08/10/2026  (o carimbo do nome e UTC, gerado pela CLI; a diferenca e fuso)
-- -------------------------------------------------------------------------------------
-- TRES PEDACOS, cada um com a sua autorizacao nominal de Bernardo Villas Boas, 08/10/2026:
--
--   D-DSA-1 · aula SEM unidade de ensino passa a ser aceita em QUALQUER disciplina, desde que
--             tenha `disciplina_id` e topico. A isencao nominal da Q-1 (`app.disciplina_sem_ue`)
--             vira regra geral. NADA alem disso e afrouxado: o topico continua obrigatorio, o
--             XOR UE/disciplina continua, e as duas clausulas de historico (migrada e nunca
--             editada; migrada e inativa) ficam exatamente como estao.
--   AEC     · a AEC ganha disciplina OPCIONAL (item 1b do comando; autorizacao na pergunta feita
--             durante a execucao, porque `atividades_nao_letivas` nao tinha coluna de disciplina).
--             So AEC, so de turma, e so disciplina do curso da turma — com porteiro no banco.
--   D-DSA-2 · a turma semipresencial ganha a janela da etapa presencial: duas colunas nulaveis e
--             um CHECK de coerencia (termino >= inicio, dentro da janela da turma).
--
-- ⚠️ A DISCIPLINA DA AEC NAO ENTRA EM `vw_ocupacao_ta`, de proposito. A coluna `disciplina_id` da
--    view e lida pelo teto recomendado POR DISCIPLINA (`vereditoDosTetos`) e pela CH lancada por
--    disciplina do painel do DSA — e AEC NAO e CHD (`CHT = CHD + AEC + TAD + TR`). Expor a
--    disciplina da AEC ali faria a AEC contar no teto e na carga da disciplina. A tela a le da
--    propria tabela, so para exibir.
--
-- -------------------------------------------------------------------------------------
-- PLANO DE REVERSAO (DoD 6) — escrito ANTES do `up`
--
--   ⚠️ MEDIR ANTES DE REVERTER. As duas restricoes da D-DSA-1 voltam a exigir a isencao, e o
--      `add constraint` VALIDA as linhas existentes: se alguem gravou aula sem UE em disciplina nao
--      isenta depois desta migration, a reversao FALHA (e deve falhar — nao se apaga lancamento).
--        select count(*) from public.registros_aula r
--         where r.unidade_ensino_id is null and r.disciplina_id is not null
--           and not coalesce(app.disciplina_sem_ue(r.disciplina_id), false);
--      E as colunas novas guardam DADO: `drop column` apaga a disciplina das AEC e a janela das
--      turmas. Medir antes:
--        select count(*) from public.atividades_nao_letivas where disciplina_id is not null;
--        select count(*) from public.turmas where inicio_etapa_presencial is not null;
--
--   begin;
--   -- D-DSA-2
--   alter table public.turmas drop constraint turmas_etapa_presencial_coerente;
--   alter table public.turmas drop column termino_etapa_presencial, drop column inicio_etapa_presencial;
--   -- AEC
--   alter table public.atividades_nao_letivas drop constraint ativ_disciplina_so_aec_da_turma;
--   drop index if exists public.idx_atividades_nao_letivas_disciplina;
--   alter table public.atividades_nao_letivas drop column disciplina_id;
--   drop function if exists app.disciplina_e_da_turma(uuid, uuid);
--   -- D-DSA-1: as duas restricoes voltam a forma de 20261006184558, com a isencao
--   alter table public.registros_aula drop constraint reg_aula_ue_so_nula_no_historico;
--   alter table public.registros_aula add constraint reg_aula_ue_so_nula_no_historico check (
--        unidade_ensino_id is not null
--     or (origem_migracao_v1 is not null and editado_em is null)
--     or (disciplina_id is not null and coalesce(app.disciplina_sem_ue(disciplina_id), false))
--     or (origem_migracao_v1 is not null and status = 'inativo'::status_registro));
--   alter table public.registros_aula drop constraint reg_aula_ue_ou_disciplina;
--   alter table public.registros_aula add constraint reg_aula_ue_ou_disciplina check (
--        unidade_ensino_id is not null
--     or (disciplina_id is not null and coalesce(app.disciplina_sem_ue(disciplina_id), false)
--         and length(btrim(coalesce(conteudo_resumo, ''))) > 0)
--     or (origem_migracao_v1 is not null and editado_em is null)
--     or (origem_migracao_v1 is not null and status = 'inativo'::status_registro));
--   -- ⚠️ e os TRES `comment on` voltam ao texto de 20261006184558 / 20261005181116 (o `drop
--   --    constraint` descarta o comentario em silencio — ver `git show` daqueles arquivos)
--   commit;
-- =====================================================================================


-- =====================================================================================
-- 1 · D-DSA-1 — a isencao vira regra geral: aula sem UE com disciplina e topico
-- =====================================================================================
alter table public.registros_aula drop constraint reg_aula_ue_so_nula_no_historico;
alter table public.registros_aula add constraint reg_aula_ue_so_nula_no_historico check (
     unidade_ensino_id is not null
  or (origem_migracao_v1 is not null and editado_em is null)                      -- a catraca de sempre
  or disciplina_id is not null                                                    -- D-DSA-1 (era: so isenta)
  or (origem_migracao_v1 is not null and status = 'inativo'::status_registro)     -- VIRADA-1, 06/10
);

alter table public.registros_aula drop constraint reg_aula_ue_ou_disciplina;
alter table public.registros_aula add constraint reg_aula_ue_ou_disciplina check (
     unidade_ensino_id is not null
  or (disciplina_id is not null
      and length(btrim(coalesce(conteudo_resumo, ''))) > 0)                       -- D-DSA-1: o topico continua
  or (origem_migracao_v1 is not null and editado_em is null)
  or (origem_migracao_v1 is not null and status = 'inativo'::status_registro)
);

-- ⚠️ `drop constraint` + `add constraint` DESCARTA o `COMMENT ON CONSTRAINT` em silencio (a prova de
--    reversao da T046 cobrou isto em 05/10/2026). Os dois sao repostos, com a historia inteira.
comment on constraint reg_aula_ue_so_nula_no_historico on public.registros_aula is
  'A Unidade de Ensino so pode ser nula em linha MIGRADA e NUNCA EDITADA, ou quando a aula aponta a '
  'disciplina (`disciplina_id`). Editar uma linha historica sem UE e sem disciplina passa a exigir uma '
  'das duas: e uma catraca (decisao UE-1, 26/08/2026). Residual conhecido: um INSERT novo com '
  'origem_migracao_v1 preenchido escapa; fecha-lo exige gatilho de sessao, Epico 3 (ver CHK023). '
  'Historico das emendas: 05/10/2026 (Q-1 da spec 013) isentou curso por competencias e disciplina '
  '`sem_unidades_ensino`. EMENDA DE 06/10/2026 (VIRADA-1, decisao de Bernardo Villas Boas): a linha '
  'migrada INATIVA fica dispensada — reativa-la devolve a exigencia, e o `117` tem os dois casos. '
  'EMENDA DE 08/10/2026 (D-DSA-1, decisao de Bernardo Villas Boas): a isencao virou REGRA GERAL — '
  'qualquer disciplina, sempre com `disciplina_id` e topico em `conteudo_resumo` '
  '(`reg_aula_ue_ou_disciplina`). Sem UE, a CH da aula nao entra no controle por UE.';

comment on constraint reg_aula_ue_ou_disciplina on public.registros_aula is
  'A aula aponta UE; ou aponta a disciplina e traz o topico em `conteudo_resumo`; ou e linha migrada '
  'nunca editada. EMENDA DE 06/10/2026 (VIRADA-1): a linha migrada INATIVA tambem fica dispensada; '
  'reativa-la devolve a exigencia. EMENDA DE 08/10/2026 (D-DSA-1, decisao de Bernardo Villas Boas): o '
  'caminho da disciplina, que valia so para disciplina isenta (`app.disciplina_sem_ue`), passou a valer '
  'para QUALQUER disciplina — e o topico continua obrigatorio.';

comment on function app.disciplina_sem_ue(uuid) is
  'A disciplina esta isenta de unidade de ensino? Verdadeiro quando o curso e por competencias '
  '(C-Espc-HN e C-Espc-FR) ou quando a disciplina esta marcada `sem_unidades_ensino`. ⚠️ DESDE A '
  'D-DSA-1 (08/10/2026) ELA NAO DECIDE MAIS CHECK NENHUM: aula sem UE e aceita em qualquer disciplina '
  'com topico. Ela fica como FATO consultavel e e a funcao que a reversao da D-DSA-1 usa. ⚠️ '
  'SECURITY DEFINER de proposito (foi chamada de CHECK), e devolve NULL para disciplina inexistente — '
  'todo chamador a envolve em `coalesce(..., false)`.';


-- =====================================================================================
-- 2 · AEC com disciplina OPCIONAL — so AEC, so de turma, so disciplina do curso da turma
-- =====================================================================================
alter table public.atividades_nao_letivas
  add column disciplina_id uuid references public.disciplinas (id) on delete restrict;

comment on column public.atividades_nao_letivas.disciplina_id is
  'A disciplina a que a AEC se refere, quando ha (item 1b do comando de correcoes do DSA, '
  'autorizacao de Bernardo Villas Boas em 08/10/2026). OPCIONAL, e so para AEC de turma, de '
  'disciplina do curso da turma — o CHECK `ativ_disciplina_so_aec_da_turma` impoe as tres. '
  '⚠️ NAO entra em `vw_ocupacao_ta`: AEC nao e CHD, e a disciplina da view alimenta o teto e a CH '
  'lancada por disciplina.';

create index if not exists idx_atividades_nao_letivas_disciplina
  on public.atividades_nao_letivas (disciplina_id)
  where disciplina_id is not null;

-- O PORTEIRO: a disciplina e do curso da turma?
-- ⚠️ `SECURITY DEFINER` pela mesma razao de `app.disciplina_sem_ue` (20261005181116): ela e chamada
--    de CHECK, e um CHECK que lesse `disciplinas` e `turmas` sob a RLS de quem grava passaria a
--    depender de PERMISSAO — a mesma linha valida para um perfil e invalida para outro, com `23514`
--    no lugar de erro de alcance. CHECK e fato sobre a linha, igual para todo mundo e para o ETL.
-- ⚠️ E, pelo gotcha 5.1, quem grava precisa de `EXECUTE`: a expressao do CHECK e avaliada com os
--    direitos de quem insere, mesmo sendo a funcao `DEFINER`.
create or replace function app.disciplina_e_da_turma(p_disciplina_id uuid, p_turma_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
      from public.disciplinas d
      join public.turmas t on t.curso_id = d.curso_id
     where d.id = p_disciplina_id
       and t.id = p_turma_id
  )
$$;

comment on function app.disciplina_e_da_turma(uuid, uuid) is
  'A disciplina pertence ao curso da turma? Porteiro do CHECK `ativ_disciplina_so_aec_da_turma` '
  '(AEC com disciplina, 08/10/2026). `exists` nunca devolve NULL, e o chamador ainda a envolve em '
  '`coalesce(..., false)` — CHECK passa em NULL (gotcha 15).';

revoke all on function app.disciplina_e_da_turma(uuid, uuid) from public, anon;
grant execute on function app.disciplina_e_da_turma(uuid, uuid) to authenticated, service_role;

alter table public.atividades_nao_letivas add constraint ativ_disciplina_so_aec_da_turma check (
     disciplina_id is null
  or (categoria_normativa = 'AEC'
      and turma_id is not null
      and coalesce(app.disciplina_e_da_turma(disciplina_id, turma_id), false))
);

comment on constraint ativ_disciplina_so_aec_da_turma on public.atividades_nao_letivas is
  'Disciplina so em AEC, so em atividade de TURMA (a global vale para todas e nao pertence a curso '
  'nenhum), e so disciplina do curso da turma. Sem disciplina, qualquer atividade continua aceita.';


-- =====================================================================================
-- 3 · D-DSA-2 — a janela da etapa presencial da turma semipresencial
-- -------------------------------------------------------------------------------------
-- ⚠️ AS DUAS OU NENHUMA. Uma janela pela metade nao diz qual semana tem DSA, e a tela teria de
--    inventar a outra ponta — a ausencia das duas e o estado legitimo "sem janela cadastrada", que
--    a tela avisa sem bloquear (RN-DEG-01).
-- ⚠️ DENTRO DA JANELA DA TURMA, quando ela existe. A janela da turma e opcional (`FR-027`): sem ela
--    nao ha contra o que conferir, e a coerencia que sobra e termino >= inicio.
-- ⚠️ SEM AMARRA A MODALIDADE NO BANCO, de proposito: trocar a modalidade de uma turma nao pode
--    falhar por causa de duas datas. Quem decide que a janela so vale para semipresencial e a regra
--    de `lib/dominio/dsa/etapa-presencial.ts`, e o formulario so as oferece nessa modalidade.
-- =====================================================================================
alter table public.turmas
  add column inicio_etapa_presencial date,
  add column termino_etapa_presencial date;

comment on column public.turmas.inicio_etapa_presencial is
  'Inicio da etapa PRESENCIAL da turma semipresencial (D-DSA-2, decisao de Bernardo Villas Boas, '
  '08/10/2026). Semana fora da janela nao tem DSA: a tela diz "Etapa a distancia — sem DSA nesta '
  'semana" e nao deixa lancar. Nula nas duas pontas = janela nao cadastrada (a tela avisa).';
comment on column public.turmas.termino_etapa_presencial is
  'Termino da etapa PRESENCIAL da turma semipresencial (D-DSA-2). Ver `inicio_etapa_presencial` e o '
  'CHECK `turmas_etapa_presencial_coerente`.';

alter table public.turmas add constraint turmas_etapa_presencial_coerente check (
     (inicio_etapa_presencial is null and termino_etapa_presencial is null)
  or (inicio_etapa_presencial is not null
      and termino_etapa_presencial is not null
      and termino_etapa_presencial >= inicio_etapa_presencial
      and (data_inicio is null or inicio_etapa_presencial >= data_inicio)
      and (data_termino is null or termino_etapa_presencial <= data_termino))
);

comment on constraint turmas_etapa_presencial_coerente on public.turmas is
  'A etapa presencial vem inteira (as duas datas ou nenhuma), com termino >= inicio e dentro da '
  'janela da turma quando ela existe (D-DSA-2, 08/10/2026).';
