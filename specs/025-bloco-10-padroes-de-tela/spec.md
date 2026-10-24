# Spec 025 — Bloco 10: padrões de tela, turma, curso, estatísticas, calendário e ano

**Pedido:** Bernardo Villas Boas, 24/10/2026, pelo `/corrigir` — *"Bloco 10 — padrões de tela, turma, curso,
estatísticas, calendário e ano"*, com as regras **RT-1 a RT-7** e a decisão **D-COR-6**. **Ramo:**
`feat/BLOCO-10-padroes-de-tela`, a partir da `main` `cce2289` (spec 024 encerrada). **Regras:**
[`docs/correcoes/padroes-de-tela.md`](../../docs/correcoes/padroes-de-tela.md), criado antes da implementação e apontado
no `CLAUDE.md`. **Banco:** uma migration, **pelo portão 9.4** — a exclusão permanente de turma e de linha do calendário
(D-COR-6) estende a regra 4; o desenho está no §6 e **espera Bernardo antes do remoto**.

## 1. O problema, em uma frase

As telas seguem o Bloco 7 pela metade: a ficha da turma tem identificação solta, ações espalhadas e o *Editar* no fim
da página; filtros e estatísticas são botões de texto em linhas próprias; nenhum gráfico responde a clique; o ano é
escolhido só em três telas e só entre os anos que já têm dado; e os cadastros não têm todos os mesmos verbos.

## 2. Paridade ou novidade (regra 3)

- **Padrão de tela** (RT-1, RT-3, RT-4, RT-7 e os itens 1, 2, 4 a 7, 11 e 12): nenhum dado e nenhuma regra `RN-` mudam;
  muda onde e como a tela mostra e edita.
- **Novidade pedida nominalmente** (regra 3, autorização de Bernardo neste pedido): a **exclusão permanente** de turma e
  de linha do calendário (RT-2 e D-COR-6, que estendem a regra 4 — §6); o **gráfico interativo** (RT-5, que fecha o
  `FR-026.6` da spec 006, parado na T119 *"vira requisito novo, que Bernardo define"*); o **ano único para todos os
  módulos** (RT-6).
- **Contenção de escopo (regra 2):** tudo é da CIAARA-11 — turma, curso, instrutor, calendário letivo, DSA.
- **Documento 04:** nenhuma regra muda. A `RN-2027-06` (faixa de CH docente) continua; o aviso de carga continua **só
  acima** da faixa (A-6 da spec 022). A `RN-INST-05` generalizada (*"nada é apagado"*) ganha a exceção da D-COR-6, na
  forma da regra 4 do `CLAUDE.md` (registro sem histórico, RPC com porteiro, rastro).

## 3. A triagem — o pedido, item a item, medido na `main` `cce2289`

| # | O pedido | O que existe hoje (medido) | Tipo |
|---|---|---|---|
| **1** | **Ficha da turma**: identificação limpa (turma, curso sigla + extenso, currículo + vigência, situação), sem o link solto *Turmas* nem o curso como botão de texto; barra no topo direito: Abrir DSA · Baixar planilha · Editar turma · Arquivar/Desarquivar · Excluir turma; *Editar* sai do fim; trocar situação e arquivar só dentro de *Editar turma*, um diálogo/página edita tudo; cartões de andamento, de AEC/TAD/TR e de avaliações juntos e iguais; depois histórico, ficha e aba de avaliações | `turmas/[turma]/page.tsx`: o título e dois ícones (DSA, planilha) numa linha; *"← Turmas"* numa linha própria (`data-slot="voltar-a-lista"`); o curso como link de texto noutra; o currículo noutra; a situação com **Trocar situação** e **Arquivar** ao lado do selo; o formulário recolhido em *Editar turma* (`EdicaoDaTurma`, `Collapsible`) **no fim da aba Ficha**; a situação **fora** do formulário (FR-015.4 da spec 016); os cartões em três desenhos — quatro `CardKpi` dentro de *Andamento*, três `article` de AEC/TAD/TR com outro tamanho e um link de avaliações com `md:max-w-md` —, e o histórico **entre** o Andamento e os tetos | melhoria |
| **2** | **Aba Turmas do curso**: em cada turma, ícones Editar · Arquivar · Excluir | `cursos/[curso]/AbaTurmas.tsx`: a tabela tem Turma (link), Ano, Situação, Currículo, Janela, Sala, Avisos — **nenhuma ação** | melhoria |
| **3** | **D-COR-6**: Excluir turma e Excluir feriado só sem semana salva/publicada ligada; com registros, ícone desabilitado com a dica *"tem registros: use Arquivar/Desativar"* | Não há exclusão de turma nem de feriado. `turmas` é referida por **13 FKs**, todas `restrict` (medido no banco local, 96 migrations): `turma_disciplina`, `registros_aula` (2), `avaliacoes` (2), `atividades_nao_letivas`, `planejamento_anual`, `dias_parados`, `previstos_proens_turma`, `avaliacoes_curriculo_turma`, `ta_fora_do_dsa`, `feriado_turma`, `dsa_eventos_da_semana`; `turma_trocas_de_situacao` e `turma_arquivamentos` **não têm FK** e são imutáveis por gatilho. Toda turma nasce com as linhas da grade (`trg_turmas_fazer_nascer_disciplinas`). `feriados` é referida só por `feriado_turma`. `exclusoes_registradas.tabela` aceita só `instrutores`, `disciplinas`, `unidades_ensino` | regra nova (banco, portão) |
| **4** | **Curso, aba Disciplinas**: barras verticais no lugar da pizza — uma por disciplina, altura = CH em TA, eixo X com o código, eixo Y em tempos de aula; interativo | `disciplinas/paineis/ProporcaoDaCarga.tsx`: `GraficoPizza` com uma fatia por disciplina, **pelo nome** (`nomeNoGrafico`, item 8 da spec 022), também em *Editar curso* e na consulta do currículo | melhoria |
| **5** | **Lista de cursos**: Filtros (só ícone) e Estatísticas (ícone de gráfico) na linha de *Novo curso*, no topo à direita; o mesmo em Instrutores, Turmas e onde houver | `/cursos` e `/instrutores`: *Novo…* à direita do título; abaixo, a caixa **Filtros** de largura inteira (`FiltroAvancado`, botão de texto com o número), o *Limpar filtros* numa linha própria e o botão de texto **Exibir estatísticas** (`EstatisticasRecolhiveis`) em outra. `/turmas`: os seis números **sempre abertos**, antes dos filtros. Também têm filtro: `/atividades`, a aba *Disciplinas* do curso (com números e gráfico), o Início (duas listas soltas, `FiltroDoPanorama`) e `/admin/usuarios` (busca, com o quadro *Acessos ao sistema* sempre aberto) | melhoria |
| **6** | **Estatísticas de cursos**: um cartão por classificação (Regulares, Expeditos, Especiais, Estágios de Qualificação, Aperfeiçoamento Avançado, demais), um com o **total** de cursos e estágios do CIAARA-11 e um com a quantidade em cada classificação | `IndicadoresDoCatalogo.tsx`: dois cartões (*Cursos regulares*, *Estágios de qualificação*), a pizza por classificação e as barras da duração em semanas; a unidade `indicadores-do-catalogo.test.ts` fixa **"exatamente quatro chaves"** e a **ausência** do total (o total era `PEND-5a-2`) | melhoria |
| **7** | **Editar curso** em página com abas: **Cadastro** e **Currículo** (currículo, vigência, PDF; dentro, sub-abas Disciplinas, Horários, Atividades e limites); um *Salvar* por aba; o lápis da disciplina abre a página dela; UE em janela | `cursos/[curso]/editar/page.tsx`: uma página só com *Cadastro do curso* (`FormularioDeCurso`, um *Salvar*) e *Currículo e suas partes* (o seletor, e as quatro partes `?parte=` — *Dados e PDF* com **outro** *Salvar*, *Disciplinas e avaliações*, *Horários*, *Atividades e limites*): na abertura, **dois** *Salvar* na mesma tela. A disciplina já tem página própria (D-2 da spec 022); as UEs já abrem em diálogo | melhoria |
| **8** | **Gráficos interativos** em todas as estatísticas (cursos, instrutores, turmas), inclusive a pizza de escolaridade: clicar em *Não informado* tira o grupo e o gráfico se redistribui | `components/graficos/*`: **nenhum** estado, clique ou legenda interativa; a legenda da pizza é uma lista de texto e a das barras lista só as **séries** (uma, nas barras por categoria). A v2.0 usava **ApexCharts**, cuja legenda alterna por padrão (T119 da spec 006) | regra nova |
| **9** | **Instrutor**: voltar a mostrar na ficha **em quais semanas** a carga passou da faixa (alertas lilás, como antes), do ano escolhido; o aviso continua só *acima da faixa* | Os alertas saíram da ficha no Bloco 7 (A-2 da spec 022) e moram só na página *Avisos*, do ano de hoje. A ficha e a lista usam `anoCorrente()`; antes do Bloco 7 a ficha desenhava `AlertaConformidade` com tom `conformidade` (lilás) | melhoria |
| **10** | **Ano (RT-6)**: qualquer ano, padrão o atual, todos os módulos no ano escolhido — turmas, instrutores e carga, disciplinas, calendário, Início | Só **três** telas têm seletor (`AnoDoPainel`: Início, Turmas, aba Calendário), e as opções são **só os anos com dado** + o de hoje (+ o seguinte, no calendário). Em `/turmas`, sem `?ano=` a **lista mostra todos os anos** e o painel só o de hoje, e há um **segundo** "Ano" dentro dos filtros. Instrutores (lista e ficha) e a aba *Atividades* do curso: ano do relógio. O curso, suas abas e o submenu da lateral: o currículo de hoje e as turmas do ano de hoje, sem escolha. O layout já lê um cookie (`ciaara-lateral`, D-NAV-2) | melhoria 🐛 |
| **11** | **Calendário**: dica só *Editar/Desativar/Reativar/Excluir*; *Inativar* vira *Desativar*; acrescentar Excluir | `atividades/PainelDoCalendario.tsx`: a dica é o rótulo inteiro (*"Inativar <nome>"*), o título do diálogo e o botão dizem **Inativar**, e não há Excluir | melhoria |
| **12** | **Varredura** de RT-1 a RT-3: botão com texto, *Inativar* e cadastro sem Excluir; listar no roteiro o que foi tocado | O inventário cadastro a cadastro está na §3.1 | melhoria 🐛 |

### 3.1 A varredura do item 12 — cadastro a cadastro, medido na `main` `cce2289`

| Cadastro | Editar | Desativar/Reativar | Excluir | O que muda (D-30 a D-36) |
|---|---|---|---|---|
| Curso | página própria ✓ | ✓ (com confirmação) | — | Excluir **sempre desabilitado**: todo curso tem o histórico do regime, permanente (regra 9.1) |
| Turma | `Collapsible` de texto no fim da ficha | Arquivar/Desarquivar ✓ | — | página própria; Excluir (D-COR-6) |
| Currículo | página de edição ✓ | Arquivar ✓ · *Descartar* (lógico) | — | fica: *Descartar* é a exclusão do criado por engano (D-19 da spec 021) |
| Disciplina | página própria ✓ | ✓ | ✓ (código) | o ícone passa a consultar o banco e a ficar desabilitado com a dica; os impedimentos ganham as FKs criadas depois 🐛 |
| UE | diálogo ✓ | ✓ | ✓ (código) | idem; o ícone segue a permissão do banco (`disciplinas.criar`, e não `desativar`) 🐛 |
| Item de avaliação do currículo | diálogo ✓ | **"Inativar"** | — | *Desativar*; Excluir sem registro |
| Regime de horário | diálogo ✓ | **"Inativar"**, *"Regime inativado."* | — | *Desativar*; Excluir sem turma que o use |
| Vigência do regime do curso | `<details>` aberto na página | (a correção substitui) | — | diálogo (RT-3) |
| Limite AEC/TAD/TR | diálogo ✓ | *Retirar* | — | fica (sub-registro do currículo) |
| Instrutor | `Collapsible` no fim da ficha | ✓ | ✓ (código) | página própria; a barra na linha do título; os impedimentos ganham as FKs criadas depois 🐛 |
| Vínculo instrutor↔disciplina | no formulário do instrutor | (desmarcar) | — | fica |
| Atribuição e período na turma | diálogo ✓ | *Tirar* | — | fica (sub-registro da turma) |
| Sala | **não há** | ✓ | — | Editar (só a natureza — o nome é texto nas turmas); Excluir sem turma que a use |
| Usuário | página própria ✓ | ✓ | ✓ | fica (D-USR-1 a D-USR-6) |
| Linha do calendário | diálogo ✓ | **"Inativar"** | — | *Desativar*; Excluir (D-COR-6); a parada fica com *Desfazer* |
| TA fora do DSA, previsto, lançamentos do DSA | diálogo ✓ | *Desfazer* / — / *Excluir* lógico | — | ficam (registro de execução ou sub-registro) |

*"Inativar"* em texto de tela, medido: o calendário (título, botão e dica), os regimes (dica e *"Regime inativado."*), os
itens de avaliação do currículo (dica e *"… inativada."*), *"Linha inativada: o dia está liberado."* e duas recusas
traduzidas — dez lugares. Os botões de texto que **não** são verbo padrão (*Definir tempo*, *Confirmar sugestão*,
*Nomear a UE*, *Tirar*, *Sem instrutor*, *Parar mesmo assim*, *Entendi*, *Lançar o Estudo Individual da semana*) ficam
(D-18 da spec 022).

**Defeito achado na varredura** 🐛: os impedimentos de **instrutor**, **disciplina** e **UE** foram escritos antes de FKs
que hoje os prendem (`atividades_nao_letivas`, `vistas_de_avaliacao` e `ta_fora_do_dsa` ao instrutor;
`registros_aula.disciplina_id`, `atividades_nao_letivas`, `avaliacoes_curriculo` e `ta_fora_do_dsa` à disciplina;
`turma_disciplina_unidade` e `avaliacoes_curriculo` à UE). Nesses casos a função diz *"sem impedimento"*, o `DELETE`
esbarra na FK e a pessoa lê *"Esta gravação aponta para um registro que não existe mais"* — a frase errada. E a tela da
disciplina e da UE **nunca** pergunta ao banco antes de oferecer o botão.

**Também achado na triagem** 🐛: o filtro do Início mostra a classificação e a modalidade **cruas** do banco
(`estagio qualificacao`, `ead semipresencial`, `presencial`) e fora da ordem do Bloco 7 — contra *"vocabulário
institucional"* e *"ordem por classificação"* do pedido. Corrigido no item 5.

**Já feito, não refazer:** o botão de ícone e o vocabulário fechado (`BotaoDeIcone`), a barra à direita
(`BarraDeAcoes`), o diálogo de formulário (`DialogoDeFormulario`), a página própria da disciplina, a UE em diálogo, a
ordem por classificação (`ordem-de-cursos.ts`), o aviso de carga só acima da faixa (`semanasAcimaDaFaixa`,
`alertaAcimaDaFaixa`) e o seletor de ano com padrão pelo relógio de São Paulo (`anoDoPainel`).

## 4. Autorizações nominais diante de requisito escrito *(o pedido de Bernardo Villas Boas, 24/10/2026)*

- **A-1 · Editar turma em página própria** emenda o **`FR-031.5`/§*"NÃO HÁ `/editar`"* da spec 009** e o **`FR-035` da
  spec 012** (o formulário recolhido na ficha): pela RT-3, a edição vai para `/turmas/[turma]/editar`.
- **A-2 · A situação dentro de *Editar turma*** emenda o **`FR-015.1` e o `FR-015.4` da spec 016** (o botão *Trocar
  situação* ao lado do selo, *"o único caminho da situação na edição"*): pela RT-3 e pelo item 1, um *Editar* edita
  tudo, a situação inclusive, com a observação da D-COR-4.
- **A-3 · Sem o link solto *"← Turmas"*** emenda o **`FR-020` da spec 012** (D-NAV-3, *"o caminho de volta da ficha é
  Turmas"*): o caminho de volta passa a ser a entrada *Turmas* da lateral, que está em toda tela. O curso continua
  mostrado e alcançável pela identificação (`FR-031.5` da spec 009).
- **A-4 · As barras de disciplinas pelo código** emendam o **`FR-008` da spec 022** (a pizza pelo nome): o eixo leva o
  código; o nome vai na legenda.
- **A-5 · O seletor com qualquer ano, e um ano para todos os módulos**, emenda o **A-1 da spec 019** (*"os anos que
  existem nas turmas"*) e o ajuste de 19/10/2026 da spec 017 (*"URL sem `ano` = todos os anos na lista de Turmas"*):
  a lista passa a mostrar só o ano escolhido.
- **A-6 · O alerta de carga volta à ficha do instrutor** emenda o **A-2 da spec 022** só para esse alerta: ele aparece
  na ficha **e** continua na página Avisos.
- **A-7 · A exclusão permanente de turma e de linha do calendário** (D-COR-6) estende a **regra 4** do `CLAUDE.md` e
  adianta a **`PEND-5b-1`** para a turma. Banco pelo portão 9.4 (§6).
- **A-8 · As estatísticas com total** fecham a parte *"total de cursos"* da **`PEND-5a-2`** e emendam o teste que
  fixava *"exatamente quatro chaves"* (spec 022, item 10).
- **A-9 · A legenda clicável** é o **`FR-026.6` da spec 006** (decisão de 15/09/2026), parado na T119 até Bernardo
  defini-lo: a RT-5 o define.

## Clarifications

### Session 2026-10-24 *(adotadas por padrão — Bernardo confere no fim)*

**A ficha da turma (item 1)**

- D-1 · Q: *Editar turma* em diálogo ou em página? → A: **página própria**, `/turmas/[turma]/editar` — o formulário é
  longo (doze campos, as partes da semipresencial, a confirmação do limite e da vigência) e a ficha do instrutor e o
  curso já editam em página. *Alternativa: diálogo com rolagem.*
- D-2 · Q: Como a situação entra em *Editar turma*? → A: o campo **Situação** e, quando ela muda, a **observação**
  (opcional, D-COR-4); gravar manda os campos e, se a situação mudou, a troca pela função do banco que anota o
  histórico — se a troca for recusada, a tela diz que os outros campos ficaram gravados. O botão *Trocar situação* sai.
  *Alternativa: a situação num diálogo próprio dentro da página.*
- D-3 · Q: *"Arquivar só dentro de Editar turma"* e *"Arquivar/Desarquivar na barra"*? → A: **na barra**, como o pedido
  lista, com o diálogo da observação e o aviso de não concluída; o que sai é o botão solto ao lado do selo.
  *Alternativa: arquivar só dentro da página de edição.*
- D-4 · Q: O que é a "identificação limpa"? → A: o **código da turma** no título e, abaixo, três linhas rotuladas —
  **Curso** (sigla — nome extenso), **Currículo** (*"Currículo N, vigente desde DD/MM/AAAA"*) e **Situação** (o selo,
  mais *Arquivada* quando for o caso). O curso e o currículo continuam levando às suas páginas, como texto da
  identificação, sem cara de botão (`FR-031.5` da spec 009). Modalidade, período, sala, efetivo e regime vão para a
  aba **Ficha**, em *Dados da turma*. *Alternativa: o curso só como texto, sem levar a ele.*
- D-5 · Q: Que cartões, e iguais como? → A: **oito, numa grade só**, quatro por linha em tela larga e da mesma altura:
  *CH prevista*, *CH executada*, *Progresso*, *Saldo de capacidade (TA)*, *AEC*, *TAD*, *TR* e *Avaliações* — todos do
  mesmo componente (`CardKpi`: rótulo, valor grande, detalhe). O *em atraso*, os dias de saldo e a capacidade diária
  vão **dentro** do cartão do saldo; a barra de progresso dentro do de Progresso; o previsto, o máximo, a barra, os
  alertas, a autoria e o ícone *Editar* do previsto dentro dos de AEC, TAD e TR; o de Avaliações leva à aba
  *Avaliações*. *Alternativa: duas faixas, a do andamento e a dos tempos reserva.*
- D-6 · Q: E *Dias parados*, *Estudo Individual* e *Apoio Individualizado*, que hoje ficam sob os tetos? → A: **uma
  linha logo abaixo dos cartões** — não são indicadores do PROENS. *Alternativa: um nono cartão.*
- D-7 · Q: A turma EAD? → A: no lugar dos cartões, o aviso da Divisão de Ensino a Distância, como hoje (D-16 da spec
  024).
- D-8 · Q: O previsto do PROENS (AEC/TAD/TR) também vai para *Editar turma*? → A: **não** — é registro próprio, com
  permissão própria (`previsto_proens`) e autoria; continua no cartão, pelo ícone *Editar*, em diálogo.
  *Alternativa: uma seção do previsto dentro de Editar turma.*

**A exclusão (itens 2, 3 e 11; D-COR-6)**

- D-9 · Q: Quem exclui turma? → A: **quem cria turma** (`turmas.criar`), no alcance do curso — Admin, Encarregado,
  Ajudante e Operador —, como no instrutor (*"Excluir é de quem cria"*). Feriado: quem cria no calendário
  (`calendario.criar`), Admin e Encarregado. *Alternativa: só o trio do arquivamento.*
- D-10 · Q: O que é "registro" que impede excluir a turma? → A: **lançamento** (aula, avaliação, atividade, dia parado,
  TA fora do DSA), a **trilha do DSA** (salvo, publicado, alteração), as **trocas de situação**, os **arquivamentos**,
  o **previsto do PROENS**, o **planejamento anual**, as **avaliações do currículo da turma** e a **abrangência de
  feriado de turmas escolhidas** (apagar essa linha alargaria o feriado para todas as turmas). **Sai junto com a
  turma**, como estrutura dela: as linhas da grade (que nascem com a turma), as atribuições de instrutor e o rateio
  por UE — tudo no retrato do rastro. *Alternativa: a atribuição também impede.*
- D-11 · Q: O que é "semana salva/publicada ligada" ao feriado? → A: alguma turma que o feriado alcança tem, **na
  semana ISO da data**, o evento **salvo**, **publicado** ou **alteração publicada** na trilha do DSA **ou lançamento
  salvo e vivo** (aula, atividade — a global alcança todas —, sessão de aplicação ou vista). A semana *registrada*
  **vazia** (D-18 da spec 024) não conta — por ela, toda semana contaria. ⚠️ **Trocada pela medição** (24/10/2026, cópia
  `remoto-20261024-061801.sql`): só com o evento, **nenhuma** das 32 linhas do calendário ficaria protegida — o que existia antes do
  Bloco 9 nasce salvo (RP-8) e não tem evento; com o lançamento salvo, **29 das 32**. *Alternativa: só o evento (a
  proteção valeria só para as semanas salvas daqui em diante).*
- D-12 · Q: A confirmação? → A: o **alerta** de exclusão permanente e o **código digitado**, como as três exclusões do
  domínio acadêmico (instrutor, disciplina, UE); o banco confere o código de novo. *Alternativa: só o alerta, sem
  digitar, como a conta (D-USR-4).*
- D-13 · Q: Com registros? → A: o ícone **desabilitado**, com a dica *"tem registros: use Arquivar"* (turma) ou *"tem
  registros: use Desativar"* (feriado); a lista do que prende vai no nome acessível. Sem resposta do banco, o mesmo
  ícone desabilitado com *"não foi possível conferir os registros"* — nunca liberado (`RN-DEG-01`).
- D-14 · Q: A parada global de parte do dia, no calendário? → A: continua com **Desfazer** — é lançamento, não
  cadastro; o Excluir é do feriado. *Alternativa: Excluir também nela.*
- D-15 · Q: Depois de excluir a turma? → A: vai para **Turmas**, com a confirmação *"Turma … excluída."* na URL
  (`?excluida=`), como a conta (spec 011).

**Botões e verbos (RT-1, RT-2)**

- D-16 · Q: A dica é o quê? → A: o **verbo do vocabulário** da ação (*Editar*, *Excluir*, *Desativar*, *Reativar*,
  *Arquivar*, *Desarquivar*, *Imprimir*, *Salvar*, *Baixar*, *Abrir o DSA*…); em *Novo*, o nome da ação (*Nova turma*),
  porque *"Novo"* sozinho não é verbo. O **nome acessível** continua o texto completo de hoje (D-5 da spec 022).
  *Alternativa: a dica igual ao nome acessível, como no Bloco 7.*
- D-17 · Q: *Inativar* vira *Desativar* onde? → A: no **verbo** e nas mensagens do ato (*"Regime desativado."*); o
  **estado** continua *inativo/inativa* (o selo, a coluna Situação). Uma guarda reprova *Inativar* em texto de tela.
  *Alternativa: o estado também vira "desativado".*

**Filtros e estatísticas (RT-4, itens 5 e 6)**

- D-18 · Q: Onde ficam os ícones e os painéis? → A: **Filtros** (com o número de filtros ativos) e **Estatísticas** na
  barra de ações da página, depois das ações dela; cada um abre o seu painel recolhível **abaixo do cabeçalho**, os
  dois **independentes** e **recolhidos** ao abrir a tela; abrir ou fechar não muda a URL. *Limpar filtros* fica
  dentro do painel de filtros. *Alternativa: Limpar filtros também na barra.*
- D-19 · Q: Que telas? → A: **Cursos**, **Instrutores** e **Turmas** (Filtros e Estatísticas); **Atividades** (Filtros);
  a aba **Disciplinas** do curso e de *Editar curso* (Filtros e Estatísticas, na barra da aba); **Usuários**
  (Estatísticas, com o quadro *Acessos ao sistema*; a busca continua à vista); e o **Início** (Filtros — os números do
  ano continuam à vista, porque o Início é o painel, não uma lista). Os seis números de Turmas passam para o painel
  de Estatísticas. *Alternativa: Turmas e Início com os números sempre abertos.*
- D-20 · Q: As estatísticas de Cursos? → A: **seis cartões por classificação** (Cursos regulares, Cursos expeditos,
  Cursos especiais, Estágios de qualificação, Cursos de aperfeiçoamento avançado, Demais), o cartão **Total — cursos e
  estágios do CIAARA-11**, a pizza **Cursos por classificação** (as quantidades, interativa) e as barras da **duração
  em semanas** (ficam, do Bloco 7). Contam os cursos do recorte (o filtro vale, como hoje). *Alternativa: tirar a
  duração.*
- D-21 · Q: O filtro do Início? → A: as classificações e as modalidades pelo **nome institucional**
  (`ROTULO_DA_CLASSIFICACAO`, *Presencial/EAD/Semipresencial*), na ordem do Bloco 7 — eram mostradas cruas.

**Gráficos (RT-5, itens 4 e 8)**

- D-22 · Q: Como fica a interação? → A: a legenda de todo gráfico vira **botões** (*pressionado* = à vista): na pizza
  e nas barras de uma série, um por **categoria**; nas barras de várias séries e na linha, um por **série**. Clicar na
  própria fatia, barra ou linha faz o mesmo. O oculto **sai** do desenho e os percentuais se refazem sobre o que ficou;
  *Mostrar todos* aparece quando há oculto; o último grupo à vista não se oculta. A legenda continua sendo a leitura em
  texto, com o valor. *Alternativa: só a legenda, sem clique no desenho.*
- D-23 · Q: As barras de disciplinas? → A: **uma barra por disciplina**, na **ordem natural do código**, eixo X com o
  **código** (`I`, `II`…), eixo Y *"Tempos de aula (TA)"*, a legenda com *"código — nome: N TA"* (o nome curto do
  gráfico, `nomeNoGrafico`). *Alternativa: o eixo pelo nome curto.*

**O ano (RT-6, item 10)**

- D-24 · Q: Como "todos os módulos seguem o ano"? → A: **um ano escolhido para o sistema inteiro**: escolhê-lo em
  qualquer tela grava-o no navegador (cookie `ciaara-ano`, que **expira em 31/12** no fuso de São Paulo — a virada
  automática) e as outras telas abrem nele; a tela mostra o ano também na URL (`?ano=`), e o `?ano=` de um link vale
  mais que o guardado. Escolher o ano de hoje **apaga** a escolha. É a mesma exceção declarada da lateral fixada
  (D-NAV-2 da spec 012): preferência de quem olha, por navegador. *Alternativa: cada tela com o seu ano, sem memória.*
- D-25 · Q: Onde fica o seletor, e com que anos? → A: o **mesmo componente** no canto superior direito de cada tela que
  depende do ano (A-1 da spec 019); as opções vão de **2020** (o mínimo do banco) ao **ano de hoje + 10**, mais o ano
  escolhido se estiver fora; nada é escrito à mão (`ano-sem-numero-fixo.test.ts`). *Alternativa: setas de ano anterior
  e seguinte.*
- D-26 · Q: Que telas seguem o ano? → A: o **Início**; **Turmas** (lista e painel, só o ano — o *"Ano"* repetido nos
  filtros sai); **Instrutores** (a coluna *CH do ano*); a **ficha do instrutor** (carga, atribuições e alertas); a
  **página do curso** (a aba *Turmas*, o currículo vigente no ano nas abas do currículo e a referência da aba
  *Atividades*); **Atividades** (a lista e o *Calendário*); e o **submenu** da lateral. Avisos, o DSA (que anda por
  semana) e a ficha da turma (que é do ano dela) ficam como estão. *Alternativa: só as telas que já tinham seletor.*
- D-27 · Q: "O currículo vigente no ano"? → A: no ano de hoje, o vigente **hoje**; nos outros, o vigente em **1º de
  janeiro** do ano escolhido. *Alternativa: o vigente em 31/12.*

**Editar curso (item 7)**

- D-28 · Q: As abas? → A: **Cadastro** (o formulário do curso, um *Salvar*) e **Currículo** (`?aba=`). No Currículo: a
  barra do currículo (escolher, novo, arquivar, descartar), os **dados** (vigência, descrição, propósito, duração, um
  *Salvar*) e o **PDF** em cima, e as sub-abas **Disciplinas · Horários · Atividades e limites** (`?parte=`). Link
  antigo com `?parte=` abre o Currículo; `parte=dados` cai em Disciplinas. *Alternativa: os dados como sub-aba.*

**A ficha do instrutor (item 9)**

- D-29 · Q: Que alertas voltam? → A: **só o da carga semanal acima da faixa** (o da capacitação continua em Avisos e
  no campo), em **lilás** (`AlertaConformidade`, tom `conformidade`), no topo da ficha, **do ano escolhido**, só para
  instrutor ativo (CHK019). *Alternativa: os dois alertas.*

**A varredura (item 12, §3.1)**

- D-30 · Q: Que cadastros ganham Excluir? → A: além da turma e da linha do calendário, o **regime de horário** (sem turma
  que o use), o **item de avaliação do currículo** (sem avaliação lançada, arbitragem ou correção registrada) e a
  **sala** (sem turma que a use) — os três também **só com o currículo/curso sem lançamento**, para não mudar em silêncio
  um currículo em uso (RC-6 da spec 021). O **curso** mostra o Excluir **sempre desabilitado** (*"tem registros: use
  Desativar"*): todo curso tem o histórico do regime, que é permanente (regra 9.1). O **currículo** fica com *Descartar*
  (D-19 da spec 021). Sub-registros e lançamentos (limite, atribuição, vínculo, TA fora do DSA, previsto, lançamento do
  DSA) ficam com os verbos deles. *Alternativa: Excluir só na turma e na linha do calendário, os demais como pendência.*
- D-31 · Q: A sala ganha Editar? → A: **sim, só a natureza** — o nome é texto gravado nas turmas (`FR-029` da spec 009),
  e renomear apagaria a ligação. *Alternativa: sem Editar.*
- D-32 · Q: E o defeito dos impedimentos antigos? → A: **corrigido na mesma migration**: as funções de instrutor,
  disciplina e UE passam a conhecer as FKs que faltavam e ganham uma **rede de segurança pelo catálogo** (toda FK que
  aponte para o registro prende, mesmo a que nascer depois). A tela da disciplina e da UE passa a consultar o banco e a
  mostrar o ícone desabilitado com a dica, como as novas. *Alternativa: só registrar como pendência.*
- D-33 · Q: A dica do ícone desabilitado do instrutor? → A: a da D-COR-6 (*"tem registros: use Desativar"*), e o motivo
  escrito ao lado continua.
- D-34 · Q: A vigência do regime do curso? → A: *Registrar nova vigência* e *Corrigir esta vigência* saem do `<details>`
  aberto e vão para **diálogo** (RT-3).
- D-35 · Q: A ficha do instrutor? → A: *Editar* em **página própria** (`/instrutores/[codigo]/editar`), como a turma;
  a barra Editar · Desativar/Reativar · Excluir no topo direito, na linha do nome.
- D-36 · Q: A página da conta (`/admin/usuarios/[id]`)? → A: **fica** — já é a página própria da D-USR-5, com nome,
  perfil e acessos.

## 5. Requisitos

### FR-001 — A ficha da turma (item 1)
- **FR-001.1**: O cabeçalho MUST trazer o código da turma e as linhas **Curso**, **Currículo** e **Situação** (D-4), sem
  o link *"← Turmas"*, e a barra de ações no topo direito, nesta ordem: *Abrir o DSA* · *Baixar planilha de
  contingência* · *Editar turma* · *Arquivar*/*Desarquivar* · *Excluir turma* — cada uma só para quem a pode, como hoje.
- **FR-001.2**: *Editar turma* MUST levar a `/turmas/[turma]/editar`, onde **um** formulário edita a turma inteira,
  a situação inclusive, com a observação (D-1, D-2). A ficha MUST NOT ter formulário, nem recolhido.
- **FR-001.3**: Os oito cartões (D-5) MUST ficar juntos, numa grade só, do mesmo componente e da mesma altura, logo
  abaixo do cabeçalho; depois deles, o *Histórico da situação* e as abas *Ficha* e *Avaliações*.
- **FR-001.4**: A turma arquivada MUST continuar somente leitura: sem *Editar* nem *Excluir*, com *Desarquivar* para o
  trio (D-COR-5).

### FR-002 — A aba Turmas do curso (item 2)
- **FR-002.1**: Cada linha MUST ter, na última coluna, os ícones *Editar* (a página de edição), *Arquivar*/*Desarquivar*
  e *Excluir*, cada um pela permissão e pela regra da ficha.

### FR-003 — A exclusão (itens 3 e 11; D-COR-6)
- **FR-003.1**: Turma e linha de feriado do calendário MUST poder ser **excluídas permanentemente** por RPC com porteiro
  (D-9), só **sem registro** (D-10, D-11), com o **código digitado** (D-12) e com **rastro** em `exclusoes_registradas`
  gravado antes do `DELETE`. Continua **sem policy e sem privilégio de `DELETE`**.
- **FR-003.2**: Com registro, o ícone MUST aparecer **desabilitado** com a dica *"tem registros: use Arquivar"* ou
  *"…use Desativar"* (D-13); sem resposta do banco, desabilitado com *"não foi possível conferir os registros"*.
- **FR-003.3**: O banco MUST recusar a exclusão com registro (`23503`, nomeando o que prende), fora do alcance ou sem a
  permissão (`42501`) e com o código errado (`22023`), mesmo que a tela ofereça o botão.

### FR-004 — O gráfico de disciplinas (item 4)
- **FR-004.1**: A aba *Disciplinas* do curso (e *Editar curso* e a consulta do currículo) MUST desenhar **barras
  verticais**, uma por disciplina, X = código, Y = TA (D-23), interativas (FR-008).

### FR-005 — Filtros e Estatísticas (item 5; RT-4)
- **FR-005.1**: Nas telas da D-19, *Filtros* e *Estatísticas* MUST ser **ícones** na barra de ações da página, que
  abrem painéis recolhíveis abaixo do cabeçalho, recolhidos ao abrir a tela; o ícone de Filtros MUST mostrar quantos
  filtros estão ativos.
- **FR-005.2**: Nenhuma tela MUST ter botão de texto *Filtros*, *Exibir estatísticas* ou *Ocultar estatísticas*.

### FR-006 — As estatísticas de Cursos (item 6)
- **FR-006.1**: O painel MUST trazer um cartão por classificação (D-20), o cartão do **total** e a pizza das
  quantidades, além das barras da duração; a soma dos seis cartões MUST ser igual ao total.

### FR-007 — Editar curso (item 7)
- **FR-007.1**: *Editar curso* MUST ter as abas **Cadastro** e **Currículo** (D-28), com **um** *Salvar* por aba e as
  sub-abas *Disciplinas*, *Horários* e *Atividades e limites* no Currículo; o lápis da disciplina continua levando à
  página dela, e a UE abre em diálogo.

### FR-008 — Gráficos interativos (item 8; RT-5)
- **FR-008.1**: Todo gráfico (`GraficoPizza`, `GraficoBarras`, `GraficoLinha`) MUST ter a legenda de botões da D-22, e
  ocultar um grupo MUST redesenhar o gráfico sem ele, com os percentuais refeitos.
- **FR-008.2**: Na pizza de **Escolaridade** de Instrutores, ocultar *Não informado* MUST deixar as fatias restantes
  somando 100 %.

### FR-009 — O alerta da ficha do instrutor (item 9)
- **FR-009.1**: A ficha do instrutor ativo MUST mostrar, em lilás, as semanas **do ano escolhido** em que a carga
  semanal prevista passa do máximo da faixa (D-29), pelas mesmas funções da página Avisos.

### FR-010 — O ano (item 10; RT-6)
- **FR-010.1**: Um seletor de ano só (D-25) MUST oferecer de 2020 ao ano de hoje + 10, abrir no ano de hoje em São
  Paulo e lembrar a escolha até 31/12 (D-24).
- **FR-010.2**: As telas da D-26 MUST mostrar só o ano escolhido, e a escolha feita numa MUST valer nas outras.

### FR-011 — O calendário (item 11)
- **FR-011.1**: As dicas dos ícones da linha MUST ser só *Editar*, *Desativar*, *Reativar* e *Excluir*; *Inativar* MUST
  NOT aparecer; o feriado MUST ter *Excluir* (FR-003).

### FR-012 — A varredura (item 12)
- **FR-012.1**: Nenhuma tela MUST ter *Inativar* em texto (guarda), botão de verbo padrão com texto fora dos diálogos
  (guarda do Bloco 7) ou formulário aberto em página de leitura (guarda do Bloco 7); o roteiro MUST listar o que a
  varredura tocou (§3.1).

## 6. Banco — o desenho da exclusão (D-COR-6), pelo portão 9.4

**Uma migration**, que acrescenta funções e muda uma restrição. É **portão** (regra 9.4, emenda de 19/10/2026): ela
**muda a regra 4** (`RN-INST-05` generalizada) e passa a **apagar dado** quando chamada. Fica pronta, testada e no
PR; **não vai ao remoto antes de Bernardo ver este desenho**.

- **O rastro aceita mais cinco tabelas**: a restrição `exclusoes_tabela_permitida` de `exclusoes_registradas` passa a
  `('instrutores', 'disciplinas', 'unidades_ensino', 'turmas', 'feriados', 'regimes_de_horario', 'avaliacoes_curriculo',
  'config_listas')`. O rastro continua só de acréscimo,
  imutável inclusive para a `service_role`.
- **Turma** — `app.impedimentos_de_exclusao_da_turma(uuid) → text[]`, `app.impedimentos_de_exclusao_das_turmas(uuid[])
  → (turma_id, impedimentos)` (uma ida ao banco por lista) e `app.excluir_turma(uuid, text) → jsonb`, todas `SECURITY
  DEFINER` com porteiro `app.pode('turmas','criar')` e `app.alcanca_curso`, e o espelho `public.*` `SECURITY INVOKER`,
  como as de disciplina e UE. Impedem (D-10): `registros_aula`, `avaliacoes`, `atividades_nao_letivas`, `dias_parados`,
  `ta_fora_do_dsa`, `dsa_eventos_da_semana`, `turma_trocas_de_situacao`, `turma_arquivamentos`,
  `previstos_proens_turma`, `planejamento_anual`, `avaliacoes_curriculo_turma` e `feriado_turma`. Saem junto, nesta
  ordem e dentro da mesma transação: `turma_disciplina_unidade`, `turma_disciplina_instrutor`, `turma_disciplina` e a
  `turmas`. O **retrato** do rastro leva a turma **e** as linhas que saíram com ela.
- **Feriado** — `app.impedimentos_de_exclusao_do_feriado(uuid)`, `app.impedimentos_de_exclusao_dos_feriados(uuid[])` e
  `app.excluir_feriado(uuid, text)`, porteiro `app.pode('calendario','criar')`. Impede (D-11): evento `salvo`,
  `publicado` ou `alteracao_publicada` na semana ISO da data (`app.semana_iso`) **ou lançamento salvo e vivo** nela,
  para alguma turma que o feriado alcança (as escolhidas em `feriado_turma`, ou todas). Sai junto: `feriado_turma`,
  depois `feriados`.
- **Regime de horário, item de avaliação do currículo e sala** (D-30) — o mesmo trio de funções para cada um
  (impedimentos de um, impedimentos de uma lista, excluir), com porteiro `horarios.criar`, `disciplinas.criar` e
  `parametros.criar`, e o impedimento `curriculo_em_uso` (`app.curriculo_em_uso_com_lancamento`) nos dois primeiros. A
  sala é a linha de `config_listas` com `lista = 'salas'`, presa por `turmas.sala_alocada` (texto, sem FK); o rastro
  grava `config_listas`, com o código `salas:<nome>`.
- **A rede de segurança** — `app.referencias_por_fk(regclass, uuid[], text[])`: lê no catálogo toda FK que aponta para a
  tabela e diz quais tabelas têm linha apontando para os `id`s. Toda função de impedimento, as antigas inclusive (D-32),
  a usa depois das conferências nomeadas: o que nenhuma conferência nomeou prende pelo **nome da tabela**. Sem ela, a
  FK que nascer depois repetiria o defeito da §3.1.
- ⚠️ **O ALCANCE REAL, declarado como na emenda de 03/10/2026 da regra 4**: além de `turmas` e `feriados`, a função
  apaga linhas de **`turma_disciplina`**, **`turma_disciplina_instrutor`**, **`turma_disciplina_unidade`** e
  **`feriado_turma`** — a estrutura do registro, que não existe sem ele. Nenhuma ganha policy nem privilégio.
- **Recusas**: `42501` sem permissão, sem sessão ou fora do alcance; `P0002` inexistente; `22023`
  (`codigo_nao_confere`) com o código errado; `23503` (`registro_com_historico`) com a lista do que prende no `detail`.
- **Quem lê**: a ficha da turma (o seu), a aba *Turmas* do curso (a lista), a aba *Calendário* (a lista do ano). As
  Server Actions `excluirTurma` e `excluirLinhaDoCalendario`, com Zod na primeira linha.
- **O caso que discrimina** (DoD 8): a turma **só com atribuição de instrutor** se exclui (a atribuição sai junto), e a
  mesma turma com **um evento *salvo* do DSA** é recusada; o feriado numa semana com **aula salva e sem evento** é
  recusado (o dado de antes do Bloco 9), e com a aula **em rascunho** se exclui.
- **Efeito no dado real**: medido em 24/10/2026 sobre a cópia `remoto-20261024-061801.sql` restaurada no banco local, numa transação
  desfeita — ver `plano-de-aplicacao-no-remoto.md` §4: **11 de 30** turmas, **3 de 32** linhas do calendário, **51 de 281**
  avaliações do currículo e **6 de 14** salas ficam excluíveis; nenhum regime existe; instrutor e disciplina seguem
  **0** excluíveis, e as UEs caem de **206** para **176** (30 presas por avaliação do currículo, a FK que faltava).
- **Reversão**: `drop` das funções e a restrição de volta à lista de três — esta só se nenhuma exclusão de turma ou de
  feriado tiver acontecido (com linha, o rastro **fica** e a restrição continua aceitando-a).

## 7. Critérios de sucesso

- **SC-001**: Na ficha da turma, a barra tem os cinco ícones na ordem do FR-001.1 e os oito cartões têm a mesma altura
  (e2e mede as caixas); a ficha não tem formulário (guarda do Bloco 7).
- **SC-002**: *Editar turma* troca a situação com observação e grava os campos; o histórico da situação mostra a troca
  (e2e por clique, conferido no banco).
- **SC-003**: Uma turma sem registro se exclui pela ficha e pela aba *Turmas* (e2e, conferido no banco e no rastro);
  com registro, o ícone fica desabilitado com a dica; o banco recusa pelos códigos do FR-003.3 (invariantes com sessão
  real, por perfil, com o caso que discrimina).
- **SC-004**: O mesmo para o feriado na aba *Calendário*, sem *Inativar* em lugar nenhum (guarda e e2e).
- **SC-005**: Cursos, Instrutores, Turmas, Atividades, Usuários, o Início e a aba *Disciplinas* abrem com os painéis
  recolhidos e os ícones na barra (e2e); a guarda reprova botão de texto *Filtros*/*Exibir estatísticas*.
- **SC-006**: As estatísticas de Cursos somam o total nos seis cartões (unidade e e2e).
- **SC-007**: Ocultar *Não informado* na pizza de Escolaridade deixa as fatias somando 100 % e *Mostrar todos* a traz de
  volta; o mesmo numa barra (unidade e e2e da vitrine e de Instrutores).
- **SC-008**: Escolher 2027 em Turmas e abrir Instrutores, o Início e o Calendário mostra 2027 nos três; escolher o ano
  de hoje volta ao padrão; um ano sem dado (2031) é aceito (e2e por clique); a virada de 31/12 para 01/01 é coberta por
  unidade com o relógio falso.
- **SC-009**: A ficha do instrutor com carga acima da faixa mostra as semanas do ano escolhido, e a de 40h com 4 h por
  semana não mostra nada (e2e).
- **SC-010**: *Editar curso* abre em *Cadastro* com um *Salvar*; o *Currículo* tem um *Salvar* e as três sub-abas; o
  link antigo com `?parte=horarios` abre o Currículo nos Horários (e2e).
