# Quickstart — Validação Épico G (Cronograma Unificado e Motor Preditivo Multi-Ano)

## Pré-requisitos

- Branch `006-cronograma-motor-preditivo`, `tasks.md` completo e implementado.
- `pnpm vitest run` disponível.
- Acesso à implantação `o fluxo Git → Vercel` viva para os passos de verificação manual no navegador.

## 1. Os 9 stubs "Pendentes - Epico G" viram testes reais (SC-003)

```sh
grep -c "test.todo" tests/pendentes.test.ts
pnpm vitest run tests/unidade/*.test.ts
```

**Esperado**: o bloco `describe("Pendentes - Epico G"...)` de `tests/unidade/pendentes.test.ts` não contém
mais nenhum dos 9 `test.todo` originais (RN-DIST-01/02/03, RN-2027-01/02/03/04/06/09) — cada um
virou um teste real em `tests/unidade/regras_cronograma.test.ts` (ou arquivo equivalente), passando. O bloco
"Pendentes - Epico C/DSA" (RN-CONF-01) permanece intocado — fora do escopo deste épico.

## 2. Cronograma unificado (User Story 1, FR-001..006)

1. Abrir a aba Cronograma de uma turma com aulas já lançadas.
2. Confirmar que previsto e executado aparecem lado a lado, sem precisar abrir outro módulo.
3. Alternar granularidade (semana → mês → trimestre → semestre → ano) e visão (disciplina ↔
   instrutor); confirmar que os totais recalculam sem perder nem duplicar tempo de aula.
4. Confirmar que uma semana com feriado "Dia Inteiro" desconta capacidade; uma com feriado
   "Parcial"/"Informativo" não desconta nada.
5. Filtrar por disciplina/instrutor, exportar CSV, imprimir — confirmar que reflete o filtro.

## 3. Regime com vigência aplicado (User Story 3, FR-007)

1. Cadastrar uma mudança de regime de horário para um curso com `Vigente_A_Partir_De` no meio da
   janela.
2. Confirmar que o Cronograma calcula a capacidade da semana anterior com o regime antigo e da
   semana posterior com o regime novo.
3. Confirmar que um registro de aula já lançado antes da vigência continua sendo lido com a
   configuração antiga (nunca reinterpretado).

## 4. Motor preditivo multi-ano (User Story 2, FR-010..014)

1. Gerar a prévia de um ano futuro **diferente de 2027** (ex.: 2029).
2. Confirmar o resumo: número de turmas simuladas, blocos gerados, alertas emitidos — sem a
   geração ser interrompida por nenhum alerta.
3. Editar manualmente uma semana da prévia (reduzir/aumentar tempos); confirmar recálculo dos
   totais afetados.
4. Lançar um evento manual de calendário na prévia; confirmar que não substitui os feriados/LPs já
   gerados automaticamente.
5. Salvar a prévia; confirmar que aparece no Cronograma unificado como fonte daquele ano, e que
   gerar de novo o mesmo ano cria uma nova versão sem apagar a salva.
5a. Consultar o Cronograma de um ano futuro que só tem versão `Rascunho` (nunca salva); confirmar
    que aparece um aviso claro ("este ano ainda não tem planejamento oficial salvo"), nunca uma
    tela quebrada ou erro não tratado (RN-DEG-01).
6. Confirmar Prova Mista sempre em bloco de 3 tempos contíguos (disciplinas com CH ≥ 20); Revisão
   em até 7 dias corridos, forçada no 7º dia com alerta se necessário.
7. Confirmar escolha de instrutor respeitando a faixa do regime (20h→8–12h; 40h→16–24h;
   DE→16–30h) — nunca o número bruto do regime (research.md, achado 3).

## 5. Priorização de disciplina (User Story 4, FR-008)

1. Gerar a prévia de um curso sem nenhum peso manual configurado; confirmar critério automático
   (RN-2027-05) de sempre.
2. Definir peso mais alto para uma disciplina daquele curso; gerar de novo; confirmar que ela
   recebe os espaços disputados antes das demais.
3. Configurar pesos iguais para duas disciplinas concorrentes; confirmar que o critério automático
   decide o desempate entre elas.

## 6. Não regressão geral

```sh
pnpm vitest run tests/unidade/*.test.ts
```

**Esperado**: nenhuma regressão em nenhum teste já existente antes deste épico — só os 9 stubs
"Pendentes - Epico G" viram passe (não mais `todo`).
