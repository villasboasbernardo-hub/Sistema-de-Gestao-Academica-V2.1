-- =================================================================================
-- Migration 2 de 7 — Epico 5, fatia (a): obrigatorios, rotulo e auditoria da sigla
--
-- O QUE  : quatro assuntos, numa migration coesa (Principio VI, com a excecao registrada).
--          A. nenhum valor-padrao silencioso em `cursos` e `turmas`; o limite de turmas vem
--             da classificacao por GATILHO, e continua editavel; `ead_semipresencial` recusado;
--          B. o rotulo da turma tem forma imposta pelo banco: `T<n>`;
--          C. `curso_sigla_historico` — tabela nova, escrita SO por gatilho, sem alteracao
--             nem exclusao por caminho nenhum;
--          D. sigla que ja foi de OUTRO curso e recusada, com o curso e a data na mensagem.
--
-- ORIGEM : FR-003.1, FR-003.2, FR-014.1 a FR-014.3, FR-015, FR-015.1, FR-015.2, FR-027,
--          FR-046 · spec `009-cursos-e-turmas` · B-11, B-12, B-13, B-14, B-21, B-22, R-26.
--          Decisoes de Bernardo Villas Boas de 16/09/2026 (Q-08, Q-19, Q-20) e 17/09/2026.
--
-- ⚠️ POR QUE O `DEFAULT 1` DE `limite_turmas_ano` SAI, e o gatilho entra. Com o DEFAULT, o
--    gatilho recebe `1` tanto quando a pessoa ESCOLHEU 1 quanto quando NAO INFORMOU nada, e
--    nao tem como distinguir — ou sobrescreve a escolha, ou deixa passar o 1 errado num
--    Expedito. Sem ele, o ausente chega NULO, o gatilho preenche, e o `NOT NULL` continua
--    valendo porque e conferido DEPOIS dos gatilhos `BEFORE`. `DEFAULT` nao enxerga outra
--    coluna da linha; e por isso que a classificacao so pode ser lida por gatilho.
--
-- ⚠️ E O `DEFAULT` DE `prioridade_alocacao` FICA — excecao declarada ao FR-015.1, justificada
--    no FR-015.2 [B-19]: nao e campo do cadastro desta fatia, e o valor e a regra em vigor do
--    motor de alocacao, nao um palpite sobre o que a pessoa quis dizer.
--
-- ⚠️ `ead_semipresencial` NAO E SO O FORMULARIO. O recorte do Operador e
--    `classificacao = escopo`: um curso gravado com esse valor ficaria INVISIVEL para todos os
--    Operadores, e a tela some, mas a chamada direta a interface de dados nao (FR-003.1).
--    Medido em 16/09/2026: nenhum dos 24 cursos tem esse valor — entra sem saneamento.
--
-- ⚠️ A SIGLA E DIGITADA E EDITAVEL [B-12], e trocar a sigla NAO CASCATEIA (FR-014.2): o codigo
--    da turma e carimbado na criacao e SAI IMPRESSO NO DSA. Reescreve-lo retroativamente seria
--    a mesma reescrita silenciosa de documento ja emitido que a RN-2027-09 impede para o regime.
--    Turma antiga carregando a sigla antiga e HISTORIA CORRETA, nao inconsistencia.
--
-- ⚠️ E O QUARTETO DE AUDITORIA NAO SERVE PARA REGISTRAR A TROCA. `app.set_auditoria()` guarda
--    quem fez a ULTIMA edicao e quando: perde a sigla anterior, e a edicao seguinte apaga o
--    autor. Um rastro dentro de `cursos` ainda poderia ser reescrito pela mesma operacao que
--    troca a sigla. Por isso a tabela [B-21], que nao se altera nem se apaga.
-- =================================================================================

-- =================================================================================
-- PARTE A — nenhum valor-padrao silencioso, e o limite pela classificacao
-- =================================================================================

alter table public.cursos alter column modalidade        drop default;
alter table public.cursos alter column limite_turmas_ano drop default;
alter table public.cursos alter column duracao_dias      set not null;
alter table public.turmas alter column modalidade        set not null;

-- ⚠️ A CATRACA DA MODALIDADE DO CURSO (decisao de Bernardo Villas Boas, 17/09/2026, achado E-6).
--
--    MEDIDO NA ORIGEM, e nao na base carregada: `scripts/etl/dados/bruto/v20/Cad_Cursos.csv` tem
--    **13 dos 24 cursos com `Modalidade` VAZIA** — CAHO, C-Ap-HN, C-Espc-HN, C-Exp-Ag-Mag,
--    C-Exp-BATI, C-Exp-Obs-ME, C-Esp-ALH, C-Esp-ME, EST-QF-APOC, EST-QF-APHID, EST-QF-EM2040PHS,
--    EST-QF-PGRS100 e EST-QF-MAREFLU. Ate hoje o `DEFAULT 'presencial'` os preenchia em silencio,
--    e `promover.py` dependia disso (`coalesce(expr, <default>)`, lido do `information_schema`).
--
--    Tirado o default, restavam tres saidas. A escolhida e a (b), A CATRACA — o padrao ja ratificado
--    no achado 3 do Epico 2 para ausencia que pertence SO ao historico: nulo e admitido apenas em
--    linha MIGRADA e NUNCA EDITADA; linha nova exige a modalidade, e editar a migrada tambem.
--
--    RECUSADA a (a), gravar `presencial` para os 13 mesmo que declarado e logado: contraria o
--    principio ratificado em 08/09/2026 — *"o ETL e retrato fiel da origem, sem preenchimentos
--    inventados"* — e, pior que o principio, o EFEITO: valor inventado, uma vez gravado, fica
--    INDISTINGUIVEL de valor real, porque relatorio, DSA e decisao leem a coluna, nao o
--    `migracao_log`. E entre os 13 ha cursos da familia EST-QF, que tem curso EAD na base: seria
--    palpite com contraexemplo conhecido ao lado.
--
--    E a (c) — Bernardo informar a modalidade dos 13 — nao foi recusada: foi ADIADA pela propria
--    catraca. O dado fica visivelmente ausente, o sistema acusa, e a modalidade passa a ser exigida
--    no momento em que alguem editar aquele curso — com a informacao a frente da pessoa certa, um
--    curso por vez.
alter table public.cursos alter column modalidade drop not null;

alter table public.cursos
  add constraint cursos_modalidade_so_nula_no_historico check (
    modalidade is not null
    or (origem_migracao_v1 is not null and editado_em is null)
  );

comment on constraint cursos_modalidade_so_nula_no_historico on public.cursos is
  'FR-015.1 com a catraca do achado 3 do Epico 2 (decisao de 17/09/2026): a modalidade so pode ser '
  'nula em linha MIGRADA e NUNCA EDITADA. Os 13 cursos que a v2.0 deixou em branco entram assim, '
  'visivelmente ausentes, em vez de receber um "presencial" inventado que nenhum relatorio '
  'distinguiria de escolha real. Curso NOVO continua obrigado a declara-la, e editar um curso '
  'historico passa a exigi-la: o historico pode ficar incompleto, mas nao pode ser MANTIDO '
  'incompleto por quem mexe nele. ⚠️ Residual conhecido, o mesmo do CHK023: um INSERT novo que '
  'preencha `origem_migracao_v1` escapa — a catraca torna a fraude DELIBERADA, nao acidental.';

comment on column public.cursos.modalidade is
  'FR-015.1: SEM default. Ausencia e rejeitada, nunca interpretada como "presencial" — o padrao '
  'silencioso impede distinguir quem escolheu de quem nao informou. Anulavel APENAS no historico '
  'migrado nao editado (constraint cursos_modalidade_so_nula_no_historico).';
comment on column public.cursos.limite_turmas_ano is
  'FR-003.2: SEM default. Chega nulo quando nao informado, e `app.limite_de_turmas_pela_classificacao()` '
  'preenche pela classificacao (regular -> 1, demais -> 2). Informado explicitamente, e RESPEITADO, '
  'inclusive um 1 num Expedito [B-13].';
comment on column public.turmas.modalidade is
  'FR-015, FR-027: obrigatoria, e NUNCA copiada do curso — e ela que decide a capacidade diaria '
  '(RN-MAT-04), e uma turma EAD de curso presencial e caso real.';

create or replace function app.limite_de_turmas_pela_classificacao()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  -- SO se nao veio. Limite informado e escolha da pessoa, e o gatilho nao tem opiniao sobre ela.
  if new.limite_turmas_ano is null then
    new.limite_turmas_ano := case when new.classificacao = 'regular' then 1 else 2 end;
  end if;
  return new;
end;
$$;

comment on function app.limite_de_turmas_pela_classificacao() is
  'FR-003.2 (Q-20, 16/09/2026): preenche `cursos.limite_turmas_ano` pela classificacao — 1 para '
  'regular, 2 para as demais — APENAS quando o valor nao foi informado. Nao e `DEFAULT` de coluna '
  'porque `DEFAULT` nao enxerga outra coluna da linha. ⚠️ E POR ANO LETIVO, nunca total.';

revoke all on function app.limite_de_turmas_pela_classificacao() from public, anon;

-- ⚠️ Roda ANTES de `app.set_auditoria()` pela ordem alfabetica do nome do gatilho, e a ordem nao
--    importa aqui: um mexe no limite, o outro no quarteto.
create trigger trg_cursos_limite_pela_classificacao
  before insert on public.cursos
  for each row execute function app.limite_de_turmas_pela_classificacao();

-- A classificacao que o recorte do Operador nao alcanca entra na MESMA restricao que ja recusa
-- `geral` — o nome fica, porque e ele que a Server Action traduz.
alter table public.cursos drop constraint cursos_classificacao_nao_geral;
alter table public.cursos add constraint cursos_classificacao_nao_geral
  check (classificacao not in ('geral', 'ead_semipresencial'));

comment on constraint cursos_classificacao_nao_geral on public.cursos is
  'FR-003.1: `geral` e sentinela (achado 4 do Epico 2), nao curso; `ead_semipresencial` deixaria o '
  'curso invisivel para todo Operador, porque o recorte dele e `classificacao = escopo`. O nome da '
  'restricao NAO muda: e a chave que a traducao de recusas usa.';

-- =================================================================================
-- PARTE B — o rotulo da turma
-- =================================================================================

-- A unicidade do FR-026 e por IGUALDADE DE TEXTO: `t1`, `T1 ` e `Turma 1` passariam por ela
-- como rotulos DIFERENTES da `T1`, e gerariam codigo de turma fora do padrao.
-- Medido em 16/09/2026: os 10 rotulos da base sao `T1` ou `T2` — entra sem saneamento.
alter table public.turmas add constraint turmas_rotulo_forma
  check (turma is null or turma ~ '^T[1-9][0-9]*$');

comment on constraint turmas_rotulo_forma on public.turmas is
  'FR-025.2 [B-11]: o rotulo, quando preenchido, e `T` maiusculo seguido de inteiro positivo, sem '
  'espaco. Ausencia continua legitima e permanente (FR-025.1) — turma unica no ano nao tem rotulo. '
  'NAO e motivo de endereco: o FR-031.1 proibe restringir rotulo por causa de URL.';

-- =================================================================================
-- PARTE C — `curso_sigla_historico`: a troca de sigla, registrada e imutavel
-- =================================================================================

create table public.curso_sigla_historico (
  id                  uuid primary key default gen_random_uuid(),
  curso_id            uuid not null references public.cursos (id) on delete restrict,
  sigla_anterior      text not null,
  sigla_nova          text not null,
  origem_migracao_v1  text,
  -- O quarteto de auditoria segue a convencao das 27 tabelas: `uuid` SEM chave estrangeira. Uma FK
  -- aqui faria a gravacao do gatilho falhar no dia em que a conta do autor deixasse de existir, e
  -- seria a unica tabela do schema a exigi-la.
  criado_por          uuid,
  criado_em           timestamptz not null default now(),
  editado_por         uuid,
  editado_em          timestamptz,
  constraint curso_sigla_historico_siglas_diferentes check (sigla_anterior <> sigla_nova)
);

comment on table public.curso_sigla_historico is
  'FR-014.1 [B-21, 17/09/2026]: uma linha por troca de sigla de curso — anterior, nova, quem e quando. '
  'Escrita SO pelo gatilho `app.registrar_troca_de_sigla()`; sem alteracao e sem exclusao por caminho '
  'nenhum, inclusive `service_role`. `editado_por` e `editado_em` nascem e ficam nulos: a linha nao e '
  'editada. Sem tela nesta fatia — leitura por `auditoria.ler`.';

create index idx_curso_sigla_historico_curso on public.curso_sigla_historico (curso_id);

alter table public.curso_sigla_historico enable row level security;

-- Leitura pelo mesmo recurso que guarda `migracao_log`: Admin, Chefe do Departamento,
-- Encarregado e Ajudante da Divisao (medido na matriz em 17/09/2026).
create policy curso_sigla_historico_ler on public.curso_sigla_historico
  for select to authenticated
  using (app.pode('auditoria', 'ler'));

-- ⚠️ NENHUMA policy de INSERT, UPDATE ou DELETE. E o privilegio vai junto: view e tabela novas
--    nascem com ALL para `authenticated` no Supabase, e o `revoke ... on all tables` do Epico 1 e
--    UMA FOTO DO MOMENTO, nao regra permanente — toda migration que cria tabela repete o revoke.
revoke insert, update, delete, truncate on public.curso_sigla_historico from authenticated, anon;

create trigger trg_curso_sigla_historico_auditoria
  before insert on public.curso_sigla_historico
  for each row execute function app.set_auditoria();

-- ⚠️ E ESTE DESENHO NAO E O DA `curso_regime_historico` — nao uniformizar (registrado em
--    18/09/2026). Aqui o `UPDATE` e BLOQUEADO por statement, porque esta tabela e append-only PURO:
--    linha gravada nao tem escrita legitima nenhuma. La, o `FR-020` manda aceitar EXATAMENTE DUAS
--    escritas numa linha existente — `vigente_ate` e o cancelamento —, e um gatilho de statement em
--    `UPDATE` recusaria as duas; por isso la o `UPDATE` e guardado por gatilho de LINHA, coluna a
--    coluna. Uniformizar os dois quebra um dos dois requisitos.
--
-- ⚠️ DOIS gatilhos de STATEMENT, e o de TRUNCATE e deliberado. O de `migracao_log` e so
--    `BEFORE DELETE OR UPDATE`, e a `service_role` TEM o privilegio de TRUNCATE nela — medido e
--    provado em 17/09/2026 numa tabela descartavel (R-22). TRUNCATE nao dispara gatilho de linha
--    nem passa pela RLS: sem este, a auditoria inteira seria esvaziavel sem deixar rastro. A
--    lacuna do `migracao_log` esta anotada na regra 5 do CLAUDE.md (pendencia PEND-5a-3) e NAO e
--    corrigida aqui, por decisao — mas ela nao se repete nesta tabela.
create trigger trg_curso_sigla_historico_imutavel
  before update or delete on public.curso_sigla_historico
  for each statement execute function app.bloquear_reescrita();

create trigger trg_curso_sigla_historico_sem_truncate
  before truncate on public.curso_sigla_historico
  for each statement execute function app.bloquear_reescrita();

create or replace function app.registrar_troca_de_sigla()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- `AFTER UPDATE OF codigo` dispara quando a coluna e ENVIADA, mesmo com o mesmo valor. Registrar
  -- ai encheria a auditoria de linhas que nao sao troca nenhuma — e a restricao de siglas
  -- diferentes recusaria a gravacao, derrubando uma edicao legitima de outro campo.
  if new.codigo is not distinct from old.codigo then
    return null;
  end if;

  -- A trava de aconselhamento pela sigla DEIXADA. A conferencia do gatilho de recusa pega a mesma
  -- trava pela sigla ADOTADA: duas trocas simultaneas que se cruzam nao passam juntas (R-26).
  perform pg_advisory_xact_lock(hashtext('curso_sigla:' || old.codigo));

  insert into public.curso_sigla_historico (curso_id, sigla_anterior, sigla_nova)
  values (new.id, old.codigo, new.codigo);

  return null;
end;
$$;

comment on function app.registrar_troca_de_sigla() is
  'FR-014.1: grava em `curso_sigla_historico` quando a sigla MUDOU DE VALOR. `SECURITY DEFINER` '
  'porque a tabela nao tem policy de escrita para ninguem — a escrita e do gatilho, nunca da sessao.';

revoke all on function app.registrar_troca_de_sigla() from public, anon;

create trigger trg_cursos_registrar_troca_de_sigla
  after update of codigo on public.cursos
  for each row execute function app.registrar_troca_de_sigla();

-- =================================================================================
-- PARTE D — sigla que ja foi de OUTRO curso e recusada
-- =================================================================================

create or replace function app.recusar_sigla_de_outro_curso()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_dono record;
begin
  if tg_op = 'UPDATE' and new.codigo is not distinct from old.codigo then
    return new;
  end if;

  -- A mesma trava de aconselhamento da funcao acima, agora pela sigla ADOTADA (R-26).
  perform pg_advisory_xact_lock(hashtext('curso_sigla:' || new.codigo));

  -- ⚠️ "Ja pertenceu a OUTRO curso" vem de `curso_sigla_historico`, e a excecao explicita e o
  --    proprio curso: ele PODE voltar a uma sigla que foi dele. E seguro — a unicidade de rotulo
  --    por curso e ano (FR-026) ja impede codigo de turma repetido DENTRO do mesmo curso.
  --    Sigla que pertence HOJE a outro curso continua recusada pela unicidade de `cursos.codigo`.
  select c.codigo as sigla_atual, c.nome_curso, h.criado_em::date as deixada_em
    into v_dono
    from public.curso_sigla_historico h
    join public.cursos c on c.id = h.curso_id
   where h.sigla_anterior = new.codigo
     and h.curso_id <> new.id
   order by h.criado_em desc
   limit 1;

  if found then
    raise exception
      'A sigla % ja identificou outro curso e continua nos codigos das turmas dele.', new.codigo
      using errcode = '23505',
            hint = 'sigla_de_outro_curso',
            detail = jsonb_build_object(
                       'sigla', new.codigo,
                       'curso_sigla_atual', v_dono.sigla_atual,
                       'curso_nome', v_dono.nome_curso,
                       'deixada_em', v_dono.deixada_em
                     )::text;
  end if;

  return new;
end;
$$;

comment on function app.recusar_sigla_de_outro_curso() is
  'FR-014.3 [B-22, 17/09/2026]: RECUSA — nunca aviso — que um curso adote sigla que ja foi de OUTRO '
  'curso, por criacao ou por edicao. Reusar sigla alheia torna a identidade ambigua: dois cursos '
  'emitindo documento com a mesma sigla e codigos de turma colidindo. Deixar a colisao aparecer '
  'depois levaria a falha para LONGE da causa — na criacao de uma turma do outro curso, para quem '
  'talvez nem tenha alcance para ver a turma antiga que a provocou. Voltar a sigla PROPRIA e aceito.';

revoke all on function app.recusar_sigla_de_outro_curso() from public, anon;

create trigger trg_cursos_recusar_sigla_de_outro_curso
  before insert or update of codigo on public.cursos
  for each row execute function app.recusar_sigla_de_outro_curso();

-- =================================================================================
-- PLANO DE REVERSAO — ESCRITO E EXECUTADO em 17/09/2026, numa base descartavel (T028)
--
-- COMO FOI EXECUTADO: `pnpm db:reset` SEM as migrations 1 e 2, carga do ETL (reconciliacao
-- APROVADA, 24 cursos e 28 turmas reais), as duas migrations aplicadas por `supabase migration up`
-- SOBRE a base ja carregada — e aplicaram limpo: 0 cursos sem modalidade, limites 1 e 2 como a
-- regra manda, rotulos so `T1`, `T2` e vazio. Entao o script abaixo, inteiro, numa transacao.
--
-- CONFERIDO DEPOIS DA REVERSAO: curso criado sem modalidade volta a nascer `presencial`, Expedito
-- volta a nascer com limite 1 (o gatilho se foi), `duracao_dias` aceita nulo de novo, e
-- `curso_sigla_historico` CONTINUA DE PE, vazia. Os 19 arquivos pgTAP anteriores ficaram VERDES;
-- so o `100` e o `101` reprovam, e e o que se espera deles — eles testam o que esta migration
-- instala. O `010` passa porque a tabela fica: o conjunto de nomes continua com as 28.
--
--   -- D
--   drop trigger if exists trg_cursos_recusar_sigla_de_outro_curso on public.cursos;
--   drop function if exists app.recusar_sigla_de_outro_curso();
--
--   -- C — ⚠️ A TABELA `curso_sigla_historico` FICA, com os gatilhos que a protegem. Sai so o
--   --     que a ALIMENTA. Reverter uma auditoria apagando a auditoria seria o oposto do que ela
--   --     existe para fazer (regra 4 do CLAUDE.md), e as linhas ja gravadas sao fato historico.
--   drop trigger if exists trg_cursos_registrar_troca_de_sigla on public.cursos;
--   drop function if exists app.registrar_troca_de_sigla();
--
--   -- B
--   alter table public.turmas drop constraint if exists turmas_rotulo_forma;
--
--   -- A
--   alter table public.cursos drop constraint cursos_classificacao_nao_geral;
--   alter table public.cursos add constraint cursos_classificacao_nao_geral
--     check (classificacao <> 'geral'::escopo_curso);
--   drop trigger if exists trg_cursos_limite_pela_classificacao on public.cursos;
--   drop function if exists app.limite_de_turmas_pela_classificacao();
--   alter table public.turmas alter column modalidade        drop not null;
--   alter table public.cursos alter column duracao_dias      drop not null;
--   alter table public.cursos drop constraint if exists cursos_modalidade_so_nula_no_historico;
--   -- ⚠️ E so entao o `set not null` da modalidade volta — nesta ordem, porque a catraca admite
--   --    nulo e o `set not null` o recusa. Se houver curso migrado com modalidade nula quando a
--   --    reversao rodar, o `set not null` FALHA, e falhar ali e o certo: reverter nao deve
--   --    inventar valor para caber na coluna.
--   alter table public.cursos alter column modalidade        set not null;
--   alter table public.cursos alter column limite_turmas_ano set default 1;
--   alter table public.cursos alter column modalidade        set default 'presencial';
--
-- ⚠️ REVERTER DEVOLVE OS PADROES SILENCIOSOS: curso volta a nascer `presencial` sem ninguem ter
--    dito isso, e Expedito volta a nascer com limite 1. E a ausencia dos 13 cursos da v2.0 volta a
--    ser indistinguivel de escolha. A tabela de auditoria fica, mas para de
--    receber linha nova — e uma troca de sigla feita depois da reversao nao deixa rastro nenhum.
-- =================================================================================
