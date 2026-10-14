# Contrato — parar um dia no DSA (US4, FR-023 a FR-028.1)

## Entrada da Server Action `pararDia` (`lib/acoes/dsa.ts`), Zod na primeira linha

```ts
{
  turmaId: string,                       // a turma da página; o alcance decide se ela é usada
  data: string,                          // ISO, dentro da semana aberta
  alcance: "turma" | "todas",
  diaInteiro: boolean,
  taInicial?: number, tempos?: number,   // obrigatórios quando !diaInteiro
  tipoParadaId: string,                  // id de config_listas.tipos_parada, ativo (FK no banco)
  motivo: string,                        // 3..200
  prevista: boolean,                     // true por padrão; a coluna dias_parados.prevista recebe este valor
  consomeTempoReserva: boolean,          // só aceito quando !prevista, o tipo tem aceita_tr e o dia NÃO está no calendário
  confirmado?: boolean                   // obrigatório quando o dia já tem lançamentos: sem ele a ação devolve { ok: false, erro: "confirmar", lancamentosNoDia } e não grava
}
```

## Para onde vai (R-1), e a recusa que cada caminho dá

| Caso | Grava | Recusa |
|---|---|---|
| `todas` + `diaInteiro` + !TR | `feriados` (`dia_inteiro`, `descricao = "<tipo> — <motivo>"`) | `42501` sem `calendario.criar` |
| `todas` + parte do dia + !TR | `dias_parados` com `turma_id` nulo | `42501` sem `calendario.criar` |
| `todas` + TR | `atividades_nao_letivas` TR global `bloqueia_aula` | `42501` sem `calendario.criar` (⚠️ **não** basta `atividades_globais.criar`) |
| `turma` + !TR | `dias_parados` da turma | `42501` sem `atividades_nao_letivas.criar` na turma |
| `turma` + TR | `atividades_nao_letivas` TR da turma, `bloqueia_aula` | idem |
| dia já bloqueado no calendário + `consomeTempoReserva` | — | `"o dia já está parado no calendário; parada prevista não consome Tempo Reserva"` (FR-025.2) |
| `prevista` + `consomeTempoReserva` | — | `"parada prevista não consome Tempo Reserva"` (FR-025.2) |
| `todas` + `diaInteiro` + `!prevista` + !TR | `feriados` (`dia_inteiro`): entrar no calendário a torna prevista | — |
| tipo com `pode_global = false` + `todas` | — | `"este tipo de parada é só de turma"` |
| data com aula gravada | grava, **depois** do aviso de confirmação com a contagem (edge case) | — |

## Saída

`{ ok: true, codigo, destino: "calendario" | "dia_parado" | "tempo_reserva", lancamentosNoDia: n }`
ou `{ ok: false, erro, campo? }` traduzido por `traducao-de-recusas.ts`.

## Desfazer (`desfazerParada`)

```ts
{ turmaId, destino: "calendario" | "dia_parado" | "tempo_reserva", codigo }  → { ok: true, codigo } | { ok: false, erro }
```

Inativa a linha do destino (`status = 'inativo'`). Mesma permissão do alcance. Devolve o dia à aula e
tira da linha "dias parados" ou do TR o que a parada somou. Nada é apagado.

## O que a grade e o papel mostram (FR-027)

Dia inteiro: a coluna do dia com o **tipo e o motivo** no lugar dos tempos. Parte do dia: os tempos
cobertos, com o mesmo texto, e o `rotulo` *"Parado — LA: <motivo>"*. O TR bloqueante aparece como
TR **e** bloqueado. A cascata (D-DSA-3) trata os três como parede: recusa e nomeia.

## A recusa de aula (FR-026) — `recusaDeAulaNoDia` estendida

```ts
recusaDeAulaNoDia({ dataAtual, data, taInicial, tempos, feriados, diasParados, atividadesBloqueantes, turmaId })   // dataAtual já existe hoje e fica
  → null | { motivo, origem: "calendario" | "dia_parado" | "tempo_reserva", frase }   // frase da RN-EVT-04
```

Vale em `lancar`, `mover`, `editar` (crescer) e na cascata. **Avaliação e atividade não letiva não
são recusadas** (texto da `RN-EVT-04`, L372) — a emenda autorizada por D-AA-13 estende o bloqueio à
parada de tempos, **para aula**, e não muda o alcance quanto ao que é recusado.
