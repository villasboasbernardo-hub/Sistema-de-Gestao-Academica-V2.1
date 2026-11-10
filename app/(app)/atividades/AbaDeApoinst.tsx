/**
 * Bloco 18 (spec 033, RA-6, RA-7 e RA-9; FR-004, FR-006.1 a FR-006.3 e FR-006.6) — a aba «APOINST» do módulo
 * Atividades: a APOINST planejada de TODAS as turmas do ano escolhido no cabeçalho, com a situação e o previsto ×
 * realizado, e *Nova APOINST* para o trio.
 *
 * > *"APOINST: planejada no módulo Atividades pelo trio, por turma (…). Só turmas de 2027 em diante; as de 2026 ficam
 * > como estão, sem retroajuste."* — Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **O ANO INICIAL É PARÂMETRO** (`apoinst.ano_inicial`, regra 8): no ano anterior a ele, a aba diz por que não há
 *    APOINST — e não oferece *Nova APOINST*. Nenhum ano escrito aqui.
 * ⚠️ **O ANO É O DA TURMA** (RA-7, RT-6), e a arquivada CONTA (RT-8): ela fica nas linhas e nos números, sai das opções
 *    do filtro e do *Nova APOINST*, e não ganha ação. A EAD pura (sem DSA) fica de fora: a APOINST se executa no DSA.
 * ⚠️ **AS AÇÕES SEGUEM A PERMISSÃO** (`planejamento_de_atividades.editar` — só o trio), nunca o perfil comparado à mão;
 *    o banco decide de qualquer jeito.
 * ⚠️ **«NÃO HÁ» × «VOCÊ NÃO VÊ»** (gotcha 4): ao perfil de alcance RECORTADO, sem turma, a frase é «nenhuma ao seu
 *    alcance» — as turmas existem, a RLS é que não as mostra (achado da revisão do Bloco 18).
 * ⚠️ Sem marcador de cliente: as folhas são o quadro, o formulário, os filtros e os painéis.
 */
import { BarraDeAcoes } from "@/components/ciaara/barra-de-acoes";
import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import {
  ConteudoDePainel,
  GatilhoDePainel,
  ProvedorDePaineis,
} from "@/components/ciaara/paineis-da-pagina";
import { pode } from "@/lib/autorizacao/matriz";
import { apoinstSeAplica } from "@/lib/dominio/atividades/apoinst";
import {
  filtrarApoinst,
  linhasDeApoinst,
  numerosDaApoinst,
  opcoesDeCurso,
  opcoesDeTurma,
  situacaoDeApoinstValida,
  type FiltroDaApoinst,
} from "@/lib/dominio/atividades/palestras-e-apoinst-na-tela";
import { filtrosForaDoPadrao } from "@/lib/navegacao/filtros-fora-do-padrao";

import { AbasDeAtividades } from "./AbasDeAtividades";
import type { ContextoDoModulo } from "./contexto";
import { EstatisticasDeApoinst } from "./EstatisticasDoPlanejado";
import { FiltrosDeApoinst } from "./FiltrosDoPlanejado";
import { NovaApoinst } from "./FormularioDeApoinst";
import {
  lerAnoInicialDaApoinst,
  lerOpcoesDaApoinst,
  lerTurmasDoAno,
} from "./leitura-de-palestras-e-apoinst";
import { lerApoinstDasTurmas } from "./leitura-do-planejado";
import { QuadroDeApoinst } from "./QuadroDeApoinst";

export async function AbaDeApoinst({ contexto }: { readonly contexto: ContextoDoModulo }) {
  const { valores, ano } = contexto;
  const situacaoNaUrl = String(valores.situacao ?? "");
  const filtro: FiltroDaApoinst = {
    turma: String(valores.turma ?? ""),
    curso: String(valores.curso ?? ""),
    situacao: situacaoDeApoinstValida(situacaoNaUrl) ? situacaoNaUrl : "",
  };
  const podeLer = pode(contexto.permissoes, "atividades_nao_letivas", "ler");
  const podePlanejar = pode(contexto.permissoes, "planejamento_de_atividades", "editar");

  const [anoInicial, doAno] = await Promise.all([
    lerAnoInicialDaApoinst(ano),
    podeLer ? lerTurmasDoAno(ano) : Promise.resolve({ turmas: [], erro: null }),
  ]);
  const seAplica = apoinstSeAplica(ano, anoInicial.valor);
  const comDsa = seAplica ? doAno.turmas.filter((t) => !t.eadPura) : [];
  /* As turmas que recebem APOINST nova: do ano (já ≥ o inicial), fora do arquivo. */
  const recebem = comDsa.filter((t) => !t.arquivada);
  const [lidas, opcoes] = await Promise.all([
    lerApoinstDasTurmas(comDsa, contexto.hoje),
    podePlanejar && recebem.length > 0
      ? lerOpcoesDaApoinst(recebem.map((t) => t.id))
      : Promise.resolve(null),
  ]);
  const erro = doAno.erro ?? lidas.erro;

  const todas = linhasDeApoinst(comDsa, lidas.quadro.linhas);
  const recorte = filtrarApoinst(todas, filtro);
  const numeros = numerosDaApoinst(recorte);
  const ativos = filtrosForaDoPadrao("/atividades", filtro);
  const haFiltro = ativos > 0;
  const opcoesDoFormulario =
    opcoes === null
      ? null
      : {
          disciplinas: Object.fromEntries(opcoes.disciplinas),
          escala: opcoes.escala,
          podeLerInstrutores: pode(contexto.permissoes, "instrutores", "ler"),
          erro: opcoes.erro,
        };

  const corpo = !podeLer ? (
    <EstadoVazio
      motivo="sem-permissao"
      titulo="O seu perfil não lê as atividades"
      detalhe="Quem nega o acesso é o banco, e a lista chegaria vazia por isso — não por falta de APOINST."
    />
  ) : !seAplica ? (
    <p role="status" className="text-texto-suave text-sm" data-slot="apoinst-nao-se-aplica">
      A APOINST planejada vale para as turmas de {anoInicial.valor} em diante. As turmas de {ano}{" "}
      ficam como estão, sem APOINST planejada (sem retroajuste) — escolha outro ano no canto
      superior direito.
    </p>
  ) : erro ? (
    <EstadoVazio
      motivo="sem-permissao"
      titulo="Não foi possível ler a APOINST agora"
      detalhe={erro}
    />
  ) : comDsa.length === 0 && contexto.alcance === "recortado" ? (
    <EstadoVazio
      motivo="sem-permissao"
      titulo={`Nenhuma turma ao seu alcance com DSA em ${ano}`}
      detalhe="O seu perfil vê só as turmas dos cursos sob a sua responsabilidade."
    />
  ) : comDsa.length === 0 ? (
    <EstadoVazio
      motivo="sem-dado"
      titulo={`Nenhuma turma com DSA em ${ano}`}
      detalhe="A APOINST é planejada nas turmas do ano escolhido, no canto superior direito."
    />
  ) : (
    <QuadroDeApoinst
      linhas={recorte}
      comTurma
      podePlanejar={podePlanejar}
      turmaDaFicha={null}
      hoje={contexto.hoje}
      opcoes={opcoesDoFormulario}
      observacoes={opcoes === null ? {} : Object.fromEntries(opcoes.observacoes)}
    />
  );

  return (
    <ProvedorDePaineis>
      <div className="flex flex-col gap-4" data-slot="lista-de-atividades">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-texto text-xl font-semibold">Atividades</h1>
            <p className="text-texto-suave text-sm" data-slot="contagem-de-apoinst">
              {numeros.ativas} APOINST planejada{numeros.ativas === 1 ? "" : "s"} em {ano}
              {haFiltro ? " neste recorte" : ""}. A execução são os lançamentos do DSA vinculados a
              cada uma.
            </p>
            {!anoInicial.lido ? (
              <p className="text-atrasado-tinta text-xs" data-slot="ano-inicial-nao-lido">
                Não foi possível ler o ano inicial da APOINST; o banco confere ao gravar.
              </p>
            ) : null}
          </div>
          <BarraDeAcoes rotulo="Ações da APOINST">
            {seAplica ? <GatilhoDePainel painel="filtros" contagem={ativos} /> : null}
            {seAplica ? <GatilhoDePainel painel="estatisticas" /> : null}
            {podePlanejar && seAplica ? (
              opcoesDoFormulario !== null ? (
                <NovaApoinst
                  turmas={recebem.map((t) => ({ id: t.id, codigo: t.codigo }))}
                  opcoes={opcoesDoFormulario}
                  naFicha={false}
                />
              ) : (
                <BotaoDeIcone
                  acao="novo"
                  rotulo="Nova APOINST"
                  indisponivel={`Nenhuma turma de ${ano} recebe APOINST (fora do arquivo e com DSA).`}
                  data-slot="abrir-nova-apoinst"
                />
              )
            ) : null}
          </BarraDeAcoes>
        </header>

        <AbasDeAtividades comCalendario={contexto.temCalendario}>
          {seAplica ? (
            <>
              <ConteudoDePainel painel="filtros">
                <FiltrosDeApoinst
                  turmas={opcoesDeTurma(
                    comDsa,
                    (codigo) => filtrarApoinst(todas, { ...filtro, turma: codigo }).length,
                  )}
                  cursos={opcoesDeCurso(
                    comDsa,
                    (codigo) => filtrarApoinst(todas, { ...filtro, curso: codigo }).length,
                  )}
                />
              </ConteudoDePainel>
              <ConteudoDePainel painel="estatisticas">
                <EstatisticasDeApoinst numeros={numeros} recorte={haFiltro} />
              </ConteudoDePainel>
            </>
          ) : null}
          {corpo}
        </AbasDeAtividades>
      </div>
    </ProvedorDePaineis>
  );
}
