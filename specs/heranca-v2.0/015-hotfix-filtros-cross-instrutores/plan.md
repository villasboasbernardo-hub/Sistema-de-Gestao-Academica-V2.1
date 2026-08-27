# Implementation Plan: Hotfix — Filtros Avançados, Cross-Filtering e Terminologia no Módulo de Instrutores

**Branch**: `015-hotfix-filtros-cross-instrutores` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/015-hotfix-filtros-cross-instrutores/spec.md`

## Summary

Reescrita da barra de filtros e do motor de estatísticas de `app/(app)/instrutores/page.tsx`, sem nenhuma
mudança de schema. A barra passa de 5 para 8 caixas de seleção estritas (achado 2); 4 delas (Curso,
Classificação de Curso, Status, Círculo Hierárquico) não existem hoje em nenhuma forma e exigem
atributos derivados calculados uma única vez, no boot, a partir de dados já existentes (`instrutor_disciplina`, `disciplinas`, `AppState.ctx.cursos`) — nenhuma coluna nova, nenhum endpoint novo:
o vínculo `instrutor_disciplina` é lido via `crudListar('instrutor_disciplina')`, já exposto e já
usado por `app/(app)/avaliacoes/page.tsx`/`app/(app)/turmas/[turma]/dsa/page.tsx` hoje. A mudança arquitetural central é mover o cálculo
dos 4 KPIs e das 7 séries de gráfico de `getEstatisticasInstrutores` (backend, chamado uma única vez
hoje) para funções puras client-side em `app/(app)/instrutores/page.tsx`, operando sobre o conjunto completo já
carregado no boot — é a única forma de cumprir "qualquer mudança de filtro re-renderiza listagem E
gráficos, sem chamada ao servidor" (FR-014/016). `getEstatisticasInstrutores`/`RÓTULOS_CATEGORIA`
(`lib/acoes/estatisticas.ts`) ficam sem nenhum consumidor após esta mudança e são removidos (confirmado por
grep antes desta spec, mesmo precedente do roteador morto removido no Épico D); as 4 funções puras já
testadas de `lib/acoes/instrutores.ts` (`ordenarPorAntiguidadePosto_`/`contarHabilitadosDistintos_`/
`contarSelecionadosDistintos_`/`ESCALA_ANTIGUIDADE_POSTO`) são mantidas como estão, mesmo órfãs de
chamador em produção — carregam teste nomeado de regra Risco Alto (RN-ANT-01) que seria perdido sem
um motivo forte o suficiente para justificar (Constitution Check abaixo). `renderizarGrafico_`
(`components/ciaara/`, componente único reutilizado pelos 4 painéis de estatística do projeto) ganha um
registro de instâncias para `destroy()` a instância anterior antes de recriar — sem essa mudança,
re-renderizar um gráfico já existente empilharia instâncias duplicadas de Recharts no mesmo
container a cada mudança de filtro. A substituição terminológica "habilitado"→"qualificado" é texto
puro, sem risco técnico, aplicada nos mesmos pontos da reescrita.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Recharts. Tailwind CSS + shadcn/ui
nativo para os 5 `<select>` novos (Curso, Classificação de Curso, Status, Posto/Graduação, Círculo
Hierárquico — nenhum dos 5 existia como filtro na barra atual; Posto/Graduação só existia como
critério de ordenação, nunca como filtro), substituindo Regime/Escolaridade que saem — mesmo padrão
de todo `<select>` já existente nesta tela, nenhuma biblioteca de filtro nova.

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — `instrutores`, `instrutor_disciplina`, `disciplinas`, todas já
existentes e já lidas por esta tela ou por telas irmãs (`app/(app)/avaliacoes/page.tsx`/`app/(app)/turmas/[turma]/dsa/page.tsx` já leem
`instrutor_disciplina` via `crudListar`). **Nenhuma coluna nova, nenhuma aba nova** — restrição
explícita do pedido ("ZERO alterações nas lógicas de gravação do banco de dados").

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: N/A — mesma ordem de grandeza já aceita nesta tela desde a spec 014 (177
instrutores, 599 vínculos `instrutor_disciplina` — número confirmado no quickstart da spec 014,
2026-08-17 —, dezenas de disciplinas/cursos): toda a filtragem e
agregação são operações em memória sobre arrays já carregados, sem paginação nem chamada de rede por
filtro (constraint central do pedido, FR-014).

**Constraints**: Zero mudança de schema físico; zero nova dependência JS; zero nova chamada de
a Server Action disparada por mudança de filtro (só no boot da tela, achado 3); os 2 formulários
existentes (vínculo de qualificação, cadastro de instrutor) permanecem intocados pelos filtros
(FR-019, Clarifications 2026-08-17).

**Scale/Scope**: 3 arquivos de produção tocados — `app/(app)/instrutores/page.tsx` (reescrita da
barra de filtros, motor de cross-filtering client-side, terminologia), `components/ciaara/`
(`renderizarGrafico_` ganha registro de instâncias para suportar re-render), `lib/acoes/
`lib/acoes/estatisticas.ts`` (remoção de `getEstatisticasInstrutores`/`RÓTULOS_CATEGORIA`, órfãos de chamador).
1 arquivo de teste novo (`tests/unidade/filtros_cross_instrutores.test.ts`) + 1 arquivo de teste existente
editado (`tests/unidade/regras_ui_dados.test.ts` — remoção dos 5 casos órfãos que testavam
`getEstatisticasInstrutores` diretamente, `contracts/server-functions.md`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Princípio I (Fidelidade à Fase 1)**: Nenhum `RF-`/`RN-` novo é introduzido; a única regra tocada é
  `RN-ANT-01` (Risco Alto, ordenação por antiguidade), já formalizada na spec 014 e agora estendida ao
  filtro de Posto/Graduação e ao cálculo de Círculo Hierárquico (derivado da mesma escala, não uma
  regra nova). **PASSA**.
- **Princípio II (Preservação de Regras de Negócio)**: Nenhuma regra de cálculo muda — "Qualificados"
  continua sendo exatamente o cálculo de "Habilitados" de hoje (`instrutor_disciplina.Status=Ativo`,
  FR-003/007); é rótulo, não lógica. Risco real identificado: mover a agregação para o cliente cria
  uma SEGUNDA implementação da mesma lógica (a de `instrutor_disciplina.ts`/pure functions do backend,
  hoje órfã, e a nova client-side) — mitigado documentando explicitamente a duplicação e cobrindo a
  versão client-side com teste dedicado (Technical Context acima), mesmo padrão de risco já aceito
  para `ORDEM_ANTIGUIDADE_POSTO` duplicado cliente/servidor desde a spec 014. **PASSA, com nota**.
- **Princípio III (Restrição de Plataforma)**: Nenhuma dependência nova; Recharts já aprovado.
  **PASSA**.
- **Princípio IV (Integridade do Histórico)**: Não aplicável — nenhuma migração/saneamento de dado
  nesta spec, só leitura e apresentação.
- **Princípio V (Degradação Segura)**: Instrutor com `Posto_Graduacao` fora do domínio de 11 conhecidos
  não quebra o filtro Círculo Hierárquico (Edge Case de `spec.md`: simplesmente não pertence a nenhuma
  das 2 opções, nunca lança exceção); combinação de filtros sem resultado mostra estado vazio claro em
  listagem/KPIs/gráficos (FR-018), nunca tela em branco ou erro de script. **PASSA**.
- **Princípio VI (Mudança Cirúrgica, Validada por Invariantes)**: 3 arquivos de produção, cada mudança
  isolada. A mudança em `components/ciaara/` (`renderizarGrafico_`) é a única que toca um componente
  compartilhado pelos 4 painéis de estatística do projeto (Cursos/Disciplinas/Instrutores/Turmas) —
  mitigado por ser estritamente aditiva/retrocompatível (destruir uma instância que não existe ainda é
  no-op; os outros 3 painéis continuam chamando a função exatamente como hoje, sem nenhuma mudança de
  assinatura) e por research.md §3 documentar a decisão e a verificação manual dos 4 painéis no
  `quickstart.md`. **PASSA, com nota**.
- **Princípio VII (Configuração Sobre Constante)**: `CIRCULO_HIERARQUICO_POR_POSTO` (novo mapeamento
  client-side, Oficiais/Praças) é uma taxonomia fechada de 10 códigos reais, mesmo critério já aceito
  para `ESCALA_ANTIGUIDADE_POSTO`/`CLASSIFICACOES_ORDEM_CURSO` — não é limite normativo nem dado anual
  do PROENS. **PASSA**.
- **Princípio VIII (Rastreabilidade)**: Todo FR de `spec.md` cita o achado que o motivou; a remoção de
  `getEstatisticasInstrutores`/`RÓTULOS_CATEGORIA` é documentada com o grep que confirma zero
  consumidor restante (Summary acima), mesmo padrão da remoção do roteador morto no Épico D. As 4
  funções puras órfãs mantidas em `lib/acoes/instrutores.ts` (não removidas) ficam documentadas como decisão
  deliberada — ver Complexity Tracking. **PASSA**.
- **Princípio IX (Contenção de Escopo)**: Escopo restrito aos 3 arquivos listados; `Regime_Trabalho`/
  `Nivel_Escolaridade` saem da barra de filtros por não estarem nas 8 categorias estritas do pedido,
  mas nenhuma coluna/dado é removido (Assumptions de `spec.md`). **PASSA**.

Nenhuma violação bloqueante. 1 entrada em Complexity Tracking (funções órfãs mantidas por cobertura de
teste de regra Risco Alto — exceção deliberada ao precedente de "remover código morto confirmado").

### Re-check pós-Fase 1 (após research.md/data-model.md/contracts/quickstart.md)

Nenhum gate mudou de veredito depois do desenho detalhado. Confirmações específicas:
- Princípio II (nota acima): `data-model.md` §2/§5 e `contracts/server-functions.md` deixam explícito
  que o cálculo client-side (`enriquecerInstrutoresParaFiltros_`/`agregarEstatisticasInstrutores_`) é
  a única implementação em produção depois da remoção de `getEstatisticasInstrutores` — não há duas
  implementações rodando simultaneamente, só uma nova (client) substituindo a antiga (backend), mais
  as 4 funções puras órfãs mantidas só por cobertura de teste (Complexity Tracking), nunca chamadas
  em produção. Risco de divergência cliente/servidor não se materializa porque não há mais servidor
  computando a mesma coisa.
- Princípio VI (nota acima): `research.md` §3 detalha a mudança em `renderizarGrafico_` como
  estritamente aditiva (registro de instâncias, `destroy()` de instância inexistente é no-op) e
  `quickstart.md` não inclui um passo dedicado aos outros 3 painéis porque nenhum comportamento deles
  muda — confirmado pela própria natureza aditiva da mudança, não por necessidade de novo teste
  manual.

Nenhuma entrada nova em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/015-hotfix-filtros-cross-instrutores/
├── plan.md                     # Este arquivo (/speckit-plan)
├── research.md                 # Fase 0 (/speckit-plan)
├── data-model.md               # Fase 1 (/speckit-plan)
├── contracts/server-functions.md  # Fase 1 (/speckit-plan)
├── quickstart.md               # Fase 1 (/speckit-plan) — roteiro de verificação manual
├── checklists/requirements.md  # já criado no /speckit.specify
└── tasks.md                    # Fase 2 (/speckit-tasks — ainda não criado)
```

### Source Code (repository root)

Projeto existente, estrutura já estabelecida desde o Épico E/B (`docs/arquitetura/
02-modularizacao.md`) — nenhuma pasta nova, nenhum arquivo de view novo:

```text
src/
├── backend/
│   └── `lib/acoes/estatisticas.ts`      # getEstatisticasInstrutores() e RÓTULOS_CATEGORIA REMOVIDOS (órfãos
│                             # de chamador após esta mudança, confirmado por grep) — as 4 funções
│                             # puras de `lib/acoes/instrutores.ts` (ordenarPorAntiguidadePosto_ etc.) e
│                             # contarPorChave_ (ainda usada por getEstatisticasCursos/Turmas) NÃO
│                             # são tocadas
└── frontend/
    ├── `components/ciaara/`           # renderizarGrafico_() ganha registro de instâncias Recharts para
    │                          # destroy()+recriar em vez de empilhar (research.md §3)
    └── `app/(app)/instrutores/page.tsx`  # reescrita da barra de filtros (5→8 categorias), motor de
                               # cross-filtering client-side (enriquecimento + predicado + agregação
                               # de KPIs/gráficos, todas funções puras testáveis), terminologia
                               # "qualificado" nos 6 pontos de UI do achado 6 de spec.md

tests/
└── filtros_cross_instrutores.test.ts   # novo — enriquecimento (união qualificação/seleção,
                                          # círculo hierárquico), predicado combinado de 8 filtros
                                          # (E lógico, achados de Edge Cases), agregação de
                                          # KPIs/gráficos sobre subconjunto filtrado
```

**Structure Decision**: Nenhuma view nova, nenhuma rota nova. As funções puras novas ficam dentro do
`<script>` de `app/(app)/instrutores/page.tsx` (não em `components/ciaara/`) porque são específicas do domínio de
Instrutores (mesmo critério já usado para `ordenarInstrutoresPorAntiguidade_`/`ORDEM_ANTIGUIDADE_
POSTO`, já duplicados nesse arquivo desde a spec 014) — só `renderizarGrafico_` (genérica, usada pelos
4 painéis de estatística do projeto) é tocada em `components/ciaara/`, e de forma estritamente aditiva.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|---------------------------------------|
| `ordenarPorAntiguidadePosto_`/`contarHabilitadosDistintos_`/`contarSelecionadosDistintos_`/`ESCALA_ANTIGUIDADE_POSTO` (`lib/acoes/instrutores.ts`) mantidas mesmo sem nenhum chamador em produção após esta spec | Carregam o teste nomeado de `RN-ANT-01` (Risco Alto, Constitution Princípio VIII) e dos achados 5/6 da spec 014 em `tests/unidade/design_system.test.ts`/`tests/unidade/regras_ui_dados.test.ts` — removê-las exigiria mover ou duplicar essa cobertura de teste, escopo maior que o de um hotfix, e resultaria em regra Risco Alto sem teste backend algum no intervalo | Remover junto com `getEstatisticasInstrutores` (mesmo precedente do roteador morto do Épico D) foi rejeitado porque, ao contrário do roteador (zero valor, zero teste), estas 4 funções são pequenas, sem efeito colateral, e continuam documentando a implementação de referência de uma regra Risco Alto — o custo de mantê-las é nulo (não são código de nível superior executável, não violam o gotcha de Next.js) e reaproveitáveis se um consumidor futuro não-UI (relatório, exportação) precisar da mesma agregação server-side |
