# Plano — spec 023 (Bloco 8): o Calendário em Atividades e desfazer feriado no DSA

**Ramo:** `fix/BLOCO-8-calendario` (worktree fora do OneDrive, `C:\sis11\bloco-8`, pelo `cannot stat 'specs'` da
memória do OneDrive). **Um PR.** **Banco:** M1 (acrescenta) e M2 (recria view, resultado igual) — `contracts/banco.md`.

## Contexto técnico

Next.js 16 / React 19, Server Components; escrita por Server Action com Zod na 1ª linha; Supabase com RLS; Vitest,
pgTAP, Playwright. Nada de pacote novo.

## Verificação da constituição

| Princípio / regra | Como este plano cumpre |
|---|---|
| Regra 1 (documento 04) | `RN-EVT-02` e `RN-EVT-04` intocadas; o impacto continua decidindo |
| Regra 2 (escopo) | calendário letivo é insumo do DSA e do saldo — CIAARA-11 |
| Regra 3 (paridade) | item 1 é defeito; item 2 é paridade (calendário da v2.0); tipo e turmas escolhidas, pedidos nominais |
| Regra 4 (nada apagado) | desfazer, inativar e tirar turma = `status = 'inativo'`; sem `for delete` |
| Regra 8 (parâmetro é dado) | o calendário é dado; o tipo vem de `config_listas` |
| 9 (fronteira do domínio) | `lib/dominio/calendario.ts` TS puro |
| 9.4 (portão) | M1 só acrescenta; M2 sem mudança de resultado, provada antes do remoto |
| Gotcha 5.1 | `grant execute` do gerador `FTU-` |
| Gotcha 10 | `security_invoker` redeclarado na M2 |
| Gotcha 12 | a escolha de turmas é por marcação (sem `<select>` de turma); a de tipo/impacto fica em arquivo sem a palavra turma |
| "Tela sem caminho clicável" | a aba Calendário pelo clique na aba; o desfazer, na faixa do DSA |

## Decisões de desenho (pesquisa)

- **R-1 · O tipo** — `feriados.tipo_parada_id` → `config_listas`/`tipos_parada` (D-1). O rótulo exibido sai de
  `rotulo_exibicao`; linha antiga, pela sigla do nome (`tipoDaLinha` em `lib/dominio/calendario.ts`, a mesma regra do
  `like tp.valor || ' — %'` da view).
- **R-2 · A abrangência** — `feriado_turma`; o domínio recebe `turmasEscolhidas: readonly string[]` (vazio = todas) e
  decide `alcancaTurma`. As leituras pedem o embutido `feriado_turma(turma_id, status)`; um auxiliar único
  (`lib/calendario/abrangencia.ts`) tira as turmas ativas da linha.
- **R-3 · Leitores de capacidade com várias turmas** (`montarPanorama`, `comAndamento`, avisos): o insumo deixa de ser
  `string[]` e passa a ser a lista de feriados com abrangência; cada turma recebe as datas que a alcançam
  (`datasQueAlcancam(feriados, turmaId)`). `andamentoDaTurma` não muda.
- **R-4 · Recusa de aula** (`lib/acoes/dsa.ts`): as duas leituras do calendário passam a trazer a abrangência e filtram
  pela turma do lançamento antes de chamar `recusaDeAulaNoDia`/`motivoDoBloqueio`.
- **R-5 · DSA** (`dsa/leitura.ts`): a leitura do período filtra os feriados pela turma (grade, papel e planilha herdam);
  a faixa recebe os feriados de dia inteiro da semana com `destino: "feriado"`, `global: true` e a marca
  `restrito`.
- **R-6 · Permissão na faixa** — `ControleDeParadas` ganha `podeDesfazerGlobal` (`calendario.editar`): sem ele, o
  feriado e a parada global aparecem sem o botão. O desfazer de feriado abre `DialogoConfirmacao`.
- **R-7 · Ações do calendário** — `lib/acoes/calendario.ts`: `gravarLinhaDoCalendario` (cria/edita, com as turmas),
  `mudarSituacaoDaLinha` (inativar/reativar, com a contagem de lançamentos no dia para reativar),
  `lancamentosNoDia`. Validação em `lib/validacao/calendario.ts`. O *Parar dia* da aba chama `pararDia` com
  `alcance: "todas"`; o esquema passa a aceitar `turmaId` nulo **só** com `alcance: "todas"` sem TR (a ação já não usa a
  turma nesse caminho, a não ser para o TR, que a aba não oferece — D-8).
- **R-8 · A aba** — `/atividades?aba=calendario&ano=` (contrato de URL ganha `aba` e `ano`); `AnoDoPainel` aceita
  `rota="/atividades"`. Folhas de cliente: `TabelaDoCalendario` (ações por linha), `DialogoDaLinha`,
  `PararDiaDoCalendario`.
- **R-9 · Sininho** — módulo `calendario` em `app/(app)/avisos/leitura.ts`: feriado de dia inteiro ativo com lançamento
  no dia (lido de `vw_ocupacao_ta` nas datas dos feriados ativos do ano), só para `calendario.editar`.
- **R-10 · Medição do item 3** — cópia `remoto-20261022-215736.sql` restaurada no local; capacidade e saldo das turmas
  com o `FER-000024` ativo × inativo, por um script de prova que chama o mesmo `andamentoDaTurma` (`antes-depois.md`).

## Modelo de dados

Ver `contracts/banco.md`. Estados: linha do calendário `ativo ⇄ inativo`; ligação turma `ativo ⇄ inativo`.

## Validação (quickstart)

`roteiro-de-conferencia.md` (passos por clique) e os e2e:
`tests/e2e/calendario.spec.ts` — (a) parar todas as turmas pelo DSA → dia bloqueado → desfazer pelo DSA → lançar aula
no dia; (b) aba Calendário: cadastrar, inativar, reativar, com o banco conferido; (c) Operador sem a aba e sem o botão;
(d) feriado de turmas escolhidas bloqueia uma turma e não a outra.

## Riscos

- Os 7 leitores precisam todos da abrangência; um esquecido faria a capacidade contar feriado restrito para todas.
  Guarda: `tests/unidade/calendario-abrangencia.test.ts` varre `app/` e `lib/` (sem comentário) e exige que toda
  leitura `.from("feriados")` peça `feriado_turma`.
- e2e sob carga (`PEND-014-7`): isolar antes de chamar instável.
