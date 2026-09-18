-- =================================================================================
-- Migration 5 de 7 — Epico 5, fatia (a): as permissoes, uma a uma, com a linha que as autoriza
-- (carimbo do arquivo em UTC; o relogio da maquina marcava 17/09/2026)
--
-- O QUE  : 24 linhas novas em `perfil_permissao` e as duas policies de escrita de
--          `curso_regime_historico` passando a ler `horarios` em vez de `cursos.editar`.
--
-- ORIGEM : FR-024, FR-024.1, FR-025, FR-017, FR-028.3, FR-046 · spec `009-cursos-e-turmas`.
--
-- ⚠️ ORIGEM DOCUMENTAL LINHA A LINHA (exigencia de Bernardo Villas Boas, 17/09/2026). Permissao e
--    o lugar onde erro NAO FALHA, VAZA: uma celula concedida por engano nao quebra nada, e ninguem
--    descobre. Por isso cada linha abaixo cita a celula do **documento 01 §2.5** que a autoriza, e
--    NENHUMA e criada com justificativa propria. Ampliar matriz de responsabilidade e decisao de
--    Bernardo, registrada e datada.
--
--    A linha do documento 01 §2.5, transcrita:
--
--    | Recurso    | ADM  | CHE | E11  | A11  | E12 | A12 | OPE | ENC | VIS |
--    |------------|------|-----|------|------|-----|-----|-----|-----|-----|
--    | `cursos`   | LCED | L   | LCED | LCED | L   | L   | L   | L¹  | L   |
--    | `turmas`   | LCED | L   | LCED | LCED | L   | L   | LCE | L¹  | L   |  <- OPE emendado em 17/09
--    | `horarios` | LCED | L   | LCED | LCED | L   | L   | LCE | L¹  | L   |
--
--    L = ler · C = criar · E = editar · D = desativar. `horarios` cobre, no proprio documento,
--    `horarios_tempos_aula` e `curso_regime_historico`.
--
-- ⚠️ DUAS COISAS QUE O DOCUMENTO AUTORIZA E ESTA MIGRATION NAO CRIA — relatadas, nao feitas:
--    1. `turmas.desativar` para ADM/E11/A11 (o `D` da linha `turmas`). A matriz nao tem essa linha
--       hoje, e esta fatia NAO precisa dela: turma nao tem exclusao logica, tem CICLO DE VIDA por
--       `status_turma` (planejada, ativa, concluida, cancelada — TURMA-1, 28/08/2026). Criar a
--       permissao sem consumidor seria conceder alcance que nada usa.
--    2. As policies de escrita de `horarios_tempos_aula` e `configuracoes_horario` continuam lendo
--       `parametros`, e nao `horarios`. Move-las mudaria QUEM edita a grade de tempos de aula, que
--       e efeito de permissao fora do escopo desta fatia e sem tarefa que o cubra.
--
-- ⚠️ E DUAS PERMISSOES ENTRAM SEM LEITOR NESTA FATIA, declaradas porque o documento as declara:
--    `horarios.ler` — a leitura da vigencia continua em `cursos.ler` (FR-024.1), e a de
--    `horarios_tempos_aula` em `app.usuario_atual() is not null` — e `horarios.desativar`, cujo
--    consumidor (cancelar vigencia) e `horarios.editar`. `cursos.desativar` ganha leitor na
--    migration 6 (T056, `app.guardar_situacao_do_curso()`). Sem leitor, o negativo delas e de
--    CATALOGO (`103_permissoes.sql`), nao de comportamento: nao existe caminho para observar uma
--    recusa que nada consulta, e inventar um seria testar a nossa propria invencao.
-- =================================================================================

-- ---------------------------------------------------------------- 1. `horarios`, a linha inteira
-- Doc 01 §2.5, linha `horarios`, coluna L em TODAS as nove colunas.
insert into public.perfil_permissao (perfil, recurso, acao, permitido, observacao)
select p, 'horarios', 'ler', true,
       'Doc 01 §2.5, linha `horarios`: L em todas as nove colunas. ⚠️ SEM LEITOR nesta fatia — a '
       'leitura da vigencia continua em `cursos.ler` (FR-024.1) e a de horarios_tempos_aula em '
       '`usuario_atual() is not null`. Declarada porque o documento a declara.'
  from unnest(array[
    'admin', 'chefe_departamento_ensino', 'encarregado_administracao_academica',
    'ajudante_administracao_academica', 'encarregado_orientacao_pedagogica',
    'ajudante_orientacao_pedagogica', 'operador', 'encarregado_curso', 'visualizacao'
  ]::public.perfil_usuario[]) as p
on conflict (perfil, recurso, acao) do update set permitido = true;

-- Doc 01 §2.5: `C` em ADM, E11, A11 (LCED) e em OPE (LCE).
insert into public.perfil_permissao (perfil, recurso, acao, permitido, observacao)
select p, 'horarios', 'criar', true,
       'Doc 01 §2.5, linha `horarios`: C em ADM, E11, A11 (LCED) e OPE (LCE). Lido pela policy '
       '`curso_regime_historico_criar` a partir desta migration (FR-024.1).'
  from unnest(array[
    'admin', 'encarregado_administracao_academica', 'ajudante_administracao_academica', 'operador'
  ]::public.perfil_usuario[]) as p
on conflict (perfil, recurso, acao) do update set permitido = true;

insert into public.perfil_permissao (perfil, recurso, acao, permitido, observacao)
select p, 'horarios', 'editar', true,
       'Doc 01 §2.5, linha `horarios`: E em ADM, E11, A11 (LCED) e OPE (LCE). Lido pela policy '
       '`curso_regime_historico_editar` a partir desta migration (FR-024.1).'
  from unnest(array[
    'admin', 'encarregado_administracao_academica', 'ajudante_administracao_academica', 'operador'
  ]::public.perfil_usuario[]) as p
on conflict (perfil, recurso, acao) do update set permitido = true;

-- Doc 01 §2.5: `D` so em ADM, E11 e A11. O Operador tem `LCE` — a diferenca e uma letra no
-- documento, e e ela que separa 4 de 3: ele configura regime, e nao o desativa.
insert into public.perfil_permissao (perfil, recurso, acao, permitido, observacao)
select p, 'horarios', 'desativar', true,
       'Doc 01 §2.5, linha `horarios`: D em ADM, E11 e A11 — o Operador tem LCE, sem o D. '
       '⚠️ SEM LEITOR nesta fatia: cancelar vigencia e `horarios.editar` (FR-021.1).'
  from unnest(array[
    'admin', 'encarregado_administracao_academica', 'ajudante_administracao_academica'
  ]::public.perfil_usuario[]) as p
on conflict (perfil, recurso, acao) do update set permitido = true;

-- ---------------------------------------------------------------- 2. `turmas.criar` do Operador
-- Doc 01 §2.5, linha `turmas`, coluna OPE: EMENDADA de `L` para `LCE` em 17/09/2026 (FR-028.3), com
-- data e autoria no proprio documento. O `E` ja estava na matriz; entra o `C`.
insert into public.perfil_permissao (perfil, recurso, acao, permitido, observacao)
values ('operador', 'turmas', 'criar', true,
        'Doc 01 §2.5, linha `turmas`, coluna OPE emendada de L para LCE em 17/09/2026 (FR-028.3): '
        'o Operador abre e edita as turmas do SEU ESCOPO, inclusive o status. O recorte por escopo '
        'continua sendo `app.alcanca_curso()` na policy — a permissao e a mesma, o alcance e restrito.')
on conflict (perfil, recurso, acao) do update set permitido = true;

-- ---------------------------------------------------------------- 3. `cursos.desativar`, os tres
-- Doc 01 §2.5, linha `cursos`: `D` em ADM, E11 e A11 (LCED). Nao havia linha na matriz.
insert into public.perfil_permissao (perfil, recurso, acao, permitido, observacao)
select p, 'cursos', 'desativar', true,
       'Doc 01 §2.5, linha `cursos`: D em ADM, E11 e A11. Reativar usa a MESMA permissao — nao '
       'existe acao `reativar` na matriz (FR-017.8). ⚠️ Ganha leitor na migration 6 (T056).'
  from unnest(array[
    'admin', 'encarregado_administracao_academica', 'ajudante_administracao_academica'
  ]::public.perfil_usuario[]) as p
on conflict (perfil, recurso, acao) do update set permitido = true;

-- ---------------------------------------------------------------- 4. a vigencia passa a ler `horarios`
-- ⚠️ ISTO E O QUE TORNA A LINHA `horarios` DO DOCUMENTO VERDADEIRA. Enquanto a escrita da vigencia
--    lia `cursos.editar`, o documento dava ao Operador `LCE` em `horarios` e o banco nao dava nada:
--    ele nao edita curso. O unico perfil que tem `horarios.criar` SEM ter `cursos.editar` e o
--    Operador, e e por ele que a mudanca se observa.
--
-- ⚠️ E O ALCANCE NAO MUDA. `app.alcanca_curso(curso_id)` fica nas duas: recurso novo, alcance igual.
--    Sem ele, o Operador de um escopo escreveria vigencia de QUALQUER curso — trocar o recurso e
--    perder o alcance no mesmo movimento e o modo classico de abrir um vazamento sem perceber.
drop policy curso_regime_historico_criar on public.curso_regime_historico;
create policy curso_regime_historico_criar on public.curso_regime_historico
  for insert to authenticated
  with check (app.pode('horarios', 'criar') and app.alcanca_curso(curso_id));

drop policy curso_regime_historico_editar on public.curso_regime_historico;
create policy curso_regime_historico_editar on public.curso_regime_historico
  for update to authenticated
  using (app.pode('horarios', 'editar') and app.alcanca_curso(curso_id))
  with check (app.pode('horarios', 'editar') and app.alcanca_curso(curso_id));

-- ⚠️ A LEITURA NAO FOI TOCADA, de proposito: `curso_regime_historico_ler` continua em `cursos.ler`.
--    Quem enxerga o curso enxerga o regime dele; mover a leitura para `horarios.ler` esconderia o
--    regime de quem le o curso, e nao e a decisao tomada (FR-024.1).

-- =================================================================================
-- PLANO DE REVERSAO — ESCRITO E EXECUTADO em 17/09/2026, numa base descartavel (T040)
--
-- COMO FOI EXECUTADO: `pnpm db:reset` SEM as cinco migrations, carga do ETL (APROVADA), as cinco
-- aplicadas sobre a base carregada — e aplicaram limpo. MEDIDO ali: a matriz foi de **152 para 176
-- linhas**, as **24** desta migration, todas `permitido = true`, e a contagem por celula bate com o
-- documento 01: `horarios.ler` 9, `criar` 4, `editar` 4, `desativar` 3; `turmas.criar` 4 (o Operador
-- entrou); `cursos.desativar` 3.
--
-- CONFERIDO DEPOIS DA REVERSAO: as 20 linhas de `horarios` CONTINUAM na matriz, com `permitido =
-- false` — a regra 4 vale para a matriz, que e dado —, nenhuma policy de `curso_regime_historico`
-- le `horarios`, e os 22 arquivos pgTAP anteriores ficaram verdes; so o `103` reprova, que e o
-- esperado dele.
--
--   -- As policies voltam a ler `cursos.editar`:
--   drop policy curso_regime_historico_criar on public.curso_regime_historico;
--   create policy curso_regime_historico_criar on public.curso_regime_historico
--     for insert to authenticated
--     with check (app.pode('cursos', 'editar') and app.alcanca_curso(curso_id));
--   drop policy curso_regime_historico_editar on public.curso_regime_historico;
--   create policy curso_regime_historico_editar on public.curso_regime_historico
--     for update to authenticated
--     using (app.pode('cursos', 'editar') and app.alcanca_curso(curso_id))
--     with check (app.pode('cursos', 'editar') and app.alcanca_curso(curso_id));
--
--   -- ⚠️ AS LINHAS DA MATRIZ NAO SAO APAGADAS: passam a `permitido = false` (regra 4 do CLAUDE.md,
--   --    e a matriz e DADO). `permitido = false` e `app.pode()` devolvendo falso — o mesmo efeito
--   --    da ausencia, com o rastro de que a linha existiu:
--   update public.perfil_permissao set permitido = false
--    where (recurso = 'horarios')
--       or (recurso = 'turmas' and acao = 'criar' and perfil = 'operador')
--       or (recurso = 'cursos' and acao = 'desativar');
--
-- ⚠️ REVERTER TIRA DO OPERADOR a criacao de turma e a configuracao de regime — e o documento 01
--    emendado passa a prometer o que o banco nao entrega, que e a situacao que esta migration
--    existiu para encerrar.
-- =================================================================================
