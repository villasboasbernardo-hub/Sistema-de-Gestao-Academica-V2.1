# Contrato — o convite

**Fase 1** · 08/09/2026 · fonte: documento 22 §3.3 · [research.md §R-3](../research.md)

## A sequência, e por que ela é nessa ordem

```
Admin preenche nome, e-mail, perfil, escopo
   │
   ├─ Zod na primeira linha  ·  confere app.eh_admin()
   │
   ├─ 1. INSERT em public.usuarios         auth_user_id = NULL
   │     └── commitado. A linha existe, tem perfil, e NÃO ALCANÇA NADA
   │
   ├─ 2. convite pela plataforma de autenticação (service_role)
   │     └── falhou? o estado resultante é LEGÍTIMO. Reportar, não compensar
   │
   ├─ 3. a pessoa abre o link, define a senha
   │
   └─ 4. UPDATE usuarios SET auth_user_id = <id>   ← espelho fechado
```

## Invariantes

- **C-1 — A janela entre 1 e 3 é deliberada.** Nela o Admin ainda revisa ou corrige o perfil, e a
  conta não alcança nada porque `app.usuario_atual()` não resolve sem `auth_user_id`. **Uma conta
  nunca existe com poder indefinido.**
- **C-2 — Não há compensação, e não é descuido.** Se o passo 2 falhar depois do 1, o estado é
  *"linha sem credencial"* — o mesmo estado do C-1, que é legal. O caminho de saída é reenviar
  (FR-011). Compensar seria apagar linha, contra a regra 4.
- **C-3 — A ordem inversa é proibida.** Convidar antes de inserir produz **credencial sem linha**:
  o único dos dois estados que não alcança nada **e** não aparece na tela de usuários. Invisível é
  pior que incompleto.
- **C-4 — `service_role` só no passo 2.** É o primeiro consumidor real de `lib/supabase/admin.ts`.
  Nunca por requisição de tela: se uma página precisou dele, a policy está errada.
- **C-5 — Nesta fatia, só endereço de teste** (FR-031.1). O disparo aos três endereços reais da
  v2.0 é do corte, quando existir projeto de produção.

## Os dois sentidos da inconsistência (FR-013)

| Sentido | Como nasce | Visível? | Gravidade |
|---|---|---|---|
| Linha sem credencial | Convite não aceito, ou falha no passo 2 | **Sim**, na lista | Baixa — é estado legal |
| Credencial sem linha | Conta criada pelo painel; passo 1 desfeito | **Não** | Média — alcança nada, mas é lixo e superfície |

A rotina de detecção percorre os dois sentidos e é **executável sem inspeção manual do banco**. A
linha sem credencial só é relatada quando passa da validade do convite — antes disso, é o C-1.

## O que a verificação tem de provar

| # | Cenário | Esperado |
|---|---|---|
| V-1 | E-mail nunca convidado tenta criar conta, inclusive por chamada direta | 🛑 recusado |
| V-2 | Linha existe sem credencial; a pessoa tenta entrar | 🛑 negado |
| V-3 | Convite → senha → primeiro acesso | ✅ ponta a ponta, com o escopo atribuído |
| V-4 | Link já usado | 🛑 recusado, **sem revelar se a conta existe** |
| V-5 | Convite para e-mail com conta ativa | 🛑 recusado, sem duplicata |
| V-6 | Reenvio | ✅ novo link vale, anterior não |
| V-7 | `codigo` e `origem_migracao_v1` depois da credencial | ✅ intactos |
