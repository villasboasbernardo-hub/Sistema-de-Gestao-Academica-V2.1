/**
 * O menu do avatar — **a saída do sistema** (`FR-001` a `FR-004`, `FR-010`).
 *
 * ⚠️ **ESTE ARQUIVO EXISTE POR UM DEFEITO MEDIDO NA TELA, NÃO POR UMA IDEIA DE PRODUTO.** Bernardo
 * entrou pelo preview em 29/09/2026 e **não conseguiu sair**: a Server Action `encerrarSessao()`
 * estava escrita desde o Épico 3 e tinha **ZERO consumidores** no repositório inteiro — código
 * correto, testado, e inalcançável por quem usa. É a mesma família do achado da fatia (c) do Épico
 * 5, *"tela sem caminho clicável até ela é tela NÃO ENTREGUE"*, aplicada a uma ação em vez de a uma
 * rota. Trocar de usuário passa a ser sair e entrar de novo (`FR-003`).
 *
 * ⚠️ **É FOLHA DE CLIENTE, e por isso é arquivo próprio.** `cabecalho-do-app.tsx` e
 * `casca-do-app.tsx` são servidor, e um `"use client"` em qualquer um deles mandaria o catálogo
 * inteiro de telas para o pacote do navegador — erro que **não aparece na checagem de tipos**, só no
 * build.
 *
 * ⚠️ **A AÇÃO DE SAIR CHEGA POR PROPRIEDADE, e NÃO por importação.** A primeira escrita deste
 * arquivo importava `encerrarSessao` de `@/lib/acoes/sessao`, e **duas guardas reprovaram na hora**:
 * `fronteira-casca.test.ts` e `fronteira-componentes.test.ts` proíbem `@/lib/acoes/` em componente,
 * porque *"o componente recebe dado por propriedade e não conhece origem"* (Princípio XI). A
 * proibição está certa e o conserto é o desenho certo: quem conhece a ação é `app/(app)/layout.tsx`,
 * e ela desce como qualquer outra propriedade. Server Action atravessa a fronteira servidor/cliente
 * — é para isso que ela é serializável.
 *
 * ⚠️ **A FOTO CHEGA PRONTA, como endereço temporário.** O balde é privado: não há URL adivinhável, e
 * o endereço assinado vence. Quem o pede é o servidor, uma vez por requisição; este componente só o
 * desenha. Sem foto, o recuo mostra as iniciais (`FR-010`) — que é o estado normal, não o de erro.
 */
"use client";

import * as React from "react";
import Link from "next/link";

import { Avatar, AvatarImagem, AvatarRecuo } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { iniciaisDoNome } from "@/lib/dominio/iniciais-do-nome";
import { rotuloDoPerfil } from "@/lib/dominio/perfis";

export function MenuDoAvatar({
  nome,
  email,
  perfil,
  fotoUrl,
  aoSair,
}: {
  readonly nome: string;
  readonly email: string;
  readonly perfil: string;
  readonly fotoUrl: string | null;
  /** A Server Action que encerra a sessão. Vem do layout; este componente não sabe de onde. */
  readonly aoSair: () => Promise<void>;
}) {
  const [saindo, iniciarSaida] = React.useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-slot="gatilho-do-menu-do-avatar"
        // ⚠️ O rótulo acessível traz o NOME. "Abrir menu" obrigaria quem usa leitor de tela a abrir
        //    o menu para descobrir de quem é a conta — que é a informação que o menu existe para dar.
        aria-label={`Conta de ${nome}`}
        className="focus-visible:ring-marca rounded-full focus-visible:ring-2 focus-visible:outline-none"
      >
        <Avatar>
          {fotoUrl ? <AvatarImagem src={fotoUrl} alt="" /> : null}
          <AvatarRecuo>{iniciaisDoNome(nome)}</AvatarRecuo>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        {/* A identificação é rótulo, não item: ela não é clicável, e não deve receber o foco das
            setas junto com as ações. */}
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-texto truncate text-sm font-semibold">{nome}</span>
          <span className="text-texto-suave truncate text-xs font-normal">{email}</span>
          {/* veste: rótulo do perfil de quem está na conta — identificação, não dado de negócio */}
          <span className="text-texto-tenue truncate text-2xs font-normal">
            {rotuloDoPerfil(perfil)}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/perfil" className="cursor-pointer">
            Meu perfil
          </Link>
        </DropdownMenuItem>

        {/*
          ⚠️ `onSelect` com `preventDefault` não é firula: sem ele o menu fecha ANTES de a transição
             começar, e a tela fica sem nada indicando que a saída está em curso. Aqui ele fecha
             quando o servidor responde — com o redirecionamento.
        */}
        <DropdownMenuItem
          data-slot="sair"
          disabled={saindo}
          onSelect={(evento) => {
            evento.preventDefault();
            iniciarSaida(() => {
              void aoSair();
            });
          }}
          className="cursor-pointer"
        >
          {saindo ? "Saindo…" : "Sair"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
