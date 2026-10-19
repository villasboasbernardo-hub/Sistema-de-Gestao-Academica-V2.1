# Roteiro de conferência — PR 3 da spec 016 (banco: "até hoje" e a CH prevista)

> Preview do ramo `db/BLOCO-1-execucao-e-ch-prevista` (PR #69):
> <https://sistema-de-gestao-academica-v2-1-git-db-bloco-73f93e-ciaara-11.vercel.app> — pede o login da Vercel antes do
> do sistema. ⚠️ **M1 e M2 já estão no remoto** desde 19/10/2026, 02:48, que serve preview **e** Production: a CH
> prevista corrigida dos instrutores (M2) já aparece também na Production; as telas novas, só no preview.
>
> ⚠️ **Os números abaixo são os medidos no backup de 19/10/2026 02:42, com "hoje" = 19/10**, e eles andam com o
> calendário: a cada dia útil o saldo perde a capacidade de um dia e ganha o que foi lançado naquele dia. Nada aqui
> grava; onde um formulário abrir, feche com *Cancelar*.

## 1 · Início — o andamento até hoje
1. Menu *Início*.
2. **Esperado:** a **C-Ap-FR 2026 aparece "em atraso"** (no cartão, a marca *em atraso*). Os **32** TA lançados para
   depois de hoje (868 sem corte, 836 até hoje) eram o que a punha em dia.
3. **Esperado:** a C-Ap-HN 2026 mostra **967/1257 TA · 77%**, e não 1008/1257 · 80% — o que está lançado para depois de hoje não
   conta.

## 2 · Turmas — as colunas novas
1. Menu *Turmas*.
2. **Esperado:** colunas **Progresso** (toda turma) e **Saldo (TA)** — com número só em turma **ativa** ou
   **planejada**; *"—"* em concluída e cancelada. A C-Ap-FR 2026 com **-16** e a marca *em atraso*; a CAHO 2026
   com **8** (a coluna escreve o número sem o «+»; a ficha escreve «+8 TA»).

## 3 · A ficha da turma — andamento, disciplinas e Avaliações
1. Na lista, clique em *C-Ap-HN 2026*.
2. **Esperado:** *CH executada* **967 TA**. Na tabela de disciplinas, a **XIV (TOPOGRAFIA)** com **38** TA, e não
   56 (o resto está lançado para depois de hoje).
3. Aba *Avaliações*: o "cumprido" de cada disciplina usa o mesmo número da tabela.

## 4 · Instrutor de código 15 — a CH prevista e o "só habilitado"
1. Menu *Instrutores* → *Filtros* → busque o instrutor de código 15 → clique na linha.
2. **Esperado:** *Prevista no ano* **271 TA** (até a M2 eram **114**). Nas atribuições, as que não têm semanas
   cadastradas mostram a média semanal com *(pela janela)*.
3. **Esperado:** em *Disciplinas habilitadas*, **C-Ap-HN IV (METEOROLOGIA)** e **C-Espc-HN HN-1114-0730** com
   *"só habilitado — não gera CH prevista"*; as quatro atribuídas sem a marca. Junto da CH prevista, a frase
   *"Habilitação não gera CH prevista; a CH prevista vem da atribuição na turma (Disciplinas da turma)."*
4. *(Já na Production também)* a CH prevista de 271 TA aparece na ficha dele na Production, porque é a view.

## 5 · O DSA continua acumulado até a semana
1. *Turmas* → *C-Ap-FR 2026* → *Abrir o DSA* → *Ir para a semana do dia* **26/10/2026**.
2. **Esperado:** a *Situação por disciplina* **conta** os lançamentos daquela semana — o "até hoje" não vale no DSA
   (nem na planilha).
