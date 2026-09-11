# Contrato — gráficos

**Fase 1** · 10/09/2026 · fonte: documento 23 §7 · `FR-016` a `FR-018`, `SC-005`, `SC-008`

## Três componentes, e a prova de que bastam

A spec 006 nomeia **sete gráficos**. São sete perguntas sobre instrutores, não sete formas de
desenhar. Construir sete componentes seria construir a tela do Épico 5 aqui dentro — a mesma
decisão que esta fatia recusou para as três grades em 10/09/2026.

| # | Gráfico da spec 006 | Componente | Como |
|---|---|---|---|
| 1 | Habilitados × selecionados | `GraficoBarras` | duas séries, barras agrupadas |
| 2 | Classificação | `GraficoBarras` | uma série, barras ordenadas por valor |
| 3 | **Posto/graduação** | `GraficoBarras` | uma série, **ordem de antiguidade imposta por quem chama** |
| 4 | OM | `GraficoBarras` | uma série, ordenada por valor |
| 5 | Escolaridade | `GraficoBarras` | uma série, ordenada por valor |
| 6 | Regime de trabalho | `GraficoPizza` | três categorias, com percentual escrito |
| 7 | Capacitação didática | `GraficoBarras` | uma série; **um instrutor conta em duas barras** |

**Dois componentes cobrem os sete.** O terceiro, `GraficoLinha`, entra pelo inventário do documento
23 e **não tem consumidor nesta linhagem de specs** — está registrado assim em
[research.md §R-6](../research.md).

⚠️ **O de posto/graduação vem sempre em primeiro e sempre em ordem de antiguidade**, e a
**ordenação alfabética é proibida** nele — `FR-026.2` da spec 006, que diz estar escrito assim na
spec 014 da v2.0. O componente **recebe a ordem pronta** e não a reordena: quem impõe a antiguidade
é a função pura, como no seletor.

⚠️ **Um instrutor com duas qualificações conta nas duas barras**, e quem tem o campo vazio não conta
em nenhuma — `FR-026.4`. **A soma das barras não fecha com o total, e isso é correto.** O componente
não "conserta" a soma, porque consertá-la apagaria o fato.

## A codificação: o que distingue uma série quando a cor some

**Obrigatório em todo gráfico: marcador de forma por série e rótulo junto do traço.**

Está no tipo, não na convenção: `Serie` exige `forma` e `rotulo`, então uma série que dependa só de
cor **não compila**.

⚠️ **A medição que forçou isto**: no tema claro, as séries 1 e 8 ficam a `0,0003` de luminância uma
da outra; no noturno, as séries 4 e 7 a `0,0005`. **Impressas em cinza, cada par vira a mesma
tinta.** A paleta está mesclada e não foi tocada.

⚠️ **O documento 23 §7 se contradiz sobre isto.** O parágrafo afirma que as luminâncias são
distintas — e a medição diz que não. A tabela de regras do mesmo §7 manda *"cor nunca é a única
codificação: traço tracejado, marcador distinto ou rótulo direto"*. **Este contrato segue a tabela.**

## As regras do documento 23 §7 que viram propriedade

| Regra | Como aparece no componente |
|---|---|
| Uma cor por série, a mesma em todas as telas | `chave` da série escolhe o token, e a ordem é fixa |
| Rótulo direto em vez de legenda, até 4 séries | padrão é rótulo direto; legenda é reforço, nunca a única leitura |
| **Máximo de 6 séries** | acima disso o componente **recusa** e aponta a tabela densa |
| Pizza só com até 5 categorias, com percentual escrito | limite verificado; o percentual é texto, não só fatia |
| Eixo vertical começa em zero, em barras | fixo. **Não é propriedade** — eixo truncado exagera diferença, e isto é documento institucional |
| Sem 3D, gradiente, sombra ou animação de entrada | fixo. Não comunicam nada e atrapalham a impressão |
| Toda cor vem do token de série | a regra de lint reprova qualquer outra coisa |

⚠️ **"Máximo de 6 séries" é recusa, não aviso.** Um gráfico de oito séries já é uma tabela mal
desenhada; deixá-lo passar com aviso é deixá-lo passar.

⚠️ **Nenhuma animação de entrada, e não é só estética.** A preferência por menos movimento
(`FR-029`) valeria de qualquer forma, e a impressão captura o quadro errado quando há animação.

## A alternativa em tabela — registrada, não inventada

O documento 23 §7 exige que **todo gráfico tenha alternativa em tabela**, preservando o `DYN-03` da
v2.0: *"é o que torna o dado acessível a leitor de tela"*.

⚠️ **Nenhum requisito da spec 007 cobre isso** — é o achado P-5 do plano. O contrato **não inventa
requisito**: ele deixa o encaixe pronto, porque a série já chega com `rotulo` e `pontos` nomeados,
que é exatamente o que uma tabela precisa. Promover isso a `FR-` é decisão de quem analisa.

## Gráfico sem dados

Mostra estado vazio, **não** área em branco sem explicação — e distingue *"não há"* de *"você não
vê"*, como todo componente desta fatia.

## Sempre com marcador de cliente

Os três gráficos levam `"use client"` — é a única família da fatia em que o documento 23 §3.1
escreve **sempre**. A biblioteca de gráficos mede o contêiner, e medir contêiner é coisa de
navegador.
