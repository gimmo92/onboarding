import { useMemo, useState } from 'react'
import type { DocumentTemplate } from './documentTemplates'
import { formatTemplateVersionLabel, getCurrentTemplateVersion } from './documentTemplates'
import { buildSampleMergeContext } from './templates/employeeMergeContext'
import { downloadHtmlAsPdf } from './templates/htmlToPdf'
import { renderTemplateHtml } from './templates/templateEngine'

type DocumentTemplatePreviewProps = {
  template: DocumentTemplate
  onClose: () => void
}

export default function DocumentTemplatePreview({
  template,
  onClose,
}: DocumentTemplatePreviewProps) {
  const [selectedVersion, setSelectedVersion] = useState(template.currentVersion)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const version =
    template.versions.find((item) => item.version === selectedVersion) ??
    getCurrentTemplateVersion(template)

  const renderedHtml = useMemo(() => {
    if (!version) return ''
    return renderTemplateHtml(version.htmlWithPlaceholders, buildSampleMergeContext())
  }, [version])

  async function handleDownloadPdf() {
    if (!version || !renderedHtml) return
    setExporting(true)
    setExportError(null)
    try {
      await downloadHtmlAsPdf(renderedHtml, `${template.name}.pdf`, template.name)
    } catch {
      setExportError('Esportazione PDF non riuscita.')
    } finally {
      setExporting(false)
    }
  }

  if (!version) {
    return null
  }

  return (
    <dialog className="sign-dialog document-preview-dialog" open>
      <h4>Anteprima modello</h4>
      <p className="dialog-doc-title">
        <strong>{template.name}</strong>
        <span className="dialog-sub"> — versione {version.version}</span>
      </p>
      <p className="dialog-copy">
        Anteprima con dati di esempio del dipendente. Puoi scaricare il documento in PDF.
      </p>

      <label className="wizard-field document-preview-version-field">
        Versione
        <select
          value={selectedVersion}
          onChange={(event) => setSelectedVersion(Number(event.target.value))}
        >
          {template.versions
            .slice()
            .sort((left, right) => right.version - left.version)
            .map((item) => (
              <option key={item.version} value={item.version}>
                {formatTemplateVersionLabel(item)}
              </option>
            ))}
        </select>
      </label>

      <div
        className="template-rendered-document document-preview-render"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />

      {exportError ? <p className="document-upload-error">{exportError}</p> : null}

      <div className="dialog-actions">
        <button type="button" className="btn ghost" onClick={onClose}>
          Chiudi
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={handleDownloadPdf}
          disabled={exporting}
        >
          {exporting ? 'Esportazione...' : 'Scarica PDF'}
        </button>
      </div>
    </dialog>
  )
}
