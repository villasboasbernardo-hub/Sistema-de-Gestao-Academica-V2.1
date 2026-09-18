-- =================================================================================
-- Migration 3 de 7 — Epico 5, fatia (a): o codigo da turma nasce no banco e nunca muda
--
-- O QUE  : gatilho que GERA `turmas.codigo` como `sigla [rotulo] ano`, recusa codigo
--          divergente e recusa mudanca de codigo; e `turmas_unica_por_ano` recriada como
--          `UNIQUE NULLS NOT DISTINCT`, com o MESMO NOME.
--
-- ORIGEM : FR-025.1, FR-026, FR-014.2, FR-046 · spec `009-cursos-e-turmas` · D-5.
--          Decisoes de Bernardo Villas Boas de 16/09/2026 (Q-07, Q-07.1, Q-21).
--
-- ⚠️ NAO E SEQUENCIA, e por isso nao e o mecanismo da fatia (c). La o codigo do instrutor e
--    `DEFAULT` de coluna tirado de sequencia. Aqui ele depende da SIGLA DO CURSO, que mora em outra
--    tabela, e do rotulo e do ano da propria linha — e `DEFAULT` NAO LE OUTRA COLUNA. E gatilho, e
--    o gatilho le a sigla no momento da criacao.
--
-- ⚠️ `SECURITY DEFINER` POR UM MOTIVO PRECISO: o gatilho le `cursos.codigo` por `NEW.curso_id` sem
--    depender do `cursos.ler` de quem grava. Quem autoriza a escrita e a policy de `turmas`, que
--    roda logo depois — misturar as duas coisas faria a criacao de turma falhar por leitura negada,
--    que e o pior diagnostico possivel para quem esta criando uma turma.
--
-- ⚠️ E O GATILHO IMPOE O FORMATO, nao so preenche quando vem vazio (FR-025.1). Preencher o vazio
--    sozinho deixaria qualquer caminho de escrita gravar um codigo divergente — e o codigo SAI
--    IMPRESSO NO DSA. A carga do ETL, que grava o codigo explicitamente, passa: medido em
--    17/09/2026, 28 de 28 turmas da origem ja seguem `sigla [rotulo] ano` (conferencia 7).
--
-- ⚠️ `NULLS NOT DISTINCT` E A METADE QUE FALTAVA (D-5). No `UNIQUE` padrao, `NULL <> NULL`: duas
--    turmas SEM rotulo no mesmo curso e ano passariam pela restricao e so colidiriam no CODIGO — e a
--    mensagem falaria de codigo repetido para quem nao informou rotulo nenhum. Medido em PostgreSQL
--    17.6, local e remoto; e medido em 17/09/2026 que nenhuma combinacao de curso, ano e rotulo —
--    vazio incluido — se repete nas 28 turmas, entao a restricao entra sem saneamento.
--
-- ⚠️ O NOME DA RESTRICAO NAO MUDA. Ela e recriada com o mesmo `turmas_unica_por_ano`, porque e o
--    nome que a traducao de recusas usa para dizer *"ja existe a turma X com este rotulo"*, e porque
--    o `020_unicidade.sql` passou a afirma-lo (decisao de 17/09/2026).
-- =================================================================================

create or replace function app.gerar_codigo_da_turma()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_sigla    text;
  v_esperado text;
begin
  -- ------------------------------------------------------------------ edicao: o codigo nunca muda
  if tg_op = 'UPDATE' then
    if new.codigo is distinct from old.codigo then
      raise exception
        'O codigo da turma e gerado pelo sistema e nao muda.'
        using errcode = '23514',
              hint = 'codigo_de_turma_imutavel',
              detail = jsonb_build_object('esperado', old.codigo)::text;
    end if;
    -- E NAO se regrava o codigo quando rotulo, ano, curso ou a sigla do curso mudam: e isso que faz
    -- a turma antiga carregar a sigla antiga (FR-014.2), que e historia correta.
    return new;
  end if;

  -- ------------------------------------------------------------------ criacao: o banco carimba
  select c.codigo into v_sigla from public.cursos c where c.id = new.curso_id;

  -- `concat_ws` pula NULO mas NAO pula string vazia — dai o `nullif(btrim(...), '')`, que impede o
  -- espaco duplo em `sigla  ano` quando o rotulo chega como texto em branco.
  v_esperado := concat_ws(' ', v_sigla, nullif(btrim(coalesce(new.turma, '')), ''), new.ano_letivo::text);

  if nullif(btrim(coalesce(new.codigo, '')), '') is null then
    new.codigo := v_esperado;
  elsif new.codigo <> v_esperado then
    raise exception
      'O codigo da turma e gerado pelo sistema e nao muda.'
      using errcode = '23514',
            hint = 'codigo_de_turma_divergente',
            detail = jsonb_build_object('esperado', v_esperado, 'recebido', new.codigo)::text;
  end if;

  return new;
end;
$$;

comment on function app.gerar_codigo_da_turma() is
  'FR-025.1: gera `turmas.codigo` como `sigla [rotulo] ano` na criacao, lendo a sigla VIGENTE do '
  'curso; recusa codigo informado divergente (chave `codigo_de_turma_divergente`) e recusa mudar o '
  'codigo (chave `codigo_de_turma_imutavel`). SECURITY DEFINER para ler `cursos.codigo` sem depender '
  'do `cursos.ler` de quem grava. Editar sigla, rotulo, ano ou curso NAO regrava o codigo (FR-014.2).';

revoke all on function app.gerar_codigo_da_turma() from public, anon;

create trigger trg_turmas_codigo
  before insert or update on public.turmas
  for each row execute function app.gerar_codigo_da_turma();

-- ---------------------------------------------------------------- o vazio conta como igual
alter table public.turmas drop constraint turmas_unica_por_ano;
alter table public.turmas
  add constraint turmas_unica_por_ano unique nulls not distinct (curso_id, ano_letivo, turma);

comment on constraint turmas_unica_por_ano on public.turmas is
  'FR-026 (D-5): duas turmas do mesmo curso e ano nao tem o mesmo rotulo, e o VAZIO e um caso '
  'particular de igual — `NULLS NOT DISTINCT`, do PostgreSQL 15+. Cobre os QUATRO caminhos de '
  'colisao numa declaracao so: remover o rotulo, troca-lo por um usado, mudar o ano e mudar o curso. '
  'O nome e estavel: e por ele que a recusa e traduzida e que o `020_unicidade.sql` a nomeia.';

-- =================================================================================
-- PLANO DE REVERSAO — ESCRITO E EXECUTADO em 17/09/2026, numa base descartavel (T033)
--
-- ⚠️ O CARIMBO DO ARQUIVO E UTC, A DATA DO REGISTRO E A DO RELOGIO. `20260918002208` e 00:22 UTC;
--    aqui eram 21:22 de 17/09/2026. As datas dos registros desta fatia seguem o relogio da maquina.
--
-- COMO FOI EXECUTADO: `pnpm db:reset` SEM as tres migrations, carga do ETL (reconciliacao APROVADA),
-- as tres aplicadas por `supabase migration up` SOBRE a base carregada — e aplicaram limpo.
-- ⚠️ MEDIDO ALI, e e a prova que importa para esta migration: das **28 turmas reais**, **0 estao fora
-- do formato** `sigla [rotulo] ano` — o gatilho poderia ter recusado a base inteira, e nao recusou
-- nenhuma —, e `turmas_unica_por_ano` ficou `UNIQUE NULLS NOT DISTINCT` sem saneamento.
-- Depois da reversao: um codigo inventado (`CODIGO INVENTADO DA REVERSAO`) volta a ser ACEITO, as 28
-- turmas continuam intactas, e os 20 arquivos pgTAP anteriores ficaram verdes — so o `101` reprova,
-- que e o que se espera dele.
--
--   drop trigger if exists trg_turmas_codigo on public.turmas;
--   drop function if exists app.gerar_codigo_da_turma();
--
--   alter table public.turmas drop constraint turmas_unica_por_ano;
--   alter table public.turmas
--     add constraint turmas_unica_por_ano unique (curso_id, ano_letivo, turma);
--
-- ⚠️ OS CODIGOS JA GERADOS FICAM. Eles sao o codigo REAL das turmas, saem impressos no DSA, e
--    apaga-los seria reverter dado, nao migration.
--
-- ⚠️ E REVERTER DEVOLVE DOIS BURACOS: codigo de turma volta a ser digitavel e mutavel por qualquer
--    caminho de escrita, e duas turmas SEM rotulo no mesmo curso e ano voltam a passar pela
--    restricao — colidindo so no codigo, com mensagem que fala de codigo para quem nao informou
--    rotulo nenhum.
-- =================================================================================
