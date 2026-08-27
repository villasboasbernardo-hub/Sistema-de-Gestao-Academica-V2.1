# Phase 0 Research: Módulo Gerador de O.S. de Instrutoria

## 1. Fonte de dados de "aula realizada" e filtro comum

**Decisão**: Todo o motor de agrupamento parte de `registros_aula`, filtrado por
`Categoria_Normativa === 'Aula'` — mesmo filtro já usado por `somarCargaHorariaPorInstrutor_`
(`lib/acoes/instrutores.ts`, achado real de spec.md) para o mesmo tipo de agregação (carga horária x aulas
realizadas). Esta aba **não tem coluna `Status`** hoje (achado real) — não há `!== 'Cancelada'`
para checar, ao contrário do que `somarCargaHorariaPorInstrutor_` tenta (degrada silenciosamente,
RN-DEG-01, porque a coluna não existe). `lib/acoes/os-instrutoria.ts` não reproduz essa checagem morta.

**Rationale**: Fonte única e correta para "o que foi de fato ministrado" — `disciplinas`/
`turma_disciplina` são período *previsto*, nunca *realizado* (achado real de spec.md).

**Alternatives considered**: Basear em `turma_disciplina` (período previsto) — rejeitado
explicitamente pela spec (achado real): não reflete o que realmente aconteceu.

## 2. Filtro de recorte — modo Curso vs. modo Período (correção de planejamento)

**Decisão modo Curso**: mantém registros cujo `ID_Grade` resolve (via `disciplinas`) para
`ID_Curso === filtros.idCurso`, e cuja turma (`ID_Turma` → `turmas`) não está `Cancelada`.

**Decisão modo Período (correção em relação à leitura literal de FR-005)**: mantém registros cuja
própria `Data` cai dentro do intervalo do trimestre/semestre selecionado (`intervalosSeInterceptam_`
com `[Data, Data]` contra `[inicio, fim]`, ou comparação direta `inicio <= Data <= fim`), mais a
mesma checagem de turma não-cancelada. **Não** é necessário o filtro adicional de "turma cujo
período intercepta o recorte" que uma leitura mais literal do pedido original sugeria — diferente
da LIQ (spec 027), aqui a fonte é a `Data` real de cada aula já realizada, não um período previsto
com potenciais lacunas; filtrar direto pela `Data` do registro é ao mesmo tempo mais simples e mais
correto (uma turma pode intersectar 2 trimestres, mas só as aulas com `Data` dentro do trimestre
escolhido devem contar para aquele recorte — filtrar só por interseção de turma incluiria aulas de
fora do recorte).

**Rationale**: Simplicidade + correção — o objetivo do modo Período é "o que foi ministrado nesse
recorte de tempo", que é exatamente `Data` dentro do intervalo, sem indireção via período da turma.

**Alternatives considered**: Filtro por interseção de período da turma (como FR-005 sugeria por
analogia à spec 027) — rejeitado: incluiria aulas de fora do recorte quando a turma atravessa mais
de um trimestre/semestre (caso real confirmado na spec 027, achado de `C-Esp-ALH`).

## 3. `semestreParaIntervalo_(ano, semestre)` — novo, função pura

**Decisão**: `semestreParaIntervalo_(ano, semestre)` em `lib/acoes/os-instrutoria.ts` (não em `lib/acoes/liq.ts` —
Princípio VI, não acoplar 2 specs no mesmo arquivo), mesma forma de retorno de
`trimestreParaIntervalo_` (`{inicio, fim}` como string `'YYYY-MM-DD'`, mesma convenção de
comparação lexicográfica já estabelecida em `lib/acoes/aulas.ts`/`lib/dominio/regras-normativas.ts`/`lib/acoes/liq.ts`).
`semestre` ∈ {1,2}: 1º = `AAAA-01-01` a `AAAA-06-30`; 2º = `AAAA-07-01` a `AAAA-12-31` (Assumptions
de spec.md — calendário civil, mesma convenção do trimestre).

**Rationale**: "Semestre" não existe em nenhum lugar do código (achado real de spec.md) — função
nova necessária, mas trivial e simétrica a `trimestreParaIntervalo_` já existente.

## 4. Nome do instrutor sem formatação hierárquica

**Decisão**: `montarNoInstrutorOs_` usa `instrutor.Posto_Graduacao` + `instrutor.Nome_Completo`
diretamente, sem chamar nenhuma função de formatação — `formatarNomeInstrutor_` é frontend-only
(`components/ciaara/`), inacessível ao backend (achado real de spec.md, mesma restrição já enfrentada por
`montarDadosSecao1Liq_`/`montarDadosSecao2Liq_`, spec 027).

**Rationale**: Consistência com o precedente já estabelecido pela spec 027 para o mesmo problema
arquitetural.

## 5. Ordenação por antiguidade (RN-ANT-01, achado de planejamento)

**Decisão**: `calcularOsInstrutoria` ordena o array de nós de instrutor por
`instrutores.Antiguidade_Declarada` ascendente antes de retornar — mesma técnica validada e
corrigida pelo `/speckit-analyze` da spec 027 (usar a coluna já persistida diretamente, não
`ordenarInstrutoresPorAntiguidade_`/`ordenarPorAntiguidadePosto_`, que são frontend-only ou têm
assinatura incompatível).

**Rationale**: RN-ANT-01 (Risco Alto) é transversal a "toda lista, seletor ou filtro de
instrutores... sem exceção" — o pedido original não mencionou ordenação, mas omiti-la seria uma
regressão silenciosa de uma regra Risco Alto (Princípio II).

**Alternatives considered**: Ordenar por nome alfabético (mais comum em tabelas genéricas) —
rejeitado, violaria RN-ANT-01 diretamente.

## 6. Sem gate de perfil (RBAC) adicional

**Decisão**: `calcularOsInstrutoria` não chama `exigirFuncao` nem qualquer checagem de perfil
própria — mesmo padrão já usado por toda função de leitura-agregação existente
(`getEstatisticasCursos`, `gerarLiq`, nenhuma delas se auto-restringe além do acesso já implícito
ao módulo).

**Rationale**: Consistência com o precedente já estabelecido; introduzir um gate novo só para esta
função seria inconsistente com o resto do projeto sem um pedido explícito para isso.

**Alternatives considered**: Restringir a perfis de Administração Acadêmica — rejeitado por falta
de precedente e de pedido explícito; pode ser revisitado numa spec futura se necessário.
