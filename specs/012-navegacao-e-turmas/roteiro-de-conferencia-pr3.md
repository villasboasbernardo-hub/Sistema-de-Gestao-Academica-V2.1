# Roteiro de conferência — PR 3 da spec 012: o andamento da turma

> **Para Bernardo.** Oito passos. Os seis primeiros no **preview**; os dois últimos no **banco
> local**, porque é lá que estão os 1.566 lançamentos do ETL — o preview tem cadastro, e cadastro
> sem lançamento não tem andamento a mostrar.
>
> ⚠️ **O endereço e o commit estão no fim, medidos.** E a conta à mão de uma turma real está na
> §*A conta à mão*, com a data em que foi feita: o *"hoje"* muda o resultado, e refazê-la noutro dia
> dá outro saldo — isso é a regra funcionando, não defeito.

| # | O que fazer | O que tem de acontecer |
|---|---|---|
| 1 | Abrir uma turma pela lista (*Turmas* → clicar na linha) | Depois do formulário, a seção **Andamento**: CH prevista, CH executada, Progresso com a barra, **Saldo de capacidade (TA)** em TA e em dias, e a capacidade diária com os dias úteis até o término |
| 2 | Olhar o **Progresso** | O número aparece **escrito** ao lado da barra, não só na cor. Numa turma que executou mais do que o previsto, a faixa para no fim da caixa e **o número passa de 100 %** |
| 3 | Abrir uma turma **sem data de término** | No lugar do saldo: *"Sem data de término — informe-a para calcular o saldo."* A capacidade diária **não** aparece, e o formulário continua editável — é por ele que a data entra |
| 4 | Abrir uma turma **EAD de um curso sem limite diário EAD** no regime | No lugar do saldo: *"Sem dado de capacidade — o curso não tem regime vigente para a modalidade desta turma."* **Nenhum número inventado**, e nenhum alerta de atraso |
| 5 | Abrir uma turma **sem nenhum lançamento** | *"Ainda sem lançamentos."* no lugar do progresso — **não** `0 %`. A CH prevista e o saldo continuam à vista |
| 6 | Ir ao **Início** e comparar | As turmas com a tarja *"em atraso"* são **as mesmas** que a ficha marca. ⚠️ **E o veredito mudou de lado**: turma que executou **mais** do que o previsto **deixou** de aparecer; turma com prazo curto demais **passou** a aparecer |
| 7 | No banco **local** carregado, abrir `C-Ap-FR 2026` | Os nove números da §*A conta à mão* batem, um por um (refazendo a conta para o dia de hoje) |
| 8 | Na mesma turma, olhar o **rodapé** da seção *Disciplinas* | *"N TA lançados sem unidade de ensino não aparecem por disciplina."* — com N > 0. ⚠️ É **esperado**: as 1.566 linhas do ETL têm a UE nula, e a tela **diz** a diferença em vez de esconder |

**Para o passo 7 e 8**, se o banco local estiver vazio de negócio:

```
pnpm db:reset:limpo && python -m scripts.etl.executar --primeira-carga
```

⚠️ **Rode isto depois de qualquer `verificar:tudo`**, que reseta o banco local por desenho.

## A conta à mão (`SC-005`) — `C-Ap-FR 2026`, medida em **04/10/2026**

**Os insumos**, lidos do banco local só por leitura (`docker exec … psql`, dois `select`):

| Insumo | Valor | De onde |
|---|---|---|
| `chr_curricular` | **1165** TA | `vw_carga_horaria_turma` |
| `chd_executada` | **518** TA | `vw_carga_horaria_turma` |
| `modalidade` / `status` | `presencial` / `ativa` | `turmas` |
| `data_termino` | **2026-12-15** (terça) | `turmas` |
| `regime_padrao_tempos` | **8** TA/dia | `vw_cursos_regime_vigente` |
| feriados de **dia inteiro** no intervalo | **2026-10-28** (quarta) e **2026-11-12** (quinta) | `feriados`, `impacto = 'dia_inteiro'` e `status = 'ativo'` |

**A conta**, nove grandezas, na ordem da tabela de `contracts/andamento.md` §1.1:

| # | Grandeza | Conta | Resultado |
|---|---|---|---|
| 1 | `restante` | `max(1165 − 518, 0)` | **647** TA |
| 2 | `percentual` | `round(100 × 518 ÷ 1165)` = `round(44,46…)` | **44 %** |
| 3 | `capacidadeDiaria` | presencial → `regime_padrao_tempos` | **8** TA/dia |
| 4 | dias de semana em `[04/10, 15/12]` | de 05/10 (seg) a 13/12 (dom) são **10 semanas** = 50; sobram 14/12 (seg) e 15/12 (ter) = 2 | **52** |
| 5 | `diasUteis` | `52 − 2` feriados de dia inteiro, os dois em dia de semana | **50** |
| 6 | `capacidade` | `50 × 8` | **400** TA |
| 7 | `saldo` | `400 − 647` | **−247** TA |
| 8 | `saldoEmDias` | `floor(−247 ÷ 8)` = `floor(−30,875)` | **−31** dias |
| 9 | `emAtraso` | `ativa` **e** saldo < 0 | **sim** |

⚠️ **A conta foi feita no papel ANTES de ser comparada com o código** (regra 9.3), e a comparação
rodou contra `andamentoDaTurma` com exatamente esses insumos: **os nove bateram**, incluindo os 52
dias de semana brutos. O arquivo de verificação era temporário e foi apagado na mesma rodada — o que
fica é esta tabela, que você pode reconferir com uma calculadora.

⚠️ **O 04/10 é um domingo, e as duas pontas são inclusivas** (`while (d <= ate)` do `diasUteis_` da
v1.0): o domingo não conta porque não é dia de semana, e 15/12 **conta** porque o término entra.

⚠️ **Dois achados de origem apareceram nesta medição, e nenhum é desta fatia.** *"Nossa Senhora
Aparecida"* está em **12/11/2026** na planilha (o feriado nacional é 12/10), e *"Dia do Servidor
Público"* em **28/10** com impacto **dia inteiro**, sendo ponto facultativo. O ETL **transporta, não
corrige** (`FR-003`), e os dois descontam capacidade hoje. Corrigir é na planilha, por você — o
critério da Q1.b vale: *corrige quem consegue nomear a origem da resposta*.

## O que mudou de propósito, e você vai notar

- **O indicador do Início estava invertido, e isto é o conserto.** Ele comparava previsto com
  executado e chamava o resultado negativo de atraso — ou seja, **disparava no excesso** e **nunca**
  no atraso de verdade. Agora o veredito vem de `lib/dominio/andamento-da-turma.ts`, que lê data de
  término, feriado de dia inteiro e TA/dia da modalidade da turma, como a `RF-INI-01` manda.
- **Nada mais do painel do Início mudou** (`FR-031.2`): mesmos títulos, mesmas colunas, mesmo filtro.
  Só o veredito e o percentual trocaram de fonte.
- **A ficha ganhou duas colunas por disciplina** — CH executada e % — e um rodapé que soma **a grade
  desta turma**. ⚠️ A soma do rodapé pode ser **menor** que a CH prevista do Andamento, e não é
  defeito: `chr_curricular` soma o currículo **do curso**, e a grade da turma pode não ter todas as
  disciplinas. O rótulo diz *"Σ nesta grade"* por isso.
- **A palavra informal que usamos na conversa não entra em lugar nenhum.** O indicador chama-se
  **"Saldo de capacidade (TA)"** (`D-NAV-4`), e há varredura no repositório cobrando isso.

## O que NÃO mudou

Nenhuma migration, nada no banco remoto, nenhum pacote novo. Lançamento, avaliação e atividade não
foram tocados — a execução é **lida**, nunca escrita (`RN-CRONOS-01`). O formulário da turma edita o
mesmo que editava antes.

## Se algum passo falhar

Diga **o número do passo** e o que você viu. Os cinco estados do passo 1 ao 5 têm caso em
`tests/e2e/andamento.spec.ts` (9 casos), o passo 6 em `tests/e2e/inicio.spec.ts` e a aritmética em
`tests/unidade/andamento-da-turma.test.ts` (20 casos) — uma falha na tela que a suíte não pega é
informação sobre a suíte, não só sobre o produto.

## O caso que discrimina, medido na ordem certa (DoD 8)

Antes de tocar em `panorama.ts`, a semente nova rodou contra o painel **antigo**, e o caso reprovou
**nos dois sentidos** na mesma execução — as três asserções são `expect.soft` justamente para isso:

```
Error: a turma que NÃO cabe no prazo não foi sinalizada: o painel não está lendo capacidade
  expect(locator).toBeVisible() failed
  Locator: locator('[data-turma="CUR-E2E0-CAP 2026"]').getByText('em atraso')
  Error: element(s) not found

Error: a turma que executou MAIS do que o previsto foi sinalizada: é o indicador invertido de volta
  expect(locator).toHaveCount(expected) failed
  Locator: locator('[data-turma="CUR-E2E0-REG 2026"]').getByText('em atraso')
  Expected: 0   Received: 1
```

Depois do conserto, 12 de 12 em `inicio.spec.ts`. **Um teste que desse o mesmo veredito antes e
depois não testaria a mudança.**

## As duas guardas que nasceram com o PR, provadas por defeito deliberado

| Guarda | O defeito plantado | O que ela disse |
|---|---|---|
| `tests/unidade/andamento-unico.test.ts` (`SC-006`) | a fórmula antiga de volta em `panorama.ts` | *"estes arquivos decidem «em atraso» por conta própria… `app/(app)/inicio/panorama.ts` (`c.status_turma === "ativa" && andamento.prevista - andamento.executada < 0`)"* |
| `tests/unidade/vocabulario-proibido.test.ts` (`SC-007`) | o rótulo do saldo trocado pela palavra informal | reprovou **duas vezes**: a varredura achou o termo **e** o controle positivo acusou o desaparecimento de *"Saldo de capacidade"* |

⚠️ **A primeira redação da `SC-006` reprovava o CONSERTO**, e isso virou parte dela: ela acusava
`emAtraso: andamento.emAtraso` (repasse) e a contagem `panorama.filter((t) => t.emAtraso).length`.
Guarda que reprova o conserto ensina a desligar a guarda — o critério passou a ser *"tem comparação
ou lógica?"*, que é o que de fato distingue decidir de repassar.

## Medições desta entrega

| O quê | Medido | Artefato |
|---|---|---|
| `pnpm verificar` | **0** | tipos, lint, formatação, unidade e build |
| Unidade | **1.197** casos em **90** arquivos | `pnpm test:unidade` |
| pgTAP | **434** asserções em **35** arquivos, `PASS` | `pnpm test:invariantes` |
| RLS e ambiente | **222** em **8** arquivos | `pnpm test:rls` |
| Ponta a ponta | **332** casos — **330** passados, **2** pulados | `pnpm test:e2e -- --workers=2` |
| Contrato de tipos | sem divergência | `pnpm db:tipos:conferir` |
| Migrations | **nenhuma** nesta fatia | — |

⚠️ **A ponta a ponta rodou com `--workers=2`**: o paralelo cheio é morto por memória nesta máquina. É
caveat de ambiente, não de resultado — **quem dá o veredito de paridade do `SC-005` é o CI**.

<!-- O endereço do preview e o commit servido entram aqui depois do CI verde. -->
