# Tarefas — spec 032 (Bloco 17)

## Fase 1 — domínio (RN-SALDO-01)

- [X] T001 [US3] Vitest `RN-SALDO-01` (três níveis, limite inclusivo, planejada, dia bloqueado), visto reprovar, em `tests/unidade/andamento-da-turma.test.ts`
- [X] T002 [US3] `situacaoDoSaldo`, `semanaDeAula`, `datasBloqueadasDaTurma` e os mapas de rótulo/tom/frase em `lib/dominio/andamento-da-turma.ts`
- [X] T003 [US3] `RN-SALDO-01` no documento 04 (`docs/fase-1/04-Regras-de-Negocio-a-Preservar.md`, só o `.md`)

## Fase 2 — leitura e consumidores

- [X] T004 [US2] `lerDiasBloqueadosAFrente` em `app/(app)/turmas/dias-bloqueados.ts`
- [X] T005 [US2] Ficha (`app/(app)/turmas/[turma]/page.tsx`), `/turmas` (`page.tsx`, `consulta.ts`), Início (`inicio/page.tsx`, `panorama.ts`) e Avisos (`avisos/leitura.ts`) com os dias bloqueados
- [X] T006 [US3] A situação do saldo em `TabelaDeTurmas.tsx` e `inicio/CartaoDaTurma.tsx`

## Fase 3 — cartões (itens 1 e 2)

- [X] T007 [US1] `compacto` e `tom` em `components/ciaara/card-kpi.tsx` (o mapa `TONS` exportado de `badge-status.tsx`); amostra em `app/estilo/amostras.tsx`
- [X] T008 [US1] [US2] Cartão da situação, CH restante, dias úteis, CH disponível e *Saldo de CH* em `app/(app)/turmas/[turma]/IndicadoresDaTurma.tsx`

## Fase 4 — abas e Atividades (itens 4 a 6)

- [X] T009 [US4] `components/ciaara/em-breve.tsx` (e o DSA passa a usá-lo)
- [X] T010 [US4] APOINST e Palestras em `AbasDaTurma.tsx` e no contrato (`lib/navegacao/contrato.ts`)
- [X] T011 [US5] Palestras em `AbasDeAtividades.tsx` e `atividades/page.tsx`
- [X] T012 [US6] EI fora da lista, do universo e do filtro (`atividades/page.tsx`, `FiltrosDeAtividades.tsx`, `CATEGORIAS_DA_LISTA_DE_ATIVIDADES`)

## Fase 5 — provas

- [X] T013 Guardas ajustadas: `contrato-de-parametros` (opções da aba), `vocabulario-proibido` (*Saldo de CH*), vitrine
- [X] T014 Medição na cópia do remoto (`medicao/medir-saldo.mts`, `saldo-antes-depois.tsv`)
- [X] T015 e2e: `andamento.spec.ts` (cartões, conta, abas), `andamento-ate-hoje.spec.ts`, `inicio.spec.ts`, `atividades-filtro-de-data.spec.ts` (EI e Palestras)
- [X] T016 Verificação local, push, PR e CI verde
