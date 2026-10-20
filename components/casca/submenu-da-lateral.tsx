"use client";

/**
 * O submenu da lateral — spec 019 (Bloco 4), C-12 a C-15: *Cursos* → classificação → curso e *Turmas* → turma,
 * expandindo dentro da própria lateral.
 *
 * ⚠️ **TURMAS É LISTA, NÃO ÁRVORE** (ajuste A-5 da conferência de 20/10/2026, Bernardo Villas Boas): *"sem o nível do
 *    curso — lista direto as turmas do ANO VIGENTE (…), não arquivadas, em ordem natural"*. *Cursos* continua com a
 *    classificação no meio.
 * ⚠️ **FOLHA DE CLIENTE PELO MESMO MOTIVO DE `EntradaDoMenu`**: o ativo é o caminho do navegador (`usePathname`), e o
 *    layout não é redesenhado na navegação por clique. O aberto/fechado é estado de tela — não vai para a URL (C-12).
 * ⚠️ **A ÁRVORE CHEGA PRONTA, POR PROPRIEDADE** (Princípio XI; `fronteira-casca`): quem a lê é o layout, pela RLS.
 * ⚠️ **`data-subentrada`, NUNCA `data-entrada`**: os percursos da lateral contam `[data-entrada]` como as entradas do
 *    menu, na ordem da `D-NAV-1`; uma subentrada com o mesmo atributo seria uma entrada a mais.
 * ⚠️ **SÓ COM A LATERAL EXPANDIDA** (C-13): recolhida, ela mostra os ícones, e *Cursos* e *Turmas* continuam links
 *    para as listas. As condições de expansão são as mesmas de `painel-retratil.tsx` e do rótulo de
 *    `navegacao-lateral.tsx` — com o foco numa subentrada somado a elas —, e as três têm de dizer a mesma coisa.
 * ⚠️ **O ATIVO É TRAÇO E PESO** (C-15), sem o fundo cheio da entrada: na página de um curso, a entrada *Cursos* já está
 *    cheia, e dois fundos cheios na lateral não diriam qual dos dois é a página.
 */
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { cn } from "cn";

import {
  ramoDoCaminho,
  type GrupoDoSubmenu,
  type ItemDoSubmenu,
} from "@/lib/dominio/submenu-da-lateral";

/** Visível só com a lateral expandida (no desktop); na gaveta do celular, sempre. */
const SO_EXPANDIDA = cn(
  "lg:hidden",
  "lg:group-[[data-apontar=livre]:hover]:block",
  "lg:group-has-[[data-entrada]:focus-visible]:block",
  "lg:group-has-[[data-subentrada]:focus-visible]:block",
  "lg:group-data-[fixada=true]:block",
);

const ROTULO_DO_BOTAO = { cursos: "Abrir os cursos", turmas: "Abrir as turmas" } as const;

/** Os links de uma lista — o mesmo desenho em *Cursos* (dentro da classificação) e em *Turmas* (direto). */
function ListaDeItens({
  id,
  itens,
  ativo,
  className,
}: {
  readonly id: string;
  readonly itens: readonly ItemDoSubmenu[];
  readonly ativo: string | null;
  readonly className?: string;
}) {
  return (
    <ul id={id} className={cn("flex flex-col", className)}>
      {itens.map((i) => {
        const eAtivo = ativo === i.rota;
        return (
          <li key={i.rota}>
            <Link
              href={i.rota}
              data-subentrada={i.rota}
              {...(i.titulo ? { title: i.titulo } : {})}
              {...(eAtivo ? { "aria-current": "page" as const } : {})}
              className={cn(
                "rounded-ciaara-sm block truncate border-l-2 px-2 py-1 text-xs",
                "focus-visible:ring-marca focus-visible:ring-2 focus-visible:outline-none",
                eAtivo
                  ? "border-marca text-texto font-semibold"
                  : "text-texto-suave hover:bg-marca-suave hover:text-texto border-transparent",
              )}
            >
              {i.rotulo}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SubmenuDaLateral(
  props:
    | { readonly raiz: "cursos"; readonly grupos: readonly GrupoDoSubmenu[] }
    | { readonly raiz: "turmas"; readonly itens: readonly ItemDoSubmenu[] },
) {
  const { raiz } = props;
  const caminho = usePathname() ?? "/";
  const ramo = ramoDoCaminho(caminho, {
    cursos: props.raiz === "cursos" ? props.grupos : [],
    turmas: props.raiz === "turmas" ? props.itens : [],
  });
  /*
   * ⚠️ **ABERTO = O QUE A PESSOA ESCOLHEU, SENÃO O RAMO DA PÁGINA** — derivado a cada desenho, sem efeito: ao navegar,
   *    o ramo da página nova abre sozinho, e o que a pessoa abriu ou fechou à mão continua como ela deixou.
   */
  const [escolhas, definirEscolhas] = React.useState<ReadonlyMap<string, boolean>>(() => new Map());
  const abertos = {
    has: (chave: string) => escolhas.get(chave) ?? ramo.abertos.includes(chave),
  };

  const vazio = props.raiz === "cursos" ? props.grupos.length === 0 : props.itens.length === 0;
  if (vazio) return null;

  const alternar = (chave: string) =>
    definirEscolhas((atuais) => new Map(atuais).set(chave, !abertos.has(chave)));

  const idDaRaiz = `submenu-${raiz}`;
  const raizAberta = abertos.has(raiz);

  return (
    <>
      <button
        type="button"
        aria-expanded={raizAberta}
        aria-controls={idDaRaiz}
        aria-label={ROTULO_DO_BOTAO[raiz]}
        data-subentrada={`expandir:${raiz}`}
        data-slot="expandir-submenu"
        onClick={() => alternar(raiz)}
        className={cn(
          SO_EXPANDIDA,
          "text-texto-suave hover:text-texto rounded-ciaara-sm absolute top-1.5 right-1 p-1",
          "focus-visible:ring-marca focus-visible:ring-2 focus-visible:outline-none",
        )}
      >
        {raizAberta ? (
          <ChevronDownIcon aria-hidden="true" className="size-4" />
        ) : (
          <ChevronRightIcon aria-hidden="true" className="size-4" />
        )}
      </button>

      {!raizAberta ? null : props.raiz === "turmas" ? (
        <div
          data-slot="submenu"
          data-raiz="turmas"
          className={cn(SO_EXPANDIDA, "mt-0.5 ml-5 border-l pl-1")}
        >
          <ListaDeItens id={idDaRaiz} itens={props.itens} ativo={ramo.ativo} />
        </div>
      ) : (
        <ul
          id={idDaRaiz}
          data-slot="submenu"
          data-raiz="cursos"
          className={cn(SO_EXPANDIDA, "mt-0.5 ml-5 flex flex-col gap-0.5 border-l pl-1")}
        >
          {props.grupos.map((g) => {
            const chave = `${raiz}:${g.chave}`;
            const aberto = abertos.has(chave);
            const idDoGrupo = `submenu-${raiz}-${g.chave}`;
            return (
              <li key={g.chave}>
                <button
                  type="button"
                  aria-expanded={aberto}
                  aria-controls={idDoGrupo}
                  data-subentrada={`grupo:${chave}`}
                  data-slot="grupo-do-submenu"
                  data-grupo={g.chave}
                  onClick={() => alternar(chave)}
                  className={cn(
                    "text-texto-suave hover:text-texto rounded-ciaara-sm flex w-full items-center gap-1 px-2 py-1 text-left text-xs",
                    "focus-visible:ring-marca focus-visible:ring-2 focus-visible:outline-none",
                  )}
                >
                  {aberto ? (
                    <ChevronDownIcon aria-hidden="true" className="size-3 shrink-0" />
                  ) : (
                    <ChevronRightIcon aria-hidden="true" className="size-3 shrink-0" />
                  )}
                  <span className="truncate">{g.rotulo}</span>
                </button>
                {aberto ? (
                  <ListaDeItens
                    id={idDoGrupo}
                    itens={g.itens}
                    ativo={ramo.ativo}
                    className="ml-4"
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
