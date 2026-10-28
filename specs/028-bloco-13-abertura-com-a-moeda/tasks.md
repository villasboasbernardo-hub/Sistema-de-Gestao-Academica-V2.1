# Tasks 028 — Bloco 13: abertura com a moeda

Uma história só (US1 — *a raiz abre com a moeda e leva ao Início*), entregue num PR. Sem banco.

## Fase 1 — preparação
- [x] T001 Copiar as quatro imagens para `public/abertura/` e guardar o protótipo em
  `specs/028-bloco-13-abertura-com-a-moeda/referencia-prototipo.html` (D-1).
- [x] T002 Confirmar a propriedade de carregamento prioritário do `next/image` na versão instalada
  (`node_modules/next/dist/shared/lib/get-img-props.d.ts`).

## Fase 2 — fundação: tokens e módulo puro (teste visto falhar antes)
- [x] T003 [P] Os cinco papéis da moeda nos dois temas e a exposição em `@theme inline`, em `app/globals.css`.
- [x] T004 [P] A lista `MOEDA` e a inclusão em `PAPEIS`, em `lib/design/vocabulario.ts`.
- [x] T005 [P] A seção *"Moeda da abertura"* na vitrine, em `app/estilo/page.tsx`.
- [x] T006 Escrever `tests/unidade/abertura-da-moeda.test.ts` (roteiro e máquina de estados) e **vê-lo reprovar** (módulo
  inexistente).
- [x] T007 Implementar `lib/design/abertura-da-moeda.ts` (roteiro, `DURACAO_TOTAL_MS`, revelação do botão,
  `transicao`) até o T006 passar.

## Fase 3 — US1: a abertura na raiz
- [x] T008 [US1] Escrever `tests/e2e/abertura.spec.ts` (SC-001 a SC-005) e **vê-lo reprovar** na raiz antiga.
- [x] T009 [US1] A folha `app/AberturaComMoeda.tsx`: palco, moeda (16 camadas de borda, faces ouro/prata, sombra,
  reflexo), roteiro e máquina ligados à visibilidade da aba, ao Esc, ao clique, ao movimento reduzido e à
  decodificação das imagens; o botão "Início" oculto até a revelação; o `<noscript>`.
- [x] T010 [US1] `app/page.tsx`: o aviso de configuração com a **mesma marcação, texto e condição** (FR-002), a folha
  da abertura e o rótulo da região; sai o título, a linha da Divisão/Ambiente, o parágrafo e o rodapé.
- [x] T011 [US1] Declarar a folha em `tests/unidade/fronteira-das-telas.test.ts`.
- [x] T012 [US1] O caso `FR-030` de `tests/e2e/inicio.spec.ts` passa a ir pelo botão "Início" (Esc → clique).

## Fase 4 — prova e entrega
- [x] T013 Defeitos deliberados: (a) botão sem `hidden` antes do fim → SC-002 reprova; (b) não pausar na aba oculta →
  SC-004 reprova; (c) ignorar o movimento reduzido → SC-003 reprova. Cada um desfeito em seguida.
- [x] T014 `pnpm verificar` verde; os e2e tocados verdes no local; conferência visual por captura (claro, escuro,
  celular, aba trocada).
- [ ] T015 Plano de correções (Bloco 13) e `docs/correcoes/padroes-de-tela.md` se couber; commit `feat(BLOCO-13): …`;
  push; PR com o template; CI verde.

## Dependências
T003–T005 em paralelo; T006 → T007; T007 → T009; T008 antes de T009/T010; T013 depois de T009–T012; T014 → T015.

## Estratégia
Uma história, um incremento: a raiz nova inteira no mesmo PR (a abertura sem o botão, ou o botão sem a abertura, não
teriam valor sozinhos).
