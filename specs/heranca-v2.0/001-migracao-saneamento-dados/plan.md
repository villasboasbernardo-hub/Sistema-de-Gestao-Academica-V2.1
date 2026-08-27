# Implementation Plan: Épico C — Migração e Saneamento da Base de Dados

**Branch**: `001-migracao-saneamento-dados` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-migracao-saneamento-dados/spec.md`

## Summary

A verificação do estado real do artefato (`docs/arquitetura/01-schema.md`, o banco de trabalho
`Versão 2.0/Fase 2 - Arquitetura/Banco de dados CIAARA-11 v2.0.xlsx` e a suíte `tests/`) mostra que
a transformação de dados descrita nas User Stories 2, 3, 5, 6, 7, 8 e 9 do spec **já foi executada**
como parte do trabalho transversal de Fase 2 (arquitetura), antes deste ciclo Spec-Kit começar —
não como um passe adicional deste plano. Rodando a suíte de invariantes hoje: **42 de 45 asserções
concretas passam**; 13 são stubs (`test.todo`) rastreáveis para comportamento de código de épicos
futuros (D, F, G — fora de escopo aqui); **3 falham**, e são exatamente os 3 achados já registrados
em `CLAUDE.md`.

O escopo real que este plano fecha, portanto, não é "migrar os dados" (feito), é:

1. **Corrigir os 3 achados que a suíte ainda acusa** — vínculo órfão em `instrutor_disciplina`
   (User Story 3, residual), `Posto_Graduacao` fora da escala em `instrutores` (User Story 4,
   residual) e o terceiro formato de ID `AVL-M…`/`EVT-M…` (User Story 2/5, residual — RN-CRUD-03).
2. **Versionar como script Python reproduzível e auditável** cada transformação do roteiro
   `docs/arquitetura/01-schema.md` §6 que hoje só existe como edição já aplicada ao arquivo, sem
   script correspondente no repositório (User Story 1, FR-002) — hoje só a renomeação P-14
   (`migracao/renomear_materia_para_disciplina.py`) segue esse padrão; o resto da migração não é
   reexecutável nem auditável como código.
3. **Fechar (ou documentar explicitamente como pendência operacional)** o placeholder nominal
   `[A PREENCHER]` em `responsaveis_curso` (User Story 9) — depende de dado real do Encarregado da
   Divisão, não é uma decisão técnica.
4. **Registrar formalmente a decisão de esclarecimento desta sessão** sobre `Posto_Graduacao = "SC"`
   (instrutores civis, `Categoria = SCNS`): entram na ordenação RN-ANT-01 com peso 13 (após `MN`),
   não ficam fora dela e não são tratados como erro de dado.

Nenhum código de aplicação (`.ts`) é escrito nesta feature — `docs/arquitetura/02-modularizacao.md`
já declara explicitamente que migração é responsabilidade de scripts versionados em `migracao/`,
fora o projeto Supabase e o repositório Next.js publicado. A janela de manutenção decidida na sessão de clarificação
(FR-004a) se aplica ao evento de corte V1.0→V2.0 ainda não realizado (publicação como banco Supabase
ao vivo — fora de escopo desta spec, ver Assumptions); as correções deste plano operam inteiramente
sobre a cópia de trabalho `.xlsx`, offline, sem tocar o banco V1.0 em produção.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: `openpyxl` — já em uso em `migracao/renomear_materia_para_disciplina.py`
e `tests/support/exportar_planilha.py`. Nenhuma dependência nova.

**Storage**: arquivo de trabalho `Versão 2.0/Fase 2 - Arquitetura/Banco de dados CIAARA-11 v2.0.xlsx`
(PostgreSQL é o destino final — RNF-PLAT-02 — mas a publicação ao vivo está fora do escopo
funcional desta spec, conforme Assumptions).

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: N/A — RNF-PERF-01 (volume pequeno, ~2.500 registros totais na base inteira,
sem requisito de reengenharia para escala).

**Constraints**: nenhuma linha de `migracao_log` já gravada é reescrita (Princípio IV); nenhum
`.ts` é tocado (Princípio III — fora de escopo desta feature); cada correção é um script cirúrgico
e independente, um commit por unidade de mudança, seguindo o padrão já estabelecido por
`migracao/renomear_materia_para_disciplina.py` (Princípio VI); toda ação de escrita roda em janela
de manutenção declarada (FR-004a), embora, na prática desta feature, isso signifique apenas
"ninguém edita o `.xlsx` de trabalho manualmente enquanto os scripts rodam" — não há usuário ao
vivo para bloquear.

**Scale/Scope**: 23 abas, ~2.500 registros totais; 3 correções pontuais + backfill retroativo de
~6 scripts de migração hoje não versionados + 1 pendência operacional (dado nominal) + 1 decisão de
esclarecimento a registrar em documentação.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Re-check pós-Fase 1 (2026-08-14)**: `research.md` e `data-model.md` não introduziram nenhuma
entidade, dependência ou padrão novo além do já avaliado abaixo — a tabela permanece válida sem
alteração após o design.

| Princípio | Avaliação |
|---|---|
| I. Fidelidade à Fase 1 | PASS. Toda correção cita `RF-`/`RN-` (RN-INST-01/`instrutor_disciplina`, RN-ANT-01/02, RN-CRUD-03, RF-DADOS-06). O único ponto omisso pela Fase 1 (peso de antiguidade para instrutor civil) foi levado ao responsável nesta sessão antes de assumido, não inferido — decisão registrada nas Clarifications do spec e repetida aqui. |
| II. Preservação de Regras de Negócio | PASS. Verificação por `tests/` (suíte de invariantes), não por diff de saída de curso — mesma suíte já existente, sem mudança de estratégia. |
| III. Restrição de Plataforma | PASS. Nenhum código backend/frontend é escrito. Scripts Python/Node são ferramenta de migração local, mesmo padrão já em uso em `migracao/`/`tests/support/` — não é o runtime de produção. |
| IV. Integridade do Histórico | PASS — é o princípio central desta feature. Toda correção: snapshot antes (já existe, ou é retirado de novo se o `.xlsx` de trabalho mudar), `migracao_log` só recebe linhas novas, `C-05`/`C-07` (nunca apagar, sempre preservar valor bruto) aplicados ao vínculo órfão e aos IDs renumerados. |
| V. Degradação Segura e Alerta-Não-Bloqueio | PASS. O vínculo órfão de `instrutor_disciplina` não é "corrigido" inventando um destino plausível — é reconhecido como órfão de origem, mantido `Inativo`, com FK ativo esvaziado (nunca uma exceção não tratada nem um dado fabricado). |
| VI. Mudança Cirúrgica, Validada por Invariantes | PASS. Cada achado vira um script Python independente e pequeno (mesmo padrão de `renomear_materia_para_disciplina.py`), um commit por script, validado pela suíte antes/depois. |
| VII. Configuração Sobre Constante | PASS (nada novo aqui — `config_parametros`/`Calendario_*` já existem no schema físico; esta feature não adiciona nem remove constante alguma). |
| VIII. Rastreabilidade | PASS. Tasks citam RN-/RF- individualmente; os 3 testes hoje falhando (nomeados por RN-) são o próprio critério de conclusão. |
| IX. Contenção de Escopo | PASS. Escopo estritamente limitado ao que a spec e o Épico C (documento 06) definem como migração/saneamento de dado — nenhuma função de aplicação nova é proposta. |

Nenhuma violação. `Complexity Tracking` fica vazio.

## Project Structure

### Documentation (this feature)

```text
specs/001-migracao-saneamento-dados/
├── plan.md              # este arquivo
├── research.md          # Fase 0 — decisões de correção para os 3 achados + achado de escopo
├── data-model.md         # Fase 1 — delta físico sobre docs/arquitetura/01-schema.md
├── quickstart.md         # Fase 1 — como rodar a suíte e os scripts de correção
└── tasks.md              # Fase 2 (gerado por /speckit-tasks, não por este comando)
```

Não há `contracts/`: esta feature não expõe nenhuma interface externa (API, CLI pública, endpoint)
— são scripts de manutenção de dado consumidos apenas por quem opera a migração, e a suíte
`tests/` já desempenha o papel de "contrato verificável" sobre o estado dos dados.

### Source Code (repository root)

```text
CIAARA-11-v2/
├── migracao/
│   ├── renomear_materia_para_disciplina.py                    # já existe (P-14) — padrão a seguir
│   ├── corrigir_vinculo_orfao_instrutor_disciplina.py          # NOVO — achado 1 (RN-INST-01)
│   ├── normalizar_posto_graduacao.py                           # NOVO — achado 2 (RN-ANT-01/02)
│   └── renumerar_ids_migracao_avaliacoes_eventos.py             # NOVO — achado 3 (RN-CRUD-03)
├── tests/
│   ├── reconciliacao_migracao.test.ts                          # ALTERADO — exceção documentada para o vínculo órfão tratado
│   ├── regras_de_negocio.test.ts                               # ALTERADO — escala RN-ANT-02 estendida (peso 13 = civil `SCNS`); domínio de ID passa a aceitar só `AVA-`/`EXT-` pós-renumeração
│   └── support/…                                                # inalterado
├── docs/arquitetura/01-schema.md                                # ALTERADO — nota registrando o fechamento dos achados a–k e a extensão de RN-ANT-02
└── specs/001-migracao-saneamento-dados/                         # esta feature
```

Cada script novo em `migracao/` é **idempotente**: verifica, antes de escrever, se a correção já
foi aplicada (mesmo padrão de guarda que evita duplo-processamento se o script for reexecutado por
engano) — consistente com o Princípio VI e com o fato de que o arquivo `.xlsx` de trabalho já foi
editado uma vez fora de controle de versão; rodar o script contra um arquivo já corrigido deve ser
uma operação segura e sem efeito (log apenas confirma "já conforme", não duplica linha).

**Estrutura selecionada**: variação do "Option 1" do template (projeto único), mas sem `src/`
porque não há código de aplicação nesta feature — o paralelo real é `migracao/` (scripts) +
`tests/` (verificação), ambos já existentes no repositório com essa função.

## Complexity Tracking

*Sem violações do Constitution Check — seção vazia.*
