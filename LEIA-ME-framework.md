# Como este projeto funciona com vários agentes

O processo vive em arquivos que qualquer agente lê; cada ferramenta só precisa saber onde eles estão.

| Arquivo | Para quê |
| --- | --- |
| `AGENTS.md` | Guia único do projeto. Codex lê direto; Gemini CLI lê pelo `.gemini/settings.json`; Claude Code lê pelo `CLAUDE.md` |
| `CLAUDE.md` | Importa o `AGENTS.md` e guarda o que só vale no Claude Code |
| `.gemini/settings.json` | Faz o Gemini CLI carregar o `AGENTS.md` |
| `BACKLOG.md` | Épicos, histórias e status (a fazer, em andamento, aceita) |
| `.agents/skills/historia/SKILL.md` | O passo a passo de cada história, no padrão aberto Agent Skills |
| `.claude/skills/historia` | Link simbólico para a pasta acima |
| `docs/especificacao.md` | A especificação de requisitos (coloque aqui) |
| `docs/arquitetura.md` | O seu documento de arquitetura (coloque aqui) |
| `docs/modelo-de-dados.md` | Diagrama ER, gerado e regenerado pelo agente a partir do esquema |

## Antes da primeira história

1. Coloque a especificação e a arquitetura em `docs/` com esses nomes. Se forem PDF, use `.pdf` e corrija os caminhos na linha 7 do `AGENTS.md`.
2. Preencha a linha "Objetivo do MVP" na seção 1 do `AGENTS.md`.
3. Confira o link da skill (se ele não veio do zip, recrie):

```bash
ln -s ../../.agents/skills/historia .claude/skills/historia
```

4. Na primeira sessão do Claude Code, aprove a importação do `AGENTS.md` quando ele pedir.

## Como chamar a skill em cada ferramenta

- Claude Code: `/historia US-012`
- Codex: `$historia US-012`, ou escreva "implemente a US-012"
- Gemini CLI: escreva "implemente a US-012"; `/skills list` mostra se a skill foi encontrada

A sintaxe de chamada muda com frequência nas três ferramentas; confira a documentação de cada uma se algo não funcionar.

## Quem faz o quê

O Claude Code é o agente principal. Codex e Gemini CLI entram quando a cota do Claude acabar (a próxima sessão continua do status no `BACKLOG.md`) e na auditoria de fim de épico, em que um agente de outro fornecedor revisa o que o primeiro fez.
