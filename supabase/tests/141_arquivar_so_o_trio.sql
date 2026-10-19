-- =================================================================================
-- 141 — Spec 017, Bloco 2 · M5 (`20261019175355_arquivar_so_o_trio`): arquivam e desarquivam o Admin, o Encarregado
-- e o Ajudante da Administração Acadêmica — e só eles (decisão de Bernardo Villas Boas, 19/10/2026).
--
-- O que se prova aqui é ESTRUTURA: a matriz com o recurso para os nove perfis, `true` só para o trio, e a policy
-- lendo esse recurso para as duas ações. ⚠️ Quem pode o quê se prova com sessão real, em
-- `tests/invariantes/rls/bloco-2.test.ts` (DoD 4): o pgTAP roda como dono, e a RLS não se aplica a ele.
-- =================================================================================
begin;
select plan(5);

select results_eq(
  $$select perfil::text collate "default" from public.perfil_permissao
     where recurso = 'arquivamento_de_turma' and acao = 'editar' and permitido order by 1$$,
  $$values ('admin'), ('ajudante_administracao_academica'), ('encarregado_administracao_academica')$$,
  'decisão de 19/10/2026 · arquivamento_de_turma/editar: o trio, e só ele'
);

select is(
  (select count(*)::int from public.perfil_permissao
    where recurso = 'arquivamento_de_turma' and acao = 'editar'),
  (select count(*)::int from unnest(enum_range(null::public.perfil_usuario))),
  'todo perfil tem linha do recurso (a recusa é declarada, não ausência)'
);

select ok(
  (select pg_get_expr(p.polwithcheck, p.polrelid) from pg_policy p
    where p.polname = 'turma_arquivamentos_criar' and p.polrelid = 'public.turma_arquivamentos'::regclass)
    like '%arquivamento_de_turma%',
  'a policy de gravar no arquivamento lê o recurso novo'
);

select ok(
  (select pg_get_expr(p.polwithcheck, p.polrelid) from pg_policy p
    where p.polname = 'turma_arquivamentos_criar' and p.polrelid = 'public.turma_arquivamentos'::regclass)
    not like '%eh_admin%'
  and (select pg_get_expr(p.polwithcheck, p.polrelid) from pg_policy p
    where p.polname = 'turma_arquivamentos_criar' and p.polrelid = 'public.turma_arquivamentos'::regclass)
    not like '%''turmas''%',
  '⚠️ e não lê mais `turmas.editar` (o Operador arquivava) nem `eh_admin` (só o Admin desarquivava)'
);

select ok(
  (select pg_get_expr(p.polwithcheck, p.polrelid) from pg_policy p
    where p.polname = 'turma_arquivamentos_criar' and p.polrelid = 'public.turma_arquivamentos'::regclass)
    like '%alcanca_turma%',
  'o alcance da turma continua na policy'
);

select * from finish();
rollback;
