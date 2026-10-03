# CIAARA-11 v2.1 — Contexto do Projeto

> Este arquivo é lido pelo agente a **cada sessão**. Ele aponta para os documentos; não os resume.
> Mantenha-o curto: um `CLAUDE.md` de 500 linhas é lido com o mesmo cuidado que um contrato de licença.

## O que é

Sistema de gestão acadêmica da Divisão de Administração Acadêmica (**CIAARA-11**) do Centro de
Instrução e Adestramento Almirante Radler de Aquino, Marinha do Brasil. Gerencia cursos, turmas,
disciplinas, instrutores, o lançamento diário de aulas (**DSA**), o cronograma anual e os documentos
oficiais (**LIQ**, **OS de Instrutoria**, Ficha de Docentes). "CIAARA-11" é o **código regimental da
divisão**, não um número de versão. A **v2.1** é a migração da v2.0 (Google Apps Script + Sheets, em
produção) para Next.js + Supabase — **mesmo domínio, plataforma nova**.

## Idioma

Português do Brasil em **tudo**: interface, spec, plan, tasks, comentário de código, mensagem de
commit, nome de variável e de função. Identificadores de banco em `snake_case` sem acento (restrição
do motor, não tradução). Nada de `WeeklyClassDetail`, `teachingHours`, `subject`, `student`.

## Plataforma — decidida, não em aberto

| Camada | Decisão |
|---|---|
| Framework | Next.js 15+, App Router, React 19, TypeScript `strict`. **Server Components por padrão** |
| Estilo | Tailwind CSS v4 (`@theme`, CSS-first) |
| Componentes | shadcn/ui (Radix + `cva`), copiados para `components/ui/` e versionados |
| Banco | Supabase PostgreSQL |
| Auth | Supabase Auth — **e-mail/senha; a conta é CADASTRADA pelo Admin**, com senha temporária mostrada uma vez e **troca obrigatória** no primeiro acesso. Signup público desabilitado. ⚠️ **Convite por e-mail PERMANENTEMENTE removido, e não há envio de e-mail em lugar nenhum** *(D-USR-1 e D-USR-2, decisão de Bernardo Villas Boas, 03/10/2026)*, com guarda em `tests/unidade/sem-convite-nem-envio-de-email.test.ts` |
| Autorização | **RLS no banco** + matriz `perfil_permissao` como dado |
| Dados | `@supabase/ssr` (servidor) · `@supabase/supabase-js` (cliente). **Sem ORM** |
| Mutações | Server Actions + **Zod na primeira linha, sempre** |
| Estado de navegação | **URL** (`searchParams`) via `nuqs`. Zustand só para estado efêmero de UI |
| Gráficos | Recharts · **Impressão** CSS `@media print` + rotas `/print/*` |
| Testes | Vitest (unidade) · Playwright (e2e) · pgTAP (invariantes SQL) |
| Hospedagem | Vercel, preview por branch · **Repositório** GitHub, Conventional Commits |
| ETL | Python (`scripts/etl/`), reaproveita `migracao/*.py` da v2.0 |

**Proibido, sem discussão:** ORM que esconda o SQL (Prisma, Drizzle) · banco fora do Supabase ·
biblioteca de componentes além de shadcn/Radix · **regra de negócio implementada apenas na UI**.

**Aposentado da v2.0, não reintroduzir:** `clasp`, `BUILD_ID`, `implantacao/MANIFESTO.md`,
`include()`/`HtmlService`, `AppState` como objeto global, o objeto global `UI`, Chart.js, Bootstrap.
Implantação agora é **Git → preview por branch → merge → produção**.

## Documentos de referência — e quando ler cada um

Vivem em `docs/`. **Leia antes de responder sobre requisito; não parafraseie de memória.**

⚠️ **Documento em `.md` e `.docx`: o `.md` prevalece** *(decisão de Bernardo Villas Boas, 17/09/2026)*. O
`.docx` é o **documento original entregue** e é **preservado como tal — nunca emendado nem apagado** (regra
4). Toda emenda vai **só** no `.md`, que registra, junto dela, que o `.docx` não a recebeu. Motivo: o repositório
é a única fonte da verdade (P-1), e duas cópias do mesmo documento normativo sem regra de precedência é lacuna de
governança. Reflexão manual no `.docx` a cada emenda falha por desgaste. **E toda citação de requisito de OUTRA
spec carrega o número da spec** — `FR-001` da spec 002 —, porque cada spec reusa os mesmos números com conteúdo
diferente *(decisão de 17/09/2026)*. ⚠️ **Medido no histórico em
17/09/2026: 11 documentos já divergiam antes desta regra** — o `.md` foi emendado e o `.docx` não: BRIEF, 05,
06, 10, 21, 22, 23, 24, 25, 31 e a constituição (40). A regra não os altera: confirma que o `.md` é o que vale.

| Quando | Leia |
|---|---|
| **Sempre, antes de qualquer fatia** | `docs/vibe-coding/40-Constitution-v2.1.md` — os 11 princípios. Prevalece sobre qualquer plano |
| Dúvida sobre consistência entre documentos | `docs/BRIEF-v2.1.md` — o contrato. Se algo parecer errado nele, **reporte, não invente alternativa** |
| Vai portar uma regra `RN-` | `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md` — **o contrato do domínio** |
| Vai implementar um `RF-` | `docs/fase-1/02-Requisitos-Funcionais.md` (coluna *Destino na v2.1*) |
| Vai escrever migration | `docs/fase-2/21-Schema-Fisico-PostgreSQL.md` + `docs/sql-referencia/*.sql` **na ordem numérica** |
| Vai escrever policy RLS ou mexer em auth | `docs/fase-2/22-Seguranca-RLS-e-Autenticacao.md` |
| Vai criar tela ou componente | `docs/fase-2/23-Design-System-Tailwind-shadcn.md` |
| Não sabe onde um arquivo mora | `docs/fase-2/24-Estrutura-do-Repositorio-e-Convencoes.md` |
| Vai buscar/ mutar dado | `docs/fase-2/25-Camada-de-Dados-e-Estado.md` |
| Vai começar um épico | `docs/fase-1/06-Backlog-de-Epicos-V2.1.md` (§3) + `docs/vibe-coding/42-Prompts-por-Epico.md` |
| Dúvida de processo ou implantação | `docs/fase-1/10-Plano-de-Execucao-Vibe-Coding.md` |
| Dúvida de vocabulário | `docs/fase-1/07-Glossario.md` — sobretudo a coluna *Equivalente na v2.0* |
| Vai mexer no ETL / no corte | `docs/fase-3/30-Plano-de-Migracao-ETL.md` e `31-Mapa-De-Para-Sheets-PostgreSQL.md` |

## Regras invioláveis

1. **Nenhuma regra do documento 04 é alterada.** Portar é reescrever na sintaxe nova **preservando o
   comportamento — inclusive o que parecer errado**. Achou algo estranho? **Liste ao final; não
   conserte.** Alterar exige autorização nominal do Bernardo.
2. **Contenção de escopo.** *Este processo está atribuído à CIAARA-11 na Matriz de
   Responsabilidades?* Se não, está fora. Nota, média, aprovação, documento escolar, AVA/EAD,
   reserva de salas como recurso, corpo discente e infraestrutura são de outras divisões
   (`RNF-NORM-06`).
3. **Paridade antes de novidade.** Enquanto não houver paridade funcional com a v2.0, **nenhuma
   funcionalidade nova de negócio entra**. Pergunta de triagem: *isto é paridade ou é novidade?*
4. **Nada é apagado.** Exclusão é **lógica** (`status = 'inativo'`). Nenhuma tabela tem policy
   `FOR DELETE`, e **isso é regra de negócio, não lacuna** (`RN-INST-05` generalizada). PR que
   acrescenta `for delete` é rejeitado sem discussão.
   **Exceção única, delimitada e registrada** — *"Autorização de Bernardo Villas Boas, 15/09/2026:
   fica autorizada a exclusão permanente de instrutor, delimitada a registro SEM HISTÓRICO NENHUM.
   [...] Motivo: a regra existe para proteger histórico, e um cadastro criado por engano não tem
   histórico a proteger."* Só instrutor sem aula, atribuição, vínculo, conta, avaliação nem
   responsabilidade de curso; só pelas funções com porteiro de `20260915140100`, que conferem tudo no
   banco. **Continua sem policy e sem privilégio de DELETE**.
   **Emenda de 24/09/2026** *(decisão D-B1 de Bernardo Villas Boas, spec 010; emenda nominal aprovada
   no clarify do mesmo dia)*: **a exceção passa a cobrir TRÊS tabelas — `instrutores`, `disciplinas` e
   `unidades_ensino`** —, sempre delimitada a registro **SEM HISTÓRICO NENHUM** (disciplina sem linha de
   turma, vínculo, avaliação, planejamento, UE nem aula, inclusive a alcançada por
   `disciplina_codigo_legado_v1`; UE sem aula), **sempre por RPC com porteiro** que confere os
   impedimentos no banco e recusa com `23503`, com **confirmação pelo código**, e — novo em relação à
   de instrutor — com **rastro de quem, o quê e quando** numa tabela só de acréscimo. **Continua sem
   policy e sem privilégio de DELETE; nenhuma outra tabela ganha exceção** (`FR-008.1` da spec 006;
   `FR-020` a `FR-025` da spec 010). Estender a cursos, turmas e salas é pendência `PEND-5b-1`, não
   escopo. Medido em 24/09/2026: **nenhuma** das 175 disciplinas reais é excluível (0 sem dependente).
   **Emenda de 03/10/2026** *(decisão de Bernardo Villas Boas, na reconferência do PR 2 da spec 011)*:
   **a exceção passa a cobrir uma QUARTA tabela — `usuarios`** —, com um desenho diferente das três
   primeiras e por uma razão medida. *"EXCLUIR usuário permanentemente (admin) (…) conta SEM registros
   dependentes → apaga a credencial e a linha; conta COM dependentes → apaga a credencial de vez e
   anonimiza a linha."* ⚠️ **São DOIS caminhos porque `criado_por`/`editado_por` existem em 27 tabelas
   e NÃO têm FK nenhuma** (medido em 03/10/2026): apagar a linha não viola restrição alguma, e o que
   se perde é a **resolução do autor** — o histórico passaria a exibir `uuid` sem nome. Então conta que
   **nunca carimbou nada** sai inteira (não há histórico a proteger, a mesma lógica da exceção de
   instrutor), e conta que carimbou **fica anonimizada**: nome e nome de exibição viram
   *"Conta excluída"*, a foto sai, `auth_user_id` vira nulo, `excluida_em` é marcada, e o e-mail vai
   para um sentinela `.invalid` — **o que libera o endereço para um novo cadastro**, que é requisito.
   **Continua sem policy e sem privilégio de `DELETE`**: quem apaga é `public.excluir_conta`,
   `SECURITY DEFINER`, com porteiro de Admin, da própria conta e do último Admin ativo, e com rastro em
   `auditoria_de_conta` gravado **antes** de a linha mudar. **Nenhuma outra tabela ganha exceção.**
   ⚠️ **E O ALCANCE REAL DO CÓDIGO É MAIOR QUE O DESTE PARÁGRAFO EM DOIS PONTOS, declarados aqui
   porque descobri-los depois seria pior** *(medidos em 03/10/2026; pendentes de ratificação sua)*:
   **(a)** `public.excluir_conta` executa `delete from public.usuario_curso where usuario_id = …` nos
   **dois** caminhos — é uma **quinta** tabela, e a linha acima diz *"nenhuma outra"*. O que ela
   guarda é o **vínculo da conta com cursos**, que é alcance de acesso e não histórico acadêmico:
   mantê-lo apontando para conta excluída deixaria escopo órfão. **(b)** a Server Action apaga, em
   `auth.users`, a credencial **órfã** presa no e-mail da conta — a que `auth_user_id` nulo deixava
   para trás —, e **preserva** a credencial que outra conta referencia. Credencial não é cadastro
   (é o que a seção da fonte da verdade já diz), mas é **apagamento**, e por isso está escrito.
   ⚠️ **A asserção de pgTAP que codifica esta regra conta `pg_policy.polcmd = 'd'` e continua ZERO** —
   ela não enxerga nenhum dos dois, porque os dois acontecem dentro de função `SECURITY DEFINER`.
5. **`migracao_log` é append-only.** Nunca reescrever linha já gravada — corrigir é **logar evento
   novo**. Bloqueado por gatilho **inclusive para `service_role`** (Princípio IV).
   ⚠️ **Lacuna conhecida, anotada em 17/09/2026 — pendência `PEND-5a-3` (spec 009):** o gatilho
   `trg_migracao_log_imutavel` recusa **`UPDATE` e `DELETE`**, mas **não `TRUNCATE`**, e a `service_role`
   **tem** o privilégio de `TRUNCATE` na tabela — pode esvaziá-la sem passar pelo gatilho. **A
   imutabilidade prometida acima ainda não é integral.** Medido no banco local em 17/09/2026: gatilho
   `BEFORE DELETE OR UPDATE`, privilégio `TRUNCATE` para `service_role` e `postgres`; e provado numa
   tabela descartável com o mesmo gatilho, desfeita em seguida — `DELETE` recusado, `TRUNCATE` esvaziou.
   **A regra não mudou, e o comportamento também não**: esta nota só faz o documento dizer o que vale hoje.
   *(decisão de Bernardo Villas Boas, 17/09/2026)*
6. **Regra normativa vira alerta, nunca bloqueio** (`RN-DEG-02`). Os tetos AEC 10% / TAD 5% / TR 10%
   e o 9º TA são **alerta**. **Nunca transformá-los em `CHECK`** — mudaria a regra de negócio.
7. **Degradação segura** (`RN-DEG-01`): dependência ausente devolve vazio/neutro com aviso, nunca
   exceção não tratada. `error.tsx` + `loading.tsx` por segmento.
8. **Parâmetro normativo é dado, nunca constante.** Tetos, faixas de CH docente, feriados, janelas e
   reservas do PROENS vivem em `config_parametros` e nas tabelas de calendário (`RNF-NORM-08`).
9. **Nada em `lib/dominio/` importa `supabase`, `next` ou `react`.** Imposto por ESLint.
9.1. **Curso não é apagável, e isso muda como toda amostra é escrita** *(propriedade do sistema desde
   a fatia (a) do Épico 5, 18/09/2026)*. `curso_regime_historico` é **append-only** com `DELETE` e
   `TRUNCATE` recusados por gatilho **inclusive para a `service_role`**, e a FK `cursos` é `restrict`
   — logo **nenhuma amostra apaga curso**. Consequências, que valem para **as fatias futuras
   inteiras**: toda amostra que cria curso MUST ser **idempotente**, reaproveitando o que já existe;
   identificadores MUST ser **gerados ou buscados**, **nunca fixos** — a RPC gera o `id` dela, e
   código fixo faz a segunda execução falhar por `23505`, que **parece recusa de permissão e não é**.
   ⚠️ **E a idempotência MUST ser provada rodando a suíte DUAS VEZES SEGUIDAS** — foi assim que ela
   foi verificada aqui, e é o único jeito de saber que a limpeza não era o que fazia a suíte passar.
9.1.1. **Toda varredura por busca de texto MUST remover COMENTÁRIO antes de contar** — em
   `pg_proc.prosrc`, em TypeScript, em SQL, em qualquer lugar *(decisão de Bernardo Villas Boas,
   18/09/2026, na segunda ocorrência: duas vezes é padrão)*. **Uso mencionado não é uso.** As duas:
   na fatia (b) do Épico 4, três verificações leram a **própria documentação** como violação — a frase
   *"ele não conhece instrutor"* contada como se conhecesse; na fatia (a) do Épico 5, a varredura de
   consumidores de `app.cursos_do_usuario()` produziu um quarto consumidor que **não existe**, porque
   `criar_curso_com_regime` a **menciona num comentário** e nunca a chama. ⚠️ **Os dois erram para
   lados opostos e ambos são caros**: o primeiro ensina a **apagar a documentação** para ficar verde;
   o segundo faz **crescer uma lista de impacto**, e lista que cresce sem motivo manda mexer em código
   que não precisava. Em SQL, `regexp_replace(prosrc, '--[^
]*', '', 'g')`; em código, ler sem
   comentário antes de casar o padrão.
9.2. **Todo "medido: N" MUST nomear o artefato contra o qual foi medido** — a origem, o banco, a
   lista de um documento, o repositório *(decisão de Bernardo Villas Boas, 18/09/2026, na terceira
   ocorrência)*. **Número sem artefato nomeado é número que ninguém consegue reconferir**, e os três
   casos desta fatia mediram, cada um, a coisa errada: o **0** da conferência 3 do ETL (medido na base
   **carregada**, quando o que a conferência pergunta é sobre a **origem** — são **13**); os **"16
   testes existentes a ajustar"** (eram **17**); e as **"31 policies em 16 tabelas"** (medido sobre a
   **lista do próprio documento**, não sobre o banco — são **30 em 15**). ⚠️ **Os três passaram por
   revisão sem serem notados**, porque um número isolado parece um fato; o que o torna conferível é o
   artefato ao lado dele.
9.3. **Nenhuma afirmação de resultado entra em disco antes da medição que a sustenta**
   *(decisão de Bernardo Villas Boas, 18/09/2026)*. Vale para relatório, comentário, cabeçalho de
   migration, spec e mensagem de commit: se a frase diz *"passou"*, *"não houve corrupção"* ou *"são
   N"*, a medição vem **antes** de a frase ser escrita. Quando o texto precisa existir antes, o lugar
   do número é um marcador explícito — `[pendente]` — trocado **depois**, e nunca uma estimativa
   plausível. ⚠️ **O modo de falha é específico e caro**: a frase escrita por antecipação quase sempre
   **acerta**, e por isso a vez em que ela erra passa despercebida — foi o que produziu o veredito
   falso e tranquilizador do script da corrida, que contava uma recusa como corrupção.
10. **Não regressão se prova por invariante**, nunca por diff com a saída histórica de um curso.
    **A CAHO 2026 foi rejeitada como padrão-ouro** (Bernardo, 10/08/2026) — não reabrir.
11. **`RNF-NORM-04` permanece rejeitado** (sequenciamento pedagógico de técnica de ensino): não gera
    requisito, em nenhuma etapa do Épico 12. **LIQ-2 permanece fechado**: `Instrutor_Impedimento`
    **não será criada**; a coluna "Observação" da LIQ sai **sempre vazia** — é comportamento
    pretendido, verificado por teste.

## Vocabulário

**Termos intraduzíveis** — nunca traduzidos, abreviados de outra forma ou substituídos por sinônimo,
em código, schema, spec, comentário, commit, interface ou nome de arquivo:

> **CHD · AEC · TAD · TR · TA · DSA · CHR · PROENS · DGPM-101 · DGPM-103 · DEnsM-1002/1004/2001/2003 ·
> PCP-FCT-2 · NORMHIDRO nº 30-23 · CAHO · LIQ · OS de Instrutoria · ROTA · LHFC · PM · OD · TFM** —
> e todas as siglas de curso (C-Ap-HN, C-Ap-FR, C-Esp-ALH…).

**"Disciplina", nunca "Matéria"** (decisão P-14, 10/08/2026) — em schema, código, interface e
documentação. `disciplinas`, `instrutor_disciplina`, `turma_disciplina`, `disciplina_id`.

**Fórmula de composição:** `CHT = CHD + AEC + TAD + TR`. **Estudo Individual fica fora da soma**,
controlado à parte.

**Faixas de CH docente por regime:** 20h → 8–12 h · 40h → 16–24 h · Dedicação Exclusiva → 16–30 h.
O teto é a **faixa**, nunca o número do regime (`RN-2027-06`).

Regra prática: **se o Bernardo não usaria a palavra numa conversa, ela não entra no código.**

## A fonte da verdade, e a direção em que as coisas andam

*(decisão de **Bernardo Villas Boas**, **24/09/2026**)*

> **O banco REMOTO é a fonte da verdade dos CADASTROS** — cursos, turmas, instrutores, e
> disciplinas quando a fatia (b) for mesclada. **Quem testa edita e completa esses dados pelo
> preview.** A planilha da v2.0 continua fonte **só dos lançamentos** — aulas, avaliações e
> atividades — até os épicos que os implementam.

⚠️ **A REGRA DE DIREÇÃO, e ela não tem exceção:**

| O quê | De onde | Para onde |
|---|---|---|
| **Estrutura** (migrations, funções, policies) | do **repositório** | para os **dois** bancos |
| **Dado** | do **remoto** | **só** para o **local** |
| **Dado** | do **local** | **para lugar nenhum** |

**Dado NUNCA vai do local para o remoto.** O que o banco local tem é resto de suíte, amostra de
teste e experimento — empurrá-lo para o remoto apagaria o trabalho de quem está testando. O
caminho autorizado, e o único que existe em código, é
`python -m scripts.manutencao.dado_do_remoto`: ele lê o remoto, guarda uma cópia datada **fora do
git**, recria o local pelas migrations e restaura ali o retrato. Ele **recusa** qualquer destino
que não seja o Docker desta máquina — provado por `provar_porteiro_do_dado.py`, com três
endereços não-locais recusados e o local aprovado.

⚠️ **CONSEQUÊNCIA IMEDIATA NA R-05, e ela já está aplicada:** linha sem `origem_migracao_v1`
deixou de ser sintoma de carga incompleta. A partir desta decisão, **sem procedência e COM
auditoria** (`criado_por` preenchido, que só o gatilho põe quando há sessão) é o registro normal
de quem **nasceu na tela**; **sem procedência e SEM auditoria** continua **bloqueando**. As duas
isenções convivem: a nominal de `usuarios` (credencial do Auth, 23/09) e esta, geral (24/09) —
trocar uma pela outra faria a conta que abriu o ambiente voltar a bloquear. Provado por
`scripts/etl/provar_r05_auditoria.py`, com o caso que discrimina.

⚠️ **O QUE ISSO NÃO AUTORIZA:** escrever no remoto por script, rodar suíte contra ele, ou usar a
carga do ETL para "atualizar" cadastro que alguém editou na tela. A carga final da planilha será
**seletiva** — ver a pendência **VIRADA-1**, abaixo.

⚠️ **E TODA APLICAÇÃO DE MIGRATION NO REMOTO É PRECEDIDA DE BACKUP** *(decisão de Bernardo Villas
Boas, 24/09/2026)*. Antes de `supabase db push --linked`, roda-se

```
python -m scripts.manutencao.dado_do_remoto --somente-copia
```

e **o arquivo datado que ele imprime é citado no relatório da aplicação**. O modo `--somente-copia`
existe exatamente para isto: ele guarda a cópia e **não toca no banco local** — sem ele, quem
quisesse só o backup perderia a base local no `db reset` do modo completo.

**Por que a regra nasce agora:** enquanto o remoto estava vazio de dado de negócio, uma migration
que desse errado custava um `db push` de novo. Desde que ele virou **fonte da verdade dos
cadastros**, ela custa o trabalho que os testadores fizeram na tela — e isso não está em lugar
nenhum além dali. ⚠️ **O backup não é rede de segurança automática**: restaurá-lo no remoto seria
escrita no remoto, que esta mesma seção proíbe sem decisão expressa. O que ele garante é que o
dado **existe** para ser reposto quando a decisão vier.

⚠️ **A CÓPIA NÃO TRAZ O SCHEMA `auth`** — credencial não é cadastro. Um remoto restaurado a partir
dela teria os cadastros e nenhuma senha; as contas se refazem **pelo cadastro do Admin**, que gera a senha temporária e a entrega em mãos *(D-USR-2; era "por convite", e o convite saiu em 03/10/2026)*.

## Convenções de banco

- `snake_case` minúsculo, sem acento, sem aspas. **Tabelas no plural.**
- `id uuid primary key default gen_random_uuid()`.
- `codigo text unique not null` — guarda o `ID_*` da v2.0 verbatim (`VIN-000123`, `TDI-000210`). ⚠️ **Nem toda
  tabela tem prefixo**: `cursos.codigo` é a **sigla institucional** (`C-Ap-FR`) e `turmas.codigo` é `sigla [rótulo] ano`
  (`C-ApA-PCN-PR-EAD T2 2026`) — o exemplo `CUR-000001` que esta linha trazia era vencido (D-6 da spec 009, 17/09/2026).
  **FKs apontam para `id`, nunca para `codigo`.**
- `origem_migracao_v1 text` em toda tabela migrada.
- **Exclusão lógica universal:** `status` explícito (`ativo`/`inativo`), **nunca inferido de `NULL`**.
- **Auditoria:** `criado_por`, `criado_em`, `editado_por`, `editado_em` — preenchidos pelo trigger
  `app.set_auditoria()` a partir de `auth.uid()`.
- **Vigência temporal:** `vigente_de date not null` + `vigente_ate date null` (`NULL` = vigente).
  Resolução pelo maior `vigente_de <= data_do_fato`. **Nenhuma edição reinterpreta o passado.**
- **`ENUM` só para domínio normativo fechado.** Domínio operacional administrável vive em
  `config_listas` com FK. Na dúvida, `config_listas` — `ENUM` fechado cedo demais é migration.
- `timestamptz`, banco em UTC, apresentação em `America/Sao_Paulo`.
- Coluna derivada: `GENERATED ALWAYS AS … STORED` ou VIEW. **Nunca uma segunda fonte de verdade.**
- **Toda tabela tem `ENABLE ROW LEVEL SECURITY`.** Tabela sem policy é inacessível — **intencional**.
- Toda migration que cria tabela cria junto: RLS, policies, índices, `set_auditoria()`, o quarteto de
  auditoria e `origem_migracao_v1`. **O SQL é escrito à mão**, nunca gerado por diff não lido.
- **Nunca `drop column` nem `drop table`** em tabela com histórico. Coluna sem uso vira comentário
  `-- [APOSENTADA — v2.1]` e fica.

## Convenções de código

- **Ordem de implementação, de dentro para fora:** `lib/dominio/` (regra pura + teste) →
  `lib/validacao/` (Zod) → `lib/acoes/` (Server Action) → `app/` (página) → `components/`.
- `"use client"` **só em folha** — nunca em `page.tsx` nem em `layout.tsx`. O marcador contamina toda
  a subárvore de importação.
- **Nenhum `await` dentro de laço em `app/**`.** Um `select` com join do PostgREST por tela;
  `Promise.all` para consultas independentes.
- Server Action **é endpoint HTTP de fato**: `safeParse` do Zod na primeira linha, sem exceção.
- Estado de tela vai para a **URL** (`nuqs`), não para `useState`. É o que dá deep-link de graça.
- `components/ciaara/` **não define cor literal** — só token do `@theme`.
- **Toda página que tem filtro nasce com o botão "Limpar filtros"** *(decisão de Bernardo Villas Boas,
  23/09/2026 — padrão de tela)*. É **um componente só**, `components/ciaara/botao-limpar-filtros.tsx`,
  e a regra de **quando aparecer mora dentro dele**: só há botão quando há filtro fora do padrão.
  ⚠️ **Segundo componente de limpar filtro é rejeitado** — ele nasceu como JSX solto dentro de
  `FiltrosDeInstrutores.tsx` e virou componente na segunda tela que precisou dele; a terceira cópia
  seria o terceiro botão a divergir. ⚠️ **E o padrão do filtro conta**: `situacao` vale `ativo` por
  padrão, então compará-la com `""` faria o botão nunca aparecer para quem só trocou a situação.
- **Tela sem caminho clicável até ela é tela NÃO ENTREGUE** *(decisão de Bernardo Villas Boas,
  24/09/2026)*. Toda rota de página tem de ser alcançável **por clique** a partir de outra tela —
  destino do menu, botão, aba ou link —, e o botão que leva até ela **segue a permissão da página de
  destino**, nunca uma regra própria.
  ⚠️ **NASCEU DE DOIS DEFEITOS QUE A SUÍTE INTEIRA DEIXOU PASSAR:** `/cursos/novo` não tinha link
  nenhum na aplicação, e a única entrada de `/cursos/[curso]/editar` era um link chamado *"histórico
  e correção"*. **A causa foi o teste**: os percursos chegavam com `page.goto`, que prova que a tela
  **funciona** e não prova que alguém **chega** nela.
  ⚠️ **SÃO DUAS GUARDAS, e uma não substitui a outra:**
  `tests/unidade/toda-tela-tem-caminho.test.ts` varre as rotas e exige o `href` em outro arquivo — e
  ⚠️ **a primeira versão dela era CEGA**, porque lia `lib/navegacao/contrato.ts`, que declara **toda**
  rota do sistema, como se fossem links; só o defeito deliberado mostrou. O **percurso por clique**
  de cada tela fica nos casos de ponta a ponta, e ali `goto` só é aceitável para chegar ao **ponto de
  partida**.
- Densidade antes de beleza: é sistema de gestão, com tabelas grandes.
- Toda função de `lib/dominio/` traz no topo o identificador `RN-` e a **citação literal** da regra.

## Convenções de commit

```
<tipo>(<identificador>): <resumo no imperativo, em português, ≤ 72 caracteres>
```

`feat` · `fix` · `refactor` · `perf` · `test` · `db` (migration) · `docs` · `chore` · `style`.
O `<identificador>` é o `RF-`/`RN-`/`RNF-`/épico de origem. Commit **sem** identificador só em
`chore`, `style` e `docs` genéricos.

```
feat(RF-DSA-08): gerar sugestão semanal do DSA
db(RN-2027-09): criar curso_regime_historico com vigência por EXCLUDE
test(RN-ANT-02): cobrir empate de posto por antiguidade declarada
```

Branch: `<tipo>/<identificador>-<resumo-curto>`. **Nunca `git push` direto na `main`.** Merge por
squash, via PR com o template inteiro preenchido.

**Data de migration: duas datas, e as duas estão certas** *(registrado em 17/09/2026)*. O **nome do
arquivo** carrega carimbo **UTC**, gerado pela CLI do Supabase (`supabase migration new`); o
**cabeçalho e as decisões** carregam a **data local do responsável**. Diferença de um dia entre os dois
é **fuso, não erro** — `20260918002208` é 00:22 UTC, e aqui eram 21:22 de 17/09/2026. ⚠️ **O arquivo
MUST NOT ser renomeado para "corrigir" a data**: o nome é a chave de ordenação das migrations e do
histórico do banco, e renomeá-lo quebra a ordem e a correspondência com o que já foi aplicado.

## Definition of Done — uma fatia só está pronta quando **todos** passam

1. `tsc --noEmit` sem erro e `eslint` sem aviso novo.
2. **Vitest** em toda função de `lib/dominio/` tocada, com casos sintéticos.
3. **pgTAP**: contagens, integridade referencial e uma asserção **nomeada** por regra `RN-` de
   *Risco: Alto*. Stub explicitamente pendente é aceito; **cobertura fingida não**.
4. **RLS — teste negativo por perfil:** o que cada perfil **não** pode ler/escrever é negado **pelo
   banco**. Testar só o caminho feliz não prova nada.
   ⚠️ **E prova de permissão NÃO mora em pgTAP** *(registrado em 17/09/2026, spec 009)*. O pgTAP roda
   como **dono do schema**, e **sob privilégio de dono a RLS não se aplica**: uma asserção de "este
   perfil pode / não pode" escrita ali passaria **com a RLS desligada**, que é o defeito que a suíte
   existe para impedir. A divisão é: **pgTAP prova estrutura e regra de banco** — restrição, gatilho,
   contagem, invariante —, e **quem pode o quê se prova em `tests/invariantes/rls/`**, com **sessão
   autenticada de verdade**. Simular sessão com `request.jwt.claim.sub` no pgTAP serve para **auditoria
   e gatilho** (quem carimbou a linha), **nunca** para autorização.
   ⚠️ **E a recusa MUST ser conferida pelo código certo — `42501`, vindo da RLS.** Aceitar `error not
   null`, ou um `23502` de coluna obrigatória ausente, como se fosse prova de permissão é o modo de
   falha já medido nesta base: seis negativos do `SC-004` passavam pelo motivo errado, e só o
   **controle positivo** os pegou. Toda asserção negativa manda a **linha completa** e confere o
   código.
8. **O caso que discrimina: teste que dá o mesmo veredito antes e depois da mudança não testa a
   mudança** *(registrado em 17/09/2026, spec 009)*. Toda migration que altere **qual permissão,
   coluna ou condição uma regra lê** MUST trazer ao menos um caso cujo **veredito vira** — tipicamente
   um perfil, ou um dado, que tenha a condição **nova** sem ter a **antiga**. Negativo e controle
   positivo provam que a regra **existe**; só o caso que discrimina prova que ela **mudou**.
   **Exemplo, o `N-1b` da fatia (a) do Épico 5:** a escrita de vigência passou de `cursos.editar` para
   `horarios.criar`, e o **Operador** é o único perfil que tem a segunda sem ter a primeira — o
   negativo (quem não tem nenhuma das duas) e o controle positivo (quem tem as duas) passavam
   **antes e depois**, e só por ele a troca de recurso se observa.
5. **Playwright** no percurso principal, incluindo a rota `/print/*` quando houver.
6. Migration aplicada em preview e **revertível** (plano de reversão escrito no PR).
7. Commits no padrão `feat(RF-…): …`.

**São dois comandos, com promessas diferentes** *(emenda de 27/08/2026 — pendência D-8)*:

| Comando | Cobre | Docker? | Promete | Quando |
|---|---|---|---|---|
| **`pnpm verificar`** | tipos, lint, formatação, unidade, build | não | **rapidez** — alvo de 5 min (`SC-008`) | a cada commit |
| **`pnpm verificar:tudo`** | tudo acima **+** pgTAP, RLS negativa e ponta a ponta | sim | **coincidir com o CI** (`SC-005`) | antes de abrir o PR |

Não são redundantes: um só comando não promete as duas coisas. Verde em `verificar:tudo` seguido de
vermelho no CI é **defeito da verificação**, não azar — vira tarefa de correção.

## Gotchas da plataforma — os quatro que produzem defeito silencioso

**1. Fronteira Server/Client.** `"use client"` contamina toda a subárvore de importação. Um deles no
`page.tsx` de instrutores manda a tabela de 177 linhas e o catálogo de siglas para o bundle. Erro de
fronteira **frequentemente não aparece no `tsc`** — aparece no `next build`. Por isso `pnpm build`
faz parte da verificação local.

**2. `service_role` vazando.** `SUPABASE_SERVICE_ROLE_KEY` **ignora a RLS inteira**. Três defesas,
todas obrigatórias: nunca prefixar com `NEXT_PUBLIC_` · `import "server-only"` no topo de
`lib/supabase/admin.ts` (importá-lo de Client Component vira **erro de build**) · regra ESLint
`no-restricted-imports`. **Usos autorizados, e só estes três:** **cadastro de usuário pelo Admin**
(`auth.admin.createUser()`, e `updateUserById` para redefinir senha), carga do ETL, script de
manutenção versionado rodado à mão. ⚠️ **Era "convite de usuário" até 03/10/2026** — a tríade
não mudou de tamanho, mudou de verbo (D-USR-1). A **mensagem da regra de ESLint** foi emendada
junto, porque é por ela que quem programa lê esta norma.
**Nunca por requisição de tela.**

**3. O `GRANT` de `extensions`.** RLS é **filtro sobre privilégio que já existe** — não concede nada
por si. `unaccent`, `btree_gist` e `pg_trgm` vivem no schema `extensions`, e
`app.normalizar_texto()` chama `extensions.unaccent()` **no contexto de quem faz o INSERT**. Sem
`grant usage on schema extensions to authenticated`, **todo INSERT de usuário autenticado falha** —
enquanto ETL, migration e seed passam, porque rodam como dono do schema. Quando uma consulta falhar
com `permission denied`, **o primeiro suspeito é o `GRANT`, não a policy.**

**4. RLS que nega em silêncio.** Policy de `SELECT` restritiva demais faz a tela abrir **vazia, sem
erro**, e o usuário conclui "não tem dado cadastrado". Distinga sempre *"não há"* de *"você não
vê"* no estado vazio. E: **policy não enxerga `OLD`/`NEW`** — quando a regra depende do que mudou
(auto-escalonamento de perfil, por exemplo), é **gatilho**, não policy.

**7. A SUÍTE REAPROVEITAVA O SERVIDOR DE DESENVOLVIMENTO, E O VEREDITO MUDAVA** *(medido em
24/09/2026, com custo)*. `playwright.config.ts` usa `reuseExistingServer: !CI`, e ele **não
distingue** que servidor ocupa a porta: com `pnpm dev:local` de pé para conferir na tela — que é o
uso normal da máquina —, a suíte rodava contra o servidor de **desenvolvimento** em vez do build de
produção contra o qual foi escrita. ⚠️ **O sintoma é o pior possível: quatro casos reprovavam em
QUALQUER ramo, inclusive na `main`**, e a leitura fácil era *"o meu ramo quebrou a vitrine"*. Só
medir a `main` desfez. **A suíte passou a viver na porta 3100** (`PORTA_E2E`), e quem confere
continua na 3000. ⚠️ **Duas consequências vieram junto**: origem escrita à mão (`localhost:3000`) em
quatro arquivos de teste passou a acusar *"o navegador saiu da aplicação"* sobre a própria
aplicação; e o `redirectTo` do convite deixou de valer, porque o **Auth ignora em silêncio** um
destino fora de `additional_redirect_urls` e manda para a `site_url` — o e-mail chegava e o link
abria a porta errada.

**8. `pnpm db:reset` PASSOU A CRIAR UM ADMIN, E ISSO DERRUBOU 12 CASOS DE RLS** *(medido em
24/09/2026)*. Desde que o reset encadeia `conta:local`, a base deixa de nascer sem Admin — e
`tests/invariantes/rls/rls.test.ts` **pressupõe ser o único Admin** (`PEND-5a-5`):
`app.impedir_remocao_do_ultimo_admin()` conta os **outros** Admins ativos, então com um a mais
*"desativar o último Admin"* deixa de ser recusado e as 12 asserções seguintes caem em cascata.
⚠️ **E o modo de falha é o inverso do usual, o que atrasa o diagnóstico**: vermelho no local e
**verde no CI**, porque o CI roda `supabase db reset` direto. Isso é defeito da verificação tanto
quanto o contrário (`SC-005`). **Conserto:** `pnpm db:reset:limpo` — o mesmo comando do CI — é o que
o `verificar:tudo` usa; o `db:reset` que se digita continua criando a conta.

**9. RESTAURAR DADO SEM AVANÇAR AS SEQUÊNCIAS QUEBRA A PRIMEIRA CRIAÇÃO NA TELA** *(medido em
24/09/2026, na conferência de Bernardo)*. As sequências de código vivem em **`app`**, e um dump de
`public` **não as traz**: elas voltam ao início, e o próximo `REG-000001` colide com um que o
retrato acabou de trazer. O sintoma é *"Já existe um registro com este valor"* **com dados
inéditos**, e ele **não aparece em suíte nenhuma** — as suítes semeiam num banco recém-resetado,
onde as sequências estão no lugar. Quem restaura chama `carregar.avancar_sequencias`, que é **uma
função só** e declara, por tabela, como extrair o número (⚠️ `instrutores.codigo` é numérico puro,
os demais são `PREFIXO-NNNNNN`). Guardado por `tests/unidade/sequencias-apos-restaurar.test.ts`.
⚠️ **E a mensagem de recusa passou a distinguir quem escolhe o valor:** *"escolha outro"* vale para
o que a pessoa digita; para código gerado pelo sistema — as **quatro** colunas com `DEFAULT
app.proximo_codigo_*`, medidas no catálogo — a frase é de **erro interno de numeração**, pedindo o
suporte, porque mandar escolher outro valor é mandar fazer o impossível.

**Bônus:** `pnpm db:tipos` **depois de toda migration**. O CI falha se `lib/tipos/database.ts`
divergir do schema. Coluna que o TypeScript não conhece é, quase sempre, coluna inventada.

**5. O gerador de tipos não enxerga gatilho** *(medido em 17/09/2026, spec 009)*. Ele decide se a
coluna é opcional em `Insert` olhando **`DEFAULT` e nulabilidade no catálogo** — nada mais. Então
**toda coluna `NOT NULL` preenchida por gatilho aparece como obrigatória no tipo de inserção**, e o
código tipado é forçado a mandar um valor que o banco ia gerar. Já vale para `cursos.limite_turmas_ano`
(preenchido pela classificação), e valerá para o código de turma, o código `TDI-` e o regime, todos
gerados por gatilho nesta fatia. **Não é defeito e não se conserta com `DEFAULT`** — o `DEFAULT` é
justamente o que o `FR-015.1` proíbe onde a pessoa deveria escolher, e ele não enxerga outra coluna da
linha. O caminho é **não inserir por cliente tipado** onde há gatilho: a escrita vai por **RPC** que
recebe `jsonb`, como `criar_curso_com_regime`. Amostra de teste que insere direto é o outro caso — e
ela usa cliente sem tipo, por isso não acusa.

**5.1. E o `DEFAULT` que chama função precisa de `grant execute` a quem insere** *(padrão, não caso:
duas ocorrências — o gerador `VIN-` da fatia (c) e o `TDI-` da (a))*. O `DEFAULT` é avaliado **com os
direitos de quem faz o `INSERT`**, não com os do dono da tabela, mesmo quando a função é
`SECURITY DEFINER` — a definição precisa ser executável pelo papel. Toda coluna cujo `DEFAULT` chama
função MUST vir com `grant execute on function … to authenticated` (e `service_role`, para o ETL);
sem isso, **a gravação falha com `permission denied for function`**, e o erro aponta para a função, não
para a coluna — diagnóstico caro para quem está criando uma turma. ⚠️ Gatilho é o contrário: função de
gatilho **não** exige `EXECUTE` de quem grava, e por isso ela leva `revoke all` de `public`, `anon` e
`authenticated`.

**4.1. Erro de RLS numa escrita cuja permissão está correta? Olhe a policy de LEITURA**
*(medido em 18/09/2026, spec 009)*. **`INSERT … RETURNING` exige que a linha passe também pela policy
de `SELECT`** — e quando o alcance é resolvido por função **`STABLE`** (`app.alcanca_curso()` →
`app.cursos_do_usuario()`), ela **não enxerga a linha recém-inserida dentro do mesmo comando**: o
alcance dá **falso**, e a recusa chega como **`new row violates row-level security policy`** — mensagem
que aponta para a **escrita** e faz procurar permissão de criar, que estava certa o tempo todo.
**Solução: gerar o `id` antes, inserir sem `RETURNING`, e ler em comando separado**, que tira retrato
novo. ⚠️ **Vai reaparecer em toda RPC que insira em tabela com policy de leitura por alcance** —
`criar_curso_com_regime` foi a primeira.

**6. SEQUÊNCIA NÃO OBEDECE A `ROLLBACK`** *(medido em 18/09/2026, spec 009, com custo)*.
`nextval` e **`setval` são não transacionais** — é assim que duas sessões conseguem pegar números
diferentes sem esperar uma pela outra. A consequência que morde: **um defeito deliberado plantado com
`setval` dentro de uma transação desfeita NÃO é desfeito**. Aqui, uma prova que voltava as quatro
sequências de código a `1` para ver a verificação reprovar deixou-as em `1`, e o pgTAP seguinte
quebrou em **sete arquivos** com `duplicate key value violates unique constraint
"turma_disciplina_codigo_key"` — erro que aponta para a tabela, não para a prova que rodou antes.
⚠️ **Toda prova que mexa em sequência MUST restaurá-la explicitamente**, com o valor lido antes; e
consumir `nextval` numa transação desfeita é inofensivo (a sequência só avança), mas `setval` é
destrutivo e permanente.

**5.2. E dá para ler o mecanismo no tipo gerado, sem abrir o SQL.** Como o gerador **enxerga `DEFAULT`
e não enxerga gatilho**, o tipo revela qual mecanismo preenche a coluna: **opcional em `Insert` =
`DEFAULT`**; **obrigatória apesar de ser preenchida sozinha = gatilho**. Serve de conferência barata de
que a coluna ficou como se pretendia — `turma_disciplina.codigo` virou opcional (é `DEFAULT`), e
`turmas.codigo` continuou obrigatória (é gatilho), que é exatamente o desenho decidido.

**10. `create or replace view` NÃO PRESERVA AS OPÇÕES DA VIEW, e a que ele descarta desliga a RLS**
*(medido em 26/09/2026, na fatia (b) do Épico 5, com o defeito já aplicado no remoto)*. Ele preserva o
objeto, o dono, os privilégios e as dependências — e substitui as `reloptions` pelas do comando. Uma
view que tinha `with (security_invoker = true)` e é recriada por um `create or replace view … as` sem o
`with (…)` **perde a opção em silêncio** e passa a rodar com os direitos do **dono**, que aqui é
`postgres`, com `rolbypassrls = true`. ⚠️ **O efeito é o gotcha 4 ao contrário: em vez de negar em
silêncio, ela CONCEDE em silêncio** — um perfil com alcance restrito a um curso passa a ler a view
inteira, sem erro nenhum e sem nada na tela que sugira o problema. Aqui foi
`vw_instrutor_carga_prevista`, reescrita para o rateio em cinco casos, e o vazamento ia junto para
`vw_instrutor_carga_anual`, que lê dela e está na ficha do instrutor. ⚠️ **Nenhuma asserção da suíte
media OPÇÃO de view** — 102 arquivos mediam definição, coluna, privilégio e policy, e nenhum media
`reloptions`; quem pegou foi a **prova de reversão da T010**, comparando o `pg_dump` de antes com o de
depois. Guardado agora por duas asserções em `supabase/tests/010_estrutura.sql`: **toda** view de
`public` e de `app` tem `security_invoker`, com **uma** exceção nominal —
`vw_instrutor_dados_pessoais`, que **tem de ser** de dono, porque RLS não recorta coluna e o porteiro
do recorte de PII mora no `where` dela (decisão PII-1). A segunda asserção é o controle positivo dessa
exceção: ela exige que a view de PII **continue** sem a opção **e** com o porteiro, para que ninguém a
"conserte" para invoker.

**11. `remove()` NO STORAGE SEM POLICY DE `DELETE` DEVOLVE **SUCESSO** COM LISTA VAZIA** *(medido em
29/09/2026, spec 011)*. `storage.objects` tem RLS, e sem policy de `DELETE` a remoção **não chega ao
objeto** — mas a interface **não devolve erro**: devolve `error: null` e `data: []`. ⚠️ **É o gotcha 4
na forma mais cara: a recusa é silenciosa E parece sucesso.** Código que faça
`if (!error) avisar("removido")` mente, e ninguém descobre, porque a tela diz que deu certo e o
arquivo continua no balde. Quem quiser saber se removeu tem de olhar o **comprimento de `data`**, não
o erro. ⚠️ **E a recusa do Storage não é `42501`:** ele responde por HTTP, com `statusCode` em
**texto** — `403` para RLS, `415` para tipo fora de `allowed_mime_types`, `413` para tamanho acima de
`file_size_limit`. Toda asserção negativa sobre Storage confere **esse** código, e não o do
PostgreSQL. Guardado por `tests/invariantes/rls/avatar-no-storage.test.ts`.

**12. AS GUARDAS DE PONTO ÚNICO SÃO AMPLAS DE PROPÓSITO, E A TELA NOVA VAI ESBARRAR NELAS**
*(medido em 29/09/2026, no PR 3 da fatia (b) — quatro reprovações de uma vez)*. `SC-002` reprova
**qualquer** arquivo que mencione instrutor **e** contenha `<select`, `SelectTrigger`,
`role="combobox"` ou `role="listbox"`; `SC-004` faz o mesmo para turma; `SC-002.1` cobra
`.order("ordem_antiguidade")` em **toda** leitura de lista de instrutor; e há uma que reprova
qualquer `sort` de instrutor fora de `ordenarPorAntiguidade`. ⚠️ **A amplitude é o ponto**: a
`RN-ANT-01` é de Risco **ALTO** e vale por ponto único, e um construtor paralelo devolve o *"esquecer
numa tela nova"* que ele existe para eliminar. ⚠️ **O CONSERTO É USAR OS CANÔNICOS, NUNCA
EXCEPCIONAR A GUARDA** — `SeletorInstrutor`, `SeletorTurma`, `FiltroAvancado`,
`BotaoLimparFiltros` —, e, quando a tela precisa de um `<select>` que **não** é de instrutor nem de
turma (a escolha de curso, por exemplo), ele vai para **arquivo próprio** que não menciona instrutor.
⚠️ **E o endereço com `?turma=` sai de `lib/navegacao/endereco-de-turma.ts`, sempre**: montá-lo à mão
funciona na primeira tela e falha **em silêncio** na que esquecer de codificar, porque o código da
turma contém espaços.

**13. IMPRESSÃO DIGITAL COM CARIMBO DE ACESSO NÃO É "ANTES E DEPOIS" NUM BANCO VIVO**
*(medido em 29/09/2026, na aplicação da migration da spec 011 no remoto)*. A conferência de *"zero
linhas alteradas"* foi feita por **md5 do conteúdo de `usuarios`**, tirado antes e depois do
`db push` — e ele **mudou**. A migration não tinha tocado em linha nenhuma: o que mudou foi
`ultimo_acesso` e `editado_em` de **uma** conta, carimbados **entre as duas leituras** por alguém
usando o preview, que é o uso normal dele desde que o remoto virou fonte da verdade dos cadastros.
⚠️ **O MODO DE FALHA É A LEITURA FÁCIL**: md5 diferente depois de uma migration lê-se como *"ela
mexeu em linha"*, e o instinto seguinte é restaurar backup no remoto — escrita no remoto, que a
seção da fonte da verdade proíbe. ⚠️ **O INSTRUMENTO QUE SERVE é comparar os DOIS RETRATOS
DATADOS** que o próprio rito já produz: `--somente-copia` antes e depois, e `diff` nos dois
arquivos. Ali a diferença aparece nomeada — aqui, **uma só**: a coluna nova na lista do `INSERT`,
com `NULL` em todas as linhas. E é o backup tirado **imediatamente antes** do push que prova a
ordem dos fatos, porque ele já trazia o carimbo novo.

**14. O LIMITE DE CORPO DA SERVER ACTION É 1 MB POR PADRÃO, E ELE NÃO DÁ MENSAGEM: DERRUBA A TELA**
*(medido em 30/09/2026, no PR 1 da spec 011, por conferência de Bernardo no preview)*. A tela do
avatar promete **até 2 MB** — o que o balde aceita — e **toda foto entre 1 e 2 MB era recusada**, que
é a faixa de qualquer foto de câmera de celular. A causa é o padrão do Next 16.3.3:
`node_modules/next/dist/server/app-render/action-handler.js:519` usa `1024 * 1024` quando
`experimental.serverActions.bodySizeLimit` não está declarado, e responde
`413 Body exceeded 1 MB limit`. ⚠️ **A RECUSA ACONTECE NO TRANSPORTE, ANTES DE A AÇÃO RODAR**, então
nenhum `try/catch` de Server Action a vê: a página inteira cai no `error.tsx` com *"Algo falhou nesta
tela"* (React #441), que se lê como defeito da aplicação. ⚠️ **E O TESTE DE 1×1 NÃO PEGA**: a amostra
canônica de imagem pesa 70 bytes, exercita o caminho e **não** exercita o limite — toda suíte de
upload precisa de um caso **entre o limite de transporte e o limite da regra**. ⚠️ **O limite de
transporte MUST ser mais FOLGADO que a regra** (aqui, `3mb` contra os 2 MB do balde): o corpo carrega
o arquivo mais o envelope `multipart`, e com os dois iguais quem barraria a foto seria o transporte,
com o 413 genérico, em vez da regra, com a frase em português.

**15. PORTEIRO ESCRITO COM `if not funcao()` FALHA ABERTO QUANDO A FUNÇÃO DEVOLVE `NULL`**
*(medido em 03/10/2026, na M3 da spec 011)*. `app.eh_admin()` é `app.perfil_atual() = 'admin'`, e
**sem sessão ela devolve `NULL`, não `false`** — comparação com nulo dá nulo. Em PL/pgSQL,
`if not NULL then … end if` **não entra**: o `raise` é pulado e a função segue em frente. O porteiro
de `dependentes_da_conta` nasceu assim e **devolvia a lista de onde a conta agiu para quem não tinha
sessão nenhuma**. ⚠️ **O modo de falha é o pior possível: a guarda existe, está escrita, parece certa
e não barra ninguém.** ⚠️ **Quem pegou foi o pgTAP**, que roda **sem sessão** — e por isso toda função
com porteiro MUST ter uma asserção ali, mesmo que a permissão "não se prove em pgTAP": o que se prova
não é RLS, é que a função levanta exceção por conta própria. **A forma correta é
`coalesce(app.eh_admin(), false) is not true`.**

⚠️ **E A PRIMEIRA REDAÇÃO DESTE GOTCHA ERRAVA EM DOIS PONTOS, medidos horas depois, no mesmo dia.**
Ela dizia que `registrar_acao_em_conta` *"tem o mesmo `if not`, mas é inofensiva POR ACIDENTE, porque o
`raise` de `auth.uid() is null` vem antes"*, e que **"os dois foram corrigidos"**. **As duas afirmações
eram falsas:** a função **não havia sido corrigida** (o `if not app.eh_admin()` seguia no arquivo
`20261002195248`, já aplicado no remoto), e o `auth.uid()` **não protege nada aqui** — ele protege
contra *"sem sessão"*, e o ator que importa **tem sessão**.

⚠️ **O ATOR É A CONTA QUE O ADMIN ACABOU DE DESATIVAR.** `app.perfil_atual()` filtra
`status = 'ativo'`, e desativar **não toca a credencial** — de propósito, o cadastro fica. Então ela
**autentica**, `auth.uid()` devolve o id dela, e `eh_admin()` devolve **NULL**: o porteiro não entra no
`if`. **Medido com sessão real em 03/10/2026: a conta desativada GRAVOU linha na trilha imutável**,
com `error: null`. O mesmo vale para credencial órfã, que é o que a exclusão deixa se o passo 2 falhar.
⚠️ **Nada apaga aquela linha depois** — a trilha é imutável inclusive para a `service_role`.

⚠️ **O CONSERTO FOI NA RAIZ, e a varredura mostrou que o problema era de UMA função só:**
`20261003042704` faz `app.eh_admin()` devolver `coalesce(…, false)` — **nunca mais NULL** — e troca a
forma no chamador. Dos **9** porteiros escritos `if not app.<fn>()` no catálogo, **8 chamam
`app.pode()`, que devolve `false` explícito sem perfil**, e `app.impedir_autoescalonamento()` usa a
forma **positiva**, que falha fechada. ⚠️ **E a guarda contra reincidência é pgTAP**, duas asserções no
`114`: `app.eh_admin() is not null` (que **reprovava** antes) e **zero** funções com a forma
`if not app.eh_admin()`, lidas **sem comentário** (regra 9.1.1).

⚠️ **A LIÇÃO DE PROCESSO, e ela é a mais cara:** o buraco apareceu **ao plantar um defeito
deliberado em OUTRA função**. Com o porteiro de `excluir_conta` inerte, a recusa chegou **de outro
lugar** — e foi ler de onde que mostrou a forma errada ainda viva. **Defeito deliberado não serve só
para dizer se o teste discrimina: a ORIGEM da recusa que sobra é informação.**

## As seis decisões sobre conta de usuário — D-USR-1 a D-USR-6

*(decisões de **Bernardo Villas Boas**, **03/10/2026**, depois de duas reconferências do PR 2 da spec
011. ⚠️ **Elas são DEFINITIVAS**, e prevalecem sobre qualquer texto anterior deste arquivo, das specs
e dos documentos de fase.)*

| # | A decisão | O que ela revogou |
| --- | --- | --- |
| **D-USR-1** | Convite por e-mail **PERMANENTEMENTE removido**; **nenhum envio de e-mail** | A rota `/convite`, a ação `convidar`, o *reenviar convite*, a recuperação de senha por link e qualquer SMTP |
| **D-USR-2** | Cadastro pelo Admin com **senha temporária mostrada uma vez**; **troca obrigatória** no primeiro acesso | O estado *"cadastro sem credencial"* como estado legítimo de espera |
| **D-USR-3** | O Admin **exclui permanentemente qualquer conta** (menos a própria e o último Admin), **em qualquer estado**; **e-mail liberado** | A recusa de exclusão por dependente (`FR-045`/`FR-046` de origem e o `SC-005` antigo da spec 011) |
| **D-USR-4** | **Confirmação simples, sem digitar nada** | A confirmação por **e-mail digitado**, que valeu um dia, e com ela as props `corpo` e `confirmacaoDesabilitada` do `DialogoConfirmacao` |
| **D-USR-5** | **Editar em página própria**: nome, perfil e acessos | Formulário dentro da linha da lista |
| **D-USR-6** | Em cada linha: **Editar · Redefinir senha · Desativar/Reativar · Excluir** | A linha com três ações e sem verbo de edição |

⚠️ **A D-USR-1 TEM GUARDA, NÃO SÓ TEXTO**, e isso é o que faz *"permanentemente"* significar algo:
`tests/unidade/sem-convite-nem-envio-de-email.test.ts` varre `app/`, `lib/`, `components/` e
`scripts/` — **código sem comentário** (regra 9.1.1) — e reprova se `inviteUserByEmail`,
`resetPasswordForEmail`, `signInWithOtp`, `generateLink` ou envio direto voltarem; confere que não há
rota `/convite` nem `/recuperar-senha`; e confere que o **`supabase/config.toml`** não aponta para
elas. ⚠️ **Com controle positivo** (`createUser` tem de ser encontrado), porque varredura que não
acha nada passa igual quando está cega. ⚠️ **Ela nasceu vermelha num defeito real:** o `config.toml`
ainda trazia **seis** destinos `/convite` em `additional_redirect_urls`, dias depois de a rota ter
sido apagada — e este arquivo já afirmava, como fato medido, que ele estava *"sem os destinos"*.

⚠️ **O QUE AS SEIS NÃO ALCANÇAM, e precisa da sua mão:** os **templates de e-mail**, a lista de
**redirecionamentos** e o **SMTP** do projeto **remoto** vivem no painel do Supabase, fora do
repositório. Tirar `/convite` do `config.toml` muda o stack **local**; enquanto o painel do remoto
aceitar o destino e tiver template de convite ativo, a decisão vale no código e não vale no ambiente.

## Estado atual e onde retomar

*Atualize esta seção ao fim de cada fatia — é a primeira coisa que o agente lê numa sessão nova.*

| Item | Estado |
|---|---|
| Sistema em produção | **v2.0** (Apps Script + Sheets). Continua sendo a produção **até o corte**. Base viva: `Banco de dados CIAARA-11 v2.0`, 23 abas, sendo escrita todo dia |
| Decisão de migrar | ✅ Bernardo, 25/08/2026 |
| Projeto Supabase | ✅ `cqhpfuaweoyglhtrckcp`, **designado desenvolvimento/preview** (FR-022.1) — o de produção nasce antes da carga real do Épico 2 e **não existe ainda**. Schema **preenchido pelo Épico 1**: 27 tabelas, aplicadas do zero por `pnpm db:reset`. ✅ A CLI do Supabase **está autenticada** nesta máquina e o projeto aparece como `linked` — medido em 14/09/2026 e usado em 15/09/2026 para aplicar as migrations da fatia 5c (`supabase db push --linked`) e para conferir o remoto só de leitura (`supabase db query --linked`, `supabase gen types --linked`). A anotação anterior, de que só o banco local era alcançável, estava vencida |
| Repositório GitHub | ✅ `villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1` — **PÚBLICO** desde 26/08/2026, branch padrão `main`. **Replantio FEITO** (FR-021): `main` local e remota em dia. Correspondência de SHA no `README.md` — `d19ab10`→`0eb509c`, `d31bd56`→`e64484d`; os originais seguem intactos no `SIS11`. `gh` com escopos `gist`, `read:org`, `repo`, **`workflow`** |
| Proteção da branch `main` | ✅ **Aplicada em 03/09/2026** e conferida lendo de volta: contextos `qualidade`/`banco`/`build`, `strict=true`, **`enforce_admins=true`** (07/09/2026) e **sem revisão exigida** — num projeto de um operador ninguém aprova o próprio PR (fecha o **CHK014**), mas o portão **barra todo mundo, inclusive você** (fecha o **CHK013**). A `main` não aceita mais push direto. ⚠️ **O comando do documento 10 §2.7 não funcionava**: `gh -F` não aninha chave com ponto e a API devolve 422 — corrigido para JSON via `--input` |
| ⚠️ Repositório público | **O push aconteceu.** Toda a suíte documental das Fases 1–3 está **legível por qualquer pessoa**: estrutura da CIAARA-11, volumes de pessoal, regras da MB, referência normativa e o ref do projeto Supabase. **Não é credencial** — a `service_role` está fora do repo e o `.env.local` é ignorado. Exposição institucional, decidida por Bernardo. Procedimento de vazamento: `README.md` §*Se um segredo vazar* — **rotacionar, nunca apagar o commit** |
| Gerenciador de pacotes | ✅ **`pnpm` confirmado por Bernardo em 26/08/2026.** Pendência fechada |
| Preview na Vercel | 🟨 **Projeto vinculado em 03/09/2026** — `ciaara-11/sistema-de-gestao-academica-v2-1`, **com Production servido em `https://sistema-de-gestao-academica-v2-1.vercel.app` por exceção** (FR-016.1). Escopo **Preview** com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_AMBIENTE=preview`; escopo **Production populado por exceção registrada** no FR-016.1 da spec 001 (15/09/2026), reaproveitando o projeto de dev/preview até o corte. `NEXT_PUBLIC_URL_APLICACAO` existe nos escopos Preview e Production, conferido em 14/09/2026. Faltam as provas T053–T056 |
| Documentação (Fases 1–3 + Vibe Coding) | ✅ Escrita. `docs/sql-referencia/` com os seis scripts de referência |
| **Épico 0 — Fundação** | ✅ **CONCLUÍDO em 07/09/2026 — 72 de 72.** O portão é **prova, não declaração**: cinco defeitos deliberados no PR #2 (descartável, fechado sem merge) produziram cinco reprovações e **cinco merges bloqueados** — erro de tipo, violação da fronteira de `lib/dominio/`, teste de unidade, **ponta a ponta** e contrato de dados desatualizado. O 4º é o que importa: `qualidade` e `banco` verdes, só o `build` vermelho — até 03/09 nenhum contexto o pegaria. `verificar:tudo` local e CI deram **veredito idêntico** sobre o mesmo commit (SC-005). Atomicidade provada: um deploy em `ERROR` não derrubou o anterior |
| **Épico 1 — Schema + RLS** | ✅ **CONCLUÍDO.** Implementado em 30/08/2026 e **na `main`** desde então. Medido no banco: **27 tabelas · 0 sem RLS · 0 com FORCE · 77 policies · 0 de DELETE · 0 UPDATE sem WITH CHECK · 152 linhas de matriz · 10 views**. **80 asserções pgTAP** e **19 testes de RLS com sessão autenticada**, tudo rodando **no CI**, no bloco `banco`, verde. A T091 (abrir PR) ficou **sem objeto**: o código entrou na `main` em 30/08, antes de existir CI ou proteção. Registrado, não encenado — abrir PR retroativo para código já mesclado não provaria nada |
| Épico 1 — o que **não** entrou | A carga das UEs — dependia de `disciplinas`, era do Épico 2 (achado A-13) e ✅ **foi feita em 26/09/2026, no PR 2 da fatia (b) do Épico 5: 587 UEs** (não 572 — ver o Catálogo, abaixo). *(O `ci.yml` saiu desta lista: existe desde 03/09/2026 e roda verde.)* |
| **Catálogo de Unidades de Ensino** | ✅ **CARREGADO no banco em 26/09/2026** (PR 2 da fatia (b), spec 010) — **587 UEs em 138 disciplinas**, com **fundamento normativo em toda linha**. ⚠️ **Os números de 28/08/2026 estão VENCIDOS**: eram *572 UEs, 134 disciplinas, invariante 134/134*, e o extrator corrigido mede **582 UEs em 135 disciplinas** com invariante **135/135** — a diferença é a `TOPOGRAFIA` do `C-Ap-FR`, cujo cabeçalho traz *"LISTA DE UNIDADES DEENSINO"* sem espaço e que o padrão antigo não casava (10 UEs, 100 h). Os **587** carregados são os 582 lidos do PDF **mais as 5 do `EST-QF-APOC`**, cujo currículo é digitalizado e foi **transcrito de imagem** por dois leitores independentes (P-4). Script `scripts/etl/extrair_unidades_ensino.py`; pareamento revisado em `scripts/etl/dados/pareamento_ue.csv`; conferência reexecutável em `scripts/etl/conferir_unidades_ensino.py`. **2 currículos sem UE por natureza** — `C-Espc-FR` e `C-Espc-HN`, por competências (a Q1.b tratava de outra coisa) |
| **Épico 2 — Migração de dados** | ✅ **CONCLUÍDO em 08/09/2026.** **5.394 linhas em 26 tabelas**, transação única, contra o banco local. Reconciliação **APROVADA nas oito bloqueantes** (R-01 a R-08), com a R-02 **provada**: `REG-0176` movido de turma à mão, contagem total intacta em 1.566, e a verificação acusou os dois lados. **96 asserções pgTAP** verdes com a base povoada **e** vazia. Ponto de entrada único: `python -m scripts.etl.executar`, cujo **código de saída é o veredito da reconciliação**. Os dois bloqueios não técnicos caíram: a **CIAARA-14.2 autorizou a hospedagem de dado pessoal em nuvem** (08/09) e a **Q1.b foi resolvida por cruzamento** com as planilhas de planejamento da v1.0 |
| Épico 2 — o que **não** entrou | ~~A carga das UEs~~ ✅ **feita em 26/09/2026** (587 linhas, PR 2 da fatia (b)) — e a aplicação do cruzamento, que **continua pendente**. O texto abaixo é o registro do que valia até ali: `unidades_ensino` estava **vazia** e `registros_aula.unidade_ensino_id` é **nula nas 1.566** — ratificado por Bernardo em 08/09 (*"o ETL deve ser o retrato fiel da origem, sem preenchimentos inventados"*). O cruzamento existe e tem **901 `casado` de 1.566** (`dados/normalizado/ue_cruzamento.csv`); o que falta é reconciliar um **terceiro** espaço de nomes — a sigla de curso do catálogo da DEnsM não bate com `cursos.codigo` em **8 dos 21** (`EST - QF - APHID` × `EST-QF-APHID`) e o `disciplina_id` fecha em **84 de 134** pelo nome |
| **Épico 3 — Auth, usuários e RBAC** | 🟨 **QUASE FECHADO em 09/09/2026.** As cinco histórias implementadas e verificadas: `pnpm verificar:tudo` sai **0** — 16 unidade · **102 pgTAP** · **104 RLS e ambiente** · 5 ponta a ponta. As seis asserções novas guardam a política de senha e a aplicação do `[auth]` do `config.toml`. Cinco telas (`/login`, `/convite`, `/recuperar-senha`, `/admin/usuarios`, `/admin/permissoes`), o fluxo de convite com **e-mail interceptado no Mailpit**, e duas migrations ⚠️ **— e este inventário é RETRATO DE 09/09/2026, não o estado de hoje:** `/convite` e `/recuperar-senha` **foram apagadas** em 02 e 03/10/2026, e o Mailpit deixou de ter papel, porque **não há mais envio de e-mail** (D-USR-1) —: o recorte de PII e o gatilho do último Admin. **Três decisões de Bernardo em 09/09/2026:** a ameaça **A-8 foi ratificada** (o modelo vai de A-1 a **A-8**), a **correção do contrato de conferências foi aprovada** (o `config.toml` versiona parte do que o documento 22 dizia ser só do painel), e as tarefas **T003 e T062.1 ficaram com ele**, para execução manual no painel da Vercel. **PR #5 aberto e verde** — `qualidade`, `banco` e `build` passam, e a ponta a ponta dá **5 passados e 2 pulados no CI, o mesmo do local** (SC-014). ✅ **As duas pendências de banco deste épico caíram**: as duas migrations desta fatia **estão no projeto remoto** — conferido em 15/09/2026, `20260908120000` e `20260909020000` no histórico —, e a CLI **está autenticada** nesta máquina. O registro anterior (`PGRST205` para `vw_instrutores`, CLI sem login) era de 09/09/2026 e venceu. **Falta**: ~~a carga das UEs (herdada do Épico 2)~~ — ✅ **feita em 26/09/2026**, a conferência do painel do projeto remoto, e as T003/T062.1, que ficaram com Bernardo |
| **Épico 3 — gestão de usuários (spec 011), PR 1** | ✅ **MESCLADO na `main` por squash em `b0c5f03` (01/10/2026), pelo PR #22**, com a migration aplicada no remoto em 29/09/2026 e a conferência de Bernardo aprovada em duas rodadas. CI verde nos três blocos na `main`; Production servindo `/perfil` e `/perfil/senha`. *(Registro anterior, vencido: "SEM PR".)* *(Registro anterior, vencido no mesmo dia: "SEM aplicação no remoto".)* Spec `011-gestao-de-usuarios`, **uma migration** (`20260929135747_avatar_e_bucket.sql`). `pnpm verificar:tudo` mede, sobre `35aa0ae` — **o mesmo commit que o CI** —, **1.087** de unidade (80 arquivos) · **402** pgTAP (33) · **211** RLS e ambiente (7) · **283** ponta a ponta (2 pulados); e o **CI dá o mesmo veredito, contagem a contagem** (`SC-005`), verde nos três blocos no run `36618521426`. *(Os **983 · 390 · 192 · 269** anotados antes eram de antes do rebase na `main` com o Épico 5 fechado.)* **Nasceu de um defeito achado por Bernardo na tela, não por teste:** ele entrou pelo preview e **não conseguiu sair** — `encerrarSessao()` existia em `lib/acoes/sessao.ts` desde o Épico 3, com teste, e tinha **ZERO consumidores** no repositório. É a regra *"tela sem caminho clicável é tela não entregue"* aplicada a uma **ação**. O que entrou: o **menu do avatar** no cabeçalho, com identificação, *Meu perfil* e *Sair*; o **avatar com foto** (balde privado `avatares`, 2 MB, JPG/PNG **no motor**) e as **iniciais** quando não há foto; a tela **`/perfil`**, com nome de exibição e foto editáveis e e-mail e perfil **somente leitura, com a razão escrita na tela**; e **`/perfil/senha`**, a tela **única** de senha nova, hoje no modo voluntário e que serve ao obrigatório do PR 2. Três módulos puros novos em `lib/dominio/` — `iniciais-do-nome`, `perfis`, `politica-de-senha`. ⚠️ **O perfil deixou de aparecer em `snake_case`**: `encarregado_administracao_academica` era o que o cabeçalho de **toda tela** mostrava, e o convite oferecia os nove assim. Agora há **um** módulo de tradução, com os nove agrupados por divisão (decisão **D-1**), e **duas** varreduras guardando — literal escrito à mão **e** `{…perfil}` desenhado sem traduzir. ⚠️ **Só a segunda pega o defeito que existia**, porque nenhum valor cru aparecia no código. ✅ **A MIGRATION FOI APLICADA NO REMOTO em 29/09/2026** (T012, autorização de Bernardo na mesma sessão, depois do CI verde), com backup `remoto-20260929-164954.sql` antes e dry-run listando **só** ela. Conferido só por leitura: **46 e 46** migrations; impressão digital do esquema **idêntica** nos dois bancos — `9d66eb3d…`, **1.565** objetos, **diff vazio**; balde `avatares` **privado**, 2 MB, `{image/jpeg,image/png}`, **zero objetos**; **três** policies em `storage.objects` e **zero** de `DELETE` no catálogo inteiro; `avatar_caminho` **nula nas 5 contas**; Production respondendo como antes. ⚠️ **E a prova de "zero linhas alteradas" trocou de instrumento no meio, com lição:** o md5 do conteúdo de `usuarios` **mudou** entre as duas leituras, e **não foi a migration** — `USR-ADMIN-001` teve `ultimo_acesso` e `editado_em` carimbados **antes** do push, e quem prova a ordem é o backup tirado imediatamente antes dele. **Num banco vivo, impressão digital que inclui carimbo de acesso não é "antes e depois"**: ela muda sozinha, justamente enquanto a operação acontece, e a leitura fácil do md5 diferente é *"a migration mexeu em linha"*. O que vale é **comparar os dois retratos datados** — e o diff dos 1,8 MB traz **uma diferença só**: a coluna nova na lista do `INSERT`, com `NULL` nas cinco linhas. Registro em `specs/011-gestao-de-usuarios/plano-de-aplicacao-no-remoto.md`. ⚠️ **E o CI reprovou antes de ficar verde, o que virou correção:** o bloco `banco` subia o stack com `-x …,storage-api,…`, sob um passo chamado *"sem o que os testes nao usam"* — verdadeiro até esta spec, que trouxe o **primeiro consumidor de Storage do repositório**. Dez dos onze casos de `avatar-no-storage.test.ts` reprovaram com `name resolution failed` e `503`, que se leem como defeito da aplicação e são **ausência de contêiner**. Consertado, com a guarda `tests/unidade/ci-sobe-o-que-a-suite-usa.test.ts`, que compara a lista de exclusões do fluxo com o que o código usa e reprova com o defeito de volta. ⚠️ **`imgproxy` ficou de fora, e a primeira versão da correção o trazia junto POR SUPOSIÇÃO** — a medição desmentiu: o stack local sobe sem ele, com `ENABLE_IMAGE_TRANSFORMATION=false`, porque `[storage.image_transformation]` está comentada no `config.toml`. ⚠️ **A CONFERÊNCIA DE 30/09/2026 APROVOU TRÊS COISAS E ACHOU UM DEFEITO NA QUARTA, e ele era DOIS defeitos.** Bernardo aprovou cadastros intactos, sair/entrar pelo avatar e a troca de nome; em `/perfil`, **clicar em *Enviar foto* não abria a janela de arquivos** e não havia como carregar foto nenhuma. **Causa (a):** o botão era `type="submit"` — clicar enviava o formulário **vazio**, e a única porta para a janela era um `<input type="file">` nativo, pequeno e sem destaque, ao lado dele. **Causa (b), que o relato não podia ver:** o limite de corpo da Server Action é **1 MB** por padrão, contra os **2 MB** prometidos — virou o **gotcha 14**. **Causa (c) descartada por medição:** o balde no remoto está certo (privado, 2097152, `{image/jpeg,image/png}`) e as **cinco** variáveis do escopo Preview estão na Vercel. **Conserto:** o botão virou `type="button"` que **abre a janela**, escolher **já envia**, o campo saiu da tela, e `next.config.ts` declara `bodySizeLimit: "3mb"`. ⚠️ **E A RAZÃO DE A SUÍTE NÃO VER ERA A PRÓPRIA SUÍTE:** os casos mandavam o arquivo com `setInputFiles` **direto no campo** — prova que o campo funciona, nunca que alguém **chega** nele clicando. É a mesma forma de erro que criou esta spec. Os dois casos novos — um que espera o evento `filechooser` do navegador, outro com um PNG de **1,5 MB** — reprovam **cada um pela sua causa**, medido nos dois sentidos. **Falta**: a reconferência de Bernardo (`roteiro-de-conferencia-da-foto.md`) e o PR |
| **Épico 3 — gestão de usuários (spec 011), PR 2** | ✅ **SPEC 011 ENCERRADA. APROVADA por Bernardo Villas Boas no preview em 03/10/2026** — cadastro, primeiro acesso, redefinir senha, desativar/reativar, excluir e editar, todos conferidos por clique — **e MESCLADA na `main` por squash em [pendente-merge], pelo PR [pendente-pr]**. O código vive na `main`; o ramo `feat/EPICO-3-admin-sobre-contas` foi apagado. *(Registros anteriores, vencidos: "IMPLEMENTADO no ramo … e SEM PR" e "**Uma migration**".)* **CINCO migrations**, todas aplicadas no remoto antes do merge — `20261002195248_auditoria_de_conta`, `20261003000205_exclusao_de_conta`, `20261003042704_porteiro_de_admin_nao_falha_aberto`, `20261003105719_comentarios_de_catalogo_corrigidos` e `20261003164335_ultimo_admin_conta_so_quem_entra` —, cada uma com backup, dry-run só com ela e conferência só de leitura registrados em `plano-de-aplicacao-no-remoto.md`. `pnpm verificar:tudo` sai **0**: **1.103** de unidade (82 arquivos) · **416** pgTAP (34) · **219** RLS e ambiente (8) · **292** ponta a ponta (2 pulados); **CI verde nos três blocos sobre o mesmo commit** (`3b65a61`, run `37062800080`). O que entrou: **redefinir senha** com senha gerada no servidor, mostrada **uma vez**, e **troca obrigatória no próximo acesso**; **editar nome e perfil** de outra conta, com os **nove perfis agrupados por divisão**; **reativar**; e a **trilha `auditoria_de_conta`** — quatro campos, só de acréscimo, imutável inclusive para a `service_role`. ⚠️ **A regra do último Admin estava AFIRMADA DUAS VEZES E IMPLEMENTADA ZERO** (`estado-atual.md` §3.1): o gatilho existia, o código não. Agora é `lib/dominio/ultimo-admin.ts`, com **duas** regras separadas — o chão de um Admin ativo e a própria conta —, porque **com dois Admins a contagem libera e a própria conta continua intocável**; confundi-las abriria o buraco de um Admin se despromovendo por engano. ✅ **APLICADA NO REMOTO em 02/10/2026**, com backup `remoto-20261002-175617.sql` e dry-run só com ela: **47 e 47** migrations, impressão digital **idêntica** (`1e5e35cc…`, 1.589 objetos, **diff vazio**), trilha **nascendo vazia** com 1 policy de `SELECT`, zero escrita para `authenticated`, 2 gatilhos, **zero** `DELETE` no catálogo, `usuarios` intacta nas 5 contas, Production respondendo. ⚠️ **A CONFERÊNCIA DE 02/10/2026 REPROVOU, E A DE 03/10 REPROVOU DE NOVO — as duas por motivo de DESENHO, não de defeito, e o PR 2 foi REFEITO duas vezes** *(decisões de Bernardo Villas Boas)*. **Na primeira**: o convite por e-mail saiu e o Admin passou a **CADASTRAR** direto, numa **página** `/admin/usuarios/novo`, com **senha temporária aleatória mostrada UMA vez** e troca obrigatória no primeiro acesso; a lista voltou a ser lista (avatar, nome, e-mail, perfil, último acesso) e a edição ganhou **página própria** `/admin/usuarios/[id]` — *"nada de diálogo sobre diálogo na lista"*. **Na segunda**: Bernardo clicou em **Excluir** e **a conta não saiu da lista**. ⚠️ **O DIAGNÓSTICO VEIO DA MEDIÇÃO E CONTRARIOU AS DUAS LEITURAS FÁCEIS:** lido o remoto **só por leitura**, a trilha não tinha **nenhuma** linha `excluir` — e `excluir_conta` grava o rastro **antes** de tocar na linha — e `excluida_em` estava **nulo nas cinco contas**, todas intactas. **Nada havia sido excluído**, logo **não era filtro da lista nem falta de revalidação**: as duas exigiriam que a exclusão tivesse acontecido. A ação **falhou**, e **a falha ficou invisível** — texto de 11px **dentro da linha que não mudou**, que é exatamente o que *"não aconteceu nada"* parece. ⚠️ **A causa provável da falha era transitória; a da cegueira não era** (a RPC chegou ao remoto depois de o botão chegar ao preview), e por isso o conserto foi a **visibilidade**: `AvisoDaLista` publica a resposta de toda ação **acima da tabela**, `alert` para falha e `status` para sucesso — a linha pode desaparecer sem levar a mensagem com ela. O que entrou junto: as ações **em cada linha**, a exclusão permanente e **o e-mail FORA do sistema** — `/recuperar-senha` apagada, `recuperarSenha` e o esquema removidos, o `config.toml` sem os destinos, nenhuma chamada de envio em todo o repositório, e o login dizendo *"Esqueceu a senha? Procure o administrador do sistema."* **Sem pendência de e-mail.** `pnpm verificar:tudo` saiu **0** em 03/10/2026 sobre `133504c` — **1.119** de unidade (83 arquivos) · **430** pgTAP (35) · **222** RLS e ambiente (8) · **297** ponta a ponta (2 pulados) — com **CI verde nos três blocos** (run `37099173791`). ⚠️ **E A RODADA DE 03/10 À NOITE MUDOU ESSES NÚMEROS**, com as seis decisões D-USR: **1.127** de unidade (84 arquivos) · **430** pgTAP (35) · **222** RLS e ambiente (8) · **300** ponta a ponta (2 pulados), e o **CI verde nos três blocos** sobre `7c5c44a` (run `37104897958`) e sobre a ponta `4ea4f4f` (run `37119236623`). ⚠️ **A contagem fecha em 302 casos dos dois lados** — o CI imprime **299 + 1 instável + 2 pulados** porque tem `retries: 2`, e o local **300 + 2**. **Sem migration nesta rodada**, e o remoto segue **idêntico** ao local: `ed9de773…`, **1.595** objetos, `diff` vazio. ⚠️ **A CONTAGEM DA PONTA A PONTA PARECE DIVERGIR E NÃO DIVERGE, e vale saber ler:** o CI imprime **296 passados + 1 instável + 2 pulados**, o local **297 + 2** — são **299 casos dos dois lados**. O CI separa o instável porque tem `retries: 2` e o local tem **0**. ⚠️ **E os dois instáveis desta rodada foram casos DIFERENTES, nenhum deles tocado por ela** — `salas.spec.ts` no local (passou sozinha em 8,9 s e na reexecução da suíte inteira) e `senha-propria.spec.ts:91` no CI (passou na repetição). Com **299** casos a margem de prazo sob quatro processos ficou fina; é a mesma classe da `e2e-instrutores-fragil-sob-carga`, e **o modo de falha caro é ler isso como "o meu ramo quebrou a vitrine"** (gotcha 7). ⚠️ **A RODADA COMEÇOU SEM MIGRATION E GANHOU UMA, por um buraco de segurança achado ao plantar defeito deliberado** — `20261003042704_porteiro_de_admin_nao_falha_aberto.sql`. `public.registrar_acao_em_conta` tinha a forma do **gotcha 15** (`if not app.eh_admin()`), e `app.eh_admin()` devolvia **NULL** para quem não tem cadastro **ativo** — ou seja, **para a conta que o Admin acabou de desativar**, que continua autenticando porque desativar não toca a credencial. **Medido com sessão real: ela GRAVOU linha na trilha imutável, `error: null`** — e nada apaga aquela linha depois. O conserto é na **raiz** (`eh_admin` nunca mais devolve NULL) **e** no chamador, com **duas** asserções de pgTAP contra reincidência; o caso de RLS **reprovava antes e passa agora**. ✅ **APLICADA NO REMOTO em 03/10/2026**, com autorização de Bernardo depois do CI verde em `133504c`: backup **`remoto-20261003-023406.sql`**, dry-run listando **só** ela, `db push` **0**. Conferido só por leitura, na hora: **49 e 49** migrations; impressão digital **idêntica nos dois bancos** — `ed9de773…`, **1.595** objetos, `diff` vazio nas 1.596 linhas (ela era `1a202cfc…` antes, e **mudou do mesmo jeito nos dois lados**, porque é corpo de função que muda; **número de objetos igual** confirma que nada nasceu nem se perdeu); **`app.eh_admin()` sem sessão devolve `false`, e era `NULL`**; **0** funções com a forma que falha aberto, e **era 1**; a ACL da função ficou **idêntica à da irmã `app.pode()`** (privilégio **não** mudou); as **6** policies que a chamam seguem as mesmas; **5** contas vivas de 5, **4** linhas na trilha, **0** policies de `DELETE`; e a Production respondendo como antes (`/login` **200**, as protegidas **307**). Antes dela, a conferência só de leitura confirmava **48 e 48** migrations, impressão digital **idêntica** nos dois bancos (`1a202cfc…`, **1.595** objetos, **diff vazio** nas 1.596 linhas), **5** contas vivas, **0** excluídas, **0** linhas `excluir` na trilha e **zero** policies de `DELETE` no catálogo. ⚠️ **E A RODADA DE 03/10 À NOITE FECHOU AS SEIS DECISÕES D-USR, com três achados que valem mais que os ajustes.** Os ajustes: a confirmação da exclusão perdeu o campo de digitar (D-USR-4) e a linha ganhou **Editar** (D-USR-6). ⚠️ **ACHADO 1 — o convite estava VIVO NA INTERFACE, não só nos documentos:** a tela de **login** dizia *"O acesso é somente por convite do Admin"* — a primeira tela do sistema —, a raiz repetia, e a recusa de *Redefinir senha* mandava usar **«Reenviar convite»**, ação que não existe mais. ⚠️ **E essa recusa alcança 4 das 5 contas reais**, medido no remoto só por leitura: **elas não têm credencial**. O `config.toml` ainda trazia **seis** destinos `/convite`, dias depois de a rota ter sido apagada — e este arquivo afirmava, como fato medido, que ele estava *"sem os destinos"*. **Virou guarda:** `tests/unidade/sem-convite-nem-envio-de-email.test.ts`, vermelha nesse defeito. ⚠️ **ACHADO 2 — a exclusão prometia liberar o e-mail e podia não liberar.** O passo 2 é guardado por `if (alvo.auth_user_id)`, então para conta sem credencial ele **nunca rodava**: a credencial órfã ficava em `auth.users` prendendo o endereço, e o cadastro seguinte reprovava com `email_exists` e a frase *"use recuperação de senha"* — **duplamente falsa**, porque a conta tinha sido apagada e a recuperação não existe. Agora a exclusão apaga a **órfã** e **preserva** a credencial que outra conta usa, com um terceiro aviso na tela para o caso em que o endereço fica preso. ⚠️ **ACHADO 3 — eu escrevi um e-mail pessoal real num comentário de código, em repositório PÚBLICO**, e o pegei antes do commit: as contas passam a ser nomeadas **pelo código**. ⚠️ **E o normativo da própria spec dizia o CONTRÁRIO do que foi construído:** `FR-045`, `FR-046` e `SC-005` exigiam **recusar** a exclusão de conta com dependente e **nomear o que impede** — o código **anonimiza**, por decisão D-USR-3. Os três foram emendados; um critério de sucesso que o produto viola por desenho faz a fatia nascer reprovada no papel. ⚠️ **E A TERCEIRA RECONFERÊNCIA REPROVOU DE NOVO, com a frase mais caçadora possível: «Conta não encontrada.» SOBRE UMA CONTA VISÍVEL NA LISTA.** A causa, medida antes de qualquer conserto: `excluirConta` lia a conta com o **cliente administrativo** antes de tudo e **descartava o `error`** da consulta — com o erro no lixo, **qualquer** falha virava `data: null`, e o `if (!alvo)` seguinte inventava *"não encontrada"*. ⚠️ **ERRO DESCARTADO É PIOR QUE ERRO BRUTO: ele não esconde a causa, ele INVENTA OUTRA** — e mandou duas conferências seguidas procurar o cadastro em vez da credencial. ⚠️ **E A DEPENDÊNCIA ERA DESNECESSÁRIA:** excluir conta **sem credencial** não tem nada para a `service_role` fazer, e **4 das 5 contas reais estão nesse estado**. O Princípio XI diz o inverso do que o código fazia. ⚠️ **A CAUSA AMBIENTAL ERA DA CHAVE, SIM — MAS NÃO PELO MOTIVO QUE EU REGISTREI, e a correção importa mais que o acerto.** Eu escrevi que a suspeita era a chave do Preview estar **desatualizada**, apoiado em que ela tinha **26 dias** no painel contra **19** das demais. **O enquadramento estava errado: o problema era o FORMATO da chave, não a idade dela.** Bernardo mediu o que faltava — **401 em `/admin/users`** com a chave `sb_secret_` — e resolveu trocando pela **`service_role` legada (JWT)** nos dois escopos. ⚠️ **A diferença de datas era coincidência, e eu a transformei em pista** — é o modo de falha do número que parece um fato (regra 9.2 pelo avesso: o artefato estava nomeado, a inferência não). ⚠️ **O MECANISMO, medido no pacote instalado:** `supabase-js` **2.112.4** conhece o formato novo e declara a regra — *chave `sb_publishable_`/`sb_secret_` **nunca** vai como Bearer, só no cabeçalho `apikey`* (`src/lib/fetch.ts`) —, mas **só a aplica nas Edge Functions** (`omitApiKeyAsBearer`). **O cliente de Auth não passa por esse caminho:** `_initSupabaseAuthClient` monta cabeçalho **estático** `{ Authorization: Bearer <chave>, apikey: <chave> }` sem conferir formato, e `@supabase/auth-js` 2.112.4 **não tem uma linha executável** sobre o formato novo. Logo `auth.admin.*` manda a chave nova **também no Bearer**, contra a regra que o próprio SDK escreve; com a legada o Bearer é um JWT `service_role` válido, e passa. ⚠️ **O QUE O CÓDIGO NÃO EXPLICA, e fica dito:** `listUsers` (GET) e `createUser` (POST) mandam **cabeçalho idêntico** — nenhuma usa sessão —, então o pacote não explica por que a listagem funcionou com `sb_secret_` nesta máquina e o cadastro deu 401 no preview. As duas explicações que **não** exigem diferença por verbo são **valor diferente no ambiente que falhou** (a Vercel liga a variável ao **deploy**: trocar sem redeploy deixa o valor antigo rodando) e **propagação de chave recém-criada** — as duas dependem de **tempo**, não de método. ⚠️ **E ISSO MUDA A `PEND-011-4`:** subir o `supabase-js` pode **não bastar**, porque na 2.112.4 o caminho do Auth manda a chave nova no Bearer de qualquer jeito; quem migrar tem de achar a versão em que `_initSupabaseAuthClient` deixa de fazer isso. ⚠️ **E O CHÃO DE UM ADMIN ESTAVA FURADO NO REMOTO:** medido, **3** contas são `admin`/`ativo` e **1** consegue entrar; as duas guardas contavam linha, não pessoa, e **liberavam rebaixar, desativar ou excluir justamente a única que entra** — sem sobrar ninguém para desfazer. A regra passou a contar só quem tem credencial, nos **três** lugares (função pura, gatilho de `UPDATE` e `public.excluir_conta`), e vale **dos dois lados**: admin sem credencial não conta como protetor **nem** como protegido, senão as duas contas fantasma ficariam **indeléveis**. ✅ **APLICADA NO REMOTO em 03/10/2026** (`20261003164335`), com backup `remoto-20261003-141140.sql`, dry-run só com ela e `db push` 0: **51 e 51** migrations, impressão digital **idêntica nos dois** (`ba7f116c…`, 1.595 objetos, `diff` vazio), **3** admins na contagem ingênua e **1** que entra, 5 contas vivas, 4 linhas na trilha, **0** policies de `DELETE`, Production respondendo. `pnpm verificar:tudo` sai **0**: **1.136** unidade (85 arquivos) · **434** pgTAP (35) · **222** RLS e ambiente (8) · **301** ponta a ponta (2 pulados), com **CI verde nos três blocos** sobre `ef16473` (run `37139051693`). ⚠️ **AS SEIS DECISÕES QUE GOVERNAM ESTA FATIA ESTÃO NA SEÇÃO PRÓPRIA, acima** — **D-USR-1** a **D-USR-6**, de 03/10/2026: convite por e-mail removido **permanentemente** e nenhum envio de e-mail; cadastro pelo Admin com senha temporária mostrada uma vez e troca obrigatória; exclusão permanente de qualquer conta menos a própria e o último Admin **com acesso**; confirmação simples, sem digitar; edição em página própria; e quatro ações por linha. ⚠️ **A CHAVE ADMINISTRATIVA EM USO É A `service_role` LEGADA (JWT)**, nos escopos Preview **e** Production, e é ela que faz o cadastro funcionar — ver a causa do 401 acima e a **`PEND-011-4`**. **Nada falta neste PR.** ⚠️ **O que ficou de fora, e está registrado como pendência nomeada:** `PEND-011-2` (a trilha na página da conta), `PEND-011-4` (voltar para `sb_secret_`), a **ratificação do alcance da regra 4** e a **guarda que ligue Server Action exportada a consumidor**. E a **T050** segue aberta: excluir pela tela as quatro contas reais sem credencial, que é operação de Bernardo. |
| Spec 011 — **o que o PR 2 mediu, e contraria expectativa** | ⚠️ **A FUNÇÃO DE ESCRITA DA TRILHA NASCEU EM `app` E NÃO ERA ALCANÇÁVEL.** O PostgREST **não expõe o schema `app`**, e `supabase.rpc()` recusou com `PGRST202 — Could not find the function … in the schema cache` — mensagem que se lê como *"a função não existe"* e significa *"não é alcançável pela interface de dados"*. É o mesmo obstáculo que `exigirAdmin` já contornava à mão para `app.eh_admin()`; a função foi para `public`, onde precisava estar, e segue `SECURITY DEFINER` com porteiro de Admin dentro. ⚠️ **E A JUNÇÃO DO AUTOR ESTAVA NO ESPAÇO DE NOMES ERRADO:** `autor_id` guarda `auth.uid()`, e a função de leitura juntava por `usuarios.id`. **A junção errada não dá erro** — ela não casa, e o rastro saía dizendo *"conta removida"* para **todo** autor ativo. **Rastro que informa o contrário do fato é pior que rastro sem autor**, e nenhuma asserção de estrutura o pegaria: quem pegou foi o teste de sessão real. ⚠️ **A RECUSA DE LEITURA E A DE `UPDATE` CHEGAM VAZIAS, NÃO COMO ERRO** (gotcha 4), então duas asserções do arquivo de RLS medem **tamanho de lista** e o valor no banco — medir `error` ali daria verde com a policy escancarada. ⚠️ **`concluirObrigacaoDeTrocarSenha()` NÃO RECEBE PARÂMETRO, e é a ausência que a autoriza:** Server Action é endpoint HTTP de fato, e um `authUserId` por parâmetro deixaria qualquer sessão limpar a obrigação de qualquer conta. Ela vive em `lib/acoes/usuarios.ts` porque o `no-restricted-imports` autoriza **dois** arquivos, e pôr em `perfil.ts` exigiria o **terceiro** furo. ⚠️ **E a obrigação é guarda de PERCURSO, não fronteira de autorização**: quem tem a senha temporária já tem a conta inteira. O que ela garante é que ninguém limpa a obrigação de outro e que o cliente não limpa a própria — por isso a marca mora em `app_metadata`, que o usuário não escreve. ⚠️ **Três casos de ponta a ponta reprovaram por um auxiliar que não esperava o login:** o clique em *Entrar* dispara Server Action, e a linha seguinte corria antes de o cookie existir. O sintoma era *"o operador já enxergava a gestão de usuários"* — **leitura exatamente oposta à causa**, que era não estar autenticado. ⚠️ **E a senha temporária extraída por expressão sobre o `textContent` podia levar texto vizinho junto**, porque `textContent` cola elementos **sem inserir espaço**: o login falhava com uma senha quase certa, e o erro apontava para o login. Agora ela sai do `<code>` ⚠️ **A CREDENCIAL NÃO PODE SAIR ANTES DO CADASTRO, e a ordem foi forçada pela medição:** `auth.admin.deleteUser` respondia *"Database error deleting user"* porque `usuarios_auth_user_id_fkey` → `auth.users` é **restrict** — a linha referencia a credencial. A exclusão apaga **primeiro o cadastro** (a RPC) e **depois** a credencial, com o risco invertido declarado: credencial órfã não alcança dado nenhum, porque **sem cadastro a RLS nega**. ⚠️ **A MENSAGEM DE SUCESSO MORRIA COM A LINHA** — ela vivia no estado da folha da **própria linha excluída**, que o React desmonta: a resposta da exclusão passou para a **URL** (`?excluida=`), e as das outras ações para o bloco acima da tabela. ⚠️ **O ACESSO DE CONTA DESATIVADA É BARRADO POR DUAS DEFESAS INDEPENDENTES, e isso mudou como o defeito deliberado teve de ser plantado:** `usuarioDaSessao()` filtra `status = 'ativo'` em TypeScript **e** `app.usuario_atual()` / `app.perfil_atual()` filtram o mesmo no banco, sem o que a policy `usuarios_ler` não casa. **Tirar só uma das duas deixa o caso VERDE** — ele só fica vermelho com as duas fora, e quem plantasse metade concluiria *"o teste não discrimina"*, que é o contrário do fato. ⚠️ **E `instrutorId` ficou no esquema depois de o campo sair da tela**: o formulário mandaria `null` e **apagaria o vínculo existente a cada gravação de perfil** — nenhuma tela mostraria isso na hora. |

| Spec 011 — **o que o PR 1 mediu, e contraria expectativa** | ⚠️ **A POLICY DE `DELETE` NO STORAGE FOI ESCRITA, REPROVOU E FOI RETIRADA.** A `FR-014` pede remover a própria foto, e o caminho direto era `for delete` restrita ao dono — que **quebrou a asserção 13 de `107_exclusao_com_rastro.sql`**, a qual conta `pg_policy where polcmd = 'd'` em **todo o catálogo** e codifica a regra 4. ⚠️ **A guarda não foi emendada**: emendá-la para *"zero em `public`"* seria afrouxar a proteção para caber o que eu queria fazer. A policy saiu; remover a foto anula `avatar_caminho` e a tela volta às iniciais. **O arquivo fica** — **um por conta**, porque o envio grava sempre em `<auth_user_id>/avatar` e substitui; medido, não suposto. Excepcionar o Storage é a pendência **STORAGE-1**. ⚠️ **`remove()` devolve SUCESSO com lista vazia** nessa situação — virou o **gotcha 11**. ⚠️ **COMPONENTE NÃO IMPORTA SERVER ACTION, e duas varreduras reprovaram na hora**: o menu importava `encerrarSessao` de `@/lib/acoes/`, que `fronteira-casca` e `fronteira-componentes` proíbem (*"o componente recebe dado por propriedade e não conhece origem"*, Princípio XI). A ação passou a **descer do layout como propriedade** — Server Action atravessa a fronteira servidor/cliente, é para isso que ela é serializável. ⚠️ **`radix-ui` já exportava Avatar e DropdownMenu** — zero dependência nova, medido antes de escrever (R-2). ⚠️ **`storage.buckets` tem `file_size_limit` e `allowed_mime_types`**, então o limite de 2 MB e os dois tipos viram garantia **estrutural**, que sobrevive a alguém apagar a conferência do TypeScript — o inverso do defeito do Épico 3, em que o mínimo de senha existia só no formulário (R-3). ⚠️ **`admin.updateUserById(id, {password})` JÁ derruba todas as sessões** (2 refresh tokens → 0, medido): a etapa de revogação que o plano previa **não existe**, e a revogação por SQL não funciona nem com `service_role`, que não tem o privilégio (R-1) |
| **Épico 4 — fatia (a): tokens e tema** | 🟨 **IMPLEMENTADA em 10/09/2026.** `app/globals.css` é o **ponto único**: rampa institucional, neutros frios, escala de gestão (14px de corpo, 11px de mínimo), nove trios de status nos dois temas, oito séries e a reconciliação com o shadcn. **A regra de cor é bloqueante nas duas metades** — cor escrita à mão **e** utilitário da paleta padrão — e o repositório inteiro passa em zero violações. Tema claro/noturno com `next-themes`, sem flash, **medido antes da hidratação**. Rawline auto-hospedada, 4 pesos, licença OFL-1.1 versionada. Vitrine em **`/estilo`**, único lugar onde a fatia se vê até a fatia (c). ⚠️ **`/estilo` é rota SEM sessão** — ela não exibe dado algum, e exigir login para ver uma paleta não protegeria nada |
| Épico 4 — o que a fatia (a) **mediu, e corrige neste registro** | ⚠️ A dívida de estilo **não eram 9 arquivos com cor literal**: eram **2** (`app/error.tsx`, `components/faixa-de-ambiente.tsx`). Outros dois têm `style={{}}` só com espaçamento, e as 5 telas do Épico 3 **não usam cor nenhuma**. Apareceu um **quinto**, `app/page.tsx`, com 10 utilitários da paleta padrão, que não constava de lista alguma. **Os cinco estão pagos**; restam as 5 telas do Épico 3 para a fatia (c) |
| **Épico 4 — fatia (b): componentes CIAARA** | ✅ **CONCLUÍDA em 10/09/2026.** `pnpm verificar:tudo` sai **0** — **220 de unidade** · **102 pgTAP** · **104 RLS e ambiente** · **60 ponta a ponta** (2 pulados). Entraram **10 primitivos**, **13 componentes CIAARA**, **3 gráficos** e as **2 primeiras funções puras de `lib/dominio/`**, que estava vazio desde o Épico 0. A `RN-ANT-01`, de *Risco: Alto*, deixou de depender de memória: o seletor de instrutor é **exatamente um** no repositório e **reordena a lista que recebe**, ignorando a ordem de chegada — as duas metades conferidas **por defeito deliberado**, que reprovou nas duas. **12 itens do checklist da fatia (a) fechados**, cada um apontando pelo número o requisito que o fecha. ⚠️ ~~A carga das 572 UEs continua pendente, herdada do Épico 2~~ — ✅ **feita em 26/09/2026**, com **587** linhas (o 572 era o extrator antes da correção do cabeçalho `DEENSINO`) |
| Épico 4 — o que a fatia (b) **mediu, e contraria expectativa** | ⚠️ **Os dez primitivos novos trouxeram ZERO variável de cor nova** — a reconciliação continua com **18 pares**, não 32. O que cresceu foi a verificação: a invariante **I-4b** passou a valer na direção que pega defeito — toda variável de terceiro **usada** em `components/ui/` precisa ter par, senão ela não resolve para cor nenhuma e a tela sai errada **sem erro**. ⚠️ E **`radix-ui` já exportava sete** dos dez primitivos: a lista de instalação encolheu para gráficos e ícones, **nenhum pacote de componente novo**. ⚠️ A auditoria de contraste foi de 23 para **24 pares** — entrou o **C-2**, `--texto-tenue` como traço de campo |
| **Épico 4 — fatia (c): casca e estado na URL** | ✅ **CONCLUÍDA em 11/09/2026**, mesclada na `main` por squash em `53ab503` — **75 de 75 tarefas**. **Medido**: `pnpm verificar:tudo` sai **0** — **318** de unidade · **102** pgTAP · **104** RLS · **132** ponta a ponta (2 pulados). O contrato de parâmetros virou **tipo**: parâmetro fora dele **não compila**, provado por defeito deliberado. A casca (`components/casca/`) é **servidor**, com três folhas de cliente declaradas e contadas por teste. A tela **`/inicio`** entrega o panorama por turma com o recorte na URL, e a raiz deixou de ser um beco. O guia `docs/guias/estado-na-url.md` é o que as telas dos Épicos 5 a 9 leem antes de errar. ✅ **As quatro decisões de Bernardo saíram em 11/09/2026** — a **MENU-1** e a **MENU-2** fecharam juntas, e a validação do menu contra a v2.0 está registrada com data em `specs/008-shell-e-estado-na-url/contracts/casca.md`. ⚠️ **As quatro respostas confirmaram o que já estava implementado, e `lib/navegacao/menu.ts` não mudou uma linha** — o custo de perguntar era uma edição; o de não perguntar era um menu reorganizado em silêncio contra um requisito **[PRESERVADO]**. ⚠️ **A junção com a `main` foi o último risco, e ele era real:** o PR #9 já tinha levado a correção do redirecionamento para lá, e esta fatia tocava o **mesmo arquivo** para aplicar o vocabulário visual. A junção preservou as duas coisas, e `verificar:tudo` foi **remedido depois dela**, com os mesmos números |
| Épico 4 — **os cinco achados da fatia (c)**, todos medidos | **1.** Redirecionamento aberto **na `main`**: a guarda era `destino.startsWith("/")`, e `//dominio/` começa com barra — o navegador **saía da aplicação**. Corrigido em PR próprio (#9), com três formulações de teste, e **as duas primeiras passavam com o defeito no lugar**. **2.** O contrato declarava **3** classificações de curso; a coluna `cursos.classificacao` aceita **7** — um link com uma das quatro que faltavam degradaria para "todas" em silêncio, e a tela abriria cheia sem erro nenhum. A lista agora vem de `Constants`, com teste comparando com o enum. **3.** A **vitrine já violava** o `FR-001`: a amostra da fatia (a) escrevia `?demo=` sem contrato algum — **a primeira tela a infringir o requisito foi a nossa**, escrita antes de ele existir, e funcionando. **4.** O percurso do valor padrão **não provava nada**: ele limpava mandando `null`, e `null` apaga o parâmetro sem consultar o padrão; com `clearOnDefault` desligado de propósito, os sete casos passavam. **5.** Duas **corridas entre processos** na suíte de ponta a ponta — `supabase status` chamado no carregamento do módulo, e o `beforeAll` do convite apagando o Mailpit **inteiro**, que é estado compartilhado. As duas faziam reprovar um caso que não tinha relação nenhuma com a causa |
| **Épico 4 — fechado** | ✅ **As três fatias na `main` em 11/09/2026.** Tokens e tema, vocabulário de componentes, casca e estado na URL |
| **Épico 5 — fatia (c): cadastro de instrutores** | ✅ **CONCLUÍDA — PR #16 mesclado na `main` por squash em `7b85f27` (16/09/2026).** *(Registro anterior, vencido: "IMPLEMENTADA em 15/09/2026, PR #16 aberto e SEM merge" — corrigido em 17/09/2026.)* Spec `006-cadastro-de-instrutores`. `pnpm verificar:tudo` sai **0** — **529** de unidade · **167** pgTAP (nenhum `todo`) · **141** RLS e ambiente · **158** ponta a ponta (2 pulados), remedido em 15/09/2026 depois do restante do checklist. Listagem em antiguidade pelo banco, filtros da v2.0 na URL, 3 indicadores e 9 gráficos (4 barras, 5 pizzas); ficha com cadastro, edição, painel de disciplinas (`VIN-NNNNNN`), desativação que preserva o passado e **alertas que não bloqueiam** — carga semanal **por semana ISO**, somando só as atribuições cuja janela cobre a semana (somar o ano é proibido), e docência há mais de um ano sem capacitação. A escrita de CPF, RG, telefone e endereço ficou com os três perfis que os leem, **por coluna, no banco**. **Nove migrations, ✅ APLICADAS no Supabase remoto em 15/09/2026** (T087, com autorização de Bernardo), **antes do merge** — o mesmo projeto serve Preview e Production (exceção do `FR-016.1`), e mesclar sem aplicar faria Production pedir colunas que não existem. Conferido no próprio remoto: 29 migrations dos dois lados, catálogo de `public` e `app` com **1.119 itens iguais** ao local, views e funções novas respondendo, `authenticated` sem DELETE e sem escrita de PII; a Production, que roda a `main`, seguiu respondendo sem erro novo. ⏸️ **Pararam depois de conferência**: legenda clicável (não está no código da v2.0, T119) e ficha A4 (falta o selo "Marinha do Brasil — Hidrografia e Navegação", T111). **Checklist de fechamento com 20 de 22**: CHK004, CHK005, CHK008, CHK012, CHK019 e CHK022 decididos por Bernardo em 15/09/2026 — cinco obrigatórios com a especialidade delimitada a militar e recusada em cadastro novo; alerta de faixa em todas as semanas ISO do ano corrente; ficha de inativo sem alerta. **Entraram também**: o quadro de avisos **recolhível**, no topo, com as contagens à vista, e a **exclusão permanente de instrutor sem histórico**, exceção única à regra 4 — e nenhum dos 177 da base real é excluível. T002 e T003 fechadas. **Pendentes por falta de material**: CHK020 e CHK021. **Pendência nomeada de 17/09/2026: T132** — tirar o `MAX+1` de `proximo_codigo_vinculo` e `proximo_codigo_instrutor`, **dono Bernardo**, em PR próprio **depois** do PR de banco da spec 009 (B-6) |
| Épico 5 (c) — **os achados D-1 a D-8 e os da verificação com dado real** | **D-1/D-2** a fórmula da carga e os limites da faixa não estavam escritos — respondidos por Bernardo (T011: 1 TA ≈ 1 h, média = tempos ÷ `disciplinas.semanas`, ano pelo início previsto, limites inclusivos). **D-3** o código de instrutor não era gerado pelo banco — sequência. **D-4** o `CHECK` de branco não estava no plano. **D-5** `vw_instrutores` não expunha a antiguidade. **D-6** o cadastro precisava de rota própria. **D-7** a data de docência do `FR-017` é `data_inicio_docencia_ciaara`, e com ela vazia o alerta não dispara e vira aviso. **D-8** preview e Production são o mesmo projeto. ⚠️ **Com a base real**: os filtros por vínculo mandavam **175 ids na URL** da interface de dados e falhavam — a regra foi para colunas da view; **15 militares** sem especialidade não salvavam a própria ficha — o campo ficou opcional (emenda ao `RN-INST-03` da spec; o documento 04 não mudou); `set_auditoria()` **gravava `criado_por` mandado pelo cliente** numa criação com sessão — corrigido, e o gatilho é universal; a ficha leva **1,5 a 2,4 s** (4,2 a 5,1 s com quatro acessos), dominada por `vw_instrutor_carga_anual` a ~700 ms sob RLS — registrado, não otimizado. **R-8**: dez views do Épico 1 seguem com `INSERT`/`UPDATE` para `authenticated`, inertes só pela forma |
| **Épico 5 — fatia (a): cursos e turmas, PR 1** | ✅ **MESCLADO na `main` por squash em `4376534`, pelo PR #17.** *(Registro anterior, vencido até 29/09/2026: "IMPLEMENTADO LOCALMENTE em 22/09/2026, NÃO aplicado no remoto e SEM PR" — as três afirmações envelheceram no mesmo dia em que foram escritas, e a própria linha já registrava a aplicação no remoto três frases adiante.)* O texto abaixo é o registro do que a fatia entregou.** Spec `009-cursos-e-turmas`, ramo `feat/EPICO-5a-cursos-e-turmas`. **7 migrations** (`20260917210558` a `20260918041449`), carga do ETL **APROVADA** sobre elas (5.394 linhas, as dez conferências prévias em zero, aborto provado sem rastro por contagem de 55 tabelas), a varredura dos consumidores do alcance e o endereço de turma num módulo só. `pnpm verificar:tudo` sai **0** em 22/09/2026 — 548 de unidade · 325 pgTAP · 167 RLS · 166 ponta a ponta (2 pulados). **Conferência local feita por Bernardo em 22/09/2026**, com o `roteiro-de-conferencia.md`. ✅ **APLICADO NO REMOTO em 22/09/2026** (T105, autorização de Bernardo depois do CI verde no commit `5b16820`): `supabase db push --linked` saiu **0** em 5 segundos, as 7 na ordem. **Conferido só por leitura (T106), na hora**: **36 migrations dos dois lados**, nenhuma só de um; **esquema idêntico** — a impressão digital de `public` e `app` dá **1.456 objetos** e o **mesmo md5** no local e no remoto, sem uma linha de diferença; `curso_sigla_historico` com os **três** gatilhos; **zero** `DELETE`/`TRUNCATE` para `authenticated` e **zero** policies de `DELETE`; as **quatro RPCs respondem e recusam com `42501`** quem não tem sessão, sem gravar nada; e a **Production sem erro novo** — `/` e as telas protegidas levam ao login, `/login` responde 200. ⚠️ **O remoto seguia VAZIO de dado de negócio** — 0 cursos, 0 turmas, 0 instrutores, 1 usuário —, e é por isso que as migrations 1 e 2 não tiveram o que reconciliar. ~~**Falta**: a T108 (PR)~~ — ✅ **fechada**: o PR #17 foi mesclado como `4376534`. O plano está em `specs/009-cursos-e-turmas/plano-de-aplicacao-no-remoto.md`. Pendências nomeadas: `PEND-5a-1` a `PEND-5a-6` e a T132 da spec 006 |
| **Épico 5 — fatia (a): cursos e turmas, PR 2 (telas)** | ✅ **MESCLADO na `main` por squash em `406b566` (24/09/2026), pelo PR #18.** *(Registro anterior, vencido: "EM CURSO … sem PR e sem merge" — corrigido em 25/09/2026, na T014 da fatia (b).)* As 215 tarefas fechadas, `pnpm verificar:tudo` verde e a migration `20260923231815` aplicada no remoto antes do merge. O texto abaixo é o registro do que a fatia entregou. Spec `009-cursos-e-turmas`, **210 de 215 tarefas**. Entregues: o catálogo `/cursos` com indicadores e filtros na URL; a página do curso com regime vigente, quadro de avisos e as duas abas; o seletor de turma num componente só; cadastrar e editar curso; a **ficha da turma** (`/turmas/[turma]`, que **é** o formulário — não há `/editar`), a criação em `/cursos/[curso]/turmas/nova`, a **lista de salas** em `/admin/salas` e a **vigência de regime** na edição do curso. O botão **Limpar filtros** virou padrão de tela (23/09/2026). ✅ **A migration `20260923231815_vigencias_do_curso_para_a_tela.sql` foi APLICADA no remoto em 23/09/2026** (autorização de Bernardo depois do CI verde em `2e746f7`): **37 migrations dos dois lados**, a função `public.vigencias_do_curso` de pé (`SECURITY DEFINER`, `stable`, `anon` sem `execute`), e o privilégio que faltava **devolvido** — `authenticated` executa `app.recusar_se_ha_lancamento`, que era `false` e é `true`. Production respondendo como antes. Registro em `plano-de-aplicacao-no-remoto.md` §0.2. ⚠️ **E o remoto NÃO está mais vazio de dado de negócio.** Medido em **24/09/2026**, só de leitura: **24 cursos · 28 turmas · 29 vigências · 177 instrutores · 8 salas · 5 usuários · 1 conta no Auth · 37 migrations**. A anotação de *"0 cursos, 0 turmas, 0 instrutores, 1 usuário"*, de 22/09/2026, está **vencida** — é a carga daquele dia, confirmada por Bernardo em 24/09/2026. ⚠️ **O QUINTO USUÁRIO, identificado em 24/09/2026:** `USR-MUEF9CLK`, criado em **23/09/2026 15:13**, perfil `ajudante_administracao_academica`, escopo `geral`, **sem credencial** — e **sem linha em `auth.users`**, que tem **uma** conta só. **Veio do aplicativo**, por duas provas independentes: o código tem a forma do gerador da Server Action `convidar` (`USR-${Date.now().toString(36)}`) e **decodifica para 23/09/2026 15:13:57**, batendo com o `criado_em`; e `criado_por` está **preenchido**, apontando para o `auth_user_id` de `USR-ADMIN-001` — os outros quatro têm `criado_por` nulo (ETL e criação manual). É o estado que o cabeçalho de `convidar` descreve: **passo 1 gravou, passo 2 não emitiu o convite**. A saída, **naquela data**, era *"reenviar convite"*; **nada foi apagado**. ⚠️ **ESSA SAÍDA DEIXOU DE EXISTIR EM 03/10/2026** *(D-USR-1)*: sem convite, a saída para uma conta sem credencial é **excluí-la e cadastrar o mesmo e-mail de novo** — a exclusão libera o endereço. ⚠️ **E ela não é um caso isolado:** medido no remoto em 03/10/2026, **4 das 5 contas reais estão sem credencial** (as três do ETL e esta), e nenhuma delas consegue entrar. ✅ **A `PEND-5a-7` foi diagnosticada e consertada em 23/09/2026** — não era lentidão de página: eram **três cópias não endurecidas** de dois auxiliares (`listUsers()` sem paginar e `supabase status` no carregamento do módulo, em `destino-do-login.spec.ts` e `convite.spec.ts`). Medido sem `retries`, em paralelo: 251/251/250 passados em três voltas. O que restava era prazo, e Bernardo decidiu a **opção (a)**: `expect` com **10 s** em `playwright.config.ts`. A otimização das telas lentas fica **não bloqueante**, para reavaliar depois da conferência no preview. **Falta só o PR (T209), que é de Bernardo, depois do teste amplo dele.** |
| **Épico 5 — fatia (b): UEs, PR 2 (carga)** | 🟨 **APLICADO NO REMOTO em 26/09/2026, PR #20 aberto e SEM merge** — o merge espera a palavra de Bernardo depois da conferência. Ramo `feat/EPICO-5b-carga-das-unidades-de-ensino`, nascido da `main` em `de1f1ac`. **Uma migration de DADO** (`20260926024246_carga_unidades_ensino.sql`, gerada de `pareamento_ue.csv`): **587 UEs em 138 disciplinas**, 7.411 de CH somada, **2** cursos marcados por competências, **6** disciplinas marcadas sem UE, **22** eventos em `migracao_log`. `pnpm verificar:tudo` sai **0** — 943 unidade · **392** pgTAP em **32** arquivos · 181 RLS · 256 ponta a ponta (2 pulados); pgTAP também **PASS na base carregada**. Backup `remoto-20260926-002924.sql` antes; **45 e 45** migrations; **zero linhas pré-existentes alteradas**, provado pela impressão digital do conteúdo de `disciplinas` **idêntica** antes e depois (`f1df0fcf…`, 175 linhas, soma de CH 9.963 nos dois). Production respondendo. ⚠️ **A migration se ABSTÉM numa base sem cadastros** — no `db reset` ela avisa e sai, porque nenhum destino existe ali; quem carrega o local é a **ETAPA 6** do ETL, aplicando **o mesmo arquivo**. Dois caminhos, **um** texto. ⚠️ **A carga NÃO toca CH, nome nem código de disciplina** (P-1, Q-13): as **4** divergências de CH medidas (`C-Ap-FR III` 76×75, `C-Exp-MetocOf I` 48×30 e `V` 40×50, `EST-QF-APOC I` 79×80) saem como **aviso** e quem corrige é Bernardo, na tela do PR 3. **Falta**: a conferência de Bernardo (T026) e o merge |
| **Épico 5 — fatia (b): disciplinas e UEs, PR 1 (banco)** | ✅ **MESCLADO na `main` por squash em `de1f1ac` (26/09/2026), pelo PR #19** — CI verde nos três blocos sobre a `main` e Production respondendo (`/` 307 → login, `/login` 200, `/cursos`/`/instrutores`/`/disciplinas`/`/inicio` 307). Implementado em 25 e 26/09/2026 no ramo `feat/EPICO-5b-disciplinas-e-unidades-de-ensino`. Spec `010-disciplinas-e-unidades-de-ensino`, **sete migrations** (`20260925135041` a `20260926005750`). `pnpm verificar:tudo` sai **0** em 26/09/2026: **943** de unidade (71 arquivos) · **380** pgTAP em **31** arquivos (eram 325 em 25) · **181** RLS e ambiente (5 arquivos) · **256** ponta a ponta (2 pulados). Carga do ETL **APROVADA** por cima das seis, 5.394 linhas. O que entrou: **exclusão permanente de disciplina e UE** por RPC com porteiro, código de confirmação e **rastro** em `exclusoes_registradas` — tabela só de acréscimo, imutável **inclusive para a `service_role`** (decisão **D-B1**, 24/09/2026, que emendou a regra 4); **aposentadoria** de `turma_disciplina.instrutor_id`, `ch_prevista_por_instrutor` e `disciplinas.instrutores_atribuidos`, com a prova de cobertura **antes** (79 de 79 na junção); o **rateio em cinco casos** (decisão **A-1**, 25/09/2026), com a tabela nova `turma_disciplina_unidade` e três FKs compostas; as RPCs `criar_disciplina`/`reativar_disciplina` **no lugar de gatilho** (decisão **A-2**: um `AFTER INSERT` colidiria com a ordem do ETL e com 4 amostras pgTAP); sequências `DIS-`, `UE-` e `TDU-`; e o parâmetro `disciplinas.aviso_inicio_dias`. ⚠️ **Nenhuma tela é ligada** — o menu segue com *Disciplinas* em `disponivel: false`. ✅ **As seis primeiras foram APLICADAS no remoto em 25/09/2026** (T013, autorização de Bernardo depois do CI verde em `7e0fe1e`), com backup `remoto-20260925-120457.sql` antes: 43 e 43 migrations, impressão digital do catálogo **idêntica** (`0462404a…`, 865 itens), dado intacto (175 disciplinas · 210 `turma_disciplina` · 96 atribuições), 3 `simultaneo` com 3 eventos em `migracao_log`, 0 `DELETE`, 7 RPCs, Production respondendo — e a prova do `FR-032.1` **mediu de verdade lá**: 0 `instrutor_id` sem par sobre as 210 linhas reais, que localmente passava vazia. ✅ **T010 e T011 executadas em 25 e 26/09/2026**, e é delas que vem a **sétima migration**: a reversão das seis, executada numa base descartável, mostrou que a impressão digital **não** voltava — `create or replace view` **não preserva as `reloptions`**, e a M5 havia recriado `vw_instrutor_carga_prevista` sem o `with (security_invoker = true)`, deixando-a rodar com os direitos do dono, que tem `rolbypassrls`. ⚠️ **Era vazamento de leitura, e ele foi para o remoto em 25/09** — a M7 (`20260926005750`) o conserta e leva as duas asserções que faltavam (invariante I-13 em `010_estrutura.sql`), viradas **gotcha 10**. Os quatro defeitos deliberados da T011 foram pegos pela suíte certa, desfeitos e a estrutura conferida byte a byte (11.262 linhas de `pg_dump`). ✅ **A M7 foi APLICADA no remoto em 26/09/2026**, pelo mesmo rito: backup `remoto-20260925-223749.sql`, dry-run com só ela, `db push` 0, **44 e 44** migrations, impressão digital **`ec807983…`, 1.564 objetos, igual nos dois** com `diff` vazio, `security_invoker=true` na view e a exceção nominal de PII intacta, dado intacto, Production respondendo. ⚠️ **E a conferência da impressão digital acusou divergência que era FIM DE LINHA**: o corpo de função guardado no catálogo carrega o retorno de carro com que o arquivo chegou àquele banco, e ele difere **nas duas direções** — 2 CR no local e 0 no remoto numa função, 0 e 29 em outra. `scripts/provas/impressao_digital_do_esquema.sql` passou a tirar o CR **antes** do md5; o valor do resumo mudou com isso, então md5 anotado antes de 26/09/2026 não se compara com md5 de agora. ✅ **T015 conferida**: os nove passos do roteiro rodados no local, **9 de 9** — código gerado `DIS-000001`, `22023` para o código errado, `23503` nomeando `linha_de_turma`, rastro com autor/data/retrato de 26 campos, `42501`/`rastro_imutavel` ao reescrever o rastro, `23514`/`periodo_fora_da_janela`, e a CH prevista das 17 linhas compartilhadas com **zero** fracionária e 5 de 5 `turma_disciplina` fechando com a CH. Roteiro e tabela em `specs/010-…/roteiro-de-conferencia.md`. ⚠️ **O primeiro executor do roteiro deu veredito FALSO em quatro passos** — lia o `hint` como se `pg_exception_hint` fosse coluna, o tratador estourava com `42703` e a tabela dizia *"não recusou"* para quatro recusas corretas do banco; num roteiro de conferência esse é o modo de falha mais caro, porque **acusa o produto**. **Nada falta neste PR.** |
| Épico 5 (b) — **o que o PR 1 mediu, e contraria expectativa** | ⚠️ **`vw_instrutor_carga_prevista` produzia FRAÇÃO e nunca fechava com a CH**: ela fazia `carga_horaria_tempos / instrutores_designados` e arredondava a duas casas — 10 TA entre 3 devolviam **3,33 três vezes, somando 9,99**. A `A-1` fixou divisão **inteira** com o resto **aos mais antigos** (4+3+3), e a view foi reescrita usando `app.fn_antiguidade_ordem`, que já existia. Nenhuma asserção pegava isso antes. ⚠️ **A marcação das 3 disciplinas em `simultaneo` precisou de DOIS caminhos**, e não é descuido: a migration roda **antes** de o ETL carregar (base vazia no `db:reset`), e o ETL **não roda** contra o remoto — então ela está na migration (para o remoto, que já tem o dado) **e** em `correcoes-de-origem.md` (para a carga local). As duas são idempotentes e não colidem; mudar uma sem a outra faz local e remoto divergirem em silêncio. ⚠️ **`turma_disciplina_instrutor.codigo` é COMPOSTO** (`<TDI-NNNNNN>#<código do instrutor>`), montado pelo ETL — não sai de sequência, e por isso **não** entra em `avancar_sequencias`; um `DEFAULT` não poderia montá-lo, porque não enxerga outra coluna da linha. ⚠️ **`throws_ok` do pgTAP não aceita comando de transação**: provar constraint adiada exige um bloco `DO` com `set constraints all immediate` dentro. ⚠️ **Amostra que usa `config_listas` precisa semear o que usa**: a lista nasce **vazia** no `db:reset` e é povoada pela carga — um arquivo que dependa dela passa na base carregada e reprova na limpa |
| **Épico 5 — fatia (b): PR 2, a carga das UEs** | ✅ **MESCLADO na `main` por squash em `0df67ec` (29/09/2026), pelo PR #20.** As **587 UEs** dos currículos da DEnsM carregadas por migration (`20260926024246`), com a tabela por curso conferida por Bernardo: **587 declaradas = 587 carregadas**, local e remoto, e **zero linhas pré-existentes alteradas** — provado por md5 idêntico do conteúdo de `disciplinas` antes e depois. CI verde nos três blocos sobre `6960543` |
| **Épico 5 — fatia (b): PR 3, as telas** | 🟨 **IMPLEMENTADO em 29/09/2026 no ramo `feat/EPICO-5b-telas-de-disciplinas`, SEM PR e SEM nada no remoto.** ⚠️ **Este PR NÃO TEM MIGRATION** — tudo o que a tela usa entrou nos PRs 1 e 2 e já está no remoto; por isso não há backup a fazer nem `db push` a rodar. `pnpm verificar:tudo` sai **0**: **1.040** de unidade (75 arquivos) · **392** pgTAP (32) · **200** invariantes e RLS (6) · **271** ponta a ponta (2 pulados). O que entrou: a rota **`/disciplinas`** com **7 parâmetros** na URL e *Disciplinas* `disponivel: true` no menu; a **cascata curso → turma**, com **três caminhos clicáveis** até ela (menu, aba *Grade* do curso, ficha da turma); a **tabela densa com linha expansível** — `detalhe`/`abertas` acrescentados ao componente **único**, em vez de uma segunda tabela —, indicadores, filtros e gráfico saindo das **mesmas** linhas (`SC-011`); e os painéis de **cadastro**, **período por turma**, **instrutores com o rateio nos cinco casos**, **unidades de ensino** e **exclusão com código digitado e rastro**. Módulos puros novos: `rateio-de-carga`, `sinalizacao-de-disciplina`, `indicadores-da-grade`, `soma-das-unidades`, `exclusao-de-disciplina`, `modelo-do-curriculo`. ✅ **T042 executada**: os **dois defeitos deliberados** foram pegos pela guarda certa — a lista de instrutor montada à mão reprovou a varredura da `RN-ANT-01`, e a gravação do período por `disciplina_id` reprovou o caso crítico do critério 4, com a mensagem exata que o teste existe para dar. **Falta**: a conferência de Bernardo (`roteiro-de-conferencia-pr3.md`) e o PR |
| Épico 5 (b) — **o que o PR 3 mediu, e contraria expectativa** | ⚠️ **A METADE DO `FR-041.7` QUE NÃO TINHA TAREFA ESTAVA VAZIA:** a T029 exportava a tabela de casos para que alguém a consumisse, e **ninguém consumia** — a função pura era provada contra si mesma e a view contra nada. `tests/invariantes/rateio-da-view.test.ts` semeia o banco com os mesmos casos e cobra da view **o mesmo número**, instrutor por instrutor; com a fórmula de antes da M5 ele reprova **11 dos 14**. ⚠️ **E ele nasceria MORTO**: `pnpm test:rls` apontava para `tests/invariantes/rls`, e o arquivo fica **fora** de `rls/` de propósito (prova número, não permissão) — **nenhum script o rodaria**. O alvo passou a ser `tests/invariantes` inteira. ⚠️ **A VIEW SÓ SE LÊ COM SESSÃO AUTENTICADA**: ela é `security_invoker` e chama `app.fn_antiguidade_ordem`; a **`service_role` não tem `usage` em `app`** (medido), então lê-la com a chave de serviço responde `permission denied for schema app` — e nem exercitaria o caminho real. ⚠️ **`destino_inexistente` era emitida pelo banco e NÃO tinha tradução** — caía na frase genérica; achada pela varredura nova, que lê as migrations sem comentário e cobra frase para toda chave que chega a uma tela. ⚠️ **`disciplinas_codigo_key` estava do lado errado da tradução**: é código **gerado**, e mandava a pessoa *"escolher outro"* um valor que ela não escolhe — o modo de falha do gotcha 9. O campo digitado é `cod_disciplina`, por `uq_disciplinas_curso_cod_ativo`, índice único **parcial** (`where status = 'ativo'`), que é o que faz a `Q-04` valer. ⚠️ **SEM CLIQUE, QUEM USA MOUSE NÃO EXPANDIA A LINHA**: `ListaNavegavel` ativa por `Enter`/`Espaço` e mais nada. O clique passou a ativar **só quando há `detalhe`**, para não trocar o comportamento das telas que usam `aoAtivarLinha` para navegar. ⚠️ **`aberta` PRECISA VIR DO GANCHO, não da propriedade do servidor**: é parâmetro visual (`avisaServidor: false`), e lida do servidor o detalhe **nunca abria**, com a URL certa. ⚠️ **`origem_periodo` NÃO ACEITA `'tela'`** — o enum é `herdado_grade \| manual \| nao_informado`, e um `CHECK` amarra o valor às datas; ele é **derivado** delas |


| **Épico 5 — FECHADO** | ✅ **As três fatias na `main` em 29/09/2026.** **(a) cursos e turmas** — PR 1 (`4376534`, banco) e PR 2 (`406b566`, telas); **(b) disciplinas e unidades de ensino** — PR 1 (`de1f1ac`, banco), PR 2 (`0df67ec`, a carga das 587 UEs) e PR 3 (`8ad1b1c`, as telas); **(c) cadastro de instrutores** — PR #16 (`7b85f27`). ⚠️ **O que fica de pendência NOMEADA, e não é escopo de nenhuma delas:** `PEND-5a-1` a `PEND-5a-6`; a **`T132`** da spec 006 (tirar o `MAX+1` de `proximo_codigo_vinculo` e `proximo_codigo_instrutor`); a **`PEND-5b-1`** (estender a exclusão permanente a cursos, turmas e salas); a `PEND-5b-2` e a `PEND-5b-5`; e a **`STORAGE-1`**, da spec 011. ⚠️ **E o que NÃO entrou por decisão:** a legenda clicável da fatia (c) (não está no código da v2.0, T119), a ficha A4 do instrutor (falta o selo *Marinha do Brasil — Hidrografia e Navegação*, T111), e as telas de avaliação e de relatório da disciplina (`FR-008`, decisão A-4) |

| Épicos 6 a 13 | ⬜ Pendentes. ⚠️ **O Épico 5 saiu desta linha em 29/09/2026** — ele está FECHADO, e a linha acima diz por quais commits. ~~O PR 2 da fatia (a), com as telas, só nasce depois do merge do PR 1.~~ — **os dois estão na `main`** desde 24/09/2026 (`4376534` e `406b566`). **A dívida de estilo está paga**: as cinco telas do Épico 3 ganharam o vocabulário visual na fatia (c), e o repositório inteiro mede **zero violações** da regra de cor em 91 arquivos. **Entra no Épico 3:** o **cadastro de conta pelo Admin** — primeiro consumidor real de `lib/supabase/admin.ts` — e `NEXT_PUBLIC_URL_APLICACAO`, deixada fora do Épico 0 por decisão de 07/09. ⚠️ *(Registro anterior, vencido: "a Server Action de convite". Ela **não existe** desde a **D-USR-1**, de 03/10/2026; quem usa a chave administrativa hoje é `cadastrarUsuario`, `redefinirSenha` e `excluirConta`.)* ⚠️ **E `urlDaAplicacao()` ficou sem consumidor de produção** quando os links de convite e de recuperação saíram — é a forma exata do defeito que criou esta spec (`encerrarSessao()` com teste e zero botões), e está na pendência da **guarda de Server Action sem consumidor** |
| **Decisão UE-1** | ✅ **Fechada em 26/08/2026 — rota (b)**: `registros_aula` no grão de **Unidade de Ensino**; disciplina é agregado derivado. Épico 1 **desbloqueado**. Ver documento 05 §9.1. **Origem do dado resolvida em 28/08/2026**: as UEs vêm dos **currículos oficiais da DEnsM**, não de linha sintética |
| Numeração das specs | ✅ **Reiniciada em 26/08/2026.** As 39 specs herdadas da v2.0 vivem em `specs/heranca-v2.0/`; a v2.1 recomeça em `specs/001-…`. "Spec 001" **exige o diretório** para não ser ambíguo |

**Épico 0 — de pé em 26/08/2026:** `pnpm` 11.24.0 via `corepack` · Next.js **16.3.3** + React
19.2.8 + Tailwind **v4.3.3**, App Router, sem `src/`, alias `@/*` · `tsconfig.json` conforme o
documento 24 §5.1, `exactOptionalPropertyTypes` **ligado** · `@supabase/supabase-js` 2.112.4 e
`@supabase/ssr` 0.12.5 · `.env.local` e `.env.local.example` (documento 24 §5.4) · Spec Kit 0.16.0,
integração `claude`, scripts `sh`, 10 skills em `.claude/skills/` · constitution 2.1.0 transcrita
**literalmente** para `.specify/memory/constitution.md`. `tsc`, `eslint` e `next build` verdes.

**Épico 0 — pendente, nesta ordem:** ESLint das duas fronteiras + o teste que prova a regra ativa
(§6.2) · `supabase init`/`start` e os quatro clientes de `lib/supabase/` (§6.3) ·
`lib/tipos/database.ts` (§6.4 — depende do schema do Épico 1) · suítes vazias Vitest/Playwright/
pgTAP (§6.5) · scripts do documento 24 §7 no `package.json` (§6.6) · `.github/workflows/ci.yml`
(§6.7) · primeiro deploy verde na Vercel (§6.8).

**Os treze achados do Épico 2 — o schema encontrando o dado real pela primeira vez.**
Cada um está medido e justificado na migration que o corrige, e **todos foram ratificados por
Bernardo em 08/09/2026** (*"foram balizados por medição real e justificados na migration"*):

1. **`escopo_curso` não cobria a base.** Faltavam `especial` e `aperfeicoamento_avancado` — **7
   dos 24 cursos**. `acao_migracao` não tinha `adicionado`/`descartado`, os verbos de 3 linhas do
   log histórico: traduzi-los seria **reescrever linha de log**, que a regra 5 proíbe.
2. **Cinco `NOT NULL` em que a ausência é legítima e permanente** — hora de turno em curso EAD (a
   própria planilha escreve "sem regime de TA presencial"), designador de turma única, sufixo de
   especialidade, instrutor responsável por avaliação, tabela de origem em evento que não
   transportou nada.
3. **Cinco em que a ausência é só do histórico** — entram por **catraca**, o padrão da UE: exigem a
   coluna em linha nova **e** quando alguém editar a linha migrada. Para dado novo é **mais forte**
   que o `NOT NULL` original.
4. **`GERAL` é sentinela, não curso** (`reservas_proens`, `responsaveis_curso`). Criar uma linha
   `cursos` chamada "GERAL" a faria aparecer em toda listagem e todo relatório para sempre.
5. **A conferência de órfãos estava PROMETIDA no cabeçalho do ETL e não acontecia** — o chamador
   descartava a lista. Sem ela, `LEFT JOIN` sem par gravava vínculo nulo **sem erro nenhum**.
6. **`Turma_Disciplina.ID_Instrutor` guarda LISTA** (`'17, 18, 19, 20, 40, 60, 55'`). As **96**
   atribuições vão para `turma_disciplina_instrutor` — a tabela de junção **que já existia no
   schema** e o ETL ignorava. Contagem conferida por outro caminho.
7. **`Tipo_Atividade` e `Config_Listas` nunca foram o mesmo vocabulário.** A coluna guarda
   `Aula Teórica`; a lista tem `Aula`, `Palestra`, `Avaliação`. A v2.0 é planilha e não impunha a
   lista; o gatilho da v2.1 é a primeira conferência da história. **10 valores semeados**, marcados
   por procedência — traduzir apagaria a distinção teórica/prática de 1.566 lançamentos.
8. **`config_parametros` misturava normativo com operacional.** `natureza` separa os dois e o
   RNF-NORM-08 virou **CHECK do banco**, não teste.
9. **13 parâmetros normativos chegavam por duas chaves.** Decisão de Bernardo (08/09): fica a
   **canônica da v2.1**; as 13 da v2.0 são transportadas e chegam **`inativo`** — exclusão lógica,
   regra 4. Se os valores divergirem, a carga **aborta**: dois números para a mesma norma não é
   duplicidade de nome, é conflito.

**Os três achados do Épico 4, fatia (a) — dois pegos por portão, não por revisão:**

1. **`shadcn init --defaults` traz Base UI, não Radix.** O estilo padrão virou `base-nova` e
   instala `@base-ui/react`. O BRIEF §1 decide shadcn **sobre Radix**, nominalmente. ⚠️ **A tela
   fica idêntica** — sem o requisito escrito aquilo teria entrado sem ninguém notar. Fixado
   `style: "new-york"` no `components.json`, e guardado por teste sobre as dependências, com
   controle positivo para o caso de o Radix simplesmente sumir.
2. **A auditoria de contraste reprovou 23 de 52 asserções na primeira execução**, e a causa era a
   **regra**, não a paleta: o `FR-011` cobrava 3:1 de toda borda, inclusive divisória e contorno de
   etiqueta. Bernardo isentou borda decorativa e estrutural em 09/09/2026. ⚠️ **E duas anotações
   do documento 23 são falsas** — ele anota 4,6:1 para `--texto-tenue`, que mede **4,49**, e 3,1:1
   para `--borda-forte`, que mede **1,62**. Anotação que ninguém confere envelhece.
3. **`--borda-forte` fica como pendência declarada, nem auditada nem isenta.** Ela é o traço que
   identifica um campo, e o preenchimento do campo quase não contrasta com a página — medido,
   **1,20**. A fatia que construir o primeiro formulário precisa resolver, e encontra a medição
   registrada em vez de redescobri-la.

**Os seis achados do Épico 4, fatia (b) — e o primeiro não é de código:**

1. **Um pacote inteiro chegou ZERADO em disco, e o `tsc` não viu nada.** `d3-shape@3.2.0`, que a
   biblioteca de gráficos arrasta, tinha **40 arquivos preenchidos com NUL** — `package.json`
   inclusive, 1668 bytes de zero. O `next build` falhou com *"Export symbolWye doesn't exist in
   target module"*, que não sugere corrupção a ninguém. ⚠️ **E `pnpm install` reproduzia o defeito**,
   porque os arquivos do `node_modules` e os do armazém são **o mesmo inode**: zerar um zera o outro.
   O conserto foi achar os vínculos com `fsutil hardlink list`, apagar as **112 entradas** do armazém
   e reinstalar. ⚠️ **O repositório vive dentro do OneDrive** — 113 arquivos zerados em 5 pacotes têm
   a assinatura de sincronização interrompida. Se acontecer de novo, a varredura é por arquivo
   inteiramente NUL, não por tamanho.
2. **O cabeçalho ordenável quebrava a primeira frase do contrato de teclado.** Um `<button>` dentro
   de cada `<th>` vira uma parada de tabulação **dentro** do contêiner: uma tabela de oito colunas
   passava a ter nove paradas, e *"`Tab` entra na grade e sai dela em um passo"* deixava de valer
   sem que nada acusasse. O cabeçalho virou **a linha 0 da grade**, que é o padrão ARIA, e ordenar
   passou a ser ativar a célula.
3. **Seletor por papel numa página que tem faixa de ambiente é AMBÍGUO, e ambiguidade não se
   resolve com mais tempo.** Três casos instáveis no CI, em três lugares diferentes, todos com a
   mesma causa: `main` casava com o da página **e** com o do `app/loading.tsx`; `status` casava com
   a faixa "AMBIENTE LOCAL" **e** com a mensagem procurada. ⚠️ **Violação de modo estrito falha na
   hora — ela NÃO reexecuta**, então `expect` não salva. E a mensagem engana: ela começa com
   *"expect(locator).toBeVisible() failed"* e só na terceira linha diz *"resolved to 2 elements"*.
   ⚠️ **E o primeiro diagnóstico foi errado, com custo medido:** li como lentidão, aumentei o prazo,
   e a instabilidade subiu **de dois casos para seis**. A correção é escopo — esperar pelo título da
   vitrine, procurar a resposta dentro do `main` do formulário.
4. **`focus()` programático não abre dica ao apontar do Radix.** Ela só abre no foco quando ele é
   **visível** (`:focus-visible`), e o navegador não o aplica a foco programático quando a última
   interação foi de ponteiro. O caso passava numa execução e reprovava na outra **no mesmo commit**,
   porque o que decidia era o que tinha acontecido na página antes. A forma que não depende disso é
   **pressionar tecla**: focar o vizinho e voltar com `Shift+Tab`. É também mais honesto — mede o
   caminho de quem navega por teclado em vez de simular o resultado dele.
5. **Três verificações reprovaram lendo a PRÓPRIA documentação como violação.** A varredura de
   domínio do filtro leu *"ele não conhece instrutor"* do cabeçalho como se conhecesse; a de
   `--texto-tenue` leu três frases **sobre** o token como usos dele. ⚠️ **Um teste que confunde a
   frase que promete a ausência com a violação ensina a apagar a documentação para ficar verde** —
   exatamente o contrário do que estes requisitos querem. Toda varredura desta fatia lê **código sem
   comentário**.
6. **A suíte de unidade reprovou uma vez por cache frio, logo depois do `pnpm install`.** Os dois
   casos que instanciam o ESLint estouraram os 30 segundos; na execução seguinte levaram 6. Não foi
   corrigido porque não se reproduziu — fica registrado para não custar uma investigação no dia em
   que aparecer no CI.

⚠️ **E uma divergência reportada, não corrigida:** o documento 06, linha 287, traz a **mesma
compressão errada** do formato do nome de instrutor que o `FR-012` e o `CHK016` tinham — escreve
`P/G Especialidade Nome de Guerra`, descartando o nome completo. Os dois primeiros foram corrigidos
em 10/09/2026; **o documento 06 não**, porque emendá-lo é decisão à parte. O código segue o
`RF-INSTR-15`, que é **[PRESERVADO]**.

**Os dez achados de plataforma do Épico 3 — todos custaram investigação, nenhum aparece no `tsc`:**

1. **`process.env[variavel]` com chave dinâmica NÃO é substituído no bundle.** Só o acesso
   literal `process.env.NEXT_PUBLIC_FOO` é. `conferirAmbiente()` fazia leitura dinâmica desde o
   Épico 0 e ninguém notou, porque no servidor `process.env` é objeto de verdade. No primeiro
   componente de cliente que a chamou, **a tela abriu dizendo que todas as variáveis faltavam,
   com o `.env.local` inteiro preenchido**. A forma que concilia as duas exigências — literal
   para o Next, tardia para os testes — é **acesso literal dentro de função**.
2. **Não crie `middleware.ts`.** O Next 16 depreciou a convenção e `proxy.ts` já existia desde o
   Épico 0. `next build` recusa os dois juntos; o `tsc` não vê.
3. **O `.env.local` aponta para o Supabase REMOTO**, e o ponta a ponta construía a aplicação com
   ele. O convite era emitido pelo stack local e a tela tentava validá-lo no remoto — erro
   `unrecognized JWT kid ... for algorithm ES256`, que não sugere ambiente trocado a ninguém.
   Resolvido em `playwright.config.ts`, que agora passa as chaves locais por `webServer.env`.
4. **`[auth.email].enable_signup = false` derruba o LOGIN**, não só o auto-cadastro: mapeia para
   `GOTRUE_EXTERNAL_EMAIL_ENABLED`. Os 98 testes de RLS falharam em bloco com *"Email logins are
   disabled"*. Quem desliga o auto-cadastro é o `enable_signup` da seção `[auth]`.
5. **`email_sent = 2` por hora** é o padrão do CLI. A suíte de convite falha na terceira execução
   do dia com "nenhum e-mail chegou". Elevado a 100 **no stack local**, com a distinção escrita:
   não é a defesa contra força bruta, que é a do painel remoto.
6. **`@supabase/ssr` usa fluxo PKCE e ignora token no fragmento.** O link de convite devolve
   `#access_token=`, e a tela dizia "link inválido" com um link perfeitamente bom. Resolvido com
   `setSession` explícito a partir do fragmento.
7. **`supabase db reset` NÃO recarrega a seção `[auth]` do `config.toml`.** Medido em 09/09/2026:
   depois de gravar `minimum_password_length = 12` e rodar `pnpm db:reset`, o contêiner de auth
   ainda trazia `GOTRUE_PASSWORD_MIN_LENGTH=6`. O `reset` reinicia contêiner; o ambiente de
   `[auth]` é montado no `supabase start`. ⚠️ **Isto separa `verificar:tudo` do CI** — o CI sobe o
   stack do zero e sempre aplica; a máquina de quem desenvolve, com o stack de pé, não. Quem edita
   `[auth]` precisa de `pnpm db:stop && pnpm db:start`. ✅ **Fechado**: Bernardo optou pela
   conferência barata em vez de reiniciar o banco a cada ciclo, e
   `tests/invariantes/rls/config-auth-aplicado.test.ts` compara o arquivo com o contêiner em
   2 segundos, com o conserto escrito na mensagem de erro.
8. **O mínimo de 12 caracteres da senha existia só no navegador.** `minLength={12}` nos dois campos
   do formulário de convite, e `config.toml` no padrão do CLI, **6** — regra de negócio
   implementada apenas na UI, que o BRIEF §2 proíbe, alcançável por chamada direta à API de auth.
   Corrigido e **provado pelo caminho real**: `PUT /auth/v1/user` recusa 8 caracteres com HTTP 422
   `weak_password` e aceita 14. ⚠️ O endpoint de **administração** não obedece ao mínimo — a
   `service_role` cria conta com senha curta e devolve 200. Não é defeito, mas não é intuitivo.
   Guardado por `tests/invariantes/rls/politica-de-senha.test.ts`, conferido por defeito
   deliberado — com o mínimo de volta em 6, ele reprova.
9. **Teste de ponta a ponta que decide por tempo não prova nada.** O V-4 do convite lia
   `body.innerText()` na linha seguinte ao `goto`, e a conferência do link é **assíncrona**: ele
   pegava *"Conferindo o link…"*. Vermelho na suíte inteira, verde sozinho — o pior modo de falha
   possível, porque parece azar. `expect(...).toBeVisible()` reexecuta; leitura direta, não.
10. **A ponta a ponta não podia mais viver no bloco `build` do CI**, e só o primeiro PR da fatia
   revelou. O `playwright.config.ts` passou a perguntar as chaves ao `supabase status` **no
   carregamento da configuração**; o bloco `build` não tem a CLI nem o stack, e a suíte morria em
   `spawnSync supabase ENOENT` antes do primeiro teste. ⚠️ **O local não pega**: na máquina de
   quem desenvolve a CLI existe e o stack está no ar. Verde no `verificar:tudo`, vermelho no CI,
   sobre o mesmo commit. Mudou para o bloco `banco`, que já sobe o stack. **Uma suíte que fala com
   o banco pertence ao bloco que tem banco.**

**⚠️ E um que os testes existentes pegaram:** view nova nasce com `DELETE` e `TRUNCATE` para
`authenticated`. O `revoke ... on all tables` do Épico 1 é **uma foto do momento**, não regra
permanente — **toda migration que criar tabela ou view precisa repetir o revoke**.

**Quatro achados do Épico 1 — corrigidos, e que ninguém deve reintroduzir:**

1. **`TRUNCATE` não passa pela RLS.** O Supabase concede `ALL` a `authenticated` por padrão e
   `docs/sql-referencia/05` nunca revogava `DELETE` nem `TRUNCATE`. Um usuário autenticado
   poderia **truncar `migracao_log`** e apagar a evidência auditável da migração sem que
   policy nenhuma fosse consultada. M6 revoga os dois. A "proteção dupla" do FR-033 só existia
   pela metade.
2. **`responsaveis_curso` não tinha `EXCLUDE` de vigência.** O documento 05 §7.5 especifica
   dois; o referência implementa um. Sem ele, um DSA reimpresso sairia com duas rubricas do
   mesmo papel. Acrescentado em M2.
3. **Uma FK usava `CASCADE`** (`horarios_tempos_aula`), contra a regra geral do BRIEF §2 e sem
   justificativa escrita. Trocada por `restrict` — nada é apagado neste sistema, então não muda
   comportamento alcançável.
4. **O rodapé de `docs/sql-referencia/01` está extraviado**, antes da TABELA 11. Quem extrair
   "do início até o rodapé" perde `turma_disciplina_instrutor` — a tabela de onde a LIQ lê.

**Divergência reportada, não corrigida:** a semântica de `vigente_ate`. O documento 05 §7.5
escreve `daterange(…, '[)')` — fim **exclusivo**; o referência implementa `vigente_ate + 1` —
fim **inclusivo**. Vale um dia, na fronteira. Seguimos o referência.

**Três armadilhas já pagas — não redescobrir:**

1. **Veio Next 16, não 15.** `tsc --noEmit` isolado falha com `Cannot find name 'LayoutProps'` até
   que um `next build` (ou `next typegen`) gere os tipos de rota. Não é erro de código.
2. **Spec Kit 0.16.0 usa hífen:** `/speckit-specify`, não `/speckit.specify` como o documento 10
   §2.8 escreve. As skills estão instaladas e corretas.
3. **A constitution existe em dois endereços** — `docs/vibe-coding/40-Constitution-v2.1.md` e
   `.specify/memory/constitution.md`. **Emenda tem de ir nos dois**, sob pena de divergência
   silenciosa. Consolidar num só é decisão pendente do Bernardo (CONST-1).
   **⚠️ Corrigido em 28/08/2026: eles NÃO são idênticos.** O corpo normativo já divergia em 5 linhas
   antes de qualquer edição desta data — a cópia de `.specify` aponta para `sql/05_rls_policies.sql`,
   caminho que não existe (o certo é `docs/sql-referencia/05_rls_policies.sql`), e o rodapé de versão
   está posicionado de forma diferente. **A divergência silenciosa que o CONST-1 previa já aconteceu.**

**Volumes** (para dimensionar, não para otimizar): 24 cursos · **28** turmas (a documentação dizia 29; a planilha
tem 29 linhas e só 28 com `ID_Turma` — D-7 da spec 009) · 175 disciplinas ·
177 instrutores · 798 vínculos instrutor↔disciplina · ~1.753 registros de aula · 663 + 1 = 664
atividades não letivas (531 Estudo Individual · 62 AEC · 60 TAD · 11 TR) · 111 avaliações · 210 linhas de `turma_disciplina` · dezenas de usuários simultâneos no
máximo. **É uma base pequena: priorize clareza de schema e manutenibilidade sobre desempenho.**

### Decisões pendentes do Bernardo — não atropelar por suposição

| # | Decisão | Bloqueia |
|---|---|---|
| ~~**Hospedagem fora da infraestrutura da MB**~~ | ✅ **AUTORIZADA pela CIAARA-14.2 em 08/09/2026**, inclusive para **dado pessoal** — CPF, RG, telefone e endereço dos 177 instrutores migram em cheio (migration `20260908071000`). ⚠️ **Correção de 22/09/2026: as COLUNAS migram; DADO não há.** Medido na própria planilha (`bruto/v20/Cad_Instrutor.csv`, extração de 08/09/2026): **CPF, RG, telefone, endereço e área de conhecimento têm 0 de 177 preenchidos**; e-mail **2**, nome de guerra **2**, data de nascimento **4**, início da docência no CIAARA **1**. A frase acima descrevia o transporte, e é fácil lê-la como se o dado existisse. ⚠️ **Consequência:** o recorte de PII por coluna e por perfil da fatia (c) — `revoke` de tabela, `grant` por coluna e visão com porteiro — **está correto e hoje protege coluna vazia**. Ele passa a proteger dado no dia em que alguém preencher, e é exatamente por isso que continua valendo. ⚠️ **Consequência que fica aberta:** a RLS do Épico 1 foi desenhada para dado FUNCIONAL, e hoje quem lê `instrutores` lê tudo. Não há recorte que permita ver posto e habilitação **sem** ver CPF e endereço — e é plausível que devesse haver. É desenho de segurança, portanto **Épico 3** | Nada. Era a única pendência capaz de bloquear a versão por razão não técnica |
| ~~**PII-1**~~ | ✅ **Fechada em 08/09/2026.** Leem identificação civil e residência de instrutor **três** perfis: `admin`, `encarregado_administracao_academica` e `ajudante_administracao_academica`. `chefe_departamento_ensino` fica **de fora de propósito** — ele enxerga todos os cursos, e entraria como o perfil de maior alcance sobre dado pessoal. ⚠️ O mecanismo **não é RLS**: é `revoke` de tabela + `grant` por coluna + visão com porteiro (RLS não recorta coluna) | — |
| **CONST-1** | Constitution em dois endereços: consolidar ou manter espelho | Nenhum épico. Custo cresce a cada emenda |
| ~~**MENU-1**~~ | ✅ **Fechada em 11/09/2026 — o rascunho estava certo nos três pontos.** Ordem mantida (Início · Cursos · Cronograma · Atividades · Instrutores · Disciplinas · Administração), rótulo **"Disciplinas"** (a v2.0 usa o mesmo termo que a P-14 fixou, então não há divergência a preservar) e Administração como **entrada única**, com Permissões alcançada por aba. Registro com data em `specs/008-shell-e-estado-na-url/contracts/casca.md`. Fecha o `FR-017.1` e o `CHK017` — o `FR-017` passa a ser verificável | — |
| ~~**MENU-2**~~ | ✅ **Fechada em 11/09/2026 — as entradas sem tela ficam visíveis, marcadas *"em breve"*.** O menu não cresce a cada épico, e ninguém reaprende a navegação sete vezes. ⚠️ O risco aceito é parecer quebrado; o risco recusado era contrariar o `RF-NAV-02`, que manda manter os pontos de entrada de hoje | — |
| ~~**PR-4c**~~ | ✅ **Fechada em 11/09/2026.** O **PR #9** (redirecionamento aberto) e o **PR #10** (fatia c) estão na `main`. ⚠️ **O #10 entrou por squash**, e os #8 e #9 tinham entrado por merge commit — decisão de Bernardo em 11/09: vale o squash que a seção *Convenções de commit* já mandava, e os dois anteriores ficam registrados como desvio | — |
| ~~**TURMA-1**~~ | ✅ **Fechada em 28/08/2026 — filtro de apresentação.** O domínio de status de turma fica com os quatro valores reais (`planejada`, `ativa`, `concluida`, `cancelada`); "Arquivada" é VIEW, **não** valor novo | — |
| ~~**Q1.b**~~ | ✅ **Fechada em 08/09/2026.** O cruzamento com as 7 planilhas de planejamento da v1.0 recuperou a UE de **901 dos 1.566** lançamentos; os demais ficam **nulos**, amparados pela catraca `reg_aula_ue_so_nula_no_historico`. Bernardo ratificou os nulos: *"o ETL deve ser o retrato fiel da origem, sem preenchimentos inventados"*. ⚠️ **Emenda de 22/09/2026, sem reescrever o princípio** *(decisão de Bernardo Villas Boas)*: **a regra restringe o ETL, não o responsável pelo dado.** Bernardo pode corrigir a planilha da v2.0 onde souber o valor certo, e o ETL passa a transportar fielmente o valor corrigido. **O que segue proibido é a máquina inferir.** Critério, em uma linha: **corrige quem consegue nomear a origem da resposta; deixa vazio quem só tem palpite — e a catraca continua valendo para o vazio.** Toda correção fica registrada em `scripts/etl/dados/correcoes-de-origem.md` — data, o quê, valor antigo → novo, e de onde veio a resposta —, porque sem isso ninguém distingue correção de aparição | — |
| ~~**UE-PUB**~~ | ✅ **Fechada em 30/08/2026 — pode ser público.** O catálogo de UE (582 unidades lidas do PDF, 2.446 subunidades, ementa de 135 disciplinas — os números de 572 e 134 daquele dia eram do extrator antes da correção do cabeçalho `DEENSINO`) fica legível por qualquer pessoa no repositório. Decisão de Bernardo, na mesma linha da abertura do repositório em 26/08. `scripts/etl/dados/` permanece versionado | — |
| ~~**AMBIENTE-1**~~ | ✅ **Decidida por Bernardo em 21/09/2026 — preview e production seguem no MESMO projeto Supabase por ora**, com a **separação agendada para o dia da virada**. Confirma a exceção do `FR-016.1` da spec 001 até lá: aplicar migration no remoto é aplicá-la **também na Production**, e o que a `main` roda passa a falar com o banco novo antes do merge | O plano de aplicação no remoto de cada PR de banco |
| ~~**AMBIENTE-2**~~ | ✅ **Decidida por Bernardo em 21/09/2026 — a primeira carga no remoto é a ÚLTIMA**, e o script MUST **recusar `--primeira-carga` contra destino que já tenha dados**. ⚠️ **Ainda NÃO implementado — medido em 22/09/2026**: hoje `--primeira-carga` **só muda o texto final** (`scripts/etl/executar.py`, a própria ajuda diz *"muda o texto final, nao o comportamento"*). O que impedia uma segunda carga era **colisão de chave no meio da promoção** — transação desfeita, saída 3, mas por acidente e não por recusa declarada. ✅ **IMPLEMENTADO em 22/09/2026**, no ramo do PR 2 (`scripts/etl/carregar.py`, `dados_ja_carregados`): `--primeira-carga` contra destino que já tem dado **recusa antes de tocar no `staging`**, nomeando tabela e contagem. O critério é a **procedência** (`origem_migracao_v1`), não *"a tabela tem linha"* — o que a plataforma ou uma migration semeiam não conta, e um destino recém-migrado continua elegível. **Medido nos dois sentidos**: recusa contra a base carregada, passa depois do `db:reset`. **Amarrado por Bernardo em 22/09/2026, com estas palavras: *nenhuma carga é executada contra o remoto antes de o script recusar `--primeira-carga` contra destino com dados.* É PRÉ-REQUISITO DA CARGA, e não tarefa do PR que a acompanha.** Motivo: *hoje o que impede uma segunda carga é colisão de chave por acidente, e proteção acidental é o que a fatia (a) do Épico 5 inteira vem eliminando.* Não entra no PR 1 da spec 009. ⚠️ **E um segundo pré-requisito, com prazo** *(decisão de Bernardo Villas Boas, 22/09/2026)*: correção feita na planilha **antes** da carga no remoto entra **sem custo**; **depois** dela, a mesma correção exige a tela de turma ou de curso, que é do PR 2 da spec 009. **Portanto a carga no remoto só acontece depois de Bernardo dizer que terminou as correções de origem que sabe fazer** | **Toda carga contra o remoto** |
| ~~**AMBIENTE-3**~~ | ✅ **Decidida por Bernardo em 21/09/2026 — levantar onde a chave `service_role` está configurada, só relatar, sem alterar.** **Levantado em 22/09/2026**, sem ler nenhum valor: (1) **Vercel**, `SUPABASE_SERVICE_ROLE_KEY` como *Secret* nos escopos **Production** (criada há 8 dias) e **Preview** (há 15); (2) **`.env.local`** desta máquina, com a chave **do projeto remoto** — fora do git (`.gitignore:34`), ⚠️ **mas dentro da pasta do OneDrive**, portanto **replicada na nuvem da Microsoft** e em todo aparelho que sincroniza a pasta; (3) **GitHub**: **nenhum** segredo no repositório, e o CI **não** a usa — as suítes leem a chave **local** do `supabase status`; (4) **código**: um consumidor só, `lib/supabase/admin.ts`, com `server-only`; `scripts/dev-local.mjs` e `scripts/manutencao/credencial_local.py` usam a chave **local**; (5) **19 arquivos versionados citam o nome** e **nenhum traz valor** — os dois que pareciam trazer são marcadores (`sb_secret_XXXX…` no `.env.local.example`, e o cabeçalho padrão de JWT seguido de `...` no documento 24) | — |
| **VIRADA-1** ⛔ | **A carga final da planilha será SELETIVA — só lançamentos novos, casados por código, sem tocar em cadastro** *(decisão de Bernardo Villas Boas, 24/09/2026; **não implementar agora**)*. Desde que o remoto virou fonte da verdade dos cadastros, rodar o ETL como ele é hoje **sobrescreveria** o que os testadores editaram: ele carrega a planilha inteira, cadastro incluído. O que a virada precisa é de uma carga que **acrescente** o que os épicos de lançamento ainda não entregam — aula, avaliação e atividade —, casando pelo `codigo` da v2.0, e que **recuse tocar** em `cursos`, `turmas`, `instrutores` e `disciplinas`. ⚠️ **E ela herda os dois pré-requisitos da AMBIENTE-2**, que continuam valendo. ⚠️ **Enquanto não existir, nenhuma carga roda contra o remoto** — o que já era verdade, e agora tem um segundo motivo | **A virada** |
| **STORAGE-1** | **Excepcionar `storage.objects` da regra 4, ou não?** *(levantada em 29/09/2026, spec 011)*. A `FR-014` pede que a pessoa **remova** a própria foto. Hoje remover anula `usuarios.avatar_caminho` — a tela volta às iniciais, que é o que a pessoa vê — e **o arquivo permanece no balde**, limitado a **um por conta** (o envio sobrescreve o mesmo caminho) e invisível (balde privado, e sem a coluna ninguém pede o endereço). Apagar o arquivo de verdade exige uma policy `for delete` em `storage.objects`, e a regra 4 diz *"PR que acrescenta `for delete` é rejeitado sem discussão"*. ⚠️ **A regra protege REGISTRO do domínio acadêmico; aqui o objeto é um ARQUIVO DE IMAGEM que o próprio dono enviou** — mas a distinção é sua, não de quem escreve a migration, e o mecanismo de exceção é nominal. **Opções:** (a) manter como está — nenhuma exceção, lixo limitado a um arquivo por conta; (b) exceção nominal para `storage.objects`, delimitada ao balde `avatares` e ao **próprio dono**; (c) apagar por script de manutenção versionado, rodado à mão. **Recomendação: (a)** — o requisito de quem usa já está atendido, e o custo é um arquivo por conta que jamais cresce | Nada. Só reabre se o volume de fotos incomodar |
| **PEND-011-2** | **Exibir a trilha de auditoria na página da conta** *(registrada em 03/10/2026, no encerramento da spec 011)*. A trilha existe, é só de acréscimo e imutável inclusive para a `service_role`; `public.rastro_da_conta(uuid)` já a lê com o autor resolvido em nome. ⚠️ **O que falta é tela**: hoje ninguém vê o rastro sem abrir o banco, e uma trilha que só o `psql` lê não protege quem precisa dela numa conferência. ⚠️ **E é a terceira vez que esta forma aparece nesta spec** — função pronta sem consumidor: `encerrarSessao()` (que criou a spec), `dependentesDaConta` (que ficou órfã por 24 h) e agora `rastro_da_conta`. **Recomendação:** um bloco na página `/admin/usuarios/[id]`, somente leitura, com as quatro informações da trilha | Nada. É entrega de tela, não correção |
| **PEND-011-4** | **Voltar a chave administrativa para o formato `sb_secret_`** *(registrada em 03/10/2026)*. Hoje Preview e Production usam a **`service_role` legada (JWT)**, porque a `sb_secret_` dava **401 em `/admin/users`**. ⚠️ **E «subir o `supabase-js`» PODE NÃO BASTAR, medido no pacote instalado:** na **2.112.4** o cliente de Auth monta cabeçalho estático e manda a chave **também no Bearer**, contra a regra que o próprio SDK declara (*chave nova nunca vai como Bearer*) — e `@supabase/auth-js` 2.112.4 não tem uma linha executável sobre o formato novo. ⚠️ **Portanto o pré-requisito é achar a versão em que `_initSupabaseAuthClient` deixa de mandar a chave no Bearer**, não apenas a versão mais nova. ⚠️ **E há um paradoxo aberto:** `listUsers` (GET) funcionou com `sb_secret_` nesta máquina e `createUser` (POST) deu 401 no preview, com **cabeçalho idêntico** nas duas — o experimento que isola, sem criar conta, é comparar `getUserById` de um id inexistente com `createUser` de e-mail vazio na mesma chave (o porteiro de admin roda antes da validação do corpo, então **422** prova autorização). **Recomendação:** não migrar sem esse isolamento | Nada. A legada funciona, e o risco de trocar sem medir é repetir o 401 em Production |
| **REGRA4-011** | **Ratificar o alcance real da exceção da regra 4 para `usuarios`** *(levantada por mim em 03/10/2026, e declarada no texto da própria regra)*. A emenda autorizou apagar/anonimizar `usuarios`; **o código faz duas coisas que o texto não cobre:** `public.excluir_conta` apaga `public.usuario_curso` nos dois caminhos — uma **quinta** tabela, enquanto a regra diz *"nenhuma outra"* —, e a Server Action apaga, em `auth.users`, a credencial **órfã** presa no e-mail da conta. ⚠️ **Os dois estão escritos e nenhum é policy de `DELETE`** (a asserção que conta `pg_policy.polcmd = 'd'` segue em **zero**), mas **alcance maior que o autorizado é exatamente o que a regra 4 existe para impedir**. ⚠️ **E a razão de cada um é defensável:** vínculo de curso é **alcance de acesso**, não histórico acadêmico, e credencial órfã prende um e-mail que a `D-USR-3` promete liberar. **Recomendação:** ratificar os dois nominalmente, no texto da regra | Nada. O comportamento está em produção e testado; o que falta é a palavra |
| **GUARDA-ACAO** | **Guarda que ligue Server Action exportada a consumidor** *(registrada em 03/10/2026)*. ⚠️ **Esta spec NASCEU de uma ação com teste e zero botões** (`encerrarSessao()`), e **a mesma forma reapareceu duas vezes em 24 h**: `dependentesDaConta` ficou órfã quando o diálogo parou de consultar o servidor (pega por revisão, não por portão) e `urlDaAplicacao()` perdeu os consumidores de produção quando o convite e a recuperação saíram. ⚠️ **`tsc` e `eslint` não dizem nada**: export não usado não é erro, e Server Action órfã é **endpoint HTTP alcançável sem tela nenhuma** — não é só código morto. ⚠️ **O desenho exige cuidado**, e é por isso que é decisão e não tarefa: ação legítima pode chegar por **propriedade** (como `encerrarSessao` desce do layout) ou por `action={}`, então uma varredura ingênua por `nomeDaAcao(` dá falso positivo. **Recomendação:** varredura que leia código **sem comentário** e aceite as três formas de consumo, com **controle positivo** e isenção **nominal** declarada — o padrão de `sem-convite-nem-envio-de-email.test.ts` | Nada. É portão, não conserto |
| **LIQ-3** | Papel titular/reserva na atribuição | Épico 11 |
| **LIQ-4** | Persistência da LIQ emitida | Épico 11 |

Quando uma dessas aparecer no caminho: **pergunte. Não assuma.** É o Princípio I.
