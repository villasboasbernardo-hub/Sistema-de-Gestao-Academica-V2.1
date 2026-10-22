# Spec 022 — Bloco 7: padrões de tela (Rodada 2 do plano de correções)

**Pedido:** Bernardo Villas Boas, 22/10/2026, pelo `/corrigir` — *"Bloco 7 do plano de correções (seção "Rodada 2") —
padrões de tela, sem banco, num PR"*. **Ramo:** `feat/BLOCO-7-padroes-de-tela`, a partir da `main` `45a910c`.
**Banco:** nenhum (nenhuma migration; nenhum tipo regenerado).

## 1. O problema, em uma frase

As telas cresceram bloco a bloco com padrões diferentes: botões de texto em toda parte e em qualquer posição,
formulários abertos no meio das páginas, cursos e turmas em ordens diferentes de tela para tela, avisos espalhados em
quadros por página, a página do curso com conteúdo repetido entre as abas, e os cartões do DSA sem distinguir o tipo
pela cor.

## 2. Paridade ou novidade (regra 3)

**Padrão de tela, não função de negócio nova:** nenhum dado, nenhuma regra `RN-` e nenhuma permissão muda. O que muda de
lugar ou de forma está nos itens 1 a 6; o que muda texto de requisito **[PRESERVADO]** está nas autorizações A-1 a A-3.

## 3. A triagem — o pedido, item a item, medido na `main` `45a910c`

| # | O pedido | O que existe hoje (medido) | Tipo |
|---|---|---|---|
| **1** | Botões padrão como **ícone com dica e `aria-label`**, à **direita** e no **topo** da página/tabela; componente único + guarda; o texto continua no diálogo de confirmação destrutiva | Nenhum botão de ícone no app (só o *fixar lateral*); ~60 botões de texto em ~35 arquivos, quase todos à **esquerda** e muitos no **rodapé**; `BarraDeAcoes` sem alinhamento à direita; o tema em três botões de texto; o requisito FR-031 da fatia (b) do Épico 4 diz *"o ícone acompanha o rótulo, nunca o substitui"* | melhoria |
| **2** | Edição e cadastro **sempre** em **diálogo** (curto: UE, avaliação, regime) ou **página própria** (longo: disciplina, curso); nunca campos abertos na página; modelo: a ficha do instrutor | **24** formulários abertos dentro de página: disciplina (cadastro e edição na linha da grade), UE, avaliação do currículo, arbitrado, regime, limite, novo currículo, previsto do PROENS, período, instrutores da turma, TA fora do DSA, juntar como sessão, parar dia, assinaturas, sala, nome do perfil… A ficha do instrutor: **leitura por padrão** e *Editar* revelando o formulário longo; cadastro em página própria | melhoria |
| **3** | Ordem por **classificação** (Regulares → Expeditos → Especiais → Estágios de Qualificação → Aperfeiçoamento Avançado → as demais), dentro pela sigla; turmas pela ordem do curso e depois o ano; **função única** em `lib/dominio/` | Não há função única. A lista de classificações põe **Aperfeiçoamento Avançado antes de Estágio**; o catálogo ordena pela collation do banco; `/turmas` por ano e código; o Início por `localeCompare`; o submenu tem um comparador local para cursos e outro para turmas | melhoria |
| **4** | **Sininho de avisos** no cabeçalho: número, pulso sutil enquanto houver aviso não visto (respeita *reduzir movimento*), para ao abrir, volta só com aviso novo (*visto* no navegador); página só de avisos, por módulo, com link para onde se resolve; os **quadros de aviso das páginas saem**, sem perder aviso | **Oito quadros** de aviso em seis telas (curso, Início, turmas, ficha da turma, instrutores, ficha do instrutor), cada um com o recorte da tela; nenhuma rota de avisos; o cabeçalho tem nome · perfil, tema e avatar | melhoria |
| **5** | Curso: a aba **Grade** vira **Turmas** e concentra as turmas; **Sobre o Curso** só com informações gerais (disciplinas e avaliações saem, sem duplicar); **Horários** mostra e edita os regimes, sem as vigências | *Sobre* repete a grade curricular (que está em *Disciplinas*) e traz as avaliações previstas com caráter e fórmula da MF (que **não** estão em outra aba); *Horários* mostra os regimes e as vigências do regime padrão; a página do curso é **só leitura** (A-1 da spec 021) | melhoria |
| **6** | DSA, cores dos cartões no preenchimento (tokens; o texto continua): aula, atividade e Estudo Individual em **azul claro**; avaliação em **verde**; alerta/conflito em **amarelo**; feriado e dia parado em **roxo/lilás**; o papel não muda | Aula em verde (`executado`), atividade, EI e avaliação em cinza (`nao-letivo`/`reserva`), conflito em `conflito`, feriado e dia parado em `inativo`. **Os quatro tons pedidos já existem como token** nos dois temas: `planejado` (azul claro), `executado` (verde), `atrasado` (amarelo) e `conformidade` (lilás) | melhoria |

**Já feito, não refazer:** nada dos seis itens. **Defeito achado na triagem** 🐛: o aviso do DSA *"Este curso não tem
vigência de regime que cubra esta semana… Abra o curso"* aponta para a **ficha da turma**, não para o curso
(`dsa/page.tsx:416-427`) — corrigido no item 4 (o link vai a *Editar curso* → *Horários*).

## 4. Autorizações nominais diante de requisito escrito *(o pedido de Bernardo Villas Boas, 22/10/2026)*

- **A-1 · Botão de ícone** emenda o **FR-031 da fatia (b) do Épico 4** (*"o ícone acompanha o rótulo, nunca o
  substitui"*): nos botões padrão, o ícone **substitui** o rótulo, que fica na **dica** e no **nome acessível** — o
  pedido é explícito e posterior. O rótulo continua nos diálogos de confirmação destrutiva e no rodapé dos diálogos (D-3).
- **A-2 · Os quadros de aviso saem das páginas** e passam ao **sininho** e à página **Avisos**: emenda o **RF-INI-04**
  (*"consolidar os alertas mais urgentes… sem exigir navegação adicional"*), o **RF-INSTR-09** (*"quadro de avisos de
  qualidade de cadastro"*) e o **RNF-USA-04** (*"sempre visíveis, nunca ocultos por padrão"*). O que fica sempre
  visível é a **contagem** no cabeçalho, em **toda** tela; a lista está a um clique. Alternativa registrada: manter uma
  linha compacta no Início (*"N avisos — ver"*).
- **A-3 · A aba *Horários* "edita os regimes"** sem desfazer a **A-1 da spec 021** (*"página do curso SÓ LEITURA"*): a
  aba mostra os regimes e traz o **ícone *Editar*** que leva a *Editar curso* → *Horários*, onde cada regime se edita em
  **diálogo**.
- **A-4 · A ordem das classificações** emenda o **FR-003 da spec 009** (Q-08, 16/09/2026: *"Regular · Expedito ·
  Especial · Aperfeiçoamento Avançado · Estágio de Qualificação"*, a ordem do Glossário e da v1.0): passa a **Regular ·
  Expedito · Especial · Estágio de Qualificação · Aperfeiçoamento Avançado**, em todo lugar. E emenda o **A-5 da spec
  019** (o submenu de turmas só pela ordem natural): as turmas passam a seguir a ordem do curso.

## Clarifications

### Session 2026-10-22 *(adotadas por padrão — Bernardo confere no fim)*

- D-1 · Q: O que é "a ficha do instrutor" como modelo? → A: **leitura por padrão, e o formulário só depois de um
  clique**. O formulário **longo** fica em **página própria** (a da disciplina é nova) ou atrás do *Editar* da própria
  ficha, como no instrutor e na turma (que já seguem o modelo e ficam como estão); o **curto** vai para **diálogo**.
  Formulário que já mora numa página de edição (*Editar curso*: cadastro, dados do currículo, vigência; a conta em
  `/admin/usuarios/[id]`) é a página própria e fica.
- D-2 · Q: Onde mora a página própria da disciplina? → A: dentro da edição do curso, para não desfazer a A-1/A-3 da spec
  021: **`/cursos/[curso]/editar/disciplinas/[disciplina]`** (editar, com as UEs e as avaliações do currículo em
  diálogo) e **`/cursos/[curso]/editar/disciplinas/nova`** (cadastrar, no currículo escolhido). Na grade, a linha de
  *Editar curso* ganha o ícone *Editar*; a da página do curso continua só leitura.
- D-3 · Q: E o botão de gravar dentro de um diálogo de formulário? → A: **com texto**, como o da confirmação destrutiva
  (*Cancelar* · *Salvar*): o diálogo já é o passo focado. Alternativa: ícone também ali.
- D-4 · Q: Quais botões viram ícone? → A: os **verbos padrão de ação** — editar, excluir, desativar, reativar, imprimir,
  salvar/gravar, novo/nova, cadastrar, arquivar, desarquivar, descartar, baixar, redefinir senha, trocar situação,
  registrar, acrescentar, retirar, desfazer, parar dia, limpar filtros, carregar/substituir PDF, enviar/remover foto,
  abrir o DSA — e o **tema** (claro, escuro, sistema). Navegação (*Semana anterior*, *Voltar à turma*, *Ver todas as
  turmas*) e links no meio do texto ficam como estão.
- D-5 · Q: O `aria-label` muda? → A: **não**: é o texto de hoje (*"Desativar curso"*, *"Gravar alterações"*…), e a dica
  mostra o mesmo — quem lê com leitor de tela não perde nada, e os testes que acham o botão pelo nome continuam valendo.
  Enquanto grava, o nome passa a *"Gravando…"* e o ícone vira o indicador de espera.
- D-6 · Q: Ordem dentro da classificação: a sigla com ou sem os hífens? → A: **sem os hífens**, a ordem natural do
  Bloco 4 (a que põe *CAHO* antes de *C-Ap-FR*, como no exemplo de Bernardo). Turmas: a ordem do curso, depois o **ano
  mais recente primeiro**, depois o código. O seletor de turma da aba *Turmas* (um curso só) mantém o `FR-035` da spec
  009. As classificações fora da lista (geral, EAD semipresencial) vêm depois, na ordem do enum.
- D-7 · Q: O que conta como "quadro de aviso" (sai da página) e o que fica? → A: sai o **bloco cujo propósito é listar
  pendências** (os oito da §6); fica o **estado do próprio item** onde ele está — o selo *em atraso* no cartão, o
  *Atrasada* da avaliação, o sinal *sem instrutor* na linha da disciplina, a soma das UEs no detalhe, os cartões de teto
  da turma, as mensagens do DSA sobre a própria semana e as marcas da grade.
- D-8 · Q: O alcance da página Avisos? → A: **tudo o que a pessoa alcança** (a RLS recorta), sem o filtro da tela de
  origem, e cada quadro com o recorte que ele já tinha: cursos **em oferta** (o fora de oferta não se edita); o painel
  de `/turmas` nas turmas **planejadas e ativas** (de cada ano que tem uma); o quadro de cadastro da ficha em **toda
  turma não arquivada**, como a ficha mostrava (a arquivada trava a edição, D-COR-5); o andamento pelo mesmo
  `andamentoDaTurma` (só a ativa entra em atraso); vistas e tetos das não arquivadas; o conflito na **semana atual**;
  instrutores **ativos** (a ficha do inativo não mostrava alerta, CHK019). *(Detalhada na implementação.)*
- D-9 · Q: Como o sininho fica atualizado, se o cabeçalho não se redesenha ao navegar? → A: a folha do sininho pede o
  **resumo** (`GET /avisos/resumo`: o total e as chaves) ao abrir a página e a cada troca de rota, **no máximo uma vez a
  cada 2 minutos**; a página Avisos sempre lê na hora.
- D-10 · Q: O que é "visto"? → A: abrir a página **Avisos** marca como vistas, **neste navegador**, as chaves que ela
  mostra; o pulso volta quando o resumo traz uma chave que não está entre as vistas. Sem banco.
- D-11 · Q: As avaliações previstas (caráter, fórmula da MF) saem de *Sobre o Curso* para onde? → A: para o topo da
  aba **Avaliações** — hoje elas só existem em *Sobre*, e *"sem duplicar"* não pode virar *"sem mostrar"*. A grade
  curricular sai sem mudança (a aba *Disciplinas* já a mostra, com a CH e o total).
- D-12 · Q: O endereço antigo `?aba=grade`? → A: **redireciona** para `?aba=turmas`, mantendo a turma escolhida.
- D-13 · Q: Os cartões do DSA: quais tokens? → A: azul claro = `planejado`, verde = `executado`, amarelo = `atrasado`,
  lilás = `conformidade` (o mesmo lilás da turma concluída — é o tom, não o significado). O valor `data-tom` de cada
  célula não muda; muda só a classe. O papel não muda.

### Na implementação, 22/10/2026 *(adotadas por padrão — Bernardo confere no fim)*

- D-14 · Q: Onde o "visto" fica guardado? → A: no armazenamento do navegador (`ciaara.avisos.vistos`), com as
  **últimas 2.000** chaves; sem armazenamento (janela privada), o pulso continua enquanto houver aviso — o lado seguro.
- D-15 · Q: O mesmo fato dito por dois quadros (a janela incompleta: o painel de `/turmas` e a ficha da turma)? → A:
  **um aviso só**, pela mesma chave (`turmas:sem_janela:<turma>`).
- D-16 · Q: Para onde leva cada aviso? → A: curso sem duração ou sem propósito → *Editar curso*; turmas acima do limite
  → a aba *Turmas* do curso; teto, atraso e cadastro da turma → a ficha; disciplina sem instrutor → as disciplinas da
  ficha; conflito → o DSA da semana; vista → a aba *Avaliações* da turma; instrutor → a ficha dele.
- D-17 · Q: E a "capacitação a corrigir" da ficha do instrutor? → A: **fica** no campo da ficha (estado do item, D-7) e
  **também** entra em *Avisos* — não se perde nem duplica quadro.
- D-18 · Q: Os botões que não são verbo padrão (*Definir tempo*, *Confirmar sugestão*, *Nomear a UE*, *Tirar*, *Sem
  instrutor*, *Pronto*)? → A: **continuam com texto**, e os que abrem formulário abrem diálogo.
- D-19 · Q: O nome acessível muda em algum lugar? → A: só onde a página nova juntou ações do mesmo verbo: na página
  própria da disciplina, *Desativar disciplina* e *Excluir disciplina* (eram *Desativar* e *Excluir* no detalhe da
  linha); nas linhas, *Editar a unidade N* e *Editar PM 1* (já eram assim); o tema, *Tema claro*, *Tema noturno* e
  *Tema do sistema*. Nos demais, o texto de antes (D-5).
- D-20 · Q: Na grade de *Editar curso*, por onde se chega à página da disciplina? → A: pelo ícone *Editar disciplina* do
  detalhe da linha (o caminho por teclado) e pelo da coluna *Ações* (atalho de mouse, fora da tabulação da grade, como
  o código da turma em `/turmas`).
- D-21 · Q: Depois de criar a disciplina na página do cadastro? → A: **de volta às disciplinas de *Editar curso***,
  onde a linha nova aparece e de onde se abre a página dela para as UEs e as avaliações.

## 5. Requisitos

### FR-001 — Botões de ícone (item 1)
- **FR-001.1**: Os botões dos verbos padrão (D-4) MUST ser **ícone** com **dica** e **nome acessível** iguais ao rótulo
  de hoje (D-5), de **um componente só** (`BotaoDeIcone`), com o ícone de um **vocabulário fechado** por ação.
- **FR-001.2**: As ações de página e de tabela MUST ficar **no topo e à direita** (a barra de ações alinha à direita);
  as da linha, na última coluna, à direita.
- **FR-001.3**: Os botões **dentro** de diálogo de confirmação destrutiva e o rodapé dos diálogos de formulário MUST
  continuar **com texto** (A-1, D-3).
- **FR-001.4**: Uma **guarda** MUST reprovar botão de texto com verbo padrão em tela nova ou antiga, fora dos diálogos.
- **FR-001.5**: O seletor de **tema** MUST ser três ícones (claro, escuro, sistema), com o estado em `aria-pressed`.

### FR-002 — Formulários em diálogo ou página própria (item 2)
- **FR-002.1**: Nenhuma página de **leitura** MUST mostrar campo de formulário aberto; o formulário curto MUST abrir em
  **diálogo** a partir de um ícone, e o longo em **página própria** ou atrás do *Editar* da ficha (D-1).
- **FR-002.2**: A disciplina MUST ter página própria de edição e de cadastro (D-2), com as UEs e as avaliações do
  currículo editadas em diálogo.
- **FR-002.3**: Gravar no diálogo MUST fechá-lo e mostrar a resposta na página; a recusa MUST ficar no diálogo, com o
  que foi digitado. O pedido de justificativa da RC-6 (spec 021) MUST continuar valendo.

### FR-003 — Ordem por classificação (item 3)
- **FR-003.1**: Uma **função única** de `lib/dominio/` MUST ordenar cursos (classificação, depois a sigla, D-6) e
  turmas (a ordem do curso, depois o ano mais recente, depois o código).
- **FR-003.2**: O catálogo, a lista de turmas, os cartões e as manchetes do Início, o submenu da lateral, a aba
  *Turmas* do curso e as listas de curso dos filtros MUST usar essa função; a lista das classificações MUST seguir a
  ordem pedida (Estágios de Qualificação antes de Aperfeiçoamento Avançado).

### FR-004 — Sininho e página de avisos (item 4)
- **FR-004.1**: O cabeçalho de toda tela autenticada MUST ter o **sininho** com o **número** de avisos, que leva à
  página **Avisos**.
- **FR-004.2**: Enquanto houver aviso **não visto**, o sininho MUST **pulsar** em tons da mesma cor; com *reduzir
  movimento*, MUST ficar parado (o número continua); abrir a página Avisos MUST parar o pulso (D-10).
- **FR-004.3**: A página Avisos MUST listar **todos** os avisos dos quadros removidos (§6), **agrupados por módulo**,
  cada um com o **link para onde se resolve**, com o estado vazio *"Nenhum aviso"* e a distinção *"não pude ler"*.
- **FR-004.4**: Os oito quadros da §6 MUST sair das páginas, e **nenhum aviso** deles MUST se perder.

### FR-005 — As abas do curso (item 5)
- **FR-005.1**: A aba *Grade* MUST passar a **Turmas** (valor `turmas`; `?aba=grade` redireciona, D-12).
- **FR-005.2**: *Sobre o Curso* MUST trazer só as informações gerais; as avaliações previstas MUST ir para a aba
  *Avaliações* (D-11).
- **FR-005.3**: *Horários* MUST mostrar os regimes, **sem** as vigências, com o ícone *Editar* (A-3).

### FR-006 — Cores dos cartões do DSA (item 6)
- **FR-006.1**: Na tela de preenchimento, os cartões MUST usar os tokens da D-13 por tipo; o texto de cada cartão MUST
  continuar; o papel (`/print/dsa`) MUST NOT mudar.

## 6. Os avisos de hoje e para onde vão (FR-004.4)

| Quadro que sai | Tela de hoje | Avisos | Passa a aparecer em *Avisos* → módulo, e o link |
|---|---|---|---|
| Avisos do curso | `/cursos/[curso]` | duração em semanas não informada · propósito não informado · turmas acima do limite do ano | **Cursos** → *Editar curso* (dados do currículo) · a aba *Turmas* do curso |
| Turmas com teto excedido | `/cursos/[curso]` e o Início | AEC/TAD/TR acima do previsto ou do máximo | **Turmas** → a ficha da turma (cartões de teto) |
| Turmas exigindo atenção | `/inicio` | turma ativa com saldo de carga negativo (em atraso) | **Turmas** → a ficha da turma (Andamento) |
| Vistas de prova | `/inicio` e a ficha da turma | vista atrasada · vence em breve | **Avaliações** → a aba *Avaliações* da turma |
| O que falta nas turmas | `/turmas` | sem janela de datas · disciplina sem instrutor · conflito no DSA desta semana | **Turmas** → *Editar turma* · as disciplinas da turma · o DSA da semana |
| Avisos de qualidade de cadastro da turma | `/turmas/[turma]` | ativa com término passado · planejada com início passado · janela incompleta · sem sala · sem efetivo · sem disciplina · semanas da turma × do curso | **Turmas** → a ficha da turma |
| Avisos de qualidade de cadastro dos instrutores | `/instrutores` | sem NIP · campo obrigatório pendente · data de início de docência não informada | **Instrutores** → a ficha do instrutor |
| Alertas da ficha do instrutor | `/instrutores/[codigo]` | carga semanal fora da faixa (por semana) · docência há mais de um ano sem capacitação · capacitação a corrigir | **Instrutores** → a ficha do instrutor |
| *(defeito)* Sem vigência de regime na semana | `/turmas/[turma]/dsa` | a mensagem fica na tela do DSA | o link passa a *Editar curso* → *Horários* |

O que **fica** onde está (D-7): o selo *em atraso*, a coluna *Avisos* da aba *Turmas*, os avisos do previsto por
disciplina na aba *Avaliações*, os cartões de teto e de avaliações da ficha, os sinais por disciplina, a soma das UEs,
as mensagens do DSA sobre a semana, *"O papel sai assim"* e as marcas da grade.

## 7. Critérios de sucesso

- **SC-001**: Nenhuma página de leitura tem campo de formulário aberto (guarda e e2e), e toda edição chega por clique.
- **SC-002**: A guarda dos botões reprova com um botão de texto de volta (visto falhar), e passa com o repositório.
- **SC-003**: A mesma lista de cursos e de turmas sai na mesma ordem no catálogo, em `/turmas`, no Início, no submenu e
  na aba *Turmas* — provado pela função única e por e2e.
- **SC-004**: Cada aviso dos oito quadros aparece na página Avisos com o link certo (e2e por módulo), e o sininho pulsa
  com aviso novo e para ao abrir a página (e2e), parado com *reduzir movimento*.
- **SC-005**: As telas e o papel do DSA dão o **mesmo número** antes e depois (o retrato das telas do Bloco 6,
  idêntico); só a cor dos cartões muda na tela.
