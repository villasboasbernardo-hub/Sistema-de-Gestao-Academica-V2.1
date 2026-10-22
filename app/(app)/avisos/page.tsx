/**
 * A página **Avisos** — todos os avisos do sistema, agrupados por módulo, cada um com o link para onde se resolve
 * (spec 022, Bloco 7, FR-004.3).
 *
 * > *"Clique leva a uma página só de avisos, agrupados por módulo, cada um com link para onde se resolve. Os quadros de
 * > aviso das páginas saem (sem perder nenhum aviso: liste os que existem hoje e onde passam a aparecer)."*
 * > — Bernardo Villas Boas, 22/10/2026
 *
 * ⚠️ **AUTORIZAÇÃO A-2 DA SPEC 022**: os quadros saíram das páginas, e isso emenda o `RF-INI-04`, o `RF-INSTR-09` e o
 *    `RNF-USA-04` — o que fica sempre visível é a CONTAGEM, no sininho de toda tela; a lista está a um clique.
 * ⚠️ **"NÃO PUDE LER" É DITO, NUNCA ZERO** (gotcha 4): o módulo cuja leitura falhou aparece como tal, e "nenhum aviso"
 *    só se diz quando tudo foi lido.
 * ⚠️ **ABRIR A PÁGINA MARCA COMO VISTOS** os avisos dela, neste navegador (D-10) — o sininho para de pulsar.
 * ⚠️ **AVISO NÃO BLOQUEIA NADA** (`RN-DEG-02`): é lista de leitura, com links.
 * ⚠️ **SEM MARCADOR DE CLIENTE.** A leitura é do servidor; a marcação de visto é uma folha sem desenho.
 */
import Link from "next/link";

import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { agruparPorModulo, ROTULO_DO_MODULO } from "@/lib/dominio/avisos/central";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { lerAvisos } from "./leitura";
import { MarcarComoVistos } from "./MarcarComoVistos";

export default async function Avisos() {
  const supabase = await criarClienteDeServidor();
  const { avisos, naoLidos } = await lerAvisos(supabase, hojeNaCiaara());
  const grupos = agruparPorModulo(avisos);

  return (
    <section className="flex flex-col gap-5" data-slot="pagina-de-avisos">
      <header className="flex flex-col gap-1">
        <h1 className="text-texto text-lg font-semibold">Avisos</h1>
        <p className="text-texto-suave text-sm" data-slot="total-de-avisos">
          {avisos.length === 0
            ? "Nenhum aviso."
            : `${avisos.length} ${avisos.length === 1 ? "aviso" : "avisos"}. Cada um leva para onde se resolve.`}
        </p>
      </header>

      <MarcarComoVistos chaves={avisos.map((a) => a.chave)} />

      {naoLidos.length > 0 ? (
        <p role="alert" className="text-atrasado-tinta text-sm" data-slot="avisos-nao-lidos">
          Não pude ler agora os avisos de {naoLidos.map((m) => ROTULO_DO_MODULO[m]).join(", ")} —
          não quer dizer que não haja. Recarregue a página.
        </p>
      ) : null}

      {grupos.length === 0 && naoLidos.length === 0 ? (
        <EstadoVazio
          motivo="sem-dado"
          titulo="Nenhum aviso"
          detalhe="Nada pede atenção agora nos cursos, nas turmas, nas avaliações nem nos instrutores que você alcança."
        />
      ) : null}

      {grupos.map((g) => (
        <section
          key={g.modulo}
          aria-labelledby={`avisos-${g.modulo}`}
          className="flex flex-col gap-2"
          data-modulo={g.modulo}
        >
          <h2
            id={`avisos-${g.modulo}`}
            className="text-texto flex items-baseline gap-2 text-base font-semibold"
          >
            {g.rotulo}
            <span className="text-texto-suave text-sm font-normal" data-slot="contagem-do-modulo">
              {g.avisos.length}
            </span>
          </h2>
          <ul className="border-borda rounded-ciaara flex flex-col border">
            {g.avisos.map((a) => (
              <li
                key={a.chave}
                className="border-borda flex flex-col gap-0.5 border-b px-3 py-2 last:border-b-0"
                data-aviso={a.chave}
              >
                <Link
                  href={a.destino}
                  className="text-texto text-sm font-medium underline-offset-2 hover:underline"
                >
                  {a.titulo}
                </Link>
                {a.detalhe ? <span className="text-texto-suave text-sm">{a.detalhe}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
