# Triagem — Bloco 6 (currículo versionado), medida em 21/10/2026 sobre a `main` `fa372c2`

Pedido de Bernardo Villas Boas pelo `/corrigir` de 20/10/2026 (o pedido original é de 16/10/2026, resposta 7 da triagem
do plano de correções: *"currículo versionado é épico próprio"*). **Novidade** autorizada nominalmente. **Épico**, e o
pedido diz *"PARE no portão (regra 9.4) com o desenho completo ANTES do remoto"*.

**Instrumentos:** o catálogo do banco local; a cópia do remoto `remoto-20261020-235051.sql` (modo completo do
`dado_do_remoto`, só leitura no remoto); e uma varredura do código por agente, arquivo:linha, em `contracts/codigo.md`.

| # | Item, reescrito | Tipo | O que a medição mostrou |
|---|---|---|---|
| 1 | Um curso pode ter **várias versões de currículo**, com vigência; o de hoje vira a **versão 1** de cada curso, e toda turma existente fica ligada a ela **sem número nenhum mudar** | estrutura nova | Hoje o currículo **é o curso**: `disciplinas.curso_id`, `unidades_ensino.curso_id`, `avaliacoes_curriculo.curso_id`, `limites_curriculo` por `(curso, categoria)` e `cursos.duracao_*`. Na cópia: 24 cursos, 175 disciplinas, 587 UEs, 281 avaliações do currículo, 30 limites, 29 turmas, 231 linhas de turma (todas de disciplina ativa do curso; nenhuma faltando) |
| 2 | **Criar** a versão nova **copiando** a vigente e editando a cópia | regra nova | Nada copia currículo hoje. Os códigos de disciplina, UE e avaliação já saem de sequência (`DIS-`, `UE-`, `AVC-`) |
| 3 | A versão em uso por turma **com lançamento** não se edita (`RF-HOR-05`) | regra nova | A régua de lançamento já existe: `app.turma_tem_lancamento_no_dsa` (Bloco 3). Na cópia, **10** turmas têm lançamento → **10 dos 24 cursos** teriam a versão 1 travada no dia da entrada: CAHO, C-Ap-FR, C-Ap-HN, C-Esp-ME, C-Espc-FR, C-Espc-HN, C-Exp-Ag-Mag, C-Exp-BATI, C-Exp-MetocOf, C-Exp-Obs-ME |
| 4 | Cada turma **escolhe** a versão (padrão: a vigente na data de início), e a troca **trava no primeiro lançamento** | regra nova | O molde é o regime nomeado do Bloco 3 (`turmas.regime_de_horario_id` + `app.guardar_regime_da_turma`). Já há a turma do exemplo: **`CAHO 2027`, planejada, com 21 linhas, 0 atribuições e 0 períodos manuais** |
| 5 | A versão aparece nas abas **Grade, Disciplinas, Avaliações e Atividades** do curso (com seletor), na **ficha da turma**, e o **DSA** e a **planilha** usam as disciplinas e UEs da versão da turma | tela | O código lê o currículo **pelo curso** em ~60 pontos (`contracts/codigo.md`): **somariam** duas versões a CH curricular (Início, `/turmas`, ficha, tetos), a aba Sobre, o indicador da aba Disciplinas e a contagem de avaliações; **listariam** as duas a aba Disciplinas, o quadro de avaliações, o formulário do DSA, o painel de situação, o rodapé do papel e a planilha; **casam por código e colidiriam** o papel, o catálogo da planilha e a sincronização (`resolver.py`) |
| 6 | Regra 4, documento 04 e **VIRADA-1** respeitados | restrição | Nada se apaga (versão inativa-se). `RN-MAT-02` está **aposentada** (24/09); a unicidade é o `RF-DADOS-06` do documento 02, **"única no curso"** — com versões, passa a "única na versão" (emenda ao 02). `RN-MAT-01` (lançar só disciplina do curso da turma) **preservada**, e reforçada pela versão. A sincronização casa por `(curso, código)` |
| 7 | Propor a divisão em PRs | processo | Ver `plan.md` §PRs |

**Achados que mudam o desenho:**

- **A ETAPA 6b do ETL reaplica `20261014052333` (os limites), que diz `on conflict (curso_id, categoria)`** — com o índice
  por versão, o `on conflict` deixaria de casar. A migration já está no remoto e não se edita: o ETL recria o índice
  antigo **só durante a reaplicação**.
- **As correções de origem do ETL mudam `disciplinas.modo_atribuicao_padrao` DEPOIS da carga** (`correcoes-de-origem.md`):
  a trava não pode pegar escrita sem sessão.
- **`cursos.duracao_semanas` é um valor só por curso** e alimenta a *"Semana do curso N de T"* do DSA, do papel, da
  planilha e do Início — o exemplo do pedido (*"3 semanas a menos"*) é exatamente ele.
- **A turma pode mudar de curso** (`FR-026`, caminho 4, sem lançamento): a versão tem de acompanhar.
