# Implementation Plan: Hotfix — Regras Estritas de Nomenclatura Militar e Formatação

**Branch**: `018-hotfix-nomenclatura-militar` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/018-hotfix-nomenclatura-militar/spec.md`

## Summary

Reescrever `formatarNomeInstrutor_` (`components/ciaara/`) de uma função que recebe um único
objeto e sempre devolve HTML, para uma função com assinatura posicional
(`posto, esp, nomeCompleto, nomeGuerra, isHTML = false`) que aplica as 4 regras estritas de
concatenação por círculo hierárquico (Oficial/Praça/Civil) e a exceção de `CA` para Oficiais —
unificando os 5 pontos onde nome de instrutor é exibido hoje (2 já usam a função antiga, 1 já tem
uma gambiarra de `.replace` para arrancar HTML de dentro de uma `<option>`, 2 fazem concatenação
ad-hoc própria) sob a mesma função e as mesmas 4 regras. Mais uma mudança pequena e independente no
dropdown de `Esp_Hab_Obs` (mostrar "SIGLA - Nome", gravar só a sigla, já o comportamento atual).

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova.

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — hotfix de formatação de exibição, zero
mudança de schema, confirmado explicitamente no pedido)

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: N/A — mudança de formatação de string, sem impacto de performance
mensurável.

**Constraints**: Resultado 100% determinístico e sem exceção para qualquer combinação real de
posto/especialidade/nome, inclusive dado legado com artefatos de formatação (`"-HN"`, `"(T)"`,
achado 7 da spec 016) e instrutores sem `Nome_Guerra` preenchido (maioria da base real, achado da
spec 007). Nenhuma tag HTML pode aparecer dentro de uma `<option>` (FR-012).

**Scale/Scope**: 1 função reescrita (`components/ciaara/`), 5 pontos de chamada atualizados em 2 arquivos
(`app/(app)/turmas/[turma]/dsa/page.tsx` ×2, `app/(app)/instrutores/page.tsx` ×3), 1 linha alterada no dropdown de `Esp_Hab_Obs`
(`app/(app)/instrutores/page.tsx`), 10 testes existentes migrados + novos casos por regra de círculo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | N/A direto — hotfix de formatação de exibição (RF-INSTR-15/RF-DS-05, já citados pela função existente), não implementa nenhum RF-/RN- novo de Fase 1. **PASSA**. |
| II. Preservação de Regras de Negócio | Nenhuma regra `RN-` de negócio é tocada — é puramente como o nome é apresentado, nunca como é calculado/gravado (`Esp_Hab_Obs` continua gravando só a sigla, FR-015). **PASSA**. |
| III. Restrição de Plataforma | React, nenhuma dependência nova. **PASSA**. |
| IV. Integridade do Histórico | N/A — nenhuma migração/alteração de dado envolvida (confirmado: "ZERO alterações na estrutura das colunas do banco de dados"). |
| V. Degradação Segura | Todo ramo (posto fora dos círculos conhecidos, `Nome_Guerra` ausente, `Esp_Hab_Obs` vazio/com artefato legado) tem um resultado definido, nunca uma exceção não tratada — FR-006/FR-007/FR-010/Edge Cases de `spec.md`. **PASSA**. |
| VI. Mudança Cirúrgica | Uma função central reescrita + 5 pontos de chamada atualizados para o novo contrato — unidade de mudança pequena e coesa, testável isoladamente. **PASSA**. |
| VII. Configuração sobre Constante | N/A — os 3 círculos hierárquicos (Oficiais/Praças/Civil) são domínio fechado da Marinha, mesmo padrão de constante já aceito para `ESCALA_ANTIGUIDADE_POSTO`/`CIRCULO_HIERARQUICO_POR_POSTO`, não um limite normativo/dado anual do PROENS. |
| VIII. Rastreabilidade | Função já citada por `RF-INSTR-15`/`RF-DS-05` (documento 01) — mantido nas duas cópias (produção e teste). **PASSA**. |
| IX. Contenção de Escopo | Escopo limitado à formatação de exibição — nenhuma tabela/coluna redesenhada, nenhuma regra de negócio alterada, os 2 pontos que hoje deliberadamente omitem posto/especialidade (tabela de listagem, cabeçalho da Ficha) continuam omitindo (Assumptions de `spec.md`, evita duplicar a mesma informação na mesma tela). **PASSA**. |

Nenhuma violação — **Complexity Tracking não se aplica a este plano** (nenhuma exceção a
justificar).

## Project Structure

### Documentation (this feature)

```text
specs/018-hotfix-nomenclatura-militar/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md         # Fase 1
├── quickstart.md         # Fase 1
├── contracts/            # Fase 1
└── tasks.md              # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
app/
├── `components/ciaara/`              # formatarNomeInstrutor_ reescrita: assinatura posicional
                              # (posto, esp, nomeCompleto, nomeGuerra, isHTML), 4 regras de
                              # circulo + excecao CA, normalizacao de esp antes de concatenar
├── `app/(app)/turmas/[turma]/dsa/page.tsx`              # 2 pontos de chamada atualizados: celula da grade (isHTML=true),
                              # dropdown de lancamento manual de Aula (isHTML=false, remove o
                              # .replace(/<[^>]+>/g,'') gambiarra)
└── `app/(app)/instrutores/page.tsx`      # 3 pontos: coluna Nome Completo da listagem e cabecalho da Ficha
                              # (isHTML=true, posto/esp vazios - ja mostrados em outro lugar da
                              # mesma tela); dropdown de vinculo de qualificacao migra da
                              # concatenacao ad-hoc propria para a funcao unificada
                              # (isHTML=false); dropdown de Esp_Hab_Obs mostra "SIGLA - Nome"

tests/
└── design_system.test.ts    # 10 testes existentes MIGRADOS (nao aditivos) para a nova
                              # assinatura posicional, mais casos novos por regra de circulo
                              # (achado real: quebrariam com a assinatura antiga)
```

**Structure Decision**: Nenhuma estrutura nova — a correção toca 3 arquivos já existentes em
`app/`, seguindo a modularização via a importação de componentes/`o App Router` já em vigor desde o
Épico B (`docs/arquitetura/02-modularizacao.md`).

## Complexity Tracking

*Sem entradas — Constitution Check não encontrou violação a justificar (ver tabela acima).*

## Constitution Check — reavaliação pós-Fase 1

Nenhuma decisão de `research.md`/`data-model.md`/`contracts/` introduziu violação nova: a
normalização de `esp` (achado real, evita duplicar hífen/parênteses em dado legado) reaproveita a
mesma lógica já usada em `normalizarEspHabObs_` (spec 016), sem inventar mecanismo novo; os 3
círculos hierárquicos permanecem uma 3ª cópia da mesma constante já duplicada 2× no projeto
(`ORDEM_ANTIGUIDADE_POSTO`, `ESCALA_ANTIGUIDADE_POSTO`), mesmo padrão aceito para arquivos `.html`
que não importam `.ts`/outros `.html`. **Gate PASSA, inalterado em relação à pré-Fase 0.**
