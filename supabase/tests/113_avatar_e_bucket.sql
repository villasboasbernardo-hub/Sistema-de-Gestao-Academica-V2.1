-- =====================================================================================
-- 113_avatar_e_bucket.sql — a coluna do avatar, o bucket e as TRES policies
-- Epico 3 · spec 011-gestao-de-usuarios · T005
--
-- ⚠️ **ERA `112` E VIROU `113` NO REBASE DE 29/09/2026, e a colisao era SILENCIOSA.** Enquanto este
--    ramo esteve aberto, o PR 2 da fatia (b) entrou na `main` com `112_carga_unidades_ensino.sql`.
--    ⚠️ **O git NAO acusa**: sao arquivos com nomes diferentes, e o rebase junta os dois sem
--       conflito — ficariam **dois 112** na pasta, e a ordem entre eles passaria a depender de como
--       o `pg_prove` ordena o diretorio. Quem renomeia e quem le a pasta, nao a ferramenta.
-- -------------------------------------------------------------------------------------
-- ⚠️ **ESTE ARQUIVO PROVA ESTRUTURA, NAO PERMISSAO.** Ele roda como DONO do schema, e sob
--    privilegio de dono a RLS nao se aplica: uma assercao de "o dono escreve e o outro nao"
--    escrita aqui passaria com a RLS DESLIGADA. Quem prova permissao e
--    `tests/invariantes/rls/avatar-no-storage.test.ts`, com sessao autenticada de verdade.
--    A divisao esta no DoD 4 do `CLAUDE.md`.
--
-- ⚠️ **O RETRATO DE ANTES, medido em 29/09/2026**: `storage.buckets` VAZIA e `storage.objects`
--    com **ZERO** policies. Sem esse retrato, "passou a ter quatro" nao quer dizer nada — podia
--    ter oito antes.
-- =====================================================================================
begin;
select plan(10);

-- ============================================ a coluna
select has_column('public', 'usuarios', 'avatar_caminho',
  'FR-012 · `usuarios.avatar_caminho` existe — e onde a foto se liga a conta');

select col_is_null('public', 'usuarios', 'avatar_caminho',
  'FR-010 · a coluna e ANULAVEL: sem foto e o estado normal, e a tela mostra as iniciais');

-- ⚠️ Ela guarda CAMINHO, nao URL. A diferenca nao e de gosto: o bucket e privado, o endereco de
--    leitura e temporario, e guardar um endereco temporario seria guardar algo que vence.
select matches(
  (select col_description('public.usuarios'::regclass,
     (select ordinal_position::int from information_schema.columns
       where table_schema = 'public' and table_name = 'usuarios'
         and column_name = 'avatar_caminho'))),
  'NAO e URL',
  'FR-012 · o comentario da coluna diz que ela guarda CAMINHO, nao URL'
);

-- ============================================ o bucket, e a garantia no MOTOR
-- ⚠️ ESTAS TRES SAO O CORACAO DA T005. Com o limite e os tipos na definicao do bucket, a recusa
--    do servidor existe mesmo que alguem apague a conferencia do TypeScript — que foi o modo de
--    falha do Epico 3, onde o minimo de senha vivia so no formulario.
select is(
  (select public::text from storage.buckets where id = 'avatares'),
  'false',
  'D-3 · o bucket `avatares` e PRIVADO — foto e dado pessoal, e o repositorio e publico'
);

select is(
  (select file_size_limit from storage.buckets where id = 'avatares'),
  2097152::bigint,
  'FR-012 · o limite de 2 MB vive no BUCKET, nao so no codigo'
);

select set_eq(
  $$select unnest(allowed_mime_types) from storage.buckets where id = 'avatares'$$,
  $$values ('image/jpeg'), ('image/png')$$,
  'FR-012 · o bucket aceita exatamente JPG e PNG — qualquer outro tipo e recusado pelo motor'
);

-- ============================================ as TRES policies
-- ⚠️ EXATAMENTE tres, e o numero e a assercao: uma quarta policy em `storage.objects` seria algo
--    que esta fatia nao pediu, e a tabela passou de ZERO para tres nesta migration.
select is(
  (select count(*)::int from pg_policies
    where schemaname = 'storage' and tablename = 'objects'),
  3,
  'I-5 · `storage.objects` tem EXATAMENTE tres policies — eram ZERO antes desta migration'
);

-- ⚠️ E as tres sao restritas ao bucket. Uma policy sem o filtro de `bucket_id` abriria o Storage
--    inteiro para o resto do sistema, e ela pareceria igualmente correta na revisao.
select is_empty(
  $$select policyname from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and coalesce(qual, '') || coalesce(with_check, '') not like '%avatares%'$$,
  'I-5 · toda policy de `storage.objects` esta restrita ao bucket `avatares`'
);

-- ============================================ a REGRA 4, que esta fatia NAO afrouxou
-- ⚠️ **ESTA E A ASSERCAO QUE IMPORTA AQUI, e ela nasceu de uma tentativa fracassada.** A primeira
--    escrita desta migration criava `avatares_remover`, uma policy `for delete` restrita ao dono,
--    para atender a `FR-014`. Ela **quebrou a assercao 13 de `107_exclusao_com_rastro.sql`**, que
--    conta `pg_policy where polcmd = 'd'` em TODO o catalogo — e essa assercao esta codificando a
--    regra 4, que diz *"PR que acrescenta `for delete` e rejeitado sem discussao"*.
--
-- ⚠️ **O CONSERTO NAO FOI EMENDAR A GUARDA.** Emendar a assercao para "zero em `public`" faria a
--    guarda caber no que eu queria fazer, em vez do contrario. A policy saiu; remover a foto poe
--    `avatar_caminho = null` e o arquivo fica (um por conta, sobrescrito a cada envio). A excecao
--    para o Storage, se vier, e decisao nominal de Bernardo — nao de quem escreve a migration.
--
-- ⚠️ **Por que a assercao esta AQUI e nao so la:** a de `107` conta o catalogo inteiro e por isso
--    ja pegaria. Esta nomeia o schema onde a fatia mexeu, entao a mensagem de erro diz QUAL fatia
--    abriu a porta, em vez de so dizer que o total subiu.
select is(
  (select count(*)::int from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and cmd = 'DELETE'),
  0,
  'regra 4 · `storage.objects` NAO ganhou policy de DELETE — a excecao ao `for delete` e de Bernardo'
);

select is(
  (select count(*)::int from pg_policies where schemaname = 'public' and cmd = 'DELETE'),
  0,
  'regra 4 · continua havendo ZERO policy de DELETE em `public` — controle positivo da guarda'
);

select * from finish();
rollback;
