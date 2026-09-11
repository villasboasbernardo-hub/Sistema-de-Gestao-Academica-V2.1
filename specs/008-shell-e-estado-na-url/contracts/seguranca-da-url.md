# Contrato — a URL como entrada não confiável

**Fase 1** · 11/09/2026 · fonte: [research §R-4 e §R-5](../research.md) · `FR-041` a `FR-043`,
`SC-017` a `SC-019`

## Por que isto existe

⚠️ **Foi a lacuna que a spec tinha, e ela era estrutural.** A spec validava parâmetro inválido e
parâmetro fora do contrato — os dois casos de **acidente** — e em nenhum lugar tratava a barra de
endereço como algo que alguém edita **de propósito**. Isso apesar de o `RF-NAV-01` ser exatamente o
requisito que a transforma em entrada de usuário.

⚠️ **Quem cola um link não é sempre quem o escreveu.** É a frase que separa esta seção de um caso de
fronteira.

## O achado: já existe um redirecionamento aberto na `main`

**Medido em 11/09/2026, lendo o código mesclado do Épico 3.**

A ida está correta: o proxy guarda caminho **e** consulta em `?destino=`. É a volta que falha. A
guarda é:

```
destino.startsWith("/")
```

⚠️ **Isso não é proteção de redirecionamento aberto.** Um endereço começando com **duas** barras é
*relativo ao protocolo*: o navegador o resolve para outro host, mantendo só o esquema. Ele começa com
`/`, logo passa. Variantes com contrabarra são a mesma família.

**Consequência:** um link hospedado no domínio do sistema, que a pessoa confere e reconhece como
sendo do sistema, pode terminar em outro lugar depois do login — que é precisamente a forma que
funciona.

## A regra: permissão por origem, não negação por padrão

| Abordagem | Veredito |
|---|---|
| Procurar padrões proibidos na cadeia (`//`, `\\`, `http`) | ❌ **rejeitada** — é lista de negação, e lista de negação erra pelo caso que ninguém pensou. Foi assim que a guarda atual nasceu |
| Resolver o destino contra a origem da própria aplicação e **exigir** que o host resulte o mesmo | ✅ **escolhida** — o que não é da origem é recusado, sem precisar imaginar a forma do ataque |

⚠️ **A diferença prática:** a primeira abordagem pergunta *"isto parece perigoso?"*; a segunda
pergunta *"isto é meu?"*. Só a segunda tem resposta certa para o caso que ninguém previu.

**Recusa devolve o padrão**, e devolve **declarando** que recusou — `DestinoDeRetorno` é união
discriminada justamente para que quem chama não possa ignorar (data-model §5).

## Onde cada coisa é validada

| Entrada | Validada onde | Falha como |
|---|---|---|
| Parâmetro do contrato | na leitura, por esquema, **antes** de consulta, renderização ou navegação | degrada para o padrão |
| Destino de retorno | na leitura do `?destino=`, por origem | **recusa**, e usa o padrão |
| Escopo do dado pedido | **no banco**, pela RLS | nega a linha |

⚠️ **A terceira linha é a que não se negocia** (Princípio XI). A validação de parâmetro **reduz
superfície; não substitui a fronteira**. Um parâmetro perfeitamente válido apontando para um curso
fora do escopo continua sendo negado pelo banco — e é isso que faz o `RF-NAV-04` (c) poder prometer
que o link compartilhado não vaza informação.

## O que o teste precisa medir — e o que ele não deve medir

⚠️ **O risco principal NÃO é marcação refletida.** A camada de renderização escapa texto por padrão,
então um teste que procure marcação devolvida na tela passa sem provar nada, e daria a sensação de
cobertura.

**Os três que importam:**

| # | O que se mede | Carga |
|---|---|---|
| 1 | a navegação **sai do domínio** depois do login? | destino relativo ao protocolo, com contrabarra, e absoluto |
| 2 | o valor chega a um filtro de consulta montado por concatenação? | valores com aspas, ponto e vírgula, e operadores da API de dados |
| 3 | o valor chega a uma interpolação de marcação? | marcação com atributo de evento e com esquema de script |

⚠️ **O primeiro mede COMPORTAMENTO, não a guarda.** Uma asserção sobre a condição — *"a função
recusa `//exemplo`"* — passaria hoje se alguém escrevesse a condição errada de outro jeito. O que se
afere é onde o navegador **parou**.

⚠️ **O segundo existe porque a fronteira do banco é filtro, não consulta escrita à mão.** O cliente
de dados monta filtros a partir de cadeia; um parâmetro concatenado ali é injeção de filtro, ainda
que não seja injeção de consulta no sentido clássico.

## Resumo em uma linha

**Cinco caminhos degradam, um recusa.** Degradar trata acidente — link velho, parâmetro truncado,
dado que ainda não existe. Recusar trata intenção. Confundir os dois produz ou uma tela que quebra
com favorito antigo, ou uma porta aberta.
