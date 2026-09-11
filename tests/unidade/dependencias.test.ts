/**
 * Nenhuma biblioteca de componentes além da decidida (`FR-019`, BRIEF §1).
 *
 * ⚠️ PROIBIÇÃO SEM PORTÃO É CONSELHO, e este portão já provou o próprio valor: em 09/09/2026 a
 * inicialização padrão do shadcn trouxe **Base UI** em vez de Radix, e a tela ficava idêntica.
 * Sem uma verificação, aquilo teria entrado sem ninguém notar.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/** Bibliotecas de componente conhecidas que NÃO são a decidida. */
const PROIBIDAS = [
  "@base-ui/react",
  "@base_ui/react",
  "@mui/material",
  "@chakra-ui/react",
  "antd",
  "@mantine/core",
  "react-bootstrap",
  "@headlessui/react",
  "primereact",
  "@fluentui/react",
];

function dependencias(): string[] {
  const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
  return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
}

describe("FR-019 · só shadcn sobre Radix", () => {
  it("nenhuma biblioteca de componentes proibida está declarada", () => {
    const presentes = dependencias().filter((d) => PROIBIDAS.includes(d));
    expect(
      presentes,
      `biblioteca de componentes não autorizada (BRIEF §1): ${presentes.join(", ")}. ` +
        `A decisão é shadcn/ui SOBRE RADIX, e ela não se negocia num dia de pressa.`,
    ).toEqual([]);
  });

  it("o primitivo em uso é o Radix — controle positivo", () => {
    // ⚠️ Sem este caso, a suíte passaria num projeto que não tem primitivo NENHUM, e a proibição
    // pareceria cumprida por ausência.
    expect(
      dependencias().some((d) => d === "radix-ui" || d.startsWith("@radix-ui/")),
      "nenhum pacote Radix declarado: os componentes copiados perderam a base decidida",
    ).toBe(true);
  });

  it("o estilo fixado em components.json é o que usa Radix", () => {
    const cfg = JSON.parse(readFileSync(resolve(process.cwd(), "components.json"), "utf8"));
    expect(
      cfg.style,
      "o estilo padrão do shadcn hoje usa Base UI; `new-york` é o que ainda traz Radix",
    ).toBe("new-york");
  });
});

/**
 * ⚠️ CONTROLE POSITIVO DAS DUAS BIBLIOTECAS DA FATIA (b) — presença declarada, para que a remoção
 * acidental reprove (`FR-003`, `FR-003.1`).
 *
 * A diferença em relação aos casos acima importa: lá se afirma a AUSÊNCIA do proibido, aqui a
 * PRESENÇA do decidido. As duas metades são necessárias — um repositório sem gráfico nenhum
 * passaria em toda a metade de cima enquanto o `FR-016` fica por cumprir.
 */
describe("FR-003.1 · as duas dependências decididas continuam declaradas", () => {
  it("a biblioteca de gráficos do BRIEF §1 está presente", () => {
    expect(
      dependencias(),
      "sem a biblioteca de gráficos não há como cumprir o FR-016, e os três componentes de " +
        "components/graficos/ deixam de compilar",
    ).toContain("recharts");
  });

  it("a biblioteca de ícones que o components.json declara está presente", () => {
    // ⚠️ O `components.json` aponta para ela em `iconLibrary` desde a fatia (a), e a decisão de
    // 10/09/2026 (FR-003.1) fechou a pendência §11.2 do documento 23. Configuração apontando para
    // pacote que não existe é a divergência silenciosa de sempre, num vocabulário diferente.
    expect(dependencias(), "iconLibrary aponta para um pacote que não está instalado").toContain(
      "lucide-react",
    );
  });

  it("o pacote de ícones instalado é o que o components.json nomeia", () => {
    const cfg = JSON.parse(readFileSync(resolve(process.cwd(), "components.json"), "utf8"));
    expect(
      cfg.iconLibrary,
      "a configuração e a dependência precisam nomear a MESMA biblioteca de ícones",
    ).toBe("lucide");
  });
});
