# Roteiro de conferência — PR 3 da spec 012: o andamento da turma

> **Para Bernardo.** Oito passos, **todos no preview** — o endereço está no fim, medido.
>
> ⚠️ **ESTA FRASE SUBSTITUI UMA ERRADA QUE EU ESCREVI AQUI, e o erro é exatamente o que a regra 9.3
> existe para impedir.** A primeira redação dizia *"os dois últimos no banco local, porque é lá que
> estão os 1.566 lançamentos — o preview tem cadastro, e cadastro sem lançamento não tem andamento a
> mostrar"*. **Plausível e falso:** medido no remoto só por leitura, em 04/10/2026, ele tem
> **1.566** lançamentos, **27** turmas com data de término e **7** turmas ativas — e a turma da conta
> à mão tem **os mesmos números nos dois bancos**. Escrevi a frase antes de medir.
>
> ⚠️ **A conta à mão está na §*A conta à mão*, com a data em que foi feita**: o *"hoje"* muda o
> resultado, e refazê-la noutro dia dá outro saldo — isso é a regra funcionando, não defeito.

⚠️ **AS TURMAS ESTÃO NOMEADAS, E A ESCOLHA DE CADA UMA FOI MEDIDA NO REMOTO** (só leitura,
04 e 05/10/2026). Não é para procurar: é para abrir.

| # | O que fazer | O que tem de acontecer |
|---|---|---|
| 1 | *Turmas* → abrir **`C-Ap-FR 2026`** pela linha da lista | Depois do formulário, a seção **Andamento**: CH prevista **1165 TA**, executada **518 TA**, Progresso **44 %** com a barra, **Saldo de capacidade (TA)** negativo em TA e em dias, e a capacidade diária **8 TA/dia** com os dias úteis até 15/12/2026 |
| 2 | Olhar o **Progresso** dela | O número aparece **escrito** ao lado da barra — não só na cor, e não só na largura. ⚠️ **O caso acima de 100 % não existe no dado de hoje**: medido, as **6** turmas com lançamento vão de **44 %** a **86 %**, nenhuma em excesso. Quem cobre esse caso é a suíte (`andamento.spec.ts`, turma de 12 TA sobre 10) |
| 3 | Abrir **`EST-QF-NAVFLU-EAD 2026`** (planejada, **sem data de término**) | No lugar do saldo: *"Sem data de término — informe-a para calcular o saldo."* A capacidade diária **não** aparece, e o formulário continua editável — é por ele que a data entra |
| 4 | Abrir **`C-Exp-Obs-ME 2026`** (ativa, 115 TA previstos, **nenhum lançamento**) | *"Ainda sem lançamentos."* no lugar do progresso — **não** `0 %`. A CH prevista e o saldo continuam à vista |
| 5 | *(opcional, e é uma edição que você desfaz)* numa turma de curso **presencial**, trocar a **modalidade** para **EAD** e salvar | No lugar do saldo: *"Sem dado de capacidade — o curso não tem regime vigente para a modalidade desta turma."* ⚠️ **Este estado não é alcançável com o dado de hoje** — medido: **todos** os cursos EAD do remoto têm `limite_diario_ead_horas` preenchido, e é por isso que ver este estado exige provocá-lo. Depois, **devolva a modalidade** |
| 6 | Ir ao **Início** e comparar | ⚠️ **Você vai ver a mudança mais visível desta fatia: a região de alertas vai de ZERO para SEIS turmas.** O painel antigo só acusava quem executou **mais** do que o previsto, e **nenhuma** das 28 turmas está nesse caso; a regra verdadeira acusa quem **não cabe no prazo**, e são estas seis — `C-Ap-FR 2026`, `C-Ap-HN 2026`, `C-Esp-ME 2026`, `C-Espc-FR 2026`, `C-Espc-HN 2026` e `CAHO 2026`. A tarja de cada uma tem de bater com o saldo negativo na ficha dela |
| 7 | Voltar a **`C-Ap-FR 2026`** e conferir número a número | Os nove da §*A conta à mão* batem — refazendo a contagem de dias úteis para o dia de hoje, que é o que muda |
| 8 | Na mesma turma, olhar o **rodapé** da seção *Disciplinas* | *"N TA lançados sem unidade de ensino não aparecem por disciplina."* — com N > 0. ⚠️ É **esperado**: as 1.566 linhas do ETL têm a UE nula, e a tela **diz** a diferença em vez de esconder. ⚠️ **Nenhum teste automatizado consegue cobrir este caso**: a catraca `reg_aula_ue_so_nula_no_historico` recusa lançamento novo sem UE, então ele só existe no dado migrado |

⚠️ **Se quiser conferir o mesmo no banco local**, ele dá os mesmos números — e nasce vazio depois de
qualquer `verificar:tudo`, que o reseta por desenho:

```
pnpm db:reset:limpo && python -m scripts.etl.executar --primeira-carga
```

## A conta à mão (`SC-005`) — `C-Ap-FR 2026`, medida em **04/10/2026**

⚠️ **OS INSUMOS SÃO OS MESMOS NO LOCAL E NO REMOTO, e isso foi medido nos dois** (04/10/2026): o
local por `docker exec … psql` e o remoto por `supabase db query --linked`, **só leitura**, nenhuma
escrita. Os dois feriados do intervalo também são os mesmos nos dois bancos. Então a tabela abaixo
serve para conferir **no preview**.

**Os insumos:**

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

## As seis turmas que o Início passa a acusar — calculadas em **05/10/2026**

Os mesmos insumos do quadro acima, para cada turma com lançamento no remoto, passados pelo módulo:

| Turma | Prevista | Executada | % | Término | TA/dia | Dias úteis | Capacidade | Saldo | Em dias | Veredito ANTIGO | Veredito NOVO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `C-Ap-FR 2026` | 1165 | 518 | 44 % | 15/12 | 8 | 50 | 400 | **−247** | −31 | não | **em atraso** |
| `C-Ap-HN 2026` | 1257 | 562 | 45 % | 15/12 | 8 | 50 | 400 | **−295** | −37 | não | **em atraso** |
| `C-Esp-ME 2026` | 545 | 470 | 86 % | 28/08 *(passado)* | 7 | 0 | 0 | **−75** | −11 | não | **em atraso** |
| `C-Espc-FR 2026` | 1270 | 891 | 70 % | 12/11 | 7 | 27 | 189 | **−190** | −28 | não | **em atraso** |
| `C-Espc-HN 2026` | 1216 | 820 | 67 % | 12/11 | 7 | 27 | 189 | **−207** | −30 | não | **em atraso** |
| `CAHO 2026` | 1668 | 993 | 60 % | 16/12 | 8 | 51 | 408 | **−267** | −34 | não | **em atraso** |

⚠️ **ZERO viram SEIS, e isso é o conserto, não um alarme novo.** O painel antigo exigia
`previstos − executados < 0` para acusar — ou seja, **executar mais do que o previsto** —, e nenhuma
turma real está nesse caso. As seis acima são turmas em andamento cuja capacidade restante **não
cobre** a carga que falta, que é a definição do `RF-INI-01`. ⚠️ **Se você discordar do veredito de
alguma, o lugar de olhar é o insumo**, e ele está na linha dela: as mais prováveis são a data de
término (`C-Esp-ME 2026` já passou do término e segue `ativa`) e o TA/dia do regime vigente.

⚠️ **A `C-Esp-ME 2026` é o caso que mais vale olhar:** término em **28/08**, ainda `ativa`, 86 %
executados. Capacidade **zero** porque não há mais dia útil até o término, e restante **75 TA** —
alerta legítimo, e o que ele diz é *"ou a turma encerra, ou a data muda"*.

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

Diga **o número do passo** e o que você viu. Os cinco estados dos passos 1 a 5 têm caso em
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

## O endereço, e o commit servido

| O quê | Valor |
|---|---|
| **Endereço para conferir** (alias do ramo, sempre o commit mais novo) | `https://sistema-de-gestao-academica-v2-1-git-feat-epic-8c2007-ciaara-11.vercel.app` |
| Implantação exata por trás dele | `https://sistema-de-gestao-academica-v2-1-jbjxdoe5g-ciaara-11.vercel.app` |
| **Commit servido** | `2c9adaa` — o registro do fechamento; o código do PR 3 é o `18b42cd`, e entre os dois não há uma linha de `app/`, `lib/`, `components/` ou `tests/` |
| CI | run **`37255981963`** (`18b42cd`) e run **`37256767738`** (`2c9adaa`), **verdes nos três blocos** nas duas |
| Ramo | `feat/EPICO-5.5-navegacao-e-turmas` — **sem PR e sem merge**, como combinado |

⚠️ **O endereço responde `302` para `vercel.com/sso-api`** — é a proteção de implantação da Vercel, e
é o comportamento esperado. Abra estando logado na Vercel; não é erro.

⚠️ **O preview fala com o banco REMOTO**, que é a fonte da verdade dos cadastros. Conferir aqui não
escreve em lançamento nenhum: esta fatia só **lê** execução.
