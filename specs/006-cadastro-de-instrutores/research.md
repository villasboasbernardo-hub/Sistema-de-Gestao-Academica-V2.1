# Pesquisa — Épico 5, fatia (c): cadastro de instrutores

**Fase 0** · 11/09/2026 · ramo `feat/EPICO-5c-cadastro-de-instrutores`, em dia com a `main`
(`5466786`) · banco medido: stack local, depois de `pnpm db:reset`

> **Tudo aqui foi medido contra o banco e o repositório de hoje.** Onde a spec afirma um número,
> ele foi conferido; onde ela não afirmou, a medição achou coisa que ninguém tinha escrito.

---

## R-1 · O bloqueio da spec **caiu**, e por fato, não por decisão nova

A spec foi escrita em 10/09/2026 e declara, na tabela de *Dependências*, que as fatias (b) e (c) do
Épico 4 **não existem** — e é por isso que a **Q5c.a** a deixou bloqueada.

**Medido em 11/09/2026, neste ramo:**

| Dependência | Estado na spec (10/09) | Estado medido (11/09) |
|---|---|---|
| Épico 4 (b) — componentes densos e gráficos | ⬜ não existe | ✅ `components/ciaara/` com **16** arquivos · `components/graficos/` com **5** |
| Épico 4 (c) — casca e estado na URL | ⬜ não existe | ✅ `components/casca/` · `lib/navegacao/` com contrato tipado |
| `lib/dominio/` | vazio desde o Épico 0 | ✅ `antiguidade.ts` e `nome-instrutor.ts` |

**Decisão**: a **Q5c.a está satisfeita**. A ordem que ela impôs — Épico 4 (b) → 4 (c) → 5 (c) — foi
cumprida, e esta fatia sai do bloqueio **sem** reabrir a decisão.

⚠️ **A tabela de dependências da spec fica como está.** Ela é registro do que era verdade quando foi
escrita; corrigi-la apagaria a razão de a Q5c.a ter existido. O estado de hoje vive **aqui**.

---

## R-2 · O recorte de escrita — a spec estava certa no número, e o número não é o pior

O `FR-032` nasce de uma medição de 10/09. Ela foi refeita.

| Privilégio de `authenticated` em `public.instrutores` | Colunas |
|---|---|
| `SELECT` | 33 |
| `UPDATE` | 45 |
| `INSERT` | 45 |

A diferença é **12**, exatamente como o `SC-010` afirma, e são estas:

```
cpf · rg · orgao_emissor · telefone · retelma
endereco_logradouro · endereco_numero · endereco_complemento
endereco_bairro · endereco_cidade · endereco_estado · endereco_cep
```

⚠️ **Mas contar coluna esconde o que importa, que é contar gente.** A RLS de `instrutores` gateia por
`app.pode('instrutores', <ação>)`, e a matriz `perfil_permissao` responde assim:

| Ação | Perfis | Quais |
|---|---|---|
| `ler` | 9 | todos |
| `editar` | **5** | admin · encarregado e ajudante de Administração Acadêmica · **encarregado e ajudante de Orientação Pedagógica** |
| `criar` | 3 | admin · encarregado e ajudante de Administração Acadêmica |
| **lê PII** (view com porteiro) | **3** | admin · encarregado e ajudante de Administração Acadêmica |

**O achado em uma frase: dois perfis gravam CPF, RG, telefone e endereço que não conseguem ler.**
São o **encarregado** e o **ajudante de Orientação Pedagógica**. Não é uma diferença de 12 colunas
em abstrato — são duas pessoas de carne e osso editando às cegas um campo que a tela nunca lhes
mostra, e "editar às cegas" é como um CPF se apaga sem ninguém notar.

**Decisão**: o `FR-032` fecha por `revoke update (…12 colunas…)`, espelhando o passo 2 da migration
`20260908120000`. **Quem não vê, não escreve** deixa de ser frase e vira privilégio.

---

## R-3 · O `INSERT` está alinhado **por coincidência da matriz**, não por desenho

`INSERT` também alcança as 45 colunas. Ele não é buraco **hoje** porque a policy de inserção exige
`app.pode('instrutores','criar')`, e esse verbo pertence aos **mesmos três** perfis que leem a PII.

⚠️ **Duas travas independentes que por acaso coincidem não são uma trava.** No dia em que a matriz
conceder `criar` a um quarto perfil — e ela é **dado**, administrável em tela, que é o que o
Princípio VII exige —, o buraco abre **sem migration, sem revisão e sem erro**.

**Decisão**: o recorte revoga `insert` **e** `update` nas 12 colunas. Custa a mesma linha e remove a
dependência de coincidência.

---

## R-4 · O `SC-010` mede menos do que o `FR-032` exige — e passaria verde com o buraco aberto

O critério, como escrito, compara *"colunas com `SELECT`"* e *"colunas com `UPDATE`"*. Ele **não
menciona `INSERT`**.

⚠️ **Consequência medida no papel:** revogar só o `update` faz o `SC-010` sair **zero** com o
`insert` ainda em 45 colunas. O critério ficaria verde e o `FR-032` — que diz *"a **escrita**"* —
continuaria descumprido. É a forma de falha mais cara que existe neste projeto: portão verde sobre
requisito aberto.

**Decisão**: o critério é **emendado na fase de tarefas**, não reinterpretado em silêncio. A asserção
passa a comparar `SELECT` contra a **união** de `UPDATE` e `INSERT`. A emenda é de redação do
critério, **não** de regra de negócio — o `FR-032` já dizia "escrita".

---

## R-5 · Antiguidade: o `FR-002` e o `FR-003` **já estão satisfeitos no banco**

`config_listas` traz a lista `escala_antiguidade` com **14 linhas**: os 12 postos do `RN-ANT-02`, de
`CMG=1` a `MN=12`, mais `SC` e `SCNS` **ambos em ordem 13**, com a observação *"Achado residual v2.0
§6.8 — categoria civil, peso 13"*.

Isso fecha, sem código novo:

- o `FR-003` — a escala é **dado administrável**, não constante (Princípio VII);
- a parte civil do `FR-002` — civis depois de todo militar, decidida em 10/09.

⚠️ **E confirma a divergência nº 1 da spec pelo lado do banco:** o peso 13 existe no dado e **não**
existe no documento 04. A spec manda listar, não corrigir. Fica listado.

⚠️ **Dois valores com a mesma ordem é intencional e o desempate importa.** `SC` e `SCNS` empatam em
13, e entre eles decide a antiguidade declarada — que é exatamente o que o `FR-002` manda.

---

## R-6 · Duas das funções puras mais caras **já existem**

`lib/dominio/antiguidade.ts` e `lib/dominio/nome-instrutor.ts` entraram na fatia (b) do Épico 4, com
a citação literal da regra no topo, e a `RN-ANT-01` foi conferida por defeito deliberado.

⚠️ **A escala chega por argumento, de propósito** — `antiguidade.ts` não a contém, e o cabeçalho diz
que a ausência *é* o requisito. Esta fatia **consome** essas funções e não as reescreve. O que falta
é o outro lado: ligar a fonte administrável ao chamador, e provar o `SC-001` por varredura.

---

## R-7 · A carga horária **prevista não existe**, e é ela que o alerta compara

`vw_instrutor_carga_anual` já entrega, por instrutor e ano: `ta_ministrado_ano`,
`ta_fiscalizado_ano`, `faixa_semanal_min`, `faixa_semanal_max`, `tempo_setor_anos` e
`qtd_disciplinas_habilitadas`.

⚠️ **Nenhuma view agrega CH prevista por instrutor.** Medido: a única view do schema que cita
`ch_prevista` é `vw_unidades_ensino_execucao`, e ela agrega por **unidade de ensino**, não por
docente. As fontes existem — `turma_disciplina_instrutor.ch_prevista_tempos` e
`turma_disciplina.ch_prevista_por_instrutor` — e ninguém as somou por pessoa.

**Isto é load-bearing, e a spec não o nomeia:**

- o `FR-014` pede **duas** grandezas calculadas; o banco entrega **uma**;
- o `FR-016` compara a **semanal prevista** contra a faixa do regime — sem a prevista, o alerta
  **não tem o que comparar**, e a US4 inteira fica sem chão;
- a faixa já está na view, então o que falta é o numerador, não o denominador.

**Decisão**: a fatia ganha uma **segunda razão de migration**, além do recorte do `FR-032` —
estender a view com a prevista anual e a prevista semanal derivada. A *Assumption 1* da spec, que já
tinha sido corrigida em 10/09 de "não muda" para "muda por causa do `FR-032`", muda de novo: são
**dois** motivos.

---

## R-8 · Dez views do Épico 1 ainda carregam `INSERT`/`UPDATE` para `authenticated`

A migration do recorte de PII avisa, em caixa alta, que *"toda migration que criar tabela ou view
precisa repetir o revoke"*, porque o `revoke ... on all tables` do Épico 1 é **foto do momento**.

**Medido — só as duas views daquela migration foram revogadas:**

| Views | `authenticated` tem | Auto-atualizável? |
|---|---|---|
| `vw_instrutores`, `vw_instrutor_dados_pessoais` | `SELECT` | **SIM** |
| as outras **10** | `SELECT`, `INSERT`, `UPDATE` | **NÃO** |

⚠️ **Hoje é inerte, e amanhã não necessariamente.** As dez não são auto-atualizáveis — têm agregação
ou junção —, então a escrita falha no motor antes de chegar ao privilégio. **A proteção é a forma da
view, não o privilégio.** No dia em que alguém simplificar uma delas para depurar, ela vira gravável
em silêncio.

**Decisão**: **fora do escopo desta fatia** (Princípio IX — não é processo da CIAARA-11 nem
requisito desta spec). Fica **registrado aqui e reportado ao final**, como a regra 1 do `CLAUDE.md`
manda. A fatia só garante o próprio quintal: a view que ela criar nasce com o revoke.

---

## R-9 · A base local nasce **vazia de instrutor**, e o teste precisa semear

Depois de `pnpm db:reset`, as únicas tabelas com linha são `perfil_permissao` (152),
`config_listas` (14), `config_parametros` (14) e `migracao_log` (1). **`instrutores` tem zero.** Os
177 vêm do ETL do Épico 2, que lê a planilha real.

⚠️ **E o ETL não é opção para o CI**: ele carrega CPF, RG, telefone e endereço de 177 militares de
verdade. Rodá-lo no CI publicaria PII real num executor de nuvem.

**Decisão**: seguir o padrão que a fatia (c) do Épico 4 já provou — semeadura **por processo de
trabalho**, com `service_role`, códigos únicos por processo, como `tests/e2e/panorama-de-teste.ts`.
A amostra precisa conter, de propósito: militares de postos diferentes, **dois do mesmo posto** para
exercitar o desempate, **um civil** para o peso 13, e um instrutor **fora da faixa** do regime e
outro **dentro** — o `SC-006` exige os dois lados.

---

## R-10 · As telas leem `vw_instrutores`, nunca `instrutores`

`select *` em `public.instrutores` **falha** para usuário autenticado, porque o `*` expande para as
12 colunas revogadas, e o erro diz `permission denied for table instrutores` — que manda quem depura
procurar a RLS, que não é a causa.

**Decisão**: o caminho de leitura desta fatia é `vw_instrutores` (funcional) e
`vw_instrutor_dados_pessoais` (PII, com porteiro). Vira item de contrato e de teste, para que a
próxima tela não redescubra isto.

---

## Alternativas consideradas e recusadas

| Alternativa | Por que não |
|---|---|
| Fechar a escrita de PII com **RLS** | RLS não recorta coluna. É o mesmo motivo que levou o Épico 3 a usar `grant` por coluna, e está escrito na migration `20260908120000` |
| Fechar a escrita **na Server Action** com Zod | É regra de negócio só na aplicação, que o BRIEF §2 proíbe. A chamada direta à API de auth do Épico 3 mostrou que esse atalho é alcançável |
| Guardar a CH prevista como **coluna** | É grandeza derivada. O `FR-015` proíbe campo digitável e o `CLAUDE.md` proíbe segunda fonte de verdade — view ou `GENERATED`, nunca cópia |
| Escrever a escala de antiguidade em código | Princípio VII, e `config_listas` já a tem com os 14 valores |
| Rodar o ETL para popular o teste | PII real em executor de nuvem (R-9) |
| Reabrir a **Q5c.a** | Ela foi cumprida, não revogada (R-1) |
