# Fase 0 — Pesquisa: Épico 4, fatia (b)

**10/09/2026** · entrada: [spec.md](./spec.md) · saída consumida por [plan.md](./plan.md)

Nenhum item ficou como `NEEDS CLARIFICATION`. Os oito esclarecimentos da spec já haviam fechado as
decisões de produto; o que resta aqui é decisão **técnica**, e quase toda ela foi tomada sobre
medição, não sobre preferência.

---

## R-1 · Quantos pacotes novos esta fatia realmente precisa

**Decisão: dois — a biblioteca de gráficos e a de ícones. Nenhum pacote de componente.**

**Racional.** Medi o que o pacote `radix-ui` 1.6.7, já instalado desde a fatia (a), exporta. Ele
traz **`AlertDialog`, `Collapsible`, `Dialog`, `Label`, `Popover`, `Select`, `Slot` e `Tooltip`** —
sete primitivos de que esta fatia precisa, mais o `Slot` que ela já usava. Os três que faltam
(`Alert`, `Input`, `Skeleton`) são, no shadcn, **folha de estilo pura**: não têm primitivo por
baixo, são um elemento HTML com classes.

Então a lista de instalação encolhe para o que já estava previsto:

| Pacote | Por que entra | Estava previsto? |
|---|---|---|
| A biblioteca de gráficos | É a decidida no BRIEF §1, e o `FR-016` a exige | ✅ sim, é dependência prevista |
| A biblioteca de ícones | Decisão de 10/09/2026, `FR-003.1`. O `components.json` **já a declara** em `iconLibrary` desde a fatia (a) | ✅ sim, e a configuração já apontava para ela |

⚠️ **A pendência §11.2 do documento 23 fecha aqui**, e note o que a medição mostrou: a configuração
da fatia (a) já tinha escolhido, e a pendência continuou aberta no documento por catorze dias. É o
mesmo padrão das sete anotações de contraste — **registro e realidade divergindo em silêncio**.

**Alternativas consideradas.** Instalar os primitivos avulsos (`@radix-ui/react-select` e afins):
rejeitada, porque duplicaria em catorze pacotes o que um já entrega, e porque os quatro componentes
da fatia (a) já importam do pacote unificado — misturar os dois estilos de importação é divergência
nascendo.

---

## R-2 · O portão de dependências pega o que esta fatia pode trazer por engano?

**Decisão: pega o caso conhecido, e não pega o caso desta fatia. Fica registrado.**

O teste de `FR-019` lista dez bibliotecas de componentes proibidas e tem controle positivo para o
Radix. Ele **pegaria** uma substituição como a de 09/09/2026, em que a inicialização padrão trouxe
Base UI. Ele **não pegaria** um pacote de propósito único que o shadcn arrasta junto de uma receita
— o menu de comando por trás do seletor com busca é exatamente esse caso.

Isso não é defeito do portão: ele guarda a proibição do BRIEF §1, que fala em **biblioteca de
componentes**. Mas a fatia (a) provou que a proibição sem portão é conselho, e aqui há uma porta que
o portão não vigia. **A solução escolhida foi não passar por ela** — ver R-3 — em vez de alargar a
lista de proibidos com um nome que ninguém tentaria instalar de propósito.

---

## R-3 · O seletor de 177 instrutores precisa de busca. Como, sem pacote novo?

**Decisão: `Popover` (já instalado) + campo de texto + a lista navegável compartilhada.**

**Racional.** Três forças se encontram aqui.

1. **177 instrutores num seletor sem busca é inutilizável.** A `RN-ANT-01` manda ordenar por
   antiguidade, não alfabeticamente, então quem procura "Silva" não pode nem chutar a posição.
2. **A receita pronta do shadcn para isso arrasta um pacote novo.** Ele não é biblioteca de
   componentes no sentido do BRIEF §1, mas é dependência externa, e a fatia (a) acabou de pagar o
   preço de uma dependência que entrou sem ninguém decidir.
3. **O trabalho já está no orçamento desta fatia.** A tabela densa precisa de *roving tabindex*
   (`FR-023`), que é a mesma navegação por teclado que uma lista filtrada precisa. Construir a lista
   navegável uma vez e usá-la nos dois lugares **custa menos** que instalar o pacote e ainda manter
   o *roving tabindex* da tabela à parte.

O componente `lista-navegavel.tsx` fica fora do inventário do documento 23 §3.1, e isso está
declarado como a única entrada do *Complexity Tracking* do plano.

**Alternativas consideradas.** *(a)* Instalar o pacote do menu de comando: rejeitada pela força 2, e
porque ela reabriria uma decisão de plataforma numa fatia que não é de plataforma. *(b)* `Select`
puro, sem busca: rejeitada pela força 1 — seria entregar um seletor que a tela de instrutores não
pode usar, e a spec 006 é justamente quem prova se esta fatia entregou algo utilizável.

---

## R-4 · Onde exatamente fica a fronteira entre calcular e aplicar a antiguidade

**Decisão: `lib/dominio/antiguidade.ts` calcula o peso e ordena; o `SeletorInstrutor` chama e exibe.
O componente não conhece a escala.**

**Racional.** O `FR-020` proíbe o componente de implementar regra `RN-`. O `FR-011.1` o obriga a
ordenar sempre. Parecem brigar, e não brigam — a diferença está em **quem sabe o critério**:

| Camada | Sabe o quê | Arquivo |
|---|---|---|
| Domínio | que CMG vem antes de CF, e que empate resolve por nome | `lib/dominio/antiguidade.ts` |
| Componente | que a lista precisa passar por aquela função antes de aparecer | `components/ciaara/seletor-instrutor.tsx` |

O componente pode ser reescrito inteiro sem que a regra mude; a regra pode mudar sem que o
componente seja tocado. É isso que a fronteira compra.

⚠️ **A escala P/G → peso NÃO é constante do domínio.** A `RN-ANT-02` e o Princípio VII a colocam em
`config_listas`, e ela chega à função pura **como argumento**. Uma tabela de doze postos escrita
dentro de `antiguidade.ts` passaria em todo teste desta fatia e violaria o princípio em silêncio.

⚠️ **Posto desconhecido vai para o fim da ordem, com aviso** — `RN-ANT-02` e `RN-DEG-01`, e é o
mesmo comportamento que o caso de fronteira da spec manda para a faixa "Outros" dos gráficos.

---

## R-5 · O que "aviso sempre visível" significa, operacionalmente

**Decisão: visível durante toda a permanência na tela, no topo da região do módulo, sem depender de
rolagem e sem poder ser dispensado.**

**Racional.** É o `CHK008`, aberto desde a fatia (a), e o próprio checklist dizia que *"a diferença
muda o componente que a fatia (b) constrói"*. As três leituras possíveis produzem três componentes:

| Leitura | O que exigiria | Veredito |
|---|---|---|
| Sempre visível **durante a sessão** | estado fora do componente, sobrevivendo à navegação | ❌ a premissa 3 da spec tira estado de navegação desta fatia |
| Sempre visível **enquanto a tela estiver aberta** | posição fixada por folha de estilo, sem dispensar | ✅ **escolhida** |
| Visível **até rolar além** | nada além do fluxo normal | ❌ falha a palavra *"sempre"* do `RNF-USA-04` |

A escolhida é a mais barata das que satisfazem o requisito: **não precisa de marcador de cliente**,
porque fixar posição é folha de estilo, e é isso que mantém o componente fora do pacote do
navegador — como o documento 23 §3.1 já previa ao marcar `"use client"` como *não* para ele.

⚠️ **Sem botão de dispensar, e é deliberado.** `RN-DEG-02` diz que regra normativa vira **alerta,
nunca bloqueio**; um alerta que a pessoa fecha e esquece é bloqueio nenhum e alerta nenhum.

---

## R-6 · Sete gráficos ou três?

**Decisão: três componentes genéricos. Os sete da spec 006 são instâncias, e saem de dois deles.**

**Racional.** O documento 23 §3.1 inventaria três: barras, pizza e linha. A spec 006 nomeia sete —
habilitados × selecionados, classificação, posto/graduação, OM, escolaridade, regime de trabalho e
capacitação didática. **São sete perguntas sobre instrutores, não sete formas de desenhar.**

Construir sete componentes seria construir a tela do Épico 5 dentro do Design System, que é
literalmente a decisão que esta mesma fatia recusou para as três grades em 10/09/2026. A prova de
cobertura — qual componente atende qual dos sete, com quais propriedades — está em
[contracts/graficos.md](./contracts/graficos.md).

⚠️ **`GraficoLinha` entra sem consumidor nesta linhagem de specs.** Nenhum dos sete o usa. Ele está
no inventário do documento 23 e serve série temporal, que os Épicos 9 e 12 vão pedir. Fica
registrado que ele é o único componente da fatia cujo primeiro uso real ainda não tem endereço.

---

## R-7 · Como a cor deixa de ser o que distingue uma série

**Decisão: marcador de forma por série e rótulo junto do traço, com a legenda como reforço.**

**Racional.** É a decisão de 10/09/2026 do `FR-018`, e a medição que a forçou está lá: no tema claro
as séries 1 e 8 ficam a `0,0003` de luminância; no noturno, a 4 e a 7 a `0,0005`.

⚠️ **O documento 23 §7 já mandava isso na sua tabela de regras** — *"cor nunca é a única codificação:
traço tracejado, marcador distinto ou rótulo direto"* — enquanto o parágrafo logo acima afirmava que
as luminâncias eram distintas. **O documento contradizia a si mesmo, e a metade certa é a tabela.**

A mesma tabela traz duas regras que caem bem aqui e viram propriedade do contrato: *"rótulo direto
em vez de legenda quando couber, até quatro séries"* e *"máximo de seis séries — acima disso vira
tabela"*.

---

## R-8 · O formato do nome de instrutor, e o algoritmo que o acompanha

**Decisão: seguir o `RF-INSTR-15` — `P/G Especialidade/Habilitação Nome Completo`, com as palavras
do nome de guerra em negrito. Portar o algoritmo da spec 020 da v2.0, com os casos de teste.**

**Racional.** O `FR-012` da spec 007 comprime o formato para `P/G Especialidade Nome de Guerra`, e
essa compressão **descarta o nome completo**. O `RF-INSTR-15` é **[PRESERVADO]** e a spec 006
concorda com ele no `FR-027.2`. Entre a minha transcrição e o documento normativo, vale o documento.

O algoritmo tem história: a spec 020 da v2.0 corrigiu um defeito em que o destaque **falhava em
silêncio** quando as palavras do nome de guerra não eram contíguas no nome completo — *"Guilherme
Black" dentro de "Guilherme Pires Black Pereira"*. A correção marca **palavra a palavra**.

| Caso | Comportamento portado |
|---|---|
| Nome de guerra contíguo de duas palavras | marcação única, contígua — é o caso que os testes antigos já cobriam |
| Palavras não contíguas | **cada fragmento** recebe destaque |
| Palavra sem correspondência no nome completo | **não recebe destaque e não lança exceção** (`RN-DEG-01`) |
| Sem nome de guerra | degrada para o formato possível, sem espaço duplo nem rótulo órfão |

---

## R-9 · O traço que identifica o campo

**Decisão: `--texto-tenue`, conforme o `FR-032`. Nenhuma cor muda, nenhum token nasce.**

Medido em 10/09/2026: **nenhum** dos catorze tokens de borda alcança 3:1 — o teto é `2,02` no tema
claro e `2,23` no noturno. `--texto-tenue` mede `4,49` e `4,85` contra o preenchimento do campo.

O par entra na auditoria de contraste como par próprio (`FR-032.1`), porque decisão que não vira
asserção vira anotação, e anotação que ninguém confere envelhece — foi o que aconteceu com as sete
do documento 23 §1.3.

---

## R-10 · A tabela renderiza todas as linhas

**Decisão: todas. Sem janela de visão, e a decisão é reaberta só com medição na mão.**

Os volumes reais: 177 instrutores, 175 disciplinas, 29 turmas, e o maior conjunto — cerca de 1.753
registros de aula — chega **filtrado por turma e semana**, nunca inteiro. O `CLAUDE.md` manda
priorizar clareza e manutenibilidade sobre desempenho **porque a base é pequena**.

E há a razão que decide: renderização parcial precisa de artifício para que o teclado alcance linha
que não está na tela, e o `FR-023` exige justamente isso. **Complexidade que briga com
acessibilidade precisa de um problema medido**, e não há.
