# Contrato do banco — spec 023 (Bloco 8)

Duas migrations, aplicadas juntas (o PR é um só). **Nenhuma linha existente muda**; nenhuma policy existente muda; nenhuma
regra `RN-` muda.

## M1 — `calendario_tipo_e_abrangencia` (só ACRESCENTA)

1. `feriados.tipo_parada_id uuid null references config_listas(id) on delete restrict` + índice. Comentário: o tipo vem
   da lista `tipos_parada` (FR, LA, LP, RC, PF); nulo nas linhas antigas (a tela lê a sigla do nome).
   Guarda por **gatilho** (`app.conferir_tipo_do_feriado`, `before insert or update of tipo_parada_id`): o valor tem de
   ser de `lista = 'tipos_parada'` — FK não confere a lista. Nulo passa.
2. Tabela `public.feriado_turma`:

   | coluna | tipo |
   |---|---|
   | `id` | `uuid pk default gen_random_uuid()` |
   | `codigo` | `text not null unique default app.proximo_codigo_feriado_turma()` (`FTU-NNNNNN`) |
   | `feriado_id` | `uuid not null references feriados(id) on delete restrict` |
   | `turma_id` | `uuid not null references turmas(id) on delete restrict` |
   | `status` | `status_registro not null default 'ativo'` |
   | `origem_migracao_v1`, `criado_por`, `criado_em`, `editado_por`, `editado_em` | o quarteto + procedência |

   - `unique (feriado_id, turma_id)` — reativar é `update status`, nunca segunda linha.
   - RLS ligada; policies `feriado_turma_ler` (`app.usuario_atual() is not null`, a mesma de `feriados_ler`),
     `feriado_turma_criar` (`coalesce(app.pode('calendario','criar'), false)`), `feriado_turma_editar`
     (`coalesce(app.pode('calendario','editar'), false)` em `using` e `with check`). **Sem `for delete`.**
   - `revoke delete, truncate … from authenticated, anon`; gatilho `app.set_auditoria()`.
   - Sequência `app.feriado_turma_codigo_seq` + `app.proximo_codigo_feriado_turma()` com
     `grant execute … to authenticated, service_role` (gotcha 5.1); entra em `carregar.SEQUENCIAS_DE_CODIGO`.
   - Índices em `feriado_id` e `turma_id` (parciais `where status = 'ativo'`).

## M2 — `vw_dias_parados_turma` respeita a abrangência (recria view, resultado igual para o dado existente)

O mesmo corpo de `20261020025815`, com duas diferenças no ramo do feriado:

```sql
-- o tipo: a coluna nova, senão a sigla do nome, senão FR (o de hoje)
coalesce((select tp.valor from public.config_listas tp where tp.id = f.tipo_parada_id),
         (select tp.valor from public.config_listas tp
           where tp.lista = 'tipos_parada' and f.descricao like tp.valor || ' — %'), 'FR')
-- a abrangência: sem turma escolhida ativa, todas; com, só elas
and (not exists (select 1 from public.feriado_turma ft where ft.feriado_id = f.id and ft.status = 'ativo')
     or exists (select 1 from public.feriado_turma ft
                 where ft.feriado_id = f.id and ft.turma_id = t.id and ft.status = 'ativo'))
```

`with (security_invoker = true)` declarado de novo (gotcha 10); mesmas colunas, mesma ordem; `revoke` repetido.

**Por que não é portão (regra 9.4, emenda de 19/10/2026):** a view muda de corpo, mas **não muda o resultado** de
nada em tela — hoje `feriado_turma` nasce vazia e `tipo_parada_id` nulo em toda linha, e os dois ramos novos caem
exatamente no de hoje. Provado na cópia do remoto: a saída da view **inteira**, ordenada, tem o mesmo md5 antes e depois
(`antes-depois.md`, medida 1).

## Quem lê

| Leitor | Muda? |
|---|---|
| `vw_dias_parados_turma` (painel de paradas da ficha) | M2 |
| DSA: grade, faixa, papel e planilha (`dsa/leitura.ts`) | filtra pela turma (TS) |
| recusa de aula e EI (`lib/acoes/dsa.ts`) | filtra pela turma (TS) |
| capacidade e saldo: `/inicio`, `/turmas`, ficha, avisos | filtra por turma (TS) |
| a aba Calendário (nova) | lê e escreve |

## Caso que discrimina (DoD 8)

- **pgTAP**: feriado com uma turma escolhida aparece em `vw_dias_parados_turma` **só** para ela; sem turma escolhida,
  para todas (as duas metades, com a mesma amostra).
- **RLS** (`tests/invariantes/rls/`): o Operador **não** insere nem altera `feriado_turma` (`42501`, linha completa) e o
  Encarregado sim (controle positivo); ninguém apaga (`delete` sem efeito, conferido no banco).

## Reversão

`specs/023-bloco-8-calendario/reversao.sql`: recria `vw_dias_parados_turma` pelo corpo de `20261020025815`; `drop table
feriado_turma` (vazia ou com dado criado só por esta tela — a reversão vale antes de uso real); `drop` da sequência, da
função e do gatilho; `alter table feriados drop column tipo_parada_id`. Provada numa base descartável com a impressão
digital voltando à de antes.
