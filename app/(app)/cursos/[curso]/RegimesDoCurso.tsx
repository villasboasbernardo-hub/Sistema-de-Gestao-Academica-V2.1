"use client";

/**
 * Os regimes de horário nomeados do curso — **a folha de cliente da aba *Horários*** (spec 018, FR-003 e FR-004, C-7, C-11,
 * C-18).
 *
 * ⚠️ **UMA FOLHA SÓ**: o formulário (`FormularioDeRegime.tsx`) vem abaixo dela, sem marcador próprio.
 * ⚠️ **CADA BOTÃO SEGUE A PERMISSÃO DA AÇÃO** — *Novo regime* (`horarios.criar`), *Editar* (`horarios.editar`),
 *    *Desativar* ou *Reativar* (`horarios.desativar`), *Excluir* (`horarios.criar`), decididas no servidor e recebidas
 *    aqui; o banco recusa de qualquer forma (`42501`).
 * ⚠️ **DESATIVAR REGIME EM USO É PERMITIDO** (C-11): ele sai da lista de escolha, e as turmas que o usam continuam com
 *    ele — a linha diz quais. *"Inativar"* virou *"Desativar"* no Bloco 10 (RT-2, spec 025, D-17).
 * ⚠️ **EXCLUIR SÓ O REGIME SEM REGISTRO** (RT-2, D-30): nenhuma turma o usa, o currículo não está em uso e não há
 *    correção registrada. Com registro, o ícone desabilitado com a dica; quem decide é o banco, na leitura e na exclusão.
 * ⚠️ **A RESPOSTA FICA ACIMA DA TABELA** (`role="status"`/`role="alert"`), a lição de `AvisoDaLista`: a linha pode
 *    mudar de lugar sem levar a mensagem com ela.
 * ⚠️ **NOVO E EDITAR ABREM UM DIÁLOGO** (spec 022, Bloco 7, FR-002; *"Edição e cadastro SEMPRE em diálogo (formulário
 *    curto: UE, avaliação, regime)"*): até o Bloco 7 o formulário abria no lugar, acima da lista ou na linha.
 */
import { useRouter } from "next/navigation";
import * as React from "react";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import {
  ExclusaoPermanente,
  type ExclusaoPermanenteProps,
} from "@/components/ciaara/exclusao-permanente";
import { usePedidoDeJustificativa } from "@/components/ciaara/pedido-de-justificativa";
import { DICA_SEM_LEITURA, type EstadoDaExclusao } from "@/lib/dominio/exclusao-permanente";
import { inativarRegimeDeHorario, reativarRegimeDeHorario } from "@/lib/acoes/regime-de-horario";
import { rotuloDoRegime } from "@/lib/dominio/regime-da-turma";

import type { ConfiguracaoDoCatalogo, RegimeNaTela } from "./consulta-de-horarios";
import { FormularioDeRegime } from "./FormularioDeRegime";

export function RegimesDoCurso({
  cursoId,
  curriculoId = null,
  regimes,
  configuracoes,
  permissoes,
  exclusao,
}: {
  readonly cursoId: string;
  /** Spec 021 (emenda à RC-1): o currículo cujos regimes a lista mostra e em que o regime novo nasce. */
  readonly curriculoId?: string | null;
  readonly regimes: readonly RegimeNaTela[];
  readonly configuracoes: readonly ConfiguracaoDoCatalogo[];
  readonly permissoes: {
    readonly criar: boolean;
    readonly editar: boolean;
    readonly desativar: boolean;
  };
  /** O *Excluir* de cada regime (`horarios.criar`): o estado lido no banco, pelo `id`, e a ação. */
  readonly exclusao?: {
    readonly estados: Readonly<Record<string, EstadoDaExclusao>>;
    readonly excluir: ExclusaoPermanenteProps["excluir"];
  };
}) {
  const router = useRouter();
  const [resposta, definirResposta] = React.useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = React.useTransition();
  /* Spec 021 (RC-6): inativar ou reativar regime de currículo em uso é correção — com justificativa. */
  const pedido = usePedidoDeJustificativa();
  const nomeDoCatalogo = new Map(configuracoes.map((c) => [c.id, c.nome] as const));

  const concluir = (texto: string) => {
    definirResposta({ ok: true, texto });
    router.refresh();
  };

  const mudarSituacao = (regime: RegimeNaTela) =>
    iniciar(async () => {
      const r = await pedido.executar((justificativa) => {
        const j = justificativa ? { justificativa } : {};
        return regime.ativo
          ? inativarRegimeDeHorario({ id: regime.id, ...j })
          : reativarRegimeDeHorario({ id: regime.id, ...j });
      });
      definirResposta(
        r.ok
          ? { ok: true, texto: regime.ativo ? "Regime desativado." : "Regime reativado." }
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
      {pedido.dialogo}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="titulo-regimes-do-curso" className="text-texto text-sm font-semibold">
          Regimes de horário do curso
        </h3>
        {permissoes.criar ? (
          <DialogoDeFormulario
            titulo="Novo regime de horário"
            largo
            slot="dialogo-do-regime"
            gatilho={
              <BotaoDeIcone
                acao="novo"
                rotulo="Novo regime"
                variante="padrao"
                data-slot="novo-regime"
              />
            }
          >
            {(fechar) => (
              <FormularioDeRegime
                cursoId={cursoId}
                curriculoId={curriculoId}
                configuracoes={configuracoes}
                aoConcluir={(texto) => {
                  fechar();
                  concluir(texto);
                }}
              />
            )}
          </DialogoDeFormulario>
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
              {/* Spec 022 (FR-001.2): as ações do item à direita, como ícones. */}
              <div className="flex flex-wrap justify-end gap-1">
                {permissoes.editar ? (
                  <DialogoDeFormulario
                    titulo={`Editar ${r.nome}`}
                    largo
                    slot="dialogo-do-regime"
                    gatilho={
                      <BotaoDeIcone
                        acao="editar"
                        rotulo={`Editar ${r.nome}`}
                        data-slot="editar-regime"
                      />
                    }
                  >
                    {(fechar) => (
                      <FormularioDeRegime
                        cursoId={cursoId}
                        curriculoId={curriculoId}
                        regime={r}
                        configuracoes={configuracoes}
                        aoConcluir={(texto) => {
                          fechar();
                          concluir(texto);
                        }}
                      />
                    )}
                  </DialogoDeFormulario>
                ) : null}
                {permissoes.desativar ? (
                  <BotaoDeIcone
                    acao={r.ativo ? "desativar" : "reativar"}
                    rotulo={`${r.ativo ? "Desativar" : "Reativar"} ${r.nome}`}
                    variante="fantasma"
                    ocupado={pendente}
                    rotuloOcupado="Gravando…"
                    onClick={() => mudarSituacao(r)}
                    data-slot={r.ativo ? "desativar-regime" : "reativar-regime"}
                  />
                ) : null}
                {exclusao ? (
                  <ExclusaoPermanente
                    id={r.id}
                    codigo={r.codigo}
                    nomeDoCodigo="o código do regime"
                    rotulo={`Excluir ${r.nome}`}
                    titulo={`Excluir o regime «${r.nome}» permanentemente?`}
                    consequencia="O regime sai do currículo. Só é possível porque nenhuma turma o usa e o currículo não está em uso."
                    estado={
                      exclusao.estados[r.id] ?? {
                        liberada: false,
                        dica: DICA_SEM_LEITURA,
                        detalhe: null,
                      }
                    }
                    excluir={exclusao.excluir}
                    naLinha
                    aoRecusar={(erro) => definirResposta({ ok: false, texto: erro })}
                    aoConcluir={() => definirResposta({ ok: true, texto: "Regime excluído." })}
                    slot="excluir-regime"
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
