"use client";

/**
 * Os regimes de horário nomeados do curso — **a folha de cliente da aba *Horários*** (spec 018, FR-003, C-7, C-11,
 * C-18).
 *
 * ⚠️ **UMA FOLHA SÓ**: o formulário (`FormularioDeRegime.tsx`) vem abaixo dela, sem marcador próprio.
 * ⚠️ **CADA BOTÃO SEGUE A PERMISSÃO DA AÇÃO** — *Novo regime* (`horarios.criar`), *Editar* (`horarios.editar`),
 *    *Inativar* ou *Reativar* (`horarios.desativar`), decididas no servidor e recebidas aqui; o banco recusa de qualquer
 *    forma (`42501`).
 * ⚠️ **INATIVAR REGIME EM USO É PERMITIDO** (C-11): ele sai da lista de escolha, e as turmas que o usam continuam com
 *    ele — a linha diz quais.
 * ⚠️ **A RESPOSTA FICA ACIMA DA TABELA** (`role="status"`/`role="alert"`), a lição de `AvisoDaLista`: a linha pode
 *    mudar de lugar sem levar a mensagem com ela.
 */
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { inativarRegimeDeHorario, reativarRegimeDeHorario } from "@/lib/acoes/regime-de-horario";
import { rotuloDoRegime } from "@/lib/dominio/regime-da-turma";

import type { ConfiguracaoDoCatalogo, RegimeNaTela } from "./consulta-de-horarios";
import { FormularioDeRegime } from "./FormularioDeRegime";

export function RegimesDoCurso({
  cursoId,
  regimes,
  configuracoes,
  permissoes,
}: {
  readonly cursoId: string;
  readonly regimes: readonly RegimeNaTela[];
  readonly configuracoes: readonly ConfiguracaoDoCatalogo[];
  readonly permissoes: {
    readonly criar: boolean;
    readonly editar: boolean;
    readonly desativar: boolean;
  };
}) {
  const router = useRouter();
  /* Qual formulário está aberto: "novo", o id do regime em edição, ou nenhum — estado efêmero, não vista. */
  const [aberto, definirAberto] = React.useState<string | null>(null);
  const [resposta, definirResposta] = React.useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = React.useTransition();
  const nomeDoCatalogo = new Map(configuracoes.map((c) => [c.id, c.nome] as const));

  const concluir = (texto: string) => {
    definirAberto(null);
    definirResposta({ ok: true, texto });
    router.refresh();
  };

  const mudarSituacao = (regime: RegimeNaTela) =>
    iniciar(async () => {
      const r = regime.ativo
        ? await inativarRegimeDeHorario({ id: regime.id })
        : await reativarRegimeDeHorario({ id: regime.id });
      definirResposta(
        r.ok
          ? { ok: true, texto: regime.ativo ? "Regime inativado." : "Regime reativado." }
          : { ok: false, texto: r.erro },
      );
      if (r.ok) router.refresh();
    });

  return (
    <section
      aria-labelledby="titulo-regimes-do-curso"
      className="flex flex-col gap-3"
      data-slot="regimes-do-curso"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="titulo-regimes-do-curso" className="text-texto text-sm font-semibold">
          Regimes de horário do curso
        </h3>
        {permissoes.criar ? (
          <Button
            type="button"
            size="sm"
            variant={aberto === "novo" ? "outline" : "default"}
            aria-expanded={aberto === "novo"}
            onClick={() => definirAberto((v) => (v === "novo" ? null : "novo"))}
            data-slot="novo-regime"
          >
            {aberto === "novo" ? "Fechar o cadastro" : "Novo regime"}
          </Button>
        ) : null}
      </div>
      <p className="text-texto-suave text-xs">
        Cada turma escolhe o seu regime em <strong>Editar turma</strong>, na ficha; a que não
        escolher fica no regime vigente do curso. O DSA, o alerta do tempo excepcional e o saldo de
        capacidade da turma usam o regime dela.
      </p>

      {resposta ? (
        <p
          role={resposta.ok ? "status" : "alert"}
          className={resposta.ok ? "text-texto text-sm" : "text-atrasado-tinta text-sm"}
          data-slot="resposta-dos-regimes"
        >
          {resposta.texto}
        </p>
      ) : null}

      {aberto === "novo" ? (
        <div className="border-borda bg-superficie rounded-ciaara border p-3">
          <FormularioDeRegime
            cursoId={cursoId}
            configuracoes={configuracoes}
            aoConcluir={concluir}
          />
        </div>
      ) : null}

      {regimes.length === 0 ? (
        <p className="text-texto-suave text-sm" data-slot="sem-regimes">
          Nenhum regime nomeado cadastrado. Toda turma usa o regime vigente do curso.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {regimes.map((r) => (
            <li
              key={r.id}
              className="border-borda rounded-ciaara flex flex-col gap-2 border p-2"
              data-slot="regime-do-curso"
              data-regime={r.nome}
              data-ativo={r.ativo}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                <span className="text-texto font-medium">{rotuloDoRegime(r)}</span>
                <span className="text-texto-suave">
                  manhã {r.horaInicioManha} (intervalo {r.intervaloManhaMin} min) · tarde{" "}
                  {r.horaInicioTarde} (intervalo {r.intervaloTardeMin} min)
                </span>
                {r.configuracaoHorarioId ? (
                  <span className="text-texto-suave">
                    relógio do catálogo: {nomeDoCatalogo.get(r.configuracaoHorarioId) ?? "—"}
                  </span>
                ) : null}
                {r.ativo ? null : (
                  /* veste: rótulo de situação do cadastro */
                  <span className="text-texto-tenue text-xs">Inativo</span>
                )}
                <span className="text-texto-suave text-xs" data-slot="uso-do-regime">
                  {r.turmas.length === 0
                    ? "nenhuma turma o usa"
                    : `usado por ${r.turmas.length === 1 ? "1 turma" : `${r.turmas.length} turmas`}: ${r.turmas.join(", ")}`}
                </span>
              </div>
              {r.observacao ? <p className="text-texto-suave text-xs">{r.observacao}</p> : null}
              <div className="flex flex-wrap gap-2">
                {permissoes.editar ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-expanded={aberto === r.id}
                    onClick={() => definirAberto((v) => (v === r.id ? null : r.id))}
                    data-slot="editar-regime"
                  >
                    {aberto === r.id ? "Fechar a edição" : "Editar"}
                  </Button>
                ) : null}
                {permissoes.desativar ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pendente}
                    onClick={() => mudarSituacao(r)}
                    data-slot={r.ativo ? "inativar-regime" : "reativar-regime"}
                  >
                    {r.ativo ? "Inativar" : "Reativar"}
                  </Button>
                ) : null}
              </div>
              {aberto === r.id ? (
                <div className="border-borda bg-superficie rounded-ciaara border p-3">
                  <FormularioDeRegime
                    cursoId={cursoId}
                    regime={r}
                    configuracoes={configuracoes}
                    aoConcluir={concluir}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
