# Contrato — sessão, rotas e a exceção declarada ao `RN-DEG-01`

**Fase 1** · 08/09/2026 · fonte: spec FR-004 a FR-005.2 · documento 24 §Estrutura

## Os dois grupos de rota

| Grupo | Exige sessão? | Rotas |
|---|---|---|
| `(auth)` | **Não** | `/login` · `/convite/[token]` · `/recuperar-senha` |
| `(app)` | **Sim** | `/admin/usuarios` · `/admin/permissoes` · tudo dos épicos 5 a 13 |

⚠️ **A separação não é organizacional, é funcional.** Se `/login` ficasse sob o middleware que
exige sessão, seria preciso ter sessão para obter sessão. É o laço que produz redirecionamento
infinito, e ele não aparece em `tsc` — aparece no navegador do usuário.

## Invariantes

- **C-1 — Rota de `(app)` sem sessão redireciona ao login preservando o destino.** Quem clicou num
  link para a tela X volta para X depois de entrar, e não para a raiz.
- **C-2 — `getUser()`, nunca `getSession()`.** `getUser()` valida o token contra o servidor de
  autenticação; `getSession()` confia no cookie, que o usuário controla. Já está escrito assim em
  `lib/supabase/middleware.ts`, e a razão está no cabeçalho do arquivo.
- **C-3 — O objeto de resposta devolvido é o MESMO em que os cookies foram gravados.** Criar outro
  depois descarta a renovação e a sessão expira em silêncio no meio do trabalho.
- **C-4 — Nada de perfil em cache.** Perfil, escopo e permissão são lidos do banco a cada
  requisição. É o que faz a desativação valer na requisição seguinte (R-2). Guardá-los em cookie
  ou em memória do servidor manteria a pessoa alcançando o que já lhe foi tirado.

## A exceção declarada ao `RN-DEG-01`

**Hoje** (`lib/supabase/middleware.ts`, linhas 23-25):

```
// RN-DEG-01: sem configuração, o middleware sai de lado em vez de derrubar toda requisição.
if (conferirAmbiente().length > 0) return resposta;
```

**A partir desta fatia**, esse caminho passa a **negar** o acesso à rota de `(app)`.

⚠️ **Por que o princípio se inverte aqui, e só aqui.** O `RN-DEG-01` existe para que dependência
ausente devolva vazio com aviso em vez de exceção não tratada — protege o usuário de tela quebrada.
Numa fronteira de autenticação, "seguir em frente com aviso" significa **rota protegida aberta**:
uma variável de ambiente faltando passaria a abrir o sistema inteiro. O princípio protege a tela;
aqui ele abriria a porta.

**A degradação continua existindo, e continua segura** — muda o destino: em vez de seguir, a
requisição vai para uma tela que diz **o que falta configurar**, sem expor valor de configuração.

| Situação | Grupo `(auth)` | Grupo `(app)` |
|---|---|---|
| Ambiente configurado, com sessão | segue | segue |
| Ambiente configurado, sem sessão | segue | 🛑 redireciona ao login, guardando o destino |
| **Ambiente não configurado** | segue (a tela informa) | 🛑 **nega**, e informa o que falta |

## O que a verificação tem de provar

| # | Cenário | Esperado |
|---|---|---|
| S-1 | `/admin/usuarios` sem sessão | 🛑 redireciona a `/login`, com o destino preservado |
| S-2 | `/login` sem sessão | ✅ abre |
| S-3 | Sessão válida em `(app)` | ✅ abre, e o token é renovado |
| S-4 | **Sem variável de ambiente**, rota de `(app)` | 🛑 **nega** — é o FR-005.1, e é o teste que impede a regressão |
| S-5 | Sessão de conta desativada | 🛑 alcance zero na requisição seguinte |
