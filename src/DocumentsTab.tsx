import { useEffect, useMemo, useRef, useState } from 'react'
import type { JSONContent } from '@tiptap/core'
import DocumentTemplateEditor from './DocumentTemplateEditor'
import {
  type DocumentTemplate,
  formatTemplateVersionLabel,
  getCurrentTemplateVersion,
} from './documentTemplates'
import {
  appendTemplateVersion,
  loadDocumentTemplates,
  saveDocumentTemplates,
  upsertDocumentTemplate,
} from './documentTemplateStorage'
import { extractMergeFieldKeys } from './templates/templateEngine'
import { openDocumentTemplatePreviewInNewTab } from './templates/documentTemplatePreviewWindow'
import { emptyTemplateDocument, serializeDocumentToMergeHtml } from './templates/templateSerialization'

function newId(): string {
  return crypto.randomUUID()
}

type EditorMode =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; templateId: string; version?: number }

export default function DocumentsTab() {
  const [documents, setDocuments] = useState<DocumentTemplate[]>([])
  const [documentsReady, setDocumentsReady] = useState(false)
  const [editorMode, setEditorMode] = useState<EditorMode>({ kind: 'closed' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  const documentsPersistReady = useRef(false)
  const editingTemplate =
    editorMode.kind === 'edit'
      ? (documents.find((document) => document.id === editorMode.templateId) ?? null)
      : null

  const editorInitialDocument = useMemo<JSONContent>(() => {
    if (editorMode.kind === 'create') {
      return emptyTemplateDocument()
    }
    if (editorMode.kind !== 'edit' || !editingTemplate) {
      return emptyTemplateDocument()
    }
    const versionNumber = editorMode.version ?? editingTemplate.currentVersion
    const version =
      editingTemplate.versions.find((item) => item.version === versionNumber) ??
      getCurrentTemplateVersion(editingTemplate)
    return version?.editorJson ?? emptyTemplateDocument()
  }, [editorMode, editingTemplate])

  useEffect(() => {
    let active = true

    loadDocumentTemplates()
      .then((list) => {
        if (!active) return
        setDocuments(list)
        setDocumentsReady(true)
      })
      .catch(() => {
        if (!active) return
        setStorageError('Caricamento modelli non riuscito.')
        setDocumentsReady(true)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!documentsReady) return
    if (!documentsPersistReady.current) {
      documentsPersistReady.current = true
      return
    }

    void saveDocumentTemplates(documents).then((result) => {
      if (!result.ok) {
        setStorageError(result.error ?? 'Salvataggio modelli non riuscito.')
      }
    })
  }, [documents, documentsReady])

  function closeEditor() {
    setEditorMode({ kind: 'closed' })
    setSaveError(null)
  }

  async function handleSaveTemplate(payload: { name: string; editorJson: JSONContent }) {
    const trimmedName = payload.name.trim()
    if (!trimmedName) {
      setSaveError('Inserisci un nome per il modello.')
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      const htmlWithPlaceholders = serializeDocumentToMergeHtml(payload.editorJson)
      const now = new Date().toISOString()
      let nextDocuments: DocumentTemplate[] | null = null

      if (editorMode.kind === 'create') {
        const template: DocumentTemplate = {
          id: newId(),
          name: trimmedName,
          createdAt: now,
          updatedAt: now,
          currentVersion: 1,
          versions: [
            {
              version: 1,
              createdAt: now,
              editorJson: payload.editorJson,
              htmlWithPlaceholders,
            },
          ],
        }
        nextDocuments = upsertDocumentTemplate(documents, template)
      } else if (editorMode.kind === 'edit') {
        const currentTemplate = documents.find((document) => document.id === editorMode.templateId)
        if (!currentTemplate) {
          setSaveError('Modello non trovato. Ricarica la pagina e riprova.')
          return
        }

        const nextVersion = currentTemplate.currentVersion + 1
        const version = {
          version: nextVersion,
          createdAt: now,
          editorJson: payload.editorJson,
          htmlWithPlaceholders,
        }
        const updated = appendTemplateVersion(
          {
            ...currentTemplate,
            name: trimmedName,
          },
          version
        )
        nextDocuments = upsertDocumentTemplate(documents, updated)
      } else {
        setSaveError('Sessione editor non valida. Riapri il modello e riprova.')
        return
      }

      const saved = await saveDocumentTemplates(nextDocuments)
      if (!saved.ok) {
        setSaveError(saved.error ?? 'Salvataggio non riuscito. Verifica la connessione a Supabase e riprova.')
        return
      }

      setDocuments(nextDocuments)
      closeEditor()
    } catch {
      setSaveError('Salvataggio non riuscito. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  function removeDocument(id: string) {
    setDocuments((current) => current.filter((document) => document.id !== id))
    if (editorMode.kind === 'edit' && editorMode.templateId === id) {
      closeEditor()
    }
  }

  function handlePreview(document: DocumentTemplate) {
    setPreviewError(null)
    const opened = openDocumentTemplatePreviewInNewTab(document)
    if (!opened) {
      setPreviewError('Impossibile aprire l\'anteprima. Consenti i popup per questo sito e riprova.')
    }
  }

  if (editorMode.kind === 'create' || editorMode.kind === 'edit') {
    return (
      <div className="documents-tab">
        <DocumentTemplateEditor
          key={
            editorMode.kind === 'edit'
              ? `${editorMode.templateId}:${editorMode.version ?? 'current'}`
              : 'create'
          }
          initialName={editingTemplate?.name ?? ''}
          initialDocument={editorInitialDocument}
          saving={saving}
          saveError={saveError}
          onCancel={closeEditor}
          onSave={handleSaveTemplate}
        />
      </div>
    )
  }

  return (
    <div className="documents-tab">
      <section className="panel documents-panel">
        <div className="documents-head">
          <div>
            <h2>Documenti</h2>
          </div>
          <button type="button" className="btn primary" onClick={() => {
            setSaveError(null)
            setEditorMode({ kind: 'create' })
          }}>
            Nuovo modello
          </button>
        </div>
      </section>

      <section className="panel documents-panel">
        <h2 className="workflow-list-title">Modelli salvati</h2>
        {storageError ? <p className="document-upload-error">{storageError}</p> : null}
        {previewError ? <p className="document-upload-error">{previewError}</p> : null}
        {documents.length === 0 ? (
          <p className="workflow-empty">
            Nessun modello salvato. Usa <strong>Nuovo modello</strong> per iniziare.
          </p>
        ) : (
          <div className="table-scroll">
            <table className="hcm-table">
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">Versione</th>
                  <th scope="col">Campi</th>
                  <th scope="col">Aggiornato</th>
                  <th scope="col" className="col-action">
                    <span className="sr-only">Azione</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => {
                  const currentVersion = getCurrentTemplateVersion(document)
                  const fieldCount = currentVersion
                    ? extractMergeFieldKeys(currentVersion.htmlWithPlaceholders).length
                    : 0
                  return (
                    <tr key={document.id}>
                      <td>{document.name}</td>
                      <td className="nowrap">
                        {currentVersion ? formatTemplateVersionLabel(currentVersion) : '—'}
                      </td>
                      <td>{fieldCount ? `${fieldCount} campi` : 'Nessun campo'}</td>
                      <td className="nowrap">
                        {new Date(document.updatedAt).toLocaleDateString('it-IT', {
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
                            onClick={() => handlePreview(document)}
                          >
                            Anteprima
                          </button>
                          <button
                            type="button"
                            className="btn ghost btn-compact"
                            onClick={() =>
                              setEditorMode({ kind: 'edit', templateId: document.id })
                            }
                          >
                            Modifica
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
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
