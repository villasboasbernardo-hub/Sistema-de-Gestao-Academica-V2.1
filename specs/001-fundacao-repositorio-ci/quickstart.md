# Quickstart — como provar que o Épico 0 está pronto

**Fase 1** · 2026-08-27 · [plan.md](./plan.md) · [spec.md](./spec.md)

Roteiro de **validação**, não de implementação. Cada bloco corresponde a um critério de sucesso e é
executável por quem não escreveu o código. Os oito, todos verdes, fecham a fatia.

## Pré-requisitos

| Item | Verificar com | Estado em 27/08/2026 |
|---|---|---|
| Node ≥ 22 | `node --version` | ✅ 24.19 |
| pnpm | `pnpm --version` | ✅ 11.24.0 |
| Docker rodando | `docker info` | ✅ 29.7.2 instalado |
| Supabase CLI | `supabase --version` | ✅ 2.116.0 — **não autenticada** |
| Vercel CLI | `vercel --version` | ✅ 59.7.0 |
| `gh` com escopo `workflow` | `gh auth status` | ⚠️ **Falta `workflow`** — ver research R-5 |

Dois passos interativos, do Bernardo, antes de começar:

```bash
gh auth refresh -s workflow      # sem isto, o push do ci.yml é recusado
supabase login                   # sem isto, não dá para conferir os projetos
```

---

## V-1 · Máquina limpa → aplicação no ar (SC-001, FR-001)

**O teste que mais é declarado sem ser feito.** Fazer numa pasta nova, de verdade.

```bash
git clone https://github.com/villasboasbernardo-hub/Sistema-de-Gestao-Academica-V2.1.git teste-limpo
cd teste-limpo
# a partir daqui, seguir SOMENTE o README — nada de memória
```

**Esperado:** aplicação respondendo em `localhost` em **menos de 15 minutos**, sem nenhum passo que o
README não descreva e **zero** perguntas a outra pessoa.

**Falha típica:** o README pressupõe algo que só está na cabeça de quem o escreveu. Se você precisou
consultar outra fonte, **o critério falhou** — corrija o README, não o teste.

---

## V-2 · Variáveis completas, zero segredo (SC-002, FR-002)

```bash
cp .env.local.example .env.local
grep -c "" .env.local.example        # toda variável listada?
```

**Esperado:** toda variável do contrato [`variaveis-ambiente.md`](./contracts/variaveis-ambiente.md)
presente, com comentário, e **nenhum** valor real — só placeholders.

Depois, subir **sem preencher** e conferir o V-3.

---

## V-3 · Degradação segura (FR-003, `RN-DEG-01`)

Com `.env.local` ainda com placeholders:

```bash
pnpm dev
```

**Esperado:** aviso legível dizendo qual variável falta. **Não esperado:** exceção não tratada, tela
branca, ou stack trace no navegador.

---

## V-4 · As duas fronteiras, provadas (SC-004, FR-004/005/006)

```bash
pnpm test:unidade         # os testes de fronteira estão aqui
```

**Esperado:** verde. Depois, o teste que importa — **desligar a regra de propósito**:

1. Comentar o bloco `no-restricted-imports` de `lib/dominio/**` em `eslint.config.mjs`;
2. `pnpm test:unidade`;
3. **Esperado: VERMELHO.** Se continuar verde, o teste não prova nada e o critério falhou;
4. Descomentar e confirmar verde de novo.

Repetir para a fronteira da `service_role` — com a diferença de que a violação dela tem de quebrar o
**build** (`pnpm build`), não o lint.

---

## V-5 · Contrato de dados gerado, nunca digitado (FR-009, FR-010)

```bash
pnpm db:start
pnpm db:reset
pnpm db:tipos
git diff --exit-code lib/tipos/database.ts    # deve sair 0
```

**Esperado:** saída 0. O arquivo é praticamente vazio — o schema é do Épico 1, e **isso é correto**.

Agora provar o portão: editar `lib/tipos/database.ts` à mão, commitar, abrir PR.
**Esperado:** o bloco `banco` reprova.

---

## V-6 · Os dois comandos de verificação (SC-005, SC-008, FR-013)

```bash
time pnpm verificar          # alvo: ≤ 5 minutos, sem Docker
pnpm verificar:tudo          # sem teto de tempo; precisa de Docker
```

**Esperado:** `verificar` dentro dos 5 minutos. `verificar:tudo` com o **mesmo veredito que o CI** —
essa é a promessa dele, e a única que importa.

**Se `verificar:tudo` ficar verde e o CI vermelho**, isso é defeito da verificação, não azar: vira
tarefa de correção.

---

## V-7 · O CI barra o merge (SC-003, FR-014, FR-015)

Provar quebrando de propósito, **uma vez**, com commit descartável:

```bash
git checkout -b teste/quebrar-ci
echo 'const x: number = "a";' > app/_descartavel.ts
git commit -am "test: quebrar o CI de proposito" && git push -u origin teste/quebrar-ci
gh pr create --fill
```

**Esperado:** `qualidade` reprova, e o botão de merge fica **bloqueado** — não apenas com aviso
vermelho. Repetir para lint, teste de unidade e ponta a ponta: **quatro formas de defeito, quatro
bloqueios**.

Se o merge continuar disponível, a proteção da branch não está configurada — ver
[`ci-contextos.md`](./contracts/ci-contextos.md).

```bash
git push origin --delete teste/quebrar-ci   # limpar depois
```

---

## V-8 · Preview por branch, aberta pelo Bernardo (SC-006, FR-016/017/018)

```bash
vercel env ls      # conferir: Preview tem as variáveis; Production NÃO tem Supabase
git push           # a Vercel publica a preview da branch
```

**Esperado:**

1. URL própria da branch, com a aplicação no ar;
2. **Faixa visível** dizendo `preview` — e o rótulo correspondendo ao projeto realmente apontado;
3. **Bernardo abre a URL e confere.** Sem isso, o SC-006 não está cumprido — é critério com nome e
   pessoa, de propósito.

---

## V-9 · Contenção de escopo (SC-007, FR-020)

O critério negativo, e o mais fácil de esquecer:

```bash
ls lib/dominio/                      # esperado: vazio
ls supabase/migrations/              # esperado: vazio
vercel env ls production             # esperado: sem variáveis de Supabase
```

**Esperado:** camada de domínio **vazia**, zero tabelas de negócio, **zero** ambiente de produção da
v2.1. A fundação não antecipou escopo de outro épico.

---

## Ordem de execução recomendada

V-2 → V-3 → V-4 → V-5 → V-6 (tudo local, sem depender do replantio) → **replantio** → V-7 → V-8 → V-1
→ V-9.

**V-1 vai no fim de propósito:** só faz sentido clonar de um repositório que já existe com tudo dentro.
E V-9 fecha, porque é o único que prova o que **não** foi feito.
