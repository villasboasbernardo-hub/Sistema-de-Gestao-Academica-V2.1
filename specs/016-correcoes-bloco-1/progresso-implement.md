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
