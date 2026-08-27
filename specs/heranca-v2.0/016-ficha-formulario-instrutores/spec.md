# Feature Specification: Ficha de Cadastro de Instrutores e Formulário Avançado

**Feature Branch**: `016-ficha-formulario-instrutores`

**Created**: 2026-08-17

**Status**: Draft

**Input**: User description: "NOVO ÉPICO: Ficha de Cadastro de Instrutores e Formulário Avançado.
Expandir o módulo de instrutores criando um formulário de cadastro/edição altamente restritivo e
resgatando a funcionalidade de 'Impressão da Ficha do Instrutor' que existia na v1.0. Remover a
coluna Ultima_Avaliacao_Desempenho do schema. Botão 'Cadastrar Novo Instrutor' abrindo o formulário;
botão 'Imprimir Ficha' abrindo visualização limpa + `window.print()`. Regras de automação por campo
(ID_Instrutor gerado pelo backend; Antiguidade_Declarada calculada do Posto_Graduacao; Tempo_Setor_
Anos calculado de Data_Assuncao_Setor; Disciplinas_Ministradas/Carga_Horaria_Ministrada_Ano
calculados do cruzamento com aulas/disciplinas; Editado_Por/Timestamp_Edicao somente-leitura;
Docente_Ate_2_Disciplinas/Origem_Migracao_v1 ocultos); máscara de NIP (00.0000.00); datepickers;
checkboxes (Capacitação Didática, matriz de Preferência Segunda-Sexta × Manhã/Tarde); dropdowns
estritos (Categoria, Regime_Trabalho, Nivel_Escolaridade, Status, Posto_Graduacao, Esp_Hab_Obs —
este último exibindo nome completo mas gravando só a sigla, catálogo de 60 especialidades navais)."

## Contexto e achados confirmados no código e nos dados antes desta spec

Verificação direta do schema físico ao vivo (cópia de trabalho local, `instrutores`, 177 linhas —
mesma fonte já usada e verificada como fiel ao vivo pelas specs 014/015 desta sessão), do código
atual (`app/(app)/instrutores/page.tsx`, `lib/acoes/instrutores.ts`/`lib/acoes/crud.ts``) e do código da
V1.0 (`Versão 1.0/index.html`) antes de escrever qualquer requisito:

1. **Todo campo pedido nesta spec já existe fisicamente em `instrutores` — zero coluna nova
   necessária, só a remoção pedida de `Ultima_Avaliacao_Desempenho`.** Conferência campo a campo
   contra as 31 colunas reais confirma: `ID_Instrutor, Antiguidade_Declarada, Posto_Graduacao,
   Esp_Hab_Obs, Nome_Completo, Nome_Guerra, Categoria, NIP, Data_Nascimento, OM, Dep_Divisao,
   Data_Assuncao_Setor, Tempo_Setor_Anos, Email, Regime_Trabalho, Nivel_Escolaridade,
   Formacao_Principal_Secundaria, Capacitacao_Didatica, Disciplinas_Ministradas,
   Data_Inicio_Docencia_MB, Data_Inicio_Docencia_CIAARA, Docente_Ate_2_Disciplinas,
   Carga_Horaria_Ministrada_Ano, Ultima_Avaliacao_Desempenho, Data_Avaliacao, Instrutor_Completo,
   Preferencia, Status, Editado_Por, Timestamp_Edicao, Origem_Migracao_v1`. "Formação Principal" e
   "Formação Secundária" do pedido são um único campo físico, `Formacao_Principal_Secundaria`
   (confirmado por amostra: `"Ap-HN"`) — tratado como um campo de texto livre único nesta spec, não
   como dois campos novos (Assumptions).
2. **`Ultima_Avaliacao_Desempenho`/`Data_Avaliacao` (de `instrutores`) estão 100% vazios (0 de 177
   linhas cada)** — a remoção pedida do primeiro é segura quanto a perda de dado real (nenhum existe
   hoje), mas ainda exige o protocolo de snapshot + `migracao_log` de sempre (Princípio IV da
   constitution — nenhuma remoção de coluna é feita sem esse protocolo, mesmo quando vazia).
   **Achado crítico de nomenclatura**: `Data_Avaliacao` é um nome de coluna que também existe,
   **sem nenhuma relação**, em `avaliacoes`/`avaliacoes_planejadas` — aba central de RN-AVAL-02
   (vista de prova, Épico I), referenciada em `lib/acoes/avaliacoes.ts`/`lib/acoes/dsa.ts`/`lib/dominio/regras-normativas.ts`/
   `app/(app)/avaliacoes/page.tsx`. Esta spec só toca `instrutores.Data_Avaliacao` (que fica, com datepicker,
   por não ter sido pedida sua remoção) — qualquer implementação futura precisa manter essa distinção
   explícita para não arriscar tocar a coluna homônima de `avaliacoes` por engano.
3. **`Ficha do Instrutor` da V1.0 localizada e lida por completo** (`Versão 1.0/index.html:3012-3056`,
   função `abrirFichaInstrutor`): um modal Tailwind CSS (`#modalFichaInstrutor`) com cabeçalho/rodapé
   marcados `no-print`, corpo `#fichaInstrutorConteudo.area-impressao` preenchido com uma tabela de
   ~20 linhas rótulo/valor, cabeçalho de impressão fixo ("MARINHA DO BRASIL" / "CENTRO DE INSTRUÇÃO E
   ADESTRAMENTO ALMIRANTE RADLER DE AQUINO" / "FICHA DE INSTRUTOR"), e um botão "Imprimir" no rodapé
   chamando `window.print()` — exatamente o padrão pedido nesta spec. A V1.0 mostrava, lado a lado,
   `Disciplinas Ministradas` (texto livre) **e** `Disciplinas Habilitadas` (calculado, cruzando os
   vínculos instrutor↔disciplina) como duas linhas distintas — achado relevante para o item 6 abaixo.
4. **`.area-impressao`/`@media print` já existe em `app/globals.css` (Épico H, RF-DSA-06) e seu próprio
   comentário já antecipava esta reutilização**: "portado do padrão já usado duas vezes na V1.0 (DSA
   + Ficha do Instrutor)" — confirma que é um componente genérico do Design System, não algo
   específico do DSA; esta spec reaproveita a mesma classe, não inventa uma nova. **Ressalva real**: a
   regra hoje tem `@page { size: landscape; }` fixo — adequado para a grade larga do DSA, mas uma
   ficha de dados pessoais (lista vertical de campos) é tradicionalmente melhor em retrato — tratado
   como decisão de design em Assumptions, não um bloqueio.
5. **NIP: os 157 valores preenchidos (de 177) batem 100% com o padrão `00.0000.00` pedido** —
   confirmado por validação de regex contra todos os valores reais, zero exceções. A máscara estrita
   pedida não tem nenhum risco de rejeitar dado legado.
6. **`Disciplinas_Ministradas`: 147 de 177 linhas (83%) têm texto livre real e histórico** (ex.:
   `"Hidrografia"`, `"Cartografia"`) — migrado da V1.0, nunca calculado. Tornar este campo "read-only
   estrito, calculado automaticamente" **da forma mais literal possível apagaria/esconderia esse
   histórico**, o que a constitution proíbe (Princípio IV). A própria V1.0 (achado 3) já resolvia essa
   mesma tensão mostrando os dois lados: o texto livre histórico **e** o valor calculado, como campos
   distintos — esta spec segue o mesmo padrão (Assumptions), em vez de literalmente substituir um pelo
   outro.
7. **`Esp_Hab_Obs`: 162 de 177 linhas (91%) preenchidas, mas o dado real está longe de ser as 60
   siglas limpas do catálogo pedido.** Amostra de valores distintos reais: `"-HN"`, `"(EN)"`, `"-ME"`,
   `"(T)"`, `"-GC"`, `"(RM2-T)"`, `"-SI"`, `"(RM1)"`, `"-EP"`, `"-EL"`, `"(RM1-HN)"`, `"(RM1-MT)"`,
   `"(AA)"`, `"-MR"`, `"-MA"`, `"-CI"`, `"-EF"`, entre outros — a maioria são a sigla certa envolvida
   em artefato de formatação herdado da V1.0 (hífen ou parênteses ao redor, ex. `"-HN"` → `HN`,
   `"(RM2-T)"` → `RM2-T`, ambos siglas reais do catálogo pedido), mas **2 casos reais não têm
   correspondência em nenhuma das 60 siglas do catálogo pedido**: `"NS"` (6 instrutores) e o segmento
   `"MT"` dentro de `"(RM1-MT)"` (1 instrutor). Convertidos para dropdown estrito sem tratamento, esses
   7 registros ficariam sem opção correspondente selecionável.
8. **Domínios reais confirmados, com pequenas divergências de string em relação ao pedido**:
   `Categoria` = `Militar da Ativa`(160), `TTC`(6), **`SCNS`**(6, não `"SC"` como o pedido abrevia —
   `SC` já é um código real de `Posto_Graduacao`, Servidor Civil, achado da spec 014; usar `"SC"`
   também para Categoria colidiria com esse código), `MMN`(5). `Regime_Trabalho` = `"20h Semanais"`
   (160), `"40h Semanais"`(11), `"Dedicação Exclusiva"`(6, não `"DE"` como o pedido abrevia).
   `Nivel_Escolaridade` (142 vazios, 35 preenchidos) = `"Nível médio"`, `"Graduação"`,
   `"Pós-Graduação"`, `"Mestrado"`, `"Doutorado"` — grafia exata confirmada, pequenas diferenças de
   capitalização em relação ao pedido. `Posto_Graduacao` = os 11 códigos já formalizados nas specs
   014/015 (`2ºSG, 1ºSG, 3ºSG, 1ºTen, SO, CC, CT, SC, CF, 2ºTen, CMG`) — **`AE`/`VA`/`CA` (Almirantes)
   pedidos nesta spec não existem em nenhum registro real hoje**, são adição pedida para o domínio
   fechado, não correção de um domínio incompleto.
9. **`Preferencia`: só 2 de 177 preenchidos, ambos `"Sem preferência"` (texto livre)** — não há
   nenhum dado real hoje no formato matricial dia×período pedido; a migração para checkbox não tem
   dado legado relevante para preservar/reconciliar. **`Docente_Ate_2_Disciplinas`: 0 de 177
   preenchidos** — ocultar é seguro, nada fica escondido.
10. **`Tempo_Setor_Anos`: 0 de 177 preenchidos, apesar de `Data_Assuncao_Setor` estar preenchida na
    maioria das linhas amostradas** — o campo hoje é um número editável (`BLOCOS_EDICAO_INSTRUTOR`,
    spec 014) que ninguém preenche; torná-lo calculado (nunca digitado) não descarta nenhum dado real,
    só passa a mostrar um valor onde hoje mostra vazio.
11. **`ESCALA_ANTIGUIDADE_POSTO`/`ORDEM_ANTIGUIDADE_POSTO`/`CIRCULO_HIERARQUICO_POR_POSTO` — a escala
    de antiguidade de `Posto_Graduacao`, já revisada duas vezes nesta sessão (P-14/RN-ANT-02 na spec
    014; estendida ao Círculo Hierárquico na spec 015) — precisa de uma **terceira revisão**: os 3
    novos códigos (`AE`, `VA`, `CA`) entram no topo da escala, todos com peso `0` (à frente do `CMG`,
    peso `1`, deslocando nada abaixo) — a mesma regra de valores inteiros já pedida explicitamente
    pelo usuário nesta spec. O mapa vive hoje duplicado em `lib/acoes/instrutores.ts` e em
    `app/(app)/instrutores/page.tsx` (2 cópias, padrão já aceito no projeto) — as duas precisam da
    mesma atualização.

## Clarifications

A maioria das ambiguidades reais do pedido (achados 6, 7, 8, 11) foi resolvida por leitura direta do
código/dados antes de escrever os requisitos, documentada na seção Assumptions — mesmo padrão já
estabelecido nos épicos/hotfixes anteriores desta sessão. 2 pontos de maior impacto arquitetural, sem
precedente/dado real suficiente para decidir sozinho, foram levados a `/speckit-clarify`.

### Session 2026-08-17

- Q: Ao gerar `ID_Instrutor` automaticamente, o backend deve continuar o formato de inteiro simples
  (os 177 registros reais hoje são só `"1"`–`"177"`, sem prefixo — confirmado em
  `CRUD_CONFIG['instrutores'].prefixo = ''`) ou trocar para o padrão `PREFIXO-NNNNNN` já usado por
  toda outra entidade do projeto? → A: Continuar o inteiro simples (`"178"`, `"179"`, ...) — evita um
  formato de ID em duas camadas permanente, para um campo que é chave interna, nunca exibido como
  "código" ao usuário.
- Q: Quando `Status` muda para "Inativo" pelo dropdown do novo formulário (em vez do botão dedicado
  "Desativar"), o salvamento deve disparar o mesmo aviso de confirmação de RN-INST-02, ou esse aviso
  continua exclusivo do botão dedicado? → A: O salvamento também dispara o mesmo aviso — RN-INST-02
  vale em qualquer caminho que desative um instrutor, não só no botão dedicado.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar um novo instrutor pelo formulário completo (Priority: P1)

Um usuário clica em "Cadastrar Novo Instrutor" e preenche um formulário único, organizado por blocos
lógicos, com máscara de NIP, seletores de data, checkboxes (Capacitação Didática, matriz de
Preferência) e dropdowns estritos (Categoria, Regime de Trabalho, Nível de Escolaridade, Posto/
Graduação, Especialidade/Habilitação por nome completo) — sem nunca ver ou poder editar `ID_Instrutor`
(ainda não existe) nem qualquer campo calculado/oculto.

**Why this priority**: É o objetivo central do pedido — hoje o cadastro é um formulário de 3 campos
(`ID_Instrutor` digitado manualmente, Nome de Guerra, Posto/Graduação); sem isso, os outros 2 User
Stories (impressão, automações) não têm um formulário completo para operar.

**Independent Test**: Abrir "Cadastrar Novo Instrutor", preencher todos os campos visíveis, salvar, e
confirmar que o registro criado em `instrutores` tem um `ID_Instrutor` novo gerado pelo backend
(nunca digitado), `Antiguidade_Declarada` já calculada a partir do Posto/Graduação escolhido, e todos
os demais valores gravados exatamente como preenchidos.

**Acceptance Scenarios**:

1. **Given** o formulário de cadastro aberto, **When** o usuário observa os campos, **Then**
   `ID_Instrutor`, `Editado_Por`, `Timestamp_Edicao`, `Disciplinas_Ministradas` (parte calculada) e
   `Carga_Horaria_Ministrada_Ano` não aparecem como campos preenchíveis (ausentes no cadastro ou
   mostrados como texto não editável quando fizer sentido exibi-los); `Docente_Ate_2_Disciplinas` e
   `Origem_Migracao_v1` não aparecem em lugar nenhum da tela.
2. **Given** o campo NIP, **When** o usuário digita `123456789` (sem pontuação, mais de 8 dígitos),
   **Then** o campo força/corrige para o formato `00.0000.00`, nunca aceitando um valor fora desse
   padrão.
3. **Given** o campo Posto/Graduação, **When** o usuário seleciona `"1ºTen"`, **Then** o campo
   Antiguidade (somente leitura) atualiza imediatamente para `5`, sem exigir nenhuma ação adicional
   do usuário nem envolver o backend antes do salvamento.
4. **Given** o campo Especialidade/Habilitação, **When** o usuário seleciona "Hidrografia e
   Navegação" no dropdown, **Then** o valor gravado no backend ao salvar é `"HN"`, nunca o texto
   completo.
5. **Given** o formulário salvo com sucesso, **When** a tela atualiza, **Then** o novo instrutor
   aparece na listagem principal do módulo, com o `ID_Instrutor` gerado visível ali (mas continua
   somente-leitura em qualquer edição futura).

---

### User Story 2 - Editar um instrutor existente no mesmo formulário (Priority: P1)

Um usuário abre um instrutor já cadastrado para edição e vê o mesmo formulário completo da User Story
1, agora com `ID_Instrutor` visível (mas travado), todos os valores já preenchidos, e os campos
calculados (Antiguidade, Tempo no Setor, CH Ministrada) mostrando os valores atuais — nunca digitáveis
diretamente.

**Why this priority**: Mesmo formulário da User Story 1, mesma prioridade — sem isso, o formulário rico
só serve para cadastro, e toda edição continuaria pelo painel reduzido de hoje.

**Independent Test**: Abrir um instrutor real para edição, confirmar que `ID_Instrutor` aparece como
texto travado (não campo), trocar o Posto/Graduação e confirmar que a Antiguidade recalcula
imediatamente antes mesmo de salvar, salvar e confirmar que `Editado_Por`/`Timestamp_Edicao` foram
atualizados pelo backend.

**Acceptance Scenarios**:

1. **Given** um instrutor real (ex.: `Posto_Graduacao="1ºTen"`, `NIP="99.2067.22"`), **When** a tela
   de edição carrega, **Then** todos os campos aparecem pré-preenchidos com os valores reais daquele
   instrutor, incluindo o NIP já formatado corretamente.
2. **Given** a tela de edição aberta, **When** o usuário observa o campo Tempo no Setor, **Then** o
   valor mostrado é a diferença entre hoje e `Data_Assuncao_Setor`, recalculada a cada carregamento da
   tela — nunca um número gravado editável.
3. **Given** um instrutor com `Disciplinas_Ministradas` histórico preenchido (texto livre, ex.:
   "Hidrografia") e vínculos ativos de qualificação em disciplinas específicas, **When** a tela de
   edição carrega, **Then** o texto histórico continua visível como está (somente leitura, nunca
   apagado nem sobrescrito), e o valor calculado por cruzamento com as disciplinas aparece como um
   campo adicional e claramente distinto, não como substituto do primeiro.
4. **Given** um instrutor com `Esp_Hab_Obs` legado que não corresponde a nenhuma das 60 siglas do
   catálogo (achado 7 — ex.: `"NS"`), **When** a tela de edição carrega, **Then** o valor legado
   continua visível de alguma forma (nunca substituído silenciosamente por um valor em branco ou por
   uma sigla escolhida arbitrariamente), com um aviso claro de que precisa ser corrigido para uma das
   60 siglas na próxima edição.

---

### User Story 3 - Imprimir a ficha de um instrutor (Priority: P2)

Um usuário clica em "Imprimir Ficha" a partir da visualização de um instrutor e vê uma versão limpa
dos dados (sem botões, sem menus, só os campos relevantes em formato de leitura), podendo acionar a
impressão nativa do navegador a partir dali.

**Why this priority**: É uma funcionalidade resgatada, independente e menos crítica que ter o
cadastro/edição funcionando — mas de valor real (documento formal já usado na V1.0).

**Independent Test**: Clicar em "Imprimir Ficha" em qualquer instrutor e confirmar que abre uma
visualização com cabeçalho institucional, os campos relevantes em formato de leitura, e nenhum
elemento de navegação/edição — chamar a impressão do navegador e confirmar que só essa área aparece
no resultado.

**Acceptance Scenarios**:

1. **Given** a listagem ou a tela de edição de um instrutor, **When** o usuário clica em "Imprimir
   Ficha", **Then** abre uma visualização com cabeçalho institucional (mesmo texto da V1.0:
   "MARINHA DO BRASIL" / "CENTRO DE INSTRUÇÃO E ADESTRAMENTO ALMIRANTE RADLER DE AQUINO" / "FICHA DE
   INSTRUTOR") e os dados do instrutor em formato de leitura.
2. **Given** a visualização de impressão aberta, **When** o usuário aciona a impressão (nativa do
   navegador), **Then** só a área de dados aparece no resultado — nenhum botão, menu, barra de
   filtros ou elemento de navegação da aplicação.
3. **Given** um instrutor com campos vazios (ex.: `Nivel_Escolaridade` não preenchido, caso comum —
   142 de 177 hoje), **When** a ficha é gerada, **Then** o campo aparece com um marcador neutro
   (ex.: "—"), nunca `undefined`/`null`/em branco sem explicação.

---

### Edge Cases

- Instrutor com `Posto_Graduacao` = `AE`/`VA`/`CA` (Edge Case futuro — 0 casos reais hoje): entra no
  Círculo Hierárquico "Oficiais" (mesmo critério já usado para os demais postos de oficial) e no topo
  da ordenação por antiguidade, com peso `0`, à frente de `CMG` — sem quebrar nenhum gráfico/filtro/
  dropdown já existente que dependa dessa escala (specs 014/015).
- `Esp_Hab_Obs` legado que não corresponde a nenhuma sigla do catálogo, mesmo após normalizar
  hífen/parênteses (achado 7, casos reais: `"NS"`, o segmento `"MT"` dentro de `"(RM1-MT)"`): o
  formulário de edição não força uma escolha arbitrária nem apaga o valor — mostra o valor legado com
  aviso, e só passa a exigir uma das 60 siglas quando o próprio usuário decidir corrigi-lo.
- Combinação de `Capacitacao_Didatica`/`Preferencia` sem nenhuma opção marcada: grava como vazio,
  nunca lança erro nem impede salvar (nenhum desses campos é obrigatório).
- `NIP` deixado vazio no cadastro (achado 5 — já é o caso de 20 dos 177 instrutores hoje): o
  formulário permite salvar sem NIP — a máscara só se aplica a validar o formato de um valor
  digitado, não a exigir que o campo seja preenchido.
- Impressão da Ficha de um instrutor recém-cadastrado, antes de ter qualquer vínculo de qualificação
  ou aula lançada: os campos calculados (Disciplinas Habilitadas, CH Ministrada no Ano) aparecem
  zerados/vazios com marcador neutro, nunca erro.
- Usuário edita outros campos de um instrutor e, no mesmo formulário, também muda `Status` de `Ativo`
  para `Inativo` antes de salvar (Clarifications 2026-08-17): o salvamento dispara o mesmo aviso de
  confirmação do botão "Desativar" antes de gravar qualquer coisa — cancelar o aviso não perde as
  outras edições já feitas no formulário, só não desativa nem salva nada até confirmar de novo.

## Requirements *(mandatory)*

### Functional Requirements

**Schema (PostgreSQL)**

- **FR-001**: O sistema DEVE remover a coluna `Ultima_Avaliacao_Desempenho` de `instrutores`,
  seguindo o protocolo padrão de alteração de schema do projeto — snapshot do banco antes da
  mudança e registro em `migracao_log` (Princípio IV da constitution), mesmo a coluna estando 100%
  vazia hoje (achado 2).
- **FR-002**: Nenhuma outra coluna de `instrutores` é adicionada, removida ou renomeada por esta
  spec — todos os demais campos pedidos já existem fisicamente (achado 1).
- **FR-003**: `instrutores.Data_Avaliacao` (distinta da coluna homônima de `avaliacoes`/
  `avaliacoes_planejadas`, achado 2) permanece no schema, com seletor de data no formulário.

**Formulário de Cadastro/Edição**

- **FR-004**: O sistema DEVE exibir um botão "Cadastrar Novo Instrutor", visível a partir da listagem
  principal do módulo, que abre um formulário único cobrindo todos os campos editáveis de
  `instrutores` (lista completa no achado 1, menos os campos calculados/ocultos de FR-006 a
  FR-010), organizado em blocos lógicos responsivos (Tailwind CSS + shadcn/ui).
- **FR-005**: O mesmo formulário DEVE ser reaproveitado para editar um instrutor já cadastrado — sem
  duplicar campos/lógica entre uma tela de cadastro e uma tela de edição separadas.

**Campos calculados e bloqueados**

- **FR-006**: `ID_Instrutor` DEVE ficar oculto no formulário de cadastro (ainda não existe) e visível
  como texto somente-leitura na edição — gerado pelo backend no primeiro salvamento, nunca digitável,
  nunca editável depois de criado. Formato: inteiro sequencial simples, continuando a sequência real
  hoje (`"1"`–`"177"`) sem prefixo — nunca o padrão `PREFIXO-NNNNNN` usado por outras entidades
  (Clarifications 2026-08-17).
- **FR-007**: `Antiguidade_Declarada` DEVE ser calculada automaticamente a partir da seleção de
  `Posto_Graduacao`, atualizando no formulário (frontend) antes mesmo de salvar, e gravada pelo
  backend no salvamento — nunca um campo digitável. Escala de pesos inteiros (revisão de RN-ANT-02,
  achado 11): `AE`/`VA`/`CA`=0; `CMG`=1; `CF`=2; `CC`=3; `CT`=4; `1ºTen`=5; `2ºTen`=6; `SO`=7;
  `1ºSG`=8; `2ºSG`=9; `3ºSG`=10; `SC`=11.
- **FR-008**: `Tempo_Setor_Anos` DEVE ser calculado dinamicamente (diferença entre hoje e
  `Data_Assuncao_Setor`) a cada carregamento da tela — nunca lido de um valor gravado, nunca campo
  digitável.
- **FR-009**: `Carga_Horaria_Ministrada_Ano` continua sendo calculada pelo cruzamento com
  `registros_aula` (já implementado desde a spec 014, achado 5 daquela spec) — somente
  leitura estrita, sem mudança de fonte nesta spec.
- **FR-010**: Além de continuar exibindo o texto livre histórico de `Disciplinas_Ministradas` (nunca
  apagado, achado 6), o formulário DEVE exibir, como campo adicional e claramente distinto, o valor
  calculado por cruzamento com os vínculos de qualificação (`instrutor_disciplina`) — mesmo padrão já
  usado pela V1.0 (achado 3, "Disciplinas Habilitadas").
- **FR-011**: `Editado_Por` e `Timestamp_Edicao` DEVEM aparecer como somente-leitura estrito quando
  exibidos, preenchidos exclusivamente pelo backend a cada gravação — nunca campos de formulário.
- **FR-012**: `Docente_Ate_2_Disciplinas` e `Origem_Migracao_v1` DEVEM ficar ocultos em toda a
  interface do formulário — nunca aparecem, editáveis ou não.

**Máscaras e texto livre**

- **FR-013**: O campo NIP DEVE aplicar máscara estrita no formato `00.0000.00` (8 dígitos) enquanto o
  usuário digita, corrigindo/impedindo qualquer entrada fora desse padrão — sem exigir que o campo
  seja preenchido (achado 5, Edge Case).
- **FR-014**: `Nome_Completo`, `Nome_Guerra`, `OM`, `Dep_Divisao`, `Email`,
  `Formacao_Principal_Secundaria` DEVEM permanecer campos de texto livre, sem máscara nem dropdown
  (achado 1 — `Formacao_Principal_Secundaria` é um único campo físico).

**Datas**

- **FR-015**: `Data_Nascimento`, `Data_Assuncao_Setor`, `Data_Inicio_Docencia_MB`,
  `Data_Inicio_Docencia_CIAARA` e `Data_Avaliacao` (de `instrutores`, FR-003) DEVEM usar seletor de
  data nativo, gravando sempre valor de data real (nunca string livre).

**Checkboxes**

- **FR-016**: `Capacitacao_Didatica` DEVE ser um grupo de checkboxes com as opções `Licenciatura`,
  `C-Exp-TE`, `C-Esp-DID` (múltipla escolha), gravado como CSV — mesmo formato já lido hoje pelos
  gráficos/filtros de Capacitação Didática (specs 014/015), sem quebrar esses consumidores.
- **FR-017**: `Preferencia` DEVE ser uma matriz de checkboxes — Segunda a Sexta-feira, com "Manhã" e
  "Tarde" para cada dia (10 combinações possíveis) — substituindo o texto livre de hoje (achado 9, sem
  dado real relevante a preservar).

**Dropdowns estritos**

- **FR-018**: `Categoria` DEVE oferecer as 4 opções reais confirmadas (achado 8): `Militar da Ativa`,
  `TTC`, `SCNS`, `MMN` — rótulos de exibição podem usar texto por extenso, mas o valor gravado é o
  código real já usado hoje.
- **FR-019**: `Regime_Trabalho` DEVE oferecer as 3 opções reais confirmadas (achado 8): `20h Semanais`,
  `40h Semanais`, `Dedicação Exclusiva`.
- **FR-020**: `Nivel_Escolaridade` DEVE oferecer as 5 opções reais confirmadas (achado 8): `Nível
  médio`, `Graduação`, `Pós-Graduação`, `Mestrado`, `Doutorado`.
- **FR-021**: `Status` DEVE oferecer `Ativo`/`Inativo`, editável no formulário — reversão deliberada da
  exclusão de `Status` do formulário de edição decidida na spec 014 (achado F1 daquela spec), pedida
  explicitamente nesta spec. Salvar o formulário com `Status` alterado para `Inativo` DEVE disparar o
  mesmo aviso de confirmação hoje exclusivo do botão dedicado "Desativar" (RN-INST-02, "Ele deixará de
  poder ser selecionado em novos lançamentos") — o aviso vale em qualquer caminho que desative um
  instrutor, não só nesse botão (Clarifications 2026-08-17).
- **FR-022**: `Posto_Graduacao` DEVE oferecer os 14 códigos do domínio fechado ampliado (achado 8/11):
  `AE, VA, CA, CMG, CF, CC, CT, 1ºTen, 2ºTen, SO, 1ºSG, 2ºSG, 3ºSG, SC`.
- **FR-023**: `Esp_Hab_Obs` DEVE ser um dropdown mostrando o nome completo da especialidade/
  habilitação/observação (as 60 opções do catálogo do pedido) mas gravando somente a sigla
  correspondente — nunca o texto completo, nunca um ID cru.
- **FR-024**: Um valor legado de `Esp_Hab_Obs` que não corresponda a nenhuma das 60 siglas do
  catálogo, mesmo após normalizar variações de formatação conhecidas (hífen/parênteses ao redor,
  achado 7), DEVE continuar visível na edição desse instrutor específico (nunca substituído
  silenciosamente), com aviso de que precisa ser corrigido para uma das 60 siglas.

**Impressão da Ficha**

- **FR-025**: O sistema DEVE exibir um botão "Imprimir Ficha" na visualização de um instrutor, que
  abre uma área de impressão limpa (reaproveitando `.area-impressao`/`@media print`, já existente e
  já preparado para este uso — achado 4) com cabeçalho institucional e os dados relevantes em formato
  de leitura, sem nenhum elemento de navegação/edição.
- **FR-026**: O botão de impressão nessa área DEVE acionar `window.print()` (diálogo nativo do
  navegador) — nunca uma geração de PDF server-side nem qualquer dependência nova.
- **FR-027**: Um campo vazio na Ficha impressa DEVE aparecer com um marcador neutro (ex.: "—"), nunca
  em branco sem explicação nem como `undefined`/`null` literal.

### Key Entities

- **Instrutor** (`instrutores`): já existente; esta spec remove 1 coluna (`Ultima_Avaliacao_
  Desempenho`, FR-001), não adiciona nenhuma, e muda como vários campos já existentes são
  apresentados/calculados/validados na interface (Antiguidade, Tempo no Setor, Disciplinas
  Ministradas, Esp_Hab_Obs, Preferência, Capacitação Didática).
- **Escala de Antiguidade por Posto/Graduação** (revisão de RN-ANT-02, achado 11): 14 códigos
  (11 já formalizados nas specs 014/015 + `AE`/`VA`/`CA` novos, todos com peso `0`).
- **Catálogo de Especialidade/Habilitação/Observação** (novo, só de exibição/validação — não persiste
  em nenhuma aba nova): as 60 siglas do pedido, mapeadas para nome completo de exibição.
- **Disciplinas Habilitadas** (derivado, não persistido, achado 3/6/10): cruzamento de
  `instrutor_disciplina` (vínculos ativos) exibido ao lado do texto histórico de `Disciplinas_
  Ministradas`, nunca o substituindo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das tentativas de digitar um NIP fora do formato `00.0000.00` são corrigidas ou
  impedidas pela máscara, sem exceção.
- **SC-002**: Selecionar qualquer `Posto_Graduacao` (incluindo `AE`/`VA`/`CA`) preenche
  `Antiguidade_Declarada` com o peso exato da escala definida em FR-007, em 100% dos casos, sem
  intervenção manual.
- **SC-003**: A visualização de impressão da Ficha nunca mostra botão, menu ou elemento de navegação
  — só o cabeçalho institucional e os dados do instrutor, em 100% das aberturas.
- **SC-004**: Nenhum dos 147 registros reais de `Disciplinas_Ministradas` (texto livre) e nenhum dos
  162 registros reais de `Esp_Hab_Obs` perde ou tem seu conteúdo original apagado/substituído
  silenciosamente após esta spec entrar em produção.
- **SC-005**: `ID_Instrutor`, `Editado_Por`, `Timestamp_Edicao`, `Docente_Ate_2_Disciplinas` e
  `Origem_Migracao_v1` nunca aparecem como campo de formulário editável em nenhuma tela do módulo.

## Assumptions

- **`Formacao_Principal_Secundaria` como campo único** (FR-014): o pedido lista "Formação Principal"
  e "Formação Secundária" separadamente, mas o schema físico real (achado 1) sempre teve um único
  campo combinado — tratado como esse único campo já existente, não como 2 colunas novas (mudaria de
  "zero coluna nova" para "1 coluna nova", fora do padrão de risco mínimo já estabelecido para
  hotfixes/épicos recentes deste módulo).
- **`Disciplinas_Ministradas` nunca é sobrescrita pelo valor calculado** (FR-010, achados 3/6):
  resolvido seguindo o precedente direto da própria Ficha da V1.0 — mostrar os dois valores
  (histórico + calculado) como campos distintos, nunca um substituindo o outro. Interpretação mais
  segura quanto à constitution (Princípio IV) do que a leitura mais literal do pedido ("calculado
  automaticamente" lido como "substitui o campo").
- **`Esp_Hab_Obs` legado não mapeável ao catálogo não bloqueia a tela nem é apagado** (FR-024, achado
  7): tratado como alerta, não bloqueio (Princípio V da constitution — "Degradação Segura e
  Alerta-Não-Bloqueio") — os 7 registros reais afetados (`"NS"` ×6, `"MT"` dentro de `"(RM1-MT)"` ×1)
  continuam existindo e visíveis até que um usuário os corrija manualmente para uma das 60 siglas.
- **Círculo Hierárquico de `AE`/`VA`/`CA`** (achado 11, spec 015): os 3 novos códigos entram como
  "Oficiais" no filtro de Círculo Hierárquico já existente (mesmo grupo de `CMG`/`CF`/`CC`/`CT`/
  `1ºTen`/`2ºTen`) — são postos de oficial-general, sem ambiguidade militar real.
- **Orientação de impressão da Ficha em retrato, não paisagem** (FR-025, achado 4): a regra `@media
  print` compartilhada hoje força paisagem (adequada à grade larga do DSA); uma ficha de dados
  pessoais (lista vertical de campos, como a própria V1.0 já fazia) é assumida como mais legível em
  retrato — decisão de design a resolver na fase de plano (`/speckit-plan`), documentada aqui como
  intenção, não como bloqueio desta spec.
- **Cadastro reaproveita o mesmo padrão de "nova aba" já usado pela edição desde a spec 014**, em vez
  de introduzir um modal novo: o pedido oferece "página/modal" como opções equivalentes para o
  formulário de cadastro/edição, mas a spec 014 já investigou e resolveu essa mesma escolha
  especificamente para este módulo — modal foi descartado por risco real já documentado (mutação de
  estado dentro do página isolado do a URL do projeto na Vercel), e "nova aba" já está em produção,
  funcionando. Reaproveitar essa decisão evita reintroduzir um risco já eliminado; a Ficha de
  impressão (FR-025), ao contrário, é explicitamente um modal — mesmo padrão da V1.0 (achado 3),
  sem o mesmo risco por não navegar/mutar estado da SPA, só sobrepor uma camada de imagem estática
  para impressão.
- Nenhuma mudança em `RN-INST-01/02/03/04` além do já descrito (Antiguidade/Tempo no Setor passam a
  calculados, não editáveis) — o restante das regras de negócio de Instrutores permanece como está.
