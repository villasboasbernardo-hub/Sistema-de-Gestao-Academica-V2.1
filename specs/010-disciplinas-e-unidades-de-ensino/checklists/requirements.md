# Specification Quality Checklist: Disciplinas e Unidades de Ensino — Épico 5, fatia (b)

**Purpose**: Validar completude e qualidade da spec antes do clarify/plan
**Created**: 24/09/2026
**Feature**: [spec.md](../spec.md) · análise: [analise-dos-curriculos.md](../analise-dos-curriculos.md)

## Content Quality

- [x] Sem detalhe de implementação além do que o pedido exige (a spec MUST dizer como o `DELETE` chega ao banco — D-B1 — e cita pelo nome o que a `main` já tem)
- [x] Focada em valor e regra de negócio
- [x] Legível por quem não programa (vocabulário institucional preservado)
- [x] Todas as seções obrigatórias preenchidas

## Requirement Completeness

- [ ] **Nenhum marcador de clarificação restante** — ⚠️ **17 perguntas abertas de propósito** (Q-01 a Q-17), por decisão de Bernardo em 24/09/2026: *"NÃO responda nenhuma e NÃO rode o clarify"*. Os requisitos afetados apontam a pergunta em vez de assumir (`FR-012`, `FR-022`/`FR-024`, `FR-030..032`, `FR-040..043`, `FR-052`, `FR-062..065`, `FR-070`)
- [x] Requisitos testáveis e sem ambiguidade fora das perguntas abertas
- [x] Critérios de sucesso mensuráveis (SC-001 a SC-013, com os critérios 3, 4 e 5 do Épico 5)
- [x] Critérios de sucesso sem detalhe de implementação
- [x] Cenários de aceite definidos por história (US1–US7)
- [x] Casos de borda identificados
- [x] Escopo delimitado (fora de escopo declarado; D-B1 restrito a disciplinas e UEs)
- [x] Dependências e premissas identificadas (Assumptions; `main` em `406b566` com o PR 2)

## Feature Readiness

- [x] Cada requisito tem critério de aceite claro ou pergunta nomeada
- [x] Histórias cobrem os fluxos principais (cascata, CRUD, por turma, rateio, quadro, UE, curso sem UE)
- [x] Os resultados mensuráveis correspondem às histórias
- [ ] Sem vazamento de implementação — ⚠️ há nomes de tabela, coluna, RPC e arquivo **de propósito**: o pedido exige dizer *"qual tela escreve qual tabela"* e *"como o DELETE chega ao banco"*, e a regra 9.2 exige nomear o artefato de cada número

## Medições (regra 9.2 / 9.3)

- [x] Todo "medido: N" nomeia o artefato (tabela em "O que foi MEDIDO" e na análise §1/§5)
- [x] Nenhuma afirmação de resultado escrita antes da medição (nada foi implementado; os números são de leitura)
- [x] Análise dos currículos feita **antes** da spec, com o extrator existente (sem segunda implementação)
- [x] Os três sem UE confirmados — com a correção de que `EST-QF-APOC` é **ilegível**, não "sem UE"
- [x] Diferenças currículo × banco numeradas e explicadas inteiras (41 sem par = 32 + 5 + 3 + 1; 4 CH; 1 currículo sem par; 1 sem lista)

## Notes

- Itens incompletos são **deliberados**: o próximo passo é `/speckit-clarify` com o lote Q-01..Q-17,
  quando Bernardo decidir. Nada de plan antes disso.
- Nenhuma escrita no remoto; nenhum código; o ramo tem só documentos e `.specify/feature.json`.
