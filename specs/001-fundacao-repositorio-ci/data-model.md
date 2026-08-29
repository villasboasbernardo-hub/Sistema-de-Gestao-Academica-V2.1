# Data Model — Épico 0: Fundação

**Fase 1 do plano** · 2026-08-27 · [plan.md](./plan.md)

## Esta fatia não tem entidade de domínio — e isso é requisito, não lacuna

Nenhuma tabela é criada. `lib/dominio/` nasce **vazia** (FR-004), `supabase/migrations/` nasce
**vazia**, e o SC-007 exige, como critério de aceite, que a contagem de tabelas de negócio seja
**zero** ao fim do épico. O modelo de dados do CIAARA-11 é o **Épico 1**, e antecipá-lo aqui violaria
o Princípio IX.

O que esta fatia **modela** é outra coisa: a matriz de ambientes e o contrato de configuração que os
liga. É isso que está abaixo — porque é o que, se ficar ambíguo, produz o defeito que o FR-017 existe
para evitar: alguém registrando aula de verdade no lugar errado.

---

## 1. Ambientes

Três rótulos previstos; **dois existem** nesta fatia.

| Rótulo | Existe agora? | Onde roda | Banco | Quem vê |
|---|---|---|---|---|
| `local` | ✅ Sim | Máquina de quem desenvolve | Supabase local (Docker) **ou** `cqhpfuaweoyglhtrckcp` | Quem desenvolve |
| `preview` | ✅ Sim (FR-016) | Vercel, uma URL por branch | `cqhpfuaweoyglhtrckcp` (desenvolvimento) | Bernardo, ao validar um PR |
| `producao` | ❌ **Não** (FR-016.1) | — | — (projeto ainda não criado, FR-022.1) | — |

**Invariantes:**

- **A-1**: `NEXT_PUBLIC_AMBIENTE` MUST corresponder ao projeto Supabase realmente apontado (FR-022.2).
  Rótulo mentiroso é pior que rótulo ausente.
- **A-2**: nenhum ambiente MUST alcançar a base viva `Banco de dados CIAARA-11 v2.0` (FR-022).
- **A-3**: enquanto `producao` não existir, o escopo *Production* da Vercel MUST ficar **sem**
  variáveis de Supabase — a ausência é a garantia.
- **A-4**: a produção do CIAARA-11 é a **v2.0**, até o corte. Nenhum artefato desta fatia pode sugerir
  o contrário.

**Transição de estado prevista** (fora desta fatia): `producao` nasce quando o projeto Supabase de
produção for criado, **antes da carga real do Épico 2** — nunca antes. Criá-lo mais cedo é criar algo
a proteger sem ter o que proteger.

---

## 2. Projetos Supabase

| Projeto | Papel | Schema nesta fatia | Criado por |
|---|---|---|---|
| `cqhpfuaweoyglhtrckcp` | **Desenvolvimento / preview** (FR-022.1) | **Vazio** — o schema é o Épico 1 | Já existe (25/08/2026) |
| *(sem nome ainda)* | Produção | — | **Não criar nesta fatia** |
| Local (Docker) | Desenvolvimento e CI | Vazio, reconstruído por `db:reset` | `supabase init` (FR-008) |

**Invariante D-1**: o banco local MUST ser **descartável** — reconstruível do zero por um comando, sem
passo manual (FR-008). É o que torna `db:reset` seguro de usar sem pensar.

---

## 3. Contrato de dados gerado

`lib/tipos/database.ts` é a única "estrutura de dados" que esta fatia produz — e é **gerada**, nunca
escrita (FR-009).

| Propriedade | Valor nesta fatia |
|---|---|
| Origem | `supabase gen types typescript --local` |
| Conteúdo | Praticamente vazio (schema sem tabelas de negócio) |
| Quem pode editar | **Ninguém.** Edição manual é defeito, e o CI reprova (FR-010) |
| Quando regenerar | Depois de **toda** migration, sem exceção (risco R-04) |
| Como o CI verifica | `db:reset` → `db:tipos` → `git diff --exit-code` (research R-3) |

**Por que importa agora, com o arquivo vazio:** ele substitui a aba `_Meta_Colunas` da v2.0. O portão
nasce funcionando **antes** de existir o que ele protege, para que o Épico 1 não precise construí-lo
junto com a primeira migration — que é quando ninguém tem paciência para construir portão.

---

## 4. O que o `lib/dominio/` vazio significa

Não é diretório placeholder. É **a fronteira instalada antes da carga**:

- Nasce vazio (FR-004);
- Já com a regra que proíbe importar `supabase`, `next`, `react`, `react-dom` (Princípio II, risco R-10);
- Já com o **teste que prova a regra ativa** (FR-006) — porque regra não verificada é regra que alguém
  desliga sem que ninguém perceba.

Quando as ~40 regras `RN-` chegarem, a fronteira já estará lá. Instalá-la depois de a pasta ter
conteúdo é ordem de grandeza mais cara: cada import indevido já escrito vira uma negociação.
