import { useState } from 'react';
import { LoaderCircle, Upload } from 'lucide-react';
import { uploadDocument } from '../services/documentApi.js';

export default function UploadComponent({ owner, onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || uploading) return;
    const form = event.currentTarget;
    setUploading(true);
    setError('');
    try {
      const document = await uploadDocument(file, owner);
      form.reset();
      setFile(null);
      onUploaded(document);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="upload-panel" aria-labelledby="upload-title">
      <h2 id="upload-title">Enviar documento</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="document-file">Arquivo</label>
        <input
          id="document-file"
          type="file"
          required
          disabled={uploading}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setError('');
          }}
        />
        <button className="primary-button" type="submit" disabled={!file || uploading || !owner}>
          {uploading ? <LoaderCircle className="spinning" size={18} /> : <Upload size={18} />}
          {uploading ? 'Enviando...' : 'Enviar documento'}
        </button>
        {error && <p className="error-message" role="alert">{error}</p>}
      </form>
    </section>
  );
}