/**
 * O PAINEL DE TURMAS — Bloco 2, item 4 (spec 017, FR-005).
 *
 * > *"Dashboard de turmas, no molde do de instrutores: total, canceladas, concluídas, em andamento, iniciando nos
 * > próximos 30 dias, e alertas do que falta (data, instrutor, conflito)."* — pedido de Bernardo Villas Boas,
 * > 16/10/2026
 *
 * ⚠️ **DO RECORTE** (C-14): os números são das turmas que a lista mostra — o filtro muda os dois juntos. A arquivada
 *    fica fora sem *Mostrar arquivadas* (FR-005.3).
 * ⚠️ **"EM ANDAMENTO" É A SITUAÇÃO ATIVA; "INICIANDO" É [hoje, hoje + N], NÃO CANCELADA** (C-15), com N de
 *    `config_parametros` (`turmas.aviso_inicio_dias`, regra 8).
 * ⚠️ **O CONFLITO É A `RN-CONF-01`, PELO PONTO ÚNICO** (`detectarConflitos`, C-16 e C-23): só de PESSOA, inclusive
 *    dentro da própria turma; a sala fica fora do painel. Para nomear a outra turma, a regra é chamada par a par —
 *    ela diz SE há conflito; quem é o par, diz a chamada.
 * ⚠️ **LEITURA QUE FALHOU É "NÃO PUDE LER"** (FR-005.4, gotcha 4): `null` na entrada vira o tipo em `naoLidos`,
 *    nunca zero avisos.
 * ⚠️ **UM ANO SÓ, E O CARD *PLANEJADAS*** *(ajuste da conferência do PR #73, Bernardo Villas Boas, 19/10/2026)*:
 *    > *"O PAINEL MOSTRA UM ANO SÓ: por padrão o ano letivo vigente; um seletor de ano (na URL) troca. Turmas planejadas
 *    > do ano seguinte não entram nos números do ano vigente."* O ano é o `ano` da URL — o mesmo filtro da lista —, e
 *    vazio é o ano de hoje em São Paulo (`anoDoPainel`). Tudo o que o painel conta, indicadores e avisos, é desse ano.
 * ⚠️ **TypeScript puro** (Princípio II).
 */
import { datasDaSemanaIso, semanaIsoDe } from "./carga-semanal";
import { detectarConflitos, type OcupacaoDeTa, type OcupacaoPropria } from "./dsa/conflitos";

export type TurmaDoPainel = {
  readonly id: string;
  readonly codigo: string;
  /** O ano letivo da turma (`turmas.ano_letivo`). */
  readonly ano: number;
  readonly status: string;
  readonly dataInicio: string | null;
  readonly dataTermino: string | null;
  readonly arquivada: boolean;
};

/** Uma linha ATIVA da turma, e se ela tem instrutor ativo. */
export type LinhaDoPainel = { readonly turmaId: string; readonly temInstrutor: boolean };

/** A ocupação de TA da semana; `turmaId` nulo = de uma turma que a pessoa não alcança (anônima). */
export type OcupacaoDoPainel = OcupacaoDeTa & {
  readonly turmaId: string | null;
  /** Identifica o lançamento (origem + fato + sessão) — o próprio bloco não conflita consigo. */
  readonly chave: string;
};

export type IndicadoresDeTurmas = {
  readonly total: number;
  readonly planejadas: number;
  readonly emAndamento: number;
  readonly concluidas: number;
  readonly canceladas: number;
  /** `null` = o parâmetro `turmas.aviso_inicio_dias` não foi lido: o número sai «—», nunca de uma constante (regra 8). */
  readonly iniciando: number | null;
};

export type TipoDeAvisoDeTurma = "sem_janela" | "sem_instrutor" | "conflito";

export type AvisoDeTurma = {
  readonly tipo: TipoDeAvisoDeTurma;
  readonly turmaCodigo: string;
  readonly detalhe: string;
};

export const TITULO_DO_AVISO: Readonly<Record<TipoDeAvisoDeTurma, string>> = {
  sem_janela: "Sem janela de datas",
  sem_instrutor: "Disciplina sem instrutor",
  conflito: "Conflito no DSA desta semana",
};

const EM_OFERTA = new Set(["planejada", "ativa"]);
const DIA_MS = 86_400_000;

function maisDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, d) + dias * DIA_MS).toISOString().slice(0, 10);
}

/** A semana corrente, de segunda a sábado, a partir do dia de São Paulo (quem chama passa `hojeNaCiaara()`). */
export function semanaDoPainel(hoje: string): { readonly de: string; readonly ate: string } {
  const s = semanaIsoDe(hoje);
  const dias = s === null ? [] : datasDaSemanaIso(s.ano, s.numero);
  return { de: dias[0] ?? hoje, ate: dias[5] ?? hoje };
}

const propria = (o: OcupacaoDoPainel): OcupacaoPropria => ({ ...o, fatoId: o.chave });

/**
 * O ano do painel: o `ano` da URL quando é um ano (quatro dígitos), senão o ano letivo VIGENTE — o de hoje em São
 * Paulo (quem chama passa `hojeNaCiaara()`; nada aqui lê relógio).
 */
export function anoDoPainel(parametro: string, hoje: string): number {
  return /^\d{4}$/.test(parametro.trim()) ? Number(parametro.trim()) : Number(hoje.slice(0, 4));
}

/** Os anos do seletor: os das turmas e o vigente, do mais novo ao mais velho, sem repetir. */
export function anosDoSeletor(anos: readonly number[], vigente: number): readonly number[] {
  return [...new Set([...anos, vigente])].sort((a, b) => b - a);
}

export function painelDeTurmas(entrada: {
  readonly turmas: readonly TurmaDoPainel[];
  /** O ano letivo do painel (`anoDoPainel`): só as turmas dele entram nos números e nos avisos. */
  readonly ano: number;
  readonly mostrarArquivadas: boolean;
  readonly hoje: string;
  /** `turmas.aviso_inicio_dias`; `null` = não lido. */
  readonly diasDeAviso: number | null;
  /** `null` = a leitura falhou. */
  readonly linhas: readonly LinhaDoPainel[] | null;
  /** `null` = a leitura falhou. */
  readonly ocupacao: readonly OcupacaoDoPainel[] | null;
}): {
  readonly indicadores: IndicadoresDeTurmas;
  readonly avisos: readonly AvisoDeTurma[];
  readonly naoLidos: readonly TipoDeAvisoDeTurma[];
} {
  const { hoje, diasDeAviso, linhas, ocupacao } = entrada;
  const doAno = entrada.turmas.filter((t) => t.ano === entrada.ano);
  const turmas = entrada.mostrarArquivadas ? doAno : doAno.filter((t) => !t.arquivada);
  const limite = diasDeAviso === null ? null : maisDias(hoje, diasDeAviso);

  const indicadores: IndicadoresDeTurmas = {
    total: turmas.length,
    planejadas: turmas.filter((t) => t.status === "planejada").length,
    emAndamento: turmas.filter((t) => t.status === "ativa").length,
    concluidas: turmas.filter((t) => t.status === "concluida").length,
    canceladas: turmas.filter((t) => t.status === "cancelada").length,
    iniciando:
      limite === null
        ? null
        : turmas.filter(
            (t) =>
              t.status !== "cancelada" &&
              t.dataInicio !== null &&
              t.dataInicio >= hoje &&
              t.dataInicio <= limite,
          ).length,
  };

  const avisos: AvisoDeTurma[] = [];
  const naoLidos: TipoDeAvisoDeTurma[] = [];

  for (const t of turmas) {
    if (EM_OFERTA.has(t.status) && (t.dataInicio === null || t.dataTermino === null)) {
      avisos.push({
        tipo: "sem_janela",
        turmaCodigo: t.codigo,
        detalhe: "início ou término sem data",
      });
    }
  }

  if (linhas === null) naoLidos.push("sem_instrutor");
  else {
    for (const t of turmas) {
      if (!EM_OFERTA.has(t.status)) continue;
      const n = linhas.filter((l) => l.turmaId === t.id && !l.temInstrutor).length;
      if (n > 0)
        avisos.push({
          tipo: "sem_instrutor",
          turmaCodigo: t.codigo,
          detalhe: `${n} ${n === 1 ? "disciplina" : "disciplinas"}`,
        });
    }
  }

  if (ocupacao === null) naoLidos.push("conflito");
  else {
    const codigoDe = new Map(turmas.map((t) => [t.id, t.codigo]));
    const daTurma = (id: string | null) => ocupacao.filter((o) => o.turmaId === id);
    const comPessoa = (marcas: ReturnType<typeof detectarConflitos>) =>
      [...marcas.values()].some((m) => m.conflito !== null);
    /*
     * ⚠️ **CONTRA OUTRA TURMA, UM BLOCO DE CADA VEZ**: `detectarConflitos` também compara os blocos da própria turma
     *    entre si, e com a lista inteira o conflito de dentro apareceria como "com" toda outra turma. Sozinho, o
     *    bloco só pode conflitar com o de fora.
     */
    const comFora = (meus: readonly OcupacaoPropria[], alheios: readonly OcupacaoDeTa[]) =>
      meus.some((m) => comPessoa(detectarConflitos([m], alheios)));
    for (const t of turmas) {
      const meus = daTurma(t.id).map(propria);
      if (meus.length === 0) continue;
      const com: string[] = [];
      for (const outro of turmas) {
        if (outro.id === t.id) continue;
        if (comFora(meus, daTurma(outro.id))) com.push(outro.codigo);
      }
      /* As turmas que a pessoa alcança mas o recorte não mostra entram como "outra turma", como as anônimas. */
      const escondidas = ocupacao.filter((o) => o.turmaId === null || !codigoDe.has(o.turmaId));
      const partes = com.map((c) => `com ${c}`);
      if (comFora(meus, escondidas)) partes.push("com outra turma");
      if (comPessoa(detectarConflitos(meus, []))) partes.push("dentro da própria turma");
      if (partes.length > 0)
        avisos.push({ tipo: "conflito", turmaCodigo: t.codigo, detalhe: partes.join(" · ") });
    }
  }

  return { indicadores, avisos, naoLidos };
}
