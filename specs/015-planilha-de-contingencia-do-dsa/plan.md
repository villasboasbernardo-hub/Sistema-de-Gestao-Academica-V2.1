# Implementation Plan: Planilha de contingência do DSA

**Branch**: `feat/EPICO-6-planilha-de-contingencia` | **Date**: 09/10/2026 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/015-planilha-de-contingencia-do-dsa/spec.md`, com o clarify de 09/10/2026 (8 respostas
de Bernardo Villas Boas, todas pela recomendação)

> ✅ **AS CINCO DÚVIDAS DESTE PLANO FORAM RESPONDIDAS por Bernardo Villas Boas em 09/10/2026 (§8)** —
> quatro pela recomendação, e a `DP-5` com uma mudança de forma: **paginar até acabar, nunca recusar**.
> O plano foi aprovado na mesma data.
>
> ⚠️ **E uma pendência nasceu no analyze da mesma data — `PEND-DSA-SUGESTAO`**: o formulário do DSA não
> usa `preencherLancamento`, e **a tela não muda nesta spec** (`research.md` R-9).

## Summary

Um botão *Baixar planilha de contingência*, na tela do DSA e na ficha da turma, entrega a quem pode
lançar um `.xlsx` da turma com o **ano inteiro**: a PREENCHIMENTO (entrada por COD e ITEM, com tópico,
local, técnica, instrutor e horário sugeridos e sobrescrevíveis), a IMPRESSÃO (o DSA no modelo v4, uma
semana por vez pelo seletor, A4 paisagem), o catálogo e o relógio — e, no PR 2, a CONTROLE e a CRONOS.

**Como:** um Route Handler lê o período inteiro **uma vez**, pelas mesmas consultas e pela mesma
montagem da tela do DSA (refatoradas em *ler o período* + *montar a semana*, R-2); as funções de
`lib/dominio/dsa/` calculam tudo o que vem preenchido; um modelo puro da pasta monta abas, células e
fórmulas — estas como **árvores tipadas** de um vocabulário fechado, que se escrevem no arquivo e se
avaliam no teste contra o domínio (R-4); e um escritor de OOXML **sem pacote** (`node:zlib`) monta o
arquivo (R-1). Nada é gravado no banco, e não há migration.

## Technical Context

**Language/Version**: TypeScript `strict` (com `exactOptionalPropertyTypes`), Node 24.19.0 nesta máquina,
`engines` `>=22`

**Primary Dependencies**: Next.js 16.3.3 (App Router; o **primeiro** Route Handler do repositório),
`@supabase/ssr` 0.12.5, `node:zlib` — **nenhuma dependência nova** (`Q-2`)

**Storage**: Supabase PostgreSQL, **só leitura**, com a sessão de quem pede; nenhuma tabela, coluna ou
função nova

**Testing**: Vitest (escritor, árvore de fórmulas, modelo da pasta, guardas) · invariantes contra o banco
local (equivalência da leitura, mais de 1.000 linhas, igual ao papel, nada escrito) · Playwright (botão, download,
recusa por perfil) · prova no Excel por automação (`scripts/provas/`) · conferência no Google (`DP-4`)

**Target Platform**: Vercel (função Node); arquivo aberto no **Excel** e no **Google Planilhas** (`Q-4`)

**Project Type**: aplicação web (Next.js + Supabase), num repositório só

**Performance Goals**: arquivo em até **30 s** para a turma mais longa (`SC-001`); a geração esperada é
de poucos segundos — **[pendente — medir no PR 1]**

**Constraints**: só funções comuns aos dois programas, do **Excel 2007 em diante** (`FR-031`, `DP-2`), sem mescla (`Q-6`), sem proteção
(`FR-020`), nenhum erro em cache (`FR-023`), teto de **1.000** linhas por resposta da interface de
dados (`supabase/config.toml:18`) — lido em páginas até acabar (`DP-5`) —, e o limite de corpo de resposta das funções da Vercel —
**[a conferir na documentação da Vercel no PR 1]**

**Scale/Scope**: **22** turmas com DSA, período de até **50** semanas, até **676** lançamentos por turma,
até **22** disciplinas e **132** UEs por curso — todos medidos no retrato `remoto-20261008-212706.sql`
(`research.md` §0)

## Constitution Check

*GATE: antes da pesquisa e de novo depois do desenho.*

| Princípio | Como o plano cumpre | Situação |
|---|---|---|
| **I.** Fidelidade à Fase 1 | O pedido é de Bernardo (08/10/2026) e o clarify registrou as 8 respostas na spec. Os pontos que este plano interpreta viraram dúvida (§8), não suposição | ✅ |
| **II.** Preservação de regras | Nenhuma regra do documento 04 muda. O que vem preenchido sai das funções do domínio; o que a fórmula reexpressa está listado na R-6, cada item provado igual à função que reexpressa — e essa leitura da restrição foi **ratificada** na `DP-1` (09/10/2026) | ✅ |
| **III.** Plataforma | Next.js, Supabase, sem ORM, sem pacote novo. A tabela não lista Route Handler, e ele é **leitura**: as mutações seguem em Server Action, e não há nenhuma aqui. A impressão do sistema segue em `/print/*`; a planilha é arquivo, não tela de impressão | ✅ |
| **IV.** Integridade do histórico | Nada é escrito, inativado ou apagado (`FR-004`); a planilha é só de ida (`Q-1`) | ✅ |
| **V.** Degradação segura | Sem relógio: TA sem horário, com aviso. Sem posição: lista própria. Turma sem período: o intervalo dos lançamentos, dito no topo. Falha: frase, nunca arquivo pela metade. Mais de 1.000 linhas: páginas até acabar, sem recusa (R-3, `DP-5`) | ✅ |
| **VI.** Mudança cirúrgica, por invariante | A única mudança em código que a operação usa todo dia (R-2) vai em commit próprio e se prova pela suíte do DSA intacta, por um invariante de equivalência e por um defeito deliberado que tem de reprovar as duas | ✅ |
| **VII.** Configuração sobre constante | Siglas de avaliação, técnicas, tipos de avaliação, relógio, feriados e assinaturas vêm do banco ou do domínio; nenhuma fórmula traz lista escrita à mão (`FR-019`, R-6) | ✅ |
| **VIII.** Rastreabilidade | Cada lançamento leva o seu `codigo` na planilha (`Q-1`), e o arquivo diz quando, por quem e até quando foi gerado (`FR-005`) | ✅ |
| **IX.** Contenção de escopo | O DSA é processo da CIAARA-11. A barreira do texto (*"gerar a planilha"*) é sobre o ROTA, Épico 13 (`spec.md` §2) | ✅ |
| **X.** Paridade antes de novidade | **Novidade autorizada nominalmente** por Bernardo em 08/10/2026 (`spec.md` §2) | ✅ por exceção registrada |
| **XI.** O banco é a fronteira | Toda leitura pela sessão de quem pede, sob a RLS; o botão e a rota usam a **mesma** condição de permissão; nenhuma `service_role` | ✅ |

**Reavaliação depois do desenho:** sem violação nova. O desenho acrescentou duas coisas que o portão
precisa ver — a refatoração da leitura (VI) e a extensão da guarda de caminho a `route.ts` (a regra
*"tela sem caminho clicável é tela não entregue"*) —, e as duas estão cobertas acima.

## Project Structure

### Documentation (this feature)

```text
specs/015-planilha-de-contingencia-do-dsa/
├── estado-atual.md            # as 7 planilhas reais medidas (primeiro artefato)
├── spec.md                    # com o clarify de 09/10/2026
├── plan.md                    # este arquivo
├── research.md                # R-1 a R-14
├── data-model.md              # o modelo em memória — nada no banco
├── quickstart.md              # o guia de validação
├── contracts/
│   ├── rota-de-download.md    # GET /turmas/<código>/dsa/planilha
│   └── planilha.md            # abas, células, fórmulas, invariantes I-P1 a I-P13
├── checklists/requirements.md
└── tasks.md                   # do /speckit-tasks — não criado aqui
```

### Source Code (repository root)

```text
lib/supabase/
└── paginacao.ts                       # NOVO — lê uma lista em páginas de 1.000 até acabar (DP-5)

lib/planilha/                          # NOVO — o arquivo, sem domínio nenhum
├── ooxml.ts                           # partes do pacote, estilos, cadeias compartilhadas
├── zip.ts                             # ZIP com node:zlib (deflateRawSync) e CRC-32 próprio
├── formula.ts                         # a árvore tipada: escrever() e avaliar()
└── cores.ts                           # espelho de app/print/dsa/documento.css (I-P13)

lib/dominio/dsa/
├── planilha-de-contingencia.ts        # NOVO — monta a pasta: dados do período → abas
└── planilha/                          # NOVO — uma aba por módulo, todos puros
    ├── tipos.ts
    ├── semanas.ts
    ├── horarios.ts
    ├── catalogo.ts
    ├── preenchimento.ts
    ├── impressao.ts
    ├── controle.ts                    # PR 2
    └── cronos.ts                      # PR 2

app/(app)/turmas/[turma]/dsa/
├── leitura.ts                         # REFATORADO — lerPeriodoDoDsa + montarSemanaDoDsa (R-2, R-3)
├── page.tsx                           # o botão
└── planilha/
    ├── route.ts                       # NOVO — o primeiro Route Handler
    ├── leitura.ts                     # NOVO — a leitura da planilha, numa rodada
    └── acesso.ts                      # NOVO — a condição única do botão e da rota

app/(app)/turmas/[turma]/page.tsx      # o botão na ficha
lib/navegacao/endereco-de-turma.ts     # enderecoDaPlanilhaDeContingencia
lib/navegacao/contrato.ts              # o parâmetro de aviso de falha na tela do DSA

scripts/provas/planilha_no_excel.ps1   # NOVO — a prova no Excel por automação

tests/unidade/
├── paginacao.test.ts
├── planilha-zip.test.ts
├── planilha-ooxml.test.ts
├── planilha-formula.test.ts
├── planilha-cores.test.ts
├── planilha/ler-xlsx.ts               # o leitor de teste do .xlsx gerado
├── dsa/planilha-{semanas,horarios,catalogo,preenchimento,impressao,acesso,rota}.test.ts
├── dsa/planilha-{controle,cronos}.test.ts   # PR 2
└── toda-tela-tem-caminho.test.ts      # ESTENDIDO a route.ts
tests/invariantes/
├── leitura-paginada.test.ts           # mais de 1.000 linhas: nº do DSA e CH acumulada (DP-5)
├── leitura-do-periodo.test.ts         # equivalência semana a semana (R-2)
├── planilha-igual-ao-papel.test.ts    # I-P5 e nada escrito
└── planilha-de-conferencia.test.ts    # gera o arquivo e o gabarito das conferências
tests/e2e/planilha-de-contingencia.spec.ts
```

**Structure Decision**: o escritor de arquivo fica em `lib/planilha/`, **fora** de `lib/dominio/`,
porque não tem regra nenhuma e usa `node:zlib`; o modelo da pasta fica em `lib/dominio/dsa/`, porque é
ali que as regras do DSA se compõem e onde o teste puro as prova contra as funções irmãs. A ordem de
implementação segue a da casa: domínio → leitura → rota → telas.

## Divisão em PRs (`Q-5`)

| PR | Entrega | Histórias |
|---|---|---|
| **PR 1** | refatoração da leitura **com a paginação** (commit próprio, primeiro — `DP-5`) · escritor de OOXML · árvore de fórmulas · PREENCHIMENTO, IMPRESSÃO, BD DISCIPLINAS e HORÁRIOS · rota · os dois botões · guarda estendida · prova no Excel · roteiro | 1, 2 e 3 |
| **PR 2** | CONTROLE e CRONOS · situação em três degraus por fórmula e o retrato de *Atrasada*/*Conflitou* | 4 |

Os dois sem migration; os dois com `pnpm verificar:tudo` igual ao CI (`SC-005`) e merge só com a
palavra de Bernardo.

## Riscos

| Risco | O que se faz |
|---|---|
| A refatoração da leitura muda a tela do DSA, que é usada todo dia | commit próprio e primeiro; suíte do DSA sem mudar asserção; invariante de equivalência; defeito deliberado que reprova as duas (`quickstart.md` §2) |
| Uma consulta passa de 1.000 linhas e a planilha — ou o DSA de hoje — sai sem parte do dado, sem erro | páginas até acabar nas duas leituras (R-3, `DP-5`), provadas com mais de 1.000 linhas; medido 676 hoje na maior turma |
| A fórmula diverge do sistema depois do primeiro recálculo, e o arquivo "como gerado" parece certo | árvore avaliada contra o domínio (I-P4, I-P10) e o Excel de verdade por automação (§4 do guia) |
| O Google importa diferente do Excel | conferência no Google (`DP-4`); o que não importar vira instrução escrita, medida |
| O papel sem mescla fica ilegível | distribuição do cartão pelas células (R-8) e o julgamento de Bernardo no papel |
| A planilha é baixada só quando o sistema já caiu | o topo de toda planilha manda baixar no início de cada semana; é a premissa da spec (§6) |

## Complexity Tracking

| O que foge do mais simples | Por que é preciso | O mais simples foi descartado porque |
|---|---|---|
| Fórmulas que reexpressam contas do domínio (R-6) | `Q-6` e `Q-7`: o papel acompanha a edição offline | só valores fixos não acompanhariam nada do que se lançasse offline |
| Árvore tipada com avaliador, em vez de texto de fórmula | prova cada fórmula contra o domínio e fecha o vocabulário por construção | texto livre não se avalia sem analisador, e lista de proibidas é cega ao que não lista |
| Refatorar uma leitura que funciona | a planilha precisa da MESMA montagem para 50 semanas | 900 idas ao banco por download (50 × 18), ou uma segunda implementação do mapeamento |

## 8. As dúvidas deste plano — ✅ RESPONDIDAS em 09/10/2026

*(Respostas de Bernardo Villas Boas, 09/10/2026, com o plano aprovado.)*

| # | Resposta |
|---|---|
| **DP-1** | **RATIFICADAS as seis contas em fórmula** — início e fim do bloco, tipo do cartão (cor), lugar do Estudo Individual, nº do DSA, CH cumprida e, no PR 2, a situação —, **cada uma com teste comparando com a função do sistema** |
| **DP-2** | **Excel 2007 em diante** |
| **DP-3** | Coluna do sábado **só na turma com sábado lançado no ano**; sábado lançado offline em outra turma vai para a **lista abaixo da grade** |
| **DP-4** | **Autorizado** conferir no Excel desta máquina (script versionado) e no Google Drive (**pasta própria, dado sintético, apagada no fim**) |
| **DP-5** | **Corrigir JUNTO, no commit da refatoração da leitura do DSA, por PAGINAÇÃO**: a leitura busca em páginas de 1.000 até acabar, para o DSA e para a planilha. **NÃO recusar acima de 1.000.** Teste com **mais de 1.000 linhas** provando que o nº do DSA e a CH acumulada batem |

As opções abaixo ficam como foram consideradas.

### DP-1 — Você ratifica que a fórmula pode reexpressar estas contas, cada uma provada contra o domínio? · ✅ **RATIFICADA: (a)**

Sua restrição diz *"sem segunda implementação de horário, grade ou situação"*. As respostas `Q-6`
(o agrupamento acompanha a edição) e `Q-7` (situação por fórmula nos degraus que são conta) só se
cumprem se a planilha refizer, em fórmula, **contas simples** sobre o que está nela. São estas (R-6):

1. onde começa e termina o bloco (a chave muda, o período muda, o código do lançamento muda);
2. o tipo do cartão, para a cor;
3. o lugar do Estudo Individual (o TA seguinte ao último lançado no dia);
4. o nº do DSA (semanas com aula ou avaliação até a semana);
5. a CH cumprida até o fim da semana;
6. *(PR 2)* a situação nos três degraus.

| Opção | O que significa |
|---|---|
| **(a)** Ratificar as seis | Cada uma vem com um teste que avalia a fórmula sobre o dado gerado e compara com a função do domínio; divergir reprova. Tudo o que vem preenchido continua saindo do domínio |
| (b) Só a 5 e a 6, já autorizadas pela `Q-7` | Sem 1 a 4, o papel não acompanha o que se lançar offline: bloco, cor, Estudo Individual e número ficam como gerados |
| (c) Nenhuma | A planilha vira retrato editável à mão, e contraria a `Q-6` e a `Q-7` |

**Recomendação: (a).** É a mesma regra da `Q-7` aplicada às outras contas, e a prova é a mesma.

### DP-2 — Qual é o Excel mais antigo em que a planilha tem de abrir? · ✅ **RESPONDIDA: (a), Excel 2007 em diante**

A `Q-4` decidiu *"Excel e Google"*; falta a versão. Medido nesta máquina: **Microsoft 365** e um
**Excel 2007** instalado ao lado (`research.md` §0) — e as máquinas da operação não foram medidas.

| Opção | O que significa |
|---|---|
| **(a)** **Excel 2007 em diante** | Funções até 2007 (`IFERROR`, `COUNTIFS`, `SUMIFS`, `INDEX`, `MATCH`…), listas de escolha por nome definido e regras de cor que leem só a própria aba. Abre em qualquer Excel desde 2007 e no Google |
| (b) Excel 2010 em diante | O mesmo vocabulário; as listas podem apontar direto para o intervalo, o que tira a dúvida de como o Google importa nome definido |
| (c) Só Microsoft 365 | Libera `XLOOKUP`, `FILTER`, `UNIQUE`; fórmulas mais curtas, e o arquivo deixa de funcionar em Excel antigo |

**Recomendação: (a).** Não custa nada a mais no desenho e não depende de medir as máquinas da operação.

### DP-3 — A coluna do sábado aparece sempre na IMPRESSÃO? · ✅ **RESPONDIDA: (a)**

Sem mescla e sem esconder coluna por fórmula, o número de colunas do papel é decidido na geração.

| Opção | O que significa |
|---|---|
| **(a)** Só quando a turma tem lançamento em sábado em alguma semana do ano | O papel comum sai com 5 dias, como o `/print/dsa`. Sábado lançado offline numa turma sem sábado vai para a lista abaixo da grade — **nunca some** |
| (b) Sempre, com a coluna vazia na maioria das semanas | Nunca falta coluna; cada dia fica 1/6 mais estreito, e o papel difere do `/print/dsa` |
| (c) Duas abas de impressão, com e sem sábado | Papel fiel nos dois casos; mais uma aba para manter |

**Recomendação: (a).** É o caso comum fiel ao sistema, e o caso raro não perde conteúdo.

### DP-4 — Posso conferir a planilha no seu Excel e no seu Google Drive? · ✅ **AUTORIZADA: (a)**

O `SC-007` só se prova nos programas de verdade.

| Opção | O que significa |
|---|---|
| **(a)** Os dois, com **dado sintético** da base local | No Excel, um script versionado abre o arquivo por automação nesta máquina, recalcula e compara com o gabarito. No Google, o arquivo vai pelo conector para uma pasta própria do seu Drive, convertido, é lido de volta e a pasta é apagada no fim |
| (b) Só o Excel por automação; o Google você confere à mão, pelo roteiro | Nada vai para o Drive; a conferência do Google fica manual |
| (c) Os dois à mão | Sem automação nenhuma |

**Recomendação: (a).** É dado sintético, numa pasta que nasce e morre na conferência, e transforma a
parte mais incerta do desenho (o que o Google importa) em medição.

### DP-5 — O teto de 1.000 linhas também ameaça o DSA de hoje: corrijo junto? · ✅ **RESPONDIDA: junto, por paginação — nunca recusar**

A leitura do ano precisa de paginação com contagem (R-3). As leituras **acumuladas** que a tela do DSA
e o `/print/dsa` já fazem hoje — a ocupação até o fim da semana, as aulas por UE e as datas do nº do
DSA — têm o **mesmo** risco, sem guarda: a maior turma tem **676** lançamentos no retrato de 08/10/2026
e chega perto do teto no fim do ano, e aí o número do DSA e a CH acumulada sairiam errados **sem
erro**. Com a refatoração da R-2, essas leituras passam pelo mesmo leitor.

| Opção | O que significa |
|---|---|
| **(a)** Corrigir junto, no commit da refatoração | O DSA ganha a mesma guarda da planilha; o comportamento só muda acima de 1.000 linhas, e aí muda de *errado em silêncio* para *recusa com frase* |
| (b) Só na planilha; o DSA fica como está e vira pendência nomeada | A refatoração não toca o comportamento da tela em caso nenhum |

**Recomendação: (a).** O defeito é real, a correção é a mesma linha de código, e deixá-lo de fora
seria manter, de propósito, uma leitura que a planilha acabou de provar insegura.

⚠️ **A RESPOSTA MUDOU A FORMA DA CORREÇÃO, e a opção (a) acima está superada nisso:** não há recusa
acima de 1.000 linhas. A leitura busca **todas** as páginas, para o DSA e para a planilha, e o teste
com mais de 1.000 linhas prova que o nº do DSA e a CH acumulada batem com a contagem direta no banco
(R-3).
