# Contrato — o recorte de escrita do dado pessoal

**Fase 1** · 11/09/2026 · `FR-032`, `FR-033`, `SC-010` · espelha a migration
`20260908120000_recorte_dado_pessoal_instrutor.sql`, que fez a metade da **leitura**

> **A frase inteira do contrato: _quem não vê, não escreve._**
> Qualquer recorte diferente exigiria explicar por que alguém edita às cegas um campo que não pode
> conferir — e edição às cegas de CPF é como um dado se apaga sem ninguém notar.

---

## O estado de hoje, medido

| Privilégio de `authenticated` em `public.instrutores` | Colunas |
|---|---|
| `SELECT` | **33** |
| `UPDATE` | **45** |
| `INSERT` | **45** |

⚠️ **Contar coluna esconde o que importa.** A RLS gateia por `app.pode('instrutores', <ação>)`, e a
matriz responde:

| Quem | `ler` | `criar` | `editar` | **lê PII** |
|---|---|---|---|---|
| `admin` | ✅ | ✅ | ✅ | ✅ |
| `encarregado_administracao_academica` | ✅ | ✅ | ✅ | ✅ |
| `ajudante_administracao_academica` | ✅ | ✅ | ✅ | ✅ |
| **`encarregado_orientacao_pedagogica`** | ✅ | — | **✅** | ❌ |
| **`ajudante_orientacao_pedagogica`** | ✅ | — | **✅** | ❌ |
| `chefe_departamento_ensino` | ✅ | — | — | ❌ |
| `operador` · `encarregado_curso` · `visualizacao` | ✅ | — | — | ❌ |

**As duas linhas em negrito são o achado.** Encarregado e ajudante de Orientação Pedagógica gravam
CPF, RG, telefone e endereço que a tela nunca lhes mostra.

---

## O estado exigido

`UPDATE` e `INSERT` passam a alcançar **as mesmas 33** colunas que o `SELECT` alcança. As 12 que
saem são exatamente as da view com porteiro:

```
cpf · rg · orgao_emissor · telefone · retelma
endereco_logradouro · endereco_numero · endereco_complemento
endereco_bairro · endereco_cidade · endereco_estado · endereco_cep
```

### Por que o `INSERT` entra, se hoje não é buraco

`criar` pertence aos mesmos três perfis que leem a PII, então a inserção está contida — **por
coincidência da matriz, não por desenho**. A matriz é dado administrável em tela, que é o que o
Princípio VII exige. No dia em que alguém conceder `criar` a um quarto perfil, o buraco abre **sem
migration, sem revisão e sem erro**.

⚠️ **Duas travas independentes que por acaso coincidem não são uma trava.**

---

## Como os três autorizados continuam escrevendo

Não pela `service_role` — ela é para convite, ETL e manutenção, **nunca por requisição de tela**.

A escrita passa por função `SECURITY DEFINER` com o **mesmo porteiro** da
`vw_instrutor_dados_pessoais`:

```
app.pode('instrutores', 'editar')
  and app.perfil_atual() in (
    'admin',
    'encarregado_administracao_academica',
    'ajudante_administracao_academica'
  )
```

⚠️ **As duas condições somam, não substituem.** Quem não pode editar instrutor nenhum não passa a
poder por causa do perfil — é a mesma construção que a view de leitura usa, e pelo mesmo motivo.

---

## Por que não é RLS, e por que não é Zod

| Alternativa | Por que não |
|---|---|
| **RLS** | decide **linha**, não sabe recortar **coluna**. Está escrito na migration de 08/09 |
| Privilégio de coluna sozinho | não distingue perfil: **todo autenticado compartilha o papel `authenticated`**, porque o perfil vive em `usuarios.perfil`, que é dado |
| **Zod na Server Action** | regra de negócio só na aplicação, proibida pelo BRIEF §2. O Épico 3 já mostrou o atalho alcançável por chamada direta à API |

**Nenhum dos dois resolve sozinho — daí as três peças**, exatamente como na metade da leitura.

---

## A armadilha que já pegou a metade da leitura

🛑 **`revoke update (colunas)` NÃO TEM EFEITO enquanto houver `GRANT` de tabela.** Privilégio de
tabela cobre todas as colunas. Foi medido em 08/09: depois do revoke das 12, o Operador leu o CPF
normalmente e o `select *` devolveu tudo. **A tela funcionava perfeitamente.**

**A ordem é obrigatória e é esta:**

1. `revoke update, insert on public.instrutores from authenticated;`
2. `grant update (…33…), insert (…33…) on public.instrutores to authenticated;`

⚠️ **Inverter os dois passos produz uma migration que roda, não dá erro e não protege nada.**

---

## O que o teste precisa provar (`FR-033`)

| # | Asserção | Por que a óbvia não serve |
|---|---|---|
| N-1 | `encarregado_orientacao_pedagogica` **não** grava `cpf` | provar que o admin grava não diz nada sobre quem não deveria |
| N-2 | `ajudante_orientacao_pedagogica` **não** grava `endereco_cep` | idem |
| N-3 | Os **três** autorizados gravam `cpf` pela função | controle positivo — sem ele, um recorte que nega todo mundo passaria |
| N-4 | Colunas com `SELECT` = colunas com `UPDATE` ∪ `INSERT` | é a contagem que não depende de lembrar de um perfil |
| N-5 | O recorte **não recortou demais**: os 5 perfis com `editar` continuam gravando as 33 funcionais | ⚠️ **é o teste que falta na metade da leitura**, e negar demais quebra a tela sem erro |

⚠️ **Conferir por defeito deliberado.** Repor o `grant update` de tabela e ver N-1, N-2 e N-4
reprovarem. Portão nunca visto reprovando é afirmação, não prova.

---

## ⚠️ Emenda necessária ao `SC-010`

O critério, como está escrito na spec, compara *"colunas com `SELECT`"* e *"colunas com `UPDATE`"*.
**Ele não menciona `INSERT`.**

**Consequência:** revogar só o `update` faz o `SC-010` sair **zero** com o `insert` ainda em 45
colunas. O critério ficaria **verde sobre requisito aberto** — a falha mais cara que este projeto
conhece.

**A emenda é de redação do critério, não de regra**: o `FR-032` já diz *"a **escrita**"*, e escrita
são os dois verbos. Fica registrada aqui e vira tarefa.

---

## Plano de reversão

```
revoke update, insert on public.instrutores from authenticated;
grant  update, insert on public.instrutores to authenticated;
drop function if exists app.gravar_dados_pessoais_instrutor(...);
```

⚠️ **Reverter devolve a escrita de CPF, RG, telefone e endereço de 177 militares a 2 perfis que não
os leem.** É operação técnica de uma linha e decisão de segurança de outra ordem — a mesma nota que
a migration da leitura carrega.
