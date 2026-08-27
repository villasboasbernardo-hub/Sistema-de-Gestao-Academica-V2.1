# Implementation Plan: Hotfix — Carrosséis Fixos da Página Inicial (Catálogo Completo)

**Branch**: `013-hotfix-carrosseis-pagina-inicial` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/013-hotfix-carrosseis-pagina-inicial/spec.md`

## Summary

Correção cirúrgica de um único arquivo: `renderizarPainelInicio()` (`app/(app)/inicio/page.tsx`)
descarta hoje qualquer curso sem uma entrada resolvida em `turmasEmDestaque` (`if (!destaque)
return;`, linha 29) e só gera uma seção de carrossel por classificação que tenha pelo menos um curso
sobrevivente a esse filtro. O backend (`getContextoInicial`, ``app/layout.tsx` + `lib/supabase/server.ts``) já expõe 100% dos
cursos do escopo do usuário sem nenhum filtro por status de turma — não precisa de nenhuma mudança,
só de um teste de regressão que documente essa propriedade. A correção: (1) remover o `return`
restritivo; (2) trocar a lista dinâmica de seções por uma lista fixa de 5 classificações, sempre
renderizada nesta ordem, com os 5 títulos exigidos; (3) dentro de cada seção, cursos com turma em
destaque aparecem primeiro (Clarifications 2026-08-16, mesmo padrão do Hotfix 010); (4) seção sem
nenhum curso exibe a mensagem "Nenhum curso cadastrado nesta modalidade" em vez de nada; (5) cartão
sem turma em destaque reaproveita o layout já usado por `app/(app)/cursos/[curso]/page.tsx` (nome/classificação/duração,
sem badge/progresso de turma). Nenhuma mudança de Design System, nenhuma mudança no destino do clique
do cartão, nenhuma dependência nova.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova. Tailwind CSS + shadcn/ui (CSS/JS já incluídos desde o Hotfix 010) e o
componente `.carrossel-scroll-snap` nativo (`app/globals.css`) já existente, ambos só reaproveitados.

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — nenhuma mudança de schema, nenhuma
mudança na forma de `getContextoInicial`).

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: N/A — nenhuma leitura nova de planilha; a montagem das 5 seções é agregação em
memória sobre `AppState.ctx.cursos`/`turmasEmDestaque`, já carregados pelo boot existente.

**Constraints**: Zero mudança de comportamento fora do escopo dos 5 FRs (Princípio II/IX da
constitution) — nenhuma mudança em `getContextoInicial`/`resolverTurmaEmDestaque_`, em
`app/(app)/cursos/[curso]/page.tsx` (já resolvido no Hotfix 010), em Design System ou no destino de navegação do clique.

**Scale/Scope**: 1 arquivo de produção tocado: `app/(app)/inicio/page.tsx` (constante
`CLASSIFICACOES_ORDEM` → lista fixa de 5 categorias com título; função pura nova; `renderizarPainel
Inicio()` reescrita para iterar a lista fixa). 1 arquivo de teste ganha um novo `describe`:
`tests/unidade/regras_ui_dados.test.ts`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Princípio I (Fidelidade à Fase 1)**: Não implementa nenhum RF/RN novo — corrige a Página Inicial
  para voltar a cumprir RF-INI-01/02 (Épico 009, "Início" lista o catálogo por classificação) diante
  de uma mudança de regra de negócio já decidida por Bernardo (contexto obrigatório do pedido:
  turmas fora de andamento deixam de ser motivo de ocultar um curso). Nenhum identificador novo
  necessário. **PASSA**.
- **Princípio II (Preservação de Regras de Negócio)**: Nenhuma regra `RN-` é tocada —
  `resolverTurmaEmDestaque_` (a única lógica normativa envolvida, resolução de turma em destaque)
  não muda; a correção é inteiramente de apresentação (quais cursos aparecem, em que seções, em que
  ordem). **PASSA**.
- **Princípio III (Restrição de Plataforma)**: Reaproveita `.carrossel-scroll-snap` e o Tailwind CSS já
  carregado — nenhum bundler, framework ou biblioteca nova. **PASSA**.
- **Princípio V (Degradação Segura)**: Categoria sem cursos degrada para uma mensagem de texto
  (FR-004), nunca para uma seção quebrada ou ausência silenciosa — mesmo espírito de RN-DEG-01 mesmo
  não sendo uma regra `RN-` numerada. **PASSA**.
- **Princípio VI (Mudança Cirúrgica, Validada por Invariantes)**: 1 arquivo de produção, mudança
  isolada e testável (a função pura de agrupamento cobre FR-001/003/008 e a pré-condição de dados de
  FR-004 por `pnpm vitest run`; a renderização em si de FR-004 e o resto são verificação manual
  documentada). **PASSA**.
- **Princípio VII (Configuração Sobre Constante)**: não aplicável — os 5 títulos/classificações
  fixas (`CATEGORIAS_PAINEL_INICIO`) são uma taxonomia fechada definida no glossário do projeto
  (`docs/fase-1/07-Glossario.md`, spec.md Assumptions), não um limite normativo nem um dado anual do
  PROENS; mesmo padrão já aceito para `CLASSIFICACOES_ORDEM_CURSO`/`CLASSIFICACOES_ORDEM` desde o
  Épico 009/Hotfix 010. **PASSA**.
- **Princípio VIII (Rastreabilidade)**: Todo FR de `spec.md` cita o achado de código que o motivou
  ("Contexto e achados") ou a Clarification que o resolveu; commit de implementação citará `[FR-00N]`.
  **PASSA**.
- **Princípio IX (Contenção de Escopo)**: Escopo restrito a `app/(app)/inicio/page.tsx`; `spec.md` já documenta
  como fora de escopo qualquer mudança em `getContextoInicial`/`resolverTurmaEmDestaque_`/
  `app/(app)/cursos/[curso]/page.tsx`/Design System. **PASSA**.

Nenhuma violação. Nenhuma entrada necessária em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/013-hotfix-carrosseis-pagina-inicial/
├── plan.md                     # Este arquivo (/speckit-plan)
├── research.md                 # Fase 0 (/speckit-plan)
├── data-model.md               # Fase 1 (/speckit-plan) — sem entidade nova, só nota de leitura
├── contracts/server-functions.md  # Fase 1 (/speckit-plan) — confirma getContextoInicial inalterado
├── quickstart.md               # Fase 1 (/speckit-plan) — roteiro de verificação manual no navegador
├── checklists/requirements.md  # já criado no /speckit.specify
└── tasks.md                    # Fase 2 (/speckit-tasks — ainda não criado)
```

### Source Code (repository root)

Projeto existente, estrutura já estabelecida desde o Épico E/B
(`docs/arquitetura/02-modularizacao.md`) — nenhuma pasta nova, nenhum arquivo novo. Este hotfix toca
exatamente 1 arquivo de produção:

```text
src/
└── frontend/
    └── `app/(app)/inicio/page.tsx`    # CLASSIFICACOES_ORDEM → CATEGORIAS_PAINEL_INICIO (5 fixas, com título);
                            # montarCarrosseisPainelInicio_() nova (função pura); renderizarPainel
                            # Inicio() reescrita para iterar as 5 categorias fixas e renderizar a
                            # mensagem de vazio — FR-001/003/004/005/006/008

tests/
└── regras_ui_dados.test.ts    # já existe (Hotfix 010) — ganha describe novo para
                                # montarCarrosseisPainelInicio_ (FR-001/003/004/008)
```

**Structure Decision**: Nenhuma estrutura nova. A correção entra inteiramente no mesmo arquivo que o
Épico 009 já criou (`app/(app)/inicio/page.tsx`), no mesmo padrão que o Hotfix 010 já estabeleceu para o
`<script>` irmão de `app/(app)/cursos/[curso]/page.tsx`: a lógica de agrupamento/ordenação/preenchimento de categoria
fica em uma função pura local (`montarCarrosseisPainelInicio_`, sem tocar o DOM), e
`renderizarPainelInicio()` só consome o resultado para montar `innerHTML`. A função não é movida para
`components/ciaara/` nem compartilhada com `agruparCursosParaPagina_` de `app/(app)/cursos/[curso]/page.tsx` — o projeto já
mantém constantes de ordenação por classificação duplicadas por view (`CLASSIFICACOES_ORDEM_CURSO`
em `app/(app)/cursos/[curso]/page.tsx` vs. `CLASSIFICACOES_ORDEM` em `app/(app)/inicio/page.tsx`, ambas do Épico 009/Hotfix 010) e
as duas funções precisam de comportamentos diferentes no ponto exato que motiva este hotfix (5 chaves
sempre presentes vs. só as chaves com curso) — extrair um utilitário compartilhado agora acoplaria as
duas telas por uma coincidência de forma, não por uma necessidade real (Princípio IX).

## Complexity Tracking

*Sem violações de constitution — seção não aplicável.*
