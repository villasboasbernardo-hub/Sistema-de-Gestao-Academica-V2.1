"use client";

/**
 * O PDF do currículo, em *Editar currículo* — spec 020 (Bloco 5), C-5 a C-8, e spec 021 (Bloco 6), RC-11 —
 * **folha de cliente**.
 *
 * ⚠️ **CADA CURRÍCULO TEM O SEU PDF** (RC-11). Até o Bloco 6 este envio morava em *Editar curso*, num arquivo por curso.
 * ⚠️ **O ARQUIVO VAI DO NAVEGADOR DIRETO AO STORAGE**, com a sessão de quem envia: a Vercel corta o corpo de uma função
 *    em 4,5 MB, e um currículo maior não passaria por Server Action. Quem decide se pode são as policies do balde
 *    (`cursos.editar`, alcance, curso ativo); a Server Action `registrarPdfDoCurriculo` confere que chegou e aponta o
 *    currículo para ele.
 * ⚠️ **ARQUIVO NOVO A CADA ENVIO, nunca sobrescrito** (`<curso>/<currículo>/<instante>.pdf`, sem `upsert`): substituir é
 *    trocar o caminho no currículo — e no currículo em uso isso é correção (RC-6), com justificativa, e a trilha guarda o
 *    caminho anterior. O arquivo anterior fica no balde (regra 4: sem policy de `DELETE`).
 * ⚠️ **O BOTÃO ABRE A JANELA DE ARQUIVO** (`type="button"`), e escolher já envia — a lição do avatar (spec 011): um
 *    botão de enviar com o campo de arquivo ao lado não leva ninguém a lugar nenhum.
 * ⚠️ **A CONFERÊNCIA DAQUI SÓ ANTECIPA A DO MOTOR** (gotcha 14): o balde recusa não-PDF (`415`) e acima de 20 MB (`413`)
 *    de qualquer jeito, e a frase de cada recusa é a mesma.
 */
import { useRouter } from "next/navigation";
import * as React from "react";

import { usePedidoDeJustificativa } from "@/components/ciaara/pedido-de-justificativa";
import { Button } from "@/components/ui/button";
import { registrarPdfDoCurriculo } from "@/lib/acoes/curriculo";
import {
  BALDE_DE_CURRICULOS,
  TIPO_DO_CURRICULO,
  caminhoDoPdfDoCurriculo,
  fraseDaRecusaDoArmazenamento,
  recusaDoCurriculo,
} from "@/lib/dominio/curriculo-em-pdf";
import { instanteComHoraParaLeitura } from "@/lib/formato/data";
import { criarClienteDeNavegador } from "@/lib/supabase/client";

export function EnvioDoCurriculo({
  sigla,
  cursoId,
  curriculoId,
  versao,
  carregadoEm,
  cursoAtivo,
}: {
  readonly sigla: string;
  readonly cursoId: string;
  readonly curriculoId: string;
  /** O número do currículo ("Currículo N"). */
  readonly versao: number;
  /** `curriculos.pdf_carregado_em`, ou `null` sem PDF. */
  readonly carregadoEm: string | null;
  readonly cursoAtivo: boolean;
}) {
  const router = useRouter();
  /* RC-6: trocar o PDF do currículo em uso é correção — o banco pede a justificativa, e este diálogo a pergunta. */
  const { executar, dialogo } = usePedidoDeJustificativa();
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
    const caminho = caminhoDoPdfDoCurriculo(cursoId, curriculoId, Date.now());
    const { error } = await criarClienteDeNavegador()
      .storage.from(BALDE_DE_CURRICULOS)
      .upload(caminho, arquivo, { contentType: TIPO_DO_CURRICULO, upsert: false });
    if (error) {
      definirAviso({
        ok: false,
        texto: fraseDaRecusaDoArmazenamento((error as { statusCode?: string }).statusCode),
      });
      definirEnviando(false);
      return;
    }

    const resultado = await executar((justificativa) =>
      registrarPdfDoCurriculo({
        sigla,
        versao,
        caminho,
        ...(justificativa ? { justificativa } : {}),
      }),
    );
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
      {dialogo}
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
            aria-label="Arquivo PDF do currículo"
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
          Curso inativo: o PDF do currículo não pode ser trocado.
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
