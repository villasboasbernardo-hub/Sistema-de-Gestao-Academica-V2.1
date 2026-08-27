# Contrato — Funções de backend (Hotfix: Motor de PDF, Impressão e Limpeza de UI)

## `lib/acoes/instrutores.ts`

### `gerarFichaPDF(idInstrutor, nomeExibicao)` (existente — assinatura estendida)

- **Mudança**: ganha o parâmetro `nomeExibicao` (texto puro, calculado no frontend via
  `formatarNomeInstrutor_(..., isHTML=false)`). `var nome = nomeExibicao || idInstrutor;` —
  degradação segura se o parâmetro vier vazio/ausente. `makeCopy('Ficha - ' + nome)` e
  `.setName('Ficha - ' + nome + '.pdf')` substituem os usos anteriores de `idInstrutor` cru. O
  arquivo final passa a ser criado via `pastaFichasInstrutores_().createFile(pdf)` em vez de
  `o Supabase Storage.createFile(pdf)` solto. Nenhuma mudança na lógica de mesclagem em si (cópia → abrir →
  `getBody()` → `replaceText` por tag de `MAPA_TAGS_FICHA_PDF` → `saveAndClose()` → exportar PDF →
  limpar documento temporário em `finally`) — já correta desde a spec 022 (FR-008, achado real).
- **Regras**: FR-003, FR-006, FR-007, FR-008; research.md §3.

### `pastaFichasInstrutores_()` (NOVA — função auxiliar)

- **Assinatura**: `function pastaFichasInstrutores_()`.
- **Comportamento**: `o Supabase Storage.getFoldersByName('Fichas dos Instrutores')` — se
  `.hasNext()`, devolve a pasta existente (`.next()`); senão, `o Supabase Storage.createFolder('Fichas dos
  Instrutores')` e devolve a pasta recém-criada. Nunca cria uma segunda pasta com o mesmo nome em
  chamadas subsequentes.
- **Regras**: FR-007; research.md §3.

Nenhuma outra função de backend é criada, removida ou tem assinatura alterada por esta spec —
`MAPA_TAGS_FICHA_PDF` (constante, spec 022) permanece exatamente como está.
