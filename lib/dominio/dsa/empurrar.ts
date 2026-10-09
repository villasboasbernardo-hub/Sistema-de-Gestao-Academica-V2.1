/**
 * `D-DSA-3` — o bloco que cresce, é lançado ou movido sobre outro lançamento da MESMA turma no mesmo
 * dia EMPURRA os seguintes para depois dele, em cascata.
 *
 * > *"Quando um bloco cresce ou é lançado sobre outro lançamento da MESMA turma no mesmo dia, o
 * > sistema EMPURRA o(s) lançamento(s) seguinte(s) para depois dele, em cascata, mantendo a ordem e
 * > a duração de cada um, e mostra um aviso dizendo o que foi empurrado e para onde. Ex.: aula A no
 * > 1º tempo (1 TA) e aula B no 2º tempo (1 TA); editar A para 2 TA → B vai para o 3º tempo. Se não
 * > couber até o último tempo do dia (regime vigente, incluindo o TA excepcional), RECUSA com a frase
 * > de quais aulas não cabem — nunca empurra para outro dia."*
 * > — Bernardo Villas Boas, 08/10/2026 (conferência do PR #40), substituindo a dúvida 1 do lote
 *
 * ⚠️ **SÓ DECIDE. QUEM GRAVA É A SERVER ACTION, E NUMA TRANSAÇÃO SÓ** (`public.gravar_lancamentos_em_transacao`):
 * ou todos movem, ou nada muda. Aqui não há banco, nem `next`, nem `react`.
 *
 * ⚠️ **"SEGUINTE" É O QUE COMEÇA NO MESMO TEMPO OU DEPOIS DO BLOCO.** O lançamento que começa ANTES e
 * é atingido — alguém pôs um bloco no meio de outro — não é seguinte: empurrá-lo para depois
 * inverteria a ordem, que a decisão manda manter. Esse caso é RECUSADO, com a frase que diz qual.
 */
import { dataParaLeitura } from "@/lib/formato/data";

/** Um lançamento da turma no dia, já posicionado. */
export type LancamentoNoDia = {
  readonly fatoId: string;
  /** Quem é, em palavras — `"I — Navegação costeira"` —, para a frase do aviso e da recusa. */
  readonly rotulo: string;
  readonly taInicial: number;
  readonly tempos: number;
};

/** O bloco que está sendo gravado: o novo (sem `fatoId`) ou o editado/movido. */
export type BlocoQueEntra = {
  readonly fatoId?: string;
  readonly taInicial: number;
  readonly tempos: number;
};

export type Empurrado = {
  readonly fatoId: string;
  readonly rotulo: string;
  readonly deTa: number;
  readonly paraTa: number;
  readonly tempos: number;
};

export type ResultadoDoEmpurrao =
  | { readonly tipo: "ok"; readonly empurrados: readonly Empurrado[] }
  | { readonly tipo: "recusa"; readonly mensagem: string };

/**
 * O último Tempo de Aula do dia: os do regime vigente **mais o excepcional** (o 9º da `RF-HOR-03.1`,
 * *"ou equivalente em outro curso"*).
 *
 * ⚠️ **SEM REGIME, O LIMITE É 12 — o `CHECK` do banco sobre o TA**, que é estrutura e não norma. Não
 * se inventa regime (`RN-DEG-01`): sem ele, a única fronteira que existe é a do banco.
 */
export function ultimoTempoDoDia(temposDoRegime: number | null): number {
  return temposDoRegime !== null && temposDoRegime > 0 ? temposDoRegime + 1 : LIMITE_DO_BANCO;
}

/** O teto estrutural de `ta_inicial`/`ta_final` (`CHECK` de 1 a 12). */
export const LIMITE_DO_BANCO = 12;

const ordinal = (n: number): string => `${n}º`;

/**
 * Decide o empurrão.
 *
 * ⚠️ **O CURSOR ANDA PELA ORDEM DE INÍCIO**: cada seguinte que começa antes do fim do anterior é
 * levado para o primeiro tempo livre depois dele, com a MESMA duração; o que já começa depois não se
 * mexe — e um vão no dia absorve a cascata, como na planilha.
 */
export function empurrarEmCascata(entrada: {
  readonly bloco: BlocoQueEntra;
  /** Os OUTROS lançamentos da turma no mesmo dia — sem o próprio bloco. */
  readonly doDia: readonly LancamentoNoDia[];
  readonly ultimoTempo: number;
  readonly data: string;
}): ResultadoDoEmpurrao {
  const { bloco, ultimoTempo } = entrada;
  const fimDoBloco = bloco.taInicial + bloco.tempos - 1;
  const outros = entrada.doDia
    .filter((l) => l.fatoId !== bloco.fatoId)
    .slice()
    .sort((a, b) => a.taInicial - b.taInicial || a.fatoId.localeCompare(b.fatoId));

  /* O que começa ANTES e é atingido não é "seguinte": recusa, nunca inverte a ordem. */
  const atingidoPorTras = outros.find(
    (l) => l.taInicial < bloco.taInicial && l.taInicial + l.tempos - 1 >= bloco.taInicial,
  );
  if (atingidoPorTras !== undefined) {
    return {
      tipo: "recusa",
      mensagem:
        `Em ${dataParaLeitura(entrada.data)}, o ${ordinal(bloco.taInicial)} tempo fica dentro de ` +
        `«${atingidoPorTras.rotulo}», que começa no ${ordinal(atingidoPorTras.taInicial)}. ` +
        "Comece o lançamento depois dele, ou mexa nele primeiro.",
    };
  }

  const empurrados: Empurrado[] = [];
  const naoCabem: string[] = [];
  let cursor = fimDoBloco + 1;
  for (const l of outros.filter((o) => o.taInicial >= bloco.taInicial)) {
    const paraTa = Math.max(l.taInicial, cursor);
    if (paraTa !== l.taInicial) {
      empurrados.push({
        fatoId: l.fatoId,
        rotulo: l.rotulo,
        deTa: l.taInicial,
        paraTa,
        tempos: l.tempos,
      });
    }
    if (paraTa + l.tempos - 1 > ultimoTempo) naoCabem.push(l.rotulo);
    cursor = paraTa + l.tempos;
  }

  if (naoCabem.length > 0) {
    return {
      tipo: "recusa",
      mensagem:
        `Não cabe em ${dataParaLeitura(entrada.data)}: empurrando os seguintes, ` +
        `${naoCabem.map((r) => `«${r}»`).join(", ")} passaria${naoCabem.length > 1 ? "m" : ""} do ` +
        `${ordinal(ultimoTempo)} tempo, o último do dia. Nada foi gravado. Diminua o bloco, ou leve ` +
        `${naoCabem.length > 1 ? "algum deles" : "esse lançamento"} para outro dia primeiro.`,
    };
  }
  return { tipo: "ok", empurrados };
}

/** O aviso do que foi empurrado, e para onde — a decisão manda dizer. */
export function avisoDoEmpurrao(empurrados: readonly Empurrado[], data: string): string | null {
  if (empurrados.length === 0) return null;
  const itens = empurrados.map(
    (e) => `«${e.rotulo}» do ${ordinal(e.deTa)} para o ${ordinal(e.paraTa)} tempo`,
  );
  return `Em ${dataParaLeitura(data)}, para abrir espaço, ${empurrados.length > 1 ? "foram empurrados" : "foi empurrado"}: ${itens.join("; ")}.`;
}
