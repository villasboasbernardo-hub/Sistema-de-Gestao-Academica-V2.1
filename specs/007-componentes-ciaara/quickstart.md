# Como validar a fatia (b)

**Fase 1** · 10/09/2026 · complementa o [plano](./plan.md) e os [contratos](./contracts/)

## O que torna esta fatia barata de validar

**Ela não toca banco.** Nenhuma migration, nenhuma policy, nenhuma linha de dado. Então quase tudo
se prova sem subir contêiner, e a parte que precisa de navegador se prova numa rota que **não pede
sessão**: a vitrine `/estilo`, que a fatia (a) deixou aberta de propósito, porque exigir login para
ver uma paleta não protegeria nada.

⚠️ **`pnpm verificar:tudo` continua sendo o portão antes do PR**, e continua subindo o banco — não
pelos componentes, mas porque as suítes das fatias anteriores vivem lá e precisam continuar verdes.

## Pré-requisitos

| Item | Como conferir |
|---|---|
| Ramo desta fatia | `git branch --show-current` → `feat/EPICO-4b-componentes-ciaara` |
| Fatia (a) presente | `app/globals.css` existe e `/estilo` abre |
| Dependências instaladas | `pnpm install` sem erro |

## Passo 1 — Ver com o olho

```
pnpm dev
```

Abrir **`http://localhost:3000/estilo`**. Não pede login.

O que precisa estar lá, e é o `SC-001`:

- **Os treze componentes**, cada um com pelo menos um exemplo. Um componente sem amostra é um
  componente que ninguém vai notar quando quebrar — é a mesma invariante que a fatia (a) aplicou aos
  tokens.
- **Os três gráficos**, cada série com **marcador de forma e rótulo**.
- **Os nove tons** do emblema de status, cada um com o **rótulo textual** ao lado.

⚠️ **Duas conferências que só o olho faz, e as duas são o ponto da fatia:**

1. **Alternar para o tema noturno e olhar de novo.** Todo componente acompanha, porque nenhum tem
   cor própria. Se um não acompanhar, ele tem cor escrita à mão — e a regra de lint deveria tê-lo
   pegado antes de você.
2. **Imprimir a vitrine em preto e branco** (a visualização de impressão basta). **As séries de
   gráfico continuam distinguíveis.** Se você precisar da cor para saber qual é qual, a `FR-018` não
   foi cumprida — e é exatamente o que a paleta sozinha não entrega, medido em 10/09/2026.

## Passo 2 — A navegação por teclado, com as mãos

Ainda em `/estilo`, na amostra da tabela densa. **Sem tocar o rato.**

| Faça | Esperado |
|---|---|
| `Tab` até chegar à tabela | entra na grade em **um** passo |
| Setas | move célula a célula, nas duas dimensões |
| `Home` / `End` | primeira / última coluna da linha |
| `PageDown` | salta 20 linhas; com menos que isso, vai para a última |
| `Tab` de novo | **sai** da grade em um passo |
| `Shift+Tab` para voltar | retorna à **mesma** célula de antes |

O foco tem de estar **visível o tempo todo**. Se você perder de vista onde está, o `FR-024` falhou.

Depois, na amostra do seletor de instrutor: digitar três letras, e o foco vai para a **primeira
opção restante** — nunca fica numa linha que sumiu.

## Passo 3 — As funções puras, sem navegador

```
pnpm test:unidade
```

É aqui que a regra de *Risco: Alto* se prova. O que precisa estar verde:

- **Ordenação por antiguidade** com a escala passada como argumento, empate resolvido por nome, e
  **posto desconhecido no fim, com aviso** — nunca omitido.
- **Nome de instrutor**: nome de guerra contíguo, **não contíguo** (cada fragmento destacado),
  palavra sem correspondência (sem destaque, **sem exceção**) e sem nome de guerra (sem espaço
  duplo).
- **Os portões**: zero cor fora do ponto único, zero variável de primitivo sem par, **exatamente um**
  construtor de seletor de instrutor, zero componente importando banco ou regra.

⚠️ **Conferir o portão do seletor por defeito deliberado.** Escrever um segundo seletor de instrutor
em qualquer lugar do repositório e rodar de novo: o `SC-002` tem de **reprovar**. Um portão que
nunca foi visto reprovando é uma afirmação, não uma prova — foi assim que o Épico 0 fechou.

## Passo 4 — O percurso, no navegador

```
pnpm test:e2e
```

Cobre o teclado do passo 2, o foco visível, a região anunciada do alerta e a presença de cada
componente na vitrine.

## Passo 5 — O portão inteiro, antes do PR

```
pnpm verificar:tudo
```

Precisa sair **0**, e precisa dar o **mesmo veredito que o CI** sobre o mesmo commit — é o `SC-010`.

⚠️ **Verde aqui e vermelho no CI é defeito da verificação, não azar**, e vira tarefa de correção.
Aconteceu no Épico 3: a suíte de ponta a ponta perguntava as chaves ao banco no carregamento da
configuração, e o bloco do CI que a rodava não tinha banco. **Uma suíte que fala com o banco
pertence ao bloco que tem banco.**

## O que NÃO se valida aqui

| Fora | Onde se valida |
|---|---|
| Estado de filtro na URL | fatia (c) — aqui ele entra e sai por propriedade |
| As telas de instrutores | Épico 5, e é lá que a genericidade é julgada de verdade |
| As três grades densas | Épicos 6 e 7 |
| Rotas de impressão | Épicos 10 e 11 |

⚠️ **A validação que importa mais não acontece nesta fatia.** É o Épico 5 consumir os treze
componentes sem construir nenhum — o `SC-009`. Enquanto isso não acontecer, "genérico" é uma
intenção verificada só por mim.
