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
 * ⚠️ **A DICA É SÓ O VERBO** desde 24/10/2026 (RT-1 do Bloco 10, spec 025, D-16): *"ícones com dica; a dica é só o
 *    verbo"* — Bernardo Villas Boas. Ela sai do vocabulário (`ROTULO_DA_ACAO`: *Editar*, *Excluir*, *Desativar*…), e o
 *    **nome acessível** continua o rótulo inteiro (*"Excluir a turma C-Ap-FR 2026"*), que contém o verbo da dica
 *    (WCAG 2.5.3). Em *Novo* o verbo é a própria ação (*"Nova turma"*): *"Novo"* sozinho não diz nada.
 * ⚠️ **INDISPONÍVEL ≠ DESABILITADO** (D-13, D-COR-6): o botão com motivo (*"tem registros: use Arquivar"*) fica
 *    `aria-disabled`, focável e com a dica do motivo — um `disabled` de verdade não recebe ponteiro nem foco, e a dica
 *    nunca abriria. Ele não aciona nada: o clique e o `Enter` são engolidos aqui.
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
  BookMinus,
  BookPlus,
  CalendarCheck,
  CalendarDays,
  CalendarMinus,
  CalendarPlus,
  CalendarSearch,
  ChartColumn,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePause,
  Clock,
  Download,
  Eraser,
  Filter,
  FilterX,
  ImageOff,
  ImageUp,
  KeyRound,
  ListPlus,
  LoaderCircle,
  Merge,
  Minimize2,
  Monitor,
  Moon,
  Pause,
  Pencil,
  Play,
  Plus,
  Power,
  Printer,
  RotateCcw,
  Save,
  SquarePlus,
  Stamp,
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
  /* Spec 025 (RT-4): os painéis recolhíveis da página. */
  filtros: Filter,
  estatisticas: ChartColumn,
  "enviar-foto": ImageUp,
  "remover-foto": ImageOff,
  "abrir-dsa": CalendarDays,
  juntar: Merge,
  reiniciar: RotateCcw,
  "tema-claro": Sun,
  "tema-escuro": Moon,
  "tema-sistema": Monitor,
  avisos: Bell,
  /* Bloco 11 (RD-6): a barra do DSA — o regime de tempos, o Limpar semana e o Publicar. */
  regime: Clock,
  limpar: Eraser,
  publicar: Stamp,
  /* Bloco 11 (RD-7): a semana dos DSA publicados no Início, pelo calendário. */
  "escolher-semana": CalendarSearch,
  /*
   * Bloco 15 (spec 030, RT-1 emendada): a navegação também é ícone — as setas da semana e do carrossel, a semana de hoje,
   * o sábado do DSA, o Estudo Individual da semana, o rodapé do cartão do lançamento, a tela cheia e o Pausar.
   */
  voltar: ChevronLeft,
  avancar: ChevronRight,
  "esta-semana": CalendarCheck,
  "abrir-sabado": CalendarPlus,
  "fechar-sabado": CalendarMinus,
  "lancar-ei": BookPlus,
  "remover-ei": BookMinus,
  cancelar: X,
  fechar: X,
  "sair-da-tela-cheia": Minimize2,
  pausar: Pause,
  continuar: Play,
  /* Bloco 16 (spec 031, FR-001): o envio do formulário de lançamento do DSA, em ícone. */
  lancar: SquarePlus,
} as const satisfies Record<string, LucideIcon>;

export type AcaoDeIcone = keyof typeof ICONE_DA_ACAO;

/**
 * A dica de cada ação — **só o verbo** (RT-1 do Bloco 10). `null` quando o verbo é o próprio rótulo (*Novo*: *"Nova
 * turma"*, *"Novo curso"*).
 */
export const ROTULO_DA_ACAO: Readonly<Record<AcaoDeIcone, string | null>> = {
  editar: "Editar",
  excluir: "Excluir",
  desativar: "Desativar",
  reativar: "Reativar",
  imprimir: "Imprimir",
  salvar: "Salvar",
  novo: null,
  cadastrar: "Cadastrar",
  acrescentar: "Acrescentar",
  registrar: "Registrar",
  arquivar: "Arquivar",
  desarquivar: "Desarquivar",
  descartar: "Descartar",
  retirar: "Retirar",
  baixar: "Baixar",
  carregar: "Carregar",
  "redefinir-senha": "Redefinir senha",
  "trocar-situacao": "Trocar situação",
  desfazer: "Desfazer",
  "parar-dia": "Parar dia",
  "limpar-filtros": "Limpar filtros",
  filtros: "Filtros",
  estatisticas: "Estatísticas",
  "enviar-foto": "Enviar foto",
  "remover-foto": "Remover foto",
  "abrir-dsa": "Abrir o DSA",
  juntar: "Juntar",
  reiniciar: "Reiniciar",
  "tema-claro": "Tema claro",
  "tema-escuro": "Tema noturno",
  "tema-sistema": "Tema do sistema",
  avisos: "Avisos",
  regime: "Regime",
  limpar: "Limpar",
  publicar: "Publicar",
  "escolher-semana": "Escolher semana",
  voltar: "Voltar",
  avancar: "Avançar",
  "esta-semana": "Ir para esta semana",
  "abrir-sabado": "Abrir sábado",
  "fechar-sabado": "Fechar sábado",
  "lancar-ei": "Lançar EI",
  "remover-ei": "Remover EI",
  cancelar: "Cancelar",
  fechar: "Fechar",
  "sair-da-tela-cheia": "Sair da tela cheia",
  pausar: "Pausar",
  continuar: "Continuar",
  lancar: "Lançar",
};

/** A dica do botão: o verbo do vocabulário, ou o rótulo quando o verbo é ele (D-16). */
export function dicaDoBotao(acao: AcaoDeIcone, rotulo: string): string {
  return ROTULO_DA_ACAO[acao] ?? rotulo;
}

type Variante = "padrao" | "destrutivo" | "contorno" | "fantasma";

const VARIANTE_DO_BOTAO: Readonly<
  Record<Variante, "default" | "destructive" | "outline" | "ghost">
> = {
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
  /**
   * Com `href`, um `<a>` comum em vez do `Link` do Next — para a rota que devolve ARQUIVO ou redireciona para fora (o
   * currículo em PDF, a planilha de contingência): o roteador do cliente não navega para ela.
   */
  readonly nativo?: boolean;
  readonly variante?: Variante;
  /** Enquanto grava: o indicador de espera no lugar do ícone e o nome trocado. */
  readonly ocupado?: boolean;
  readonly rotuloOcupado?: string;
  /** De que lado a dica abre. */
  readonly ladoDaDica?: "top" | "bottom" | "left" | "right";
  /**
   * O motivo de a ação não estar disponível (D-13): o botão fica `aria-disabled`, não aciona nada, e a dica é o motivo.
   */
  readonly indisponivel?: string | null;
  readonly ref?: React.Ref<HTMLButtonElement>;
};

export function BotaoDeIcone({
  acao,
  rotulo,
  href,
  nativo = false,
  variante = "contorno",
  ocupado = false,
  rotuloOcupado = "Gravando…",
  ladoDaDica = "top",
  indisponivel = null,
  disabled,
  ref,
  ...props
}: BotaoDeIconeProps): React.ReactNode {
  const Icone = ocupado ? LoaderCircle : ICONE_DA_ACAO[acao];
  const nome = ocupado ? rotuloOcupado : rotulo;
  const dica = ocupado ? rotuloOcupado : (indisponivel ?? dicaDoBotao(acao, rotulo));
  const desenho = (
    <Icone
      aria-hidden
      className={ocupado ? "animate-spin motion-reduce:animate-none" : undefined}
    />
  );

  if (indisponivel !== null) {
    /* O clique de quem chama não chega aqui: o `onClick` abaixo vem depois do espalhamento e o substitui. */
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={ref}
            type="button"
            size="icon-sm"
            variant={VARIANTE_DO_BOTAO[variante]}
            aria-label={`${rotulo} — indisponível: ${indisponivel}`}
            aria-disabled="true"
            data-acao={acao}
            data-indisponivel="sim"
            {...props}
            className={`cursor-not-allowed opacity-50 ${props.className ?? ""}`}
            onClick={(e) => e.preventDefault()}
          >
            {desenho}
          </Button>
        </TooltipTrigger>
        <TooltipContent side={ladoDaDica}>{dica}</TooltipContent>
      </Tooltip>
    );
  }

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
            {nativo ? (
              <a href={href} aria-label={nome}>
                {desenho}
              </a>
            ) : (
              <Link href={href} aria-label={nome}>
                {desenho}
              </Link>
            )}
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
      <TooltipContent side={ladoDaDica}>{dica}</TooltipContent>
    </Tooltip>
  );
}
