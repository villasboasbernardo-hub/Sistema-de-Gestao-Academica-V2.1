-- =================================================================================
-- 103 — A matriz de permissões desta fatia (Épico 5, fatia (a), migration 5)
--
-- O QUÊ  : a linha `horarios` INTEIRA do documento 01 §2.5, `turmas.criar` do Operador e
--          `cursos.desativar` para os três — cada célula conferida contra o documento que a
--          autoriza. FR-024, FR-024.1, FR-025, FR-017, invariante I-6.
--
-- ⚠️ ESTE ARQUIVO PROVA A MATRIZ, NÃO A AUTORIZAÇÃO. Ele é pgTAP, roda como **dono do schema**,
--    e sob privilégio de dono **a RLS não se aplica**: uma asserção de "este perfil pode / não
--    pode" escrita aqui passaria com a RLS desligada. O que se prova aqui é **estrutura** — quais
--    linhas a matriz tem, e o que as policies leem. **Quem pode o quê se prova em
--    `tests/invariantes/rls/cursos-e-turmas.test.ts`, com sessão autenticada de verdade**
--    (registrado no `CLAUDE.md`, *Definition of Done* item 4, em 17/09/2026).
--
-- ⚠️ A ORIGEM DE CADA CÉLULA É O DOCUMENTO 01 §2.5, e está citada na migration linha a linha.
--    Permissão sem respaldo ali **não é criada com justificativa própria**: ampliar matriz de
--    responsabilidade é decisão de Bernardo, registrada e datada (exigência de 17/09/2026).
--
-- ⚠️ E NÃO EXISTE AÇÃO `reativar`. Reativar é o mesmo `desativar` na direção inversa, e o
--    `FR-017.8` diz isso: quem desativa reativa. Uma ação nova na matriz seria vocabulário novo
--    para uma permissão que já existe.
-- =================================================================================

begin;
select plan(12);

-- =========================================================== `horarios` — a linha inteira do doc 01
-- | `horarios` | Regime de horário e vigência | LCED | L | LCED | LCED | L | L | LCE | L¹ | L |
select results_eq(
  $$select perfil::text from public.perfil_permissao
     where recurso = 'horarios' and acao = 'ler' and permitido order by perfil::text$$,
  $$values ('admin'), ('ajudante_administracao_academica'), ('ajudante_orientacao_pedagogica'),
           ('chefe_departamento_ensino'), ('encarregado_administracao_academica'),
           ('encarregado_curso'), ('encarregado_orientacao_pedagogica'), ('operador'),
           ('visualizacao')$$,
  'FR-024 · doc 01 §2.5: `horarios.ler` para os NOVE perfis — a coluna L aparece em todas'
);

select results_eq(
  $$select perfil::text from public.perfil_permissao
     where recurso = 'horarios' and acao = 'criar' and permitido order by perfil::text$$,
  $$values ('admin'), ('ajudante_administracao_academica'),
           ('encarregado_administracao_academica'), ('operador')$$,
  'FR-024 · doc 01 §2.5: `horarios.criar` para os QUATRO — ADM, E11, A11 (LCED) e OPE (LCE)'
);

select results_eq(
  $$select perfil::text from public.perfil_permissao
     where recurso = 'horarios' and acao = 'editar' and permitido order by perfil::text$$,
  $$values ('admin'), ('ajudante_administracao_academica'),
           ('encarregado_administracao_academica'), ('operador')$$,
  'FR-024 · doc 01 §2.5: `horarios.editar` para os mesmos QUATRO'
);

-- ⚠️ O Operador tem `LCE`, NÃO `LCED`: ele configura regime, e não o desativa. A diferença é uma
-- letra no documento, e é ela que separa 4 de 3.
select results_eq(
  $$select perfil::text from public.perfil_permissao
     where recurso = 'horarios' and acao = 'desativar' and permitido order by perfil::text$$,
  $$values ('admin'), ('ajudante_administracao_academica'),
           ('encarregado_administracao_academica')$$,
  'FR-024 · doc 01 §2.5: `horarios.desativar` para os TRES — o Operador tem LCE, sem o D'
);

-- =========================================================== `turmas.criar` — a emenda do doc 01
-- A célula `OPE` da linha `turmas` foi emendada em 17/09/2026, de `L` para `LCE` (FR-028.3).
select results_eq(
  $$select perfil::text from public.perfil_permissao
     where recurso = 'turmas' and acao = 'criar' and permitido order by perfil::text$$,
  $$values ('admin'), ('ajudante_administracao_academica'),
           ('encarregado_administracao_academica'), ('operador')$$,
  'FR-025 · doc 01 §2.5 emendado: `turmas.criar` passa a incluir o Operador — quatro perfis'
);

select results_eq(
  $$select perfil::text from public.perfil_permissao
     where recurso = 'turmas' and acao = 'editar' and permitido order by perfil::text$$,
  $$values ('admin'), ('ajudante_administracao_academica'),
           ('encarregado_administracao_academica'), ('operador')$$,
  'FR-025 · e `turmas.editar` continua com os mesmos quatro, como ja estava'
);

-- =========================================================== `cursos.desativar` — os tres
select results_eq(
  $$select perfil::text from public.perfil_permissao
     where recurso = 'cursos' and acao = 'desativar' and permitido order by perfil::text$$,
  $$values ('admin'), ('ajudante_administracao_academica'),
           ('encarregado_administracao_academica')$$,
  'FR-017 · doc 01 §2.5: `cursos.desativar` so para Admin, Encarregado e Ajudante da Divisao'
);

-- ⚠️ O NEGATIVO DE CATALOGO: ninguem fora dos nomeados tem as permissoes novas. Ele nao substitui
-- o negativo de comportamento — que mora na suite de RLS —, mas pega a linha a mais no seed, que o
-- negativo de comportamento nao pega quando o perfil testado nao e o que sobrou.
select is_empty(
  $$select perfil::text || ' · ' || recurso || '.' || acao
      from public.perfil_permissao
     where permitido
       and (   (recurso = 'horarios' and acao = 'desativar'
                and perfil::text not in ('admin', 'encarregado_administracao_academica',
                                         'ajudante_administracao_academica'))
            or (recurso = 'horarios' and acao in ('criar', 'editar')
                and perfil::text not in ('admin', 'encarregado_administracao_academica',
                                         'ajudante_administracao_academica', 'operador'))
            or (recurso = 'turmas' and acao = 'criar'
                and perfil::text not in ('admin', 'encarregado_administracao_academica',
                                         'ajudante_administracao_academica', 'operador'))
            or (recurso = 'cursos' and acao = 'desativar'
                and perfil::text not in ('admin', 'encarregado_administracao_academica',
                                         'ajudante_administracao_academica')))$$,
  'I-6 · nenhum perfil fora dos nomeados no doc 01 recebeu as permissoes desta fatia'
);

-- =========================================================== zero acoes `reativar`
select is_empty(
  $$select distinct acao from public.perfil_permissao where acao = 'reativar'$$,
  'FR-017.8 · ZERO acoes `reativar` na matriz — quem desativa reativa, com a MESMA permissao'
);

-- =========================================================== as policies, lendo `horarios`
select results_eq(
  $$select polname from pg_policy
     where polrelid = 'public.curso_regime_historico'::regclass
       and coalesce(pg_get_expr(polqual, polrelid), '') || coalesce(pg_get_expr(polwithcheck, polrelid), '')
           like '%horarios%'
     order by polname$$,
  $$values ('curso_regime_historico_criar'::name), ('curso_regime_historico_editar'::name)$$,
  'FR-024.1 · as DUAS policies de escrita da vigencia passam a ler `horarios`, nao `cursos.editar`'
);

-- ⚠️ E A LEITURA NAO MUDA: ela continua em `cursos.ler`. Quem enxerga o curso enxerga o regime
-- dele — mover a leitura para `horarios.ler` esconderia o regime de quem le o curso, que nao e a
-- decisao tomada (FR-024.1).
select ok(
  (select coalesce(pg_get_expr(polqual, polrelid), '') like '%cursos%'
     from pg_policy where polrelid = 'public.curso_regime_historico'::regclass
      and polname = 'curso_regime_historico_ler'),
  'FR-024.1 · a LEITURA da vigencia continua em `cursos.ler` — nao foi movida para `horarios.ler`'
);

-- ⚠️ E O ALCANCE CONTINUA NA POLICY. Trocar o recurso sem manter `app.alcanca_curso()` daria ao
-- Operador de um escopo a escrita de vigencia de QUALQUER curso — o vazamento que esta fatia
-- existe em parte para impedir.
select is(
  (select count(*)::int from pg_policy
    where polrelid = 'public.curso_regime_historico'::regclass
      and polname in ('curso_regime_historico_criar', 'curso_regime_historico_editar')
      and coalesce(pg_get_expr(polqual, polrelid), '') || coalesce(pg_get_expr(polwithcheck, polrelid), '')
          like '%alcanca_curso%'),
  2,
  'FR-024.1 · e as duas mantem `app.alcanca_curso()` — recurso novo, alcance igual'
);

select * from finish();
rollback;
