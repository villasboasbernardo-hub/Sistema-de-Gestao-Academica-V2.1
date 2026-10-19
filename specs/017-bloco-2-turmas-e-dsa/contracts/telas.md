# Contrato — as telas do Bloco 2

*19/10/2026. Todo destino novo é alcançável por clique (regra "tela sem caminho clicável é tela não entregue"); os
`data-slot` abaixo são o que os e2e procuram.*

## Ficha da turma — `/turmas/[turma]` (menu *Turmas* → linha)

| Bloco | O que mostra | Quem vê a ação | `data-slot` |
|---|---|---|---|
| Aviso de arquivada (topo, antes do cabeçalho) | *"Turma arquivada em DD/MM/AAAA por X — somente leitura. Só o Administrador desarquiva."* e a observação, se houver | todos | `turma-arquivada` |
| Cabeçalho, ao lado de *Trocar situação* | **Arquivar turma** (diálogo: observação opcional; se a situação não é *Concluída*, o aviso *"A turma não está concluída. Arquivada, ela sai das listas e ninguém grava nela até o Administrador desarquivar."* e a confirmação) | `turmas.editar`, turma não arquivada | `arquivar-turma`, `dialogo-de-arquivar`, `aviso-nao-concluida` |
| Cabeçalho, na arquivada | **Desarquivar** (confirmação simples) | só Admin | `desarquivar-turma` |
| Diálogo *Trocar situação* | o campo **Observação** (opcional, até 500), as quatro situações lidas do enum gerado | `turmas.editar`, turma não arquivada | `observacao-da-situacao` |
| *Histórico da situação* (seção recolhível, abaixo do andamento) | uma linha por evento, mais recente primeiro: *"Ativa → Concluída"* / *"Arquivada"* / *"Desarquivada"*, quem, DD/MM/AAAA HH:MM, observação | quem lê a turma | `historico-da-situacao`, `evento-da-situacao` |
| Andamento | *"N TA executados · X no DSA · Y fora do DSA"* quando Y > 0 | quem lê a turma | `execucao-separada` |
| *Disciplinas* (linha) | *"· Y fora do DSA"* junto dos executados; o botão **TA fora do DSA** abre o painel da disciplina: a lista dos registros (data, TA, instrutor, observação, quem, *desfeito* quando for) e o formulário (quantidade, data com hoje sugerido, instrutor opcional pelo seletor único, observação obrigatória), com *Desfazer* por registro | o botão e o formulário: o trio (`ta_fora_do_dsa.editar`), turma não arquivada; a lista: quem lê a turma | `ta-fora-do-dsa`, `registro-fora-do-dsa`, `gravar-ta-fora`, `desfazer-ta-fora` |
| Toda ação de gravar (editar turma, período, instrutores, avaliações do currículo, previsto PROENS, DSA) | **some** na turma arquivada | — | — |

Confirmações pela URL (`?gravada=`): `situacao` (já existe), `arquivada`, `desarquivada`, `ta-fora`, `ta-fora-desfeito`
— o contrato de `?gravada=` ganha as quatro.

## Lista — `/turmas` (menu *Turmas*)

| Bloco | O que mostra | `data-slot` |
|---|---|---|
| Painel (no alto, antes dos filtros) | 5 `CardKpi`: **Total**, **Em andamento**, **Concluídas**, **Canceladas**, **Iniciando em até N dias** — do recorte | `painel-de-turmas`, `indicador-de-turmas` (`data-chave`) |
| Quadro de avisos (componente único `AvisosRecolhiveis`) | contagem por tipo sempre à vista; lista recolhível com o código da turma (link à ficha) e o detalhe: **Sem janela de datas**; **Disciplina sem instrutor** (*"3 disciplinas"*); **Conflito no DSA desta semana** (*"com C-Ap-HN 2026"* ou *"com outra turma"*) | `avisos-de-turmas`, `aviso-de-turma` (`data-tipo`) |
| Filtro novo | **Mostrar arquivadas** (parâmetro `arquivadas`, `SIM_OU_NAO`, padrão `""` = esconder), no `FiltroAvancado`, contado pelo `filtrosForaDoPadrao` e limpo pelo `BotaoLimparFiltros` | `filtro-arquivadas` |
| Linha | o selo **Arquivada** (BadgeStatus) junto da situação | `selo-arquivada` |

## Outras listas — a arquivada some

`/inicio` (panorama e alertas), aba *Grade* da página do curso (lista *Turmas do curso* e seletor), o filtro de turma
de `/atividades`. Sem filtro de mostrar; o caminho até ela é `/turmas` com *Mostrar arquivadas*.

## DSA, impressão e planilha da arquivada

Abrem só para ler: o painel de lançamento não oferece gravar (o mesmo modo de quem não pode lançar), e o aviso de
arquivada aparece no topo do DSA. Imprimir e baixar a planilha continuam.

## Cadastro da disciplina — painel *Editar* (menu *Disciplinas* → curso → disciplina)

| Campo | Regra | `data-slot` |
|---|---|---|
| **Nome no DSA** | opcional, até L caracteres; abaixo, a prévia *"No cartão do DSA: «…»"* (o nome cadastrado, ou a abreviação automática, ou o nome inteiro quando cabe) | `nome-no-dsa`, `previa-do-cartao` |
| Técnica sugerida e Local padrão | passam a vir **preenchidos** com o valor gravado (defeito: hoje vêm vazios e a gravação os apagava) | — |

## O cartão do DSA

| Superfície | Título do cartão | Garantia |
|---|---|---|
| Tela (`grade-dsa.tsx`) | `nomeNoCartao` + código | título em 1 linha (reticências), tópico cede (`line-clamp`), instrutor em 1 linha **sempre visível**; o `aria-label` mantém o nome inteiro |
| Papel (`DocumentoDoDsa`/`documento.css`) | `nomeNoCartao` + código | título em 1 linha, tópico recorta (`overflow: hidden`), pé (instrutor) `flex: none` e sempre dentro do cartão; quadro de CH com o nome inteiro, na ordem natural |
| Planilha (PREENCHIMENTO, BD DISCIPLINAS) | coluna nova `DISC_NOME_DSA` no catálogo, lida pelo título do cartão; `DISC_NOME` continua para o quadro | rodapé (IMPRESSÃO) na ordem natural, igual ao papel |
