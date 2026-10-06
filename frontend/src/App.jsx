import { useEffect, useState } from 'react';
import { FileStack, UserRound } from 'lucide-react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [owner, setOwner] = useState('usuario-123');
  const [ownerInput, setOwnerInput] = useState(owner);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({ owner: '', documents: [], loading: true, error: '' });
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setResult({ owner, documents: [], loading: true, error: '' });
    listDocuments(owner, controller.signal)
      .then((documents) => {
        if (!controller.signal.aborted) setResult({ owner, documents, loading: false, error: '' });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ owner, documents: [], loading: false, error: error.message });
      });
    return () => controller.abort();
  }, [owner, revision]);

  function changeOwner(event) {
    event.preventDefault();
    if (!ownerInput.trim()) return;
    setOwner(ownerInput.trim());
    setOwnerInput(ownerInput.trim());
    setNotice(null);
  }

  function handleUploaded(document) {
    setNotice({ owner, message: `${document.originalName} enviado com sucesso.` });
    setRevision((current) => current + 1);
  }

  const currentResult = result.owner === owner ? result : { documents: [], loading: true, error: '' };

  return (
    <>
      <header className="app-header">
        <div className="header-content"><FileStack size={26} aria-hidden="true" /><span>DMS</span><span className="header-caption">Gestão de documentos</span></div>
      </header>
      <main className="workspace">
        <div className="page-heading"><h1>Documentos</h1><span className="owner-label"><UserRound size={16} aria-hidden="true" />{owner}</span></div>
        <form className="owner-form" onSubmit={changeOwner}>
          <label htmlFor="owner">Identificador do usuário</label>
          <div className="owner-controls">
            <input id="owner" value={ownerInput} onChange={(event) => setOwnerInput(event.target.value)} required autoComplete="off" />
            <button type="submit" disabled={!ownerInput.trim() || ownerInput.trim() === owner}>Selecionar</button>
          </div>
        </form>
        <UploadComponent key={owner} owner={owner} onUploaded={handleUploaded} />
        {notice?.owner === owner && <p className="success-message" role="status">{notice.message}</p>}
        <DocumentList
          key={`list-${owner}`}
          documents={currentResult.documents}
          owner={owner}
          loading={currentResult.loading}
          error={currentResult.error}
          onRefresh={() => setRevision((current) => current + 1)}
        />
      </main>
    </>
  );
}
