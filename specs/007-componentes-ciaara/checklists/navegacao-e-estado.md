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

- [X] CHK001 O **mapa de parâmetros por tela** é declarado contrato fechado por algum `RF-`, ou existe apenas como tabela de documento de arquitetura? [Gap, Doc 25 §1.3] ⚠️ O próprio documento o chama de *"contrato único do sistema"*, e nenhum requisito o cita — então uma tela nova pode inventar parâmetro sem violar requisito nenhum.
  - ✅ **Fechado por** `FR-001` — o contrato virou tipo: parâmetro fora dele **não compila**.
- [X] CHK002 Existe requisito para **parâmetro fora do contrato** na URL — ignorado em silêncio, removido, ou recusado? [Gap, Edge Case]
  - ✅ **Fechado por** `FR-007` — ignorado, registrado em `descartes`, e a tela não quebra.
- [X] CHK003 Existe requisito para **valor inválido** num parâmetro válido (`?semana=99`, `?aba=inexistente`, `?turma=TUR-999999`)? [Gap, Edge Case] ⚠️ Com o `RF-NAV-01`, a barra de endereço passa a ser **entrada de usuário**, e nenhum requisito a trata como tal. É a mesma classe do gotcha nº 4 do BRIEF: a tela abre errada e nada acusa.
  - ✅ **Fechado por** `FR-006` + `FR-041` — cai para o padrão, preservando os demais, antes de virar predicado.
- [X] CHK004 A regra *"parâmetro no valor padrão não aparece na URL"* é requisito, ou comportamento da biblioteca que ninguém cobra? [Traceability, Doc 25 §1.3 regra 1]
  - ✅ **Fechado por** `FR-002` — e há percurso que reprova com `clearOnDefault` desligado.
- [X] CHK005 A política `push` × `replace` tem critério de aceite em algum requisito? [Measurability, Doc 25 §1.6] ⚠️ O próprio documento a chama de *"a única regra que se erra na prática"* — e regra que se erra na prática sem portão é a que se erra na prática.
  - ✅ **Fechado por** `FR-004` — `historico` é campo **obrigatório** do contrato, não opção com padrão.
- [X] CHK006 A limitação de frequência da busca tem **número** em algum requisito? [Clarity, Doc 25 §1.5/§1.6] ⚠️ `throttleMs: 300` aparece **num exemplo de código**; a tabela de regras escreve só `throttleMs`. Valor que vive em exemplo é valor que a próxima tela escolhe de novo.
  - ✅ **Fechado por** `FR-005` — 300 ms em `LIMITE_DE_FREQUENCIA_MS`, e não num exemplo de código.
- [X] CHK007 As **seis proibições** de estado efêmero viraram requisito, ou seguem como tabela de arquitetura? [Gap, Doc 25 §3.3] *(é o `CHK024` da fatia (a), ainda aberto)*
  - ✅ **Fechado por** `FR-009` — as seis viraram requisito e seção do guia `docs/guias/estado-na-url.md`.
- [X] CHK008 Existe requisito que **defina** estado efêmero de interface com exemplo **e contraexemplo**, em vez de defini-lo por lista de casos? [Clarity, Gap, Doc 25 §3.1]
  - ✅ **Fechado por** `FR-010` — definido pela pergunta *"isto faz sentido num link?"*, com exemplo e contraexemplo.
- [X] CHK009 Existe requisito de **desempenho** para a navegação por URL, já que cada mudança de parâmetro passa a ser uma ida ao servidor? [Gap, NFR] ⚠️ A v2.0 trocava contexto em memória; a v2.1 troca por requisição, e nenhum `RNF-PERF` cobre esse caminho.
  - ✅ **Fechado por** `FR-045` — retorno visual imediato, **sem alvo numérico**, e a ausência é deliberada.

## Consistência — entre requisito, arquitetura e o que já foi construído

- [X] CHK010 O critério de aceite 3 do Épico 4 escreve `?turma=T2`; o contrato de parâmetros manda o valor ser o **`codigo` de negócio** (`TUR-000012`). Qual prevalece? [Conflict, Backlog Épico 4 · Doc 25 §1.3]
  - ✅ **Fechado por** `FR-003` — prevalece o contrato: chave de negócio legível. ⚠️ **Não exercitado nesta fatia**, e isso está declarado.
- [X] CHK011 O mesmo critério põe `semana` em `/cursos/[curso]`; o contrato atribui `semana` a `/turmas/[turma]/dsa` e dá a `/cursos/[curso]` apenas `aba` e `turma`. [Conflict, Backlog Épico 4 · Doc 25 §1.3] ⚠️ Dois conflitos na **mesma frase** do único critério que exercita deep-link.
  - ✅ **Fechado por** `FR-001` — o contrato de `lib/navegacao/contrato.ts` passa a ser o árbitro único; o critério do backlog não é fonte.
- [X] CHK012 O documento 25 trata **ordenação de coluna** como estado de URL, com `replace`. A `TabelaDensa` entregue na fatia (b) mantém ordenação **e** filtro textual como estado interno, e **não os expõe por propriedade**. Existe requisito dizendo de quem é a mudança? [Conflict, Doc 25 §1.6 · spec 007 `FR-006`] ⚠️ **É o achado de maior alcance desta lista**: sem a propriedade, a fatia (c) não consegue cumprir o documento 25 sem reabrir o componente.
  - ✅ **Fechado por** `FR-012` + `FR-012.1` — `ordem`/`aoOrdenar` e `busca`/`aoBuscar` opcionais, com fonte única.
- [X] CHK013 O `FiltroAvancado` recebe e devolve estado por propriedade, e a spec 007 declara que levá-lo à URL é da fatia (c). Existe requisito **na fatia (c)** que assuma isso? [Dependency, Gap, spec 007 `FR-007`]
  - ✅ **Fechado por** `FR-014` — ligado ao contrato na vitrine **sem alterar o componente**.
- [X] CHK014 `RF-NAV-02` mantém Avaliações e Relatório **fora** do menu lateral, e o contrato de parâmetros dá **rota própria** às duas. As duas afirmações são compatíveis, e isso está escrito em algum lugar? [Consistency, RF-NAV-02 · Doc 25 §1.3]
  - ✅ **Fechado por** `FR-017` — `FORA_DO_MENU` declara as duas ausências em código, com teste.

## Completude — shell e navegação

- [X] CHK015 Os componentes de shell que o backlog nomeia — layout raiz, navegação lateral, cabeçalho e breadcrumb — **têm linha no inventário do documento 23 §3.1**? [Gap, Doc 23 §3.1 · Backlog Épico 4] ⚠️ Medido em 11/09/2026: **nenhum dos quatro tem**. O inventário é onde cada componente recebe arquivo, base e a coluna `"use client"` — os treze da fatia (b) tinham, e por isso nasceram com endereço.
  - ✅ **Fechado por** `FR-015` — os seis componentes de casca entraram no inventário do documento 23 §3.1.
- [X] CHK016 O **breadcrumb** é citado por algum `RF-`? [Gap, Princípio X] ⚠️ Ele aparece só no backlog. Se é novidade, o Princípio X exige a distinção declarada: *paridade antes de novidade*.
  - ✅ **Fechado por** `FR-040` — **recusa declarada**: sem `RF-` de origem, o breadcrumb é novidade, e o Princípio X a barra.
- [X] CHK017 `RF-NAV-02` proíbe reorganizar o menu e renomear entradas. Existe, em algum lugar, **a lista das entradas atuais** da v2.0, contra a qual a paridade se mede? [Measurability, RF-NAV-02] ⚠️ Sem a lista, a proibição não é verificável — e é exatamente o tipo de requisito que passa por vacuidade.
  - ✅ **Fechado por** `FR-017.1` **em 11/09/2026** — Bernardo validou o menu contra a v2.0 em produção, e a tabela de registro de `specs/008-shell-e-estado-na-url/contracts/casca.md` está preenchida com data: ordem confirmada, rótulo **"Disciplinas"**, Administração como **entrada única**, e entradas futuras **visíveis**, marcadas "em breve". ⚠️ **As quatro respostas confirmaram o rascunho, e `lib/navegacao/menu.ts` não mudou uma linha** — a lista contra a qual a paridade se mede passa a existir, que é o que este item cobrava, e ela custou zero edição de código.
- [X] CHK018 Existe requisito de **acessibilidade da navegação** — marco de navegação anunciado, atalho para pular ao conteúdo, e para onde vai o foco ao trocar de rota? [Gap, Coverage] ⚠️ A fatia (b) fechou o `CHK010` para componentes; a navegação é a parte que ele não alcançou.
  - ✅ **Fechado por** `FR-021` — marco anunciado, atalho para o conteúdo e destino de foco ao trocar de rota.
- [X] CHK019 Existe requisito dizendo **quais segmentos** ganham `loading.tsx` e `error.tsx` nesta fatia, ou apenas a regra geral? [Completeness, RF-MOD-01 · RN-DEG-01]
  - ✅ **Fechado por** `FR-020` — `loading.tsx` e `error.tsx` no grupo autenticado e no segmento de administração.
- [X] CHK020 Existe requisito dizendo **qual parte do shell** leva marcador de cliente? [Gap, Doc 23 §3.2] ⚠️ O shell é o lugar mais tentador do sistema — menu que abre e fecha —, e é onde o marcador custa mais caro: ele contamina toda a subárvore, e o erro **não aparece no `tsc`**.
  - ✅ **Fechado por** `FR-019` — três folhas de cliente declaradas, e `tests/unidade/fronteira-casca.test.ts` conta.

## Completude — a tela Início

- [X] CHK021 O backlog põe a tela Início no Épico 4, e nem a spec 005 nem a 007 a mencionam. Existe requisito atribuindo-a à fatia (c)? [Gap, Backlog Épico 4]
  - ✅ **Fechado por** `FR-028` — a tela Início é desta fatia, em `app/(app)/inicio/`.
- [X] CHK022 O backlog diz que o conteúdo da Início *"acende conforme os épicos 5–9 chegam"*. Existe requisito para o que ela mostra **antes** disso? [Gap, Edge Case] ⚠️ É medição do Épico 3: hoje, depois de entrar, a pessoa cai numa página **sem um único link**. O `CHK025` da fatia (a) já reclamava, e continua aberto.
  - ✅ **Fechado por** `FR-028` + `FR-033` — panorama por turma hoje, e os três estados vazios distintos.
- [X] CHK023 `RF-INI-04` exige alertas consolidados por funções puras de `lib/dominio/`. Existe requisito de **quais predicados** entram nesta fatia e quais esperam os Épicos 5–9? [Dependency, RF-INI-04]
  - ✅ **Fechado por** `FR-031` — a região entra; **um** predicado existe, e os demais esperam os Épicos 5 a 9.
- [X] CHK024 `RF-INI-01` pede progresso por turma sobre `registros_aula`. Existe requisito para o estado **atual** do dado, em que `unidade_ensino_id` é nula nos 1.566 lançamentos migrados? [Dependency, Edge Case, RF-INI-01]
  - ✅ **Fechado por** `FR-028` — o progresso vem de `chd_executada`, que **não depende** de `unidade_ensino_id`.
- [X] CHK025 `RF-INI-05` pede o brasão institucional. Existe requisito de **procedência e licença** do arquivo? [Gap, Assumption, RF-INI-05] ⚠️ Medido em 11/09/2026: `public/` só tem os desenhos padrão do Next. A fatia (a) resolveu isso para a tipografia, com a licença versionada ao lado — aqui não há requisito equivalente, e a spec 009 da v2.0 já registrava os assets como ausentes.
  - ✅ **Fechado por** `FR-032.1` — `public/marca/PROCEDENCIA.md`, e o brasão de tela separado do de impressão.
- [X] CHK026 `RF-INI-02` restringe o panorama ao escopo de curso do perfil e diz que a **RLS** nega. Existe requisito do que a tela **exibe** quando o parâmetro da URL cai fora do escopo? [Gap, RF-INI-02]
  - ✅ **Fechado por** `FR-008` — o vazio distingue *"não há"* de *"você não vê"*, com percurso próprio.

## Cobertura — os quatro comportamentos do `RF-NAV-04`

- [X] CHK027 `RF-AUTH-08` promete devolver ao destino após o login. Existe requisito de que os **parâmetros de consulta** sobrevivam ao `?redirect=`, e não apenas o caminho? [Completeness, RF-AUTH-08 · RF-NAV-04 a] ⚠️ O critério verificável do próprio `RF-AUTH-08` exige `semana=12` de volta — mas quem implementa o `?redirect=` precisa saber disso por requisito, não por leitura atenta de uma nota de rodapé.
  - ✅ **Fechado por** `FR-027` — o retorno preserva caminho **e** parâmetros, medido de ponta a ponta.
- [X] CHK028 `RF-NAV-04` (c) afirma que o link não vaza informação porque a RLS nega. Existe requisito do que a tela **mostra** nesse caso, distinguindo *"não há"* de *"você não vê"*? [Gap, RN-DEG-01 · RF-NAV-04 c]
  - ✅ **Fechado por** `FR-008` — e o percurso dos dois perfis prova que quem nega é o banco.
- [X] CHK029 Os quatro comportamentos são verificáveis **nesta fatia**, em que as telas de destino ainda não existem? [Measurability, RF-NAV-04] ⚠️ Todo critério de aceite escrito usa rotas dos Épicos 5 a 9. Ou a fatia (c) os prova sobre telas provisórias, ou o `RF-NAV-04` fica sem dono — e requisito sem dono é requisito que ninguém conferiu.
  - ✅ **Fechado por** `FR-023` a `FR-026` — provados sobre a vitrine e sobre `/inicio`, que esta fatia entrega.
- [ ] CHK030 Existe requisito para o **histórico** quando a mesma tela é alcançada por dois pontos de entrada — menu lateral e cartão da Início? [Coverage, Gap, RF-NAV-02]
  - ⏳ **Aberto, e declarado** — nenhum requisito desta fatia cobre o histórico quando a mesma tela é alcançada por dois pontos de entrada. Só se exercita quando existir a segunda entrada, no Épico 7.

## Dependências e premissas

- [X] CHK031 Existe requisito declarando **quais dependências** a fatia (c) acrescenta? [Gap, Dependency] ⚠️ Medido em 11/09/2026: nem `nuqs` nem o gerenciador de estado efêmero estão instalados. A fatia (b) mediu antes de instalar e a lista encolheu de catorze para dois — vale repetir o hábito.
  - ✅ **Fechado por** `FR-011` — `nuqs` é a única dependência acrescentada, e há teste contando zero gerenciadores de estado.
- [ ] CHK032 O documento 25 §6 especifica formulário com validação em cliente e servidor, e a spec 007 deixou os dois componentes de formulário de fora por exigirem pacote novo. Existe requisito dizendo **em que fatia** esse pacote entra? [Gap, Dependency, Princípio IX]
  - ⏳ **Aberto** — o pacote de formulário não entra nesta fatia; o `FR-011` proíbe instalar sem consumidor medido, e não há tela de formulário aqui.
- [X] CHK033 Quatro componentes do inventário §3.1 que a fatia (b) não construiu são da tela Início — `SeletorCurso`, `PainelAlertas`, `CardTurma`, `BarraProgressoTurma`. Existe requisito atribuindo-os a uma fatia? [Gap, Doc 23 §3.1]
  - ✅ **Fechado por** `FR-040` e `FR-028` — os quatro componentes não entraram; a tela usa o vocabulário existente, e eles voltam com as telas que os pedem.
- [ ] CHK034 A premissa de que o **`codigo` de negócio é estável** o bastante para virar URL pública está confirmada? [Assumption, Doc 25 §9.1] ⚠️ Um link favoritado quebra se o código for reemitido, e o ETL do Épico 2 preserva o `ID_*` da v2.0 verbatim — a estabilidade é herdada, não garantida.
  - ⏳ **Aberto por depender de Bernardo** — a estabilidade do `codigo` de negócio é premissa herdada do ETL, não garantida.

## Ambiguidades e decisões pendentes

- [X] CHK035 `?semana=` como semana ISO exige o par `ano`. A decisão está tomada, e existe requisito para o par **incompleto** na URL? [Ambiguity, Doc 25 §9.2]
  - ✅ **Fechado por** `FR-006` — par incompleto usa o padrão no que falta, com percurso em `url-degradada.spec.ts`.
- [ ] CHK036 Persistir rascunho de formulário no navegador está decidido? [Assumption, Doc 25 §9.4] ⚠️ O próprio documento marca a decisão como de Bernardo, *"não do arquiteto"* — e ela toca o recorte de PII do Épico 3, porque o rascunho do formulário de instrutor carrega identificação civil.
  - ⏳ **Aberto por depender de Bernardo** — o próprio documento 25 marca a decisão como dele, e ela toca o recorte de PII do Épico 3.
- [X] CHK037 Está escrito que o alternador de tema da vitrine **sai** quando o do cabeçalho entrar, e não que os dois convivem? [Conflict, Gap] *(`CHK019` da fatia (a), ainda aberto)*
  - ✅ **Fechado por** `FR-018` — o alternador da vitrine **saiu**, e há percurso que confere os dois lados.
- [X] CHK038 As **cinco telas do Épico 3** sem vocabulário visual têm requisito nesta fatia? [Gap] *(`CHK020` da fatia (a), ainda aberto — e a fatia (b) não as tocou, porque entregou componentes e não reescreveu tela)*
  - ✅ **Fechado por** `FR-022` — as cinco telas do Épico 3 ganharam o vocabulário visual.
- [X] CHK039 Está escrito se a rota `/estilo` continua **sem sessão** depois de existir navegação autenticada? [Ambiguity] *(`CHK021` da fatia (a), ainda aberto)*
  - ✅ **Fechado por** `FR-038` — `/estilo` permanece sem sessão, fora do grupo autenticado e sem a casca.
- [ ] CHK040 Existe requisito de **paridade visual por tela**, com critério de medição, para os Épicos 5 a 13? [Measurability] *(`CHK026` da fatia (a), ainda aberto — o critério 8 do backlog é vacuamente verdadeiro enquanto nenhuma tela foi reconstruída)*
  - ⏳ **Aberto** — paridade visual por tela só é mensurável quando houver tela reconstruída; nenhuma dos Épicos 5 a 13 existe ainda.

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


---

## Fechamento de 11/09/2026 — Épico 4, fatia (c)

**35 dos 40 fechados**, cada um apontando pelo número o requisito que o fecha (`SC-016`).

Os **cinco que continuam abertos** não são pendência de implementação, e a distinção importa:

| # | Por que continua aberto |
|---|---|
| `CHK030` | só se exercita quando existir a segunda entrada para a mesma tela (Épico 7) |
| `CHK032` | o pacote de formulário não tem consumidor nesta fatia, e o `FR-011` proíbe instalar antes |
| `CHK034` | premissa sobre estabilidade do `codigo`, herdada do ETL — decisão de Bernardo |
| `CHK036` | rascunho de formulário no navegador — decisão de Bernardo, e toca PII |
| `CHK040` | paridade visual por tela não é mensurável antes de existir tela reconstruída |

⚠️ **TRÊS DELES ESPERAM UMA DECISÃO, E NÃO CÓDIGO.** Fechá-los por conta própria seria decidir no
lugar de quem decide — é o Princípio I. **O quarto era o `CHK017`, e ele fechou em 11/09/2026** pelo
único caminho que existia: perguntar.
