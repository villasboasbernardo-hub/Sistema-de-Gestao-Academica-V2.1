/**
 * `/atividades` — a lista de atividades não letivas (spec 014, PR 2, `FR-063`; `RF-EXTRA-03`).
 *
 * ⚠️ **SÓ LEITURA.** O lançamento continua no DSA da turma; aqui se consulta por turma, tipo,
 *    categoria (Apoio Individualizado e a global inclusive), data e TA.
 * ⚠️ **O FILTRO ESTÁ NA URL** e é validado antes de virar predicado (`RF-NAV-01`): valor fora do
 *    contrato cai para o padrão.
 * ⚠️ **"NÃO HÁ" × "VOCÊ NÃO VÊ"** (gotcha 4): a RLS nega em silêncio, e a frase do vazio distingue.
 * ⚠️ SEM MARCADOR DE CLIENTE. Só os filtros, as abas e o painel do calendário são folha.
 * ⚠️ **A ABA CALENDÁRIO** (spec 023, Bloco 8, FR-005 a FR-014) só existe para quem tem `calendario.criar` ou
 *    `calendario.editar`; para os demais a página é a de antes, sem abas, e `?aba=calendario` cai na lista. Só a aba
 *    aberta é lida no servidor.
 * ⚠️ **O *EXCLUIR* DO CALENDÁRIO É SÓ DO ADMIN E NUNCA BLOQUEADO** (D-COR-7, spec 027): exclusão lógica, depois do alerta
 *    com o impacto calculado na hora.
 * ⚠️ **AS ABAS SEGUEM O ANO ESCOLHIDO** (RT-6 do Bloco 10, spec 025, D-26): a lista mostra só as atividades do ano
 *    (as datas *De* e *Até* recortam dentro dele), e o filtro de turma oferece só as turmas do ano. O seletor é o mesmo de
 *    todo módulo, no cabeçalho do sistema, e o *Filtros* e as *Estatísticas* da lista são ícones da barra (RT-4).
 * ⚠️ **ESTA PÁGINA SÓ DESPACHA** (Bloco 18, spec 033): cada aba lê o que precisa — Atividades (`AbaDeAtividades`),
 *    Palestras, APOINST — e o Calendário fica aqui, como estava.
 */
import {
  excluirLinhaDoCalendario,
  gravarLinhaDoCalendario,
  lerImpactoDaExclusao,
  mudarSituacaoDaLinha,
} from "@/lib/acoes/calendario";
import { desfazerParada, pararDia } from "@/lib/acoes/dia-parado";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { anoEscolhido } from "@/lib/navegacao/ano-da-tela";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { lerParametros } from "@/lib/navegacao/esquema";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { alcanceDoPerfil } from "../cursos/consulta";
import { AbaDeApoinst } from "./AbaDeApoinst";
import { AbaDeAtividades } from "./AbaDeAtividades";
import { AbaDePalestras } from "./AbaDePalestras";
import { AbasDeAtividades } from "./AbasDeAtividades";
import type { ContextoDoModulo } from "./contexto";
import { lerCalendario } from "./calendario";
import { PainelDoCalendario } from "./PainelDoCalendario";

export default async function Atividades({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { valores } = lerParametros("/atividades", await searchParams);

  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  const podeCriarNoCalendario = pode(permissoes, "calendario", "criar");
  const podeEditarCalendario = pode(permissoes, "calendario", "editar");
  const temCalendario = podeCriarNoCalendario || podeEditarCalendario;
  const aba =
    valores.aba === "palestras" || valores.aba === "apoinst"
      ? valores.aba
      : temCalendario && valores.aba === "calendario"
        ? "calendario"
        : "atividades";

  const hoje = hojeNaCiaara();
  const escolha = await anoEscolhido(String(valores.ano ?? ""), hoje);
  const ano = escolha.ano;

  /* Bloco 18 (spec 033, FR-006.5 e FR-006.6): as abas Palestras e APOINST, para todos os que leem atividades. */
  const contexto: ContextoDoModulo = {
    ano,
    hoje,
    permissoes,
    temCalendario,
    valores,
    alcance: alcanceDoPerfil(usuario?.perfil, usuario?.escopoCurso),
  };
  if (aba === "palestras") return <AbaDePalestras contexto={contexto} />;
  if (aba === "apoinst") return <AbaDeApoinst contexto={contexto} />;

  if (aba === "calendario") {
    const dados = await lerCalendario(await criarClienteDeServidor(), ano);
    /*
     * D-COR-7 (spec 027, FR-004): só o Admin exclui do calendário — e o *Excluir* nunca é bloqueado (a D-COR-6 deixou de
     * valer aqui). Quem recusa a chamada direta é o banco (`app.eh_admin()`).
     */
    const podeExcluirDoCalendario = usuario?.perfil === "admin";
    return (
      <div className="flex flex-col gap-4" data-slot="lista-de-atividades">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-texto text-xl font-semibold">Atividades</h1>
            <p className="text-texto-suave text-sm">
              Feriados, licenças e paradas de todas as turmas. Linha de dia inteiro bloqueia aula
              nova e desconta capacidade do saldo das turmas que alcança.
            </p>
          </div>
        </header>
        <AbasDeAtividades comCalendario={temCalendario}>
          <PainelDoCalendario
            ano={ano}
            dados={dados}
            podeCriar={podeCriarNoCalendario}
            podeEditar={podeEditarCalendario}
            gravar={gravarLinhaDoCalendario}
            mudarSituacao={mudarSituacaoDaLinha}
            pararDia={pararDia}
            desfazerParada={desfazerParada}
            podeExcluir={podeExcluirDoCalendario}
            lerImpacto={lerImpactoDaExclusao}
            excluir={excluirLinhaDoCalendario}
          />
        </AbasDeAtividades>
      </div>
    );
  }

  /* Bloco 18 (spec 033, FR-006.1 a FR-006.4): a lista, os filtros, as estatísticas e as ações por linha. */
  return <AbaDeAtividades contexto={contexto} />;
}
