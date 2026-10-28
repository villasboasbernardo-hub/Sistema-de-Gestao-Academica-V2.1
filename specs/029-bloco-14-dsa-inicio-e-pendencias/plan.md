# Plano — spec 029 (Bloco 14)

Ordem de dentro para fora (`CLAUDE.md`): `lib/dominio/` (regra pura + teste visto reprovar) → migration + pgTAP →
`lib/validacao/` → `lib/acoes/` → leitura → telas → `components/` → ponta a ponta → documentos. **Uma** migration, que
só acrescenta (item 2). A ponta a ponta inteira fica com o CI; localmente, só os arquivos tocados, com 1 processo.

## Contexto técnico e constituição

- Next.js 16 (App Router, Server Components por padrão), Supabase, Vitest, Playwright, pgTAP — sem pacote novo.
- **Constituição:** nenhuma regra do documento 04 muda fora a RN-DIST-03 (a), por decisão nominal de 27/10/2026 (regra
  1); exclusão continua lógica (regra 4); o alerta continua alerta (regra 6); `lib/dominio/` segue puro (regra 9); a
  única folha de cliente que muda (`EscalaDoPapel`) já está declarada; o banco **só acrescenta** (regra 9.4 com a emenda
  de 19/10/2026). **Portão:** nenhum — a alternativa da D-11 (recriar a view) seria portão, e não foi escolhida.

## 1. Domínio puro (`lib/dominio/`)

| Módulo | O quê | Item |
|---|---|---|
| `dsa/tetos.ts` | sai o ramo TFM, `ehTfm` e `TetosDoDsa.tfmSemana`; cabeçalho com a RN-DIST-03 emendada; `avaliarTetosDaSemana` não devolve bloqueio | 1 |
| `categoria-pelo-tipo.ts` | `descricaoObrigatoria(categoria)`; `recusaPelaCategoria` recusa a descrição ausente fora do EI | 2 |
| `dsa/impressao.ts` | o EI no mesmo TA / no dia bloqueado sem descrição sai com o texto e a sigla do EI | 2 (D-6) |
| `dsa/publicacao.ts` | `alteracaoSalva` e `podeSalvarAlteracao` em `situacaoDaSemana`; `seloDaSituacao(…, alteracaoSalva)` → *«Em alteração · salva»* | 3 |
| `carga-semanal.ts` | `janelaDaCarga(previsao, periodoDaTurma)`: recorte; disjunta → período da turma; turma sem período → previsão | 4 |
| `andamento-da-turma.ts` | parâmetro opcional com os regimes das semanas; capacidade **dia a dia** por `regimeDaSemana`; `capacidadeDiaria` do 1º dia útil e a faixa mínima–máxima; dia sem TA → sem regime | 5 |
| `instrutores-da-aula.ts` | `fraseDaListaDeInstrutoresVazia(motivo)` (`sem-disciplina` · `sem-habilitado` · `sem-atribuido`); `fraseDaListaDaAula` delega a ela (mesmo texto) | 6 |
| `cartoes-do-inicio.ts` | a população dos cartões do ano (com a arquivada) separada da do carrossel (sem ela) | 7 |
| `painel-de-turmas.ts` | os indicadores contam a arquivada (menos *Iniciando*); os avisos seguem sem ela | 7 |
| `enquadramento-do-papel.ts` (novo) | as medidas da folha em px e `escalaQueCabe(largura, altura, piso)` | 8 |

## 2. Banco — migration `<carimbo>_estudo_individual_sem_descricao.sql` (só acrescenta)

`alter table public.atividades_nao_letivas alter column descricao drop not null;` + o CHECK
`ativ_descricao_fora_do_estudo_individual` + o comentário da coluna. Cabeçalho com a decisão, o efeito (nenhuma linha
muda) e a reversão (`drop constraint`; `update … set descricao = 'ESTUDO INDIVIDUAL' where descricao is null`; `set not
null` — a reversão mexe em dado e diz isso). `pnpm db:tipos`. pgTAP `153_estudo_individual_sem_descricao.sql`:
`col_is_null`, a constraint, `lives_ok` no EI nulo (o caso que discrimina) e `throws_ok '23514'` na AEC nula.
`reversao.sql` provada numa base descartável (impressão digital volta). Frase da restrição nova em
`lib/acoes/traducao-de-recusas.ts`. Rito do remoto em `plano-de-aplicacao-no-remoto.md`.

## 3. Servidor (`lib/acoes/`, `lib/validacao/`)

- `validacao/dsa.ts`: `descricao` vira `textoOuNulo` (a obrigatoriedade por categoria mora em `recusaPelaCategoria`).
- `acoes/dsa.ts`: `tetosDoBanco` lê só o recomendado (a falta da chave de TFM não cala mais nada); comentários do TFM;
  o `lancar` passa a descrição à `recusaPelaCategoria`; `aplicarAtualizacao` recusa a descrição apagada fora do EI com
  frase (não `23502`).
- `acoes/publicacao-do-dsa.ts`: `salvarAlteracaoDoDsa` (Zod na 1ª linha, a mesma RPC `salvar_semana_do_dsa`, o regime da
  semana, a mensagem *"Alteração salva…"*), extraindo o corpo comum do `salvarSemanaDoDsa`.
- Scripts da carga (`scripts/carga_dsa/plano.py`, `resolver.py`, `provar_carga_dsa.py`): sai o ramo do TFM (D-4).

## 4. Leitura e telas

- **DSA**: `FormularioDeLancamento` (`required` só fora do EI; *"O que é (opcional)"* no EI; envia nulo); `AcoesDoBloco`
  e `grade-dsa.tsx` (o título sem descrição usa o subtipo); `BarraDoDsa` (*Salvar alteração* antes de *Publicar
  alteração*, `data-slot="salvar-alteracao"`; o texto do Limpar em alteração); `page.tsx` (passa a ação e
  `alteracaoSalva`); `VersoesPublicadas` (a linha de situação da D-25); comentários do TFM.
- **Atividades** (`/atividades`): `descricao: string | null`, *"—"* na célula vazia.
- **Instrutor** (ficha e Avisos): a janela da carga por `janelaDaCarga` com o período da turma embutido no `select`; a
  coluna *Janela prevista*, a média *(pela janela)*, o alerta lilás e a ordem da tabela pela janela; o texto fixo da
  ordem da janela.
- **Saldo**: um leitor comum `app/(app)/turmas/regimes-das-semanas.ts` (duas leituras na mesma rodada; falha degrada
  para «sem exceções»), ligado nos quatro leitores (Início/`panorama.ts`, Avisos, `/turmas`, ficha) sem `await` em
  laço; `IndicadoresDaTurma` com a faixa de TA/dia; textos de `FormularioDeTurma` e `RegimesDoCurso`.
- **Seletor**: `components/ciaara/seletor-instrutor.tsx` com a propriedade obrigatória `vazio` (D-15, compacto);
  chamadores: `TaForaDoDsa`, `PainelDeInstrutores` (por UE e o parágrafo), `ResponsavelOuNomeLivre`, o ramo da aula
  (`FormularioDeLancamento`, `AcoesDoBloco`), com `podeLerInstrutores` vindo do servidor; vitrine e prévia
  `.design-sync`; `app/(app)/disciplinas/consulta.ts` sem erro descartado (D-16).
- **RT-8**: `inicio/page.tsx` (panorama com a arquivada para os cartões, sem ela para o carrossel e os vazios certos);
  `turmas/page.tsx` (cabeçalho e vazio da D-19); `arquivamento-da-turma.ts` (docblock de `semAsArquivadas`).
- **Início**: sai a frase; a seção dos DSA publicados sobe para logo abaixo do cabeçalho; `EscalaDoPapel` mede largura
  **e** altura disponíveis (janela − topo da caixa − folga dos controles), refaz em resize da janela, da caixa e do
  `main`, centra o papel, expõe `data-escala`, sai visível do servidor com a proporção reservada; comentários de ordem.

## 5. Testes (cada um visto reprovar antes da mudança)

| Item | Unidade | pgTAP / invariante | Ponta a ponta |
|---|---|---|---|
| 1 | `dsa/tetos.test.ts` (7 TA de TFM → nada) | `116_dsa.sql` (só a descrição) | `dsa-cartao-unico.spec.ts` invertido (4→7 grava) + 4+3 TA em dois dias → *Salvar minuta* |
| 2 | `categoria-pelo-tipo`, `dsa/validacao` | `153_…` | EI sem *"O que é"* → *Salvar minuta*; AEC sem ele recusada |
| 3 | `dsa/publicacao`, `dsa/selo-e-versoes` | — | `publicacao-do-dsa.spec.ts`: alteração salva, sair e voltar, Descartar, Publicar → ALT N |
| 4 | `carga-semanal` (`janelaDaCarga`) | — | `bloco-10.spec.ts`: o alerta na ficha no ano da turma de outro ano |
| 5 | `andamento-da-turma` (o caso que discrimina e a não regressão) | — | `bloco-11-dsa.spec.ts`: «desde» → saldo da ficha |
| 6 | `seletor-instrutor-vazio` (renderToStaticMarkup), frases | — | `ta-fora-do-dsa.spec.ts`: disciplina sem habilitado |
| 7 | `cartoes-do-inicio`, `painel-de-turmas` | — | `inicio-bloco-4.spec.ts`: concluída arquivada conta em 2026, não em 2027 |
| 8 | `enquadramento-do-papel` | — | `bloco-11-dsa.spec.ts`: 1366×768 e 1920×1080, papel inteiro sem rolar, com captura; ordem e vazio |

## 6. Documentos

Documento 04 (RN-DIST-03 a, `.md`) e as menções de consequência (D-4); `regras-da-publicacao-do-dsa.md` (RP-9);
`regras-do-dsa-lancamento.md` (RD-2/RD-3/RD-4/RD-5/RD-6/RD-7/RD-8); `padroes-de-tela.md` (RT-8); documento 02
(RF-EXTRA-01, a descrição opcional no EI); `CLAUDE.md` (RT-8 e o estado); `plano-de-correcoes-em-blocos.md` (Bloco 14,
fechando PEND-025-5, PEND-026-1 e PEND-026-2); `roteiro-de-conferencia.md`.
