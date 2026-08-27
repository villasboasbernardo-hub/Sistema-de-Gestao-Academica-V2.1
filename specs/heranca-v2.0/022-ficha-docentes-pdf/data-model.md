# Data Model — Ficha de Cadastro de Docentes Ampliada e Geração de PDF via a rota de impressão `/print/*`

## `instrutores` — 12 colunas novas (aditivas, FR-001)

| Coluna | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `RG` | texto livre | Não | |
| `CPF` | texto livre | Não | Sem máscara/validação de formato (Assumptions, spec.md) |
| `Orgao_Emissor` | texto livre | Não | |
| `Telefone` | texto livre | Não | |
| `RETELMA` | texto livre | Não | |
| `Endereco_Logradouro` | texto livre | Não | |
| `Endereco_Numero` | texto livre | Não | |
| `Endereco_Bairro` | texto livre | Não | |
| `Endereco_Cidade` | texto livre | Não | |
| `Endereco_Complemento` | texto livre | Não | |
| `Endereco_CEP` | texto livre | Não | Sem máscara (Assumptions, spec.md) |
| `Area_Conhecimento` | texto livre | Não | |

Todas adicionadas ao final da aba (nunca inserção no meio/reordenação — Princípio IV/C-05).
Nenhuma delas participa de `COLUNAS_FORMULA` nem de nenhuma regra normativa existente.

## `instrutores` — colunas existentes que MUST permanecer inalteradas (FR-002)

Todas as ~30 colunas documentadas em `docs/arquitetura/01-schema.md` §5.4 e
`BLOCOS_EDICAO_INSTRUTOR` (``app/(app)/instrutores/page.tsx`:776-815`), com destaque para as que outras specs
já entregues dependem diretamente: `Status` (spec 021, Reativar/Desativar), `Antiguidade_Declarada`
(RN-ANT-02), `Instrutor_Completo`/`Carga_Horaria_Ministrada_Ano` (`COLUNAS_FORMULA`),
`Editado_Por`/`Timestamp_Edicao` (auditoria, C-06), `Disciplinas_Ministradas` (dado legado
preservado desde a spec 016), `Formacao_Principal_Secundaria`, `Data_Avaliacao` (colisão de nome
pré-existente com `avaliacoes`, mantida como está).

## `config_parametros` — linha nova (FR-008)

| Chave | Valor | Tipo | Descricao |
|---|---|---|---|
| `ID_TEMPLATE_FICHA_INSTRUTOR` | `1EzYw9oSBFiM41Qi_F9qQylKTVxGbtwnQl_IaYinPUpg` | `TEXTO` | ID do template da rota `/print/ficha-instrutor` da Ficha do Instrutor (spec 022, Clarifications 2026-08-19) |

`Ano_Vigencia`/`Fundamento_Normativo`/`Editavel_Por` seguem o padrão já usado pelas demais linhas de
`config_parametros` (`Ano_Vigencia` vazio para configuração não-anual; `Editavel_Por` = perfis com
acesso de escrita a `config_parametros`, a definir em `/speckit-tasks` conforme convenção já
existente na aba).

## `MAPA_TAGS_FICHA_PDF` — contrato de mesclagem (FR-007, FR-009, research.md §3/§4)

Tag no Template (`{{TAG}}`) → coluna real de `instrutores`. Só campos com dado persistido entram
(campos `oculto`/`calculado-frontend` não persistidos, como `Tempo_Setor_Anos`, ficam de fora —
`gerarFichaPDF` lê a linha bruta do banco, não o formulário).

| Tag | Coluna |
|---|---|
| `{{ID_INSTRUTOR}}` | `ID_Instrutor` |
| `{{NOME_COMPLETO}}` | `Nome_Completo` |
| `{{NOME_GUERRA}}` | `Nome_Guerra` |
| `{{POSTO_GRADUACAO}}` | `Posto_Graduacao` |
| `{{ANTIGUIDADE_DECLARADA}}` | `Antiguidade_Declarada` |
| `{{ESP_HAB_OBS}}` | `Esp_Hab_Obs` |
| `{{CATEGORIA}}` | `Categoria` |
| `{{NIP}}` | `NIP` |
| `{{DATA_NASCIMENTO}}` | `Data_Nascimento` |
| `{{RG}}` | `RG` |
| `{{CPF}}` | `CPF` |
| `{{ORGAO_EMISSOR}}` | `Orgao_Emissor` |
| `{{TELEFONE}}` | `Telefone` |
| `{{ENDERECO_LOGRADOURO}}` | `Endereco_Logradouro` |
| `{{ENDERECO_NUMERO}}` | `Endereco_Numero` |
| `{{ENDERECO_BAIRRO}}` | `Endereco_Bairro` |
| `{{ENDERECO_CIDADE}}` | `Endereco_Cidade` |
| `{{ENDERECO_COMPLEMENTO}}` | `Endereco_Complemento` |
| `{{ENDERECO_CEP}}` | `Endereco_CEP` |
| `{{OM}}` | `OM` |
| `{{DEP_DIVISAO}}` | `Dep_Divisao` |
| `{{DATA_ASSUNCAO_SETOR}}` | `Data_Assuncao_Setor` |
| `{{EMAIL}}` | `Email` |
| `{{RETELMA}}` | `RETELMA` |
| `{{REGIME_TRABALHO}}` | `Regime_Trabalho` |
| `{{NIVEL_ESCOLARIDADE}}` | `Nivel_Escolaridade` |
| `{{FORMACAO_PRINCIPAL_SECUNDARIA}}` | `Formacao_Principal_Secundaria` |
| `{{AREA_CONHECIMENTO}}` | `Area_Conhecimento` |
| `{{CAPACITACAO_DIDATICA}}` | `Capacitacao_Didatica` |
| `{{DISCIPLINAS_MINISTRADAS}}` | `Disciplinas_Ministradas` |
| `{{DATA_INICIO_DOCENCIA_MB}}` | `Data_Inicio_Docencia_MB` |
| `{{DATA_INICIO_DOCENCIA_CIAARA}}` | `Data_Inicio_Docencia_CIAARA` |
| `{{DATA_AVALIACAO}}` | `Data_Avaliacao` |
| `{{PREFERENCIA}}` | `Preferencia` |

Uma tag no Template sem entrada nesta tabela não é substituída (permanece texto literal `{{TAG}}`
no PDF, degradação visível — Edge Cases, spec.md). Um valor de instrutor vazio/ausente substitui a
tag por string vazia (FR-009).

## Mapeamento de campos por aba (FR-003, espelha Key Entities do spec.md)

| Aba (`aba` em `BLOCOS_EDICAO_INSTRUTOR`) | Bloco atual correspondente | Campos novos incluídos |
|---|---|---|
| `'pessoais'` → "1. Dados Pessoais" | Identificação | `RG`, `CPF`, `Orgao_Emissor`, `Telefone`, `Endereco_*` (6 sub-campos) |
| `'profissionais'` → "2. Dados Profissionais" | Vínculo Institucional | `RETELMA` |
| `'complementares'` → "3. Dados Complementares" | Qualificação Docente | `Area_Conhecimento` |
| *(sem `aba`, fora das 3 abas)* | Sistema (somente leitura) | — |
