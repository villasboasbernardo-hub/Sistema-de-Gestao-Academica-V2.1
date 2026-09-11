/**
 * Vitrine do vocabulário visual (`FR-020` a `FR-022`, `SC-009`).
 *
 * ⚠️ ELA NÃO É ENFEITE: É O ÚNICO LUGAR ONDE ESTA FATIA PODE SER CONFERIDA. Sem cabeçalho e sem
 * navegação, que só nascem na fatia (c), não haveria onde trocar de tema nem onde ver um token
 * aplicado — e as histórias 1, 2 e 3 sairiam da fatia sem que ninguém, nem pessoa nem teste,
 * pudesse exercitá-las.
 *
 * ⚠️ A RAZÃO DE CONTRASTE EXIBIDA É A MESMA QUE O TESTE AFERE (`FR-021`). As duas vêm de
 * `lib/design/vocabulario.ts`. Dois cálculos separados divergiriam em silêncio, e a tela passaria
 * a exibir um contraste que ninguém verifica.
 *
 * Server Component: lê o ponto único no servidor. Só o alternador é folha de cliente.
 */
import {
  AmostraAlertaEteto,
  AmostraCampo,
  AmostraDialogoConfirmacao,
  AmostraEmblemasDeStatus,
  AmostraEstadoNaUrl,
  AmostraEsqueleto,
  AmostraEstadoVazio,
  AmostraFiltroAvancado,
  AmostraFiltroNaUrl,
  AmostraIndicadores,
  AmostraNomeInstrutor,
  AmostraSeletorInstrutor,
  AmostraSeletorTurma,
  AmostraGraficos,
  AmostraTabelaDensa,
  AmostraTabelaNaUrl,
  AmostraTabelaVazia,
} from "@/app/estilo/amostras";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { claro, escuro } from "@/lib/design/ler-globals";
import {
  ISENTOS,
  PAPEIS_BASE,
  PARES,
  PENDENTES,
  SERIES,
  STATUS,
  razao,
} from "@/lib/design/vocabulario";

export const metadata = { title: "Vocabulário visual — CIAARA-11" };

const ESCALA = ["2xs", "xs", "sm", "base", "lg", "xl", "2xl"] as const;

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="border-borda border-b pb-1 text-lg font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

/**
 * Mede um par, e **estoura** se o token não existir.
 *
 * ⚠️ NÃO HÁ VALOR DE RESERVA, e isso foi decidido pela própria regra de lint: a primeira versão
 * usava `?? "#000"`, e a regra a barrou — cor escrita à mão é cor escrita à mão, inclusive num
 * fallback. E ela estava certa por outro motivo: reserva silenciosa exibiria um contraste
 * inventado ao lado de um token que não existe. Que o token exista é garantido pela invariante
 * I-1b; se algum dia não for, esta tela deve quebrar, não mentir.
 */
/** Os dois valores de um token, lidos do ponto único. Estoura se faltar — ver `medir`. */
function valores(
  claroM: Map<string, string>,
  escuroM: Map<string, string>,
  token: string,
): { claro: string; escuro: string } {
  const c = claroM.get(token);
  const e = escuroM.get(token);
  if (!c || !e) throw new Error(`token ausente no ponto único: --${token}`);
  return { claro: c, escuro: e };
}

function medir(tema: Map<string, string>, frente: string, fundo: string): number {
  const a = tema.get(frente);
  const b = tema.get(fundo);
  if (!a || !b) throw new Error(`token ausente no ponto único: --${frente} ou --${fundo}`);
  return razao(a, b);
}

/**
 * Uma amostra de cor, com o nome do token e **o valor de cada tema**.
 *
 * ⚠️ O VALOR EXIBIDO NÃO PRECISA DE EXCEÇÃO DE LINT, e a razão importa: ele é **lido de
 * `app/globals.css` em tempo de execução**, não escrito aqui. A regra barra cor *escrita à mão no
 * código-fonte*; uma cadeia que vem do ponto único é o oposto disso — é o ponto único falando.
 *
 * ⚠️ E DESLIGAR A REGRA AQUI SERIA PIOR QUE INÚTIL: um `eslint-disable` nesta tela passaria a
 * esconder cor de verdade escrita à mão no dia em que alguém acrescentasse uma, que é exatamente
 * o arquivo onde isso é mais tentador.
 */
function Amostra({ token, claro: vClaro, escuro: vEscuro }: Amostrada) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="border-borda-forte rounded-ciaara-sm h-10 border"
        style={{ backgroundColor: `var(--${token})` }}
      />
      <code className="text-2xs">--{token}</code>
      <code className="text-texto-suave text-2xs tabular-nums">
        {vClaro} · {vEscuro}
      </code>
    </div>
  );
}

type Amostrada = { token: string; claro: string; escuro: string };

export default function Vitrine() {
  const temaClaro = claro();
  const temaEscuro = escuro();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vocabulário visual</h1>
          <p className="text-texto-suave text-sm">
            Ponto único do CIAARA-11. Toda cor desta tela vem de <code>app/globals.css</code>.
          </p>
        </div>
        {/*
          ⚠️ O ALTERNADOR DE TEMA SAIU DAQUI EM 11/09/2026 (`FR-018` da fatia c). Ele era provisório:
          existia porque, sem cabeçalho e sem navegação, não haveria onde clicar para exercitar o
          tema. O definitivo mora no cabeçalho da casca, e manter os dois seria a duplicação que o
          `CHK019` previu — **substituição, não acréscimo**.
        */}
      </header>

      <Secao titulo="Papéis — superfície, texto e marca">
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {PAPEIS_BASE.map((t) => (
            <Amostra key={t} token={t} {...valores(temaClaro, temaEscuro, t)} />
          ))}
        </div>
      </Secao>

      <Secao titulo="Status — o nome é o do domínio, nunca o da cor">
        <div className="flex flex-col gap-2">
          {STATUS.map((s) => (
            <div key={s} className="flex flex-wrap items-center gap-3">
              <span
                className="rounded-ciaara-sm border px-2 py-1 text-sm font-medium"
                style={{
                  backgroundColor: `var(--${s}-fundo)`,
                  color: `var(--${s}-tinta)`,
                  borderColor: `var(--${s}-borda)`,
                }}
              >
                {/* ⚠️ O RÓTULO TEXTUAL É REQUISITO (`FR-014`): nenhum significado é comunicado só
                    por cor. Quem não distingue as cores continua lendo o sistema. */}
                {s}
              </span>
              <code className="text-texto-suave text-2xs">
                --{s}-fundo · --{s}-tinta · --{s}-borda
              </code>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Contraste medido — os mesmos números que a auditoria afere">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-superficie-2 text-left">
              <th className="px-2 py-1">Par</th>
              <th className="px-2 py-1">Para que serve</th>
              <th className="px-2 py-1">Limite</th>
              <th className="px-2 py-1">Claro</th>
              <th className="px-2 py-1">Noturno</th>
            </tr>
          </thead>
          <tbody>
            {PARES.map((p) => {
              const c = medir(temaClaro, p.frente, p.fundo);
              const e = medir(temaEscuro, p.frente, p.fundo);
              return (
                <tr key={p.id} className="border-borda border-b">
                  <td className="px-2 py-1">
                    <code className="text-2xs">{p.id}</code> {p.frente} / {p.fundo}
                  </td>
                  <td className="text-texto-suave px-2 py-1">{p.proposito}</td>
                  <td className="px-2 py-1 tabular-nums">{p.limite}:1</td>
                  <td className="px-2 py-1 tabular-nums">{c.toFixed(2)}</td>
                  <td className="px-2 py-1 tabular-nums">{e.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Secao>

      <Secao titulo="Isentos do limite de 3:1 — com o motivo, que é o que separa isenção de afrouxamento">
        <ul className="flex flex-col gap-1 text-sm">
          {ISENTOS.map((i) => (
            <li key={i.id}>
              <code className="text-2xs">{i.id}</code> <strong>{i.par}</strong>
              <span className="text-texto-suave"> — {i.motivo}</span>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao titulo="Pendente — nem auditado nem isento, e é de propósito">
        <ul className="flex flex-col gap-1 text-sm">
          {PENDENTES.map((p) => (
            <li key={p.id}>
              <code className="text-2xs">{p.id}</code> <strong>{p.par}</strong> — mede {p.medido}.
              <span className="text-texto-suave"> Resolve em: {p.resolve}.</span>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao titulo="Escala tipográfica — começa em 14px, e é medida">
        <div className="flex flex-col gap-1">
          {ESCALA.map((t) => (
            <p key={t} style={{ fontSize: `var(--text-${t})` }}>
              <code className="text-texto-suave text-2xs">text-{t}</code> · Instrutor CT-EF Silva,
              turma C-Ap-HN 2026
            </p>
          ))}
        </div>
      </Secao>

      <Secao titulo="Séries de gráfico — ordem fixa, luminâncias distintas para sobreviver ao P&B">
        <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
          {SERIES.map((t) => (
            <Amostra key={t} token={t} {...valores(temaClaro, temaEscuro, t)} />
          ))}
        </div>
      </Secao>

      <Secao titulo="Componentes base — pintados pelos tokens CIAARA, não pelas cores deles">
        {/* ⚠️ É AQUI QUE A RECONCILIAÇÃO SE VÊ. Estes componentes vieram de terceiro com o próprio
            vocabulário de papéis; o que os pinta é o de-para de `globals.css`. Se algum aparecer
            com cor que não é do CIAARA, o casamento não está valendo — e nada mais acusaria. */}
        <div className="flex flex-wrap items-start gap-4">
          <Button>Ação principal</Button>
          <Button variant="secondary">Secundária</Button>
          <Button variant="destructive">Destrutiva</Button>
          <Button variant="outline">Contorno</Button>
          <Badge>Emblema</Badge>
          <Badge variant="secondary">Secundário</Badge>
        </div>
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Cartão</CardTitle>
          </CardHeader>
          <CardContent className="text-texto-suave text-sm">
            Superfície, texto e limite vindos do vocabulário do CIAARA.
          </CardContent>
        </Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Instrutor</TableHead>
              <TableHead>Turma</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>CT-EF Silva</TableCell>
              <TableCell>C-Ap-HN 2026</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Secao>

      <Secao titulo="Raio e sombra">
        <div className="flex flex-wrap gap-4">
          {(["sm", "", "lg"] as const).map((r) => (
            <div
              key={r || "padrao"}
              className="bg-superficie border-borda flex h-16 w-24 items-center justify-center border"
              style={{ borderRadius: `var(--radius-ciaara${r ? `-${r}` : ""})` }}
            >
              <code className="text-2xs">{r || "padrão"}</code>
            </div>
          ))}
          {([1, 2, 3] as const).map((n) => (
            <div
              key={n}
              className="bg-superficie rounded-ciaara flex h-16 w-24 items-center justify-center"
              style={{ boxShadow: `var(--shadow-ciaara-${n})` }}
            >
              <code className="text-2xs">sombra {n}</code>
            </div>
          ))}
        </div>
      </Secao>

      {/* ═══ COMPONENTES CIAARA — a fatia (b) (`FR-027`, `SC-001`) ═════════════════════════════
          ⚠️ CADA COMPONENTE PRECISA DE AMOSTRA, e isso é contado: `tests/e2e/vitrine.spec.ts`
          varre `components/ciaara/` e `components/graficos/` e reprova se algum ficar de fora.
          É a invariante I-5 da fatia (a) estendida de token para componente. */}

      <Secao titulo="Indicador — número grande, e ele não calcula nada">
        <AmostraIndicadores />
      </Secao>

      <Secao titulo="Emblema de status — os nove tons, cada um com rótulo textual obrigatório">
        <AmostraEmblemasDeStatus />
      </Secao>

      <Secao titulo="Campo obrigatório — o traço é `--texto-tenue`, e a obrigatoriedade vai no atributo">
        <AmostraCampo />
      </Secao>

      <Secao titulo="Esqueleto de tabela — silhueta no formato do conteúdo, sem pulsação para quem pediu menos movimento">
        <AmostraEsqueleto />
      </Secao>

      <Secao titulo="Estado vazio — distingue “não há” de “você não vê”">
        <AmostraEstadoVazio />
      </Secao>

      <Secao titulo="Diálogo de confirmação — a consequência, que neste sistema nunca é perda">
        <AmostraDialogoConfirmacao />
      </Secao>

      <Secao titulo="Estado na URL — pelo contrato, e a política de histórico já não se escreve aqui">
        <AmostraEstadoNaUrl />
      </Secao>

      <Secao titulo="Filtro avançado — genérico, e ele não conhece domínio nenhum">
        <AmostraFiltroAvancado />
      </Secao>

      <Secao titulo="Filtro avançado na URL — o MESMO componente, sem uma linha de mudança">
        <AmostraFiltroNaUrl />
      </Secao>

      <Secao titulo="Nome de instrutor — P/G, especialidade e o nome COMPLETO, com o nome de guerra em negrito">
        <AmostraNomeInstrutor />
      </Secao>

      <Secao titulo="Seletor de instrutor — a lista chega desordenada e aparece por antiguidade">
        <AmostraSeletorInstrutor />
      </Secao>

      <Secao titulo="Seletor de turma — escolha simples, sem busca">
        <AmostraSeletorTurma />
      </Secao>

      <Secao titulo="Tabela densa — todas as linhas, três densidades, e o teclado do documento 23 §8.3">
        <AmostraTabelaDensa />
      </Secao>

      <Secao titulo="Tabela sem linhas — o contêiner continua alcançável, e o vazio diz qual vazio é">
        <AmostraTabelaVazia />
      </Secao>

      <Secao titulo="Tabela densa na URL — a MESMA tabela, com o recorte vindo do endereço">
        <AmostraTabelaNaUrl />
      </Secao>

      <Secao titulo="Gráficos — forma e rótulo, porque a cor sozinha não distingue série nenhuma">
        <AmostraGraficos />
      </Secao>

      <Secao titulo="Alerta de conformidade e emblema de teto — avisam, e não impedem">
        <AmostraAlertaEteto />
      </Secao>
    </main>
  );
}
