# Dicionário de Tradução — Apps Script/Sheets → Next.js/Supabase

Ferramenta que converteu as **39 specs da v2.0** (314 arquivos) para a plataforma da v2.1.
**~11.300 substituições**, zero menção residual à plataforma antiga, markdown intacto.

Fica versionada porque **a conversão não acabou**: sobrará spec nova escrita com vocabulário
antigo, e há documentos fora de `specs/` que ainda podem precisar do mesmo tratamento.
Rodar de novo custa segundos; reconstruir o dicionário custa uma tarde.

## 1. Uso

```bash
cp -r specs specs.bak                    # SEMPRE. A verificação compara contra o original.
./executar.sh caminho/para/specs         # simulação — só imprime o relatório
./executar.sh caminho/para/specs --aplicar
./verificar.sh caminho/para/specs specs.bak
```

`verificar.sh` só termina limpo quando **as duas** condições valem: zero menções à plataforma
antiga **e** estrutura de markdown idêntica ao original. As duas juntas — a segunda é a que
pega o estrago silencioso.

## 2. Por que dicionário, e não reescrita por IA

Reescrever 314 arquivos com um agente de linguagem sai caro e, pior, **inconsistente**: o
mesmo `Instrutores.gs` viraria `instrutores.ts` num arquivo e `acoes-instrutores.ts` noutro,
e ninguém notaria até alguém procurar pelo nome errado. Um dicionário garante que **a mesma
coisa recebe o mesmo nome nas 39 specs**.

O agente entra só onde o dicionário não serve: passagem que descreve *mecânica* da plataforma
antiga — cota de execução, escopo global compartilhado, protocolo de implantação manual.
Traduzir isso palavra a palavra produz uma frase gramaticalmente correta que descreve um
problema inexistente. Neste corpus essas passagens couberam em campos estruturados do
template Spec Kit, e viraram substituição de campo inteiro (passada 2).

## 3. As sete passadas — e por que a ordem importa

| # | Arquivo | O que faz |
|---|---|---|
| 0 | `0-rejuntar-identificadores.py` | Junta identificador quebrado por fim de linha (`Cad_\nDisciplinas`). **Tem de vir primeiro**: as passadas seguintes usam regex de uma linha só e um identificador partido ao meio sobrevive à tradução inteira |
| 1 | `1-dicionario-mecanico.py` | O dicionário principal — módulos `.gs`, views `.html`, abas→tabelas, APIs, comandos, vocabulário. **Ordena da chave mais longa para a mais curta**, senão `Avaliacoes` mutila `Avaliacoes_Planejadas` |
| 2 | `2-campos-spec-kit.py` | Campos do template (`**Language/Version**`, `**Target Platform**`, `**Testing**`, `**Project Type**`) e o Constitution Check. Campo de formulário se substitui **por inteiro**, não palavra a palavra |
| 3 | `3-extensoes-e-entrada.py` | Extensão solta (`.gs`), caminhos do repositório antigo, `doGet`, o iframe do `script.google.com`, ApexCharts |
| 4 | `4-ferramental-de-teste.py` | `node --test` → Vitest, `vm.runInContext` → importação de módulo, `*.test.js` → `*.test.ts` |
| 5 | `5-varredura-ampla.py` | O que a verificação encontrou depois: `GAS`, wrapper `gs()`, constante `ABAS.*`, "Web App", e a dependência real de Google Docs/Drive na Ficha de Docentes |
| 6 | `6-reparar-aninhamento.py` | Desfaz o prefixo duplicado que 1 e 3 criam juntas (`` `app/`app/(app)/x`` ``) |

Passadas 5 e 6 existem **porque a verificação as exigiu**, não porque foram previstas. Isso é
normal em pipeline de substituição e é o motivo de `verificar.sh` ser parte do processo, e
não um extra.

## 4. Três categorias, deliberadamente separadas

**Mecânico** — identificador com equivalente exato. Substituição direta.

**Prosa** — descreve mecânica da plataforma antiga. Não se traduz por dicionário.

**Histórico** — narra fato datado: de-para v1.0→v2.0, decisão P-14, `Origem_Migracao_v1`,
colunas `*_Legado_v1`. **Congelado antes das substituições e restaurado depois.** É o
Princípio IV da constitution aplicado à documentação: corrige-se o passado registrando evento
novo, nunca reescrevendo o registro. Hoje sobrevivem três arquivos assim, em
`001-migracao-saneamento-dados` e `004-rbac-ampliado-usuarios`.

## 5. Quatro armadilhas, todas encontradas na prática

Estão comentadas no ponto exato de cada script. Ficam aqui porque valem para qualquer
tradução em massa de markdown, não só para esta.

**A crase tripla também é cerca de código.** Uma regra `` ``` `` → `` ` `` para limpar crase
dobrada casa igualmente com o **fechamento de bloco de código**. Destruiu 300 cercas em 58
arquivos — sem erro, sem aviso, sem sintoma até alguém abrir o arquivo. A regra correta casa
exatamente duas crases: `` (?<!`)``(?!`) ``. Toda regra que toca crase é ancorada para nunca
casar em início de linha.

**Colapsar espaço duplo apaga a indentação.** `r'  +' → ' '` parece inofensivo e destrói lista
aninhada, conteúdo de bloco de código e alinhamento de tabela — 223 linhas indentadas num
único arquivo. Espaço duplo em prosa é feio; indentação perdida é documento quebrado.

**"aba" tem três sentidos.** Aba da planilha (vira "tabela"), aba do navegador ("abre em nova
aba") e aba do formulário ("a ficha tem 3 abas"). Traduzir os três produziu *"o PDF abre em
nova tabela"* em 82 lugares. Só o primeiro sentido se traduz — e só quando o nome da tabela
vem colado.

**Nome de biblioteca carrega versão.** `Bootstrap 5.3.3` → `Tailwind CSS + shadcn/ui.3.3`.
Capture as formas com versão antes da forma nua; a ordenação por comprimento resolve.

## 6. Estender

Para acrescentar um termo, edite o dicionário da passada certa:

- identificador com equivalente exato → `1-dicionario-mecanico.py`, no dicionário da categoria
  (`MODULOS`, `VIEWS`, `TABELAS`, `APIS`, `IMPLANTACAO`, `VOCABULARIO`);
- campo do template Spec Kit → `2-campos-spec-kit.py`, em `CAMPOS`;
- termo que só apareceu depois → `5-varredura-ampla.py`.

Depois: `./executar.sh` em simulação, `./verificar.sh`, e só então `--aplicar`.
**Sempre a partir do backup**, nunca sobre um diretório já traduzido — as regras não são
idempotentes entre si (a passada 3 morde o que a 1 já mordeu).
