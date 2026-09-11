# Tarefas: Épico 4, fatia (b) — Componentes CIAARA

**Entrada**: [spec.md](./spec.md) · [plan.md](./plan.md) · [research.md](./research.md) ·
[data-model.md](./data-model.md) · [contracts/](./contracts/) · [quickstart.md](./quickstart.md)

**Formato**: `[ID] [P?] [História] Descrição com o caminho do arquivo`
· **[P]** = pode ir em paralelo (arquivo diferente, sem dependência pendente)

**Testes**: **incluídos**, e não por opção. A *Definition of Done* do projeto exige Vitest em toda
função de `lib/dominio/` tocada e Playwright no percurso principal.

---

## ⛔ Bloqueio a resolver ANTES da Fase 4

**O `FR-012` contradiz o `RF-INSTR-15`** — achado P-1 do plano. A spec manda
`P/G Especialidade Nome de Guerra`; o documento normativo, que é **[PRESERVADO]**, manda
`P/G Especialidade/Habilitação Nome Completo` **com as palavras do nome de guerra em negrito**. A
diferença não é de estilo: a minha versão **descarta o nome completo**.

A **T030** e a **T031** estão marcadas como bloqueadas. Tudo o mais pode andar.

---

## Fase 1 — Preparação

- [ ] T001 Instalar a biblioteca de gráficos decidida no BRIEF §1 e registrá-la em `package.json`
- [ ] T002 Instalar a biblioteca de ícones que o `components.json` já declara em `iconLibrary`, e registrá-la em `package.json` (`FR-003.1`)
- [ ] T003 Estender `tests/unidade/dependencias.test.ts` com controle positivo para as duas bibliotecas novas — presença declarada, para que a remoção acidental reprove (`FR-003`)
- [ ] T004 Registrar em `docs/fase-2/23-Design-System-Tailwind-shadcn.md` que a pendência §11.2 está fechada, apontando o `FR-003.1` ⚠️ **é emenda de documento normativo: só o registro do fechamento, sem tocar em regra**

**Ponto de conferência**: `pnpm test:unidade` verde, e `pnpm verificar` continua saindo 0.

---

## Fase 2 — Fundação (bloqueia todas as histórias)

⚠️ **Nada das Fases 3 em diante começa antes desta fase fechar.**

### Os primitivos, com a reconciliação crescendo junto

- [ ] T005 [P] Copiar o primitivo de campo de texto para `components/ui/input.tsx`
- [ ] T006 [P] Copiar o primitivo de rótulo para `components/ui/label.tsx`
- [ ] T007 [P] Copiar o primitivo de silhueta de carregamento para `components/ui/skeleton.tsx`
- [ ] T008 [P] Copiar o primitivo de aviso para `components/ui/alert.tsx`
- [ ] T009 [P] Copiar o primitivo de seleção para `components/ui/select.tsx`
- [ ] T010 [P] Copiar o primitivo de painel flutuante para `components/ui/popover.tsx`
- [ ] T011 [P] Copiar o primitivo de dica ao apontar para `components/ui/tooltip.tsx`
- [ ] T012 [P] Copiar o primitivo de diálogo para `components/ui/dialog.tsx`
- [ ] T013 [P] Copiar o primitivo de diálogo de confirmação para `components/ui/alert-dialog.tsx`
- [ ] T014 [P] Copiar o primitivo recolhível para `components/ui/collapsible.tsx`
- [ ] T015 Estender a reconciliação em `app/globals.css` com **toda** variável de cor que os dez primitivos trouxerem, apontando para token CIAARA (`FR-002`)
- [ ] T016 Estender `lib/design/vocabulario.ts` com os pares novos da reconciliação, e `tests/unidade/vocabulario.test.ts` para que a invariante de **zero variável órfã** cubra os dez (`SC-004`)

⚠️ **A T015 é onde o primitivo tenta trazer o próprio vocabulário de cor.** O teste da T016 é o que
impede — e ele já provou o próprio valor na fatia (a).

### O tipo do vocabulário

- [ ] T017 Derivar o tipo de tom de `STATUS` em `lib/design/vocabulario.ts` com `typeof … [number]`, sem redeclarar a lista ⚠️ **derivar, não copiar: status novo tem de quebrar a compilação de quem não o tratou**

### A navegação por teclado, uma vez só

- [ ] T018 Escrever `components/ciaara/lista-navegavel.tsx` com *roving tabindex*, nas duas dimensões, conforme [contracts/teclado.md](./contracts/teclado.md)
- [ ] T019 [P] Escrever `tests/e2e/teclado.spec.ts` cobrindo as seis teclas do documento 23 §8.3 e os cinco casos de fronteira do contrato

⚠️ **A T018 vem antes dos dois componentes que dependem dela.** Fazê-la depois significaria
implementá-la duas vezes, e duas navegações por teclado divergem — que é o defeito que esta fatia
veio fechar, só que em teclado em vez de cor.

**Ponto de conferência**: `pnpm verificar` 0, zero variável órfã, e o teclado da lista navegável
passa isolado.

---

## Fase 3 — História 1 (P1): quem constrói tela não reinventa o vocabulário

**Meta**: os componentes sem regra de negócio existem, tipados, e aparecem na vitrine.

**Teste independente**: abrir `/estilo` e encontrar cada um destes com exemplo, nos dois temas.

- [ ] T020 [P] [US1] Escrever `components/ciaara/card-kpi.tsx` — número grande, rótulo, unidade, variação com sentido declarado (`FR-004`)
- [ ] T021 [P] [US1] Escrever `components/ciaara/badge-status.tsx` com os nove tons por `cva` e **rótulo textual obrigatório no tipo** (`FR-005`, `FR-025`)
- [ ] T022 [P] [US1] Escrever `components/ciaara/campo-obrigatorio.tsx`, com o traço do campo em `--texto-tenue` e a obrigatoriedade no atributo que o leitor de tela lê (`FR-014`, `FR-032`)
- [ ] T023 [P] [US1] Escrever `components/ciaara/esqueleto-tabela.tsx`, com a silhueta no formato do conteúdo real e sem pulsação para quem pediu menos movimento (`FR-014`, `FR-029`)
- [ ] T024 [P] [US1] Escrever `components/ciaara/dialogo-confirmacao.tsx` com foco preso e retorno de foco ao fechar (`FR-013`)
- [ ] T025 [US1] Revisar `components/ciaara/EstadoVazio.tsx` para consumir o vocabulário e **distinguir *"não há"* de *"você não vê"*** (`FR-015`)
- [ ] T026 [US1] Escrever `components/ciaara/filtro-avancado.tsx` — genérico, recolhível, com contagem por opção, **sem conhecer nenhum domínio** (`FR-007`)
- [ ] T027 [US1] Acrescentar em `app/estilo/page.tsx` a amostra de cada componente desta história (`FR-027`)
- [ ] T028 [P] [US1] Escrever `tests/unidade/filtro-avancado.test.ts` provando que a filtragem cruzada é do chamador: o componente exibe a contagem que recebe e não a recalcula
- [ ] T029 [P] [US1] Estender `tests/unidade/contraste.test.ts` com o par `--texto-tenue` sobre o preenchimento do campo, nos dois temas (`FR-032.1`, `SC-005`)

⚠️ **T026 é o teste de que a fatia entregou vocabulário e não uma tela disfarçada de componente.**
Se para atender a spec 006 for preciso escrever a palavra "instrutor" dentro dele, o componente
está errado.

**Ponto de conferência**: os sete componentes na vitrine, `pnpm verificar` 0.

---

## Fase 4 — História 2 (P1): o seletor de instrutor é um só, em todo lugar

**Meta**: a `RN-ANT-01`, de *Risco: Alto*, deixa de depender de alguém lembrar.

**Teste independente**: entregar ao seletor uma lista **fora de ordem** e ver que ela aparece
ordenada mesmo assim.

- [ ] T030 ⛔ **BLOQUEADA** [US2] Escrever `lib/dominio/nome-instrutor.ts` — porte do algoritmo da spec 020 da v2.0, marcação **palavra a palavra** dentro do nome completo, com o `RF-` e a citação literal no topo ⚠️ **depende da decisão do P-1**: `FR-012` e `RF-INSTR-15` mandam formatos diferentes
- [ ] T031 ⛔ **BLOQUEADA** [US2] Escrever `components/ciaara/nome-instrutor.tsx`, **sem** marcador de cliente, porque as rotas de impressão dos Épicos 10 e 11 vão consumi-lo (`FR-012`, `RF-DS-05`)
- [ ] T032 [P] [US2] Escrever `tests/unidade/nome-instrutor.test.ts` com os quatro casos do [research.md §R-8](./research.md): contíguo, **não contíguo**, palavra sem correspondência (sem destaque, **sem exceção**) e sem nome de guerra (sem espaço duplo)
- [ ] T033 [US2] Escrever `lib/dominio/antiguidade.ts` — peso por P/G **recebido como argumento**, ordenação crescente, empate por nome, com o `RN-ANT-01` e a citação literal no topo (`RN-ANT-02`, Princípio VII)
- [ ] T034 [P] [US2] Escrever `tests/unidade/antiguidade.test.ts` cobrindo os doze postos, o empate e o **posto desconhecido, que vai para o fim com aviso e nunca some** (`RN-DEG-01`)
- [ ] T035 [US2] Escrever `components/ciaara/seletor-turma.tsx` sobre o primitivo de seleção — 29 turmas não pedem busca — **sem exibir identificador técnico** (`FR-010`, `FR-027.3` da spec 006)
- [ ] T036 [US2] Escrever `components/ciaara/seletor-instrutor.tsx` sobre painel flutuante mais a lista navegável da T018, com busca (`FR-010`)
- [ ] T037 [US2] Fazer o seletor **aplicar** a ordenação da T033 **ignorando a ordem de chegada** (`FR-011.1`)
- [ ] T038 [P] [US2] Escrever `tests/unidade/seletor-unico.test.ts` — contagem de construtores de seletor de instrutor no repositório é **exatamente um**, e esse um reordena o que recebe (`SC-002`)
- [ ] T039 [US2] **Conferir a T038 por defeito deliberado**: escrever um segundo seletor em qualquer lugar, provar que o teste reprova, desfazer ⚠️ **portão nunca visto reprovando é afirmação, não prova** — foi assim que o Épico 0 fechou
- [ ] T040 [US2] Acrescentar as amostras dos dois seletores e do nome em `app/estilo/page.tsx`, incluindo **uma lista deliberadamente desordenada** (`FR-027`)

⚠️ **A T037 é a fronteira fina da fatia.** Quem **calcula** o peso é a função pura; o componente
**aplica**. Um ponto único que apenas exibe aceita lista desordenada — o esquecimento não
desaparece, só muda de lugar.

**Ponto de conferência**: a amostra desordenada da T040 aparece ordenada na tela.

---

## Fase 5 — História 3 (P2): a tabela densa é utilizável só com o teclado

**Meta**: quem não usa o rato atravessa a tabela sem 2.400 pressionamentos de `Tab`.

**Teste independente**: percorrer a amostra da vitrine inteira com o teclado, sem tocar no rato.

- [ ] T041 [US3] Escrever `components/ciaara/tabela-densa.tsx`, genérica em `T`, com as três densidades do documento 23 §5 e **renderizando todas as linhas** (`FR-006`, `FR-006.1`)
- [ ] T042 [US3] Ligar a lista navegável da T018 à tabela, nas duas dimensões (`FR-023`)
- [ ] T043 [US3] Ligar o algarismo tabular do `@theme` em coluna numérica ⚠️ **sem ele, coluna de horas não alinha e a tabela densa perde o que a torna densa**
- [ ] T044 [US3] Implementar ordenação de apresentação e filtro textual ⚠️ **ordenação de apresentação, NUNCA de domínio**: a antiguidade não passa por aqui, senão a `RN-ANT-01` ganha um segundo endereço
- [ ] T045 [P] [US3] Estender `tests/e2e/teclado.spec.ts` para a tabela: as seis teclas, o salto de 20 linhas, e o foco **visível** em cada parada (`SC-006`, `FR-024`)
- [ ] T046 [P] [US3] Cobrir em teste os casos de fronteira: sem colunas, uma coluna, sem linhas, `PageDown` com menos de 20 restantes, e **o fim da lista que não rola circularmente**
- [ ] T047 [US3] Acrescentar a amostra da tabela em `app/estilo/page.tsx`, com linhas suficientes para o salto de 20 fazer sentido (`FR-027`)

**Ponto de conferência**: o percurso do passo 2 do [quickstart](./quickstart.md) inteiro, na mão.

---

## Fase 6 — História 4 (P2): os gráficos são legíveis, inclusive impressos em preto e branco

**Meta**: a cor deixa de ser o que distingue uma série.

**Teste independente**: remover a cor e continuar distinguindo cada série.

- [ ] T048 [US4] Definir em `components/graficos/tipos.ts` o tipo de série com `forma` e `rotulo` **obrigatórios** ⚠️ **é a `FR-018` expressa no tipo: série sem forma não compila**
- [ ] T049 [P] [US4] Escrever `components/graficos/grafico-barras.tsx` — barras com eixo começando em zero, rótulo direto, sem animação (`FR-016`)
- [ ] T050 [P] [US4] Escrever `components/graficos/grafico-pizza.tsx` — até cinco categorias, **percentual escrito**, não só fatia (`FR-016`)
- [ ] T051 [P] [US4] Escrever `components/graficos/grafico-linha.tsx` ⚠️ **é o único componente da fatia sem consumidor nomeado** — vem do inventário do documento 23, e o primeiro uso real é dos Épicos 9 e 12
- [ ] T052 [US4] Aplicar as oito séries em **ordem fixa** e a recusa acima de seis séries, apontando a tabela densa (`FR-017`, documento 23 §7)
- [ ] T053 [P] [US4] Escrever `tests/unidade/graficos.test.ts` provando que toda série sai com forma e rótulo distintos, e que sete séries são **recusadas**
- [ ] T054 [P] [US4] Escrever `tests/e2e/graficos.spec.ts` conferindo que nenhuma cor literal aparece e que o rótulo acompanha cada traço (`SC-008`)
- [ ] T055 [US4] Acrescentar as amostras dos três gráficos em `app/estilo/page.tsx` (`FR-027`)

⚠️ **A medição que forçou tudo isto**: no tema claro, as séries 1 e 8 ficam a `0,0003` de
luminância; no noturno, as séries 4 e 7 a `0,0005`. **A paleta não é tocada.**

**Ponto de conferência**: a visualização de impressão em preto e branco, com o olho.

---

## Fase 7 — História 5 (P3): o alerta normativo aparece, e não impede

**Meta**: `RN-DEG-02` — regra normativa vira **alerta, nunca bloqueio**.

**Teste independente**: com o alerta na tela, a ação que ele comenta continua disponível.

- [ ] T056 [US5] Escrever `components/ciaara/alerta-conformidade.tsx` — faixa fixada no topo da região, ícone, rótulo e região anunciada, **sem marcador de cliente** e **sem botão de dispensar** (`FR-008`, `FR-026`)
- [ ] T057 [US5] Escrever `components/ciaara/badge-teto.tsx` com o limite vindo por propriedade e a explicação ao apontar (`FR-009`)
- [ ] T058 [P] [US5] Escrever `tests/e2e/alerta.spec.ts` provando que o alerta **sobrevive à rolagem**, é anunciado ao leitor de tela, e **não desabilita nada** (`RNF-USA-04`, `RN-DEG-02`)
- [ ] T059 [US5] Acrescentar as amostras do alerta e do emblema de teto em `app/estilo/page.tsx` (`FR-027`)

⚠️ **Nenhum número de teto escrito no componente.** Os tetos vivem em `config_parametros`
(`RNF-NORM-08`); uma constante aqui passaria em todo teste desta fatia violando o Princípio VII.

---

## Fase 8 — Fechamento e dívida da fatia (a)

- [ ] T060 Estender `tests/e2e/vitrine.spec.ts` para exigir que **todo** componente de `components/ciaara/` e `components/graficos/` apareça na vitrine (`SC-001`) ⚠️ **é a invariante I-5 estendida de token para componente: componente sem amostra é componente que ninguém nota quando quebra**
- [ ] T061 Escrever `tests/unidade/fronteira-componentes.test.ts` — **zero** componente de `components/ciaara/` importando cliente de banco ou implementando regra `RN-` (`FR-019`, `FR-020`, `SC-007`)
- [ ] T062 Escrever teste de que nenhum componente declara marcador de cliente fora da lista do documento 23 §3.1 (`FR-021`) ⚠️ **é o erro que não aparece no `tsc` e aparece no `next build`**
- [ ] T063 Conferir que a regra de cor continua em **zero violações** no repositório inteiro (`FR-022`, `SC-003`)
- [ ] T064 Escrever em `specs/005-design-system-tokens-e-tema/checklists/acessibilidade-e-entrega.md` o fechamento dos doze itens — CHK005 a CHK010 e CHK013 a CHK018 —, **cada um apontando pelo número o requisito desta fatia que o fecha** (`SC-011`) ⚠️ **fechar item sem apontar o que o fechou é o mesmo que desmarcá-lo por cansaço**
- [ ] T065 Atualizar a seção *Estado atual e onde retomar* do `CLAUDE.md` com o resultado medido da fatia
- [ ] T066 Rodar `pnpm verificar:tudo` e conferir que sai **0** (`SC-010`)
- [ ] T067 Abrir o PR com o template inteiro preenchido ⚠️ **esta fatia não tem migration, então o plano de reversão é `git revert`** — e isso se escreve, não se subentende

---

## Dependências entre as fases

```text
Fase 1 (preparação)
   └─> Fase 2 (fundação) ──┬─> Fase 3 · US1  (P1)
                           ├─> Fase 4 · US2  (P1)   ⛔ T030/T031 bloqueadas
                           ├─> Fase 5 · US3  (P2)   depende da T018
                           ├─> Fase 6 · US4  (P2)   independente das demais
                           └─> Fase 7 · US5  (P3)
                                     └─> Fase 8 (fechamento)
```

| História | Depende de | Por quê |
|---|---|---|
| US1 | Fase 2 | os primitivos e o tipo de tom |
| US2 | Fase 2, **T018** | o seletor com busca é a lista navegável de uma dimensão |
| US3 | Fase 2, **T018** | a tabela é a mesma lista navegável, em duas dimensões |
| US4 | Fase 1 (**T001**) | só depende da biblioteca de gráficos |
| US5 | Fase 2 | o primitivo de aviso e o de dica ao apontar |

⚠️ **US4 é a única história que pode começar logo depois da Fase 1.** Se houver espera no bloqueio
do P-1, é por onde continuar sem parar.

---

## O que dá para fazer em paralelo

**Na Fase 2**, as dez cópias de primitivo (T005–T014) são dez arquivos independentes. A T015 e a
T016 vêm **depois de todas**, porque a reconciliação precisa ver o conjunto.

**Na Fase 3**, T020 a T024 são cinco arquivos independentes. T026 fica de fora: o filtro usa quatro
primitivos e é o mais provável de expor variável sem par.

**Entre histórias**: US4 não encosta em nenhuma outra. US1 e US5 podem correr juntas depois da
Fase 2.

---

## Escopo mínimo entregável

**US1 + US2, e não é escolha arbitrária.** Juntas elas entregam o que a spec 006 mais precisa e o
que a `RN-ANT-01` exige — e a `RN-ANT-01` é a única regra de *Risco: Alto* que esta fatia toca.

Sem US3 a tabela não existe, então a tela de instrutores ainda não sai. Mas o vocabulário passa a
existir, e o Épico 5 deixa de estar bloqueado em *"não existe nada"* para estar bloqueado em *"falta
a tabela"* — que é uma diferença real.

---

## Contagem

| Fase | Tarefas | Testes |
|---|---|---|
| 1 · preparação | 4 | 1 |
| 2 · fundação | 15 | 2 |
| 3 · US1 | 10 | 2 |
| 4 · US2 | 11 | 3 |
| 5 · US3 | 7 | 2 |
| 6 · US4 | 8 | 2 |
| 7 · US5 | 4 | 1 |
| 8 · fechamento | 8 | 4 |
| **Total** | **67** | **17** |

**Bloqueadas**: 2 (T030, T031), à espera da decisão do achado P-1.
