import { useEffect, useMemo } from 'react'
import {
  applyDummyDataToText,
  DOCUMENT_TEMPLATE_DUMMY_DATA,
  DOCUMENT_TEMPLATE_TAGS,
  templatePdfBlobUrl,
  type DocumentTemplate,
} from './documentTemplates'

type DocumentTemplatePreviewProps = {
  template: DocumentTemplate
  onClose: () => void
}

export default function DocumentTemplatePreview({
  template,
  onClose,
}: DocumentTemplatePreviewProps) {
  const pdfUrl = useMemo(() => templatePdfBlobUrl(template), [template])

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  const mappedTags = template.tags.length
    ? template.tags
    : DOCUMENT_TEMPLATE_TAGS.map((tag) => tag.key)

  const previewText = template.extractedText
    ? applyDummyDataToText(template.extractedText)
    : 'Nessun testo leggibile nel PDF. Verifica che i segnaposto siano presenti nel file preparato su PC.'

  return (
    <dialog className="sign-dialog document-preview-dialog" open>
      <h4>Anteprima modello</h4>
      <p className="dialog-doc-title">
        <strong>{template.name}</strong>
        <span className="dialog-sub"> — {template.fileName}</span>
      </p>
      <p className="dialog-copy">
        I campi sono mappati nel PDF preparato su PC. Qui vedi il documento originale e i
        valori di esempio applicati ai segnaposto rilevati.
      </p>

      <div className="document-preview-layout">
        <section className="document-preview-pane">
          <h5 className="document-preview-title">PDF caricato</h5>
          <iframe
            className="document-preview-frame"
            src={pdfUrl}
            title={`Anteprima PDF ${template.name}`}
          />
        </section>

        <section className="document-preview-pane">
          <h5 className="document-preview-title">Campi mappati con dati di esempio</h5>
          <ul className="document-preview-fields">
            {mappedTags.map((key) => {
              const tag = DOCUMENT_TEMPLATE_TAGS.find((item) => item.key === key)
              if (!tag) return null
              return (
                <li key={key}>
                  <span className="document-preview-field-label">{tag.label}</span>
                  <code>{tag.token}</code>
                  <span className="document-preview-field-value">
                    {DOCUMENT_TEMPLATE_DUMMY_DATA[key]}
                  </span>
                </li>
              )
            })}
          </ul>

          <h5 className="document-preview-title">Testo con valori di esempio</h5>
          <pre className="document-preview-text">{previewText}</pre>
        </section>
      </div>

      <div className="dialog-actions">
        <button type="button" className="btn primary" onClick={onClose}>
          Chiudi
        </button>
      </div>
    </dialog>
  )
}
