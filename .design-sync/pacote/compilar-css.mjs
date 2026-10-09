// Compila app/globals.css (Tailwind v4) no CSS que o design system do Claude Design usa.
// NAO e codigo do sistema: e a etapa de build do design-sync (cfg.buildCmd). Usa o
// @tailwindcss/postcss e o postcss que o projeto ja tem; nenhum pacote novo.
import { createRequire } from "node:module";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, "../..");
const req = createRequire(join(raiz, "package.json"));
const caminhoTw = req.resolve("@tailwindcss/postcss");
const postcss = createRequire(caminhoTw)("postcss");
const modTw = req("@tailwindcss/postcss");
const tailwind = modTw.default ?? modTw;

// As prévias do Claude Design também usam utilitários, e o Tailwind NÃO varre a pasta oculta
// .design-sync/ (nem com @source — medido em 07/10/2026). As classes delas entram por
// `@source inline(...)`; sem isso, classe que só aparece numa prévia ficaria sem regra, em silêncio.
const pastaDasPrevias = join(raiz, ".design-sync", "previews");
const classes = new Set();
if (existsSync(pastaDasPrevias)) {
  for (const arquivo of readdirSync(pastaDasPrevias)) {
    if (!arquivo.endsWith(".tsx")) continue;
    const texto = readFileSync(join(pastaDasPrevias, arquivo), "utf8");
    for (const m of texto.matchAll(/["'`]([^"'`\n]+)["'`]/g)) {
      for (const c of m[1].split(/\s+/)) {
        if (/^[a-z0-9!@:[\]()&_./%=#>*~+-]+$/i.test(c) && !c.includes("${")) classes.add(c);
      }
    }
  }
}
const inline = classes.size ? `\n@source inline("${[...classes].join(" ")}");\n` : "";

const entrada = join(raiz, "app", "globals.css");
const css = readFileSync(entrada, "utf8") + inline;
const resultado = await postcss([tailwind({ base: raiz })]).process(css, { from: entrada });
// next/font define --fonte-rawline no <html>; aqui ela aponta para a familia de fontes.css.
const fonte = ':root { --fonte-rawline: "Rawline"; }\n';
writeFileSync(join(aqui, "ciaara.css"), fonte + resultado.css);
console.log(
  `ciaara.css: ${(resultado.css.length / 1024).toFixed(0)} KB (${classes.size} candidatos das prévias)`,
);
