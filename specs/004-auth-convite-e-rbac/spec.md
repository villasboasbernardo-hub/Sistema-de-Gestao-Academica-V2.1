# Especificação: Épico 3 — Autenticação por convite, gestão de usuários e RBAC

**Diretório**: `specs/004-auth-convite-e-rbac` · **Criado**: 08/09/2026 · **Origem**: documento 06
§Épico 3 · **Ramo**: `feat/EPICO-3-auth-convite-e-rbac`

## Contexto

O Épico 1 entregou **toda a autorização no banco**: 23 funções `app.*`, a matriz `perfil_permissao`
com 152 linhas (9 perfis × 13 recursos), 77 policies, o gatilho anti-escalonamento e 13 testes
negativos de RLS com sessão autenticada. O Épico 2 encheu esse banco com **5.394 linhas de dado
real**, incluindo identificação civil e endereço de 177 instrutores.

O que existe hoje, portanto, é **um cofre trancado sem porta**: as regras de quem pode o quê estão
escritas e provadas, e não há como uma pessoa entrar para exercê-las. A aplicação tem uma rota
(`/`), quatro clientes de dados e um middleware de renovação de sessão que nunca renovou sessão
nenhuma, porque não há sessão.

Este épico constrói a porta. **Não redefine nenhuma regra de autorização** — usa as que já estão no
banco e as expõe pela aplicação.

**A ordem 2 antes de 3 foi deliberada** (BRIEF §8): sem dado migrado não há o que proteger. Agora há.

## Clarifications

### Sessão 2026-09-08

- P: Quais dos 9 perfis podem ler identificação civil e residência de instrutor? →
  R: **Três** — `admin`, `encarregado_administracao_academica` e
  `ajudante_administracao_academica`. Os outros seis leem apenas o dado funcional.
  *(A escolha nomeou "Admin e Ajudante"; o Encarregado foi confirmado dentro em seguida —
  é o chefe da CIAARA-11 e responde pela Ficha de Docentes.)*
- P: As telas entram nesta fatia ou esperam o Épico 4? → R: **Entram agora**, funcionais e
  sóbrias: `/login`, `/convite/[token]`, `/recuperar-senha` e `/admin/usuarios`. O estilo é
  revisitado no Épico 4.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - O Admin convida, a pessoa entra (Priority: P1)

O Admin cadastra nome, e-mail, perfil e escopo de curso. A pessoa recebe um e-mail, escolhe a
própria senha e entra. Em nenhum momento o Admin conhece ou digita a senha de outra pessoa.

**Por que é P1**: é a única forma de existir usuário no sistema. Sem ela, nenhuma outra história
deste épico — nem de nenhum épico posterior — pode ser exercida por alguém que não seja o Bernardo
com acesso direto ao banco.

**Teste independente**: convidar um endereço de e-mail de teste em preview, abrir o link recebido,
definir senha, entrar, e ver a aplicação responder como o perfil convidado.

**Cenários de aceitação**

1. **Dado** que o Admin preenche nome, e-mail, perfil e escopo, **Quando** confirma o convite,
   **Então** a linha nasce em `usuarios` **sem credencial** (`auth_user_id` nulo) e um e-mail é
   enviado ao endereço informado.
2. **Dado** que a linha existe sem credencial, **Quando** alguém tenta usar aquele e-mail para
   entrar, **Então** o acesso é negado — a conta ainda não alcança nada.
3. **Dado** o link de convite recebido, **Quando** a pessoa define uma senha válida, **Então** a
   credencial é criada, `auth_user_id` passa a apontar para ela, e a pessoa é levada à aplicação
   autenticada.
4. **Dado** um link de convite **já usado**, **Quando** alguém o abre de novo, **Então** é recusado
   com mensagem que não revela se a conta existe.
5. **Dado** um convite expirado, **Quando** o Admin reenvia, **Então** um novo link é emitido e o
   anterior deixa de valer.
6. **Dado** um e-mail **nunca convidado**, **Quando** alguém tenta criar conta por qualquer caminho
   — inclusive chamando a interface de autenticação diretamente —, **Então** a criação é recusada.

### User Story 2 - Cada perfil alcança o seu, e só o seu (Priority: P1)

Quem entra vê e escreve exatamente o que a matriz permite, no escopo de curso a que está vinculado.
O que está fora do alcance **não aparece na tela** e, se a ação for invocada por fora da tela, é
**negada pelo banco**.

**Por que é P1, junto com a US1**: um convite que dá acesso indiscriminado é pior que nenhum
convite. As duas histórias entregam valor só juntas.

**Teste independente**: entrar como Encarregado de Curso vinculado a dois cursos, confirmar que os
dois aparecem e um terceiro não, e confirmar que a ação de escrita sobre o terceiro é recusada pelo
banco mesmo quando chamada fora da interface.

**Cenários de aceitação**

1. **Dado** um usuário sem permissão de escrita num recurso, **Quando** a tela daquele recurso
   carrega, **Então** os elementos de ação ficam **ocultos**, não desabilitados.
2. **Dado** o mesmo usuário, **Quando** a ação correspondente é invocada diretamente, **Então** o
   **banco** a recusa — a ocultação na interface não é a proteção, é a cortesia.
3. **Dado** um Encarregado de Curso com dois cursos vinculados, **Quando** lista turmas, **Então**
   vê as dos dois cursos e não vê as de um terceiro.
4. **Dado** que uma linha de `perfil_permissao` é alterada, **Quando** o usuário afetado recarrega,
   **Então** o comportamento muda — sem novo *deploy* e sem migration.
5. **Dado** um usuário autenticado que não é Admin, **Quando** tenta elevar o próprio perfil,
   **Então** a alteração é recusada pelo banco.
6. **Dado** um estado vazio numa tela, **Quando** o vazio decorre de falta de permissão, **Então** a
   tela diz *"você não vê"*, não *"não há"* — a distinção é obrigatória.

### User Story 3 - O Admin administra as contas ao longo do tempo (Priority: P2)

Convidar é o começo. Depois vem corrigir um perfil atribuído por engano, vincular um curso novo,
reenviar um convite que expirou e **desativar** quem saiu da Divisão.

**Por que é P2**: o sistema funciona sem isso por algumas semanas — o Admin pode corrigir no banco.
Deixa de funcionar quando a primeira pessoa é transferida e o acesso dela precisa cessar no mesmo
dia.

**Teste independente**: desativar uma conta com sessão aberta e confirmar que a requisição seguinte
daquele navegador já não lê nem escreve nada.

**Cenários de aceitação**

1. **Dado** um usuário ativo com sessão aberta, **Quando** o Admin o desativa, **Então** a
   requisição **seguinte** daquele navegador não alcança dado nenhum — sem depender de o usuário
   fechar o navegador ou de a sessão expirar.
2. **Dado** um usuário desativado, **Quando** o Admin consulta a lista, **Então** ele continua
   visível com a situação **inativo** — a desativação nunca apaga a linha.
3. **Dado** um usuário desativado, **Quando** ele solicita recuperação de senha, **Então** nenhum
   e-mail é enviado, e a tela responde igual ao caso em que o e-mail existe.
4. **Dado** que o Admin altera o perfil ou o escopo de alguém, **Quando** a pessoa recarrega,
   **Então** o novo alcance vale imediatamente.
5. **Dado** a lista de usuários, **Quando** o Admin a consulta, **Então** vê perfil, escopo,
   **situação do convite** e **último acesso** de cada um.

### User Story 4 - A pessoa recupera o próprio acesso (Priority: P2)

Quem esquece a senha resolve sozinho, sem passar pelo Admin e sem que o Admin conheça a nova senha.

**Por que é P2**: até a primeira pessoa esquecer a senha, o Admin reenvia o convite. A partir daí,
vira interrupção recorrente do trabalho de outra pessoa.

**Teste independente**: solicitar recuperação para um e-mail cadastrado e para um não cadastrado, e
confirmar que **as duas respostas da tela são idênticas**.

**Cenários de aceitação**

1. **Dado** um e-mail com conta **ativa**, **Quando** a recuperação é solicitada, **Então** um link
   de uso único e validade limitada é enviado.
2. **Dado** um e-mail **sem conta** ou com conta **inativa**, **Quando** a recuperação é solicitada,
   **Então** nenhum e-mail é enviado e **a tela responde exatamente como no caso anterior** — não
   revelar quem tem conta é o ponto.
3. **Dado** o link de recuperação, **Quando** a pessoa define a nova senha, **Então** a sessão
   anterior deixa de valer e ela entra com a nova.

### User Story 5 - O dado pessoal fica visível só a quem precisa dele (Priority: P2)

Posto, especialidade e habilitação de um instrutor são dado de trabalho: quem monta a grade precisa
ver. CPF, RG, telefone e endereço residencial **não são dado de trabalho** — são identificação civil
e residência de 177 militares.

**Por que existe esta história**: a RLS do Épico 1 foi desenhada quando `instrutores` só tinha dado
funcional. O Épico 2 acrescentou 13 colunas de identificação civil sob autorização da CIAARA-14.2, e
**hoje quem pode ler a tabela lê tudo**. Isso está escrito no cabeçalho da migration que as criou —
não é lacuna descoberta agora, é dívida registrada no momento em que nasceu, para ser paga aqui.

**Por que é P2 e não P1**: o dado já está protegido de quem não tem conta — e ninguém tem conta até
a US1 existir. O risco se materializa no instante em que a segunda pessoa entra no sistema.

**Teste independente**: entrar com um perfil que monta grade, ler um instrutor, e confirmar que
posto e habilitação vêm preenchidos enquanto CPF e endereço vêm **ausentes** — não mascarados na
tela, ausentes na resposta do banco.

**Cenários de aceitação**

1. **Dado** um perfil que não administra pessoal, **Quando** lê um instrutor, **Então** recebe o
   dado funcional e **não recebe** CPF, RG, telefone, endereço nem órgão emissor.
2. **Dado** um perfil autorizado a ver dado pessoal, **Quando** lê o mesmo instrutor, **Então**
   recebe tudo.
3. **Dado** qualquer perfil, **Quando** a leitura do dado pessoal é tentada por fora da tela,
   **Então** a decisão é do **banco**, não da consulta que a tela escreveu.

### Edge Cases

- **Credencial órfã**: existe conta em `auth.users` sem linha correspondente em `usuarios` — por
  falha entre as duas escritas do convite. A conta não alcança nada, mas a inconsistência precisa
  ser **detectável**, não descoberta por acaso.
- **Linha órfã**: existe linha em `usuarios` com `auth_user_id` nulo há muito tempo — convite nunca
  aceito. É estado legítimo e esperado; a tela precisa distingui-lo de "convite recém-enviado".
- **Dois convites para o mesmo e-mail**: o segundo não pode criar uma segunda linha nem invalidar
  silenciosamente o vínculo do primeiro.
- **O último Admin**: desativar a si mesmo, ou rebaixar o próprio perfil, deixaria o sistema sem
  ninguém capaz de convidar — inclusive sem ninguém capaz de desfazer o engano.
- **Convite para quem já tem conta ativa**: precisa ser recusado com clareza, sem criar duplicata.
- **Sessão expirada no meio do trabalho**: o usuário não pode perder o que digitou sem aviso.
- **Aplicação sem configuração de ambiente**: hoje o middleware sai de lado (`RN-DEG-01`). Com
  autenticação, sair de lado significaria **liberar rota protegida** — o comportamento tem de ser o
  oposto.
- **`instrutor_id` de um usuário aponta para instrutor inativo**: o vínculo pessoa↔docente existe na
  tabela e precisa de comportamento definido.

## Requirements *(mandatory)*

### Functional Requirements

#### Autenticação e sessão

- **FR-001**: O sistema MUST autenticar por **e-mail e senha**, em tela de login própria
  (`RF-AUTH-01`).
- **FR-002**: O sistema MUST recusar a criação de conta para e-mail não convidado, **por qualquer
  caminho** — inclusive pela interface de autenticação chamada diretamente (`RF-AUTH-02`, critério 1
  do documento 06).
- **FR-003**: O auto-cadastro MUST estar **desligado na plataforma**, não apenas oculto na
  interface. Como é configuração de painel e não código, MUST existir um **item de conferência
  verificável** que ateste o estado (documento 22 §3.4).
- **FR-004**: O sistema MUST manter a sessão entre recarregamentos e abas, renovando o token
  enquanto for válida, e MUST oferecer ação explícita de **encerrar sessão** (`RF-AUTH-08`).
- **FR-005**: Toda rota do grupo autenticado MUST exigir sessão válida; a rota sem sessão MUST
  redirecionar ao login **preservando o destino pretendido**.
- **FR-005.1**: Na **ausência de configuração de ambiente**, o middleware MUST **negar** o acesso à
  rota protegida. É a única exceção declarada ao `RN-DEG-01`: degradar para "vazio com aviso" numa
  fronteira de autenticação significa degradar para "aberto".
- **FR-006**: A senha MUST ter no mínimo **12 caracteres** e MUST ser verificada contra listas
  públicas de vazamento. Composição obrigatória e expiração compulsória MUST **não** ser exigidas
  (documento 22 §4.5).

#### Convite

- **FR-007**: O convite MUST ser iniciado **somente pelo Admin**, com nome, e-mail, perfil e escopo
  de curso (`RF-AUTH-05`).
- **FR-008**: O convite MUST criar a linha em `usuarios` **antes** da credencial, deixando
  `auth_user_id` nulo até o aceite. A janela entre cadastro e aceite é **deliberada**: nela o Admin
  ainda pode revisar ou cancelar, e a conta não alcança nada (documento 22 §3.3).
- **FR-009**: O link de convite MUST ser de **uso único** e validade limitada, e a definição de
  senha MUST ocorrer em rota dedicada, **sem que o Admin conheça a senha em momento algum**
  (`RF-AUTH-06`).
- **FR-010**: Concluída a definição de senha, o sistema MUST fechar o espelho
  `usuarios.auth_user_id ↔ auth.users.id` e MUST deixar a pessoa autenticada.
- **FR-011**: O sistema MUST permitir ao Admin **reenviar** convite, invalidando o link anterior.
- **FR-012**: O sistema MUST recusar convite para e-mail que já tenha conta ativa, sem criar
  duplicata.
- **FR-013**: O sistema MUST tornar **detectável** a inconsistência entre `auth.users` e `usuarios`
  nos dois sentidos — credencial sem linha e linha sem credencial há mais tempo que a validade do
  convite. A detecção MUST ser executável sem inspeção manual do banco.

#### Gestão de usuários

- **FR-014**: O Admin MUST dispor de tela de gestão de usuários cobrindo **listar** (com perfil,
  escopo, situação do convite e último acesso), **convidar**, **reenviar convite**, **editar perfil
  e escopo**, **vincular cursos** e **desativar** (`RF-AUTH-05`).
- **FR-015**: A desativação MUST ser **lógica** (`status = 'inativo'`), nunca remoção, e MUST
  produzir efeito **na requisição seguinte** de uma sessão já aberta (`RF-AUTH-09`, documento 22
  §4.4).
- **FR-016**: O sistema MUST impedir que o **último Admin ativo** se desative ou rebaixe o próprio
  perfil, recusando a operação com mensagem que explique o motivo.
- **FR-017**: A vinculação de cursos (`usuario_curso`) MUST ser N:N e MUST valer para o alcance do
  perfil imediatamente após a alteração.

#### Recuperação de senha

- **FR-018**: A recuperação MUST ser iniciada pelo próprio usuário, por link de **uso único** e
  validade limitada (`RF-AUTH-07`).
- **FR-019**: O e-mail MUST ser disparado **apenas** se existir linha **ativa** em `usuarios`. A
  tela MUST responder **de forma idêntica** exista ou não a conta — a resposta não pode ser oráculo
  de quem tem acesso ao sistema.

#### Autorização na interface

- **FR-020**: Elemento de interface associado a ação restrita MUST ficar **oculto** para quem não
  tem a permissão, não apenas desabilitado (`RF-AUTH-04`).
- **FR-021**: A ocultação MUST ler a **mesma matriz** `perfil_permissao` que a autorização do banco
  consulta. MUST **não** existir uma segunda declaração de permissões no código da interface.
- **FR-022**: A ação invocada fora da interface MUST ser negada **pelo banco**. A ocultação MUST
  **não** ser tratada como proteção (critério 7 do documento 06).
- **FR-023**: Alterar uma linha de `perfil_permissao` MUST mudar o comportamento efetivo **sem novo
  deploy e sem migration** (`RF-AUTH-10`, critério 6).
- **FR-024**: O Admin MUST dispor de tela de **leitura** da matriz de permissões, com edição
  restrita ao próprio Admin.
- **FR-025**: Estado vazio MUST distinguir *"não há dado"* de *"você não tem permissão de ver"*.

#### Telas

- **FR-025.1**: MUST existir tela de **login** com e-mail e senha.
- **FR-025.2**: MUST existir tela de **definição de senha por convite**, endereçada pelo token do
  convite.
- **FR-025.3**: MUST existir tela de **recuperação de senha**.
- **FR-025.4**: MUST existir tela de **gestão de usuários**, cobrindo o que o FR-014 exige.
- **FR-025.5**: As quatro telas MUST ser funcionais e sóbrias, **sem** depender do *design system*
  do Épico 4. MUST **não** introduzir cor literal em componente — a dívida de estilo C-1 já existe
  em 4 arquivos e não deve crescer.
- **FR-025.6**: As telas de login, convite e recuperação MUST viver **fora** do grupo de rotas
  autenticadas: são as únicas alcançáveis sem sessão, e agrupá-las com as demais faria o
  middleware do FR-005 exigir sessão para obter sessão.

#### Auditoria

- **FR-026**: O sistema MUST registrar `usuarios.ultimo_acesso` a cada autenticação bem-sucedida
  (`RF-AUTH-11`, critério 8).
- **FR-027**: A autoria (`criado_por`, `criado_em`, `editado_por`, `editado_em`) MUST ser preenchida
  a partir da **identidade autenticada**, nunca de campo enviado pelo cliente.
- **FR-027.1**: Toda escrita feita pela aplicação MUST chegar ao banco com identidade autenticada.
  ⚠️ Hoje o gatilho `app.set_auditoria()` **descarta os carimbos em silêncio** quando não há sessão
  — é o comportamento correto para o ETL, e seria defeito grave numa tela. MUST existir prova de que
  uma escrita de tela sem identidade **não passa**.

#### Dado pessoal

- **FR-028**: A leitura das 12 colunas de identificação civil e residência de `instrutores` —
  `cpf`, `rg`, `orgao_emissor`, `telefone`, `retelma` e as sete de endereço — MUST ser restrita a
  **exatamente três perfis**: `admin`, `encarregado_administracao_academica` e
  `ajudante_administracao_academica`. A restrição MUST ser imposta **pelo banco**.
- **FR-028.1**: Os outros **seis** perfis — `chefe_departamento_ensino`,
  `encarregado_orientacao_pedagogica`, `ajudante_orientacao_pedagogica`, `encarregado_curso`,
  `operador` e `visualizacao` — MUST **não** alcançar aquelas colunas por nenhum caminho.
  ⚠️ `chefe_departamento_ensino` está entre os que **não** alcançam, e isso é deliberado: ele
  enxerga todos os cursos do sistema, o que faria dele o perfil de maior alcance sobre dado
  pessoal se fosse incluído por inércia.
- **FR-028.2**: A restrição MUST ser **por coluna**, e não por linha. ⚠️ Isto é uma diferença de
  mecanismo, não de redação: `ROW LEVEL SECURITY` decide quais **linhas** uma sessão enxerga, e
  não sabe recortar colunas. Restringir coluna exige outro instrumento do banco. Qual deles —
  privilégio por coluna, visão que omite as colunas, ou separação em tabela própria — é decisão
  do plano; o requisito é que a decisão seja do **banco** e não da consulta que a tela escreve.
- **FR-029**: O recorte MUST preservar o acesso de todos os perfis ao dado **funcional** do
  instrutor (posto, especialidade, habilitação, regime, carga horária) — sem o qual a grade, a LIQ e
  o DSA não se montam.
- **FR-030**: A restrição MUST valer também para quem consulta por fora da tela.

#### Reconstituição das contas migradas

- **FR-031**: As contas de usuário vindas da v2.0 MUST ser **reconstituídas por convite**, não por
  senha atribuída pelo Admin (`RF-MIG-06`). As linhas já existem em `usuarios` com perfil e escopo;
  falta a credencial.
- **FR-032**: A reconstituição MUST preservar `codigo` e `origem_migracao_v1` das linhas migradas —
  o rastro até a v2.0 não se perde ao ganhar credencial.

#### Configuração

- **FR-033**: MUST existir configuração da **URL canônica da aplicação**, usada nos links de convite
  e de recuperação. ⚠️ Errada, ela leva o convidado para o ambiente errado — um convite de produção
  abrindo no preview. Deixada fora do Épico 0 por decisão de 07/09/2026, entra aqui.

#### Testes de segurança

- **FR-034**: MUST existir, **para cada perfil**, ao menos um teste que prove que o banco **nega uma
  leitura** e **nega uma escrita** fora do escopo daquele perfil (critério 4 do documento 06). Teste
  só de caminho feliz MUST **não** ser aceito: uma policy `using (true)` passa nele.
- **FR-035**: MUST ser portados os três testes de RLS que o documento 22 §10.2 lista como pendentes
  e que **dependiam de dado real para existir** — T-02 (Operador não cria registro fora do escopo),
  T-03 (**fuga de escopo por UPDATE**, que só o `WITH CHECK` pega) e T-10 (Operador não cria
  atividade de escopo global). O dado passou a existir no Épico 2.
- **FR-036**: MUST existir teste de ponta a ponta do percurso **convite → definição de senha →
  primeiro acesso** (critério 2).

### Key Entities

- **`usuarios`** — já existe e já está povoada com 3 linhas migradas. Guarda `auth_user_id` (o
  espelho para a credencial), `perfil`, `escopo_curso`, `instrutor_id`, `status` e `ultimo_acesso`.
  **Nenhuma coluna nova é prevista.**
- **`usuario_curso`** — vínculo N:N entre usuário e curso, que define o alcance do Encarregado de
  Curso. Existe e está **vazia**.
- **`perfil_permissao`** — a matriz, 152 linhas, 9 perfis × 13 recursos. Existe, povoada por
  migration. É lida pelo banco e passará a ser lida também pela interface.
- **`instrutores`** — 177 linhas, das quais 13 colunas são identificação civil e residência. É o
  objeto do recorte da US5.
- **Credenciais** — vivem fora do schema do domínio, na área de autenticação da plataforma. O
  sistema **não guarda senha**; guarda o espelho para a credencial.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um e-mail não convidado **não** consegue criar conta por nenhum caminho conhecido,
  incluindo chamada direta à interface de autenticação. Verificado por tentativa registrada.
- **SC-002**: O percurso convite → senha → primeiro acesso funciona **ponta a ponta em preview**,
  com o convidado alcançando exatamente o escopo atribuído.
- **SC-003**: Senha com menos de 12 caracteres é recusada; senha presente em lista pública de
  vazamento é recusada.
- **SC-004**: Para **cada um dos 9 perfis** existe teste negativo provando que o banco nega ao menos
  uma leitura e uma escrita fora do escopo. **9 de 9, sem exceção.**
- **SC-005**: Um Encarregado de Curso vinculado a dois cursos lê os dois e **não** lê um terceiro.
- **SC-006**: Alterar uma linha da matriz muda o comportamento efetivo **sem novo deploy**, medido
  por observação antes e depois na mesma sessão.
- **SC-007**: Ação restrita fica oculta na interface **e** é negada pelo banco quando invocada
  diretamente — as duas coisas, provadas separadamente.
- **SC-008**: Desativar uma conta com sessão aberta zera o alcance dela **na requisição seguinte**.
- **SC-009**: `ultimo_acesso` é atualizado em toda autenticação bem-sucedida.
- **SC-010**: A tela de recuperação produz **resposta indistinguível** para e-mail cadastrado e não
  cadastrado — comparadas a resposta visível e o tempo de resposta.
- **SC-011**: Cada um dos **seis** perfis sem autorização recebe as 12 colunas de identificação
  civil e residência **ausentes**, e o dado funcional presente, na mesma leitura. Cada um dos
  **três** autorizados recebe as 12 preenchidas. **9 de 9 perfis verificados**, não uma amostra.
- **SC-012**: A inconsistência entre credencial e cadastro é detectada por rotina executável, nos
  dois sentidos, sem inspeção manual do banco.
- **SC-013**: As 3 contas migradas da v2.0 recebem credencial **por convite**, preservando `codigo`
  e `origem_migracao_v1`.
- **SC-014**: `pnpm verificar:tudo` e o CI dão **veredito idêntico** sobre o mesmo commit.

## Assumptions

1. **A autorização do banco não é redesenhada.** As 77 policies, as 23 funções `app.*` e a matriz do
   Épico 1 estão corretas e provadas; este épico as consome. A **única** alteração prevista no banco
   é o recorte de dado pessoal da US5 — e ela é acréscimo, não revisão.
2. **Os 9 perfis do ENUM `perfil_usuario` são o conjunto final.** O documento 01 fala em "~12" porque
   conta as variações Encarregado/Ajudante por divisão separadamente; o ENUM já as unificou.
3. **A plataforma de autenticação envia os e-mails.** Não há serviço de e-mail próprio nesta fatia.
   A configuração do remetente é item de painel, como o auto-cadastro.
4. **A CIAARA-14.2 autorizou a hospedagem de dado pessoal em nuvem comercial** em 08/09/2026. Este
   épico trata de **quem vê o quê dentro do sistema** — questão distinta, e ainda aberta, de *onde o
   dado reside*, que aquela autorização fechou.
5. **Não há SSO, MFA obrigatória nem federação com conta institucional** — fora de escopo declarado
   no documento 06. MFA opcional para o Admin é configuração de painel, não requisito desta fatia.
6. **As telas entram nesta fatia, funcionais e sóbrias** (decisão de 08/09/2026). Não existem
   *design system* nem shell de navegação — eles são o Épico 4 —, então as quatro telas nascem
   sem tokens `@theme` e serão retrabalhadas depois. O retrabalho é conhecido, está orçado em
   quatro telas, e é o preço de não deixar 5.394 linhas de dado real sem porta por mais um épico
   inteiro. ⚠️ A dívida de estilo **fica registrada aqui** para não ser descoberta no Épico 4.
7. **`instrutor_id` em `usuarios`** liga a pessoa ao cadastro docente quando ela é as duas coisas. O
   comportamento quando o instrutor referenciado está inativo é decidido nesta fatia.

## Dependências

| Depende de | Estado |
|---|---|
| Épico 1 — schema, RLS, matriz de permissões | ✅ concluído |
| Épico 2 — dado migrado (é o que há para proteger) | ✅ concluído, na `main` |
| Épico 0 — CI, preview por branch, `lib/supabase/admin.ts` | ✅ concluído |
| `NEXT_PUBLIC_URL_APLICACAO` | ⬜ **entra nesta fatia** (FR-033) |
| Auto-cadastro desligado no painel | ⬜ **item de conferência** (FR-003) |

## Fora de escopo

- **SSO, MFA obrigatória, federação com conta institucional** — não pedidos (documento 06).
- **Auto-cadastro em qualquer forma.**
- **Design system e shell de navegação** — Épico 4.
- **Telas de domínio** (turmas, DSA, LIQ, cronograma) — épicos 5 a 13.
- **Log de leitura de dado pessoal.** O documento 22 §9 registra a ausência; criar registro de
  *leitura* é decisão de retenção e volume que ninguém tomou, e não está no escopo declarado deste
  épico. **Fica listado como pendência, não como requisito.**
- **Política de retenção e descarte de dado pessoal.** Mesma razão: o sistema hoje nunca apaga, e
  decidir se isso é conforme é matéria da autoridade, não de engenharia.
- **Rotina de revisão periódica de contas inativas** — o documento 22 §4.4 registra a pendência e
  sugere revisão semestral. É procedimento administrativo, não código.

## Perguntas em aberto

- ~~**Q3.a — Quais perfis veem dado pessoal de instrutor?**~~ ✅ **Fechada em 08/09/2026:** os três
  da CIAARA-11 administrativa (`admin`, `encarregado_administracao_academica`,
  `ajudante_administracao_academica`). Ver FR-028.
- **Q3.c — Log de leitura de dado pessoal.** Fora do escopo desta fatia por decisão registrada,
  mas o recorte do FR-028 torna a pergunta mais nítida, não menos: a partir daqui existe um
  conjunto declarado de três perfis que **podem** ler PII, e nada registra **quando** leram. Não é
  requisito aqui; é pendência que fica mais visível depois desta fatia do que antes dela.
- **Q3.b — Quem opera o convite no dia a dia?** O documento 06 diz "Admin". Se na prática houver
  mais de uma pessoa convidando, o perfil `admin` passa a ser plural e a fronteira das três tabelas
  (documento 22 §6.4) merece uma segunda leitura.
