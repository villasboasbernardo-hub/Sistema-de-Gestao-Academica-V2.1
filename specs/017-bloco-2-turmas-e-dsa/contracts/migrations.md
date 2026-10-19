# Contrato — as quatro migrations do Bloco 2

*19/10/2026. Os nomes dos arquivos saem de `supabase migration new` (carimbo UTC; nunca renomear). O SQL abaixo é o
desenho; o arquivo final pode diferir só em comentário e formatação. Toda view recriada leva `with (security_invoker =
true)` (gotcha 10); toda tabela e view nova leva o revoke de `delete`/`truncate` (e de escrita, quando não há
escrita direta); nenhuma policy de `DELETE`.*

## Classificação pela regra 9.4 (emenda de 19/10/2026)

| | Classificação | Por quê |
|---|---|---|
| **M1** | **Acrescenta** | Tabela, coluna e recurso novos. As três views da CHD ganham um ramo que **soma zero** com a tabela vazia e colunas novas **no fim**: nenhuma coluna existente muda de valor na aplicação — provado pela impressão digital do conteúdo antes × depois, na cópia do remoto, **antes** do `db push` (SC-010) |
| **M2** | **Acrescenta** | Tabelas, view e funções novas. O gatilho novo em `turmas` só **anota**: não recusa, não muda linha |
| **M3** | **Acrescenta** | Linha nova de parâmetro e função nova |
| **M4** | ⚠️ **ALTERA → PORTÃO** | Passa a recusar gravações em tabelas que existem (a turma arquivada) e recria `app.nascer_disciplina_nas_turmas`. **Escrita e provada no PR; não vai ao remoto antes de Bernardo ver este desenho** |

---

## M1 — a execução: TA fora do DSA, o sem posição e o nome no DSA

```sql
-- 1. o código TFD-NNNNNN (gotcha 5.1: o DEFAULT roda com os direitos de quem insere)
create sequence app.ta_fora_do_dsa_codigo_seq;
create or replace function app.proximo_codigo_ta_fora_do_dsa() returns text
  language sql volatile security definer set search_path = ''
  as $$ select 'TFD-' || lpad(nextval('app.ta_fora_do_dsa_codigo_seq')::text, 6, '0') $$;
revoke all on function app.proximo_codigo_ta_fora_do_dsa() from public, anon;
grant execute on function app.proximo_codigo_ta_fora_do_dsa() to authenticated, service_role;

-- 2. a tabela
create table public.ta_fora_do_dsa (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique default app.proximo_codigo_ta_fora_do_dsa(),
  turma_disciplina_id uuid not null references public.turma_disciplina (id) on delete restrict,
  turma_id            uuid not null references public.turmas (id) on delete restrict,
  disciplina_id       uuid not null references public.disciplinas (id) on delete restrict,
  data                date not null,
  tempos              smallint not null check (tempos >= 1),          -- sem ajuste negativo
  instrutor_id        uuid references public.instrutores (id) on delete restrict,
  observacao          text not null
                      check (length(btrim(observacao)) >= 3 and length(observacao) <= 1000),
  status              public.status_registro not null default 'ativo',
  origem_migracao_v1  text,
  criado_por uuid, criado_em timestamptz not null default now(),
  editado_por uuid, editado_em timestamptz
);
create index ta_fora_do_dsa_turma_data on public.ta_fora_do_dsa (turma_id, data);
create index ta_fora_do_dsa_linha on public.ta_fora_do_dsa (turma_disciplina_id);
create trigger trg_ta_fora_do_dsa_auditoria before insert or update on public.ta_fora_do_dsa
  for each row execute function app.set_auditoria();

-- 3. o guarda da linha (tabela nova): turma e disciplina são as da linha, a linha está ativa na criação,
--    e depois de gravado só o status muda, e só de ativo para inativo ("desfazer")
create or replace function app.guardar_ta_fora_do_dsa() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare v_td record;
begin
  if tg_op = 'INSERT' then
    select td.turma_id, td.disciplina_id, td.status into v_td
      from public.turma_disciplina td where td.id = new.turma_disciplina_id;
    if v_td.turma_id is distinct from new.turma_id or v_td.disciplina_id is distinct from new.disciplina_id then
      raise exception 'A turma e a disciplina nao sao as da linha.' using errcode = '23514', hint = 'ta_fora_linha_divergente';
    end if;
    if v_td.status <> 'ativo' then
      raise exception 'A disciplina nao esta ativa na turma.' using errcode = '23514', hint = 'ta_fora_linha_inativa';
    end if;
    return new;
  end if;
  if (new.turma_disciplina_id, new.turma_id, new.disciplina_id, new.data, new.tempos, new.instrutor_id, new.observacao)
     is distinct from
     (old.turma_disciplina_id, old.turma_id, old.disciplina_id, old.data, old.tempos, old.instrutor_id, old.observacao)
     or not (old.status = 'ativo' and new.status = 'inativo') then
    raise exception 'O registro de TA fora do DSA so pode ser desfeito.' using errcode = '23514', hint = 'ta_fora_so_desfaz';
  end if;
  return new;
end $$;
create trigger trg_ta_fora_do_dsa_guarda before insert or update on public.ta_fora_do_dsa
  for each row execute function app.guardar_ta_fora_do_dsa();
revoke all on function app.guardar_ta_fora_do_dsa() from public, anon, authenticated;

-- 4. RLS: lê quem lê lançamento da turma (a mesma régua de registros_aula, para as views security_invoker
--    somarem igual para todo leitor); grava só o trio, pelo recurso novo
alter table public.ta_fora_do_dsa enable row level security;
create policy ta_fora_do_dsa_ler on public.ta_fora_do_dsa for select to authenticated
  using (app.pode('registros_aula', 'ler') and app.alcanca_turma(turma_id));
create policy ta_fora_do_dsa_criar on public.ta_fora_do_dsa for insert to authenticated
  with check (coalesce(app.pode('ta_fora_do_dsa', 'editar'), false)
              and app.alcanca_turma(turma_id) and app.turma_em_oferta(turma_id));
create policy ta_fora_do_dsa_editar on public.ta_fora_do_dsa for update to authenticated
  using      (coalesce(app.pode('ta_fora_do_dsa', 'editar'), false) and app.alcanca_turma(turma_id))
  with check (coalesce(app.pode('ta_fora_do_dsa', 'editar'), false) and app.alcanca_turma(turma_id));
revoke delete, truncate on public.ta_fora_do_dsa from authenticated, anon;

insert into public.perfil_permissao (perfil, recurso, acao, permitido, observacao)
select p, 'ta_fora_do_dsa', 'editar',
       p in ('admin', 'encarregado_administracao_academica', 'ajudante_administracao_academica'),
       'Bloco 2 (spec 017), D-COR-3: registra e desfaz TA fora do DSA. Admin, Encarregado e Ajudante.'
  from unnest(enum_range(null::public.perfil_usuario)) as p
on conflict (perfil, recurso, acao) do update set permitido = excluded.permitido, observacao = excluded.observacao;

-- 5. o nome no DSA (o limite L sai da medição do cartão, R-8)
alter table public.disciplinas add column nome_no_dsa text
  check (nome_no_dsa is null or (length(btrim(nome_no_dsa)) between 1 and :L));

-- 6. a base da M1 (spec 016): o ramo fora do DSA e a coluna sem_posicao NO FIM
create or replace view public.vw_chd_por_fato with (security_invoker = true) as
  with vivas as (select a.id, a.turma_id, a.disciplina_id, a.data_avaliacao, a.tempos_consumidos, a.ta_inicial
                   from public.avaliacoes a
                  where a.status in ('pendente','em_andamento','concluida','atrasada'))
  select r.turma_id, coalesce(ue.disciplina_id, r.disciplina_id) as disciplina_id, r.data,
         r.tempos_consumidos::bigint as tempos, 'aula'::text as origem, r.ta_inicial is null as sem_posicao
    from public.registros_aula r left join public.unidades_ensino ue on ue.id = r.unidade_ensino_id
   where r.status = 'ativo'
  union all
  select v.turma_id, v.disciplina_id, v.data_avaliacao, coalesce(v.tempos_consumidos::int, 0)::bigint,
         'aplicacao', v.ta_inicial is null from vivas v
  union all
  select v.turma_id, v.disciplina_id, p.data, coalesce(p.tempos_consumidos::int, 0)::bigint,
         'sessao_de_aplicacao', p.ta_inicial is null
    from public.sessoes_de_aplicacao p join vivas v on v.id = p.avaliacao_id where p.status = 'ativo'
  union all
  select v.turma_id, v.disciplina_id, s.data, coalesce(s.tempos_consumidos::int, 0)::bigint,
         'vista', s.ta_inicial is null
    from public.vistas_de_avaliacao s join vivas v on v.id = s.avaliacao_id where s.status = 'ativo'
  union all
  select f.turma_id, f.disciplina_id, f.data, f.tempos::bigint, 'fora_do_dsa', true
    from public.ta_fora_do_dsa f where f.status = 'ativo';

-- 7. vw_carga_horaria_turma: o CTE `fora` (soma por turma), somado em chd_executada e cht_executada, e a coluna
--    ta_fora_do_dsa NO FIM. As demais colunas, na mesma ordem e com a mesma expressão de 20261016092307.
-- 8. vw_disciplinas_execucao: o CTE `fora` (por disciplina × turma, com min/max da data), somado em ta_executados,
--    descontado de ta_saldo e entrando em data_real_inicio/termino; as colunas ta_fora_do_dsa e nome_no_dsa NO FIM.
-- (os dois corpos completos estão na migration; a única diferença para 20261016092307 é a descrita aqui)

revoke insert, update, delete, truncate on public.vw_chd_por_fato, public.vw_carga_horaria_turma,
  public.vw_disciplinas_execucao from authenticated;
```

**O caso que discrimina (DoD 8):** com a M1, 5 TA fora do DSA numa disciplina aparecem nas três somas e na
`chd_da_turma_ate`/`execucao_por_disciplina_ate` até a data deles; sem ela, não existem. O pgTAP 137 planta a linha e
confere as três somas e a igualdade da guarda do 135.

**Reversão:** recriar as três views com o corpo de antes (`20261019035107` para `vw_chd_por_fato`;
`20261016092307` para as outras duas), `drop column disciplinas.nome_no_dsa` (coluna nova e sem histórico, nas
condições da exceção D-1 da spec 014 — sem dado a perder), `delete from perfil_permissao where recurso =
'ta_fora_do_dsa'`, `drop table ta_fora_do_dsa`, `drop function`/`drop sequence` dos novos. ⚠️ Só se a tabela estiver
vazia; com registro, a reversão é decisão de Bernardo.

---

## M2 — a história da turma: a trilha da situação e o arquivamento

```sql
-- 1. a trilha (só de acréscimo; sem FK de propósito: a suíte apaga turmas de amostra — molde previstos_proens_alteracoes)
create table public.turma_trocas_de_situacao (
  id                uuid primary key default gen_random_uuid(),
  ordem             bigint generated always as identity,
  turma_id          uuid not null,
  situacao_anterior public.status_turma not null,
  situacao_nova     public.status_turma not null,
  observacao        text check (observacao is null or length(observacao) <= 500),
  autor_id          uuid,                                   -- auth.uid(); nulo = sem sessão
  criado_em         timestamptz not null default now()
);
alter table public.turma_trocas_de_situacao enable row level security;
create policy turma_trocas_de_situacao_ler on public.turma_trocas_de_situacao for select to authenticated
  using (app.pode('turmas', 'ler') and app.alcanca_turma(turma_id));
revoke insert, update, delete, truncate on public.turma_trocas_de_situacao from authenticated, anon;
-- imutável inclusive para a service_role: gatilhos de statement BEFORE UPDATE OR DELETE e BEFORE TRUNCATE (42501)

-- 2. o gatilho que anota (AFTER UPDATE OF status; NÃO recusa nada — guarda do pgTAP 101)
create or replace function app.anotar_troca_de_situacao() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  insert into public.turma_trocas_de_situacao (turma_id, situacao_anterior, situacao_nova, observacao, autor_id)
  values (new.id, old.status, new.status,
          nullif(btrim(coalesce(current_setting('ciaara.observacao_da_troca', true), '')), ''), auth.uid());
  return null;
end $$;
create trigger trg_turmas_anotar_troca after update of status on public.turmas
  for each row when (old.status is distinct from new.status) execute function app.anotar_troca_de_situacao();

-- 3. trocar e anotar de uma vez (INVOKER: a RLS de turmas_editar decide quem troca)
create or replace function public.trocar_situacao_da_turma(p_codigo text, p_status public.status_turma, p_observacao text)
  returns void language plpgsql security invoker set search_path = '' as $$
declare v_n integer;
begin
  perform set_config('ciaara.observacao_da_troca', coalesce(p_observacao, ''), true);
  update public.turmas set status = p_status where codigo = p_codigo;
  get diagnostics v_n = row_count;
  perform set_config('ciaara.observacao_da_troca', '', true);
  if v_n = 0 then
    raise exception 'Turma fora do alcance.' using errcode = '42501', hint = 'turma_fora_do_alcance';
  end if;
end $$;
revoke all on function public.trocar_situacao_da_turma(text, public.status_turma, text) from public, anon;
grant execute on function public.trocar_situacao_da_turma(text, public.status_turma, text) to authenticated;

-- 4. o arquivamento (eventos só de acréscimo; o estado atual é o último evento)
create table public.turma_arquivamentos (
  id         uuid primary key default gen_random_uuid(),
  ordem      bigint generated always as identity,
  turma_id   uuid not null,                                 -- sem FK (mesmo motivo da trilha)
  acao       text not null check (acao in ('arquivar', 'desarquivar')),
  observacao text check (observacao is null or length(observacao) <= 500),
  autor_id   uuid,
  criado_em  timestamptz not null default now()
);
alter table public.turma_arquivamentos enable row level security;
create policy turma_arquivamentos_ler on public.turma_arquivamentos for select to authenticated
  using (app.pode('turmas', 'ler') and app.alcanca_turma(turma_id));
create policy turma_arquivamentos_criar on public.turma_arquivamentos for insert to authenticated
  with check ((acao = 'arquivar' and coalesce(app.pode('turmas', 'editar'), false) and app.alcanca_turma(turma_id))
           or (acao = 'desarquivar' and coalesce(app.eh_admin(), false)));        -- D-COR-5: só o Admin
revoke update, delete, truncate on public.turma_arquivamentos from authenticated, anon;

create or replace function app.turma_arquivada(p_turma_id uuid) returns boolean
  language sql stable security invoker set search_path = '' as $$
  select coalesce((select a.acao = 'arquivar' from public.turma_arquivamentos a
                    where a.turma_id = p_turma_id order by a.ordem desc limit 1), false) $$;

-- BEFORE INSERT (tabela nova): carimba autor e instante (o cliente não escolhe), a turma existe, e a sequência vale
--   arquivar já arquivada → 23514 'turma_ja_arquivada'; desarquivar a que não está → 23514 'turma_nao_arquivada'
-- e os dois gatilhos de statement de imutabilidade (UPDATE/DELETE e TRUNCATE), como na trilha

create view public.vw_turmas_arquivadas with (security_invoker = true) as
  select u.turma_id, u.criado_em as arquivada_em, u.autor_id as arquivada_por, u.observacao
    from (select distinct on (a.turma_id) a.* from public.turma_arquivamentos a order by a.turma_id, a.ordem desc) u
   where u.acao = 'arquivar';
revoke insert, update, delete, truncate on public.vw_turmas_arquivadas from authenticated;
revoke all on public.vw_turmas_arquivadas from anon;
```

**Os casos que discriminam:** (a) a troca por `update` direto, sem a função, **aparece** na trilha (sem observação);
(b) o Operador **arquiva** e **não desarquiva** (`42501`); o Admin desarquiva — com a sessão real.

**Reversão:** `drop trigger trg_turmas_anotar_troca`, `drop function` das quatro funções novas, `drop view`, `drop
table` das duas tabelas (só de acréscimo, sem dependentes) — perde-se o histórico que tiverem; decisão de Bernardo se
houver linha.

---

## M3 — o painel

```sql
insert into public.config_parametros
  (chave, valor, tipo, unidade, natureza, descricao, fundamento_normativo, editavel_por, status)
select 'turmas.aviso_inicio_dias', '30', 'inteiro', 'dias', 'operacional',
       'Dias à frente em que o painel de /turmas conta a turma como "iniciando" (Bloco 2, spec 017).',
       null, 'encarregado_administracao_academica', 'ativo'
 where not exists (select 1 from public.config_parametros where chave = 'turmas.aviso_inicio_dias' and status = 'ativo');

-- a ocupação da semana em lote, para o conflito RN-CONF-01 do painel; a das turmas que a pessoa NÃO alcança sai
-- anônima (turma e lançamento nulos), como em conflitos_da_semana
create or replace function public.ocupacao_para_conflitos(p_de date, p_ate date)
  returns table (turma_id uuid, origem text, fato_id uuid, sessao_id uuid, data date,
                 ta_inicial smallint, ta_final smallint, instrutor_id uuid, fiscal_id uuid, local text)
  language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(app.pode('registros_aula', 'ler'), false) is not true then
    raise exception 'Sem permissao para ler lancamento.' using errcode = '42501', hint = 'sem_alcance';
  end if;
  if p_ate < p_de or p_ate - p_de > 6 then
    raise exception 'A janela e de uma semana.' using errcode = '22023', hint = 'janela_de_uma_semana';
  end if;
  return query
    select case when app.alcanca_turma(o.turma_id) then o.turma_id end,
           case when app.alcanca_turma(o.turma_id) then o.origem end,
           case when app.alcanca_turma(o.turma_id) then o.fato_id end,
           case when app.alcanca_turma(o.turma_id) then o.sessao_id end,
           o.data, o.ta_inicial, o.ta_final, o.instrutor_id, o.fiscal_id, o.local
      from public.vw_ocupacao_ta o
     where o.turma_id is not null and o.data between p_de and p_ate;
end $$;
revoke all on function public.ocupacao_para_conflitos(date, date) from public, anon;
grant execute on function public.ocupacao_para_conflitos(date, date) to authenticated;
```

**Reversão:** `drop function`; a linha do parâmetro sai por `status = 'inativo'` (regra 4).

---

## M4 — a trava da turma arquivada no banco · ⚠️ PORTÃO (não vai ao remoto antes do *"aprovado"*)

**O que muda no que existe:** gravações que hoje passam passam a ser **recusadas** quando a turma está arquivada. Com
**zero** turma arquivada no remoto, nenhuma gravação de hoje muda de veredito na aplicação — mas a regra de quem
grava o quê muda, e por isso é portão.

```sql
-- a recusa única, com frase própria (traduzida em lib/acoes/traducao-de-recusas.ts)
create or replace function app.recusar_se_turma_arquivada() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare v_turma uuid;
begin
  v_turma := case tg_table_name
    when 'sessoes_de_aplicacao' then (select a.turma_id from public.avaliacoes a where a.id = new.avaliacao_id)
    when 'vistas_de_avaliacao'  then (select a.turma_id from public.avaliacoes a where a.id = new.avaliacao_id)
    when 'turma_disciplina_instrutor' then (select td.turma_id from public.turma_disciplina td where td.id = new.turma_disciplina_id)
    when 'turma_disciplina_unidade'   then (select td.turma_id from public.turma_disciplina td where td.id = new.turma_disciplina_id)
    else (to_jsonb(new) ->> 'turma_id')::uuid end;
  if v_turma is not null and app.turma_arquivada(v_turma) then
    raise exception 'A turma esta arquivada: somente leitura.' using errcode = '23514', hint = 'turma_arquivada';
  end if;
  return new;
end $$;
-- BEFORE INSERT OR UPDATE em: registros_aula, avaliacoes, sessoes_de_aplicacao, vistas_de_avaliacao,
-- atividades_nao_letivas, dias_parados, turma_disciplina, turma_disciplina_instrutor, turma_disciplina_unidade,
-- ta_fora_do_dsa, previstos_proens_turma, avaliacoes_curriculo_turma

-- turmas: guarda por valor (BEFORE UPDATE): turma arquivada não aceita UPDATE nenhum; o caminho é desarquivar
--   (o corpo NÃO menciona a situação da turma — guarda de ausência do pgTAP 101)
-- app.nascer_disciplina_nas_turmas: a disciplina nova não nasce em turma arquivada
--   (… where t.status in ('planejada','ativa') and not app.turma_arquivada(t.id))
```

**Prova (pgTAP 140):** enumeração das 12 tabelas + `turmas` no molde do 105 (lista tabela → gatilho e `results_eq` do
conjunto), uma recusa por tabela com `hint = turma_arquivada`, a gravação volta a passar depois de desarquivar, e a
disciplina nova não nasce na arquivada.

**Efeito medido no remoto:** zero turma arquivada (a tabela nasce com a M2) — nenhuma gravação de hoje muda.

**Reversão:** `drop trigger` dos 13 gatilhos, `drop function app.recusar_se_turma_arquivada` e da guarda de `turmas`,
e `app.nascer_disciplina_nas_turmas` com o corpo de `20260925135051`.
