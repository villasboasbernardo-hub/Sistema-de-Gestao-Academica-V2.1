# Plano de implementação: Épico 3 — Auth por convite, gestão de usuários e RBAC

**Ramo**: `feat/EPICO-3-auth-convite-e-rbac` · **Data**: 08/09/2026 ·
**Spec**: [spec.md](./spec.md) · **Pesquisa**: [research.md](./research.md)

## Sumário

Construir a **porta** de um cofre que já está trancado. O Épico 1 entregou toda a autorização no
banco — 23 funções `app.*`, 152 linhas de matriz, 77 policies, gatilho anti-escalonamento, 13
testes negativos. O Épico 2 encheu esse banco com 5.394 linhas de dado real. Falta o caminho pelo
qual uma pessoa entra e exerce o que a matriz lhe permite.

A fatia entrega **cinco telas**, o fluxo de convite, a sessão, a recuperação de senha, e **duas**
migrations: o recorte por coluna do dado pessoal de instrutor — dívida registrada no cabeçalho da
migration que criou aquelas colunas, para ser paga aqui — e o gatilho que protege o último Admin.

**Nada da autorização existente é redesenhado.** As policies, as funções e a matriz são consumidas
como estão.

## Contexto técnico

**Linguagem**: TypeScript `strict`, React 19, Next.js 16.3.3 (App Router)
**Dependências principais**: `@supabase/ssr` (servidor), `@supabase/supabase-js` (cliente), Zod
**Armazenamento**: Supabase PostgreSQL **17.6** — schema completo, 27 tabelas, 10 views
**Testes**: Vitest (unidade + RLS com sessão autenticada) · pgTAP (invariantes) · Playwright (e2e)
**Plataforma alvo**: Vercel, preview por branch. ⚠️ **Não existe projeto de produção** — o
`cqhpfuaweoyglhtrckcp` é designado desenvolvimento/preview (FR-022.1)
**Tipo de projeto**: aplicação web, Server Components por padrão
**Metas de desempenho**: nenhuma específica. Volume real: 9 perfis, dezenas de usuários simultâneos
no máximo, matriz de 152 linhas. **Priorizar clareza sobre desempenho** (BRIEF)
**Restrições**: sem *design system* (Épico 4) · sem ORM · regra de negócio nunca só na UI
**Escala/escopo**: 5 telas · **2 migrations** · ~18 asserções negativas novas de RLS

### O que já existe e é consumido, não construído

| Peça | Estado |
|---|---|
| `app.pode(recurso, acao)`, `app.perfil_atual()`, `app.usuario_atual()`, `app.eh_admin()`, `app.cursos_do_usuario()` | ✅ no banco |
| `perfil_permissao` — 152 linhas, 9 perfis × 13 recursos | ✅ povoada por migration |
| `app.impedir_autoescalonamento` | ✅ instalado, com teste |
| `app.set_auditoria()` | ✅ instalado. ⚠️ **descarta carimbo em silêncio sem sessão** — correto no ETL, defeito numa tela (FR-027.1) |
| `lib/supabase/{server,client,middleware,admin}.ts` | ✅ do Épico 0 |
| `lib/ambiente.ts` + `app/error.tsx` | ✅ ⚠️ o middleware hoje **sai de lado** sem configuração; o FR-005.1 muda o destino da requisição, sem deixar de tratá-la |
| 13 testes de RLS com sessão autenticada | ✅ passando |

## Verificação contra a Constituição

| Princípio | Situação | Como |
|---|---|---|
| **I. Fidelidade à Fase 1** | ✅ | Cobre `RF-AUTH-01` a `RF-AUTH-11`, `RF-CRUD-04`, `RF-MIG-06`. As duas revogações (`RF-AUTH-01`/`RN-RBAC-01`, conta Google) já estavam registradas no documento 02 |
| **II. Preservação de regras** | ✅ | Nenhuma `RN-` é alterada. `RN-RBAC-02` é **consumida**, não reescrita |
| **III. Restrição de plataforma** | ✅ | Sem ORM, sem biblioteca de componentes nova, Server Actions com Zod na primeira linha |
| **IV. Integridade do histórico** | ✅ | Desativação é lógica; nenhuma coluna é removida — o recorte de PII **revoga privilégio**, não apaga dado |
| **V. Degradação segura** | ✅ | O FR-005.1 **cumpre** o princípio, não o excetua — ver *Complexidade*. E o FR-025 atende à obrigação explícita do princípio de distinguir *"não há dado"* de *"há dado que você não pode ver"* |
| **VI. Mudança validada por invariante** | ✅ | 18 asserções negativas novas + T-02, T-03, T-10; o recorte de PII foi decidido por **experimento**, não por leitura |
| **VII. Configuração sobre constante** | ✅ | `NEXT_PUBLIC_URL_APLICACAO` (FR-033); a matriz continua sendo dado; **nenhuma lista de perfis no código da aplicação** (FR-021) |
| **VIII. Rastreabilidade** | ✅ | `codigo` e `origem_migracao_v1` sobrevivem à obtenção de credencial (FR-032) |
| **IX. Contenção de escopo** | ✅ | Auth e RBAC estão na Matriz de Responsabilidades da CIAARA-11. Fora: SSO, MFA obrigatória, log de leitura, retenção |
| **X. Paridade antes de novidade** | ✅ | O recorte de PII **é paridade**, não novidade — ver *Complexidade* |
| **XI. O banco é a fronteira** | ✅ | O recorte é privilégio de banco. A ocultação na interface é cortesia e está escrita como tal (FR-020 e FR-022 separados) |

**Veredito: aprovado, sem desvio.**

## Complexidade — dois pontos que pareciam desvio, e não são

⚠️ **A primeira versão deste plano declarou dois desvios à Constituição. A análise de 08/09/2026
mostrou que nenhum dos dois é desvio**, e a correção vale ser registrada: declarar desvio falso
tem custo próprio — normaliza o desvio, e sugere emenda à Constituição onde não é preciso nenhuma.

### FR-005.1 e o Princípio V — **cumpre, não excetua**

O princípio diz: *"quando uma funcionalidade depende de um **dado que ainda não existe**, o retorno
é vazio/neutro com aviso — **nunca uma exceção não tratada**"*.

Duas coisas o afastam do caso do FR-005.1:

1. **O que falta não é dado de domínio, é configuração da fronteira de segurança.** O princípio
   fala do painel de KPIs que abre vazio porque a tabela ainda não tem linha.
2. **A resposta do FR-005.1 é tratada.** Negar a rota exibindo uma tela que diz **o que falta
   configurar** é exatamente o "vazio/neutro com aviso" que o princípio pede. Não há exceção
   estourando.

**O princípio nunca disse "deixe a requisição passar". Disse "não estoure".** O FR-005.1 não
estoura; ele muda o **destino** da requisição, e o destino é uma tela que informa.

### O recorte de PII e o Princípio X — **é paridade**

A triagem do princípio é uma pergunta: *isto é paridade ou é novidade?*

O recorte **não acrescenta função de negócio nenhuma**. Ele restaura, na plataforma nova, o
confinamento que o dado já tinha: na v2.0, CPF e endereço viviam numa planilha do Drive
institucional, alcançável por quem a Divisão autorizasse. A migração os pôs numa tabela que 6 dos 9
perfis leem. **Restaurar o confinamento é paridade de proteção**, e adiá-la seria aceitar uma perda
de proteção como preço da mudança de plataforma — que é o oposto do que o Princípio X protege.

## Estrutura do projeto

### Documentação desta fatia

```
specs/004-auth-convite-e-rbac/
├── spec.md
├── plan.md                    ← este arquivo
├── research.md                ← R-1 a R-7, com o experimento do recorte
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── convite.md                    o fluxo, os estados e o que falha
│   ├── recorte-pii.md                as três peças do R-1, e a ordem entre elas
│   ├── sessao-e-rotas.md             o middleware, os grupos de rota, o FR-005.1
│   └── conferencias-de-painel.md     o que não se garante por código
└── checklists/requirements.md ✅ 20/20
```

### Código

```
app/
├── (auth)/                        # SEM sessão — FR-025.6
│   ├── login/page.tsx
│   ├── convite/[token]/page.tsx
│   └── recuperar-senha/page.tsx
├── (app)/                         # COM sessão, atrás do middleware
│   ├── layout.tsx                 #   carrega usuário + matriz uma vez por requisição
│   └── admin/
│       ├── usuarios/page.tsx      #   FR-014
│       └── permissoes/page.tsx    #   FR-024 — LEITURA apenas
└── error.tsx · loading.tsx

middleware.ts                      # ⚠️ NÃO EXISTE HOJE. É criado aqui (FR-005)

lib/
├── autorizacao/
│   ├── matriz.ts                  # carrega perfil_permissao; expõe pode(recurso, acao)
│   └── sessao.ts                  # usuário corrente a partir do banco, NUNCA de cache
├── acoes/usuarios.ts              # Server Actions: convidar, reenviar, editar, desativar
├── validacao/usuarios.ts          # Zod
└── supabase/                      # já existe

components/ciaara/
├── SePodeVer.tsx                  # oculta por permissão — lê lib/autorizacao
└── EstadoVazio.tsx                # distingue "não há" de "você não vê" (FR-025)

supabase/
├── migrations/<ts>_recorte_dado_pessoal_instrutor.sql   # US5 — o recorte
├── migrations/<ts>_ultimo_admin_protegido.sql           # US3 — gatilho do FR-016
└── tests/092_recorte_pii.sql

tests/
├── invariantes/rls/rls.test.ts    # estendido: 9 perfis × (leitura + escrita) + T-02, T-03, T-10
└── e2e/convite.spec.ts            # FR-036
```

**Decisão de estrutura**: segue o documento 24 §Estrutura sem desvio. Os grupos `(auth)` e `(app)`
são o que faz o middleware conseguir exigir sessão sem exigir sessão para obter sessão.

## Ordem de implementação

De dentro para fora, como manda o `CLAUDE.md`:

| # | Fatia | Entrega | Prova |
|---|---|---|---|
| 1 | **Recorte de PII** | migration + 2 views | 092_recorte_pii + 6 asserções negativas |
| 2 | **Sessão e rotas** | `middleware.ts`, grupos `(auth)`/`(app)` | rota protegida sem sessão redireciona; **sem configuração, nega** |
| 3 | **Autorização na aplicação** | `lib/autorizacao/` + `SePodeVer` | ocultação e negação provadas **separadamente** |
| 4 | **Convite** | Server Action + `/convite/[token]` | e2e convite → senha → primeiro acesso |
| 5 | **Gestão de usuários** | `/admin/usuarios` + **2ª migration** (gatilho do último Admin) | desativar zera alcance na requisição seguinte |
| 6 | **Recuperação** | `/recuperar-senha` | resposta indistinguível, medida |
| 7 | **Leitura da matriz** | `/admin/permissoes` | — |
| 8 | **Teste negativo dos 9 perfis** | fixtures + tabela | 18 asserções nomeadas |
| 9 | **Conferências de painel** | valores observados, registrados | — |

⚠️ **A fatia 1 vem primeiro de propósito.** O `pnpm db:tipos` que ela exige precisa estar commitado
antes de qualquer código de tela — foi exatamente essa a omissão que o portão pegou no Épico 2.

⚠️ **São DUAS migrations nesta fatia, não uma.** A segunda saiu da decomposição: a proteção do
último Admin (FR-016) precisa de **gatilho**, porque policy não enxerga `OLD`/`NEW` e conferência
que só existe na Server Action é contornável por quem chamar a interface de dados direto. Mesmo
motivo pelo qual `app.impedir_autoescalonamento` é gatilho. Cada uma exige o seu `db:tipos`.

## Riscos

| Risco | Mitigação |
|---|---|
| **O `revoke` de coluna sem o `revoke` de tabela não protege nada** e o caminho feliz não acusa | O teste negativo entra **antes** da migration (fatia 1). É o achado do R-1 |
| `select *` em `instrutores` passa a falhar com mensagem que fala de **tabela**, não de coluna | `vw_instrutores` devolve a ergonomia; o comentário da migration explica o erro que a pessoa vai ver |
| A aplicação guardar perfil em cache e a desativação não valer | Decisão do R-2: nada de perfil em cache. Provado pelo teste que já existe |
| `service_role` vazar para o cliente na Server Action de convite | Três defesas já montadas no Épico 0: sem `NEXT_PUBLIC_`, `import "server-only"`, regra ESLint. Esta fatia é o **primeiro consumidor real** — o `next build` é quem prova |
| Convite emitido para e-mail real a partir do preview | FR-031.1: só endereço de teste nesta fatia |
| `app.set_auditoria()` descartar carimbo numa escrita de tela | FR-027.1 exige prova de que escrita sem identidade **não passa** |
