# Padrões de tela — RT-1 a RT-7 (decisão de Bernardo Villas Boas, 24/10/2026)

Pedido do **Bloco 10** pelo `/corrigir` (24/10/2026). As sete regras valem para **toda tela, nova ou antiga**. Elas
continuam as do Bloco 7 (spec 022: o botão de ícone, a edição em diálogo ou página própria, a ordem por classificação)
e **prevalecem** sobre texto anterior de spec quando divergirem. Tela nova nasce seguindo-as; tela antiga que não as
segue é defeito de padrão, corrigido no bloco que a tocar.

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

## Decisão D-COR-6 *(Bernardo Villas Boas, 24/10/2026)*

*"Excluir turma e Excluir feriado só habilitados sem semana salva/publicada ligada; com registros, ícone desabilitado com
dica 'tem registros: use Arquivar/Desativar'."* Ela delimita a RT-2 para a turma e para a linha do calendário. O
desenho no banco (as funções com porteiro, o rastro e o que conta como registro) está na spec 025.

## Onde as regras moram no código

- RT-1 · `components/ciaara/botao-de-icone.tsx` (o vocabulário e a dica), `components/ciaara/barra-de-acoes.tsx`,
  `components/ciaara/dialogo-confirmacao.tsx`; guarda `tests/unidade/botoes-de-icone.test.ts`.
- RT-3 · `components/ciaara/dialogo-de-formulario.tsx`; guarda `tests/e2e/sem-campo-aberto.spec.ts`.
- As demais ganham componente e guarda no Bloco 10 (spec `025-bloco-10-padroes-de-tela`), registrados lá.
