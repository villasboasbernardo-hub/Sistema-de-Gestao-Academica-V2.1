# As 187 provas vivas da planilha — a conta em categorias exclusivas

> Pedido de Bernardo Villas Boas (15/10/2026): *"as categorias somam 191 e as vivas são 187. Mostre a sobreposição e
> reescreva a tabela em categorias exclusivas que somem 187."*
>
> **Artefatos:** o banco **local** com a cópia do remoto `remoto-20261015-150214.sql` (15/10/2026, restaurada por
> `dado_do_remoto`; a mesma conta saiu da cópia anterior, medida antes do `db:reset:limpo` das suítes) e a lista
> `planilhas-de-origem/rodadas/2026-10-14T1916/erros-de-planilha.md`. Reproduzível por
> `python -X utf8 -m scripts.provas.conta_das_provas_da_rodada planilhas-de-origem/rodadas/2026-10-14T1916`.

## A sobreposição: 191 − 187 = 4

A tabela do relatório misturava **duas unidades**: as linhas de *"não casa"* (86) vêm da **lista de erros**, que conta
**linhas da planilha**; as outras categorias vêm do **banco**, que conta **avaliações carregadas**. **4** das 86 linhas
de *"não casa"* são de provas **depois da virada** (13/10/2026) de turmas onde o sistema já é a fonte — a rodada não
as carrega, então elas **não estão** entre as 187:

| Turma | Disciplina | Prova | Data |
|---|---|---|---|
| CAHO 2026 | X | PM2 | 30/10/2026 |
| CAHO 2026 | XVI | PM2 | 15/10/2026 |
| C-Ap-FR 2026 | V | AV1 | 16/10/2026 |
| C-Ap-FR 2026 | XII | AV1 | 13/10/2026 |

São as mesmas **4 provas posteriores à virada** que o relatório já citava numa nota à parte — mas elas estavam
**também** dentro do 86, e é isso que levava a soma a 191. Na conta por avaliação, *"não casa"* é **82**.

## A tabela, em categorias exclusivas

Cada avaliação viva `DSAP-` cai em **uma** categoria, nesta ordem de precedência (a primeira que vale decide):

| # | Categoria | Provas |
|---:|---|---:|
| 1 | Ligada a uma avaliação do currículo | **75** |
| 2 | OD (CAHO V, contínua — não se liga a item, por desenho) | **2** |
| 3 | Editada na tela, sem item (a tela vence, A3.4) — C-Ap-HN `L1111`, `L1249`, `L1481`, `L1514` | **4** |
| 4 | A disciplina não tem avaliação do currículo carregada (A4.7) | **16** |
| 5 | Prova a mais que os itens do currículo | **6** |
| 6 | Não casa com nenhum item da disciplina | **82** |
| 7 | Sem par na planilha atual (C-Ap-HN XIII `L1550`, CAHO XII `L2168`) | **2** |
| | **Total** | **187** |

Fora das 187, e por isso fora da tabela: as **4** linhas de *"não casa"* posteriores à virada (acima) e as **6** de
*"TA de prova diferente"*, que são de provas **ligadas** (já contadas em 1).

## Como cada uma aparece nas telas (inalterado)

A prova sem item conta no **N** do card *"N aplicadas de M"*, aparece no quadro por disciplina em *"Lançadas no DSA sem
avaliação do currículo ligada"* e consome um item pendente na projeção; no painel *"X de Y"* do DSA, sai como
*"· K lançadas sem item do currículo"* (PR 5.1).
