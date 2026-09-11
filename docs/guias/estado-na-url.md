# Guia — estado de navegação na URL

**Épico 4, fatia (c)** · 11/09/2026 · `FR-044`, `SC-021` · contrato executável em
`lib/navegacao/contrato.ts`

> Para quem vai escrever uma tela nova nos Épicos 5 a 9. Ele responde três perguntas, nesta ordem:
> **o que declarar**, **como ler e escrever**, e **o que não pode ir para a URL**.

⚠️ **ESTE GUIA É O QUE DECIDE SE O CONTRATO VALE ALGUMA COISA.** A tabela do documento 25 §1.3 se
autodenominava *"contrato único do sistema"* desde a Fase 2 e **nenhum requisito a citava** — então
uma tela nova podia inventar parâmetro sem violar requisito nenhum. O contrato agora é tipo, e o
tipo recusa; o que falta é alguém saber usá-lo antes de errar.

---

## 1. Declarar — três minutos, e nada compila sem isto

Abra `lib/navegacao/contrato.ts` e acrescente a rota. Cada parâmetro traz **cinco campos, todos
obrigatórios**:

```ts
"/instrutores": {
  rota: "/instrutores",
  origem: "RF-INSTR-01",            // o RF- que justifica a rota existir
  parametros: {
    curso: {
      nome: "curso",                // snake_case curto, como aparece na URL
      tipo: "escolha",              // texto | inteiro | escolha | lista
      padrao: "",                   // o valor que NÃO aparece na URL
      opcoes: CODIGOS_DE_CURSO,     // o domínio, quando há um
      historico: "empilha",         // empilha (contexto) | substitui (refino)
      avisaServidor: true,          // alimenta consulta? então o servidor recalcula
    },
    busca: {
      nome: "busca",
      tipo: "texto",
      padrao: "",
      historico: "substitui",
      avisaServidor: true,
      limiteDeFrequenciaMs: LIMITE_DE_FREQUENCIA_MS,  // 300 ms — digitar não é clicar
    },
  },
},
```

**O que cada campo decide, e o que acontece se estiver errado:**

| Campo | Erra assim | A tela fica |
|---|---|---|
| `historico` | `substitui` numa troca de contexto | correta, e o botão voltar não desfaz nada |
| `avisaServidor` | `false` num filtro | com a URL certa **e o número velho** |
| `padrao` | ausente | com `?x=` vazio pendurado no link compartilhado |
| `limiteDeFrequenciaMs` | ausente numa busca | com oito idas ao servidor por palavra digitada |
| `origem` | inventado | reprovando no teste do contrato, que confere no documento 02 |

⚠️ **NENHUM DOS QUATRO PRIMEIROS QUEBRA A TELA**, e é exatamente por isso que eles são campos do
contrato e não opções da chamada. Os quatro sobrevivem a uma revisão de código atenta.

⚠️ **O DOMÍNIO VEM DO BANCO, NÃO DA SUA MEMÓRIA.** Use `Constants.public.Enums.*` quando o valor for
de enum. Medido em 11/09/2026: a primeira versão deste contrato listou **três** classificações de
curso à mão e a coluna aceita **sete** — um link com uma das quatro que faltavam seria degradado
para *"todas"* em silêncio, e a tela abriria cheia sem erro nenhum para ver.

### Rastreabilidade

O documento 25 §1.3 continua sendo a leitura humana, com a coluna *Origem*. **Os dois, ou nenhum:**
há teste que compara o contrato com a tabela, e foi ele que pegou a emenda de `modalidade` a
`/inicio` envelhecendo sozinha.

---

## 2. Ler e escrever

### No servidor — a página

```tsx
export default async function Instrutores({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { valores } = lerParametros("/instrutores", await searchParams);
  // `valores.curso` já vem validado e degradado. Só agora ele pode virar predicado.
}
```

⚠️ **A VALIDAÇÃO ACONTECE ANTES DE O VALOR ALCANÇAR CONSULTA, RENDERIZAÇÃO OU NAVEGAÇÃO** (`FR-041`).
Nunca depois, e nunca só na tela que o usa: com o `RF-NAV-01`, a barra de endereço é entrada de
usuário, e **quem cola um link não é sempre quem o escreveu**.

### No navegador — o controle

```tsx
"use client";
const [curso, definirCurso, esperando] = useParametro("/instrutores", "curso");
```

Três coisas, e a terceira é a que costuma faltar:

1. `curso` — o valor, já do tipo que o contrato declara;
2. `definirCurso` — escreve; **`null` volta ao padrão e apaga o parâmetro da URL**;
3. `esperando` — verdadeiro enquanto o servidor recalcula. É o `FR-045`: **o que estraga a
   experiência não é a latência, é o silêncio**.

⚠️ **O GANCHO SE CHAMA `useParametro`, com prefixo em inglês — exigência do motor, não tradução**, da
mesma classe que o `snake_case` dos identificadores de banco. O React reconhece gancho pelo nome, e a
regra de lint que impede um gancho de ser chamado dentro de condição deixa de valer com qualquer
outro nome. O nome do **arquivo** continua em português.

⚠️ **NÃO PASSE OPÇÕES.** Histórico, aviso ao servidor, limite de frequência e remoção do padrão saem
todos do descritor. Não há onde passá-las, e é assim de propósito.

### A folha de cliente é só o controle

`page.tsx` e `layout.tsx` **nunca** levam `"use client"`. O marcador contamina toda a subárvore de
importação: um deles numa página de listagem manda a tabela inteira e o catálogo de siglas para o
pacote do navegador, e **o erro não aparece na checagem de tipos** — aparece no `next build`.

---

## 3. O que **não** vai para a URL

A pergunta que resolve todos os casos:

> **Este estado faz sentido num link que eu mando para outra pessoa?**

| Exemplo — vai para a URL | Contraexemplo — fica no componente |
|---|---|
| a turma que estou vendo | o painel de filtros estar aberto |
| o recorte por classificação | o texto digitado dentro do seletor, antes de escolher |
| a coluna pela qual ordenei | qual linha tem o foco do teclado |
| a semana do DSA | o diálogo de confirmação estar aberto |

### As seis proibições nomeadas (documento 25 §3.3)

| Tentação | Por que é errado | Onde vai |
|---|---|---|
| guardar perfil e permissões no cliente | autorização no cliente é decorativa; a fronteira é a RLS | servidor, a cada requisição |
| guardar o curso selecionado num contêiner | é contexto de navegação — recria o `AppState` com outro nome | URL |
| guardar a lista de instrutores carregada | é dado do sistema; vira cache paralelo que ninguém invalida | Server Component |
| guardar os filtros num contêiner | filtro é recorte de tela — perde link direto e botão voltar | URL |
| guardar o tema à mão | a biblioteca de tema já resolve, com persistência e sem flash | `next-themes` |
| um depósito global de notificações | vira depósito de responsabilidades acumuladas | aviso local |

⚠️ **O RISCO TEM NOME NO PRÓPRIO BACKLOG DO ÉPICO 4:** *"o gerenciador de estado virar o `AppState`
disfarçado"*. E o caminho mais curto para recriá-lo **não instala nada** — é um contêiner de
contexto. Por não instalar nada, nenhum portão de dependência o pegaria; por isso existe
`tests/unidade/sem-contexto-de-navegacao.test.ts`, que conta os três zeros: contêiner de navegação,
parâmetro de paginação e gerenciador de estado instalado sem consumidor medido.

⚠️ **A EXCEÇÃO EXISTE E É UMA SÓ:** o contêiner que a lista navegável usa para saber qual célula tem
o foco. É coordenada de teclado dentro de uma grade — não recorta dado, não identifica registro, e
não faz sentido num link.

---

## 4. Exemplo executável

Não há exemplo de brinquedo neste guia. Os dois abaixo estão no repositório, rodando:

| O quê | Onde | O que ele mostra |
|---|---|---|
| Os quatro tipos de parâmetro, juntos | `app/estilo/amostras.tsx`, amostras *na URL* | escolha que empilha, escolha que substitui, lista e texto com limite |
| Uma tela de verdade, com servidor e RLS | `app/(app)/inicio/` | leitura no servidor, folha de cliente, sinal de espera, três vazios |

E os percursos que os provam:

| Suíte | O que ela mede |
|---|---|
| `tests/e2e/estado-na-url.spec.ts` | a mecânica: link direto, histórico, recarga, padrão ausente |
| `tests/e2e/inicio.spec.ts` | o efeito sobre o dado: o número muda, o sinal aparece, o link não vaza |
| `tests/e2e/url-degradada.spec.ts` | a tela abre mesmo com a URL errada |
| `tests/e2e/url-hostil.spec.ts` | os três vetores do contrato de segurança |

⚠️ **A DIVISÃO ENTRE AS DUAS PRIMEIRAS É DE MEIO, NÃO DE RIGOR.** Um percurso que confira só a barra
de endereço **passa com o aviso ao servidor desligado** — que é o defeito que ele deveria pegar.

---

## 5. Antes de abrir o PR da sua tela

- [ ] a rota está em `lib/navegacao/contrato.ts` **e** no documento 25 §1.3
- [ ] `origem` aponta para um `RF-` que existe no documento 02
- [ ] `historico` é `empilha` no que troca contexto e `substitui` no que refina
- [ ] `avisaServidor` é `true` em tudo que alimenta consulta
- [ ] a busca tem `limiteDeFrequenciaMs`
- [ ] `page.tsx` **não** tem `"use client"`
- [ ] o percurso confere **o conteúdo**, e não só a URL
- [ ] nenhum estado efêmero foi para a barra de endereço
