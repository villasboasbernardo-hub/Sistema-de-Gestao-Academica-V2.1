# Contrato do conflito — `public.conflitos_da_semana()` e `conflitos.ts`

> `RN-CONF-01` **[REVISADA]**: conflito = TA sobrepostos no mesmo dia **e** (mesmo instrutor **ou**
> mesma sala), em **todas** as turmas, calculado **em memória**, **nunca** persistido, **sempre**
> sinalização. A regra avisa que *"exige acesso a mais dados"* — e é por isso que existe a função.

## A função — o que entra, o que sai, o que NUNCA sai

```
public.conflitos_da_semana(p_turma_id uuid, p_de date, p_ate date)
  returns table (data date, ta_inicial smallint, ta_final smallint,
                 instrutor_id uuid, fiscal_id uuid, local text)
  SECURITY DEFINER · search_path = public, app
```

| | |
|---|---|
| **Porteiro** | `coalesce(app.pode('registros_aula','ler'), false) is not true or coalesce(app.alcanca_turma(p_turma_id), false) is not true` → `raise … errcode 42501, hint 'sem_alcance'`. ⚠️ Escrito na forma que **falha fechado** (gotcha 15); o pgTAP, sem sessão, prova que levanta |
| **Devolve** | das ocupações de **outras** turmas na janela, **só as que cruzam** com instrutor, fiscal ou local de alguma ocupação da minha turma: `data`, `ta_inicial`, `ta_final`, `instrutor_id`, `fiscal_id`, `local` |
| **NUNCA devolve** | `turma_id`, `fato_id`, `disciplina_id`, conteúdo, código da turma alheia, origem do fato — **nada que identifique a outra turma** |
| **Janela** | `p_de`..`p_ate` = a semana (segunda a sábado) |
| **Privilégio** | `execute` para `authenticated`; **revogado** de `public` e `anon` |
| **Onde roda** | lê `vw_ocupacao_ta` como DEFINER (vê todas as turmas) **dentro** da função; fora dela a view segue `security_invoker` |

## O domínio — `lib/dominio/dsa/conflitos.ts` (puro)

```ts
export function detectarConflitos(
  meus: readonly BlocoNaGrade[],            // a semana da turma, já com trechos
  alheios: readonly OcupacaoAlheia[],       // o que a função devolveu
): ReadonlyMap<string /* fatoId */, Marca>  // { conflito?: "instrutor" | "fiscal"; alertaSala?: boolean }
```

- **Sobreposição**: `a.taInicial <= b.taFinal && a.taFinal >= b.taInicial` no **mesmo dia**. TA adjacentes (`taFinal = 3`, `taInicial = 4`) **não** se sobrepõem.
- **Primário**: o `instrutorId` **ou** o `fiscal.instrutorId` do meu bloco aparece como `instrutor_id` **ou** `fiscal_id` do alheio → `conflito`.
- **Secundário**: `local` igual (texto normalizado) → `alertaSala`.
- **Dentro da própria turma** também: dois blocos meus com o mesmo instrutor sobrepostos marcam-se mutuamente — sem precisar da função.
- Fiscal **externo** (`nome_fiscal_externo`) não participa: não tem `id` para cruzar — declarado, não esquecido.

## O que a tela faz com a marca

`GradeAlocacao` **pinta**: `conflito` com o token `conflito`/`conflito-tinta`, `alertaSala` com
`atrasado`/`atrasado-tinta` (os tokens do domínio que a `I-4c` conhece — medido no Épico 5.5), e o
número vai no atributo (`aria-label`, `title`), **nunca só na cor** (a regra da barra de progresso).
A gravação **não** é impedida por conflito — nunca. O aviso volta no `avisos[]` da Server Action.

## O que este contrato prova, e como

| Caso | Onde | O que discrimina |
|---|---|---|
| Admin: dois lançamentos do mesmo instrutor, mesmo dia, TA sobrepostos, **turmas diferentes** → ambos marcados (critério **5**) | e2e | — |
| **Operador de escopo recortado**: lança na turma A; o mesmo instrutor está na turma B (curso fora do escopo). A função devolve a ocupação de B **sem** `turma_id`; a leitura direta de B dá **zero linhas** (RLS) — **os dois no mesmo caso** | `tests/invariantes/rls/dsa.test.ts` | com a função **ausente**, o Operador não vê o conflito; com ela, vê — medido **na ordem certa** (DoD 8) |
| Sem sessão → `42501` com `hint = 'sem_alcance'` | pgTAP `116_dsa.sql` | o porteiro na forma `if not fn()` **passaria** este caso sem levantar — é o que a asserção existe para pegar |
| Operador **sem** alcance à própria `p_turma_id` → `42501` | RLS | — |
| TA adjacentes → **nenhuma** marca | Vitest | — |
