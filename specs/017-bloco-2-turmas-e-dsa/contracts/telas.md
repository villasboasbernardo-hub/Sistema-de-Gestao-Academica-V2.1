# Contrato — as telas do Bloco 2

*19/10/2026. Todo destino novo é alcançável por clique (regra "tela sem caminho clicável é tela não entregue"); os
`data-slot` abaixo são o que os e2e procuram. Emendado pelo analyze de 19/10/2026.*

**O autor (C-22):** em todo lugar desta página onde aparece *"quem"* ou *"por X"* — o histórico, o TA fora do DSA, o
aviso de arquivada —, o autor sai **pelo nome** para quem lê `usuarios` (Admin, Chefe do Departamento de Ensino,
Encarregado e Ajudante da Administração Acadêmica) e como **"outra conta"** para os demais, o padrão que a ficha já
usa.

## Ficha da turma — `/turmas/[turma]` (menu *Turmas* → linha)

| Bloco | O que mostra | Quem vê a ação | `data-slot` |
|---|---|---|---|
| Aviso de arquivada (topo, antes do cabeçalho) | *"Turma arquivada em DD/MM/AAAA por X — somente leitura. Só o Administrador desarquiva."* e a observação, se houver | todos | `turma-arquivada` |
| Cabeçalho, ao lado de *Trocar situação* | **Arquivar turma** (diálogo: observação opcional; se a situação não é *Concluída*, o aviso *"A turma não está concluída. Arquivada, ela sai das listas e ninguém grava nela até o Administrador desarquivar."* e a confirmação) | `turmas.editar`, turma não arquivada | `arquivar-turma`, `dialogo-de-arquivar`, `aviso-nao-concluida` |
| Cabeçalho, na arquivada | **Desarquivar** (confirmação simples) | só Admin | `desarquivar-turma` |
| Diálogo *Trocar situação* | o campo **Observação** (opcional, até 500), as quatro situações lidas do enum gerado | `turmas.editar`, turma não arquivada | `observacao-da-situacao` |
| *Histórico da situação* (seção recolhível, abaixo do andamento) | uma linha por evento, mais recente primeiro: *"Ativa → Concluída"* / *"Arquivada"* / *"Desarquivada"*, quem, DD/MM/AAAA HH:MM, observação | quem lê a turma | `historico-da-situacao`, `evento-da-situacao` |
| Andamento | *"N TA executados · X no DSA · Y fora do DSA"* quando Y > 0 | quem lê a turma | `execucao-separada` |
| *Disciplinas* (linha) | *"· Y fora do DSA"* junto dos executados; o botão **TA fora do DSA** abre o painel da disciplina: a lista dos registros (data, TA, instrutor, observação, quem, *desfeito* quando for) e o formulário (quantidade, data com **hoje** de São Paulo como valor inicial — `hojeNaCiaara()`, passado pelo servidor —, instrutor opcional pelo seletor único, observação obrigatória), com *Desfazer* por registro | o botão e o formulário: o trio (`ta_fora_do_dsa.editar`), turma não arquivada; a lista: quem lê **lançamento** da turma (`registros_aula.ler` + alcance, a régua das views da CHD) | `ta-fora-do-dsa`, `registro-fora-do-dsa`, `gravar-ta-fora`, `desfazer-ta-fora` |
| Toda ação de gravar (editar turma, trocar situação, arquivar, período, instrutores, avaliações do currículo, previsto PROENS, TA fora do DSA, DSA, **juntar como sessão** na aba Avaliações) | **some** na turma arquivada | — | — |

Confirmações pela URL (`?gravada=`): o contrato já aceita os **seis** valores — `turma`, `situacao`, `arquivada`,
`desarquivada`, `ta-fora` e `ta-fora-desfeito` (`lib/navegacao/contrato.ts` e `enderecoDaTurmaGravada`) —, e a ficha
desenha a mensagem de cada um (`role="status"`); os e2e conferem a mensagem **e** o valor no banco (PEND-016-2).

## Lista — `/turmas` (menu *Turmas*)

| Bloco | O que mostra | `data-slot` |
|---|---|---|
| Painel (no alto, antes dos filtros) | 5 `CardKpi`: **Total**, **Em andamento**, **Concluídas**, **Canceladas**, **Iniciando em até N dias** — do recorte | `painel-de-turmas`, `indicador-de-turmas` (`data-chave`) |
| Quadro de avisos (componente único `AvisosRecolhiveis`) | contagem por tipo sempre à vista; lista recolhível com o código da turma (link à ficha) e o detalhe: **Sem janela de datas** (turma planejada ou ativa, C-27); **Disciplina sem instrutor** (*"3 disciplinas"*); **Conflito no DSA desta semana** — conflito **de pessoa** (C-23): *"com C-Ap-HN 2026"*, *"com outra turma"* (a que a pessoa não alcança) ou *"dentro da própria turma"*; o alerta de sala **não** entra. Sem conseguir ler o que o aviso precisa, o quadro diz *"não pude ler"*, nunca *"nenhum aviso"* (gotcha 4) | `avisos-de-turmas`, `aviso-de-turma` (`data-tipo`) |
| Filtro novo | **Mostrar arquivadas** (parâmetro `arquivadas`, `SIM_OU_NAO`, padrão `""` = esconder), no `FiltroAvancado`, contado pelo `filtrosForaDoPadrao` e limpo pelo `BotaoLimparFiltros` | `filtro-arquivadas` |
| Linha | o selo **Arquivada** (BadgeStatus) junto da situação | `selo-arquivada` |

## Outras listas — a arquivada some (C-24)

**Some**, sem filtro de mostrar: `/inicio` (panorama e alertas); a aba *Grade* da página do curso (lista *Turmas do
curso* e seletor); a **pré-seleção de turma do curso** (`pre-selecao-de-turma.ts`, que alimenta as abas *Grade* e
*Avaliações* — sem isso, ela poderia escolher uma arquivada ativa e mostrar o bloco da *"turma selecionada"* de uma
turma que não está na lista); *"Turmas com teto excedido"* (`BlocoDeLimites`); o filtro de turma de `/atividades`; a
cascata curso → turma de `/disciplinas`. O caminho até ela é `/turmas` com *Mostrar arquivadas*.

**Continua mostrando, por histórico:** a ficha do instrutor (a CH prevista de `vw_instrutor_carga_prevista`) e
`/admin/salas`. Todo outro leitor de lista de turma (18 arquivos de `app/` leem `from("turmas")`, medido no analyze)
entra numa das duas listas, nominalmente, na T038.

## DSA, impressão e planilha da arquivada

Abrem só para ler. ⚠️ **A arquivada desliga só o formulário de gravar, por uma marca própria (`arquivada`)** — e não
pelo *"pode lançar"*: o botão e a rota da planilha usam a **mesma** condição, `podeLancarNoDsa`
(`dsa/planilha/acesso.ts`: *"uma condição só, para a rota e para os dois botões"*), e desligá-la sumiria com a
planilha, contra o FR-004.3. `podeBaixarPlanilhaDeContingencia` continua **igual**. O aviso de arquivada
(`turma-arquivada`) aparece no topo do DSA; *Imprimir* abre `/print/dsa` e *Baixar planilha de contingência* continua
visível e respondendo.

## Cadastro da disciplina — painel *Editar* (menu *Disciplinas* → curso → disciplina)

| Campo | Regra | `data-slot` |
|---|---|---|
| **Nome no DSA** | opcional, até L caracteres, **só no modo de edição** (C-19); acima de L, a recusa diz o limite na frase; abaixo, a prévia *"No cartão do DSA: «…»"* (o nome cadastrado, ou a abreviação automática, ou o nome inteiro **como está** quando cabe, C-25) | `nome-no-dsa`, `previa-do-cartao` |
| Técnica sugerida e Local padrão | passam a vir **preenchidos** com o valor gravado (defeito: hoje vêm vazios e a gravação os apagava) | — |

## O cartão do DSA

| Superfície | Título do cartão | Garantia |
|---|---|---|
| Tela (`grade-dsa.tsx`, na grade com relógio e na lista sem relógio — `CorpoDoBloco`) | `nomeNoCartao` + código | título em 1 linha (reticências), tópico cede (`line-clamp`), instrutor em 1 linha **sempre visível** e dentro do cartão, inclusive no de 1 TA; o `aria-label` mantém o nome inteiro |
| Papel (`DocumentoDoDsa`/`documento.css`) | `nomeNoCartao` + código | título em 1 linha, tópico recorta (`overflow: hidden`), pé (instrutor) `flex: none` e sempre dentro do cartão; quadro de CH com o nome inteiro, na ordem natural |
| Planilha (PREENCHIMENTO, BD DISCIPLINAS) | coluna nova `DISC_NOME_DSA` no catálogo, lida pelo título do cartão; `DISC_NOME` continua para o quadro | rodapé (IMPRESSÃO) na ordem natural, igual ao papel; a célula de 1 TA (34 pt) fica como **limite conhecido** — a garantia do instrutor é de tela e papel (P-8) |
