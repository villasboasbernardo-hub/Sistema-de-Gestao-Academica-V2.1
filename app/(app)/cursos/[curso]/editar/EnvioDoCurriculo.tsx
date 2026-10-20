"use client";

/**
 * O currículo do curso em PDF, em *Editar curso* — spec 020 (Bloco 5), C-5 a C-8 — **folha de cliente**.
 *
 * ⚠️ **O ARQUIVO VAI DO NAVEGADOR DIRETO AO STORAGE**, com a sessão de quem envia: a Vercel corta o corpo de uma função
 *    em 4,5 MB, e um currículo maior não passaria por Server Action. Quem decide se pode são as policies do balde
 *    (`cursos.editar`, alcance, curso ativo); a Server Action `registrarCurriculo` só confere que chegou e carimba a data.
 * ⚠️ **O BOTÃO ABRE A JANELA DE ARQUIVO** (`type="button"`), e escolher já envia — a lição do avatar (spec 011): um
 *    botão de enviar com o campo de arquivo ao lado não leva ninguém a lugar nenhum.
 * ⚠️ **A CONFERÊNCIA DAQUI SÓ ANTECIPA A DO MOTOR** (gotcha 14): o balde recusa não-PDF (`415`) e acima de 20 MB (`413`)
 *    de qualquer jeito, e a frase de cada recusa é a mesma.
 */
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { registrarCurriculo } from "@/lib/acoes/curso";
import {
  BALDE_DE_CURRICULOS,
  TIPO_DO_CURRICULO,
  caminhoDoCurriculo,
  fraseDaRecusaDoArmazenamento,
  recusaDoCurriculo,
} from "@/lib/dominio/curriculo-em-pdf";
import { instanteComHoraParaLeitura } from "@/lib/formato/data";
import { criarClienteDeNavegador } from "@/lib/supabase/client";

export function EnvioDoCurriculo({
  sigla,
  cursoId,
  carregadoEm,
  cursoAtivo,
}: {
  readonly sigla: string;
  readonly cursoId: string;
  /** `cursos.curriculo_pdf_em`, ou `null` sem currículo. */
  readonly carregadoEm: string | null;
  readonly cursoAtivo: boolean;
}) {
  const router = useRouter();
  const entrada = React.useRef<HTMLInputElement>(null);
  const [enviando, definirEnviando] = React.useState(false);
  const [aviso, definirAviso] = React.useState<{ ok: boolean; texto: string } | null>(null);

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;

    const recusa = recusaDoCurriculo({ tipo: arquivo.type, tamanho: arquivo.size });
    if (recusa) {
      definirAviso({ ok: false, texto: recusa });
      return;
    }

    definirEnviando(true);
    definirAviso(null);
    const { error } = await criarClienteDeNavegador()
      .storage.from(BALDE_DE_CURRICULOS)
      .upload(caminhoDoCurriculo(cursoId), arquivo, {
        contentType: TIPO_DO_CURRICULO,
        upsert: true,
      });
    if (error) {
      definirAviso({
        ok: false,
        texto: fraseDaRecusaDoArmazenamento((error as { statusCode?: string }).statusCode),
      });
      definirEnviando(false);
      return;
    }

    const resultado = await registrarCurriculo({ sigla });
    definirEnviando(false);
    if (!resultado.ok) {
      definirAviso({ ok: false, texto: resultado.erro });
      return;
    }
    definirAviso({ ok: true, texto: "Currículo carregado." });
    router.refresh();
  }

  return (
    <section
      aria-labelledby="titulo-do-curriculo"
      className="border-borda rounded-ciaara flex flex-col gap-2 border p-3"
      data-slot="envio-do-curriculo"
    >
      <h2 id="titulo-do-curriculo" className="text-texto text-sm font-semibold">
        Currículo em PDF
      </h2>
      <p className="text-texto-suave text-sm" data-slot="estado-do-curriculo">
        {carregadoEm
          ? `Carregado em ${instanteComHoraParaLeitura(carregadoEm)}. Carregar outro substitui este.`
          : "Nenhum currículo carregado."}
      </p>
      {cursoAtivo ? (
        <div className="flex items-center gap-2">
          <input
            ref={entrada}
            type="file"
            accept={TIPO_DO_CURRICULO}
            className="hidden"
            onChange={(e) => void aoEscolher(e)}
            data-slot="arquivo-do-curriculo"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={enviando}
            onClick={() => entrada.current?.click()}
            data-slot="carregar-curriculo"
          >
            {enviando ? "Carregando…" : carregadoEm ? "Substituir PDF" : "Carregar PDF"}
          </Button>
          <span className="text-texto-suave text-xs">Só PDF, até 20 MB.</span>
        </div>
      ) : (
        <p className="text-texto-suave text-sm" role="status">
          Curso inativo: o currículo não pode ser trocado.
        </p>
      )}
      {aviso ? (
        <p
          role={aviso.ok ? "status" : "alert"}
          className={aviso.ok ? "text-texto text-sm" : "text-conflito-tinta text-sm"}
          data-slot="aviso-do-curriculo"
        >
          {aviso.texto}
        </p>
      ) : null}
    </section>
  );
}
