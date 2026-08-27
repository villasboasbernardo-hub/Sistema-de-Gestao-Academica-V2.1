# Contrato — Funções de backend (Ficha de Cadastro de Docentes Ampliada e Geração de PDF)

## `lib/acoes/instrutores.ts`

### `cadastrarInstrutor(obj)` / `atualizarInstrutor(idInstrutor, obj)` (existentes — comportamento estendido)

- **Mudança**: ambas ganham, no início da função (antes de qualquer `crudCriar`/`crudAtualizar`),
  uma checagem dos 4 campos obrigatórios (`Posto_Graduacao`, `Esp_Hab_Obs`, `Nome_Completo`,
  `Nome_Guerra`) — se algum estiver vazio/ausente em `obj`, lança `Error` com mensagem citando
  qual(is) campo(s) falta(m), antes de qualquer gravação. Defesa em profundidade: mesma regra já
  aplicada no cliente (`validarCamposObrigatoriosInstrutor_`), aqui reaplicada para contornos da
  validação client-side (chamada direta, a Server Action fora do formulário).
- **Regras**: FR-006, Acceptance Scenario 4 (US2); research.md §2.

### `gerarFichaPDF(idInstrutor)` (NOVA)

- **Assinatura**: `function gerarFichaPDF(idInstrutor)`.
- **Comportamento** (research.md §3 tem a implementação de referência completa):
  1. `exigirFuncao(CRUD_CONFIG['instrutores'].leitura)` — mesmo mecanismo já usado por
     `crudListar` (``lib/acoes/crud.ts`:49`), aplica FR-011 (alcance de leitura, `PERFIS_TODOS`).
  2. Localiza o instrutor via `lerAbaComoObjetos_('instrutores')` — lança `Error` se não
     encontrado.
  3. Lê `idTemplate = lerConfigParametros_()['ID_TEMPLATE_FICHA_INSTRUTOR']` — lança `Error` claro
     se ausente/vazio (Acceptance Scenario 4, US3).
  4. Copia o Template (`o Supabase Storage.getFileById(idTemplate).makeCopy(...)`), abre via `a rota de impressão `/print/*``,
     substitui cada tag de `MAPA_TAGS_FICHA_PDF` (`corpo.replaceText('{{TAG}}', valor || '')`) —
     tag sem entrada no mapa não é tocada; instrutor sem valor para uma tag mapeada vira string
     vazia (FR-009).
  5. Salva/fecha o Doc, exporta como PDF (`.getAs('application/pdf')`), cria o arquivo PDF definitivo
     no Supabase Storage, devolve a URL (`getUrl()`).
  6. `finally`: sempre move o documento Docs temporário (a cópia do passo 4) para a lixeira
     (`.setTrashed(true)`) — inclusive se qualquer passo anterior lançar exceção (FR-007d, Acceptance
     Scenario 4 da US3).
- **Nova constante**: `MAPA_TAGS_FICHA_PDF` (objeto `{TAG: 'Coluna_Real'}`, tabela completa em
  `data-model.md`).
- **Regras**: FR-007, FR-008, FR-009, FR-011, FR-012; research.md §3, §4.

Nenhuma outra função de backend é criada, removida ou tem assinatura alterada por esta spec.
