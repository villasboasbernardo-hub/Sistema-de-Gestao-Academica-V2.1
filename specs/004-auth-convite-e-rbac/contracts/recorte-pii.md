# Contrato — o recorte do dado pessoal de instrutor

**Fase 1** · 08/09/2026 · fonte: [research.md §R-1](../research.md) — **decidido por experimento**

## As três peças, e a ordem entre elas

```
1.  revoke select on public.instrutores from authenticated
2.  grant  select (<as 33 funcionais>) on public.instrutores to authenticated
3.  create view public.vw_instrutor_dados_pessoais  (direitos do dono)
       where app.pode('instrutores','ler')
         and app.perfil_atual() in ('admin',
                                    'encarregado_administracao_academica',
                                    'ajudante_administracao_academica')
+   create view public.vw_instrutores with (security_invoker = true)
       select <as 33 funcionais>
```

## Invariantes

- **C-1 — A ordem é obrigatória, e o passo 1 é o que protege.** Privilégio de **tabela** cobre toda
  coluna. Escrever só `revoke select (cpf, …)` sem revogar a tabela **não faz efeito nenhum** —
  medido, com o operador lendo o CPF normalmente depois do revoke. Quem inverter ou omitir o passo
  1 publica a PII e vê a tela funcionar.
- **C-2 — Nenhum `drop`.** As 12 colunas ficam onde estão. O recorte é de privilégio, não de
  estrutura (regra 4 do `CLAUDE.md`).
- **C-3 — `area_conhecimento` fica fora do recorte.** Nasceu no mesmo bloco, não é dado pessoal, e
  a grade precisa dela.
- **C-4 — `service_role` mantém acesso.** O revoke é só de `authenticated`. Sem isso o ETL do Épico
  2 deixaria de carregar a PII, e a carga é reprodutível por definição.
- **C-5 — `vw_instrutores` é `security_invoker = true`.** É o que faz a RLS da tabela base
  continuar valendo. Sem essa opção a view rodaria com os direitos do dono e **contornaria a
  policy** — trocaria um problema de coluna por um problema de linha.
- **C-6 — A visão com porteiro NÃO é `security_invoker`.** Ela precisa dos direitos do dono
  justamente para alcançar as colunas revogadas; o porteiro é o `where`.

## O que a verificação tem de provar

| # | Asserção | Perfil | Esperado |
|---|---|---|---|
| P-1 | `select posto_graduacao from instrutores` | os 9 | ✅ lê |
| P-2 | `select cpf from instrutores` | os 9 | 🛑 `permission denied` |
| P-3 | `select * from instrutores` | os 9 | 🛑 negado — `*` expande para as revogadas |
| P-4 | `select * from vw_instrutores` | os 9 | ✅ 33 colunas, sem PII |
| P-5 | `select cpf from vw_instrutor_dados_pessoais` | os **3** | ✅ com valor |
| P-6 | idem | os **6** | ✅ **0 linhas** — não é erro, é vazio |
| P-7 | `select (select cpf from instrutores limit 1)` | um dos 6 | 🛑 negado — subconsulta não contorna |
| P-8 | `where cpf is not null` | um dos 6 | 🛑 negado — usar como filtro também não |
| P-9 | `service_role` lê a PII | — | ✅ o ETL continua de pé |
| P-10 | as 10 views existentes | um dos 6 | ✅ nenhuma quebra, nenhuma vaza |

⚠️ **P-2, P-3, P-7 e P-8 são o contrato.** As demais são controle positivo. Uma suíte só com P-1,
P-4 e P-5 aprova um recorte que não recorta — foi exatamente o que a primeira tentativa do
experimento produziu.

## O erro que alguém vai ver, e o que ele quer dizer

```
permission denied for table instrutores
```

A mensagem fala de **tabela**, não de coluna, e a primeira suspeita de quem depurar será a RLS.
**Não é a RLS.** É `select *` — ou uma coluna de PII citada por nome — numa consulta que deveria
usar `vw_instrutores`. Está escrito no comentário da migration, porque é lá que a pessoa vai olhar.
