# Quickstart — validar o Bloco 2

*19/10/2026. O roteiro de conferência de Bernardo sai daqui (`roteiro-de-conferencia.md`, com os números do dia).*

## Pré-requisitos

- `pnpm install` (sem pacote novo); stack local de pé (`pnpm db:start`).
- **Antes de todo e2e:** `pnpm db:reset:limpo` (o local pode estar com a cópia do remoto — memória *e2e local exige
  base limpa*).
- `pnpm db:tipos` depois das migrations, e `git add lib/tipos/database.ts` antes do `verificar:tudo`.

## Comandos

| O quê | Comando |
|---|---|
| Unidade | `pnpm test:unidade` |
| pgTAP | `pnpm test:invariantes` (inclui 137 a 140) |
| RLS com sessão real | `pnpm test:rls` |
| E2E dos itens | `pnpm exec playwright test tests/e2e/ta-fora-do-dsa.spec.ts tests/e2e/turmas-situacao.spec.ts tests/e2e/turmas-arquivar.spec.ts tests/e2e/turmas-painel.spec.ts tests/e2e/dsa-cartao-do-papel.spec.ts tests/e2e/andamento-ate-hoje.spec.ts --workers=2` |
| Tudo, como o CI | `pnpm verificar:tudo` (apagar `.next` antes, pelo OneDrive) |

## Cenários (cada um por clique)

1. **TA fora do DSA** — *Turmas* → turma → *Disciplinas* → *TA fora do DSA* → 5 TA, hoje, observação → gravar.
   Esperado: andamento *"· 5 fora do DSA"*; `/inicio` e `/turmas` +5; DSA da semana: situação +5 sem cartão novo.
   *Desfazer* → tudo volta. ⚠️ **Grava no banco.**
2. **Observação** — ficha → *Trocar situação* → *Concluída* com observação → gravar. Esperado: *Histórico da
   situação* com *"Ativa → Concluída"*, quem, quando, a observação. ⚠️ **Grava.**
3. **Arquivar** — ficha → *Arquivar turma* → aviso de não concluída → confirmar. Esperado: some de `/turmas`, do
   `/inicio`, da aba *Grade* do curso e do filtro de `/atividades`; `/turmas` → *Mostrar arquivadas* → aparece com o
   selo; ficha e DSA só leitura. Como Admin: *Desarquivar*. ⚠️ **Grava.**
4. **Painel** — `/turmas`: os cinco números e os três avisos; filtrar por curso e ver acompanhar.
5. **Nome no DSA** — *Disciplinas* → disciplina → *Editar* → *Nome no DSA* → gravar. Esperado: cartão da tela, do
   papel e da planilha com o nome do DSA; o quadro de CH com o nome inteiro; técnica e local preservados. ⚠️ **Grava.**
6. **Ordem do quadro** — DSA de uma semana com IV, V, IX → *Imprimir*: IV, V, IX.
7. **Cartão de 1 TA** — o papel de uma semana com aula de 1 TA de nome longo: o instrutor dentro do cartão.
