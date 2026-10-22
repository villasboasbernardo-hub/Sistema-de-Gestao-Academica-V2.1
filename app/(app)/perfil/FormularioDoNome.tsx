"use client";

/**
 * O nome de exibição (`FR-020`). Folha — o `"use client"` para aqui.
 *
 * ⚠️ **NÃO HÁ CAMPO DE E-MAIL NEM DE PERFIL NESTE FORMULÁRIO**, e a ausência é o requisito
 * (`FR-021`, `FR-022`). Eles aparecem na página, somente para leitura, com a razão ao lado.
 *
 * ⚠️ **O CAMPO ABRE NUM DIÁLOGO** (spec 022, Bloco 7, FR-002; *"nunca campos abertos na página"*): a página mostra o
 *    nome, e o ícone *Editar nome* abre o campo. A resposta fica na página; a recusa, no diálogo.
 */
import { useState } from "react";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { editarProprioCadastro } from "@/lib/acoes/perfil";

export function FormularioDoNome({ nomeExibicao }: { readonly nomeExibicao: string }) {
  const [mensagem, setMensagem] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-texto text-sm" data-slot="nome-de-exibicao">
          {nomeExibicao}
        </p>
        <DialogoDeFormulario
          titulo="Como você quer ser chamado"
          slot="dialogo-do-nome"
          gatilho={<BotaoDeIcone acao="editar" rotulo="Editar nome" data-slot="editar-nome" />}
        >
          {(fechar) => (
            <CampoDoNome
              nomeExibicao={nomeExibicao}
              fechar={fechar}
              aoGravar={() => {
                setMensagem("Nome atualizado.");
                fechar();
              }}
            />
          )}
        </DialogoDeFormulario>
      </div>
      {/* ⚠️ `role="status"`: quem usa leitor de tela precisa ouvir o resultado. A recusa vai em `alert`, no diálogo. */}
      {mensagem ? (
        <p role="status" className="text-texto-suave text-sm">
          {mensagem}
        </p>
      ) : null}
    </div>
  );
}

function CampoDoNome({
  nomeExibicao,
  fechar,
  aoGravar,
}: {
  readonly nomeExibicao: string;
  readonly fechar: () => void;
  readonly aoGravar: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  async function gravar(dados: FormData) {
    setGravando(true);
    setErro(null);
    const resultado = await editarProprioCadastro({
      nomeExibicao: String(dados.get("nomeExibicao") ?? ""),
    });
    setGravando(false);
    if (resultado.ok) aoGravar();
    else setErro(resultado.erro);
  }

  return (
    <form action={gravar} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="nomeExibicao">Como você quer ser chamado</Label>
        <Input
          id="nomeExibicao"
          name="nomeExibicao"
          defaultValue={nomeExibicao}
          required
          minLength={2}
          maxLength={120}
        />
      </div>
      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm">
          {erro}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={fechar} disabled={gravando}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={gravando}>
          {gravando ? "Gravando…" : "Gravar nome"}
        </Button>
      </DialogFooter>
    </form>
  );
}
