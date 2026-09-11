/**
 * O recorte do panorama, **na URL** (`RF-INI-02`, `FR-029`, `FR-045`).
 *
 * ⚠️ **FOLHA DE CLIENTE, E SÓ ELA.** A página é servidor e continua sendo: o que precisa de
 * navegador é o `<select>` e a escrita na barra de endereço. `page.tsx` não leva marcador.
 *
 * ⚠️ **O SINAL DE ESPERA VEM DO GANCHO, e é o `FR-045`.** Estes dois parâmetros avisam o servidor —
 * trocar o recorte é ida ao banco. Sem sinal, a tela fica muda entre o comando e a resposta, e a
 * pessoa clica de novo. **O que estraga não é a latência, é o silêncio.**
 */
"use client";

import { CLASSIFICACOES, MODALIDADES } from "@/lib/navegacao/contrato";
import { useParametro } from "@/lib/navegacao/usar-parametro";

const CAMPO =
  "border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none";

export function FiltroDoPanorama() {
  const [classificacao, definirClassificacao, esperandoClassificacao] = useParametro(
    "/inicio",
    "classificacao",
  );
  const [modalidade, definirModalidade, esperandoModalidade] = useParametro(
    "/inicio",
    "modalidade",
  );
  const esperando = esperandoClassificacao || esperandoModalidade;

  return (
    <div
      data-slot="filtro-do-panorama"
      data-esperando={esperando ? "sim" : "nao"}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="filtro-classificacao" className="text-texto-suave text-xs">
          Classificação
        </label>
        <select
          id="filtro-classificacao"
          className={CAMPO}
          value={classificacao}
          onChange={(e) => void definirClassificacao(e.target.value === "" ? null : e.target.value)}
        >
          <option value="">Todas</option>
          {CLASSIFICACOES.map((c) => (
            <option key={c} value={c}>
              {c.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filtro-modalidade" className="text-texto-suave text-xs">
          Modalidade
        </label>
        <select
          id="filtro-modalidade"
          className={CAMPO}
          value={modalidade}
          onChange={(e) => void definirModalidade(e.target.value === "" ? null : e.target.value)}
        >
          <option value="">Todas</option>
          {MODALIDADES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/*
        ⚠️ O SINAL É TEXTO, E NÃO SÓ MOVIMENTO. Um giro sem rótulo não é lido por leitor de tela, e
        `aria-live` sobre um elemento que some é anúncio que chega pela metade. Ele ocupa lugar fixo
        para a linha não pular quando aparece.
      */}
      <p role="status" aria-live="polite" className="text-texto-suave min-h-5 text-xs">
        {esperando ? "Atualizando o panorama…" : ""}
      </p>
    </div>
  );
}
