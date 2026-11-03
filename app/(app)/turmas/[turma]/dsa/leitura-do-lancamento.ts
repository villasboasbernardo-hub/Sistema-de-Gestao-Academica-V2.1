/**
 * RA-4 (Bloco 18, spec 033) — o que SÓ o formulário de atividade do DSA usa: a lista de salas (o «Local»), as AEC
 * previstas do currículo da turma e as APOINST planejadas dela (o «Cumpre»).
 *
 * > *"Local (sala cadastrada OU texto livre)"* e *"vínculo opcional com uma AEC prevista ou uma APOINST planejada"* —
 * > `RA-4`, Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **FORA DE `lerPeriodoDoDsa`, DE PROPÓSITO**: aquela leitura também alimenta a planilha de contingência, e uma lista
 *    que falhasse ali entraria nos erros que RECUSAM a planilha (FR-006 da spec 015). Aqui a falha vira aviso no campo,
 *    e o lançamento continua possível — com o local em texto livre, e sem vínculo.
 * ⚠️ **O VEREDITO «JÁ CUMPRIDA» É O DO MÓDULO** (`lerPalestrasDasTurmas` → `quadroDasPrevistas`, só o salvo conta): o
 *    formulário não refaz a conta.
 * ⚠️ **«NÃO LI», «VOCÊ NÃO VÊ» E «NÃO HÁ» SÃO TRÊS** (gotcha 4): sem a permissão, a lista chega vazia pela RLS — e a tela
 *    diz que é o perfil, não que a turma não tem.
 */
import "server-only";

import type { OpcoesDaAtividade } from "@/lib/dominio/atividades/lancamento-de-atividade";
import { ehCumprida } from "@/lib/dominio/atividades/previstas";
import { naturezaDaSala, salasParaEscolher, type Sala } from "@/lib/dominio/salas";
import type { criarClienteDeServidor } from "@/lib/supabase/server";

import { lerApoinstDasTurmas, lerPalestrasDasTurmas } from "../../../atividades/leitura-do-planejado";

type ClienteDeServidor = Awaited<ReturnType<typeof criarClienteDeServidor>>;

const FRASE_DAS_SALAS =
  "Não foi possível ler a lista de salas agora: escreva o local. Se persistir, procure o suporte.";
const FRASE_DO_PERFIL_SEM_PREVISTAS =
  "O seu perfil não lê as AEC previstas do currículo: a lista do «Cumpre» pode estar incompleta.";

export async function lerOpcoesDaAtividade(
  supabase: ClienteDeServidor,
  entrada: {
    readonly turmaId: string;
    readonly turmaCodigo: string;
    readonly curriculoId: string | null;
    readonly salaDaTurma: string | null;
    readonly hoje: string;
    /** `cursos.ler` — quem lê as AEC previstas (a RLS de `aec_previstas_curriculo`). */
    readonly podeLerPrevistas: boolean;
  },
): Promise<OpcoesDaAtividade> {
  const turma = { id: entrada.turmaId, codigo: entrada.turmaCodigo, curriculoId: entrada.curriculoId };
  const [salasRes, palestras, apoinst] = await Promise.all([
    supabase
      .from("config_listas")
      .select("valor, ativo, metadados")
      .eq("lista", "salas")
      .order("valor"),
    lerPalestrasDasTurmas([turma], supabase),
    lerApoinstDasTurmas([turma], entrada.hoje, supabase),
  ]);

  const salas = salasRes.error
    ? []
    : salasParaEscolher((salasRes.data ?? []) as Sala[], entrada.salaDaTurma).map((s) => ({
        valor: s.valor,
        rotulo: naturezaDaSala(s) === "virtual" ? `${s.valor} (ambiente virtual)` : s.valor,
      }));

  const quadro = palestras.quadros.get(entrada.turmaId);
  const previstas = (quadro?.linhas ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    tipoRotulo: p.tipoRotulo,
    taPrevistos: p.taPrevistos,
    taLancados: p.taLancados,
    cumprida: ehCumprida(p.situacao),
    disciplinaId: p.disciplina?.id ?? null,
  }));
  const planejadas = apoinst.quadro.linhas
    .filter((a) => a.ativa && a.turmaId === entrada.turmaId)
    .map((a) => ({
      id: a.id,
      nome: a.nome,
      disciplinaCodigo: a.disciplina.codigo,
      taPrevistos: a.taPrevistos,
      taLancados: a.taLancados,
    }));

  const falhas = [palestras.erro, apoinst.erro].filter((e): e is string => e !== null);
  return {
    salas,
    avisoDasSalas: salasRes.error ? FRASE_DAS_SALAS : null,
    previstas,
    apoinst: planejadas,
    avisoDoVinculo:
      falhas[0] ?? (entrada.podeLerPrevistas ? null : FRASE_DO_PERFIL_SEM_PREVISTAS),
  };
}
