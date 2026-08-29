# Contrato — os três contextos do CI

**Fase 1** · 2026-08-27 · fonte: documento 24 §6.4, documento 10 §2.7 e §6.7, FR-014/FR-014.1

## Por que isto é contrato, e não detalhe

A proteção da branch `main` referencia os jobs **pelo nome**. Renomear um job sem atualizar a proteção
não quebra nada visivelmente — o portão simplesmente **para de exigir aquele bloco**, em silêncio, e
ninguém descobre até o dia em que precisava. Os três nomes abaixo são, portanto, contrato.

## Os três

| Contexto | O que roda | Precisa de Docker? | Reprova quando |
|---|---|---|---|
| `qualidade` | `next typegen` → `tsc --noEmit` → `eslint` → `prettier --check` → `vitest run tests/unidade` | ❌ | Erro de tipo, aviso de lint novo, formatação divergente, teste de unidade vermelho — **inclusive o que prova as fronteiras** (FR-006) |
| `banco` | `supabase start` → `supabase db reset` → `pnpm db:tipos` → `git diff --exit-code lib/tipos/database.ts` → `supabase test db` → `vitest run tests/invariantes/rls` | ✅ | Migration que não aplica do zero, **contrato de dados desatualizado** (FR-010), invariante pgTAP violada, teste negativo de RLS que passou quando devia falhar |
| `build` | `next build` | ❌ | Erro de fronteira servidor/cliente — inclusive `admin.ts` alcançado do navegador (FR-005). **É o único bloco que pega esse defeito** |

## Gatilhos

Roda em **todo push e todo PR** (FR-014). Push também, não só PR: enquanto o replantio não terminar e
a proteção não estiver configurada, o push é o único sinal que existe.

## Proteção da branch `main`

Aplicar **depois** de os três contextos existirem com estes nomes, e **antes do primeiro PR**
(FR-014.1). Passou a ser possível quando o repositório virou público em 26/08/2026 — antes disso a API
respondia `403 Upgrade to GitHub Pro`.

```bash
gh api -X PUT repos/:owner/:repo/branches/main/protection \
  -F required_pull_request_reviews.required_approving_review_count=1 \
  -F required_status_checks.strict=true \
  -F 'required_status_checks.contexts[]=qualidade' \
  -F 'required_status_checks.contexts[]=banco' \
  -F 'required_status_checks.contexts[]=build' \
  -F enforce_admins=false \
  -F restrictions=null
```

## Invariantes

- **CI-1**: os três nomes são **estáveis**. Renomear exige atualizar a proteção **no mesmo commit**.
- **CI-2**: o CI **nunca** commita. Regenera e compara; quem commita é gente (research R-3).
- **CI-3**: a versão da CLI do Supabase é **fixada** na action. CLI sem versão fixada é a causa nº 1 de
  o bloco `banco` falhar na primeira execução.
- **CI-4**: Node **22** (research R-2), coerente com `engines` do `package.json` e com a Vercel.
- **CI-5**: o bloqueio de merge MUST ser **provado** quebrando o CI de propósito uma vez, com commit
  descartável (FR-015). *Prova, não declaração* — Princípio VI.
- **CI-6**: o bloco `banco` roda com o schema **vazio** nesta fatia. Um verde aqui prova que o
  encanamento funciona, **não** que há invariante protegida. Não confundir os dois.

## Pré-requisito humano

`gh auth refresh -s workflow` **antes** de criar `.github/workflows/ci.yml`. Verificado em 27/08/2026:
os escopos do token são `gist`, `read:org`, `repo` — sem `workflow`, o push do arquivo é recusado
(research R-5). É passo interativo do Bernardo.
