# Contrato — Funções de frontend (Ficha de Cadastro de Docentes Ampliada e Geração de PDF)

## `app/(app)/instrutores/page.tsx`

### `BLOCOS_EDICAO_INSTRUTOR` (existente — estendida)

- **Mudança**: cada um dos 4 blocos ganha a chave `aba` (`'pessoais'`, `'profissionais'`,
  `'complementares'`, ou ausente para "Sistema (somente leitura)" — data-model.md, mapeamento de
  abas). Os 12 campos novos (FR-001) são adicionados aos blocos "Identificação" (`RG`, `CPF`,
  `Orgao_Emissor`, `Telefone`, `Endereco_Logradouro`, `Endereco_Numero`, `Endereco_Bairro`,
  `Endereco_Cidade`, `Endereco_Complemento`, `Endereco_CEP`), "Vínculo Institucional" (`RETELMA`) e
  "Qualificação Docente" (`Area_Conhecimento`), todos `tipo: 'texto-livre'`.
- **Regras**: FR-001, FR-003; research.md §1, data-model.md.

### `renderizarPainelEdicaoInstrutor_(instrutor)` (existente — reescrita)

- **Mudança**: em vez de empilhar todos os blocos como cards, agrupa os blocos com `aba` definida
  em 3 `.tab-pane` dentro de uma `.nav-tabs`/`.tab-content` Tailwind CSS ("1. Dados Pessoais", "2.
  Dados Profissionais", "3. Dados Complementares"); o bloco sem `aba` ("Sistema (somente leitura)")
  continua renderizado como card avulso, fora da estrutura de abas, exatamente como hoje. Nenhuma
  mudança na lógica de renderização de campo individual (`renderizarCampoEdicaoInstrutor_`
  continua igual, chamada uma vez por campo independente da aba).
- **Regras**: FR-003, FR-004; research.md §1.

### `validarCamposObrigatoriosInstrutor_(valores)` (NOVA — função pura)

- **Assinatura**: `function validarCamposObrigatoriosInstrutor_(valores)`.
- **Comportamento**: recebe o objeto já coletado por `coletarValoresFormularioInstrutor_`; devolve
  um array com as chaves (de `['Posto_Graduacao', 'Esp_Hab_Obs', 'Nome_Completo', 'Nome_Guerra']`)
  cujo valor está vazio/ausente. Array vazio = formulário válido.
- **Regras**: FR-006; research.md §2.

### `salvarEdicaoInstrutor_(idInstrutor)` (existente — comportamento estendido)

- **Mudança**: no início da função, após `coletarValoresFormularioInstrutor_()`, chama
  `validarCamposObrigatoriosInstrutor_(valores)`; se a lista não for vazia, mostra aviso citando os
  rótulos dos campos faltando em `#avisoEdicaoInstrutor`, seleciona programaticamente a aba
  (`Tailwind.Tab`) do primeiro campo faltando, e retorna sem chamar `gs('cadastrarInstrutor', ...)`
  /`gs('atualizarInstrutor', ...)`.
- **Regras**: FR-006; research.md §2.

### `renderizarModalFichaInstrutor_(instrutor)` (existente — sem mudança de lógica, botão novo no template)

- **Mudança**: o HTML do `modal-footer` (``app/(app)/instrutores/page.tsx`:47-50`) ganha um botão "Gerar PDF"
  ao lado do botão "Imprimir" já existente, chamando `gerarPdfFichaClick(instrutor.ID_Instrutor)`
  (nova). Nenhuma mudança na montagem das linhas rótulo/valor (continua iterando
  `BLOCOS_EDICAO_INSTRUTOR` de forma achatada, sem depender da chave `aba`).
- **Regras**: FR-010; research.md §1, §5.

### `gerarPdfFichaClick(idInstrutor)` (NOVA)

- **Comportamento**: `gs('gerarFichaPDF', idInstrutor).then(url => window.open(url,
  '_blank')).catch(e => alert(e && e.message ? e.message : e))` — mesmo padrão de tratamento de
  erro já usado por `desativarInstrutorClick`/`reativarInstrutorClick`. Nenhum timeout dedicado
  (reaproveita a Server Action como está, Clarifications 2026-08-19).
- **Regras**: FR-007, FR-012; research.md §3, §5.

Nenhuma mudança em `coletarValoresFormularioInstrutor_`, `disciplinasHabilitadasHtmlInstrutor_`,
`painelAtribuicaoDisciplinasHtmlInstrutor_`, `valorExibicaoFichaInstrutor_` ou
`valorCampoEdicaoInstrutor_` — todos continuam iterando `BLOCOS_EDICAO_INSTRUTOR` de forma achatada,
sem depender de agrupamento em abas (research.md §1).
