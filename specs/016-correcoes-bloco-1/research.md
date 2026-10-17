# Research — spec 016 (Bloco 1)

*Fase 0 do plan, 17/10/2026. Cada decisão traz o que foi escolhido, por quê, e o que foi descartado.*

> **Onde foi medido** (regra 9.2): código no ramo `fix/BLOCO-1-correcoes-de-tela`; dado no banco **local**
> restaurado da cópia **`remoto-20261017-005738.sql`**; as contas de antes × depois rodaram **com as
> funções reais** de `lib/dominio/` (`andamentoDaTurma`, `cargaPorSemana`, `semanasForaDaFaixa`,
> `semanasDaJanela`), num Vitest com configuração no scratchpad, fora do repositório. Nenhuma escrita no
> remoto.

---

## R-1 — Três PRs, não dois

**Decisão:** PR 1 — casca, entrada, listas e fichas (1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 1.10, 1.15); PR 2 —
DSA, papel e planilha (1.5, 1.8, 1.9, 1.11, 1.12); PR 3 — banco (1.13 e 1.14, com as duas migrations e
as telas que dependem delas). Ordem: 1 → 2 → 3, cada um num ramo novo a partir da `main` atualizada.

**Por quê:**
- O DSA é usado todo dia, e o 1.9 muda o número que sai **no papel assinado**. Uma conferência só do
  DSA é mais segura que uma conferência de oito telas e do DSA juntos.
- Os itens do DSA mexem nos **mesmos arquivos**: `components/ciaara/grade-dsa.tsx`,
  `app/(app)/turmas/[turma]/dsa/leitura.ts`, `app/print/dsa/` e `lib/dominio/dsa/planilha/`.
- O 1.5 vai **inteiro** para o PR 2: a guarda reforçada de datas reprovaria no PR 1 enquanto o papel e
  a planilha (arquivos do DSA) não fossem corrigidos.
- O PR 3 vem depois do PR 1 porque a marca *"só habilitado"* (FR-013.4) mora na ficha do instrutor que o
  1.10 reorganiza, e depende da view corrigida para saber **qual** atribuição conta no ano.
- Isolar o DSA isola também as suítes de ponta a ponta mais instáveis sob carga (`PEND-014-7`).

**Descartado:** a proposta de dois PRs (doze itens de tela num PR só); quatro PRs, um por migration
(exige o dobro do rito do remoto sem ganho de reversão, porque as duas migrations já são independentes).
**Confirmação de Bernardo: P-1 da §11 do plan.**

## R-2 — "Executado até hoje": uma base por fato e duas funções com a data obrigatória

**Decisão:** a M1 cria `public.vw_chd_por_fato` (um fato de CHD por linha: turma, disciplina, data,
tempos, origem) e duas funções de leitura, `public.chd_da_turma_ate(p_ate)` e
`public.execucao_por_disciplina_ate(p_ate, p_turma_id)`, que somam a base **até a data recebida**. As
views de hoje (`vw_carga_horaria_turma`, `vw_disciplinas_execucao`) **não mudam**.

**Por quê:**
- **Medido: a base reproduz as duas views sem diferença** — sem corte, a soma por turma bate com
  `chd_executada` em **29 de 29** turmas, e a soma por turma × disciplina bate com `ta_executados` em
  **228 de 228** linhas. **Nenhum** fato tem data nula (2.163 aulas, 180 aplicações de prova, 19 sessões
  de aplicação, 148 vistas). **Nenhum** fato está sem disciplina.
- A data entra **por parâmetro, sem valor padrão**: é o FR-014.3 (*"hoje passado explicitamente"*) e o
  D20 fechado na raiz — uma função que não sabe que dia é não pode errar o fuso.
- Não mexer nas views de hoje é o FR-014.5 (*"a soma que o DSA e a planilha usam MUST NOT mudar"*), e
  evita recriar duas views com dependentes (`vw_conformidade_tetos` exige a ordem das colunas).
- A soma fica **no banco**, sob a RLS de quem lê (as duas funções e a base são `security invoker`); o
  TypeScript só recebe o número — `andamento-da-turma.ts:17-20` continua sem reimplementar a soma.

**Descartado:**
- **Cortar em TypeScript** somando `vw_ocupacao_ta`: perde a linha sem posição (a view exige
  `ta_inicial`), que é a forma da semente do e2e.
- **Colunas novas nas views com a data de São Paulo dentro do SQL:** esconde o "hoje" no banco
  (contra o FR-014.3) e não serve a `/disciplinas` com a mesma base.
- **Refatorar as duas views para lerem da base** (uma composição só): elimina a cópia da composição,
  mas recria duas views com dependentes e toca a leitura do DSA. **Pergunta P-3 da §11.** A proteção
  escolhida no lugar é **invariante pgTAP**: a base sem corte tem de bater com as duas views, sempre.

## R-3 — A composição da CHD na base

**Decisão:** a base soma as linhas **ativas** de `registros_aula` (com a disciplina da UE ou a da
linha), a **aplicação** de toda avaliação viva (`pendente`, `em_andamento`, `concluida`, `atrasada`),
as **sessões de aplicação** e as **vistas** ativas dessas avaliações — cada uma com a **sua** data.

**Por quê:** é a mesma composição das duas views. `vw_carga_horaria_turma` filtra `registros_aula` por
categoria (`aula` e `atividade_extraclasse`), e o enum `categoria_registro_aula` **só tem essas duas**
(medido) — incluir toda linha ativa é idêntico. Cada pedaço com a sua data é o que faz "até hoje"
ter sentido para a prova aplicada hoje e vista na semana que vem.

## R-4 — A janela da CH prevista vem inteira de uma fonte

**Decisão:** na M2, a janela da atribuição (início **e** término) vem da **primeira fonte que tem as
duas datas**, nesta ordem: linha da turma → disciplina → janela da turma (Q-7). O ano é o do início
dessa janela. Se nenhuma fonte tem as duas datas, o ano sai do primeiro início que existir e a janela
fica sem término — a atribuição conta no ano e não entra no alerta semanal. **As colunas da view não
mudam.**

**Por quê:**
- O banco **permite** início sem término nas três fontes (os `CHECK` só exigem término ≥ início quando os
  dois existem). Hoje há **0** pares pela metade, mas misturar o início de uma fonte com o término de
  outra produziria uma janela que ninguém cadastrou.
- Colunas iguais deixam a **reversão** trivial (`create or replace view` com o corpo anterior) e não
  tocam `vw_instrutor_carga_anual`, que lê desta view.
- `vw_disciplinas_execucao` já usa *"período da linha da turma, senão o da disciplina"* (`previsao_inicio_efetiva`):
  é o mesmo critério, mais a janela da turma.

**Medido:** das **108** atribuições, a janela passa a vir da linha da turma em **103** e da turma em
**5**; **9** mudam de janela, e **8** delas são as que não tinham ano.

**Descartado:** `coalesce` independente para início e término (o que a `vw_disciplinas_execucao` faz,
listado como divergência no plan §8); coluna nova dizendo a origem da janela (complica a reversão; a
ficha não precisa dela).

## R-5 — A média semanal de reserva mora no domínio

**Decisão:** a view continua devolvendo `semanas` e `media_semanal` como hoje (nulos quando a disciplina
não tem semanas cadastradas). A ficha usa um módulo novo, `lib/dominio/media-semanal.ts`, que devolve a
média cadastrada quando existe e, senão, **CH prevista ÷ número de semanas da janela**, com as semanas
contadas por `semanasDaJanela` (`lib/dominio/distribuicao-semanal.ts`).

**Por quê:** é a `RN-DIST-02` aplicada (*"…ou a carga horária total dividida pelo número de semanas da
janela"*) com a régua única de semana da `RN-DIST-01` — e a única leitora de `media_semanal` é a ficha
do instrutor (medido: `instrutores/[codigo]/page.tsx` e `CargaDoInstrutor.tsx`). Módulo novo porque
`carga-semanal.ts` e `distribuicao-semanal.ts` já se importam num sentido; pôr a função em qualquer um
dos dois criaria importação circular.

**Descartado:** contar as semanas da janela em SQL dentro da view (segunda régua de semana, contra a
`RN-DIST-01`).

## R-6 — O fuso

**Decisão:** "hoje" é `hojeNaCiaara()` (`lib/formato/ano-corrente.ts`, `America/Sao_Paulo`), calculado
no Server Component e passado como `p_ate` às duas funções. "Amanhã" é calculado no domínio, por uma
função `diaSeguinte(iso)` de aritmética de calendário sobre `aaaa-mm-dd`, dentro de `andamentoDaTurma`.
As funções **não têm valor padrão** para a data, e um pgTAP reprova `current_date`, `now()`,
`current_timestamp` e `localtimestamp` no corpo delas, lido sem comentário (regra 9.1.1).

**Por quê:** o precedente `app.fn_status_vista(p_avaliacao_id, p_hoje date default current_date)` tem o
valor padrão em UTC e depende de quem chama lembrar de passar o dia; aqui o esquecimento vira erro de
chamada, não número errado das 21h à meia-noite.

**Fica de fora, registrado:** `vw_cursos_regime_vigente` usa `current_date` para escolher o regime
vigente (o D20 original). O andamento lê o regime dali; numa troca de regime, a escolha pode adiantar um
dia entre 21h e meia-noite. Não é deste bloco.

## R-7 — A semana do curso substitui o número CRONOS

**Decisão:** um módulo novo, `lib/dominio/dsa/semana-do-curso.ts`, substitui `numero-do-dsa.ts`. Ele
recebe `data_inicio` e `data_termino` da turma, `duracao_semanas` do curso e a semana pedida, e devolve
`{ numero, total, motivo }` e o aviso de cadastro do FR-009.7. N é a distância, em semanas, entre a
segunda-feira da semana do início e a da semana pedida, mais um — calculada pelas segundas-feiras que
`semanaIsoDe` já devolve, o que atravessa o ano sem caso especial. T segue a Q-1. O rótulo é *"Semana N
de T"*, ou *"Semana N"* sem T.

**Consumidores que mudam** (medido): a montagem única `app/print/dsa/documento.ts:69-73` (tela, papel e
planilha passam por ela), os avisos antes de imprimir (`dsa/page.tsx:291-292`), a navegação
(`NavegacaoDaSemana.tsx:153-155`), o cabeçalho da tela (`DocumentoNaTela.tsx:24-28`), o papel
(`DocumentoDoDsa.tsx:110-115`, `:227-230`) e a **fórmula** da planilha (`preenchimento.ts:579-635`, que
fica mais simples: diferença de datas ÷ 7 + 1, com funções do Excel 2007, `DP-2` da spec 015). A guarda
`tests/unidade/distribuicao-unica.test.ts:131,176-183` passa a apontar para o módulo novo.

## R-8 — Dois lançamentos no mesmo TA

**Decisão:** a leitura do DSA passa a trazer `criado_em` e `codigo` de cada fato (hoje traz só `id` e
ordena por `codigo`); `montarSemana` ordena por **(TA inicial, criado_em, código)** e manda o segundo
lançamento que começa no mesmo TA para a faixa *"sem posição"* com o motivo *"no mesmo TA de outro
lançamento"* — o mesmo texto que a planilha já usa (`MOTIVO_SOBREPOSTO`, que passa a morar num lugar
só). Papel e planilha herdam, porque leem a mesma grade.

**Por quê:** o `fato_id` é um `uuid` novo a cada carga (`PEND-DSA-SUGESTAO`); `criado_em` e código não
mudam. E a grade já declara o princípio no cabeçalho de `grade.ts`: *"um lançamento nunca pode ficar
escondido"*.

## R-9 — A sugestão de instrutor e técnica

**Decisão:** a leitura das atribuições por UE passa a ligar por `turma_disciplina!inner(turma_id)` com
`status = 'ativo'` — exatamente como a planilha já faz (`planilha/leitura.ts:106-117`); a tela passa a
ler também `turma_disciplina_instrutor` (o segundo degrau) e `tecnica_ensino_sugerida` de UEs e
disciplinas; o formulário chama `preencherLancamento` com tudo isso, e a lista de candidatos chega em
antiguidade. Um erro de leitura vira aviso na tela (`RN-DEG-01`), e a planilha deixa de precisar de
`FALHA_CONHECIDA_DO_DSA`.

**Medido:** **4** atribuições por UE, **110** por disciplina (em **92** linhas de turma) e **0** técnicas
sugeridas — o degrau por disciplina é o que vai fazer diferença hoje.

## R-10 — A faixa Beta

**Decisão:** `lib/ambiente.ts` ganha `ambienteDeclarado()`, que devolve `local`, `preview`, `producao` ou
`null` sem o padrão de hoje (`ambienteAtual()` não muda, porque outros pontos o usam). O texto sai de uma
função pura: o texto Beta, mais *"· ambiente local"* ou *"· pré-visualização"* só com `local` ou
`preview` declarados (NQ-3), mais o aviso de variável por preencher que existe hoje. A faixa vira
`sticky` no topo, e a altura dela vai para uma variável de CSS que a lateral fixa
(`painel-retratil.tsx:152`) desconta. O `data-slot="faixa-de-ambiente"` fica, porque
`dsa-imprimir.spec.ts:114` e `impressao.css` dependem dele; o CSS da impressão passa a valer também nos
estados de carregamento e erro de `/print/dsa`.

## R-11 — A contagem de filtros

**Decisão:** uma função em `lib/navegacao/` conta os parâmetros **fora do padrão** a partir do contrato
de parâmetros da rota (`lib/navegacao/contrato.ts` já tem o `padrao` de cada um). A tela passa o número ao
`FiltroAvancado` (propriedade `ativos`) e `ativos > 0` ao `BotaoLimparFiltros`. O componente só mostra o
número.

**Por quê:** é a mesma regra para o selo e para o "Limpar filtros" (FR-004.2), num lugar só, e o
componente continua sem palavra de domínio e sem conta (`tests/unidade/filtro-avancado.test.ts:61-85`). O
padrão já é dado do contrato; reescrevê-lo em cada tela é o que fez o selo e o botão discordarem.

## R-12 — Trocar situação

**Decisão:** uma Server Action nova, `trocarSituacaoDaTurma`, em `lib/acoes/turma.ts`, com Zod na
primeira linha (`codigo` e `status`), um `UPDATE` só da coluna `status`, zero linhas tratado como recusa
de alcance (o mesmo `recusaPorAlcance` de hoje) e erro do banco traduzido. Um diálogo de cliente, folha,
ao lado do selo no cabeçalho da ficha. O esquema Zod da turma se divide: **criação** com `status`,
**edição** sem ele (FR-015.4).

**Por quê:** um caminho só para a troca de situação, que é onde o Bloco 2 vai pendurar a observação
(D-COR-4). E um `UPDATE` de uma coluna não reescreve a sala e as datas de quem só queria concluir a
turma.

## R-13 — Pizza com as 4 maiores e "Outras (N)"

**Decisão:** um auxiliar puro em `components/graficos/tipos.ts` agrupa as categorias além das 4 maiores
numa fatia *"Outras (N)"*, respeitando `MAXIMO_DE_CATEGORIAS_NA_PIZZA = 5`; a lista em texto abaixo do
gráfico continua com todas.

## R-14 — Barra de ações única

**Decisão:** um componente `components/ciaara/barra-de-acoes.tsx` usado na página do curso (Editar ·
Desativar/Reativar · Nova turma) e na ficha do instrutor (Editar · Desativar/Reativar · Excluir), com
botões do mesmo tamanho; cada botão continua com a sua permissão. A edição do instrutor fica num
recolhível, como `EdicaoDaTurma.tsx`.

**Por quê:** a mesma barra nas duas fichas é o que o Bloco 1 começa a padronizar (*"Fora do plano"* do
documento de correções: *"padronizar os botões"*), e um componente só evita a terceira cópia.
