# Spec 026 — Bloco 11: o lançamento do DSA e o Início com o DSA publicado

**Pedido:** Bernardo Villas Boas, 26/10/2026, pelo `/corrigir` — *"Bloco 11 — lançamento do DSA e Início com o DSA
publicado"*, com as regras **RD-1 a RD-8**. **Ramo:** `feat/BLOCO-11-dsa-lancamento-e-inicio`, a partir da `main`
`69d2315` (spec 025 encerrada). **Regras:** [`docs/correcoes/regras-do-dsa-lancamento.md`](../../docs/correcoes/regras-do-dsa-lancamento.md),
criado antes da implementação e apontado no `CLAUDE.md`. **O papel do DSA não muda** no formato (a posição do cartão
fixo do Estudo Individual muda pela RD-2 — D-9), então o merge não espera virada de semana. **Banco:** uma migration que
**só acrescenta** (o regime por semana, RD-3) — segue com o rito completo do remoto (emenda à regra 9.4, 19/10/2026).

## 1. O problema, em uma frase

No DSA, o seletor de quem ministra oferece todos os instrutores (até o inativo), o Estudo Individual automático cai no
1º tempo de um dia vazio, não há como trocar o regime de tempos de uma semana nem como limpar uma semana, e as ações
ficam em dois cartões com texto solto; no Início, os cartões não contam por situação e o DSA mostrado é o salvo, não o
publicado.

## 2. Paridade ou novidade (regra 3)

- **Defeito** (itens 1 e 2): RD-1 e RD-2 corrigem comportamento que contraria regra já escrita (`RN-INST-01`, a
  habilitação) ou que contraria o pedido (o EI no 1º tempo).
- **Novidade pedida nominalmente** (regra 3, autorização de Bernardo neste pedido): o regime por semana (RD-3, que fecha a
  `PEND-018-1`), o *Limpar semana* (RD-4), o selo e a barra (RD-5, RD-6), o carrossel do DSA publicado e os cartões por
  situação no Início (RD-7, RD-8).
- **Contenção de escopo (regra 2):** tudo é da CIAARA-11 — DSA, turma, instrutor, Início.
- **Documento 04:** nenhuma regra muda. A `RN-INST-01` (só o habilitado ministra) passa a valer também na **lista** da
  tela, além da Server Action. A D-4 (05/10/2026, o EI no tempo seguinte ao último lançado) é **substituída** pela RD-2
  por decisão nominal de Bernardo neste pedido.

## 3. A triagem — o pedido, item a item, medido na `main` `69d2315`

| # | Item | Tipo | Medido na `main` (código e cópia do remoto `remoto-20261025-141154.sql`, só leitura) |
|---|---|---|---|
| 1 | Seletor de instrutor da aula mostra todos | 🐛 defeito | A leitura do DSA (`leitura.ts:599-611`) lê `vw_instrutores` inteira e **não lê** `instrutor_disciplina`; o filtro de ativo (`:1683`) não funciona porque o `select` não traz `status` — **o instrutor inativo também aparece** (1 inativo no remoto). A Server Action já recusa o não habilitado ao lançar, mas **não confere** o par instrutor × disciplina quando a edição troca só a disciplina ou a UE. **16** dos 113 designados ativos não têm habilitação na disciplina (todos do ETL). |
| 2 | EI automático no 1º tempo do dia vazio | 🐛 defeito | `slotDoEstudoIndividual(null) = 1` (`horario-do-bloco.ts:321`), e o teste de unidade `:245-247` **codifica o defeito**. A mesma regra em três lugares: o botão da semana, o **cartão fixo** do papel e da tela, e a fórmula da planilha de contingência. O botão nem lê o regime. **4** EI ativos no TA 1 no remoto. |
| 3 | Limpar semana | novo | Não existe (varredura: zero). A exclusão do cartão manda uma operação ao ponto único `gravar_rascunho_do_dsa`, que já aceita lote atômico e já recusa semana travada. |
| 4 | Regime de tempos no DSA | novo | Não existe regime por semana: a turma tem um regime só (`turmas.regime_de_horario_id`), que **trava** no 1º lançamento salvo (C-8 da spec 018). **0** regimes nomeados e **0** turmas com regime nomeado no remoto. |
| 5 | Selo de situação e barra de ações | novo | Dois cartões: `barra-de-impressao` (com *"Uma página A4 paisagem, com as assinaturas da data desta semana."*) e `PainelDaPublicacao` (com *"Situação da semana:"*). `BadgeStatus` não tem ícone; o vocabulário de `BotaoDeIcone` não tem relógio, *Stamp* nem *limpar*. ⚠️ **Defeito achado:** a tela e a impressão contam os rascunhos até **hoje**, não até o sábado da semana (`datasDaSemanaIso(...)[6]`, de uma lista de seis datas) — a situação de uma semana passada ou futura pode sair errada. |
| 6 | Cartões do Início | novo | Hoje: *Turmas no recorte · Em andamento · Carga executada · Progresso do recorte*, sobre o panorama do ano escolhido. |
| 7 | Carrossel das turmas sem *Abrir DSA* | novo | O botão `dsa-da-semana` mora no `CartaoDaTurma` (`:72-81`); o DSA continua alcançável pela ficha, por `/turmas` e pelos avisos. |
| 8 | Carrossel do DSA publicado | novo | Hoje o Início mostra **manchetes de texto do salvo** (`vw_ocupacao_ta`), não o publicado. **0** semanas publicadas no remoto (só 1 evento `salvo`). O papel (`DocumentoDoDsa`) só existe em `/print/dsa`, em folha fixa de 297×210 mm. |

## 4. Requisitos

### FR-001 — RD-1: só o habilitado ministra (item 1)
- **FR-001.1**: Na **aula**, a lista de *quem ministra* traz só os instrutores **ativos** com habilitação **ativa** na
  disciplina da aula (a da UE, quando há UE). Antes de escolher a disciplina, a lista vem vazia com *"Escolha a
  disciplina."*; disciplina sem habilitado, *"Nenhum instrutor habilitado nesta disciplina. A habilitação é feita na
  ficha do instrutor."* com o caminho até *Instrutores* (D-2).
- **FR-001.2**: O padrão é o **designado** para a turma (a cascata UE → disciplina da turma, `preencherLancamento`), só
  se ele estiver na lista do FR-001.1 (D-3).
- **FR-001.3**: A Server Action recusa a aula de instrutor não habilitado ou inativo — ao lançar e ao **editar**,
  conferindo o par final (instrutor gravado ou novo × disciplina final), também quando só a disciplina ou a UE muda (D-4).
- **FR-001.4**: O instrutor **inativo** some de todos os seletores do DSA (D-5). Os outros papéis (aplicador, fiscal,
  vista, atividade) continuam com a lista inteira de ativos (D-1).

### FR-002 — RD-2: o Estudo Individual no último tempo do regime (item 2)
- **FR-002.1**: O EI automático vai para o **último tempo do regime da semana**; se o dia já tem lançamento nesse tempo
  ou depois dele, logo depois do último lançado; além do último tempo do relógio, o dia é pulado com aviso (D-7, D-8).
- **FR-002.2**: A mesma regra vale no botão *Lançar o Estudo Individual da semana*, no cartão fixo do papel e da tela, e
  na fórmula da planilha de contingência (D-9). O usuário continua podendo mover o EI.

### FR-003 — RD-3: o regime de tempos da semana (item 4)
- **FR-003.1**: O padrão vem de *Editar turma* (como hoje). No DSA, o ícone de **relógio** abre um diálogo com os
  regimes possíveis (o vigente do curso e os nomeados do currículo da turma — D-12) e duas escolhas: **Só esta semana**
  ou **Desta semana em diante** (vira o padrão da turma da segunda-feira dessa semana em diante — D-10).
- **FR-003.2**: Semana **salva ou publicada** nunca muda de regime: o regime fica **gravado com a semana** ao salvar
  (*Salvar minuta*, *Publicar alteração*), e o *desde* grava, antes de valer, o regime das semanas salvas seguintes que
  ainda não o tinham (D-11). Na semana salva, o relógio fica indisponível com a razão (D-11).
- **FR-003.3**: A tela, a prévia, o papel publicado, a planilha e as ações (cascata, alertas de tempo, TR de dia
  inteiro, EI) usam **o mesmo** regime da semana (D-14).

### FR-004 — RD-4: Limpar semana (item 3)
- **FR-004.1**: *Limpar* apaga, com confirmação, todos os lançamentos **da turma** na semana — aulas, provas (a 1ª
  aplicação), sessões, vistas, atividades da turma, o EI —, pela **mesma exclusão do cartão**, numa operação só (tudo ou
  nada). Ficam de fora a atividade de todas as turmas e as paradas do Calendário (D-17).
- **FR-004.2**: O resultado é **rascunho** até *Salvar minuta* (RP-0) (D-18). Em semana publicada, só depois de *Fazer
  alteração* (o banco já recusa). Nada se grava na trilha (D-19).

### FR-005 — RD-5 e RD-6: o selo e a barra (item 5)
- **FR-005.1**: A situação da semana é um **selo** com ícone e palavra: *Em preenchimento*, *Registrado*, *Publicado*,
  *ALT N* (e *Em alteração* durante a alteração — D-20). Sai *"Situação da semana"*. O contador de não salvos fica (D-21);
  a marca *«não salvo»* do cartão continua.
- **FR-005.2**: Uma **barra de ações** no topo direito do DSA, sem cartão e sem *"A4 paisagem com assinaturas"*, na ordem:
  *Regime* (relógio) · *Limpar* · *Planilha de contingência* · *Gerar prévia* (impressora; *Imprimir* depois de
  publicado) · *Salvar minuta* · *Publicar* (Stamp; *Publicar alteração* durante a alteração) · *Fazer alteração* ·
  *Descartar rascunho* (D-22, D-23). O que vivia nos cartões — avisos, respostas, o histórico com *Reimprimir* — fica
  abaixo do cabeçalho, sem cartão (D-24).
- **FR-005.3**: Os rascunhos da semana contam até o **sábado** dela, na tela e na impressão (defeito do item 5).

### FR-006 — RD-8: os cartões do Início (item 6)
- **FR-006.1**: *Turmas ativas* (= em andamento) · *Planejadas* · *Concluídas* · *Canceladas*, do ano escolhido, sobre a
  mesma população do carrossel (D-26). Saem *Turmas no recorte*, *Carga executada* e *Progresso do recorte*.

### FR-007 — o carrossel das turmas (item 7)
- **FR-007.1**: Fica com a barra de progresso, a situação e o atraso; sai o botão *Abrir DSA*.

### FR-008 — RD-7: o carrossel do DSA publicado (item 8)
- **FR-008.1**: Abaixo do carrossel das turmas, o **papel impresso** do DSA (o mesmo componente da impressão, verde e
  amarelo), reduzido à largura da página, **um por turma** com DSA publicado na semana — a **última versão publicada**
  (original ou ALT mais recente), nunca rascunho nem salvo —, passando sozinho e com setas.
- **FR-008.2**: Abre na semana de hoje (seg–sáb); o ícone de calendário escolhe outra semana, com anterior e seguinte
  (D-28). Sem DSA publicado na semana: *"Não há DSA publicado para esta semana"*, sem carrossel.
- **FR-008.3**: Reaproveita a leitura das versões do Bloco 9 (a regra da versão vigente e o retrato) — numa consulta só
  para todas as turmas.

## 5. Clarifications — adotadas por padrão, Bernardo confere no fim

- D-1 · Q: A RD-1 vale para que papéis? → A: **só quem ministra a aula** (o pedido diz *"na aula"*). Aplicador da prova,
  fiscal, vista e atividade seguem com a lista de ativos e o aviso de habilitação de hoje (D-AV-3). *Alternativa: o
  aplicador também só habilitado (o aviso viraria impedimento).*
- D-2 · Q: E antes de escolher a disciplina, ou numa disciplina sem habilitado? → A: lista vazia com a frase do FR-001.1,
  com o caminho até *Instrutores*. *Alternativa: a lista inteira até escolher a disciplina.*
- D-3 · Q: O designado que não é habilitado (16 no remoto)? → A: **não é sugerido** — o padrão passa ao próximo designado
  habilitado; sem nenhum, vazio com *"O instrutor designado não está habilitado nesta disciplina — habilite-o na ficha do
  instrutor."* *Alternativa: sugerir e deixar a Server Action recusar (como hoje).*
- D-4 · Q: A edição que troca só a disciplina ou a UE confere o instrutor gravado? → A: **sim**, o par final; a recusa
  pede a troca do instrutor. *Alternativa: conferir só quando o instrutor muda (como hoje).*
- D-5 · Q: O instrutor inativo nos seletores do DSA? → A: **sai de todos** (defeito achado: o filtro existia e não
  funcionava). O nome dele continua no histórico. *Alternativa: só na aula.*
- D-6 · Q: A planilha de contingência sugere instrutor pela mesma regra? → A: **não muda** — a sugestão dela continua a
  de hoje (o parâmetro novo é opcional). *Alternativa: só habilitados também na planilha.*
- D-7 · Q: O que é *"último tempo do regime"*? → A: o tempo de número `regimeTempos` da semana (o último **normal** do
  relógio); se o dia já tem lançamento nele ou depois, o tempo seguinte ao último lançado (o excepcional, quando o
  relógio o tem). Em fórmula: `max(regimeTempos, últimoLançado + 1)`. *Alternativa: sempre o excepcional (regime + 1).*
- D-8 · Q: A RD-2 substitui a D-4 inteira, ou só o dia vazio? → A: **inteira** (*"sempre"*): num dia com 4 TA lançados
  num regime de 8, o EI vai ao 8º, não ao 5º. *Alternativa: só o dia vazio.*
- D-9 · Q: O cartão fixo do EI no papel e a planilha seguem? → A: **sim** — a mesma regra nos três lugares, para o papel,
  a tela e a planilha não divergirem. Não há semana publicada no remoto, então nenhum retrato acusa *"alterado desde a
  publicação"*. *Alternativa: só o botão.*
- D-10 · Q: Onde mora *"desta semana em diante"*? → A: numa **vigência por turma**, tabela nova (só acrescenta): a turma
  ganha regime a partir da segunda-feira da semana; *Editar turma* continua sendo o padrão inicial e passa a mostrar a
  vigência atual. *Alternativa: gravar em `turmas.regime_de_horario_id`, o que exige alterar a trava da spec 018
  (portão).*
- D-11 · Q: O que é semana *"salva"*? → A: a que tem evento salvo ou publicação na trilha **ou** lançamento salvo — o
  mesmo critério do feriado preso (D-11 do Bloco 10). O regime é gravado com ela ao salvar; o *desde* grava antes o das
  salvas seguintes; nela, o relógio fica indisponível. *Alternativa: só o evento (as semanas anteriores ao Bloco 9 ficariam
  sem proteção).*
- D-12 · Q: Que regimes o diálogo oferece? → A: o **vigente do curso** e os **nomeados** do currículo da turma — nunca
  um número livre (RF-HOR-02). Para ter 9 tempos, cadastra-se antes um regime de 9 em *Editar curso → Horários*.
- D-13 · Q: Quem troca o regime da semana? → A: **quem lança o DSA** (`registros_aula.criar`, RP-5), no alcance da
  turma, turma não arquivada.
- D-14 · Q: As ações do servidor (cascata, alertas, TR de dia inteiro, EI) usam o regime da semana? → A: **sim**, pela
  mesma resolução da tela — fecha também a divergência tela × ação (o D20 residual nas ações).
- D-15 · Q: O saldo do Início, de `/turmas` e da ficha segue o *desde*? → A: **não neste bloco** — continua com o regime
  de *Editar turma* (pendência `PEND-026-1`).
- D-16 · Q: *Descartar rascunho* desfaz *"Só esta semana"*? → A: **não** — é escolha da semana, não lançamento; troca-se
  pelo próprio relógio.
- D-17 · Q: O que entra em *"todos os lançamentos"* do Limpar? → A: os da **turma** na semana; fora a atividade de todas
  as turmas (excluí-la tiraria de todas) e as paradas do Calendário. A prova sai inteira, como no cartão (as sessões e a
  vista dela saem junto, inclusive em outra semana). *Alternativa: só aulas.*
- D-18 · Q: O Limpar já salva? → A: **não** — vira rascunho, e só conta no *Salvar minuta* (RP-0). *Alternativa: limpar e
  salvar de uma vez.*
- D-19 · Q: O Limpar grava evento? → A: **não** — um tipo novo na trilha exigiria alterar o `CHECK` dela (portão).
- D-20 · Q: E a alteração em andamento? → A: o selo **Em alteração**. Ícones: *Em preenchimento* (lápis), *Registrado*
  (disquete), *Publicado* e *ALT N* (carimbo), *Em alteração* (lápis com carimbo).
- D-21 · Q: O contador *"N lançamentos não salvos"* fica? → A: **fica**, ao lado do selo — é o que diz quanto falta salvar.
- D-22 · Q: A ordem da barra? → A: **a pedida**, mesmo com *Limpar* (destrutivo) em 2º, contra a RT-1 (destrutivo por
  último): a ordem é nominal do pedido.
- D-23 · Q: As dicas das ações novas? → A: *Regime* (relógio), *Limpar* (borracha), *Publicar* (carimbo), *Salvar minuta*
  (disquete, o nome que o pedido dá). *Gerar prévia* vira *Imprimir* depois de publicado (como hoje).
- D-24 · Q: Onde ficam o histórico com *Reimprimir*, o aviso *"alterado desde a publicação"*, as respostas e os avisos
  da impressão? → A: logo abaixo do cabeçalho, sem cartão; o histórico numa seção *Versões publicadas*.
- D-25 · Q: E o botão *Lançar o Estudo Individual da semana*? → A: **fica** no painel de lançamento (não está na lista da
  RD-6).
- D-26 · Q: Os cartões do Início contam que turmas? → A: as **mesmas do panorama** — o ano escolhido, o recorte de
  classificação e modalidade, cursos em oferta, sem arquivadas. Rótulos: *Turmas ativas*, *Planejadas*, *Concluídas*,
  *Canceladas*.
- D-27 · Q: O carrossel do DSA segue o recorte? → A: **sim** — classificação, modalidade e sem arquivadas; o ano dele é
  o da **semana** escolhida (a semana ISO), não o ano dos cartões.
- D-28 · Q: Como se escolhe a semana? → A: `?semana=` na URL (a data de um dia da semana; vazio = hoje); o ícone de
  calendário abre a escolha por data, com *Semana anterior* e *Semana seguinte*.
- D-29 · Q: O papel no Início leva link? → A: **não** — é só leitura; *Gerado em* é a data da publicação e a assinatura é
  a gravada.
- D-30 · Q: As manchetes de texto do DSA? → A: **saem** (o carrossel publicado as substitui), com as funções que ficam
  sem consumidor.
- D-31 · Q: Como se reduz o papel? → A: por **escala** (uma folha de cliente mede a largura e aplica `transform:
  scale`), sem pacote novo.

## 6. Banco — uma migration que só acrescenta (RD-3)

- Tabela **`dsa_regime_da_semana`** (turma, ano ISO, semana ISO, origem `so_esta_semana` | `gravado`, o regime nomeado
  ou nulo, e o **retrato dos valores** do relógio — TA, duração, intervalos, horas, configuração), uma linha ativa por
  semana; RLS de leitura como a trilha do DSA; escrita só por RPC.
- Tabela **`turma_regime_vigencia`** (turma, regime nomeado ou nulo = o do curso, `vigente_de` = segunda-feira), só de
  acréscimo; RLS de leitura igual.
- RPCs `SECURITY DEFINER` com porteiro (`registros_aula.criar` + alcance + turma não arquivada): definir *só esta
  semana* (recusa semana salva, `23514`), definir *desde* (grava antes o regime das semanas salvas seguintes) e gravar o
  regime da semana ao salvar. Espelhos `INVOKER` em `public`.
- Sem `DELETE`, sem policy de escrita, sem mudar função existente.

## 7. Os casos que discriminam (DoD 8)

- **RD-1**: o mesmo cartão com o instrutor sem vínculo — ausente da lista de quem ministra, presente na do fiscal; e a
  Server Action recusando o par final quando a disciplina muda.
- **RD-2**: dia vazio num regime de 8 — o EI no 8º (era o 1º); dia com 4 lançados — no 8º (era o 5º).
- **RD-3**: turma em 8 tempos, uma semana salva, *desde* a seguinte com 9 — a salva continua com 8, as seguintes abrem
  com 9; *só esta semana* recusada em semana salva.
- **RD-4**: semana publicada recusa; rascunho limpa; o Limpar não toca a atividade de todas as turmas.
- **RD-7/RD-8**: só a versão publicada aparece (o salvo não); os cartões contam por situação.

## 8. Fora de escopo / pendências

- `PEND-026-1` — o saldo (Início, `/turmas`, ficha) segue o regime de *Editar turma*, não o *desde* (D-15).
