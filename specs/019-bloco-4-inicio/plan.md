# Implementation Plan: Bloco 4 — a página de Início

**Branch**: `feat/BLOCO-4-inicio` | **Date**: 20/10/2026 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/019-bloco-4-inicio/spec.md` (C-1 a C-17 decididas) e `triagem.md`.

## Summary

O Início passa a ser do **ano escolhido** (padrão o vigente, `?ano=`), com os cartões das turmas num **carrossel** com
barra de progresso, um segundo **carrossel com os DSA da semana atual** (semana do curso, turma, resumo do lançado,
link) e a lateral ganha **submenu** (*Cursos* → classificação → curso; *Turmas* → curso → turma). Um componente de
carrossel só, sem pacote. **Sem migration.**

## Technical Context

**Language/Version**: TypeScript 5 (`strict`), Next.js 16.3.3, React 19.2.8
**Primary Dependencies**: `@supabase/ssr`, `nuqs`, Radix/shadcn, `lucide-react` — **nenhum pacote novo**
**Storage**: nenhuma mudança; leituras de `turmas`, `cursos`, `vw_carga_horaria_turma`, `vw_ocupacao_ta`,
`vw_turmas_arquivadas`
**Testing**: Vitest (domínio e guardas), Playwright por clique e teclado
**Target Platform**: Vercel; **Project Type**: aplicação web (App Router)
**Performance Goals**: uma rodada de leituras paralelas no Início (+1: a ocupação da semana); duas leituras no layout
para o submenu (cursos e turmas), em paralelo com as de hoje
**Constraints**: "hoje" de `hojeNaCiaara()`; `components/` não conhece origem de dado (o layout entrega o submenu);
`"use client"` só em folha, declarada nas guardas `fronteira-*`; *"reduzir movimento"* respeitado
**Scale/Scope**: 29 turmas, 24 cursos (remoto, 20/10/2026)

## Constitution Check

| Princípio | Como o plan o cumpre | Veredito |
|---|---|---|
| I. Fidelidade | Bloco 4 do plano; `RF-INI-01` a `RF-INI-05` (o Início), `RF-NAV-02` (a lateral **ganha** caminho, não perde) | ✅ |
| II. Regras de negócio | Nenhuma regra nova; quem tem DSA na semana, o resumo e a árvore do submenu são funções puras de `lib/dominio/`, com teste; o progresso e a semana do curso reusam as funções de hoje | ✅ |
| III. Plataforma | Sem pacote; Server Components; folhas novas declaradas | ✅ |
| IV. Histórico | Nada é gravado | ✅ |
| V. Degradação | Leitura que falha some com o carrossel e diz por quê; ano inválido cai no vigente | ✅ |
| VI. Cirúrgico | Sem migration; invariante: o percentual do cartão é o de antes (SC-005) | ✅ |
| VII. Configuração | O ritmo do carrossel é tela, não norma | ✅ |
| VIII. Rastreabilidade | Commits `feat(BLOCO-4)`/`test(BLOCO-4)`/`docs(BLOCO-4)` | ✅ |
| IX. Escopo | Só o Bloco 4 | ✅ |
| X. Paridade | §2 da spec | ✅ |
| XI. O banco é a fronteira | O submenu e os carrosséis só têm o que a RLS entrega; nada é escondido por permissão na tela | ✅ |

**Gate:** passa.

## Project Structure

```text
specs/019-bloco-4-inicio/  spec.md · triagem.md · plan.md · research.md · contracts/telas.md · quickstart.md · tasks.md
lib/dominio/dsa-da-semana.ts            # quem tem DSA na semana, o resumo, a frase (novo, puro)
lib/dominio/carrossel.ts                # o próximo, o anterior, quando passa sozinho (novo, puro)
lib/dominio/submenu-da-lateral.ts       # a árvore Cursos/Turmas e o ramo ativo (novo, puro)
lib/navegacao/contrato.ts               # `ano` em /inicio
components/ciaara/carrossel.tsx         # o carrossel, folha de cliente (novo)
components/casca/submenu-da-lateral.tsx # o submenu, folha de cliente (novo)
components/casca/navegacao-lateral.tsx · casca-do-app.tsx · painel-retratil.tsx
app/(app)/layout.tsx                    # lê cursos e turmas para o submenu
app/(app)/inicio/page.tsx · panorama.ts · CartaoDaTurma.tsx · ManchetesDoDsa.tsx
lib/acoes/curso.ts · turma.ts           # revalidar o layout (C-16)
tests/…                                 # §5
```

## 1. Um PR, sem migration, merge depois da conferência

O DSA não muda (FR-006); o merge segue a conferência.

## 2. Domínio primeiro

- `dsa-da-semana.ts`: `temDsaNaSemana(turma, dias)` (C-8, com `ehEadPuro` e `etapaDaSemana`); `resumoDoDsa(lancamentos)`
  → TA, dias, disciplinas, avaliações, atividades; `fraseDoResumo(resumo)`.
- `carrossel.ts`: `indiceSeguinte`, `indiceAnterior` (com volta), `passaSozinho({total, pausadoPeloBotao, apontando,
  focado, reduzirMovimento})`.
- `submenu-da-lateral.ts`: `arvoreDeCursos(cursos)` (por classificação, na ordem e com o rótulo de
  `classificacoes-de-curso.ts`), `arvoreDeTurmas(turmas)` (por curso, sem arquivadas, as mais novas primeiro),
  `ramoDoCaminho(caminho, arvores)` (o que abre e o que é ativo).

## 3. Telas (detalhe em `contracts/telas.md`)

O Início: seletor de ano → filtro de recorte → alertas → números do ano → **carrossel das turmas** → **carrossel dos DSA
da semana**. A lateral: o submenu ao lado de *Cursos* e *Turmas*.

## 4. O fuso

"Hoje" e a semana atual saem de `hojeNaCiaara()` e `semanaDoPainel` (São Paulo). Nada novo lê relógio do servidor.

## 5. Testes

| Item | Unidade | E2E (por clique e teclado) |
|---|---|---|
| Ano | `anoDoPainel` (já coberto), o contrato com `ano` | o Início abre no vigente e não conta a do ano seguinte; o seletor troca |
| Carrossel | `carrossel.ts`; guarda de que os dois usam o componente único | avança sozinho; pausa ao apontar, ao focar e pelo botão; ← →; reduzir movimento |
| DSA da semana | `dsa-da-semana.ts` (EAD fora, janela, etapa, resumo) | a manchete com TA e dias certos e o link; a EAD fora |
| Submenu | `submenu-da-lateral.ts` | Turmas → curso → turma abre a ficha marcada; arquivada fora; recolhida sem sublistas; Cursos → classificação → curso |

## 6. Riscos

| Risco | Contenção |
|---|---|
| O submenu mudar a ordem do `Tab` e as contagens de `[data-entrada]` dos testes da lateral | as sublistas e os botões usam `data-subentrada` (nunca `data-entrada`) e só existem com a lateral expandida |
| Dois `aria-current="page"` na lateral (a entrada e a subentrada) | a subentrada ativa usa `aria-current="page"` e a entrada da lista continua como hoje (R-3): os percursos que exigem um ativo só passam por páginas de lista; rebaixar a entrada fica no lote |
| O carrossel girar sem fim no teste | a ponta a ponta controla o tempo (`page.clock`) |
| O layout ficar com a árvore velha | as cinco ações revalidam o layout (C-16) |

## 7. Dúvidas do plan — decididas pela recomendação

- **P-1 · Onde mora o carrossel?** → `components/ciaara/carrossel.tsx`, genérico (recebe os itens prontos); os
  cartões e as manchetes são desenhados no servidor.
- **P-2 · Trilho com rolagem ou troca de item?** → **trilho com encaixe** (`scroll-snap`), que serve aos dois: no de
  turmas cabem vários; no de DSA, cada manchete ocupa a largura toda.
- **P-3 · De onde vem a árvore do submenu?** → do `layout` (servidor), por propriedade até a folha.
