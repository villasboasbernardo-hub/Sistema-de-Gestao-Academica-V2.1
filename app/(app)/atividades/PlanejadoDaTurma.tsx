/**
 * Bloco 18 (spec 033, RA-5 e RA-6; FR-007.2 e FR-008.1) — as PALESTRAS e a APOINST de UMA turma: a ficha da turma
 * (abas Palestras e APOINST, com as ações do trio) e o acompanhamento do DSA (só leitura) desenham daqui.
 *
 * ⚠️ **SERVIDOR**: lê pelo leitor compartilhado (`leitura-do-planejado.ts`) e entrega as linhas prontas aos quadros
 *    (folhas). Nenhum veredito aqui: a situação vem de `lib/dominio/atividades/`.
 * ⚠️ **«NÃO HÁ» × «VOCÊ NÃO VÊ» × «NÃO FOI POSSÍVEL LER»** (gotcha 4, RN-DEG-01): o perfil sem `atividades_nao_letivas.ler`
 *    é dito como tal (a RLS devolveria lista vazia), a leitura que falhou é dita como falha, e só o resto é «não há».
 * ⚠️ **A TURMA EAD PURA NÃO TEM DSA** (spec 024, FR-018): a frase de sempre, e nada mais.
 * ⚠️ **A APOINST SÓ DO ANO INICIAL EM DIANTE** (`apoinst.ano_inicial`, parâmetro — regra 8): a turma anterior diz por
 *    que não tem, e não ganha *Nova APOINST* (o banco recusaria).
 * ⚠️ **A CONFIRMAÇÃO DA GRAVAÇÃO** vem da URL (`?gravada=`), escrita por `enderecoDaAbaDaTurmaGravada` — a ficha só a
 *    mostra nas gravações dela, e estas são desta aba.
 */
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { pode } from "@/lib/autorizacao/matriz";
import { apoinstSeAplica } from "@/lib/dominio/atividades/apoinst";
import {
  avulsasDaAba,
  linhasDeApoinst,
  linhasDePalestras,
  numerosDaApoinst,
  numerosDasPalestras,
  type TurmaDaAba,
} from "@/lib/dominio/atividades/palestras-e-apoinst-na-tela";
import { AVISO_DE_TURMA_EAD } from "@/lib/dominio/dsa/ead-puro";
import { dataParaLeitura } from "@/lib/formato/data";

import type { ContextoDaTurmaNasAbas } from "../turmas/[turma]/contexto-das-abas";
import { NovaApoinst } from "./FormularioDeApoinst";
import { lerAnoInicialDaApoinst, lerOpcoesDaApoinst } from "./leitura-de-palestras-e-apoinst";
import { lerApoinstDasTurmas, lerPalestrasDasTurmas } from "./leitura-do-planejado";
import { QuadroDeApoinst } from "./QuadroDeApoinst";
import { QuadroDePalestras } from "./QuadroDePalestras";

/** O `?gravada=` desta aba → a frase e o `data-slot` da confirmação. */
const CONFIRMACAO: Readonly<Record<string, { readonly frase: string; readonly slot: string }>> = {
  marcacao: { frase: "Marcação registrada.", slot: "marcacao-gravada" },
  "marcacao-desfeita": { frase: "Marcação desfeita.", slot: "marcacao-desfeita-gravada" },
  apoinst: { frase: "APOINST gravada.", slot: "apoinst-gravada" },
  "apoinst-desativada": { frase: "APOINST desativada.", slot: "apoinst-desativada-gravada" },
  "apoinst-reativada": { frase: "APOINST reativada.", slot: "apoinst-reativada-gravada" },
};

const DA_PALESTRA = new Set(["marcacao", "marcacao-desfeita"]);

function Confirmacao({ contexto, aceitas }: { readonly contexto: ContextoDaTurmaNasAbas; readonly aceitas: ReadonlySet<string> }) {
  const gravada = String(contexto.valores.gravada ?? "");
  const c = contexto.somenteLeitura || !aceitas.has(gravada) ? undefined : CONFIRMACAO[gravada];
  if (!c) return null;
  return (
    <p role="status" className="text-executado-tinta text-sm" data-slot={c.slot}>
      {c.frase}
    </p>
  );
}

function SemPermissao() {
  return (
    <EstadoVazio
      motivo="sem-permissao"
      titulo="O seu perfil não lê as atividades"
      detalhe="Quem nega o acesso é o banco, e a lista chegaria vazia por isso — não por falta de atividade."
    />
  );
}

function FalhaDeLeitura({ detalhe }: { readonly detalhe: string }) {
  return (
    <EstadoVazio motivo="sem-permissao" titulo="Não foi possível ler agora" detalhe={detalhe} />
  );
}

function TurmaEad({ slot }: { readonly slot: string }) {
  return (
    <p role="status" className="text-texto-suave text-sm" data-slot={slot}>
      {AVISO_DE_TURMA_EAD}
    </p>
  );
}

function turmaDaAba(contexto: ContextoDaTurmaNasAbas): TurmaDaAba & { readonly curriculoId: string | null } {
  return {
    id: contexto.turmaId,
    codigo: contexto.turmaCodigo,
    cursoCodigo: "",
    arquivada: contexto.arquivada,
    curriculoId: contexto.curriculoId,
  };
}

/** As AEC previstas do currículo da turma e as palestras avulsas dela. */
export async function PalestrasDeUmaTurma({ contexto }: { readonly contexto: ContextoDaTurmaNasAbas }) {
  if (contexto.ead) return <TurmaEad slot="palestras-turma-ead" />;
  if (!pode(contexto.permissoes, "atividades_nao_letivas", "ler")) return <SemPermissao />;

  const turma = turmaDaAba(contexto);
  const lidas = await lerPalestrasDasTurmas([turma]);
  if (lidas.erro) return <FalhaDeLeitura detalhe={lidas.erro} />;

  const linhas = linhasDePalestras([turma], lidas.quadros);
  const avulsas = avulsasDaAba([turma], lidas.avulsas);
  const n = numerosDasPalestras(linhas, avulsas);
  const podeMarcar =
    pode(contexto.permissoes, "planejamento_de_atividades", "editar") &&
    !contexto.arquivada &&
    !contexto.somenteLeitura;

  return (
    <section
      className="flex flex-col gap-3"
      data-slot={contexto.somenteLeitura ? "acompanhamento-de-palestras" : "palestras-da-turma"}
      aria-label="Palestras da turma"
    >
      <header className="flex flex-col">
        <h2 className="text-texto text-sm font-semibold">Palestras e visitas</h2>
        <p className="text-texto-suave text-xs" data-slot="resumo-das-palestras">
          {n.previstas === 0
            ? "O currículo da turma não traz AEC prevista."
            : `${n.cumpridas} de ${n.previstas} AEC previstas do currículo cumpridas`}
          {n.obrigatoriasPendentes > 0 ? ` · ${n.obrigatoriasPendentes} obrigatória(s) a cumprir` : ""}
          {` · ${n.avulsas} fora do currículo`}
          {contexto.somenteLeitura ? ` · situação em ${dataParaLeitura(contexto.hoje)}` : ""}.
        </p>
        {contexto.curriculoId === null ? (
          <p className="text-atrasado-tinta text-xs" data-slot="turma-sem-curriculo">
            A turma não tem currículo escolhido: as AEC previstas vêm do currículo da turma.
          </p>
        ) : !pode(contexto.permissoes, "cursos", "ler") ? (
          <p className="text-texto-suave text-xs" data-slot="previstas-sem-permissao">
            O seu perfil não lê o currículo: as AEC previstas não aparecem para você.
          </p>
        ) : null}
      </header>
      <Confirmacao contexto={contexto} aceitas={DA_PALESTRA} />
      <QuadroDePalestras
        linhas={linhas}
        avulsas={avulsas}
        comTurma={false}
        podeMarcar={podeMarcar}
        turmaDaFicha={contexto.somenteLeitura ? null : contexto.turmaCodigo}
        hoje={contexto.hoje}
      />
    </section>
  );
}

/** A APOINST planejada da turma (do ano inicial em diante). */
export async function ApoinstDeUmaTurma({ contexto }: { readonly contexto: ContextoDaTurmaNasAbas }) {
  if (contexto.ead) return <TurmaEad slot="apoinst-turma-ead" />;
  if (!pode(contexto.permissoes, "atividades_nao_letivas", "ler")) return <SemPermissao />;

  const turma = turmaDaAba(contexto);
  const podePlanejar =
    pode(contexto.permissoes, "planejamento_de_atividades", "editar") &&
    !contexto.arquivada &&
    !contexto.somenteLeitura;
  const [anoInicial, lidas, opcoes] = await Promise.all([
    lerAnoInicialDaApoinst(contexto.anoLetivo),
    lerApoinstDasTurmas([turma], contexto.hoje),
    podePlanejar ? lerOpcoesDaApoinst([turma.id]) : Promise.resolve(null),
  ]);

  if (!apoinstSeAplica(contexto.anoLetivo, anoInicial.valor)) {
    return (
      <p role="status" className="text-texto-suave text-sm" data-slot="apoinst-nao-se-aplica">
        A APOINST planejada vale para as turmas de {anoInicial.valor} em diante. Esta turma é de{" "}
        {contexto.anoLetivo} e fica como está, sem APOINST planejada (sem retroajuste).
      </p>
    );
  }
  if (lidas.erro) return <FalhaDeLeitura detalhe={lidas.erro} />;

  const linhas = linhasDeApoinst([turma], lidas.quadro.linhas);
  const n = numerosDaApoinst(linhas);
  const opcoesDoFormulario =
    opcoes === null
      ? null
      : {
          disciplinas: Object.fromEntries(opcoes.disciplinas),
          escala: opcoes.escala,
          podeLerInstrutores: pode(contexto.permissoes, "instrutores", "ler"),
          erro: opcoes.erro,
        };

  return (
    <section
      className="flex flex-col gap-3"
      data-slot={contexto.somenteLeitura ? "acompanhamento-de-apoinst" : "apoinst-da-turma"}
      aria-label="APOINST da turma"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col">
          <h2 className="text-texto text-sm font-semibold">APOINST planejada</h2>
          <p className="text-texto-suave text-xs" data-slot="resumo-da-apoinst">
            {n.ativas === 0
              ? "Nenhuma APOINST planejada."
              : `${n.ativas} planejada(s): ${n.porSituacao.concluida} concluída(s), ${n.porSituacao.em_andamento} em andamento, ${n.porSituacao.atrasada} atrasada(s), ${n.porSituacao.planejada} sem lançamento`}
            {n.desativadas > 0 ? ` · ${n.desativadas} desativada(s)` : ""}
            {contexto.somenteLeitura ? ` · situação em ${dataParaLeitura(contexto.hoje)}` : ""}.
            {" "}A execução são os lançamentos do DSA vinculados a cada uma.
          </p>
          {!anoInicial.lido ? (
            <p className="text-atrasado-tinta text-xs" data-slot="ano-inicial-nao-lido">
              Não foi possível ler o ano inicial da APOINST; o banco confere ao gravar.
            </p>
          ) : null}
        </div>
        {podePlanejar && opcoesDoFormulario !== null ? (
          <NovaApoinst
            turmas={[{ id: turma.id, codigo: turma.codigo }]}
            opcoes={opcoesDoFormulario}
            naFicha
          />
        ) : null}
      </header>
      <Confirmacao contexto={contexto} aceitas={new Set(Object.keys(CONFIRMACAO))} />
      <QuadroDeApoinst
        linhas={linhas}
        comTurma={false}
        podePlanejar={podePlanejar}
        turmaDaFicha={contexto.somenteLeitura ? null : contexto.turmaCodigo}
        hoje={contexto.hoje}
        opcoes={opcoesDoFormulario}
        observacoes={opcoes === null ? {} : Object.fromEntries(opcoes.observacoes)}
      />
    </section>
  );
}
