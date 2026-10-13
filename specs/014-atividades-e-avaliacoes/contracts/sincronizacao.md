# Contrato — a sincronização com as planilhas depois desta spec (FR-015/016/022/025.5/031.8/036/036.1/042/045/046)

Comando inalterado: `python -m scripts.carga_dsa.sincronizar --rodada <pasta>`. Os princípios da
VIRADA-1 continuam (substituir, não somar; reexecutável; cadastro só pelo lote de decisões; turma
fora de `fontes.json` não é tocada).

## O que ela NUNCA altera (D-CUR-1) — e como se prova

`disciplinas.carga_horaria_tempos`, `unidades_ensino.ch_prevista_tempos`, `avaliacoes_curriculo.*`
com origem `currículo`, e a **quantidade** de disciplinas/UEs/itens. `verificar.py` tira a
**impressão digital do catálogo** (md5 das três tabelas, ordenadas por código) **antes e depois** da
rodada e reprova se mudar (SC-008). Mudança de catálogo é migration, nunca rodada.

## O que passa a gravar (tabela de R-14), e as regras de casamento

| Linha da planilha | Destino | Casamento |
|---|---|---|
| prova (`1P`, `AV1`, `PE`, `PM`…) com disciplina | `avaliacoes` + `avaliacao_curriculo_id` | instrumento (pela descrição, sigla não decide) + **número de ordem dentro da disciplina** na planilha ↔ `numero` do item da mesma natureza. Não casou → sem item, **erro de planilha** |
| vista (`VP`, `VP4`…) | `vistas_de_avaliacao` da prova anterior da mesma disciplina, `numero = n+1` | a prova aplicada mais recente da disciplina sem sessão naquela data |
| `(FISCAL)` no nome | `avaliacoes.fiscal_id` (ou `nome_fiscal_externo`) | como hoje para o responsável, sem trocar o aplicador |
| `A / B` em instrutor | `outros_instrutores[]` | o primeiro casado é o responsável; os demais vão para o vetor **como vieram** |
| FR/LA/LP/NT/RC/PF, só da turma | `dias_parados` (prevista) | descrição → `tipos_parada` |
| idem, todas as turmas, dia inteiro | `feriados` (como hoje) | — |
| idem, todas as turmas, parte do dia | `dias_parados` com `turma_id` nulo | — |
| MONITORIA, PORTUGUÊS, BDA, BDF | `atividades_nao_letivas` `Apoio_Individualizado` | descrição → tipo |
| RECEPÇÃO · APOINST · DEPARTAMENTO DE ALUNOS | TAD · AEC · TAD | como hoje |
| evento presente em todas as turmas | **uma linha por turma** (FR-015); global só pelo lote | — |
| responsável externo que não casa | **pendência do lote de decisões** (FR-016) | — |
| tempo de prova/vista onde o currículo é **mudo** | `avaliacoes_curriculo_turma` `sugestao_planilha` | só se o item não tem tempo de origem `currículo` e não há `arbitrado` confirmado; nunca sobrescreve confirmado |

Linhas TAD gravadas antes como dia parado (`resolver.py:539–557`) e as AEC de `vista_extra_como_aec`
saem por exclusão lógica com a marca *"[RECLASSIFICADO PELA SPEC 014]"* e entram no destino novo —
na rodada, não por migration (FR-022, princípio "a planilha manda").

## A lista de erros de planilha (FR-036.1, §11-B)

Arquivo `erros-de-planilha.md` na pasta da rodada (`planilhas-de-origem/rodadas/<data-hora>/`, fora
do git), uma tabela por turma: `disciplina · o que diverge · planilha · currículo · o que o sistema
fez`. Entram: CH de disciplina e de UE diferente; prova/vista a mais ou a menos; TA de prova
diferente; linha sem correspondente (`XX RECON`); aula lançada em dia que a mesma planilha marcou
parado; feriado/licença contados de modo diverso (M-8). **O lançamento entra mesmo assim como
fato**, sem item quando não casa. `sincronizar.py` imprime o caminho do arquivo no fim.

## Reexecução

Rodar a mesma rodada duas vezes dá **zero mudança**, inclusive em `dias_parados`,
`vistas_de_avaliacao` e `avaliacoes_curriculo_turma` (sugestão não confirmada é idempotente;
confirmada não é tocada). Provado no banco por `provar_sincronizacao_no_banco.py` (Docker local); `provar_carga_dsa.py` fica com as recusas em memória. *(corrigido em 13/10/2026, na revisão adversarial do `tasks.md`)*.
