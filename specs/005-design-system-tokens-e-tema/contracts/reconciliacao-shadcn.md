# Contrato — de-para entre as variáveis do shadcn e os tokens CIAARA

**Fase 1** · 09/09/2026 · fonte: [research.md §R-4](../research.md) · `FR-017`, `FR-018`, `SC-010`

## O problema, dito antes da tabela

Os componentes copiados trazem **o próprio vocabulário de papéis**. O CIAARA tem o seu. Deixá-los
convivendo sem casamento explícito cria **dois pontos únicos de verdade** — que é a negação do
`RF-DS-01` **com a agravante de parecer cumprido**: todo componente fica bonito, nada acusa erro, e
a divergência só aparece quando alguém muda um token e metade da tela não acompanha.

Este contrato existe para que o casamento seja **declarado**, e não descoberto.

## A regra

Toda variável de cor que um componente copiado usa MUST apontar para um token CIAARA. **Nenhuma
mantém valor próprio.** O componente continua sendo o do shadcn; o que muda é de onde ele tira a
cor.

## O de-para

| Variável do shadcn | Papel que ela exerce | Token CIAARA |
|---|---|---|
| `background` | fundo da página | `--fundo` |
| `foreground` | texto principal | `--texto` |
| `card` / `popover` | superfície elevada | `--superficie` |
| `card-foreground` / `popover-foreground` | texto sobre superfície | `--texto` |
| `muted` | área secundária, zebra, desabilitado | `--superficie-2` |
| `muted-foreground` | rótulo secundário, legenda | `--texto-suave` |
| `primary` | ação principal, marca | `--marca` |
| `primary-foreground` | texto sobre a marca | `--marca-contraste` |
| `secondary` | ação secundária | `--superficie-2` |
| `accent` | realce de item ativo | `--marca-suave` |
| `destructive` | ação destrutiva | `--conflito-tinta` |
| `border` | limite de componente | `--borda` |
| `input` | limite de campo | `--borda-forte` |
| `ring` | anel de foco | `--foco` |

## Duas armadilhas

⚠️ **`destructive` não é `atrasado`.** No vocabulário do domínio, vermelho é **conflito**, que exige
ação. Amarelo é **atrasado**, que é aviso. Mapear `destructive` para o tom errado faria um botão de
desativar parecer um aviso de atraso — e o pior é que ninguém notaria, porque as duas cores existem
e as duas são "quentes".

⚠️ **O de-para vale nos dois temas, e é por isso que ele aponta para papel, não para cor.** Se uma
linha desta tabela apontasse para a rampa institucional em vez de para o papel, o componente
congelaria no tema claro — o mesmo defeito de sintaxe que o modelo descreve.

## Como isto é conferido

O `SC-010` exige **zero** variáveis sem par. A verificação percorre esta tabela e o arquivo de
estilo, e falha nomeando a variável órfã. Uma variável nova, vinda com um componente novo, **reprova
até ser casada aqui** — que é exatamente o comportamento desejado quando a fatia (b) copiar os
catorze primitivos restantes.
