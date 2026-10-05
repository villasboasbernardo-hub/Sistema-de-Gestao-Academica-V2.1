# Data model — o que existe, o que muda no PR B, e o que vive só em memória

> Fase 1 do `/speckit-plan`. Tudo o que é "existe" foi medido em `estado-atual.md`; tudo o que é
> "muda" é o **PR B**, a única migration desta feature; tudo o que é "memória" é `lib/dominio/dsa/`.

---

## 1. Entidades — quem é dado e quem é cálculo

| Entidade | Vive em | Nesta feature |
|---|---|---|
| **Lançamento de aula** | `registros_aula` (23 colunas) | ganha `disciplina_id` (PR B); a `ta_final` **gerada** não se escreve |
| **Avaliação / Vista** | `avaliacoes` (31 colunas) | **nada muda**: fiscal externo e posição da vista já existem |
| **Atividade não letiva** | `atividades_nao_letivas` (21 colunas) | ganha `responsavel_externo` e `instrutor_id` (PR B); `compoe_cht` gerada já exclui o EI |
| **Regime vigente** | `curso_regime_historico`, por `app.fn_regime_vigente(curso, data, tipo)` | **nada muda**; a correção do relógio é **cadastro** (plan §7) |
| **Catálogo de horários** | `configuracoes_horario` + `horarios_tempos_aula` | **nada muda**; manda só quando a vigência o aponta |
| **Feriado** | `feriados` (`impacto`: `dia_inteiro` desconta) | nada muda; licenças entram como linhas dele (`Q-16`), distinguidas pela `descricao` |
| **Responsável / assinatura** | `responsaveis_curso` (papel, modo, vigência, `curso_id` nulável = GERAL) | nada muda; a resolução **curso → GERAL** é `assinaturas.ts` |
| **Ocupação da semana** | `vw_ocupacao_ta` | recriada no PR B: `LEFT` na UE, global incluída, `local`, `fiscal_id`, `herdado` |
| **Execução por disciplina / por UE** | `vw_disciplinas_execucao` / `vw_unidades_ensino_execucao` | a primeira recriada (`LEFT`); a segunda **não muda** |
| **Conflito** | **memória** (`conflitos.ts`) sobre os fatos de `conflitos_da_semana()` | função nova (PR B); **nunca** tabela |
| **Bloco** | **memória** (`bloco.ts`) | o contrato do Épico 12 (§4) |
| **Grade da semana** | **memória** (`grade.ts`) | matriz `dia × TA`, faixa "Sem posição", sábado |
| **Parâmetros** | `config_parametros` | `dsa.teto_tfm_semana` = 6 · `dsa.teto_recomendado_semana` = 25 · `dsa.sabado_tempos` = 5 (PR B, dados) |
| **Técnicas de ensino** | `config_listas`, lista **`metodologias`** — a que **já existe**, com 16 linhas medidas | ⚠️ **nenhuma lista nova** (`H1`): 3 ganham `metadados.sigla` (EO, AP, PP), **6** nascem com sigla (PM, PO, OD, TI, TG, EI), e as outras 13 ficam **sem** sigla, imprimindo por extenso |
| **Subtipo de atividade** | `config_listas`, lista **`tipos_atividade`** — 13 linhas medidas | ⚠️ ganha `metadados.categoria` (`H2`): 7 recebem AEC/TAD/TR, **3** nascem (Visita Técnica, Estudo Individual, Monitoria), e *Licença de Pagamento* fica **sem** categoria — ela vem do calendário (`Q-16`) |

---

## 2. Identidade, unicidade e ciclo de vida

- **Identidade**: `id uuid` em tudo; `codigo` gerado por `DEFAULT app.proximo_codigo_*` onde existe (a mensagem de recusa distingue código gerado — gotcha 9).
- **Posição**: `(turma_id, data, ta_inicial, tempos_consumidos)`; `ta_final` é coluna **gerada** — sobreposição **não é unicidade**: é conflito (`RN-CONF-01`), sinalizado e nunca recusado. ⚠️ **Nenhum `EXCLUDE` constraint** é criado — proibido pela regra.
- **Ciclo de vida**: `status` (`ativo | inativo`) em aula e atividade; `status_avaliacao` (`pendente | em_andamento | concluida | atrasada | cancelada`) em avaliação. **Excluir** = `inativo` / `cancelada`. **Mover** = `UPDATE` de `data`, `ta_inicial` (e `tempos_consumidos` ao redimensionar) **no mesmo `id`**.
- **A catraca do histórico** (`origem_migracao_v1 IS NOT NULL AND editado_em IS NULL`): a primeira edição carimba `editado_em` e a linha passa a obedecer **tudo** — UE (salvo a isenção nominal), tempos, coerência de TA. A tela pede o que falta **no mesmo ato** (plan §8).

---

## 3. O PR B — a migration, em SQL de rascunho

> Cabeçalho com data local, decisão de origem (`Q-1`, `Q-8`, `Q-17`, `V-5`, `V-7`, `Q-10`, `Q-4`) e o
> plano de reversão escrito **antes** do `up`. Nome gerado pela CLI (`supabase migration new
> dsa_lancamento_sem_ue_e_conflito`); o carimbo é UTC, e isso não é erro.

```sql
-- 3.1  A disciplina na linha, para quando não há UE (Q-1)
alter table public.registros_aula
  add column disciplina_id uuid;
alter table public.registros_aula
  add constraint reg_aula_disciplina_do_curso
  foreign key (disciplina_id, curso_id) references public.disciplinas (id, curso_id)
  on delete restrict;
comment on column public.registros_aula.disciplina_id is
  'A disciplina quando não há UE (curso por competências ou disciplina sem UE — Q-1 da spec 013). '
  'Quando há UE, ela é a fonte e esta coluna fica nula.';

-- 3.2  O porteiro da isenção: SÓ curso por competências ou disciplina sem UE
create or replace function app.disciplina_sem_ue(p_disciplina_id uuid)
returns boolean language sql stable security invoker as $$
  select coalesce(d.sem_unidades_ensino, false) or c.curriculo_modelo = 'competencias'
    from public.disciplinas d join public.cursos c on c.id = d.curso_id
   where d.id = p_disciplina_id
$$;
revoke all on function app.disciplina_sem_ue(uuid) from public, anon;
grant execute on function app.disciplina_sem_ue(uuid) to authenticated, service_role;

-- 3.3  UE OU disciplina-com-tópico; e a catraca ganha UMA isenção nominal
alter table public.registros_aula drop constraint reg_aula_ue_so_nula_no_historico;
-- ⚠️ `coalesce(…, false)` NAO E ZELO: `CHECK` passa em NULL, e `app.disciplina_sem_ue` devolve
--    NULL quando a linha nao e visivel. Sem o coalesce, o CHECK FALHA ABERTO — a classe do gotcha 15.
alter table public.registros_aula add constraint reg_aula_ue_so_nula_no_historico check (
     unidade_ensino_id is not null
  or (origem_migracao_v1 is not null and editado_em is null)                 -- a catraca de sempre
  or (disciplina_id is not null
      and coalesce(app.disciplina_sem_ue(disciplina_id), false))             -- a isenção da Q-1
);
alter table public.registros_aula add constraint reg_aula_ue_ou_disciplina check (
     unidade_ensino_id is not null
  or (disciplina_id is not null
      and coalesce(app.disciplina_sem_ue(disciplina_id), false)
      and length(btrim(coalesce(conteudo_resumo, ''))) > 0)
  or (origem_migracao_v1 is not null and editado_em is null)
);
alter table public.registros_aula add constraint reg_aula_ue_xor_disciplina check (
  not (unidade_ensino_id is not null and disciplina_id is not null)          -- uma fonte só
);

-- 3.4  O CHECK que a RF-EXTRA-02 afirma e não existia (V-5)
alter table public.atividades_nao_letivas add constraint ativ_estudo_individual_de_turma check (
  categoria_normativa <> 'Estudo_Individual' or escopo = 'turma'
);

-- 3.5  Responsável da atividade: externo OU instrutor (Q-8), no desenho de avaliacoes
alter table public.atividades_nao_letivas
  add column responsavel_externo text,
  add column instrutor_id uuid references public.instrutores (id) on delete restrict;
alter table public.atividades_nao_letivas add constraint ativ_responsavel_exclusivo check (
  responsavel_externo is null or instrutor_id is null
);

-- 3.6  vw_ocupacao_ta: LEFT na UE, global incluída, local, fiscal, herdado — e o INVOKER REPETIDO
create or replace view public.vw_ocupacao_ta with (security_invoker = true) as
  select r.turma_id, r.data, r.ta_inicial, r.ta_final, r.tempos_consumidos,
         'aula'::text as origem, r.id as fato_id,
         coalesce(ue.disciplina_id, r.disciplina_id) as disciplina_id,
         r.instrutor_id, null::uuid as fiscal_id, r.local,
         (r.origem_migracao_v1 is not null and r.editado_em is null) as herdado
    from public.registros_aula r
    left join public.unidades_ensino ue on ue.id = r.unidade_ensino_id
   where r.status = 'ativo' and r.ta_inicial is not null
  union all
  select a.turma_id, a.data_avaliacao, a.ta_inicial, a.ta_final, a.tempos_consumidos,
         'avaliacao', a.id, a.disciplina_id, a.instrutor_responsavel_id, a.fiscal_id, a.local,
         (a.origem_migracao_v1 is not null and a.editado_em is null)
    from public.avaliacoes a
   where a.status <> 'cancelada' and a.ta_inicial is not null
  union all
  select a.turma_id, a.data_vista_prova, a.ta_inicial_vista, a.ta_final_vista, a.tempos_consumidos_vista,
         'vista_prova', a.id, a.disciplina_id, a.instrutor_responsavel_id, a.fiscal_id, a.local_vista,
         (a.origem_migracao_v1 is not null and a.editado_em is null)
    from public.avaliacoes a
   where a.status <> 'cancelada' and a.ta_inicial_vista is not null
  union all
  select n.turma_id, n.data, n.ta_inicial, n.ta_final, n.tempos_consumidos,
         'atividade_nao_letiva', n.id, null::uuid, n.instrutor_id, null::uuid, n.local,
         (n.origem_migracao_v1 is not null and n.editado_em is null)
    from public.atividades_nao_letivas n
   where n.status = 'ativo' and n.ta_inicial is not null;      -- SEM "turma_id is not null": a global entra (V-7)
revoke delete, truncate on public.vw_ocupacao_ta from authenticated, anon;

-- 3.7  vw_disciplinas_execucao: o mesmo LEFT + coalesce no CTE `aulas`, com o invoker repetido
--      (definição completa no arquivo; aqui só a linha que muda)
--      FROM registros_aula r LEFT JOIN unidades_ensino ue ON ue.id = r.unidade_ensino_id
--      ... group by coalesce(ue.disciplina_id, r.disciplina_id), r.turma_id

-- 3.8  O conflito entre turmas, sem o dado alheio (Q-17) — contrato em contracts/conflito.md
create or replace function public.conflitos_da_semana(p_turma_id uuid, p_de date, p_ate date)
returns table (data date, ta_inicial smallint, ta_final smallint,
               instrutor_id uuid, fiscal_id uuid, local text)
language plpgsql security definer set search_path = public, app as $$
begin
  if coalesce(app.pode('registros_aula', 'ler'), false) is not true
     or coalesce(app.alcanca_turma(p_turma_id), false) is not true then
    raise exception 'Sem alcance para a turma.' using errcode = '42501', hint = 'sem_alcance';
  end if;
  return query
    with minha as (
      select o.data, o.ta_inicial, o.ta_final, o.instrutor_id, o.fiscal_id, o.local
        from public.vw_ocupacao_ta o                       -- aqui roda como DEFINER: vê todas
       where o.turma_id = p_turma_id and o.data between p_de and p_ate
    )
    select o.data, o.ta_inicial, o.ta_final, o.instrutor_id, o.fiscal_id, o.local
      from public.vw_ocupacao_ta o
      join minha m on m.data = o.data
                  and o.ta_inicial <= m.ta_final and o.ta_final >= m.ta_inicial
                  and (   (o.instrutor_id is not null and o.instrutor_id in (m.instrutor_id, m.fiscal_id))
                       or (o.fiscal_id    is not null and o.fiscal_id    in (m.instrutor_id, m.fiscal_id))
                       or (o.local is not null and o.local = m.local))
     where o.turma_id <> p_turma_id and o.data between p_de and p_ate;
end $$;
revoke all on function public.conflitos_da_semana(uuid, date, date) from public, anon;
grant execute on function public.conflitos_da_semana(uuid, date, date) to authenticated;

-- 3.9  Dados: parâmetros e a lista de técnicas (idempotentes, com origem)
insert into public.config_parametros (chave, valor, natureza, norma_origem, descricao) values
  ('dsa.teto_tfm_semana',          '6',  'normativo',   'RN-DIST-03 (a)', 'Teto rígido de TA de TFM por semana'),
  ('dsa.teto_recomendado_semana',  '25', 'normativo',   'RN-DIST-03 (c)', 'Teto recomendado por disciplina por semana'),
  ('dsa.sabado_tempos',            '5',  'operacional', 'Q-4 da spec 013', 'TA do sábado quando o operador o abre')
on conflict (chave) do nothing;
-- 3.10  A SIGLA vai para a lista QUE JA EXISTE — `metodologias`, 16 linhas medidas (H1).
--       ⚠️ Eu havia proposto uma lista nova `tecnicas_de_ensino`; o analyze mediu o REMOTO e
--          mostrou que seria SEGUNDA FONTE DE VERDADE do mesmo conceito. Decisao de Bernardo:
--          sem lista nova. Tres existentes ganham sigla; seis nascem; as outras 13 ficam sem
--          sigla e imprimem por extenso (RN-DEG-01). `PE` fica de fora.
update public.config_listas c set metadados = coalesce(c.metadados, '{}'::jsonb) || jsonb_build_object('sigla', s.sigla)
  from (values ('Exposição Oral','EO'), ('Aula Prática','AP'), ('Prova Prática','PP')) as s(valor, sigla)
 where c.lista = 'metodologias' and c.valor = s.valor
   and coalesce(c.metadados->>'sigla', '') <> s.sigla;

insert into public.config_listas (lista, valor, rotulo_exibicao, ordem, ativo, metadados, origem_migracao_v1)
select 'metodologias', v, v, (select coalesce(max(ordem), 0) from public.config_listas where lista = 'metodologias') + n,
       true, jsonb_build_object('sigla', s), 'spec-013'
  from (values ('Prova Mista', 'PM', 1), ('Prova Objetiva', 'PO', 2),
               ('Observação de Desempenho', 'OD', 3), ('Trabalho Individual', 'TI', 4),
               ('Trabalho em Grupo', 'TG', 5), ('Estudo Individual', 'EI', 6)) as t(v, s, n)
 where not exists (select 1 from public.config_listas x where x.lista = 'metodologias' and x.valor = t.v);

-- 3.11  A CATEGORIA NORMATIVA de cada subtipo, na lista `tipos_atividade` (13 linhas medidas) — H2.
--       ⚠️ Ela MISTURA aula com nao-letivo, e e por isso que o seletor de subtipo precisa filtrar:
--          `Aula`, `Aula Teorica`, `Aula Pratica`, `Avaliacao` e `Vista de Prova` NAO recebem
--          categoria nao letiva. `Licenca de Pagamento` fica SEM categoria — vem do calendario (Q-16).
update public.config_listas c set metadados = coalesce(c.metadados, '{}'::jsonb) || jsonb_build_object('categoria', s.cat)
  from (values ('Palestra','AEC'), ('Atividade Extracurricular','AEC'), ('Orientação de TFM','AEC'),
               ('Evento/Cerimônia','TAD'), ('Administração','TAD'),
               ('Tempo Reserva','TR'), ('Recuperação da Aprendizagem','TR')) as s(valor, cat)
 where c.lista = 'tipos_atividade' and c.valor = s.valor
   and coalesce(c.metadados->>'categoria', '') <> s.cat;

insert into public.config_listas (lista, valor, rotulo_exibicao, ordem, ativo, metadados, origem_migracao_v1)
select 'tipos_atividade', v, v, (select coalesce(max(ordem), 0) from public.config_listas where lista = 'tipos_atividade') + n,
       true, jsonb_build_object('categoria', cat), 'spec-013'
  from (values ('Visita Técnica', 'AEC', 1), ('Estudo Individual', 'Estudo_Individual', 2),
               ('Monitoria', 'Estudo_Individual', 3)) as t(v, cat, n)
 where not exists (select 1 from public.config_listas x where x.lista = 'tipos_atividade' and x.valor = t.v);
```

⚠️ **O que esta migration NÃO faz:** não apaga coluna (`disciplina_codigo_legado_v1` fica); não
cria policy de `DELETE`; não muda `vw_carga_horaria_turma` nem `vw_unidades_ensino_execucao`; não
toca em `feriados` nem em `responsaveis_curso`; não altera a matriz. **Plano de reversão**: `drop`
das constraints e colunas novas, `drop function`, e as duas views **recriadas com a definição
anterior e com `with (security_invoker = true)`** — é a linha que a prova de reversão por `pg_dump`
confere.

---

## 4. O Bloco — o contrato do Épico 12, só em memória

```ts
// lib/dominio/dsa/bloco.ts — o MESMO objeto que o formulário manda e que o motor vai produzir
export type Bloco = {
  readonly turmaId: string;
  readonly data: string;                 // AAAA-MM-DD — texto, nunca Date
  readonly taInicial: number;            // 1..12
  readonly tempos: number;               // 1..12
  readonly tipo: "aula" | "avaliacao" | "vista_prova" | "aec" | "tad" | "tr" | "estudo_individual";
  readonly disciplinaId?: string;        // obrigatório em aula/avaliação/vista
  readonly unidadeEnsinoId?: string;     // aula: obrigatório, SALVO disciplina sem UE
  readonly instrutorId?: string;         // aula: obrigatório (CHECK); avaliação: o responsável
  readonly fiscal?: { readonly instrutorId: string } | { readonly nomeExterno: string };
  readonly tecnica?: string;             // valor da lista tecnicas_de_ensino
  readonly local?: string;
  readonly conteudo?: string;            // aula sem UE: obrigatório (tópico)
  readonly subtipo?: string;             // atividade: valor da lista
  readonly responsavelExterno?: string;  // atividade (Q-8)
};
```

`blocoValido(bloco, contexto)` devolve `{ ok: true } | { ok: false; motivos: string[] }` com as regras
que **não dependem do banco** (campos obrigatórios por tipo, faixa de TA, UE × disciplina). O que
depende do banco (habilitação, alcance, curso em oferta, TFM) é do servidor. `lib/validacao/dsa.ts`
é este tipo em Zod, **um** esquema para os dois lados.

---

## 5. A grade em memória

```ts
export type Celula = { dia: string; ta: number; bloco?: BlocoNaGrade; estado: "livre" | "ocupada" | "continuacao" | "bloqueada" | "sem_relogio" };
export type BlocoNaGrade = Bloco & { fatoId: string; trechos: readonly Trecho[]; herdado: boolean; lancadoAFrente: boolean;
                                     conflito?: "instrutor" | "fiscal"; alertaSala?: boolean };
export type Trecho = { inicio: "HH:MM"; fim: "HH:MM" };          // 1 ou 2 — o almoço quebra
export type Dia = { data: string; bloqueio?: string; avisos: string[]; celulas: Celula[]; semPosicao: BlocoNaGrade[] };
export type Semana = { dias: Dia[]; relogio: Relogio | null; sabadoAberto: boolean; capacidadeTa: number };
```

- `relogio` é `null` quando não há regime → `estado: "sem_relogio"` em toda célula e a grade mostra TA numerados.
- `capacidadeTa` = `capacidade.ts` (TA do regime × dias úteis − feriados `dia_inteiro` × TA).
- `lancadoAFrente` = `data > hojeNaCiaara()` (`Q-2`).

---

## 6. Volumes para dimensionar, não para otimizar

7 turmas ativas · a semana mais cheia tem **45 TA** (9 × 5) + sábado 5 · `vw_ocupacao_ta` devolve no
máximo ~50 linhas por semana e turma · a função de conflito cruza isso com as ocupações das **6**
outras turmas ativas na mesma janela · 188 avaliações e 664 atividades **inteiras** só entram na
faixa "Sem posição", nunca na matriz.
