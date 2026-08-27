# Feature Specification: Hotfix — Polimento de UI/UX, Gráficos e Regra Global de Nomenclatura de Cursos

**Feature Branch**: `021-hotfix-graficos-siglas-cursos`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "HOTFIX: Polimento de UI/UX, Gráficos e Regra Global de Nomenclatura de Cursos. Contexto Obrigatório: Durante a homologação do módulo de Instrutores, identificamos a necessidade de otimizar o espaço visual dos gráficos (Recharts), melhorar a interatividade das ações da tabela (Ativar/Desativar) e padronizar o uso de siglas de cursos em todo o sistema. Objetivo: Refatorar a renderização dos gráficos, aplicar lógica condicional aos botões de ação e impor uma regra global de exibição de cursos no frontend. ZERO alterações estruturais no schema do banco de dados (planilhas). [...] Critério de Aceite: Legendas do gráfico de Postos usam apenas siglas. Instrutores desativados mostram a opção 'Reativar'. Existe um novo gráfico de pizza binário sobre capacitação. O sistema inteiro prioriza siglas de cursos para economizar caracteres na tela."

## Achados reais (leitura de código e dados antes de escrever qualquer requisito)

- **O gráfico "Posto/Graduação" já armazena o dado bruto como sigla** — `instrutores.Posto_Graduacao`
  é gravado como código (`AE, VA, CA, CMG, CF, CC, CT, 1ºTen, 2ºTen, SO, 1ºSG, 2ºSG, 3ºSG, SC`,
  exatamente a lista de siglas citada no pedido), nunca como nome extenso — confirmado por
  `ORDEM_ANTIGUIDADE_POSTO`/`opcoesPostoGraduacao_` (`app/(app)/instrutores/page.tsx`), a mesma escala usada
  pelo dropdown de edição. **O bug real não é o dado, é a função de agregação do gráfico**:
  `ordenarPorAntiguidadePostoClient_` (``app/(app)/instrutores/page.tsx`:501-510`) mapeia deliberadamente cada
  sigla para o nome por extenso via `NOMES_POSTO_POR_CODIGO` (ex.: `CMG` → `"Capitão de Mar e
  Guerra"`) antes de entregar ao Recharts — introduzido para a Ficha do Instrutor (spec 016, onde
  o nome extenso é desejável para impressão formal), reaproveitado sem revisão para o gráfico
  também. Corrigir é remover essa tradução só no caminho do gráfico, mantendo-a intacta na Ficha
  (`valorExibicaoFichaInstrutor_`, que também usa `NOMES_POSTO_POR_CODIGO` e não deve mudar).
- **O gráfico "Qualificados vs. Selecionados" já é uma barra com 2 colunas lado a lado** (`bar`,
  `renderizarGrafico_('graficoInstrutoresHabSel', 'bar', ['Qualificados', 'Selecionados'], ...)`) —
  nunca foi um gauge ou medidor de competição; o único elemento a corrigir é o texto do `<h6>` acima
  do gráfico, hoje literalmente `"Qualificados vs. Selecionados"` (``app/(app)/instrutores/page.tsx`:564`).
- **Já existe um gráfico de capacitação didática, mas ele responde a uma pergunta diferente da
  pedida**: `graficoInstrutoresCapacitacao` (barra) mostra a contagem *por tipo* de capacitação
  (`Licenciatura`, `C-Exp-TE`, `C-Esp-DID`, valores individuais de um campo CSV multivalorado,
  achado 9 da spec 014) — o novo gráfico de pizza binário pedido ("Com" vs. "Sem Capacitação
  Didática") é uma métrica agregada diferente, aditiva, não uma duplicata nem um substituto. O KPI
  `comCapacitacaoDidatica` já existe em `agregarEstatisticasInstrutores_` (linha 448) — só falta
  `semCapacitacaoDidatica` (= `total - comCapacitacaoDidatica`) e o elemento de gráfico novo.
- **Não existe função de reativação de instrutor no backend.** `desativarInstrutor` (``lib/acoes/instrutores.ts`:
  160-162`) chama `crudExcluir` (exclusão lógica — grava `Status='Inativo'`, nunca apaga linha,
  Princípio IV/C-05). O padrão simétrico de "reativar" já existe em outro domínio do mesmo arquivo —
  `sincronizarDisciplinasInstrutor` reativa um vínculo inativo via `crudAtualizar({Status: 'Ativo'})`
  — mesmo mecanismo genérico a reaproveitar aqui, sem nenhuma tabela ou coluna nova.
- **A tabela hoje já esconde "Desativar" quando `Status === 'Inativo'`, mas não mostra nada no
  lugar** (``app/(app)/instrutores/page.tsx`:398`, `${i.Status !== 'Inativo' ? '<button ... Desativar</button>' :
  ''}`) — instrutor inativo fica sem nenhuma ação de mudança de status na listagem, confirmando o
  pedido como um bug real, não uma percepção.
- **`cursos.ID_Curso` já É a sigla/abreviação do curso** (`CAHO`, `C-Ap-HN` etc.) — decisão
  confirmada na spec 019 (achado "sigla do curso não é uma coluna nova"), sem necessidade de nenhuma
  coluna adicional; `Nome_Curso` é o nome por extenso. `AppState.ctx.cursos[i]` já expõe as duas
  (`idCurso`/`nome`, ``app/layout.tsx` + `lib/supabase/server.ts`:63`) — a regra global de siglas é 100% uma escolha de qual dos 2
  campos já disponíveis usar em cada ponto de exibição, sem tocar backend nem schema.
- **Mapeamento completo (grep) de todo ponto do frontend que hoje exibe `curso.nome`/`c.nome`**:
  1. ``app/(app)/inicio/page.tsx`:79` (cartão do Painel Início) — **excluído explicitamente pelo pedido**.
  2. ``app/(app)/cursos/[curso]/page.tsx`:57` (título do cartão de curso na Página do Curso) — **excluído explicitamente
     pelo pedido** ("título principal da Página do Curso").
  3. ``app/(app)/cronograma/page.tsx`:77` (dropdown `#cronoCurso`) — dentro do escopo, deve virar sigla.
  4. ``app/(app)/disciplinas/page.tsx`:66` (dropdown `#discCursoSelecao`) — dentro do escopo, deve virar sigla.
  5. ``app/(app)/admin/usuarios/page.tsx`:105` (dropdown `#usrCursoParaVincular`, formulário de vínculo
     Encarregado↔Curso) — dentro do escopo, deve virar sigla.
  6. ``app/(app)/admin/usuarios/page.tsx`:164-165` (lista de cursos já vinculados a um usuário) — dentro do escopo,
     deve virar sigla.
  7. ``app/(app)/instrutores/page.tsx`:314-315` (dropdown `#filtroCurso` da barra de filtros, spec 015) — dentro
     do escopo, deve virar sigla.
  8. ``app/(app)/instrutores/page.tsx`:678-694` (`disciplinasHabilitadasDoInstrutor_`, texto legado "Disciplinas
     Habilitadas" + fonte da Ficha impressa) — dentro do escopo; é exatamente o ponto citado
     nominalmente no pedido ("Ficha do Instrutor... rótulos dos checkboxes e textos das disciplinas
     habilitadas").
  - Nenhum outro arquivo do frontend referencia `curso.nome`/`Nome_Curso` (confirmado por grep em
    todo `app/`) — a superfície real do "sistema inteiro" citado no pedido é exatamente
    estes 6 pontos fora das 2 exceções, não uma lista hipotética maior.
- **O painel de atribuição de disciplinas (spec 019) já está em conformidade** —
  `painelAtribuicaoDisciplinasHtmlInstrutor_` (``app/(app)/instrutores/page.tsx`:980`) já monta o rótulo como
  `"${Nome_Disciplina} (${ID_Curso})"`, o exato formato pedido para a Ficha ("Oceanografia (CAHO)")
  — nenhuma mudança necessária ali, só replicar o mesmo padrão em
  `disciplinasHabilitadasDoInstrutor_`, que hoje produz `"<nome extenso do curso> — <disciplina>"`
  (ordem invertida e nome completo, não sigla entre parênteses).
- **Nomes de turma (`turmas.Nome_Completo_Curso`, exibidos como `turma.nome` em
  `app/(app)/turmas/[turma]/dsa/page.tsx`/`app/(app)/cursos/[curso]/page.tsx`/`app/(app)/cronograma/page.tsx`) ficam fora do escopo desta regra** — não são
  uma menção a curso isolada, e sim uma `FORMULA` de planilha (schema, `docs/arquitetura/
  01-schema.md` §5.6) que já embute o nome do curso como parte da identidade composta da turma;
  trocar esse valor exigiria editar uma fórmula na banco de produção, o que o próprio pedido proíbe
  ("ZERO alterações estruturais no schema"). Mantido como está, documentado aqui para não ser
  reaberto por engano numa spec futura.

## Clarifications

### Session 2026-08-18

- Q: Which exact title should replace "Qualificados vs. Selecionados" on the renamed chart? → A: "Status de Seleção"
- Q: Should clicking "Reativar" on an inactive instructor require a confirmation dialog, the same way "Desativar" does? → A: Sim, mesma confirmação de "Desativar"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gráficos de Instrutores mais diretos e compactos (Priority: P1)

Como Encarregado da Divisão de Administração Acadêmica revisando o painel de estatísticas de
Instrutores, quero que os gráficos comuniquem a informação de forma direta e sem redundância visual
— sem jargão de "competição" entre Qualificados e Selecionados, sem nomes de posto tão longos que
espremem a legenda, e com uma visão binária clara de quantos instrutores têm alguma capacitação
didática — para decidir rapidamente sem precisar interpretar gráficos ambíguos ou cortados.

**Why this priority**: É o pedido mais concreto e mensurável (3 sub-itens com critério de aceite
textual explícito) e não depende de nenhuma outra User Story.

**Independent Test**: Abrir a aba Instrutores, expandir o painel de estatísticas, e verificar
visualmente os 3 gráficos alterados/novos sem depender de nenhuma ação de tabela ou tela de curso.

**Acceptance Scenarios**:

1. **Given** o painel de estatísticas de Instrutores aberto, **When** o gráfico antigo
   "Qualificados vs. Selecionados" é observado, **Then** o título exibido é exatamente "Status de
   Seleção" e as duas barras/fatias continuam mostrando os totais reais de cada grupo, lado a lado,
   sem qualquer termo de confronto ("vs", "versus") no título.
2. **Given** o gráfico "Posto/Graduação", **When** a legenda/eixo é observado, **Then** cada posto
   aparece só pela sigla (`CMG`, `1ºTen` etc.), nunca pelo nome por extenso, mantendo a ordenação por
   antiguidade já existente (RN-ANT-01).
3. **Given** o painel de estatísticas, **When** o usuário procura o novo gráfico de pizza "Índice de
   Capacitação Geral", **Then** ele existe como elemento adicional (não substitui o gráfico existente
   por tipo de capacitação) com exatamente 2 fatias — "Com Capacitação Didática" e "Sem Capacitação
   Didática" — cuja soma bate com o total de instrutores filtrados na tela.
4. **Given** qualquer filtro da barra de 8 categorias (spec 015) aplicado, **When** os instrutores
   filtrados mudam, **Then** os 3 gráficos desta User Story recalculam junto com os demais painéis já
   reativos, sem nenhuma chamada de rede nova (mesmo motor client-side já existente).

---

### User Story 2 - Reativar instrutor desativado direto da listagem (Priority: P2)

Como Encarregado da Divisão de Administração Acadêmica, quando um instrutor que desativei por engano
(ou que volta à ativa) aparece na listagem com `Status = Inativo`, quero um botão "Reativar" visível
na própria linha da tabela — sem precisar abrir o formulário de edição completo só para essa
mudança — para reverter a desativação com um clique, do mesmo jeito rápido que desativar já funciona
hoje.

**Why this priority**: Bug funcional real e concreto (instrutor inativo hoje não tem nenhuma ação de
reativação na tabela), mas depende de menos superfície de tela que a User Story 3 e é independente
da User Story 1.

**Independent Test**: Desativar um instrutor de teste pela própria interface, confirmar que
"Desativar" desaparece e "Reativar" aparece em seu lugar, clicar em "Reativar" e confirmar que o
instrutor volta a `Status = Ativo` e a listagem/filtros o tratam como ativo de novo.

**Acceptance Scenarios**:

1. **Given** um instrutor com `Status = Ativo` na listagem, **When** a coluna de ações é observada,
   **Then** o botão "Desativar" (`btn-outline-danger`) aparece, e nenhum botão "Reativar" é exibido.
2. **Given** um instrutor com `Status = Inativo` na listagem, **When** a coluna de ações é observada,
   **Then** o botão "Desativar" está ausente e um botão "Reativar" (verde/`success`) aparece em seu
   lugar, ao lado de "Editar" e "Imprimir Ficha" (que continuam disponíveis para ambos os status).
3. **Given** um instrutor inativo, **When** o usuário clica em "Reativar", **Then** o backend grava
   `Status = 'Ativo'` para aquele instrutor (via `crudAtualizar`, nunca reescrevendo nenhum outro
   campo) e a tabela recarrega mostrando o instrutor como ativo, com "Desativar" de volta no lugar de
   "Reativar".
4. **Given** um instrutor inativo, **When** o usuário clica em "Reativar", **Then** o sistema exige a
   mesma confirmação (`confirm()`) já usada por "Desativar" (Clarifications 2026-08-18) antes de
   gravar `Status = 'Ativo'` — simétrico de propósito em relação a "Desativar", já que reativar pode
   bypassar silenciosamente o motivo original da desativação (ex.: perda de qualificação) se não for
   uma ação deliberada.

---

### User Story 3 - Siglas de curso em vez de nomes completos em toda a interface (Priority: P3)

Como qualquer usuário navegando pelo sistema (dropdowns de curso, filtros, vínculos, Ficha do
Instrutor), quero ver a sigla curta do curso (`CAHO`, `C-Ap-HN`) em vez do nome por extenso nos
pontos onde hoje aparece o nome completo, para identificar o curso mais rápido e sem que o texto
longo quebre o layout de tabelas/dropdowns estreitos — mantendo o nome completo só onde ele já cumpre
um papel de identificação principal (cartões da Página Inicial, título do cartão de curso na Página
do Curso).

**Why this priority**: Maior superfície de arquivos tocados (6 pontos em 4 arquivos) e menor risco
funcional que as User Stories 1/2 — é troca de rótulo de exibição, nunca de valor gravado ou lógica
de negócio.

**Independent Test**: Navegar por cada um dos 6 pontos mapeados (dropdowns de Cronograma,
Disciplinas, vínculo de Usuário, filtro de Instrutores, lista de cursos vinculados de um Usuário, e
Ficha/"Disciplinas Habilitadas" de um Instrutor) e confirmar que cada um mostra a sigla, enquanto o
cartão da Página Inicial e o título do cartão de curso na Página do Curso continuam com o nome
completo, sem nenhuma mudança.

**Acceptance Scenarios**:

1. **Given** os dropdowns de curso em Cronograma (`#cronoCurso`), Disciplinas (`#discCursoSelecao`),
   vínculo de Usuário (`#usrCursoParaVincular`) e filtro de Instrutores (`#filtroCurso`), **When**
   cada um é aberto, **Then** cada opção mostra só a sigla do curso (`ID_Curso`), nunca o nome
   completo, e o valor selecionado (usado para filtrar/gravar) continua sendo o `ID_Curso` como já é
   hoje — só o texto visível muda.
2. **Given** a lista de cursos já vinculados a um Usuário (`app/(app)/admin/usuarios/page.tsx`), **When** a lista é
   renderizada, **Then** cada item mostra a sigla do curso, não o nome completo.
3. **Given** a Ficha impressa de um Instrutor (e o mesmo texto no bloco legado "Disciplinas
   Habilitadas" da tela de edição), **When** uma disciplina habilitada é listada, **Then** o formato é
   `"<Nome da Disciplina> (<Sigla do Curso>)"` (ex.: `"Oceanografia (CAHO)"`), nunca o nome completo do
   curso.
4. **Given** o cartão de curso no Painel Início e o título do cartão de curso na Página do Curso,
   **When** ambos são observados, **Then** continuam exibindo o nome completo do curso, sem nenhuma
   alteração — as 2 exceções explícitas do pedido.
5. **Given** o nome de uma Turma (`turmas.Nome_Completo_Curso`, exibido em DSA/Cronograma/
   Página do Curso), **When** observado, **Then** permanece com o nome completo do curso embutido,
   por ser uma `FORMULA` de schema fora do alcance de uma mudança só de frontend (fora de escopo
   desta spec, ver Achados reais).

---

### Edge Cases

- Instrutor sem nenhuma disciplina habilitada: a Ficha/"Disciplinas Habilitadas" continua exibindo a
  mensagem de lista vazia já existente — nenhuma mudança de comportamento aqui, só de formato quando
  a lista não está vazia.
- `Capacitacao_Didatica` vazio ou só espaços em branco conta como "Sem Capacitação Didática" no novo
  gráfico de pizza — mesma regra já usada pelo KPI `comCapacitacaoDidatica` existente
  (`String(...).trim() !== ''`).
- Zero instrutores no conjunto filtrado (ex.: filtro sem resultado): o novo gráfico de pizza exibe 0
  em ambas as fatias, sem lançar exceção — mesmo padrão de degradação segura dos demais gráficos do
  painel.
- Um instrutor reativado deve voltar a poder ser selecionado em novos lançamentos exatamente como um
  instrutor que nunca foi desativado — não existe um terceiro estado "reativado" distinto de "Ativo".
- Curso sem `ID_Curso` preenchido (não deveria ocorrer, mas mantendo o mesmo padrão defensivo já
  usado no restante do sistema): dropdowns/rótulos exibem string vazia em vez de lançar erro, mesmo
  comportamento de fallback (`|| c.idCurso`) já usado hoje só que sem o `nome` como alternativa.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O gráfico hoje intitulado "Qualificados vs. Selecionados" no painel de estatísticas de
  Instrutores MUST ter seu título alterado para exatamente "Status de Seleção" (Clarifications
  2026-08-18), removendo qualquer termo de confronto/competição, e mantendo as duas colunas/fatias
  com os totais reais de Qualificados e Selecionados exibidos separadamente.
- **FR-002**: O gráfico "Posto/Graduação" MUST exibir, em eixos e legendas, exclusivamente a sigla do
  posto/graduação (`AE, VA, CA, CMG, CF, CC, CT, 1ºTen, 2ºTen, SO, 1ºSG, 2ºSG, 3ºSG, SC`), nunca o
  nome por extenso, preservando a ordenação por antiguidade (RN-ANT-01) já existente.
- **FR-003**: A tradução de sigla para nome por extenso de posto/graduação usada pela Ficha do
  Instrutor (`NOMES_POSTO_POR_CODIGO`) MUST permanecer inalterada — a correção do FR-002 se aplica
  estritamente ao caminho de dados do gráfico, nunca à Ficha.
- **FR-004**: O sistema MUST exibir um novo gráfico de pizza binário ("Índice de Capacitação Geral")
  no painel de estatísticas de Instrutores, com exatamente 2 fatias — "Com Capacitação Didática" e
  "Sem Capacitação Didática" — cujos valores somados são iguais ao total de instrutores no conjunto
  filtrado corrente.
- **FR-005**: O novo gráfico de pizza binário do FR-004 MUST ser adicional ao gráfico existente que
  detalha capacitação didática por tipo individual (`Licenciatura`, `C-Exp-TE`, `C-Esp-DID`) — nenhum
  dos dois substitui o outro.
- **FR-006**: Todos os gráficos do painel de estatísticas de Instrutores, incluindo os 2 alterados/
  criados por esta spec, MUST continuar recalculando a partir do conjunto de instrutores filtrado
  corrente (barra de 8 filtros, spec 015), inteiramente no cliente, sem nenhuma chamada de rede nova.
- **FR-007**: Na coluna de ações da listagem de Instrutores, quando `Status = 'Ativo'`, o sistema MUST
  exibir o botão "Desativar" (estilo `danger`/vermelho) e MUST NOT exibir nenhum botão de reativação.
- **FR-008**: Na coluna de ações da listagem de Instrutores, quando `Status = 'Inativo'`, o sistema
  MUST exibir um botão "Reativar" (estilo `success`/verde) no lugar de "Desativar", e MUST NOT exibir
  o botão "Desativar".
- **FR-009**: O sistema MUST fornecer uma função de backend que reative um instrutor (grava
  `Status = 'Ativo'`), reaproveitando o motor de escrita genérico já existente (`crudAtualizar`),
  sem apagar ou sobrescrever nenhum outro campo do instrutor — extensão simétrica de RF-INSTR-12
  (cadastro/edição/desativação de instrutor já permitidos a Admin/Divisão de Administração
  Acadêmica/Operador).
- **FR-010**: Ao clicar em "Reativar", o sistema MUST exigir a mesma confirmação (`confirm()`) já
  usada por "Desativar" (Clarifications 2026-08-18) antes de gravar a mudança de status, e MUST
  recarregar a listagem de Instrutores refletindo o novo status após a confirmação (RF-INSTR-12).
- **FR-011**: Exceto pelo cartão de curso do Painel Início e pelo título do cartão de curso na Página
  do Curso, todo ponto do frontend que hoje exibe o nome completo de um curso (`Nome_Curso`) MUST
  passar a exibir a sigla do curso (`ID_Curso`) no lugar — especificamente: dropdown de curso do
  Cronograma, dropdown de curso de Disciplinas, dropdown de vínculo Encarregado↔Curso em Usuários,
  lista de cursos já vinculados a um Usuário, e dropdown de filtro de Curso em Instrutores.
- **FR-012**: O texto de disciplinas habilitadas de um instrutor (bloco legado "Disciplinas
  Habilitadas" e a Ficha impressa) MUST exibir cada disciplina no formato
  `"<Nome da Disciplina> (<Sigla do Curso>)"`, substituindo o formato atual
  `"<Nome completo do Curso> — <Nome da Disciplina>"`.
- **FR-013**: O cartão de curso do Painel Início e o título do cartão de curso na Página do Curso
  MUST continuar exibindo o nome completo do curso, sem nenhuma alteração desta spec.
- **FR-014**: O nome de Turma exibido em DSA/Cronograma/Página do Curso (`Nome_Completo_Curso`,
  campo `FORMULA` do schema) fica fora do escopo desta spec — nenhuma mudança de exibição é aplicada
  a ele, por depender de uma fórmula de planilha, não de código de frontend.
- **FR-015**: Nenhuma mudança desta spec MUST alterar qualquer coluna, aba ou fórmula do banco —
  toda a spec é composta por: reformatação de dados já disponíveis no cliente (FR-001 a FR-006,
  FR-011, FR-012), lógica condicional de renderização (FR-007/FR-008), e uma função de escrita nova
  que reaproveita o motor CRUD genérico já existente sobre uma coluna já existente (FR-009/FR-010).

### Key Entities *(include if feature involves data)*

- **Instrutor** (`instrutores`): `Status` (`Ativo`/`Inativo`, já existente) passa a ser alterável
  em ambas as direções pela listagem (antes só Ativo→Inativo tinha ação dedicada na tabela).
- **Curso** (`cursos`): `ID_Curso` (sigla, já existente) passa a ser o campo de exibição
  preferencial no frontend, com `Nome_Curso` (nome completo, já existente) restrito às 2 exceções.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos pontos de exibição de posto/graduação no gráfico "Posto/Graduação", apenas
  a sigla aparece — zero ocorrência de nome por extenso na legenda/eixo do gráfico.
- **SC-002**: 100% dos instrutores com `Status = Inativo` mostram o botão "Reativar" na listagem, e
  0% mostram "Desativar" simultaneamente (mutuamente exclusivos, sempre).
- **SC-003**: O novo gráfico de pizza binário de capacitação didática está presente e sua soma bate
  exatamente com o total de instrutores exibidos no conjunto filtrado, em qualquer combinação de
  filtro testada.
- **SC-004**: Nos 6 pontos mapeados do FR-011/FR-012, 100% exibem sigla de curso; nos 2 pontos do
  FR-013, 100% continuam exibindo nome completo — sem nenhuma regressão visual nos 2 pontos
  excluídos.
- **SC-005**: Um usuário consegue reativar um instrutor desativado por engano em um único clique a
  partir da listagem, sem precisar abrir o formulário de edição completo.

## Assumptions

- O critério de aceite "sem forçar um formato de competição" para o gráfico Qualificados/Selecionados
  é satisfeito só com a troca do título (Clarifications 2026-08-18: "Status de Seleção") — o tipo de
  gráfico (`bar`, duas colunas lado a lado) já atende ao pedido de "exibir claramente as duas
  colunas... separadas com os totais", não sendo necessário trocar para outro tipo de visualização
  (ex.: dois KPIs numéricos avulsos).
- "Reativar" passa pelo mesmo fluxo de confirmação (`confirm()`) de "Desativar" (Clarifications
  2026-08-18) — decisão documentada no FR-010/Acceptance Scenario 4 da User Story 2. Difere do
  padrão de `sincronizarDisciplinasInstrutor` (reativar um vínculo de disciplina nunca exige
  confirmação), decisão deliberada: reativar um instrutor pode bypassar silenciosamente o motivo
  original da desativação, um risco que reativar um vínculo de disciplina não carrega.
- A ordenação do dropdown `#filtroCurso` (Instrutores), hoje alfabética pelo nome completo, passa a
  ser alfabética pela sigla — mudança de ordenação implícita e aceitável, já que o nome completo deixa
  de estar disponível como critério visível de ordenação para o usuário.
- Todo o trabalho desta spec é frontend, exceto a função de reativação (FR-009), que é a única
  adição no backend — nenhum arquivo de schema/migração é criado.
