# Contrato de parâmetros — `/turmas/[turma]/dsa` e `/print/dsa`

> Entra em `lib/navegacao/contrato.ts` (não em `lib/estado/`, que não existe — `V-3`, backlog). O
> documento 25 §1.3 declara `semana` e `ano` como **inteiros** com padrão corrente; `sabado` entra por
> decisão `Q-4`. **Identidade no caminho, recorte na query** (doc 25, regra 3).

## `/turmas/[turma]/dsa` — origem `RF-DSA-01`, `RF-DSA-02`

| Parâmetro | Tipo | Padrão | Histórico | Avisa o servidor | Regra |
|---|---|---|---|---|---|
| `[turma]` (caminho) | código da turma, **codificado** por `endereco-de-turma.ts` | — | — | — | contém espaços; `%20`, nunca `+` |
| `semana` | inteiro, **semana ISO** 1..53 | a semana ISO de `hojeNaCiaara()` | **empilha** — voltar retorna à semana anterior (`RF-NAV-04`) | sim | fora da faixa → padrão, com aviso (`RN-DEG-01`) |
| `ano` | inteiro, 4 dígitos | o ano ISO corrente | **empilha** | sim | anterior/próxima atravessam a virada do ano (semana 1 ↔ 52/53) |
| `sabado` | `sim` / `nao` | `nao` | **substitui** | sim | a coluna também aparece **sem** o parâmetro quando há lançamento no sábado |

- Valor no padrão **não aparece** na URL (`nuqs` o remove).
- **O que NÃO vai na URL**: a célula selecionada, o formulário aberto, o bloco em arraste — estado efêmero, Zustand ou `useState` na folha.

## `/print/dsa` — origem `RF-PDF-01`

| Parâmetro | Tipo | Regra |
|---|---|---|
| `turma` | código da turma (query, codificado) | **herdado sem tradução** da tela de origem (doc 25 §1.3 item 2) |
| `semana` | inteiro | idem |
| `ano` | inteiro | idem |
| `sabado` | `sim`/`nao` | idem — o papel imprime o que a tela mostra |

- Rota **fora** de `(app)`: sem casca. Sessão exigida pelo `proxy.ts` (linha 31), sem código novo.
- Ausência de `turma` → `not-found`, nunca grade vazia.

## Deep-links que o contrato garante

- `/turmas/C-Ap-HN%202026/dsa?semana=34&ano=2026` abre **exatamente** aquela semana.
- `/turmas/C-Ap-HN%202026/dsa` abre a semana corrente — favoritável.
- Duas abas com semanas diferentes **não** interferem (nada em cookie ou sessão).

## Caminhos clicáveis até a tela (regra: sem caminho, tela não entregue)

| De onde | O quê | Permissão do botão |
|---|---|---|
| ficha `/turmas/[turma]` | botão **"Abrir o DSA"** no cabeçalho | a da página de destino: `registros_aula.ler` + alcance |
| lista `/turmas` | ação de linha **"DSA"** | idem |
| `/inicio` | o bloco da turma ganha o link **"DSA da semana"** | idem |
| a própria grade | botão **"Imprimir"** → `/print/dsa?…` com os mesmos parâmetros | idem |

`toda-tela-tem-caminho.test.ts` cobra o `href` das duas rotas em outro arquivo.
