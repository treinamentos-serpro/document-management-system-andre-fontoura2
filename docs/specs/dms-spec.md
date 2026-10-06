# Especificação - Document Management System

## 1. Objetivo

Disponibilizar uma aplicação web simples para que usuários identifiquem, enviem, listem e baixem seus documentos, armazenando os arquivos exclusivamente no filesystem local da aplicação.

## 2. Escopo

### Dentro do escopo

- Envio de um arquivo por requisição.
- Listagem dos metadados dos documentos associados ao usuário informado na requisição.
- Download de um documento pelo identificador, limitado ao usuário informado.
- Armazenamento dos arquivos em `backend/storage`, usando Multer com `diskStorage`.
- Armazenamento dos metadados em memória durante a execução do processo.
- Interface web para envio, listagem e download, integrada à API via `/api` no proxy de desenvolvimento do Vite.
- Endpoint operacional `GET /health` já presente no seed.

### Fora do escopo

- Armazenamento em nuvem, provedores externos ou serviços terceirizados.
- Banco de dados ou persistência durável dos metadados.
- Autenticação, cadastro de usuários, permissões administrativas ou recuperação de conta.
- Versionamento, edição, exclusão ou compartilhamento de documentos.
- Busca avançada, pastas, tags e processamento do conteúdo dos arquivos.
- Garantia de acesso aos metadados após reinício do processo.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | O sistema deve aceitar o envio de um arquivo por requisição multipart. | Uma requisição válida cria um identificador único, grava o arquivo localmente e retorna os metadados com HTTP 201. |
| RF-02 | O sistema deve exigir a identificação do usuário em operações sobre documentos. | Requisições sem `X-User-Id` válido são rejeitadas com HTTP 400 e não leem nem alteram documentos. |
| RF-03 | O sistema deve listar os metadados dos documentos do usuário informado. | `GET /documents` retorna uma lista JSON, inclusive vazia, sem incluir documentos de outro `X-User-Id`. |
| RF-04 | O sistema deve permitir baixar um documento pelo identificador. | Um documento existente e pertencente ao usuário é retornado como anexo binário, com nome de download derivado do nome original. |
| RF-05 | O sistema deve impedir acesso a documentos de outro usuário. | Download de identificador pertencente a outro usuário retorna HTTP 404, sem revelar sua existência ou metadados. |
| RF-06 | O sistema deve validar a presença do arquivo no upload e tratar arquivos acima do limite configurado. | Ausência do arquivo retorna HTTP 400; limite excedido retorna HTTP 413; nenhum metadado é registrado para upload rejeitado. |
| RF-07 | O sistema deve tratar falhas de armazenamento sem deixar arquivo parcial como documento válido. | Falha ao concluir gravação ou registro de metadados retorna erro HTTP apropriado e remove o arquivo parcial quando possível. |
| RF-08 | A interface deve apresentar os documentos do usuário e permitir iniciar upload e download. | A interface consome a API; apresenta estado vazio, carregamento e erro, e atualiza a listagem após upload concluído. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados somente no filesystem local em `backend/storage`, por meio de Multer configurado com `diskStorage`. Não usar armazenamento remoto. |
| RNF-02 | Os metadados devem permanecer em memória nesta versão; reiniciar o processo elimina o catálogo em memória. |
| RNF-03 | Configurações operacionais devem vir de variáveis de ambiente, incluindo `PORT`, `STORAGE_DIR` e `MAX_FILE_SIZE_BYTES`. O padrão de `PORT` é 3000 e o de `STORAGE_DIR` é `backend/storage`. |
| RNF-04 | `MAX_FILE_SIZE_BYTES` deve ser positivo e ter um padrão de 10 MiB quando não definido. A API deve aplicar esse limite no recebimento do arquivo. |
| RNF-05 | O nome físico do arquivo deve ser gerado pela aplicação, sem usar o nome original como caminho. Isso evita colisões e traversal de diretório. |
| RNF-06 | O caminho de armazenamento não deve ser incluído em respostas públicas. O download deve ser enviado como anexo, sem executar ou renderizar o conteúdo no navegador. |
| RNF-07 | O backend deve usar Node.js, Express e CommonJS, manter dependências existentes sempre que possível e separar responsabilidades nas camadas descritas na seção 7. |
| RNF-08 | A aplicação deve responder erros de forma consistente e não expor stack traces, caminhos locais ou detalhes internos ao cliente. |
| RNF-09 | O frontend deve usar React com componentes funcionais e Hooks, e acessar a API via `fetch` usando o prefixo `/api`. |
| RNF-10 | Testes de backend devem usar o runner nativo `node:test`. Requisitos e contratos devem ser verificáveis por testes sem depender de serviços externos. |

## 5. Modelo de dados

### 5.1 Metadados

| Campo | Tipo | Obrigatório | Exposição | Descrição |
| --- | --- | --- | --- | --- |
| `id` | string (UUID) | Sim | Público | Identificador único gerado pela aplicação. |
| `originalName` | string | Sim | Público | Nome original fornecido pelo cliente; usado apenas como metadado e nome sugerido no download. |
| `size` | number inteiro | Sim | Público | Tamanho do arquivo em bytes. |
| `uploadedAt` | string (ISO 8601 UTC) | Sim | Público | Data e hora em que o upload foi concluído. |
| `owner` | string | Sim | Público | Identificador recebido em `X-User-Id`, usado para particionar o catálogo. |
| `storageName` | string | Sim | Não | Nome interno gerado para o arquivo salvo em `STORAGE_DIR`; nunca enviado ao cliente. |

O catálogo em memória associa `id` aos metadados. `storageName` identifica o arquivo dentro do diretório configurado e não deve conter caminhos fornecidos pelo cliente. A resposta pública contém `id`, `originalName`, `size`, `uploadedAt` e `owner`.

### 5.2 Identidade do usuário

Nesta versão não há autenticação. `X-User-Id` é um identificador declarativo fornecido pelo cliente e serve somente para particionar operações. Não é uma credencial confiável nem fornece segurança contra falsificação de identidade. A introdução de autenticação deve substituir essa premissa em uma evolução futura; não faz parte deste escopo.

### 5.3 Ciclo de vida e consistência

- Um upload só entra no catálogo depois de o arquivo ser gravado com sucesso.
- Se o registro do metadado falhar após a gravação, a aplicação deve tentar remover o arquivo recém-gravado.
- Ao reiniciar o processo, o catálogo em memória é perdido. Arquivos já gravados podem permanecer no diretório sem metadados associados; recuperação e limpeza automática desses arquivos não fazem parte desta versão.
- Se um metadado apontar para arquivo ausente, o download responde como documento não encontrado e não expõe o caminho local.

## 6. Contratos de API

As rotas abaixo são expostas diretamente pelo backend. Durante o desenvolvimento, o Vite encaminha chamadas do frontend sob `/api` para o backend e remove esse prefixo. Por exemplo, o frontend chama `/api/documents`, que chega ao backend como `/documents`.

### 6.1 Formato comum de erro

Erros de API retornam JSON no formato:

```json
{
  "error": {
    "code": "FILE_REQUIRED",
    "message": "Envie um arquivo para continuar."
  }
}
```

As mensagens são destinadas ao usuário e podem ser em português. O código é estável para tratamento programático. O corpo de erros de download também é JSON; respostas bem-sucedidas de download são binárias.

### 6.2 `POST /upload`

- Cabeçalho obrigatório: `X-User-Id: <identificador>`.
- Entrada: `multipart/form-data`, com exatamente um arquivo no campo `file`.
- Limite: `MAX_FILE_SIZE_BYTES`; por padrão, 10 MiB.
- Nome original e tipo MIME enviados pelo cliente não são confiáveis. O tipo MIME não é usado para decidir o caminho de gravação.
- O backend grava com nome interno gerado em `STORAGE_DIR`; não usa `originalName` como nome físico.
- Sucesso: HTTP 201, `Content-Type: application/json`.

Resposta de sucesso:

```json
{
  "id": "2f3b5c37-2f32-4c20-bd8a-30e0eaf43841",
  "originalName": "relatorio.pdf",
  "size": 1024,
  "uploadedAt": "2026-10-06T12:00:00.000Z",
  "owner": "usuario-123"
}
```

Erros previstos:

| HTTP | Código | Situação |
| --- | --- | --- |
| 400 | `USER_ID_REQUIRED` | Cabeçalho `X-User-Id` ausente ou vazio. |
| 400 | `FILE_REQUIRED` | Campo `file` ausente ou sem arquivo válido. |
| 413 | `FILE_TOO_LARGE` | Arquivo acima do limite configurado. |
| 500 | `UPLOAD_FAILED` | Falha inesperada ao gravar arquivo ou registrar metadados. |

### 6.3 `GET /documents`

- Cabeçalho obrigatório: `X-User-Id: <identificador>`.
- Entrada: sem corpo.
- Saída: HTTP 200, `Content-Type: application/json`; lista dos metadados públicos pertencentes ao usuário. Lista vazia quando não há documentos.
- Ordenação: mais recentes primeiro por `uploadedAt`; desempate determinístico por `id`.

Resposta de sucesso:

```json
[
  {
    "id": "2f3b5c37-2f32-4c20-bd8a-30e0eaf43841",
    "originalName": "relatorio.pdf",
    "size": 1024,
    "uploadedAt": "2026-10-06T12:00:00.000Z",
    "owner": "usuario-123"
  }
]
```

Erro previsto: HTTP 400 com código `USER_ID_REQUIRED` quando o cabeçalho estiver ausente ou vazio. Falhas inesperadas retornam HTTP 500 com código `INTERNAL_ERROR`.

### 6.4 `GET /documents/:id/download`

- Cabeçalho obrigatório: `X-User-Id: <identificador>`.
- Entrada: identificador UUID no parâmetro `id`; sem corpo.
- Sucesso: HTTP 200, conteúdo binário do arquivo, `Content-Disposition: attachment` e nome de download baseado em `originalName` devidamente sanitizado. O caminho local nunca é enviado.
- O download deve ser autorizado pela comparação do `owner` do metadado com o `X-User-Id` recebido.

Erros previstos:

| HTTP | Código | Situação |
| --- | --- | --- |
| 400 | `USER_ID_REQUIRED` | Cabeçalho `X-User-Id` ausente ou vazio. |
| 400 | `INVALID_DOCUMENT_ID` | Identificador malformado. |
| 404 | `DOCUMENT_NOT_FOUND` | Documento inexistente, pertencente a outro usuário ou arquivo físico ausente. |
| 500 | `DOWNLOAD_FAILED` | Falha inesperada ao ler ou transmitir o arquivo. |

### 6.5 `GET /health`

Endpoint operacional já presente no seed. Retorna HTTP 200 e `{"status":"ok"}` quando o processo está disponível. Não requer `X-User-Id`.

## 7. Decisões arquiteturais

### 7.1 Backend

Backend em Node.js e Express, CommonJS, com Clean Architecture simples dentro de `backend/src`:

- `routes/`: declara caminhos, parâmetros, middleware de upload e delega aos controllers.
- `controllers/`: valida entrada HTTP, obtém `X-User-Id`, chama serviços e traduz resultados para status, cabeçalhos e corpos HTTP.
- `services/`: aplica regras de negócio, autorização por proprietário, criação de metadados e tratamento dos casos de uso.
- `repositories/`: encapsula gravação/leitura dos arquivos locais e catálogo em memória.

Fluxo permitido de dependências: `routes -> controllers -> services -> repositories`. Serviços não conhecem Express; repositories não conhecem HTTP. Erros de entrada e de filesystem devem ser tratados nas fronteiras apropriadas.

Multer deve usar `diskStorage` apontando para `STORAGE_DIR`. A configuração do storage e o nome físico não podem depender de caminho controlado pelo cliente. Nenhum provedor ou armazenamento remoto deve ser introduzido.

### 7.2 Frontend

Frontend em React e Vite, com componentes funcionais e Hooks. A organização segue `components/`, `pages/` e `services/`. A camada de serviço centraliza chamadas `fetch` para `/api`; componentes não devem duplicar a construção de requisições. O identificador `X-User-Id` deve ser enviado nas operações de documentos conforme a identidade de usuário configurada para a experiência desta versão.

### 7.3 Configuração e operação

- `PORT`: porta HTTP, padrão 3000.
- `STORAGE_DIR`: diretório local de arquivos, padrão `backend/storage`.
- `MAX_FILE_SIZE_BYTES`: limite de tamanho de upload, padrão 10485760.
- Configurações são lidas do ambiente; segredos não são necessários nesta versão.
- A pasta de armazenamento deve existir ou ser criada pela aplicação com tratamento de erro. O processo precisa de permissão de leitura e escrita.

## 8. Plano de execução em etapas

Este plano cobre a definição e aprovação da especificação. Não inclui criação, alteração ou execução de arquivos de backend ou frontend. A decomposição de tarefas de implementação será feita em um plano posterior, após aprovação desta especificação.

1. **Consolidar requisitos e premissas:** revisar funcionalidades, limites do escopo, identificação por `X-User-Id` sem autenticação e perda dos metadados em reinicializações. Saída: requisitos e riscos aceitos ou decisões pendentes registradas.
2. **Validar modelo e contratos:** confirmar campos públicos e internos, formatos de resposta, códigos HTTP, limite de upload e comportamento de acesso entre usuários. Saída: contrato de API aprovado.
3. **Validar restrições arquiteturais e operacionais:** confirmar as quatro camadas, fluxo de dependência, Multer com `diskStorage`, diretório local, configuração por ambiente e uso do prefixo `/api` pelo frontend. Saída: decisões arquiteturais aprovadas.
4. **Definir critérios de aceite e encerrar a fase de especificação:** associar cada requisito a verificações funcionais e não funcionais e registrar questões ainda abertas. Saída: especificação pronta para orientar um plano futuro de implementação.

## 9. Riscos e decisões pendentes

- `X-User-Id` não autentica o usuário e pode ser falsificado. Não armazenar documentos sensíveis sob a expectativa de isolamento seguro até que autenticação e autorização sejam especificadas.
- Metadados em memória se perdem ao reiniciar, enquanto os arquivos podem permanecer no disco. Persistência durável e política de limpeza exigem decisão futura.
- O limite padrão de 10 MiB é uma decisão inicial configurável; deve ser confirmado antes de uso com arquivos maiores.
- Esta versão não define uma lista de tipos MIME permitidos. Se houver exigência de bloquear formatos, a regra deve ser definida como requisito específico e não baseada apenas no MIME declarado pelo cliente.
- A localização efetiva de `STORAGE_DIR` deve ser resolvida de maneira consistente independentemente do diretório corrente do processo, para evitar gravação acidental fora de `backend/storage`.
