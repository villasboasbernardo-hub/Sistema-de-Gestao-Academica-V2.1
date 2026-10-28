# Padrões de tela — RT-1 a RT-8 (decisões de Bernardo Villas Boas, 24 e 28/10/2026)

Pedido do **Bloco 10** pelo `/corrigir` (24/10/2026); a **RT-8** veio do pedido do **Bloco 14** (28/10/2026, spec 029).
As oito regras valem para **toda tela, nova ou antiga**. Elas
continuam as do Bloco 7 (spec 022: o botão de ícone, a edição em diálogo ou página própria, a ordem por classificação)
e **prevalecem** sobre texto anterior de spec quando divergirem. Tela nova nasce seguindo-as; tela antiga que não as
segue é defeito de padrão, corrigido no bloco que a tocar.

> **Emenda de 28/10/2026** *(pedido de Bernardo Villas Boas no `/corrigir` do Bloco 14, spec 029, `FR-007`)*: entra a
> **RT-8** — a turma arquivada continua nas estatísticas do ano dela. O título e a contagem (*"As sete regras"*)
> passaram a oito; RT-1 a RT-7 não mudam. O que ela emenda está na seção **RT-8**, abaixo da tabela.

A primeira coluna é o texto de Bernardo; a segunda, como a regra se aplica no código.

| # | A regra | Como se aplica |
|---|---|---|
| **RT-1** | *"Ações no canto superior direito, enfileiradas, ícones com dica; a dica é só o verbo; confirmações com botões escritos."* | As ações da página ficam numa barra só (`BarraDeAcoes`), na linha do título, à direita; as de linha, na última coluna, à direita. Toda ação é um `BotaoDeIcone` do vocabulário fechado. A **dica** (o que aparece ao apontar ou focar) é **só o verbo** da ação (*Editar*, *Desativar*, *Reativar*, *Excluir*, *Arquivar*…); o **nome acessível** continua completo (*"Excluir a turma C-Ap-FR 2026"*), para o leitor de tela. Na barra, o destrutivo vem **por último**. Diálogo de confirmação e rodapé de diálogo de formulário levam botões **com texto** (*Cancelar*, *Excluir permanentemente*, *Salvar*). |
| **RT-2** | *"Tudo que se cadastra tem Editar, Desativar/Reativar e Excluir (permanente, com alerta); 'Inativar' vira 'Desativar' em todo o sistema."* | Todo cadastro tem os três verbos (na turma e no currículo, *Arquivar/Desarquivar* faz o papel de *Desativar/Reativar*). **Excluir** é permanente, pede confirmação com o alerta de que não se desfaz, e só vale para registro **sem histórico** — a regra 4 do `CLAUDE.md` e a **D-COR-6**: com registros, o ícone aparece **desabilitado**, com a dica *"tem registros: use Desativar"* (ou *"use Arquivar"*). O verbo é sempre **Desativar**; o estado continua *inativo/inativa*. |
| **RT-3** | *"Edição só em janela ou página própria; um único Editar edita tudo da entidade."* | *Editar* abre um **diálogo** (formulário curto) ou uma **página própria** (formulário longo); nenhum formulário aberto ou recolhido dentro de página de leitura. Um *Editar* por entidade, que edita **tudo** dela (na turma, inclusive a situação, com a observação). Um *Salvar* por diálogo, página ou aba. |
| **RT-4** | *"Filtros e Estatísticas são ícones na mesma linha das ações, abrem painel recolhível; estatísticas com um card por categoria + total + quantidades."* | Os ícones *Filtros* (com o número de filtros ativos) e *Estatísticas* entram na barra de ações da página, ao lado de *Novo…*, e abrem um painel recolhível abaixo do cabeçalho; os dois começam recolhidos, e abrir ou fechar não muda a URL. As estatísticas têm **um cartão por categoria**, **um cartão com o total** e o **gráfico com as quantidades**. |
| **RT-5** | *"Todo gráfico é interativo: clicar na legenda ou na série oculta/mostra o grupo (já existiu em versão antiga)."* | A legenda de todo gráfico é feita de botões que ocultam e mostram o grupo (a fatia, a barra ou a série); clicar no próprio grupo faz o mesmo. Oculto, o gráfico **se redistribui** — os percentuais são refeitos sobre o que ficou à vista — e *Mostrar todos* desfaz. A legenda continua sendo a leitura em texto do gráfico. *(A v2.0 usava ApexCharts, cuja legenda alterna por padrão; é a "versão antiga". Fecha o `FR-026.6` da spec 006, parado na T119 à espera desta definição.)* |
| **RT-6** | *"Seletor de ano aceita qualquer ano, padrão = ano da data atual, todos os módulos mostram só o ano selecionado, virada automática."* | Um seletor de ano só, que oferece **qualquer ano** (não só os que têm dado), abre no ano de hoje em São Paulo (`hojeNaCiaara()`) e vira sozinho em 1º de janeiro. O ano escolhido vale para **todos os módulos** — Início, Turmas, Instrutores e a carga, Disciplinas, Calendário — e cada um mostra só o ano escolhido. Nenhum ano escrito à mão no código (guarda `ano-sem-numero-fixo.test.ts`). ⚠️ **E O ANO DE TODA INFORMAÇÃO LIGADA A TURMA É O ANO DA TURMA** *(emenda de Bernardo Villas Boas, 24/10/2026)*: *"o ano de qualquer informação ligada a turma é o ANO DA TURMA, nunca a data do registro ou a janela da atribuição"* — a carga do instrutor (prevista e ministrada), as atribuições, os alertas de faixa, o selecionado, os filtros de curso de Instrutores, as atividades de turma. O que não tem turma (feriado, parada global, atividade global) continua pela data. |
| **RT-7** | *"Cartões de indicadores juntos, mesmo tamanho e padrão."* | Os cartões de uma tela ficam numa faixa só, em grade, todos do mesmo tamanho e do mesmo desenho (rótulo, valor, detalhe), sem cartão solto no meio da página. |
| **RT-8** | *"Arquivar esconde a turma das listas do dia a dia — carrossel das turmas, submenu, listas de ativas e de escolha, avisos —, mas ela CONTINUA contando nas estatísticas e nos cartões do ano dela, com a situação que tinha."* | Arquivar não muda a situação da turma (D-COR-5). Ela **some** do carrossel das turmas do Início, do submenu de Turmas, da tabela de `/turmas` (que volta a mostrá-la com *Mostrar arquivadas*), das listas de escolha (o seletor de turma, a cascata de `/disciplinas`, o filtro de `/atividades`, o Calendário) e dos avisos. E **continua contando**, no **ano dela** (RT-6) e **pela situação que tinha**, nos cartões do Início (*Turmas ativas* · *Planejadas* · *Concluídas* · *Canceladas*) e nos indicadores de `/turmas` (*Total* · *Planejadas* · *Em andamento* · *Concluídas* · *Canceladas*), **com ou sem** *Mostrar arquivadas*. *Iniciando em até N dias* **não** a conta: não é situação, e a arquivada está travada (D-18). O carrossel dos **DSA publicados** do Início também não a mostra — é vista do dia a dia; o DSA dela segue alcançável pela ficha e pelo *Reimprimir* (D-17). Em `/turmas`, o cabeçalho conta a tabela e acrescenta *"· K arquivada(s) fora da lista"*; com todas arquivadas, o vazio diz quantas são e como mostrá-las (D-19). A aba *Turmas* da página do curso **não muda**: é consulta de todas as turmas do curso no ano, com o selo *Arquivada* (RC-9 da spec 021), e não lista de ativas (D-26). Instrutores, a ficha do instrutor e a contagem de turmas por currículo da página do curso **já** contavam a arquivada. *(As D- desta linha são da spec 029, adotadas por padrão e conferidas por Bernardo no fim do bloco.)* |

## Decisão D-COR-6 *(Bernardo Villas Boas, 24/10/2026)*

*"Excluir turma e Excluir feriado só habilitados sem semana salva/publicada ligada; com registros, ícone desabilitado com
dica 'tem registros: use Arquivar/Desativar'."* Ela delimita a RT-2 para a turma e para a linha do calendário. O
desenho no banco (as funções com porteiro, o rastro e o que conta como registro) está na spec 025.

## Decisão D-COR-7 *(Bernardo Villas Boas, 26/10/2026)* — substitui a D-COR-6 para a linha do calendário

*"No Calendário, excluir NÃO é bloqueado, nem com DSA publicado nem com aula no dia. O Admin exclui qualquer lançamento
(feriado, licença administrativa, dia parado), ativo ou inativo, depois de um ALERTA que mostra o impacto e pede
confirmação."* Na linha do calendário, o *Excluir* da RT-2 é **lógico** (a linha some da lista e deixa de contar, e fica no
banco, inativa, com quem e quando), **nunca desabilitado por registro**, sem código digitado, e **só do Admin**. A D-COR-6
continua valendo para a **turma**. O desenho está na spec 027.

## RT-8 *(Bernardo Villas Boas, 28/10/2026 — Bloco 14)* — o que ela emenda

A RT-8 devolve o que a **A-2 da spec 019** (20/10/2026) já dizia — *"Os números do painel continuam contando
todas"* — e que dois filtros em TypeScript tinham desfeito: os cartões do Início e os indicadores de `/turmas` tiravam a
arquivada antes de contar (spec 029 §3, item 7). Ela emenda a **D-26** e o **FR-006.1 da spec 026** (os cartões *"sem
arquivadas"*), o **FR-005.3 da spec 017** (os indicadores *"sem as arquivadas salvo com o filtro"*) e a **C-24 da
spec 017** na parte que pôs o `/inicio` (panorama) entre o que esconde a arquivada; as **listas** que a C-24 enumera
continuam escondendo. Medido na cópia do remoto `remoto-20261028-133702.sql` (spec 029 §3): **21** turmas de 2026
arquivadas — **13** concluídas e **8** canceladas, nenhuma ativa ou planejada —, que os cartões *Concluídas* e
*Canceladas* do Início de 2026, sem recorte, não contavam.

## Onde as regras moram no código

- RT-1 · `components/ciaara/botao-de-icone.tsx` (o vocabulário e a dica), `components/ciaara/barra-de-acoes.tsx`,
  `components/ciaara/dialogo-confirmacao.tsx`; guarda `tests/unidade/botoes-de-icone.test.ts`.
- RT-3 · `components/ciaara/dialogo-de-formulario.tsx`; guarda `tests/e2e/sem-campo-aberto.spec.ts`.
- RT-6 · o seletor `components/ciaara/seletor-de-ano.tsx` e o ano da tela `lib/navegacao/ano-da-tela.ts`
  (`lib/dominio/ano-escolhido.ts`); **o ano da turma**: as views de carga do instrutor (migration
  `20261024213231`, pgTAP `150`), o selecionado e os filtros de curso de Instrutores (`lib/dominio/selecao-no-ano.ts`)
  e as atividades de turma (`app/(app)/atividades/predicado-do-ano.ts`); guarda `ano-sem-numero-fixo.test.ts`.
- RT-8 · a população dos cartões do Início — os cartões do ano **com** a arquivada, o carrossel **sem** ela
  (`lib/dominio/cartoes-do-inicio.ts`) — e os indicadores de `/turmas` (`lib/dominio/painel-de-turmas.ts`).
  `semAsArquivadas` (`lib/dominio/arquivamento-da-turma.ts`) vale para **lista**, nunca para estatística nem cartão do
  ano. Guardas: `contagem-por-situacao.test.ts`, `painel-de-turmas.test.ts` e `inicio-bloco-4.spec.ts` (spec 029).
- As demais ganham componente e guarda no Bloco 10 (spec `025-bloco-10-padroes-de-tela`), registrados lá.
