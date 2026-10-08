/**
 * O esquema do **bloco** do DSA — um só, para o formulário e para a Server Action
 * (`RF-DSA-04`, `RF-AVAL-04` a `06`, `RF-EXTRA-01`, `Q-1`, `Q-8` · spec 013, PR 2).
 *
 * ⚠️ **O MESMO ESQUEMA NOS DOIS LADOS, E É ISSO QUE O TORNA ÚTIL.** Server Action é endpoint HTTP
 * de fato: validar só no formulário deixa a regra alcançável por chamada direta, que é o defeito
 * que o BRIEF §2 proíbe nominalmente — e que esta base já pagou com o mínimo de senha existindo só
 * no `minLength` do campo.
 *
 * ⚠️ **É UMA UNIÃO DISCRIMINADA POR `tipo`, e não um objeto com tudo opcional.** Com campos
 * opcionais, uma avaliação sem disciplina e uma aula com fiscal seriam **válidas** — o esquema
 * aceitaria combinações que o banco recusa, e a recusa chegaria como `23514` em vez de frase. A
 * união faz o compilador e o `safeParse` concordarem com os `CHECK` do PR B.
 *
 * ⚠️ **O CONTRATO DO ÉPICO 12 É ESTE TIPO.** O motor de prévia vai produzir `Bloco[]` por função
 * pura e chamar a **mesma** `lancar()`; nada aqui pode depender de formulário.
 */
import { z } from "zod";

import { TA_MAXIMO } from "@/lib/dominio/dsa/horario-do-bloco";

/** `aaaa-mm-dd`. ⚠️ **O formato do banco e da URL não muda** (restrição de Bernardo). */
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "A data precisa estar no formato AAAA-MM-DD.");

const uuid = z.string().uuid("Identificador inválido.");

/**
 * O Tempo de Aula inicial.
 *
 * ⚠️ **O TETO É `TA_MAXIMO`, LIDO DO DOMÍNIO — e ele vale 12 porque o `CHECK` do banco vale 12**
 * (`reg_aula_ta_valido`, medido). Escrever `12` aqui faria dois números para a mesma regra, e o dia
 * em que o `CHECK` mudasse a tela recusaria o que o banco aceita.
 */
const ta = z
  .number()
  .int("O Tempo de Aula é um número inteiro.")
  .min(1, "O Tempo de Aula começa em 1.")
  .max(TA_MAXIMO, `O Tempo de Aula vai até ${TA_MAXIMO}.`);

const tempos = z
  .number()
  .int("A quantidade de tempos é um número inteiro.")
  .min(1, "O bloco tem ao menos um tempo.")
  .max(TA_MAXIMO, `O bloco vai até ${TA_MAXIMO} tempos.`);

/** Texto que, vazio, é **ausência** e não string vazia — a convenção do banco. */
const textoOuNulo = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

const comum = {
  turmaId: uuid,
  cursoId: uuid,
  data,
  taInicial: ta,
  tempos,
  local: textoOuNulo,
};

/**
 * A aula (`RF-DSA-04`, `Q-1`, `D-DSA-1`).
 *
 * ⚠️ **UE **OU** DISCIPLINA-COM-TÓPICO, nunca as duas — e o esquema diz o MESMO que os três
 * `CHECK` do banco.** Sem isto, a tela mandaria as duas e o banco recusaria com `23514`: a pessoa
 * veria *"violação de restrição"* em vez de *"informe a unidade de ensino ou a disciplina"*.
 *
 * ⚠️ **SEM UE, EM QUALQUER DISCIPLINA, DESDE A `D-DSA-1`** *(decisão de Bernardo Villas Boas,
 * 08/10/2026)*. Até ali o caminho sem UE valia só para a disciplina isenta da `Q-1`
 * (`app.disciplina_sem_ue`), e o esquema carregava um `disciplinaSemUe` vindo da tela para saber
 * quando aceitar. A isenção virou regra geral, o campo saiu, e o que sobra é o que o banco confere:
 * sem UE, a aula aponta a disciplina **e** traz o tópico. A UE continua sendo o caminho que alimenta
 * o controle por UE — a tela avisa quando ela falta (`RN-DEG-02`: alerta, não bloqueio).
 */
const aula = z
  .object({
    tipo: z.literal("aula"),
    ...comum,
    unidadeEnsinoId: uuid.nullable(),
    disciplinaId: uuid.nullable(),
    conteudo: textoOuNulo,
    tecnica: textoOuNulo,
    /* ⚠️ Campo vazio chega como texto vazio: a frase diz o que escolher, e não "identificador". */
    instrutorId: z.string().uuid("Escolha quem ministra a aula."),
  })
  .superRefine((v, ctx) => {
    const temUe = v.unidadeEnsinoId !== null;
    const temDisciplina = v.disciplinaId !== null;
    if (temUe && temDisciplina) {
      ctx.addIssue({
        code: "custom",
        path: ["unidadeEnsinoId"],
        message: "Informe a unidade de ensino ou a disciplina, não as duas.",
      });
      return;
    }
    if (!temUe && !temDisciplina) {
      ctx.addIssue({
        code: "custom",
        path: ["disciplinaId"],
        message: "Escolha a disciplina da aula.",
      });
      return;
    }
    /* Sem UE, o tópico é o único lugar que diz o que foi dado (`Q-1`, `D-DSA-1`). */
    if (temDisciplina && (v.conteudo === null || v.conteudo.trim() === "")) {
      ctx.addIssue({
        code: "custom",
        path: ["conteudo"],
        message: "Aula sem unidade de ensino precisa do tópico escrito.",
      });
    }
  });

/**
 * A avaliação, com o fiscal **interno ou externo** (`RF-AVAL-04`, `RF-AVAL-06`).
 *
 * ⚠️ **OS CAMPOS DO FISCAL SÃO INLINE, E NÃO UMA INTERSEÇÃO — e a primeira versão usava `.and()`.**
 * `z.discriminatedUnion` exige que cada membro seja um objeto **discriminável**, e uma interseção
 * não expõe o discriminador: o `tsc` reprovou com *"Type 'undefined' is not assignable to type
 * 'PropValues'"*, que não diz nada sobre fiscal. Compor por `.and()` é mais elegante e **não
 * funciona aqui**.
 *
 * ⚠️ O desenho fiscal interno × externo é o que `avaliacoes` já tem no banco (`fiscal_id` ×
 * `nome_fiscal_externo`): é o que permite registrar quem fiscalizou sem inventar cadastro.
 */
const avaliacao = z
  .object({
    tipo: z.literal("avaliacao"),
    ...comum,
    disciplinaId: z.string().uuid("Escolha a disciplina da avaliação."),
    tipoAvaliacao: z.string().trim().min(1, "Escolha o tipo da avaliação."),
    instrutorId: z.string().uuid("Escolha o responsável pela avaliação."),
    conteudo: textoOuNulo,
    tecnica: textoOuNulo,
    fiscalId: uuid.nullable(),
    nomeFiscalExterno: textoOuNulo,
  })
  .superRefine((v, ctx) => {
    if (v.fiscalId !== null && v.nomeFiscalExterno !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["nomeFiscalExterno"],
        message: "Escolha um fiscal do cadastro ou escreva o nome de fora, não os dois.",
      });
    }
  });

/**
 * A vista de prova (`RF-AVAL-05`, `RN-AVAL-02`).
 *
 * ⚠️ **ELA NÃO É UM FATO NOVO: é a segunda data do MESMO fato.** `avaliacoes` guarda aplicação e
 * vista na mesma linha (`RN-AVAL-02`), então a vista chega com o `avaliacaoId` e só posiciona as
 * colunas `*_vista`. Criar outra linha faria a CHD contar duas vezes.
 */
const vistaProva = z.object({
  tipo: z.literal("vista_prova"),
  avaliacaoId: z.string().uuid("Escolha a avaliação desta vista."),
  turmaId: uuid,
  data,
  taInicial: ta,
  tempos,
  local: textoOuNulo,
});

/** As quatro categorias normativas, como o ENUM do banco as escreve. */
export const CATEGORIAS_NAO_LETIVAS = ["AEC", "TAD", "TR", "Estudo_Individual"] as const;

const atividade = z
  .object({
    tipo: z.literal("atividade"),
    turmaId: uuid.nullable(),
    data,
    taInicial: ta,
    tempos,
    local: textoOuNulo,
    categoria: z.enum(CATEGORIAS_NAO_LETIVAS),
    /* O subtipo vem da lista administrável — **nunca** sigla de duas letras digitada (`P-1.3`). */
    subtipo: z.string().trim().min(1, "Escolha o subtipo da atividade."),
    descricao: z.string().trim().min(1, "Escreva o que é a atividade."),
    instrutorId: uuid.nullable(),
    responsavelExterno: textoOuNulo,
    /*
     * ⚠️ **A DISCIPLINA DA AEC É OPCIONAL, E SÓ DA AEC** (item 1b do comando de 08/10/2026,
     * autorizado por Bernardo Villas Boas). O banco impõe as três condições pelo `CHECK`
     * `ativ_disciplina_so_aec_da_turma`; o esquema as repete para a recusa chegar como frase.
     */
    disciplinaId: uuid.nullable().default(null),
  })
  .superRefine((v, ctx) => {
    if (v.disciplinaId !== null && v.categoria !== "AEC") {
      ctx.addIssue({
        code: "custom",
        path: ["disciplinaId"],
        message: "Só a AEC leva disciplina.",
      });
    }
    if (v.disciplinaId !== null && v.turmaId === null) {
      ctx.addIssue({
        code: "custom",
        path: ["disciplinaId"],
        message: "Atividade de todas as turmas não leva disciplina.",
      });
    }
    if (v.instrutorId !== null && v.responsavelExterno !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["responsavelExterno"],
        message: "Escolha um instrutor do cadastro ou escreva o responsável de fora, não os dois.",
      });
    }
    /*
     * ⚠️ **ESTUDO INDIVIDUAL É SEMPRE DE TURMA** (`V-5`): o banco tem o `CHECK`
     * `ativ_estudo_individual_de_turma` desde o PR B, e o esquema o repete para a recusa chegar
     * como frase em vez de `23514`.
     */
    if (v.categoria === "Estudo_Individual" && v.turmaId === null) {
      ctx.addIssue({
        code: "custom",
        path: ["turmaId"],
        message: "Estudo Individual é sempre de uma turma.",
      });
    }
  });

export const esquemaDoBloco = z.discriminatedUnion("tipo", [
  aula,
  avaliacao,
  vistaProva,
  atividade,
]);

export type Bloco = z.infer<typeof esquemaDoBloco>;

/** O Estudo Individual da semana inteira, em um clique (`Q-7`). */
export const esquemaDoEstudoIndividualDaSemana = z.object({
  turmaId: uuid,
  ano: z.number().int().min(2020).max(2099),
  semana: z.number().int().min(1).max(53),
});

/**
 * A ORIGEM de um fato da grade — a tabela em que ele vive.
 *
 * ⚠️ **ELA É PARÂMETRO DE TODAS AS TRÊS AÇÕES DO PR 4 (mover, editar, excluir), e não dedução.**
 * O `fatoId` é um `uuid` e **não diz** de que tabela veio: `registros_aula`, `avaliacoes` e
 * `atividades_nao_letivas` são três tabelas, e a vista de prova é a **mesma linha** da avaliação
 * com outras quatro colunas (`RN-AVAL-02`). Procurar o id nas três por tentativa custaria três
 * consultas e, pior, daria o veredito errado no dia em que dois ids coincidissem. A grade **já
 * sabe** a origem — ela vem de `vw_ocupacao_ta` — e a passa adiante.
 */
export const ORIGENS_DO_FATO = [
  "aula",
  "avaliacao",
  "vista_prova",
  "atividade_nao_letiva",
] as const;

const origem = z.enum(ORIGENS_DO_FATO, {
  message: "Origem do lançamento desconhecida.",
});

export type OrigemDoFatoValidada = (typeof ORIGENS_DO_FATO)[number];

/**
 * **Mover** um fato: o mesmo registro, em outro dia e/ou outro Tempo de Aula (`RF-DSA-07`,
 * `FR-030`, critério **7**).
 *
 * > *"Mover é `UPDATE` do mesmo registro, numa transação, preservando a auditoria."*
 * > — `spec.md` §3, história **H5**
 *
 * ⚠️ **`tempos` É OPCIONAL, E A AUSÊNCIA SIGNIFICA «não mexa nisso».** Mover é trocar de lugar, não
 * de tamanho: mandar o tamanho sempre obrigaria a tela a reenviá-lo, e um valor errado ali
 * **encolheria o bloco em silêncio** no meio de um arrastar-e-soltar. Quem muda o tamanho é
 * `editar`.
 *
 * ⚠️ **`unidadeEnsinoId` EXISTE AQUI POR CAUSA DA SEGUNDA METADE DA `Q-1`** (`FR-028`): a catraca
 * `reg_aula_ue_so_nula_no_historico` aceita UE nula **só em linha migrada e NUNCA EDITADA**. Mover
 * é editar — o gatilho carimba `editado_em` —, então a linha histórica sem UE **deixa de passar** no
 * `CHECK` no instante em que se move. A tela pede a UE **no mesmo ato**; sem ela, a ação recusa com
 * a frase da catraca em vez de deixar o banco responder `23514`.
 */
export const esquemaDoMovimento = z.object({
  fatoId: uuid,
  origem,
  data,
  taInicial: ta,
  tempos: tempos.optional(),
  unidadeEnsinoId: uuid.nullable().default(null),
});

export type Movimento = z.infer<typeof esquemaDoMovimento>;

/**
 * **Editar** um fato — e só o que a grade mostra (`FR-029`, `SC-012`).
 *
 * ⚠️ **O QUE ELE NÃO TOCA É O QUE IMPORTA: O CATÁLOGO** (`SC-012`). O `D-4` da planilha é
 * exatamente isso — *"instrutor, local e técnica são atributo DO ITEM do catálogo, não do
 * lançamento: trocar o instrutor de uma UE reescreve todo DSA passado"*. Aqui cada campo é **da
 * linha**, e editar um lançamento de março não muda nenhum outro.
 *
 * ⚠️ **TODO CAMPO É OPCIONAL, e `undefined` é «não mandou».** `null` é valor — *"apague o local"* —,
 * e um esquema que confundisse os dois **apagaria o que a tela não enviou**. É a mesma distinção que
 * derrubou o vínculo de instrutor na spec 011: um campo fora da tela mandando `null` apagava o
 * vínculo existente a cada gravação, e nenhuma tela mostrava isso na hora.
 */
export const esquemaDaEdicao = z.object({
  fatoId: uuid,
  origem,
  tempos: tempos.optional(),
  local: textoOuNulo.optional(),
  conteudo: textoOuNulo.optional(),
  tecnica: textoOuNulo.optional(),
  instrutorId: uuid.nullable().optional(),
  unidadeEnsinoId: uuid.nullable().optional(),
});

export type Edicao = z.infer<typeof esquemaDaEdicao>;

/**
 * **Excluir** um fato — e a exclusão é **lógica** (regra 4, `FR-031`).
 *
 * > *"Nada é apagado. Exclusão é LÓGICA (`status = 'inativo'`). Nenhuma tabela tem policy
 * > `FOR DELETE`, e isso é regra de negócio, não lacuna."*
 * > — `CLAUDE.md`, regra inviolável 4
 *
 * ⚠️ **NÃO HÁ `codigoDeConfirmacao` AQUI, e a diferença com a exclusão de instrutor é de NATUREZA.**
 * Lá a exclusão é **permanente** e exige o código digitado, porque é irreversível; aqui ela é
 * `status = 'inativo'`, e o lançamento volta reativando. A confirmação é a da **tela**, descrevendo
 * o efeito (`RNF-USA-03`) — pedir um código para uma exclusão reversível treinaria a pessoa a
 * digitar código sem ler.
 */
export const esquemaDaExclusao = z.object({
  fatoId: uuid,
  origem,
});

export type Exclusao = z.infer<typeof esquemaDaExclusao>;
