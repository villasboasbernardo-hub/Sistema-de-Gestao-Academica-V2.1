# Guia de testes do CIAARA-11 — versão nova

**Para quem vai testar.** Este guia foi escrito a partir do sistema que está no ar hoje, tela por
tela. Ele não tem termo técnico: se você encontrar uma palavra que não entende, é erro nosso — avise.

**O que você vai fazer:** usar o sistema novo no dia a dia, como se já fosse o definitivo, e nos
contar o que não funcionou, o que confundiu e o que faltou.

---

## 1. Como começar

### O endereço

> **https://sistema-de-gestao-academica-v2-1.vercel.app**

Abra no Chrome ou no Edge, no computador. No celular funciona, e vale testar — algumas coisas mudam
de lugar na tela pequena, e isso está avisado adiante.

### Como entrar

1. Na tela de entrada você vê **CIAARA-11** e, abaixo, dois campos: **E-mail** e **Senha**.
2. Digite o e-mail que o Administrador cadastrou e a senha que ele lhe entregou.
3. Clique em **Entrar**.

Se errar o e-mail ou a senha, aparece sempre a mesma frase: **"E-mail ou senha incorretos."** Ela é
igual nos dois casos de propósito — o sistema não diz se um e-mail existe ou não.

### O primeiro acesso: a senha temporária

A senha que o Administrador lhe deu é **temporária** e serve uma vez.

1. Ao entrar com ela, o sistema leva você direto para a tela **Trocar a minha senha**.
2. Escreva a senha nova duas vezes: em **Senha nova** e em **Repita a senha nova**. Ela precisa ter
   **pelo menos 12 caracteres**.
3. Clique em **Trocar senha**. Aparece **"Senha trocada. Use a nova na próxima entrada."**

**Três coisas que você precisa saber antes, para não achar que é defeito:**

- A tela **não escreve** que a troca é obrigatória. Ela é a mesma tela de quem troca a senha por
  vontade própria.
- Enquanto você não trocar, **qualquer outro endereço devolve você para essa tela**. É assim de
  propósito.
- Nessa tela existe o link **"Voltar ao meu perfil"**. No primeiro acesso ele **traz você de volta
  para a mesma tela**, sem explicar. Já sabemos disso; não precisa reportar.

### Esqueceu a senha?

Não existe "esqueci minha senha" neste sistema, e não existe nenhum e-mail automático. A própria tela
de entrada diz: **"Esqueceu a senha? Procure o administrador do sistema."** Ele gera uma senha nova e
entrega a você — e você troca no acesso seguinte, como no primeiro dia.

### Como sair

Clique na **sua foto** (ou nas suas iniciais) no **canto superior direito**. Abre um menu com o seu
nome, o seu e-mail e o seu perfil, e dois itens: **Meu perfil** e **Sair**. Clique em **Sair**.

Não existe botão de sair solto na tela — o caminho é esse, dois cliques.

### Tema claro e tema escuro

No alto da tela, à direita, há a palavra **Tema:** e três botões: **Claro**, **Noturno** e
**Sistema**. "Noturno" é o tema escuro. "Sistema" segue a configuração do seu Windows. O botão do
tema em uso fica marcado.

Vale testar as duas aparências em todas as telas: a leitura no escuro é uma das coisas que queremos
conferir.

### O menu do lado esquerdo

O menu tem oito itens, nesta ordem:

**Início · Cursos · Turmas · Disciplinas · Instrutores · Cronograma · Atividades · Administração**

- **Cronograma** e **Atividades** aparecem em cinza, com a marca **"em breve"**, e **não abrem**.
  São telas de etapas futuras. Não são defeito.
- No **computador**, o menu começa **recolhido**, mostrando só os ícones. **Passe o mouse** por cima
  e ele se abre com os nomes; afaste o mouse e ele se recolhe.
- No **topo** do menu há um botão pequeno, sem texto, com o desenho de um painel. Clicando nele o
  menu **fica aberto** e não se recolhe mais; clicando de novo, ele volta a recolher. A sua escolha
  fica lembrada naquele computador.
- No **celular**, o menu não fica do lado: aparece um botão escrito **Menu**, que abre uma gaveta com
  os nomes já visíveis. O botão de fixar não existe ali.

### Todos veem os oito itens do menu — e isso é de propósito

O menu é igual para todos os perfis. Você vai ver **Administração** mesmo que o seu perfil não possa
abrir a lista de contas: ao clicar, a própria tela diz que aquilo não é para você. **Isso não é
defeito** — esconder o item não protegeria nada, e o sistema prefere dizer a verdade na tela.

---

## 2. Regras de ouro

1. **O sistema usa DADO REAL.** São os cursos, as turmas, os instrutores e as disciplinas da
   CIAARA-11. O que você gravar fica gravado.
2. **Corrija só o que você sabe que está certo.** Se a tela mostra algo diferente do que você
   esperava e você não tem certeza de qual é o valor correto, **não corrija**: reporte.
3. **Não crie curso, turma, instrutor nem disciplina de teste.** Nada aqui é descartável.
4. **Anote antes de alterar.** Antes de salvar, escreva o valor que estava lá. Se der errado,
   é com essa anotação que a gente volta atrás.
5. **Na dúvida, não salve.** Fechar a tela sem salvar nunca estraga nada.
6. **Nada é apagado neste sistema.** "Desativar" tira de uso e guarda o histórico. As duas únicas
   exclusões definitivas que existem exigem digitar um código para confirmar — e só funcionam em
   cadastro que nunca foi usado.
7. **Tela vazia não quer dizer que o sistema perdeu o dado.** Cada tela tem frases diferentes para
   "não há nada", "você não alcança isto" e "o dado ainda não chegou". **Copie a frase que apareceu**
   no seu relato: é ela que nos diz qual dos três casos é.

---

## 3. O seu perfil

Na tela, o seu perfil aparece ao lado do seu nome, no alto à direita (no celular, abra o menu da sua
foto para vê-lo). São estes quatro, escritos exatamente assim:

- **Administrador do sistema**
- **Encarregado da Administração Acadêmica**
- **Ajudante da Administração Acadêmica**
- **Operador**

Encontre adiante a seção do **seu** perfil. Você não precisa ler as outras.

---

## 4. Administrador do sistema

Você vê tudo e muda tudo, inclusive as contas das outras pessoas.

### O que você deve conseguir fazer

**Início**

1. Clique em **Início**. Você vê quatro quadros no alto — *Turmas no recorte*, *Em andamento*,
   *Carga executada* e *Progresso do recorte* — e a lista de turmas abaixo.
2. Confira a faixa de avisos, que fica sempre visível: ela diz **"Turmas exigindo atenção"** com a
   quantidade, ou **"Nada exigindo atenção"**.
3. Troque os filtros **Classificação** e **Modalidade** (os dois começam em "Todas"). A lista e os
   quatro quadros têm de mudar junto.
4. Clique numa turma da lista. **Atenção:** isso abre a **página do curso** com aquela turma
   escolhida — e não a ficha da turma. É assim mesmo.

**Cursos**

5. Clique em **Cursos**. Os cursos aparecem agrupados por classificação, com dois quadros de números
   e dois gráficos.
6. O filtro **Situação** começa em **"Em oferta"**. Troque para **"Fora de oferta"** e confirme que a
   lista muda — curso desativado só aparece assim.
7. Abra um curso. Confira o alto da tela: a sigla, o nome, a modalidade e a linha **"Regime
   vigente:"** escrita em palavras.
8. Abra o quadro **"Avisos de qualidade de cadastro"** (ele começa fechado, mostrando só a
   quantidade) e leia os avisos. Nenhum deles impede gravar.
9. Troque entre as abas **Grade** e **Sobre o Curso**.
10. Clique em **Editar curso**, mude o **propósito** e salve. Deve aparecer confirmação. Se você
    mudar a sigla, a classificação ou o limite de turmas, o sistema **pede confirmação antes** — leia
    a pergunta com atenção.

**Turmas**

11. Clique em **Turmas**. Confira a contagem embaixo do título e as colunas: Turma, Curso, Ano,
    Janela, Situação e Efetivo.
12. Use os filtros **Buscar pelo código**, **Curso**, **Ano letivo** e **Situação**. Depois clique em
    **Limpar filtros** (ele só aparece quando há filtro).
13. Clique numa turma para abrir a **ficha**.
14. Na ficha, confira o alto: Situação, Modalidade, **Período**, Sala e Efetivo numa linha só.
15. Confira a seção **Andamento**: os quatro indicadores (*CH prevista*, *CH executada*, *Progresso*
    e **Saldo de capacidade (TA)**), a barra de progresso, o **Saldo em dias** e a **Capacidade
    diária**.
16. Procure uma turma com a tarja **"Em atraso"**. Ela só aparece em turma **ativa** que tenha data
    de término e regime de horário — e significa que o tempo que resta até o término não cobre a
    carga que falta.
17. Desça até **Disciplinas** e confira a tabela, com CH prevista, CH executada e o percentual de
    cada disciplina.
18. No fim da ficha, clique em **Editar turma**: o formulário abre. Mude o **efetivo** e salve.
    **Cuidado:** fechar o painel apaga o que você digitou e não salvou.

**Disciplinas**

19. Clique em **Disciplinas** e escolha um curso na lista **Curso**.
20. Clique numa linha para abrir o detalhe. Para fechar, clique em **outra** linha — nesta tela,
    clicar de novo na mesma não fecha.
21. Clique em **Editar disciplina**, corrija o nome ou a carga e salve.

**Instrutores**

22. Clique em **Instrutores**. A lista sai **sempre por antiguidade**.
23. Use alguns dos filtros. O filtro **Situação** começa em **"Ativos"** — instrutor inativo só
    aparece trocando para "Inativos".
24. Abra a ficha de um instrutor e leia os alertas do alto, que **avisam e não impedem nada**.
25. Clique em **Editar cadastro** no fim da ficha, corrija um dado e salve.

**Meu perfil**

26. Clique na sua foto → **Meu perfil**. Troque o seu **nome de exibição** em "Como você quer ser
    chamado" e clique em **Gravar nome**.
27. Clique em **Enviar foto** e escolha um arquivo. **Escolher o arquivo já envia** — não há segundo
    botão. A foto precisa ser **JPG ou PNG, de até 2 MB**.
28. Confira que **E-mail** e **Perfil** aparecem só para leitura, com a razão escrita embaixo.

**Administração**

29. Clique em **Administração**. Você cai em **Usuários** e vê as três abas: **Usuários**,
    **Permissões** e **Salas**.
30. Em **Usuários**, confira a lista e as quatro ações de cada linha: **Editar**, **Redefinir
    senha**, **Desativar** e **Excluir**.
31. Abra a aba **Permissões**: é a tabela que mostra, perfil por perfil, o que cada um pode fazer. É
    só leitura, e serve para você conferir por que alguém não vê um botão.
32. Abra a aba **Salas** e acrescente uma sala de verdade, se houver uma faltando. Sala errada se
    **desativa** — não se renomeia nem se apaga.

### O que você NÃO deve conseguir

1. **Mexer na sua própria conta pela lista.** Na sua linha não há ação nenhuma, só o texto **"sua
   conta — peça a outro Administrador"**.
2. **Trocar o seu próprio perfil, desativar-se ou excluir-se.** A página da sua conta mostra um aviso
   em vez dos formulários.
3. **Desativar ou excluir o último Administrador que consegue entrar.** O sistema recusa e explica
   que precisa de pelo menos um.
4. **Renomear uma sala.** Não existe esse campo: o nome é o que ficou gravado em cada turma.
5. **Ver a senha temporária de novo.** Ela aparece **uma vez**. Se você perder, redefina outra.

---

## 5. Encarregado da Administração Acadêmica

Você faz tudo o que é acadêmico: cursos, turmas, disciplinas, instrutores, horários e salas. O que
você **não** faz é mexer nas contas das pessoas.

### O que você deve conseguir fazer

Siga os passos **1 a 28** da seção do Administrador: todos valem para você, do Início ao Meu perfil.
Em especial, você deve conseguir:

1. Criar curso pelo botão **Novo curso**, no catálogo.
2. **Editar curso**, inclusive registrar uma vigência nova de regime de horário em **Editar curso →
   Registrar nova vigência**.
3. **Desativar curso** e reativá-lo.
4. Criar turma pelo botão **Nova turma**, na aba **Grade** da página do curso. A turma nasce sempre
   dentro de um curso.
5. Editar a turma pelo **Editar turma**, no fim da ficha.
6. Editar disciplina e corrigir as **unidades de ensino** dela.
7. Cadastrar instrutor em **Novo instrutor** e editar a ficha de qualquer um.
8. Em **Administração → Salas**, acrescentar e desativar sala.

### O que você NÃO deve conseguir

1. **Abrir a lista de contas.** Em **Administração → Usuários** aparece **"Você não tem acesso a
   este conteúdo"** com a frase **"A gestão de usuários é do perfil Admin. Você enxerga apenas o
   próprio cadastro."** Isso é esperado.
2. **Cadastrar usuário.** O botão não existe para você. Mesmo digitando o endereço da tela de
   cadastro, o sistema recusa com **"Cadastrar conta é do perfil Admin."**
3. **Redefinir a senha de outra pessoa**, desativar ou excluir conta. São todas do Administrador.
4. **Mudar o seu próprio perfil ou o seu e-mail.** A tela **Meu perfil** mostra os dois só para
   leitura, com a razão escrita.

### O que você vê, e quanto

Você alcança **todos os cursos** da CIAARA-11 — não há recorte para o seu perfil. Se alguma tela
disser que algo está "fora do seu alcance", **reporte**: para você isso não deveria acontecer.

---

## 6. Ajudante da Administração Acadêmica

O seu perfil é quase igual ao do Encarregado. A diferença, medida no sistema, é **uma só**: você não
mexe nas **salas**.

### O que você deve conseguir fazer

Siga os passos **1 a 28** da seção do Administrador e os itens **1 a 7** da seção do Encarregado:
todos valem para você. Em especial:

1. Criar e editar curso, e registrar vigência de regime de horário.
2. Criar turma dentro do curso e editar a ficha dela.
3. Editar disciplina e as unidades de ensino.
4. Cadastrar e editar instrutor.
5. Abrir **Administração → Salas** e **ler** a lista inteira: Sala, Natureza, Situação e as turmas
   que usam cada uma.

### O que você NÃO deve conseguir

1. **Acrescentar sala.** O formulário "Acrescentar sala" não aparece para você.
2. **Desativar ou reativar sala.** A coluna **Ações** da tabela de salas não existe para você — a
   tabela aparece inteira, só sem como mexer.
3. **Abrir a lista de contas** em **Administração → Usuários**: aparece **"A gestão de usuários é do
   perfil Admin. Você enxerga apenas o próprio cadastro."**
4. **Cadastrar usuário, redefinir senha de outra pessoa, desativar ou excluir conta.**
5. **Mudar o seu próprio perfil ou o seu e-mail**, na tela Meu perfil.

### O que você vê, e quanto

Você também alcança **todos os cursos**. Nenhuma tela deveria dizer "fora do seu alcance" para você.

---

## 7. Operador

Você trabalha com **turmas** e com os **horários** dos cursos. Cursos e instrutores, você consulta.

### O que você deve conseguir fazer

**Início e consultas**

1. Abrir o **Início** e usar os filtros, como nos passos 1 a 4 da seção do Administrador.
2. Abrir **Cursos**, filtrar e abrir a página de um curso — tudo em leitura.
3. Abrir **Instrutores**, usar os filtros e abrir a ficha de um instrutor — tudo em leitura.

**Turmas — é aqui que está o seu trabalho**

4. Clique em **Turmas**, use os filtros e abra a ficha de uma turma.
5. Confira a seção **Andamento** inteira: os quatro indicadores, a barra, o saldo em dias e a
   capacidade diária.
6. No fim da ficha, clique em **Editar turma**, corrija o **efetivo** ou a **sala** e salve.
7. Crie uma turma: abra o curso → aba **Grade** → botão **Nova turma**. A turma nasce dentro do
   curso; não há botão de criar turma na lista de Turmas.

**Horários do curso**

8. Na página de um curso, clique em **Editar curso**. Você **vai** conseguir abrir — e vai encontrar
   **só** a parte do regime de horário, com a frase **"O seu perfil registra o regime deste curso,
   mas não edita o cadastro dele."** Isso é esperado.
9. Em **Registrar nova vigência**, registre um regime novo a partir de uma data. O sistema pede
   confirmação.

**Disciplinas**

10. Abra **Disciplinas**, escolha um curso e abra uma linha.
11. Clique em **Editar disciplina**, corrija um dado e salve.
12. Na **ficha de uma turma**, na seção Disciplinas, abra uma linha e use **Gravar período** e os
    botões de **instrutores** daquela disciplina naquela turma.

**Meu perfil**

13. Troque o seu nome de exibição e a sua foto, como nos passos 26 a 28 da seção do Administrador.

### O que você NÃO deve conseguir

1. **Criar curso.** O botão **Novo curso** não aparece no catálogo para você.
2. **Editar o cadastro do curso.** Você abre o **Editar curso**, mas só a parte do regime está lá —
   o formulário do curso é substituído pela frase que explica isso.
3. **Cadastrar instrutor.** O botão **Novo instrutor** não aparece, e na ficha de um instrutor não
   existe a seção **Editar cadastro**.
4. **Excluir disciplina.** O botão **Excluir** não aparece para você.
5. **Abrir a lista de contas.** Você **vai** conseguir clicar em **Administração** no menu — e a tela
   responde **"A gestão de usuários é do perfil Admin. Você enxerga apenas o próprio cadastro."**
   Isso é esperado, não é defeito.
6. **Mexer nas salas.** Em **Administração → Salas** você lê a tabela, sem formulário e sem a coluna
   de ações.

### ⚠️ O que você vê, e quanto — leia isto antes de reportar

O seu perfil pode ser cadastrado com um **recorte**: em vez de todos os cursos, você enxerga só os de
uma **classificação** (regulares, expeditos, estágios…). Quem define isso é o Administrador, no seu
cadastro, e **não existe tela que lhe mostre qual é o seu recorte** — pergunte a ele.

Dentro do recorte, tudo funciona normalmente. Fora dele, as telas dizem **"não encontrado, ou fora do
seu alcance"** e as listas vêm vazias com frases como **"Você não alcança turmas"**. **Isso é o
sistema funcionando certo.** Antes de reportar uma ausência, confirme com o Administrador qual é o
seu recorte.

> **Nota:** existe também um perfil chamado **Encarregado de Curso**, que enxerga apenas os cursos
> aos quais foi vinculado, um por um. Ele **não** faz parte desta rodada de testes.

---

## 8. Como reportar um problema

Mande uma mensagem com **cinco linhas**, nesta ordem. Vale a pena copiar o modelo:

```
1. Perfil: (o que aparece ao lado do seu nome, no alto da tela)
2. Tela:   (o nome que está no título, e o endereço se você souber)
3. O que fiz: (os cliques, na ordem)
4. O que eu esperava:
5. O que aconteceu: (copie a frase que apareceu, palavra por palavra) + print da tela
```

**Três pedidos que fazem toda a diferença:**

- **Copie a frase exatamente como está na tela.** As frases são diferentes de propósito: uma diz
  "não há", outra diz "você não alcança", outra diz "ainda não chegou". É pela frase que a gente
  descobre qual é o caso.
- **Mande o print.** Da tela inteira, com o alto visível.
- Se aparecer **"Algo falhou nesta tela"** com a linha **"Referência para o suporte:"** seguida de um
  código, **copie esse código**. Ele leva direto à causa.

---

## 9. Só para o Administrador: como preparar os testadores

### Cadastrar cada pessoa

1. **Administração → Usuários → Cadastrar usuário.**
2. Preencha **Nome completo** e **E-mail**. ⚠️ O e-mail **não é editável depois**: é com ele que a
   pessoa entra.
3. Em **Perfil de acesso**, escolha o perfil (a lista vem agrupada por divisão). O campo começa em
   **Operador** — troque se for outro.
4. Em **Escopo**, deixe **"Geral — todos os cursos"**, a não ser que você queira testar o recorte do
   Operador. Para os outros três perfis a tela avisa que o escopo não muda nada.
5. Clique em **Cadastrar usuário**.
6. ⚠️ **A senha temporária aparece UMA VEZ**, nesta tela, depois de salvar: **"Senha temporária:
   …"**. **Copie antes de sair ou de recarregar** — recarregar a perde, e não há como vê-la de novo.
   Entregue-a à pessoa em mãos.
7. Se clicar em **Cadastrar outra**, a senha que está na tela **desaparece**. Copie primeiro.

### Qual perfil dar a cada testador

| Quem vai testar | Perfil a escolher |
|---|---|
| Você mesmo | Administrador do sistema |
| A Encarregada da Divisão | Encarregado da Administração Acadêmica |
| O Ajudante da Divisão | Ajudante da Administração Acadêmica |
| Quem lança turma e horário | Operador |

⚠️ **Os rótulos na tela não têm a palavra "Divisão" e estão no masculino** — é assim que o sistema os
escreve hoje. Se isso incomodar, é mudança de texto, e a gente faz.

### Redefinir a senha de alguém

1. **Administração → Usuários**, ache a linha da pessoa.
2. Clique em **Redefinir senha**. O sistema pergunta antes e avisa que isso **encerra todas as
   sessões abertas** dela.
3. Copie a **senha temporária** que aparece e entregue em mãos. No acesso seguinte ela terá de
   definir outra.

⚠️ **Conta que nunca entrou** não tem o botão **Redefinir senha** — a linha mostra **"sem credencial
— não entra"**. Nesse caso, exclua a conta e cadastre o mesmo e-mail de novo: a exclusão libera o
endereço.

### Desativar e excluir

- **Desativar** tira o acesso e **não apaga nada**: o cadastro fica na lista, marcado, e reativar
  devolve o acesso.
- **Excluir** é permanente, e só existe **na linha da lista** — não há "Excluir" dentro da página da
  conta. O sistema pergunta nomeando a conta e o e-mail.

---

## 10. Fora do teste por enquanto

Estas partes ainda não existem no sistema, e aparecem no menu marcadas **"em breve"**, em cinza, sem
abrir:

- **Cronograma**
- **Atividades**

E ainda **não há lançamento de aula nem de avaliação**: nada do dia a dia do DSA, das notas ou das
avaliações pode ser lançado nesta rodada. Os números de **CH executada** que você vê nas telas vêm da
carga da planilha da v2.0 — não de lançamento feito aqui.

Se você sentir falta dessas telas, isso é esperado: elas são as próximas etapas. O que queremos saber
agora é se **cursos, turmas, disciplinas, instrutores e o acompanhamento das turmas** funcionam para
o seu trabalho.

---

**Obrigado.** Cada frase estranha que você nos contar é uma correção que entra antes de o sistema
virar o definitivo.
