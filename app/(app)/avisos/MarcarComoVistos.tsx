/**
 * Abrir a página Avisos marca como vistas, **neste navegador**, as chaves que ela mostra (spec 022, D-10) — folha de
 * cliente, sem desenho nenhum.
 *
 * ⚠️ É o que para o pulso do sininho: *"para ao abrir; volta só com aviso novo"*.
 */
"use client";

import { useEffect } from "react";

import { marcarComoVistas } from "@/components/casca/vistas-dos-avisos";

export function MarcarComoVistos({ chaves }: { readonly chaves: readonly string[] }) {
  /* A lista em texto: o efeito roda de novo só quando o conjunto de avisos muda, não a cada desenho. */
  const assinatura = chaves.join("\n");
  useEffect(() => {
    const lidas = assinatura === "" ? [] : assinatura.split("\n");
    marcarComoVistas({ total: lidas.length, chaves: lidas });
  }, [assinatura]);
  return null;
}
