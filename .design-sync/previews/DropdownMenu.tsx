import * as React from "react";
import {
  Avatar,
  AvatarRecuo,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "ciaara-11-ds";
import { ChevronDownIcon, FileTextIcon, PrinterIcon } from "lucide-react";

/*
 * O padding é da composição, não do cartão: com o menu aberto, a trava de rolagem do Radix zera o
 * padding do <body>, e o fundo encostaria no canto da tela.
 */
function Fundo({ children }: { readonly children: React.ReactNode }) {
  return <div className="p-6">{children}</div>;
}

function Cabecalho({ children }: { readonly children: React.ReactNode }) {
  return (
    <Fundo>
      <div className="border-borda bg-superficie rounded-ciaara flex items-center justify-between gap-4 border px-4 py-2">
        <span className="text-texto text-sm font-semibold">
          CIAARA-11 · Administração Acadêmica
        </span>
        {children}
      </div>
    </Fundo>
  );
}

function MenuDaConta({ saindo }: { readonly saindo: boolean }) {
  return (
    <Cabecalho>
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger
          aria-label="Conta de Marina Duarte"
          className="focus-visible:ring-marca rounded-full focus-visible:ring-2 focus-visible:outline-none"
        >
          <Avatar>
            <AvatarRecuo>MD</AvatarRecuo>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-texto truncate text-sm font-semibold">Marina Duarte</span>
            <span className="text-texto-suave truncate text-xs font-normal">
              marina.duarte@ciaara.example
            </span>
            <span className="text-texto-tenue truncate text-2xs font-normal">
              Encarregado da Administração Acadêmica
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer">Meu perfil</DropdownMenuItem>
          <DropdownMenuItem disabled={saindo} className="cursor-pointer">
            {saindo ? "Saindo…" : "Sair"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Cabecalho>
  );
}

export function ContaDoUsuario() {
  return <MenuDaConta saindo={false} />;
}

export function Saindo() {
  return <MenuDaConta saindo />;
}

export function DocumentosParaImprimir() {
  return (
    <Fundo>
      <div className="flex items-center gap-3">
        <span className="text-texto text-sm font-semibold">Turma C-Ap-HN 2026</span>
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <PrinterIcon aria-hidden="true" />
              Imprimir
              <ChevronDownIcon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Documentos oficiais</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <FileTextIcon aria-hidden="true" className="text-texto-suave size-4" />
              DSA da semana 34
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileTextIcon aria-hidden="true" className="text-texto-suave size-4" />
              LIQ
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileTextIcon aria-hidden="true" className="text-texto-suave size-4" />
              OS de Instrutoria
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileTextIcon aria-hidden="true" className="text-texto-suave size-4" />
              Ficha de Docentes
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Fundo>
  );
}
