# Pesquisa — Fase 0 · Épico 4, fatia (a)

**Data**: 09/09/2026 · **Plano**: [plan.md](./plan.md)

Cinco decisões. Nenhuma delas é sobre qual cor usar — isso o documento 23 já resolveu. Todas são
sobre **como impedir que a cor escape depois**, que é o trabalho real desta fatia.

---

## R-1 · Como provar que não há flash do tema errado

**Decisão**: medir **antes da hidratação**, interceptando a classe do elemento raiz no primeiro
quadro pintado, e não por captura de tela.

**Motivo**: o defeito dura milissegundos. Uma captura tirada depois que a página assentou mostra o
tema certo mesmo quando o flash aconteceu — o teste passaria **e o usuário continuaria vendo a
página piscar**. É a mesma classe de defeito do V-4 do Épico 3, que lia a tela antes de a
conferência assíncrona terminar e decidia por tempo. O que torna a medição possível é que o
mecanismo escolhido escreve a classe no elemento raiz por um script síncrono, **antes** de o React
assumir; então existe um instante determinístico para observar, em vez de uma janela de sorte.

**Alternativas consideradas**:

| Alternativa | Por que não |
|---|---|
| Captura de tela comparada com referência | Mede o estado final, que é justamente o que não está em questão |
| Conferência humana ao recarregar | O olho não pega 40 ms de forma confiável, e o projeto já recusou conferência sem medida (`CHK008`) |
| Confiar que a biblioteca resolve | É o que "declarar cumprido sem estar" significa. O `FR-009` existe porque isso já falhou na v1.0 |

⚠️ **O `suppressHydrationWarning` no elemento raiz é obrigatório**, e não é gambiarra: o script
escreve a classe antes da hidratação, e sem ele o React acusa divergência entre servidor e cliente.
Está no documento 23 §2.1.

---

## R-2 · Como impor a regra de cor

**Decisão**: **duas regras de sintaxe restrita no ESLint**, sobre os mesmos arquivos — uma para cor
escrita à mão, outra para os utilitários da paleta padrão. Bloqueantes desde o fim desta fatia.

**Motivo**: o documento 23 §9.3 já traz a primeira, pronta, com a mensagem que **ensina o caminho
certo** em vez de só barrar. A segunda é consequência do esclarecimento de 09/09/2026 e usa o mesmo
mecanismo, porque `className="text-gray-500"` também é uma cadeia de texto literal no código. Uma
regra que já existe no motor de lint do projeto custa menos que uma verificação nova, e roda no
bloco de qualidade do CI, que é o mais rápido.

**Medido antes de decidir**: depois de pagos os cinco arquivos do `SC-007`, **não sobra nenhuma
violação no repositório** — as cinco telas do Épico 3 não usam cor alguma. Por isso a regra pode
nascer bloqueante, sem período de aviso.

**Alternativas consideradas**:

| Alternativa | Por que não |
|---|---|
| Verificação própria em Vitest varrendo o código | Duplicaria o que o lint já faz, e a mensagem de erro chegaria longe do arquivo |
| Só revisão de PR | É o que o `FR-004` proíbe nominalmente. Regra que depende de alguém lembrar não é regra |
| Começar em modo aviso | Desnecessário: a medição mostra que não há violação remanescente. Aviso que nunca vira erro é documentação com passos extras |

⚠️ **Uma exceção autorizada, e só uma**: o CSS de impressão, para a normalização preto-no-branco.
Documento 23 §9.3. Ela não existe ainda — a rota de impressão é dos épicos 10 e 11 —, mas fica
prevista para não ser negociada às pressas depois.

---

## R-3 · Como auditar contraste automaticamente

**Decisão**: um teste de unidade que **lê os pares declarados no contrato** e calcula a razão de
contraste dos dois temas, falhando com o **nome do par e o valor medido**.

**Motivo**: contraste é aritmética sobre dois valores conhecidos — não precisa de navegador nem de
captura. Um teste de unidade roda em milissegundos, no bloco mais rápido do CI, e pode rodar a cada
commit. E a exigência de **nomear o par e a razão** vem da lição do `CHK008`: uma verificação que
diz apenas "reprovou" obriga a pessoa a refazer o cálculo à mão para descobrir onde.

**Alternativas consideradas**:

| Alternativa | Por que não |
|---|---|
| Ferramenta de auditoria de acessibilidade no navegador | Mede o que está renderizado; um token declarado e ainda não usado escaparia |
| Conferência manual com ferramenta externa | Não repete a cada commit, e é exatamente o que o projeto recusou no `CHK008` |
| Confiar nas razões anotadas no documento 23 | O documento anota o valor **pretendido**. Se alguém editar a cor e não o comentário, a anotação vira mentira silenciosa |

⚠️ **A auditoria percorre o contrato, não o CSS.** Se ela lesse o arquivo de estilo, um par novo
entraria sem ser auditado e ninguém saberia. O contrato é a lista fechada, e há um teste separado
garantindo que arquivo e contrato não divergem.

---

## R-4 · shadcn/ui com Tailwind v4, e o problema real

**Decisão**: inicializar pelo CLI, copiar **quatro** componentes, e escrever o **de-para** entre as
variáveis do shadcn e os tokens CIAARA num contrato.

**Motivo**: o shadcn não é dependência — é código copiado, e o projeto o versiona. Com Tailwind v4
ele já gera o formato que o documento 23 usa: valores estáticos separados dos papéis, com os papéis
expostos por `@theme inline`. O que **não** vem pronto é o casamento: o shadcn traz o próprio
vocabulário de papéis, e o CIAARA tem o seu. Deixá-los convivendo sem de-para explícito cria **dois
pontos únicos de verdade** — a negação do `RF-DS-01` com a agravante de parecer cumprido, porque
todo componente fica bonito e nada acusa erro.

**Alternativas consideradas**:

| Alternativa | Por que não |
|---|---|
| Copiar os dezoito primitivos que o documento 23 nomeia | Multiplica por dezoito um problema ainda não resolvido uma vez. E código copiado que ninguém usa não é revisado por ninguém |
| Não copiar nenhum agora | O `FR-017` ficaria sem prova, e a reconciliação — que é o trabalho caro — seria descoberta na fatia (b), sob pressão |
| Reescrever os primitivos do zero, sem shadcn | Contraria o BRIEF §1 e joga fora acessibilidade que vem pronta e testada |

---

## R-5 · Tipografia e provedor de tema sem contaminar a árvore

**Decisão**: a tipografia é declarada no arquivo de layout raiz, que **permanece sem `"use client"`**;
o provedor de tema fica isolado num componente folha próprio, e o alternador é outro componente
folha.

**Motivo**: o marcador de cliente contamina toda a subárvore de importação. Um deles no layout raiz
mandaria o catálogo inteiro de telas para o pacote do navegador, e o `tsc` **não acusa** — só o
build. É o achado nº 1 do Épico 0 e o gotcha nº 1 do `CLAUDE.md`.

**Alternativas consideradas**:

| Alternativa | Por que não |
|---|---|
| `"use client"` no layout raiz | Anula o ganho dos componentes de servidor no sistema inteiro |
| Provedor de tema sem componente próprio | Obrigaria o marcador a subir para onde ele não pode estar |
| Tipografia por folha de estilo externa | Quebra a impressão, que não pode depender de rede na hora de imprimir (`FR-015`) |

⚠️ **A dependência `next-themes` não está instalada.** Conferido no `package.json` em 09/09/2026:
`next-themes`, `nuqs`, `zustand` e a biblioteca de gráficos estão todos ausentes. Só o `next-themes`
entra nesta fatia; os outros três pertencem às fatias (b) e (c) e **não devem ser instalados por
antecipação**.

---

## O que esta pesquisa NÃO precisou decidir

A paleta. O documento 23 §1.3 a traz completa — rampa institucional, neutros frios, escala
tipográfica de sistema de gestão, espaçamentos, raios, sombras, os nove trios de status nos dois
temas e as oito séries de gráfico. As razões de contraste já vêm anotadas par a par.

**Isso fecha a armadilha da deriva visual antes de ela existir.** O documento 06 alerta que o padrão
da v2.0 foi validado tela a tela ao longo de 39 especificações e manda capturá-lo **antes** de
reescrever. Ele já foi capturado: está no documento 23 §1.2, que mapeia cada valor da v2.0 ao seu
destino na v2.1, incluindo os nomes das classes que morrem e da semântica que sobrevive.
