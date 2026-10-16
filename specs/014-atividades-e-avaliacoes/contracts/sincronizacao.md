# Contrato — a sincronização com as planilhas depois desta spec (FR-015/016/022/025.5/031.8/036/036.1/042/045/046)

Comando inalterado: `python -m scripts.carga_dsa.sincronizar --rodada <pasta>`. Os princípios da
VIRADA-1 continuam (substituir, não somar; reexecutável; cadastro só pelo lote de decisões; turma
fora de `fontes.json` não é tocada).

## O que ela NUNCA altera (D-CUR-1) — e como se prova

`disciplinas.carga_horaria_tempos`, `unidades_ensino.ch_prevista_tempos`, `avaliacoes_curriculo.*`
com origem `curriculo`, e a **quantidade** de disciplinas/UEs/itens. `sincronizar.py` tira a
**impressão digital do catálogo** (md5 das três tabelas, ordenadas por código) **antes da primeira escrita e
depois da última, na mesma execução**, e aborta se mudar; `verificar.py` a relata (SC-008) *(analyze de 14/10/2026)*. Mudança de catálogo é migration, nunca rodada.

## O que passa a gravar (tabela de R-14), e as regras de casamento

| Linha da planilha | Destino | Casamento |
|---|---|---|
| prova (`1P`, `AV1`, `PE`, `PM`…) com disciplina | `avaliacoes` + `avaliacao_curriculo_id` | **pelo COD da prova** — a coluna U.E. da aba PREENCHIMENTO (`PM1`, `PP`, `T`, `AV1`…), normalizado (`PM1` = `PM 1` = `PM-1`) — ↔ instrumento e `numero` do item, **dentro da disciplina**; **a descrição só desempata** (RN-AV-10). COD sem número: o único item do instrumento, ou, havendo vários, a ordem cronológica de aplicação, 1ª aplicada = nº 1 (RN-AV-11). O de-para COD → instrumentos é dado único, `lib/dominio/avaliacoes/instrumentos.json`. **O número:** COD de instrumento **com** número (`PM2`) → o item PM 2; COD de instrumento **sem** número (`PM`) → o único item do instrumento, ou o **menor número livre** em ordem cronológica — o número escrito na descrição **não conta** aqui, porque a descrição só desempata o **instrumento** (P3). Leituras de 15/10/2026 (`aprovacoes-pendentes.md`; a do `T` e a P10 **aceitas** em 16/10/2026): **`T`** → candidatos TG e TI, a descrição desempata quando a disciplina tem os dois, e o número do `T` é a **ordem dos trabalhos** da disciplina, não o número do item (CAHO VI: `T1` = TI 1, `T2` = TG 1, `T3` = TG 2); o número só vem da descrição quando ela nomeia o instrumento com número (*"TG2 – …"*) (P1); **`AV`** → vale **só** o instrumento que a **descrição nomeia** — o prefixo (*"PM4 – …"*) ou o nome (*"PROVA PRÁTICA"*) —, **nunca por eliminação** (D6.1); a descrição que não nomeia deixa a prova sem casar; com `AV`, o número escrito na descrição vale (D6.1), e o do `AV` é só a ordem da avaliação (P2); **quando a descrição não nomeia, a coluna T/E da linha desempata o `AV`** (P10, **aceita por Bernardo em 16/10/2026**; exemplo medido: C-Ap-FR X, `AV1`/`AV2`/`AV3` com o currículo só com a PP 3 — a T/E «PP» liga a PP 3); numeradas e sem número misturadas → a sem número pega o menor número livre (P3). Não casou → sem item, **erro de planilha**, com **COD + descrição + itens do currículo lado a lado**; casou com TA diferente → com item, e a diferença na lista (na prova em N sessões, a soma das sessões). **O instrumento casou e não sobrou item livre:** se o instrumento **passou do previsto** → sem item, e **INFORMAÇÃO, não erro** (*"currículo prevê 1 PP; aplicadas 2"*, RN-AV-14); se **não** passou — o COD pede um número que o currículo não tem, ou repete um item já ligado — → **não casa**, na lista de erros e em `provas-sem-casar.md`, com os itens lado a lado (caso real: CAHO XIX `PP2`, currículo só com a PP 3). *(Emendado em 15/10/2026 pela RN-AV-10, RN-AV-11 e RN-AV-14, e reescrito no mesmo dia pelo comportamento do código: a primeira redação dizia "`AV` → todos os itens da disciplina", que admitiria a eliminação, e não dizia o número do `T` nem a prova sem item livre que não passou do previsto. Antes da emenda, dizia "instrumento (pela descrição, sigla não decide) + número de ordem dentro da disciplina na planilha ↔ `numero` do item do mesmo instrumento. Não casou → sem item, erro de planilha; casou com TA diferente → com item, e a diferença na lista", e a prova a mais era erro.)* |
| prova em **N sessões de aplicação** (RN-AV-12): mesma disciplina, mesmo COD e a **mesma descrição**, em dias consecutivos ou próximos — vale para PP, T/TG e qualquer prova | a 1ª sessão em `avaliacoes`; **as sessões 2..N em `sessoes_de_aplicacao`** (opção A do desenho, aprovada em 16/10/2026), com o código da linha delas (`…-L<linha>-SA`); a linha antiga da sessão (`…-L<linha>-V`) sai do plano e a rodada a tira com a marca de saída | a sincronização **agrupa** as sessões: cada uma a até `avaliacao.janela_sessoes_dias` dias corridos da anterior (**7**, dado do banco, D-9). Só a **1ª** sessão casa com o item (linha acima); as sessões 2..N **não são avaliação**, ficam **fora da lista de erros** e são listadas como **informação** (*"sessão k da prova de dd/mm — gravada como sessão de aplicação da prova"*). A sessão nascida na tela (`SAP-`, o DSA ou *"juntar como sessão"*) **não é tocada**. A sessão que traz OUTRO aplicador na planilha vira informação: vale o da prova. **O aplicador:** a sessão seguinte **sem** nome de aplicador na linha (nem fiscal) **herda** o da 1ª sessão; a que traz um nome **fora** do cadastro fica **sem** aplicador (e a pendência não bloqueante do aplicador, P6) — não herda. **A vista é da prova:** só a 1ª sessão é candidata a receber vista, e a decisão explícita de vista (lote de decisões ou aba DATAS AVALIACOES) que aponta a data de uma sessão **seguinte** vai para a 1ª sessão |
| vista (`VP`, `VP4`…) | `vistas_de_avaliacao` da prova anterior da mesma disciplina, `numero = n+1` | a prova aplicada mais recente da disciplina sem sessão naquela data. Registrada de **qualquer** instrumento: *"se a planilha trouxer vista, registra"* (RN-AV-13) |
| `(FISCAL)` no nome | `avaliacoes.fiscal_id` (ou `nome_fiscal_externo`) | como hoje para o responsável, sem trocar o aplicador |
| `A / B` em instrutor | `outros_instrutores[]` | o primeiro casado é o responsável; os demais vão para o vetor **como vieram** |
| FR/LA/LP/NT/RC/PF, só da turma | `dias_parados` (prevista) | descrição → `tipos_parada` |
| idem, todas as turmas, dia inteiro | `feriados` (como hoje) | — |
| idem, todas as turmas, parte do dia | `dias_parados` com `turma_id` nulo | — |
| MONITORIA, PORTUGUÊS, BDA, BDF | `atividades_nao_letivas` `Apoio_Individualizado` | descrição → tipo |
| RECEPÇÃO · APOINST · DEPARTAMENTO DE ALUNOS | TAD · AEC · TAD | categoria como hoje; o **tipo** passa a *Recepção aos alunos* e *Apoio à Instrução* (D-2, FR-021); Departamento de Alunos segue *Administração* |
| evento presente em todas as turmas | **uma linha por turma** (FR-015); global só pelo lote | — |
| responsável que não casa com o cadastro | **pendência do lote de decisões só na aula de disciplina** com técnica EO (FR-016); a aula prática (AP) segue pendência, como hoje (P7). Nas **atividades** — palestra, AEC, estudo individual, monitoria e orientação/Apoio Individualizado, e TAD e TR (P8) —, `responsavel_externo` com o texto **como veio**: nome livre, sem cadastro, sem pendência e sem alerta (RN-RESP-1); a célula **só de traços** (`------`) é **vazia**, não nome livre; a chave `responsavel_externo_aceito` do lote de decisões fica **sem efeito** (o texto entra igual com ou sem ela). Na avaliação: fiscal e quem conduz a vista aceitam nome livre; o aplicador fora do cadastro segue pendência **não bloqueante** (P6) | *"texto que não casa com o cadastro só vira pendência se a linha for aula de disciplina com EO"* (RN-RESP-1). *(Emendado em 15/10/2026 pela RN-RESP-1; dizia "responsável externo que não casa → **pendência do lote de decisões** (FR-016)", para toda linha.)* |
| tempo de prova/vista onde o currículo é **mudo** | `avaliacoes_curriculo_turma` `sugestao_planilha` | só se o item não tem tempo de origem `currículo` e não há `arbitrado` confirmado; nunca sobrescreve confirmado |

Linhas TAD gravadas antes como dia parado (`resolver.py:539–557`) e as AEC de `vista_extra_como_aec`
saem por exclusão lógica com a marca *"[RECLASSIFICADO PELA SPEC 014]"* e entram no destino novo —
na rodada, não por migration (FR-022, princípio "a planilha manda").

## A lista de erros de planilha (FR-036.1, §11-B)

Arquivo `erros-de-planilha.md` na pasta da rodada (`planilhas-de-origem/rodadas/<data-hora>/`, fora
do git), uma tabela por turma: `disciplina · o que diverge · planilha · currículo · o que o sistema
fez`. Entram: CH de disciplina e de UE diferente; prova a menos; vista a mais ou a menos; TA de prova
diferente (na prova em N sessões, a soma das sessões); linha sem correspondente (`XX RECON`); prova que
não casa, com **COD + descrição + itens do currículo da disciplina lado a lado**; aula lançada em dia que
a mesma planilha marcou parado; feriado/licença contados de modo diverso (M-8). **O lançamento entra
mesmo assim como fato**, sem item quando não casa. `sincronizar.py` imprime o caminho do arquivo no fim.

**Emenda de 15/10/2026 — o que NÃO é erro e sai como informação:** a **prova a mais** que o currículo
prevê (*"currículo prevê 1 PP; aplicadas 2"*, RN-AV-14) e as **sessões 2..N** de uma prova em N sessões
(RN-AV-12). A **vista não lançada** só entra na lista quando o instrumento da prova exige vista (PM, PO)
ou não é conhecido (`AV`); a da prova sem item cujo COD só nomeia instrumentos sem vista (PP, T, TG,
TI) não entra (RN-AV-13). *(Emendado em 15/10/2026; dizia "prova/vista a mais ou a menos", e a prova a
mais era erro.)* As linhas de informação ficam na **mesma** `erros-de-planilha.md`, com *"informação — não é
erro de planilha"* na coluna do que o sistema fez.

**As outras listas da rodada** (na mesma pasta, fora do git — podem trazer nome de pessoa):
- `pendencias-de-responsavel.md` — só as pendências que **sobram** pela RN-RESP-1: a **aula** com
  responsável fora do cadastro (bloqueante) e o **aplicador** fora do cadastro (não bloqueante, P6); e a
  seção *"Responsável de nome livre gravado"*, com o texto que entrou como nome livre em atividade e a
  coluna **«aula de disciplina com EO?»** (se a chave da linha é de disciplina do curso **e** a técnica do
  catálogo é EO — só esses pediriam instrutor habilitado se fossem aula).
- `provas-sem-casar.md` — as provas que **não casam**, com COD + descrição + itens do currículo lado a
  lado e o motivo; **só o que ficou no plano** — o que a virada da turma tira (da data dela em diante) não
  entra.

**A lista por turma para os operadores** (`erros-por-turma/`, um `.md` por turma e `erros-por-turma.xlsx`,
na pasta da rodada, fora do git), gerada pelo script versionado `scripts/carga_dsa/erros_por_turma.py` a
partir de `erros-de-planilha.md`, traz as colunas **«Prioridade»** e **«Resposta do operador»** (esta
vazia, para o operador preencher). Saem com prioridade **«informação»**: a seção *Catálogo (aba BD
DISCIPLINAS)* — inteira, até a P9, que pergunta se o código inexistente (erro de PROCV) e a técnica (T/E)
da avaliação, que são erro real, ficam de fora dela —, a sessão seguinte de uma prova (RN-AV-12), a prova a
mais (RN-AV-14) e a disciplina sem avaliação do currículo carregada (A4.7, pendente na Divisão). **Nada da
data de virada da turma em diante** entra (a `virada` de `scripts/carga_dsa/fontes.json`): dali para
frente a turma lança no sistema. *(Acrescentado em 15/10/2026.)*

**A conta das provas** (`scripts/provas/conta_das_provas_da_rodada.py`, lendo o banco local e a
`erros-de-planilha.md`) põe cada avaliação viva `DSAP-` em **uma** categoria, nesta ordem: 1 ligada a
item · 2 OD · 3 editada na tela · 4 disciplina sem avaliação do currículo (A4.7) · **5 sessão seguinte
(RN-AV-12)** · **6 prova a mais (RN-AV-14)** · **7 não casa** · **8 sem par na planilha atual**. A
categoria 5 é nova em 15/10/2026, e as seguintes andaram um número (antes: 5 prova a mais · 6 não casa ·
7 sem par); a prova a mais passa a ser lida da linha de informação por disciplina (*"curriculo preve N X;
aplicadas M (datas)"*).

## Reexecução

Rodar a mesma rodada duas vezes dá **zero mudança**, inclusive em `dias_parados`,
`vistas_de_avaliacao` e `avaliacoes_curriculo_turma` (sugestão não confirmada é idempotente;
confirmada não é tocada). Provado no banco por `provar_sincronizacao_no_banco.py` (Docker local); `provar_carga_dsa.py` fica com as recusas em memória. *(corrigido em 13/10/2026, na revisão adversarial do `tasks.md`)*.
