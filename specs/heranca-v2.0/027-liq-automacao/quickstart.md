# Quickstart — Validação Manual do Épico LIQ

Pré-requisitos: migração `turma_disciplina` aplicada à banco de produção (FR-001), deploy corrente
publicado (``git push` (a Vercel publica a preview da branch)`/`o merge na `main` (a Vercel publica em produção)`).

## Passo 1 — Confirmar o bloqueio real (User Story 2, estado atual da base)

1. Abrir o módulo Instrutores, clicar em "LIQ".
2. Selecionar **Ano = 2026, Trimestre = 3º**, clicar em "Gerar".
3. **Esperado**: geração bloqueada, modal lista todas as mensagens de uma vez, incluindo (ver
   `research.md`/`spec.md` para a lista completa vinda de dado real de produção, achado 3):
   - Períodos faltantes em `C-Exp-Obs-ME`, `C-Esp-ALH`, `EST-QF-APHID` e nas turmas T2 de
     `C-ApA-AuxNav-PR-SP`/`C-ApA-PCN-PR-EAD`/`C-ApA-PrevMe-PR-EAD`.
   - Instrutor faltante em `C-Espc-HN / HIDROGRAFIA APLICADA`, `C-Espc-FR / MANUTENÇÃO DE AUXÍLIOS
     À NAVEGAÇÃO`, `C-Exp-MetocOf / ESTÁGIO PRÁTICO`.
4. Confirma FR-004, FR-005, FR-006 (todos os problemas de uma vez, nenhuma escrita no Supabase Storage).

## Passo 2 — Preencher as lacunas (User Story 1)

1. Na Página do Curso, abrir `C-Exp-Obs-ME`, expandir a turma Ativa (14/09–09/10), clicar em
   "Período das Disciplinas".
2. Preencher `Previsao_Inicio`/`Previsao_Termino` das 2 disciplinas sem período, salvar cada uma.
3. Repetir para as demais turmas/disciplinas listadas no Passo 1 (períodos faltantes).
4. Para as 3 disciplinas sem instrutor (`C-Espc-HN`, `C-Espc-FR`, `C-Exp-MetocOf`), atribuir um
   instrutor via a tela de atribuição de disciplinas já existente (Épico anterior, sem mudança
   nesta spec).

## Passo 3 — Confirmar a geração com sucesso

1. Repetir o Passo 1 (mesmo Ano/Trimestre).
2. **Esperado**: nenhum bloqueio; documento a rota de impressão `/print/*` abre em nova aba.
3. Conferir no documento gerado:
   - Rodapé de vigência: `"01/07/2026 a 30/09/2026"` (SC-005).
   - Seção 1 ("Instrutores Habilitados") ordenada por antiguidade decrescente de posto (CMG no
     topo), coluna Obs vazia em todas as linhas (FR-009).
   - Seção 2 ("Instrutores Selecionados") lista as disciplinas do 3º trimestre agrupadas por turma,
     com sufixo de turma quando aplicável (`C-ApA-AuxNav-PR-SP T2`).

## Passo 4 — Suíte automatizada

```
pnpm vitest run tests/unidade/*.test.ts
```

**Esperado**: 0 falhas (mesma suíte já em 315 testes antes desta spec + os casos novos de
`trimestreParaIntervalo_`/`intervalosSeInterceptam_`/`validarLiq_`).
