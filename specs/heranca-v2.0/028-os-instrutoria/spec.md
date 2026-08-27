# Feature Specification: Módulo Gerador de O.S. de Instrutoria (Lógica, Agrupamento e Validação)

**Feature Branch**: `028-os-instrutoria`

**Created**: 2026-08-20

**Status**: Draft

**Input**: User description: "NOVO ÉPICO: Módulo Gerador de O.S. de Instrutoria (Lógica e Agrupamento
Baseado em Documento Oficial). Tela (SPA) para calcular períodos de instrução filtrando por Curso/
Estágio, Trimestre ou Semestre. Backend agrupa disciplinas por instrutor, espelhando o formato da
O.S. Oficial do CIAARA (Posto/Grad., NIP, Nome, Téc. de Ensino, Início, Término, Curso, Disciplina),
com rowspan mesclando os dados cadastrais do instrutor quando ele tem múltiplas disciplinas. Escopo
EXCLUSIVAMENTE: interface + agrupamento backend + exibição em tela para validação — sem geração de
documento final."

## Achados reais (leitura de código e dado ao vivo antes de escrever qualquer requisito)

- **`Capacitacao_Didatica` não é booleano** — é campo multivalorado (checkbox-group), com domínio
  `OPCOES_CAPACITACAO_DIDATICA = ['Licenciatura', 'C-Exp-TE', 'C-Esp-DID']`
  (`app/(app)/instrutores/page.tsx`, achado 9 de spec 014), armazenado como string CSV em `instrutores.
  Capacitacao_Didatica`. A conversão para "SIM"/"NÃO" pedida é trivial (string não-vazia → SIM,
  vazia → NÃO), mas corrige a premissa do pedido de que o campo já nasce booleano.
- **`NIP` existe e está populado** (`lib/acoes/instrutores.ts`) — confirmado com valores reais na base ao vivo
  (ex. `"87.3490.86"`).
- **"Nome de Exibição" tem a mesma restrição arquitetural já enfrentada pelo Épico LIQ**:
  `formatarNomeInstrutor_()` (negrito hierárquico por círculo) vive só em `components/ciaara/` (frontend),
  inacessível a um `.ts` de backend. Como o pedido exige que `calcularOsInstrutoria` rode no
  backend, o nome exibido na tabela de validação usa `Posto_Graduacao` + `Nome_Completo` puros
  (sem negrito/formatação hierárquica) — mesma solução adotada por `montarDadosSecao1Liq_`/
  `montarDadosSecao2Liq_` (`lib/acoes/liq.ts`, spec 027) para o mesmo problema.
- **"Data da primeira/última aula no período" é aula REALIZADA, não prevista** — a fonte correta é
  `registros_aula` (colunas confirmadas ao vivo: `ID_Registro, Data, ID_Turma, ID_Grade,
  ID_Instrutor, Categoria_Normativa, Tipo_Atividade, Metodologia, Tempos_Consumidos, TA_Inicial,
  Local, Conteudo_Resumo, Observacoes`), nunca `disciplinas.Previsao_Inicio/Termino` nem
  `turma_disciplina` (que são datas *previstas*, semente/execução por turma — Épico LIQ). Esta aba
  **não tem coluna `Status`** hoje — `somarCargaHorariaPorInstrutor_` (`lib/acoes/instrutores.ts`) já checa
  `r['Status'] !== 'Cancelada'` contra ela e degrada silenciosamente (RN-DEG-01) porque a coluna não
  existe; este épico reaproveita o mesmo filtro (`Categoria_Normativa === 'Aula'`) sem depender de
  `Status`. Volume real confirmado: linhas datadas de 06/01/2026 a 18/06/2026 na amostra — a feature
  não retorna vazio contra dado real.
- **"Curso (Sigla)" é o próprio `ID_Curso`** — não existe coluna `Sigla` separada em `cursos`,
  achado já documentado em `app/(app)/instrutores/page.tsx` ("Sigla do curso = `ID_Grade.ID_Curso`
  diretamente"). Reaproveitado aqui sem mudança.
- **Trimestre é reaproveitável do Épico LIQ**: `trimestreParaIntervalo_`/`intervalosSeInterceptam_`
  (`lib/acoes/liq.ts`, spec 027) já existem, puras, prontas para reuso direto.
- **"Semestre" não existe em nenhum lugar do código** — nenhuma ocorrência em `src/`. É conceito
  inteiramente novo para este épico, sem aritmética herdável (ao contrário do trimestre).
- **"Curso/Estágio" como rótulo de modalidade não corresponde a uma distinção real do sistema** — os
  valores reais de `cursos.Classificacao` são `Regular`, `Especial`, `Expedito`, `Estágio de
  Qualificação`, `Aperfeiçoamento Avançado` (`app/(app)/cursos/[curso]/page.tsx`, `CLASSIFICACOES_ORDEM_CURSO`); filtrar
  "por curso" no sistema já significa filtrar por `ID_Curso` **de qualquer classificação**, não uma
  alternância especial "Curso vs. Estágio". O rótulo do dropdown de modalidade ("Por Curso/Estágio")
  é só nome de tela — a implementação é: um único `ID_Curso` selecionado, de qualquer classificação.
- **Agregação parcialmente parecida já existe, mas não é reaproveitável como está**:
  `somarCargaHorariaPorInstrutor_` (`lib/acoes/instrutores.ts`) já lê `registros_aula`, filtra
  `Categoria_Normativa==='Aula'` e agrupa por `ID_Instrutor` — mesma fonte/filtro deste épico —, mas
  soma `Tempos_Consumidos` (um número), não rastreia mínimo/máximo de `Data` por `ID_Grade` (formato
  de agregação diferente). Serve de precedente de padrão, não de função a chamar diretamente.
- **Nenhum documento oficial "O.S.-17" foi encontrado no repositório nem na pasta de trabalho SIS11**
  — busca por "OS-17"/"Ordem de Serviço de Instrutoria" não encontrou nenhum arquivo correspondente
  (diferente do Épico LIQ, que tinha a NORMHIDRO 30-23 em PDF + um documento de proveniência já
  commitado). As únicas menções a "Ordem de Serviço" no acervo de documentação são administrativas
  genéricas (designação de comissão, formalização de matrícula/função), não relacionadas a
  instrutoria. **O layout de 8 colunas e a semântica de agrupamento por instrutor com `rowspan`
  descritos no pedido não têm corroboração documental própria deste projeto** — são tratados aqui
  como caso análogo ao de normas externas já usadas em specs anteriores (aceitos por vir
  diretamente do responsável, que tem conhecimento operacional do documento real usado no CIAARA),
  mas registrados explicitamente como não-verificados nesta sessão (Princípio VIII).
- **`getDataRange()`.select()``/`reduce` manual, como prescrito literalmente no pedido, duplicaria
  infraestrutura já existente**: `lerAbaComoObjetos_(nomeAba)` (`lib/supabase/server.ts`) já envolve exatamente
  esse padrão e é usado por 100% dos módulos de backend, incluindo o próprio `lib/acoes/liq.ts` mais recente.
  Esta spec **não** prescreve a chamada de API literal (detalhe de implementação, cabe a
  `/speckit-plan`) — só exige que o agrupamento por instrutor produza a estrutura de dados descrita
  (FR-005/FR-006), reaproveitando a leitura genérica já estabelecida (Princípio VI).
- **Este épico é deliberadamente parcial** — o próprio pedido declara escopo "EXCLUSIVAMENTE" tela +
  agrupamento + exibição de validação, **sem geração de documento final** (sem a rota de impressão `/print/*`, sem
  salvar no Supabase Storage). Diferente do Épico LIQ, que entregava o documento oficial pronto — aqui a
  entrega é só a minuta em tela, para conferência humana antes de uma eventual segunda fatia que
  gere o documento real.

## Clarifications

### Session 2026-08-20

- Nenhuma pergunta formal foi necessária: as únicas ambiguidades reais do pedido (limite de datas no
  modo "Por Curso/Estágio"; definição de "Semestre") têm default razoável documentado em
  Assumptions, sem impacto de escopo/segurança suficiente para justificar pausa — mesmo critério já
  usado nesta sessão para specs com poucas lacunas reais.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gerar minuta de O.S. de Instrutoria para conferência (Priority: P1)

Como Comandante/Divisão de Administração Acadêmica, quero abrir uma tela dedicada, escolher um curso
específico OU um trimestre/semestre, e ver uma tabela pré-formatada no padrão da Ordem de Serviço de
Instrutoria — cada instrutor aparecendo uma única vez (com Posto/Graduação, NIP, Nome e Capacitação
Didática mesclados verticalmente), listando ao lado cada disciplina que ele efetivamente ministrou
no recorte escolhido, com a data da primeira e da última aula registrada — para conferir os dados
antes de uma eventual emissão oficial futura.

**Why this priority**: É o único fluxo deste épico — pedido explicitamente delimitado a "interface +
agrupamento + exibição para validação", sem User Story adicional de emissão de documento.

**Independent Test**: Abrir o módulo de Instrutores, clicar em "Gerar O.S. de Instrutoria", escolher
"Por Curso/Estágio" + um curso com aulas realizadas registradas, clicar "Calcular Minuta" — confirmar
que a tabela mostra os instrutores que de fato lecionaram naquele curso, cada um com suas disciplinas
agrupadas sob uma única célula de dados cadastrais (`rowspan`), sem repetição de Posto/NIP/Nome por
linha de disciplina.

**Acceptance Scenarios**:

1. **Given** o módulo de Instrutores, **When** o usuário clica "Gerar O.S. de Instrutoria", **Then**
   a listagem principal é ocultada e a nova view aparece no lugar, sem recarregar a página.
2. **Given** a nova view, **When** o usuário escolhe a modalidade "Por Curso/Estágio", **Then** um
   segundo controle aparece: um `<select>` com a sigla (`ID_Curso`) de todos os cursos cadastrados,
   de qualquer classificação.
3. **Given** a nova view, **When** o usuário escolhe a modalidade "Por Período (Trimestral/
   Semestral)", **Then** 3 controles em cascata aparecem: um `<select>` de Ano, um `<select>` de
   tipo de recorte (Trimestre/Semestre) e um `<select>` de número do recorte, cujas opções mudam
   conforme o tipo escolhido (1º a 4º se Trimestre; 1º/2º se Semestre).
4. **Given** os filtros preenchidos, **When** o usuário clica "Calcular Minuta", **Then** o backend
   agrupa por instrutor todas as aulas realizadas (`registros_aula`,
   `Categoria_Normativa='Aula'`) cujo `ID_Turma`/`ID_Grade` caem no recorte escolhido, e devolve, por
   instrutor: Posto/Graduação, NIP, Nome (puro, sem formatação hierárquica), Capacitação Didática
   ("SIM" se `Capacitacao_Didatica` não-vazia, senão "NÃO"), e um array de disciplinas com Início
   (data mínima registrada), Término (data máxima registrada), Curso (`ID_Curso`) e nome da
   disciplina.
5. **Given** o resultado calculado, **When** a tabela é renderizada, **Then** as colunas exibidas são
   exatamente `Posto/Grad. | NIP | Nome | Téc. de Ens. | Início | Término | Curso | Disciplina`, e a
   célula de Posto/NIP/Nome/Téc. de Ens. de um instrutor com múltiplas disciplinas usa `rowspan`
   igual ao número de disciplinas dele, aparecendo uma única vez.
6. **Given** um instrutor sem nenhuma aula realizada no recorte escolhido, **When** a minuta é
   calculada, **Then** esse instrutor não aparece na tabela (a tabela lista só quem efetivamente deu
   aula no recorte, nunca todo o quadro de instrutores).
7. **Given** a view de resultado, **When** o usuário clica "Voltar", **Then** a view fecha e a
   listagem principal de Instrutores volta a aparecer, sem recarregar a página.

---

### Edge Cases

- Instrutor com múltiplas disciplinas do MESMO curso no recorte: cada disciplina distinta
  (`ID_Grade`) vira uma linha própria sob o mesmo `rowspan` — mesmo padrão do exemplo do pedido
  (CMG Nunes, 3 matérias no CAHO, 3 linhas mescladas).
- Instrutor com disciplinas de CURSOS diferentes dentro do mesmo recorte de trimestre/semestre: todas
  aparecem sob o mesmo `rowspan`, coluna "Curso" variando linha a linha — a agregação é por
  instrutor, não por curso, no modo "Por Período".
- Mesma disciplina com múltiplos lançamentos de aula no recorte: Início = data do lançamento mais
  antigo, Término = data do lançamento mais recente — nunca uma linha por lançamento individual
  (a granularidade da tabela é por disciplina, não por aula).
- Nenhum instrutor com aula registrada no recorte escolhido: tabela vazia com mensagem informativa,
  nunca erro — mesma RN-DEG-01 de todo o projeto.
- Curso/trimestre/semestre sem nenhuma turma associada: mesmo comportamento — vazio com mensagem,
  nunca exceção não tratada.
- `Capacitacao_Didatica` com valor presente mas só espaços em branco: tratado como vazio (NÃO) —
  evita falso "SIM" por dado sujo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O módulo de Instrutores MUST ganhar um botão "Gerar O.S. de Instrutoria", visível na
  mesma barra de ações dos botões já existentes.
- **FR-002**: Ao clicar no botão, o sistema MUST ocultar a listagem principal de instrutores e exibir
  uma nova view de cálculo/validação, sem recarregar a página (mesmo mecanismo de alternância por
  visibilidade já usado em toda a SPA — nunca `window.location`/reload).
- **FR-003**: A nova view MUST oferecer um seletor de modalidade com exatamente 2 opções: "Por Curso/
  Estágio" e "Por Período (Trimestral/Semestral)".
- **FR-004**: Quando a modalidade for "Por Curso/Estágio", a view MUST oferecer um seletor de curso
  contendo a sigla (`ID_Curso`) de todo curso cadastrado, de qualquer classificação. Quando a
  modalidade for "Por Período", a view MUST oferecer 3 controles em cascata: um seletor de Ano, um
  seletor de tipo de recorte (Trimestre ou Semestre) e um seletor de número do recorte, cujas
  opções mudam conforme o tipo escolhido (1º a 4º quando Trimestre; 1º ou 2º quando Semestre).
- **FR-005**: O sistema MUST oferecer uma função de backend que, dado o filtro escolhido, agrupa por
  instrutor toda aula efetivamente realizada (`registros_aula`, `Categoria_Normativa=
  'Aula'`, turma associada não `Cancelada`) cujo `ID_Grade` pertence ao curso selecionado (modo
  Curso/Estágio) ou cuja própria `Data` do registro cai dentro do intervalo do trimestre/semestre
  selecionado (modo Período) — **nunca** por interseção do período da turma: uma turma pode
  atravessar mais de um trimestre/semestre (caso real confirmado na spec 027, `C-Esp-ALH`,
  07/09 a 04/12), e filtrar só pela turma incluiria aulas de fora do recorte escolhido.
- **FR-006**: Para cada instrutor com ao menos 1 aula realizada no recorte, o resultado MUST incluir:
  `Posto_Graduacao`, `NIP`, `Nome_Completo` (nome puro, sem formatação hierárquica — MUST NUNCA
  chamar `formatarNomeInstrutor_`, função de frontend inacessível ao backend), e Capacitação Didática
  convertida para `"SIM"` (quando `Capacitacao_Didatica` tem conteúdo não-vazio após `trim()`) ou
  `"NÃO"` (quando vazio).
- **FR-007**: Para cada instrutor, o resultado MUST incluir um array de disciplinas — uma entrada por
  `ID_Grade` distinto ministrado por ele no recorte — cada uma com: Início (menor `Data` registrada
  para essa combinação instrutor+disciplina no recorte), Término (maior `Data` registrada), Curso
  (`ID_Curso`) e nome da disciplina.
- **FR-008**: Instrutor sem nenhuma aula realizada no recorte selecionado MUST NUNCA aparecer no
  resultado — a lista é de quem efetivamente lecionou, não do quadro completo de instrutores.
- **FR-009**: A tabela de validação MUST exibir exatamente as colunas `Posto/Grad. | NIP | Nome |
  Téc. de Ens. | Início | Término | Curso | Disciplina`, nesta ordem.
- **FR-009.1** [achado de `/speckit-plan`, RN-ANT-01, Risco Alto]: os instrutores MUST aparecer
  ordenados por antiguidade decrescente de posto — "toda lista, seletor ou filtro de instrutores,
  em qualquer tela do sistema, deve ser ordenado por antiguidade... sem exceção"
  (`04-Regras-de-Negocio-a-Preservar.md`). O pedido original não mencionou ordenação, mas a regra é
  transversal e Risco Alto — omiti-la aqui seria uma regressão silenciosa, não uma omissão neutra.
- **FR-010**: Quando um instrutor tiver mais de 1 disciplina no resultado, as células de `Posto/
  Grad.`, `NIP`, `Nome` e `Téc. de Ens.` MUST usar `rowspan` HTML igual à quantidade de disciplinas
  dele, aparecendo uma única vez — nunca repetidas por linha de disciplina.
- **FR-011**: A view de resultado MUST ter um botão "Voltar" que a oculta e restaura a listagem
  principal de instrutores, sem recarregar a página.
- **FR-012**: Este épico MUST NUNCA gerar documento a rota de impressão `/print/*`, PDF, nem gravar nada no 
  Supabase Storage — a tabela em tela é o único artefato desta entrega (escopo declarado explicitamente pelo
  pedido original: "EXCLUSIVAMENTE... exibição dos resultados em tela para validação").
- **FR-013**: Este épico MUST NUNCA alterar o schema do banco — nenhuma aba/coluna nova, leitura
  pura sobre dados já existentes (`instrutores`, `registros_aula`, `disciplinas`,
  `turmas`, `cursos`).

### Key Entities

Nenhuma entidade nova — leitura pura sobre `instrutores`, `registros_aula`,
`disciplinas`, `turmas` e `cursos` (todas já existentes, ver `01-schema.md`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Selecionar um curso real com aulas registradas produz uma tabela cujos instrutores e
  disciplinas batem exatamente com os lançamentos reais de `registros_aula` para aquele
  curso — nenhum instrutor sem aula aparece, nenhum instrutor com aula fica de fora.
- **SC-002**: Um instrutor com múltiplas disciplinas no recorte aparece exatamente 1 vez na coluna de
  dados cadastrais (verificável contando `rowspan` no HTML gerado), nunca uma vez por disciplina.
- **SC-003**: A coluna "Téc. de Ens." mostra `SIM` para todo instrutor com `Capacitacao_Didatica`
  preenchida e `NÃO` para todo instrutor com o campo vazio — 100% de correspondência.
- **SC-004**: Nenhum documento é criado no Supabase Storage nem no Docs em nenhum fluxo deste épico.
- **SC-005**: 0% de regressão na suíte de testes (`pnpm vitest run`).

## Assumptions

- **Modo "Por Curso/Estágio" sem limite de data**: considera toda turma não-cancelada associada ao
  curso escolhido e toda aula realizada registrada para essas turmas, sem recorte temporal adicional
  — o próprio curso já delimita o escopo (mesma lógica de "gerar a minuta da execução completa
  daquele curso").
- **"Semestre" segue o calendário civil**: 1º semestre = janeiro a junho, 2º semestre = julho a
  dezembro — mesma convenção de trimestre civil já adotada no Épico LIQ, sem precedente de código
  próprio (conceito novo, aritmética análoga à de `trimestreParaIntervalo_`).
- **"Curso/Estágio" é só o rótulo da modalidade, não um filtro adicional por classificação** — o
  seletor de curso lista `ID_Curso` de qualquer `Classificacao` (Regular, Especial, Expedito, Estágio
  de Qualificação, Aperfeiçoamento Avançado).
- **O layout de 8 colunas e o agrupamento por instrutor com `rowspan` seguem a descrição do pedido
  original**, sem corroboração documental própria deste projeto (achado real: nenhum arquivo "O.S.-
  17" foi encontrado no repositório nem na pasta de trabalho) — aceito por vir diretamente do
  responsável, com conhecimento operacional do documento real usado no CIAARA.
- **Nome exibido na tabela é `Posto_Graduacao` + `Nome_Completo` sem formatação hierárquica** —
  `formatarNomeInstrutor_` é função de frontend, inacessível ao backend que gera este agrupamento.
- **Esta é a primeira de possivelmente duas fatias** — geração do documento oficial final (
  Docs/PDF/Supabase Storage), análoga ao que o Épico LIQ entrega para a LIQ, fica para uma spec futura,
  explicitamente fora do escopo desta (FR-012, pedido original).
