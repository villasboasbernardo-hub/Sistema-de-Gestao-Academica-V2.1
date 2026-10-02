-- =================================================================================
-- M1 da spec 011 — a foto do avatar: a coluna, o bucket e TRES policies
-- (eram quatro no rascunho; a de DELETE saiu — o porque esta escrito adiante, junto das policies)
--
-- O QUE  : (1) `usuarios.avatar_caminho`; (2) o bucket privado `avatares`, com o limite de
--          2 MB e os dois tipos aceitos NA PROPRIA DEFINICAO; (3) TRES policies em
--          `storage.objects` — ler, escrever e trocar —, todas restritas a esse bucket.
--          ⚠️ **NAO ha policy de DELETE**, e o porque esta escrito na PARTE C.
--
-- POR QUE: `FR-012` e `FR-013` pedem foto opcional de ate 2 MB, em JPG ou PNG, recusada
--          **nos dois lados**. A recusa do navegador e conveniencia; a que garante e a do
--          servidor.
--
-- ⚠️ E A GARANTIA DO SERVIDOR E ESTRUTURAL, nao uma conferencia escrita em codigo.
--    `storage.buckets` tem `file_size_limit` e `allowed_mime_types` — medido em 29/09/2026 —
--    entao o limite vive no MOTOR. Ele sobrevive a alguem apagar a conferencia do TypeScript,
--    que e exatamente o modo de falha do Epico 3: o minimo de senha existia SO no formulario e
--    era alcancavel por chamada direta.
--
-- ⚠️ O BUCKET E PRIVADO (decisao D-3, Bernardo Villas Boas, 29/09/2026). O repositorio e
--    publico desde 26/08/2026 e a decisao PII-1 ja restringe identificacao civil a tres
--    perfis. Foto e dado pessoal: o padrao mais restrito e o que combina. A leitura passa por
--    endereco temporario, nunca por URL adivinhavel.
--
-- ⚠️ HOJE `storage.objects` TEM RLS LIGADA E **ZERO** POLICIES — medido antes desta migration.
--    Tabela sem policy e inacessivel, e isso e intencional no projeto. Esta e a PRIMEIRA vez
--    que algo entra ali, e por isso as TRES sao restritas ao bucket `avatares`: uma policy
--    sem o filtro de bucket abriria o Storage inteiro para o resto do sistema.
--
-- ⚠️ O CAMINHO DO ARQUIVO CARREGA O DONO, e e isso que torna a policy de escrita decidivel sem
--    consulta nenhuma: `<auth_user_id>/<arquivo>`. A primeira pasta E a identidade, e
--    `storage.foldername(name)[1]` a compara com `auth.uid()`. Sem essa convencao, "so o dono
--    escreve" exigiria uma consulta dentro da policy.
--
-- ⚠️ `usuarios.avatar_caminho` GUARDA O CAMINHO, NAO UMA URL. Endereco de bucket privado e
--    temporario por natureza; guardar um seria guardar algo que vence.
--
-- REVERSAO (executada numa base descartavel antes do PR):
--    drop policy if exists avatares_trocar  on storage.objects;
--    drop policy if exists avatares_escrever on storage.objects;
--    drop policy if exists avatares_ler     on storage.objects;
--    delete from storage.buckets where id = 'avatares';   -- so se nao houver objeto
--    alter table public.usuarios drop column if exists avatar_caminho;
--    ⚠️ O `drop column` so e seguro ENQUANTO a coluna estiver vazia. Com foto cadastrada, a
--       convencao de banco manda vira-la comentario `[APOSENTADA]` em vez de larga-la.
--    ⚠️ Os arquivos ja enviados NAO voltam: apagar o bucket com objeto dentro perderia dado
--       que ninguem mandou apagar.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- PARTE A — a coluna
-- ---------------------------------------------------------------------------------
alter table public.usuarios
  add column if not exists avatar_caminho text;

comment on column public.usuarios.avatar_caminho is
  'Caminho do arquivo dentro do bucket `avatares`, na forma `<auth_user_id>/<arquivo>`. NAO e '
  'URL: o bucket e privado e o endereco de leitura e temporario, entao guardar uma URL seria '
  'guardar algo que vence. Nulo = sem foto, e a tela mostra as iniciais do nome (FR-010). '
  'Escrito pelo proprio dono (FR-020); nenhum outro perfil escreve aqui.';

-- ---------------------------------------------------------------------------------
-- PARTE B — o bucket, com o limite no motor
-- ---------------------------------------------------------------------------------
-- ⚠️ `where not exists` em vez de `on conflict`: a unicidade de `storage.buckets` e a chave
--    primaria `id`, e `on conflict (id) do nothing` funcionaria — mas esta migration nao deve
--    supor a forma da restricao de uma tabela da PLATAFORMA, que muda entre versoes do CLI.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select 'avatares', 'avatares', false, 2097152, array['image/jpeg', 'image/png']
 where not exists (select 1 from storage.buckets where id = 'avatares');

-- ---------------------------------------------------------------------------------
-- PARTE C — as TRES policies, todas restritas ao bucket
--
-- ⚠️ TODAS conferem `bucket_id = 'avatares'`. Sem isso, elas valeriam para qualquer bucket que
--    o projeto venha a ter, e a primeira policy do Storage passaria a ser a mais larga.
-- ---------------------------------------------------------------------------------

-- LER: o dono, ou quem ja pode ler aquele cadastro.
-- ⚠️ A segunda metade usa `app.pode('usuarios','ler')`, a MESMA permissao que decide quem ve a
--    listagem de usuarios — a foto nao pode ser mais visivel que o cadastro a que pertence.
create policy avatares_ler
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatares'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or app.pode('usuarios', 'ler')
    )
  );

-- ESCREVER e TROCAR: so o dono. (REMOVER nao tem policy — o porque esta no fim desta parte.)
-- ⚠️ Nem o Admin escreve a foto de outra pessoa. Editar cadastro alheio e uma coisa; trocar a
--    imagem que representa outra pessoa e outra, e ninguem pediu a segunda.
create policy avatares_escrever
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatares_trocar
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ⚠️ **NAO HA POLICY DE `DELETE`, E A AUSENCIA E DELIBERADA.**
--
--    A `FR-014` pede que a pessoa possa REMOVER a propria foto. O caminho direto seria uma
--    policy `for delete` em `storage.objects`, restrita ao dono — e foi o que esta migration
--    tinha na primeira escrita.
--
--    ⚠️ **ELA QUEBROU UMA ASSERCAO EXISTENTE**, a 13 de `107_exclusao_com_rastro.sql`, que conta
--       `pg_policy where polcmd = 'd'` **em todo o catalogo**, sem filtro de schema. E a assercao
--       esta codificando a REGRA 4 do `CLAUDE.md`, que e inviolavel e diz, com estas palavras:
--       *"Nenhuma tabela tem policy `FOR DELETE` [...] PR que acrescenta `for delete` e rejeitado
--       sem discussao."*
--
--    ⚠️ **NAO CABE A ESTA MIGRATION DECIDIR QUE O STORAGE ESTA FORA DA REGRA.** A regra tem um
--       mecanismo de excecao — nominal, delimitada e registrada — e ele e de Bernardo, nao de
--       quem escreve a migration. Emendar a assercao para "zero em `public`" seria afrouxar a
--       guarda para caber o que eu queria fazer, que e exatamente o movimento que a regra 9.3 e
--       a regra 1 existem para impedir.
--
--    **O QUE FICA NO LUGAR, e a consequencia declarada:** remover a foto poe
--    `usuarios.avatar_caminho = null`, e a tela volta as iniciais (`FR-010`) — o requisito da
--    `FR-014` e atendido do ponto de vista de quem usa. O ARQUIVO permanece no bucket.
--    ⚠️ O lixo e LIMITADO A UM ARQUIVO POR CONTA, porque o envio grava sempre no MESMO caminho
--       (`<auth_user_id>/avatar`), substituindo o anterior. Nao ha crescimento por uso.
--    ⚠️ E ele continua **invisivel**: sem `avatar_caminho`, nenhuma tela pede o endereco; e o
--       bucket e privado, entao nao ha URL adivinhavel.
--
--    **Levado a Bernardo como duvida em lote**, com opcoes e recomendacao. Enquanto nao houver
--    decisao, a regra 4 fica como esta.
