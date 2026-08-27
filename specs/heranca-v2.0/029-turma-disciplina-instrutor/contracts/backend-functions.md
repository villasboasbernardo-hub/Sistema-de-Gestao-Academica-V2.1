# Contrato — Funções de Backend (`lib/acoes/liq.ts`, estendido)

## `intervaloContidoEm_(inicioA, fimA, inicioB, fimB)`

Pura. Datas `'YYYY-MM-DD'` (mesma convenção de `intervalosSeInterceptam_`). Verifica **contenção
total** de `[inicioA, fimA]` dentro de `[inicioB, fimB]` — diferente de interseção parcial
(research.md § 2).

**Retorno**: `boolean`.
- Se `inicioB`/`fimB` (a janela "externa", ex.: a turma) estiver ausente/incompleta → `true`
  (nada a validar, RN-DEG-01).
- Se `inicioA`/`fimA` (o período interno, ex.: a disciplina) estiver ausente/incompleto → `true`
  (nada a validar).
- Caso contrário: `inicioA >= inicioB && fimA <= fimB`.

## `atualizarTurmaDisciplina(idTurmaDisciplina, alteracoes)`

Função pública exposta via Server Action. `alteracoes` é um objeto parcial (mesma forma do
segundo parâmetro de `crudAtualizar`) — pode conter `Previsao_Inicio`, `Previsao_Termino`,
`ID_Instrutor`, ou qualquer combinação.

1. `exigirFuncao(CRUD_CONFIG['turma_disciplina'].escrita)` (mesmo perfil já configurado, spec 027).
2. Lê a linha atual de `turma_disciplina` (via `lerAbaComoObjetos_`, filtrando por
   `ID_turma_disciplina === idTurmaDisciplina`); lança `Error` se não encontrada.
3. Resolve a turma correspondente (`turmas`, por `ID_Turma`).
4. Calcula o período **efetivo** pós-alteração: usa o valor de `alteracoes` quando presente, senão
   o valor já gravado na linha atual — nunca valida contra um período que não vai existir depois
   da gravação.
5. Chama `intervaloContidoEm_(efetivoInicio, efetivoTermino, turma.Data_Inicio, turma.Data_Termino)`
   — se `false`, lança `Error` com mensagem citando os limites reais da turma (ex.: "O período da
   disciplina (DD/MM/AAAA a DD/MM/AAAA) precisa estar dentro do período da turma (DD/MM/AAAA a
   DD/MM/AAAA).").
6. Se passou na validação: chama `crudAtualizar('turma_disciplina', idTurmaDisciplina, alteracoes)`
   e devolve o mesmo retorno dela.

**Erros**: lança `Error` de mensagem legível — capturado pelo `.catch(alert)` do frontend, mesmo
padrão de `salvarPeriodoTurmaClick_` (spec 027).
