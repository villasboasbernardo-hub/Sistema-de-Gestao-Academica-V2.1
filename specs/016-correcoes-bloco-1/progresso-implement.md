# Progresso do implement — spec 016

*Acompanhamento das tarefas de `tasks.md`: contagens, defeitos deliberados e medições, sempre com o
artefato nomeado (regra 9.2).*

## PR 1 — casca, entrada, listas e fichas

### Linha de base (T003) — 17/10/2026
- Commit medido: `e55d2ac` (ramo `fix/BLOCO-1-correcoes-de-tela`), com a `main` remota em `b8f7100`.
- Base local restaurada por `pnpm db:reset:limpo` (o local estava com a cópia `remoto-20261017-005738.sql`).
- `pnpm verificar` sai **0** em 5 min 10 s: **2.314** testes de unidade em **162** arquivos; build compilado.

### O que o implement decidiu ou mediu, item a item (17/10/2026)

- **1.1 — faixa.** A faixa sempre aparece (o texto Beta não depende de `NEXT_PUBLIC_AMBIENTE`); o
  ambiente só entra no texto quando declarado `local` ou `preview` (NQ-3). Em telas largas ela ocupa
  uma linha, com corte por reticências, e a altura vira o token `--altura-da-faixa`, que a lateral fixa
  e a casca descontam. A impressão (`/print/*`) continua sem faixa, inclusive no carregamento e no erro.
- **1.2 — contraste.** O item ativo passou a fundo `marca` com texto `marca-contraste`; dois pares
  entraram na auditoria (`C-4` texto × fundo, 4,5:1; `C-5` fundo × lateral, 3:1). O caso de ponta a
  ponta mede a razão de contraste nos dois temas — a de antes media **1,01**.
- **1.3 — olho.** Um componente só (`components/ciaara/campo-de-senha.tsx`), nas três telas de senha.
  O primeiro acesso é conferido no passo 7b de `admin-sobre-contas.spec.ts`, que já percorre o cadastro.
- **1.4/1.5 — filtros.** A régua do número é o `padrao` do contrato de parâmetros
  (`lib/navegacao/filtros-fora-do-padrao.ts`), a mesma do *Limpar filtros*; cada tela passa os seus
  filtros. Até aqui `/cursos`, `/instrutores` e `/disciplinas` mostravam **1** com a tela limpa.
- **1.6 — curso.** `aba` com padrão `sobre` e um dono só (o contrato); a barra mora em `BarraDoCurso.tsx`.
  O exemplo de `endereco-de-turma.test.ts:77-78` já era o uso novo do cartão do `/inicio`, e não mudou.
- **1.7 — disciplinas.** `agruparEmOutras` em `components/graficos/tipos.ts`: até 5 categorias passam
  inteiras; com 6 ou mais, as 4 maiores e *"Outras (N)"* (ver o lote de dúvidas). A propriedade
  `rodape` de `FormularioDeInstrutor` saiu, porque ficou sem consumidor com a 1.10.
- **1.10 — instrutor.** `EdicaoDoInstrutor.tsx` põe a barra e o formulário na mesma raiz do
  `Collapsible`, com a leitura entre os dois por `children`. O caso de edição das avaliações do
  currículo (T036) foi para `avaliacoes-nas-telas.spec.ts`, e não para `disciplinas.spec.ts`: só a
  amostra daquela suíte tem avaliação do currículo.
- **1.15 — situação.** Três esquemas em `lib/validacao/turma.ts` (criação com situação, edição sem,
  troca só com código e situação), a ação `trocarSituacaoDaTurma`, e a confirmação pela URL
  (`?gravada=situacao|turma`, parâmetro novo do contrato de `/turmas/[turma]`). O negativo de RLS usa o
  Encarregado de Orientação Pedagógica, que é o perfil com só `L` em turmas da suíte
  `cursos-e-turmas.test.ts`. ⚠️ Gravar a edição passou a voltar à ficha com `?gravada=turma`, e os
  casos que liam campo logo depois de gravar passaram a esperar a confirmação e reabrir o formulário
  (`esperarGravacaoDaTurma`).
- **Guarda `I-4c`.** `ellipsis` entrou na lista do que não é cor (`text-ellipsis`, da faixa).
- **Invariantes.** Rodar `vitest run` sem `--no-file-parallelism` mistura as invariantes com a unidade e
  produz 13 reprovações de concorrência em 4 arquivos do DSA e da planilha (medido em 17/10/2026; cada
  um passa sozinho). O script certo é `pnpm test:rls`, que as roda em série.

### Contagens intermediárias
- `pnpm test:unidade`: **2.342** de 2.342, em **165** arquivos (17/10/2026, árvore de trabalho).
- `tests/invariantes/rls/cursos-e-turmas.test.ts` sozinho: **27** de 27, com o negativo novo.
- Lote 1 de ponta a ponta (faixa, casca, olho, filtros, estado na URL, vitrine): **47** de 47.
- Lote 2 de ponta a ponta (16 suítes: curso, turmas, disciplinas, instrutores, avaliações, salas, DSA da
  etapa presencial, telas acessíveis, filtros e contas): **179** passados e **3** reprovados na primeira
  volta. Dois eram do `/inicio`, que ainda esperavam o link do cartão sem `?aba=grade` (consequência
  direta do FR-006.3, asserção ajustada). O terceiro expôs um **caso antigo que passava sem gravar**:
  *"turma ativa com término passado avisa, e a gravação acontece"* clicava em gravar, não confirmava o
  diálogo do limite de turmas do ano (o curso da amostra está no limite) e conferia o valor que ele
  mesmo tinha digitado. A espera pela confirmação da gravação o pegou; agora ele confirma o aviso e
  confere o valor no banco.

### Defeitos deliberados (T043) — 17/10/2026
Aplicados por `defeitos.py` (rascunho da sessão), com cópia de cada arquivo antes e restauração depois;
conferido com `grep` que nenhum ficou no código.

| Defeito | Quem reprovou |
|---|---|
| (a) a faixa some em Production (`textoDaFaixa` devolve vazio) | `faixa-beta.test.ts`: 2 casos |
| (b) a contagem volta a contar o padrão | `filtros-fora-do-padrao.test.ts`: 2 casos; `filtros-recolhidos.spec.ts`: `/cursos`, `/instrutores` e `/disciplinas` com *"1"* na tela limpa |
| (c) o filtro volta a nascer aberto | `filtros-recolhidos.spec.ts`: as 5 telas, em `aria-expanded` |
| (d) sem o botão *Trocar situação* | `turmas-situacao.spec.ts`: Admin e Encarregado, no clique |
| (e) a aba padrão volta a ser a Grade | `contrato-de-parametros.test.ts`: 1 caso; `curso-pagina.spec.ts`: 3 casos |
| (g) a ficha do instrutor abre com o formulário | `instrutores.spec.ts`: *"a ficha abriu com campo editável à vista"* |
| (h) o formulário de unidade nova sempre aberto | `disciplinas.spec.ts`: o caso do FR-007.1 |

⚠️ Na primeira volta do grupo A, o caso do Admin de `turmas-situacao.spec.ts` caiu no `beforeAll`, ao
semear (*"An invalid response was received from the upstream server"* — infraestrutura do stack local
sob dois processos), e o do Encarregado **não rodou**. Os dois que passaram não discriminam esse
defeito. A suíte foi repetida sozinha, com o defeito ainda aplicado, e os dois reprovaram no clique.

### `pnpm verificar:tudo` (T044) — 17/10/2026, sobre `1b63f51`
⚠️ A primeira tentativa parou no `next build` com `EPERM: operation not permitted, unlink …\.next\server\app\(app)\admin`:
a pasta `.next` tinha virado **ponto de reparação do OneDrive** (arquivo sob demanda) e o Next não
conseguia apagá-la. `.next` é artefato de build, ignorado pelo git (`.gitignore:17`); foi apagada inteira e
a verificação foi relançada do começo.

| Etapa | Resultado |
|---|---|
| tipos, lint, formatação | sem erro e sem aviso |
| unidade | **2.342** de 2.342, em **165** arquivos |
| build | compilado |
| pgTAP | **770** em **54** arquivos, PASS |
| invariantes e RLS (`test:rls`) | **327** de 327, em **17** arquivos |
| ponta a ponta (4 processos, 16,5 min) | **488** passados · **3** reprovados · **6** pulados — **497** casos |

Os três reprovados pararam por **tempo** (`Test timeout of 30000ms exceeded`) sob 4 processos:
`admin-sobre-contas.spec.ts:206` (o *Sair* não chegou ao login a tempo) e `:501` (a exclusão de conta),
e `dsa-tipo-e-global.spec.ts:160` (abrir a ficha pela lista). **Isolados**, as duas suítes passam inteiras,
**24 de 24** com 1 processo e de novo **24 de 24** com 2 — é a classe da `PEND-014-7`, que já nomeia as duas.

### CI (T046) — sobre `e47419f`, PR #67
Verde nos três blocos (`qualidade`, `build`, `banco`) nos dois runs: `39086920385` (pull_request) e
`39086904923` (push). Contagens do run `39086920385`: unidade **2.342** em 165 arquivos · pgTAP **770** em
54 arquivos, PASS · invariantes e RLS **327** em 17 arquivos · ponta a ponta **491** passados e **6**
pulados — os mesmos **497** casos do `verificar:tudo` local, ali sem nenhum instável (o CI tem
`retries: 2`; o local, 0).

O preview do commit é o deploy `7148402100` do GitHub, em `success`
(`sistema-de-gestao-academica-v2-1-hxu69zra6-ciaara-11.vercel.app`); ele fica atrás da proteção de acesso
da Vercel (redireciona para `vercel.com/sso-api`), e por isso o conteúdo não foi lido por fora.

## Conferência do PR #67 por Bernardo Villas Boas — 17/10/2026

Aprovados os passos 1, 3, 4, 5, 6 e 8 do roteiro. **Dois defeitos**, corrigidos neste ramo antes do merge.

### Defeito 1 — o item ativo do menu preso à primeira página (passo 2)
- **Causa, confirmada:** `app/(app)/layout.tsx` lia o caminho do cabeçalho `x-ciaara-caminho`, gravado
  pelo middleware, e o App Router **não redesenha o layout** na navegação por clique entre páginas filhas
  (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md:240`, Next 16.3.3).
  O ativo ficava o da primeira renderização — *Início*, entrando por `/inicio`. Defeito anterior à spec
  016, que a cor nova do item 1.2 pôs à vista. Os casos antigos chegavam por endereço e não o viam.
- **O mesmo defeito nas abas da Administração** (`app/(app)/admin/layout.tsx`), achado no mapeamento.
- **Conserto:** `components/casca/entrada-do-menu.tsx`, folha de cliente com `usePathname`, chamando a
  regra única `entradaAtiva()`; `app/(app)/admin/AbasDaAdministracao.tsx`, a mesma coisa para as abas. A
  casca e os dois layouts deixaram de receber o caminho; o middleware deixou de gravar o cabeçalho (a
  cópia dos cabeçalhos ficou, porque leva os cookies renovados); `lib/navegacao/caminho.ts` saiu.
- ⚠️ **A entrada *Administração* ganhou `ativaSob: "/admin"`**: ela leva a `/admin/usuarios`, e pela
  regra de prefixo da própria rota o menu se apagaria em Permissões e Salas assim que o caminho deixasse
  de estar preso. `tests/unidade/entrada-ativa.test.ts` (a regra não tinha teste) reprovou só nesse caso
  antes do campo.
- **Caso que discrimina:** `shell.spec.ts` — entrar em `/inicio` e ir a Turmas, Cursos, Disciplinas,
  Instrutores e de volta a Início **só por clique**, conferindo `aria-current` e o fundo `--marca` em
  cada parada; e trocar de aba na Administração conferindo a aba marcada e o menu. **Reprovaram antes**
  (*"em /turmas, o ativo é outro — recebido /inicio"*; *"em /admin/permissoes, a aba marcada é outra"*).

### Defeito 2 — a disciplina aberta não fechava (passo 6)
- **Causa, confirmada:** `GradeDeDisciplinas.tsx` desenhava a linha aberta pelo gancho da URL, mas
  decidia abrir/fechar pela cópia do servidor (`parametros.aberta`), que o parâmetro visual `aberta`
  (`avisaServidor: false`) não refaz: o segundo clique gravava o mesmo código. A face oposta: chegando com
  `?aberta=` (ou depois de o servidor redesenhar a tela), o primeiro clique fechava e o segundo **não
  reabria**.
- **A ficha da turma tinha o mesmo defeito** por outro caminho: o recuo `abertaNoEndereco` reabria a linha
  fechada sempre que a ficha tinha sido carregada com `?aberta=` ou revalidada por uma gravação no detalhe.
- **Conserto no componente único:** a `TabelaDensa` decide abrir ou fechar pelo mesmo `abertas` que
  desenha, para clique, Enter e Espaço, e entrega `aoAlternarLinha(linha, abrir)`. O tipo virou união:
  com `detalhe`, `abertas` e `aoAlternarLinha` são obrigatórios e `aoAtivarLinha` não compila. As quatro
  telas com detalhe (`/disciplinas`, a ficha da turma, o painel de situação do DSA e a vitrine) passaram
  ao contrato novo; as duas que navegam (turmas e instrutores) ficaram como estavam. As cópias do
  servidor de `aberta` saíram das duas páginas.
- **Casos que discriminam:** abrir → fechar → reabrir por clique, Enter e Espaço, com `aria-expanded`, o
  detalhe e o `?aberta=` conferidos, nas duas telas, partindo da tela limpa e do endereço com a linha
  aberta. **Reprovaram antes:** `/disciplinas` nos dois pontos de partida e a ficha partindo do endereço;
  a ficha partindo da tela limpa já fechava, como o mapeamento previa. Os auxiliares `abrirDetalhe`
  passaram a abrir só se a linha estiver fechada.

### Revisão adversária do conserto (17 e 18/10/2026)
Quatro lentes sobre o diff, com um cético por achado. ⚠️ **Ficou incompleta**: o limite semanal de
subagentes estourou no meio, e a lente de regressões não rodou (coberta pela suíte completa abaixo); os 6
achados da lente de documentação foram conferidos à mão no código. Corrigidos: o documento 24 (só o `.md`)
ainda citava `lib/navegacao/caminho.ts`; a emenda de `contracts/casca.md` engolia o parágrafo seguinte e
dizia que *"o cabeçalho"* deixara de receber o caminho (ele nunca recebia); `painel-retratil.tsx` e
`casca-do-app.tsx` se diziam o único cliente da casca; `fronteira-casca.test.ts` dizia *"quatro"* com
cinco na lista; o cabeçalho de `entrada-ativa.test.ts` dizia que a regra estava certa; e as prévias do
`.design-sync` da `TabelaDensa` e da `FiltroAvancado` seguiam no contrato antigo (`PEND-016-4`: o `tsc` não
as lê). **Não corrigido, por estar fora dos dois defeitos:** as teclas de navegação dentro do detalhe
aberto são capturadas pela grade — `PEND-016-3`, para decisão de Bernardo.

### Contagens desta rodada — `pnpm verificar:tudo`, 18/10/2026, sobre `e55291a`
| Etapa | Resultado |
|---|---|
| tipos, lint, formatação, build | sem erro e sem aviso |
| unidade | **2.347** em **166** arquivos (+5: `entrada-ativa.test.ts`) |
| pgTAP | **770** em **54** arquivos, PASS |
| invariantes e RLS | **327** em **17** arquivos |
| ponta a ponta (4 processos, 18,5 min) | **494** passados · **3** reprovados · **6** pulados — **503** casos (+6 novos) |

Os três reprovados pararam por tempo sob 4 processos: `admin-sobre-contas.spec.ts:206` e
`dsa-tipo-e-global.spec.ts:160` (os mesmos da rodada do PR 1) e `planilha-de-contingencia.spec.ts:112`
(a ficha ainda em *"Carregando a ficha da turma…"* no fim dos 10 s). **Isolados:** as três suítes juntas
com 2 processos deram 28 de 29 — o do DSA de novo, por estouro do prazo total de 30 s na terceira
passagem pela ficha —, e o caso do DSA sozinho passou **3 de 3**. Classe da `PEND-014-7`.

## PR 2 — DSA, papel e planilha

### Ponto de partida (T049) — 18/10/2026
- **Conferência do PR #67 por Bernardo Villas Boas em 18/10/2026: APROVADO**, inclusive os blocos A (o
  ativo do menu) e B (a disciplina fecha) da reconferência. Os lotes de dúvidas ficam como deixados; a
  `PEND-016-4` só registrada, para fatia própria.
- PR #67 mesclado por squash em **`a64791d`**; CI verde nos três blocos na `main` (run `39151912994`) e
  Production servindo o merge — a tela de entrada traz a faixa Beta e o olho da senha, e as rotas
  protegidas respondem `307`. O ramo `fix/BLOCO-1-correcoes-de-tela` foi apagado, local e remoto, depois
  do merge confirmado.
- **Ramo novo, não rebase:** `fix/BLOCO-1-dsa`, a partir da `main` em `a64791d`, como a T049 prevê.
  ⚠️ O `git switch main` falhou com `cannot stat 'specs': Invalid argument` (a pasta virou ponto de
  reparação do OneDrive); como a árvore do squash é **idêntica** à do ramo antigo
  (`d1a648e1…` nas duas), as referências foram movidas com `git reset --soft origin/main` e
  `git branch -f main origin/main`, sem reescrever arquivo.
- Base local por `pnpm db:reset:limpo`.
- **Primeiro item, em commit próprio, a `PEND-016-3`** (decisão de Bernardo, 18/10/2026): as teclas de
  navegação dentro do detalhe aberto.

### `PEND-016-3` — as teclas num campo do detalhe aberto (commit `4372ed5`)
- A regra ficou no componente único (`components/ciaara/lista-navegavel.tsx`): a navegação da grade só
  atende teclas cujo alvo é **célula registrada dela e não campo editável** (`input`, `select`,
  `textarea`, `contenteditable`); `Enter` e `Espaço` num campo também não fecham a linha.
- **Reprovou antes:** os 3 casos novos (o tópico da UE em *Disciplinas*; a data da previsão e o seletor de
  instrutor na ficha da turma) falharam com o componente antigo e passaram com o conserto; as 14 suítes
  que exercitam teclado deram **198 de 198** depois.

### O que o implement decidiu ou mediu, item a item (18/10/2026)
- **1.9 · "Semana N de T" (T050–T058).** A conta é `lib/dominio/dsa/semana-do-curso.ts`, função única, e
  tela, papel e planilha passam por ela; `numero-do-dsa.ts` e o teste dele saíram, e a guarda
  `distribuicao-unica.test.ts` aponta agora para o módulo novo. **Medido na cópia
  `remoto-20261017-005738.sql`:** as **12** durações preenchidas de `cursos.duracao_semanas` são inteiras
  (de 2 a 50) e as outras **12** são nulas — a regra de inteiro positivo não descarta curso real.
  - Na planilha, o número é **fórmula** sobre a janela que agora mora na BD DISCIPLINAS (início, término,
    duração, semanas da turma e T), em `lib/dominio/dsa/planilha/semana-corrida.ts`; a prova *fórmula =
    função* ganhou **8** casos que trocam a janela no catálogo — antes do início, depois do término, turma
    mais longa que o curso, sem duração, sem término, sem início. Saíram da planilha a marca *conta no nº*,
    as colunas `temAula`/`acumulado` e as semanas fora da pasta, que só serviam à contagem CRONOS.
  - O rótulo *"Semana N de T"* do cabeçalho não tem título próprio e mora na coluna do horário (larga),
    com *Alunos* nas duas colunas estreitas. Na IMPRESSÃO ele ocupa o lugar de *"Semana 41/2026"* e o
    *"DSA Nº"* saiu; o rodapé também.
  - **Decisão adotada (vai no lote):** o título das colunas da CRONOS deixou de ser `S42` (semana ISO) e
    passou a `S28` (semana do curso), com «—» fora da janela.
  - `leitura-paginada.test.ts` perdeu o ponto do nº do DSA: ele virou conta de calendário e não lê mais
    lançamento — a CH continua sendo o que a paginação protege.
  - A navegação mostra *"Semana N de T · 12/10/2026 a 16/10/2026"*; o auxiliar `irParaASemanaDoDia`
    (14 suítes) passou a esperar a segunda-feira em DD/MM/AAAA. As 11 suítes que o usam: **56 de 56**.
- **Aviso de duração (T057):** `avisosDaTurma` ganhou `turma_mais_longa_que_o_curso`, com o texto de
  `avisoDeDuracao`; só a ficha passa a duração (a aba *Grade* do curso não, por desenho).
- **1.11 · 7 TA (T059):** o caso passa de primeira, como previsto (Q-8). **Medido no papel:** a régua do
  regime de 7 tem **8** linhas — os 7 do regime e o 8º marcado *excepcional* (`RF-HOR-03.1`); a asserção
  conta os 7 do regime.
- **1.12 · mesmo TA e sugestão (T060–T066):**
  - **Reprovou antes:** os 3 casos de `grade.test.ts` (duas ordens de entrada e o desempate pelo código).
    A grade ordena por TA, criação e código, e o segundo do mesmo TA vai para «sem posição» com
    `MOTIVO_NO_MESMO_TA`, que a planilha importa. ⚠️ **O papel só lê células**, então o dia impresso ganhou
    `noMesmoTa`, e o papel o lista em *fora da grade* com o motivo; a planilha o recebe pela lista sem
    posição da semana, sem duplicar.
  - A leitura do DSA lê a atribuição por UE pela linha da turma e só a ativa, lê a atribuição por
    disciplina (`turma_disciplina_instrutor`, que não lia) e a técnica sugerida da UE e da disciplina, e
    entrega `errosDeLeitura`, que a tela mostra em `aviso-de-leitura`. A planilha perdeu
    `FALHA_CONHECIDA_DO_DSA`.
  - **A guarda da `RN-ANT-01` pegou** a primeira ordenação das atribuições (um `sort` próprio); ela passou
    a sair de `ordenarPorAntiguidade`, como na planilha.
  - O formulário sugere por `preencherLancamento` ao escolher a disciplina e a UE (só na aula), diz a frase
    de `frasePara` quando não há atribuição, e tira o instrutor que **a sugestão** pôs quando a disciplina
    nova não sugere ninguém — o escolhido à mão fica.
  - **SC-006, medido na cópia `remoto-20261017-005738.sql`, só lendo o arquivo** (o remoto não foi tocado):
    **92** linhas de turma têm atribuição ativa por disciplina ou por UE, e `preencherLancamento` devolve
    instrutor nas **92** (90 em linha ativa e 2 em linha já inativa). Antes do conserto a tela sugeria em
    **0**: a consulta por UE falhava e a por disciplina não existia.
  - ⚠️ **Achado de teste, não corrigido:** `limparDsa` apaga `turma_disciplina_unidade` por `turma_id`,
    coluna que a tabela não tem — a limpeza falha calada. Os testes novos que semeiam atribuição apagam
    pela `turma_disciplina_id`.
- **1.8 · cartão (T067):** nome em destaque, código depois e a técnica numa linha própria
  (`cartao-tecnica`), nas duas grades; a grade sem relógio passou a mostrar o nome. Papel e planilha não
  mudaram.
- **1.5 · datas (T068–T073):** **reprovou antes** — a guarda reforçada (template de dois pedaços com
  `padStart`, `.slice(0, 5)` sobre data formatada, `Intl.DateTimeFormat` fora de `lib/formato/`, e o
  import relativo no controle positivo) acusou `grade-do-papel.ts` e `cronos.ts`. O papel e a planilha
  passaram a escrever o dia por `siglaDoDiaDaSemana` e a data com o ano; a CRONOS ganhou largura 9 para a
  data inteira; o rótulo acessível da célula usa o rótulo da coluna (`SEG 06/04/2026`); a vista diz
  *"aplicada em 01/10/2026"*; e `/atividades` filtra por `<input type="date">`, com a URL em ISO. O papel
  continua em **uma** página A4 com o ano (caso novo, por clique).

### Defeitos deliberados (T074) — 18/10/2026
| Defeito plantado | Quem pegou | Resultado |
| --- | --- | --- |
| (a) a semana do curso começando em zero (`numero = dias / 7`) | `semana-do-curso.test.ts` | **8** de 17 reprovados |
| (a) a regra CRONOS na montagem: turma sem lançamento sai sem número | `dsa-semana-do-curso.spec.ts` | reprovado: *"— · 12/10/2026 a 16/10/2026"* no lugar de *"Semana 28 de 37"* |
| (b) a consulta por UE de volta ao filtro `turma_id` | `leitura-do-dsa.test.ts` | reprovado: `errosDeLeitura` com a lista |
| (c) o `DD/MM` com `padStart` de volta no papel | `formato-de-data.test.ts` | **2** padrões reprovados |
| a fórmula do limite ignorando o término | `planilha-preenchimento.test.ts` | reprovado no caso *"término antes"* |
| o segundo do mesmo TA sem desvio na grade | `grade`, `impressao` e `planilha-preenchimento` | **5** reprovados |

Todos desfeitos; os arquivos voltaram ao estado anterior e as suítes ao verde.

### `pnpm verificar:tudo` (T075) — 18/10/2026, três rodadas
- **1ª rodada:** reprovou em `tests/invariantes/leitura-do-periodo.test.ts` (3 casos). Ele **exigia** que a
  única lista com erro fosse *"atribuições por UE"* — a falha que este PR conserta. Com a consulta certa a
  lista de erros fica vazia, e a asserção passou a exigir **nenhum** erro (commit `b8af677`). A cadeia
  parou ali, sem ponta a ponta.
- **2ª rodada:** unidade, pgTAP e invariantes verdes; ponta a ponta com **4** reprovados de 513. **Dois eram
  teste lendo o formato antigo**, corrigidos em `61016df`: `dsa-parar-dia.spec.ts` achava a célula pela data
  ISO no fim do rótulo acessível (agora *"SEX 10/04/2026"*) e `planilha-de-contingencia.spec.ts` esperava
  *"Semana 42 — "*. **Dois eram carga:** os quatro arquivos juntos, com build novo, deram **16 de 16**; isolado
  e repetido 3 vezes, `filtros-recolhidos.spec.ts:112` deu **3 de 3** e `dsa-tipo-e-global.spec.ts:160`
  **2 de 3** — o mesmo caso que já reprovava na rodada do PR 1, classe da `PEND-014-7`.
- **3ª rodada, sobre `61016df`:** sai **1**, por um caso só.

| Suíte | Resultado |
| --- | --- |
| tipos, lint, formatação, build | sem erro e sem aviso |
| unidade | **2.365** em **166** arquivos |
| pgTAP | **770** em **54** arquivos, PASS |
| invariantes e RLS | **328** em **18** arquivos (+1: `leitura-do-dsa.test.ts`) |
| ponta a ponta (12,7 min) | **506** passados · **1** reprovado · **6** pulados — **513** casos |

O reprovado foi `salas.spec.ts:126` (a sala de amostra ainda não estava na lista da turma), que este PR não
toca. **Isolado:** o arquivo inteiro repetido 3 vezes com 2 processos deu **18 de 18**. É a classe já
registrada na memória do projeto (*e2e frágil sob carga*, que cita `salas`).

### CI (T077) — sobre `7588854`, PR #68
Verde nos três blocos (`qualidade`, `build` e `banco`), run `39164795651`, com **a mesma contagem do
`verificar:tudo` local**: **2.365** de unidade (166 arquivos) · **770** pgTAP (54) · **328** invariantes e RLS
(18) · **513** casos de ponta a ponta — **507** passados e **6** pulados, sem instável. O `salas.spec.ts:126`, que
reprovou no local sob carga, passou no CI de primeira. O run de `9c69303` foi cancelado pelo push do
roteiro com o link do preview, que só muda documento.

### Medição do SC-006 (T078)
Ver o item 1.12, acima: **92 de 92** na cópia `remoto-20261017-005738.sql`.

## PR 2 — a conferência de 18/10/2026 (Bernardo Villas Boas): APROVADO, com dois ajustes no papel

> *"APROVADO, com DOIS ajustes no papel do DSA, a corrigir NESTE PR antes do merge."* As dúvidas 1, 3, 4 e 5
> do lote ficaram como estavam; a 2 e a 6 entraram neste PR; a 7 foi para a `PEND-014-7`.

### A · o campo da semana num rótulo só
- A tela e o papel diziam *"Semana do curso"* em cima e *"Semana 28 de 37"* embaixo. Agora é um rótulo só,
  *"Semana do curso: 28 de 37"* (`campoDaSemanaDoCurso` e `valorDaSemanaDoCurso`, em
  `lib/dominio/dsa/semana-do-curso.ts`). Fora da janela, *"Semana do curso: —"*; sem T, *"Semana do curso: 6"*.
- **Onde NÃO mudou, de propósito:** a navegação (*"Semana 28 de 37 · 12/10/2026 a …"*), o rodapé do papel
  (*"… · Semana 28 de 37"*) e a planilha (o cabeçalho de cada semana, o rótulo do seletor e a identificação
  da IMPRESSÃO). Em nenhum deles há o rótulo *"Semana do curso"* ao lado, então não há repetição.
- **Reprovou antes:** com os testes novos e o código antigo, **4** casos de ponta a ponta reprovaram —
  `dsa-semana-do-curso.spec.ts:113`, `dsa-imprimir.spec.ts:149` e `dsa-ver.spec.ts:323` e `:401`.

### B · o quadro de CH sobre a assinatura do Auxiliar
- **Medido antes de consertar, no dado real e sem tocar o remoto:** a cópia `remoto-20261017-005738.sql`
  restaurada **só no banco local**, e o `/print/dsa` de **todas** as semanas reais com mais de 4 disciplinas —
  **131** semanas, 23 delas da C-Ap-FR 2026 —, com a mídia de impressão, no Chromium. **Nenhuma cruzava**:
  em todas, a folga entre a 2ª coluna do quadro e a assinatura da esquerda era de **22 px**, que são os 6 mm do
  `gap` do rodapé. A tabela mais apertada (C-Espc-FR, códigos como `PPREVACER-005`) usava **290** dos **312**
  px da coluna; com a Barlow bloqueada (a fonte de reserva do `next/font`), **307** de 312.
- **A causa é o mecanismo, e ela não depende deste PR:** a tabela não encolhe abaixo da palavra mais larga
  que tem, e nada a prendia à coluna dela — a única separação entre o quadro e as assinaturas era o `gap`.
  Qualquer coisa que alargue o texto (a métrica da fonte no motor de impressão de quem imprime, ou um nome
  com palavra longa, que o cadastro aceita) empurra a 2ª coluna para cima da assinatura da esquerda. ⚠️ **Este
  PR não mudou o CSS do papel** (`git diff main -- app/print/dsa/documento.css` vazio antes do conserto): as
  datas com ano e o rótulo da semana mexem no cabeçalho dos dias e na faixa de identificação, não na largura
  do rodapé. ⚠️ **O cruzamento exato que você viu NÃO se reproduziu aqui** — o Chromium desta máquina tem
  folga em todas as semanas reais. O teste o reproduz pelo mesmo mecanismo, com uma palavra longa.
- **O conserto** (`app/print/dsa/documento.css`): as colunas do quadro passaram de `flex` para uma grade de
  colunas iguais (`minmax(0, 1fr)`), e o nome da disciplina quebra onde for preciso
  (`overflow-wrap: anywhere`) — a largura mínima da tabela passa a ser a do código e dos números. O código e
  os números não quebram.
- **Reprovou antes:** `tests/e2e/dsa-rodape-do-papel.spec.ts` — as 13 disciplinas da C-Ap-FR com os nomes do
  cadastro e uma 14ª com palavra longa —, no build antigo: *"o quadro de CH cruza a assinatura da esquerda
  (o Auxiliar): quadro {x: 34, largura: 694,5} × assinatura {x: 695,4}"*. ⚠️ **Sem a palavra longa ele
  passava no build antigo**, e foi isso que mostrou que a semana real não basta para cruzar no Chromium.
- **Depois do conserto:** o mesmo caso passa — o quadro fica na coluna dele, a palavra longa quebra dentro
  da tabela, e a folha continua em **uma** página A4 —, na rodada de ponta a ponta abaixo.

### Dúvida 2 · só linha de turma ativa sugere instrutor
- As quatro consultas de atribuição — por UE e por disciplina, na tela e na planilha — passaram a filtrar
  `turma_disciplina.status = 'ativo'`, além do status da atribuição.
- **Reprovou antes:** o caso novo de `tests/invariantes/leitura-do-dsa.test.ts` põe a linha da turma em
  `inativo` com a atribuição ativa; com as consultas antigas, as **4** asserções reprovaram (tela e planilha,
  por UE e por disciplina). Na cópia de 17/10, são **2** linhas nessa situação: elas deixam de sugerir.

### Dúvida 6 · `limparDsa`
- `apagarLinhasDaTurma` (em `tests/e2e/dsa-de-teste.ts`) lê as linhas da turma e apaga por
  `turma_disciplina_id` as atribuições por UE **e** por disciplina, depois as linhas — cada `delete` com o erro
  conferido. `limparDsa` e o `afterAll` de `dsa-etapa-presencial.spec.ts`, que tinha a mesma consulta errada,
  passaram a usá-la.
- **Reprovou antes:** o último caso de `leitura-do-dsa.test.ts` chama `limparDsa` com a atribuição no lugar;
  com a limpeza antiga, *"a turma ficou depois do limparDsa"*.

### Dúvida 7
Os três casos na `PEND-014-7` do `CLAUDE.md`.

### A verificação (18/10/2026)
| Suíte | Resultado |
| --- | --- |
| tipos, lint, formatação | sem erro e sem aviso |
| unidade | **2.367** em **166** arquivos (+2: o campo da semana) |
| invariantes da leitura (`leitura-do-dsa`, `leitura-do-periodo`, `leitura-paginada`, `planilha-igual-ao-papel`, `planilha-de-conferencia`) | **16** de **16** |
| ponta a ponta do DSA e da impressão (`dsa-*` e `planilha*`, 21 arquivos, base limpa, build novo) | **118** passados · **4** pulados · **0** reprovados — **122** casos, 7,9 min |
| CI | [pendente] |
