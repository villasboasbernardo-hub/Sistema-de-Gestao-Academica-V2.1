# Contrato: Funções de Backend — Hotfix Edição Inline/Persistência de Datas/Permissão de Admin

## `atualizarTurmaDisciplina(idTurmaDisciplina, alteracoes, dividirCargaHoraria)` — ESTENDIDA, mesma assinatura (`lib/acoes/liq.ts`)

**Antes**: valida a janela de período (`intervaloContidoEm_`), calcula `CH_Prevista_Por_Instrutor`
quando `ID_Instrutor` presente, grava via `crudAtualizar` e retorna o resultado — sem nenhuma
confirmação de que a gravação de data realmente aconteceu.

**Depois**: mesmo comportamento, mais — logo antes de `crudAtualizar`, `Logger.log` do payload
recebido; logo depois, quando `alteracoes` inclui `Previsao_Inicio` e/ou `Previsao_Termino`, relê a
linha e compara cada chave presente contra o valor gravado (ambos em `'yyyy-MM-dd'`, mesma
representação que `lerAbaComoObjetos_` já devolve) — `Logger.log` do resultado da releitura;
lança `Error` (mensagem cita os 2 conjuntos de valores) se qualquer uma não bater, **antes** de
retornar ao chamador.

**Contrato de não regressão**: assinatura, validação de janela (`intervaloContidoEm_`) e cálculo de
`CH_Prevista_Por_Instrutor` inalterados — a chamada com `ID_Instrutor` (specs 029/032, sem
`Previsao_Inicio`/`Previsao_Termino`) nunca paga o custo da releitura extra nem pode falhar por
causa dela.

**Casos de teste esperados**:
- Gravação de `Previsao_Inicio`/`Previsao_Termino` que o mock reflete corretamente na releitura →
  sucesso, retorno inalterado (mesmo formato de sempre).
- Mock de planilha construído para que a releitura devolva um valor diferente do enviado (mesma
  técnica de "gravação simulada que não pega" já usada para provar o rollback de
  `cadastrarDisciplina`, spec 036, T014) → `Error` lançado, mensagem cita enviado e relido.
- Chamada só com `ID_Instrutor` (sem `Previsao_Inicio`/`Previsao_Termino`) → nenhuma releitura
  extra acontece (prova por contagem de leituras da aba, mesmo padrão de teste já usado para
  `getDisciplinasAnoVigente`/`disciplinas`, spec 037).
- Gravação de só `Previsao_Inicio` (sem `Previsao_Termino` na mesma chamada) → releitura checa só
  a chave presente, nunca falha por causa da chave ausente.

## `definirPrioridadeDisciplina(idGrade, peso)` — ESTENDIDA, mesma assinatura (`lib/dominio/motor-preditivo.ts`)

**Antes**: `exigirFuncao(PERFIS_DIVISAO_ADMIN_ACADEMICA)` — só os 2 perfis da Divisão de
Administração Acadêmica; `'Admin'` sempre rejeitado com "Acesso negado".

**Depois**: `exigirFuncao(['Admin'].concat(PERFIS_DIVISAO_ADMIN_ACADEMICA))` — mesmo padrão já
usado pelas 3 funções irmãs deste arquivo (`gerarPlanejamento`/`salvarPlanejamento`/
`lancarEventoManualPlanejamento`).

**Contrato de não regressão**: nenhuma outra parte da função muda — validação de peso (1-10),
gravação em `config_parametros`, tudo inalterado; os 2 perfis já autorizados continuam autorizados.

**Casos de teste esperados**:
- Usuário `Admin` → gravação aceita, sem `Error` de "Acesso negado".
- Usuário `Encarregado_Divisao_Administracao_Academica`/`Ajudante_Divisao_Administracao_Academica`
  → continua aceito (não regressão).
- Usuário de qualquer outro perfil (ex. `Operador`) → continua rejeitado (não regressão — a
  correção só adiciona `Admin`, nunca amplia além disso).
