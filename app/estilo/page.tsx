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
import { SeletorDeTema } from "@/components/ciaara/seletor-tema";
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
function medir(tema: Map<string, string>, frente: string, fundo: string): number {
  const a = tema.get(frente);
  const b = tema.get(fundo);
  if (!a || !b) throw new Error(`token ausente no ponto único: --${frente} ou --${fundo}`);
  return razao(a, b);
}

/** Uma amostra de cor, com o nome do token embaixo. */
function Amostra({ token }: { token: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="border-borda-forte rounded-ciaara-sm h-10 border"
        style={{ backgroundColor: `var(--${token})` }}
      />
      <code className="text-texto-suave text-2xs">--{token}</code>
    </div>
  );
}

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
        <SeletorDeTema />
      </header>

      <Secao titulo="Papéis — superfície, texto e marca">
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {PAPEIS_BASE.map((t) => (
            <Amostra key={t} token={t} />
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
            <Amostra key={t} token={t} />
          ))}
        </div>
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
    </main>
  );
}
