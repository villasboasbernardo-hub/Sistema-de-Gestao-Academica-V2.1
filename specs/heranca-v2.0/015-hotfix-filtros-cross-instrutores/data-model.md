# Data Model — Hotfix: Filtros Avançados, Cross-Filtering e Terminologia no Módulo de Instrutores

Nenhuma coluna, aba ou entidade persistida nova (constraint do pedido). Este documento descreve só
as formas de dado **em memória**, client-side, que o motor de cross-filtering usa.

## 1. Dados brutos carregados no boot (inalterados, já existentes)

| Fonte | Função | Campos relevantes usados aqui |
|---|---|---|
| `instrutores` | `gs('listarInstrutoresComCargaHoraria')` | `ID_Instrutor`, `Nome_Completo`, `Nome_Guerra`, `Posto_Graduacao`, `Categoria`, `OM`, `Regime_Trabalho`, `Capacitacao_Didatica`, `Status`, `cargaHorariaMinistradaAno` (calculado pelo backend, achado 5 da spec 014) |
| `disciplinas` | `gs('listarDisciplinas')` | `ID_Grade`, `ID_Curso`, `ID_Instrutor` (CSV de selecionados, achado 6 da spec 014) |
| `instrutor_disciplina` | `gs('crudListar', 'instrutor_disciplina')` | `ID_Instrutor`, `ID_Grade`, `Status` (vínculo de qualificação) |
| `cursos` | `AppState.ctx.cursos` (já carregado no boot da SPA) | `idCurso`, `nome`, `classificacao`, `status` |

## 2. Instrutor enriquecido (derivado, em memória, não persistido)

Produzido por `enriquecerInstrutoresParaFiltros_` (research.md §2), uma vez por carga/recarga de
dados brutos (não a cada mudança de filtro):

```text
InstrutorEnriquecido = instrutores original + {
  cargaHorariaMinistradaAno: number,        // já vinha do backend, inalterado

  _circuloHierarquico: 'Oficiais' | 'Praças' | '',
  // derivado de Posto_Graduacao via CIRCULO_HIERARQUICO_POR_POSTO (research.md §4).
  // '' quando Posto_Graduacao = 'SC' ou fora do domínio de 11 conhecidos (Edge Case).

  _qualificado: boolean,
  // true se existe >=1 linha em instrutor_disciplina com este ID_Instrutor e Status='Ativo'.
  // Mesmo critério de "Habilitados" de hoje (contarHabilitadosDistintos_) — só o rótulo mudou.

  _selecionado: boolean,
  // true se este ID_Instrutor aparece no CSV de disciplinas.ID_Instrutor de qualquer disciplina.
  // Não é subconjunto de _qualificado (achado 5 de spec.md — 10 casos reais hoje).

  _cursosVinculados: Set<ID_Curso>,
  // uniao de: (a) ID_Curso de toda disciplina com vinculo ativo (instrutor_disciplina.Status=Ativo)
  // e (b) ID_Curso de toda disciplina onde este instrutor aparece selecionado (disciplinas.
  // ID_Instrutor). Decisao de uniao confirmada em /speckit-clarify (FR-005).
}
```

## 3. Estado de filtros ativos (em memória, um valor por caixa de seleção)

```text
FiltrosInstrutoresAtivos = {
  curso: string,               // '' = todos; senao, ID_Curso
  classificacaoCurso: string,  // '' = todas; senao, um dos 5 valores reais de cursos.Classificacao
  status: string,               // '' | 'Qualificados' | 'Selecionados' | 'Inativos' — selecao unica
  postoGraduacao: string,       // '' = todos; senao, codigo bruto (ex. '1ºTen')
  circuloHierarquico: string,   // '' | 'Oficiais' | 'Praças'
  categoria: string,            // '' = todas; senao, valor bruto de instrutores.Categoria
  om: string,                   // '' = todas; senao, valor bruto de OM
  capacitacao: string,          // '' = todas; senao, uma qualificacao individual OU o marcador
                                 // "(sem capacitação)" para o caso vazio (FR-012)
}
```

Substitui completamente `filtrosInstrutoresAtivos` de hoje (5 chaves: `om`, `categoria`,
`capacitacao`, `regime`, `escolaridade`) — `regime`/`escolaridade` saem (FR-004, Assumptions),
`curso`/`classificacaoCurso`/`status`/`circuloHierarquico`/`postoGraduacao` entram.

## 4. Predicado de filtro combinado (função pura, uma chamada por instrutor por render)

```text
instrutorPassaNosFiltros_(instrutorEnriquecido, filtrosAtivos, classificacaoPorCursoNormalizada) -> boolean
```

Combina as 8 condições com E lógico (FR-013) — cada condição é um curto-circuito independente,
documentado função a função em research.md §2. `classificacaoPorCursoNormalizada` é um mapa
`ID_Curso -> classificacao normalizada (trim + minúsculas)` derivado de `AppState.ctx.cursos`, mesma
técnica de `normalizarClassificacao_` do Hotfix 013 (FR-006).

## 5. Agregação de KPIs/gráficos sobre o subconjunto filtrado (função pura)

```text
agregarEstatisticasInstrutores_(instrutoresFiltrados) -> {
  kpis: {
    total: number,
    comCapacitacaoDidatica: number,
    cargaHorariaTotalMinistradaAno: number,   // soma de cargaHorariaMinistradaAno no subconjunto
    qualificados: number,                      // count de _qualificado=true no subconjunto
    selecionados: number,                      // count de _selecionado=true no subconjunto
  },
  // Achado do /speckit-analyze (D1): a versao backend removida tinha um campo irmao
  // "porHabilitadosSelecionados" identico a kpis.habilitados/selecionados — nunca consumido pelo
  // front-end (o grafico "Habilitados vs. Selecionados" sempre leu kpis.* diretamente, nao esse
  // campo). Nao repetido aqui: o grafico "Qualificados vs. Selecionados" tambem le kpis.qualificados/
  // kpis.selecionados diretamente (contracts/server-functions.md).
  porClassificacao: [{ categoria: string, quantidade: number }],       // rotulo de exibicao do grafico "Classificacao" (achado 4 da spec 014) — distinto do rotulo do filtro Categoria (FR-010, divergencia aceita, Assumptions)
  porPostoGraduacao: [{ posto: string, quantidade: number }],          // nome por extenso, ordem de antiguidade (RN-ANT-01)
  porOM: [{ om: string, quantidade: number }],
  porEscolaridade: [{ nivel: string, quantidade: number }],
  porRegimeTrabalho: [{ regime: string, quantidade: number }],
  porCapacitacaoDidatica: [{ qualificacao: string, quantidade: number }],
}
```

Forma idêntica ao retorno de `getEstatisticasInstrutores` (backend, removido — research.md/plan.md).
Os 7 gráficos continuam sendo exatamente os mesmos 7 já exigidos desde a spec 014 (Habilitados/
Qualificados vs. Selecionados; Classificação; Posto/Graduação; OM; Escolaridade; Regime de Trabalho;
Capacitação Didática) — `Regime_Trabalho`/`Nivel_Escolaridade` saem só da **barra de filtros** (FR-004
desta spec), os 2 gráficos correspondentes continuam entre os 7 e continuam recalculados a cada
mudança de filtro como qualquer outro (FR-016). `porEscolaridade`/`porRegimeTrabalho` usam
`contarPorChaveClient_` (mirror client-side de `contarPorChave_`, research.md) sobre
`instrutoresFiltrados`, mesma forma da versão backend removida.

## 6. Nenhuma mudança em entidades persistidas

`instrutores`, `instrutor_disciplina`, `disciplinas`, `cursos`: zero coluna nova, zero aba
nova, zero renomeação — cumpre a restrição explícita do pedido.
