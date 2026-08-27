# Contracts — Funções tocadas (Hotfix Nomenclatura Militar e Formatação)

Hotfix 100% frontend — nenhuma função de backend (`.ts`) tocada.

## `components/ciaara/`

### `formatarNomeInstrutor_(posto, esp, nomeCompleto, nomeGuerra, isHTML = false)` — assinatura ALTERADA

Antes: `formatarNomeInstrutor_(instrutor)` — um único objeto
(`{Posto_Graduacao, Esp_Hab_Obs, Nome_Completo, Nome_Guerra}`), sempre devolvia HTML.

Depois: 5 parâmetros posicionais (ver data-model.md §2), `isHTML` controla saída HTML vs. texto
puro (default `false`). Aplica as 4 regras de círculo hierárquico (research.md §1) e a exceção de
`CA` para Oficiais.

**Quebra de compatibilidade deliberada**: todo call site precisa ser atualizado para a nova
assinatura — não há forma antiga aceita em paralelo (research.md §4, "Alternatives considered").

### `OFICIAIS_POSTO_` / `PRACAS_POSTO_` — NOVAS, constantes

Ver data-model.md §1. Só usadas internamente por `formatarNomeInstrutor_`.

### `normalizarEspHabObsComum_(valorLegado)` — NOVA, função pura

Cópia mínima de `normalizarEspHabObs_` (`app/(app)/instrutores/page.tsx`, spec 016) — remove
hífen/parênteses das pontas. Usada internamente por `formatarNomeInstrutor_` antes de montar o
separador de círculo (research.md §5).

## `app/(app)/turmas/[turma]/dsa/page.tsx`

### Célula da grade do DSA (linha ~177) — call site ALTERADO

Antes: `formatarNomeInstrutor_(bloco.instrutor)`.
Depois: `formatarNomeInstrutor_(bloco.instrutor.Posto_Graduacao, bloco.instrutor.Esp_Hab_Obs,
bloco.instrutor.Nome_Completo, bloco.instrutor.Nome_Guerra, true)`.

### Dropdown de lançar Aula manual (linha ~262) — call site ALTERADO

Antes: `formatarNomeInstrutor_(i).replace(/<[^>]+>/g, '')` (gera HTML, depois arranca as tags).
Depois: `formatarNomeInstrutor_(i.Posto_Graduacao, i.Esp_Hab_Obs, i.Nome_Completo, i.Nome_Guerra,
false)` — nunca gera HTML para começo, sem `.replace` nenhum.

## `app/(app)/instrutores/page.tsx`

### Coluna "Nome Completo" da listagem (linha ~418) — call site ALTERADO

Antes: `formatarNomeInstrutor_({ Nome_Completo: i.Nome_Completo, Nome_Guerra: i.Nome_Guerra })`.
Depois: `formatarNomeInstrutor_('', '', i.Nome_Completo, i.Nome_Guerra, true)` — posto/esp vazios
propositalmente (a coluna "Posto/Graduação" já existe separada, FR-006 da spec 014).

### Cabeçalho da Ficha do Instrutor (linha ~1174) — call site ALTERADO

Antes: `formatarNomeInstrutor_({ Nome_Completo: instrutor.Nome_Completo, Nome_Guerra:
instrutor.Nome_Guerra })`.
Depois: `formatarNomeInstrutor_('', '', instrutor.Nome_Completo, instrutor.Nome_Guerra, true)` —
mesmo raciocínio (a Ficha já tem uma linha própria de Posto/Graduação).

### Dropdown de vínculo de qualificação `vincInstrutor` (linhas ~285-290) — comportamento ALTERADO

Antes: concatenação ad-hoc própria, `${i.Posto_Graduacao || ''} ${i.Nome_Completo ||
i.ID_Instrutor}`.trim() — sem `Esp_Hab_Obs` (spec 014, FR-014).
Depois: `formatarNomeInstrutor_(i.Posto_Graduacao, i.Esp_Hab_Obs, i.Nome_Completo ||
i.ID_Instrutor, i.Nome_Guerra, false)` — revisão deliberada de FR-014 (spec.md, Assumptions):
especialidade passa a aparecer, seguindo as 4 regras de círculo.

### Dropdown de `Esp_Hab_Obs` (dentro de `renderizarCampoEdicaoInstrutor_`, tipo
`dropdown-fechado-sigla`) — texto da `<option>` ALTERADO

Antes: `${CATALOGO_ESP_HAB_OBS[sigla]}`.
Depois: `${sigla} - ${CATALOGO_ESP_HAB_OBS[sigla]}`. `value="${sigla}"` inalterado.
