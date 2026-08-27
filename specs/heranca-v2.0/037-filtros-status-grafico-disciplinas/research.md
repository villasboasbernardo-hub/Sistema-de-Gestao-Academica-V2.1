# Research — Filtros Avançados (Instrutor/Status) e Gráfico Proporcional (Módulo Disciplinas)

Nenhum `NEEDS CLARIFICATION` restou no `plan.md` — as duas decisões genuinamente ambíguas do pedido
original (Status do Curso vs. Turma; lógica de Status da Disciplina) já foram resolvidas em conversa
direta com Bernardo antes da spec (ver `spec.md`, seção Clarifications). Este documento cobre as
decisões técnicas de design tomadas durante o planejamento.

## 1. Onde a agregação de estatísticas deve rodar: cliente ou servidor?

**Decisão**: Cliente — remove `getEstatisticasDisciplinas` (`lib/acoes/estatisticas.ts`) por completo,
substitui por uma função pura nova em `app/(app)/disciplinas/page.tsx`
(`agregarEstatisticasDisciplinas_`, ver `data-model.md`/`contracts/frontend-functions.md`).

**Rationale**: FR-004 exige que os cartões/gráfico reajam à combinação de todos os 5 filtros
(Curso/Turma/Status da Turma/Instrutor/Status da Disciplina); SC-001 exige "sem nenhuma chamada de
rede adicional". Se a agregação continuasse no servidor, cada mudança nos 3 filtros novos exigiria
ou (a) uma chamada a Server Action nova a cada troca de filtro — violando SC-001 — ou (b) 2
implementações paralelas do mesmo filtro (uma no cliente para a tabela, outra enviada ao servidor
para os cartões) — risco real de divergência, exatamente a categoria de bug que este projeto evita
desde o Hotfix 010/spec 031. Mover a agregação para o cliente garante que tabela e cartões sempre
vêm do mesmo array filtrado uma única vez.

**Precedente direto**: Hotfix Filtros/Cross-Filtering (spec 015-hotfix-filtros-cross-instrutores,
`app/(app)/instrutores/page.tsx`) resolveu o mesmo problema do mesmo jeito — removeu `getEstatisticasInstrutores`
(zero consumidor depois) e passou a agregar 100% no cliente via `agregarEstatisticasInstrutores_`,
justamente para permitir que os 8 filtros daquela tela recalculassem cartões/gráficos sem round-trip.

**Pré-requisito confirmado**: `getEstatisticasDisciplinas` só tem 1 consumidor
(`grep -rn "getEstatisticasDisciplinas" src/ tests/` → só `app/(app)/disciplinas/page.tsx` e os próprios
testes da função) — seguro remover sem quebrar nenhuma outra tela.

**Alternativa considerada e descartada**: estender `getEstatisticasDisciplinas(filtros)` para aceitar
os 3 filtros novos, mantendo a agregação no servidor. Descartada por violar SC-001 diretamente (uma
chamada de rede por mudança de filtro) e por duplicar, no servidor, a mesma filtragem que a tabela já
precisa fazer no cliente para renderizar as linhas.

## 2. Como corrigir a fonte de data do "ritmo" (achado adicional) sem duplicar lógica em JS

**Decisão**: Estender `getDisciplinasAnoVigente` (`lib/acoes/cronograma.ts`) para também ler
`disciplinas` (leitura única, igual às outras 3 abas já lidas por essa função) e computar
`StatusConclusao`/`Ritmo` por linha, reaproveitando `resolverPeriodoEfetivo_`/
`calcularRitmoDisciplina_`/`classificarDensidade_` já existentes — mesmo cálculo, mesma fonte de
período (turma-aware), que `getDisciplinasDaTurmaComRitmo` já faz desde a spec 033.

**Rationale**: A alternativa óbvia seria portar `calcularRitmoDisciplina_`/`classificarDensidade_`/
`resolverPeriodoEfetivo_` para JavaScript client-side (mesmo padrão de `intervaloContidoEmClient_`,
spec 030). Rejeitada aqui porque são 3 funções de datas/matemática encadeadas (não 1 função simples
como `intervaloContidoEmClient_`) — duplicar as 3 no cliente custaria mais risco de divergência do
que estender uma função backend que já lê as abas necessárias e já teria que ser tocada de qualquer
forma (ela já é a única fonte da tabela em modo "estado inicial"). Resultado: as duas fontes de linha
consumidas por `app/(app)/disciplinas/page.tsx` (`getDisciplinasAnoVigente` para o estado inicial,
`getDisciplinasDaTurmaComRitmo` para a cascata Curso+Turma) passam a ter exatamente a mesma forma de
dado por linha (`chExecutada`/`chTotal`/status de conclusão/ritmo), calculada da mesma maneira nos
dois lugares — nenhuma lógica de data nova em `app/(app)/disciplinas/page.tsx`.

**Custo aceito**: 1 leitura a mais de `disciplinas` (aba pequena, ~175 linhas) dentro de
`getDisciplinasAnoVigente` — continua sendo uma leitura única por requisição (nunca por turma),
preservando a garantia de SC-006/spec 017 já testada em
`tests/unidade/regras_de_negocio_backend.test.ts` ("registros_aula deve ser lida exatamente 1
vez"); o novo teste de regressão cobre a mesma garantia para `disciplinas`.

**Alternativa considerada e descartada**: portar o cálculo de ritmo para JS client-side. Descartada
pelo risco de duplicar 3 funções de data em vez de 1, e por já existir o precedente inverso (
`getDisciplinasDaTurmaComRitmo` já resolve isso no servidor há 3 specs).

## 3. Como a lista de opções do filtro de Instrutor é montada e ordenada

**Decisão**: Reaproveita `ordenarVinculosPorAntiguidadeDisc_`/`ORDEM_ANTIGUIDADE_POSTO_DISC_` (já
existentes em `app/(app)/disciplinas/page.tsx` desde a spec 036) para ordenar por antiguidade (RN-ANT-01,
FR-002.1) — os candidatos a instrutor vêm de um `Set` de `ID_Instrutor` distintos coletados das
linhas atualmente visíveis (antes dos filtros de Instrutor/Status), resolvidos via
`instrutorPorId` (já em memória, `instrutoresCadastroCarregados`).

**Rationale**: `ordenarVinculosPorAntiguidadeDisc_` já recebe `(vinculos, instrutorPorId)` — um
array de objetos com `ID_Instrutor` — e devolve a mesma lista ordenada. Os candidatos únicos de
instrutor (extraídos das linhas visíveis) já têm exatamente essa forma (`{ID_Instrutor: id}`),
então a função existente serve sem nenhuma modificação. Zero duplicação de lógica de ordenação
(mesma escala já auditada 4x nesta sessão contra dado real).

## 4. Onde os 3 filtros novos vivem no estado da tela

**Decisão**: `filtroAtual` (já existente) ganha 3 chaves novas: `statusTurma`, `idInstrutor`,
`statusDisciplina` — resetadas para `''` em `aoTrocarCursoDisciplinas()`,
`aoTrocarTurmaDisciplinas_()` e `mostrarEstadoInicialDisciplinas_()` (FR-005), mesmo objeto único já
usado para saber o que recarregar depois de salvar uma edição.

**Rationale**: Reaproveita a variável de estado já existente em vez de criar uma segunda estrutura
paralela — os 3 filtros novos são conceitualmente parte do mesmo "filtro atual da tela" que
Curso/Turma já representam.

## 5. `renderizarTabelaDisciplinas_`/`linhaVisao2_` precisam de um passo de filtragem antes de renderizar

**Decisão**: Nova função pura `linhaPassaFiltros_(linhaEnriquecida, filtros)` (ver
`data-model.md`) roda uma vez por linha antes de `renderizarTabelaDisciplinas_` montar o HTML —
mesmo padrão de "enriquecer uma vez, filtrar barato depois" da spec 015
(`enriquecerInstrutoresParaFiltros_`/`instrutorPassaNosFiltros_`).

**Rationale**: Evita recalcular `StatusConclusao`/CSV de instrutor a cada re-render por mudança de
filtro — o enriquecimento roda 1 vez por carga de dado (troca de Curso/Turma), a filtragem (barata,
comparação de igualdade/inclusão) roda a cada mudança de filtro.

## 6. Gráfico de pizza — fonte de dado e biblioteca

**Decisão**: `disciplinasCarregadas` (já em memória, filtrado por curso quando a cascata está ativa)
somado por `Carga_Horaria_Tempos` (disciplinas `Status='Ativo'`), renderizado via
`renderizarGrafico_(elementoId, 'pie', categorias, series)` (`components/ciaara/`, já existente).

**Rationale**: Nenhum dado novo — `disciplinasCarregadas` já é populado com exatamente esse recorte
(catálogo do curso selecionado) desde a spec 031. `renderizarGrafico_` já suporta `'pie'` (usado no
Módulo de Instrutores, spec 021) e já cuida de `destroy()`/recriar a instância ao trocar de filtro
(evita empilhar gráficos, mesmo mecanismo do Hotfix Filtros/Cross-Filtering).
