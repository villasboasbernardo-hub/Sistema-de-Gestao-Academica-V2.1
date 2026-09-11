# Fase 0 — Pesquisa: Épico 4, fatia (c)

**11/09/2026** · entrada: [spec.md](./spec.md) · saída consumida por [plan.md](./plan.md)

Nenhum item ficou como `NEEDS CLARIFICATION`. As doze perguntas das três rodadas de esclarecimento
já fecharam as decisões de produto; o que resta aqui é decisão **técnica**, e quase toda ela foi
tomada sobre medição.

⚠️ **Um destes itens não é decisão: é um defeito de segurança encontrado em código que já está na
`main`.** Está em R-5, e ele muda o que a fatia precisa fazer.

---

## R-1 · Onde o contrato de parâmetros vive

**Decisão: em código tipado, com o documento 25 §1.3 emendado para não divergir dele.**

O `FR-001` exige ponto único. Hoje o mapa vive só no documento 25, que se autodenomina *"contrato
único do sistema"* e que nenhum requisito citava — então ele era uma tabela que ninguém era obrigado
a seguir.

**Racional.** As duas metades resolvem coisas diferentes e nenhuma sozinha basta:

| Onde | Resolve | Não resolve |
|---|---|---|
| Documento 25 §1.3 | a leitura humana, a rastreabilidade até o `RF-` de origem | nada impede uma tela de inventar parâmetro |
| Código tipado | o parâmetro fora do contrato **não compila** | ninguém lê código para entender a intenção |

**A emenda é obrigatória e já tem conteúdo definido** (`FR-001.1`): a tabela lista só `classificacao`
para a tela inicial, e o `RF-INI-02`, que é **[PRESERVADO]**, escreve `?classificacao=&modalidade=`
na própria nota de mecanismo. **Não é o requisito que está errado, é a tabela que está incompleta.**

**Alternativas consideradas.** *(a)* Só o documento: rejeitada — é o estado atual, e ele permite
inventar parâmetro sem violar requisito. *(b)* Só o código, documento vira histórico: rejeitada na
terceira rodada de esclarecimento, porque outras specs citam a tabela e ela perderia o endereço.

---

## R-2 · A biblioteca de estado na URL

**Decisão: a decidida no BRIEF, versão 2.10.1. Compatível no papel; conferir na instalação.**

**Medido em 11/09/2026:** as dependências de par declaram `next: >=14.2.0` e
`react: >=18.2.0 || ^19.0.0-0`. A versão instalada do arcabouço (16.3.3) e do React (19.2.8)
satisfazem as duas.

⚠️ **Satisfazer a faixa não é o mesmo que estar testado nela.** `>=14.2.0` não exclui a 16; também
não a afirma. A fatia (b) pagou exatamente esse preço quando a inicialização padrão trouxe uma base
de componentes diferente da decidida, **e a tela ficava idêntica**. A conferência aqui é barata: um
percurso que muda parâmetro, volta e recarrega, antes de qualquer tela depender dela.

⚠️ **E a biblioteca NÃO é alternativa aos ganchos nativos** — ela é construída sobre eles. A
restrição de plataforma fica satisfeita, e a decisão do BRIEF fica intacta.

---

## R-3 · `shallow` — o mesmo nome, dois comportamentos

**Decisão: a política é por parâmetro, e o padrão é avisar o servidor.**

**Medido nos tipos da versão instalada:** as opções de navegação do roteador trazem rolagem e tipos
de transição, e **nada mais**. `shallow` **não existe** ali — era do roteador antigo, que esta
plataforma não usa.

Na biblioteca decidida o nome existe, e significa **outra coisa**: *não notificar o servidor*.

| Natureza do parâmetro | Avisa o servidor? | Exemplo |
|---|---|---|
| Alimenta consulta | **sim** | classificação, modalidade, curso, turma, semana |
| Puramente visual | não | aba ativa quando as duas já vieram, seção recolhida |

⚠️ **O erro fica silencioso, e é por isso que ele merece requisito próprio** (`FR-004.1`). Com o
aviso desligado num filtro, a URL fica correta, o histórico funciona, o link compartilhado abre — e
**a consulta não é refeita**. Tudo parece certo menos o número na tela.

---

## R-4 · Onde o parâmetro é validado

**Decisão: por esquema, na fronteira de leitura, antes de qualquer uso.**

O projeto já tem a ferramenta de validação decidida e em uso nas Server Actions, onde a regra é
`safeParse` na primeira linha. **O parâmetro de URL é a mesma classe de coisa**: entrada externa,
que chega antes de qualquer decisão.

**Racional.** Validar na tela que usa seria tarde por dois motivos: o valor já teria passado por
funções intermediárias, e cada tela escolheria a sua tolerância. Validar na leitura torna o
`FR-006` — *valor fora do domínio usa o padrão e preserva os demais* — comportamento de um lugar só.

⚠️ **Falhar não é opção**, e é o que separa este caso de uma Server Action. Lá, entrada inválida é
erro do chamador e a ação recusa. Aqui, entrada inválida é um **link velho**, e recusar transformaria
um favorito antigo numa tela de erro. O esquema **degrada para o padrão**; quem recusa é só o
destino de redirecionamento (R-5).

---

## R-5 · ⚠️ O redirecionamento aberto que já está na `main`

**Achado, não decisão. Medido em 11/09/2026 lendo o código mesclado.**

O Épico 3 já preserva o destino através do login, e faz isso corretamente na ida: o proxy guarda
caminho **e** query em `?destino=`. A volta é que tem a guarda fraca.

```
roteador.replace(destino.startsWith("/") ? destino : "/");
```

⚠️ **`startsWith("/")` não é proteção de redirecionamento aberto.** Um endereço começando com duas
barras — `//outro-dominio` — é **relativo ao protocolo**: o navegador o resolve para outro host,
mantendo só o esquema. Ele passa na guarda. Variantes com contrabarra são a mesma família.

**O que isso muda na fatia:**

1. O `FR-042` deixa de ser precaução e passa a ter **alvo concreto**: esta linha.
2. O `FR-027` — preservar os parâmetros através do login — **já está meio pronto**, e a metade que
   existe é a de ida. A fatia completa a de volta.
3. O teste do `FR-043` precisa medir o **comportamento**, não a guarda: se a navegação chega a sair
   do domínio. Uma asserção sobre a condição passaria com a guarda atual.

**A forma correta** é construir o destino sobre a origem conhecida e recusar qualquer coisa cujo
host resolvido não seja o da própria aplicação — não inspecionar o texto em busca de padrões
proibidos. **Lista de permissão sobre a origem, não lista de negação sobre a cadeia.**

### Medido em 11/09/2026, com a guarda antiga reposta de propósito

| Destino | O que o navegador fez |
|---|---|
| `//dominio-hostil/` | **saiu da aplicação** e parou em `chrome-error://chromewebdata/` |
| `/\dominio-hostil/` | **saiu da aplicação** e parou em `chrome-error://chromewebdata/` |
| `https://dominio-hostil/x` | recusado pela guarda antiga — ela já barrava o absoluto |

⚠️ **O erro de navegador é a prova, não a absolvição.** `chrome-error://chromewebdata/` é o que se vê
quando a navegação para fora **acontece e falha** — aqui, porque o domínio do teste não existe. Com
um domínio que resolva, o navegador teria chegado lá. **Duas das três formas saem da aplicação.**

⚠️ **E TRÊS FORMULAÇÕES DE TESTE FORAM PRECISAS PARA PROVAR ISSO**, as duas primeiras passando com o
defeito no lugar:

1. comparar o **nome do host** com o domínio hostil: passa, porque a barra de endereço final é
   `chrome-error://chromewebdata/` e o nome hostil não está nela;
2. comparar a **origem** com uma leitura que reexecuta: passa, porque ela aprova na **primeira**
   leitura — e logo após o clique a página ainda é a de login;
3. **registrar toda navegação do quadro principal** e conferir a lista depois: reprova, e é a única
   que reprova.

**A lição serve além deste caso:** provar que algo **nunca** acontece exige observar uma janela, e
não amostrar um instante. Verificação que amostra dá a ausência por provada quando só chegou cedo.

⚠️ **Este achado é da fatia (c) por acidente de agenda, não por escopo.** Ele nasceu no Épico 3. Fica
registrado aqui porque foi aqui que apareceu, e porque o `FR-042` já o cobre.

---

## R-6 · A fronteira cliente/servidor do shell

**Decisão: a casca é de servidor; só o que abre e fecha é de cliente.**

| Peça | Onde | Por quê |
|---|---|---|
| Casca autenticada, com usuário e permissões | servidor | já é assim desde o Épico 3, e ler sessão é de servidor |
| Lista de entradas do menu | servidor | é dado de configuração, não de interação |
| Abrir/fechar o menu em tela estreita | **cliente** | é estado efêmero de interface |
| Marcar a entrada ativa | servidor | deriva do caminho, que o servidor conhece |
| Alternador de tema | **cliente** | já existe assim, da fatia (a) |

⚠️ **O shell é o lugar mais caro para errar isto.** O marcador de cliente contamina toda a subárvore
de importação: um deles na casca manda **todas as telas** para o pacote do navegador. E o erro **não
aparece na checagem de tipos** — aparece no build, que é por que ele faz parte da verificação local.

⚠️ **Marcar a entrada ativa no servidor tem uma consequência**, e é aceita: ela muda por navegação,
não por interação. É exatamente o que se quer — a entrada ativa **é** a URL.

---

## R-7 · Como a tabela densa passa a aceitar estado por fora sem quebrar quem já a usa

**Decisão: propriedades opcionais, com o estado interno como reserva.**

É o padrão de componente controlado e não controlado, e a escolha não é de estilo:

| Caminho | Consequência |
|---|---|
| Propriedades obrigatórias | **toda** montagem existente quebra, a começar pela vitrine |
| Propriedades opcionais | quem passa, controla; quem não passa, continua como hoje |

⚠️ **A prova de que não quebrou é medida, não afirmada** (`SC-010`): a vitrine monta a tabela sem
essas propriedades, e a suíte da fatia (b) precisa continuar verde sem alteração. Se um teste
daquela fatia precisar mudar, a propriedade não era opcional de verdade.

⚠️ **E há uma armadilha conhecida neste padrão**: aceitar as duas fontes ao mesmo tempo. Se a
propriedade chega e o estado interno também é atualizado, os dois divergem no primeiro clique. A
fonte é uma ou outra, decidida pela presença da propriedade.

---

## R-8 · O brasão — qual arquivo, em qual destino

**Decisão: dois destinos, dois arquivos. Não há versão vetorial, então não há atalho.**

**Medido na entrega de 11/09/2026:**

| Arquivo | Dimensões | Peso | Destino |
|---|---|---|---|
| menor | 794 × 1123 | 226 KB | tela — cabeçalho e casca de autenticação |
| maior | 3250 × 4913 | 6,3 MB | impressão — Épicos 10 e 11 |

⚠️ **Mandar o de impressão para o cabeçalho multiplicaria por vinte e oito o peso de um desenho que
aparece a quarenta pixels de altura.** O arcabouço otimiza imagem em tempo de requisição, o que
reduz o que chega ao navegador — mas não reduz o que fica no repositório nem o custo da primeira
geração.

⚠️ **Renomear é obrigatório** (`FR-032.2`): o nome entregue tem acento e espaço. Espaço vira `%20` na
URL; acento depende da codificação que o servidor escolher. A fatia (a) já fixou a convenção nos
arquivos de tipografia.

**Alternativa considerada.** Converter para vetor: rejeitada por ora — é redesenho de brasão
institucional, e o Princípio I não autoriza recriar identidade oficial por conveniência técnica.
Fica registrado que um vetor resolveria os dois destinos com um arquivo.

---

## R-9 · Como provar os quatro comportamentos sem as telas dos Épicos 5 a 9

**Decisão: sobre as rotas que esta fatia entrega, com parâmetros reais do contrato.**

A decisão de produto está no esclarecimento de 11/09; o que a pesquisa acrescenta é **quais rotas
servem para quê**:

| Comportamento | Onde se prova | Com o quê |
|---|---|---|
| Link direto | tela inicial | classificação e modalidade |
| Histórico | tela inicial | trocar recorte três vezes e voltar |
| Link compartilhado | tela inicial | dois perfis com escopos diferentes |
| Recarregar | tela inicial e vitrine | recorte aplicado, depois recarga |
| Destino através do login | qualquer rota autenticada | com query, e com destino hostil |

⚠️ **A cobertura é parcial por construção, e isso está declarado.** Os parâmetros das rotas dos
Épicos 5 a 9 só serão exercitados quando aquelas telas existirem. O contrato os declara desde já; a
prova de cada um chega com a sua tela.

---

## R-10 · O rascunho da lista de entradas do menu

**Decisão: derivar da árvore de rotas do documento 24, subtrair o que o `RF-CURSO-02` exclui, e
submeter a Bernardo.**

**O rascunho não é a fonte.** A árvore do documento 24 é o alvo da v2.1; o menu a ser preservado é o
da v2.0, em produção. Os dois podem divergir, e só quem vê o sistema resolve.

⚠️ **A subtração é a parte que se erra:** Avaliações e Relatório **têm rota própria** na árvore e
**ficam fora do menu**, por força do `RF-CURSO-02`, que é **[PRESERVADO]**. Quem derivar a lista da
árvore sem ler esse requisito acrescenta duas entradas que a v2.0 nunca teve — e o `FR-017` proíbe
exatamente isso.

⚠️ **Rota sem entrada no menu não é rota inalcançável.** As duas são alcançadas pela página do curso,
e é assim desde a v2.0.
