# Quickstart — como se prova que a fatia (c) do Épico 5 está pronta

**Fase 1** · 11/09/2026 · roteiro de **validação**, não de implementação

> Cada passo abaixo é uma promessa da spec sendo cobrada. Onde há número, ele é **exato** — "mais ou
> menos sete gráficos" reprova.

---

## Passo 0 — O ponto de partida

```
git switch feat/EPICO-5c-cadastro-de-instrutores
pnpm install
pnpm db:start          # o stack local; Docker precisa estar de pé
pnpm db:reset          # schema do zero + as migrations desta fatia
pnpm db:tipos          # OBRIGATÓRIO depois de toda migration
```

⚠️ **A base nasce sem instrutor.** `perfil_permissao`, `config_listas` e `config_parametros` vêm do
seed; os 177 instrutores vêm do ETL, que **não roda aqui** — ele carrega PII real. Os testes semeiam
a própria amostra, por processo de trabalho.

⚠️ **Quem editar a seção `[auth]` do `config.toml` precisa de `pnpm db:stop && pnpm db:start`.** O
`db:reset` **não** recarrega `[auth]` — achado nº 7 do Épico 3.

---

## Passo 1 — O recorte de escrita, que é o coração da fatia

```
pnpm test:rls
```

**Esperado**, e a ordem importa:

| # | Asserção | Resultado |
|---|---|---|
| N-1 | `encarregado_orientacao_pedagogica` grava `cpf` | **negado pelo banco** |
| N-2 | `ajudante_orientacao_pedagogica` grava `endereco_cep` | **negado pelo banco** |
| N-3 | os três autorizados gravam `cpf` pela função | **permitido** |
| N-5 | os cinco perfis com `editar` gravam as 33 funcionais | **permitido** |

⚠️ **A N-3 e a N-5 são controle positivo, e sem elas o teste não vale.** Um recorte que negue todo
mundo passaria em N-1 e N-2 — e quebraria a tela para quem tem direito, sem erro visível.

**Conferência por defeito deliberado**, e ela é obrigatória:

```
-- repor na migration, rodar, ver N-1/N-2/N-4 reprovarem, desfazer
grant update, insert on public.instrutores to authenticated;
```

⚠️ **Portão nunca visto reprovando é afirmação, não prova.**

---

## Passo 2 — A contagem que não depende de lembrar de um perfil

```
pnpm test:invariantes
```

**Esperado**: a asserção compara, para `authenticated` em `public.instrutores`, as colunas com
`SELECT` contra a **união** de `UPDATE` e `INSERT`. A diferença é **zero**.

Medido antes da fatia, para se saber o que mudou:

| Privilégio | Antes | Depois |
|---|---|---|
| `SELECT` | 33 | 33 |
| `UPDATE` | 45 | **33** |
| `INSERT` | 45 | **33** |

🛑 **Se a asserção comparar só `SELECT` × `UPDATE`, ela sai verde com o `INSERT` aberto.** É a emenda
do `SC-010` — ver [contracts/recorte-de-escrita.md](./contracts/recorte-de-escrita.md).

---

## Passo 3 — A ordenação, conferida uma a uma e não por amostragem

```
pnpm test:unidade
```

**Esperado** (`SC-001`): a varredura enumera **todas** as ocorrências de lista, seletor e filtro de
instrutor no repositório e confere que cada uma passa pela ordenação de domínio.

| Caso | Esperado |
|---|---|
| postos diferentes | ordem crescente de antiguidade, pelo peso do posto |
| **mesmo posto** | desempate pela antiguidade declarada, e só por ela |
| **civil × militar** | o civil vem **depois** de todo militar (peso 13) |
| dois civis | desempate igual ao dos militares |
| posto fora da escala | **não** vai para o topo — `null` não é zero |

⚠️ **A varredura lê código sem comentário.** Três verificações da fatia (b) reprovaram lendo a
própria documentação como violação, e um teste que confunde a frase que promete a ausência com a
violação ensina a apagar a documentação para ficar verde.

---

## Passo 4 — A carga horária: duas grandezas, zero campos

```
pnpm test:invariantes && pnpm test:unidade
```

| Asserção | Esperado |
|---|---|
| `vw_instrutor_carga_anual` tem `ta_ministrado_ano` **e** `ta_previsto_ano` | ambas |
| campos de CH digitáveis no repositório | **zero** (`SC-002`) |
| 40h com 20h previstas | **não** alerta |
| 20h com 14h previstas | **alerta** |
| qualquer um dos dois | **não** é impedido de nada |

🛑 **O teto é a FAIXA, jamais o número do regime.** Um teste que use 40 como limite passa no primeiro
caso pelo motivo errado e reprova o sistema em produção.

**Atualizado em 15/09/2026, com a T011 respondida.** *(decisão de Bernardo Villas Boas, 15/09/2026)*

| Asserção | Estado |
|---|---|
| `ta_previsto_ano`, com rateio do `RN-MAT-05` e ano pela data de início prevista | ✅ `094`, asserções 10 a 12 |
| média semanal **de cada atribuição** = tempos ÷ semanas da janela | ✅ `094` e ficha |
| limites da faixa inclusivos — 8 e 12 dentro | ✅ `tests/unidade/carga-horaria.test.ts` |
| semanal **do instrutor** e os dois alertas da US4 na ficha | ⏸️ pendência: como compor várias disciplinas no ano, e o `FR-017` com data vazia |

---

## Passo 5 — A tela, pelo percurso de quem usa

```
pnpm test:e2e tests/e2e/instrutores.spec.ts
```

1. Entrar e chegar a **Instrutores pelo menu**, sem digitar URL. ⚠️ A entrada precisa ter **deixado
   de dizer "em breve"** — o teste do shell confere os dois sentidos.
2. Aplicar filtro de OM. **Esperado**: o parâmetro aparece na URL **e a contagem na tela muda**.
3. Aplicar categoria por cima. **Esperado**: o segundo opera sobre o resultado do primeiro
   (`FR-025`).
4. Copiar a URL e abrir em aba nova. **Esperado**: a mesma tela, no mesmo recorte.
5. Digitar oito letras na busca. **Esperado**: **uma** entrada de histórico.
6. Abrir a ficha de um instrutor. **Esperado**: URL `/instrutores/<codigo>`, **nunca** um uuid.
7. **Controle negativo**: `/instrutores/CODIGO-QUE-NAO-EXISTE`. **Esperado**: a tela distingue
   *"não há"* de *"você não vê"*.
8. Contar na tela: **4 indicadores** e **7 gráficos**, com as barras de posto/graduação em ordem de
   antiguidade — **nunca alfabética**. *(Corrigido em 15/09/2026: dizia "com posto/graduação primeiro"; ver a emenda do `FR-026.2`.)*
   **Segunda correção, de 15/09/2026**: clicar em **"Exibir estatísticas"** (o painel nasce recolhido) e contar **3 indicadores** e **9 gráficos** — 3 de barras e 6 de pizza; enquanto a pendência de escolaridade não fecha, 4 e 5. Cada barra traz o valor escrito, o status de seleção tem duas cores, e a pizza traz o percentual. *(decisão de Bernardo Villas Boas, 15/09/2026)*
9. Procurar edição em linha na listagem. **Esperado**: não existe — a spec 038 a removeu.
10. **Acrescentado em 15/09/2026**: aplicar os filtros novos — círculo hierárquico, habilitado,
    selecionado, curso, classificação do curso, posto e capacitação "Nenhuma". **Esperado**: cada um
    vai para a URL e muda a contagem; habilitado e selecionado são independentes. *(decisão de Bernardo Villas Boas, 15/09/2026)*
11. **Acrescentado em 15/09/2026**: a listagem tem a coluna **"Instrutor"**, e não posto e nome
    separados. *(decisão de Bernardo Villas Boas, 15/09/2026)*
12. **Acrescentado em 15/09/2026**: na ficha, marcar uma disciplina no painel, gravar com confirmação
    e conferir o vínculo `VIN-NNNNNN`; desmarcar e conferir que o vínculo fica inativo, não apagado.
    "Desativar instrutor" está no fim da página, ao lado de "Gravar alterações". *(decisão de Bernardo Villas Boas, 15/09/2026)*

---

## Passo 6 — Desativar preserva o passado

| Passo | Esperado |
|---|---|
| desativar instrutor com aulas lançadas | some das listas de **nova** atribuição |
| consultar o histórico | **continua lá**, com nome e vínculos |
| reativar | volta sem perder nada |
| o mesmo instrutor tem conta de acesso | **a conta continua ativa**, e a tela de usuários mostra que o instrutor vinculado está inativo |

⚠️ **A última linha é a que se esquece.** Desativar em cascata tira o acesso de alguém por um ato que
não era sobre isso.

---

## Passo 7 — Os cinco obrigatórios, inclusive o branco disfarçado

| Tentativa | Esperado |
|---|---|
| salvar sem cada um dos cinco | recusado, e a mensagem diz **qual** falta |
| salvar com o campo **só com espaços** | recusado **igual** |
| pela API, sem passar pela tela | recusado **igual** (`FR-006`) |
| depois da recusa | **nada** foi salvo pela metade |

⚠️ **A segunda linha é onde `NOT NULL` não basta.** Espaço em branco passa por `NOT NULL` e é
ausência disfarçada — a recusa é `CHECK`, no banco.

---

## Passo 8 — O portão inteiro

```
pnpm verificar:tudo
```

**Esperado**: sai **0**, e o CI dá **veredito idêntico** sobre o mesmo commit (`SC-009`).

⚠️ **Verde local seguido de vermelho no CI é defeito da verificação, não azar** — vira tarefa de
correção. O Épico 3 já pagou esse preço: a suíte de ponta a ponta morria no bloco `build` porque o
bloco não tem a CLI nem o stack. **Suíte que fala com o banco pertence ao bloco que tem banco.**

---

## Passo 9 — A paridade, percorrida item a item

⚠️ **É o passo que não tem comando**, e é o que o `SC-007` cobra.

Percorrer a tabela §4 do documento 06 — as oito specs da v2.0, `014`, `015`, `016`, `019`, `020`,
`025`, `036` e `038` — e apontar, **uma a uma**, onde cada refinamento reaparece na v2.1. **Nenhuma
fica sem resposta**, inclusive a `038`, cuja resposta é *"a edição em linha continua removida"*.

⚠️ **O risco dominante desta fatia não é errar: é perder um refinamento** que ninguém lembra de
cobrar até fazer falta.
