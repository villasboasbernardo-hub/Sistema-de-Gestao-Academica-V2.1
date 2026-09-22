# Correções de origem

Correções feitas **na planilha da v2.0**, pelo responsável pelo dado, **antes** da carga no remoto.
O ETL transporta o valor corrigido fielmente; **este arquivo é o que distingue correção de aparição**:
daqui a seis meses, um valor que "apareceu" entre duas extrações só tem explicação se estiver aqui.

**Regras** *(decisão de Bernardo Villas Boas, 22/09/2026)*:

- **Corrige quem consegue nomear a origem da resposta; deixa vazio quem só tem palpite.** O vazio
  continua amparado pela catraca.
- **A máquina não infere.** Nenhuma linha deste arquivo é escrita pelo ETL nem por script: quem corrige
  é o responsável, na planilha, e registra aqui.
- **A janela tem prazo.** Corrigir na planilha **antes** da carga no remoto não custa nada. **Depois**
  dela, a mesma correção exige a tela de turma ou de curso, que é do PR 2 da spec 009.
- ⚠️ **O repositório é público.** Instrutor e usuário entram **só pelo código**, nunca pelo nome.

| Data | O que foi corrigido | Valor antigo → valor novo | De onde veio a resposta |
|---|---|---|---|
| 22/09/2026 | Turma `C-Ap-HN 2026` · sala | `Sala 02` → `Sala 01` | conhecimento do responsável |
| 22/09/2026 | Curso `C-ApA-PCN-PR-EAD` · modalidade | `semipresencial` → `ead` | conhecimento do responsável |

## Modalidade dos 24 cursos — informada pelo responsável em 22/09/2026

**Lista autoritativa, dita por Bernardo Villas Boas.** Ela resolve os **13 vazios** que a catraca
amparava e corrige **1 divergência**. Mapeamento para o domínio do banco: `Presencial` → `presencial`,
`Semipresencial` → `semipresencial`, `EAD` → `ead`.

| Curso | Informado | Estava gravado | Situação |
|---|---|---|---|
| `CAHO` | Presencial | (vazio) | preenche |
| `C-Ap-HN` | Presencial | (vazio) | preenche |
| `C-Ap-FR` | Presencial | presencial | confere |
| `C-Espc-HN` | Presencial | (vazio) | preenche |
| `C-Espc-FR` | Presencial | presencial | confere |
| `C-Exp-Ag-Mag` | Presencial | (vazio) | preenche |
| `C-Exp-BATI` | Presencial | (vazio) | preenche |
| `C-Exp-MetocOf` | Presencial | presencial | confere |
| `C-Exp-Metoc-OF-SP` | Semipresencial | semipresencial | confere |
| `C-Exp-Obs-ME` | Presencial | (vazio) | preenche |
| `C-Esp-ALH` | Presencial | (vazio) | preenche |
| `C-Esp-ME` | Presencial | (vazio) | preenche |
| `C-Esp-OpAP` | Presencial | presencial | confere |
| `C-ApA-AuxNav-PR-SP` | Semipresencial | semipresencial | confere |
| **`C-ApA-PCN-PR-EAD`** | **EAD** | **semipresencial** | ⚠️ **DIVERGE** |
| `C-ApA-PrevMe-PR-EAD` | EAD | ead | confere |
| `C-ApA-OcOp-PR-SP` | Semipresencial | semipresencial | confere |
| `EST-QF-APOC` | Presencial | (vazio) | preenche |
| `EST-QF-APHID` | Presencial | (vazio) | preenche |
| `EST-QF-PROC-MF-EAD` | EAD | ead | confere |
| `EST-QF-EM2040PHS` | Presencial | (vazio) | preenche |
| `EST-QF-PGRS100` | Presencial | (vazio) | preenche |
| `EST-QF-NAVFLU-EAD` | EAD | ead | confere |
| `EST-QF-MAREFLU` | Presencial | (vazio) | preenche |

**13 preenchem · 10 conferem · 1 diverge.** Nenhum curso da base ficou fora da lista.

⚠️ **A divergência tem origem conhecida, e não é erro de digitação de ninguém.** A célula da planilha
traz o texto **`A Distância (EAD / Presencial)`**, e o de-para do ETL o lê como `semipresencial` —
*"o próprio texto diz que tem as duas pontas"* (`scripts/etl/mapa.py`). O responsável informa **EAD**.
Enquanto a célula disser isso, **toda carga futura vai gravar `semipresencial` de novo**.

### O que precisa mudar, e onde

**Aba `Cad_Cursos`, coluna `Modalidade`, na planilha da v2.0.** É o único lugar que sobrevive à
próxima extração: o banco é reescrito a cada carga, e o `dados/bruto/v20/` é regerado pela extração.

⚠️ **E há um degrau a mais:** a extração **não lê a planilha viva** — ela lê a cópia local
`Banco de dados CIAARA-11 v2.0.xlsx`, salva em **20/08/2026 22:21** (decisão de 08/09/2026, que tirou
a rede do caminho). Corrigir a planilha viva **não muda a cópia**; a correção só chega quando uma
**nova cópia datada** for salva no lugar dela — o que é o procedimento do corte, e é ação do
responsável. Editar a cópia atual seria adulterar o retrato imutável que o `FR-008` exige.

**Palavras aceitas na célula, exatamente:** `Presencial`, `Semipresencial`, `EAD` (e `A Distância`,
que o de-para já traduz). ⚠️ **`Semi-Presencial`, com hífen, NÃO é aceita para curso** — o de-para a
traduz só para *turma*. Erro de grafia **não passa calado**: a verificação prévia da carga aborta
nomeando o valor sem destino, antes de qualquer escrita.

## Pendentes de decisão de Bernardo — levantados, **não** corrigidos

Concentração desse tamanho sugere **falha de preenchimento na origem**, e não ausência legítima. Ficam
aqui até ele decidir; **nada foi preenchido** *(levantado em 22/09/2026)*.

| Onde | O que | Efeito enquanto estiver assim |
|---|---|---|
| Turma `C-Esp-ME 2026` | **172 de 173** aulas sem instrutor — as demais 1.393 aulas da base têm | Essas aulas não contam na carga de nenhum instrutor. A reconciliação do ETL informa (U-02) e não bloqueia |
| Turma `C-Ap-HN 2026` | **52** aulas sem tempos consumidos, todas de aula teórica | Ficam fora da carga executada da turma: o progresso dela no Início sai menor do que foi dado |

---

⚠️ **O retrato local ainda não tem as correções.** `bruto/v20/` foi extraído em 08/09/2026, e nele a
`C-Ap-HN 2026` está em `Sala 02`. Cada correção chega na próxima extração da planilha.
