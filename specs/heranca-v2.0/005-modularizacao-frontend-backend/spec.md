# Feature Specification: Épico B — Modularização do Frontend e do Backend

**Feature Branch**: `005-modularizacao-frontend-backend`

**Created**: 2026-08-15

**Status**: Draft

**Input**: User description: "Épico B do documento 06 — Modularização do Frontend e do Backend"

**Fontes primárias**: `docs/fase-1/06-Backlog-de-Epicos-V2.md` (Épico B), `docs/fase-1/02-Requisitos-Funcionais.md` (RF-MOD-01 a 04), `docs/fase-1/10-Plano-de-Execucao-Spec-Kit.md` §6/§8, `docs/arquitetura/02-modularizacao.md` (mapa-alvo de arquivos, documento transversal já escrito na Fase 2), `.specify/memory/constitution.md` (Princípio VI — critério de não regressão).

## Clarifications

### Session 2026-08-15

- Q: O novo `app/(app)/avaliacoes/page.tsx` deve reunir todo o conteúdo relacionado a avaliações — inclusive
  o formulário "Agendar avaliação", hoje em `app/(app)/atividades/page.tsx` — ou só o que está em
  `app/(app)/cursos/[curso]/page.tsx`? → A: Opção A — consolida tudo (agendar + painel + vista) em `app/(app)/avaliacoes/page.tsx`.
  `app/(app)/atividades/page.tsx` (que hoje mistura AEC/TAD/TR/Estudo Individual com o agendamento de
  avaliação — o mesmo problema de assunto misturado que motivou a User Story 1) fica só com
  AEC/TAD/TR/Estudo Individual, alinhado ao próprio nome do arquivo.

## Nota de escopo — o que já existe vs. o que o documento 06 imaginava

O documento 06 descreve Épico B como dividir um monólito de ~2.700 linhas de backend e ~3.100 de
frontend (o estado da V1.0). **Isso já não é o estado do projeto**: desde o Épico E, cada épico
desta sessão criou seus próprios arquivos pequenos e coerentes por domínio — hoje já existem 13
arquivos `.ts` e 9 arquivos `.html`, nenhum deles remotamente perto de um monólito (o maior
arquivo de backend tem 270 linhas; o maior de frontend, 244). A divisão "por domínio" que o
documento 06 pede já aconteceu organicamente, inclusive para módulos que
`docs/arquitetura/02-modularizacao.md` (escrito antes dos Épicos E/I/F) não previa
(`lib/dominio/regras-normativas.ts`, `lib/acoes/disciplinas.ts`, `lib/acoes/usuarios.ts`).

O trabalho real que sobra, verificado arquivo a arquivo antes de escrever esta spec:

1. **`app/(app)/cursos/[curso]/page.tsx` (244 linhas) mistura seis assuntos**: seletor de curso, 3 indicadores de
   teto normativo, acompanhamento de Estudo Individual, totalizadores de 5 categorias, painel de
   situação de execução de avaliações e o formulário de registro de vista de prova.
   **`app/(app)/atividades/page.tsx` tem o mesmo problema em menor escala** (Clarifications
   2026-08-15): mistura o lançamento de AEC/TAD/TR/Estudo Individual (o assunto que dá nome ao
   arquivo) com o formulário de agendamento de avaliação — um domínio diferente, que o mapa de
   arquitetura já previa pertencer a `app/(app)/avaliacoes/page.tsx`, não a esta tela.
2. **`docs/arquitetura/02-modularizacao.md` ficou desatualizado** — não lista os 3 arquivos que
   surgiram organicamente, e ainda lista telas/módulos (Painel Início, Cronograma unificado,
   Catálogo de Cursos, Feriados, motor preditivo, sistema de modais) para os quais **nenhum
   conteúdo existe ainda para ser "dividido"** — construir essas telas do zero seria funcionalidade
   nova, não modularização, e já pertence a outros épicos do backlog (G, H) ou a nenhum épico
   sequenciado ainda (Cursos, Feriados).
3. **O critério de aceite original do documento 06** ("saída idêntica, campo a campo, para o
   curso CAHO 2026") **já foi substituído** pela suíte de invariantes estruturais como método de
   não regressão (constitution, Princípio VI, decisão de 2026-08-10) — esta spec usa o critério já
   vigente, não o texto original do documento 06.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Editar a tela de Avaliações sem navegar por outras telas (Priority: P1) 🎯 MVP

Como desenvolvedor, quero que tudo relacionado a Avaliações — o formulário de agendamento (hoje em
`app/(app)/atividades/page.tsx`), o painel de situação de execução e o formulário de registro de
vista de prova (hoje em `app/(app)/cursos/[curso]/page.tsx`, junto com tetos, Estudo Individual e totalizadores) —
viva num único arquivo de view próprio, para poder localizar e alterar a tela de Avaliações sem
navegar por outras telas, e para que `app/(app)/atividades/page.tsx` volte a conter só o que seu nome
promete (Clarifications 2026-08-15).

**Why this priority**: são os dois únicos casos reais, hoje, do problema que este épico existe
para resolver — o maior arquivo de frontend do projeto (`app/(app)/cursos/[curso]/page.tsx`) e o único outro arquivo
que mistura conteúdo de domínios diferentes (`app/(app)/atividades/page.tsx`).

**Independent Test**: abrir a Página do Curso e confirmar que ela continua mostrando tetos/Estudo
Individual/totalizadores normalmente; abrir Atividades Extraclasse e confirmar que só resta o
lançamento de AEC/TAD/TR/Estudo Individual; abrir a nova tela de Avaliações e confirmar que
agendamento, painel de situação de execução e registro de vista de prova continuam funcionando
exatamente como antes, sem nenhuma diferença de comportamento.

**Acceptance Scenarios**:

1. **Given** o código-fonte do projeto, **When** um desenvolvedor procura qualquer funcionalidade
   de Avaliações (agendar, acompanhar situação, registrar vista), **Then** encontra tudo num único
   arquivo de view dedicado a Avaliações, nunca dentro dos arquivos da Página do Curso ou de
   Atividades Extraclasse.
2. **Given** a tela de Avaliações extraída, **When** um usuário agenda uma avaliação, registra uma
   vista de prova ou cancela um agendamento, **Then** o resultado é idêntico ao que já acontecia
   antes da extração — mesma função de backend, mesmo comportamento, mesma mensagem.
3. **Given** a Página do Curso depois da extração, **When** um usuário a abre, **Then** continua
   mostrando os tetos normativos, o acompanhamento de Estudo Individual e os totalizadores
   normalmente, sem nenhuma quebra visual ou funcional.
4. **Given** a tela de Atividades Extraclasse depois da extração, **When** um usuário a abre,
   **Then** só vê o formulário de AEC/TAD/TR/Estudo Individual — nenhum campo de avaliação.

---

### User Story 2 - Documento de arquitetura reflete a estrutura real de arquivos (Priority: P1)

Como desenvolvedor, quero que `docs/arquitetura/02-modularizacao.md` liste exatamente os arquivos
que existem no projeto — inclusive os que surgiram organicamente nos Épicos E/I/F —, para que o
documento continue sendo a referência confiável de onde colocar cada função nova, em vez de uma
fonte desatualizada que preciso ignorar.

**Why this priority**: um mapa de arquitetura errado é pior do que nenhum mapa — quem confiar nele
vai procurar `instrutorHabilitado_` em `lib/acoes/instrutores.ts` (onde o mapa original dizia) e não vai
achar (está em `lib/dominio/regras-normativas.ts`, achado real desta spec).

**Independent Test**: comparar, arquivo por arquivo, a tabela de `02-modularizacao.md` contra
`lib/acoes/` e `app/` reais — toda linha da tabela corresponde a um arquivo que existe,
e todo arquivo que existe aparece em alguma linha da tabela.

**Acceptance Scenarios**:

1. **Given** o mapa de arquivos atualizado, **When** um desenvolvedor procura qualquer função já
   existente no projeto, **Then** o mapa indica corretamente em qual arquivo ela está.
2. **Given** um módulo/tela que hoje não tem nenhum conteúdo implementado (ex.: Painel Início,
   Cronograma unificado), **When** um desenvolvedor consulta o mapa, **Then** vê explicitamente que
   esse módulo ainda não foi construído e a quem pertence construí-lo (qual épico do backlog),
   em vez de uma linha que sugere que o arquivo já existe.

---

### User Story 3 - Totalizadores/Relatório em seu próprio arquivo de view (Priority: P2)

Como desenvolvedor, quero que o bloco de totalizadores por curso — hoje dentro de `app/(app)/cursos/[curso]/page.tsx`
— viva em seu próprio arquivo de view, para que futuras seções do Relatório consolidado (hoje só
uma das sete previstas no documento 06 existe) tenham onde crescer sem voltar a inflar a Página do
Curso.

**Why this priority**: mesmo problema estrutural da User Story 1, mas de impacto menor hoje — é um
único bloco de tabela, não seis assuntos misturados.

**Independent Test**: abrir a Página do Curso e confirmar que ela não mostra mais o bloco de
totalizadores diretamente; abrir a nova tela de Relatório e confirmar que os totalizadores
aparecem, idênticos aos de antes da extração.

**Acceptance Scenarios**:

1. **Given** o bloco de totalizadores extraído, **When** um usuário o consulta na nova tela,
   **Then** os valores são idênticos aos que a Página do Curso já mostrava antes da extração.

---

### User Story 4 - Aviso de implantação parcial continua confiável com mais arquivos (Priority: P2)

Como Admin responsável pela implantação, quero continuar recebendo um aviso claro de "implantação
parcial" caso nem todos os arquivos novos tenham sido publicados juntos, para não operar o sistema
num estado inconsistente sem perceber — esse risco aumenta, não diminui, com mais arquivos.

**Why this priority**: é uma proteção de segurança operacional já existente (`o SHA do commit`,
Épicos E em diante) — este épico só precisa confirmar que ela continua funcionando com o número
atual de arquivos, não construir um mecanismo novo.

**Independent Test**: publicar deliberadamente uma versão com o backend atualizado mas o frontend
desatualizado (ou vice-versa) e confirmar que o sistema mostra o aviso de implantação parcial, com
o número atual de arquivos backend/frontend.

**Acceptance Scenarios**:

1. **Given** um backend com `o SHA do commit` mais novo que o frontend publicado (ou vice-versa),
   **When** um usuário abre o sistema, **Then** vê o aviso de implantação parcial, exatamente como
   já acontece hoje.

---

### Edge Cases

- Uma função movida de um arquivo `.ts` para outro nunca deve introduzir uma chamada de função de
  outro arquivo no nível superior (gotcha crítico do Next.js, `CLAUDE.md`) — checagem manual
  antes de cada commit de extração, não só automatizada. **Não se aplica ao escopo real desta
  spec** (research.md achado 4: nenhum arquivo `.ts` é tocado por este épico — as funções
  relevantes já vivem nos arquivos certos desde os Épicos I/F) — mantido aqui como precaução
  permanente para qualquer épico futuro que extraia/mova código de backend.
- Um usuário com a tela de Avaliações ou Relatório aberta no momento de uma implantação parcial
  deve ver o mesmo aviso que já veria em qualquer outra tela — a extração não cria um caminho novo
  que escape da checagem de `o SHA do commit`.
- Módulos sem nenhum conteúdo hoje (Painel Início, Cronograma unificado, Catálogo de Cursos,
  Feriados, motor preditivo, sistema de modais) não são tocados por este épico — nenhuma tela nova
  é criada do zero, só o que já existe é reorganizado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O formulário de agendamento de avaliação, o painel de situação de execução e o
  formulário de registro de vista de prova DEVEM viver num único arquivo de view próprio,
  dedicado a Avaliações, incluído pelo mecanismo de composição de componentes do App Router`) — nunca
  espalhados entre a Página do Curso e Atividades Extraclasse (Clarifications 2026-08-15).
- **FR-001a**: `app/(app)/atividades/page.tsx` DEVE conter, depois da extração, só o lançamento de
  AEC/TAD/TR/Estudo Individual — nenhum campo relacionado a avaliação.
- **FR-002**: O bloco de totalizadores por curso DEVE viver em um arquivo de view próprio, dedicado
  a Relatório.
- **FR-003**: Nenhuma extração de código para um arquivo novo DEVE alterar nome de função,
  assinatura pública, ou comportamento observável — mesmo princípio de refatoração já usado no
  histórico do projeto (RF-MOD-02/03).
- **FR-004**: `docs/arquitetura/02-modularizacao.md` DEVE ser atualizado para listar exatamente os
  arquivos backend/frontend que existem no projeto ao final deste épico, incluindo os que
  surgiram organicamente nos Épicos E/I/F (`lib/dominio/regras-normativas.ts`, `lib/acoes/disciplinas.ts`, `lib/acoes/usuarios.ts`).
- **FR-005**: Módulos/telas do mapa de arquitetura sem nenhum conteúdo implementado DEVEM ser
  marcados explicitamente como "não construído ainda" e associados ao épico do backlog responsável
  por construí-los, em vez de aparecer como se já existissem.
- **FR-006**: A detecção de implantação parcial (`o SHA do commit` comparado entre backend e frontend)
  DEVE continuar funcionando corretamente com o número atual de arquivos, verificada
  explicitamente por este épico (não presumida).
- **FR-007**: A verificação de não regressão de qualquer extração/reorganização DEVE ser feita pela
  suíte de invariantes estruturais (`tests/`) — nunca por comparação de saída contra o curso CAHO
  2026 (constitution, Princípio VI; substitui o critério de aceite original do documento 06).

### Key Entities

- **Arquivo de view**: unidade de organização do frontend — um assunto de tela por arquivo,
  incluído via a importação de componentes a partir de `app/layout.tsx`.
- **Arquivo de domínio backend**: unidade de organização do backend — funções de uma mesma área
  agrupadas num arquivo `.ts`, todas continuando a compartilhar o escopo global o projeto Supabase e o repositório Next.js.
- **Mapa de arquitetura**: `docs/arquitetura/02-modularizacao.md` — inventário de referência de
  onde cada função/tela vive hoje, e de onde deve viver quando construída.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um desenvolvedor localiza e edita a tela de Avaliações sem abrir nenhum outro
  arquivo de view.
- **SC-002**: Toda função de backend já existente continua acessível pelo mesmo nome, sem nenhuma
  mudança de assinatura, depois da reorganização.
- **SC-003**: A suíte de invariantes estruturais passa sem nenhuma regressão antes e depois da
  reorganização.
- **SC-004**: O mapa de arquitetura lista exatamente os arquivos que existem no projeto — nenhum
  arquivo real fica de fora, nenhuma linha do mapa aponta para um arquivo que não existe sem estar
  marcada como "não construído ainda".
- **SC-005**: Uma implantação com um arquivo faltando continua sendo detectada e sinalizada ao
  usuário, com o número atual de arquivos.

## Assumptions

- A divisão "por domínio" do backend que o documento 06 descreve já foi entregue organicamente
  pelos Épicos E/I/F — este épico não recria `lib/supabase/server.ts`/``lib/supabase/middleware.ts` + policies RLS`/`lib/acoes/crud.ts`/``app/layout.tsx` + `lib/supabase/server.ts``/
  `lib/acoes/aulas.ts`/`lib/acoes/avaliacoes.ts`/`lib/acoes/cronograma.ts`/`lib/acoes/dsa.ts`/`lib/acoes/relatorio.ts`/`lib/acoes/instrutores.ts`/
  `lib/acoes/usuarios.ts`/`lib/acoes/disciplinas.ts`/`lib/dominio/regras-normativas.ts` — só reconcilia a documentação e extrai as
  duas views que ainda misturam múltiplos assuntos.
- `lib/dominio/regras-normativas.ts` (não previsto no mapa original de `02-modularizacao.md`) é mantido como
  está — já é um módulo coerente e testado de funções normativas puras; reorganizar seu conteúdo
  só para caber no mapa original geraria risco de regressão sem benefício real (constitution,
  Princípio VI).
- Telas/módulos sem nenhum conteúdo implementado hoje (Painel Início, Cronograma unificado,
  Catálogo de Cursos, Feriados, motor preditivo, sistema de modais) permanecem fora de escopo —
  construí-los do zero é funcionalidade nova, não modularização, e pertence aos épicos que já os
  têm no backlog (G para Cronograma/motor preditivo; H depende de G) ou a nenhum épico ainda
  sequenciado (Cursos, Feriados, Painel Início, modais).
- O critério de aceite original do documento 06 (saída idêntica para o curso CAHO 2026) é
  substituído pelo critério já vigente no projeto (suíte de invariantes estruturais, constitution
  Princípio VI) — mesma decisão já aplicada a outros documentos de Fase 1 (`docs/fase-1/10`, §8.4).
