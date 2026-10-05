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
 * A aula (`RF-DSA-04`, `Q-1`).
 *
 * ⚠️ **UE **OU** DISCIPLINA-COM-TÓPICO, nunca as duas — e o esquema diz o MESMO que os três
 * `CHECK` do PR B.** Sem isto, a tela mandaria as duas e o banco recusaria com `23514`: a pessoa
 * veria *"violação de restrição"* em vez de *"informe a unidade de ensino ou a disciplina"*.
 *
 * ⚠️ **`disciplinaSemUe` CHEGA DA TELA PORQUE QUEM DECIDE É O BANCO.** A isenção vale só para curso
 * por competências ou disciplina marcada `sem_unidades_ensino`, e isso é `app.disciplina_sem_ue` —
 * a tela **lê** essa marca para oferecer o modo, e o banco é quem **impõe**. O campo aqui serve
 * para o esquema exigir o tópico no modo certo; ele **não** é a autoridade.
 */
const aula = z
  .object({
    tipo: z.literal("aula"),
    ...comum,
    unidadeEnsinoId: uuid.nullable(),
    disciplinaId: uuid.nullable(),
    disciplinaSemUe: z.boolean().default(false),
    conteudo: textoOuNulo,
    tecnica: textoOuNulo,
    instrutorId: uuid,
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
        path: ["unidadeEnsinoId"],
        message: "Escolha a unidade de ensino da aula.",
      });
      return;
    }
    if (temDisciplina && !v.disciplinaSemUe) {
      ctx.addIssue({
        code: "custom",
        path: ["unidadeEnsinoId"],
        message: "Esta disciplina tem unidades de ensino: escolha uma.",
      });
      return;
    }
    /* Sem UE, o tópico é o único lugar que diz o que foi dado (`Q-1`). */
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
    disciplinaId: uuid,
    tipoAvaliacao: z.string().trim().min(1, "Escolha o tipo da avaliação."),
    instrutorId: uuid,
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
  avaliacaoId: uuid,
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
  })
  .superRefine((v, ctx) => {
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
