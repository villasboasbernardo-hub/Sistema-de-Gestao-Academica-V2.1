# Spec 032 — Bloco 17: página da turma (saldo e cartões), abas e Atividades

**Ramo:** `fix/BLOCO-17-turma-saldo-e-atividades` · **Criada:** 01/11/2026 · **Fluxo:** `/corrigir` (um pedido = uma spec =
um PR = uma conferência) · **Papel do DSA:** não muda — o merge não espera a virada de semana.

## 1. O pedido (Bernardo Villas Boas, 01/11/2026)

> PÁGINA DA TURMA 1. Cartões de dados menores, no mínimo necessário (RT-7). A situação da turma vira um cartão na cor da
> situação, com o texto dentro. 2. Cartões novos: "CH restante" (TA ainda não ministrados = prevista − executada); "Dias
> úteis até o término" (de amanhã até o fim da turma; não contam feriados, licenças, dias parados nem dias travados no
> DSA); "CH disponível até o término" = Σ, dia a dia, dos tempos do regime EM VIGOR naquele dia ("desde"/"só esta
> semana" do Bloco 11) × dias úteis. 3. SALDO DE CH, regra nova (substitui o cálculo atual, D-COR-2): saldo = CH
> disponível − CH restante. Situação: ADIANTADA se saldo > uma semana de aula (TA/dia do regime em vigor × 5); DENTRO DO
> PREVISTO se 0 ≤ saldo ≤ uma semana; ATRASADA se saldo < 0. Mesma regra onde o saldo/atraso da turma aparece (ficha,
> /turmas, Início). Calcular em lib/dominio (TS puro). […] 4. Abas novas na página da turma: "APOINST" e "Palestras",
> em branco com o aviso "Em breve". MÓDULO ATIVIDADES 5. Abas: Atividades · Calendário · Palestras (esta em branco, "Em
> breve"). 6. A lista de Atividades deixa de mostrar o Estudo Individual (só some da lista; os lançamentos continuam no
> DSA e na CH, nada é apagado). Filtros e contadores da página também sem EI.

## 2. Triagem, medida na `main` (`d65d5c6`)

| # | Item | Natureza | O que já existia |
|---|---|---|---|
| 1 | Cartões compactos; situação num cartão tingido | Melhoria de tela (RT-7) | Cartões grandes (`text-kpi`, 32 px); a situação era uma etiqueta na lista de dados |
| 2 | CH restante, dias úteis, CH disponível | Melhoria de tela | Os três números **já eram calculados** por `andamentoDaTurma` (`restante`, `diasUteis`, `capacidade` — a soma dia a dia do regime da semana é da spec 029); só a linha *«8 TA/dia · N dias úteis»* os mostrava, dentro do cartão do saldo |
| 2 | «não contam dias parados nem dias travados no DSA» | 🐛 **lacuna da conta** | A capacidade só tirava o **feriado** de dia inteiro; o **dia parado** e o **TR bloqueante** de dia inteiro (que recusam aula pela `RN-EVT-04`) contavam como dia útil |
| 3 | Saldo em três níveis | **Regra nova** (`RN-SALDO-01`, documento 04) | Saldo = capacidade − restante já era a fórmula; o veredito tinha dois níveis (*em atraso* / nada) |
| 4 | Abas APOINST e Palestras na turma | Melhoria de tela | Abas *Ficha · Avaliações* |
| 5 | Aba Palestras em Atividades | Melhoria de tela | Abas *Atividades · Calendário*, só para quem tem calendário |
| 6 | Estudo Individual fora da lista de Atividades | Melhoria de tela | A lista, o filtro *Categoria* e a contagem incluíam o EI |

## 3. Requisitos

- **FR-001** (item 1): os cartões da ficha da turma são **compactos** — `CardKpi` com `compacto` (menos respiro, número
  em `text-xl`) —, numa grade de até seis colunas. A **situação da turma** é um cartão tingido com o **tom** da situação
  (`TOM_DO_STATUS_DE_TURMA`), com o rótulo dentro e *«Arquivada»* no detalhe quando for o caso; ela sai da lista de dados.
- **FR-002** (item 2): três cartões novos — **CH restante** (`restante`), **Dias úteis até o término** (`diasUteis`, de
  amanhã ao término) e **CH disponível até o término** (`capacidade`, com o TA/dia ou a faixa).
- **FR-003** (item 2): os dias úteis descontam, além do feriado e da licença de dia inteiro do calendário, o **dia
  bloqueado no DSA** — o dia parado (`dias_parados`) e o TR bloqueante (`atividades_nao_letivas.bloqueia_aula`) **de dia
  inteiro**, da turma ou de todas (`datasBloqueadasDaTurma`).
- **FR-004** (item 3, `RN-SALDO-01`): `saldo = CH disponível − CH restante`; `semanaDeAula = TA/dia do regime em vigor ×
  5`; situação **adiantada** (saldo > semana), **dentro do previsto** (0 ≤ saldo ≤ semana), **atrasada** (saldo < 0) — só
  na turma **ativa** com capacidade calculada. `emAtraso` = *atrasada*. Mostrada na ficha (cartão *Saldo de CH* tingido e a
  tarja ao lado de *Andamento*), em `/turmas` (coluna *Saldo*) e no Início (cartão da turma); os Avisos seguem pelo
  `emAtraso`.
- **FR-005** (item 4): a ficha ganha as abas **APOINST** e **Palestras** (`?aba=apoinst|palestras`), com *«Em breve»*.
- **FR-006** (item 5): Atividades tem as abas **Atividades · Calendário · Palestras** para todos (o Calendário continua
  só para quem tem permissão), e *Palestras* diz *«Em breve»* (`?aba=palestras`).
- **FR-007** (item 6): a lista de Atividades, a contagem (*«N atividades em ANO»*), o universo do estado vazio e o filtro
  *Categoria* deixam de fora o **Estudo Individual**. Nada é apagado; o DSA e a CH não mudam.

## 4. Critérios de sucesso

- **SC-001**: Vitest `RN-SALDO-01` com os três níveis, o limite inclusivo, a turma planejada e o dia bloqueado — visto
  reprovar antes da implementação (7 casos).
- **SC-002**: a medição na cópia do remoto lista turma a turma o saldo e o veredito antes × depois (§6).
- **SC-003**: e2e por clique — os cartões e a conta *saldo = disponível − restante* na ficha, as abas novas da turma e de
  Atividades, e o EI fora da lista com a linha no banco.
- **SC-004**: **nenhuma migration** e nenhuma view mudada (os insumos já existiam).

## 5. Clarifications

### Session 2026-11-01 — dúvidas decididas pela recomendação (adotada por padrão — Bernardo confere no fim)

- **D-1** «Dias travados no DSA» → **o dia bloqueado da `RN-EVT-04`**: dia parado e TR bloqueante de dia inteiro, da turma
  ou de todas. *Alternativa:* também os dias sem aula das semanas já **publicadas** (a semana «trava» ao publicar, RP-1);
  não adotada porque publicar não impede lançar (há *Fazer alteração*), e a semana futura publicada é rara.
- **D-2** **«Uma semana de aula» usa o TA/dia do primeiro dia útil** da janela (o regime em vigor, o mesmo que divide o
  saldo em dias — D-13 da spec 029). *Alternativa:* a média dos TA/dia da janela.
- **D-3** **A parada de parte do dia não tira o dia** — ela tira só tempos. *Alternativa:* descontar os tempos dela da CH
  disponível (medido: os 6 dias parados futuros do remoto são todos de parte do dia).
- **D-4** **Só a turma ATIVA tem situação**; a planejada continua mostrando o saldo, sem etiqueta (o atraso é de turma em
  andamento, `RF-INI-01`). *Alternativa:* dar situação também à planejada.
- **D-5** Tons: **adiantada → `adiantado`**, **dentro do previsto → `executado`**, **atrasada → `atrasado`** — os tokens
  que já existem. *Alternativa:* `conformidade` para *dentro*.
- **D-6** O cartão do saldo passa a se chamar **«Saldo de CH»** (o nome do pedido); era *«Saldo de capacidade (TA)»*. A
  guarda do vocabulário (`SC-007` da spec 012) passou a cobrar o nome novo.
- **D-7** A **situação da turma sai da lista de dados** da ficha e fica só no cartão (*«vira um cartão»*). *Alternativa:*
  manter as duas.
- **D-8** As abas de Atividades passam a aparecer **para todos** (antes só quem tinha calendário as via): *Palestras* é de
  todos; o *Calendário* continua só para quem tem a permissão.
- **D-9** O EI some também do **universo** que separa *«nenhuma em ANO»* de *«ainda não há»* — senão uma turma só com EI
  diria *«nenhuma atividade em ANO»* com atividades no banco.
- **D-10** Um componente só para o *«Em breve»* (`components/ciaara/em-breve.tsx`), usado também pelo DSA (Bloco 16).

## 6. A medição (SC-002) — cópia do remoto `remoto-20261101-120620.sql`, hoje = 01/11/2026

Instrumento: `medicao/medir-saldo.mts`, que chama `paraLinhasDeTurma` e `comAndamento` — as funções da tela — sobre a
cópia restaurada no banco local; ANTES = sem os dias bloqueados (a conta da `main`); DEPOIS = com eles. Saída inteira em
`medicao/saldo-antes-depois.tsv`. **Dias bloqueados lidos a partir de hoje: 6, todos de parte do dia** — por isso nenhum
saldo muda hoje; o que muda é o veredito.

| Turma | Situação | Saldo antes (TA) | Veredito antes | Saldo depois (TA) | Situação depois |
|---|---|---:|---|---:|---|
| CAHO 2027 | planejada | 692 | — | 692 | — |
| CAHO 2026 | ativa | 62 | — | 62 | **Adiantada** |
| C-Ap-FR 2026 | ativa | −9 | em atraso | −9 | Atrasada |
| C-Ap-HN 2026 | ativa | 37 | — | 37 | **Dentro do previsto** |
| C-Espc-FR 2026 | ativa | −80 | em atraso | −80 | Atrasada |
| C-Espc-HN 2026 | ativa | 25 | — | 25 | **Dentro do previsto** |
| C-ApA-AuxNav-PR-SP T2 2026 | ativa | −228 | em atraso | −228 | Atrasada |

As demais 23 turmas não têm saldo (concluídas, canceladas, EAD ou sem carga) — antes e depois.
