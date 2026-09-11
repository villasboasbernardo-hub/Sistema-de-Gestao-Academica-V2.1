/**
 * `RF-INSTR-15` — apresentação padronizada do nome de instrutor.
 *
 * > *"Em toda tela, relatório e documento impresso, o nome de um instrutor deve ser apresentado no
 * > formato padronizado **P/G Especialidade/Habilitação Nome Completo**, com o nome ou nomes de
 * > guerra em negrito."*
 * > — documento 02, `RF-INSTR-15` **[PRESERVADO]**
 *
 * Também `RF-DS-05`: a regra é **componente único**, consumido por telas e pelas rotas `/print/*`.
 * É o que a v2.0 não conseguia, porque `.gs` e `.html` não compartilhavam código e a formatação
 * existia em cópias.
 *
 * ⚠️ O NOME COMPLETO APARECE, E ESSE É O PONTO. O nome de guerra **não substitui** o nome completo:
 * ele **marca palavras dentro dele**. A compressão para `P/G Especialidade Nome de Guerra`, que
 * circulou em três documentos desta linhagem, descarta o nome completo e contraria a regra
 * preservada — foi corrigida na spec 007 e no `CHK016` em 10/09/2026. **Nenhuma regra mudou; a
 * transcrição é que estava errada.**
 *
 * ⚠️ ISTO É PORTE DA SPEC 020 DA v2.0, NÃO INVENÇÃO. Lá o algoritmo foi corrigido, com o defeito
 * nomeado: o destaque **falhava em silêncio** quando as palavras do nome de guerra não eram
 * contíguas no nome completo — *"Guilherme Black"* dentro de *"Guilherme Pires Black Pereira"*. A
 * correção marca **palavra a palavra**, e os casos de teste vêm junto.
 *
 * ⚠️ E VEM JUNTO O ACHADO QUE CUSTOU A PRIMEIRA IMPLEMENTAÇÃO: a fronteira de palavra `\b` do
 * JavaScript é definida sobre `\w`, que é só ASCII. Depois de um caractere acentuado não há
 * transição, então não há fronteira — e o destaque falha exatamente nos nomes acentuados, que
 * neste domínio são a maioria. A fronteira usada é a Unicode, `(?<![\p{L}\p{N}])`.
 */

/** Um pedaço do nome, com ou sem destaque. A marcação é de quem renderiza. */
export type Fragmento = {
  readonly texto: string;
  readonly destacado: boolean;
};

/**
 * O mínimo que a apresentação precisa — e **só** o mínimo.
 *
 * ⚠️ CINCO CAMPOS, NENHUM DELES DADO PESSOAL CIVIL. Nem CPF, nem RG, nem telefone, nem endereço.
 * A tabela `instrutores` guarda tudo isso e três perfis o leem; um tipo desenhado sobre a linha
 * inteira convidaria cada tela a passar o objeto completo para dentro de um componente de cliente,
 * e o dado pessoal iria parar no pacote enviado ao navegador sem que policy nenhuma fosse
 * consultada. O tipo mínimo torna isso desconfortável de escrever — que é o melhor que um tipo faz.
 */
export type InstrutorParaExibir = {
  readonly id: string;
  /** Posto/graduação, como vem de `config_listas`. Abre o formato e é de onde sai a antiguidade. */
  readonly pg: string;
  readonly especialidade: string | null;
  readonly nomeCompleto: string;
  readonly nomeDeGuerra: string | null;
};

/** Escapa o que, numa expressão regular, deixaria de ser literal. */
function escaparParaRegex(palavra: string): string {
  return palavra.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type Faixa = { inicio: number; fim: number };

/**
 * As faixas do nome completo que caem sob alguma palavra do nome de guerra.
 *
 * ⚠️ FAIXAS, E NÃO SUBSTITUIÇÃO ENCADEADA. A v2.0 encadeava `.replace` sobre a cadeia em
 * construção, para que o destaque de uma palavra não fosse desfeito pela busca da seguinte. Aqui a
 * saída é React, não HTML, então o encadeamento não existe — e marcar posições resolve o mesmo
 * problema sem a armadilha de uma palavra casar dentro da marcação da anterior.
 *
 * ⚠️ NOME DE GUERRA CONTÍGUO DE DUAS PALAVRAS CONTINUA PRODUZINDO DUAS MARCAÇÕES, separadas pelo
 * espaço. É consequência direta do algoritmo por palavra, foi aceita na spec 020 como correta e
 * intencional, e é visualmente idêntica: as mesmas duas palavras aparecem em negrito, adjacentes.
 */
function faixasDestacadas(nomeCompleto: string, nomeDeGuerra: string): Faixa[] {
  const palavras = nomeDeGuerra.split(" ").filter((p) => p.length > 0);
  const faixas: Faixa[] = [];

  for (const palavra of palavras) {
    // ⚠️ Fronteira de palavra UNICODE. Com `\b` o destaque falha depois de letra acentuada, que é
    // o modo de falha que a spec 020 existiu para eliminar — reproduzi-lo aqui seria porte pela
    // metade. `u` habilita `\p{…}`; `g` pega TODAS as ocorrências de uma palavra repetida; `i`
    // ignora caixa, porque a planilha de origem mistura as duas.
    const expressao = new RegExp(
      `(?<![\\p{L}\\p{N}])${escaparParaRegex(palavra)}(?![\\p{L}\\p{N}])`,
      "giu",
    );
    for (const achado of nomeCompleto.matchAll(expressao)) {
      // ⚠️ PALAVRA SEM CORRESPONDÊNCIA NÃO ENTRA E NÃO LANÇA EXCEÇÃO (`RN-DEG-01`): o laço
      // simplesmente não itera. Dado inconsistente degrada em silêncio POR DECISÃO, não por
      // descuido — as demais palavras continuam destacadas normalmente.
      faixas.push({ inicio: achado.index, fim: achado.index + achado[0].length });
    }
  }

  // Faixas sobrepostas viram uma só: uma palavra contida noutra não pode gerar marcação aninhada.
  faixas.sort((a, b) => a.inicio - b.inicio);
  const fundidas: Faixa[] = [];
  for (const faixa of faixas) {
    const ultima = fundidas[fundidas.length - 1];
    if (ultima && faixa.inicio <= ultima.fim) ultima.fim = Math.max(ultima.fim, faixa.fim);
    else fundidas.push({ ...faixa });
  }
  return fundidas;
}

/**
 * O prefixo do formato: `P/G Especialidade/Habilitação`.
 *
 * ⚠️ ESPECIALIDADE AUSENTE DEGRADA SEM ESPAÇO DUPLO nem rótulo órfão. É o caso de fronteira da
 * spec, e é o tipo de defeito que ninguém reporta: um espaço a mais numa listagem de 177 linhas
 * parece desalinho, não erro.
 */
function prefixo(instrutor: InstrutorParaExibir): string {
  return [instrutor.pg, instrutor.especialidade]
    .map((parte) => parte?.trim() ?? "")
    .filter((parte) => parte.length > 0)
    .join(" ");
}

/**
 * O nome formatado, em fragmentos — `P/G Especialidade/Habilitação Nome Completo`, com as palavras
 * do nome de guerra marcadas.
 *
 * ⚠️ ELA DEVOLVE FRAGMENTOS, NÃO HTML. A v2.0 devolvia uma cadeia com `<strong>`, porque era o que
 * `HtmlService` aceitava. Aqui isso obrigaria o componente a injetar HTML de dado — e dado que
 * vira marcação é a porta pela qual um nome de instrutor com um sinal de menor quebra a tela.
 */
export function fragmentosDoNome(instrutor: InstrutorParaExibir): readonly Fragmento[] {
  const inicio = prefixo(instrutor);
  const nome = instrutor.nomeCompleto.trim();
  const cabeca: Fragmento[] = inicio ? [{ texto: `${inicio} `, destacado: false }] : [];

  const guerra = instrutor.nomeDeGuerra?.trim() ?? "";
  if (!guerra || !nome) {
    return nome ? [...cabeca, { texto: nome, destacado: false }] : cabeca;
  }

  const faixas = faixasDestacadas(nome, guerra);
  if (faixas.length === 0) return [...cabeca, { texto: nome, destacado: false }];

  const fragmentos: Fragmento[] = [...cabeca];
  let cursor = 0;
  for (const faixa of faixas) {
    if (faixa.inicio > cursor) {
      fragmentos.push({ texto: nome.slice(cursor, faixa.inicio), destacado: false });
    }
    fragmentos.push({ texto: nome.slice(faixa.inicio, faixa.fim), destacado: true });
    cursor = faixa.fim;
  }
  if (cursor < nome.length) fragmentos.push({ texto: nome.slice(cursor), destacado: false });

  return fragmentos;
}

/**
 * O mesmo nome, em texto puro.
 *
 * ⚠️ ELE EXISTE PORQUE A MARCAÇÃO NÃO SERVE PARA TUDO: nome acessível de um botão, atributo de
 * título, comparação de ordenação e exportação precisam da cadeia, não dos fragmentos. Derivá-la
 * dos mesmos fragmentos garante que as duas leituras nunca divirjam.
 */
export function nomeEmTexto(instrutor: InstrutorParaExibir): string {
  return fragmentosDoNome(instrutor)
    .map((f) => f.texto)
    .join("");
}
