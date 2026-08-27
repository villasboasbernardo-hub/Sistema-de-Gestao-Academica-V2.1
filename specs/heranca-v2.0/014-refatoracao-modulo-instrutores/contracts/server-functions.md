# Contrato — Funções de servidor (Módulo de Instrutores)

Expostas via Server Action (chamada direta, tipada), exceto `app/layout.tsx` (entrada HTTP da
aplicação Next.js).

## ``app/layout.tsx` + `lib/supabase/server.ts``

### `app/layout.tsx` (layout raiz) (assinatura alterada — antes `app/layout.tsx`, sem parâmetro)

- **Parâmetros**: `e.parameter.editarInstrutor` (opcional) — `ID_Instrutor` a abrir já em edição.
- **Comportamento novo**: quando presente, o valor é passado ao template `Index` antes de
  `.evaluate()` (`template.deepLinkEditarInstrutor = e.parameter.editarInstrutor`); ausente,
  comportamento idêntico ao de hoje (string vazia).
- **Perfis**: inalterado — mesma checagem de `getUsuarioAtual()` já existente antes deste parâmetro
  ser lido; um `ID_Instrutor` inválido/de acesso não autorizado é tratado depois, no boot da SPA
  (não no `app/layout.tsx`), com mensagem de erro clara (Edge Case de `spec.md`).
- **Regras**: FR-010.1.

### `getContextoInicial()` (retorno ganha 1 campo aditivo)

- **Retorno**: ganha `urlWebApp: string` (`o runtime do Next.js.getService().getUrl()`) — usado para montar o
  link da nova aba de edição (research.md §2). Nenhum campo existente é removido ou renomeado.
- **Regras**: research.md §2 (fonte confiável da própria URL, evita depender de
  `window.location.href` dentro do a página servida pela Vercel).

## `lib/acoes/estatisticas.ts`

### `getEstatisticasInstrutores()` (assinatura preservada, cálculo/retorno reescritos)

- **Perfis**: `PERFIS_TODOS` (`exigirFuncao`, inalterado).
- **Parâmetros**: nenhum (inalterado).
- **Retorno**: forma nova, documentada em `data-model.md` — 5 KPIs, 7 séries de gráfico. Substitui
  integralmente o retorno anterior (`kpis: {total, ativos, inativos}`, `porPostoGraduacao` cru) —
  não há consumidor externo além de `app/(app)/instrutores/page.tsx` (única tela que chama esta função,
  confirmado por grep antes desta spec).
- **Regras**: FR-001 a FR-005.

## `lib/acoes/instrutores.ts`

### `listarInstrutores()` (inalterada)

- Continua devolvendo `crudListar('instrutores')` — forma e perfis inalterados. Ainda é a função
  usada pelo dropdown de vínculo de habilitação (FR-014) e por qualquer outro consumidor existente.

### `listarInstrutoresComCargaHoraria()` (nova)

- **Perfis**: `PERFIS_TODOS`.
- **Parâmetros**: nenhum.
- **Retorno**: mesma forma de `listarInstrutores()`, com `cargaHorariaMinistradaAno` calculado
  anexado a cada instrutor (`data-model.md`). Usada só pela listagem/dashboard de
  `app/(app)/instrutores/page.tsx` (FR-006), para não pagar o custo de ler
  `registros_aula` em toda chamada de `listarInstrutores()` (ex.: o dropdown de
  vínculo, que não precisa desse dado).
- **Regras**: FR-006, achado 5.

### Funções puras novas, não expostas a Server Action

- `ordenarPorAntiguidadePosto_(itensPorPosto)` — research.md §3. Entrada: array `{posto: string,
  quantidade: number}` (ou similar); saída: mesmo array reordenado por `ESCALA_ANTIGUIDADE_POSTO`,
  com `posto` substituído pelo nome por extenso.
- `contarHabilitadosDistintos_(vinculos)` / `contarSelecionadosDistintos_(disciplinas)` /
  `somarCargaHorariaPorInstrutor_(registros, anoCorrente)` — research.md §4.

## `lib/acoes/crud.ts`

### `COLUNAS_FORMULA['instrutores']` (nova entrada)

- **Valor**: `['Instrutor_Completo', 'Carga_Horaria_Ministrada_Ano']`.
- **Efeito**: `crudAtualizar('instrutores', id, obj)` passa a ignorar esses 2 campos mesmo se
  presentes em `obj` — nenhuma mudança de assinatura de `crudAtualizar` em si.
- **Regras**: FR-012, achado 7.

## Frontend — função pura corrigida, não exposta a Server Action

### `formatarNomeInstrutor_(instrutor)` (`components/ciaara/`, comportamento corrigido)

- **Entrada**: objeto instrutor com `Posto_Graduacao`, `Esp_Hab_Obs`, `Nome_Completo`,
  `Nome_Guerra` (mesma forma de sempre, nenhum campo novo exigido).
- **Saída**: string HTML `"P/G Esp_Hab_Obs Nome_Completo"`, com o trecho de `Nome_Guerra` (quando
  presente e substring de `Nome_Completo`) envolto em `<strong>`. Antes: usava só `Nome_Guerra`
  isolado (bug, achado 1) — agora usa `Nome_Completo` como base, `Nome_Guerra` vazio produz o nome
  completo sem negrito.
- **Regras**: FR-007, RF-INSTR-15/RF-DS-05. Consumida por `app/(app)/instrutores/page.tsx` **e**
  `app/(app)/turmas/[turma]/dsa/page.tsx` (mesmo componente compartilhado) — a correção beneficia as duas telas.

## Nenhuma outra função de backend ou de front-end exposta é criada, removida ou tem assinatura
alterada além das listadas acima.
