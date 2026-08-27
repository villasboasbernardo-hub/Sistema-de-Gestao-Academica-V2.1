# Research — Refatoração UI/UX e Conformidade de Dados

Nenhum `NEEDS CLARIFICATION` restou no Technical Context do `plan.md` — os dois pontos que
exigiriam isso (banda de tolerância do ritmo, escopo dos dashboards) já foram resolvidos no
`/speckit-clarify`. Este documento registra as decisões técnicas concretas encontradas ao ler o
código real antes de desenhar cada User Story.

## Achado 1 — Dois alvos concretos de dívida técnica de dropdown/ID, além do já citado na spec

A spec já cita `app/(app)/turmas/[turma]/dsa/page.tsx`/`abrirLancarAula` (`prompt()` de `ID_Grade`/`ID_Instrutor`). A leitura
de `app/(app)/instrutores/page.tsx` antes deste plano encontrou mais dois:

1. **Tabela de instrutores** (linha 70): `<td>${i.ID_Instrutor}</td>` — exibe o ID cru como
   primeira coluna, quando `formatarNomeInstrutor_(i)` (já usada na coluna seguinte) já resolveria
   um nome. Viola FR-011 diretamente.
2. **Formulário de vínculo de habilitação** (linha 53-54): `<label>Disciplina (ID_Grade)</label>
   <input type="text" id="vincGrade" placeholder="ID_Grade">` — campo de texto livre para o usuário
   digitar um `ID_Grade` de memória. Viola FR-012 diretamente.

**Decisão**: FR-011/FR-012 desta spec cobrem, no mínimo, estes 3 pontos concretos (2 aqui + 1 já
citado) — não é um exercício hipotético de "auditar tudo", é correção de itens já identificados,
mais uma varredura das demais telas listadas no FR-011 (DSA, Avaliações, Cronograma, Disciplinas,
Instrutores) para achados adicionais durante a implementação.

## Achado 2 — `criarVinculoHabilitacao` (`lib/acoes/instrutores.ts`) já valida `ID_Grade` no backend; a correção é só de frontend

`criarVinculoHabilitacao(obj)` já busca a disciplina em `disciplinas` e rejeita se não existir
(linha 38-41) — a validação de integridade já existe. O problema é exclusivamente que o usuário
precisa *saber* o `ID_Grade` de cor para digitá-lo. Trocar `<input type="text">` por `<select>`
populado por `listarDisciplinas()` (já existe, `lib/acoes/disciplinas.ts`) filtrado pelo curso do instrutor
(ou por todas as disciplinas, com o nome do curso ao lado) resolve o achado sem tocar nenhuma linha
de backend.

## Achado 3 — `getContextoInicial` precisa crescer para viabilizar o Painel Início, mas sem virar um segundo `getCronograma`

Hoje `getContextoInicial()` (``app/layout.tsx` + `lib/supabase/server.ts``) devolve só `{idCurso, nome}` por curso e
`{idTurma, idCurso, nome, status}` por turma — sem `Classificacao` (precisa para agrupar o
carrossel, FR-003) nem progresso/turma-em-destaque (FR-004/005).

**Decisão**: `getContextoInicial` ganha `classificacao`/`status` por curso (leitura direta de
`cursos`, sem cálculo) e uma nova seção `turmasEmDestaque` — um objeto `{idCurso: {idTurma,
nome, status, progresso}}`, resolvido pela regra de FR-004 (janela `Data_Inicio`–`Data_Termino`
contém a data corrente; empate por `Data_Inicio` mais recente). O **progresso** de cada turma em
destaque usa a mesma fórmula já usada por `totalizadoresDaTurma_`/`getCronograma` (CH executada da
turma ÷ CH total das disciplinas do curso) — nunca um segundo cálculo — mas **sem chamar essas
funções diretamente uma vez por curso**: cada uma faz sua própria leitura completa de
`registros_aula` (1.500+ linhas), e `getContextoInicial` roda a cada boot de cada
sessão — chamá-las N vezes (uma por curso) multiplicaria essa leitura por N (achado do
`/speckit-analyze` 2026-08-16, H1). **Correção**: ler `registros_aula` uma única vez
dentro de `getContextoInicial` e calcular o progresso de todas as turmas em destaque a partir desse
único array em memória. Isolado numa função nova `resolverTurmaEmDestaque_(turmasDoCurso, hoje)`
(pura, testável com casos sintéticos), chamada uma vez por curso — só a *escolha* da turma, não a
leitura da execução.

## Achado 4 — Indicador de ritmo/desvio: mesma família de `classificarDensidade_`, não uma segunda regra

Clarifications já decidiu a banda (90%–110%, reaproveitada de `classificarDensidade_`,
`lib/acoes/cronograma.ts`). A diferença semântica: `classificarDensidade_(executado, previsto)` compara
executado×previsto **dentro de um bucket já fechado** (ex.: uma semana inteira); o ritmo da
disciplina compara executado-até-hoje×esperado-até-hoje **dentro de uma janela em andamento**
(`Previsao_Inicio`–`Previsao_Termino`). É a mesma fórmula de razão e a mesma banda, aplicada a um
numerador/denominador calculados de um jeito novo (posição proporcional da data de hoje dentro da
janela × CH total = "esperado até hoje").

**Decisão**: nova função pura `calcularRitmoDisciplina_(chExecutada, chTotal, previsaoInicio,
previsaoTermino, hoje)` em `lib/acoes/cronograma.ts` (mesma família de `classificarDensidade_`, mesmo
arquivo) — calcula `esperadoAteHoje = chTotal × (dias decorridos ÷ dias totais da janela)`, clampado
a `[0, chTotal]`, e delega a classificação para `classificarDensidade_(chExecutada,
esperadoAteHoje)` — reaproveita a função existente por completo, não duplica a banda.
**Degradação (achado do `/speckit-analyze` 2026-08-16, M2)**: além de `chTotal` zerado/ausente,
`previsaoTermino <= previsaoInicio` (janela nunca preenchida ou invertida) tornaria "dias totais da
janela" zero/negativo — ambos os casos degradam para "sem base de cálculo" (mesmo padrão de
`calcularTeto_`), nunca `NaN`/`Infinity`.

## Achado 5 — Sidebar retrátil: Offcanvas do Tailwind CSS + shadcn/ui, já incluído no CDN pinado

`app/layout.tsx` já carrega `Tailwind@5.3.3` inteiro como dependência versionada no `package.json` (Épico E) — o componente Offcanvas
(`.offcanvas`, `data-bs-toggle="offcanvas"`) já está disponível, sem nenhum `<script>`/`<link>`
adicional. V1.0 nunca teve sidebar (era navbar horizontal simples, portada tal e qual até aqui).

**Decisão**: substituir a `<nav class="navbar">` atual por um `<button>` de alternância +
`<div class="offcanvas offcanvas-start">` contendo a mesma `<ul class="nav">` de hoje (mesmos
`onclick="irPara(...)"`, RF-NAV-02) — nenhuma mudança de roteamento (`irPara`/`Router`, que é
escopo do Épico D, não deste épico).

## Achado 6 — Recharts: inicialização única e reutilizável, agregação sempre no backend

Nenhuma tela do V2.0 usa gráfico hoje (V1.0 usava Recharts pontualmente, já descartado por
`03-design-system.md` UI-06). Recharts como dependência versionada no `package.json` (`https://cdn.jsdelivr.net/npm/apexcharts`) expõe
`new Recharts(elemento, opcoes).render()` — API direta, sem necessidade de wrapper complexo.

**Decisão**: um helper único `renderizarGrafico_(elementoId, tipo, categorias, series)` em
`components/ciaara/`, chamado pelos 4 painéis de estatística — nenhuma duplicação de opções de Recharts
entre módulos. Toda contagem/agrupamento vem pronta do backend (`lib/acoes/estatisticas.ts`, FR-015) — o
front só formata `{categorias, series}` para o formato que o helper espera, nunca soma/agrupa
localmente.

## Achado 7 — `lib/acoes/estatisticas.ts`: uma função por módulo, mas usando a mesma forma de agregação

`getEstatisticasCursos()`, `getEstatisticasDisciplinas()`, `getEstatisticasInstrutores()`,
`getEstatisticasTurmas()` — cada uma lê sua própria aba via `lerAbaComoObjetos_` e agrega em
memória (contagem por `Classificacao`/`Status`/`Posto_Graduacao`, médias de duração). Nenhuma tem
mais de ~1.600 linhas de origem hoje (a maior é `registros_aula`, não usada
diretamente por nenhum destes 4 painéis) — a agregação em memória dentro do próprio Next.js já
satisfaz FR-015 (o front nunca vê a aba crua, só o agregado), sem exigir nenhuma otimização
adicional além disso.

## Achado 8 — DISC-1 (`Tecnica_Ensino_Sugerida`/`Local_Padrao`): aditivo, sem migração

Ambas as colunas são novas em `disciplinas`, texto livre, opcionais — `crudAtualizar`/
`crudCriar` já são *header-driven* (só escrevem colunas que existem fisicamente na aba, mesmo
princípio já usado para `TA_Inicial`/`Local` em `registros_aula` no Épico H). Não
exige nenhuma mudança de código em `lib/acoes/crud.ts` — só a coluna física no banco (fora do escopo de
código deste plano, ação de Bernardo na banco de produção, mesmo padrão de toda coluna aditiva anterior)
e o campo novo no formulário de `app/(app)/disciplinas/page.tsx`.
