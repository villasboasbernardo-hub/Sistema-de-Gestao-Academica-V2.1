# Quickstart — Validar o Épico E (Categorização de Atividades Letivas)

## O que pode ser validado hoje (sem banco de produção)

A lógica de cálculo (`lib/dominio/regras-normativas.ts`) é escrita como função pura — testável sem depender da
banco da v2.1 estar publicada.

```powershell
cd CIAARA-11-v2
pnpm vitest run tests/regras_normativas.test.ts
```

Cobre: `calcularTetoAEC_/TAD_/TR_` (percentual, `ultrapassado`, `semBaseDeCalculo` quando o
denominador é zero) e a função de agrupamento dos 5 totalizadores, com dado sintético (fixtures em
memória, não o banco real) — mesmo padrão de `tests/unidade/regras_de_negocio.test.ts`, mas testando
comportamento de função, não propriedade estática de dado migrado.

## O que exige o banco V2.0 publicada (pré-requisito ainda pendente)

- `registrarEventoExtracurricular` e `registrarAvaliacao` de ponta a ponta (escrevem em
  `atividades_nao_letivas`/`avaliacoes` reais).
- `getCronos`/`getDsaSemanal`/`getRelatorio` lendo dado real.
- Qualquer verificação do frontend (`app/(app)/atividades/page.tsx`, `app/(app)/cursos/[curso]/page.tsx`, `app/(app)/turmas/[turma]/dsa/page.tsx`).

Quando o banco estiver publicada e o projeto Supabase e o repositório Next.js vinculado:

1. Implantar via o protocolo de `docs/fase-1/10-Plano-de-Execucao-Spec-Kit.md` §8 (`o SHA do commit`
   incrementado, `o histórico de deploys da Vercel` conferido arquivo a arquivo).
2. Lançar uma atividade de cada categoria (AEC, TAD, TR, Estudo Individual) numa turma de teste e
   confirmar, na `Página do Curso`, que os 3 tetos aparecem calculados.
3. Lançar AEC até ultrapassar 10% da CHD do curso de teste e confirmar o banner amarelo (Aviso
   Nível 2) — o lançamento deve continuar sendo aceito, nunca bloqueado.
4. Lançar uma Avaliação/Vista de Prova e confirmar que a CHD da disciplina sobe no mesmo ato, sem
   segunda tela.
5. Abrir o Cronograma, o DSA e o Relatório da turma de teste e confirmar os 5 totalizadores
   separados, batendo com o que foi lançado.

## O que NÃO esperar desta feature

- RBAC ampliado (perfis além de Admin/Operador/Visualização) — Épico F.
- Dashboard de situação de Avaliações (Concluída/Pendente/Atrasada/Sem correspondência) — Épico I.
- Detecção de conflito de horário/instrutor (RN-CONF-01) — pendência rastreada, fora deste épico.
- AppState completo (histórico de navegação, deep-linking) e Design System completo (temas,
  microcopy) — Épicos D e A; esta feature usa versões mínimas só do necessário.
