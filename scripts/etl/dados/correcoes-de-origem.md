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
