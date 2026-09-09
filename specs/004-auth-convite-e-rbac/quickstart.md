# Quickstart — validar o Épico 3

**Fase 1** · 08/09/2026 · contratos em [`contracts/`](./contracts/)

Guia de **validação**, não de implementação. Cada cenário roda contra o banco local e diz o que se
espera ver. Um cenário que passa por engano é pior que um que falha: onde isso é possível, está
escrito como.

## Pré-requisitos

```
docker            # Supabase local
pnpm db:reset     # schema do zero
python -m scripts.etl.executar --primeira-carga    # 5.394 linhas, se quiser dado real
```

⚠️ **Sem o ETL, `instrutores` fica vazia** e os cenários V-1 a V-4 passam sem provar nada — uma
tabela vazia não tem PII para vazar. Rode a carga, ou aceite que aqueles quatro estão *pulados*,
não *aprovados*.

---

## V-1 · O recorte de PII protege — os quatro negativos

```
pnpm test:invariantes         # 092_recorte_pii.sql
pnpm test:rls                 # asserções P-2, P-3, P-7, P-8
```

**Espera-se:** para cada um dos 9 perfis, `select cpf from instrutores` e `select *` **negados**
com `permission denied for table instrutores`; a subconsulta e o filtro por `cpf` **também
negados**.

⚠️ **Como este cenário passa por engano:** rodando com `instrutores` vazia, ou testando só o
caminho feliz (P-1, P-4, P-5). A primeira tentativa do experimento do R-1 passava em todos os
positivos **com o CPF completamente exposto**.

## V-2 · O recorte não recorta demais

```
pnpm test:rls                 # P-1, P-4, P-5, P-6, P-9, P-10
```

**Espera-se:** os 9 perfis leem `posto_graduacao`; `select * from vw_instrutores` devolve **33
colunas**; os **3** autorizados leem CPF pela visão com porteiro e os **6** demais recebem **0
linhas** — vazio, não erro; `service_role` continua lendo tudo; as 10 views existentes continuam
de pé.

## V-3 · Rota protegida exige sessão, e sem configuração **nega**

```
pnpm test:e2e                 # S-1 a S-4
```

**Espera-se:** `/admin/usuarios` sem sessão redireciona a `/login` **preservando o destino**;
`/login` abre; e — o que importa — **com a variável de ambiente ausente, a rota de `(app)` é
negada**, não liberada.

⚠️ É o FR-005.1, a única exceção declarada ao `RN-DEG-01`. O teste S-4 existe para impedir que
alguém "conserte" o middleware de volta ao comportamento anterior por achar que é o princípio.

## V-4 · Convite → senha → primeiro acesso

```
pnpm test:e2e                 # tests/e2e/convite.spec.ts
```

**Espera-se:** o percurso inteiro, com o convidado alcançando **exatamente** o escopo atribuído.

⚠️ **Só endereço de teste** (FR-031.1). Um convite emitido do preview para endereço real leva a
pessoa a definir senha num ambiente que será descartado — e o projeto de produção ainda não existe.

## V-5 · Cada um dos nove perfis tem seu negativo

```
pnpm test:rls
```

**Espera-se: 9 perfis × (1 leitura negada + 1 escrita negada) = 18 asserções nomeadas**, mais
T-02, T-03 e T-10 portados.

⚠️ **T-03 é o que mais importa.** É a fuga de escopo por `UPDATE`: mover uma linha para fora do
próprio escopo passa pelo `USING` — a linha é visível **antes** da mudança — e só o `WITH CHECK` a
pega. Uma policy que declare só `USING` aprova a fuga, e nenhum teste de leitura percebe.

## V-6 · Desativar corta o alcance na requisição seguinte

**Espera-se:** com a sessão aberta noutro navegador, desativar a conta e observar a **requisição
seguinte** daquele navegador não alcançar nada — sem fechar o navegador, sem esperar a sessão
expirar.

⚠️ **Como este passa por engano:** se a aplicação guardar o perfil em cache, o teste automatizado
(que abre conexão nova) passa e o navegador real continua funcionando. Verificar **no navegador**.

## V-7 · Ocultar e negar são duas coisas

**Espera-se, separadamente:**
1. O botão de uma ação sem permissão **não aparece**.
2. A mesma ação, invocada **por fora da tela**, é **negada pelo banco**.

⚠️ Provar só (1) é provar cortesia. Provar só (2) é deixar a tela oferecer o que não funciona.

## V-8 · Alterar a matriz muda o comportamento sem *deploy*

**Espera-se:** `update perfil_permissao set permitido = false where …`, recarregar, e observar a
mudança — **sem** novo *deploy* e **sem** migration.

⚠️ Nesta fatia a matriz não tem tela de edição (FR-024.1); a alteração é feita no banco. A
propriedade continua sendo requisito e continua sendo provada.

## V-9 · As conferências de painel

Ver [`contracts/conferencias-de-painel.md`](./contracts/conferencias-de-painel.md).

**Espera-se: um valor observado registrado para cada um dos três itens** — não um "sim". "Está
configurado" sem o número não é conferência, é lembrança.

---

## Portão

```
pnpm verificar          # a cada commit — alvo de 5 min
pnpm verificar:tudo     # antes do PR — coincide com o CI
```

⚠️ **`pnpm db:tipos` depois da migration, e commitado.** `db:tipos:conferir` compara contra o
**commit**, não contra o disco. Foi exatamente essa a omissão que o portão pegou no Épico 2.
