# Spec 029 — Bloco 14: DSA (TFM, Estudo Individual, salvar alteração), Início e pendências dos Blocos 10 e 11

**Pedido:** Bernardo Villas Boas, 28/10/2026, pelo `/corrigir` — *"Bloco 12 — DSA (TFM, Estudo Individual, salvar
alteração), Início e pendências dos Blocos 10 e 11. Rodar sozinho até o PR."* O número 12 já é o do Calendário (spec 027)
e o 13 o da moeda (spec 028), os dois concluídos: este pedido é o **Bloco 14** (D-1). **Ramo:**
`fix/BLOCO-14-dsa-inicio-e-pendencias`, a partir da `main` `07d84c3`. **Regras novas:** **RP-9** em
[`docs/correcoes/regras-da-publicacao-do-dsa.md`](../../docs/correcoes/regras-da-publicacao-do-dsa.md) e **RT-8** em
[`docs/correcoes/padroes-de-tela.md`](../../docs/correcoes/padroes-de-tela.md). **Emenda normativa:** a **RN-DIST-03 (a)**
do documento 04 (o teto de 6 TA de TFM), por decisão nominal de Bernardo de 27/10/2026. **O papel do DSA não muda** para
o dado que existe (os itens 1 a 3 mexem no fluxo; o item 2 só dá texto à linha nova que vier sem descrição): o merge não
espera virada de semana. **Banco:** uma migration que **só acrescenta** (item 2) — segue com o rito completo do remoto.

## 1. O problema, em uma frase

O DSA recusa a semana com mais de 6 TA de TFM, exige *"O que é"* no Estudo Individual e não deixa guardar uma alteração
sem publicá-la; a carga do instrutor não enxerga a turma de outro ano; o saldo ignora o regime trocado no DSA; o seletor
de instrutor vazio diz o motivo errado; os cartões do ano esquecem as turmas arquivadas; e no Início o papel do DSA
publicado fica embaixo, maior que a janela.

## 2. Paridade ou novidade (regra 3)

- **Defeito** (itens 4, 6 e 7): a janela da carga cai fora do ano da turma (PEND-025-5); o vazio do seletor diz *"Nada
  cadastrado ainda"* quando o vazio vem de um filtro (PEND-026-2); os cartões do ano descontam a arquivada, contra a A-2
  de 20/10/2026 (*"os números do painel continuam contando todas"*).
- **Decisão nominal de Bernardo** (item 1): a RN-DIST-03 (a) é emendada — o TFM deixa de ter teto rígido.
- **Novidade pedida nominalmente** (regra 3, autorização neste pedido): o «O que é» opcional no EI (item 2), o *Salvar
  alteração* (item 3, RP-9), o saldo pelo regime da semana (item 5, alternativa da D-15 da spec 026), a regra RT-8
  (item 7) e a nova ordem do Início (item 8).
- **Contenção de escopo (regra 2):** tudo é da CIAARA-11 — DSA, turma, instrutor, Início.
- **Documento 04:** muda **só** a RN-DIST-03 (a), no `.md`, com a nota de que o `.docx` não recebeu a emenda. Nenhuma
  outra regra muda.

## 3. A triagem — o pedido, item a item, medido na `main` `07d84c3`

Medido no código e na cópia do remoto `remoto-20261028-133702.sql` (restaurada no banco local, só leitura).

| # | Item | Tipo | Medido |
|---|---|---|---|
| 1 | TFM sem limite de 6 TA | decisão (emenda RN-DIST-03 a) | **Regra fixa, só em TypeScript**: o veredito sai de `lib/dominio/dsa/tetos.ts` (ramo TFM) e a Server Action `lib/acoes/dsa.ts` recusa no **lançar** e no **editar/mover** do cartão; o 6 vem do parâmetro `dsa.teto_tfm_semana`. **Nenhum** gatilho, função, CHECK, Zod ou tela de cadastro confere TFM (`limites_curriculo` só aceita AEC/TAD/TR; não há tela de parâmetros) — **não há limpeza pela tela a fazer**. O Salvar da semana não confere teto. Portes da mesma regra nos scripts da carga (`scripts/carga_dsa/plano.py` recusa; `resolver.py` avisa). No remoto: **5** disciplinas ativas de TFM (C-Ap-FR X, C-Ap-HN XVII, C-Espc-FR TFMFR-004, C-Espc-HN HN-1103-0506, CAHO XIX) e **1** semana já com **10** TA de TFM salvos (entrou pela sincronização, que só avisava). Os parâmetros `dsa.teto_tfm_semana` e `alocacao.teto_tfm_rigido` estão ativos em `6`. |
| 2 | «O que é» opcional no EI | novo | Obrigatório em **três camadas**: `required` no campo (`FormularioDeLancamento.tsx`), `min(1)` no Zod (`lib/validacao/dsa.ts`) e `atividades_nao_letivas.descricao text not null` desde a criação. No remoto: **1.090** EI, **0** nulas e **0** em branco (nenhuma categoria tem descrição vazia). O papel imprime o EI na grade como a linha fixa *ESTUDO INDIVIDUAL*; o EI que cai **no mesmo TA** de outro lançamento usa a descrição (sairia em branco). |
| 3 | Salvar alteração (RP-9) | novo | **Sem banco**: `salvar_semana_do_dsa` só recusa semana **travada**, e em alteração ela não está travada — o próprio *Publicar alteração* já salva antes de publicar. Início, Imprimir/Reimprimir e histórico leem **só** os eventos de publicação e o retrato. *Descartar* já inativa só os rascunhos (volta ao último salvo). O selo é decidido em `lib/dominio/dsa/publicacao.ts`. A planilha de contingência lê o **salvo** (não o retrato). No remoto: **0** semanas publicadas sem regime gravado. |
| 4 | PEND-025-5, janela da carga | 🐛 defeito | A janela vem de `vw_instrutor_carga_prevista` (`previsao_inicio/termino`: linha da turma → disciplina → turma, inteira da primeira fonte com as duas datas) e é usada pela ficha do instrutor e por Avisos. No remoto, das **115** atribuições ativas, **110** têm a janela dentro do período da turma; **4** (C-Exp-MetocOf 2026, uma semana além do término) transbordam; **1** (CAHO 2027, HIDROGRAFIA, instrutor 40: janela 11/05–16/10/**2026**, turma 05/01–17/12/**2027**) é **disjunta** — o alerta lilás de 2027 não a vê. |
| 5 | PEND-026-1, saldo pelo regime da semana | novo (alternativa da D-15 da spec 026) | O saldo usa **um** TA/dia para a janela inteira (`regimeEfetivo`: Editar turma > padrão de hoje do curso) em `lib/dominio/andamento-da-turma.ts`, nos quatro leitores (Início, Avisos, `/turmas`, ficha). O regime da semana (`dsa_regime_da_semana`, `turma_regime_vigencia`) e a resolução `regimeDaSemana` já existem. No remoto: **0** «desde», **0** «só esta semana», **5** semanas `gravado` (4 turmas), todas com o regime do curso. **Efeito medido (Q2): nenhuma turma muda de saldo** com a recomendação (D-12); a alternativa (exceção do curso na semana) mudaria 6 turmas sem «desde». |
| 6 | PEND-026-2, frase do seletor vazio | 🐛 defeito (premissa invertida) | O `SeletorInstrutor` tem `motivoDoVazio = "sem-dado"` por padrão e **nenhum** chamador passa outro valor: a frase *"o seu perfil não os alcança"* **nunca aparece**. O vazio mostra *"Nada cadastrado ainda / Nenhum instrutor disponível para escolher."* mesmo quando vem de filtro: disciplina sem habilitado (TA fora do DSA) ou ninguém atribuído (rateio por UE). No remoto: os 9 perfis têm `instrutores.ler`; **8** linhas de turma ativa sem nenhum habilitado ativo. |
| 7 | RT-8, arquivada nas estatísticas | 🐛 defeito + regra nova | Dois filtros em TypeScript tiram a arquivada: os cartões do Início (`inicio/page.tsx`, antes do panorama) e os indicadores de `/turmas` (`lib/dominio/painel-de-turmas.ts`, sem *Mostrar arquivadas*). Cursos, Instrutores e a ficha do instrutor **já** contam a arquivada; nenhuma view do banco a filtra. No remoto: **21** turmas de 2026 arquivadas (**13** concluídas, **8** canceladas, nenhuma ativa ou planejada) — o Início de 2026 mostra hoje Concluídas e Canceladas **sem** elas. |
| 8 | Início em nova ordem | novo | Hoje: cabeçalho com a frase *"Panorama das turmas sob a CIAARA-11. O recorte vai para o endereço: este link abre com ele."*, depois os cartões e o carrossel das turmas, e por último os DSA publicados. O papel (folha 297×210 mm, ~1.122×794 px) é reduzido por `EscalaDoPapel` **só pela largura**: em 1366×768 a escala passa de 1 e o papel tem ~900 px de altura numa janela de 768. O vazio já é uma frase só. |

## 4. Requisitos

### FR-001 — O TFM sem teto (item 1)

1. O DSA **não recusa nem avisa** por TFM acima de 6 TA na semana, ao lançar, editar, mover ou salvar. O TFM passa a ser
   disciplina comum da RN-DIST-03: só o alerta do **recomendado** (25 TA, o de toda disciplina) pode alcançá-lo (D-2).
2. A emenda da **RN-DIST-03 (a)** entra no `.md` do documento 04, com o texto anterior literal, a data e a nota de que o
   `.docx` não a recebeu; as menções de consequência (glossário e documentos de fase) recebem nota igual (D-4).
3. Os parâmetros `dsa.teto_tfm_semana` e `alocacao.teto_tfm_rigido` ficam como **dado inerte**: o código deixa de lê-los,
   e nenhuma linha muda (D-3). A leitura dos tetos do DSA passa a depender **só** do recomendado — a ausência da chave de
   TFM não pode mais calar o recomendado nem os alertas do dia.
4. A sincronização da planilha e a carga antiga por turma deixam de avisar/recusar o TFM acima de 6 (D-4).

### FR-002 — «O que é» opcional no Estudo Individual (item 2)

1. Ao lançar ou editar um **Estudo Individual**, *"O que é"* é **opcional** — na tela, na Server Action e no banco. Nas
   demais categorias (AEC, TAD, TR, Apoio Individualizado) continua obrigatório, nas mesmas três camadas.
2. O EI sem descrição grava **nulo** (D-5). Onde o EI aparece sem descrição, a tela e o papel mostram o texto do EI
   (*ESTUDO INDIVIDUAL* / o subtipo), nunca uma linha ou um título vazio (D-6).
3. O banco aceita a descrição nula **só** no Estudo Individual (CHECK por categoria, D-7).

### FR-003 — Salvar alteração (item 3, RP-9)

1. Na semana **em alteração** (depois de *Fazer alteração*), a barra mostra **Salvar alteração** logo antes de *Publicar
   alteração*. Ele registra os rascunhos como o *Salvar minuta*: passam a contar na CH e no andamento, e a alteração pode
   ser retomada depois.
2. O papel oficial continua sendo a **última versão publicada** até *Publicar alteração*: o carrossel do Início, o
   Imprimir/Reimprimir e o histórico não mudam.
3. Selo **«Em alteração · salva»** quando houve um salvar nesta alteração e não há rascunho novo (D-8).
4. *Descartar rascunho* volta ao **último salvo** (o da alteração), não à publicada.
5. *Publicar alteração* continua publicando a ALT N com justificativa, e publica o que estiver salvo mais os rascunhos.
6. A RP-9 entra no documento de regras; a linha *Alteração N* do ciclo e a RD-4/RD-5/RD-6 recebem a nota.

### FR-004 — A janela da carga no período da turma (item 4, PEND-025-5)

1. A **janela da carga** de uma atribuição nunca sai do período da própria turma: é a previsão (linha da turma →
   disciplina → turma) **recortada** pelo período da turma; se a previsão não toca o período, a janela é o **período da
   turma** (D-9).
2. A janela da carga alimenta a coluna *Janela prevista*, a média *(pela janela)* e o **alerta lilás por semana** da ficha
   do instrutor e de Avisos; a CAHO 2027 passa a aparecer nas semanas de 2027.
3. Turma sem período completo fica como hoje. A média semanal segue a regra de hoje (a cadastrada vence, D-10).
4. Uma função pura em `lib/dominio/` é o **ponto único** da janela da carga; a view não muda (D-11).

### FR-005 — O saldo pelo regime da semana (item 5, PEND-026-1)

1. A capacidade do saldo (Início, Avisos, `/turmas`, ficha) soma, **dia útil a dia útil**, o TA/dia do regime **da
   semana** de cada dia, pela mesma resolução do DSA (`regimeDaSemana`: gravado ou *só esta semana* > *desde* > Editar
   turma > curso).
2. O «do curso» do saldo continua sendo o **padrão vigente hoje** (D-12).
3. Sem nenhum registro de semana nem «desde», o resultado é **idêntico** ao de hoje, campo a campo.
4. Com TA/dia variando na janela, a ficha mostra o intervalo (*"8 a 9 TA/dia"*) e o saldo em dias divide pelo TA/dia do
   primeiro dia útil da janela (D-13). Um dia útil sem TA/dia resolvido deixa a capacidade **sem regime** (D-14).
5. Os textos de ajuda que diziam que o saldo usa o regime de *Editar turma* passam a dizer que ele segue o regime da semana.

### FR-006 — O seletor de instrutor vazio diz o motivo certo (item 6, PEND-026-2)

1. O `SeletorInstrutor` exige de quem chama o motivo do vazio: **«você não vê»** (perfil sem `instrutores.ler`, frase do
   componente) ou **«não há»** com a frase do chamador — *disciplina sem habilitado*, *ninguém atribuído*, *escolha a
   disciplina* —, num único dono de frases em `lib/dominio/`.
2. O vazio é **compacto** (frase com `role="status"` e `data-motivo`), não a caixa de página (D-15).
3. A aula do DSA, o TA fora do DSA, o editor de instrutores (rateio por UE) e o parágrafo do painel de instrutores
   consultam a permissão: sem `instrutores.ler`, dizem *"o seu perfil não os alcança"*, não *"nenhum habilitado"*.
4. A leitura dos habilitados da ficha da turma não descarta mais o erro (D-16).

### FR-007 — RT-8: a arquivada conta nas estatísticas do ano (item 7)

1. **Regra RT-8**: arquivar esconde a turma das listas do dia a dia (carrossel das turmas, submenu, listas de escolha e de
   ativas, avisos), mas ela **continua contando** nas estatísticas e nos cartões do **ano dela**, com a situação que tinha.
2. Os cartões do Início (Turmas ativas · Planejadas · Concluídas · Canceladas) contam a arquivada; o carrossel das turmas
   e o dos DSA publicados não a mostram (D-17).
3. Os indicadores de `/turmas` (Total, Planejadas, Em andamento, Concluídas, Canceladas) contam a arquivada com ou sem
   *Mostrar arquivadas*; o *Iniciando* não (D-18); a tabela continua escondendo-a; o cabeçalho e o vazio dizem quantas
   ficaram fora da lista (D-19).
4. Cursos, Instrutores e a ficha do instrutor já contam: só se confirma por teste.
5. A RT-8 entra em `padroes-de-tela.md` e no `CLAUDE.md`; a RD-8 e as decisões que diziam *"sem as arquivadas"* (D-26 e
   FR-006.1 da spec 026; FR-005.3 e C-24 da spec 017) ficam emendadas, registradas aqui.

### FR-008 — O Início em nova ordem, com o papel enquadrado (item 8)

1. Sai a frase *"Panorama das turmas… este link abre com ele."*; o título *Início* e a barra do ano e dos Filtros ficam.
2. Logo abaixo do cabeçalho, **os DSA publicados da semana**, com o seletor de semana; rolando, os **cartões do ano** e o
   **carrossel das turmas**.
3. O papel é **enquadrado** pela largura **e** pela altura da janela: em 1366×768 e em 1920×1080 ele aparece **inteiro**,
   de cima a baixo, sem rolar, com a legenda e, havendo 2 papéis ou mais, os controles do carrossel (D-20). Centralizado
   (D-21), com piso de escala (D-22); a escala se refaz quando a janela, a lateral ou o painel de Filtros mudam.
4. Sem DSA publicado, a frase do vazio ocupa o lugar, sem área vazia.
5. Emenda o **FR-008.1 da spec 026** (DSA abaixo do carrossel, reduzido à largura) e a D-31 da spec 026.

## 5. Clarifications — adotadas por padrão, Bernardo confere no fim

### Session 2026-10-28

Cada decisão foi **adotada por padrão — Bernardo confere no fim** (fluxo `/corrigir`).

- D-1 · Q: Que número tem este bloco? → A: **Bloco 14, spec 029** — o pedido diz *"Bloco 12"*, mas o 12 e o 13 já estão
  concluídos (specs 027 e 028). *Alternativa: renumerar como 12-B (sub-bloco, que o fluxo proíbe).*
- D-2 · Q: Sem o teto rígido, em que regime fica o TFM? → A: **disciplina comum (RN-DIST-03 c)**: de 7 a 25 TA não sai
  nada; acima de 25 TA sai o mesmo alerta do recomendado que qualquer disciplina recebe (não é aviso de TFM). É a menor
  mudança — tira-se o ramo, sem isenção nova por nome. *Alternativa: TFM sem teto algum, como o LHFC (b), o que estende a
  isenção por nome da RN-DIST-03 (b).*
- D-3 · Q: Os parâmetros `dsa.teto_tfm_semana` e `alocacao.teto_tfm_rigido` (= 6)? → A: **ficam como dado inerte**: o
  código deixa de lê-los e nenhuma linha muda (sem migration). O ETL usa a segunda como chave canônica da legada, e o
  pgTAP só confere o valor. *Alternativa: inativá-los por migration (UPDATE de dado = portão 9.4).*
- D-4 · Q: O alcance da remoção? → A: **a regra inteira**: o DSA da tela, a sincronização da planilha (`resolver.py`, que
  avisava) e a carga antiga por turma (`plano.py`, que recusava), e as menções de consequência nos `.md` (glossário,
  backlog, prompts, guia, schema, arquitetura, mapa de-para, requisitos, plano de execução) com a nota de que o `.docx` não
  recebeu. *Alternativa: só o DSA da tela e o documento 04; os scripts e os demais documentos viram pendência.*
- D-5 · Q: O EI lançado sem *"O que é"* grava nulo ou *"ESTUDO INDIVIDUAL"*? → A: **nulo** — vazio é ausência (convenção da
  validação); inventar o texto apagaria a diferença entre o EI descrito assim e o sem descrição. *Alternativa: a Server
  Action preencher *ESTUDO INDIVIDUAL* (dispensaria a migration, contra o "e no banco" do pedido).*
- D-6 · Q: Onde o EI sem descrição aparece, o que se mostra? → A: o **texto do EI**: no papel, o EI que cai no mesmo TA de
  outro lançamento (e no dia bloqueado) sai como *ESTUDO INDIVIDUAL* / EI quando não tem descrição; na tela, o título do
  cartão e da faixa *sem posição* usa o subtipo em vez de *"Lançamento"*; na lista `/atividades`, a célula vazia mostra
  *"—"*. O dado existente (todos com descrição) não muda de papel. *Alternativa: aceitar a linha em branco.*
- D-7 · Q: No banco, só tirar o `NOT NULL` ou pôr um CHECK por categoria? → A: **tirar e pôr o CHECK** `descricao is not
  null or categoria_normativa = 'Estudo_Individual'` — a regra continua no banco para AEC, TAD, TR e Apoio, como as irmãs
  `ativ_*`. Consequência aceita: recategorizar um tipo de EI para outra categoria será recusado se alguma linha ativa dele
  não tiver descrição (hoje nenhuma). *Alternativa: só tirar o `NOT NULL` (o banco aceitaria nulo em qualquer categoria
  por chamada direta).*
- D-8 · Q: Que selo depois de *Salvar alteração* com rascunho novo? → A: **«Em alteração · salva» só sem rascunho**: com
  rascunho novo volta a *«Em alteração»* e aparece o contador *"N não salvos"*. *Alternativa: manter *· salva* sempre que
  houve um salvar nesta alteração.*
- D-9 · Q: Como ler *"a janela da carga é o período da própria turma"*? → A: **recorte**: a previsão (linha da turma →
  disciplina → turma) é cortada pelo período da turma; se não o toca (a CAHO 2027), vale o período inteiro da turma. Guarda
  o período mais específico e só move as 5 atribuições medidas (4 encurtam uma semana, 1 vai para 2027). *Alternativa: a
  letra (linha da turma → turma, sem a disciplina), que mudaria a amostra de dois testes e espalharia a carga pelo período
  inteiro onde a linha não tem previsão.*
- D-10 · Q: A média semanal muda quando a janela vira o período da turma? → A: **não** — a cadastrada (tempos ÷ semanas
  da disciplina) continua vencendo, como já acontece na fonte *turma* da Q-7. *Alternativa: usar a média de reserva (CH ÷
  semanas da janela) quando a janela vier do período da turma por recurso, para a soma fechar com a CH.*
- D-11 · Q: Corrigir na view (portão 9.4, sem autorização no pedido para o item 4) ou em TypeScript? → A: **TypeScript**:
  uma função pura `janelaDaCarga` em `lib/dominio/carga-semanal.ts` é o ponto único da janela da carga, aplicada nos dois
  leitores (ficha e Avisos); a view continua devolvendo a **previsão**, que é o que o nome dela diz. O item segue sem
  parar. *Alternativa: recriar `vw_instrutor_carga_prevista` com o recorte (portão: parar antes do remoto).*
- D-12 · Q: Que número é o «do curso» na resolução por semana do saldo? → A: **o padrão vigente hoje** (o de hoje), como
  o saldo já usa: só mudam as turmas com «desde» ou «só esta semana» — no remoto, **nenhuma** (Q2). *Alternativa: exceção
  > padrão na data de cada semana, como o DSA; mudaria 6 turmas sem «desde» no remoto, o que o pedido manda PARAR.*
- D-13 · Q: Com TA/dia variando, que número sai em *"X TA/dia"* e no saldo em dias? → A: o **TA/dia do primeiro dia útil
  da janela** divide o saldo em dias; a ficha mostra o intervalo (*"8 a 9 TA/dia · N dias úteis"*) quando ele varia.
  *Alternativa: a média ponderada (capacidade ÷ dias úteis).*
- D-14 · Q: E o dia útil cuja semana não resolve TA/dia? → A: a capacidade inteira sai **sem regime** (sem saldo e sem
  veredito, o lado seguro da RN-DEG-01). *Alternativa: somar só os dias com regime e avisar.*
- D-15 · Q: Como o vazio do seletor aparece dentro de formulário? → A: **compacto**, como a frase da D-32 da spec 026 (um
  parágrafo `role="status"` com `data-motivo`), não a caixa de página repetida por UE. *Alternativa: manter a caixa e só
  trocar a frase.*
- D-16 · Q: Corrigir junto a leitura dos habilitados que descarta o erro (`app/(app)/disciplinas/consulta.ts`)? → A:
  **sim** — a falha vira aviso de leitura, não lista vazia (é o mesmo *"dizer o motivo certo"*). *Alternativa: pendência.*
- D-17 · Q: A arquivada com DSA publicado aparece no carrossel dos DSA publicados? → A: **não** — é vista do dia a dia; o
  DSA dela segue alcançável pela ficha e pelo Reimprimir. *Alternativa: mostrar, com a marca *Arquivada* na legenda.*
- D-18 · Q: O indicador *Iniciando em até N dias* de `/turmas` conta a arquivada? → A: **não** — *Iniciando* não é
  situação (RT-8 fala da situação que ela tinha), e a arquivada está travada. *Alternativa: contar.*
- D-19 · Q: Em `/turmas`, o cabeçalho *"N turmas em ANO"* e o vazio, quando há arquivada fora da lista? → A: o cabeçalho
  conta a tabela e acrescenta *"· K arquivada(s) fora da lista"*; com todas arquivadas, o vazio diz que existem K
  arquivadas e como mostrá-las. *Alternativa: o cabeçalho igual ao Total.*
- D-20 · Q: O que tem de caber na janela? → A: **o papel, a legenda e, com 2 papéis ou mais, os controles do carrossel**
  — trocar de turma não exige rolar. *Alternativa: só o papel.*
- D-21 · Q: Quando a altura limita, o papel fica centrado ou à esquerda? → A: **centrado**, como a folha na rota de
  impressão. *Alternativa: à esquerda, junto do título.*
- D-22 · Q: Há piso de escala para janela muito baixa? → A: **sim, 0,35**: abaixo dele a página rola, em vez de o papel
  virar um selo ilegível; em 1366×768 e 1920×1080 o piso não age. *Alternativa: sem piso.*
- D-23 · Q: *Salvar alteração* aparece sem rascunho? → A: **sim**, sempre que a semana está em alteração, como o *Salvar
  minuta* (*"não havia rascunho"*). *Alternativa: só com rascunho.*
- D-24 · Q: Na trilha, o salvar em alteração grava `salvo` ou um tipo novo? → A: **`salvo`** — zero migration; a posição
  depois de `alteracao_iniciada` já distingue o caso, e nenhum leitor da trilha muda com um `salvo` a mais.
  *Alternativa: tipo novo `alteracao_salva` (migration que acrescenta).*
- D-25 · Q: A tela avisa que a alteração salva ainda não chegou ao papel? → A: **sim**, uma linha de situação junto das
  versões: *"Alteração salva: já conta na CH e no andamento; o papel publicado continua valendo até «Publicar
  alteração»."* A RP-9 registra também que a **planilha de contingência** lê o salvo (ela é instrumento de trabalho, não o
  papel oficial). *Alternativa: só o selo.*
- D-26 · Q: A aba *Turmas* da página do curso, que mostra a arquivada com selo (RC-9 da spec 021), muda? → A: **não** — é
  consulta de todas as turmas do curso no ano, não lista de ativas. *Alternativa: escondê-la com *Mostrar arquivadas*.*
- D-27 · Q: Com o painel de Filtros aberto no Início, o papel encolhe? → A: **sim**, a escala se refaz pela altura que
  sobra; fechado o painel, volta. *Alternativa: enquadrar com o painel fechado e aceitar rolar com ele aberto.*
- D-28 · Q: Antes da medição no navegador, o que aparece? → A: a caixa do papel já sai do servidor **visível**, com a
  proporção da folha reservada pela largura (degradação segura: sem script, o papel aparece); a medição só ajusta a
  escala. *Alternativa: esconder até medir (sem script, nada aparece).*
- D-29 · Q: E desfazer uma alteração já salva? → A: **não há botão novo**: *Descartar* volta ao último salvo, como pede o
  item; para voltar ao conteúdo publicado, edita-se e salva-se de novo, ou publica-se a ALT. Fica escrito na RP-9.
  *Alternativa: um *Cancelar alteração* que restaure o publicado (exigiria mexer em salvos já aplicados — portão).*

## 6. Banco — uma migration que só acrescenta (item 2)

`atividades_nao_letivas.descricao` perde o `NOT NULL` e ganha o CHECK `descricao is not null or categoria_normativa =
'Estudo_Individual'`. Para AEC, TAD, TR e Apoio o CHECK equivale ao `NOT NULL` retirado; para o EI, libera o nulo.
Nenhuma linha muda (todas têm descrição) e nenhuma operação aceita hoje passa a ser recusada. Rito completo do remoto
(backup, dry-run só com ela, `db push`, conferência só de leitura). Os itens 1, 3, 4, 5, 6, 7 e 8 **não** têm banco.

## 7. Os casos que discriminam (DoD 8)

- **FR-001**: 4 + 3 TA de TFM em dois dias da mesma semana — hoje o segundo lançamento é recusado; depois, os dois gravam
  e o *Salvar minuta* registra 7 TA. E editar uma aula de TFM de 4 para 7 tempos: hoje recusa; depois grava.
- **FR-002**: EI sem *"O que é"* — hoje o formulário não envia (e o banco dá `23502`); depois grava nulo. Controle: AEC
  sem *"O que é"* continua recusada.
- **FR-003**: publicado → *Fazer alteração* → lançar → *Salvar alteração* — hoje o botão não existe; depois o selo é
  *"Em alteração · salva"*, a CH conta e o Reimprimir continua o da Original.
- **FR-004**: atribuição de turma de 2047 com previsão da disciplina em 2046 — hoje a janela é a de 2046; depois é o
  período da turma.
- **FR-005**: turma em 8 TA com «desde» de 9 na semana seguinte — hoje a capacidade é 8 × todos os dias; depois, 8 nos
  dias desta semana e 9 nos seguintes.
- **FR-006**: a mesma lista vazia com dois motivos dá duas frases; o TA fora do DSA numa disciplina sem habilitado diz
  *"Nenhum instrutor habilitado nesta disciplina"*, não *"Nada cadastrado ainda"*.
- **FR-007**: 2026 com uma turma concluída e arquivada — o cartão Concluídas conta ela; em 2027 não.
- **FR-008**: em 1366×768 e 1920×1080, o papel publicado inteiro dentro da janela sem rolar (hoje passa da altura), e os
  DSA publicados antes dos cartões.

## 8. Critérios de sucesso

- **SC-001**: lançar 7 TA de TFM numa semana e salvar a minuta funciona, sem nenhum aviso de TFM.
- **SC-002**: lançar um EI sem *"O que é"* e salvar funciona; a AEC sem ele continua recusada com a frase.
- **SC-003**: *Fazer alteração* → lançar → *Salvar alteração* → sair e voltar → a alteração continua lá → *Publicar
  alteração* → ALT N; entre o salvar e o publicar, o papel do Início e o Reimprimir são os da versão publicada.
- **SC-004**: na ficha de um instrutor de turma de outro ano, o alerta lilás e a janela aparecem no ano da turma.
- **SC-005**: com «desde» ou «só esta semana», o saldo de Início, Avisos, `/turmas` e ficha muda só pelos dias daquelas
  semanas; sem eles, nenhum número muda (medido no remoto: 0 turmas).
- **SC-006**: nenhum seletor de instrutor vazio diz *"Nada cadastrado ainda"* quando o vazio vem de filtro.
- **SC-007**: em 2026, os cartões Concluídas e Canceladas do Início contam as arquivadas (medido na cópia
  `remoto-20261028-214051.sql`, sem recorte: Concluídas 0 → 13, Canceladas 0 → 8); o carrossel continua sem elas.
- **SC-008**: em 1366×768 e 1920×1080 o papel do DSA publicado aparece inteiro, sem rolar, no topo do Início.

## 9. Fora de escopo / pendências

Fecha: **`PEND-025-5`** (FR-004), **`PEND-026-1`** (FR-005; a D-15 da spec 026 fica superada) e **`PEND-026-2`**
(FR-006; a premissa estava invertida — a frase *"o seu perfil não os alcança"* nunca aparecia). Emenda, sem editar as
specs de origem: o **FR-008.1** e a **D-31 da spec 026** (FR-008), a **D-26** e o **FR-006.1 da spec 026**, o **FR-005.3**
e a **C-24 da spec 017** (FR-007).

Pendências novas, achadas e **não** corrigidas:

- **`PEND-029-1`** — *a situação «Atrasada» do DSA usa a previsão de um ano só*: `vw_disciplinas_execucao`
  (`previsao_*_efetiva = coalesce(linha, disciplina)`) é o mesmo defeito do item 4 em outra view; na CAHO 2027 o término
  efetivo cai em 2026. Depois deste bloco, o alerta do instrutor e o DSA usam janelas diferentes para a mesma linha.
  Corrigir é recriar a view (portão 9.4).
- **`PEND-029-2`** — *habilitado inativo na ficha da turma*: a leitura dos habilitados da ficha não filtra a situação do
  instrutor; o desativado com vínculo ativo aparece no TA fora do DSA e no editor de instrutores, e o DSA o tira
  (RN-INST-02). As duas telas discordam sobre o que é «não há».
- **`PEND-029-3`** — *o «do curso» do saldo × o do DSA*: pela D-12, o saldo usa o padrão vigente **hoje**; o DSA usa
  exceção > padrão **na semana**. Num curso com exceção vigente, a ficha pode mostrar um TA/dia diferente do da grade na
  mesma semana. Soma-se ao **D20 residual**.
- **`PEND-029-4`** — *turma sem período completo continua invisível ao alerta*: pelo FR-004.3 ela fica como estava, e a
  atribuição cuja previsão cai em outro ano não aparece no alerta de ano nenhum (o caso CHK005 do pgTAP 094).
- **`PEND-029-5`** — *o documento 04 descreve um tipo `TipoTeto` que o código nunca teve* (nem antes da emenda, com o modo
  `rigido`): a nota de implementação da RN-DIST-03 fala de um tipo que não existe. Texto, não comportamento.

## 10. Verificação

- **Vistos reprovar na `main` antes da mudança** (28/10/2026): os testes de unidade e o pgTAP 153 de cada item; e a ponta
  a ponta nova contra a `main` intacta (`07d84c3`, construída numa pasta à parte, porta 3100, base limpa): **14 de 15**
  casos reprovaram pela asserção que prova o pedido — *"o teto de TFM é 6"* (2), *"o navegador barra o «O que é» vazio"*,
  o `salvar-alteracao` ausente, a janela de 2026 e o alerta ausente, *Concluídas* 0 em vez de 1 e *total* 5 em vez de 7
  (4), o pé do papel em **1.474 px** numa janela de 768, a frase do panorama no cabeçalho, o saldo de um TA/dia só e
  *"Nada cadastrado ainda"*. O 15º (o vazio do Início sem área grande) passou na `main`, como previsto: é guarda, não o
  caso que discrimina.
- **Local, depois da implementação e das correções:** `pnpm verificar` verde — **221** arquivos, **3.023** testes de
  unidade, tipos, lint, formatação e build; pgTAP **1.161** asserções em 73 arquivos e RLS/invariantes **486** + 1 pulado,
  sobre a base limpa, com os tipos gerados conferidos. A ponta a ponta dos arquivos tocados, com 1 processo, foi
  **interrompida pelo sistema por falta de memória** depois de **29 casos verdes e nenhum vermelho** (`bloco-10` 14,
  `bloco-11-dsa` 9 — o FR-004, os três do FR-008 com os dois papéis da D-20 e o FR-005 —, `dsa-cartao-unico` 6, com os
  dois do TFM); não foi reiniciada. O resto fica com o CI (regra de 26/10/2026).
- **Defeitos plantados (T022)**, cada um desfeito e conferido byte a byte: o ramo do TFM de volta (7 de 26 reprovam), a
  descrição obrigatória em toda categoria (4 de 19), `alteracaoSalva` sempre falso (3), a janela sem recorte (6 de 23), a
  capacidade sem as semanas (9 de 48), o seletor sem o motivo (2 de 8), os cartões e os indicadores sem a arquivada (5 de
  10 e 2 de 14), a escala só pela largura (6 de 19). No item 6 também a ligação da permissão em cada chamador (8 defeitos,
  todos pegos).
- **Revisão adversarial** (cinco lentes e um cético por achado): **25** achados, **16** confirmados (dois eram o mesmo) e
  corrigidos no mesmo PR — 3 de severidade média (o vazio do carrossel desmentia *Turmas ativas*; o erro de leitura do
  regime das semanas era descartado; a prova da D-20 era condicional) e os demais baixos (testes da edição do EI, do «você
  não vê» e da RT-8 em Cursos e Instrutores; textos que afirmavam o contrário do código; o papel sem script com o pé
  cortado e a escala que podia alternar; o caso do saldo que quebraria em dezembro; o rótulo acessível do EI; o
  `CLAUDE.md` com RP-9 e RT-8). **9** derrubados.
- **CI** do ramo sobre `a2bc1b5` (antes das correções): verde nos três blocos — **601** de ponta a ponta + 2 instáveis
  fora deste bloco (`inicio.spec.ts:363`, `lateral.spec.ts:316`) + 7 pulados; pgTAP 1.161.
- **Os casos de edição do Estudo Individual eram instáveis no CI, e a causa era do teste** (três rodadas até achá-la):
  o arquivo dividia a turma semeada com os outros arquivos do DSA do mesmo processo (passou a semear com 700 +
  processo, numa semana só dele), e o clique logo depois do *Salvar minuta* achava a célula «vazia» no redesenho e
  abria o formulário de novo lançamento, cuja camada barrava os cliques seguintes (o auxiliar espera a célula mostrar o
  salvo). No local, 12 de 12 e 8 de 8 em repetições seguidas.
- **CI final sobre `e62ae10`:** verde nos três blocos **nas duas execuções** (PR `40813730436` e push `40813725925`):
  **605** de ponta a ponta, **nenhum instável**, 7 pulados; pgTAP **1.161**.
- **Remoto:** a migration aplicada em 29/10/2026 pelo rito completo — backup `remoto-20261029-011810.sql`, **101 e 101**
  migrations, impressão digital igual nos dois bancos (2.737 objetos, `32ba63c9…`), nenhuma linha mudou
  (`plano-de-aplicacao-no-remoto.md`).
