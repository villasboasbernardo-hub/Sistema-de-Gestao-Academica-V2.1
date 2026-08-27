# Quickstart: Refatoração de View State Inicial, Padronização de Datas e UI/UX (Módulo Disciplinas)

Roteiro de validação manual contra o app publicado (`o merge na `main` (a Vercel publica em produção)`), mesma URL de sempre. Nenhum
passo requer dado sintético além do já existente na banco de produção — o ano vigente (2026) já tem
turmas reais cadastradas.

## Pré-requisitos

- Deploy mais recente aplicado via ``git push` (a Vercel publica a preview da branch)`/`o merge na `main` (a Vercel publica em produção)` (ver `o histórico de deploys da Vercel`).
- Login com um usuário que tenha ao menos leitura no módulo de Disciplinas (`PERFIS_TODOS`).
- Suíte automatizada verde: `pnpm vitest run` (cobre `getDisciplinasAnoVigente`,
  `ehColunaData_`, e as funções puras de máscara/conversão de data — não cobre DOM/modal/renderização
  real, mesmo padrão de toda spec de frontend desta sessão).

## Passo 1 — Estado inicial (US1, FR-001/FR-002/FR-004.1)

1. Abrir a aba Disciplinas numa sessão nova (sem nenhum curso/turma selecionado ainda).
2. **Esperado**: a tabela já aparece preenchida, com uma coluna "Curso" (novo), disciplinas de
   várias turmas/cursos, sem nenhum clique.
3. Conferir que nenhuma turma com `Status = Cancelada` aparece na lista — comparar com o banco
   `turmas` ao vivo para um curso que tenha turma cancelada no ano vigente, se existir.
4. Conferir que a coluna "CH Cumprida" está preenchida (não em branco/zero para toda disciplina) —
   prova que a agregação de `registros_aula` está funcionando.
5. Selecionar um Curso e depois uma Turma nos seletores — a tabela troca para a Visão 2 já
   existente (comportamento inalterado).
6. Desselecionar o Curso (voltar o seletor ao valor vazio) — **esperado**: a tabela de estado
   inicial (Passo 1.2) reaparece, nunca o prompt "Selecione um curso primeiro…" (FR-001.1, achado do
   `/speckit-analyze`).

## Passo 2 — Datas em dd/mm/aaaa (US2, FR-005/FR-006/FR-007/FR-008)

1. Na tabela (estado inicial ou Visão 2), conferir que Início/Término aparecem como `dd/mm/aaaa`
   (ex.: `15/03/2026`), nunca `2026-03-15` nem `Invalid Date`.
2. Abrir o painel de edição de uma disciplina/turma com data já preenchida — o campo já deve
   carregar no formato `dd/mm/aaaa`.
3. Digitar uma nova data válida (ex.: `20/09/2026`) e salvar.
4. Recarregar a página e reabrir a mesma disciplina/turma — a data deve ser lida de volta
   **exatamente** `20/09/2026` (prova de que `ehColunaData_`/`isoParaDate_` estão sendo acionados
   para `Previsao_Inicio`/`Previsao_Termino` — ver `contracts/backend-functions.md`).
5. Tentar digitar uma data inválida (`31/02/2026`) — o sistema deve bloquear o salvamento antes de
   qualquer chamada de rede (conferir na aba Rede do navegador: nenhuma requisição disparada).
6. Tentar digitar texto fora do padrão (`ab/cd/efgh`) — a máscara deve impedir a digitação de
   caracteres não numéricos nas posições de dígito.

## Passo 3 — Modal de edição centralizado (US3, FR-009/FR-010)

1. Rolar a página até o final (ou até o meio) antes de clicar em "Editar" em qualquer linha.
2. **Esperado**: o painel de edição aparece centralizado na tela, sobre um fundo escurecido — sem
   precisar rolar para vê-lo.
3. Clicar fora do painel (no fundo escurecido) — o painel fecha sem salvar, seleção de Curso/Turma
   (ou tabela de estado inicial) permanece como estava.
4. Repetir o clique em "Editar" para uma segunda linha diferente — conferir que os campos mostram os
   dados da nova linha, não valores residuais da edição anterior.

## Passo 4 — Formatação padronizada do nome do instrutor (US4, FR-011/FR-012/FR-013)

1. Escolher um instrutor com posto + especialidade + nome de guerra preenchidos.
2. Abrir o Módulo de Instrutores e anotar exatamente como o nome aparece (ex.: "1T (AVN) João
   **Silva**").
3. Ir ao módulo de Disciplinas, achar uma turma onde esse instrutor está selecionado — o mesmo
   texto/formatação deve aparecer na tabela (resumo de instrutores) e no painel de edição (lista de
   checkboxes).
4. Se possível, encontrar (ou simular via dado de teste) um `ID_Instrutor` órfão numa linha de
   `turma_disciplina` — conferir que a tabela mostra o ID cru em vez de quebrar a linha inteira.

## Critério de aceite final

Todos os 4 passos acima batem com o Critério de Aceite do pedido original: turmas do ano vigente
sem clique, datas perfeitas em dd/mm/aaaa, modal centralizado e elegante, nome do instrutor idêntico
ao módulo de origem.
