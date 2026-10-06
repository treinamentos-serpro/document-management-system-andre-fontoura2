import { useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { downloadDocument } from '../services/documentApi.js';

export default function DownloadButton({ document, owner }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    setError('');
    let objectUrl;
    let link;
    try {
      const blob = await downloadDocument(document.id, owner);
      objectUrl = URL.createObjectURL(blob);
      link = window.document.createElement('a');
      link.href = objectUrl;
      link.download = document.originalName.replace(/^.*[\\/]/, '').replace(/[\x00-\x1f\x7f]/g, '') || 'documento';
      window.document.body.appendChild(link);
      link.click();
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      link?.remove();
      if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setDownloading(false);
    }
  }

  return (
    <div className="download-action">
      <button
        type="button"
        className="icon-button"
        disabled={downloading}
        onClick={handleDownload}
        title={`Baixar ${document.originalName}`}
        aria-label={`Baixar ${document.originalName}`}
      >
        {downloading ? <LoaderCircle size={18} className="spinning" /> : <Download size={18} />}
      </button>
      {downloading && <span className="sr-only" role="status">Baixando documento...</span>}
      {error && <p className="error-message" role="alert">{error}</p>}
    </div>
  );
}