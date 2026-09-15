/**
 * Os quatro indicadores do cadastro de instrutores (`RF-INSTR-08`, `FR-026` e `FR-026.1` da spec 006).
 *
 * > *"O sistema deve apresentar indicadores agregados (total de instrutores, quantidade com
 * > capacitação didática, entre outros pertinentes) e gráficos, reagindo aos filtros aplicados"*
 * > — `RF-INSTR-08`, **[PRESERVADO]**
 *
 * > *"A taxa de seleção MUST exibir os dois valores absolutos sempre, e o percentual apenas como
 * > informação secundária. ⚠️ Selecionados NÃO é subconjunto de habilitados."* — `FR-026.1`
 *
 * ⚠️ A LISTA É FECHADA EM TRÊS (`FR-026`, emenda de 15/09/2026, decisão de Bernardo Villas Boas), e o
 * tipo de retorno tem três chaves. O cartão de CH ministrada no ano saiu; a CH do ano corrente continua
 * como coluna da listagem. "Entre outros pertinentes" deixou de ser redação aceitável em 10/09/2026.
 *
 * ⚠️ OS INDICADORES SÃO DO RECORTE, NÃO DO CADASTRO. Quem chama entrega os instrutores já filtrados,
 * e habilitado e selecionado só contam se estiverem nesse recorte — é o refinamento da spec 015 da
 * v2.0: os cartões reagem aos filtros.
 *
 * ⚠️ SELECIONADOS SÃO OS `instrutor_id` DISTINTOS COM ATRIBUIÇÃO ATIVA em `turma_disciplina_instrutor`
 * (achado 6 do Épico 2: a lista da v2.0 virou tabela de junção). Habilitados são os distintos com
 * vínculo ativo em `instrutor_disciplina`. Os dois conjuntos chegam por argumento; esta função não
 * sabe de onde vieram.
 *
 * ⚠️ O PERCENTUAL PODE PASSAR DE 100%, e não é arredondado para baixo nem escondido. A v2.0 mediu dez
 * instrutores selecionados sem habilitação; esconder o excesso apagaria a inconsistência que o número
 * existe para revelar.
 */

export type InstrutorParaIndicadores = {
  readonly id: string;
  readonly capacitacaoDidatica: string | null;
};

export type TaxaDeSelecao = {
  readonly habilitados: number;
  readonly selecionados: number;
  /** Selecionados sobre habilitados, em %. `null` quando não há habilitado — divisão por zero não é 0%. */
  readonly percentual: number | null;
};

export type IndicadoresDeInstrutores = {
  readonly total: number;
  readonly comCapacitacaoDidatica: number;
  readonly taxaDeSelecao: TaxaDeSelecao;
};

const preenchido = (texto: string | null): boolean => texto !== null && texto.trim() !== "";

export function indicadoresDeInstrutores(
  instrutores: readonly InstrutorParaIndicadores[],
  habilitados: ReadonlySet<string>,
  selecionados: ReadonlySet<string>,
): IndicadoresDeInstrutores {
  const noRecorte = new Set(instrutores.map((i) => i.id));
  const contarNoRecorte = (ids: ReadonlySet<string>) =>
    [...ids].filter((id) => noRecorte.has(id)).length;

  const qtdHabilitados = contarNoRecorte(habilitados);
  const qtdSelecionados = contarNoRecorte(selecionados);

  return {
    total: instrutores.length,
    comCapacitacaoDidatica: instrutores.filter((i) => preenchido(i.capacitacaoDidatica)).length,
    taxaDeSelecao: {
      habilitados: qtdHabilitados,
      selecionados: qtdSelecionados,
      percentual: qtdHabilitados === 0 ? null : (qtdSelecionados / qtdHabilitados) * 100,
    },
  };
}
