# Contrato — Funções de servidor (Hotfix: Filtros, Cross-Filtering e Terminologia, Módulo de Instrutores)

Expostas via Server Action (chamada direta, tipada). **Nenhuma função de backend nova
nesta spec** — o motor de cross-filtering é inteiramente client-side (research.md §1/2).

## `lib/acoes/instrutores.ts`

### `listarInstrutoresComCargaHoraria()` (inalterada)

- Continua devolvendo a mesma forma de hoje (spec 014). Único ponto de leitura de instrutores desta
  tela, chamado uma vez no boot.

### `listarDisciplinas()` (inalterada)

- Já existente, já chamada por esta tela hoje (`carregarDisciplinasParaVinculo`). Passa a ser
  aguardada no mesmo `Promise.all` do boot, em vez de disparada separadamente — mesma função, mesmo
  retorno, só o ponto de chamada muda.

### `crudListar('instrutor_disciplina')` (genérica, já existente — novo consumidor)

- Função genérica de `lib/acoes/crud.ts` (`CRUD_CONFIG['instrutor_disciplina'].leitura = PERFIS_TODOS`), já
  exposta a Server Action e já chamada exatamente assim (`gs('crudListar', 'instrutor_disciplina')`) por `app/(app)/avaliacoes/page.tsx`/`app/(app)/turmas/[turma]/dsa/page.tsx` (confirmado por grep antes desta spec).
  `app/(app)/instrutores/page.tsx` passa a ser um terceiro consumidor, sem nenhuma mudança na função em si.

## `lib/acoes/estatisticas.ts`

### `getEstatisticasInstrutores()` — **REMOVIDA**

- Zero consumidor após esta spec (confirmado por grep: só `app/(app)/instrutores/page.tsx` chamava, e essa
  chamada é substituída pela agregação client-side, `data-model.md` §5). Removida por completo,
  mesmo precedente da remoção do roteador morto `registrarRota`/`ROTAS[hash]` no Épico D.
- `RÓTULOS_CATEGORIA` (constante auxiliar, só usada dentro desta função) — **removida junto**, e
  recriada como constante client-side em `app/(app)/instrutores/page.tsx` (mesmo valor, research.md/data-model
  não repetem o mapa aqui — ver achado 4 da spec 014 para os 4 pares `Categoria`→rótulo).
- `contarPorChave_` (auxiliar genérica) — **mantida**, ainda usada por `getEstatisticasCursos()`/
  `getEstatisticasTurmas()` (confirmado por grep, nenhuma mudança nesta spec).

### Nenhuma outra função de `lib/acoes/estatisticas.ts` é tocada

- `getEstatisticasCursos()`, `getEstatisticasDisciplinas()`, `getEstatisticasTurmas()`,
  `dedupCursosPorId_()`: inalteradas.

## `lib/acoes/crud.ts`

- Nenhuma mudança. `COLUNAS_FORMULA['instrutores']` (proteção de `Instrutor_Completo`/`Carga_
  Horaria_Ministrada_Ano`, spec 014) permanece como está — esta spec não toca a tela de edição nem o
  caminho de escrita.

## Funções puras de `lib/acoes/instrutores.ts` — mantidas, sem chamador em produção após esta spec

`ordenarPorAntiguidadePosto_`, `contarHabilitadosDistintos_`, `contarSelecionadosDistintos_`,
`ESCALA_ANTIGUIDADE_POSTO`: **não removidas** — decisão deliberada, `plan.md` Complexity Tracking
(mantêm cobertura de teste de `RN-ANT-01`, Risco Alto). Continuam existindo no backend, apenas sem
nenhum caminho de execução em produção que as invoque depois que `getEstatisticasInstrutores` sai.
`somarCargaHorariaPorInstrutor_` **não é órfã** — continua chamada por `listarInstrutoresComCarga
Horaria()`.

## Frontend — funções puras novas, não expostas a Server Action

Todas em `app/(app)/instrutores/page.tsx` (mesmo critério de localização de `ordenarInstrutoresPorAntiguidade_`
já existente nesse arquivo desde a spec 014 — específicas do domínio de Instrutores, não genéricas o
suficiente para `components/ciaara/`):

- `enriquecerInstrutoresParaFiltros_(instrutores, vinculos, disciplinas)` — research.md §2,
  data-model.md §2. Roda uma vez por carga/recarga de dados brutos.
- `instrutorPassaNosFiltros_(instrutorEnriquecido, filtrosAtivos, classificacaoPorCursoNormalizada)`
  — data-model.md §4. Roda a cada mudança de filtro, uma vez por instrutor.
- `agregarEstatisticasInstrutores_(instrutoresFiltrados)` — data-model.md §5. Roda a cada mudança de
  filtro (só quando o painel de estatísticas está visível ou acabou de ficar visível, research.md/
  `plan.md` — nunca contra DOM oculto).
- `CIRCULO_HIERARQUICO_POR_POSTO` (constante) — research.md §4.
- `RÓTULOS_CATEGORIA_FILTRO` (constante, nova) — rótulos do filtro Categoria (FR-010: "TTC",
  "Magistério Militar Naval", "Servidor Civil", "Militar da Ativa"), **distinta** de `RÓTULOS_
  CATEGORIA` (rótulos do gráfico "Classificação": "TTC", "Magistério Militar Naval", "Civis",
  "Militares da Ativa" — achado 4 da spec 014, divergência aceita em Assumptions de `spec.md`).
- `normalizarClassificacao_(valor)` — duplicada de `app/(app)/inicio/page.tsx` (Hotfix 013), mesmo padrão de
  duplicação de utilitário pequeno já aceito no projeto (`CLASSIFICACOES_ORDEM_CURSO` vs.
  `CLASSIFICACOES_ORDEM`).

## `components/ciaara/` — função existente com comportamento estendido

### `renderizarGrafico_(elementoId, tipo, categorias, series)` (assinatura preservada)

- **Mudança**: passa a destruir (`.destroy()`) a instância Recharts anterior daquele `elementoId`,
  se existir, antes de criar uma nova (research.md §3). Retrocompatível — os 3 outros painéis de
  estatística do projeto (Cursos/Disciplinas/Turmas), que chamam esta função uma única vez cada,
  continuam funcionando exatamente como hoje.
- **Regras**: FR-016 (research.md §3).

## Nenhuma outra função de backend ou de front-end exposta é criada, removida ou tem assinatura
alterada além das listadas acima.
