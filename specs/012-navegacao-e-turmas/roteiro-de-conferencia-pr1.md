# Roteiro de conferência — PR 1 da spec 012: a lateral recolhível

> **Para Bernardo.** Oito passos, nesta ordem, **num computador** (os sete primeiros) e **num
> telefone ou na janela estreitada** (o oitavo). Nada aqui pede conta nova, nada escreve em dado de
> negócio: é tudo navegação.
>
> ⚠️ **O endereço e o commit estão no fim deste arquivo, medidos** — não copie de memória.

| # | O que fazer | O que tem de acontecer |
|---|---|---|
| 1 | Entrar no preview | A lateral está **recolhida**: só os ícones aparecem, e o conteúdo da página ocupa a largura que antes era do menu |
| 2 | Passar o mouse sobre a lateral, **sem clicar** | Ela **expande** e os rótulos aparecem — Início, Cursos, Disciplinas, Instrutores, Cronograma, Atividades, Administração |
| 3 | Afastar o mouse para o meio da tela | Ela **recolhe** sozinha, de volta aos ícones |
| 4 | Clicar no botão do **pé da lateral** (a seta de painel) | Ela **fica** expandida e não recolhe mais ao afastar o mouse |
| 5 | Ir para outra tela pelo menu (*Cursos*, por exemplo) e depois apertar **F5** | Continua expandida nas duas vezes — e **não** abre recolhida para então saltar; se você vir o salto, é defeito |
| 6 | Clicar no mesmo botão outra vez | Ela **recolhe** e continua recolhida na tela seguinte |
| 7 | Navegar só com o **teclado**: `Tab` do topo | A primeira parada é *"Pular para o conteúdo"*; quando o foco entra na lateral, ela **expande** e dá para ler onde você está |
| 8 | Abrir no **telefone**, ou estreitar a janela abaixo de ~1024 px | Aparece o botão **Menu** e a navegação chega por **gaveta**, como antes; passar o dedo **não** expande nada, e o botão de fixar **não existe** ali |

⚠️ **E em todos os oito:** *Cronograma* e *Atividades* continuam na lista marcadas **"em breve"** — elas
não têm tela ainda, e desaparecerem seria o defeito que a decisão MENU-2 existe para impedir.

## O que mudou de propósito, e você vai notar

- **A ordem do menu mudou** (`D-NAV-1`, sua decisão de 04/10): *Disciplinas* e *Instrutores* subiram,
  *Cronograma* e *Atividades* desceram. **Turmas ainda não está lá** — ela entra no PR 2, junto com a
  tela. O registro datado ficou em `specs/008-shell-e-estado-na-url/contracts/casca.md`, **ao lado**
  da validação de 11/09, que não foi apagada.
- **Cada entrada ganhou ícone.** Recolhida, é só ele que se vê; o nome continua no DOM para leitor de
  tela — ícone sozinho não é rótulo.
- **A preferência de fixar é por navegador**, em cookie. Fixar no seu computador não fixa no de mais
  ninguém, e não vai na URL: link compartilhado não impõe a largura do menu de quem abrir.

## O que NÃO mudou

Nada de turma, disciplina, curso, instrutor ou conta. Nenhuma migration, nenhum pacote novo, nada no
banco remoto. O cabeçalho, o avatar, o atalho de teclado e o foco ao trocar de rota seguem como eram.

## Se algum passo falhar

Diga **o número do passo** e o que você viu. Os oito têm caso automatizado em
`tests/e2e/lateral.spec.ts`, e dois deles foram **provados por defeito deliberado** — então uma falha
na tela que a suíte não pega é informação valiosa sobre a suíte, não só sobre o produto.

## Medições desta entrega

| Item | Valor |
|---|---|
| Ramo | `feat/EPICO-5.5-navegacao-e-turmas` |
| **Commit servido** | **`250b941`** |
| **Endereço do preview** | **`https://sistema-de-gestao-academica-v2-1-git-feat-epic-8c2007-ciaara-11.vercel.app`** |
| Endereço só deste commit (imutável) | `https://sistema-de-gestao-academica-v2-1-cfh988m1a-ciaara-11.vercel.app` |
| Deploy | `dpl_E683kfmw5R36PVaSyQUGJecT4f62` · `target: preview` · **Ready** |
| CI | run **`37232033675`** — **`qualidade`, `banco` e `build` verdes** sobre `250b941` |

**As quatro contagens, medidas localmente e confirmadas pelo CI:**

| Bloco | Local | CI |
|---|---|---|
| Unidade | **1.148** em 86 arquivos | **1.148** em 86 |
| pgTAP | **434** em 35 arquivos | **434** em 35 |
| RLS e ambiente | **222** em 8 arquivos | **222** em 8 |
| Ponta a ponta | **310** casos — 307 passados, 1 instável, 2 pulados | **307 passados + 1 instável + 2 pulados** |

✅ **É o `SC-005` fechando: mesmo veredito, contagem a contagem, sobre o mesmo commit.** A ponta a
ponta "divergir" de formato é esperado e já está registrado — o CI tem `retries: 2` e separa o
instável; o local tem 0 e o conta como reprovação. **São os mesmos 310 casos.**

⚠️ **DUAS RESSALVAS HONESTAS SOBRE A EXECUÇÃO LOCAL, e nenhuma delas é sobre o código:**

1. **A ponta a ponta local rodou com `--workers=2`, não com a paralelização do `verificar:tudo`.** As
   duas tentativas em paralelo cheio foram **mortas por falta de memória da máquina** — não por falha
   de teste. Quem dá o veredito de paridade é o CI, e ele deu.
2. **Numa das voltas, 231 casos reprovaram — e não era o código.** Havia um servidor meu remanescente
   na porta 3100, e `reuseExistingServer` **não distingue qual** servidor ocupa a porta: ele o reusou
   em vez de construir o novo, e aquele servidor era anterior ao `db:reset:limpo`, então **todo login
   caía de volta em `/login`**. É o **gotcha 7**, que este repositório registra como já tendo custado
   um dia — e a leitura fácil de novo era *"o meu ramo quebrou a vitrine"*. Prova de que era ambiente:
   derrubado o processo, o **mesmo** arquivo deu 12 de 12. **Lição operacional: depois de qualquer
   `test:e2e` interrompido, conferir a 3100 antes de concluir qualquer coisa sobre a suíte.**

⚠️ **O endereço do preview responde `302` para `vercel.com/sso-api`** — é a proteção de implantação da
Vercel, e é o comportamento esperado. Abra estando logado na Vercel; não é erro.

## Os dois defeitos deliberados, e o que eles revelaram

**Nenhum dos dois era sobre o produto: os dois acharam problema no TESTE** — que é o resultado mais
valioso que um defeito deliberado pode dar.

1. **Estado descoberto no navegador em vez de no servidor** (o flash do `FR-005`). O caso
   anti-flash **passou com o defeito no lugar**. Causa, medida: `addInitScript` roda **antes de o
   documento ter elemento raiz**, então `document.documentElement` é `null`, o `observe()` lança
   *"parameter 1 is not of type 'Node'"* e **o observador nunca existiu** — o caso dava verde sobre
   uma lista vazia. Consertado para `observe(document)`, e reforçado com uma asserção que lê o
   **HTML do servidor** direto. Com o defeito de volta, agora reprova com a frase certa.
2. **O servidor deixando de ler o cookie.** O caso *"fixa e atravessa a navegação"* **passou** — e a
   razão é legítima: clicar num link é navegação do **cliente**, a casca não remonta e o estado
   sobrevive em memória, sem o cookie. A travessia de verdade só se mede em **carga completa**, e o
   caso passou a abrir uma **aba nova**. Com o defeito, reprova.
