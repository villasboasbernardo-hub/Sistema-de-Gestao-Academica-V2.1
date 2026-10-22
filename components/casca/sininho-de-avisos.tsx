/**
 * O sininho de avisos no cabeçalho de toda tela (spec 022, Bloco 7, FR-004.1 e FR-004.2) — folha de cliente.
 *
 * > *"SININHO DE AVISOS no cabeçalho, padrão em todo o sistema: número de avisos, pulso sutil em tons da mesma cor
 * > enquanto houver aviso não visto (respeita "reduzir movimento"), para ao abrir; volta só com aviso novo ("visto" no
 * > navegador, sem banco)."* — Bernardo Villas Boas, 22/10/2026
 *
 * ⚠️ **O CABEÇALHO NÃO SE REDESENHA AO NAVEGAR** (o layout fica): o sininho pede o resumo ao montar e a cada troca de
 *    rota, **no máximo uma vez a cada 2 minutos** (D-9) — e a página Avisos o atualiza na hora, pelo evento de vistas.
 * ⚠️ **O PULSO NUNCA É A ÚNICA VIA** (`RNF-USA-05`): o número está escrito, e o nome acessível diz *"com aviso novo"*.
 *    Com *reduzir movimento*, o pulso para (`motion-reduce:animate-none`) e o resto fica.
 * ⚠️ **SEM RESUMO, SEM NÚMERO** — a leitura que falha não vira zero, que afirmaria que não há aviso (gotcha 4).
 * ⚠️ **SÓ TOKEN DE COR**: o pulso alterna em tons do mesmo trio (`atrasado`), como o pedido.
 */
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

import { haAvisoNovo, rotuloDoSininho } from "@/lib/dominio/avisos/central";
import { enderecoDoResumoDosAvisos, enderecoDosAvisos } from "@/lib/navegacao/endereco-dos-avisos";

import { EVENTO_DE_VISTAS, lerVistas, type ResumoDosAvisos } from "./vistas-dos-avisos";

const INTERVALO_MINIMO_MS = 2 * 60 * 1000;

export function SininhoDeAvisos() {
  const caminho = usePathname();
  const [resumo, definirResumo] = React.useState<ResumoDosAvisos | null>(null);
  const [vistas, definirVistas] = React.useState<readonly string[]>([]);
  const ultimaLeitura = React.useRef(0);

  /* As vistas do navegador entram junto com o resumo (na resposta e no evento): sem resumo, o sininho não as usa. */
  React.useEffect(() => {
    const aoMarcar = (e: Event) => {
      const detalhe = (e as CustomEvent<ResumoDosAvisos>).detail;
      if (detalhe) {
        definirResumo(detalhe);
        ultimaLeitura.current = Date.now();
      }
      definirVistas(lerVistas());
    };
    window.addEventListener(EVENTO_DE_VISTAS, aoMarcar);
    return () => window.removeEventListener(EVENTO_DE_VISTAS, aoMarcar);
  }, []);

  React.useEffect(() => {
    if (Date.now() - ultimaLeitura.current < INTERVALO_MINIMO_MS) return;
    ultimaLeitura.current = Date.now();
    let vivo = true;
    fetch(enderecoDoResumoDosAvisos(), { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<ResumoDosAvisos>) : null))
      .then((lido) => {
        if (vivo && lido && Array.isArray(lido.chaves)) {
          definirResumo({ total: Number(lido.total) || 0, chaves: lido.chaves });
          definirVistas(lerVistas());
        }
      })
      .catch(() => {
        /* Sem resumo, sem número; a próxima troca de rota tenta de novo. */
        ultimaLeitura.current = 0;
      });
    return () => {
      vivo = false;
    };
  }, [caminho]);

  const total = resumo?.total ?? null;
  const novo = resumo !== null && haAvisoNovo(resumo.chaves, vistas);
  const rotulo = total === null ? "Avisos" : rotuloDoSininho(total, novo);

  return (
    <Link
      href={enderecoDosAvisos()}
      aria-label={rotulo}
      title={rotulo}
      data-slot="sininho-de-avisos"
      data-novo={novo ? "sim" : "nao"}
      data-total={total ?? ""}
      className="text-texto-suave hover:text-texto focus-visible:ring-marca rounded-ciaara relative inline-flex size-8 items-center justify-center focus-visible:ring-2 focus-visible:outline-none"
    >
      <Bell
        aria-hidden
        className={
          novo ? "text-atrasado-tinta animate-pulse motion-reduce:animate-none size-5" : "size-5"
        }
      />
      {total !== null && total > 0 ? (
        <span
          aria-hidden
          data-slot="numero-de-avisos"
          className={
            novo
              ? "bg-atrasado-fundo text-atrasado-tinta border-atrasado-borda absolute -top-1 -right-1 min-w-4 rounded-full border px-1 text-[10px] leading-4 font-semibold"
              : "bg-superficie-2 text-texto-suave border-borda absolute -top-1 -right-1 min-w-4 rounded-full border px-1 text-[10px] leading-4 font-semibold"
          }
        >
          {total > 99 ? "99+" : total}
        </span>
      ) : null}
    </Link>
  );
}
