-- =================================================================================
-- Migration 1 de 7 — Epico 5, fatia (a): a lista de salas e a validacao da sala da turma
--
-- O QUE  : `config_listas` ganha `metadados jsonb`; a lista `salas` nasce com os 8 valores do
--          inventario institucional, cada um declarando se e ambiente virtual; as turmas ja
--          gravadas sao reconciliadas com esses nomes; e `turmas.sala_alocada` passa a ser
--          conferida pelo gatilho generico de dominio.
--
-- ORIGEM : FR-029, FR-029.1 a FR-029.7, FR-046 · spec `009-cursos-e-turmas` · R-4, R-11
--          Decisoes de Bernardo Villas Boas de 16/09/2026 (Q-23, Q-23.1) e 17/09/2026 (B-2).
--
-- ⚠️ O INVENTARIO E INSTITUCIONAL, NAO INFERIDO DO DADO. Os 8 nomes foram informados por Bernardo.
--    "Sala 05" NAO consta, e a ausencia e DELIBERADA — nao acrescentar "por completude". Semear a
--    lista a partir das salas ja gravadas nas turmas e proibido pelo FR-029.
--
-- ⚠️ A RESTRICAO DA NATUREZA TEM DUAS METADES, e a primeira e a que importa (B-2, 17/09/2026).
--    Escrita so como `jsonb_typeof(metadados -> 'ambiente_virtual') = 'boolean'`, ela ACEITARIA a
--    sala sem a chave: chave ausente da nulo, a comparacao da nulo, e CHECK com resultado nulo
--    PASSA. O operador `?` devolve FALSO, nunca nulo, quando a chave falta — e e ele que faz a
--    ausencia ser recusada. `{"ambiente_virtual": null}` tambem e recusado: o tipo JSON dele e
--    `null`, nao `boolean`. Sem as duas metades, o padrao silencioso que o FR-029.6 proibiu
--    voltaria pela porta dos fundos.
--
-- ⚠️ PARAMETRO, NAO FUNCAO-VARIANTE (R-4). `app.validar_dominio_config_lista()` ganha DOIS
--    argumentos opcionais: `TG_ARGV[2] = 'aceita_inativo'` e `TG_ARGV[3] = <chave estavel>`. Sem
--    eles, o comportamento e o de hoje BYTE A BYTE — mensagem, HINT e ausencia de DETAIL —, e os
--    QUATRO gatilhos que ja a usam (`registros_aula.tipo_atividade`, `registros_aula.metodologia`,
--    `avaliacoes.tipo_avaliacao`, `avaliacoes.metodologia`) NAO sao recriados e nao mudam. Uma
--    variante copiaria a funcao inteira para trocar duas linhas, e as duas copias divergiriam na
--    proxima correcao. O pgTAP `099_salas.sql` prova as duas metades: que a sala emite a chave, e
--    que o `tipo_atividade` inativo continua recusado com a mensagem de sempre.
--
-- ⚠️ POR QUE A CHAVE ESTAVEL (decisao de Bernardo Villas Boas, 17/09/2026, achado E-8). O contrato
--    de escritas §2 diz que a Server Action le CODIGO, CHAVE e DADOS — e nunca o `message` cru
--    (FR-042, RN-DEG-01). Sem a chave, a recusa de sala chegaria a tela como uma frase, e a unica
--    forma de reconhece-la seria comparar texto. Com `TG_ARGV[3]`, ela chega como
--    `sala_fora_da_lista` no HINT e `{valor, lista}` no DETAIL, sem que a funcao compartilhada
--    mude para quem ja a usava.
--
-- ⚠️ SALA DESATIVADA CONTINUA ACEITA (FR-029.4), e isso NAO e lacuna: desativar e sair do seletor
--    de turma NOVA, nunca recusar a edicao de turma que ja a usa. Ligado sem o terceiro argumento,
--    o gatilho recusaria a edicao de qualquer turma cuja sala foi desativada.
--
-- ⚠️ A RECONCILIACAO NAO ALCANCA A CARGA DO ETL (R-20, B-20). `pnpm db:reset` aplica esta migration
--    sobre a base VAZIA, e a carga vem DEPOIS. Por isso o ETL aplica A MESMA lista de substituicoes
--    (FR-029.8) e registra cada troca em `migracao_log` como `corrigido`. A lista e uma so.
-- =================================================================================

-- ---------------------------------------------------------------- 1. o campo de metadado
alter table public.config_listas
  add column if not exists metadados jsonb not null default '{}'::jsonb;

comment on column public.config_listas.metadados is
  'Atributos do proprio registro da lista, por lista. Em `salas`, a chave `ambiente_virtual` '
  '(booleana, obrigatoria) distingue sala fisica de ambiente virtual (FR-029.1). Comparar com o '
  'texto "Moodle" em codigo e proibido: se amanha surgir outro ambiente virtual, a regra continua '
  'valendo sem alterar codigo.';

-- ---------------------------------------------------------------- 2. o inventario, com a natureza
-- 7 fisicas e 1 virtual. A ordem e a de leitura da lista na tela, nao classificacao.
insert into public.config_listas (lista, valor, rotulo_exibicao, ordem, metadados) values
  ('salas', 'Sala CAHO',                  'Sala CAHO',                  1, '{"ambiente_virtual": false}'::jsonb),
  ('salas', 'Sala 01',                    'Sala 01',                    2, '{"ambiente_virtual": false}'::jsonb),
  ('salas', 'Sala 02',                    'Sala 02',                    3, '{"ambiente_virtual": false}'::jsonb),
  ('salas', 'Sala 03',                    'Sala 03',                    4, '{"ambiente_virtual": false}'::jsonb),
  ('salas', 'Sala 04',                    'Sala 04',                    5, '{"ambiente_virtual": false}'::jsonb),
  ('salas', 'Sala 06',                    'Sala 06',                    6, '{"ambiente_virtual": false}'::jsonb),
  ('salas', 'Laboratório de Informática', 'Laboratório de Informática', 7, '{"ambiente_virtual": false}'::jsonb),
  ('salas', 'Moodle',                     'Moodle',                     8, '{"ambiente_virtual": true}'::jsonb)
on conflict (lista, valor) do nothing;

-- ---------------------------------------------------------------- 3. a reconciliacao, ANTES do gatilho
-- FR-029.3, na ordem exigida: listar o que esta gravado, casar ignorando caixa e acento,
-- substituir o que e claramente a mesma sala, e ABORTAR nomeando o que sobrar sem par.
--
-- LISTA DE SUBSTITUICOES MEDIDA EM 17/09/2026, na base local carregada pelo ETL:
--
--   | Gravado nas turmas           | Canonico                     | Turmas |
--   |------------------------------|------------------------------|--------|
--   | 'Laboratório de informática' | 'Laboratório de Informática' |      9 |
--
--   As outras 6 grafias batem EXATAMENTE com o inventario (Moodle 6, Sala 04 5, Sala 02 2,
--   Sala 06 2, Sala 03 1, Sala CAHO 1) e 2 turmas estao sem sala — e continuam sem sala.
--   NENHUM valor ficou sem correspondencia. A conferencia e refeita AQUI, no momento em que a
--   migration roda, porque a base viva continua sendo escrita: o que valia em 17/09 nao e
--   promessa sobre o dia da aplicacao no remoto.
do $$
declare
  v_trocas int := 0;
  v_orfas  text;
begin
  -- Casa por `app.normalizar_texto()` — minusculas, sem acento, espaco colapsado — e so troca
  -- quando o texto gravado DIFERE do canonico. Grafia identica nao e "substituicao".
  with canonico as (
    select valor, app.normalizar_texto(valor) as chave
      from public.config_listas
     where lista = 'salas'
  )
  update public.turmas t
     set sala_alocada = c.valor
    from canonico c
   where coalesce(btrim(t.sala_alocada), '') <> ''
     and app.normalizar_texto(t.sala_alocada) = c.chave
     and t.sala_alocada <> c.valor;
  get diagnostics v_trocas = row_count;

  if v_trocas > 0 then
    raise notice 'FR-029.3 · % turma(s) tiveram a grafia da sala normalizada para o inventario.', v_trocas;
  end if;

  -- O passo 4: o que NAO casa nem por normalizacao nao vira sala nova e nao e apagado — a
  -- migration para, nomeando o valor, para ser relatado antes de prosseguir.
  select string_agg(distinct format('%L (turma %s)', t.sala_alocada, t.codigo), ', ')
    into v_orfas
    from public.turmas t
   where coalesce(btrim(t.sala_alocada), '') <> ''
     and not exists (
       select 1 from public.config_listas c
        where c.lista = 'salas' and c.valor = t.sala_alocada
     );

  if v_orfas is not null then
    raise exception
      'FR-029.3 · sala gravada sem correspondencia no inventario: %. Relatar a Bernardo antes de '
      'prosseguir — nao inventar sala nova e nao apagar o valor.', v_orfas
      using errcode = '23514';
  end if;
end;
$$;

-- ---------------------------------------------------------------- 4. a natureza, obrigatoria
alter table public.config_listas
  add constraint config_listas_sala_com_natureza
  check (
    lista <> 'salas'
    or (
      metadados ? 'ambiente_virtual'
      and jsonb_typeof(metadados -> 'ambiente_virtual') = 'boolean'
    )
  );

comment on constraint config_listas_sala_com_natureza on public.config_listas is
  'FR-029.7 (B-2, 17/09/2026): toda linha da lista `salas` declara `ambiente_virtual` como booleano. '
  'As duas metades sao necessarias: sem o operador `?`, a chave AUSENTE passaria, porque CHECK com '
  'resultado nulo passa. Ausencia da chave e rejeitada, nunca interpretada como "fisica".';

-- ---------------------------------------------------------------- 5. o gatilho generico, com parametro
create or replace function app.validar_dominio_config_lista()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_coluna  text := tg_argv[0];       -- nome da coluna a validar
  v_lista   text := tg_argv[1];       -- nome da lista em config_listas
  -- ⚠️ TERCEIRO ARGUMENTO, OPCIONAL (R-4, spec 009). Sem ele, o comportamento e o de hoje: so
  --    valor ATIVO e aceito. Com 'aceita_inativo', valor desativado tambem passa — e o que o
  --    FR-029.4 exige da sala, e o que os quatro gatilhos anteriores NAO querem.
  v_inativo boolean := coalesce(tg_argv[2], '') = 'aceita_inativo';
  -- ⚠️ QUARTO ARGUMENTO, OPCIONAL (E-8, 17/09/2026): a chave estavel que a traducao de recusas
  --    reconhece. Ausente, a recusa sai exatamente como sempre saiu.
  v_chave   text := nullif(tg_argv[3], '');
  v_valor   text;
begin
  v_valor := to_jsonb(new) ->> v_coluna;

  -- Ausência é sempre válida: o domínio restringe o que EXISTE, não obriga a existir.
  if v_valor is null or btrim(v_valor) = '' then
    return new;
  end if;

  if not exists (
    select 1 from public.config_listas c
     where c.lista = v_lista and c.valor = v_valor and (c.ativo or v_inativo)
  ) then
    -- Os dois ramos sao deliberadamente separados: o de baixo tem de sair BYTE A BYTE como sempre
    -- saiu, e `using detail = ''` NAO e o mesmo que nao mandar DETAIL nenhum.
    if v_chave is not null then
      raise exception
        'O valor "%" não pertence à lista "%" (coluna %.%).',
        v_valor, v_lista, tg_table_name, v_coluna
        using errcode = '23514',
              hint = v_chave,
              detail = jsonb_build_object('valor', v_valor, 'lista', v_lista)::text;
    else
      raise exception
        'O valor "%" não pertence à lista "%" (coluna %.%).',
        v_valor, v_lista, tg_table_name, v_coluna
        using errcode = '23514',
              hint = 'Cadastre o valor em config_listas antes de usá-lo, ou escolha um valor ativo da lista. Origem: BRIEF v2.1 §2 (domínio operacional administrável).';
    end if;
  end if;

  return new;
end;
$$;

comment on function app.validar_dominio_config_lista() is
  'Gatilho generico de dominio administravel. TG_ARGV[0] coluna, TG_ARGV[1] lista; TG_ARGV[2] e '
  'TG_ARGV[3] sao OPCIONAIS — "aceita_inativo" faz valor desativado ser aceito (FR-029.4 da spec '
  '009), e o quarto e a chave estavel emitida no HINT, com {valor, lista} no DETAIL (E-8). Sem os '
  'dois, o comportamento e o de sempre, byte a byte, e os quatro gatilhos anteriores nao foram '
  'recriados.';

revoke all on function app.validar_dominio_config_lista() from public, anon;

-- ---------------------------------------------------------------- 6. a sala da turma, conferida
create trigger trg_turmas_sala_alocada
  before insert or update of sala_alocada on public.turmas
  for each row execute function app.validar_dominio_config_lista(
    'sala_alocada', 'salas', 'aceita_inativo', 'sala_fora_da_lista');

-- =================================================================================
-- PLANO DE REVERSAO — ESCRITO E EXECUTADO em 17/09/2026, numa base descartavel (T021)
--
-- COMO FOI EXECUTADO, e o que saiu: `pnpm db:reset` SEM esta migration, carga do ETL (reconciliacao
-- APROVADA), migration aplicada por `supabase migration up` sobre a base ja carregada — as 9 turmas
-- passaram a `Laboratório de Informática` —, e entao o script abaixo, inteiro, numa transacao.
-- Resultado conferido: 9 turmas de volta a grafia anterior, 8 salas presentes e `ativo = false`,
-- gatilho ausente, sala fora de lista aceita de novo, e os 18 arquivos pgTAP ANTERIORES verdes.
-- (O `099_salas.sql` reprova na base revertida, e e o que se espera dele: ele testa o que esta
-- migration instala.)
--
--   drop trigger if exists trg_turmas_sala_alocada on public.turmas;
--
--   -- volta a funcao ao que era: sem o terceiro nem o quarto argumento. Os quatro gatilhos que a
--   -- usam continuam apontando para ela e nao precisam ser recriados — e o mesmo nome e a mesma
--   -- assinatura.
--   create or replace function app.validar_dominio_config_lista() ... (sem v_inativo)
--
--   alter table public.config_listas drop constraint if exists config_listas_sala_com_natureza;
--
--   -- As 8 salas NAO sao apagadas (regra 4 do CLAUDE.md — nada e apagado):
--   update public.config_listas set ativo = false where lista = 'salas';
--
--   -- E as 9 turmas voltam a grafia anterior, para a base ficar como estava:
--   update public.turmas set sala_alocada = 'Laboratório de informática'
--    where sala_alocada = 'Laboratório de Informática';
--
--   -- AS 9 TURMAS, NOMEADAS (medidas em 17/09/2026, antes da reversao):
--   --   C-ApA-AuxNav-PR-SP T1 2026 · C-ApA-OcOp-PR-SP T1 2026 · C-Esp-ALH 2026 ·
--   --   C-Esp-OpAP T1 2026 · C-Exp-Metoc-OF-SP 2026 · C-Exp-MetocOf 2026 ·
--   --   EST-QF-APHID 2026 · EST-QF-APOC 2026 · EST-QF-EM2040PHS 2026
--   -- Se a lista do dia da reversao for OUTRA, e porque a base foi escrita depois: reverter a
--   -- grafia de turma que ninguem normalizou seria estragar dado, nao reverter.
--
-- ⚠️ A COLUNA `metadados` NAO E REVERTIDA. `drop column` e proibido em tabela com historico
--    (CLAUDE.md, Convencoes de banco): ela fica, com `default '{}'`, inerte para quem nao a le.
--
-- ⚠️ REVERTER DEVOLVE A SALA A TEXTO LIVRE: qualquer valor volta a ser aceito em `turmas`, e a
--    distincao fisico/virtual deixa de existir para o Epico 6 (RN-CONF-01) e para o 7 (RF-CRONOS-09).
-- =================================================================================
