# Feature Specification: Gestão de usuários — sair, perfil próprio, e a administração de contas

**Feature Branch**: `feat/EPICO-3-gestao-de-usuarios`

**Created**: 29/09/2026

**Status**: Draft

**Input**: Fatia de gestão de usuários nascida de **testes reais do Bernardo**. Entra **antes** da
fatia (b) de disciplinas. Cinco funcionalidades: sair pelo menu do avatar; avatar com foto opcional
e o próprio nome editável; o Admin editando nome e perfil de outros; o Admin redefinindo a senha,
com troca obrigatória no login seguinte; e desativar, reativar e excluir conta.

> **⚠️ LEIA `estado-atual.md` ANTES.** Ele é o retrato medido em 29/09/2026 do que já existe, e
> desta spec só sai requisito para o que **não** existe ou para o que **muda**. Três afirmações
> que pareciam verdade não são: a conferência do último admin na Server Action **não existe**, o
> arquivo é **`proxy.ts` e não `middleware.ts`**, e a tabela de rastro **não aceita `usuarios`** hoje.

---

## Por que esta fatia existe, e por que agora

Ela nasceu de **uso real**: o Bernardo entrou no sistema pelo preview e **não conseguiu sair**. Não
há botão de sair em lugar nenhum — a ação existe no código desde o Épico 3 e nunca teve um
consumidor. Trocar de usuário, hoje, exige apagar cookie do navegador.

Do mesmo uso saíram as outras quatro: não há como ver quem se é, não há como o Admin arrumar um nome
digitado errado, não há como devolver acesso a quem esqueceu a senha sem mandar e-mail, e não há
como desfazer um convite criado por engano.

⚠️ **Ela entra ANTES da fatia (b) de disciplinas** porque a (b) vai ser testada por várias pessoas, e
testar com várias pessoas exige trocar de usuário.

---

## Clarifications

### Session 2026-09-29

Respostas de **Bernardo Villas Boas**, em **29/09/2026**, às oito dúvidas de
[`duvidas.md`](./duvidas.md). **Nenhuma dúvida aberta trava o plano.**

- **Q: D-1 — quais perfis o Admin pode escolher ao editar alguém?** → **A: os NOVE do enum,
  agrupados por divisão.** Oferecer três deixaria seis perfis sem caminho de atribuição pela tela.
  *(Propagado para `FR-005` e `FR-040.1`.)*
- **Q: D-2 — onde fica o rastro das ações administrativas?** → **A: trilha NOVA e MÍNIMA**, com
  quatro campos: **autor, ação, conta alvo e quando**. Nada além. *(Propagado para `FR-047` e
  `FR-047.1`; entra em *Key Entities*.)*
- **Q: D-3 — a foto fica em espaço público ou privado?** → **A: privado**, como já estava adotado.
- **Q: D-4 — redefinir a senha derruba as sessões abertas?** → **A: SIM, derruba TODAS.** ⚠️ **Isto
  REVERTE o padrão que a spec havia adotado** (*Assumption 4*, que dizia "não derruba"), e a
  recomendação era esta. *(Propagado para `FR-038`, para o caso de borda e para `SC-011`.)*
- **Q: D-5 — o que conta como dependente e impede excluir uma conta?** → **A: os quatro**, como já
  estava adotado: credencial já usada, vínculo de curso, ficha de instrutor vinculada, e ter criado
  ou editado qualquer registro.
- **Q: D-6 — reativar é ação nova na matriz?** → **A: NÃO. Reativar usa a MESMA permissão de
  desativar**, nenhuma ação nova entra na matriz, e a asserção existente de **zero** `reativar` fica
  **intacta**. *(Propagado para `FR-044`; fecha a divergência §4, que deixa de ser conflito.)*
- **Q: D-7 — a pessoa troca o próprio nome sem limite?** → **A: só `nome_exibicao`**, como já estava
  adotado; o nome civil continua só com o Admin.
- **Q: D-8 — a troca obrigatória bloqueia também as rotas abertas?** → **A: não**, como já estava
  adotado: bloqueia as telas do sistema, e sair continua possível.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Sair do sistema (Priority: P1)

Quem está usando o sistema precisa encerrar a própria sessão e voltar à tela de entrada, para que
outra pessoa use a mesma máquina.

**Why this priority**: é a que travou o teste real. Sem ela, a máquina de conferência fica presa numa
conta, e **toda** a fatia (b) depende de conferir com mais de uma pessoa. É também a menor: a Server
Action já existe e nunca foi ligada.

**Independent Test**: entrar com uma conta, clicar no avatar, clicar em *Sair*, chegar à tela de
entrada, e entrar com outra conta. Nada mais precisa existir para isso valer.

**Acceptance Scenarios**:

1. **Given** uma sessão ativa em qualquer tela do sistema, **When** a pessoa aciona o avatar no
   cabeçalho, **Then** abre um menu com *Meu perfil* e *Sair*.
2. **Given** o menu aberto, **When** a pessoa escolhe *Sair*, **Then** a sessão termina e ela chega à
   tela de entrada.
3. **Given** que acabou de sair, **When** ela tenta voltar a uma tela do sistema pelo endereço,
   **Then** é levada à tela de entrada — o botão de voltar do navegador não devolve a sessão.
4. **Given** que saiu, **When** entra com **outra** conta, **Then** o cabeçalho mostra o nome e o
   perfil da conta nova, sem resquício da anterior.

---

### User Story 2 — Ver e editar o próprio cadastro (Priority: P2)

Quem usa o sistema precisa saber com que conta está e poder arrumar o próprio nome e a própria foto.

**Why this priority**: o cabeçalho hoje mostra `nome · perfil` como texto cru, com o perfil no
formato do banco (`encarregado_administracao_academica`). É a primeira coisa que qualquer pessoa lê
ao entrar, e é ilegível.

**Independent Test**: entrar, abrir *Meu perfil* pelo menu do avatar, trocar o nome, salvar, e ver o
nome novo no cabeçalho sem recarregar a página à mão.

**Acceptance Scenarios**:

1. **Given** uma sessão ativa, **When** a pessoa abre *Meu perfil*, **Then** vê o próprio nome, o
   e-mail, o perfil **em português legível** e o escopo.
2. **Given** a tela do próprio perfil, **When** a pessoa altera o nome e salva, **Then** o nome novo
   aparece no cabeçalho e na listagem de usuários.
3. **Given** a tela do próprio perfil, **When** a pessoa envia uma foto em JPG ou PNG de até 2 MB,
   **Then** a foto passa a aparecer no avatar do cabeçalho.
4. **Given** uma conta **sem** foto, **When** qualquer tela mostra o avatar, **Then** ele mostra as
   **iniciais** do nome.
5. **Given** a tela do próprio perfil, **When** a pessoa tenta enviar um arquivo que não é JPG nem
   PNG, ou maior que 2 MB, **Then** a recusa é explicada e **nada** é enviado.
6. **Given** a tela do próprio perfil, **When** a pessoa procura o campo de e-mail, **Then** ele
   aparece **somente para leitura**, com a razão escrita — o e-mail é a identidade da conta.
7. **Given** a tela do próprio perfil, **When** a pessoa procura o campo de perfil, **Then** ele
   aparece **somente para leitura** — ninguém muda o próprio perfil.

---

### User Story 3 — Trocar a própria senha (Priority: P2)

Quem está logado precisa trocar a própria senha sem passar por e-mail.

**Why this priority**: é a metade voluntária da mesma tela que a US4 usa na forma obrigatória.
Construir as duas separadas seria construir duas.

**Independent Test**: entrar, ir a *Meu perfil*, trocar a senha, sair, e entrar com a senha nova.

**Acceptance Scenarios**:

1. **Given** uma sessão ativa, **When** a pessoa pede para trocar a senha e informa uma senha nova
   válida duas vezes, **Then** a senha é trocada e ela continua na sessão.
2. **Given** a tela de senha nova, **When** a senha informada é curta demais, **Then** a recusa vem
   **do sistema** e diz qual é a regra, não apenas "inválida".
3. **Given** a tela de senha nova, **When** as duas digitações não coincidem, **Then** a recusa é
   explicada antes de qualquer envio.

---

### User Story 4 — O Admin devolve o acesso de alguém (Priority: P1)

O Admin precisa devolver acesso a quem perdeu a senha, na hora, sem depender de e-mail chegar.

**Why this priority**: é a razão de existir do papel Admin no dia a dia, e o caminho por e-mail já
falhou no uso real — o convite de 23/09 gravou o cadastro e **não emitiu o e-mail**, deixando uma
conta sem credencial que ninguém conseguiu destravar pela tela.

**Independent Test**: como Admin, redefinir a senha de outra conta, anotar a senha mostrada, sair,
entrar com ela, ser levado obrigatoriamente à troca, definir a senha nova, e entrar com ela.

**Acceptance Scenarios**:

1. **Given** o Admin na listagem de usuários, **When** ele redefine a senha de outra conta, **Then**
   o sistema gera uma senha e a mostra **uma única vez**, com aviso explícito de que ela não será
   mostrada de novo.
2. **Given** que a senha foi mostrada, **When** o Admin fecha o aviso e reabre a tela, **Then** a
   senha **não** aparece em lugar nenhum.
3. **Given** uma conta com a senha redefinida, **When** a pessoa entra com a senha temporária,
   **Then** ela é levada **obrigatoriamente** à tela de senha nova.
4. **Given** essa pessoa na tela de senha nova obrigatória, **When** ela tenta ir a qualquer outra
   tela do sistema pelo endereço, **Then** volta para a tela de senha nova.
5. **Given** essa pessoa na tela de senha nova obrigatória, **When** ela define uma senha válida,
   **Then** a obrigação some e ela chega à tela inicial.
6. **Given** que ela definiu a senha nova, **When** sai e entra com a senha nova, **Then** entra
   direto, **sem** passar pela troca obrigatória.
7. **Given** que ela definiu a senha nova, **When** tenta entrar com a senha **temporária**, **Then**
   a entrada é recusada.

---

### User Story 5 — O Admin corrige o cadastro de outra pessoa (Priority: P2)

O Admin precisa corrigir um nome digitado errado e mudar o perfil de alguém que trocou de função.

**Why this priority**: a ação já existe no código e **nenhuma tela a chama** — está pronta e
inalcançável desde o Épico 3.

**Independent Test**: como Admin, editar o nome e o perfil de outra conta, e ver a mudança na
listagem.

**Acceptance Scenarios**:

1. **Given** o Admin na listagem, **When** ele edita o nome de outra conta e salva, **Then** o nome
   novo aparece na listagem.
2. **Given** o Admin editando outra conta, **When** ele muda o perfil, **Then** a mudança vale na
   **requisição seguinte** daquela pessoa — sem precisar que ela saia e entre.
3. **Given** o Admin editando outra conta, **When** ele procura o campo de e-mail, **Then** ele está
   **somente para leitura**.
4. **Given** o Admin editando o **próprio** cadastro pela tela de administração, **When** ele tenta
   mudar o próprio perfil, **Then** a ação **não é oferecida**, com a razão escrita.

---

### User Story 6 — O Admin tira e devolve o acesso, e apaga o engano (Priority: P3)

O Admin precisa bloquear o acesso de quem saiu da divisão, devolvê-lo a quem voltou, e apagar de vez
um convite criado por engano.

**Why this priority**: desativar já existe pela tela; reativar e excluir não. A exclusão é a de menor
frequência e a de maior risco, e é a única que precisa da exceção nominal à regra 4.

**Independent Test**: como Admin, desativar uma conta, ver a pessoa perder o acesso, reativar, ver o
acesso voltar; e excluir um convite recém-criado que não tem nada ligado a ele.

**Acceptance Scenarios**:

1. **Given** uma conta ativa, **When** o Admin a desativa, **Then** a pessoa perde o acesso **na
   requisição seguinte**, sem precisar que a sessão expire.
2. **Given** uma conta inativa, **When** o Admin a reativa, **Then** a pessoa volta a entrar.
3. **Given** um cadastro **sem nada ligado a ele**, **When** o Admin manda excluir, **Then** o
   sistema pede confirmação, avisa que é permanente, e só executa depois disso.
4. **Given** um cadastro **com** algo ligado a ele, **When** o Admin manda excluir, **Then** a recusa
   **nomeia o que impede** e oferece desativar no lugar.
5. **Given** uma exclusão executada, **When** alguém com direito de auditoria consulta o rastro,
   **Then** encontra **quem** excluiu, **o quê** e **quando**, com o retrato do que foi apagado.
6. **Given** o Admin, **When** ele tenta desativar ou excluir a **si mesmo**, **Then** a ação não é
   oferecida, com a razão escrita.
7. **Given** que só existe **um** Admin ativo, **When** alguém tenta rebaixá-lo, desativá-lo ou
   excluí-lo, **Then** a recusa vem **do banco** e é traduzida na tela.

---

### Edge Cases

- **Conta sem credencial** (convite gravado e e-mail não emitido): pode ser excluída, reativada e ter
  o nome corrigido; **não** pode ter a senha redefinida, porque não há credencial para redefinir.
- **A pessoa está logada em outro dispositivo quando o Admin redefine a senha dela.** A sessão
  antiga **cai** (`FR-038`): na requisição seguinte daquele dispositivo ela é levada à tela de
  entrada, e ao entrar com a temporária cai na troca obrigatória.
- **A pessoa é desativada enquanto navega.** A requisição seguinte a leva para a entrada.
- **O nome tem uma palavra só**, ou tem preposição (`de`, `da`, `dos`): as iniciais precisam de regra
  escrita, não de "pegue a primeira letra de cada palavra".
- **Foto enviada e depois removida**: o avatar volta às iniciais.
- **Dois usuários com o mesmo nome**: as iniciais coincidem, e isso é aceitável — o menu mostra o
  e-mail.
- **A pessoa fecha o navegador na tela de senha obrigatória**: ao voltar, continua obrigada.
- **O Admin redefine a própria senha**: é permitido, e ele também passa pela troca obrigatória.

---

## Requirements *(mandatory)*

### Sair e o menu do avatar

- **FR-001**: O cabeçalho MUST mostrar um **avatar** do usuário da sessão, acionável por clique e por
  teclado.
- **FR-002**: O avatar MUST abrir um menu com, no mínimo, **Meu perfil** e **Sair**, mais a
  identificação da conta (nome e e-mail).
- **FR-003**: *Sair* MUST encerrar a sessão e levar à tela de entrada.
- **FR-004**: Depois de sair, nenhuma tela do sistema MUST ser alcançável pelo endereço sem entrar de
  novo.
- **FR-005**: O perfil MUST ser apresentado em **português legível** em toda tela — nunca o valor do
  banco. A tradução MUST cobrir os **nove** perfis do domínio.

### O avatar e a foto

- **FR-010**: Sem foto, o avatar MUST mostrar as **iniciais** do nome.
- **FR-011**: A regra das iniciais MUST ser função pura, com casos escritos para nome de uma palavra,
  nome com preposição e nome vazio.
- **FR-012**: A pessoa MUST poder enviar uma foto **JPG ou PNG de até 2 MB**.
- **FR-013**: Arquivo fora do tipo ou do tamanho MUST ser recusado **antes do envio**, com a razão na
  tela, e a mesma regra MUST ser conferida **no servidor** — a recusa do navegador é conveniência,
  não garantia.
- **FR-014**: A pessoa MUST poder **remover** a foto, voltando às iniciais.
- **FR-015**: A foto MUST ser visível a quem já pode ler aquele cadastro, e a ninguém mais.

### O próprio cadastro

- **FR-020**: A pessoa MUST poder editar o **próprio nome**.
- **FR-021**: O **e-mail** MUST NOT ser editável por ninguém, em nenhuma tela. A tela MUST dizer por
  quê.
- **FR-022**: A pessoa MUST NOT poder alterar o **próprio perfil**, o próprio escopo nem a própria
  situação.
- **FR-023**: A tela do próprio cadastro MUST ser alcançável **por clique**, pelo menu do avatar.

### Senha

- **FR-030**: MUST existir **uma** tela de definição de senha nova, servindo tanto à troca voluntária
  quanto à obrigatória.
- **FR-031**: A regra de senha MUST viver em **função pura**, e a tela MUST explicar a regra antes de
  o envio falhar.
- **FR-032**: A recusa de senha fraca MUST vir também **do sistema**, não só do formulário — a regra
  vale para quem chama por fora da tela.
- **FR-033**: O Admin MUST poder **redefinir a senha** de outra conta; o sistema MUST gerar a senha e
  mostrá-la **uma única vez**, com aviso de que não será mostrada de novo.
- **FR-034**: A senha gerada MUST ser imprevisível e MUST NOT aparecer em registro de execução, em
  endereço, nem em qualquer lugar que sobreviva à tela.
- **FR-035**: Depois de uma redefinição, a conta MUST ficar **obrigada a trocar a senha** no próximo
  acesso.
- **FR-036**: Enquanto a obrigação existir, **nenhuma** outra tela do sistema MUST ser alcançável —
  a pessoa é devolvida à tela de senha nova.
- **FR-037**: Definida a senha nova, a obrigação MUST sumir, e a senha temporária MUST deixar de
  valer.
- **FR-038**: A redefinição de senha pelo Admin MUST **encerrar todas as sessões abertas** daquela conta (D-4, 29/09/2026). ⚠️ **Isto reverte o padrão que a spec havia adotado.** Redefinição pelo Admin quase sempre significa *"perdi o acesso"* ou *"a senha vazou"*, e nos dois casos deixar a sessão antiga viva é deixar o problema vivo.

### O Admin sobre outras contas

- **FR-040**: O Admin MUST poder editar o **nome** e o **perfil** de outra conta.
- **FR-040.1**: A escolha de perfil MUST oferecer os **nove** do domínio, **agrupados por divisão** (D-1, 29/09/2026). ⚠️ Oferecer um subconjunto deixaria perfis **sem caminho de atribuição pela tela**, e quatro deles já têm permissões semeadas — inclusive de leitura de identificação civil.
- **FR-041**: O Admin MUST NOT poder **excluir, desativar nem rebaixar a si mesmo**; a ação MUST NOT
  ser oferecida, com a razão escrita.
- **FR-042**: O sistema MUST manter **pelo menos um Admin ativo**; a tentativa de deixar zero MUST
  ser recusada e a recusa MUST ser traduzida na tela.
- **FR-043**: A regra do último Admin MUST existir em **função pura**, além da que já existe no
  banco. ⚠️ Hoje existem **duas afirmações** de que ela está no código e **nenhuma implementação** —
  ver `estado-atual.md` §3.1.
- **FR-044**: O Admin MUST poder **reativar** conta inativa, **sob a mesma permissão que desativa** (D-6, 29/09/2026). ⚠️ **Nenhuma ação nova entra na matriz de permissões**, e a asserção existente de que há **zero** ações `reativar` fica **intacta** — ela foi escrita para impedir que a matriz cresça sem decisão, e respeitá-la custa nada.
- **FR-045**: O Admin MUST poder **excluir permanentemente** uma conta **sem nada ligado a ela**, no
  padrão da **D-B1**: confirmação explícita, alerta de que é permanente, e **rastro** de quem, o quê
  e quando.
- **FR-046**: A exclusão de conta **com** dependente MUST ser recusada, e a recusa MUST **nomear o
  que impede** e oferecer desativar no lugar.
- **FR-047**: Toda ação administrativa sobre conta — editar perfil, redefinir senha, desativar,
  reativar, excluir — MUST gerar **registro de auditoria**.
- **FR-047.1**: O registro MUST ter **exatamente quatro** informações — **quem** fez, **o quê** fez, **sobre qual conta**, e **quando** (D-2, 29/09/2026) — e MUST viver em trilha **própria**, **nova** e **mínima**. ⚠️ Ela é nova porque a tabela de exclusões existente aceita três tabelas e **não** aceita contas; e é mínima porque o que se quer responder é *"quem mexeu na conta de quem, e quando"*, não guardar retrato de tudo.
- **FR-047.2**: A trilha MUST ser **somente de acréscimo**, e o registro já gravado MUST NOT ser alterável nem apagável por caminho nenhum.

### Como tudo isso é feito com segurança

- **FR-050**: Toda operação privilegiada MUST acontecer **no servidor**, com a checagem de Admin
  feita **lá**, e a chave privilegiada MUST NOT ser alcançável pelo navegador.
- **FR-051**: A decisão de quem pode o quê MUST continuar sendo resolvida **a cada requisição**, sem
  guardar perfil no token — é o que faz a desativação valer na requisição seguinte.
- **FR-052**: As regras de domínio desta fatia — iniciais, senha, último Admin, o que impede a
  exclusão — MUST viver em módulos **sem dependência de banco, de framework ou de interface**.

---

## Success Criteria *(mandatory)*

- **SC-001**: Uma pessoa entra, sai e entra com **outra conta** sem tocar em cookie, em janela
  anônima ou em qualquer artifício de navegador.
- **SC-002**: O perfil aparece em português em **100%** das telas que o mostram.
- **SC-003**: O percurso **redefinir → entrar com a temporária → trocar obrigatoriamente → entrar com
  a nova** é percorrido **por clique**, do início ao fim, sem nenhum endereço digitado à mão.
- **SC-004**: Enquanto a troca é obrigatória, **nenhuma** das demais telas é alcançável — medido
  tentando ao menos três delas.
- **SC-005**: Tentar excluir conta com dependente devolve, em português, **quais** são os
  dependentes, e a conta continua existindo.
- **SC-006**: A conta desativada perde o acesso **na requisição seguinte**, e não ao fim da sessão.
- **SC-007**: Nenhuma tentativa de deixar o sistema **sem Admin ativo** tem sucesso, por nenhum
  caminho — nem pela tela, nem por chamada direta.
- **SC-008**: A chave privilegiada não aparece em **nenhum** arquivo entregue ao navegador.
- **SC-009**: Arquivo fora do tipo ou acima de 2 MB é recusado **nos dois lados**, e a recusa do lado
  do servidor é medida com a do navegador desligada.
- **SC-010**: Toda ação administrativa consultada no rastro diz **quem, o quê, sobre quem e quando**.
- **SC-011**: Depois de o Admin redefinir a senha de alguém, **nenhuma** sessão daquela conta
  continua servindo — medido a partir de uma sessão aberta em outro navegador **antes** da
  redefinição.

---

## Key Entities

- **Conta de usuário** — quem entra no sistema. Tem identificação, nome, nome de exibição, e-mail,
  perfil, escopo, situação, vínculo opcional com ficha de instrutor, e o espelho da credencial.
- **Perfil** — o papel, de um conjunto **fechado de nove** valores do domínio. Decide o que a pessoa
  pode, pela matriz de permissões, que **não** é configurável nesta fatia.
- **Foto de perfil** — imagem opcional ligada a uma conta.
- **Obrigação de trocar senha** — marca que acompanha a credencial e é consultada a cada requisição.
- **Rastro de ação administrativa** — trilha **própria, nova e mínima**, com **quatro** informações e nada além: **quem** fez, **o quê** fez, **sobre qual conta**, e **quando** (D-2). Somente de acréscimo. ⚠️ A exclusão de conta, por ser destrutiva, MUST também deixar o **retrato do que foi apagado**, no padrão da D-B1 — e esse retrato não cabe nos quatro campos, entao ele vive onde os retratos de exclusão já vivem.

---

## Assumptions

✅ **As oito foram decididas por Bernardo Villas Boas em 29/09/2026** — ver *Clarifications*. Sete confirmaram o padrão adotado; a **quarta foi revertida**. Elas ficam aqui, com o registro de quando deixaram de ser suposição.

1. **A tela do próprio cadastro edita `nome_exibicao`, não `nome`.** `nome` é o nome civil que veio
   do cadastro; `nome_exibicao` já existe na tabela, é opcional, é o que o cabeçalho lê primeiro e
   **nunca foi escrito por tela nenhuma**.
2. **A lista de perfis oferecida ao Admin é a dos nove**, não a de três. O enum tem nove e a matriz
   semeia os nove; oferecer três esconderia seis perfis que já decidem permissão.
3. **A foto vive num espaço privado**, alcançada por endereço temporário, e não por endereço público.
   Foto de pessoa identificável num repositório público pede o caminho mais restrito por padrão.
4. ~~A redefinição de senha não derruba sessões já abertas.~~ ✅ **REVERTIDA em 29/09/2026 pela D-4**: ela **derruba todas** (`FR-038`). Era a única suposição em que a recomendação divergia do padrão adotado, e a decisão ficou com a recomendação.
5. **"Sem nada ligado a ela"**, para exclusão de conta, significa: sem credencial já usada, sem
   vínculo de curso, sem ter criado ou editado registro nenhum, e sem ficha de instrutor vinculada.
6. **A senha gerada tem comprimento acima do mínimo da plataforma**, para não nascer no limite.
7. **O rastro de ação administrativa usa uma trilha própria**, e não a tabela de exclusões — cujo
   domínio hoje aceita três tabelas e **não** aceita contas.
8. **A obrigação de trocar senha é conferida onde a sessão já é conferida**, junto da porta de
   entrada que já existe.

---

## Out of Scope

- **Matriz de permissões configurável por perfil** — a tela de permissões continua **somente
  leitura**.
- **Biblioteca nova de qualquer espécie** — nem recorte de imagem, nem gerador de senha.
- **Disciplinas e unidades de ensino** — fatia (b), em curso em PR próprio.
- **Escrita no banco remoto** — nada nesta rodada.
- **Edição de e-mail** — em nenhuma tela, por ninguém.
- **Segundo fator, sessão por dispositivo, expiração configurável, política de reuso de senha.**
- **Tela de auditoria** — o rastro é gravado e consultável por quem tem direito; a tela de leitura é
  de outra fatia.
- **Vínculo de cursos no convite** e **vínculo a ficha de instrutor** — continuam como estão.

---

## Divergências reportadas, não corrigidas

Registradas porque a regra 1 manda listar em vez de consertar.

1. **`AcoesDeUsuario.tsx` e `desativar()` afirmam uma conferência que não existe** (`estado-atual.md`
   §3.1). Esta spec exige a regra em função pura (`FR-043`); apagar a afirmação errada é do plano.
2. **O comentário de `usuarios.ultimo_acesso` diz que o middleware a escreve** — é a Server Action
   de acesso, uma vez por login.
3. **`supabase.rpc("eh_admin")` sempre erra**, e o caminho real é o fallback.
4. ~~A matriz tem zero ações `reativar`, e a `FR-044` conflita com a asserção existente.~~ ✅ **RESOLVIDA em 29/09/2026 pela D-6, e não havia conflito a resolver**: reativar passa a usar a **mesma permissão de desativar**, nenhuma ação nova entra na matriz, e a asserção de **zero** `reativar` fica **intacta**.
