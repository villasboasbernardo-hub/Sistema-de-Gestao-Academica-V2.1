# Research — Hotfix: Filtros Avançados, Cross-Filtering e Terminologia no Módulo de Instrutores

Nenhum `NEEDS CLARIFICATION` restou em `plan.md` — as 2 ambiguidades reais desta spec (união
Curso↔Instrutor; escopo dos 2 formulários) já foram resolvidas em `/speckit-clarify`. Este documento
registra as 5 decisões técnicas de implementação.

## 1. Dados carregados no boot, sem endpoint novo (FR-005/006/014)

**Decisão**: `app/(app)/instrutores/page.tsx` passa a carregar, num único `Promise.all` no boot (evento
`contexto-pronto`, mesmo gatilho de hoje):
```js
Promise.all([
  gs('listarInstrutoresComCargaHoraria'),
  gs('listarDisciplinas'),
  gs('crudListar', 'instrutor_disciplina'),
]).then(([instrutores, disciplinas, vinculos]) => { /* enriquecimento + primeira renderização */ });
```
`crudListar('instrutor_disciplina')` já é uma chamada genérica exposta e já usada exatamente assim
por `app/(app)/avaliacoes/page.tsx`/`app/(app)/turmas/[turma]/dsa/page.tsx` (`gs('crudListar', 'instrutor_disciplina')`, confirmado por
grep) — nenhuma função de backend nova. "Classificação de Curso" não precisa de nenhuma leitura
adicional: `AppState.ctx.cursos` (``app/layout.tsx` + `lib/supabase/server.ts``, já carregado no boot de toda a SPA) já traz
`{idCurso, nome, classificacao, status}` prontos.

**Rationale**: Cumpre FR-014 (zero chamada nova por mudança de filtro) com o menor endpoint novo
possível — na prática, zero, reaproveitando um padrão de leitura genérica já usado por 2 outras
telas do mesmo módulo de domínio (Avaliações, DSA), que já cruzam os mesmos 3 dados
(instrutores/disciplinas/vínculos) para propósitos correlatos.

**Alternatives considered**:
- Uma função de backend nova (`getDadosFiltroInstrutores()`) agregando os 3 conjuntos numa única
  resposta: rejeitado — não reduz o número de chamadas de rede de forma perceptível (`Promise.all`
  já paraleliza as 3 chamadas existentes) e introduz uma função nova só para reempacotar dados que já
  têm endpoint de leitura genérico aprovado (`crudListar`) — mais superfície de manutenção sem
  ganho.
- Adicionar `vinculos`/`disciplinas` ao retorno de `listarInstrutoresComCargaHoraria()`: rejeitado —
  misturaria duas responsabilidades na mesma função (instrutores enriquecidos com CH vs. dados de
  outras abas), e outros consumidores futuros de `listarInstrutoresComCargaHoraria()` pagariam o
  custo de ler 2 abas extras que não precisam.

## 2. Motor de cross-filtering: enriquecimento uma vez, filtro puro a cada mudança (FR-005/007/009/013/015/016)

**Decisão**: Após o boot, uma função pura `enriquecerInstrutoresParaFiltros_(instrutores, vinculos,
disciplinas)` roda **uma única vez** (não a cada mudança de filtro), anexando a cada instrutor os
atributos derivados que os filtros precisam:
```js
function enriquecerInstrutoresParaFiltros_(instrutores, vinculos, disciplinas) {
  const cursoPorGrade = {};
  (disciplinas || []).forEach(d => { cursoPorGrade[d.ID_Grade] = d.ID_Curso; });

  const qualificadosSet = new Set();
  const cursosPorInstrutor = {}; // ID_Instrutor -> Set(ID_Curso), uniao qualificacao+selecao (FR-005)
  (vinculos || []).forEach(v => {
    if (v.Status !== 'Ativo') return;
    const id = String(v.ID_Instrutor || '').trim();
    if (!id) return;
    qualificadosSet.add(id);
    const idCurso = cursoPorGrade[v.ID_Grade];
    if (idCurso) (cursosPorInstrutor[id] = cursosPorInstrutor[id] || new Set()).add(idCurso);
  });

  const selecionadosSet = new Set();
  (disciplinas || []).forEach(d => {
    String(d.ID_Instrutor || '').split(',').map(s => s.trim()).filter(Boolean).forEach(id => {
      selecionadosSet.add(id);
      (cursosPorInstrutor[id] = cursosPorInstrutor[id] || new Set()).add(d.ID_Curso);
    });
  });

  return instrutores.map(i => {
    const id = String(i.ID_Instrutor);
    return Object.assign({}, i, {
      _circuloHierarquico: CIRCULO_HIERARQUICO_POR_POSTO[i.Posto_Graduacao] || '',
      _qualificado: qualificadosSet.has(id),
      _selecionado: selecionadosSet.has(id),
      _cursosVinculados: cursosPorInstrutor[id] || new Set(),
    });
  });
}
```
A cada mudança de filtro, uma função pura separada `instrutorPassaNosFiltros_(instrutorEnriquecido,
filtrosAtivos, classificacaoPorCurso)` só lê os atributos já calculados (nunca refaz o cruzamento de
`instrutor_disciplina`/`disciplinas`) — é um `.filter()` O(n) sobre 177 objetos já prontos,
mesma ordem de grandeza que o `.filter()` client-side já existente hoje.

**Rationale**: Separar "enriquecer uma vez" de "filtrar a cada mudança" evita refazer o mesmo
cruzamento de dados centenas de vezes numa sessão de uso — o custo caro (montar os `Set`s por
instrutor) roda uma vez por carga de tela, não uma vez por clique de filtro. `_qualificado`/
`_selecionado`/`_circuloHierarquico`/`_cursosVinculados` como propriedades prefixadas com `_`
seguem a mesma convenção de "atributo calculado, não persistido" já usada em `cargaHorariaMinistrada
Ano` (sem `_` porque essa vem do backend, mas o espírito de "atributo anexado, não do schema" é o
mesmo).

**Alternatives considered**:
- Recalcular o cruzamento inteiro a cada mudança de filtro (sem fase de enriquecimento separada):
  rejeitado — refaz os mesmos 3 `forEach` sobre ~599 vínculos e todas as disciplinas a cada clique,
  desperdício sem necessidade quando o dado bruto não mudou.
- Manter os atributos derivados como estruturas paralelas (mapas por `ID_Instrutor`) em vez de
  anexados ao próprio objeto instrutor: rejeitado — o predicado de filtro e a listagem já iteram
  sobre o array de instrutores; anexar os atributos evita um lookup extra por instrutor a cada
  predicado e mantém uma única fonte por registro (mesmo espírito de `cargaHorariaMinistradaAno` já
  anexado pelo backend).

## 3. Re-render de gráfico sem empilhar instâncias — `renderizarGrafico_` ganha registro (FR-016, "chart.updateSeries")

**Decisão**: `renderizarGrafico_` (`components/ciaara/`) passa a manter um registro de instâncias por
`elementoId` e destruir a anterior antes de criar a nova:
```js
const _instanciasGraficos = {};
function renderizarGrafico_(elementoId, tipo, categorias, series) {
  const elemento = document.querySelector('#' + elementoId);
  if (!elemento) return;
  if (_instanciasGraficos[elementoId]) { _instanciasGraficos[elementoId].destroy(); }
  const ehFatia = tipo === 'donut' || tipo === 'pie';
  const opcoes = ehFatia
    ? { chart: { type: tipo, height: 260 }, labels: categorias, series: series }
    : { chart: { type: tipo, height: 260 }, series: [{ data: series }], xaxis: { categories: categorias } };
  const grafico = new Recharts(elemento, opcoes);
  _instanciasGraficos[elementoId] = grafico;
  grafico.render();
}
```
Assinatura e comportamento para quem chama uma única vez (os outros 3 painéis de estatística do
projeto — Cursos/Disciplinas/Turmas) ficam idênticos: `destroy()` de uma instância inexistente nunca
acontece nesse caso (primeira chamada sempre encontra o registro vazio).

**Rationale**: O pedido cita `chart.updateSeries` como exemplo de "atualização em tempo real", mas o
critério de aceite real é comportamental ("gráficos... recebem a nova matriz de dados filtrada e se
atualizam"), não a API específica. `destroy()`+recriar é funcionalmente equivalente do ponto de vista
do usuário (instantâneo, sem chamada de rede) e uniforme entre os 2 tipos de gráfico usados nesta
tela (`bar` e `donut`) — `updateSeries()`/`updateOptions()` do Recharts exigem chamadas parciais
diferentes por tipo (categorias para `bar`, `labels` para `donut`), dobrando os caminhos de código
para um ganho de performance imperceptível em conjuntos de ~177 registros.

**Decisão adicional (achado do `/speckit-analyze`, U1)**: FR-016 exige que os KPIs/gráficos fiquem
corretos "mesmo que o painel de estatísticas não esteja visível" no momento da mudança de filtro —
isso é sobre o **estado** ficar correto, não sobre **tocar o DOM** de um painel escondido. A
implementação recalcula `agregarEstatisticasInstrutores_` (decisão 2) e mantém o resultado pronto a
cada mudança de filtro, mas só chama `renderizarGrafico_` (decisão acima) quando o painel de
estatísticas está visível **ou** acabou de ser expandido — nunca contra um container `display:none`.
Isso satisfaz FR-016 (o painel nunca mostra dado desatualizado quando fica visível) e FR-017 (1ª
expansão já nasce filtrada) sem o custo/risco de recriar gráficos em elementos ocultos a cada clique
de filtro.

**Alternatives considered**:
- Recriar os 7 gráficos a cada mudança de filtro mesmo com o painel oculto: rejeitado — custo sem
  benefício perceptível (usuário não vê), e ainda arrisca side effects de Recharts operando sobre
  um elemento com `display:none` (dimensão zero no momento da renderização).
- `chart.updateSeries()`/`updateOptions()` parciais, guardando a instância e nunca destruindo:
  rejeitado pelo motivo de uniformidade acima — moveria a complexidade de "2 tipos de gráfico, 2 APIs
  de update" para dentro do componente compartilhado, sem benefício de performance mensurável nesta
  escala.
- Não tocar `renderizarGrafico_`, criando uma função paralela só para `app/(app)/instrutores/page.tsx`:
  rejeitado — duplicaria o componente que RF-DS-05 explicitamente pede como único e reutilizável
  (mesmo racional já usado para não duplicar `formatarNomeInstrutor_` na spec 014), e os outros 3
  painéis também se beneficiariam da correção se algum dia precisarem re-renderizar (ex.: um filtro
  futuro no painel de Cursos).

## 4. Círculo Hierárquico (FR-009, achado 4)

**Decisão**: Mapa fechado client-side, reaproveitando os mesmos 10 códigos (dos 11 de `ESCALA_
ANTIGUIDADE_POSTO`, menos `SC`) já formalizados na spec 014:
```js
const CIRCULO_HIERARQUICO_POR_POSTO = {
  CMG: 'Oficiais', CF: 'Oficiais', CC: 'Oficiais', CT: 'Oficiais',
  '1ºTen': 'Oficiais', '2ºTen': 'Oficiais',
  SO: 'Praças', '1ºSG': 'Praças', '2ºSG': 'Praças', '3ºSG': 'Praças',
};
```
`SC` (Servidor Civil) fica ausente do mapa de propósito — `CIRCULO_HIERARQUICO_POR_POSTO['SC']` é
`undefined`, normalizado para string vazia (`''`) no enriquecimento, nunca casando com "Oficiais" nem
"Praças" (Edge Case de `spec.md`).

**Rationale**: Não existe campo de Círculo Hierárquico na base — é 100% derivado de `Posto_Graduacao`,
e a fronteira Oficial/Praça é um fato de domínio militar estável (não uma regra normativa sujeita a
mudança de configuração, Princípio VII), mesmo tratamento já dado a `ESCALA_ANTIGUIDADE_POSTO`.

**Alternatives considered**:
- Incluir `SC` num 3º valor "Civis" no filtro: rejeitado — fora do pedido explícito do usuário, que
  definiu só 2 valores para esta categoria (Assumptions de `spec.md`); adicionar uma 3ª opção não
  pedida mudaria SC-002 ("cobrindo exatamente as categorias e o domínio de valores exigidos").

## 5. Terminologia "qualificado" (FR-001/002/003, achado 6)

**Decisão**: Troca de texto pura, nos 6 pontos já inventariados em `spec.md` achado 6 — sem tocar
nome de função/variável nem o vocabulário normativo dos documentos de referência. Os cálculos por
trás de "Qualificados" continuam sendo literalmente `contarHabilitadosDistintos_`-equivalente (agora
`qualificadosSet` no enriquecimento client-side, decisão 2 acima) — mesma fonte de dado, novo rótulo.

**Rationale**: Já coberto em `spec.md` (FR-001/002/003, Assumptions) — sem decisão técnica adicional
além de garantir que a troca de rótulo e a migração da lógica de agregação para o cliente (decisão 2)
não se confundam: o teste novo de `tests/unidade/filtros_cross_instrutores.test.ts` valida o **cálculo**
("Qualificados" = vínculo ativo), nunca o texto exibido (isso é inspeção visual, `quickstart.md`).

**Alternatives considered**: Nenhuma — é a implementação direta do requisito, sem ambiguidade técnica
restante após `spec.md`/`/speckit-clarify`.
