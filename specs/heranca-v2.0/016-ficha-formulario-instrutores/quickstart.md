# Quickstart — Validação da Ficha de Cadastro de Instrutores e Formulário Avançado

## Pré-requisitos

- **Migração de schema executada antes de qualquer teste de aceite** (`migracao/remover_coluna_
  ultima_avaliacao_desempenho.py`, roteiro completo no Passo 0 abaixo) — sem isso, o schema ainda
  tem a coluna que esta spec remove.
- Implantação via `o fluxo Git → Vercel` já feita (`o histórico de deploys da Vercel`), depois da migração.
- Acesso à aplicação Next.js com um perfil de escrita no módulo de Instrutores (Admin/Operador/Divisão de
  Administração Acadêmica).
- A banco de produção tem, na data desta spec (2026-08-17): **177 instrutores** — nenhum com
  `Posto_Graduacao` em `AE`/`VA`/`CA` (domínio novo, sem caso real hoje); **20 sem NIP**; **6 com
  `Esp_Hab_Obs = "NS"`** e **1 com `"(RM1-MT)"`** (achado 7 de `spec.md`) — bons casos reais para o
  Passo 4. Se a base tiver mudado, use os números reais no momento do teste.

## Passo 0 — Migração de schema (fora do navegador, antes de tudo)

```
python migracao/remover_coluna_ultima_avaliacao_desempenho.py
```

**Esperado**: mensagem de backup criado (`Banco de dados CIAARA-11 v2.0 (backup pre-remover-ultima-
avaliacao-desempenho).xlsx`), 1 linha nova em `migracao_log` (`Acao = Arquivado`), coluna
`Ultima_Avaliacao_Desempenho` ausente de `instrutores` no arquivo salvo. Sincronizar o resultado
para o banco PostgreSQL ao vivo pelo mesmo processo já usado nas 6 migrações anteriores desta
sessão, antes de implantar o código via `o fluxo Git → Vercel`.

## Passo 1 — `pnpm vitest run` (parte automatizável)

```
pnpm vitest run tests/unidade/*.test.ts
```

Esperado: baseline (227 testes/227 passam, ver histórico do Hotfix Filtros/Cross-Filtering) mais os
casos novos:

- `gerarProximoIdSequencial_`: array de IDs `["1", "2", "10", "abc"]` → devolve `"11"` (ignora `"abc"`,
  não-inteiro); array vazio → devolve `"1"`.
- `crudAtualizar` grava `Editado_Por`/`Timestamp_Edicao` quando essas colunas existem no cabeçalho da
  aba de destino, e não grava (nem lança erro) quando não existem.
- `calcularAntiguidadeDeclarada_`: `"AE"`/`"VA"`/`"CA"` → `0`; `"CMG"` → `1`; posto desconhecido →
  `null`, nunca exceção.
- `calcularTempoSetorAnos_`: `Data_Assuncao_Setor` de 3 anos e alguns meses atrás → `3` (anos
  completos); `Data_Assuncao_Setor` vazia → `null`.
- `normalizarEspHabObs_`: `"-HN"` → `"HN"`; `"(RM2-T)"` → `"RM2-T"`; `"NS"` → `"NS"` (sem
  correspondência no catálogo, continua como está).
- `serializarPreferencia_`/`parsearPreferencia_`: ida e volta preserva o conjunto de dias/períodos
  marcados; nenhum marcado → string vazia.

## Passo 2 — Cadastrar um novo instrutor (FR-004 a FR-023, "US1", manual)

1. Clicar em "Cadastrar Novo Instrutor" — confirmar que abre uma nova aba do navegador.
2. **Esperado**: `ID_Instrutor` não aparece em lugar nenhum do formulário; `Docente_Ate_2_
   Disciplinas`/`Origem_Migracao_v1` também não aparecem.
3. Digitar `987654321` no campo NIP. **Esperado**: o campo mostra `98.7654.32` ou impede os dígitos
   excedentes — nunca aceita o valor cru sem formatação.
4. Selecionar `"AE"` (Almirante de Esquadra) em Posto/Graduação. **Esperado**: o campo Antiguidade
   (somente leitura) mostra `0` imediatamente, sem salvar.
5. Selecionar "Hidrografia e Navegação" no dropdown de Especialidade/Habilitação. Preencher os demais
   campos obrigatórios/desejados (Categoria, Regime, Escolaridade, checkboxes de Capacitação
   Didática, matriz de Preferência) e salvar.
6. **Esperado**: o instrutor aparece na listagem principal, com `ID_Instrutor` gerado (próximo
   inteiro sequencial, ex. `"178"`), `Esp_Hab_Obs` gravado como `"HN"` (nunca o texto completo).

## Passo 3 — Editar um instrutor existente (FR-005 a FR-021, "US2", manual)

1. Abrir um instrutor real com `NIP` preenchido (ex.: `"99.2067.22"`) para edição.
2. **Esperado**: NIP aparece já formatado; `ID_Instrutor` aparece como texto travado.
3. Observar o campo Tempo no Setor — **esperado**: mostra um número de anos coerente com `Data_
   Assuncao_Setor` daquele instrutor, nunca um campo editável.
4. Localizar um instrutor com `Disciplinas_Ministradas` preenchido (texto livre) e algum vínculo de
   qualificação ativo. **Esperado**: o texto histórico continua visível como estava, **e** um campo
   "Disciplinas Habilitadas" separado mostra o cruzamento calculado — os dois nunca se misturam nem
   um substitui o outro.
5. Localizar um dos 6 instrutores reais com `Esp_Hab_Obs = "NS"` (achado 7). **Esperado**: o dropdown
   não força uma sigla arbitrária — mostra o valor legado `"NS"` com um aviso claro de que precisa
   ser corrigido.
6. Mudar `Status` de `Ativo` para `Inativo` pelo dropdown do formulário e salvar. **Esperado**: o
   mesmo aviso de confirmação do botão "Desativar" aparece antes de gravar (Clarifications
   2026-08-17) — cancelar não perde as outras edições já feitas no formulário.
7. Salvar qualquer edição e conferir no banco (ou reabrir a tela) que `Editado_Por`/`Timestamp_
   Edicao` foram atualizados — achado desta fase (research.md §2): antes desta spec, `crudAtualizar`
   nunca gravava esses 2 campos.

## Passo 4 — Imprimir a Ficha (FR-025 a FR-027, "US3", manual)

1. Clicar em "Imprimir Ficha" em qualquer instrutor da listagem.
2. **Esperado**: abre um modal com cabeçalho "MARINHA DO BRASIL" / "CENTRO DE INSTRUÇÃO E
   ADESTRAMENTO ALMIRANTE RADLER DE AQUINO" / "FICHA DE INSTRUTOR" e os dados em formato de leitura —
   sem chamada de rede nova (dado já carregado, research.md §6).
3. Escolher um instrutor com `Nivel_Escolaridade` vazio (comum — 142 de 177 hoje). **Esperado**: o
   campo aparece como "—", nunca em branco ou `undefined`.
4. Acionar a impressão (botão do modal, chama `window.print()`). **Esperado**: o diálogo nativo do
   navegador abre; na pré-visualização, só a área de dados aparece (sem botões/menus/filtros), em
   orientação retrato — não a paisagem usada pelo DSA (research.md §7).

## Fora do escopo desta validação

- Correção retroativa dos 7 registros reais de `Esp_Hab_Obs` sem correspondência no catálogo (`"NS"`
  ×6, `"MT"` dentro de `"(RM1-MT)"` ×1) — ficam visíveis com aviso, a correção manual fica para quem
  editar cada um (FR-024, fora do escopo desta spec corrigir os dados existentes).
- Harmonização entre os rótulos do dropdown de Categoria desta spec e os rótulos do gráfico
  "Classificação" já existente (divergência aceita desde a spec 015).
- Qualquer mudança no motor de cross-filtering/barra de filtros (spec 015) — só o formulário de
  cadastro/edição e a Ficha são tocados aqui.
