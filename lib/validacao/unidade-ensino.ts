/**
 * Validação das Server Actions de **Unidade de Ensino** (`FR-060` a `FR-063`).
 *
 * ⚠️ **A SOMA CONTRA A CH DA DISCIPLINA NÃO É CONFERIDA AQUI, E NEM PODERIA SER** (`FR-062`). Ela
 * **avisa**, não bloqueia: uma UE sozinha nunca fecha a CH, e recusar a primeira impediria de
 * construir qualquer currículo. Quem avisa é `lib/dominio/soma-das-unidades.ts`, na tela.
 *
 * ⚠️ **`numero_ue` É TEXTO, e isso não é descuido.** Os currículos da DEnsM usam `1`, `2`, `2.1`,
 * `I`, `II` — numeração romana e decimal convivem nas 587 unidades extraídas. Forçá-lo a inteiro
 * quebraria a carga e obrigaria a inventar uma tradução que o documento original não tem.
 */
import { z } from "zod";

const textoObrigatorio = (oQue: string, maximo = 300) =>
  z
    .string({ error: `Informe ${oQue}.` })
    .trim()
    .min(1, `Informe ${oQue}.`)
    .max(maximo, `${oQue} passou de ${maximo} caracteres.`);

export const esquemaDeUnidadeEnsino = z.object({
  disciplinaId: z.uuid({ error: "Disciplina inválida." }),
  numeroUe: textoObrigatorio("o número da unidade", 20),
  topico: textoObrigatorio("o tópico da unidade"),
  chPrevistaTempos: z
    .number({ error: "Informe a carga horária em tempos." })
    .int("A carga horária é em tempos inteiros.")
    .positive("A carga horária tem de ser maior que zero."),
});

export const esquemaDeEdicaoDeUnidade = esquemaDeUnidadeEnsino
  .omit({ disciplinaId: true })
  .extend({ unidadeId: z.uuid({ error: "Unidade de ensino inválida." }) });

export const esquemaDeSituacaoDaUnidade = z.object({
  unidadeId: z.uuid({ error: "Unidade de ensino inválida." }),
});

export const esquemaDeExclusaoDeUnidade = z.object({
  unidadeId: z.uuid({ error: "Unidade de ensino inválida." }),
  codigoConfirmacao: textoObrigatorio("o código para confirmar", 60),
});

export type UnidadeParaGravar = z.infer<typeof esquemaDeUnidadeEnsino>;
