---
description: "Lista de tarefas — Épico 4, fatia (c): shell de navegação e estado na URL"
---

# Tarefas: Épico 4, fatia (c) — shell de navegação e estado na URL

**Entrada**: [spec.md](./spec.md) · [plan.md](./plan.md) · [research.md](./research.md) ·
[data-model.md](./data-model.md) · [contracts/](./contracts/) · [quickstart.md](./quickstart.md)

**Formato**: `[ID] [P?] [História] Descrição com o caminho do arquivo`
· **[P]** = pode ir em paralelo (arquivo diferente, sem dependência pendente)

**Testes**: **incluídos**, e não por opção. A *Definition of Done* do projeto exige Vitest em toda
função pura tocada e Playwright no percurso principal.

---

## ⚠️ A ordem começa com uma correção, não com a fatia

A Fase 2 abre com um **defeito de segurança já mesclado na `main`**, encontrado ao ler o código do
Épico 3 durante o planejamento: a guarda do destino após o login é `startsWith("/")`, e um endereço
relativo ao protocolo passa por ela ([research §R-5](./research.md)).

**Ele não é pré-requisito das outras histórias.** Está na fundação porque é correção, e correção não
espera funcionalidade.

---

## Fase 1 — Preparação

- [ ] T001 Instalar `nuqs` e registrá-lo em `package.json` (`FR-001`, research §R-2)
- [ ] T002 [P] Estender `tests/unidade/dependencias.test.ts` com controle positivo para `nuqs` — presença declarada, para que a remoção acidental reprove
- [ ] T003 Conferir **na prática** que a biblioteca funciona nesta versão do arcabouço, com um percurso mínimo em `tests/e2e/estado-na-url.spec.ts` ⚠️ **os pares declaram `next >=14.2.0`, o que não exclui a 16 nem a afirma** — foi assim que a fatia (b) recebeu uma base de componentes diferente da decidida, com a tela idêntica
- [ ] T004 [P] Versionar o brasão de tela em `public/marca/brasao-ciaara.png`, renomeado sem acento e sem espaço (`FR-032`, `FR-032.2`)
- [ ] T005 [P] Versionar o brasão de impressão em `public/marca/brasao-ciaara-impressao.png` (`FR-032.1`) ⚠️ **226 KB contra 6,3 MB** — o de impressão nunca vai para o cabeçalho
- [ ] T006 [P] Escrever `public/marca/PROCEDENCIA.md` com origem e data, como a fatia (a) fez com a tipografia (`FR-032`)
- [ ] T007 Emendar `docs/fase-2/25-Camada-de-Dados-e-Estado.md` §1.3 acrescentando `modalidade` à rota `/inicio` (`FR-001.1`) ⚠️ **é emenda de documento normativo**: só a linha que faltava, para alinhá-lo ao `RF-INI-02`, que é **[PRESERVADO]**

**Ponto de conferência**: `pnpm verificar` sai 0, e os dois arquivos de imagem saíram de `images/`.

---

## Fase 2 — Fundação (bloqueia todas as histórias)

⚠️ **Nada das Fases 3 em diante começa antes desta fase fechar.**

### A correção de segurança, primeiro

- [ ] T008 Escrever `lib/navegacao/destino-seguro.ts` — resolve o destino contra a origem da própria aplicação e **recusa** o que não for dela (`FR-042`)
- [ ] T009 [P] Escrever `tests/unidade/destino-seguro.test.ts` — relativo ao protocolo, variante com contrabarra, absoluto com outro domínio, e o caminho interno legítimo que **precisa passar**
- [ ] T010 Trocar a guarda de `app/(auth)/login/FormularioDeLogin.tsx` por `destinoSeguro` ⚠️ **a guarda atual é `startsWith("/")`**, e um endereço com duas barras começa com barra
- [ ] T011 Escrever `tests/e2e/destino-do-login.spec.ts` medindo **onde o navegador parou**, e não o que a função devolveu ⚠️ **asserção sobre a condição passaria com o código de hoje**, que é o que tem o defeito
- [ ] T012 **Conferir a T011 por defeito deliberado**: repor `startsWith("/")` em `app/(auth)/login/FormularioDeLogin.tsx`, provar que o teste reprova, desfazer ⚠️ **portão nunca visto reprovando é afirmação, não prova**

### O contrato de parâmetros

- [ ] T013 Escrever `lib/navegacao/contrato.ts` com as rotas desta fatia, cada parâmetro trazendo tipo, padrão, política de histórico, aviso ao servidor e `RF-` de origem (`FR-001` a `FR-005`)
- [ ] T014 Escrever `lib/navegacao/esquema.ts` — validação por esquema na leitura, com degradação para o padrão (`FR-006`, `FR-007`, `FR-041`)
- [ ] T015 [P] Escrever `tests/unidade/contrato-de-parametros.test.ts` — todo parâmetro tem os cinco campos, e **a origem aponta para um `RF-` que existe**
- [ ] T016 [P] Escrever `tests/unidade/esquema-de-parametros.test.ts` — degradação nos quatro tipos, **lista degradando por item** e os demais parâmetros preservados (`FR-006`)
- [ ] T017 Fazer o parâmetro fora do contrato **não compilar** em `lib/navegacao/contrato.ts` ⚠️ **é o que separa isto da tabela que existe desde a Fase 2 e que ninguém era obrigado a seguir**

**Ponto de conferência**: `pnpm test:unidade` verde, e o defeito da `main` corrigido e provado.

---

## Fase 3 — História 1 (P1): a URL é o estado, e o link funciona

**Meta**: os quatro comportamentos que a v2.0 não conseguia entregar passam a existir.

**Teste independente**: colar uma URL com recorte numa aba nova e cair na tela exata, sem passar por
outra.

- [ ] T018 [US1] Escrever `lib/navegacao/usar-parametro.ts` — lê e escreve pelo contrato, aplicando a política de histórico e o aviso ao servidor (`FR-004`, `FR-004.1`)
- [ ] T019 [US1] Aplicar o limite de frequência de **300 ms** à busca em `lib/navegacao/usar-parametro.ts` (`FR-005`) ⚠️ **o número vivia num exemplo de código do documento 25 §1.5**, não numa regra
- [ ] T020 [US1] Fazer o parâmetro no valor padrão **sumir da URL** em `lib/navegacao/usar-parametro.ts` (`FR-002`)
- [ ] T021 [US1] Completar o retorno após a autenticação preservando **os parâmetros** em `app/(auth)/login/page.tsx` e `FormularioDeLogin.tsx` (`FR-027`) ⚠️ **a metade de ida já existe e está certa** — o proxy do Épico 3 guarda caminho e consulta
- [ ] T022 [P] [US1] Escrever `tests/e2e/estado-na-url.spec.ts` cobrindo link direto, histórico um passo por vez, recarga e parâmetro padrão ausente (`FR-023`, `FR-024`, `FR-026`)
- [ ] T023 [P] [US1] Cobrir em `tests/e2e/estado-na-url.spec.ts` que **o número na tela muda** ao trocar o filtro ⚠️ **é o teste que não se faz por atributo**: um que confira só a URL passa com o aviso ao servidor desligado, que é o defeito que ele deveria pegar
- [ ] T024 [P] [US1] Cobrir em `tests/e2e/estado-na-url.spec.ts` que oito teclas digitadas produzem **uma** entrada de histórico (`SC-014`)
- [ ] T025 [P] [US1] Cobrir em `tests/e2e/estado-na-url.spec.ts` o link compartilhado entre **dois perfis de escopos diferentes** (`FR-025`) ⚠️ **quem nega é o banco**, e é isso que faz o link não vazar
- [ ] T026 [US1] Acrescentar em `specs/008-shell-e-estado-na-url/contracts/parametros.md` o registro do que ficou exercitado e do que espera as telas dos Épicos 5 a 9

**Ponto de conferência**: o passo 2 do [quickstart](./quickstart.md) inteiro, na mão.

---

## Fase 4 — História 2 (P1): a tabela densa entrega o recorte a quem chama

**Meta**: a única divergência conhecida entre o que a fatia (b) entregou e o que o documento 25
prescreve deixa de existir.

**Teste independente**: montar a tabela com ordenação e filtro vindos de fora, mudá-los por fora, e
ver a tabela acompanhar.

- [ ] T027 [US2] Acrescentar `ordem` e `aoOrdenar` como propriedades **opcionais** em `components/ciaara/tabela-densa.tsx` (`FR-012`, `FR-012.1`)
- [ ] T028 [US2] Acrescentar `busca` e `aoBuscar` como propriedades **opcionais** em `components/ciaara/tabela-densa.tsx` (`FR-012`)
- [ ] T029 [US2] Garantir **fonte única** em `components/ciaara/tabela-densa.tsx`: a presença da propriedade decide quem manda ⚠️ **aceitar as duas ao mesmo tempo faz elas divergirem no primeiro clique** — é a armadilha conhecida deste padrão
- [ ] T030 [P] [US2] Escrever `tests/unidade/tabela-densa-controlada.test.ts` provando os dois modos, controlado e não controlado
- [ ] T031 [US2] **Provar não regressão**: rodar `pnpm test:e2e tests/e2e/vitrine.spec.ts` e `pnpm test:unidade` **sem alterar um teste sequer** da fatia (b) (`SC-010`) ⚠️ **se algum precisou mudar, a propriedade não era opcional de verdade**
- [ ] T032 [US2] Acrescentar em `app/estilo/amostras.tsx` uma amostra da tabela **controlada**, com o recorte vindo da URL

**Ponto de conferência**: a suíte da fatia (b) verde, sem edição.

---

## Fase 5 — História 3 (P2): o shell existe, e a pessoa sabe onde está

**Meta**: depois de entrar, a pessoa deixa de cair numa página sem um único link.

**Teste independente**: entrar e alcançar qualquer tela existente sem digitar URL.

- [ ] T033 [US3] Escrever `components/shell/casca-do-app.tsx` — **sem** marcador de cliente (`FR-019`, contrato de shell)
- [ ] T034 [US3] Escrever `components/shell/cabecalho-do-app.tsx` com o brasão de tela e o alternador (`FR-032.1`) — **sem** marcador de cliente
- [ ] T035 [US3] Escrever `components/shell/navegacao-lateral.tsx` — marcador de cliente **apenas** no abrir e fechar de tela estreita (`FR-019`) ⚠️ **um marcador na casca manda todas as telas para o navegador**, e o erro não aparece na checagem de tipos
- [ ] T036 [US3] Derivar a lista de entradas em `lib/navegacao/menu.ts`, com a subtração do `RF-CURSO-02` aplicada ⚠️ **Avaliações e Relatório têm rota própria e ficam FORA do menu**
- [ ] T037 [US3] Montar a casca em `app/(app)/layout.tsx`, **substituindo** o cabeçalho provisório do Épico 3 (`FR-018`)
- [ ] T038 [US3] Remover o alternador de tema de `app/estilo/page.tsx` (`FR-018`) ⚠️ **substituição, não duplicação** — dois alternadores é o que o `CHK019` previu
- [ ] T039 [US3] Implementar a acessibilidade da navegação em `components/shell/casca-do-app.tsx` e `navegacao-lateral.tsx`: marco anunciado, atalho para pular ao conteúdo, destino de foco ao trocar de rota (`FR-021`)
- [ ] T040 [US3] Criar `loading.tsx` e `error.tsx` nos segmentos de `app/(app)/` (`FR-020`, `RN-DEG-01`)
- [ ] T041 [P] [US3] Escrever `tests/e2e/shell.spec.ts` provando que **toda tela existente é alcançável sem digitar URL** (`SC-002`, `SC-003`)
- [ ] T042 [P] [US3] Cobrir em `tests/e2e/acessibilidade.spec.ts` o atalho para o conteúdo, o marco de navegação e o foco ao trocar de rota (`FR-021`)
- [ ] T043 [US3] Aplicar o vocabulário visual da fatia (a) às cinco telas do Épico 3, em `app/(auth)/` e `app/(app)/admin/` (`FR-022`)
- [ ] T044 [US3] Acrescentar os três componentes de shell ao inventário de `docs/fase-2/23-Design-System-Tailwind-shadcn.md` §3.1, com arquivo, base e fronteira (`FR-015`) ⚠️ **é emenda de documento normativo**, e fica registrado que o inventário passa a descrever casca além de vocabulário
- [ ] T045 [US3] Submeter o rascunho de `specs/008-shell-e-estado-na-url/contracts/shell.md` a Bernardo e registrar a validação contra a v2.0 (`FR-017.1`) ⚠️ **sem isto o `FR-017` não é verificável**, e as três perguntas do rascunho continuam sem resposta

**Ponto de conferência**: o passo 5 do [quickstart](./quickstart.md), que só Bernardo faz.

---

## Fase 6 — História 4 (P2): a tela Início deixa de ser um beco

**Meta**: existe para onde ir depois de entrar, e o recorte vive na URL.

**Teste independente**: entrar e, sem digitar URL, ver o panorama e alcançar uma turma.

- [ ] T046 [US4] Escrever `app/(app)/inicio/page.tsx` com o **progresso por turma** que o dado atual sustenta (`FR-028`)
- [ ] T047 [US4] Ligar o recorte por `classificacao` e `modalidade` ao contrato, em `app/(app)/inicio/page.tsx` (`FR-029`, `FR-001.1`)
- [ ] T048 [US4] Fazer cada turma ser ponto de entrada para a sua tela em `app/(app)/inicio/page.tsx` (`FR-030`)
- [ ] T049 [US4] Reservar a região de alertas, sempre visível, em `app/(app)/inicio/page.tsx` (`FR-031`) ⚠️ **a região entra; os predicados são dos Épicos 5 a 9**
- [ ] T050 [US4] Implementar o estado **"ainda não existe no sistema"** em `app/(app)/inicio/page.tsx` (`FR-033`) ⚠️ **é um terceiro caso**, nem *"não há"* nem *"você não vê"* — e é o único dos três que some sozinho com o tempo
- [ ] T051 [US4] Fazer `app/page.tsx` levar à tela inicial em vez de ser um beco
- [ ] T052 [P] [US4] Escrever `tests/e2e/inicio.spec.ts` cobrindo panorama, recorte na URL e entrada para a turma
- [ ] T053 [P] [US4] Cobrir em `tests/e2e/inicio.spec.ts` o escopo por perfil: dois usuários, e o banco negando (`FR-026` da spec, Princípio XI)

**Ponto de conferência**: entrar no sistema e chegar a uma turma sem tocar na barra de endereço.

---

## Fase 7 — História 5 (P3): URL errada não quebra, URL hostil não é usada

**Meta**: a barra de endereço passa a ser tratada como o que é — entrada de usuário.

**Teste independente**: editar a URL à mão, primeiro com valores impossíveis e depois com carga
hostil.

- [ ] T054 [US5] Aplicar a degradação do esquema nas rotas desta fatia, em `app/(app)/inicio/page.tsx` (`FR-006`, `FR-007`)
- [ ] T055 [P] [US5] Escrever `tests/e2e/url-degradada.spec.ts` cobrindo os quatro casos: valor fora do domínio, parâmetro fora do contrato, par incompleto e tudo inválido de uma vez
- [ ] T056 [P] [US5] Escrever `tests/e2e/url-hostil.spec.ts` cobrindo os **três vetores** do [contrato de segurança](./contracts/seguranca-da-url.md): saída do domínio, valor chegando a filtro de consulta, valor chegando a interpolação de marcação (`FR-043`)
- [ ] T057 [US5] Conferir em `tests/e2e/url-degradada.spec.ts` que o identificador fora de escopo distingue *"não há"* de *"você não vê"* (`FR-008`)

⚠️ **Cinco casos degradam; um recusa.** O que recusa é o destino do login, e ele já foi na Fase 2 —
está aqui só por pertencer a esta história.

---

## Fase 8 — Fechamento

- [ ] T058 Escrever `docs/guias/estado-na-url.md` — como uma tela nova declara, lê e escreve seus parâmetros, **com exemplo executável** (`FR-044`) ⚠️ **é o requisito que decide se o contrato vale alguma coisa**
- [ ] T059 Fechar os itens correspondentes em `specs/007-componentes-ciaara/checklists/navegacao-e-estado.md`, **cada um apontando pelo número o requisito que o fecha** (`SC-016`)
- [ ] T060 Fechar em `specs/005-design-system-tokens-e-tema/checklists/acessibilidade-e-entrega.md` os itens que esta fatia resolve — `CHK019` a `CHK025` (`SC-016`)
- [ ] T061 Escrever `tests/unidade/fronteira-shell.test.ts` — zero componente de `components/shell/` acessando banco ou implementando regra `RN-`, e marcador de cliente só onde o contrato declara (`FR-019`, `FR-036`)
- [ ] T062 Escrever `tests/unidade/sem-contexto-de-navegacao.test.ts` — **zero** contêiner de contexto usado como fonte de verdade de navegação (`FR-011.1`, `SC-022`)
- [ ] T063 Conferir que a regra de `eslint.config.mjs` continua em **zero violações** no repositório inteiro, com `components/shell/` incluído (`FR-037`, `SC-013`)
- [ ] T064 Atualizar a seção *Estado atual e onde retomar* do `CLAUDE.md` com o resultado **medido** da fatia ⚠️ **medido, não declarado**
- [ ] T065 Rodar `pnpm verificar:tudo` na raiz do repositório e conferir que sai **0** (`SC-015`)
- [ ] T066 Abrir o PR preenchendo `.github/pull_request_template.md` inteiro ⚠️ **e o achado de segurança precisa aparecer no corpo**, porque ele corrige código que já estava mesclado — plano de reversão é `git revert`, sem migration

---

## Dependências entre as fases

```text
Fase 1 (preparação)
   └─> Fase 2 (fundação: segurança + contrato) ──┬─> Fase 3 · US1 (P1)
                                                 ├─> Fase 4 · US2 (P1)  independente das demais
                                                 ├─> Fase 5 · US3 (P2)
                                                 │      └─> Fase 6 · US4 (P2)  precisa do shell
                                                 └─> Fase 7 · US5 (P3)
                                                            └─> Fase 8 (fechamento)
```

| História | Depende de | Por quê |
|---|---|---|
| US1 | Fase 2 | o contrato e o esquema |
| US2 | Fase 2 (só o contrato) | é o componente aceitando estado por fora; não depende de shell |
| US3 | Fase 2 | a lista de entradas usa o contrato de rotas |
| US4 | **US3** | a tela precisa da casca para ser alcançada |
| US5 | Fase 2, **US4** | a degradação se exercita sobre a tela que tem recorte |

⚠️ **US2 é a única que pode ir junto com a US1 do começo ao fim.** Ela toca um arquivo que nenhuma
outra história toca, e a prova dela é a suíte de outra fatia continuar verde.

---

## O que dá para fazer em paralelo

**Na Fase 1**, T004, T005 e T006 são três arquivos independentes, e a T002 não depende de nenhum.

**Na Fase 2**, a correção de segurança (T008 a T012) e o contrato (T013 a T017) **não se tocam**.
São duas pessoas, ou duas sessões, sem conflito.

**Entre histórias**: US1 e US2 correm juntas. US3 pode começar junto, e só a US4 precisa esperar.

---

## Escopo mínimo entregável

**Fase 2 sozinha já vale a pena, e é o único caso deste projeto em que isso acontece.** Ela corrige
um defeito de segurança que está na `main` hoje, e essa correção não depende de mais nada.

**Depois dela, US1 + US3.** Juntas entregam o que o épico prometeu: a URL como ponto de verdade e um
lugar para ir. Sem a US3 a navegação existe e ninguém alcança; sem a US1 o shell existe e o link não
funciona.

⚠️ **A US4 parece o entregável mais visível e não é o mínimo.** Uma tela inicial bonita sem os quatro
comportamentos é a v2.0 com outra aparência.

---

## Contagem

| Fase | Tarefas | Testes |
|---|---|---|
| 1 · preparação | 7 | 1 |
| 2 · fundação | 10 | 4 |
| 3 · US1 | 9 | 4 |
| 4 · US2 | 6 | 2 |
| 5 · US3 | 13 | 2 |
| 6 · US4 | 8 | 2 |
| 7 · US5 | 4 | 3 |
| 8 · fechamento | 9 | 2 |
| **Total** | **66** | **20** |

**Bloqueadas: nenhuma.** A T045 depende de Bernardo, e é a única que não fecha sozinha.

⚠️ **Três tarefas existem por causa de achados, não de requisitos originais**: a T007 (emenda ao
documento 25), a T044 (emenda ao inventário) e o bloco T008–T012 (o redirecionamento aberto). **As
três vieram de ler o que já existia**, e nenhuma delas estava no pedido.
