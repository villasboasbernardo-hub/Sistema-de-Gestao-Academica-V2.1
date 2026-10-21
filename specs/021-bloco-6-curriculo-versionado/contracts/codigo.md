# O código que lê o currículo pelo curso — o trabalho do PR 2 (spec 021)

Varredura de 21/10/2026 sobre a `main` `fa372c2` (`app/`, `lib/`, `scripts/`; sem comentário, sem `lib/tipos/` e
`tests/`). **Com uma versão por curso, nada disto muda de número** (provado no PR 1); com duas, cada linha abaixo
somaria, listaria ou casaria as duas. Regra do PR 2: **todo leitor passa a filtrar pela versão da turma** (ou pela
versão escolhida no seletor, nas abas do curso) — e o retrato das telas (`tests/invariantes/retrato-das-telas.test.ts`)
tem de dar **0 diferenças** antes × depois, de novo.

## Somam a CH de todas as disciplinas do curso (com o PR 1, já não: a view lê a versão)
- `vw_carga_horaria_turma.chr_curricular` → Início (`inicio/page.tsx`, `panorama.ts`), `/turmas` (Progresso e Saldo),
  ficha (andamento, tetos). **Resolvido no banco pelo PR 1.**
- `vw_conformidade_tetos` → aba Atividades, Início, ficha, previsto do PROENS. **Resolvido no banco pelo PR 1.**
- `cursos/[curso]/page.tsx:304` (`chCurricular` do limite) e `AbaSobre.tsx:122` (total da grade) — **PR 2**.
- `GradeDeDisciplinas.tsx:127` (indicador "CH prevista" da aba Disciplinas) — **PR 2** (seletor).
- `lib/dominio/avaliacoes/contagem.ts:73-75`, alimentado por `consulta-de-avaliacoes.ts:41-57` — **PR 2**.

## Listam pelo curso
| Onde | Lê | No PR 2 |
|---|---|---|
| `disciplinas/consulta.ts:241-292` (aba Disciplinas) | disciplinas, UEs, avaliações do curso | filtro pela versão do seletor |
| `turmas/[turma]/consulta-de-avaliacoes.ts:41-57` (aba Avaliações **e** ficha da turma) | disciplinas, UEs, itens do curso | versão do seletor / da turma |
| `turmas/[turma]/dsa/leitura.ts:493-505, 617-629, 717-729` | disciplinas, UEs, itens do curso (formulário, painel de UEs, prova prevista) | versão da turma |
| `vw_disciplinas_execucao` via `leitura.ts:1765-1780` (situação, rodapé do papel, planilha) | — | **resolvido no banco pelo PR 1** |
| `dsa/planilha/leitura.ts:129-140` | UEs do curso | versão da turma |
| `cursos/[curso]/page.tsx:129-135, 147-151` (Sobre, limites) | disciplinas e limites do curso | versão do seletor |

## Gravam em todas as turmas do curso
- `criar_disciplina`, `reativar_disciplina`, o nascimento da turma — **resolvidos no banco pelo PR 1** (pela versão).
- O formulário de disciplina passa `curriculo_id` (a versão em edição) — **PR 2**.

## Casam por código ou nome (colidem com duas versões)
- `print/dsa/documento.ts:126` e `lib/dominio/dsa/impressao.ts:407-410` (rodapé e nomes no cartão) — versão da turma.
- `lib/dominio/dsa/planilha/catalogo.ts:273-283` (catálogo `COD|ITEM`) — versão da turma.
- **VIRADA-1**: `scripts/carga_dsa/banco.py:93-120` (retrato do currículo **por curso**), `resolver.py:221` (dicionário
  `disciplina_por_cod`), `plano.py:232`, `verificar.py:268-276`, `de_para_de_ue.py:72-77` — o retrato passa a ser da
  **versão da turma** (`turmas.curriculo_id`).
- `instrutores/catalogo.ts:51-56` (painel de habilitações, rótulo nome + sigla) — o rótulo ganha a versão.
- ETL: `parear_avaliacoes_curriculo.py`, `gerar_pareamento_ue.py` — rodam contra base de uma versão; ficam.
- Preparos SQL antigos (`into strict` por curso e código) — históricos; ficam (D-17).

## Um valor só por curso — a duração (D-11)
- `cursos.duracao_semanas` na *"Semana do curso N de T"*: DSA (`leitura.ts:488-492, 1526-1537`, `dsa/page.tsx:162-166`),
  papel, planilha (`planilha/leitura.ts:164, 491`), Início (`inicio/page.tsx:106-109, 417-423`); `avisosDaTurma`,
  `avisosDoCurso`, indicadores do catálogo — **PR 2**: `coalesce(versão.duracao_semanas, curso.duracao_semanas)`.

## A turma nova
- `lib/acoes/turma.ts:106-110`: o `insert` segue sem `curriculo_id` e o gatilho põe a vigente (PR 1, sem mudança de
  código). **PR 2**: o formulário oferece a versão padrão (`public.curriculo_padrao_da_turma`) e deixa escolher outra.
