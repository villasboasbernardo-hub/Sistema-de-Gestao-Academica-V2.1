# Data Model — Hotfix e Refatoração UI/UX: Módulo de Instrutores

Nenhuma entidade nova, nenhuma coluna nova, nenhuma mudança de schema físico
(`docs/arquitetura/01-schema.md` permanece inalterado — restrição explícita do pedido). Esta spec só
muda como campos já existentes são lidos, agrupados, ordenados, calculados e exibidos.

## Entidades existentes tocadas (só leitura, sem alteração de estrutura)

### `Instrutor` (`instrutores`, 177 linhas ao vivo)

| Campo usado por esta spec | Uso |
|---|---|
| `ID_Instrutor` | Chave; somente-leitura na tela de edição (FR-011); `value` (nunca texto visível) do `<option>` de vínculo (FR-014). |
| `Posto_Graduacao` | Entrada de `ordenarPorAntiguidadePosto_` (research.md §3); prefixo do nome formatado; coluna da listagem; primeiro campo do texto do dropdown de vínculo. |
| `Esp_Hab_Obs` | Prefixo do nome formatado (RF-INSTR-15), inalterado. |
| `Nome_Completo` | Base do campo "Nome Completo" da listagem e do texto do dropdown de vínculo (FR-007/014) — **campo que a implementação atual nunca usava** (achado 1). |
| `Nome_Guerra` | Trecho posto em negrito dentro de `Nome_Completo`, só quando preenchido e for substring (FR-007) — vazio em 175 de 177 linhas hoje. |
| `Categoria` | Fonte do gráfico de Classificação (FR-002b), mapeada para rótulo de exibição (data abaixo); coluna/filtro da listagem. |
| `OM` | Fonte do gráfico (FR-002d); coluna/filtro da listagem. |
| `Regime_Trabalho` | Fonte do gráfico (FR-002f); coluna/filtro da listagem. |
| `Nivel_Escolaridade` | Fonte do gráfico (FR-002e); filtro da listagem. |
| `Capacitacao_Didatica` | Campo CSV multivalorado — fonte do KPI (não-vazio) e do gráfico (FR-002g, split por vírgula, achado 9); filtro da listagem. |
| `Instrutor_Completo` | **Fórmula nativa** (`=IFERROR(TRIM($C2&" "&$F2);"")`, achado 7) — passa a protegida em `COLUNAS_FORMULA`, nunca lida nem escrita por esta spec além dessa proteção. |
| `Carga_Horaria_Ministrada_Ano` | **Sempre vazio hoje** (achado 5) — nunca lido como fonte de dado; passa a protegido em `COLUNAS_FORMULA`; somente-leitura na tela de edição (mostra o valor **calculado**, não este campo). |
| `Status` | **Não é um campo de formulário na tela de edição** (correção do `/speckit-analyze`, achado F1) — permanece exclusivamente controlado pela ação dedicada já existente (`desativarInstrutorClick`, RN-INST-02, Risco Alto, com o diálogo de confirmação que já tem hoje). Expor `Status` como um `<select>` comum no painel de edição duplicaria/contornaria essa ação sem o mesmo cuidado. Pode aparecer como texto informativo (somente leitura) no painel, se útil, mas nunca como input editável desta tela. |
| (demais ~14 campos: `NIP`, `Data_Nascimento`, `Dep_Divisao`, `Email`, `Formacao_Principal_Secundaria`, `Disciplinas_Ministradas`, datas de docência, `Ultima_Avaliacao_Desempenho`, `Preferencia` etc.) | Permanecem editáveis na tela de edição como campos cadastrais comuns (FR-013) — nenhum tratamento especial nesta spec além de não serem os campos explicitamente bloqueados (`ID_Instrutor`, `Instrutor_Completo`, `Carga_Horaria_Ministrada_Ano`, `Status`) nem os 3 campos de trilha de auditoria (`Editado_Por`, `Timestamp_Edicao`, `Origem_Migracao_v1`), que também nunca são campos de formulário. |

### `Vínculo de Habilitação` (`instrutor_disciplina`, 599 linhas ao vivo)

| Campo | Uso |
|---|---|
| `ID_Instrutor` | Entrada de `contarHabilitadosDistintos_` (só linhas `Status='Ativo'`, research.md §4). |
| `Status` | Filtro de "habilitado" (598 `Ativo`, 1 `Inativo` na base viva). |

### `Disciplina` (`disciplinas`, 175 linhas ao vivo)

| Campo | Uso |
|---|---|
| `ID_Instrutor` | Lista CSV bruta ("única fonte de verdade da atribuição", `01-schema.md`) — entrada de `contarSelecionadosDistintos_` (research.md §4). **`Instrutores_Selecionados` (fórmula derivada) nunca é lida — está quebrada (`#ERROR!`), achado 6.** |

### `Registro de Aula` (`registros_aula`)

| Campo | Uso |
|---|---|
| `ID_Instrutor` | Chave de agrupamento de `somarCargaHorariaPorInstrutor_` (research.md §4). |
| `Categoria_Normativa` | Filtro `='Aula'` (RN-INST-04, escopo desta spec — ver Assumptions de `spec.md` sobre `avaliacoes` ficar fora). |
| `Status` | Filtro `≠'Cancelada'`. |
| `Data` | Filtro de ano corrente. |
| `Tempos_Consumidos` | Valor somado. |

## Estruturas em memória novas (não persistidas)

### `ESCALA_ANTIGUIDADE_POSTO` (constante, `lib/acoes/instrutores.ts`)

Mapa fechado de 11 entradas `{código real: {ordem, nome por extenso}}` — ver research.md §3 para o
mapeamento completo. Formaliza a revisão de `RN-ANT-02` (achado 3 de `spec.md`).

### `RÓTULOS_CATEGORIA` (constante, `lib/acoes/estatisticas.ts` — correção do `/speckit-analyze`, achado F6:
antes listada em dois arquivos possíveis, `tasks.md` T008 já fixa `lib/acoes/estatisticas.ts`)

```js
{ 'Militar da Ativa': 'Militares da Ativa', 'TTC': 'TTC', 'SCNS': 'Civis', 'MMN': 'Magistério Militar Naval' }
```

### Retorno de `getEstatisticasInstrutores()` (reescrito)

```js
{
  kpis: {
    total: number,
    comCapacitacaoDidatica: number,
    cargaHorariaTotalMinistradaAno: number,
    habilitados: number,
    selecionados: number,
  },
  porHabilitadosSelecionados: { habilitados: number, selecionados: number },
  porClassificacao: [{ categoria: string /* rótulo */, quantidade: number }],
  porPostoGraduacao: [{ posto: string /* nome por extenso */, quantidade: number }], // ordenado por antiguidade
  porOM: [{ om: string, quantidade: number }],
  porEscolaridade: [{ nivel: string, quantidade: number }],
  porRegimeTrabalho: [{ regime: string, quantidade: number }],
  porCapacitacaoDidatica: [{ qualificacao: string, quantidade: number }], // split por vírgula
}
```

### Retorno da listagem (função nova, `lib/acoes/instrutores.ts`)

Cada instrutor ganha um campo calculado a mais, sem alterar os demais já devolvidos por
`listarInstrutores()`:

```js
{ ...camposDeinstrutores, cargaHorariaMinistradaAno: number }
```
