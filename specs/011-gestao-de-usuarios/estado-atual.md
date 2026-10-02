# Estado atual — auth, usuários, perfis, convite e RLS

**Medido em 29/09/2026**, no commit `de1f1ac` da `main`, por varredura do repositório. Este
documento é o **retrato de antes**: ele não propõe nada. A spec ao lado só pode exigir o que aqui
não existe, e só pode preservar o que aqui existe.

⚠️ **Ele foi escrito ANTES da spec, de propósito.** Especificar de memória sobre uma base de 45
migrations e nove perfis produz requisito que manda construir o que já está construído — ou pior,
que manda mudar o que não pode mudar. Três afirmações que eu teria escrito de cabeça estão erradas,
e estão corrigidas abaixo.

---

## 1. O que JÁ existe, e funciona

### 1.1 Autenticação

| O quê | Onde |
|---|---|
| Login por e-mail e senha | `app/(auth)/login/` — o formulário é folha de cliente e chama `signInWithPassword` no navegador |
| Convite por e-mail, com o token no **fragmento** da URL | `app/(auth)/convite/` — não há rota de callback; `FormularioDeSenha` lê `window.location.hash` e chama `setSession` |
| Recuperação de senha por e-mail | `app/(auth)/recuperar-senha/` — resposta **idêntica** exista ou não a conta |
| Renovação de sessão e porta de entrada | `proxy.ts` na raiz → `lib/supabase/middleware.ts`, função `renovarSessao` |
| Segunda camada de guarda | `app/(app)/layout.tsx` — `usuarioDaSessao()` e `redirect("/login")` |

⚠️ **O arquivo é `proxy.ts`, NÃO `middleware.ts`.** O Next 16 depreciou a convenção e o `next build`
**recusa os dois juntos**. Qualquer requisito que fale em "middleware" nesta fatia significa
`lib/supabase/middleware.ts`, chamado por `proxy.ts`.

### 1.2 Perfis e permissões

- O enum `public.perfil_usuario` tem **NOVE** valores: `admin`, `chefe_departamento_ensino`,
  `encarregado_administracao_academica`, `ajudante_administracao_academica`,
  `encarregado_orientacao_pedagogica`, `ajudante_orientacao_pedagogica`, `operador`,
  `encarregado_curso`, `visualizacao`.
- A matriz `perfil_permissao` é **dado**, com 152+ linhas semeadas, e a tela `/admin/permissoes` é
  **somente leitura**.
- Sobre `usuarios`: **quatro** perfis leem todas as linhas (`admin`, `chefe_departamento_ensino`,
  `encarregado_administracao_academica`, `ajudante_administracao_academica`); os outros cinco leem
  **só a própria**. Escrita ampla: **só `admin`**, e a policy usa `app.eh_admin()` diretamente, não
  a matriz — porque a matriz não pode ser autoridade sobre quem edita a matriz.

### 1.3 As três defesas do `service_role`, todas reais

1. `import "server-only";` é a **primeira linha** de `lib/supabase/admin.ts`.
2. `SUPABASE_SERVICE_ROLE_KEY` sem prefixo `NEXT_PUBLIC_`.
3. Regra ESLint `no-restricted-imports`, com `ignores` de **exatamente dois** arquivos:
   `lib/supabase/admin.ts` e `lib/acoes/usuarios.ts`.

**Consumidor de produção hoje: um só** — `lib/acoes/usuarios.ts`, em três chamadas (`convidar`,
`reenviarConvite`, `recuperarSenha`).

### 1.4 Os gatilhos que já protegem `usuarios`

| Gatilho | O que faz |
|---|---|
| `trg_usuarios_auditoria` → `app.set_auditoria()` | carimba o quarteto; no UPDATE **força `criado_em`/`criado_por` de volta ao valor antigo** e reescreve `editado_*` com `app.uid_atual()` — nunca aceita o que a aplicação mandou |
| `trg_usuarios_impedir_autoescalonamento` | recusa `42501` se `perfil`, `escopo_curso` **ou** `status` mudarem sem ser admin. ⚠️ `ultimo_acesso` **não** está na lista, e é isso que deixa `registrarAcesso()` funcionar |
| `trg_usuarios_ultimo_admin` → `app.impedir_remocao_do_ultimo_admin()` | recusa `42501` ao rebaixar ou desativar o **último** admin ativo |

⚠️ **O gatilho do último admin NÃO roda no INSERT e NÃO impede DELETE.** Não impedir DELETE é
deliberado: DELETE já é impossível em toda tabela (`revoke delete` + zero policies).

### 1.5 Testes que já cobrem o assunto

- `tests/invariantes/rls/rls.test.ts` — 1.662 linhas, sessões reais dos nove perfis. Cobre o
  **escalonamento de privilégio** (T-05), a **desativação valendo na requisição seguinte** (T-11), o
  carimbo de autoria vindo da sessão (FR-029) e o recorte de leitura e escrita por perfil (SC-004).
- `tests/invariantes/rls/politica-de-senha.test.ts` — o mínimo de 12 caracteres é **da plataforma**,
  provado pelo caminho que a tela usa.
- `tests/e2e/convite.spec.ts` — o percurso inteiro com **e-mail real interceptado no Mailpit**.
- `supabase/tests/103_permissoes.sql` — a matriz, com dois negativos de catálogo.

---

## 2. O que NÃO existe — e é o que esta fatia vem construir

| # | Não existe | Evidência |
|---|---|---|
| 1 | **Botão de sair na interface** | `encerrarSessao()` está em `lib/acoes/sessao.ts:40` e **não tem um único consumidor** — o `grep` só acha a definição e uma menção na spec 004 |
| 2 | **Tela de perfil do próprio usuário** | nenhuma rota `perfil`, `conta` ou equivalente. `usuarios.nome_exibicao` é **lida** e nunca escrita |
| 3 | **Tela de troca de senha para quem já está logado** | o único caminho é o link de e-mail (convite ou recuperação) |
| 4 | **Componente Avatar** | `components/ui/` tem 14 arquivos e nenhum é `avatar.tsx` nem `dropdown-menu.tsx` |
| 5 | **Menu de usuário no cabeçalho** | `components/casca/cabecalho-do-app.tsx` mostra **uma linha de texto**: `{nome} · {perfil}`. Nada clicável |
| 6 | **Bucket de Storage** | `supabase/config.toml` tem o bloco de buckets **inteiramente comentado**; `grep storage` em `supabase/migrations/` devolve **zero** |
| 7 | **Regra de "último admin" em TypeScript** | só o gatilho PL/pgSQL. `lib/dominio/` tem 35 módulos e **nenhum** é de usuário, perfil, permissão ou senha |
| 8 | **Uso de `app_metadata` ou `user_metadata`** | `grep` no repositório inteiro: **zero ocorrências** |
| 9 | **Edição de perfil pela tela** | `editarPerfilEEscopo` existe em `lib/acoes/usuarios.ts` e **nenhum componente a importa** |
| 10 | **Reativação de conta pela tela** | não há botão, e a matriz tem **zero** ações `reativar` — provado por `103_permissoes.sql` |
| 11 | **Rastro de ação administrativa sobre usuário** | `exclusoes_registradas` existe, mas o CHECK dela limita a `('instrutores','disciplinas','unidades_ensino')` — **`usuarios` não cabe ali hoje** |
| 12 | **pgTAP dedicado a `usuarios`** | nenhum arquivo cobre a tabela nem os seus três gatilhos |

---

## 3. Três divergências entre comentário e código, medidas

⚠️ **As três foram encontradas no levantamento, e nenhuma é corrigida por esta spec** — elas ficam
registradas porque um requisito escrito em cima de um comentário errado nasce errado.

1. **A "conferência do último admin na Server Action" não existe.**
   `app/(app)/admin/usuarios/AcoesDeUsuario.tsx` e o cabeçalho de `desativar()` afirmam que há uma
   conferência de cortesia antes de chamar o banco. **Não há**: `desativar()` faz validação, checa
   admin e manda o `update`. A única proteção é o gatilho.
   ⚠️ **Isto importa para esta fatia**: a restrição *"sempre ≥ 1 admin ativo"* precisa de regra em
   `lib/dominio/`, e hoje o que existe é um comentário dizendo que ela já está lá.

2. **`ultimo_acesso` não é escrito pelo middleware.**
   O comentário da coluna diz *"Registrado pelo middleware a cada sessão validada"*; na verdade é a
   Server Action `registrarAcesso()`, chamada **uma vez no login**.

3. **`supabase.rpc("eh_admin")` sempre erra.**
   O PostgREST não expõe o schema `app`, então a chamada em `exigirAdmin()` falha e **o caminho real
   é o fallback**, que lê a própria linha de `usuarios`. Funciona, mas quem lê o código acredita que
   a RPC é o caminho.

---

## 4. O que esta fatia NÃO pode quebrar

- **O perfil não vai para o token.** `lib/autorizacao/sessao.ts` declara *"nada de perfil em cache"*,
  e `app.usuario_atual()` filtra por `status = 'ativo'` — é isso que faz a desativação valer na
  requisição seguinte, coberto por T-11.
- **A ordem do convite**: grava em `usuarios` **antes** de chamar o Auth, e `auth_user_id` fica nulo
  até a pessoa definir a senha, quando `vincular_credencial()` fecha o espelho. A função **não
  recebe o e-mail por parâmetro**, de propósito — parâmetro a transformaria em tomada de conta.
- **Nada é apagado** (regra 4), exceto pela exceção nominal e delimitada da D-B1.
- **`lib/dominio/` não importa `supabase`, `next` nem `react`** — imposto por ESLint.
