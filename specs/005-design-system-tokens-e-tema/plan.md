# Plano de implementação: Épico 4, fatia (a) — Tokens, tema e configuração base

**Branch**: `feat/EPICO-4a-tokens-e-tema` | **Data**: 09/09/2026 | **Spec**: [spec.md](./spec.md)

**Entrada**: [spec.md](./spec.md) · 22 requisitos, 10 critérios, 3 esclarecimentos integrados.

## Summary

Instalar o vocabulário visual do CIAARA-11 num **ponto único**, com **dois temas**, e provar as três
coisas que o épico promete: que a mudança se propaga de um lugar só, que a escolha de tema persiste
sem piscar, e que todo par de cor passa em contraste AA nos dois temas.

A abordagem tem uma característica que decide o plano inteiro: **a paleta não é projetada aqui**. O
documento 23 §1.3 já a traz completa, com os dois temas, as razões de contraste anotadas par a par e
a âncora `#003366` marcada como não alterável sem decisão formal. Esta fatia **transcreve, liga e
verifica**. O trabalho de verdade não é escolher cor — é construir as três verificações que impedem
a cor de escapar depois, e é aí que o esforço se concentra.

## Technical Context

**Linguagem/Versão**: TypeScript `strict` · React 19.2.8 · Next.js 16.3.3, App Router

**Dependências principais**: Tailwind CSS v4 (`@theme` em CSS, não em JavaScript) · **`next-themes`**
(a instalar — não está no `package.json`) · shadcn/ui via CLI, com os componentes **copiados** para
`components/ui/` · `next/font/local` para a tipografia auto-hospedada

**Armazenamento**: nenhum. A escolha de tema vive no armazenamento local do navegador. **Esta fatia
não toca banco, migration, RLS nem dado.**

**Testes**: Vitest para as verificações de vocabulário e contraste · Playwright para o percurso de
tema e para a ausência de flash · ESLint para a regra de cor

**Plataforma alvo**: navegador moderno, tema claro e noturno, mais o papel branco da impressão futura

**Tipo de projeto**: aplicação web com renderização no servidor

**Metas de desempenho**: **nenhum quadro** com o tema errado antes da hidratação; tipografia
carregada **sem requisição a domínio externo**

**Restrições**: nenhum valor de cor fora do ponto único, nem literal nem da paleta padrão ·
`"use client"` só em folha · nenhuma biblioteca de componentes além da já decidida (BRIEF §1)

**Escala/Escopo**: ~60 tokens, 26 pares auditados, 2 temas, 1 rota de vitrine, 4 componentes base copiados,
**5 arquivos de dívida pagos**, 3 verificações novas

## Constitution Check

*PORTÃO: passa antes da Fase 0 e é reavaliado depois da Fase 1.*

| Princípio | Situação | Como esta fatia se comporta |
|---|---|---|
| **I · Fidelidade à Fase 1** | ✅ | Cada requisito cita `RF-DS`, `RF-NAV`, `RF-INI` ou `RNF-USA`. A paleta vem do documento 23, não de gosto |
| **II · Preservação de regras de negócio** | ✅ **não se aplica por conteúdo** | Nenhuma regra `RN-` é tocada. Não há regra de negócio numa cor |
| **III · Restrição de plataforma** | ✅ | Tailwind v4 e shadcn/Radix, que são os decididos. O `FR-019` proíbe qualquer outra biblioteca |
| **IV · Integridade do histórico** | ✅ **não se aplica** | Nada é apagado, nada é migrado |
| **V · Degradação segura** | ⚠️ **atenção** | Armazenamento local indisponível **não pode quebrar nem piscar**: cai para a preferência do sistema operacional, com aviso nenhum, porque não é falha do usuário. Está no caso de fronteira da spec |
| **VI · Mudança cirúrgica validada por invariante** | ✅ | As três verificações **são** as invariantes: zero cor fora do ponto único, zero par abaixo de AA, zero variável do shadcn sem par |
| **VII · Configuração sobre constante** | ✅ **é o coração da fatia** | O `RF-DS-01` é este princípio aplicado à cor. O token é a configuração; a cor literal é a constante que ele proíbe |
| **VIII · Rastreabilidade** | ✅ | Todo token tem origem no documento 23 §1.2, que mapeia o valor da v2.0 ao destino |
| **IX · Contenção de escopo** | ✅ | Marca institucional e cinco telas do Épico 3 foram **empurradas para a fatia (c)** por decisão de 09/09/2026, em vez de entrarem "já que estamos aqui" |
| **X · Paridade antes de novidade** | ⚠️ **uma divergência autorizada** | O `RF-DS-03` manda **reformular** o tema claro, não preservá-lo: o pastel da v1.0 tinha legibilidade ruim. É a **única** divergência visual autorizada, e está registrada na premissa 2 da spec |
| **XI · O banco é a fronteira** | ✅ **não se aplica** | Esta fatia não alcança o banco |

**Veredito do portão: passa.** As duas atenções estão declaradas na spec e nenhuma exige exceção.

## Project Structure

### Documentation (this feature)

```text
specs/005-design-system-tokens-e-tema/
├── spec.md                            # 22 FR, 10 SC, 3 esclarecimentos
├── plan.md                            # este arquivo
├── research.md                        # Fase 0 — as cinco decisões técnicas
├── data-model.md                      # Fase 1 — o vocabulário, que é o "modelo" desta fatia
├── quickstart.md                      # Fase 1 — como conferir que funcionou
├── contracts/
│   ├── vocabulario-de-tokens.md       # o que existe e como se chama
│   ├── verificacao-de-cor.md          # o que a regra proíbe, com precisão
│   └── reconciliacao-shadcn.md        # o de-para das variáveis de terceiro
└── checklists/
    └── requirements.md                # 16/16
```

### Source Code (repository root)

```text
app/
├── globals.css                        # ⭐ O PONTO ÚNICO. Toda a fatia converge aqui
├── layout.tsx                         # tipografia + provedor de tema. SEM "use client"
├── page.tsx                           # 🔧 dívida: 10 utilitários da paleta padrão
├── error.tsx  loading.tsx  not-found.tsx   # 🔧 dívida: cor literal em atributo de estilo
└── estilo/
    └── page.tsx                       # 🆕 a vitrine (FR-020 a FR-022)

components/
├── ui/                                # 🆕 os quatro copiados do shadcn, versionados
├── ciaara/
│   └── seletor-tema.tsx               # 🆕 folha, com "use client". O provisório da vitrine
└── faixa-de-ambiente.tsx              # 🔧 dívida: cor literal em atributo de estilo

tests/
├── unidade/
│   ├── contraste.test.ts              # 🆕 percorre os pares e falha nomeando a razão
│   └── vocabulario.test.ts            # 🆕 todo token de :root tem contraparte em .dark
└── e2e/
    └── tema.spec.ts                   # 🆕 persistência, preferência do sistema, e o flash

eslint.config.mjs                      # 🔧 a regra de cor, agora com a paleta padrão junto
components.json                        # 🆕 configuração do shadcn, versionada
public/fontes/                         # ✅ já versionado: 4 pesos + licença
```

**Estrutura escolhida**: aplicação web única, sem separação cliente/servidor de projeto. É a que já
existe desde o Épico 0 e esta fatia não a altera.

## Complexity Tracking

Nenhuma violação de princípio a justificar. Duas notas de complexidade real, para que ninguém as
subestime ao dividir em tarefas:

| Item | Por que é mais caro do que parece |
|---|---|
| **Provar a ausência de flash** | O defeito dura milissegundos e **não aparece em captura estática**. Medir exige interceptar o estado antes da hidratação. É o requisito mais fácil de declarar cumprido sem estar — ver `research.md` R-1 |
| **Reconciliar as variáveis do shadcn** | Os componentes copiados trazem o próprio vocabulário de papéis. Sem casamento explícito passam a existir **dois** pontos únicos de verdade, o que nega o `RF-DS-01` **parecendo cumpri-lo**. Ver `contracts/reconciliacao-shadcn.md` |

## Fases

- **Fase 0 · Pesquisa** — [research.md](./research.md). Cinco decisões técnicas, todas com
  alternativa considerada. Nenhum `NEEDS CLARIFICATION` sobrou da spec.
- **Fase 1 · Desenho** — [data-model.md](./data-model.md), [contracts/](./contracts/),
  [quickstart.md](./quickstart.md).
- **Fase 2 · Tarefas** — `/speckit-tasks`. **Não** é produzida por este comando.

### Reavaliação do portão após a Fase 1

Refeita com os artefatos na mão: **passa, sem mudança de veredito**. O desenho não introduziu
dependência nova além do `next-themes`, não alcançou o banco, não tocou regra `RN-` e não ampliou o
escopo — ao contrário, os três contratos **estreitaram** o que estava vago na spec.
