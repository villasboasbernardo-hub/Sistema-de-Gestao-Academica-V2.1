# Contrato — os parâmetros de URL das telas de instrutor

**Fase 1** · 11/09/2026 · estende [`lib/navegacao/contrato.ts`](../../../lib/navegacao/contrato.ts) ·
guia obrigatório: [`docs/guias/estado-na-url.md`](../../../docs/guias/estado-na-url.md)

> ⚠️ **Este contrato é EXIGÍVEL, não descritivo.** Parâmetro fora dele **não compila** — foi o que a
> fatia (c) do Épico 4 provou por defeito deliberado. Acrescentar rota aqui e esquecer o
> `contrato.ts` faz a tela não compilar, que é o comportamento desejado.

---

## As duas rotas

| Rota | `RF-` de origem | Tela |
|---|---|---|
| `/instrutores` | `RF-INSTR-01`, `RF-NAV-01` | listagem, filtros, indicadores e gráficos |
| `/instrutores/[codigo]` | `RF-INSTR-10` | ficha individual |
| `/instrutores/novo` | `RF-INSTR-02` | cadastro de instrutor novo |

**Rota acrescentada em 15/09/2026** (achado D-6, T021): `/instrutores/novo` não constava da Fase 1. Criar instrutor não cabe em `/instrutores/[codigo]`, que pressupõe um código existente. Sem parâmetro de consulta: o rascunho de formulário fica fora da URL (`CHK036`, decisão pendente, e toca PII). O título desta seção continua dizendo "duas rotas" como registro do que a Fase 1 previa.

⚠️ **`/instrutores` já está no menu desde a fatia (c) do Épico 4, marcada *"em breve"*.** Entregar a
tela **exige virar a bandeira** `disponivel` em `lib/navegacao/menu.ts` no **mesmo passo** — o teste
do shell confere os dois sentidos e reprova se a tela nascer com o menu ainda dizendo "em breve".

---

## `/instrutores` — os parâmetros

| Nome | Tipo | Padrão | Histórico | Avisa servidor | Origem |
|---|---|---|---|---|---|
| `busca` | texto | `""` | substitui | **sim** | `RF-INSTR-01` |
| `om` | escolha | `""` | substitui | **sim** | `FR-025` |
| `categoria` | escolha | `""` | substitui | **sim** | `FR-025` |
| `capacitacao` | escolha | `""` | substitui | **sim** | `FR-025` |
| `regime` | escolha | `""` | substitui | **sim** | `FR-025` |
| `escolaridade` | escolha | `""` | substitui | **sim** | `FR-025` |
| `situacao` | escolha | `ativo` | substitui | **sim** | `FR-009` |
| `ordem` | escolha | `""` | substitui | não | `FR-012` da spec 008 |

**Tipo corrigido na implementação, em 15/09/2026** (T020): `om`, `categoria`, `capacitacao` e `escolaridade` são **texto** em `lib/navegacao/contrato.ts`, e não escolha. O tipo escolha exige lista fechada de opções escrita no contrato, e o domínio desses quatro é o **dado** — as OMs cadastradas, as capacitações escritas. Uma lista fixa degradaria para "todas", em silêncio, o link que filtrasse por uma OM nova. `regime` e `situacao` têm domínio fechado no banco (`regime_trabalho_docente`, `status_registro`) e continuam escolha, lidos de `Constants`. `ordem` é escolha com um valor por sentido — `nome`, `nome_desc` — e não uma gramática com separador.

⚠️ **Divergência com o documento 25 §1.3, anotada e não corrigida.** Aquela tabela declara para `/instrutores` os parâmetros `curso`, `posto`, `circulo`, `categoria`, `om`, `capacitacao`, `status` e `busca`, todos como texto, citando a spec 015. Este contrato, e o código, seguem o `FR-025` da spec 006; emendar o documento 25 é decisão à parte.

### As decisões que o formato esconde

**`busca` leva o limite de frequência de 300 ms** (`LIMITE_DE_FREQUENCIA_MS`). Oito teclas produzem
**uma** entrada de histórico — provado na fatia (c), e o caso reprova sem o limite.

⚠️ **Todo filtro é `substitui`, e isso é escolha, não descuido.** Três cliques de refino não são três
passos de navegação. Quem puser `empilha` num filtro faz o botão voltar desfazer letra por letra.

⚠️ **`avisaServidor` ligado em tudo que filtra.** É o campo cujo erro é silencioso: desligado, a URL
fica certa, o link compartilhado abre, e **o número na tela fica velho**. O `FR-004.1` existe por
isso, e o teste que só confere a URL passa com ele desligado.

⚠️ **`situacao` tem padrão `ativo`, e é o único parâmetro desta fatia com padrão não vazio.** A
listagem abre mostrando quem está ativo, porque é o que a v2.0 fazia. Como o padrão **some da URL**
(`FR-002` da spec 008), `/instrutores` limpo já significa "ativos" — e ver os inativos exige
`?situacao=inativo`, que é link compartilhável.

⚠️ **`ordem` NÃO avisa o servidor**, e é o único assim. A ordenação canônica é a antiguidade
(`RN-ANT-01`), servida pelo banco; `ordem` só reordena o que já chegou, pela propriedade controlada
que a `TabelaDensa` ganhou na fatia (c). **Ela nunca pode produzir uma lista que não comece pela
antiguidade** — ver a recusa declarada abaixo.

---

## `/instrutores/[codigo]` — a ficha

**Nenhum parâmetro de consulta.** A identidade vive no **caminho**, e é `codigo`, não `id`.

⚠️ **É o primeiro exercício da chave de negócio legível deste projeto.** A fatia (c) do Épico 4
declarou, no `FR-003`, que nenhuma rota dela tinha parâmetro de identidade e que o primeiro seria o
Épico 5 — este é ele. O `codigo` é o `ID_*` da v2.0 guardado verbatim, e é o que a pessoa reconhece.

⚠️ **`id` uuid nunca aparece na URL nem na tela** (`FR-027.3`).

⚠️ **Código inexistente ou fora de escopo distingue *"não há"* de *"você não vê"*** (`FR-027.4`,
`RN-DEG-01`). São respostas diferentes e a tela precisa dizer qual é.

---

## O que **NÃO** entra na URL — recusas declaradas

| Item | Por quê |
|---|---|
| **Paginação** | `FR-037.1` da spec 008 — recusa declarada, contada por teste. A fatia (b) mediu que a tabela renderiza todas as linhas, e 177 não é volume |
| **Aba aberta da ficha** | estado efêmero de interface (documento 25 §3) |
| **Rascunho de formulário** | `CHK036`, decisão pendente de Bernardo, e toca PII |
| **Linha selecionada da tabela** | efêmero |
| **Qualquer valor de PII** | ⚠️ **CPF na barra de endereço vaza por histórico, por log de servidor e por ombro.** Nenhum filtro desta fatia aceita identificação civil |

⚠️ **A última linha é a que precisa estar escrita.** Filtrar por CPF é pedido plausível e a recusa
não é óbvia — sem ela declarada aqui, alguém a implementa achando que está ajudando.

---

## Ordenação — o ponto onde este contrato encosta na `RN-ANT-01`

`ordem` reordena **visualmente** o que o servidor já entregou em antiguidade. As duas convivem
porque respondem a perguntas diferentes: o banco decide a ordem **canônica**, e a coluna clicada
decide a **apresentação**.

⚠️ **E é aqui que o `SC-001` pode ser quebrado sem ninguém ver.** Uma implementação que troque a
consulta por `order by nome` quando `ordem=nome` chegar **deixa de cumprir a `RN-ANT-01`**, que é
*Risco: Alto* e transversal. A ordenação de origem é sempre a antiguidade; `ordem` é camada por
cima, nunca substituição.

**Portão**: teste que, com `?ordem=nome`, confere que a consulta ao banco **continua** pedindo
antiguidade — não que a tela parece certa.
