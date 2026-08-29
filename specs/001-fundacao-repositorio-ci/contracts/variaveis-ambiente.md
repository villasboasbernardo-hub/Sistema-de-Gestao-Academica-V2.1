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
| `NEXT_PUBLIC_URL_APLICACAO` | Sim | Links de convite e recuperação de senha | local · preview |
| `NEXT_PUBLIC_AMBIENTE` | Sim | Rótulo exibido na faixa: `local` · `preview` · `producao` | local · preview |
| `ETL_PLANILHA_ID` | Não | Épico 2 — só na máquina de quem roda a carga | local (de quem faz ETL) |
| `ETL_CREDENCIAL_GOOGLE` | Não | Caminho do JSON de conta de serviço, **fora do repositório** | idem |

## Escopos da Vercel nesta fatia

| Escopo | Variáveis de Supabase | Motivo |
|---|---|---|
| **Preview** | Apontam para `cqhpfuaweoyglhtrckcp`, com `NEXT_PUBLIC_AMBIENTE="preview"` | É o projeto de desenvolvimento (FR-022.1) |
| **Production** | **Nenhuma** | Não há ambiente de produção nesta fatia (FR-016.1). A ausência **é** a garantia do FR-022 |

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
- **V-5**: usos autorizados da `service_role`, e **só estes três**: convite de usuário pelo Admin,
  carga do ETL, script de manutenção versionado rodado à mão. **Nunca por requisição de tela.**
- **V-6**: se um segredo chegar a ser empurrado, o procedimento é **rotacionar a chave** (FR-002.2).
  Repositório é público: apagar o commit não desfaz a exposição.

## O que a varredura de segredos acrescenta

FR-002.1 exige varredura de segredos e **proteção de push** ligadas — verificado em 27/08/2026: as
duas estão `disabled`. Elas atuam **antes** do V-6, recusando o push em vez de exigir rotação depois.
Gratuitas em repositório público.
