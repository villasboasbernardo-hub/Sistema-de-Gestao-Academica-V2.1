# Data model — spec 016 (Bloco 1)

*17/10/2026. **Nenhuma tabela nova e nenhuma coluna em tabela.** O que muda no banco são objetos
derivados (uma view e duas funções novas; uma view recriada com as mesmas colunas). O resto são tipos
de domínio, derivados e não gravados.*

## 1. Objetos de banco

### 1.1 `public.vw_chd_por_fato` — nova (M1)
Um fato de CHD por linha. `security_invoker = true`; leitura para `authenticated` sob a RLS das
tabelas de origem; sem escrita para ninguém.

| Coluna | Tipo | De onde |
|---|---|---|
| `turma_id` | `uuid` | a turma do fato |
| `disciplina_id` | `uuid` | a disciplina da UE, senão a da linha (aula); a da avaliação (aplicação, sessão, vista) |
| `data` | `date` | `registros_aula.data`, `avaliacoes.data_avaliacao`, `sessoes_de_aplicacao.data`, `vistas_de_avaliacao.data` |
| `tempos` | `bigint` | os TA do fato |
| `origem` | `text` | `aula` · `aplicacao` · `sessao_de_aplicacao` · `vista` |

**Invariante (pgTAP 135):** a soma sem corte é **igual** a `vw_carga_horaria_turma.chd_executada` por
turma e a `vw_disciplinas_execucao.ta_executados` por turma × disciplina. Medido: 29/29 e 228/228.

### 1.2 `public.chd_da_turma_ate(p_ate date)` — nova (M1)
`returns table (turma_id uuid, chd_executada bigint)` · `stable` · `security invoker` · **sem valor
padrão** · `execute` só para `authenticated`. Soma os fatos com `data <= p_ate`. Turma sem fato não volta
linha: quem lê usa `0`.

### 1.3 `public.execucao_por_disciplina_ate(p_ate date, p_turma_id uuid)` — nova (M1)
`returns table (disciplina_id uuid, ta_executados bigint, data_real_inicio date)` · mesmas propriedades.
`data_real_inicio` é a primeira data com fato até `p_ate` (o "iniciada" da aba Avaliações).

### 1.4 `public.vw_instrutor_carga_prevista` — recriada (M2)
**Mesmas colunas, mesmos tipos, mesma ordem**, `security_invoker = true`. Muda o conteúdo de três:

| Coluna | Antes | Depois |
|---|---|---|
| `previsao_inicio` | `disciplinas.previsao_inicio` | a janela da **primeira fonte com as duas datas**: linha da turma → disciplina → turma; sem nenhuma, o primeiro início que existir |
| `previsao_termino` | `disciplinas.previsao_termino` | o término da mesma fonte; sem fonte com as duas datas, nulo |
| `ano` | ano de `disciplinas.previsao_inicio` | ano do `previsao_inicio` efetivo |

`semanas`, `media_semanal`, `tempos_previstos` e o rateio em cinco casos **não mudam**.

### 1.5 O que **não** muda
`vw_carga_horaria_turma`, `vw_disciplinas_execucao`, `vw_ocupacao_ta`, `vw_conformidade_tetos`,
`vw_instrutor_carga_anual` (só passa a receber as atribuições com ano), toda tabela e toda policy.

## 2. Tipos de domínio (`lib/dominio/`, TypeScript puro)

### 2.1 Semana do curso — `lib/dominio/dsa/semana-do-curso.ts` (substitui `numero-do-dsa.ts`)
- **Entrada:** `dataInicio` e `dataTermino` da turma (`aaaa-mm-dd` ou nulo), `duracaoSemanas` do curso (ou
  nulo), a semana pedida (`IdentidadeDaSemana`: ano e número ISO).
- **Saída:** `{ numero: number | null, total: number | null, motivo: string | null }`, mais
  `avisoDeDuracao(turma, curso)` → *"a turma tem N semanas e o curso, M"* ou nulo.
- **Regras:** N = semanas entre a segunda-feira da semana do início e a da semana pedida, mais 1, com ou
  sem aula (D-COR-1). T = duração do curso; turma mais longa → semanas da turma; sem duração → semanas da
  turma; sem os dois → nulo (rótulo *"Semana N"*). N fora de 1..T → nulo, com motivo. Nunca zero.
- **Rótulo:** *"Semana N de T"* · *"Semana N"*.

### 2.2 Andamento — `lib/dominio/andamento-da-turma.ts` (muda)
- `executada` chega **até hoje** (da função M1).
- Os dias úteis contam de `diaSeguinte(hoje)` até o término (D-COR-2). `diaSeguinte` é aritmética de
  calendário sobre `aaaa-mm-dd`, sem `Date` de fuso.
- O resto — capacidade pela modalidade da turma, atraso só em turma ativa com saldo negativo — não muda.

### 2.3 Média semanal — `lib/dominio/media-semanal.ts` (novo)
`mediaSemanalDaAtribuicao({ tempos, semanas, inicio, termino })` → a média cadastrada quando `semanas > 0`;
senão `tempos ÷ semanasDaJanela({ inicio, termino }).length` (`RN-DIST-02`, régua da `RN-DIST-01`);
sem janela, nulo.

### 2.4 Só habilitado — `lib/dominio/so-habilitado.ts` (novo)
`disciplinasSoHabilitadas(habilitadas, atribuicoesDoAno)` → o conjunto das disciplinas habilitadas sem
atribuição que conte no ano (NQ-4). Medido no instrutor de código 15: 6 habilitações, 4 atribuições, **2**
marcadas.

### 2.5 Ordem na grade do DSA — `lib/dominio/dsa/grade.ts` (muda)
Fato ganha `criadoEm` e `codigo`; a grade ordena por (TA inicial, criado em, código); o segundo que
começa no mesmo TA vai para *"sem posição"* com o motivo *"no mesmo TA de outro lançamento"* (constante
única, que a planilha também usa).

### 2.6 Transição de situação da turma
`planejada` · `ativa` · `concluida` · `cancelada` — as **12** transições continuam aceitas pelo banco
(pgTAP 101). O que muda é o caminho: na edição, só a ação `trocarSituacaoDaTurma` (Zod: `codigo`,
`status`); na criação, o formulário de hoje.

## 3. Derivados de interface (fora de `lib/dominio/`, sem regra de negócio)

- **Texto da faixa** (`lib/ambiente.ts`): texto Beta + acréscimo só com `local`/`preview` declarados
  (`ambienteDeclarado()`), + o aviso de variável por preencher.
- **Filtros fora do padrão** (`lib/navegacao/`): contagem dos parâmetros da rota cujo valor difere do
  `padrao` do contrato; alimenta o selo do botão e o "Limpar filtros".
- **Pizza** (`components/graficos/tipos.ts`): as 4 maiores + *"Outras (N)"*.
