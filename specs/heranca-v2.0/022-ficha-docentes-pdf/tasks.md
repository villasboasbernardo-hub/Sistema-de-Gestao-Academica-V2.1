---

description: "Task list for Ficha de Cadastro de Docentes Ampliada e Geração de PDF via a rota de impressão `/print/*`"
---

# Tasks: Ficha de Cadastro de Docentes Ampliada e Geração de PDF via a rota de impressão `/print/*`

**Input**: Design documents from `/specs/022-ficha-docentes-pdf/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/frontend-functions.md,
contracts/server-functions.md, quickstart.md — todos completos.

**Tests**: Incluídos para as 2 funções puras testáveis pelo harness `vm` já existente
(`tests/unidade/ficha_formulario_instrutores.test.ts`): a forma de `BLOCOS_EDICAO_INSTRUTOR` (12 campos
novos) e `validarCamposObrigatoriosInstrutor_` (nova). Sem teste automatizado para: a reescrita de
`renderizarPainelEdicaoInstrutor_` em abas (manipula `document`, mesmo achado de toda spec anterior
do módulo); `gerarFichaPDF`/`MAPA_TAGS_FICHA_PDF` (backend, depende de `a rota de impressão `/print/*``/`o Supabase Storage`/
o cliente Supabase, sem harness de mock no projeto — confirmado por grep, nenhum teste hoje carrega
`lib/acoes/*.ts` e `lib/dominio/*.ts` diretamente); validação server-side em `cadastrarInstrutor`/`atualizarInstrutor`
(mesmo motivo). Todos verificados manualmente via `quickstart.md`.

**Organization**: 3 User Stories em ordem de prioridade/dependência lógica — US1 (P1, campos novos)
→ US2 (P2, abas + validação, reestrutura a mesma tela que US1 alimentou) → US3 (P3, PDF, isolada,
só depende de US1 para ter dado a mesclar). Uma tarefa Foundational cobre a migração de schema
(12 colunas + 1 linha de `config_parametros`), que serve tanto US1 quanto US3.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Rodar `pnpm vitest run` e confirmar o baseline atual (291 testes, 291
      passam, 0 falham, herdado do fechamento da spec 021) antes de qualquer mudança.
      **Confirmado**.

---

## Phase 2: Foundational

- [X] T002 Criar script novo em `migracao/` (mesmo padrão de todo script anterior — `openpyxl`
      contra a cópia de trabalho local primeiro): acrescenta as 12 colunas novas ao final de
      `instrutores` (`RG`, `CPF`, `Orgao_Emissor`, `Telefone`, `RETELMA`,
      `Endereco_Logradouro`, `Endereco_Numero`, `Endereco_Bairro`, `Endereco_Cidade`,
      `Endereco_Complemento`, `Endereco_CEP`, `Area_Conhecimento`) e uma linha nova em
      `config_parametros` (`Chave='ID_TEMPLATE_FICHA_INSTRUTOR'`,
      `Valor='1EzYw9oSBFiM41Qi_F9qQylKTVxGbtwnQl_IaYinPUpg'`, `Tipo='TEXTO'`) — sempre aditivo,
      nunca remove/reordena coluna existente (data-model.md, research.md §6). Execução contra a
      banco de produção fica como pendência de implantação (mesmo padrão de toda spec anterior),
      não bloqueia o fechamento do código. Depende de T001.
      **Concluído**: `migracao/adicionar_campos_ficha_docentes_e_template_pdf.py` criado, rodado
      contra a cópia de trabalho local (backup automático + `migracao_log` +2 linhas) e
      confirmado idempotente (segunda execução: "Já aplicado... Nada a fazer"). **Aplicado também
      contra a banco de produção em 2026-08-18** (via conector Composio, mesma ação estritamente
      aditiva — 12 colunas em `instrutores!AF1:AQ1`, linha `ID_TEMPLATE_FICHA_INSTRUTOR` em
      `config_parametros!A19:H19`, `migracao_log` `LOG-000504`/`LOG-000505`), acionado por um erro
      real reportado por Bernardo ao testar "Gerar PDF" ("Template da Ficha não configurado em
      config_parametros") — confirmado por leitura de volta, nenhuma coluna/linha existente
      tocada. Achado incidental (fora do escopo desta spec, não corrigido): a banco de produção
      ainda tem a coluna `Ultima_Avaliacao_Desempenho`, cuja remoção (spec 016) nunca foi aplicada
      ao vivo — pendência de uma spec anterior, registrada aqui só para rastreabilidade.

**Checkpoint**: Schema pronto para receber os campos novos (US1) e a configuração do Template
(US3) assim que a migração rodar contra a banco de produção.

---

## Phase 3: User Story 1 - Cadastrar/editar um instrutor com os novos campos de identificação e endereço (Priority: P1)

**Goal**: Os 12 campos novos (RG, CPF, Órgão Emissor, Telefone, RETELMA, Endereço completo, Área de
Conhecimento) aparecem no formulário já existente e persistem corretamente em `instrutores`.

**Independent Test**: `quickstart.md` Passo 1 — preencher os 12 campos novos, salvar, reabrir a
edição, confirmar persistência sem afetar nenhum campo existente.

### Tests for User Story 1 ⚠️

> **Escrever este teste PRIMEIRO, confirmar que FALHA antes de implementar**

- [X] T003 [P] [US1] Em `tests/unidade/ficha_formulario_instrutores.test.ts`, novo `describe`
      "FR-001 - BLOCOS_EDICAO_INSTRUTOR (12 campos novos)": achatar `BLOCOS_EDICAO_INSTRUTOR` e
      confirmar que as 12 chaves (`RG`, `CPF`, `Orgao_Emissor`, `Telefone`, `RETELMA`,
      `Endereco_Logradouro`, `Endereco_Numero`, `Endereco_Bairro`, `Endereco_Cidade`,
      `Endereco_Complemento`, `Endereco_CEP`, `Area_Conhecimento`) existem, cada uma com
      `tipo: 'texto-livre'`, e que nenhuma das ~30 chaves existentes antes desta spec foi removida
      (contracts/frontend-functions.md, data-model.md). Depende de T001.
- [X] T004 [US1] Rodar `pnpm vitest run tests/ficha_formulario_instrutores.test.ts` — confirmar que o
      caso novo de T003 falha contra a implementação atual (campos ainda não existem). Depende de
      T003. **Confirmado**: "campo RG deveria existir em BLOCOS_EDICAO_INSTRUTOR" falha.

### Implementation for User Story 1

- [X] T005 [US1] Em `app/(app)/instrutores/page.tsx`, dentro de `BLOCOS_EDICAO_INSTRUTOR`
      (linhas 776-815): acrescentar os 12 campos novos aos blocos existentes — `RG`, `CPF`,
      `Orgao_Emissor`, `Telefone`, `Endereco_Logradouro`, `Endereco_Numero`, `Endereco_Bairro`,
      `Endereco_Cidade`, `Endereco_Complemento`, `Endereco_CEP` no bloco "Identificação";
      `RETELMA` no bloco "Vínculo Institucional"; `Area_Conhecimento` no bloco "Qualificação
      Docente" — todos `{ chave: '...', rotulo: '...', tipo: 'texto-livre' }`
      (contracts/frontend-functions.md, data-model.md). Depende de T004.
- [X] T006 [US1] Rodar `pnpm vitest run` — confirmar que o caso de T003 passa e a
      suíte inteira continua em 0 falhas. Depende de T005. **298 testes, 293 passam, 5 falham** —
      as 5 falhas restantes são exatamente os casos de T008 (US2, `validarCamposObrigatoriosInstrutor_`
      ainda não implementada), esperado até T011.

### Verificação manual (não automatizável — FR-001, Acceptance Scenarios 1-3 da US1)

- [ ] T007 [US1] Seguir `quickstart.md` Passo 1 no navegador (implantação via `o fluxo Git → Vercel` e migração
      T002 contra a banco de produção necessárias antes) — preencher os 12 campos novos, salvar,
      reabrir a edição, confirmar persistência exata e ausência de regressão nos campos existentes.

**Checkpoint**: User Story 1 completa e verificável independentemente.

---

## Phase 4: User Story 2 - Navegar o formulário em 3 abas com campos obrigatórios validados (Priority: P2)

**Goal**: O formulário (agora com os 12 campos novos de US1) é reorganizado em exatamente 3 abas
Tailwind CSS Nav-Tabs, e o salvamento é bloqueado — cliente e servidor — quando Posto/Graduação,
Esp_Hab_Obs, Nome Completo ou Nome de Guerra estiverem vazios.

**Independent Test**: `quickstart.md` Passo 2 — confirmar as 3 abas, navegação sem perda de dado, e
o bloqueio de salvamento com troca automática para a aba do campo faltando.

### Tests for User Story 2 ⚠️

> **Escrever este teste PRIMEIRO, confirmar que FALHA antes de implementar**

- [X] T008 [P] [US2] Em `tests/unidade/ficha_formulario_instrutores.test.ts`, novo `describe`
      "FR-006 - validarCamposObrigatoriosInstrutor_": casos cobrindo (a) os 4 campos preenchidos →
      array vazio; (b) um campo faltando (ex.: `Nome_Guerra` vazio) → array com só essa chave; (c)
      os 4 vazios → array com as 4 chaves, na ordem `['Posto_Graduacao', 'Esp_Hab_Obs',
      'Nome_Completo', 'Nome_Guerra']`; (d) string só com espaços conta como vazio (mesmo padrão
      `.trim()` já usado em `Capacitacao_Didatica`/outros campos de texto do projeto)
      (contracts/frontend-functions.md, research.md §2). Depende de T001.
- [X] T009 [US2] Rodar `pnpm vitest run tests/ficha_formulario_instrutores.test.ts` — confirmar que os
      casos de T008 falham contra a implementação atual (função ainda não existe). Depende de T008.
      **Confirmado**: `TypeError: validarCamposObrigatoriosInstrutor_ is not a function` nos 5
      casos.

### Implementation for User Story 2

- [X] T010 [US2] Em `app/(app)/instrutores/page.tsx`, dentro de `BLOCOS_EDICAO_INSTRUTOR`:
      acrescentar a chave `aba` aos 4 blocos — `'pessoais'` (Identificação), `'profissionais'`
      (Vínculo Institucional), `'complementares'` (Qualificação Docente); "Sistema (somente
      leitura)" fica sem `aba` (contracts/frontend-functions.md, research.md §1, data-model.md).
      Depende de T006 (US1 completa — os 12 campos novos já devem estar nos blocos antes de
      agrupá-los por aba).
- [X] T011 [US2] Em `app/(app)/instrutores/page.tsx`, criar
      `validarCamposObrigatoriosInstrutor_(valores)` (função pura): devolve as chaves de
      `['Posto_Graduacao', 'Esp_Hab_Obs', 'Nome_Completo', 'Nome_Guerra']` cujo valor em `valores`
      está vazio/só espaços (contracts/frontend-functions.md, research.md §2). Depende de T009.
- [X] T012 [US2] Em `app/(app)/instrutores/page.tsx`, reescrever `renderizarPainelEdicaoInstrutor_`:
      agrupar os blocos com `aba` definida em `.nav-tabs`/`.tab-content` Tailwind CSS (3 abas: "1.
      Dados Pessoais", "2. Dados Profissionais", "3. Dados Complementares"); o bloco sem `aba`
      ("Sistema (somente leitura)") continua renderizado como card avulso, fora da estrutura de
      abas, exatamente como hoje (contracts/frontend-functions.md, research.md §1). Depende de
      T010. Implementado via `ABAS_EDICAO_INSTRUTOR` (nova, só ordem/rótulo das 3 abas — os campos
      continuam vindo de `BLOCOS_EDICAO_INSTRUTOR`, nunca duplicados).
- [X] T013 [US2] Em `app/(app)/instrutores/page.tsx`, dentro de `salvarEdicaoInstrutor_`: logo
      após `coletarValoresFormularioInstrutor_()`, chamar `validarCamposObrigatoriosInstrutor_`;
      se a lista não for vazia, mostrar aviso em `#avisoEdicaoInstrutor` citando os rótulos
      faltando, selecionar programaticamente (via API JS do Tailwind CSS, `Tailwind.Tab`) a aba do
      primeiro campo faltando, e retornar sem chamar `gs('cadastrarInstrutor', ...)`/
      `gs('atualizarInstrutor', ...)` (contracts/frontend-functions.md, research.md §2). Depende
      de T011, T012.
- [X] T014 [US2] Em `lib/acoes/instrutores.ts`, no início de `cadastrarInstrutor(obj)` e
      `atualizarInstrutor(idInstrutor, obj)` (linhas 149-158): checar os mesmos 4 campos
      obrigatórios em `obj`; lançar `Error` citando o(s) campo(s) faltando antes de qualquer
      `crudCriar`/`crudAtualizar` — defesa em profundidade contra contorno da validação
      client-side (contracts/server-functions.md, research.md §2). Depende de T001 (independente
      do frontend, arquivo diferente).
      **Achado real durante a implementação**: `research.md`/`tasks.md` afirmavam que nenhum
      teste no projeto carrega `lib/acoes/*.ts` e `lib/dominio/*.ts` diretamente (sem harness de mock) — falso.
      `tests/unidade/regras_de_negocio_backend.test.ts` já carrega `lib/acoes/instrutores.ts` com o cliente Supabase
      mockado (`carregarBackend`/`criarPlanilhaFalsa`) desde a spec 014/019. 2 testes existentes
      ("cadastrarInstrutor sobrescreve Antiguidade_Declarada..."/"atualizarInstrutor sobrescreve...")
      usavam payloads propositalmente incompletos (só testavam `Antiguidade_Declarada`) e quebraram
      como consequência direta de T014 — corrigidos para incluir os 4 campos obrigatórios (não é
      regressão real). Aproveitado o harness recém-descoberto para acrescentar cobertura real de
      FR-006 (3 casos novos, ver T015).
- [X] T015 [US2] Rodar `pnpm vitest run` — confirmar que os casos de T008 passam e a
      suíte inteira continua em 0 falhas. Depende de T013, T014. **301 testes, 301 passam, 0
      falham** (298 + 3 novos de FR-006 em `tests/unidade/regras_de_negocio_backend.test.ts`, acrescentados
      após o achado real de T014).

### Verificação manual (não automatizável — FR-003, FR-004, FR-006, Acceptance Scenarios da US2)

- [ ] T016 [US2] Seguir `quickstart.md` Passo 2 no navegador (implantação via `o fluxo Git → Vercel` necessária
      antes) — confirmar as 3 abas, preservação de dado ao trocar de aba, bloqueio de salvamento
      com campo obrigatório vazio e troca automática para a aba correta.

**Checkpoint**: User Stories 1 e 2 completas — formulário em abas, com os campos novos, validado.

---

## Phase 5: User Story 3 - Gerar a Ficha do Instrutor como PDF real via a rota de impressão `/print/*` (Priority: P3)

**Goal**: Um botão "Gerar PDF" no modal da Ficha aciona `gerarFichaPDF(idInstrutor)`, que mescla os
dados reais do instrutor no template da rota `/print/ficha-instrutor` já existente e devolve um PDF real.

**Independent Test**: `quickstart.md` Passo 3 — clicar "Gerar PDF", confirmar um PDF real (não
`window.print()`) com os dados corretos, em menos de 30s, sem documento temporário órfão no Supabase Storage.

### Implementation for User Story 3

- [X] T017 [US3] Em `lib/acoes/instrutores.ts`: criar a constante `MAPA_TAGS_FICHA_PDF` (34
      pares `{TAG}` → coluna real, tabela completa em `data-model.md`) e a função
      `gerarFichaPDF(idInstrutor)` — `exigirFuncao(CRUD_CONFIG['instrutores'].leitura)`; localiza
      o instrutor via `lerAbaComoObjetos_`; lê `ID_TEMPLATE_FICHA_INSTRUTOR` de
      `lerConfigParametros_()`; copia o Template (`o Supabase Storage`), abre via `a rota de impressão `/print/*``, substitui
      cada tag mapeada (`corpo.replaceText`, tag sem valor vira string vazia, tag não mapeada não é
      tocada — FR-009); exporta como PDF, cria o arquivo definitivo, devolve a URL; em `finally`,
      sempre move o documento temporário para a lixeira (`.setTrashed(true)`), inclusive em
      caminho de erro (contracts/server-functions.md, research.md §3, §4). Depende de T002
      (`config_parametros` precisa ter a linha do Template).
- [X] T018 [P] [US3] Em `app/(app)/instrutores/page.tsx`: dentro do `modal-footer` da Ficha
      (`renderizarModalFichaInstrutor_`), acrescentar o botão "Gerar PDF" ao lado do botão
      "Imprimir" já existente; criar `gerarPdfFichaClick(idInstrutor)` —
      `gs('gerarFichaPDF', idInstrutor).then(url => window.open(url, '_blank')).catch(e =>
      alert(e && e.message ? e.message : e))`, sem timeout dedicado
      (contracts/frontend-functions.md, research.md §5). Arquivo/região diferente de T017, sem
      dependência real de implementação (a chamada `gs('gerarFichaPDF', ...)` só precisa existir
      no backend antes do teste manual, não antes de escrever este código). Depende de T006 (US1
      completa, mesmo arquivo `app/(app)/instrutores/page.tsx`, prudência). Implementado via
      `instrutorFichaAtual_` (novo, módulo-level) — o botão "Gerar PDF" é HTML estático do
      `modal-footer` (renderizado 1 vez, não a cada abertura), então `abrirModalFichaInstrutor_`
      guarda o instrutor atual nessa variável para o `onclick` referenciar.
- [X] T019 [US3] Rodar `pnpm vitest run` — confirmar 0 regressão (sem caso
      automatizado novo — `gerarFichaPDF` depende de `a rota de impressão `/print/*``/`o Supabase Storage`, sem harness de mock
      no projeto — o cliente Supabase sozinho é mockável, ver achado real de T014, mas não cobre
      `a rota de impressão `/print/*``/`o Supabase Storage`). Depende de T017, T018. **301 testes, 301 passam, 0 falham**.

### Verificação manual (não automatizável — FR-007 a FR-012, Acceptance Scenarios da US3)

- [ ] T020 [US3] Seguir `quickstart.md` Passo 3 no navegador (implantação via `o fluxo Git → Vercel` e migração
      T002 contra a banco de produção necessárias antes; confirmar que o Template
      `1EzYw9oSBFiM41Qi_F9qQylKTVxGbtwnQl_IaYinPUpg` já tem as tags de `data-model.md`) — gerar o
      PDF, confirmar conteúdo mesclado corretamente, tempo dentro de 30s, ausência de documento
      temporário órfão no Supabase Storage, e que "Imprimir" (`window.print()`) continua funcionando.

**Checkpoint**: As 3 User Stories completas e verificáveis independentemente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T021 [P] Atualizar `docs/arquitetura/02-modularizacao.md` e `o histórico de deploys da Vercel` —
      linhas de `app/(app)/instrutores/page.tsx` e `lib/acoes/instrutores.ts` ganham uma frase citando este épico
      (mesmo padrão de "última alteração" já usado para todo épico/hotfix anterior).
- [X] T022 [P] Incrementar `o SHA do commit` nos dois lugares de sempre: `lib/supabase/server.ts` e `const
      o SHA do commit_FRONTEND` em `app/layout.tsx` (documento 10 §8.2, RF-MOD-04).
      `o histórico de deploys da Vercel` também atualizado com o novo valor. Novo valor:
      `2026-08-19.FICHAPDF022.1`.
- [X] T023 Rodar `pnpm vitest run` uma última vez — confirmar suíte completa em 0
      falhas, 0 regressão. **301 testes, 301 passam, 0 falham**.
- [ ] T024 Seguir `quickstart.md` do início ao fim no navegador (Passos 1-3), após implantação via
      `o fluxo Git → Vercel` e migração T002 contra a banco de produção — confirmar as 3 User Stories juntas.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — roda primeiro.
- **Foundational (Phase 2)**: depende de Setup. Bloqueia a verificação manual completa de US1
  (persistência real) e US3 (Template configurado) — o código de US1/US2 pode ser escrito e
  testado (suíte automatizada) sem a migração ter rodado contra a banco de produção, mas
  `quickstart.md` exige a migração executada.
- **US1 (Phase 3)**: depende de Setup. Não depende de Foundational para o código em si (só para o
  Passo 1 do `quickstart.md`).
- **US2 (Phase 4)**: depende de US1 completa (T006) — a chave `aba` é acrescentada aos mesmos 4
  blocos que já devem conter os 12 campos novos de US1, evitando um merge conflituoso na mesma
  estrutura de dados.
- **US3 (Phase 5)**: depende de Foundational (T002, para `config_parametros`) e de US1 completa
  (T006, mesmo arquivo `app/(app)/instrutores/page.tsx` para o botão do modal) — não depende de US2.
- **Polish (Phase 6)**: depende das 3 User Stories completas.

### Within Each Phase

- US1: T003 (teste) → T004 (confirmar falha) → T005 (implementar) → T006 (confirmar sucesso) → T007
  (manual).
- US2: T008 (teste) → T009 (confirmar falha) → T010/T011/T012/T013 (implementação, em sequência
  lógica — T010 antes de T012 porque `renderizarPainelEdicaoInstrutor_` lê a chave `aba` recém
  criada; T011 antes de T013 porque `salvarEdicaoInstrutor_` chama a função recém criada); T014
  (backend, paralelo de fato a T010-T013 — arquivo diferente) → T015 (confirmar sucesso) → T016
  (manual).
- US3: T017 (backend) e T018 (frontend) em arquivos diferentes, paralelizáveis entre si → T019
  (confirmar 0 regressão) → T020 (manual).

### Parallel Opportunities

- **T003 (US1) e T008 (US2)** — mesmo arquivo de teste, `describe` blocks independentes;
  paralelizável na escrita, ambos podem começar assim que Setup termina (T008 não depende de US1
  ter terminado, só a *implementação* de US2 depende).
- **T014 (US2, `lib/acoes/instrutores.ts`) e T010-T013 (US2, `app/(app)/instrutores/page.tsx`)** — arquivos diferentes.
- **T017 (US3, `lib/acoes/instrutores.ts`) e T018 (US3, `app/(app)/instrutores/page.tsx`)** — arquivos diferentes.
- **T021 e T022 (Polish)** podem rodar em paralelo entre si.

---

## Parallel Example: Depois do Setup

```bash
Task: "T003 [US1] Teste de BLOCOS_EDICAO_INSTRUTOR (12 campos novos) em ficha_formulario_instrutores.test.ts"
Task: "T008 [US2] Teste de validarCamposObrigatoriosInstrutor_ em ficha_formulario_instrutores.test.ts"
Task: "T002 [Foundational] Script de migracao (12 colunas + config_parametros)"
```

---

## Implementation Strategy

### MVP First (User Story 1)

US1 (P1) sozinha já entrega o maior bloco de valor de negócio novo (dados cadastrais que hoje não
têm nenhum lugar no sistema) — pode ser implantada e validada isoladamente, com o formulário ainda
no layout de cards atual (US2 é quem introduz as abas).

### Incremental Delivery

1. Setup → baseline confirmado (291 testes).
2. Foundational → schema migrado (12 colunas + config_parametros).
3. US1 → 12 campos novos persistindo → suíte automatizada + verificação manual.
4. US2 → 3 abas + validação obrigatória → suíte automatizada + verificação manual.
5. US3 → PDF real via a rota de impressão `/print/*` → verificação manual (sem cobertura automatizada possível).
6. Polish → suíte completa + `quickstart.md` fim a fim → deploy/commit.

---

## Notes

- [P] tasks = arquivos diferentes, sem dependência real.
- Toda tarefa desta spec que toca schema é estritamente aditiva (12 colunas + 1 linha de
  configuração) — zero remoção/renomeação de coluna existente (FR-002).
- Commit após cada tarefa ou grupo lógico, seguindo o padrão já estabelecido nesta sessão.
