# Plano de implementação: Épico 5, fatia (c) — cadastro de instrutores

**Ramo**: `feat/EPICO-5c-cadastro-de-instrutores` | **Data**: 11/09/2026 |
**Spec**: [spec.md](./spec.md)

**Entrada**: [spec.md](./spec.md) · [research.md](./research.md) ·
[data-model.md](./data-model.md) · [contracts/](./contracts/) · [quickstart.md](./quickstart.md)

---

## Resumo

Reconstruir na v2.1 o módulo de instrutores que a v2.0 acumulou em **oito specs** — a maior massa de
funcionalidade do sistema e a que Bernardo mais usou e refinou. **É porte, não invenção.**

A abordagem técnica sai da Fase 0 e tem três eixos, em ordem de risco:

1. **Fechar o recorte de escrita do dado pessoal.** A metade da leitura foi feita no Épico 3; a da
   escrita nunca existiu. Medido: **dois perfis gravam CPF, RG, telefone e endereço que não
   conseguem ler.**
2. **Construir a carga horária prevista**, que não existe no banco e sem a qual o alerta de faixa do
   `FR-016` não tem o que comparar. A spec não nomeia esta lacuna.
3. **Montar a tela** sobre o que os Épicos 4 (b) e (c) entregaram — tabela densa controlada, filtros,
   gráficos, estado na URL — consumindo as funções puras de antiguidade e nome que **já existem**.

⚠️ **O risco dominante não é errar: é perder um refinamento** que ninguém lembra de cobrar até fazer
falta. Daí o `SC-007` e o passo 9 do quickstart.

---

## Contexto técnico

**Linguagem**: TypeScript `strict`, `exactOptionalPropertyTypes` ligado · React 19.2.8

**Dependências principais**: Next.js 16.3.3 (App Router, Server Components por padrão) ·
Tailwind v4.3.3 · shadcn/ui sobre **Radix** · `@supabase/ssr` 0.12.5 e `@supabase/supabase-js`
2.112.4 · `nuqs` (estado na URL) · Recharts (via `components/graficos/`)

**Armazenamento**: Supabase PostgreSQL, **sem ORM**. Leitura por `vw_instrutores`; PII por
`vw_instrutor_dados_pessoais`

**Testes**: Vitest (unidade) · pgTAP (invariantes SQL) · Vitest com sessão autenticada (RLS
negativa) · Playwright (ponta a ponta)

**Plataforma alvo**: Vercel, preview por ramo, e **Production desde 15/09/2026**, por exceção
registrada no `FR-016.1` da spec 001, sobre o mesmo projeto Supabase de desenvolvimento/preview

**Atualização registrada em 15/09/2026**: esta linha dizia "Sem URL de produção ainda". *(decisão de Bernardo Villas Boas, 15/09/2026)*

**Tipo de projeto**: aplicação web, App Router, sem `src/`, alias `@/*`

**Metas de desempenho**: nenhuma. **177 instrutores, 798 vínculos** — base pequena; a instrução do
projeto é priorizar clareza de schema e manutenibilidade sobre desempenho

**Restrições**: `"use client"` só em folha · nenhum `await` dentro de laço em `app/**` ·
`lib/dominio/` não importa `supabase`, `next` nem `react` · Zod na primeira linha de toda Server
Action · nenhuma cor literal em `components/ciaara/`

**Escala/escopo**: **3 rotas novas** (`/instrutores`, `/instrutores/[codigo]`, `/instrutores/novo`) ·
**3 migrations**, ou 4 se a `ta_previsto_semanal` sair depois da migration de carga mesclada ·
**7 módulos novos em `lib/dominio/`** mais a extensão de `antiguidade.ts` · 1 módulo em
`lib/formato/` · 1 módulo de montagem de consulta ao lado da página · 4 indicadores · 7 gráficos

**Atualização registrada em 15/09/2026**: esta linha dizia "2 rotas novas · 2 migrations · ~6 funções de domínio". Os números passam a bater com o `tasks.md`, que achou a terceira rota (D-6), a migration dos obrigatórios e do código (D-3, D-4) e a montagem da consulta exigida pela correção da T026. *(decisão de Bernardo Villas Boas, 15/09/2026)*

---

## Verificação constitucional

*PORTÃO: passa antes da Fase 0 e é reavaliado após a Fase 1.*

| Princípio | Veredito | Como esta fatia o satisfaz |
|---|---|---|
| **I · Fidelidade à Fase 1** | ✅ | Toda decisão nova foi perguntada. As seis divergências achadas estão **listadas, não corrigidas** |
| **II · Preservação de regras** | ✅ | Nenhuma `RN-` alterada. `RN-ANT-01/02`, `RN-INST-01` a `05`, `RN-CRUD-03`, `RN-2027-06` portadas na sintaxe nova |
| **III · Restrição de plataforma** | ✅ | Nada fora da pilha decidida. Nenhum pacote de componente novo |
| **IV · Integridade do histórico** | ✅ | Exclusão lógica; nenhuma policy `FOR DELETE`; `migracao_log` intocado |
| **V · Degradação segura e alerta-não-bloqueio** | ✅ | `FR-018` — os dois alertas avisam. Posto fora do domínio vai para **"Outros"**, nunca some |
| **VI · Mudança cirúrgica por invariante** | ✅ | 9 invariantes em [data-model.md](./data-model.md), com **defeito deliberado** obrigatório no recorte |
| **VII · Configuração sobre constante** | ✅ | A escala de antiguidade **já é** `config_listas`, 14 valores. Nenhuma tabela de posto em código |
| **VIII · Rastreabilidade** | ✅ | Todo parâmetro de URL tem `RF-` de origem, imposto pelo tipo |
| **IX · Contenção de escopo** | ✅ | Nota, média, aprovação e corpo discente ficam fora. **O achado R-8 é reportado, não corrigido** |
| **X · Paridade antes de novidade** | ✅ | É porte das oito specs. Nada de novo entra; a `038` **permanece removida** |
| **XI · O banco é a fronteira** | ✅ | O recorte de escrita é `grant` por coluna + função com porteiro. **Não** é Zod na Server Action |

**Resultado do portão: PASSA.** Sem violações a justificar — a tabela *Complexity Tracking* fica
vazia, e isso é o resultado esperado numa fatia de porte.

### Reavaliação após a Fase 1

**Continua passando.** O desenho não introduziu exceção. Dois pontos merecem registro:

⚠️ **O `SC-010` precisa de emenda de redação** — ele mede `UPDATE` e esquece `INSERT`, e sairia
verde com o buraco aberto. A emenda é do **critério**, não da regra: o `FR-032` já diz "escrita".
Isso é o Princípio VIII funcionando, não uma violação.

⚠️ **O R-8 é achado fora de escopo e permanece fora.** Dez views do Épico 1 carregam `INSERT`/
`UPDATE` para `authenticated`; são inertes porque não são auto-atualizáveis. Corrigi-las aqui seria
violar o Princípio IX — vão para a lista de reporte ao final, como a regra 1 do `CLAUDE.md` manda.

---

## Estrutura do projeto

### Documentação desta fatia

```text
specs/006-cadastro-de-instrutores/
├── plan.md                          # este arquivo
├── spec.md                          # 42 FR · 11 SC · 6 histórias
├── research.md                      # Fase 0 — 10 achados medidos
├── data-model.md                    # Fase 1
├── quickstart.md                    # Fase 1 — 9 passos de validação
├── contracts/
│   ├── parametros-instrutores.md    # as 2 rotas e as recusas declaradas
│   ├── recorte-de-escrita.md        # FR-032/033 — o coração da fatia
│   └── carga-horaria-e-alertas.md   # FR-014 a FR-018 · 4 indicadores · 7 gráficos
├── checklists/
│   └── requirements.md              # 16 de 16
└── tasks.md                         # Fase 2 — /speckit-tasks, NÃO criado aqui
```

### Código (raiz do repositório)

```text
supabase/migrations/
├── <ts>_recorte_escrita_dado_pessoal.sql     # FR-032/033 — revoke + grant por coluna + função
├── <ts>_carga_prevista_por_instrutor.sql     # FR-014 — estende vw_instrutor_carga_anual e vw_instrutores
└── <ts>_obrigatorios_e_codigo_instrutor.sql  # FR-005 a FR-007 — CHECK de branco + sequência do codigo

supabase/tests/                               # pgTAP (I-1, I-5, I-8) — 093, 094 e 095

lib/
├── dominio/
│   ├── antiguidade.ts                        # ✅ EXISTE — estender com a escala lida de config_listas
│   ├── nome-instrutor.ts                     # ✅ EXISTE — consumir, não reescrever
│   ├── carga-horaria.ts                      # faixa do regime; FR-016 puro
│   ├── alertas-instrutor.ts                  # FR-016 e FR-017, sem banco
│   ├── indicadores-instrutor.ts              # os 4, incluindo a taxa que passa de 100%
│   ├── graficos-instrutor.ts                 # as 7 séries
│   ├── habilitacao.ts                        # RN-INST-01, com a delimitação
│   ├── avisos-cadastro-instrutor.ts          # FR-027, lista aberta
│   └── ciclo-de-vida-instrutor.ts            # FR-009
├── formato/mascaras.ts                       # FR-024
├── validacao/instrutor.ts                    # Zod dos 5 obrigatórios, branco inclusive
├── acoes/instrutor.ts                        # Server Actions: criar, editar, desativar, reativar, habilitações
└── navegacao/contrato.ts                     # + /instrutores, /instrutores/[codigo] e /instrutores/novo

app/(app)/instrutores/
├── page.tsx                                  # listagem, filtros, indicadores, gráficos
├── consulta.ts                               # montagem da consulta no servidor, testável sem banco
├── novo/page.tsx                             # cadastro
├── [codigo]/page.tsx                         # ficha individual
├── loading.tsx · error.tsx                   # RN-DEG-01, nos três segmentos
└── *.tsx                                     # folhas de cliente, declaradas e contadas

components/ciaara/                            # ✅ 16 arquivos do Épico 4 (b) — consumir
components/graficos/                          # ✅ 5 arquivos — consumir

tests/
├── unidade/                                  # domínio, montagem da consulta e varreduras (SC-001, SC-002)
├── invariantes/rls/                          # RLS negativa com sessão autenticada (I-2, I-3)
└── e2e/instrutores.spec.ts                   # o percurso do passo 5 do quickstart
```

**Correção registrada em 15/09/2026**: a árvore acima punha o pgTAP em `tests/invariantes/`. No repositório, e no `tasks.md`, ele vive em **`supabase/tests/`**; `tests/invariantes/rls/` guarda só a RLS com sessão autenticada. *(decisão de Bernardo Villas Boas, 15/09/2026)*

**Decisão de estrutura**: a do documento 24, sem desvio. A ordem de implementação é a do
`CLAUDE.md` — **de dentro para fora**: `lib/dominio/` → `lib/validacao/` → `lib/acoes/` → `app/` →
`components/`. As migrations vêm **antes** de tudo, porque o recorte é o item de maior risco e
`pnpm db:tipos` precisa rodar antes de o TypeScript conhecer as colunas novas.

---

## Sequência recomendada, por risco decrescente

| # | Bloco | Por que nesta posição |
|---|---|---|
| 1 | **Recorte de escrita** (`FR-032`, `FR-033`) | maior risco, independe do resto, e hoje há exposição real. Sai em **PR próprio**, como a correção do redirecionamento saiu na fatia (c) |
| 2 | **CH prevista** (`FR-014`) | desbloqueia a US4 inteira; sem ela o alerta não tem o que comparar |
| 3 | **US1 — antiguidade** (P1) | transversal, *Risco: Alto*, e as funções puras já existem |
| 4 | **US2 — cinco obrigatórios** (P1) | `CHECK` no banco + Zod; independe de tela |
| 5 | **US3 — CH lida, nunca digitada** (P1) | depende do bloco 2 |
| 6 | **US5 — desativar preserva** (P2) | independe de US4 e US6 |
| 7 | **US4 — alertas** (P2) | depende do bloco 2 |
| 8 | **US6 — paridade das oito specs** (P2) | é a maior em volume e a que mais depende do Épico 4 |

⚠️ **O bloco 1 sai sozinho, e pelo mesmo motivo de sempre:** amarrar uma correção de segurança à
fatia inteira faz ela esperar a fatia inteira. **Não há exposição em produção hoje** — o projeto não
tem URL de produção —, então é higiene de entrega, não incêndio.

**Atualização registrada em 15/09/2026**: a frase acima deixou de valer como escrita. Desde 15/09/2026 existe Production na Vercel, por exceção registrada no `FR-016.1` da spec 001, **sobre o mesmo projeto Supabase** do preview. O projeto remoto foi medido em 14/09/2026 sem linha de instrutor, então o recorte continua sem dado real a expor ali; ele deixa de ser só higiene no dia em que instrutores forem carregados nesse projeto. *(decisão de Bernardo Villas Boas, 15/09/2026)*

---

## O que muda em relação à spec, e por quê

| Item | Spec (10/09) | Plano (11/09) | Motivo |
|---|---|---|---|
| **Q5c.a — bloqueio** | fatia **bloqueada** até o Épico 4 (b) e (c) | ✅ **satisfeita** | os dois estão na `main`; medido em R-1 |
| **Assumption 1 — migrations** | uma, por causa do `FR-032` | **duas** | a CH prevista não existe (R-7) |
| **`SC-010`** | compara `SELECT` × `UPDATE` | compara `SELECT` × (`UPDATE` ∪ `INSERT`) | sairia verde com o buraco aberto (R-4) |
| **Tabela de dependências** | "não existe" nas duas fatias | **fica como está** | é registro do que era verdade; o estado de hoje vive em R-1 |

---

## Complexity Tracking

*Preencher somente se a verificação constitucional tiver violação a justificar.*

**Vazia.** Nenhuma violação — é o resultado esperado de uma fatia que porta comportamento em vez de
inventá-lo.
