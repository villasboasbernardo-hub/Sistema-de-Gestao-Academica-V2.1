# Feature Specification: Bloco 5 — cadastros novos

**Feature Branch**: `feat/BLOCO-5-cadastros-novos`
**Created**: 2026-10-20
**Status**: Draft
**Input**: Bloco 5 do plano de correções, pelo `/corrigir` de Bernardo Villas Boas de 20/10/2026: curso ofertável a
estrangeiros, custo total do curso, currículo em PDF, capacitação didática em lista fechada (com a conversão do texto
autorizada), contagem de acessos, e a `PEND-019-3`.

## 1. O problema, em uma frase

O cadastro do curso não diz se ele aceita estrangeiros, quanto custa nem onde está o currículo; a capacitação didática
do instrutor é texto livre; o Admin não sabe quem usa o sistema; e quatro percursos de teste quebram em 01/01/2027.

## 2. Paridade ou novidade (Princípio X, regra 3)

**Novidade**, autorizada nominalmente por Bernardo Villas Boas no pedido de 16/10/2026 (respostas 8, 11 e 12 da triagem
do plano de correções) e reiterada no `/corrigir` de 20/10/2026. O item 6 é conserto de teste.
⚠️ **Regra 2**: *custo de curso* — Bernardo confirma que é processo da CIAARA-11; se não for, as colunas ficam sem uso.

## 3. O que é banco e o que é só tela

Banco, **só acrescentando** (regra 9.4): colunas novas nuláveis em `cursos`; um balde novo `curriculos` com as suas
policies (sem `DELETE`); um tipo novo e duas colunas novas em `instrutores`, com `vw_instrutores` recriada **acrescentando**
as duas no fim; uma tabela nova `acessos_de_conta`, a função que a grava e uma view que a resume. **Dado alterado:** só a
conversão da capacitação, **autorizada** no pedido — o texto antigo **não é tocado**, e o convertido vai para as colunas
novas.

## Clarifications

### Session 2026-10-20 *(todas adotadas por padrão — Bernardo confere no fim)*

- C-1 · Q: Como se guarda "ofertável a estrangeiros"? → A: `cursos.ofertavel_estrangeiros boolean` **nulável** (nulo =
  *não informado*, porque nenhum curso tem a resposta hoje e *"não"* seria inventar) e `cursos.estrangeiros_observacao
  text`. Na tela: *Sim*, *Não* ou *Não informado*. — FR-001
- C-2 · Q: O filtro *Estrangeiros* do catálogo tem quais opções? → A: **Sim**, **Não** e **Não informado**, no parâmetro
  `estrangeiros` da URL (padrão: todos). Alternativa: só Sim/Não, juntando o *não informado* ao *Não*. — FR-001
- C-3 · Q: Como se guarda o custo? → A: `cursos.custo_total numeric(14,2)` nulável, não negativo, e `cursos.custo_composicao
  text`. Digita-se em reais com vírgula (*12.345,67*) e lê-se *R$ 12.345,67*. **Nada calcula a partir dele.** — FR-002
- C-4 · Q: Os campos novos entram também em *Novo curso*? → A: **Não**: só em *Editar curso*. O cadastro de curso novo é
  uma RPC (`criar_curso_com_regime`), e mudá-la seria recriar função existente; o curso nasce e é completado na edição.
  Alternativa: estender a RPC. — FR-001, FR-002
- C-5 · Q: O PDF passa pelo servidor do sistema? → A: **Não**: vai do navegador **direto ao Storage**, com a sessão de
  quem envia, e o banco decide quem pode (policy). Motivo medido: a Vercel corta o corpo de requisição em **4,5 MB**;
  por Server Action, nenhum PDF acima disso entraria em Production. O servidor só **registra** o envio depois, numa
  Server Action pequena. — FR-003
- C-6 · Q: Qual o limite do PDF? → A: **20 MB** no balde (o motor recusa acima, com 413) e a mesma conta feita antes de
  enviar, com a frase em português; o transporte do Storage aceita até 50 MiB, mais folgado que a regra (gotcha 14).
  Alternativa: 10 MB. — FR-003
- C-7 · Q: Onde fica o arquivo e quem pode o quê? → A: balde **privado** `curriculos`, um arquivo por curso,
  `<id do curso>/curriculo.pdf`, só `application/pdf`. **Ler**: `cursos.ler` com alcance do curso. **Carregar e
  substituir**: `cursos.editar` com alcance, curso **ativo**. **Sem policy de `DELETE`** (regra 4, `STORAGE-1`). — FR-003
- C-8 · Q: Onde se carrega e onde se baixa? → A: carrega-se em **Editar curso** (seção *Currículo em PDF*); baixa-se em
  **Sobre o Curso** (*Baixar o currículo (PDF)*, com a data do envio), por um endereço do próprio sistema que gera um link
  assinado de 60 segundos e redireciona — o arquivo não passa pela função. Sem currículo: *"Currículo ainda não
  carregado."* — FR-003
- C-9 · Q: Como se guarda a capacitação? → A: um tipo `tipo_capacitacao_didatica` (`C-Esp-DID`, `C-Exp-TE`,
  `Licenciatura`) — **domínio normativo fechado**, o caso de `ENUM` das convenções — e a coluna
  `instrutores.capacitacoes_didaticas tipo_capacitacao_didatica[]` (padrão: lista vazia). Alternativa: `config_listas` com
  tabela de junção. — FR-004
- C-10 · Q: O que acontece com o texto antigo? → A: **fica intocado**, como registro de origem
  (`capacitacao_didatica`, *aposentada*: nenhuma tela lê nem escreve mais). A conversão separa o texto por vírgula,
  ponto e vírgula ou barra, casa cada parte com a lista **sem diferenciar maiúscula, espaço e hífen**, grava as que casam
  em `capacitacoes_didaticas` e o resto, como foi escrito, em `instrutores.capacitacao_didatica_a_corrigir`. — FR-004
- C-11 · Q: Como se corrige o que não casou? → A: a ficha mostra o aviso *"Capacitação a corrigir: «…» — não está na
  lista (C-Esp-DID, C-Exp-TE, Licenciatura)"*; em *Editar*, o texto aparece num campo próprio, que se apaga depois de
  marcar as capacitações certas. — FR-004
- C-12 · Q: O alerta *"docência há mais de um ano sem capacitação"* muda? → A: **Não muda de veredito**: "tem
  capacitação" passa a ser *lista não vazia **ou** texto a corrigir*, que, depois da conversão, vale exatamente para os
  mesmos instrutores que tinham texto. Provado antes × depois. — FR-004
- C-13 · Q: O que conta como um acesso? → A: **cada entrada com senha bem-sucedida**, gravada na mesma Server Action
  que já carimba o *último acesso*, por uma função do banco que tira a conta da sessão (ninguém grava acesso de outra
  conta). A contagem começa quando a tabela entra no ar; a tela diz *"contados desde dd/mm/aaaa"*. — FR-005
- C-14 · Q: O que a tabela guarda? → A: **só conta e instante** (`usuario_id`, `ocorrido_em`), sem chave estrangeira e
  **sem `criado_por`** — com ele, `excluir_conta` contaria o acesso como dependente e toda conta que já entrou seria
  anonimizada em vez de apagada (D-USR-3). Só de acréscimo, imutável inclusive para a `service_role`; só o Admin lê.
  — FR-005
- C-15 · Q: O que o Admin vê? → A: na lista de usuários, a coluna **Acessos** ao lado de *Último acesso*; acima da
  tabela, o quadro com **Quem mais acessou** (as 5 contas com mais acessos) e **Acessos recentes** (os 10 últimos, conta e
  data com hora). — FR-005
- C-16 · Q: Como a `PEND-019-3` se resolve nos quatro? → A: `inicio.spec.ts`, `andamento-ate-hoje.spec.ts` (semente do
  panorama) e `ta-fora-do-dsa.spec.ts` **semeiam no ano de hoje em São Paulo**, com as datas contadas a partir de hoje; o
  `dsa-ver.spec.ts` Q-13 **escolhe o ano da semente do DSA na caixa de seleção do Início**, por clique, porque a semente é
  compartilhada por 22 arquivos e presa a semanas de 2026. Alternativa: mover a semente do DSA inteira. — FR-006
- C-17 · Q: O DSA no papel muda? → A: **Não** — o merge segue a conferência, sem esperar a virada de semana. — FR-007

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Estrangeiros e custo no cadastro do curso (Priority: P1)

Quem edita curso informa se ele é ofertável a estrangeiros (com observação) e o custo total (com a composição); quem lê
vê os dois em *Sobre o Curso*; o catálogo filtra por *Estrangeiros*.

**Acceptance Scenarios**:
1. **Given** um curso sem os dados, **When** abro *Sobre o Curso*, **Then** vejo *Não informado* nos dois.
2. **Given** *Editar curso*, **When** marco *Sim*, escrevo a observação, digito *12.345,67* e gravo, **Then** o banco tem
   `true`, a observação e `12345.67`, e *Sobre o Curso* mostra *Sim* e *R$ 12.345,67*.
3. **Given** o catálogo, **When** escolho *Estrangeiros: Sim*, **Then** só os cursos marcados *Sim* aparecem, e a URL
   leva `?estrangeiros=sim`.

### User Story 2 — O currículo em PDF (Priority: P1)

**Acceptance Scenarios**:
1. **Given** *Editar curso* com permissão de editar, **When** escolho um PDF, **Then** ele vai ao balde e *Sobre o Curso*
   passa a oferecer *Baixar o currículo (PDF)* com a data.
2. **Given** outro PDF, **When** envio de novo, **Then** o arquivo é **substituído** (um só por curso).
3. **Given** um arquivo que não é PDF, ou acima de 20 MB, **Then** a tela recusa com a frase em português, e o balde
   recusa também se a tela for contornada.
4. **Given** um perfil que só lê o curso, **Then** baixa, e **não** carrega — recusado pelo banco.

### User Story 3 — Capacitação didática em lista (Priority: P1)

**Acceptance Scenarios**:
1. **Given** a ficha de um instrutor com *"C-Exp-TE, C-Esp-DID"* no texto antigo, **Then** depois da conversão ela mostra
   as duas capacitações marcadas, e nenhum aviso.
2. **Given** um texto que não casa (*"Pedagogia"*), **Then** ele fica guardado e a ficha mostra o aviso; em *Editar*, marco
   a certa, apago o texto e gravo, e o aviso some.
3. **Given** o filtro de capacitação da lista de instrutores, **When** escolho *C-Esp-DID*, **Then** vêm os que a têm.

### User Story 4 — Contagem de acessos (Priority: P2)

**Acceptance Scenarios**:
1. **Given** uma conta que entra com senha, **Then** o banco ganha **uma** linha de acesso dela.
2. **Given** o Admin em *Administração → Usuários*, **Then** vê a coluna *Acessos* e o quadro *Quem mais acessou /
   Acessos recentes*.
3. **Given** um perfil que não é Admin, **Then** o banco **não** lhe mostra acesso nenhum, e ele **não** grava acesso
   de outra conta.

### User Story 5 — Os percursos sem 2026 escrito à mão (Priority: P1)

**Acceptance Scenarios**:
1. **Given** os quatro percursos, **When** rodam em qualquer ano, **Then** acham as turmas no Início.

### Edge Cases

- Curso **inativo**: não aceita currículo novo (o banco já recusa mudar curso inativo; a policy exige curso ativo).
- PDF enviado e registro do envio falhou: a tela avisa, e *Sobre o Curso* só oferece o download depois do registro.
- Instrutor sem texto antigo: conversão não toca a linha.
- Conta excluída: os acessos dela ficam (só conta e instante), e somem das telas, que juntam por conta viva.

## Requirements *(mandatory)*

### FR-001 — Estrangeiros
- **FR-001.1**: O curso MUST guardar *ofertável a estrangeiros* (Sim/Não/não informado) e uma observação, editáveis em
  *Editar curso* e lidos em *Sobre o Curso* (C-1, C-4).
- **FR-001.2**: O catálogo MUST filtrar por *Estrangeiros* (Sim, Não, Não informado), na URL (C-2).

### FR-002 — Custo total
- **FR-002.1**: O curso MUST guardar um custo total em reais (não negativo) e um texto opcional de composição, editáveis
  em *Editar curso* e lidos em *Sobre o Curso* (C-3, C-4). Nenhum cálculo MUST ler o custo.

### FR-003 — Currículo em PDF
- **FR-003.1**: Quem edita o curso MUST poder carregar e substituir o PDF do currículo; quem lê o curso MUST poder
  baixá-lo pela aba *Sobre o Curso* (C-5, C-7, C-8).
- **FR-003.2**: Só PDF, até 20 MB, conferidos **no balde** e na tela (C-6).
- **FR-003.3**: Nenhuma policy de `DELETE` MUST existir no balde (regra 4).

### FR-004 — Capacitação didática
- **FR-004.1**: A capacitação MUST ser escolhida numa lista fechada, com mais de uma marcável (C-9).
- **FR-004.2**: O texto atual MUST ser convertido; o que não casar MUST ficar guardado e aparecer como aviso na ficha,
  corrigível à mão (C-10, C-11).
- **FR-004.3**: O alerta de docência sem capacitação MUST dar o mesmo veredito antes e depois da conversão (C-12).

### FR-005 — Acessos
- **FR-005.1**: Cada entrada com senha bem-sucedida MUST gravar um acesso da própria conta (C-13, C-14).
- **FR-005.2**: O Admin MUST ver o total por conta na lista de usuários e o quadro de quem mais acessou e dos acessos
  recentes; os demais perfis MUST NOT ler acesso nenhum (C-15).

### FR-006 — `PEND-019-3`
- **FR-006.1**: Nenhum dos quatro percursos MUST depender de o ano de hoje ser 2026 (C-16).

### FR-007 — O DSA no papel
- **FR-007.1**: O DSA (tela, papel, planilha e numeração) MUST NOT mudar.

### Key Entities

`cursos` (5 colunas novas), `storage.objects` do balde `curriculos`, `instrutores` (2 colunas novas e o tipo
`tipo_capacitacao_didatica`), `acessos_de_conta` (nova), `vw_acessos_por_conta` (nova), `vw_instrutores` (2 colunas no fim).

## Success Criteria *(mandatory)*

- **SC-001**: Estrangeiros e custo gravados em *Editar curso* aparecem iguais no banco e em *Sobre o Curso*; o filtro
  *Estrangeiros: Sim* traz só os cursos marcados.
- **SC-002**: Um PDF carregado é baixado igual (mesmo tamanho), substituir deixa um arquivo só, não-PDF e acima de 20 MB
  são recusados pelo balde, e um perfil sem `cursos.editar` é recusado pelo banco ao carregar.
- **SC-003**: Na cópia do remoto, a conversão casa os 31 textos de hoje e o veredito do alerta de capacitação é o mesmo
  para os 181 instrutores antes e depois; um texto que não casa fica guardado e aparece como aviso.
- **SC-004**: Uma entrada gera exatamente um acesso da própria conta; só o Admin lê acessos.
- **SC-005**: Os quatro percursos não contêm o ano 2026 em dado semeado nem em asserção.

## Assumptions

- Os currículos são PDFs de até 20 MB (decisão C-6, a conferir por Bernardo com os arquivos reais).
- O painel do Supabase remoto mantém o limite global de upload em 50 MiB ou mais.
