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

## Os pares auditados — a lista que a verificação percorre

| # | Par | Limite |
|---|---|---|
| A-1 | `texto` sobre `superficie` | 4,5:1 |
| A-2 | `texto` sobre `fundo` | 4,5:1 |
| A-3 | `texto-suave` sobre `superficie` | 4,5:1 |
| A-4 | `texto-tenue` sobre `superficie` | 4,5:1 |
| A-5 | `marca-contraste` sobre `marca` | 4,5:1 |
| A-6 a A-14 | `<status>-tinta` sobre `<status>-fundo`, para os nove | 4,5:1 |
| B-1 | `borda` sobre `superficie` | 3:1 |
| B-2 | `borda-forte` sobre `superficie` | 3:1 |
| B-3 a B-11 | `<status>-borda` sobre `<status>-fundo`, para os nove | 3:1 |
| C-1 | `foco` sobre `fundo` | 3:1 |

**Total: 25 pares, medidos nos dois temas — 50 asserções.**

⚠️ **A verificação lê esta lista, não o arquivo de estilo.** Se lesse o estilo, um par novo entraria
sem ser auditado. Um teste separado garante que os dois não divergem: todo token de papel do arquivo
existe aqui, e vice-versa.

## Regra de nomeação

1. Status chama-se pelo **domínio**, nunca pela cor nem por rótulo genérico. `executado`, não
   `verde`, não `success`.
2. Papel chama-se pela **função**, nunca pelo valor. `superficie`, não `branco`.
3. Todo token de papel existe **nos dois temas**. Faltar num deles é defeito, não omissão.
4. Token novo entra **junto com o par auditado** e **junto com a amostra na vitrine**. As três
   coisas ou nenhuma — é o que impede token nascido morto.
