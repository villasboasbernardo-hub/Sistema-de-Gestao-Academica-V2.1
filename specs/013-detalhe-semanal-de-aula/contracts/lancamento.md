# Contrato do lançamento — a Server Action, o Bloco e o que o Épico 12 vai consumir

> O lançamento é um **dado** (`Bloco`, `data-model.md` §4) que uma função pura consegue produzir e
> que a **mesma** Server Action grava. O motor do Épico 12 chama `lancar()` com um `Bloco[]`; o
> formulário chama `lancar()` com um. Nada além disso do motor entra aqui (`FR-040`, `FR-041`).

## As ações — `lib/acoes/dsa.ts`

| Ação | Entrada | Primeira linha | Grava em | Devolve |
|---|---|---|---|---|
| `lancar(bloco)` | `Bloco` | `esquemaDoBloco.safeParse` | `registros_aula` · `avaliacoes` · `atividades_nao_letivas` conforme `tipo`; `id` gerado **antes**, `insert` **sem `RETURNING`** | `{ ok: true, id, avisos: Aviso[] } \| { ok: false, mensagem, campo? }` |
| `lancarEstudoIndividualDaSemana(turmaId, ano, semana)` | ids e a semana ISO | validação dos três | um `atividades_nao_letivas` por dia útil sem feriado `dia_inteiro` e sem EI, no slot `regime_tempos + 1`, **transação** | `{ ok: true, criados: number, pulados: string[] }` |
| `mover(fatoId, origem, destino)` | `{ data, taInicial, tempos? }` | `safeParse` | `UPDATE` do **mesmo** `id`; `editado_*` carimbados | `{ ok, avisos }` |
| `editar(fatoId, origem, bloco)` | `Bloco` parcial | `safeParse` | `UPDATE` do mesmo `id`; **não** toca catálogo | `{ ok, avisos }` |
| `excluir(fatoId, origem)` | ids | validação | `status = 'inativo'` / `'cancelada'` | `{ ok }` |

Todas: `revalidatePath` da rota do DSA, da ficha da turma e do `/inicio`; recusa do banco →
`traduzirRecusa(erro, { turma })`, com estas chaves **novas** ganhando frase em português:

| Chave do banco | Frase (proposta) |
|---|---|
| `reg_aula_ue_ou_disciplina` | *"Aula sem unidade de ensino precisa do tópico escrito."* |
| `reg_aula_ue_so_nula_no_historico` | *"Esta disciplina tem unidades de ensino: escolha uma."* |
| `reg_aula_ue_xor_disciplina` | *"Informe a unidade de ensino **ou** a disciplina, não as duas."* |
| `reg_aula_instrutor_obrigatorio` | *"Aula precisa de instrutor. Atribua um à disciplina nesta turma."* |
| `vigencia_reinterpretaria_lancamento` | *"Esta data já tem lançamento sob outro regime."* |
| `curso_em_oferta` / `turma_em_oferta` (na policy) | *"Esta turma está fechada para alteração — o curso não está em oferta."* |
| `sem_alcance` (função de conflito) | `recusaPorAlcance()` — a frase que já existe |
| `dsa_teto_tfm` (recusa do servidor, não do banco) | *"TFM já tem N TA nesta semana; o teto é 6."* |

## Os avisos — nunca bloqueio, salvo o TFM

`avisos: Aviso[]` com `{ codigo, texto }`, calculados no servidor por `tetos.ts` e `conflitos.ts`
**depois** de gravar, e mostrados pela tela em `AlertaConformidade`:

`teto_recomendado` (25) · `ta_excepcional` (`RF-HOR-03.1`) · `acima_do_regime` (TA além dos do dia) ·
`ue_passou` (lançou mais que a CH da UE — o "PASSOU" da planilha) · `conflito_instrutor` ·
`conflito_fiscal` · `alerta_sala` · `lancado_a_frente` (`Q-2`).

**Bloqueio**: só `dsa_teto_tfm` (`RN-DIST-03` (a)), no `lancar`, no `mover` e no `editar`.

## O esquema — `lib/validacao/dsa.ts`, um só para os dois lados

```ts
export const esquemaDoBloco = z.discriminatedUnion("tipo", [
  aula,            // disciplinaId XOR unidadeEnsinoId; sem UE ⇒ conteudo obrigatório E disciplinaSemUe
  avaliacao,       // disciplinaId, instrutorId (responsável), fiscal: { instrutorId } | { nomeExterno }
  vistaProva,      // idem + data/TA próprios ≥ data da aplicação
  atividade,       // categoria: aec | tad | tr | estudo_individual; subtipo da lista; responsavelExterno XOR instrutorId
]);
```

Regras que ficam **no esquema** (não dependem do banco): faixa `1..12` de `taInicial` e `tempos`;
`data` em `AAAA-MM-DD`; XOR UE/disciplina; fiscal interno XOR externo; EI sempre `escopo: turma`.
Regras que ficam **no banco** (e chegam como recusa traduzida): habilitação (`RN-INST-01`), alcance,
curso em oferta, a isenção da UE (`app.disciplina_sem_ue`), FKs compostas.

## O pré-preenchimento — `lib/dominio/dsa/pre-preenchimento.ts` (puro) + `consulta.ts`

| Campo | Cascata | Quando cai vazio |
|---|---|---|
| `instrutorId` | `turma_disciplina_unidade` (por UE) → `turma_disciplina_instrutor` (por disciplina) → vazio | aviso *"esta disciplina não tem instrutor atribuído nesta turma"* + link |
| `tecnica` | `unidades_ensino.tecnica_ensino_sugerida` casada com a lista | o seletor abre sem valor |
| `local` | `turmas.sala_alocada` | vazio, sem inventar sala |
| `conteudo` | `unidades_ensino.topico` | aula sem UE: **obrigatório** digitar |

⚠️ Medido: `turma_disciplina_unidade` tem **0 linhas** no remoto — o primeiro degrau está vazio hoje.

## O que o Épico 12 recebe, e nada mais

- O tipo `Bloco` e `blocoValido()`.
- `lancar(bloco)` aceitando **um** bloco; o motor itera e agrega os resultados — **não** há `lancarVarios` nesta fatia.
- **Nenhuma** sugestão, cópia de semana, preferência de instrutor ou sequenciamento (`RNF-NORM-04` rejeitado) — nem "preparado".
