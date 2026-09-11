# Checklist de qualidade dos requisitos: navegação, shell e estado na URL — entrada da fatia (c)

**Propósito**: testar se os **requisitos estão bem escritos** para a fatia (c) do Épico 4 — shell,
navegação e estado na URL. Não testa a fatia (b), que está implementada, verde e no PR #8.
**Criado**: 11/09/2026
**Feature**: [spec 007](../spec.md) · [documento 25 — Camada de Dados e Estado](../../../docs/fase-2/25-Camada-de-Dados-e-Estado.md) · [`RF-NAV-01..04`, `RF-INI-01..05`, `RF-MOD-01/03`, `RF-AUTH-08`](../../../docs/fase-1/02-Requisitos-Funcionais.md) · [documento 06, Épico 4](../../../docs/fase-1/06-Backlog-de-Epicos-V2.1.md)
**Alcance**: a spec 007 **e** os documentos normativos. É a escolha que fez a lista da fatia (a)
valer a pena: **dos doze itens que ela fechou, a maioria dos achados morava no documento normativo,
não na spec.**
**Momento**: **portão formal de entrada da fatia (c)** — enquanto corrigir requisito ainda é barato.
Item reprovado vira correção de requisito **antes** de a fatia começar.
**Ênfase**: navegação e estado na URL, por escolha de Bernardo em 11/09/2026.

> **Como ler.** Todos os itens são perguntas sobre **o que está escrito**. "Não" não significa que a
> fatia (b) esteja errada; significa que a fatia seguinte vai decidir sozinha, na pressa, algo que
> deveria estar decidido — e que ninguém vai conferir depois.
>
> ⚠️ **O risco que esta lista existe para conter tem nome no próprio backlog:** *"Zustand virar
> `AppState` disfarçado"*. O `AppState` da v2.0 não foi um erro — foi a melhor solução possível sob
> `HtmlService`. O erro seria recriá-lo onde a URL já resolve.

## Completude — o estado na URL

- [ ] CHK001 O **mapa de parâmetros por tela** é declarado contrato fechado por algum `RF-`, ou existe apenas como tabela de documento de arquitetura? [Gap, Doc 25 §1.3] ⚠️ O próprio documento o chama de *"contrato único do sistema"*, e nenhum requisito o cita — então uma tela nova pode inventar parâmetro sem violar requisito nenhum.
- [ ] CHK002 Existe requisito para **parâmetro fora do contrato** na URL — ignorado em silêncio, removido, ou recusado? [Gap, Edge Case]
- [ ] CHK003 Existe requisito para **valor inválido** num parâmetro válido (`?semana=99`, `?aba=inexistente`, `?turma=TUR-999999`)? [Gap, Edge Case] ⚠️ Com o `RF-NAV-01`, a barra de endereço passa a ser **entrada de usuário**, e nenhum requisito a trata como tal. É a mesma classe do gotcha nº 4 do BRIEF: a tela abre errada e nada acusa.
- [ ] CHK004 A regra *"parâmetro no valor padrão não aparece na URL"* é requisito, ou comportamento da biblioteca que ninguém cobra? [Traceability, Doc 25 §1.3 regra 1]
- [ ] CHK005 A política `push` × `replace` tem critério de aceite em algum requisito? [Measurability, Doc 25 §1.6] ⚠️ O próprio documento a chama de *"a única regra que se erra na prática"* — e regra que se erra na prática sem portão é a que se erra na prática.
- [ ] CHK006 A limitação de frequência da busca tem **número** em algum requisito? [Clarity, Doc 25 §1.5/§1.6] ⚠️ `throttleMs: 300` aparece **num exemplo de código**; a tabela de regras escreve só `throttleMs`. Valor que vive em exemplo é valor que a próxima tela escolhe de novo.
- [ ] CHK007 As **seis proibições** de estado efêmero viraram requisito, ou seguem como tabela de arquitetura? [Gap, Doc 25 §3.3] *(é o `CHK024` da fatia (a), ainda aberto)*
- [ ] CHK008 Existe requisito que **defina** estado efêmero de interface com exemplo **e contraexemplo**, em vez de defini-lo por lista de casos? [Clarity, Gap, Doc 25 §3.1]
- [ ] CHK009 Existe requisito de **desempenho** para a navegação por URL, já que cada mudança de parâmetro passa a ser uma ida ao servidor? [Gap, NFR] ⚠️ A v2.0 trocava contexto em memória; a v2.1 troca por requisição, e nenhum `RNF-PERF` cobre esse caminho.

## Consistência — entre requisito, arquitetura e o que já foi construído

- [ ] CHK010 O critério de aceite 3 do Épico 4 escreve `?turma=T2`; o contrato de parâmetros manda o valor ser o **`codigo` de negócio** (`TUR-000012`). Qual prevalece? [Conflict, Backlog Épico 4 · Doc 25 §1.3]
- [ ] CHK011 O mesmo critério põe `semana` em `/cursos/[curso]`; o contrato atribui `semana` a `/turmas/[turma]/dsa` e dá a `/cursos/[curso]` apenas `aba` e `turma`. [Conflict, Backlog Épico 4 · Doc 25 §1.3] ⚠️ Dois conflitos na **mesma frase** do único critério que exercita deep-link.
- [ ] CHK012 O documento 25 trata **ordenação de coluna** como estado de URL, com `replace`. A `TabelaDensa` entregue na fatia (b) mantém ordenação **e** filtro textual como estado interno, e **não os expõe por propriedade**. Existe requisito dizendo de quem é a mudança? [Conflict, Doc 25 §1.6 · spec 007 `FR-006`] ⚠️ **É o achado de maior alcance desta lista**: sem a propriedade, a fatia (c) não consegue cumprir o documento 25 sem reabrir o componente.
- [ ] CHK013 O `FiltroAvancado` recebe e devolve estado por propriedade, e a spec 007 declara que levá-lo à URL é da fatia (c). Existe requisito **na fatia (c)** que assuma isso? [Dependency, Gap, spec 007 `FR-007`]
- [ ] CHK014 `RF-NAV-02` mantém Avaliações e Relatório **fora** do menu lateral, e o contrato de parâmetros dá **rota própria** às duas. As duas afirmações são compatíveis, e isso está escrito em algum lugar? [Consistency, RF-NAV-02 · Doc 25 §1.3]

## Completude — shell e navegação

- [ ] CHK015 Os componentes de shell que o backlog nomeia — layout raiz, navegação lateral, cabeçalho e breadcrumb — **têm linha no inventário do documento 23 §3.1**? [Gap, Doc 23 §3.1 · Backlog Épico 4] ⚠️ Medido em 11/09/2026: **nenhum dos quatro tem**. O inventário é onde cada componente recebe arquivo, base e a coluna `"use client"` — os treze da fatia (b) tinham, e por isso nasceram com endereço.
- [ ] CHK016 O **breadcrumb** é citado por algum `RF-`? [Gap, Princípio X] ⚠️ Ele aparece só no backlog. Se é novidade, o Princípio X exige a distinção declarada: *paridade antes de novidade*.
- [ ] CHK017 `RF-NAV-02` proíbe reorganizar o menu e renomear entradas. Existe, em algum lugar, **a lista das entradas atuais** da v2.0, contra a qual a paridade se mede? [Measurability, RF-NAV-02] ⚠️ Sem a lista, a proibição não é verificável — e é exatamente o tipo de requisito que passa por vacuidade.
- [ ] CHK018 Existe requisito de **acessibilidade da navegação** — marco de navegação anunciado, atalho para pular ao conteúdo, e para onde vai o foco ao trocar de rota? [Gap, Coverage] ⚠️ A fatia (b) fechou o `CHK010` para componentes; a navegação é a parte que ele não alcançou.
- [ ] CHK019 Existe requisito dizendo **quais segmentos** ganham `loading.tsx` e `error.tsx` nesta fatia, ou apenas a regra geral? [Completeness, RF-MOD-01 · RN-DEG-01]
- [ ] CHK020 Existe requisito dizendo **qual parte do shell** leva marcador de cliente? [Gap, Doc 23 §3.2] ⚠️ O shell é o lugar mais tentador do sistema — menu que abre e fecha —, e é onde o marcador custa mais caro: ele contamina toda a subárvore, e o erro **não aparece no `tsc`**.

## Completude — a tela Início

- [ ] CHK021 O backlog põe a tela Início no Épico 4, e nem a spec 005 nem a 007 a mencionam. Existe requisito atribuindo-a à fatia (c)? [Gap, Backlog Épico 4]
- [ ] CHK022 O backlog diz que o conteúdo da Início *"acende conforme os épicos 5–9 chegam"*. Existe requisito para o que ela mostra **antes** disso? [Gap, Edge Case] ⚠️ É medição do Épico 3: hoje, depois de entrar, a pessoa cai numa página **sem um único link**. O `CHK025` da fatia (a) já reclamava, e continua aberto.
- [ ] CHK023 `RF-INI-04` exige alertas consolidados por funções puras de `lib/dominio/`. Existe requisito de **quais predicados** entram nesta fatia e quais esperam os Épicos 5–9? [Dependency, RF-INI-04]
- [ ] CHK024 `RF-INI-01` pede progresso por turma sobre `registros_aula`. Existe requisito para o estado **atual** do dado, em que `unidade_ensino_id` é nula nos 1.566 lançamentos migrados? [Dependency, Edge Case, RF-INI-01]
- [ ] CHK025 `RF-INI-05` pede o brasão institucional. Existe requisito de **procedência e licença** do arquivo? [Gap, Assumption, RF-INI-05] ⚠️ Medido em 11/09/2026: `public/` só tem os desenhos padrão do Next. A fatia (a) resolveu isso para a tipografia, com a licença versionada ao lado — aqui não há requisito equivalente, e a spec 009 da v2.0 já registrava os assets como ausentes.
- [ ] CHK026 `RF-INI-02` restringe o panorama ao escopo de curso do perfil e diz que a **RLS** nega. Existe requisito do que a tela **exibe** quando o parâmetro da URL cai fora do escopo? [Gap, RF-INI-02]

## Cobertura — os quatro comportamentos do `RF-NAV-04`

- [ ] CHK027 `RF-AUTH-08` promete devolver ao destino após o login. Existe requisito de que os **parâmetros de consulta** sobrevivam ao `?redirect=`, e não apenas o caminho? [Completeness, RF-AUTH-08 · RF-NAV-04 a] ⚠️ O critério verificável do próprio `RF-AUTH-08` exige `semana=12` de volta — mas quem implementa o `?redirect=` precisa saber disso por requisito, não por leitura atenta de uma nota de rodapé.
- [ ] CHK028 `RF-NAV-04` (c) afirma que o link não vaza informação porque a RLS nega. Existe requisito do que a tela **mostra** nesse caso, distinguindo *"não há"* de *"você não vê"*? [Gap, RN-DEG-01 · RF-NAV-04 c]
- [ ] CHK029 Os quatro comportamentos são verificáveis **nesta fatia**, em que as telas de destino ainda não existem? [Measurability, RF-NAV-04] ⚠️ Todo critério de aceite escrito usa rotas dos Épicos 5 a 9. Ou a fatia (c) os prova sobre telas provisórias, ou o `RF-NAV-04` fica sem dono — e requisito sem dono é requisito que ninguém conferiu.
- [ ] CHK030 Existe requisito para o **histórico** quando a mesma tela é alcançada por dois pontos de entrada — menu lateral e cartão da Início? [Coverage, Gap, RF-NAV-02]

## Dependências e premissas

- [ ] CHK031 Existe requisito declarando **quais dependências** a fatia (c) acrescenta? [Gap, Dependency] ⚠️ Medido em 11/09/2026: nem `nuqs` nem o gerenciador de estado efêmero estão instalados. A fatia (b) mediu antes de instalar e a lista encolheu de catorze para dois — vale repetir o hábito.
- [ ] CHK032 O documento 25 §6 especifica formulário com validação em cliente e servidor, e a spec 007 deixou os dois componentes de formulário de fora por exigirem pacote novo. Existe requisito dizendo **em que fatia** esse pacote entra? [Gap, Dependency, Princípio IX]
- [ ] CHK033 Quatro componentes do inventário §3.1 que a fatia (b) não construiu são da tela Início — `SeletorCurso`, `PainelAlertas`, `CardTurma`, `BarraProgressoTurma`. Existe requisito atribuindo-os a uma fatia? [Gap, Doc 23 §3.1]
- [ ] CHK034 A premissa de que o **`codigo` de negócio é estável** o bastante para virar URL pública está confirmada? [Assumption, Doc 25 §9.1] ⚠️ Um link favoritado quebra se o código for reemitido, e o ETL do Épico 2 preserva o `ID_*` da v2.0 verbatim — a estabilidade é herdada, não garantida.

## Ambiguidades e decisões pendentes

- [ ] CHK035 `?semana=` como semana ISO exige o par `ano`. A decisão está tomada, e existe requisito para o par **incompleto** na URL? [Ambiguity, Doc 25 §9.2]
- [ ] CHK036 Persistir rascunho de formulário no navegador está decidido? [Assumption, Doc 25 §9.4] ⚠️ O próprio documento marca a decisão como de Bernardo, *"não do arquiteto"* — e ela toca o recorte de PII do Épico 3, porque o rascunho do formulário de instrutor carrega identificação civil.
- [ ] CHK037 Está escrito que o alternador de tema da vitrine **sai** quando o do cabeçalho entrar, e não que os dois convivem? [Conflict, Gap] *(`CHK019` da fatia (a), ainda aberto)*
- [ ] CHK038 As **cinco telas do Épico 3** sem vocabulário visual têm requisito nesta fatia? [Gap] *(`CHK020` da fatia (a), ainda aberto — e a fatia (b) não as tocou, porque entregou componentes e não reescreveu tela)*
- [ ] CHK039 Está escrito se a rota `/estilo` continua **sem sessão** depois de existir navegação autenticada? [Ambiguity] *(`CHK021` da fatia (a), ainda aberto)*
- [ ] CHK040 Existe requisito de **paridade visual por tela**, com critério de medição, para os Épicos 5 a 13? [Measurability] *(`CHK026` da fatia (a), ainda aberto — o critério 8 do backlog é vacuamente verdadeiro enquanto nenhuma tela foi reconstruída)*

## Notas

- Marque com `[x]` conforme fechar, e escreva o achado **na própria linha**, apontando pelo número o
  requisito que o fechou. Fechar item sem apontar o que o fechou é o mesmo que desmarcá-lo por
  cansaço.
- **Um item que reprova não é defeito da fatia (b).** É requisito que a fatia (c) vai ter de inventar
  sozinha, na pressa, e que ninguém vai conferir depois.
- **Quatro itens foram medidos durante a redação**, e não são suposição: o `CHK015` (nenhum dos
  quatro componentes de shell está no inventário), o `CHK025` (não há brasão em `public/`), o
  `CHK031` (nenhuma das duas bibliotecas instalada) e o `CHK012` (a `TabelaDensa` não expõe ordenação
  nem filtro).
- ⚠️ O **`CHK012`** é o de maior alcance imediato: ele é a única linha desta lista que descreve uma
  divergência entre o que a fatia (b) **entregou** e o que o documento 25 **prescreve**. Resolver
  cedo custa uma propriedade; resolver tarde custa reabrir um componente que treze telas já usam.
- ⚠️ O **`CHK010`** e o **`CHK011`** estão na **mesma frase** do backlog — o único critério de aceite
  que exercita deep-link. Um critério de aceite com dois conflitos é um critério que ninguém tentou
  executar.
