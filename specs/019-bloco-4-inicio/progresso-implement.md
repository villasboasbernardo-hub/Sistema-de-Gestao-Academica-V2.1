# Progresso do implement — spec 019 (Bloco 4)

## Linha de base (T001), 20/10/2026, sobre a `main` de partida `747b78b`

- CI da `main` (run `39408773799`): **2.504** de unidade em 179 arquivos · **909** pgTAP em 62 · **399** invariantes e RLS
  em 22 · **532** casos de ponta a ponta (524 passados, 2 instáveis, 6 pulados).
- **Sem migration neste PR**: `git diff --stat origin/main -- supabase/ lib/tipos/` devolve **zero** arquivo.

## Testes vistos falhar antes da mudança

- `tests/unidade/carrossel.test.ts`, `dsa-da-semana.test.ts` e `submenu-da-lateral.test.ts`: **3 arquivos vermelhos**
  (`Cannot find package '@/lib/dominio/…'`) antes dos três módulos.
- `tests/unidade/contrato-de-parametros.test.ts` e `esquema-de-parametros.test.ts`: vermelhos com `ano` no contrato até a
  emenda do documento 25 e dos valores esperados.
- `tests/unidade/dsa/ead-puro.test.ts`: o controle positivo reprovou quando o aviso da turma EAD saiu de
  `inicio/page.tsx` para `CartaoDaTurma.tsx` — a lista das quatro telas foi emendada para o arquivo novo.
- Guardas de fronteira (`fronteira-casca`, `fronteira-componentes`) e a vitrine (`FR-027`): as duas folhas novas e a
  amostra do carrossel em `/estilo`.

## Medições

- Unidade: **2.534 casos em 182 arquivos** (+30 casos, +3 arquivos sobre a linha de base).
- pgTAP: **909 em 62**, e invariantes/RLS: **399 em 22** — os mesmos da linha de base, como devem.
- Ponta a ponta, base limpa, um processo:
  - `inicio-bloco-4.spec.ts`: **7 de 7**, e **7 de 7 de novo** em seguida, sem reset (regra 9.1, idempotência).
  - `inicio.spec.ts` + `inicio-bloco-4.spec.ts` + `dsa-ver.spec.ts`: **43 de 43**.
  - `andamento-ate-hoje`, `ta-fora-do-dsa`, `cards-levam-a-aba`, `lateral`, `shell`, `turmas-arquivar`,
    `curso-pagina`, `cursos-cadastro` (dois processos): **79 de 79**.
  - A suíte inteira roda no CI (a memória desta máquina não a fecha — §Épico 5.5 do CLAUDE.md).
- ⚠️ **Achado de ambiente, não do produto:** a primeira rodada reprovou 7 de 7 no login — um `next start` **órfão** na
  porta 3100 (processo de 00:39, de uma rodada interrompida por memória) servia uma `.next` já apagada. Encerrado o
  processo, 7 de 7. É o gotcha 7 por outro caminho: a porta ocupada decide contra que servidor a suíte roda.
- ⚠️ **Achado de teste:** a manchete do DSA nasceu com `data-turma`, e os percursos antigos procuram o **cartão** por
  `[data-turma=…]` na página inteira — dois deles reprovaram por modo estrito (2 elementos). A manchete passou a ter
  `data-turma-da-manchete`.

## Defeitos deliberados (T014), 20/10/2026 — cada um pego pela prova certa e desfeito

| # | Defeito plantado | Onde | Quem pegou |
|---|---|---|---|
| a | a turma EAD pura volta a ter DSA na semana | `lib/dominio/dsa-da-semana.ts` | unidade *"fica fora: EAD pura"* **e** e2e *"a EAD não entra"* (manchete de `T3`: esperado 0, recebido 1) |
| b | o carrossel passa sozinho com «reduzir movimento» | `lib/dominio/carrossel.ts` | unidade *"não passa com o «reduzir movimento» do sistema"* **e** e2e (`data-passando` esperado `false`, recebido `true`) |
| c | a lateral volta a listar a turma arquivada | `app/(app)/layout.tsx` | e2e do submenu (link `T4` esperado 0, recebido 1) |
| d | o Início sem o filtro de ano | `app/(app)/inicio/page.tsx` | e2e do ano vigente (cartão da planejada do ano seguinte: esperado 0, recebido 1) |

Restaurados os quatro, `git status` limpo.

## Ajustes da conferência de 20/10/2026 (A-1 a A-5)

- **Vistos falhar antes:** `submenu-da-lateral.test.ts` (`cursos is not iterable`: a assinatura antiga) e
  `ano-pelo-relogio.test.ts` (`Cannot find package '@/lib/dominio/cartoes-do-inicio'`); na ponta a ponta, contra o código
  de `eaa2793` (com os dois testes de unidade afastados, porque o `next build` checa os tipos do repositório inteiro),
  **9 reprovados e 8 passados** em `inicio-bloco-4`, `cards-levam-a-aba` e `turmas-painel` — os 9 são exatamente os
  casos novos ou mudados.
- ⚠️ **O teste do relógio passou de primeira na parte do ano** (`anoDoPainel("", hojeNaCiaara())` já virava em São
  Paulo); o que ele acrescenta é a virada do **submenu** e o caso das 23:59, que discrimina o fuso.
- ⚠️ **A guarda `ano-sem-numero-fixo` nasceu cega para data**: a expressão excluía o ano seguido de hífen, e o defeito
  deliberado `anoDoPainel("", "2026-10-20")` passou. Corrigida, com a data no controle positivo; agora reprova.
- ⚠️ **O caso `FR-017.6` de `inicio.spec.ts` deixou de discriminar com o A-2**: para desativar o curso a regra exige
  concluir a turma, e turma concluída não tem cartão. Passou a medir o número *Turmas no recorte*, que conta todas as
  situações, e a concluir só a turma do curso que sai.
- Depois: unidade **2.554 em 184**; `inicio-bloco-4` + `cards-levam-a-aba` + `turmas-painel` **17 de 17, duas vezes
  seguidas** (regra 9.1); `inicio.spec.ts` **12 de 12**.

| # | Defeito plantado | Quem pegou |
|---|---|---|
| a | os cartões voltam a todas as situações | unidade (2) e e2e A-2 (2 casos) |
| b | o submenu sem o filtro de ano | unidade (5); a ponta a ponta não, porque a consulta do layout também filtra o ano — duas defesas |
| c | o cartão volta ao curso | e2e A-4, `cards-levam-a-aba` caso 3 e os dois do `FR-031.2` |
| d | o Início sem o filtro de curso em oferta | e2e `FR-017.6` (o número: esperado 0, recebido 1) |
| e | o ano de hoje trocado por `"2026-10-20"` no layout | `ano-sem-numero-fixo` (depois de corrigida) |

Restaurados os cinco.
