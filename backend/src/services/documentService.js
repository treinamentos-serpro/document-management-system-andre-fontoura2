const { randomUUID } = require('node:crypto');
const documentRepository = require('../repositories/documentRepository');

function publicMetadata(document) {
  const { id, originalName, size, uploadedAt, owner } = document;
  return { id, originalName, size, uploadedAt, owner };
}

async function upload(file, owner) {
  if (!file) throw Object.assign(new Error('Arquivo ausente.'), { code: 'FILE_REQUIRED' });

  try {
    const document = {
      id: randomUUID(),
      originalName: file.originalname,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      owner,
      storageName: file.filename,
    };
    await documentRepository.save(document);
    return publicMetadata(document);
  } catch (error) {
    try {
      await documentRepository.removeFile(file.filename);
    } catch (cleanupError) {
      console.error('Falha ao remover arquivo de upload rejeitado:', cleanupError);
    }
    throw error;
  }
}

async function list(owner) {
  const documents = await documentRepository.list();
  return documents
    .filter((document) => document.owner === owner)
    .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt)
      || first.id.localeCompare(second.id))
    .map(publicMetadata);
}

async function download(id, owner) {
  const document = await documentRepository.findById(id);
  if (!document || document.owner !== owner) {
    throw Object.assign(new Error('Documento não encontrado.'), { code: 'DOCUMENT_NOT_FOUND' });
  }
  const filePath = await documentRepository.getFilePath(document.storageName);
  if (!filePath) {
    throw Object.assign(new Error('Documento não encontrado.'), { code: 'DOCUMENT_NOT_FOUND' });
  }
  return { filePath, originalName: document.originalName };
}

module.exports = { upload, list, download, storageOptions: documentRepository.storageOptions };