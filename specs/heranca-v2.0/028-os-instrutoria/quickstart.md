# Quickstart — Validação Manual do Módulo O.S. de Instrutoria

Pré-requisitos: deploy corrente publicado (``git push` (a Vercel publica a preview da branch)`/`o merge na `main` (a Vercel publica em produção)`).

## Passo 1 — Modo "Por Curso/Estágio"

1. Abrir o módulo Instrutores, clicar em "Gerar O.S. de Instrutoria".
2. Confirmar: listagem principal oculta, `view-os-instrutoria` visível, sem reload de página.
3. Escolher modalidade "Por Curso/Estágio", selecionar um curso com aulas reais lançadas (ex.
   `CAHO`, confirmado com dado real em `registros_aula` nesta sessão).
4. Clicar "Calcular Minuta".
5. **Esperado**: tabela com colunas `Posto/Grad. | NIP | Nome | Téc. de Ens. | Início | Término |
   Curso | Disciplina`; instrutores ordenados por antiguidade decrescente (RN-ANT-01, FR-009.1);
   instrutor com múltiplas disciplinas do curso aparece 1 única vez nas 4 primeiras colunas,
   mescladas via `rowspan` (confirmar inspecionando o HTML gerado — `<td rowspan="N">`).

## Passo 2 — Modo "Por Período (Trimestral/Semestral)"

1. Voltar (`view-os-instrutoria` → listagem principal), reabrir, escolher "Por Período".
2. Selecionar Ano 2026, Trimestre = "1º" (janeiro-março 2026, período com aulas reais confirmadas
   nesta sessão, 06/01 a 18/06/2026 na amostra).
3. Clicar "Calcular Minuta".
4. **Esperado**: só aparecem disciplinas cujas aulas realizadas (`Data`) caem dentro de
   01/01/2026-31/03/2026 — não todas as aulas da turma inteira, mesmo que a turma se estenda além
   do trimestre (research.md § 2).
5. Repetir com "Semestre" = "1º" (janeiro-junho 2026) — conjunto de resultados deve ser um
   superconjunto do trimestre 1 (mesmas aulas de jan-mar + as de abr-jun).

## Passo 3 — Casos vazios

1. Escolher um curso/trimestre sem nenhuma aula real lançada.
2. **Esperado**: mensagem informativa, nunca tabela vazia sem explicação nem erro/exceção.

## Passo 4 — Suíte automatizada

```
pnpm vitest run tests/unidade/*.test.ts
```

**Esperado**: 0 falhas (328 testes anteriores à spec 028 + os casos novos de
`semestreParaIntervalo_`/agrupamento de `calcularOsInstrutoria`).
