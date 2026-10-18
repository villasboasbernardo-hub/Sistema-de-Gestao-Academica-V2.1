/**
 * Uma entrada do menu lateral — o link e a marcação do ativo, pelo caminho do NAVEGADOR.
 *
 * > *"Só «Início» fica marcado; ao ir para Turmas, Cursos, Disciplinas ou Instrutores, nada fica
 * > azul."* — conferência do PR #67, Bernardo Villas Boas, 17/10/2026
 *
 * ⚠️ **POR QUE ELA É FOLHA DE CLIENTE.** Até 17/10/2026 o ativo era decidido no servidor, com o
 * caminho que `app/(app)/layout.tsx` lia do cabeçalho da requisição — e o App Router **não redesenha o
 * layout** na navegação por clique entre páginas filhas: o ativo ficava preso à primeira página
 * carregada. O defeito era anterior à spec 016 e ficou à vista com a cor nova do item 1.2. O caminho
 * certo, sempre atual, é o do navegador (`usePathname`), e ele só existe em componente de cliente.
 *
 * ⚠️ **ELA É PEQUENA DE PROPÓSITO**: decide só o ativo e desenha o link. O ícone e o rótulo chegam
 * prontos por `children`, do servidor (`navegacao-lateral.tsx`, que continua sem marcador), e a regra
 * é a única que existe — `entradaAtiva()`, em `lib/navegacao/menu.ts`.
 *
 * ⚠️ **`aria-current` E `data-entrada` NO MESMO ELEMENTO**, o link: os percursos de ponta a ponta e o
 * CSS da lateral (`has-[[data-entrada]:focus-visible]`) dependem disso.
 */
"use client";

import type * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

import { entradaAtiva } from "@/lib/navegacao/menu";

export function EntradaDoMenu({
  rota,
  children,
}: {
  readonly rota: string;
  readonly children: React.ReactNode;
}) {
  const caminho = usePathname() ?? "/";
  const estaAtiva = entradaAtiva(caminho)?.rota === rota;

  return (
    <Link
      href={rota}
      data-entrada={rota}
      {...(estaAtiva ? { "aria-current": "page" as const } : {})}
      className={cn(
        "rounded-ciaara-sm flex items-center gap-2 border-l-2 px-3 py-2 text-sm",
        "focus-visible:ring-marca focus-visible:ring-2 focus-visible:outline-none",
        /*
         * ⚠️ **O ATIVO É `--marca` CHEIO DESDE 17/10/2026** (spec 016, item 1.2, `RF-DS-03`). Era
         *    `--marca-suave` sobre a lateral `--superficie-2`: 1,01:1 no claro e 1,06:1 no escuro,
         *    medidos — o ativo só se distinguia pelo traço. Os pares auditados são o C-4 (texto sobre
         *    o ativo) e o C-5 (o ativo contra a lateral).
         * ⚠️ **O REALCE DE PASSAR O PONTEIRO É SÓ DOS INATIVOS**: no ativo, o `hover` apagaria o
         *    destaque justamente quando a pessoa aponta para ele.
         */
        estaAtiva
          ? "border-marca bg-marca text-marca-contraste font-medium"
          : "text-texto-suave hover:bg-marca-suave hover:text-texto border-transparent",
      )}
    >
      {children}
    </Link>
  );
}
