/**
 * `FR-050` a `FR-052` — o que a linha da disciplina **sinaliza** na grade.
 *
 * ⚠️ **SINALIZA, NUNCA BLOQUEIA** (`RN-DEG-02`, regra 6 do `CLAUDE.md`). Disciplina sem instrutor e
 * disciplina começando em poucos dias são **avisos**: quem planeja o ano precisa vê-los cedo, e
 * transformá-los em impedimento mudaria a regra de negócio — a CIAARA-11 trabalha com currículo em
 * construção o ano inteiro.
 *
 * ⚠️ **O PRAZO `N` VEM DE FORA, NUNCA DE UMA CONSTANTE AQUI** (regra 8: parâmetro normativo é dado).
 * Ele mora em `disciplinas.aviso_inicio_dias`, em `config_parametros`, e a fatia (b) do banco o criou
 * justamente para isto. Um `const DIAS = 30` neste arquivo faria a mudança do prazo virar migration
 * de código, e o `FR-052` seria implementado **apenas na UI**.
 *
 * ⚠️ **O CASO QUE DISCRIMINA É O PERÍODO NULO.** A base copiada tem **121** linhas com
 * `nao_informado` — previsão ausente. Uma implementação que comparasse `null` com hoje trataria a
 * ausência como data e sinalizaria *"começa em breve"* e *"atrasada"* para 121 disciplinas de uma
 * vez, que é ruído suficiente para a pessoa desligar o aviso inteiro. Sem previsão, **não há o que
 * antecipar**: o sinal é a ausência, e é outro.
 *
 * Módulo **puro**.
 */

export type SeveridadeDoSinal = "informativo" | "atencao" | "alerta";

export type SinalDaDisciplina = {
  readonly chave: "sem_instrutor" | "inicio_proximo" | "sem_previsao";
  readonly severidade: SeveridadeDoSinal;
  readonly texto: string;
};

export type LinhaParaSinalizar = {
  /** Instrutores **ativos** atribuídos nesta turma. Zero = sem instrutor. */
  readonly instrutoresAtribuidos: number;
  /** `previsao_inicio` da disciplina, em `YYYY-MM-DD`. `null` = não informado. */
  readonly previsaoInicio: string | null;
};

/**
 * Dias inteiros de `hoje` até `data`, pelo calendário.
 *
 * ⚠️ **COMPARA DATA, NÃO INSTANTE.** As duas pontas são normalizadas para meia-noite UTC: sem isso,
 * uma disciplina que começa hoje às 07:30 daria "faltam 0 dias" de manhã e "faltam -1" à tarde, e o
 * aviso apareceria e sumiria conforme a hora em que a pessoa abrisse a tela.
 */
export function diasAte(data: string, hoje: string): number {
  // ⚠️ O mês do `Date.UTC` é base ZERO e o do ISO é base um. Sem o `- 1`, todo cálculo erra um mês —
  //    e erra de forma **consistente**, que é como ele passaria despercebido numa revisão.
  const meiaNoiteUtc = (iso: string) => {
    const [ano, mes, dia] = iso.split("-").map(Number) as [number, number, number];
    return Date.UTC(ano, mes - 1, dia);
  };
  return Math.round((meiaNoiteUtc(data) - meiaNoiteUtc(hoje)) / 86_400_000);
}

/**
 * Os sinais de uma linha da grade.
 *
 * ⚠️ **A SEVERIDADE DO "COMEÇA EM BREVE" DEPENDE DE HAVER INSTRUTOR** (`FR-051`). Começar em dez dias
 * com instrutor designado é **informação**; começar em dez dias **sem ninguém** é o problema que a
 * tela existe para mostrar. Dar o mesmo destaque aos dois faria o caso grave desaparecer no meio dos
 * outros.
 */
export function sinaisDaDisciplina(
  linha: LinhaParaSinalizar,
  avisoInicioDias: number,
  hoje: string,
): readonly SinalDaDisciplina[] {
  const sinais: SinalDaDisciplina[] = [];
  const semInstrutor = linha.instrutoresAtribuidos === 0;

  if (semInstrutor) {
    sinais.push({
      chave: "sem_instrutor",
      severidade: "alerta",
      texto: "Sem instrutor designado.",
    });
  }

  // ⚠️ **AQUI ESTÁ O CASO QUE DISCRIMINA.** Sem previsão não se calcula proximidade nenhuma: a
  //    ausência vira um sinal **próprio**, informativo, e não um "começa em breve" falso.
  if (linha.previsaoInicio === null) {
    sinais.push({
      chave: "sem_previsao",
      severidade: "informativo",
      texto: "Sem previsão de início.",
    });
    return sinais;
  }

  const faltam = diasAte(linha.previsaoInicio, hoje);
  if (faltam >= 0 && faltam <= avisoInicioDias) {
    sinais.push({
      chave: "inicio_proximo",
      severidade: semInstrutor ? "alerta" : "atencao",
      texto:
        faltam === 0
          ? semInstrutor
            ? "Começa hoje e não tem instrutor."
            : "Começa hoje."
          : semInstrutor
            ? `Começa em ${faltam} dia(s) e não tem instrutor.`
            : `Começa em ${faltam} dia(s).`,
    });
  }

  return sinais;
}

/** A severidade mais grave entre os sinais — é ela que decide o destaque da linha. */
export function severidadeDaLinha(sinais: readonly SinalDaDisciplina[]): SeveridadeDoSinal | null {
  if (sinais.some((s) => s.severidade === "alerta")) return "alerta";
  if (sinais.some((s) => s.severidade === "atencao")) return "atencao";
  if (sinais.length > 0) return "informativo";
  return null;
}
