# Contrato — rotas, escritas e recusas da spec 011

## 1. Rotas, e o caminho clicável até cada uma

⚠️ **Tela sem caminho clicável é tela NÃO ENTREGUE** (decisão de 24/09/2026). Cada rota nova traz
**de onde** se chega por clique, e `tests/unidade/toda-tela-tem-caminho.test.ts` varre isso.

| Rota | O que é | Chega-se por clique de |
|---|---|---|
| `/perfil` | o próprio cadastro: nome de exibição, foto, e o botão de trocar a senha | **menu do avatar → *Meu perfil*** |
| `/perfil/senha` | a tela única de senha nova — voluntária e obrigatória | `/perfil` → *Trocar senha*; e **para onde a porta empurra** quem está obrigado |

⚠️ **`/perfil/senha` tem DOIS modos e UMA tela** (`FR-030`). No modo obrigatório ela não oferece
*Cancelar*, e o menu do avatar continua oferecendo *Sair* — senão quem entrou na conta errada com
uma senha temporária ficaria preso (D-8).

⚠️ **EMENDADO em 03/10/2026 — SÃO DUAS ROTAS NOVAS DE ADMINISTRAÇÃO** *(decisões de Bernardo Villas
Boas, **D-USR-2**, **D-USR-5** e **D-USR-6**)*. ⚠️ *(Registro anterior, vencido: "**Não há rota nova de
administração**: as ações da US5 e da US6 entram na `/admin/usuarios`, que já existe e já é alcançável
por clique.")* O que ele recusou na reconferência foi **formulário dentro da linha** — *"Nada de
diálogo sobre diálogo na lista"* —, e isso tirou duas telas da `/admin/usuarios`:

| Rota | O que é | Chega-se por clique de |
|---|---|---|
| `/admin/usuarios/novo` | o **cadastro** da conta pelo Admin, com a **senha temporária mostrada uma vez** e **troca obrigatória no primeiro acesso** (D-USR-2) | `/admin/usuarios` → botão **Cadastrar usuário** |
| `/admin/usuarios/[id]` | a **página de uma conta**: nome, perfil e acessos, mais redefinir senha, desativar e reativar (D-USR-5) | `/admin/usuarios` → o **nome** da linha, que é link; e o botão **Editar** da linha (D-USR-6) |

⚠️ **A PRIMEIRA DELAS SUBSTITUI A ROTA `/convite`, QUE NÃO EXISTE MAIS** (**D-USR-1**): o **convite por e-mail foi
permanentemente removido** e **não há envio de e-mail nenhum**. A conta **nasce inteira** — credencial
e cadastro —, e com isso deixou de existir o estado *"cadastro sem credencial"* que o convite
produzia. Medido no repositório em 03/10/2026: as duas rotas estão declaradas em
`lib/navegacao/contrato.ts`, e os dois caminhos clicáveis acima são o que
`tests/unidade/toda-tela-tem-caminho.test.ts` exige.

⚠️ **E a `/admin/usuarios` continua sendo onde as ações ACONTECEM** — **quatro em cada linha**:
*Editar* · *Redefinir senha* · *Desativar/Reativar* · *Excluir* (**D-USR-6**). *Editar* é **link**,
não ação; as outras três confirmam, porque a consequência de cada uma é invisível na tela de quem
clica.

---

## 2. As Server Actions

| Ação | Arquivo | Usa a chave privilegiada? | Quem pode |
|---|---|---|---|
| `encerrarSessao` | `lib/acoes/sessao.ts` — **já existe** | não | qualquer sessão |
| `editarProprioCadastro` | `lib/acoes/perfil.ts` | não — RLS basta, a policy já deixa o próprio editar a própria linha | o próprio |
| `enviarFoto` / `removerFoto` | `lib/acoes/perfil.ts` | não — a policy do bucket decide pelo caminho | o próprio |
| `trocarPropriaSenha` | `lib/acoes/perfil.ts` | não — o próprio troca a própria | o próprio |
| `editarConta` | `lib/acoes/usuarios.ts` — **estende a `editarPerfilEEscopo` que já existe** | não | Admin |
| `redefinirSenha` | `lib/acoes/usuarios.ts` | **SIM** | Admin |
| `reativar` | `lib/acoes/usuarios.ts` | não | Admin |
| `excluirConta` | `lib/acoes/usuarios.ts` | **SIM** | Admin |

⚠️ **EMENDADO em 03/10/2026 — SÃO QUATRO AÇÕES COM A CHAVE PRIVILEGIADA, E UMA AÇÃO NOVA NA LISTA**
*(decisões de Bernardo Villas Boas, **D-USR-1**, **D-USR-2** e **D-USR-5**)*. ⚠️ **A tabela acima fica
como está**: ela é o contrato planejado em 29/09/2026. O que a medição de 03/10/2026 no repositório
acrescenta:

| Ação | Arquivo | Usa a chave privilegiada? | Quem pode |
|---|---|---|---|
| `cadastrarUsuario` | `lib/acoes/usuarios.ts` | **SIM** — `auth.admin.createUser()` | Admin |
| `concluirObrigacaoDeTrocarSenha` | `lib/acoes/usuarios.ts` | **SIM** | a própria sessão, e **só ela** |

⚠️ **`cadastrarUsuario` É O CAMINHO ÚNICO DE CRIAÇÃO DE CONTA, e ela substituiu `convidar`**: o
**convite por e-mail foi permanentemente removido** (D-USR-1) e **não há envio de e-mail em lugar
nenhum** do repositório. A senha temporária é **gerada no servidor**, devolvida **uma vez** e **não vai
para coluna, log nem endereço** (D-USR-2).

⚠️ **`concluirObrigacaoDeTrocarSenha` NÃO RECEBE PARÂMETRO, e é a ausência que a autoriza** — Server
Action é endpoint HTTP de fato, e um `authUserId` por parâmetro deixaria qualquer sessão limpar a
obrigação de qualquer conta.

⚠️ **E `editarConta` virou DUAS gravações, não uma:** `editarNomeDeConta` e `editarPerfilEEscopo`, as
duas em `lib/acoes/usuarios.ts`, **sem** a chave privilegiada. A divisão é da **trilha de auditoria** —
`editar_nome` e `editar_perfil` são ações distintas em `auditoria_de_conta` —, e um botão só mandaria
sempre as duas, fazendo toda correção de grafia de nome registrar troca de perfil.

⚠️ **As QUATRO que usam a chave privilegiada moram em `lib/acoes/usuarios.ts`, e isso não é
arrumação.** ⚠️ *(Registro anterior, vencido: "As **duas** que usam a chave privilegiada…".)* A regra
ESLint `no-restricted-imports` tem `ignores` de **exatamente dois** arquivos — medido em
`eslint.config.mjs` em 03/10/2026, ainda **dois** —; pôr a ação noutro arquivo exigiria **abrir um
terceiro furo na regra**. Mantê-las ali preserva a defesa como está, e é por isso que as duas de cima
não foram para `perfil.ts`.

⚠️ **Toda uma delas confere o Admin NO SERVIDOR**, pelo `exigirAdmin()` que já existe — nunca por
esconder botão. Esconder é para não oferecer o impossível; a decisão é do servidor.

---

## 3. A tradução das recusas

Estende `lib/acoes/traducao-de-recusas.ts`. A chave é o `SQLSTATE` mais a dica da exceção.

| Situação | Onde nasce | `SQLSTATE` | Discriminador | Frase na tela |
|---|---|---|---|---|
| último admin | `app.impedir_remocao_do_ultimo_admin()` — **já existe** | `42501` | a mensagem do gatilho | *"Esta é a última conta Admin ativa. Promova outro Admin antes."* |
| autoescalonamento | `app.impedir_autoescalonamento()` — **já existe** | `42501` | idem | *"Mudar perfil, escopo ou situação exige o perfil Admin."* |
| excluir conta com dependente | `app.excluir_conta` | `23503` | `hint = 'conta_com_historico'`, `DETAIL` com a lista | *"Esta conta tem histórico — desative em vez de excluir."* + os impedimentos traduzidos |
| excluir sem permissão | idem | `42501` | — | *"Você não tem permissão para excluir contas."* |
| código de confirmação errado | idem | `22023` | `hint = 'codigo_nao_confere'` | *"O código digitado não confere."* |
| reescrever a trilha | `app.auditoria_de_conta_imutavel()` | `42501` | `hint = 'auditoria_imutavel'` | *"O rastro de auditoria não pode ser alterado."* |
| foto acima de 2 MB | o **motor de Storage** | — | resposta do próprio Storage | *"A foto precisa ter até 2 MB."* |
| foto de tipo não aceito | idem | — | idem | *"A foto precisa ser JPG ou PNG."* |
| senha fraca | o servidor de autenticação | `422` / `weak_password` | — | a frase da política, vinda de `lib/dominio/politica-de-senha.ts` |

⚠️ **As duas de foto vêm do motor, e é isso que as torna confiáveis.** Com o limite no bucket
(`file_size_limit`, `allowed_mime_types`), a recusa do servidor existe mesmo que a conferência do
código seja apagada um dia.

⚠️ **EMENDADO em 03/10/2026 — DUAS LINHAS DESTA TABELA DEIXARAM DE EXISTIR** *(decisões de Bernardo
Villas Boas, **D-USR-3** e **D-USR-4**)*. ⚠️ **A tabela acima fica como está**, como contrato planejado
em 29/09/2026; estas são as duas linhas que a decisão desfez, e **o que as substitui**:

| Linha de 29/09/2026 | O que valeu a partir de 03/10/2026 |
|---|---|
| *excluir conta com dependente* → `23503`, `hint = 'conta_com_historico'`, frase *"Esta conta tem histórico — desative em vez de excluir."* | **Não há mais essa recusa** (D-USR-3). Ter histórico **não impede**: o banco usa os dependentes para **escolher o caminho** — `apagada` ou `anonimizada` —, não para recusar. Medido em 03/10/2026: `conta_com_historico` **não existe** em `lib/acoes/traducao-de-recusas.ts` nem na migration `20261003000205_exclusao_de_conta.sql` |
| *código de confirmação errado* → `22023`, `hint = 'codigo_nao_confere'`, frase *"O código digitado não confere."* | **Não há código a digitar** na exclusão de conta (D-USR-4). `public.excluir_conta(p_conta_id uuid)` recebe **só o alvo**, e `esquemaDeExclusao` tem **um** campo. ⚠️ **O `codigo_nao_confere` CONTINUA EXISTINDO, e não deve ser apagado**: ele é de **disciplina e UE**, na migration `20260925135044_exclusao_com_rastro.sql`, que seguem pedindo o código |

**E as recusas que a exclusão de conta de fato dá hoje** — medidas na migration
`20261003000205_exclusao_de_conta.sql` e em `lib/acoes/traducao-de-recusas.ts`, todas com `hint`
nomeado e frase em português:

| Situação | `SQLSTATE` | `hint` |
|---|---|---|
| sem sessão | `42501` | `conta_sem_sessao` |
| sem perfil Admin | `42501` | `conta_sem_permissao` |
| a **própria** conta | `42501` | `conta_propria` |
| o **último Admin ativo** | `42501` | `ultimo_admin` |
| conta que não existe mais | `23503` | `conta_inexistente` |
| conta **já excluída** | `23505` | `conta_ja_excluida` |

⚠️ **O discriminador é o `hint`, nunca o texto da mensagem** — casar por trecho de frase quebra em
silêncio na primeira reescrita, devolvendo o texto genérico, que é o modo de falha mais difícil de
notar.

---

## 4. Confirmação antes de salvar

Estende `lib/dominio/confirmacao-de-gravacao.ts`, a lista **fechada** que já existe.

| Tipo novo | Quando |
|---|---|
| `excluir_conta` | sempre — permanente, com **código digitado** e alerta (D-B1) |
| `redefinir_senha` | sempre — **derruba todas as sessões** daquela pessoa (`FR-038`) |
| `desativar_conta` | sempre |
| `rebaixar_admin` | quando o perfil sai de `admin` |

⚠️ **`redefinir_senha` entra na lista por causa da D-4.** Antes da decisão, redefinir era discreto;
agora ele **derruba a pessoa de onde ela estiver**, e uma ação com esse efeito não acontece sem
confirmação.

⚠️ **EMENDADO em 03/10/2026, E A EMENDA TEM DUAS METADES — UMA DE DECISÃO, OUTRA DE MEDIÇÃO.**

**(1) A de decisão: a confirmação da exclusão de conta é SIMPLES, sem campo para digitar**
*(Bernardo Villas Boas, **D-USR-4**)*. ⚠️ *(Registro anterior, vencido: "`excluir_conta` | sempre —
permanente, com **código digitado** e alerta (D-B1)".)* A analogia com as **três** exclusões
permanentes do domínio acadêmico — instrutor, disciplina e UE, que pedem o **código do registro** — foi
**recusada**: aqui o cartão **nomeia a conta e o e-mail dentro da própria pergunta**, e é a pergunta que
a pessoa lê antes de clicar. ⚠️ **O rótulo é «Excluir», não «Excluir permanentemente»**, e **as outras
três seguem com o rótulo longo e o código digitado** — a divergência é **escolhida**, não descuido.

**(2) A de medição: as quatro confirmações NÃO estenderam `lib/dominio/confirmacao-de-gravacao.ts`.**
Medido em 03/10/2026: `TIPOS_DE_GRAVACAO` tem **18** valores e **nenhum** deles é `excluir_conta`,
`redefinir_senha`, `desativar_conta` ou `rebaixar_admin`; e nada sob `app/(app)/admin/usuarios/`
importa `confirmacaoDaGravacao`. As confirmações são montadas na **folha**, com o componente
`DialogoConfirmacao` — três na linha da lista (*Redefinir senha*, *Desativar*, *Excluir*) e duas na
página da conta. ⚠️ **`reativar` é o único que não pergunta nada, porque é o desfazer de outro**, e
**não há confirmação de `rebaixar_admin`**: quem barra o rebaixamento do último Admin é o **banco**,
pelo gatilho, com a recusa traduzida — e essa é a defesa que vale, porque não depende da tela.

---

## 5. O que a porta de entrada passa a conferir

Em `lib/supabase/middleware.ts`, na `renovarSessao`, que **já chama `auth.getUser()`**:

1. Sem sessão e rota fechada → entrada, como hoje.
2. **Com sessão e com a obrigação de trocar senha**, em rota que **não** é `/perfil/senha` nem rota
   aberta → **`/perfil/senha`**.
3. Sem obrigação → segue.

⚠️ **Custo zero de ida ao servidor**: a marca vem na **mesma resposta** de `auth.getUser()` que já
acontece a cada requisição.

⚠️ **As rotas abertas continuam abertas** (D-8) — incluindo a saída. Bloquear tudo menos a tela de
senha criaria um beco para quem entrou na conta errada.

⚠️ **E AS ROTAS ABERTAS PASSARAM DE CINCO A TRÊS em 03/10/2026** *(decisão de Bernardo Villas Boas,
**D-USR-1**)*. Medido em `lib/supabase/middleware.ts`: `SEM_SESSAO` é **`/login`,
`/sem-configuracao` e `/estilo`**. `/convite` e `/recuperar-senha` **foram apagadas** com o fluxo de
convite — *rota aberta sem página é superfície de autenticação exposta para nada* —, e a **D-8 não
muda com isso**: o que a sustenta é a **saída** continuar alcançável, e `/login` está entre as três.

---

## 6. O menu do avatar

| Item | Vai para |
|---|---|
| a identificação (nome e e-mail) | — só leitura, para saber com quem se está |
| **Meu perfil** | `/perfil` |
| **Sair** | encerra a sessão e leva à entrada |

⚠️ **O perfil aparece em português** (`FR-005`), pelos **nove** valores, e a tradução é a mesma que
a `/admin/usuarios` e a `/perfil` usam — **um** módulo, não três cópias.
