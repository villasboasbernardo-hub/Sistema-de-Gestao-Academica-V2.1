# Pesquisa — Épico 3

**Fase 0** · 08/09/2026 · entrada: [spec.md](./spec.md)

Sete questões. A primeira foi decidida por **experimento contra o banco real**, não por leitura de
documentação — e o experimento derrubou a primeira solução em duas tentativas.

---

## R-1 — Qual instrumento do banco recorta **coluna** por perfil?

**Contexto.** O FR-028 exige que 3 dos 9 perfis leiam 12 colunas de identificação civil e residência
de `instrutores`, e que os outros 6 não. O FR-028.2 já registra que `ROW LEVEL SECURITY` não é o
instrumento: RLS decide **linhas**, não colunas.

### O fato que elimina o candidato mais óbvio

Medido no banco:

```
privilegios de TABELA em instrutores → authenticated: SELECT, INSERT, UPDATE
papeis do Supabase                   → anon · authenticated · service_role
```

**Todo usuário autenticado compartilha o mesmo papel de banco: `authenticated`.** O perfil vive em
`usuarios.perfil`, que é **dado**, não papel. Privilégio de coluna é concedido a papel — logo, o
`GRANT`/`REVOKE` por coluna **sozinho** só sabe dizer "todos os autenticados" ou "nenhum". Ele não
distingue `admin` de `operador`, e nunca poderia.

Isso não o descarta: torna-o **metade** da solução, não a solução.

### O experimento, e o que ele derrubou

Cenário: um `operador` e um `ajudante_administracao_academica`, ambos com sessão autenticada de
verdade (`set local role authenticated` + `request.jwt.claims`), lendo um instrutor com CPF e
endereço preenchidos.

**Tentativa 1 — revogar só as colunas de PII.**

| Teste | Esperado | Obtido |
|---|---|---|
| `select cpf from instrutores` como operador | negado | ✅ **111.222.333-44** |
| `select * from instrutores` como operador | sem PII | ✅ **tudo, inclusive CPF** |

**O `REVOKE` por coluna não fez efeito nenhum.** A razão: `authenticated` tem `SELECT` em **nível de
tabela**, e privilégio de tabela cobre todas as colunas — revogar coluna **não sobrepõe** um
`GRANT` de tabela. É preciso revogar a tabela e conceder de volta as colunas que ficam.

> ⚠️ **Este é o defeito silencioso desta fatia.** Quem escrever só o `revoke ... (colunas)` e testar
> o caminho feliz vê a tela funcionar e conclui que protegeu. Não protegeu nada. O teste que pega
> isso é o **negativo**, e ele precisa existir antes da migration.

**Tentativa 2 — revogar a tabela, conceder as 33 colunas funcionais, e uma visão com porteiro para
a PII.**

| Teste | operador | ajudante |
|---|---|---|
| `select posto_graduacao, esp_hab_obs from instrutores` | ✅ lê | ✅ lê |
| `select cpf from instrutores` | 🛑 `permission denied for table` | 🛑 `permission denied for table` |
| `select * from instrutores` | 🛑 negado | 🛑 negado |
| `select codigo, cpf from vw_instrutor_dados_pessoais` | ✅ **0 linhas** | ✅ **1 linha, com CPF** |
| subconsulta `(select cpf …)` | 🛑 negado | — |
| filtro `where cpf is not null` | 🛑 negado | — |

Os dois últimos importam: **o operador não contorna nem lendo a coluna por dentro de uma
subconsulta nem usando-a só como filtro.** O privilégio é do banco, não da forma da consulta.

### O efeito colateral, e como ele é resolvido

Com a tabela revogada, **`select *` passa a falhar para todo mundo** — inclusive para os três
perfis autorizados —, porque `*` expande para as colunas revogadas. O erro é
`permission denied for table instrutores`, que **não menciona coluna** e leva quem depurar a
suspeitar da RLS primeiro.

Resolvido por uma segunda visão, de leitura:

```
vw_instrutores  with (security_invoker = true)  → as 33 colunas funcionais
```

Medido: `select *` nela devolve **33 colunas, sem PII**, para os dois perfis, e o
`security_invoker = true` faz a **RLS da tabela base continuar valendo** — não há segunda cópia da
regra de linha.

### Não quebra nada do que existe

| Verificação | Resultado |
|---|---|
| As 10 views de `public` selecionam alguma coluna de PII? | **Nenhuma** |
| Alguma delas usa `.*` (que quebraria com o revoke)? | **Nenhuma** |
| Todas são `security_invoker = true`? | **Sim, as 10** — logo respeitam o privilégio, e falhariam alto em vez de vazar |
| `service_role` (ETL) continua lendo e escrevendo a PII? | **Sim** — o revoke é só de `authenticated` |

### Decisão

**Três peças, e as três são necessárias:**

1. `revoke select on public.instrutores from authenticated` — sem isto, o resto é decorativo.
2. `grant select (<33 colunas funcionais>) on public.instrutores to authenticated` — devolve o
   dado de trabalho a todos os perfis (FR-029).
3. `create view public.vw_instrutor_dados_pessoais` — sem `security_invoker`, portanto com os
   direitos do dono, e com o porteiro `app.perfil_atual() in (<os 3>)` no `where`. É onde os três
   perfis autorizados leem a PII.

Mais `vw_instrutores` (`security_invoker = true`, só o funcional) para devolver a ergonomia de
`select *` às telas.

**Alternativas consideradas e por que não:**

- **Tabela separada `instrutores_dados_pessoais` com RLS própria.** Seria o uso mais idiomático de
  RLS — a restrição vira row-level de verdade. Exigiria **`drop column` das 13 colunas** que o
  Épico 2 acabou de criar e carregar, e a regra 4 do `CLAUDE.md` proíbe (*"Nunca `drop column` em
  tabela com histórico"*). Mantê-las como `[APOSENTADA]` sem revogar deixaria a PII legível na
  tabela base — ou seja, exigiria o revoke de qualquer forma, e aí a tabela nova não acrescenta
  nada além de uma migração de dados.
- **Papel de banco por perfil** (`grant` por coluna a `role_admin`, `role_operador`…). Recria em
  papéis o que a arquitetura decidiu manter como **dado** na matriz `perfil_permissao`, e
  desmancharia o `RF-AUTH-10` — trocar permissão voltaria a ser DDL.
- **Mascarar na aplicação.** Fere o Princípio XI: o banco é a fronteira. Uma consulta escrita por
  fora da tela leria tudo.

---

## R-2 — Como a desativação produz efeito na **requisição seguinte**?

**Já está resolvido pelo Épico 1, e provado.** `app.usuario_atual()` filtra por `status = 'ativo'`,
então o token que a pessoa já tem no navegador deixa de resolver na consulta seguinte. O teste
*"desativar a conta zera o alcance na requisição seguinte"* está na suíte e passa.

**O que esta fatia precisa fazer é não estragar isso.** O risco é a aplicação **guardar o perfil**
em cookie, em sessão ou em memória do servidor: nesse caso a desativação continuaria valendo no
banco e a tela continuaria oferecendo o que a pessoa não pode mais.

**Decisão.** A aplicação **não guarda perfil, escopo nem permissão**. Cada requisição os obtém do
banco. O custo é uma consulta pequena por requisição sobre uma tabela de 152 linhas e outra de
poucas dezenas; o benefício é que a única fonte de verdade continua sendo uma só.

---

## R-3 — O convite escreve em dois sistemas. Como fica se o segundo falhar?

O fluxo do documento 22 §3.3 grava em `public.usuarios` **e depois** chama a plataforma de
autenticação. São dois sistemas: não há transação que abranja os dois.

**O achado é que não é preciso compensar.** Se a chamada de convite falhar depois do `INSERT`, o
estado resultante é *"linha existe com perfil e escopo, sem credencial"* — que é **exatamente o
estado legítimo** que o FR-008 descreve como deliberado. Não é inconsistência: é a janela em que o
Admin ainda pode revisar. O caminho de saída já existe e é o FR-011, reenviar.

**Decisão.** `INSERT` em transação própria, commitado; chamada de convite em seguida; falha na
chamada é **reportada ao Admin**, não compensada. A ordem inversa (convidar antes de inserir)
seria pior: produziria credencial sem linha, que é o único dos dois estados que não alcança nada
**e** não é visível na tela de usuários.

A detecção do FR-013 continua necessária para o **outro** sentido — credencial sem linha —, que só
aparece por engano operacional (conta criada pelo painel, por exemplo).

---

## R-4 — Como a interface lê a matriz sem criar uma segunda declaração de permissões?

A leitura de `perfil_permissao` é **aberta a qualquer sessão autenticada** por decisão do documento
22 §6.4: a interface precisa saber quais botões oferecer, e a matriz não contém dado sensível —
contém a definição pública das regras.

**Decisão.** Um único ponto no servidor carrega a matriz do usuário corrente por requisição e
expõe uma função `pode(recurso, acao)`. A interface consulta **essa** função. Não existe lista de
perfis nem de recursos escrita no código da aplicação — se existisse, seria a segunda fonte de
verdade que o FR-021 proíbe, e ela divergiria da primeira no dia em que alguém alterasse a matriz.

**Como isso é provado, e não afirmado:** o SC-007 exige que a ocultação e a negação sejam
verificadas **separadamente**. Um teste altera uma linha da matriz e observa o botão sumir; outro
invoca a ação por fora e observa o banco negar.

---

## R-5 — Onde `ultimo_acesso` é atualizado?

**Não pode ser gatilho**, porque o evento de autenticação acontece no schema de autenticação da
plataforma, fora do alcance do domínio. **Não deve ser no middleware**, porque escreveria a cada
requisição.

**Decisão.** Atualização na **autenticação bem-sucedida**, uma vez por sessão.

⚠️ A escrita é do próprio usuário sobre a própria linha. Ela passa pela policy `usuarios_editar` e
pelo gatilho `app.impedir_autoescalonamento` — que bloqueia mudança de `perfil`, `escopo_curso` e
`status`, e **não** bloqueia `ultimo_acesso`. Verificado na leitura do gatilho; **entra como teste**,
porque a lista de colunas protegidas pode mudar e o dia em que `ultimo_acesso` entrar nela o login
quebra em silêncio.

---

## R-6 — Como se confere o que não é código?

Duas garantias desta fatia vivem no painel da plataforma e não em arquivo do repositório: o
auto-cadastro desligado (FR-003) e o limite de tentativas de autenticação (FR-005.2).

**Decisão.** Contrato `contracts/conferencias-de-painel.md`, com **como conferir** e **onde registrar
o resultado** de cada item. A conferência produz um valor observado, não um "sim".

⚠️ **Isto não vira teste automatizado, e a honestidade sobre isso importa.** Um teste que afirma
"auto-cadastro está desligado" sem consultar o painel é pior que nenhum teste: dá a sensação de
cobertura sem a cobertura. A alternativa — consultar a API de administração do painel a cada CI —
exigiria a chave administrativa no CI, o que troca uma garantia fraca por um risco real.

---

## R-7 — Como se prova o teste negativo dos **nove** perfis?

O SC-004 exige, para **cada** um dos 9 perfis, prova de que o banco nega uma leitura e uma escrita
fora do escopo. A suíte atual tem 13 testes cobrindo alguns perfis, não todos.

**Decisão.** Estender o auxiliar que já existe em `tests/invariantes/rls/` para criar **um usuário
por perfil** e percorrer os 9 em tabela, com a asserção nomeada por perfil. Os três testes que o
documento 22 §10.2 lista como pendentes — T-02, T-03 e T-10 — entram aqui: eles dependiam de dado
real para existir, e o dado passou a existir no Épico 2.

⚠️ **T-03 é o que mais importa dos três.** É a fuga de escopo por `UPDATE`: mover uma linha para
fora do próprio escopo passa pelo `USING` (a linha é visível **antes** da mudança) e só o
`WITH CHECK` a pega. Uma policy que declare só `USING` aprova a fuga, e o teste de leitura não
percebe.

---

## Resumo das decisões

| # | Decisão | Custo | Prova |
|---|---|---|---|
| R-1 | `revoke` de tabela + `grant` das 33 funcionais + visão com porteiro + visão de leitura | 1 migration, 2 views | Experimento executado; 6 asserções negativas |
| R-2 | Aplicação não guarda perfil; lê por requisição | 1 consulta/requisição | Teste já existente |
| R-3 | Sem compensação: a falha cai num estado legítimo | — | Teste do estado "sem credencial" |
| R-4 | Um ponto no servidor; a interface consulta a matriz | — | Ocultação e negação provadas separadamente |
| R-5 | `ultimo_acesso` na autenticação, uma vez por sessão | — | Teste de que o gatilho não a bloqueia |
| R-6 | Contrato de conferência de painel, com valor observado | manual | Registro do valor, não afirmação |
| R-7 | Um usuário por perfil; 9 × (leitura negada + escrita negada) | fixtures | 18 asserções nomeadas + T-02, T-03, T-10 |
