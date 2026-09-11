# Contrato — parâmetros da URL

**Fase 1** · 11/09/2026 · fonte: documento 25 §1.3 e §1.6 · `FR-001` a `FR-008`, `FR-045`

## Por que isto é contrato e não tabela

A tabela do documento 25 §1.3 existe desde a Fase 2, chama a si mesma de *"contrato único do
sistema"*, e **nenhum requisito a citava**. Uma tela nova podia inventar parâmetro sem violar
requisito nenhum — e foi isso que o `CHK001` pegou.

⚠️ **O que muda aqui é a exigibilidade, não o conteúdo.** O contrato passa a viver em código tipado,
onde parâmetro fora dele **não compila**, e o documento 25 continua sendo a leitura humana e a
rastreabilidade até o `RF-` de origem. Os dois, ou nenhum — ver [research §R-1](../research.md).

## As rotas desta fatia

Só estas existem quando a fatia fecha. As demais do documento 25 §1.3 ficam declaradas e são
exercitadas pelas suas telas, nos Épicos 5 a 9.

| Rota | Parâmetro | Tipo | Padrão | Histórico | Avisa o servidor? |
|---|---|---|---|---|---|
| `/inicio` | `classificacao` | escolha | `""` (todas) | empilha | **sim** |
| `/inicio` | `modalidade` | escolha | `""` (todas) | empilha | **sim** |
| `/estilo` | — | — | — | — | — |

⚠️ **`modalidade` entra por emenda ao documento 25 §1.3** (`FR-001.1`). A tabela de lá lista só
`classificacao`; o `RF-INI-02`, que é **[PRESERVADO]**, escreve `?classificacao=&modalidade=` na
própria nota de mecanismo. **Não é o requisito que está errado.**

⚠️ **A vitrine não tem parâmetro, e isso é declaração, não omissão.** Ela não recorta nada.

## As regras que valem para todo parâmetro

1. **Valor padrão não aparece na URL** (`FR-002`). Link curto, e link compartilhado sem ruído.
2. **Identidade vai no caminho; recorte vai na consulta.** A turma identifica a tela do DSA, então é
   segmento; a semana recorta a mesma tela, então é consulta.
3. **O valor é a chave de negócio legível** (`FR-003`), nunca o identificador técnico interno. Um
   identificador opaco na barra de endereço não diz nada a ninguém, e a chave é rastreável até a v2.0.
4. **A rota de impressão herda os parâmetros da tela de origem, sem tradução.** Reservado aqui;
   exercido nos Épicos 10 e 11 (`FR-035`).

## Histórico — empilha ou substitui

| Ação | Política | Por quê |
|---|---|---|
| Trocar contexto — curso, turma, semana, aba | **empilha** | é navegação; voltar precisa desfazer |
| Digitar numa busca | **substitui**, com limite de frequência | senão cada tecla vira uma entrada |
| Marcar ou desmarcar filtro | **substitui** | refinamento da mesma tela |
| Ordenar coluna | **substitui** | idem |
| Abrir painel que muda a URL | **empilha** | voltar fecha o painel, que é o esperado no celular |

⚠️ **O limite de frequência da busca é 300 ms**, e ele vem para o contrato porque vivia **num exemplo
de código** do documento 25 §1.5, não numa regra (`FR-005`). Valor que mora em exemplo é valor que a
próxima tela escolhe de novo.

⚠️ **O documento 25 chama esta tabela de *"a única regra que se erra na prática"*.** Ela é
verificável: oito teclas digitadas produzem **uma** entrada de histórico, não oito (`SC-014`).

## Avisar o servidor — o erro que não aparece

| Natureza | Avisa? | Consequência de errar |
|---|---|---|
| Alimenta consulta | **sim** | com o aviso desligado: URL certa, histórico certo, link certo, **e o número velho na tela** |
| Puramente visual | não | com o aviso ligado: ida ao servidor à toa a cada clique |

⚠️ **É a armadilha de nome desta fatia.** A opção que controla isso **não existe** na navegação desta
plataforma — era do roteador antigo. Na biblioteca decidida ela existe e significa **outra coisa**:
*não notificar o servidor*. O mesmo nome, dois comportamentos, e o errado parece o certo
([research §R-3](../research.md)).

## Entrada inválida — o que acontece com o quê

| Caso | Comportamento | Requisito |
|---|---|---|
| Valor fora do domínio | usa o padrão daquele parâmetro; **os demais são preservados** | `FR-006` |
| Parâmetro fora do contrato da rota | ignorado; a tela não quebra | `FR-007` |
| Par incompleto (semana sem ano) | o que falta usa o padrão; a tela não abre vazia | Edge Case |
| Item podre dentro de uma lista | **só o item sai**; a lista sobrevive | data-model §3 |
| Identificador inexistente ou fora de escopo | estado vazio que distingue *"não há"* de *"você não vê"* | `FR-008` |
| Destino de retorno externo | **RECUSADO** — ver [segurança](./seguranca-da-url.md) | `FR-042` |

⚠️ **Cinco degradam, um recusa.** A distinção é a diferença entre acidente e intenção: link velho é
acidente, e recusá-lo transformaria um favorito antigo numa tela de erro. Destino apontando para
fora é intenção.

⚠️ **Degradar não é engolir.** A tela funciona; o evento fica registrado para quem opera. O
requisito de observabilidade disso **não existe** e está declarado como pendência no plano (P-5).

## Retorno visual

Toda troca de recorte produz **sinal visível imediato**, ainda que o dado demore (`FR-045`).

⚠️ **Sem alvo numérico, e a ausência é deliberada.** Na v2.0 trocar contexto era instantâneo, porque
era memória; aqui é ida ao servidor. **O que estraga a experiência não é a latência, é o silêncio** —
sem sinal, a pessoa clica de novo. E não se escolhe um número antes de existirem as telas densas dos
Épicos 5 a 9: um teto tirado da tela mais leve do sistema não representa nada.

## Como se prova

| O quê | Como |
|---|---|
| Tipo, padrão e política declarados | teste de unidade sobre o contrato — sem navegador |
| Degradação de valor inválido | teste de unidade sobre o esquema, com os quatro tipos |
| Parâmetro padrão ausente da URL | percurso automatizado, lendo a barra de endereço |
| Uma entrada de histórico por palavra digitada | percurso automatizado, oito teclas |
| Aviso ao servidor | percurso automatizado: trocar filtro e conferir que o **número** mudou |

⚠️ **O último é o que não se prova por atributo.** Um teste que confira só a URL passa com o aviso
desligado — e é exatamente o defeito que ele deveria pegar.

---

## O que ficou exercitado nesta fatia, e o que espera as telas (`FR-003`)

Registro de 11/09/2026, ao fim da História 1.

| Rota | Parâmetros no contrato | Exercitada | Onde |
|---|---|---|---|
| `/estilo` | `demo`, `categoria`, `etiquetas`, `busca` | **sim** | `tests/e2e/estado-na-url.spec.ts` |
| `/inicio` | `classificacao`, `modalidade` | História 4 | `tests/e2e/inicio.spec.ts` |
| as nove demais do documento 25 §1.3 | — | não | entram com as suas telas, Épicos 5 a 9 |

⚠️ **A VITRINE ENTROU NO CONTRATO PORQUE JÁ O VIOLAVA.** Medido em 11/09/2026: a amostra de estado na
URL da fatia (a) escrevia `?demo=` com um parâmetro que contrato nenhum declarava. **A primeira tela a
infringir o `FR-001` foi a nossa** — escrita antes de o requisito existir, e funcionando. É a prova de
que uma tela que inventa parâmetro não parece errada.

⚠️ **E ela é o único lugar onde os quatro tipos convivem**: escolha que empilha, escolha que
substitui, lista e texto com limite de frequência. As telas de verdade usam um ou dois tipos cada.

### A chave de negócio legível **não** foi exercitada aqui

O `FR-003` manda o parâmetro que identifica registro carregar a chave de negócio (`TUR-000012`), e
não o identificador técnico. **Nenhuma rota desta fatia tem parâmetro de identidade**: a tela inicial
recorta por classificação e modalidade, que são escolha; a vitrine não identifica nada.

⚠️ **A declaração existe para o requisito não passar por cumprido.** O primeiro exercício real é o
Épico 5, com a rota de instrutores, e o Épico 6, com turma e semana. O contrato o declara desde já; a
prova chega com a tela.

### Codificação de lista

Este sistema **escreve** separado por vírgula (`?etiquetas=x,y`) e **lê** as duas formas — vírgula e
chave repetida (`?etiquetas=x&etiquetas=y`).

⚠️ A tolerância na leitura é deliberada: com o `RF-NAV-01` a barra de endereço é entrada de usuário, e
quem cola um link montado por outra ferramenta não sabe qual forma este sistema escolheu. Recusar a
forma alheia devolveria uma lista vazia **em silêncio**.

### O que o intervalo ainda não é

O contrato tem quatro tipos, e **nenhum é intervalo**. O filtro avançado oferece o campo desde a fatia
(b), e a amostra ligada à URL o deixa de fora de propósito: o primeiro intervalo de verdade é a janela
de semana do Épico 6, e escolher a forma antes de existir o caso é escolher errado com antecedência.

### Nome do gancho

O gancho se chama **`useParametro`**, com o prefixo em inglês — **exigência do motor, não tradução**,
da mesma classe que o `snake_case` dos identificadores de banco. O React reconhece gancho pelo nome, e
a regra de lint que impede um gancho de ser chamado dentro de condição **deixa de valer** para
qualquer outro nome. O documento 25 §1.4 e §1.5 já escreviam `useParametrosDsa` desde a Fase 2; o nome
do **arquivo** continua em português.
