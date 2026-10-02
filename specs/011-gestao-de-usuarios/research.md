# Research — spec 011, gestão de usuários

**Fase 0 do plano.** Cada item é uma pergunta que o plano precisava responder **medindo**, não
supondo. Todas foram medidas em **29/09/2026**, contra o stack local, e **três delas mudaram o
desenho** — duas eliminando trabalho que eu teria pedido, e uma eliminando um caminho impossível.

---

## R-1 — Como derrubar todas as sessões de uma conta? *(decide a `FR-038`)*

**Decisão: não é preciso fazer nada além de redefinir a senha. `admin.updateUserById(id, { password })`
já revoga todas as sessões abertas.**

**Como foi medido.** Uma conta descartável, **duas** sessões abertas (dois navegadores), a senha
redefinida pelo Admin, e os dois *refresh tokens* testados depois:

| O quê | Antes | Depois da redefinição |
|---|---|---|
| refresh tokens não revogados no banco | **2** | **0** |
| sessão 1 renova? | sim | **não** — `Invalid Refresh Token: Refresh Token Not Found` |
| sessão 2 renova? | sim | **não** — idem |

⚠️ **Isto elimina um passo inteiro do plano.** Eu teria pedido um mecanismo de revogação explícita, e
ele seria trabalho sem efeito: a plataforma já faz.

**Alternativas medidas e descartadas:**

- **`admin.signOut(jwt, scope)`** — **impossível aqui**: a assinatura exige *"a valid, logged-in
  JWT"*, isto é, o token **do próprio usuário**. O Admin não o tem, e não há como obtê-lo sem
  entrar na conta alheia.
- **Revogar por SQL em `auth.refresh_tokens`** — **não funciona, e não seria permitido**. Medido: o
  `update … set revoked = true` rodou **como superusuário do contêiner** e a sessão **continuou
  renovando** — o servidor de autenticação não decide só por essa coluna. E a `service_role`
  **não tem privilégio** de `UPDATE` em `auth.refresh_tokens` nem de `DELETE` em `auth.sessions`
  (medido: `f` nos dois). Duplamente descartado.
- **Banir por `ban_duration` e desbanir** — **funciona** (`Invalid Refresh Token: User Banned`), mas
  é um estado a mais para administrar e um caminho a mais para errar, resolvendo um problema que a
  redefinição já resolve.

⚠️ **O que continua valendo, e é importante para o teste**: o *access token* é um JWT e vale **até
expirar**, sem consultar nada. "Sessão derrubada" significa que a **renovação** para de funcionar.
O `SC-011` MUST medir a renovação, não a leitura imediata — medir a leitura logo depois passaria
mesmo com a revogação funcionando.

---

## R-2 — Avatar e menu exigem pacote novo? *(decide a restrição "nenhuma biblioteca nova")*

**Decisão: não. O pacote `radix-ui` já instalado exporta os dois.**

**Medido**, importando o pacote: `Avatar` → **sim**; `DropdownMenu` → **sim**; `Popover` e `Dialog`
→ sim (já em uso).

É o mesmo achado da fatia (b) do Épico 4, onde sete dos dez primitivos já vinham do pacote agregado.
Os arquivos de `components/ui/avatar.tsx` e `components/ui/dropdown-menu.tsx` entram **copiados no
padrão do shadcn e versionados**, como manda o BRIEF — o que não entra é dependência nova no
`package.json`.

---

## R-3 — Onde mora o limite de 2 MB e de JPG/PNG? *(decide a `FR-013`)*

**Decisão: no próprio bucket, além do código. `storage.buckets` tem `file_size_limit` e
`allowed_mime_types`.**

**Medido**: hoje há **zero** buckets, **zero** policies em `storage.objects`, e a RLS dessa tabela
está **ligada** — ou seja, hoje nada entra e nada sai por Storage, que é o padrão intencional do
projeto (tabela sem policy é inacessível de propósito). As colunas de `storage.buckets` incluem
`public`, `file_size_limit` e `allowed_mime_types`, e uma migration, rodando como dona, **pode**
inseri-lo (medido: `true`).

⚠️ **Isto torna a garantia do servidor ESTRUTURAL, e não mais uma conferência que alguém escreve e
esquece.** A `FR-013` pede recusa nos dois lados; com o limite no bucket, o segundo lado é o motor.
A conferência no código continua, para dar mensagem em português — mas ela deixa de ser a única.

---

## R-4 — Onde mora a obrigação de trocar senha? *(decide a `FR-035` e a `FR-036`)*

**Decisão: em `app_metadata` da credencial, escrito só pelo servidor, lido na porta que já existe.**

**Por que não em `public.usuarios`**: a obrigação acompanha a **credencial**, não o cadastro. Uma
conta sem credencial não pode estar obrigada a trocar senha, e `usuarios` existe antes da credencial
— a janela do convite. Guardá-la ali criaria um estado impossível de representar.

**Por que `app_metadata` e não `user_metadata`**: `user_metadata` é **escrito pelo próprio usuário**
e viaja no token; `app_metadata` só a chave privilegiada escreve. Uma marca que o próprio obrigado
pudesse apagar não é obrigação.

⚠️ **Tensão declarada com uma decisão existente.** `lib/autorizacao/sessao.ts` diz *"nada de perfil
em cache"* — o perfil é resolvido a cada requisição para que a desativação valha na seguinte. A
obrigação de trocar senha é **diferente em espécie**: ela só muda quando **a própria pessoa** a
resolve, e a resolução acontece no mesmo lugar que a escreve. Não há terceiro que a mude pelas
costas, então não há o problema que a regra do perfil evita.

⚠️ **E o arquivo é `proxy.ts`, não `middleware.ts`** — o Next 16 depreciou a convenção e o
`next build` **recusa os dois juntos**. A lógica vive em `lib/supabase/middleware.ts`, na
`renovarSessao`, que **já chama `auth.getUser()`** a cada requisição. A marca vem nessa mesma
resposta: **zero ida a mais ao servidor**.

---

## R-5 — A trilha de auditoria: tabela nova, e por quê

**Decisão: tabela nova, `auditoria_de_conta`, com quatro colunas de conteúdo — autor, ação, conta
alvo e quando (D-2).**

**Por que não reusar `exclusoes_registradas`**: o `CHECK` dela aceita
`('instrutores','disciplinas','unidades_ensino')` e **não** aceita contas. Mais fundo que isso: ela é
de **exclusões**, e quatro das cinco ações desta fatia não são exclusão. Redefinir senha **não
altera linha nenhuma** de `usuarios`.

**Por que o quarteto de auditoria não basta** — e é o ponto que mais engana: `editado_por` e
`editado_em` guardam **o último** autor, não o histórico; e a redefinição de senha **nem os move**,
porque acontece inteiramente do lado da credencial.

**O molde é o que já funciona**: append-only por gatilho de linha **e** de comando, `revoke` de
escrita para todos os papéis, gravação só por função `SECURITY DEFINER`, e leitura por
`app.pode('auditoria','ler')` — o mesmo desenho de `exclusoes_registradas`, que já resiste inclusive
à `service_role`.

⚠️ **A exclusão de conta grava nos DOIS**: a trilha responde *"quem excluiu a conta de quem"*, e o
retrato do que foi apagado vai para `exclusoes_registradas`, cujo `CHECK` precisa passar a aceitar
`usuarios`. São dois fatos diferentes sobre o mesmo evento.

---

## R-6 — Reativar sem tocar a matriz

**Decisão: reativar usa `usuarios.desativar`, a permissão que já existe para o inverso (D-6).**

`supabase/tests/103_permissoes.sql` prova hoje, por `is_empty`, que a matriz tem **zero** ações
`reativar`. A asserção **fica intacta** e nenhuma linha entra na matriz.

⚠️ **O nome fica estranho e a alternativa era pior.** Chamar de "desativar" a permissão que reativa
soa errado; criar uma ação nova quebraria uma asserção escrita justamente para impedir que a matriz
cresça sem decisão. A permissão é *"mexer na situação da conta"*, e o nome dela é histórico.

---

## R-7 — A senha gerada, sem biblioteca

**Decisão: `crypto.randomInt` da biblioteca padrão do Node, sobre um alfabeto sem caracteres
ambíguos.**

- **Sem biblioteca nova**, como manda a restrição.
- **`randomInt`, não `Math.random`**: geração previsível de senha é falha de segurança, não de
  estilo.
- **Alfabeto sem `O`/`0`, `l`/`1`/`I`**: a senha vai ser **lida em voz alta ou copiada da tela**, e
  ambiguidade vira chamado de suporte.
- **Comprimento acima do mínimo da plataforma**, que é 12 e é conferido pelo servidor de
  autenticação (já provado por `politica-de-senha.test.ts`). Nascer no limite é nascer a um caractere
  de falhar.

⚠️ **A senha MUST NOT ser registrada em lugar nenhum** — nem em log, nem em endereço, nem em
`revalidatePath`. Ela existe na resposta da Server Action e na tela, uma vez.

---

## R-8 — A recusa de exclusão, e onde ela decide

**Decisão: a decisão é do banco, numa função com porteiro, no molde já usado para instrutor e
disciplina (D-B1).**

Os **quatro** impedimentos (D-5), cada um consultado no banco: credencial já usada, vínculo de
curso, ficha de instrutor vinculada, e ter criado ou editado qualquer registro.

⚠️ **O quarto é o mais caro e o mais importante.** O quarteto de auditoria aponta para a conta em
**21 ou mais tabelas**; a função precisa varrer o catálogo, não uma lista escrita à mão — lista à mão
envelhece a cada tabela nova e passa a permitir exclusão que deveria recusar.

⚠️ **E há uma armadilha medida na fatia (b)**: a RPC de exclusão e a de impedimentos têm **cada uma o
seu porteiro**, e é isso que faz o defeito deliberado precisar cair nas duas. O mesmo desenho vale
aqui.

---

## R-9 — O que já existe e NÃO se refaz

Do `estado-atual.md`, para o plano não pedir o que está pronto:

| Já existe | Consequência para o plano |
|---|---|
| `encerrarSessao()` em `lib/acoes/sessao.ts` | a US1 é **ligar**, não escrever |
| `editarPerfilEEscopo()` em `lib/acoes/usuarios.ts` | a US5 é **alcançar**, não escrever |
| `desativar()` | a US6 reusa; falta só reativar |
| os três gatilhos de `usuarios` | nenhuma regra de banco nova sobre perfil/escopo/situação |
| `app.eh_admin()`, `app.pode()`, `app.usuario_atual()` | nenhuma função de autorização nova |
| `renovarSessao` já chama `auth.getUser()` | a marca de troca obrigatória custa **zero** ida a mais |
| as 3 defesas do `service_role`, com `ignores` de dois arquivos | ⚠️ toda Server Action nova que use a chave **tem** de entrar no `ignores` do ESLint, **ou** viver dentro de `lib/acoes/usuarios.ts` |

---

## R-10 — O que o `lib/dominio/` recebe

Quatro módulos puros, sem banco, sem framework, sem interface:

| Módulo | Regra | Por que é puro |
|---|---|---|
| `iniciais-do-nome.ts` | as iniciais do avatar | só texto entra, só texto sai |
| `politica-de-senha.ts` | o que é senha aceitável, e a **explicação** da regra | a tela mostra a regra antes de errar; o servidor confere a mesma |
| `ultimo-admin.ts` | pode rebaixar, desativar ou excluir esta conta? | recebe a **lista** de admins ativos e o alvo; não consulta nada |
| `impedimentos-de-conta.ts` | os rótulos dos quatro impedimentos, e a frase da recusa | recebe as chaves que o banco devolve |

⚠️ **`ultimo-admin.ts` existe porque HOJE há duas afirmações de que a regra está no código e nenhuma
implementação** (`estado-atual.md` §3.1). Ele **não substitui** o gatilho: o gatilho é a garantia, e
o módulo é o que permite **não oferecer** a ação na tela em vez de oferecê-la para o banco recusar.
