# Contrato — os três contextos do CI

**Fase 1** · 2026-08-27 · fonte: documento 24 §6.4, documento 10 §2.7 e §6.7, FR-014/FR-014.1

**Revisto em 2026-09-03**, quando `.github/workflows/ci.yml` foi escrito. Duas correções, ambas de
fato consumado: o bloco `build` passou a carregar a **suíte de ponta a ponta**, e o CI-6 deixou de
descrever a realidade quando o Épico 1 entrou. Detalhe em cada lugar, abaixo.

## Por que isto é contrato, e não detalhe

A proteção da branch `main` referencia os jobs **pelo nome**. Renomear um job sem atualizar a proteção
não quebra nada visivelmente — o portão simplesmente **para de exigir aquele bloco**, em silêncio, e
ninguém descobre até o dia em que precisava. Os três nomes abaixo são, portanto, contrato.

## Os três

| Contexto | O que roda | Precisa de Docker? | Reprova quando |
|---|---|---|---|
| `qualidade` | `next typegen` → `tsc --noEmit` → `eslint --max-warnings=0` → `prettier --check` → `vitest run tests/unidade` | ❌ | Erro de tipo, **qualquer** aviso de lint, formatação divergente, teste de unidade vermelho — **inclusive o que prova as fronteiras** (FR-006) |
| `banco` | `supabase start` → `supabase db reset` → `pnpm db:tipos` → `git diff --exit-code lib/tipos/database.ts` → `supabase test db` → `vitest run tests/invariantes/rls` | ✅ | Migration que não aplica do zero, **contrato de dados desatualizado** (FR-010), invariante pgTAP violada, teste negativo de RLS que passou quando devia falhar |
| `build` | `next build` → `playwright install --with-deps chromium` → `playwright test` | ❌ | Erro de fronteira servidor/cliente — inclusive `admin.ts` alcançado do navegador (FR-005), **e só este bloco pega esse defeito** — ou **percurso de ponta a ponta vermelho** (SC-003) |

**Por que a ponta a ponta mora no `build`, e não num quarto contexto** *(2026-09-03)*: até esta data
**nenhum** dos três contextos executava Playwright, enquanto o SC-003 exigia que um defeito de ponta a
ponta barrasse o merge e o FR-013 definia `verificar:tudo` como "a sequência completa do CI, incluindo
o de ponta a ponta" — o que tornava o SC-005 insatisfazível por construção nesse caso. Achado
registrado como CHK011 e CHK012 em `checklists/entrega.md`. Decisão de Bernardo: entra no `build`, em
vez de virar um quarto contexto, porque a suíte já sobe o **build de produção** (o `webServer` do
`playwright.config.ts` roda `pnpm build && pnpm start`) — é o mesmo artefato, no mesmo job. **Custo
conhecido:** o build acontece duas vezes, uma no passo `pnpm build` e outra dentro do `webServer`. O
passo isolado é mantido de propósito: é o portão do FR-005 e falha com sinal limpo, antes de o
Playwright entrar em cena.

**Consequência para a proteção da branch:** continuam sendo **três** contextos. Nenhum nome muda —
logo, o comando de proteção abaixo permanece válido sem edição (invariante CI-1).

## Gatilhos

Roda em **todo push e todo PR** (FR-014). Push também, não só PR: enquanto o replantio não terminar e
a proteção não estiver configurada, o push é o único sinal que existe.

## Proteção da branch `main`

Aplicar **depois** de os três contextos existirem com estes nomes, e **antes do primeiro PR**
(FR-014.1). Passou a ser possível quando o repositório virou público em 26/08/2026 — antes disso a API
respondia `403 Upgrade to GitHub Pro`.

**⚠️ Corrigido em 06/09/2026.** A forma pontuada (`-F required_status_checks.strict=true`) **não
funciona**: o `gh` não monta objeto aninhado a partir de ponto e a API devolve
`422 — "required_pull_request_reviews", "required_status_checks" weren't supplied`. Descoberto ao
aplicar de verdade. O corpo vai como JSON:

```bash
cat > protecao-main.json <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["qualidade", "banco", "build"] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null
}
JSON

gh api -X PUT repos/:owner/:repo/branches/main/protection --input protecao-main.json
```

`required_pull_request_reviews` é `null` por decisão de Bernardo (03/09/2026): exigir uma aprovação
**trava um projeto de operador único**, porque ninguém aprova o próprio PR. Fecha o **CHK014**.

**Aplicada e conferida em 03/09/2026:** contextos `qualidade`/`banco`/`build`, `strict=true`,
`enforce_admins=false`, sem revisão exigida. Ver o documento 10 §2.7 para o comando de conferência e
para a consequência que segue aberta (**CHK013**: assim configurado, o portão não barra o
administrador — o que contradiz a letra do `SC-003`).

## Invariantes

- **CI-1**: os três nomes são **estáveis**. Renomear exige atualizar a proteção **no mesmo commit**.
- **CI-2**: o CI **nunca** commita. Regenera e compara; quem commita é gente (research R-3).
- **CI-3**: a versão da CLI do Supabase é **fixada** na action. CLI sem versão fixada é a causa nº 1 de
  o bloco `banco` falhar na primeira execução.
- **CI-4**: Node **22** (research R-2), coerente com `engines` do `package.json` e com a Vercel.
- **CI-5**: o bloqueio de merge MUST ser **provado** quebrando o CI de propósito uma vez, com commit
  descartável (FR-015). *Prova, não declaração* — Princípio VI.
- ~~**CI-6**~~: *"o bloco `banco` roda com o schema **vazio** nesta fatia; um verde aqui prova que o
  encanamento funciona, não que há invariante protegida."* — **deixou de valer em 30/08/2026**, quando o
  Épico 1 entrou antes de o Épico 0 fechar. Conferido em 03/09/2026: `supabase/migrations/` tem **seis**
  migrations e `supabase/tests/` soma **80** asserções pgTAP, mais 19 testes de RLS. O bloco `banco`
  agora protege invariante de verdade. **A ressalva se inverteu:** um vermelho aqui já não é
  necessariamente encanamento — pode ser regra de negócio violada.
- **CI-7**: o bloco `build` carrega a **ponta a ponta** (2026-09-03). Ela é o quarto defeito do SC-003 e
  a única forma de o veredito de `verificar:tudo` coincidir com o do CI (SC-005). Tirá-la do `build`
  exige recolocá-la noutro contexto **no mesmo commit** — senão o SC-003 volta a não ter como ser
  cumprido, em silêncio, que é exatamente o defeito que o CHK011 encontrou.

## Pré-requisito humano

`gh auth refresh -s workflow` **antes de empurrar** `.github/workflows/ci.yml`. Verificado em
27/08/2026: os escopos do token são `gist`, `read:org`, `repo` — sem `workflow`, o push do arquivo é
recusado (research R-5). É passo interativo do Bernardo.

**Precisão ganha em 03/09/2026:** o escopo trava o **push**, não a escrita. O arquivo foi criado
localmente sem ele. O bloqueio continua de pé, só chega mais tarde do que este contrato dizia —
depois do replantio, com tudo pronto, que é o pior momento (research R-5).
