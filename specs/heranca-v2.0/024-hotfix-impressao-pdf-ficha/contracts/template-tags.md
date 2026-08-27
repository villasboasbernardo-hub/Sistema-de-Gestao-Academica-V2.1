# Contrato — Tags do Template (Hotfix: Completar Tags do Template)

Documento: `1EzYw9oSBFiM41Qi_F9qQylKTVxGbtwnQl_IaYinPUpg` ("FICHA CADASTRO DE DOCENTES CIAARA",
a rota de impressão `/print/*` nativo). Backup criado antes de qualquer edição (mesmo padrão das specs 022/023),
inserção via `batchUpdate` da API do a rota de impressão `/print/*` em ordem decrescente de índice, leitura de volta
do texto completo após cada inserção.

**Achado real (research.md §3)**: `MAPA_TAGS_FICHA_PDF` tem 34 chaves. 20 já têm `{{TAG}}` no
Template (`ESP_HAB_OBS`, `POSTO_GRADUACAO`, `NOME_COMPLETO`, `NIP`, `NOME_GUERRA`, `RG`,
`ORGAO_EMISSOR`, `CPF`, `DATA_NASCIMENTO`, `OM`, `ENDERECO_LOGRADOURO`, `ENDERECO_NUMERO`,
`ENDERECO_BAIRRO`, `ENDERECO_CIDADE`, `ENDERECO_COMPLEMENTO`, `ENDERECO_CEP`, `EMAIL`, `TELEFONE`,
`FORMACAO_PRINCIPAL_SECUNDARIA`, `AREA_CONHECIMENTO`). As 14 abaixo faltam — lista e posições
idênticas ao Escopo item 5 do pedido original, confirmada correta e completa.

| Tag | Posição de inserção | Formato da linha nova |
|---|---|---|
| `CATEGORIA` | Nova linha próxima aos checkboxes de categoria (seção 1) | `CATEGORIA (conferir marcação acima): {{CATEGORIA}}` — só texto, nenhum checkbox marcado automaticamente |
| `ANTIGUIDADE_DECLARADA` | Anexada ao lado de `POSTO_GRADUACAO` (seção 2) | `POSTO/GRADUAÇÃO: {{POSTO_GRADUACAO}}    ANTIGUIDADE: {{ANTIGUIDADE_DECLARADA}}` |
| `DEP_DIVISAO` / `DATA_ASSUNCAO_SETOR` | Nova linha próxima a OM (seção 2) | `DEPARTAMENTO/DIVISÃO: {{DEP_DIVISAO}}    DATA DE ASSUNÇÃO NO SETOR: {{DATA_ASSUNCAO_SETOR}}` |
| `RETELMA` | Nova linha no bloco de contato, próxima a CELULAR (seção 2) | `RETELMA: {{RETELMA}}` |
| `REGIME_TRABALHO` / `NIVEL_ESCOLARIDADE` | Nova linha na seção 3, próxima a FORMAÇÃO/ÁREA | `REGIME DE TRABALHO: {{REGIME_TRABALHO}}    NÍVEL DE ESCOLARIDADE: {{NIVEL_ESCOLARIDADE}}` |
| `CAPACITACAO_DIDATICA` / `DATA_AVALIACAO` | Nova linha próxima a "POSSUI TÉCNICA DE ENSINO" (seção 3) | `POSSUI CAPACITAÇÃO DIDÁTICA: {{CAPACITACAO_DIDATICA}}    DATA DA AVALIAÇÃO: {{DATA_AVALIACAO}}` |
| `DISCIPLINAS_MINISTRADAS` | Preenche a lacuna já existente "SERÁ INSTRUTOR DE QUAL DISCIPLINA/CURSO: ____" (seção 3) | Substitui os sublinhados por `{{DISCIPLINAS_MINISTRADAS}}` — não é linha nova. **Mecanismo diferente das outras 13** (achado `/speckit-analyze` F2): as demais são `insertText` puro num índice; esta localiza o intervalo de índices exato do trecho de sublinhados e usa `deleteContentRange` (remove os sublinhados) + `insertText` (escreve a tag) no mesmo intervalo, dentro do mesmo `batchUpdate` das outras 13 requisições — os índices dessa requisição específica precisam ser recalculados por último (mais próximos do início do documento têm prioridade na ordem decrescente), já que ela também desloca o texto ao redor |
| `DATA_INICIO_DOCENCIA_MB` / `DATA_INICIO_DOCENCIA_CIAARA` | Nova linha na seção 3 | `INÍCIO DA DOCÊNCIA NA MB: {{DATA_INICIO_DOCENCIA_MB}}    INÍCIO DA DOCÊNCIA NO CIAARA: {{DATA_INICIO_DOCENCIA_CIAARA}}` |
| `PREFERENCIA` | Nova linha ao final da seção 3 | `PREFERÊNCIA: {{PREFERENCIA}}` |
| `ID_INSTRUTOR` | Linha pequena próxima à assinatura, para rastreabilidade | `ID: {{ID_INSTRUTOR}}` (fonte pequena/discreta, não faz parte do corpo do formulário) |

**Verificação**: as 14 tags são inseridas num único `batchUpdate` (não 14 chamadas separadas — ver
research.md §3). Depois que o lote inteiro commita, uma única leitura do texto completo do
documento (plaintext) confirma: (a) cada uma das 14 tags caiu no lugar certo, (b) nenhum texto
vizinho foi corrompido/duplicado (checagem especial para `DISCIPLINAS_MINISTRADAS`, a única
requisição que remove texto em vez de só inserir), (c) nenhuma tag já existente das 20 anteriores
foi afetada, (d) as 34 tags de `MAPA_TAGS_FICHA_PDF` estão todas presentes simultaneamente no
documento.

**Regras**: FR-006; research.md §3.
