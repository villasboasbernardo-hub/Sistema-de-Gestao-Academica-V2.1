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

1. **TA fora do DSA** — *Turmas* → turma → *Disciplinas* → *TA fora do DSA* (a data já vem com hoje) → 5 TA,
   observação → gravar. Esperado: a confirmação na ficha; andamento *"N TA executados · X no DSA · 5 fora do DSA"*; a
   linha da disciplina *"· 5 fora do DSA"*; card de CHT, aba *Avaliações*, `/inicio` e `/turmas` (progresso e saldo)
   +5; DSA da semana: situação +5 sem cartão novo. *Desfazer* → as somas voltam e o registro continua na lista,
   marcado *desfeito*. ⚠️ **Grava no banco.**
2. **Observação** — ficha → *Trocar situação* → *Concluída* com observação → gravar. Esperado: *Histórico da
   situação* com *"Ativa → Concluída"*, quem (o nome, ou *"outra conta"* para quem não lê contas), quando, a
   observação. ⚠️ **Grava.**
3. **Arquivar** — ficha → *Arquivar turma* → aviso de não concluída → confirmar. Esperado: some de `/turmas`, do
   `/inicio`, da aba *Grade* do curso (e da turma pré-selecionada dela), de *"Turmas com teto excedido"*, do filtro de
   `/atividades` e da cascata de `/disciplinas`; continua na ficha do instrutor e em `/admin/salas`; `/turmas` →
   *Mostrar arquivadas* → aparece com o selo; ficha e DSA só leitura, com *Imprimir* e *Baixar planilha de
   contingência* ainda funcionando. Como Admin: *Desarquivar*. ⚠️ **Grava** — e ⚠️ **no preview a turma arquivada
   entra na contagem que o desenho da M4 precisa**: arquivar no preview é dado real do remoto.
4. **Painel** — `/turmas`: os cinco números e os três avisos (o de conflito, com outra turma ou dentro da própria);
   filtrar por curso e ver acompanhar.
5. **Nome no DSA** — *Disciplinas* → disciplina → *Editar* → *Nome no DSA* (a prévia do cartão mostra o resultado) →
   gravar. Esperado: cartão da tela, do papel e da planilha com o nome do DSA; o quadro de CH com o nome inteiro;
   técnica e local preservados. ⚠️ **Grava.**
6. **Ordem do quadro** — DSA de uma semana com IV, V, IX → *Imprimir*: IV, V, IX.
7. **Cartão de 1 TA** — o papel e a tela de uma semana com aula de 1 TA de nome longo: o instrutor dentro do cartão.
