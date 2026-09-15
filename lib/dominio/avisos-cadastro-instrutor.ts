/**
 * O quadro de avisos de qualidade de cadastro (`RF-INSTR-09`, `FR-027` da spec 006).
 *
 * > *"O sistema deve exibir um quadro de avisos de qualidade de cadastro (ex.: instrutores sem NIP ou
 * > com campos obrigatórios pendentes)."* — `RF-INSTR-09`, **[PRESERVADO]**
 *
 * > *"A lista de avisos é aberta e extensível, não um conjunto fechado. Ela começa pelos dois
 * > exemplos do `RF-INSTR-09` — instrutor sem NIP e campo obrigatório pendente — e aceita aviso novo
 * > sem mudar o tipo que a descreve."* — `FR-027`, decisão de Bernardo Villas Boas, 15/09/2026
 *
 * ⚠️ A LISTA É DADO, NÃO `enum`. Cada aviso é uma regra; `avisosDoCadastro` avalia a lista que
 * receber. A chave é `string`, e não uma união de literais: fechar o tipo faria cada aviso novo mudar
 * o contrato, que é o que a decisão recusou.
 *
 * ⚠️ AVISO NÃO BLOQUEIA (`RN-DEG-02`). O resultado é só lista de quem aparece em cada aviso; não há
 * campo que uma tela possa usar para desabilitar gravação.
 *
 * ⚠️ O AVISO DE OBRIGATÓRIO PENDENTE HOJE NÃO ENCONTRA NINGUÉM — os cinco são `NOT NULL` com `CHECK`
 * de branco. Ele fica como defesa e como o exemplo que a regra nomeia; ver o contrato
 * `carga-horaria-e-alertas.md`.
 */

export type InstrutorParaAvisos = {
  readonly id: string;
  readonly nip: string | null;
  readonly pg: string | null;
  readonly especialidade: string | null;
  readonly nomeCompleto: string | null;
  readonly categoria: string | null;
  readonly om: string | null;
};

export type RegraDeAviso<T extends InstrutorParaAvisos = InstrutorParaAvisos> = {
  readonly chave: string;
  readonly titulo: string;
  readonly seAplica: (instrutor: T) => boolean;
};

export type AvisoDeCadastro<T> = {
  readonly chave: string;
  readonly titulo: string;
  readonly instrutores: readonly T[];
};

const vazio = (texto: string | null): boolean => texto === null || texto.trim() === "";

/** Os dois avisos com que a lista começa, na ordem do `RF-INSTR-09`. */
export const AVISOS_INICIAIS: readonly RegraDeAviso[] = [
  {
    chave: "sem-nip",
    titulo: "Instrutor sem NIP",
    seAplica: (i) => vazio(i.nip),
  },
  {
    chave: "obrigatorio-pendente",
    titulo: "Campo obrigatório pendente",
    seAplica: (i) =>
      [i.pg, i.especialidade, i.nomeCompleto, i.categoria, i.om].some((campo) => vazio(campo)),
  },
];

/**
 * Avalia a lista de regras sobre os instrutores recebidos.
 *
 * ⚠️ TODO AVISO DA LISTA APARECE NO RESULTADO, inclusive o que não encontrou ninguém. Quem desenha
 * decide como mostrar a lista vazia; sumir com a regra faria o quadro parecer que ela não existe.
 * A ordem dos instrutores é a de chegada — a listagem já os entrega em antiguidade.
 */
export function avisosDoCadastro<T extends InstrutorParaAvisos>(
  instrutores: readonly T[],
  regras: readonly RegraDeAviso<T>[],
): readonly AvisoDeCadastro<T>[] {
  return regras.map((regra) => ({
    chave: regra.chave,
    titulo: regra.titulo,
    instrutores: instrutores.filter((i) => regra.seAplica(i)),
  }));
}
