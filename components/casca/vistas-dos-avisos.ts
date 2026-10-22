/**
 * O "visto" dos avisos, **neste navegador** (spec 022, Bloco 7, D-10): *"volta só com aviso novo ("visto" no navegador,
 * sem banco)"*.
 *
 * ⚠️ **O ARMAZENAMENTO DO NAVEGADOR PODE FALTAR** (janela privada, dado do site bloqueado): toda leitura e escrita vai em
 *    `try/catch`, e sem ele as vistas valem vazias — o sininho pulsa enquanto houver aviso, que é o lado seguro.
 * ⚠️ **O EVENTO AVISA O SININHO** quando a página Avisos marca as vistas: o cabeçalho não se redesenha ao navegar, e
 *    sem o evento o pulso continuaria até a próxima leitura do resumo.
 */
import { juntarVistas } from "@/lib/dominio/avisos/central";

const CHAVE = "ciaara.avisos.vistos";
export const EVENTO_DE_VISTAS = "ciaara:avisos-vistos";

export type ResumoDosAvisos = { readonly total: number; readonly chaves: readonly string[] };

export function lerVistas(): readonly string[] {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    const lido: unknown = bruto === null ? [] : JSON.parse(bruto);
    return Array.isArray(lido) ? lido.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Marca como vistas as chaves mostradas e avisa o sininho, com o resumo de agora. */
export function marcarComoVistas(resumo: ResumoDosAvisos): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(juntarVistas(lerVistas(), resumo.chaves)));
  } catch {
    /* Sem armazenamento, o pulso volta na próxima leitura — o número continua certo. */
  }
  window.dispatchEvent(new CustomEvent<ResumoDosAvisos>(EVENTO_DE_VISTAS, { detail: resumo }));
}
