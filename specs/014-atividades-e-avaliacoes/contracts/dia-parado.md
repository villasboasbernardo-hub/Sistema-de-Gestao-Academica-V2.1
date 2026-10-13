# Contrato — parar um dia no DSA (US4, FR-023 a FR-028.1)

## Entrada da Server Action `pararDia` (`lib/acoes/dsa.ts`), Zod na primeira linha

```ts
{
  turmaId: string,                       // a turma da página; o alcance decide se ela é usada
  data: string,                          // ISO, dentro da semana aberta
  alcance: "turma" | "todas",
  diaInteiro: boolean,
  taInicial?: number, tempos?: number,   // obrigatórios quando !diaInteiro
  tipoParada: string,                    // valor de config_listas.tipos_parada, ativo
  motivo: string,                        // 3..200
  consomeTempoReserva: boolean           // só aceito quando o tipo tem aceita_tr e o dia NÃO está no calendário
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
| tipo com `pode_global = false` + `todas` | — | `"este tipo de parada é só de turma"` |
| data com aula gravada | grava, **depois** do aviso de confirmação com a contagem (edge case) | — |

## Saída

`{ ok: true, codigo, destino: "calendario" | "dia_parado" | "tempo_reserva", lancamentosNoDia: n }`
ou `{ ok: false, erro, campo? }` traduzido por `traducao-de-recusas.ts`.

## Desfazer (`desfazerParada`)

Inativa a linha do destino (`status = 'inativo'`). Mesma permissão do alcance. Devolve o dia à aula e
tira da linha "dias parados" ou do TR o que a parada somou. Nada é apagado.

## O que a grade e o papel mostram (FR-027)

Dia inteiro: a coluna do dia com o **tipo e o motivo** no lugar dos tempos. Parte do dia: os tempos
cobertos, com o mesmo texto, e o `rotulo` *"Parado — LA: <motivo>"*. O TR bloqueante aparece como
TR **e** bloqueado. A cascata (D-DSA-3) trata os três como parede: recusa e nomeia.

## A recusa de aula (FR-026) — `recusaDeAulaNoDia` estendida

```ts
recusaDeAulaNoDia({ data, taInicial, tempos, feriados, diasParados, atividadesBloqueantes, turmaId })
  → null | { motivo, origem: "calendario" | "dia_parado" | "tempo_reserva", frase }   // frase da RN-EVT-04
```

Vale em `lancar`, `mover`, `editar` (crescer) e na cascata. **Avaliação e atividade não letiva não
são recusadas** (texto da `RN-EVT-04`, L372) — a emenda autorizada por D-AA-13 estende o bloqueio à
parada de tempos, **para aula**, e não muda o alcance quanto ao que é recusado.
