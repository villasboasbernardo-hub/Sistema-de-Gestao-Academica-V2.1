# Contrato — avaliações do currículo, previsto com origem, projeção, situação e cards (US5, US6, US7, US9, US10)

## 1. O item do currículo, como a tela e o DSA o veem

```ts
type ItemDoCurriculo = {
  id, codigo, disciplinaId, ordem,
  origemItem: "curriculo" | "arbitrado",           // a origem da QUANTIDADE (D-CUR-2)
  instrumento: { sigla: "PE" | "PM" | …, rotulo, natureza: "prova" | "trabalho" | "od" },
  numero: number,                                  // Prova 1, Trabalho 2, OD 1
  ueComputada: { id, numero, origem: "curriculo" | "decisao_ciaara", decididaEm: string | null } | null,   // nulo = nível da disciplina (Q-11)
  uesAbordadas: string | null,
  taAplicacao: { valor: number, origem: Origem } | null,
  taVista:     { valor: number, origem: Origem } | null,
  fonte: { arquivo, pagina } | null,               // obrigatório se origem do item = currículo
}
type Origem = "curriculo" | "arbitrado" | "sugestao_planilha"   // literais sem acento, iguais ao CHECK do banco; a última: "a confirmar"
```

O ajuste por turma (`avaliacoes_curriculo_turma`) **sobrepõe** `taAplicacao`/`taVista` do item ao
montar o `ItemDoCurriculo` da turma; a origem passa a ser a do ajuste.

## 2. Previsto da disciplina — `previstoDaDisciplina` (`lib/dominio/avaliacoes/previsto.ts`, FR-031.10)

```ts
previstoDaDisciplina({ chCurriculo, itens: ItemDoCurriculo[] }) → {
  chCurriculo,
  avaliacao: number,                               // Σ taAplicacao + Σ taVista dos itens com tempo
  aula: number,                                    // chCurriculo − avaliacao (pode ser negativo: aviso)
  itensSemTempo: number,                           // "tempo de avaliação não definido" quando > 0 e avaliacao = 0
  arbitrados: number, sugestoesAConfirmar: number,
  porUe: Array<{ ueId, numero, ch, conteudo, prova, vista }>,   // só onde o currículo diz a UE
}
```

Texto: *"120 = 116 aula + 4 avaliação"*; com item arbitrado, o destaque *"não consta do currículo —
definido pela Divisão"*; com sugestão, *"sugestão da planilha, a confirmar"*; sem nenhum tempo,
*"tempo de avaliação não definido"*.

## 3. Projeção — `projecaoDaDisciplina` (`lib/dominio/avaliacoes/projecao.ts`, FR-031.11)

```ts
projecaoDaDisciplina({ chCurriculo, cumprido: { aula, avaliacao }, itens, aplicadas: Set<itemId>, vistasRealizadas: Set<itemId> }) → {
  restam: number,                                  // X = CH − (aula + avaliacao cumpridos)
  faltamAvaliacoes: number,                        // N = itens não aplicados (+ vistas não realizadas de itens com vista)
  tempoDasQueFaltam: number,                       // Y = Σ tempos previstos das que faltam (itens sem tempo não entram em Y)
  semTempoDefinido: number,
  sobramParaAula: number,                          // Z = X − Y
  estouro: boolean,                                // Z < 0 — alerta, nunca bloqueio
  frase: string,                                   // "restam 20 TA; faltam 2 avaliações (4 TA) → sobram 16 TA para aula"
}
```

Fronteiras testadas: Z = 0 (sem estouro), Z = −1 (estouro); item sem tempo conta em N e não em Y, e
a frase diz *"(+ 1 sem tempo definido)"*.

## 4. Situação — `situacaoDaAvaliacao` (`lib/dominio/avaliacoes/situacao.ts`, FR-050/051, Q-17)

```ts
situacaoDaAvaliacao({
  item: ItemDoCurriculo | null, aplicacao: { data } | null, sessoes: Array<{ data }>,
  prazoDias: number, hoje: string, cursoTerminou: boolean,
  disciplina: { comecou: boolean, concluida: boolean },     // para OD
}) → "concluida" | "em_andamento" | "atrasada" | "pendente" | "sem_correspondencia"
```

- Prova/trabalho: aplicada **e** (sessão registrada **ou** item sem vista) → `concluida`; aplicada sem
  sessão, ≤ 7 dias corridos da aplicação → `em_andamento`; no **8º** dia → `atrasada`; item sem
  aplicação → `pendente` até o término do curso, depois `sem_correspondencia`.
- OD: `pendente` antes do primeiro lançamento da disciplina na turma; `em_andamento` enquanto ela
  corre; `concluida` quando a disciplina é concluída pelo critério do painel da disciplina.
- `app.fn_status_vista` devolve o mesmo nos mesmos casos (pgTAP cruzado, R-8).

## 5. Contagem — `contagemDeAvaliacoes` (`lib/dominio/avaliacoes/contagem.ts`, FR-056)

```ts
contagemDeAvaliacoes({ itensPorDisciplina, avaliacoesDaTurma, sessoes, situacoes }) → {   // situacoes: Map<avaliacaoId | itemId, Situacao>, já decididas por situacaoDaAvaliacao; esta função nunca a chama
  aplicadas: N, previstas: M,                      // prova + trabalho; a disciplina sem quantidade entra em `naoDefinidas`
  naoDefinidas: number,                            // disciplinas sem item e sem arbitrado
  od: { previstas: K, emAndamento, concluidas },
  vistas: { realizadas: A, previstas: B },         // B = itens com taVista (ou com vista arbitrada)
  porDisciplina: Array<{ disciplinaId, aplicadas, previstas, itens: Array<{ item, situacao, data? }> }>,
}
```

Substituída e cancelada **não** entram. Vista **não** entra em N/M.

## 6. O card e a aba (D-AV-1, D-AV-2)

**Card na página da turma:** *"Avaliações — 12 aplicadas de 30 previstas no currículo"* + barra
(40 %) + *"+ 3 avaliações contínuas (OD)"* + *"vistas realizadas 9 de 27"* + *"2 disciplinas sem
previsto definido"* quando houver. Clique → `/turmas/[turma]?aba=avaliacoes`.

**Aba *Avaliações* da turma** (`?aba=avaliacoes`, filtros `disciplina`, `situacao` na URL;
`aba` empilha no histórico, como `AbasDoCurso`; os filtros substituem): uma seção por disciplina com o previsto (§2), a projeção (§3), a lista dos
itens com situação e data, os papéis (aplicador · fiscal · quem conduz cada sessão) e os demais
instrutores. Botão *Definir tempo (arbitrado)* só para Encarregado e Admin.

**Aba *Avaliações* do curso** (`/cursos/[curso]?aba=avaliacoes`, `RF-CURSO-02`): a mesma lista,
por turma; filtros `turma`, `disciplina`, `situacao`.

**Painel do DSA** (escolhida a disciplina): *"X de Y avaliações aplicadas"* + os itens; o formulário
oferece **UEs (conteúdo)** e **avaliações** (prova, trabalho, vista) da disciplina (FR-032).

## 7. Lançar prova, trabalho e vista no DSA (FR-032, FR-039 a FR-044)

Entrada de `lancar` ganha, para `categoria = "avaliacao"`: `avaliacaoCurriculoId` (obrigatório quando
a disciplina tem item; a lista do formulário só oferece itens não aplicados e marca os aplicados),
`uesAbordadas?`, `fiscal: { instrutorId } | { nomeExterno } | null`, `outrosInstrutores?: string[]`.
Para `categoria = "vista"`: `avaliacaoId` (a prova aplicada), `numero` (próxima sessão),
`conduz: { instrutorId } | { nomeExterno } | null`. A gravação continua em
`gravar_lancamentos_em_transacao`.

## 8. Arbitrar o tempo (`definirTempoArbitrado`, Server Action; FR-031.4, FR-031.7)

```ts
{ avaliacaoCurriculoId, alcance: "curso" | "turma", turmaId?, taAplicacao?: number, taVista?: number, confirmarSugestao?: boolean }
→ { ok: true, aviso?: "soma_acima_da_ch" } | { ok: false, erro }
```

Só Encarregado e Admin (`42501` aos demais). `alcance = "curso"` escreve no item (`origem =
'arbitrado'`); `"turma"` escreve no ajuste. `confirmarSugestao` troca `sugestao_planilha` por
`arbitrado` e carimba `confirmado_em`. **Nunca** toca `ta_*` de origem `curriculo` (recusa: *"o
currículo define este tempo"*). Nunca toca CH de disciplina ou UE.

**Outras três ações, mesma permissão (`avaliacoes_curriculo_arbitrado.editar`, Admin e Encarregado), Zod na primeira linha** *(analyze de 14/10/2026)*:

```ts
arbitrarQuantidade({ disciplinaId, instrumentoId, numero })            // cria o item com origem_item = 'arbitrado', sem fonte; só no curso
nomearUe({ avaliacaoCurriculoId, unidadeEnsinoId })                     // origem_ue = 'decisao_ciaara', ue_decidida_em = hoje; recusa item com UE do currículo
criarItem / editarItem / inativarItem (FR-038)                          // permissão das UEs (disciplinas.editar); a regra da FR-031 como aviso; nunca toca CH
```
