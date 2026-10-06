const multer = require('multer');
const path = require('node:path');
const documentService = require('../services/documentService');

const maxFileSize = Number(process.env.MAX_FILE_SIZE_BYTES ?? 10485760);
if (!Number.isSafeInteger(maxFileSize) || maxFileSize <= 0) {
  throw new Error('MAX_FILE_SIZE_BYTES deve ser um inteiro positivo.');
}

const receiveFile = multer({
  storage: multer.diskStorage(documentService.storageOptions),
  limits: { fileSize: maxFileSize },
}).single('file');

const errors = {
  USER_ID_REQUIRED: [400, 'Informe o identificador do usuário.'],
  FILE_REQUIRED: [400, 'Envie um arquivo para continuar.'],
  FILE_TOO_LARGE: [413, 'O arquivo excede o tamanho permitido.'],
  INVALID_UPLOAD: [400, 'Envie apenas um arquivo no campo file em uma requisição multipart válida.'],
  INVALID_DOCUMENT_ID: [400, 'Informe um identificador de documento válido.'],
  DOCUMENT_NOT_FOUND: [404, 'Documento não encontrado.'],
  UPLOAD_FAILED: [500, 'Não foi possível enviar o documento.'],
  DOWNLOAD_FAILED: [500, 'Não foi possível baixar o documento.'],
  INTERNAL_ERROR: [500, 'Não foi possível concluir a operação.'],
};

function sendError(response, code) {
  const [status, message] = errors[code];
  response.status(status).json({ error: { code, message } });
}

function requireOwner(request, response, next) {
  const owner = request.get('X-User-Id')?.trim();
  if (!owner) return sendError(response, 'USER_ID_REQUIRED');
  request.owner = owner;
  next();
}

function upload(request, response) {
  receiveFile(request, response, async (error) => {
    if (error) {
      const code = error.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE'
        : error instanceof multer.MulterError ? 'INVALID_UPLOAD' : 'UPLOAD_FAILED';
      return sendError(response, code);
    }
    try {
      const document = await documentService.upload(request.file, request.owner);
      response.status(201).json(document);
    } catch (uploadError) {
      sendError(response, uploadError.code === 'FILE_REQUIRED' ? 'FILE_REQUIRED' : 'UPLOAD_FAILED');
    }
  });
}

async function list(request, response) {
  try {
    response.json(await documentService.list(request.owner));
  } catch (error) {
    sendError(response, 'INTERNAL_ERROR');
  }
}

async function download(request, response, next) {
  const { id } = request.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return sendError(response, 'INVALID_DOCUMENT_ID');
  }
  try {
    const document = await documentService.download(id, request.owner);
    const filename = path.win32.basename(document.originalName).replace(/[\x00-\x1f\x7f]/g, '') || 'documento';
    response.type('application/octet-stream');
    response.set('X-Content-Type-Options', 'nosniff');
    response.download(document.filePath, filename, (error) => {
      if (!error) return;
      if (response.headersSent) return next(error);
      sendError(response, error.code === 'ENOENT' || error.status === 404
        ? 'DOCUMENT_NOT_FOUND' : 'DOWNLOAD_FAILED');
    });
  } catch (error) {
    sendError(response, error.code === 'DOCUMENT_NOT_FOUND' ? 'DOCUMENT_NOT_FOUND' : 'DOWNLOAD_FAILED');
  }
}

module.exports = { requireOwner, upload, list, download };