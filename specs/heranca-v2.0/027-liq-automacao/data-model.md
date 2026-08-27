# Phase 1 Data Model: Épico LIQ

## Entidade nova: `turma_disciplina`

Fonte de verdade do período (início/término previstos) de cada disciplina **por turma** — em
substituição a `disciplinas.Previsao_Inicio/Termino` para todo cálculo de "esta disciplina
ocorre neste trimestre?". `disciplinas` mantém suas próprias datas como **semente da grade**
(usada só para popular uma turma nova), nunca mais como fonte de verdade em tempo de execução.

Precedente estrutural: mesmo relacionamento já usado por `cursos` → `curso_regime_historico` (curso "modelo" vs. instância histórica).

| Coluna | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `ID_turma_disciplina` | texto (PK) | Sim | Identificador único da linha, gerado pela migração. |
| `ID_Turma` | texto (FK → `turmas.ID_Turma`) | Sim | Turma a que este período pertence. |
| `ID_Grade` | texto (FK → `disciplinas.ID_Grade`) | Sim | Disciplina (linha de grade) a que este período pertence. |
| `Previsao_Inicio` | data | Não* | Data prevista de início da disciplina nesta turma específica. |
| `Previsao_Termino` | data | Não* | Data prevista de término da disciplina nesta turma específica. |
| `Origem_Periodo` | ENUM(`Herdado_Grade`, `Nao_Informado`) | Sim | `Herdado_Grade` quando a migração copiou o período de `disciplinas` (a data da grade caía dentro da janela da própria turma); `Nao_Informado` quando nasceu em branco — marcador exato das 121 lacunas que a tela de período (User Story 1) existe para preencher. |

*`Previsao_Inicio`/`Previsao_Termino` ficam vazios enquanto `Origem_Periodo === 'Nao_Informado'` e
o operador não preencher via o painel de período por turma; FR-004 é o que torna o preenchimento
efetivamente obrigatório antes de gerar a LIQ para o trimestre correspondente.

**Unicidade lógica**: `ID_Turma` + `ID_Grade` (uma disciplina aparece no máximo uma vez por turma).

**Estado atual (pós-migração em sandbox, a confirmar após aplicação à banco de produção)**: 210
linhas — 89 com `Origem_Periodo = 'Herdado_Grade'`, 121 com `Origem_Periodo = 'Nao_Informado'`.

**Regras de validação (reaproveitadas de FR-004/FR-005, não novas aqui)**:
- Uma linha só é relevante para bloqueio de geração da LIQ se sua turma (`turmas.Status !==
  'Cancelada'`) tem intervalo que intercepta o trimestre selecionado.
- Uma linha com período preenchido só é relevante para a checagem de instrutor (FR-005) se o
  próprio período dela intercepta o trimestre selecionado (não basta a turma interceptar).

## Entidades existentes referenciadas (sem alteração de schema)

| Entidade | Campos usados nesta spec | Uso |
|---|---|---|
| `turmas` | `ID_Turma`, `Turma` (contém `"T1"`/`"T2"` literal), `Data_Inicio`, `Data_Termino`, `Status` | Filtro de turmas elegíveis (FR-004); sufixo de turma na coluna CURSO da Seção 2 (FR-010). |
| `disciplinas` | `ID_Grade`, `Nome_Disciplina`, `Carga_Horaria_Tempos`, `Previsao_Inicio`/`Termino` (agora só semente) | Nome/CH da disciplina para Seção 1 e 2; `ID_Curso` para resolver o nome do curso. |
| `instrutor_disciplina` | `ID_Grade`, `ID_Instrutor`, `Status` | Vínculo instrutor↔disciplina — fonte de FR-005 e da coluna INSTRUTOR(ES) da Seção 2; também determina quem entra na Seção 1 ("ao menos um vínculo ativo"). |
| `instrutores` | `Status`, `Posto_Graduacao`, `Nome_Completo`, `OM`, `Dep_Divisao`, `Data_Assuncao_Setor`, `Tempo_Setor_Anos`, `Formacao_Principal_Secundaria`, `Carga_Horaria_Ministrada_Ano`, `Antiguidade_Declarada` | Todas as 8 colunas da Seção 1 mapeiam diretamente (achado 2) — nenhuma coluna nova necessária. `Antiguidade_Declarada` (já persistida, gravada a partir de `Posto_Graduacao` em toda escrita) é a chave de ordenação de `montarDadosSecao1Liq_` (correção de `/speckit-analyze`, ver research.md § 6). |
| `config_parametros` | nova chave `ID_TEMPLATE_LIQ` | Localiza o template da rota `/print/ficha-instrutor` (Princípio VII). |

## Fora de escopo (confirmado em Clarifications 2026-08-20)

- `Papel_LIQ` / distinção titular-reserva (LIQ-3) — todos os instrutores vinculados são listados
  sem rótulo de papel.
- `Instrutor_Impedimento` (LIQ-2) — descartado por decisão do responsável; `{{L1_OBS}}` sempre vazia.
- `LIQ_Emitida` / histórico de documentos gerados (LIQ-4) — cada geração cria um novo documento no
  Supabase Storage, sem deduplicação nem registro de status (Minuta/Enviada/Aprovada).
