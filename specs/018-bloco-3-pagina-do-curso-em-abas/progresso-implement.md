# Progresso do implement — spec 018 (Bloco 3)

## Linha de base (T001), 19/10/2026 23:52, sobre `e9984c7` (a `main` de partida `33efec0` mais os documentos)

- Esquema no banco local limpo: **`bb6e48a83cd7a0aaa8fe74fe95ef8d24`, 2.137 objetos** (`scripts/provas/impressao_digital_do_esquema.sql`).
- pgTAP no CI da `main` (run `39351124791`): 885 asserções em 61 arquivos.

## Testes vistos falhar antes da mudança

- `tests/unidade/contrato-de-parametros.test.ts`: 3 casos vermelhos (as seis abas, os três parâmetros) antes de `contrato.ts`.
- `tests/unidade/regime-da-turma.test.ts`: o módulo não existia (`Cannot find package`).
- `tests/unidade/recusas-cobrem-o-banco.test.ts`: as cinco chaves novas do banco sem tradução.
- `tests/unidade/entrada-ativa.test.ts`: `/disciplinas` ainda acendia *Disciplinas*.
- `tests/unidade/fronteira-das-telas.test.ts`, `texto-tenue.test.ts`, `endereco-de-turma-unico.test.ts`: a folha nova, as
  dicas sem `veste:` e um caminho `/turmas/` escrito à mão — os três consertados no código, nenhuma guarda excepcionada.
- pgTAP `010` e `105`: as enumerações de tabela e de policy de oferta, emendadas com a regra dos valores esperados (a).

## Medições

- Depois da migration, banco local limpo: **`39af6fd99bca88710a7af23efbdca7cf`, 2.201 objetos**.
- pgTAP: **909 asserções em 62 arquivos**, verde.
- RLS com sessão real (`regimes-nomeados.test.ts`): **20 de 20**, duas vezes seguidas (regra 9.1).
- Unidade: **2.501 casos em 178 arquivos**, verde.
- O embed `regime:regimes_de_horario!turmas_regime_do_proprio_curso_fk(...)` chega como **objeto** (medido por REST no banco
  local); o tipo gerado o lê como lista, e `regimeEmbutido` aceita as duas formas.
- Remoto, só leitura (20/10/2026): **0** atividades globais, **0** paradas globais, 21 paradas de turma, **19** das 29 turmas
  sem lançamento — a trava por lançamento não prende turma nenhuma por item global hoje.

- Invariante com sessão real (`tests/invariantes/regime-da-turma-no-dsa.test.ts`): **3 de 3** — o relógio do DSA da
  turma com o Regime B tem 9 tempos e começa às 07:15; o da turma sem escolha, 8 às 07:30; e os TA do dia das ações do
  DSA são 9 e 8.
- Guarda de unidade `tests/unidade/curso-sem-acompanhamento.test.ts`: **3 de 3**.

## Defeitos deliberados (T031), 20/10/2026 — cada um pego pela prova certa e desfeito

| # | Defeito plantado | Onde | Quem pegou |
|---|---|---|---|
| a | guarda do regime sem a trava do relógio em uso | função no banco local | pgTAP 142, asserção 21 (*"com lançamento numa turma que o usa, o relógio do regime trava"*) |
| b | guarda da escolha da turma sem a trava de lançamento | função no banco local | pgTAP 142, asserção 20 (*"com lançamento, a turma não troca de regime"*) |
| c | policy de criar regime sem `horarios.criar` | policy no banco local | RLS: *"visualizacao NÃO cria"* e *"chefe NÃO cria"* (2 reprovações) |
| c2 | guarda do regime sem a conferência de `horarios.desativar` | função no banco local | RLS: *"o operador NÃO inativa"* (o caso que discrimina) |
| d | o DSA e as ações ignorando o regime da turma | `dsa/leitura.ts` e `lib/acoes/regime-do-dia.ts` | invariante: os dois casos da T1 (*expected 8 to be 9*); a T2 segue verde |
| e | a view dos dias parados sem o regime da turma (o corpo de antes) | view no banco local | pgTAP 142, asserção 17 (o caso que discrimina) |
| f | a aba Avaliações do curso com o quadro da turma | `AbaAvaliacoes.tsx` e `page.tsx` da `main` | guarda `curso-sem-acompanhamento`: 2 reprovações; o controle positivo segue verde |

Os de banco foram desfeitos por `supabase db reset`; os de código, restaurando o arquivo (diff vazio conferido).

## Reversão (T032), 20/10/2026

- Base limpa com a migration: `39af6fd9…`, 2.201 objetos → `reversao.sql` por `psql -v ON_ERROR_STOP=1` →
  **`bb6e48a83cd7a0aaa8fe74fe95ef8d24`, 2.137 objetos** — a linha de base da T001.
- Com um regime cadastrado, a reversão **recusa** (*"a reversão com dado é decisão de Bernardo"*) e o esquema fica em
  2.201.

## A ponta a ponta local (T034)

A rodada dos 10 arquivos afetados (107 casos, 2 processos) foi **interrompida pela falta de memória da máquina** depois
do caso 107, com 7 reprovações. **Quatro eram quedas do navegador** (`Target crashed`, `worker process exited`), três
delas em `turma-disciplinas` e uma em `tetos-da-turma`, com *"The destination stream closed early"* no servidor — a
assinatura da memória esgotada. Das outras três, **duas eram do teste e foram corrigidas**: a busca do
redirecionamento (o nome da disciplina limpa não contém *"Limpa"*; agora busca pelo código) e as turmas do caso do
regime (em 2026 a atividade **global** que `semearCursos` cria em 10/05/2026 trava a escolha — C-8; a amostra foi para
2045). **A terceira ficou sem correção**: o *Limpar filtros* da aba Disciplinas manteve o número "2", no mesmo
intervalo em que o servidor perdia respostas por memória — fica para o CI dizer se é queda ou defeito. A rodada não foi
repetida aqui (a máquina não tem memória para ela).
