# Data Model — Hotfix e Nova Feature: Integração de Template SPA, Máscaras de Input e Limpeza de Formulário

## `instrutores` (alterada)

| Mudança | Coluna | Tipo | Detalhe |
|---|---|---|---|
| Removida (FR-005) | `Instrutor_Completo` | Fórmula nativa (`=IFERROR(TRIM($C2&" "&$F2);"")`) | Sem consumidor real de código (achado real, spec.md) — só exibida como campo readonly, sem uso em `MAPA_TAGS_FICHA_PDF` nem em nenhuma outra view. |
| Adicionada (FR-006) | `Endereco_Estado` | Texto livre, 2 caracteres (UF) | Selecionada via `<select>` de 27 UFs no formulário (`dropdown-uf`, contracts/frontend-functions.md); `"RJ"` pré-selecionado em modo cadastro. **Não** ganha entrada em `MAPA_TAGS_FICHA_PDF` nem tag no Template do PDF (Princípio IX, fora do pedido original). |

Nenhuma outra coluna de `instrutores` é tocada por esta spec. Nenhuma outra aba/entidade do
schema é tocada.

## Migração

Um único script (`migracao/remover_instrutor_completo_adicionar_estado.py`), mesmo protocolo de
toda migração desta sessão: backup do `.xlsx` de trabalho antes de qualquer mudança;
`migracao_log` ganha 2 linhas novas (`Acao='Remocao_Coluna'` para `Instrutor_Completo`,
`Acao='Adicao_Coluna'` para `Endereco_Estado`), nunca reescrevendo linha existente (Princípio IV).
Aplicação contra a banco de produção é pendência real explícita, fora do `/speckit-implement` desta
spec (mesmo padrão de toda migração anterior desta sessão).
