# O código que lê o currículo pelo curso (spec 021)

## Revisão pelas RC (21/10/2026): o que o PR 1 já faz

A RC-1 tirou do curso o **propósito**, a **duração** (semanas e dias), o **modelo** (UEs ou competências) e o **PDF**, e
mandou os leitores lerem do currículo. Como o PR 1 copia esses valores para o currículo 1, **os leitores e escritores
deles mudam no PR 1** — senão a primeira edição na tela iria para um lado e as outras telas leriam o outro:

| Onde | Agora lê / grava |
|---|---|
| `cursos/consulta.ts` + `cursos/page.tsx` (catálogo, indicadores) | o currículo **vigente hoje** de cada curso (embutido) |
| `cursos/[curso]/consulta.ts` + `page.tsx` (Sobre o Curso, avisos, disciplinas da aba Sobre, **regras de avaliação**, limites) | o currículo vigente hoje |
| `cursos/[curso]/editar/page.tsx` + `lib/acoes/curso.ts` (`editarCurso`, `registrarCurriculo`) | o currículo vigente hoje (o cadastro segue no curso) |
| `cursos/[curso]/curriculo/route.ts` (download do PDF) | o currículo vigente hoje |
| `inicio/page.tsx` (semana do curso das manchetes) | o currículo **da turma** |
| `turmas/[turma]/page.tsx` + `consulta.ts` (ficha) | o currículo da turma |
| `turmas/[turma]/dsa/leitura.ts` (e por ele o papel e a planilha) e `dsa/page.tsx` | o currículo da turma (modelo e duração) |
| `scripts/carga_dsa/banco.py` (VIRADA-1), `scripts/etl/conferir_unidades_ensino.py` | o modelo do currículo da turma / da disciplina |

Guardado por `tests/unidade/colunas-aposentadas-do-curso.test.ts` (código sem comentário, com controle positivo). O que
segue abaixo é o mapa de 21/10/2026 — **o trabalho do PR 2** —, com a duração (§ *Um valor só por curso*) já resolvida.


Varredura de 21/10/2026 sobre a `main` `fa372c2` (`app/`, `lib/`, `scripts/`; sem comentário, sem `lib/tipos/` e
`tests/`). **Com uma versão por curso, nada disto muda de número** (provado no PR 1); com duas, cada linha abaixo
somaria, listaria ou casaria as duas. Regra do PR 2: **todo leitor passa a filtrar pela versão da turma** (ou pela
versão escolhida no seletor, nas abas do curso) — e o retrato das telas (`tests/invariantes/retrato-das-telas.test.ts`)
tem de dar **0 diferenças** antes × depois, de novo.

## Somam a CH de todas as disciplinas do curso (com o PR 1, já não: a view lê a versão)
- `vw_carga_horaria_turma.chr_curricular` → Início (`inicio/page.tsx`, `panorama.ts`), `/turmas` (Progresso e Saldo),
  ficha (andamento, tetos). **Resolvido no banco pelo PR 1.**
- `vw_conformidade_tetos` → aba Atividades, Início, ficha, previsto do PROENS. **Resolvido no banco pelo PR 1.**
- `cursos/[curso]/page.tsx:304` (`chCurricular` do limite) e `AbaSobre.tsx:122` (total da grade) — ✅ **PR 2**: as
  disciplinas são as do currículo selecionado.
- `GradeDeDisciplinas.tsx:127` (indicador "CH prevista" da aba Disciplinas) — ✅ **PR 2**: `lerGradeDeDisciplinas`
  recebe o currículo.
- `lib/dominio/avaliacoes/contagem.ts:73-75`, alimentado por `consulta-de-avaliacoes.ts:41-57` — ✅ **PR 2**: a leitura
  recebe o currículo (o selecionado no curso, o da turma na ficha).

## Listam pelo curso
| Onde | Lê | No PR 2 |
|---|---|---|
| `disciplinas/consulta.ts:241-292` (aba Disciplinas) | disciplinas, UEs, avaliações do curso | ✅ filtro pelo currículo do seletor |
| `turmas/[turma]/consulta-de-avaliacoes.ts:41-57` (aba Avaliações **e** ficha da turma) | disciplinas, UEs, itens do curso | ✅ currículo do seletor / da turma |
| `turmas/[turma]/dsa/leitura.ts:493-505, 617-629, 717-729` | disciplinas, UEs, itens do curso (formulário, painel de UEs, prova prevista) | ✅ currículo da turma (recorte na montagem; o papel e a planilha leem daqui) |
| `vw_disciplinas_execucao` via `leitura.ts:1765-1780` (situação, rodapé do papel, planilha) | — | **resolvido no banco pelo PR 1** |
| `dsa/planilha/leitura.ts:129-140` | UEs do curso | ✅ currículo da turma |
| `cursos/[curso]/page.tsx:129-135, 147-151` (Sobre, limites) | disciplinas e limites do curso | ✅ currículo do seletor |

## Gravam em todas as turmas do curso
- `criar_disciplina`, `reativar_disciplina`, o nascimento da turma — **resolvidos no banco pelo PR 1** (pela versão).
- O formulário de disciplina passa `curriculo_id` (a versão em edição) — ✅ **PR 2**.

## Casam por código ou nome (colidem com duas versões)
- `print/dsa/documento.ts:126` e `lib/dominio/dsa/impressao.ts:407-410` (rodapé e nomes no cartão) — versão da turma.
- `lib/dominio/dsa/planilha/catalogo.ts:273-283` (catálogo `COD|ITEM`) — versão da turma.
- **VIRADA-1**: `scripts/carga_dsa/banco.py:93-120` (retrato do currículo **por curso**), `resolver.py:221` (dicionário
  `disciplina_por_cod`), `plano.py:232`, `verificar.py:268-276`, `de_para_de_ue.py:72-77` — o retrato passa a ser da
  **versão da turma** (`turmas.curriculo_id`). ✅ **PR 2**: o retrato (`banco.py`) recorta disciplinas, UEs,
  habilitações e itens pelo currículo da turma — `resolver.py` e `plano.py` leem dele —, e `verificar.py`,
  `de_para_de_ue.py` e `provar_sincronizacao_no_banco.py` casam pelo currículo.
- `instrutores/catalogo.ts:51-56` (painel de habilitações, rótulo nome + sigla) — ✅ **PR 2**: com dois currículos no
  curso, *"CAHO · Currículo 2 (vigência 2027)"* (D-35).
- ETL: `parear_avaliacoes_curriculo.py`, `gerar_pareamento_ue.py` — rodam contra base de uma versão; ficam.
- Preparos SQL antigos (`into strict` por curso e código) — históricos; ficam (D-17).

## Um valor só por curso — a duração (D-11, substituída pela RC-1)
- ✅ **Resolvido no PR 1**: a *"Semana do curso N de T"* (DSA, papel, planilha, Início, ficha), os avisos e os
  indicadores do catálogo leem a duração do currículo (o da turma ou o vigente) — sem recurso ao curso.

## A turma nova
- `lib/acoes/turma.ts:106-110`: o `insert` segue sem `curriculo_id` e o gatilho põe a vigente (PR 1, sem mudança de
  código). ✅ **PR 2** (RC-4, D-34): *Nova turma* oferece "o vigente na data de início da turma" (vazio: o banco escolhe)
  e, pelo nome, o vigente e o futuro; *Editar turma* troca enquanto a turma não tem lançamento (trava com o regime).
