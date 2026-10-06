import { File, RefreshCw } from 'lucide-react';
import DownloadButton from './DownloadButton.jsx';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const sizeFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${sizeFormatter.format(bytes / 1024)} KB`;
  return `${sizeFormatter.format(bytes / (1024 * 1024))} MB`;
}

export default function DocumentList({ documents, owner, loading, error, onRefresh }) {
  return (
    <section className="documents-section" aria-labelledby="documents-title" aria-busy={loading}>
      <div className="section-heading">
        <h2 id="documents-title">Meus documentos</h2>
        <div className="list-actions">
          {!loading && !error && <span className="document-count">{documents.length}</span>}
          <button
            className="icon-button"
            type="button"
            title="Atualizar documentos"
            aria-label="Atualizar documentos"
            disabled={loading || !owner}
            onClick={onRefresh}
          >
            <RefreshCw size={18} className={loading ? 'spinning' : undefined} />
          </button>
        </div>
      </div>
      {loading ? <p className="list-status" role="status">Carregando documentos...</p>
        : error ? <p className="error-message list-status" role="alert">{error}</p>
          : documents.length === 0 ? <p className="list-status">Nenhum documento encontrado.</p>
            : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th scope="col">Nome</th><th scope="col">Tamanho</th><th scope="col">Enviado em</th><th scope="col"><span className="sr-only">Download</span></th></tr>
                  </thead>
                  <tbody>
                    {documents.map((document) => (
                      <tr key={document.id}>
                        <td><div className="document-name"><File size={18} aria-hidden="true" /><span>{document.originalName}</span></div></td>
                        <td className="size-cell">{formatSize(document.size)}</td>
                        <td><time dateTime={document.uploadedAt}>{dateFormatter.format(new Date(document.uploadedAt))}</time></td>
                        <td><DownloadButton document={document} owner={owner} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
    </section>
  );
}