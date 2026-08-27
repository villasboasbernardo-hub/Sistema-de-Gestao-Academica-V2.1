# Quickstart — Validação Épico H (Motor de Sugestão Automática do DSA)

## Pré-requisitos

- Branch `008-motor-sugestao-dsa`, `tasks.md` completo e implementado.
- `pnpm vitest run` disponível.
- Acesso à implantação `o fluxo Git → Vercel` viva para os passos de verificação manual no navegador.

## 1. O stub "Pendentes - Epico C/DSA" (RN-CONF-01) vira teste real (SC-002)

```sh
grep -c "test.todo" tests/pendentes.test.ts
pnpm vitest run tests/unidade/*.test.ts
```

**Esperado**: o bloco `describe("Pendentes - Epico C/DSA"...)` de `tests/unidade/pendentes.test.ts` não
contém mais o `test.todo` de RN-CONF-01 — virou teste real em `tests/unidade/regras_dsa.test.ts` (ou arquivo
equivalente), passando. `tests/unidade/pendentes.test.ts` fica vazio (era o último stub pendente).

## 2. Grade semanal completa por TA (User Story 1, FR-001..003)

1. Abrir o DSA de uma turma com aulas, avaliações e eventos extraclasse já lançados numa semana.
2. Confirmar que cada lançamento aparece na célula dia×TA correta, com o horário real de
   início/término (via `horarios_tempos_aula`) e o instrutor.
3. Abrir o DSA de uma turma cujo curso não tem `ID_Config_Horario` (EAD puro); confirmar que degrada
   para lista sem coluna de horário, sem falhar.
4. Lançar manualmente um bloco de Aula (disciplina, instrutor habilitado, TA inicial, tempos,
   metodologia, conteúdo); confirmar que aparece imediatamente na célula certa e soma na CHD.
5. Confirmar que um lançamento histórico sem `TA_Inicial` aparece em faixa de rodapé, sem quebrar a
   grade.
6. Navegar semana anterior/próxima; confirmar que a turma selecionada é preservada.

## 3. Conflito de instrutor/sala cross-turma (User Story 2, FR-004)

1. Lançar o mesmo instrutor em TAs sobrepostos no mesmo dia, em duas turmas diferentes.
2. Abrir a grade de qualquer uma das duas turmas; confirmar que **ambos** os blocos aparecem
   sinalizados como conflito de instrutor (alerta primário) — mesmo que a turma aberta só contenha
   um dos dois lançamentos.
3. Repetir com sala repetida (instrutores diferentes, mesma sala, dia/TA sobreposto); confirmar
   alerta secundário, visualmente distinto.
4. Confirmar que dois blocos do mesmo instrutor no mesmo dia, em TAs que não se sobrepõem, não geram
   conflito.

## 4. Prévia semanal simples e determinística (User Story 3, FR-005..008)

1. Gerar a prévia de uma semana de uma turma real com espaços livres.
2. Confirmar que os espaços são preenchidos priorizando a disciplina mais "apertada" (RN-2027-05),
   ajustada pelo peso manual quando configurado.
3. Confirmar que uma disciplina de TFM nunca ultrapassa 6 tempos/semana na prévia; uma de fim de
   curso não tem teto; as demais respeitam 25/semana como recomendação.
4. Aceitar um bloco sugerido; confirmar que vira lançamento real (mesma função do lançamento
   manual).
5. Ignorar a sugestão e lançar manualmente algo diferente na mesma célula; confirmar que é aceito
   sem nenhum bloqueio.
6. Confirmar que nenhuma restrição de sequenciamento de técnica de ensino é aplicada.

## 5. Validação contra semana real já lançada (User Story 4, FR-009/010) — gate obrigatório

1. Escolher uma turma e semana já concluídas com lançamentos manuais reais (referência sugerida:
   CAHO, citada pelo próprio RF-DSA-08.1).
2. Solicitar a validação; confirmar o relatório lado a lado (sugerido × real) por dia/TA, com
   contagem de coincidências/divergências — sem nenhuma taxa de aprovação automática calculada.
3. Tentar validar uma turma/semana sem nenhum lançamento manual real; confirmar recusa com mensagem
   clara, não um relatório de 100% de divergência.

## 6. Impressão A4 paisagem (User Story 5, FR-011)

1. Abrir a impressão de uma semana com lançamentos variados (aula, avaliação, AEC/TAD/TR, feriado).
2. Confirmar cabeçalho, corpo completo e as duas assinaturas (via `responsaveis_curso`) em uma única
   página A4 paisagem.
3. Testar com uma data sem responsável vigente cadastrado; confirmar assinatura em branco, sem
   falhar a impressão inteira.

## 7. Excluir e arrastar-e-soltar (User Story 6, FR-012)

1. Excluir um bloco diretamente pela grade; confirmar que some da grade e dos totalizadores.
2. Arrastar um bloco para outro TA/dia; confirmar que o mesmo `ID_Registro` é atualizado (nunca
   duplicado) e que a detecção de conflito é reavaliada para a nova posição.
3. Tentar mover um bloco de TFM para uma posição que ultrapassaria 6 tempos/semana; confirmar
   recusa com mensagem clara (mesmo bloqueio de FR-002, Clarifications 2026-08-15).

## 8. Não regressão geral

```sh
pnpm vitest run tests/unidade/*.test.ts
```

**Esperado**: nenhuma regressão em nenhum teste já existente antes deste épico — só o stub
"Pendentes - Epico C/DSA" (RN-CONF-01) vira passe (não mais `todo`), e `tests/unidade/pendentes.test.ts`
fica sem nenhum `test.todo` restante.
