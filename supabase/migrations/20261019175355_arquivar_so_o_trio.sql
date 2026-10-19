-- =================================================================================
-- Spec 017 · Bloco 2 · M5 — ARQUIVAR E DESARQUIVAR TURMA: o Admin, o Encarregado e o Ajudante da Administração
-- Acadêmica, e SÓ eles.
-- Data local: 19/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- Decisão de Bernardo Villas Boas, 19/10/2026, na conferência do PR #73 (muda a C-3 e a C-4 da spec 017):
--   *"ARQUIVAR E DESARQUIVAR: Admin, Encarregado da Administração Acadêmica e Ajudante — e SÓ eles (o Operador deixa
--   de arquivar). (…) A mudança da matriz de permissões está AUTORIZADA nominalmente por Bernardo (19/10/2026, regra
--   9.4): mesmo rito do remoto, e prova por perfil com sessão real."*
--
-- ⚠️ ALTERA o que existe (policy e matriz), e por isso é PORTÃO da regra 9.4 — aberto pela autorização nominal acima.
--
-- O que faz:
--   1. Recurso novo na matriz, `arquivamento_de_turma`/`editar`: `true` só para o trio, `false` para os outros seis
--      perfis (todos com linha, como o `ta_fora_do_dsa` da M1 — a ausência de linha não é recusa declarada).
--   2. `turma_arquivamentos_criar` passa a ler esse recurso para as DUAS ações, com o alcance da turma. Antes: arquivar
--      com `turmas.editar` (o Operador entrava) e desarquivar só com `app.eh_admin()`.
--      `coalesce(…, false)` (gotcha 15).
--
-- O caso que discrimina (`tests/invariantes/rls/bloco-2.test.ts`, com sessão real): o OPERADOR, que tem `turmas.editar`,
--   passa de arquivar a ser recusado com `42501`; o ENCARREGADO e o AJUDANTE passam de recusados a desarquivar.
-- Efeito no remoto: medido 0 turmas arquivadas em 19/10/2026 (`vw_turmas_arquivadas`, depois de M1–M3): nenhum estado
--   muda; muda quem pode gravar o próximo evento.
--
-- Reversão (sem `delete`, C-28): `update public.perfil_permissao set permitido = false where recurso =
--   'arquivamento_de_turma'`; e `alter policy turma_arquivamentos_criar` de volta ao `with check` de `20261019114234`.
--   O roteiro executável é `specs/017-bloco-2-turmas-e-dsa/reversao.sql`.
-- =================================================================================

-- ---------------------------------------------------------------- 1. o recurso na matriz
insert into public.perfil_permissao (perfil, recurso, acao, permitido, observacao)
select p, 'arquivamento_de_turma', 'editar',
       p in ('admin', 'encarregado_administracao_academica', 'ajudante_administracao_academica'),
       'Bloco 2 (spec 017), decisão de 19/10/2026: arquiva e desarquiva turma. Admin, Encarregado e Ajudante da '
       'Administração Acadêmica — e só eles.'
  from unnest(enum_range(null::public.perfil_usuario)) as p
on conflict (perfil, recurso, acao) do update set permitido = excluded.permitido, observacao = excluded.observacao;

-- ---------------------------------------------------------------- 2. a policy lê o recurso, para as duas ações
alter policy turma_arquivamentos_criar on public.turma_arquivamentos
  with check (
    acao in ('arquivar', 'desarquivar')
    and coalesce(app.pode('arquivamento_de_turma', 'editar'), false)
    and app.alcanca_turma(turma_id)
  );

comment on policy turma_arquivamentos_criar on public.turma_arquivamentos is
  'Bloco 2 (spec 017), decisão de 19/10/2026: arquivam e desarquivam o Admin, o Encarregado e o Ajudante da '
  'Administração Acadêmica (recurso arquivamento_de_turma/editar), no alcance da turma.';
