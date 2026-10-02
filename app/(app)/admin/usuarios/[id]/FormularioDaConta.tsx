"use client";

/**
 * Editar nome, perfil, escopo e vínculos de **outra** conta — folha de cliente (`FR-040`).
 *
 * ⚠️ **SÃO DUAS GRAVAÇÕES, NÃO UMA, e a divisão é da trilha de auditoria.** `editar_nome` e
 * `editar_perfil` são ações distintas em `auditoria_de_conta` (`FR-047`); um único botão mandaria
 * sempre os dois, e toda correção de grafia de nome passaria a registrar troca de perfil. Quem lesse o
 * rastro veria mudança de permissão que não houve.
 *
 * ⚠️ **O E-MAIL NÃO ESTÁ AQUI, E A AUSÊNCIA É O REQUISITO** (`FR-021`): ele não é editável por ninguém.
 * A razão aparece na tela de cadastro, antes de alguém digitá-lo.
 */
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { editarNomeDeConta, editarPerfilEEscopo } from "@/lib/acoes/usuarios";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import type { InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";

import { CamposDaConta, type EstadoDaConta } from "../CamposDaConta";
import type { CursoParaVincular } from "../dados-da-conta";

const CAMPO =
  "border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none";

export function FormularioDaConta({
  usuarioId,
  nomeExibicao,
  perfil,
  escopo,
  cursosVinculados,
  vinculoDeDocente,
  cursos,
  instrutores,
  escala,
}: {
  readonly usuarioId: string;
  readonly nomeExibicao: string;
  readonly perfil: string;
  readonly escopo: string;
  readonly cursosVinculados: readonly string[];
  readonly vinculoDeDocente: string;
  readonly cursos: readonly CursoParaVincular[];
  readonly instrutores: readonly InstrutorParaExibir[];
  readonly escala: EscalaDeAntiguidade;
}) {
  const [nome, definirNome] = useState(nomeExibicao);
  const [estado, definirEstado] = useState<EstadoDaConta>({
    perfil,
    escopo,
    cursos: [...cursosVinculados],
    vinculoDeDocente,
  });
  const [aviso, definirAviso] = useState<string | null>(null);
  const [erro, definirErro] = useState<string | null>(null);
  const [ocupado, definirOcupado] = useState(false);

  async function executar(
    acao: () => Promise<{ ok: boolean; erro?: string }>,
    sucesso: string,
  ): Promise<void> {
    definirAviso(null);
    definirErro(null);
    definirOcupado(true);
    const r = await acao();
    if (r.ok) definirAviso(sucesso);
    else definirErro(r.erro ?? "Não foi possível concluir.");
    definirOcupado(false);
  }

  return (
    <div className="border-borda rounded-ciaara flex max-w-xl flex-col gap-3 border p-3">
      <h2 className="text-texto text-sm font-semibold">Cadastro</h2>

      <div className="flex flex-col gap-1">
        <label className="text-texto-suave text-xs" htmlFor="nome-de-exibicao">
          Nome de exibição
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="nome-de-exibicao"
            value={nome}
            onChange={(evento) => definirNome(evento.target.value)}
            className={`${CAMPO} grow`}
          />
          <Button
            type="button"
            variant="outline"
            disabled={ocupado}
            onClick={() =>
              executar(
                () => editarNomeDeConta({ usuarioId, nomeExibicao: nome }),
                "Nome atualizado.",
              )
            }
          >
            Gravar nome
          </Button>
        </div>
      </div>

      <CamposDaConta
        estado={estado}
        aoMudar={definirEstado}
        cursos={cursos}
        instrutores={instrutores}
        escala={escala}
      />

      <div>
        <Button
          type="button"
          disabled={ocupado}
          onClick={() =>
            executar(
              () =>
                editarPerfilEEscopo({
                  usuarioId,
                  perfil: estado.perfil,
                  escopoCurso: estado.escopo,
                  cursos: [...estado.cursos],
                  instrutorId: estado.vinculoDeDocente,
                }),
              "Perfil, escopo e vínculos atualizados.",
            )
          }
        >
          Gravar perfil e vínculos
        </Button>
        {/* veste: quando a mudança passa a valer — texto de apoio */}
        <p className="text-texto-tenue mt-1 text-xs">
          Vale na próxima tela que a pessoa abrir — ela não precisa sair e entrar.
        </p>
      </div>

      {aviso ? (
        <p role="status" className="text-texto-suave text-sm">
          {aviso}
        </p>
      ) : null}
      {erro ? (
        <p role="alert" className="text-erro text-sm">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
