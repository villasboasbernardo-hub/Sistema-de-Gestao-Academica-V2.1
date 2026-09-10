/**
 * Leitor do ponto único, para as verificações.
 *
 * ⚠️ Ele existe para CONFRONTAR o arquivo com a lista fechada de
 * `vocabulario.fixture.ts` — não para ser a fonte dela. A auditoria de contraste percorre a lista;
 * este leitor prova que a lista e o arquivo não divergem. Se a auditoria lesse o arquivo, um par
 * novo entraria sem ser auditado (research R-3).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CAMINHO = resolve(process.cwd(), "app/globals.css");

/** Extrai as declarações `--nome: valor` de um bloco `seletor { … }` do ponto único. */
function bloco(seletor: string): Map<string, string> {
  const css = readFileSync(CAMINHO, "utf8");
  const inicio = css.indexOf(`${seletor} {`);
  if (inicio < 0) throw new Error(`bloco \`${seletor}\` ausente em app/globals.css`);

  let profundidade = 0;
  let fim = inicio;
  for (let i = css.indexOf("{", inicio); i < css.length; i += 1) {
    if (css[i] === "{") profundidade += 1;
    else if (css[i] === "}") {
      profundidade -= 1;
      if (profundidade === 0) {
        fim = i;
        break;
      }
    }
  }

  const corpo = css.slice(inicio, fim);
  const mapa = new Map<string, string>();
  for (const [, nome, valor] of corpo.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    mapa.set(nome, valor.trim());
  }
  return mapa;
}

/** Papéis do tema claro. */
export const claro = (): Map<string, string> => bloco(":root");

/** Papéis do modo noturno. */
export const escuro = (): Map<string, string> => bloco(".dark");

/** O bloco que expõe os papéis como utilitário. */
export const exposicao = (): Map<string, string> => bloco("@theme inline");

/** Só os papéis de cor: descarta `color-scheme` e afins, que não são token de cor. */
export function papeisDeCor(mapa: Map<string, string>): Map<string, string> {
  return new Map([...mapa].filter(([, v]) => /^#[0-9a-f]{3,8}$/i.test(v)));
}
