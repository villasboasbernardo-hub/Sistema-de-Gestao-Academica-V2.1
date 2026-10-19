/**
 * D-COR-4 e D-COR-5 — O HISTÓRICO DA SITUAÇÃO DA TURMA, na ficha.
 *
 * > *"Status da turma com observação em toda troca (cancelada, concluída, arquivada), no diálogo «Trocar situação»
 * > que já existe; visível na ficha."* — pedido de Bernardo Villas Boas, 19/10/2026 (D-COR-4)
 *
 * ⚠️ **DUAS TRILHAS, UMA LISTA**: a troca de situação (`turma_trocas_de_situacao`, anotada pelo gatilho) e o
 *    arquivamento (`turma_arquivamentos`) moram em tabelas próprias — arquivar não é situação (D-COR-5) —, e a ficha
 *    as mostra juntas, o mais recente primeiro. No mesmo instante, o arquivamento vem antes: arquivar fecha.
 * ⚠️ **O AUTOR SEGUE O PADRÃO DA FICHA** (C-22): o nome para quem lê `usuarios`; *"outra conta"* para os demais
 *    (a leitura volta vazia, gotcha 4); *"sem sessão"* para a troca feita sem sessão (ETL, `psql`).
 * ⚠️ **TypeScript puro** (Princípio II).
 */
import { ROTULO_DO_STATUS_DE_TURMA } from "./seletor-de-turma";

export type TrocaDeSituacao = {
  readonly ordem: number;
  readonly anterior: string;
  readonly nova: string;
  readonly observacao: string | null;
  readonly autorId: string | null;
  readonly em: string;
};

export type EventoDeArquivo = {
  readonly ordem: number;
  readonly acao: "arquivar" | "desarquivar";
  readonly observacao: string | null;
  readonly autorId: string | null;
  readonly em: string;
};

export type EventoDoHistorico = {
  readonly chave: string;
  /** *"Ativa → Concluída"*, *"Arquivada"* ou *"Desarquivada"*. */
  readonly rotulo: string;
  readonly autor: string;
  readonly em: string;
  readonly observacao: string | null;
};

const rotulo = (s: string) => ROTULO_DO_STATUS_DE_TURMA[s] ?? s;

function autor(id: string | null, nomes: ReadonlyMap<string, string>): string {
  if (id === null) return "sem sessão";
  return nomes.get(id) ?? "outra conta";
}

export function historicoDaTurma(entrada: {
  readonly trocas: readonly TrocaDeSituacao[];
  readonly arquivamentos: readonly EventoDeArquivo[];
  /** `auth_user_id` → nome, só do que a pessoa lê em `usuarios`. */
  readonly nomes: ReadonlyMap<string, string>;
}): EventoDoHistorico[] {
  const { trocas, arquivamentos, nomes } = entrada;
  const eventos = [
    ...arquivamentos.map((a) => ({
      peso: 1,
      ordem: a.ordem,
      evento: {
        chave: `arquivo-${a.ordem}`,
        rotulo: a.acao === "arquivar" ? "Arquivada" : "Desarquivada",
        autor: autor(a.autorId, nomes),
        em: a.em,
        observacao: a.observacao,
      },
    })),
    ...trocas.map((t) => ({
      peso: 0,
      ordem: t.ordem,
      evento: {
        chave: `troca-${t.ordem}`,
        rotulo: `${rotulo(t.anterior)} → ${rotulo(t.nova)}`,
        autor: autor(t.autorId, nomes),
        em: t.em,
        observacao: t.observacao,
      },
    })),
  ];
  return eventos
    .sort((a, b) =>
      a.evento.em !== b.evento.em
        ? a.evento.em < b.evento.em
          ? 1
          : -1
        : b.peso - a.peso || b.ordem - a.ordem,
    )
    .map((e) => e.evento);
}
