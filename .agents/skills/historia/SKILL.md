---
name: historia
description: Implementa uma história do BACKLOG.md com TDD (Red, aprovação, Green, Refactor, CI, aceite e commit). Use quando o usuário pedir para implementar, fazer ou continuar uma história (US-xxx).
---

# Implementar uma história

A história é a que eu indiquei (US-xxx). Se eu não disse qual, pergunte antes de começar.

Siga as etapas na ordem. As seções 2, 5, 7 e 8 do AGENTS.md valem durante todo o fluxo.

## 1. Entender
- Rode `git status --short`. Se houver mudanças que não são desta história, pare e me pergunte.
- Leia a história no BACKLOG.md: contexto, critérios de aceite, fora do escopo e falha inaceitável citada.
- Se a história não couber num commit, proponha a quebra em histórias menores no BACKLOG.md e pare.
- Se ela depender de algo que ninguém sabe ainda, proponha um spike (seção 11 do AGENTS.md) e pare.
- Mude o status da história para "em andamento".

## 2. Red (portão P2)
- Escreva um teste por critério de aceite, com nome que descreva o comportamento.
- Rode e confirme que cada teste falha pelo motivo certo: comportamento ausente, nunca erro de sintaxe, import ou configuração.
- Pare e me mostre, neste formato:

```
História: [id e título]
Testes: [arquivo: nome do teste → critério de aceite]
Falha: [trecho da saída que mostra o motivo]
Abordagem (até 5 linhas): [arquivos que mudam, peças novas]
Falha inaceitável envolvida: [qual, ou nenhuma]
```

- Espere minha aprovação. Se eu pedir ajuste, refaça esta etapa.

## 3. Green
- Escreva o mínimo para os testes passarem, seguindo a abordagem aprovada.
- Não altere os testes aprovados. Se um deles estiver errado, pare e explique por quê.
- Se a solução exigir mudar a arquitetura, criar entidade ou relação nova, escrever migração que apague ou transforme dado existente, adicionar dependência ou tocar numa falha inaceitável, pare e me chame.
- Mudança no esquema entra como migração nova, com teste em banco vazio e em banco com dados.

## 4. Refactor
- Remova duplicação e melhore nomes, rodando os testes a cada mudança.
- Siga a seção 5 do AGENTS.md e não mexa em código fora da história.

## 5. Verificar (portão P3)
- Rode o CI completo (seção 4 do AGENTS.md) e o checklist da seção 9.
- Falhou por causa da história: corrija e rode de novo.
- Falhou por algo fora da história: não corrija. Registre como história nova em Achados, no BACKLOG.md, e me chame.

## 6. Aceite
- Mostre em até 5 linhas o que mudou, os testes criados e os achados registrados.
- Diga como rodar o resultado e o que eu devo verificar, no ambiente em que o produto roda, para aceitar a história.
- Espere meu aceite. Se eu recusar, registre o motivo na história: ajuste que cabe nos critérios atuais volta ao Green; necessidade nova vira história nova no BACKLOG.md.

## 7. Commit
- Mude o status da história para "aceita".
- Registre obstáculo novo na seção 10 e descoberta sobre o domínio na seção 11 do AGENTS.md.
- Se o esquema mudou, regenere o diagrama ER em docs/modelo-de-dados.md a partir dele e atualize o modelo de dados na seção 3 do AGENTS.md.
- Faça um único commit com tudo isso. Assunto: `US-xxx: [o que mudou]`. Corpo: o porquê.
