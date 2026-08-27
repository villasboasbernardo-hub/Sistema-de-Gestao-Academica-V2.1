# Contrato: Funções de Backend — Refatoração UI/UX Módulo Disciplinas

## `getDisciplinasAnoVigente(ano)` — NOVA (`lib/acoes/cronograma.ts`)

**Perfil de leitura**: `PERFIS_TODOS` (mesmo perfil de `getDisciplinasDaTurmaComRitmo`/
`listarDisciplinas` — leitura já é ampla no módulo de Disciplinas, RBAC inalterado por esta spec).

**Parâmetros**:
- `ano` (string ou number) — ano letivo a filtrar. Calculado no cliente via
  `new Date().getFullYear()` (FR-002) e enviado explicitamente, nunca assumido pelo backend
  (research.md §2 — testabilidade).

**Retorno**: `Array<TurmaDisciplina>` — mesmo formato CRU de `crudListar('turma_disciplina')`
(PascalCase, todas as colunas reais da aba, incluindo `Cod_Disciplina`/`Nome_Disciplina`/
`CH_Prevista_Por_Instrutor` já usadas pela Visão 2) **acrescido de 2 campos sintéticos**:
`ID_Curso` (resolvido via `turmas`, nunca via `disciplinas`) e `ChExecutada` (CH
Cumprida agregada). Decisão de implementação (desvio do desenho original do `research.md`, que
prescrevia um shape camelCase pré-formatado): devolver o mesmo shape cru da Visão 2 permite
reaproveitar literalmente `linhaVisao2_`/`renderizarTabelaDisciplinas_` no frontend — o cliente já
tem toda a lógica de fallback de código/nome/CH contra o catálogo (`disciplinaPorGrade`), nenhuma
duplicação nova precisa existir (FR-003).

**Comportamento**:
1. Filtra `turmas` por `Ano_Letivo === String(ano)` e `Status !== 'Cancelada'`, construindo
   um mapa `ID_Turma → ID_Curso`.
2. Se nenhuma turma sobrar, retorna `[]` (RN-DEG-01 — nunca erro).
3. Filtra `turma_disciplina` pelas turmas do passo 1.
4. Lê `registros_aula` **uma única vez**, agrega `Tempos_Consumidos` por chave
   composta `ID_Turma + '|' + ID_Grade` (`Categoria_Normativa === 'Aula' && Status !== 'Cancelada'`).
5. Retorna cada linha de `turma_disciplina` com `ID_Curso`/`ChExecutada` acrescentados
   (`Object.assign`) — nenhuma formatação de data/nome, nenhum join com `disciplinas`
   (responsabilidade do cliente, como já é para a Visão 2).

**Contrato de performance (FR-004.1/SC-006)**: exatamente 3 leituras de aba
(`turmas`/`turma_disciplina`/`registros_aula`), independente do número de
turmas do ano vigente — nunca 1 leitura de `registros_aula` por turma.

**Casos de teste esperados** (`tests/unidade/regras_de_negocio_backend.test.ts`):
- Ano sem nenhuma turma → `[]`.
- Turma `Cancelada` no ano vigente → excluída do retorno; turma `Planejada`/`Ativa`/`Concluida` →
  incluída.
- 2 turmas diferentes com a mesma `ID_Grade` → `ChExecutada` correta e independente para cada uma
  (prova da chave composta, distinto de `getDisciplinasDaTurmaComRitmo`).
- Disciplina sem nenhum registro em `registros_aula` → `ChExecutada = 0`, não `null`
  nem `undefined`.
- Cada item do retorno traz `ID_Curso` correto (resolvido pela turma) e preserva os demais campos
  crus de `turma_disciplina` (`Cod_Disciplina`/`Nome_Disciplina`/`ID_Instrutor`/
  `CH_Prevista_Por_Instrutor` etc.) inalterados.
- Número de leituras de `registros_aula` não escala com o número de turmas (mesmo tipo
  de teste de regressão já usado na spec 017-hotfix-roteamento-fonte-dsa).

---

## `ehColunaData_(h)` — ESTENDIDA (``lib/supabase/server.ts`:173`)

**Antes**:
```js
function ehColunaData_(h) {
  return /^Data|_Data|Data_/.test(h);
}
```

**Depois**:
```js
function ehColunaData_(h) {
  return /^Data|_Data|Data_/.test(h) || h === 'Previsao_Inicio' || h === 'Previsao_Termino';
}
```

**Efeito**: `crudAtualizar`/`crudCriar` (`lib/acoes/crud.ts`) passam a chamar `isoParaDate_(v)` antes de
`setValue` para `Previsao_Inicio`/`Previsao_Termino` em qualquer aba que use o motor genérico —
hoje, na prática, só `turma_disciplina` (via `atualizarTurmaDisciplina`, `lib/acoes/liq.ts`) tem um caminho de
escrita real para essas 2 colunas.

**Contrato de não regressão**: nenhuma outra coluna passa a ser tratada como data por este ajuste —
é uma allowlist de 2 nomes literais, não um regex mais permissivo (research.md §3).

**Casos de teste esperados** (`tests/unidade/regras_de_negocio_backend.test.ts`):
- `ehColunaData_('Previsao_Inicio')` → `true` (novo).
- `ehColunaData_('Previsao_Termino')` → `true` (novo).
- `ehColunaData_('Previsao_Curso')` (nome parecido, não deve casar) → `false` (guarda contra regex
  permissivo demais).
- Colunas `Data*`/`*_Data*` já cobertas continuam `true` (não regressão).
- `crudAtualizar('turma_disciplina', id, { Previsao_Inicio: '2026-03-15' })` grava um valor que,
  lido de volta via `lerAbaComoObjetos_`, retorna exatamente `'2026-03-15'` (prova end-to-end do
  bug corrigido — antes desta mudança, o teste equivalente falha ou depende de comportamento não
  documentado do `setValue` com string).
