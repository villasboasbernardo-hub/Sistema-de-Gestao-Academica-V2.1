/**
 * RA-1 (Bloco 18, spec 033) — o CATÁLOGO de tipos de atividade como a Administração o mostra e o edita (FR-001.3 e
 * FR-001.4).
 *
 * > *"Catálogo de tipos de atividade (lista do sistema, Admin edita): Palestra · Visita · APOINST/Prática · Desportiva ·
 * > Cerimônia · Monitoria · DeCAT · Reforço · Outra. Cada tipo tem classificação PADRÃO (AEC/TAD/TR), que o operador
 * > pode trocar no lançamento."* — Bernardo Villas Boas, 03/11/2026 (RA-1)
 *
 * ⚠️ **O CATÁLOGO É A LISTA `tipos_atividade` DE `config_listas`**, e mostra só os tipos DE ATIVIDADE — os que têm
 *    categoria (`categoriaPeloTipo`, o mesmo filtro do formulário do DSA). Os de uso `aula` (Aula, Avaliação, Vista…) e
 *    os sem categoria nenhuma não são atividade e não aparecem.
 * ⚠️ **SÓ AEC, TAD E TR SE EDITAM AQUI** (decisão 2 da conferência do passo 0): o Estudo Individual e o Apoio
 *    Individualizado (Monitoria, Português para Estrangeiros, BDA, BDF) aparecem SÓ PARA LER — a classificação deles
 *    fica fora da CHT e não é escolha do catálogo.
 * ⚠️ **TROCAR A CLASSIFICAÇÃO PADRÃO RECATEGORIZA OS LANÇAMENTOS ATIVOS QUE SEGUEM O TIPO** — é o gatilho de sempre
 *    (`app.recategorizar_pelo_tipo`, D-AA-3 da spec 014), que desde a M2 do Bloco 18 PULA a linha em que o operador
 *    escolheu AEC, TAD ou TR no «Conta como» — e a de turma ARQUIVADA, que fica como estava (RT-8; achado da revisão).
 *    O diálogo diz QUANTOS mudam antes de gravar; quem decide é o banco.
 * ⚠️ **A TROCA QUE TIRA O TIPO DA AEC TEM DOIS IMPEDIMENTOS** (`impedimentoDaTroca`, achados da revisão): AEC prevista
 *    ativa de currículo com o tipo, e lançamento que segue o tipo com disciplina. A ação os confere antes de gravar, e o
 *    diálogo os avisa.
 * ⚠️ **NÃO HÁ EXCLUSÃO** (regra 4; nenhuma exceção nominal cobre `tipos_atividade`): o ícone fica indisponível, com o
 *    motivo — *"tem registros"* quando há lançamento, *"sem exceção à regra 4"* quando não há.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
import {
  aceitaContaComo,
  categoriaPeloTipo,
  contaComoDoBanco,
  ROTULO_DA_CATEGORIA_DE_ATIVIDADE,
  type CategoriaDeAtividade,
  type TipoDeAtividade,
} from "@/lib/dominio/categoria-pelo-tipo";
import { dataParaLeitura } from "@/lib/formato/data";

import { rotuloDoTipo } from "./grupos";

/** As classificações que o catálogo escolhe — os componentes da CHT (`RN-EVT-01`). */
export const CLASSIFICACOES_DO_CATALOGO = ["AEC", "TAD", "TR"] as const;
export type ClassificacaoDoCatalogo = (typeof CLASSIFICACOES_DO_CATALOGO)[number];

/** Uma linha de `config_listas` da lista `tipos_atividade`, como o banco a devolve. */
export type LinhaDoCatalogo = {
  readonly id: string;
  readonly valor: string;
  readonly rotulo: string | null;
  readonly ativo: boolean;
  readonly ordem: number;
  readonly metadados: TipoDeAtividade["metadados"];
};

export type TipoDoCatalogo = {
  readonly id: string;
  /** A chave gravada — o que o gatilho, a sincronização e o ETL casam. Não muda. */
  readonly valor: string;
  /** O nome na tela (`rotulo_exibicao`, senão o valor). */
  readonly rotulo: string;
  /** O rótulo é outro que a chave (ex.: o rótulo novo da decisão 4)? A tela mostra a chave ao lado. */
  readonly chaveDiferente: boolean;
  readonly ativo: boolean;
  readonly ordem: number;
  readonly categoria: CategoriaDeAtividade;
  /** AEC, TAD ou TR: o catálogo edita a classificação. Estudo Individual e Apoio Individualizado: só leitura. */
  readonly editavel: boolean;
};

/** A classificação é uma das que o catálogo escolhe? */
export function ehClassificacaoDoCatalogo(
  valor: string | null | undefined,
): valor is ClassificacaoDoCatalogo {
  return (CLASSIFICACOES_DO_CATALOGO as readonly string[]).includes(valor ?? "");
}

/** O nome da classificação na tela («AEC», …, «Estudo Individual»). */
export function rotuloDaClassificacao(categoria: CategoriaDeAtividade): string {
  return ROTULO_DA_CATEGORIA_DE_ATIVIDADE[categoria];
}

/** Os tipos DE ATIVIDADE do catálogo, na ordem da lista (e, no empate, pelo nome). */
export function tiposDoCatalogo(linhas: readonly LinhaDoCatalogo[]): TipoDoCatalogo[] {
  return linhas
    .flatMap((l): TipoDoCatalogo[] => {
      const categoria = categoriaPeloTipo({
        id: l.id,
        valor: l.valor,
        ativo: l.ativo,
        metadados: l.metadados,
      });
      if (categoria === null) return [];
      const rotulo = rotuloDoTipo({ valor: l.valor, rotulo: l.rotulo });
      return [
        {
          id: l.id,
          valor: l.valor,
          rotulo,
          chaveDiferente: rotulo !== l.valor,
          ativo: l.ativo,
          ordem: l.ordem,
          categoria,
          editavel: aceitaContaComo(categoria),
        },
      ];
    })
    .sort((a, b) => a.ordem - b.ordem || a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}

/** Os lançamentos ATIVOS e SALVOS de um tipo, pelo que cada um faz quando a classificação padrão muda. */
export type ContagemDoTipo = {
  readonly total: number;
  /** «Conta como» vazio: seguem a classificação do tipo — são os que o gatilho recategoriza. */
  readonly seguemOTipo: number;
  /** «Conta como» TA da disciplina: contam na CHD e continuam contando, qualquer que seja a classificação. */
  readonly taDaDisciplina: number;
  /** «Conta como» AEC, TAD ou TR escolhido no lançamento: o gatilho os pula. */
  readonly comEscolha: number;
  /**
   * Os de turma ARQUIVADA, qualquer que seja o «Conta como»: o gatilho também os pula (RT-8 — a arquivada conta com a
   * situação que tinha, e a trava da arquivada recusaria a linha). Ficam FORA de `seguemOTipo`, `taDaDisciplina` e
   * `comEscolha`, e o «mudam» do diálogo não os promete.
   */
  readonly emTurmaArquivada: number;
  /**
   * Os que seguem o tipo («Conta como» vazio) e TÊM DISCIPLINA, fora de turma arquivada — salvos OU em rascunho, porque
   * o gatilho toca os dois. Contados por lançamento: a sombra do rascunho não soma ao salvo de que é sombra. Com a
   * classificação nova fora de AEC, cada um viola `ativ_disciplina_so_aec_da_turma` e a troca inteira é recusada.
   */
  readonly comDisciplina: number;
};

const ZERO: ContagemDoTipo = {
  total: 0,
  seguemOTipo: 0,
  taDaDisciplina: 0,
  comEscolha: 0,
  emTurmaArquivada: 0,
  comDisciplina: 0,
};

/** Um lançamento ATIVO com tipo, como a contagem o precisa ver. */
export type LancamentoDoTipo = {
  readonly tipoId: string | null;
  readonly contaComo: string | null;
  /** O id da linha — o que separa um lançamento do outro na contagem dos que têm disciplina. */
  readonly id?: string;
  /** A turma da linha está arquivada (`vw_turmas_arquivadas`). Ausente = não. */
  readonly turmaArquivada?: boolean;
  /** A linha tem disciplina. Ausente = não. */
  readonly comDisciplina?: boolean;
  /** Salvo (RP-8). Ausente = salvo: só o salvo entra no «total» e no «mudam»; o rascunho, só em `comDisciplina`. */
  readonly salvo?: boolean;
  /** A linha salva de que este rascunho é sombra (nulo no salvo e no rascunho novo). */
  readonly rascunhoDe?: string | null;
};

/** A contagem de cada tipo, a partir dos lançamentos (ativos, filtrados por quem lê). */
export function contagemPorTipo(
  lancamentos: readonly LancamentoDoTipo[],
): ReadonlyMap<string, ContagemDoTipo> {
  const mapa = new Map<string, ContagemDoTipo>();
  const comDisciplina = new Map<string, Set<string>>();
  lancamentos.forEach((l, indice) => {
    if (l.tipoId === null) return;
    const atual = mapa.get(l.tipoId) ?? ZERO;
    const como = contaComoDoBanco(l.contaComo);
    const arquivada = l.turmaArquivada === true;
    const salvo = l.salvo !== false;
    if (!arquivada && como === null && l.comDisciplina === true) {
      /* A sombra conta pelo salvo de que é sombra: o mesmo lançamento não soma duas vezes. */
      const chave = l.rascunhoDe ?? l.id ?? `#${indice}`;
      const conjunto = comDisciplina.get(l.tipoId) ?? new Set<string>();
      conjunto.add(chave);
      comDisciplina.set(l.tipoId, conjunto);
    }
    if (!salvo) {
      if (!mapa.has(l.tipoId)) mapa.set(l.tipoId, atual);
      return;
    }
    mapa.set(l.tipoId, {
      ...atual,
      total: atual.total + 1,
      seguemOTipo: atual.seguemOTipo + (!arquivada && como === null ? 1 : 0),
      taDaDisciplina: atual.taDaDisciplina + (!arquivada && como === "CHD" ? 1 : 0),
      comEscolha: atual.comEscolha + (!arquivada && como !== null && como !== "CHD" ? 1 : 0),
      emTurmaArquivada: atual.emTurmaArquivada + (arquivada ? 1 : 0),
    });
  });
  for (const [tipoId, conjunto] of comDisciplina) {
    const atual = mapa.get(tipoId) ?? ZERO;
    mapa.set(tipoId, { ...atual, comDisciplina: conjunto.size });
  }
  return mapa;
}

/** A contagem do tipo, ou zero quando ele não tem lançamento. */
export function contagemDoTipo(
  contagens: ReadonlyMap<string, ContagemDoTipo>,
  tipoId: string,
): ContagemDoTipo {
  return contagens.get(tipoId) ?? ZERO;
}

export type EfeitoDaTroca = {
  /** Os que passam a contar na classificação nova (os que seguem o tipo). */
  readonly mudam: number;
  /** Os de «TA da disciplina»: a categoria gravada segue o tipo, mas eles continuam contando na CHD. */
  readonly taDaDisciplina: number;
  /** Os de «Conta como» escolhido: ficam como estão. */
  readonly ficamPelaEscolha: number;
  /** Os de turma arquivada: o gatilho os pula, e ficam como estão (RT-8). */
  readonly ficamNaArquivada: number;
};

/**
 * O que a troca da classificação padrão faz com os lançamentos — o espelho de `app.recategorizar_pelo_tipo`: as linhas
 * ativas do tipo com «Conta como» vazio ou «TA da disciplina» recebem a categoria nova; as com AEC/TAD/TR escolhido não,
 * e as de turma arquivada também não. `null` quando a classificação não muda (o gatilho não roda).
 */
export function efeitoDaTroca(
  atual: CategoriaDeAtividade,
  nova: ClassificacaoDoCatalogo,
  contagem: ContagemDoTipo,
): EfeitoDaTroca | null {
  if (atual === nova) return null;
  return {
    mudam: contagem.seguemOTipo,
    taDaDisciplina: contagem.taDaDisciplina,
    ficamPelaEscolha: contagem.comEscolha,
    ficamNaArquivada: contagem.emTurmaArquivada,
  };
}

const lancamentos = (n: number) => `${n} ${n === 1 ? "lançamento" : "lançamentos"}`;

/** O que impede a troca da classificação padrão — o que a ação confere ANTES de gravar e o diálogo avisa. */
export type ImpedimentosDaTroca = {
  /** As AEC previstas ATIVAS de currículo com o tipo. */
  readonly previstasAtivas: number;
  /** As siglas dos cursos dessas previstas (para a frase; pode vir vazia). */
  readonly cursosDasPrevistas?: readonly string[];
  /** Os lançamentos que seguem o tipo e têm disciplina, fora de turma arquivada (`ContagemDoTipo.comDisciplina`). */
  readonly comDisciplina: number;
  /** Um deles, para a frase dizer onde procurar: a turma (código) e a data (ISO). */
  readonly exemploComDisciplina?: { readonly turma: string | null; readonly data: string | null } | null;
};

/** Até três nomes, e «e mais N». */
function algunsNomes(nomes: readonly string[]): string {
  const unicos = [...new Set(nomes.filter((n) => n.trim() !== ""))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  if (unicos.length === 0) return "";
  const mostrados = unicos.slice(0, 3).join(", ");
  return unicos.length > 3 ? `${mostrados} e mais ${unicos.length - 3}` : mostrados;
}

/**
 * A recusa da troca da classificação padrão, ou `null` quando ela pode ir ao banco. São DUAS, e as duas são da troca que
 * TIRA o tipo da AEC:
 *
 * 1. **AEC prevista ativa de currículo com o tipo.** A AEC prevista só aceita tipo de classificação AEC, e o «Novo
 *    currículo» (RC-7) a copia por INSERT, que o porteiro do banco confere: com o tipo reclassificado, o currículo novo do
 *    curso falharia inteiro, numa tela que não tem nada a ver com o catálogo. ⚠️ O banco NÃO recusa esta troca (a recusa
 *    é desta conferência) — está registrado como pendência.
 * 2. **Lançamento que segue o tipo e tem disciplina.** A disciplina só vale na AEC e no «TA da disciplina»
 *    (`ativ_disciplina_so_aec_da_turma`): a recategorização violaria o CHECK, e o banco desfaria a troca inteira com uma
 *    frase que não fala do tipo. Aqui ela sai com o número e onde procurar.
 */
export function impedimentoDaTroca(
  atual: CategoriaDeAtividade,
  nova: ClassificacaoDoCatalogo,
  impedimentos: ImpedimentosDaTroca,
): string | null {
  if (atual === nova) return null;
  const frases: string[] = [];
  if (atual === "AEC" && impedimentos.previstasAtivas > 0) {
    const n = impedimentos.previstasAtivas;
    const cursos = algunsNomes(impedimentos.cursosDasPrevistas ?? []);
    frases.push(
      `Este tipo é usado por ${n} ${n === 1 ? "AEC prevista ativa" : "AEC previstas ativas"} de currículo` +
        `${cursos ? ` (${cursos})` : ""}, e a AEC prevista só aceita tipo de classificação AEC: troque o tipo ` +
        `${n === 1 ? "dela" : "delas"} ou ${n === 1 ? "desative-a" : "desative-as"} em Editar curso → Currículo → ` +
        `Atividades e limites antes de tirar o tipo da AEC.`,
    );
  }
  if (nova !== "AEC" && impedimentos.comDisciplina > 0) {
    const n = impedimentos.comDisciplina;
    const exemplo = impedimentos.exemploComDisciplina;
    const onde =
      exemplo && (exemplo.turma || exemplo.data)
        ? ` (por exemplo, ${[exemplo.turma, exemplo.data ? `em ${dataParaLeitura(exemplo.data)}` : null]
            .filter((p): p is string => p !== null && p !== "")
            .join(" ")})`
        : "";
    frases.push(
      `${lancamentos(n)} deste tipo (contando os rascunhos) ${n === 1 ? "tem" : "têm"} disciplina e ` +
        `${n === 1 ? "segue" : "seguem"} a classificação do tipo${onde}: só a AEC e o «TA da disciplina» levam ` +
        `disciplina. No DSA, tire a disciplina ${n === 1 ? "dele" : "deles"} ou troque o «Conta como» para TA da ` +
        `disciplina antes de mudar a classificação.`,
    );
  }
  return frases.length === 0 ? null : frases.join(" ");
}

/** A frase do diálogo de *Editar* — o número antes de gravar (FR-001.3). */
export function fraseDoEfeito(
  atual: CategoriaDeAtividade,
  nova: ClassificacaoDoCatalogo,
  contagem: ContagemDoTipo | null,
): string {
  if (atual === nova) return "A classificação não muda: nenhum lançamento é tocado.";
  if (contagem === null) {
    return (
      `Não foi possível contar agora os lançamentos deste tipo. Ao gravar, os ativos que seguem o tipo passam de ` +
      `${rotuloDaClassificacao(atual)} para ${nova}.`
    );
  }
  const efeito = efeitoDaTroca(atual, nova, contagem);
  if (
    efeito === null ||
    efeito.mudam + efeito.taDaDisciplina + efeito.ficamPelaEscolha + efeito.ficamNaArquivada === 0
  ) {
    return "Nenhum lançamento muda de categoria: este tipo não tem lançamento ativo.";
  }
  const partes = [
    efeito.mudam === 0
      ? `Nenhum lançamento passa de ${rotuloDaClassificacao(atual)} para ${nova}.`
      : `${lancamentos(efeito.mudam)} ${efeito.mudam === 1 ? "passa" : "passam"} de ${rotuloDaClassificacao(atual)} ` +
        `para ${nova}.`,
  ];
  if (efeito.taDaDisciplina > 0) {
    partes.push(
      `${lancamentos(efeito.taDaDisciplina)} com «Conta como» TA da disciplina ${efeito.taDaDisciplina === 1 ? "continua" : "continuam"} na CHD.`,
    );
  }
  if (efeito.ficamPelaEscolha > 0) {
    partes.push(
      `${lancamentos(efeito.ficamPelaEscolha)} com «Conta como» escolhido no lançamento ${efeito.ficamPelaEscolha === 1 ? "fica" : "ficam"} como ${efeito.ficamPelaEscolha === 1 ? "está" : "estão"}.`,
    );
  }
  if (efeito.ficamNaArquivada > 0) {
    /* RT-8: a turma arquivada conta com a situação que tinha — a recategorização a pula. */
    partes.push(
      `${lancamentos(efeito.ficamNaArquivada)} em turma arquivada ${efeito.ficamNaArquivada === 1 ? "fica" : "ficam"} como ${efeito.ficamNaArquivada === 1 ? "está" : "estão"}.`,
    );
  }
  return partes.join(" ");
}

/** A dica do *Excluir* indisponível (FR-001.4; regra 4, sem exceção nominal para o catálogo). */
export const DICA_DO_EXCLUIR_COM_LANCAMENTO = "tem registros: use Desativar";
export const DICA_DO_EXCLUIR_SEM_LANCAMENTO = "sem exceção à regra 4: use Desativar";

/** `null` quando a contagem não pôde ser lida — e aí a dica não afirma que não há registro. */
export function dicaDoExcluirDoTipo(lancamentosDoTipo: number | null): string {
  return lancamentosDoTipo !== null && lancamentosDoTipo > 0
    ? DICA_DO_EXCLUIR_COM_LANCAMENTO
    : DICA_DO_EXCLUIR_SEM_LANCAMENTO;
}

/** O maior valor de `ordem` (smallint no banco). */
const ORDEM_MAXIMA = 32_767;

/** A ordem do tipo novo: depois de todos os da lista — inserir no meio reordenaria a lista de todo mundo. */
export function proximaOrdem(ordens: readonly number[]): number {
  const maior = ordens.reduce((m, o) => (Number.isFinite(o) && o > m ? o : m), 0);
  return Math.min(maior + 1, ORDEM_MAXIMA);
}

/** O nome comparável: sem acento, sem caixa e sem espaço repetido. */
function comparavel(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * O tipo que já existe com o mesmo nome (pela chave ou pelo rótulo), ou `null`. A `UNIQUE (lista, valor)` do banco só
 * pega a grafia idêntica; «palestra» ao lado de «Palestra» seria um segundo tipo com a mesma cara.
 */
export function tipoComOMesmoNome<
  T extends { readonly valor: string; readonly rotulo: string | null },
>(nome: string, tipos: readonly T[]): T | null {
  const alvo = comparavel(nome);
  return (
    tipos.find(
      (t) => comparavel(t.valor) === alvo || (t.rotulo !== null && comparavel(t.rotulo) === alvo),
    ) ?? null
  );
}
