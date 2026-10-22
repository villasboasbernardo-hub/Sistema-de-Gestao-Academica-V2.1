/**
 * O botão de ação padrão — **ícone, com a dica e o nome acessível iguais ao rótulo** (`FR-001` da spec 022).
 *
 * > *"Botões padrão como ÍCONE com dica (tooltip) e aria-label (editar, excluir, desativar, imprimir, salvar, novo,
 * > tema claro/escuro/sistema, cadastrar…), alinhados à DIREITA e no TOPO da página/tabela. Componente único + guarda
 * > para telas futuras. Em diálogo de confirmação destrutiva o texto continua."* — Bernardo Villas Boas, 22/10/2026
 *
 * ⚠️ **O ÍCONE SUBSTITUI O RÓTULO, E ISSO EMENDA UM REQUISITO** (A-1 da spec 022): o `FR-031` da fatia (b) do Épico 4
 *    dizia *"o ícone acompanha o rótulo, nunca o substitui"*. O rótulo não some: ele é o **nome acessível** (quem usa
 *    leitor de tela ouve o mesmo de antes) e a **dica** ao apontar e ao focar. A dica nunca é a única via: o nome
 *    acessível é.
 * ⚠️ **O VOCABULÁRIO É FECHADO** — cada ação tem UM ícone. Uma tela que escolhesse o próprio lápis faria o mesmo verbo
 *    ter dois desenhos, e é o que o pedido de "padrão" existe para impedir.
 * ⚠️ **REPASSA `ref` E AS PROPS AO BOTÃO**: é o que deixa ele ser o gatilho de `DialogoConfirmacao` e de `Dialog`
 *    (`asChild` do Radix clona o filho com o `onClick`, o `aria-expanded` e a `ref`). Um invólucro que engolisse as
 *    props faria o diálogo não abrir, sem erro.
 * ⚠️ **TAMANHO `icon-sm` (8 × 8)**, a mesma altura do `sm` (`h-8`): a barra que mistura os dois continua com as caixas
 *    do mesmo tamanho (`FR-006.1` da spec 016).
 * ⚠️ **OCUPADO:** o ícone vira o indicador de espera e o nome passa a *"Gravando…"* (ou o que vier), anunciado por
 *    `aria-busy` — sem isso, quem não vê o giro não sabe que a ação está em curso.
 */
"use client";

import * as React from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  ArrowLeftRight,
  Ban,
  Bell,
  CalendarDays,
  Check,
  CirclePause,
  Download,
  FilterX,
  ImageOff,
  ImageUp,
  KeyRound,
  ListPlus,
  LoaderCircle,
  Merge,
  Monitor,
  Moon,
  Pencil,
  Plus,
  Power,
  Printer,
  RotateCcw,
  Save,
  Sun,
  Trash2,
  Undo2,
  Upload,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** As ações padrão e o ícone de cada uma — um verbo, um desenho. */
export const ICONE_DA_ACAO = {
  editar: Pencil,
  excluir: Trash2,
  desativar: Ban,
  reativar: Power,
  imprimir: Printer,
  salvar: Save,
  novo: Plus,
  cadastrar: UserPlus,
  acrescentar: ListPlus,
  registrar: Check,
  arquivar: Archive,
  desarquivar: ArchiveRestore,
  descartar: X,
  retirar: X,
  baixar: Download,
  carregar: Upload,
  "redefinir-senha": KeyRound,
  "trocar-situacao": ArrowLeftRight,
  desfazer: Undo2,
  "parar-dia": CirclePause,
  "limpar-filtros": FilterX,
  "enviar-foto": ImageUp,
  "remover-foto": ImageOff,
  "abrir-dsa": CalendarDays,
  juntar: Merge,
  reiniciar: RotateCcw,
  "tema-claro": Sun,
  "tema-escuro": Moon,
  "tema-sistema": Monitor,
  avisos: Bell,
} as const satisfies Record<string, LucideIcon>;

export type AcaoDeIcone = keyof typeof ICONE_DA_ACAO;

type Variante = "padrao" | "destrutivo" | "contorno" | "fantasma";

const VARIANTE_DO_BOTAO: Readonly<Record<Variante, "default" | "destructive" | "outline" | "ghost">> =
  {
    padrao: "default",
    destrutivo: "destructive",
    contorno: "outline",
    fantasma: "ghost",
  };

export type BotaoDeIconeProps = Omit<React.ComponentProps<"button">, "children"> & {
  readonly acao: AcaoDeIcone;
  /** O nome acessível e a dica — o texto que o botão tinha. */
  readonly rotulo: string;
  /** Com endereço, é um link com cara de botão. */
  readonly href?: string;
  readonly variante?: Variante;
  /** Enquanto grava: o indicador de espera no lugar do ícone e o nome trocado. */
  readonly ocupado?: boolean;
  readonly rotuloOcupado?: string;
  /** De que lado a dica abre. */
  readonly ladoDaDica?: "top" | "bottom" | "left" | "right";
  readonly ref?: React.Ref<HTMLButtonElement>;
};

export function BotaoDeIcone({
  acao,
  rotulo,
  href,
  variante = "contorno",
  ocupado = false,
  rotuloOcupado = "Gravando…",
  ladoDaDica = "top",
  disabled,
  ref,
  ...props
}: BotaoDeIconeProps): React.ReactNode {
  const Icone = ocupado ? LoaderCircle : ICONE_DA_ACAO[acao];
  const nome = ocupado ? rotuloOcupado : rotulo;
  const desenho = (
    <Icone aria-hidden className={ocupado ? "animate-spin motion-reduce:animate-none" : undefined} />
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href !== undefined && !disabled ? (
          <Button
            asChild
            size="icon-sm"
            variant={VARIANTE_DO_BOTAO[variante]}
            data-acao={acao}
            {...(props as React.ComponentProps<typeof Button>)}
          >
            <Link href={href} aria-label={nome}>
              {desenho}
            </Link>
          </Button>
        ) : (
          <Button
            ref={ref}
            type="button"
            size="icon-sm"
            variant={VARIANTE_DO_BOTAO[variante]}
            aria-label={nome}
            aria-busy={ocupado || undefined}
            disabled={disabled || ocupado}
            data-acao={acao}
            {...props}
          >
            {desenho}
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent side={ladoDaDica}>{nome}</TooltipContent>
    </Tooltip>
  );
}
