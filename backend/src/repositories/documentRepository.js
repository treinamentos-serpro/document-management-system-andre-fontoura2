const { randomUUID } = require('node:crypto');
const { mkdir, stat, unlink } = require('node:fs/promises');
const path = require('node:path');

const projectDir = path.resolve(__dirname, '../../..');
const storageDir = process.env.STORAGE_DIR
  ? path.resolve(projectDir, process.env.STORAGE_DIR)
  : path.resolve(__dirname, '../../storage');
const documents = new Map();

const storageOptions = {
  destination(request, file, callback) {
    mkdir(storageDir, { recursive: true }).then(
      () => callback(null, storageDir),
      (error) => callback(error),
    );
  },
  filename(request, file, callback) {
    callback(null, randomUUID());
  },
};

async function save(document) {
  documents.set(document.id, document);
}

async function list() {
  return Array.from(documents.values());
}

async function findById(id) {
  return documents.get(id);
}

async function getFilePath(storageName) {
  const filePath = path.join(storageDir, storageName);
  try {
    const file = await stat(filePath);
    return file.isFile() ? filePath : null;
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}

async function removeFile(storageName) {
  try {
    await unlink(path.join(storageDir, storageName));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

module.exports = { storageOptions, save, list, findById, getFilePath, removeFile };