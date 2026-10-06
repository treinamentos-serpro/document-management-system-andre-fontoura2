---
name: validar-fluxo-dms
description: "Use when checking an upload, list, download, or other DMS user flow against its requirements and acceptance criteria."
argument-hint: "fluxo e critérios de aceite"
agent: agent
---

# Validar fluxo do DMS

Valide o fluxo `${input:fluxo:descreva a funcionalidade ou operação}` usando os critérios `${input:criterios:informe critérios de aceite adicionais ou escreva 'usar especificação'}`.

Consulte [as instruções do projeto](../copilot-instructions.md) e a [especificação do DMS](../../docs/specs/dms-spec.md). Se os critérios informados divergirem da especificação, destaque a divergência em vez de escolher silenciosamente um comportamento.

## Verificações

1. Siga o fluxo pela interface, serviço frontend, endpoint e camadas backend relevantes; identifique os arquivos que implementam cada etapa.
2. Compare o comportamento observado com cada critério aplicável, incluindo entrada inválida, erros, estados de carregamento/vazio e limites entre usuários quando pertinentes.
3. Confira se os testes existentes cobrem os critérios. Não presuma cobertura com base apenas no nome de um teste.
4. Execute `npm test` em `backend/` se o fluxo envolver backend ou contratos da API. Execute `npm run build` em `frontend/` se envolver frontend. Informe falhas sem alterá-las.

Não edite código, testes ou documentação. Não acesse serviços externos. Lembre-se de que `X-User-Id` particiona documentos, mas não autentica o usuário.

## Resultado

Retorne uma tabela com critério, resultado (`passou`, `falhou` ou `não verificado`) e evidência (com referências aos arquivos ou testes). Em seguida, liste comandos executados e resultados, divergências entre critérios e especificação, e lacunas de cobertura. Não declare o fluxo aprovado se algum critério aplicável falhar ou permanecer sem verificação.