# Quickstart — como se prova que a spec 011 funciona

Roteiro de **validação**, não de implementação. Cada passo diz o comando e o **resultado esperado**.

⚠️ **`db:reset:limpo` antes do ETL não é zelo.** Rodado sobre a base que a suíte de ponta a ponta
deixou, o ETL **aborta com saída 3** e nada é gravado. Medido em 26/09/2026.

⚠️ **Nada aqui toca o banco remoto.**

---

## Passo 0 — o ponto de partida

```
pnpm db:reset:limpo
pnpm verificar:tudo
```

Espera-se: saída **0**, com as contagens do dia do ramo. `storage.buckets` **vazia** e
`storage.objects` com **zero** policies — é o estado de antes.

---

## Passo 1 — o banco novo, e o que ele recusa

```
pnpm db:reset:limpo
pnpm exec supabase test db
```

Espera-se, nas asserções novas: a trilha com RLS ligada, **uma** policy e **zero** privilégio de
escrita; `update`/`delete`/`truncate` nela recusados com `42501` **inclusive** para a `service_role`;
`acao` aceitando só os seis valores; o bucket `avatares` **privado**, com **2 MB** e só JPG e PNG; e
`storage.objects` com **exatamente quatro** policies.

⚠️ **E as asserções que JÁ existem continuam valendo, sem emenda**: zero ações `reativar` na matriz,
zero policies de `DELETE`, toda policy de `UPDATE` com `WITH CHECK`.

---

## Passo 2 — sair, que é o que motivou a fatia

```
pnpm dev:local
```

Entrar, clicar no avatar, *Sair*, chegar à entrada, e **entrar com outra conta**. Espera-se: o
cabeçalho com o nome e o perfil da conta nova, **em português**, sem resquício da anterior.

⚠️ **Sem tocar em cookie, sem janela anônima** — é exatamente o que não dava para fazer antes.

---

## Passo 3 — o percurso que a `FR-035` e a `FR-038` exigem, inteiro

Com duas contas e **dois navegadores**:

1. no navegador **B**, entrar com a conta alvo e **deixar a sessão aberta**;
2. no navegador **A**, como Admin, redefinir a senha da conta alvo;
3. anotar a senha mostrada, fechar o aviso e **reabrir a tela** → a senha **não** aparece de novo;
4. no navegador **B**, navegar → a sessão **caiu**, e ele chega à entrada;
5. entrar com a senha **temporária** → cai em `/perfil/senha`, **obrigado**;
6. tentar ir a `/inicio`, `/cursos` e `/instrutores` pelo endereço → **volta** para `/perfil/senha`
   nas três;
7. definir a senha nova → chega à tela inicial;
8. sair e entrar com a **nova** → entra direto, sem passar pela troca;
9. tentar entrar com a **temporária** → recusado.

⚠️ **O passo 4 mede a RENOVAÇÃO, não a leitura.** O token de acesso é um JWT e vale até expirar sem
consultar nada; "sessão derrubada" quer dizer que a **renovação** parou. Medir logo depois, sem
forçar a renovação, passaria mesmo com a revogação funcionando.

---

## Passo 4 — a foto, e a recusa que importa

Em `/perfil`: enviar um JPG de menos de 2 MB → aparece no avatar. Remover → volta às iniciais.

E a metade que vale:

```
# com a conferência do navegador DESLIGADA, enviando direto
```

Espera-se: recusa **do servidor** para arquivo acima de 2 MB e para tipo fora de JPG/PNG — porque o
limite está **no bucket**, e não só no código (`SC-009`).

---

## Passo 5 — excluir, e a recusa com nome

Como Admin, em `/admin/usuarios`:

- excluir um **convite recém-criado**, sem nada ligado a ele → some, com confirmação, alerta e
  **código digitado**; e a trilha passa a ter a linha, com **quem, o quê, sobre quem e quando**;
- excluir uma conta **que já usou o sistema** → recusa em português, **nomeando** o que impede, e
  oferecendo desativar.

---

## Passo 6 — o último admin, pelos três caminhos

Com **um** único admin ativo, tentar: rebaixá-lo, desativá-lo e excluí-lo. Espera-se: os três
recusados, e a recusa **traduzida**.

⚠️ **E o caso que discrimina**: com **dois** admins ativos, os três caminhos **funcionam**. Sem essa
metade, uma regra que recusasse sempre passaria no teste.

---

## Passo 7 — a permissão, com sessão de verdade

```
pnpm test:rls
```

Espera-se: o **Operador** não redefine senha, não edita outra conta, não exclui e não reativa — e a
recusa é conferida pelo **código** `42501`, não por "deu erro". E o controle positivo: o **Admin**
faz as quatro.

⚠️ **Prova de permissão nunca em pgTAP**, que roda como dono do schema, onde a RLS não se aplica.

---

## Passo 8 — o percurso por clique, ponta a ponta

```
pnpm test:e2e
```

Espera-se: o percurso da US1 e o da US4 chegando **por clique**, com `goto` só no ponto de partida; e
`tests/unidade/toda-tela-tem-caminho.test.ts` verde, com as duas rotas novas declaradas.

---

## Passo 9 — o remoto, e só depois do resto

```
python -m scripts.manutencao.dado_do_remoto --somente-copia
pnpm exec supabase db push --linked --dry-run
```

Espera-se: o backup datado impresso e citado no PR; e o `--dry-run` listando **só** as migrations
desta fatia.

⚠️ **Só com CI verde sobre o mesmo commit e autorização nominal.** Preview e Production são **o mesmo
projeto** — aplicar aqui é aplicar lá.
