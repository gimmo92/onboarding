import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import type { JSONContent } from '@tiptap/core'
import { createTemplateEditorExtensions } from './templates/templateSerialization'
import { mergeFieldsByCategory } from './templates/mergeFields'
import { importDocxToEditorHtml } from './templates/docxImport'
import { mergeHtmlToEditorDocument } from './templates/templateSerialization'

type DocumentTemplateEditorProps = {
  initialName: string
  initialDocument: JSONContent
  saving?: boolean
  saveError?: string | null
  onCancel: () => void
  onSave: (payload: { name: string; editorJson: JSONContent }) => void
}

export default function DocumentTemplateEditor({
  initialName,
  initialDocument,
  saving = false,
  saveError = null,
  onCancel,
  onSave,
}: DocumentTemplateEditorProps) {
  const [name, setName] = useState(initialName)
  const [fieldMenuOpen, setFieldMenuOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const fieldMenuRef = useRef<HTMLDivElement>(null)
  const docxInputRef = useRef<HTMLInputElement>(null)
  const extensions = useMemo(() => createTemplateEditorExtensions(), [])

  const editor = useEditor({
    extensions,
    content: initialDocument,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'document-editor-surface',
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.commands.setContent(initialDocument)
  }, [editor, initialDocument])

  useEffect(() => {
    if (!fieldMenuOpen) return

    function handlePointerDown(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof globalThis.Node)) {
        return
      }
      if (!fieldMenuRef.current?.contains(target)) {
        setFieldMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [fieldMenuOpen])

  const groupedFields = mergeFieldsByCategory()

  function insertMergeField(fieldKey: string, fieldLabel: string) {
    if (!editor) return
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'mergeField',
        attrs: { fieldKey, fieldLabel },
      })
      .insertContent(' ')
      .run()
    setFieldMenuOpen(false)
  }

  function handleSave() {
    if (!editor) return
    onSave({
      name: name.trim(),
      editorJson: editor.getJSON(),
    })
  }

  async function handleDocxImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !editor) return

    setImporting(true)
    setImportError(null)
    try {
      const html = await importDocxToEditorHtml(file)
      const document = mergeHtmlToEditorDocument(html)
      editor.commands.setContent(document)
    } catch {
      setImportError('Importazione DOCX non riuscita. Verifica il file e riprova.')
    } finally {
      setImporting(false)
    }
  }

  if (!editor) {
    return null
  }

  return (
    <section className="panel documents-panel document-editor-panel">
      <div className="documents-head">
        <div>
          <h2>Editor modello</h2>
          <p className="hcm-hint">
            Crea il documento online e inserisci i campi dinamici dal menu dedicato.
          </p>
        </div>
        <div className="document-editor-head-actions">
          <input
            ref={docxInputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            onChange={handleDocxImport}
          />
          <button
            type="button"
            className="btn ghost"
            disabled={importing}
            onClick={() => docxInputRef.current?.click()}
          >
            {importing ? 'Importazione...' : 'Importa DOCX'}
          </button>
        </div>
      </div>

      <label className="wizard-field">
        Nome modello
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Es. Contratto di assunzione"
          required
        />
      </label>

      {importError ? <p className="document-upload-error">{importError}</p> : null}
      {saveError ? <p className="document-upload-error">{saveError}</p> : null}

      <div className="document-editor-toolbar">
        <div className="document-editor-toolbar-group">
          <button
            type="button"
            className={`btn ghost btn-compact ${editor.isActive('bold') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            Grassetto
          </button>
          <button
            type="button"
            className={`btn ghost btn-compact ${editor.isActive('italic') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            Corsivo
          </button>
          <button
            type="button"
            className={`btn ghost btn-compact ${editor.isActive('underline') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            Sottolineato
          </button>
          <button
            type="button"
            className={`btn ghost btn-compact ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            H1
          </button>
          <button
            type="button"
            className={`btn ghost btn-compact ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </button>
          <button
            type="button"
            className={`btn ghost btn-compact ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            H3
          </button>
          <button
            type="button"
            className={`btn ghost btn-compact ${editor.isActive('bulletList') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            Elenco
          </button>
          <button
            type="button"
            className={`btn ghost btn-compact ${editor.isActive('orderedList') ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            Numerato
          </button>
          <button
            type="button"
            className={`btn ghost btn-compact ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            Sinistra
          </button>
          <button
            type="button"
            className={`btn ghost btn-compact ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            Centro
          </button>
          <button
            type="button"
            className={`btn ghost btn-compact ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            Destra
          </button>
          <button
            type="button"
            className="btn ghost btn-compact"
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
          >
            Tabella
          </button>
        </div>

        <div className="document-editor-toolbar-group document-editor-field-picker" ref={fieldMenuRef}>
          <button
            type="button"
            className="btn primary btn-compact"
            aria-expanded={fieldMenuOpen}
            onClick={() => setFieldMenuOpen((open) => !open)}
          >
            Inserisci campo
          </button>
          {fieldMenuOpen ? (
            <div className="document-field-menu" role="menu">
              {groupedFields.map((group) => (
                <div key={group.category} className="document-field-menu-group">
                  <p className="document-field-menu-title">{group.label}</p>
                  <ul>
                    {group.fields.map((field) => (
                      <li key={field.key}>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => insertMergeField(field.key, field.label)}
                        >
                          {field.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <EditorContent editor={editor} />

      <div className="wizard-actions">
        <button type="button" className="btn ghost" onClick={onCancel} disabled={saving}>
          Annulla
        </button>
        <button type="button" className="btn primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvataggio...' : 'Salva modello'}
        </button>
      </div>
    </section>
  )
}
