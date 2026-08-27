# Implementation Plan: Limpeza de Colunas Mortas em disciplinas e Coerência de Datas por Turma

**Branch**: `master` | **Date**: 2026-08-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/033-limpeza-schema-disciplinas/spec.md`

## Summary

Remove 3 colunas mortas/quebradas de `disciplinas` (`Instrutores_Selecionados`,
`Tecnica_Ensino_Sugerida`, `Local_Padrao`) via migração aditiva-inversa (backup + `migracao_log`,
mesmo padrão de `remover_instrutor_completo_adicionar_estado.py`), e corrige as 2 funções
turma-escopadas de `lib/acoes/cronograma.ts` (`getDisciplinasDaTurmaComRitmo`/`getCronogramaGlobalDisciplina`)
para preferir a data real de `turma_disciplina` sobre a semente de `disciplinas` quando ela
existir, via uma função pura nova compartilhada, `resolverPeriodoEfetivo_`. Nenhum arquivo de
frontend é tocado — nenhuma das 2 mudanças tem consumidor de UI (achado da spec).

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova — reaproveita `_util_migracao.py` (`fazer_backup`/
`gravar_log`/`salvar`) e `lerAbaComoObjetos_`/`TABELAS` já existentes.

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — `disciplinas` (perde 3 colunas), `turma_disciplina` (leitura,
sem mudança de schema).

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: Sem meta nova — `getDisciplinasDaTurmaComRitmo` ganha 1 leitura adicional de
`turma_disciplina` filtrada por `idTurma` (mesma aba, mesmo padrão de leitura em memória já usado
por todas as funções turma-escopadas do projeto); `getCronogramaGlobalDisciplina` ganha 1 leitura
adicional filtrada por `ID_Grade`+`ID_Turma`.

**Constraints**: RNF-PLAT-01..04 (constitution Princípio III) — sem framework/bundler novo.
Constitution Princípio II — nenhuma função muda de assinatura (mesmos parâmetros, mesmo formato de
retorno); só a origem do dado interno muda. Constitution Princípio IV — remoção de coluna segue o
protocolo de backup + log, nunca apaga dado sem registro.

**Scale/Scope**: ~175 linhas de `disciplinas`, ~210 de `turma_disciplina` — mesmos volumes já
manipulados em memória por todas as specs anteriores, sem necessidade de otimização adicional.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Fidelidade à Fase 1**: Nenhum RF-/RN- novo — é limpeza de schema e correção de coerência
  interna, não uma regra normativa nova. Nenhum ponto ambíguo dos documentos 00-09 — resolvido em
  investigação (fork) + conversa direta antes da spec (Achados reais). PASS.
- **II. Preservação de Regras de Negócio**: `getDisciplinasDaTurmaComRitmo`/
  `getCronogramaGlobalDisciplina` mantêm assinatura e formato de retorno idênticos — só a fonte do
  dado de período muda, e só quando `turma_disciplina` tem um valor real e diferente. Quando não
  tem, o resultado é byte-a-byte igual ao de hoje (FR-005). Nenhuma das 3 colunas removidas tem
  consumidor real (Achados reais) — remoção não muda nenhum comportamento observável. PASS.
- **III. Restrição de Plataforma**: Next.js + PostgreSQL + script Python local (mesmo padrão de todas as
  migrações). PASS.
- **IV. Integridade do Histórico**: Remoção de coluna segue o protocolo padrão (backup + 1 entrada
  em `migracao_log`, mesmo precedente de `remover_instrutor_completo_adicionar_estado.py`) —
  nenhum dado histórico é apagado sem registro. Nenhuma linha é removida (fora de escopo, FR-007).
  PASS.
- **V. Degradação Segura**: FR-005 é a própria regra de degradação desta spec — sem `turma_disciplina` preenchida, cai para a semente de `disciplinas`, nunca erro/vazio (RN-DEG-01).
  PASS.
- **VI. Mudança Cirúrgica**: 1 script de migração novo + 1 função pura nova + 2 funções existentes
  ajustadas (mesma assinatura), tudo em `lib/acoes/cronograma.ts` (já dono dessas 2 funções). PASS.
- **VII. Configuração sobre Constante**: N/A — não introduz nem remove nenhum limite normativo.
- **VIII. Rastreabilidade**: Tarefas citam `FR-XXX`; commit final cita o épico. PASS.
- **IX. Contenção de Escopo**: Escopo explicitamente contido às 2 correções com evidência real
  (FR-006/FR-007 excluem tudo que não tinha evidência). PASS.

Nenhuma violação — `Complexity Tracking` fica vazio.

## Project Structure

### Documentation (this feature)

```text
specs/033-limpeza-schema-disciplinas/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md         # Fase 1
├── contracts/
│   └── backend-functions.md   # resolverPeriodoEfetivo_ (nova) + as 2 funções ajustadas
├── quickstart.md         # Fase 1
└── tasks.md              # Fase 2 (/speckit-tasks, não criado por este comando)
```

### Source Code (repository root)

```text
src/
└── backend/
    └── `lib/acoes/cronograma.ts`      # ALTERADO — resolverPeriodoEfetivo_ (nova, função pura);
                            # getDisciplinasDaTurmaComRitmo/getCronogramaGlobalDisciplina ajustadas

migracao/
└── remover_colunas_mortas_cad_disciplinas.py   # NOVO — remove as 3 colunas mortas (backup + log)

tests/
└── regras_de_negocio_backend.test.ts  # ALTERADO — casos novos para resolverPeriodoEfetivo_ e para
                                         # as 2 funções ajustadas
```

**Structure Decision**: Mesma estrutura de todas as specs da sessão. Nenhum arquivo de frontend é
tocado — primeira spec desde a 027 a ser 100% backend + migração, zero UI (achado da spec: nenhuma
das 2 correções tem consumidor de tela).

## Complexity Tracking

*(vazio — nenhuma violação de constitution)*
