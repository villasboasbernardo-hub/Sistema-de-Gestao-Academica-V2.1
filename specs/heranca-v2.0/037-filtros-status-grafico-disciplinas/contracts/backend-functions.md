# Contrato: Funções de Backend — Filtros Avançados e Gráfico Proporcional (Disciplinas)

## `getDisciplinasAnoVigente(ano)` — ESTENDIDA, mesma assinatura (`lib/acoes/cronograma.ts`)

**Antes**: 3 leituras de aba (`turmas`/`turma_disciplina`/`registros_aula`),
retorno = `turma_disciplina` bruto + `ID_Curso`/`ChExecutada` sintéticos.

**Depois**: 4 leituras de aba (acrescenta `disciplinas`, 1 vez, nunca por linha/turma), retorno
ganha `StatusConclusao`/`Ritmo` por linha — ver `data-model.md` §1 para a fórmula exata
(reaproveita `resolverPeriodoEfetivo_`/`calcularRitmoDisciplina_`/`classificarDensidade_`, todas já
existentes e inalteradas).

**Contrato de não regressão**: assinatura (`ano`) e todos os campos já retornados permanecem
idênticos — mudança estritamente aditiva. Nenhum consumidor existente (`linhaVisao2_`) precisa
mudar para continuar funcionando.

**Casos de teste esperados**:
- Turma cujo `turma_disciplina.Previsao_Inicio/Termino` está preenchido → `Ritmo` calculado a
  partir desse período (não da semente de `disciplinas`) — teste de regressão provando a
  correção do achado adicional (spec.md).
- `ChExecutada = 0` → `StatusConclusao = 'Não Iniciada'`.
- `ChExecutada >= Carga_Horaria_Tempos` (e `> 0`) → `StatusConclusao = 'Concluída'`.
- `0 < ChExecutada < Carga_Horaria_Tempos` → `StatusConclusao = 'Em Andamento'`.
- Período incompleto (turma e semente ambos parciais/ausentes) → `Ritmo = null`, sem lançar exceção
  (RN-DEG-01) — `StatusConclusao` continua calculável independente de `Ritmo` (são campos
  independentes, um não bloqueia o outro).
- Leitura de `disciplinas` acontece exatamente 1 vez por chamada, nunca 1 vez por turma/linha
  (mesma garantia de leitura constante já testada para as outras 3 abas desde a spec 017/035).

## `getEstatisticasDisciplinas(filtros)` — REMOVIDA (`lib/acoes/estatisticas.ts`)

Zero consumidor após esta spec — `app/(app)/disciplinas/page.tsx` passa a agregar 100% no cliente
(`agregarEstatisticasDisciplinas_`, `contracts/frontend-functions.md`). Os testes existentes em
`tests/unidade/regras_de_negocio_backend.test.ts`/`tests/unidade/regras_ui_dados.test.ts` que exercitam esta função
são removidos junto (as asserções equivalentes migram para o novo teste da função pura client-side,
mesma técnica já usada quando `getEstatisticasInstrutores` foi removida na spec 015).

**Verificação obrigatória antes de remover**: `grep -rn "getEstatisticasDisciplinas" src/ tests/`
não pode apontar nenhum outro consumidor além dos já listados acima.
