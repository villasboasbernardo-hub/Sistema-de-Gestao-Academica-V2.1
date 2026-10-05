-- =====================================================================================
-- 20261005181116_dsa_lancamento_sem_ue_e_conflito.sql
-- Epico 6 · spec 013-detalhe-semanal-de-aula · PR B — A UNICA MIGRATION DA FEATURE
-- Data local: 05/10/2026  (o carimbo do nome e UTC, gerado pela CLI; a diferenca e fuso)
-- -------------------------------------------------------------------------------------
-- DE ONDE VEM CADA PEDACO, por decisao de Bernardo Villas Boas em 05/10/2026:
--
--   Q-1  · lancar aula POR DISCIPLINA, sem UE, nos cursos por competencias e nas seis
--          disciplinas marcadas sem UE, com topico obrigatorio.
--   Q-8  · responsavel de atividade nao letiva em texto livre.
--   Q-17 · o conflito entre turmas por funcao com porteiro, que devolve o FATO e nao o
--          dado alheio.
--   Q-10 · a sigla da tecnica de ensino vive em `config_listas` — e, pelo H1 do analyze,
--          na lista QUE JA EXISTE (`metodologias`), nao numa nova.
--   Q-4  · o sabado entra no nucleo, com os TA em `config_parametros`.
--   V-5  · o `CHECK` que a `RF-EXTRA-02` AFIRMA existir e que nao existia.
--   V-7  · a atividade de escopo global passa a chegar ao DSA, como a `RF-EXTRA-03` manda.
--   H2   · a categoria normativa de cada subtipo, em `tipos_atividade`.
--   H3   · `coalesce(..., false)` nos dois CHECK que chamam funcao.
--   E-1  · o comentario de `impacto_feriado` passa a dizer o que a `RN-EVT-02` diz.
--
-- -------------------------------------------------------------------------------------
-- ⚠️ POR QUE A Q-1 CUSTA UMA MIGRATION, e nao e so tela. Medido em 05/10/2026:
--
--   1. `registros_aula` **NAO TEM** `disciplina_id` — a varredura de
--      `information_schema.columns` devolve UMA coluna com "disciplina" no nome, e ela e
--      `disciplina_codigo_legado_v1` (`text`, legado). Hoje a disciplina de uma aula e
--      alcancada **so** por `unidade_ensino_id -> unidades_ensino.disciplina_id`. Sem UE,
--      **nao ha onde dizer de que disciplina a aula e**.
--   2. `vw_ocupacao_ta` e `vw_disciplinas_execucao` juntam a UE por juncao **INTERNA**:
--      sem a mudanca, a aula sem UE ficaria **invisivel na grade** e a CH por disciplina
--      do `C-Espc-HN` e do `C-Espc-FR` ficaria **em zero para sempre** — e sao dois dos
--      cinco cursos que mais lancam.
--   3. ⚠️ `vw_carga_horaria_turma` **NAO** passa pela UE (le `from registros_aula` direto),
--      e `vw_unidades_ensino_execucao` parte **da UE** com `left join`. **As duas NAO
--      mudam** — o andamento da turma e as seis turmas em atraso do `/inicio`, entregues
--      pelo Epico 5.5, continuam com os mesmos valores.
--
-- ⚠️ A ISENCAO DA CATRACA E NOMINAL E DELIMITADA. A regra 4 do `CLAUDE.md` e a catraca
--    `reg_aula_ue_so_nula_no_historico` nao sao afrouxadas em geral: elas ganham **uma**
--    segunda isencao, por `app.disciplina_sem_ue()`, que vale **so** para curso
--    `curriculo_modelo = 'competencias'` **ou** disciplina `sem_unidades_ensino`. Medido:
--    sao **2 de 24** cursos e **6 de 175** disciplinas. Nenhuma outra isencao entra.
--
-- ⚠️ A SEMENTE VAI SEM `origem_migracao_v1`, E ISSO E MEDIDO, NAO DESCUIDO. Duas razoes
--    que apontam para o mesmo lado:
--      · `carregar.dados_ja_carregados()` conta linhas **com** procedencia em toda tabela
--        de `ordem.ORDEM_DE_CARGA`, e `config_listas` e **a primeira** delas. Marcar
--        procedencia faria o porteiro da AMBIENTE-2 recusar `--primeira-carga` contra um
--        destino que so tem semente de migration.
--      · `reconciliar.SEMEADAS_PELO_SCHEMA` isenta `config_listas` e `config_parametros`
--        da R-05 exatamente por isso. Medido na base recriada: `escala_antiguidade` (14) e
--        `salas` (9) ja vivem ali com procedencia **e** auditoria nulas.
--
-- ⚠️ A SEMENTE E `INSERT ... ON CONFLICT DO UPDATE`, E A ORDEM E O MOTIVO. Esta migration
--    roda **antes** do ETL numa base recriada e **depois** dele no remoto. Um `UPDATE`
--    puro nao encontraria nada no primeiro caso, e um `INSERT` puro colidiria no segundo.
--    A forma combinada funciona nos dois sentidos e e idempotente — rodar duas vezes nao
--    muda contagem. ⚠️ E ela **nao** colide com o ETL: `promover.py:627-640` insere o que
--    a planilha usa com `not exists` + `on conflict do nothing`, logo ele **pula** o que
--    esta migration ja criou.
--
-- ⚠️ `create or replace view` NAO PRESERVA AS `reloptions` — gotcha 10, que esta base
--    pagou em 25/09/2026 com um vazamento de leitura que foi para o remoto. As DUAS views
--    recriadas aqui **repetem** `with (security_invoker = true)`, e a assercao I-13 de
--    `supabase/tests/010_estrutura.sql` reprova se faltar.
--
-- -------------------------------------------------------------------------------------
-- PLANO DE REVERSAO (DoD 6) — escrito ANTES do `up`, e conferido por `pg_dump`
--
--   begin;
--   -- 9/10. a semente e os comentarios
--   update public.config_listas set metadados = metadados - 'sigla'
--    where lista = 'metodologias' and metadados ? 'sigla';
--   update public.config_listas set metadados = metadados - 'categoria'
--    where lista = 'tipos_atividade' and metadados ? 'categoria';
--   -- ⚠️ COM ACENTO: `valor` e a chave natural, e 'Observacao' NAO casa com 'Observação'.
--   -- ⚠️ E **SO A LINHA SEM PROCEDENCIA**, senao a reversao apaga DADO: no remoto, 9 dos 19
--   --    valores da semente vieram da planilha e carregam `Config_Listas:…`.
--   delete from public.config_listas
--    where origem_migracao_v1 is null
--      and (lista, valor) in (('metodologias','Prova Mista'), ('metodologias','Prova Objetiva'),
--           ('metodologias','Observação de Desempenho'), ('metodologias','Trabalho Individual'),
--           ('metodologias','Trabalho em Grupo'), ('metodologias','Estudo Individual'),
--           ('metodologias','Prova Prática'), ('metodologias','Exposição Oral'),
--           ('metodologias','Aula Prática'), ('tipos_atividade','Visita Técnica'),
--           ('tipos_atividade','Estudo Individual'), ('tipos_atividade','Monitoria'),
--           ('tipos_atividade','Palestra'), ('tipos_atividade','Atividade Extracurricular'),
--           ('tipos_atividade','Orientação de TFM'), ('tipos_atividade','Evento/Cerimônia'),
--           ('tipos_atividade','Administração'), ('tipos_atividade','Tempo Reserva'),
--           ('tipos_atividade','Recuperação da Aprendizagem'));
--   -- ⚠️ E o `drop view` da reversao de `vw_ocupacao_ta` DEVOLVE privilegio a `anon` (medido na
--   --    T046): depois de recria-la, `revoke all on public.vw_ocupacao_ta from anon`.
--   -- ⚠️ E o `COMMENT ON CONSTRAINT` da catraca volta ao texto anterior — `drop constraint` o
--   --    descarta em silencio, e foi o `diff` do `pg_dump` que acusou as 7 linhas perdidas.
--   delete from public.config_parametros
--    where chave in ('dsa.teto_tfm_semana','dsa.teto_recomendado_semana','dsa.sabado_tempos');
--   comment on type public.impacto_feriado is
--     'Impacto da data sobre a capacidade letiva: `dia_inteiro` zera o dia no motor preditivo; '
--     '`parcial` reduz; `informativo` nao altera calculo algum. '
--     'Origem: BRIEF v2.1 §2; v2.0 `Calendario_Feriados`; RF-DADOS-04.';
--   -- 8. a funcao de conflito
--   drop function if exists public.conflitos_da_semana(uuid, date, date);
--   -- 6/7. as views, com a definicao ANTERIOR e o `with (...)` REPETIDO
--   --      (ver `git show HEAD~1` para o texto exato das duas; a reversao recria as duas
--   --       como estavam, e e justamente o `with (security_invoker = true)` que a prova de
--   --       `pg_dump` confere)
--   -- 5. o responsavel da atividade
--   alter table public.atividades_nao_letivas drop constraint ativ_responsavel_exclusivo;
--   alter table public.atividades_nao_letivas drop column instrutor_id, drop column responsavel_externo;
--   -- 4. o CHECK do Estudo Individual
--   alter table public.atividades_nao_letivas drop constraint ativ_estudo_individual_de_turma;
--   -- 3. os CHECK de registros_aula, e a catraca de volta a forma original
--   alter table public.registros_aula drop constraint reg_aula_ue_xor_disciplina;
--   alter table public.registros_aula drop constraint reg_aula_ue_ou_disciplina;
--   alter table public.registros_aula drop constraint reg_aula_ue_so_nula_no_historico;
--   alter table public.registros_aula add constraint reg_aula_ue_so_nula_no_historico check (
--     unidade_ensino_id is not null or (origem_migracao_v1 is not null and editado_em is null));
--   -- 2/1. a funcao e a coluna
--   drop function if exists app.disciplina_sem_ue(uuid);
--   alter table public.registros_aula drop constraint reg_aula_disciplina_do_curso;
--   alter table public.registros_aula drop column disciplina_id;
--   commit;
--
--   ⚠️ A REVERSAO NAO APAGA LANCAMENTO. Se alguem tiver gravado aula sem UE antes dela, o
--      `drop column disciplina_id` **perde a disciplina daquelas linhas** e a catraca
--      original as recusaria na primeira edicao. Quem reverter MUST medir antes:
--      `select count(*) from public.registros_aula where disciplina_id is not null`.
-- =====================================================================================


-- =====================================================================================
-- 1 · A DISCIPLINA NA LINHA, para quando nao ha UE (Q-1)
-- =====================================================================================
alter table public.registros_aula
  add column disciplina_id uuid;

-- FK COMPOSTA, espelhando a `reg_aula_ue_do_curso` que ja existe para a UE: ela impede
-- que a aula aponte para disciplina de OUTRO curso, que e a `RN-MAT-01` virada estrutura.
alter table public.registros_aula
  add constraint reg_aula_disciplina_do_curso
  foreign key (disciplina_id, curso_id) references public.disciplinas (id, curso_id)
  on delete restrict;

comment on column public.registros_aula.disciplina_id is
  'A disciplina quando NAO ha unidade de ensino — curso por competencias ou disciplina '
  'marcada sem UE (Q-1 da spec 013, decisao de Bernardo Villas Boas em 05/10/2026). '
  'Quando ha UE, ela e a fonte da disciplina e esta coluna fica NULA: o CHECK '
  '`reg_aula_ue_xor_disciplina` impede as duas juntas.';

create index if not exists idx_registros_aula_disciplina
  on public.registros_aula (disciplina_id)
  where disciplina_id is not null;


-- =====================================================================================
-- 2 · O PORTEIRO DA ISENCAO — so curso por competencias ou disciplina sem UE
-- =====================================================================================
-- ⚠️ **ELA E `SECURITY DEFINER`, E ISSO FOI CORRIGIDO POR MEDICAO — a primeira versao que eu
--    escrevi era `invoker`, e estava errada.** Medido em 05/10/2026: `disciplinas_ler` e
--    `cursos_ler` filtram `app.alcanca_curso(...)`, e **nenhum CHECK do schema inteiro chamava
--    funcao de `app.` antes deste** — este e o primeiro. Com `invoker`, a funcao leria as duas
--    tabelas **sob a RLS de quem insere**, e o CHECK passaria a depender de PERMISSAO: a mesma
--    linha seria valida para o Admin e invalida para um Operador de alcance recortado, e a
--    recusa chegaria como `23514` (violacao de CHECK) em vez de erro de permissao — um
--    diagnostico que manda procurar o dado quando o problema e o alcance.
-- ⚠️ `CHECK` deve ser **fato sobre a linha**, igual para todo mundo e para o ETL. `DEFINER`
--    garante isso. E, pelo gotcha 5.1, quem insere precisa de `EXECUTE`: a expressao do CHECK
--    e avaliada com os direitos de quem grava, mesmo sendo a funcao `DEFINER`.
create or replace function app.disciplina_sem_ue(p_disciplina_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(d.sem_unidades_ensino, false)
      or c.curriculo_modelo = 'competencias'
    from public.disciplinas d
    join public.cursos c on c.id = d.curso_id
   where d.id = p_disciplina_id
$$;

comment on function app.disciplina_sem_ue(uuid) is
  'A disciplina esta isenta de unidade de ensino? Verdadeiro quando o curso e por '
  'competencias (C-Espc-HN e C-Espc-FR, 2 de 24 medidos em 05/10/2026) ou quando a '
  'disciplina esta marcada `sem_unidades_ensino` (6 de 175). ⚠️ `SECURITY DEFINER` de '
  'proposito: ela e chamada de CHECK, e um CHECK que le sob a RLS de quem insere passaria a '
  'depender de permissao — a mesma linha valida para um perfil e invalida para outro. '
  '⚠️ Ela devolve NULL para disciplina inexistente (sem linha), e por isso todo chamador a '
  'envolve em `coalesce(..., false)`: CHECK passa em NULL. ⚠️ E esse NULL E alcancavel num '
  'INSERT: medido em 05/10/2026, o CHECK e avaliado ANTES da FK (que e gatilho AFTER ROW), '
  'entao sem o `coalesce` o CHECK aprovaria a aula de disciplina inexistente e a recusa '
  'passaria a vir da FK, com `23503` em vez de `23514`.';

revoke all on function app.disciplina_sem_ue(uuid) from public, anon;
grant execute on function app.disciplina_sem_ue(uuid) to authenticated, service_role;


-- =====================================================================================
-- 3 · UE **OU** DISCIPLINA-COM-TOPICO, e a catraca com UMA isencao nominal
-- =====================================================================================
alter table public.registros_aula drop constraint reg_aula_ue_so_nula_no_historico;

-- ⚠️ `coalesce(..., false)` entra porque `CHECK` passa em NULL (gotcha 15) e
--    `app.disciplina_sem_ue` devolve NULL para disciplina inexistente — **e a medicao mostrou
--    que ele SEGURA o caso, ao contrario do que eu escrevi aqui primeiro.** Eu afirmei que a
--    FK composta recusaria antes, com `23503`, e que o `coalesce` seria so convencao.
--    **Medido em 05/10/2026 pelo `116`: quem recusa e o CHECK, com `23514`** — CHECK de linha
--    e avaliado **antes** da integridade referencial, que e gatilho AFTER ROW.
-- ⚠️ Sem o `coalesce`, o CHECK **aprovaria** a aula de disciplina inexistente e deixaria a
--    recusa para a FK. A linha seria barrada de todo jeito, mas por outra restricao — e um
--    CHECK que aprova disciplina inexistente **mente sobre o que confere**, que e o modo de
--    falha do gotcha 15 na forma mais barata de evitar.
alter table public.registros_aula add constraint reg_aula_ue_so_nula_no_historico check (
     unidade_ensino_id is not null
  or (origem_migracao_v1 is not null and editado_em is null)                     -- a catraca de sempre
  or (disciplina_id is not null
      and coalesce(app.disciplina_sem_ue(disciplina_id), false))                 -- a isencao da Q-1
);

-- O TOPICO OBRIGATORIO da Q-1: sem UE, quem diz o que foi dado e o `conteudo_resumo`.
alter table public.registros_aula add constraint reg_aula_ue_ou_disciplina check (
     unidade_ensino_id is not null
  or (disciplina_id is not null
      and coalesce(app.disciplina_sem_ue(disciplina_id), false)
      and length(btrim(coalesce(conteudo_resumo, ''))) > 0)
  or (origem_migracao_v1 is not null and editado_em is null)
);

-- UMA FONTE SO. Quando ha UE, ela E a disciplina (`unidades_ensino.disciplina_id`); gravar
-- as duas abriria a porta para uma aula cuja UE pertence a uma disciplina e cuja coluna
-- aponta para outra.
alter table public.registros_aula add constraint reg_aula_ue_xor_disciplina check (
  not (unidade_ensino_id is not null and disciplina_id is not null)
);

-- ⚠️ **O COMENTARIO DA CATRACA E REPOSTO, E A PROVA DE REVERSAO (T046) E QUEM COBROU ISSO.**
--    `drop constraint` + `add constraint` **descarta o `COMMENT ON CONSTRAINT`** em silencio, e o
--    que estava escrito ali era a razao da catraca e a citacao da decisao UE-1 — exatamente o
--    texto que a proxima pessoa le antes de mexer nela. O `diff` do `pg_dump` acusou as 7 linhas
--    perdidas; sem a prova de reversao, a migration teria ido ao remoto apagando a explicacao.
comment on constraint reg_aula_ue_so_nula_no_historico on public.registros_aula is
  'A Unidade de Ensino so pode ser nula em linha MIGRADA e NUNCA EDITADA, ou em disciplina '
  'ISENTA de UE. Dado novo continua obrigado a declarar a UE — a decisao UE-1 de 26/08/2026 '
  'segue valendo onde importa. Editar uma linha historica passa a exigir a UE: e uma catraca. '
  'Residual conhecido: um INSERT novo com origem_migracao_v1 preenchido escapa; fecha-lo exige '
  'gatilho de sessao, Epico 3 (ver CHK023). '
  '⚠️ ISENCAO ACRESCENTADA EM 05/10/2026 (Q-1 da spec 013, decisao de Bernardo Villas Boas): '
  'curso `curriculo_modelo = ''competencias''` (2 de 24) ou disciplina `sem_unidades_ensino` '
  '(6 de 175), por `app.disciplina_sem_ue`, SEMPRE com `disciplina_id` preenchido e topico em '
  '`conteudo_resumo` (`reg_aula_ue_ou_disciplina`). A catraca NAO foi afrouxada em geral: '
  'disciplina fora da isencao segue recusada, e o `116` tem o caso que discrimina.';


-- =====================================================================================
-- 4 · O CHECK QUE A `RF-EXTRA-02` AFIRMA E QUE NAO EXISTIA (V-5 do analyze)
-- -------------------------------------------------------------------------------------
-- O requisito diz, com essas palavras: *"a restricao «Estudo Individual e sempre de Turma»
-- vira CHECK constraint — e regra estrutural 100% verificavel, nao caso de
-- alerta-nao-bloqueio"*. Medido em 05/10/2026: ela **nao existia**. Os quatro CHECK que
-- `atividades_nao_letivas` tinha eram `ativ_escopo_coerente`, `ativ_ta_valido`,
-- `ativ_tempos_positivos` e `ativ_tempos_so_nulo_no_historico`.
-- =====================================================================================
alter table public.atividades_nao_letivas add constraint ativ_estudo_individual_de_turma check (
  categoria_normativa <> 'Estudo_Individual' or escopo = 'turma'
);


-- =====================================================================================
-- 5 · O RESPONSAVEL DA ATIVIDADE NAO LETIVA (Q-8)
-- -------------------------------------------------------------------------------------
-- Medido: a tabela nao tinha coluna de responsavel, palestrante nem instrutor. E a coluna
-- INSTRUTOR da planilha traz entidade (`DOEP`, `CIAARA-30`, `NAS`) e palestrante externo.
-- O desenho e o MESMO que `avaliacoes` ja usa com `fiscal_id` x `nome_fiscal_externo`.
-- =====================================================================================
alter table public.atividades_nao_letivas
  add column responsavel_externo text,
  add column instrutor_id uuid references public.instrutores (id) on delete restrict;

alter table public.atividades_nao_letivas add constraint ativ_responsavel_exclusivo check (
  responsavel_externo is null or instrutor_id is null
);

comment on column public.atividades_nao_letivas.responsavel_externo is
  'Palestrante ou entidade de FORA do cadastro de instrutores (Q-8 da spec 013). '
  'Exclusivo com `instrutor_id` pelo CHECK `ativ_responsavel_exclusivo`.';


-- =====================================================================================
-- 6 · `vw_ocupacao_ta` — LEFT na UE, a global incluida, `local`, `fiscal_id` e `herdado`
-- -------------------------------------------------------------------------------------
-- QUATRO mudancas, cada uma com a sua razao medida:
--   · `left join unidades_ensino` + `coalesce` da disciplina: sem isso a aula sem UE da
--     Q-1 **desaparece da grade** (a juncao era interna).
--   · o ramo de atividade perde `turma_id is not null` (**V-7**): a `RF-EXTRA-03` manda que
--     *"todo lancamento AEC/TAD/TR/EI reflita automaticamente no DSA da(s) turma(s)
--     afetada(s))"* e a `RF-EXTRA-02` define escopo Global como *"aplicada a todas as
--     turmas ativas simultaneamente"* — e a global **nao chegava a DSA nenhum**. ⚠️ Medido:
--     ha **0** atividades globais no remoto hoje, e e por isso que a correcao e barata
--     AGORA e caríssima depois da primeira. A linha global sai com `turma_id` NULO, e quem
--     a aplica a cada turma ativa e a pagina.
--   · `local` e `fiscal_id`: sem eles o conflito de SALA (alerta secundario da `RN-CONF-01`)
--     e o do FISCAL nao se calculam.
--   · `herdado`: a marca que o dominio usa para tratar as 188 avaliacoes com
--     `ta_inicial = 1` como SEM POSICAO (Q-12) — medido, as 188 tem procedencia de ETL,
--     `editado_em` nulo e `ta_inicial = 1` TODAS ELAS, enquanto `tempos_consumidos` varia
--     de 1 a 8: a duracao e dado real e a posicao e sentinela da carga.
-- =====================================================================================
create or replace view public.vw_ocupacao_ta with (security_invoker = true) as
  select r.turma_id,
         r.data,
         r.ta_inicial,
         r.ta_final,
         r.tempos_consumidos,
         'aula'::text as origem,
         r.id as fato_id,
         coalesce(ue.disciplina_id, r.disciplina_id) as disciplina_id,
         r.instrutor_id,
         null::uuid as fiscal_id,
         r.local,
         (r.origem_migracao_v1 is not null and r.editado_em is null) as herdado
    from public.registros_aula r
    left join public.unidades_ensino ue on ue.id = r.unidade_ensino_id
   where r.status = 'ativo'::status_registro
     and r.ta_inicial is not null
  union all
  select a.turma_id,
         a.data_avaliacao as data,
         a.ta_inicial,
         a.ta_final,
         a.tempos_consumidos,
         'avaliacao'::text as origem,
         a.id as fato_id,
         a.disciplina_id,
         a.instrutor_responsavel_id as instrutor_id,
         a.fiscal_id,
         a.local,
         (a.origem_migracao_v1 is not null and a.editado_em is null) as herdado
    from public.avaliacoes a
   where a.status <> 'cancelada'::status_avaliacao
     and a.ta_inicial is not null
  union all
  select a.turma_id,
         a.data_vista_prova as data,
         a.ta_inicial_vista as ta_inicial,
         a.ta_final_vista as ta_final,
         a.tempos_consumidos_vista as tempos_consumidos,
         'vista_prova'::text as origem,
         a.id as fato_id,
         a.disciplina_id,
         a.instrutor_responsavel_id as instrutor_id,
         a.fiscal_id,
         a.local_vista as local,
         (a.origem_migracao_v1 is not null and a.editado_em is null) as herdado
    from public.avaliacoes a
   where a.status <> 'cancelada'::status_avaliacao
     and a.ta_inicial_vista is not null
  union all
  select n.turma_id,
         n.data,
         n.ta_inicial,
         n.ta_final,
         n.tempos_consumidos,
         'atividade_nao_letiva'::text as origem,
         n.id as fato_id,
         null::uuid as disciplina_id,
         n.instrutor_id,
         null::uuid as fiscal_id,
         n.local,
         (n.origem_migracao_v1 is not null and n.editado_em is null) as herdado
    from public.atividades_nao_letivas n
   where n.status = 'ativo'::status_registro
     and n.ta_inicial is not null;

comment on view public.vw_ocupacao_ta is
  'Quem ocupa cada Tempo de Aula, nas quatro origens. ⚠️ `turma_id` NULO e atividade de '
  'escopo global, que vale para toda turma ativa (V-7 da spec 013). ⚠️ `herdado` marca a '
  'linha que veio do ETL e nunca foi editada — o dominio a usa para tratar a posicao '
  'sentinela das avaliacoes migradas como SEM POSICAO (Q-12).';

-- View nova nasce com `DELETE`/`TRUNCATE` para `authenticated` — o `revoke` do Epico 1 e
-- uma foto do momento, nao regra permanente, e toda migration que recria view o repete.
revoke delete, truncate on public.vw_ocupacao_ta from authenticated, anon;


-- =====================================================================================
-- 7 · `vw_disciplinas_execucao` — o mesmo LEFT + coalesce, com o INVOKER repetido
-- -------------------------------------------------------------------------------------
-- Sem isto, a CH executada POR DISCIPLINA do `C-Espc-HN` e do `C-Espc-FR` ficaria em zero
-- para sempre depois da Q-1, porque o CTE `aulas` juntava a UE por juncao interna.
-- =====================================================================================
create or replace view public.vw_disciplinas_execucao with (security_invoker = true) as
  with aulas as (
    select coalesce(ue.disciplina_id, r.disciplina_id) as disciplina_id,
           r.turma_id,
           min(r.data) as primeira_data,
           max(r.data) as ultima_data,
           sum(r.tempos_consumidos) as ta
      from public.registros_aula r
      left join public.unidades_ensino ue on ue.id = r.unidade_ensino_id
     where r.status = 'ativo'::status_registro
       and coalesce(ue.disciplina_id, r.disciplina_id) is not null
     group by coalesce(ue.disciplina_id, r.disciplina_id), r.turma_id
  ), provas as (
    select a.disciplina_id,
           a.turma_id,
           min(a.data_avaliacao) as primeira_data,
           greatest(max(a.data_avaliacao), max(a.data_vista_prova)) as ultima_data,
           sum(coalesce(a.tempos_consumidos::integer, 0)
               + coalesce(a.tempos_consumidos_vista::integer, 0)) as ta
      from public.avaliacoes a
     where a.status <> 'cancelada'::status_avaliacao
     group by a.disciplina_id, a.turma_id
  )
  select d.id as disciplina_id,
         d.codigo as disciplina_codigo,
         d.curso_id,
         d.cod_disciplina,
         d.nome_disciplina,
         d.carga_horaria_tempos,
         t.id as turma_id,
         t.codigo as turma_codigo,
         t.ano_letivo,
         coalesce(td.previsao_inicio, d.previsao_inicio) as previsao_inicio_efetiva,
         coalesce(td.previsao_termino, d.previsao_termino) as previsao_termino_efetiva,
         td.origem_periodo,
         least(au.primeira_data, pr.primeira_data) as data_real_inicio,
         greatest(au.ultima_data, pr.ultima_data) as data_real_termino,
         coalesce(au.ta, 0::bigint) as ta_aula_executados,
         coalesce(pr.ta, 0::bigint) as ta_avaliacao_executados,
         coalesce(au.ta, 0::bigint) + coalesce(pr.ta, 0::bigint) as ta_executados,
         d.carga_horaria_tempos - coalesce(au.ta, 0::bigint) - coalesce(pr.ta, 0::bigint) as ta_saldo
    from public.disciplinas d
    join public.turmas t on t.curso_id = d.curso_id
    left join public.turma_disciplina td
      on td.disciplina_id = d.id and td.turma_id = t.id and td.status = 'ativo'::status_registro
    left join aulas au on au.disciplina_id = d.id and au.turma_id = t.id
    left join provas pr on pr.disciplina_id = d.id and pr.turma_id = t.id
   where d.status = 'ativo'::status_registro;

revoke delete, truncate on public.vw_disciplinas_execucao from authenticated, anon;


-- =====================================================================================
-- 8 · O CONFLITO ENTRE TURMAS — o FATO, sem o dado alheio (Q-17)
-- -------------------------------------------------------------------------------------
-- A `RN-CONF-01` **[REVISADA]** manda considerar **todas as turmas do sistema**, e o
-- proprio texto da regra avisa o custo: *"Risco: Alto (sobe em relacao a v1.0 porque a nova
-- verificacao cruza turmas, exigindo acesso a mais dados do que o calculo original)"*.
--
-- ⚠️ O PROBLEMA MEDIDO: `vw_ocupacao_ta` e `security_invoker = true` e as policies das tres
--    tabelas filtram `app.alcanca_turma(turma_id)`. Logo, para o **operador de escopo
--    recortado** — que e justamente quem mais lanca —, a view devolve so as turmas que ele
--    alcanca, e o conflito do instrutor na turma de outro curso **NAO E VISTO**. Nao da
--    erro, nao da aviso: a grade abre sem o conflito. E o gotcha 4 sobre um requisito de
--    Risco ALTO.
--
-- ⚠️ E A SAIDA FACIL E A ERRADA: afrouxar a policy de leitura entregaria o DSA alheio a
--    quem tem alcance recortado. Esta funcao devolve **so o fato** — dia, TA, pessoa e
--    local — e **nunca** `turma_id`, `fato_id`, disciplina ou conteudo da outra turma.
--
-- ⚠️ O PORTEIRO VAI NA FORMA QUE FALHA FECHADA (gotcha 15), **E A MEDICAO CORRIGE O QUE EU
--    IA ESCREVER AQUI.** Eu ia registrar que `app.pode()` e `app.alcanca_turma()` devolvem
--    NULL sem sessao, como `app.eh_admin()` devolvia. **Medido em 05/10/2026, sem sessao: as
--    duas devolvem `false` explicito** — `app.pode` porque a consulta na matriz nao casa e ela
--    fecha em `false`, e `app.alcanca_turma` porque o `case` dela so tem dois ramos. Logo,
--    **aqui a forma `coalesce(...) is not true` e CONVENCAO, nao e ela que segura o buraco**,
--    e a assercao de pgTAP que prova que esta funcao levanta sem sessao **passaria com a forma
--    `if not` tambem** — ela nao discrimina (DoD 8), e isso fica dito para ninguem concluir o
--    contrario depois.
-- ⚠️ **O OUTRO `coalesce` DESTA MIGRATION, O DOS CHECK, ESSE SIM SEGURA UM CASO** — e eu
--    tinha escrito o contrario aqui. CHECK de linha roda antes da FK, entao sem ele o CHECK
--    aprovaria disciplina inexistente. Ver a nota do item 3, com a medicao.
-- ⚠️ A forma fica porque o custo e zero e porque `app.pode` ja mudou de comportamento uma vez
--    nesta base (`20261003042704`); o que nao fica e a afirmacao de que ela esta segurando algo.
-- =====================================================================================
create or replace function public.conflitos_da_semana(
  p_turma_id uuid,
  p_de date,
  p_ate date
)
returns table (
  data date,
  ta_inicial smallint,
  ta_final smallint,
  instrutor_id uuid,
  fiscal_id uuid,
  local text
)
language plpgsql
security definer
set search_path = public, app
as $$
begin
  if coalesce(app.pode('registros_aula', 'ler'), false) is not true then
    raise exception 'Sem permissao para ler lancamento.'
      using errcode = '42501', hint = 'sem_alcance';
  end if;
  if coalesce(app.alcanca_turma(p_turma_id), false) is not true then
    raise exception 'Sem alcance para a turma.'
      using errcode = '42501', hint = 'sem_alcance';
  end if;

  return query
    with minha as (
      select o.data, o.ta_inicial, o.ta_final, o.instrutor_id, o.fiscal_id, o.local
        from public.vw_ocupacao_ta o
       where o.turma_id = p_turma_id
         and o.data between p_de and p_ate
    )
    select distinct
           o.data,
           o.ta_inicial,
           o.ta_final,
           o.instrutor_id,
           o.fiscal_id,
           o.local
      from public.vw_ocupacao_ta o
      join minha m
        on m.data = o.data
       and o.ta_inicial <= m.ta_final
       and o.ta_final >= m.ta_inicial
       and (
            (o.instrutor_id is not null
             and o.instrutor_id in (m.instrutor_id, m.fiscal_id))
         or (o.fiscal_id is not null
             and o.fiscal_id in (m.instrutor_id, m.fiscal_id))
         or (o.local is not null and m.local is not null
             and app.normalizar_texto(o.local) = app.normalizar_texto(m.local))
       )
     where o.turma_id is not null
       and o.turma_id <> p_turma_id
       and o.data between p_de and p_ate;
end
$$;

comment on function public.conflitos_da_semana(uuid, date, date) is
  'As ocupacoes de OUTRAS turmas que cruzam com a semana desta (RN-CONF-01 revisada, '
  'Q-17 da spec 013). Devolve so o FATO — dia, TA, pessoa e local — e NUNCA `turma_id`, '
  '`fato_id`, disciplina ou conteudo alheio: a regra exige ver o conflito, nao o DSA do '
  'outro curso. ⚠️ SECURITY DEFINER com porteiro que falha FECHADO (gotcha 15), porque '
  '`vw_ocupacao_ta` e security_invoker e esconderia a turma que o perfil nao alcanca.';

revoke all on function public.conflitos_da_semana(uuid, date, date) from public, anon;
grant execute on function public.conflitos_da_semana(uuid, date, date) to authenticated;


-- =====================================================================================
-- 9 · DADO — os parametros e as duas listas (Q-4, Q-10/H1, H2)
-- -------------------------------------------------------------------------------------
-- ⚠️ SEM `origem_migracao_v1` — ver a nota do cabecalho. E `INSERT ... ON CONFLICT DO
--    UPDATE`, para funcionar antes e depois do ETL, idempotente nos dois sentidos.
-- =====================================================================================

-- 9.1 · Os tetos e os TA do sabado, como DADO (Principio VII: parametro normativo nunca
--       e constante de codigo). `tetos.ts` os recebe por parametro, e ha caso de teste
--       que discrimina — trocando o teto, o veredito vira.
--       ⚠️ NAO E `on conflict (chave)`, E A RAZAO FOI MEDIDA: `config_parametros` **nao tem
--          restricao unica em `chave`**. O que existe e o indice PARCIAL e por EXPRESSAO
--          `uq_config_param_chave_ano (chave, coalesce(ano_vigencia::integer, 0))
--          where status = 'ativo'` — e inferir um indice parcial num `on conflict` exigiria
--          repetir o predicado, forma fragil que quebra se o indice mudar. `where not exists`
--          e idempotente sem depender de inferencia de indice.
--       ⚠️ E as COLUNAS tambem foram medidas: e `fundamento_normativo` (nao `norma_origem`),
--          e `tipo` e NOT NULL com padrao `numero`. O CHECK
--          `config_param_normativo_tem_fundamento` **recusa** `natureza = 'normativo'` sem
--          fundamento, entao os dois tetos o trazem.
insert into public.config_parametros (chave, valor, tipo, natureza, fundamento_normativo, descricao)
select t.chave, t.valor, 'inteiro', t.natureza, t.fundamento, t.descricao
  from (values
    ('dsa.teto_tfm_semana', '6', 'normativo', 'RN-DIST-03 (a)',
     'Teto RIGIDO de TA de TFM por semana — o unico bloqueio do DSA.'),
    ('dsa.teto_recomendado_semana', '25', 'normativo', 'RN-DIST-03 (c)',
     'Teto RECOMENDADO por disciplina por semana: ultrapassar gera alerta, nunca bloqueio.'),
    ('dsa.sabado_tempos', '5', 'operacional', null,
     'TA do sabado quando o operador o abre. Medido: a planilha do C-Ap-HN usou 5 em oito sabados.')
  ) as t(chave, valor, natureza, fundamento, descricao)
 where not exists (
   select 1 from public.config_parametros c
    where c.chave = t.chave and c.status = 'ativo'::status_registro
 );

-- 9.2 · A SIGLA DA TECNICA, na lista QUE JA EXISTE (H1 do analyze).
--       ⚠️ Eu havia proposto uma lista nova `tecnicas_de_ensino`; o analyze mediu o REMOTO
--          e mostrou que `config_listas.metodologias` ja existe com 16 linhas e nenhuma
--          sigla — a lista nova seria SEGUNDA FONTE DE VERDADE do mesmo conceito. Decisao
--          de Bernardo: sem lista nova.
--       ⚠️ Treze das linhas ficam SEM sigla e imprimem o nome POR EXTENSO na coluna T/E
--          (RN-DEG-01). `PE` fica de fora ate Bernardo confirmar o nome, e nenhum
--          lancamento a usa hoje (medido em `tipo_avaliacao`).
insert into public.config_listas (lista, valor, rotulo_exibicao, ordem, ativo, metadados)
select 'metodologias', t.valor, t.valor, t.ordem, true, jsonb_build_object('sigla', t.sigla)
  from (values
    ('Exposição Oral',           901::smallint, 'EO'),
    ('Aula Prática',             902::smallint, 'AP'),
    ('Prova Prática',            903::smallint, 'PP'),
    ('Prova Mista',              904::smallint, 'PM'),
    ('Prova Objetiva',           905::smallint, 'PO'),
    ('Observação de Desempenho', 906::smallint, 'OD'),
    ('Trabalho Individual',      907::smallint, 'TI'),
    ('Trabalho em Grupo',        908::smallint, 'TG'),
    ('Estudo Individual',        909::smallint, 'EI')
  ) as t(valor, ordem, sigla)
on conflict (lista, valor) do update
   set metadados = config_listas.metadados || jsonb_build_object('sigla', excluded.metadados ->> 'sigla');

-- 9.3 · A CATEGORIA NORMATIVA de cada subtipo, em `tipos_atividade` (H2 do analyze).
--       ⚠️ A lista MISTURA aula com nao-letivo, e e por isso que o seletor de subtipo
--          precisa filtrar por categoria em vez de oferecer a lista inteira. `Aula`,
--          `Aula Teorica`, `Aula Pratica`, `Avaliacao` e `Vista de Prova` NAO recebem
--          categoria nao letiva, porque sao aula.
--       ⚠️ `Licença de Pagamento` fica SEM categoria e NAO aparece no DSA: ela vem do
--          calendario (Q-16), como o feriado.
insert into public.config_listas (lista, valor, rotulo_exibicao, ordem, ativo, metadados)
select 'tipos_atividade', t.valor, t.valor, t.ordem, true,
       jsonb_build_object('categoria', t.categoria)
  from (values
    ('Palestra',                     911::smallint, 'AEC'),
    ('Atividade Extracurricular',    912::smallint, 'AEC'),
    ('Orientação de TFM',            913::smallint, 'AEC'),
    ('Visita Técnica',               914::smallint, 'AEC'),
    ('Evento/Cerimônia',             915::smallint, 'TAD'),
    ('Administração',                916::smallint, 'TAD'),
    ('Tempo Reserva',                917::smallint, 'TR'),
    ('Recuperação da Aprendizagem',  918::smallint, 'TR'),
    ('Estudo Individual',            919::smallint, 'Estudo_Individual'),
    ('Monitoria',                    920::smallint, 'Estudo_Individual')
  ) as t(valor, ordem, categoria)
on conflict (lista, valor) do update
   set metadados = config_listas.metadados || jsonb_build_object('categoria', excluded.metadados ->> 'categoria');


-- =====================================================================================
-- 10 · E-1 · O COMENTARIO DE `impacto_feriado` PASSA A DIZER O QUE A REGRA DIZ
-- -------------------------------------------------------------------------------------
-- ⚠️ DIVERGENCIA ACHADA AO ESCREVER O PR 0, em 05/10/2026, e decidida por Bernardo: o
--    comentario dizia *"`parcial` reduz"*, e a `RN-EVT-02` diz, literalmente, que *"um
--    evento global (feriado) so desconta capacidade de calculo quando seu impacto esta
--    marcado como «Dia Inteiro»; impacto parcial ou informativo NAO DESCONTA NADA"*.
--
--    **A REGRA NAO MUDA** — quem muda e o comentario, que estava errado. E ele importa
--    porque o comentario do catalogo e o que quem programa le primeiro: `lib/dominio/dsa/
--    capacidade.ts` seguiu a regra e registrou a divergencia no cabecalho, mas a proxima
--    pessoa poderia seguir o comentario.
--
-- ⚠️ E ha um fato que explica por que ninguem notou: medido em
--    `scripts/etl/dados/bruto/v20/Calendario_Feriados.csv`, a origem tem **24
--    `Dia_Inteiro`, 2 `Informativo` e ZERO `parcial`** — o valor nunca foi usado, entao a
--    frase errada nunca produziu numero errado.
-- =====================================================================================
comment on type public.impacto_feriado is
  'Impacto da data sobre a capacidade letiva: `dia_inteiro` zera o dia no motor preditivo; '
  '`parcial` e `informativo` NAO descontam nada — so sinalizam (RN-EVT-02, literal). '
  'Origem: BRIEF v2.1 §2; v2.0 `Calendario_Feriados`; RF-DADOS-04. '
  '⚠️ A frase anterior dizia que `parcial` reduzia, e contrariava a RN-EVT-02: corrigida em '
  '05/10/2026 (E-1 da spec 013, decisao de Bernardo Villas Boas). A REGRA nao mudou.';
