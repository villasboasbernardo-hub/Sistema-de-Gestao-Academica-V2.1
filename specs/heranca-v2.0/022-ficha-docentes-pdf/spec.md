# Feature Specification: Ficha de Cadastro de Docentes Ampliada e Geração de PDF via a rota de impressão `/print/*`

**Feature Branch**: `022-ficha-docentes-pdf`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "NOVO ÉPICO: Ficha de Cadastro de Docentes e Integração com PDF gerado pela rota `/print/*`. Contexto Obrigatório: Precisamos criar a nova Ficha de Cadastro de Instrutores. O formulário será extenso e dividido em 3 seções lógicas. Além da gravação dos dados no PostgreSQL, o backend deve possuir a lógica para mesclar esses dados com um template da rota `/print/ficha-instrutor` para gerar um PDF. [...] Escopo: 1. Atualize a aba de Instrutores... 2. Formulário em 3 Abas (Nav Tabs)... 3. `gerarFichaPDF(idInstrutor)` usando `a rota de impressão `/print/*``... Critério de Aceite: formulário responsivo em 3 abas, campos obrigatórios validados, backend com função estruturada para mesclar dados no a rota de impressão `/print/*`. [Clarificado por Bernardo: adicionar apenas os campos novos ao banco, não modificar/remover nenhum campo atual — 'estritamente' não é um replacement de schema.]"

## Achados reais (leitura de código e dados antes de escrever qualquer requisito)

- **A Ficha de Cadastro de Instrutores já existe** (spec 016-ficha-formulario-instrutores,
  2026-08-17) — formulário completo de cadastro/edição, `ID_Instrutor` auto-gerado e read-only
  (`gerarProximoIdSequencial_`), NIP mascarado, catálogo de 57 siglas `Esp_Hab_Obs`, `Preferencia`
  como matriz de checkboxes, "Disciplinas Habilitadas" exibida (calculada). Este épico não cria a
  Ficha do zero — amplia campos, reestrutura o layout em abas e adiciona geração de PDF real sobre
  o que já existe.
- **Comparação campo a campo do pedido contra o schema real de `instrutores`** (30 colunas,
  `BLOCOS_EDICAO_INSTRUTOR`, ``app/(app)/instrutores/page.tsx`:776-815`):
  - Grupo 1: `ID_Instrutor`, `Posto_Graduacao`, `Esp_Hab_Obs`, `Nome_Completo`, `Nome_Guerra`, `NIP`,
    `Data_Nascimento` já existem. `Email_Funcional` já existe como `Email` (nome diferente, mantido
    como está). **`RG`, `CPF`, `Orgao_Emissor`, `Telefone`, `RETELMA` e o bloco de Endereço
    (`Logradouro`, `Numero`, `Bairro`, `Cidade`, `Complemento`, `CEP`) não existem — únicos campos
    realmente novos deste grupo.**
  - Grupo 2: `Categoria`, `Regime_Trabalho`, `Data_Avaliacao`, `Preferencia`, `Nivel_Escolaridade`,
    `OM`, `Data_Assuncao_Setor` já existem. `Departamento_Divisao` já existe como `Dep_Divisao`
    (nome canônico desde o schema físico, documento `01-schema.md` §5.4) — **nenhum campo novo
    neste grupo**.
  - Grupo 3: `Capacitacao_Didatica`, `Disciplinas_Ministradas`, `Data_Inicio_Docencia_MB`
    (= "Inicio_Docencia_MB" do pedido), `Data_Inicio_Docencia_CIAARA` já existem.
    `Formacao_Principal`/`Formacao_Secundaria` já existem, mas como um único campo de texto livre
    `Formacao_Principal_Secundaria` — **por instrução de Bernardo (não modificar campos atuais),
    este campo único é mantido como está, sem separar em sub-campos estruturados**; a estrutura
    "Curso/Instituição/Data" pedida no texto original não é implementada nesta spec.
    **`Area_Conhecimento` não existe — único campo genuinamente novo deste grupo.**
    `Disciplinas_Habilitadas`, como pedido no texto original (campo a preencher), **não corresponde
    a nenhuma coluna real** — é um valor calculado no cliente (`disciplinasHabilitadasDoInstrutor_`,
    a partir de vínculos `instrutor_disciplina`), com mecanismo dedicado próprio desde a spec 019
    (painel de busca + checkboxes). Por instrução de Bernardo, nenhuma coluna nova é criada para
    isso — o mecanismo existente permanece intacto e fora do escopo desta spec.
- **Total de campos genuinamente novos: 12** — `RG`, `CPF`, `Orgao_Emissor`, `Telefone`, `RETELMA`,
  `Endereco_Logradouro`, `Endereco_Numero`, `Endereco_Bairro`, `Endereco_Cidade`,
  `Endereco_Complemento`, `Endereco_CEP`, `Area_Conhecimento`. Todos `texto-livre` (nenhum é
  dropdown fechado nem tem formato normativo especial conhecido), adicionados ao final da aba
  `instrutores` (acréscimo de colunas, nunca remoção/reordenação — Princípio IV/C-05).
- **Risco crítico identificado e confirmado com Bernardo antes de escrever qualquer requisito**: o
  texto original pedia "ESTRITAMENTE" os campos dos 3 grupos, o que, se implementado como
  substituição literal do schema, apagaria colunas reais das quais funcionalidades já entregues
  dependem — `Status` (Ativar/Desativar/Reativar, spec 021), `Antiguidade_Declarada` (ordenação
  RN-ANT-02 em toda a listagem/dropdowns/gráficos), `Instrutor_Completo`/`Carga_Horaria_Ministrada_Ano`
  (colunas `FORMULA`/calculadas protegidas em `COLUNAS_FORMULA`), `Editado_Por`/`Timestamp_Edicao`
  (trilha de auditoria, C-06), `Disciplinas_Ministradas` (dado legado que a spec 016 preservou
  deliberadamente). **Bernardo confirmou**: "adicione apenas os campos novos... não considere o
  estritamente como replacement no schema" — nenhuma coluna existente é tocada, removida ou
  renomeada nesta spec.
- **Colisão de nome pré-existente em `Data_Avaliacao`** (already documented no achado da spec 016 —
  `instrutores.Data_Avaliacao`, sempre vazia, colide de nome com o `Data_Avaliacao` de
  `avaliacoes`/`avaliacoes_planejadas`, campo não relacionado e muito usado por RN-AVAL-02) — como
  não é um campo novo, esta spec não a resolve nem a agrava; mantida exatamente como está.
- **O layout atual do formulário já não é uma lista única — são 4 blocos empilhados em cards**
  (`renderizarPainelEdicaoInstrutor_`, um `<div class="card">` por bloco: "Identificação", "Vínculo
  Institucional", "Qualificação Docente", "Sistema (somente leitura)") — não existe nenhuma
  estrutura de abas (`.nav-tabs`/`.tab-pane`) hoje. A reorganização em 3 abas pedida é trabalho
  real, mapeada a partir dos 4 blocos atuais + os 12 campos novos (ver Key Entities).
- **Nenhuma validação de campo obrigatório existe hoje** — nem client-side (nenhum atributo
  `required` gerado por `renderizarCampoEdicaoInstrutor_`) nem server-side
  (`cadastrarInstrutor`/`atualizarInstrutor` não checam nenhum campo antes de gravar). Confirma o
  pedido como trabalho real, não uma percepção.
- **Geração de PDF via `a rota de impressão `/print/*`` não existe em nenhum lugar do backend** — busca exaustiva por
  `a rota de impressão `/print/*``, `o Supabase Storage`, `.getAs('application/pdf')`, `.copy(` não encontrou nenhuma
  ocorrência. A funcionalidade "Imprimir Ficha" de hoje é inteiramente client-side
  (`abrirModalFichaInstrutor_`/`renderizarModalFichaInstrutor_`, ``app/(app)/instrutores/page.tsx`:1196-1229`):
  monta uma tabela HTML em memória (sem chamada de rede) e aciona `window.print()` com CSS de
  página nomeada (``app/globals.css`:109-123`). `gerarFichaPDF(idInstrutor)` é 100% trabalho novo — um
  mecanismo de geração de documento server-side que não tem nenhum precedente no projeto (primeira
  vez que `a rota de impressão `/print/*``/`o Supabase Storage` são usados nesta base de código).
- **Correção de arquitetura sobre o pedido original (Princípio VII, Configuração Sobre Constante)**:
  o pedido sugere que "o ID do documento [Template] será fornecido nas variáveis globais" — literal
  constante no código `.ts`. Isso contraria a Restrição Adicional já estabelecida no projeto
  ("Limites normativos... vivem em tabelas administráveis... nunca como literais/constantes no
  código `.ts`"), a mesma regra que já tirou os tetos AEC/TAD/TR e as janelas de curso do código.
  `config_parametros` já existe e já tem um leitor genérico (`lerConfigParametros_`,
  ``lib/dominio/regras-normativas.ts`:94-103`) — o ID do template da rota `/print/ficha-instrutor` é um dado exatamente desse tipo
  (configuração administrável, nunca hardcoded) e entra lá, não como constante em `lib/acoes/instrutores.ts`.
- **Perfis**: `CRUD_CONFIG['instrutores'].escrita` já é `['Admin', 'Operador'].concat(
  PERFIS_DIVISAO_ADMIN_ACADEMICA)` (RF-INSTR-12) — a ampliação de campos (FR-001 a FR-006) reaproveita
  exatamente essa mesma autorização de escrita, sem criar um perfil novo. A geração de PDF (FR-007)
  usa o alcance de **leitura** (`PERFIS_TODOS`), não o de escrita — mesmo alcance do botão "Imprimir
  Ficha" já existente, já que `gerarFichaPDF` nunca grava em `instrutores` (Clarifications
  2026-08-19).

## Clarifications

### Session 2026-08-19

- Q: A implementação literal de "ESTRITAMENTE" apagaria colunas reais em uso (`Status`,
  `Antiguidade_Declarada`, colunas `FORMULA`, auditoria) — isso é intencional? → A: Não — adicionar
  apenas os campos novos, nenhum campo atual é modificado, removido ou substituído; "estritamente"
  não é um replacement de schema.
- Q: O template da rota `/print/ficha-instrutor` da Ficha já existe, ou esta spec também precisa defini-lo/criá-lo? →
  A: Já existe — ID `1EzYw9oSBFiM41Qi_F9qQylKTVxGbtwnQl_IaYinPUpg` fornecido por Bernardo, que
  autorizou editar o conteúdo/tags do Template livremente para atender ao contrato desta spec.
- Q: `gerarFichaPDF` deve reaproveitar o wrapper genérico de chamada ao servidor (a Server Action, timeout
  fixo de 30s compartilhado com toda chamada do sistema) ou precisa de um timeout próprio maior,
  dado que operações `a rota de impressão `/print/*`` (copiar, substituir texto, exportar PDF, limpar) são
  inerentemente mais lentas que uma leitura de planilha? → A: Reaproveitar a Server Action sem nenhum
  mecanismo novo — a geração de PDF de um único instrutor deve caber nos 30s já usados por toda
  chamada do sistema.
- Q: Quem pode gerar o PDF — qualquer perfil com acesso de leitura à Ficha (mesmo alcance do botão
  "Imprimir Ficha" já existente) ou só os perfis autorizados a editar instrutor (Admin/Operador/
  Divisão de Administração Acadêmica)? → A: Acesso de leitura (`PERFIS_TODOS`) — mesmo alcance do
  botão "Imprimir Ficha" já existente; `gerarFichaPDF` nunca escreve em `instrutores`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar/editar um instrutor com os novos campos de identificação e endereço (Priority: P1)

Como Encarregado/Ajudante da Divisão de Administração Acadêmica (ou Admin/Operador), quero
registrar documentos de identificação (RG, CPF, órgão emissor), telefone, RETELMA e o endereço
completo de um instrutor no mesmo formulário de cadastro já existente, para ter esses dados
centralizados sem precisar de um controle paralelo fora do sistema.

**Why this priority**: É o maior bloco de campos genuinamente novos (11 dos 12) e a parte do pedido
com valor de negócio mais direto e imediato — dado cadastral que hoje não tem nenhum lugar no
sistema.

**Independent Test**: Abrir o cadastro/edição de um instrutor, preencher RG/CPF/Órgão
Emissor/Telefone/RETELMA/Endereço completo, salvar, reabrir a edição do mesmo instrutor e confirmar
que todos os valores persistiram exatamente como digitados.

**Acceptance Scenarios**:

1. **Given** o formulário de cadastro de um novo instrutor, **When** o usuário preenche RG, CPF,
   Órgão Emissor, Telefone, RETELMA e os 6 sub-campos de endereço (Logradouro, Número, Bairro,
   Cidade, Complemento, CEP) e salva, **Then** todos os 11 valores são gravados em
   `instrutores` nas colunas novas correspondentes, sem afetar nenhuma coluna existente.
2. **Given** um instrutor já cadastrado antes desta spec (colunas novas vazias), **When** sua edição
   é aberta, **Then** os campos novos aparecem em branco (nunca erro/exceção) e podem ser
   preenchidos e salvos normalmente a partir de agora.
3. **Given** o campo `Área de Conhecimento` (Grupo 3, também novo), **When** preenchido e salvo,
   **Then** persiste como texto livre, sem validação de formato.

---

### User Story 2 - Navegar o formulário em 3 abas com campos obrigatórios validados (Priority: P2)

Como usuário preenchendo a Ficha de um instrutor, quero que o formulário extenso seja organizado em
3 abas claras ("1. Dados Pessoais", "2. Dados Profissionais", "3. Dados Complementares") e que o
sistema me impeça de salvar sem os 4 campos essenciais preenchidos, para não perder tempo
navegando um formulário longo nem descobrir um cadastro incompleto só depois de salvar.

**Why this priority**: Reorganização de UX sobre uma tela que já funciona (menor risco que criar
campos novos) — depende logicamente da User Story 1 existir para ter conteúdo a distribuir nas 3
abas, mas é testável de forma independente olhando só a navegação/validação.

**Independent Test**: Abrir o formulário, confirmar as 3 abas e a navegação entre elas sem perda de
dados já digitados; tentar salvar com Posto/Graduação, Especialidade/Habilitação/Observação, Nome
Completo ou Nome de Guerra vazios e confirmar o bloqueio, com mensagem clara indicando qual campo
falta.

**Acceptance Scenarios**:

1. **Given** o formulário de cadastro/edição de instrutor aberto, **When** observado, **Then** os
   campos estão organizados em exatamente 3 abas Tailwind CSS Nav-Tabs, cada uma com os campos hoje
   distribuídos nos 4 blocos atuais + os 12 campos novos (mapeamento em Key Entities), sem nenhum
   campo duplicado ou ausente em relação ao formulário atual mais os novos.
2. **Given** qualquer uma das 3 abas, **When** o usuário troca de aba, **Then** os valores já
   digitados em todas as abas permanecem intactos (troca de aba é só exibição, nunca reset de
   estado).
3. **Given** o formulário com Posto/Graduação, Especialidade/Habilitação/Observação, Nome Completo
   ou Nome de Guerra vazio, **When** o usuário tenta salvar, **Then** o salvamento é bloqueado antes
   de qualquer chamada ao servidor, com indicação visual de qual(is) campo(s) obrigatório(s)
   está(ão) faltando — se o campo faltante estiver em uma aba diferente da atualmente visível, a
   aba correta é automaticamente selecionada.
4. **Given** os mesmos 4 campos preenchidos no servidor, **When** uma tentativa de gravação chega
   ao backend sem um deles (contorno da validação client-side, ex.: chamada direta), **Then** o
   backend rejeita a gravação com um erro claro, nunca persiste um registro com esses campos vazios
   (defesa em profundidade — client-side sozinho não é suficiente).

---

### User Story 3 - Gerar a Ficha do Instrutor como PDF real via a rota de impressão `/print/*` (Priority: P3)

Como usuário que precisa entregar ou arquivar a Ficha de um instrutor fora do sistema, quero gerar
um arquivo PDF de verdade (não apenas a caixa de impressão do navegador) a partir de um modelo
formatado no a rota de impressão `/print/*`, para ter um documento oficial, padronizado e compartilhável.

**Why this priority**: Maior complexidade técnica e único componente sem nenhum precedente no
projeto (primeiro uso de `a rota de impressão `/print/*``/`o Supabase Storage`) — depende logicamente de User Story 1 (dados a
mesclar) e é a parte mais isolada/arriscada, adequada para vir por último.

**Independent Test**: Chamar `gerarFichaPDF(idInstrutor)` para um instrutor com dados completos e
confirmar que a URL retornada abre um PDF real (não uma janela de impressão do navegador) contendo
os dados mesclados do instrutor, e que nenhum documento temporário permanece no  Supabase Storage depois
da geração.

**Acceptance Scenarios**:

1. **Given** um instrutor com Ficha completa, **When** o usuário aciona a geração de PDF, **Then**
   o backend copia o template da rota `/print/ficha-instrutor` configurado, substitui as tags (`{{NOME_COMPLETO}}`
   etc.) pelos dados reais do instrutor, exporta o resultado como PDF, apaga o documento Docs
   temporário, e devolve ao frontend uma URL que abre o PDF gerado.
2. **Given** o template da rota `/print/ficha-instrutor` já existente (`1EzYw9oSBFiM41Qi_F9qQylKTVxGbtwnQl_IaYinPUpg`,
   Clarifications 2026-08-19), **When** o sistema precisa do ID, **Then** é lido de
   `config_parametros` (nunca uma constante literal em `lib/acoes/instrutores.ts`) — RNF-NORM-08/RF-DADOS-04,
   mesmo padrão já usado para tetos normativos e calendário; o conteúdo/tags do Template pode ser
   editado livremente (autorização já concedida) para atender ao contrato de mesclagem desta spec.
3. **Given** um Template sem alguma tag esperada, ou uma tag no Template sem correspondência nos
   dados do instrutor, **When** a mesclagem roda, **Then** o sistema não lança exceção não tratada —
   tag sem dado correspondente é substituída por string vazia, degradação segura (Princípio V),
   nunca bloqueio.
4. **Given** uma falha ao gerar o PDF (ex.: Template inacessível, ID mal configurado), **When** o
   usuário aciona a geração, **Then** recebe uma mensagem de erro clara no frontend, e nenhum
   documento temporário órfão fica no Supabase Storage (limpeza garantida mesmo em caminho de erro).
5. **Given** o botão "Imprimir Ficha" (`window.print()`) já existente, **When** o novo botão de PDF
   é adicionado, **Then** o mecanismo antigo permanece disponível e inalterado — o PDF via
   `a rota de impressão `/print/*`` é uma opção adicional, não uma substituição (nenhum consumidor do `window.print()`
   existente é removido nesta spec).

---

### Edge Cases

- Instrutor sem nenhum campo novo preenchido (dado legado, migrado antes desta spec): a Ficha/PDF
  exibe os campos vazios normalmente, sem erro; a validação obrigatória dos 4 campos legados
  (Posto/Graduação etc.) continua se aplicando independentemente dos campos novos.
- CPF/RG digitados sem máscara/formatação: tratados como texto livre nesta spec (nenhuma máscara
  nova pedida no texto original além do NIP já existente) — validação de formato fica fora de
  escopo, mesma decisão que já vale para `OM`/`Email` hoje.
- Geração de PDF chamada duas vezes seguidas para o mesmo instrutor: cada chamada cria e limpa seu
  próprio documento temporário — não há estado compartilhado entre chamadas, sem risco de colisão.
- template da rota `/print/ficha-instrutor` alterado (novas tags, tags removidas) depois desta spec: como a lista de
  tags não é hardcoded além do mapeamento campo→tag, uma tag nova no Template sem correspondência
  no mapeamento simplesmente não é substituída (permanece como texto literal `{{TAG}}` no PDF) —
  degradação visível, nunca exceção.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST acrescentar exatamente 12 colunas novas à tabela `instrutores`: `RG`,
  `CPF`, `Orgao_Emissor`, `Telefone`, `RETELMA`, `Endereco_Logradouro`, `Endereco_Numero`,
  `Endereco_Bairro`, `Endereco_Cidade`, `Endereco_Complemento`, `Endereco_CEP`,
  `Area_Conhecimento` — todas texto livre, todas opcionais (nenhuma delas está entre os 4 campos
  obrigatórios do FR-006).
- **FR-002**: O sistema MUST NOT remover, renomear, reordenar ou alterar o comportamento de nenhuma
  coluna existente de `instrutores` — inclusive `Status`, `Antiguidade_Declarada`,
  `Instrutor_Completo`, `Carga_Horaria_Ministrada_Ano`, `Editado_Por`, `Timestamp_Edicao`,
  `Disciplinas_Ministradas`, `Formacao_Principal_Secundaria` e `Data_Avaliacao` (Clarifications
  2026-08-19).
- **FR-003**: O formulário de cadastro/edição de instrutor MUST reorganizar todos os campos
  (existentes + os 12 novos do FR-001) em exatamente 3 abas Tailwind CSS Nav-Tabs: "1. Dados
  Pessoais", "2. Dados Profissionais", "3. Dados Complementares" (mapeamento de campos por aba em
  Key Entities).
- **FR-004**: Trocar de aba MUST preservar os valores já digitados em todas as abas — nenhuma troca
  de aba reseta ou perde dado do formulário.
- **FR-005**: O sistema MUST continuar exibindo `ID_Instrutor` como somente leitura (oculto em
  cadastro, read-only em edição) — comportamento já existente, sem alteração nesta spec.
- **FR-006**: O sistema MUST impedir o salvamento, tanto no cliente quanto no servidor, quando
  `Posto_Graduacao`, `Esp_Hab_Obs`, `Nome_Completo` ou `Nome_Guerra` estiverem vazios — validação
  client-side bloqueia antes da chamada ao servidor (com indicação de qual campo falta e troca
  automática para a aba correspondente); validação server-side rejeita a gravação como defesa em
  profundidade, mesmo se a checagem client-side for contornada.
- **FR-007**: O sistema MUST fornecer uma função de backend `gerarFichaPDF(idInstrutor)` que: (a)
  copia o template da rota `/print/ficha-instrutor` configurado; (b) substitui as tags de mesclagem pelos dados reais
  do instrutor; (c) exporta o resultado como PDF; (d) apaga o documento Docs temporário criado no
  passo (a), inclusive em caminho de erro; (e) devolve ao frontend uma URL para abrir o PDF gerado.
- **FR-008**: O ID do template da rota `/print/ficha-instrutor` usado pelo FR-007 MUST ser lido de
  `config_parametros`, nunca uma constante literal no código `.ts` (Princípio VII).
- **FR-009**: Uma tag de mesclagem no Template sem dado correspondente no instrutor, ou um campo do
  instrutor sem tag correspondente no Template, MUST degradar de forma segura (string vazia ou tag
  ignorada) — nunca lançar exceção não tratada (Princípio V).
- **FR-010**: O mecanismo de impressão já existente ("Imprimir Ficha", `window.print()`) MUST
  permanecer disponível e inalterado — a geração de PDF via `a rota de impressão `/print/*`` é adicional, não
  substitui nem remove o botão/fluxo atual.
- **FR-011**: A geração de PDF MUST estar disponível para o mesmo alcance de perfis que já acessam a
  leitura de `instrutores` (`CRUD_CONFIG['instrutores'].leitura`, `PERFIS_TODOS`) — o mesmo
  alcance do botão "Imprimir Ficha" já existente (Clarifications 2026-08-19); nenhum perfil novo é
  criado, e `gerarFichaPDF` nunca requer nem verifica autorização de escrita, já que não grava em
  `instrutores`.
- **FR-012**: `gerarFichaPDF` MUST ser chamada pelo wrapper genérico já existente (a Server Action), sem
  nenhum timeout ou mecanismo de chamada dedicado — a geração de PDF de um único instrutor MUST
  caber no limite de 30 segundos já compartilhado por toda chamada do sistema (Clarifications
  2026-08-19).

### Key Entities *(include if feature involves data)*

- **Instrutor** (`instrutores`): ganha 12 colunas novas (FR-001), todas texto livre, adicionadas
  ao final da aba, sem afetar as ~30 colunas existentes.
- **Mapeamento proposto de abas** (FR-003 — 3 abas cobrindo os 4 blocos atuais + campos novos):
  - **Aba 1 "Dados Pessoais"**: `ID_Instrutor`, `Nome_Completo`, `Nome_Guerra`, `Posto_Graduacao`,
    `Antiguidade_Declarada` (calculado), `Esp_Hab_Obs`, `NIP`, `Data_Nascimento`, `RG`, `CPF`,
    `Orgao_Emissor`, `Telefone`, `Endereco_Logradouro`, `Endereco_Numero`, `Endereco_Bairro`,
    `Endereco_Cidade`, `Endereco_Complemento`, `Endereco_CEP` (bloco atual "Identificação" + os
    campos pessoais novos).
  - **Aba 2 "Dados Profissionais"**: `Categoria`, `OM`, `Dep_Divisao`, `Data_Assuncao_Setor`,
    `Tempo_Setor_Anos` (calculado), `Email`, `RETELMA`, `Regime_Trabalho` (bloco atual "Vínculo
    Institucional" + `RETELMA`, novo).
  - **Aba 3 "Dados Complementares"**: `Nivel_Escolaridade`, `Formacao_Principal_Secundaria`,
    `Area_Conhecimento`, `Capacitacao_Didatica`, `Disciplinas_Ministradas`,
    `Data_Inicio_Docencia_MB`, `Data_Inicio_Docencia_CIAARA`, `Data_Avaliacao`, `Preferencia`,
    `Docente_Ate_2_Disciplinas` (oculto) — bloco atual "Qualificação Docente" + `Area_Conhecimento`,
    novo. O bloco atual "Sistema (somente leitura)" (`Carga_Horaria_Ministrada_Ano`,
    `Instrutor_Completo`, `Status`, `Editado_Por`, `Timestamp_Edicao`, `Origem_Migracao_v1`)
    permanece fora das 3 abas de conteúdo, exibido como hoje (não faz parte de nenhum dos 3 grupos
    do pedido original).
- **config_parametros**: ganha uma linha nova (`Chave` a definir em `/speckit-plan`, ex.
  `ID_TEMPLATE_FICHA_INSTRUTOR`) com `Valor = '1EzYw9oSBFiM41Qi_F9qQylKTVxGbtwnQl_IaYinPUpg'`
  (Clarifications 2026-08-19) para o ID do template da rota `/print/ficha-instrutor` (FR-008).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos 12 campos novos persistem corretamente após salvar e reabrir a edição de um
  instrutor, sem nenhuma perda de valor já existente nos outros ~30 campos.
- **SC-002**: O formulário exibe exatamente 3 abas, e 100% dos campos hoje existentes + os 12 novos
  aparecem em exatamente uma das 3 abas (sem duplicação, sem ausência).
- **SC-003**: 0% das tentativas de salvar com algum dos 4 campos obrigatórios vazio resultam em
  gravação no servidor — bloqueadas no cliente ou rejeitadas no servidor em 100% dos casos.
- **SC-004**: A geração de PDF produz um arquivo PDF real e utilizável (não a caixa de diálogo de
  impressão do navegador) dentro do limite de 30 segundos já usado por toda chamada ao servidor no
  sistema (a Server Action, Clarifications 2026-08-19 — nenhum timeout dedicado é criado), para um instrutor
  com Ficha completa, e não deixa nenhum documento a rota de impressão `/print/*` temporário órfão no Supabase Storage após a
  execução, mesmo em caminho de erro.
- **SC-005**: 0% de regressão nas ~30 colunas/comportamentos existentes de `instrutores`
  (confirmado pela suíte de invariantes estruturais existente, sem nenhum teste quebrado).

## Assumptions

- Os 12 campos novos são todos texto livre, sem máscara/validação de formato — nenhuma das 3
  seções do pedido original especificou um formato normativo (ex.: máscara de CPF/CEP), e nenhum
  catálogo fechado existe para eles hoje; mesma decisão de "campo livre até haver pedido explícito
  de formato" já usada para `OM`/`Email` no formulário atual.
- `Formacao_Principal`/`Formacao_Secundaria` permanecem como o único campo existente
  `Formacao_Principal_Secundaria`, sem separação em sub-campos estruturados (Curso/Instituição/
  Data) — decisão direta de Bernardo ("não modifique os campos atuais"), reabre não é permitido
  nesta spec; se a estrutura detalhada for necessária no futuro, é uma spec própria.
  `Disciplinas_Habilitadas` continua sendo o valor calculado já existente (spec 019), sem nenhuma
  coluna nova — mesmo raciocínio.
- O botão "Imprimir Ficha" (`window.print()`) e o novo botão de geração de PDF via `a rota de impressão `/print/*``
  coexistem como duas opções distintas na mesma tela — a decisão de qual rótulo/posição exata cada
  botão usa fica para `/speckit-plan`, sem impacto no contrato funcional desta spec.
- A migração de schema (adicionar as 12 colunas na banco de produção) segue o mesmo padrão já usado em
  toda spec anterior desta sessão: script versionado em `migracao/`, sempre aditivo (nunca reduz
  linhas/colunas existentes), execução contra a banco de produção como pendência de implantação, não
  bloqueando o fechamento do código desta spec.
