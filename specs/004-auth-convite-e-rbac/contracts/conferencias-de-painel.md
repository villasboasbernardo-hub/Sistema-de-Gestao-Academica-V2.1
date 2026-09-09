# Contrato — o que se garante por código e o que só o painel garante

**Fase 1** · 08/09/2026 · **corrigido em 09/09/2026** · fonte: [research.md §R-6](../research.md) ·
documento 22 §3.4 e §4.5

> **⚠️ ESTE CONTRATO NASCEU COM O TÍTULO ERRADO — corrigido em 09/09/2026, aprovado por Bernardo.**
> Ele se chamava *"o que não se garante por código"* e afirmava que as garantias desta fatia viviam
> só no painel. **Para o stack local e o de preview, isso é falso**: `supabase/config.toml` é
> versionado e o CI o aplica a cada corrida. Quatro dos itens passaram a ser garantidos por
> código; **dois continuam sendo só do painel**, e a distinção entre os dois grupos é o que este
> contrato passa a governar.
>
> ⚠️ **Com uma ressalva medida, que quase virou o próximo defeito silencioso: `supabase db reset`
> NÃO recarrega a seção `[auth]`.** Ver *"Versionado não quer dizer aplicado"*, abaixo.
>
> A frase que sobrevive inteira é a outra: **fingir que o repositório impõe o que ele não impõe é
> pior que admitir que não impõe.**

Parte das garantias desta fatia vive no painel da plataforma, e nenhum arquivo do repositório as
alcança. Para essas, a regra abaixo continua valendo sem emenda.

## Por que não viram teste automatizado

Um teste que afirme *"o auto-cadastro está desligado"* sem consultar o painel dá a sensação de
cobertura sem a cobertura — é o `ok(true)` que a suíte de pgTAP recusa. A alternativa, consultar a
API de administração a cada execução do CI, exigiria a **chave administrativa dentro do CI**: troca
uma garantia fraca por um risco real, e o risco é o A-5 do modelo de ameaças (vazamento da
`service_role`), que é o de impacto **crítico**.

> **⚠️ Emenda de 09/09/2026 — o argumento acima vale para o PAINEL, não para a plataforma.**
> Ele é sobre consultar a **API de administração do projeto remoto**, e continua inteiro: aquilo
> exigiria a chave administrativa no CI, e o risco seria o A-5. Mas **o comportamento do stack
> local pode ser testado sem chave nenhuma de painel** — basta uma sessão comum e uma chamada de
> verdade. É o que faz `tests/invariantes/rls/politica-de-senha.test.ts`: ele tenta trocar a senha
> por uma de 11 caracteres e exige a recusa. Onde dá para provar, prova-se; onde não dá, confere-se
> e registra-se.

**Decisão: conferência humana, com valor observado registrado.** Registrar "sim" não serve;
registra-se **o que se viu**.

## Os itens

### 1. Auto-cadastro desligado (FR-003)

| | |
|---|---|
| **Onde** | Painel do projeto → Authentication → Providers/Sign-ups |
| **O que conferir** | `Enable Sign Ups` **desligado** |
| **Valor a registrar** | o estado observado e a data |
| **Por que importa** | Com ele ligado, qualquer pessoa com o endereço da aplicação cria credencial. Ela não alcançaria dado nenhum — sem linha em `usuarios`, `app.usuario_atual()` devolve `NULL` e nenhuma policy concede acesso a `NULL`, provado pelo teste T-09 — mas teria credencial válida no projeto. Lixo desnecessário e superfície gratuita |

### 2. Limite de tentativas de autenticação (FR-005.2)

| | |
|---|---|
| **Onde** | Painel do projeto → Authentication → Rate Limits |
| **O que conferir** | o limite aplicado às tentativas de login e ao envio de e-mail |
| **Valor a registrar** | **o número observado**, não "está configurado" |
| **Por que importa** | ⚠️ **O documento 22 não tratava do assunto** quando este contrato foi escrito: o modelo ia de A-1 a A-7 e nenhuma delas era tentativa repetida de senha; a defesa de A-7 (política de senha) protege a senha escolhida, não o endereço de login. Depois desta fatia esse endereço dá acesso a CPF e residência de 177 militares. ✅ **Corrigido em 09/09/2026** — a ameaça **A-8** foi ratificada por Bernardo e o modelo vai de A-1 a A-8 |

### 3. Política de senha (FR-006)

| | |
|---|---|
| **Onde** | `supabase/config.toml` (local) · Painel do projeto → Authentication → Policies (remoto) |
| **O que conferir** | comprimento mínimo **12**; verificação contra vazamento (HaveIBeenPwned) **habilitada**. ⚠️ Desde 09/09/2026 o **12 é versionado** em `[auth] minimum_password_length`; a verificação contra vazamento **não tem chave** no `config.toml` e continua sendo só do painel |
| **Valor a registrar** | **os dois valores observados**, e a data |
| **Por que importa** | É a defesa da ameaça **A-7** do documento 22 §1.2 — senha fraca ou reutilizada, probabilidade **média**. ⚠️ Composição obrigatória e expiração compulsória ficam **desligadas de propósito** (documento 22 §4.5, alinhado ao NIST SP 800-63B): exigir símbolo e trocar senha a cada 90 dias produz senhas piores, previsíveis e anotadas em papel. Se alguém as ligar "para reforçar", **enfraquece** |

### 4. Região do projeto

| | |
|---|---|
| **Onde** | Painel do projeto → Settings → General |
| **O que conferir** | região **São Paulo (`sa-east-1`)**, não região estrangeira |
| **Por que importa** | Documento 22 §9: a autorização da CIAARA-14.2 tratou de hospedagem em nuvem comercial; a localização física continua sendo o que a autoridade precisa saber |

## Entregável desta fatia

Além das quatro conferências: **propor ao documento 22 uma ameaça A-8** — tentativa repetida de
senha contra o endereço de login, com a defesa observada no item 2. Propor é da fatia; **aprovar é
do Bernardo**.

✅ **RATIFICADA por Bernardo em 09/09/2026.** A-8 entrou no modelo de ameaças do documento 22 §1.2,
que passa a ir de **A-1 a A-8**. A defesa registrada é o limite da plataforma com o valor
observado, não contagem própria.

---

## Valores observados — 09/09/2026

✅ **DESCOBERTA APROVADA POR BERNARDO EM 09/09/2026, e o contrato foi corrigido por causa dela.**
Este arquivo foi escrito supondo que as quatro garantias vivessem só no painel, porque o documento
22 §3.4 afirmava que *"não há como garanti-lo por código"*. **Para o stack local e o de preview,
isso é falso**: `supabase/config.toml` é versionado e o CI o aplica a cada corrida. O documento 22
§3.4 e §4.5 foram emendados na mesma data.

| Item | Onde | Valor observado | Como |
|---|---|---|---|
| Auto-cadastro | `config.toml` `[auth] enable_signup` | **`false`** | versionado; aplicado por `supabase start` |
| Provedor de e-mail | `config.toml` `[auth.email] enable_signup` | `true` | ⚠️ **precisa ficar `true`** — ver abaixo |
| Limite de e-mails | `config.toml` `[auth.rate_limit] email_sent` | **100/h (local)** | valor de teste; o de produção é o que conta |
| Tentativas de login | `config.toml` `[auth.rate_limit] sign_in_sign_ups` | **30 por 5 min por IP** | versionado |
| Comprimento de senha | `config.toml` `[auth] minimum_password_length` | **12** | versionado **desde 09/09/2026** — era `6`, ver abaixo |
| Composição de senha | `config.toml` `[auth] password_requirements` | **`""`** (não exigida) | versionado; vazio de propósito (§4.5, NIST SP 800-63B) |
| Verificação contra vazamento | painel do projeto remoto | pendente | **sem chave no `config.toml`** |
| Região do projeto | painel do projeto remoto | pendente | painel |

### Versionado não quer dizer aplicado

**Medido em 09/09/2026, e é o achado mais caro desta conferência.** Depois de gravar
`minimum_password_length = 12` e rodar `pnpm db:reset`, o contêiner de auth **continuava com
`GOTRUE_PASSWORD_MIN_LENGTH=6`**:

```
docker inspect supabase_auth_ciaara-11-v2-1 --format '{{range .Config.Env}}{{println .}}{{end}}'
  → GOTRUE_PASSWORD_MIN_LENGTH=6      # depois do db reset
  → GOTRUE_PASSWORD_MIN_LENGTH=12     # depois de stop + start
```

O `db reset` **reinicia** o contêiner; o ambiente da seção `[auth]` é montado no `supabase start`.
Quem edita `[auth]` precisa de `pnpm db:stop && pnpm db:start`.

⚠️ **E isto é uma divergência entre `verificar:tudo` e o CI.** O CI sobe o stack do zero —
`supabase start` **antes** do `db reset` — e por isso sempre aplica. O `pnpm verificar:tudo` roda
só `db reset` contra o stack que já está de pé, e por isso pode **não** aplicar. É exatamente a
situação que a Definition of Done classifica como **defeito da verificação, não azar**.

✅ **Fechado por Bernardo em 09/09/2026, pela conferência barata.** Encadear `db:stop && db:start`
no `verificar:tudo` garantiria a aplicação e custaria minutos em **toda** execução; a decisão foi
não onerar o ciclo. `tests/invariantes/rls/config-auth-aplicado.test.ts` compara quatro chaves de
`[auth]` com o ambiente do contêiner, em **2 segundos**, e o erro já traz o conserto:
*"Rode `pnpm db:stop && pnpm db:start`"*. Ele foi conferido com o arquivo editado e o stack sem
reiniciar, que é exatamente o caso que ele existe para pegar.

### Como a imposição foi provada

Não por leitura do arquivo. Pelo caminho que a tela do convite usa de verdade —
`supabase.auth.updateUser({ password })`, que é `PUT /auth/v1/user`:

| Senha | Caracteres | Resposta |
|---|---|---|
| `abcdefgh` | 8 | **HTTP 422** · `weak_password` · *"Password should be at least 12 characters."* |
| `senha-de-14-ok` | 14 | HTTP 200 |

**E a prova virou teste**, para não depender de ninguém repetir o `curl`:
`tests/invariantes/rls/politica-de-senha.test.ts`, que roda em `pnpm test:rls` e no bloco `banco`
do CI. Ele foi conferido do jeito que este projeto exige — **por defeito deliberado**: com
`minimum_password_length` de volta em `6` e o stack reiniciado, ele reprovou com
*"senha de 11 caracteres foi ACEITA — o mínimo não está valendo"*. Com `12`, verde.

⚠️ **O endpoint de administração não obedece ao mínimo.** `POST /auth/v1/admin/users` com a
`service_role` criou conta com senha de 8 caracteres e devolveu **HTTP 200**, antes e depois da
mudança. Não é defeito: política de senha é do usuário, e a `service_role` é operação de dono. Mas
vale saber, porque o convite do Admin passa por ali — e o que ele envia é **convite sem senha**, com
a senha definida depois pelo próprio convidado, no caminho que **obedece** ao mínimo.

### O 12 que só existia no navegador

A conferência do item 3 encontrou uma divergência que ninguém tinha visto: o documento 22 §4.5 e o
FR-006 pedem **12 caracteres**, os dois campos de `app/(auth)/convite/FormularioDeSenha.tsx` trazem
`minLength={12}` — e o `config.toml` estava no padrão do CLI, **6**.

Era o caso exato que o BRIEF §2 proíbe: **regra de negócio implementada apenas na UI**. E o efeito
era alcançável, não teórico — uma chamada direta à API de auth, sem passar pelo formulário,
aceitaria senha de seis caracteres. Corrigido para `12`; as senhas das suítes têm 22 caracteres e
nenhuma delas mudou.

### A armadilha que custou uma suíte inteira

`[auth.email].enable_signup = false` **não** desliga só o auto-cadastro: mapeia para
`GOTRUE_EXTERNAL_EMAIL_ENABLED` e derruba o **provedor de e-mail inteiro**, login incluído. Ao
desligá-lo, os 98 testes de RLS falharam em bloco com *"Email logins are disabled"* — mensagem que
não sugere auto-cadastro a ninguém.

**Quem desliga o auto-cadastro é o `enable_signup` da seção `[auth]`.** Está anotado nos dois
lugares do `config.toml`.

### O que continua sendo só do painel

O projeto **remoto** — hoje `cqhpfuaweoyglhtrckcp`, designado desenvolvimento/preview — não lê o
`config.toml`. Para ele, as quatro conferências continuam manuais. **Não há projeto de produção
ainda**, então a conferência que mais importa ainda não tem objeto.

Dois itens não têm equivalente local **em nenhuma hipótese**, e é por eles que este contrato
continua existindo:

1. **Verificação contra vazamento (HaveIBeenPwned).** Não existe chave no `config.toml`. É do
   painel, e é a defesa da ameaça **A-7**.
2. **Região do projeto.** Não existe localmente. É do painel, e é o que a CIAARA-14.2 precisa saber
   sobre a localização física do dado pessoal (documento 22 §9).

O limite de tentativas de login fica num terceiro grupo: **tem chave versionada, e ainda assim o
número que importa é o do painel**. O `config.toml` governa o stack local, onde não há o que
atacar. É o painel do projeto remoto que defende a ameaça **A-8**.
