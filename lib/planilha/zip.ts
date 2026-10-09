/**
 * O ZIP do `.xlsx` — montado pelo próprio sistema, sem pacote (R-1 da spec 015).
 *
 * > *"sem pacote novo; o .xlsx é montado pelo próprio sistema (ZIP nativo do Node, como o
 * > repositório já faz com .docx)."*
 * > — resposta de Bernardo Villas Boas à `Q-2`, 09/10/2026
 *
 * ⚠️ **SÓ O QUE O OOXML PRECISA**: entradas comprimidas por `deflate`, nomes em UTF-8, um diretório
 * central e o registro de fim. Nada de ZIP64 — a planilha da maior turma fica muito abaixo de 4 GB.
 *
 * ⚠️ **O CRC-32 É DE TABELA PRÓPRIA**, e não `zlib.crc32`: o `engines` aceita o Node 22.0, e a função
 * do Node só chegou na 22.2.0. O teste a confere contra a do Node onde ela existir.
 *
 * ⚠️ **A DATA DAS ENTRADAS É FIXA (01/01/1980)** — o instante da geração vai em `docProps/core.xml`,
 * que é onde os programas o mostram. Assim a mesma pasta gera os mesmos bytes, e o arquivo se confere
 * por resumo.
 */
import { deflateRawSync } from "node:zlib";

const TABELA_DO_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

export function crc32(dados: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of dados) c = (TABELA_DO_CRC[(c ^ byte) & 0xff] as number) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export type EntradaDoZip = {
  readonly caminho: string;
  readonly conteudo: Uint8Array | string;
};

/** Hora e data DOS de 01/01/1980 00:00. */
const HORA_DOS = 0;
const DATA_DOS = (0 << 9) | (1 << 5) | 1;
/** O bit 11 diz que o nome está em UTF-8. */
const NOME_EM_UTF8 = 0x0800;

export function montarZip(entradas: readonly EntradaDoZip[]): Uint8Array {
  const codificador = new TextEncoder();
  const locais: Uint8Array[] = [];
  const centrais: Uint8Array[] = [];
  let deslocamento = 0;

  for (const entrada of entradas) {
    const nome = codificador.encode(entrada.caminho);
    const dados =
      typeof entrada.conteudo === "string"
        ? codificador.encode(entrada.conteudo)
        : entrada.conteudo;
    const comprimido = new Uint8Array(deflateRawSync(dados));
    const crc = crc32(dados);

    const local = new Uint8Array(30 + nome.length);
    const l = new DataView(local.buffer);
    l.setUint32(0, 0x04034b50, true);
    l.setUint16(4, 20, true);
    l.setUint16(6, NOME_EM_UTF8, true);
    l.setUint16(8, 8, true);
    l.setUint16(10, HORA_DOS, true);
    l.setUint16(12, DATA_DOS, true);
    l.setUint32(14, crc, true);
    l.setUint32(18, comprimido.length, true);
    l.setUint32(22, dados.length, true);
    l.setUint16(26, nome.length, true);
    l.setUint16(28, 0, true);
    local.set(nome, 30);

    const central = new Uint8Array(46 + nome.length);
    const c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, NOME_EM_UTF8, true);
    c.setUint16(10, 8, true);
    c.setUint16(12, HORA_DOS, true);
    c.setUint16(14, DATA_DOS, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, comprimido.length, true);
    c.setUint32(24, dados.length, true);
    c.setUint16(28, nome.length, true);
    c.setUint32(42, deslocamento, true);
    central.set(nome, 46);

    locais.push(local, comprimido);
    centrais.push(central);
    deslocamento += local.length + comprimido.length;
  }

  const tamanhoDoCentral = centrais.reduce((soma, c) => soma + c.length, 0);
  const fim = new Uint8Array(22);
  const f = new DataView(fim.buffer);
  f.setUint32(0, 0x06054b50, true);
  f.setUint16(8, entradas.length, true);
  f.setUint16(10, entradas.length, true);
  f.setUint32(12, tamanhoDoCentral, true);
  f.setUint32(16, deslocamento, true);

  const partes = [...locais, ...centrais, fim];
  const total = partes.reduce((soma, p) => soma + p.length, 0);
  const saida = new Uint8Array(total);
  let p = 0;
  for (const parte of partes) {
    saida.set(parte, p);
    p += parte.length;
  }
  return saida;
}
