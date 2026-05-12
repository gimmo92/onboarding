import { useEffect, useRef } from 'react'
import {
  DOCUMENT_TEMPLATE_TAGS,
  detectDocumentTagsFromContent,
  htmlToPlainText,
  type DocumentTemplate,
  type DocumentTemplateTagKey,
} from './documentTemplates'

type DocumentTemplateEditorProps = {
  template: DocumentTemplate
  onSave: (patch: {
    editorHtml: string
    extractedText: string
    tags: DocumentTemplateTagKey[]
  }) => void
  onCancel: () => void
}

export default function DocumentTemplateEditor({
  template,
  onSave,
  onCancel,
}: DocumentTemplateEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.innerHTML = template.editorHtml || '<p></p>'
  }, [template.id, template.editorHtml])

  function focusEditor() {
    editorRef.current?.focus()
  }

  function applyCommand(command: string) {
    focusEditor()
    document.execCommand(command, false)
  }

  function insertTag(token: string) {
    focusEditor()
    document.execCommand('insertText', false, token)
  }

  function handleSave() {
    const editorHtml = editorRef.current?.innerHTML ?? ''
    const extractedText = htmlToPlainText(editorHtml)
    onSave({
      editorHtml,
      extractedText,
      tags: detectDocumentTagsFromContent(editorHtml, extractedText),
    })
  }

  return (
    <section className="panel documents-panel document-editor-panel">
      <div className="documents-head">
        <div>
          <h2>Editor modello</h2>
          <p className="hcm-hint">
            Modifica il contenuto di <strong>{template.name}</strong> e inserisci i tag anagrafici
            dal pannello dedicato.
          </p>
        </div>
      </div>

      <div className="document-editor-toolbar" role="toolbar" aria-label="Formattazione documento">
        <div className="document-editor-toolbar-group">
          <button type="button" className="btn ghost btn-compact" onClick={() => applyCommand('bold')}>
            Grassetto
          </button>
          <button
            type="button"
            className="btn ghost btn-compact"
            onClick={() => applyCommand('italic')}
          >
            Corsivo
          </button>
          <button
            type="button"
            className="btn ghost btn-compact"
            onClick={() => applyCommand('underline')}
          >
            Sottolineato
          </button>
          <button
            type="button"
            className="btn ghost btn-compact"
            onClick={() => applyCommand('insertUnorderedList')}
          >
            Elenco puntato
          </button>
          <button
            type="button"
            className="btn ghost btn-compact"
            onClick={() => applyCommand('insertOrderedList')}
          >
            Elenco numerato
          </button>
        </div>

        <div className="document-editor-toolbar-group">
          {DOCUMENT_TEMPLATE_TAGS.map((tag) => (
            <button
              key={tag.key}
              type="button"
              className="btn btn-compact doc-tag-button"
              onClick={() => insertTag(tag.token)}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={editorRef}
        className="document-editor-surface"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={`Contenuto del modello ${template.name}`}
        suppressContentEditableWarning
      />

      <div className="wizard-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>
          Annulla
        </button>
        <button type="button" className="btn primary" onClick={handleSave}>
          Salva modello
        </button>
      </div>
    </section>
  )
}
