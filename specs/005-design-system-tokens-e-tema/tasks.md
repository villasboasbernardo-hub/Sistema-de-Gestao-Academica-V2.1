# Tasks: Épico 4, fatia (a) — Tokens, tema e configuração base

**Entrada**: `specs/005-design-system-tokens-e-tema/` · **Ramo**: `feat/EPICO-4a-tokens-e-tema`
**Pré-requisitos**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) ·
[data-model.md](./data-model.md) · [contracts/](./contracts/) · [quickstart.md](./quickstart.md)

**Testes**: **obrigatórios**, e não por gosto de processo. O `FR-004` e o `FR-012` exigem
**verificação automática** nominalmente, e a Definition of Done do projeto não aceita fatia sem
prova. Nesta fatia os testes **são o produto**: a paleta já está escrita no documento 23, e o que
falta construir é o que impede a cor de escapar depois.

**Formato**: `[ID] [P?] [História] Descrição com o caminho do arquivo`

---

## ⚠️ O que torna esta fatia diferente das anteriores

> **Ela não tem regra de negócio, não tem banco e não tem dado — e mesmo assim tem três invariantes.**
> As três verificações do `data-model.md` (I-2 cor, I-3 contraste, I-4 reconciliação) fazem aqui o
> papel que o pgTAP e a RLS fizeram nos Épicos 1 a 3: dizem o que **não pode acontecer**, e reprovam
> quando acontece.
>
> **Consequência para a ordem:** os tokens vêm antes de tudo (Fase 2), porque sem eles as
> verificações não têm o que verificar e as telas não têm o que consumir.

---

## Phase 1: Setup

**Propósito**: as duas dependências que faltam, e nada além delas.

- [X] T001 Acrescentar `next-themes` ao `package.json` e instalar. ⚠️ **Só ela.** Conferido em 09/09/2026: `nuqs`, `zustand` e a biblioteca de gráficos também estão ausentes, e são das fatias (b) e (c) — instalá-las por antecipação é escopo que ninguém pediu (research R-5)
- [X] T002 Inicializar o shadcn/ui gerando `components.json` na raiz, com destino `components/ui/` e o formato de Tailwind v4. ⚠️ **O arquivo é versionado**: ele é a configuração que faz o próximo componente copiado nascer no lugar certo (`FR-017`). ⚠️ **A inicialização REESCREVE `app/globals.css`.** Por isso ela vem **antes** da Fase 2, e não depois. Reexecutá-la mais tarde atropela os tokens — se for preciso, salve o arquivo antes e reconcilie à mão. ✅ **FEITA em 09/09/2026, mas não com o padrão da ferramenta**: `--defaults` trouxe o estilo `base-nova`, que usa **Base UI** e não Radix, mais `@base-ui/react` como dependência. ⚠️ **É violação do BRIEF §1 e do `FR-019`.** Revertido; `components.json` fixa o estilo `new-york`, conferido como o que ainda usa `@radix-ui/react-slot`

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Propósito**: o ponto único existir. Sem isto, nenhuma história tem o que consumir nem o que medir.

**⚠️ CRÍTICO**: nenhuma história começa antes desta fase terminar.

- [X] T003 Escrever os **tokens estáticos** em `app/globals.css`, sob `@theme`: rampa institucional, tinta e acento, neutros frios, tipografia, escala de texto, espaçamento e alturas, raios e sombras. Valores transcritos do documento 23 §1.3 (`FR-001`, `FR-005`, contrato vocabulário família 1)
- [X] T004 Escrever os **papéis do tema claro** em `app/globals.css`, sob `:root`: superfície, texto, borda, marca, foco, os **nove trios** de status e as oito séries de gráfico (`FR-002`, `FR-003`)
- [X] T005 Escrever os **papéis do modo noturno** em `app/globals.css`, sob `.dark`. ⚠️ **O trio inverte**: fundo escuro e pouco saturado, tinta clara. **Nunca** reaproveitar o pastel do tema claro — é o defeito que o `RF-DS-03` registra sobre a v1.0, e ele **passa** na aritmética de contraste enquanto fica ilegível na tela (`FR-013`)
- [X] T006 Expor os papéis como utilitário em `app/globals.css`, com `@theme inline` apontando para as variáveis, mais a variante `dark` na estratégia de classe. ⚠️ **Papel declarado fora do `inline` congela no tema claro** — é erro de sintaxe, não de gosto, e é a causa nº 1 de tema quebrado em Tailwind v4 (`FR-002`, data-model)
- [X] T007 Transcrever o contrato para `tests/unidade/vocabulario.fixture.ts`: a lista fechada de nomes de token e os **26 pares auditados** com seus limites. ⚠️ É esta lista que a auditoria percorre, **não** o arquivo de estilo — se lesse o estilo, um par novo entraria sem ser auditado e ninguém saberia (research R-3)

**Checkpoint**: o vocabulário existe e é legível por teste. Nada ainda o consome nem o verifica.

---

## Phase 3: US1 — A identidade visual muda num lugar só (P1) 🎯 MVP

**Meta**: acrescentar uma cor num lugar e vê-la valer em toda parte, com a regra impedindo que
qualquer cor entre por fora.

**Teste independente**: acrescentar uma cor semântica nova ao ponto único e observar, na vitrine,
que ela passa a valer sem edição em nenhum outro arquivo.

### Verificação primeiro

- [X] T008 [P] [US1] Escrever `tests/unidade/vocabulario.test.ts` provando a invariante **I-1**: todo token de papel declarado em `:root` tem contraparte em `.dark`, e o inverso. Falha nomeando o token órfão
- [X] T009 [P] [US1] Acrescentar ao mesmo arquivo a prova de que `app/globals.css` e `tests/unidade/vocabulario.fixture.ts` **não divergem** — token no estilo e ausente da lista reprova, e vice-versa (research R-3)

### A regra

- [X] T010 [US1] Acrescentar a `eslint.config.mjs` a regra de **cor escrita à mão** — hexadecimal, `rgb`, `rgba`, `hsl`, `hsla` — sobre rota e componente, com a mensagem que **ensina o token certo** e diz o que fazer quando falta um. Base pronta no documento 23 §9.3 (`FR-001` P-1, `FR-004`)
- [X] T011 [US1] Acrescentar a `eslint.config.mjs` a regra da **paleta padrão** — `text-gray-500`, `bg-slate-100` e afins. ⚠️ É a metade da regra que costuma escapar, e a decisão de 09/09/2026: `text-gray-500` é cor que **não vem do ponto único** (`FR-001` P-2, contrato verificação-de-cor)
- [X] T012 [US1] Escrever `tests/unidade/regra-de-cor.test.ts` provando que **as duas regras estão ativas**, com trechos sintéticos que devem reprovar (`FR-004`, `SC-002`). ⚠️ Regra de lint configurada e desligada por engano não acusa nada — foi assim que o Épico 0 provou a fronteira de `lib/dominio/`

### A dívida — cinco arquivos, nomeados

- [X] T013 [P] [US1] Trocar a cor literal por token em `app/error.tsx` (`FR-001` P-1, `SC-007`)
- [X] T014 [P] [US1] Trocar a cor literal por token em `app/loading.tsx` (`FR-001` P-1, `SC-007`) ✅ ⚠️ **Não tinha cor literal.** Tem `style={{}}` só com espaçamento. O `CLAUDE.md` contava 4 arquivos com cor literal; medido, são **2**
- [X] T015 [P] [US1] Trocar a cor literal por token em `app/not-found.tsx` (`FR-001` P-1, `SC-007`) ✅ ⚠️ **Idem à T014**: `style={{}}` só com espaçamento e tipografia, nenhuma cor
- [X] T016 [P] [US1] Trocar a cor literal por token em `components/faixa-de-ambiente.tsx` (`FR-001` P-1, `SC-007`)
- [X] T017 [US1] Trocar os **10 utilitários da paleta padrão** por token em `app/page.tsx`. ⚠️ Este arquivo **não constava de lista nenhuma** até 09/09/2026 — apareceu na medição da regra P-2 (`SC-007`)

### A vitrine

- [X] T018 [US1] Criar `app/estilo/page.tsx` exibindo **todo** o vocabulário: papéis, os nove trios de status, escala de texto, espaçamentos, raios e sombras. Sem `"use client"` (`FR-020`)
- [ ] T019 [US1] Escrever `tests/e2e/vitrine.spec.ts` provando a invariante **I-5**: **100%** dos tokens do contrato aparecem na vitrine. ⚠️ É o que impede token nascido morto — declarado, nunca visto, nunca conferido (`SC-009`)

- [ ] T019.1 [US1] Provar o `SC-001` **por defeito deliberado**, no molde da T012 e da T030: acrescentar um token de status novo ao ponto único mais o par auditado mais a amostra na vitrine, conferir que ele passa a valer **sem tocar em arquivo de tela ou de componente**, e desfazer. ⚠️ **Era o único critério de história P1 sem tarefa** — achado pela análise de consistência de 09/09/2026. ⚠️ E os **três** lugares do registro são o preço declarado pela regra 4 do contrato de vocabulário: é o que impede token nascido morto. O que o `SC-001` mede é o **consumo**, que custa zero

**Checkpoint**: a regra bloqueia, a dívida está paga, e existe onde ver o vocabulário. `pnpm lint`
sai 0 com o repositório inteiro.

---

## Phase 4: US2 — Tema claro e noturno, escolhidos e lembrados (P1)

**Meta**: a pessoa escolhe o tema, a escolha sobrevive, e a página não pisca.

**Teste independente**: na vitrine, alternar o tema, recarregar, abrir outra aba e conferir que a
escolha sobreviveu e que nenhum quadro mostrou o tema anterior.

- [X] T020 [US2] Criar `components/ciaara/provedor-de-tema.tsx` como **folha** com `"use client"`, encapsulando o provedor: estratégia de classe, padrão seguindo o sistema operacional, escolha manual prevalecendo, sem transição arrastada (`FR-006` a `FR-008`, `FR-010`)
- [X] T021 [US2] Ligar o provedor em `app/layout.tsx`. ⚠️ **O layout continua SEM `"use client"`** — o marcador contamina toda a subárvore e mandaria o catálogo de telas para o pacote do navegador. O `tsc` **não acusa**; só o build (research R-5, gotcha nº 1 do `CLAUDE.md`)
- [X] T022 [US2] Acrescentar `suppressHydrationWarning` ao elemento raiz em `app/layout.tsx`, **com o comentário do porquê**: a classe é escrita antes da hidratação, e sem isso o React acusa divergência entre servidor e cliente (`FR-009`, documento 23 §2.1)
- [X] T023 [US2] Criar `components/ciaara/seletor-tema.tsx` como **folha**, e usá-lo na vitrine. ⚠️ É o alternador **provisório desta fatia**: o definitivo entra no cabeçalho da fatia (c). A vitrine permanece (`FR-022`)
- [ ] T024 [US2] Escrever em `tests/e2e/tema.spec.ts` a persistência: escolher o noturno, recarregar, abrir outra aba, e afirmar que continua noturno (`FR-007`, `SC-003`)
- [ ] T025 [US2] Acrescentar a `tests/e2e/tema.spec.ts` os dois casos de precedência: sem escolha manual segue o sistema operacional; havendo escolha manual, ela prevalece (`FR-008`)
- [ ] T026 [US2] Acrescentar a `tests/e2e/tema.spec.ts` a asserção de **ausência de flash**, medindo a classe do elemento raiz **antes da hidratação**. ⚠️ **Não use captura de tela**: ela mede o estado final, que não é o que está em questão, e aprovaria o defeito. É a mesma armadilha do V-4 do Épico 3, que decidia por tempo (`FR-009`, `SC-004`, research R-1)
- [ ] T027 [US2] Acrescentar a `tests/e2e/tema.spec.ts` o caso de fronteira do **armazenamento indisponível**: a página cai para a preferência do sistema operacional, **sem quebrar e sem piscar**, e sem aviso — não é falha do usuário (Princípio V, casos de fronteira da spec)

**Checkpoint**: o tema funciona, persiste e não pisca — provado, não declarado.

---

## Phase 5: US3 — Dá para ler nos dois temas (P2)

**Meta**: nenhum par de cor abaixo do limite, nos dois temas, com o número visível.

**Teste independente**: rodar a auditoria e conferir que ela mede os 26 pares nos dois temas e falha
nomeando o par e a razão.

- [X] T028 [US3] Escrever `tests/unidade/contraste.test.ts` calculando a razão de cada um dos **26 pares** do contrato, nos **dois** temas — **52 asserções**. Limite 4,5:1 para texto sobre fundo, 3:1 para limite de componente (`FR-011`, `FR-012`, `SC-005`)
- [X] T029 [US3] Fazer a falha **nomear o par e a razão observada**, não apenas reprovar. ⚠️ Verificação que diz só "reprovou" obriga a refazer a conta à mão para descobrir onde — é a lição do `CHK008` (`FR-012`). ✅ A falha traz par, valores hexadecimais dos dois tokens, razão medida e limite
- [X] T030 [US3] Conferir a auditoria **por defeito deliberado**: escurecer um `-fundo` de status no ponto único, ver o teste reprovar nomeando aquele par, e desfazer. ⚠️ Auditoria nunca vista reprovando é carimbo, não medição (`FR-012`, `SC-005`) ✅ **Não precisou de defeito deliberado: ela reprovou de verdade na primeira execução**, em 23 das 52 asserções, nomeando cada par. A prova de que mede veio de graça
- [X] T031 [US3] Exibir na vitrine, ao lado de cada par, a **razão de contraste medida**, em `app/estilo/page.tsx`. ⚠️ O número na tela tem de ser o mesmo que o teste afere — é o que impede a auditoria de virar enfeite (`FR-021`)
- [ ] T032 [P] [US3] Conferir, olhando a vitrine no modo noturno, que **nenhum status reaproveita o pastel do tema claro** (`FR-013`, quickstart §5)
- [ ] T033 [P] [US3] Conferir que nenhum significado é comunicado **só** por cor: todo status na vitrine traz rótulo textual junto (`FR-014`)

**Checkpoint**: 52 asserções verdes, e a vitrine mostra os mesmos números.

---

## Phase 6: US4 — A tipografia é servida pelo próprio sistema (P3)

**Meta**: a tipografia institucional carrega sem pedir nada a ninguém.

**Teste independente**: carregar com o acesso a domínios externos bloqueado e conferir que a
tipografia continua correta.

**Nota**: os quatro arquivos e a licença **já estão versionados** em `public/fontes/` desde
09/09/2026, com a assinatura conferida. Falta ligá-los.

- [X] T034 [US4] Declarar a tipografia auto-hospedada em `app/layout.tsx`, com os quatro pesos e a pilha de reserva, expondo a variável que a tipografia do `@theme` consome (`FR-015`)
- [ ] T035 [US4] Escrever em `tests/e2e/tipografia.spec.ts` a prova de que **nenhuma requisição a domínio externo** acontece ao carregar. ⚠️ Na v2.0 a fonte vinha por CDN, e é isso que quebraria a impressão, que não pode depender de rede na hora de imprimir (`SC-006`)

**Checkpoint**: a tipografia é do sistema, e a prova não depende de ninguém lembrar de olhar.

---

## Phase 7: Componentes base e a reconciliação

**Propósito**: provar o encanamento do shadcn **uma vez**, com o casamento de variáveis escrito.

⚠️ **Esta fase não pertence a nenhuma história porque atravessa as quatro.** É o que a fatia (b) vai
herdar pronto ou vai ter de descobrir sozinha, sob pressão.

- [ ] T036 [P] Copiar o componente **botão** para `components/ui/` (`FR-017`)
- [ ] T037 [P] Copiar o componente **cartão** para `components/ui/` (`FR-017`)
- [ ] T038 [P] Copiar o componente **tabela** para `components/ui/` (`FR-017`)
- [ ] T039 [P] Copiar o componente **emblema** para `components/ui/` (`FR-017`)
- [ ] T040 Casar as **14 variáveis** de cor do shadcn com os tokens CIAARA em `app/globals.css`, seguindo `contracts/reconciliacao-shadcn.md`. ⚠️ **`destructive` NÃO é `atrasado`**: vermelho é conflito, que exige ação, e amarelo é aviso. Trocar os dois não acusaria erro nenhum e faria um botão de desativar parecer aviso de atraso (`FR-018`)
- [ ] T041 Escrever em `tests/unidade/vocabulario.test.ts` a invariante **I-4**: **zero** variáveis do shadcn sem par declarado com um token CIAARA. Variável nova, vinda com componente novo, **reprova até ser casada** (`SC-010`)
- [ ] T041.1 Escrever a verificação do `FR-019` sobre as dependências declaradas do `package.json`: **nenhuma biblioteca de componentes além da decidida**. ⚠️ Proibição do BRIEF §1 que até 09/09/2026 **não tinha portão** — e proibição sem portão é conselho. Uma biblioteca entra num dia de pressa, e depois de duas telas usarem-na tirá-la vira retrabalho, não decisão
- [ ] T042 Exibir os quatro componentes na vitrine, em `app/estilo/page.tsx`, pintados pelos tokens CIAARA e não pelas cores próprias deles (`FR-017`, `FR-018`, quickstart §5)

**Checkpoint**: a fatia (b) pode copiar os catorze primitivos restantes sabendo exatamente o que fazer.

---

## Phase 8: Polish e travessias

- [ ] T043 [P] Conferir que **nenhum** `page.tsx` ou `layout.tsx` abre com `"use client"`, arquivo a arquivo e não por busca de texto. ⚠️ A busca por texto acusa comentário: `app/(app)/layout.tsx` cita o marcador num comentário que explica por que ele **não** está ali (Princípio III, `CLAUDE.md`)
- [ ] T044 [P] Conferir que a exceção de impressão **não foi usada** — ela é prevista, e a rota não existe ainda (contrato verificação-de-cor)
- [ ] T045 Atualizar o *Estado atual* do `CLAUDE.md`: a dívida de estilo cai de **nove para cinco** arquivos, e as cinco telas do Épico 3 são o que sobra, para a fatia (c)
- [ ] T046 Rodar `pnpm verificar:tudo`, confirmar que ele e o CI dão **veredito idêntico** sobre o mesmo commit (`SC-008`), e abrir o PR com o template inteiro preenchido

---

## Dependências

```
Fase 1 (Setup)
   └── Fase 2 (Tokens no ponto único) ──┬── Fase 3 (US1) ──┬── Fase 5 (US3)
                                        │                  └── Fase 7 (componentes)
                                        ├── Fase 4 (US2)
                                        └── Fase 6 (US4)

Fase 8 (Polish) ── depois de tudo.
```

| Dependência | Por quê |
|---|---|
| **⚠️ Ponta a ponta → PR do `fix/EPICO-3-fechar-espelho-e-CHK008`** | **Dependência externa a esta fatia, e é decisão de Bernardo.** Aquele PR conserta a corrida do arquivo de telemetria que fez a suíte reprovar **2 de 3 execuções**, em testes diferentes a cada vez. Esta fatia acrescenta **três** arquivos de ponta a ponta (T019, T024–T027, T035) e multiplica a exposição. Mesclar antes da US2, ou conviver com reexecução |
| Fase 2 → todas | Sem token não há o que consumir nem o que medir |
| US1 → US3 | A auditoria de contraste mede os pares que a US1 transcreveu e conferiu |
| US1 → Fase 7 | A vitrine precisa existir antes de exibir componente nela |
| US2 ⟂ US1 | Independentes tecnicamente. A US2 usa a vitrine, mas só como lugar de clicar |
| US4 ⟂ tudo | Só tipografia. Pode ser feita e mesclada sozinha |

## Paralelismo

| Podem correr juntas | Por quê |
|---|---|
| T008, T009 | Dois testes, arquivos distintos |
| T013 – T016 | Quatro arquivos de dívida, sem relação entre si |
| T032, T033 | Duas conferências visuais independentes |
| T036 – T039 | Quatro componentes copiados, arquivos distintos |
| T043, T044 | Duas travessias independentes |

⚠️ **T010 e T011 NÃO são paralelas**: as duas editam `eslint.config.mjs`.
⚠️ **T024 a T027 NÃO são paralelas**: as quatro editam `tests/e2e/tema.spec.ts`.

## Estratégia

**MVP = Fase 1 + Fase 2 + US1 + US2.** As duas são P1 e entregam junto o que o épico promete: a
mudança num lugar só, e o tema que a pessoa escolhe. A US3 fecha a promessa de legibilidade e a US4
é pequena e independente.

Ordem sugerida de entrega, em três PRs:

1. **Fases 1, 2 e US1** — o ponto único, a regra bloqueante e a dívida paga. É a maior e a que
   destrava tudo.
2. **US2 + US4** — tema e tipografia. As duas mexem em `app/layout.tsx`, então andam juntas para
   não conflitar.
3. **US3 + Fase 7 + Polish** — auditoria, componentes base e o fechamento.

⚠️ **Não entregar a US1 sem a regra de lint ativa.** Um ponto único que ninguém é obrigado a usar
volta a ser convenção — e convenção é exatamente o que o objeto `UI` da v2.0 era.
