# Contrato — o andamento da turma (PR 3)

## 1. O módulo puro — `lib/dominio/andamento-da-turma.ts`

```ts
/**
 * `RF-INI-01` — por turma, CH prevista, executada e restante; "em atraso" é turma em andamento com
 * saldo de capacidade negativo. Fórmulas da v1.0 (`Código.gs`, `getDashboardGeral` e
 * `temposDiaDaTurma_`), transcritas por Bernardo Villas Boas em 03 e 04/10/2026 — ⚠️ o arquivo
 * NÃO está neste repositório; a citação é testemunho datado do responsável, não medição.
 * `RN-CRONOS-01` (executado = lançamento, nunca planejamento — honrada pela view que alimenta
 * `executada`), `RN-EVT-02` (feriado só desconta se dia inteiro — honrada por quem monta a lista),
 * `RN-MAT-04` (capacidade pela modalidade real da turma).
 */
export function diasUteisEntre(hoje: string, termino: string, feriadosDiaInteiro: readonly string[]): number;
export function capacidadeDiaria(modalidade: string, regime: RegimeDoCurso): number | null;
export function andamentoDaTurma(turma: TurmaParaAndamento, regime: RegimeDoCurso, feriadosDiaInteiro: readonly string[], hoje: string): Andamento;
```

(Tipos em `data-model.md` §5.)

### 1.1 As fórmulas, uma por linha

| Grandeza | Fórmula | Observação |
|---|---|---|
| `restante` | `max(prevista − executada, 0)` | nunca negativa — excesso não é "restante negativo" |
| `percentual` | `round(100 · executada / prevista)` | `prevista = 0` → `null` (currículo por competências) |
| `capacidadeDiaria` | `ead` → `limiteDiarioEadHoras`; senão → `regimePadraoTempos` | nulo ou `≤ 0` → `null` → `sem_regime` (D8) |
| `diasUteis` | nº de seg–sex em `[hoje, termino]` − nº de feriados dia inteiro **distintos** que caem em seg–sex nesse intervalo | `termino < hoje` → 0; `termino` nulo → `sem_termino` (D7, D9) |
| `capacidade` | `diasUteis × capacidadeDiaria` | — |
| `saldo` | `capacidade − restante` | **"Saldo de capacidade (TA)"** — D-NAV-4 |
| `saldoEmDias` | `floor(saldo / capacidadeDiaria)` | negativo quando falta |
| `emAtraso` | `status === "ativa" && saldo < 0` | só com capacidade calculada |
| `semLancamentos` | `executada === 0` | a tela diz *"ainda sem lançamentos"* e não mostra `0%` |

### 1.2 Os casos de unidade que o módulo nasce com

| # | Caso | O que prova |
|---|---|---|
| U1 | prevista 100, executada 40, 10 dias úteis, 8 TA/dia → capacidade 80, saldo 20, 2 dias, **não** em atraso | o caminho feliz, calculado à mão |
| U2 | prevista 100, executada 40, **5** dias úteis, 8 TA/dia → capacidade 40, saldo −20, −3 dias, **em atraso** | o lado positivo do caso que discrimina |
| U3 | prevista 10, executada **12**, 20 dias úteis → restante 0, saldo 160, **não** em atraso | o excesso — **virava "em atraso" no `/inicio` antigo** (DoD 8) |
| U4 | U2 com `status: "concluida"` → não em atraso | *"em andamento"* do `RF-INI-01` |
| U5 | `dataTermino: null` → `sem_termino`, `saldo: null`, não em atraso; prevista/executada/percentual presentes | FR-026.1, edge case |
| U6 | regime `{ 0, null }` para turma presencial → `sem_regime`; regime `{ 8, null }` para turma **ead** → `sem_regime` (sem fallback) | D8 |
| U7 | regime `{ 0, 4 }` para turma ead → capacidade diária 4 | a divisão por modalidade |
| U8 | intervalo seg→sex com um feriado dia inteiro na quarta → 4; o mesmo feriado **duplicado** na lista → 4; feriado no sábado → 5 | D9 e a origem com data repetida |
| U9 | `hoje` = sábado, `termino` = domingo seguinte → 5 (seg–sex do meio); `hoje` = `termino` numa quarta → 1 | inclusivo nas duas pontas (D7) |
| U10 | prevista 0 → `percentual: null`, `restante: 0` | edge case do currículo por competências |
| U11 | executada 0 → `semLancamentos: true` | FR-029 |
| U12 | `termino < hoje`, `ativa`, restante 30 → diasUteis 0, capacidade 0, saldo −30, **em atraso** | edge case "término já passou" |

**Regra 9.3:** cada número da tabela é calculado antes de o teste ser escrito, e a conta fica no
comentário do caso.

## 2. A seção Andamento na ficha (`[data-slot="andamento-da-turma"]`)

```
CH prevista      120 TA      [data-andamento="prevista"]
CH executada      84 TA      [data-andamento="executada"]
Progresso         70 %       <BarraDeProgresso valor=70> role="progressbar" aria-valuenow=70
Saldo de capacidade (TA)   +32 TA · 4 dias     [data-andamento="saldo"] [data-andamento="saldo-em-dias"]
Capacidade diária  8 TA/dia · 15 dias úteis até 20/11/2026   [data-andamento="capacidade"]
<BadgeStatus tom="atrasado" rotulo="em atraso"/>   só quando emAtraso   [data-slot="em-atraso"]
```

| Estado | O que a seção mostra |
|---|---|
| `calculada`, saldo ≥ 0 | tudo acima, sem badge |
| `calculada`, saldo < 0, `ativa` | tudo acima **e** a badge; o saldo em vermelho de token (`atrasado-tinta`) |
| `calculada`, saldo < 0, não ativa | tudo acima, **sem** badge (concluída/cancelada/planejada) |
| `sem_termino` | prevista, executada, progresso; no lugar do saldo: *"Sem data de término — informe-a para calcular o saldo."* |
| `sem_regime` | prevista, executada, progresso; no lugar do saldo: *"Sem dado de capacidade — o curso não tem regime vigente para a modalidade desta turma."* |
| `semLancamentos` | *"Ainda sem lançamentos."* no lugar do **progresso**; prevista, saldo e tarja presentes |
| `percentual: null` | *"O curso não tem carga curricular lançada em disciplinas."* |

Nenhum estado bloqueia a edição da ficha (`FR-033`).

⚠️ **EMENDA DE 04/10/2026, NA IMPLEMENTAÇÃO DA T037:** a linha de `semLancamentos` dizia *"no lugar do
progresso **e do saldo**"*, e o saldo ficou. O motivo é do desenho da própria fórmula: `saldo =
capacidade − restante`, e `restante` é a **prevista inteira** quando nada foi lançado — ou seja, a
turma que ainda não começou é precisamente a que pode já estar sem capacidade para terminar. Esconder
o número e mostrar a tarja *"em atraso"* embaixo diria o veredito sem dizer de quanto. O progresso
continua escondido: ali `0 %` seria afirmação sobre execução, e é o que o `FR-029` recusa.

## 3. A seção Disciplinas ganha duas colunas (PR 3)

Por disciplina: **CH executada** (`temposExecutados`) e **%** (`round(100·exec/prev)`, `—` se prevista
zero). Rodapé: Σ prevista e Σ executada **da grade desta turma**, para serem conferidas contra a seção
Andamento — `SC-005` cenário 7.

⚠️ **EMENDA DE 04/10/2026, NA IMPLEMENTAÇÃO DA T038.** Esta seção dizia que as somas *"reconciliam"*,
e **elas podem divergir por DOIS motivos de desenho**, não um:

| Diferença | Causa medida |
|---|---|
| a **prevista** do Andamento é maior | `chr_curricular` soma a CH de **todas as disciplinas ativas do CURSO** (lido na definição de `vw_carga_horaria_turma`), e a grade da turma pode não ter todas — 210 linhas de `turma_disciplina` para 175 disciplinas em 28 turmas |
| a **executada** por disciplina é menor | `vw_disciplinas_execucao` soma por **unidade de ensino** e `vw_carga_horaria_turma` por **turma**: lançamento com `unidade_ensino_id` nula entra no total e não aparece por disciplina (as 1.566 linhas do ETL) |

A segunda é dita na tela, com o número: *"N TA lançados sem unidade de ensino não aparecem por
disciplina."* A primeira é dita no **rótulo** (*"Σ nesta grade"*). ⚠️ **O caso positivo da frase não é
semeável:** a catraca `reg_aula_ue_so_nula_no_historico` recusa lançamento novo sem UE, então ele só
se observa no banco **local**, com a carga do ETL — e está no roteiro de conferência do PR 3.
Preencher a UE é a aplicação do cruzamento, pendência do Épico 2.

## 4. `/inicio` — o que muda e o que não muda

| Não muda | Muda |
|---|---|
| `AlertaConformidade`, títulos e textos (*"Turmas exigindo atenção"*, *"saldo de carga horária negativo"*) | o **veredito** `emAtraso` vem de `andamentoDaTurma` |
| `[data-slot="panorama-de-turmas"]`, `[data-turma]`, `[data-progresso]`, `BadgeStatus` | `montarPanorama` recebe `turmas` (`id, data_termino, modalidade`), o regime por curso e os feriados |
| totais por soma (`totaisDo`) | `percentual` passa pela mesma função (mesmo resultado, uma fonte) |
| o filtro do panorama | — |

`FR-031.2`: nenhuma coluna nova no painel; o saldo em TA **não** entra no Início nesta fatia.

## 5. O caso que discrimina no e2e (`tests/e2e/inicio.spec.ts` + `panorama-de-teste.ts`)

A semente passa a plantar três turmas:

| Turma | Prevista | Executada | Término | Regime | Veredito antigo | Veredito novo |
|---|---|---|---|---|---|---|
| `turmaEmExcesso` (era `turmaAtrasada`) | 10 | 12 | hoje + 30 dias úteis | 8 TA/dia | **em atraso** (restante −2) | **não** (restante 0) |
| `turmaEmDia` | 50 | 10 | hoje + 30 dias úteis | ead, limite 4 h | não | não (capacidade 120 > 40) |
| `turmaSemCapacidade` (**nova**) | 100 | 10 | hoje + 2 dias úteis | 8 TA/dia | **não** (restante 90 > 0) | **em atraso** (capacidade 16 < 90) |

O teste *"só a turma com saldo NEGATIVO é sinalizada"* passa a nomear `turmaSemCapacidade` e a exigir
`toHaveCount(0)` em `turmaEmExcesso` — **os dois vereditos viram**. A semente é compartilhada por
`cursos-de-teste.ts`, `instrutores-de-teste.ts` e `url-degradada.spec.ts`; os quatro são rodados.

## 6. Guardas novas

| Guarda | O que cobra |
|---|---|
| `tests/unidade/vocabulario-proibido.test.ts` | zero `gordura` em código sem comentário de `app`, `lib`, `components`, `supabase`, `tests` (**este arquivo excluído**); controle positivo: `Saldo de capacidade` existe na ficha |
| `tests/unidade/andamento-unico.test.ts` | `emAtraso` **atribuído** só em `lib/dominio/andamento-da-turma.ts`; `panorama.ts` e a ficha o **importam** de lá; controle positivo: o import existe nos dois |
