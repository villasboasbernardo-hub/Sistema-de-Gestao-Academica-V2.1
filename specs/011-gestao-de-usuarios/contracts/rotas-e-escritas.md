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

**Não há rota nova de administração**: as ações da US5 e da US6 entram na `/admin/usuarios`, que já
existe e já é alcançável por clique.

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

⚠️ **As duas que usam a chave privilegiada moram em `lib/acoes/usuarios.ts`, e isso não é
arrumação.** A regra ESLint `no-restricted-imports` tem `ignores` de **exatamente dois** arquivos;
pôr a ação noutro arquivo exigiria **abrir um terceiro furo na regra**. Mantê-las ali preserva a
defesa como está.

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

---

## 6. O menu do avatar

| Item | Vai para |
|---|---|
| a identificação (nome e e-mail) | — só leitura, para saber com quem se está |
| **Meu perfil** | `/perfil` |
| **Sair** | encerra a sessão e leva à entrada |

⚠️ **O perfil aparece em português** (`FR-005`), pelos **nove** valores, e a tradução é a mesma que
a `/admin/usuarios` e a `/perfil` usam — **um** módulo, não três cópias.
