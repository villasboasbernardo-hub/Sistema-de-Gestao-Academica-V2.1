# Modelo — Fase 1 · Épico 4, fatia (a)

**Data**: 09/09/2026 · **Plano**: [plan.md](./plan.md)

## Não há entidade de dado, e isso não é uma seção vazia

Esta fatia não cria tabela, não toca migration e não alcança o banco. O que ela **tem** de modelável
é o **vocabulário visual**, e ele tem estrutura, regra de nomeação e invariante — por isso vale
descrevê-lo aqui em vez de deixá-lo implícito no CSS.

## As duas famílias, e por que a distinção decide o arquivo

A separação abaixo **não é organização**: é a causa mais comum de tema quebrado, e o erro é de
sintaxe, não de gosto.

| Família | O que é | Muda com o tema? | Exemplo |
|---|---|---|---|
| **Estático** | a marca e as escalas | **não** | a rampa institucional, os tamanhos de texto, os espaçamentos, os raios, as sombras |
| **Papel** | a função que a cor exerce | **sim** | fundo, superfície, texto, borda, e os nove tons de status |

⚠️ **Papel declarado como estático congela no tema claro**, e o modo noturno sai com campos claros
demais. É literalmente a reclamação que o `RF-DS-03` registra sobre a v1.0 — e ela voltaria por
descuido de sintaxe, não por decisão de ninguém.

## Regra de nomeação: o nome é do domínio, não da cor

Um token de status chama-se pelo que **significa**, nunca pela cor nem por rótulo genérico.

| Nome | Significa | O que era na v2.0 |
|---|---|---|
| `planejado` | previsto, ainda não ocorrido | — |
| `executado` | aula dada, atividade cumprida | `text-success`, `.aloc-verde` |
| `adiantado` | à frente do previsto | — |
| `atrasado` | atrás do previsto — aviso de Nível 2 | `text-warning` |
| `conflito` | choque que exige ação — Nível 3 | `text-danger` |
| `conformidade` | teto normativo tocado | `.mat-piscar` |
| `nao-letivo` | feriado, licença, período sem aula | `.cell-fe`, `.cell-lp` |
| `reserva` | horário reservado, não disponível | — |
| `inativo` | existe, não vale mais | — |

**Por que importa**: quem lê `executado` sabe o que significa. Quem lia `success` precisava saber o
que "success" queria dizer **naquele módulo** — e o significado mudava entre módulos.

Cada status é um **trio**: fundo, tinta e borda. Os três existem nos dois temas, e o par
*tinta sobre fundo* é auditado.

## Invariantes — o que um teste precisa poder afirmar

| # | Invariante | Quem verifica |
|---|---|---|
| **I-1** | Todo token de papel declarado no tema claro tem contraparte no noturno | teste de unidade sobre o contrato |
| **I-2** | Nenhum valor de cor existe fora do ponto único — nem escrito à mão, nem da paleta padrão | regra de lint |
| **I-3** | Todo par *tinta sobre fundo* atinge 4,5:1, e toda borda atinge 3:1, **nos dois temas** | teste de unidade que calcula |
| **I-4** | Toda variável de cor dos componentes copiados tem par declarado com um token CIAARA | contrato de reconciliação + teste |
| **I-5** | Todo token do contrato aparece na vitrine | teste sobre a rota de vitrine |

⚠️ **A I-5 existe para impedir token nascido morto** — declarado, nunca visto, nunca conferido por
ninguém.

⚠️ **No modo noturno o trio inverte**: o fundo é escuro e pouco saturado, a tinta é a cor clara.
Reaproveitar o pastel do tema claro é exatamente o defeito da v1.0, e produz par que **passa** na
aritmética de contraste e ainda assim fica ilegível na tela.

## Estado, e o único que existe aqui

| Estado | Onde vive | Ciclo |
|---|---|---|
| Escolha de tema | armazenamento local do navegador | ausente → segue o sistema operacional · escolhido → prevalece sobre o sistema |

**Não há transição inválida.** Há um caso de fronteira: armazenamento indisponível, em janela
anônima ou por política do navegador. A resposta é cair para a preferência do sistema operacional,
**sem aviso e sem quebrar** — não é falha do usuário e não há o que ele faça a respeito.
