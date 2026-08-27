# Data Model — Hotfix: Roteamento SPA, Fonte Rawline e Performance do DSA

Nenhuma coluna/aba física nova ou alterada — hotfix comportamental/performance, zero mudança de
schema (`docs/arquitetura/01-schema.md` inalterado). Este documento descreve as 2 formas de dado
transitório (nunca persistidas) que este hotfix introduz.

## 1. `dadosBrutosDsaSemana_()` — pacote de dados pré-carregado (research.md §3)

```text
dadosBrutosDsaSemana_() -> {
  turmas: object[],      // lerAbaComoObjetos_('turmas') — 29 linhas reais
  registros: object[],   // lerAbaComoObjetos_('registros_aula') — 1.566 linhas reais
  avaliacoes: object[],  // lerAbaComoObjetos_('avaliacoes') — 188 linhas reais
  eventos: object[],     // lerAbaComoObjetos_('extracurriculares') — 664 linhas reais
}
```

Vida útil: uma única chamada a `getDsaSemanal`, nunca persistido, nunca cacheado entre requisições
(research.md §3, "Alternatives considered"). Consumido por `detectarConflitosDsa_(dataIso, dados)` e
`blocosBrutosDoDia_(idTurma, dataIso, dados)`, que passam a filtrar os 4 arrays em memória em vez de
reler o banco.

## 2. Deep-link de roteamento — estado de boot (research.md §1)

```text
destinoInicial (const, `app/layout.tsx`, calculado 1x no boot) =
  (DEEP_LINK_EDITAR_INSTRUTOR || DEEP_LINK_NOVO_INSTRUTOR) ? 'tabInstrutores'
  : (window.location.hash sem '#') || 'tabInicio'
```

Não é uma entidade de dado — é a lógica de decisão de qual `[data-view]` fica visível no primeiro
`irPara()` do boot. Os 2 valores de origem (`DEEP_LINK_EDITAR_INSTRUTOR`/`DEEP_LINK_NOVO_INSTRUTOR`)
já existem como scriptlets injetados por `app/layout.tsx` (layout raiz) (``app/layout.tsx` + `lib/supabase/server.ts``, specs 014/016) — nenhuma
mudança nessa injeção, só em como o boot os consome.

## 3. Nenhuma mudança em entidades persistidas

`instrutores`, `registros_aula`, `avaliacoes`, `atividades_nao_letivas`,
`turmas`: zero coluna nova, zero renomeação, zero linha alterada por este hotfix.
