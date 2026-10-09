/**
 * O documento do DSA no **modelo v4** — a grade da semana com cabeçalho institucional, quadro de
 * carga horária e assinaturas (`RF-PDF-01`, `RF-DSA-06`, `RF-INSTR-15`, `FR-036`).
 *
 * > Referência: `docs/referencias/dsa-modelo/DSA - Modelo v4.dc.html` *(modelo escolhido por
 * > Bernardo Villas Boas em 07/10/2026)*.
 *
 * ⚠️ **É SÓ APRESENTAÇÃO.** As linhas, as colunas e a posição de cada cartão vêm de
 * `gradeDoPapel` (`lib/dominio/dsa`); o resto, de `montarDocumentoDoDsa`. A tela da turma e a rota
 * `/print/dsa` desenham **este mesmo componente** com **o mesmo objeto**.
 *
 * ⚠️ **NENHUM AVISO CHEGA AO PAPEL** (`FR-039`, `SC-013`): ausência sai como célula vazia ou `—`,
 * nunca `null`, `undefined`, `NaN` ou identificador.
 */
import Image from "next/image";
import { Barlow } from "next/font/google";

import {
  rubricaComEdicao,
  rubricaResolvida,
  type EdicaoDasAssinaturas,
  type LadoDaAssinatura,
} from "@/lib/dominio/dsa/assinatura-editada";
import type { Assinatura } from "@/lib/dominio/dsa/assinaturas";
import type { CartaoDaGrade, GradeDoPapel } from "@/lib/dominio/dsa/grade-do-papel";
import type { DiaImpresso, LinhaImpressa } from "@/lib/dominio/dsa/impressao";
import { NOTA_DO_ESTUDO_INDIVIDUAL, ROTULO_DE_OBSERVACOES } from "@/lib/dominio/dsa/impressao";
import { NUMERO_AUSENTE_NO_CABECALHO } from "@/lib/dominio/dsa/numero-do-dsa";
import {
  dataComDiaDaSemana,
  dataParaLeitura,
  instanteComHoraParaLeitura,
} from "@/lib/formato/data";

import type { DadosDoDocumento } from "./documento";

import "./documento.css";

/* ⚠️ Fonte do modelo, servida pelo próprio Next (`next/font` baixa no build e hospeda junto): o papel não depende de rede no momento de imprimir (`FR-015`). */
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/** O cabeçalho institucional — **texto fixo do documento oficial** (`praticas-da-planilha.md` §1.2). */
const SIGLA_DA_ORGANIZACAO = "CIAARA";
const NOME_DA_ORGANIZACAO = "CENTRO DE INSTRUÇÃO E ADESTRAMENTO ALMIRANTE RADLER DE AQUINO";

export function DocumentoDoDsa({
  dados,
  nomeDeQuemImprime,
  geradoEm,
  assinaturasEditadas = {},
}: {
  readonly dados: DadosDoDocumento;
  readonly nomeDeQuemImprime: string | null;
  /** Instante ISO — vem de quem desenha, para a tela e o papel não divergirem por relógio. */
  readonly geradoEm: string;
  /**
   * O que foi editado na tela antes de imprimir (item 4 da conferência do PR #40, 08/10/2026). Vale
   * só para este papel — `responsaveis_curso` não muda. Sem edição, sai o resolvido pela vigência.
   */
  readonly assinaturasEditadas?: EdicaoDasAssinaturas;
}) {
  const { grade } = dados;
  const nomes = new Map(dados.quadroDeCh.map((d) => [d.codigo, d.nome] as const));
  const numero = dados.numero === null ? NUMERO_AUSENTE_NO_CABECALHO : String(dados.numero);
  /* Mais linhas ou o sábado: a mesma folha, com letra e espaço menores — nunca conteúdo cortado. */
  const compacto =
    grade !== null &&
    (grade.faixas.filter((f) => f.tipo === "tempo").length >= 9 || grade.colunas.length >= 6);

  return (
    <div
      className={`dsa4 ${barlow.className}${compacto ? " dsa4-compacto" : ""}`}
      data-slot="dsa-impresso"
    >
      <div className="dsa4-faixa-topo" />
      <header className="dsa4-cabecalho">
        <Image
          src="/marinha/marinha-do-brasil-vertical.png"
          alt="Marinha do Brasil"
          width={120}
          height={120}
          priority
          unoptimized
          className="dsa4-logo"
        />
        <div className="dsa4-titulo">
          <span className="dsa4-organizacao">
            {SIGLA_DA_ORGANIZACAO} · {NOME_DA_ORGANIZACAO}
          </span>
          <h1 data-slot="dsa-curso">{dados.curso}</h1>
          <span className="dsa4-subtitulo">Detalhe Semanal de Aulas</span>
        </div>
        <Image
          src="/marinha/brasao-ciaara.png"
          alt="Brasão do CIAARA"
          width={120}
          height={120}
          priority
          unoptimized
          className="dsa4-logo dsa4-logo-direita"
        />
      </header>

      <div className="dsa4-faixa-cabecalho" />
      <div className="dsa4-identificacao">
        <Campo rotulo="Semana">
          {dados.semana.numero}/{dados.semana.ano}
        </Campo>
        <Campo rotulo="DSA" slot="dsa-numero">
          Nº {numero}
        </Campo>
        <Campo rotulo="Período" slot="dsa-intervalo">
          {dataParaLeitura(dados.primeiro)} a {dataParaLeitura(dados.ultimo)}
        </Campo>
        {/* ⚠️ O `ALT` ainda não é registrado (`Q-3`): «não aparece em vez de aparecer errado». */}
        <Campo rotulo="Alteração">ALT —</Campo>
        <Campo rotulo="Alunos" slot={dados.alunos === null ? undefined : "dsa-alunos"}>
          {dados.alunos === null ? "—" : dados.alunos}
        </Campo>
      </div>

      {grade === null ? (
        <ListaSemRelogio dias={dados.dias} />
      ) : (
        <Grade grade={grade} nomes={nomes} />
      )}

      <div className="dsa4-legendas">
        <span className="dsa4-marca-ch">Carga horária</span>
        <div className="dsa4-legendas-direita">
          {dados.legenda.length > 0 ? (
            <div data-slot="dsa-legenda" className="dsa4-tecnicas">
              <strong>TÉCNICAS DE ENSINO</strong>
              {dados.legenda.map((i) => (
                <span key={i.sigla}>
                  <b>{i.sigla}</b> — {i.nome}
                </span>
              ))}
            </div>
          ) : null}
          <div className="dsa4-tipos">
            <strong>LEGENDA</strong>
            <span>
              <i className="dsa4-amostra dsa4-amostra-aula" />
              Aula
            </span>
            <span>
              <i className="dsa4-amostra dsa4-amostra-avaliacao" />
              Avaliação
            </span>
            <span>
              <i className="dsa4-amostra dsa4-amostra-estudo" />
              Estudo individual *
            </span>
            <span>
              <i className="dsa4-amostra dsa4-amostra-intervalo" />
              Intervalo
            </span>
          </div>
        </div>
      </div>

      <section className="dsa4-rodape">
        <div className="dsa4-quadro">
          {/* ⚠️ **SÓ AS DISCIPLINAS DA SEMANA** (`SC-014`) — o currículo inteiro estoura a A4. */}
          {dados.quadroDeCh.length > 0 ? (
            <div className="dsa4-quadro-colunas" data-slot="dsa-quadro-de-ch">
              {/* Mais de quatro disciplinas: o quadro se divide em duas colunas, para não roubar a altura da grade. */}
              {metades(dados.quadroDeCh).map((parte, i) => (
                <table key={i}>
                  <thead>
                    <tr>
                      <th scope="col">Cód.</th>
                      <th scope="col">Disciplina</th>
                      <th scope="col">CH. prevista</th>
                      <th scope="col">CH. cumprida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parte.map((d) => (
                      <tr key={d.codigo}>
                        <td>{d.codigo}</td>
                        <td>{d.nome}</td>
                        <td className="dsa4-num">{d.prevista}</td>
                        <td className="dsa4-num dsa4-cumprida">{d.cumprida}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </div>
          ) : null}
          <div data-slot="dsa-observacoes" className="dsa4-observacoes">
            {/* ⚠️ Linha em branco para escrever à mão (`H8`, opção a, 05/10/2026). */}
            <strong>{ROTULO_DE_OBSERVACOES}</strong>
            <div className="dsa-observacoes" />
          </div>
        </div>
        <div className="dsa4-assinaturas" data-slot="dsa-assinaturas">
          <Rubrica
            lado="esquerda"
            assinatura={dados.assinaturas.esquerda}
            nomeDeQuemImprime={nomeDeQuemImprime}
            edicao={assinaturasEditadas}
          />
          <Rubrica
            lado="direita"
            assinatura={dados.assinaturas.direita}
            nomeDeQuemImprime={nomeDeQuemImprime}
            edicao={assinaturasEditadas}
          />
        </div>
      </section>

      <div className="dsa4-faixa-rodape" />
      <footer className="dsa4-pe">
        <span data-slot="dsa-nota-do-ei">{NOTA_DO_ESTUDO_INDIVIDUAL}</span>
        {/*
          ⚠️ **SEM A FRASE DO «LANÇADO À FRENTE», COMO NA TELA** (dúvida 2 do PR #40, decisão de
             Bernardo Villas Boas, 08/10/2026: "tela e papel iguais"). O cálculo continua no
             documento; só a frase saiu.
        */}
        <span data-slot="dsa-gerado-em">
          Gerado em: {instanteComHoraParaLeitura(geradoEm)} · Marinha do Brasil ·{" "}
          {SIGLA_DA_ORGANIZACAO} · {dados.curso} · DSA Nº {numero}
        </span>
      </footer>
    </div>
  );
}

function metades<T>(itens: readonly T[]): readonly (readonly T[])[] {
  if (itens.length <= 4) return [itens];
  const meio = Math.ceil(itens.length / 2);
  return [itens.slice(0, meio), itens.slice(meio)];
}

function Campo({
  rotulo,
  slot,
  children,
}: {
  readonly rotulo: string;
  readonly slot?: string | undefined;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="dsa4-campo">
      <span className="dsa4-campo-rotulo">{rotulo}</span>
      <span className="dsa4-campo-valor" data-slot={slot}>
        {children}
      </span>
    </div>
  );
}

/** A grade: cabeçalho dos dias, régua dos tempos, intervalos, almoço e cartões. */
function Grade({
  grade,
  nomes,
}: {
  readonly grade: GradeDoPapel;
  readonly nomes: ReadonlyMap<string, string>;
}) {
  const colunas = grade.colunas.length;
  const ultimaLinha = grade.faixas.length + 2;
  const linhas = grade.faixas
    .map((f) =>
      f.tipo === "tempo"
        ? "minmax(auto, 1fr)"
        : f.tipo === "almoco"
          ? "var(--dsa4-almoco)"
          : "var(--dsa4-intervalo)",
    )
    .join(" ");

  return (
    <>
      <section
        className="dsa4-grade"
        data-slot="dsa-corpo"
        style={{
          gridTemplateColumns: `var(--dsa4-regua) repeat(${colunas}, minmax(0, 1fr))`,
          gridTemplateRows: `var(--dsa4-cabeca) ${linhas}`,
        }}
      >
        <div className="dsa4-cabeca-fundo" style={{ gridColumn: "1 / -1", gridRow: "1 / 2" }} />
        <div className="dsa4-cabeca-horario" style={{ gridColumn: "1 / 2", gridRow: "1 / 2" }}>
          Horário
        </div>
        {grade.colunas.map((c, i) => (
          <div
            key={`cab-${c.data}`}
            className="dsa4-cabeca-dia"
            style={{ gridColumn: `${i + 2} / ${i + 3}`, gridRow: "1 / 2" }}
          >
            <b>{c.sigla}</b>
            <span>{c.diaMes}</span>
          </div>
        ))}
        {grade.colunas.map((c, i) => (
          <div
            key={`fundo-${c.data}`}
            className={`dsa4-coluna${i % 2 ? " dsa4-coluna-par" : ""}`}
            style={{ gridColumn: `${i + 2} / ${i + 3}`, gridRow: `2 / ${ultimaLinha}` }}
          />
        ))}

        {grade.faixas.map((f, k) => {
          const linha = `${k + 2} / ${k + 3}`;
          if (f.tipo === "tempo") {
            return (
              <div
                key={`t-${f.numero}`}
                className={`dsa4-tempo${f.excepcional ? " dsa4-tempo-excepcional" : ""}`}
                style={{ gridColumn: "1 / 2", gridRow: linha }}
              >
                <b>{f.numero}º</b>
                <span>
                  <span className="dsa4-tempo-inicio">{f.inicio}</span>
                  <span>{f.fim}</span>
                </span>
              </div>
            );
          }
          if (f.tipo === "almoco") {
            return (
              <div key={`a-${k}`} style={{ display: "contents" }}>
                <div className="dsa4-almoco-regua" style={{ gridColumn: "1 / 2", gridRow: linha }}>
                  {f.inicio}–{f.fim}
                </div>
                <div className="dsa4-almoco" style={{ gridColumn: "2 / -1", gridRow: linha }}>
                  Almoço
                </div>
              </div>
            );
          }
          return (
            <div key={`i-${k}`} style={{ display: "contents" }}>
              <div className="dsa4-intervalo-regua" style={{ gridColumn: "1 / 2", gridRow: linha }}>
                {f.minutos} min
              </div>
              <div className="dsa4-intervalo" style={{ gridColumn: "2 / -1", gridRow: linha }} />
            </div>
          );
        })}

        {/* ⚠️ Feriado de dia inteiro: a faixa com a descrição, e o que foi lançado nele por cima (`Q-16`). */}
        {grade.colunas.map((c, i) =>
          c.bloqueio === null ? null : (
            <div
              key={`b-${c.data}`}
              className="dsa4-bloqueio"
              data-slot="dsa-dia-bloqueado"
              style={{ gridColumn: `${i + 2} / ${i + 3}`, gridRow: `2 / ${ultimaLinha}` }}
            >
              <span>{c.bloqueio}</span>
            </div>
          ),
        )}

        {grade.cartoes.map((c) => (
          <Cartao
            key={`${c.linha.chave}-${c.parte}`}
            cartao={c}
            nome={nomes.get(c.linha.disciplina) ?? ""}
            bloqueado={grade.colunas[c.coluna]?.bloqueio != null}
          />
        ))}
      </section>

      {grade.foraDaGrade.length > 0 ? (
        <ul className="dsa4-fora" data-slot="dsa-fora-da-grade">
          {grade.foraDaGrade.map(({ coluna, linha }) => (
            <li key={linha.chave}>
              <b>{grade.colunas[coluna]?.sigla}</b> {linha.disciplina} {linha.conteudo}
              {linha.tempos === null ? "" : ` · ${linha.tempos} TA`} · {linha.local} · {linha.te} ·{" "}
              {linha.instrutor}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function Cartao({
  cartao,
  nome,
  bloqueado,
}: {
  readonly cartao: CartaoDaGrade;
  readonly nome: string;
  readonly bloqueado: boolean;
}) {
  const { linha } = cartao;
  return (
    <div
      className={`dsa4-cartao dsa4-cartao-${cartao.tipo}`}
      data-slot="dsa-cartao"
      data-tipo={cartao.tipo}
      data-parte={cartao.parte}
      data-partes={cartao.partes}
      data-dia-bloqueado={bloqueado ? "sim" : undefined}
      style={{
        gridColumn: `${cartao.coluna + 2} / ${cartao.coluna + 3}`,
        gridRow: `${cartao.faixaInicial + 2} / ${cartao.faixaFinal + 3}`,
      }}
    >
      <div className="dsa4-cartao-barra" />
      <div className="dsa4-cartao-corpo">
        {linha.disciplina === "" ? null : (
          <div className="dsa4-cartao-titulo">
            <span>{linha.disciplina}</span>
            <span className="dsa4-cartao-disciplina">{nome}</span>
          </div>
        )}
        <div className="dsa4-cartao-conteudo">
          {linha.conteudo}
          {cartao.tipo === "estudo" ? " *" : ""}
        </div>
        <div className="dsa4-cartao-pe">
          <span>{linha.instrutor}</span>
          <span className="dsa4-cartao-dados">
            <span>{cartao.ta} TA</span>
            {linha.local === "" ? null : <span>{linha.local}</span>}
            <b className="dsa-te">{linha.te}</b>
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * ⚠️ **SEM RELÓGIO NÃO HÁ LINHAS DE HORÁRIO** (`RN-DEG-01`): o curso sem vigência de regime sai
 * como lista por dia, com os TA numerados — nunca vazio, nunca exceção. A tela já avisou.
 */
function ListaSemRelogio({ dias }: { readonly dias: readonly DiaImpresso[] }) {
  return (
    <section className="dsa4-lista" data-slot="dsa-corpo">
      {dias.map((dia) => (
        <div key={dia.data} className="dsa4-lista-dia">
          <b>{dataComDiaDaSemana(dia.data)}</b>
          {dia.bloqueio === null ? null : (
            <span data-slot="dsa-dia-bloqueado"> — {dia.bloqueio}</span>
          )}
          <ul>
            {dia.linhas.map((l: LinhaImpressa) => (
              <li
                key={l.chave}
                data-slot="dsa-cartao"
                data-tipo={l.estudoIndividual ? "estudo" : "aula"}
              >
                {l.taInicial === null ? "" : `${l.taInicial}º TA · `}
                {l.disciplina} {l.conteudo} · {l.tempos ?? ""} TA · {l.local} ·{" "}
                <b className="dsa-te">{l.te}</b> · {l.instrutor}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/**
 * Uma rubrica — nome completo, posto/graduação **por extenso** com o quadro, e a função.
 *
 * ⚠️ **SEM RESPONSÁVEL VIGENTE, A LINHA SAI EM BRANCO — NUNCA UM ERRO** (`FR-036`, `RN-DEG-01`).
 * ⚠️ **NO MODO `dinamico_usuario_logado` QUEM ASSINA É QUEM IMPRIME, e a FUNÇÃO vem da LINHA**
 * (`Q-14`); o posto sai vazio, porque `usuarios` não tem posto.
 * ⚠️ **O POSTO É `postoPorExtenso`, NUNCA A SIGLA** *(item 7 de 08/10/2026)*: `Primeiro-Tenente
 * (RM2-T)`, como no modelo v4. A coluna de instrutor dos cartões continua com a sigla.
 * ⚠️ **A EDIÇÃO DA TELA VAI POR CIMA, CAMPO A CAMPO** (item 4 de 08/10/2026), pela mesma função que
 * a prévia da tela usa (`rubricaComEdicao`) — e é só do papel: nada volta para o cadastro.
 */
function Rubrica({
  lado,
  assinatura,
  nomeDeQuemImprime,
  edicao,
}: {
  readonly lado: LadoDaAssinatura;
  readonly assinatura: Assinatura | null;
  readonly nomeDeQuemImprime: string | null;
  readonly edicao: EdicaoDasAssinaturas;
}) {
  const rubrica = rubricaComEdicao(rubricaResolvida(assinatura, nomeDeQuemImprime), edicao[lado]);
  if (rubrica === null) {
    return (
      <div className="dsa4-assinatura" data-slot={`dsa-assinatura-${lado}`}>
        <div className="dsa-rubrica" />
      </div>
    );
  }
  return (
    <div className="dsa4-assinatura" data-slot={`dsa-assinatura-${lado}`}>
      <div className="dsa-rubrica" />
      <span className="dsa4-assinatura-nome">{rubrica.nome}</span>
      {rubrica.posto === "" ? null : <span data-slot="dsa-assinatura-posto">{rubrica.posto}</span>}
      <span className="dsa4-assinatura-funcao">{rubrica.funcao}</span>
    </div>
  );
}
