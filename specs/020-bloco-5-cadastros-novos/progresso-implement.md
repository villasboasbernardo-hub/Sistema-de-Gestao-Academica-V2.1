# Progresso da implementação — spec 020 (Bloco 5)

## T001 · Linha de base

- `main` em `a238f43`, CI verde no run `39482845494` (os três blocos): **2.554** de unidade (184 arquivos) · **909**
  pgTAP (62) · **399** invariantes e RLS (22) · ponta a ponta **537** + 1 instável (`PEND-014-7`) + 6 pulados.
- Esquema: **84 e 84** migrations, impressão digital `39af6fd9…`, 2.201 objetos (registro do Bloco 3, igual no Bloco 4,
  que não teve migration).

## T017 · Defeitos deliberados (cada um visto reprovar e desfeito)

| # | Defeito plantado | Quem pegou | Mensagem |
|---|---|---|---|
| 1 | `consulta.ts` do catálogo sem o predicado de *Não informado* | `consulta-de-cursos.test.ts` | `estrangeiros`: não informado é a coluna NULA |
| 2 | o custo ausente vira `null` na validação da edição | `validacao-curso.test.ts` | ⚠️ AUSENTE NÃO APAGA |
| 3 | a coluna `capacitacao_didatica` de volta à consulta da lista de instrutores | `capacitacao-aposentada.test.ts` | nomeia `app/(app)/instrutores/consulta.ts` |
| 4 | a semente do panorama na versão anterior (com 2026 escrito à mão) | `ano-sem-numero-fixo.test.ts` (PEND-019-3) | `tests/e2e/panorama-de-teste.ts não tem ano fixo` |
| 5 | `registrarAcesso` sem a chamada a `registrar_acesso` | `bloco-5.spec.ts` (acessos) | *entrar não gravou o acesso* — esperado 1, recebido 0 |

E os quatro que as **guardas existentes** pegaram durante a implementação, cada um consertado sem excepcionar guarda:
folha de cliente não declarada (`fronteira-das-telas`), duas chaves de recusa sem frase (`recusas-cobrem-o-banco`,
isentas por nunca chegarem a uma tela), `decodeURIComponent` à mão no Route Handler (`sem-decode-manual`) e o ajudante
de endereço do download que a varredura não resolvia (`toda-tela-tem-caminho`).

⚠️ **O caso que discrimina o caminho do PDF** é o de 5 MB no ponta a ponta: acima dos 3 MB da Server Action
(`next.config.ts`) e dos 4,5 MB da Vercel, ele só chega ao balde porque sobe do navegador direto ao Storage.

## T018 · Verificação local (20/10/2026)

- `pnpm verificar` saiu **0**: **2.614** de unidade (189 arquivos) e o build.
- `pnpm db:reset:limpo` → `db:tipos:conferir` sem diferença → pgTAP **939** em **63** arquivos, PASS → `test:rls` **417**
  em **23** arquivos.
- Ponta a ponta dos arquivos tocados, com `--workers=2`: `bloco-5` **4 de 4, duas vezes seguidas** (regra 9.1);
  `inicio`, `andamento-ate-hoje`, `ta-fora-do-dsa` e `dsa-ver` **39 de 39**; `instrutores`, `curso-abas`, `curso-pagina`,
  `cursos`, `cursos-cadastro`, `admin-sobre-contas` e `filtros-recolhidos` **115 + 1** — o 1 era a guarda das colunas
  de `admin-sobre-contas`, que contava os cabeçalhos da página inteira e passou a contar os da lista (sete, com
  *Acessos*); depois dela, `admin-sobre-contas` **21 de 21**.
- A suíte inteira de ponta a ponta roda no CI (nesta máquina ela não fecha por memória — Bloco 3).
- **O ETL refeito sobre as migrations** (`python -m scripts.etl.executar --ambiente local`, planilha da v2.0): carga
  APROVADA, 177 instrutores, **29** com texto de capacitação, **29** convertidos pela mesma função do banco, **0** a
  corrigir — o segundo caminho da conversão (o ETL carrega o texto depois das migrations).

## Reversão provada (DoD 6), 20/10/2026

Na base local limpa, com as três migrations: **2.237 objetos, `1ba390aa…`**. Aplicado o plano de reversão escrito nos
cabeçalhos, numa transação: **2.201 objetos, `39af6fd9…`** — a impressão digital da `main` de partida, exata.
⚠️ **O plano da M1 estava errado num passo, e a prova o achou**: `delete from storage.buckets` é recusado pelo gatilho
`storage.protect_delete` (`42501`, *"Use the Storage API instead"*). O cabeçalho foi corrigido (só comentário; a
migration ainda não tinha ido ao remoto): pela API do Storage, ou com `set local storage.allow_delete_query = 'true'`
na mesma transação — e só com o balde vazio.
