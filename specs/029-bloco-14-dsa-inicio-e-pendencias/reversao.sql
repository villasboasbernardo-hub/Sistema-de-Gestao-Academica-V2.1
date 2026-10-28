-- =================================================================================
-- Reversão da spec 029 (Bloco 14, item 2): a migration `20261028182926_estudo_individual_sem_descricao`.
--
-- ⚠️ ESTA REVERSÃO MEXE EM DADO, e é por isso que está escrita assim: a migration só acrescentou (tirou o NOT NULL e
--    pôs um CHECK), mas depois de existir Estudo Individual lançado SEM «O que é», o NOT NULL de volta não valida sem
--    preencher as nulas. O `update` abaixo grava «ESTUDO INDIVIDUAL» — o mesmo texto do EI da semana em um clique
--    (`camposDoEstudoIndividual`, lib/dominio/dsa/rotulos.ts) — e com isso apaga a diferença entre o EI sem descrição e
--    o descrito assim (a razão da D-5). Antes de qualquer EI sem descrição, o `update` não toca linha nenhuma.
-- ⚠️ Só o CHECK permite nulo SÓ no EI; o `update` filtra pela categoria por segurança, e as demais categorias não têm
--    linha nula (o CHECK as recusa). No remoto, rodar isto é escrita: decisão de Bernardo, nunca automática.
-- =================================================================================
begin;

alter table public.atividades_nao_letivas
  drop constraint ativ_descricao_fora_do_estudo_individual;

update public.atividades_nao_letivas
   set descricao = 'ESTUDO INDIVIDUAL'
 where descricao is null
   and categoria_normativa = 'Estudo_Individual';

alter table public.atividades_nao_letivas
  alter column descricao set not null;

comment on column public.atividades_nao_letivas.descricao is null;

delete from supabase_migrations.schema_migrations where version = '20261028182926';

commit;
