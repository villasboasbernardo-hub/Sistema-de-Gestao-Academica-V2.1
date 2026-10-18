"use client";

/**
 * O campo de senha com o olho — **mostrar e ocultar o que se digitou** (FR-003 da spec 016, item 1.3).
 *
 * > *"Botão de olho que mostra e oculta a senha, no login e na troca do primeiro acesso."*
 * > — item 1.3 do plano de correções, Bernardo Villas Boas, 16/10/2026
 *
 * ⚠️ **É FOLHA DE CLIENTE PORQUE O OLHO É ESTADO**: alternar o `type` do campo é interação, e só ela.
 * Quem usa — o login e a senha nova — já é folha, então o marcador não contamina nada a mais.
 *
 * ⚠️ **O BOTÃO É `type="button"`.** Dentro de um `<form>`, um botão sem tipo é de envio: acionar o olho
 * mandaria o formulário com a senha pela metade.
 *
 * ⚠️ **O NOME DIZ O ESTADO, E SÓ ELE** (*"Mostrar senha"* / *"Ocultar senha"*): com `aria-pressed`
 * junto, o leitor de tela anunciaria o estado duas vezes. E nenhum dos dois nomes casa com
 * `/entrar/i` nem com `/trocar senha/i`, que é como as suítes acham os botões de envio.
 *
 * ⚠️ **AS PROPRIEDADES DO CAMPO PASSAM INTEIRAS** (`name`, `id`, `autoComplete`, `required`), menos o
 * `type`, que é deste componente.
 */
import * as React from "react";
import { cn } from "cn";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";

export type CampoDeSenhaProps = Omit<React.ComponentProps<"input">, "type">;

export function CampoDeSenha({ className, ...props }: CampoDeSenhaProps) {
  const [visivel, definirVisivel] = React.useState(false);
  const Icone = visivel ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input {...props} type={visivel ? "text" : "password"} className={cn(className, "pr-10")} />
      <button
        type="button"
        data-slot="mostrar-senha"
        aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        onClick={() => definirVisivel((v) => !v)}
        className="text-texto-suave hover:text-texto focus-visible:ring-marca rounded-ciaara-sm absolute inset-y-0 right-0 flex w-10 items-center justify-center focus-visible:ring-2 focus-visible:outline-none"
      >
        <Icone aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
