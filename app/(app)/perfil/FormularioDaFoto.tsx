"use client";

/**
 * A foto do avatar (`FR-012` a `FR-014`). Folha — o `"use client"` para aqui.
 *
 * ⚠️ **A RECUSA POR TIPO E POR TAMANHO ACONTECE ANTES DO ENVIO** (`FR-013`), e essa é a única razão
 * de este componente conferir o arquivo: mandar 2 MB para o servidor só para ouvir *"passou de 2
 * MB"* é desperdiçar a conexão de quem está numa rede ruim.
 *
 * ⚠️ **MAS ELA NÃO É A GARANTIA, E O ARQUIVO DIZ ISSO DE PROPÓSITO.** A garantia é do **bucket** —
 * `file_size_limit` e `allowed_mime_types` no motor —, provada por
 * `tests/invariantes/rls/avatar-no-storage.test.ts` sem passar por tela nenhuma. Foi confundir as
 * duas coisas que produziu o defeito do Épico 3, em que o mínimo de senha existia só no formulário e
 * caía por chamada direta à interface.
 *
 * ⚠️ **A REGRA É DITA ANTES DE A PESSOA ESCOLHER.** Descobrir o formato aceito depois de escolher o
 * arquivo errado é a forma cara de aprender a regra.
 */
import { useRef, useState } from "react";

import { Avatar, AvatarImagem, AvatarRecuo } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { enviarFoto, removerFoto } from "@/lib/acoes/perfil";
import { iniciaisDoNome } from "@/lib/dominio/iniciais-do-nome";
import {
  regraDaFotoEmPortugues,
  TAMANHO_MAXIMO_DA_FOTO,
  TIPOS_DE_IMAGEM_ACEITOS,
} from "@/lib/validacao/perfil";

export function FormularioDaFoto({
  nome,
  fotoUrl,
  temFoto,
}: {
  readonly nome: string;
  readonly fotoUrl: string | null;
  readonly temFoto: boolean;
}) {
  const campo = useRef<HTMLInputElement>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  function conferirAntesDeEnviar(arquivo: File): string | null {
    if (!TIPOS_DE_IMAGEM_ACEITOS.includes(arquivo.type as (typeof TIPOS_DE_IMAGEM_ACEITOS)[number]))
      return "A foto precisa ser JPG ou PNG.";
    if (arquivo.size > TAMANHO_MAXIMO_DA_FOTO) return "A foto passou de 2 MB.";
    return null;
  }

  async function enviar(dados: FormData) {
    setMensagem(null);
    setErro(null);

    const arquivo = dados.get("foto");
    if (!(arquivo instanceof File) || arquivo.size === 0) {
      setErro("Escolha um arquivo de imagem.");
      return;
    }
    const recusa = conferirAntesDeEnviar(arquivo);
    if (recusa) {
      setErro(recusa);
      return;
    }

    setOcupado(true);
    const resultado = await enviarFoto(dados);
    if (resultado.ok) {
      setMensagem("Foto atualizada.");
      if (campo.current) campo.current.value = "";
    } else {
      setErro(resultado.erro);
    }
    setOcupado(false);
  }

  async function remover() {
    setMensagem(null);
    setErro(null);
    setOcupado(true);
    const resultado = await removerFoto();
    if (resultado.ok) setMensagem("Foto removida. O avatar voltou às iniciais.");
    else setErro(resultado.erro);
    setOcupado(false);
  }

  return (
    <form action={enviar} className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          {fotoUrl ? <AvatarImagem src={fotoUrl} alt="" /> : null}
          <AvatarRecuo className="text-lg">{iniciaisDoNome(nome)}</AvatarRecuo>
        </Avatar>

        <div className="flex flex-col gap-1">
          <Label htmlFor="foto">Escolher uma foto</Label>
          <input
            ref={campo}
            id="foto"
            name="foto"
            type="file"
            accept={TIPOS_DE_IMAGEM_ACEITOS.join(",")}
            className="text-texto text-sm"
          />
          {/* veste: dica da regra de formato e tamanho, dita ANTES da escolha (FR-013) */}
          <span className="text-texto-tenue text-xs">{regraDaFotoEmPortugues()}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={ocupado}>
          {ocupado ? "Enviando…" : "Enviar foto"}
        </Button>

        {/*
          ⚠️ O botão de remover só existe quando HÁ foto. Um "remover" permanentemente visível
             prometeria uma ação que não muda nada, e quem clicasse ficaria sem saber se funcionou.
        */}
        {temFoto ? (
          <Button type="button" variant="outline" onClick={remover} disabled={ocupado}>
            Remover foto
          </Button>
        ) : null}
      </div>

      {mensagem ? (
        <p role="status" className="text-texto-suave text-sm">
          {mensagem}
        </p>
      ) : null}
      {erro ? (
        <p role="alert" className="text-erro text-sm">
          {erro}
        </p>
      ) : null}
    </form>
  );
}
