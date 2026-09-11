# Contrato — navegação por teclado

**Fase 1** · 10/09/2026 · fonte: documento 23 §8.3 · `FR-023`, `FR-024`, `SC-006` · fecha o `CHK006`

## Por que isto é contrato e não detalhe

Sem *roving tabindex*, uma tabela de 300 linhas por 8 colunas exige **2.400 pressionamentos de
`Tab`** para ser atravessada. É por isso que o documento 23 chama a técnica de obrigatória e não de
refinamento — e é por isso que ela está aqui, num contrato, em vez de ficar para quem implementar
decidir.

⚠️ **O `CHK006` está aberto desde a fatia (a) com esta frase exata**: *"o documento 23 traz a tabela
de teclas completa; nenhuma spec a referencia"*. Fecha aqui.

## A técnica

**Um** ponto de entrada por grade. O contêiner tem `tabindex` zero; todas as células têm `tabindex`
menos um, exceto a que está sob o foco. Mover o foco troca os dois valores.

Consequências, e são elas que o teste mede:

1. **`Tab` entra na grade em um passo e sai dela em um passo.** A grade inteira é uma parada na
   ordem de tabulação, não uma por célula.
2. **Sair e voltar retorna à mesma célula.** A posição é lembrada enquanto a grade existir.
3. **O foco é sempre visível** (`FR-024`). O anel da fatia (a) vale aqui, e a célula focada não pode
   depender só de fundo — fundo sozinho não sobrevive ao tema nem à impressão.

## A tabela de teclas — literal, do documento 23 §8.3

| Tecla | Efeito |
|---|---|
| `Tab` | entra na grade e sai dela em **um** passo |
| Setas | move célula a célula, nas duas dimensões |
| `Home` / `End` | primeira / última coluna da linha |
| `PageUp` / `PageDown` | salta **20** linhas — uma "tela" de tabela densa |
| `Enter` / `Espaço` | ativa a linha ou o bloco sob o foco |
| `Esc` | fecha diálogo / cancela seleção múltipla |

⚠️ **As 20 linhas do salto não são arbitrárias**: são a altura útil de uma tabela densa. O número
vale para as três densidades, porque o que ele mede é o passo de leitura, não a altura em pixels.

## Onde o mesmo comportamento aparece duas vezes

`TabelaDensa` e `SeletorInstrutor` precisam da mesma navegação — o seletor com busca é uma lista de
uma coluna. **A implementação é uma só**, em `components/ciaara/lista-navegavel.tsx`, e é a única
entrada do *Complexity Tracking* do plano.

| Onde | Dimensões | Diferença |
|---|---|---|
| `TabelaDensa` | duas — linhas e colunas | setas horizontais movem coluna |
| `SeletorInstrutor` | uma — só linhas | setas horizontais não fazem nada; digitar filtra |

⚠️ **Filtrar reposiciona o foco na primeira opção restante.** Uma lista que filtra e deixa o foco
numa linha que sumiu leva quem usa teclado a lugar nenhum, em silêncio.

## Casos de fronteira que o teste precisa cobrir

| Caso | Comportamento |
|---|---|
| Tabela **sem colunas** ou com **uma** coluna | não quebra; setas horizontais não fazem nada |
| Tabela **sem linhas** | o contêiner continua alcançável por `Tab`, e o estado vazio é lido |
| `PageDown` com menos de 20 linhas restantes | vai para a última, não para fora |
| Foco na última célula, seta para baixo | **fica**; a grade não rola circularmente |
| Filtro que não retorna ninguém | foco volta ao campo de busca, com a mensagem lida |

⚠️ **A grade não rola circularmente, e é decisão.** Voltar ao topo ao passar do fim faz quem não vê
a tela perder a noção de onde está — o fim da lista precisa ser sentido como fim.

## Como se prova

Playwright, teclado de verdade, na vitrine. **Não se prova por asserção sobre atributo**: um
`tabindex` correto com um tratador de tecla que não dispara passa na leitura de atributo e falha na
mão de quem usa.

⚠️ **É a lição do V-4 do Épico 3** — teste que lê a tela antes de a conferência acontecer prova o
que quer, não o que é. Cada movimento é pressionado e o elemento focado é lido depois.
