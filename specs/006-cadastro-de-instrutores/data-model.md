# Modelo de dados — Épico 5, fatia (c): cadastro de instrutores

**Fase 1** · 11/09/2026 · fonte: [research.md](./research.md) · schema medido no stack local

> ⚠️ **Esta fatia CONSOME o schema do Épico 1 e o dado do Épico 2.** Ela não redesenha tabela. As
> duas mudanças de banco abaixo são **recorte de privilégio** e **grandeza derivada** — nenhuma
> cria, renomeia ou apaga coluna.

---

## O que já existe, e portanto não se constrói

| Objeto | Papel nesta fatia | Estado |
|---|---|---|
| `instrutores` | a entidade, 45 colunas, 5 `NOT NULL`, `status` explícito | ✅ Épico 1 · 177 linhas pelo ETL |
| `vw_instrutores` | **o caminho de leitura das telas** — as 33 funcionais | ✅ Épico 3 |
| `vw_instrutor_dados_pessoais` | a PII, com porteiro de 3 perfis | ✅ Épico 3 |
| `vw_instrutor_carga_anual` | CH **ministrada** no ano + faixa do regime | ✅ Épico 1 |
| `instrutor_disciplina` | a **habilitação** (`RN-INST-01`) | ✅ Épico 1 |
| `turma_disciplina_instrutor` | a atribuição, com `ch_prevista_tempos` | ✅ Épico 2 |
| `config_listas.escala_antiguidade` | a escala `P/G` → peso, **14 valores** | ✅ com `SC`/`SCNS` em 13 |
| `perfil_permissao` | quem pode `ler`/`criar`/`editar` instrutor | ✅ 152 linhas |

**Anotação registrada em 15/09/2026 — nomes que o documento 04 cita e o schema não tem.** O documento 04 indica `vw_instrutores_ordenados` como artefato da `RN-ANT-01` e `vw_instrutor_carga_horaria` como artefato da `RN-INST-04`. Nenhuma das duas existe: o schema real usa **`vw_instrutores`** e **`vw_instrutor_carga_anual`**. Esta fatia usa os nomes reais, e o documento 04 **não** é alterado aqui. *(decisão de Bernardo Villas Boas, 15/09/2026)*

---

## Entidade 1 — Instrutor

**Tabela**: `public.instrutores` · **identidade**: `id uuid` (FK) e `codigo text` (o `ID_*` da v2.0)

⚠️ **O `FR-007` fala do identificador que a PESSOA vê, não da chave.** O requisito manda inteiro
simples sem prefixo; a convenção do projeto manda FK apontar para `id`. Não brigam: `codigo` guarda
o número legível verbatim, e `id` é a chave. O `id` não muda aqui; o `codigo` passa a ser **gerado
automaticamente** para instrutor novo.

**Correção registrada em 15/09/2026**: esta seção dizia "Nenhum dos dois muda aqui", mas `codigo` não tem hoje `default`, sequência nem gatilho — os 177 vieram do ETL —, e o `FR-007` exige geração automática. O `codigo` de instrutor novo passa a ser **gerado automaticamente por sequência**, como `default` da coluna, começando acima do maior código migrado (T018). *(decisão de Bernardo Villas Boas, 15/09/2026)* **Implementado em 15/09/2026**: o `default` é `app.proximo_codigo_instrutor()`, que tira o número da sequência `app.instrutores_codigo_seq` e a avança quando ela ficou para trás do maior código gravado — no corte, o ETL grava os códigos 1 a 177 **depois** das migrations, e uma sequência pura colidiria no primeiro cadastro. Medido: depois de uma carga limpa, o próximo código é 178.

⚠️ **Divergência com o documento 04, anotada e não corrigida.** Para a `RN-CRUD-03`, o documento 04 indica como artefato de destino um **gatilho** `gerar_codigo()` por tabela, que produz "prefixo + sequencial para o padrão geral, inteiro simples para `instrutores`". Lido em 15/09/2026: para instrutores ele não define regra além do formato — não trata de reuso de número, lacuna nem bloqueio —, então é um contador simples, e a sequência cumpre a regra. O mecanismo diverge do nome do artefato: **sequência, não gatilho**. ⚠️ Uma sequência não devolve número consumido por transação desfeita; o documento 04 fala em "sequencial" e não proíbe lacuna. O gatilho `gerar_codigo()` não existe no schema, para nenhuma tabela.

### Os obrigatórios (`FR-005`, `RN-INST-03`)

**Emenda registrada em 15/09/2026**: são **quatro**. Especialidade/habilitação passou a ser opcional
(`FR-005` emendado); preenchida só com espaços continua recusada pelo `CHECK`. A linha dela abaixo
dizia `NOT NULL`, o que já não era verdade desde o Épico 2 (migration `20260908084000`). *(decisão de Bernardo Villas Boas, 15/09/2026)*

**Segunda emenda registrada em 15/09/2026 (CHK008 e CHK012)**: são **cinco**, e a especialidade é
**delimitada a militar** (posto que não é `SC` nem `SCNS`). Ausente, é recusada só em **cadastro novo**,
pelo gatilho `trg_instrutores_especialidade_de_militar_novo` (migration `20260915140000`), que vale para
linha sem `origem_migracao_v1`; ficha existente e linha migrada continuam aceitando o nulo. *(decisão de Bernardo Villas Boas, 15/09/2026)*

| Campo | Coluna | Observação |
|---|---|---|
| Posto/graduação | `posto_graduacao` | `NOT NULL`; casa com `escala_antiguidade.valor` |
| Especialidade | `esp_hab_obs` | **de militar** — nula recusada no cadastro novo de militar pelo gatilho; aceita para civil, ficha existente e linha migrada; branco sempre recusado pelo `CHECK` |
| Nome completo | `nome_completo` | `NOT NULL` |
| Categoria | `categoria` | `NOT NULL` |
| Organização militar | `om` | `NOT NULL` |

⚠️ **`NOT NULL` não cobre o `FR-005`.** Texto só com espaço passa por `NOT NULL` e é ausência
disfarçada — é o cenário 2 da US2. A recusa de branco é **`CHECK` no banco**, não validação de tela,
porque o `FR-006` exige que valha por qualquer caminho.

### Antiguidade (`FR-002`)

| Coluna | Tipo | Papel |
|---|---|---|
| `posto_graduacao` | `text` | **critério primário**, via `escala_antiguidade` |
| `antiguidade_declarada` | `text` | legado preservado |
| `antiguidade_declarada_num` | `integer` **GENERATED** | leitura numérica, **desempate apenas** |

⚠️ **Inverter os dois quebra o sistema inteiro e a seção 1 da LIQ.** A ordem é: peso do posto, depois
declarada. Nunca o contrário.

### Ciclo de vida (`FR-008`, `FR-009`, `FR-010`, `FR-010.1`)

`status` é `USER-DEFINED` e explícito — **nunca inferido de ausência**. Não há policy `FOR DELETE`,
e isso é regra de negócio.

⚠️ **Desativar instrutor NÃO toca a conta de acesso** (`FR-010.1`). São dois ciclos de vida, e o
Épico 3 já decidiu o sentido inverso. A tela de usuários **mostra** que o instrutor vinculado está
inativo; nada é desativado em cascata.

---

## Entidade 2 — Habilitação (vínculo instrutor ↔ disciplina)

**Tabela**: `public.instrutor_disciplina` · `instrutor_id` · `disciplina_id` · `modo_atribuicao` ·
`status`

Sem linha ativa aqui, o instrutor **não** pode ser escolhido para ministrar nem para ser responsável
(`FR-021`, `RN-INST-01`).

⚠️ **A regra é delimitada, e a delimitação é a parte que se perde:** **avaliação e vista de prova
NÃO exigem habilitação.** Quem implementar "instrutor precisa de vínculo" sem ler a exceção bloqueia
avaliação e muda a regra.

---

## Entidade 3 — Carga horária: duas grandezas, **ambas derivadas**

O `FR-014` pede duas. **O banco entrega uma** ([research R-7](./research.md)).

| Grandeza | Fonte | Estado |
|---|---|---|
| **Ministrada no ano** | `registros_aula` + `avaliacoes`, somadas em `vw_instrutor_carga_anual.ta_ministrado_ano` | ✅ existe |
| **Prevista** | `turma_disciplina_instrutor.ch_prevista_tempos` — **nunca somada por instrutor** | ⬜ **esta fatia** |

### O que a fatia acrescenta

Estender `vw_instrutor_carga_anual` com:

- `ta_previsto_ano` — soma de `ch_prevista_tempos` das atribuições ativas do instrutor no ano;
- `ta_previsto_semanal` — a derivação semanal que o `FR-016` compara contra a faixa.

⚠️ **Sem `ta_previsto_semanal` a US4 não tem chão.** `faixa_semanal_min` e `faixa_semanal_max` já
estão na view desde o Épico 1 — existe denominador e falta numerador, e é por isso que o alerta
nunca pôde ser escrito até agora.

⚠️ **VIEW, nunca coluna.** O `FR-015` proíbe campo de CH digitável e o projeto proíbe segunda fonte
de verdade. Gravar o total seria as duas violações na mesma linha.

⚠️ **A view nova repete o `revoke`** — `delete, truncate, insert, update` —, porque o do Épico 1 é
foto do momento ([research R-8](./research.md)).

---

## A mudança de privilégio — o recorte de escrita (`FR-032`, `FR-033`)

**Hoje**, em `public.instrutores` para `authenticated`:

| Privilégio | Colunas |
|---|---|
| `SELECT` | 33 |
| `UPDATE` | 45 |
| `INSERT` | 45 |

**Depois**: `UPDATE` e `INSERT` passam a **33**, as mesmas que o `SELECT` alcança.

As 12 que saem:

```
cpf · rg · orgao_emissor · telefone · retelma
endereco_logradouro · endereco_numero · endereco_complemento
endereco_bairro · endereco_cidade · endereco_estado · endereco_cep
```

⚠️ **Contar coluna esconde quem.** Hoje **5 perfis** têm `editar` e **3** leem a PII: o encarregado e
o ajudante de **Orientação Pedagógica** gravam CPF, RG, telefone e endereço que a tela nunca lhes
mostra. É esse par que o recorte fecha.

⚠️ **O `INSERT` entra junto**, ainda que hoje esteja contido pela matriz: `criar` pertence aos mesmos
3 perfis, e **duas travas que coincidem por acaso não são uma trava** ([research R-3](./research.md)).

### Como a PII continua sendo escrita pelos três

Pela **`service_role` não** — ela é para convite, ETL e manutenção, e nunca por requisição de tela.
A escrita autorizada passa por **função `SECURITY DEFINER`** com o mesmo porteiro de perfil da
`vw_instrutor_dados_pessoais`, espelhando a leitura.

⚠️ **Espelhar é o requisito, não uma escolha de implementação.** *Quem não vê, não escreve* precisa
valer nas duas direções, ou o recorte vira aparência.

---

## Estados e transições

```text
        criar (3 perfis)                desativar (5 perfis)
  ∅ ─────────────────────▶ ativo ◀──────────────────────────▶ inativo
                             │         reativar (FR-010)          │
                             │                                    │
                   sai de listas de NOVA atribuição ──────────────┘
                   permanece em TODO histórico lançado (FR-009)
```

⚠️ **A conta de acesso não aparece neste diagrama de propósito** (`FR-010.1`). Ela tem o próprio
ciclo, e desativar o docente não o atravessa.

---

## Invariantes que viram asserção

| # | Invariante | Onde é provada |
|---|---|---|
| I-1 | Colunas com `SELECT` = colunas com `UPDATE` ∪ `INSERT`, para `authenticated` | pgTAP |
| I-2 | Perfis que escrevem PII = perfis que leem PII = **3** | RLS, sessão autenticada |
| I-3 | Os 2 perfis de Orientação Pedagógica **editam** instrutor e **não** alcançam PII | RLS, teste negativo |
| I-4 | Zero campo de CH digitável no repositório | varredura, unidade |
| I-5 | Cinco obrigatórios recusados vazios **e** só com espaço, pelo banco | pgTAP |
| I-6 | Nenhuma policy `FOR DELETE` em `instrutores` | pgTAP (já existe) |
| I-7 | Toda lista/seletor/filtro de instrutor passa pela ordenação de domínio | varredura, unidade |
| I-8 | View nova sem `delete`/`truncate`/`insert`/`update` para `authenticated` | pgTAP |
| I-9 | 40h com 20h previstas **não** alerta; 20h com 14h **alerta** | unidade |

⚠️ **A I-3 é a que prova o recorte de verdade.** Uma asserção que só confirme os três autorizados
passaria com o buraco aberto — é preciso nomear quem **não** pode e vê-lo ser negado pelo banco.
