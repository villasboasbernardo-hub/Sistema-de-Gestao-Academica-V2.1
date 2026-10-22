/**
 * Acrescentar sala — **folha de cliente** (`FR-029.2`, `FR-029.6`).
 *
 * ⚠️ **A NATUREZA ABRE SEM PADRÃO** (`FR-029.6`). Física e ambiente virtual mudam a leitura de toda
 * regra que olha para a sala; um padrão silencioso gravaria escolha que ninguém fez.
 *
 * ⚠️ **NÃO HÁ CAMPO DE RENOMEAR, E ISSO NÃO É ESQUECIMENTO** (`FR-029.5`). O nome é o valor gravado
 * em `turmas.sala_alocada` — renomeá-lo deixaria as turmas apontando para um nome que não existe.
 *
 * ⚠️ **ACRESCENTAR NÃO CONFIRMA** (`FR-018.1`): não é escrita que alcance o passado. Quem decide isso
 * é `lib/dominio/confirmacao-de-gravacao.ts`, com a lista fechada — não esta tela.
 *
 * ⚠️ **O FORMULÁRIO ABRE NUM DIÁLOGO** (spec 022, Bloco 7, FR-002): até o Bloco 7 ele ficava aberto acima da lista. O
 *    ícone *Acrescentar sala* fica no topo da página, à direita (FR-001.2); a recusa fica no diálogo.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { CampoObrigatorio, propsDoControle } from "@/components/ciaara/campo-obrigatorio";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { acrescentarSala } from "@/lib/acoes/sala";

const NATUREZAS = [
  { valor: "fisica", rotulo: "Física" },
  { valor: "virtual", rotulo: "Ambiente virtual" },
] as const;

export function FormularioDeSala() {
  return (
    <DialogoDeFormulario
      titulo="Acrescentar sala"
      slot="dialogo-da-sala"
      gatilho={
        <BotaoDeIcone
          acao="acrescentar"
          rotulo="Acrescentar sala"
          variante="padrao"
          data-slot="acrescentar-sala"
        />
      }
    >
      {(fechar) => <CadastroDaSala fechar={fechar} />}
    </DialogoDeFormulario>
  );
}

function CadastroDaSala({ fechar }: { readonly fechar: () => void }) {
  const router = useRouter();
  const [valor, definirValor] = React.useState("");
  const [natureza, definirNatureza] = React.useState("");
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, definirGravando] = React.useState(false);

  async function gravar(evento: React.FormEvent) {
    evento.preventDefault();
    definirGravando(true);
    definirErro(null);
    const resultado = await acrescentarSala({ valor, natureza });
    definirGravando(false);

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    definirValor("");
    definirNatureza("");
    fechar();
    router.refresh();
  }

  return (
    <form onSubmit={gravar} data-slot="formulario-de-sala" className="flex flex-col gap-3">
      {erro ? (
        <p role="alert" className="text-atrasado-tinta w-full text-sm" data-slot="erro-da-sala">
          {erro}
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <CampoObrigatorio para="sala-nome" rotulo="Nome da sala" obrigatorio />
        <Input
          {...propsDoControle("sala-nome", true)}
          name="valor"
          value={valor}
          onChange={(e) => definirValor(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <CampoObrigatorio para="sala-natureza" rotulo="Natureza" obrigatorio />
        <select
          {...propsDoControle("sala-natureza", true)}
          name="natureza"
          value={natureza}
          onChange={(e) => definirNatureza(e.target.value)}
          className="border-borda bg-superficie text-texto rounded-ciaara h-9 border px-2 text-sm"
        >
          <option value="">Escolha a natureza</option>
          {NATUREZAS.map((n) => (
            <option key={n.valor} value={n.valor}>
              {n.rotulo}
            </option>
          ))}
        </select>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={fechar} disabled={gravando}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={gravando} data-slot="gravar-sala">
          {gravando ? "Gravando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
