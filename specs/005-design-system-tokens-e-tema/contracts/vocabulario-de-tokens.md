# Contrato — o vocabulário: o que existe e como se chama

**Fase 1** · 09/09/2026 · fonte: documento 23 §1.3 e §1.4 · `FR-001` a `FR-003`, `FR-005`, `FR-013`

⚠️ **Este contrato não inventa nada.** A fonte normativa é o documento 23 §1.3, que traz os valores.
Aqui fica a **lista fechada de nomes** e a **lista de pares auditados** — que é o que a verificação
percorre. Valor mora lá; nome e obrigação moram aqui.

## Família 1 — estáticos: iguais nos dois temas

| Grupo | Nomes | Observação |
|---|---|---|
| Rampa institucional | `ciaara-azul-50` a `ciaara-azul-900`, mais o alias `ciaara-azul` | A âncora é o grau 600. **Não alterar sem decisão formal** |
| Tinta e acento | `ciaara-ink`, `ciaara-ouro` | O ouro é de uso pontual |
| Neutros frios | `neutro-50` a `neutro-950` | Frios de propósito: convivem com o azul sem sujar |
| Tipografia | `font-sans`, `font-mono` | A `sans` consome a tipografia auto-hospedada |
| Escala de texto | `2xs`, `xs`, `sm`, `base`, `lg`, `xl`, `2xl`, `kpi` | ⚠️ Começa **menor** que a escala web típica, de propósito (`FR-005`) |
| Espaçamento e alturas | base de espaçamento, três alturas de linha, altura de célula e largura de coluna da grade | Densidade vive em múltiplos pequenos |
| Raio e sombra | três raios, três degraus de sombra | Documento institucional, não aplicativo de consumo |

## Família 2 — papéis: mudam com o tema

**Superfície e texto**: `fundo`, `superficie`, `superficie-2`, `texto`, `texto-suave`, `texto-tenue`,
`borda`, `borda-forte`, `marca`, `marca-contraste`, `marca-suave`, `foco`.

⚠️ **`texto-tenue` nunca carrega dado.** É para dica e texto de espera. Um dado exibido nele fica no
limite do legível, e o limite não é lugar de informação.

**Status** — nove trios de `fundo`, `tinta` e `borda`: `planejado`, `executado`, `adiantado`,
`atrasado`, `conflito`, `conformidade`, `nao-letivo`, `reserva`, `inativo`.

**Séries de gráfico**: `serie-1` a `serie-8`. Ordem fixa, luminâncias distintas — precisam
sobreviver ao preto-e-branco da impressão. Consumidas a partir da fatia (b).

## Os pares — auditados, isentos e pendentes

**Emendado em 09/09/2026 por decisão de Bernardo, depois da primeira medição.** A versão anterior
auditava 26 pares com um limite só para toda borda, e **22 asserções reprovaram** medindo de 1,25 a
1,88. A causa era a regra, não a paleta.

### Auditados — reprovam a entrega

| # | Par | Limite |
|---|---|---|
| A-1 | `texto` sobre `superficie` | 4,5:1 |
| A-2 | `texto` sobre `fundo` | 4,5:1 |
| A-3 | `texto-suave` sobre `superficie` | 4,5:1 |
| A-4 | `texto-tenue` sobre `superficie` | 4,5:1 |
| A-5 | `marca-contraste` sobre `marca` | 4,5:1 |
| A-6 a A-14 | `<status>-tinta` sobre `<status>-fundo`, para os nove | 4,5:1 |
| C-1 | `foco` sobre `fundo` | 3:1 |

| D-1 a D-8 | `serie-1` a `serie-8` sobre `fundo` | 3:1 |

**23 pares, medidos nos dois temas — 46 asserções.**

⚠️ **As oito séries entraram em 10/09/2026, no saneamento normativo, e não são requisito novo**: o
documento 23 §8.1 sempre exigiu 3:1 de **elemento gráfico**, e a spec havia perdido a regra. Elas
estavam declaradas no ponto único, apareciam na vitrine, e **nenhum par as auditava**. São medidas
contra `--fundo`, que é o par mais apertado e onde o gráfico se desenha. ⚠️ A `serie-3` no tema
claro mede **3,03**: passa por três centésimos, o que já diz que não há folga aí.

⚠️ **O limite depende do que o par é.** Texto normal, 4,5:1. Texto grande — a partir de 24px, ou
18,7px em negrito — 3:1. Elemento gráfico e borda interativa, 3:1. É o documento 23 §8.1, e a spec
o havia perdido em parte até 10/09/2026.

⚠️ **A razão é arredondada a uma casa decimal antes da comparação.** `--texto-tenue` mede **4,49** e
passa. Meio centésimo não é diferença que olho algum distinga, e limite que reprova por isso vira
ruído — que é como limite acaba desligado.

### Isentos — e o motivo, que é o que separa isenção de limite afrouxado

| # | Par | Por que é isento |
|---|---|---|
| B-1 | `borda` sobre `superficie` | **Divisória estrutural.** É o traço universal da camada base, usado em linha de grade e separador. Não identifica controle nem porta informação |
| B-3 a B-11 | `<status>-borda` sobre `<status>-fundo` | **Contorno decorativo de etiqueta.** O significado do status vem do **texto**, que o `FR-014` exige junto, e da tinta, que é auditada em A-6 a A-14. A borda reforça; não informa sozinha |

⚠️ **Uma borda a 3:1 contra o próprio preenchimento seria um traço quase preto.** Numa tabela de
300 linhas isso piora a legibilidade em nome dela. A norma cobre o traço que **identifica** um
controle, não toda linha desenhada na tela.

### Pendente — nem auditado nem isento, e é de propósito

| # | Par | Medido | Situação |
|---|---|---|---|
| B-2 | `borda-forte` sobre `superficie` | **1,62 claro · 1,88 noturno** | ⚠️ **Não é decorativa.** É o limite de campo, e o `FR-011` cobra 3:1 de borda interativa. Mas **não há campo nesta fatia** — formulário é das fatias (b) e (c) —, e a decisão de 09/09/2026 proíbe alterar `--borda-forte` |

⚠️ **Ela fica listada como pendente em vez de virar isenta, e a distinção é o ponto.** Chamá-la de
decorativa seria mentira: ela é exatamente o traço que identifica um campo de formulário quando o
preenchimento do campo quase não contrasta com a página — medido, `--superficie` sobre `--fundo` dá
**1,20**. A fatia que construir o primeiro campo **precisa** resolver isto, e vai encontrar a
medição aqui em vez de redescobri-la.

⚠️ **E o documento 23 anota `3,1:1` para `--borda-forte`.** A anotação não confere com a cor que
ela anota. É o segundo caso, junto com o `4,6` de `--texto-tenue`, que mede 4,49.

## Regra de nomeação

1. Status chama-se pelo **domínio**, nunca pela cor nem por rótulo genérico. `executado`, não
   `verde`, não `success`.
2. Papel chama-se pela **função**, nunca pelo valor. `superficie`, não `branco`.
3. Todo token de papel existe **nos dois temas**. Faltar num deles é defeito, não omissão.
4. Token novo entra **junto com o par auditado** e **junto com a amostra na vitrine**. As três
   coisas ou nenhuma — é o que impede token nascido morto.
