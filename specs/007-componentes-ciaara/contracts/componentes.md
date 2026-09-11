# Contrato — os treze componentes CIAARA

**Fase 1** · 10/09/2026 · fonte: [research.md](../research.md) · documento 23 §3.1 e §3.2

## A regra que vale para todos, antes da tabela

Um componente de `components/ciaara/` **exibe**. Ele não busca dado, não decide regra e não escolhe
cor. As três proibições têm portão: o `SC-007` conta importações de banco e de regra `RN-` e exige
zero; a regra de lint reprova cor; e a fronteira de `lib/dominio/` é imposta por ESLint desde o
Épico 0.

⚠️ **A quarta proibição é a que não tem portão e mais custa: `"use client"` por precaução.** O
marcador contamina toda a subárvore de importação, e um deles no lugar errado manda a tabela de 177
linhas para o pacote do navegador. A coluna abaixo é o documento 23 §3.1 **literal** — não é
sugestão, e componente que não tem interação não recebe o marcador.

---

## Os treze

### `CardKpi` — `RF-DS-02` · sem marcador de cliente

**Recebe** rótulo, valor, unidade opcional, e uma variação opcional com sentido declarado.
**Rende** número grande, rótulo e unidade.
**Não faz** cálculo. Quem divide, soma ou compara é quem chama.

⚠️ **A variação declara o sentido, não o sinal.** Uma queda de 5% pode ser boa ou ruim conforme o
indicador, e o componente não tem como saber qual. Quem chama diz se a variação é favorável.

### `BadgeStatus` — `RF-DS-02` · sem marcador de cliente

**Recebe** um `Tom` e um rótulo.
**Rende** etiqueta com o trio de tokens do tom **e o rótulo textual sempre**.
**Não faz** tradução de valor de banco para tom. O de-para é de quem chama.

⚠️ **O rótulo não é opcional, e é o `FR-025` no tipo.** Um emblema que comunica só por cor é
invisível para quem não as distingue e some na impressão em preto e branco.

### `BadgeTeto` — `RNF-NORM-01..03` · **com** marcador de cliente

**Recebe** um `Teto` — rótulo, limite, medido e explicação.
**Rende** o emblema com a comparação e, ao apontar, a explicação.
**Não faz** a avaliação do teto, que é `RN-EVT-01`, função pura.

⚠️ **Nunca bloqueia, nunca desabilita, nunca impede o salvamento** — `RN-DEG-02`, regra 6 do
contrato do projeto. Transformar teto em impedimento mudaria a regra de negócio.

### `TabelaDensa` — `RNF-USA-02/06` · **com** marcador de cliente

**Recebe** `linhas: readonly T[]`, `colunas: readonly Coluna<T>[]`, `chaveLinha`, densidade e busca.
**Rende** a tabela com ordenação de apresentação, filtro textual e navegação por teclado.
**Não faz** ordenação de domínio, agregação, nem janela de visão.

⚠️ **Renderiza TODAS as linhas** — `FR-006.1`, decisão de 10/09/2026.
⚠️ **A navegação por teclado é o [contrato de teclado](./teclado.md)**, e não se improvisa.
⚠️ **Coluna numérica liga o algarismo tabular** que a fatia (a) deixou no `@theme` — sem ele, uma
coluna de horas não alinha e a tabela densa perde o que a torna densa.

### `FiltroAvancado` — `RF-DS-02` · **com** marcador de cliente

**Recebe** `campos: readonly CampoDeFiltro[]`, `estado: EstadoDeFiltro` e um retorno de mudança.
**Rende** os campos, recolhíveis, com a contagem por opção.
**Não faz** a filtragem em si, nem o recálculo das contagens.

⚠️ **Ele não conhece instrutor, turma, disciplina nem curso** — é o teste de que a fatia entregou
vocabulário e não uma tela disfarçada de componente. Se para atender a spec 006 for preciso escrever
a palavra "instrutor" aqui dentro, o componente está errado.
⚠️ **A filtragem cruzada aparece na contagem**, que muda a cada escolha. Quem recalcula é quem chama.

### `AlertaConformidade` — `RNF-USA-04`, `RN-DEG-02` · sem marcador de cliente

**Recebe** `Tom`, título, lista de avisos.
**Rende** faixa fixada no topo da região, com ícone, rótulo e região anunciada a leitor de tela.
**Não faz** avaliação normativa, e **não oferece botão de dispensar**.

⚠️ **"Sempre visível" quer dizer: durante toda a permanência na tela, sem depender de rolagem e sem
poder ser fechado** — [research.md §R-5](../research.md). Fixar posição é folha de estilo, e é por
isso que este componente **não** leva marcador de cliente.
⚠️ **Alerta, nunca bloqueio.** Ele aparece ao lado da ação, não no lugar dela.

### `SeletorTurma` — `RF-CURSO` · **com** marcador de cliente

**Recebe** turmas com identificador e rótulo, valor escolhido e retorno de mudança.
**Rende** seletor simples. **29 turmas não pedem busca.**
**Não faz** ordenação de domínio — turma não tem regra de antiguidade.

⚠️ **Nunca exibe identificador técnico ao usuário** — `FR-027.3` da spec 006.

### `SeletorInstrutor` — `RN-ANT-01`, *Risco: Alto* · **com** marcador de cliente

**Recebe** `readonly InstrutorParaExibir[]`, a escala P/G vinda de `config_listas`, valor e retorno.
**Rende** campo de busca mais lista navegável, com cada nome pelo `NomeInstrutor`.
**Não faz** o cálculo do peso de antiguidade.

⚠️ **ORDENA SEMPRE**, aplicando a função pura, e **ignora a ordem em que a lista chegou** —
`FR-011.1`, decisão de 10/09/2026. Um ponto único que apenas exibe aceita lista desordenada: o
esquecimento não desaparece, só muda de lugar.
⚠️ **É o ÚNICO construtor de seletor de instrutor do repositório**, e isso é contado — `SC-002`
exige exatamente um, e exige que esse um reordene o que recebe.
⚠️ **Posto desconhecido vai para o fim, com aviso** — nunca some (`RN-DEG-01`).

### `NomeInstrutor` — `RF-INSTR-15`, `RF-DS-05` · sem marcador de cliente

**Recebe** um `InstrutorParaExibir`.
**Rende** `P/G Especialidade/Habilitação Nome Completo`, com as palavras do nome de guerra em
negrito.
**Não faz** o cálculo de quais palavras destacar — é a função pura de `lib/dominio/`.

⚠️ **O nome COMPLETO aparece.** A compressão para "nome de guerra" que a `FR-012` escreve descarta
o nome completo e contraria o `RF-INSTR-15`, que é **[PRESERVADO]** — achado P-1 do plano.
⚠️ **Palavras não contíguas recebem destaque cada uma**, e palavra sem correspondência não recebe
destaque nem lança exceção. É o porte da spec 020 da v2.0, com seus casos de teste.
⚠️ **Consumido também pelas rotas de impressão**, nos Épicos 10 e 11 — por isso, sem marcador de
cliente. É a coisa que a v2.0 não conseguia, porque as duas metades dela não compartilhavam código.

### `EstadoVazio` — `RN-DEG-01` · existe, revisar · sem marcador de cliente

**Recebe** motivo, título e ação sugerida opcional.
**Rende** o vazio explicado.
**Não faz** suposição sobre a causa.

⚠️ **Distingue *"não há"* de *"você não vê"***, que é o gotcha nº 4 do BRIEF: policy restritiva
demais abre a tela vazia **sem erro**, e o usuário conclui que não há cadastro.
⚠️ **A revisão desta fatia é consumir o vocabulário**, que não existia quando ele nasceu.

### `DialogoConfirmacao` — `RNF-USA-03` · **com** marcador de cliente

**Recebe** título, descrição da consequência, rótulo da confirmação e retorno.
**Rende** diálogo modal com foco preso e retorno de foco ao fechar.
**Não faz** a ação.

⚠️ **A consequência não é perda** — nada é apagado neste sistema (regra 4). Desativar é reversível
no banco e consequente na tela, e é para a consequência que o `RNF-USA-03` pede confirmação. Achado
P-4 do plano.

### `CampoObrigatorio` — `IND-01` · sem marcador de cliente

**Recebe** o rótulo e o estado de obrigatoriedade.
**Rende** rótulo com a marca de obrigatório, associado ao controle.
**Não faz** validação. Quem valida é Zod, na Server Action.

⚠️ **O traço do campo usa `--texto-tenue`** — `FR-032`, decisão de 10/09/2026 sobre medição.
⚠️ **A marca de obrigatório não é só a cor do asterisco**: o estado vai no atributo que o leitor de
tela lê, senão a obrigatoriedade existe só para quem enxerga.

### `EsqueletoTabela` — `RNF-PERF-06` · sem marcador de cliente

**Recebe** contagem de linhas e de colunas.
**Rende** a silhueta da tabela que está chegando.
**Não faz** medição de tempo nem decisão de quando aparecer.

⚠️ **Respeita a preferência por menos movimento** (`FR-029`): sem pulsação para quem a declarou.
⚠️ **A silhueta tem o formato do conteúdo real.** Um esqueleto de proporção diferente é um salto de
layout disfarçado de carregamento.
