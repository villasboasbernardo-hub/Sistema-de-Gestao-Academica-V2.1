/**
 * A validação dos parâmetros da URL, **na leitura e antes de qualquer uso** (`FR-006`, `FR-007`,
 * `FR-041`, `SC-017`).
 *
 * Contrato: `specs/008-shell-e-estado-na-url/contracts/seguranca-da-url.md`
 *
 * ⚠️ COM O `RF-NAV-01`, A BARRA DE ENDEREÇO PASSA A SER ENTRADA DE USUÁRIO, e nenhum requisito a
 * tratava como tal. Quem cola um link não é sempre quem o escreveu.
 *
 * ⚠️ AQUI SE DEGRADA, NÃO SE RECUSA — e é o que separa este arquivo de uma Server Action. Lá,
 * entrada inválida é erro de quem chama, e a ação recusa. Aqui, entrada inválida é um **link
 * velho**, e recusar transformaria um favorito antigo numa tela de erro. Quem recusa é só o destino
 * de retorno, em `destino-seguro.ts`.
 *
 * ⚠️ E DEGRADAR NÃO É ENGOLIR. A tela funciona, e o que foi descartado volta em `descartes` para
 * quem quiser registrar. O requisito de observabilidade disso **não existe** e está declarado como
 * pendência (achado P-5 do plano) — a função já devolve o dado para quando existir.
 */
import { z } from "zod";

import {
  CONTRATO,
  descritor,
  type Parametro,
  type ParametroDe,
  type Rota,
} from "@/lib/navegacao/contrato";

/** O que foi descartado na leitura, e por quê. */
export type Descarte = {
  readonly parametro: string;
  readonly motivo: "fora-do-dominio" | "fora-do-contrato" | "item-invalido";
  readonly recebido: string;
};

export type Leitura<R extends Rota> = {
  readonly valores: Readonly<Record<ParametroDe<R>, string | number | readonly string[]>>;
  readonly descartes: readonly Descarte[];
};

/** A entrada aceita: o que o navegador dá, ou o que o servidor entrega. */
export type EntradaDeParametros =
  URLSearchParams | Readonly<Record<string, string | readonly string[] | undefined>>;

function primeiro(entrada: EntradaDeParametros, nome: string): string | undefined {
  if (entrada instanceof URLSearchParams) return entrada.get(nome) ?? undefined;
  const bruto = entrada[nome];
  if (bruto === undefined) return undefined;
  return Array.isArray(bruto) ? bruto[0] : (bruto as string);
}

function todos(entrada: EntradaDeParametros, nome: string): readonly string[] {
  if (entrada instanceof URLSearchParams) return entrada.getAll(nome);
  const bruto = entrada[nome];
  if (bruto === undefined) return [];
  return Array.isArray(bruto) ? bruto : [bruto as string];
}

function chaves(entrada: EntradaDeParametros): readonly string[] {
  return entrada instanceof URLSearchParams ? [...new Set(entrada.keys())] : Object.keys(entrada);
}

/**
 * O esquema de um parâmetro, derivado do seu descritor.
 *
 * ⚠️ ELE É DERIVADO, E NÃO ESCRITO À MÃO POR PARÂMETRO. Um esquema por parâmetro seria um segundo
 * lugar onde tipo e domínio vivem — e dois lugares divergem.
 */
function esquemaDe(p: Parametro): z.ZodType {
  switch (p.tipo) {
    case "texto":
      return z.string();
    case "inteiro":
      return z.coerce.number().int().min(p.minimo).max(p.maximo);
    case "escolha":
      // O padrão é sempre aceitável: ele é o "todas", e não precisa estar entre as opções.
      return z.string().refine((v) => v === p.padrao || p.opcoes.includes(v));
    case "lista":
      return z.string().refine((v) => p.opcoes.includes(v));
  }
}

/**
 * Lê os parâmetros de uma rota, degradando o que não servir.
 *
 * | Caso | O que acontece | Requisito |
 * |---|---|---|
 * | valor fora do domínio | usa o padrão daquele parâmetro; **os demais são preservados** | `FR-006` |
 * | parâmetro fora do contrato | ignorado, e registrado em `descartes` | `FR-007` |
 * | item podre dentro de uma lista | **só o item sai**; a lista sobrevive | data-model §3 |
 *
 * ⚠️ A LISTA DEGRADA POR ITEM, E NÃO POR LISTA. Um valor podre no meio de cinco não pode apagar os
 * outros quatro — seria transformar um erro de digitação em perda de recorte inteiro.
 */
export function lerParametros<R extends Rota>(rota: R, entrada: EntradaDeParametros): Leitura<R> {
  const declarados = CONTRATO[rota].parametros as Readonly<Record<string, Parametro>>;
  const valores: Record<string, string | number | readonly string[]> = {};
  const descartes: Descarte[] = [];

  for (const [nome, p] of Object.entries(declarados)) {
    if (p.tipo === "lista") {
      const recebidos = todos(entrada, nome);
      const bons: string[] = [];
      for (const item of recebidos) {
        if (p.opcoes.includes(item)) bons.push(item);
        else descartes.push({ parametro: nome, motivo: "item-invalido", recebido: item });
      }
      valores[nome] = bons.length > 0 ? bons : p.padrao;
      continue;
    }

    const bruto = primeiro(entrada, nome);
    if (bruto === undefined || bruto === "") {
      valores[nome] = p.padrao;
      continue;
    }

    const resultado = esquemaDe(p).safeParse(bruto);
    if (resultado.success) {
      valores[nome] = resultado.data as string | number;
    } else {
      valores[nome] = p.padrao;
      descartes.push({ parametro: nome, motivo: "fora-do-dominio", recebido: bruto });
    }
  }

  /*
   * ⚠️ O PARÂMETRO FORA DO CONTRATO É IGNORADO, NÃO RECUSADO (`FR-007`) — mas é **registrado**.
   * Ignorar em silêncio absoluto esconderia uma tela que passou a mandar parâmetro que ninguém
   * declarou, que é justamente o que o contrato veio impedir.
   */
  for (const chave of chaves(entrada)) {
    if (!(chave in declarados)) {
      descartes.push({
        parametro: chave,
        motivo: "fora-do-contrato",
        recebido: primeiro(entrada, chave) ?? "",
      });
    }
  }

  return { valores: valores as Leitura<R>["valores"], descartes };
}

/** Lê um parâmetro só, já degradado. Atalho para quem não precisa dos descartes. */
export function lerParametro<R extends Rota>(
  rota: R,
  nome: ParametroDe<R>,
  entrada: EntradaDeParametros,
): string | number | readonly string[] {
  return lerParametros(rota, entrada).valores[nome];
}

/**
 * O valor padrão de um parâmetro — o que a URL **não** mostra (`FR-002`).
 *
 * ⚠️ Ele é exportado porque quem escreve na URL precisa saber quando **apagar** o parâmetro, e não
 * só quando gravá-lo. Sem isso, a URL acumula `?status=` vazio e o link compartilhado carrega ruído.
 */
export function padraoDe<R extends Rota>(
  rota: R,
  nome: ParametroDe<R>,
): string | number | readonly string[] {
  return descritor(rota, nome).padrao;
}
