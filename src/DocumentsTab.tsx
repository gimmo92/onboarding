import { useEffect, useRef, useState, type FormEvent } from 'react'
import DocumentTemplateEditor from './DocumentTemplateEditor'
import {
  DOCUMENT_TEMPLATE_TAGS,
  detectDocumentTagsFromContent,
  extractDocumentHtml,
  extractDocumentText,
  fileToBase64,
  formatDocumentTags,
  isWordDocumentFile,
  type DocumentTemplate,
} from './documentTemplates'
import {
  loadDocumentTemplates,
  saveDocumentTemplates,
} from './documentTemplateStorage'

function newId(): string {
  return crypto.randomUUID()
}

export default function DocumentsTab() {
  const [documents, setDocuments] = useState<DocumentTemplate[]>(() => loadDocumentTemplates())
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [documentName, setDocumentName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editingTemplate = documents.find((document) => document.id === editingId) ?? null

  useEffect(() => {
    saveDocumentTemplates(documents)
  }, [documents])

  function resetUploadForm() {
    setDocumentName('')
    setSelectedFile(null)
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function openUploadForm() {
    setEditingId(null)
    resetUploadForm()
    setUploadOpen(true)
  }

  function closeUploadForm() {
    setUploadOpen(false)
    resetUploadForm()
  }

  function openEditor(id: string) {
    setUploadOpen(false)
    setEditingId(id)
  }

  function closeEditor() {
    setEditingId(null)
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = documentName.trim()
    if (!name) {
      setUploadError('Inserisci un nome per il documento.')
      return
    }
    if (!selectedFile) {
      setUploadError('Seleziona un file .doc o .docx.')
      return
    }
    if (!isWordDocumentFile(selectedFile)) {
      setUploadError('Sono supportati solo file .doc e .docx.')
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      const [storageData, editorHtml, extractedText] = await Promise.all([
        fileToBase64(selectedFile),
        extractDocumentHtml(selectedFile),
        extractDocumentText(selectedFile),
      ])

      const template: DocumentTemplate = {
        id: newId(),
        name,
        fileName: selectedFile.name,
        mimeType: selectedFile.type || 'application/octet-stream',
        storageData,
        editorHtml,
        extractedText: extractedText || undefined,
        tags: detectDocumentTagsFromContent(editorHtml, extractedText),
        createdAt: new Date().toISOString(),
      }

      setDocuments((current) => [template, ...current])
      closeUploadForm()
      setEditingId(template.id)
    } catch {
      setUploadError('Caricamento non riuscito. Riprova con un altro file.')
    } finally {
      setUploading(false)
    }
  }

  function saveEditedTemplate(
    id: string,
    patch: Pick<DocumentTemplate, 'editorHtml' | 'extractedText' | 'tags'>
  ) {
    setDocuments((current) =>
      current.map((document) =>
        document.id === id
          ? {
              ...document,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : document
      )
    )
    closeEditor()
  }

  function removeDocument(id: string) {
    setDocuments((current) => current.filter((document) => document.id !== id))
    if (editingId === id) {
      closeEditor()
    }
  }

  if (editingTemplate) {
    return (
      <div className="documents-tab">
        <DocumentTemplateEditor
          template={editingTemplate}
          onSave={(patch) => saveEditedTemplate(editingTemplate.id, patch)}
          onCancel={closeEditor}
        />
      </div>
    )
  }

  return (
    <div className="documents-tab">
      {uploadOpen ? (
        <section className="panel documents-panel">
          <form className="document-upload-form" onSubmit={handleUpload}>
            <div className="documents-head">
              <div>
                <h2>Carica documento</h2>
                <p className="hcm-hint">
                  Carica un modello Word (.doc o .docx). Dopo il caricamento potrai aprirlo
                  nell&apos;editor e inserire i tag{' '}
                  {DOCUMENT_TEMPLATE_TAGS.map((tag) => tag.token).join(', ')}.
                </p>
              </div>
            </div>

            <label className="wizard-field">
              Nome documento
              <input
                type="text"
                value={documentName}
                onChange={(event) => setDocumentName(event.target.value)}
                placeholder="Es. Contratto di assunzione"
                required
              />
            </label>

            <label className="wizard-field">
              File Word
              <input
                ref={fileInputRef}
                type="file"
                accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] ?? null)
                  setUploadError(null)
                }}
              />
            </label>

            <div className="document-tag-legend">
              <p className="document-tag-legend-title">Tag disponibili nel modello</p>
              <ul className="document-tag-list">
                {DOCUMENT_TEMPLATE_TAGS.map((tag) => (
                  <li key={tag.key}>
                    <code>{tag.token}</code>
                    <span>{tag.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {uploadError ? <p className="document-upload-error">{uploadError}</p> : null}

            <div className="wizard-actions">
              <button type="button" className="btn ghost" onClick={closeUploadForm}>
                Annulla
              </button>
              <button type="submit" className="btn primary" disabled={uploading}>
                {uploading ? 'Caricamento...' : 'Carica documento'}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <>
          <section className="panel documents-panel">
            <div className="documents-head">
              <div>
                <h2>Documenti</h2>
                <p className="hcm-hint">
                  Carica modelli Word, aprili nell&apos;editor WYSIWYG e inserisci i tag
                  anagrafici da riutilizzare nei workflow.
                </p>
              </div>
              <button type="button" className="btn primary" onClick={openUploadForm}>
                Carica
              </button>
            </div>
          </section>

          <section className="panel documents-panel">
            <h2 className="workflow-list-title">Modelli caricati</h2>
            {documents.length === 0 ? (
              <p className="workflow-empty">
                Nessun documento caricato. Usa <strong>Carica</strong> per aggiungere un modello
                .doc o .docx.
              </p>
            ) : (
              <div className="table-scroll">
                <table className="hcm-table">
                  <thead>
                    <tr>
                      <th scope="col">Nome</th>
                      <th scope="col">File</th>
                      <th scope="col">Tag rilevati</th>
                      <th scope="col">Caricato</th>
                      <th scope="col" className="col-action">
                        <span className="sr-only">Azione</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((document) => (
                      <tr key={document.id}>
                        <td>{document.name}</td>
                        <td className="nowrap">{document.fileName}</td>
                        <td>{formatDocumentTags(document.tags)}</td>
                        <td className="nowrap">
                          {new Date(document.createdAt).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="col-action">
                          <div className="row-actions">
                            <button
                              type="button"
                              className="btn primary btn-compact"
                              onClick={() => openEditor(document.id)}
                            >
                              Apri
                            </button>
                            <button
                              type="button"
                              className="btn ghost btn-compact"
                              onClick={() => removeDocument(document.id)}
                            >
                              Elimina
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
