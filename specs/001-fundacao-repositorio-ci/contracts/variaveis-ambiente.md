# Contrato — variáveis de ambiente

**Fase 1** · 2026-08-27 · fonte: `.env.local.example` (já existe e está correto) + FR-002, FR-022.x

## A regra que decide tudo

> Toda variável com prefixo `NEXT_PUBLIC_` é **embutida no bundle** e visível a qualquer usuário.
> Toda variável sem o prefixo existe apenas no servidor.
> **Se você precisou pôr `NEXT_PUBLIC_` num segredo, o desenho está errado.**

Isto vale ainda mais agora: **o repositório é público desde 26/08/2026**.

## Inventário

| Variável | Pública? | Papel | Escopos onde deve existir |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | Endereço da API. Público por natureza | local · preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Papel `anon`/`authenticated`. **Segura porque existe RLS** | local · preview |
| `SUPABASE_SERVICE_ROLE_KEY` | **NÃO — segredo** | Ignora toda a RLS. Equivale a acesso administrativo | local · CI (se necessário) |
| `DATABASE_URL` | **NÃO — segredo** | Conexão direta; contém a senha do banco | local · CI |
| `NEXT_PUBLIC_URL_APLICACAO` | Sim | **URL canônica desta instância**, para montar endereço absoluto quando o sistema precisa de um *(ver a nota abaixo da tabela)* | local · preview |
| `NEXT_PUBLIC_AMBIENTE` | Sim | Rótulo exibido na faixa: `local` · `preview` · `producao` | local · preview |
| `ETL_PLANILHA_ID` | Não | Épico 2 — só na máquina de quem roda a carga | local (de quem faz ETL) |
| `ETL_CREDENCIAL_GOOGLE` | Não | Caminho do JSON de conta de serviço, **fora do repositório** | idem |

> ⚠️ **Emenda de 03/10/2026 ao papel de `NEXT_PUBLIC_URL_APLICACAO`** *(decisão de Bernardo Villas
> Boas, 03/10/2026, D-USR-1)*. ⚠️ *(Registro anterior, vencido: "Links de convite e recuperação de
> senha".)* **Os dois links saíram**: o convite por e-mail foi permanentemente removido e **o sistema
> não envia e-mail nenhum** — não existem as rotas `/convite` nem `/recuperar-senha`, e
> `tests/unidade/sem-convite-nem-envio-de-email.test.ts` reprova se voltarem (medido em 03/10/2026).
> **A variável SEGUE VALENDO**, e por dois motivos: ela é o endereço absoluto desta instância, e está
> na lista que `conferirAmbiente()` confere — **ausente, o middleware nega a rota protegida**
> (`FR-005.1`) em vez de deixar o sistema montar endereço para lugar nenhum. ⚠️ **O modo de falha que
> a tornava perigosa perdeu o seu pior caminho**: o convite com a URL errada funcionava inteiro, no
> ambiente errado, e nenhum teste pegava porque nada falhava. Medido em 03/10/2026:
> `urlDaAplicacao()`, em `lib/ambiente.ts`, **não tem consumidor em `app/`, `lib/` nem `components/`**
> — só os testes de `tests/unidade/ambiente.test.ts` a chamam.

## Escopos da Vercel nesta fatia

| Escopo | Variáveis de Supabase | Motivo |
|---|---|---|
| **Preview** | Apontam para `cqhpfuaweoyglhtrckcp`, com `NEXT_PUBLIC_AMBIENTE="preview"` | É o projeto de desenvolvimento (FR-022.1) |
| **Production** | **Nenhuma** | Não há ambiente de produção nesta fatia (FR-016.1). A ausência **é** a garantia do FR-022 |

> ⚠️ **Este contrato diverge do documento 10, e o documento 10 prevalece** *(decisão de Bernardo, 07/09/2026)*.
>
> O **documento 10 §2.6, linhas 239–246**, traz um bloco explícito mandando cadastrar
> `SUPABASE_SERVICE_ROLE_KEY` nos escopos **production e preview** da Vercel. Este contrato diz o
> oposto — atribui à chave os escopos `local · CI` e dá a Production "Nenhuma". **Os dois não podem
> estar certos.** Bernardo decidiu pelo documento 10: a chave é **infraestrutura pré-requisito**, e
> cadastrá-la não cria ambiente publicado — nenhum deploy de produção existe e a `main` não publica.
>
> **O que precisa ser reescrito, e ainda não foi:** a linha de inventário desta chave, esta tabela de
> escopos, e o **V-9** do `quickstart.md`, que roda `vercel env ls production` esperando ausência e
> hoje reprova por construção.
>
> ~~Texto anterior, mantido por honestidade de registro:~~ *A realidade divergiu deste contrato em 07/09/2026.* `SUPABASE_SERVICE_ROLE_KEY` foi cadastrada
> nos escopos **Production e Preview** da Vercel, por decisão de Bernardo, com a justificativa de que a
> Server Action de convite de usuário precisa dela.
>
> **O que este contrato de fato diz**, para que a divergência seja legível e não vire memória de quem
> estava presente:
>
> - o inventário atribui à `service_role` os escopos **`local · CI (se necessário)`** — **não** preview,
>   **não** production;
> - esta tabela atribui a Production **"Nenhuma"**, e diz que **a ausência é a garantia do FR-022**;
> - o **V-5** lista o convite de usuário entre os **três usos autorizados** — nisso a justificativa está
>   correta —, mas conclui **"nunca por requisição de tela"**, e o convite ainda não existe: nenhum
>   arquivo de `app/`, `lib/` ou `components/` importa `lib/supabase/admin.ts` (verificado em 07/09).
>   A Server Action de convite é do **Épico 3**.
>
> **Consequências mecânicas**, independentes de opinião: o **SC-007** ("zero ambiente de produção da
> v2.1") e o **FR-016.1** deixam de valer, e o **V-9** do quickstart passa a reprovar. Ou o contrato,
> o FR-016.1 e o SC-007 são emendados com data e motivo, ou a variável sai dos dois escopos.
> **Enquanto isso não se decidir, a T052 fica aberta.**

> ⚠️ **Emenda de 03/10/2026 ao bloco acima — ele FICA, e esta nota diz o que nele venceu**
> *(decisão de Bernardo Villas Boas, 03/10/2026, D-USR-1 e D-USR-2)*. O bloco acima é **registro
> datado de 07/09/2026** e se preserva inteiro: ele narra por que a `service_role` foi cadastrada nos
> dois escopos da Vercel, e a justificativa registrada **à época** era a Server Action de convite.
> **O convite por e-mail foi permanentemente removido em 03/10/2026**, e **nenhum e-mail é enviado
> pelo sistema**. ⚠️ **Mas a divergência que o bloco aponta NÃO se resolveu com isso** — ela só trocou
> de justificativa: a `service_role` **é** necessária em preview e production, agora para a
> **administração de contas pelo Admin**. Medido em 03/10/2026: `lib/supabase/admin.ts` tem **um**
> consumidor em `app/`, `lib/` e `components/` — `lib/acoes/usuarios.ts`, com **quatro** usos
> (cadastrar, redefinir senha, excluir conta e dar baixa na marca de troca obrigatória) —, e o
> `no-restricted-imports` do `eslint.config.mjs` autoriza exatamente **dois** arquivos. ⚠️ **Portanto
> a frase "o convite ainda não existe: nenhum arquivo de `app/`, `lib/` ou `components/` importa
> `lib/supabase/admin.ts`" descreve 07/09/2026 e NÃO descreve hoje** — e a **T052 continua aberta**,
> pelo mesmo motivo de antes.

## Invariantes

- **V-1**: `.env.local` **nunca** é versionado. Coberto por `.env*` no `.gitignore` — **verificado em
  26/08/2026**.
- **V-2**: `.env.local.example` lista **toda** variável, com comentário, e **zero** segredos reais —
  verificado: só placeholders (FR-002).
- **V-3**: `SUPABASE_SERVICE_ROLE_KEY` **nunca** recebe prefixo `NEXT_PUBLIC_`. Primeira das três
  defesas; as outras duas são `import "server-only"` no topo de `lib/supabase/admin.ts` e a regra
  ESLint de import restrito.
- **V-4**: `NEXT_PUBLIC_AMBIENTE` **corresponde** ao projeto realmente apontado (FR-022.2).
  **Achado de 26/08:** o `.env.local` traz `local` apontando para `cqhpfu…` — com a designação do
  FR-022.1 isso passa a estar certo, mas **conferir, não presumir**.
- **V-5**: usos autorizados da `service_role`, e **só estes três**: **administração de contas pelo
  Admin** — cadastrar com senha temporária, redefinir senha, excluir permanentemente e dar baixa na
  marca de troca obrigatória, todos em `lib/acoes/usuarios.ts` —, carga do ETL, script de manutenção
  versionado rodado à mão. **Nunca por requisição de tela.**
  ⚠️ **Emenda de 03/10/2026** *(decisão de Bernardo Villas Boas, 03/10/2026, D-USR-1 a D-USR-3)*:
  ⚠️ *(Registro anterior, vencido: "convite de usuário pelo Admin".)* O convite por e-mail saiu
  permanentemente e **não há envio de e-mail**; o primeiro item **não desapareceu, mudou de nome e
  cresceu** — são as ações do Admin **sobre contas**, não um convite. **Continuam sendo três usos**, e
  o terceiro continua sendo a fronteira: nenhuma requisição comum de tela toca a chave.
- **V-6**: se um segredo chegar a ser empurrado, o procedimento é **rotacionar a chave** (FR-002.2).
  Repositório é público: apagar o commit não desfaz a exposição.

## O que a varredura de segredos acrescenta

FR-002.1 exige varredura de segredos e **proteção de push** ligadas — verificado em 27/08/2026: as
duas estão `disabled`. Elas atuam **antes** do V-6, recusando o push em vez de exigir rotação depois.
Gratuitas em repositório público.
