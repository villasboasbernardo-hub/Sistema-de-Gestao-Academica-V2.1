# Contrato — a interface de comando do projeto

**Fase 1** · 2026-08-27 · fonte: `docs/fase-2/24-Estrutura-do-Repositorio-e-Convencoes.md` §7 + emenda
de 27/08/2026

Os scripts do `package.json` são a interface pública deste repositório para quem trabalha nele. O
documento 24 §7 os define **com os comentários** — e os comentários fazem parte do contrato (FR-012):
explicam *por que* cada um existe, o que nenhum nome de script consegue.

## Estado atual × alvo

| | Hoje | Alvo desta fatia |
|---|---|---|
| Scripts | **4** (`dev`, `build`, `start`, `lint`) | **26** — os 25 do documento 24 §7 + `verificar:tudo` |

## Os dois comandos de verificação — o ponto do contrato

Emenda autorizada por Bernardo em 27/08/2026 (clarificação Q2). **São dois porque prometem coisas
diferentes**, e prometer uma só era o defeito:

| Comando | Cobre | Precisa de Docker? | Promessa | Quando |
|---|---|---|---|---|
| `pnpm verificar` | typecheck · lint · format:check · test:unidade · build | ❌ Não | Rápido: **≤ 5 min** (SC-008) | A cada commit |
| `pnpm verificar:tudo` | tudo acima **+** `test:invariantes` (pgTAP) **+** `test:rls` **+** `test:e2e` | ✅ Sim | **Coincide com o CI** (SC-005) | Antes de abrir o PR |

**A regra que dá sentido aos dois:** um verde em `verificar:tudo` seguido de vermelho no CI é
**defeito da verificação**, não azar — e vira tarefa de correção. Um verde em `verificar` seguido de
vermelho no CI é esperado, se a falha estiver no bloco de banco.

> ⚠️ `verificar:tudo` **não existe no documento 24 §7** e é emenda a ele. Enquanto a emenda não for
> aplicada lá (pendência **D-7**), este contrato e o documento 24 divergem — que é exatamente o modo
> de falha que esta fatia existe para evitar. **Aplicar nos dois.**

## Ordem obrigatória dentro de `verificar`

`next typegen` (ou um `next build` anterior) **precede** `tsc --noEmit`.

Não é preferência: no Next 16, a checagem de tipos isolada acusa `Cannot find name 'LayoutProps'` até
que os tipos de rota existam. Armadilha paga em 26/08/2026 (research R-6). Quem inverter a ordem
recebe um erro que não tem relação com o código.

## Grupos e o que cada um garante

| Grupo | Scripts | Garante |
|---|---|---|
| Desenvolvimento | `dev` `build` `start` | `build` é a barreira que revela erro de fronteira servidor/cliente — o `tsc` sozinho não vê |
| Qualidade | `typecheck` `lint` `lint:fix` `format:check` `format` | Itens 1 e 2 da DoD (BRIEF §7) |
| Testes | `test` `test:unidade` `test:cobertura` `test:invariantes` `test:rls` `test:e2e` `test:e2e:ui` | `test:rls` é o **teste negativo** obrigatório: o que cada perfil **não** pode ler é negado pelo banco |
| Banco | `db:start` `db:stop` `db:reset` `db:migration` `db:tipos` `db:push` | `db:tipos` depois de **toda** migration (risco R-04); `db:migration` cria arquivo **vazio** — o SQL é escrito à mão |
| ETL | `etl:extrair` `etl:carregar` `etl:reconciliar` | Épico 2 — declarados aqui, sem uso nesta fatia |
| Composição | `verificar` `verificar:tudo` | A tabela acima |

## Invariantes deste contrato

- **C-1**: `pnpm` é o gerenciador (decisão de 26/08/2026). O `package.json` declara `packageManager`.
  O documento 06 ainda diz `npm` no critério 1 — pendência **D-1**.
- **C-2**: `engines` MUST declarar `>=22` (research R-2). Hoje **não declara**.
- **C-3**: nenhum script commita automaticamente. `db:tipos` regenera; **quem commita é gente**.
- **C-4**: `db:push` só à mão, com autorização explícita e para o ambiente certo. No fluxo normal, quem
  aplica migration é o CI.
- **C-5**: todo script novo entra **com comentário**. Script sem comentário é script que ninguém sabe
  se pode apagar.
