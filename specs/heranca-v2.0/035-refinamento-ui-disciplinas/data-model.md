# Data Model: Refatoração de View State Inicial, Padronização de Datas e UI/UX (Módulo Disciplinas)

Nenhuma mudança de schema (nenhuma coluna nova, nenhuma migração). Este documento descreve as
entidades já existentes consumidas pela feature e o formato de retorno da única função nova.

## Entidades existentes consumidas (sem alteração de schema)

### turmas
| Campo usado | Tipo | Uso nesta feature |
|---|---|---|
| `ID_Turma` | TEXTO (PK) | Chave de junção com `turma_disciplina` |
| `ID_Curso` | TEXTO (FK) | Agrupamento por curso na tabela agregada |
| `Ano_Letivo` | TEXTO | Filtro "ano vigente" (FR-001/FR-002) |
| `Status` | ENUM(`Planejada`,`Ativa`,`Concluida`,`Cancelada`) | Filtro — `Cancelada` excluída da tabela de estado inicial (decisão do `/speckit-clarify`) |

Já disponível no cliente via `AppState.ctx.turmas` (``app/layout.tsx` + `lib/supabase/server.ts``) — nenhuma leitura nova desta aba
é necessária no novo endpoint; o backend relê a aba de qualquer forma para determinar as turmas do
ano vigente de forma autoritativa (fonte única de verdade, evita a possibilidade de o filtro
client-side e o server-side divergirem).

### turma_disciplina
| Campo usado | Tipo | Uso nesta feature |
|---|---|---|
| `ID_turma_disciplina` | TEXTO (PK) | Identifica a linha a editar (botão "Editar") |
| `ID_Turma` | TEXTO (FK) | Filtro pelas turmas do ano vigente |
| `ID_Grade` | TEXTO (FK) | Junção com `disciplinas`; chave composta com `ID_Turma` para CH Cumprida |
| `Previsao_Inicio` / `Previsao_Termino` | TEXTO (`yyyy-MM-dd`) | Exibidas em dd/mm/aaaa (FR-005); gravadas via `atualizarTurmaDisciplina` — passam a ser reconhecidas por `ehColunaData_` (FR-008) |
| `ID_Instrutor` | TEXTO (CSV de IDs) | Resumo de instrutores selecionados, formatado via `formatarNomeInstrutor_` (FR-011) |

Sem alteração de schema — mesmos campos já usados pela Visão 2 (specs 030/031/032).

### disciplinas
| Campo usado | Uso nesta feature |
|---|---|
| `ID_Grade` / `Cod_Disciplina` / `Nome_Disciplina` / `Carga_Horaria_Tempos` | Fallback de código/nome/CH quando a linha de `turma_disciplina` não tiver override — mesmo uso já existente na Visão 2 |

### instrutores
| Campo usado | Uso nesta feature |
|---|---|
| `ID_Instrutor` | Junção |
| `Posto_Graduacao` / `Esp_Hab_Obs` / `Nome_Completo` / `Nome_Guerra` | Entrada de `formatarNomeInstrutor_` (FR-011) — mesmos 4 campos já usados em Instrutores/DSA |

### registros_aula
| Campo usado | Uso nesta feature |
|---|---|
| `ID_Turma` / `ID_Grade` | Chave composta de agregação de CH Cumprida (FR-004.1) |
| `Categoria_Normativa` | Filtro `=== 'Aula'` (mesmo filtro de `getDisciplinasDaTurmaComRitmo`) |
| `Status` | Filtro `!== 'Cancelada'` |
| `Tempos_Consumidos` | Somado por chave composta |

Lida **uma única vez** por chamada de `getDisciplinasAnoVigente` (FR-004.1/SC-006) — nunca uma vez
por turma.

## Retorno de `getDisciplinasAnoVigente(ano)` (novo)

Array de objetos, um por linha de `turma_disciplina` cuja turma pertence ao ano vigente e não está
`Cancelada`. **Decisão de implementação** (desvio do desenho camelCase originalmente esboçado
acima — ver `contracts/backend-functions.md`): o retorno é o mesmo shape CRU de
`crudListar('turma_disciplina')` (PascalCase, todas as colunas reais da aba) acrescido de 2 campos
sintéticos:

```
{
  ...todasAsColunasDeturma_disciplina,  // ID_turma_disciplina, ID_Turma, ID_Grade, Cod_Disciplina,
                                          // Nome_Disciplina, Previsao_Inicio, Previsao_Termino,
                                          // ID_Instrutor, CH_Prevista_Por_Instrutor, ...
  ID_Curso: string,     // sintético — resolvido via turmas (nunca via disciplinas)
  ChExecutada: number,  // sintético — soma de registros_aula.Tempos_Consumidos (chave composta)
}
```

Isso permite ao frontend reaproveitar literalmente `linhaVisao2_`/`renderizarTabelaDisciplinas_`
(o mesmo `disciplinaPorGrade` client-side já resolve o fallback de código/nome/CH contra o
catálogo, exatamente como já fazia para a Visão 2) — nenhuma função de renderização nem tipo de
dado paralelo para o estado inicial (FR-003). Formatação de data (`isoParaDataBr_`) e de nome de
instrutor (`formatarNomeInstrutor_`) continuam sendo responsabilidade do cliente — o backend
devolve dado bruto (`yyyy-MM-dd`, CSV de IDs), nunca strings já formatadas para exibição.

## Estados de UI (frontend, sem entidade de dados nova)

- **Estado inicial (`estado-inicial`)**: nenhum curso selecionado — tabela populada por
  `getDisciplinasAnoVigente(anoVigente)`, colunas idênticas à Visão 2 + coluna "Curso" (FR-003,
  necessária porque a tabela agora combina múltiplos cursos, diferente da Visão 2 de hoje). Este
  estado é o padrão sempre que nenhum Curso está selecionado (FR-001.1) — inclusive quando o
  usuário desseleciona um Curso já escolhido, não só no primeiro carregamento da sessão.
- **Visão 1 (só curso)**: inalterada (specs 030/031).
- **Visão 2 (curso + turma)**: inalterada (specs 030/031/032), exceto pela troca dos 2
  `<input type="date">` por campos de texto mascarados e pelo uso de `formatarNomeInstrutor_`.
- **Painel de edição**: mesmos dados de hoje (`Previsao_Inicio`/`Previsao_Termino`/`ID_Instrutor`/
  checkbox de rateio), agora dentro de um modal Tailwind CSS centralizado em vez de uma `<div>` inline.
