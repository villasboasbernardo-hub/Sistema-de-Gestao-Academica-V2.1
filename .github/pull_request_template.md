## Identificador de origem

<!-- RF-…, RN-…, RNF-…, épico ou achado. Obrigatório. Se não há origem, por que esta fatia existe? -->

## O que muda

<!-- Em uma frase, o comportamento observável que passa a existir (ou deixa de existir). -->

## Destino do requisito na v2.1

- [ ] **[PRESERVADO]** — mesma regra, mesma implementação
- [ ] **[PRESERVADO — nova implementação]** — mesma regra, mecanismo diferente
- [ ] **[ABSORVIDO PELA PLATAFORMA]** — o motor passa a garantir o que o código garantia
- [ ] **[REVOGADO — v2.1]** — motivo e substituto declarados abaixo
- [ ] **[NOVO — v2.1]** — não existia na v2.0

## Definition of Done (BRIEF §7) — todos, sem exceção

- [ ] 1. `tsc --noEmit` sem erro e `eslint` sem aviso novo
- [ ] 2. **Unidade (Vitest):** toda função de `lib/dominio/` tocada, com casos sintéticos
- [ ] 3. **Invariantes (pgTAP):** asserção nomeada por `RN-` de _Risco: Alto_ (stub rastreável é
      aceito e melhor que cobertura fingida — Princípio VIII)
- [ ] 4. **RLS (teste negativo):** para cada perfil, o que ele **não** pode ler/escrever é negado
      pelo banco. Só o caminho feliz **não** vale.
- [ ] 5. **E2E (Playwright):** percurso principal da fatia, incluindo a rota `/print/*` quando houver
- [ ] 6. Migration aplicada no preview e **revertível** (script `down` ou plano descrito abaixo)
- [ ] 7. Commits no padrão `feat(RF-…): …`

## Fronteira servidor/cliente

- [ ] Nenhum `"use client"` novo em `page.tsx` ou `layout.tsx` (só em folha — risco R-01)
- [ ] Nenhum `await` dentro de laço em `app/**` (risco R-02 — N+1)
- [ ] `lib/dominio/` continua sem `import` de supabase/next/react (risco R-10)
- [ ] `lib/tipos/database.ts` regenerado se houve migration (risco R-04)

## Plano de reversão da migration

<!-- Obrigatório quando há arquivo em supabase/migrations/. "Não se aplica" também é resposta. -->

## Como validar no preview

<!-- Passo a passo curto: em que URL entrar, com qual perfil, o que observar. -->
