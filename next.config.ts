import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /*
     * ⚠️ **O LIMITE DE CORPO DA SERVER ACTION, E ELE É DELIBERADAMENTE MAIS FOLGADO QUE A REGRA.**
     *
     * O padrão do Next 16.3.3 é **1 MB** — medido em
     * `node_modules/next/dist/server/app-render/action-handler.js:519` (`1024 * 1024`) —, e a tela
     * do avatar promete **até 2 MB**, que é o que o balde `avatares` aceita
     * (`file_size_limit = 2097152`). Enquanto o padrão valeu, toda foto entre 1 e 2 MB — ou seja,
     * **toda foto de câmera de celular** — era recusada com `413 Body exceeded 1 MB limit`.
     * Achado por Bernardo Villas Boas no preview em 30/09/2026.
     *
     * ⚠️ **E O 413 NÃO VIRAVA MENSAGEM: ELE DERRUBAVA A TELA.** A recusa acontece no transporte,
     * antes de a ação rodar, então o `try/catch` de `enviarFoto` nunca a vê — a página inteira caía
     * no `error.tsx` com *"Algo falhou nesta tela"* (React #441). Medido no mesmo dia.
     *
     * ⚠️ **POR QUE 3 MB E NÃO 2:** o corpo carrega o arquivo **mais** o envelope `multipart` e o
     * identificador da ação, então um arquivo de exatamente 2.097.152 bytes produz um corpo
     * ligeiramente maior que 2 MB. Com o limite em `2mb`, quem barraria a foto no fio seria o
     * **transporte**, com o 413 genérico que derruba a tela — e não a **regra**, com a frase em
     * português. Quem decide o que é grande demais é o balde, e esta folga existe para que ele
     * continue sendo quem decide.
     */
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
