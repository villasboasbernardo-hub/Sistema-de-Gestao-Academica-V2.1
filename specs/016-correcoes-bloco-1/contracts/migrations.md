# O desenho das duas migrations do Bloco 1 — para Bernardo ver ANTES do remoto (regra 9.4)

*17/10/2026 · spec 016 · PR 3. ✅ **DESENHO APROVADO por Bernardo Villas Boas em 17/10/2026**, com o
efeito medido **aceito** (a C-Ap-FR 2026 passa a "em atraso"; o instrutor de código 13 ganha 4 semanas
acima da faixa). ⚠️ **Se a nova medição sobre o backup do dia mudar o efeito, o desenho volta para ele
antes do `db push`.** Nada foi escrito no remoto, e nenhuma migration existe ainda no repositório.*

> **Onde foi medido** (regra 9.2): banco **local** restaurado da cópia **`remoto-20261017-005738.sql`**.
> Os dois esboços abaixo foram **executados** no local, dentro de uma transação **desfeita** no fim
> (`begin … rollback`), para provar que compilam e dão os números desta página. Os números de andamento
> e de alerta saíram das **funções reais** de `lib/dominio/`, rodadas sobre os mesmos dados. "Hoje" na
> medição é **17/10/2026** (sábado).

| | M1 — executado até uma data | M2 — janela da CH prevista |
|---|---|---|
| Item | 1.14 (D-COR-2; Q-5, NQ-1) | 1.13 (Q-7) |
| Objetos | **novos**: `public.vw_chd_por_fato`, `public.chd_da_turma_ate`, `public.execucao_por_disciplina_ate` | **muda**: `public.vw_instrutor_carga_prevista` (mesmas colunas) |
| Tabela nova | não | não |
| Mexe em dado | não | não |
| Views de hoje alteradas | **nenhuma** | uma, `vw_instrutor_carga_prevista` |
| Reversão | apagar os três objetos novos | `create or replace view` com o corpo anterior |

---

## M1 — a CHD executada até um dia dado

### Por quê
Hoje a CH executada sai de `vw_carga_horaria_turma.chd_executada` e de `vw_disciplinas_execucao.ta_executados`,
que **somam tudo, inclusive o lançado no futuro**. A D-COR-2 manda contar só até hoje **fora do DSA e
da planilha** (NQ-1). Cortar em TypeScript não serve (a `vw_ocupacao_ta` perde a linha sem posição, e a
soma da CHD passaria a viver fora do banco); pôr "hoje" dentro do SQL também não (FR-014.3: hoje é
passado explicitamente, e o servidor é UTC).

### O SQL (esboço executado no local)

```sql
-- M1 · <carimbo UTC da CLI>_execucao_ate_uma_data.sql
-- A CHD lançada, um fato por linha, com turma, disciplina e a DATA do próprio fato.
create view public.vw_chd_por_fato with (security_invoker = true) as
with vivas as (
  select a.id, a.turma_id, a.disciplina_id, a.data_avaliacao, a.tempos_consumidos
    from public.avaliacoes a
   where a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')
)
select r.turma_id,
       coalesce(ue.disciplina_id, r.disciplina_id) as disciplina_id,
       r.data,
       r.tempos_consumidos::bigint as tempos,
       'aula'::text as origem
  from public.registros_aula r
  left join public.unidades_ensino ue on ue.id = r.unidade_ensino_id
 where r.status = 'ativo'
union all
select v.turma_id, v.disciplina_id, v.data_avaliacao, coalesce(v.tempos_consumidos, 0)::bigint, 'aplicacao'
  from vivas v
union all
select v.turma_id, v.disciplina_id, p.data, coalesce(p.tempos_consumidos, 0)::bigint, 'sessao_de_aplicacao'
  from public.sessoes_de_aplicacao p
  join vivas v on v.id = p.avaliacao_id
 where p.status = 'ativo'
union all
select v.turma_id, v.disciplina_id, s.data, coalesce(s.tempos_consumidos, 0)::bigint, 'vista'
  from public.vistas_de_avaliacao s
  join vivas v on v.id = s.avaliacao_id
 where s.status = 'ativo';

revoke insert, update, delete, truncate on public.vw_chd_por_fato from authenticated;
revoke all on public.vw_chd_por_fato from anon;

-- A CHD executada por turma até p_ate, inclusive. SEM valor padrão para a data: quem chama manda o dia.
create function public.chd_da_turma_ate(p_ate date)
returns table (turma_id uuid, chd_executada bigint)
language sql stable security invoker set search_path = ''
as $$
  select f.turma_id, sum(f.tempos)::bigint
    from public.vw_chd_por_fato f
   where f.data <= p_ate
   group by f.turma_id
$$;

-- A execução por disciplina de UMA turma até p_ate, e a primeira data (o "iniciada" da aba Avaliações).
create function public.execucao_por_disciplina_ate(p_ate date, p_turma_id uuid)
returns table (disciplina_id uuid, ta_executados bigint, data_real_inicio date)
language sql stable security invoker set search_path = ''
as $$
  select f.disciplina_id, sum(f.tempos)::bigint, min(f.data)
    from public.vw_chd_por_fato f
   where f.turma_id = p_turma_id
     and f.data <= p_ate
     and f.disciplina_id is not null
   group by f.disciplina_id
$$;

revoke all on function public.chd_da_turma_ate(date) from public, anon;
grant execute on function public.chd_da_turma_ate(date) to authenticated;
revoke all on function public.execucao_por_disciplina_ate(date, uuid) from public, anon;
grant execute on function public.execucao_por_disciplina_ate(date, uuid) to authenticated;
```

O cabeçalho da migration traz o *por quê*, o plano de reversão e a medição desta página, como as
migrations da casa.

### As colunas
| Objeto | Coluna | Origem |
|---|---|---|
| `vw_chd_por_fato` | `turma_id`, `disciplina_id`, `data`, `tempos`, `origem` | `registros_aula` (disciplina da UE, senão a da linha), aplicação de avaliação viva, sessões de aplicação ativas, vistas ativas |
| `chd_da_turma_ate(p_ate)` | `turma_id`, `chd_executada` | soma da base com `data <= p_ate` |
| `execucao_por_disciplina_ate(p_ate, p_turma_id)` | `disciplina_id`, `ta_executados`, `data_real_inicio` | soma e primeira data da base, da turma, com `data <= p_ate` |

### Quem lê

| Leitor | Hoje lê | Passa a ler |
|---|---|---|
| `/inicio` (`app/(app)/inicio/page.tsx:126-130`) | `vw_carga_horaria_turma.chd_executada` | `chd_da_turma_ate(hoje)` para a executada; a view continua para o resto |
| Ficha da turma (`app/(app)/turmas/[turma]/page.tsx:201-205`) | idem | idem, filtrado pela turma |
| `/turmas` (colunas novas, FR-014.6) | — | `chd_da_turma_ate(hoje)` |
| Tabela de disciplinas da ficha **e** `/disciplinas` — a mesma leitura (`app/(app)/disciplinas/consulta.ts:380`) | `vw_disciplinas_execucao.ta_executados` | `execucao_por_disciplina_ate(hoje, turma)` |
| Aba Avaliações da turma (`app/(app)/turmas/[turma]/consulta-de-avaliacoes.ts:71`) | `ta_executados`, `data_real_inicio` | `execucao_por_disciplina_ate(hoje, turma)` |
| **DSA e planilha** (`dsa/leitura.ts:1530`, `dsa/planilha/`) | `vw_disciplinas_execucao` e a ocupação | **não mudam** — acumulam até a semana (`FR-028.1` da spec 013) |
| `vw_conformidade_tetos`, cards de tetos | `vw_carga_horaria_turma` (AEC, TAD, TR) | **não mudam** |

### A prova de que a base é a mesma soma — e a guarda contra divergir
Medido no local, com o esboço criado e desfeito: **sem corte** (`p_ate = '9999-12-31'`), a soma por turma
bate com `vw_carga_horaria_turma.chd_executada` em **29 de 29** turmas, e a soma por turma × disciplina
bate com `vw_disciplinas_execucao.ta_executados` em **228 de 228** linhas. ⚠️ A composição da CHD passa a
existir em **três** lugares (as duas views de hoje e a base). A guarda é o pgTAP **135**, que repete as
duas igualdades em toda execução da suíte: quem mudar uma das três e esquecer as outras reprova ali.
Eliminar a cópia, fazendo as views de hoje lerem da base, ficou para fatia própria (**P-3**, decidida em
17/10/2026): é a pendência **`PEND-016-1`**.

### O caso que discrimina (DoD 8)
- **pgTAP 135** (sintético): uma turma com aula de 2 TA **ontem**, aula de 1 TA **no dia**, aula de 3 TA
  **amanhã**, avaliação pendente de 2 TA **depois de amanhã** e uma vista de 1 TA três dias depois.
  `chd_da_turma_ate(dia)` = **3**; `vw_carga_horaria_turma.chd_executada` = **9**. A borda do dia é
  inclusiva.
- **E2e**: a semente ganha **um lançamento futuro**. Com o código de hoje o saldo o conta; com a M1, não
  — a asserção reprova antes e passa depois.
- Mais no 135: as funções são `stable` e **não** `security definer`; `p_ate` **sem valor padrão**
  (`pronargdefaults = 0`); o corpo **não** contém `current_date`, `now()`, `current_timestamp` nem
  `localtimestamp`, lido sem comentário (regra 9.1.1); a base sem `insert/update/delete/truncate` para
  `authenticated`; `anon` sem `execute`.
- **RLS** (`tests/invariantes/rls/execucao-ate.test.ts`, sessão real): um perfil com alcance restrito
  recebe da função **só** as turmas do alcance dele, e o Admin recebe todas (controle positivo) — a
  função não fura a RLS, porque é `security invoker`.

### A reversão
```sql
drop function public.execucao_por_disciplina_ate(date, uuid);
drop function public.chd_da_turma_ate(date);
drop view public.vw_chd_por_fato;
```
São objetos **novos e sem dado**; nada depende deles no banco. A reversão é executada numa base
descartável antes do PR (DoD 6), conferida pela impressão digital do esquema voltando ao valor de antes.

### O efeito medido — por turma (andamento, hoje 17/10/2026)
Executada antes × depois; dias úteis antes (de hoje) × depois (de amanhã); saldo em TA. 17/10 é sábado,
por isso os dias úteis não mudam hoje.

| Turma (ativa) | Executada | % | Dias úteis | Saldo (TA) | Em atraso |
|---|---|---|---|---|---|
| **C-Ap-FR 2026** | 868 → **828** | 75 → 71 | 40 → 40 | +24 → **−16** | não → **SIM** |
| C-Ap-HN 2026 | 1.008 → **958** | 80 → 76 | 40 → 40 | +71 → +21 | não → não |
| C-Espc-HN 2026 | 1.160 → **1.126** | 95 → 93 | 17 → 17 | +63 → +29 | não → não |
| CAHO 2026 | 1.367 → **1.356** | 82 → 81 | 41 → 41 | +27 → +16 | não → não |
| C-Espc-FR 2026 | 1.075 → 1.075 | 85 → 85 | 17 → 17 | −77 → −77 | sim → sim |
| C-ApA-AuxNav-PR-SP T2, C-ApA-PCN-PR-EAD T2, C-ApA-PrevMe-PR-EAD T2 | 0 → 0 | — | — | sem mudança | sim → sim |

⚠️ **A C-Ap-FR 2026 passa a aparecer "em atraso" no `/inicio`**: os 40 TA lançados para depois de hoje
eram o que a punha em dia. É o efeito pretendido pela D-COR-2, e você o vê aqui antes de ele aparecer
na tela.

### O efeito medido — por disciplina (19 linhas mudam; as outras 81 com execução, não)
| Turma | Disciplina (código) | CH | Executada antes → depois |
|---|---|---|---|
| C-Ap-FR 2026 | I | 120 | 94 → 83 |
| C-Ap-FR 2026 | II | 65 | 62 → 60 |
| C-Ap-FR 2026 | III | 75 | 43 → 40 |
| C-Ap-FR 2026 | IV | 104 | 70 → 54 |
| C-Ap-FR 2026 | V | 140 | 108 → 105 |
| C-Ap-FR 2026 | VIII | 100 | 92 → 87 |
| C-Ap-HN 2026 | V | 92 | 92 → 91 |
| C-Ap-HN 2026 | IX | 70 | 69 → 65 |
| C-Ap-HN 2026 | X | 64 | 58 → 49 |
| C-Ap-HN 2026 | XI | 148 | 134 → 122 |
| C-Ap-HN 2026 | XIII | 75 | 74 → 73 |
| C-Ap-HN 2026 | XIV | 90 | 56 → 33 |
| C-Espc-HN 2026 | HN-1107-1011 | 120 | 119 → 115 |
| C-Espc-HN 2026 | HN-1110-0815 | 108 | 103 → 100 |
| C-Espc-HN 2026 | HN-1114-0730 | 200 | 155 → 128 |
| CAHO 2026 | X | 86 | 79 → 76 |
| CAHO 2026 | XII | 32 | 31 → 30 |
| CAHO 2026 | XVI | 239 | 215 → 214 |
| CAHO 2026 | XIX | 70 | 52 → 46 |

---

## M2 — a janela da CH prevista do instrutor

### Por quê
`vw_instrutor_carga_prevista` tira o **ano** e a **janela** da atribuição de `disciplinas.previsao_*` —
o período **do currículo** —, e ignora o período por turma que a spec 010 criou e a janela da turma.
Resultado medido: **8** atribuições sem ano, de **5** instrutores, que não contam na CH prevista do ano
(`vw_instrutor_carga_anual` descarta `ano` nulo) — o instrutor de código 15 sai com **114** TA quando as
quatro atribuições dele somam **271**. A Q-7 fixou a ordem: linha da turma → disciplina → turma.

### O SQL (esboço executado no local) — só o trecho que muda
O corpo inteiro é o de `20260926005750_ch_prevista_com_security_invoker.sql`, com o rateio em cinco casos
**intacto**. Mudam duas colunas do primeiro bloco e entra um `lateral` que escolhe a fonte da janela:

```sql
create or replace view public.vw_instrutor_carga_prevista
with (security_invoker = true) as          -- gotcha 10: sem isto a view perde a RLS
with atribuicoes as (
  select …
         case j.fonte
           when 'linha_da_turma' then td.previsao_inicio
           when 'disciplina'     then d.previsao_inicio
           when 'turma'          then t.data_inicio
           else coalesce(td.previsao_inicio, d.previsao_inicio, t.data_inicio)
         end                   as previsao_inicio,
         case j.fonte
           when 'linha_da_turma' then td.previsao_termino
           when 'disciplina'     then d.previsao_termino
           when 'turma'          then t.data_termino
         end                   as previsao_termino,   -- sem fonte com as duas datas: sem término
         d.semanas, …
    from public.turma_disciplina_instrutor tdi
    join public.turma_disciplina td on td.id = tdi.turma_disciplina_id
    join public.disciplinas d on d.id = td.disciplina_id
    join public.cursos c on c.id = d.curso_id
    join public.turmas t on t.id = td.turma_id
    cross join lateral (
      select case
               when td.previsao_inicio is not null and td.previsao_termino is not null then 'linha_da_turma'
               when d.previsao_inicio  is not null and d.previsao_termino  is not null then 'disciplina'
               when t.data_inicio      is not null and t.data_termino      is not null then 'turma'
             end as fonte
    ) j
    left join public.instrutor_disciplina v on …
   where …
), rateadas as ( … igual … )
select …, extract(year from previsao_inicio)::smallint as ano, previsao_inicio, previsao_termino, …
  from rateadas r;
```

**A janela vem inteira de uma fonte** (research R-4): o banco permite início sem término nas três, e
misturar o início de uma com o término de outra daria uma janela que ninguém cadastrou. Hoje há **0**
pares pela metade.

### As colunas
**Nenhuma muda de nome, tipo nem ordem** (medido: 0 diferenças no catálogo, com o esboço criado e
desfeito), e a view continua com `security_invoker=true`. O que muda é o **conteúdo** de três:
`previsao_inicio`, `previsao_termino` e `ano` passam a ser a janela **efetiva** da atribuição.
`semanas` e `media_semanal` **não mudam** — a média de reserva (`RN-DIST-02`) é calculada na ficha, em
`lib/dominio/media-semanal.ts`, com a régua única de semana (research R-5).

### Quem lê
| Leitor | O que usa | Efeito |
|---|---|---|
| `vw_instrutor_carga_anual` (`ta_previsto_ano`) | `ano`, `tempos_previstos`, janelas | as 8 atribuições passam a contar no ano |
| Ficha do instrutor (`instrutores/[codigo]/page.tsx:127-140`) | lista do ano, janelas, `media_semanal` | lista e alerta de faixa passam a ver as 8 |
| Lista `/instrutores` (`instrutores/page.tsx:90`) | `ta_previsto_ano` da anual | o previsto do ano muda nos 5 instrutores |
| `/disciplinas` (`disciplinas/consulta.ts:407`) | `tempos_previstos` | **não muda** (medido: 0 de 108 valores de tempos mudam) |

### O caso que discrimina (DoD 8) — pgTAP 136
1. Atribuição com período **só na linha da turma** → `ano` preenchido. **Reprova antes** (ano nulo).
2. Atribuição **sem período** na linha nem na disciplina, turma com janela → `ano` e janela da turma.
   **Reprova antes.**
3. Linha da turma e disciplina com períodos **diferentes** → vence a linha da turma (é o caso medido do
   instrutor 148 na C-Ap-FR 2026: 06/04 → 07/04). **Reprova antes.**
4. Nenhuma fonte com as duas datas → `ano` do primeiro início, `previsao_termino` nulo.
5. `vw_instrutor_carga_anual.ta_previsto_ano` conta a atribuição do caso 1.
6. As colunas da view são as mesmas, na mesma ordem — é o que mantém a reversão por `create or replace`.
7. O rateio em cinco casos continua provado por `tests/invariantes/rateio-da-view.test.ts`, sem mudança.

### A reversão
`create or replace view public.vw_instrutor_carga_prevista with (security_invoker = true) as …` com o
corpo exato de `20260926005750` — possível porque as colunas são as mesmas. Executada numa base
descartável antes do PR, com a impressão digital do esquema voltando ao valor de antes.

### O efeito medido — por instrutor (2026)
CH prevista do ano e semanas fora da faixa semanal (alerta da ficha), antes × depois, com as funções
reais (`cargaPorSemana`, `semanasForaDaFaixa`) e a média de reserva da `RN-DIST-02`.

| Instrutor (código) | CH prevista 2026 | Semanas fora da faixa | De onde vem a janela nova |
|---|---|---|---|
| **15** | 114 → **271** | 18 (abaixo) → 22 (abaixo) | turma e linha da turma |
| **13** | 273 → **413** | 31 (abaixo) → 34 (**4 acima**, 30 abaixo) | turma |
| **40** | 642 → **699** | 35 (5 acima, 30 abaixo) → 30 (5 acima, 25 abaixo) | turma |
| **47** | 60 → **88** | 8 (abaixo) → 12 (abaixo) | linha da turma |
| **127** | 19 → **41** | 5 (abaixo) → 9 (abaixo) | linha da turma |

Nenhum outro instrutor muda. ⚠️ **O instrutor 13 ganha 4 semanas ACIMA da faixa** (as duas disciplinas
do C-Exp-Ag-Mag 2026 caem nas mesmas 4 semanas, 16/03 a 10/04): é alerta, não bloqueio (`RN-DEG-02`), e
aparece na ficha dele depois da M2.

---

## O que vale para as duas
- **`pnpm db:tipos`** depois das duas: as funções novas entram em `lib/tipos/database.ts`; a view da M2
  não muda o tipo.
- **Toda view nova repete o `revoke`** (achado do Épico 1) e **toda view recriada repete o
  `with (security_invoker = true)`** (gotcha 10) — o pgTAP `010_estrutura.sql` já reprova view sem a
  opção.
- **O rito do remoto** está em `../plano-de-aplicacao-no-remoto.md`. Antes do `db push`, a medição desta
  página é **refeita sobre o backup do dia**: se os números mudaram, a tabela é atualizada e volta para
  você.
- ⚠️ **Duas migrations num PR** é exceção ao Princípio VI: justificativa no *Complexity Tracking* do plan
  e **aprovada** por Bernardo em 17/10/2026 (**P-2**).
