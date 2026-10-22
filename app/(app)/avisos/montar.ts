/**
 * A central de avisos — **a montagem**: o que cada quadro de hoje decidia, numa forma só (spec 022, Bloco 7, FR-004.3 e
 * FR-004.4).
 *
 * > *"Os quadros de aviso das páginas saem (sem perder nenhum aviso: liste os que existem hoje e onde passam a
 * > aparecer)."* — Bernardo Villas Boas, 22/10/2026
 *
 * ⚠️ **AQUI NÃO SE DECIDE AVISO NENHUM.** Quem decide são os predicados de sempre — `avisosDoCurso`, `tetosExcedidos`,
 *    `andamentoDaTurma` (pelo panorama), `alertasDeVista`, `painelDeTurmas`, `avisosDaTurma`, `avisosDoCadastro`,
 *    `alertaAcimaDaFaixa` e `alertaSemCapacitacao` —, chamados por `leitura.ts` com as mesmas leituras dos quadros. Esta
 *    função só dá a cada resultado o módulo, o sujeito (pelo CÓDIGO), a frase e o endereço onde ele se resolve. A tabela
 *    da §6 da spec é esta função, linha a linha.
 * ⚠️ **O MESMO FATO, UM AVISO SÓ**: a janela incompleta era dita pelo painel de `/turmas` e pelo quadro da ficha da
 *    turma; aqui as duas viram a mesma chave (`turmas:sem_janela:<turma>`), e a segunda sai.
 * ⚠️ **SEM I/O** (nada de `supabase`): a prova de que nenhum aviso se perde é de unidade, sobre a saída dos predicados.
 */
import { chaveDoAviso, type Aviso } from "@/lib/dominio/avisos/central";
import type { AlertaDeVista } from "@/lib/dominio/avaliacoes/alertas-de-vista";
import type { AvisoDeCadastro } from "@/lib/dominio/avisos-cadastro-instrutor";
import type { AvisoDaTurma } from "@/lib/dominio/avisos-da-turma";
import type { AvisoDoCurso } from "@/lib/dominio/avisos-do-curso";
import type { AlertaDoInstrutor } from "@/lib/dominio/alertas-instrutor";
import { TITULO_DO_AVISO, type AvisoDeTurma } from "@/lib/dominio/painel-de-turmas";
import { dataParaLeitura } from "@/lib/formato/data";
import {
  enderecoDaAbaDoCurso,
  enderecoDaEdicaoDoCurso,
  enderecoDaSecaoDeDisciplinas,
  enderecoDasAvaliacoesDaTurma,
  enderecoDaTurma,
  enderecoDoDsa,
} from "@/lib/navegacao/endereco-de-turma";

import { fraseDoExcedido, type TetoExcedido } from "../turmas/tetos-excedidos";

export type InstrutorNaCentral = {
  readonly codigo: string;
  /** O nome como a tela o mostra (`nomeEmTexto`). */
  readonly nome: string;
};

export type EntradaDaCentral = {
  /** Os avisos de cada curso em oferta (o quadro da página do curso). */
  readonly cursos: readonly { readonly sigla: string; readonly avisos: readonly AvisoDoCurso[] }[];
  /** As turmas com teto de AEC, TAD ou TR excedido (o curso e o Início). */
  readonly tetos: readonly TetoExcedido[];
  /** As turmas em andamento com saldo de capacidade negativo (o Início) — o veredito é de `andamentoDaTurma`. */
  readonly atrasadas: readonly string[];
  /** As vistas de prova atrasadas ou que vencem em breve (o Início e a ficha da turma). */
  readonly vistas: readonly AlertaDeVista[];
  /** O que falta nas turmas: janela, instrutor e conflito na semana (o painel de `/turmas`). */
  readonly doPainel: readonly AvisoDeTurma[];
  /** Os avisos de cadastro de cada turma (o quadro da ficha da turma). */
  readonly daFicha: readonly {
    readonly turmaCodigo: string;
    readonly avisos: readonly AvisoDaTurma[];
  }[];
  /** Os avisos de qualidade de cadastro dos instrutores (o quadro de `/instrutores`). */
  readonly doCadastro: readonly AvisoDeCadastro<InstrutorNaCentral>[];
  /** Os alertas da ficha de cada instrutor ativo, e a capacitação a corrigir. */
  readonly doInstrutor: readonly (InstrutorNaCentral & {
    readonly alertas: readonly AlertaDoInstrutor[];
    readonly capacitacaoACorrigir: string | null;
  })[];
};

/** Os avisos do curso que se resolvem nos dados do currículo; o do limite, na lista de turmas do curso. */
const DO_CURRICULO = new Set(["sem_duracao_semanas", "sem_proposito"]);

const enderecoDoInstrutor = (codigo: string) => `/instrutores/${encodeURIComponent(codigo)}`;

export function montarAvisos(entrada: EntradaDaCentral): readonly Aviso[] {
  const avisos: Aviso[] = [];

  for (const { sigla, avisos: doCurso } of entrada.cursos) {
    for (const a of doCurso) {
      avisos.push({
        chave: chaveDoAviso("cursos", a.chave, `${sigla}${a.detalhe ? `:${a.detalhe}` : ""}`),
        modulo: "cursos",
        titulo: `${sigla}: ${a.titulo}`,
        detalhe: a.detalhe ?? null,
        destino: DO_CURRICULO.has(a.chave)
          ? enderecoDaEdicaoDoCurso(sigla)
          : enderecoDaAbaDoCurso(sigla, "turmas"),
      });
    }
  }

  for (const e of entrada.tetos) {
    avisos.push({
      chave: chaveDoAviso("turmas", `teto_${e.categoria}_${e.alerta}`, e.turmaCodigo),
      modulo: "turmas",
      titulo: `${e.turmaCodigo}: teto de ${e.categoria.toUpperCase()} excedido`,
      detalhe: fraseDoExcedido(e),
      destino: enderecoDaTurma(e.turmaCodigo),
    });
  }

  for (const codigo of entrada.atrasadas) {
    avisos.push({
      chave: chaveDoAviso("turmas", "em_atraso", codigo),
      modulo: "turmas",
      titulo: `${codigo}: em atraso`,
      detalhe:
        "Em andamento com saldo de capacidade negativo: o que falta da carga horária não cabe nos dias úteis até o término.",
      destino: enderecoDaTurma(codigo),
    });
  }

  for (const v of entrada.vistas) {
    avisos.push({
      chave: chaveDoAviso("avaliacoes", `vista_${v.tipoDoAlerta}`, v.id),
      modulo: "avaliacoes",
      titulo: `${v.turma}: vista de prova ${v.tipoDoAlerta === "atrasada" ? "atrasada" : "vence em breve"}`,
      detalhe: `${v.disciplina} · ${v.tipo}, aplicada em ${dataParaLeitura(v.aplicacao)} — a vista vence em ${dataParaLeitura(v.venceEm)}.`,
      destino: enderecoDasAvaliacoesDaTurma(v.turma),
    });
  }

  for (const a of entrada.doPainel) {
    avisos.push({
      chave: chaveDoAviso("turmas", a.tipo, a.turmaCodigo),
      modulo: "turmas",
      titulo: `${a.turmaCodigo}: ${TITULO_DO_AVISO[a.tipo]}`,
      detalhe: a.detalhe,
      destino:
        a.tipo === "sem_instrutor"
          ? enderecoDaSecaoDeDisciplinas(a.turmaCodigo)
          : a.tipo === "conflito"
            ? /* O DSA abre na semana de hoje, que é a do conflito. */ enderecoDoDsa(a.turmaCodigo)
            : enderecoDaTurma(a.turmaCodigo),
    });
  }

  for (const { turmaCodigo, avisos: daTurma } of entrada.daFicha) {
    for (const a of daTurma) {
      avisos.push({
        chave: chaveDoAviso("turmas", a.chave, turmaCodigo),
        modulo: "turmas",
        titulo: `${turmaCodigo}: ${a.titulo}`,
        detalhe: null,
        destino: enderecoDaTurma(turmaCodigo),
      });
    }
  }

  for (const regra of entrada.doCadastro) {
    for (const i of regra.instrutores) {
      avisos.push({
        chave: chaveDoAviso("instrutores", regra.chave, i.codigo),
        modulo: "instrutores",
        titulo: `${i.nome}: ${regra.titulo}`,
        detalhe: null,
        destino: enderecoDoInstrutor(i.codigo),
      });
    }
  }

  for (const i of entrada.doInstrutor) {
    for (const a of i.alertas) {
      avisos.push({
        chave: chaveDoAviso("instrutores", a.chave, i.codigo),
        modulo: "instrutores",
        titulo: `${i.nome}: ${a.titulo}`,
        detalhe: a.detalhes.join(" "),
        destino: enderecoDoInstrutor(i.codigo),
      });
    }
    if (i.capacitacaoACorrigir !== null) {
      avisos.push({
        chave: chaveDoAviso("instrutores", "capacitacao_a_corrigir", i.codigo),
        modulo: "instrutores",
        titulo: `${i.nome}: Capacitação didática a corrigir`,
        detalhe: `«${i.capacitacaoACorrigir}» não está na lista de capacitações; escolha na lista.`,
        destino: enderecoDoInstrutor(i.codigo),
      });
    }
  }

  /* O mesmo fato dito por dois quadros (a janela incompleta): a primeira ocorrência fica. */
  const vistas = new Set<string>();
  return avisos.filter((a) => (vistas.has(a.chave) ? false : (vistas.add(a.chave), true)));
}
