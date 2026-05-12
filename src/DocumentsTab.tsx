import { useEffect, useMemo, useState } from 'react'
import type { JSONContent } from '@tiptap/core'
import DocumentTemplateEditor from './DocumentTemplateEditor'
import DocumentTemplatePreview from './DocumentTemplatePreview'
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
import { emptyTemplateDocument, serializeDocumentToMergeHtml } from './templates/templateSerialization'

function newId(): string {
  return crypto.randomUUID()
}

type EditorMode =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; templateId: string; version?: number }

export default function DocumentsTab() {
  const [documents, setDocuments] = useState<DocumentTemplate[]>(() => loadDocumentTemplates())
  const [editorMode, setEditorMode] = useState<EditorMode>({ kind: 'closed' })
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const previewTemplate = documents.find((document) => document.id === previewId) ?? null
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
    saveDocumentTemplates(documents)
  }, [documents])

  function closeEditor() {
    setEditorMode({ kind: 'closed' })
  }

  function handleSaveTemplate(payload: { name: string; editorJson: JSONContent }) {
    setSaving(true)
    const now = new Date().toISOString()
    const htmlWithPlaceholders = serializeDocumentToMergeHtml(payload.editorJson)
    extractMergeFieldKeys(htmlWithPlaceholders)

    if (editorMode.kind === 'create') {
      const template: DocumentTemplate = {
        id: newId(),
        name: payload.name,
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
      setDocuments((current) => upsertDocumentTemplate(current, template))
      closeEditor()
      setSaving(false)
      return
    }

    if (editorMode.kind === 'edit' && editingTemplate) {
      const nextVersion = editingTemplate.currentVersion + 1
      const version = {
        version: nextVersion,
        createdAt: now,
        editorJson: payload.editorJson,
        htmlWithPlaceholders,
      }
      const updated = appendTemplateVersion(
        {
          ...editingTemplate,
          name: payload.name,
        },
        version
      )
      setDocuments((current) => upsertDocumentTemplate(current, updated))
      closeEditor()
    }

    setSaving(false)
  }

  function removeDocument(id: string) {
    setDocuments((current) => current.filter((document) => document.id !== id))
    if (previewId === id) {
      setPreviewId(null)
    }
    if (editorMode.kind === 'edit' && editorMode.templateId === id) {
      closeEditor()
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
            <p className="hcm-hint">
              Crea modelli online con merge field, versiona le modifiche e genera PDF con dati
              dipendente.
            </p>
          </div>
          <button type="button" className="btn primary" onClick={() => setEditorMode({ kind: 'create' })}>
            Nuovo modello
          </button>
        </div>
      </section>

      <section className="panel documents-panel">
        <h2 className="workflow-list-title">Modelli salvati</h2>
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
                            onClick={() => setPreviewId(document.id)}
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

      {previewTemplate ? (
        <DocumentTemplatePreview
          template={previewTemplate}
          onClose={() => setPreviewId(null)}
        />
      ) : null}
    </div>
  )
}
