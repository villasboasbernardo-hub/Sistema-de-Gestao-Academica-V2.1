# Data Model — Ficha de Cadastro de Instrutores e Formulário Avançado

Uma coluna física removida (`Ultima_Avaliacao_Desempenho`, FR-001); nenhuma outra mudança de schema.
Este documento descreve a forma final de `instrutores` após a remoção, a taxonomia de tipo de campo
que o formulário usa para decidir como renderizar/validar cada um, e as formas de dado derivado
(client-side) novas desta spec.

## 1. `instrutores` — forma final (30 colunas, era 31)

| Coluna | Tipo de campo (§2) | Observação |
|---|---|---|
| `ID_Instrutor` | `oculto-cadastro` / `readonly` | PK, inteiro simples sequencial (research.md §1) |
| `Antiguidade_Declarada` | `calculado-frontend` | De `Posto_Graduacao` (research.md §3, FR-007) |
| `Posto_Graduacao` | `dropdown-fechado` | 14 códigos (achado 8/11 de `spec.md`) |
| `Esp_Hab_Obs` | `dropdown-fechado-sigla` | 60 opções, grava só a sigla (research.md §4) |
| `Nome_Completo` | `texto-livre` | |
| `Nome_Guerra` | `texto-livre` | |
| `Categoria` | `dropdown-fechado` | 4 opções (achado 8) |
| `NIP` | `texto-mascarado` | `00.0000.00` (FR-013) |
| `Data_Nascimento` | `data` | |
| `OM` | `texto-livre` | |
| `Dep_Divisao` | `texto-livre` | |
| `Data_Assuncao_Setor` | `data` | Alimenta `Tempo_Setor_Anos` |
| `Tempo_Setor_Anos` | `calculado-frontend` | De `Data_Assuncao_Setor` × hoje (research.md §3, FR-008) |
| `Email` | `texto-livre` | |
| `Regime_Trabalho` | `dropdown-fechado` | 3 opções (achado 8) |
| `Nivel_Escolaridade` | `dropdown-fechado` | 5 opções (achado 8) |
| `Formacao_Principal_Secundaria` | `texto-livre` | Campo único (achado 1, Assumptions) |
| `Capacitacao_Didatica` | `checkbox-grupo` | CSV, 3 opções (FR-016) |
| `Disciplinas_Ministradas` | `texto-livre-readonly-condicional` | Nunca apagado (FR-010) — editável só se a spec não disser o contrário; ver Nota abaixo |
| `Data_Inicio_Docencia_MB` | `data` | |
| `Data_Inicio_Docencia_CIAARA` | `data` | |
| `Docente_Ate_2_Disciplinas` | `oculto` | Nunca aparece (FR-012) |
| `Carga_Horaria_Ministrada_Ano` | `readonly` | Já calculado pelo backend desde a spec 014 (FR-009) |
| ~~`Ultima_Avaliacao_Desempenho`~~ | — | **Removida** (FR-001) |
| `Data_Avaliacao` | `data` | Distinta de `avaliacoes.Data_Avaliacao` (achado 2) |
| `Instrutor_Completo` | `readonly` | FORMULA nativa, já protegida (`COLUNAS_FORMULA`, spec 014) |
| `Preferencia` | `checkbox-matriz` | Segunda–Sexta × Manhã/Tarde, serializado como CSV (§3, FR-017) |
| `Status` | `dropdown-fechado-confirmacao` | Ativo/Inativo, confirma ao mudar para Inativo (FR-021) |
| `Editado_Por` | `readonly` | Gravado por `crudAtualizar` (research.md §2, FR-011) |
| `Timestamp_Edicao` | `readonly` | Idem |
| `Origem_Migracao_v1` | `oculto` | Nunca aparece (FR-012) |

**Nota sobre `Disciplinas_Ministradas`**: o pedido original pede "read-only estrito, calculado
automaticamente" — resolvido (Assumptions de `spec.md`) como: o texto histórico continua exibido
como está, **e** um campo adicional `Disciplinas Habilitadas` (calculado, §4 abaixo) aparece ao lado.
Nesta spec, `Disciplinas_Ministradas` em si passa a **somente leitura** no formulário (não mais um
`<input>` editável como no painel da spec 014) — é a leitura mais fiel possível do pedido sem apagar
histórico: o campo para de aceitar edição manual nova, mas o que já existe continua visível. **Achado
do `/speckit-analyze` (U1)**: "somente leitura na interface" sozinho não é garantia suficiente contra
perda de dado (Princípio IV) — nada impedia um payload de salvamento incluir a chave por engano. A
proteção real é `montarPayloadEdicaoInstrutor_` (research.md §10), que remove essa chave do payload
antes de qualquer chamada a `cadastrarInstrutor`/`atualizarInstrutor`, e faz o mesmo para `Esp_Hab_Obs`
quando o valor não corresponde a nenhuma sigla do catálogo (FR-024) — mesma lógica testável
isoladamente, não só confiança na interface.

## 2. Taxonomia de tipo de campo (usada por `renderizarPainelEdicaoInstrutor_`)

Substitui o array simples `{chave, rotulo, tipo}` da spec 014 (só suportava `text`/`date`/`number`/
`email`) por um `tipo` mais rico:

```text
'texto-livre'                  -> <input type="text">
'texto-mascarado'               -> <input type="text"> + handler de mascara (mascaraNip_, research.md)
'data'                          -> <input type="date">
'dropdown-fechado'              -> <select> com as opcoes do achado 8
'dropdown-fechado-sigla'        -> <select> (60 opcoes, texto=nome completo, value=sigla) + aviso se
                                    o valor atual nao corresponde a nenhuma opcao (FR-024)
'dropdown-fechado-confirmacao'  -> <select> (Status), renderizado de forma IDENTICA a
                                    'dropdown-fechado' - a confirmacao NAO e comportamento do
                                    campo/renderizador (achado do /speckit-analyze, I1); e um
                                    comportamento do SALVAMENTO do formulario completo (US2, T029),
                                    que compara o Status enviado com o Status original do instrutor
                                    e so entao decide chamar confirm() antes de prosseguir
'checkbox-grupo'                -> N <input type="checkbox">, serializado como CSV ao salvar
'checkbox-matriz'                -> grade Dia x Periodo (5x2 = 10 checkboxes), serializado como CSV
                                    ao salvar (formato no §3 abaixo)
'calculado-frontend'            -> <p> somente-leitura, recalculado a cada mudanca do campo-fonte
'readonly'                      -> <p> somente-leitura, nunca <input>
'oculto'                        -> nao renderizado, nunca aparece
'oculto-cadastro'                -> nao renderizado em modo cadastro; 'readonly' em modo edicao
```

## 3. Serialização de `Preferencia` (checkbox-matriz)

```text
Preferencia (string, mesma coluna fisica de sempre) = lista separada por virgula de
"<Dia>-<Periodo>", ex.: "Segunda-Manhã, Quarta-Tarde, Sexta-Manhã"

Dias: Segunda, Terça, Quarta, Quinta, Sexta (nesta ordem)
Periodos: Manhã, Tarde
Nenhuma combinacao marcada -> string vazia (equivalente a "sem preferencia", achado 9 - os 2
registros reais legados com "Sem preferência" viram string vazia na proxima edicao, sem quebrar
nada - o campo nunca foi obrigatorio)
```

## 4. `Disciplinas Habilitadas` (derivado, não persistido, achado 3/6)

```text
disciplinasHabilitadasDoInstrutor_(idInstrutor, vinculosCarregados_, disciplinasCarregadas_,
  cursosPorId) -> string[]
// Para cada vinculo Status=Ativo daquele ID_Instrutor, resolve ID_Grade -> {Nome_Disciplina, ID_Curso}
// em disciplinasCarregadas_, e ID_Curso -> nome em cursosPorId (AppState.ctx.cursos) - devolve
// "<nomeCurso> — <nomeDisciplina>" por vinculo, mesmo formato da V1.0 (achado 3).
```

## 5. Escala de Antiguidade — forma final (14 códigos, era 11)

```text
ESCALA_ANTIGUIDADE_POSTO = {
  AE: {ordem: 0, nome: 'Almirante de Esquadra'}, VA: {ordem: 0, nome: 'Vice-Almirante'},
  CA: {ordem: 0, nome: 'Contra-Almirante'},
  CMG: {ordem: 1, ...}, CF: {ordem: 2, ...}, CC: {ordem: 3, ...}, CT: {ordem: 4, ...},
  '1ºTen': {ordem: 5, ...}, '2ºTen': {ordem: 6, ...}, SO: {ordem: 7, ...},
  '1ºSG': {ordem: 8, ...}, '2ºSG': {ordem: 9, ...}, '3ºSG': {ordem: 10, ...}, SC: {ordem: 11, ...},
}
```
Presente em 2 arquivos (backend `lib/acoes/instrutores.ts`, frontend `app/(app)/instrutores/page.tsx` — 2 constantes lá,
`ORDEM_ANTIGUIDADE_POSTO`/`NOMES_POSTO_POR_CODIGO`), mesmo padrão de duplicação já aceito no projeto
(Next.js não importa `.ts` em `.html`). `CIRCULO_HIERARQUICO_POR_POSTO` (spec 015) ganha `AE`,
`VA`, `CA` → `'Oficiais'` (Assumptions de `spec.md`).

## 6. Catálogo de `Esp_Hab_Obs` (novo, só exibição/validação — 60 entradas)

```text
CATALOGO_ESP_HAB_OBS = { AM: 'Armamento', AV: 'Aviação/FN', CA: 'Controle Aéreo/Corpo da Armada',
  ... (60 pares sigla -> nome completo, texto exato do pedido do usuário) ... }
```
Usado em 2 direções: popular o `<select>` (texto=nome completo, value=sigla, FR-023) e, via
`normalizarEspHabObs_` (research.md §4), tentar casar um valor legado com uma sigla conhecida antes
de decidir se mostra o dropdown pré-selecionado ou o aviso de FR-024.

## 7. Nenhuma mudança em outras entidades persistidas

`instrutor_disciplina`, `disciplinas`, `cursos`: zero coluna nova, zero renomeação — todas as
formas derivadas desta spec (`Disciplinas Habilitadas`, catálogo de siglas, escala de antiguidade)
são client-side, nunca persistidas em nenhuma aba nova (cumpre FR-002).

## 8. Montagem do payload de salvamento (novo, achado U1 do `/speckit-analyze`)

```text
montarPayloadEdicaoInstrutor_(valoresDoFormulario, instrutorOriginal) -> objeto pronto para
  cadastrarInstrutor/atualizarInstrutor
```

Chamada pelos 2 caminhos de salvamento (cadastro e edição, FR-005) antes de delegar ao backend —
única fonte da regra "nunca reenviar `Disciplinas_Ministradas`; só reenviar `Esp_Hab_Obs` quando
corresponde a uma sigla real do catálogo" (research.md §10). Testável isoladamente (`tests/ficha_
formulario_instrutores.test.ts`), em vez de ficar implícita dentro do handler de salvamento — dá a
SC-004 uma garantia automatizada, não só verificação manual.
