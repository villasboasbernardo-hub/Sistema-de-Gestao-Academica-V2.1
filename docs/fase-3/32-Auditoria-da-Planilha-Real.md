---
title: "CIAARA-11 v2.1 — Auditoria da Planilha Real contra o Schema Alvo"
author: "Fase 3 do SDLC — Migração"
date: "26/08/2026"
version: "2.1"
---

# Auditoria da Planilha Real — `Banco de dados CIAARA11 v2.0.xlsx`

**Fonte auditada:** exportação `.xlsx` da planilha viva, enviada por Bernardo em 26/08/2026
**Método:** leitura de todas as 24 abas, inferência de tipo por coluna, verificação de integridade
referencial de 20 relacionamentos e de 3 regras de unicidade — antes de escrever as FKs, não depois.

## Nota de migração (v2.1)

Os documentos 21 (Schema Físico) e 31 (Mapa De-Para) foram escritos a partir da **documentação** do
schema da v2.0 — o inventário de 02/08/2026 registrado em `docs/arquitetura/01-schema.md`. Este
documento é o confronto com a **planilha viva**, e existe porque o confronto não foi cerimônia:
encontrou **oito divergências**, três delas capazes de derrubar a carga do ETL.

A lição vale além deste caso, e vale registrá-la: **o mapa de-para se escreve contra o dado, nunca
contra a documentação do dado.** Documentação de schema envelhece na velocidade em que o sistema é
usado — e este sistema é usado todo dia.

> ⚠️ **A ordem importa.** Verificar integridade referencial **antes** de criar as FKs é o que
> transforma um erro de carga às 15h de uma janela de corte em uma decisão tomada com calma na
> semana anterior. Três dos achados abaixo fariam `INSERT` falhar com violação de FK, e um deles
> teria passado silenciosamente, gravando dado errado.

---

## 1. Inventário real × inventário documentado

| Item | Documentado (02/08) | **Real (26/08)** | Δ |
|---|---|---|---|
| Abas | 23 | **24** | +1 (`Turma_Disciplina`, criada em 20/08) |
| Cursos | 24 | 24 | — |
| Turmas | 29 | **30** + 1 linha-lixo | +1 |
| Disciplinas | 175 | 175 | — |
| Instrutores | 177 | **179** | +2 |
| Vínculos instrutor↔disciplina | 798 | **852** | **+54** |
| Registros de aula | 1.753 | **1.568** | **−185** |
| Avaliações | 111 | **188** | **+77** |
| Atividades não letivas | 663 | **664** | +1 |
| `Turma_Disciplina` | 210 | **216** | +6 |
| `_Migracao_Log` | 503 | **1.116** | **+613** |
| `Planejamento_Anual` | — | **0 linhas** | vazia |
| `Usuario_Curso` | — | **0 linhas** | vazia |

**Os dois deltas grandes são explicáveis, e explicá-los importa.** Registros de aula caíram 185 e
avaliações subiram 77 porque a **fusão de agendamento e execução de avaliação** (`RN-AVAL-02`,
Missão 3) foi executada depois do inventário: 186 execuções saíram de `Registro_Aulas_E_Atividades`,
foram para `_Arquivo_Avaliacoes_v1` (186 linhas, confere) e conciliadas em `Avaliacoes`. O número
"1.753" que circula no BRIEF e nos documentos 00, 05 e 30 é **anterior a essa fusão**.

> **Ação:** os volumes citados nos documentos 00, 05, 21, 30 e no `CLAUDE.md` devem ser atualizados
> para os números desta tabela. Eles não mudam nenhuma conclusão — a base continua pequena —, mas um
> número errado num critério de reconciliação faz um relatório verde parecer vermelho, e vice-versa.

---

## 2. Achados que **bloqueiam a carga**

### A-1 · IDs de instrutor gravados como `float` — 24 linhas órfãs

**O que acontece.** `Cad_Instrutor` tem 179 linhas, com IDs de `1` a `177` **mais dois valores
gravados como texto de ponto flutuante: `"178.0"` e `"179.0"`**. As tabelas que os referenciam usam
a forma inteira, `"178"` e `"179"`:

| Origem | Linhas órfãs | Valores |
|---|---|---|
| `Instrutor_Disciplina.ID_Instrutor` | 15 | `178`, `179` |
| `Turma_Disciplina.ID_Instrutor` | 9 | `178`, `179` |

Não há buraco na sequência: **os instrutores existem.** O que não bate é a *representação*. São os
dois docentes cadastrados depois da migração — note que `Origem_Migracao_v1` tem 177 valores
preenchidos e 2 nulos, exatamente eles. O formulário da v2.0 gravou o ID como número, o Sheets
serializou como `178.0`, e a comparação de texto passou a falhar.

**É o defeito mais caro do lote**, porque `24 INSERT` falhariam com violação de FK no meio da carga,
sem qualquer indicação da causa raiz. E é a classe de defeito que o PostgreSQL torna impossível:
`uuid` não tem duas representações.

**Correção no ETL** — normalizar toda chave textual numérica na extração, não na carga:

```python
def normalizar_id(v):
    """'178.0' → '178'. O Sheets serializa número inteiro com casa decimal, e a
    comparação de texto passa a falhar contra quem gravou a forma inteira."""
    if v is None or v == '':
        return None
    s = str(v).strip()
    return s[:-2] if s.endswith('.0') and s[:-2].isdigit() else s
```

Aplicar em **toda** coluna `ID_*` de tipo texto, não só nesta — o mesmo padrão aparece em
`Instrutor_Disciplina` (`'177.0'`) e em `_Arquivo_Avaliacoes_v1.ID_Instrutor` (numérico puro).

### A-2 · `"GERAL"` como FK sentinela — 4 linhas

`Responsaveis_Curso.ID_Curso` e `Calendario_Reservas.ID_Curso` contêm a string literal `"GERAL"`
(2 linhas cada) para dizer *"vale para todos os cursos"*. Não existe curso `GERAL` em `Cad_Cursos`.

É o padrão clássico de planilha: quando não há como expressar "nenhum em particular", inventa-se um
valor mágico. No relacional isso tem nome e já está no schema — **`NULL` com `CHECK` que o
interpreta**. Ambas as tabelas já foram modeladas com `curso_id` anulável, e as policies de RLS já
tratam `curso_id is null` como alcance institucional.

**Correção no ETL:** `curso_id = NULL if id_curso.upper() == 'GERAL' else resolver(id_curso)` — e
registrar a transformação em `migracao_log` com `Regra_Aplicada = 'Sentinela GERAL → NULL'`.

### A-3 · Duplicata `C-Esp-ALH` / `ALH-II` — ainda não corrigida

A restrição de unicidade `(curso_id, cod_disciplina)` — que existe justamente para aposentar o
contorno específico do C-Ap-FR — **falharia na criação**: o par `('C-Esp-ALH', 'ALH-II')` aparece em
duas linhas de `Cad_Disciplinas`.

É o **achado (a)** do documento 05, registrado em 31/07/2026 com recomendação explícita de corrigir
na migração. Passou pela migração da v2.0 sem ser corrigido, e continua lá — o que confirma o
diagnóstico original: *"a causa raiz é uma edição direta na planilha nunca corrigida na origem"*.

Há também 79 valores distintos de `Cod_Disciplina` entre 175 disciplinas, e **um deles é `"-"`** —
um marcador de "sem código". Se mais de uma disciplina do mesmo curso usar `"-"`, a unicidade
falha de novo por um motivo diferente. O `CHECK` do schema já trata `"-"` como ausência; o ETL
precisa convertê-lo para `NULL`, e `NULL` não colide com `NULL` em `UNIQUE` no PostgreSQL — que é
exatamente o comportamento desejado.

**Correção: decisão do Bernardo, não do ETL.** Qual das duas linhas `ALH-II` é a boa? A migração não
pode escolher sozinha. Enquanto não houver decisão, a carga precisa parar aí — silenciosamente
descartar uma das duas seria perder dado sem registro.

---

## 3. `CH_Prevista_Por_Instrutor` — o dado que o Excel destruiu

**Este é o achado mais interessante da auditoria, e o que mais muda o schema.**

### 3.1 O que a coluna realmente é

`Turma_Disciplina` tem duas colunas que a documentação descreve como escalares:

```
ID_Instrutor              = "40, 60, 18, 19, 20, 21"
CH_Prevista_Por_Instrutor = "40:200, 60:200, 18:200, 19:200, 20:200, 21:200"
```

Não são escalares: é uma **lista de instrutores** e um **mapa `instrutor:CH`**, serializados em
texto. São as disciplinas multidisciplinares com rateio de carga (spec 032) — 15 linhas com lista de
instrutores, 52 com CH preenchida.

**Consequência direta:** a correção que este projeto aplicou em 26/08 pela manhã — acrescentar
`instrutor_id uuid` e `ch_prevista_por_instrutor numeric` como colunas de `turma_disciplina` —
**estava errada**. Coluna escalar não comporta seis instrutores, e `uuid[]` não comporta a carga
horária de cada um.

O modelo correto é a tabela filha **`turma_disciplina_instrutor`**, já criada em
`docs/sql-referencia/01_tabelas_cadastro.sql`:

```sql
create table public.turma_disciplina_instrutor (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique,
  turma_disciplina_id uuid not null references public.turma_disciplina(id) on delete restrict,
  instrutor_id        uuid not null references public.instrutores(id)      on delete restrict,
  ch_prevista_tempos  numeric(6,2),
  papel               text,
  status              public.status_registro not null default 'ativo',
  ...
  constraint tdi_par_unico unique (turma_disciplina_id, instrutor_id)
);
```

Só o dado real revelou isso. A documentação descrevia as duas colunas pelo nome, e pelo nome elas
pareciam escalares.

### 3.2 A destruição por coerção de tipo

Das 52 linhas com CH preenchida, **43 não são mais texto**. O Excel interpretou o par de um único
instrutor como duração e converteu:

| Valor original (provável) | O que está no `.xlsx` | Tipo Python |
|---|---|---|
| `89:28` | `3 days, 17:28:00` | `timedelta` |
| `18:78` | `19:18:00` | `time` |
| `118:110` | `4 days, 23:50:00` | `timedelta` |
| `40:200, 60:200` | `"40:200, 60:200"` | `str` — **intacto** |

`89:28` foi lido como "89 horas e 28 minutos" = 3 dias, 17h28. Só os pares múltiplos sobreviveram,
porque a vírgula impediu a interpretação como duração.

### 3.3 A recuperação — determinística, validada em 43/43

A conversão é reversível **porque `ID_Instrutor` está numa coluna separada** e permite desfazer o
"carry" de 60 minutos que o Excel aplicou quando a CH passava de 59:

```
ch_prevista = minutos_totais_do_valor − (id_instrutor × 60)
```

```python
import datetime

def recuperar_ch(valor, id_instrutor):
    """Desfaz a coerção de tipo do Excel sobre o par 'instrutor:CH'.

    O QUÊ  : converte time/timedelta de volta ao número de tempos de aula.
    PARA QUÊ: 43 das 52 linhas de CH prevista chegaram ao .xlsx como duração;
             sem esta recuperação o rateio de carga da spec 032 se perde.
    COMO   : minutos totais menos (id × 60). O termo `id × 60` desfaz o carry de
             60 min que o Excel aplicou quando a CH era ≥ 60 — é ele que distingue
             '85:15' (instrutor 85, CH 15) de '84:75' (instrutor 84, CH 75).
             Validado nos 43 valores coagidos: 43 recuperados, 0 implausíveis.
    """
    if isinstance(valor, datetime.timedelta):
        total_min = int(valor.total_seconds() // 60)
    elif isinstance(valor, datetime.time):
        total_min = valor.hour * 60 + valor.minute
    else:
        return None                      # já é texto: use o parser de pares
    return total_min - int(id_instrutor) * 60
```

### 3.4 A defesa real: não exportar para `.xlsx`

A recuperação acima funciona, mas trata sintoma. **A causa é o próprio `.xlsx` como formato de
intercâmbio.** O ETL deve ler a planilha pela API do Google Sheets com

```
valueRenderOption = UNFORMATTED_VALUE
```

que devolve o conteúdo cru da célula, sem interpretação de formato. Aí `"89:28"` chega como
`"89:28"` e nada precisa ser desfeito.

> **Regra para o documento 30:** o `.xlsx` serve para auditar e conferir; **não serve como fonte de
> carga.** Um formato que reinterpreta o dado ao lê-lo não é um formato de intercâmbio — é um
> segundo sistema com opinião própria sobre o que os seus dados significam.

---

## 4. Achados de qualidade de dado

### A-5 · `Cad_Instrutor.Endereco_Estado` contém carimbos de tempo

Dos 34 valores preenchidos, **19 são timestamps** (`2026-08-17 21:23:19.355`) e 15 são siglas de
estado (`AC`). A coluna está **desalinhada**: parte do conteúdo de `Timestamp_Edicao` foi gravada
nela.

Isto responde a pendência **P-3** dos documentos 21 e 30 — *"a coluna `Estado` de instrutor da spec
025, que a documentação só nomeia"*. A resposta é: ela existe, e está corrompida.

**Correção:** carregar em coluna de *staging* e separar por padrão (`^\d{4}-\d{2}-\d{2}` → descartar
ou reconciliar com `editado_em`; sigla de 2 letras → `endereco_estado`). Registrar cada linha em
`migracao_log`. **Não** inventar valor para os 145 nulos.

### A-6 · Linha-lixo em `Turmas_Ativas`

Uma das 31 linhas tem **todos os campos vazios exceto `Ano_Letivo = 2027`**. Sem `ID_Turma`, sem
`ID_Curso`. É uma linha iniciada e abandonada.

`turmas.codigo` é `NOT NULL UNIQUE` — a carga falharia. **Descartar, registrando em `migracao_log`
com `Acao = 'Descartado'`.** Nada se perde: não há nada ali.

### A-7 · Vínculo ativo duplicado

`Instrutor_Disciplina` tem um par `(instrutor 177, grade '66 - C-Espc-HN - SN-1103-0506')` repetido
com `Status = 'Ativo'` nas duas linhas — de novo o instrutor gravado como `'177.0'`. A unicidade de
vínculo ativo recusaria a segunda.

Também há `Status = 'Cancelada'` (1 linha), valor que não existe no domínio `ativo|inativo` do
schema. **Mapear `Cancelada → inativo`** e registrar.

### A-8 · `Config_Parametros.Editavel_Por` com dois nomes para o mesmo papel

Aparecem `Encarregado_Div_Adm_Academica` **e** `Encarregado_Divisao_Administracao_Academica`. É o
mesmo perfil escrito de duas formas — o tipo de divergência que o `_Meta_Colunas` existia para
evitar e não evitou, porque nada obrigava a conferir.

No destino, `perfil_usuario` é ENUM: as duas formas colapsam em
`encarregado_administracao_academica`, e a divergência deixa de ser possível. **É um exemplo limpo
de defeito absorvido pela plataforma** — vale citá-lo no documento 05.

---

## 5. Divergências de domínio — respostas a pendências abertas

A planilha real fecha quatro perguntas que estavam com o Bernardo.

### P-5 · `cursos.classificacao` **não** casa com `usuarios.escopo_curso` — RESPONDIDO: **não casa**

Valores reais de `Cad_Cursos.Classificacao`:

> `Curso Regular` · `Curso Expedito` · `Curso Especial` · `Curso de Aperfeiçoamento Avançado` ·
> `Estágio de qualificação`

Valores de `escopo_curso` no schema: `geral` · `regular` · `expedito` · `estagio_qualificacao` ·
`ead_semipresencial`.

**Três desencontros, e cada um importa:**

1. `Curso Especial` e `Curso de Aperfeiçoamento Avançado` **não têm escopo correspondente**. Um
   Operador não pode ser recortado para eles hoje.
2. `ead_semipresencial` **não é uma classificação** — a modalidade é coluna separada
   (`Modalidade`: `Presencial`, `EAD`, `Semipresencial`, e mais três variantes em texto livre). Um
   curso regular pode ser EAD.
3. `Estágio de qualificação` está em caixa mista, sem acento normalizado.

> **A policy do Operador em `docs/sql-referencia/05_rls_policies.sql` pressupõe que os dois domínios casam
> (`c.classificacao = v_escopo`). Com o dado real, ela recorta errado.** Não é bug de código: é uma
> premissa que a planilha desmentiu.
>
> **Recomendação:** separar os dois domínios de vez — `classificacao_curso` (5 valores reais, mais
> os dois que faltam) e `escopo_curso` (o recorte do Operador), ligados por uma tabela
> `escopo_classificacao (escopo, classificacao)`. É mais uma linha de dado e uma comparação a menos
> de premissa. **Decisão do Bernardo, antes do Épico 3.**

### P-2 · `criterio_prioridade_alocacao` — RESPONDIDO
`Cad_Cursos.Prioridade_Alocacao` tem **um único valor em uso: `Padrao`**. O ENUM pode nascer com
`padrao` e crescer quando houver segundo caso — não há por que adivinhar valores que ninguém usou.

### P-4 · `modalidade_ensino` — RESPONDIDO, com ressalva
Seis valores em `Cad_Cursos.Modalidade`, três deles texto livre
(`Presencial (podendo ser ministrado por videoconferência)`, `A Distância (EAD / Presencial)`).
`Turmas_Ativas.Modalidade` usa três valores limpos: `Presencial`, `EAD`, `Semi-Presencial` — e note
`Semi-Presencial` com hífen, contra `Semipresencial` em `Cad_Cursos`.
**Normalizar para três valores e mover a nuance textual para `cursos.observacao`.**

### TURMA-1 · status `Arquivada` — RESPONDIDO: **não existe no dado**
`Turmas_Ativas.Status` usa `Ativa`, `Cancelada`, `Concluida`, `Planejada`. Nenhuma `Arquivada`.
Acrescentar um valor de ENUM que ninguém usa é dívida, não previsão. **Fica fora**, até haver caso.

---

## 6. Confirmações — o que o dado real validou

Nem toda auditoria é má notícia. Cinco decisões do schema foram confirmadas pelo dado:

| Decisão | Evidência na planilha |
|---|---|
| `configuracoes_horario` como tabela-cabeçalho | `Nome_Config` é **consistente** para as 5 configurações (40 linhas, 0 divergência) — a denormalização é limpa e separável |
| PK composta `(ID_Config, Tempo_Numero)` | única em 40/40 linhas |
| `codigo` como chave de negócio | `ID_Curso` é o próprio acrônimo (`C-Ap-FR`, `CAHO`), legível e estável — preservá-lo em `codigo` mantém a rastreabilidade sem esforço |
| Categorização normativa (Missão 4) | `Eventos_Extracurriculares.Categoria_Normativa` já traz `AEC`/`TAD`/`TR`/`Estudo_Individual` nas 664 linhas, com `Tipo_Legado_v1` preservado ao lado |
| Fusão de avaliações (`RN-AVAL-02`) | `Avaliacoes` já tem `Conciliacao_Migracao` (`Par_Exato`, `Par_Inferido`, `Execucao_Orfa`, `Sem_Execucao`) e `_Arquivo_Avaliacoes_v1` com as 186 execuções em quarentena |

**Integridade referencial: 16 dos 20 relacionamentos verificados estão limpos.** Registros de aula,
avaliações, atividades, disciplinas, turmas e janelas de curso não têm um único órfão. Para uma base
que viveu anos em planilha, é um resultado bom — e é mérito do saneamento da v2.0.

---

## 7. O schema, em uma página

**26 tabelas · 26 chaves primárias · 34 chaves estrangeiras · 31 restrições de unicidade ·
67 CHECKs · 123 índices · 74 policies RLS.** Nenhuma FK sem `ON DELETE` explícito; nenhuma tabela
sem RLS; nenhuma policy de `DELETE`.

### Aba da v2.0 → tabela da v2.1

| Aba (Sheets) | Tabela (PostgreSQL) | Chave de negócio (`codigo`) |
|---|---|---|
| `Cad_Cursos` | `cursos` | `C-Ap-FR`, `CAHO` (acrônimo) |
| — (cabeçalho extraído) | `configuracoes_horario` | `CFG-A` … `CFG-E` |
| `Horarios_Tempos_Aula` | `horarios_tempos_aula` | `(configuracao_id, tempo_numero)` |
| `Cad_Cursos_Regime_Historico` | `curso_regime_historico` | `REG-000001` |
| `Turmas_Ativas` | `turmas` | `C-Ap-FR 2026` |
| `Cad_Disciplinas` | `disciplinas` | `1 - CAHO - MAT` |
| `Turma_Disciplina` | `turma_disciplina` | `TDI-000001` |
| *(colunas de lista)* | **`turma_disciplina_instrutor`** | derivado — §3 |
| `Cad_Instrutor` | `instrutores` | `1` … `177` |
| `Instrutor_Disciplina` | `instrutor_disciplina` | `VIN-000001` |
| `Responsaveis_Curso` | `responsaveis_curso` | `RSP-000001` |
| `Registro_Aulas_E_Atividades` | `registros_aula` | `REG-0176` |
| `Avaliacoes` | `avaliacoes` | `AVA-0001` |
| `Avaliacoes_Planejadas` | `avaliacoes_planejadas` | `AVP-0001` |
| `Eventos_Extracurriculares` | `atividades_nao_letivas` | `EXT-0001` |
| `Planejamento_Anual` | `planejamento_anual` | *(vazia)* |
| `Usuarios` | `usuarios` | `USR-01` |
| `Usuario_Curso` | `usuario_curso` | *(vazia)* |
| `Config_Listas` | `config_listas` | `(lista, valor)` |
| `Config_Parametros` | `config_parametros` | `CH_DOCENTE_20H_MAX` |
| `Calendario_Feriados` | `feriados` | `FER-000001` |
| `Calendario_Janelas_Curso` | `janelas_curso` | `JAN-000001` |
| `Calendario_Reservas` | `reservas_proens` | `RES-000001` |
| `_Migracao_Log` | `migracao_log` | `LOG-000001` |
| `_Arquivo_Avaliacoes_v1` | `arquivo_avaliacoes_v1` | `REG-1498` |
| `_Meta_Colunas` | **aposentada** | absorvida pelo catálogo do PostgreSQL |
| — (nova) | `perfil_permissao` | `(perfil, recurso, acao)` |

### As 34 chaves estrangeiras

Todas para `id uuid`, nunca para `codigo`. `RESTRICT` em 32 delas — nada é apagado neste sistema.

| Tabela | Coluna | Referencia | `ON DELETE` |
|---|---|---|---|
| `turmas` | `curso_id` | `cursos` | RESTRICT |
| `disciplinas` | `curso_id` | `cursos` | RESTRICT |
| `curso_regime_historico` | `curso_id` · `configuracao_horario_id` | `cursos` · `configuracoes_horario` | RESTRICT |
| `horarios_tempos_aula` | `configuracao_id` | `configuracoes_horario` | **CASCADE** |
| `turma_disciplina` | `turma_id` · `disciplina_id` | `turmas` · `disciplinas` | RESTRICT |
| `turma_disciplina_instrutor` | `turma_disciplina_id` · `instrutor_id` | `turma_disciplina` · `instrutores` | RESTRICT |
| `instrutor_disciplina` | `instrutor_id` · `disciplina_id` | `instrutores` · `disciplinas` | RESTRICT |
| `responsaveis_curso` | `curso_id` · `instrutor_id` | `cursos` · `instrutores` | RESTRICT |
| `registros_aula` | `turma_id` · `disciplina_id` · `instrutor_id` | `turmas` · `disciplinas` · `instrutores` | RESTRICT |
| `avaliacoes` | `turma_id` · `disciplina_id` · `instrutor_responsavel_id` · `fiscal_id` | `turmas` · `disciplinas` · `instrutores` | RESTRICT |
| `avaliacoes` | `item_planejado_id` | `avaliacoes_planejadas` | **SET NULL** |
| `avaliacoes_planejadas` | `curso_id` | `cursos` | RESTRICT |
| `atividades_nao_letivas` | `turma_id` | `turmas` | RESTRICT |
| `planejamento_anual` | `curso_id` · `turma_prevista_id` · `disciplina_id` | `cursos` · `turmas` · `disciplinas` | RESTRICT |
| `janelas_curso` · `reservas_proens` | `curso_id` | `cursos` | RESTRICT |
| `arquivo_avaliacoes_v1` | `avaliacao_destino_id` | `avaliacoes` | RESTRICT |
| `usuarios` | `auth_user_id` · `instrutor_id` | `auth.users` · `instrutores` | RESTRICT |
| `usuario_curso` | `usuario_id` · `curso_id` | `usuarios` · `cursos` | RESTRICT |
| `configuracoes_horario` | `substituida_por_id` | `configuracoes_horario` *(auto-referência)* | RESTRICT |

**As duas exceções ao `RESTRICT`, e por quê.** `horarios_tempos_aula → configuracoes_horario` é
`CASCADE` porque um tempo de aula não existe sem a configuração dele — é composição, não associação.
`avaliacoes.item_planejado_id` é `SET NULL` porque a avaliação **realizada** sobrevive ao
desaparecimento do item planejado que a originou: o fato aconteceu, e o histórico não se apaga
porque o catálogo mudou.

---

## 8. Ordem de trabalho antes do corte

| # | Ação | Responsável | Bloqueia |
|---|---|---|---|
| 1 | **Decidir qual linha `C-Esp-ALH`/`ALH-II` fica** (A-3) | Bernardo | carga de `disciplinas` |
| 2 | Normalizar IDs `float` na extração (A-1) | ETL | 24 linhas de vínculo |
| 3 | Trocar `.xlsx` pela API do Sheets com `UNFORMATTED_VALUE` (§3.4) | ETL | rateio de CH |
| 4 | `"GERAL"` → `NULL` (A-2) | ETL | 4 linhas |
| 5 | Descartar a linha-lixo de `Turmas_Ativas` (A-6) | ETL | carga de `turmas` |
| 6 | Separar `Endereco_Estado` por padrão (A-5) | ETL | qualidade |
| 7 | `Cancelada` → `inativo`; deduplicar vínculo ativo (A-7) | ETL | 2 linhas |
| 8 | **Decidir a separação `classificacao` × `escopo_curso`** (P-5) | Bernardo | **policy RLS do Operador** |
| 9 | Atualizar os volumes nos documentos 00, 05, 21, 30 e `CLAUDE.md` (§1) | documentação | reconciliação |

**Itens 1 e 8 são decisão sua e não têm alternativa técnica.** Os demais são trabalho de ETL, todos
com correção conhecida e escrita.

---

## Rastreabilidade

**Documentos que esta auditoria altera:** 05 (achado (a) reaberto; volumes; A-8 como exemplo de
absorção pela plataforma) · 21 (§10 — `turma_disciplina_instrutor` substitui as colunas escalares) ·
30 (fonte de extração; recuperação de CH; ordem de limpeza) · 31 (mapa de-para de
`Turma_Disciplina`) · `CLAUDE.md` (volumes).

**Regras e requisitos tocados:** `RN-MAT-02` (unicidade genérica) · `RN-AVAL-02` (fusão confirmada) ·
`RN-EVT-01` (categorização confirmada) · `RN-INST-05` (status explícito) · `RN-CRONOS-01`
(atribuição × habilitação) · `RN-RBAC-02` (escopo do Operador — P-5) · `RF-DADOS-06` (unicidade) ·
`RNF-CONF-01` (nenhuma perda de histórico) · specs 029, 032, 034 · achados (a), (l), (m), LIQ-1.

*Fim do documento 32.*
