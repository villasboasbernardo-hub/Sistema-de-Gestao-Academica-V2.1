# Roteiro de conferência — os 6 ajustes de 05/10/2026

> **Para Bernardo.** Doze passos, só sobre o que você pediu na conferência. O endereço e o commit
> estão no fim, medidos.
>
> ⚠️ **Dos seis ajustes, UM não era o que parecia.** O 4 (listas ilegíveis no escuro) **não** era
> `color-scheme` — ele já estava declarado e certo nos dois temas desde a fatia (a) do Épico 4. Eram
> **cinco nomes de token que não existem**, com 36 usos em 20 arquivos: `superficie-1`,
> `superficie-elevada`, `erro`, `alerta` e `acento`. `bg-superficie-1` **não compila para nada**, e o
> `preflight` do Tailwind dá a todo `<select>` fundo transparente com texto herdado — fundo claro da
> UA com texto claro, exatamente o seu relato. ⚠️ **E o mesmo defeito apagava a cor de TODA mensagem
> de erro do sistema**, nos dois temas: `text-erro` aparecia em 15 arquivos, em `role="alert"`, e
> saía na cor do texto comum. Nada acusava.

| # | Ajuste | O que fazer | O que tem de acontecer |
|---|---|---|---|
| 1 | **1** | Entrar e olhar o **topo** da lateral | O botão de fixar (a seta de painel) está **acima dos ícones**, visível com a lateral recolhida |
| 2 | **2** | Apontar a lateral, **clicar para fixar**, e **clicar outra vez** — sem mexer o mouse | Ela **recolhe na hora**, com o ponteiro ainda sobre ela. ⚠️ Era aqui que o defeito morava |
| 3 | **2** | Afastar o mouse e **voltar** a apontar | Expande de novo: o apontar **rearma** quando o ponteiro sai e entra |
| 4 | **2** | Com `Tab`, parar no botão de fixar e depois seguir para a primeira entrada | No **botão** ela fica recolhida; na **entrada** ela expande (é o que o teclado precisa para ler o menu) |
| 5 | **3** | Abrir uma tela longa e **rolar até o fim** | Os **ícones continuam na tela**. A lateral agora é fixa na altura da janela |
| 6 | **4** | **Tema escuro** → abrir a lista de **classificação** em *Cursos → Novo curso* | Campo e lista com **fundo escuro e texto claro**, legíveis. ⚠️ Era um dos sete `<select>` que o token inventado derrubava |
| 7 | **4** | No escuro, abrir o filtro **Situação** em *Turmas* | O painel do shadcn, que **nunca foi a causa**, continua legível — é o controle positivo do passo 6 |
| 8 | **4** | No escuro, provocar um erro (gravar turma com rótulo repetido) | A mensagem sai **na cor de conflito**, não na cor do texto comum. É a metade do defeito que ninguém tinha visto |
| 9 | **5** | Olhar **datas em qualquer tela**: lista de turmas, ficha, aba Grade do curso, vigências, período da disciplina | Tudo em **DD/MM/AAAA**. ⚠️ **Os campos de digitar continuam com o calendário do navegador** — eles são valor, não exibição |
| 10 | **5** | Em *Administração → Usuários*, olhar **Último acesso** | Data em `DD/MM/AAAA`; na página da conta, **data e hora**. ⚠️ Aqui havia um defeito de **fuso** escondido — ver a nota abaixo |
| 11 | **6** | Abrir a ficha de uma turma | Cabeçalho **compacto** numa linha (situação, modalidade, período, sala, efetivo) · faixa de **quatro indicadores** · **Andamento** com a barra e o saldo · **Disciplinas** · e, no fim, **Editar turma** recolhido |
| 12 | **6** | Clicar em **Editar turma** | O formulário de sempre abre. Fechar e abrir **descarta o que foi digitado e não gravado** — é consequência declarada do recolhível |

⚠️ **Repita os passos 11 e 12 no celular e no tema escuro**: a faixa de indicadores vira uma coluna,
o cabeçalho quebra em linhas e o botão de fixar não existe (abaixo de 1024 px a navegação é gaveta).

## O defeito de fuso que o ajuste 5 expôs, e que não era de formato

As duas telas de conta usavam `new Date(…).toLocaleDateString("pt-BR")` **sem declarar o fuso** —
então valia o fuso do **processo**: `America/Sao_Paulo` na máquina de quem programa e **UTC na
Vercel**. Um acesso às 22h de Brasília aparecia com a **data do dia seguinte** no preview, e com a
data certa no local. O formatador novo declara `America/Sao_Paulo`, como `hojeNaCiaara()` já fazia.

## O que mudou de propósito, e você vai notar

- **A ordem da ficha mudou** (ajuste 6): ela abre para **ler**. Editar é um clique deliberado, no fim
  da página. O **quadro de avisos ficou no topo** — ele é a região de alertas, e com o formulário no
  fim ele está acima de qualquer jeito.
- **O saldo de capacidade virou cartão** e, quando não há conta a fazer, ele mostra **traço com a
  razão curta** (*"sem término"*, *"sem regime vigente"*) — nunca zero. A frase inteira, que diz
  **onde** se conserta cada ausência, continua logo abaixo.
- **O alerta da semana do instrutor ficou mais longo**: *"Semana 10/2026 (02/03/2026 a
  08/03/2026)"*. A regra pede quatro dígitos de ano em toda exibição, e abrir exceção para um caso é
  o que faz o formato voltar a divergir. Dois testes afirmavam o texto antigo e foram emendados.
- **Nenhum token novo de cor nasceu.** Os cinco nomes inventados foram trocados pelos que já existem
  — `superficie`, `superficie-2`, `marca-suave`, `conflito-tinta`, `atrasado-tinta`, `marca` —, porque
  `erro` e `alerta` duplicariam o vocabulário **do domínio** que o próprio tema defende. ⚠️ **É a
  dúvida D-COR-1 do lote**: se você preferir uma escala de elevação de verdade (`superficie-1`), ela
  nasce declarada nos dois temas, e é decisão sua.

## O que NÃO mudou

Nenhuma migration, nada escrito no banco remoto, nenhum pacote novo. O formato no **banco** e na
**URL** continua ISO (`aaaa-mm-dd`) — só a exibição mudou. Lançamento, avaliação e atividade não
foram tocados.

## As guardas que nasceram destes ajustes, e as que discriminam

| Guarda | O que ela mede | Provada por defeito deliberado |
|---|---|---|
| `tests/unidade/token-de-cor-existe.test.ts` (`I-4c`) | todo utilitário de cor aponta para um token **declarado** em `app/globals.css` | ⚠️ **Ela nasceu VERMELHA**, nomeando exatamente os cinco fantasmas — e ficou verde com a troca |
| `tests/unidade/formato-de-data.test.ts` (`FR-034`) | ninguém formata data fora de `lib/formato/data.ts`, e o ponto único é de fato consumido | o caso do fuso e o da troca das duas funções (uma devolve traço, a outra **o dia anterior**) |
| `tests/e2e/tema.spec.ts` | no escuro, o `<select>` nativo tem fundo **pintado** (não `rgba(0,0,0,0)`) e 4,5:1 de contraste | ✅ com `bg-superficie-1` de volta, reprova com *"fundo TRANSPARENTE … rgba(0, 0, 0, 0)"* |
| `tests/e2e/lateral.spec.ts` (3 casos novos + 1 asserção) | desafixar recolhe na hora · o apontar rearma · o foco no botão não expande · os ícones ficam na tela ao rolar | ✅ com `lg:h-full` de volta, o caso da rolagem reprova com *"os ícones do menu saíram da tela"* |
| `lib/design/vocabulario.ts` — par `C-3` | contraste do **item realçado** de toda lista de escolha, nos dois temas | — (é aritmética; o que pega token inventado é a `I-4c`) |

⚠️ **A asserção que FALTAVA é a lição do ajuste 2:** o caso de fixar/desafixar media o atributo e o
cookie, e **nunca a largura** — então ele ficava verde com a lateral ainda expandida na tela. Você viu
o que o teste não media. A asserção nova mede **sem mover o ponteiro**, porque qualquer movimento
entre o clique e a medição reconstitui o estado certo por acidente.

## Se algum passo falhar

Diga **o número do passo** e o que você viu. Os doze têm caso automatizado, e quatro deles foram
provados nos dois sentidos — uma falha na tela que a suíte não pega é informação sobre a suíte, não
só sobre o produto.

## Medições desta entrega

| O quê | Medido | Artefato |
|---|---|---|
| `pnpm verificar` | **0** | tipos, lint, formatação, unidade e build |
| Unidade | **1.213** casos em **92** arquivos | `pnpm test:unidade` |
| pgTAP | **434** asserções em **35** arquivos, `PASS` | `pnpm test:invariantes` |
| RLS e ambiente | **222** em **8** arquivos | `pnpm test:rls` |
| Ponta a ponta | [pendente — medido depois da última rodada] | `pnpm test:e2e -- --workers=2` |
| Migrations | **nenhuma** | — |

<!-- O endereço do preview e o commit servido entram aqui depois do CI verde. -->
