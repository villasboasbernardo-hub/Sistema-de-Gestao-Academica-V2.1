# Contrato de banco — Bloco 5 (as três migrations só acrescentam)

## M1 — `cursos`: estrangeiros, custo e currículo

```sql
alter table public.cursos
  add column if not exists ofertavel_estrangeiros boolean,          -- nulo = não informado (C-1)
  add column if not exists estrangeiros_observacao text,
  add column if not exists custo_total numeric(14,2),               -- só informativo (C-3)
  add column if not exists custo_composicao text,
  add column if not exists curriculo_pdf_em timestamptz;            -- quando o PDF foi registrado (C-8)
alter table public.cursos add constraint cursos_custo_nao_negativo check (custo_total is null or custo_total >= 0);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select 'curriculos', 'curriculos', false, 20971520, array['application/pdf']
 where not exists (select 1 from storage.buckets where id = 'curriculos');
```

Policies em `storage.objects`, só do balde `curriculos` (o caminho é `<id do curso>/curriculo.pdf`):

| Policy | Comando | Predicado |
|---|---|---|
| `curriculos_ler` | `select` | o curso da pasta é legível por quem pede (a RLS de `cursos` decide: `cursos.ler` e alcance) |
| `curriculos_carregar` | `insert` | `cursos.editar`, alcance do curso e curso **ativo** |
| `curriculos_substituir` | `update` | o mesmo, em `using` e `with check` |
| — | `delete` | **nenhuma** (regra 4, `STORAGE-1`) |

`cursos` não tem privilégio por coluna (medido): as colunas novas herdam o `update` de tabela que `authenticated` já tem,
e a RLS `cursos_editar` continua decidindo quem grava.

**Reversão:** `drop policy` das três; `delete from storage.buckets where id = 'curriculos'` só com o balde vazio; `alter
table cursos drop constraint …, drop column …` (as colunas nascem vazias; com dado, a reversão recusa).

## M2 — capacitação didática em lista fechada

```sql
create type public.tipo_capacitacao_didatica as enum ('C-Esp-DID', 'C-Exp-TE', 'Licenciatura');
alter table public.instrutores
  add column if not exists capacitacoes_didaticas public.tipo_capacitacao_didatica[] not null default '{}',
  add column if not exists capacitacao_didatica_a_corrigir text;
grant select (capacitacoes_didaticas, capacitacao_didatica_a_corrigir),
      insert (capacitacoes_didaticas, capacitacao_didatica_a_corrigir),
      update (capacitacoes_didaticas, capacitacao_didatica_a_corrigir) on public.instrutores to authenticated;
comment on column public.instrutores.capacitacao_didatica is '[APOSENTADA — v2.1] … texto de origem, intocado';
```

- `app.converter_capacitacoes_didaticas()` → `integer`: para cada instrutor com texto antigo e **sem** lista nem texto a
  corrigir, separa por `,` `;` `/`, casa cada parte sem diferenciar maiúscula, espaço e hífen, grava a lista em ordem da
  lista fechada e o resto, como foi escrito e na ordem, em `capacitacao_didatica_a_corrigir`. Idempotente.
  `security definer`, `revoke all` de `public`, `anon` e `authenticated`.
- A M2 a chama uma vez. **O texto antigo não é tocado.**
- `vw_instrutores` recriada **com** `security_invoker = true`, as colunas de hoje na mesma ordem e as duas novas no fim.

**Reversão:** recriar `vw_instrutores` como estava; `drop column` das duas novas; `drop type`; `drop function`. O texto
antigo está intocado, então nada se perde ao voltar.

## M3 — acessos de conta

```sql
create table public.acessos_de_conta (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null,                        -- usuarios.id, SEM FK (a conta pode ser excluída — D-USR-3)
  ocorrido_em timestamptz not null default now()
);
-- sem quarteto de auditoria nem origem_migracao_v1: SÓ conta e instante (pedido), e sem criado_por
-- para não virar dependente em excluir_conta.
create index … on public.acessos_de_conta (usuario_id, ocorrido_em desc);
alter table public.acessos_de_conta enable row level security;
create policy acessos_de_conta_ler on public.acessos_de_conta for select to authenticated
  using (coalesce(app.eh_admin(), false));
revoke insert, update, delete, truncate on public.acessos_de_conta from authenticated, anon;
-- imutável inclusive para a service_role: gatilhos before update/delete e before truncate, como auditoria_de_conta.
```

- `public.registrar_acesso()` → `void`, `security definer`: recusa `42501` sem sessão; grava um acesso da conta **ativa**
  da sessão (`usuarios.auth_user_id = auth.uid()`). `grant execute` a `authenticated`.
- `public.vw_acessos_por_conta` (`security_invoker = true`): `usuario_id, total, ultimo_em, primeiro_em`.

**Reversão:** `drop view`, `drop function`, `drop table` (com a tabela vazia; com acessos, a reversão recusa — eles
são histórico).
