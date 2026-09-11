# Plano de implementação: Épico 4, fatia (b) — Componentes CIAARA

**Branch**: `feat/EPICO-4b-componentes-ciaara` | **Data**: 10/09/2026 | **Spec**: [spec.md](./spec.md)

**Entrada**: [spec.md](./spec.md) · 32 requisitos, 11 critérios, 8 esclarecimentos integrados.

## Summary

Construir o **vocabulário de componentes** do CIAARA: treze componentes de domínio genéricos, os
primitivos que eles exigem, e os gráficos — todos tipados, sem regra de negócio, sem acesso a banco,
e todos visíveis na vitrine `/estilo` que a fatia (a) deixou pronta.

Uma medição decide a forma do plano inteiro: **o pacote `radix-ui` já instalado exporta sete dos
primitivos de que esta fatia precisa** — `Select`, `Popover`, `Tooltip`, `Dialog`, `AlertDialog`,
`Collapsible` e `Label`. O que resta são componentes de folha de estilo pura (`Input`, `Skeleton`,
`Alert`), que não têm primitivo nenhum por baixo. **Nenhum pacote novo de componente entra**, e a
única exceção discutível — o menu de comando por trás de um seletor com busca — foi **evitada por
construção**, não por sorte. Está em [research.md §R-3](./research.md).

Então o esforço não está em instalar: está em **três lugares onde componente genérico costuma
nascer torto**.

1. **O seletor de instrutor**, que é a única peça desta fatia com uma regra `RN-` de *Risco: Alto*
   atrás — e a fronteira é fina: ele **aplica** a ordenação sem **calcular** nada.
2. **A navegação por teclado da tabela densa**, que é *roving tabindex* e não se improvisa.
3. **A legibilidade dos gráficos sem cor**, que a fatia de tokens não entregou e que esta precisa
   resolver por forma e rótulo.

## Technical Context

**Linguagem/Versão**: TypeScript `strict` com `exactOptionalPropertyTypes` · React 19.2.8 ·
Next.js 16.3.3, App Router

**Dependências principais**: `radix-ui` 1.6.7 **já instalado**, que cobre sete primitivos ·
`class-variance-authority` e `cn`, já instalados · **`recharts`** (a instalar — é a decidida no
BRIEF §1) · **`lucide-react`** (a instalar — `components.json` já declara `"iconLibrary": "lucide"`,
e a decisão de 10/09/2026 fecha a pendência §11.2 do documento 23)

**Armazenamento**: nenhum. **Esta fatia não toca banco, migration, RLS nem dado.** É a razão de ela
poder ser verificada inteira sem subir contêiner.

**Testes**: Vitest para as funções puras de domínio e para os portões · Playwright para teclado,
foco, região anunciada e vitrine · ESLint para a regra de cor e as fronteiras

**Plataforma alvo**: navegador moderno, dois temas, mais o papel branco da impressão futura

**Tipo de projeto**: aplicação web com renderização no servidor

**Metas de desempenho**: nenhuma numérica. A base é pequena — 177 instrutores, 29 turmas — e a
decisão de 10/09/2026 no `FR-006.1` é explícita: a tabela **renderiza todas as linhas**

**Restrições**: nenhuma cor fora do ponto único · `"use client"` **só em folha**, e só onde há
interação · nenhuma biblioteca de componentes além da decidida · componente não acessa banco e não
implementa `RN-`

**Escala/Escopo**: 13 componentes CIAARA · 10 primitivos · 3 componentes de gráfico genéricos ·
2 funções puras de domínio · 12 itens de checklist fechados · 1 vitrine estendida

## Constitution Check

*PORTÃO: passa antes da Fase 0 e é reavaliado depois da Fase 1.*

| Princípio | Situação | Como esta fatia se comporta |
|---|---|---|
| **I · Fidelidade à Fase 1** | ✅ | Cada componente cita o `RF-` do documento 23 §3.1. O `NomeInstrutor` cita `RF-INSTR-15` e `RF-DS-05` — e é onde o portão **pegou um erro meu**, no achado P-1 |
| **II · Preservação de regras de negócio** | ⚠️ **atenção, e é o eixo da fatia** | `RN-ANT-01` é *Risco: Alto* e a única regra que encosta aqui. A fronteira: a função pura **calcula**, o componente **aplica**. O `FR-020` proíbe o componente de implementar regra; o `FR-011.1` o obriga a aplicar esta. Não são contraditórios, e a diferença está escrita no contrato de componentes |
| **III · Restrição de plataforma** | ✅ | shadcn sobre Radix, Tailwind v4, Recharts — os três decididos. **Nenhum pacote de componente novo**, medido em [research.md §R-2](./research.md) |
| **IV · Integridade do histórico** | ✅ **não se aplica** | Nada é apagado, nada é migrado, nenhuma linha de log é escrita |
| **V · Degradação segura** | ⚠️ **atenção** | Quatro caminhos: lista vazia distingue *"não há"* de *"você não vê"*; valor fora do domínio vai para a faixa "Outros" e **nunca some**; instrutor sem nome de guerra degrada sem espaço duplo; gráfico sem dado mostra estado vazio |
| **VI · Mudança cirúrgica validada por invariante** | ✅ | Cinco invariantes contáveis: zero cor fora do ponto único · zero variável de primitivo sem par · **exatamente um** construtor de seletor de instrutor · zero componente importando banco ou regra `RN-` · 100% dos componentes na vitrine |
| **VII · Configuração sobre constante** | ✅ | A escala P/G → peso vem de `config_listas` como argumento, **nunca** de constante dentro do componente (`RN-ANT-02`) |
| **VIII · Rastreabilidade** | ✅ | Todo componente aponta para a linha do inventário §3.1 que o originou, e toda função pura traz o `RN-` e a citação literal no topo |
| **IX · Contenção de escopo** | ✅ **e custou três recusas** | As três grades saíram para os Épicos 6 e 7; o shell e o estado na URL ficaram na fatia (c); `FormularioCiaara` e `DialogoCrud` **não entram**, porque exigiriam pacote de formulário sem consumidor nesta fatia |
| **X · Paridade antes de novidade** | ✅ | Todo componente tem origem nomeada na v2.0, exceto `BadgeTeto`, que o próprio documento 23 marca como *inexistente (texto solto)* — e teto normativo já era regra da v2.0, só não tinha forma |
| **XI · O banco é a fronteira** | ✅ **por ausência, e é verificado** | Nenhum componente desta fatia fala com o banco. O `SC-007` conta isso e exige **zero** |

**Veredito: passa.** As duas atenções — a fronteira do `RN-ANT-01` e os quatro caminhos de
degradação — estão desenhadas nos contratos da Fase 1, não deixadas para a implementação decidir.

## Project Structure

### Documentação (esta fatia)

```text
specs/007-componentes-ciaara/
├── plan.md              # este arquivo
├── research.md          # Fase 0 — as decisões, medidas
├── data-model.md        # Fase 1 — os tipos do vocabulário (não há entidade de dado)
├── quickstart.md        # Fase 1 — como validar
├── contracts/
│   ├── componentes.md   # o contrato de cada componente: o que recebe, o que não faz
│   ├── teclado.md       # roving tabindex e a tabela de teclas do documento 23 §8.3
│   └── graficos.md      # séries, forma, rótulo e a alternativa em tabela
├── checklists/
│   └── requirements.md  # 16/16, da fase de especificação
└── tasks.md             # Fase 2 — NÃO criado por /speckit-plan
```

### Código (raiz do repositório)

```text
components/
├── ui/                       # primitivos copiados do shadcn — 4 existem, 10 entram
│   ├── badge.tsx  button.tsx  card.tsx  table.tsx        # ✅ fatia (a)
│   ├── alert.tsx  alert-dialog.tsx  collapsible.tsx      # ⬜ entram aqui
│   ├── dialog.tsx  input.tsx  label.tsx  popover.tsx
│   └── select.tsx  skeleton.tsx  tooltip.tsx
├── ciaara/                   # os treze — vocabulário do domínio, sem regra de negócio
│   ├── EstadoVazio.tsx  provedor-de-tema.tsx  seletor-tema.tsx  SePodeVer.tsx   # ✅ existem
│   ├── alerta-conformidade.tsx  badge-status.tsx  badge-teto.tsx
│   ├── campo-obrigatorio.tsx  card-kpi.tsx  dialogo-confirmacao.tsx
│   ├── esqueleto-tabela.tsx  filtro-avancado.tsx  nome-instrutor.tsx
│   ├── seletor-instrutor.tsx  seletor-turma.tsx  tabela-densa.tsx
│   └── lista-navegavel.tsx   # o roving tabindex, compartilhado por tabela e seletor com busca
└── graficos/                 # sempre "use client" — três genéricos, não sete instâncias
    ├── grafico-barras.tsx  grafico-linha.tsx  grafico-pizza.tsx

lib/dominio/                  # hoje VAZIO — esta fatia é quem o inaugura
├── antiguidade.ts            # RN-ANT-01 e RN-ANT-02, com a citação literal no topo
└── nome-instrutor.ts         # RF-INSTR-15 — porte do algoritmo da spec 020 da v2.0

app/estilo/page.tsx           # a vitrine cresce: cada componente ganha amostra

tests/
├── unidade/                  # funções puras, portões e o de-para da reconciliação
└── e2e/                      # teclado, foco, região anunciada, vitrine
```

**Decisão de estrutura**: nenhum diretório novo. `components/ui/`, `components/ciaara/` e
`components/graficos/` são os três endereços que o documento 24 já fixa, e `lib/dominio/` existe
vazio desde o Épico 0 **à espera da primeira função pura** — que nasce aqui.

## O que a fatia constrói

### Primitivos — a maioria já está no pacote instalado

| Primitivo | Vem de | Quem o exige |
|---|---|---|
| `Select` · `Popover` · `Tooltip` | `radix-ui`, **já instalado** | seletores, `BadgeTeto`, `FiltroAvancado` |
| `Dialog` · `AlertDialog` · `Collapsible` · `Label` | `radix-ui`, **já instalado** | `DialogoConfirmacao`, `FiltroAvancado`, `CampoObrigatorio` |
| `Alert` · `Input` · `Skeleton` | **folha de estilo pura** — não têm primitivo por baixo | `AlertaConformidade`, `FiltroAvancado`, `EsqueletoTabela` |

⚠️ **Cada primitivo novo obriga a reconciliação a crescer** (`FR-002`). O teste de de-para da fatia
(a) continua exigindo **zero variável órfã**, e é ele que impede o primitivo de trazer o próprio
vocabulário de cor para dentro.

### Os treze componentes, e o que é difícil em cada um

| Componente | Base | `"use client"` | O que é difícil nele |
|---|---|---|---|
| `CardKpi` | `Card` | não | nada. É o mais simples, e é de propósito |
| `BadgeStatus` | `Badge` + `cva` | não | os nove tons sem que a cor seja a única codificação |
| `BadgeTeto` | `Badge` + `Tooltip` | **sim** | dizer o teto **sem bloquear** — é a regra 6 do contrato |
| `TabelaDensa` | `Table` | **sim** | *roving tabindex*, e é o item de maior risco da fatia |
| `FiltroAvancado` | `Select` + `Popover` + `Input` + `Collapsible` | **sim** | filtragem cruzada **sem conhecer instrutor** |
| `AlertaConformidade` | `Alert` + região anunciada | não | *"sempre visível"* precisa de definição operacional — achado P-3 |
| `SeletorTurma` | `Select` | **sim** | 29 turmas: não precisa de busca |
| `SeletorInstrutor` | `Popover` + lista navegável | **sim** | 177 instrutores: precisa de busca, e **ordena sempre** |
| `NomeInstrutor` | texto | não | o algoritmo de nome de guerra, portado com os casos de teste |
| `EstadoVazio` | existe | não | distinguir *"não há"* de *"você não vê"* |
| `DialogoConfirmacao` | `AlertDialog` | **sim** | nada é apagado neste sistema — achado P-4 |
| `CampoObrigatorio` | `Label` | não | o traço do campo a `--texto-tenue`, decisão de 10/09 |
| `EsqueletoTabela` | `Skeleton` | não | respeitar movimento reduzido |

### Gráficos — três componentes genéricos, não sete

O documento 23 §3.1 inventaria **`GraficoBarras`, `GraficoPizza` e `GraficoLinha`**. A spec 006
nomeia **sete gráficos**, que são **instâncias**, não tipos. Construir sete seria construir a tela
do Épico 5 aqui dentro — exatamente o que a decisão de 10/09/2026 recusou para as três grades.

A cobertura está provada em [contracts/graficos.md](./contracts/graficos.md): os sete da spec 006
saem de **dois** dos três componentes, por propriedade.

## Ordem de implementação

De dentro para fora, como o documento 24 exige — e a ordem não é cerimônia, é o que permite testar
regra sem navegador.

1. **`lib/dominio/`** — as duas funções puras e seus testes. É a primeira vez que o diretório é
   usado, e a regra ESLint que o isola já existe desde o Épico 0.
2. **Primitivos** — os dez, com a reconciliação crescendo junto. O teste de de-para reprova se um
   deles trouxer variável sem par.
3. **`lista-navegavel.tsx`** — o *roving tabindex* isolado, com seus testes, **antes** dos dois
   componentes que dependem dele. Fazê-lo depois significaria implementá-lo duas vezes.
4. **Os treze componentes**, em três levas: os sem estado primeiro, os com interação depois, os dois
   seletores por último, porque dependem dos passos 1 e 3.
5. **Gráficos** — depois de a biblioteca entrar, e com a legibilidade sem cor desde a primeira linha.
6. **Vitrine** — cada componente ganha amostra. O `FR-027` a torna a documentação viva, e o teste da
   vitrine estende-se de token para componente.

## Complexity Tracking

| Violação | Por que é necessária | Alternativa simples rejeitada porque |
|---|---|---|
| `lista-navegavel.tsx`, um componente que **não** está no inventário do documento 23 §3.1 | `TabelaDensa` e `SeletorInstrutor` precisam do mesmo *roving tabindex*, que é a peça mais fácil de errar da fatia | Implementar em cada um faria **duas** navegações por teclado divergirem — o mesmo defeito que a fatia inteira veio fechar, só que em teclado em vez de cor |

## Reavaliação do portão, depois da Fase 1

O desenho não abriu violação nova, e fechou as duas atenções:

| Atenção de antes | Onde ficou resolvida |
|---|---|
| **II · a fronteira do `RN-ANT-01`** | [research.md §R-4](./research.md) separa quem **sabe o critério** de quem **aplica**, e [contracts/componentes.md](./contracts/componentes.md) escreve a proibição no contrato do seletor. A escala P/G chega como argumento, nunca como constante |
| **V · os quatro caminhos de degradação** | Cada um tem endereço: lista vazia e gráfico sem dado no contrato de componentes, posto desconhecido em R-4, nome sem nome de guerra em R-8 |

⚠️ **Uma violação nova apareceu e foi absorvida**: `lista-navegavel.tsx` não está no inventário do
documento 23 §3.1. Está declarada no *Complexity Tracking*, com a alternativa nomeada.

✅ **O conflito que ficou aberto foi pego e fechado.** O `FR-012` contradizia o `RF-INSTR-15`
(achado P-1). A análise o classificou como crítico e Bernardo autorizou a correção em 10/09/2026 —
junto com o `CHK016`, que trazia o mesmo erro desde a fatia (a). **Nenhuma regra mudou**; a
transcrição é que estava errada.

## Achados do planejamento — listados, e três deles são erros meus

**P-1 · O formato do `NomeInstrutor` está errado na minha própria spec, e o documento normativo
está certo.** O `FR-012` escreve `P/G Especialidade Nome de Guerra`. O `RF-INSTR-15`, que é
**[PRESERVADO]**, escreve *"P/G Especialidade/Habilitação **Nome Completo**, com o nome ou nomes de
guerra **em negrito**"*. Não é a mesma coisa: a minha versão **descarta o nome completo**. A spec
006 concorda com o documento, no `FR-027.2`. ⚠️ **E o erro é mais antigo que esta spec**: o
`CHK016`, escrito na fatia (a), traz a mesma compressão errada e ainda a chama de *"vocabulário
intraduzível"*. ✅ **CORRIGIDO em 10/09/2026**, no `FR-012` e no `CHK016`. Foi transcrição, não mudança de
regra.

**P-2 · O algoritmo de nome de guerra é porte, não invenção.** Ele foi corrigido na spec 020 da
v2.0, versionada em `specs/heranca-v2.0/`, com o defeito nomeado: o destaque falhava em silêncio
quando as palavras do nome de guerra **não eram contíguas** no nome completo. Os casos de teste vêm
junto, inclusive o de palavra sem correspondência, que **não recebe destaque e não lança exceção**.

**P-3 · O `AlertaConformidade` não tem definição operacional de *"sempre visível"*.** É o `CHK008`,
e o checklist já dizia que *"a diferença muda o componente que a fatia (b) constrói"*. Sempre
visível durante a sessão, a tela ou a rolagem são três componentes diferentes. **Resolvido em
[research.md §R-5](./research.md)**, pela leitura mais barata que satisfaz o `RNF-USA-04`, com a
alternativa nomeada.

**P-4 · O `DialogoConfirmacao` guarda uma ação que este sistema não tem.** O `FR-013` fala em
*"ação destrutiva ou irreversível"*, e a regra 4 do contrato é que **nada é apagado** — exclusão é
lógica. Não é contradição: desativar um instrutor é reversível no banco e **consequente** na tela,
e o `RNF-USA-03` pede confirmação para consequência, não para perda. O componente fica; o que muda
é o texto, que é de quem chama.

**P-5 · CONTINUA ABERTO. O documento 23 §7 exige que todo gráfico tenha alternativa em tabela**, preservando o
`DYN-03` da v2.0 — *"é o que torna o dado acessível a leitor de tela"*. **Nenhum requisito da spec
007 cobre isso.** Não invento requisito no plano: fica registrado aqui, e o contrato de gráficos
prevê o encaixe. ⚠️ **A análise de 10/09/2026 não o listou entre os achados, e portanto ele não
entrou na rodada de correções.** Promovê-lo a `FR-` continua sendo decisão pendente.

**P-6 · O documento 23 §7 repete a afirmação que a medição de 10/09 derrubou** — a de que as oito
séries têm *"luminâncias distintas entre si"*. ⚠️ **Mas a tabela de regras do mesmo §7 já manda o
contrário do que o parágrafo supõe**: *"cor nunca é a única codificação — traço tracejado, marcador
distinto ou rótulo direto"*. A `FR-018` está do lado da tabela de regras. O parágrafo continua
errado, e emendá-lo é decisão à parte.
